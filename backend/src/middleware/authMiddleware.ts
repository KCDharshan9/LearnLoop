/**
 * Authentication and authorization middleware.
 *
 * requireAuth   — verifies the request carries a valid demo session token.
 *                 Attaches the decoded AuthenticatedUser to request.user.
 *
 * requireRole   — factory that returns a middleware which checks that the
 *                 authenticated user's role is in the allowed set.
 *
 * Both middlewares use the structured API error format defined in types/api.ts.
 *
 * Design note:
 * The token is read from the Authorization header as a Bearer token.
 * This matches the pattern used by JWT-based systems, so replacing the
 * demo token with a real JWT later requires only changes inside authService.ts.
 */

import type { NextFunction, Request, Response } from 'express'
import type { ApiError } from '../types/api.js'
import type { AuthenticatedUser, UserRole } from '../types/auth.js'
import { decodeSessionToken } from '../services/authService.js'

/**
 * Internal type for a request that has been authenticated.
 * Used as a local type assertion after requireAuth passes.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser
}

/**
 * Extract the Bearer token from the Authorization header.
 * Returns undefined if absent or malformed.
 */
function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return undefined
  const token = header.slice(7).trim()
  return token || undefined
}

/**
 * Middleware: require a valid demo session token.
 *
 * On success: attaches `(request as AuthenticatedRequest).user` and calls next().
 * On failure: responds 401 UNAUTHORIZED.
 */
export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const token = extractBearerToken(request)
  const user = decodeSessionToken(token)

  if (!user) {
    const body: ApiError = {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    }
    response.status(401).json(body)
    return
  }

  // Attach user to the request object for downstream handlers.
  // Using (request as AuthenticatedRequest) in controllers avoids global augmentation.
  ;(request as AuthenticatedRequest).user = user
  next()
}

/**
 * Middleware factory: require the authenticated user to have one of the
 * specified roles.
 *
 * Must be used after requireAuth in the middleware chain.
 *
 * On success: calls next().
 * On failure: responds 403 FORBIDDEN.
 */
export function requireRole(...roles: UserRole[]) {
  return function (request: Request, response: Response, next: NextFunction): void {
    const user = (request as AuthenticatedRequest).user

    if (!user) {
      const body: ApiError = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      }
      response.status(401).json(body)
      return
    }

    if (!roles.includes(user.role)) {
      const body: ApiError = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}.`,
        },
      }
      response.status(403).json(body)
      return
    }

    next()
  }
}
