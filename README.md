# aboutus-studio-console

A fullscreen React touchscreen dashboard for studio controls, weather, and system status. The canonical layout target is 1280×720, with responsive desktop, tablet, and phone support.

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
