import { useEffect, useMemo, useRef, useState } from 'react'

import DataObjectIcon from '@mui/icons-material/DataObject'
import DnsIcon from '@mui/icons-material/Dns'
import LaptopMacIcon from '@mui/icons-material/LaptopMac'
import ChatIcon from '@mui/icons-material/Chat'
import TuneIcon from '@mui/icons-material/Tune'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Alert,
  Collapse,
  IconButton,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'

import {
  applyAIChatTurn,
  compileStyleVersion,
  createAIChatSession,
  createAIChatTurn,
  createRunnerJob,
  createStyle,
  createStyleVersion,
  downloadArtifact,
  generateStyleSpec,
  getRunnerJob,
  listAIGenerations,
  listStyleArtifacts,
  previewAIPrompt,
  toApiError,
} from '../api/client'
import type {
  AIChatTurn,
  AIGenerationRecord,
  AIPromptPreviewResponse,
  ApiError,
  Artifact,
  CompileResponse,
  GenerateStyleSpecResponse,
  HostErrorCode,
  RunnerExecutionMode,
  SafePolicy,
  Style,
  StyleSpec,
  StyleVersion,
} from '../api/types'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { AIGeneratorPanel } from '../components/AIGeneratorPanel'
import { AIChatPanel } from '../components/AIChatPanel'
import { AIGenerationHistory } from '../components/AIGenerationHistory'
import { ArtifactHistory } from '../components/ArtifactHistory'
import { ErrorBanner } from '../components/ErrorBanner'
import { JsonEditor } from '../components/JsonEditor'
import { StyleSpecControls } from '../components/StyleSpecControls'
import { StatusCard } from '../components/StatusCard'
import { useHealth } from '../hooks/useHealth'

const INITIAL_STYLE_SPEC: StyleSpec = {
  name: 'Nolan Warm',
  intent: ['cinematic', 'warm'],
  captureone: {
    keys: {
      Exposure: 0.3,
      Contrast: 9,
      Saturation: 6,
      Clarity: 8,
      WhiteBalanceTemperature: 5600,
      WhiteBalanceTint: 2,
      Highlights: -8,
      Shadows: 10,
      ColorBalanceRed: 3,
      ColorBalanceGreen: 0,
      ColorBalanceBlue: -2,
      ToneCurve: 'Film Standard',
    },
    notes: 'Balanced skin tones with gentle contrast.',
  },
  safe: {
    remove_lens_light_falloff: true,
    remove_white_balance: true,
    remove_exposure: false,
  },
}

type ActionKey =
  | 'ai_preview'
  | 'ai'
  | 'ai_save'
  | 'ai_chat'
  | 'ai_chat_apply'
  | 'ai_chat_save'
  | 'style'
  | 'version'
  | 'compile'
  | 'compile_download'
  | 'download'
  | 'history'
  | 'job'
type EditorMode = 'guided' | 'advanced'
type AIMode = 'generator' | 'chat'

function mapHostErrorMessage(errorCode: HostErrorCode | undefined, fallback: string): string {
  switch (errorCode) {
    case 'APP_NOT_INSTALLED':
      return 'Capture One is not installed or app path is invalid.'
    case 'APPLE_EVENT_DENIED':
      return 'Capture One automation permission denied. Check macOS Privacy > Automation.'
    case 'OPEN_TIMEOUT':
      return 'Capture One did not open the style file in time.'
    case 'IMPORT_DIR_NOT_WRITABLE':
      return 'Runner cannot write the local Capture One import directory.'
    case 'DOWNLOAD_FAILED':
      return 'Runner could not download the compiled artifact from backend.'
    default:
      return fallback
  }
}

export function HomePage() {
  const { data, error, loading } = useHealth()

  const [styleName, setStyleName] = useState('Nolan Warm')
  const [version, setVersion] = useState('v1')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiIntents, setAiIntents] = useState<string[]>([])
  const [aiRateLimitUntilMs, setAiRateLimitUntilMs] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState<number>(Date.now())
  const [aiMeta, setAiMeta] = useState<
    Pick<
      GenerateStyleSpecResponse,
      'provider' | 'model' | 'rationale' | 'warnings' | 'generation_ms' | 'fallback_used'
    > | null
  >(null)
  const [aiPromptPreview, setAiPromptPreview] = useState<AIPromptPreviewResponse | null>(null)
  const [aiMode, setAiMode] = useState<AIMode>('generator')
  const [styleSpec, setStyleSpec] = useState<StyleSpec>(INITIAL_STYLE_SPEC)
  const [styleSpecJson, setStyleSpecJson] = useState(() => JSON.stringify(INITIAL_STYLE_SPEC, null, 2))
  const [jsonError, setJsonError] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('guided')
  const [executionMode, setExecutionMode] = useState<RunnerExecutionMode>('api')
  const [showAllProperties, setShowAllProperties] = useState(false)

  const [createdStyle, setCreatedStyle] = useState<Style | null>(null)
  const [createdVersion, setCreatedVersion] = useState<StyleVersion | null>(null)
  const [compileResult, setCompileResult] = useState<CompileResponse | null>(null)
  const [runnerJobId, setRunnerJobId] = useState<string | null>(null)
  const [runnerJobStatus, setRunnerJobStatus] = useState<string | null>(null)
  const [hostImportedPath, setHostImportedPath] = useState<string | null>(null)
  const [hostErrorCode, setHostErrorCode] = useState<HostErrorCode | null>(null)
  const [hostErrorDetails, setHostErrorDetails] = useState<Record<string, unknown> | null>(null)
  const [showHostErrorDetails, setShowHostErrorDetails] = useState(false)
  const [isAutoPollingJob, setIsAutoPollingJob] = useState(false)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [aiHistory, setAiHistory] = useState<AIGenerationRecord[]>([])
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false)
  const [aiChatSessionId, setAiChatSessionId] = useState<string | null>(null)
  const [aiChatTurns, setAiChatTurns] = useState<AIChatTurn[]>([])
  const [aiChatMessage, setAiChatMessage] = useState('')
  const [aiChatAutoApply, setAiChatAutoApply] = useState(false)
  const [aiChatApplyingTurnId, setAiChatApplyingTurnId] = useState<string | null>(null)

  const [flowError, setFlowError] = useState<ApiError | null>(null)
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null)
  const jobPollingRef = useRef(false)

  const downloadFilename = useMemo(() => {
    if (!createdStyle || !createdVersion) {
      return 'artifact.costyle'
    }
    return `${createdStyle.slug}-${createdVersion.version}.costyle`
  }, [createdStyle, createdVersion])
  const aiCooldownSeconds =
    aiRateLimitUntilMs && aiRateLimitUntilMs > nowMs
      ? Math.ceil((aiRateLimitUntilMs - nowMs) / 1000)
      : 0

  function isLoading(action: ActionKey): boolean {
    return activeAction === action
  }

  function activateAiCooldown(seconds: number) {
    const durationSeconds = Math.max(1, seconds)
    setAiRateLimitUntilMs(Date.now() + durationSeconds * 1000)
  }

  function updateStyleSpecName(nextName: string) {
    setStyleName(nextName)
    setStyleSpec((prev) => {
      const nextSpec = {
        ...prev,
        name: nextName,
      }
      setStyleSpecJson(JSON.stringify(nextSpec, null, 2))
      return nextSpec
    })
    setJsonError(false)
  }

  function applyGeneratedStyleSpec(nextSpec: StyleSpec) {
    setStyleSpec(nextSpec)
    setStyleSpecJson(JSON.stringify(nextSpec, null, 2))
    setStyleName(nextSpec.name)
    setJsonError(false)
  }

  function parseStyleSpecInput(input: string): StyleSpec {
    const parsed = JSON.parse(input) as unknown
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('StyleSpec must be a JSON object.')
    }

    const candidate = parsed as Partial<StyleSpec>
    if (!candidate.name || !candidate.captureone || !candidate.captureone.keys) {
      throw new Error('StyleSpec requires `name` and `captureone.keys`.')
    }

    return parsed as StyleSpec
  }

  function updateStyleSpecFromGuided(nextSpec: StyleSpec) {
    setStyleSpec(nextSpec)
    setStyleSpecJson(JSON.stringify(nextSpec, null, 2))
    setJsonError(false)
  }

  async function ensureAIChatSession(): Promise<string> {
    if (aiChatSessionId) {
      return aiChatSessionId
    }
    const created = await createAIChatSession({
      title: `Session ${new Date().toLocaleTimeString()}`,
      style_spec: styleSpec,
    })
    setAiChatSessionId(created.session_id)
    return created.session_id
  }

  function resetAIChatSession() {
    setAiChatSessionId(null)
    setAiChatTurns([])
    setAiChatMessage('')
  }

  async function handleSendAIChatTurn() {
    const message = aiChatMessage.trim()
    if (!message) {
      return
    }
    setActiveAction('ai_chat')
    setFlowError(null)
    try {
      const sessionId = await ensureAIChatSession()
      const response = await createAIChatTurn(sessionId, {
        message,
        auto_apply: aiChatAutoApply,
      })
      setAiChatSessionId(response.session.session_id)
      setAiChatTurns((prev) => [...prev, response.turn])
      setAiChatMessage('')
      if (response.turn.applied || aiChatAutoApply) {
        applyGeneratedStyleSpec(response.session.style_spec)
      }
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  async function handleApplyAIChatTurn(turnId: string) {
    if (!aiChatSessionId) {
      setFlowError({ message: 'Start a chat session first.', status: 400 })
      return
    }
    setActiveAction('ai_chat_apply')
    setAiChatApplyingTurnId(turnId)
    setFlowError(null)
    try {
      const response = await applyAIChatTurn(aiChatSessionId, turnId)
      setAiChatTurns((prev) => prev.map((turn) => (turn.turn_id === turnId ? response.turn : turn)))
      applyGeneratedStyleSpec(response.session.style_spec)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setAiChatApplyingTurnId(null)
      setActiveAction(null)
    }
  }

  function handleRevertAIChatTurnLocal(turnId: string) {
    const turn = aiChatTurns.find((entry) => entry.turn_id === turnId)
    if (!turn) {
      return
    }
    const nextSpec: StyleSpec = JSON.parse(JSON.stringify(styleSpec)) as StyleSpec
    for (const change of turn.proposed_changes) {
      nextSpec.captureone.keys[change.key] = change.from_value
    }
    applyGeneratedStyleSpec(nextSpec)
  }

  function handleUsePresetFromHistory(record: AIGenerationRecord) {
    applyGeneratedStyleSpec(record.style_spec)
    setFlowError(null)
  }

  async function handleGenerateStyleSpec() {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setFlowError({ message: 'Prompt is required to generate a style.', status: 400 })
      return
    }

    setActiveAction('ai')
    setFlowError(null)

    try {
      const generated = await generateStyleSpec({
        prompt,
        intent: aiIntents.length > 0 ? aiIntents : undefined,
        target: 'captureone',
      })
      applyGeneratedStyleSpec(generated.style_spec)
      setAiMeta({
        provider: generated.provider,
        model: generated.model,
        rationale: generated.rationale,
        warnings: generated.warnings,
        generation_ms: generated.generation_ms ?? null,
        fallback_used: generated.fallback_used ?? false,
      })
      await refreshAIGenerationHistory()
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.status === 429) {
        activateAiCooldown(60)
        setFlowError({
          status: 429,
          message: 'AI rate limit reached. Wait a moment before generating again.',
        })
      } else {
        setFlowError(apiError)
      }
    } finally {
      setActiveAction(null)
    }
  }

  async function handlePreviewAIPrompt() {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setFlowError({ message: 'Prompt is required to preview the AI request.', status: 400 })
      return
    }

    setActiveAction('ai_preview')
    setFlowError(null)

    try {
      const preview = await previewAIPrompt({
        prompt,
        intent: aiIntents.length > 0 ? aiIntents : undefined,
        target: 'captureone',
      })
      setAiPromptPreview(preview)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  async function handleGenerateAndSaveStyleSpec() {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setFlowError({ message: 'Prompt is required to generate a style.', status: 400 })
      return
    }

    const normalizedVersion = version.trim()
    if (!normalizedVersion) {
      setFlowError({ message: 'Version is required before saving.', status: 400 })
      return
    }

    setActiveAction('ai_save')
    setFlowError(null)
    setCompileResult(null)
    setRunnerJobId(null)
    setRunnerJobStatus(null)
    setHostImportedPath(null)
    setHostErrorCode(null)
    setHostErrorDetails(null)
    setShowHostErrorDetails(false)

    try {
      const generated = await generateStyleSpec({
        prompt,
        intent: aiIntents.length > 0 ? aiIntents : undefined,
        target: 'captureone',
      })

      applyGeneratedStyleSpec(generated.style_spec)
      setAiMeta({
        provider: generated.provider,
        model: generated.model,
        rationale: generated.rationale,
        warnings: generated.warnings,
        generation_ms: generated.generation_ms ?? null,
        fallback_used: generated.fallback_used ?? false,
      })
      await refreshAIGenerationHistory()

      const normalizedStyleName = generated.style_spec.name.trim()
      const style = await createStyle({ name: normalizedStyleName })
      setCreatedStyle(style)

      const created = await createStyleVersion(style.style_id, {
        version: normalizedVersion,
        style_spec: generated.style_spec,
        safe_policy: generated.style_spec.safe,
      })
      setCreatedVersion(created)

      await refreshArtifactHistory(style.style_id)
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.status === 429) {
        activateAiCooldown(60)
        setFlowError({
          status: 429,
          message: 'AI rate limit reached. Wait a moment before generating again.',
        })
      } else if (apiError.status === 409) {
        setFlowError({
          status: 409,
          message:
            'Style or version already exists. Change style name/version and retry Generate + Save.',
        })
      } else {
        setFlowError(apiError)
      }
    } finally {
      setActiveAction(null)
    }
  }

  useEffect(() => {
    if (!aiRateLimitUntilMs) {
      return
    }
    if (aiRateLimitUntilMs <= Date.now()) {
      setAiRateLimitUntilMs(null)
      return
    }

    const timer = window.setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      if (aiRateLimitUntilMs <= now) {
        setAiRateLimitUntilMs(null)
      }
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [aiRateLimitUntilMs])

  function updateStyleSpecJson(nextJson: string) {
    setStyleSpecJson(nextJson)
    try {
      const parsed = parseStyleSpecInput(nextJson)
      setStyleSpec(parsed)
      if (parsed.name !== styleName) {
        setStyleName(parsed.name)
      }
      setJsonError(false)
    } catch {
      setJsonError(true)
    }
  }

  async function refreshAIGenerationHistory() {
    setAiHistoryLoading(true)
    try {
      const list = await listAIGenerations(20)
      setAiHistory(list)
    } catch {
      // Keep the main flow usable even if history endpoint is unavailable.
    } finally {
      setAiHistoryLoading(false)
    }
  }

  async function refreshArtifactHistory(styleId: string) {
    setActiveAction('history')

    try {
      const list = await listStyleArtifacts(styleId)
      setArtifacts(list)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  useEffect(() => {
    void refreshAIGenerationHistory()
  }, [])

  async function handleCreateStyle() {
    const normalizedStyleName = styleName.trim()
    if (!normalizedStyleName) {
      setFlowError({ message: 'Style name is required.', status: 400 })
      return
    }

    setActiveAction('style')
    setFlowError(null)
    setCreatedVersion(null)
    setCompileResult(null)
    setRunnerJobId(null)
    setRunnerJobStatus(null)
    setHostImportedPath(null)
    setHostErrorCode(null)
    setHostErrorDetails(null)
    setShowHostErrorDetails(false)
    setArtifacts([])

    try {
      const style = await createStyle({ name: normalizedStyleName })
      setCreatedStyle(style)
      setCreatedVersion(null)
      setCompileResult(null)
      await refreshArtifactHistory(style.style_id)
    } catch (err) {
      setFlowError(toApiError(err))
      setActiveAction(null)
    }
  }

  async function handleCreateVersion() {
    if (!createdStyle) {
      setFlowError({ message: 'Create a style first.', status: 400 })
      return
    }

    const normalizedVersion = version.trim()
    if (!normalizedVersion) {
      setFlowError({ message: 'Version is required.', status: 400 })
      return
    }

    setActiveAction('version')
    setFlowError(null)
    setCompileResult(null)
    setRunnerJobId(null)
    setRunnerJobStatus(null)
    setHostImportedPath(null)
    setHostErrorCode(null)
    setHostErrorDetails(null)
    setShowHostErrorDetails(false)

    try {
      const payload = editorMode === 'advanced' ? parseStyleSpecInput(styleSpecJson) : styleSpec
      const safePolicy: SafePolicy | undefined = payload.safe
      const created = await createStyleVersion(createdStyle.style_id, {
        version: normalizedVersion,
        style_spec: payload,
        safe_policy: safePolicy,
      })
      setCreatedVersion(created)
    } catch (err) {
      if (err instanceof SyntaxError || err instanceof Error) {
        setJsonError(true)
        setFlowError({ message: err.message || 'Invalid JSON in StyleSpec.', status: 400 })
      } else {
        setFlowError(toApiError(err))
      }
    } finally {
      setActiveAction(null)
    }
  }

  async function handleCompile() {
    if (!createdStyle || !createdVersion) {
      setFlowError({ message: 'Create style and version before compile.', status: 400 })
      return
    }

    setActiveAction('compile')
    setFlowError(null)

    try {
      if (executionMode === 'host') {
        const createdJob = await createRunnerJob({
          job_type: 'compile_captureone',
          payload: {
            style_id: createdStyle.style_id,
            version: createdVersion.version,
            execution_mode: 'host',
          },
        })
        setRunnerJobId(createdJob.job_id)
        setRunnerJobStatus(createdJob.status)
        setHostImportedPath(null)
        setHostErrorCode(null)
        setHostErrorDetails(null)
        setShowHostErrorDetails(false)
        setCompileResult(null)
        return
      }

      const compiled = await compileStyleVersion(createdStyle.style_id, createdVersion.version)
      setCompileResult(compiled)
      setRunnerJobId(null)
      setRunnerJobStatus(null)
      setHostImportedPath(null)
      setHostErrorCode(null)
      setHostErrorDetails(null)
      setShowHostErrorDetails(false)
      await refreshArtifactHistory(createdStyle.style_id)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  async function handleRefreshRunnerJob() {
    if (!runnerJobId) {
      setFlowError({ message: 'No runner job available. Compile in host mode first.', status: 400 })
      return
    }
    if (!createdStyle) {
      return
    }

    setActiveAction('job')
    setFlowError(null)
    try {
      const job = await getRunnerJob(runnerJobId)
      setRunnerJobStatus(job.status)
      if (job.status === 'succeeded' && job.result) {
        const result = job.result
        if (typeof result.artifact_id === 'string' && typeof result.sha256 === 'string' && typeof result.download_url === 'string') {
          setCompileResult({
            artifact_id: result.artifact_id,
            sha256: result.sha256,
            download_url: result.download_url,
          })
          const host = job.result.host_integration
          if (host?.mode === 'host' && host.imported_costyle_path) {
            setHostImportedPath(host.imported_costyle_path)
          }
          await refreshArtifactHistory(createdStyle.style_id)
        }
      }
      if (job.status === 'failed' && job.error) {
        const host = job.result?.host_integration
        if (host?.error_code) {
          setHostErrorCode(host.error_code)
        }
        if (host?.error_details && typeof host.error_details === 'object') {
          setHostErrorDetails(host.error_details)
        }
        setFlowError({ message: mapHostErrorMessage(host?.error_code, job.error), status: 500 })
      }
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  useEffect(() => {
    if (!runnerJobId || !createdStyle) {
      setIsAutoPollingJob(false)
      return
    }
    if (runnerJobStatus === 'succeeded' || runnerJobStatus === 'failed') {
      setIsAutoPollingJob(false)
      return
    }

    let cancelled = false
    const timer = window.setInterval(async () => {
      if (jobPollingRef.current) {
        return
      }
      jobPollingRef.current = true
      try {
        setIsAutoPollingJob(true)
        const job = await getRunnerJob(runnerJobId)
        if (cancelled) {
          return
        }
        setRunnerJobStatus(job.status)
        if (job.status === 'succeeded' && job.result) {
          const result = job.result
          if (
            typeof result.artifact_id === 'string' &&
            typeof result.sha256 === 'string' &&
            typeof result.download_url === 'string'
          ) {
            setCompileResult({
              artifact_id: result.artifact_id,
              sha256: result.sha256,
              download_url: result.download_url,
            })
            const host = job.result.host_integration
            if (host?.mode === 'host' && host.imported_costyle_path) {
              setHostImportedPath(host.imported_costyle_path)
            }
            await refreshArtifactHistory(createdStyle.style_id)
          }
          window.clearInterval(timer)
          setIsAutoPollingJob(false)
        } else if (job.status === 'failed') {
          const host = job.result?.host_integration
          if (host?.error_code) {
            setHostErrorCode(host.error_code)
          }
          if (host?.error_details && typeof host.error_details === 'object') {
            setHostErrorDetails(host.error_details)
          }
          if (job.error) {
            setFlowError({ message: mapHostErrorMessage(host?.error_code, job.error), status: 500 })
          }
          window.clearInterval(timer)
          setIsAutoPollingJob(false)
        }
      } catch (err) {
        if (!cancelled) {
          setFlowError(toApiError(err))
        }
      } finally {
        jobPollingRef.current = false
      }
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      jobPollingRef.current = false
      setIsAutoPollingJob(false)
    }
  }, [createdStyle, runnerJobId, runnerJobStatus])

  async function triggerDownload(artifactId: string, filename: string) {
    setActiveAction('download')
    setFlowError(null)

    try {
      await downloadArtifactToFile(artifactId, filename)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  async function downloadArtifactToFile(artifactId: string, filename: string) {
    const blob = await downloadArtifact(artifactId)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleCompileAndDownload() {
    if (!createdStyle || !createdVersion) {
      setFlowError({ message: 'Create style and version before compile.', status: 400 })
      return
    }
    if (executionMode !== 'api') {
      setFlowError({
        message: 'Compile + Download is available only in Backend compile mode.',
        status: 400,
      })
      return
    }

    setActiveAction('compile_download')
    setFlowError(null)

    try {
      const compiled = await compileStyleVersion(createdStyle.style_id, createdVersion.version)
      setCompileResult(compiled)
      await downloadArtifactToFile(compiled.artifact_id, downloadFilename)
      await refreshArtifactHistory(createdStyle.style_id)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  async function handleDownloadArtifact() {
    if (!compileResult) {
      setFlowError({ message: 'Compile an artifact first.', status: 400 })
      return
    }
    const artifactId = compileResult.artifact_id
    if (!artifactId) {
      setFlowError({ message: 'Compiled artifact id is missing.', status: 500 })
      return
    }
    setActiveAction('download')
    setFlowError(null)

    try {
      await downloadArtifactToFile(artifactId, downloadFilename)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  async function handleSavePresetFromChat() {
    setActiveAction('ai_chat_save')
    setFlowError(null)
    try {
      let nextStyle = createdStyle
      if (!nextStyle) {
        nextStyle = await createStyle({
          name: styleName.trim() || styleSpec.name,
        })
        setCreatedStyle(nextStyle)
      }
      const created = await createStyleVersion(nextStyle.style_id, {
        version,
        style_spec: styleSpec,
        safe_policy: styleSpec.safe,
      })
      setCreatedVersion(created)
      await refreshArtifactHistory(nextStyle.style_id)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <main className="page">
      <header>
        <h1>StyleAgent Frontend</h1>
        <p>MVP core flow with improved UX and artifact history.</p>
      </header>

      <StatusCard
        title="API Health"
        loading={loading}
        status={data?.status ?? null}
        error={error}
      />

      <section className="flow-card">
        <h2>Core Flow</h2>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 1, mb: 1 }}>
          <ToggleButtonGroup
            color="primary"
            value={aiMode}
            exclusive
            onChange={(_, next: AIMode | null) => {
              if (next) {
                setAiMode(next)
              }
            }}
            aria-label="ai-mode"
            size="small"
          >
            <ToggleButton value="generator" aria-label="ai-mode-generator">
              <TuneIcon fontSize="small" sx={{ mr: 0.75 }} />
              AI Generator
            </ToggleButton>
            <ToggleButton value="chat" aria-label="ai-mode-chat">
              <ChatIcon fontSize="small" sx={{ mr: 0.75 }} />
              AI Conversation
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {aiMode === 'generator' ? (
          <AIGeneratorPanel
            prompt={aiPrompt}
            intents={aiIntents}
            onPromptChange={setAiPrompt}
            onIntentsChange={setAiIntents}
            onPreview={() => {
              void handlePreviewAIPrompt()
            }}
            onGenerate={() => {
              void handleGenerateStyleSpec()
            }}
            onGenerateAndSave={() => {
              void handleGenerateAndSaveStyleSpec()
            }}
            previewing={isLoading('ai_preview')}
            generating={isLoading('ai')}
            generatingAndSaving={isLoading('ai_save')}
            cooldownSeconds={aiCooldownSeconds}
            meta={aiMeta}
            preview={aiPromptPreview}
          />
        ) : (
          <AIChatPanel
            sessionId={aiChatSessionId}
            turns={aiChatTurns}
            message={aiChatMessage}
            autoApply={aiChatAutoApply}
            loading={isLoading('ai_chat') || isLoading('ai_chat_apply')}
            applyingTurnId={aiChatApplyingTurnId}
            savingPreset={isLoading('ai_chat_save')}
            onMessageChange={setAiChatMessage}
            onAutoApplyChange={setAiChatAutoApply}
            onSuggestionSelect={setAiChatMessage}
            onSavePreset={() => {
              void handleSavePresetFromChat()
            }}
            onSend={() => {
              void handleSendAIChatTurn()
            }}
            onApplyTurn={(turnId) => {
              void handleApplyAIChatTurn(turnId)
            }}
            onRevertTurn={(turnId) => {
              handleRevertAIChatTurnLocal(turnId)
            }}
            onResetSession={resetAIChatSession}
          />
        )}

        <label htmlFor="style-name">Style name</label>
        <input
          id="style-name"
          value={styleName}
          onChange={(event) => updateStyleSpecName(event.target.value)}
          placeholder="Nolan Warm"
        />

        <label htmlFor="style-version">Version</label>
        <input
          id="style-version"
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          placeholder="v1"
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 1.5 }}>
          <ToggleButtonGroup
            color="primary"
            value={editorMode}
            exclusive
            onChange={(_, next: EditorMode | null) => {
              if (next) {
                setEditorMode(next)
              }
            }}
            aria-label="editor-mode"
            size="small"
          >
            <ToggleButton value="guided" aria-label="guided-mode">
              <TuneIcon fontSize="small" sx={{ mr: 0.75 }} />
              Guided mode
            </ToggleButton>
            <ToggleButton value="advanced" aria-label="advanced-mode">
              <DataObjectIcon fontSize="small" sx={{ mr: 0.75 }} />
              Advanced mode
            </ToggleButton>
          </ToggleButtonGroup>

          {editorMode === 'guided' && (
            <FormControlLabel
              control={
                <Switch
                  checked={showAllProperties}
                  onChange={(event) => setShowAllProperties(event.target.checked)}
                  inputProps={{ 'aria-label': 'show-all-properties' }}
                />
              }
              label={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <VisibilityIcon fontSize="small" />
                  Show all properties
                </span>
              }
            />
          )}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            color="primary"
            value={executionMode}
            exclusive
            onChange={(_, next: RunnerExecutionMode | null) => {
              if (next) {
                setExecutionMode(next)
              }
            }}
            aria-label="execution-mode"
            size="small"
          >
            <ToggleButton value="api" aria-label="execution-api">
              <DnsIcon fontSize="small" sx={{ mr: 0.75 }} />
              Backend compile
            </ToggleButton>
            <ToggleButton value="host" aria-label="execution-host">
              <LaptopMacIcon fontSize="small" sx={{ mr: 0.75 }} />
              Runner host (Capture One)
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {editorMode === 'guided' ? (
          <StyleSpecControls
            spec={styleSpec}
            onChange={updateStyleSpecFromGuided}
            showAllProperties={showAllProperties}
          />
        ) : (
          <>
            {jsonError && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                JSON contains errors. Fix it before creating a version.
              </Alert>
            )}
            <JsonEditor value={styleSpecJson} onChange={updateStyleSpecJson} hasError={jsonError} />
          </>
        )}

        <div className="flow-actions">
          <button type="button" onClick={handleCreateStyle} disabled={activeAction !== null || !styleName.trim()}>
            {isLoading('style') ? 'Creating style...' : '1. Create Style'}
          </button>
          <button type="button" onClick={handleCreateVersion} disabled={activeAction !== null || !createdStyle}>
            {isLoading('version') ? 'Creating version...' : '2. Create Version'}
          </button>
          <button type="button" onClick={handleCompile} disabled={activeAction !== null || !createdVersion}>
            {isLoading('compile')
              ? executionMode === 'host'
                ? 'Queueing runner job...'
                : 'Compiling...'
              : executionMode === 'host'
                ? '3. Queue Host Job'
                : '3. Compile'}
          </button>
          <button
            type="button"
            onClick={handleCompileAndDownload}
            disabled={activeAction !== null || !createdVersion || executionMode !== 'api'}
          >
            {isLoading('compile_download') ? 'Compiling and downloading...' : '3b. Compile + Download'}
          </button>
          <button type="button" onClick={handleRefreshRunnerJob} disabled={activeAction !== null || !runnerJobId}>
            {isLoading('job') ? 'Checking job...' : isAutoPollingJob ? 'Auto-tracking active' : 'Check Runner Job'}
          </button>
          <button type="button" onClick={handleDownloadArtifact} disabled={activeAction !== null || !compileResult}>
            {isLoading('download') ? 'Downloading...' : '4. Download Latest'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!createdStyle) {
                return
              }
              void refreshArtifactHistory(createdStyle.style_id)
            }}
            disabled={activeAction !== null || !createdStyle}
          >
            {isLoading('history') ? 'Refreshing...' : 'Refresh History'}
          </button>
        </div>

        {flowError && <ErrorBanner error={flowError} />}
        {hostErrorCode && (
          <Alert
            severity="error"
            sx={{ mt: 1.5 }}
            action={
              <IconButton
                aria-label="toggle-host-error-details"
                size="small"
                onClick={() => setShowHostErrorDetails((value) => !value)}
              >
                {showHostErrorDetails ? <ExpandLessIcon fontSize="inherit" /> : <ExpandMoreIcon fontSize="inherit" />}
              </IconButton>
            }
          >
            Host execution error: <strong>{hostErrorCode}</strong>
            <Collapse in={showHostErrorDetails} unmountOnExit>
              <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(hostErrorDetails ?? {}, null, 2)}
              </pre>
            </Collapse>
          </Alert>
        )}

        <div className="flow-output">
          <p>
            <strong>Style ID:</strong> {createdStyle?.style_id ?? '-'}
          </p>
          <p>
            <strong>Version:</strong> {createdVersion?.version ?? '-'}
          </p>
          <p>
            <strong>Artifact ID:</strong> {compileResult?.artifact_id ?? '-'}
          </p>
          <p>
            <strong>Runner Job:</strong> {runnerJobId ?? '-'}
          </p>
          <p>
            <strong>Runner Status:</strong> {runnerJobStatus ?? '-'}
          </p>
          <p>
            <strong>Host Imported Path:</strong> {hostImportedPath ?? '-'}
          </p>
          <p>
            <strong>SHA256:</strong> {compileResult?.sha256 ?? '-'}
          </p>
        </div>
      </section>

      <ArtifactHistory
        artifacts={artifacts}
        loading={isLoading('history')}
        onDownload={(artifactId, filename) => {
          void triggerDownload(artifactId, filename)
        }}
      />

      <AIGenerationHistory
        records={aiHistory}
        loading={aiHistoryLoading}
        onRefresh={() => {
          void refreshAIGenerationHistory()
        }}
        onUsePreset={handleUsePresetFromHistory}
      />
    </main>
  )
}
