# HOODMON TCG Digital Arena — Current Standard

This package is the current HOODMON Vite/React app source with the Series 1 110-card library and the latest digital battle standard integrated.

## Core match standard
- Starting LP: 2,500
- 40-card Main Deck
- Separate 10-card Task Deck
- 1 Tamer outside the Main Deck
- Opening hand: 5 cards with no-Basic mulligan
- Starting Bond: 5; +1 each Bond Phase; maximum 10
- 1 Active Hoodmon and up to 3 Reserves
- Turn order: Refresh -> Draw -> Bond -> Main -> Command -> End
- Normal evolution begins Round 2
- Printed attack damage is used; ATK is not automatically added
- Either player may attempt either face-up Task with a legal ready Hoodmon
- Every successfully completed Task increases that player's Completed Tasks total by 1
- **Victory: complete 10 Tasks, reduce the opponent's LP to 0, OR force a required draw from an empty Main Deck**
- **Objective Stars are retired. Main-Deck deck-out is a loss only when a player is required to draw and no card is available.**

## Included
- 110-card Series 1 display/runtime metadata
- Searchable Collection and ownership-aware Shop
- Persistent profile-scoped 40 Main / 10 Task / 1 Tamer Deck Builder
- Signed-in Battle page as the player home
- Visible fixed bottom hand with preview, click-select, and drag/drop
- Setup selection, deployment, evolution, Tasks, reactions, knockout cleanup, Reserve promotion
- Solo opponent AI, Standard mode, Tower mode, match rewards and progression

## Run locally
```bash
npm install
npm run dev
```

Production build:
```bash
npm run build
```

## Card-data note
The 110-card display database and executable gameplay data are intentionally separated. Verified current gameplay data is imported only when the card ID/name/type agree with the current Series 1 master. Cards whose exact effect rules are still unresolved are visibly labeled as pending instead of receiving invented behavior.


### Shared Task race
Each player brings a separate 10-card Task Deck (20 total Task cards in a standard match). A face-up Task may be attempted by either player unless that Task says otherwise. When a Task is completed, it goes to the resolved area associated with the Task Deck it came from, while the player who completed it gains +1 Completed Task. This guarantees the 10-Task victory race cannot deadlock merely because both players completed Tasks.

## Authoritative Series 1 end block — 2026-09-21

The user directly supplied the approved HDM-100 through HDM-110 card masters. The app now uses those exact visuals and their current printed identities/rules, beginning with **HDM-100 Abyss Igniscale** and ending with **HDM-110 Crash Their Feed**. See `HDM_100_110_AUTHORITATIVE_UPDATE_2026-09-21.md` and `HDM_100_110_TEST_REPORT_2026-09-21.md`.

## v1.6.3 — Peaches block completion (HDM-037–045)

HDM-037 through HDM-045 now have executable digital resolvers. This adds targeted-effect reaction windows, the Bad Idea, Babe / Chain Break Counter reaction paths, Velvet Block Kennel persistent and once-per-turn effects, objective tracking for Cash In When It Counts, Walk Him Down's completion rewards, and Street Contract's next-evolution discount/draw trigger.

Current Series 1 digital completeness after this update: **31 fully executable**, **16 combat-ready/effect-pending Hoodmon**, **43 rules-verified resolver-pending cards**, **12 Task trackers pending**, and **8 cards with effect data/encoding pending**. See `HDM037_045_TEST_REPORT_2026-09-21.md` and `FULL_CARD_TEST_REPORT_2026-09-21.md`.

## v1.6.4 — Cherry / Marked block (HDM-046–054)

HDM-046 through HDM-054 now have executable digital resolvers. Marked is implemented as a reusable named status with no hidden universal penalty; each printed card supplies its own Marked interaction. This update also adds Tamer activation/exhaust handling for Cherry Banks, reusable top-deck selection and bottom-order choices, opponent-hand inspection, once-per-turn Mark triggers, evolved-stack return-to-hand handling, persistent Moonlit Hideout modifiers, next-battle penalties, post-attack Marked triggers, and Shadow Step's immediate discounted evolution using the existing reaction/timing architecture.

Current Series 1 digital completeness after this update: **40 fully executable**, **11 combat-ready/effect-pending Hoodmon**, **39 rules-verified resolver-pending cards**, **12 Task trackers pending**, and **8 cards with effect data/encoding pending**. See `HDM046_054_TEST_REPORT_2026-09-21.md` and the updated `FULL_CARD_TEST_MATRIX_2026-09-21.csv`.



## v1.6.5 — Truth Network block (HDM-086–093)

HDM-086 through HDM-093 now use the current authoritative Truth Network data and executable digital resolvers, including activation-negation reactions, discard recycling, top-deck selection/reordering, persistent Field triggers, and a resolving-reaction choice/resume path. The stale EB-numbering data previously occupying 086–093 was removed from current runtime authority.

## v1.6.6 — Timed Reaction Windows

Human reaction priority can no longer hold a match open indefinitely. A player receives **10 seconds** when at least one legal Trap/Quick reaction exists. If the player has no legal reaction, the window gives a brief **2-second** notice and then auto-passes. The countdown resets whenever reaction priority changes. Once both response opportunities have been used or passed, the reaction stack begins resolving automatically after a short 350 ms readability delay; there is no additional manual Resolve step. Solo AI response speed remains controlled by the existing AI driver.

## v1.6.8 — Complete Series 1 Task Engine

All **14 Series 1 Task cards** now use executable digital Task logic. The shared Task engine supports raw TASK-rating challenges, board-state objectives, tracked objectives, Tasker-specific eligibility, top-deck/search/reorder choices, healing, Bond rewards, discard recycling, Ready effects, temporary restrictions, and reward choices without creating one-off timing systems.

Two legacy printed instructions were normalized to the current app rules instead of breaking zone logic: **HDM-010 Puppy Chow Promise** no longer searches for a Tamer in the Main Deck because the Tamer begins outside that deck, and **HDM-058 Dead Drop Message** tutors a chosen Task to the top of the separate Task Deck rather than putting a Task into the normal hand.

The engine also records **HDM-110 Crash Their Feed** progress through the shared card-effect Exhaust event, and a player's **10th completed Task ends the match immediately before reward-choice UI can open**, preventing post-win stalls. The v1.6.6 10-second/2-second Reaction Window timers remain intact.

Current Series 1 status: **110/110 cards fully executable**. The Task engine, support-card resolvers, final Hoodmon abilities, reaction timer, and current Series 1 card data are all encoded. See `FINAL11_HOODMON_TEST_REPORT_2026-09-21.md` and `FULL_CARD_TEST_MATRIX_2026-09-21.csv`.

## v1.6.8 — Remaining 39 support resolvers complete

All 39 cards that were previously marked **RULES VERIFIED / RESOLVER PENDING** are now digitally executable. The implementation reuses the existing HOODMON choice, reaction, status, Field, Tamer, search, reorder, evolution, promotion, and temporary-modifier systems rather than adding parallel rule paths.

Validation now also includes a 23-assertion focused suite for the final 11 Hoodmon abilities, plus the prior 39-card resolver suite and regression checks for Peaches, Tasks, Truth Network, and the reaction timer. No Series 1 card remains in a pending digital-effect category.


## v1.6.11 — Focused HDM-051–090 deep-test pass

HDM-051 through HDM-090 were tested in four isolated 10-card groups. All 40 focused card tests pass. The pass enabled HDM-077 as a live reaction Trap and reconciled HDM-079 through HDM-082 to their approved Truth Network card text/attacks, including reusable revealed-card checks and Monical's once-per-turn Magic/Trap/Tamer activation trigger. HDM-001 through HDM-050 were then rerun as a lightweight regression set and all 58 assertions passed. See `BATCH03_HDM051_090_TEST_REPORT_2026-09-22.md` for details.


## v1.6.12 — Final HDM-091–110 deep-test pass

HDM-091 through HDM-110 were tested as two isolated 10-card mechanical groups. All 20 focused card tests pass, including EB & Igniscale, both Bright Flame/Shadow Ember lines, their support package, Truth Network finishers, Reserve Roll Call, and Crash Their Feed. Expose the Cover-Up was also checked on both qualifying and non-qualifying reveal branches.

This pass found and fixed one shared event-accounting gap: **HDM-056 Smoke Screen Alibi** and **HDM-107 Peaches' Backup Bite** could Exhaust opposing Hoodmon without advancing **HDM-110 Crash Their Feed**. Both now use the same opponent card-effect Exhaust semantics as the rest of the engine. Already-Exhausted Hoodmon are not double-counted, and Hoodmon protected from card-effect Exhaust remain protected and do not advance the Task.

Validation: HDM-091–110 **20/20 PASS**, targeted shared Exhaust regressions **4/4 PASS**, Series 1 runtime definitions **110/110**, executable flags **110/110**, and card display assets **110/110**. No stale `dist` folder is included. See `BATCH04_HDM091_110_TEST_REPORT_2026-09-22.md`.

## v1.6.13 — Full-match stress hardening

A 42-match headless stress pass covered all 21 pairings of the six current AI archetype packs with both first-player configurations. The final run completed **42/42** with Task, LP-knockout, and required-draw deck-out victories all observed. A recursive HDM-009 recovery loop was fixed by preventing HDM-009 from selecting another copy of itself; the same self-copy safeguard is applied to HDM-070, which uses the same recovery pattern. The live P2 AI now also sets digitally executable Trap cards into open Trap Zones during Main Phase, allowing its existing reaction logic to use those cards normally. See `STRESS_MATCH_REPORT_2026-09-22.md` and `STRESS_MATCH_MATRIX_2026-09-22.csv`.


## v1.6.14 — Browser Interaction UI Hardening

The battle UI now limits hand dragging to the player’s active Main Phase, keeps select-then-click as a touch/mobile fallback, isolates visual selection when duplicate cards are in hand, clears stale hand selection when cards leave via reactions/effects, exposes an AI reaction countdown, guards the AI from endlessly retrying a failed reaction, and adds subtle phase/turn/feed feedback with reduced-motion support. See `UI_INTERACTION_TEST_REPORT_2026-09-22.md`.

## v1.6.15 — Visual Gameplay Polish

This pass focuses on battle readability and presentation without changing card rules or engine semantics. Active Hoodmon now carry stronger visual weight than Reserves, player panels include a 10-Task race meter, support-zone labels remain visible when occupied, ready/exhausted and low-HP states are easier to read, and keyboard activation is supported on legal click/drop zones.

Major battle events now receive short non-blocking callouts for attack declarations, damage, reactions, Task completions, and knockouts. Reaction, pending-choice, and promotion panels are positioned above the fixed hand so they remain actionable. The match-complete screen now identifies the victory route and shows winner LP, completed Tasks, remaining Main Deck cards, and opponent LP.

Tablet and phone layouts now use horizontal play lanes for support zones, Hoodmon zones, and face-up Tasks instead of stacking the entire board vertically. The hand keeps a safe-area-aware fixed position, and reduced-motion preferences disable the new event/victory animations.

Validation: UI contract checks **22/22 PASS**, TS/TSX syntax/transpile checks **37/37 PASS**, CSS brace validation **PASS**, card display assets **110/110**, and 2:3 card-image aspect ratios **110/110**. This package changes presentation-layer files only; no game-engine rules files were modified.

## v1.6.16 — Battle Impact Animation Pass

The battle presentation now reacts directly to real match events without changing game rules. Hoodmon deployment, switching, evolution, damage, knockout/leave-play, attacks, Task completion, and victory each receive short finite visual feedback. Knockouts preserve a temporary ghost of the defeated card so the exit reads clearly before the slot empties, while promotions/switches are detected separately and never misrepresented as KOs. Damage creates a local hit shake plus floating DMG/LP values, Task completion adds a brief +1 TASK burst, and the victory panel adds expanding impact rings and a finite confetti sequence.

All new overlays are pointer-transparent and the heavier motion is suppressed under `prefers-reduced-motion`. The battle engine under `src/game/engine/` is unchanged from v1.6.15.

## v1.6.17 — Silent-Safe Audio Framework

The app now includes the complete audio-control and event-hook framework without bundling any playable sound or music. Persistent settings cover master, music, battle SFX, and UI/card volume plus independent channel mute controls, global mute, and optional pause-when-hidden behavior. Browser audio unlock is handled on the first user interaction so future licensed assets can respect autoplay restrictions.

Prepared cue slots include menu/battle/victory/defeat music; UI click/open/close; card pickup/drop; phase changes; Bond gain; Hoodmon deploy/evolution; attacks; Hoodmon and LP damage; KO; reactions; Task completion; victory; and defeat. Battle event hooks are presentation-only and do not modify `src/game/engine/`.

**Commercial-safety gate:** every registry `src` is intentionally `null` in this release. No audio file is bundled. An asset must be documented in `public/audio/LICENSE_MANIFEST.json` and pass `AUDIO_ASSET_CHECKLIST.md` before its path is registered in `src/audio/audioRegistry.ts`. Playback additionally requires a matching `licenseId` and `approvedForCommercialUse: true`, so a file path by itself cannot enable audio. This prevents unapproved/free-plan/unclear-license audio from playing by accident.
