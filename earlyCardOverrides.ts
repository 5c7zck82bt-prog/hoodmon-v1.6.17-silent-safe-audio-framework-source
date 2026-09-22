import type { CardDefinition } from './engine/types'

// HDM-005 and HDM-008 through HDM-015 are reconciled against the current
// approved/remaster card faces.  The printed rules are authoritative here;
// digitalEffectReady stays false where the generic resolver/choice UI does not
// yet implement the whole printed effect.
export const earlyCardRuntimeOverrides: Record<string, Partial<CardDefinition>> = {
  'HDM-002': {
    evolvesFrom: null,
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'NEIGHBORHOOD LOYALTY — When this card is played, look at the top 3 cards of your Hoodmon Deck. Reveal 1 Beast card or 1 card that mentions Neighborhood Loyalty from among them and put it into your hand. Put the rest on the bottom of your Hoodmon Deck.',
    attacks: [{ attackName: 'Puppy Pounce', baseDamage: 200, conditionalDamage: [{ condition: 'custom', customKey: 'control_tamer', replaceDamage: 300 }] }],
  },
  'HDM-003': {
    evolvesFrom: 'HDM-002',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'NEIGHBORHOOD LOYALTY — When this card evolves, you may return 1 Beast card from your discard pile to your hand. If you control a Tamer, gain 1 Bond.',
    attacks: [{ attackName: 'Bluefang Rush', baseDamage: 400, conditionalDamage: [{ condition: 'attacker_evolved_this_turn', replaceDamage: 500 }] }],
  },
  'HDM-004': {
    evolvesFrom: 'HDM-003',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'NEIGHBORHOOD LOYALTY — Once per turn, when this Hoodmon attacks, if you control a Tamer, it gains +400 ATK and cannot be targeted by your opponent’s effects until end of turn.',
    attacks: [{ attackName: 'Drunk Fist Fang', baseDamage: 600 }],
  },
  'HDM-005': {
    evolvesFrom: null,
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'PACK SUPPORT — When this card is played, choose 1 Beast Hoodmon you control. It gains +100 ATK this turn. If O.D.D. Paul is in play, gain 1 Bond.',
    attacks: [{ attackName: 'Quick Nip', baseDamage: 200 }],
  },
  'HDM-006': {
    evolvesFrom: 'HDM-005',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'GUARDIAN BOND — When this card evolves, choose 1 Beast Hoodmon you control. It gains Neighborhood Loyalty until end of turn. If you control O.D.D. Paul, that Hoodmon also gains +200 HP until end of turn.',
    attacks: [{ attackName: 'Side Street Guard', baseDamage: 300, conditionalDamage: [{ condition: 'custom', customKey: 'control_another_beast', replaceDamage: 400 }] }],
  },
  'HDM-007': {
    evolvesFrom: 'HDM-006',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'CONCRETE DOMINION — When this card evolves, choose 1 Beast Hoodmon you control. It gains Neighborhood Loyalty until end of turn. If you control O.D.D. Paul, that Hoodmon also gains +300 ATK and +300 HP until end of turn.',
    attacks: [{ attackName: 'Block Crusher', baseDamage: 600, conditionalDamage: [{ condition: 'custom', customKey: 'control_another_beast', replaceDamage: 800 }] }],
  },
  'HDM-008': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Beast Hoodmon you control gain +200 HP. Once per turn, when you play a Stage 1 Beast Hoodmon, draw 1 card, then discard 1 card. If O.D.D. Paul is in play, the first time you evolve a Beast Hoodmon each turn, reduce its Bond Cost by 1.',
  },
  'HDM-009': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Choose up to 2 Beast cards in your discard pile. Put 1 into your hand and shuffle the other into your deck. If you control O.D.D. Paul, gain 1 Bond.',
  },
  'HDM-010': {
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    taskExecutionReady: true,
    taskDifficulty: 100,
    taskRewardEffectsByPlayer: undefined,
    taskFailureEffectsByPlayer: undefined,
    effectText: 'MAIN TASK — Reveal the top 3 cards of your Main Deck. You may add 1 Stage 1 Beast Hoodmon or 1 Neighborhood Loyalty card among them to your hand. Put the rest on the bottom in any order, then shuffle your Main Deck. BONUS EFFECT — If Alley Pup is your Active Hoodmon, gain 1 Bond. DIGITAL RULES NOTE — Tamer cards live outside the Main Deck, so the legacy Tamer-search clause is normalized to Neighborhood Loyalty support.',
  },
  'HDM-011': {
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    taskExecutionReady: true,
    taskDifficulty: 100,
    taskRewardEffectsByPlayer: undefined,
    taskFailureEffectsByPlayer: undefined,
    effectText: 'MAIN TASK — Gain 1 Bond. If you control a Beast Hoodmon, heal 200 HP from it. BONUS — If O.D.D. Paul is in play, draw 1 card.',
  },
  'HDM-012': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Choose 1 Beast Hoodmon you control. It gains +300 ATK and cannot be targeted by your opponent\'s effects this turn. If that Hoodmon is Drunk Fist Wulf, it may also deal 100 damage to 1 other opposing Hoodmon.',
  },
  'HDM-013': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'All Beast Hoodmon you control gain +200 ATK this turn. If you control Bluefang Hound or Drunk Fist Wulf, draw 1 card.',
  },
  'HDM-014': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    reactionTrigger: 'When an opponent targets one of your Beast Hoodmon with an effect',
    effectText: 'Activate when your opponent targets one of your Beast Hoodmon with an effect. Negate that effect. Then you may return 1 Beast card from your discard pile to your hand.',
  },
  'HDM-015': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    reactionTrigger: 'When one of your Beast Hoodmon would be knocked out',
    effectText: 'Activate when one of your Beast Hoodmon would be knocked out. Prevent that knockout, leave it with 100 HP instead, and it gains +200 ATK until end of turn. If that Hoodmon is Drunk Fist Wulf, gain 1 Bond.',
  },
  'HDM-016': {
    bondCost: 2,
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'PASSIVE — Once per turn, when you reveal a Bird or Tech card from your hand, look at the top 3 cards of your deck. Place 1 back on top and 1 on the bottom in any order. Then draw 1 card. ACTIVATE — CROWD CONTROL: Once per turn, choose 1 opponent face-up card. That card’s effects are negated until the end of their next turn.',
  },
  'HDM-017': {
    evolvesFrom: null,
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'HEAD TILT — When this card is deployed, look at the top 2 cards of your deck. You may reveal 1 Bird or Tech card among them and put it into your hand. Put the rest on the bottom of your deck in any order.',
    attacks: [{ attackName: 'Lucky Poo', baseDamage: 150 }],
  },
  'HDM-018': {
    evolvesFrom: 'HDM-017',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'STREET SURVEILLANCE — When this card evolves, look at the top 3 cards of your opponent’s deck. Return them in any order. If a Marked Hoodmon is in play, draw 1 card, then discard 1 card.',
    attacks: [{ attackName: 'Feathered Chaos', baseDamage: 400, conditionalDamage: [{ condition: 'custom', customKey: 'target_marked', replaceDamage: 500 }] }],
  },
  'HDM-019': {
    evolvesFrom: 'HDM-018',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'HACK THE SKY — Once per turn, when your opponent activates an effect from a Marked Hoodmon, you may pay 1 Bond to negate that effect.',
    attacks: [{ attackName: 'Loose Cannon', baseDamage: 600 }],
  },
  'HDM-020': {
    evolvesFrom: null,
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'NEIGHBORHOOD SCOUT — Reveal the top 3 cards of your deck. Add 1 Bird, Beast, Field, or Tamer card among them to your hand. Put the rest on the bottom of your deck in any order.',
    attacks: [{ attackName: 'Peck & Check', baseDamage: 200 }],
  },
  'HDM-021': {
    evolvesFrom: 'HDM-020',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'PROTECT THE PERCH — When this card evolves, choose another Bird or Beast Hoodmon you control. It gains +200 HP. If O.D.D. Paul is your Tamer, it also gains Neighborhood Loyalty until end of turn.',
    attacks: [{ attackName: 'Dive Bomb', baseDamage: 350, conditionalDamage: [{ condition: 'custom', customKey: 'control_beast', replaceDamage: 450 }] }],
  },
  'HDM-026': {
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    reactionTrigger: 'When an opponent declares an attack while you control a Bird Hoodmon',
    effectText: 'When an opponent declares an attack while you control a Bird Hoodmon, switch your Active Hoodmon with 1 Reserve Bird Hoodmon. The attacking Hoodmon gets -100 ATK this turn.',
  },

}
