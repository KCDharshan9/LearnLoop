/**
 * Auth controller.
 *
 * Keeps HTTP concerns (parsing request, building response, status codes)
 * separate from auth business logic, which lives in authService.ts.
 */

import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js'
import type { ApiError } from '../types/api.js'
import type {
  DemoLoginRequest,
  DemoLoginResponseData,
  MeResponseData,
} from '../types/auth.js'
import { AuthError, demoLogin, encodeSessionToken } from '../services/authService.js'

/** POST /api/auth/demo-login */
export async function postDemoLogin(
  request: Request<object, object, DemoLoginRequest>,
  response: Response,
): Promise<void> {
  const { email, password } = request.body ?? {}

  if (typeof email !== 'string' || !email.trim()) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'email is required.' },
    }
    response.status(400).json(body)
    return
  }

  if (typeof password !== 'string' || !password) {
    const body: ApiError = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'password is required.' },
    }
    response.status(400).json(body)
    return
  }

  try {
    const authenticatedUser = await demoLogin({ email, password })
    const token = encodeSessionToken(authenticatedUser)

    const data: DemoLoginResponseData = {
      user: {
        id: authenticatedUser.userId,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
        profileId: authenticatedUser.profileId,
      },
      session: {
        type: 'demo',
        token,
      },
    }

    response.status(200).json({ success: true, data })
  } catch (error) {
    if (error instanceof AuthError && error.code === 'INVALID_CREDENTIALS') {
      const body: ApiError = {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
      }
      response.status(401).json(body)
      return
    }
    // Re-throw unexpected errors for the global error handler.
    throw error
  }
}

/** GET /api/auth/me — requires requireAuth middleware upstream */
export function getMe(request: Request, response: Response): void {
  // requireAuth middleware guarantees this cast is safe.
  const user = (request as AuthenticatedRequest).user

  const data: MeResponseData = {
    user: {
      id: user.userId,
      name: user.name,
      role: user.role,
      profileId: user.profileId,
    },
    session: {
      type: 'demo',
    },
  }

  response.status(200).json({ success: true, data })
}
