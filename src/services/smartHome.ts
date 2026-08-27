export type DeviceKind = 'light' | 'switch'
export type RoomId = 'studio1' | 'studio2'
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
  domain: DeviceKind
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
  subscribe(callback: (devices: Device[]) => void): () => void
  getConnectionStatus(): ConnectionStatus
  subscribeConnection(callback: (status: ConnectionStatus) => void): () => void
}
