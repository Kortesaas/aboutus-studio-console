import { useEffect, useMemo, useState } from 'react'
import { DeviceTile } from '../components/DeviceTile'
import { GroupControl, type GroupState } from '../components/GroupControl'
import { StatusBar } from '../components/StatusBar'
import { allDeviceIds, deviceGroups } from '../data/devices'
import { smartHomeService } from '../services/MockSmartHomeService'
import type { Device } from '../services/smartHome'

function deriveGroupState(devices: Device[]): GroupState {
  if (devices.length === 0 || devices.every((device) => !device.isOn)) return 'OFF'
  if (devices.every((device) => device.isOn)) return 'ON'
  return 'MIXED'
}

export function StudioPage() {
  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    let active = true
    void smartHomeService.getDevices().then((next) => active && setDevices(next))
    const unsubscribe = smartHomeService.subscribe(setDevices)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const devicesById = useMemo(
    () => new Map(devices.map((device) => [device.entityId, device])),
    [devices],
  )

  const devicesFor = (entityIds: readonly string[]) =>
    entityIds.flatMap((entityId) => {
      const device = devicesById.get(entityId)
      return device ? [device] : []
    })

  const setGroupPower = async (entityIds: readonly string[], isOn: boolean) => {
    await Promise.all(
      entityIds.map((entityId) =>
        isOn ? smartHomeService.turnOn(entityId) : smartHomeService.turnOff(entityId),
      ),
    )
  }

  const toggleDevice = (device: Device) => {
    void (device.isOn
      ? smartHomeService.turnOff(device.entityId)
      : smartHomeService.turnOn(device.entityId))
  }

  const studio1Devices = devicesFor(deviceGroups.studio1.entityIds)
  const studio2Devices = devicesFor(deviceGroups.studio2.entityIds)

  return (
    <main className="dashboard-page studio-page" aria-label="Studio controls">
      <StatusBar pageName="Studio" />
      <div className="studio-toolbar">
        <div>
          <p className="eyebrow">Smart home</p>
          <h1>Studio controls</h1>
        </div>
        <GroupControl
          name="Everything"
          state={deriveGroupState(devices)}
          onPower={(isOn) => void setGroupPower(allDeviceIds, isOn)}
          compact
        />
      </div>
      <div className="rooms-grid">
        {([deviceGroups.studio1, deviceGroups.studio2] as const).map((group, groupIndex) => {
          const groupDevices = groupIndex === 0 ? studio1Devices : studio2Devices
          return (
            <section className="room-card" key={group.name}>
              <GroupControl
                name={group.name}
                state={deriveGroupState(groupDevices)}
                onPower={(isOn) => void setGroupPower(group.entityIds, isOn)}
              />
              <div className="device-grid">
                {groupDevices.map((device) => (
                  <DeviceTile key={device.entityId} device={device} onToggle={toggleDevice} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
