import type { CardDefinition, CardInstance, GameState, PlayerId } from './engine/types'
import type { SupportTarget } from './engine/support'
import { reactionExecutionReady } from './engine/reactions'
import { fieldExecutionReady, standardMagicExecutionReady, standardMagicHasLegalTarget } from './engine/cardEffects'

export type HoodmonDropTarget = 'active' | 'reserve_1' | 'reserve_2' | 'reserve_3'
export type BattleDropTarget = HoodmonDropTarget | SupportTarget

export function canDropOnHoodmonSlot(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  cardId: string | null,
  target: HoodmonDropTarget,
  occupant: CardInstance | null,
): boolean {
  if (!cardId || state.status !== 'active' || state.currentPlayerTurn !== playerId || state.currentPhase !== 'Main') return false
  const player = state.players[playerId]
  if (!player.hand.includes(cardId)) return false
  const definition = definitions[cardId]
  if (!definition || definition.cardType !== 'hoodmon') return false

  if (occupant) {
    if (state.round < 2 || occupant.restrictions.cannotEvolve) return false
    const current = definitions[occupant.definitionId]
    const discount = (occupant.runtimeAbilities ?? [])
      .filter((ability) => ability.kind === 'street_contract' && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber)
      .reduce((sum, ability) => sum + Math.max(0, ability.amount), 0)
    const evolutionCost = Math.max(0, (definition.bondCost ?? 0) - discount)
    return Boolean(
      current?.stageLevel
      && definition.stageLevel === current.stageLevel + 1
      && definition.evolvesFrom === current.id
      && player.bond >= evolutionCost
    )
  }

  if (player.bond < (definition.bondCost ?? 0)) return false
  if (definition.stageLevel !== 1 || player.normalDeployUsed) return false
  if (target === 'active') return !player.activeHoodmon
  if (!player.activeHoodmon) return false
  const index = Number(target.split('_')[1]) - 1
  return index >= 0 && index <= 2 && !player.reserves[index]
}

export function canDropOnSupportZone(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  cardId: string | null,
  target: SupportTarget,
): boolean {
  if (!cardId || state.status !== 'active' || state.currentPlayerTurn !== playerId || state.currentPhase !== 'Main') return false
  const player = state.players[playerId]
  if (!player.hand.includes(cardId)) return false
  const definition = definitions[cardId]
  if (!definition || player.bond < (definition.bondCost ?? 0)) return false

  if (target === 'field') return definition.cardType === 'field' && fieldExecutionReady(cardId)
  if (target.startsWith('trap_')) {
    if (definition.cardType !== 'trap' || !reactionExecutionReady(cardId)) return false
    const index = Number(target.split('_')[1]) - 1
    return index >= 0 && index <= 1 && !player.traps[index]
  }
  if (target.startsWith('magic_')) {
    if (definition.cardType !== 'magic' || definition.magicSubtype === 'Quick') return false
    if (definition.magicSubtype !== 'Standard' || !standardMagicExecutionReady(cardId)) return false
    return standardMagicHasLegalTarget(state, definitions, playerId, cardId)
  }
  return false
}
