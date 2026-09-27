import { connectDatabase, disconnectDatabase } from '../database/connection.js'
import { Assessment, LearningActivity, Question, Skill, Student, Teacher, User } from '../models/index.js'

async function verifySeed(): Promise<void> {
  await connectDatabase()
  const [users, skills, questions, activities, assessments, teacher, student, multiplication] = await Promise.all([
    User.countDocuments({ email: { $in: ['admin@learnloop.demo', 'teacher@learnloop.demo', 'student@learnloop.demo', 'student.two@learnloop.demo', 'student.three@learnloop.demo'] } }),
    Skill.countDocuments({}), Question.countDocuments({ source: 'CURATED' }), LearningActivity.countDocuments({ active: true }), Assessment.countDocuments({ active: true }),
    Teacher.findOne({ name: 'Demo Teacher' }).lean(), Student.findOne({ studentCode: 'LL-DEMO-001' }).lean(), Skill.findOne({ slug: 'multiplication' }).lean(),
  ])
  if (users !== 5 || skills !== 5 || questions !== 10 || activities !== 2 || assessments !== 2 || !teacher || !student || !multiplication) throw new Error('Expected seed records were not found.')
  if (!student.teacherIds.some((teacherId) => teacherId.equals(teacher._id)) || !teacher.studentIds.some((studentId) => studentId.equals(student._id))) throw new Error('Teacher/student seed relationship is invalid.')
  if (multiplication.prerequisiteIds.length !== 1) throw new Error('Multiplication prerequisite seed relationship is invalid.')
  console.info('Seed verification passed: counts and core relationships are valid.')
}

verifySeed().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : 'UnknownError'
  console.error(`Seed verification failed (${name}).`)
  process.exitCode = 1
}).finally(async () => { await disconnectDatabase() })
