import type { DeviceDefinition } from '../services/smartHome'

export const configuredDevices: DeviceDefinition[] = [
  {
    id: 'studio-1-led-strip',
    name: 'LED Strip',
    roomId: 'studio1',
    preferredDomain: 'light',
  },
  {
    id: 'studio-1-socket-1',
    name: 'Socket 1',
    roomId: 'studio1',
    preferredDomain: 'switch',
  },
  {
    id: 'studio-1-socket-2',
    name: 'Socket 2',
    roomId: 'studio1',
    preferredDomain: 'switch',
  },
  {
    id: 'studio-2-main-light',
    name: 'Main Light',
    roomId: 'studio2',
    preferredDomain: 'light',
  },
  {
    id: 'studio-2-socket-3',
    name: 'Socket 3',
    roomId: 'studio2',
    preferredDomain: 'switch',
  },
  {
    id: 'studio-2-relay',
    name: 'Relay',
    roomId: 'studio2',
    preferredDomain: 'switch',
  },
]

export const deviceGroups = {
  studio1: {
    name: 'Studio 1',
    deviceIds: ['studio-1-led-strip', 'studio-1-socket-1', 'studio-1-socket-2'],
  },
  studio2: {
    name: 'Studio 2',
    deviceIds: ['studio-2-main-light', 'studio-2-socket-3', 'studio-2-relay'],
  },
} as const

export const allDeviceIds = Object.values(deviceGroups).flatMap((group) => [...group.deviceIds])
