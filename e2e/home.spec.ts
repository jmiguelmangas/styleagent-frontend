import { expect, test, type Page } from '@playwright/test'

function mockApi(page: Page) {
  let artifactsCallCount = 0

  page.route('**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    })
  })

  page.route('**/styles', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
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
}

test('supports guided and advanced style editing modes', async ({ page }) => {
  mockApi(page)
  await page.goto('/')

  await expect(page.getByText('Backend status: ok')).toBeVisible()
  await expect(page.getByLabel('guided-mode')).toBeVisible()
  await expect(page.getByLabel('advanced-mode')).toBeVisible()
  await expect(page.getByText('Show all properties')).toBeVisible()

  await page.getByLabel('advanced-mode').click()
  await expect(page.getByLabel('StyleSpec JSON')).toBeVisible()

  await page.getByLabel('StyleSpec JSON').fill('{')
  await expect(page.getByText('JSON contains errors. Fix it before creating a version.')).toBeVisible()

  await page.getByLabel('guided-mode').click()
  await page.getByText('Show all properties').click()
  await expect(page.getByText('All Capture One Properties')).toBeVisible()
})

test('runs the core flow with mocked backend', async ({ page }) => {
  mockApi(page)
  await page.goto('/')

  await page.getByRole('button', { name: '1. Create Style' }).click()
  await expect(page.getByText('Style ID: style_123')).toBeVisible()

  await page.getByRole('button', { name: '2. Create Version' }).click()
  await expect(page.getByText('Version: v1')).toBeVisible()

  await page.getByRole('button', { name: '3. Compile' }).click()
  await expect(page.locator('.flow-output').getByText('Artifact ID: artifact_001')).toBeVisible()
  await expect(page.locator('.flow-output').getByText('SHA256: abc123')).toBeVisible()
  await expect(page.getByText('nolan-warm-v1.costyle')).toBeVisible()
})
