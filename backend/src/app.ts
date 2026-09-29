import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { assessmentAttemptRouter } from './routes/assessmentAttemptRoutes.js'
import { assessmentRouter } from './routes/assessmentRoutes.js'
import { authRouter } from './routes/authRoutes.js'
import { healthRouter } from './routes/healthRoutes.js'
import { questionRouter } from './routes/questionRoutes.js'
import { skillRouter } from './routes/skillRoutes.js'
import { studentRouter } from './routes/studentRoutes.js'
import { learningPathRouter } from './routes/learningPathRoutes.js'
import { practiceRouter } from './routes/practiceRoutes.js'

export const app = express()
app.use(cors({ origin: env.clientUrl }))
app.use(express.json())
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/skills', skillRouter)
app.use('/api/questions', questionRouter)
app.use('/api/assessments', assessmentRouter)
app.use('/api/assessment-attempts', assessmentAttemptRouter)
app.use('/api/students', studentRouter)
app.use('/api/learning-paths', learningPathRouter)
app.use('/api/practice', practiceRouter)
app.use(notFound)
app.use(errorHandler)
