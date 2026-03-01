import type {
  Artifact,
  CompileResponse,
  GenerateStyleSpecResponse,
  HealthResponse,
  HostErrorCode,
  HostIntegrationResult,
  HostLaunchMethod,
  RunnerJob,
  RunnerJobResult,
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

function isGenerateStyleSpecResponse(value: unknown): value is GenerateStyleSpecResponse {
  if (!isRecord(value)) {
    return false
  }

  if (!isStyleSpec(value.style_spec)) {
    return false
  }

  if (value.rationale !== undefined && value.rationale !== null && typeof value.rationale !== 'string') {
    return false
  }

  if (!Array.isArray(value.warnings) || !value.warnings.every((entry) => typeof entry === 'string')) {
    return false
  }

  return typeof value.provider === 'string' && typeof value.model === 'string'
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

function isHostErrorCode(value: unknown): value is HostErrorCode {
  return (
    value === 'APP_NOT_INSTALLED' ||
    value === 'APPLE_EVENT_DENIED' ||
    value === 'OPEN_TIMEOUT' ||
    value === 'IMPORT_DIR_NOT_WRITABLE' ||
    value === 'DOWNLOAD_FAILED'
  )
}

function isHostLaunchMethod(value: unknown): value is HostLaunchMethod {
  return value === 'open' || value === 'cli'
}

function isHostIntegrationResult(value: unknown): value is HostIntegrationResult {
  if (!isRecord(value) || value.mode !== 'host') {
    return false
  }
  if (value.launch_method !== undefined && !isHostLaunchMethod(value.launch_method)) {
    return false
  }
  if (value.captureone_app_path !== undefined && typeof value.captureone_app_path !== 'string') {
    return false
  }
  if (value.imported_costyle_path !== undefined && typeof value.imported_costyle_path !== 'string') {
    return false
  }
  if (value.error_code !== undefined && !isHostErrorCode(value.error_code)) {
    return false
  }
  if (value.error_message !== undefined && typeof value.error_message !== 'string') {
    return false
  }
  if (value.error_details !== undefined && !isRecord(value.error_details)) {
    return false
  }
  return true
}

function isRunnerJobResult(value: unknown): value is RunnerJobResult {
  if (!isRecord(value)) {
    return false
  }
  if (value.artifact_id !== undefined && typeof value.artifact_id !== 'string') {
    return false
  }
  if (value.sha256 !== undefined && typeof value.sha256 !== 'string') {
    return false
  }
  if (value.download_url !== undefined && typeof value.download_url !== 'string') {
    return false
  }
  if (value.host_integration !== undefined && !isHostIntegrationResult(value.host_integration)) {
    return false
  }
  return true
}

function isRunnerJob(value: unknown): value is RunnerJob {
  if (!isRecord(value)) {
    return false
  }

  const validStatus =
    value.status === 'pending' ||
    value.status === 'picked_up' ||
    value.status === 'running' ||
    value.status === 'succeeded' ||
    value.status === 'failed'
  const validJobType = value.job_type === 'compile_captureone'
  const payload = value.payload
  const validPayload =
    isRecord(payload) &&
    typeof payload.style_id === 'string' &&
    typeof payload.version === 'string' &&
    (payload.execution_mode === undefined || payload.execution_mode === 'api' || payload.execution_mode === 'host')
  const validResult = value.result === null || isRunnerJobResult(value.result)
  const validError = value.error === null || typeof value.error === 'string'

  return (
    typeof value.job_id === 'string' &&
    validJobType &&
    validStatus &&
    validPayload &&
    validResult &&
    validError
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

export function parseGenerateStyleSpecResponse(value: unknown): GenerateStyleSpecResponse {
  if (!isGenerateStyleSpecResponse(value)) {
    throw new Error('Invalid AI generate response payload')
  }
  return value
}

export function parseArtifacts(value: unknown): Artifact[] {
  if (!Array.isArray(value) || !value.every(isArtifact)) {
    throw new Error('Invalid artifacts payload')
  }
  return value
}

export function parseRunnerJob(value: unknown): RunnerJob {
  if (!isRunnerJob(value)) {
    throw new Error('Invalid runner job payload')
  }
  return value
}
