"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  getExperienceById, 
  getTitle, 
  getOutcome, 
  getPositionLevel,
  getSourceUrl,
  getSourceDate,
  formatExperienceDate 
} from "@/data/experiences"
import { cn } from "@/lib/utils"
import { FormattedText, QuestionText, ApproachText, LeetCodeLink, TipText } from "@/components/ui/FormattedText"
import { SolutionModal } from "@/components/solution/SolutionModal"

type TabType = 'overview' | 'rounds' | 'questions' | 'insights'

export function ExperienceClient() {
  const params = useParams()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [solutionModal, setSolutionModal] = useState<{ isOpen: boolean; roundIndex: number; round: any } | null>(null)
  
  const experience = useMemo(() => getExperienceById(id), [id])

  if (!experience) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-slate-800 mb-3">Experience not found</h1>
          <Link href="/experiences" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to Experiences
          </Link>
        </div>
      </div>
    )
  }

  const title = getTitle(experience)
  const outcome = getOutcome(experience)
  const level = getPositionLevel(experience)
  const sourceUrl = getSourceUrl(experience)

  const metadata = experience.metadata && typeof experience.metadata === 'object' ? experience.metadata : null
  const outcomeData = experience.outcome && typeof experience.outcome === 'object' ? experience.outcome : null
  const interviewProcess = experience.interview_process || null

  const isAccepted = outcome.toLowerCase().includes('accepted') || outcome.toLowerCase().includes('offer')
  const isRejected = outcome.toLowerCase().includes('rejected') || outcome.toLowerCase().includes('reject')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Section with Gradient */}
      <div className={cn(
        "relative overflow-hidden",
        isAccepted && "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600",
        isRejected && "bg-gradient-to-r from-rose-600 via-pink-600 to-red-600",
        !isAccepted && !isRejected && "bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600"
      )}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-8">
          {/* Back Link */}
          <Link 
            href="/experiences" 
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Experiences
          </Link>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {outcome.toUpperCase()}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            {title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
            {level && level !== 'unknown' && (
              <span className="bg-white/20 px-3 py-1 rounded-full font-medium">{level}</span>
            )}
            {metadata?.location && metadata.location !== 'unknown' && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {metadata.location}
              </span>
            )}
            {metadata?.interview_date && metadata.interview_date !== 'unknown' && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {metadata.interview_date}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {experience.views || 0} views
            </span>
            {sourceUrl && (
              <a 
                href={sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Original
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Floating */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-violet-500/25"
          >
            <div className="text-3xl font-bold">{experience.rounds?.length || 0}</div>
            <div className="text-violet-100 text-sm mt-1">Interview Rounds</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/25"
          >
            <div className="text-3xl font-bold">{experience.coding_questions?.length || 0}</div>
            <div className="text-blue-100 text-sm mt-1">Coding Questions</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/25"
          >
            <div className="text-3xl font-bold">{experience.system_design?.length || 0}</div>
            <div className="text-amber-100 text-sm mt-1">System Design</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/25"
          >
            <div className="text-3xl font-bold">{experience.behavioral?.length || 0}</div>
            <div className="text-emerald-100 text-sm mt-1">Behavioral Q&apos;s</div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200">
            {(['overview', 'rounds', 'questions', 'insights'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-6 py-4 text-sm font-semibold transition-all relative",
                  activeTab === tab 
                    ? "text-indigo-600 bg-indigo-50/50" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Summary */}
                {experience.summary && (
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                      <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">📝</span>
                      Summary
                    </h3>
                    <FormattedText text={experience.summary} className="text-slate-600 leading-relaxed" />
                  </div>
                )}

                {/* Rejection Reasons */}
                {outcomeData && outcomeData.rejection_reasons && outcomeData.rejection_reasons.length > 0 && (
                  <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-6 border border-rose-200">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700 uppercase tracking-wide mb-3">
                      <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">⚠️</span>
                      Rejection Reasons
                    </h3>
                    <ul className="space-y-2">
                      {outcomeData.rejection_reasons.map((reason: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-rose-700">
                          <span className="w-6 h-6 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Round Results */}
                {experience.interview_verdicts_summary && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide p-4 bg-slate-50 border-b border-slate-200">
                      <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">📊</span>
                      Round Results
                    </h3>
                    <div className="divide-y divide-slate-100">
                      {Object.entries(experience.interview_verdicts_summary).map(([round, verdict]) => {
                        const isYes = verdict.toLowerCase().includes('yes') && !verdict.toLowerCase().includes('weak')
                        const isNo = verdict.toLowerCase().includes('no')
                        const isWeak = verdict.toLowerCase().includes('weak')
                        const isPositive = verdict.toLowerCase().includes('positive')
                        return (
                          <div key={round} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                            <span className="text-slate-700 font-medium">{round}</span>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-sm font-semibold",
                              (isYes || isPositive) && "bg-emerald-100 text-emerald-700",
                              isNo && "bg-rose-100 text-rose-700",
                              isWeak && "bg-amber-100 text-amber-700",
                              !isYes && !isNo && !isWeak && !isPositive && "bg-slate-100 text-slate-600"
                            )}>
                              {verdict}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Process Info */}
                {interviewProcess && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-blue-700 uppercase tracking-wide mb-4">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">🎯</span>
                      Interview Process
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                      {interviewProcess.total_rounds && (
                        <div>
                          <div className="text-2xl font-bold text-blue-700">{interviewProcess.total_rounds}</div>
                          <div className="text-blue-600 text-sm">Total Rounds</div>
                        </div>
                      )}
                      {interviewProcess.process_duration && interviewProcess.process_duration !== 'unknown' && (
                        <div>
                          <div className="text-2xl font-bold text-blue-700">{String(interviewProcess.process_duration).split(' ')[0]}</div>
                          <div className="text-blue-600 text-sm">Duration</div>
                        </div>
                      )}
                      {interviewProcess.platforms && (
                        <div>
                          <div className="text-sm font-bold text-blue-700">{interviewProcess.platforms}</div>
                          <div className="text-blue-600 text-sm">Platform</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Rounds Tab */}
            {activeTab === 'rounds' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {experience.rounds && experience.rounds.length > 0 ? (
                  experience.rounds.map((round, index) => {
                    const isYes = round.verdict?.toLowerCase().includes('yes') && !round.verdict?.toLowerCase().includes('weak')
                    const isNo = round.verdict?.toLowerCase().includes('no')
                    const isWeak = round.verdict?.toLowerCase().includes('weak')
                    const isPositive = round.verdict?.toLowerCase().includes('positive')
                    
                    const colors = [
                      'from-violet-500 to-purple-600',
                      'from-blue-500 to-cyan-600',
                      'from-emerald-500 to-teal-600',
                      'from-amber-500 to-orange-600',
                      'from-rose-500 to-pink-600',
                    ]
                    const colorClass = colors[index % colors.length]
                    
                    return (
                      <div key={index} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Round Header */}
                        <div className={cn("bg-gradient-to-r p-5 text-white", colorClass)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold">
                                {round.round_number || index + 1}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold">{round.name}</h3>
                                <div className="text-white/80 text-sm">
                                  {round.type}
                                  {round.difficulty && <span> · {round.difficulty}</span>}
                                  {round.duration && round.duration !== 'unknown' && <span> · {round.duration}</span>}
                                </div>
                              </div>
                            </div>
                            {round.verdict && (
                              <span className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-bold",
                                (isYes || isPositive) && "bg-emerald-400 text-emerald-900",
                                isNo && "bg-rose-400 text-rose-900",
                                isWeak && "bg-amber-400 text-amber-900",
                                !isYes && !isNo && !isWeak && !isPositive && "bg-white/30 text-white"
                              )}>
                                {round.verdict}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Round Content */}
                        <div className="p-6 space-y-5">
                          {/* Interviewer Notes */}
                          {round.interviewer_notes && round.interviewer_notes !== 'unknown' && round.interviewer_notes !== 'Not mentioned' && (
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border-l-4 border-indigo-500">
                              <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">💬 Interviewer Notes</div>
                              <div className="text-indigo-800 italic">"<FormattedText text={round.interviewer_notes} />"</div>
                            </div>
                          )}

                          {/* Questions */}
                          {round.questions && round.questions.length > 0 && (
                            <div className="space-y-4">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                Questions ({round.questions.length})
                              </div>
                              {round.questions.map((q, qIndex) => {
                                const question = typeof q === 'string' ? { question: q } : q
                                const qTopic = String((question as Record<string, unknown>).topic || '')
                                const qText = String((question as Record<string, unknown>).question || '')
                                const qApproach = String((question as Record<string, unknown>).approach || '')
                                const qLeetcode = String((question as Record<string, unknown>).leetcode_similar || '')
                                const qPerformance = String((question as Record<string, unknown>).candidate_performance || '')
                                const qFollowUps = (question as Record<string, unknown>).follow_ups as string[] | undefined
                                const qGotchas = (question as Record<string, unknown>).gotchas as string[] | undefined
                                
                                return (
                                  <div key={qIndex} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                    {qTopic && (
                                      <span className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                                        {qTopic}
                                      </span>
                                    )}
                                    <QuestionText text={qText} />
                                    
                                    {(qApproach || qLeetcode || qPerformance || qFollowUps?.length || qGotchas?.length) && (
                                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-sm">
                                        {qApproach && qApproach !== 'unknown' && (
                                          <div className="flex items-start gap-2">
                                            <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs flex-shrink-0">💡</span>
                                            <div><span className="font-semibold text-slate-700">Approach:</span> <ApproachText text={qApproach} className="ml-1" /></div>
                                          </div>
                                        )}
                                        {qLeetcode && (
                                          <div className="flex items-start gap-2">
                                            <span className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs flex-shrink-0">🔗</span>
                                            <div><span className="font-semibold text-slate-700">Similar:</span> <LeetCodeLink text={qLeetcode} className="ml-1" /></div>
                                          </div>
                                        )}
                                        {qPerformance && qPerformance !== 'unknown' && (
                                          <div className="flex items-start gap-2">
                                            <span className="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-xs flex-shrink-0">📊</span>
                                            <div><span className="font-semibold text-slate-700">Result:</span> <span className="text-slate-600 ml-1">{qPerformance}</span></div>
                                          </div>
                                        )}
                                        {qFollowUps && qFollowUps.length > 0 && (
                                          <div className="flex items-start gap-2">
                                            <span className="w-6 h-6 rounded bg-violet-100 text-violet-600 flex items-center justify-center text-xs flex-shrink-0">➡️</span>
                                            <div>
                                              <span className="font-semibold text-slate-700">Follow-ups:</span>
                                              <ul className="mt-1 space-y-1 text-slate-600">
                                                {qFollowUps.map((fu: string, i: number) => <li key={i} className="flex items-start gap-1"><span>•</span> <FormattedText text={fu} /></li>)}
                                              </ul>
                                            </div>
                                          </div>
                                        )}
                                        {qGotchas && qGotchas.length > 0 && (
                                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 mt-2">
                                            <div className="flex items-start gap-2">
                                              <span className="text-amber-500">⚠️</span>
                                              <div>
                                                <span className="font-semibold text-amber-700">Watch out:</span>
                                                <ul className="mt-1 space-y-1 text-amber-700">
                                                  {qGotchas.map((g: string, i: number) => <li key={i} className="flex items-start gap-1"><span>•</span> <FormattedText text={g} /></li>)}
                                                </ul>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Tips */}
                          {round.tips && (
                            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4">
                              <span className="font-bold text-cyan-700">💡 Pro Tip:</span>
                              <TipText text={round.tips} className="ml-2" />
                            </div>
                          )}

                          {/* AI Solution Button */}
                          <div className="pt-4 border-t border-slate-200">
                            <button
                              onClick={() => setSolutionModal({ isOpen: true, roundIndex: index, round })}
                              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/30 transition-all flex items-center justify-center gap-2"
                            >
                              <span className="text-xl">🧠</span>
                              <span>Generate AI Solution</span>
                              <span className="text-white/60 text-sm ml-2">Claude Opus</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-slate-500">No round details available</div>
                )}
              </motion.div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Coding Questions */}
                {experience.coding_questions && experience.coding_questions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">💻</span>
                      Coding Questions ({experience.coding_questions.length})
                    </h3>
                    {experience.coding_questions.map((question, index) => (
                      <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <span className="inline-block bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            {question.topic}
                          </span>
                          {question.difficulty && (
                            <span className={cn(
                              "text-xs font-bold px-3 py-1 rounded-full",
                              question.difficulty === 'easy' && "bg-emerald-100 text-emerald-700",
                              question.difficulty === 'medium' && "bg-amber-100 text-amber-700",
                              question.difficulty === 'hard' && "bg-rose-100 text-rose-700"
                            )}>
                              {question.difficulty.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <QuestionText text={question.question} className="mb-4" />

                        {(question.sample_input || question.sample_output) && (
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {question.sample_input && (
                              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
                                <div className="text-slate-400 text-xs mb-2">INPUT</div>
                                <pre className="text-emerald-400 whitespace-pre-wrap">{String(question.sample_input).replace(/\\n/g, '\n')}</pre>
                              </div>
                            )}
                            {question.sample_output && (
                              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
                                <div className="text-slate-400 text-xs mb-2">OUTPUT</div>
                                <pre className="text-emerald-400 whitespace-pre-wrap">{String(question.sample_output).replace(/\\n/g, '\n')}</pre>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-3 text-sm">
                          {question.approach && (
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs flex-shrink-0">💡</span>
                              <div><span className="font-semibold text-slate-700">Approach:</span> <ApproachText text={question.approach} className="ml-1" /></div>
                            </div>
                          )}
                          {question.leetcode_similar && (
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs flex-shrink-0">🔗</span>
                              <div><span className="font-semibold text-slate-700">Similar:</span> <LeetCodeLink text={question.leetcode_similar} className="ml-1" /></div>
                            </div>
                          )}
                          {question.follow_ups && question.follow_ups.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded bg-violet-100 text-violet-600 flex items-center justify-center text-xs flex-shrink-0">➡️</span>
                              <div>
                                <span className="font-semibold text-slate-700">Follow-ups:</span>
                                <ul className="mt-1 space-y-1 text-slate-600">
                                  {question.follow_ups.map((fu, i) => <li key={i} className="flex items-start gap-1"><span>•</span> <FormattedText text={fu} /></li>)}
                                </ul>
                              </div>
                            </div>
                          )}
                          {question.gotchas && question.gotchas.length > 0 && (
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 mt-2">
                              <div className="flex items-start gap-2">
                                <span className="text-amber-500">⚠️</span>
                                <div>
                                  <span className="font-semibold text-amber-700">Watch out:</span>
                                  <ul className="mt-1 space-y-1 text-amber-700">
                                    {question.gotchas.map((g, i) => <li key={i} className="flex items-start gap-1"><span>•</span> <FormattedText text={g} /></li>)}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* System Design */}
                {experience.system_design && experience.system_design.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                      <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">🏗️</span>
                      System Design ({experience.system_design.length})
                    </h3>
                    {experience.system_design.map((sd, index) => (
                      <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        {sd.round && (
                          <div className="text-xs text-slate-500 mb-3">{sd.round}</div>
                        )}
                        <QuestionText text={sd.question} className="mb-4" />
                        {(sd.components || sd.key_components || sd.key_topics) && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(sd.components || sd.key_components || []).map((comp, i) => (
                              <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{comp}</span>
                            ))}
                            {sd.key_topics?.map((topic, i) => (
                              <span key={`t-${i}`} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{topic}</span>
                            ))}
                          </div>
                        )}
                        {sd.approach && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs flex-shrink-0">💡</span>
                            <div><span className="font-semibold text-slate-700">Approach:</span> <ApproachText text={sd.approach} className="ml-1" /></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Key Learnings */}
                  {experience.key_learnings && experience.key_learnings.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-6 border border-indigo-200">
                      <h3 className="flex items-center gap-2 font-bold text-indigo-800 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-700 flex items-center justify-center">🎓</span>
                        Key Learnings
                      </h3>
                      <ul className="space-y-2 text-sm text-indigo-700">
                        {experience.key_learnings.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-400">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preparation Tips */}
                  {experience.preparation_tips && experience.preparation_tips.length > 0 && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                      <h3 className="flex items-center gap-2 font-bold text-emerald-800 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-700 flex items-center justify-center">✅</span>
                        Preparation Tips
                      </h3>
                      <ul className="space-y-2 text-sm text-emerald-700">
                        {experience.preparation_tips.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500">✓</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mistakes */}
                  {experience.mistakes_made && experience.mistakes_made.length > 0 && (
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border border-rose-200">
                      <h3 className="flex items-center gap-2 font-bold text-rose-800 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-rose-200 text-rose-700 flex items-center justify-center">❌</span>
                        Mistakes to Avoid
                      </h3>
                      <ul className="space-y-2 text-sm text-rose-700">
                        {experience.mistakes_made.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-500">×</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Red Flags */}
                  {experience.red_flags && experience.red_flags.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                      <h3 className="flex items-center gap-2 font-bold text-amber-800 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-amber-200 text-amber-700 flex items-center justify-center">🚩</span>
                        Red Flags
                      </h3>
                      <ul className="space-y-2 text-sm text-amber-700">
                        {experience.red_flags.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500">⚠</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Behavioral Questions */}
                {experience.behavioral && experience.behavioral.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                      <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">💬</span>
                      Behavioral Questions ({experience.behavioral.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {experience.behavioral.map((bq, i) => (
                        <div key={i} className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                          <FormattedText text={bq.question} className="font-medium text-slate-800 text-sm mb-2" />
                          {bq.what_they_look_for && (
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold">Looking for:</span> <FormattedText text={bq.what_they_look_for} className="inline" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Spacing */}
      <div className="h-12" />

      {/* Solution Modal */}
      {solutionModal && (
        <SolutionModal
          isOpen={solutionModal.isOpen}
          onClose={() => setSolutionModal(null)}
          experienceId={id}
          roundIndex={solutionModal.roundIndex}
          round={solutionModal.round}
          metadata={{
            title: title,
            position_level: level,
            company: 'Rippling',
            yoe: metadata?.yoe
          }}
        />
      )}
    </div>
  )
}
