# HOODMON v1.6.12 — HDM-091–110 Final Focused Card Test Report

Date: 2026-09-22

## Scope

This pass tested the final 20 Series 1 cards in two isolated 10-card groups so failures could be diagnosed without overloading the test run:

- HDM-091–100: **10/10 PASS**
- HDM-101–110: **10/10 PASS**
- **Focused batch total: 20/20 PASS**

Together with the already-cleared earlier batches, every Series 1 card HDM-001 through HDM-110 has now received a focused gameplay pass in the staged test workflow.

## Correction made during this pass

### HDM-110 — Crash Their Feed shared Exhaust tracking

A real shared-engine gap was found while testing the final Task. The Task correctly checks for two opposing Hoodmon Exhausted by card effects, but two executable effects were directly changing `readyState` instead of going through the shared Task-progress event semantics:

- HDM-056 — Smoke Screen Alibi
- HDM-107 — Peaches' Backup Bite

Both paths now record a valid opponent card-effect Exhaust for HDM-110 while preserving the existing rules:

- A ready opposing Hoodmon Exhausted by the effect advances Crash Their Feed by 1, capped at 2.
- An already-Exhausted Hoodmon is not counted again.
- A friendly Hoodmon would not count.
- A Hoodmon with `cannotBeExhaustedByEffects` remains Ready and does not count.
- The original Smoke Screen Alibi attack-ending behavior is unchanged.
- Peaches' Backup Bite still provides its optional reveal/+200 damage clause before its optional Exhaust.

## Final 20 card coverage

### HDM-091–100

- **HDM-091 Expose the Cover-Up:** legal activation reaction, top-2 reveal, qualifying negate, Field-source banish, bottom ordering, and a separate non-qualifying branch that correctly leaves the activation live.
- **HDM-092 Oracle's Data Stream:** Psychic/Research/Truth Network search, Deck shuffle, Capin MDH +1 Bond.
- **HDM-093 Status System Leak:** top-4 pick, remaining-card bottom order, opponent discard continuation.
- **HDM-094 EB & Igniscale:** Natural Bond start-of-game Bearded Dragon search and once-per-turn Reserve Connection return/+1 Bond.
- **HDM-095 Ember Hatchling:** Heat Nuzzle +100 HP with another Reserve Bearded Dragon.
- **HDM-096 Smoldering Beard:** evolution +1 Bond/+200 ATK and evolved-turn Cinder Rush replacement damage.
- **HDM-097 Ashen Warden:** Reserve-deploy Packfire Vanguard target/+300 ATK, Bright Flame +1 Bond, and two-Reserve 800 attack replacement.
- **HDM-098 Shadow Hatchling:** Gloom Nest +100 ATK with another Reserve Bearded Dragon.
- **HDM-099 Duskwyrm:** targeted -200 ATK through opponent next turn, Shadow Ember Reserve +1 Bond, and conditional 400 attack.
- **HDM-100 Abyss Igniscale:** Reserve-deploy targeted -300 ATK, Shadow Ember draw 1, and two-Reserve 800 attack replacement.

### HDM-101–110

- **HDM-101 Different Blood, Same Loyalty:** Bright/Shadow search plus opposite-line +1 Bond.
- **HDM-102 Street Sweetheart Pact:** Bearded Dragon and Pit Bull +300 ATK choices plus Pit Bull/Peaches Bond condition.
- **HDM-103 Reserve Roll Call:** top-3 Bearded/Reserve search, bottom ordering, and 2+ Reserve Bearded Dragons bonus draw.
- **HDM-104 Flame Tag-Out:** legal attack reaction, Bearded Dragon Active/Reserve switch, pending target update, +200 ATK on the new Active.
- **HDM-105 Split Flames, One Family:** Bright+Shadow persistent +200 HP and once-per-turn top-2 Bearded Dragon look/add/bottom behavior.
- **HDM-106 Shadowfire Exchange:** return Active line Hoodmon and promote a differently named Reserve Bearded Dragon.
- **HDM-107 Peaches' Backup Bite:** legal attacker-side Trap reaction, reveal clause, +200 attack damage, optional opponent Exhaust, HDM-110 progress event.
- **HDM-108 Blockfire Kennel:** Reserve Bearded/Pit Bull +200 HP and once-per-turn Reserve-to-Active +1 Bond.
- **HDM-109 Dual Line Awakening:** Bright/Shadow +400 ATK, card-effect Exhaust protection, and moved-to-Active bonus draw.
- **HDM-110 Crash Their Feed:** 2/2 tracked objective readiness, draw 2/discard 1 reward, opposing -200 ATK reward target.

## Regression checks after the fix

The shared Exhaust correction received four dedicated regression checks:

1. Smoke Screen Alibi still Exhausts the attacker and ends the protected attack while recording exactly one valid HDM-110 progress event.
2. An already-Exhausted attacker is not counted again.
3. A Hoodmon protected from card-effect Exhaust remains Ready and does not advance HDM-110.
4. Peaches' Backup Bite also respects card-effect Exhaust protection and does not falsely advance HDM-110.

**Regression result: 4/4 PASS.**

## Source validation

- Engine/data TypeScript compile: **PASS**
- HDM-091–110 focused gameplay tests: **20/20 PASS**
- HDM-091 non-qualifying reaction branch: **PASS**
- Shared Exhaust regressions: **4/4 PASS**
- Series 1 runtime definitions: **110/110 present**
- Series 1 `digitalEffectReady`: **110/110 true**
- Series 1 display card assets: **110/110 present**
- Stale compiled `dist` folder: **ABSENT**

## Result

**HDM-091 through HDM-110 are cleared. The staged deep-test workflow has now covered all 110 Series 1 cards.**

This v1.6.12 checkpoint is source-only. It intentionally excludes `node_modules`, temporary test compilation output, and any stale `dist` folder. Build the browser bundle after import/install in an environment with normal package-registry access.
