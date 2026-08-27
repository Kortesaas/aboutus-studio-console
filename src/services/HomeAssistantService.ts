import { configuredDevices } from '../data/devices'
import { getHomeAssistantWebSocketUrl, type HomeAssistantConfig } from './homeAssistantConfig'
import type {
  AvailableEntity,
  BrowseMediaItem,
  BrowseMediaNode,
  ConnectionStatus,
  Device,
  DeviceState,
  EntityMappings,
  MediaPlayerAction,
  MediaPlayerRepeat,
  MediaPlayerSnapshot,
  MediaPlayerState,
  SmartHomeService,
  SupportedEntityDomain,
  WeatherForecastDay,
  WeatherSnapshot,
} from './smartHome'

type DeviceSubscriber = (devices: Device[]) => void
type ConnectionSubscriber = (status: ConnectionStatus) => void
type MediaPlayerSubscriber = (snapshot: MediaPlayerSnapshot | null) => void

interface HomeAssistantState {
  entity_id: string
  state: string
  attributes?: Record<string, unknown>
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}

interface PendingCommand {
  targetState: 'on' | 'off'
  confirm: () => void
}

const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000] as const
const AUTH_TIMEOUT_MS = 10_000
export const MIN_COMMAND_PENDING_MS = 750
const COMMAND_CONFIRM_TIMEOUT_MS = 10_000

const MEDIA_PLAYER_ACTION_SERVICE: Record<MediaPlayerAction, string> = {
  play: 'media_play',
  pause: 'media_pause',
  next: 'media_next_track',
  previous: 'media_previous_track',
}

export class HomeAssistantService implements SmartHomeService {
  private devices: Device[] = configuredDevices.map((device) => ({
    ...device,
    entityId: null,
    kind: device.preferredDomain,
    state: 'unconfigured',
    isPending: false,
    isStale: true,
  }))

  private availableEntities: AvailableEntity[] = []
  private latestStates = new Map<string, HomeAssistantState>()

  private socket: WebSocket | null = null
  private connectionPromise: Promise<void> | null = null
  private status: ConnectionStatus = 'disconnected'
  private requestId = 0
  private reconnectAttempt = 0
  private reconnectTimer: number | null = null
  private reconnectEnabled = false
  private intentionallyClosedSockets = new WeakSet<WebSocket>()
  private pendingRequests = new Map<number, PendingRequest>()
  private pendingCommands = new Map<string, PendingCommand>()
  private deviceSubscribers = new Set<DeviceSubscriber>()
  private connectionSubscribers = new Set<ConnectionSubscriber>()
  private mediaPlayerSubscribers = new Map<string, Set<MediaPlayerSubscriber>>()

  constructor(
    private readonly config: HomeAssistantConfig,
    private mappings: EntityMappings = {},
  ) {}

  connect(): Promise<void> {
    this.reconnectEnabled = true
    if (this.status === 'connected') return Promise.resolve()
    if (this.connectionPromise) return this.connectionPromise

    this.clearReconnectTimer()
    const attempt = this.openConnection()
    this.connectionPromise = attempt
    const clearAttempt = () => {
      if (this.connectionPromise === attempt) this.connectionPromise = null
    }
    void attempt.then(clearAttempt, clearAttempt)
    return attempt
  }

  disconnect(): void {
    this.reconnectEnabled = false
    this.clearReconnectTimer()
    this.rejectPendingRequests()
    const socket = this.socket
    this.socket = null
    this.connectionPromise = null
    if (socket && socket.readyState < WebSocket.CLOSING) {
      this.intentionallyClosedSockets.add(socket)
      socket.close()
    }
    if (this.status !== 'auth-error') this.setStatus('disconnected')
    this.markDevicesStale()
  }

  async getDevices(): Promise<Device[]> {
    return this.snapshot()
  }

  async getAvailableEntities(): Promise<AvailableEntity[]> {
    return this.availableEntities.map((entity) => ({ ...entity }))
  }

  async applyEntityMappings(mappings: EntityMappings): Promise<void> {
    this.mappings = { ...mappings }
    this.refreshMappedDevices()
  }

  turnOn(entityId: string): Promise<void> {
    return this.callPowerService(entityId, 'turn_on')
  }

  turnOff(entityId: string): Promise<void> {
    return this.callPowerService(entityId, 'turn_off')
  }

  async getWeather(entityId: string): Promise<WeatherSnapshot | null> {
    if (this.status !== 'connected' || !/^weather\.[a-z0-9_]+$/.test(entityId)) return null
    const state = this.latestStates.get(entityId)
    if (!state) return null

    const [daily, hourly] = await Promise.all([
      this.fetchForecast(entityId, 'daily'),
      this.fetchForecast(entityId, 'hourly'),
    ])

    return {
      current: parseWeatherCurrent(state),
      forecast: daily.forecast.slice(0, 7),
      forecastAvailable: daily.available,
      hourly: hourly.forecast.slice(0, 48),
      hourlyAvailable: hourly.available,
      updatedAt: new Date().toISOString(),
    }
  }

  private async fetchForecast(
    entityId: string,
    type: 'daily' | 'hourly',
  ): Promise<{ forecast: WeatherForecastDay[]; available: boolean }> {
    try {
      const result = await this.sendRequest({
        type: 'call_service',
        domain: 'weather',
        service: 'get_forecasts',
        target: { entity_id: entityId },
        service_data: { type },
        return_response: true,
      })
      return { forecast: parseForecast(result, entityId), available: true }
    } catch {
      return { forecast: [], available: false }
    }
  }

  async getMediaPlayer(entityId: string): Promise<MediaPlayerSnapshot | null> {
    if (this.status !== 'connected' || !/^media_player\.[a-z0-9_]+$/.test(entityId)) return null
    return parseMediaPlayer(this.latestStates.get(entityId), entityId)
  }

  subscribeMediaPlayer(entityId: string, callback: MediaPlayerSubscriber): () => void {
    let subscribers = this.mediaPlayerSubscribers.get(entityId)
    if (!subscribers) {
      subscribers = new Set()
      this.mediaPlayerSubscribers.set(entityId, subscribers)
    }
    subscribers.add(callback)
    return () => {
      subscribers?.delete(callback)
      if (subscribers?.size === 0) this.mediaPlayerSubscribers.delete(entityId)
    }
  }

  async mediaPlayerAction(entityId: string, action: MediaPlayerAction): Promise<void> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    const service = MEDIA_PLAYER_ACTION_SERVICE[action]
    await this.sendRequest({
      type: 'call_service',
      domain: 'media_player',
      service,
      target: { entity_id: entityId },
    })
  }

  async setMediaPlayerVolume(entityId: string, volume: number): Promise<void> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    await this.sendRequest({
      type: 'call_service',
      domain: 'media_player',
      service: 'volume_set',
      target: { entity_id: entityId },
      service_data: { volume_level: Math.max(0, Math.min(1, volume)) },
    })
  }

  async setMediaPlayerShuffle(entityId: string, shuffle: boolean): Promise<void> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    await this.sendRequest({
      type: 'call_service',
      domain: 'media_player',
      service: 'shuffle_set',
      target: { entity_id: entityId },
      service_data: { shuffle },
    })
  }

  async setMediaPlayerRepeat(entityId: string, repeat: MediaPlayerRepeat): Promise<void> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    await this.sendRequest({
      type: 'call_service',
      domain: 'media_player',
      service: 'repeat_set',
      target: { entity_id: entityId },
      service_data: { repeat },
    })
  }

  async seekMediaPlayer(entityId: string, positionSeconds: number): Promise<void> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    await this.sendRequest({
      type: 'call_service',
      domain: 'media_player',
      service: 'media_seek',
      target: { entity_id: entityId },
      service_data: { seek_position: Math.max(0, positionSeconds) },
    })
  }

  async selectMediaPlayerSource(entityId: string, source: string): Promise<void> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    await this.sendRequest({
      type: 'call_service',
      domain: 'media_player',
      service: 'select_source',
      target: { entity_id: entityId },
      service_data: { source },
    })
  }

  async browseMedia(entityId: string, mediaContentType?: string, mediaContentId?: string): Promise<BrowseMediaNode> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    const result = await this.sendRequest({
      type: 'media_player/browse_media',
      entity_id: entityId,
      ...(mediaContentType ? { media_content_type: mediaContentType } : {}),
      ...(mediaContentId ? { media_content_id: mediaContentId } : {}),
    })
    return parseBrowseMediaNode(result)
  }

  async playMedia(entityId: string, mediaContentType: string, mediaContentId: string): Promise<void> {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    await this.sendRequest({
      type: 'call_service',
      domain: 'media_player',
      service: 'play_media',
      target: { entity_id: entityId },
      service_data: { media_content_type: mediaContentType, media_content_id: mediaContentId },
    })
  }

  subscribe(callback: DeviceSubscriber): () => void {
    this.deviceSubscribers.add(callback)
    return () => this.deviceSubscribers.delete(callback)
  }

  getConnectionStatus(): ConnectionStatus {
    return this.status
  }

  subscribeConnection(callback: ConnectionSubscriber): () => void {
    this.connectionSubscribers.add(callback)
    return () => this.connectionSubscribers.delete(callback)
  }

  private openConnection(): Promise<void> {
    this.setStatus('connecting')

    return new Promise<void>((resolve, reject) => {
      let settled = false
      let initialized = false
      const socket = new WebSocket(getHomeAssistantWebSocketUrl(this.config.url))
      this.socket = socket

      const authTimer = window.setTimeout(() => {
        if (initialized) return
        settled = true
        socket.close()
        reject(new Error('Home Assistant did not respond in time.'))
      }, AUTH_TIMEOUT_MS)

      socket.onmessage = (event) => {
        if (this.socket !== socket) return
        const message = this.parseMessage(event.data)
        if (!message) return

        if (message.type === 'auth_required') {
          socket.send(JSON.stringify({ type: 'auth', access_token: this.config.token }))
          return
        }

        if (message.type === 'auth_invalid') {
          window.clearTimeout(authTimer)
          settled = true
          this.setStatus('auth-error')
          this.markDevicesStale()
          socket.close()
          reject(new Error('Home Assistant rejected the connection credentials.'))
          return
        }

        if (message.type === 'auth_ok') {
          initialized = true
          window.clearTimeout(authTimer)
          void this.initializeConnection()
            .then(() => {
              settled = true
              this.reconnectAttempt = 0
              this.setStatus('connected')
              resolve()
            })
            .catch(() => {
              settled = true
              socket.close()
              reject(new Error('Home Assistant initialization failed.'))
            })
          return
        }

        this.handleProtocolMessage(message)
      }

      socket.onerror = () => {
        // The close handler provides the safe, credential-free connection error.
      }

      socket.onclose = () => {
        window.clearTimeout(authTimer)
        const isCurrentSocket = this.socket === socket
        if (isCurrentSocket) {
          this.socket = null
          this.rejectPendingRequests()
        }

        if (
          isCurrentSocket &&
          this.status !== 'auth-error' &&
          this.reconnectEnabled &&
          !this.intentionallyClosedSockets.has(socket)
        ) {
          this.setStatus('disconnected')
          this.markDevicesStale()
          this.scheduleReconnect()
        }

        if (!settled) {
          settled = true
          reject(new Error('Unable to connect to Home Assistant.'))
        }
      }
    })
  }

  private async initializeConnection(): Promise<void> {
    const states = await this.sendRequest<HomeAssistantState[]>({ type: 'get_states' })
    this.latestStates = new Map(states.map((state) => [state.entity_id, state]))
    this.availableEntities = states
      .flatMap((state) => {
        const domain = getSupportedDomain(state.entity_id)
        if (!domain) return []
        const friendlyName = typeof state.attributes?.friendly_name === 'string'
          ? state.attributes.friendly_name
          : state.entity_id
        return [{ entityId: state.entity_id, friendlyName, domain }]
      })
      .sort((a, b) =>
        a.friendlyName.localeCompare(b.friendlyName) || a.entityId.localeCompare(b.entityId),
      )
    this.refreshMappedDevices(true)

    await this.sendRequest({
      type: 'subscribe_events',
      event_type: 'state_changed',
    })
  }

  private handleProtocolMessage(message: Record<string, unknown>) {
    if (message.type === 'result' && typeof message.id === 'number') {
      const pending = this.pendingRequests.get(message.id)
      if (!pending) return
      this.pendingRequests.delete(message.id)
      if (message.success === true) pending.resolve(message.result)
      else pending.reject(new Error('Home Assistant request failed.'))
      return
    }

    if (message.type !== 'event') return
    const event = asRecord(message.event)
    const data = asRecord(event?.data)
    const entityId = typeof data?.entity_id === 'string' ? data.entity_id : null
    if (!entityId) return

    const newState = asRecord(data?.new_state)
    const rawState = typeof newState?.state === 'string' ? newState.state : undefined
    if (newState) {
      this.latestStates.set(entityId, {
        entity_id: entityId,
        state: rawState ?? 'unknown',
        attributes: asRecord(newState.attributes),
      })
    } else {
      this.latestStates.delete(entityId)
    }
    this.notifyMediaPlayerSubscribers(entityId)

    const index = this.devices.findIndex((device) => device.entityId === entityId)
    if (index < 0) return
    const pendingCommand = this.pendingCommands.get(entityId)
    if (pendingCommand && rawState === pendingCommand.targetState) pendingCommand.confirm()
    this.devices[index] = {
      ...this.devices[index],
      state: normalizeDeviceState(rawState),
      isPending: Boolean(pendingCommand),
      isStale: false,
    }
    this.emitDevices()
  }

  private async callPowerService(entityId: string, service: 'turn_on' | 'turn_off') {
    if (this.status !== 'connected') throw new Error('Home Assistant is not connected.')
    const device = this.devices.find((candidate) => candidate.entityId === entityId)
    if (!device) throw new Error('Device is not configured.')
    const domain = entityId.split('.')[0]
    if (domain !== 'light' && domain !== 'switch') {
      throw new Error('Only light and switch entities are supported.')
    }

    const targetState = service === 'turn_on' ? 'on' : 'off'
    const startedAt = Date.now()
    let confirmState = () => {}
    const confirmation = new Promise<void>((resolve) => { confirmState = resolve })
    this.pendingCommands.get(entityId)?.confirm()
    const command: PendingCommand = { targetState, confirm: confirmState }
    this.pendingCommands.set(entityId, command)
    this.setPending(entityId, true)
    try {
      let timeoutId = 0
      await Promise.race([
        (async () => {
          await this.sendRequest({
            type: 'call_service',
            domain,
            service,
            target: { entity_id: entityId },
          })
          await confirmation
        })(),
        new Promise<void>((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('Home Assistant did not confirm the new device state.')),
            COMMAND_CONFIRM_TIMEOUT_MS,
          )
        }),
      ]).finally(() => window.clearTimeout(timeoutId))
    } catch (error) {
      this.markDeviceStale(entityId)
      throw error
    } finally {
      const remaining = MIN_COMMAND_PENDING_MS - (Date.now() - startedAt)
      if (remaining > 0) await delay(remaining)
      if (this.pendingCommands.get(entityId) === command) {
        this.pendingCommands.delete(entityId)
        this.setPending(entityId, false)
      }
    }
  }

  private sendRequest<T = unknown>(payload: Record<string, unknown>): Promise<T> {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Home Assistant is not connected.'))
    }

    const id = ++this.requestId
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
      socket.send(JSON.stringify({ id, ...payload }))
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null || !this.reconnectEnabled || this.status === 'auth-error') {
      return
    }
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    this.reconnectAttempt += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      void this.connect().catch(() => {})
    }, delay)
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer === null) return
    window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private rejectPendingRequests() {
    this.pendingRequests.forEach(({ reject }) => reject(new Error('Home Assistant disconnected.')))
    this.pendingRequests.clear()
  }

  private setPending(entityId: string, isPending: boolean) {
    const index = this.devices.findIndex((device) => device.entityId === entityId)
    if (index < 0 || this.devices[index].isPending === isPending) return
    this.devices[index] = { ...this.devices[index], isPending }
    this.emitDevices()
  }

  private markDevicesStale() {
    this.pendingCommands.forEach(({ confirm }) => confirm())
    this.pendingCommands.clear()
    this.devices = this.devices.map((device) => ({
      ...device,
      isPending: false,
      isStale: device.state === 'unconfigured' ? false : true,
    }))
    this.emitDevices()
    this.mediaPlayerSubscribers.forEach((subscribers, entityId) => {
      const snapshot = parseMediaPlayer(this.latestStates.get(entityId), entityId)
      subscribers.forEach((callback) => callback(snapshot))
    })
  }

  private notifyMediaPlayerSubscribers(entityId: string) {
    const subscribers = this.mediaPlayerSubscribers.get(entityId)
    if (!subscribers) return
    const snapshot = parseMediaPlayer(this.latestStates.get(entityId), entityId)
    subscribers.forEach((callback) => callback(snapshot))
  }

  private markDeviceStale(entityId: string) {
    const index = this.devices.findIndex((device) => device.entityId === entityId)
    if (index < 0) return
    this.devices[index] = { ...this.devices[index], isStale: true }
    this.emitDevices()
  }

  private refreshMappedDevices(isLive = this.status === 'connected') {
    this.devices = configuredDevices.map((definition) => {
      const entityId = this.mappings[definition.id] || null
      const haState = entityId ? this.latestStates.get(entityId) : undefined
      const mappedDomain = entityId ? getDeviceDomain(entityId) : null
      const isResolved = Boolean(entityId && haState && mappedDomain)

      return {
        ...definition,
        entityId,
        kind: mappedDomain ?? definition.preferredDomain,
        state: isResolved ? normalizeDeviceState(haState?.state) : 'unconfigured',
        isPending: false,
        isStale: !isLive && isResolved,
      }
    })
    this.emitDevices()
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status === status) return
    this.status = status
    this.connectionSubscribers.forEach((callback) => callback(status))
  }

  private emitDevices() {
    const next = this.snapshot()
    this.deviceSubscribers.forEach((callback) => callback(next))
  }

  private snapshot(): Device[] {
    return this.devices.map((device) => ({ ...device }))
  }

  private parseMessage(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'string') return null
    try {
      return asRecord(JSON.parse(value)) ?? null
    } catch {
      return null
    }
  }
}

function normalizeDeviceState(state: string | undefined): DeviceState {
  if (state === 'on' || state === 'off' || state === 'unavailable' || state === 'unknown') {
    return state
  }
  return 'unknown'
}

function getSupportedDomain(entityId: string): SupportedEntityDomain | null {
  const domain = entityId.split('.')[0]
  return domain === 'light' || domain === 'switch' || domain === 'weather' || domain === 'media_player' ? domain : null
}

function getDeviceDomain(entityId: string): 'light' | 'switch' | null {
  const domain = entityId.split('.')[0]
  return domain === 'light' || domain === 'switch' ? domain : null
}

function parseWeatherCurrent(state: HomeAssistantState): WeatherSnapshot['current'] {
  const attributes = state.attributes ?? {}
  return {
    entityId: state.entity_id,
    friendlyName: typeof attributes.friendly_name === 'string' ? attributes.friendly_name : state.entity_id,
    condition: state.state || 'unknown',
    temperature: asNumber(attributes.temperature),
    apparentTemperature: asNumber(attributes.apparent_temperature),
    humidity: asNumber(attributes.humidity),
    windSpeed: asNumber(attributes.wind_speed),
    precipitation: asNumber(attributes.precipitation),
    temperatureUnit: asString(attributes.temperature_unit, '°'),
    windSpeedUnit: asString(attributes.wind_speed_unit, ''),
    precipitationUnit: asString(attributes.precipitation_unit, 'mm'),
  }
}

const MEDIA_PLAYER_STATES: readonly MediaPlayerState[] = ['playing', 'paused', 'idle', 'off', 'unavailable', 'unknown']
const MEDIA_PLAYER_REPEAT_VALUES = ['off', 'all', 'one'] as const
// homeassistant.components.media_player.MediaPlayerEntityFeature.BROWSE_MEDIA
const MEDIA_PLAYER_FEATURE_BROWSE_MEDIA = 131_072

function parseMediaPlayer(state: HomeAssistantState | undefined, entityId: string): MediaPlayerSnapshot | null {
  if (!state) return null
  const attributes = state.attributes ?? {}
  const mediaState = (MEDIA_PLAYER_STATES as readonly string[]).includes(state.state)
    ? (state.state as MediaPlayerState)
    : 'unknown'
  const repeat = typeof attributes.repeat === 'string' && (MEDIA_PLAYER_REPEAT_VALUES as readonly string[]).includes(attributes.repeat)
    ? (attributes.repeat as MediaPlayerSnapshot['repeat'])
    : null
  const supportedFeatures = asNumber(attributes.supported_features)
  const sourceList = Array.isArray(attributes.source_list)
    ? attributes.source_list.filter((source): source is string => typeof source === 'string')
    : null
  return {
    entityId,
    friendlyName: typeof attributes.friendly_name === 'string' ? attributes.friendly_name : entityId,
    state: mediaState,
    title: typeof attributes.media_title === 'string' ? attributes.media_title : null,
    artist: typeof attributes.media_artist === 'string' ? attributes.media_artist : null,
    album: typeof attributes.media_album_name === 'string' ? attributes.media_album_name : null,
    imageUrl: typeof attributes.entity_picture === 'string' ? attributes.entity_picture : null,
    volume: asNumber(attributes.volume_level),
    position: asNumber(attributes.media_position),
    duration: asNumber(attributes.media_duration),
    positionUpdatedAt: typeof attributes.media_position_updated_at === 'string' ? attributes.media_position_updated_at : null,
    shuffle: typeof attributes.shuffle === 'boolean' ? attributes.shuffle : null,
    repeat,
    source: typeof attributes.source === 'string' ? attributes.source : null,
    sourceList: sourceList && sourceList.length > 0 ? sourceList : null,
    canBrowse: supportedFeatures === null ? true : (supportedFeatures & MEDIA_PLAYER_FEATURE_BROWSE_MEDIA) !== 0,
  }
}

function parseBrowseMediaItem(value: unknown): BrowseMediaItem | null {
  const row = asRecord(value)
  if (!row) return null
  const mediaContentId = typeof row.media_content_id === 'string' ? row.media_content_id : ''
  if (!mediaContentId) return null
  return {
    title: typeof row.title === 'string' ? row.title : 'Untitled',
    mediaClass: typeof row.media_class === 'string' ? row.media_class : 'directory',
    mediaContentType: typeof row.media_content_type === 'string' ? row.media_content_type : '',
    mediaContentId,
    canPlay: Boolean(row.can_play),
    canExpand: Boolean(row.can_expand),
    thumbnail: typeof row.thumbnail === 'string' ? row.thumbnail : null,
  }
}

function parseBrowseMediaNode(value: unknown): BrowseMediaNode {
  const row = asRecord(value)
  const base = parseBrowseMediaItem(value) ?? {
    title: 'Browse',
    mediaClass: 'directory',
    mediaContentType: '',
    mediaContentId: '',
    canPlay: false,
    canExpand: true,
    thumbnail: null,
  }
  const rawChildren = row?.children
  const children = Array.isArray(rawChildren)
    ? rawChildren.flatMap((child) => {
      const item = parseBrowseMediaItem(child)
      return item ? [item] : []
    })
    : []
  return { ...base, children }
}

function parseForecast(value: unknown, entityId: string): WeatherForecastDay[] {
  const root = asRecord(value)
  const response = asRecord(root?.response) ?? root
  const entity = asRecord(response?.[entityId])
  const rawForecast = entity?.forecast
  if (!Array.isArray(rawForecast)) return []
  return rawForecast.flatMap((item) => {
    const row = asRecord(item)
    if (!row || typeof row.datetime !== 'string') return []
    return [{
      datetime: row.datetime,
      condition: typeof row.condition === 'string' ? row.condition : 'unknown',
      temperature: asNumber(row.temperature),
      templow: asNumber(row.templow),
      precipitation: asNumber(row.precipitation),
    }]
  })
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}
