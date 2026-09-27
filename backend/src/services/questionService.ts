/**
 * Question service.
 *
 * Implements business logic for querying questions, filtering the question bank,
 * and performing deterministic question selection without randomness.
 */

import { Types } from 'mongoose'
import { Question } from '../models/index.js'
import type {
  QuestionData,
  QuestionFilters,
  QuestionOption,
  QuestionType,
  SelectQuestionsOptions,
} from '../types/questions.js'
import { findSkillDoc } from './skillService.js'

export class QuestionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'QuestionError'
  }
}

interface RawQuestionDoc {
  _id: Types.ObjectId
  skillId: Types.ObjectId
  prerequisiteSkillIds: Types.ObjectId[]
  type: QuestionType
  difficulty: number
  prompt: string
  options: QuestionOption[]
  correctAnswer: unknown
  explanation: string
  competency: string
  level: number
  generationTemplate?: unknown
  source: string
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

function toQuestionData(doc: RawQuestionDoc): QuestionData {
  return {
    id: doc._id.toString(),
    skillId: doc.skillId.toString(),
    prerequisiteSkillIds: (doc.prerequisiteSkillIds ?? []).map((id) => id.toString()),
    type: doc.type,
    difficulty: doc.difficulty,
    prompt: doc.prompt,
    options: (doc.options ?? []).map((option) => ({
      label: option.label,
      value: option.value,
    })),
    correctAnswer: doc.correctAnswer,
    explanation: doc.explanation,
    competency: doc.competency,
    level: doc.level,
    generationTemplate: doc.generationTemplate,
    source: doc.source,
    active: doc.active,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  }
}

/**
 * Retrieves questions with optional filtering.
 * Deterministically sorted by difficulty ascending, then ID ascending.
 */
export async function getQuestions(filters?: QuestionFilters): Promise<QuestionData[]> {
  const query: Record<string, unknown> = {}

  // Active status filter (default to active: true if not specified)
  if (filters?.active !== undefined) {
    query.active = filters.active
  } else {
    query.active = true
  }

  // Skill filter (supports slug or ObjectId)
  const skillParam = filters?.skill ?? filters?.skillId
  if (skillParam) {
    const skillDoc = await findSkillDoc(skillParam)
    if (!skillDoc) {
      // Skill does not exist, return empty list
      return []
    }
    query.skillId = skillDoc._id
  }

  // Difficulty filter
  if (filters?.difficulty !== undefined) {
    query.difficulty = filters.difficulty
  }

  // Type filter
  if (filters?.type) {
    query.type = filters.type
  }

  // Level filter
  if (filters?.level !== undefined) {
    query.level = filters.level
  }

  let dbQuery = Question.find(query).sort({ difficulty: 1, _id: 1 })

  if (filters?.limit && filters.limit > 0) {
    dbQuery = dbQuery.limit(filters.limit)
  }

  const rawDocs = (await dbQuery.lean().exec()) as unknown as RawQuestionDoc[]
  return rawDocs.map(toQuestionData)
}

/**
 * Retrieves a single question by its unique ID.
 */
export async function getQuestionById(id: string): Promise<QuestionData | null> {
  const trimmed = id.trim()
  if (!Types.ObjectId.isValid(trimmed)) return null

  const doc = (await Question.findById(new Types.ObjectId(trimmed)).lean().exec()) as unknown as RawQuestionDoc | null
  return doc ? toQuestionData(doc) : null
}

/**
 * Deterministic question selection service.
 *
 * Requirements:
 * 1. Restricts questions to the requested skill.
 * 2. Respects requested difficulty where possible.
 * 3. Returns only active/usable questions.
 * 4. Avoids duplicate questions within one selection result.
 * 5. Respects requested count when enough questions exist.
 * 6. Behaves predictably when fewer questions are available.
 * 7. 100% deterministic (no random numbers).
 */
export async function selectQuestions(options: SelectQuestionsOptions): Promise<QuestionData[]> {
  const { skillId, difficulty, count = 1, excludeQuestionIds = [] } = options

  if (!skillId || !skillId.trim()) {
    throw new QuestionError('VALIDATION_ERROR', 'skillId is required for question selection.')
  }

  if (count <= 0 || !Number.isInteger(count)) {
    throw new QuestionError('VALIDATION_ERROR', 'count must be a positive integer.')
  }

  const targetSkill = await findSkillDoc(skillId)
  if (!targetSkill) {
    throw new QuestionError('SKILL_NOT_FOUND', `Skill '${skillId}' not found.`)
  }

  // Build exclusion list of valid ObjectIds
  const excludedObjectIds = excludeQuestionIds
    .filter((id) => Types.ObjectId.isValid(id.trim()))
    .map((id) => new Types.ObjectId(id.trim()))

  const query: Record<string, unknown> = {
    skillId: targetSkill._id,
    active: true,
  }

  if (excludedObjectIds.length > 0) {
    query._id = { $nin: excludedObjectIds }
  }

  // Fetch all eligible questions for this skill in deterministic order
  const rawDocs = (await Question.find(query).sort({ difficulty: 1, _id: 1 }).lean().exec()) as unknown as RawQuestionDoc[]
  const allAvailable = rawDocs.map(toQuestionData)

  if (allAvailable.length === 0) {
    return []
  }

  const selected: QuestionData[] = []
  const selectedIds = new Set<string>()

  function addQuestion(q: QuestionData): boolean {
    if (!selectedIds.has(q.id)) {
      selectedIds.add(q.id)
      selected.push(q)
      return true
    }
    return false
  }

  if (difficulty !== undefined) {
    // 1. First priority: exact difficulty match
    const exactMatches = allAvailable.filter((q) => q.difficulty === difficulty)
    for (const question of exactMatches) {
      if (selected.length >= count) break
      addQuestion(question)
    }

    // 2. Second priority: if fewer than count, pick from remaining difficulties
    // ordered deterministically by distance from requested difficulty, then difficulty, then ID
    if (selected.length < count) {
      const remaining = allAvailable
        .filter((q) => !selectedIds.has(q.id))
        .sort((a, b) => {
          const distA = Math.abs(a.difficulty - difficulty)
          const distB = Math.abs(b.difficulty - difficulty)
          if (distA !== distB) return distA - distB
          if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
          return a.id.localeCompare(b.id)
        })

      for (const question of remaining) {
        if (selected.length >= count) break
        addQuestion(question)
      }
    }
  } else {
    // No difficulty requested: take in standard deterministic order
    for (const question of allAvailable) {
      if (selected.length >= count) break
      addQuestion(question)
    }
  }

  return selected
}
