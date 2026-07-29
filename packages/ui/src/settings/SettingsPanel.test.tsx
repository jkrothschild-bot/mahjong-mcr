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
    expect(screen.getByRole('checkbox', { name: 'Confirm before discard' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Color-blind-safe palette' })).not.toBeChecked()
  })

  it('selecting a bot-speed preset calls onUpdate with the right ms value', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(botSpeedGroup().getByRole('radio', { name: 'Relaxed' }))
    expect(onUpdate).toHaveBeenCalledWith({ botSpeedMs: BOT_SPEED_PRESETS.relaxed })
  })

  it('toggling confirm-before-discard calls onUpdate', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Confirm before discard' }))
    expect(onUpdate).toHaveBeenCalledWith({ confirmBeforeDiscard: true })
  })

  it('toggling step mode calls onUpdate', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    const checkbox = screen.getByRole('checkbox', { name: /Step mode/ })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(onUpdate).toHaveBeenCalledWith({ stepMode: true })
  })

  it('toggling the color-blind palette calls onUpdate', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Color-blind-safe palette' }))
    expect(onUpdate).toHaveBeenCalledWith({ colorBlindPalette: true })
  })

  it('selecting a tile-size preset calls onUpdate with the right value', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(tileSizeGroup().getByRole('radio', { name: 'X-Large' }))
    expect(onUpdate).toHaveBeenCalledWith({ tileScale: 'xlarge' })
  })

  it('toggling reduce motion calls onUpdate', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel open onClose={() => {}} settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reduce motion' }))
    expect(onUpdate).toHaveBeenCalledWith({ reducedMotion: true })
  })
})
