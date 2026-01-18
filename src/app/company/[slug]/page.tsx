import { CompanyClient } from './CompanyClient'
import { allCompanies } from '@/data/companies'

export function generateStaticParams() {
  return allCompanies.map((company) => ({
    slug: company.company.toLowerCase(),
  }))
}

export default function Page() {
  return <CompanyClient />
}
