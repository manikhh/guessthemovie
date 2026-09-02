import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CLIP_DURATIONS, formatDuration } from '../lib/game'

interface WinCelebrationProps {
  points: number
  clipLevel: number
  onDone?: () => void
}

export function WinCelebration({ points, clipLevel, onDone }: WinCelebrationProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone?.(), 2200)
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
      <motion.div
        className="win-prize"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="win-label">[Correct]</p>
        <p className="win-points">
          <span className="win-points-plus">+</span>
          <span className="win-points-num">{points}</span>
        </p>
        <p className="win-points-sub">points</p>
        <p className="win-clip-note">from {formatDuration(CLIP_DURATIONS[clipLevel]!)} clip</p>
      </motion.div>
    </motion.div>
  )
}
