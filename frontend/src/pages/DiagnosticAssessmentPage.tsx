/**
 * DiagnosticAssessmentPage.tsx — LearnLoop Diagnostic Assessment.
 *
 * Provides the core evidence-based diagnostic flow:
 * 1. Diagnostic Overview & Introduction
 * 2. Active Question Interface (Server-retrieved questions, stable across refreshes)
 * 3. Answer Submission (Server-authoritative evaluation)
 * 4. Diagnostic Result Analysis:
 *    - Overall Performance & Competency
 *    - Skill-by-Skill Breakdown
 *    - Identified Learning Gap (Prerequisite-Aware Analysis)
 *    - Actionable Recommendation
 */

import { useEffect, useState } from 'react'
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
}

export default function DiagnosticAssessmentPage({
  onNavigateToExplorer,
}: DiagnosticAssessmentPageProps) {
  const { user, logout } = useAuth()

  // Diagnostic flow states: 'intro' | 'active' | 'submitting' | 'result'
  const [flowState, setFlowState] = useState<'intro' | 'active' | 'submitting' | 'result'>('intro')

  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<AssessmentAttemptResult | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load diagnostic metadata on mount
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
      setError('No assessment questions available.')
      return
    }
    setFlowState('active')
    setCurrentQuestionIndex(0)
  }

  function handleAnswerSelect(questionId: string, value: unknown) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  async function handleSubmit() {
    if (!assessmentData) return
    setFlowState('submitting')
    setError(null)

    const submittedList = assessmentData.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? null,
    }))

    try {
      const attemptResult = await submitAssessment(
        assessmentData.id,
        submittedList,
        attemptId ?? undefined,
      )
      setResult(attemptResult)
      setFlowState('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
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

  const currentQuestion: ClientQuestion | undefined =
    assessmentData?.questions[currentQuestionIndex]
  const totalQuestions = assessmentData?.questions.length ?? 0
  const answeredCount = Object.keys(answers).length
  const progressPercent = totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Product Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20 text-base">
            ∞
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-sm">LearnLoop</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                Diagnostic
              </span>
            </div>
            <p className="text-xs text-slate-400">Foundational Numeracy Assessment</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {onNavigateToExplorer && (
            <button
              onClick={onNavigateToExplorer}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <span>Curriculum Skills</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-200 font-medium">{user?.name}</span>
            <span className="text-slate-400 font-mono text-[11px]">({user?.role})</span>
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs underline hover:text-white ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. INTRO STATE */}
        {flowState === 'intro' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
              <span>Diagnostic Assessment</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              {assessmentData?.title ?? 'Foundational Numeracy Diagnostic'}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl">
              This diagnostic evaluates your foundational numeracy concepts across 5 interrelated skills.
              Your responses help identify exactly where conceptual understanding is strong and where targeted prerequisite support will help most.
            </p>

            {/* Assessment Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400 mb-1">QUESTIONS</div>
                <div className="text-xl font-bold text-white">
                  {assessmentData?.questionCount ?? 10} Questions
                </div>
                <div className="text-xs text-slate-500 mt-1">Foundational to developing</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400 mb-1">SKILL CHAIN</div>
                <div className="text-xl font-bold text-white">5 Core Skills</div>
                <div className="text-xs text-slate-500 mt-1">Number Sense → Division</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400 mb-1">EVALUATION</div>
                <div className="text-xl font-bold text-emerald-400">Server-Side</div>
                <div className="text-xs text-slate-500 mt-1">Prerequisite gap analysis</div>
              </div>
            </div>

            {/* Skills evaluated */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Skills Evaluated in this Diagnostic:
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {['Number Sense', 'Addition', 'Repeated Addition', 'Multiplication', 'Division'].map(
                  (skill, idx, arr) => (
                    <div key={skill} className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200 font-medium">
                        {skill}
                      </span>
                      {idx < arr.length - 1 && <span className="text-slate-600">→</span>}
                    </div>
                  ),
                )}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !assessmentData}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {loading ? 'Preparing Questions…' : 'Begin Diagnostic Assessment'}
              <span>→</span>
            </button>
          </div>
        )}

        {/* 2. ACTIVE QUESTION STATE */}
        {flowState === 'active' && currentQuestion && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col">
            {/* Top Question Progress Header */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-medium border border-indigo-500/20">
                  {currentQuestion.skillName ?? 'Skill'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded font-mono text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                  Difficulty {currentQuestion.difficulty}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-8">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Question Prompt */}
            <div className="mb-8">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-2">
                Prompt
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
                {currentQuestion.prompt}
              </h2>
            </div>

            {/* Answer Input Area */}
            <div className="mb-8">
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                // Multiple Choice
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected =
                      String(answers[currentQuestion.id]) === String(option.value)
                    const letter = String.fromCharCode(65 + optIdx)
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerSelect(currentQuestion.id, option.value)}
                        className={`p-4 rounded-xl border text-left flex items-center gap-3 transition ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                // Number / Text Input
                <div className="max-w-md">
                  <label htmlFor="answer-input" className="block text-xs text-slate-400 mb-2">
                    Enter your answer:
                  </label>
                  <input
                    id="answer-input"
                    type="text"
                    value={String(answers[currentQuestion.id] ?? '')}
                    onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    placeholder="Type answer here..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wide"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Type numbers or expressions (e.g. 12 or 2 + 2 + 2)
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-300 transition"
              >
                ← Previous
              </button>

              {/* Question Dots */}
              <div className="hidden sm:flex items-center gap-1.5">
                {assessmentData?.questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex
                  const isFilled = answers[q.id] !== undefined && answers[q.id] !== ''
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-6 h-6 rounded-md text-[10px] font-mono transition ${
                        isCurrent
                          ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400/50'
                          : isFilled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800/80 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  <span>Next Question</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <span>Submit Diagnostic</span>
                  <span>✓</span>
                </button>
              )}
            </div>

            <div className="mt-3 text-right">
              <span className="text-[11px] text-slate-500">
                {answeredCount} of {totalQuestions} answered
              </span>
            </div>
          </div>
        )}

        {/* 3. SUBMITTING STATE */}
        {flowState === 'submitting' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 animate-spin mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Analyzing Diagnostic Assessment</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Evaluating your answers server-side, scoring skill competencies, and running prerequisite gap detection…
            </p>
          </div>
        )}

        {/* 4. RESULT STATE */}
        {flowState === 'result' && result && (
          <div className="space-y-6">
            {/* Top Score Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      Diagnostic Completed
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-500 font-mono">
                      Attempt ID: {result.attemptId.slice(-6)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Your Competency Profile</h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
                    Performance evaluated across 5 prerequisite-linked foundational skills.
                  </p>
                </div>

                {/* Overall Score Dial */}
                <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-xl px-5 py-3">
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-white font-mono">
                      {result.overallScore}%
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                      Overall Score
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      result.overallScore >= 70
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : result.overallScore >= 40
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {result.overallScore >= 70
                      ? 'MASTERED'
                      : result.overallScore >= 40
                        ? 'DEVELOPING'
                        : 'NEEDS SUPPORT'}
                  </div>
                </div>
              </div>
            </div>

            {/* Identified Learning Gap Card (Core Phase 4 Educational Feature) */}
            {result.learningGap && (
              <div
                className={`border rounded-2xl p-6 sm:p-7 shadow-lg ${
                  result.learningGap.gapType === 'PREREQUISITE_WEAKNESS'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : result.learningGap.gapType === 'DIRECT_TARGET_WEAKNESS'
                      ? 'bg-sky-950/20 border-sky-500/30'
                      : result.learningGap.gapType === 'MASTERY'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-indigo-950/20 border-indigo-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-300">
                      Identified Learning Gap
                    </span>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium border ${
                      result.learningGap.gapType === 'PREREQUISITE_WEAKNESS'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : result.learningGap.gapType === 'DIRECT_TARGET_WEAKNESS'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {result.learningGap.gapType.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                  {result.learningGap.summary}
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  {result.learningGap.detail}
                </p>

                {/* Evidence Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                    <span className="text-slate-400 block text-[11px]">Target Skill:</span>
                    <span className="text-white font-medium">
                      {result.learningGap.targetSkillName} ({result.learningGap.targetScore}% •{' '}
                      {result.learningGap.targetStatus.replace('_', ' ')})
                    </span>
                  </div>
                  {result.learningGap.prerequisiteSkillName && (
                    <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                      <span className="text-slate-400 block text-[11px]">Prerequisite Skill:</span>
                      <span className="text-white font-medium">
                        {result.learningGap.prerequisiteSkillName} (
                        {result.learningGap.prerequisiteScore}% •{' '}
                        {result.learningGap.prerequisiteStatus?.replace('_', ' ')})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommended Next Focus Card */}
            {result.recommendation && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                    Recommended Next Focus
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">
                  {result.recommendation.headline}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                  {result.recommendation.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>Action: {result.recommendation.actionType.replace(/_/g, ' ')}</span>
                  <span>•</span>
                  <span>Focus: {result.recommendation.focusSkillName}</span>
                </div>
              </div>
            )}

            {/* Skill-by-Skill Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
                Skill Performance Breakdown
              </h3>

              <div className="space-y-3">
                {result.skillResults.map((skill) => (
                  <div
                    key={skill.skillId}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {skill.skillName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {skill.skillSlug}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {skill.correct} of {skill.attempted} questions correct
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Visual score bar */}
                      <div className="w-24 sm:w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            skill.score >= 70
                              ? 'bg-emerald-500'
                              : skill.score >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${skill.score}%` }}
                        ></div>
                      </div>

                      <div className="w-12 text-right font-mono font-bold text-sm text-white">
                        {skill.score}%
                      </div>

                      <div
                        className={`w-28 text-center py-1 rounded-md text-[10px] font-bold border font-mono ${
                          skill.status === 'MASTERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : skill.status === 'DEVELOPING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {skill.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                onClick={handleRetake}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                ↺ Retake Diagnostic
              </button>

              {onNavigateToExplorer && (
                <button
                  onClick={onNavigateToExplorer}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  Explore Curriculum Graph →
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
