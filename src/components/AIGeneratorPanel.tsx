import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CodeIcon from '@mui/icons-material/Code'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import PreviewIcon from '@mui/icons-material/Visibility'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import type { AIPromptPreviewResponse } from '../api/types'

type AIGenerationMeta = {
  provider: string
  model: string
  rationale?: string | null
  warnings: string[]
  generation_ms?: number | null
  fallback_used?: boolean
}

type AIGeneratorPanelProps = {
  prompt: string
  intents: string[]
  onPromptChange: (next: string) => void
  onIntentsChange: (next: string[]) => void
  onPreview: () => void
  onGenerate: () => void
  onGenerateAndSave: () => void
  previewing: boolean
  generating: boolean
  generatingAndSaving: boolean
  cooldownSeconds: number
  meta: AIGenerationMeta | null
  preview: AIPromptPreviewResponse | null
}

const INTENT_SUGGESTIONS = [
  'cinematic',
  'warm',
  'cool',
  'natural',
  'vintage',
  'editorial',
  'portrait',
  'landscape',
]

export function AIGeneratorPanel({
  prompt,
  intents,
  onPromptChange,
  onIntentsChange,
  onPreview,
  onGenerate,
  onGenerateAndSave,
  previewing,
  generating,
  generatingAndSaving,
  cooldownSeconds,
  meta,
  preview,
}: AIGeneratorPanelProps) {
  const isRateLimited = cooldownSeconds > 0
  const [showPreviewPrompt, setShowPreviewPrompt] = useState(false)

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <PsychologyAltIcon fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>
          AI Style Generator
        </Typography>
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        Describe the look you want. Generated `StyleSpec` is loaded into the editor below and can be adjusted.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Prompt"
        placeholder="Example: cinematic warm portrait preset with soft highlights and subtle contrast"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        variant="outlined"
        InputLabelProps={{ shrink: true }}
        sx={{
          '& .MuiInputLabel-root': {
            color: 'rgba(226, 232, 240, 0.78)',
          },
          '& .MuiOutlinedInput-root': {
            alignItems: 'flex-start',
            backgroundColor: 'rgba(12, 18, 28, 0.6)',
          },
          '& .MuiOutlinedInput-input': {
            pt: 1.75,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.12)',
          },
        }}
      />

      <Box sx={{ mt: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ display: 'block', mb: 0.75, color: 'rgba(226, 232, 240, 0.78)', fontWeight: 600 }}
        >
          Intents (optional)
        </Typography>
        <Autocomplete
          multiple
          freeSolo
          options={INTENT_SUGGESTIONS}
          value={intents}
          onChange={(_, next) => onIntentsChange(next.map((entry) => String(entry).trim()).filter(Boolean))}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="cinematic, warm, portrait"
              variant="outlined"
              hiddenLabel
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(12, 18, 28, 0.6)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.12)',
                },
              }}
            />
          )}
        />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 1.5 }}>
        <Button
          variant="outlined"
          startIcon={<PreviewIcon />}
          onClick={onPreview}
          disabled={previewing || generating || generatingAndSaving || isRateLimited || !prompt.trim()}
        >
          {previewing ? 'Previewing prompt...' : 'Preview Prompt'}
        </Button>

        <Button
          variant="contained"
          startIcon={<AutoFixHighIcon />}
          onClick={onGenerate}
          disabled={previewing || generating || generatingAndSaving || isRateLimited || !prompt.trim()}
        >
          {generating ? 'Generating style...' : 'Generate StyleSpec'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<AutoFixHighIcon />}
          onClick={onGenerateAndSave}
          disabled={previewing || generating || generatingAndSaving || isRateLimited || !prompt.trim()}
        >
          {generatingAndSaving ? 'Generating and saving...' : 'Generate + Save Version'}
        </Button>
      </Stack>

      {isRateLimited ? (
        <Alert severity="info" sx={{ mt: 1.2 }}>
          AI rate limit active. Retry in {cooldownSeconds}s.
        </Alert>
      ) : null}

      {preview ? (
        <Stack spacing={1.2} sx={{ mt: 1.5 }}>
          <Alert severity="info" icon={<CodeIcon fontSize="inherit" />}>
            Prompt preview ready with <strong>{preview.provider}</strong> / <strong>{preview.model}</strong>
            {` — ${preview.examples_count} example${preview.examples_count === 1 ? '' : 's'} selected`}
          </Alert>

          {preview.examples.length > 0 ? (
            <Box
              sx={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                p: 1.5,
                backgroundColor: 'rgba(8,12,20,0.56)',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Selected examples
              </Typography>
              <Stack spacing={1}>
                {preview.examples.map((example, index) => (
                  <Box
                    key={`${example.source ?? 'example'}-${index}`}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 1.5,
                      p: 1.2,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {example.source ?? `Example ${index + 1}`}
                    </Typography>
                    {example.prompt ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                        {example.prompt}
                      </Typography>
                    ) : null}
                    {example.intent && example.intent.length > 0 ? (
                      <Stack direction="row" spacing={0.8} sx={{ mt: 0.8, flexWrap: 'wrap' }}>
                        {example.intent.map((intent) => (
                          <Chip key={`${intent}-${index}`} label={intent} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}

          <Button
            variant="text"
            onClick={() => setShowPreviewPrompt((current) => !current)}
            startIcon={showPreviewPrompt ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ alignSelf: 'flex-start' }}
          >
            {showPreviewPrompt ? 'Hide full prompt' : 'Show full prompt'}
          </Button>

          <Collapse in={showPreviewPrompt}>
            <Box
              sx={{
                border: '1px solid #d6deea',
                borderRadius: 2,
                p: 1.5,
                backgroundColor: '#0e1726',
                color: '#e8eef8',
                overflowX: 'auto',
              }}
            >
              <Typography
                component="pre"
                sx={{
                  m: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'ui-monospace, SFMono-Regular, SFMono-Regular, Consolas, monospace',
                  fontSize: 13,
                }}
              >
                {preview.prompt}
              </Typography>
            </Box>
          </Collapse>
        </Stack>
      ) : null}

      {meta && (
        <Stack spacing={1.2} sx={{ mt: 1.5 }}>
          <Alert severity="success" icon={<TipsAndUpdatesIcon fontSize="inherit" />}>
            Generated with <strong>{meta.provider}</strong> / <strong>{meta.model}</strong>
            {meta.rationale ? ` — ${meta.rationale}` : ''}
            {typeof meta.generation_ms === 'number' ? ` (Latency: ${meta.generation_ms}ms)` : ''}
          </Alert>
          {meta.fallback_used ? (
            <Alert severity="warning">
              Fallback to mock generation was used for this result.
            </Alert>
          ) : null}
          {meta.warnings.map((warning, index) => (
            <Alert key={`${warning}-${index}`} severity="warning">
              {warning}
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  )
}
