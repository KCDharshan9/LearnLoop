/**
 * Student and Learner Profile Service.
 *
 * Composes real learner profile, current competencies, diagnostic insights,
 * and historical progress from existing collections:
 * - Student & User (identity and profile info)
 * - LearnerSkillState (current competency snapshots)
 * - AssessmentAttempt (latest diagnostic evidence)
 * - ProgressHistory (historical progression timeline)
 * - Skill (metadata for skills)
 */

import { Types } from 'mongoose'
import {
  Assessment,
  AssessmentAttempt,
  LearnerSkillState,
  ProgressHistory,
  Skill,
  Student,
  User,
} from '../models/index.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  LearnerProfileResponse,
  LearnerProgressResponse,
  LearnerSummary,
  LatestDiagnosticSummary,
  ProgressHistoryEntry,
  StudentProfileInfo,
  StudentSkillCompetency,
} from '../types/student.js'
import type { CompetencyStatus } from '../types/assessment.js'

export class StudentServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'StudentServiceError'
  }
}

/**
 * Checks authorization:
 * A student can only view their own profile/progress.
 * Teachers and Admins have authorized access.
 */
function assertAuthorized(studentId: string, requester: AuthenticatedUser): void {
  if (requester.role === 'STUDENT') {
    if (!requester.profileId || requester.profileId !== studentId) {
      throw new StudentServiceError(
        'FORBIDDEN',
        'You are not authorized to view another student’s profile or progress.',
      )
    }
  }
}

/**
 * Helper to fetch student identity info.
 */
async function fetchStudentProfileInfo(studentId: string): Promise<StudentProfileInfo> {
  if (!Types.ObjectId.isValid(studentId)) {
    throw new StudentServiceError('VALIDATION_ERROR', 'Invalid student ID.')
  }

  const studentDoc = (await Student.findById(studentId).lean().exec()) as any
  if (!studentDoc) {
    throw new StudentServiceError('STUDENT_NOT_FOUND', `Student '${studentId}' not found.`)
  }

  const userDoc = (await User.findById(studentDoc.userId).lean().exec()) as any
  const email = userDoc ? (userDoc.email as string) : ''

  return {
    id: studentDoc._id.toString(),
    studentCode: studentDoc.studentCode,
    name: studentDoc.name,
    email,
    grade: studentDoc.grade,
    currentLevel: studentDoc.currentLevel,
    teacherIds: (studentDoc.teacherIds ?? []).map((tId: any) => tId.toString()),
    createdAt: studentDoc.createdAt ? new Date(studentDoc.createdAt).toISOString() : undefined,
  }
}

/**
 * Retrieves student profile with current competency snapshot and overall summary.
 *
 * GET /api/students/:studentId
 */
export async function getStudentProfile(
  studentId: string,
  requester: AuthenticatedUser,
): Promise<LearnerProfileResponse> {
  assertAuthorized(studentId, requester)

  const studentInfo = await fetchStudentProfileInfo(studentId)
  const studentObjId = new Types.ObjectId(studentId)

  // 1. Fetch current competency states for this student
  const skillStates = (await LearnerSkillState.find({ studentId: studentObjId })
    .lean()
    .exec()) as any[]

  // 2. Fetch skill metadata (name, slug, level, order)
  const skillIds = skillStates.map((s) => s.skillId)
  const skills = (await Skill.find({ _id: { $in: skillIds } })
    .select('_id name slug level order')
    .lean()
    .exec()) as any[]

  const skillMetaMap = new Map<string, { name: string; slug: string; level: number; order: number }>()
  for (const sk of skills) {
    skillMetaMap.set(sk._id.toString(), {
      name: sk.name,
      slug: sk.slug,
      level: sk.level,
      order: sk.order,
    })
  }

  // 3. Construct structured skill competencies sorted by order
  const skillCompetencies: StudentSkillCompetency[] = skillStates
    .map((state) => {
      const skIdStr = state.skillId.toString()
      const meta = skillMetaMap.get(skIdStr)
      return {
        skillId: skIdStr,
        skillName: meta?.name ?? 'Unknown Skill',
        skillSlug: meta?.slug ?? 'unknown',
        level: meta?.level ?? 1,
        order: meta?.order ?? 999,
        score: state.score,
        status: state.status as CompetencyStatus,
        previousScore: state.previousScore,
        trend: state.trend ?? 'UNKNOWN',
        evidenceCount: state.evidenceCount ?? 1,
        lastAssessedAt: state.lastAssessedAt
          ? new Date(state.lastAssessedAt).toISOString()
          : new Date().toISOString(),
        source: state.source ?? 'DIAGNOSTIC',
      }
    })
    .sort((a, b) => a.order - b.order)

  // 4. Derive Strengths, Developing Areas, and Support Areas
  const strengths = skillCompetencies.filter((sc) => sc.status === 'MASTERED')
  const developingAreas = skillCompetencies.filter((sc) => sc.status === 'DEVELOPING')
  const supportAreas = skillCompetencies.filter((sc) => sc.status === 'NEEDS_SUPPORT')

  // 5. Fetch latest completed diagnostic attempt
  const latestAttempt = (await AssessmentAttempt.findOne({
    studentId: studentObjId,
    status: 'SUBMITTED',
  })
    .sort({ submittedAt: -1 })
    .lean()
    .exec()) as any

  let latestDiagnostic: LatestDiagnosticSummary | undefined
  if (latestAttempt) {
    let assessmentTitle = 'Diagnostic Assessment'
    if (latestAttempt.assessmentId) {
      const assessmentDoc = (await Assessment.findById(latestAttempt.assessmentId)
        .select('title')
        .lean()
        .exec()) as any
      if (assessmentDoc?.title) {
        assessmentTitle = assessmentDoc.title
      }
    }

    // Determine latest diagnostic competency status based on overallScore
    let attemptStatus: CompetencyStatus = 'NEEDS_SUPPORT'
    const score = latestAttempt.overallScore ?? 0
    if (score >= 70) {
      attemptStatus = 'MASTERED'
    } else if (score >= 40) {
      attemptStatus = 'DEVELOPING'
    }

    latestDiagnostic = {
      attemptId: latestAttempt._id.toString(),
      assessmentTitle,
      submittedAt: latestAttempt.submittedAt
        ? new Date(latestAttempt.submittedAt).toISOString()
        : new Date(latestAttempt.createdAt).toISOString(),
      overallScore: score,
      competencyStatus: attemptStatus,
      learningGap: latestAttempt.learningGap,
      recommendation: latestAttempt.recommendation,
    }
  }

  // 6. Build overall learner summary
  const summary: LearnerSummary = {
    totalAssessedSkills: skillCompetencies.length,
    masteredCount: strengths.length,
    developingCount: developingAreas.length,
    needsSupportCount: supportAreas.length,
    strengths,
    supportAreas,
    developingAreas,
    latestDiagnostic,
  }

  return {
    student: studentInfo,
    summary,
    skillCompetencies,
  }
}

/**
 * Retrieves historical progress timeline for a student.
 *
 * GET /api/students/:studentId/progress
 */
export async function getStudentProgress(
  studentId: string,
  requester: AuthenticatedUser,
): Promise<LearnerProgressResponse> {
  assertAuthorized(studentId, requester)

  const studentInfo = await fetchStudentProfileInfo(studentId)
  const studentObjId = new Types.ObjectId(studentId)

  // 1. Fetch raw progress history, ordered chronologically descending (newest first)
  const historyDocs = (await ProgressHistory.find({ studentId: studentObjId })
    .sort({ timestamp: -1 })
    .lean()
    .exec()) as any[]

  // 2. Fetch skill metadata for history entries
  const skillIds = historyDocs.map((h) => h.skillId)
  const skills = (await Skill.find({ _id: { $in: skillIds } })
    .select('_id name slug level order')
    .lean()
    .exec()) as any[]

  const skillMetaMap = new Map<string, { name: string; slug: string; level: number; order: number }>()
  for (const sk of skills) {
    skillMetaMap.set(sk._id.toString(), {
      name: sk.name,
      slug: sk.slug,
      level: sk.level,
      order: sk.order,
    })
  }

  const history: ProgressHistoryEntry[] = historyDocs.map((doc) => {
    const skIdStr = doc.skillId.toString()
    const meta = skillMetaMap.get(skIdStr)
    const prevScore = doc.previousScore
    const newScore = doc.newScore
    const changeDelta = prevScore !== undefined && prevScore !== null ? newScore - prevScore : 0

    return {
      id: doc._id.toString(),
      skillId: skIdStr,
      skillName: meta?.name ?? 'Unknown Skill',
      skillSlug: meta?.slug ?? 'unknown',
      eventType: doc.eventType,
      previousScore: doc.previousScore,
      newScore: doc.newScore,
      previousStatus: doc.previousStatus,
      newStatus: doc.newStatus,
      changeDelta,
      timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : new Date().toISOString(),
    }
  })

  // 3. Fetch current competency states
  const currentStates = (await LearnerSkillState.find({ studentId: studentObjId })
    .lean()
    .exec()) as any[]

  const currentCompetencies: StudentSkillCompetency[] = currentStates
    .map((state) => {
      const skIdStr = state.skillId.toString()
      const meta = skillMetaMap.get(skIdStr)
      return {
        skillId: skIdStr,
        skillName: meta?.name ?? 'Unknown Skill',
        skillSlug: meta?.slug ?? 'unknown',
        level: meta?.level ?? 1,
        order: meta?.order ?? 999,
        score: state.score,
        status: state.status as CompetencyStatus,
        previousScore: state.previousScore,
        trend: state.trend ?? 'UNKNOWN',
        evidenceCount: state.evidenceCount ?? 1,
        lastAssessedAt: state.lastAssessedAt
          ? new Date(state.lastAssessedAt).toISOString()
          : new Date().toISOString(),
        source: state.source ?? 'DIAGNOSTIC',
      }
    })
    .sort((a, b) => a.order - b.order)

  return {
    student: studentInfo,
    history,
    currentCompetencies,
  }
}
