/**
 * Frontend Assessment types.
 */

export type CompetencyStatus = 'NEEDS_SUPPORT' | 'DEVELOPING' | 'MASTERED'

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED'

export type GapType =
  | 'PREREQUISITE_WEAKNESS'
  | 'DIRECT_TARGET_WEAKNESS'
  | 'DEVELOPING_PRACTICE'
  | 'MASTERY'

export type RecommendationAction =
  | 'PREREQUISITE_REINFORCEMENT'
  | 'DIRECT_INSTRUCTION'
  | 'TARGETED_PRACTICE'
  | 'ADVANCED_PROGRESSION'

export interface SubmittedAnswer {
  questionId: string
  answer: unknown
}

export interface ClientQuestion {
  id: string
  skillId: string
  skillName?: string
  skillSlug?: string
  prompt: string
  type: string
  difficulty: number
  options: { label: string; value: unknown }[]
}

export interface AssessmentData {
  id: string
  title: string
  type: string
  questionCount: number
  questions: ClientQuestion[]
}

export interface SkillResult {
  skillId: string
  skillName: string
  skillSlug: string
  correct: number
  attempted: number
  score: number
  status: CompetencyStatus
}

export interface LearningGap {
  targetSkillId: string
  targetSkillName: string
  targetSkillSlug: string
  targetScore: number
  targetStatus: CompetencyStatus
  prerequisiteSkillId?: string
  prerequisiteSkillName?: string
  prerequisiteSkillSlug?: string
  prerequisiteScore?: number
  prerequisiteStatus?: CompetencyStatus
  gapType: GapType
  summary: string
  detail: string
}

export interface Recommendation {
  focusSkillId: string
  focusSkillName: string
  focusSkillSlug: string
  actionType: RecommendationAction
  headline: string
  description: string
  priorityOrder: number
}

export interface AssessmentAttemptResult {
  attemptId: string
  assessmentId: string
  studentId: string
  status: AttemptStatus
  startedAt: string
  submittedAt?: string
  overallScore: number
  skillResults: SkillResult[]
  learningGap?: LearningGap
  recommendation?: Recommendation
}
