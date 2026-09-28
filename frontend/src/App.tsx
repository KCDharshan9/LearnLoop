/**
 * App.tsx — Role-Aware LearnLoop Root Component.
 *
 * Routing strategy:
 *   Not logged in → DemoLoginPage
 *   STUDENT       → DiagnosticAssessmentPage | LearnerProfilePage | LearningPathPage
 *   TEACHER       → TeacherLandingPage (Teacher workspace placeholder)
 *   ADMIN         → AdminLandingPage (System administration console placeholder)
 *
 * All roles can view the curriculum graph (SkillExplorerPage) and return
 * seamlessly to their role-specific workspace.
 */

import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AdminLandingPage from './pages/AdminLandingPage'
import DemoLoginPage from './pages/DemoLoginPage'
import DiagnosticAssessmentPage from './pages/DiagnosticAssessmentPage'
import LearnerProfilePage from './pages/LearnerProfilePage'
import LearningPathPage from './pages/LearningPathPage'
import SkillExplorerPage from './pages/SkillExplorerPage'
import TeacherLandingPage from './pages/TeacherLandingPage'

function AppContent() {
  const { user, isLoading } = useAuth()
  // Student views: 'diagnostic' | 'profile' | 'learning-path'
  // General views: 'default' | 'skills'
  const [studentView, setStudentView] = useState<'diagnostic' | 'profile' | 'learning-path'>('diagnostic')
  const [view, setView] = useState<'default' | 'skills'>('default')

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f4f0e8] dark:bg-[#0f0e0c] flex items-center justify-center">
        <p className="font-technical text-stone-500 text-xs">Loading LearnLoop…</p>
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
      if (studentView === 'profile') {
        return (
          <LearnerProfilePage
            onNavigateToDiagnostic={() => setStudentView('diagnostic')}
            onNavigateToLearningPath={() => setStudentView('learning-path')}
            onNavigateToCurriculum={() => setView('skills')}
          />
        )
      }
      if (studentView === 'learning-path') {
        return (
          <LearningPathPage
            onNavigateToDiagnostic={() => setStudentView('diagnostic')}
            onNavigateToProfile={() => setStudentView('profile')}
            onNavigateToCurriculum={() => setView('skills')}
          />
        )
      }
      return (
        <DiagnosticAssessmentPage
          onNavigateToExplorer={() => setView('skills')}
          onNavigateToProfile={() => setStudentView('profile')}
          onNavigateToLearningPath={() => setStudentView('learning-path')}
        />
      )
    case 'TEACHER':
      return <TeacherLandingPage onNavigateToCurriculum={() => setView('skills')} />
    case 'ADMIN':
      return <AdminLandingPage onNavigateToCurriculum={() => setView('skills')} />
    default:
      return (
        <DiagnosticAssessmentPage
          onNavigateToExplorer={() => setView('skills')}
          onNavigateToProfile={() => setStudentView('profile')}
          onNavigateToLearningPath={() => setStudentView('learning-path')}
        />
      )
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
