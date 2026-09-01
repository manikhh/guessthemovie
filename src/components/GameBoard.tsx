import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Difficulty, MovieClip, RoundState, SessionStats } from '../types'
import { Deck } from '../lib/deck'
import { DIFFICULTY_LABELS } from '../lib/difficulty'
import { checkGuess } from '../lib/guess'
import {
  applyGuess,
  applyRoundToStats,
  clipDurationForLevel,
  createRound,
  EMPTY_STATS,
  formatDuration,
  giveUp,
  loadBest,
  MAX_LEVELS,
  saveBest,
  scoreForLevel,
  unlockNextLevel,
} from '../lib/game'
import { YouTubePlayer } from './YouTubePlayer'
import { ClipTimeline } from './ClipTimeline'
import { GuessInput } from './GuessInput'
import { RoundResult } from './RoundResult'
import { StatsBar } from './StatsBar'

interface GameBoardProps {
  difficulty: Difficulty
  onExit: () => void
}

export function GameBoard({ difficulty, onExit }: GameBoardProps) {
  const deck = useMemo(() => new Deck(difficulty), [difficulty])
  const best = useRef(loadBest(difficulty))

  const [movie, setMovie] = useState<MovieClip | null>(() => deck.next())
  const [round, setRound] = useState<RoundState | null>(null)
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)

  const [activeLevel, setActiveLevel] = useState(0)
  const [playToken, setPlayToken] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [focusToken, setFocusToken] = useState(0)

  useEffect(() => {
    if (movie) setRound(createRound(movie))
  }, [movie])

  const play = useCallback((level: number) => {
    setActiveLevel(level)
    setPlayToken((t) => t + 1)
  }, [])

  function handleGuess(guess: string) {
    if (!round || !movie || round.finished) return

    const correct = checkGuess(guess, movie)
    const next = applyGuess(round, guess, correct)
    setRound(next)

    if (next.finished) {
      const updated = applyRoundToStats(stats, next)
      setStats(updated)
      saveBest(difficulty, updated.score)
      setFeedback(null)
      return
    }

    setFeedback(`"${guess}" is not it`)
    window.setTimeout(() => setFeedback(null), 1800)
  }

  function handleShowMore() {
    if (!round || round.finished) return
    const next = unlockNextLevel(round)
    if (next === round) return
    setRound(next)
    play(next.unlockedLevel)
  }

  function handleGiveUp() {
    if (!round || round.finished) return
    const next = giveUp(round)
    setRound(next)
    const updated = applyRoundToStats(stats, next)
    setStats(updated)
    saveBest(difficulty, updated.score)
  }

  function handleNextMovie() {
    const nextMovie = deck.next()
    if (!nextMovie) return
    setMovie(nextMovie)
    setActiveLevel(0)
    setIsPlaying(false)
    setFeedback(null)
    setFocusToken((t) => t + 1)
  }

  if (!movie || !round) {
    return (
      <div className="loading">
        <span className="spinner" aria-hidden />
        <p>Loading clips…</p>
      </div>
    )
  }

  const guessesLeft = MAX_LEVELS - round.guesses.length
  const canShowMore = !round.finished && round.unlockedLevel < MAX_LEVELS - 1
  const clipLength = clipDurationForLevel(activeLevel)

  return (
    <div className="board">
      <div className="board-top">
        <button type="button" className="btn btn-quiet" onClick={onExit}>
          ← Modes
        </button>
        <span className={`chip chip-${difficulty}`}>{DIFFICULTY_LABELS[difficulty]}</span>
      </div>

      <StatsBar stats={stats} best={best.current} />

      <div className="screen">
        <div className="screen-video">
          <YouTubePlayer
            videoId={movie.youtubeId}
            startSec={movie.startSec}
            durationSec={clipLength}
            playToken={playToken}
            onPlayingChange={setIsPlaying}
            onReadyChange={setPlayerReady}
          />
        </div>

        {/* Kept opaque unless the clip is actually running, so the YouTube
            thumbnail and title chrome can never give the answer away. */}
        <div className={`screen-cover ${isPlaying ? 'is-hidden' : ''}`}>
          {round.finished ? (
            <button type="button" className="screen-replay" onClick={() => play(activeLevel)}>
              Replay {formatDuration(clipLength)}
            </button>
          ) : (
            <button
              type="button"
              className="screen-play"
              onClick={() => play(activeLevel)}
              disabled={!playerReady}
            >
              <span className="screen-play-icon" aria-hidden>
                ▶
              </span>
              <span className="screen-play-label">
                {playerReady ? `Play ${formatDuration(clipLength)}` : 'Loading…'}
              </span>
            </button>
          )}
        </div>

        <div className="screen-mask screen-mask-top" aria-hidden />
        <div className="screen-mask screen-mask-bottom" aria-hidden />
      </div>

      {round.finished ? (
        <RoundResult round={round} movie={movie} onNext={handleNextMovie} />
      ) : (
        <>
          <div className="play-meta">
            <span>
              Clip {activeLevel + 1} · {formatDuration(clipLength)}
            </span>
            <span className="play-meta-points">
              Worth {scoreForLevel(round.unlockedLevel)} pts
            </span>
          </div>

          <GuessInput
            disabled={round.finished}
            guessesLeft={guessesLeft}
            onSubmit={handleGuess}
            focusToken={focusToken}
          />

          <p className={`feedback ${feedback ? 'is-shown' : ''}`} role="status">
            {feedback ?? '\u00a0'}
          </p>

          <div className="round-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleShowMore}
              disabled={!canShowMore}
            >
              {canShowMore
                ? `Show more · ${formatDuration(clipDurationForLevel(round.unlockedLevel + 1))}`
                : 'Longest clip reached'}
            </button>
            <button type="button" className="btn btn-quiet" onClick={handleGiveUp}>
              Give up
            </button>
          </div>

          <ClipTimeline
            unlockedLevel={round.unlockedLevel}
            activeLevel={activeLevel}
            finished={round.finished}
            onPlayLevel={play}
          />
        </>
      )}
    </div>
  )
}
