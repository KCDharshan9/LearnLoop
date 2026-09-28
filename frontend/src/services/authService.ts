/**
 * Authentication service.
 *
 * Handles communication with the backend auth API, and manages the
 * session token in localStorage.
 *
 * All auth API calls go through this file. No credentials are stored
 * or hardcoded here — they are submitted by the user at the login form.
 */

import type { ApiError, ApiSuccess } from '../types/api'
import type { AuthUser, Session, StoredSession } from '../types/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'
const SESSION_KEY = 'learnloop_session'

export function saveSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  // Also clear any old session key name from previous versions
  localStorage.removeItem('learnloop_demo_session')
}

export function getToken(): string | null {
  return loadSession()?.session.token ?? null
}

interface LoginResponse {
  user: AuthUser
  session: Session
}

/**
 * POST /api/auth/login
 *
 * Authenticates the user with email and password.
 * Returns the user and session token on success.
 * Throws a user-facing Error on failure.
 */
export async function loginWithCredentials(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const body = (await response.json()) as ApiSuccess<LoginResponse> | ApiError

  if (!body.success) {
    const code = (body as ApiError).error?.code
    if (code === 'INVALID_CREDENTIALS') throw new Error('Invalid email or password.')
    throw new Error((body as ApiError).error?.message ?? 'Sign in failed.')
  }

  return (body as ApiSuccess<LoginResponse>).data
}

/**
 * GET /api/auth/me
 *
 * Verifies the stored token is still valid and returns the current user.
 * Returns null if there is no session or the token is rejected.
 */
export async function getMe(): Promise<AuthUser | null> {
  const token = getToken()
  if (!token) return null

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      clearSession()
      return null
    }

    const body = (await response.json()) as ApiSuccess<{ user: AuthUser }>
    return body.data.user
  } catch {
    return null
  }
}
