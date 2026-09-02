import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer'
import { ClipTimeline } from './ClipTimeline'
import { GuessInput } from './GuessInput'
import { RoundResult } from './RoundResult'
import { StatsBar } from './StatsBar'
import { VolumeBar } from './VolumeBar'
import { WinCelebration } from './WinCelebration'
import {
  ChevronLeft,
  LoaderCircle,
  MorphIcon,
  Pause,
  Play,
  RotateCcw,
} from './icons'

interface GameBoardProps {
  difficulty: Difficulty
  onExit: () => void
}

function startSession(deck: Deck): { movie: MovieClip | null; round: RoundState | null } {
  const movie = deck.next()
  return { movie, round: movie ? createRound(movie) : null }
}

function loadVolume(): number {
  try {
    const raw = localStorage.getItem('gtm-volume')
    if (raw == null) return 80
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)))
  } catch {
    /* ignore */
  }
  return 80
}

export function GameBoard({ difficulty, onExit }: GameBoardProps) {
  const deck = useMemo(() => new Deck(difficulty), [difficulty])
  const best = useRef(loadBest(difficulty))

  const [session, setSession] = useState(() => startSession(deck))
  const { movie, round } = session

  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)
  const [activeLevel, setActiveLevel] = useState(0)
  const playerRef = useRef<YouTubePlayerHandle>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [shakeToken, setShakeToken] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [volume, setVolume] = useState(loadVolume)

  function handleVolumeChange(next: number) {
    setVolume(next)
    try {
      localStorage.setItem('gtm-volume', String(next))
    } catch {
      /* ignore */
    }
  }

  const play = useCallback((level: number) => {
    setActiveLevel(level)
    setPlayerError(null)
    playerRef.current?.play()
  }, [])

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause()
      return
    }
    play(activeLevel)
  }, [activeLevel, isPlaying, play])

  const prefetchNextMovie = useCallback(() => {
    const next = deck.peek()
    if (next) playerRef.current?.preloadNext(next.youtubeId, next.startSec)
  }, [deck])

  function handleGuess(guess: string) {
    if (!round || !movie || round.finished) return

    const correct = checkGuess(guess, movie)
    const next = applyGuess(round, guess, correct)
    setSession((s) => ({ ...s, round: next }))

    if (next.finished) {
      const updated = applyRoundToStats(stats, next)
      setStats(updated)
      saveBest(difficulty, updated.score)
      setFeedback(null)
      if (next.won) setCelebrating(true)
      return
    }

    setFeedback(`[WRONG] "${guess}"`)
    setShakeToken((t) => t + 1)
    window.setTimeout(() => setFeedback(null), 1800)
  }

  function handleShowMore() {
    if (!round || round.finished) return
    const next = unlockNextLevel(round)
    if (next === round) return
    setSession((s) => ({ ...s, round: next }))
    play(next.unlockedLevel)
  }

  function handleGiveUp() {
    if (!round || round.finished) return
    const next = giveUp(round)
    setSession((s) => ({ ...s, round: next }))
    const updated = applyRoundToStats(stats, next)
    setStats(updated)
    saveBest(difficulty, updated.score)
  }

  function handleNextMovie() {
    const nextMovie = deck.next()
    if (!nextMovie) return
    setSession({ movie: nextMovie, round: createRound(nextMovie) })
    setActiveLevel(0)
    setIsPlaying(false)
    setPlayerReady(false)
    setPlayerError(null)
    setFeedback(null)
    setFocusToken((t) => t + 1)
    setShakeToken(0)
    setCelebrating(false)
  }

  if (!movie || !round) {
    return (
      <div className="loading">
        <p>[EMPTY] No clips for {DIFFICULTY_LABELS[difficulty]}</p>
        <button type="button" className="btn btn-primary" onClick={onExit}>
          Back
        </button>
      </div>
    )
  }

  const guessesLeft = MAX_LEVELS - round.guesses.length
  const canShowMore = !round.finished && round.unlockedLevel < MAX_LEVELS - 1
  const clipLength = clipDurationForLevel(activeLevel)
  const finished = round.finished

  return (
    <div className={`theater ${finished ? 'is-finished' : ''}`}>
      <header className="theater-chrome">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Back to modes">
          <ChevronLeft size={20} strokeWidth={1.5} absoluteStrokeWidth />
        </button>
        <StatsBar stats={stats} best={best.current} />
        <span className={`chip chip-${difficulty}`}>{DIFFICULTY_LABELS[difficulty]}</span>
      </header>

      <div className="theater-stage">
        <div className={`screen ${isPlaying ? 'is-live' : ''}`}>
          <div className="screen-frame">
            <div className="screen-video">
              <YouTubePlayer
                ref={playerRef}
                videoId={movie.youtubeId}
                startSec={movie.startSec}
                durationSec={clipLength}
                volume={volume}
                onPlayingChange={setIsPlaying}
                onReadyChange={setPlayerReady}
                onErrorChange={setPlayerError}
              />
            </div>

            <VolumeBar volume={volume} onChange={handleVolumeChange} />

            <div className={`screen-cover ${isPlaying ? 'is-hidden' : ''}`}>
              {finished ? (
                <button type="button" className="screen-replay" onClick={() => play(activeLevel)}>
                  <RotateCcw size={14} strokeWidth={1.5} absoluteStrokeWidth aria-hidden />
                  Replay {formatDuration(clipLength)}
                </button>
              ) : playerError ? (
                <p className="screen-idle-status">{playerError}</p>
              ) : !playerReady ? (
                <p className="screen-idle-status">
                  <LoaderCircle size={14} strokeWidth={1.5} absoluteStrokeWidth className="icon-spin" aria-hidden />
                  [LOADING]
                </p>
              ) : null}
            </div>

            <div className="screen-mask screen-mask-top" aria-hidden />
            <div className="screen-mask screen-mask-bottom" aria-hidden />
            <div className="screen-mask screen-mask-left" aria-hidden />
            <div className="screen-mask screen-mask-right" aria-hidden />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {celebrating && round.won && (
          <WinCelebration
            points={scoreForLevel(round.wonAtLevel ?? 0)}
            clipLevel={round.wonAtLevel ?? 0}
            onDone={() => setCelebrating(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {finished && (!round.won || !celebrating) ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <RoundResult
              round={round}
              movie={movie}
              onNext={handleNextMovie}
              onPrefetchNext={prefetchNextMovie}
            />
          </motion.div>
        ) : !finished ? (
          <motion.div
            key="dock"
            className="theater-dock-wrap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="theater-dock">
              <div className="dock-meta">
                <button
                  type="button"
                  className={`dock-transport ${isPlaying ? 'is-playing' : ''}`}
                  onClick={togglePlayback}
                  disabled={!isPlaying && !playerReady && !playerError}
                  aria-label={isPlaying ? 'Pause clip' : `Play ${formatDuration(clipLength)}`}
                >
                  <MorphIcon
                    className="dock-transport-icon"
                    icon={isPlaying ? Pause : Play}
                    size={20}
                    strokeWidth={1.5}
                    absoluteStrokeWidth
                    spring="smooth"
                    reducedMotion="user"
                  />
                </button>
                <div className="dock-meta-copy">
                  <span>
                    Clip {activeLevel + 1} · {formatDuration(clipLength)}
                  </span>
                  <span className="dock-meta-points">{scoreForLevel(round.unlockedLevel)} pts</span>
                </div>
              </div>

              <GuessInput
                disabled={finished}
                guessesLeft={guessesLeft}
                difficulty={difficulty}
                onSubmit={handleGuess}
                onMore={handleShowMore}
                onGiveUp={handleGiveUp}
                canShowMore={canShowMore}
                moreLabel={
                  canShowMore
                    ? `More · ${formatDuration(clipDurationForLevel(round.unlockedLevel + 1))}`
                    : 'Max clip'
                }
                focusToken={focusToken}
                shakeToken={shakeToken}
              />

              <motion.p
                className={`feedback ${feedback ? 'is-shown' : ''}`}
                role="status"
                animate={feedback ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {feedback ?? '\u00a0'}
              </motion.p>

              <ClipTimeline
                unlockedLevel={round.unlockedLevel}
                activeLevel={activeLevel}
                finished={finished}
                onPlayLevel={play}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
