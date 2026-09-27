/**
 * Assessment controller.
 *
 * Handles HTTP requests for:
 * - GET /api/assessments/:assessmentId (retrieves assessment and starts/fetches in-progress attempt)
 * - POST /api/assessments/:assessmentId/attempts (submits and scores attempt)
 * - GET /api/assessment-attempts/:attemptId (retrieves scored attempt result)
 */

import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js'
import type { ApiError } from '../types/api.js'
import type { SubmittedAnswer } from '../types/assessment.js'
import {
  AssessmentError,
  getDefaultDiagnostic,
  getAssessmentAttemptById,
  getOrCreateDiagnosticAttempt,
  submitAssessmentAttempt,
} from '../services/assessmentService.js'

/**
 * GET /api/assessments/diagnostic/default
 *
 * Returns default diagnostic assessment ID and title.
 */
export async function getDefaultDiagnosticAssessment(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const diagnostic = await getDefaultDiagnostic()
    response.status(200).json({ success: true, data: diagnostic })
  } catch (error) {
    if (error instanceof AssessmentError) {
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(404).json(body)
      return
    }
    throw error
  }
}

/**
 * GET /api/assessments/:assessmentId
 *
 * Prepares and returns the assessment configuration with questions
 * (without revealing correct answers) and establishes an in-progress attempt.
 */
export async function getAssessment(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const rawAssessmentId = request.params.assessmentId
  const assessmentId = Array.isArray(rawAssessmentId) ? rawAssessmentId[0] : rawAssessmentId

  if (!assessmentId || !assessmentId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'assessmentId is required.' },
    }
    response.status(400).json(body)
    return
  }

  // Resolve studentId from authenticated student profile or query
  let studentId = authReq.user.profileId
  if (!studentId && (authReq.user.role === 'ADMIN' || authReq.user.role === 'TEACHER')) {
    studentId = (request.query.studentId as string) || undefined
  }

  if (!studentId) {
    const body: ApiError = {
      success: false,
      error: { code: 'FORBIDDEN', message: 'A student profile is required to take an assessment.' },
    }
    response.status(403).json(body)
    return
  }

  try {
    const result = await getOrCreateDiagnosticAttempt(assessmentId.trim(), studentId)
    response.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AssessmentError) {
      const status = error.code === 'ASSESSMENT_NOT_FOUND' ? 404 : 400
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(status).json(body)
      return
    }
    throw error
  }
}

/**
 * POST /api/assessments/:assessmentId/attempts
 *
 * Evaluates submitted answers, calculates competency scores,
 * detects learning gaps, and persists learner skill states and progress history.
 */
export async function postAssessmentAttempt(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const rawAssessmentId = request.params.assessmentId
  const assessmentId = Array.isArray(rawAssessmentId) ? rawAssessmentId[0] : rawAssessmentId

  if (!assessmentId || !assessmentId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'assessmentId is required.' },
    }
    response.status(400).json(body)
    return
  }

  const { answers, attemptId, studentId: requestedStudentId } = request.body ?? {}

  // Enforce student ownership
  let studentId = authReq.user.profileId
  if (authReq.user.role === 'STUDENT') {
    if (!studentId) {
      const body: ApiError = {
        success: false,
        error: { code: 'FORBIDDEN', message: 'No student profile associated with this account.' },
      }
      response.status(403).json(body)
      return
    }
    if (requestedStudentId && requestedStudentId !== studentId) {
      const body: ApiError = {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Submitting attempts on behalf of another student is forbidden.' },
      }
      response.status(403).json(body)
      return
    }
  } else if (authReq.user.role === 'TEACHER' || authReq.user.role === 'ADMIN') {
    studentId = requestedStudentId || studentId
  }

  if (!studentId) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'studentId is required for assessment attempt.' },
    }
    response.status(400).json(body)
    return
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'answers must be a non-empty array.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const result = await submitAssessmentAttempt(
      assessmentId.trim(),
      studentId,
      answers as SubmittedAnswer[],
      typeof attemptId === 'string' ? attemptId.trim() : undefined,
    )

    response.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AssessmentError) {
      const status = error.code === 'ASSESSMENT_NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : 400
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(status).json(body)
      return
    }
    throw error
  }
}

/**
 * GET /api/assessment-attempts/:attemptId
 *
 * Retrieves a persisted assessment attempt result.
 */
export async function getAssessmentAttempt(request: Request, response: Response): Promise<void> {
  const authReq = request as AuthenticatedRequest
  const rawAttemptId = request.params.attemptId
  const attemptId = Array.isArray(rawAttemptId) ? rawAttemptId[0] : rawAttemptId

  if (!attemptId || !attemptId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'attemptId is required.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const result = await getAssessmentAttemptById(attemptId.trim(), authReq.user)
    response.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error instanceof AssessmentError) {
      const status = error.code === 'ATTEMPT_NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : 400
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(status).json(body)
      return
    }
    throw error
  }
}
