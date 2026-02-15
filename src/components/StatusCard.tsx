import type { ApiError } from '../api/types'

type StatusCardProps = {
  title: string
  loading: boolean
  status: string | null
  error: ApiError | null
}

export function StatusCard({ title, loading, status, error }: StatusCardProps) {
  return (
    <section className="status-card">
      <h2>{title}</h2>
      {loading && <p className="status-loading">Checking backend health...</p>}
      {!loading && error && (
        <p className="status-error">
          {error.message} ({error.status})
        </p>
      )}
      {!loading && !error && <p className="status-ok">Backend status: {status}</p>}
    </section>
  )
}
