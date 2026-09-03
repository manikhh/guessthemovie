import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is not set')
  }

  if (!global.__mongoClientPromise) {
    const client = new MongoClient(uri)
    global.__mongoClientPromise = client.connect()
  }

  return global.__mongoClientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise()
  return client.db(process.env.MONGODB_DB ?? 'guessthemovie')
}

export async function getClient(): Promise<MongoClient> {
  return getClientPromise()
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDb()
  await db.collection('users').createIndex({ username: 1 }, { unique: true })
  await db.collection('users').createIndex({ points: -1, username: 1 })
  await db.collection('rate_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  await db.collection('score_events').createIndex({ roundKey: 1 }, { unique: true })
  await db.collection('score_events').createIndex({ userId: 1, createdAt: -1 })
  await db.collection('play_sessions').createIndex({ userId: 1, difficulty: 1 }, { unique: true })
}
