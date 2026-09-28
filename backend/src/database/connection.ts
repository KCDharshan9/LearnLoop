import mongoose from 'mongoose'
import { env } from '../config/env.js'

function getSanitizedHost(uri: string): string {
  try {
    const atIndex = uri.indexOf('@')
    const slashAfterAt = uri.indexOf('/', atIndex)
    if (atIndex !== -1) {
      return slashAfterAt !== -1 ? uri.slice(atIndex + 1, slashAfterAt) : uri.slice(atIndex + 1)
    }
    return 'configured cluster'
  } catch {
    return 'configured cluster'
  }
}

export async function connectDatabase(): Promise<void> {
  const host = getSanitizedHost(env.mongoUri)
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 })
    console.info(`MongoDB connection established (${host}).`)
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError'
    const message = error instanceof Error ? error.message : String(error)
    console.error(`MongoDB connection failed (${name}): ${message}`)
    if (
      message.includes('whitelist') ||
      message.includes('alert number 80') ||
      name === 'MongooseServerSelectionError'
    ) {
      console.error(
        'Diagnostic hint: If using MongoDB Atlas, verify your current IP is authorized under Atlas Network Access (IP Access List).',
      )
    }
    throw error
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}

export function getDatabaseStatus(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
}
