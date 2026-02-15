import type { ApiError, HealthResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw {
      message: 'Network error. Could not reach backend service.',
      status: 0,
    } satisfies ApiError
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { message?: string; detail?: string }
      message = payload.message ?? payload.detail ?? message
    } catch {
      // Ignore parsing errors and keep fallback message.
    }

    throw {
      message,
      status: response.status,
    } satisfies ApiError
  }

  return (await response.json()) as T
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health')
}
