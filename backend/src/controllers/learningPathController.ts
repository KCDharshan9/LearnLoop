/**
 * Learning Path Controller.
 *
 * Handles HTTP requests for:
 * - GET /api/students/:studentId/learning-path
 * - POST /api/learning-paths/:learningPathId/steps/:stepId/complete
 */

import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js'
import type { ApiError } from '../types/api.js'
import {
  LearningPathError,
  completeLearningPathStep,
  getOrGenerateLearningPath,
} from '../services/learningPathService.js'

/**
 * GET /api/students/:studentId/learning-path
 */
export async function getStudentLearningPath(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const rawStudentId = request.params.studentId
  const studentId = Array.isArray(rawStudentId) ? rawStudentId[0] : rawStudentId

  if (!studentId || !studentId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'studentId is required.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const result = await getOrGenerateLearningPath(studentId, authReq.user)
    response.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error instanceof LearningPathError) {
      const statusCode =
        error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'VALIDATION_ERROR'
              ? 400
              : 500
      const body: ApiError = {
        success: false,
        error: { code: error.code, message: error.message },
      }
      response.status(statusCode).json(body)
      return
    }

    console.error('[LearningPathController] Error in getStudentLearningPath:', error)
    const body: ApiError = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve learning path.' },
    }
    response.status(500).json(body)
  }
}

/**
 * POST /api/learning-paths/:learningPathId/steps/:stepId/complete
 */
export async function completeStep(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const rawPathId = request.params.learningPathId
  const learningPathId = Array.isArray(rawPathId) ? rawPathId[0] : rawPathId
  const rawStepId = request.params.stepId
  const stepId = Array.isArray(rawStepId) ? rawStepId[0] : rawStepId

  const stepNumber = parseInt(stepId, 10)
  if (!learningPathId || isNaN(stepNumber)) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'learningPathId and numeric stepId are required.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const updated = await completeLearningPathStep(learningPathId, stepNumber, authReq.user)
    response.status(200).json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof LearningPathError) {
      const statusCode =
        error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'NOT_FOUND' || error.code === 'STEP_NOT_FOUND'
            ? 404
            : error.code === 'VALIDATION_ERROR'
              ? 400
              : 500
      const body: ApiError = {
        success: false,
        error: { code: error.code, message: error.message },
      }
      response.status(statusCode).json(body)
      return
    }

    console.error('[LearningPathController] Error in completeStep:', error)
    const body: ApiError = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to complete learning path step.' },
    }
    response.status(500).json(body)
  }
}
