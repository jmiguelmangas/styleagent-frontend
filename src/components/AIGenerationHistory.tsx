import HistoryIcon from '@mui/icons-material/History'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, Chip, IconButton, Stack } from '@mui/material'

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
        <h3 style={{ margin: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <HistoryIcon fontSize="small" />
            AI generation history
          </span>
        </h3>
        <IconButton
          aria-label="refresh-ai-history"
          size="small"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshIcon fontSize="inherit" />
        </IconButton>
      </Stack>

      {loading && <p className="status-loading">Refreshing AI history...</p>}
      {!loading && records.length === 0 && <p>No AI generations saved yet.</p>}
      {!loading && records.length > 0 && (
        <ul className="history-list">
          {records.map((record) => (
            <li key={record.generation_id}>
              <div>
                <strong>{record.style_spec.name}</strong>
                <p>Prompt: {record.prompt}</p>
                <p>Created: {formatTimestamp(record.created_at)}</p>
              </div>
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
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  <Chip label={`Mode: ${record.planner_trace.mode}`} size="small" variant="outlined" />
                  {record.planner_trace.refinement_ids.map((refinementId) => (
                    <Chip key={`${record.generation_id}-${refinementId}`} label={refinementId} size="small" />
                  ))}
                </Stack>
              )}
              <Stack direction="row" sx={{ mt: 1 }}>
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
              {record.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {record.warnings[0]}
                </Alert>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
