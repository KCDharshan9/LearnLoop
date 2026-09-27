/**
 * Assessment routes.
 *
 * GET  /api/assessments/diagnostic/default — retrieve default diagnostic metadata
 * GET  /api/assessments/:assessmentId      — get assessment config and questions (auth required)
 * POST /api/assessments/:assessmentId/attempts — submit assessment attempt (auth required)
 */

import { Router } from 'express'
import {
  getAssessment,
  getDefaultDiagnosticAssessment,
  postAssessmentAttempt,
} from '../controllers/assessmentController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const assessmentRouter = Router()

assessmentRouter.get('/diagnostic/default', getDefaultDiagnosticAssessment)
assessmentRouter.get('/:assessmentId', requireAuth, getAssessment)
assessmentRouter.post('/:assessmentId/attempts', requireAuth, postAssessmentAttempt)
