/**
 * Question controller.
 *
 * Handles HTTP requests for retrieving questions with filters and executing
 * deterministic question selection.
 */

import type { Request, Response } from 'express'
import type { ApiError } from '../types/api.js'
import type { QuestionFilters, QuestionType, SelectQuestionsOptions } from '../types/questions.js'
import {
  getQuestionById,
  getQuestions as queryQuestions,
  QuestionError,
  selectQuestions,
} from '../services/questionService.js'

const VALID_TYPES = new Set<QuestionType>([
  'MCQ',
  'NUMBER_INPUT',
  'TRUE_FALSE',
  'MATCHING',
  'INTERACTIVE',
])

/**
 * GET /api/questions
 *
 * Query parameters:
 * - skill / skillId: string (slug or ObjectId)
 * - difficulty: number (positive integer)
 * - type: MCQ | NUMBER_INPUT | TRUE_FALSE | MATCHING | INTERACTIVE
 * - active: 'true' | 'false'
 * - level: number
 * - limit: number
 */
export async function getQuestions(request: Request, response: Response): Promise<void> {
  try {
    const filters: QuestionFilters = {}

    // Skill filter
    const skillParam = request.query.skill ?? request.query.skillId
    if (typeof skillParam === 'string' && skillParam.trim()) {
      filters.skill = skillParam.trim()
    }

    // Difficulty filter
    if (request.query.difficulty !== undefined) {
      const difficulty = Number(request.query.difficulty)
      if (Number.isNaN(difficulty) || difficulty < 1) {
        const body: ApiError = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'difficulty must be a positive integer.' },
        }
        response.status(400).json(body)
        return
      }
      filters.difficulty = difficulty
    }

    // Question type filter
    if (request.query.type !== undefined) {
      const typeStr = String(request.query.type).trim() as QuestionType
      if (!VALID_TYPES.has(typeStr)) {
        const body: ApiError = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `type must be one of: ${[...VALID_TYPES].join(', ')}.`,
          },
        }
        response.status(400).json(body)
        return
      }
      filters.type = typeStr
    }

    // Active status filter
    if (request.query.active !== undefined) {
      filters.active = request.query.active === 'true'
    }

    // Level filter
    if (request.query.level !== undefined) {
      const level = Number(request.query.level)
      if (Number.isNaN(level) || level < 1) {
        const body: ApiError = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'level must be a positive integer.' },
        }
        response.status(400).json(body)
        return
      }
      filters.level = level
    }

    // Limit filter
    if (request.query.limit !== undefined) {
      const limit = Number(request.query.limit)
      if (Number.isNaN(limit) || limit < 1) {
        const body: ApiError = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'limit must be a positive integer.' },
        }
        response.status(400).json(body)
        return
      }
      filters.limit = limit
    }

    const questions = await queryQuestions(filters)
    response.status(200).json({ success: true, data: { questions, total: questions.length } })
  } catch (error) {
    if (error instanceof QuestionError) {
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(400).json(body)
      return
    }
    throw error
  }
}

/**
 * GET /api/questions/:questionId
 */
export async function getQuestion(request: Request, response: Response): Promise<void> {
  const rawQuestionId = request.params.questionId
  const questionId = Array.isArray(rawQuestionId) ? rawQuestionId[0] : rawQuestionId

  if (!questionId || !questionId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'questionId parameter is required.' },
    }
    response.status(400).json(body)
    return
  }

  const question = await getQuestionById(questionId.trim())
  if (!question) {
    const body: ApiError = {
      success: false,
      error: { code: 'QUESTION_NOT_FOUND', message: `Question '${questionId}' not found.` },
    }
    response.status(404).json(body)
    return
  }

  response.status(200).json({ success: true, data: { question } })
}

/**
 * POST /api/questions/select
 * or GET /api/questions/select
 *
 * Deterministically selects existing questions from the bank for a skill and difficulty.
 */
export async function handleSelectQuestions(request: Request, response: Response): Promise<void> {
  try {
    const isGet = request.method === 'GET'
    const source = isGet ? request.query : request.body

    const skillId = (source.skillId ?? source.skill) as string | undefined
    if (!skillId || typeof skillId !== 'string' || !skillId.trim()) {
      const body: ApiError = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'skillId is required for question selection.' },
      }
      response.status(400).json(body)
      return
    }

    let difficulty: number | undefined
    if (source.difficulty !== undefined && source.difficulty !== '') {
      difficulty = Number(source.difficulty)
      if (Number.isNaN(difficulty) || difficulty < 1) {
        const body: ApiError = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'difficulty must be a positive integer.' },
        }
        response.status(400).json(body)
        return
      }
    }

    let count = 1
    if (source.count !== undefined && source.count !== '') {
      count = Number(source.count)
      if (Number.isNaN(count) || count < 1 || !Number.isInteger(count)) {
        const body: ApiError = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'count must be a positive integer.' },
        }
        response.status(400).json(body)
        return
      }
    }

    let excludeQuestionIds: string[] = []
    if (Array.isArray(source.excludeQuestionIds)) {
      excludeQuestionIds = source.excludeQuestionIds.map(String)
    }

    const selectOptions: SelectQuestionsOptions = {
      skillId: skillId.trim(),
      difficulty,
      count,
      excludeQuestionIds,
    }

    const questions = await selectQuestions(selectOptions)

    response.status(200).json({
      success: true,
      data: {
        questions,
        count: questions.length,
        requestedCount: count,
        skillId: skillId.trim(),
        difficultyRequested: difficulty,
      },
    })
  } catch (error) {
    if (error instanceof QuestionError) {
      const status = error.code === 'SKILL_NOT_FOUND' ? 404 : 400
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(status).json(body)
      return
    }
    throw error
  }
}
