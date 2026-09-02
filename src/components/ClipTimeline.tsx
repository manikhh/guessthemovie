import { CLIP_DURATIONS, formatDuration, MAX_LEVELS, scoreForLevel } from '../lib/game'

interface ClipTimelineProps {
  unlockedLevel: number
  activeLevel: number
  finished: boolean
  onPlayLevel: (level: number) => void
}

export function ClipTimeline({
  unlockedLevel,
  activeLevel,
  finished,
  onPlayLevel,
}: ClipTimelineProps) {
  const levels = Array.from({ length: MAX_LEVELS }, (_, i) => i)

  return (
    <ol className="timeline" aria-label="Clip lengths">
      {levels.map((level) => {
        const unlocked = level <= unlockedLevel
        const isActive = level === activeLevel && !finished

        return (
          <li key={level}>
            <button
              type="button"
              className={[
                'timeline-step',
                unlocked ? 'is-unlocked' : 'is-locked',
                isActive ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!unlocked}
              onClick={() => onPlayLevel(level)}
            >
              <span className="timeline-index">{level + 1}</span>
              <span className="timeline-time">{formatDuration(CLIP_DURATIONS[level]!)}</span>
              <span className="timeline-points">{scoreForLevel(level)} pts</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
