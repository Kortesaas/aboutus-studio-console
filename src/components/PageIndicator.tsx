interface PageIndicatorProps {
  activePage: number
  labels: readonly string[]
  onSelect: (index: number) => void
}

export function PageIndicator({ activePage, labels, onSelect }: PageIndicatorProps) {
  return (
    <nav className="page-indicator" aria-label="Dashboard pages">
      {labels.map((label, index) => (
        <button
          key={label}
          className={index === activePage ? 'indicator-dot active' : 'indicator-dot'}
          type="button"
          aria-label={`Go to ${label}`}
          aria-current={index === activePage ? 'page' : undefined}
          onClick={() => onSelect(index)}
        />
      ))}
    </nav>
  )
}
