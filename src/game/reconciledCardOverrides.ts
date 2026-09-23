import type { CardDefinition } from './engine/types'

// Card-by-card reconciliation against the approved visual masters.
// Legacy Leashed wording in the Peaches block is translated to the approved
// Charmed status. Charmed is a persistent named status with no intrinsic
// penalty; individual cards define what happens to Charmed Hoodmon.
export const reconciledCardRuntimeOverrides: Record<string, Partial<CardDefinition>> = {
  'HDM-028': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'MAIN TASK — Control a Bird or Beast Hoodmon and have at least 1 other Hoodmon in Reserve. COMPLETION EFFECT — Gain 1 Bond and draw 1 card.',
  },
  'HDM-029': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'MAIN TASK — Have two Hoodmon of different species under your control. COMPLETION EFFECT — Heal 200 HP from one Hoodmon and gain 1 Bond.',
  },
  'HDM-030': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'PASSIVE — I KNOW MY WORTH: Once per turn, when an opposing Hoodmon becomes Charmed, choose 1: gain 1 Bond; or draw 1 card, then discard 1 card. ACTIVATE — CASH IN: Exhaust this Tamer; choose 1 Charmed opposing Hoodmon. It gets -200 ATK this turn, and it cannot be protected by its controller’s effects during this battle.',
  },
  'HDM-031': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'AWAKEN — BITE N HOLD: When this card is played, choose 1 opposing Hoodmon with 300 ATK or less. It becomes Charmed.',
    attacks: [{ attackName: 'Warning Growl', baseDamage: 200 }],
  },
  'HDM-032': {
    evolvesFrom: 'HDM-031', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'AWAKEN — IRON JAW: When this card evolves, choose 1 Charmed opposing Hoodmon. It gets -200 ATK this turn. If you control Peaches, this card gains +200 ATK.',
    attacks: [{ attackName: 'Chain Breaker', baseDamage: 400, conditionalDamage: [{ condition: 'custom', customKey: 'target_charmed', replaceDamage: 500 }] }],
  },
  'HDM-033': {
    evolvesFrom: 'HDM-032', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'AWAKEN — BLOOD OATH: When this card evolves, choose up to 2 opposing Hoodmon. Choose 1: they become Charmed, or they get -300 ATK this turn. If another Beast you control is Charmed, this card gains +300 HP.',
    attacks: [{ attackName: 'Collar Breaker', baseDamage: 700 }],
  },
  'HDM-034': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'AWAKEN — STREET SNIFFER: When this card is played, search your Deck for 1 Beast or Dark Hoodmon, or 1 card that mentions “Charmed,” add it to your hand, then shuffle your Deck.',
    attacks: [{ attackName: 'Nip at the Heel', baseDamage: 250, conditionalDamage: [{ condition: 'custom', customKey: 'target_charmed', replaceDamage: 350 }] }],
  },
  'HDM-035': {
    evolvesFrom: 'HDM-034', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'PRETTY BUT MEAN — When this card evolves, if an opposing Hoodmon is Charmed, you may return 1 Beast or Dark card from your discard pile to your hand.',
    attacks: [{ attackName: 'Crush Pose', baseDamage: 300, conditionalDamage: [{ condition: 'custom', customKey: 'control_peaches', bonusDamage: 100 }] }],
  },
  'HDM-036': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Choose 1 Beast or Dark Hoodmon you control. It gains +300 ATK this turn. If it attacks a Charmed Hoodmon this turn, draw 1 card.',
  },
  'HDM-037': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Choose 1 opposing Hoodmon. It becomes Charmed. If that Hoodmon is already Charmed, it also loses 200 HP and cannot attack this turn.',
  },
  'HDM-038': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Search your deck for 1 Beast Hoodmon, 1 Dark Hoodmon, or 1 Tamer card, reveal it, put it into your hand, then shuffle your deck. If your Tamer is Peaches, Cinnamon, or Cherry, gain 1 Bond.',
  },
  'HDM-039': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Choose 1 Beast or Dark Hoodmon you control. It gains +200 ATK this turn. If it attacks a Charmed Hoodmon this turn, its attack deals +200 damage.',
  },
  'HDM-040': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    reactionTrigger: 'When an opposing Hoodmon declares an attack',
    effectText: 'Activate when an opposing Hoodmon declares an attack. If that Hoodmon is Charmed, reduce that attack’s damage by 300 and end its attack. If it is not Charmed, it becomes Charmed after the attack resolves.',
  },
  'HDM-041': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    reactionTrigger: 'When one of your Beast or Dark Hoodmon is targeted by an opponent effect',
    effectText: 'Activate when one of your Beast or Dark Hoodmon is targeted by an opponent’s effect. Negate that effect. Then, if your opponent controls a Hoodmon, choose 1 of them; it becomes Charmed.',
  },
  'HDM-042': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Your Beast and Dark Hoodmon gain +200 HP. Once per turn, when an opposing Hoodmon becomes Charmed, draw 1 card, then discard 1 card. The first time each turn one of your Beast Hoodmon attacks a Charmed Hoodmon, that attack deals +100 damage.',
  },
  'HDM-043': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskDifficulty: 100,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'TASK — Damage or knock out a Charmed opposing Hoodmon. REWARD — Gain 1 Bond and draw 1 card.',
  },
  'HDM-044': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'TASK — Control at least 2 Beast Hoodmon, or control 1 Beast and 1 Dark Hoodmon. REWARD — Choose 1 opposing Hoodmon; it becomes Charmed. If you control Peaches, heal 200 HP from one of your Hoodmon.',
  },
  'HDM-045': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Choose 1 Hoodmon you control. The next time it evolves this turn, reduce that evolution’s Bond Cost by 1. If your Tamer is Peaches or EB & Igniscale, that Hoodmon also gains +200 ATK and +200 HP until end of turn. If that Hoodmon evolves this turn, draw 1 card.',
  },
  // Cherry Banks / High-Class Charm. Marked is restored as an official named status.
  // It has no intrinsic penalty; individual Cherry cards define the payoff for attacking/affecting a Marked Hoodmon.
  'HDM-046': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'PASSIVE — SILENT OPERATOR: Once per turn, when one of your Dark or Fairy Hoodmon attacks, you may look at the top 3 cards of your deck. You may reveal 1 Trap, Task, or Hoodmon among them and put it into your hand. Put the rest on the bottom of your deck in any order. ACTIVATE — HIT WITHOUT WARNING: Exhaust this Tamer; choose 1 opposing Hoodmon. It becomes Marked until end of your opponent’s next turn. When a Marked Hoodmon is attacked by one of your Hoodmon, it gets -200 ATK during that battle.',
  },
  'HDM-047': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'CURIOUS INSTINCT — When this card is played, reveal the top 3 cards of your deck. You may add 1 Trap, 1 Task, or 1 Cherry Banks card from among them to your hand. Put the rest on the bottom of your deck in any order. PAW TAP — If the defending Hoodmon is Marked, draw 1 card.',
    attacks: [{ attackName: 'Paw Tap', baseDamage: 200 }],
  },
  'HDM-048': {
    evolvesFrom: 'HDM-047', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'SHADOW STEP — When this card evolves, choose 1 opposing Hoodmon. Mark it. Then you may return 1 Trap card from your discard pile to your hand. SILENT CLAWS — If the defending Hoodmon is Marked, this attack deals 500 damage instead.',
    attacks: [{ attackName: 'Silent Claws', baseDamage: 300, conditionalDamage: [{ condition: 'custom', customKey: 'target_marked', replaceDamage: 500 }] }],
  },
  'HDM-049': {
    evolvesFrom: 'HDM-048', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'NINE LIVES — Once per turn, when one of your opponent’s Hoodmon becomes Marked, choose 1: return that Hoodmon to its owner’s hand; or it cannot attack during your opponent’s next turn. PAW OF SILK — If the defending Hoodmon is Marked, deal 200 damage to 1 other opposing Hoodmon.',
    attacks: [{ attackName: 'Paw of Silk', baseDamage: 600 }],
  },
  'HDM-050': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'EYES IN THE ALLEY — When this card is played, look at the top 4 cards of your deck. Reveal 1 Trap card or 1 Cherry Banks card from among them and put it into your hand. Put the rest on the bottom of your deck in any order. NEEDLE SWIPE — If the defending Hoodmon is Marked, it gets -100 ATK during its next battle.',
    attacks: [{ attackName: 'Needle Swipe', baseDamage: 200 }],
  },
  'HDM-051': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Your Dark and Fairy Hoodmon gain +100 ATK and +200 HP. Once per turn, when one of your effects Marks an opposing Hoodmon, draw 1 card. If Cherry Banks is in play, the first opposing Hoodmon you Mark each turn enters Exhausted.',
  },
  'HDM-052': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Choose 1 Dark or Fairy Hoodmon you control. It gains +200 ATK this turn. If it attacks a Marked Hoodmon this turn, draw 1 card.',
  },
  'HDM-053': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Return 1 of your Stage 1 or Stage 2 Dark/Fairy Hoodmon to your hand. Then you may evolve a Hoodmon from your hand, reducing its Bond Cost by 1. If you control Cherry Banks, your opponent cannot respond to that evolution.',
  },
  'HDM-054': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'INTEL SNATCH — When this card is played, look at your opponent’s hand. Choose 1 card and your opponent reveals it. If it is a Magic, Trap, or Task card, then place it on the bottom of their deck. ROOFTOP SLASH — If you control Cherry Banks, Mark 1 opposing Hoodmon.',
    attacks: [{ attackName: 'Rooftop Slash', baseDamage: 300 }],
  },
  'HDM-055': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'TASK — Reveal the top 3 cards of your deck. You may add 1 Dark/Fairy Hoodmon or 1 Trap card among them to your hand. Put the rest on the bottom of your deck in any order. BONUS — If Shadowcat or Miso is your Active Hoodmon, Mark 1 opposing Hoodmon.',
  },
  'HDM-056': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    reactionTrigger: 'When your opponent declares an attack',
    effectText: 'Activate when your opponent declares an attack. Choose 1 of your Dark or Fairy Hoodmon. It cannot be chosen as the attack target this battle. Exhaust the attacking Hoodmon. If it was Marked, end the attack.',
  },
  'HDM-057': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    reactionTrigger: 'When one of your Hoodmon would be knocked out',
    effectText: 'Activate when one of your Hoodmon would be knocked out. Return it to your hand instead. If that Hoodmon was Miso, you may play a Kitten from your discard pile without paying its cost.',
  },
  'HDM-058': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'TASK — Search your Main Deck for 1 Trap card and put it into your hand, OR search your Task Deck for 1 Task card and put it on top of that Task Deck. Shuffle the searched deck. BONUS — If Cherry Banks is in play, look at the top card of your opponent’s Main Deck. DIGITAL RULES NOTE — Task cards stay in the separate Task Deck and never enter the hand.',
  },
  'HDM-059': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'Look at your opponent’s hand. Choose 1 non-Hoodmon card. Your opponent places it on the bottom of their deck. If you control a Dark/Fairy Hoodmon, draw 1 card.',
  },
  'HDM-060': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    reactionTrigger: 'When your opponent attacks with, or uses an effect from, a Marked Hoodmon',
    effectText: 'Activate when your opponent attacks with, or uses an effect from, a Marked Hoodmon. Negate that attack or effect, then return that Hoodmon to its owner’s hand. If Cherry Banks is in play, gain 1 Bond.',
  },
  'HDM-061': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'Search your deck for 1 Trap card, 1 Task card, or 1 Tamer card, reveal it, put it into your hand, then shuffle your deck. Then look at the top 2 cards of any deck and rearrange them. If Capin MDH is in play, draw 1 card.',
  },
  'HDM-062': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'TASK — Look at the top 3 cards of your deck. Reveal 1 Dark card or 1 card with the Tech trait from among them and add it to your hand. Put the rest on the bottom of your deck in any order. REWARD — If you added a card to your hand this way, you may put 1 card from your Discard on the bottom of your deck, then draw 1 card.',
  },

  // Tax Rell / Mist Network. These are synced to the approved current card faces,
  // not the older completed-v3 numbering/stats.
  'HDM-063': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'STREET ADVANTAGE — Once per turn, you may look at the top 3 cards of your deck, reveal 1 Hoodmon or Support card, add it to your hand, and put the rest on the bottom of your deck in any order. During your turn, your Smoke Hoodmon cost 1 less Bond to deploy.',
  },
  'HDM-064': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'MIST MAP — When this card is played, look at the top 3 cards of your deck. You may reveal 1 Water or Smoke card from among them and put it into your hand. Put the rest on the bottom of your deck in any order. If this Hoodmon switched between Active and Reserve this turn, its attack deals 300 damage instead.',
    attacks: [{ attackName: 'Vapor Trail', baseDamage: 200, conditionalDamage: [{ condition: 'custom', customKey: 'switched_between_active_reserve_this_turn', replaceDamage: 300 }] }],
  },
  'HDM-065': {
    evolvesFrom: 'HDM-064', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'MOISTURE CONTROL — When this card evolves, you may return 1 Water or 1 Nature card from your discard pile to your hand. If you control Tax Rell, choose 1 opposing Hoodmon. It gets -200 ATK until end of turn.',
    attacks: [{ attackName: 'Vapor Lash', baseDamage: 400, conditionalDamage: [{ condition: 'attacker_evolved_this_turn', replaceDamage: 500 }] }],
  },
  'HDM-066': {
    evolvesFrom: 'HDM-065', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'OBEDIENCE THROUGH FOG — Once per turn, when this Hoodmon attacks, choose 1 opposing Hoodmon. It gets -400 ATK and its Activate effects cannot be used until the end of your opponent’s next turn. If you control Tax Rell, gain 1 Bond.',
    attacks: [{ attackName: 'Nebula Veil Ambush', baseDamage: 600, conditionalDamage: [{ condition: 'target_atk_reduced', replaceDamage: 800 }, { condition: 'target_exhausted', replaceDamage: 800 }] }],
  },
  'HDM-067': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'FIELD — COST 2. Your Water and Water/Smoke Hoodmon gain +100 HP and cannot be targeted by your opponent’s effects during their first turn each game. Once per turn, when a Water Hoodmon you control attacks, you may put the top 1 card of your deck into your hand.',
  },
  'HDM-068': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'TASK — Search your deck for 1 Water or Nature card, reveal it, put it into your hand, then shuffle your deck. REWARD — Gain 1 Bond.',
  },
  'HDM-069': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'SMOKE VEIL — When this card is played, look at the top 3 cards of your deck. You may reveal 1 Smoke card and add it to your hand. Put the rest on the bottom of your deck in any order. QUICK DASH — You may switch this Hoodmon with 1 of your Reserve Hoodmon.',
    attacks: [{ attackName: 'Quick Dash', baseDamage: 200 }],
  },
  'HDM-070': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'Choose up to 2 Water, Nature, or Smoke cards in your discard pile. Put 1 into your hand and shuffle the other into your deck. If you control Vaporgeck or Nebulizard, gain 1 Bond.',
  },
  'HDM-071': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'Choose 1 opposing Hoodmon. It takes 200 damage and gets -200 ATK until the end of your opponent’s turn. If you control Vaporgeck, that Hoodmon also cannot attack during your opponent’s next turn.',
  },
  'HDM-072': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    reactionTrigger: 'When your opponent targets one of your Water, Nature, or Smoke Hoodmon with an effect',
    effectText: 'Activate when your opponent targets 1 of your Water, Nature, or Smoke Hoodmon with an effect. Negate that effect. Then you may draw 1 card or return 1 Water, Nature, or Smoke card from your Discard to your hand.',
  },
  'HDM-073': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    reactionTrigger: 'When your opponent declares an attack against your Active Hoodmon',
    effectText: 'Activate when your opponent declares an attack against your Active Hoodmon. Reduce damage from that attack by 300. If your Active Hoodmon is Smoke type or has Nebulizard in its evolution line, you may switch it with 1 of your Reserve Hoodmon before damage is dealt. If you do, the new Active Hoodmon becomes the target of that attack.',
  },
  'HDM-074': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'Your Water or Smoke Hoodmon gain +200 HP. Once per turn, when you play a Magic card or complete a Task, draw 1 card, then discard 1 card. If Tax Rell is in play, the first Water or Smoke card you play each turn costs 1 less (minimum 0).',
  },
  'HDM-075': {
    effectStatus: 'verified_data', digitalEffectReady: false,
    effectText: 'Search your Hoodmon Deck for 1 Stage 1 Water or Smoke Hoodmon, reveal it, put it into your hand, then shuffle your deck. If Tax Rell is in play, gain 1 Bond.',
  },
  'HDM-076': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'MAIN TASK — A Basic Hoodmon you control completes this Task if its TASK is 700 or higher. REWARD — Gain 1 Bond. Then ready 1 Basic Hoodmon you control. It cannot attempt another Task this turn.',
  },
  'HDM-077': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    reactionTrigger: 'When your opponent declares an attack',
    effectText: 'When your opponent declares an attack, switch your Active Water or Smoke Hoodmon with 1 Reserve Water or Smoke Hoodmon. Reduce that attack’s damage by 200.',
  },
  'HDM-079': {
    evolvesFrom: null, effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'CURIOUS INSTINCT — When this card is played, look at the top 3 cards of your deck. You may reveal 1 Trap card or 1 card that mentions Research from among them and put it into your hand. Put the rest on the bottom of your deck in any order. NOTE SWIPE — This attack deals 200 damage. If you revealed a card in your opponent’s hand this turn, draw 1 card.',
    attacks: [{ attackName: 'Note Swipe', baseDamage: 200 }],
  },
  'HDM-080': {
    evolvesFrom: 'HDM-079', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'PATTERN READ — When this card evolves, choose 1 opposing Hoodmon. It gets -200 ATK until the end of your opponent’s next turn. If you control Capin MDH, reveal 1 random card in your opponent’s hand. SILENT CLAWS — This attack deals 300 damage. If your opponent has a revealed card, this attack deals 400 damage instead.',
    attacks: [{ attackName: 'Silent Claws', baseDamage: 300, conditionalDamage: [{ condition: 'custom', customKey: 'opponent_has_revealed_card', replaceDamage: 400 }] }],
  },
  'HDM-081': {
    evolvesFrom: 'HDM-080', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'DATA SAGE — When this card evolves, you may return 1 Research, Trap, or Truth Network card from your discard pile to your hand. If you control Capin MDH, gain 1 Bond. FUTURE SENSE — This attack deals 500 damage. If that opponent has a revealed card or is Exhausted, this attack deals 700 damage instead.',
    attacks: [{ attackName: 'Future Sense', baseDamage: 500, conditionalDamage: [{ condition: 'custom', customKey: 'opponent_revealed_or_target_exhausted', replaceDamage: 700 }] }],
  },
  'HDM-082': {
    evolvesFrom: 'HDM-081', effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'OMNISCIENCE ENGINE — Once per turn, when you activate a Magic, Trap, or Tamer effect, choose 1 opposing Hoodmon. It gets -300 ATK and its Activated effects cannot be used until the end of your opponent’s next turn. ORACLE BURST — This attack deals 800 damage. If that Hoodmon is Exhausted or revealed, this attack deals 1000 damage instead.',
    attacks: [{ attackName: 'Oracle Burst', baseDamage: 800, conditionalDamage: [{ condition: 'custom', customKey: 'target_exhausted_or_revealed', replaceDamage: 1000 }] }],
  },
  'HDM-085': {
    effectStatus: 'verified_data', digitalEffectReady: true, taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined, taskFailureEffectsByPlayer: undefined,
    effectText: 'A Hoodmon you control with TASK 100 or higher may complete this Task. Look at the top 3 cards of your deck. You may add 1 Psychic Hoodmon or 1 Trap card among them to your hand. Put the rest on the bottom of your deck in any order. If Kitklaws or Scratchwiser is your Active Hoodmon, draw 1 card.',
  },

  // Capin / Truth Network support block. These eight card faces are authoritative.
  // The legacy completed-data export still contains an older EB numbering block at 086–093,
  // so these overrides intentionally replace that stale effect data instead of inheriting it.
  'HDM-086': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    reactionTrigger: 'When your opponent plays a Magic card or uses an Activate effect',
    effectText: 'Activate when your opponent plays a Magic card or uses an Activate effect. They may pay 1 Bond. If they do not, negate that card or effect. Then you may reveal 1 random card in their hand.',
  },
  'HDM-087': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Return up to 2 cards with different names from your discard pile to the bottom of your deck. Draw 1 card. If you control Capin MDH, you may put 1 of those cards into your hand instead.',
  },
  'HDM-088': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Look at the top 4 cards of your deck. You may reveal a Hoodmon card from among them and put it into your hand. Put the rest on the bottom of your deck in any order.',
  },
  'HDM-089': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Search your Hoodmon Deck for 1 Calicore, 1 Monical, or 1 card that mentions “Truth Network,” reveal it, put it into your hand, then shuffle your Hoodmon Deck. If you added Monical to your hand this way, discard 1 card.',
  },
  'HDM-090': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Once per turn, when you play a Psychic card, Trap card, or a card that mentions Research, look at the top 2 cards of your Hoodmon Deck. Put 1 into your hand and the other on the bottom of your Hoodmon Deck. Once per turn, when an opponent’s card is revealed, draw 1 card, then discard 1 card.',
  },
  'HDM-091': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    reactionTrigger: 'When your opponent activates a card or effect',
    effectText: 'Activate when your opponent activates a card or effect. Reveal the top 2 cards of their Hoodmon Deck. If either revealed card is a Hoodmon card or a card that mentions “Research” or “Truth Network,” negate that activation. If the negated activation came from a card on the field, banish that card. Put the revealed cards on the bottom of their Hoodmon Deck in any order.',
  },
  'HDM-092': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Search your Hoodmon Deck for 1 Psychic Hoodmon or 1 card that mentions “Research” or “Truth Network,” reveal it, put it into your hand, then shuffle your Hoodmon Deck. If you control Capin MDH, gain 1 Bond.',
  },
  'HDM-093': {
    effectStatus: 'verified_data', digitalEffectReady: true,
    effectText: 'Reveal the top 4 cards of your Hoodmon Deck. You may add 1 Psychic Hoodmon or 1 card that mentions “Research” or “Truth Network” among them to your hand. Put the rest on the bottom of your Hoodmon Deck in any order. If you added a card to your hand this way, each opponent discards 1 card.',
  },

}
