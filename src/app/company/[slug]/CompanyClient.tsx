"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InterviewTimeline } from "@/components/company/InterviewTimeline"
import { QuestionCard } from "@/components/questions/QuestionCard"
import { QuestionFilter } from "@/components/questions/QuestionFilter"
import { getCompanyBySlug, getCompanyStats } from "@/data/companies"
import { allExperiences, getTitle, getOutcome, formatExperienceDate, getSourceDate } from "@/data/experiences"
import { ExperienceCard } from "@/components/experiences/ExperienceCard"
import { getDifficultyColor } from "@/lib/utils"

const companyLogos: Record<string, string> = {
  rippling: "🌊",
  google: "🔍",
  amazon: "📦",
  microsoft: "🪟",
  meta: "👤",
  apple: "🍎",
}

export function CompanyClient() {
  const params = useParams()
  const slug = params.slug as string
  const company = getCompanyBySlug(slug)

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Company not found
        </h1>
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const stats = getCompanyStats(company)
  const logo = companyLogos[company.company.toLowerCase()] || "🏢"

  // Get real experiences for this company
  const companyExperiences = useMemo(() => {
    return allExperiences.filter(exp => {
      // Match company name (case insensitive)
      const companyName = company.company.toLowerCase()
      const expTitle = getTitle(exp).toLowerCase()
      const expFolder = (exp.folder || '').toLowerCase()
      return expTitle.includes(companyName) || expFolder.includes(companyName)
    }).slice(0, 10) // Show top 10
  }, [company])

  // Get unique topics and difficulties
  const topics = useMemo(() => {
    const topicSet = new Set<string>()
    company.coding_questions.forEach((q) => {
      const mainTopic = q.topic.split("/")[0].trim()
      topicSet.add(mainTopic)
    })
    return Array.from(topicSet)
  }, [company])

  const difficulties = ["easy", "medium", "hard"]

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return company.coding_questions.filter((q) => {
      const matchesTopic = !selectedTopic || q.topic.includes(selectedTopic)
      const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty
      return matchesTopic && matchesDifficulty
    })
  }, [company, selectedTopic, selectedDifficulty])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7"/>
          <path d="M19 12H5"/>
        </svg>
        Back to Dashboard
      </Link>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-indigo-200/50 dark:border-indigo-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-5xl shadow-lg">
                {logo}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {company.company}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {company.interview_process.total_rounds} rounds • {company.interview_process.typical_timeline}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getDifficultyColor(company.overall_difficulty)} variant="outline">
                    {company.overall_difficulty.toUpperCase()} DIFFICULTY
                  </Badge>
                  {company.pass_rate_estimate && (
                    <Badge variant="secondary">
                      Pass Rate: {company.pass_rate_estimate}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.codingQuestions}
                </div>
                <div className="text-xs text-slate-500">Coding</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.systemDesign}
                </div>
                <div className="text-xs text-slate-500">System Design</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {stats.behavioral}
                </div>
                <div className="text-xs text-slate-500">Behavioral</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {company.summary && (
            <p className="mt-6 text-slate-600 dark:text-slate-400 leading-relaxed">
              {company.summary}
            </p>
          )}
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-900">
          <TabsTrigger value="timeline">Interview Timeline</TabsTrigger>
          <TabsTrigger value="questions">Coding Questions</TabsTrigger>
          <TabsTrigger value="experiences">Real Experiences ({companyExperiences.length})</TabsTrigger>
          <TabsTrigger value="tips">Tips & Insights</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <InterviewTimeline rounds={company.rounds} />
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <QuestionFilter
            topics={topics}
            difficulties={difficulties}
            selectedTopic={selectedTopic}
            selectedDifficulty={selectedDifficulty}
            onTopicChange={setSelectedTopic}
            onDifficultyChange={setSelectedDifficulty}
          />

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredQuestions.length} of {company.coding_questions.length} questions
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredQuestions.map((question, index) => (
              <QuestionCard key={index} question={question} index={index} />
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">
                No questions match your filters. Try adjusting them.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Real Experiences Tab */}
        <TabsContent value="experiences" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Real Interview Experiences
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Learn from {companyExperiences.length} real candidate experiences
              </p>
            </div>
            <Link href="/experiences">
              <Button variant="outline" size="sm">
                View All Experiences
              </Button>
            </Link>
          </div>

          {companyExperiences.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyExperiences.map((experience, index) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-slate-500 dark:text-slate-400">
                No real experiences available yet for {company.company}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tips Tab */}
        <TabsContent value="tips" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Success Tips */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <span className="text-xl">✅</span>
                  Success Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {company.success_tips.map((tip, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                    >
                      <span className="text-emerald-500 mt-0.5">•</span>
                      {tip}
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Mistakes to Avoid */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <span className="text-xl">❌</span>
                  Mistakes to Avoid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {company.mistakes_to_avoid.map((mistake, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                    >
                      <span className="text-red-500 mt-0.5">•</span>
                      {mistake}
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Preparation Guide */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">📚</span>
                Preparation Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Focus Topics */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Topics to Focus On
                </h4>
                <div className="flex flex-wrap gap-2">
                  {company.preparation.focus_topics.map((topic, index) => (
                    <Badge
                      key={topic}
                      variant="secondary"
                      className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {index + 1}. {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recommended Problems */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Recommended LeetCode Problems
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {company.preparation.recommended_problems.map((problem) => (
                    <div
                      key={problem}
                      className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm"
                    >
                      <span className="text-indigo-500">📝</span>
                      <span className="text-slate-700 dark:text-slate-300">{problem}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Resources
                </h4>
                <ul className="space-y-2">
                  {company.preparation.resources.map((resource) => (
                    <li
                      key={resource}
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                    >
                      <span className="text-purple-500">📖</span>
                      {resource}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Time Needed */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <div className="font-semibold text-amber-800 dark:text-amber-200">
                      Estimated Preparation Time
                    </div>
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      {company.preparation.time_needed}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Design Questions */}
          {company.system_design_questions.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">🏗️</span>
                  System Design Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.system_design_questions.map((sd, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {sd.question}
                    </h4>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Key Components
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sd.key_components.map((component) => (
                        <Badge key={component} variant="secondary" className="text-xs">
                          {component}
                        </Badge>
                      ))}
                    </div>
                    {sd.scale && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Scale:</span> {sd.scale}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Behavioral Questions */}
          {company.behavioral_questions.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">🗣️</span>
                  Behavioral Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.behavioral_questions.map((bq, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {bq.question}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        What they look for:
                      </span>{" "}
                      {bq.what_they_look_for}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
