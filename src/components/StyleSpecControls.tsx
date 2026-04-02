import { useState, type ReactNode } from 'react'

import AddIcon from '@mui/icons-material/Add'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import type { SafePolicy, StyleSpec } from '../api/types'

type StyleSpecControlsProps = {
  spec: StyleSpec
  onChange: (next: StyleSpec) => void
  showAllProperties: boolean
}

const INTENT_OPTIONS = ['cinematic', 'warm', 'cool', 'natural', 'high-contrast', 'vintage']
const TONE_CURVE_OPTIONS = ['Film Standard', 'Linear', 'Matte Lift', 'Punchy Contrast']
const CORE_NUMERIC_CONTROLS = [
  { key: 'Exposure', label: 'Exposure', min: -2, max: 2, step: 0.1, precision: 1 },
  { key: 'Contrast', label: 'Contrast', min: -100, max: 100, step: 1, precision: 0 },
  { key: 'Saturation', label: 'Saturation', min: -100, max: 100, step: 1, precision: 0 },
  { key: 'Clarity', label: 'Clarity', min: -100, max: 100, step: 1, precision: 0 },
] as const
const COLOR_NUMERIC_CONTROLS = [
  { key: 'WhiteBalanceTemperature', label: 'Temperature', min: 2000, max: 12000, step: 50, precision: 0 },
  { key: 'WhiteBalanceTint', label: 'Tint', min: -50, max: 50, step: 1, precision: 0 },
  { key: 'Highlights', label: 'Highlights', min: -100, max: 100, step: 1, precision: 0 },
  { key: 'Shadows', label: 'Shadows', min: -100, max: 100, step: 1, precision: 0 },
  { key: 'ColorBalanceRed', label: 'Red Balance', min: -50, max: 50, step: 1, precision: 0 },
  { key: 'ColorBalanceGreen', label: 'Green Balance', min: -50, max: 50, step: 1, precision: 0 },
  { key: 'ColorBalanceBlue', label: 'Blue Balance', min: -50, max: 50, step: 1, precision: 0 },
] as const

type ControlDefinition = (typeof CORE_NUMERIC_CONTROLS)[number] | (typeof COLOR_NUMERIC_CONTROLS)[number]

const sliderSx = {
  py: 0.5,
  '& .MuiSlider-rail': {
    opacity: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.5)',
    height: 4,
    borderRadius: 999,
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 4,
    borderRadius: 999,
    background: 'linear-gradient(90deg, rgba(96,165,250,0.9) 0%, rgba(129,140,248,0.95) 100%)',
  },
  '& .MuiSlider-thumb': {
    width: 16,
    height: 16,
    backgroundColor: '#dbeafe',
    border: '2px solid rgba(129,140,248,0.95)',
    boxShadow: '0 0 0 4px rgba(96,165,250,0.12)',
    '&:hover, &.Mui-focusVisible': {
      boxShadow: '0 0 0 6px rgba(96,165,250,0.18)',
    },
  },
  '& .MuiSlider-mark': {
    width: 2,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.55)',
  },
} as const

const checkboxLabelSx = {
  m: 0,
  pr: 1.1,
  py: 0.35,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.08)',
  backgroundColor: 'rgba(255,255,255,0.02)',
  '& .MuiFormControlLabel-label': {
    fontSize: '0.92rem',
    color: 'rgba(226, 232, 240, 0.92)',
  },
} as const

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

  function renderNumericControl(control: ControlDefinition) {
    const value = getNumericKey(control.key, 0)
    const display = control.precision > 0 ? value.toFixed(control.precision) : Math.round(value)

    return (
      <Box key={control.key}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
          <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.92)' }}>
            {control.label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(148, 163, 184, 0.95)' }}>
            {display}
          </Typography>
        </Stack>
        <Slider
          value={value}
          min={control.min}
          max={control.max}
          step={control.step}
          marks={control.key === 'Exposure'}
          onChange={(_, next) => updateNumericKey(control.key, Number(next))}
          sx={sliderSx}
        />
      </Box>
    )
  }

  function sectionCard(title: string, subtitle: string, content: ReactNode) {
    return (
      <Box
        sx={{
          p: 1.75,
          borderRadius: 2.5,
          border: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(12, 18, 28, 0.56)',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.35 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.4 }}>
          {subtitle}
        </Typography>
        {content}
      </Box>
    )
  }

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
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <AutoFixHighIcon fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>
          Style Properties
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' } }}>
        {sectionCard(
          'Light',
          'Balance exposure and shape contrast.',
          <Box sx={{ display: 'grid', gap: 1.35, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            {CORE_NUMERIC_CONTROLS.map((control) => renderNumericControl(control))}
          </Box>,
        )}

        {sectionCard(
          'Color',
          'Adjust white balance and color bias.',
          <Box sx={{ display: 'grid', gap: 1.35, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            {COLOR_NUMERIC_CONTROLS.map((control) => renderNumericControl(control))}
          </Box>,
        )}

        {sectionCard(
          'Mood',
          'Define character, curve and overall feel.',
          <Stack spacing={1.5}>
            <FormControl fullWidth size="small">
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

            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SettingsSuggestIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Intent tags
                </Typography>
              </Stack>
              <FormGroup row sx={{ gap: 1 }}>
                {INTENT_OPTIONS.map((intent) => (
                  <FormControlLabel
                    key={intent}
                    sx={checkboxLabelSx}
                    control={<Checkbox checked={spec.intent.includes(intent)} onChange={() => toggleIntent(intent)} />}
                    label={intent}
                  />
                ))}
              </FormGroup>
            </Box>
          </Stack>,
        )}

        {sectionCard(
          'Output Safety',
          'Protect export behavior and optional removals.',
          <Stack spacing={1}>
            <FormGroup sx={{ gap: 1 }}>
              <FormControlLabel
                sx={checkboxLabelSx}
                control={
                  <Checkbox
                    checked={spec.safe?.remove_lens_light_falloff ?? true}
                    onChange={(event) => updateSafePolicy('remove_lens_light_falloff', event.target.checked)}
                  />
                }
                label="Remove lens light falloff"
              />
              <FormControlLabel
                sx={checkboxLabelSx}
                control={
                  <Checkbox
                    checked={spec.safe?.remove_white_balance ?? true}
                    onChange={(event) => updateSafePolicy('remove_white_balance', event.target.checked)}
                  />
                }
                label="Remove white balance"
              />
              <FormControlLabel
                sx={checkboxLabelSx}
                control={
                  <Checkbox
                    checked={spec.safe?.remove_exposure ?? false}
                    onChange={(event) => updateSafePolicy('remove_exposure', event.target.checked)}
                  />
                }
                label="Remove exposure"
              />
            </FormGroup>

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
          </Stack>,
        )}
      </Box>

      {showAllProperties && (
        <>
          <Accordion
            disableGutters
            defaultExpanded={false}
            sx={{
              mt: 1.5,
              borderRadius: 2.5,
              backgroundColor: 'rgba(12, 18, 28, 0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack spacing={0.2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  All Capture One Properties
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Inspect and edit raw keys when you need full control.
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
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
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  )
}
