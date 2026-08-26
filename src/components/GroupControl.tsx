export type GroupState = 'ON' | 'OFF' | 'MIXED'

interface GroupControlProps {
  name: string
  state: GroupState
  onPower: (isOn: boolean) => void
  compact?: boolean
}

export function GroupControl({ name, state, onPower, compact = false }: GroupControlProps) {
  return (
    <section className={`group-control ${compact ? 'group-control-compact' : ''}`}>
      <div className="group-heading">
        <h2>{name}</h2>
        <span className={`group-state state-${state.toLowerCase()}`}>
          <span className="state-dot" />
          {state}
        </span>
      </div>
      <div className="group-actions">
        <button type="button" onClick={() => onPower(true)}>ON</button>
        <button type="button" onClick={() => onPower(false)}>OFF</button>
      </div>
    </section>
  )
}
