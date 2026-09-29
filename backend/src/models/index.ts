import { model, Schema } from 'mongoose'

const id = Schema.Types.ObjectId
const competencyStatuses = ['NEEDS_SUPPORT', 'DEVELOPING', 'MASTERED']

export const User = model('User', new Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true, index: true, lowercase: true }, passwordHash: String, demoCredentialId: String, role: { type: String, required: true, enum: ['ADMIN', 'TEACHER', 'STUDENT'] }, active: { type: Boolean, required: true, default: true } }, { timestamps: true, collection: 'users' }))

export const Student = model('Student', new Schema({ userId: { type: id, ref: 'User', required: true, unique: true, index: true }, studentCode: { type: String, required: true, unique: true }, name: { type: String, required: true }, grade: { type: Number, required: true, min: 1 }, teacherIds: [{ type: id, ref: 'Teacher' }], currentLevel: { type: Number, required: true, min: 1 }, learningPathId: { type: id, ref: 'LearningPath' } }, { timestamps: true, collection: 'students' }))

export const Teacher = model('Teacher', new Schema({ userId: { type: id, ref: 'User', required: true, unique: true }, name: { type: String, required: true }, schoolId: String, studentIds: [{ type: id, ref: 'Student' }] }, { timestamps: true, collection: 'teachers' }))

export const Skill = model('Skill', new Schema({ name: { type: String, required: true }, slug: { type: String, required: true, unique: true }, description: { type: String, required: true }, level: { type: Number, required: true, min: 1 }, competency: { type: String, required: true }, prerequisiteIds: [{ type: id, ref: 'Skill' }], order: { type: Number, required: true, min: 1 }, active: { type: Boolean, required: true, default: true } }, { timestamps: true, collection: 'skills' }))

const optionSchema = new Schema({ label: { type: String, required: true }, value: { type: Schema.Types.Mixed, required: true } }, { _id: false })
export const Question = model('Question', new Schema({ skillId: { type: id, ref: 'Skill', required: true }, prerequisiteSkillIds: [{ type: id, ref: 'Skill' }], type: { type: String, required: true, enum: ['MCQ', 'NUMBER_INPUT', 'TRUE_FALSE', 'MATCHING', 'INTERACTIVE'] }, difficulty: { type: Number, required: true, min: 1 }, prompt: { type: String, required: true }, options: [optionSchema], correctAnswer: { type: Schema.Types.Mixed, required: true }, explanation: { type: String, required: true }, competency: { type: String, required: true }, level: { type: Number, required: true, min: 1 }, generationTemplate: Schema.Types.Mixed, source: { type: String, required: true }, active: { type: Boolean, required: true, default: true } }, { timestamps: true, collection: 'questions' }))

export const LearningActivity = model('LearningActivity', new Schema({ skillId: { type: id, ref: 'Skill', required: true }, title: { type: String, required: true }, description: { type: String, required: true }, type: { type: String, required: true }, content: { type: Schema.Types.Mixed, required: true }, difficulty: { type: Number, required: true, min: 1 }, active: { type: Boolean, required: true, default: true } }, { timestamps: true, collection: 'learningActivities' }))

export const Assessment = model('Assessment', new Schema({ title: { type: String, required: true }, type: { type: String, required: true, enum: ['DIAGNOSTIC', 'REASSESSMENT', 'PRACTICE', 'OFFLINE_PAPER'] }, skillIds: [{ type: id, ref: 'Skill' }], questionIds: [{ type: id, ref: 'Question' }], questionCount: { type: Number, required: true, min: 1 }, difficultyRange: { min: { type: Number, required: true }, max: { type: Number, required: true } }, createdBy: { type: id, ref: 'User', required: true }, targetRole: { type: String, required: true, enum: ['ADMIN', 'TEACHER', 'STUDENT'] }, active: { type: Boolean, required: true, default: true } }, { timestamps: true, collection: 'assessments' }))

const answerSchema = new Schema({ questionId: { type: id, ref: 'Question', required: true }, answer: { type: Schema.Types.Mixed, required: true }, isCorrect: { type: Boolean, required: true }, skillId: { type: id, ref: 'Skill', required: true }, difficulty: { type: Number, required: true }, answeredAt: { type: Date, required: true } }, { _id: false })
const resultSchema = new Schema({ skillId: { type: id, ref: 'Skill', required: true }, correct: { type: Number, required: true }, attempted: { type: Number, required: true }, score: { type: Number, required: true, min: 0, max: 100 }, status: { type: String, required: true, enum: competencyStatuses } }, { _id: false })
export const AssessmentAttempt = model('AssessmentAttempt', new Schema({ assessmentId: { type: id, ref: 'Assessment', required: true, index: true }, studentId: { type: id, ref: 'Student', required: true, index: true }, answers: [answerSchema], status: { type: String, required: true, enum: ['IN_PROGRESS', 'SUBMITTED', 'ABANDONED'] }, startedAt: { type: Date, required: true }, submittedAt: Date, skillResults: [resultSchema], overallScore: { type: Number, min: 0, max: 100 }, learningGap: Schema.Types.Mixed, recommendation: Schema.Types.Mixed }, { timestamps: true, collection: 'assessmentAttempts' }))

export const LearnerSkillState = model('LearnerSkillState', new Schema({ studentId: { type: id, ref: 'Student', required: true, index: true }, skillId: { type: id, ref: 'Skill', required: true, index: true }, score: { type: Number, required: true, min: 0, max: 100 }, status: { type: String, required: true, enum: competencyStatuses }, evidenceCount: { type: Number, required: true, min: 0 }, lastAssessedAt: { type: Date, required: true }, previousScore: Number, trend: { type: String, required: true, enum: ['IMPROVING', 'STABLE', 'DECLINING', 'UNKNOWN'] }, source: { type: String, required: true, enum: ['DIAGNOSTIC', 'PRACTICE', 'REASSESSMENT', 'MANUAL'] } }, { timestamps: { createdAt: false, updatedAt: true }, collection: 'learnerSkillStates' }))

const stepSchema = new Schema({ stepNumber: { type: Number, required: true }, type: { type: String, required: true, enum: ['REVIEW', 'INTERACTIVE_ACTIVITY', 'PRACTICE', 'REASSESSMENT'] }, skillId: { type: id, ref: 'Skill', required: true }, title: { type: String, required: true }, description: { type: String, required: true }, activityId: { type: id, ref: 'LearningActivity' }, status: { type: String, required: true }, completedAt: Date }, { _id: false })
export const LearningPath = model('LearningPath', new Schema({ studentId: { type: id, ref: 'Student', required: true }, targetSkillId: { type: id, ref: 'Skill', required: true }, reason: { type: String, required: true }, status: { type: String, required: true }, steps: [stepSchema] }, { timestamps: true, collection: 'learningPaths' }))

export const ActivityAttempt = model('ActivityAttempt', new Schema({ studentId: { type: id, ref: 'Student', required: true }, activityId: { type: id, ref: 'LearningActivity', required: true }, responses: { type: Schema.Types.Mixed, required: true }, completed: { type: Boolean, required: true }, score: Number, startedAt: { type: Date, required: true }, completedAt: Date }, { collection: 'activityAttempts' }))

export const PracticeSession = model('PracticeSession', new Schema({
  studentId: { type: id, ref: 'Student', required: true, index: true },
  skillId: { type: id, ref: 'Skill', required: true },
  learningPathId: { type: id, ref: 'LearningPath', index: true },
  stepNumber: { type: Number },
  currentDifficulty: { type: Number, required: true, min: 1 },
  currentQuestionId: { type: id, ref: 'Question' },
  questionHistory: [{ type: id, ref: 'Question' }],
  correctCount: { type: Number, default: 0 },
  totalAnswered: { type: Number, default: 0 },
  consecutiveCorrect: { type: Number, default: 0 },
  consecutiveIncorrect: { type: Number, default: 0 },
  status: { type: String, required: true, enum: ['ACTIVE', 'COMPLETED', 'ABANDONED'] },
  startedAt: { type: Date, required: true },
  completedAt: Date
}, { collection: 'practiceSessions' }))

export const PracticeAttempt = model('PracticeAttempt', new Schema({ sessionId: { type: id, ref: 'PracticeSession', required: true }, studentId: { type: id, ref: 'Student', required: true, index: true }, skillId: { type: id, ref: 'Skill', required: true }, questionId: { type: id, ref: 'Question', required: true }, answer: { type: Schema.Types.Mixed, required: true }, isCorrect: { type: Boolean, required: true }, difficulty: { type: Number, required: true }, previousDifficulty: { type: Number, required: true }, nextDifficulty: { type: Number, required: true }, hintUsed: { type: Boolean, required: true, default: false } }, { timestamps: { createdAt: true, updatedAt: false }, collection: 'practiceAttempts' }))

export const ProgressHistory = model('ProgressHistory', new Schema({ studentId: { type: id, ref: 'Student', required: true, index: true }, skillId: { type: id, ref: 'Skill', required: true }, eventType: { type: String, required: true, enum: ['DIAGNOSTIC', 'PRACTICE', 'INTERVENTION_COMPLETED', 'REASSESSMENT', 'STATUS_CHANGED'] }, previousScore: Number, newScore: { type: Number, required: true }, previousStatus: { type: String, enum: competencyStatuses }, newStatus: { type: String, required: true, enum: competencyStatuses }, relatedAssessmentId: { type: id, ref: 'Assessment' }, relatedActivityId: { type: id, ref: 'LearningActivity' }, timestamp: { type: Date, required: true } }, { collection: 'progressHistory' }))

export const QuestionPaper = model('QuestionPaper', new Schema({ createdBy: { type: id, ref: 'User', required: true }, title: { type: String, required: true }, grade: { type: Number, required: true }, skillIds: [{ type: id, ref: 'Skill' }], difficulty: { type: Number, required: true }, questionIds: [{ type: id, ref: 'Question' }], questionCount: { type: Number, required: true }, answerKey: { type: Schema.Types.Mixed, required: true }, format: { type: String, required: true, enum: ['PDF', 'PRINT'] } }, { timestamps: { createdAt: true, updatedAt: false }, collection: 'questionPapers' }))
