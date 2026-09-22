# HOODMON v1.6.14 — Browser-Interaction UI Hardening Report

Date: 2026-09-22

## Scope
This pass follows the v1.6.13 full-match stress test and focuses on the browser-facing battle interaction layer: visible hand behavior, drag/drop and click-to-place legality, reaction countdown presentation, lightweight battle animations, and solo P2 AI timing safeguards.

## Environment note
A live React/Vite browser render could not be launched in this execution environment because the archive intentionally contains no node_modules, React/Vite are not globally cached, and registry access is unavailable (`EAI_AGAIN`). The pass therefore used direct source-path inspection, pure game/UI legality execution, TS/TSX syntax parsing, CSS integrity checks, and asset validation. The package remains ready for normal `npm install` + browser/Bolt verification in an environment with registry access.

## Fixes applied

### Visible hand / duplicate selection
- The P1 hand remains visible throughout the match.
- Cards are now draggable only while P1 has an active Main Phase. Outside that window they remain selectable for preview, but no longer advertise a draggable cursor/state.
- Main-phase guidance explicitly supports both drag/drop and select-then-click, preserving touch/mobile usability.
- Duplicate copies now use a hand-instance visual key so selecting one copy no longer highlights every copy with the same card ID.
- If a selected/dragged card leaves the hand through a reaction or effect, stale selection state is cleared automatically.

### Drag/drop legality
Pure legality execution covered 13 scenarios and passed 13/13:
- Basic to empty Active
- Basic Reserve blocked without an Active
- Basic Reserve legal with an Active
- Matching Stage 2 evolution legal from Round 2
- Round 1 evolution blocked
- Hand play blocked outside Main
- Hand play blocked on opponent turn
- Quick Magic blocked from Main support zones
- Executable Trap to open Trap zone
- Trap blocked on occupied Trap zone
- Executable Field to Field zone
- Executable Standard Magic to Magic zone
- Insufficient Bond blocks deployment

### Reaction countdown UI / AI timing
- Human reaction priority remains 10 seconds when a legal response exists.
- Human no-response windows remain a 2-second notice before auto-pass.
- P2 AI priority now exposes a short 2-second response-window countdown instead of only an indefinite “considering” message.
- The live AI still normally acts on its existing short decision delay.
- A repeated failed AI reaction can no longer retry the exact same response forever: the same unresolved reaction signature gets one attempt cycle and then P2 safely passes priority.

### Animation / feedback
- Active phase gets a subtle pulse.
- Current turn-owner panel gets a subtle pulse.
- Newest Battle Feed entry gets a short arrival animation.
- Urgent reaction timer visibly pulses.
- `prefers-reduced-motion` disables these animations/transitions for players who request reduced motion.
- Battle Feed now uses `aria-live=polite` so new battle messages can be announced by assistive technology.

## Validation
- Hand-legality runtime matrix: 13/13 PASS
- UI source-contract checks: 20/20 PASS
- TS/TSX syntax parse: 37/37 PASS
- CSS brace/integrity check: PASS
- Card display assets present: 110/110
- Card display assets at valid 2:3 ratio: 110/110
- Asset dimensions remain 400x600 or 1024x1536

## Live-browser follow-up
The remaining verification is visual/browser-runtime only: actual pointer drag feel, touch behavior on a real device, countdown repaint smoothness, and animation appearance at desktop/mobile viewport sizes. No game-rule or engine change is required for that follow-up.
