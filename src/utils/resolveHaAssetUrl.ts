/**
 * Resolves an image/asset URL returned by Home Assistant (album art,
 * media-browser thumbnails). HA sometimes returns an absolute external URL
 * (e.g. Spotify's own CDN) and sometimes a path relative to the HA instance
 * itself (e.g. `/api/media_player_proxy/...`).
 *
 * In same-origin Docker proxy mode the relative path resolves as-is via
 * nginx's `/api/` passthrough (see nginx.conf). In direct-URL mode it needs
 * to be resolved against the configured HA origin.
 */
export function resolveHaAssetUrl(assetUrl: string | null, configuredUrl: string | null): string | null {
  if (!assetUrl) return null
  if (/^https?:\/\//.test(assetUrl)) return assetUrl
  if (configuredUrl && /^https?:\/\//.test(configuredUrl)) {
    try {
      return new URL(assetUrl, configuredUrl).toString()
    } catch {
      return assetUrl
    }
  }
  return assetUrl
}
