# HOODMON v1.6.13 — Full-Match Stress Test Report

Date: 2026-09-22

## Purpose

This pass stress-tested complete matches after all 110 Series 1 cards had cleared the staged focused-card workflow. The run was deliberately split into small independent batches so one bad matchup could be recorded and isolated without aborting the remainder of the test plan.

## Batch design

- 6 current AI archetype packs: O.D.D. Paul, Cinnamon, Peaches, Tax Rell, Capin, and EB.
- 21 unique pairings including mirror matches.
- Each pairing was run twice: once with P1 first and once with P2 first.
- Total: **42 full matches**.
- Matches were processed as **7 independent batches of 6**.
- Safety guards: 2,600 engine actions per match, 220 actions per turn, and 180 turns maximum.
- The stress driver intentionally set legal Traps for both sides so the reaction engine received more coverage than the prior simple solo-AI loop.

## Defect found and fixed

### Recursive recovery loop — HDM-009 Good Dogs Great People

The first pass found one reproducible turn stall in O.D.D. Paul vs Cinnamon. Two copies of **Good Dogs Great People** could alternate through the Discard indefinitely: the newly played copy went to Discard, an older copy could be recovered, and O.D.D. Paul's +1 Bond refunded the card's 1-Bond cost. This allowed the Main Phase to repeat without advancing.

Fix:

- HDM-009 can no longer select another copy of HDM-009 as one of its recovery targets.
- The same anti-recursion safeguard was applied to **HDM-070 Vapor Cache**, which uses the same recovery resolver pattern.
- The legal-target check and the actual choice list now use the same exclusion, preventing the UI from offering an activation that cannot produce a valid recovery choice.
- A per-turn action-loop guard was added to the external stress harness so similar loops fail fast during testing instead of consuming the entire run.

After the fix, the failed matchup was rerun and passed, then all 42 final matches completed.

## Live AI correction

The stress comparison exposed a separate behavior gap in the live solo AI. P2 could activate legal Trap reactions if a Trap was already set, but its Main-Phase routine never placed Trap cards from hand into an open Trap Zone.

v1.6.13 adds that missing Main-Phase AI action:

- Find an open Trap Zone.
- Find a digitally executable Trap in P2's hand that P2 can afford.
- Set it using the normal support-card resolver.
- Later reaction priority continues to use the existing legal-reaction selector and timer flow.

## Final stress results

- **42 / 42 matches PASS**
- Task wins: **38**
- Tamer-LP knockout wins: **2**
- Required-draw deck-out wins: **2**
- Reaction cards activated: **67**
- Reaction passes processed: **2451**
- Effect choices resolved: **2000**
- Tasks completed across all players: **603**
- Average match length: **14.31 turns**
- Median match length: **12 turns**
- Longest match: **61 turns** (F6vF6-P2first, deckout win)
- Matches lasting 25+ turns: **3**

Long-match samples:
- F2vF5-P1first: 31 turns, deckout win, 475 engine actions.
- F3vF6-P1first: 31 turns, knockout win, 347 engine actions.
- F6vF6-P2first: 61 turns, deckout win, 716 engine actions.

## Reaction-timer integration

The headless stress runner exercises the same reaction-window legality, priority, card resolver, choice, and stack-resolution code, but it does not wait on browser wall-clock timers. The live UI source remains configured for:

- 10 seconds when the human priority player has at least one legal Trap/Quick response.
- 2 seconds when no legal reaction exists, followed by auto-pass.
- Automatic response-stack resolution after both response opportunities have been answered/passed.

The new P2 Trap-setting behavior feeds those existing reaction windows; it does not create a second reaction system.

## Interpretation

This is a runtime stability and integration test, not a deck-balance ranking. The high number of Task wins reflects the stress driver's deliberate Task usage so Task/reaction/choice paths are exercised repeatedly. All three official victory routes occurred naturally in the final run.

## Release status

The tested source revision is **v1.6.13**. Series 1 remains **110/110 digitally executable**, with the new full-match stress fixes layered on top of the completed card-level passes.

Detailed per-match results are in `STRESS_MATCH_MATRIX_2026-09-22.csv`.
