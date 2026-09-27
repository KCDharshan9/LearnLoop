/**
 * Auth routes.
 *
 * POST /api/auth/demo-login   — public, no authentication required.
 * GET  /api/auth/me           — requires a valid session token (requireAuth).
 *
 * A minimal role-protected test route is included to exercise and demonstrate
 * the authorization middleware without polluting the public API:
 *
 * GET /api/auth/test/admin    — ADMIN only
 * GET /api/auth/test/teacher  — TEACHER or ADMIN
 * GET /api/auth/test/student  — STUDENT only
 *
 * These routes return a simple confirmation payload and are intended for
 * internal verification. They can be removed once the first real protected
 * routes are introduced in later phases.
 */

import { Router } from 'express'
import { getMe, postDemoLogin } from '../controllers/authController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js'

export const authRouter = Router()

// ── Public endpoints ─────────────────────────────────────────────────────────
authRouter.post('/demo-login', postDemoLogin)

// ── Authenticated endpoints ───────────────────────────────────────────────────
authRouter.get('/me', requireAuth, getMe)

// ── Internal authorization demonstration routes ───────────────────────────────
// These exist solely to verify that the role middleware works correctly.
authRouter.get(
  '/test/admin',
  requireAuth,
  requireRole('ADMIN'),
  (req, res) => { res.status(200).json({ success: true, data: { message: 'ADMIN access confirmed.', user: (req as AuthenticatedRequest).user.name } }) },
)

authRouter.get(
  '/test/teacher',
  requireAuth,
  requireRole('TEACHER', 'ADMIN'),
  (req, res) => { res.status(200).json({ success: true, data: { message: 'TEACHER/ADMIN access confirmed.', user: (req as AuthenticatedRequest).user.name } }) },
)

authRouter.get(
  '/test/student',
  requireAuth,
  requireRole('STUDENT'),
  (req, res) => { res.status(200).json({ success: true, data: { message: 'STUDENT access confirmed.', user: (req as AuthenticatedRequest).user.name } }) },
)
