/**
 * Assessment Attempt routes.
 *
 * GET /api/assessment-attempts/:attemptId — retrieve completed attempt result (auth required)
 */

import { Router } from 'express'
import { getAssessmentAttempt } from '../controllers/assessmentController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const assessmentAttemptRouter = Router()

assessmentAttemptRouter.get('/:attemptId', requireAuth, getAssessmentAttempt)
