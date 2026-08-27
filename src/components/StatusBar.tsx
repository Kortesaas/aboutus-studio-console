import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useSmartHome } from '../context/SmartHomeProvider'
import type { ConnectionStatus } from '../services/smartHome'

interface StatusBarProps {
  pageName: string
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const statusLabels: Record<ConnectionStatus, string> = {
  unconfigured: 'Setup required',
  connecting: 'Connecting',
  connected: 'Connected',
  disconnected: 'Disconnected',
  'auth-error': 'Auth error',
}

export function StatusBar({ pageName }: StatusBarProps) {
  const [now, setNow] = useState(() => new Date())
  const [isHolding, setIsHolding] = useState(false)
  const holdTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)
  const { status, mode, openSettings } = useSmartHome()
  const label = mode === 'mock' ? 'Mock mode' : statusLabels[status]
  const dotVariant = mode === 'mock' ? 'connecting' : status

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      window.clearInterval(timer)
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    }
  }, [])

  const cancelHold = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
    setIsHolding(false)
  }

  const beginHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    cancelHold()
    longPressTriggeredRef.current = false
    setIsHolding(true)
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null
      longPressTriggeredRef.current = true
      setIsHolding(false)
      openSettings()
    }, 1500)
  }

  return (
    <header className="ds-topbar">
      <span className="ds-topbar-title">{pageName}</span>
      <div className="ds-topbar-right">
        <time className="ds-topbar-clock" dateTime={now.toISOString()}>{timeFormatter.format(now)}</time>
        <button
          className={`ds-topbar-connection ds-topbar-connection--${status} ${isHolding ? 'is-holding' : ''}`}
          type="button"
          aria-label={`Home Assistant: ${label}. Press and hold to open Settings`}
          onPointerDown={beginHold}
          onPointerUp={cancelHold}
          onPointerCancel={cancelHold}
          onPointerLeave={cancelHold}
          onClick={(event) => {
            if (longPressTriggeredRef.current) event.preventDefault()
            longPressTriggeredRef.current = false
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className={`ds-status-dot ds-status-dot--sm ds-status-dot--${dotVariant}`} />
          <span className="ds-topbar-connection-label">{label}</span>
          <span className="ds-topbar-hold-progress" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
