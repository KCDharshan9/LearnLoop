/**
 * Skill controller.
 *
 * Handles HTTP requests for listing skills and retrieving single skill details
 * with full prerequisite chain hierarchy.
 */

import type { Request, Response } from 'express'
import type { ApiError } from '../types/api.js'
import type { SkillFilters } from '../types/skills.js'
import { getAllSkills, getSkillById, SkillError } from '../services/skillService.js'

/**
 * GET /api/skills
 *
 * Supports query parameters:
 * - level: number
 * - active: 'true' | 'false'
 */
export async function getSkills(request: Request, response: Response): Promise<void> {
  try {
    const filters: SkillFilters = {}

    if (request.query.level !== undefined) {
      const parsedLevel = Number(request.query.level)
      if (Number.isNaN(parsedLevel) || parsedLevel < 1) {
        const body: ApiError = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'level must be a positive integer.' },
        }
        response.status(400).json(body)
        return
      }
      filters.level = parsedLevel
    }

    if (request.query.active !== undefined) {
      filters.active = request.query.active === 'true'
    }

    const skills = await getAllSkills(filters)
    response.status(200).json({ success: true, data: { skills, total: skills.length } })
  } catch (error) {
    if (error instanceof SkillError) {
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(400).json(body)
      return
    }
    throw error
  }
}

/**
 * GET /api/skills/:skillId
 *
 * skillId can be either a MongoDB ObjectId string or a skill slug (e.g. 'multiplication').
 * Returns full skill metadata and its resolved prerequisite chain.
 */
export async function getSkill(request: Request, response: Response): Promise<void> {
  const rawSkillId = request.params.skillId
  const skillId = Array.isArray(rawSkillId) ? rawSkillId[0] : rawSkillId

  if (!skillId || !skillId.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'skillId parameter is required.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const skill = await getSkillById(skillId.trim())

    if (!skill) {
      const body: ApiError = {
        success: false,
        error: { code: 'SKILL_NOT_FOUND', message: `Skill '${skillId}' not found.` },
      }
      response.status(404).json(body)
      return
    }

    response.status(200).json({ success: true, data: { skill } })
  } catch (error) {
    if (error instanceof SkillError) {
      const status = error.code === 'SKILL_NOT_FOUND' ? 404 : 400
      const body: ApiError = { success: false, error: { code: error.code, message: error.message } }
      response.status(status).json(body)
      return
    }
    throw error
  }
}
