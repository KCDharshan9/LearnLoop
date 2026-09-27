import type { Request, Response } from 'express'
import { getDatabaseStatus } from '../database/connection.js'

export function getHealth(_request: Request, response: Response): void {
  response.status(200).json({ success: true, data: { status: 'ok', service: 'learnloop-backend', database: getDatabaseStatus(), timestamp: new Date().toISOString() } })
}
