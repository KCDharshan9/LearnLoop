/**
 * Learning Gap Detection Service.
 *
 * Implements prerequisite-aware educational diagnostic analysis:
 * - Case A: Strong prerequisite + Weak target => Direct target intervention.
 * - Case B: Weak prerequisite + Weak target => Prerequisite reinforcement.
 * - Case C: Developing target => Targeted practice.
 * - Case D: All mastered => Progression.
 */

import { Skill } from '../models/index.js'
import type { LearningGap, Recommendation, SkillResult } from '../types/assessment.js'

interface RawSkillMeta {
  _id: { toString(): string }
  slug: string
  name: string
  order: number
  prerequisiteIds: { toString(): string }[]
}

export async function detectLearningGaps(
  skillResults: SkillResult[],
): Promise<{ learningGap: LearningGap; recommendation: Recommendation }> {
  // 1. Fetch skill metadata from MongoDB to get prerequisite relationships and sequence
  const skillIds = skillResults.map((r) => r.skillId)
  const skillsDocs = (await Skill.find({ _id: { $in: skillIds } })
    .lean()
    .exec()) as unknown as RawSkillMeta[]

  const skillMetaMap = new Map<string, RawSkillMeta>()
  for (const doc of skillsDocs) {
    skillMetaMap.set(doc._id.toString(), doc)
  }

  // Map results by skillId and by slug
  const resultMap = new Map<string, SkillResult>()
  for (const res of skillResults) {
    resultMap.set(res.skillId, res)
  }

  // Sort results by curriculum order ascending
  const sortedResults = [...skillResults].sort((a, b) => {
    const orderA = skillMetaMap.get(a.skillId)?.order ?? 0
    const orderB = skillMetaMap.get(b.skillId)?.order ?? 0
    return orderA - orderB
  })

  // 2. Identify weak skills (NEEDS_SUPPORT) and developing skills (DEVELOPING)
  const weakSkills = sortedResults.filter((r) => r.status === 'NEEDS_SUPPORT')
  const developingSkills = sortedResults.filter((r) => r.status === 'DEVELOPING')

  // Case D: All skills are MASTERED
  if (weakSkills.length === 0 && developingSkills.length === 0) {
    const lastSkill = sortedResults[sortedResults.length - 1]
    const learningGap: LearningGap = {
      targetSkillId: lastSkill?.skillId ?? '',
      targetSkillName: lastSkill?.skillName ?? 'Foundational Skills',
      targetSkillSlug: lastSkill?.skillSlug ?? '',
      targetScore: lastSkill?.score ?? 100,
      targetStatus: 'MASTERED',
      gapType: 'MASTERY',
      summary: 'Curriculum Concepts Mastered',
      detail:
        'All assessed foundational skills demonstrate strong mastery (70%+). The learner possesses secure conceptual understanding across all tested areas.',
    }

    const recommendation: Recommendation = {
      focusSkillId: lastSkill?.skillId ?? '',
      focusSkillName: lastSkill?.skillName ?? 'Advanced Concepts',
      focusSkillSlug: lastSkill?.skillSlug ?? '',
      actionType: 'ADVANCED_PROGRESSION',
      headline: 'Ready for Next Concept',
      description:
        'Continue to the next advanced learning unit or explore challenging applications of foundational numeracy.',
      priorityOrder: 1,
    }

    return { learningGap, recommendation }
  }

  // If there are weak skills, find the primary gap by inspecting prerequisite relationships
  if (weakSkills.length > 0) {
    // 1. First priority: Check if any weak target skill has a weak prerequisite (Case B: PREREQUISITE_WEAKNESS)
    // Check skills in sequence to find where the prerequisite breakdown occurs
    for (const target of weakSkills) {
      const targetMeta = skillMetaMap.get(target.skillId)
      const prereqIds = (targetMeta?.prerequisiteIds ?? []).map((id) => id.toString())

      const assessedPrereqs = prereqIds
        .map((pId) => resultMap.get(pId))
        .filter((p): p is SkillResult => p !== undefined)

      const weakPrereq = assessedPrereqs.find(
        (p) => p.status === 'NEEDS_SUPPORT' || p.status === 'DEVELOPING',
      )

      if (weakPrereq) {
        // Case B: Prerequisite is also weak => Prerequisite reinforcement
        const learningGap: LearningGap = {
          targetSkillId: target.skillId,
          targetSkillName: target.skillName,
          targetSkillSlug: target.skillSlug,
          targetScore: target.score,
          targetStatus: target.status,
          prerequisiteSkillId: weakPrereq.skillId,
          prerequisiteSkillName: weakPrereq.skillName,
          prerequisiteSkillSlug: weakPrereq.skillSlug,
          prerequisiteScore: weakPrereq.score,
          prerequisiteStatus: weakPrereq.status,
          gapType: 'PREREQUISITE_WEAKNESS',
          summary: `Prerequisite Reinforcement Needed: ${weakPrereq.skillName}`,
          detail: `${target.skillName} performance is weak (${target.score}%) because prerequisite skill ${weakPrereq.skillName} is also insecure (${weakPrereq.score}%). Conceptual mastery of ${weakPrereq.skillName.toLowerCase()} is required before progressing with ${target.skillName.toLowerCase()}.`,
        }

        const recommendation: Recommendation = {
          focusSkillId: weakPrereq.skillId,
          focusSkillName: weakPrereq.skillName,
          focusSkillSlug: weakPrereq.skillSlug,
          actionType: 'PREREQUISITE_REINFORCEMENT',
          headline: `Strengthen ${weakPrereq.skillName}`,
          description: `Focus initial intervention on ${weakPrereq.skillName.toLowerCase()} to rebuild the foundational bridge before returning to ${target.skillName.toLowerCase()}.`,
          priorityOrder: 1,
        }

        return { learningGap, recommendation }
      }
    }

    // 2. Second priority: If no weak prerequisite exists for any weak skill,
    // evaluate the earliest weak skill against its mastered prerequisite (Case A: DIRECT_TARGET_WEAKNESS)
    for (const target of weakSkills) {
      const targetMeta = skillMetaMap.get(target.skillId)
      const prereqIds = (targetMeta?.prerequisiteIds ?? []).map((id) => id.toString())

      const assessedPrereqs = prereqIds
        .map((pId) => resultMap.get(pId))
        .filter((p): p is SkillResult => p !== undefined)

      if (assessedPrereqs.length > 0) {
        const masteredPrereq = assessedPrereqs.find((p) => p.status === 'MASTERED')
        const prereqName = masteredPrereq ? masteredPrereq.skillName : 'Prerequisites'

        const learningGap: LearningGap = {
          targetSkillId: target.skillId,
          targetSkillName: target.skillName,
          targetSkillSlug: target.skillSlug,
          targetScore: target.score,
          targetStatus: target.status,
          prerequisiteSkillId: masteredPrereq?.skillId,
          prerequisiteSkillName: masteredPrereq?.skillName,
          prerequisiteSkillSlug: masteredPrereq?.skillSlug,
          prerequisiteScore: masteredPrereq?.score,
          prerequisiteStatus: masteredPrereq?.status,
          gapType: 'DIRECT_TARGET_WEAKNESS',
          summary: `Direct Instruction Needed: ${target.skillName}`,
          detail: `${target.skillName} requires support (${target.score}%), but the prerequisite (${prereqName}) is mastered (${masteredPrereq?.score ?? 100}%). The student possesses the necessary prerequisite foundation to benefit from direct targeted intervention in ${target.skillName.toLowerCase()}.`,
        }

        const recommendation: Recommendation = {
          focusSkillId: target.skillId,
          focusSkillName: target.skillName,
          focusSkillSlug: target.skillSlug,
          actionType: 'DIRECT_INSTRUCTION',
          headline: `Direct Focus on ${target.skillName}`,
          description: `Deliver guided practice and conceptual modeling directly on ${target.skillName.toLowerCase()}.`,
          priorityOrder: 1,
        }

        return { learningGap, recommendation }
      }

      // Root skill with no prerequisites (e.g. Number Sense)
      const learningGap: LearningGap = {
        targetSkillId: target.skillId,
        targetSkillName: target.skillName,
        targetSkillSlug: target.skillSlug,
        targetScore: target.score,
        targetStatus: target.status,
        gapType: 'DIRECT_TARGET_WEAKNESS',
        summary: `Foundational Support Needed: ${target.skillName}`,
        detail: `The learner requires reinforcement on root foundational skill ${target.skillName} (${target.score}%). Direct practice on whole number representations is recommended.`,
      }

      const recommendation: Recommendation = {
        focusSkillId: target.skillId,
        focusSkillName: target.skillName,
        focusSkillSlug: target.skillSlug,
        actionType: 'DIRECT_INSTRUCTION',
        headline: `Foundational Practice in ${target.skillName}`,
        description: `Provide immediate interactive practice on ${target.skillName.toLowerCase()} to secure the primary foundation.`,
        priorityOrder: 1,
      }

      return { learningGap, recommendation }
    }
  }

  // Case C: No weak skills, but developing skills exist
  const primaryDev = developingSkills[0]
  const learningGap: LearningGap = {
    targetSkillId: primaryDev.skillId,
    targetSkillName: primaryDev.skillName,
    targetSkillSlug: primaryDev.skillSlug,
    targetScore: primaryDev.score,
    targetStatus: primaryDev.status,
    gapType: 'DEVELOPING_PRACTICE',
    summary: `Targeted Practice Recommended: ${primaryDev.skillName}`,
    detail: `${primaryDev.skillName} is developing (${primaryDev.score}%). The student demonstrates partial understanding and will benefit from targeted adaptive practice to achieve full mastery.`,
  }

  const recommendation: Recommendation = {
    focusSkillId: primaryDev.skillId,
    focusSkillName: primaryDev.skillName,
    focusSkillSlug: primaryDev.skillSlug,
    actionType: 'TARGETED_PRACTICE',
    headline: `Practice ${primaryDev.skillName}`,
    description: `Engage in structured practice with immediate feedback to convert developing competency into mastery.`,
    priorityOrder: 1,
  }

  return { learningGap, recommendation }
}
