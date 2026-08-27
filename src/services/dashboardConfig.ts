import { configuredDevices } from '../data/devices'
import type { RoomId } from './smartHome'

export const DASHBOARD_CONFIG_SCHEMA_VERSION = 2
const STORAGE_KEY = 'aboutus.studio.dashboard.configuration.v2'
const LEGACY_STORAGE_KEY = 'aboutus.studio.dashboard.configuration.v1'

export interface DeviceSlotConfiguration {
  displayName: string
  roomId: RoomId
  enabled: boolean
}

export interface CustomGroupConfiguration {
  id: string
  name: string
  roomId: RoomId
  deviceIds: string[]
}

export interface DashboardConfiguration {
  version: typeof DASHBOARD_CONFIG_SCHEMA_VERSION
  devices: Record<string, DeviceSlotConfiguration>
  groupLabels: {
    gang: string
    studio1: string
    studio2: string
    everything: string
  }
  weatherEntityId: string
  mediaPlayerEntityId: string
  customGroups: CustomGroupConfiguration[]
}

export function getDefaultDashboardConfiguration(): DashboardConfiguration {
  return {
    version: DASHBOARD_CONFIG_SCHEMA_VERSION,
    devices: Object.fromEntries(
      configuredDevices.map((device) => [
        device.id,
        {
          displayName: device.name,
          roomId: device.roomId,
          enabled: true,
        },
      ]),
    ),
    groupLabels: {
      gang: 'Gang',
      studio1: 'Büro 1',
      studio2: 'Büro 2',
      everything: 'Alles',
    },
    weatherEntityId: '',
    mediaPlayerEntityId: '',
    customGroups: [],
  }
}

export function loadDashboardConfiguration(): DashboardConfiguration {
  const defaults = getDefaultDashboardConfiguration()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return defaults
    const stored = JSON.parse(raw) as Partial<DashboardConfiguration>
    if (((stored.version as number) !== 1 && stored.version !== DASHBOARD_CONFIG_SCHEMA_VERSION) || !isRecord(stored.devices)) {
      return defaults
    }

    const devices = Object.fromEntries(
      configuredDevices.map((definition) => {
        const fallback = defaults.devices[definition.id]
        const candidate = isRecord(stored.devices?.[definition.id])
          ? stored.devices[definition.id]
          : null
        return [definition.id, {
          displayName: cleanLabel(candidate?.displayName, fallback.displayName),
          roomId: isRoomId(candidate?.roomId) ? candidate.roomId : fallback.roomId,
          enabled: typeof candidate?.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
        }]
      }),
    )

    const labels: Record<string, unknown> = isRecord(stored.groupLabels)
      ? stored.groupLabels
      : {}
    return {
      version: DASHBOARD_CONFIG_SCHEMA_VERSION,
      devices,
      groupLabels: {
        gang: cleanLabel(labels.gang, defaults.groupLabels.gang),
        studio1: cleanLabel(labels.studio1, defaults.groupLabels.studio1),
        studio2: cleanLabel(labels.studio2, defaults.groupLabels.studio2),
        everything: cleanLabel(labels.everything, defaults.groupLabels.everything),
      },
      weatherEntityId: cleanWeatherEntityId(stored.weatherEntityId),
      mediaPlayerEntityId: cleanMediaPlayerEntityId(stored.mediaPlayerEntityId),
      customGroups: sanitizeCustomGroups(stored.customGroups, devices),
    }
  } catch {
    return defaults
  }
}

export function saveDashboardConfiguration(config: DashboardConfiguration): DashboardConfiguration {
  const safe = sanitizeConfiguration(config)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  return safe
}

export function clearDashboardConfiguration(): DashboardConfiguration {
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  return getDefaultDashboardConfiguration()
}

function sanitizeConfiguration(config: DashboardConfiguration): DashboardConfiguration {
  const defaults = getDefaultDashboardConfiguration()
  const devices = Object.fromEntries(
    configuredDevices.map((definition) => {
      const candidate = config.devices[definition.id]
      const fallback = defaults.devices[definition.id]
      return [definition.id, {
        displayName: cleanLabel(candidate?.displayName, fallback.displayName),
        roomId: isRoomId(candidate?.roomId) ? candidate.roomId : fallback.roomId,
        enabled: typeof candidate?.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
      }]
    }),
  )
  return {
    version: DASHBOARD_CONFIG_SCHEMA_VERSION,
    devices,
    groupLabels: {
      gang: cleanLabel(config.groupLabels?.gang, defaults.groupLabels.gang),
      studio1: cleanLabel(config.groupLabels?.studio1, defaults.groupLabels.studio1),
      studio2: cleanLabel(config.groupLabels?.studio2, defaults.groupLabels.studio2),
      everything: cleanLabel(config.groupLabels?.everything, defaults.groupLabels.everything),
    },
    weatherEntityId: cleanWeatherEntityId(config.weatherEntityId),
    mediaPlayerEntityId: cleanMediaPlayerEntityId(config.mediaPlayerEntityId),
    customGroups: sanitizeCustomGroups(config.customGroups, devices),
  }
}

function sanitizeCustomGroups(
  value: unknown,
  devices: Record<string, DeviceSlotConfiguration>,
): CustomGroupConfiguration[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate) || !isRoomId(candidate.roomId)) return []
    const fallbackId = `custom-${index + 1}`
    const rawId = typeof candidate.id === 'string' ? candidate.id.trim() : fallbackId
    const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || fallbackId
    if (seen.has(id)) return []
    const deviceIds = Array.isArray(candidate.deviceIds)
      ? [...new Set(candidate.deviceIds.filter((deviceId): deviceId is string =>
        typeof deviceId === 'string' &&
        Boolean(devices[deviceId]?.enabled) &&
        devices[deviceId]?.roomId === candidate.roomId,
      ))]
      : []
    if (deviceIds.length === 0) return []
    seen.add(id)
    return [{
      id,
      name: cleanLabel(candidate.name, 'Custom group'),
      roomId: candidate.roomId,
      deviceIds,
    }]
  })
}

function cleanWeatherEntityId(value: unknown): string {
  return typeof value === 'string' && /^weather\.[a-z0-9_]+$/.test(value) ? value : ''
}

function cleanMediaPlayerEntityId(value: unknown): string {
  return typeof value === 'string' && /^media_player\.[a-z0-9_]+$/.test(value) ? value : ''
}

function cleanLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : fallback
}

function isRoomId(value: unknown): value is RoomId {
  return value === 'gang' || value === 'studio1' || value === 'studio2'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}
