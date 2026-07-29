import { createContext, useContext } from 'react'
import { DEFAULT_SETTINGS, type Settings } from './useSettings.js'

// Lets deeply-nested renderers (tile boxes, the Tile Safety tab) read the
// current settings without threading a prop through every intermediate
// board/hint component — App.tsx is the single Provider, sourced from its
// own useSettings() call.
export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS)

export function useSettingsContext(): Settings {
  return useContext(SettingsContext)
}
