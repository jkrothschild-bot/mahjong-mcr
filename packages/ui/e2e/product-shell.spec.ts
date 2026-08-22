import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
})

test('a fresh hand shows the complete physical wall, deals it, and restores without replaying the deal', async ({ page }) => {
  test.slow()
  await page.getByRole('link', { name: 'Start Playing Free' }).first().click()
  await page.getByRole('button', { name: 'Start Game' }).click()

  const board = page.getByTestId('game-board')
  await expect(board).toHaveAttribute('data-initial-deal', 'wall-built')
  await expect(page.locator('[data-wall-layer]')).toHaveCount(144)
  await expect(page.getByText('144', { exact: true })).toBeVisible()

  await expect(board).not.toHaveAttribute('aria-busy', 'true', { timeout: 60_000 })
  await expect(page.getByRole('list', { name: 'Your hand' }).getByRole('listitem')).toHaveCount(14)
  for (const seat of [1, 2, 3]) await expect(page.locator(`[data-testid^="seat-${seat}-back-"]`)).toHaveCount(13)

  const remaining = Number(await page.getByTestId('wall-count').textContent())
  await expect(page.locator('[data-wall-layer]')).toHaveCount(remaining)
  await page.reload()
  await expect(board).not.toHaveAttribute('data-initial-deal', /.+/)
  await expect(page.locator('[data-wall-layer]')).toHaveCount(remaining)
})

test('guest can start Learning Mode, reload and resume the same game', async ({ page }) => {
  test.slow()
  await expect(page.getByRole('heading', { name: 'Learn Mahjong by actually playing it' })).toBeVisible()
  await page.getByRole('link', { name: 'Start Playing Free' }).first().click()
  await expect(page.getByRole('heading', { name: 'How would you like to play?' })).toBeVisible()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(page.getByTestId('game-stage')).toBeVisible()
  await expect(page.getByTestId('game-board')).not.toHaveAttribute('aria-busy', 'true', { timeout: 60_000 })

  const wallBeforeTurn = Number(await page.getByTestId('wall-count').textContent())
  const firstTile = page.getByRole('list', { name: 'Your hand' }).getByRole('listitem').first()
  await firstTile.dblclick()
  await expect(page.getByRole('list', { name: 'You discards' }).getByRole('listitem')).toHaveCount(1)

  // Sample through the following bot flow: authoritative occupancy can only
  // decrease, and a completed/cancelled draw must leave no proxy behind.
  let previousWallCount = wallBeforeTurn
  for (let sample = 0; sample < 20; sample++) {
    const currentWallCount = Number(await page.getByTestId('wall-count').textContent())
    expect(currentWallCount).toBeLessThanOrEqual(previousWallCount)
    previousWallCount = currentWallCount
    await page.waitForTimeout(100)
  }
  await expect.poll(async () => Number(await page.getByTestId('wall-count').textContent()), { timeout: 15_000 })
    .toBeLessThan(wallBeforeTurn)
  await expect(page.locator('[data-wall-draw-overlay]')).toHaveCount(0, { timeout: 5_000 })
  await expect.poll(async () => {
    const authoritativeCount = Number(await page.getByTestId('wall-count').textContent())
    const permanentTiles = await page.locator('[data-wall-layer]').count()
    return permanentTiles - authoritativeCount
  }).toBe(0)
  expect(await page.locator('[data-wall-position]').evaluateAll((tiles) =>
    new Set(tiles.map((tile) => tile.getAttribute('data-wall-position'))).size === tiles.length,
  )).toBe(true)

  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem('mcr-mahjong:active-game:v1')
    if (!raw) return 0
    return JSON.parse(raw).game.gameState.players[0].discards.length as number
  })).toBe(1)

  await page.getByRole('button', { name: 'Home' }).click()
  await expect(page.getByRole('heading', { name: 'Learn Mahjong by actually playing it' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Resume Game' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start Playing Free' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Start New Game' }).click()
  const newGameDialog = page.getByRole('dialog', { name: 'Start a new game?' })
  await expect(newGameDialog.getByText('Your current game will be replaced.')).toBeVisible()
  await newGameDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('link', { name: 'Resume Game' }).first()).toBeVisible()

  await page.getByRole('link', { name: 'Resume Game' }).first().click()
  await expect(page.getByRole('list', { name: 'You discards' }).getByRole('listitem')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('game-stage')).toBeVisible()
  await expect(page.getByRole('list', { name: 'You discards' }).getByRole('listitem')).toHaveCount(1)
})

test('Play Without Help removes strategic assistance while the game remains playable', async ({ page }) => {
  test.slow()
  await page.getByRole('link', { name: 'Start Playing Free' }).first().click()
  await page.getByRole('radio', { name: 'Play Without Help' }).check()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(page.getByTestId('game-stage')).toBeVisible()
  await expect(page.getByTestId('game-board')).not.toHaveAttribute('aria-busy', 'true', { timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Hint' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hand info' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tile counts' })).toHaveCount(0)

  await page.getByRole('list', { name: 'Your hand' }).getByRole('listitem').first().dblclick()
  await expect(page.getByRole('list', { name: 'You discards' }).getByRole('listitem')).toHaveCount(1)
})

test('landing and account forms remain usable at configured iPad viewport', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Start Playing Free' }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Create Account' }).first().click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})
