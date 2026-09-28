/**
 * Student routes.
 *
 * GET /api/students/:studentId          — retrieve learner profile & competencies
 * GET /api/students/:studentId/progress — retrieve learner progress timeline
 */

import { Router } from 'express'
import { getProfile, getProgress } from '../controllers/studentController.js'
import { getStudentLearningPath } from '../controllers/learningPathController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const studentRouter = Router()

studentRouter.get('/:studentId', requireAuth, getProfile)
studentRouter.get('/:studentId/progress', requireAuth, getProgress)
studentRouter.get('/:studentId/learning-path', requireAuth, getStudentLearningPath)
