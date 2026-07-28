import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel.js'
import { BOT_SPEED_PRESETS, DEFAULT_SETTINGS } from './useSettings.js'

describe('SettingsPanel', () => {
  it('reflects the current settings values', () => {
    render(<SettingsPanel settings={DEFAULT_SETTINGS} onUpdate={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Confirm before discard' })).not.toBeChecked()
  })

  it('selecting a bot-speed preset calls onUpdate with the right ms value', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Relaxed' }))
    expect(onUpdate).toHaveBeenCalledWith({ botSpeedMs: BOT_SPEED_PRESETS.relaxed })
  })

  it('toggling confirm-before-discard calls onUpdate', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Confirm before discard' }))
    expect(onUpdate).toHaveBeenCalledWith({ confirmBeforeDiscard: true })
  })

  it('toggling step mode calls onUpdate', () => {
    const onUpdate = vi.fn()
    render(<SettingsPanel settings={DEFAULT_SETTINGS} onUpdate={onUpdate} />)
    const checkbox = screen.getByRole('checkbox', { name: /Step mode/ })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(onUpdate).toHaveBeenCalledWith({ stepMode: true })
  })
})
