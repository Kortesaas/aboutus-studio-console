import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { SMART_HOME_MODE, type SmartHomeMode } from '../config/smartHomeRuntime'
import { HomeAssistantService } from '../services/HomeAssistantService'
import { MockSmartHomeService } from '../services/MockSmartHomeService'
import { UnconfiguredSmartHomeService } from '../services/UnconfiguredSmartHomeService'
import {
  clearDashboardConfiguration,
  loadDashboardConfiguration,
  saveDashboardConfiguration,
  type DashboardConfiguration,
} from '../services/dashboardConfig'
import {
  clearEntityMappings,
  loadEntityMappings,
  saveEntityMappings,
} from '../services/entityMappingConfig'
import {
  clearHomeAssistantConfig,
  loadHomeAssistantConfig,
  saveHomeAssistantConfig,
  validateHomeAssistantConfig,
  type HomeAssistantConfig,
} from '../services/homeAssistantConfig'
import type {
  AvailableEntity,
  BrowseMediaNode,
  ConnectionStatus,
  EntityMappings,
  MediaPlayerAction,
  MediaPlayerRepeat,
  MediaPlayerSnapshot,
  SmartHomeService,
  WeatherSnapshot,
} from '../services/smartHome'

interface SmartHomeContextValue {
  service: SmartHomeService
  status: ConnectionStatus
  mode: SmartHomeMode
  configuredUrl: string | null
  hasStoredToken: boolean
  settingsOpen: boolean
  availableEntities: AvailableEntity[]
  entityMappings: EntityMappings
  dashboardConfig: DashboardConfiguration
  lastConnectedAt: string | null
  weather: WeatherSnapshot | null
  weatherLoading: boolean
  mediaPlayer: MediaPlayerSnapshot | null
  mediaPlayerAction: (action: MediaPlayerAction) => void
  setMediaPlayerVolume: (volume: number) => void
  setMediaPlayerShuffle: (shuffle: boolean) => void
  setMediaPlayerRepeat: (repeat: MediaPlayerRepeat) => void
  seekMediaPlayer: (positionSeconds: number) => void
  selectMediaPlayerSource: (source: string) => void
  browseMedia: (mediaContentType?: string, mediaContentId?: string) => Promise<BrowseMediaNode>
  playMedia: (mediaContentType: string, mediaContentId: string) => Promise<void>
  openSettings: () => void
  closeSettings: () => void
  configure: (url: string, replacementToken: string) => Promise<void>
  saveMappings: (mappings: EntityMappings) => Promise<void>
  saveDashboardConfig: (config: DashboardConfiguration) => void
  clearCredentials: () => void
  clearMappings: () => void
  resetDashboardConfig: () => void
  clearAllLocalConfiguration: () => void
}

const SmartHomeContext = createContext<SmartHomeContextValue | null>(null)

export function SmartHomeProvider({ children }: { children: ReactNode }) {
  const [homeAssistantConfig, setHomeAssistantConfig] = useState<HomeAssistantConfig | null>(() =>
    SMART_HOME_MODE === 'home-assistant' ? loadHomeAssistantConfig() : null,
  )
  const [initialMappings] = useState<EntityMappings>(() =>
    homeAssistantConfig ? loadEntityMappings(homeAssistantConfig.url) : {},
  )

  const [service, setService] = useState<SmartHomeService>(() => {
    if (SMART_HOME_MODE === 'mock') return new MockSmartHomeService()
    if (homeAssistantConfig) return new HomeAssistantService(homeAssistantConfig, initialMappings)
    return new UnconfiguredSmartHomeService()
  })
  const [status, setStatus] = useState<ConnectionStatus>(() => service.getConnectionStatus())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [availableEntities, setAvailableEntities] = useState<AvailableEntity[]>([])
  const [entityMappings, setEntityMappings] = useState<EntityMappings>(initialMappings)
  const [dashboardConfig, setDashboardConfig] = useState(loadDashboardConfiguration)
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [mediaPlayer, setMediaPlayer] = useState<MediaPlayerSnapshot | null>(null)

  useEffect(() => {
    setStatus(service.getConnectionStatus())
    const unsubscribe = service.subscribeConnection(setStatus)
    void service.connect().catch(() => {})
    return () => {
      unsubscribe()
      service.disconnect()
    }
  }, [service])

  useEffect(() => {
    if (status !== 'connected' || SMART_HOME_MODE !== 'home-assistant') return
    let active = true
    setLastConnectedAt(new Date().toISOString())

    void service.getAvailableEntities().then(async (entities) => {
      if (!active) return
      const storedMappings = homeAssistantConfig
        ? loadEntityMappings(homeAssistantConfig.url)
        : {}
      await service.applyEntityMappings(storedMappings)
      if (!active) return
      setAvailableEntities(entities)
      setEntityMappings(storedMappings)
    }).catch(() => {})

    return () => {
      active = false
    }
  }, [homeAssistantConfig, service, status])

  useEffect(() => {
    const entityId = dashboardConfig.weatherEntityId
    if (status !== 'connected' || !entityId) {
      setWeather(null)
      setWeatherLoading(false)
      return
    }
    let active = true
    const refresh = async () => {
      setWeatherLoading(true)
      try {
        const next = await service.getWeather(entityId)
        if (active) setWeather(next)
      } catch {
        if (active) setWeather(null)
      } finally {
        if (active) setWeatherLoading(false)
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15 * 60 * 1000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [dashboardConfig.weatherEntityId, service, status])

  useEffect(() => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (status !== 'connected' || !entityId) {
      setMediaPlayer(null)
      return
    }
    let active = true
    void service.getMediaPlayer(entityId).then((snapshot) => {
      if (active) setMediaPlayer(snapshot)
    }).catch(() => {
      if (active) setMediaPlayer(null)
    })
    const unsubscribe = service.subscribeMediaPlayer(entityId, (snapshot) => {
      if (active) setMediaPlayer(snapshot)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [dashboardConfig.mediaPlayerEntityId, service, status])

  const handleMediaPlayerAction = useCallback((action: MediaPlayerAction) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return
    void service.mediaPlayerAction(entityId, action).catch(() => {})
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const handleSetMediaPlayerVolume = useCallback((volume: number) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return
    void service.setMediaPlayerVolume(entityId, volume).catch(() => {})
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const handleSetMediaPlayerShuffle = useCallback((shuffle: boolean) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return
    void service.setMediaPlayerShuffle(entityId, shuffle).catch(() => {})
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const handleSetMediaPlayerRepeat = useCallback((repeat: MediaPlayerRepeat) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return
    void service.setMediaPlayerRepeat(entityId, repeat).catch(() => {})
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const handleSeekMediaPlayer = useCallback((positionSeconds: number) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return
    void service.seekMediaPlayer(entityId, positionSeconds).catch(() => {})
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const handleSelectMediaPlayerSource = useCallback((source: string) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return
    void service.selectMediaPlayerSource(entityId, source).catch(() => {})
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const handleBrowseMedia = useCallback((mediaContentType?: string, mediaContentId?: string) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return Promise.reject(new Error('No media player configured.'))
    return service.browseMedia(entityId, mediaContentType, mediaContentId)
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const handlePlayMedia = useCallback((mediaContentType: string, mediaContentId: string) => {
    const entityId = dashboardConfig.mediaPlayerEntityId
    if (!entityId) return Promise.reject(new Error('No media player configured.'))
    return service.playMedia(entityId, mediaContentType, mediaContentId)
  }, [dashboardConfig.mediaPlayerEntityId, service])

  const configure = useCallback(async (url: string, replacementToken: string) => {
    const token = replacementToken.trim() || homeAssistantConfig?.token || ''
    const config = validateHomeAssistantConfig(url, token)
    const mappings = loadEntityMappings(config.url)
    const candidate = new HomeAssistantService(config, mappings)

    try {
      await candidate.connect()
      const entities = await candidate.getAvailableEntities()
      saveHomeAssistantConfig(config)
      setHomeAssistantConfig(config)
      setAvailableEntities(entities)
      setEntityMappings(mappings)
      setLastConnectedAt(new Date().toISOString())
      setService(candidate)
      setStatus('connected')
    } catch (error) {
      candidate.disconnect()
      if (!homeAssistantConfig) {
        setStatus(candidate.getConnectionStatus() === 'auth-error' ? 'auth-error' : 'disconnected')
      }
      throw error
    }
  }, [homeAssistantConfig])

  const saveMappings = useCallback(async (mappings: EntityMappings) => {
    const validatedMappings = Object.fromEntries(
      Object.entries(mappings).filter(([, entityId]) =>
        typeof entityId === 'string' && /^(light|switch)\.[a-z0-9_]+$/.test(entityId),
      ),
    )
    if (homeAssistantConfig) saveEntityMappings(homeAssistantConfig.url, validatedMappings)
    await service.applyEntityMappings(validatedMappings)
    setEntityMappings(validatedMappings)
  }, [homeAssistantConfig, service])

  const saveDashboardConfig = useCallback((config: DashboardConfiguration) => {
    setDashboardConfig(saveDashboardConfiguration(config))
  }, [])

  const returnToDashboard = useCallback(() => setSettingsOpen(false), [])

  const clearCredentials = useCallback(() => {
    clearHomeAssistantConfig()
    setHomeAssistantConfig(null)
    setAvailableEntities([])
    setWeather(null)
    setMediaPlayer(null)
    setService(new UnconfiguredSmartHomeService())
    setStatus('unconfigured')
    returnToDashboard()
  }, [returnToDashboard])

  const clearMappings = useCallback(() => {
    clearEntityMappings()
    setEntityMappings({})
    void service.applyEntityMappings({})
    returnToDashboard()
  }, [returnToDashboard, service])

  const resetDashboardConfig = useCallback(() => {
    setDashboardConfig(clearDashboardConfiguration())
    returnToDashboard()
  }, [returnToDashboard])

  const clearAllLocalConfiguration = useCallback(() => {
    clearHomeAssistantConfig()
    clearEntityMappings()
    setDashboardConfig(clearDashboardConfiguration())
    setHomeAssistantConfig(null)
    setAvailableEntities([])
    setWeather(null)
    setMediaPlayer(null)
    setEntityMappings({})
    setService(new UnconfiguredSmartHomeService())
    setStatus('unconfigured')
    returnToDashboard()
  }, [returnToDashboard])

  return (
    <SmartHomeContext.Provider
      value={{
        service,
        status,
        mode: SMART_HOME_MODE,
        configuredUrl: homeAssistantConfig?.url ?? null,
        hasStoredToken: Boolean(homeAssistantConfig?.token),
        settingsOpen,
        availableEntities,
        entityMappings,
        dashboardConfig,
        lastConnectedAt,
        weather,
        weatherLoading,
        mediaPlayer,
        mediaPlayerAction: handleMediaPlayerAction,
        setMediaPlayerVolume: handleSetMediaPlayerVolume,
        setMediaPlayerShuffle: handleSetMediaPlayerShuffle,
        setMediaPlayerRepeat: handleSetMediaPlayerRepeat,
        seekMediaPlayer: handleSeekMediaPlayer,
        selectMediaPlayerSource: handleSelectMediaPlayerSource,
        browseMedia: handleBrowseMedia,
        playMedia: handlePlayMedia,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
        configure,
        saveMappings,
        saveDashboardConfig,
        clearCredentials,
        clearMappings,
        resetDashboardConfig,
        clearAllLocalConfiguration,
      }}
    >
      {children}
    </SmartHomeContext.Provider>
  )
}

export function useSmartHome(): SmartHomeContextValue {
  const context = useContext(SmartHomeContext)
  if (!context) throw new Error('useSmartHome must be used inside SmartHomeProvider.')
  return context
}
