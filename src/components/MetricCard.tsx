interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  sub?: string
  accent?: boolean
}

export function MetricCard({ label, value, unit, sub, accent = false }: MetricCardProps) {
  return (
    <article className={`ds-metric-tile ${accent ? 'ds-metric-tile--accent' : ''}`}>
      <span className="ds-metric-tile-label">{label}</span>
      <span className="ds-metric-tile-value-row">
        <span className="ds-metric-tile-value">{value}</span>
        {unit ? <span className="ds-metric-tile-unit">{unit}</span> : null}
      </span>
      {sub ? <span className="ds-metric-tile-sub">{sub}</span> : null}
    </article>
  )
}
