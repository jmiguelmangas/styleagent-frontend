import HistoryIcon from '@mui/icons-material/History'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Chip, IconButton, Stack } from '@mui/material'

import type { AIGenerationRecord } from '../api/types'

type AIGenerationHistoryProps = {
  records: AIGenerationRecord[]
  loading: boolean
  onRefresh: () => void
}

function formatTimestamp(value: string): string {
  const asDate = new Date(value)
  if (Number.isNaN(asDate.getTime())) {
    return value
  }
  return asDate.toLocaleString()
}

export function AIGenerationHistory({ records, loading, onRefresh }: AIGenerationHistoryProps) {
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
                {record.generation_ms !== undefined && record.generation_ms !== null && (
                  <Chip label={`${record.generation_ms}ms`} size="small" color="primary" variant="outlined" />
                )}
                {record.fallback_used && <Chip label="Fallback" size="small" color="warning" />}
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
