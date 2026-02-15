import {
  parseArtifacts,
  parseCompileResponse,
  parseHealthResponse,
  parseStyle,
  parseStyleVersion,
} from './normalize'
import type {
  ApiError,
  Artifact,
  CompileResponse,
  HealthResponse,
  Style,
  StyleCreate,
  StyleVersion,
  StyleVersionCreate,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10000)

function toApiError(error: unknown): ApiError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'status' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    return {
      message: (error as { message: string }).message,
      status: (error as { status: number }).status,
    }
  }

  return {
    message: 'Unknown client error',
    status: 0,
  }
}

function withTimeout(init?: RequestInit): { init: RequestInit; clear: () => void } {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  const signal = init?.signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const hasBody = init?.body !== undefined && init?.body !== null
  const headers = {
    ...(init?.headers ?? {}),
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  }

  return {
    init: {
      ...init,
      signal: controller.signal,
      headers,
    },
    clear: () => window.clearTimeout(timeoutId),
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const { init: enhancedInit, clear } = withTimeout(init)
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, enhancedInit)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw {
        message: `Request timed out after ${API_TIMEOUT_MS}ms.`,
        status: 0,
      } satisfies ApiError
    }

    throw {
      message: 'Network error. Could not reach backend service.',
      status: 0,
    } satisfies ApiError
  } finally {
    clear()
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const payload = (await response.json()) as {
        message?: string
        detail?: string
        error_id?: string
      }

      if (payload.error_id && payload.message) {
        message = `${payload.message} [${payload.error_id}]`
      } else {
        message = payload.message ?? payload.detail ?? message
      }
    } catch {
      // Ignore parsing errors and keep fallback message.
    }

    throw {
      message,
      status: response.status,
    } satisfies ApiError
  }

  return response.json()
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const { init: enhancedInit, clear } = withTimeout(init)
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, enhancedInit)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw {
        message: `Request timed out after ${API_TIMEOUT_MS}ms.`,
        status: 0,
      } satisfies ApiError
    }

    throw {
      message: 'Network error. Could not reach backend service.',
      status: 0,
    } satisfies ApiError
  } finally {
    clear()
  }

  if (!response.ok) {
    throw {
      message: `Request failed with status ${response.status}`,
      status: response.status,
    } satisfies ApiError
  }

  return response.blob()
}

export async function getHealth(): Promise<HealthResponse> {
  return parseHealthResponse(await request('/health'))
}

export async function createStyle(payload: StyleCreate): Promise<Style> {
  return parseStyle(
    await request('/styles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  )
}

export async function createStyleVersion(
  styleId: string,
  payload: StyleVersionCreate,
): Promise<StyleVersion> {
  return parseStyleVersion(
    await request(`/styles/${styleId}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  )
}

export async function compileStyleVersion(
  styleId: string,
  version: string,
): Promise<CompileResponse> {
  return parseCompileResponse(
    await request(`/styles/${styleId}/versions/${version}/compile?target=captureone`, {
      method: 'POST',
    }),
  )
}

export async function listStyleArtifacts(styleId: string): Promise<Artifact[]> {
  return parseArtifacts(await request(`/styles/${styleId}/artifacts`))
}

export async function downloadArtifact(artifactId: string): Promise<Blob> {
  return requestBlob(`/artifacts/${artifactId}`)
}

export { toApiError }
