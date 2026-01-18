import { PracticeProblemClient } from './PracticeProblemClient'
import problemsData from '../../../../public/data/all_problems.json'

export function generateStaticParams() {
  return problemsData.problems.map((problem: { problem_id: string }) => ({
    id: problem.problem_id,
  }))
}

export default function Page() {
  return <PracticeProblemClient />
}
