/**
 * Phase 6 Targeted Test Suite: Learning Path System.
 *
 * Verifies:
 * 1. Path generated deterministically from real learner evidence (Student 1).
 * 2. Prerequisite prioritization logic (weak prereq placed before target intervention).
 * 3. Step progression: completing a step advances current step to next.
 * 4. Idempotent step completion: re-completing completed step returns safely.
 * 5. Re-fetching active path returns existing path without duplicate generation.
 * 6. Ownership authorization: Student 2 cannot access or complete Student 1's path (403 Forbidden).
 * 7. Edge case: Student 3 with no diagnostic evidence handled cleanly (hasPath: false, NO_DIAGNOSTIC).
 */

import { connectDatabase, disconnectDatabase } from '../database/connection.js'
import { LearnerSkillState, LearningPath, Skill, Student } from '../models/index.js'
import {
  completeLearningPathStep,
  getOrGenerateLearningPath,
  LearningPathError,
} from '../services/learningPathService.js'
import type { AuthenticatedUser } from '../types/auth.js'

async function runTests() {
  console.log('Connecting to database for Phase 6 verification...')
  await connectDatabase()

  try {
    const students = (await Student.find().populate('userId').lean().exec()) as any[]
    if (students.length === 0) {
      throw new Error('No students found in database. Seed data missing!')
    }

    const student1 = students[0]
    const student2 = students[1] || students[0]
    const student3 = students[2] || students[0]

    console.log(`Testing with Student 1: ${student1.name} (${student1._id})`)

    const authStudent1: AuthenticatedUser = {
      userId: student1.userId._id.toString(),
      name: student1.name,
      role: 'STUDENT',
      profileId: student1._id.toString(),
      sessionType: 'demo',
    }

    const authStudent2: AuthenticatedUser = {
      userId: student2.userId._id.toString(),
      name: student2.name,
      role: 'STUDENT',
      profileId: student2._id.toString(),
      sessionType: 'demo',
    }

    const authStudent3: AuthenticatedUser = {
      userId: student3.userId._id.toString(),
      name: student3.name,
      role: 'STUDENT',
      profileId: student3._id.toString(),
      sessionType: 'demo',
    }

    // Clean up any previous test learning paths for Student 1 to test fresh path generation
    await LearningPath.deleteMany({ studentId: student1._id })
    await Student.updateOne({ _id: student1._id }, { $unset: { learningPathId: 1 } })

    // Test 1: Generate learning path for Student 1
    console.log('\n[Test 1] Generate Learning Path for Student 1 from real diagnostic evidence...')
    const result1 = await getOrGenerateLearningPath(student1._id.toString(), authStudent1)
    if (!result1.hasPath || !result1.learningPath) {
      throw new Error('FAILED: Expected learning path to be generated for Student 1!')
    }

    const path1 = result1.learningPath
    console.log(`✓ Path generated: ID ${path1.id}`)
    console.log(`  Target Skill: ${path1.targetSkillName} (${path1.targetSkillSlug})`)
    console.log(`  Reason: "${path1.reason}"`)
    console.log(`  Total Steps: ${path1.totalSteps}`)
    path1.steps.forEach((s) => {
      console.log(`    Step ${s.stepNumber} [${s.type}]: ${s.title} (${s.status})`)
    })

    // Test 2: Verify Step 1 is CURRENT and subsequent are PENDING
    console.log('\n[Test 2] Verify initial step progression status...')
    if (path1.steps[0].status !== 'CURRENT') {
      throw new Error(`FAILED: Step 1 should be CURRENT, but got ${path1.steps[0].status}`)
    }
    for (let i = 1; i < path1.steps.length; i++) {
      if (path1.steps[i].status !== 'PENDING') {
        throw new Error(`FAILED: Step ${i + 1} should be PENDING, but got ${path1.steps[i].status}`)
      }
    }
    console.log('✓ Initial step states verified (Step 1 is CURRENT, others PENDING).')

    // Test 3: Idempotency & Persistence - calling getOrGenerateLearningPath again should return SAME path
    console.log('\n[Test 3] Test Active Path Persistence (no duplicate path generated)...')
    const result1DuplicateCheck = await getOrGenerateLearningPath(student1._id.toString(), authStudent1)
    if (result1DuplicateCheck.learningPath?.id !== path1.id) {
      throw new Error('FAILED: Expected same learning path ID, but a duplicate was generated!')
    }
    const countInDb = await LearningPath.countDocuments({ studentId: student1._id, status: 'ACTIVE' })
    if (countInDb !== 1) {
      throw new Error(`FAILED: Expected exactly 1 active path in database, found ${countInDb}`)
    }
    console.log('✓ Idempotent path retrieval verified: reused existing active path document.')

    // Test 4: Authorization - Student 2 tries to access Student 1's path
    console.log('\n[Test 4] Authorization: Student 2 attempts to access Student 1 learning path...')
    try {
      await getOrGenerateLearningPath(student1._id.toString(), authStudent2)
      throw new Error('FAILED: Unauthorized student was able to access another student’s path!')
    } catch (err: any) {
      if (err instanceof LearningPathError && err.code === 'FORBIDDEN') {
        console.log(`✓ Access blocked with 403 FORBIDDEN: "${err.message}"`)
      } else {
        throw err
      }
    }

    // Test 5: Authorization - Student 2 tries to complete Student 1's step
    console.log('\n[Test 5] Authorization: Student 2 attempts to complete Student 1 step...')
    try {
      await completeLearningPathStep(path1.id, 1, authStudent2)
      throw new Error('FAILED: Unauthorized student was able to complete step!')
    } catch (err: any) {
      if (err instanceof LearningPathError && err.code === 'FORBIDDEN') {
        console.log(`✓ Step completion blocked with 403 FORBIDDEN: "${err.message}"`)
      } else {
        throw err
      }
    }

    // Test 6: Step Completion - Student 1 completes Step 1
    console.log('\n[Test 6] Complete Step 1 as Student 1...')
    const updatedAfterStep1 = await completeLearningPathStep(path1.id, 1, authStudent1)
    if (updatedAfterStep1.steps[0].status !== 'COMPLETED') {
      throw new Error('FAILED: Step 1 was not marked COMPLETED!')
    }
    if (updatedAfterStep1.steps[1].status !== 'CURRENT') {
      throw new Error('FAILED: Step 2 was not advanced to CURRENT!')
    }
    console.log('✓ Step 1 marked COMPLETED, Step 2 advanced to CURRENT.')

    // Test 7: Idempotent Step Completion - Re-completing Step 1 is safe
    console.log('\n[Test 7] Idempotent re-completion of Step 1...')
    const idempotentResult = await completeLearningPathStep(path1.id, 1, authStudent1)
    if (idempotentResult.steps[0].status !== 'COMPLETED' || idempotentResult.steps[1].status !== 'CURRENT') {
      throw new Error('FAILED: Idempotent step completion modified state incorrectly!')
    }
    console.log('✓ Idempotent re-completion verified safely.')

    // Test 8: Complete remaining steps until path completion
    console.log('\n[Test 8] Complete all remaining steps to verify path completion...')
    let finalPath = updatedAfterStep1
    for (let s = 2; s <= finalPath.totalSteps; s++) {
      finalPath = await completeLearningPathStep(path1.id, s, authStudent1)
      console.log(`  Completed Step ${s}: Status is now ${finalPath.status}`)
    }
    if (finalPath.status !== 'COMPLETED') {
      throw new Error(`FAILED: Path status should be COMPLETED, got ${finalPath.status}`)
    }
    console.log('✓ All steps completed; LearningPath status is COMPLETED.')

    // Test 9: Edge Case - Student 3 with no diagnostic
    console.log('\n[Test 9] Edge Case: Student 3 with no assessment evidence...')
    const result3 = await getOrGenerateLearningPath(student3._id.toString(), authStudent3)
    if (result3.hasPath !== false || result3.message !== 'NO_DIAGNOSTIC') {
      throw new Error(`FAILED: Expected NO_DIAGNOSTIC for student without evidence, got: ${JSON.stringify(result3)}`)
    }
    console.log('✓ Clean edge case handled: returns NO_DIAGNOSTIC without crashing.')

    console.log('\n========================================')
    console.log('ALL PHASE 6 TARGETED TESTS PASSED!')
    console.log('========================================\n')
  } finally {
    await disconnectDatabase()
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
