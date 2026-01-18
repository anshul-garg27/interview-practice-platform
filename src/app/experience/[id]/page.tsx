import { ExperienceClient } from './ExperienceClient'
import { allExperiences } from '@/data/experiences'

export function generateStaticParams() {
  return allExperiences.map((exp) => ({
    id: exp.id || exp.folder,
  }))
}

export default function Page() {
  return <ExperienceClient />
}
