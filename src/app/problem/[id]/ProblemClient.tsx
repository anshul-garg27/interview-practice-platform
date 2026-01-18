"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useParams } from "next/navigation"

interface TestCase {
  name: string
  input: string
  expectedOutput: string
  explanation: string
}

interface FollowUp {
  part: number
  title: string
  difficulty: string
  description: string
  newRequirements: string[]
  hints: string[]
  testCases: TestCase[]
}

interface GeneratedProblem {
  title: string
  difficulty: string
  category: string
  estimatedTime: string
  tags: string[]
  problemStatement: {
    description: string
    requirements: string[]
    constraints: string[]
    notes: string[]
  }
  methodSignatures: {
    name: string
    description: string
    parameters: { name: string; type: string; description: string }[]
    returnType: string
    returnDescription: string
  }[]
  examples: {
    title: string
    input: string
    operations: { call: string; result: string; explanation: string }[]
    output: string
    explanation: string
  }[]
  testCases: TestCase[]
  followUpProblems: FollowUp[]
  hints: { level: number; hint: string }[]
  commonMistakes: { mistake: string; why: string; correction: string }[]
  evaluationCriteria: { criteria: string; weight: string; description: string }[]
  relatedProblems: string[]
  interviewTips: string[]
}

interface ProblemData {
  id: string
  originalData: {
    name: string
    category: string
    sources: { id: string; roundName: string }[]
    timesAsked: number
  }
  generatedProblem: GeneratedProblem
  generatedAt: string
}

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  hard: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
}

function Section({ title, icon, children, defaultOpen = true }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CodeBlock({ code, language = "java" }: { code: string; language?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
      <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

// Base path for GitHub Pages deployment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function ProblemClient() {
  const params = useParams()
  const problemId = params.id as string

  const [problem, setProblem] = useState<ProblemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleHints, setVisibleHints] = useState<number[]>([])
  const [activeFollowUp, setActiveFollowUp] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${basePath}/data/generated_problems.json`)
      .then(res => res.json())
      .then(data => {
        const found = data.problems.find((p: ProblemData) => p.id === problemId)
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
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading problem...</p>
        </div>
      </div>
    )
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Problem Not Found</h1>
          <p className="text-gray-500 mb-4">{error || 'The problem you are looking for does not exist.'}</p>
          <Link
            href="/questions"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Questions
          </Link>
        </div>
      </div>
    )
  }

  const p = problem.generatedProblem
  const diff = difficultyColors[p.difficulty] || difficultyColors.medium

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-8 max-w-5xl">
          <Link
            href="/questions"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Question Bank
          </Link>

          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{p.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${diff.bg} ${diff.text} ${diff.border} border capitalize`}>
                  {p.difficulty}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {p.category}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                  {p.estimatedTime}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {problem.originalData.timesAsked}x asked
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {p.tags.map((tag, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
        {/* Problem Statement */}
        <Section
          title="Problem Statement"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        >
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{p.problemStatement.description}</p>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mt-6 mb-3">Requirements</h4>
            <ul className="space-y-2">
              {p.problemStatement.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{req}</span>
                </li>
              ))}
            </ul>

            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mt-6 mb-3">Constraints</h4>
            <div className="bg-gray-50 rounded-xl p-4">
              <ul className="space-y-1.5 font-mono text-sm text-gray-700">
                {p.problemStatement.constraints.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>

            {p.problemStatement.notes.length > 0 && (
              <>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mt-6 mb-3">Important Notes</h4>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <ul className="space-y-2">
                    {p.problemStatement.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-amber-800 text-sm">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Method Signatures */}
        <Section
          title="Method Signatures"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
        >
          <div className="space-y-4">
            {p.methodSignatures.map((method, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="font-mono text-sm mb-2">
                  <span className="text-purple-600">{method.returnType}</span>
                  <span className="text-gray-900 font-semibold ml-2">{method.name}</span>
                  <span className="text-gray-600">(</span>
                  {method.parameters.map((param, j) => (
                    <span key={j}>
                      <span className="text-blue-600">{param.type}</span>
                      <span className="text-gray-900 ml-1">{param.name}</span>
                      {j < method.parameters.length - 1 && <span className="text-gray-600">, </span>}
                    </span>
                  ))}
                  <span className="text-gray-600">)</span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{method.description}</p>
                {method.parameters.length > 0 && (
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Parameters</p>
                    <ul className="space-y-1">
                      {method.parameters.map((param, j) => (
                        <li key={j} className="text-sm">
                          <span className="font-mono text-blue-600">{param.name}</span>
                          <span className="text-gray-400 mx-1">-</span>
                          <span className="text-gray-600">{param.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Returns</p>
                  <p className="text-sm text-gray-600">{method.returnDescription}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Examples */}
        <Section
          title="Examples"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        >
          <div className="space-y-6">
            {p.examples.map((example, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-5">
                <h4 className="font-semibold text-gray-900 mb-4">{example.title}</h4>

                <div className="space-y-2 mb-4">
                  {example.operations.map((op, j) => (
                    <div key={j} className="flex items-start gap-3 font-mono text-sm">
                      <span className="text-gray-400 w-6 text-right">{j + 1}.</span>
                      <span className="text-indigo-600">{op.call}</span>
                      <span className="text-gray-400">//</span>
                      <span className="text-gray-500 font-sans">{op.explanation}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Output</p>
                  <p className="font-mono text-lg text-emerald-600">{example.output}</p>
                  <p className="text-sm text-gray-600 mt-2">{example.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Test Cases */}
        <Section
          title="Test Cases"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        >
          <div className="space-y-3">
            {p.testCases.map((tc, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-900">{tc.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Input</p>
                    <p className="text-sm font-mono text-gray-700 bg-white rounded-lg p-2 border border-gray-200">{tc.input}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Expected Output</p>
                    <p className="text-sm font-mono text-emerald-600 bg-white rounded-lg p-2 border border-gray-200">{tc.expectedOutput}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{tc.explanation}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Follow-up Problems */}
        {p.followUpProblems.length > 0 && (
          <Section
            title={`Follow-up Problems (${p.followUpProblems.length})`}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            defaultOpen={false}
          >
            <div className="space-y-4">
              {p.followUpProblems.map((fu, i) => {
                const fuDiff = difficultyColors[fu.difficulty] || difficultyColors.medium
                const isActive = activeFollowUp === i

                return (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveFollowUp(isActive ? null : i)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 font-bold flex items-center justify-center">
                          P{fu.part}
                        </span>
                        <span className="font-semibold text-gray-900">{fu.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fuDiff.bg} ${fuDiff.text} capitalize`}>
                          {fu.difficulty}
                        </span>
                      </div>
                      <motion.svg
                        animate={{ rotate: isActive ? 180 : 0 }}
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </button>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-200"
                        >
                          <div className="px-5 py-4 space-y-4">
                            <p className="text-gray-700">{fu.description}</p>

                            <div>
                              <h5 className="text-sm font-semibold text-gray-500 mb-2">New Requirements</h5>
                              <ul className="space-y-1.5">
                                {fu.newRequirements.map((req, j) => (
                                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="text-indigo-500 mt-1">+</span>
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {fu.hints.length > 0 && (
                              <div className="bg-blue-50 rounded-lg p-4">
                                <h5 className="text-sm font-semibold text-blue-700 mb-2">Hints</h5>
                                <ul className="space-y-1.5">
                                  {fu.hints.map((hint, j) => (
                                    <li key={j} className="flex items-start gap-2 text-sm text-blue-800">
                                      <span className="text-blue-400">•</span>
                                      {hint}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {fu.testCases.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-500 mb-2">Test Cases</h5>
                                <div className="space-y-2">
                                  {fu.testCases.map((tc, j) => (
                                    <div key={j} className="bg-gray-50 rounded-lg p-3 text-sm">
                                      <p className="font-medium text-gray-900">{tc.name}</p>
                                      <p className="font-mono text-gray-600 mt-1">{tc.input}</p>
                                      <p className="text-emerald-600 mt-1">Output: {tc.expectedOutput}</p>
                                    </div>
                                  ))}
                                </div>
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
          </Section>
        )}

        {/* Hints */}
        <Section
          title="Hints"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
          defaultOpen={false}
        >
          <div className="space-y-3">
            {p.hints.map((hint, i) => {
              const isVisible = visibleHints.includes(hint.level)
              return (
                <div key={i}>
                  {isVisible ? (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                          Level {hint.level}
                        </span>
                      </div>
                      <p className="text-blue-800">{hint.hint}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setVisibleHints([...visibleHints, hint.level])}
                      className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Reveal Hint Level {hint.level}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        {/* Common Mistakes */}
        <Section
          title="Common Mistakes"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {p.commonMistakes.map((cm, i) => (
              <div key={i} className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-red-800">{cm.mistake}</h4>
                    <p className="text-red-700 text-sm mt-1"><strong>Why:</strong> {cm.why}</p>
                    <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-emerald-800 text-sm"><strong>Correction:</strong> {cm.correction}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Evaluation Criteria */}
        <Section
          title="Evaluation Criteria"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          defaultOpen={false}
        >
          <div className="space-y-3">
            {p.evaluationCriteria.map((ec, i) => (
              <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-bold">{ec.weight}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{ec.criteria}</h4>
                  <p className="text-sm text-gray-600">{ec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Interview Tips */}
        <Section
          title="Interview Tips"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          defaultOpen={false}
        >
          <ul className="space-y-3">
            {p.interviewTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 bg-green-50 rounded-xl p-4 border border-green-200">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-green-800">{tip}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Related Problems */}
        {p.relatedProblems.length > 0 && (
          <Section
            title="Related Problems"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
            defaultOpen={false}
          >
            <div className="flex flex-wrap gap-2">
              {p.relatedProblems.map((rp, i) => (
                <span key={i} className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium">
                  {rp}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Source Experiences */}
        <Section
          title={`Source Experiences (${problem.originalData.sources.length})`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          defaultOpen={false}
        >
          <div className="flex flex-wrap gap-2">
            {problem.originalData.sources.map((source, i) => (
              <Link
                key={i}
                href={`/experience/${source.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {source.roundName}
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
