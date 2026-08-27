import { useEffect, useState } from 'react'
import { MetricCard } from '../components/MetricCard'
import { StatusBar } from '../components/StatusBar'
import { mockWeather } from '../data/mockWeather'

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

export function WeatherPage() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="screen-frame" aria-label="Weather overview">
      <StatusBar pageName="Weather" />
      <div className="screen-main">
        <div className="weather-layout">
          <div className="weather-left">
            <div className="ds-clock">
              <span className="ds-clock-row">
                <span className="ds-clock-time">{timeFormatter.format(now)}</span>
              </span>
              <span className="ds-clock-date">{mockWeather.location} · {dateFormatter.format(now)}</span>
            </div>
            <div className="weather-current">
              <span className="weather-current-temp">{mockWeather.temperature}°</span>
              <span className="weather-current-condition">{mockWeather.condition} · Feels {mockWeather.feelsLike}°</span>
            </div>
            <div className="weather-metrics">
              <MetricCard label="Humidity" value={mockWeather.humidity} unit="%" />
              <MetricCard label="Wind" value={mockWeather.wind} />
              <MetricCard label="Rain" value={mockWeather.rainProbability} unit="%" accent />
            </div>
          </div>

          <div className="weather-forecast">
            <div className="ds-section-label-row">
              <span className="label">Forecast</span>
              <span className="rule" aria-hidden="true" />
              <span className="meta">Next {mockWeather.hourly.length} hours</span>
            </div>
            {mockWeather.hourly.map((hour) => (
              <div className="ds-panel forecast-row" key={hour.time}>
                <span className="forecast-row-time">{hour.time}</span>
                <span className="forecast-row-condition">{hour.condition.replace('-', ' ')}</span>
                <span className="forecast-row-temp">{hour.temperature}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
