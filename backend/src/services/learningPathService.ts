/**
 * Learning Path Service.
 *
 * Implements deterministic learning-path generation from real learner evidence:
 * - Traverses skill prerequisite chains and inspects learnerSkillStates.
 * - Prioritizes prerequisite reinforcement when prerequisites are insecure.
 * - Builds structured, actionable steps: REVIEW, INTERACTIVE_ACTIVITY, PRACTICE, REASSESSMENT.
 * - Associates seeded LearningActivity items dynamically.
 * - Manages step progression and idempotent step completion.
 */

import { Types } from 'mongoose'
import {
  LearnerSkillState,
  LearningActivity,
  LearningPath,
  ProgressHistory,
  Skill,
  Student,
} from '../models/index.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  LearningActivityDetail,
  LearningPathData,
  LearningPathResponse,
  LearningPathStep,
  StepType,
} from '../types/learningPath.js'

export class LearningPathError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'LearningPathError'
  }
}

function assertOwnership(studentId: string, requester: AuthenticatedUser): void {
  if (requester.role === 'STUDENT') {
    if (!requester.profileId || requester.profileId !== studentId) {
      throw new LearningPathError(
        'FORBIDDEN',
        'You are not authorized to access another student’s learning path.',
      )
    }
  }
}

async function formatLearningPath(pathDoc: any): Promise<LearningPathData> {
  const allSkillIds = [
    pathDoc.targetSkillId,
    ...(pathDoc.steps ?? []).map((s: any) => s.skillId),
  ]
  const allActivityIds = (pathDoc.steps ?? [])
    .map((s: any) => s.activityId)
    .filter((aId: any) => aId !== undefined && aId !== null)

  const [skills, activities] = await Promise.all([
    Skill.find({ _id: { $in: allSkillIds } })
      .select('_id name slug level order')
      .lean()
      .exec() as Promise<any[]>,
    LearningActivity.find({ _id: { $in: allActivityIds } })
      .select('_id title description type content difficulty')
      .lean()
      .exec() as Promise<any[]>,
  ])

  const skillMap = new Map<string, { name: string; slug: string }>()
  for (const s of skills) {
    skillMap.set(s._id.toString(), { name: s.name, slug: s.slug })
  }

  const activityMap = new Map<string, LearningActivityDetail>()
  for (const a of activities) {
    activityMap.set(a._id.toString(), {
      id: a._id.toString(),
      title: a.title,
      description: a.description,
      type: a.type,
      content: a.content,
      difficulty: a.difficulty,
    })
  }

  const targetMeta = skillMap.get(pathDoc.targetSkillId.toString())

  let currentStepNumber = 1
  let completedCount = 0

  const steps: LearningPathStep[] = (pathDoc.steps ?? []).map((step: any) => {
    const sIdStr = step.skillId.toString()
    const sMeta = skillMap.get(sIdStr)
    const actIdStr = step.activityId ? step.activityId.toString() : undefined
    const actDetail = actIdStr ? activityMap.get(actIdStr) : undefined

    if (step.status === 'COMPLETED') {
      completedCount++
    } else if (step.status === 'CURRENT') {
      currentStepNumber = step.stepNumber
    }

    return {
      stepNumber: step.stepNumber,
      type: step.type as StepType,
      skillId: sIdStr,
      skillName: sMeta?.name ?? 'Skill',
      skillSlug: sMeta?.slug ?? 'skill',
      title: step.title,
      description: step.description,
      activityId: actIdStr,
      activity: actDetail,
      status: step.status,
      completedAt: step.completedAt ? new Date(step.completedAt).toISOString() : undefined,
    }
  })

  if (completedCount === steps.length && steps.length > 0) {
    currentStepNumber = steps.length
  }

  return {
    id: pathDoc._id.toString(),
    studentId: pathDoc.studentId.toString(),
    targetSkillId: pathDoc.targetSkillId.toString(),
    targetSkillName: targetMeta?.name ?? 'Target Skill',
    targetSkillSlug: targetMeta?.slug ?? 'target',
    reason: pathDoc.reason,
    status: pathDoc.status,
    steps,
    currentStepNumber,
    totalSteps: steps.length,
    completedSteps: completedCount,
    createdAt: new Date(pathDoc.createdAt).toISOString(),
    updatedAt: new Date(pathDoc.updatedAt).toISOString(),
  }
}

export async function getOrGenerateLearningPath(
  studentId: string,
  requester: AuthenticatedUser,
): Promise<LearningPathResponse> {
  assertOwnership(studentId, requester)

  if (!Types.ObjectId.isValid(studentId)) {
    throw new LearningPathError('VALIDATION_ERROR', 'Invalid student ID.')
  }

  const studentObjId = new Types.ObjectId(studentId)

  const existingPath = await LearningPath.findOne({
    studentId: studentObjId,
    status: 'ACTIVE',
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  if (existingPath) {
    const formatted = await formatLearningPath(existingPath)
    return { hasPath: true, learningPath: formatted }
  }

  const skillStates = await LearnerSkillState.find({ studentId: studentObjId }).lean().exec()
  if (skillStates.length === 0) {
    return {
      hasPath: false,
      learningPath: null,
      message: 'NO_DIAGNOSTIC',
    }
  }

  const skills = await Skill.find({ active: true }).sort({ order: 1 }).lean().exec()
  const skillMap = new Map<string, any>()
  for (const s of skills) {
    skillMap.set(s._id.toString(), s)
  }

  const stateMap = new Map<string, any>()
  for (const st of skillStates) {
    stateMap.set(st.skillId.toString(), st)
  }

  const weakSkills = skills.filter((s) => {
    const state = stateMap.get(s._id.toString())
    return state && state.status === 'NEEDS_SUPPORT'
  })

  const developingSkills = skills.filter((s) => {
    const state = stateMap.get(s._id.toString())
    return state && state.status === 'DEVELOPING'
  })

  if (weakSkills.length === 0 && developingSkills.length === 0) {
    const latestCompletedPath = await LearningPath.findOne({
      studentId: studentObjId,
      status: 'COMPLETED',
    })
      .sort({ updatedAt: -1 })
      .lean()
      .exec()

    if (latestCompletedPath) {
      const formatted = await formatLearningPath(latestCompletedPath)
      return { hasPath: true, learningPath: formatted, message: 'PATH_COMPLETED' }
    }

    return {
      hasPath: false,
      learningPath: null,
      message: 'ALL_MASTERED',
    }
  }

  const activities = await LearningActivity.find({ active: true }).lean().exec()
  const activitiesBySkill = new Map<string, any[]>()
  for (const act of activities) {
    const skId = act.skillId.toString()
    if (!activitiesBySkill.has(skId)) {
      activitiesBySkill.set(skId, [])
    }
    activitiesBySkill.get(skId)!.push(act)
  }

  let targetSkill: any = null
  let weakPrerequisite: any = null
  let reason = ''

  for (const weak of weakSkills) {
    const prereqIds = (weak.prerequisiteIds ?? []).map((pId: any) => pId.toString())
    for (const pId of prereqIds) {
      const pState = stateMap.get(pId)
      if (pState && (pState.status === 'NEEDS_SUPPORT' || pState.status === 'DEVELOPING')) {
        targetSkill = weak
        weakPrerequisite = skillMap.get(pId)
        reason = `Reinforce prerequisite ${weakPrerequisite.name} before advancing to ${targetSkill.name}.`
        break
      }
    }
    if (targetSkill) break
  }

  if (!targetSkill && weakSkills.length > 0) {
    targetSkill = weakSkills[0]
    reason = `Direct targeted intervention on ${targetSkill.name}. Prerequisite foundations are secure.`
  }

  if (!targetSkill && developingSkills.length > 0) {
    targetSkill = developingSkills[0]
    reason = `Targeted conceptual reinforcement and practice on ${targetSkill.name}.`
  }

  if (!targetSkill) {
    return {
      hasPath: false,
      learningPath: null,
      message: 'ALL_MASTERED',
    }
  }

  const steps: any[] = []
  let stepNumber = 1

  if (weakPrerequisite) {
    const prereqActs = activitiesBySkill.get(weakPrerequisite._id.toString()) ?? []
    const reviewAct = prereqActs.find((a) => a.type === 'GUIDED_PRACTICE') ?? prereqActs[0]

    steps.push({
      stepNumber: stepNumber++,
      type: 'REVIEW',
      skillId: weakPrerequisite._id,
      title: `Review ${weakPrerequisite.name}`,
      description: `Rebuild prerequisite foundation in ${weakPrerequisite.name.toLowerCase()} to prepare for ${targetSkill.name.toLowerCase()}.`,
      activityId: reviewAct?._id,
      status: 'CURRENT',
    })
  }

  const targetActs = activitiesBySkill.get(targetSkill._id.toString()) ?? []
  const interactiveAct = targetActs.find((a) => a.type === 'GROUPING' || a.type === 'INTERACTIVE') ?? targetActs[0]

  steps.push({
    stepNumber: stepNumber++,
    type: 'INTERACTIVE_ACTIVITY',
    skillId: targetSkill._id,
    title: `Conceptual Learning: ${targetSkill.name}`,
    description: `Engage with visual representations and models for ${targetSkill.name.toLowerCase()}.`,
    activityId: interactiveAct?._id,
    status: steps.length === 0 ? 'CURRENT' : 'PENDING',
  })

  steps.push({
    stepNumber: stepNumber++,
    type: 'PRACTICE',
    skillId: targetSkill._id,
    title: `Targeted Practice: ${targetSkill.name}`,
    description: `Solve varied difficulty problems to solidify understanding of ${targetSkill.name.toLowerCase()}.`,
    status: 'PENDING',
  })

  steps.push({
    stepNumber: stepNumber++,
    type: 'REASSESSMENT',
    skillId: targetSkill._id,
    title: `Reassessment: ${targetSkill.name}`,
    description: `Demonstrate mastery on a focused 2-question checkpoint for ${targetSkill.name.toLowerCase()}.`,
    status: 'PENDING',
  })

  const createdPath = await LearningPath.create({
    studentId: studentObjId,
    targetSkillId: targetSkill._id,
    reason,
    status: 'ACTIVE',
    steps,
  })

  await Student.updateOne({ _id: studentObjId }, { $set: { learningPathId: createdPath._id } })

  const formatted = await formatLearningPath(createdPath)
  return { hasPath: true, learningPath: formatted }
}

export async function completeLearningPathStep(
  learningPathId: string,
  stepNumber: number,
  requester: AuthenticatedUser,
): Promise<LearningPathData> {
  if (!Types.ObjectId.isValid(learningPathId)) {
    throw new LearningPathError('VALIDATION_ERROR', 'Invalid learningPathId.')
  }

  const pathDoc = await LearningPath.findById(learningPathId)
  if (!pathDoc) {
    throw new LearningPathError('NOT_FOUND', `Learning path '${learningPathId}' not found.`)
  }

  assertOwnership(pathDoc.studentId.toString(), requester)

  const steps = pathDoc.steps as any[]
  const targetStepIndex = steps.findIndex((s) => s.stepNumber === stepNumber)

  if (targetStepIndex === -1) {
    throw new LearningPathError('STEP_NOT_FOUND', `Step number ${stepNumber} not found in learning path.`)
  }

  const targetStep = steps[targetStepIndex]

  if (targetStep.status === 'COMPLETED') {
    return await formatLearningPath(pathDoc)
  }

  targetStep.status = 'COMPLETED'
  targetStep.completedAt = new Date()

  const nextStepIndex = targetStepIndex + 1
  if (nextStepIndex < steps.length) {
    steps[nextStepIndex].status = 'CURRENT'
  } else {
    pathDoc.status = 'COMPLETED'
  }

  await pathDoc.save()

  await ProgressHistory.create({
    studentId: pathDoc.studentId,
    skillId: targetStep.skillId,
    eventType: 'INTERVENTION_COMPLETED',
    previousScore: undefined,
    newScore: 100,
    previousStatus: 'DEVELOPING',
    newStatus: 'MASTERED',
    relatedActivityId: targetStep.activityId,
    timestamp: new Date(),
  })

  return await formatLearningPath(pathDoc)
}
