/**
 * Authentication service.
 *
 * Implements local email/password authentication using bcrypt password hashing.
 * Session tokens are Base64-encoded JSON payloads — a lightweight mechanism
 * that keeps the architecture token-based. Replace with JWT when needed by
 * swapping only this file's encodeSessionToken / decodeSessionToken functions.
 *
 * Responsibilities:
 *   - Verify email/password credentials against MongoDB users.
 *   - Resolve associated domain profiles (Student, Teacher).
 *   - Encode and decode bearer session tokens.
 *
 * Security:
 *   - Passwords are NEVER stored or logged in plaintext.
 *   - bcrypt comparison is used for all credential checks.
 *   - Invalid credentials always return the same message regardless of whether
 *     the user exists, to prevent user enumeration.
 */

import bcrypt from 'bcryptjs'
import { Student, Teacher, User } from '../models/index.js'
import type { AuthenticatedUser, LoginRequest, UserRole } from '../types/auth.js'

/** Error thrown when credentials are invalid or the user cannot be authenticated. */
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
 * Authenticate a user by email and password.
 *
 * 1. Look up the active user by email.
 * 2. Compare the submitted password against the stored bcrypt hash.
 * 3. Resolve the associated domain profile (Student or Teacher).
 * 4. Return a safe AuthenticatedUser object for token encoding.
 */
export async function login(request: LoginRequest): Promise<AuthenticatedUser> {
  const emailNormalized = request.email.trim().toLowerCase()

  const user = await User.findOne({ email: emailNormalized, active: true }).select(
    '_id name email role passwordHash',
  )

  // Return a generic error regardless of whether the user exists
  // to prevent user enumeration attacks.
  if (!user || !user.passwordHash) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid credentials.')
  }

  const passwordValid = await bcrypt.compare(request.password, user.passwordHash)
  if (!passwordValid) {
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
  }
}

/**
 * Encode an AuthenticatedUser into a bearer session token.
 *
 * Current implementation: Base64-encoded JSON.
 * This is a lightweight placeholder — it has no cryptographic signature and no expiry.
 * Replace with a signed JWT (using jsonwebtoken) when production security is required.
 * Only this function and decodeSessionToken need to change for that upgrade.
 */
export function encodeSessionToken(user: AuthenticatedUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}

/**
 * Decode a bearer session token back into an AuthenticatedUser.
 *
 * Returns null if the token is absent, malformed, or missing required fields.
 * Never throws — callers treat a null result as unauthenticated.
 */
export function decodeSessionToken(token: string | undefined): AuthenticatedUser | null {
  if (!token) return null
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as unknown
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as Record<string, unknown>).userId !== 'string' ||
      typeof (payload as Record<string, unknown>).role !== 'string'
    ) {
      return null
    }
    return payload as AuthenticatedUser
  } catch {
    return null
  }
}

/**
 * Hash a plaintext password using bcrypt.
 * Used by the seed script to create users with hashed passwords.
 * Never called during normal application requests.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12)
}
