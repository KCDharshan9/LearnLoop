/**
 * Skill service.
 *
 * Implements business logic for querying skills, retrieving prerequisite
 * information, and performing prerequisite chain traversals across the competency graph.
 */

import { Types } from 'mongoose'
import { Skill } from '../models/index.js'
import type { SkillDetail, SkillFilters, SkillSummary } from '../types/skills.js'

export class SkillError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'SkillError'
  }
}

interface RawSkillDoc {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string
  level: number
  competency: string
  order: number
  prerequisiteIds: Types.ObjectId[]
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

function toSkillSummary(doc: RawSkillDoc): SkillSummary {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    level: doc.level,
    competency: doc.competency,
    order: doc.order,
    prerequisiteIds: (doc.prerequisiteIds ?? []).map((id) => id.toString()),
    active: doc.active,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  }
}

function buildSkillQuery(identifier: string): Record<string, unknown> {
  const trimmed = identifier.trim()
  if (Types.ObjectId.isValid(trimmed) && trimmed.length === 24) {
    return { $or: [{ _id: new Types.ObjectId(trimmed) }, { slug: trimmed }] }
  }
  return { slug: trimmed }
}

/**
 * Retrieves all active skills, ordered by level and presentation order.
 */
export async function getAllSkills(filters?: SkillFilters): Promise<SkillSummary[]> {
  const query: Record<string, unknown> = {}

  if (filters?.active !== undefined) {
    query.active = filters.active
  } else {
    // Default to active skills
    query.active = true
  }

  if (filters?.level !== undefined) {
    query.level = filters.level
  }

  const rawDocs = await Skill.find(query).sort({ order: 1, level: 1 }).lean().exec()
  return (rawDocs as unknown as RawSkillDoc[]).map(toSkillSummary)
}

/**
 * Resolves a single skill document by its ObjectId or slug.
 */
export async function findSkillDoc(identifier: string): Promise<RawSkillDoc | null> {
  if (!identifier || !identifier.trim()) return null
  const query = buildSkillQuery(identifier)
  const doc = await Skill.findOne(query).lean().exec()
  return (doc as unknown as RawSkillDoc) ?? null
}

/**
 * Traverses prerequisite relationships for a given skill and returns the
 * ordered prerequisite chain from immediate prerequisite down to foundational root.
 *
 * Example traversal for Multiplication:
 * Multiplication -> Repeated Addition -> Addition -> Number Sense
 * Returns: [Repeated Addition, Addition, Number Sense]
 */
export async function getPrerequisiteChain(skillIdOrSlug: string): Promise<SkillSummary[]> {
  const targetSkill = await findSkillDoc(skillIdOrSlug)
  if (!targetSkill) {
    throw new SkillError('SKILL_NOT_FOUND', `Skill '${skillIdOrSlug}' not found.`)
  }

  const chain: SkillSummary[] = []
  const visited = new Set<string>([targetSkill._id.toString()])
  const queue: Types.ObjectId[] = [...(targetSkill.prerequisiteIds ?? [])]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const idString = currentId.toString()

    if (visited.has(idString)) {
      continue
    }

    visited.add(idString)

    const prereqDoc = (await Skill.findById(currentId).lean().exec()) as unknown as RawSkillDoc | null
    if (!prereqDoc) {
      continue
    }

    chain.push(toSkillSummary(prereqDoc))

    // Enqueue prerequisites of this prerequisite to continue chain traversal
    if (prereqDoc.prerequisiteIds && prereqDoc.prerequisiteIds.length > 0) {
      for (const nextPrereqId of prereqDoc.prerequisiteIds) {
        if (!visited.has(nextPrereqId.toString())) {
          queue.push(nextPrereqId)
        }
      }
    }
  }

  return chain
}

/**
 * Retrieves full skill details including direct prerequisites and the
 * complete prerequisite chain.
 */
export async function getSkillById(identifier: string): Promise<SkillDetail | null> {
  const targetDoc = await findSkillDoc(identifier)
  if (!targetDoc) return null

  // Fetch direct prerequisites
  const directPrereqDocs = (await Skill.find({
    _id: { $in: targetDoc.prerequisiteIds ?? [] },
  })
    .sort({ order: 1 })
    .lean()
    .exec()) as unknown as RawSkillDoc[]

  const directPrerequisites = directPrereqDocs.map(toSkillSummary)
  const prerequisiteChain = await getPrerequisiteChain(targetDoc._id.toString())

  const baseSummary = toSkillSummary(targetDoc)

  return {
    ...baseSummary,
    prerequisites: directPrerequisites,
    prerequisiteChain,
  }
}
