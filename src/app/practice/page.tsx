"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Problem {
  problem_id: string
  title: string
  emoji: string
  category: string
  difficulty: { overall: string }
  estimated_time: string
  tags: string[]
  companies: string[]
  frequency?: number
  leetcode_similar?: string[]
  follow_ups?: Array<{ title: string; difficulty: string }>
}

interface ProblemsData {
  generated_at: string
  total_problems: number
  problems: Problem[]
}

interface SolutionInfo {
  main: boolean
  parts: number[]
}

interface SolutionManifest {
  generated_at: string
  total_with_solutions: number
  solutions: Record<string, SolutionInfo>
}

const difficultyConfig = {
  easy: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  hard: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
}

const categoryColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'LLD/OOP Design': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: '🏗️' },
  'LLD/API Design': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', icon: '🔌' },
  'HLD/System Design': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: '☁️' },
  'DSA/Trees': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '🌳' },
  'DSA/Graphs': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: '🔗' },
  'DSA/Binary Search': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🔍' },
  'DSA/Trees + OOP Design': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', icon: '🌲' },
  'Frontend/JavaScript': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '⚡' },
  'Frontend/LLD': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: '🎨' },
}

export default function PracticePage() {
  const [data, setData] = useState<ProblemsData | null>(null)
  const [solutionManifest, setSolutionManifest] = useState<SolutionManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [manifestError, setManifestError] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedSolutionFilter, setSelectedSolutionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Base path for GitHub Pages deployment
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  useEffect(() => {
    Promise.all([
      fetch(`${basePath}/data/all_problems.json`).then(res => res.json()),
      fetch(`${basePath}/data/solution_manifest.json`).then(res => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      }).catch(() => {
        setManifestError(true)
        return null
      })
    ])
      .then(([problemsData, manifestData]) => {
        setData(problemsData)
        setSolutionManifest(manifestData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading data:', err)
        setLoading(false)
      })
  }, [])

  const categories = useMemo(() => {
    if (!data) return []
    const cats = new Set(data.problems.map(p => p.category))
    return Array.from(cats).sort()
  }, [data])

  // Helper to get solution info for a problem
  const getSolutionInfo = (problemId: string): SolutionInfo | null => {
    if (!solutionManifest) return null
    return solutionManifest.solutions[problemId] || null
  }

  const filteredProblems = useMemo(() => {
    if (!data) return []
    return data.problems.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || p.difficulty.overall === selectedDifficulty
      const matchesSearch = searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

      // Solution filter
      const solutionInfo = getSolutionInfo(p.problem_id)
      let matchesSolution = true
      if (selectedSolutionFilter === 'has_solution') {
        matchesSolution = solutionInfo !== null && (solutionInfo.main || solutionInfo.parts.length > 0)
      } else if (selectedSolutionFilter === 'no_solution') {
        matchesSolution = solutionInfo === null || (!solutionInfo.main && solutionInfo.parts.length === 0)
      } else if (selectedSolutionFilter === 'has_main') {
        matchesSolution = solutionInfo !== null && solutionInfo.main
      } else if (selectedSolutionFilter === 'has_followups') {
        matchesSolution = solutionInfo !== null && solutionInfo.parts.length > 0
      }

      return matchesCategory && matchesDifficulty && matchesSearch && matchesSolution
    })
  }, [data, selectedCategory, selectedDifficulty, searchQuery, selectedSolutionFilter, solutionManifest])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 font-medium">Loading practice problems...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Failed to load problems</h1>
          <p className="text-slate-500">Please try again later</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Beautiful Header - Mobile Responsive */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTZzLTItNC0yLTYgMi00IDItNi0yLTQtMi02IDItNCAyLTYtMi00LTItNiAyLTQgMi02Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl shadow-lg">
              🎯
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1">Practice Problems</h1>
              <p className="text-white/80 text-sm sm:text-lg">Master interview problems from real Rippling interviews</p>
            </div>
          </div>
          
          {/* Stats - Mobile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-4 mt-6 sm:mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-3 border border-white/20">
              <p className="text-white/70 text-xs sm:text-sm">Total</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{data.total_problems}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-3 border border-white/20">
              <p className="text-white/70 text-xs sm:text-sm">Categories</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{categories.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-3 border border-white/20">
              <p className="text-white/70 text-xs sm:text-sm">With Solutions</p>
              <p className="text-white text-lg sm:text-2xl font-bold">
                {solutionManifest?.total_with_solutions || 0}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-3 border border-white/20">
              <p className="text-white/70 text-xs sm:text-sm">Follow-ups</p>
              <p className="text-white text-lg sm:text-2xl font-bold">
                {solutionManifest ? Object.values(solutionManifest.solutions).reduce((sum, s) => sum + s.parts.length, 0) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Mobile Responsive */}
      <div className="container mx-auto px-4 sm:px-6 -mt-4 sm:-mt-6 relative z-10">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search problems, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>

            {/* Category Filter + Difficulty - Row on desktop, stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Difficulty Filter - Scroll on mobile */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {['all', 'easy', 'medium', 'hard'].map(diff => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                      selectedDifficulty === diff
                        ? diff === 'all'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                          : diff === 'easy'
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : diff === 'medium'
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                          : 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {diff === 'all' ? 'All' : diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Solution Filter */}
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { value: 'all', label: 'All', icon: '📋' },
                { value: 'has_solution', label: 'Has Solution', icon: '✅' },
                { value: 'has_main', label: 'Main', icon: '📗' },
                { value: 'has_followups', label: 'Follow-ups', icon: '📘' },
                { value: 'no_solution', label: 'No Solution', icon: '⏳' },
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedSolutionFilter(filter.value)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
                    selectedSolutionFilter === filter.value
                      ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{filter.icon}</span>
                  <span className="hidden sm:inline">{filter.label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-xs sm:text-sm mt-3 sm:mt-4">
            Showing {filteredProblems.length} of {data.total_problems} problems
          </p>
        </div>
      </div>

      {/* Warning banner when manifest fails */}
      {manifestError && (
        <div className="container mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-amber-800">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Solution status couldn&apos;t be loaded. Solution badges may not appear.</span>
            <button
              onClick={() => setManifestError(false)}
              className="ml-auto text-amber-600 hover:text-amber-800"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Problems Grid - Mobile Responsive */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <motion.div layout className="grid gap-3 sm:gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProblems.map((problem, index) => {
              const diff = difficultyConfig[problem.difficulty.overall as keyof typeof difficultyConfig] || difficultyConfig.medium
              const catConfig = categoryColors[problem.category] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: '📋' }
              const solutionInfo = getSolutionInfo(problem.problem_id)

              return (
                <motion.div
                  key={problem.problem_id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <Link href={`/practice/${problem.problem_id}`}>
                    <div className="group bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Emoji - Smaller on mobile */}
                        <div className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-lg sm:text-2xl shadow-sm group-hover:scale-110 transition-transform">
                          {problem.emoji || catConfig.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate sm:whitespace-normal">
                                {problem.title}
                              </h3>
                              {/* Badges - Horizontal scroll on mobile */}
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1.5 sm:mt-2">
                                {/* Difficulty */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium ${diff.bg} ${diff.text} border ${diff.border}`}>
                                  <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${diff.dot}`} />
                                  {problem.difficulty.overall}
                                </span>
                                
                                {/* Category - Hidden on very small screens */}
                                <span className={`hidden min-[480px]:inline-flex px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium ${catConfig.bg} ${catConfig.text} border ${catConfig.border}`}>
                                  {catConfig.icon} <span className="hidden sm:inline">{problem.category}</span>
                                </span>
                                
                                {/* Time */}
                                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                  ⏱️ {problem.estimated_time}
                                </span>

                                {/* Follow-ups */}
                                {problem.follow_ups && problem.follow_ups.length > 0 && (
                                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                    +{problem.follow_ups.length}
                                  </span>
                                )}

                                {/* Solution Status Badges */}
                                {solutionInfo && (solutionInfo.main || solutionInfo.parts.length > 0) && (
                                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                                    {solutionInfo.main && <span title="Main solution available">📗</span>}
                                    {solutionInfo.parts.length > 0 ? (
                                      <span title={`Follow-up parts: ${solutionInfo.parts.join(', ')}`}>
                                        📘{solutionInfo.parts.length}
                                      </span>
                                    ) : solutionInfo.main && (
                                      <span className="opacity-50" title="No follow-up solutions yet">
                                        📘0
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Arrow - Smaller on mobile */}
                            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>

                          {/* Tags - Show fewer on mobile */}
                          <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                            {problem.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 sm:px-2 bg-slate-100 text-slate-600 text-[10px] sm:text-xs rounded font-medium">
                                {tag}
                              </span>
                            ))}
                            {problem.tags.length > 3 && (
                              <span className="px-1.5 py-0.5 sm:px-2 bg-slate-100 text-slate-400 text-[10px] sm:text-xs rounded sm:hidden">
                                +{problem.tags.length - 3}
                              </span>
                            )}
                            {/* Desktop: Show more tags */}
                            {problem.tags.slice(3, 5).map((tag, i) => (
                              <span key={i + 3} className="hidden sm:inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                {tag}
                              </span>
                            ))}
                            {problem.tags.length > 5 && (
                              <span className="hidden sm:inline-flex px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-md">
                                +{problem.tags.length - 5} more
                              </span>
                            )}
                          </div>

                          {/* LeetCode Similar - Hidden on mobile */}
                          {problem.leetcode_similar && problem.leetcode_similar.length > 0 && (
                            <div className="hidden sm:flex flex-wrap gap-2 mt-3">
                              {problem.leetcode_similar.slice(0, 2).map((lc, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-md font-medium border border-orange-200">
                                  <span className="font-bold">LC</span>
                                  {lc.replace(/LC\s*\d*\s*-?\s*/i, '').slice(0, 25)}...
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-10 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-slate-100 flex items-center justify-center text-3xl sm:text-4xl">
              🔍
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">No problems found</h3>
            <p className="text-sm sm:text-base text-slate-500">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  )
}
