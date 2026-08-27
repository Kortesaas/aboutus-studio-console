export type GroupState = 'ON' | 'OFF' | 'MIXED' | 'UNAVAILABLE'

interface GroupControlProps {
  name: string
  state: GroupState
  count: number
  disabled?: boolean
  pending?: boolean
  variant?: 'room' | 'group'
  onToggle: () => void
}

const BADGE_VARIANT: Record<GroupState, string> = {
  ON: 'on',
  OFF: 'off',
  MIXED: 'mixed',
  UNAVAILABLE: 'unavailable',
}

function hintFor(state: GroupState, pending: boolean, count: number) {
  const noun = count === 1 ? 'fixture' : 'fixtures'
  if (pending) return `${count} ${noun} · sending`
  if (state === 'MIXED') return `${count} ${noun} · mixed`
  if (state === 'UNAVAILABLE') return `${count} ${noun} · unavailable`
  return `${count} ${noun}`
}

export function GroupControl({
  name,
  state,
  count,
  disabled = false,
  pending = false,
  variant = 'group',
  onToggle,
}: GroupControlProps) {
  const badgeVariant = pending ? 'pending' : BADGE_VARIANT[state]
  const dead = state === 'UNAVAILABLE'

  return (
    <button
      className={`ds-group-card ds-group-card--${variant} ds-group-card--${badgeVariant} ${dead ? 'ds-group-card--disabled' : ''}`}
      type="button"
      role="switch"
      aria-checked={state === 'ON'}
      aria-label={`${name} — ${pending ? 'Sending' : state}`}
      disabled={disabled || pending || dead}
      onClick={onToggle}
    >
      <span className="ds-group-card-head">
        <span className="ds-group-card-name">{name}</span>
      </span>
      <span className="ds-group-card-hint">{hintFor(state, pending, count)}</span>
      <span aria-hidden="true" className="ds-group-card-rail" />
    </button>
  )
}
