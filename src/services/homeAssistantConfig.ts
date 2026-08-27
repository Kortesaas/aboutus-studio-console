export interface HomeAssistantConfig {
  url: string
  token: string
}

const STORAGE_KEY = 'aboutus.studio.ha.connection.v1'
export const HOME_ASSISTANT_CONFIG_SCHEMA_VERSION = 1

export function normalizeHomeAssistantUrl(value: string): string {
  const trimmed = value.trim()

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('?') || trimmed.includes('#')) {
      throw new Error('Use a root-relative proxy path such as /ha-websocket.')
    }

    const normalizedPath = trimmed.replace(/\/+$/, '')
    if (!normalizedPath) throw new Error('Enter a valid Home Assistant URL or proxy path.')
    return normalizedPath
  }

  let parsed: URL

  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('Enter a valid Home Assistant URL.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('Use an http:// or https:// Home Assistant URL.')
  }

  if (parsed.username || parsed.password) {
    throw new Error('Do not include credentials in the Home Assistant URL.')
  }

  parsed.search = ''
  parsed.hash = ''
  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  return parsed.toString().replace(/\/$/, '')
}

export function validateHomeAssistantConfig(url: string, token: string): HomeAssistantConfig {
  const normalizedUrl = normalizeHomeAssistantUrl(url)
  if (!token.trim()) throw new Error('Enter a Long-Lived Access Token.')
  return { url: normalizedUrl, token: token.trim() }
}

export function loadHomeAssistantConfig(): HomeAssistantConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<HomeAssistantConfig>
    if (typeof parsed.url !== 'string' || typeof parsed.token !== 'string') return null
    return validateHomeAssistantConfig(parsed.url, parsed.token)
  } catch {
    return null
  }
}

export function saveHomeAssistantConfig(config: HomeAssistantConfig): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearHomeAssistantConfig(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function getHomeAssistantWebSocketUrl(baseUrl: string): string {
  const usesProxyPath = baseUrl.startsWith('/')
  const endpoint = usesProxyPath ? new URL(baseUrl, window.location.origin) : new URL(baseUrl)
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:'
  if (!usesProxyPath) {
    endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '')}/api/websocket`
  }
  endpoint.search = ''
  endpoint.hash = ''
  return endpoint.toString()
}
