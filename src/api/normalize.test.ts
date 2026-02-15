import { describe, expect, it } from 'vitest'

import { parseHealthResponse, parseStyle } from './normalize'

describe('parseHealthResponse', () => {
  it('accepts valid health payload', () => {
    expect(parseHealthResponse({ status: 'ok' })).toEqual({ status: 'ok' })
  })

  it('rejects invalid health payload', () => {
    expect(() => parseHealthResponse({ status: 'down' })).toThrowError(
      'Invalid health response payload',
    )
  })
})

describe('parseStyle', () => {
  it('accepts valid style payload', () => {
    expect(
      parseStyle({
        style_id: 'style_1',
        name: 'Nolan Warm',
        slug: 'nolan-warm',
        created_at: new Date().toISOString(),
      }),
    ).toMatchObject({
      style_id: 'style_1',
      name: 'Nolan Warm',
      slug: 'nolan-warm',
    })
  })

  it('rejects invalid style payload', () => {
    expect(() => parseStyle({ name: 'Broken Style' })).toThrowError('Invalid style payload')
  })
})
