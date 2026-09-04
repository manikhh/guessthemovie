/** Shared icon bindings — MorphIcon (lucide data) + lucide-react statics. */
import type { ReactElement } from 'react'
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

/** Rank ladder: 1 Diamond > 2 Gold > 3 Silver > 4 Bronze > 5 Iron. */
export type TierRank = 1 | 2 | 3 | 4 | 5

type EmblemProps = {
  /** Gradient paint for the emblem body. */
  fill: string
  /** Top-left gloss sweep, strength already scaled per tier. */
  gloss: string
  /** Engraving/detail colour for the tier. */
  engrave: string
}

type TierDef = {
  name: string
  /** light -> mid -> deep -> shadow */
  stops: [string, string, string, string]
  engrave: string
  /** Gloss + rim strength, descending down the ladder. */
  sheen: number
  Emblem: (props: EmblemProps) => ReactElement
}

/** #1 Diamond — faceted crystal, sharp geometry, sparkles. */
function DiamondEmblem({ fill, gloss, engrave }: EmblemProps) {
  return (
    <>
      <path d="M7.1 2.6h9.8l4.6 6.4L12 22.4 2.5 9 7.1 2.6Z" fill={fill} />
      <path d="M7.1 2.6h9.8l4.6 6.4L12 22.4 2.5 9 7.1 2.6Z" fill={gloss} />
      <path
        d="M2.5 9h19M7.1 2.6 9.6 9 12 22.4 14.4 9l2.5-6.4M9.6 9h4.8"
        fill="none"
        stroke={engrave}
        strokeOpacity="0.3"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path d="M7.1 2.6 4.8 9h4.8L7.1 2.6Z" fill="#fff" fillOpacity="0.32" />
      <path d="M20.6 1.4l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6Z" fill="#fff" fillOpacity="0.85" />
      <path d="M2.4 3.4l.45 1 1 .45-1 .45-.45 1-.45-1-1-.45 1-.45.45-1Z" fill="#fff" fillOpacity="0.6" />
    </>
  )
}

/** #2 Gold — winged crest shield with a crowned star. */
function GoldEmblem({ fill, gloss, engrave }: EmblemProps) {
  return (
    <>
      <path d="M0.8 7.4 5.2 6.1l.6 4.3-5-3Z" fill={fill} fillOpacity="0.85" />
      <path d="M23.2 7.4 18.8 6.1l-.6 4.3 5-3Z" fill={fill} fillOpacity="0.85" />
      <path d="M12 1.6 20.4 4.6v7.1c0 4.7-3.4 8.2-8.4 10.1-5-1.9-8.4-5.4-8.4-10.1V4.6L12 1.6Z" fill={fill} />
      <path d="M12 1.6 20.4 4.6v7.1c0 4.7-3.4 8.2-8.4 10.1-5-1.9-8.4-5.4-8.4-10.1V4.6L12 1.6Z" fill={gloss} />
      <path
        d="M12 3.5 18.6 5.9v5.7c0 3.8-2.7 6.7-6.6 8.3-3.9-1.6-6.6-4.5-6.6-8.3V5.9L12 3.5Z"
        fill="none"
        stroke={engrave}
        strokeOpacity="0.35"
        strokeWidth="0.9"
      />
      <path d="M12 6.4l1.5 3.1 3.4.5-2.45 2.4.58 3.38L12 14.2l-3.03 1.58.58-3.38L7.1 10l3.4-.5L12 6.4Z" fill={engrave} fillOpacity="0.5" />
      <path d="M12 6.4l1.5 3.1 3.4.5-2.45 2.4.58 3.38L12 14.2V6.4Z" fill="#fff" fillOpacity="0.22" />
      <path d="M6.6 17.1 12 19.6l5.4-2.5" fill="none" stroke={engrave} strokeOpacity="0.28" strokeWidth="0.9" strokeLinecap="round" />
    </>
  )
}

/** #3 Silver — beveled hex plate with a single sharp chevron. */
function SilverEmblem({ fill, gloss, engrave }: EmblemProps) {
  return (
    <>
      <path d="M12 1.8 20.9 6.9v10.2L12 22.2 3.1 17.1V6.9L12 1.8Z" fill={fill} />
      <path d="M12 1.8 20.9 6.9v10.2L12 22.2 3.1 17.1V6.9L12 1.8Z" fill={gloss} />
      <path
        d="M12 3.9 19.1 8v8L12 20.1 4.9 16V8L12 3.9Z"
        fill="none"
        stroke={engrave}
        strokeOpacity="0.32"
        strokeWidth="0.85"
      />
      <path d="M6.9 14.4 12 8.4l5.1 6" fill="none" stroke={engrave} strokeOpacity="0.6" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.9 14.4 12 8.4l5.1 6" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.4 17.6h5.2" stroke={engrave} strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" />
    </>
  )
}

/** #4 Bronze — plain kite shield with a flat bar, matte finish. */
function BronzeEmblem({ fill, gloss, engrave }: EmblemProps) {
  return (
    <>
      <path d="M4.4 4.2h15.2v7.1c0 4.4-3.2 7.6-7.6 10.5-4.4-2.9-7.6-6.1-7.6-10.5V4.2Z" fill={fill} />
      <path d="M4.4 4.2h15.2v7.1c0 4.4-3.2 7.6-7.6 10.5-4.4-2.9-7.6-6.1-7.6-10.5V4.2Z" fill={gloss} />
      <path
        d="M6.4 6.2h11.2v5.1c0 3.4-2.4 6-5.6 8.3-3.2-2.3-5.6-4.9-5.6-8.3V6.2Z"
        fill="none"
        stroke={engrave}
        strokeOpacity="0.3"
        strokeWidth="0.85"
      />
      <path d="M8.4 10.6h7.2" stroke={engrave} strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9.6 14.4h4.8" stroke={engrave} strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
    </>
  )
}

/** #5 Iron — heavy forged plate with clipped corners and rivets. */
function IronEmblem({ fill, gloss, engrave }: EmblemProps) {
  return (
    <>
      <path d="M6.6 3.6h10.8l3 3v10.8l-3 3H6.6l-3-3V6.6l3-3Z" fill={fill} />
      <path d="M6.6 3.6h10.8l3 3v10.8l-3 3H6.6l-3-3V6.6l3-3Z" fill={gloss} />
      <path
        d="M7.4 5.6h9.2l2 2v8.8l-2 2H7.4l-2-2V7.6l2-2Z"
        fill="none"
        stroke={engrave}
        strokeOpacity="0.45"
        strokeWidth="0.85"
      />
      <path d="M8.2 12h7.6" stroke={engrave} strokeOpacity="0.6" strokeWidth="2.4" strokeLinecap="square" />
      <circle cx="7.2" cy="7.2" r="0.85" fill={engrave} fillOpacity="0.55" />
      <circle cx="16.8" cy="7.2" r="0.85" fill={engrave} fillOpacity="0.55" />
      <circle cx="7.2" cy="16.8" r="0.85" fill={engrave} fillOpacity="0.55" />
      <circle cx="16.8" cy="16.8" r="0.85" fill={engrave} fillOpacity="0.55" />
    </>
  )
}

/** Single source of truth for the rank ladder. */
export const RANK_TIERS: Record<TierRank, TierDef> = {
  1: {
    name: 'Diamond',
    stops: ['#f4fdff', '#a9e9ff', '#4fb6e8', '#1a6795'],
    engrave: '#0d3b58',
    sheen: 0.62,
    Emblem: DiamondEmblem,
  },
  2: {
    name: 'Gold',
    stops: ['#fff4c6', '#f6cf5e', '#c98f18', '#7d5208'],
    engrave: '#4a2e04',
    sheen: 0.48,
    Emblem: GoldEmblem,
  },
  3: {
    name: 'Silver',
    stops: ['#fbfdff', '#dbe2ea', '#9aa6b4', '#5d6875'],
    engrave: '#333c47',
    sheen: 0.36,
    Emblem: SilverEmblem,
  },
  4: {
    name: 'Bronze',
    stops: ['#eec096', '#c9803c', '#94551d', '#59300b'],
    engrave: '#381e06',
    sheen: 0.24,
    Emblem: BronzeEmblem,
  },
  5: {
    name: 'Iron',
    stops: ['#8f979e', '#6b737a', '#474e54', '#282d31'],
    engrave: '#15181a',
    sheen: 0.12,
    Emblem: IronEmblem,
  },
}

/** Rank emblem for the top five places. */
export function RankTierIcon({ rank, className }: { rank: TierRank; className?: string }) {
  const tier = RANK_TIERS[rank]
  const id = `rank-tier-${rank}`
  const { Emblem } = tier

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="26"
      height="26"
      role="img"
      aria-label={`Rank ${rank} — ${tier.name}`}
    >
      <defs>
        <linearGradient id={id} x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={tier.stops[0]} />
          <stop offset="34%" stopColor={tier.stops[1]} />
          <stop offset="70%" stopColor={tier.stops[2]} />
          <stop offset="100%" stopColor={tier.stops[3]} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="6" y1="2" x2="15" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity={tier.sheen} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Emblem fill={`url(#${id})`} gloss={`url(#${id}-gloss)`} engrave={tier.engrave} />
    </svg>
  )
}
