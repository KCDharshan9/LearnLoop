/**
 * Deterministic Question Generation Service (Boundary).
 *
 * ARCHITECTURAL CONTRACT:
 * - Question Selection: Choose existing questions from the seeded question bank.
 * - Question Generation: Create new questions using deterministic templates/parameters.
 *
 * LearnLoop is strictly NON-AI. Future deterministic question generation
 * will use rule-based algorithmic templates (e.g. arithmetic operand ranges,
 * equal-group configurations) producing output conforming to the standard QuestionData interface.
 *
 * This file establishes a clean boundary so generation can be plugged in during
 * future practice/assessment phases without modifying the selection system.
 */

import type { QuestionData, QuestionType } from '../types/questions.js'

export interface GenerationTemplateConfig {
  skillId: string
  difficulty: number
  type: QuestionType
  templateKey: string
  parameters: Record<string, unknown>
}

export interface GeneratedQuestionResult {
  question: Omit<QuestionData, 'id'> & { source: 'GENERATED' }
  templateKey: string
  seedUsed?: number
}

/**
 * Placeholder generator function adhering to the generation boundary.
 * Throws an explicit error in Phase 3 as question generation belongs to later phases.
 */
export function generateQuestionFromTemplate(
  _config: GenerationTemplateConfig,
): GeneratedQuestionResult {
  throw new Error('Deterministic question generation is scheduled for a future phase.')
}
