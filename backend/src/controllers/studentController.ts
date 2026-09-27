/**
 * Student controller.
 *
 * Handles HTTP requests for:
 * - GET /api/students/:studentId (retrieves learner profile)
 * - GET /api/students/:studentId/progress (retrieves learner progress timeline)
 */

import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js'
import type { ApiError } from '../types/api.js'
import {
  StudentServiceError,
  getStudentProfile,
  getStudentProgress,
} from '../services/studentService.js'

/**
 * GET /api/students/:studentId
 *
 * Retrieves learner profile including current competency snapshot and overall summary.
 */
export async function getProfile(request: Request, response: Response): Promise<void> {
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
    const profile = await getStudentProfile(studentId, authReq.user)
    response.status(200).json({ success: true, data: profile })
  } catch (error) {
    if (error instanceof StudentServiceError) {
      const statusCode =
        error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'STUDENT_NOT_FOUND'
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

    console.error('[StudentController] Unexpected error in getProfile:', error)
    const body: ApiError = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve student profile.' },
    }
    response.status(500).json(body)
  }
}

/**
 * GET /api/students/:studentId/progress
 *
 * Retrieves learner historical progress timeline and progression events.
 */
export async function getProgress(request: Request, response: Response): Promise<void> {
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
    const progress = await getStudentProgress(studentId, authReq.user)
    response.status(200).json({ success: true, data: progress })
  } catch (error) {
    if (error instanceof StudentServiceError) {
      const statusCode =
        error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'STUDENT_NOT_FOUND'
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

    console.error('[StudentController] Unexpected error in getProgress:', error)
    const body: ApiError = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve student progress.' },
    }
    response.status(500).json(body)
  }
}
