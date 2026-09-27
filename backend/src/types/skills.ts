/**
 * Skill types and interfaces.
 */

export interface SkillSummary {
  id: string
  name: string
  slug: string
  description: string
  level: number
  competency: string
  order: number
  prerequisiteIds: string[]
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface SkillDetail extends SkillSummary {
  prerequisites: SkillSummary[]
  prerequisiteChain: SkillSummary[]
}

export interface SkillFilters {
  level?: number
  active?: boolean
}
