interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  accent?: boolean
}

export function MetricCard({ label, value, unit, accent = false }: MetricCardProps) {
  return (
    <article className={`metric-card ${accent ? 'metric-accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}<small>{unit}</small></strong>
    </article>
  )
}
