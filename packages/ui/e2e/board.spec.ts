import { expect, test } from '@playwright/test'

test('placeholder board renders with all four seat winds', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('MCR Mahjong Mentor')).toBeVisible()
  await expect(page.getByTestId('board')).toBeVisible()
  for (const wind of ['E', 'S', 'W', 'N']) {
    await expect(page.getByText(wind, { exact: true })).toBeVisible()
  }

  await page.screenshot({ path: `screenshots/${test.info().project.name}.png`, fullPage: true })
})
