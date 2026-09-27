/**
 * Auth types for Phase 2 demo authentication.
 *
 * These types are intentionally kept replaceable.
 * The DemoSession can later be replaced with a proper JWT or session token
 * without requiring changes to every protected route handler.
 */

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

/** Minimal authenticated identity attached to every authenticated request. */
export interface AuthenticatedUser {
  /** MongoDB User _id as a string. */
  userId: string
  /** Display name from the User document. */
  name: string
  /** Application role. */
  role: UserRole
  /**
   * MongoDB Student or Teacher _id as a string.
   * Absent for ADMIN users (no separate domain profile required by the data model).
   */
  profileId?: string
  /** Session kind — "demo" for the expo phase. */
  sessionType: 'demo'
}

/** Shape of POST /api/auth/demo-login request body. */
export interface DemoLoginRequest {
  email: string
  password: string
}

/** Shape of successful POST /api/auth/demo-login response data. */
export interface DemoLoginResponseData {
  user: {
    id: string
    name: string
    role: UserRole
    profileId?: string
  }
  session: {
    type: 'demo'
    /** Opaque token used to authenticate subsequent requests. */
    token: string
  }
}

/** Shape of GET /api/auth/me response data. */
export interface MeResponseData {
  user: {
    id: string
    name: string
    role: UserRole
    profileId?: string
  }
  session: {
    type: 'demo'
  }
}
