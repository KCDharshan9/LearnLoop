import mongoose from 'mongoose'
import { env } from '../config/env.js'

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 })
    console.info('MongoDB connection established.')
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError'
    console.error(`MongoDB connection failed (${name}).`)
    throw error
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}

export function getDatabaseStatus(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
}
