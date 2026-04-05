import HistoryIcon from '@mui/icons-material/History'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, Chip, IconButton, Paper, Stack, Typography } from '@mui/material'

import type { AIGenerationRecord } from '../api/types'

type AIGenerationHistoryProps = {
  records: AIGenerationRecord[]
  loading: boolean
  onRefresh: () => void
  onUsePreset: (record: AIGenerationRecord) => void
}

function formatTimestamp(value: string): string {
  const asDate = new Date(value)
  if (Number.isNaN(asDate.getTime())) {
    return value
  }
  return asDate.toLocaleString()
}

export function AIGenerationHistory({ records, loading, onRefresh, onUsePreset }: AIGenerationHistoryProps) {
  return (
    <section className="history-card">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            AI generation history
          </Typography>
        </Stack>
        <IconButton
          aria-label="refresh-ai-history"
          size="small"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshIcon fontSize="inherit" />
        </IconButton>
      </Stack>

      {loading && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Refreshing AI generation history...
        </Typography>
      )}
      {!loading && records.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          No AI generations saved yet.
        </Alert>
      )}
      {!loading && records.length > 0 && (
        <Stack spacing={1.25}>
          {records.map((record) => (
            <Paper
              key={record.generation_id}
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
                  <Stack spacing={0.35}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {record.style_spec.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {record.prompt}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Created {formatTimestamp(record.created_at)}
                    </Typography>
                  </Stack>
                  <Button
                    type="button"
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onUsePreset(record)}
                  >
                    Use this preset
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip label={`${record.provider}/${record.model}`} size="small" />
                  <Chip label={`Target: ${record.target}`} size="small" />
                  {record.planner_trace?.family_id ? (
                    <Chip label={`Family: ${record.planner_trace.family_id}`} size="small" variant="outlined" />
                  ) : null}
                  {record.planner_trace?.intensity ? (
                    <Chip label={`Intensity: ${record.planner_trace.intensity}`} size="small" variant="outlined" />
                  ) : null}
                  {record.generation_ms !== undefined && record.generation_ms !== null && (
                    <Chip label={`${record.generation_ms}ms`} size="small" color="primary" variant="outlined" />
                  )}
                  {record.fallback_used && <Chip label="Fallback" size="small" color="warning" />}
                </Stack>

                {record.planner_trace && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip label={`Mode: ${record.planner_trace.mode}`} size="small" variant="outlined" />
                    {record.planner_trace.refinement_ids.map((refinementId) => (
                      <Chip key={`${record.generation_id}-${refinementId}`} label={refinementId} size="small" />
                    ))}
                  </Stack>
                )}

                {record.warnings.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 0.5 }}>
                    {record.warnings[0]}
                  </Alert>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </section>
  )
}
