import type { DeviceDefinition, EntityMappings } from '../services/smartHome'

// Sourced from the live Home Assistant instance's area/device/entity registries
// (Gang / Büro 1 / Büro 2 areas), filtered to real controllable light + switch
// entities — diagnostic toggles (child lock, auto-update) are excluded.
export const configuredDevices: DeviceDefinition[] = [
  // Büro 1
  {
    id: 'buro1-absorber-led-1',
    name: 'Absorber LED 1',
    roomId: 'studio1',
    preferredDomain: 'light',
  },
  {
    id: 'buro1-fernseher-led-1',
    name: 'Fernseher LED',
    roomId: 'studio1',
    preferredDomain: 'light',
  },
  {
    id: 'buro1-regal-links-led-1',
    name: 'Regal Links LED',
    roomId: 'studio1',
    preferredDomain: 'light',
  },
  {
    id: 'buro1-regal-rechts-led-1',
    name: 'Regal Rechts LED',
    roomId: 'studio1',
    preferredDomain: 'light',
  },
  {
    id: 'buro1-stehlampe-couch',
    name: 'Stehlampe Couch',
    roomId: 'studio1',
    preferredDomain: 'switch',
    hint: 'Light',
  },
  {
    id: 'buro1-tischlampe-couch',
    name: 'Tischlampe Couch',
    roomId: 'studio1',
    preferredDomain: 'switch',
    hint: 'Light',
  },
  // Büro 2
  {
    id: 'buro2-absorber-led-1',
    name: 'Absorber LED 1',
    roomId: 'studio2',
    preferredDomain: 'light',
  },
  {
    id: 'buro2-absorber-led-2',
    name: 'Absorber LED 2',
    roomId: 'studio2',
    preferredDomain: 'light',
  },
  {
    id: 'buro2-haengelampen-schreibtisch',
    name: 'Hängelampen Schreibtisch',
    roomId: 'studio2',
    preferredDomain: 'switch',
    hint: 'Light',
  },
  {
    id: 'buro2-regal-links',
    name: 'Regal Links',
    roomId: 'studio2',
    preferredDomain: 'switch',
    hint: 'Light',
  },
  {
    id: 'buro2-regal-rechts',
    name: 'Regal Rechts',
    roomId: 'studio2',
    preferredDomain: 'switch',
    hint: 'Light',
  },
  {
    id: 'buro2-schreibtischlampe',
    name: 'Schreibtischlampe',
    roomId: 'studio2',
    preferredDomain: 'switch',
    hint: 'Light',
  },
  {
    id: 'buro2-stehlampe',
    name: 'Stehlampe Tisch',
    roomId: 'studio2',
    preferredDomain: 'switch',
    hint: 'Light',
  },
  // Gang has no devices assigned in Home Assistant yet — the room still exists
  // (see RoomId / ROOM_IDS in services/smartHome.ts) so it's ready the moment
  // devices are added to that area and slots are added here.
]

// Out-of-the-box mapping from the slots above to their real Home Assistant
// entity IDs, so the dashboard controls live devices immediately on first
// connection without requiring manual remapping in Settings > Devices.
// Used only as a fallback when no mapping has been explicitly saved yet
// (see loadEntityMappings in services/entityMappingConfig.ts) — any manual
// remap/unmap made in Settings always takes precedence over this default.
export const defaultEntityMappings: EntityMappings = {
  'buro1-absorber-led-1': 'light.buro_1_absorber_led_1',
  'buro1-fernseher-led-1': 'light.buro_1_fernseher_led_1',
  'buro1-regal-links-led-1': 'light.buro_1_regal_links_led_1',
  'buro1-regal-rechts-led-1': 'light.buro_1_regal_rechts_led_1',
  'buro1-stehlampe-couch': 'switch.stehlampe_couch_socket_1',
  'buro1-tischlampe-couch': 'switch.tischlampe_couch_socket_1',
  'buro2-absorber-led-1': 'light.buro_2_absorber_led_1',
  'buro2-absorber-led-2': 'light.buro_2_absorber_led_2',
  'buro2-haengelampen-schreibtisch': 'switch.hangelampen_socket_1',
  'buro2-regal-links': 'switch.regal_links_socket_1',
  'buro2-regal-rechts': 'switch.regal_rechts_socket_1',
  'buro2-schreibtischlampe': 'switch.schreibtischlampe_socket_1',
  'buro2-stehlampe': 'switch.stehlampe_socket_1',
}
