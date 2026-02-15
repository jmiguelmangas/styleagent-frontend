import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App integration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders backend health status when API responds ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 })),
    )

    render(<App />)

    expect(await screen.findByText('Backend status: ok')).toBeInTheDocument()
  })

  it('renders network error message when backend is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('NetworkError')
      }),
    )

    render(<App />)

    expect(await screen.findByText(/Network error\. Could not reach backend service\./)).toBeInTheDocument()
  })
})
