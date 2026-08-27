import { configuredDevices } from '../data/devices'
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

  async getWeather(_entityId: string): Promise<WeatherSnapshot | null> {
    return null
  }

  async getMediaPlayer(_entityId: string): Promise<MediaPlayerSnapshot | null> {
    return null
  }

  subscribeMediaPlayer(): () => void {
    return () => {}
  }

  async mediaPlayerAction(): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  async setMediaPlayerVolume(): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  async setMediaPlayerShuffle(): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  async setMediaPlayerRepeat(_entityId: string, _repeat: MediaPlayerRepeat): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  async seekMediaPlayer(): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  async selectMediaPlayerSource(): Promise<void> {
    throw new Error('Home Assistant is not configured.')
  }

  async browseMedia(): Promise<BrowseMediaNode> {
    throw new Error('Home Assistant is not configured.')
  }

  async playMedia(): Promise<void> {
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
