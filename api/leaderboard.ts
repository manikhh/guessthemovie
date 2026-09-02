import { ensureIndexes } from '../_lib/db'
import { methodNotAllowed, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http'
import { getLeaderboard } from '../_lib/users'

let indexesReady: Promise<void> | null = null

function ensureReady(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureIndexes().catch(() => {})
  }
  return indexesReady
}

function parseLimit(req: ApiRequest): number {
  const raw = req.url?.includes('?')
    ? new URL(req.url, 'http://localhost').searchParams.get('limit')
    : null
  const parsed = Number(raw ?? 50)
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 50
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET'])
    return
  }

  try {
    await ensureReady()

    const limit = parseLimit(req)
    const players = await getLeaderboard(limit)

    sendJson(res, 200, {
      players: players.map((player, index) => ({
        rank: index + 1,
        username: player.username,
        points: player.points,
      })),
    })
  } catch (err) {
    console.error('[leaderboard]', err)
    sendJson(res, 500, { error: 'Could not load leaderboard.' })
  }
}
