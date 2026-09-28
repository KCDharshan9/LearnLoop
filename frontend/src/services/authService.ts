import type { ApiError, ApiSuccess } from '../types/api'
import type { AuthUser, DemoSession, StoredSession } from '../types/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'
const SESSION_KEY = 'learnloop_demo_session'

export const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student1@learnloop.xyz', password: 'student123', role: 'STUDENT' as const },
  { label: 'Teacher', email: 'teacher1@learnloop.xyz', password: 'teacher123', role: 'TEACHER' as const },
  { label: 'Admin',   email: 'admin1@learnloop.xyz',   password: 'admin123',   role: 'ADMIN' as const },
] as const

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
}

export function getToken(): string | null {
  return loadSession()?.session.token ?? null
}

interface DemoLoginResponse {
  user: AuthUser
  session: DemoSession
}

export async function demoLogin(email: string, password: string): Promise<DemoLoginResponse> {
  const response = await fetch(`${API_BASE}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const body = (await response.json()) as ApiSuccess<DemoLoginResponse> | ApiError

  if (!body.success) {
    const code = (body as ApiError).error?.code
    if (code === 'INVALID_CREDENTIALS') throw new Error('Invalid credentials. Please try again.')
    throw new Error((body as ApiError).error?.message ?? 'Login failed.')
  }

  return (body as ApiSuccess<DemoLoginResponse>).data
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
