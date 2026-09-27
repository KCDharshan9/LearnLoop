/**
 * DiagnosticAssessmentPage.tsx — LearnLoop Editorial Diagnostic.
 *
 * Implements a focused, distraction-free educational assessment flow:
 * 1. Introduction: Contextual premise, skill focus, assessment methodology.
 * 2. Active Question Interface:
 *    - Minimal header with question sequence metadata [Q 03 / 10]
 *    - Editorial typography for problem statements
 *    - Clean answer cards with keyboard/mouse interaction
 *    - Subtle progress indicators without sensory overload
 * 3. Submission: Server-authoritative evaluation
 * 4. Results: Editorial diagnostic summary, identified gap, recommendation & skill breakdown.
 */

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchDefaultDiagnostic,
  startOrGetAssessment,
  submitAssessment,
} from '../services/assessmentService'
import type {
  AssessmentAttemptResult,
  AssessmentData,
  ClientQuestion,
} from '../types/assessment'

interface DiagnosticAssessmentPageProps {
  onNavigateToExplorer?: () => void
  onNavigateToProfile?: () => void
}

export default function DiagnosticAssessmentPage({
  onNavigateToExplorer,
  onNavigateToProfile,
}: DiagnosticAssessmentPageProps) {
  const { user } = useAuth()

  const [flowState, setFlowState] = useState<'intro' | 'active' | 'submitting' | 'result'>('intro')
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<AssessmentAttemptResult | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDiagnosticMeta()
  }, [])

  async function loadDiagnosticMeta() {
    setLoading(true)
    setError(null)
    try {
      const defaultDiag = await fetchDefaultDiagnostic()
      const data = await startOrGetAssessment(defaultDiag.id)
      setAssessmentData(data.assessment)
      setAttemptId(data.attemptId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize diagnostic.')
    } finally {
      setLoading(false)
    }
  }

  function handleStart() {
    if (!assessmentData || assessmentData.questions.length === 0) {
      setError('No questions available in this diagnostic.')
      return
    }
    setFlowState('active')
  }

  function handleAnswerSelect(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmitAttempt() {
    if (!assessmentData || !attemptId) return

    setFlowState('submitting')
    setError(null)

    const submittedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }))

    try {
      const attemptResult = await submitAssessment(assessmentData.id, submittedAnswers, attemptId)
      setResult(attemptResult)
      setFlowState('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate assessment.')
      setFlowState('active')
    }
  }

  function handleRetake() {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setResult(null)
    setFlowState('intro')
    loadDiagnosticMeta()
  }

  const questions: ClientQuestion[] = assessmentData?.questions ?? []
  const currentQuestion: ClientQuestion | undefined = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length

  const navItems = [
    {
      id: 'diagnostic',
      label: 'Diagnostic',
      onClick: () => {},
      active: true,
    },
    ...(onNavigateToProfile
      ? [
          {
            id: 'profile',
            label: 'Learner Profile',
            onClick: onNavigateToProfile,
          },
        ]
      : []),
    ...(onNavigateToExplorer
      ? [
          {
            id: 'curriculum',
            label: 'Curriculum Graph',
            onClick: onNavigateToExplorer,
          },
        ]
      : []),
  ]

  return (
    <AppShell navItems={navItems} currentContext="Foundational Numeracy Diagnostic">
      <div className="max-w-4xl w-full mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-technical flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[10px] uppercase underline cursor-pointer ml-4"
            >
              dismiss
            </button>
          </div>
        )}

        {/* State 0: Loading Initialization */}
        {loading && !assessmentData && (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#e05a36] border-t-transparent animate-spin"></div>
            <p className="font-technical text-xs text-stone-500 dark:text-stone-400">
              Retrieving curriculum diagnostic model…
            </p>
          </div>
        )}

        {/* State 1: Diagnostic Introduction */}
        {flowState === 'intro' && assessmentData && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="font-technical text-xs text-[#e05a36] tracking-wider uppercase">
                Assessment 01 / Prerequisite Discovery
              </span>
              <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-stone-950 dark:text-[#f7f4ed] tracking-tight">
                {assessmentData.title}
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm sm:text-base leading-relaxed max-w-2xl mt-1">
                This diagnostic evaluates foundational numeracy competencies across Number Sense,
                Addition, Repeated Addition, and Multiplication. Its goal is not a score for ranking,
                but discovering whether prerequisite gaps are blocking conceptual mastery.
              </p>
            </div>

            {/* Assessment Structure Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-stone-300/60 dark:border-stone-800/80 py-6 my-2">
              <div>
                <div className="font-technical text-[10px] text-stone-500 uppercase tracking-wider">
                  Question Count
                </div>
                <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100 mt-1">
                  {assessmentData.questionCount} Problems
                </div>
                <div className="text-xs text-stone-500 mt-0.5">Multi-difficulty sequence</div>
              </div>

              <div>
                <div className="font-technical text-[10px] text-stone-500 uppercase tracking-wider">
                  Adaptive Logic
                </div>
                <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100 mt-1">
                  Prerequisite-Aware
                </div>
                <div className="text-xs text-stone-500 mt-0.5">Identifies root misconceptions</div>
              </div>

              <div>
                <div className="font-technical text-[10px] text-stone-500 uppercase tracking-wider">
                  Target Learner
                </div>
                <div className="font-editorial text-2xl text-stone-900 dark:text-stone-100 mt-1">
                  {user?.name ?? 'Student'}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 font-technical">[Grade 3 Numeracy]</div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                id="start-diagnostic-button"
                onClick={handleStart}
                className="px-6 py-3 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>Begin Assessment</span>
                <span>→</span>
              </button>

              {onNavigateToProfile && (
                <button
                  onClick={onNavigateToProfile}
                  className="px-5 py-3 rounded-full border border-stone-300/80 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 font-technical text-xs transition-colors cursor-pointer"
                >
                  View Current Profile
                </button>
              )}
            </div>
          </div>
        )}

        {/* State 2: Active Question Interaction */}
        {flowState === 'active' && currentQuestion && (
          <div className="flex flex-col gap-6">
            {/* Top Question Tracker */}
            <div className="flex items-center justify-between font-technical text-xs text-stone-500 dark:text-stone-400 border-b border-stone-300/50 dark:border-stone-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-stone-900 dark:text-stone-200 font-medium">
                  Problem {String(currentQuestionIndex + 1).padStart(2, '0')}
                </span>
                <span>/</span>
                <span>{String(totalQuestions).padStart(2, '0')}</span>
              </div>

              <div className="flex items-center gap-3">
                {currentQuestion.skillName && (
                  <span className="px-2 py-0.5 rounded bg-stone-200/50 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300 border border-stone-300/40 dark:border-stone-700/50 text-[10px]">
                    {currentQuestion.skillName}
                  </span>
                )}
                <span>Diff {currentQuestion.difficulty}</span>
              </div>
            </div>

            {/* Stepper Dots */}
            <div className="flex items-center gap-1.5 py-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex
                const isAnswered = answers[q.id] !== undefined
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isCurrent
                        ? 'w-7 bg-[#e05a36]'
                        : isAnswered
                          ? 'w-3.5 bg-stone-400 dark:bg-stone-600'
                          : 'w-2 bg-stone-300 dark:bg-stone-800'
                    }`}
                  />
                )
              })}
            </div>

            {/* Problem Statement */}
            <div className="py-4">
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-stone-950 dark:text-[#f5f2ec] leading-relaxed">
                {currentQuestion.prompt}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="flex flex-col gap-2.5 pt-2">
              {currentQuestion.type === 'MCQ' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, idx) => {
                    const selected = answers[currentQuestion.id] === option.value
                    const optionLetter = String.fromCharCode(65 + idx)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAnswerSelect(currentQuestion.id, option.value)}
                        className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-3.5 ${
                          selected
                            ? 'border-[#e05a36] bg-[#e05a36]/10 text-stone-950 dark:text-stone-100 ring-1 ring-[#e05a36]'
                            : 'border-stone-300/80 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/30 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-technical text-xs font-medium border ${
                            selected
                              ? 'bg-[#e05a36] text-white border-[#e05a36]'
                              : 'border-stone-300 dark:border-stone-700 text-stone-500'
                          }`}
                        >
                          {optionLetter}
                        </span>
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'NUMBER_INPUT' && (
                <div className="max-w-xs">
                  <label
                    htmlFor={`num-input-${currentQuestion.id}`}
                    className="block font-technical text-[10px] uppercase text-stone-500 mb-1"
                  >
                    Numerical Solution
                  </label>
                  <input
                    id={`num-input-${currentQuestion.id}`}
                    type="number"
                    value={
                      answers[currentQuestion.id] !== undefined
                        ? String(answers[currentQuestion.id])
                        : ''
                    }
                    onChange={(e) =>
                      handleAnswerSelect(
                        currentQuestion.id,
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                    placeholder="Enter number…"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300/80 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-950 dark:text-stone-100 font-technical text-base focus:outline-none focus:border-[#e05a36] focus:ring-1 focus:ring-[#e05a36]"
                  />
                </div>
              )}
            </div>

            {/* Bottom Stepper Actions */}
            <div className="flex items-center justify-between border-t border-stone-300/60 dark:border-stone-800/80 pt-6 mt-6">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-lg font-technical text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-3">
                <span className="font-technical text-[11px] text-stone-400 dark:text-stone-500">
                  {answeredCount} of {totalQuestions} answered
                </span>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="px-5 py-2.5 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitAttempt}
                    className="px-6 py-2.5 rounded-full bg-[#e05a36] hover:bg-[#c94c2a] text-white font-technical text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    Submit Diagnostic →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* State 3: Submitting / Evaluating Loader */}
        {flowState === 'submitting' && (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-6 h-6 rounded-full border-2 border-[#e05a36] border-t-transparent animate-spin"></div>
            <div className="flex flex-col gap-1">
              <p className="font-editorial text-xl text-stone-900 dark:text-stone-100">
                Evaluating assessment responses…
              </p>
              <p className="font-technical text-xs text-stone-500 dark:text-stone-400">
                Traversing prerequisite dependency graph & isolating learning gaps
              </p>
            </div>
          </div>
        )}

        {/* State 4: Diagnostic Results */}
        {flowState === 'result' && result && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <span className="font-technical text-xs text-[#e05a36] tracking-wider uppercase">
                Diagnostic Complete
              </span>
              <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-stone-950 dark:text-[#f7f4ed]">
                Assessment Evaluation
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm">
                Server-evaluated results across {result.skillResults.length} foundational skills.
              </p>
            </div>

            {/* Score & Competency Summary Box */}
            <div className="p-6 rounded-2xl border border-stone-300/80 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="font-technical text-[10px] uppercase text-stone-500">
                  Overall Diagnostic Score
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-editorial text-5xl font-normal text-stone-950 dark:text-stone-100">
                    {result.overallScore}%
                  </span>
                  <span className="font-technical text-xs text-stone-500">
                    [{result.overallScore >= 70 ? 'Mastered' : result.overallScore >= 40 ? 'Developing' : 'Needs Support'}]
                  </span>
                </div>
              </div>

              <div className="sm:text-right flex flex-col gap-1">
                <span className="font-technical text-[11px] text-stone-500">Attempt ID</span>
                <span className="font-technical text-xs text-stone-700 dark:text-stone-300">
                  {result.attemptId.slice(-8)}
                </span>
                <span className="font-technical text-[10px] text-stone-400">
                  {new Date(result.submittedAt ?? Date.now()).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Learning Gap & Recommendation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Learning Gap */}
              <div className="p-5 rounded-xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/30 dark:bg-stone-900/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-technical text-xs text-[#e05a36]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e05a36]"></span>
                  <span>Prerequisite Gap Analysis</span>
                </div>
                {result.learningGap ? (
                  <div className="flex flex-col gap-1.5 mt-1 text-xs">
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                      {result.learningGap.summary}
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
                      {result.learningGap.detail}
                    </p>
                    <div className="pt-2 flex items-center gap-2 font-technical text-[10px] text-stone-500">
                      <span>Type: {result.learningGap.gapType}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 py-2">
                    No critical prerequisite gaps identified.
                  </p>
                )}
              </div>

              {/* Recommendation */}
              <div className="p-5 rounded-xl border border-stone-300/70 dark:border-stone-800/80 bg-stone-100/30 dark:bg-stone-900/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-technical text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Educational Recommendation</span>
                </div>
                {result.recommendation ? (
                  <div className="flex flex-col gap-1.5 mt-1 text-xs">
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                      {result.recommendation.headline}
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
                      {result.recommendation.description}
                    </p>
                    <div className="pt-2 flex items-center gap-2 font-technical text-[10px] text-stone-500">
                      <span>Action: {result.recommendation.actionType.replace('_', ' ')}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 py-2">
                    Continue standard practice progression.
                  </p>
                )}
              </div>
            </div>

            {/* Skill Breakdown Table */}
            <div className="border border-stone-300/70 dark:border-stone-800/80 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-300/60 dark:border-stone-800 font-technical text-xs text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>Skill Performance Breakdown</span>
                <span>Accuracy & Competency</span>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800/80">
                {result.skillResults.map((skill) => (
                  <div
                    key={skill.skillId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-medium text-stone-900 dark:text-stone-100">
                        {skill.skillName}
                      </div>
                      <div className="font-technical text-[10px] text-stone-500 mt-0.5">
                        {skill.correct} of {skill.attempted} correct
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-28 sm:w-36 h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
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
                      <span className="font-technical font-semibold w-10 text-right text-stone-900 dark:text-stone-100">
                        {skill.score}%
                      </span>
                      <span className="font-technical text-[10px] px-2 py-0.5 rounded border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 w-24 text-center">
                        {skill.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-300/50 dark:border-stone-800">
              <button
                type="button"
                onClick={handleRetake}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-technical text-xs transition-colors cursor-pointer"
              >
                ↺ Retake Diagnostic
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {onNavigateToProfile && (
                  <button
                    type="button"
                    onClick={onNavigateToProfile}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    View Learner Profile →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
