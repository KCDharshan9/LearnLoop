/**
 * LoginPage.tsx — LearnLoop Sign In.
 *
 * Clean, product-grade login experience matching the LearnLoop editorial visual identity:
 * - Generous whitespace, editorial serif heading
 * - Standard email/password form
 * - Minimal error feedback
 * - Full light/dark mode support
 *
 * No demo personas, no 1-click buttons, no credential display.
 */

import { type FormEvent, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

export default function LoginPage() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f0e8] dark:bg-[#0f0e0c] text-stone-900 dark:text-[#ede7dc] font-sans flex flex-col justify-between p-6 sm:p-12 transition-colors duration-200">
      {/* Top bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <span className="font-editorial text-2xl font-normal text-stone-950 dark:text-[#f3efe6]">
          LearnLoop
        </span>
        <ThemeToggle />
      </header>

      {/* Sign-in layout */}
      <main className="max-w-5xl w-full mx-auto py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left: Editorial statement */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 font-technical text-xs text-stone-600 dark:text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e05a36]"></span>
            <span>foundational numeracy &amp; competency loops</span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] tracking-tight text-stone-950 dark:text-[#f7f4ed]">
            competency-based <br />
            learning, <span className="italic text-[#e05a36]">measured</span> &amp; <br />
            reinforced.
          </h1>

          <p className="text-stone-600 dark:text-[#9e988e] text-sm sm:text-base leading-relaxed max-w-lg">
            LearnLoop diagnoses individual numeracy misconceptions, traverses prerequisite skill
            dependencies, and builds tailored learning trajectories from real evidence.
          </p>
        </div>

        {/* Right: Sign-in form */}
        <div className="lg:col-span-6 flex flex-col gap-5">
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

          <form
            onSubmit={handleFormSubmit}
            className="p-6 sm:p-8 rounded-2xl border border-stone-300/60 dark:border-stone-800/80 bg-stone-100/30 dark:bg-stone-900/20 flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1">
              <h2 className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
                Sign in
              </h2>
              <p className="font-technical text-xs text-stone-500 dark:text-stone-400">
                Enter your email and password to continue.
              </p>
            </div>

            <div>
              <label
                htmlFor="login-email"
                className="block font-technical text-[11px] uppercase text-stone-500 dark:text-stone-400 mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@learnloop.xyz"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300/80 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm font-technical placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-[#e05a36] focus:ring-1 focus:ring-[#e05a36] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block font-technical text-[11px] uppercase text-stone-500 dark:text-stone-400 mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300/80 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm font-technical placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-[#e05a36] focus:ring-1 focus:ring-[#e05a36] transition-colors"
              />
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-3 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-sm font-technical font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-stone-300/40 dark:border-stone-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-technical text-stone-500">
        <div>LearnLoop — Competency-Based Learning Platform</div>
        <div>Prerequisite-aware · Evidence-driven · Adaptive</div>
      </footer>
    </div>
  )
}
