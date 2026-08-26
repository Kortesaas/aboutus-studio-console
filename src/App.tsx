import { useEffect, useRef, useState } from 'react'
import { PageIndicator } from './components/PageIndicator'
import { StudioPage } from './pages/StudioPage'
import { SystemPage } from './pages/SystemPage'
import { WeatherPage } from './pages/WeatherPage'

const pageLabels = ['Weather', 'Studio', 'System'] as const

export default function App() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const activePageRef = useRef(1)
  const [activePage, setActivePage] = useState(1)

  const goToPage = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTo({ left: index * scroller.clientWidth, behavior })
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => goToPage(1, 'instant'))
    const handleResize = () => goToPage(activePageRef.current, 'instant')
    window.addEventListener('resize', handleResize)
    return () => {
      window.cancelAnimationFrame(frame)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

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
      <div className="page-scroller" ref={scrollerRef} onScroll={handleScroll}>
        <WeatherPage />
        <StudioPage />
        <SystemPage />
      </div>
      <PageIndicator activePage={activePage} labels={pageLabels} onSelect={goToPage} />
    </div>
  )
}
