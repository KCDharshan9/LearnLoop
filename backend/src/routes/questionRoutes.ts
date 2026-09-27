/**
 * Question routes.
 *
 * GET  /api/questions         — filter questions by skill, difficulty, type, active, level
 * GET  /api/questions/select  — deterministic selection via query params
 * POST /api/questions/select  — deterministic selection via JSON body
 * GET  /api/questions/:questionId — retrieve single question by ID
 */

import { Router } from 'express'
import {
  getQuestion,
  getQuestions,
  handleSelectQuestions,
} from '../controllers/questionController.js'

export const questionRouter = Router()

questionRouter.get('/', getQuestions)
questionRouter.get('/select', handleSelectQuestions)
questionRouter.post('/select', handleSelectQuestions)
questionRouter.get('/:questionId', getQuestion)
