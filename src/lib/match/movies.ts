import duelClips from '../../data/duel-clips.json'
import type { MovieClip } from '../../types'
import { MATCH_PREVIEW_SEC, MOVIES_PER_MATCH } from './types'

/** Duel JSON uses difficulty "duel"; treat as MovieClip for guess matching. */
export type MatchClip = Omit<MovieClip, 'difficulty'> & { difficulty: string }

/** Duel / 1v1 pool — client-side trailers for simultaneous rounds. */
export const MATCH_CLIPS = duelClips as MatchClip[]

export function getMovieById(id: string): MatchClip | undefined {
  return MATCH_CLIPS.find((clip) => clip.id === id)
}

export function pickMatchMovies(count = MOVIES_PER_MATCH, seed = Date.now()): string[] {
  const pool = [...MATCH_CLIPS]
  let s = seed >>> 0
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, Math.min(count, pool.length)).map((clip) => clip.id)
}

export function matchPreviewSec(clip: MatchClip): number {
  return Math.min(MATCH_PREVIEW_SEC, Math.max(1, clip.durationSec || MATCH_PREVIEW_SEC))
}
