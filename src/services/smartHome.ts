export type DeviceKind = 'light' | 'switch'
export type SupportedEntityDomain = DeviceKind | 'weather' | 'media_player'
export type RoomId = 'gang' | 'studio1' | 'studio2'
export const ROOM_IDS: readonly RoomId[] = ['gang', 'studio1', 'studio2']
export type DeviceState = 'on' | 'off' | 'unavailable' | 'unknown' | 'unconfigured'
export type ConnectionStatus =
  | 'unconfigured'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'auth-error'

export interface DeviceDefinition {
  id: string
  name: string
  roomId: RoomId
  preferredDomain: DeviceKind
  /** Overrides the tile's kind label (e.g. a lamp wired through a switch-domain
   * smart socket should still read "Light"). Falls back to the technical
   * light/switch domain when unset — never affects HA service-call routing. */
  hint?: string
}

export interface Device extends DeviceDefinition {
  entityId: string | null
  kind: DeviceKind
  state: DeviceState
  isPending: boolean
  isStale: boolean
}

export interface AvailableEntity {
  entityId: string
  friendlyName: string
  domain: SupportedEntityDomain
}

export interface WeatherCurrent {
  entityId: string
  friendlyName: string
  condition: string
  temperature: number | null
  apparentTemperature: number | null
  humidity: number | null
  windSpeed: number | null
  precipitation: number | null
  temperatureUnit: string
  windSpeedUnit: string
  precipitationUnit: string
}

export interface WeatherForecastDay {
  datetime: string
  condition: string
  temperature: number | null
  templow: number | null
  precipitation: number | null
}

export interface WeatherSnapshot {
  current: WeatherCurrent
  forecast: WeatherForecastDay[]
  forecastAvailable: boolean
  hourly: WeatherForecastDay[]
  hourlyAvailable: boolean
  updatedAt: string
}

export type MediaPlayerState = 'playing' | 'paused' | 'idle' | 'off' | 'unavailable' | 'unknown'
export type MediaPlayerAction = 'play' | 'pause' | 'next' | 'previous'
export type MediaPlayerRepeat = 'off' | 'all' | 'one'

export interface MediaPlayerSnapshot {
  entityId: string
  friendlyName: string
  state: MediaPlayerState
  title: string | null
  artist: string | null
  album: string | null
  imageUrl: string | null
  volume: number | null
  position: number | null
  duration: number | null
  positionUpdatedAt: string | null
  shuffle: boolean | null
  repeat: MediaPlayerRepeat | null
  source: string | null
  sourceList: string[] | null
  canBrowse: boolean
}

export interface BrowseMediaItem {
  title: string
  mediaClass: string
  mediaContentType: string
  mediaContentId: string
  canPlay: boolean
  canExpand: boolean
  thumbnail: string | null
}

export interface BrowseMediaNode extends BrowseMediaItem {
  children: BrowseMediaItem[]
}

export type EntityMappings = Record<string, string>

export interface SmartHomeService {
  connect(): Promise<void>
  disconnect(): void
  getDevices(): Promise<Device[]>
  getAvailableEntities(): Promise<AvailableEntity[]>
  applyEntityMappings(mappings: EntityMappings): Promise<void>
  turnOn(entityId: string): Promise<void>
  turnOff(entityId: string): Promise<void>
  getWeather(entityId: string): Promise<WeatherSnapshot | null>
  getMediaPlayer(entityId: string): Promise<MediaPlayerSnapshot | null>
  subscribeMediaPlayer(entityId: string, callback: (snapshot: MediaPlayerSnapshot | null) => void): () => void
  mediaPlayerAction(entityId: string, action: MediaPlayerAction): Promise<void>
  setMediaPlayerVolume(entityId: string, volume: number): Promise<void>
  setMediaPlayerShuffle(entityId: string, shuffle: boolean): Promise<void>
  setMediaPlayerRepeat(entityId: string, repeat: MediaPlayerRepeat): Promise<void>
  seekMediaPlayer(entityId: string, positionSeconds: number): Promise<void>
  selectMediaPlayerSource(entityId: string, source: string): Promise<void>
  browseMedia(entityId: string, mediaContentType?: string, mediaContentId?: string): Promise<BrowseMediaNode>
  playMedia(entityId: string, mediaContentType: string, mediaContentId: string): Promise<void>
  subscribe(callback: (devices: Device[]) => void): () => void
  getConnectionStatus(): ConnectionStatus
  subscribeConnection(callback: (status: ConnectionStatus) => void): () => void
}
