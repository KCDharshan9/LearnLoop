/**
 * Assessment service.
 *
 * Coordinates diagnostic lifecycle:
 * - Starting or retrieving in-progress attempts with stable question sets.
 * - Server-authoritative answer scoring.
 * - Prerequisite-aware gap detection and recommendations.
 * - Updating current competency snapshots in learnerSkillStates.
 * - Preserving immutable historical records in progressHistory.
 * - Enforcing idempotency on duplicate submissions.
 */

import { Types } from 'mongoose'
import {
  Assessment,
  AssessmentAttempt,
  LearnerSkillState,
  ProgressHistory,
  Question,
  Skill,
  Student,
} from '../models/index.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  AssessmentAttemptResult,
  ClientQuestion,
  EvaluatedAnswer,
  SkillResult,
  SubmittedAnswer,
} from '../types/assessment.js'
import { calculateScore, classifyCompetency, evaluateAnswer } from './scoringService.js'
import { detectLearningGaps } from './gapDetectionService.js'

export class AssessmentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AssessmentError'
  }
}

interface RawAssessmentDoc {
  _id: Types.ObjectId
  title: string
  type: string
  skillIds: Types.ObjectId[]
  questionIds: Types.ObjectId[]
  questionCount: number
  active: boolean
}

interface RawQuestionDoc {
  _id: Types.ObjectId
  skillId: Types.ObjectId
  type: 'MCQ' | 'NUMBER_INPUT' | 'TRUE_FALSE' | 'MATCHING' | 'INTERACTIVE'
  difficulty: number
  prompt: string
  options: { label: string; value: unknown }[]
  correctAnswer: unknown
  explanation: string
  active: boolean
}

interface RawSkillDoc {
  _id: Types.ObjectId
  name: string
  slug: string
  order: number
}

function resolveObjectId(idOrSlug: string): Record<string, unknown> {
  const trimmed = idOrSlug.trim()
  if (Types.ObjectId.isValid(trimmed) && trimmed.length === 24) {
    return { _id: new Types.ObjectId(trimmed) }
  }
  return { title: trimmed }
}

/**
 * Retrieves assessment config and prepares a stable client-safe question set.
 * Creates an IN_PROGRESS attempt if one does not already exist for this student.
 */
export async function getOrCreateDiagnosticAttempt(
  assessmentIdentifier: string,
  studentId: string,
): Promise<{
  attemptId: string
  assessment: {
    id: string
    title: string
    type: string
    questionCount: number
    questions: ClientQuestion[]
  }
}> {
  if (!studentId || !Types.ObjectId.isValid(studentId)) {
    throw new AssessmentError('VALIDATION_ERROR', 'A valid studentId is required.')
  }

  const assessmentDoc = (await Assessment.findOne({
    ...resolveObjectId(assessmentIdentifier),
    active: true,
  })
    .lean()
    .exec()) as unknown as RawAssessmentDoc | null

  if (!assessmentDoc) {
    throw new AssessmentError('ASSESSMENT_NOT_FOUND', `Assessment '${assessmentIdentifier}' not found.`)
  }

  const studentObjId = new Types.ObjectId(studentId)

  // 1. Check for existing IN_PROGRESS attempt for this student and assessment
  let attempt = await AssessmentAttempt.findOne({
    assessmentId: assessmentDoc._id,
    studentId: studentObjId,
    status: 'IN_PROGRESS',
  })

  // 2. Fetch questions
  let rawQuestions: RawQuestionDoc[] = []
  if (assessmentDoc.questionIds && assessmentDoc.questionIds.length > 0) {
    rawQuestions = (await Question.find({
      _id: { $in: assessmentDoc.questionIds },
      active: true,
    })
      .sort({ difficulty: 1, _id: 1 })
      .lean()
      .exec()) as unknown as RawQuestionDoc[]
  } else {
    rawQuestions = (await Question.find({
      skillId: { $in: assessmentDoc.skillIds },
      active: true,
    })
      .sort({ difficulty: 1, _id: 1 })
      .limit(assessmentDoc.questionCount || 10)
      .lean()
      .exec()) as unknown as RawQuestionDoc[]
  }

  // Fetch skill names for display
  const skillIds = rawQuestions.map((q) => q.skillId)
  const skillDocs = (await Skill.find({ _id: { $in: skillIds } })
    .lean()
    .exec()) as unknown as RawSkillDoc[]
  const skillMap = new Map<string, RawSkillDoc>()
  for (const s of skillDocs) {
    skillMap.set(s._id.toString(), s)
  }

  // Sort questions by skill order, then difficulty
  rawQuestions.sort((a, b) => {
    const orderA = skillMap.get(a.skillId.toString())?.order ?? 0
    const orderB = skillMap.get(b.skillId.toString())?.order ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.difficulty - b.difficulty
  })

  // Create IN_PROGRESS attempt if none exists
  if (!attempt) {
    attempt = await AssessmentAttempt.create({
      assessmentId: assessmentDoc._id,
      studentId: studentObjId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      answers: [],
    })
  }

  // Format client questions WITHOUT exposing correctAnswer or explanation
  const clientQuestions: ClientQuestion[] = rawQuestions.map((q) => {
    const skill = skillMap.get(q.skillId.toString())
    return {
      id: q._id.toString(),
      skillId: q.skillId.toString(),
      skillName: skill?.name,
      skillSlug: skill?.slug,
      prompt: q.prompt,
      type: q.type,
      difficulty: q.difficulty,
      options: (q.options ?? []).map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    }
  })

  return {
    attemptId: attempt._id.toString(),
    assessment: {
      id: assessmentDoc._id.toString(),
      title: assessmentDoc.title,
      type: assessmentDoc.type,
      questionCount: clientQuestions.length,
      questions: clientQuestions,
    },
  }
}

/**
 * Submits an assessment attempt, evaluates answers, scores skills,
 * detects gaps, updates learner skill states, records progress history,
 * and handles duplicate submissions idempotently.
 */
export async function submitAssessmentAttempt(
  assessmentIdentifier: string,
  studentId: string,
  answers: SubmittedAnswer[],
  attemptId?: string,
): Promise<AssessmentAttemptResult> {
  if (!studentId || !Types.ObjectId.isValid(studentId)) {
    throw new AssessmentError('VALIDATION_ERROR', 'A valid studentId is required.')
  }

  const assessmentDoc = (await Assessment.findOne(
    resolveObjectId(assessmentIdentifier),
  )
    .lean()
    .exec()) as unknown as RawAssessmentDoc | null

  if (!assessmentDoc) {
    throw new AssessmentError('ASSESSMENT_NOT_FOUND', `Assessment '${assessmentIdentifier}' not found.`)
  }

  const studentObjId = new Types.ObjectId(studentId)

  // Find the attempt
  let attempt = null
  if (attemptId && Types.ObjectId.isValid(attemptId)) {
    attempt = await AssessmentAttempt.findById(attemptId)
  }

  if (!attempt) {
    // Look for recent IN_PROGRESS attempt
    attempt = await AssessmentAttempt.findOne({
      assessmentId: assessmentDoc._id,
      studentId: studentObjId,
      status: 'IN_PROGRESS',
    })
  }

  // Idempotency: If attempt was already SUBMITTED, return the existing result directly
  if (attempt && attempt.status === 'SUBMITTED') {
    return await formatAttemptResult(attempt)
  }

  // If no in-progress attempt found, create a new one to persist submission
  if (!attempt) {
    attempt = new AssessmentAttempt({
      assessmentId: assessmentDoc._id,
      studentId: studentObjId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    })
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    throw new AssessmentError('VALIDATION_ERROR', 'answers array cannot be empty.')
  }

  // 1. Fetch Question documents from MongoDB for server-side evaluation
  const submittedQuestionIds = answers
    .map((a) => a.questionId)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id))

  const questionsInDb = (await Question.find({
    _id: { $in: submittedQuestionIds },
  })
    .lean()
    .exec()) as unknown as RawQuestionDoc[]

  const questionMap = new Map<string, RawQuestionDoc>()
  for (const q of questionsInDb) {
    questionMap.set(q._id.toString(), q)
  }

  // 2. Evaluate answers server-side
  const evaluatedAnswers: EvaluatedAnswer[] = []
  for (const sub of answers) {
    const qDoc = questionMap.get(sub.questionId)
    if (!qDoc) continue

    const isCorrect = evaluateAnswer(sub.answer, qDoc.correctAnswer, qDoc.type)
    evaluatedAnswers.push({
      questionId: qDoc._id.toString(),
      answer: sub.answer,
      isCorrect,
      skillId: qDoc.skillId.toString(),
      difficulty: qDoc.difficulty,
      answeredAt: new Date(),
    })
  }

  if (evaluatedAnswers.length === 0) {
    throw new AssessmentError('VALIDATION_ERROR', 'No valid questions were submitted.')
  }

  // 3. Calculate skill-level scores
  const skillAnswerMap = new Map<string, { correct: number; total: number }>()
  for (const ans of evaluatedAnswers) {
    const current = skillAnswerMap.get(ans.skillId) ?? { correct: 0, total: 0 }
    current.total += 1
    if (ans.isCorrect) current.correct += 1
    skillAnswerMap.set(ans.skillId, current)
  }

  const skillIds = [...skillAnswerMap.keys()].map((id) => new Types.ObjectId(id))
  const skillDocs = (await Skill.find({ _id: { $in: skillIds } })
    .lean()
    .exec()) as unknown as RawSkillDoc[]

  const skillMetaMap = new Map<string, RawSkillDoc>()
  for (const s of skillDocs) {
    skillMetaMap.set(s._id.toString(), s)
  }

  const skillResults: SkillResult[] = []
  let totalCorrect = 0
  let totalAttempted = 0

  for (const [sId, counts] of skillAnswerMap.entries()) {
    const skillMeta = skillMetaMap.get(sId)
    const score = calculateScore(counts.correct, counts.total)
    const status = classifyCompetency(score)

    totalCorrect += counts.correct
    totalAttempted += counts.total

    skillResults.push({
      skillId: sId,
      skillName: skillMeta?.name ?? 'Unknown Skill',
      skillSlug: skillMeta?.slug ?? sId,
      correct: counts.correct,
      attempted: counts.total,
      score,
      status,
    })
  }

  const overallScore = calculateScore(totalCorrect, totalAttempted)

  // 4. Prerequisite-aware learning gap detection
  const { learningGap, recommendation } = await detectLearningGaps(skillResults)

  // 5. Update AssessmentAttempt document
  attempt.status = 'SUBMITTED'
  attempt.submittedAt = new Date()
  attempt.answers = evaluatedAnswers.map((a) => ({
    questionId: new Types.ObjectId(a.questionId),
    answer: a.answer,
    isCorrect: a.isCorrect,
    skillId: new Types.ObjectId(a.skillId),
    difficulty: a.difficulty,
    answeredAt: a.answeredAt,
  })) as unknown as typeof attempt.answers
  attempt.skillResults = skillResults.map((r) => ({
    skillId: new Types.ObjectId(r.skillId),
    correct: r.correct,
    attempted: r.attempted,
    score: r.score,
    status: r.status,
  })) as unknown as typeof attempt.skillResults
  attempt.overallScore = overallScore
  attempt.learningGap = learningGap
  attempt.recommendation = recommendation

  await attempt.save()

  // 6. Update current snapshot in learnerSkillStates
  for (const res of skillResults) {
    const existingState = await LearnerSkillState.findOne({
      studentId: studentObjId,
      skillId: new Types.ObjectId(res.skillId),
    })

    const previousScore = existingState ? existingState.score : undefined
    const previousStatus = existingState ? existingState.status : undefined
    const trend =
      previousScore !== undefined
        ? res.score > previousScore
          ? 'IMPROVING'
          : res.score < previousScore
            ? 'DECLINING'
            : 'STABLE'
        : 'UNKNOWN'

    await LearnerSkillState.findOneAndUpdate(
      { studentId: studentObjId, skillId: new Types.ObjectId(res.skillId) },
      {
        $set: {
          studentId: studentObjId,
          skillId: new Types.ObjectId(res.skillId),
          score: res.score,
          status: res.status,
          lastAssessedAt: new Date(),
          previousScore,
          trend,
          source: 'DIAGNOSTIC',
        },
        $inc: { evidenceCount: res.attempted },
      },
      { upsert: true, returnDocument: 'after' },
    )

    // 7. Record immutable historical evidence in progressHistory
    await ProgressHistory.create({
      studentId: studentObjId,
      skillId: new Types.ObjectId(res.skillId),
      eventType: 'DIAGNOSTIC',
      previousScore,
      newScore: res.score,
      previousStatus,
      newStatus: res.status,
      relatedAssessmentId: assessmentDoc._id,
      timestamp: new Date(),
    })
  }

  return await formatAttemptResult(attempt)
}

/**
 * Retrieves a persisted assessment attempt by ID, enforcing ownership.
 */
export async function getAssessmentAttemptById(
  attemptId: string,
  requester: AuthenticatedUser,
): Promise<AssessmentAttemptResult> {
  if (!attemptId || !Types.ObjectId.isValid(attemptId)) {
    throw new AssessmentError('VALIDATION_ERROR', 'Valid attemptId is required.')
  }

  const attempt = await AssessmentAttempt.findById(attemptId)
  if (!attempt) {
    throw new AssessmentError('ATTEMPT_NOT_FOUND', `Attempt '${attemptId}' not found.`)
  }

  // Authorization: Student can only view their own attempt
  if (requester.role === 'STUDENT') {
    if (!requester.profileId || attempt.studentId.toString() !== requester.profileId) {
      throw new AssessmentError(
        'FORBIDDEN',
        'You are not authorized to view another student’s assessment attempt.',
      )
    }
  }

  return await formatAttemptResult(attempt)
}

/**
 * Retrieves default diagnostic assessment definition.
 */
export async function getDefaultDiagnostic(): Promise<{ id: string; title: string }> {
  const diagnostic = await Assessment.findOne({ type: 'DIAGNOSTIC', active: true })
    .select('_id title')
    .lean()
    .exec()

  if (!diagnostic) {
    throw new AssessmentError('ASSESSMENT_NOT_FOUND', 'Default diagnostic assessment not found.')
  }

  return {
    id: (diagnostic._id as { toString(): string }).toString(),
    title: diagnostic.title as string,
  }
}

async function formatAttemptResult(attempt: any): Promise<AssessmentAttemptResult> {
  const skillIds = (attempt.skillResults ?? []).map((r: any) => r.skillId)
  const skills = (await Skill.find({ _id: { $in: skillIds } })
    .select('_id name slug')
    .lean()
    .exec()) as unknown as { _id: Types.ObjectId; name: string; slug: string }[]

  const skillMap = new Map<string, { name: string; slug: string }>()
  for (const s of skills) {
    skillMap.set(s._id.toString(), { name: s.name, slug: s.slug })
  }

  return {
    attemptId: attempt._id.toString(),
    assessmentId: attempt.assessmentId.toString(),
    studentId: attempt.studentId.toString(),
    status: attempt.status,
    startedAt: attempt.startedAt?.toISOString() ?? new Date().toISOString(),
    submittedAt: attempt.submittedAt?.toISOString(),
    overallScore: attempt.overallScore ?? 0,
    skillResults: (attempt.skillResults ?? []).map((r: any) => {
      const sId = r.skillId.toString()
      const meta = skillMap.get(sId)
      return {
        skillId: sId,
        skillName: meta?.name ?? '',
        skillSlug: meta?.slug ?? '',
        correct: r.correct,
        attempted: r.attempted,
        score: r.score,
        status: r.status,
      }
    }),
    learningGap: attempt.learningGap,
    recommendation: attempt.recommendation,
    answers: (attempt.answers ?? []).map((a: any) => ({
      questionId: a.questionId.toString(),
      answer: a.answer,
      isCorrect: a.isCorrect,
      skillId: a.skillId.toString(),
      difficulty: a.difficulty,
      answeredAt: a.answeredAt,
    })),
  }
}
