import { configuredDevices } from '../data/devices'
import type { RoomId } from './smartHome'

export const DASHBOARD_CONFIG_SCHEMA_VERSION = 1
const STORAGE_KEY = 'aboutus.studio.dashboard.configuration.v1'

export interface DeviceSlotConfiguration {
  displayName: string
  roomId: RoomId
  enabled: boolean
}

export interface DashboardConfiguration {
  version: typeof DASHBOARD_CONFIG_SCHEMA_VERSION
  devices: Record<string, DeviceSlotConfiguration>
  groupLabels: {
    studio1: string
    studio2: string
    everything: string
  }
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
      studio1: 'Studio 1',
      studio2: 'Studio 2',
      everything: 'Everything',
    },
  }
}

export function loadDashboardConfiguration(): DashboardConfiguration {
  const defaults = getDefaultDashboardConfiguration()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const stored = JSON.parse(raw) as Partial<DashboardConfiguration>
    if (stored.version !== DASHBOARD_CONFIG_SCHEMA_VERSION || !isRecord(stored.devices)) {
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
        studio1: cleanLabel(labels.studio1, defaults.groupLabels.studio1),
        studio2: cleanLabel(labels.studio2, defaults.groupLabels.studio2),
        everything: cleanLabel(labels.everything, defaults.groupLabels.everything),
      },
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
  return getDefaultDashboardConfiguration()
}

function sanitizeConfiguration(config: DashboardConfiguration): DashboardConfiguration {
  const defaults = getDefaultDashboardConfiguration()
  return {
    version: DASHBOARD_CONFIG_SCHEMA_VERSION,
    devices: Object.fromEntries(
      configuredDevices.map((definition) => {
        const candidate = config.devices[definition.id]
        const fallback = defaults.devices[definition.id]
        return [definition.id, {
          displayName: cleanLabel(candidate?.displayName, fallback.displayName),
          roomId: isRoomId(candidate?.roomId) ? candidate.roomId : fallback.roomId,
          enabled: typeof candidate?.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
        }]
      }),
    ),
    groupLabels: {
      studio1: cleanLabel(config.groupLabels?.studio1, defaults.groupLabels.studio1),
      studio2: cleanLabel(config.groupLabels?.studio2, defaults.groupLabels.studio2),
      everything: cleanLabel(config.groupLabels?.everything, defaults.groupLabels.everything),
    },
  }
}

function cleanLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : fallback
}

function isRoomId(value: unknown): value is RoomId {
  return value === 'studio1' || value === 'studio2'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}
