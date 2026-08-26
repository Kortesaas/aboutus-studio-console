import type { Device } from '../services/smartHome'

export const initialDevices: Device[] = [
  { entityId: 'light.studio_1_led_strip', name: 'LED Strip', kind: 'light', isOn: true },
  { entityId: 'switch.studio_1_socket_1', name: 'Socket 1', kind: 'switch', isOn: false },
  { entityId: 'switch.studio_1_socket_2', name: 'Socket 2', kind: 'switch', isOn: true },
  { entityId: 'light.studio_2_main_light', name: 'Main Light', kind: 'light', isOn: true },
  { entityId: 'switch.studio_2_socket_3', name: 'Socket 3', kind: 'switch', isOn: true },
  { entityId: 'switch.studio_2_relay', name: 'Relay', kind: 'switch', isOn: false },
]

export const deviceGroups = {
  studio1: {
    name: 'Studio 1',
    entityIds: [
      'light.studio_1_led_strip',
      'switch.studio_1_socket_1',
      'switch.studio_1_socket_2',
    ],
  },
  studio2: {
    name: 'Studio 2',
    entityIds: [
      'light.studio_2_main_light',
      'switch.studio_2_socket_3',
      'switch.studio_2_relay',
    ],
  },
} as const

export const allDeviceIds = Object.values(deviceGroups).flatMap((group) => [...group.entityIds])
