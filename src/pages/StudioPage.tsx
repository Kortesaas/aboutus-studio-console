import { useEffect, useMemo, useState } from 'react'
import { DeviceTile } from '../components/DeviceTile'
import { GroupControl, type GroupState } from '../components/GroupControl'
import { StatusBar } from '../components/StatusBar'
import { useSmartHome } from '../context/SmartHomeProvider'
import type { Device } from '../services/smartHome'

function deriveGroupState(devices: Device[]): GroupState {
  if (
    devices.length === 0 ||
    devices.some((device) =>
      device.isStale ||
      device.state === 'unavailable' ||
      device.state === 'unknown' ||
      device.state === 'unconfigured'
    )
  ) {
    return 'UNAVAILABLE'
  }
  if (devices.every((device) => device.state === 'on')) return 'ON'
  if (devices.every((device) => device.state === 'off')) return 'OFF'
  return 'MIXED'
}

export function StudioPage() {
  const { service, status, dashboardConfig } = useSmartHome()
  const [devices, setDevices] = useState<Device[]>([])
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

  const devicesForRoom = (roomId: 'studio1' | 'studio2') =>
    enabledDevices.filter((device) => device.roomId === roomId)

  const setGroupPower = async (deviceIds: readonly string[], isOn: boolean) => {
    const requestedIds = new Set(deviceIds)
    const groupDevices = enabledDevices.filter(
      (device) => requestedIds.has(device.id),
    ).filter(
      (device): device is Device & { entityId: string } => device.entityId !== null,
    )
    await Promise.allSettled(
      groupDevices.map((device) =>
        isOn ? service.turnOn(device.entityId) : service.turnOff(device.entityId),
      ),
    )
  }

  const toggleDevice = (device: Device) => {
    if (
      controlsDisabled ||
      !device.entityId ||
      device.isStale ||
      !['on', 'off'].includes(device.state)
    ) return
    const command = device.state === 'on'
      ? service.turnOff(device.entityId)
      : service.turnOn(device.entityId)
    void command.catch(() => {})
  }

  const studio1Devices = devicesForRoom('studio1')
  const studio2Devices = devicesForRoom('studio2')

  return (
    <main className="screen-frame" aria-label="Studio controls">
      <StatusBar pageName="Studio" />
      <div className="screen-main">
        <div className="studio-groups">
          <GroupControl
            name={dashboardConfig.groupLabels.studio1}
            state={deriveGroupState(studio1Devices)}
            disabled={controlsDisabled || studio1Devices.length === 0}
            onPower={(isOn) => void setGroupPower(studio1Devices.map((device) => device.id), isOn)}
          />
          <GroupControl
            name={dashboardConfig.groupLabels.studio2}
            state={deriveGroupState(studio2Devices)}
            disabled={controlsDisabled || studio2Devices.length === 0}
            onPower={(isOn) => void setGroupPower(studio2Devices.map((device) => device.id), isOn)}
          />
          <GroupControl
            name={dashboardConfig.groupLabels.everything}
            state={deriveGroupState(enabledDevices)}
            disabled={controlsDisabled || enabledDevices.length === 0}
            onPower={(isOn) => void setGroupPower(enabledDevices.map((device) => device.id), isOn)}
            compact
          />
        </div>

        {(['studio1', 'studio2'] as const).map((roomId) => {
          const groupDevices = roomId === 'studio1' ? studio1Devices : studio2Devices
          const onCount = groupDevices.filter((device) => device.state === 'on').length
          return (
            <section className="studio-room" key={roomId} aria-label={dashboardConfig.groupLabels[roomId]}>
              <div className="ds-section-label-row">
                <span className="label">{dashboardConfig.groupLabels[roomId]}</span>
                <span className="rule" aria-hidden="true" />
                <span className="meta">{onCount} of {groupDevices.length} on</span>
              </div>
              <div className="studio-room-devices">
                {groupDevices.map((device) => (
                  <DeviceTile
                    key={device.id}
                    device={device}
                    disabled={controlsDisabled}
                    onToggle={toggleDevice}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
