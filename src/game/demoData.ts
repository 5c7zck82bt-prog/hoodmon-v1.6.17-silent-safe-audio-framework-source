import type { CardDefinition, GameSetup } from './engine/types'

/**
 * Playable rules-test definitions for the current digital arena.
 * The complete Series 1 visual library remains separate; cards should move into this map
 * only when their printed gameplay text has been encoded and verified.
 */
export const demoDefinitions: Record<string, CardDefinition> = {
  'HDM-001': { id: 'HDM-001', name: 'O.D.D. Paul', cardType: 'tamer' },
  'HDM-002': {
    id: 'HDM-002', name: 'Alley Pup', cardType: 'hoodmon', stageLevel: 1,
    evolvesFrom: null, bondCost: 1, atk: 300, hp: 700, taskRating: 100,
    attacks: [{ attackName: 'Puppy Rush', baseDamage: 250 }],
  },
  'HDM-003': {
    id: 'HDM-003', name: 'Bluefang Hound', cardType: 'hoodmon', stageLevel: 2,
    evolvesFrom: 'HDM-002', bondCost: 3, atk: 900, hp: 1600, taskRating: 400,
    attacks: [{ attackName: 'Bluefang Rush', baseDamage: 400 }],
  },
  'HDM-004': {
    id: 'HDM-004',
    name: 'Drunk Fist Wulf',
    cardType: 'hoodmon',
    stageLevel: 3,
    evolvesFrom: 'HDM-003',
    bondCost: 5,
    atk: 1600,
    hp: 2800,
    taskRating: 700,
    attacks: [{ attackName: 'Drunk Fist Fang', baseDamage: 600 }],
  },
  'HDM-063': { id: 'HDM-063', name: 'Tax Rell', cardType: 'tamer' },
  'HDM-064': {
    id: 'HDM-064', name: 'Mistling', cardType: 'hoodmon', stageLevel: 1,
    evolvesFrom: null, bondCost: 1, atk: 300, hp: 700, taskRating: 100,
    attacks: [{ attackName: 'Mist Nip', baseDamage: 250 }],
  },
  'HDM-065': {
    id: 'HDM-065', name: 'Vaporgeck', cardType: 'hoodmon', stageLevel: 2,
    evolvesFrom: 'HDM-064', bondCost: 3, atk: 900, hp: 1600, taskRating: 400,
    attacks: [{ attackName: 'Vapor Strike', baseDamage: 400 }],
  },
  'HDM-066': {
    id: 'HDM-066',
    name: 'Nebulizard',
    cardType: 'hoodmon',
    stageLevel: 3,
    evolvesFrom: 'HDM-065',
    bondCost: 5,
    atk: 1600,
    hp: 2800,
    taskRating: 700,
    attacks: [
      {
        attackName: 'Nebula Veil Ambush',
        baseDamage: 600,
        conditionalDamage: [
          { condition: 'target_exhausted', replaceDamage: 800 },
          { condition: 'target_atk_reduced', replaceDamage: 800 },
        ],
      },
    ],
  },
  'PRACTICE-TASK-STREET': {
    id: 'PRACTICE-TASK-STREET', name: 'Rooftop Run', cardType: 'task',
    taskTier: 'Street', taskDifficulty: 300,
  },
  'PRACTICE-TASK-MAJOR': {
    id: 'PRACTICE-TASK-MAJOR', name: 'Block Check', cardType: 'task',
    taskTier: 'Major', taskDifficulty: 400,
  },
  'PRACTICE-TASK-CRISIS': {
    id: 'PRACTICE-TASK-CRISIS', name: 'Neighborhood Emergency', cardType: 'task',
    taskTier: 'Crisis', taskDifficulty: 700,
  },
}

function practiceDeck(basic: string, stage2: string, stage3: string): string[] {
  // A 40-card engine test deck with enough Basics to exercise mulligans/setup reliably.
  // This is deliberately a practice fixture, not a tournament-legal Series 1 deck list.
  return [
    ...Array.from({ length: 18 }, () => basic),
    ...Array.from({ length: 11 }, () => stage2),
    ...Array.from({ length: 11 }, () => stage3),
  ]
}

const taskDeck = [
  'PRACTICE-TASK-MAJOR',
  'PRACTICE-TASK-STREET',
  'PRACTICE-TASK-MAJOR',
  'PRACTICE-TASK-CRISIS',
  'PRACTICE-TASK-STREET',
  'PRACTICE-TASK-MAJOR',
  'PRACTICE-TASK-CRISIS',
  'PRACTICE-TASK-STREET',
  'PRACTICE-TASK-CRISIS',
  'PRACTICE-TASK-STREET',
]

export const demoSetup: GameSetup = {
  p1Deck: practiceDeck('HDM-002', 'HDM-003', 'HDM-004'),
  p2Deck: practiceDeck('HDM-064', 'HDM-065', 'HDM-066'),
  p1TaskDeck: [...taskDeck],
  p2TaskDeck: [...taskDeck],
  p1TamerId: 'HDM-001',
  p2TamerId: 'HDM-063',
  localFaceToFaceMode: false,
  shuffleDecks: true,
}
