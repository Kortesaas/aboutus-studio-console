export type MediaIconName = 'play' | 'pause' | 'previous' | 'next' | 'shuffle' | 'repeat' | 'repeat-one' | 'volume' | 'volume-muted' | 'note' | 'speaker' | 'library' | 'folder' | 'chevron-left' | 'close'

interface MediaIconProps {
  name: MediaIconName
  className?: string
}

export function MediaIcon({ name, className = '' }: MediaIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {name === 'play' && <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />}
      {name === 'pause' && <path d="M7 5h3.2v14H7V5Zm6.8 0H17v14h-3.2V5Z" fill="currentColor" stroke="none" />}
      {name === 'previous' && <path d="M6 5v14M18 6l-9 6 9 6V6Z" fill="currentColor" stroke="none" />}
      {name === 'next' && <path d="M18 5v14M6 6l9 6-9 6V6Z" fill="currentColor" stroke="none" />}
      {name === 'shuffle' && (
        <path d="M4 7h3.5L15 17h5M4 17h3.5L10 13M16 7h4m0 0-2.5-2.5M20 7l-2.5 2.5M20 17l-2.5-2.5M20 17l-2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'repeat' && (
        <path d="M6 7h11a3 3 0 0 1 3 3v2M18 17H7a3 3 0 0 1-3-3v-2M9 4 6 7l3 3M15 20l3-3-3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'repeat-one' && (
        <path d="M6 7h11a3 3 0 0 1 3 3v2M18 17H7a3 3 0 0 1-3-3v-2M9 4 6 7l3 3M15 20l3-3-3-3M12 9.5v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'volume' && (
        <path d="M4 10v4h4l5 4V6l-5 4H4Zm12.5-1.5a5 5 0 0 1 0 7M18.8 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'volume-muted' && (
        <path d="M4 10v4h4l5 4V6l-5 4H4Zm12 0 5 4m0-4-5 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'note' && (
        <path d="M9 18a3 3 0 1 1-2-2.8V5.5l10-2v10a3 3 0 1 1-2-2.8V6l-6 1.2v10.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'speaker' && (
        <path d="M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm5 3v.01M9 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'library' && (
        <path d="M4 5h6v15H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm16 0h-6v15h6a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Zm-9 0h4v15h-4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'folder' && (
        <path d="M4 7a1 1 0 0 1 1-1h4.5l1.6 1.8H19a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'chevron-left' && (
        <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'close' && (
        <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}
