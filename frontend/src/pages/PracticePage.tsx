/**
 * PracticePage.tsx — Adaptive Practice Session.
 *
 * Implements Phase 7: Real Adaptive Practice
 * - Connects learning path to real student practice.
 * - Formative assessment with server-authoritative scoring.
 * - Real-time deterministic difficulty adaptation.
 * - Editorial, technical visual identity adhering strictly to LearnLoop design system.
 */

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { fetchPracticeSession, startPractice, submitPracticeAnswer } from '../services/practiceService'
import type { ClientPracticeQuestion, PracticeAction, PracticeSessionData } from '../types/practice'

interface PracticePageProps {
  learningPathId?: string
  stepNumber?: number
  skillId?: string
  onNavigateToDiagnostic: () => void
  onNavigateToProfile: () => void
  onNavigateToLearningPath: () => void
  onNavigateToCurriculum: () => void
}

export default function PracticePage({
  learningPathId,
  stepNumber,
  skillId,
  onNavigateToDiagnostic,
  onNavigateToProfile,
  onNavigateToLearningPath,
  onNavigateToCurriculum,
}: PracticePageProps) {
  const [session, setSession] = useState<PracticeSessionData | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<ClientPracticeQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<unknown>(null)
  const [inputAnswer, setInputAnswer] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Feedback state for answered question
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean
    explanation: string
    correctAnswer: unknown
    nextAction: PracticeAction
    supportMessage?: string
    sessionComplete: boolean
  } | null>(null)

  const [pendingNextQuestion, setPendingNextQuestion] = useState<ClientPracticeQuestion | null>(null)

  // Initialize or resume practice session on mount
  useEffect(() => {
    let isMounted = true

    async function initializePractice() {
      setLoading(true)
      setError(null)
      try {
        const result = await startPractice(learningPathId, stepNumber, skillId)
        if (!isMounted) return

        setSession(result.session)
        if (result.sessionComplete || !result.question) {
          setCurrentQuestion(null)
        } else {
          setCurrentQuestion(result.question)
        }
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Failed to initialize practice session.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initializePractice()

    return () => {
      isMounted = false
    }
  }, [learningPathId, stepNumber, skillId])

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
      onClick: onNavigateToLearningPath,
    },
    {
      id: 'curriculum',
      label: 'Curriculum Graph',
      onClick: onNavigateToCurriculum,
    },
  ]

  const handleSelectOption = (value: unknown) => {
    if (feedback) return
    setSelectedAnswer(value)
  }

  const handleSubmitAnswer = async () => {
    if (!session || !currentQuestion) return

    let finalAnswer: unknown = selectedAnswer
    if (currentQuestion.type === 'NUMBER_INPUT') {
      const trimmed = inputAnswer.trim()
      if (!trimmed) {
        setError('Please enter an answer before submitting.')
        return
      }
      finalAnswer = isNaN(Number(trimmed)) ? trimmed : Number(trimmed)
    }

    if (finalAnswer === null || finalAnswer === undefined || finalAnswer === '') {
      setError('Please choose or enter an answer.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await submitPracticeAnswer(session.id, currentQuestion.id, finalAnswer)

      setSession(result.session)
      setFeedback({
        isCorrect: result.isCorrect,
        explanation: result.explanation,
        correctAnswer: result.correctAnswer,
        nextAction: result.nextAction,
        supportMessage: result.supportMessage,
        sessionComplete: result.sessionComplete,
      })

      if (result.nextQuestion) {
        setPendingNextQuestion(result.nextQuestion)
      } else {
        setPendingNextQuestion(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextProblem = () => {
    if (feedback?.sessionComplete) {
      setCurrentQuestion(null)
      setFeedback(null)
      return
    }

    if (pendingNextQuestion) {
      setCurrentQuestion(pendingNextQuestion)
      setPendingNextQuestion(null)
      setSelectedAnswer(null)
      setInputAnswer('')
      setFeedback(null)
    } else {
      // Re-fetch session to ensure synchronization
      if (session) {
        fetchPracticeSession(session.id)
          .then((res) => {
            setSession(res.session)
            if (res.question) {
              setCurrentQuestion(res.question)
            } else {
              setCurrentQuestion(null)
            }
            setSelectedAnswer(null)
            setInputAnswer('')
            setFeedback(null)
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'Error advancing question.')
          })
      }
    }
  }

  const difficultyLabel = (level: number) => {
    switch (level) {
      case 1:
        return 'Foundational'
      case 2:
        return 'Intermediate'
      case 3:
        return 'Advanced'
      default:
        return `Level ${level}`
    }
  }

  const isSessionFinished = session?.status === 'COMPLETED' || (!currentQuestion && !loading)

  return (
    <AppShell navItems={navItems} currentContext="Adaptive Practice">
      <div className="max-w-3xl w-full mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col gap-8">
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
              Loading adaptive practice session…
            </p>
          </div>
        )}

        {!loading && session && (
          <>
            {/* Session Header Card */}
            <div className="flex flex-col gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-technical text-xs uppercase px-2.5 py-1 rounded bg-[#e05a36]/10 text-[#e05a36] font-medium">
                    Targeted Practice
                  </span>
                  {session.skillName && (
                    <span className="font-technical text-xs text-stone-500">
                      Concept: <strong className="text-stone-800 dark:text-stone-200 font-medium">{session.skillName}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-technical text-stone-500">
                  <span>
                    Solved: <strong className="text-stone-800 dark:text-stone-200">{session.correctCount}</strong> / {session.totalAnswered}
                  </span>
                  <span>•</span>
                  <span>
                    Difficulty: <strong className="text-stone-800 dark:text-stone-200">{difficultyLabel(session.currentDifficulty)}</strong>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-stone-200/70 dark:bg-stone-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#e05a36] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, (session.totalAnswered / 5) * 100)}%` }}
                />
              </div>
            </div>

            {/* Session Complete View */}
            {isSessionFinished ? (
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/30 p-8 sm:p-12 text-center flex flex-col items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold font-technical">
                  ✓
                </div>

                <div className="flex flex-col gap-2 max-w-md">
                  <h2 className="font-serif text-2xl font-normal text-stone-900 dark:text-stone-100">
                    Practice Session Complete
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    You have successfully completed this targeted practice checkpoint. Your responses have been recorded as formative learning evidence.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-xs font-technical text-xs text-left p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
                  <div>
                    <span className="text-stone-400 text-[10px] block">TOTAL PROBLEMS</span>
                    <span className="text-base font-semibold text-stone-900 dark:text-stone-100">
                      {session.totalAnswered}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">CORRECT ACCURACY</span>
                    <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                      {session.totalAnswered > 0 ? Math.round((session.correctCount / session.totalAnswered) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onNavigateToLearningPath}
                    className="px-6 py-2.5 rounded-full bg-[#e05a36] text-white font-technical text-xs font-medium hover:bg-[#c84927] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>Return to Learning Path</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToProfile}
                    className="px-5 py-2.5 rounded-full border border-stone-300 dark:border-stone-700 font-technical text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    View Learner Profile
                  </button>
                </div>
              </div>
            ) : (
              /* Active Question View */
              currentQuestion && (
                <div className="flex flex-col gap-6">
                  {/* Question Card */}
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 p-6 sm:p-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between text-xs font-technical text-stone-400 border-b border-stone-200 dark:border-stone-800/80 pb-3">
                      <span>Problem {session.totalAnswered + 1} of 5</span>
                      <span className="px-2 py-0.5 rounded border border-stone-300 dark:border-stone-700 text-stone-500">
                        {difficultyLabel(currentQuestion.difficulty)}
                      </span>
                    </div>

                    <div className="font-serif text-lg sm:text-xl text-stone-900 dark:text-stone-100 leading-snug">
                      {currentQuestion.prompt}
                    </div>

                    {/* Multiple Choice Options */}
                    {currentQuestion.type === 'MCQ' && (
                      <div className="grid grid-cols-1 gap-3">
                        {currentQuestion.options.map((opt, idx) => {
                          const isSelected = selectedAnswer === opt.value
                          const isAnswered = Boolean(feedback)
                          const isCorrectOption = feedback && feedback.correctAnswer === opt.value

                          let btnClasses = 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-400 text-stone-800 dark:text-stone-200'

                          if (isSelected && !isAnswered) {
                            btnClasses = 'border-[#e05a36] bg-[#e05a36]/5 text-[#e05a36] ring-1 ring-[#e05a36]'
                          } else if (isAnswered) {
                            if (isCorrectOption) {
                              btnClasses = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium'
                            } else if (isSelected && !feedback?.isCorrect) {
                              btnClasses = 'border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-300 line-through'
                            } else {
                              btnClasses = 'border-stone-200 dark:border-stone-800 opacity-60 text-stone-500'
                            }
                          }

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={isAnswered || submitting}
                              onClick={() => handleSelectOption(opt.value)}
                              className={`p-4 rounded-xl border text-left font-technical text-xs flex items-center justify-between transition-colors cursor-pointer disabled:cursor-default ${btnClasses}`}
                            >
                              <span>{opt.label}</span>
                              {isAnswered && isCorrectOption && (
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                              )}
                              {isAnswered && isSelected && !feedback?.isCorrect && (
                                <span className="text-rose-600 dark:text-rose-400 text-xs font-bold">✕</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Numeric Input */}
                    {currentQuestion.type === 'NUMBER_INPUT' && (
                      <div className="flex flex-col gap-2 max-w-xs">
                        <label className="font-technical text-xs text-stone-500">Your answer:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={Boolean(feedback) || submitting}
                          value={inputAnswer}
                          onChange={(e) => setInputAnswer(e.target.value)}
                          placeholder="Enter number…"
                          className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-technical text-sm outline-none focus:border-[#e05a36] disabled:opacity-60"
                        />
                      </div>
                    )}

                    {/* Feedback & Educational Guidance */}
                    {feedback && (
                      <div className="mt-2 flex flex-col gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60">
                        <div className="flex items-center gap-2">
                          {feedback.isCorrect ? (
                            <span className="font-technical text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              ✓ Correct!
                            </span>
                          ) : (
                            <span className="font-technical text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              ✕ Incorrect
                            </span>
                          )}
                          {feedback.supportMessage && (
                            <span className="text-stone-400 text-xs font-technical">• {feedback.supportMessage}</span>
                          )}
                        </div>

                        {feedback.explanation && (
                          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-serif">
                            {feedback.explanation}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={onNavigateToLearningPath}
                        className="font-technical text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 underline cursor-pointer"
                      >
                        ← Exit Practice
                      </button>

                      {!feedback ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleSubmitAnswer}
                          className="px-6 py-2.5 rounded-full bg-stone-950 dark:bg-stone-100 text-stone-50 dark:text-stone-950 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {submitting ? 'Checking…' : 'Submit Answer'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleNextProblem}
                          className="px-6 py-2.5 rounded-full bg-[#e05a36] text-white font-technical text-xs font-medium hover:bg-[#c84927] transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <span>{feedback.sessionComplete ? 'View Summary' : 'Next Problem'}</span>
                          <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
