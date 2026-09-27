/**
 * AuthContext
 *
 * Provides the current session (user + token) to the component tree.
 * Components should call useAuth() to read authentication state and access
 * the login/logout helpers.
 *
 * This context is intentionally thin — it holds state and delegates API
 * calls to authService.ts.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSession,
  demoLogin,
  loadSession,
  saveSession,
} from '../services/authService'
import type { AuthUser, StoredSession } from '../types/auth'

interface AuthContextValue {
  /** The authenticated user, or null if not logged in. */
  user: AuthUser | null
  /** True while the initial session check is running. */
  isLoading: boolean
  /**
   * Attempt a demo login.
   * Stores the session and updates `user` on success.
   * Throws a human-readable Error on failure.
   */
  login(email: string, password: string): Promise<void>
  /** Clear the current session. */
  logout(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, restore session from localStorage if one exists.
  useEffect(() => {
    const stored: StoredSession | null = loadSession()
    if (stored?.user) {
      setUser(stored.user)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const data = await demoLogin(email, password)
    const session: StoredSession = {
      user: data.user,
      session: data.session,
    }
    saveSession(session)
    setUser(data.user)
  }, [])

  const logout = useCallback((): void => {
    clearSession()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Hook to consume AuthContext. Must be used inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
