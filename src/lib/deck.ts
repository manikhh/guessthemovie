import type { Difficulty } from '../types'
import { getPoolSize } from './difficulty'

/** Client-side decks cannot hold answers; clips are assigned by the server. */
export class Deck {
  readonly poolSize: number

  constructor(difficulty: Difficulty) {
    this.poolSize = getPoolSize(difficulty)
  }
}
