import { configuredDevices, defaultEntityMappings } from '../data/devices'
import type { EntityMappings } from './smartHome'

const STORAGE_KEY = 'aboutus.studio.ha.entity-mappings.v1'
export const ENTITY_MAPPING_SCHEMA_VERSION = 1

interface StoredEntityMappings {
  version: typeof ENTITY_MAPPING_SCHEMA_VERSION
  haUrl: string
  mappings: EntityMappings
}

const validSlotIds = new Set(configuredDevices.map((device) => device.id))

// Falls back to the known-good default mapping (see data/devices.ts) whenever
// nothing has been explicitly saved for this HA URL yet — an explicit save
// via Settings > Devices always overrides this on subsequent loads.
function fallbackMappings(): EntityMappings {
  return { ...defaultEntityMappings }
}

export function loadEntityMappings(haUrl: string): EntityMappings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallbackMappings()
    const stored = JSON.parse(raw) as Partial<StoredEntityMappings>
    if (stored.version !== ENTITY_MAPPING_SCHEMA_VERSION || stored.haUrl !== haUrl || !isRecord(stored.mappings)) {
      return fallbackMappings()
    }

    const saved = Object.fromEntries(
      Object.entries(stored.mappings).filter(
        ([slotId, entityId]) => validSlotIds.has(slotId) && typeof entityId === 'string',
      ),
    )
    // An empty saved mapping (nothing was ever explicitly picked in Settings,
    // or "Clear device mappings" was used) is indistinguishable from "never
    // configured" — fall back to defaults rather than leaving every slot dark.
    return Object.keys(saved).length > 0 ? saved : fallbackMappings()
  } catch {
    return fallbackMappings()
  }
}

export function saveEntityMappings(haUrl: string, mappings: EntityMappings): void {
  const safeMappings = Object.fromEntries(
    Object.entries(mappings).filter(
      ([slotId, entityId]) => validSlotIds.has(slotId) && typeof entityId === 'string' && entityId,
    ),
  )
  const value: StoredEntityMappings = {
    version: ENTITY_MAPPING_SCHEMA_VERSION,
    haUrl,
    mappings: safeMappings,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function clearEntityMappings(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}
