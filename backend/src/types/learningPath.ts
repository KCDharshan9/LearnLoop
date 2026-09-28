/**
 * Learning Path types and interfaces.
 */

export type StepType = 'REVIEW' | 'INTERACTIVE_ACTIVITY' | 'PRACTICE' | 'REASSESSMENT'
export type StepStatus = 'PENDING' | 'CURRENT' | 'COMPLETED'
export type LearningPathStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

export interface LearningActivityDetail {
  id: string
  title: string
  description: string
  type: string
  content?: Record<string, unknown>
  difficulty?: number
}

export interface LearningPathStep {
  stepNumber: number
  type: StepType
  skillId: string
  skillName: string
  skillSlug: string
  title: string
  description: string
  activityId?: string
  activity?: LearningActivityDetail
  status: StepStatus
  completedAt?: string
}

export interface LearningPathData {
  id: string
  studentId: string
  targetSkillId: string
  targetSkillName: string
  targetSkillSlug: string
  reason: string
  status: LearningPathStatus
  steps: LearningPathStep[]
  currentStepNumber: number
  totalSteps: number
  completedSteps: number
  createdAt: string
  updatedAt: string
}

export interface LearningPathResponse {
  hasPath: boolean
  learningPath: LearningPathData | null
  message?: string
}
