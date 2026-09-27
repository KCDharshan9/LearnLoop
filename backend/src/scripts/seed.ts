import { connectDatabase, disconnectDatabase } from '../database/connection.js'
import { Assessment, LearningActivity, Question, Skill, Student, Teacher, User } from '../models/index.js'
import { Types } from 'mongoose'

type SeedReference = { _id: Types.ObjectId }
type SeedSkill = SeedReference & { prerequisiteIds: Types.ObjectId[]; level: number }

async function upsertUser(name: string, email: string, role: 'ADMIN' | 'TEACHER' | 'STUDENT', demoCredentialId: string): Promise<SeedReference> {
  return (await User.findOneAndUpdate({ email }, { $set: { name, email, role, demoCredentialId, active: true } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()) as unknown as SeedReference
}

async function seed(): Promise<void> {
  await connectDatabase()

  const admin = await upsertUser('Demo Admin', 'admin@learnloop.demo', 'ADMIN', 'demo-admin')
  const teacherUser = await upsertUser('Demo Teacher', 'teacher@learnloop.demo', 'TEACHER', 'demo-teacher')
  const studentUser = await upsertUser('Demo Student', 'student@learnloop.demo', 'STUDENT', 'demo-student')
  const studentTwoUser = await upsertUser('Demo Student Two', 'student.two@learnloop.demo', 'STUDENT', 'demo-student-two')
  const studentThreeUser = await upsertUser('Demo Student Three', 'student.three@learnloop.demo', 'STUDENT', 'demo-student-three')
  const teacher = (await Teacher.findOneAndUpdate({ userId: teacherUser._id }, { $set: { userId: teacherUser._id, name: 'Demo Teacher', schoolId: 'learnloop-demo-school', studentIds: [] } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()) as unknown as SeedReference
  const student = (await Student.findOneAndUpdate({ studentCode: 'LL-DEMO-001' }, { $set: { userId: studentUser._id, studentCode: 'LL-DEMO-001', name: 'Demo Student', grade: 3, teacherIds: [teacher._id], currentLevel: 1 } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()) as unknown as SeedReference
  const studentTwo = (await Student.findOneAndUpdate({ studentCode: 'LL-DEMO-002' }, { $set: { userId: studentTwoUser._id, studentCode: 'LL-DEMO-002', name: 'Demo Student Two', grade: 3, teacherIds: [teacher._id], currentLevel: 1 } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()) as unknown as SeedReference
  const studentThree = (await Student.findOneAndUpdate({ studentCode: 'LL-DEMO-003' }, { $set: { userId: studentThreeUser._id, studentCode: 'LL-DEMO-003', name: 'Demo Student Three', grade: 4, teacherIds: [teacher._id], currentLevel: 2 } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()) as unknown as SeedReference
  await Teacher.updateOne({ _id: teacher._id }, { $set: { studentIds: [student._id, studentTwo._id, studentThree._id] } })

  const skillDefinitions = [
    ['number-sense', 'Number Sense', 'Recognising and comparing whole numbers.', 1, []],
    ['addition', 'Addition', 'Combining quantities using addition.', 1, ['number-sense']],
    ['repeated-addition', 'Repeated Addition', 'Representing equal groups as repeated addition.', 2, ['addition']],
    ['multiplication', 'Multiplication', 'Understanding multiplication through equal groups and repeated addition.', 3, ['repeated-addition']],
    ['division', 'Division', 'Sharing and grouping quantities equally.', 3, ['multiplication']],
  ] as const
  const skills = new Map<string, SeedSkill>()
  for (const [slug, name, description, level, prerequisites] of skillDefinitions) {
    const prerequisiteIds = prerequisites.map((prerequisite) => skills.get(prerequisite)!._id)
    const skill = (await Skill.findOneAndUpdate({ slug }, { $set: { name, slug, description, level, competency: 'foundational-numeracy', prerequisiteIds, order: skills.size + 1, active: true } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()) as unknown as SeedSkill
    skills.set(slug, skill)
  }

  const questionDefinitions = [
    ['number-sense', 1, 'Which number is greater: 7 or 5?', ['7', '5'], '7', '7 is greater than 5.'],
    ['number-sense', 2, 'What number comes after 39?', [], 40, '40 comes immediately after 39.'],
    ['addition', 1, 'What is 3 + 4?', [], 7, '3 plus 4 equals 7.'],
    ['addition', 2, 'What is 18 + 6?', [], 24, '18 plus 6 equals 24.'],
    ['repeated-addition', 1, 'Write 3 groups of 2 as repeated addition.', [], '2 + 2 + 2', 'Three groups of two means adding 2 three times.'],
    ['repeated-addition', 2, 'What is 4 + 4 + 4?', [], 12, 'Three equal groups of four total 12.'],
    ['multiplication', 1, 'What is 3 × 4?', [], 12, 'Three groups of four total 12.'],
    ['multiplication', 2, 'What is 5 × 6?', [], 30, 'Five groups of six total 30.'],
    ['division', 1, 'What is 12 ÷ 3?', [], 4, '12 shared equally into 3 groups gives 4.'],
    ['division', 2, 'What is 24 ÷ 6?', [], 4, '24 shared equally into 6 groups gives 4.'],
  ] as const
  const questionIds = []
  for (const [slug, difficulty, prompt, options, correctAnswer, explanation] of questionDefinitions) {
    const skill = skills.get(slug)!
    const question = (await Question.findOneAndUpdate({ prompt }, { $set: { skillId: skill._id, prerequisiteSkillIds: skill.prerequisiteIds, type: options.length ? 'MCQ' : 'NUMBER_INPUT', difficulty, prompt, options: options.map((value) => ({ label: value, value })), correctAnswer, explanation, competency: 'foundational-numeracy', level: skill.level, source: 'CURATED', active: true } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()) as unknown as SeedReference
    questionIds.push(question._id)
  }

  const multiplication = skills.get('multiplication')!
  const repeatedAddition = skills.get('repeated-addition')!
  const activity = await LearningActivity.findOneAndUpdate({ title: 'Equal Groups: From Addition to Multiplication' }, { $set: { skillId: multiplication._id, title: 'Equal Groups: From Addition to Multiplication', description: 'Connect equal groups and repeated addition to multiplication.', type: 'GROUPING', content: { groups: 4, itemsPerGroup: 3, repeatedAddition: '3 + 3 + 3 + 3', multiplication: '4 × 3' }, difficulty: 1, active: true } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }).orFail()
  await LearningActivity.findOneAndUpdate({ title: 'Repeated Addition Review' }, { $set: { skillId: repeatedAddition._id, title: 'Repeated Addition Review', description: 'Practice representing equal groups with addition.', type: 'GUIDED_PRACTICE', content: { examples: ['2 + 2 + 2', '4 + 4 + 4'] }, difficulty: 1, active: true } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true })

  await Assessment.findOneAndUpdate({ title: 'Foundational Numeracy Diagnostic' }, { $set: { title: 'Foundational Numeracy Diagnostic', type: 'DIAGNOSTIC', skillIds: [...skills.values()].map((skill) => skill._id), questionIds, questionCount: 10, difficultyRange: { min: 1, max: 2 }, createdBy: admin._id, targetRole: 'STUDENT', active: true } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true })
  await Assessment.findOneAndUpdate({ title: 'Multiplication Reassessment' }, { $set: { title: 'Multiplication Reassessment', type: 'REASSESSMENT', skillIds: [multiplication._id], questionIds: questionIds.slice(6, 8), questionCount: 2, difficultyRange: { min: 1, max: 2 }, createdBy: admin._id, targetRole: 'STUDENT', active: true } }, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true })

  console.info(`Seed complete: 5 users, 1 teacher, 3 students, ${skills.size} skills, ${questionIds.length} questions, 2 activities, 2 assessments.`)
  void activity
}

seed().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : 'UnknownError'
  console.error(`Seed failed (${name}).`)
  process.exitCode = 1
}).finally(async () => { await disconnectDatabase() })
