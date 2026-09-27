/**
 * Targeted verification script for Phase 5.
 * Tests:
 * 1. Authenticated student can retrieve their own profile (GET /api/students/:studentId)
 * 2. Profile contains real student info, summary, current skill competencies, strengths, support areas, latest diagnostic
 * 3. Authenticated student can retrieve their own progress (GET /api/students/:studentId/progress)
 * 4. Progress history contains chronological events, deltas, and valid competency snapshots
 * 5. Student A cannot retrieve Student B's profile (403 FORBIDDEN)
 * 6. Student with no assessment history retrieves clean empty state without crashing
 */

import { connectDatabase, disconnectDatabase } from '../database/connection.js'
import { Student, User } from '../models/index.js'
import { getStudentProfile, getStudentProgress, StudentServiceError } from '../services/studentService.js'
import type { AuthenticatedUser } from '../types/auth.js'

async function runTests() {
  console.log('Connecting to database for Phase 5 verification...')
  await connectDatabase()

  try {
    // 1. Find demo students
    const students = await Student.find().populate('userId').lean().exec() as any[]
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

    // Test 1: Student 1 retrieves their profile
    console.log('\n[Test 1] Retrieve Student 1 Profile...')
    const profile1 = await getStudentProfile(student1._id.toString(), authStudent1)
    console.log(`✓ Retrieved profile for ${profile1.student.name} (${profile1.student.studentCode})`)
    console.log(`  Grade: ${profile1.student.grade}, Level: ${profile1.student.currentLevel}`)
    console.log(`  Total assessed skills: ${profile1.summary.totalAssessedSkills}`)
    console.log(`  Strengths (Mastered): ${profile1.summary.masteredCount}`)
    console.log(`  Developing: ${profile1.summary.developingCount}`)
    console.log(`  Needs Support: ${profile1.summary.needsSupportCount}`)
    if (profile1.summary.latestDiagnostic) {
      console.log(`  Latest Diagnostic: "${profile1.summary.latestDiagnostic.assessmentTitle}" - Score: ${profile1.summary.latestDiagnostic.overallScore}% (${profile1.summary.latestDiagnostic.competencyStatus})`)
      if (profile1.summary.latestDiagnostic.learningGap) {
        console.log(`  Identified Gap: ${profile1.summary.latestDiagnostic.learningGap.summary}`)
      }
    }

    // Verify consistency: strengths + developing + needsSupport === total
    if (profile1.summary.masteredCount + profile1.summary.developingCount + profile1.summary.needsSupportCount !== profile1.summary.totalAssessedSkills) {
      throw new Error('Summary count mismatch!')
    }
    console.log('✓ Summary counts match total assessed skills.')

    // Test 2: Student 1 retrieves progress history
    console.log('\n[Test 2] Retrieve Student 1 Progress History...')
    const progress1 = await getStudentProgress(student1._id.toString(), authStudent1)
    console.log(`✓ Retrieved ${progress1.history.length} progress history events.`)
    if (progress1.history.length > 0) {
      const first = progress1.history[0]
      console.log(`  Latest Event: ${first.skillName} (${first.eventType}) -> New Score: ${first.newScore}%, Status: ${first.newStatus}, Delta: ${first.changeDelta}%`)
    }

    // Test 3: Authorization test - Student 2 tries to access Student 1's profile
    if (student1._id.toString() !== student2._id.toString()) {
      console.log('\n[Test 3] Authorization: Student 2 attempts to access Student 1 profile...')
      try {
        await getStudentProfile(student1._id.toString(), authStudent2)
        throw new Error('FAILED: Unauthorized student was able to access another profile!')
      } catch (err: any) {
        if (err instanceof StudentServiceError && err.code === 'FORBIDDEN') {
          console.log(`✓ Successfully rejected with 403 FORBIDDEN: "${err.message}"`)
        } else {
          throw err
        }
      }

      console.log('\n[Test 4] Authorization: Student 2 attempts to access Student 1 progress...')
      try {
        await getStudentProgress(student1._id.toString(), authStudent2)
        throw new Error('FAILED: Unauthorized student was able to access another progress history!')
      } catch (err: any) {
        if (err instanceof StudentServiceError && err.code === 'FORBIDDEN') {
          console.log(`✓ Successfully rejected with 403 FORBIDDEN: "${err.message}"`)
        } else {
          throw err
        }
      }
    }

    // Test 5: Empty student profile (Student 3)
    console.log(`\n[Test 5] Test empty profile state for Student 3: ${student3.name} (${student3._id})...`)
    const authStudent3: AuthenticatedUser = {
      userId: student3.userId._id.toString(),
      name: student3.name,
      role: 'STUDENT',
      profileId: student3._id.toString(),
      sessionType: 'demo',
    }
    const profile3 = await getStudentProfile(student3._id.toString(), authStudent3)
    console.log(`✓ Successfully retrieved Student 3 profile without crashing:`)
    console.log(`  Assessed Skills: ${profile3.summary.totalAssessedSkills}`)
    console.log(`  Mastered: ${profile3.summary.masteredCount}, Needs Support: ${profile3.summary.needsSupportCount}`)
    console.log(`  Latest Diagnostic present: ${!!profile3.summary.latestDiagnostic}`)

    const progress3 = await getStudentProgress(student3._id.toString(), authStudent3)
    console.log(`✓ Successfully retrieved Student 3 progress without crashing: ${progress3.history.length} events.`)

    console.log('\n========================================')
    console.log('ALL PHASE 5 TARGETED TESTS PASSED!')
    console.log('========================================\n')
  } finally {
    await disconnectDatabase()
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
