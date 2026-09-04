import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { getDb } from './db.js'

const SALT_ROUNDS = 12

export type UserDoc = {
  _id: ObjectId
  username: string
  passwordHash: string
  points: number
  createdAt: Date
}

export type LeaderboardEntry = {
  username: string
  points: number
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function findUserByUsername(username: string): Promise<UserDoc | null> {
  const db = await getDb()
  return db.collection<UserDoc>('users').findOne({
    username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' },
  })
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null
  const db = await getDb()
  return db.collection<UserDoc>('users').findOne({ _id: new ObjectId(id) })
}

export async function createUser(username: string, password: string): Promise<UserDoc> {
  const db = await getDb()
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const doc: Omit<UserDoc, '_id'> = {
    username,
    passwordHash,
    points: 0,
    createdAt: new Date(),
  }

  const result = await db.collection<Omit<UserDoc, '_id'>>('users').insertOne(doc)
  return { _id: result.insertedId, ...doc }
}

export async function verifyPassword(user: UserDoc, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash)
}

export async function adjustUserPoints(userId: string, delta: number): Promise<number | null> {
  if (!ObjectId.isValid(userId)) return null

  const db = await getDb()
  const result = await db.collection<UserDoc>('users').findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $inc: { points: delta } },
    { returnDocument: 'after' },
  )

  if (!result) return null
  return result.points ?? 0
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const db = await getDb()
  const users = await db
    .collection<UserDoc>('users')
    .find({}, { projection: { username: 1, points: 1 } })
    .sort({ points: -1, username: 1 })
    .limit(limit)
    .toArray()

  return users.map((user) => ({
    username: user.username,
    points: user.points ?? 0,
  }))
}

/** 1-based rank matching getLeaderboard sort: points desc, username asc. */
export async function getUserRank(user: UserDoc): Promise<number> {
  const db = await getDb()
  const points = user.points ?? 0
  const ahead = await db.collection<UserDoc>('users').countDocuments({
    $or: [
      { points: { $gt: points } },
      { points, username: { $lt: user.username } },
    ],
  })
  return ahead + 1
}

export function publicUser(user: UserDoc) {
  return {
    id: user._id.toString(),
    username: user.username,
    points: user.points ?? 0,
  }
}
