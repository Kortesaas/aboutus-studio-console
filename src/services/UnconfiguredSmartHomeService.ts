import { configuredDevices } from '../data/devices'
import type {
  AvailableEntity,
  ConnectionStatus,
  Device,
  EntityMappings,
  SmartHomeService,
} from './smartHome'

export class UnconfiguredSmartHomeService implements SmartHomeService {
  private readonly devices: Device[] = configuredDevices.map((device) => ({
    ...device,
    entityId: null,
    kind: device.preferredDomain,
    state: 'unconfigured',
    isPending: false,
    isStale: true,
  }))

  async connect(): Promise<void> {}
  disconnect(): void {}

  async getDevices(): Promise<Device[]> {
    return this.devices.map((device) => ({ ...device }))
  }

  async getAvailableEntities(): Promise<AvailableEntity[]> {
    return []
  }

  async applyEntityMappings(_mappings: EntityMappings): Promise<void> {}

  async turnOn(): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  async turnOff(): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  subscribe(): () => void {
    return () => {}
  }

  getConnectionStatus(): ConnectionStatus {
    return 'unconfigured'
  }

  subscribeConnection(): () => void {
    return () => {}
  }
}
