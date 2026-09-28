import { Router } from 'express'
import { getMe, postDemoLogin } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const authRouter = Router()

authRouter.post('/demo-login', postDemoLogin)
authRouter.get('/me', requireAuth, getMe)
