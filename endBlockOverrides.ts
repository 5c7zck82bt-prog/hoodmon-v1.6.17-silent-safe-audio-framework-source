import type { CardDefinition } from './engine/types'

// HDM-100 through HDM-110 are authoritative from the user-supplied approved card masters.
// These overrides intentionally replace older Series 1 numbering/effect data that used these IDs.
export const endBlockRuntimeOverrides: Record<string, Partial<CardDefinition>> = {
  'HDM-094': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'NATURAL BOND — At the start of the game, after revealing this Tamer, search your Hoodmon Deck for 1 Bearded Dragon Hoodmon, reveal it, put it into your hand, then shuffle your Hoodmon Deck. RESERVE CONNECTION — Once per turn, return 1 Bearded Dragon Hoodmon from your Reserve to your hand. If you do, gain 1 Bond.',
  },
  'HDM-095': {
    evolvesFrom: null,
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'HEAT NUZZLE — When this Hoodmon is deployed, if you have another Bearded Dragon Hoodmon in your Reserve, this Hoodmon gets +100 HP.',
    attacks: [{ attackName: 'Spark Bite', baseDamage: 200 }],
  },
  'HDM-096': {
    evolvesFrom: 'HDM-095',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'RESERVE EMBER — When this Hoodmon evolves, if you have another Bearded Dragon Hoodmon in your Reserve, gain 1 Bond and this Hoodmon gets +200 ATK until end of turn.',
    attacks: [{ attackName: 'Cinder Rush', baseDamage: 400, conditionalDamage: [{ condition: 'attacker_evolved_this_turn', replaceDamage: 500 }] }],
  },
  'HDM-097': {
    evolvesFrom: 'HDM-096',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'PACKFIRE VANGUARD — Once per turn, when you deploy a Bearded Dragon Hoodmon to your Reserve, choose 1 Hoodmon you control. It gets +300 ATK until end of turn. If the chosen Hoodmon is a Bright Flame Hoodmon, gain 1 Bond.',
    attacks: [{ attackName: 'Ashen Guard Slash', baseDamage: 600, conditionalDamage: [{ condition: 'custom', customKey: 'reserve_bearded_dragons_gte_2', replaceDamage: 800 }] }],
  },
  'HDM-098': {
    evolvesFrom: null,
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: 'GLOOM NEST — When this Hoodmon is deployed, if you have another Bearded Dragon Hoodmon in your Reserve, this Hoodmon gets +100 ATK until end of turn.',
    attacks: [{ attackName: 'Shadow Snap', baseDamage: 200 }],
  },
  'HDM-099': {
    evolvesFrom: 'HDM-098',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: "VEIL SLINK — When this Hoodmon evolves, choose 1 opposing Hoodmon. It gets -200 ATK until the end of your opponent's next turn. If you have another Shadow Ember Hoodmon in your Reserve, gain 1 Bond.",
    attacks: [{ attackName: 'Ember Shade Claw', baseDamage: 300, conditionalDamage: [{ condition: 'target_atk_reduced', replaceDamage: 400 }, { condition: 'target_exhausted', replaceDamage: 400 }] }],
  },
  'HDM-100': {
    evolvesFrom: 'HDM-099',
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    effectText: "Once per turn, when you deploy a Bearded Dragon Hoodmon to your Reserve, choose 1 opposing Hoodmon. It gets -300 ATK until the end of your opponent's next turn. If the deployed Hoodmon is a Shadow Ember Hoodmon, draw 1 card.",
    attacks: [{
      attackName: 'Abyss Rift Fang',
      baseDamage: 600,
      conditionalDamage: [{ condition: 'custom', customKey: 'reserve_bearded_dragons_gte_2', replaceDamage: 800 }],
    }],
  },
  'HDM-101': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Search your Hoodmon Deck for 1 Bright Flame Hoodmon or 1 Shadow Ember Hoodmon, reveal it, put it into your hand, then shuffle your Hoodmon Deck. If you control a Hoodmon from the opposite line, gain 1 Bond.',
  },
  'HDM-102': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Choose up to 1 Bearded Dragon Hoodmon and up to 1 Pit Bull Hoodmon you control. Each chosen Hoodmon gets +300 ATK until end of turn. If you control Peaches or a Pit Bull Hoodmon, gain 1 Bond.',
  },
  'HDM-103': {
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined,
    taskFailureEffectsByPlayer: undefined,
    effectText: 'MAIN TASK — Reveal the top 3 cards of your Hoodmon Deck. You may add 1 Bearded Dragon Hoodmon or 1 card that mentions “Reserve” from among them to your hand. Put the rest on the bottom of your Hoodmon Deck in any order. BONUS — If you have 2 or more Bearded Dragon Hoodmon in your Reserve, draw 1 card.',
  },
  'HDM-104': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    reactionTrigger: 'On Attack Declared',
    effectText: 'Activate when your opponent declares an attack targeting one of your Bearded Dragon Hoodmon. Switch that Hoodmon with 1 Bearded Dragon Hoodmon in your Reserve. The new Active Hoodmon becomes the attack target and gets +200 ATK until end of turn.',
  },
  'HDM-105': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Once per turn, when you deploy or evolve into a Bright Flame or Shadow Ember Hoodmon, look at the top 2 cards of your Hoodmon Deck. You may reveal 1 Bearded Dragon Hoodmon among them and put it into your hand. Put the rest on the bottom of your Hoodmon Deck in any order. While you control at least 1 Bright Flame Hoodmon and 1 Shadow Ember Hoodmon, your Bright Flame and Shadow Ember Hoodmon each get +200 HP.',
  },
  'HDM-106': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Return your Active Bright Flame or Shadow Ember Hoodmon to your hand. If you do, move 1 differently named Bearded Dragon Hoodmon from your Reserve to your Active Hoodmon Zone.',
  },
  'HDM-107': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    reactionTrigger: 'On Attack Declared',
    effectText: 'Activate when your Bearded Dragon Hoodmon attacks. You may reveal 1 Pit Bull Hoodmon or 1 card that mentions Peaches from your hand. If you do, that attack deals +200 damage. Then you may Exhaust 1 opposing Hoodmon.',
  },
  'HDM-108': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Your Bearded Dragon and Pit Bull Hoodmon in your Reserve each get +200 HP. Once per turn, when a Bearded Dragon or Pit Bull Hoodmon moves from your Reserve to your Active Hoodmon Zone, gain 1 Bond.',
  },
  'HDM-109': {
    effectStatus: 'verified_data',
    digitalEffectReady: false,
    effectText: 'Choose up to 1 Bright Flame Hoodmon and up to 1 Shadow Ember Hoodmon you control. Each chosen Hoodmon gets +400 ATK until end of turn and cannot be Exhausted by card effects this turn. If either chosen Hoodmon moved from your Reserve to your Active Hoodmon Zone this turn, draw 1 card.',
  },
  'HDM-110': {
    effectStatus: 'verified_data',
    digitalEffectReady: true,
    taskExecutionReady: true,
    taskRewardEffectsByPlayer: undefined,
    taskFailureEffectsByPlayer: undefined,
    effectText: 'MAIN TASK — Exhaust 2 opposing Hoodmon with card effects during the game. REWARD — Draw 2 cards, then discard 1 card. Choose 1 opposing Hoodmon. It gets -200 ATK until end of turn.',
  },
}
