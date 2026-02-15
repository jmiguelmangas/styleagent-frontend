import { StatusCard } from '../components/StatusCard'
import { useHealth } from '../hooks/useHealth'

export function HomePage() {
  const { data, error, loading } = useHealth()

  return (
    <main className="page">
      <header>
        <h1>StyleAgent Frontend</h1>
        <p>Phase 0 scaffold with backend health integration.</p>
      </header>

      <StatusCard
        title="API Health"
        loading={loading}
        status={data?.status ?? null}
        error={error}
      />
    </main>
  )
}
