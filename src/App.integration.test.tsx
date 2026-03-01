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
              generation_ms: 42,
              fallback_used: false,
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
    expect(await screen.findByText(/Latency:\s*42ms/)).toBeInTheDocument()
  })

  it('generates and saves style/version in one action', async () => {
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
                name: 'AI Auto Save',
                intent: ['cinematic'],
                captureone: {
                  keys: {
                    Exposure: 0.1,
                    Contrast: 8,
                  },
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
              generation_ms: 51,
              fallback_used: false,
            }),
            { status: 200 },
          )
        }

        if (url.endsWith('/styles') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              style_id: 'style_ai_1',
              name: 'AI Auto Save',
              slug: 'ai-auto-save',
              created_at: '2026-03-01T00:00:00Z',
            }),
            { status: 200 },
          )
        }

        if (url.endsWith('/styles/style_ai_1/versions') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              style_id: 'style_ai_1',
              version: 'v1',
              style_spec: {
                name: 'AI Auto Save',
                intent: ['cinematic'],
                captureone: {
                  keys: {
                    Exposure: 0.1,
                    Contrast: 8,
                  },
                },
              },
              safe_policy: {
                remove_lens_light_falloff: true,
                remove_white_balance: true,
                remove_exposure: false,
              },
              created_at: '2026-03-01T00:00:05Z',
            }),
            { status: 200 },
          )
        }

        if (url.endsWith('/styles/style_ai_1/artifacts')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }

        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)

    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'cinematic style')
    await user.click(screen.getByRole('button', { name: 'Generate + Save Version' }))

    const styleIdLabel = await screen.findByText('Style ID:')
    const versionLabel = await screen.findByText('Version:')

    await waitFor(() => {
      expect(styleIdLabel.parentElement).toHaveTextContent('style_ai_1')
      expect(versionLabel.parentElement).toHaveTextContent('v1')
    })
  })

  it('compiles and downloads from one action in api mode', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
      }
      if (url.endsWith('/styles') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            style_id: 'style_dl_1',
            name: 'Download Ready',
            slug: 'download-ready',
            created_at: '2026-03-01T00:00:00Z',
          }),
          { status: 200 },
        )
      }
      if (url.endsWith('/styles/style_dl_1/versions') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            style_id: 'style_dl_1',
            version: 'v1',
            style_spec: {
              name: 'Download Ready',
              intent: ['cinematic'],
              captureone: { keys: { Exposure: 0.1, Contrast: 8 } },
            },
            safe_policy: {
              remove_lens_light_falloff: true,
              remove_white_balance: true,
              remove_exposure: false,
            },
            created_at: '2026-03-01T00:00:05Z',
          }),
          { status: 200 },
        )
      }
      if (url.endsWith('/styles/style_dl_1/versions/v1/compile?target=captureone') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            artifact_id: 'artifact_dl_1',
            sha256: 'abc123',
            download_url: 'http://localhost:8000/artifacts/artifact_dl_1',
          }),
          { status: 200 },
        )
      }
      if (url.endsWith('/artifacts/artifact_dl_1')) {
        return new Response(new Blob(['costyle-bytes']), { status: 200 })
      }
      if (url.endsWith('/styles/style_dl_1/artifacts')) {
        return new Response(JSON.stringify([]), { status: 200 })
      }

      return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    render(<App />)

    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Style name'))
    await user.type(screen.getByLabelText('Style name'), 'Download Ready')
    await user.click(screen.getByRole('button', { name: '1. Create Style' }))
    await user.click(screen.getByRole('button', { name: '2. Create Version' }))
    await user.click(screen.getByRole('button', { name: '3b. Compile + Download' }))

    await waitFor(() => {
      expect(screen.getByText(/Artifact ID:/).parentElement).toHaveTextContent('artifact_dl_1')
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/artifacts\/artifact_dl_1$/),
      expect.any(Object),
    )
  })
})
