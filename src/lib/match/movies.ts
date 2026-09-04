import { CLIPS } from '../difficulty'
import type { MovieClip } from '../../types'
import { MATCH_PREVIEW_SEC, MOVIES_PER_MATCH } from './types'

export function getMovieById(id: string): MovieClip | undefined {
  return CLIPS.find((clip) => clip.id === id)
}

export function pickMatchMovies(count = MOVIES_PER_MATCH, seed = Date.now()): string[] {
  const pool = [...CLIPS]
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

export function matchPreviewSec(_clip: MovieClip): number {
  return MATCH_PREVIEW_SEC
}
