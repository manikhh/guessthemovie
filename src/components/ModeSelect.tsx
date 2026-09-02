import type { Difficulty } from '../types'
import { DIFFICULTY_HINTS, DIFFICULTY_LABELS, getClipsForDifficulty, getRankedClips } from '../lib/difficulty'
import { loadBest } from '../lib/game'
import { findClan, loadProfile, rankOf, yourPlace } from '../lib/rank'
import { RankBadge } from './RankBadge'

interface ModeSelectProps {
  onSelect: (difficulty: Difficulty) => void
  onPlayRanked: () => void
  onOpenRanks: () => void
}

const MODES: Difficulty[] = ['easy', 'medium', 'hard']

export function ModeSelect({ onSelect, onPlayRanked, onOpenRanks }: ModeSelectProps) {
  const you = loadProfile()
  const rank = rankOf(you)
  const clan = findClan(you.clanId)
  const rankedPlace = yourPlace('ranked')
  const rankedCount = getRankedClips().length

  return (
    <div className="menu">
      <p className="menu-intro">
        Step into the factory. A trailer flashes for a fifth of a second. Name the film. Need
        longer? Take it — but every extra second costs you points.
      </p>

      <button type="button" className="rank-entry" onClick={onOpenRanks}>
        <RankBadge rank={rank} size="sm" />
        <span className="rank-entry-copy">
          <strong>{rank.name}</strong>
          <em>
            {you.placementsLeft > 0
              ? `${5 - you.placementsLeft}/5 placements`
              : `#${rankedPlace} · ${you.rp} RP`}
            {clan ? ` · [${clan.tag}]` : ''}
          </em>
        </span>
        <span className="rank-entry-go">Board</span>
      </button>

      <button
        type="button"
        className="ranked-play"
        onClick={onPlayRanked}
        disabled={rankedCount === 0}
      >
        <span className="ranked-play-kicker">
          {you.placementsLeft > 0 ? 'Placement match' : 'Ranked match'}
        </span>
        <span className="ranked-play-title">Play Ranked</span>
        <span className="ranked-play-hint">
          Medium + Hard pool · win RP, lose RP · {rankedCount} films
        </span>
      </button>

      <p className="menu-section-label">Casual</p>

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
