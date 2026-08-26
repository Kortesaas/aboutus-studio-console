export type DeviceKind = 'light' | 'switch'

export interface Device {
  entityId: string
  name: string
  kind: DeviceKind
  isOn: boolean
}

export interface SmartHomeService {
  getDevices(): Promise<Device[]>
  turnOn(entityId: string): Promise<void>
  turnOff(entityId: string): Promise<void>
  subscribe(callback: (devices: Device[]) => void): () => void
}
