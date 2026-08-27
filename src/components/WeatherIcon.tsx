interface WeatherIconProps {
  condition: string
  className?: string
}

export function WeatherIcon({ condition, className = '' }: WeatherIconProps) {
  const normalized = condition.toLowerCase()
  const rainy = normalized.includes('rain') || normalized.includes('pour')
  const snowy = normalized.includes('snow')
  const stormy = normalized.includes('lightning') || normalized.includes('storm')
  const cloudy = normalized.includes('cloud') || rainy || snowy || stormy
  const night = normalized.includes('night')

  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={formatCondition(condition)}>
      {!cloudy && (
        night
          ? <path d="M42 12a21 21 0 1 0 10 34A22 22 0 0 1 42 12Z" />
          : <><circle cx="32" cy="32" r="11" /><path d="M32 7v8M32 49v8M7 32h8M49 32h8M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6" /></>
      )}
      {cloudy && (
        <path d="M17 46h30a10 10 0 0 0 1-20 16 16 0 0 0-30-3A12 12 0 0 0 17 46Z" />
      )}
      {rainy && <path d="M23 51l-3 7M34 51l-3 7M45 51l-3 7" />}
      {snowy && <path d="M24 51v8M20 55h8M40 51v8M36 55h8" />}
      {stormy && <path d="M36 45l-8 11h7l-4 7" />}
    </svg>
  )
}

export function formatCondition(condition: string): string {
  return condition.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
