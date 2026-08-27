import { useEffect, useRef, useState } from 'react'
import { PageIndicator } from './components/PageIndicator'
import { SettingsPanel } from './components/SettingsPanel'
import { StatusBar } from './components/StatusBar'
import { useSmartHome } from './context/SmartHomeProvider'
import { SpotifyPage } from './pages/SpotifyPage'
import { StudioPage } from './pages/StudioPage'
import { SystemPage } from './pages/SystemPage'
import { WeatherPage } from './pages/WeatherPage'

const pageLabels = ['Spotify', 'Weather', 'Studio', 'System'] as const
const DEFAULT_PAGE = pageLabels.indexOf('Studio')

export default function App() {
  const { openSettings } = useSmartHome()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const activePageRef = useRef(DEFAULT_PAGE)
  const [activePage, setActivePage] = useState(DEFAULT_PAGE)

  const goToPage = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTo({ left: index * scroller.clientWidth, behavior })
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => goToPage(DEFAULT_PAGE, 'instant'))
    const handleResize = () => goToPage(activePageRef.current, 'instant')
    window.addEventListener('resize', handleResize)
    return () => {
      window.cancelAnimationFrame(frame)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const handleSettingsShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === ',') {
        event.preventDefault()
        openSettings()
      }
    }
    window.addEventListener('keydown', handleSettingsShortcut)
    return () => window.removeEventListener('keydown', handleSettingsShortcut)
  }, [openSettings])

  const handleScroll = () => {
    if (frameRef.current !== null) return
    frameRef.current = window.requestAnimationFrame(() => {
      const scroller = scrollerRef.current
      if (scroller) {
        const nextPage = Math.round(scroller.scrollLeft / scroller.clientWidth)
        const boundedPage = Math.max(0, Math.min(pageLabels.length - 1, nextPage))
        activePageRef.current = boundedPage
        setActivePage(boundedPage)
      }
      frameRef.current = null
    })
  }

  return (
    <div className="app-shell">
      <div className="app-status-bar">
        <StatusBar pageName={pageLabels[activePage]} />
      </div>
      <div className="page-scroller" ref={scrollerRef} onScroll={handleScroll}>
        <SpotifyPage />
        <WeatherPage />
        <StudioPage />
        <SystemPage />
      </div>
      <PageIndicator activePage={activePage} labels={pageLabels} onSelect={goToPage} />
      <SettingsPanel />
    </div>
  )
}
