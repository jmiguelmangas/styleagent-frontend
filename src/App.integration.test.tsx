import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App integration', { timeout: 15_000 }, () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders backend health status when API responds ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
        }
        if (url.includes('/ai/generations')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }
        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)

    expect(await screen.findByText('Backend ok')).toBeInTheDocument()
    expect(await screen.findByText('AI ready')).toBeInTheDocument()
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

        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
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
        if (url.includes('/ai/generations')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }

        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Describe the look/i }))
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'warm portrait with soft highlights')
    await user.click(screen.getByRole('button', { name: 'Generate StyleSpec' }))

    expect(await screen.findByText(/Latency:\s*42ms/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByDisplayValue('AI Golden Hour')).toBeInTheDocument()
  })

  it('previews the exact AI prompt and selected examples', async () => {
    let previewRequestBody: Record<string, unknown> | null = null
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)

        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
        }
        if (url.includes('/ai/generations')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }
        if (url.endsWith('/ai/debug/prompt-preview') && init?.method === 'POST') {
          previewRequestBody = JSON.parse(String(init.body))
          return new Response(
            JSON.stringify({
              provider: 'ollama',
              model: 'llama3.1:8b',
              prompt: 'SYSTEM: build a cinematic preset\nEXAMPLE: Fujicolor Everyday\nUSER: tokyo night cinematic',
              examples_count: 1,
              examples: [
                {
                  source: 'Fujicolor Everyday',
                  prompt: 'Warm filmic street photography look',
                  intent: ['cinematic', 'warm'],
                },
              ],
            }),
            { status: 200 },
          )
        }

        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Describe the look/i }))
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'tokyo night cinematic')
    await user.click(screen.getByRole('button', { name: 'intensity-bold' }))
    await user.click(screen.getByRole('button', { name: 'Preview Prompt' }))

    expect(await screen.findByText(/Prompt preview ready with/i)).toBeInTheDocument()
    expect(await screen.findByText('Fujicolor Everyday')).toBeInTheDocument()
    expect(previewRequestBody).not.toBeNull()
    if (!previewRequestBody) {
      throw new Error('Expected preview request body to be captured')
    }
    const previewConstraints = (previewRequestBody as Record<string, unknown>)['constraints']
    expect(previewConstraints).toEqual({ intensity: 'bold' })
    await user.click(screen.getByRole('button', { name: 'Show full prompt' }))
    expect(await screen.findByText(/SYSTEM: build a cinematic preset/)).toBeInTheDocument()
  })

  it('sends selected intensity when generating a style spec', async () => {
    let generateRequestBody: Record<string, unknown> | null = null
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)

        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
        }
        if (url.includes('/ai/generations')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }
        if (url.endsWith('/ai/generate-style-spec') && init?.method === 'POST') {
          generateRequestBody = JSON.parse(String(init.body))
          return new Response(
            JSON.stringify({
              style_spec: {
                name: 'AI Cinematic Bold',
                intent: ['cinematic', 'portrait'],
                captureone: {
                  keys: {
                    Exposure: 0.1,
                    Contrast: 14,
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
              provider: 'ollama',
              model: 'llama3.1:8b',
              generation_ms: 51,
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
    await user.click(screen.getByRole('button', { name: /Describe the look/i }))
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'cinematic portrait')
    await user.click(screen.getByRole('button', { name: 'intensity-subtle' }))
    await user.click(screen.getByRole('button', { name: 'Generate StyleSpec' }))

    expect(await screen.findByText(/Latency:\s*51ms/)).toBeInTheDocument()
    expect(generateRequestBody).not.toBeNull()
    if (!generateRequestBody) {
      throw new Error('Expected generate request body to be captured')
    }
    const generateConstraints = (generateRequestBody as Record<string, unknown>)['constraints']
    expect(generateConstraints).toEqual({ intensity: 'subtle' })
  })

  it('generates and saves style/version in one action', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)

        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
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
        if (url.includes('/ai/generations')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }
        if (url.endsWith('/styles') && (!init?.method || init.method === 'GET')) {
          return new Response(JSON.stringify([]), { status: 200 })
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
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Describe the look/i }))
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'cinematic style')
    await user.click(screen.getByRole('button', { name: 'Generate + Save Version' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/styles\/style_ai_1\/versions$/),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('compiles and downloads from one action in api mode', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/ai/health')) {
        return new Response(
          JSON.stringify({
            status: 'available',
            available: true,
            provider: 'ollama',
            model: 'llama3.1:8b',
            message: 'Ollama is reachable and model llama3.1:8b is installed.',
          }),
          { status: 200 },
        )
      }
      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
      }
      if (url.endsWith('/styles') && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify([]), { status: 200 })
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
      if (url.includes('/ai/generations')) {
        return new Response(JSON.stringify([]), { status: 200 })
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
    await user.click(screen.getByRole('button', { name: /Describe the look/i }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Save preset' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/styles\/style_dl_1\/versions$/),
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(await screen.findByText(/Download Ready v1 is ready for export or Capture One sync\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Export .costyle' }))

    await waitFor(() => {
      expect(screen.getByText('Artifact ID: artifact_dl_1')).toBeInTheDocument()
    })
    expect(await screen.findByText(/The latest saved preset was compiled and the \.costyle download has started\./)).toBeInTheDocument()
    expect(await screen.findByText(/compiled and the \.costyle download has started/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/artifacts\/artifact_dl_1$/),
      expect.any(Object),
    )
  })

  it('reuses an existing matching preset version in save and export', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/ai/health')) {
        return new Response(
          JSON.stringify({
            status: 'available',
            available: true,
            provider: 'ollama',
            model: 'llama3.1:8b',
            message: 'Ollama is reachable and model llama3.1:8b is installed.',
          }),
          { status: 200 },
        )
      }
      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
      }
      if (url.includes('/ai/generations')) {
        return new Response(JSON.stringify([]), { status: 200 })
      }
      if (url.endsWith('/styles') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify([
            {
              style_id: 'style_existing',
              name: 'Nolan Warm',
              slug: 'nolan-warm',
              created_at: '2026-03-01T00:00:00Z',
            },
          ]),
          { status: 200 },
        )
      }
      if (url.endsWith('/styles/style_existing/versions/v1') && init?.method !== 'POST') {
        return new Response(
          JSON.stringify({
            style_id: 'style_existing',
            version: 'v1',
            style_spec: {
              name: 'Nolan Warm',
              intent: ['cinematic', 'warm'],
              captureone: {
                keys: {
                  Exposure: 0.3,
                  Contrast: 9,
                  Saturation: 6,
                  Clarity: 8,
                  WhiteBalanceTemperature: 5600,
                  WhiteBalanceTint: 2,
                  Highlights: -8,
                  Shadows: 10,
                  ColorBalanceRed: 3,
                  ColorBalanceGreen: 0,
                  ColorBalanceBlue: -2,
                  ToneCurve: 'Film Standard',
                },
                notes: 'Balanced skin tones with gentle contrast.',
              },
              safe: {
                remove_lens_light_falloff: true,
                remove_white_balance: true,
                remove_exposure: false,
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
      if (url.endsWith('/styles/style_existing/versions/v1/compile?target=captureone') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            artifact_id: 'artifact_existing',
            sha256: 'reuse123',
            download_url: 'http://localhost:8000/artifacts/artifact_existing',
          }),
          { status: 200 },
        )
      }
      if (url.endsWith('/artifacts/artifact_existing')) {
        return new Response(new Blob(['costyle-bytes']), { status: 200 })
      }
      if (url.endsWith('/styles/style_existing/artifacts')) {
        return new Response(JSON.stringify([]), { status: 200 })
      }

      return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    render(<App />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Describe the look/i }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Save preset' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/styles\/style_existing\/versions\/v1$/),
        expect.anything(),
      )
    })
    expect(await screen.findByText(/Nolan Warm v1 is ready for export or Capture One sync\./)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Export .costyle' }))

    await waitFor(() => {
      expect(screen.getByText('Artifact ID: artifact_existing')).toBeInTheDocument()
    })
    expect(await screen.findByText(/The latest saved preset was compiled and the \.costyle download has started\./)).toBeInTheDocument()

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/styles$/),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/styles\/style_existing\/versions$/),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows cooldown UI when AI endpoint is rate limited', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
        }
        if (url.endsWith('/ai/generate-style-spec') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              message: 'AI generation rate limit exceeded. Please retry shortly.',
            }),
            { status: 429 },
          )
        }
        if (url.includes('/ai/generations')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }
        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Describe the look/i }))
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'rate limit prompt')
    await user.click(screen.getByRole('button', { name: 'Generate StyleSpec' }))

    expect(await screen.findByText(/AI rate limit active\. Retry in/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate StyleSpec' })).toBeDisabled()
  })

  it('renders persisted AI generation history entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
        }
        if (url.includes('/ai/generations')) {
          return new Response(
            JSON.stringify([
              {
                generation_id: 'gen_1',
                created_at: '2026-03-01T00:00:00Z',
                client_key: '127.0.0.1',
                prompt: 'cinematic warm portrait',
                intent: ['cinematic', 'warm'],
                constraints: null,
                target: 'captureone',
                style_spec: {
                  name: 'AI Cinematic Warm',
                  intent: ['cinematic', 'warm'],
                  captureone: {
                    keys: {
                      Exposure: 0.2,
                      Contrast: 8,
                    },
                  },
                },
                rationale: 'Generated from prompt',
                warnings: [],
                provider: 'mock',
                model: 'mock-v1',
                generation_ms: 37,
                fallback_used: false,
              },
            ]),
            { status: 200 },
          )
        }
        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'History and previous exports' }))
    expect(await screen.findByText('AI generation history')).toBeInTheDocument()
    expect(await screen.findByText('AI Cinematic Warm')).toBeInTheDocument()
    expect(await screen.findByText('Prompt: cinematic warm portrait')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use this preset' }))
    expect(await screen.findByDisplayValue('AI Cinematic Warm')).toBeInTheDocument()
  })

  it('creates AI chat turn and applies it', async () => {
    const chatTurnRequestBodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/ai/health')) {
          return new Response(
            JSON.stringify({
              status: 'available',
              available: true,
              provider: 'ollama',
              model: 'llama3.1:8b',
              message: 'Ollama is reachable and model llama3.1:8b is installed.',
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
        }
        if (url.includes('/ai/generations')) {
          return new Response(JSON.stringify([]), { status: 200 })
        }
        if (url.endsWith('/ai/planner-options')) {
          return new Response(
            JSON.stringify({
              families: ['cinematic_portrait', 'gothic_fantasy'],
              refinements: ['cool_teal', 'warm_skin'],
              intensities: ['subtle', 'balanced', 'bold'],
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/ai/chat/sessions') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              session_id: 'sess_1',
              title: 'Session',
              status: 'active',
              style_spec: {
                name: 'Base',
                intent: ['portrait'],
                captureone: { keys: { Exposure: 0.1, Contrast: 4 } },
              },
              created_at: '2026-03-01T00:00:00Z',
              updated_at: '2026-03-01T00:00:00Z',
            }),
            { status: 201 },
          )
        }
        if (url.endsWith('/ai/chat/sessions/sess_1/turns') && init?.method === 'POST') {
          const parsedBody = JSON.parse(String(init.body))
          chatTurnRequestBodies.push(parsedBody)
          const turnId = chatTurnRequestBodies.length === 1 ? 'turn_1' : 'turn_2'
          const userMessage =
            typeof parsedBody.message === 'string' ? parsedBody.message : 'chat message'
          const familyId =
            typeof parsedBody.family_id === 'string' ? parsedBody.family_id : 'cinematic_portrait'
          const intensity =
            parsedBody.intensity === 'subtle' || parsedBody.intensity === 'balanced' || parsedBody.intensity === 'bold'
              ? parsedBody.intensity
              : 'bold'
          return new Response(
            JSON.stringify({
              session: {
                session_id: 'sess_1',
                title: 'Session',
                status: 'active',
                style_spec: {
                  name: 'Base',
                  intent: ['portrait'],
                  captureone: { keys: { Exposure: 0.1, Contrast: 4 } },
                },
                created_at: '2026-03-01T00:00:00Z',
                updated_at: '2026-03-01T00:00:00Z',
              },
              turn: {
                turn_id: turnId,
                session_id: 'sess_1',
                user_message: userMessage,
                assistant_message: 'I prepared updates.',
                proposed_changes: [{ key: 'Contrast', from_value: 4, to_value: 8 }],
                warnings: [],
                guidance: {
                  detected_goals: ['contrast_tuning'],
                  reasoning_summary: 'Detected contrast goal.',
                  suggested_next_messages: ['reduce highlights'],
                },
                planner_trace: {
                  mode: 'direct_style_spec',
                  family_id: familyId,
                  refinement_ids: [],
                  intensity,
                  source: 'fake',
                },
                applied: false,
                created_at: '2026-03-01T00:00:01Z',
              },
            }),
            { status: 201 },
          )
        }
        if (
          (url.endsWith('/ai/chat/sessions/sess_1/turns/turn_1/apply') ||
            url.endsWith('/ai/chat/sessions/sess_1/turns/turn_2/apply')) &&
          init?.method === 'POST'
        ) {
          const turnId = url.endsWith('/turn_2/apply') ? 'turn_2' : 'turn_1'
          const userMessage =
            turnId === 'turn_2'
              ? 'Cool the shadows while protecting skin tones and keeping the look cohesive.'
              : 'add contrast'
          return new Response(
            JSON.stringify({
              session: {
                session_id: 'sess_1',
                title: 'Session',
                status: 'active',
                style_spec: {
                  name: 'Base',
                  intent: ['portrait'],
                  captureone: { keys: { Exposure: 0.1, Contrast: 8 } },
                },
                created_at: '2026-03-01T00:00:00Z',
                updated_at: '2026-03-01T00:00:02Z',
              },
              turn: {
                turn_id: turnId,
                session_id: 'sess_1',
                user_message: userMessage,
                assistant_message: 'I prepared updates.',
                proposed_changes: [{ key: 'Contrast', from_value: 4, to_value: 8 }],
                warnings: [],
                guidance: {
                  detected_goals: ['contrast_tuning'],
                  reasoning_summary: 'Detected contrast goal.',
                  suggested_next_messages: ['reduce highlights'],
                },
                planner_trace: {
                  mode: 'direct_style_spec',
                  family_id: 'cinematic_portrait',
                  refinement_ids: [],
                  intensity: 'bold',
                  source: 'fake',
                },
                applied: true,
                created_at: '2026-03-01T00:00:01Z',
              },
            }),
            { status: 200 },
          )
        }
        return new Response(JSON.stringify({ message: 'Not mocked' }), { status: 404 })
      }),
    )

    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Start a conversation/i }))
    await user.click(screen.getByRole('button', { name: 'chat-intensity-bold' }))
    await user.type(screen.getByRole('textbox', { name: 'Message to AI' }), 'add contrast')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/Detected contrast goal/)).toBeInTheDocument()
    expect(await screen.findByText('Family: cinematic_portrait')).toBeInTheDocument()
    expect(chatTurnRequestBodies[0]).toEqual({
      message: 'add contrast',
      auto_apply: false,
      family_id: null,
      intensity: 'bold',
    })
    await user.click(screen.getByRole('button', { name: 'Cooler shadows' }))
    await waitFor(() => {
      expect(chatTurnRequestBodies[1]).toEqual({
        message: 'Cool the shadows while protecting skin tones and keeping the look cohesive.',
        auto_apply: false,
        family_id: 'cinematic_portrait',
        intensity: 'bold',
      })
    })
    const applyButtons = screen.getAllByRole('button', { name: 'Apply turn' })
    await user.click(applyButtons[applyButtons.length - 1])
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Apply turn' })).toHaveLength(1)
    })
    expect(
      screen.getByText('Cool the shadows while protecting skin tones and keeping the look cohesive.'),
    ).toBeInTheDocument()
  })
})
