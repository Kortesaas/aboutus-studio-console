import { useEffect, useState } from 'react'
import { MetricCard } from '../components/MetricCard'
import { WeatherIcon, formatCondition } from '../components/WeatherIcon'
import { useSmartHome } from '../context/SmartHomeProvider'
import type { WeatherForecastDay } from '../services/smartHome'

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const hourFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

const DAY_SLOTS = 5
// A tapped forecast day stays pinned on the left this long before returning
// to the live current-conditions view on its own.
const PREVIEW_RESET_MS = 20_000

function formatTemp(value: number | null): string {
  return value === null ? '—' : String(Math.round(value))
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Not literally every hour — a handful of evenly-spaced points across the
// given day, sized to sit under the current-conditions column. Falls back to
// the next raw hours only for "today" (when nothing has been tapped yet),
// since borrowing another day's hours to fill a future day would be misleading.
function selectDaySlots(hourly: WeatherForecastDay[], targetDate: Date): WeatherForecastDay[] {
  const matching = hourly.filter((entry) => isSameDate(new Date(entry.datetime), targetDate))
  const source = matching.length >= 3
    ? matching
    : isSameDate(targetDate, new Date()) ? hourly.slice(0, 8) : []
  if (source.length <= DAY_SLOTS) return source
  const step = Math.ceil(source.length / DAY_SLOTS)
  return source.filter((_, index) => index % step === 0).slice(0, DAY_SLOTS)
}

export function WeatherPage() {
  const { weather, weatherLoading, dashboardConfig, status, openSettings } = useSmartHome()
  const [selectedDay, setSelectedDay] = useState<WeatherForecastDay | null>(null)

  useEffect(() => {
    if (!selectedDay) return
    const timer = window.setTimeout(() => setSelectedDay(null), PREVIEW_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [selectedDay?.datetime])

  if (!weather) {
    const noEntity = !dashboardConfig.weatherEntityId
    return (
      <main className="screen-frame" aria-label="Weather overview">
        <div className="screen-main weather-empty">
          <WeatherIcon condition="cloudy" className="weather-empty-icon" />
          <p className="eyebrow">Weather</p>
          <h1>{weatherLoading ? 'Loading weather…' : 'Weather unavailable'}</h1>
          <p>
            {noEntity
              ? 'Choose a Home Assistant weather entity in Settings.'
              : status === 'connected'
                ? 'The selected weather entity did not return current data.'
                : 'Weather will refresh when Home Assistant reconnects.'}
          </p>
          {noEntity && <button className="ds-button ds-button--secondary" type="button" onClick={openSettings}>Open Settings</button>}
        </div>
      </main>
    )
  }

  const { current, forecast, forecastAvailable, hourly, hourlyAvailable } = weather
  const heroDate = selectedDay ? new Date(selectedDay.datetime) : new Date()
  const heroCondition = selectedDay ? selectedDay.condition : current.condition
  const heroTempHigh = selectedDay ? selectedDay.temperature : current.temperature
  const heroMetrics = selectedDay
    ? { humidity: null, wind: null, windUnit: '', rain: selectedDay.precipitation, rainUnit: current.precipitationUnit }
    : { humidity: current.humidity, wind: current.windSpeed, windUnit: current.windSpeedUnit, rain: current.precipitation, rainUnit: current.precipitationUnit }
  const daySlots = hourlyAvailable ? selectDaySlots(hourly, heroDate) : []

  return (
    <main className="screen-frame" aria-label="Weather overview">
      <div className="screen-main">
        <div className="weather-layout">
          <section className="weather-left" aria-label="Current weather">
            <div>
              <p className="eyebrow">{selectedDay ? 'Forecast' : current.friendlyName}</p>
              <p className="weather-date">{dateFormatter.format(heroDate)}</p>
            </div>
            <div className="weather-current">
              <WeatherIcon condition={heroCondition} className="weather-current-icon" />
              <span className="weather-current-temp">
                {formatTemp(heroTempHigh)}{current.temperatureUnit}
                {selectedDay && selectedDay.templow !== null && (
                  <small className="weather-current-temp-low">{formatTemp(selectedDay.templow)}{current.temperatureUnit}</small>
                )}
              </span>
              <span className="weather-current-condition">
                {formatCondition(heroCondition)}
                {!selectedDay && current.apparentTemperature !== null && ` · Feels ${formatTemp(current.apparentTemperature)}${current.temperatureUnit}`}
              </span>
            </div>
            <div className="weather-metrics">
              <MetricCard label="Humidity" value={heroMetrics.humidity ?? '—'} unit={heroMetrics.humidity === null ? '' : '%'} />
              <MetricCard label="Wind" value={heroMetrics.wind ?? '—'} unit={heroMetrics.wind === null ? '' : heroMetrics.windUnit} />
              <MetricCard label="Rain" value={heroMetrics.rain ?? '—'} unit={heroMetrics.rain === null ? '' : heroMetrics.rainUnit} accent />
            </div>
            {daySlots.length > 0 && (
              <div className="weather-today">
                <div className="ds-section-label-row">
                  <span className="label">{selectedDay ? weekdayFormatter.format(heroDate) : 'Today'}</span>
                  <span className="rule" aria-hidden="true" />
                </div>
                <div className="weather-today-row">
                  {daySlots.map((slot) => (
                    <div className="weather-today-item" key={slot.datetime}>
                      <span className="weather-today-time">{hourFormatter.format(new Date(slot.datetime))}</span>
                      <WeatherIcon condition={slot.condition} className="weather-today-icon" />
                      <span className="weather-today-temp">{formatTemp(slot.temperature)}{current.temperatureUnit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="weather-forecast" aria-label="Daily forecast">
            <div className="ds-section-label-row">
              <span className="label">Daily forecast</span>
              <span className="rule" aria-hidden="true" />
              <span className="meta">{forecastAvailable ? `${forecast.length} days` : 'Unavailable'}</span>
            </div>
            {!forecastAvailable && <p className="forecast-notice">Current conditions remain live. Home Assistant did not return a daily forecast.</p>}
            {forecastAvailable && forecast.length === 0 && <p className="forecast-notice">No daily forecast entries are available.</p>}
            {forecast.map((day) => (
              <button
                className={`ds-panel forecast-row ${selectedDay?.datetime === day.datetime ? 'forecast-row--selected' : ''}`}
                type="button"
                key={day.datetime}
                aria-pressed={selectedDay?.datetime === day.datetime}
                onClick={() => setSelectedDay((current) => current?.datetime === day.datetime ? null : day)}
              >
                <span className="forecast-row-time">{dayFormatter.format(new Date(day.datetime))}</span>
                <WeatherIcon condition={day.condition} className="forecast-row-icon" />
                <span className="forecast-row-condition">{formatCondition(day.condition)}</span>
                <span className="forecast-row-temp">
                  {formatTemp(day.temperature)}{current.temperatureUnit}
                  {day.templow !== null && <small>{formatTemp(day.templow)}{current.temperatureUnit}</small>}
                </span>
              </button>
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}
