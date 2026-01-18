"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

// Base path for GitHub Pages deployment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface QuestionSource {
  id: string
  roundName: string
}

interface Question {
  id: string
  name: string
  category: string
  sources: QuestionSource[]
  variations: string[]
  followUps: string[]
  gotchas: string[]
  difficulties: string[]
  leetcodeSimilar: string[]
  approaches: string[]
  topics: string[]
}

interface RoundData {
  total: number
  commonPatterns: number
  uniqueQuestions: number
  questions: Question[]
}

interface QuestionsData {
  generatedAt: string
  totalExperiences: number
  categories: string[]
  topQuestions: {
    id: string
    name: string
    category: string
    count: number
    rounds: number[]
  }[]
  stats: {
    totalQuestions: number
    byRound: { round: number; total: number; common: number; unique: number }[]
  }
  rounds: Record<string, RoundData>
}

// Clean, modern category styling
const categoryConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  'LLD/OOP Design': { icon: '🏗️', color: '#0ea5e9', bgColor: 'rgba(14, 165, 233, 0.08)' },
  'LLD/API Design': { icon: '🔌', color: '#0ea5e9', bgColor: 'rgba(14, 165, 233, 0.08)' },
  'LLD/System Design': { icon: '⚙️', color: '#0ea5e9', bgColor: 'rgba(14, 165, 233, 0.08)' },
  'HLD/System Design': { icon: '🌐', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.08)' },
  'DSA/Trees': { icon: '🌳', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)' },
  'DSA/Graphs': { icon: '🔗', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)' },
  'DSA/Arrays': { icon: '📊', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)' },
  'DSA/Binary Search': { icon: '🔍', color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.08)' },
  'DSA/DP': { icon: '🧩', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.08)' },
  'DSA/Intervals': { icon: '📅', color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.08)' },
  'DSA/Design': { icon: '✏️', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)' },
  'DSA/Coding': { icon: '💻', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.08)' },
  'Frontend/JavaScript': { icon: '🟨', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.08)' },
  'Frontend/LLD': { icon: '🎨', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.08)' },
  'Behavioral': { icon: '💬', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.08)' },
  'HR': { icon: '👥', color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.08)' },
  'General': { icon: '📝', color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.08)' }
}

const difficultyStyles: Record<string, string> = {
  'easy': 'text-emerald-600 bg-emerald-50',
  'medium': 'text-amber-600 bg-amber-50',
  'hard': 'text-red-600 bg-red-50'
}

function QuestionCard({ question, index, isExpanded, onToggle, hasGeneratedProblem }: {
  question: Question
  index: number
  isExpanded: boolean
  onToggle: () => void
  hasGeneratedProblem: boolean
}) {
  const config = categoryConfig[question.category] || categoryConfig['General']

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <div
        className={`
          relative bg-white rounded-2xl overflow-hidden
          transition-all duration-300 ease-out
          ${isExpanded
            ? 'shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-gray-200'
            : 'shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
          }
        `}
      >
        {/* Accent Line */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
          style={{ backgroundColor: config.color }}
        />

        {/* Main Content */}
        <div className="pl-5 pr-5 py-5">
          {/* Header - Always visible */}
          <div
            className="flex items-start justify-between gap-4 cursor-pointer"
            onClick={onToggle}
          >
            <div className="flex-1 min-w-0">
              {/* Category & Difficulty Row */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: config.bgColor, color: config.color }}
                >
                  <span>{config.icon}</span>
                  {question.category}
                </span>
                {question.difficulties.map((diff, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${difficultyStyles[diff] || difficultyStyles['medium']}`}
                  >
                    {diff}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 leading-snug mb-2 group-hover:text-gray-700 transition-colors">
                {question.name}
              </h3>

              {/* Meta Row */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-medium text-gray-700">{question.sources.length}x</span>
                  <span>asked</span>
                </div>
                {question.variations.length > 1 && (
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                    <span>{question.variations.length} variations</span>
                  </div>
                )}
                {question.followUps.length > 0 && (
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{question.followUps.length} follow-ups</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expand Button */}
            <button
              className={`
                flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300
                ${isExpanded
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600'
                }
              `}
            >
              <motion.svg
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-5 mt-5 border-t border-gray-100 space-y-5">
                  {/* LeetCode Similar */}
                  {question.leetcodeSimilar.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                        LeetCode Similar
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {question.leetcodeSimilar.map((lc, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-50 text-orange-700"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/>
                            </svg>
                            {lc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Variations */}
                  {question.variations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                        Question Variations ({question.variations.length})
                      </h4>
                      <div className="space-y-2">
                        {question.variations.map((v, i) => (
                          <div
                            key={i}
                            className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                          >
                            {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-ups */}
                  {question.followUps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                        Follow-up Questions ({question.followUps.length})
                      </h4>
                      <div className="space-y-2">
                        {question.followUps.map((f, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-semibold">
                              {i + 1}
                            </span>
                            <span className="text-sm text-gray-700 pt-0.5">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gotchas */}
                  {question.gotchas.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Key Gotchas & Tips ({question.gotchas.length})
                      </h4>
                      <div className="space-y-2">
                        {question.gotchas.map((g, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{g}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View Full Problem Button */}
                  {hasGeneratedProblem && (
                    <div className="mb-5">
                      <Link
                        href={`/problem/${question.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Full Problem with Test Cases
                      </Link>
                    </div>
                  )}

                  {/* Experience Links */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      View Full Experiences ({question.sources.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {question.sources.map((source, i) => (
                        <Link
                          key={i}
                          href={`/experience/${source.id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {source.roundName}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function QuestionsPage() {
  const [data, setData] = useState<QuestionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generatedProblemIds, setGeneratedProblemIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Fetch generated problems to know which ones have professional problem statements
    fetch(`${basePath}/data/generated_problems.json`)
      .then(res => res.json())
      .then(genData => {
        const ids = new Set<string>(genData.problems?.map((p: { id: string }) => p.id) || [])
        setGeneratedProblemIds(ids)
      })
      .catch(() => {
        // Ignore errors - generated problems file may not exist yet
      })

    fetch(`${basePath}/data/questions.json`)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading questions:', err)
        setLoading(false)
      })
  }, [])

  const filteredQuestions = useMemo(() => {
    if (!data) return []

    let questions: Question[] = []

    if (selectedRound === "all") {
      const questionMap = new Map<string, Question>()
      for (let round = 1; round <= 5; round++) {
        const roundData = data.rounds[round.toString()]
        if (roundData) {
          roundData.questions.forEach(q => {
            if (questionMap.has(q.id)) {
              const existing = questionMap.get(q.id)!
              q.sources.forEach(source => {
                const exists = existing.sources.some(s => s.id === source.id && s.roundName === source.roundName)
                if (!exists) existing.sources.push(source)
              })
              q.variations.forEach(v => {
                if (!existing.variations.includes(v)) existing.variations.push(v)
              })
              q.followUps.forEach(f => {
                if (!existing.followUps.includes(f)) existing.followUps.push(f)
              })
              q.gotchas.forEach(g => {
                if (!existing.gotchas.includes(g)) existing.gotchas.push(g)
              })
            } else {
              questionMap.set(q.id, {
                ...q,
                sources: [...q.sources],
                variations: [...q.variations],
                followUps: [...q.followUps],
                gotchas: [...q.gotchas]
              })
            }
          })
        }
      }
      questions = Array.from(questionMap.values())
    } else {
      const roundData = data.rounds[selectedRound]
      if (roundData) questions = roundData.questions
    }

    if (selectedCategory !== "all") {
      questions = questions.filter(q => q.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      questions = questions.filter(q =>
        q.name.toLowerCase().includes(query) ||
        q.category.toLowerCase().includes(query) ||
        q.variations.some(v => v.toLowerCase().includes(query)) ||
        q.leetcodeSimilar.some(lc => lc.toLowerCase().includes(query)) ||
        q.topics.some(t => t.toLowerCase().includes(query))
      )
    }

    return questions.sort((a, b) => b.sources.length - a.sources.length)
  }, [data, selectedRound, selectedCategory, searchQuery])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load</h3>
          <p className="text-gray-500">Could not load questions data</p>
        </div>
      </div>
    )
  }

  const rounds = ['all', '1', '2', '3', '4', '5']
  const roundLabels: Record<string, string> = {
    'all': 'All Rounds',
    '1': 'Round 1',
    '2': 'Round 2',
    '3': 'Round 3',
    '4': 'Round 4',
    '5': 'Round 5'
  }

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-100/40 to-cyan-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Question Bank
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Master your interviews with{' '}
              <span className="font-semibold text-indigo-600">{data.stats.totalQuestions}</span> curated questions from{' '}
              <span className="font-semibold text-purple-600">{data.totalExperiences}</span> real experiences
            </p>

            {/* Stats Pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {data.stats.byRound.map((stat, i) => (
                <motion.div
                  key={stat.round}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100"
                >
                  <span className="w-2 h-2 rounded-full" style={{
                    backgroundColor: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][i]
                  }} />
                  <span className="text-sm font-medium text-gray-700">R{stat.round}</span>
                  <span className="text-sm text-gray-400">{stat.total}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        {/* Top Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Most Frequently Asked</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.topQuestions.slice(0, 10).map((q, i) => (
              <motion.button
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.03 }}
                onClick={() => setSearchQuery(q.name)}
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                  {q.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  {q.count}x
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8 space-y-4"
        >
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search questions, topics, LeetCode problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-gray-50 border-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Round & Category Filters */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Round Pills */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Round:</span>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {rounds.map((round) => (
                  <button
                    key={round}
                    onClick={() => setSelectedRound(round)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${selectedRound === round
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    {round === 'all' ? 'All' : `R${round}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 rounded-xl bg-gray-100 border-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {data.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{filteredQuestions.length}</span> questions
            {selectedRound !== "all" && <span className="text-indigo-600"> in {roundLabels[selectedRound]}</span>}
            {selectedCategory !== "all" && <span className="text-purple-600"> / {selectedCategory}</span>}
          </p>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isExpanded={expandedId === question.id}
              onToggle={() => setExpandedId(expandedId === question.id ? null : question.id)}
              hasGeneratedProblem={generatedProblemIds.has(question.id)}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredQuestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search query</p>
            <button
              onClick={() => {
                setSearchQuery("")
                setSelectedRound("all")
                setSelectedCategory("all")
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filters
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
