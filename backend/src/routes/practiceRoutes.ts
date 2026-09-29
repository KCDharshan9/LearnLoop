/**
 * Practice Routes.
 *
 * Mounts:
 * - POST /api/practice/start — start or resume practice session
 * - POST /api/practice/:sessionId/answer — submit answer and adapt
 * - GET /api/practice/:sessionId — get session state and current question
 */

import { Router } from 'express'
import {
  getPracticeSessionHandler,
  startPracticeHandler,
  submitAnswerHandler,
} from '../controllers/practiceController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const practiceRouter = Router()

practiceRouter.post('/start', requireAuth, startPracticeHandler)
practiceRouter.post('/:sessionId/answer', requireAuth, submitAnswerHandler)
practiceRouter.get('/:sessionId', requireAuth, getPracticeSessionHandler)
