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

export type RunnerExecutionMode = 'api' | 'host'

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
  status: 'pending' | 'picked_up' | 'running' | 'succeeded' | 'failed'
  payload: {
    style_id: string
    version: string
    execution_mode?: RunnerExecutionMode
  }
  result: Record<string, unknown> | null
  error: string | null
}

export interface HostIntegrationResult {
  mode: 'host'
  captureone_app_path: string
  imported_costyle_path: string
}
