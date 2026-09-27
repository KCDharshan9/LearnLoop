/**
 * DemoLoginPage
 *
 * Temporary Phase 2 demo login screen.
 *
 * Allows the developer / presenter to:
 * - Click a quick-login button (Student / Teacher / Admin) to instantly log in
 *   as the corresponding seeded demo account.
 * - Or type custom credentials and submit the form manually.
 *
 * This page is NOT the final LearnLoop UI. It will be replaced in later phases
 * by the polished product design. Its purpose is solely to wire the auth layer
 * so other phases can build on authenticated routes.
 */

import { type FormEvent, useState } from 'react'
import { DEMO_ACCOUNTS } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/auth'

const ROLE_COLORS: Record<UserRole, { bg: string; hover: string; text: string; badge: string }> = {
  STUDENT: {
    bg: 'bg-sky-600',
    hover: 'hover:bg-sky-700',
    text: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-700',
  },
  TEACHER: {
    bg: 'bg-violet-600',
    hover: 'hover:bg-violet-700',
    text: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
  },
  ADMIN: {
    bg: 'bg-amber-600',
    hover: 'hover:bg-amber-700',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
}

export default function DemoLoginPage() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleQuickLogin(accountEmail: string, accountPassword: string) {
    setError(null)
    setLoading(true)
    try {
      await login(accountEmail, accountPassword)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/20 ring-1 ring-sky-500/30 mb-4">
            <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">LearnLoop</h1>
          <p className="text-slate-400 mt-1 text-sm">Competency-based adaptive learning</p>
        </div>

        {/* Demo accounts card */}
        <div className="bg-white/5 backdrop-blur-sm ring-1 ring-white/10 rounded-2xl p-6 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
            Quick demo login
          </p>
          <div className="grid gap-3">
            {DEMO_ACCOUNTS.map((account) => {
              const colors = ROLE_COLORS[account.role]
              return (
                <button
                  id={`demo-login-${account.role.toLowerCase()}`}
                  key={account.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(account.email, account.password)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-white font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${colors.bg} ${colors.hover} shadow-sm`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20`}>
                      {account.role}
                    </span>
                    <span>{account.label}</span>
                  </span>
                  <span className="text-sm opacity-70">{account.email}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Manual login form */}
        <details className="bg-white/5 backdrop-blur-sm ring-1 ring-white/10 rounded-2xl overflow-hidden">
          <summary className="px-6 py-4 text-sm text-slate-400 cursor-pointer select-none hover:text-slate-300 transition-colors">
            Or enter credentials manually
          </summary>
          <div className="px-6 pb-6">
            <form id="demo-login-form" onSubmit={handleFormSubmit} noValidate className="space-y-4 mt-2">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-400 mb-1">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@learnloop.demo"
                  className="w-full rounded-lg bg-white/10 ring-1 ring-white/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-400 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="demo-student"
                  className="w-full rounded-lg bg-white/10 ring-1 ring-white/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </details>

        {/* Error display */}
        {error && (
          <div
            role="alert"
            className="mt-4 px-4 py-3 rounded-xl bg-red-500/20 ring-1 ring-red-500/30 text-red-300 text-sm"
          >
            {error}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Demo authentication — Phase 2 MVP
        </p>
      </div>
    </main>
  )
}
