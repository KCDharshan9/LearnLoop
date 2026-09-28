/**
 * SkillExplorerPage.tsx — LearnLoop Curriculum Graph & Skill Hierarchy.
 *
 * Redesigned as an editorial Curriculum Map rather than a debug tool:
 * - Left: Interactive skill list ordered by curriculum progression with level tags.
 * - Center: Prerequisite chain visualization showing dependency flows:
 *     Number Sense → Addition → Repeated Addition → Multiplication → Division.
 * - Right/Bottom: Real questions linked to the skill with deterministic query testing.
 * - Minimalist borders, editorial serif headings, monospace metadata.
 */

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { fetchSkillById, fetchSkills } from '../services/skillService'
import { fetchQuestions, selectQuestions } from '../services/questionService'
import type { SkillDetail, SkillSummary } from '../types/skills'
import type { QuestionData } from '../types/questions'

interface SkillExplorerPageProps {
  onNavigateToDiagnostic?: () => void
}

export default function SkillExplorerPage({ onNavigateToDiagnostic }: SkillExplorerPageProps) {
  const { user } = useAuth()

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
  const selectionCount = 2
  const [lastQueryMode, setLastQueryMode] = useState<'filter' | 'selection' | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadSkills() {
      setSkillsLoading(true)
      setSkillError(null)
      try {
        const data = await fetchSkills()
        if (!mounted) return
        setSkills(data)
        if (data.length > 0 && !selectedSkillSlug) {
          const defaultSkill = data.find((s) => s.slug === 'multiplication') ?? data[0]
          setSelectedSkillSlug(defaultSkill.slug)
          loadSkillDetail(defaultSkill.slug)
        }
      } catch (err) {
        if (!mounted) return
        setSkillError(err instanceof Error ? err.message : 'Failed to load skills')
      } finally {
        if (mounted) setSkillsLoading(false)
      }
    }
    loadSkills()
    return () => {
      mounted = false
    }
  }, [])

  async function loadSkillDetail(slug: string) {
    if (!slug) return
    setSkillDetailLoading(true)
    setSkillError(null)
    try {
      const detail = await fetchSkillById(slug)
      setSkillDetail(detail)
      loadQuestionsForSkill(detail.id, difficultyFilter)
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : 'Failed to load skill details')
    } finally {
      setSkillDetailLoading(false)
    }
  }

  async function loadQuestionsForSkill(skillId: string, diff: string) {
    setQuestionsLoading(true)
    setQuestionError(null)
    setLastQueryMode('filter')
    try {
      const filters: { skill?: string; difficulty?: number } = { skill: skillId }
      if (diff !== 'all') {
        filters.difficulty = Number(diff)
      }
      const qs = await fetchQuestions(filters)
      setQuestions(qs)
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setQuestionsLoading(false)
    }
  }

  async function handleDeterministicSelect() {
    if (!skillDetail) return
    setQuestionsLoading(true)
    setQuestionError(null)
    setLastQueryMode('selection')
    try {
      const diff = difficultyFilter === 'all' ? undefined : Number(difficultyFilter)
      const selected = await selectQuestions({
        skillId: skillDetail.id,
        count: selectionCount,
        difficulty: diff,
      })
      setQuestions(selected.questions)
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Deterministic selection failed')
    } finally {
      setQuestionsLoading(false)
    }
  }

  function handleSelectSkill(slug: string) {
    setSelectedSkillSlug(slug)
    loadSkillDetail(slug)
  }

  function handleDifficultyChange(newDiff: string) {
    setDifficultyFilter(newDiff)
    if (skillDetail) {
      loadQuestionsForSkill(skillDetail.id, newDiff)
    }
  }

  const navItems = [
    ...(onNavigateToDiagnostic
      ? [
          {
            id: 'diagnostic',
            label: user?.role === 'STUDENT' ? 'Diagnostic' : 'Workspace',
            onClick: onNavigateToDiagnostic,
          },
        ]
      : []),
    {
      id: 'curriculum',
      label: 'Curriculum Graph',
      onClick: () => {},
      active: true,
    },
  ]

  return (
    <AppShell navItems={navItems} currentContext="Curriculum Knowledge Graph">
      <div className="max-w-6xl w-full mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col gap-8">
        {/* Editorial Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-stone-300/60 dark:border-stone-800 pb-6">
          <div>
            <span className="font-technical text-xs text-[#e05a36] uppercase tracking-wider">
              Curriculum Architecture
            </span>
            <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-stone-950 dark:text-[#f7f4ed] tracking-tight mt-1">
              Skill & Prerequisite Graph
            </h1>
            <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1">
              Explore foundational numeracy competencies, dependency relationships, and question banks.
            </p>
          </div>

          <div className="flex items-center gap-2 font-technical text-xs text-stone-500">
            <span>{skills.length} active skills</span>
            <span>•</span>
            <span>FLN Level 1–3</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {skillError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-technical flex items-center justify-between">
            <span>{skillError}</span>
            <button
              onClick={() => setSkillError(null)}
              className="text-[10px] uppercase underline cursor-pointer ml-4"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Skill List (4 cols) */}
          <div className="lg:col-span-4 border border-stone-300/70 dark:border-stone-800/80 rounded-2xl p-4 flex flex-col gap-2">
            <div className="px-2 py-1 font-technical text-[10px] uppercase tracking-wider text-stone-500 flex items-center justify-between">
              <span>Curriculum Sequence</span>
              <span>Order</span>
            </div>

            {skillsLoading ? (
              <div className="py-8 text-center font-technical text-xs text-stone-400 animate-pulse">
                Loading curriculum…
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {skills.map((skill) => {
                  const isSelected = skill.slug === selectedSkillSlug
                  return (
                    <button
                      key={skill.id}
                      onClick={() => handleSelectSkill(skill.slug)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#e05a36] bg-[#e05a36]/10 text-stone-950 dark:text-stone-100 ring-1 ring-[#e05a36]'
                          : 'border-stone-200/80 dark:border-stone-800/80 bg-stone-100/40 dark:bg-stone-900/30 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium">{skill.name}</span>
                        <span className="font-technical text-[10px] text-stone-400">
                          {skill.competency}
                        </span>
                      </div>
                      <span className="font-technical text-[10px] px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-700 text-stone-500">
                        L{skill.level}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Skill Detail & Prerequisite Traversal (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {skillDetailLoading ? (
              <div className="py-16 text-center font-technical text-xs text-stone-400 animate-pulse">
                Traversing prerequisite graph…
              </div>
            ) : skillDetail ? (
              <>
                {/* Selected Skill Overview Card */}
                <div className="p-6 rounded-2xl border border-stone-300/80 dark:border-stone-800 bg-stone-100/30 dark:bg-stone-900/20 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-stone-950 dark:text-stone-100">
                          {skillDetail.name}
                        </h2>
                        <span className="font-technical text-[10px] px-2 py-0.5 rounded border border-stone-300 dark:border-stone-700 text-stone-500">
                          Level {skillDetail.level}
                        </span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1 leading-relaxed">
                        {skillDetail.description}
                      </p>
                    </div>

                    <div className="text-right font-technical text-[10px] text-stone-500">
                      <div>Sequence #{skillDetail.order}</div>
                      <div>slug: {skillDetail.slug}</div>
                    </div>
                  </div>

                  {/* Prerequisite Chain Visualizer */}
                  <div className="pt-4 border-t border-stone-300/60 dark:border-stone-800/80 flex flex-col gap-2">
                    <span className="font-technical text-[10px] uppercase text-stone-500">
                      Prerequisite Dependency Path
                    </span>

                    {skillDetail.prerequisiteChain.length === 0 ? (
                      <p className="font-technical text-xs text-emerald-600 dark:text-emerald-400">
                        • Foundational Entry Skill (no prior prerequisites required)
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-1 font-technical text-xs">
                        {skillDetail.prerequisiteChain.map((chainItem) => (
                          <div key={chainItem.id} className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg border border-stone-300/80 dark:border-stone-700/80 bg-white/70 dark:bg-stone-950/60 text-stone-700 dark:text-stone-300">
                              {chainItem.name} <span className="text-[10px] text-stone-400">[L{chainItem.level}]</span>
                            </span>
                            <span className="text-stone-400">→</span>
                          </div>
                        ))}
                        <span className="px-2.5 py-1 rounded-lg border border-[#e05a36] bg-[#e05a36]/10 text-stone-950 dark:text-stone-100 font-medium">
                          {skillDetail.name} [Target]
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Bank Explorer */}
                <div className="border border-stone-300/70 dark:border-stone-800/80 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-300/50 dark:border-stone-800 pb-3">
                    <div>
                      <h3 className="font-editorial text-xl font-normal text-stone-950 dark:text-stone-100">
                        Linked Assessment Questions
                      </h3>
                      <p className="font-technical text-[11px] text-stone-500">
                        {questions.length} questions loaded ({lastQueryMode ?? 'filter'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {/* Difficulty selector */}
                      <select
                        value={difficultyFilter}
                        onChange={(e) => handleDifficultyChange(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-technical text-xs text-stone-800 dark:text-stone-200"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="1">Difficulty 1</option>
                        <option value="2">Difficulty 2</option>
                        <option value="3">Difficulty 3</option>
                      </select>

                      {/* Deterministic test button */}
                      <button
                        onClick={handleDeterministicSelect}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-technical text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
                        title="Simulate deterministic question selection algorithm"
                      >
                        Select Sample (2)
                      </button>
                    </div>
                  </div>

                  {questionError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-technical">
                      {questionError}
                    </div>
                  )}

                  {questionsLoading ? (
                    <div className="py-8 text-center font-technical text-xs text-stone-400 animate-pulse">
                      Retrieving questions from bank…
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="py-6 text-center font-technical text-xs text-stone-400">
                      No questions matched this criteria.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200 dark:divide-stone-800/80">
                      {questions.map((q) => (
                        <div key={q.id} className="py-3.5 flex flex-col gap-2 text-xs">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-editorial text-base text-stone-900 dark:text-stone-100">
                              {q.prompt}
                            </span>
                            <span className="font-technical text-[10px] text-stone-500 whitespace-nowrap">
                              Diff {q.difficulty} • {q.type}
                            </span>
                          </div>

                          {q.options && q.options.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1 font-technical text-[11px]">
                              {q.options.map((opt, oIdx) => (
                                <span
                                  key={oIdx}
                                  className="px-2 py-0.5 rounded border border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/40 text-stone-600 dark:text-stone-400"
                                >
                                  {opt.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
