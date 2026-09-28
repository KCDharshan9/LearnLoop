/** Auth types shared across the frontend. */

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface AuthUser {
  id: string
  name: string
  role: UserRole
  profileId?: string
}

export interface Session {
  token: string
}

/** What is stored in localStorage to represent the current session. */
export interface StoredSession {
  user: AuthUser
  session: Session
}
