import { useEffect } from 'react'
import { CLIP_DURATIONS, formatDuration } from '../lib/game'
import { StarBurstIcon, TrophyIcon } from './icons'

interface WinCelebrationProps {
  points: number
  clipLevel: number
  onDone?: () => void
}

const CHOCOLATE = ['#eceae6', '#c8c4bc', '#8a8a92', '#5c5c64', '#f7f6f3', '#6e6b66']

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  delay: `${(i % 7) * 0.04}s`,
  color: CHOCOLATE[i % CHOCOLATE.length],
  size: 6 + (i % 4) * 3,
}))

export function WinCelebration({ points, clipLevel, onDone }: WinCelebrationProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone?.(), 2800)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <div className="win-celebration" role="status" aria-live="polite">
      <div className="win-burst" aria-hidden />
      <div className="win-rays" aria-hidden />

      <div className="win-confetti" aria-hidden>
        {CONFETTI.map((c) => (
          <span
            key={c.id}
            className="win-confetti-piece"
            style={{
              left: c.left,
              animationDelay: c.delay,
              width: c.size,
              height: c.size * 1.4,
              background: c.color,
            }}
          />
        ))}
      </div>

      <div className="win-prize">
        <div className="win-trophy-wrap" aria-hidden>
          <StarBurstIcon className="win-star-burst" />
          <TrophyIcon className="win-trophy" />
        </div>
        <p className="win-label">Correct!</p>
        <p className="win-points">
          <span className="win-points-plus">+</span>
          <span className="win-points-num">{points}</span>
        </p>
        <p className="win-points-sub">points</p>
        <p className="win-clip-note">
          from {formatDuration(CLIP_DURATIONS[clipLevel]!)} clip
        </p>
      </div>
    </div>
  )
}
