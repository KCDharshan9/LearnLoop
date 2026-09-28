/**
 * Learning Path routes.
 *
 * POST /api/learning-paths/:learningPathId/steps/:stepId/complete — complete step
 */

import { Router } from 'express'
import { completeStep } from '../controllers/learningPathController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const learningPathRouter = Router()

learningPathRouter.post('/:learningPathId/steps/:stepId/complete', requireAuth, completeStep)
