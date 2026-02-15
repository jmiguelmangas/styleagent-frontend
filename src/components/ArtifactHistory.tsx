import type { Artifact } from '../api/types'

type ArtifactHistoryProps = {
  artifacts: Artifact[]
  loading: boolean
  onDownload: (artifactId: string, filename: string) => void
}

function fileNameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] ?? 'artifact.costyle'
}

export function ArtifactHistory({ artifacts, loading, onDownload }: ArtifactHistoryProps) {
  return (
    <section className="history-card">
      <h3>Artifact history</h3>
      {loading && <p className="status-loading">Refreshing artifact list...</p>}
      {!loading && artifacts.length === 0 && <p>No artifacts yet for this style.</p>}
      {!loading && artifacts.length > 0 && (
        <ul className="history-list">
          {artifacts.map((artifact) => {
            const filename = fileNameFromPath(artifact.path)
            return (
              <li key={artifact.artifact_id}>
                <div>
                  <strong>{filename}</strong>
                  <p>version: {artifact.version}</p>
                  <p>sha256: {artifact.sha256}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDownload(artifact.artifact_id, filename)}
                >
                  Download
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
