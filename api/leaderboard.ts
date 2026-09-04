import { ensureIndexes } from './_lib/db.js'
import { methodNotAllowed, sendJson, type ApiRequest, type ApiResponse } from './_lib/http.js'
import { getSessionToken, verifySessionToken } from './_lib/session.js'
import { findUserById, getLeaderboard, getUserRank } from './_lib/users.js'

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
  const parsed = Number(raw ?? 10)
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 10
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

    let me: { rank: number; username: string; points: number } | null = null
    const token = getSessionToken(req)
    if (token) {
      const session = await verifySessionToken(token)
      if (session) {
        const user = await findUserById(session.sub)
        if (user) {
          me = {
            rank: await getUserRank(user),
            username: user.username,
            points: user.points ?? 0,
          }
        }
      }
    }

    sendJson(res, 200, {
      players: players.map((player, index) => ({
        rank: index + 1,
        username: player.username,
        points: player.points,
      })),
      me,
    })
  } catch (err) {
    console.error('[leaderboard]', err)
    sendJson(res, 500, { error: 'Could not load leaderboard.' })
  }
}
