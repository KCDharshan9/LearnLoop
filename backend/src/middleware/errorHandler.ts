import type { ErrorRequestHandler } from 'express'
import type { ApiError } from '../types/api.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error)
  const body: ApiError = { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' } }
  response.status(500).json(body)
}
