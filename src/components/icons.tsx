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

export type GemRank = 1 | 2 | 3 | 4 | 5

const GEM_CROWNS: Record<
  GemRank,
  {
    label: string
    stops: [string, string, string, string]
    tip: string
    side: string
    band: string
    numeral: string
  }
> = {
  1: {
    label: 'Diamond',
    stops: ['#f7fbff', '#c9d9ea', '#7a93b0', '#4a6078'],
    tip: '#f7fbff',
    side: '#c9d9ea',
    band: '#eef5fc',
    numeral: '#243040',
  },
  2: {
    label: 'Ruby',
    stops: ['#ffd0d8', '#e0455f', '#b01832', '#6e0c1c'],
    tip: '#ffd0d8',
    side: '#e0455f',
    band: '#ffc4ce',
    numeral: '#3a0a12',
  },
  3: {
    label: 'Sapphire',
    stops: ['#c8ddff', '#3d6fd4', '#1e4aa8', '#122f6e'],
    tip: '#c8ddff',
    side: '#3d6fd4',
    band: '#b8d0ff',
    numeral: '#0c1c3a',
  },
  4: {
    label: 'Emerald',
    stops: ['#c8f0d8', '#2db86a', '#168a48', '#0c5a30'],
    tip: '#c8f0d8',
    side: '#2db86a',
    band: '#b8ebd0',
    numeral: '#0a2e18',
  },
  5: {
    label: 'Amethyst',
    stops: ['#e4d4ff', '#8b5cf6', '#6d3fc7', '#3f2480'],
    tip: '#e4d4ff',
    side: '#8b5cf6',
    band: '#dcc8ff',
    numeral: '#1e1040',
  },
}

export function RankGemCrown({ rank, className }: { rank: GemRank; className?: string }) {
  const gem = GEM_CROWNS[rank]
  const gid = `crown-gem-${rank}`
  const sid = `crown-shine-${rank}`

  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width="28"
      height="28"
      role="img"
      aria-label={`Rank ${rank} — ${gem.label}`}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gem.stops[0]} />
          <stop offset="38%" stopColor={gem.stops[1]} />
          <stop offset="72%" stopColor={gem.stops[2]} />
          <stop offset="100%" stopColor={gem.stops[3]} />
        </linearGradient>
        <linearGradient id={sid} x1="10" y1="6" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M6.4 21.2 4.8 9.6l6.2 4.4L16 5.2l5 8.8 6.2-4.4-1.6 11.6z"
        fill={`url(#${gid})`}
      />
      <path
        d="M6.4 21.2 4.8 9.6l6.2 4.4L16 5.2l5 8.8 6.2-4.4-1.6 11.6z"
        fill={`url(#${sid})`}
      />
      {/* Facet lines for a gem cut feel */}
      <path
        d="M16 5.2 11 14l5 7.2 5-7.2z"
        fill="#fff"
        opacity="0.12"
      />
      <path d="M4.8 9.6 11 14l-4.6 7.2z" fill="#000" opacity="0.08" />
      <path d="M27.2 9.6 21 14l4.6 7.2z" fill="#000" opacity="0.08" />
      <rect x="6.2" y="21" width="19.6" height="5.4" rx="1.2" fill={`url(#${gid})`} />
      <rect x="7.4" y="22.1" width="17.2" height="1.1" rx="0.55" fill={gem.band} opacity="0.4" />
      <circle cx="16" cy="5.1" r="1.35" fill={gem.tip} />
      <circle cx="4.8" cy="9.5" r="1.15" fill={gem.side} />
      <circle cx="27.2" cy="9.5" r="1.15" fill={gem.side} />
      <text
        x="16"
        y="19.2"
        textAnchor="middle"
        fill={gem.numeral}
        fontSize="10"
        fontWeight="700"
        fontFamily="Space Grotesk, DM Sans, system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  )
}
