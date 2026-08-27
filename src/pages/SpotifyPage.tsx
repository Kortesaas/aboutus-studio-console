import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { MediaBrowser } from '../components/MediaBrowser'
import { MediaIcon } from '../components/MediaIcon'
import { useSmartHome } from '../context/SmartHomeProvider'
import type { MediaPlayerSnapshot } from '../services/smartHome'
import { resolveHaAssetUrl } from '../utils/resolveHaAssetUrl'

function computeElapsed(player: MediaPlayerSnapshot): number | null {
  if (player.position === null) return null
  if (player.state !== 'playing' || !player.positionUpdatedAt) return player.position
  const updatedAt = new Date(player.positionUpdatedAt).getTime()
  if (Number.isNaN(updatedAt)) return player.position
  const elapsed = player.position + (Date.now() - updatedAt) / 1000
  return player.duration !== null ? Math.min(elapsed, player.duration) : elapsed
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—:—'
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function SpotifyPage() {
  const {
    mediaPlayer, dashboardConfig, status, configuredUrl, openSettings,
    mediaPlayerAction, setMediaPlayerVolume, setMediaPlayerShuffle, setMediaPlayerRepeat,
    seekMediaPlayer, selectMediaPlayerSource,
  } = useSmartHome()
  const [, forceTick] = useState(0)
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)
  const progressTrackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mediaPlayer?.state !== 'playing') return
    const timer = window.setInterval(() => forceTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [mediaPlayer?.state])

  useEffect(() => {
    setSourcePickerOpen(false)
  }, [mediaPlayer?.entityId])

  const hasTrack = mediaPlayer !== null && (mediaPlayer.state === 'playing' || mediaPlayer.state === 'paused') && mediaPlayer.title

  if (!hasTrack) {
    const noEntity = !dashboardConfig.mediaPlayerEntityId
    return (
      <main className="screen-frame" aria-label="Spotify">
        <div className="screen-main spotify-empty">
          <MediaIcon name="note" className="spotify-empty-icon" />
          <p className="eyebrow">Spotify</p>
          <h1>{noEntity ? 'Spotify unavailable' : mediaPlayer?.state === 'off' ? 'Spotify is off' : 'Nothing playing'}</h1>
          <p>
            {noEntity
              ? 'Choose a Home Assistant media player entity in Settings.'
              : status === 'connected'
                ? 'Start playback on Spotify and it will appear here.'
                : 'Spotify will refresh when Home Assistant reconnects.'}
          </p>
          {noEntity && <button className="ds-button ds-button--secondary" type="button" onClick={openSettings}>Open Settings</button>}
        </div>
      </main>
    )
  }

  const player = mediaPlayer
  const artUrl = resolveHaAssetUrl(player.imageUrl, configuredUrl)
  const elapsed = computeElapsed(player)
  const progressPercent = player.duration && elapsed !== null ? Math.min(100, (elapsed / player.duration) * 100) : 0
  const isPlaying = player.state === 'playing'
  const volumePercent = Math.round((player.volume ?? 0) * 100)
  const canSeek = player.duration !== null && player.duration > 0

  const handleSeek = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!canSeek || !progressTrackRef.current || !player.duration) return
    const rect = progressTrackRef.current.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    seekMediaPlayer(fraction * player.duration)
  }

  return (
    <main className="screen-frame" aria-label="Spotify">
      <div className="screen-main">
        <div className="spotify-layout">
          <div className="spotify-art-wrap">
            {artUrl
              ? <img className="spotify-art" src={artUrl} alt="" />
              : <div className="spotify-art spotify-art-placeholder"><MediaIcon name="note" /></div>}
          </div>

          <section className="spotify-info" aria-label="Now playing">
            <div className="spotify-source-row">
              <p className="eyebrow">{player.friendlyName}</p>
              {player.sourceList && player.sourceList.length > 0 && (
                <div className="spotify-source-picker-wrap">
                  <button
                    className="spotify-source-chip"
                    type="button"
                    onClick={() => setSourcePickerOpen((open) => !open)}
                    aria-expanded={sourcePickerOpen}
                  >
                    <MediaIcon name="speaker" />
                    {player.source ?? 'Choose device'}
                  </button>
                  {sourcePickerOpen && (
                    <div className="spotify-source-picker" role="menu">
                      {player.sourceList.map((source) => (
                        <button
                          key={source}
                          className={`spotify-source-option ${source === player.source ? 'is-active' : ''}`}
                          type="button"
                          role="menuitemradio"
                          aria-checked={source === player.source}
                          onClick={() => { selectMediaPlayerSource(source); setSourcePickerOpen(false) }}
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <h1 className="spotify-title">{player.title}</h1>
            <p className="spotify-subtitle">{[player.artist, player.album].filter(Boolean).join(' · ') || ' '}</p>

            <div className="spotify-progress">
              <div
                className={`spotify-progress-track ${canSeek ? 'is-seekable' : ''}`}
                ref={progressTrackRef}
                onClick={canSeek ? handleSeek : undefined}
              >
                <span className="spotify-progress-fill" style={{ width: `${progressPercent}%` }} />
                <span className="spotify-progress-thumb" style={{ left: `${progressPercent}%` }} aria-hidden="true" />
              </div>
              <div className="spotify-progress-times">
                <span>{formatTime(elapsed)}</span>
                <span>{formatTime(player.duration)}</span>
              </div>
            </div>

            <div className="spotify-controls">
              <button
                className={`ds-icon-button spotify-control-side ${player.shuffle ? 'is-active' : ''}`}
                type="button"
                aria-label="Shuffle"
                aria-pressed={player.shuffle ?? undefined}
                disabled={player.shuffle === null}
                onClick={() => setMediaPlayerShuffle(!player.shuffle)}
              >
                <MediaIcon name="shuffle" />
              </button>
              <button className="ds-icon-button spotify-control-transport" type="button" aria-label="Previous track" onClick={() => mediaPlayerAction('previous')}>
                <MediaIcon name="previous" />
              </button>
              <button
                className="spotify-play-button"
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={() => mediaPlayerAction(isPlaying ? 'pause' : 'play')}
              >
                <MediaIcon name={isPlaying ? 'pause' : 'play'} />
              </button>
              <button className="ds-icon-button spotify-control-transport" type="button" aria-label="Next track" onClick={() => mediaPlayerAction('next')}>
                <MediaIcon name="next" />
              </button>
              <button
                className={`ds-icon-button spotify-control-side ${player.repeat && player.repeat !== 'off' ? 'is-active' : ''}`}
                type="button"
                aria-label={`Repeat: ${player.repeat ?? 'off'}`}
                disabled={player.repeat === null}
                onClick={() => {
                  const next = player.repeat === 'off' ? 'all' : player.repeat === 'all' ? 'one' : 'off'
                  setMediaPlayerRepeat(next)
                }}
              >
                <MediaIcon name={player.repeat === 'one' ? 'repeat-one' : 'repeat'} />
              </button>
            </div>

            <div className="spotify-volume">
              <MediaIcon name={volumePercent === 0 ? 'volume-muted' : 'volume'} className="spotify-volume-icon" />
              <input
                type="range"
                className="spotify-volume-slider"
                min={0}
                max={1}
                step={0.01}
                value={player.volume ?? 0}
                disabled={player.volume === null}
                aria-label="Volume"
                onChange={(event) => setMediaPlayerVolume(Number(event.target.value))}
              />
              <span className="spotify-volume-value">{player.volume === null ? '—' : `${volumePercent}%`}</span>
            </div>

            {player.canBrowse && (
              <button className="spotify-browse-button" type="button" onClick={() => setBrowserOpen(true)}>
                <MediaIcon name="library" />
                Browse library
              </button>
            )}
          </section>
        </div>
      </div>

      {browserOpen && <MediaBrowser onClose={() => setBrowserOpen(false)} />}
    </main>
  )
}
