import completedData from '../data/completedCardData.json'
import { masterCardMetadata, masterMetadataById } from '../data/masterCardMetadata'
import type { CardDefinition, CardType, EngineEffect } from './engine/types'
import { reactionExecutionReady } from './engine/reactions'
import { endBlockRuntimeOverrides } from './endBlockOverrides'
import { earlyCardRuntimeOverrides } from './earlyCardOverrides'
import { reconciledCardRuntimeOverrides } from './reconciledCardOverrides'
import { support39RuntimeOverrides } from './support39Overrides'

const completedCards = ((completedData as { cards?: unknown[] }).cards ?? []) as Array<Record<string, any>>

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const currentTasksByName: Record<string, string> = {
  checkontheblock: 'HDM-028',
  everybodyeats: 'HDM-029',
  cashinwhenitcounts: 'HDM-043',
  walkhimdown: 'HDM-044',
  markedformidnight: 'HDM-055',
  deaddropmessage: 'HDM-058',
  datasnatch: 'HDM-062',
  dewdropcache: 'HDM-068',
  tinycreaturesbiggermoves: 'HDM-076',
  researchrecordreveal: 'HDM-085',
  reserverollcall: 'HDM-103',
  crashtheirfeed: 'HDM-110',
}

const matchedById = new Map<string, Record<string, any>>()
for (const card of completedCards) {
  const id = String(card.card_series_id ?? '')
  if (id.startsWith('HDM-T-')) continue
  const master = masterMetadataById[id]
  if (!master) continue
  if (normalize(master.name) !== normalize(String(card.card_name ?? ''))) continue
  if (master.kind.toLowerCase() !== String(card.card_type ?? '').toLowerCase()) continue
  matchedById.set(id, card)
}

const taskByCurrentId = new Map<string, Record<string, any>>()
for (const card of completedCards) {
  if (String(card.card_type).toLowerCase() !== 'task') continue
  const mapped = currentTasksByName[normalize(String(card.card_name ?? ''))]
  if (mapped) taskByCurrentId.set(mapped, card)
}

function cardType(kind: string): CardType {
  return kind.toLowerCase() as CardType
}

function convertTaskEffects(tokens: Array<Record<string, any>> | undefined, player: 'P1' | 'P2'): EngineEffect[] {
  const effects: EngineEffect[] = []
  for (const token of tokens ?? []) {
    if (token.action === 'gain_bond' && Number.isFinite(Number(token.amount))) {
      effects.push({ type: 'gain_bond', player, amount: Number(token.amount) })
    }
    if (token.action === 'draw' && Number.isFinite(Number(token.amount))) {
      effects.push({ type: 'draw', player, amount: Number(token.amount) })
    }
  }
  return effects
}

function attacksFrom(card: Record<string, any> | undefined) {
  if (!card || !Array.isArray(card.attacks)) return undefined
  const attacks = card.attacks.flatMap((attack: Record<string, any>) => {
    const baseDamage = Number(attack.base_damage)
    if (!Number.isFinite(baseDamage)) return []
    const conditionalDamage: NonNullable<CardDefinition['attacks']>[number]['conditionalDamage'] = []
    const tokens = attack.effect?.tokens as Array<Record<string, any>> | undefined
    for (const token of tokens ?? []) {
      if (token.replace_damage !== undefined) {
        const raw = String(token.condition ?? '')
        if (raw === 'self_evolved_this_turn' || raw === 'attacker_evolved_this_turn') {
          conditionalDamage.push({ condition: 'attacker_evolved_this_turn', replaceDamage: Number(token.replace_damage) })
        }
      }
    }
    return [{
      attackName: String(attack.attack_name ?? 'Attack'),
      baseDamage,
      cost: Number(attack.cost ?? 0),
      usesAtkInFormula: attack.uses_atk_in_formula === true,
      conditionalDamage: conditionalDamage.length ? conditionalDamage : undefined,
    }]
  })
  return attacks.length ? attacks : undefined
}

export const series1Definitions: Record<string, CardDefinition> = Object.fromEntries(
  masterCardMetadata.map((master) => {
    const completed = matchedById.get(master.id)
    const completedTask = master.kind === 'Task' ? taskByCurrentId.get(master.id) : undefined
    const evolvesFrom = completed?.evolves_from && masterMetadataById[String(completed.evolves_from)]
      ? String(completed.evolves_from)
      : null
    const def: CardDefinition = {
      id: master.id,
      name: master.name,
      cardType: cardType(master.kind),
      stageLevel: master.stageLevel,
      evolvesFrom,
      bondCost: master.kind === 'Hoodmon' ? master.bondCost : master.cost,
      atk: master.atk,
      hp: master.hp,
      taskRating: master.taskRating,
      attacks: attacksFrom(completed),
      taskDifficulty: completedTask ? Number(completedTask.task_difficulty ?? master.taskDifficulty ?? 100) : master.taskDifficulty,
      taskTier: completedTask?.task_tier as CardDefinition['taskTier'],
      magicSubtype: master.magicSubtype,
      alignment: master.alignment,
      archetypeTags: master.traits,
      effectStatus: completed || completedTask ? 'verified_data' : 'pending',
      effectText: completed?.effect?.raw_text ?? completed?.passive_effect?.raw_text ?? completedTask?.reward?.raw_text ?? undefined,
      reactionTrigger: completed?.trigger_condition ?? undefined,
      taskRewardEffectsByPlayer: master.kind === 'Task' ? (completedTask ? {
        P1: convertTaskEffects(completedTask.reward?.tokens, 'P1'),
        P2: convertTaskEffects(completedTask.reward?.tokens, 'P2'),
      } : { P1: [{ type: 'gain_bond', player: 'P1', amount: 1 }], P2: [{ type: 'gain_bond', player: 'P2', amount: 1 }] }) : undefined,
      taskFailureEffectsByPlayer: completedTask ? {
        P1: convertTaskEffects(completedTask.failure?.tokens, 'P1'),
        P2: convertTaskEffects(completedTask.failure?.tokens, 'P2'),
      } : undefined,
    }
    const early = earlyCardRuntimeOverrides[master.id]
    if (early) Object.assign(def, early)
    const reconciled = reconciledCardRuntimeOverrides[master.id]
    if (reconciled) Object.assign(def, reconciled)
    const authoritative = endBlockRuntimeOverrides[master.id]
    if (authoritative) Object.assign(def, authoritative)
    const support39 = support39RuntimeOverrides[master.id]
    if (support39) Object.assign(def, support39)
    return [master.id, def]
  }),
)

export const verifiedRuntimeCardIds = new Set(
  Object.values(series1Definitions).filter((card) => card.effectStatus === 'verified_data').map((card) => card.id),
)

export function definitionEffectLabel(id: string) {
  const card = series1Definitions[id]
  if (!card) return 'EFFECT DATA UNAVAILABLE'
  if (card.digitalEffectReady === true) return 'DIGITAL EFFECT READY'
  if (card.cardType === 'hoodmon') {
    if (!card.attacks?.length) return 'ATTACK ENCODING PENDING'
    return card.digitalEffectReady === false && card.effectText ? 'ATTACK READY · CARD EFFECT PENDING' : 'BATTLE DATA READY'
  }
  if (card.cardType === 'task') {
    if (card.effectStatus !== 'verified_data') return 'TASK EFFECT PENDING'
    return card.taskExecutionReady === false ? 'TASK RULES VERIFIED · DIGITAL OBJECTIVE TRACKING PENDING' : 'TASK DATA VERIFIED'
  }
  if ((card.cardType === 'trap' || (card.cardType === 'magic' && card.magicSubtype === 'Quick')) && reactionExecutionReady(id)) return 'DIGITAL REACTION READY'
  return card.effectStatus === 'verified_data' ? 'RULE DATA VERIFIED · DIGITAL EFFECT PENDING' : 'EFFECT ENCODING PENDING'
}
