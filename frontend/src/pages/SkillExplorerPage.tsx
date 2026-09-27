/**
 * SkillExplorerPage.tsx — Phase 3 Development Verification Interface.
 *
 * This development-facing page allows the developer to verify the real backend
 * Skill and Question systems:
 * 1. Load real skills from MongoDB via GET /api/skills.
 * 2. Select a skill and inspect its full prerequisite chain via GET /api/skills/:skillId.
 * 3. Query questions filtered by skill and difficulty via GET /api/questions.
 * 4. Test deterministic question selection via POST /api/questions/select.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSkillById, fetchSkills } from '../services/skillService'
import { fetchQuestions, selectQuestions } from '../services/questionService'
import type { SkillDetail, SkillSummary } from '../types/skills'
import type { QuestionData } from '../types/questions'

interface SkillExplorerPageProps {
  onNavigateToDiagnostic?: () => void
}

export default function SkillExplorerPage({ onNavigateToDiagnostic }: SkillExplorerPageProps) {
  const { user, logout } = useAuth()

  // Skills state
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [selectedSkillSlug, setSelectedSkillSlug] = useState<string>('')
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillDetailLoading, setSkillDetailLoading] = useState(false)
  const [skillError, setSkillError] = useState<string | null>(null)

  // Questions state
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [selectionCount, setSelectionCount] = useState<number>(2)
  const [lastQueryMode, setLastQueryMode] = useState<'filter' | 'selection' | null>(null)

  // 1. Load all skills on mount
  useEffect(() => {
    loadSkills()
  }, [])

  async function loadSkills() {
    setSkillsLoading(true)
    setSkillError(null)
    try {
      const data = await fetchSkills()
      setSkills(data)
      if (data.length > 0 && !selectedSkillSlug) {
        // Automatically select the first multi-level skill or default to first
        const defaultSkill = data.find((s) => s.slug === 'multiplication') ?? data[0]
        setSelectedSkillSlug(defaultSkill.slug)
        loadSkillDetail(defaultSkill.slug)
      }
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      setSkillsLoading(false)
    }
  }

  // 2. Load detailed skill info & prerequisite chain
  async function loadSkillDetail(slug: string) {
    if (!slug) return
    setSkillDetailLoading(true)
    setSkillError(null)
    try {
      const detail = await fetchSkillById(slug)
      setSkillDetail(detail)
      // Auto-load questions for selected skill
      loadQuestions(slug, difficultyFilter)
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : 'Failed to load skill details')
    } finally {
      setSkillDetailLoading(false)
    }
  }

  function handleSelectSkill(slug: string) {
    setSelectedSkillSlug(slug)
    loadSkillDetail(slug)
  }

  // 3. Query questions with filter
  async function loadQuestions(slug: string, diffStr: string) {
    setQuestionsLoading(true)
    setQuestionError(null)
    setLastQueryMode('filter')
    try {
      const diffNumber = diffStr === 'all' ? undefined : Number(diffStr)
      const data = await fetchQuestions({
        skill: slug,
        difficulty: diffNumber,
      })
      setQuestions(data)
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setQuestionsLoading(false)
    }
  }

  // 4. Test deterministic selection service
  async function handleTestSelection() {
    if (!selectedSkillSlug) return
    setQuestionsLoading(true)
    setQuestionError(null)
    setLastQueryMode('selection')
    try {
      const diffNumber = difficultyFilter === 'all' ? undefined : Number(difficultyFilter)
      const result = await selectQuestions({
        skillId: selectedSkillSlug,
        difficulty: diffNumber,
        count: selectionCount,
      })
      setQuestions(result.questions)
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Question selection failed')
    } finally {
      setQuestionsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            LL
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">LearnLoop</h1>
            <p className="text-xs text-slate-400">Curriculum & Prerequisite Graph Explorer</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {onNavigateToDiagnostic && (
            <button
              onClick={onNavigateToDiagnostic}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
            >
              {user?.role === 'TEACHER'
                ? '← Teacher Workspace'
                : user?.role === 'ADMIN'
                  ? '← Admin Console'
                  : '← Diagnostic Assessment'}
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">{user?.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
              {user?.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Skill Selection & Prerequisite Chain */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Skill Selector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                1. Curriculum Skills
              </h2>
              <button
                onClick={loadSkills}
                disabled={skillsLoading}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                {skillsLoading ? 'Refreshing…' : '↻ Reload'}
              </button>
            </div>

            {skillError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {skillError}
              </div>
            )}

            <label htmlFor="skill-selector" className="block text-xs text-slate-400 mb-1.5">
              Select a Skill to Inspect:
            </label>
            <select
              id="skill-selector"
              value={selectedSkillSlug}
              onChange={(e) => handleSelectSkill(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {skills.map((s) => (
                <option key={s.id} value={s.slug}>
                  Level {s.level} — {s.name} ({s.slug})
                </option>
              ))}
            </select>

            {/* Quick-select pill list */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSkill(s.slug)}
                  className={`text-xs px-2.5 py-1 rounded-md transition ${
                    selectedSkillSlug === s.slug
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Skill Details & Prerequisite Chain */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex-1">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              2. Prerequisite Chain Traversal
            </h2>

            {skillDetailLoading ? (
              <p className="text-xs text-slate-400 py-4">Resolving prerequisite chain…</p>
            ) : skillDetail ? (
              <div className="space-y-4">
                {/* Selected Skill Banner */}
                <div className="bg-slate-950/70 border border-indigo-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-indigo-400">Target Skill</span>
                    <span className="text-[11px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
                      Level {skillDetail.level}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{skillDetail.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {skillDetail.description}
                  </p>
                  <div className="mt-2 text-[11px] text-slate-500 flex gap-4 font-mono">
                    <span>Slug: {skillDetail.slug}</span>
                    <span>Order: {skillDetail.order}</span>
                    <span>Competency: {skillDetail.competency}</span>
                  </div>
                </div>

                {/* Prerequisite Chain Visualizer */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Prerequisite Dependency Chain</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {skillDetail.prerequisiteChain.length} prerequisite(s)
                    </span>
                  </h4>

                  {skillDetail.prerequisiteChain.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-slate-400 text-center">
                      Root foundational skill (No prerequisites)
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                      {skillDetail.prerequisiteChain.map((prereq, index) => (
                        <div
                          key={prereq.id}
                          className="relative bg-slate-950/60 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition"
                        >
                          <div className="absolute -left-[19px] top-4 w-2 h-2 rounded-full bg-indigo-400 ring-4 ring-slate-900"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-200">
                              {index + 1}. {prereq.name}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                              Level {prereq.level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{prereq.description}</p>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            slug: {prereq.slug}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select a skill to inspect its prerequisite chain.</p>
            )}
          </div>
        </section>

        {/* Right Column: Question Bank & Deterministic Selection */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Query Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              3. Question Retrieval & Deterministic Selection
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Difficulty Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Difficulty Filter</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => {
                    setDifficultyFilter(e.target.value)
                    loadQuestions(selectedSkillSlug, e.target.value)
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="1">Difficulty 1</option>
                  <option value="2">Difficulty 2</option>
                </select>
              </div>

              {/* Selection Count (for deterministic selection test) */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Selection Count (Deterministic)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={selectionCount}
                    onChange={(e) => setSelectionCount(Math.max(1, Number(e.target.value)))}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleTestSelection}
                    disabled={questionsLoading || !selectedSkillSlug}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                  >
                    Select {selectionCount} Questions
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400">
                Mode:{' '}
                <span className="text-slate-200 font-medium">
                  {lastQueryMode === 'selection'
                    ? 'Deterministic Selection (/api/questions/select)'
                    : 'Question Bank Filter (/api/questions)'}
                </span>
              </span>
              <button
                onClick={() => loadQuestions(selectedSkillSlug, difficultyFilter)}
                disabled={questionsLoading}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                Fetch All for Skill
              </button>
            </div>
          </div>

          {/* Question List Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">
                Backend Results ({questions.length} question{questions.length === 1 ? '' : 's'})
              </h3>
              {questionsLoading && (
                <span className="text-xs text-indigo-400 animate-pulse">Loading questions…</span>
              )}
            </div>

            {questionError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {questionError}
              </div>
            )}

            {questions.length === 0 && !questionsLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-lg border border-slate-800/80">
                No questions found matching the requested filters.
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Diff {q.difficulty}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {q.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {q.id}</span>
                    </div>

                    {/* Question Prompt */}
                    <p className="text-sm font-medium text-white mb-2 leading-relaxed">
                      {q.prompt}
                    </p>

                    {/* Options (if MCQ) */}
                    {q.options && q.options.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300"
                          >
                            <span className="text-slate-500 font-mono mr-1.5">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Educational Metadata Footer */}
                    <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="text-slate-400">
                        <span className="text-slate-500">Answer: </span>
                        <span className="font-semibold text-emerald-400">
                          {String(q.correctAnswer)}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500">Explanation: </span>
                        <span className="text-slate-300 italic">{q.explanation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
