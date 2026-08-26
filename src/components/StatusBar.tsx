import { useEffect, useState } from 'react'

interface StatusBarProps {
  pageName: string
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function StatusBar({ pageName }: StatusBarProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <header className="status-bar">
      <div className="status-brand">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span className="page-name">{pageName}</span>
      </div>
      <div className="status-meta">
        <time dateTime={now.toISOString()}>{timeFormatter.format(now)}</time>
        <span className="connection-status" aria-label="Mock backend connected">
          <span className="connection-dot" />
          Connected
        </span>
      </div>
    </header>
  )
}
