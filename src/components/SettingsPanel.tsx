import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import { MediaIcon } from './MediaIcon'
import { SettingsIcon, type SettingsIconName } from './SettingsIcon'
import { useSmartHome } from '../context/SmartHomeProvider'
import { configuredDevices } from '../data/devices'
import {
  DASHBOARD_CONFIG_SCHEMA_VERSION,
  type CustomGroupConfiguration,
  type DashboardConfiguration,
} from '../services/dashboardConfig'
import { ENTITY_MAPPING_SCHEMA_VERSION } from '../services/entityMappingConfig'
import { HOME_ASSISTANT_CONFIG_SCHEMA_VERSION } from '../services/homeAssistantConfig'
import { ROOM_IDS, type ConnectionStatus, type EntityMappings, type RoomId } from '../services/smartHome'

const roomOptionLabels: Record<RoomId, string> = {
  gang: 'Gang',
  studio1: 'Studio 1',
  studio2: 'Studio 2',
}

const groupLabelFieldLabels: Record<RoomId | 'everything', string> = {
  gang: 'Gang label',
  studio1: 'Studio 1 label',
  studio2: 'Studio 2 label',
  everything: 'Everything (Alles) label',
}

const statusLabels: Record<ConnectionStatus, string> = {
  unconfigured: 'SETUP REQUIRED',
  connecting: 'CONNECTING',
  connected: 'CONNECTED',
  disconnected: 'DISCONNECTED',
  'auth-error': 'AUTH ERROR',
}

type SettingsTab = 'connection' | 'devices' | 'groups' | 'weather' | 'media' | 'data'

const TABS: { id: SettingsTab; label: string; icon: SettingsIconName | 'media' }[] = [
  { id: 'connection', label: 'Connection', icon: 'connection' },
  { id: 'devices', label: 'Devices', icon: 'devices' },
  { id: 'groups', label: 'Groups', icon: 'groups' },
  { id: 'weather', label: 'Weather', icon: 'weather' },
  { id: 'media', label: 'Media', icon: 'media' },
  { id: 'data', label: 'Data & diagnostics', icon: 'data' },
]

export function SettingsPanel() {
  const {
    settingsOpen,
    closeSettings,
    configuredUrl,
    hasStoredToken,
    status,
    availableEntities,
    entityMappings,
    dashboardConfig,
    lastConnectedAt,
    configure,
    saveMappings,
    saveDashboardConfig,
    clearCredentials,
    clearMappings,
    resetDashboardConfig,
    clearAllLocalConfiguration,
  } = useSmartHome()
  const [endpointMode, setEndpointMode] = useState<'proxy' | 'direct'>('proxy')
  const [endpoint, setEndpoint] = useState('/ha-websocket')
  const [token, setToken] = useState('')
  const [connectionResult, setConnectionResult] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [draftConfig, setDraftConfig] = useState<DashboardConfiguration>(dashboardConfig)
  const [draftMappings, setDraftMappings] = useState<EntityMappings>(entityMappings)
  const [deviceResult, setDeviceResult] = useState('')
  const [isSavingDevices, setIsSavingDevices] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('connection')

  useEffect(() => {
    if (!settingsOpen) return
    const isProxy = !configuredUrl || configuredUrl.startsWith('/')
    setEndpointMode(isProxy ? 'proxy' : 'direct')
    setEndpoint(configuredUrl ?? '/ha-websocket')
    setToken('')
    setConnectionResult('')
    setDraftConfig(cloneConfiguration(dashboardConfig))
    setDraftMappings({ ...entityMappings })
    setDeviceResult('')
    setActiveTab('connection')
  }, [settingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeSettings, settingsOpen])

  const availableIds = useMemo(
    () => new Set(availableEntities.map((entity) => entity.entityId)),
    [availableEntities],
  )
  const controllableEntities = availableEntities.filter((entity) => entity.domain === 'light' || entity.domain === 'switch')
  const weatherEntities = availableEntities.filter((entity) => entity.domain === 'weather')
  const mediaPlayerEntities = availableEntities.filter((entity) => entity.domain === 'media_player')
  const enabledSlots = configuredDevices.filter((device) => draftConfig.devices[device.id]?.enabled)
  const configuredCount = enabledSlots.filter((device) => Boolean(draftMappings[device.id])).length
  const unresolvedCount = enabledSlots.filter((device) => {
    const entityId = draftMappings[device.id]
    return !entityId || (availableEntities.length > 0 && !availableIds.has(entityId))
  }).length

  if (!settingsOpen) return null

  const handleConnectionTest = async (event: FormEvent) => {
    event.preventDefault()
    setConnectionResult('CONNECTING')
    setIsTesting(true)
    try {
      await configure(endpointMode === 'proxy' ? '/ha-websocket' : endpoint, token)
      setToken('')
      setConnectionResult('CONNECTED')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to connect.'
      setConnectionResult(message.toLowerCase().includes('credentials') ? 'AUTH ERROR' : `DISCONNECTED · ${message}`)
    } finally {
      setIsTesting(false)
    }
  }

  const handleDeviceSave = async (event: FormEvent) => {
    event.preventDefault()
    if (draftConfig.customGroups.some((group) => group.deviceIds.length === 0)) {
      setDeviceResult('Each custom group needs at least one fixture.')
      return
    }
    setIsSavingDevices(true)
    setDeviceResult('')
    try {
      saveDashboardConfig(draftConfig)
      await saveMappings(draftMappings)
      setDeviceResult('SAVED')
    } catch (caught) {
      setDeviceResult(caught instanceof Error ? caught.message : 'Unable to save device settings.')
    } finally {
      setIsSavingDevices(false)
    }
  }

  const showFormTab = activeTab === 'devices' || activeTab === 'groups' || activeTab === 'weather' || activeTab === 'media'

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="settings-shell">
        <header className="settings-header">
          <div>
            <p className="eyebrow">Owner configuration</p>
            <h1 id="settings-title">Settings</h1>
          </div>
          <span className={`settings-status settings-status--${status}`}>
            <span className={`ds-status-dot ds-status-dot--sm ds-status-dot--${status}`} />
            {connectionResult || statusLabels[status]}
          </span>
          <button className="settings-close" type="button" onClick={closeSettings} aria-label="Close Settings">×</button>
        </header>

        <div className="settings-body">
          <nav className="settings-nav" aria-label="Settings sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`settings-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon === 'media' ? <MediaIcon name="library" /> : <SettingsIcon name={tab.icon} />}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-panel-content">
            {activeTab === 'connection' && (
              <section className="settings-tab" aria-labelledby="settings-ha-title">
                <div className="settings-tab-heading">
                  <p className="eyebrow">Connection</p>
                  <h2 id="settings-ha-title">Home Assistant</h2>
                </div>
                <form className="settings-form" onSubmit={(event) => void handleConnectionTest(event)}>
                  <label>
                    <span>Endpoint mode</span>
                    <select
                      value={endpointMode}
                      onChange={(event) => {
                        const mode = event.target.value as 'proxy' | 'direct'
                        setEndpointMode(mode)
                        setEndpoint(mode === 'proxy' ? '/ha-websocket' : configuredUrl?.startsWith('http') ? configuredUrl : 'http://homeassistant.local:8123')
                      }}
                    >
                      <option value="proxy">Same-origin Docker proxy</option>
                      <option value="direct">Direct Home Assistant URL</option>
                    </select>
                  </label>
                  <label className="settings-field-wide">
                    <span>Home Assistant endpoint</span>
                    <input
                      type="text"
                      inputMode="url"
                      value={endpointMode === 'proxy' ? '/ha-websocket' : endpoint}
                      onChange={(event) => setEndpoint(event.target.value)}
                      readOnly={endpointMode === 'proxy'}
                      autoComplete="url"
                      required
                    />
                  </label>
                  <label className="settings-field-wide">
                    <span>Long-Lived Access Token</span>
                    <input
                      type="password"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      placeholder={hasStoredToken ? 'Stored securely in this browser · leave blank to keep' : 'Paste token'}
                      autoComplete="new-password"
                      spellCheck={false}
                      required={!hasStoredToken}
                    />
                  </label>
                  <div className="settings-form-actions settings-field-wide">
                    <p>Testing never blocks or closes the dashboard. Existing tokens are never displayed.</p>
                    <button className="settings-primary" type="submit" disabled={isTesting}>
                      {isTesting ? 'Testing…' : hasStoredToken ? 'Reconnect / test' : 'Connect / test'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {showFormTab && (
              <form className="settings-tab settings-tab-form" onSubmit={(event) => void handleDeviceSave(event)}>
                {activeTab === 'devices' && (
                  <>
                    <div className="settings-tab-heading">
                      <div>
                        <p className="eyebrow">Dashboard slots</p>
                        <h2>Devices</h2>
                      </div>
                      <span className="settings-summary">{configuredCount}/{enabledSlots.length} mapped · {unresolvedCount} unresolved</span>
                    </div>
                    <div className="device-settings-grid">
                      {configuredDevices.map((definition) => {
                        const slot = draftConfig.devices[definition.id]
                        const entityId = draftMappings[definition.id] ?? ''
                        const unlistedEntity = Boolean(entityId && !availableIds.has(entityId))
                        const missingEntity = Boolean(unlistedEntity && availableEntities.length > 0)
                        const options = [...controllableEntities].sort((a, b) => {
                          const preferredA = a.domain === definition.preferredDomain ? 0 : 1
                          const preferredB = b.domain === definition.preferredDomain ? 0 : 1
                          return preferredA - preferredB || a.friendlyName.localeCompare(b.friendlyName)
                        })
                        return (
                          <article className={`device-settings-row ${slot.enabled ? '' : 'is-disabled'}`} key={definition.id}>
                            <label className="device-enabled">
                              <input
                                type="checkbox"
                                checked={slot.enabled}
                                onChange={(event) => updateDeviceDraft(setDraftConfig, definition.id, { enabled: event.target.checked })}
                              />
                              <span>Enabled</span>
                            </label>
                            <label>
                              <span>Display name</span>
                              <input
                                type="text"
                                value={slot.displayName}
                                maxLength={40}
                                onChange={(event) => updateDeviceDraft(setDraftConfig, definition.id, { displayName: event.target.value })}
                              />
                            </label>
                            <label>
                              <span>Room</span>
                              <select
                                value={slot.roomId}
                                onChange={(event) => updateDeviceDraft(setDraftConfig, definition.id, { roomId: event.target.value as RoomId })}
                              >
                                {ROOM_IDS.map((roomId) => (
                                  <option value={roomId} key={roomId}>{roomOptionLabels[roomId]}</option>
                                ))}
                              </select>
                            </label>
                            <label className="device-entity-field">
                              <span>Home Assistant entity</span>
                              <select
                                value={entityId}
                                onChange={(event) => setDraftMappings((current) => ({ ...current, [definition.id]: event.target.value }))}
                              >
                                <option value="">Not mapped</option>
                                {unlistedEntity && (
                                  <option value={entityId}>
                                    {missingEntity ? 'Missing' : 'Saved · not currently discoverable'} · {entityId}
                                  </option>
                                )}
                                {options.map((entity) => (
                                  <option value={entity.entityId} key={entity.entityId}>
                                    {entity.friendlyName} — {entity.entityId}
                                  </option>
                                ))}
                              </select>
                              <small>{missingEntity ? `Missing: ${entityId}` : entityId || 'Choose a light or switch'}</small>
                            </label>
                          </article>
                        )
                      })}
                    </div>
                  </>
                )}

                {activeTab === 'weather' && (
                  <>
                    <div className="settings-tab-heading">
                      <p className="eyebrow">Home Assistant</p>
                      <h2>Weather entity</h2>
                    </div>
                    <p className="settings-copy">Current conditions and the daily forecast on the Weather page use this entity.</p>
                    <div className="weather-settings">
                      <label>
                        <span>Weather source</span>
                        <select
                          value={draftConfig.weatherEntityId}
                          onChange={(event) => setDraftConfig((current) => ({ ...current, weatherEntityId: event.target.value }))}
                        >
                          <option value="">Not selected</option>
                          {draftConfig.weatherEntityId && !weatherEntities.some((entity) => entity.entityId === draftConfig.weatherEntityId) && (
                            <option value={draftConfig.weatherEntityId}>Saved · not currently discoverable — {draftConfig.weatherEntityId}</option>
                          )}
                          {weatherEntities.map((entity) => (
                            <option value={entity.entityId} key={entity.entityId}>{entity.friendlyName} — {entity.entityId}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </>
                )}

                {activeTab === 'media' && (
                  <>
                    <div className="settings-tab-heading">
                      <p className="eyebrow">Home Assistant</p>
                      <h2>Media player entity</h2>
                    </div>
                    <p className="settings-copy">The Spotify page shows now-playing and controls for this entity.</p>
                    <div className="weather-settings">
                      <label>
                        <span>Media player source</span>
                        <select
                          value={draftConfig.mediaPlayerEntityId}
                          onChange={(event) => setDraftConfig((current) => ({ ...current, mediaPlayerEntityId: event.target.value }))}
                        >
                          <option value="">Not selected</option>
                          {draftConfig.mediaPlayerEntityId && !mediaPlayerEntities.some((entity) => entity.entityId === draftConfig.mediaPlayerEntityId) && (
                            <option value={draftConfig.mediaPlayerEntityId}>Saved · not currently discoverable — {draftConfig.mediaPlayerEntityId}</option>
                          )}
                          {mediaPlayerEntities.map((entity) => (
                            <option value={entity.entityId} key={entity.entityId}>{entity.friendlyName} — {entity.entityId}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </>
                )}

                {activeTab === 'groups' && (
                  <>
                    <div className="settings-tab-heading">
                      <div>
                        <p className="eyebrow">Derived membership</p>
                        <h2>Room labels</h2>
                      </div>
                    </div>
                    <p className="settings-copy">Room assignment on the Devices tab determines Studio groups. Everything contains every enabled slot.</p>
                    <div className="group-settings">
                      {([...ROOM_IDS, 'everything'] as const).map((groupId) => (
                        <label key={groupId}>
                          <span>{groupLabelFieldLabels[groupId]}</span>
                          <input
                            type="text"
                            value={draftConfig.groupLabels[groupId]}
                            maxLength={40}
                            onChange={(event) => setDraftConfig((current) => ({
                              ...current,
                              groupLabels: { ...current.groupLabels, [groupId]: event.target.value },
                            }))}
                          />
                        </label>
                      ))}
                    </div>

                    <div className="custom-group-settings">
                      <div className="custom-group-settings-head">
                        <div>
                          <p className="eyebrow">Runtime configuration</p>
                          <h2>Custom groups</h2>
                          <p>Create room groups from the enabled fixture slots. Membership never changes room masters or Everything.</p>
                        </div>
                        <button
                          className="settings-secondary"
                          type="button"
                          onClick={() => setDraftConfig((current) => ({
                            ...current,
                            customGroups: [...current.customGroups, createCustomGroup(current)],
                          }))}
                        >
                          Add group
                        </button>
                      </div>
                      <div className="custom-group-list">
                        {draftConfig.customGroups.length === 0 && <p className="custom-group-empty">No custom groups configured.</p>}
                        {draftConfig.customGroups.map((group) => {
                          const roomDevices = configuredDevices.filter((definition) => {
                            const slot = draftConfig.devices[definition.id]
                            return slot?.enabled && slot.roomId === group.roomId
                          })
                          return (
                            <article className="custom-group-row" key={group.id}>
                              <label>
                                <span>Name</span>
                                <input type="text" value={group.name} maxLength={40} onChange={(event) => updateCustomGroup(setDraftConfig, group.id, { name: event.target.value })} />
                              </label>
                              <label>
                                <span>Room</span>
                                <select
                                  value={group.roomId}
                                  onChange={(event) => updateCustomGroup(setDraftConfig, group.id, {
                                    roomId: event.target.value as RoomId,
                                    deviceIds: [],
                                  })}
                                >
                                  {ROOM_IDS.map((roomId) => (
                                    <option value={roomId} key={roomId}>{roomOptionLabels[roomId]}</option>
                                  ))}
                                </select>
                              </label>
                              <fieldset>
                                <legend>Fixtures</legend>
                                <div className="custom-group-members">
                                  {roomDevices.map((definition) => (
                                    <label key={definition.id}>
                                      <input
                                        type="checkbox"
                                        checked={group.deviceIds.includes(definition.id)}
                                        onChange={(event) => updateCustomGroup(setDraftConfig, group.id, {
                                          deviceIds: event.target.checked
                                            ? [...group.deviceIds, definition.id]
                                            : group.deviceIds.filter((id) => id !== definition.id),
                                        })}
                                      />
                                      <span>{draftConfig.devices[definition.id].displayName}</span>
                                    </label>
                                  ))}
                                </div>
                              </fieldset>
                              <button
                                className="settings-remove"
                                type="button"
                                onClick={() => setDraftConfig((current) => ({
                                  ...current,
                                  customGroups: current.customGroups.filter((candidate) => candidate.id !== group.id),
                                }))}
                              >
                                Delete
                              </button>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="settings-form-actions settings-form-actions--sticky">
                  <p>{deviceResult || 'Disabled slots stay editable here and are hidden from the Studio grids.'}</p>
                  <button className="settings-primary" type="submit" disabled={isSavingDevices}>
                    {isSavingDevices ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'data' && (
              <section className="settings-tab settings-two-column">
                <div>
                  <p className="eyebrow">Browser storage</p>
                  <h2>Local data / reset</h2>
                  <p className="settings-copy">Each action asks for confirmation and returns directly to the dashboard.</p>
                  <div className="reset-actions">
                    <ConfirmAction label="Clear HA credentials" confirmLabel="Confirm credentials clear" onConfirm={clearCredentials} />
                    <ConfirmAction label="Clear device mappings" confirmLabel="Confirm mappings clear" onConfirm={clearMappings} />
                    <ConfirmAction label="Reset dashboard defaults" confirmLabel="Confirm default reset" onConfirm={resetDashboardConfig} />
                    <ConfirmAction label="Clear all local configuration" confirmLabel="Confirm clear all" onConfirm={clearAllLocalConfiguration} danger />
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Non-secret</p>
                  <h2>About / diagnostics</h2>
                  <dl className="diagnostics-grid">
                    <Diagnostic label="Dashboard version" value="0.1.0" />
                    <Diagnostic label="HA connection" value={statusLabels[status]} />
                    <Diagnostic label="HA endpoint" value={describeEndpoint(configuredUrl)} />
                    <Diagnostic label="Supported entities" value={String(availableEntities.length)} />
                    <Diagnostic label="Configured devices" value={String(configuredCount)} />
                    <Diagnostic label="Unresolved devices" value={String(unresolvedCount)} />
                    <Diagnostic label="Last HA connection" value={lastConnectedAt ? new Date(lastConnectedAt).toLocaleString() : 'Never this session'} />
                    <Diagnostic
                      label="Storage schemas"
                      value={`dashboard ${DASHBOARD_CONFIG_SCHEMA_VERSION} · mapping ${ENTITY_MAPPING_SCHEMA_VERSION} · HA ${HOME_ASSISTANT_CONFIG_SCHEMA_VERSION}`}
                    />
                  </dl>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function updateDeviceDraft(
  setDraft: Dispatch<SetStateAction<DashboardConfiguration>>,
  deviceId: string,
  patch: Partial<DashboardConfiguration['devices'][string]>,
) {
  setDraft((current) => ({
    ...current,
    devices: {
      ...current.devices,
      [deviceId]: { ...current.devices[deviceId], ...patch },
    },
  }))
}

function cloneConfiguration(config: DashboardConfiguration): DashboardConfiguration {
  return {
    ...config,
    devices: Object.fromEntries(
      Object.entries(config.devices).map(([id, device]) => [id, { ...device }]),
    ),
    groupLabels: { ...config.groupLabels },
    customGroups: config.customGroups.map((group) => ({ ...group, deviceIds: [...group.deviceIds] })),
  }
}

function createCustomGroup(config: DashboardConfiguration): CustomGroupConfiguration {
  const roomId = 'studio1'
  const firstDevice = configuredDevices.find((definition) => {
    const slot = config.devices[definition.id]
    return slot?.enabled && slot.roomId === roomId
  })
  return {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `custom-${Date.now()}`,
    name: 'New group',
    roomId,
    deviceIds: firstDevice ? [firstDevice.id] : [],
  }
}

function updateCustomGroup(
  setDraft: Dispatch<SetStateAction<DashboardConfiguration>>,
  groupId: string,
  patch: Partial<CustomGroupConfiguration>,
) {
  setDraft((current) => ({
    ...current,
    customGroups: current.customGroups.map((group) => group.id === groupId ? { ...group, ...patch } : group),
  }))
}

function describeEndpoint(url: string | null): string {
  if (!url) return 'Not configured'
  if (url.startsWith('/')) return `Same origin · ${url}`
  try {
    return new URL(url).host
  } catch {
    return 'Invalid saved endpoint'
  }
}

function Diagnostic({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function ConfirmAction({
  label,
  confirmLabel,
  onConfirm,
  danger = false,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  danger?: boolean
}) {
  const [armed, setArmed] = useState(false)

  if (armed) {
    return (
      <div className="confirm-action">
        <button className={danger ? 'settings-danger' : 'settings-confirm'} type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => setArmed(false)}>Cancel</button>
      </div>
    )
  }

  return <button type="button" onClick={() => setArmed(true)}>{label}</button>
}
