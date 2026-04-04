import ChatIcon from '@mui/icons-material/Chat'
import SendIcon from '@mui/icons-material/Send'
import UndoIcon from '@mui/icons-material/Undo'
import DoneIcon from '@mui/icons-material/Done'
import SaveIcon from '@mui/icons-material/Save'
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

import type { AIChatTurn, AIPresetIntensity } from '../api/types'

function formatFamilyLabel(familyId: string): string {
  return familyId
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type AIChatPanelProps = {
  sessionId: string | null
  turns: AIChatTurn[]
  message: string
  autoApply: boolean
  familyId: string | null
  intensity: AIPresetIntensity
  availableFamilies: string[]
  loading: boolean
  applyingTurnId: string | null
  savingPreset: boolean
  onMessageChange: (value: string) => void
  onAutoApplyChange: (value: boolean) => void
  onFamilyChange: (value: string | null) => void
  onIntensityChange: (value: AIPresetIntensity) => void
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
  familyId,
  intensity,
  availableFamilies,
  loading,
  applyingTurnId,
  savingPreset,
  onMessageChange,
  onAutoApplyChange,
  onFamilyChange,
  onIntensityChange,
  onSuggestionSelect,
  onSavePreset,
  onSend,
  onApplyTurn,
  onRevertTurn,
  onResetSession,
}: AIChatPanelProps) {
  const latestPlannerTrace = turns.at(-1)?.planner_trace
  const activeFamilyId = familyId ?? latestPlannerTrace?.family_id ?? null
  const quickActions = [
    {
      key: 'subtle',
      label: 'Make it subtler',
      onClick: () => {
        onIntensityChange('subtle')
        onSuggestionSelect('Make it subtler while keeping the current creative direction.')
      },
    },
    {
      key: 'balanced',
      label: 'Reset to balanced',
      onClick: () => {
        onIntensityChange('balanced')
        onSuggestionSelect('Bring it back to a balanced version of this look.')
      },
    },
    {
      key: 'bold',
      label: 'Push it further',
      onClick: () => {
        onIntensityChange('bold')
        onSuggestionSelect('Push the look further while keeping the same creative direction.')
      },
    },
  ]

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

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ mb: 1.5 }}
      >
        <TextField
          select
          label="Creative family"
          value={familyId ?? ''}
          onChange={(event) => onFamilyChange(event.target.value || null)}
          size="small"
          SelectProps={{
            MenuProps: {
              disablePortal: true,
            },
          }}
          sx={{ minWidth: { xs: '100%', md: 260 } }}
        >
          <MenuItem value="">Auto-detect from conversation</MenuItem>
          {availableFamilies.map((family) => (
            <MenuItem key={family} value={family}>
              {family}
            </MenuItem>
          ))}
        </TextField>

        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Intensity
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={intensity}
            onChange={(_event, value: AIPresetIntensity | null) => {
              if (value) {
                onIntensityChange(value)
              }
            }}
            aria-label="chat-intensity"
          >
            <ToggleButton value="subtle" aria-label="chat-intensity-subtle">
              Subtle
            </ToggleButton>
            <ToggleButton value="balanced" aria-label="chat-intensity-balanced">
              Balanced
            </ToggleButton>
            <ToggleButton value="bold" aria-label="chat-intensity-bold">
              Bold
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          mb: 1.5,
          backgroundColor: 'rgba(17, 24, 39, 0.72)',
          borderColor: 'rgba(122, 162, 255, 0.18)',
        }}
      >
        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
          Quick directions
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: activeFamilyId ? 1 : 0 }}>
          {quickActions.map((action) => (
            <Chip
              key={action.key}
              label={action.label}
              size="small"
              clickable
              variant="outlined"
              onClick={action.onClick}
            />
          ))}
          {activeFamilyId ? (
            <Chip
              label={`Stay in ${formatFamilyLabel(activeFamilyId)}`}
              size="small"
              clickable
              color="primary"
              variant="outlined"
              onClick={() => {
                onFamilyChange(activeFamilyId)
                onSuggestionSelect(`Keep the ${formatFamilyLabel(activeFamilyId)} direction.`)
              }}
            />
          ) : null}
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Current direction: {activeFamilyId ? formatFamilyLabel(activeFamilyId) : 'Auto-detect family'} · {intensity}
        </Typography>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <TextField
          label="Message to AI"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Example: make it brighter but keep skin tones natural"
          fullWidth
          size="small"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiInputLabel-root': {
              color: 'rgba(226, 232, 240, 0.78)',
            },
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(12, 18, 28, 0.6)',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.12)',
            },
          }}
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
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  mb: 1,
                  backgroundColor: 'rgba(35, 49, 78, 0.55)',
                  borderColor: 'rgba(122, 162, 255, 0.22)',
                }}
              >
                <Typography variant="body2">
                  <strong>You:</strong> {turn.user_message}
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  mb: 1,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Typography variant="body2">
                  <strong>Assistant:</strong> {turn.assistant_message}
                </Typography>
              </Paper>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                {turn.guidance.detected_goals.map((goal) => (
                  <Chip key={goal} label={goal} size="small" variant="outlined" />
                ))}
                {turn.planner_trace?.family_id ? (
                  <Chip
                    label={`Family: ${turn.planner_trace.family_id}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={() => onFamilyChange(turn.planner_trace?.family_id ?? null)}
                    clickable
                  />
                ) : null}
                {turn.planner_trace?.intensity ? (
                  <Chip
                    label={`Intensity: ${turn.planner_trace.intensity}`}
                    size="small"
                    variant="outlined"
                    onClick={() => onIntensityChange(turn.planner_trace?.intensity ?? 'balanced')}
                    clickable
                  />
                ) : null}
                {turn.planner_trace ? (
                  <Chip label={`Mode: ${turn.planner_trace.mode}`} size="small" variant="outlined" />
                ) : null}
                {turn.applied && <Chip label="Applied" size="small" color="success" icon={<DoneIcon />} />}
              </Stack>

              {turn.planner_trace?.refinement_ids?.length ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                  {turn.planner_trace.refinement_ids.map((refinementId) => (
                    <Chip key={`${turn.turn_id}:${refinementId}`} label={refinementId} size="small" />
                  ))}
                </Stack>
              ) : null}

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
