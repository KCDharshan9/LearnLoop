/**
 * AppShell.tsx — Unified Editorial Application Shell.
 *
 * Clean, lightweight top navigation inspired by modern technical/academic design:
 * - Left: Distinctive LearnLoop wordmark + subtle technical context pill
 * - Center/Right: Restrained text navigation links with active indicators
 * - Far Right: Authenticated user status, theme toggle, and sign out
 * - Background & borders: Dynamic theme support (charcoal dark vs ivory light)
 */

import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

interface NavItem {
  id: string
  label: string
  onClick: () => void
  active?: boolean
}

interface AppShellProps {
  children: ReactNode
  navItems?: NavItem[]
  currentContext?: string
}

export default function AppShell({
  children,
  navItems = [],
  currentContext,
}: AppShellProps) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[#f4f0e8] dark:bg-[#0f0e0c] text-stone-900 dark:text-[#ede7dc] font-sans flex flex-col selection:bg-[#e05a36]/20 selection:text-[#e05a36] transition-colors duration-200">
      {/* Top Editorial Navigation */}
      <header className="border-b border-stone-300/60 dark:border-stone-800/80 bg-[#f4f0e8]/90 dark:bg-[#0f0e0c]/90 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-10 py-3.5 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-editorial text-xl sm:text-2xl font-normal tracking-tight text-stone-950 dark:text-[#f3efe6]">
                LearnLoop
              </span>
              <span className="font-editorial italic text-stone-500 dark:text-stone-400 text-sm">
                .
              </span>
            </div>

            {currentContext && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-technical text-stone-600 dark:text-stone-400 bg-stone-200/50 dark:bg-stone-800/50 border border-stone-300/40 dark:border-stone-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e05a36]"></span>
                {currentContext}
              </span>
            )}
          </div>

          {/* Right Navigation & Tools */}
          <div className="flex items-center gap-3 sm:gap-5 text-xs">
            {navItems.length > 0 && (
              <nav className="flex items-center gap-1 sm:gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`px-3 py-1.5 rounded-full font-technical text-[11px] transition-all cursor-pointer ${
                      item.active
                        ? 'bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-medium shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}

            <div className="h-4 w-[1px] bg-stone-300/60 dark:bg-stone-800 hidden sm:block"></div>

            {user && (
              <div className="hidden md:flex items-center gap-2 font-technical text-[11px] text-stone-600 dark:text-stone-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-stone-900 dark:text-stone-200">{user.name}</span>
                <span className="text-stone-400 dark:text-stone-500">[{user.role.toLowerCase()}]</span>
              </div>
            )}

            <ThemeToggle />

            {user && (
              <button
                onClick={logout}
                className="px-2.5 py-1 rounded text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 font-technical text-[11px] transition-colors"
                title="Sign out of demo session"
              >
                sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full flex flex-col">{children}</main>

      {/* Editorial Footer Note */}
      <footer className="border-t border-stone-300/50 dark:border-stone-800/60 py-6 px-6 sm:px-10 text-center font-technical text-[11px] text-stone-500 dark:text-stone-500 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span>LearnLoop</span>
            <span className="mx-2">•</span>
            <span>foundational numeracy & competency intelligence</span>
          </div>
          <div className="text-stone-400 dark:text-stone-600">
            [prerequisite-aware diagnostic & progression]
          </div>
        </div>
      </footer>
    </div>
  )
}
