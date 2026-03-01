import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

type AIGenerationMeta = {
  provider: string
  model: string
  rationale?: string | null
  warnings: string[]
}

type AIGeneratorPanelProps = {
  prompt: string
  intents: string[]
  onPromptChange: (next: string) => void
  onIntentsChange: (next: string[]) => void
  onGenerate: () => void
  onGenerateAndSave: () => void
  generating: boolean
  generatingAndSaving: boolean
  meta: AIGenerationMeta | null
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
  onGenerate,
  onGenerateAndSave,
  generating,
  generatingAndSaving,
  meta,
}: AIGeneratorPanelProps) {
  return (
    <Box sx={{ mt: 1.5, p: 2, border: '1px solid #c9d3e2', borderRadius: 2, backgroundColor: '#fff' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <PsychologyAltIcon fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>
          AI Style Generator
        </Typography>
      </Stack>

      <Typography variant="body2" sx={{ color: '#415066', mb: 1.5 }}>
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
      />

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
            label="Intents (optional)"
            placeholder="cinematic, warm, portrait"
            sx={{ mt: 1.5 }}
          />
        )}
      />

      <Button
        variant="contained"
        sx={{ mt: 1.5 }}
        startIcon={<AutoFixHighIcon />}
        onClick={onGenerate}
        disabled={generating || generatingAndSaving || !prompt.trim()}
      >
        {generating ? 'Generating style...' : 'Generate StyleSpec'}
      </Button>

      <Button
        variant="outlined"
        sx={{ mt: 1.2 }}
        startIcon={<AutoFixHighIcon />}
        onClick={onGenerateAndSave}
        disabled={generating || generatingAndSaving || !prompt.trim()}
      >
        {generatingAndSaving ? 'Generating and saving...' : 'Generate + Save Version'}
      </Button>

      {meta && (
        <Stack spacing={1.2} sx={{ mt: 1.5 }}>
          <Alert severity="success" icon={<TipsAndUpdatesIcon fontSize="inherit" />}>
            Generated with <strong>{meta.provider}</strong> / <strong>{meta.model}</strong>
            {meta.rationale ? ` — ${meta.rationale}` : ''}
          </Alert>
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
