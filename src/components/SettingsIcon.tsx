export type SettingsIconName = 'connection' | 'devices' | 'groups' | 'weather' | 'data'

interface SettingsIconProps {
  name: SettingsIconName
  className?: string
}

export function SettingsIcon({ name, className = '' }: SettingsIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {name === 'connection' && (
        <path d="M9 15 15 9M8 6l1.5-1.5a3 3 0 0 1 4.24 0l.26.26a3 3 0 0 1 0 4.24L12.5 10.5M16 18l-1.5 1.5a3 3 0 0 1-4.24 0l-.26-.26a3 3 0 0 1 0-4.24L11.5 13.5" />
      )}
      {name === 'devices' && (
        <path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" />
      )}
      {name === 'groups' && (
        <path d="m12 3 8 4.5-8 4.5-8-4.5Zm-8 8 8 4.5 8-4.5M4 15.5 12 20l8-4.5" />
      )}
      {name === 'weather' && (
        <path d="M17 18H8a4 4 0 0 1-.6-7.95 5 5 0 0 1 9.44-2A4.5 4.5 0 0 1 17 18Z" />
      )}
      {name === 'data' && (
        <path d="M4 6a8 3 0 0 0 16 0 8 3 0 0 0-16 0Zm0 0v12a8 3 0 0 0 16 0V6M4 12a8 3 0 0 0 16 0" />
      )}
    </svg>
  )
}
