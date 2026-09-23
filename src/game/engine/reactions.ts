import { banishActivationSource, notifyOpponentCardRevealed, openChoice } from './cardEffects'
import { addRuntimeAbility, appendLog, findHoodmon, hasStatus, otherPlayer } from './helpers'
import { resolveSupport39Reaction, support39CardEffectsNegated, support39NoProtectReaction, support39ReactionReady, support39ReactionSpecificLegality } from './support39'
import type { CardDefinition, CardInstance, GameState, PlayerId, ReactionWindow } from './types'

// Only reaction cards with a concrete digital resolver should be offered as playable.
// Verified rules data alone is not enough if the target/choice UI has not been implemented yet.
const EXECUTABLE_REACTION_IDS = new Set(['HDM-026', 'HDM-040', 'HDM-041', 'HDM-077', 'HDM-086', 'HDM-091'])

export function reactionExecutionReady(definitionId: string) {
  return EXECUTABLE_REACTION_IDS.has(definitionId) || support39ReactionReady(definitionId)
}

function alignment(def: CardDefinition | undefined, wanted: string[]) {
  return Boolean(def?.alignment?.some((item) => wanted.includes(item)))
}
function trait(def: CardDefinition | undefined, wanted: string[]) {
  return Boolean(def?.archetypeTags?.some((item) => wanted.includes(item)))
}
function mentionsResearchOrTruthNetwork(def: CardDefinition | undefined) {
  if (!def) return false
  const text = [def.name, def.effectText ?? '', ...(def.archetypeTags ?? [])].join(' ').toLowerCase()
  return text.includes('research') || text.includes('truth network')
}
function allHoodmon(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId]
  return [player.activeHoodmon, ...player.reserves].filter((card): card is CardInstance => Boolean(card))
}
function birdBrainReactionSource(state: GameState, defs: Record<string, CardDefinition>, playerId: PlayerId) {
  const window = state.reactionWindow
  const pending = window?.pendingEffect
  if (!window || window.openedBy !== 'effect' || !pending || pending.sourcePlayer === playerId || state.players[playerId].bond < 1) return null
  const markedSource = allHoodmon(state, pending.sourcePlayer).find((card) => card.definitionId === pending.sourceCardId && hasStatus(card, 'marked'))
  if (!markedSource) return null
  return allHoodmon(state, playerId).find((card) => card.definitionId === 'HDM-019'
    && !support39CardEffectsNegated(state, card)
    && !(card.runtimeAbilities ?? []).some((ability) => ability.kind === 'support39_marker' && ability.sourceCardId === 'HDM-019-HACK' && ability.expiresOnTurn === state.turnNumber)) ?? null
}

function reserveIndex(state: GameState, playerId: PlayerId, predicate: (def: CardDefinition) => boolean, defs: Record<string, CardDefinition>) {
  return state.players[playerId].reserves.findIndex((card) => card ? predicate(defs[card.definitionId]) : false)
}
function switchActive(state: GameState, playerId: PlayerId, index: number) {
  const player = state.players[playerId]
  const next = player.reserves[index]
  if (!next) return null
  const old = player.activeHoodmon
  next.position = 'active'
  player.activeHoodmon = next
  if (old) {
    old.position = `reserve_${index + 1}` as CardInstance['position']
    player.reserves[index] = old
  } else player.reserves[index] = null
  return { old, next }
}
function addStat(card: CardInstance | null, source: string, stat: 'atk'|'task', amount: number, turn: number) {
  if (!card) return
  card.modifiers.push({ id: `${source}-${card.instanceId}-${turn}`, sourceCardId: source, stat, amount, duration: 'until_end_of_turn', expiresOnTurn: turn })
}
function triggerMatches(def: CardDefinition, window: ReactionWindow) {
  if (def.cardType === 'magic' && def.magicSubtype === 'Quick') return true
  if (def.cardType !== 'trap') return false
  const trigger = (def.reactionTrigger ?? '').toLowerCase()
  if (window.openedBy === 'attack') return trigger.includes('attack') || ['HDM-015','HDM-057'].includes(def.id)
  if (window.openedBy === 'evolution') return trigger.includes('evolution') || trigger.includes('evolve')
  if (window.openedBy === 'effect') return trigger.includes('effect') || trigger.includes('target')
  if (window.openedBy === 'task') return trigger.includes('task')
  return false
}

function reactionSpecificLegality(state: GameState, defs: Record<string, CardDefinition>, playerId: PlayerId, definitionId: string) {
  const window = state.reactionWindow
  if (!window) return false
  if (support39ReactionReady(definitionId)) return support39ReactionSpecificLegality(state, defs, playerId, definitionId)
  if (definitionId === 'HDM-040') {
    return window.openedBy === 'attack' && Boolean(window.pendingAttack && window.pendingAttack.attacker !== playerId)
  }
  if (definitionId === 'HDM-041') {
    const pending = window.pendingEffect
    if (window.openedBy !== 'effect' || !pending || pending.sourcePlayer === playerId) return false
    return pending.targetRefs.some((ref) => {
      const [owner, instanceId] = ref.split('|') as [PlayerId, string]
      if (owner !== playerId) return false
      const target = findHoodmon(state.players[playerId], instanceId)
      return Boolean(target && alignment(defs[target.definitionId], ['Beast', 'Dark']))
    })
  }
  if (definitionId === 'HDM-086') {
    const pending = window.pendingEffect
    if (window.openedBy !== 'effect' || !pending || pending.sourcePlayer === playerId) return false
    const kind = String(pending.context?.activationKind ?? '')
    return kind === 'magic' || kind === 'activate'
  }
  if (definitionId === 'HDM-091') {
    const pending = window.pendingEffect
    if (window.openedBy !== 'effect' || !pending || pending.sourcePlayer === playerId) return false
    const kind = String(pending.context?.activationKind ?? '')
    return kind === 'magic' || kind === 'field' || kind === 'activate'
  }
  return true
}

export function legalReactionCardIds(state: GameState, defs: Record<string, CardDefinition>, playerId: PlayerId) {
  const window = state.reactionWindow
  if (state.status !== 'reaction' || !window || window.priority !== playerId) return []
  const player = state.players[playerId]
  if (support39NoProtectReaction(state, playerId)) return []
  const hand = player.hand.filter((id) => {
    const def = defs[id]
    return reactionExecutionReady(id) && def?.cardType === 'magic' && def.magicSubtype === 'Quick' && def.effectStatus === 'verified_data' && (def.bondCost ?? 0) <= player.bond
  })
  const traps = player.traps.flatMap((card) => {
    if (!card || card.turnSet === state.turnNumber) return []
    const def = defs[card.definitionId]
    return reactionExecutionReady(card.definitionId) && def?.effectStatus === 'verified_data' && triggerMatches(def, window) && reactionSpecificLegality(state, defs, playerId, card.definitionId) && (def.bondCost ?? 0) <= player.bond ? [card.definitionId] : []
  })
  const boardAbilities = birdBrainReactionSource(state, defs, playerId) ? ['HDM-019'] : []
  return [...new Set([...hand, ...traps, ...boardAbilities])]
}

export function activateReactionCard(state: GameState, defs: Record<string, CardDefinition>, playerId: PlayerId, definitionId: string) {
  const window = state.reactionWindow
  if (state.status !== 'reaction' || !window || window.priority !== playerId) throw new Error('That player does not have reaction priority.')
  if (!legalReactionCardIds(state, defs, playerId).includes(definitionId)) throw new Error('That reaction card is not legal in this window.')
  const player = state.players[playerId]
  const def = defs[definitionId]
  if (definitionId === 'HDM-019') {
    const birdBrain = birdBrainReactionSource(state, defs, playerId)
    if (!birdBrain) throw new Error('Hack the Sky is no longer legal.')
    player.bond -= 1
    addRuntimeAbility(state, birdBrain, 'HDM-019-HACK', 'support39_marker', 1, state.turnNumber)
    const active = state.currentPlayerTurn
    const nonActive = otherPlayer(active)
    if (playerId === nonActive) { window.nonActivePlayerResponded = true; window.priority = active }
    else { window.activePlayerResponded = true }
    window.responseCards.push({ player: playerId, definitionId })
    appendLog(state, `${playerId} activated Bird Brain — Hack the Sky and paid 1 Bond.`)
    return state
  }
  const cost = def.bondCost ?? 0
  if (player.bond < cost) throw new Error('Not enough Bond for that reaction.')
  player.bond -= cost
  if (def.cardType === 'magic') {
    const index = player.hand.indexOf(definitionId)
    if (index < 0) throw new Error('Quick Magic is no longer in hand.')
    player.hand.splice(index, 1)
    player.discard.push(definitionId)
  } else {
    const slot = player.traps.findIndex((card) => card?.definitionId === definitionId)
    if (slot < 0) throw new Error('Set Trap not found.')
    player.traps[slot] = null
    player.discard.push(definitionId)
  }
  const active = state.currentPlayerTurn
  const nonActive = otherPlayer(active)
  if (playerId === nonActive) { window.nonActivePlayerResponded = true; window.priority = active }
  else { window.activePlayerResponded = true }
  window.responseCards.push({ player: playerId, definitionId })
  appendLog(state, `${playerId} activated ${def.name} in the Reaction Window.`)
  return state
}

export function resolveReactionCard(state: GameState, defs: Record<string, CardDefinition>, playerId: PlayerId, definitionId: string) {
  const window = state.reactionWindow
  if (!window) return state
  const def = defs[definitionId]
  if (!def) return state
  const pending = window.pendingAttack
  if (definitionId === 'HDM-019') {
    if (window.pendingEffect && window.pendingEffect.sourcePlayer !== playerId) {
      window.pendingEffect.negated = true
      appendLog(state, 'Bird Brain — Hack the Sky negated the Marked Hoodmon effect.')
    }
    return state
  }
  if (support39ReactionReady(definitionId)) { resolveSupport39Reaction(state, defs, playerId, definitionId); return state }
  switch (definitionId) {
    case 'HDM-024':
      appendLog(state, `${def.name} inspected the top of a Hoodmon Deck. No reorder choice was requested by this local AI-safe resolver.`)
      break
    case 'HDM-026': { // Bird switch + attacker ATK reduction
      if (pending?.defender === playerId && allHoodmon(state, playerId).some((c) => trait(defs[c.definitionId], ['Bird']))) {
        const idx = reserveIndex(state, playerId, (d) => trait(d, ['Bird']), defs)
        if (idx >= 0) { const swapped = switchActive(state, playerId, idx); if (swapped?.next) pending.defenderInstanceId = swapped.next.instanceId }
        const attacker = pending ? findHoodmon(state.players[pending.attacker], pending.attackerInstanceId) : null
        addStat(attacker, definitionId, 'atk', -100, state.turnNumber)
      }
      break
    }
    case 'HDM-040': {
      if (!pending || pending.attacker === playerId) break
      const attacker = findHoodmon(state.players[pending.attacker], pending.attackerInstanceId)
      if (!attacker) break
      if (hasStatus(attacker, 'charmed')) {
        pending.damageModifier = (pending.damageModifier ?? 0) - 300
        pending.cancelled = true
        appendLog(state, 'Bad Idea, Babe caught a Charmed attacker: the attack loses 300 damage and ends before dealing damage.')
      } else {
        pending.charmAttackerAfterResolution = true
        appendLog(state, 'Bad Idea, Babe will make the attacking Hoodmon Charmed after this attack resolves.')
      }
      break
    }
    case 'HDM-041': {
      const pendingEffect = window.pendingEffect
      if (!pendingEffect || pendingEffect.sourcePlayer === playerId) break
      const legalTargeted = pendingEffect.targetRefs.some((ref) => {
        const [owner, instanceId] = ref.split('|') as [PlayerId, string]
        const card = owner === playerId ? findHoodmon(state.players[playerId], instanceId) : null
        return Boolean(card && alignment(defs[card.definitionId], ['Beast', 'Dark']))
      })
      if (!legalTargeted) break
      pendingEffect.negated = true
      const opponent = otherPlayer(playerId)
      const options = allHoodmon(state, opponent).map((card) => ({
        id: `${opponent}:${card.instanceId}`,
        label: defs[card.definitionId]?.name ?? card.definitionId,
        detail: `${opponent} · ${hasStatus(card, 'charmed') ? 'CHARMED' : 'NOT CHARMED'}`,
        cardId: card.definitionId,
        instanceId: card.instanceId,
        player: opponent,
      }))
      appendLog(state, 'Chain Break Counter negated the targeted opponent effect.')
      if (options.length) {
        openChoice(state, {
          player: playerId,
          sourceCardId: 'HDM-041',
          prompt: 'Chain Break Counter: choose 1 opposing Hoodmon. It becomes Charmed.',
          minSelections: 1,
          maxSelections: 1,
          options,
          actionKey: 'HDM041_CHARM',
        })
      }
      break
    }
    case 'HDM-086': {
      const pendingEffect = window.pendingEffect
      if (!pendingEffect || pendingEffect.sourcePlayer === playerId) break
      const targetPlayer = pendingEffect.sourcePlayer
      if (state.players[targetPlayer].bond >= 1) {
        openChoice(state, {
          player: targetPlayer,
          sourceCardId: 'HDM-086',
          prompt: 'SIGNAL INTERCEPT — pay 1 Bond to prevent your activation from being negated?',
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: 'signal-pay', value: 'pay', label: 'PAY 1 BOND', detail: 'Your activation is not negated by Signal Intercept.' },
            { id: 'signal-no-pay', value: 'no-pay', label: "DON'T PAY", detail: 'Signal Intercept negates your activation.' },
          ],
          actionKey: 'HDM086_PAY',
          context: { controller: playerId },
        })
      } else {
        pendingEffect.negated = true
        appendLog(state, `${targetPlayer} cannot pay 1 Bond. Signal Intercept negated the activation.`)
        if (state.players[targetPlayer].hand.length) {
          openChoice(state, {
            player: playerId,
            sourceCardId: 'HDM-086',
            prompt: `SIGNAL INTERCEPT — you may reveal 1 random card from ${targetPlayer}'s hand.`,
            minSelections: 0,
            maxSelections: 1,
            options: [{ id: 'reveal-random', value: 'reveal', label: 'REVEAL RANDOM CARD', detail: `Reveal 1 random card from ${targetPlayer}'s hand.` }],
            actionKey: 'HDM086_REVEAL',
            context: { targetPlayer },
          })
        }
      }
      break
    }
    case 'HDM-091': {
      const pendingEffect = window.pendingEffect
      if (!pendingEffect || pendingEffect.sourcePlayer === playerId) break
      const revealedOwner = pendingEffect.sourcePlayer
      const deck = state.players[revealedOwner].hoodmonDeck
      const revealed = deck.splice(0, Math.min(2, deck.length))
      if (!revealed.length) {
        appendLog(state, 'Expose the Cover-Up found no cards to reveal from the opponent’s Hoodmon Deck.')
        break
      }
      appendLog(state, `Expose the Cover-Up revealed ${revealed.map((id) => defs[id]?.name ?? id).join(' and ')} from ${revealedOwner}'s Hoodmon Deck.`)
      const qualifies = revealed.some((id) => defs[id]?.cardType === 'hoodmon' || mentionsResearchOrTruthNetwork(defs[id]))
      if (qualifies) {
        pendingEffect.negated = true
        appendLog(state, 'Expose the Cover-Up found qualifying evidence and negated the activation.')
        banishActivationSource(state, defs, pendingEffect)
      } else {
        appendLog(state, 'Expose the Cover-Up found no Hoodmon, Research, or Truth Network card, so the activation remains live.')
      }
      const entries = revealed.map((cardId, index) => `${index}|${cardId}`)
      if (entries.length === 1) {
        state.players[revealedOwner].hoodmonDeck.push(revealed[0])
        notifyOpponentCardRevealed(state, defs, revealedOwner)
      } else {
        openChoice(state, {
          player: playerId,
          sourceCardId: 'HDM-091',
          prompt: `EXPOSE THE COVER-UP — put the 2 revealed cards on the bottom of ${revealedOwner}'s Hoodmon Deck in any order.`,
          minSelections: entries.length,
          maxSelections: entries.length,
          options: entries.map((entry) => {
            const [indexText, cardId] = entry.split('|')
            return {
              id: `cover-bottom:${indexText}:${cardId}`,
              value: entry,
              cardId,
              label: defs[cardId]?.name ?? cardId,
              detail: 'Select bottom order: first selected is nearer the top of the bottom group.',
            }
          }),
          actionKey: 'HDM091_BOTTOM',
          context: { revealedOwner, continuations: [`HDM090_OPP_REVEAL|${revealedOwner}|`] },
        })
      }
      break
    }
    case 'HDM-077': {
      if (pending?.defender === playerId) {
        const idx = reserveIndex(state, playerId, (d) => alignment(d, ['Water','Smoke']), defs)
        if (idx >= 0) { const swapped = switchActive(state, playerId, idx); if (swapped?.next) pending.defenderInstanceId = swapped.next.instanceId }
        pending.damageModifier = (pending.damageModifier ?? 0) - 200
      }
      break
    }
    default:
      appendLog(state, `${def.name} resolved using its encoded card slot; its remaining choice-heavy effect is pending a target picker.`)
  }
  return state
}
