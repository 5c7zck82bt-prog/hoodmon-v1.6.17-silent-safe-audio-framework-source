# HOODMON v1.6.16 — Battle Impact Animation Pass

Date: 2026-09-22

## Scope
This pass strengthens battle presentation without changing HOODMON combat rules or card logic. It builds on v1.6.15 and focuses on short event-driven feedback that does not block player decisions.

## Added presentation
- **Attack motion:** P1 and P2 attack declarations receive opposing directional strike-lane motion. Task declarations are explicitly excluded from the attack trigger.
- **Damage feedback:** Hoodmon damage produces a brief slot shake/flash plus a floating **DMG** value; direct Tamer damage uses a distinct **LP** popup.
- **Deploy transition:** newly deployed Hoodmon enter with a quick card impact/ring animation.
- **Switch / promotion transition:** existing card instances moving between Reserve and Active use a separate motion cue, so a promotion never looks like a KO.
- **Evolution transition:** same-instance stage changes receive a short morph, light sweep, and EVOLVE tag.
- **KO / leave-play transition:** a defeated Hoodmon keeps a temporary visual ghost and exits with a K.O. stamp. Non-defeat leave-play events use a neutral exit instead.
- **Task completion:** completed Tasks produce a brief **+1 TASK** star burst.
- **Victory sequence:** expanding result rings, title/stat entrance, and a short finite confetti fall reinforce the match ending.

## Interaction and accessibility safeguards
- All effect overlays use `pointer-events: none`; they cannot steal clicks, taps, drag/drop, or reaction inputs.
- Attack/damage/Task impact layers render **below** the Reaction / pending-decision UI.
- All new v1.6.16 animations are finite; no new infinite animation loops were added.
- Heavy transient effects are removed when `prefers-reduced-motion: reduce` is enabled.
- Timers clear on component cleanup so transient effects do not stay mounted after leaving battle.

## Validation
- **28/28 animation/UI contract checks PASS.**
- `src/game/engine/*.ts` hashes match v1.6.15 — no battle-rule changes.
- `GameContext`, Series 1 runtime definitions, and hand-legality logic also match v1.6.15.
- **110/110 card assets** remain present.
- **110/110 card images** retain the expected ~2:3 ratio.
- CSS block structure: PASS.
- Changed TSX files: **0 TypeScript parser/syntax errors** detected.
- Release contains no `node_modules`, stale `dist`, or `.tsbuildinfo` caches.

## Browser-build note
The clean source archive intentionally does not bundle npm dependencies. This environment cannot currently install the React/Vite packages, so a full live Vite render was not claimed here. The animation pass was validated at the source/parser/contract level and is ready for the next Bolt/local browser render check after `npm install`.

## Files changed from v1.6.15
- `src/App.tsx`
- `src/components/PlayerPanel.tsx`
- `src/components/BattleControls.tsx`
- `src/styles.css`
- `package.json`
- `package-lock.json`
- `README.md`

No files under `src/game/engine/` changed.
