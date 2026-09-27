/**
 * Frontend Question types.
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
  source: string
  active: boolean
}

export interface QuestionFilters {
  skill?: string
  difficulty?: number
  type?: QuestionType
  active?: boolean
  limit?: number
}

export interface SelectQuestionsOptions {
  skillId: string
  difficulty?: number
  count?: number
}
