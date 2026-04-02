import { useEffect, useState } from 'react'

import { getAIHealth } from '../api/client'
import type { AIHealthResponse, ApiError } from '../api/types'

type AIHealthState = {
  data: AIHealthResponse | null
  error: ApiError | null
  loading: boolean
}

export function useAIHealth(): AIHealthState {
  const [data, setData] = useState<AIHealthResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getAIHealth()
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
