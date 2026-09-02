import { useCallback, useMemo, useRef, useState } from 'react'
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
import { applyRankedMatch, loadProfile, rankOf, recordCasualPoints, type RankChange } from '../lib/rank'
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer'
import { ClipTimeline } from './ClipTimeline'
import { GuessInput } from './GuessInput'
import { RoundResult } from './RoundResult'
import { StatsBar } from './StatsBar'
import { WinCelebration } from './WinCelebration'
import { RankFlash } from './RankFlash'
import { RankBadge } from './RankBadge'
import { PlayIcon } from './icons'

function shouldFlashRank(kind: RankChange['kind']): boolean {
  return kind !== 'hold'
}

type GameBoardProps =
  | { ranked: true; difficulty?: never; onExit: () => void }
  | { ranked?: false; difficulty: Difficulty; onExit: () => void }

function startSession(deck: Deck): { movie: MovieClip | null; round: RoundState | null } {
  const movie = deck.next()
  return { movie, round: movie ? createRound(movie) : null }
}

export function GameBoard(props: GameBoardProps) {
  const ranked = props.ranked === true
  const pool = ranked ? 'ranked' : props.difficulty
  const deck = useMemo(() => new Deck(pool), [pool])
  const best = useRef(ranked ? 0 : loadBest(props.difficulty))

  const [session, setSession] = useState(() => startSession(deck))
  const { movie, round } = session

  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)
  const [activeLevel, setActiveLevel] = useState(0)
  const playerRef = useRef<YouTubePlayerHandle>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [rankChange, setRankChange] = useState<RankChange | null>(null)
  const [flashRank, setFlashRank] = useState(false)
  const [profileTick, setProfileTick] = useState(0)
  const profile = useMemo(() => loadProfile(), [profileTick])
  const liveRank = rankChange?.after ?? rankOf(profile)

  const play = useCallback((level: number) => {
    setActiveLevel(level)
    setPlayerError(null)
    setIsStarting(true)
    playerRef.current?.play()
  }, [])

  function handlePlayingChange(playing: boolean) {
    setIsPlaying(playing)
    if (playing) setIsStarting(false)
    else setIsStarting(false)
  }

  function finishRound(next: RoundState) {
    const updated = applyRoundToStats(stats, next)
    setStats(updated)
    if (!ranked) saveBest(props.difficulty, updated.score)

    const gained = next.won ? scoreForLevel(next.wonAtLevel ?? 0) : 0

    if (ranked) {
      const change = applyRankedMatch({
        won: next.won,
        clipLevel: next.wonAtLevel ?? next.unlockedLevel,
        scorePoints: gained,
      })
      setRankChange(change)
      setProfileTick((n) => n + 1)
      setFeedback(null)
      if (next.won) setCelebrating(true)
      else if (shouldFlashRank(change.kind)) setFlashRank(true)
      return
    }

    if (gained > 0) {
      recordCasualPoints(gained)
      setProfileTick((n) => n + 1)
    }
    setRankChange(null)
    setFeedback(null)
    if (next.won) setCelebrating(true)
  }

  function handleGuess(guess: string) {
    if (!round || !movie || round.finished) return

    const correct = checkGuess(guess, movie)
    const next = applyGuess(round, guess, correct)
    setSession((s) => ({ ...s, round: next }))

    if (next.finished) {
      finishRound(next)
      return
    }

    setFeedback(`"${guess}" is not it`)
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
    finishRound(next)
  }

  function handleNextMovie() {
    const nextMovie = deck.next()
    if (!nextMovie) return
    setSession({ movie: nextMovie, round: createRound(nextMovie) })
    setActiveLevel(0)
    setIsPlaying(false)
    setIsStarting(false)
    setPlayerError(null)
    setFeedback(null)
    setFocusToken((t) => t + 1)
    setCelebrating(false)
    setRankChange(null)
    setFlashRank(false)
  }

  if (!movie || !round) {
    return (
      <div className="loading">
        <p>{ranked ? 'No ranked clips available.' : `No clips found for ${DIFFICULTY_LABELS[props.difficulty]}.`}</p>
        <button type="button" className="btn btn-primary" onClick={props.onExit}>
          Back to modes
        </button>
      </div>
    )
  }

  const guessesLeft = MAX_LEVELS - round.guesses.length
  const canShowMore = !round.finished && round.unlockedLevel < MAX_LEVELS - 1
  const clipLength = clipDurationForLevel(activeLevel)
  const placementRound = profile.placementsLeft > 0 ? 6 - profile.placementsLeft : null

  return (
    <div className={`board ${ranked ? 'board-ranked' : ''}`}>
      <div className="board-top">
        <button type="button" className="btn btn-quiet" onClick={props.onExit}>
          ← Modes
        </button>
        {ranked ? (
          <span className="ranked-chip">
            <RankBadge rank={liveRank} size="sm" />
            <span>{liveRank.name}</span>
          </span>
        ) : (
          <span className={`chip chip-${props.difficulty}`}>{DIFFICULTY_LABELS[props.difficulty]}</span>
        )}
      </div>

      {ranked ? (
        <div className="ranked-banner">
          <span>
            {placementRound
              ? `Placement ${Math.min(5, placementRound)}/5`
              : 'Ranked match'}
          </span>
          <span>{liveRank.family === 'unranked' ? 'Unranked' : `${liveRank.rp} RP`}</span>
        </div>
      ) : (
        <StatsBar stats={stats} best={best.current} />
      )}

      <div className="screen">
        <div className="screen-video">
          <YouTubePlayer
            ref={playerRef}
            videoId={movie.youtubeId}
            startSec={movie.startSec}
            durationSec={clipLength}
            onPlayingChange={handlePlayingChange}
            onReadyChange={setPlayerReady}
            onErrorChange={(err) => {
              setPlayerError(err)
              if (err) setIsStarting(false)
            }}
          />
        </div>

        <div className={`screen-cover ${isPlaying || isStarting ? 'is-hidden' : ''}`}>
          {round.finished ? (
            <button type="button" className="screen-replay" onClick={() => play(activeLevel)}>
              Replay {formatDuration(clipLength)}
            </button>
          ) : (
            <button
              type="button"
              className="screen-play"
              onClick={() => play(activeLevel)}
              disabled={!playerReady && !playerError}
            >
              <PlayIcon className="screen-play-icon" />
              <span className="screen-play-label">
                {playerError
                  ? playerError
                  : playerReady
                    ? `Play ${formatDuration(clipLength)}`
                    : 'Buffering clip…'}
              </span>
            </button>
          )}
        </div>

        <div className="screen-mask screen-mask-top" aria-hidden />
        <div className="screen-mask screen-mask-bottom" aria-hidden />
      </div>

      {celebrating && round.won && (
        <WinCelebration
          points={scoreForLevel(round.wonAtLevel ?? 0)}
          clipLevel={round.wonAtLevel ?? 0}
          onDone={() => {
            setCelebrating(false)
            if (ranked && rankChange && shouldFlashRank(rankChange.kind)) setFlashRank(true)
          }}
        />
      )}

      {flashRank && rankChange && (
        <RankFlash change={rankChange} onDone={() => setFlashRank(false)} />
      )}

      {round.finished && (!round.won || !celebrating) && !flashRank && (
        <RoundResult
          round={round}
          movie={movie}
          rankChange={ranked ? rankChange : null}
          onNext={handleNextMovie}
          animateIn={round.won}
        />
      )}

      {!round.finished && (
        <>
          <div className="play-meta">
            <span>
              Clip {activeLevel + 1} · {formatDuration(clipLength)}
            </span>
            <span className="play-meta-points">
              {ranked
                ? `Worth ${scoreForLevel(round.unlockedLevel)} pts · RP on the line`
                : `Worth ${scoreForLevel(round.unlockedLevel)} pts`}
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
