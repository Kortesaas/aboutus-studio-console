# aboutus-studio-console

A fullscreen React touchscreen dashboard for studio controls, weather, and system status. The canonical layout target is 1280×720, with responsive desktop, tablet, and phone support.

## Docker stack

Docker Desktop must be installed and running. Start the complete dashboard and Home Assistant stack with:

```bash
docker compose up -d
```

Use the build form on the first start and after dashboard changes:

```bash
docker compose up -d --build
```

Open these URLs from the host or another device on the same LAN:

- Dashboard: `http://<WINDOWS-LAN-IP>:8080`
- Home Assistant: `http://<WINDOWS-LAN-IP>:8123`

On a fresh Home Assistant volume:

1. Open Home Assistant on port 8123 and complete its normal onboarding.
2. Create the Home Assistant admin account interactively.
3. Optionally create a dedicated dashboard user with the minimum practical privileges.
4. From that user's Home Assistant profile, create a Long-Lived Access Token.
5. Open the dashboard on port 8080 and leave its Home Assistant URL as `/ha-websocket`.
6. Paste the token into the dashboard runtime setup; it stays in that browser's local storage.
7. Assign the discovered entities using the dashboard's runtime device mapper.

Useful commands:

```bash
docker compose logs -f
docker compose down
docker compose pull
docker compose up -d --build
```

`docker compose down` removes the containers and network but preserves Home Assistant configuration in the named volume. **`docker compose down -v` deletes that volume and all Home Assistant configuration.**

Windows Firewall may need private-LAN inbound rules for TCP ports 8080 and 8123. Do not expose either port directly to the public internet. See [DEVICE_SETUP.md](DEVICE_SETUP.md) for fixture-specific setup.

## Settings access

The dashboard always opens directly to Weather, Studio, and System, even when Home Assistant configuration is missing, offline, invalid, or incomplete. Configuration problems appear as connection and device status; they never block navigation.

- Touchscreen: press and hold the HA/backend status indicator for approximately 1.5 seconds.
- Desktop: press `Ctrl + ,`.

Settings can change the HA endpoint/token, all six device labels/mappings/room assignments/enabled states, and group labels. It also provides confirmed local reset actions and non-secret diagnostics. Disabled device slots remain editable in Settings but are hidden from the normal Studio grids.

## Development

```bash
npm install
npm run dev
```

The Vite development server listens on `0.0.0.0:5173`. Devices on the same LAN can open `http://<dashboard-pc-ip>:5173`. The dashboard computer's operating-system firewall may need to allow Node.js or inbound TCP traffic on port 5173.

Create a production build with:

```bash
npm run build
```

## Public repository and secrets

This repository is public. Never commit API keys, tokens, passwords, credentials, or private URLs containing credentials.

Local configuration belongs in ignored files such as `.env.local`. If configuration examples are needed, add placeholders only to `.env.example`; never add real values. Variables prefixed with `VITE_` are embedded in client code and are visible to anyone using the dashboard, so they must not contain secrets.

## Home Assistant setup

1. Make sure Home Assistant is running and reachable from the dashboard device.
2. Create a dedicated Home Assistant user for the dashboard if practical.
3. Create a Long-Lived Access Token for that user.
4. Open the dashboard and enter the token in the connection overlay. Use `/ha-websocket` with the Docker stack; direct `http://` and `https://` Home Assistant URLs remain supported.
5. In the device-mapping step, assign each of the six Studio slots to one of the discovered `light.*` or `switch.*` entities and choose **Save & apply**.

The app authenticates through Home Assistant's WebSocket API. The token is saved only in this browser's `localStorage`; it is not stored in source control or a Vite environment variable. Clearing browser storage removes the saved connection. Because frontend credentials remain accessible on the local dashboard device, use the minimum Home Assistant privileges practical and keep physical/browser access to that device appropriately restricted.

Entity mappings are stored locally in the browser and are never written into source files, so source editing is no longer required. Saved mappings are checked against the current HA state list after every connection; missing entities stay unconfigured and are never silently replaced. Tap the HA status area and choose **Device mapping** to reopen the mapper. The same panel can clear only the connection or clear both the connection and mappings.

The status area shows the live Home Assistant connection state. The dashboard marks a group unavailable when any member is unconfigured, `unavailable`, `unknown`, or based on stale data after a disconnect. Otherwise, groups resolve deterministically to `ON`, `OFF`, or `MIXED`.

For UI-only development without Home Assistant, change `SMART_HOME_MODE` in [`src/config/smartHomeRuntime.ts`](src/config/smartHomeRuntime.ts) from `home-assistant` to `mock`. Mock mode is explicit and is never used as an authentication fallback.
