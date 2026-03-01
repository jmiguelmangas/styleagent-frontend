export interface ApiError {
  message: string
  status: number
}

export interface HealthResponse {
  status: 'ok'
}

export interface SafePolicy {
  remove_lens_light_falloff: boolean
  remove_white_balance: boolean
  remove_exposure: boolean
}

export interface StyleCreate {
  name: string
  slug?: string
}

export interface Style {
  style_id: string
  name: string
  slug: string
  created_at: string
}

export interface StyleSpec {
  name: string
  intent: string[]
  captureone: {
    keys: Record<string, string | number>
    notes?: string
  }
  safe?: SafePolicy
}

export interface StyleVersionCreate {
  version: string
  style_spec: StyleSpec
  safe_policy?: SafePolicy
}

export interface StyleVersion {
  style_id: string
  version: string
  style_spec: StyleSpec
  safe_policy: SafePolicy
  created_at: string
}

export interface Artifact {
  artifact_id: string
  style_id: string
  version: string
  target: 'captureone'
  path: string
  sha256: string
  created_at: string
}

export interface CompileResponse {
  artifact_id: string
  sha256: string
  download_url: string
}

export interface GenerateStyleSpecRequest {
  prompt: string
  intent?: string[]
  constraints?: Record<string, unknown>
  target?: 'captureone'
}

export interface GenerateStyleSpecResponse {
  style_spec: StyleSpec
  rationale?: string | null
  warnings: string[]
  provider: string
  model: string
  generation_ms?: number | null
  fallback_used?: boolean
}

export interface AIGenerationRecord {
  generation_id: string
  created_at: string
  client_key: string
  prompt: string
  intent?: string[] | null
  constraints?: Record<string, unknown> | null
  target: 'captureone'
  style_spec: StyleSpec
  rationale?: string | null
  warnings: string[]
  provider: string
  model: string
  generation_ms?: number | null
  fallback_used?: boolean
}

export type RunnerExecutionMode = 'api' | 'host'
export type HostErrorCode =
  | 'APP_NOT_INSTALLED'
  | 'APPLE_EVENT_DENIED'
  | 'OPEN_TIMEOUT'
  | 'IMPORT_DIR_NOT_WRITABLE'
  | 'DOWNLOAD_FAILED'
export type HostLaunchMethod = 'open' | 'cli'

export interface RunnerJobCreate {
  job_type: 'compile_captureone'
  payload: {
    style_id: string
    version: string
    execution_mode?: RunnerExecutionMode
  }
}

export interface RunnerJob {
  job_id: string
  job_type: 'compile_captureone'
  status: 'pending' | 'picked_up' | 'running' | 'succeeded' | 'failed'
  payload: {
    style_id: string
    version: string
    execution_mode?: RunnerExecutionMode
  }
  result: RunnerJobResult | null
  error: string | null
}

export interface HostIntegrationResult {
  mode: 'host'
  launch_method?: HostLaunchMethod
  captureone_app_path?: string
  imported_costyle_path?: string
  error_code?: HostErrorCode
  error_message?: string
  error_details?: Record<string, unknown>
}

export interface RunnerJobResult {
  artifact_id?: string
  sha256?: string
  download_url?: string
  host_integration?: HostIntegrationResult
  [key: string]: unknown
}
