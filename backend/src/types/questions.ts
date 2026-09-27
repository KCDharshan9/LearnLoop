/**
 * Question types and interfaces.
 */

export type QuestionType =
  | 'MCQ'
  | 'NUMBER_INPUT'
  | 'TRUE_FALSE'
  | 'MATCHING'
  | 'INTERACTIVE'

export interface QuestionOption {
  label: string
  value: unknown
}

export interface QuestionData {
  id: string
  skillId: string
  prerequisiteSkillIds: string[]
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
  createdAt?: string
  updatedAt?: string
}

export interface QuestionFilters {
  skill?: string
  skillId?: string
  difficulty?: number
  type?: QuestionType
  active?: boolean
  level?: number
  limit?: number
}

export interface SelectQuestionsOptions {
  skillId: string
  difficulty?: number
  count?: number
  excludeQuestionIds?: string[]
}

export interface SelectQuestionsResult {
  questions: QuestionData[]
  count: number
  skillId: string
  difficultyRequested?: number
}
