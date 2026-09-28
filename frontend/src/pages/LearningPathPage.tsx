/**
 * LearningPathPage.tsx — LearnLoop Editorial Personalized Learning Path.
 *
 * Implements Phase 6 Learning Path experience:
 * - Deterministic, prerequisite-aware trajectory based on real diagnostic evidence.
 * - Minimalist editorial layout matching the LearnLoop visual design system.
 * - Clear sequence of learning stages:
 *   1. REVIEW (prerequisite reinforcement when insecure)
 *   2. INTERACTIVE_ACTIVITY (conceptual models & representations)
 *   3. PRACTICE (targeted problem solving)
 *   4. REASSESSMENT (mastery checkpoint)
 * - Interactive current step workspace with real LearningActivity demonstrations.
 * - Idempotent step advancement with automatic status updates.
 */

import { useCallback, useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import {
  completeLearningPathStep,
  fetchStudentLearningPath,
} from '../services/learningPathService'
import type {
  LearningPathData,
  LearningPathResponse,
  LearningPathStep,
} from '../types/learningPath'

interface LearningPathPageProps {
  onNavigateToDiagnostic: () => void
  onNavigateToProfile: () => void
  onNavigateToCurriculum: () => void
}

export default function LearningPathPage({
  onNavigateToDiagnostic,
  onNavigateToProfile,
  onNavigateToCurriculum,
}: LearningPathPageProps) {
  const { user } = useAuth()

  const [pathData, setPathData] = useState<LearningPathData | null>(null)
  const [responseMeta, setResponseMeta] = useState<LearningPathResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const studentId = user?.profileId

  const loadLearningPath = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchStudentLearningPath(id)
      setResponseMeta(res)
      setPathData(res.learningPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve learning path.')
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

    loadLearningPath(studentId)
  }, [studentId, loadLearningPath])

  async function handleCompleteStep(stepNumber: number) {
    if (!pathData) return
    setActionLoading(true)
    setError(null)
    try {
      const updated = await completeLearningPathStep(pathData.id, stepNumber)
      setPathData(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete step.')
    } finally {
      setActionLoading(false)
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
      onClick: onNavigateToProfile,
    },
    {
      id: 'learning-path',
      label: 'Learning Path',
      onClick: () => {},
      active: true,
    },
    {
      id: 'curriculum',
      label: 'Curriculum Graph',
      onClick: onNavigateToCurriculum,
    },
  ]

  const currentStep = pathData?.steps.find((s) => s.status === 'CURRENT')

  return (
    <AppShell navItems={navItems} currentContext="Personalized Learning Path">
      <div className="max-w-4xl w-full mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col gap-10">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-technical flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[10px] uppercase underline cursor-pointer ml-4"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#e05a36] border-t-transparent animate-spin"></div>
            <p className="font-technical text-xs text-stone-500 dark:text-stone-400">
              Generating prerequisite-aware learning trajectory…
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Case 1: No Diagnostic Completed Yet */}
            {responseMeta?.message === 'NO_DIAGNOSTIC' && (
              <div className="py-16 px-6 rounded-2xl border border-stone-300/80 dark:border-stone-800 text-center flex flex-col items-center justify-center max-w-md mx-auto my-8">
                <span className="font-technical text-xs text-[#e05a36] uppercase tracking-widest mb-2">
                  [diagnostic required]
                </span>
                <h2 className="font-editorial text-3xl font-normal text-stone-950 dark:text-[#f7f4ed] mb-2">
                  No Assessment Evidence Yet
                </h2>
                <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed mb-6">
                  Learning paths are generated from real diagnostic assessment results. Take the
                  foundational numeracy assessment to establish your baseline and identify target
                  gaps.
                </p>
                <button
                  onClick={onNavigateToDiagnostic}
                  className="px-6 py-3 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Start Diagnostic Assessment →
                </button>
              </div>
            )}

            {/* Case 2: All Concepts Mastered / No Active Gaps */}
            {responseMeta?.message === 'ALL_MASTERED' && (
              <div className="py-16 px-6 rounded-2xl border border-stone-300/80 dark:border-stone-800 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8">
                <span className="font-technical text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">
                  [all competencies mastered]
                </span>
                <h2 className="font-editorial text-3xl font-normal text-stone-950 dark:text-[#f7f4ed] mb-2">
                  Foundational Concepts Mastered
                </h2>
                <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed mb-6">
                  You have demonstrated secure mastery (70%+) across all assessed curriculum skills.
                  No remediation or prerequisite reinforcement is required at this level.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onNavigateToProfile}
                    className="px-5 py-2.5 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    View Learner Profile
                  </button>
                  <button
                    onClick={onNavigateToCurriculum}
                    className="px-5 py-2.5 rounded-full border border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-technical text-xs hover:text-stone-900 dark:hover:text-stone-200 transition-colors cursor-pointer"
                  >
                    Curriculum Graph
                  </button>
                </div>
              </div>
            )}

            {/* Case 3: Active or Completed Learning Path */}
            {pathData && (
              <div className="flex flex-col gap-10">
                {/* Editorial Header */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-stone-300/60 dark:border-stone-800 pb-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-technical text-xs text-[#e05a36] uppercase tracking-wider">
                      <span>Target Concept:</span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {pathData.targetSkillName}
                      </span>
                    </div>

                    <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-stone-950 dark:text-[#f7f4ed] tracking-tight">
                      Learning Path.
                    </h1>

                    <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                      {pathData.reason}
                    </p>
                  </div>

                  <div className="sm:text-right font-technical text-xs text-stone-500">
                    <div>
                      Progress: {pathData.completedSteps} of {pathData.totalSteps} steps
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Status: [{pathData.status.toLowerCase()}]
                    </div>
                  </div>
                </div>

                {/* Path Progress Bar */}
                <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#e05a36] transition-all duration-300"
                    style={{
                      width: `${(pathData.completedSteps / pathData.totalSteps) * 100}%`,
                    }}
                  />
                </div>

                {/* Path Completed Notice Banner */}
                {pathData.status === 'COMPLETED' && (
                  <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-editorial text-xl font-normal text-emerald-800 dark:text-emerald-300">
                        Learning Trajectory Completed
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        You have finished all prerequisite reviews, conceptual activities, and practice
                        steps for this unit.
                      </p>
                    </div>

                    <button
                      onClick={onNavigateToDiagnostic}
                      className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-technical text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Take New Diagnostic →
                    </button>
                  </div>
                )}

                {/* Active Step Interactive Module */}
                {currentStep && pathData.status === 'ACTIVE' && (
                  <div className="p-6 sm:p-8 rounded-2xl border border-stone-300/80 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/40 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-300/60 dark:border-stone-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2 font-technical text-xs text-[#e05a36] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e05a36]"></span>
                          <span>
                            Current Stage • Step {currentStep.stepNumber} of {pathData.totalSteps}
                          </span>
                        </div>
                        <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-stone-950 dark:text-stone-100 mt-1">
                          {currentStep.title}
                        </h2>
                        <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1">
                          {currentStep.description}
                        </p>
                      </div>

                      <span className="font-technical text-[10px] px-2.5 py-1 rounded-full border border-[#e05a36] bg-[#e05a36]/10 text-[#e05a36] self-start sm:self-center">
                        Active Step
                      </span>
                    </div>

                    {/* Interactive Learning Activity Demonstration */}
                    {currentStep.activity && (
                      <div className="p-5 rounded-xl border border-stone-300/70 dark:border-stone-800/80 bg-white/70 dark:bg-stone-950/60 flex flex-col gap-4">
                        <div className="flex items-center justify-between font-technical text-xs text-stone-500">
                          <span>Activity: {currentStep.activity.title}</span>
                          <span className="text-[10px] uppercase">
                            [{currentStep.activity.type.toLowerCase()}]
                          </span>
                        </div>

                        {/* Interactive Equal Groups Visualization */}
                        {currentStep.activity.type === 'GROUPING' && (
                          <div className="py-4 flex flex-col items-center gap-6">
                            <p className="font-editorial text-lg text-stone-900 dark:text-stone-100 text-center max-w-md">
                              Multiplication represents equal groups combined together.
                              Count the groups and observe the repeated addition bridge:
                            </p>

                            {/* 4 Groups of 3 items */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
                              {[1, 2, 3, 4].map((groupNum) => (
                                <div
                                  key={groupNum}
                                  className="p-3.5 rounded-xl border border-stone-300/80 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60 flex flex-col items-center gap-2"
                                >
                                  <span className="font-technical text-[10px] text-stone-400">
                                    Group {groupNum}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-3.5 h-3.5 rounded-full bg-[#e05a36]"></span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-[#e05a36]"></span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-[#e05a36]"></span>
                                  </div>
                                  <span className="font-technical text-xs font-semibold text-stone-700 dark:text-stone-300">
                                    3 items
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Mathematical Equivalence Bridge */}
                            <div className="p-4 rounded-xl border border-stone-300/60 dark:border-stone-800 bg-stone-100/40 dark:bg-stone-900/30 text-center font-technical text-xs space-y-1">
                              <div>
                                Repeated Addition:{' '}
                                <span className="font-semibold text-stone-900 dark:text-stone-100">
                                  3 + 3 + 3 + 3 = 12
                                </span>
                              </div>
                              <div className="text-stone-400">↕</div>
                              <div>
                                Multiplication:{' '}
                                <span className="font-semibold text-[#e05a36]">
                                  4 × 3 = 12
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Guided Practice Review Visualization */}
                        {currentStep.activity.type === 'GUIDED_PRACTICE' && (
                          <div className="py-4 flex flex-col gap-3">
                            <p className="font-editorial text-base text-stone-900 dark:text-stone-100">
                              Verify prerequisite conceptual addition before moving forward:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-technical text-xs">
                              <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
                                2 + 2 + 2 = <span className="font-semibold text-[#e05a36]">6</span>
                                <span className="block text-[10px] text-stone-400 mt-1">
                                  3 groups of 2
                                </span>
                              </div>
                              <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
                                4 + 4 + 4 = <span className="font-semibold text-[#e05a36]">12</span>
                                <span className="block text-[10px] text-stone-400 mt-1">
                                  3 groups of 4
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step Completion Action Button */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-technical text-xs text-stone-500">
                        Action required to advance to next stage
                      </span>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleCompleteStep(currentStep.stepNumber)}
                        className="px-6 py-2.5 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading ? (
                          'Recording progress…'
                        ) : (
                          <>
                            <span>Complete Step & Continue</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Ordered Step Roadmap Timeline */}
                <div className="flex flex-col gap-4">
                  <div className="font-technical text-xs text-stone-500 uppercase tracking-wider pb-2 border-b border-stone-300/50 dark:border-stone-800">
                    Step Roadmap Progression
                  </div>

                  <div className="divide-y divide-stone-200 dark:divide-stone-800/80 border border-stone-300/70 dark:border-stone-800/80 rounded-2xl overflow-hidden">
                    {pathData.steps.map((step: LearningPathStep) => {
                      const isCompleted = step.status === 'COMPLETED'
                      const isCurrent = step.status === 'CURRENT'
                      const isPending = step.status === 'PENDING'

                      return (
                        <div
                          key={step.stepNumber}
                          className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                            isCurrent
                              ? 'bg-stone-100/60 dark:bg-stone-900/40'
                              : isCompleted
                                ? 'bg-transparent opacity-80'
                                : 'bg-transparent opacity-50'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <span className="font-technical text-xs font-semibold text-stone-400 mt-1">
                              {String(step.stepNumber).padStart(2, '0')}
                            </span>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-stone-900 dark:text-stone-100">
                                  {step.title}
                                </span>
                                <span className="font-technical text-[10px] px-2 py-0.5 rounded border border-stone-300 dark:border-stone-700 text-stone-500 uppercase">
                                  {step.type.replace('_', ' ')}
                                </span>
                              </div>

                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {step.description}
                              </p>

                              <div className="font-technical text-[10px] text-stone-400 mt-0.5">
                                Concept: {step.skillName}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {isCompleted && (
                              <span className="font-technical text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                ✓ Completed
                              </span>
                            )}
                            {isCurrent && (
                              <span className="font-technical text-[11px] text-[#e05a36] font-medium flex items-center gap-1">
                                • In Progress
                              </span>
                            )}
                            {isPending && (
                              <span className="font-technical text-[11px] text-stone-400">
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
