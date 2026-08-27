import { useEffect, useState } from 'react'
import { useSmartHome } from '../context/SmartHomeProvider'
import type { BrowseMediaItem, BrowseMediaNode } from '../services/smartHome'
import { resolveHaAssetUrl } from '../utils/resolveHaAssetUrl'
import { MediaIcon } from './MediaIcon'

interface MediaBrowserProps {
  onClose: () => void
}

interface StackEntry {
  title: string
  mediaContentType: string
  mediaContentId: string
}

const ROOT: StackEntry = { title: 'Browse', mediaContentType: '', mediaContentId: '' }

export function MediaBrowser({ onClose }: MediaBrowserProps) {
  const { browseMedia, playMedia, configuredUrl } = useSmartHome()
  const [stack, setStack] = useState<StackEntry[]>([ROOT])
  const [node, setNode] = useState<BrowseMediaNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const current = stack[stack.length - 1]

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    browseMedia(current.mediaContentType || undefined, current.mediaContentId || undefined)
      .then((result) => {
        if (!active) return
        setNode(result)
        setLoading(false)
      })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'Unable to browse media.')
        setLoading(false)
      })
    return () => { active = false }
  }, [browseMedia, current.mediaContentId, current.mediaContentType])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const playAndClose = async (item: BrowseMediaItem) => {
    try {
      await playMedia(item.mediaContentType, item.mediaContentId)
      onClose()
    } catch {
      setError(`Couldn't play "${item.title}".`)
    }
  }

  const openItem = (item: BrowseMediaItem) => {
    if (item.canExpand) {
      setStack((prev) => [...prev, { title: item.title, mediaContentType: item.mediaContentType, mediaContentId: item.mediaContentId }])
      return
    }
    if (item.canPlay) void playAndClose(item)
  }

  const goBack = () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))

  return (
    <div className="media-browser-overlay" role="dialog" aria-modal="true" aria-label="Browse media library">
      <div className="media-browser-shell">
        <header className="media-browser-header">
          <button className="ds-icon-button" type="button" aria-label="Back" onClick={goBack} disabled={stack.length <= 1}>
            <MediaIcon name="chevron-left" />
          </button>
          <nav className="media-browser-breadcrumb" aria-label="Location">
            {stack.map((entry, index) => (
              <span key={`${entry.mediaContentId}-${index}`}>
                {index > 0 && <span className="sep" aria-hidden="true">/</span>}
                {entry.title}
              </span>
            ))}
          </nav>
          <button className="ds-icon-button" type="button" aria-label="Close browser" onClick={onClose}>
            <MediaIcon name="close" />
          </button>
        </header>

        <div className="media-browser-content">
          {loading && <p className="media-browser-status">Loading…</p>}
          {error && <p className="media-browser-status media-browser-error">{error}</p>}
          {!loading && !error && node && node.children.length === 0 && (
            <p className="media-browser-status">Nothing here.</p>
          )}
          {!loading && !error && node && node.children.length > 0 && (
            <div className="media-browser-grid">
              {node.children.map((item) => {
                const thumbnail = resolveHaAssetUrl(item.thumbnail, configuredUrl)
                const showPlayBadge = item.canPlay && item.canExpand
                return (
                  <article className="media-browser-item" key={item.mediaContentId}>
                    <button
                      className="media-browser-item-main"
                      type="button"
                      onClick={() => openItem(item)}
                    >
                      <span className="media-browser-thumb">
                        {thumbnail
                          ? <img src={thumbnail} alt="" />
                          : <MediaIcon name={item.canExpand ? 'folder' : 'note'} />}
                      </span>
                      <span className="media-browser-title">{item.title}</span>
                    </button>
                    {showPlayBadge && (
                      <button
                        className="media-browser-play"
                        type="button"
                        aria-label={`Play ${item.title}`}
                        onClick={() => void playAndClose(item)}
                      >
                        <MediaIcon name="play" />
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
