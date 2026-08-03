// REMOVED — do not reinstate.
//
// This component rendered FanTrackerPanel + WaitsPanel in flow, directly
// beneath the board. Both render nothing until they have something to report
// and then appear at roughly 150px. Because GameStage measures the leftover
// height of Board.tsx's flex column, and computeDesignWidth derives
// designWidth from that element's aspect ratio, their appearing physically
// resized the entire board mid-hand — smaller tiles, re-laid-out discard
// field — at exactly the moment a fan locked in or the hand became ready.
//
// The panels now live in HandInfoPanel.tsx, opened on demand from App.tsx's
// "Hand info" button, where they cost no layout at all.
//
// The general rule this is an instance of: nothing in Board.tsx's flex column
// may change height at runtime. If you need to surface something new, put it
// in a modal, or inside the stage as a Positioned sibling with a
// permanently-reserved slot (see Seat.tsx's SORT_CONTROL_WIDTH and
// DiscardHint.tsx for a worked example of the latter).
//
// This file is kept as a tombstone rather than deleted so the reasoning is
// findable from the name — several past sessions' comments still refer to
// "HudBar's dedicated button-row height".
export {}
