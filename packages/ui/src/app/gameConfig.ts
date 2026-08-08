export interface GameConfig {
  variant: 'mcr'
  assistance: 'learning' | 'none'
  mode: 'solo'
}

export interface AssistanceCapabilities {
  showStrategyCoach: boolean
  showHandInformation: boolean
  showTileCounts: boolean
  showScoringHelp: boolean
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  variant: 'mcr',
  assistance: 'learning',
  mode: 'solo',
}

export const ASSISTANCE_CAPABILITIES: Record<GameConfig['assistance'], AssistanceCapabilities> = {
  learning: {
    showStrategyCoach: true,
    showHandInformation: true,
    showTileCounts: true,
    showScoringHelp: true,
  },
  none: {
    showStrategyCoach: false,
    showHandInformation: false,
    showTileCounts: false,
    showScoringHelp: false,
  },
}

export function capabilitiesFor(config: GameConfig): AssistanceCapabilities {
  return ASSISTANCE_CAPABILITIES[config.assistance]
}

export function isGameConfig(value: unknown): value is GameConfig {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<GameConfig>
  return candidate.variant === 'mcr' && candidate.mode === 'solo' && (candidate.assistance === 'learning' || candidate.assistance === 'none')
}

export function assistanceLabel(assistance: GameConfig['assistance']): string {
  return assistance === 'learning' ? 'Learning Mode' : 'Play Without Help'
}
