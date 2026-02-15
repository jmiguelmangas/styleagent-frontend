import type {
  ApiError,
  CompileResponse,
  HealthResponse,
  Style,
  StyleCreate,
  StyleVersion,
  StyleVersionCreate,
} from './types'

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

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw {
      message: 'Network error. Could not reach backend service.',
      status: 0,
    } satisfies ApiError
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
  return request<HealthResponse>('/health')
}

export async function createStyle(payload: StyleCreate): Promise<Style> {
  return request<Style>('/styles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createStyleVersion(
  styleId: string,
  payload: StyleVersionCreate,
): Promise<StyleVersion> {
  return request<StyleVersion>(`/styles/${styleId}/versions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function compileStyleVersion(
  styleId: string,
  version: string,
): Promise<CompileResponse> {
  return request<CompileResponse>(
    `/styles/${styleId}/versions/${version}/compile?target=captureone`,
    {
      method: 'POST',
    },
  )
}

export async function downloadArtifact(artifactId: string): Promise<Blob> {
  return requestBlob(`/artifacts/${artifactId}`)
}
