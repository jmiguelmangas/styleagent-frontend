import type {
  Artifact,
  CompileResponse,
  HealthResponse,
  SafePolicy,
  Style,
  StyleSpec,
  StyleVersion,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSafePolicy(value: unknown): value is SafePolicy {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.remove_lens_light_falloff === 'boolean' &&
    typeof value.remove_white_balance === 'boolean' &&
    typeof value.remove_exposure === 'boolean'
  )
}

function isStyleSpec(value: unknown): value is StyleSpec {
  if (!isRecord(value)) {
    return false
  }

  if (typeof value.name !== 'string' || !Array.isArray(value.intent)) {
    return false
  }

  if (!isRecord(value.captureone) || !isRecord(value.captureone.keys)) {
    return false
  }

  if (value.safe !== undefined && !isSafePolicy(value.safe)) {
    return false
  }

  return true
}

function isStyle(value: unknown): value is Style {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.style_id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.created_at === 'string'
  )
}

function isStyleVersion(value: unknown): value is StyleVersion {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.style_id === 'string' &&
    typeof value.version === 'string' &&
    isStyleSpec(value.style_spec) &&
    isSafePolicy(value.safe_policy) &&
    typeof value.created_at === 'string'
  )
}

function isCompileResponse(value: unknown): value is CompileResponse {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.artifact_id === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.download_url === 'string'
  )
}

function isArtifact(value: unknown): value is Artifact {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.artifact_id === 'string' &&
    typeof value.style_id === 'string' &&
    typeof value.version === 'string' &&
    value.target === 'captureone' &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.created_at === 'string'
  )
}

export function parseHealthResponse(value: unknown): HealthResponse {
  if (!isRecord(value) || value.status !== 'ok') {
    throw new Error('Invalid health response payload')
  }
  return { status: 'ok' }
}

export function parseStyle(value: unknown): Style {
  if (!isStyle(value)) {
    throw new Error('Invalid style payload')
  }
  return value
}

export function parseStyleVersion(value: unknown): StyleVersion {
  if (!isStyleVersion(value)) {
    throw new Error('Invalid style version payload')
  }
  return value
}

export function parseCompileResponse(value: unknown): CompileResponse {
  if (!isCompileResponse(value)) {
    throw new Error('Invalid compile response payload')
  }
  return value
}

export function parseArtifacts(value: unknown): Artifact[] {
  if (!Array.isArray(value) || !value.every(isArtifact)) {
    throw new Error('Invalid artifacts payload')
  }
  return value
}
