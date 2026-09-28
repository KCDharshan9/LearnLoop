/**
 * LearnerProfilePage.tsx — LearnLoop Editorial Learner Profile.
 *
 * Emphasizes clean hierarchy, editorial typography, subtle technical dividers,
 * and warm color accents:
 * 1. Student Identity Header: Name, code, grade level, email.
 * 2. Learning Summary Grid: Columnar metrics divided by thin vertical rules.
 * 3. Latest Diagnostic Insight: Prerequisite gap and recommended action.
 * 4. Strengths & Priority Support Areas: Mastered vs Needs Support highlights.
 * 5. Tabbed Detail Views: Competency Overview & Historical Progress Timeline.
 * 6. Intentional Empty State with clean CTA.
 */

import { useCallback, useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { fetchStudentProfile, fetchStudentProgress } from '../services/studentService'
import type {
  LearnerProfileResponse,
  LearnerProgressResponse,
  ProgressHistoryEntry,
  StudentSkillCompetency,
} from '../types/student'

interface LearnerProfilePageProps {
  onNavigateToDiagnostic: () => void
  onNavigateToLearningPath?: () => void
  onNavigateToCurriculum: () => void
}

export default function LearnerProfilePage({
  onNavigateToDiagnostic,
  onNavigateToLearningPath,
  onNavigateToCurriculum,
}: LearnerProfilePageProps) {
  const { user } = useAuth()

  const [profileData, setProfileData] = useState<LearnerProfileResponse | null>(null)
  const [progressData, setProgressData] = useState<LearnerProgressResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'competencies' | 'history'>('competencies')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const studentId = user?.profileId

  const loadData = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, progressRes] = await Promise.all([
        fetchStudentProfile(id),
        fetchStudentProgress(id),
      ])
      setProfileData(profileRes)
      setProgressData(progressRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learner profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!studentId) {
      setError('Student profile not found. Please log in as a student.')
      setLoading(false)
      return
    }

    loadData(studentId)
  }, [studentId, loadData])

  // Restrained trend badges
  function renderTrendBadge(trend: string) {
    switch (trend) {
      case 'IMPROVING':
        return (
          <span className="font-technical text-[10px] text-emerald-600 dark:text-emerald-400">
            ↑ improving
          </span>
        )
      case 'DECLINING':
        return (
          <span className="font-technical text-[10px] text-rose-600 dark:text-rose-400">
            ↓ declining
          </span>
        )
      case 'STABLE':
        return (
          <span className="font-technical text-[10px] text-stone-500 dark:text-stone-400">
            → stable
          </span>
        )
      default:
        return (
          <span className="font-technical text-[10px] text-stone-400 dark:text-stone-500">
            • baseline
          </span>
        )
    }
  }

  // Restrained competency status badge
  function renderStatusBadge(status: string) {
    switch (status) {
      case 'MASTERED':
        return (
          <span className="px-2 py-0.5 rounded font-technical text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            Mastered
          </span>
        )
      case 'DEVELOPING':
        return (
          <span className="px-2 py-0.5 rounded font-technical text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            Developing
          </span>
        )
      case 'NEEDS_SUPPORT':
      default:
        return (
          <span className="px-2 py-0.5 rounded font-technical text-[10px] uppercase tracking-wider bg-[#e05a36]/10 text-[#e05a36] border border-[#e05a36]/20">
            Needs Support
          </span>
        )
    }
  }

  const navItems = [
    {
      id: 'diagnostic',
      label: 'Diagnostic',
      onClick: onNavigateToDiagnostic,
    },
    {
      id: 'profile',
      label: 'Learner Profile',
      onClick: () => {},
      active: true,
    },
    ...(onNavigateToLearningPath
      ? [
          {
            id: 'learning-path',
            label: 'Learning Path',
            onClick: onNavigateToLearningPath,
          },
        ]
      : []),
    {
      id: 'curriculum',
      label: 'Curriculum Graph',
      onClick: onNavigateToCurriculum,
    },
  ]

  return (
    <AppShell navItems={navItems} currentContext="Learner Competency Profile">
      <div className="max-w-5xl w-full mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col gap-10">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-technical flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => {
                if (studentId) loadData(studentId)
              }}
              className="text-[10px] uppercase underline cursor-pointer ml-4"
            >
              retry
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#e05a36] border-t-transparent animate-spin"></div>
            <p className="font-technical text-xs text-stone-500 dark:text-stone-400">
              Loading student competency records…
            </p>
          </div>
        )}

        {!loading && profileData && (
          <>
            {/* Student Identity Section */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-stone-300/60 dark:border-stone-800 pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-stone-950 dark:text-[#f7f4ed] tracking-tight">
                    {profileData.student.name}
                  </h1>
                  <span className="font-technical text-xs px-2 py-0.5 rounded border border-stone-300 dark:border-stone-700 text-stone-500">
                    {profileData.student.studentCode}
                  </span>
                </div>
                <p className="font-technical text-xs text-stone-500 dark:text-stone-400 mt-2">
                  Grade {profileData.student.grade} • Current Level {profileData.student.currentLevel} • {profileData.student.email}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {onNavigateToLearningPath && profileData.summary.totalAssessedSkills > 0 && (
                  <button
                    onClick={onNavigateToLearningPath}
                    className="px-5 py-2.5 rounded-full bg-[#e05a36] hover:bg-[#c94c2a] text-white font-technical text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    View Learning Path →
                  </button>
                )}

                <button
                  onClick={onNavigateToDiagnostic}
                  className="px-5 py-2.5 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  {profileData.summary.totalAssessedSkills > 0 ? 'Retake Diagnostic' : 'Start Diagnostic'}
                </button>
              </div>
            </div>

            {/* Empty State: If no assessment evidence exists yet */}
            {profileData.summary.totalAssessedSkills === 0 ? (
              <div className="py-16 px-6 rounded-2xl border border-stone-300/80 dark:border-stone-800 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6">
                <span className="font-technical text-xs text-[#e05a36] uppercase tracking-widest mb-2">
                  [no records]
                </span>
                <h2 className="font-editorial text-2xl text-stone-900 dark:text-stone-100 mb-2">
                  No Diagnostic Evidence Yet
                </h2>
                <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed mb-6">
                  Complete the foundational numeracy diagnostic assessment to discover your
                  strengths, pinpoint learning gaps, and receive targeted recommendations.
                </p>
                <button
                  onClick={onNavigateToDiagnostic}
                  className="px-6 py-2.5 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Start Diagnostic Assessment →
                </button>
              </div>
            ) : (
              <>
                {/* Columnar Summary Metrics (cneuralnets.xyz style thin column borders) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 border-y border-stone-300/60 dark:border-stone-800/80 py-6 sm:divide-x sm:divide-stone-300/50 sm:dark:divide-stone-800">
                  <div className="sm:px-6 first:pl-0 flex flex-col">
                    <span className="font-technical text-[10px] uppercase tracking-wider text-stone-500">
                      Assessed Skills
                    </span>
                    <span className="font-editorial text-3xl sm:text-4xl font-normal text-stone-950 dark:text-stone-100 mt-1">
                      {profileData.summary.totalAssessedSkills}
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                      Curriculum nodes
                    </span>
                  </div>

                  <div className="sm:px-6 flex flex-col">
                    <span className="font-technical text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Key Strengths
                    </span>
                    <span className="font-editorial text-3xl sm:text-4xl font-normal text-emerald-600 dark:text-emerald-400 mt-1">
                      {profileData.summary.masteredCount}
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                      Mastered (≥ 70%)
                    </span>
                  </div>

                  <div className="sm:px-6 flex flex-col">
                    <span className="font-technical text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Developing
                    </span>
                    <span className="font-editorial text-3xl sm:text-4xl font-normal text-amber-600 dark:text-amber-400 mt-1">
                      {profileData.summary.developingCount}
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                      In progress (40–69%)
                    </span>
                  </div>

                  <div className="sm:px-6 last:pr-0 flex flex-col">
                    <span className="font-technical text-[10px] uppercase tracking-wider text-[#e05a36]">
                      Needs Support
                    </span>
                    <span className="font-editorial text-3xl sm:text-4xl font-normal text-[#e05a36] mt-1">
                      {profileData.summary.needsSupportCount}
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                      Priority focus (&lt; 40%)
                    </span>
                  </div>
                </div>

                {/* Latest Diagnostic Evidence Section */}
                {profileData.summary.latestDiagnostic && (
                  <div className="p-6 rounded-2xl border border-stone-300/80 dark:border-stone-800 bg-stone-100/40 dark:bg-stone-900/30 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-300/60 dark:border-stone-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-editorial text-xl font-normal text-stone-950 dark:text-stone-100">
                            Latest Diagnostic Evidence
                          </span>
                          <span className="font-technical text-[10px] text-stone-500">
                            [{profileData.summary.latestDiagnostic.assessmentTitle}]
                          </span>
                        </div>
                        <p className="font-technical text-[11px] text-stone-500 mt-1">
                          Evaluated{' '}
                          {new Date(profileData.summary.latestDiagnostic.submittedAt).toLocaleDateString(
                            undefined,
                            { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-technical text-[10px] uppercase text-stone-500">Score</span>
                          <div className="font-editorial text-2xl text-stone-950 dark:text-stone-100">
                            {profileData.summary.latestDiagnostic.overallScore}%
                          </div>
                        </div>
                        {renderStatusBadge(profileData.summary.latestDiagnostic.competencyStatus)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Learning Gap Panel */}
                      <div className="p-4 rounded-xl border border-stone-300/70 dark:border-stone-800/80 bg-white/50 dark:bg-stone-950/40 flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-technical text-xs text-[#e05a36]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e05a36]"></span>
                          <span>Learning Gap Analysis</span>
                        </div>
                        {profileData.summary.latestDiagnostic.learningGap ? (
                          <div className="text-xs space-y-1.5 mt-0.5">
                            <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                              {profileData.summary.latestDiagnostic.learningGap.summary}
                            </h4>
                            <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
                              {profileData.summary.latestDiagnostic.learningGap.detail}
                            </p>
                            <div className="pt-1 flex items-center gap-2 font-technical text-[10px] text-stone-500">
                              <span>Gap: {profileData.summary.latestDiagnostic.learningGap.gapType}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 py-2">
                            No prerequisite gaps detected. Student is on track.
                          </p>
                        )}
                      </div>

                      {/* Recommendation Panel */}
                      <div className="p-4 rounded-xl border border-stone-300/70 dark:border-stone-800/80 bg-white/50 dark:bg-stone-950/40 flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-technical text-xs text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Recommended Action</span>
                        </div>
                        {profileData.summary.latestDiagnostic.recommendation ? (
                          <div className="text-xs space-y-1.5 mt-0.5">
                            <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                              {profileData.summary.latestDiagnostic.recommendation.headline}
                            </h4>
                            <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
                              {profileData.summary.latestDiagnostic.recommendation.description}
                            </p>
                            <div className="pt-1 flex items-center gap-2 font-technical text-[10px] text-stone-500">
                              <span>
                                Action: {profileData.summary.latestDiagnostic.recommendation.actionType.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 py-2">
                            Continue practicing advanced curriculum topics.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Strengths & Support Areas Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="p-5 rounded-xl border border-stone-300/70 dark:border-stone-800/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between font-technical text-xs">
                      <div className="flex items-center gap-2 text-stone-900 dark:text-stone-200 uppercase tracking-wider font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Key Strengths ({profileData.summary.strengths.length})</span>
                      </div>
                      <span className="text-stone-400">≥ 70%</span>
                    </div>

                    {profileData.summary.strengths.length === 0 ? (
                      <p className="text-xs text-stone-400 py-3 italic">
                        No skills categorized as Mastered yet. Continue practicing!
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {profileData.summary.strengths.map((skill: StudentSkillCompetency) => (
                          <div
                            key={skill.skillId}
                            className="p-3 rounded-lg border border-stone-200 dark:border-stone-800/90 bg-stone-100/30 dark:bg-stone-900/20 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-medium text-stone-900 dark:text-stone-100">
                                {skill.skillName}
                              </span>
                              <div className="font-technical text-[10px] text-stone-400 mt-0.5">
                                Level {skill.level} • {skill.evidenceCount} evidence items
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {renderTrendBadge(skill.trend)}
                              <span className="font-technical font-semibold text-emerald-600 dark:text-emerald-400">
                                {skill.score}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Areas Needing Support */}
                  <div className="p-5 rounded-xl border border-stone-300/70 dark:border-stone-800/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between font-technical text-xs">
                      <div className="flex items-center gap-2 text-stone-900 dark:text-stone-200 uppercase tracking-wider font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e05a36]"></span>
                        <span>Areas Needing Support ({profileData.summary.supportAreas.length})</span>
                      </div>
                      <span className="text-stone-400">&lt; 40%</span>
                    </div>

                    {profileData.summary.supportAreas.length === 0 ? (
                      <p className="text-xs text-stone-400 py-3 italic">
                        No critical support gaps identified. Great work!
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {profileData.summary.supportAreas.map((skill: StudentSkillCompetency) => (
                          <div
                            key={skill.skillId}
                            className="p-3 rounded-lg border border-stone-200 dark:border-stone-800/90 bg-stone-100/30 dark:bg-stone-900/20 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-medium text-stone-900 dark:text-stone-100">
                                {skill.skillName}
                              </span>
                              <div className="font-technical text-[10px] text-stone-400 mt-0.5">
                                Level {skill.level} • {skill.evidenceCount} evidence items
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {renderTrendBadge(skill.trend)}
                              <span className="font-technical font-semibold text-[#e05a36]">
                                {skill.score}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabbed Views: Competencies vs Progress Timeline */}
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center gap-4 border-b border-stone-300/60 dark:border-stone-800">
                    <button
                      onClick={() => setActiveTab('competencies')}
                      className={`pb-3 font-technical text-xs font-medium cursor-pointer transition-colors border-b-2 ${
                        activeTab === 'competencies'
                          ? 'border-[#e05a36] text-[#e05a36]'
                          : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      Competency by Skill ({profileData.skillCompetencies.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`pb-3 font-technical text-xs font-medium cursor-pointer transition-colors border-b-2 ${
                        activeTab === 'history'
                          ? 'border-[#e05a36] text-[#e05a36]'
                          : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      Progress Timeline ({progressData?.history.length ?? 0})
                    </button>
                  </div>

                  {/* Tab 1: Current Competency Breakdown */}
                  {activeTab === 'competencies' && (
                    <div className="border border-stone-300/70 dark:border-stone-800/80 rounded-xl overflow-hidden">
                      <div className="divide-y divide-stone-200 dark:divide-stone-800/80">
                        {profileData.skillCompetencies.map((skill) => (
                          <div
                            key={skill.skillId}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="sm:w-1/3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-stone-900 dark:text-stone-100">
                                  {skill.skillName}
                                </span>
                                <span className="font-technical text-[10px] px-1.5 py-0.2 rounded bg-stone-200/50 dark:bg-stone-800/50 text-stone-500">
                                  L{skill.level}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 font-technical text-[10px] text-stone-400">
                                <span>{renderTrendBadge(skill.trend)}</span>
                                <span>•</span>
                                <span>{skill.evidenceCount} evidence items</span>
                              </div>
                            </div>

                            <div className="flex-1 flex items-center gap-4 sm:max-w-md">
                              <div className="flex-1 h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    skill.score >= 70
                                      ? 'bg-emerald-500'
                                      : skill.score >= 40
                                        ? 'bg-amber-500'
                                        : 'bg-[#e05a36]'
                                  }`}
                                  style={{ width: `${skill.score}%` }}
                                />
                              </div>
                              <span className="w-10 text-right font-technical font-semibold text-stone-900 dark:text-stone-100">
                                {skill.score}%
                              </span>
                              <div className="w-28 text-right">{renderStatusBadge(skill.status)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Historical Progress Timeline */}
                  {activeTab === 'history' && (
                    <div className="border border-stone-300/70 dark:border-stone-800/80 rounded-xl p-6">
                      {!progressData || progressData.history.length === 0 ? (
                        <div className="py-8 text-center text-stone-400 text-xs italic">
                          No historical progress events recorded yet.
                        </div>
                      ) : (
                        <div className="relative pl-6 border-l border-stone-300 dark:border-stone-800 space-y-6">
                          {progressData.history.map((entry: ProgressHistoryEntry, idx: number) => {
                            const isFirst = idx === 0
                            return (
                              <div key={entry.id} className="relative">
                                {/* Bullet indicator */}
                                <div
                                  className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 ${
                                    isFirst
                                      ? 'bg-[#e05a36] border-[#e05a36]'
                                      : 'bg-stone-100 dark:bg-stone-900 border-stone-400 dark:border-stone-700'
                                  }`}
                                />

                                <div className="p-3.5 rounded-lg border border-stone-200 dark:border-stone-800/80 bg-stone-100/30 dark:bg-stone-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                                        {entry.skillName}
                                      </span>
                                      <span className="font-technical text-[10px] px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-800 text-stone-500">
                                        {entry.eventType}
                                      </span>
                                    </div>
                                    <p className="font-technical text-[10px] text-stone-400 mt-1">
                                      {new Date(entry.timestamp).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 font-technical text-xs">
                                      {entry.previousScore !== undefined && entry.previousScore !== null ? (
                                        <>
                                          <span className="text-stone-400">{entry.previousScore}%</span>
                                          <span className="text-stone-400">→</span>
                                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                                            {entry.newScore}%
                                          </span>
                                          {entry.changeDelta !== 0 && (
                                            <span
                                              className={`text-[10px] font-semibold px-1 py-0.2 rounded ${
                                                entry.changeDelta > 0
                                                  ? 'text-emerald-600 dark:text-emerald-400'
                                                  : 'text-rose-600 dark:text-rose-400'
                                              }`}
                                            >
                                              {entry.changeDelta > 0 ? `+${entry.changeDelta}%` : `${entry.changeDelta}%`}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                                          Baseline: {entry.newScore}%
                                        </span>
                                      )}
                                    </div>
                                    {renderStatusBadge(entry.newStatus)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
