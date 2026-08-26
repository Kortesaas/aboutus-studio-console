import type { Device } from '../services/smartHome'

interface DeviceTileProps {
  device: Device
  onToggle: (device: Device) => void
}

function DeviceIcon({ kind }: Pick<Device, 'kind'>) {
  if (kind === 'light') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18h6M10 22h4M8.2 14.5A6 6 0 1 1 15.8 14.5C14.7 15.4 14 16.1 14 18h-4c0-1.9-.7-2.6-1.8-3.5Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3v5M16 3v5M6 8h12v3a6 6 0 0 1-6 6v4M9 21h6" />
    </svg>
  )
}

export function DeviceTile({ device, onToggle }: DeviceTileProps) {
  return (
    <button
      className={`device-tile ${device.isOn ? 'is-on' : 'is-off'}`}
      type="button"
      aria-pressed={device.isOn}
      onClick={() => onToggle(device)}
    >
      <span className="device-icon"><DeviceIcon kind={device.kind} /></span>
      <span className="device-copy">
        <strong>{device.name}</strong>
        <small>{device.kind === 'light' ? 'Light' : 'Power outlet'}</small>
      </span>
      <span className="device-state">
        <span className="state-dot" />
        {device.isOn ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}
