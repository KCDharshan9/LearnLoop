/**
 * Skill routes.
 *
 * GET /api/skills           — lists all active skills (optional ?level=&active=)
 * GET /api/skills/:skillId  — gets skill by slug or ObjectId with resolved prerequisite chain
 */

import { Router } from 'express'
import { getSkill, getSkills } from '../controllers/skillController.js'

export const skillRouter = Router()

skillRouter.get('/', getSkills)
skillRouter.get('/:skillId', getSkill)
