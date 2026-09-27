/**
 * App.tsx — Role-Aware LearnLoop Root Component.
 *
 * Routing strategy:
 *   Not logged in → DemoLoginPage
 *   STUDENT       → DiagnosticAssessmentPage (Core Phase 4 diagnostic flow)
 *   TEACHER       → TeacherLandingPage (Teacher workspace placeholder)
 *   ADMIN         → AdminLandingPage (System administration console placeholder)
 *
 * All roles can view the curriculum graph (SkillExplorerPage) and return
 * seamlessly to their role-specific workspace.
 */

import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AdminLandingPage from './pages/AdminLandingPage'
import DemoLoginPage from './pages/DemoLoginPage'
import DiagnosticAssessmentPage from './pages/DiagnosticAssessmentPage'
import SkillExplorerPage from './pages/SkillExplorerPage'
import TeacherLandingPage from './pages/TeacherLandingPage'

function AppContent() {
  const { user, isLoading } = useAuth()
  const [view, setView] = useState<'default' | 'skills'>('default')

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </main>
    )
  }

  if (!user) return <DemoLoginPage />

  if (view === 'skills') {
    return <SkillExplorerPage onNavigateToDiagnostic={() => setView('default')} />
  }

  // Role-aware landing routing
  switch (user.role) {
    case 'STUDENT':
      return <DiagnosticAssessmentPage onNavigateToExplorer={() => setView('skills')} />
    case 'TEACHER':
      return <TeacherLandingPage onNavigateToCurriculum={() => setView('skills')} />
    case 'ADMIN':
      return <AdminLandingPage onNavigateToCurriculum={() => setView('skills')} />
    default:
      return <DiagnosticAssessmentPage onNavigateToExplorer={() => setView('skills')} />
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
