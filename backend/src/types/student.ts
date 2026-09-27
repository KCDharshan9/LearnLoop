/**
 * Student and Learner Profile types.
 */

import type { CompetencyStatus, LearningGap, Recommendation } from './assessment.js'

export interface StudentProfileInfo {
  id: string
  studentCode: string
  name: string
  email: string
  grade: number
  currentLevel: number
  teacherIds: string[]
  createdAt?: string
}

export interface StudentSkillCompetency {
  skillId: string
  skillName: string
  skillSlug: string
  level: number
  order: number
  score: number
  status: CompetencyStatus
  previousScore?: number
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN'
  evidenceCount: number
  lastAssessedAt: string
  source: 'DIAGNOSTIC' | 'PRACTICE' | 'REASSESSMENT' | 'MANUAL'
}

export interface LatestDiagnosticSummary {
  attemptId: string
  assessmentTitle: string
  submittedAt: string
  overallScore: number
  competencyStatus: CompetencyStatus
  learningGap?: LearningGap
  recommendation?: Recommendation
}

export interface LearnerSummary {
  totalAssessedSkills: number
  masteredCount: number
  developingCount: number
  needsSupportCount: number
  strengths: StudentSkillCompetency[]
  supportAreas: StudentSkillCompetency[]
  developingAreas: StudentSkillCompetency[]
  latestDiagnostic?: LatestDiagnosticSummary
}

export interface LearnerProfileResponse {
  student: StudentProfileInfo
  summary: LearnerSummary
  skillCompetencies: StudentSkillCompetency[]
}

export interface ProgressHistoryEntry {
  id: string
  skillId: string
  skillName: string
  skillSlug: string
  eventType: string
  previousScore?: number
  newScore: number
  previousStatus?: CompetencyStatus
  newStatus: CompetencyStatus
  changeDelta: number
  timestamp: string
}

export interface LearnerProgressResponse {
  student: StudentProfileInfo
  history: ProgressHistoryEntry[]
  currentCompetencies: StudentSkillCompetency[]
}
