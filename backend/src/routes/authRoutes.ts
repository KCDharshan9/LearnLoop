/**
 * Auth routes.
 *
 * POST /api/auth/login — authenticate with email + password, returns bearer token
 * GET  /api/auth/me    — verify current session and return authenticated user
 */

import { Router } from 'express'
import { getMe, postLogin } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const authRouter = Router()

authRouter.post('/login', postLogin)
authRouter.get('/me', requireAuth, getMe)
