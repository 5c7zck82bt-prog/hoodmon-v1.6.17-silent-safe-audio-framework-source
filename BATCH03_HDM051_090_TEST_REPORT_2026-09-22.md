# HOODMON v1.6.11 — HDM-051–090 Focused Card Test Report

## Scope
Tested **40 Series 1 cards, HDM-051 through HDM-090**, in four isolated 10-card groups to keep the workload and debugging surface small:

- HDM-051–060: **10/10 PASS**
- HDM-061–070: **10/10 PASS**
- HDM-071–080: **10/10 PASS**
- HDM-081–090: **10/10 PASS**

**Focused batch total: 40/40 PASS.**

## Corrections made during this pass

### HDM-077 — What You Don't See... Obeys
The card face already had a complete reaction effect, but the current runtime still treated it as non-executable. The card is now registered as a live Reaction Trap.

- Legal only when the opponent declares an attack.
- Requires your Active Hoodmon to be Water or Smoke.
- Requires an eligible Reserve Water or Smoke Hoodmon.
- Reduces the pending attack's damage by 200.
- Uses the existing Active/Reserve switch choice system before damage.

### HDM-079 — Kitklaws
Removed stale legacy runtime text/attack data and synchronized it to the approved card.

- **Curious Instinct:** top-3 selection for a Trap or a card mentioning Research; remaining cards go to the bottom in chosen order.
- **Note Swipe:** 200 damage; draws 1 when an opponent's hand card was revealed that turn.

### HDM-080 — Scratchwiser
Replaced stale runtime data with the approved Pattern Read / Silent Claws design.

- **Pattern Read:** on evolution, target an opposing Hoodmon for -200 ATK through the end of its controller's next turn.
- Capin MDH additionally reveals a random opponent hand card.
- **Silent Claws:** 300 damage, or 400 when the opponent has a currently revealed card.

### HDM-081 — Calicore
Replaced stale runtime data with the approved Data Sage / Future Sense design.

- **Data Sage:** optional recovery of a Research, Trap, or Truth Network card from Discard.
- Capin MDH grants +1 Bond.
- **Future Sense:** 500 damage, or 700 when the opponent has a revealed card or the defender is Exhausted.

### HDM-082 — Monical
Replaced stale runtime data with the approved Omniscience Engine / Oracle Burst design and connected it to existing activation timing.

- **Omniscience Engine:** once per turn after your Magic, Trap, or Tamer effect activation, target an opposing Hoodmon for -300 ATK and disable its Activated effects through the end of its controller's next turn.
- The target uses the normal targeted-effect Reaction Window.
- Trap activations use a continuation so the Monical trigger waits until the Trap finishes resolving.
- Tamer and Magic activations use the same continuation/choice infrastructure instead of a separate timing system.
- **Oracle Burst:** 800 damage, or 1000 when the target is Exhausted or the opponent has a revealed card.

## Shared-system behavior verified
The pass also exercised the existing systems used by this range:

- Marked status, Cherry Banks, Moonlit Hideout, Silent Claws, Shadow Step, and Rooftop Informant.
- KO replacement and attack-negation Traps.
- Separate Task Deck search/reorder rules.
- Tax Rell's Smoke discount and Water/Smoke/Nature interactions.
- Active/Reserve switching and post-attack Quick Dash.
- Field persistence and once-per-turn Field triggers.
- Capin MDH deck-look/TASK passive.
- Truth Network revealed-card state.
- Signal Intercept's reaction/choice interruption.
- On Air Tonight's once-per-turn play and reveal triggers.

## Regression tests
After the HDM-051–090 changes, the previously tested block was rerun against the same engine:

- HDM-001–010: **18/18 PASS**
- HDM-011–020: **10/10 PASS**
- HDM-021–030: **10/10 PASS**
- HDM-031–040: **10/10 PASS**
- HDM-041–050: **10/10 PASS**

**Previous-card regression total: 58/58 PASS.**

## Source validation
- Core game/data TypeScript compile: **PASS**
- HDM-051–090 card definitions available: **40/40**
- HDM-051–090 focused gameplay tests: **40/40 PASS**
- HDM-001–050 regression assertions: **58/58 PASS**
- Card image assets HDM-051–090 present: **40/40**
- No stale compiled `dist` folder is being presented as this source revision.

## Asset note
HDM-063 and HDM-067 use approved higher-resolution 2:3 assets (1024×1536). The other cards in this 40-card range are 400×600. All 40 assets are present and retain the correct card aspect ratio.

## Result
**HDM-051 through HDM-090 are cleared in the focused card-test workflow.**

The remaining untested portion of Series 1 for this new deep-test pass is **HDM-091 through HDM-110**.
