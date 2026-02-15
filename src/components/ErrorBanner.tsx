import type { ApiError } from '../api/types'

type ErrorBannerProps = {
  error: ApiError
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <strong>Request failed</strong>
      <p>{error.message}</p>
      <small>Status: {error.status}</small>
    </div>
  )
}
