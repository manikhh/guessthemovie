import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Difficulty } from '../types'
import { DIFFICULTY_HINTS, DIFFICULTY_LABELS, getPoolSize } from '../lib/difficulty'
import { loadBest } from '../lib/game'

const MODES: Difficulty[] = ['easy', 'medium', 'hard']

export function ModeSelect() {
  const navigate = useNavigate()

  return (
    <div className="menu">
      <p className="menu-kicker">Select difficulty</p>

      <div className="menu-grid">
        {MODES.map((mode, i) => {
          const count = getPoolSize(mode)
          const best = loadBest(mode)

          return (
            <motion.button
              key={mode}
              type="button"
              className="menu-row"
              onClick={() => navigate(`/play/${mode}`)}
              disabled={count === 0}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: i * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span className="menu-row-copy">
                <span className="menu-row-title">{DIFFICULTY_LABELS[mode]}</span>
                <span className="menu-row-hint">{DIFFICULTY_HINTS[mode]}</span>
              </span>
              <span className="menu-row-meta">
                <span>{count} films</span>
                {best > 0 && <span className="menu-row-best">Best {best}</span>}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
