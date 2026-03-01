import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App integration', () => {
  afterEach(() => {
    cleanup()
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

  it('generates style spec from AI and updates editor fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)

        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
        }

        if (url.endsWith('/ai/generate-style-spec') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              style_spec: {
                name: 'AI Golden Hour',
                intent: ['warm', 'portrait'],
                captureone: {
                  keys: {
                    Exposure: 0.2,
                    Contrast: 6,
                  },
                  notes: 'Golden hour inspired look.',
                },
                safe: {
                  remove_lens_light_falloff: true,
                  remove_white_balance: true,
                  remove_exposure: false,
                },
              },
              rationale: 'Generated from prompt.',
              warnings: [],
              provider: 'mock',
              model: 'mock-v1',
            }),
            { status: 200 },
          )
        }

        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)

    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'warm portrait with soft highlights')
    await user.click(screen.getByRole('button', { name: 'Generate StyleSpec' }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('AI Golden Hour')).toBeInTheDocument()
    })
    expect(await screen.findByText(/Generated with/i)).toBeInTheDocument()
  })
})
