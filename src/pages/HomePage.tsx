import { useMemo, useState } from 'react'

import {
  compileStyleVersion,
  createStyle,
  createStyleVersion,
  downloadArtifact,
  listStyleArtifacts,
  toApiError,
} from '../api/client'
import type {
  ApiError,
  Artifact,
  CompileResponse,
  Style,
  StyleSpec,
  StyleVersion,
} from '../api/types'
import { ArtifactHistory } from '../components/ArtifactHistory'
import { ErrorBanner } from '../components/ErrorBanner'
import { JsonEditor } from '../components/JsonEditor'
import { StatusCard } from '../components/StatusCard'
import { useHealth } from '../hooks/useHealth'

const INITIAL_STYLE_SPEC = `{
  "name": "Nolan Warm",
  "intent": ["cinematic", "warm"],
  "captureone": {
    "keys": {
      "Exposure": 0.3,
      "Contrast": 9
    }
  }
}`

type ActionKey = 'style' | 'version' | 'compile' | 'download' | 'history'

export function HomePage() {
  const { data, error, loading } = useHealth()

  const [styleName, setStyleName] = useState('Nolan Warm')
  const [version, setVersion] = useState('v1')
  const [styleSpecJson, setStyleSpecJson] = useState(INITIAL_STYLE_SPEC)

  const [createdStyle, setCreatedStyle] = useState<Style | null>(null)
  const [createdVersion, setCreatedVersion] = useState<StyleVersion | null>(null)
  const [compileResult, setCompileResult] = useState<CompileResponse | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])

  const [flowError, setFlowError] = useState<ApiError | null>(null)
  const [jsonError, setJsonError] = useState(false)
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null)

  const downloadFilename = useMemo(() => {
    if (!createdStyle || !createdVersion) {
      return 'artifact.costyle'
    }
    return `${createdStyle.slug}-${createdVersion.version}.costyle`
  }, [createdStyle, createdVersion])

  function isLoading(action: ActionKey): boolean {
    return activeAction === action
  }

  function updateStyleSpecName(nextName: string) {
    setStyleName(nextName)
    try {
      const parsed = JSON.parse(styleSpecJson) as StyleSpec
      const nextSpec: StyleSpec = {
        ...parsed,
        name: nextName,
      }
      setStyleSpecJson(JSON.stringify(nextSpec, null, 2))
      setJsonError(false)
    } catch {
      // keep current json if user is editing invalid JSON
    }
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

    try {
      const payload = parseStyleSpecInput(styleSpecJson)
      setJsonError(false)

      const created = await createStyleVersion(createdStyle.style_id, {
        version: normalizedVersion,
        style_spec: payload,
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
      const compiled = await compileStyleVersion(createdStyle.style_id, createdVersion.version)
      setCompileResult(compiled)
      await refreshArtifactHistory(createdStyle.style_id)
    } catch (err) {
      setFlowError(toApiError(err))
      setActiveAction(null)
    }
  }

  async function triggerDownload(artifactId: string, filename: string) {
    setActiveAction('download')
    setFlowError(null)

    try {
      const blob = await downloadArtifact(artifactId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
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
    await triggerDownload(compileResult.artifact_id, downloadFilename)
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

        <label htmlFor="style-spec">StyleSpec JSON</label>
        <JsonEditor
          value={styleSpecJson}
          onChange={(next) => {
            setStyleSpecJson(next)
            setJsonError(false)
          }}
          hasError={jsonError}
        />

        <div className="flow-actions">
          <button type="button" onClick={handleCreateStyle} disabled={activeAction !== null || !styleName.trim()}>
            {isLoading('style') ? 'Creating style...' : '1. Create Style'}
          </button>
          <button type="button" onClick={handleCreateVersion} disabled={activeAction !== null || !createdStyle}>
            {isLoading('version') ? 'Creating version...' : '2. Create Version'}
          </button>
          <button type="button" onClick={handleCompile} disabled={activeAction !== null || !createdVersion}>
            {isLoading('compile') ? 'Compiling...' : '3. Compile'}
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
    </main>
  )
}
