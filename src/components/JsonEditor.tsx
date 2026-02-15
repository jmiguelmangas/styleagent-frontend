import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Alert, Stack, TextField } from '@mui/material'

type JsonEditorProps = {
  value: string
  onChange: (next: string) => void
  hasError: boolean
}

export function JsonEditor({ value, onChange, hasError }: JsonEditorProps) {
  return (
    <Stack spacing={1.2} sx={{ mt: 1.5 }}>
      <TextField
        id="style-spec"
        label="StyleSpec JSON"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        multiline
        minRows={14}
        error={hasError}
        helperText={hasError ? 'Invalid JSON payload. Verify format and required fields.' : undefined}
        slotProps={{ htmlInput: { spellCheck: false } }}
      />
      <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
        Advanced mode: edit full payload directly. Backend validation still applies.
      </Alert>
    </Stack>
  )
}
