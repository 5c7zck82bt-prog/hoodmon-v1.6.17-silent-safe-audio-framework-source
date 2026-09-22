import { appendLog } from './helpers'
import type { CardDefinition, CardInstance, GameState, PlayerId, Position } from './types'
import { reactionExecutionReady } from './reactions'
import { support39CardCostDiscount } from './support39'
import {
  activateFieldEffect,
  activateStandardMagicEffect,
  afterCardPlayed,
  fieldExecutionReady,
  removeFieldEffect,
  openActivationReaction,
  shouldOpenActivationReaction,
  standardMagicExecutionReady,
  standardMagicHasLegalTarget,
} from './cardEffects'

export type SupportTarget = 'field' | 'magic_1' | 'magic_2' | 'magic_3' | 'trap_1' | 'trap_2'

function makeSupportInstance(definitionId: string, owner: PlayerId, position: Position, turn: number): CardInstance {
  return {
    instanceId: `${owner}-SUPPORT-${definitionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    definitionId,
    owner,
    controller: owner,
    readyState: 'ready',
    position,
    damageTaken: 0,
    commandsUsedThisTurn: 0,
    turnSet: turn,
    evolutionStack: [],
    restrictions: {},
    restrictionExpiresOnTurn: {},
    modifiers: [],
    runtimeAbilities: [],
    statuses: [],
    statusExpiresOnTurn: {},
  }
}

export function playSupportCard(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
  target: SupportTarget,
): GameState {
  if (state.status !== 'active') throw new Error('Game is not accepting a support card right now.')
  if (state.currentPhase !== 'Main') throw new Error('Field, Standard Magic, Equipment, and set Traps are normally played during Main Phase.')
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.")

  const player = state.players[playerId]
  const handIndex = player.hand.indexOf(definitionId)
  if (handIndex < 0) throw new Error('That card is not in your hand.')

  const definition = definitions[definitionId]
  if (!definition) throw new Error('That card has not been encoded in the battle engine yet.')

  const printedCost = definition.bondCost ?? 0
  const supportDiscount = support39CardCostDiscount(state, definitions, playerId, definitionId, false)
  const cost = Math.max(0, printedCost - supportDiscount)
  if (player.bond < cost) throw new Error(`Not enough Bond. ${definition.name} costs ${cost}.`)

  if (target === 'field') {
    if (definition.cardType !== 'field') throw new Error('Only a Field card can be dropped on the Field zone.')
    if (!fieldExecutionReady(definitionId)) throw new Error(`${definition.name} has verified card data, but its persistent Field effect is not digitally executable yet. The card stays in your hand.`)
    player.bond -= cost
    if (supportDiscount) support39CardCostDiscount(state, definitions, playerId, definitionId, true)
    player.hand.splice(handIndex, 1)
    if (player.field) {
      removeFieldEffect(state, definitions, playerId, player.field.definitionId)
      player.discard.push(player.field.definitionId)
      appendLog(state, `${playerId} replaced ${definitions[player.field.definitionId]?.name ?? player.field.definitionId}. The old Field went to the Discard.`)
    }
    player.field = makeSupportInstance(definitionId, playerId, 'field', state.turnNumber)
    appendLog(state, `${playerId} played ${definition.name}${cost ? ` for ${cost} Bond` : ''}.`)
    if (shouldOpenActivationReaction(state, definitions, playerId, 'field')) {
      return openActivationReaction(state, playerId, definitionId, 'ACTIVATE_FIELD', 'field', {
        sourceZone: 'field',
        sourceInstanceId: player.field.instanceId,
      })
    }
    return afterCardPlayed(activateFieldEffect(state, definitions, playerId, definitionId), definitions, playerId, definitionId)
  }

  if (target.startsWith('trap_')) {
    if (definition.cardType !== 'trap') throw new Error('Only a Trap card can be dropped on a Trap zone.')
    if (!reactionExecutionReady(definitionId)) throw new Error(`${definition.name}'s Trap effect is not digitally executable yet. The card stays in your hand.`)
    const index = Number(target.split('_')[1]) - 1
    if (index < 0 || index > 1) throw new Error('Invalid Trap zone.')
    if (player.traps[index]) throw new Error('That Trap zone is occupied.')
    player.bond -= cost
    if (supportDiscount) support39CardCostDiscount(state, definitions, playerId, definitionId, true)
    player.hand.splice(handIndex, 1)
    player.traps[index] = makeSupportInstance(definitionId, playerId, target as Position, state.turnNumber)
    appendLog(state, `${playerId} set a Trap${cost ? ` for ${cost} Bond` : ''}. It cannot normally activate this turn.`)
    return afterCardPlayed(state, definitions, playerId, definitionId)
  }

  if (target.startsWith('magic_')) {
    if (definition.cardType !== 'magic') throw new Error('Only a Magic or Equipment card can be dropped on a Magic / Equipment zone.')
    if (definition.magicSubtype === 'Quick') throw new Error('Quick Magic is activated from hand during a legal Reaction Window, not played into a Magic zone during Main Phase.')
    if (definition.magicSubtype !== 'Standard' || !standardMagicExecutionReady(definitionId)) {
      throw new Error(`${definition.name}'s ${definition.magicSubtype ?? 'Standard'} Magic effect is not digitally executable yet. The card stays in your hand.`)
    }
    if (!standardMagicHasLegalTarget(state, definitions, playerId, definitionId)) {
      throw new Error(`${definition.name} has no legal target right now. The card stays in your hand.`)
    }
    player.bond -= cost
    if (supportDiscount) support39CardCostDiscount(state, definitions, playerId, definitionId, true)
    player.hand.splice(handIndex, 1)
    player.discard.push(definitionId)
    appendLog(state, `${playerId} played ${definition.name}${cost ? ` for ${cost} Bond` : ''}. Standard Magic goes to the Discard after activation.`)
    if (shouldOpenActivationReaction(state, definitions, playerId, 'magic')) {
      return openActivationReaction(state, playerId, definitionId, 'ACTIVATE_STANDARD_MAGIC', 'magic', { sourceZone: 'discard' })
    }
    return afterCardPlayed(activateStandardMagicEffect(state, definitions, playerId, definitionId), definitions, playerId, definitionId)
  }

  throw new Error('That card cannot be played on this zone.')
}
