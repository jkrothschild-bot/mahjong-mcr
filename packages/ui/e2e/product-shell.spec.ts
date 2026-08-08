import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
})

test('guest can start Learning Mode, reload and resume the same game', async ({ page }) => {
  test.slow()
  await expect(page.getByRole('heading', { name: 'Learn Mahjong by actually playing it' })).toBeVisible()
  await page.getByRole('link', { name: 'Start Playing Free' }).first().click()
  await expect(page.getByRole('heading', { name: 'How would you like to play?' })).toBeVisible()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(page.getByTestId('game-stage')).toBeVisible()

  const firstTile = page.getByRole('list', { name: 'Your hand' }).getByRole('listitem').first()
  await firstTile.dblclick()
  await expect(page.getByRole('list', { name: 'You discards' }).getByRole('listitem')).toHaveCount(1)
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
  await page.getByRole('link', { name: 'Start Playing Free' }).first().click()
  await page.getByRole('radio', { name: 'Play Without Help' }).check()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(page.getByTestId('game-stage')).toBeVisible()
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
