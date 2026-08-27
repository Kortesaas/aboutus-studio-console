import { configuredDevices } from '../data/devices'
import { MIN_COMMAND_PENDING_MS } from './HomeAssistantService'
import type {
  AvailableEntity,
  BrowseMediaNode,
  ConnectionStatus,
  Device,
  EntityMappings,
  MediaPlayerRepeat,
  MediaPlayerSnapshot,
  SmartHomeService,
  WeatherSnapshot,
} from './smartHome'

const MOCK_BROWSE_TREE: Record<string, BrowseMediaNode> = {
  '': {
    title: 'Spotify', mediaClass: 'app', mediaContentType: '', mediaContentId: '', canPlay: false, canExpand: true, thumbnail: null,
    children: [
      { title: 'Playlists', mediaClass: 'directory', mediaContentType: '', mediaContentId: 'playlists', canPlay: false, canExpand: true, thumbnail: null },
      { title: 'Liked Songs', mediaClass: 'playlist', mediaContentType: 'playlist', mediaContentId: 'liked', canPlay: true, canExpand: true, thumbnail: null },
      { title: 'Albums', mediaClass: 'directory', mediaContentType: '', mediaContentId: 'albums', canPlay: false, canExpand: true, thumbnail: null },
    ],
  },
  playlists: {
    title: 'Playlists', mediaClass: 'directory', mediaContentType: '', mediaContentId: 'playlists', canPlay: false, canExpand: true, thumbnail: null,
    children: [
      { title: 'Nachtschicht', mediaClass: 'playlist', mediaContentType: 'playlist', mediaContentId: 'playlist:1', canPlay: true, canExpand: true, thumbnail: null },
      { title: 'Fokus', mediaClass: 'playlist', mediaContentType: 'playlist', mediaContentId: 'playlist:2', canPlay: true, canExpand: true, thumbnail: null },
      { title: 'Studio Mix', mediaClass: 'playlist', mediaContentType: 'playlist', mediaContentId: 'playlist:3', canPlay: true, canExpand: true, thumbnail: null },
    ],
  },
  albums: {
    title: 'Albums', mediaClass: 'directory', mediaContentType: '', mediaContentId: 'albums', canPlay: false, canExpand: true, thumbnail: null,
    children: [
      { title: 'Innenraum', mediaClass: 'album', mediaContentType: 'album', mediaContentId: 'album:1', canPlay: true, canExpand: true, thumbnail: null },
      { title: 'Späte Stunden', mediaClass: 'album', mediaContentType: 'album', mediaContentId: 'album:2', canPlay: true, canExpand: true, thumbnail: null },
    ],
  },
  'playlist:1': {
    title: 'Nachtschicht', mediaClass: 'playlist', mediaContentType: 'playlist', mediaContentId: 'playlist:1', canPlay: true, canExpand: true, thumbnail: null,
    children: [
      { title: 'Nachtschwärmer', mediaClass: 'track', mediaContentType: 'track', mediaContentId: 'track:1', canPlay: true, canExpand: false, thumbnail: null },
      { title: 'Blaue Stunde', mediaClass: 'track', mediaContentType: 'track', mediaContentId: 'track:2', canPlay: true, canExpand: false, thumbnail: null },
    ],
  },
}

type DeviceSubscriber = (devices: Device[]) => void
type ConnectionSubscriber = (status: ConnectionStatus) => void

const mockStates = ['on', 'off', 'on', 'on', 'on', 'off'] as const

export class MockSmartHomeService implements SmartHomeService {
  private devices: Device[] = configuredDevices.map((device, index) => ({
    ...device,
    entityId: `${device.preferredDomain}.mock_${device.id.replaceAll('-', '_')}`,
    kind: device.preferredDomain,
    state: mockStates[index] ?? 'off',
    isPending: false,
    isStale: false,
  }))

  private subscribers = new Set<DeviceSubscriber>()
  private connectionSubscribers = new Set<ConnectionSubscriber>()

  async connect(): Promise<void> {
    this.emitConnection()
  }

  disconnect(): void {}

  async getDevices(): Promise<Device[]> {
    return this.snapshot()
  }

  async getAvailableEntities(): Promise<AvailableEntity[]> {
    return this.devices.map((device) => ({
      entityId: device.entityId!,
      friendlyName: device.name,
      domain: device.kind,
    }))
  }

  async applyEntityMappings(_mappings: EntityMappings): Promise<void> {}

  async turnOn(entityId: string): Promise<void> {
    await this.setPower(entityId, 'on')
  }

  async turnOff(entityId: string): Promise<void> {
    await this.setPower(entityId, 'off')
  }

  async getWeather(_entityId: string): Promise<WeatherSnapshot | null> {
    return null
  }

  private mediaPlayer: MediaPlayerSnapshot = {
    entityId: 'media_player.mock_spotify',
    friendlyName: 'Spotify',
    state: 'playing',
    title: 'Nachtschwärmer',
    artist: 'Elias Krantz',
    album: 'Innenraum',
    imageUrl: null,
    volume: 0.62,
    position: 87,
    duration: 231,
    positionUpdatedAt: new Date().toISOString(),
    shuffle: true,
    repeat: 'off',
    source: 'Küche',
    sourceList: ['Küche', 'Wohnzimmer', 'Büro 1', 'Studio Lautsprecher'],
    canBrowse: true,
  }
  private mediaPlayerSubscribers = new Set<(snapshot: MediaPlayerSnapshot | null) => void>()

  async getMediaPlayer(_entityId: string): Promise<MediaPlayerSnapshot | null> {
    return { ...this.mediaPlayer }
  }

  subscribeMediaPlayer(_entityId: string, callback: (snapshot: MediaPlayerSnapshot | null) => void): () => void {
    this.mediaPlayerSubscribers.add(callback)
    return () => this.mediaPlayerSubscribers.delete(callback)
  }

  async mediaPlayerAction(_entityId: string, action: 'play' | 'pause' | 'next' | 'previous'): Promise<void> {
    if (action === 'play') this.mediaPlayer = { ...this.mediaPlayer, state: 'playing', positionUpdatedAt: new Date().toISOString() }
    if (action === 'pause') this.mediaPlayer = { ...this.mediaPlayer, state: 'paused' }
    this.emitMediaPlayer()
  }

  async setMediaPlayerVolume(_entityId: string, volume: number): Promise<void> {
    this.mediaPlayer = { ...this.mediaPlayer, volume }
    this.emitMediaPlayer()
  }

  async setMediaPlayerShuffle(_entityId: string, shuffle: boolean): Promise<void> {
    this.mediaPlayer = { ...this.mediaPlayer, shuffle }
    this.emitMediaPlayer()
  }

  async setMediaPlayerRepeat(_entityId: string, repeat: MediaPlayerRepeat): Promise<void> {
    this.mediaPlayer = { ...this.mediaPlayer, repeat }
    this.emitMediaPlayer()
  }

  async seekMediaPlayer(_entityId: string, positionSeconds: number): Promise<void> {
    this.mediaPlayer = { ...this.mediaPlayer, position: positionSeconds, positionUpdatedAt: new Date().toISOString() }
    this.emitMediaPlayer()
  }

  async selectMediaPlayerSource(_entityId: string, source: string): Promise<void> {
    this.mediaPlayer = { ...this.mediaPlayer, source }
    this.emitMediaPlayer()
  }

  async browseMedia(_entityId: string, _mediaContentType?: string, mediaContentId?: string): Promise<BrowseMediaNode> {
    await new Promise((resolve) => window.setTimeout(resolve, 300))
    const node = MOCK_BROWSE_TREE[mediaContentId ?? '']
    if (!node) throw new Error('Not found.')
    return { ...node, children: [...node.children] }
  }

  async playMedia(): Promise<void> {
    this.mediaPlayer = { ...this.mediaPlayer, state: 'playing' }
    this.emitMediaPlayer()
  }

  private emitMediaPlayer() {
    const next = { ...this.mediaPlayer }
    this.mediaPlayerSubscribers.forEach((callback) => callback(next))
  }

  subscribe(callback: DeviceSubscriber): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  getConnectionStatus(): ConnectionStatus {
    return 'connected'
  }

  subscribeConnection(callback: ConnectionSubscriber): () => void {
    this.connectionSubscribers.add(callback)
    return () => this.connectionSubscribers.delete(callback)
  }

  private async setPower(entityId: string, state: 'on' | 'off') {
    const device = this.devices.find((candidate) => candidate.entityId === entityId)
    if (!device || device.state === state) return
    device.isPending = true
    this.emitDevices()
    device.state = state
    this.emitDevices()
    await new Promise((resolve) => window.setTimeout(resolve, MIN_COMMAND_PENDING_MS))
    device.isPending = false
    this.emitDevices()
  }

  private emitDevices() {
    const next = this.snapshot()
    this.subscribers.forEach((callback) => callback(next))
  }

  private emitConnection() {
    this.connectionSubscribers.forEach((callback) => callback('connected'))
  }

  private snapshot(): Device[] {
    return this.devices.map((device) => ({ ...device }))
  }
}
