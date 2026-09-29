/**
 * Frontend practice domain types.
 */

import type { QuestionOption, QuestionType } from './questions'

export type PracticeSessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED'

export type PracticeAction =
  | 'CONTINUE'
  | 'INCREASE_DIFFICULTY'
  | 'DECREASE_DIFFICULTY'
  | 'REVIEW_PREREQUISITE'
  | 'COMPLETE'

export interface ClientPracticeQuestion {
  id: string
  skillId: string
  skillName?: string
  prompt: string
  type: QuestionType
  difficulty: number
  options: QuestionOption[]
}

export interface PracticeSessionData {
  id: string
  studentId: string
  skillId: string
  skillName?: string
  learningPathId?: string
  stepNumber?: number
  currentDifficulty: number
  totalAnswered: number
  correctCount: number
  consecutiveCorrect: number
  consecutiveIncorrect: number
  status: PracticeSessionStatus
  startedAt: string
  completedAt?: string
}

export interface StartPracticeResult {
  session: PracticeSessionData
  question?: ClientPracticeQuestion
  resumed: boolean
  sessionComplete?: boolean
}

export interface PracticeAnswerResult {
  isCorrect: boolean
  explanation: string
  correctAnswer: unknown
  previousDifficulty: number
  nextDifficulty: number
  nextAction: PracticeAction
  supportMessage?: string
  sessionComplete: boolean
  session: PracticeSessionData
  nextQuestion?: ClientPracticeQuestion
}
