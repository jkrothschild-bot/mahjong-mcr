import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel.js'
import { BOT_SPEED_PRESETS, DEFAULT_SETTINGS } from './useSettings.js'

// "Normal" is a shared preset label between the bot-speed and tile-size
// radiogroups, so tests that target one of them scope the query with
// `within` rather than a bare screen.getByRole to avoid an ambiguous match.
function botSpeedGroup() {
  return within(screen.getByRole('radiogroup', { name: 'Bot speed' }))
}

function tileSizeGroup() {
  return within(screen.getByRole('radiogroup', { name: 'Tile size' }))
}

describe('SettingsPanel', () => {
  it('renders nothing when closed', () => {
    render(<SettingsPanel open={false} onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={() => {}} />)
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    render(<SettingsPanel open onClose={onClose} settings={DEFAULT_SETTINGS} onUpdate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('reflects the current settings values', () => {
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={() => {}} />)
    expect(botSpeedGroup().getByRole('radio', { name: 'Normal' })).toBeChecked()
    expect(tileSizeGroup().getByRole('radio', { name: 'Normal' })).toBeChecked()
  })

  it('selecting a bot-speed preset calls onUpdate with the right ms value', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(botSpeedGroup().getByRole('radio', { name: 'Relaxed' }))
    expect(onUpdate).toHaveBeenCalledWith({ botSpeedMs: BOT_SPEED_PRESETS.relaxed })
  })

  it('selecting a tile-size preset calls onUpdate with the right value', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(tileSizeGroup().getByRole('radio', { name: 'Large' }))
    expect(onUpdate).toHaveBeenCalledWith({ tileScale: 'large' })
  })

  // Settings was cut to bot speed and tile size. Asserting the removals is
  // what stops one drifting back in unnoticed: each had its own reason for
  // going (see useSettings.ts), so a reappearance should be a decision, not
  // an accident.
  it('offers only the two settings that survived — no checkboxes at all', () => {
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={vi.fn()} />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    for (const name of ['Confirm before discard', 'Step mode', 'Color-blind-safe palette', 'Reduce motion']) {
      expect(screen.queryByText(new RegExp(name))).not.toBeInTheDocument()
    }
  })
})
