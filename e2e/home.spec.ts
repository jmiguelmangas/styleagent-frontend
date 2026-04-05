import { expect, test, type Page } from '@playwright/test'

function mockApi(page: Page) {
  let artifactsCallCount = 0

  page.route(/.*\/health$/, async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/ai/health') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'available',
          available: true,
          provider: 'ollama',
          model: 'llama3.1:8b',
          message: 'Ollama is reachable and model llama3.1:8b is installed.',
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    })
  })

  page.route('**/ai/generations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
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
            captureone: { keys: { Exposure: 0.2, Contrast: 8 } },
          },
          rationale: 'Generated from prompt',
          warnings: [],
          provider: 'mock',
          model: 'mock-v1',
          generation_ms: 37,
          fallback_used: false,
        },
      ]),
    })
  })

  page.route('**/ai/planner-options', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        families: ['cinematic_portrait', 'gothic_fantasy'],
        refinements: ['cool_teal', 'warm_skin'],
        intensities: ['subtle', 'balanced', 'bold'],
      }),
    })
  })

  page.route('**/ai/debug/prompt-preview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'ollama',
        model: 'llama3.1:8b',
        prompt: 'SYSTEM: build a cinematic preset\nUSER: tokyo night',
        examples_count: 1,
        examples: [
          {
            source: 'Fujicolor Everyday',
            prompt: 'Warm filmic street photography look',
            intent: ['cinematic', 'warm'],
          },
        ],
      }),
    })
  })

  page.route('**/styles', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        style_id: 'style_123',
        name: 'Nolan Warm',
        slug: 'nolan-warm',
        created_at: '2026-02-15T00:00:00Z',
      }),
    })
  })

  page.route('**/ai/generate-style-spec', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        style_spec: {
          name: 'AI Nolan Warm',
          intent: ['cinematic', 'warm'],
          captureone: {
            keys: {
              Exposure: 0.2,
              Contrast: 8,
              WhiteBalanceTemperature: 5800,
              Highlights: -12,
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
        generation_ms: 37,
        fallback_used: false,
      }),
    })
  })

  page.route('**/ai/chat/sessions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
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
    })
  })

  let chatTurnCount = 0

  page.route('**/ai/chat/sessions/sess_1/turns', async (route) => {
    chatTurnCount += 1
    const body = route.request().postDataJSON() as {
      message?: string
      family_id?: string | null
      intensity?: 'subtle' | 'balanced' | 'bold'
    }
    const turnId = chatTurnCount === 1 ? 'turn_1' : 'turn_2'
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
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
          user_message: body.message ?? 'add contrast',
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
            family_id: body.family_id ?? 'cinematic_portrait',
            refinement_ids: [],
            intensity: body.intensity ?? 'bold',
            source: 'fake',
          },
          applied: false,
          created_at: '2026-03-01T00:00:01Z',
        },
      }),
    })
  })

  page.route(/.*\/ai\/chat\/sessions\/sess_1\/turns\/turn_(1|2)\/apply$/, async (route) => {
    const isSecondTurn = route.request().url().endsWith('/turn_2/apply')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
          turn_id: isSecondTurn ? 'turn_2' : 'turn_1',
          session_id: 'sess_1',
          user_message: isSecondTurn
            ? 'Cool the shadows while protecting skin tones and keeping the look cohesive.'
            : 'add contrast',
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
    })
  })

  page.route('**/styles/style_123/versions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        style_id: 'style_123',
        version: 'v1',
        style_spec: {
          name: 'Nolan Warm',
          intent: ['cinematic', 'warm'],
          captureone: { keys: { Exposure: 0.3, Contrast: 9 } },
        },
        safe_policy: {
          remove_lens_light_falloff: true,
          remove_white_balance: true,
          remove_exposure: false,
        },
        created_at: '2026-02-15T00:00:10Z',
      }),
    })
  })

  page.route('**/styles/style_123/versions/v1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        style_id: 'style_123',
        version: 'v1',
        style_spec: {
          name: 'AI Nolan Warm',
          intent: ['cinematic', 'warm'],
          captureone: {
            keys: {
              Exposure: 0.2,
              Contrast: 8,
              WhiteBalanceTemperature: 5800,
              Highlights: -12,
            },
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
        created_at: '2026-02-15T00:00:10Z',
      }),
    })
  })

  page.route('**/styles/style_123/versions/v1/compile?target=captureone', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        artifact_id: 'artifact_001',
        sha256: 'abc123',
        download_url: 'http://localhost:8000/artifacts/artifact_001',
      }),
    })
  })

  page.route('**/styles/style_123/artifacts', async (route) => {
    artifactsCallCount += 1
    const artifacts =
      artifactsCallCount > 1
        ? [
            {
              artifact_id: 'artifact_001',
              style_id: 'style_123',
              version: 'v1',
              target: 'captureone',
              path: '/tmp/nolan-warm-v1.costyle',
              sha256: 'abc123',
              created_at: '2026-02-15T00:00:20Z',
            },
          ]
        : []

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(artifacts),
    })
  })

  page.route('**/artifacts/artifact_001', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: 'fake-costyle-bytes',
    })
  })
}

test('renders a dark wizard shell with a single backend status indicator', async ({ page }) => {
  mockApi(page)
  await page.goto('/')

  await expect(page.getByText('Create a look step by step')).toBeVisible()
  await expect(page.getByText('Backend ok')).toHaveCount(1)
  await expect(page.getByText('AI ready')).toHaveCount(1)
  await expect(page.getByText('Choose how you want to start')).toBeVisible()
  await expect(page.getByText('Create your first look')).toHaveCount(0)

  await page.getByText('AI ready').hover()
  await expect(page.getByText('ollama / llama3.1:8b')).toBeVisible()

  const pageBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(pageBackground).not.toBe('rgb(255, 255, 255)')
})

test('runs the wizard flow end to end in generator mode', async ({ page }) => {
  mockApi(page)
  await page.goto('/')

  await page.getByRole('button', { name: /Describe the look/i }).click()
  await expect(page.getByText('Create your first look')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Balanced' })).toBeVisible()
  await page.getByRole('button', { name: 'Bold' }).click()
  await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('textbox', { name: 'Prompt' }).fill('cinematic warm look')
  await page.getByRole('button', { name: 'Generate StyleSpec' }).click()
  await expect(page.getByText('Generated with')).toBeVisible()
  await expect(page.getByText('Latency: 37ms')).toBeVisible()

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Refine the look' })).toBeVisible()
  await expect(page.getByLabel('Preset name')).toHaveValue('AI Nolan Warm')

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Save and export' })).toBeVisible()
  await page.getByRole('button', { name: 'Save preset' }).first().click()
  await expect(page.locator('text=Style ID: style_123').first()).toBeVisible()
  await expect(page.getByRole('alert').getByText('Preset saved')).toBeVisible()

  await page.getByRole('button', { name: 'Export .costyle' }).first().click()
  await expect(page.locator('text=Artifact ID: artifact_001').first()).toBeVisible()
  await expect(page.getByText('Export started')).toBeVisible()
})

test('supports chat mode in the wizard and applies a turn', async ({ page }) => {
  mockApi(page)
  await page.goto('/')

  await page.getByRole('button', { name: /Start a conversation/i }).click()
  await page.getByRole('button', { name: 'chat-intensity-bold' }).click()
  await page.getByRole('textbox', { name: 'Message to AI' }).fill('add contrast')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText('Detected contrast goal.')).toBeVisible()
  await expect(page.getByText('Family: cinematic_portrait')).toBeVisible()
  await page.getByRole('button', { name: 'Cooler shadows' }).click()
  await expect(page.getByText('2 turns')).toBeVisible()
  await page.getByRole('button', { name: 'Apply turn' }).nth(1).click()
  await expect(page.getByText('Applied')).toHaveCount(1)
})

test('keeps dark surfaces in generator and refine steps', async ({ page }) => {
  mockApi(page)
  await page.goto('/')

  await page.getByRole('button', { name: /Describe the look/i }).click()

  const generatorBackground = await page
    .getByText('AI Style Generator')
    .locator('xpath=ancestor::*[contains(@class,"MuiBox-root")][1]')
    .evaluate((node) => getComputedStyle(node as HTMLElement).backgroundColor)
  expect(generatorBackground).not.toBe('rgb(255, 255, 255)')

  await page.getByRole('textbox', { name: 'Prompt' }).fill('tokyo night cinematic')
  await page.getByRole('button', { name: 'Generate StyleSpec' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  const refineBackground = await page
    .getByText('Style Properties')
    .locator('xpath=ancestor::*[contains(@class,"MuiBox-root")][1]')
    .evaluate((node) => getComputedStyle(node as HTMLElement).backgroundColor)
  expect(refineBackground).not.toBe('rgb(255, 255, 255)')
})
