/**
 * Scoring service.
 *
 * Centralizes all educational scoring and competency classification logic.
 * Prototype thresholds:
 *   0 to 39%   = NEEDS_SUPPORT
 *   40 to 69%  = DEVELOPING
 *   70 to 100% = MASTERED
 */

import type { CompetencyStatus } from '../types/assessment.js'
import type { QuestionType } from '../types/questions.js'

export const COMPETENCY_THRESHOLDS = {
  NEEDS_SUPPORT_MAX: 39,
  DEVELOPING_MIN: 40,
  DEVELOPING_MAX: 69,
  MASTERED_MIN: 70,
} as const

/**
 * Classifies a percentage score (0-100) into a standard CompetencyStatus.
 */
export function classifyCompetency(score: number): CompetencyStatus {
  if (score >= COMPETENCY_THRESHOLDS.MASTERED_MIN) {
    return 'MASTERED'
  }
  if (score >= COMPETENCY_THRESHOLDS.DEVELOPING_MIN) {
    return 'DEVELOPING'
  }
  return 'NEEDS_SUPPORT'
}

/**
 * Calculates a percentage score safely handling zero division.
 */
export function calculateScore(correct: number, total: number): number {
  if (total <= 0) return 0
  const ratio = (correct / total) * 100
  return Math.min(100, Math.max(0, Math.round(ratio)))
}

/**
 * Normalizes an answer string or value for robust comparison.
 */
function normalizeAnswer(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return String(val).toLowerCase()
  if (typeof val === 'string') {
    // Trim whitespace and collapse multiple spaces; also strip spaces around arithmetic operators
    return val
      .trim()
      .toLowerCase()
      .replace(/\s*([+\-×*\/÷=])\s*/g, '$1')
      .replace(/\s+/g, ' ')
  }
  return String(val).trim().toLowerCase()
}

/**
 * Server-authoritative answer evaluation.
 * Compares a submitted answer against the question's official correctAnswer.
 */
export function evaluateAnswer(
  submitted: unknown,
  correct: unknown,
  _type: QuestionType,
): boolean {
  if (submitted === null || submitted === undefined) {
    return false
  }

  // 1. Direct equality
  if (submitted === correct) {
    return true
  }

  // 2. Numeric equality (e.g. 12 === "12" or 12.0 === 12)
  const numSubmitted = Number(submitted)
  const numCorrect = Number(correct)
  if (
    !Number.isNaN(numSubmitted) &&
    !Number.isNaN(numCorrect) &&
    numSubmitted === numCorrect &&
    typeof submitted !== 'boolean' &&
    typeof correct !== 'boolean'
  ) {
    return true
  }

  // 3. Normalized string comparison
  const strSubmitted = normalizeAnswer(submitted)
  const strCorrect = normalizeAnswer(correct)

  return strSubmitted === strCorrect
}
