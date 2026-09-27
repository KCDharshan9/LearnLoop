/**
 * TeacherLandingPage.tsx — LearnLoop Teacher Workspace.
 *
 * Role-aware workspace for teachers, establishing the teacher application shell.
 * (Full class dashboard and analytics are scheduled for Phase 9).
 */

import { useAuth } from '../contexts/AuthContext'

interface TeacherLandingPageProps {
  onNavigateToCurriculum?: () => void
}

export default function TeacherLandingPage({ onNavigateToCurriculum }: TeacherLandingPageProps) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Product Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20 text-base">
            ∞
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-sm">LearnLoop</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-medium">
                Teacher Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400">Classroom Instruction & Diagnostic Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {onNavigateToCurriculum && (
            <button
              onClick={onNavigateToCurriculum}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              Curriculum Skills
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/80">
            <span className="w-2 h-2 rounded-full bg-violet-400"></span>
            <span className="text-slate-200 font-medium">{user?.name}</span>
            <span className="text-violet-300 font-mono text-[11px]">(Teacher)</span>
          </div>

          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-4">
            <span>Teacher Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            Welcome, {user?.name}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl">
            You are signed in to the LearnLoop Teacher Workspace. From here, educators can monitor student diagnostic outcomes, observe prerequisite gap analyses, and guide foundational numeracy interventions.
          </p>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-violet-400 uppercase mb-2">Class Overview</div>
                <div className="text-lg font-bold text-white mb-1">Student Roster</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Demo school roster connected with 3 active student profiles.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-slate-500">
                School ID: learnloop-demo-school
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-indigo-400 uppercase mb-2">Diagnostics</div>
                <div className="text-lg font-bold text-white mb-1">Assessment Tracking</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Student diagnostic submissions generate server-evaluated competency states and prerequisite gap analyses.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-slate-500">
                5 Foundational Skills Evaluated
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-emerald-400 uppercase mb-2">Curriculum</div>
                <div className="text-lg font-bold text-white mb-1">Prerequisite Graph</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Explore skill hierarchy from Number Sense to Division and inspect associated question items.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900">
                {onNavigateToCurriculum && (
                  <button
                    onClick={onNavigateToCurriculum}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1"
                  >
                    <span>Inspect Graph</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
            <span>Teacher dashboard features and class-wide analytics are scheduled for upcoming phases.</span>
            {user?.profileId && (
              <span className="font-mono text-slate-600">Teacher ID: {user.profileId.slice(-6)}</span>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
