/**
 * Practice Service.
 *
 * Implements Phase 7: Real Adaptive Practice
 * - Deterministic, rule-based adaptive engine (no AI, no ML, no randomness).
 * - Manages PracticeSession lifecycle: start, resume, evaluate, adapt, complete.
 * - Idempotent answer submissions preventing duplicate attempts or counter drift.
 * - Formative assessment evidence: persists PracticeAttempt records without aggressively
 *   overwriting diagnostic competency snapshots in learnerSkillStates.
 * - Connects learning path PRACTICE steps: advances learning path on session completion.
 */

import { Types } from 'mongoose'
import {
  LearnerSkillState,
  LearningPath,
  PracticeAttempt,
  PracticeSession,
  Question,
  Skill,
} from '../models/index.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  ClientPracticeQuestion,
  PracticeAction,
  PracticeAnswerResult,
  PracticeSessionData,
  StartPracticeInput,
  StartPracticeResult,
} from '../types/practice.js'
import { evaluateAnswer } from './scoringService.js'
import { selectQuestions } from './questionService.js'
import { completeLearningPathStep } from './learningPathService.js'

export const TARGET_SESSION_QUESTIONS = 5

export class PracticeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'PracticeError'
  }
}

function assertStudentAccess(studentId: string | undefined, requester: AuthenticatedUser): asserts studentId is string {
  if (requester.role !== 'STUDENT') {
    throw new PracticeError(
      'FORBIDDEN',
      'Only students can participate in adaptive practice sessions.',
    )
  }
  if (!studentId || !requester.profileId || requester.profileId !== studentId) {
    throw new PracticeError(
      'FORBIDDEN',
      'You are not authorized to access another student’s practice session.',
    )
  }
}

async function formatSessionData(sessionDoc: any): Promise<PracticeSessionData> {
  const skill = await Skill.findById(sessionDoc.skillId).select('name').lean().exec() as { name: string } | null

  return {
    id: sessionDoc._id.toString(),
    studentId: sessionDoc.studentId.toString(),
    skillId: sessionDoc.skillId.toString(),
    skillName: skill?.name,
    learningPathId: sessionDoc.learningPathId ? sessionDoc.learningPathId.toString() : undefined,
    stepNumber: sessionDoc.stepNumber,
    currentDifficulty: sessionDoc.currentDifficulty,
    totalAnswered: sessionDoc.totalAnswered ?? 0,
    correctCount: sessionDoc.correctCount ?? 0,
    consecutiveCorrect: sessionDoc.consecutiveCorrect ?? 0,
    consecutiveIncorrect: sessionDoc.consecutiveIncorrect ?? 0,
    status: sessionDoc.status,
    startedAt: sessionDoc.startedAt instanceof Date ? sessionDoc.startedAt.toISOString() : new Date().toISOString(),
    completedAt: sessionDoc.completedAt instanceof Date ? sessionDoc.completedAt.toISOString() : undefined,
  }
}

function toClientQuestion(q: any, skillName?: string): ClientPracticeQuestion {
  return {
    id: (q._id ? q._id.toString() : q.id),
    skillId: (q.skillId ? q.skillId.toString() : ''),
    skillName,
    prompt: q.prompt,
    type: q.type,
    difficulty: q.difficulty,
    options: (q.options ?? []).map((opt: any) => ({
      label: opt.label,
      value: opt.value,
    })),
  }
}

/**
 * Starts or resumes a practice session.
 * Reuses existing ACTIVE session for the same learning-path practice step to preserve state across refreshes.
 */
export async function startOrResumePractice(
  input: StartPracticeInput,
  requester: AuthenticatedUser,
): Promise<StartPracticeResult> {
  let studentId = requester.profileId
  let targetSkillId: Types.ObjectId | null = null
  let learningPathDoc: any = null

  if (input.learningPathId) {
    if (!Types.ObjectId.isValid(input.learningPathId)) {
      throw new PracticeError('VALIDATION_ERROR', 'Invalid learningPathId.')
    }

    learningPathDoc = await LearningPath.findById(input.learningPathId)
    if (!learningPathDoc) {
      throw new PracticeError('NOT_FOUND', `Learning path '${input.learningPathId}' not found.`)
    }

    studentId = learningPathDoc.studentId.toString()
    assertStudentAccess(studentId, requester)

    if (input.stepNumber === undefined || input.stepNumber <= 0) {
      throw new PracticeError('VALIDATION_ERROR', 'A valid stepNumber is required.')
    }

    const steps = (learningPathDoc.steps ?? []) as any[]
    const targetStep = steps.find((s) => s.stepNumber === input.stepNumber)

    if (!targetStep) {
      throw new PracticeError('NOT_FOUND', `Step ${input.stepNumber} not found in learning path.`)
    }

    if (targetStep.type !== 'PRACTICE') {
      throw new PracticeError(
        'INVALID_STEP',
        `Step ${input.stepNumber} is of type '${targetStep.type}', not 'PRACTICE'.`,
      )
    }

    targetSkillId = targetStep.skillId

    // Check for an existing ACTIVE session for this student, path, and step
    const existingActiveSession = await PracticeSession.findOne({
      studentId: learningPathDoc.studentId,
      learningPathId: learningPathDoc._id,
      stepNumber: input.stepNumber,
      status: 'ACTIVE',
    })

    if (existingActiveSession) {
      // Resume existing active session
      let clientQ: ClientPracticeQuestion | undefined

      if (existingActiveSession.currentQuestionId) {
        const qDoc = await Question.findById(existingActiveSession.currentQuestionId).lean().exec()
        if (qDoc && qDoc.active) {
          const skill = await Skill.findById(qDoc.skillId).select('name').lean().exec() as { name: string } | null
          clientQ = toClientQuestion(qDoc, skill?.name)
        }
      }

      // If current question wasn't available, select the next one deterministically
      if (!clientQ) {
        const selected = await selectQuestions({
          skillId: existingActiveSession.skillId.toString(),
          difficulty: existingActiveSession.currentDifficulty,
          count: 1,
          excludeQuestionIds: (existingActiveSession.questionHistory ?? []).map((id) => id.toString()),
        })

        if (selected.length > 0) {
          const nextQ = selected[0]
          existingActiveSession.currentQuestionId = new Types.ObjectId(nextQ.id)
          existingActiveSession.currentDifficulty = nextQ.difficulty
          existingActiveSession.questionHistory.push(new Types.ObjectId(nextQ.id))
          await existingActiveSession.save()
          const skill = await Skill.findById(nextQ.skillId).select('name').lean().exec() as { name: string } | null
          clientQ = toClientQuestion(nextQ, skill?.name)
        } else {
          // Pool exhausted
          existingActiveSession.status = 'COMPLETED'
          existingActiveSession.completedAt = new Date()
          await existingActiveSession.save()
          await completeLearningPathStep(learningPathDoc._id.toString(), input.stepNumber, requester)

          const formattedSession = await formatSessionData(existingActiveSession)
          return {
            session: formattedSession,
            resumed: true,
            sessionComplete: true,
          }
        }
      }

      const formattedSession = await formatSessionData(existingActiveSession)
      return {
        session: formattedSession,
        question: clientQ,
        resumed: true,
        sessionComplete: false,
      }
    }

    // If step is already COMPLETED and no active session exists
    if (targetStep.status === 'COMPLETED') {
      const lastSession = await PracticeSession.findOne({
        studentId: learningPathDoc.studentId,
        learningPathId: learningPathDoc._id,
        stepNumber: input.stepNumber,
      }).sort({ completedAt: -1 })

      if (lastSession) {
        const formattedSession = await formatSessionData(lastSession)
        return {
          session: formattedSession,
          resumed: false,
          sessionComplete: true,
        }
      }
    }
  } else if (input.skillId) {
    if (!studentId) {
      throw new PracticeError('UNAUTHORIZED', 'Authenticated student required.')
    }
    assertStudentAccess(studentId, requester)

    const skillDoc = await Skill.findById(input.skillId)
    if (!skillDoc) {
      throw new PracticeError('NOT_FOUND', `Skill '${input.skillId}' not found.`)
    }
    targetSkillId = skillDoc._id

    // Check for an existing ACTIVE session for direct skill practice
    const existingActiveSession = await PracticeSession.findOne({
      studentId: new Types.ObjectId(studentId),
      skillId: targetSkillId,
      learningPathId: { $exists: false },
      status: 'ACTIVE',
    })

    if (existingActiveSession && existingActiveSession.currentQuestionId) {
      const qDoc = await Question.findById(existingActiveSession.currentQuestionId).lean().exec()
      if (qDoc && qDoc.active) {
        const skill = await Skill.findById(qDoc.skillId).select('name').lean().exec() as { name: string } | null
        const formattedSession = await formatSessionData(existingActiveSession)
        return {
          session: formattedSession,
          question: toClientQuestion(qDoc, skill?.name),
          resumed: true,
          sessionComplete: false,
        }
      }
    }
  } else {
    throw new PracticeError(
      'VALIDATION_ERROR',
      'Either learningPathId with stepNumber or skillId must be provided.',
    )
  }

  if (!targetSkillId || !studentId) {
    throw new PracticeError('VALIDATION_ERROR', 'Could not resolve student or skill.')
  }

  // Determine starting difficulty from existing learner evidence
  const learnerState = await LearnerSkillState.findOne({
    studentId: new Types.ObjectId(studentId),
    skillId: targetSkillId,
  })

  let startingDifficulty = 1
  if (learnerState) {
    if (learnerState.score >= 70) {
      startingDifficulty = 3
    } else if (learnerState.score >= 40) {
      startingDifficulty = 2
    } else {
      startingDifficulty = 1
    }
  }

  // Select initial question
  const initialQuestions = await selectQuestions({
    skillId: targetSkillId.toString(),
    difficulty: startingDifficulty,
    count: 1,
  })

  if (initialQuestions.length === 0) {
    throw new PracticeError('NOT_FOUND', 'No practice questions available for this skill.')
  }

  const initialQuestion = initialQuestions[0]
  const skill = await Skill.findById(targetSkillId).select('name').lean().exec() as { name: string } | null

  // Create new PracticeSession
  const newSession = await PracticeSession.create({
    studentId: new Types.ObjectId(studentId),
    skillId: targetSkillId,
    learningPathId: learningPathDoc ? learningPathDoc._id : undefined,
    stepNumber: input.stepNumber,
    currentDifficulty: initialQuestion.difficulty,
    currentQuestionId: new Types.ObjectId(initialQuestion.id),
    questionHistory: [new Types.ObjectId(initialQuestion.id)],
    correctCount: 0,
    totalAnswered: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    status: 'ACTIVE',
    startedAt: new Date(),
  })

  const formattedSession = await formatSessionData(newSession)
  return {
    session: formattedSession,
    question: toClientQuestion(initialQuestion, skill?.name),
    resumed: false,
    sessionComplete: false,
  }
}

/**
 * Evaluates a submitted answer, records a PracticeAttempt, adapts difficulty,
 * deterministically selects the next question, and updates learning path when complete.
 * Safe and idempotent against duplicate submissions.
 */
export async function submitPracticeAnswer(
  sessionId: string,
  questionId: string,
  answer: unknown,
  hintUsed: boolean | undefined,
  requester: AuthenticatedUser,
): Promise<PracticeAnswerResult> {
  if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
    throw new PracticeError('VALIDATION_ERROR', 'A valid sessionId is required.')
  }
  if (!questionId || !Types.ObjectId.isValid(questionId)) {
    throw new PracticeError('VALIDATION_ERROR', 'A valid questionId is required.')
  }

  const session = await PracticeSession.findById(sessionId)
  if (!session) {
    throw new PracticeError('SESSION_NOT_FOUND', `Practice session '${sessionId}' not found.`)
  }

  assertStudentAccess(session.studentId.toString(), requester)

  // Fetch the question
  const questionDoc = await Question.findById(questionId)
  if (!questionDoc) {
    throw new PracticeError('QUESTION_NOT_FOUND', `Question '${questionId}' not found.`)
  }

  // IDEMPOTENCY CHECK:
  // If an attempt for this question in this session already exists, return the recorded result
  const existingAttempt = await PracticeAttempt.findOne({
    sessionId: session._id,
    questionId: questionDoc._id,
  })

  if (existingAttempt) {
    const formattedSession = await formatSessionData(session)
    let nextQ: ClientPracticeQuestion | undefined
    if (session.status === 'ACTIVE' && session.currentQuestionId) {
      const qDoc = await Question.findById(session.currentQuestionId).lean().exec()
      if (qDoc) {
        const skill = await Skill.findById(qDoc.skillId).select('name').lean().exec() as { name: string } | null
        nextQ = toClientQuestion(qDoc, skill?.name)
      }
    }

    return {
      isCorrect: existingAttempt.isCorrect,
      explanation: questionDoc.explanation,
      correctAnswer: questionDoc.correctAnswer,
      previousDifficulty: existingAttempt.previousDifficulty,
      nextDifficulty: existingAttempt.nextDifficulty,
      nextAction: session.status === 'COMPLETED' ? 'COMPLETE' : 'CONTINUE',
      sessionComplete: session.status === 'COMPLETED',
      session: formattedSession,
      nextQuestion: nextQ,
    }
  }

  if (session.status !== 'ACTIVE') {
    throw new PracticeError(
      'SESSION_COMPLETED',
      'Cannot submit answers to an inactive practice session.',
    )
  }

  // Server-authoritative answer evaluation
  const isCorrect = evaluateAnswer(answer, questionDoc.correctAnswer, questionDoc.type)

  const previousDifficulty = session.currentDifficulty
  let nextDifficulty = previousDifficulty
  let nextAction: PracticeAction = 'CONTINUE'
  let supportMessage: string | undefined

  const updatedTotal = (session.totalAnswered ?? 0) + 1
  let updatedCorrect = session.correctCount ?? 0
  let updatedConsecutiveCorrect = session.consecutiveCorrect ?? 0
  let updatedConsecutiveIncorrect = session.consecutiveIncorrect ?? 0

  if (isCorrect) {
    updatedCorrect += 1
    updatedConsecutiveCorrect += 1
    updatedConsecutiveIncorrect = 0

    // Evidence of success: advance difficulty if harder level exists (max 3)
    if (previousDifficulty < 3) {
      nextDifficulty = previousDifficulty + 1
      nextAction = 'INCREASE_DIFFICULTY'
    } else {
      nextDifficulty = 3
      nextAction = 'CONTINUE'
    }
  } else {
    updatedConsecutiveIncorrect += 1
    updatedConsecutiveCorrect = 0

    // Evidence of difficulty: reduce difficulty if above level 1
    if (previousDifficulty > 1) {
      nextDifficulty = previousDifficulty - 1
      nextAction = 'DECREASE_DIFFICULTY'
      supportMessage = 'Stepping down to a foundational problem to reinforce the core steps.'
    } else {
      nextDifficulty = 1
      if (updatedConsecutiveIncorrect >= 2) {
        nextAction = 'REVIEW_PREREQUISITE'
        supportMessage = 'Repeated difficulty detected. Reviewing earlier concepts before continuing can help build understanding.'
      } else {
        nextAction = 'CONTINUE'
        supportMessage = 'Check the explanation below to understand the key reasoning before continuing.'
      }
    }
  }

  // Persist PracticeAttempt
  await PracticeAttempt.create({
    sessionId: session._id,
    studentId: session.studentId,
    skillId: session.skillId,
    questionId: questionDoc._id,
    answer,
    isCorrect,
    difficulty: questionDoc.difficulty,
    previousDifficulty,
    nextDifficulty,
    hintUsed: Boolean(hintUsed),
  })

  // Check completion criteria
  const isTargetReached = updatedTotal >= TARGET_SESSION_QUESTIONS

  if (isTargetReached) {
    session.totalAnswered = updatedTotal
    session.correctCount = updatedCorrect
    session.consecutiveCorrect = updatedConsecutiveCorrect
    session.consecutiveIncorrect = updatedConsecutiveIncorrect
    session.currentDifficulty = nextDifficulty
    session.status = 'COMPLETED'
    session.completedAt = new Date()
    session.currentQuestionId = undefined
    await session.save()

    // Advance learning path step if connected
    if (session.learningPathId && session.stepNumber) {
      await completeLearningPathStep(
        session.learningPathId.toString(),
        session.stepNumber,
        requester,
      )
    }

    const formattedSession = await formatSessionData(session)
    return {
      isCorrect,
      explanation: questionDoc.explanation,
      correctAnswer: questionDoc.correctAnswer,
      previousDifficulty,
      nextDifficulty,
      nextAction: 'COMPLETE',
      supportMessage: 'Practice session completed! Great effort.',
      sessionComplete: true,
      session: formattedSession,
      nextQuestion: undefined,
    }
  }

  // Select next question deterministically
  const historyIds = (session.questionHistory ?? []).map((id) => id.toString())
  const selected = await selectQuestions({
    skillId: session.skillId.toString(),
    difficulty: nextDifficulty,
    count: 1,
    excludeQuestionIds: historyIds,
  })

  if (selected.length === 0) {
    // Question pool exhausted -> gracefully complete session
    session.totalAnswered = updatedTotal
    session.correctCount = updatedCorrect
    session.consecutiveCorrect = updatedConsecutiveCorrect
    session.consecutiveIncorrect = updatedConsecutiveIncorrect
    session.status = 'COMPLETED'
    session.completedAt = new Date()
    session.currentQuestionId = undefined
    await session.save()

    if (session.learningPathId && session.stepNumber) {
      await completeLearningPathStep(
        session.learningPathId.toString(),
        session.stepNumber,
        requester,
      )
    }

    const formattedSession = await formatSessionData(session)
    return {
      isCorrect,
      explanation: questionDoc.explanation,
      correctAnswer: questionDoc.correctAnswer,
      previousDifficulty,
      nextDifficulty,
      nextAction: 'COMPLETE',
      supportMessage: supportMessage || 'All available practice problems completed for this skill.',
      sessionComplete: true,
      session: formattedSession,
      nextQuestion: undefined,
    }
  }

  const nextQ = selected[0]
  session.totalAnswered = updatedTotal
  session.correctCount = updatedCorrect
  session.consecutiveCorrect = updatedConsecutiveCorrect
  session.consecutiveIncorrect = updatedConsecutiveIncorrect
  session.currentDifficulty = nextQ.difficulty
  session.currentQuestionId = new Types.ObjectId(nextQ.id)
  session.questionHistory.push(new Types.ObjectId(nextQ.id))
  await session.save()

  const skill = await Skill.findById(nextQ.skillId).select('name').lean().exec() as { name: string } | null
  const formattedSession = await formatSessionData(session)

  return {
    isCorrect,
    explanation: questionDoc.explanation,
    correctAnswer: questionDoc.correctAnswer,
    previousDifficulty,
    nextDifficulty: nextQ.difficulty,
    nextAction,
    supportMessage,
    sessionComplete: false,
    session: formattedSession,
    nextQuestion: toClientQuestion(nextQ, skill?.name),
  }
}

/**
 * Retrieves a session by ID, verifying student authorization.
 * Used for page refreshes and resuming.
 */
export async function getPracticeSession(
  sessionId: string,
  requester: AuthenticatedUser,
): Promise<StartPracticeResult> {
  if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
    throw new PracticeError('VALIDATION_ERROR', 'A valid sessionId is required.')
  }

  const session = await PracticeSession.findById(sessionId)
  if (!session) {
    throw new PracticeError('SESSION_NOT_FOUND', `Practice session '${sessionId}' not found.`)
  }

  assertStudentAccess(session.studentId.toString(), requester)

  let clientQ: ClientPracticeQuestion | undefined
  if (session.status === 'ACTIVE' && session.currentQuestionId) {
    const qDoc = await Question.findById(session.currentQuestionId).lean().exec()
    if (qDoc) {
      const skill = await Skill.findById(qDoc.skillId).select('name').lean().exec() as { name: string } | null
      clientQ = toClientQuestion(qDoc, skill?.name)
    }
  }

  const formattedSession = await formatSessionData(session)
  return {
    session: formattedSession,
    question: clientQ,
    resumed: true,
    sessionComplete: session.status === 'COMPLETED',
  }
}
