import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CLIP_DURATIONS, formatDuration } from '../lib/game'

interface WinCelebrationProps {
  points: number
  clipLevel: number
  onDone?: () => void
}

const COLORS = ['#fff8f7', '#ebe4e4', '#a39898', '#6e6565', '#c41e26', '#4a9e5c', '#d4a843']

function makePieces(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.2
    const dist = 40 + (i % 7) * 18
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.55 - 20 - (i % 5) * 12,
      rotate: (i * 47) % 360,
      driftX: (i % 2 === 0 ? 1 : -1) * (30 + (i % 9) * 14),
      driftY: 80 + (i % 11) * 28,
      size: 6 + (i % 4) * 2,
      color: COLORS[i % COLORS.length]!,
      delay: (i % 8) * 0.02,
      radius: i % 3 === 0 ? '1px' : '999px',
    }
  })
}

export function WinCelebration({ points, clipLevel, onDone }: WinCelebrationProps) {
  const pieces = useMemo(() => makePieces(48), [])

  useEffect(() => {
    const t = window.setTimeout(() => onDone?.(), 2400)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      className="win-celebration"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="win-confetti" aria-hidden>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="win-confetti-piece"
            style={{
              width: p.size,
              height: p.size * (p.radius === '1px' ? 1.6 : 1),
              background: p.color,
              borderRadius: p.radius,
            }}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: [p.x * 0.2, p.x + p.driftX * 0.35, p.x + p.driftX],
              y: [p.y * 0.1, p.y, p.y + p.driftY],
              rotate: [0, p.rotate, p.rotate + 180],
              scale: [0.4, 1, 0.85],
            }}
            transition={{
              duration: 1.8,
              delay: p.delay,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </div>

      <motion.div
        className="win-prize"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="win-label">[Correct]</p>
        <p className="win-points">
          <span className="win-points-num">{points > 0 ? `+${points}` : points}</span>
        </p>
        <p className="win-points-sub">points</p>
        <p className="win-clip-note">from {formatDuration(CLIP_DURATIONS[clipLevel]!)} clip</p>
      </motion.div>
    </motion.div>
  )
}
