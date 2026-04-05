import DownloadIcon from '@mui/icons-material/Download'
import HistoryIcon from '@mui/icons-material/History'
import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material'

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
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <HistoryIcon fontSize="small" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Export history
        </Typography>
      </Stack>
      {loading && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Refreshing exported artifacts...
        </Typography>
      )}
      {!loading && artifacts.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          No exports yet for this preset.
        </Alert>
      )}
      {!loading && artifacts.length > 0 && (
        <Stack spacing={1.25}>
          {artifacts.map((artifact) => {
            const filename = fileNameFromPath(artifact.path)
            return (
              <Paper
                key={artifact.artifact_id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Stack spacing={1}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <BoxTextPrimary filename={filename} />
                    <Button
                      type="button"
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => onDownload(artifact.artifact_id, filename)}
                    >
                      Download
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip label={`Version ${artifact.version}`} size="small" color="primary" variant="outlined" />
                    <Chip label={`Artifact ${artifact.artifact_id}`} size="small" variant="outlined" />
                    <Chip label={`SHA ${artifact.sha256.slice(0, 12)}…`} size="small" variant="outlined" />
                  </Stack>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      )}
    </section>
  )
}

function BoxTextPrimary({ filename }: { filename: string }) {
  return (
    <Stack spacing={0.35}>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>
        {filename}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Compiled artifact available for redownload.
      </Typography>
    </Stack>
  )
}
