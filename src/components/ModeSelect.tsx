import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Difficulty } from '../types'
import { DIFFICULTY_HINTS, DIFFICULTY_LABELS, getPoolSize } from '../lib/difficulty'
import { fetchModesProgress, type ModeProgress } from '../lib/auth'
import { loadBest } from '../lib/game'
import { useAuth } from '../hooks/useAuth'

const MODES: Difficulty[] = ['easy', 'medium', 'hard']

export function ModeSelect() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [progress, setProgress] = useState<Partial<Record<Difficulty, ModeProgress>>>({})

  useEffect(() => {
    if (!user) {
      setProgress({})
      return
    }
    let cancelled = false
    void fetchModesProgress()
      .then((modes) => {
        if (cancelled) return
        const next: Partial<Record<Difficulty, ModeProgress>> = {}
        for (const mode of modes) next[mode.difficulty] = mode
        setProgress(next)
      })
      .catch(() => {
        if (!cancelled) setProgress({})
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="menu">
      <p className="menu-kicker">Select difficulty</p>

      <button type="button" className="ranked-play match-mode-btn" onClick={() => navigate('/match')}>
        <span className="ranked-play-kicker">Multiplayer</span>
        <span className="ranked-play-title">1v1 Movies</span>
        <span className="ranked-play-hint">10 clips · same round · live scoreboard</span>
      </button>

      <div className="menu-grid">
        {MODES.map((mode, i) => {
          const count = getPoolSize(mode)
          const best = loadBest(mode)
          const modeProgress = progress[mode]
          const completed = modeProgress?.completed === true
          const locked = count === 0 || completed

          return (
            <motion.button
              key={mode}
              type="button"
              className={`menu-row${completed ? ' is-cleared' : ''}`}
              onClick={() => navigate(`/play/${mode}`)}
              disabled={locked}
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
                <span className="menu-row-hint">
                  {completed ? 'Cleared — locked' : DIFFICULTY_HINTS[mode]}
                </span>
              </span>
              <span className="menu-row-meta">
                <span>
                  {completed
                    ? 'Cleared'
                    : modeProgress
                      ? `${modeProgress.watched}/${modeProgress.poolSize} films`
                      : `${count} films`}
                </span>
                {best > 0 && <span className="menu-row-best">Best {best}</span>}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
