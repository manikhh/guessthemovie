import type { Difficulty } from '../types'
import { DIFFICULTY_HINTS, DIFFICULTY_LABELS, getClipsForDifficulty } from '../lib/difficulty'
import { loadBest } from '../lib/game'

interface ModeSelectProps {
  onSelect: (difficulty: Difficulty) => void
}

const MODES: Difficulty[] = ['easy', 'medium', 'hard']

export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="menu">
      <p className="menu-intro">
        Step into the factory. A trailer flashes for a fifth of a second. Name the film. Need
        longer? Take it — but every extra second costs you points.
      </p>

      <div className="menu-grid">
        {MODES.map((mode) => {
          const count = getClipsForDifficulty(mode).length
          const best = loadBest(mode)

          return (
            <button
              key={mode}
              type="button"
              className={`menu-card menu-card-${mode}`}
              onClick={() => onSelect(mode)}
              disabled={count === 0}
            >
              <span className="menu-card-head">
                <span className="menu-card-title">{DIFFICULTY_LABELS[mode]}</span>
                <span className="menu-card-count">{count} films</span>
              </span>
              <span className="menu-card-hint">{DIFFICULTY_HINTS[mode]}</span>
              {best > 0 && <span className="menu-card-best">Best score {best}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
