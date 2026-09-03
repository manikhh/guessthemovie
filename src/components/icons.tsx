/** Shared icon bindings — MorphIcon (lucide data) + lucide-react statics. */
export { MorphIcon } from 'morphicons/react'
export { Play, Pause, Expand, Send } from 'lucide'
export {
  ChevronLeft,
  ExternalLink,
  SkipForward,
  RotateCcw,
  LoaderCircle,
  Volume2,
  VolumeX,
} from 'lucide-react'

export function RankOneCrown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width="28"
      height="28"
      role="img"
      aria-label="Rank 1"
    >
      <defs>
        <linearGradient id="crown-gold" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff4c8" />
          <stop offset="38%" stopColor="#f0c14a" />
          <stop offset="72%" stopColor="#c9891a" />
          <stop offset="100%" stopColor="#8a5a0a" />
        </linearGradient>
        <linearGradient id="crown-shine" x1="10" y1="6" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M6.4 21.2 4.8 9.6l6.2 4.4L16 5.2l5 8.8 6.2-4.4-1.6 11.6z"
        fill="url(#crown-gold)"
      />
      <path
        d="M6.4 21.2 4.8 9.6l6.2 4.4L16 5.2l5 8.8 6.2-4.4-1.6 11.6z"
        fill="url(#crown-shine)"
      />
      <rect x="6.2" y="21" width="19.6" height="5.4" rx="1.2" fill="url(#crown-gold)" />
      <rect x="7.4" y="22.1" width="17.2" height="1.1" rx="0.55" fill="#fff8dc" opacity="0.35" />
      <circle cx="16" cy="5.1" r="1.35" fill="#fff4c8" />
      <circle cx="4.8" cy="9.5" r="1.15" fill="#f0c14a" />
      <circle cx="27.2" cy="9.5" r="1.15" fill="#f0c14a" />
      <text
        x="16"
        y="19.2"
        textAnchor="middle"
        fill="#3a2408"
        fontSize="10"
        fontWeight="700"
        fontFamily="Space Grotesk, DM Sans, system-ui, sans-serif"
      >
        1
      </text>
    </svg>
  )
}
