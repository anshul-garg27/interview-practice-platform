"use client"

import { useState, useEffect, useCallback, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useParams } from "next/navigation"
import MarkdownRenderer from "@/components/ui/MarkdownRenderer"
import { PracticeSolutionModal } from "@/components/solution/PracticeSolutionModal"
import type { PracticeSolution } from "@/components/solution/types/solution"

interface FollowUp {
  part_number: number
  title: string
  emoji?: string
  difficulty: string
  estimated_time?: string
  description_md: string
  visual_md?: string
  method_signatures?: Array<{
    name: string
    signature_java?: string
    signature_python?: string
  }>
  constraints?: string[]
  constraints_md?: string
  examples?: Array<{ input: any; output: any; explanation?: string }>
  hints?: string[] | Record<string, { title: string; content_md: string }>
  test_cases?: any
  optimal_solution_hints?: any
}

interface Problem {
  problem_id: string
  title: string
  emoji: string
  category: string
  tags: string[]
  difficulty: { overall: string; parts?: Record<string, string> }
  estimated_time: string
  companies: string[]
  frequency?: number
  leetcode_similar?: string[]
  topics?: string[]
  prerequisites?: string[]
  problem_statement: {
    description_md: string
    requirements_md?: string
    method_signatures?: Array<{
      name: string
      signature_java?: string
      signature_python?: string
      signature_typescript?: string
      parameters?: Array<{ name: string; type: string; description: string }>
      returns?: { type: string; description: string }
    }>
    constraints_md?: string
    notes_md?: string
  }
  visual_diagram?: string
  examples?: Array<{
    title: string
    input: any
    output: any
    explanation_md?: string
    visual?: string
  }>
  test_cases?: {
    easy?: any[]
    medium?: any[]
    hard?: any[]
  }
  hints?: Record<string, { title: string; content_md: string }>
  common_mistakes?: Array<{
    mistake: string
    code_wrong?: string
    code_correct?: string
    impact?: string
  }>
  class_design?: {
    description_md?: string
    uml_ascii?: string
  }
  starter_code?: Record<string, string>
  follow_ups?: FollowUp[]
  interview_flow?: any
  real_interview_tips?: string[]
  related_problems?: Array<{ problem: string; relevance: string }> | string[]
}

const difficultyConfig = {
  easy: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  hard: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY ALL FEATURE
// ─────────────────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  // Simple markdown stripping - remove common markdown syntax
  return text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim()) // Keep code block content
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/^#{1,6}\s+/gm, '') // Headers
    .replace(/^\s*[-*+]\s+/gm, '• ') // List items
    .replace(/^\s*\d+\.\s+/gm, (match) => match.trim() + ' ') // Numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .trim()
}

function formatSolutionForCopy(solution: PracticeSolution, partLabel: string): string {
  const sections: string[] = []

  sections.push(`\n${'='.repeat(60)}\n${partLabel}\n${'='.repeat(60)}`)

  // Clarifying Questions
  if (solution.problem_analysis?.clarifying_questions?.length) {
    sections.push('\n📋 CLARIFYING QUESTIONS TO ASK:')
    solution.problem_analysis.clarifying_questions.forEach((q, i) => {
      sections.push(`${i + 1}. ${q}`)
    })
  }

  // Thinking Process
  if (solution.thinking_process) {
    sections.push('\n🧠 THINKING PROCESS:')
    if (solution.thinking_process.step_by_step?.length) {
      solution.thinking_process.step_by_step.forEach((step, i) => {
        sections.push(`${i + 1}. ${step}`)
      })
    }
    if (solution.thinking_process.key_insight) {
      sections.push(`\nKey Insight: ${solution.thinking_process.key_insight}`)
    }
    if (solution.thinking_process.why_this_works) {
      sections.push(`Why This Works: ${solution.thinking_process.why_this_works}`)
    }
  }

  // Optimal Solution
  if (solution.optimal_solution) {
    sections.push('\n🎯 OPTIMAL SOLUTION:')
    if (solution.optimal_solution.name) {
      sections.push(`Approach: ${solution.optimal_solution.name}`)
    }
    if (solution.optimal_solution.explanation_md) {
      sections.push(stripMarkdown(solution.optimal_solution.explanation_md))
    }
    if (solution.optimal_solution.data_structures?.length) {
      sections.push('\nData Structures:')
      solution.optimal_solution.data_structures.forEach(ds => {
        sections.push(`• ${ds.structure}: ${ds.purpose}`)
      })
    }
    if (solution.optimal_solution.algorithm_steps?.length) {
      sections.push('\nAlgorithm Steps:')
      solution.optimal_solution.algorithm_steps.forEach((step, i) => {
        sections.push(`${i + 1}. ${step}`)
      })
    }
  }

  // Approaches Comparison
  if (solution.approaches?.length) {
    sections.push('\n📊 APPROACHES COMPARISON:')
    solution.approaches.forEach((approach, i) => {
      sections.push(`\n${i + 1}. ${approach.name}`)
      sections.push(`   Description: ${approach.description}`)
      sections.push(`   Time: ${approach.time_complexity} | Space: ${approach.space_complexity}`)
      if (approach.why_not_optimal) {
        sections.push(`   Why not optimal: ${approach.why_not_optimal}`)
      }
    })
  }

  // Complexity Analysis
  if (solution.complexity_analysis) {
    sections.push('\n⏱️ COMPLEXITY ANALYSIS:')
    const time = typeof solution.complexity_analysis.time === 'string'
      ? solution.complexity_analysis.time
      : JSON.stringify(solution.complexity_analysis.time)
    const space = typeof solution.complexity_analysis.space === 'string'
      ? solution.complexity_analysis.space
      : JSON.stringify(solution.complexity_analysis.space)
    sections.push(`Time Complexity: ${time}`)
    sections.push(`Space Complexity: ${space}`)
  }

  // Solution Code (Python only)
  const pythonCode = solution.solution_python ||
    (solution.solution_python_lines?.length ? solution.solution_python_lines.join('\n') : null)

  if (pythonCode) {
    sections.push('\n💻 SOLUTION CODE (PYTHON):')
    sections.push('```python')
    sections.push(pythonCode)
    sections.push('```')
  }

  return sections.join('\n')
}

async function copyAllProblemContent(
  problem: Problem,
  basePath: string
): Promise<{ success: boolean; message: string }> {
  const sections: string[] = []

  // Header
  sections.push(`${'═'.repeat(60)}`)
  sections.push(`📝 ${problem.title}`)
  sections.push(`${'═'.repeat(60)}`)
  sections.push(`Difficulty: ${problem.difficulty.overall} | Category: ${problem.category}`)
  sections.push(`Time: ${problem.estimated_time} | Tags: ${problem.tags.join(', ')}`)

  // Problem Statement
  sections.push('\n' + '─'.repeat(40))
  sections.push('📄 PROBLEM STATEMENT')
  sections.push('─'.repeat(40))
  sections.push(stripMarkdown(problem.problem_statement.description_md))

  if (problem.problem_statement.requirements_md) {
    sections.push('\nRequirements:')
    sections.push(stripMarkdown(problem.problem_statement.requirements_md))
  }

  // Method Signatures
  if (problem.problem_statement.method_signatures?.length) {
    sections.push('\n' + '─'.repeat(40))
    sections.push('📝 METHOD SIGNATURES')
    sections.push('─'.repeat(40))
    problem.problem_statement.method_signatures.forEach(method => {
      sections.push(`\n${method.name}:`)
      if (method.signature_python) sections.push(`  Python: ${method.signature_python}`)
      if (method.signature_java) sections.push(`  Java: ${method.signature_java}`)
      if (method.parameters?.length) {
        sections.push('  Parameters:')
        method.parameters.forEach(p => {
          sections.push(`    • ${p.name} (${p.type}): ${p.description}`)
        })
      }
      if (method.returns) {
        sections.push(`  Returns: ${method.returns.type} - ${method.returns.description}`)
      }
    })
  }

  // Constraints
  if (problem.problem_statement.constraints_md) {
    sections.push('\n' + '─'.repeat(40))
    sections.push('⚠️ CONSTRAINTS')
    sections.push('─'.repeat(40))
    sections.push(stripMarkdown(problem.problem_statement.constraints_md))
  }

  // Examples
  if (problem.examples?.length) {
    sections.push('\n' + '─'.repeat(40))
    sections.push('📌 EXAMPLES')
    sections.push('─'.repeat(40))
    problem.examples.forEach((example, i) => {
      sections.push(`\nExample ${i + 1}: ${example.title}`)
      if (example.explanation_md) {
        sections.push(stripMarkdown(example.explanation_md))
      }
    })
  }

  // Fetch and add main solution
  try {
    const mainUrl = `${basePath}/data/practice_solutions/${problem.problem_id}_main.json`
    const mainRes = await fetch(mainUrl)
    if (mainRes.ok) {
      const mainSolution = await mainRes.json()
      sections.push(formatSolutionForCopy(mainSolution, '🎯 MAIN PROBLEM SOLUTION'))
    }
  } catch {
    // Main solution not available
  }

  // Fetch and add follow-up solutions
  const followUps = problem.follow_ups || []
  for (let i = 0; i < followUps.length; i++) {
    const followUp = followUps[i]
    const partNum = followUp.part_number || (i + 2)

    // Add follow-up problem statement
    sections.push(`\n${'═'.repeat(60)}`)
    sections.push(`🚀 FOLLOW-UP ${partNum}: ${followUp.title}`)
    sections.push(`${'═'.repeat(60)}`)
    sections.push(stripMarkdown(followUp.description_md))

    if (followUp.method_signatures?.length) {
      sections.push('\nMethod Signatures:')
      followUp.method_signatures.forEach(method => {
        if (method.signature_python) sections.push(`  ${method.name}: ${method.signature_python}`)
      })
    }

    // Fetch follow-up solution
    try {
      const partUrl = `${basePath}/data/practice_solutions/${problem.problem_id}_part${partNum}.json`
      const partRes = await fetch(partUrl)
      if (partRes.ok) {
        const partSolution = await partRes.json()
        sections.push(formatSolutionForCopy(partSolution, `📋 PART ${partNum} SOLUTION`))
      }
    } catch {
      // Part solution not available
    }
  }

  // Copy to clipboard
  const fullContent = sections.join('\n')
  try {
    await navigator.clipboard.writeText(fullContent)
    return { success: true, message: 'Copied all content!' }
  } catch {
    return { success: false, message: 'Failed to copy' }
  }
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
  color = 'indigo'
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
  color?: 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan'
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = useId()

  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden" role="region" aria-labelledby={`${contentId}-header`}>
      <button
        id={`${contentId}-header`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`${contentId}-content`}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 rounded-lg sm:rounded-xl ${colorClasses[color]} flex items-center justify-center text-sm sm:text-base`} aria-hidden="true">
            {icon}
          </div>
          <h2 className="text-sm sm:text-lg font-semibold text-slate-900 truncate">{title}</h2>
          {badge && (
            <span className="hidden sm:inline-flex px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full flex-shrink-0" aria-label={`${badge} items`}>
              {badge}
            </span>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={`${contentId}-content`}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-100 pt-3 sm:pt-4 text-sm sm:text-base">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Base path for GitHub Pages deployment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

// API base URL for backend (when running)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

function SolutionButtons({
  problem,
  partNumber,
  onSolutionLoaded
}: {
  problem: Problem
  partNumber?: number
  onSolutionLoaded: (solution: PracticeSolution) => void
}) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [solution, setSolution] = useState<PracticeSolution | null>(null)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for existing solution on mount
  const checkExistingSolution = useCallback(async () => {
    try {
      const suffix = partNumber ? `part${partNumber}` : 'main'
      const url = `${basePath}/data/practice_solutions/${problem.problem_id}_${suffix}.json`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setSolution(data)
      }
    } catch {
      // Solution file doesn't exist
    } finally {
      setLoading(false)
    }
  }, [problem.problem_id, partNumber])

  // Check if backend is available with retry
  const checkBackend = useCallback(async () => {
    const maxRetries = 3
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`${API_BASE}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })
        if (res.ok) {
          setBackendAvailable(true)
          return
        }
      } catch {
        // Retry with exponential backoff
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        }
      }
    }
    setBackendAvailable(false)
  }, [])

  useEffect(() => {
    checkExistingSolution()
    checkBackend()
  }, [checkExistingSolution, checkBackend])

  // View existing solution
  const handleView = () => {
    if (solution) {
      onSolutionLoaded(solution)
    }
  }

  // Generate solution with AI
  const handleGenerate = async (force = false) => {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/practice/generate-solution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem,
          partNumber: partNumber || null,
          force
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate solution')
      }

      const data = await res.json()
      setSolution(data.solution)
      onSolutionLoaded(data.solution)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
        Checking...
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* View Solution Button - if solution exists */}
      {solution && (
        <button
          onClick={handleView}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="hidden sm:inline">View </span>Solution
        </button>
      )}

      {/* AI Generate Button */}
      {backendAvailable ? (
        <button
          onClick={() => handleGenerate(!!solution)}
          disabled={generating}
          className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all ${
            generating
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : solution
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {generating ? (
            <>
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Generating...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden sm:inline">{solution ? 'Regenerate' : 'Generate'} with AI</span>
              <span className="sm:hidden">{solution ? 'Regen' : 'AI'}</span>
            </>
          )}
        </button>
      ) : !solution && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 bg-slate-50 border border-slate-200">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          No Solution
        </div>
      )}

      {/* Error message */}
      {error && (
        <span className="text-xs text-rose-500">{error}</span>
      )}
    </div>
  )
}

export function PracticeProblemClient() {
  const params = useParams()
  const problemId = params.id as string

  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleHints, setVisibleHints] = useState<string[]>([])
  const [activeFollowUp, setActiveFollowUp] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'followups'>('problem')
  const [activeSolution, setActiveSolution] = useState<PracticeSolution | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle')

  const handleCopyAll = async () => {
    if (!problem) return
    setCopyStatus('copying')
    const result = await copyAllProblemContent(problem, basePath)
    setCopyStatus(result.success ? 'success' : 'error')
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  useEffect(() => {
    fetch(`${basePath}/data/all_problems.json`)
      .then(res => res.json())
      .then(data => {
        const found = data.problems.find((p: Problem) => p.problem_id === problemId)
        if (found) {
          setProblem(found)
        } else {
          setError('Problem not found')
        }
        setLoading(false)
      })
      .catch(err => {
        setError('Failed to load problem')
        setLoading(false)
      })
  }, [problemId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 font-medium">Loading problem...</p>
        </div>
      </div>
    )
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center text-4xl">
            😕
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Problem Not Found</h1>
          <p className="text-slate-500 mb-6">{error || 'The problem you are looking for does not exist.'}</p>
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Practice
          </Link>
        </div>
      </div>
    )
  }

  const diff = difficultyConfig[problem.difficulty.overall as keyof typeof difficultyConfig] || difficultyConfig.medium
  const followUps = problem.follow_ups || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header - Mobile Responsive */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-5xl">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 hover:text-slate-900 mb-3 sm:mb-4 transition-colors"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back to Practice Problems</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="flex items-start gap-3 sm:gap-5">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl sm:text-3xl shadow-sm">
              {problem.emoji || '📋'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 line-clamp-2">{problem.title}</h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium ${diff.bg} ${diff.text} border ${diff.border} capitalize`}>
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${diff.dot}`} />
                  {problem.difficulty.overall}
                </span>
                <span className="hidden min-[480px]:inline-flex px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {problem.category}
                </span>
                <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium bg-slate-100 text-slate-600">
                  ⏱️ {problem.estimated_time}
                </span>
                {followUps.length > 0 && (
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    +{followUps.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tags and Copy All Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 sm:mt-4">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-16 overflow-y-auto flex-1">
              {problem.tags.slice(0, 6).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-100 text-slate-600 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg">
                  {tag}
                </span>
              ))}
              {problem.tags.length > 6 && (
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-100 text-slate-400 text-[10px] sm:text-xs rounded-md sm:rounded-lg">
                  +{problem.tags.length - 6} more
                </span>
              )}
            </div>

            {/* Copy All Button */}
            <button
              onClick={handleCopyAll}
              disabled={copyStatus === 'copying'}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                copyStatus === 'success'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : copyStatus === 'error'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-sm hover:shadow'
              }`}
            >
              {copyStatus === 'copying' ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden sm:inline">Copying...</span>
                </>
              ) : copyStatus === 'success' ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : copyStatus === 'error' ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Failed</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Copy All</span>
                  <span className="sm:hidden">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Tabs - Scroll on mobile */}
          {followUps.length > 0 && (
            <div className="flex gap-1 sm:gap-2 mt-4 sm:mt-6 border-b border-slate-200 -mb-4 sm:-mb-6 pb-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab('problem')}
                className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors ${
                  activeTab === 'problem'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                📝 <span className="hidden sm:inline">Main </span>Problem
              </button>
              <button
                onClick={() => setActiveTab('followups')}
                className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 ${
                  activeTab === 'followups'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                🚀 Follow-ups
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] sm:text-xs rounded-full">
                  {followUps.length}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content - Mobile Responsive */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-5xl space-y-4 sm:space-y-6">
        {activeTab === 'problem' ? (
          <>
            {/* Generate Solution Button - Main - Stack on mobile */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Ready to solve this problem?</h3>
                <p className="text-slate-600 text-xs sm:text-sm mt-0.5 sm:mt-1">Generate an AI-powered solution when you're stuck</p>
              </div>
              <SolutionButtons 
                problem={problem}
                onSolutionLoaded={(solution) => setActiveSolution(solution)} 
              />
            </div>

            {/* Problem Statement */}
            <Section
              title="Problem Statement"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            >
              <MarkdownRenderer content={problem.problem_statement.description_md} />
              
              {problem.problem_statement.requirements_md && (
                <div className="mt-6">
                  <MarkdownRenderer content={problem.problem_statement.requirements_md} />
                </div>
              )}
            </Section>

            {/* Method Signatures */}
            {problem.problem_statement.method_signatures && problem.problem_statement.method_signatures.length > 0 && (
              <Section
                title="Method Signatures"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                color="purple"
              >
                <div className="space-y-4">
                  {problem.problem_statement.method_signatures.map((method, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        {method.name}
                      </h4>
                      <div className="space-y-2">
                        {method.signature_python && (
                          <div className="font-mono text-sm bg-white rounded-lg p-3 border border-slate-200">
                            <span className="text-slate-400">Python: </span>
                            <span className="text-indigo-600">{method.signature_python}</span>
                          </div>
                        )}
                        {method.signature_java && (
                          <div className="font-mono text-sm bg-white rounded-lg p-3 border border-slate-200">
                            <span className="text-slate-400">Java: </span>
                            <span className="text-orange-600">{method.signature_java}</span>
                          </div>
                        )}
                      </div>
                      {method.parameters && method.parameters.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Parameters</p>
                          <ul className="space-y-1">
                            {method.parameters.map((param, j) => (
                              <li key={j} className="text-sm flex items-start gap-2">
                                <code className="text-indigo-600 font-medium">{param.name}</code>
                                <span className="text-slate-400">({param.type})</span>
                                <span className="text-slate-600">- {param.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Constraints */}
            {problem.problem_statement.constraints_md && (
              <Section
                title="Constraints"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                color="amber"
              >
                <MarkdownRenderer content={problem.problem_statement.constraints_md} />
              </Section>
            )}

            {/* Visual Diagram */}
            {problem.visual_diagram && (
              <Section
                title="Visual Diagram"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>}
                color="cyan"
              >
                <MarkdownRenderer content={problem.visual_diagram} />
              </Section>
            )}

            {/* Examples */}
            {problem.examples && problem.examples.length > 0 && (
              <Section
                title="Examples"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                badge={`${problem.examples.length}`}
                color="emerald"
              >
                <div className="space-y-6">
                  {problem.examples.map((example, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        {example.title}
                      </h4>
                      {example.explanation_md && (
                        <MarkdownRenderer content={example.explanation_md} className="mb-4" />
                      )}
                      {example.visual && (
                        <div className="mt-4">
                          <MarkdownRenderer content={example.visual} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Hints */}
            {problem.hints && Object.keys(problem.hints).length > 0 && (
              <Section
                title="Hints"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                defaultOpen={false}
              >
                <div className="space-y-3">
                  {Object.entries(problem.hints).map(([key, hint]) => {
                    const isVisible = visibleHints.includes(key)
                    return (
                      <div key={key}>
                        {isVisible ? (
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">
                                {hint.title}
                              </span>
                            </div>
                            <MarkdownRenderer content={hint.content_md} />
                          </div>
                        ) : (
                          <button
                            onClick={() => setVisibleHints([...visibleHints, key])}
                            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Reveal: {hint.title}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Common Mistakes */}
            {problem.common_mistakes && problem.common_mistakes.length > 0 && (
              <Section
                title="Common Mistakes"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                defaultOpen={false}
                color="rose"
              >
                <div className="space-y-4">
                  {problem.common_mistakes.map((cm, i) => (
                    <div key={i} className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-rose-800">{cm.mistake}</h4>
                          {cm.impact && (
                            <p className="text-rose-700 text-sm mt-1"><strong>Impact:</strong> {cm.impact}</p>
                          )}
                          {cm.code_wrong && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">❌ Wrong</p>
                              <MarkdownRenderer content={`\`\`\`\n${cm.code_wrong}\n\`\`\``} />
                            </div>
                          )}
                          {cm.code_correct && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">✅ Correct</p>
                              <MarkdownRenderer content={`\`\`\`\n${cm.code_correct}\n\`\`\``} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Interview Tips */}
            {problem.real_interview_tips && problem.real_interview_tips.length > 0 && (
              <Section
                title="Real Interview Tips"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                defaultOpen={false}
                color="cyan"
              >
                <ul className="space-y-3">
                  {problem.real_interview_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-cyan-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-cyan-800">{tip}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        ) : (
          /* Follow-ups Tab */
          <div className="space-y-4 sm:space-y-6">
            {followUps.map((followUp, index) => {
              const fuDiff = difficultyConfig[followUp.difficulty as keyof typeof difficultyConfig] || difficultyConfig.medium
              const isExpanded = activeFollowUp === index

              return (
                <div key={index} className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Follow-up Header */}
                  <button
                    onClick={() => setActiveFollowUp(isExpanded ? null : index)}
                    className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={`followup-content-${index}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-lg sm:text-xl shadow-sm">
                        {followUp.emoji || `P${followUp.part_number}`}
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-lg truncate sm:whitespace-normal">
                          Part {followUp.part_number}: {followUp.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium ${fuDiff.bg} ${fuDiff.text} border ${fuDiff.border} capitalize`}>
                            <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${fuDiff.dot}`} />
                            {followUp.difficulty}
                          </span>
                          {followUp.estimated_time && (
                            <span className="text-xs sm:text-sm text-slate-500">⏱️ {followUp.estimated_time}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <motion.svg
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 flex-shrink-0 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </button>

                  {/* Follow-up Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        id={`followup-content-${index}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-100 pt-3 sm:pt-4 space-y-4 sm:space-y-6">
                          {/* Generate Solution Button for Follow-up */}
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="font-medium text-slate-900 text-sm sm:text-base">Need help with Part {followUp.part_number}?</h4>
                              <p className="text-slate-500 text-xs sm:text-sm">Generate a solution for this follow-up</p>
                            </div>
                            <SolutionButtons 
                              problem={problem}
                              partNumber={followUp.part_number}
                              onSolutionLoaded={(solution) => setActiveSolution(solution)} 
                            />
                          </div>

                          {/* Description */}
                          {followUp.description_md && (
                            <div>
                              <MarkdownRenderer content={followUp.description_md} />
                            </div>
                          )}

                          {/* Visual */}
                          {followUp.visual_md && (
                            <div>
                              <MarkdownRenderer content={followUp.visual_md} />
                            </div>
                          )}

                          {/* Method Signatures */}
                          {followUp.method_signatures && followUp.method_signatures.length > 0 && (
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2 sm:mb-3">New Methods</h4>
                              <div className="space-y-2 sm:space-y-3">
                                {followUp.method_signatures.map((method, mi) => (
                                  <div key={mi} className="bg-slate-50 rounded-lg p-2.5 sm:p-3 border border-slate-200">
                                    <p className="font-medium text-slate-900 mb-1.5 sm:mb-2 text-sm sm:text-base">{method.name}</p>
                                    {method.signature_python && (
                                      <code className="block text-xs sm:text-sm text-indigo-600 font-mono overflow-x-auto">
                                        {method.signature_python}
                                      </code>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Constraints */}
                          {followUp.constraints_md && (
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2 sm:mb-3">Constraints</h4>
                              <MarkdownRenderer content={followUp.constraints_md} />
                            </div>
                          )}

                          {/* Hints */}
                          {followUp.hints && (
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2 sm:mb-3">Hints</h4>
                              <div className="space-y-2">
                                {Array.isArray(followUp.hints) ? (
                                  followUp.hints.map((hint, hi) => (
                                    <div key={hi} className="bg-amber-50 rounded-lg p-2.5 sm:p-3 border border-amber-200 text-amber-800 text-xs sm:text-sm">
                                      💡 {hint}
                                    </div>
                                  ))
                                ) : (
                                  Object.entries(followUp.hints).map(([key, hint]) => (
                                    <div key={key} className="bg-amber-50 rounded-lg p-2.5 sm:p-3 border border-amber-200">
                                      <p className="font-medium text-amber-800 mb-1 text-sm">{hint.title}</p>
                                      <MarkdownRenderer content={hint.content_md} className="text-amber-700 text-xs sm:text-sm" />
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* Optimal Solution Hints */}
                          {followUp.optimal_solution_hints && (
                            <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-200">
                              <h4 className="font-semibold text-emerald-800 mb-2 sm:mb-3 text-sm sm:text-base">💡 Optimal Solution Approach</h4>
                              {followUp.optimal_solution_hints.data_structures && (
                                <div className="mb-1.5 sm:mb-2">
                                  <span className="text-xs sm:text-sm font-medium text-emerald-700">Data Structures: </span>
                                  <span className="text-xs sm:text-sm text-emerald-600">
                                    {Array.isArray(followUp.optimal_solution_hints.data_structures)
                                      ? followUp.optimal_solution_hints.data_structures.join(', ')
                                      : followUp.optimal_solution_hints.data_structures}
                                  </span>
                                </div>
                              )}
                              {followUp.optimal_solution_hints.key_insight && (
                                <div>
                                  <span className="text-xs sm:text-sm font-medium text-emerald-700">Key Insight: </span>
                                  <span className="text-xs sm:text-sm text-emerald-600">{followUp.optimal_solution_hints.key_insight}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Solution Modal */}
      <PracticeSolutionModal
        isOpen={activeSolution !== null}
        onClose={() => setActiveSolution(null)}
        solution={activeSolution}
        problemTitle={problem?.title}
      />
    </div>
  )
}
