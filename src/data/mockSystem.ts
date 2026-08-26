export const mockSystem = {
  nas: {
    name: 'Studio NAS',
    online: true,
    storageUsedTb: 12.8,
    storageTotalTb: 24,
    cpuPercent: 18,
    ramPercent: 42,
    temperatureCelsius: 39,
    uptime: '24d 8h',
  },
  network: {
    online: true,
    downloadMbps: 842,
    uploadMbps: 48,
    pingMs: 12,
  },
} as const
