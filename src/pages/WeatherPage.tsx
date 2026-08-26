import { MetricCard } from '../components/MetricCard'
import { StatusBar } from '../components/StatusBar'
import { mockWeather } from '../data/mockWeather'

function WeatherGlyph({ condition }: { condition: string }) {
  return (
    <span className={`weather-glyph weather-${condition}`} aria-hidden="true">
      <span className="sun" />
      <span className="cloud" />
    </span>
  )
}

export function WeatherPage() {
  return (
    <main className="dashboard-page weather-page" aria-label="Weather overview">
      <StatusBar pageName="Weather" />
      <div className="weather-layout">
        <section className="weather-hero">
          <div className="weather-title">
            <p className="eyebrow">{mockWeather.location} · Today</p>
            <h1>{mockWeather.condition}</h1>
          </div>
          <div className="weather-current">
            <WeatherGlyph condition="partly-cloudy" />
            <strong>{mockWeather.temperature}<sup>°</sup></strong>
          </div>
          <p>Feels like {mockWeather.feelsLike}°</p>
        </section>
        <section className="weather-details" aria-label="Current weather details">
          <MetricCard label="Humidity" value={mockWeather.humidity} unit="%" />
          <MetricCard label="Wind" value={mockWeather.wind} />
          <MetricCard label="Chance of rain" value={mockWeather.rainProbability} unit="%" accent />
        </section>
      </div>
      <section className="hourly-card">
        <div className="section-heading">
          <h2>Hourly forecast</h2>
          <span>Next 6 hours</span>
        </div>
        <div className="hourly-grid">
          {mockWeather.hourly.map((hour) => (
            <article className="hour-item" key={hour.time}>
              <span>{hour.time}</span>
              <WeatherGlyph condition={hour.condition} />
              <strong>{hour.temperature}°</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
