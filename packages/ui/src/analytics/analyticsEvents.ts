export type AnalyticsEventName =
  | 'landing_page_viewed'
  | 'game_started'
  | 'learning_mode_selected'
  | 'without_help_selected'
  | 'hand_started'
  | 'hand_completed'
  | 'game_completed'
  | 'hint_viewed'
  | 'scoring_explanation_viewed'
  | 'registration_started'
  | 'registration_completed'
  | 'return_visit'
  | 'saved_game_resumed'

export type AnalyticsProperties = Record<string, string | number | boolean | null>
