/**
 * Demo authentication service.
 *
 * Phase 2 scope: validate a demo email/password against the seeded users
 * and resolve the associated domain profile (Student or Teacher).
 *
 * The service is intentionally isolated so that it can be replaced with a
 * proper authentication service (e.g. JWT + bcrypt) without touching routes,
 * controllers or middleware.
 */

import { Student, Teacher, User } from '../models/index.js'
import type { AuthenticatedUser, DemoLoginRequest, UserRole } from '../types/auth.js'

/**
 * Well-known demo passwords accepted by the expo system.
 * These are intentionally simple — the expo has no production security requirement.
 * They are listed centrally here so they never scatter across the codebase.
 */
const DEMO_PASSWORDS: Record<string, string> = {
  'admin1@learnloop.xyz': 'admin123',
  'teacher1@learnloop.xyz': 'teacher123',
  'student1@learnloop.xyz': 'student123',
  'student2@learnloop.xyz': 'student123',
  'student3@learnloop.xyz': 'student123',
}

/** Error thrown when demo credentials are invalid or the user is not found. */
export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Attempt a demo login.
 *
 * 1. Look up the user by email in the `users` collection.
 * 2. Validate the provided password against the known demo passwords.
 * 3. Resolve the associated domain profile (Student or Teacher) if it exists.
 * 4. Return an AuthenticatedUser object that is safe to encode into a session.
 *
 * Passwords are never logged.
 */
export async function demoLogin(request: DemoLoginRequest): Promise<AuthenticatedUser> {
  const emailNormalized = request.email.trim().toLowerCase()

  const user = await User.findOne({ email: emailNormalized, active: true }).select(
    '_id name email role demoCredentialId',
  )

  if (!user) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid credentials.')
  }

  const expectedPassword = DEMO_PASSWORDS[emailNormalized]
  if (!expectedPassword || request.password !== expectedPassword) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid credentials.')
  }

  const userId = (user._id as { toString(): string }).toString()
  const role = user.role as UserRole

  let profileId: string | undefined

  if (role === 'STUDENT') {
    const student = await Student.findOne({ userId: user._id }).select('_id')
    if (student) profileId = (student._id as { toString(): string }).toString()
  } else if (role === 'TEACHER') {
    const teacher = await Teacher.findOne({ userId: user._id }).select('_id')
    if (teacher) profileId = (teacher._id as { toString(): string }).toString()
  }
  // ADMIN: no separate domain profile required per data model.

  return {
    userId,
    name: user.name,
    role,
    profileId,
    sessionType: 'demo',
  }
}

/**
 * Encode an AuthenticatedUser into an opaque demo session token.
 *
 * Phase 2 implementation: a Base64-encoded JSON payload.
 * This is intentionally NOT a production token — it has no signature, no expiry,
 * and no cryptographic verification. It is a placeholder that makes the
 * architecture token-based so that a proper JWT can slot in later.
 *
 * The token structure is deliberately simple and documented here.
 */
export function encodeSessionToken(user: AuthenticatedUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}

/**
 * Decode a demo session token back into an AuthenticatedUser.
 *
 * Returns null if the token is absent, malformed or not a demo session.
 * Never throws — callers should treat a null result as unauthenticated.
 */
export function decodeSessionToken(token: string | undefined): AuthenticatedUser | null {
  if (!token) return null
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as unknown
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as Record<string, unknown>).userId !== 'string' ||
      typeof (payload as Record<string, unknown>).role !== 'string' ||
      (payload as Record<string, unknown>).sessionType !== 'demo'
    ) {
      return null
    }
    return payload as AuthenticatedUser
  } catch {
    return null
  }
}
