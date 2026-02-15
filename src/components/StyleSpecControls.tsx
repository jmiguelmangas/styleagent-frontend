import type { SafePolicy, StyleSpec } from '../api/types'

type StyleSpecControlsProps = {
  spec: StyleSpec
  onChange: (next: StyleSpec) => void
}

const INTENT_OPTIONS = ['cinematic', 'warm', 'cool', 'natural', 'high-contrast', 'vintage']
const TONE_CURVE_OPTIONS = ['Film Standard', 'Linear', 'Matte Lift', 'Punchy Contrast']

export function StyleSpecControls({ spec, onChange }: StyleSpecControlsProps) {
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
    <div className="style-controls">
      <h3>Style Properties</h3>

      <div className="style-grid">
        <label htmlFor="exposure">
          Exposure <span>{getNumericKey('Exposure', 0).toFixed(1)}</span>
        </label>
        <input
          id="exposure"
          type="range"
          min={-2}
          max={2}
          step={0.1}
          value={getNumericKey('Exposure', 0)}
          onChange={(event) => updateNumericKey('Exposure', Number(event.target.value))}
        />

        <label htmlFor="contrast">
          Contrast <span>{Math.round(getNumericKey('Contrast', 0))}</span>
        </label>
        <input
          id="contrast"
          type="range"
          min={-100}
          max={100}
          step={1}
          value={getNumericKey('Contrast', 0)}
          onChange={(event) => updateNumericKey('Contrast', Number(event.target.value))}
        />

        <label htmlFor="saturation">
          Saturation <span>{Math.round(getNumericKey('Saturation', 0))}</span>
        </label>
        <input
          id="saturation"
          type="range"
          min={-100}
          max={100}
          step={1}
          value={getNumericKey('Saturation', 0)}
          onChange={(event) => updateNumericKey('Saturation', Number(event.target.value))}
        />

        <label htmlFor="clarity">
          Clarity <span>{Math.round(getNumericKey('Clarity', 0))}</span>
        </label>
        <input
          id="clarity"
          type="range"
          min={-100}
          max={100}
          step={1}
          value={getNumericKey('Clarity', 0)}
          onChange={(event) => updateNumericKey('Clarity', Number(event.target.value))}
        />

        <label htmlFor="tone-curve">Tone Curve</label>
        <select
          id="tone-curve"
          value={typeof spec.captureone.keys.ToneCurve === 'string' ? spec.captureone.keys.ToneCurve : 'Film Standard'}
          onChange={(event) => updateStringKey('ToneCurve', event.target.value)}
        >
          {TONE_CURVE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label htmlFor="captureone-notes">Capture One Notes</label>
        <textarea
          id="captureone-notes"
          rows={3}
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
      </div>

      <div className="choice-block">
        <p>Intent tags</p>
        <div className="checkbox-grid">
          {INTENT_OPTIONS.map((intent) => (
            <label key={intent} className="check-item">
              <input
                type="checkbox"
                checked={spec.intent.includes(intent)}
                onChange={() => toggleIntent(intent)}
              />
              <span>{intent}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="choice-block">
        <p>Safe policy</p>
        <div className="checkbox-grid">
          <label className="check-item">
            <input
              type="checkbox"
              checked={spec.safe?.remove_lens_light_falloff ?? true}
              onChange={(event) => updateSafePolicy('remove_lens_light_falloff', event.target.checked)}
            />
            <span>Remove lens light falloff</span>
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={spec.safe?.remove_white_balance ?? true}
              onChange={(event) => updateSafePolicy('remove_white_balance', event.target.checked)}
            />
            <span>Remove white balance</span>
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={spec.safe?.remove_exposure ?? false}
              onChange={(event) => updateSafePolicy('remove_exposure', event.target.checked)}
            />
            <span>Remove exposure</span>
          </label>
        </div>
      </div>
    </div>
  )
}
