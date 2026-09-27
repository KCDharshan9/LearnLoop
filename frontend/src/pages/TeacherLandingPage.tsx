/**
 * TeacherLandingPage.tsx — LearnLoop Teacher Workspace.
 *
 * Visual design consistent with the LearnLoop editorial identity:
 * - Minimalist top navigation via AppShell
 * - Clean overview of classroom curriculum and diagnostic readiness
 * - Warm terracotta accents and thin architectural borders
 */

import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'

interface TeacherLandingPageProps {
  onNavigateToCurriculum?: () => void
}

export default function TeacherLandingPage({ onNavigateToCurriculum }: TeacherLandingPageProps) {
  const { user } = useAuth()

  const navItems = [
    {
      id: 'workspace',
      label: 'Teacher Workspace',
      onClick: () => {},
      active: true,
    },
    ...(onNavigateToCurriculum
      ? [
          {
            id: 'curriculum',
            label: 'Curriculum Graph',
            onClick: onNavigateToCurriculum,
          },
        ]
      : []),
  ]

  return (
    <AppShell navItems={navItems} currentContext="Educator Workspace">
      <div className="max-w-5xl w-full mx-auto px-6 py-12 flex-1 flex flex-col gap-10">
        {/* Editorial Heading */}
        <div className="flex flex-col gap-2 border-b border-stone-300/60 dark:border-stone-800 pb-6">
          <span className="font-technical text-xs text-[#e05a36] uppercase tracking-wider">
            Instruction & Assessment Management
          </span>
          <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-stone-950 dark:text-[#f7f4ed] tracking-tight">
            Teacher Workspace
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-1 max-w-xl">
            Welcome, {user?.name}. Monitor foundational numeracy diagnostic progression, review
            classroom prerequisite gaps, and track student growth.
          </p>
        </div>

        {/* Informational Readiness Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/30 flex flex-col gap-2">
            <span className="font-technical text-[10px] uppercase text-stone-500">
              Curriculum Core
            </span>
            <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
              Foundational Numeracy
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              5 core skills covering Number Sense, Addition, Repeated Addition, Multiplication, and
              Division.
            </p>
            {onNavigateToCurriculum && (
              <button
                onClick={onNavigateToCurriculum}
                className="mt-4 text-xs font-technical text-[#e05a36] hover:underline text-left cursor-pointer"
              >
                Inspect curriculum graph →
              </button>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/30 flex flex-col gap-2">
            <span className="font-technical text-[10px] uppercase text-stone-500">
              Diagnostic Status
            </span>
            <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
              Prerequisite Engine Ready
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Diagnostic attempts automatically pinpoint prerequisite weaknesses before assigning
              learning activities.
            </p>
            <span className="mt-4 font-technical text-[10px] text-stone-400">
              [Phase 4 & 5 persistent data verified]
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/30 flex flex-col gap-2">
            <span className="font-technical text-[10px] uppercase text-stone-500">
              Scheduled Capabilities
            </span>
            <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
              Classroom Analytics
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Full cohort analytics, print question-paper generator, and intervention recommendations
              are mapped for Phase 9.
            </p>
            <span className="mt-4 font-technical text-[10px] text-stone-400">
              [Roadmap: Phase 9 Teacher Analytics]
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
