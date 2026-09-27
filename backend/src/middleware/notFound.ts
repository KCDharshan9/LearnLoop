import type { Request, Response } from 'express'
import type { ApiError } from '../types/api.js'

export function notFound(request: Request, response: Response<ApiError>): void {
  response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `API route ${request.method} ${request.originalUrl} was not found.` } })
}
