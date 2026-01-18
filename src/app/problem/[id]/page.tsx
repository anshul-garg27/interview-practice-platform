import { ProblemClient } from './ProblemClient'
import generatedProblems from '../../../../public/data/generated_problems.json'

export function generateStaticParams() {
  return generatedProblems.problems.map((problem: { id: string }) => ({
    id: problem.id,
  }))
}

export default function Page() {
  return <ProblemClient />
}
