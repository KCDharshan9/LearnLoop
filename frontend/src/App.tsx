/**
 * App.tsx — Phase 2 root component.
 *
 * Routing strategy (no react-router yet — added when Phase 3+ pages are built):
 *
 *   Not logged in → DemoLoginPage
 *   Logged in     → temporary "logged in" placeholder showing role and user info
 *
 * The authenticated placeholder is intentional: the actual student/teacher/admin
 * dashboards are Phase 3+. This confirms auth works without building premature UI.
 */

import { AuthProvider, useAuth } from './contexts/AuthContext'
import DemoLoginPage from './pages/DemoLoginPage'

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  ADMIN: 'Admin',
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'text-sky-600',
  TEACHER: 'text-violet-600',
  ADMIN: 'text-amber-600',
}

function AuthenticatedPlaceholder() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white/5 backdrop-blur-sm ring-1 ring-white/10 rounded-2xl p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-500/30 mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Signed in successfully</h1>
          <p className="text-slate-400 text-sm mb-6">Phase 2 authentication is working.</p>

          <div className="bg-white/5 rounded-xl p-4 text-left mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Name</span>
              <span className="text-sm text-white font-medium">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Role</span>
              <span className={`text-sm font-semibold ${ROLE_COLORS[user.role] ?? 'text-white'}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wide">User ID</span>
              <span className="text-xs text-slate-400 font-mono truncate max-w-[180px]">{user.id}</span>
            </div>
            {user.profileId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Profile ID</span>
                <span className="text-xs text-slate-400 font-mono truncate max-w-[180px]">{user.profileId}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 mb-6">
            Student / Teacher / Admin dashboards are Phase 3+.
            <br />
            This screen confirms the auth layer is functional.
          </p>

          <button
            id="logout-button"
            type="button"
            onClick={logout}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </main>
    )
  }

  return user ? <AuthenticatedPlaceholder /> : <DemoLoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
