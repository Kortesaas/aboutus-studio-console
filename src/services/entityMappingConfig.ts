import { configuredDevices } from '../data/devices'
import type { EntityMappings } from './smartHome'

const STORAGE_KEY = 'aboutus.studio.ha.entity-mappings.v1'
export const ENTITY_MAPPING_SCHEMA_VERSION = 1

interface StoredEntityMappings {
  version: typeof ENTITY_MAPPING_SCHEMA_VERSION
  haUrl: string
  mappings: EntityMappings
}

const validSlotIds = new Set(configuredDevices.map((device) => device.id))

export function loadEntityMappings(haUrl: string): EntityMappings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const stored = JSON.parse(raw) as Partial<StoredEntityMappings>
    if (stored.version !== ENTITY_MAPPING_SCHEMA_VERSION || stored.haUrl !== haUrl || !isRecord(stored.mappings)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(stored.mappings).filter(
        ([slotId, entityId]) => validSlotIds.has(slotId) && typeof entityId === 'string',
      ),
    )
  } catch {
    return {}
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
