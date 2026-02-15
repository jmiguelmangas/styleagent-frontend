import { useMemo, useState } from 'react'

import {
  compileStyleVersion,
  createStyle,
  createStyleVersion,
  downloadArtifact,
} from '../api/client'
import type { ApiError, CompileResponse, Style, StyleVersion, StyleVersionCreate } from '../api/types'
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

export function HomePage() {
  const { data, error, loading } = useHealth()

  const [styleName, setStyleName] = useState('Nolan Warm')
  const [version, setVersion] = useState('v1')
  const [styleSpecJson, setStyleSpecJson] = useState(INITIAL_STYLE_SPEC)

  const [createdStyle, setCreatedStyle] = useState<Style | null>(null)
  const [createdVersion, setCreatedVersion] = useState<StyleVersion | null>(null)
  const [compileResult, setCompileResult] = useState<CompileResponse | null>(null)

  const [flowError, setFlowError] = useState<ApiError | null>(null)
  const [flowLoading, setFlowLoading] = useState(false)

  const downloadFilename = useMemo(() => {
    if (!createdStyle || !createdVersion) {
      return 'artifact.costyle'
    }
    return `${createdStyle.slug}-${createdVersion.version}.costyle`
  }, [createdStyle, createdVersion])

  async function handleCreateStyle() {
    setFlowLoading(true)
    setFlowError(null)
    setCreatedVersion(null)
    setCompileResult(null)

    try {
      const style = await createStyle({ name: styleName })
      setCreatedStyle(style)
    } catch (err) {
      setFlowError(err as ApiError)
    } finally {
      setFlowLoading(false)
    }
  }

  async function handleCreateVersion() {
    if (!createdStyle) {
      setFlowError({ message: 'Create a style first.', status: 400 })
      return
    }

    setFlowLoading(true)
    setFlowError(null)
    setCompileResult(null)

    try {
      const payload = JSON.parse(styleSpecJson) as StyleVersionCreate['style_spec']
      const created = await createStyleVersion(createdStyle.style_id, {
        version,
        style_spec: payload,
      })
      setCreatedVersion(created)
    } catch (err) {
      if (err instanceof SyntaxError) {
        setFlowError({ message: 'Invalid JSON in StyleSpec.', status: 400 })
      } else {
        setFlowError(err as ApiError)
      }
    } finally {
      setFlowLoading(false)
    }
  }

  async function handleCompile() {
    if (!createdStyle || !createdVersion) {
      setFlowError({ message: 'Create style and version before compile.', status: 400 })
      return
    }

    setFlowLoading(true)
    setFlowError(null)

    try {
      const compiled = await compileStyleVersion(createdStyle.style_id, createdVersion.version)
      setCompileResult(compiled)
    } catch (err) {
      setFlowError(err as ApiError)
    } finally {
      setFlowLoading(false)
    }
  }

  async function handleDownloadArtifact() {
    if (!compileResult) {
      setFlowError({ message: 'Compile an artifact first.', status: 400 })
      return
    }

    setFlowLoading(true)
    setFlowError(null)

    try {
      const blob = await downloadArtifact(compileResult.artifact_id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloadFilename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setFlowError(err as ApiError)
    } finally {
      setFlowLoading(false)
    }
  }

  return (
    <main className="page">
      <header>
        <h1>StyleAgent Frontend</h1>
        <p>MVP core flow: create style, create version, compile, download.</p>
      </header>

      <StatusCard
        title="API Health"
        loading={loading}
        status={data?.status ?? null}
        error={error}
      />

      <section className="flow-card">
        <h2>Core Flow (Phase 1)</h2>

        <label htmlFor="style-name">Style name</label>
        <input
          id="style-name"
          value={styleName}
          onChange={(event) => setStyleName(event.target.value)}
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
        <textarea
          id="style-spec"
          value={styleSpecJson}
          onChange={(event) => setStyleSpecJson(event.target.value)}
          rows={12}
        />

        <div className="flow-actions">
          <button type="button" onClick={handleCreateStyle} disabled={flowLoading || !styleName.trim()}>
            1. Create Style
          </button>
          <button type="button" onClick={handleCreateVersion} disabled={flowLoading || !createdStyle}>
            2. Create Version
          </button>
          <button type="button" onClick={handleCompile} disabled={flowLoading || !createdVersion}>
            3. Compile
          </button>
          <button type="button" onClick={handleDownloadArtifact} disabled={flowLoading || !compileResult}>
            4. Download Artifact
          </button>
        </div>

        {flowLoading && <p className="flow-loading">Running request...</p>}

        {flowError && (
          <p className="flow-error">
            {flowError.message} ({flowError.status})
          </p>
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
            <strong>SHA256:</strong> {compileResult?.sha256 ?? '-'}
          </p>
        </div>
      </section>
    </main>
  )
}
