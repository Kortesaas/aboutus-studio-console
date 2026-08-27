export type GroupState = 'ON' | 'OFF' | 'MIXED' | 'UNAVAILABLE'

interface GroupControlProps {
  name: string
  state: GroupState
  disabled?: boolean
  onPower: (isOn: boolean) => void
  compact?: boolean
}

const BADGE_VARIANT: Record<GroupState, string> = {
  ON: 'on',
  OFF: 'off',
  MIXED: 'mixed',
  UNAVAILABLE: 'unavailable',
}

export function GroupControl({
  name,
  state,
  disabled = false,
  onPower,
  compact = false,
}: GroupControlProps) {
  const variant = BADGE_VARIANT[state]
  const dead = state === 'UNAVAILABLE'

  return (
    <section
      className={`ds-group-card ${compact ? 'ds-group-card--global' : ''} ${dead ? 'ds-group-card--disabled' : ''}`}
    >
      <div className="ds-group-card-head">
        <h2 className="ds-group-card-name">{name}</h2>
        <span className={`ds-badge ds-badge--${variant}`}>
          <span className={`ds-status-dot ds-status-dot--sm ds-status-dot--${variant}`} />
          {state}
        </span>
      </div>
      <div className="ds-group-card-actions">
        <button
          className={`ds-button ds-button--block ${state === 'ON' ? 'ds-button--selected' : ''}`}
          type="button"
          disabled={disabled}
          onClick={() => onPower(true)}
        >
          On
        </button>
        <button
          className={`ds-button ds-button--block ${state === 'OFF' ? 'ds-button--selected' : ''}`}
          type="button"
          disabled={disabled}
          onClick={() => onPower(false)}
        >
          Off
        </button>
      </div>
    </section>
  )
}
