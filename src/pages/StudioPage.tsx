import { useEffect, useMemo, useState } from 'react'
import { DeviceTile } from '../components/DeviceTile'
import { GroupControl, type GroupState } from '../components/GroupControl'
import { useSmartHome } from '../context/SmartHomeProvider'
import { ROOM_IDS, type Device, type RoomId } from '../services/smartHome'

function deriveGroupState(devices: Device[]): GroupState {
  if (
    devices.length === 0 ||
    devices.some((device) =>
      device.isStale ||
      device.state === 'unavailable' ||
      device.state === 'unknown' ||
      device.state === 'unconfigured'
    )
  ) return 'UNAVAILABLE'
  if (devices.every((device) => device.state === 'on')) return 'ON'
  if (devices.every((device) => device.state === 'off')) return 'OFF'
  return 'MIXED'
}

export function StudioPage() {
  const { service, status, dashboardConfig } = useSmartHome()
  const [devices, setDevices] = useState<Device[]>([])
  const [pendingGroups, setPendingGroups] = useState<Set<string>>(() => new Set())
  const controlsDisabled = status !== 'connected'

  useEffect(() => {
    let active = true
    setDevices([])
    void service.getDevices().then((next) => active && setDevices(next))
    const unsubscribe = service.subscribe(setDevices)
    return () => {
      active = false
      unsubscribe()
    }
  }, [service])

  const enabledDevices = useMemo(
    () => devices.flatMap((device) => {
      const config = dashboardConfig.devices[device.id]
      if (!config?.enabled) return []
      return [{ ...device, name: config.displayName, roomId: config.roomId }]
    }),
    [dashboardConfig, devices],
  )

  const devicesForRoom = (roomId: RoomId) =>
    enabledDevices.filter((device) => device.roomId === roomId)

  const toggleGroup = async (groupId: string, groupDevices: Device[]) => {
    const state = deriveGroupState(groupDevices)
    if (controlsDisabled || state === 'UNAVAILABLE' || pendingGroups.has(groupId)) return
    const turnOn = state !== 'ON'
    const targets = groupDevices.filter(
      (device): device is Device & { entityId: string } =>
        Boolean(device.entityId) && device.state !== (turnOn ? 'on' : 'off'),
    )
    if (targets.length === 0) return
    setPendingGroups((current) => new Set(current).add(groupId))
    try {
      await Promise.allSettled(targets.map((device) =>
        turnOn ? service.turnOn(device.entityId) : service.turnOff(device.entityId),
      ))
    } finally {
      setPendingGroups((current) => {
        const next = new Set(current)
        next.delete(groupId)
        return next
      })
    }
  }

  const toggleDevice = (device: Device) => {
    if (
      controlsDisabled || device.isPending || !device.entityId || device.isStale ||
      !['on', 'off'].includes(device.state)
    ) return
    const command = device.state === 'on'
      ? service.turnOff(device.entityId)
      : service.turnOn(device.entityId)
    void command.catch(() => {})
  }

  const devicesByRoom = Object.fromEntries(ROOM_IDS.map((roomId) => [roomId, devicesForRoom(roomId)])) as Record<RoomId, Device[]>

  return (
    <main className="screen-frame" aria-label="Studio controls">
      <div className="screen-main studio-layout">
        <section className="studio-rooms" aria-label="Rooms">
          <div className="ds-section-label-row">
            <span className="label">Rooms</span>
            <span className="rule" aria-hidden="true" />
          </div>
          <div className="studio-rooms-grid">
            {ROOM_IDS.map((roomId) => (
              <GroupControl
                key={roomId}
                name={dashboardConfig.groupLabels[roomId]}
                state={deriveGroupState(devicesByRoom[roomId])}
                count={devicesByRoom[roomId].length}
                pending={pendingGroups.has(roomId)}
                disabled={controlsDisabled}
                variant="room"
                onToggle={() => void toggleGroup(roomId, devicesByRoom[roomId])}
              />
            ))}
            <GroupControl
              name={dashboardConfig.groupLabels.everything}
              state={deriveGroupState(enabledDevices)}
              count={enabledDevices.length}
              pending={pendingGroups.has('everything')}
              disabled={controlsDisabled}
              variant="room"
              onToggle={() => void toggleGroup('everything', enabledDevices)}
            />
          </div>
        </section>

        {ROOM_IDS.map((roomId) => {
          const roomDevices = devicesByRoom[roomId]
          const customGroups = dashboardConfig.customGroups.filter((group) => group.roomId === roomId)
          if (roomDevices.length === 0 && customGroups.length === 0) return null
          const onCount = roomDevices.filter((device) => device.state === 'on').length
          return (
            <section className="studio-room-section" key={roomId} aria-label={dashboardConfig.groupLabels[roomId]}>
              <div className="ds-section-label-row">
                <span className="label">{dashboardConfig.groupLabels[roomId]}</span>
                <span className="rule" aria-hidden="true" />
                <span className="meta">{onCount} of {roomDevices.length} on</span>
              </div>
              <div className="studio-fixture-grid">
                {customGroups.map((group) => {
                  const members = roomDevices.filter((device) => group.deviceIds.includes(device.id))
                  return (
                    <GroupControl
                      key={group.id}
                      name={group.name}
                      state={deriveGroupState(members)}
                      count={members.length}
                      pending={pendingGroups.has(group.id)}
                      disabled={controlsDisabled}
                      variant="group"
                      onToggle={() => void toggleGroup(group.id, members)}
                    />
                  )
                })}
                {roomDevices.map((device) => (
                  <DeviceTile key={device.id} device={device} disabled={controlsDisabled} onToggle={toggleDevice} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
