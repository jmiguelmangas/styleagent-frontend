import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

test.describe('live stack smoke', () => {
  test.setTimeout(120_000)

  test('completes the MVP happy path against real services', async ({ page }) => {
    const runId = `${Date.now()}`
    const presetName = `E2E Smoke ${runId}`
    const versionName = `v${runId}`

    await page.goto('/')

    await expect(page.getByText('Backend ok')).toBeVisible()
    await expect(page.getByText('AI ready')).toBeVisible()

    await page.getByRole('button', { name: /Describe the look/i }).click()
    await expect(page.getByRole('heading', { name: 'Create your first look' })).toBeVisible()

    await page.getByRole('textbox', { name: 'Prompt' }).fill(
      'Warm cinematic portrait with soft highlights, rich skin tones, subtle film contrast and clean color balance',
    )
    await page.getByRole('button', { name: 'Generate StyleSpec' }).click()

    await expect(page.getByText('Generated with')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Refine the look' })).toBeVisible()

    await page.getByLabel('Preset name').fill(presetName)
    await page.getByLabel('Version').fill(versionName)

    const sliders = page.getByRole('slider')
    const sliderCount = await sliders.count()
    if (sliderCount > 0) {
      await sliders.nth(0).focus()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
    }

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Save and export' })).toBeVisible()

    await page.getByRole('button', { name: 'Save preset' }).first().click()
    await expect(page.locator('.MuiChip-label').filter({ hasText: /^Style ID:/ }).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.locator('.MuiChip-label').filter({ hasText: `Version: ${versionName}` }).first()).toBeVisible({
      timeout: 20_000,
    })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export .costyle' }).first().click()

    await expect(page.locator('.MuiChip-label').filter({ hasText: /^Artifact ID:/ }).first()).toBeVisible({
      timeout: 30_000,
    })
    const download = await downloadPromise

    const suggestedFilename = download.suggestedFilename()
    expect(suggestedFilename).toMatch(/\.costyle$/)

    const targetPath = path.join(test.info().outputDir, suggestedFilename)
    await download.saveAs(targetPath)

    const content = await fs.readFile(targetPath, 'utf8')
    expect(content).toContain('<SL Engine=')
  })
})
