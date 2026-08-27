import { configuredDevices } from '../data/devices'
import { getHomeAssistantWebSocketUrl, type HomeAssistantConfig } from './homeAssistantConfig'
import type {
  AvailableEntity,
  ConnectionStatus,
  Device,
  DeviceState,
  EntityMappings,
  SmartHomeService,
} from './smartHome'

type DeviceSubscriber = (devices: Device[]) => void
type ConnectionSubscriber = (status: ConnectionStatus) => void

interface HomeAssistantState {
  entity_id: string
  state: string
  attributes?: Record<string, unknown>
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}

const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000] as const
const AUTH_TIMEOUT_MS = 10_000

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
  private deviceSubscribers = new Set<DeviceSubscriber>()
  private connectionSubscribers = new Set<ConnectionSubscriber>()

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

    const index = this.devices.findIndex((device) => device.entityId === entityId)
    if (index < 0) return

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
    this.devices[index] = {
      ...this.devices[index],
      state: normalizeDeviceState(rawState),
      isPending: false,
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

    this.setPending(entityId, true)
    try {
      await this.sendRequest({
        type: 'call_service',
        domain,
        service,
        service_data: { entity_id: entityId },
      })
    } finally {
      this.setPending(entityId, false)
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
    this.devices = this.devices.map((device) => ({
      ...device,
      isPending: false,
      isStale: device.state === 'unconfigured' ? false : true,
    }))
    this.emitDevices()
  }

  private refreshMappedDevices(isLive = this.status === 'connected') {
    this.devices = configuredDevices.map((definition) => {
      const entityId = this.mappings[definition.id] || null
      const haState = entityId ? this.latestStates.get(entityId) : undefined
      const mappedDomain = entityId ? getSupportedDomain(entityId) : null
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

function getSupportedDomain(entityId: string): 'light' | 'switch' | null {
  const domain = entityId.split('.')[0]
  return domain === 'light' || domain === 'switch' ? domain : null
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}
