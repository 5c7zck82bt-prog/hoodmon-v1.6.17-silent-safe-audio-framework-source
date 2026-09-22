import { masterMetadataById } from '../data/masterCardMetadata'
import { TASK_DECK_SIZE } from './engine/constants'
import type { GameSetup } from './engine/types'

export type PlayDeck = { main: string[]; task: string[]; tamer: string[] }

// A complete legal local starter pool, intentionally granted to every profile so ownership rules
// never strand a new player without a legal 40 / 10 / 1 build.
export const STARTER_UNLOCK_IDS = [
  'HDM-001','HDM-002','HDM-003','HDM-004','HDM-005','HDM-006','HDM-007','HDM-008','HDM-009','HDM-010','HDM-011','HDM-012','HDM-013','HDM-014','HDM-015',
  'HDM-016','HDM-017','HDM-018','HDM-019','HDM-020','HDM-021','HDM-022','HDM-023','HDM-024','HDM-025','HDM-026','HDM-027','HDM-028','HDM-029',
  // Extra verified Hoodmon line so the default starter can be 40 fully attack-encoded creature cards.
  'HDM-064','HDM-065','HDM-066',
]

export function createStarterDeck(): PlayDeck {
  const eligible = STARTER_UNLOCK_IDS.filter((id) => {
    const card = masterMetadataById[id]
    // The out-of-box deck intentionally uses verified Hoodmon only so a brand-new account
    // never starts with a hand full of support cards whose remastered effect text is pending.
    return card?.kind === 'Hoodmon' && ['HDM-002','HDM-003','HDM-004','HDM-005','HDM-006','HDM-007','HDM-017','HDM-018','HDM-019','HDM-020','HDM-021','HDM-064','HDM-065','HDM-066'].includes(id)
  })
  const main: string[] = []
  for (const id of eligible) {
    while (main.length < 40 && main.filter((entry) => entry === id).length < 3) main.push(id)
    if (main.length === 40) break
  }
  const task = ['HDM-010','HDM-010','HDM-010','HDM-011','HDM-011','HDM-011','HDM-028','HDM-028','HDM-029','HDM-029']
  return { main, task, tamer: ['HDM-001'] }
}

export function validateDeck(deck: PlayDeck, ownedIds?: Iterable<string>): string[] {
  const problems: string[] = []
  if (deck.main.length !== 40) problems.push('Main Deck must contain exactly 40 cards.')
  if (deck.task.length !== TASK_DECK_SIZE) problems.push(`Task Deck must contain exactly ${TASK_DECK_SIZE} cards.`)
  if (deck.tamer.length !== 1) problems.push('Choose exactly 1 Tamer.')
  const all = [...deck.main, ...deck.task, ...deck.tamer]
  const owned = ownedIds ? new Set(ownedIds) : null
  for (const id of new Set(all)) {
    const card = masterMetadataById[id]
    if (!card) problems.push(`${id} is not a current Series 1 card.`)
    if (owned && !owned.has(id)) problems.push(`${id} is not unlocked on this profile.`)
  }
  // The physical rule is a maximum of 3 copies of one card NAME, not merely 3 of one set number.
  // This also protects the app while older Series 1 numbering aliases are being reconciled.
  const copiesByName = new Map<string, number>()
  for (const id of all) {
    const card = masterMetadataById[id]
    if (!card || card.kind === 'Tamer') continue
    const key = card.name.trim().toLowerCase()
    copiesByName.set(key, (copiesByName.get(key) ?? 0) + 1)
  }
  for (const [key, copies] of copiesByName) {
    if (copies <= 3) continue
    const name = all.map((id) => masterMetadataById[id]).find((card) => card?.name.trim().toLowerCase() === key)?.name ?? key
    problems.push(`${name} exceeds the 3-copy-by-name limit.`)
  }
  if (deck.main.some((id) => ['Task','Tamer'].includes(masterMetadataById[id]?.kind ?? ''))) problems.push('Main Deck contains a Task or Tamer card.')
  if (deck.task.some((id) => masterMetadataById[id]?.kind !== 'Task')) problems.push('Task Deck may contain only Task cards.')
  if (deck.tamer.some((id) => masterMetadataById[id]?.kind !== 'Tamer')) problems.push('Tamer slot may contain only a Tamer card.')
  if (!deck.main.some((id) => masterMetadataById[id]?.kind === 'Hoodmon' && masterMetadataById[id]?.stageLevel === 1)) problems.push('Main Deck needs at least one Basic Hoodmon.')
  return [...new Set(problems)]
}

export function buildSetup(playerDeck: PlayDeck, aiDeck: PlayDeck, firstPlayer?: 'P1' | 'P2'): GameSetup {
  return {
    p1Deck: [...playerDeck.main], p1TaskDeck: [...playerDeck.task], p1TamerId: playerDeck.tamer[0],
    p2Deck: [...aiDeck.main], p2TaskDeck: [...aiDeck.task], p2TamerId: aiDeck.tamer[0],
    firstPlayer, shuffleDecks: true,
  }
}

export function deckSignature(deck: PlayDeck) {
  const text = `${deck.main.join(',')}|${deck.task.join(',')}|${deck.tamer.join(',')}`
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(36)
}

const AI_PACKS: Array<{ tamer: string; main: string[]; tasks: string[] }> = [
  { tamer: 'HDM-001', main: ['HDM-002','HDM-003','HDM-004','HDM-005','HDM-006','HDM-007','HDM-008','HDM-009','HDM-012','HDM-013','HDM-014','HDM-015','HDM-017','HDM-020'], tasks: ['HDM-010','HDM-011','HDM-028','HDM-029'] },
  { tamer: 'HDM-016', main: ['HDM-017','HDM-018','HDM-019','HDM-020','HDM-021','HDM-022','HDM-023','HDM-024','HDM-025','HDM-026','HDM-027','HDM-002','HDM-003','HDM-005'], tasks: ['HDM-028','HDM-029','HDM-010','HDM-011'] },
  { tamer: 'HDM-030', main: ['HDM-031','HDM-032','HDM-033','HDM-034','HDM-035','HDM-036','HDM-037','HDM-038','HDM-039','HDM-040','HDM-041','HDM-042','HDM-045','HDM-005'], tasks: ['HDM-010','HDM-011','HDM-028','HDM-029'] },
  { tamer: 'HDM-063', main: ['HDM-064','HDM-065','HDM-066','HDM-069','HDM-070','HDM-071','HDM-072','HDM-073','HDM-074','HDM-075','HDM-077','HDM-002','HDM-017','HDM-020'], tasks: ['HDM-010','HDM-011','HDM-028','HDM-029'] },
  { tamer: 'HDM-078', main: ['HDM-079','HDM-080','HDM-081','HDM-082','HDM-083','HDM-084','HDM-061','HDM-070','HDM-071','HDM-074','HDM-075','HDM-002','HDM-017','HDM-020'], tasks: ['HDM-010','HDM-011','HDM-028','HDM-029'] },
  { tamer: 'HDM-094', main: ['HDM-095','HDM-096','HDM-097','HDM-098','HDM-099','HDM-100','HDM-101','HDM-102','HDM-104','HDM-105','HDM-106','HDM-107','HDM-108','HDM-109'], tasks: ['HDM-010','HDM-011','HDM-028','HDM-029'] },
]

function fillTo40(ids: string[]) {
  const result: string[] = []
  for (let pass = 0; pass < 3 && result.length < 40; pass += 1) {
    for (const id of ids) {
      if (result.length >= 40) break
      const card = masterMetadataById[id]
      if (!card || card.kind === 'Task' || card.kind === 'Tamer') continue
      const sameNameCopies = result.filter((entry) => masterMetadataById[entry]?.name === card.name).length
      if (sameNameCopies < 3) result.push(id)
    }
  }
  if (result.length < 40) return createStarterDeck().main
  return result
}
const STARTER_TASK_IDS = ['HDM-010','HDM-011','HDM-028','HDM-029']

export function migrateTaskDeckToCurrentRules(ids: string[]): string[] {
  const result: string[] = []
  const candidates = [...ids, ...STARTER_TASK_IDS]
  for (const id of candidates) {
    const card = masterMetadataById[id]
    if (card?.kind !== 'Task') continue
    if (result.length >= TASK_DECK_SIZE) break
    if (result.filter((entry) => entry === id).length >= 3) continue
    result.push(id)
  }
  // Repeat legal starter Tasks as needed while respecting the three-copy limit.
  for (let pass = 0; pass < 3 && result.length < TASK_DECK_SIZE; pass += 1) {
    for (const id of STARTER_TASK_IDS) {
      if (result.length >= TASK_DECK_SIZE) break
      if (result.filter((entry) => entry === id).length < 3) result.push(id)
    }
  }
  return result.slice(0, TASK_DECK_SIZE)
}

function fillTasks(ids: string[]) {
  const expanded: string[] = []
  for (let pass = 0; pass < 3 && expanded.length < TASK_DECK_SIZE; pass += 1) {
    for (const id of ids) {
      if (expanded.length >= TASK_DECK_SIZE) break
      if (expanded.filter((entry) => entry === id).length < 3) expanded.push(id)
    }
  }
  return migrateTaskDeckToCurrentRules(expanded)
}

export function createAiDeck(towerFloor = 1): PlayDeck {
  const pack = AI_PACKS[Math.max(0, towerFloor - 1) % AI_PACKS.length]
  return { main: fillTo40(pack.main), task: fillTasks(pack.tasks), tamer: [pack.tamer] }
}
