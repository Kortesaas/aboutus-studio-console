import { configuredDevices } from '../data/devices'
import type {
  AvailableEntity,
  ConnectionStatus,
  Device,
  EntityMappings,
  SmartHomeService,
} from './smartHome'

type DeviceSubscriber = (devices: Device[]) => void
type ConnectionSubscriber = (status: ConnectionStatus) => void

const mockStates = ['on', 'off', 'on', 'on', 'on', 'off'] as const

export class MockSmartHomeService implements SmartHomeService {
  private devices = configuredDevices.map((device, index) => ({
    ...device,
    entityId: `${device.preferredDomain}.mock_${device.id.replaceAll('-', '_')}`,
    kind: device.preferredDomain,
    state: mockStates[index] ?? 'off',
    isPending: false,
    isStale: false,
  })) satisfies Device[]

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
      entityId: device.entityId,
      friendlyName: device.name,
      domain: device.kind,
    }))
  }

  async applyEntityMappings(_mappings: EntityMappings): Promise<void> {}

  async turnOn(entityId: string): Promise<void> {
    this.setPower(entityId, 'on')
  }

  async turnOff(entityId: string): Promise<void> {
    this.setPower(entityId, 'off')
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

  private setPower(entityId: string, state: 'on' | 'off') {
    const device = this.devices.find((candidate) => candidate.entityId === entityId)
    if (!device || device.state === state) return
    device.state = state
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
