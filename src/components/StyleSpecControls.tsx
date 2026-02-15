import { useState } from 'react'

import AddIcon from '@mui/icons-material/Add'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import type { SafePolicy, StyleSpec } from '../api/types'

type StyleSpecControlsProps = {
  spec: StyleSpec
  onChange: (next: StyleSpec) => void
  showAllProperties: boolean
}

const INTENT_OPTIONS = ['cinematic', 'warm', 'cool', 'natural', 'high-contrast', 'vintage']
const TONE_CURVE_OPTIONS = ['Film Standard', 'Linear', 'Matte Lift', 'Punchy Contrast']

export function StyleSpecControls({ spec, onChange, showAllProperties }: StyleSpecControlsProps) {
  const [newPropertyKey, setNewPropertyKey] = useState('')
  const [newPropertyValue, setNewPropertyValue] = useState('')

  function getNumericKey(key: string, fallback = 0): number {
    const value = spec.captureone.keys[key]
    return typeof value === 'number' ? value : fallback
  }

  function updateNumericKey(key: string, value: number) {
    onChange({
      ...spec,
      captureone: {
        ...spec.captureone,
        keys: {
          ...spec.captureone.keys,
          [key]: value,
        },
      },
    })
  }

  function updateStringKey(key: string, value: string) {
    onChange({
      ...spec,
      captureone: {
        ...spec.captureone,
        keys: {
          ...spec.captureone.keys,
          [key]: value,
        },
      },
    })
  }

  function updateGenericKeyValue(key: string, value: string) {
    const normalized = value.trim()
    const nextValue = normalized !== '' && !Number.isNaN(Number(normalized)) ? Number(normalized) : value
    onChange({
      ...spec,
      captureone: {
        ...spec.captureone,
        keys: {
          ...spec.captureone.keys,
          [key]: nextValue,
        },
      },
    })
  }

  function toggleIntent(intent: string) {
    const current = new Set(spec.intent)
    if (current.has(intent)) {
      current.delete(intent)
    } else {
      current.add(intent)
    }

    onChange({
      ...spec,
      intent: Array.from(current),
    })
  }

  function updateSafePolicy(key: keyof SafePolicy, checked: boolean) {
    onChange({
      ...spec,
      safe: {
        remove_lens_light_falloff: spec.safe?.remove_lens_light_falloff ?? true,
        remove_white_balance: spec.safe?.remove_white_balance ?? true,
        remove_exposure: spec.safe?.remove_exposure ?? false,
        [key]: checked,
      },
    })
  }

  return (
    <Box sx={{ mt: 1.5, p: 2, border: '1px solid #c9d3e2', borderRadius: 2, backgroundColor: '#fff' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <AutoFixHighIcon fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>
          Style Properties
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Box>
          <Typography variant="body2">Exposure ({getNumericKey('Exposure', 0).toFixed(1)})</Typography>
          <Slider
            value={getNumericKey('Exposure', 0)}
            min={-2}
            max={2}
            step={0.1}
            marks
            onChange={(_, value) => updateNumericKey('Exposure', Number(value))}
          />
        </Box>
        <Box>
          <Typography variant="body2">Contrast ({Math.round(getNumericKey('Contrast', 0))})</Typography>
          <Slider
            value={getNumericKey('Contrast', 0)}
            min={-100}
            max={100}
            step={1}
            onChange={(_, value) => updateNumericKey('Contrast', Number(value))}
          />
        </Box>
        <Box>
          <Typography variant="body2">Saturation ({Math.round(getNumericKey('Saturation', 0))})</Typography>
          <Slider
            value={getNumericKey('Saturation', 0)}
            min={-100}
            max={100}
            step={1}
            onChange={(_, value) => updateNumericKey('Saturation', Number(value))}
          />
        </Box>
        <Box>
          <Typography variant="body2">Clarity ({Math.round(getNumericKey('Clarity', 0))})</Typography>
          <Slider
            value={getNumericKey('Clarity', 0)}
            min={-100}
            max={100}
            step={1}
            onChange={(_, value) => updateNumericKey('Clarity', Number(value))}
          />
        </Box>
        <Box>
          <FormControl fullWidth>
            <InputLabel id="tone-curve-label">Tone Curve</InputLabel>
            <Select
              labelId="tone-curve-label"
              label="Tone Curve"
              value={typeof spec.captureone.keys.ToneCurve === 'string' ? spec.captureone.keys.ToneCurve : 'Film Standard'}
              onChange={(event) => updateStringKey('ToneCurve', event.target.value)}
            >
              {TONE_CURVE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box>
          <TextField
            label="Capture One Notes"
            fullWidth
            multiline
            minRows={3}
            value={spec.captureone.notes ?? ''}
            onChange={(event) =>
              onChange({
                ...spec,
                captureone: {
                  ...spec.captureone,
                  notes: event.target.value,
                },
              })
            }
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <SettingsSuggestIcon fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          Intent tags
        </Typography>
      </Stack>
      <FormGroup row>
        {INTENT_OPTIONS.map((intent) => (
          <FormControlLabel
            key={intent}
            control={<Checkbox checked={spec.intent.includes(intent)} onChange={() => toggleIntent(intent)} />}
            label={intent}
          />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Safe policy
      </Typography>
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={spec.safe?.remove_lens_light_falloff ?? true}
              onChange={(event) => updateSafePolicy('remove_lens_light_falloff', event.target.checked)}
            />
          }
          label="Remove lens light falloff"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={spec.safe?.remove_white_balance ?? true}
              onChange={(event) => updateSafePolicy('remove_white_balance', event.target.checked)}
            />
          }
          label="Remove white balance"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={spec.safe?.remove_exposure ?? false}
              onChange={(event) => updateSafePolicy('remove_exposure', event.target.checked)}
            />
          }
          label="Remove exposure"
        />
      </FormGroup>

      {showAllProperties && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            All Capture One Properties
          </Typography>
          <Stack spacing={1}>
            {Object.entries(spec.captureone.keys).map(([key, value]) => (
              <TextField
                key={key}
                fullWidth
                label={key}
                value={String(value)}
                onChange={(event) => updateGenericKeyValue(key, event.target.value)}
              />
            ))}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="New property key"
                fullWidth
                value={newPropertyKey}
                onChange={(event) => setNewPropertyKey(event.target.value)}
              />
              <TextField
                label="New property value"
                fullWidth
                value={newPropertyValue}
                onChange={(event) => setNewPropertyValue(event.target.value)}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={!newPropertyKey.trim()}
                onClick={() => {
                  updateGenericKeyValue(newPropertyKey.trim(), newPropertyValue)
                  setNewPropertyKey('')
                  setNewPropertyValue('')
                }}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        </>
      )}
    </Box>
  )
}
