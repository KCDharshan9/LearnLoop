/**
 * Practice domain types.
 *
 * Types for the Phase 7 Adaptive Practice feature:
 * - Practice sessions and lifecycle states.
 * - Client-safe practice questions without answer leaks.
 * - Adaptive engine actions and feedback.
 */

import type { QuestionOption, QuestionType } from './questions.js'

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

export interface StartPracticeInput {
  learningPathId?: string
  stepNumber?: number
  skillId?: string
}

export interface SubmitPracticeAnswerInput {
  questionId: string
  answer: unknown
  hintUsed?: boolean
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

export interface StartPracticeResult {
  session: PracticeSessionData
  question?: ClientPracticeQuestion
  resumed: boolean
  sessionComplete?: boolean
}
