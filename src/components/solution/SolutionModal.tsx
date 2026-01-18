"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'

// Base path for GitHub Pages deployment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface SolutionModalProps {
  isOpen: boolean
  onClose: () => void
  experienceId: string
  roundIndex: number
  round: any
  metadata?: any
}

interface SolutionData {
  round_summary?: {
    name: string
    type: string
    overall_difficulty: string
    key_topics: string[]
    estimated_time: string
  }
  solutions: Array<{
    question_number: number
    question_text: string
    problem_analysis: any
    solution_strategy: any
    python_solution: any
    complexity_analysis: any
    test_cases: any[]
    follow_up_solutions: any[]
    interview_tips: any
    difficulty_rating: string
    topics: string[]
    similar_problems: string[]
    estimated_solve_time?: string
    visual_explanation?: {
      problem_visualization?: string
      algorithm_steps?: Array<{
        step: number
        description: string
        visualization?: string
        state?: string
      }>
      dry_run_table?: string
    }
    pattern_recognition?: {
      pattern_name?: string
      pattern_indicators?: string[]
      pattern_template?: string
      similar_problems?: string[]
    }
  }>
  overall_preparation_tips: string[]
  generated_at: string
}

// Helper to clean code blocks - removes ``` fences and normalizes newlines
function cleanCodeBlock(text: string | undefined | null): string {
  if (!text) return ''
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '    ')
    .replace(/^```\w*\n?/, '')  // Remove opening code fence with optional language
    .replace(/\n?```$/, '')     // Remove closing code fence
    .trim()
}

// Markdown-like text renderer component - parses **bold** and `code`
function MarkdownText({ text, className = '' }: { text: string | undefined | null, className?: string }) {
  if (!text) return null
  
  // Normalize newlines
  const normalized = text.replace(/\\n/g, '\n').replace(/\\t/g, '    ')
  
  // Parse inline markdown elements
  const parseInline = (str: string, keyPrefix: string = ''): React.ReactNode[] => {
    const result: React.ReactNode[] = []
    let remaining = str
    let keyIdx = 0
    
    // Combined regex to find either **bold** or `code`
    const inlinePattern = /(\*\*(.+?)\*\*)|(`([^`]+)`)/g
    let lastIndex = 0
    let match
    
    while ((match = inlinePattern.exec(str)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        result.push(<span key={`${keyPrefix}-${keyIdx++}`}>{str.slice(lastIndex, match.index)}</span>)
      }
      
      if (match[1]) {
        // Bold: **text**
        result.push(
          <strong key={`${keyPrefix}-${keyIdx++}`} className="font-bold text-slate-900">
            {match[2]}
          </strong>
        )
      } else if (match[3]) {
        // Inline code: `code`
        result.push(
          <code key={`${keyPrefix}-${keyIdx++}`} className="px-1.5 py-0.5 bg-slate-200/80 text-indigo-700 rounded text-sm font-mono">
            {match[4]}
          </code>
        )
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < str.length) {
      result.push(<span key={`${keyPrefix}-${keyIdx++}`}>{str.slice(lastIndex)}</span>)
    }
    
    return result.length > 0 ? result : [<span key={`${keyPrefix}-0`}>{str}</span>]
  }
  
  // Split by lines and process each
  const lines = normalized.split('\n')
  
  return (
    <div className={cn("space-y-1", className)}>
      {lines.map((line, lineIdx) => {
        // Skip code fence lines
        if (line.startsWith('```')) return null
        
        // Empty line
        if (line.trim() === '') {
          return <div key={lineIdx} className="h-2" />
        }
        
        // Bullet point: - or • or *
        const bulletMatch = line.match(/^(\s*)([-•*])\s+(.*)/)
        if (bulletMatch) {
          return (
            <div key={lineIdx} className="flex gap-2 items-start" style={{ paddingLeft: `${bulletMatch[1].length * 8}px` }}>
              <span className="text-current opacity-50 flex-shrink-0">•</span>
              <span>{parseInline(bulletMatch[3], `${lineIdx}`)}</span>
            </div>
          )
        }
        
        // Numbered list: 1. or 1)
        const numMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)/)
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex gap-2 items-start" style={{ paddingLeft: `${numMatch[1].length * 8}px` }}>
              <span className="text-current opacity-50 flex-shrink-0 font-medium min-w-[1.5rem]">{numMatch[2]}.</span>
              <span>{parseInline(numMatch[3], `${lineIdx}`)}</span>
            </div>
          )
        }
        
        // Regular line
        return (
          <div key={lineIdx}>
            {parseInline(line, `${lineIdx}`)}
          </div>
        )
      })}
    </div>
  )
}

// Dry Run Table renderer - parses markdown table format
function DryRunTable({ tableText }: { tableText: string }) {
  if (!tableText) return null
  
  const normalized = tableText.replace(/\\n/g, '\n')
  const lines = normalized.split('\n').filter(line => line.trim())
  
  // Parse markdown table
  const rows: string[][] = []
  let isHeader = true
  
  for (const line of lines) {
    // Skip separator lines (|---|---|)
    if (line.match(/^\|[\s-|]+\|$/)) {
      isHeader = false
      continue
    }
    
    // Parse cells
    if (line.includes('|')) {
      const cells = line.split('|')
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1) // Remove empty first/last from | splits
      
      if (cells.length > 0) {
        rows.push(cells)
      }
    }
  }
  
  if (rows.length === 0) {
    // Fallback to pre-formatted text if not a valid table
    return (
      <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
        {normalized}
      </pre>
    )
  }
  
  const headerRow = rows[0]
  const dataRows = rows.slice(1)
  
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-100">
          {headerRow.map((cell, i) => (
            <th key={i} className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataRows.map((row, rowIdx) => (
          <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
            {row.map((cell, cellIdx) => (
              <td key={cellIdx} className="border border-slate-300 px-3 py-2 text-slate-700 font-mono text-xs">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SolutionModal({
  isOpen,
  onClose,
  experienceId,
  roundIndex,
  round,
  metadata
}: SolutionModalProps) {
  const [solution, setSolution] = useState<SolutionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['code']))
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  // Check for existing solution when modal opens
  useEffect(() => {
    if (isOpen) {
      checkExistingSolution()
    }
  }, [isOpen, experienceId, roundIndex])

  const checkExistingSolution = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/solution/check?experienceId=${experienceId}&roundIndex=${roundIndex}`
      )
      const data = await res.json()
      if (data.exists && data.solution) {
        setSolution(data.solution)
      }
    } catch (err) {
      // Try static file fallback
      try {
        const staticRes = await fetch(`${basePath}/data/solutions/${experienceId}/round_${roundIndex}.json`)
        if (staticRes.ok) {
          setSolution(await staticRes.json())
        }
      } catch {}
    }
  }

  const generateSolution = async (forceRegenerate = false) => {
    if (forceRegenerate) {
      try {
        await fetch(`${API_BASE}/api/solution/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ experienceId, roundIndex })
        })
        setSolution(null)
      } catch {}
    }

    setLoading(true)
    setError(null)

    try {
      // Only send THIS round's questions - not all questions
      const res = await fetch(`${API_BASE}/api/solution/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experienceId,
          roundIndex,
          round,
          allQuestions: [], // Empty - only use round's own questions
          metadata,
          force: forceRegenerate
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setSolution(data.solution)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error. Is API server running?')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) newExpanded.delete(section)
    else newExpanded.add(section)
    setExpandedSections(newExpanded)
  }

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(formatCode(code))
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {}
  }

  const formatCode = (code: string) => {
    if (!code) return ''
    
    // Step 0: Strip code fences if present
    let result = code
      .replace(/^```\w*\n?/, '')  // Remove opening code fence with optional language
      .replace(/\n?```$/, '')     // Remove closing code fence
    
    // The code in JSON uses literal \n for newlines (stored as \\n in JSON)
    // After JSON parse, these become the two-character sequence backslash-n
    // We need to convert these to actual newlines, BUT preserve \n inside Python strings
    
    // Step 1: Temporarily protect \n inside strings by marking them
    const stringProtector = '___PROTECTED_NEWLINE___'
    
    // Find all string literals and protect their \n
    result = result.replace(/"([^"\\]|\\.)*"/g, (match) => {
      return match.replace(/\\n/g, stringProtector)
    })
    result = result.replace(/'([^'\\]|\\.)*'/g, (match) => {
      return match.replace(/\\n/g, stringProtector)
    })
    
    // Step 2: Now convert remaining \n to actual newlines (these are line breaks)
    result = result.replace(/\\n/g, '\n')
    
    // Step 3: Restore protected \n inside strings
    result = result.replace(new RegExp(stringProtector, 'g'), '\\n')
    
    // Step 4: Handle other escapes
    result = result.replace(/\\t/g, '    ')
    
    return result.trim()
  }


  // Custom style for syntax highlighter (based on oneDark but tweaked)
  const codeStyle = {
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: '#1e1e2e',
      margin: 0,
      padding: '1rem',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      lineHeight: '1.6',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
    }
  }

  if (!isOpen) return null

  const currentSolution = solution?.solutions?.[activeQuestion]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div>
              <h2 className="text-xl font-bold">{round?.name || `Round ${roundIndex + 1}`}</h2>
              <p className="text-white/80 text-sm">{round?.type} · {round?.difficulty}</p>
            </div>
            <div className="flex items-center gap-3">
              {solution && (
                <button
                  onClick={() => generateSolution(true)}
                  className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  🔄 Regenerate
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <span className="text-lg">✕</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!solution && !loading && (
              <div className="flex flex-col items-center justify-center h-96 p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-4xl">🧠</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Generate AI Solution</h3>
                <p className="text-slate-600 text-center mb-6 max-w-md">
                  Get comprehensive solutions with proper OOP Python code, complexity analysis, test cases, and interview tips.
                </p>
                <button
                  onClick={() => generateSolution(false)}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  ⚡ Generate with Claude Opus
                </button>
                {error && <p className="mt-4 text-red-600">{error}</p>}
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-violet-200 rounded-full" />
                  <div className="absolute inset-0 border-4 border-violet-600 rounded-full border-t-transparent animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Claude is thinking...</h3>
                <p className="text-slate-600">Generating comprehensive solution with ultrathink mode</p>
              </div>
            )}

            {solution && currentSolution && (
              <div className="p-6">
                {/* Question Tabs */}
                {solution.solutions.length > 1 && (
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {solution.solutions.map((sol, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveQuestion(idx)}
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all",
                          activeQuestion === idx
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        Q{idx + 1}: {sol.topics?.[0] || 'Question'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Question Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 mb-6 text-white">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {currentSolution.topics?.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-white/20 rounded text-sm">{t}</span>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      {currentSolution.estimated_solve_time && (
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                          ⏱️ {currentSolution.estimated_solve_time}
                        </span>
                      )}
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase",
                        currentSolution.difficulty_rating === 'easy' && "bg-emerald-500",
                        currentSolution.difficulty_rating === 'medium' && "bg-amber-500",
                        currentSolution.difficulty_rating === 'hard' && "bg-red-500"
                      )}>
                        {currentSolution.difficulty_rating}
                      </span>
                    </div>
                  </div>
                  <div className="text-white/90 leading-relaxed whitespace-pre-wrap">
                    {currentSolution.question_text?.replace(/\\n/g, '\n')}
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  {/* Problem Analysis */}
                  <CollapsibleSection
                    title="🔍 Problem Analysis"
                    isExpanded={expandedSections.has('analysis')}
                    onToggle={() => toggleSection('analysis')}
                  >
                    <div className="space-y-4">
                      {/* First Impressions & Pattern */}
                      {(currentSolution.problem_analysis?.first_impressions || currentSolution.problem_analysis?.problem_pattern) && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-4 rounded-xl">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-lg">🎯</span>
                            <span className="font-semibold text-indigo-900">First Impressions</span>
                            {currentSolution.problem_analysis?.problem_pattern && (
                              <span className="ml-auto px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                                {currentSolution.problem_analysis.problem_pattern}
                              </span>
                            )}
                          </div>
                          <MarkdownText text={currentSolution.problem_analysis?.first_impressions} className="text-indigo-800" />
                        </div>
                      )}

                      {/* Approach Evaluation */}
                      <div className={cn(
                        "p-4 rounded-xl",
                        currentSolution.problem_analysis?.candidate_approach_correct
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-amber-50 border border-amber-200"
                      )}>
                        <span className={cn(
                          "font-semibold",
                          currentSolution.problem_analysis?.candidate_approach_correct
                            ? "text-emerald-900"
                            : "text-amber-900"
                        )}>
                          {currentSolution.problem_analysis?.candidate_approach_correct ? "✅ Approach Correct" : "⚠️ Issues Found"}
                        </span>
                        <MarkdownText text={currentSolution.problem_analysis?.approach_evaluation} className="mt-2 text-slate-800" />
                      </div>
                      
                      {/* Issues Found */}
                      {currentSolution.problem_analysis?.issues_found?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                          <div className="font-semibold text-red-900 mb-2">⚠️ Issues in Candidate&apos;s Approach:</div>
                          <ul className="space-y-1">
                            {currentSolution.problem_analysis.issues_found.map((issue: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-red-800">
                                <span className="text-red-500">✗</span>
                                <MarkdownText text={issue} className="" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Key Constraints */}
                      {currentSolution.problem_analysis?.key_constraints?.length > 0 && (
                        <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl">
                          <div className="font-semibold text-slate-900 mb-2">📋 Key Constraints:</div>
                          <ul className="space-y-1">
                            {currentSolution.problem_analysis.key_constraints.map((c: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-slate-700">
                                <span className="text-slate-500">•</span>
                                <MarkdownText text={c} className="" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Clarifying Questions */}
                      {currentSolution.problem_analysis?.clarifying_questions?.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                          <div className="font-semibold text-blue-900 mb-2">💬 Ask These First:</div>
                          <ul className="space-y-1">
                            {currentSolution.problem_analysis.clarifying_questions.map((q: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-blue-800">
                                <span className="text-blue-500">→</span>
                                <MarkdownText text={q} className="" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Edge Cases */}
                      {currentSolution.problem_analysis?.edge_cases?.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                          <div className="font-semibold text-orange-900 mb-2">⚡ Edge Cases to Consider:</div>
                          <div className="flex flex-wrap gap-2">
                            {currentSolution.problem_analysis.edge_cases.map((e: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg text-sm border border-orange-200">
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* Visual Explanation */}
                  {currentSolution.visual_explanation && (
                    <CollapsibleSection
                      title="🎨 Visual Explanation"
                      isExpanded={expandedSections.has('visual')}
                      onToggle={() => toggleSection('visual')}
                    >
                      <div className="space-y-4">
                        {/* Problem Visualization */}
                        {currentSolution.visual_explanation.problem_visualization && (
                          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 overflow-x-auto border border-slate-700">
                            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                              Problem Visualization
                            </div>
                            <pre 
                              className="text-emerald-300 text-[13px] whitespace-pre"
                              style={{ 
                                fontFamily: 'var(--font-mono-box, "JetBrains Mono", monospace)',
                                lineHeight: '1.4',
                                letterSpacing: '0',
                                fontVariantLigatures: 'none',
                                tabSize: 4
                              }}
                            >
                              {cleanCodeBlock(currentSolution.visual_explanation.problem_visualization)}
                            </pre>
                          </div>
                        )}

                        {/* Algorithm Steps */}
                        {currentSolution.visual_explanation?.algorithm_steps && currentSolution.visual_explanation.algorithm_steps.length > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Step-by-Step Walkthrough</div>
                            <div className="space-y-3">
                              {currentSolution.visual_explanation.algorithm_steps?.map((step: any, i: number) => (
                                <div key={i} className="flex gap-3 items-start">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                    {step.step}
                                  </div>
                                  <div className="flex-1">
                                    <MarkdownText text={step.description} className="font-semibold text-blue-900" />
                                    {step.visualization && (
                                      <pre 
                                        className="mt-2 bg-slate-800 text-emerald-300 p-3 rounded-lg text-[12px] overflow-x-auto border border-slate-700"
                                        style={{ 
                                          fontFamily: 'var(--font-mono-box, "JetBrains Mono", monospace)',
                                          lineHeight: '1.4',
                                          whiteSpace: 'pre',
                                          letterSpacing: '0',
                                          fontVariantLigatures: 'none'
                                        }}
                                      >
                                        {cleanCodeBlock(step.visualization)}
                                      </pre>
                                    )}
                                    {step.state && (
                                      <div className="mt-1 text-sm text-blue-700 italic">{step.state}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dry Run Table */}
                        {currentSolution.visual_explanation.dry_run_table && (
                          <div className="bg-white rounded-xl p-4 border border-slate-200 overflow-x-auto">
                            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Dry Run Trace</div>
                            <div className="overflow-x-auto">
                              <DryRunTable tableText={currentSolution.visual_explanation.dry_run_table} />
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Thinking Process */}
                  {currentSolution.solution_strategy?.thinking_process?.length > 0 && (
                    <CollapsibleSection
                      title="🧠 Thinking Process"
                      isExpanded={expandedSections.has('thinking')}
                      onToggle={() => toggleSection('thinking')}
                    >
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                        <div className="space-y-3">
                          {currentSolution.solution_strategy.thinking_process.map((thought: string, i: number) => (
                            <div key={i} className="flex gap-3 items-start">
                              <span className="text-purple-600 text-lg flex-shrink-0">💭</span>
                              <MarkdownText text={thought} className="text-purple-900" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Solution Strategy */}
                  <CollapsibleSection
                    title="🎯 Solution Strategy"
                    isExpanded={expandedSections.has('strategy')}
                    onToggle={() => toggleSection('strategy')}
                  >
                    <div className="space-y-4">
                      {currentSolution.solution_strategy?.initial_intuition && (
                        <div className="bg-violet-50 border border-violet-200 p-4 rounded-xl">
                          <div className="font-semibold text-violet-900">💡 Initial Intuition</div>
                          <MarkdownText text={currentSolution.solution_strategy.initial_intuition} className="text-violet-800 mt-1" />
                        </div>
                      )}
                      
                      {/* Optimization Journey */}
                      {currentSolution.solution_strategy?.optimized?.optimization_journey && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                          <div className="font-semibold text-amber-900 mb-2">🚀 Optimization Journey</div>
                          <MarkdownText text={currentSolution.solution_strategy.optimized.optimization_journey} className="text-amber-800 font-mono text-sm" />
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        {currentSolution.solution_strategy?.brute_force && (
                          <div className="bg-slate-100 p-4 rounded-xl">
                            <div className="font-semibold text-slate-900 mb-2">📦 Brute Force</div>
                            <MarkdownText text={currentSolution.solution_strategy.brute_force.description} className="text-sm text-slate-700 mb-2" />
                            <div className="text-xs text-slate-600">
                              Time: <code className="bg-slate-200 px-1 rounded text-slate-800">{currentSolution.solution_strategy.brute_force.time_complexity}</code> · 
                              Space: <code className="bg-slate-200 px-1 rounded text-slate-800">{currentSolution.solution_strategy.brute_force.space_complexity}</code>
                            </div>
                            {currentSolution.solution_strategy.brute_force.why_not_optimal && (
                              <div className="mt-2 text-xs text-slate-500 italic">
                                <MarkdownText text={currentSolution.solution_strategy.brute_force.why_not_optimal} className="" />
                              </div>
                            )}
                          </div>
                        )}

                        {currentSolution.solution_strategy?.optimized && (
                          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-xl">
                            <div className="font-semibold text-emerald-900 mb-2">✨ Optimized</div>
                            <MarkdownText text={currentSolution.solution_strategy.optimized.description} className="text-sm text-emerald-800 mb-2" />
                            <div className="bg-emerald-100 p-2 rounded text-sm text-emerald-900">
                              <strong>Key Insight:</strong>
                              <MarkdownText text={currentSolution.solution_strategy.optimized.key_insight} className="mt-1" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Data Structures & Algorithms Used */}
                      {(currentSolution.solution_strategy?.optimized?.data_structures_used?.length > 0 || 
                        currentSolution.solution_strategy?.optimized?.algorithms_used?.length > 0) && (
                        <div className="grid md:grid-cols-2 gap-4">
                          {currentSolution.solution_strategy?.optimized?.data_structures_used?.length > 0 && (
                            <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl">
                              <div className="font-semibold text-cyan-900 mb-2">🗃️ Data Structures</div>
                              <ul className="space-y-1">
                                {currentSolution.solution_strategy.optimized.data_structures_used.map((ds: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-cyan-800">
                                    <span className="text-cyan-500">•</span>
                                    <MarkdownText text={ds} className="" />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {currentSolution.solution_strategy?.optimized?.algorithms_used?.length > 0 && (
                            <div className="bg-fuchsia-50 border border-fuchsia-200 p-4 rounded-xl">
                              <div className="font-semibold text-fuchsia-900 mb-2">⚙️ Algorithms</div>
                              <ul className="space-y-1">
                                {currentSolution.solution_strategy.optimized.algorithms_used.map((alg: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-fuchsia-800">
                                    <span className="text-fuchsia-500">•</span>
                                    <MarkdownText text={alg} className="" />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Alternative Approaches */}
                      {currentSolution.solution_strategy?.alternative_approaches?.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                          <div className="font-semibold text-slate-900 mb-3">🔀 Alternative Approaches</div>
                          <div className="space-y-3">
                            {currentSolution.solution_strategy.alternative_approaches.map((alt: any, i: number) => (
                              <div key={i} className="bg-white border border-slate-200 p-3 rounded-lg">
                                <div className="font-semibold text-slate-800 mb-1">{alt.name}</div>
                                <MarkdownText text={alt.description} className="text-sm text-slate-700 mb-2" />
                                {alt.when_to_use && (
                                  <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
                                    <strong>When to use:</strong> {alt.when_to_use}
                                  </div>
                                )}
                                {alt.trade_offs && (
                                  <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block ml-2">
                                    <strong>Trade-offs:</strong> {alt.trade_offs}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trade-offs */}
                      {currentSolution.solution_strategy?.trade_offs && (
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                          <div className="font-semibold text-yellow-900 mb-2">⚖️ Trade-offs</div>
                          <MarkdownText text={currentSolution.solution_strategy.trade_offs} className="text-yellow-800 text-sm" />
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* Python Solution - Always expanded by default */}
                  <CollapsibleSection
                    title="🐍 Python Solution"
                    isExpanded={expandedSections.has('code')}
                    onToggle={() => toggleSection('code')}
                    defaultExpanded
                  >
                    <div className="space-y-4">
                      {/* Design Patterns */}
                      {currentSolution.python_solution?.design_patterns_used?.length > 0 && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-200">
                          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">🎨 Design Patterns Used</div>
                          <div className="flex flex-wrap gap-2">
                            {currentSolution.python_solution.design_patterns_used.map((p: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium rounded-lg shadow-sm">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Copy Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => copyCode(currentSolution.python_solution?.code, 'main')}
                          className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm",
                            copiedCode === 'main' 
                              ? "bg-emerald-500 text-white" 
                              : "bg-slate-800 hover:bg-slate-700 text-white"
                          )}
                        >
                          {copiedCode === 'main' ? '✓ Copied!' : '📋 Copy Code'}
                        </button>
                      </div>
                        
                      {/* Syntax Highlighted Code */}
                      <div className="overflow-hidden rounded-xl border border-slate-700">
                        <SyntaxHighlighter
                          language="python"
                          style={codeStyle}
                          showLineNumbers
                          wrapLines
                          wrapLongLines
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            maxHeight: '500px',
                          }}
                        >
                          {formatCode(currentSolution.python_solution?.code || '')}
                        </SyntaxHighlighter>
                      </div>

                      {/* Classes & Methods */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {currentSolution.python_solution?.classes_defined?.length > 0 && (
                          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-200">
                            <div className="font-semibold text-indigo-900 mb-3">📦 Classes Defined</div>
                            <div className="flex flex-wrap gap-2">
                              {currentSolution.python_solution.classes_defined.map((c: string, i: number) => (
                                <code key={i} className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium text-sm shadow-sm">
                                  {c}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                        {currentSolution.python_solution?.main_methods?.length > 0 && (
                          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 p-4 rounded-xl border border-cyan-200">
                            <div className="font-semibold text-cyan-900 mb-3">⚡ Key Methods</div>
                            <div className="space-y-2">
                              {currentSolution.python_solution.main_methods.map((m: any, i: number) => (
                                <div key={i} className="bg-white/70 rounded-lg p-2 border border-cyan-100">
                                  <code className="text-cyan-700 font-semibold text-sm">{m.name}()</code>
                                  <MarkdownText text={m.purpose} className="text-xs text-cyan-800 mt-1" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Code Walkthrough */}
                      {currentSolution.python_solution?.code_walkthrough?.length > 0 && (
                        <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                          <div className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-slate-700 text-white rounded-lg flex items-center justify-center text-sm">📖</span>
                            <span>Code Walkthrough</span>
                          </div>
                          <div className="space-y-3">
                            {currentSolution.python_solution.code_walkthrough.map((section: any, i: number) => (
                              <div key={i} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                                    {i + 1}
                                  </span>
                                  <code className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded text-xs font-mono font-medium">
                                    Lines {section.lines}
                                  </code>
                                </div>
                                <MarkdownText text={section.explanation} className="text-sm text-slate-700 pl-8" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* Complexity */}
                  <CollapsibleSection
                    title="📊 Complexity Analysis"
                    isExpanded={expandedSections.has('complexity')}
                    onToggle={() => toggleSection('complexity')}
                  >
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-amber-50 p-4 rounded-xl">
                          <div className="text-lg font-bold text-amber-800 mb-2">
                            ⏱️ Time: <code className="bg-amber-200 px-2 rounded">{currentSolution.complexity_analysis?.time?.complexity}</code>
                          </div>
                          <MarkdownText text={currentSolution.complexity_analysis?.time?.breakdown} className="text-sm text-amber-700 mb-3" />
                          
                          {/* Best/Worst/Average Cases */}
                          {(currentSolution.complexity_analysis?.time?.best_case || 
                            currentSolution.complexity_analysis?.time?.worst_case || 
                            currentSolution.complexity_analysis?.time?.average_case) && (
                            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-amber-200">
                              {currentSolution.complexity_analysis?.time?.best_case && (
                                <div className="text-center">
                                  <div className="text-xs text-amber-600 font-semibold">Best</div>
                                  <div className="text-xs text-amber-800 font-mono">{currentSolution.complexity_analysis.time.best_case}</div>
                                </div>
                              )}
                              {currentSolution.complexity_analysis?.time?.average_case && (
                                <div className="text-center">
                                  <div className="text-xs text-amber-600 font-semibold">Average</div>
                                  <div className="text-xs text-amber-800 font-mono">{currentSolution.complexity_analysis.time.average_case}</div>
                                </div>
                              )}
                              {currentSolution.complexity_analysis?.time?.worst_case && (
                                <div className="text-center">
                                  <div className="text-xs text-amber-600 font-semibold">Worst</div>
                                  <div className="text-xs text-amber-800 font-mono">{currentSolution.complexity_analysis.time.worst_case}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl">
                          <div className="text-lg font-bold text-blue-800 mb-2">
                            💾 Space: <code className="bg-blue-200 px-2 rounded">{currentSolution.complexity_analysis?.space?.complexity}</code>
                          </div>
                          <MarkdownText text={currentSolution.complexity_analysis?.space?.breakdown} className="text-sm text-blue-700" />
                          
                          {currentSolution.complexity_analysis?.space?.auxiliary_space && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <div className="text-xs text-blue-600 font-semibold">Auxiliary Space</div>
                              <div className="text-xs text-blue-800">{currentSolution.complexity_analysis.space.auxiliary_space}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Can We Do Better? */}
                      {currentSolution.complexity_analysis?.can_we_do_better && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-xl">
                          <div className="font-semibold text-purple-900 mb-2">🤔 Can We Do Better?</div>
                          <MarkdownText text={currentSolution.complexity_analysis.can_we_do_better} className="text-purple-800 text-sm" />
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>

                  {/* Test Cases */}
                  {currentSolution.test_cases?.length > 0 && (
                    <CollapsibleSection
                      title="🧪 Test Cases"
                      isExpanded={expandedSections.has('tests')}
                      onToggle={() => toggleSection('tests')}
                    >
                      <div className="space-y-4">
                        {currentSolution.test_cases.map((tc: any, i: number) => (
                          <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            {/* Header with name and category */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="font-semibold text-slate-800">{tc.name}</div>
                              {tc.category && (
                                <span className={cn(
                                  "px-2 py-0.5 text-xs font-medium rounded-full",
                                  tc.category === 'Happy Path' && "bg-green-100 text-green-700",
                                  tc.category === 'Edge Case' && "bg-red-100 text-red-700",
                                  tc.category === 'Complex' && "bg-purple-100 text-purple-700",
                                  tc.category === 'Aggregation' && "bg-blue-100 text-blue-700",
                                  tc.category === 'Precision' && "bg-amber-100 text-amber-700",
                                  tc.category === 'Stress' && "bg-pink-100 text-pink-700",
                                  !['Happy Path', 'Edge Case', 'Complex', 'Aggregation', 'Precision', 'Stress'].includes(tc.category) && "bg-slate-200 text-slate-700"
                                )}>
                                  {tc.category}
                                </span>
                              )}
                            </div>
                            
                            {/* Input */}
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Input</div>
                              <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                                {tc.input?.replace(/\\n/g, '\n')}
                              </pre>
                            </div>
                            
                            {/* Expected Output */}
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Expected Output</div>
                              <pre className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                                {tc.expected_output?.replace(/\\n/g, '\n')}
                              </pre>
                            </div>
                            
                            {/* Explanation */}
                            {tc.explanation && (
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-2">
                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Explanation: </span>
                                <MarkdownText text={tc.explanation} className="text-sm text-blue-700 mt-1" />
                              </div>
                            )}
                            
                            {/* Gotcha */}
                            {tc.gotcha && (
                              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">⚠️ Gotcha: </span>
                                <MarkdownText text={tc.gotcha} className="text-sm text-amber-700 mt-1" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Follow-ups */}
                  {currentSolution.follow_up_solutions?.length > 0 && (
                    <CollapsibleSection
                      title="📈 Follow-up Solutions"
                      isExpanded={expandedSections.has('followup')}
                      onToggle={() => toggleSection('followup')}
                    >
                      <div className="space-y-4">
                        {currentSolution.follow_up_solutions.map((fu: any, i: number) => (
                          <div key={i} className="bg-violet-50 border border-violet-200 p-4 rounded-xl">
                            {/* Question */}
                            <div className="font-semibold text-violet-900 mb-3">
                              <span className="text-violet-500">Q:</span> {fu.question?.replace(/\\n/g, '\n')}
                            </div>
                            
                            {/* Understanding */}
                            {fu.understanding && (
                              <div className="bg-violet-100 border border-violet-200 p-3 rounded-lg mb-3">
                                <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">💡 Understanding</div>
                                <MarkdownText text={fu.understanding} className="text-violet-800 text-sm" />
                              </div>
                            )}
                            
                            {/* Approach */}
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">🎯 Approach</div>
                              <MarkdownText text={fu.approach} className="text-violet-800 text-sm" />
                            </div>
                            
                            {/* Code Changes */}
                            {fu.code_changes && (
                              <div className="mb-3">
                                <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">💻 Code Changes</div>
                                <SyntaxHighlighter
                                  language="python"
                                  style={codeStyle}
                                  wrapLines
                                  wrapLongLines
                                  customStyle={{
                                    margin: 0,
                                    borderRadius: '0.5rem',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {formatCode(fu.code_changes)}
                                </SyntaxHighlighter>
                              </div>
                            )}
                            
                            {/* Complexity Change */}
                            {fu.complexity_change && (
                              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">📊 Complexity Change</div>
                                <MarkdownText text={fu.complexity_change} className="text-amber-800 text-sm font-mono" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Interview Tips */}
                  {currentSolution.interview_tips && (
                    <CollapsibleSection
                      title="💡 Interview Tips"
                      isExpanded={expandedSections.has('tips')}
                      onToggle={() => toggleSection('tips')}
                    >
                      <div className="space-y-4">
                        {/* Opening Script - Full Width */}
                        {currentSolution.interview_tips.opening_script && (
                          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 p-4 rounded-xl">
                            <div className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                              <span>🎤</span> Opening Script - Say This First
                            </div>
                            <div className="bg-white border border-indigo-200 p-3 rounded-lg italic text-indigo-800">
                              <MarkdownText text={currentSolution.interview_tips.opening_script} className="" />
                            </div>
                          </div>
                        )}

                        {/* Time Management - Full Width */}
                        {currentSolution.interview_tips.time_management && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-xl">
                            <div className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                              <span>⏰</span> Time Management
                            </div>
                            <MarkdownText text={currentSolution.interview_tips.time_management} className="text-purple-800 text-sm" />
                          </div>
                        )}
                        
                        {/* Grid of tips */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {['communication', 'what_interviewers_look_for', 'common_mistakes', 'if_stuck'].map(key => {
                            const tips = currentSolution.interview_tips?.[key]
                            if (!tips?.length) return null
                            const config: any = {
                              communication: { title: '🗣️ Communication', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                              what_interviewers_look_for: { title: '👀 What They Look For', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                              common_mistakes: { title: '❌ Avoid These', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
                              if_stuck: { title: '🆘 If Stuck', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' }
                            }
                            const c = config[key]
                            return (
                              <div key={key} className={cn("p-4 rounded-xl border", c.bg, c.border)}>
                                <div className="font-semibold mb-2">{c.title}</div>
                                <ul className={cn("space-y-2 text-sm", c.text)}>
                                  {tips.map((t: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="flex-shrink-0">•</span>
                                      <MarkdownText text={t} className="" />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          })}
                        </div>

                        {/* Recovery Phrases */}
                        {currentSolution.interview_tips.recovery_phrases?.length > 0 && (
                          <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl">
                            <div className="font-semibold text-teal-900 mb-2 flex items-center gap-2">
                              <span>🔄</span> Recovery Phrases - Use When You Make Mistakes
                            </div>
                            <div className="grid md:grid-cols-2 gap-2">
                              {currentSolution.interview_tips.recovery_phrases.map((phrase: string, i: number) => (
                                <div key={i} className="bg-white border border-teal-200 p-2 rounded-lg text-sm text-teal-800 italic">
                                  &quot;{phrase?.replace(/\\n/g, '\n')}&quot;
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Pattern Recognition */}
                  {currentSolution.pattern_recognition && (
                    <CollapsibleSection
                      title="🧩 Pattern Recognition"
                      isExpanded={expandedSections.has('pattern')}
                      onToggle={() => toggleSection('pattern')}
                    >
                      <div className="space-y-4">
                        {/* Pattern Name */}
                        {currentSolution.pattern_recognition.pattern_name && (
                          <div className="flex items-center gap-3">
                            <span className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-lg text-lg shadow">
                              {currentSolution.pattern_recognition.pattern_name}
                            </span>
                          </div>
                        )}

                        {/* Pattern Indicators */}
                        {currentSolution.pattern_recognition?.pattern_indicators && currentSolution.pattern_recognition.pattern_indicators.length > 0 && (
                          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                            <div className="font-semibold text-teal-900 mb-2">🔍 How to Recognize This Pattern</div>
                            <ul className="space-y-1">
                              {currentSolution.pattern_recognition.pattern_indicators?.map((indicator: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-teal-800">
                                  <span className="text-teal-500 flex-shrink-0">✓</span>
                                  <MarkdownText text={indicator} className="" />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Pattern Template */}
                        {currentSolution.pattern_recognition.pattern_template && (
                          <div className="bg-slate-900 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                              Generic Template for This Pattern
                            </div>
                            <SyntaxHighlighter
                              language="python"
                              style={codeStyle}
                              wrapLines
                              wrapLongLines
                              customStyle={{
                                margin: 0,
                                borderRadius: 0,
                                fontSize: '0.8rem',
                              }}
                            >
                              {cleanCodeBlock(currentSolution.pattern_recognition.pattern_template)}
                            </SyntaxHighlighter>
                          </div>
                        )}

                        {/* Similar Problems */}
                        {currentSolution.pattern_recognition?.similar_problems && currentSolution.pattern_recognition.similar_problems.length > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <div className="font-semibold text-orange-800 mb-2">🔗 Practice These Similar Problems</div>
                            <div className="space-y-2">
                              {currentSolution.pattern_recognition.similar_problems?.map((p: string, i: number) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="text-orange-500 flex-shrink-0">→</span>
                                  <MarkdownText text={p} className="text-orange-800" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Similar Problems (legacy fallback) */}
                  {!currentSolution.pattern_recognition && currentSolution.similar_problems?.length > 0 && (
                    <div className="bg-orange-50 p-4 rounded-xl">
                      <div className="font-semibold text-orange-800 mb-2">🔗 Practice These</div>
                      <div className="flex flex-wrap gap-2">
                        {currentSolution.similar_problems.map((p: string, i: number) => (
                          <a
                            key={i}
                            href={`https://leetcode.com/problemset/?search=${encodeURIComponent(p)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
                          >
                            {p}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overall Preparation Tips */}
                  {solution.overall_preparation_tips?.length > 0 && (
                    <CollapsibleSection
                      title="📚 Overall Preparation Tips"
                      isExpanded={expandedSections.has('overall')}
                      onToggle={() => toggleSection('overall')}
                    >
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                        <ul className="space-y-3">
                          {solution.overall_preparation_tips.map((tip: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 text-green-800">
                              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </span>
                              <MarkdownText text={tip} className="" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CollapsibleSection>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t text-center text-sm text-slate-500">
            Press <kbd className="px-2 py-0.5 bg-slate-200 rounded">ESC</kbd> to close
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Collapsible Section
function CollapsibleSection({
  title,
  children,
  isExpanded,
  onToggle,
  defaultExpanded = false
}: {
  title: string
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  defaultExpanded?: boolean
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="font-semibold text-slate-800">{title}</span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-slate-500"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="p-4 border-t border-slate-200">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
