/**
 * Practice Controller.
 *
 * Handles HTTP requests for:
 * - POST /api/practice/start
 * - POST /api/practice/:sessionId/answer
 * - GET /api/practice/:sessionId
 */

import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js'
import type { ApiError } from '../types/api.js'
import {
  PracticeError,
  getPracticeSession,
  startOrResumePractice,
  submitPracticeAnswer,
} from '../services/practiceService.js'

function getStatusCode(code: string): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401
    case 'FORBIDDEN':
      return 403
    case 'NOT_FOUND':
    case 'SESSION_NOT_FOUND':
    case 'QUESTION_NOT_FOUND':
      return 404
    case 'VALIDATION_ERROR':
    case 'INVALID_STEP':
    case 'SESSION_COMPLETED':
      return 400
    default:
      return 500
  }
}

/**
 * POST /api/practice/start
 * Request body: { learningPathId?: string, stepNumber?: number, skillId?: string }
 */
export async function startPracticeHandler(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const { learningPathId, stepNumber, skillId } = request.body ?? {}

  try {
    const result = await startOrResumePractice(
      {
        learningPathId,
        stepNumber: stepNumber !== undefined ? Number(stepNumber) : undefined,
        skillId,
      },
      authReq.user,
    )
    response.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error instanceof PracticeError) {
      const statusCode = getStatusCode(error.code)
      const body: ApiError = {
        success: false,
        error: { code: error.code, message: error.message },
      }
      response.status(statusCode).json(body)
      return
    }

    console.error('[PracticeController] Error in startPracticeHandler:', error)
    const body: ApiError = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to start practice session.' },
    }
    response.status(500).json(body)
  }
}

/**
 * POST /api/practice/:sessionId/answer
 * Request body: { questionId: string, answer: unknown, hintUsed?: boolean }
 */
export async function submitAnswerHandler(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const rawSessionId = request.params.sessionId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId
  const { questionId, answer, hintUsed } = request.body ?? {}

  if (!sessionId || !sessionId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'sessionId is required.' },
    }
    response.status(400).json(body)
    return
  }

  if (!questionId || typeof questionId !== 'string' || !questionId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'questionId is required.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const result = await submitPracticeAnswer(
      sessionId,
      questionId,
      answer,
      hintUsed,
      authReq.user,
    )
    response.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error instanceof PracticeError) {
      const statusCode = getStatusCode(error.code)
      const body: ApiError = {
        success: false,
        error: { code: error.code, message: error.message },
      }
      response.status(statusCode).json(body)
      return
    }

    console.error('[PracticeController] Error in submitAnswerHandler:', error)
    const body: ApiError = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit practice answer.' },
    }
    response.status(500).json(body)
  }
}

/**
 * GET /api/practice/:sessionId
 */
export async function getPracticeSessionHandler(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const rawSessionId = request.params.sessionId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId

  if (!sessionId || !sessionId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'sessionId is required.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const result = await getPracticeSession(sessionId, authReq.user)
    response.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error instanceof PracticeError) {
      const statusCode = getStatusCode(error.code)
      const body: ApiError = {
        success: false,
        error: { code: error.code, message: error.message },
      }
      response.status(statusCode).json(body)
      return
    }

    console.error('[PracticeController] Error in getPracticeSessionHandler:', error)
    const body: ApiError = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve practice session.' },
    }
    response.status(500).json(body)
  }
}
