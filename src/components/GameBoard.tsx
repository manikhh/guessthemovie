import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ClipReveal, Difficulty, PublicClip, RoundAction, RoundState, SessionStats } from '../types'
import { DIFFICULTY_LABELS } from '../lib/difficulty'
import { fetchNextClip, ModeCompleteError, submitPlayAction, submitRoundScore, type PlayView } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import {
  applyRoundToStats,
  clipDurationForLevel,
  EMPTY_STATS,
  formatDuration,
  hydrateRound,
  loadBest,
  MAX_LEVELS,
  saveBest,
  scoreForLevel,
  scoreRound,
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
} from './icons'

interface GameBoardProps {
  difficulty: Difficulty
  onExit: () => void
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
  const { user, setUser } = useAuth()
  const best = useRef(loadBest(difficulty))

  const [movie, setMovie] = useState<(PublicClip & Partial<ClipReveal>) | null>(null)
  const [round, setRound] = useState<RoundState | null>(null)
  const [poolProgress, setPoolProgress] = useState({ watched: 0, poolSize: 0 })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingClip, setLoadingClip] = useState(true)
  const [loadingNext, setLoadingNext] = useState(false)
  const [scorePending, setScorePending] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)

  const roundKeyRef = useRef('')
  const statsAppliedKeyRef = useRef('')
  const scoreStartedKeyRef = useRef('')
  const actionLockRef = useRef(false)
  const advancingRef = useRef(false)
  const wantNextRef = useRef(false)
  const scorePromiseRef = useRef(Promise.resolve(false))

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
  const [modeComplete, setModeComplete] = useState(false)

  const statsRef = useRef(stats)
  statsRef.current = stats

  const applyView = useCallback((view: PlayView, isNewRound = false) => {
    const switchedRound = isNewRound || view.roundKey !== roundKeyRef.current
    roundKeyRef.current = view.roundKey
    const nextRound = hydrateRound(view.clip, view.actions, view)
    setMovie({ ...view.clip, ...view.reveal })
    setRound(nextRound)
    setPoolProgress({ watched: view.watched, poolSize: view.poolSize })
    setActiveLevel(view.unlockedLevel)
    setPlayerError(null)
    setLoadError(null)
    if (switchedRound) {
      setFeedback(null)
      setCelebrating(false)
      setScoreError(null)
      setScorePending(false)
      scorePromiseRef.current = Promise.resolve(false)
      wantNextRef.current = false
      if (!view.finished) {
        setIsPlaying(false)
        setPlayerReady(false)
        setShakeToken(0)
        setFocusToken((t) => t + 1)
      }
    }
    return nextRound
  }, [])

  const submitScore = useCallback(
    async (roundKey: string, movieId: string) => {
      setScorePending(true)
      setScoreError(null)
      const run = (async () => {
        try {
          const { points, reveal } = await submitRoundScore({
            roundKey,
            movieId,
            difficulty,
          })
          if (reveal) setMovie((prev) => (prev ? { ...prev, ...reveal } : prev))
          setUser((prev) => (prev ? { ...prev, points } : prev))
          return true
        } catch (err) {
          setScoreError(err instanceof Error ? err.message : 'Could not save score')
          return false
        } finally {
          setScorePending(false)
        }
      })()
      scorePromiseRef.current = run
      return run
    },
    [difficulty, setUser],
  )

  const finishRound = useCallback(
    (next: RoundState) => {
      if (statsAppliedKeyRef.current !== roundKeyRef.current) {
        statsAppliedKeyRef.current = roundKeyRef.current
        const updated = applyRoundToStats(statsRef.current, next)
        setStats(updated)
        saveBest(difficulty, updated.score)
        setFeedback(null)
        setIsPlaying(false)
        playerRef.current?.pause()
        if (next.won) setCelebrating(true)
      }
      if (scoreStartedKeyRef.current !== roundKeyRef.current) {
        scoreStartedKeyRef.current = roundKeyRef.current
        void submitScore(roundKeyRef.current, next.movieId)
      }
    },
    [difficulty, submitScore],
  )

  const loadClip = useCallback(
    async (advance: boolean) => {
      setLoadError(null)
      if (advance) setLoadingNext(true)
      else setLoadingClip(true)

      try {
        const view = await fetchNextClip(difficulty, advance)
        setModeComplete(view.watched >= view.poolSize && view.poolSize > 0)
        const nextRound = applyView(view, true)
        if (view.finished) finishRound(nextRound)
      } catch (err) {
        if (err instanceof ModeCompleteError) {
          setModeComplete(true)
          if (advance) {
            setLoadingNext(false)
            advancingRef.current = false
            return
          }
          setLoadError('Mode cleared — locked')
        } else {
          setLoadError(err instanceof Error ? err.message : 'Could not load clip')
        }
      } finally {
        setLoadingClip(false)
        setLoadingNext(false)
        advancingRef.current = false
      }
    },
    [applyView, difficulty, finishRound],
  )

  useEffect(() => {
    void loadClip(false)
  }, [loadClip])

  function handleVolumeChange(next: number) {
    setVolume(next)
    try {
      localStorage.setItem('gtm-volume', String(next))
    } catch {
      /* ignore */
    }
  }

  const play = useCallback((level: number) => {
    if (round?.finished) return
    setActiveLevel(level)
    setPlayerError(null)
    playerRef.current?.play()
  }, [round?.finished])

  const togglePlayback = useCallback(() => {
    if (round?.finished) return
    if (isPlaying) {
      playerRef.current?.pause()
      return
    }
    play(activeLevel)
  }, [activeLevel, isPlaying, play, round?.finished])

  const prefetchNextMovie = useCallback(() => {
    /* next clip is server-assigned only after the current round is scored */
  }, [])

  const advanceIfQueued = useCallback(async () => {
    if (!wantNextRef.current || advancingRef.current) return
    advancingRef.current = true
    const saved = await scorePromiseRef.current
    if (!wantNextRef.current) {
      advancingRef.current = false
      return
    }
    if (!saved) {
      advancingRef.current = false
      wantNextRef.current = false
      return
    }
    wantNextRef.current = false
    await loadClip(true)
  }, [loadClip])

  async function sendAction(action: RoundAction) {
    if (actionLockRef.current) return
    actionLockRef.current = true
    try {
      const view = await submitPlayAction({
        difficulty,
        roundKey: roundKeyRef.current,
        action,
      })
      const nextRound = applyView(view)
      if (action.type === 'unlock' && !view.finished) {
        play(view.unlockedLevel)
      }
      if (action.type === 'guess' && !view.finished) {
        setFeedback(`[-1] "${action.text.trim()}"`)
        setShakeToken((t) => t + 1)
        window.setTimeout(() => setFeedback(null), 1800)
      }
      if (view.finished) {
        finishRound(nextRound)
        if (wantNextRef.current) void advanceIfQueued()
      } else {
        wantNextRef.current = false
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Could not send that')
      wantNextRef.current = false
    } finally {
      actionLockRef.current = false
    }
  }

  function queueNext() {
    if (modeComplete || poolProgress.watched >= poolProgress.poolSize) {
      onExit()
      return
    }
    wantNextRef.current = true
    if (scoreStartedKeyRef.current === roundKeyRef.current) {
      void advanceIfQueued()
    }
  }

  function handleGuess(guess: string) {
    if (!round) return
    if (round.finished || actionLockRef.current) {
      queueNext()
      return
    }
    void sendAction({ type: 'guess', text: guess, level: round.unlockedLevel })
  }

  function handleShowMore() {
    if (!round) return
    if (round.finished || actionLockRef.current) {
      queueNext()
      return
    }
    void sendAction({ type: 'unlock' })
  }

  function handleGiveUp() {
    if (!round || round.finished || actionLockRef.current) return
    void sendAction({ type: 'giveup', level: round.unlockedLevel })
  }

  function handleNextMovie() {
    queueNext()
  }

  function handleRetryScore() {
    if (!round) return
    void submitScore(roundKeyRef.current, round.movieId)
  }

  if (loadingClip) {
    return (
      <div className="loading">
        <p>
          <LoaderCircle size={14} strokeWidth={1.5} absoluteStrokeWidth className="icon-spin" aria-hidden />
          {' '}
          Loading clip…
        </p>
      </div>
    )
  }

  if (loadError || !movie || !round) {
    return (
      <div className="loading">
        <p>{loadError ?? `[EMPTY] No clips for ${DIFFICULTY_LABELS[difficulty]}`}</p>
        {modeComplete || loadError === 'Mode cleared — locked' ? null : (
          <button type="button" className="btn btn-primary" onClick={() => void loadClip(false)}>
            Retry
          </button>
        )}
        <button type="button" className="btn btn-outline" onClick={onExit}>
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
        <StatsBar
          stats={stats}
          best={best.current}
          watched={poolProgress.watched}
          poolSize={poolProgress.poolSize}
          totalPoints={user?.points ?? null}
        />
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
              {finished ? null : playerError ? (
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
            points={scoreRound(round)}
            clipLevel={round.wonAtLevel ?? 0}
            onDone={() => setCelebrating(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {finished ? (
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
              modeComplete={modeComplete || poolProgress.watched >= poolProgress.poolSize}
              onNext={handleNextMovie}
              onDone={onExit}
              onPrefetchNext={prefetchNextMovie}
              loadingNext={loadingNext}
              scorePending={scorePending}
              scoreError={scoreError}
              onRetryScore={handleRetryScore}
            />
          </motion.div>
        ) : (
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
        )}
      </AnimatePresence>
    </div>
  )
}
