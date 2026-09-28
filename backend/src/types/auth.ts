/**
 * Auth types.
 *
 * Defines the authenticated identity, login request/response shapes,
 * and session representation used throughout the backend.
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
}

/** Shape of POST /api/auth/login request body. */
export interface LoginRequest {
  email: string
  password: string
}

/** Shape of successful POST /api/auth/login response data. */
export interface LoginResponseData {
  user: {
    id: string
    name: string
    role: UserRole
    profileId?: string
  }
  session: {
    /** Opaque bearer token used to authenticate subsequent requests. */
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
}
