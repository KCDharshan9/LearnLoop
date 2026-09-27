import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { healthRouter } from './routes/healthRoutes.js'

export const app = express()
app.use(cors({ origin: env.clientUrl }))
app.use(express.json())
app.use('/api', healthRouter)
app.use(notFound)
app.use(errorHandler)
