/**
 * DemoLoginPage.tsx — LearnLoop Editorial Sign-In.
 *
 * Designed with the editorial, calm, technical visual language inspired by cneuralnets.xyz:
 * - Generous whitespace, large editorial serif heading with subtle warm emphasis
 * - Small technical monospace metadata & role tags
 * - Refined role quick-select cards with thin subtle borders
 * - Manual credentials fallback with clean minimal input fields
 * - Full light/dark mode support with persistent ThemeToggle
 */

import { type FormEvent, useState } from 'react'
import { DEMO_ACCOUNTS } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import type { UserRole } from '../types/auth'

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

  const roleMeta: Record<UserRole, { label: string; desc: string; tag: string }> = {
    STUDENT: {
      label: 'Student',
      desc: 'Experience diagnostic assessment, gap analysis & competency profile.',
      tag: '01 / learner',
    },
    TEACHER: {
      label: 'Teacher',
      desc: 'Classroom curriculum management & learner overview.',
      tag: '02 / educator',
    },
    ADMIN: {
      label: 'Administrator',
      desc: 'Curriculum architecture, question governance & system health.',
      tag: '03 / system',
    },
  }

  return (
    <div className="min-h-screen bg-[#f4f0e8] dark:bg-[#0f0e0c] text-stone-900 dark:text-[#ede7dc] font-sans flex flex-col justify-between p-6 sm:p-12 transition-colors duration-200">
      {/* Top minimal bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-editorial text-2xl font-normal text-stone-950 dark:text-[#f3efe6]">
            LearnLoop
          </span>
          <span className="font-editorial italic text-stone-500 text-sm">.</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-technical text-[11px] text-stone-500 hidden sm:inline-block">
            [demo sandbox]
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero & Authentication Form */}
      <main className="max-w-5xl w-full mx-auto py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Editorial Statement */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 font-technical text-xs text-stone-600 dark:text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e05a36]"></span>
            <span>foundational numeracy & competency loops</span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] tracking-tight text-stone-950 dark:text-[#f7f4ed]">
            competency-based <br />
            learning, <span className="italic text-[#e05a36]">measured</span> & <br />
            reinforced.
          </h1>

          <p className="text-stone-600 dark:text-[#9e988e] text-sm sm:text-base leading-relaxed max-w-lg">
            LearnLoop diagnoses individual numeracy misconceptions, traverses prerequisite skill
            dependencies, and builds tailored learning trajectories from real evidence.
          </p>

          <div className="pt-4 border-t border-stone-300/50 dark:border-stone-800/80 flex items-center gap-6 font-technical text-xs text-stone-500">
            <div>
              <span className="text-stone-950 dark:text-stone-200 font-medium">5</span> skills
            </div>
            <div>•</div>
            <div>
              <span className="text-stone-950 dark:text-stone-200 font-medium">10</span> questions
            </div>
            <div>•</div>
            <div>
              <span className="text-stone-950 dark:text-stone-200 font-medium">0</span> generic assumptions
            </div>
          </div>
        </div>

        {/* Right Column: Role Quick Login & Manual Form */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-technical flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[10px] uppercase underline cursor-pointer ml-3"
              >
                dismiss
              </button>
            </div>
          )}

          {/* Quick Demo Selector */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between font-technical text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
              <span>Select Demo Persona</span>
              <span>1-click sign in</span>
            </div>

            {DEMO_ACCOUNTS.map((account) => {
              const meta = roleMeta[account.role]
              return (
                <button
                  id={`demo-login-${account.role.toLowerCase()}`}
                  key={account.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(account.email, account.password)}
                  className="group p-4 rounded-xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/60 dark:bg-stone-900/40 hover:bg-white dark:hover:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-700 text-left transition-all duration-150 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#e05a36]"
                >
                  <div className="flex flex-col gap-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-technical text-[10px] text-stone-500 dark:text-stone-500 uppercase">
                        {meta.tag}
                      </span>
                      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-[#e05a36] transition-colors">
                        {account.label}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug">
                      {meta.desc}
                    </p>
                  </div>

                  <span className="font-technical text-xs text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-200 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-[1px] bg-stone-300/60 dark:bg-stone-800/80"></div>
            <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
              or custom credentials
            </span>
            <div className="flex-1 h-[1px] bg-stone-300/60 dark:bg-stone-800/80"></div>
          </div>

          {/* Manual Credentials Form */}
          <form
            onSubmit={handleFormSubmit}
            className="p-5 rounded-xl border border-stone-300/60 dark:border-stone-800/80 bg-stone-100/30 dark:bg-stone-900/20 flex flex-col gap-3.5"
          >
            <div>
              <label
                htmlFor="login-email"
                className="block font-technical text-[11px] uppercase text-stone-500 dark:text-stone-400 mb-1"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@learnloop.xyz"
                className="w-full px-3 py-2 rounded-lg border border-stone-300/80 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs font-technical placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-[#e05a36] focus:ring-1 focus:ring-[#e05a36]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block font-technical text-[11px] uppercase text-stone-500 dark:text-stone-400 mb-1"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-stone-300/80 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs font-technical placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-[#e05a36] focus:ring-1 focus:ring-[#e05a36]"
              />
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-2.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-technical font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </main>

      {/* Bottom Subtext */}
      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-stone-300/40 dark:border-stone-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-technical text-stone-500">
        <div>LearnLoop educational research platform</div>
        <div>[Phase 0 through 5 verified]</div>
      </footer>
    </div>
  )
}
