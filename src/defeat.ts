import { appendLog, effectiveHp } from './helpers'
import { leavePlayToDiscard } from './movement'
import { syncSupport39PersistentFields } from './support39'
import type { CardDefinition, GameState, PlayerId } from './types'

export function resolveDefeats(state: GameState, definitions: Record<string, CardDefinition>): GameState {
  for (const playerId of ['P1', 'P2'] as PlayerId[]) {
    const player = state.players[playerId]
    const hoodmon = [player.activeHoodmon, ...player.reserves].filter(Boolean)
    for (const card of hoodmon) {
      if (!card) continue
      const definition = definitions[card.definitionId]
      const maxHp = effectiveHp(definition, card)
      if (definition?.hp === undefined || card.damageTaken < maxHp) continue
      const wasActive = player.activeHoodmon?.instanceId === card.instanceId
      appendLog(state, `${definition.name} was defeated.`)
      leavePlayToDiscard(state, playerId, card.instanceId)
      if (wasActive && player.reserves.some(Boolean) && !state.pendingPromotion) {
        state.pendingPromotion = playerId
        appendLog(state, `${playerId} must promote a Reserve Hoodmon after the current action finishes.`)
      }
    }
  }
  syncSupport39PersistentFields(state, definitions, 'P1')
  syncSupport39PersistentFields(state, definitions, 'P2')
  return state
}
