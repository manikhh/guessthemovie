import { getDb } from './db.js'

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<boolean> {
  const db = await getDb()
  const col = db.collection('rate_limits')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + windowMs)

  const bumped = await col.findOneAndUpdate(
    { key, expiresAt: { $gt: now }, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' },
  )
  if (bumped) return true

  const reset = await col.findOneAndUpdate(
    {
      key,
      $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }],
    },
    { $set: { count: 1, expiresAt } },
    { upsert: true, returnDocument: 'after' },
  )
  if (reset) return reset.count <= limit

  const retry = await col.findOneAndUpdate(
    { key, expiresAt: { $gt: now }, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' },
  )
  return retry !== null
}
