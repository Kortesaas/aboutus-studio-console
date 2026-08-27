# Studio fixture setup

Complete Home Assistant's first-run onboarding before adding fixtures. After an entity appears in Home Assistant, open dashboard Settings by holding the HA status indicator for approximately 1.5 seconds or pressing `Ctrl + ,`. In **Devices**, assign the entity and choose **Save devices & groups**.

## Tapo L920-5 RGBIC LED Strip

1. Provision the strip in the Tapo app on the studio's 2.4 GHz Wi-Fi.
2. Optionally reserve its IP address in the router so manual connections remain stable.
3. In Home Assistant, go to **Settings → Devices & services → Add Integration**.
4. Choose **TP-Link Smart Home** / **Tapo**.
5. If discovery fails, enter the strip's IP address or hostname manually.
6. Authenticate with the TP-Link account when Home Assistant requests it.
7. Verify that an ON/OFF-capable `light.*` entity appears and works in Home Assistant.
8. Map that entity to **LED Strip** in the dashboard.

The dashboard uses only ON/OFF control; RGB and brightness are intentionally out of scope.

## Tapo S110E Relay

1. Provision the relay and configure its wiring/work mode in the Tapo app first.
2. Try the current **TP-Link Smart Home** / **Tapo** Home Assistant integration to see whether the device is exposed. Native integration support is not guaranteed.
3. If it is not supported, use **Matter** as the next integration path. The S110E is Matter-certified.
4. This stack does not install a Matter server or Matter container; set that up separately if required.
5. Once Home Assistant has an ON/OFF-capable `switch.*` or `light.*` entity, map it to **Relay** in the dashboard.

## Antela 16A Wi-Fi Smart Plugs (Tuya/Smart Life)

1. Make sure each plug is already present and working in **Smart Life** or **Tuya Smart**.
2. In Home Assistant, go to **Settings → Devices & services → Add Integration → Tuya**.
3. In the phone app, obtain the User Code from **Me → Settings/gear → Account and Security → User Code**.
4. Follow Home Assistant's QR/account authorization flow.
5. Verify that every plug exposes a working ON/OFF-capable `switch.*` entity.
6. Map the entities to **Socket 1**, **Socket 2**, and **Socket 3** as desired.

Energy data is not needed or promised by this dashboard.

Docker Desktop uses a bridged network, so multicast discovery can be less reliable than a native Home Assistant installation. Use manual IP/hostname entry where the integration supports it, and allow ports 8080 and 8123 through Windows Firewall only on the private LAN.
