import { useEffect, useMemo, useRef, useState } from 'react'

import DataObjectIcon from '@mui/icons-material/DataObject'
import DnsIcon from '@mui/icons-material/Dns'
import LaptopMacIcon from '@mui/icons-material/LaptopMac'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ChatIcon from '@mui/icons-material/Chat'
import HistoryIcon from '@mui/icons-material/History'
import InsightsIcon from '@mui/icons-material/Insights'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import TuneIcon from '@mui/icons-material/Tune'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  FormControlLabel,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
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
  getAIPlannerOptions,
  getRunnerJob,
  getStyleVersion,
  listStyles,
  listAIGenerations,
  listStyleArtifacts,
  previewAIPrompt,
  toApiError,
} from '../api/client'
import type {
  AIChatTurn,
  AIGenerationRecord,
  AIPresetIntensity,
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
import { BrandLogo } from '../components/BrandLogo'
import { ErrorBanner } from '../components/ErrorBanner'
import { JsonEditor } from '../components/JsonEditor'
import { StyleSpecControls } from '../components/StyleSpecControls'
import { useAIHealth } from '../hooks/useAIHealth'
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
  | 'save_preset'
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

type FlowNotice = {
  severity: 'success' | 'info'
  title: string
  message: string
}
type EditorMode = 'guided' | 'advanced'
type AIMode = 'generator' | 'chat'
type JourneyStartMode = 'generator' | 'chat' | 'advanced'
type JourneyStep = 'start' | 'create' | 'refine' | 'export'

const JOURNEY_STEPS: { key: JourneyStep; label: string }[] = [
  { key: 'start', label: 'Start' },
  { key: 'create', label: 'Create look' },
  { key: 'refine', label: 'Refine' },
  { key: 'export', label: 'Save & export' },
]

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

function slugifyStyleName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildPresetSignature(
  styleName: string,
  version: string,
  styleSpec: StyleSpec,
  safePolicy: SafePolicy | undefined,
): string {
  return JSON.stringify({
    styleName,
    version,
    styleSpec,
    safePolicy: safePolicy ?? null,
  })
}

export function HomePage() {
  const { data, error, loading } = useHealth()
  const { data: aiHealth, error: aiHealthError, loading: aiHealthLoading } = useAIHealth()

  const [styleName, setStyleName] = useState('Nolan Warm')
  const [version, setVersion] = useState('v1')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiIntents, setAiIntents] = useState<string[]>([])
  const [aiIntensity, setAiIntensity] = useState<AIPresetIntensity>('balanced')
  const [aiRateLimitUntilMs, setAiRateLimitUntilMs] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState<number>(Date.now())
  const [aiMeta, setAiMeta] = useState<
    Pick<
      GenerateStyleSpecResponse,
      'provider' | 'model' | 'rationale' | 'warnings' | 'generation_ms' | 'fallback_used' | 'planner_trace'
    > | null
  >(null)
  const [aiPromptPreview, setAiPromptPreview] = useState<AIPromptPreviewResponse | null>(null)
  const [aiMode, setAiMode] = useState<AIMode>('generator')
  const [journeyStartMode, setJourneyStartMode] = useState<JourneyStartMode>('generator')
  const [wizardStep, setWizardStep] = useState(0)
  const [styleSpec, setStyleSpec] = useState<StyleSpec>(INITIAL_STYLE_SPEC)
  const [styleSpecJson, setStyleSpecJson] = useState(() => JSON.stringify(INITIAL_STYLE_SPEC, null, 2))
  const [jsonError, setJsonError] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('guided')
  const [executionMode, setExecutionMode] = useState<RunnerExecutionMode>('api')
  const [showAllProperties, setShowAllProperties] = useState(false)

  const [createdStyle, setCreatedStyle] = useState<Style | null>(null)
  const [createdVersion, setCreatedVersion] = useState<StyleVersion | null>(null)
  const [savedPresetSignature, setSavedPresetSignature] = useState<string | null>(null)
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
  const [aiChatFamilyId, setAiChatFamilyId] = useState<string | null>(null)
  const [aiChatIntensity, setAiChatIntensity] = useState<AIPresetIntensity>('balanced')
  const [aiPlannerFamilies, setAiPlannerFamilies] = useState<string[]>([])

  const [flowError, setFlowError] = useState<ApiError | null>(null)
  const [flowNotice, setFlowNotice] = useState<FlowNotice | null>(null)
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
  const hasConversationTurns = aiChatTurns.length > 0
  const hasGeneratedLook = aiMeta !== null || hasConversationTurns
  const hasSavedPreset = createdVersion !== null
  const hasPreparedExport = compileResult !== null || runnerJobId !== null
  const currentPresetSignature = useMemo(() => {
    try {
      const normalizedStyleName = styleName.trim() || styleSpec.name.trim()
      const normalizedVersion = version.trim()
      const payload = editorMode === 'advanced' ? parseStyleSpecInput(styleSpecJson) : styleSpec
      const safePolicy = payload.safe

      return {
        normalizedVersion,
        signature: buildPresetSignature(normalizedStyleName, normalizedVersion, payload, safePolicy),
      }
    } catch {
      return null
    }
  }, [styleName, version, styleSpec, styleSpecJson, editorMode])
  const isCurrentPresetSaved = useMemo(() => {
    if (!createdStyle || !createdVersion || !savedPresetSignature || !currentPresetSignature) {
      return false
    }

    return (
      createdVersion.style_id === createdStyle.style_id &&
      createdVersion.version === currentPresetSignature.normalizedVersion &&
      currentPresetSignature.signature === savedPresetSignature
    )
  }, [createdStyle, createdVersion, savedPresetSignature, currentPresetSignature])
  const canSavePreset = activeAction === null && !isCurrentPresetSaved
  const canExportFile = activeAction === null && createdVersion !== null && executionMode === 'api'
  const canSendToCaptureOne = activeAction === null && createdVersion !== null && executionMode === 'host'
  const exportReadiness = useMemo(() => {
    if (!createdVersion) {
      return {
        severity: 'info' as const,
        title: 'Save the preset first',
        message: 'Create or reuse a saved preset version before exporting or sending it to Capture One.',
      }
    }
    if (!isCurrentPresetSaved) {
      return {
        severity: 'warning' as const,
        title: 'You have unsaved edits',
        message: 'Save again before exporting if you want the latest changes included in the output.',
      }
    }
    if (executionMode === 'host' && runnerJobId && runnerJobStatus && runnerJobStatus !== 'succeeded' && runnerJobStatus !== 'failed') {
      return {
        severity: 'info' as const,
        title: 'Host sync in progress',
        message: 'StyleAgent is tracking the Capture One sync job. You can keep this page open while it completes.',
      }
    }
    if (compileResult) {
      return {
        severity: 'success' as const,
        title: executionMode === 'host' ? 'Latest export is ready' : 'Latest export is ready to download',
        message:
          executionMode === 'host' && hostImportedPath
            ? `The latest artifact was imported at ${hostImportedPath}.`
            : 'The latest compiled artifact is ready. You can download it again from the actions below.',
      }
    }
    return {
      severity: 'success' as const,
      title: 'Preset is ready to export',
      message:
        executionMode === 'host'
          ? 'Send the saved version directly to Capture One.'
          : 'Export a .costyle file from the saved version.',
      }
  }, [createdVersion, isCurrentPresetSaved, executionMode, runnerJobId, runnerJobStatus, compileResult, hostImportedPath])
  const flowCardMinHeight = wizardStep === 0 ? 280 : 560
  const computedJourneyStepIndex = hasPreparedExport
    ? 3
    : hasSavedPreset
      ? 3
      : hasGeneratedLook
        ? 2
        : 1
  const journeyStepIndex = Math.max(wizardStep, computedJourneyStepIndex)

  function isLoading(action: ActionKey): boolean {
    return activeAction === action
  }

  function selectJourneyStart(mode: JourneyStartMode) {
    setJourneyStartMode(mode)
    setFlowError(null)
    setFlowNotice(null)
    setWizardStep(1)
    if (mode === 'chat') {
      setAiMode('chat')
      setEditorMode('guided')
      return
    }
    if (mode === 'advanced') {
      setAiMode('generator')
      setEditorMode('advanced')
      return
    }
    setAiMode('generator')
    setEditorMode('guided')
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

  function getCurrentPresetPayload() {
    const normalizedStyleName = styleName.trim() || styleSpec.name.trim()
    const normalizedVersion = version.trim()
    const payload = editorMode === 'advanced' ? parseStyleSpecInput(styleSpecJson) : styleSpec
    const safePolicy = payload.safe

    return {
      normalizedStyleName,
      normalizedVersion,
      payload,
      safePolicy,
      signature: buildPresetSignature(normalizedStyleName, normalizedVersion, payload, safePolicy),
    }
  }

  function markPresetAsSaved(
    style: Style,
    savedVersion: StyleVersion,
    signature: string,
  ) {
    setCreatedStyle(style)
    setCreatedVersion(savedVersion)
    setSavedPresetSignature(signature)
  }

  async function resolveStyleForSave(normalizedStyleName: string): Promise<Style> {
    const desiredSlug = slugifyStyleName(normalizedStyleName)
    if (createdStyle && createdStyle.slug === desiredSlug) {
      return createdStyle
    }

    const existingStyles = await listStyles()
    const matchingStyle =
      existingStyles.find((style) => style.slug === desiredSlug) ??
      existingStyles.find((style) => style.name.trim().toLowerCase() === normalizedStyleName.toLowerCase())

    if (matchingStyle) {
      setCreatedStyle(matchingStyle)
      return matchingStyle
    }

    const created = await createStyle({ name: normalizedStyleName })
    setCreatedStyle(created)
    return created
  }

  async function ensureCurrentPresetSaved() {
    const { normalizedStyleName, normalizedVersion, payload, safePolicy, signature } = getCurrentPresetPayload()

    if (!normalizedStyleName) {
      throw { message: 'Preset name is required before saving.', status: 400 } satisfies ApiError
    }
    if (!normalizedVersion) {
      throw { message: 'Version is required before saving.', status: 400 } satisfies ApiError
    }

    const style = await resolveStyleForSave(normalizedStyleName)
    if (
      createdVersion &&
      createdVersion.style_id === style.style_id &&
      createdVersion.version === normalizedVersion &&
      savedPresetSignature === signature
    ) {
      return { style, version: createdVersion, reused: true as const }
    }

    try {
      const existingVersion = await getStyleVersion(style.style_id, normalizedVersion)
      const existingSignature = buildPresetSignature(
        normalizedStyleName,
        normalizedVersion,
        existingVersion.style_spec,
        existingVersion.safe_policy,
      )

      if (existingSignature === signature) {
        markPresetAsSaved(style, existingVersion, signature)
        return { style, version: existingVersion, reused: true as const }
      }

      throw {
        status: 409,
        message:
          'This version already exists with different content. Change the version before saving or exporting your latest edits.',
      } satisfies ApiError
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.status !== 404) {
        throw apiError
      }
    }

    const created = await createStyleVersion(style.style_id, {
      version: normalizedVersion,
      style_spec: payload,
      safe_policy: safePolicy,
    })
    markPresetAsSaved(style, created, signature)
    return { style, version: created, reused: false as const }
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
    setAiChatFamilyId(null)
    setAiChatIntensity('balanced')
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
        family_id: aiChatFamilyId,
        intensity: aiChatIntensity,
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

  async function handleQuickAIChatTurn(
    nextMessage: string,
    nextIntensity: AIPresetIntensity = aiChatIntensity,
    nextFamilyId: string | null = aiChatFamilyId,
  ) {
    setAiChatMessage(nextMessage)
    setAiChatIntensity(nextIntensity)
    setAiChatFamilyId(nextFamilyId)

    setActiveAction('ai_chat')
    setFlowError(null)
    try {
      const sessionId = await ensureAIChatSession()
      const response = await createAIChatTurn(sessionId, {
        message: nextMessage,
        auto_apply: aiChatAutoApply,
        family_id: nextFamilyId,
        intensity: nextIntensity,
      })
      setAiChatSessionId(response.session.session_id)
      setAiChatTurns((prev) => [...prev, response.turn])
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
    setWizardStep(2)
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
        constraints: { intensity: aiIntensity },
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
        planner_trace: generated.planner_trace ?? null,
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
        constraints: { intensity: aiIntensity },
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
        constraints: { intensity: aiIntensity },
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
        planner_trace: generated.planner_trace ?? null,
      })
      await refreshAIGenerationHistory()

      const normalizedStyleName = generated.style_spec.name.trim()
      const style = await resolveStyleForSave(normalizedStyleName)
      const generatedSignature = buildPresetSignature(
        normalizedStyleName,
        normalizedVersion,
        generated.style_spec,
        generated.style_spec.safe,
      )

      try {
        const existingVersion = await getStyleVersion(style.style_id, normalizedVersion)
        const existingSignature = buildPresetSignature(
          normalizedStyleName,
          normalizedVersion,
          existingVersion.style_spec,
          existingVersion.safe_policy,
        )

        if (existingSignature === generatedSignature) {
          markPresetAsSaved(style, existingVersion, generatedSignature)
          await refreshArtifactHistory(style.style_id)
          setWizardStep(3)
          return
        }

        throw {
          status: 409,
          message:
            'This preset version already exists with different content. Change the version and retry Generate + Save.',
        } satisfies ApiError
      } catch (err) {
        const apiError = toApiError(err)
        if (apiError.status !== 404) {
          throw apiError
        }
      }

      const created = await createStyleVersion(style.style_id, {
        version: normalizedVersion,
        style_spec: generated.style_spec,
        safe_policy: generated.style_spec.safe,
      })
      markPresetAsSaved(
        style,
        created,
        generatedSignature,
      )

      await refreshArtifactHistory(style.style_id)
      setWizardStep(3)
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

  useEffect(() => {
    let cancelled = false

    async function loadPlannerOptions() {
      try {
        const options = await getAIPlannerOptions()
        if (!cancelled) {
          setAiPlannerFamilies(options.families)
        }
      } catch {
        if (!cancelled) {
          setAiPlannerFamilies([])
        }
      }
    }

    void loadPlannerOptions()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreateStyle() {
    const normalizedStyleName = styleName.trim()
    if (!normalizedStyleName) {
      setFlowError({ message: 'Style name is required.', status: 400 })
      return
    }

    setActiveAction('style')
    setFlowError(null)
    setFlowNotice(null)
    setCreatedVersion(null)
    setSavedPresetSignature(null)
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
      setSavedPresetSignature(null)
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
    setFlowNotice(null)
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
      markPresetAsSaved(
        createdStyle,
        created,
        buildPresetSignature(styleName.trim() || payload.name.trim(), normalizedVersion, payload, safePolicy),
      )
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
    setActiveAction('compile')
    setFlowError(null)
    setFlowNotice(null)

    try {
      const { style, version: savedVersion } = await ensureCurrentPresetSaved()
      if (executionMode === 'host') {
        const createdJob = await createRunnerJob({
          job_type: 'compile_captureone',
          payload: {
            style_id: style.style_id,
            version: savedVersion.version,
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
        setFlowNotice({
          severity: 'info',
          title: 'Capture One sync started',
          message: 'StyleAgent sent the saved version to the host runner. Keep this page open while the sync finishes.',
        })
        return
      }

      const compiled = await compileStyleVersion(style.style_id, savedVersion.version)
      setCompileResult(compiled)
      setRunnerJobId(null)
      setRunnerJobStatus(null)
      setHostImportedPath(null)
      setHostErrorCode(null)
      setHostErrorDetails(null)
      setShowHostErrorDetails(false)
      setFlowNotice({
        severity: 'success',
        title: 'Export ready',
        message: 'The latest .costyle artifact is ready. You can download it again from the actions below.',
      })
      await refreshArtifactHistory(style.style_id)
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
    setFlowNotice(null)
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
            setFlowNotice({
              severity: 'success',
              title: 'Capture One sync completed',
              message: `The latest .costyle was imported into Capture One at ${host.imported_costyle_path}.`,
            })
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
              setFlowNotice({
                severity: 'success',
                title: 'Capture One sync completed',
                message: `The latest .costyle was imported into Capture One at ${host.imported_costyle_path}.`,
              })
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
    setFlowNotice(null)

    try {
      await downloadArtifactToFile(artifactId, filename)
      setFlowNotice({
        severity: 'success',
        title: 'Download started',
        message: 'Your compiled .costyle is being downloaded now.',
      })
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
    if (executionMode !== 'api') {
      setFlowError({
        message: 'Compile + Download is available only in Backend compile mode.',
        status: 400,
      })
      return
    }

    setActiveAction('compile_download')
    setFlowError(null)
    setFlowNotice(null)

    try {
      const { style, version: savedVersion } = await ensureCurrentPresetSaved()
      const compiled = await compileStyleVersion(style.style_id, savedVersion.version)
      setCompileResult(compiled)
      await downloadArtifactToFile(compiled.artifact_id, downloadFilename)
      setFlowNotice({
        severity: 'success',
        title: 'Export started',
        message: 'The latest saved preset was compiled and the .costyle download has started.',
      })
      await refreshArtifactHistory(style.style_id)
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
    setFlowNotice(null)

    try {
      await downloadArtifactToFile(artifactId, downloadFilename)
    } catch (err) {
      setFlowError(toApiError(err))
    } finally {
      setActiveAction(null)
    }
  }

  async function handleSaveCurrentPreset() {
    setActiveAction('save_preset')
    setFlowError(null)
    setFlowNotice(null)

    try {
      const { style, version: savedVersion } = await ensureCurrentPresetSaved()
      await refreshArtifactHistory(style.style_id)
      setFlowNotice({
        severity: 'success',
        title: 'Preset saved',
        message: `${style.name} ${savedVersion.version} is ready for export or Capture One sync.`,
      })
      setWizardStep(3)
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.status === 409) {
        setFlowError({
          status: 409,
          message: 'This preset version already exists. Change the preset name or version and try again.',
        })
      } else if (err instanceof SyntaxError || err instanceof Error) {
        setJsonError(true)
        setFlowError({ message: err.message || 'Invalid JSON in StyleSpec.', status: 400 })
      } else {
        setFlowError(apiError)
      }
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <main className="page">
      <Stack spacing={2.5}>
        <Box
          sx={{
            borderRadius: 4,
            p: { xs: 2.5, md: 3.5 },
            background:
              'linear-gradient(135deg, rgba(17,24,39,0.96) 0%, rgba(28,47,78,0.94) 55%, rgba(106,61,43,0.88) 100%)',
            color: '#f7f9fc',
            boxShadow: '0 24px 70px rgba(13, 25, 44, 0.22)',
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Box sx={{ mb: 1.1, maxWidth: { xs: 220, md: 320 } }}>
                  <BrandLogo width="100%" height="auto" />
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                  Create a look step by step
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, maxWidth: 720, color: 'rgba(247,249,252,0.82)' }}>
                  Start with a description, refine the look with guided controls, then save and export to Capture One.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip
                  label={loading ? 'Checking backend' : error ? 'Backend offline' : `Backend ${data?.status ?? 'ok'}`}
                  color={error ? 'error' : 'success'}
                  variant="filled"
                />
                <Tooltip
                  arrow
                  placement="top"
                  title={
                    aiHealth
                      ? `${aiHealth.provider} / ${aiHealth.model}${
                          aiHealth.message ? `\n${aiHealth.message}` : ''
                        }`
                      : aiMeta
                        ? `${aiMeta.provider} / ${aiMeta.model}`
                        : 'AI model information unavailable.'
                  }
                >
                  <Chip
                    label={
                      aiHealthLoading
                        ? 'Checking AI'
                        : aiHealthError
                          ? 'AI unavailable'
                          : aiHealth?.status === 'available'
                            ? 'AI ready'
                            : aiHealth?.status === 'degraded'
                              ? 'AI degraded'
                              : 'AI unavailable'
                    }
                    color={
                      aiHealthLoading
                        ? 'default'
                        : aiHealthError || aiHealth?.status === 'unavailable'
                          ? 'error'
                          : aiHealth?.status === 'degraded'
                            ? 'warning'
                            : 'success'
                    }
                    variant="filled"
                    sx={{ cursor: 'help' }}
                  />
                </Tooltip>
              </Stack>
            </Stack>

            <Stepper activeStep={journeyStepIndex} alternativeLabel sx={{ '& .MuiStepLabel-label': { color: '#f7f9fc' } }}>
              {JOURNEY_STEPS.map((step) => (
                <Step key={step.key}>
                  <StepLabel>{step.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Stack>
        </Box>

        <section className="flow-card" style={{ minHeight: flowCardMinHeight }}>
          {wizardStep === 0 ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Choose how you want to start
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                  Pick one path. The app will guide you one step at a time instead of showing every tool at once.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                }}
              >
                {[
                  {
                    mode: 'generator' as const,
                    title: 'Describe the look',
                    copy: 'Start with one prompt and get a first draft fast.',
                    icon: <AutoFixHighIcon />,
                  },
                  {
                    mode: 'chat' as const,
                    title: 'Start a conversation',
                    copy: 'Refine the look with guided back-and-forth.',
                    icon: <ChatIcon />,
                  },
                  {
                    mode: 'advanced' as const,
                    title: 'Open advanced editor',
                    copy: 'Jump directly into raw style editing and precision control.',
                    icon: <DataObjectIcon />,
                  },
                ].map((option) => {
                  const selected = journeyStartMode === option.mode
                  return (
                    <Card
                      key={option.mode}
                      sx={{
                        borderRadius: 3,
                        border: selected ? '1px solid rgba(99, 162, 255, 0.9)' : '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: selected ? 'rgba(38, 53, 88, 0.96)' : 'rgba(18, 23, 34, 0.9)',
                        color: 'text.primary',
                        boxShadow: selected ? '0 0 0 1px rgba(99, 162, 255, 0.35)' : 'none',
                      }}
                    >
                      <CardActionArea onClick={() => selectJourneyStart(option.mode)} sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack spacing={1.25}>
                            <Box sx={{ color: selected ? '#8bb8ff' : '#a6b0c3' }}>{option.icon}</Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {option.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {option.copy}
                            </Typography>
                            {selected ? (
                              <Chip
                                size="small"
                                color="primary"
                                label="Selected"
                                sx={{ alignSelf: 'flex-start' }}
                              />
                            ) : null}
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  )
                })}
              </Box>
            </Stack>
          ) : null}

          {wizardStep === 1 ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Create your first look
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                  Start with the creative direction. You can refine tone, color and export settings in the next screens.
                </Typography>
              </Box>

              {journeyStartMode !== 'advanced' ? (
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
              ) : null}

              {journeyStartMode === 'advanced' || aiMode === 'generator' ? (
                <AIGeneratorPanel
                  prompt={aiPrompt}
                  intents={aiIntents}
                  intensity={aiIntensity}
                  onPromptChange={setAiPrompt}
                  onIntentsChange={setAiIntents}
                  onIntensityChange={setAiIntensity}
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
                  familyId={aiChatFamilyId}
                  intensity={aiChatIntensity}
                  availableFamilies={aiPlannerFamilies}
                  loading={isLoading('ai_chat') || isLoading('ai_chat_apply')}
                  applyingTurnId={aiChatApplyingTurnId}
                  savingPreset={isLoading('save_preset')}
                  onMessageChange={setAiChatMessage}
                  onAutoApplyChange={setAiChatAutoApply}
                  onFamilyChange={setAiChatFamilyId}
                  onIntensityChange={setAiChatIntensity}
                  onSuggestionSelect={setAiChatMessage}
                  onQuickSend={(nextMessage, nextIntensity, nextFamilyId) => {
                    void handleQuickAIChatTurn(nextMessage, nextIntensity, nextFamilyId ?? aiChatFamilyId)
                  }}
                  onSavePreset={() => {
                    void handleSaveCurrentPreset()
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
            </Stack>
          ) : null}

          {wizardStep === 2 ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Refine the look
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                  Fine-tune the preset with guided controls. Switch to advanced only if you want raw StyleSpec editing.
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: 'rgba(12, 18, 28, 0.5)',
                  }}
                >
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
                    Preset
                  </Typography>
                  <TextField
                    fullWidth
                    hiddenLabel
                    inputProps={{ 'aria-label': 'Preset name' }}
                    value={styleName}
                    onChange={(event) => updateStyleSpecName(event.target.value)}
                    placeholder="Tokyo Night Portrait"
                  />
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: 'rgba(12, 18, 28, 0.5)',
                  }}
                >
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
                    Version
                  </Typography>
                  <TextField
                    fullWidth
                    hiddenLabel
                    inputProps={{ 'aria-label': 'Version' }}
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    placeholder="v1"
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: 2.5,
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(12, 18, 28, 0.5)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 700,
                        letterSpacing: 0.3,
                        textTransform: 'uppercase',
                      }}
                    >
                      Refine
                    </Typography>
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
                      sx={{
                        '& .MuiToggleButton-root': {
                          px: 1.25,
                          py: 0.6,
                          borderColor: 'rgba(255,255,255,0.08)',
                          textTransform: 'none',
                        },
                      }}
                    >
                      <ToggleButton value="guided" aria-label="guided-mode">
                        <TuneIcon fontSize="small" sx={{ mr: 0.75 }} />
                        Guided
                      </ToggleButton>
                      <ToggleButton value="advanced" aria-label="advanced-mode">
                        <DataObjectIcon fontSize="small" sx={{ mr: 0.75 }} />
                        Advanced
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  {editorMode === 'guided' ? (
                    <FormControlLabel
                      sx={{
                        m: 0,
                        '& .MuiFormControlLabel-label': {
                          color: 'text.secondary',
                          fontSize: '0.9rem',
                        },
                      }}
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
                  ) : null}
                </Stack>
              </Box>

              {editorMode === 'guided' ? (
                <StyleSpecControls
                  spec={styleSpec}
                  onChange={updateStyleSpecFromGuided}
                  showAllProperties={showAllProperties}
                />
              ) : (
                <>
                  {jsonError ? (
                    <Alert severity="warning" sx={{ mt: 1.5 }}>
                      JSON contains errors. Fix it before saving the preset.
                    </Alert>
                  ) : null}
                  <JsonEditor value={styleSpecJson} onChange={updateStyleSpecJson} hasError={jsonError} />
                </>
              )}
            </Stack>
          ) : null}

          {wizardStep === 3 ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Save and export
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                  Save the preset first, then export a `.costyle` file or send it directly to Capture One.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
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
                    Export file
                  </ToggleButton>
                  <ToggleButton value="host" aria-label="execution-host">
                    <LaptopMacIcon fontSize="small" sx={{ mr: 0.75 }} />
                    Send to Capture One
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Alert severity={exportReadiness.severity} sx={{ borderRadius: 2.5 }}>
                <strong>{exportReadiness.title}</strong> {exportReadiness.message}
              </Alert>

              {flowNotice ? (
                <Alert severity={flowNotice.severity} sx={{ borderRadius: 2.5 }}>
                  <AlertTitle>{flowNotice.title}</AlertTitle>
                  {flowNotice.message}
                </Alert>
              ) : null}

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                }}
              >
                <Stack spacing={0.75}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<RocketLaunchIcon />}
                    onClick={() => {
                      void handleSaveCurrentPreset()
                    }}
                    disabled={!canSavePreset}
                  >
                    {isLoading('save_preset') ? 'Saving preset...' : isCurrentPresetSaved ? 'Preset saved' : 'Save preset'}
                  </Button>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minHeight: 20 }}>
                    {isCurrentPresetSaved
                      ? 'Current preset version already matches these edits.'
                      : 'Save the current name, version and StyleSpec before export.'}
                  </Typography>
                </Stack>

                <Stack spacing={0.75}>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<DnsIcon />}
                    onClick={() => {
                      void handleCompileAndDownload()
                    }}
                    disabled={!canExportFile}
                  >
                    {isLoading('compile_download') ? 'Exporting...' : 'Export .costyle'}
                  </Button>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minHeight: 20 }}>
                    {executionMode !== 'api'
                      ? 'Switch to Export file mode to download a .costyle.'
                      : !createdVersion
                        ? 'Available after the preset has been saved.'
                        : 'Compile the saved version and download the latest .costyle artifact.'}
                  </Typography>
                </Stack>

                <Stack spacing={0.75}>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<LaptopMacIcon />}
                    onClick={() => {
                      void handleCompile()
                    }}
                    disabled={!canSendToCaptureOne}
                  >
                    {isLoading('compile') ? 'Sending...' : 'Send to Capture One'}
                  </Button>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minHeight: 20 }}>
                    {executionMode !== 'host'
                      ? 'Switch to Send to Capture One mode to run the host sync.'
                      : !createdVersion
                        ? 'Available after the preset has been saved.'
                        : 'Send the saved version through the runner and track its sync status below.'}
                  </Typography>
                </Stack>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {createdStyle ? <Chip label={`Style ID: ${createdStyle.style_id}`} /> : null}
                {createdVersion ? <Chip label={`Version: ${createdVersion.version}`} color="primary" /> : null}
                {createdVersion ? (
                  <Chip
                    label={isCurrentPresetSaved ? 'Current edits saved' : 'Unsaved edits'}
                    color={isCurrentPresetSaved ? 'success' : 'warning'}
                    variant={isCurrentPresetSaved ? 'filled' : 'outlined'}
                  />
                ) : null}
                {compileResult ? <Chip label={`Artifact ID: ${compileResult.artifact_id}`} color="success" /> : null}
              </Stack>

              {runnerJobId ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Chip label={`Runner job ${runnerJobId}`} />
                  <Chip label={runnerJobStatus ? `Status: ${runnerJobStatus}` : 'Status pending'} color="info" />
                  <Button
                    variant="text"
                    onClick={() => {
                      void handleRefreshRunnerJob()
                    }}
                    disabled={activeAction !== null}
                  >
                    {isLoading('job') ? 'Checking job...' : isAutoPollingJob ? 'Tracking job...' : 'Check sync status'}
                  </Button>
                </Stack>
              ) : null}

              {hostImportedPath ? (
                <Alert severity="success" sx={{ borderRadius: 2.5 }}>
                  Capture One import completed. Imported file: <strong>{hostImportedPath}</strong>
                </Alert>
              ) : null}

              {compileResult ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="text"
                    onClick={() => {
                      void handleDownloadArtifact()
                    }}
                    disabled={activeAction !== null}
                  >
                    {isLoading('download') ? 'Downloading...' : 'Download latest export'}
                  </Button>
                </Stack>
              ) : null}

              <Accordion sx={{ backgroundColor: 'rgba(18, 23, 34, 0.88)' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <HistoryIcon fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      History and previous exports
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
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
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          ) : null}
        </section>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Button
            variant="text"
            startIcon={<ArrowBackIosNewIcon />}
            onClick={() => setWizardStep((step) => Math.max(0, step - 1))}
            disabled={wizardStep === 0}
          >
            Back
          </Button>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Step {wizardStep + 1} of {JOURNEY_STEPS.length}
            </Typography>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIosIcon />}
              onClick={() => setWizardStep((step) => Math.min(JOURNEY_STEPS.length - 1, step + 1))}
              disabled={
                wizardStep === JOURNEY_STEPS.length - 1 ||
                (wizardStep === 0 && !journeyStartMode) ||
                (wizardStep === 2 && !styleSpec.name.trim())
              }
            >
              Continue
            </Button>
          </Stack>
        </Stack>

        {flowError ? <ErrorBanner error={flowError} /> : null}

        {hostErrorCode ? (
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
        ) : null}

        <Accordion sx={{ backgroundColor: 'rgba(18, 23, 34, 0.88)' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <InsightsIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Manual pipeline
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Use this only when you want to step through the raw backend flow manually. The guided flow above should remain the default path.
              </Typography>

              <Box className="flow-actions">
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
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion sx={{ backgroundColor: 'rgba(18, 23, 34, 0.88)' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <DataObjectIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Technical details
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                IDs, runner state and raw export metadata for debugging. Keep this collapsed unless you are diagnosing the pipeline.
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (!createdStyle) {
                      return
                    }
                    void refreshArtifactHistory(createdStyle.style_id)
                  }}
                  disabled={activeAction !== null || !createdStyle}
                >
                  {isLoading('history') ? 'Refreshing...' : 'Refresh history'}
                </Button>
              </Stack>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(12, 18, 28, 0.45)',
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    Runtime state
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip label={`Style ID: ${createdStyle?.style_id ?? '-'}`} size="small" />
                    <Chip label={`Version: ${createdVersion?.version ?? '-'}`} size="small" />
                    <Chip label={`Artifact ID: ${compileResult?.artifact_id ?? '-'}`} size="small" />
                    <Chip label={`Runner Job: ${runnerJobId ?? '-'}`} size="small" />
                    <Chip label={`Runner Status: ${runnerJobStatus ?? '-'}`} size="small" />
                    <Chip label={`SHA256: ${compileResult?.sha256 ?? '-'}`} size="small" />
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Host imported path: {hostImportedPath ?? '-'}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion sx={{ backgroundColor: 'rgba(18, 23, 34, 0.88)' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <HistoryIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                History and previous exports
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
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
            </Stack>
          </AccordionDetails>
        </Accordion>

        {error ? (
          <Alert severity="error">
            {error.message} ({error.status})
          </Alert>
        ) : null}
        {!aiHealthError && aiHealth?.message && aiHealth.status !== 'available' ? (
          <Alert severity={aiHealth.status === 'degraded' ? 'warning' : 'error'}>
            {aiHealth.message}
          </Alert>
        ) : null}
      </Stack>
    </main>
  )
}
