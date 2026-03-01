import ChatIcon from '@mui/icons-material/Chat'
import SendIcon from '@mui/icons-material/Send'
import UndoIcon from '@mui/icons-material/Undo'
import DoneIcon from '@mui/icons-material/Done'
import SaveIcon from '@mui/icons-material/Save'
import { Alert, Button, Chip, Paper, Stack, Switch, TextField, Typography } from '@mui/material'

import type { AIChatTurn } from '../api/types'

type AIChatPanelProps = {
  sessionId: string | null
  turns: AIChatTurn[]
  message: string
  autoApply: boolean
  loading: boolean
  applyingTurnId: string | null
  savingPreset: boolean
  onMessageChange: (value: string) => void
  onAutoApplyChange: (value: boolean) => void
  onSuggestionSelect: (value: string) => void
  onSavePreset: () => void
  onSend: () => void
  onApplyTurn: (turnId: string) => void
  onRevertTurn: (turnId: string) => void
  onResetSession: () => void
}

export function AIChatPanel({
  sessionId,
  turns,
  message,
  autoApply,
  loading,
  applyingTurnId,
  savingPreset,
  onMessageChange,
  onAutoApplyChange,
  onSuggestionSelect,
  onSavePreset,
  onSend,
  onApplyTurn,
  onRevertTurn,
  onResetSession,
}: AIChatPanelProps) {
  return (
    <section className="history-card">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <ChatIcon fontSize="small" />
          AI conversation
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            type="button"
            size="small"
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={onSavePreset}
            disabled={loading || savingPreset}
          >
            {savingPreset ? 'Saving preset...' : 'Save preset'}
          </Button>
          <Button type="button" size="small" variant="outlined" onClick={onResetSession} disabled={loading}>
            New session
          </Button>
        </Stack>
      </Stack>

      <p style={{ marginTop: 0 }}>
        Session: <strong>{sessionId ?? 'not started'}</strong> · Turns: <strong>{turns.length}</strong>
      </p>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <TextField
          label="Message to AI"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Example: make it brighter but keep skin tones natural"
          fullWidth
          size="small"
        />
        <Button
          type="button"
          variant="contained"
          startIcon={<SendIcon />}
          onClick={onSend}
          disabled={loading || !message.trim()}
        >
          Send
        </Button>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Switch
          checked={autoApply}
          onChange={(event) => onAutoApplyChange(event.target.checked)}
          inputProps={{ 'aria-label': 'chat-auto-apply' }}
        />
        <span>Auto-apply proposals</span>
      </Stack>

      {turns.length === 0 && <p>No turns yet. Start by sending a message.</p>}
      {turns.length > 0 && (
        <ul className="history-list" aria-label="chat-turn-list">
          {turns.map((turn) => (
            <li key={turn.turn_id}>
              <Paper variant="outlined" sx={{ p: 1.25, mb: 1, backgroundColor: '#f5f7fb' }}>
                <Typography variant="body2">
                  <strong>You:</strong> {turn.user_message}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.25, mb: 1 }}>
                <Typography variant="body2">
                  <strong>Assistant:</strong> {turn.assistant_message}
                </Typography>
              </Paper>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                {turn.guidance.detected_goals.map((goal) => (
                  <Chip key={goal} label={goal} size="small" variant="outlined" />
                ))}
                {turn.applied && <Chip label="Applied" size="small" color="success" icon={<DoneIcon />} />}
              </Stack>

              <Alert severity="info" sx={{ mb: 1 }}>
                {turn.guidance.reasoning_summary}
              </Alert>

              {turn.proposed_changes.length > 0 && (
                <ul style={{ margin: '0 0 8px 18px' }}>
                  {turn.proposed_changes.map((change) => (
                    <li key={`${turn.turn_id}:${change.key}`}>
                      {change.key}: {change.from_value} {'->'} {change.to_value}
                    </li>
                  ))}
                </ul>
              )}

              {turn.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {turn.warnings[0]}
                </Alert>
              )}

              {turn.guidance.suggested_next_messages.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                  {turn.guidance.suggested_next_messages.map((suggestion) => (
                    <Chip
                      key={`${turn.turn_id}:${suggestion}`}
                      label={suggestion}
                      size="small"
                      onClick={() => onSuggestionSelect(suggestion)}
                      clickable
                      variant="outlined"
                    />
                  ))}
                </Stack>
              )}

              <Stack direction="row" spacing={1}>
                {!turn.applied && (
                  <Button
                    type="button"
                    size="small"
                    variant="contained"
                    onClick={() => onApplyTurn(turn.turn_id)}
                    disabled={loading || applyingTurnId === turn.turn_id}
                  >
                    Apply turn
                  </Button>
                )}
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<UndoIcon />}
                  onClick={() => onRevertTurn(turn.turn_id)}
                  disabled={loading}
                >
                  Revert (local)
                </Button>
              </Stack>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
