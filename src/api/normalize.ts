import type {
  AIHealthResponse,
  AIChatSession,
  AIChatSessionDetail,
  AIChatTurn,
  AIChatTurnResponse,
  AIParameterChange,
  AIPromptPreviewExample,
  AIPromptPreviewResponse,
  AIGenerationRecord,
  AIPlannerOptionsResponse,
  AIPlannerTrace,
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

  if (
    value.generation_ms !== undefined &&
    value.generation_ms !== null &&
    typeof value.generation_ms !== 'number'
  ) {
    return false
  }
  if (value.fallback_used !== undefined && typeof value.fallback_used !== 'boolean') {
    return false
  }
  if (value.planner_trace !== undefined && value.planner_trace !== null && !isAIPlannerTrace(value.planner_trace)) {
    return false
  }

  return typeof value.provider === 'string' && typeof value.model === 'string'
}

function isAIGenerationRecord(value: unknown): value is AIGenerationRecord {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.generation_id !== 'string' ||
    typeof value.created_at !== 'string' ||
    typeof value.client_key !== 'string' ||
    typeof value.prompt !== 'string' ||
    value.target !== 'captureone' ||
    !isStyleSpec(value.style_spec) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every((entry) => typeof entry === 'string') ||
    typeof value.provider !== 'string' ||
    typeof value.model !== 'string'
  ) {
    return false
  }

  if (value.intent !== undefined && value.intent !== null) {
    if (!Array.isArray(value.intent) || !value.intent.every((entry) => typeof entry === 'string')) {
      return false
    }
  }

  if (value.constraints !== undefined && value.constraints !== null && !isRecord(value.constraints)) {
    return false
  }

  if (value.rationale !== undefined && value.rationale !== null && typeof value.rationale !== 'string') {
    return false
  }

  if (
    value.generation_ms !== undefined &&
    value.generation_ms !== null &&
    typeof value.generation_ms !== 'number'
  ) {
    return false
  }
  if (value.fallback_used !== undefined && typeof value.fallback_used !== 'boolean') {
    return false
  }
  if (value.planner_trace !== undefined && value.planner_trace !== null && !isAIPlannerTrace(value.planner_trace)) {
    return false
  }

  return true
}

function isAIPlannerTrace(value: unknown): value is AIPlannerTrace {
  if (!isRecord(value)) {
    return false
  }

  if (
    value.mode !== 'direct_style_spec' &&
    value.mode !== 'family_planner' &&
    value.mode !== 'mock_rule_based'
  ) {
    return false
  }

  if (value.family_id !== undefined && value.family_id !== null && typeof value.family_id !== 'string') {
    return false
  }

  if (!Array.isArray(value.refinement_ids) || !value.refinement_ids.every((entry) => typeof entry === 'string')) {
    return false
  }

  if (
    value.intensity !== undefined &&
    value.intensity !== null &&
    value.intensity !== 'subtle' &&
    value.intensity !== 'balanced' &&
    value.intensity !== 'bold'
  ) {
    return false
  }

  if (value.source !== undefined && value.source !== null && typeof value.source !== 'string') {
    return false
  }

  return true
}

function isAIPlannerOptionsResponse(value: unknown): value is AIPlannerOptionsResponse {
  if (!isRecord(value)) {
    return false
  }
  if (!Array.isArray(value.families) || !value.families.every((entry) => typeof entry === 'string')) {
    return false
  }
  if (!Array.isArray(value.refinements) || !value.refinements.every((entry) => typeof entry === 'string')) {
    return false
  }
  if (
    !Array.isArray(value.intensities) ||
    !value.intensities.every((entry) => entry === 'subtle' || entry === 'balanced' || entry === 'bold')
  ) {
    return false
  }
  return true
}

function isAIPromptPreviewExample(value: unknown): value is AIPromptPreviewExample {
  if (!isRecord(value)) {
    return false
  }
  if (value.source !== undefined && typeof value.source !== 'string') {
    return false
  }
  if (value.prompt !== undefined && typeof value.prompt !== 'string') {
    return false
  }
  if (value.intent !== undefined) {
    if (!Array.isArray(value.intent) || !value.intent.every((entry) => typeof entry === 'string')) {
      return false
    }
  }
  if (value.style_spec !== undefined && !isStyleSpec(value.style_spec)) {
    return false
  }
  return true
}

function isAIPromptPreviewResponse(value: unknown): value is AIPromptPreviewResponse {
  if (!isRecord(value)) {
    return false
  }
  if (
    typeof value.provider !== 'string' ||
    typeof value.model !== 'string' ||
    typeof value.prompt !== 'string' ||
    typeof value.examples_count !== 'number' ||
    !Array.isArray(value.examples)
  ) {
    return false
  }
  return value.examples.every(isAIPromptPreviewExample)
}

function isAIParameterChange(value: unknown): value is AIParameterChange {
  if (!isRecord(value)) {
    return false
  }
  if (
    typeof value.key !== 'string' ||
    typeof value.from_value !== 'number' ||
    typeof value.to_value !== 'number'
  ) {
    return false
  }
  if (value.reason !== undefined && value.reason !== null && typeof value.reason !== 'string') {
    return false
  }
  return true
}

function isAIChatSession(value: unknown): value is AIChatSession {
  if (!isRecord(value)) {
    return false
  }
  if (
    typeof value.session_id !== 'string' ||
    (value.status !== 'active' && value.status !== 'archived') ||
    !isStyleSpec(value.style_spec) ||
    typeof value.created_at !== 'string' ||
    typeof value.updated_at !== 'string'
  ) {
    return false
  }
  if (value.title !== undefined && value.title !== null && typeof value.title !== 'string') {
    return false
  }
  return true
}

function isAIConversationGuidance(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  if (
    !Array.isArray(value.detected_goals) ||
    !value.detected_goals.every((entry) => typeof entry === 'string') ||
    typeof value.reasoning_summary !== 'string' ||
    !Array.isArray(value.suggested_next_messages) ||
    !value.suggested_next_messages.every((entry) => typeof entry === 'string')
  ) {
    return false
  }
  return true
}

function isAIChatTurn(value: unknown): value is AIChatTurn {
  if (!isRecord(value)) {
    return false
  }
  if (
    typeof value.turn_id !== 'string' ||
    typeof value.session_id !== 'string' ||
    typeof value.user_message !== 'string' ||
    typeof value.assistant_message !== 'string' ||
    !Array.isArray(value.proposed_changes) ||
    !value.proposed_changes.every(isAIParameterChange) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every((entry) => typeof entry === 'string') ||
    !isAIConversationGuidance(value.guidance) ||
    typeof value.applied !== 'boolean' ||
    typeof value.created_at !== 'string'
  ) {
    return false
  }
  if (value.planner_trace !== undefined && value.planner_trace !== null && !isAIPlannerTrace(value.planner_trace)) {
    return false
  }
  return true
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

export function parseAIHealthResponse(value: unknown): AIHealthResponse {
  if (
    !isRecord(value) ||
    (value.status !== 'available' && value.status !== 'degraded' && value.status !== 'unavailable') ||
    typeof value.available !== 'boolean' ||
    typeof value.provider !== 'string' ||
    typeof value.model !== 'string'
  ) {
    throw new Error('Invalid AI health response payload')
  }

  if (value.message !== undefined && value.message !== null && typeof value.message !== 'string') {
    throw new Error('Invalid AI health response payload')
  }

  return {
    status: value.status,
    available: value.available,
    provider: value.provider,
    model: value.model,
    message: value.message ?? null,
  }
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

export function parseAIGenerationHistory(value: unknown): AIGenerationRecord[] {
  if (!Array.isArray(value) || !value.every(isAIGenerationRecord)) {
    throw new Error('Invalid AI generation history payload')
  }
  return value
}

export function parseAIPromptPreviewResponse(value: unknown): AIPromptPreviewResponse {
  if (!isAIPromptPreviewResponse(value)) {
    throw new Error('Invalid AI prompt preview payload')
  }
  return value
}

export function parseAIPlannerOptionsResponse(value: unknown): AIPlannerOptionsResponse {
  if (!isAIPlannerOptionsResponse(value)) {
    throw new Error('Invalid AI planner options response')
  }
  return value
}

export function parseAIChatSession(value: unknown): AIChatSession {
  if (!isAIChatSession(value)) {
    throw new Error('Invalid AI chat session payload')
  }
  return value
}

export function parseAIChatSessionDetail(value: unknown): AIChatSessionDetail {
  if (!isRecord(value) || !isAIChatSession(value.session) || !Array.isArray(value.turns)) {
    throw new Error('Invalid AI chat session detail payload')
  }
  if (!value.turns.every(isAIChatTurn)) {
    throw new Error('Invalid AI chat session detail payload')
  }
  return {
    session: value.session,
    turns: value.turns,
  }
}

export function parseAIChatTurnResponse(value: unknown): AIChatTurnResponse {
  if (!isRecord(value) || !isAIChatSession(value.session) || !isAIChatTurn(value.turn)) {
    throw new Error('Invalid AI chat turn payload')
  }
  return {
    session: value.session,
    turn: value.turn,
  }
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
