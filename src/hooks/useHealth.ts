import { useEffect, useState } from 'react'

import { getHealth } from '../api/client'
import type { ApiError, HealthResponse } from '../api/types'

type HealthState = {
  data: HealthResponse | null
  error: ApiError | null
  loading: boolean
}

export function useHealth(): HealthState {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getHealth()
      .then((health) => {
        if (!mounted) {
          return
        }
        setData(health)
        setError(null)
      })
      .catch((apiError: ApiError) => {
        if (!mounted) {
          return
        }
        setError(apiError)
        setData(null)
      })
      .finally(() => {
        if (!mounted) {
          return
        }
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return { data, error, loading }
}
