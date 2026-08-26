import { initialDevices } from '../data/devices'
import type { Device, SmartHomeService } from './smartHome'

type Subscriber = (devices: Device[]) => void

export class MockSmartHomeService implements SmartHomeService {
  private devices = initialDevices.map((device) => ({ ...device }))
  private subscribers = new Set<Subscriber>()

  async getDevices(): Promise<Device[]> {
    return this.snapshot()
  }

  async turnOn(entityId: string): Promise<void> {
    this.setPower(entityId, true)
  }

  async turnOff(entityId: string): Promise<void> {
    this.setPower(entityId, false)
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private setPower(entityId: string, isOn: boolean) {
    const device = this.devices.find((candidate) => candidate.entityId === entityId)
    if (!device || device.isOn === isOn) return
    device.isOn = isOn
    const next = this.snapshot()
    this.subscribers.forEach((callback) => callback(next))
  }

  private snapshot(): Device[] {
    return this.devices.map((device) => ({ ...device }))
  }
}

export const smartHomeService = new MockSmartHomeService()
