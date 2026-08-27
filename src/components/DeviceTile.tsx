import type { Device } from '../services/smartHome'

interface DeviceTileProps {
  device: Device
  disabled?: boolean
  onToggle: (device: Device) => void
}

type Variant = 'on' | 'off' | 'pending' | 'stale' | 'unavailable' | 'unknown' | 'unconfigured'

const LABEL: Record<Variant, string> = {
  on: 'On',
  off: 'Off',
  pending: 'Sending',
  stale: 'Stale',
  unavailable: 'Unavailable',
  unknown: 'Unknown',
  unconfigured: 'Unavailable',
}

const HINT: Record<Device['kind'], string> = {
  light: 'Light',
  switch: 'Switch',
}

function variantFor(device: Device): Variant {
  if (device.isPending) return 'pending'
  if (device.isStale) return 'stale'
  return device.state
}

export function DeviceTile({ device, disabled = false, onToggle }: DeviceTileProps) {
  const variant = variantFor(device)
  const hasKnownState = device.state === 'on' || device.state === 'off'
  const isDisabled = disabled || !hasKnownState || device.isStale || device.isPending

  return (
    <button
      className={`ds-device-tile ds-device-tile--${variant}`}
      type="button"
      role="switch"
      aria-checked={hasKnownState ? device.state === 'on' : undefined}
      aria-label={`${device.name} — ${LABEL[variant]}`}
      disabled={isDisabled}
      onClick={() => onToggle(device)}
    >
      <span className="ds-device-tile-head">
        <span className="ds-device-tile-name">{device.name}</span>
      </span>
      <span className="ds-device-tile-hint">
        {device.hint ?? HINT[device.kind]}{variant !== 'on' && variant !== 'off' ? ` · ${LABEL[variant]}` : ''}
      </span>
      <span aria-hidden="true" className="ds-device-tile-rail-track" />
      <span aria-hidden="true" className="ds-device-tile-rail" />
    </button>
  )
}
