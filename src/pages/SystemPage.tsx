import { MetricCard } from '../components/MetricCard'
import { StatusBar } from '../components/StatusBar'
import { mockSystem } from '../data/mockSystem'

export function SystemPage() {
  const { nas, network } = mockSystem
  const storagePercent = Math.round((nas.storageUsedTb / nas.storageTotalTb) * 100)

  return (
    <main className="screen-frame" aria-label="System status">
      <StatusBar pageName="System" />
      <div className="screen-main">
        <div className="system-metrics">
          <MetricCard label="CPU" value={nas.cpuPercent} unit="%" />
          <MetricCard label="Memory" value={nas.ramPercent} unit="%" />
          <MetricCard label="Temperature" value={nas.temperatureCelsius} unit="°C" />
          <MetricCard label="Uptime" value={nas.uptime} sub="Studio NAS" />
        </div>

        <div className="system-panels">
          <section className="system-panel">
            <div className="system-panel-head">
              <div className="system-panel-title">
                <span className="eyebrow">Storage</span>
                <h2>{nas.name}</h2>
              </div>
              <span className={`ds-badge ds-badge--${nas.online ? 'on' : 'unavailable'}`}>
                <span className={`ds-status-dot ds-status-dot--sm ds-status-dot--${nas.online ? 'on' : 'unavailable'}`} />
                {nas.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="storage-copy">
              <strong>{nas.storageUsedTb} TB</strong>
              <span>used of {nas.storageTotalTb} TB</span>
            </div>
            <div className="storage-bar" aria-label={`${storagePercent}% storage used`}>
              <span style={{ width: `${storagePercent}%` }} />
            </div>
            <div className="nas-metrics">
              <MetricCard label="CPU" value={nas.cpuPercent} unit="%" />
              <MetricCard label="Memory" value={nas.ramPercent} unit="%" />
              <MetricCard label="Temp" value={nas.temperatureCelsius} unit="°C" />
              <MetricCard label="Uptime" value={nas.uptime} />
            </div>
          </section>

          <section className="system-panel">
            <div className="system-panel-head">
              <div className="system-panel-title">
                <span className="eyebrow">Connectivity</span>
                <h2>Internet</h2>
              </div>
              <span className={`ds-badge ds-badge--${network.online ? 'on' : 'unavailable'}`}>
                <span className={`ds-status-dot ds-status-dot--sm ds-status-dot--${network.online ? 'on' : 'unavailable'}`} />
                {network.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="network-hero">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 8.5A14 14 0 0 1 21 8.5M6 12a9 9 0 0 1 12 0M9.5 15.5a4 4 0 0 1 5 0M12 19h.01" />
              </svg>
              <div>
                <strong>{network.online ? 'Stable' : 'Offline'}</strong>
                <span>Primary connection</span>
              </div>
            </div>
            <div className="network-metrics">
              <MetricCard label="Download" value={network.downloadMbps} unit="Mbps" accent />
              <MetricCard label="Upload" value={network.uploadMbps} unit="Mbps" />
              <MetricCard label="Ping" value={network.pingMs} unit="ms" />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
