interface PageIndicatorProps {
  activePage: number
  labels: readonly string[]
  onSelect: (index: number) => void
}

export function PageIndicator({ activePage, labels, onSelect }: PageIndicatorProps) {
  return (
    <nav className="ds-page-indicator" aria-label="Dashboard pages">
      {labels.map((label, index) => {
        const active = index === activePage
        return (
          <button
            key={label}
            className={`ds-page-indicator-dot ${active ? 'active' : ''}`}
            type="button"
            aria-label={`Go to ${label}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(index)}
          >
            <span className="dot" aria-hidden="true" />
          </button>
        )
      })}
    </nav>
  )
}
