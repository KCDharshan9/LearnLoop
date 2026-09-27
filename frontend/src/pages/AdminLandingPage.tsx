/**
 * AdminLandingPage.tsx — LearnLoop System Administration.
 *
 * Visual design consistent with the LearnLoop editorial identity:
 * - Minimalist top navigation via AppShell
 * - Clean overview of system governance and data architecture
 * - Warm terracotta accents and thin architectural borders
 */

import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'

interface AdminLandingPageProps {
  onNavigateToCurriculum?: () => void
}

export default function AdminLandingPage({ onNavigateToCurriculum }: AdminLandingPageProps) {
  const { user } = useAuth()

  const navItems = [
    {
      id: 'admin',
      label: 'Admin Console',
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
    <AppShell navItems={navItems} currentContext="System Governance">
      <div className="max-w-5xl w-full mx-auto px-6 py-12 flex-1 flex flex-col gap-10">
        {/* Editorial Heading */}
        <div className="flex flex-col gap-2 border-b border-stone-300/60 dark:border-stone-800 pb-6">
          <span className="font-technical text-xs text-[#e05a36] uppercase tracking-wider">
            Governance & Curriculum Control
          </span>
          <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-stone-950 dark:text-[#f7f4ed] tracking-tight">
            Administration Console
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm mt-1 max-w-xl">
            Logged in as {user?.name}. Oversee system models, MongoDB data foundations, and curriculum
            architecture.
          </p>
        </div>

        {/* Informational Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/30 flex flex-col gap-2">
            <span className="font-technical text-[10px] uppercase text-stone-500">
              Data Foundations
            </span>
            <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
              MongoDB Atlas Active
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              15 collections implemented across users, skills, assessments, learnerSkillStates, and
              progressHistory.
            </p>
            <span className="mt-4 font-technical text-[10px] text-stone-400">
              [Status: Connected & Seeded]
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/30 flex flex-col gap-2">
            <span className="font-technical text-[10px] uppercase text-stone-500">
              Curriculum Core
            </span>
            <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
              Prerequisite Directed Graph
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Prerequisite traversal algorithms prevent cycles and ensure strictly ordered skill
              dependencies.
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
              Scheduled Capabilities
            </span>
            <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
              User & Question Governance
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Question bank authoring, audit logging, and school cohort management tools are
              scheduled for future admin milestones.
            </p>
            <span className="mt-4 font-technical text-[10px] text-stone-400">
              [Roadmap: Admin Governance]
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
