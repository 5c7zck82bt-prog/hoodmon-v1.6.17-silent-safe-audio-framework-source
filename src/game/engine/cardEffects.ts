import { drawOne, enterPhase } from './fsm'
import { resolveDefeats } from './defeat'
import { MAX_BOND } from './constants'
import {
  addModifier,
  addRuntimeAbility,
  allHoodmon,
  appendLog,
  effectiveAtk,
  findHoodmon,
  hasStatus,
  otherPlayer,
  setStatus,
  setTemporaryRestriction,
} from './helpers'
import type {
  CardDefinition,
  CardInstance,
  ChoiceOption,
  GameState,
  PendingChoice,
  PendingTargetedEffect,
  PlayerId,
} from './types'
import {
  activateSupport39StandardMagic, activateSupport39Tamer, onCardPlayed39, onHoodmonDeployed39, onHoodmonEvolved39, onOpponentCharmed39, onTaskCompleted39, onAttackResolved39, notifyDeckLook39, resumePendingAttack39,
  notifyHandCardRevealed39, resolveStartOfGame39, triggerMonicalOmniscience39, resolveSupport39Choice, resolveSupport39TargetedEffect, support39CardEffectsNegated, support39FieldActivate, support39FieldReady, support39FieldRemove, support39StandardMagicHasLegalTarget, support39StandardMagicReady, support39TamerActivationReady, support39TargetProtected, syncSupport39PersistentFields,
} from './support39'

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function hoodmonOption(definitions: Record<string, CardDefinition>, player: PlayerId, card: CardInstance): ChoiceOption {
  const definition = definitions[card.definitionId]
  return {
    id: `${player}:${card.instanceId}`,
    label: definition?.name ?? card.definitionId,
    detail: `${player} · ATK ${effectiveAtk(definition, card)}${hasStatus(card, 'charmed') ? ' · CHARMED' : ''}${hasStatus(card, 'marked') ? ' · MARKED' : ''}`,
    cardId: card.definitionId,
    instanceId: card.instanceId,
    player,
  }
}

function indexedCardOption(definitions: Record<string, CardDefinition>, zone: string, cardId: string, index: number): ChoiceOption {
  const definition = definitions[cardId]
  return {
    id: `${zone}:${index}:${cardId}`,
    label: definition?.name ?? cardId,
    detail: `${cardId} · ${definition?.cardType.toUpperCase() ?? 'CARD'}${definition?.alignment?.length ? ` · ${definition.alignment.join('/')}` : ''}`,
    cardId,
  }
}

export function openChoice(state: GameState, choice: PendingChoice): GameState {
  state.pendingChoice = choice
  state.status = 'choice'
  appendLog(state, `${choice.player} must resolve ${choice.sourceCardId}: ${choice.prompt}`)
  return state
}

function finishChoice(state: GameState): GameState {
  state.pendingChoice = null
  if (state.status !== 'game_over') {
    if (state.reactionWindow) state.status = 'reaction'
    else state.status = state.pendingPromotion ? 'awaiting_promotion' : 'active'
  }
  return state
}

function opposingHoodmon(state: GameState, playerId: PlayerId): CardInstance[] {
  return allHoodmon(state.players[otherPlayer(playerId)])
}

function ownHoodmon(state: GameState, playerId: PlayerId): CardInstance[] {
  return allHoodmon(state.players[playerId])
}

function controlsPeaches(state: GameState, playerId: PlayerId): boolean {
  const tamer = state.players[playerId].tamer
  return tamer?.definitionId === 'HDM-030' && !support39CardEffectsNegated(state, tamer)
}

function controlsStreetContractTamer(state: GameState, playerId: PlayerId): boolean {
  const tamer = state.players[playerId].tamer
  const id = tamer?.definitionId
  return Boolean(tamer && !support39CardEffectsNegated(state, tamer) && (id === 'HDM-030' || id === 'HDM-094'))
}

function controlsCherry(state: GameState, playerId: PlayerId): boolean {
  const tamer = state.players[playerId].tamer
  return tamer?.definitionId === 'HDM-046' && !support39CardEffectsNegated(state, tamer)
}

function controlsCapin(state: GameState, playerId: PlayerId): boolean {
  const tamer = state.players[playerId].tamer
  return tamer?.definitionId === 'HDM-078' && !support39CardEffectsNegated(state, tamer)
}

function controlsOddPaul(state: GameState, playerId: PlayerId): boolean {
  const tamer = state.players[playerId].tamer
  return tamer?.definitionId === 'HDM-001' && !support39CardEffectsNegated(state, tamer)
}

function hasTrait(definition: CardDefinition | undefined, trait: string): boolean {
  return Boolean(definition?.archetypeTags?.includes(trait))
}

function isBasicHoodmon(definition: CardDefinition | undefined): boolean {
  return Boolean(definition?.cardType === 'hoodmon' && definition.stageLevel === 1)
}

function isBeardedDragon(definition: CardDefinition | undefined): boolean {
  return hasTrait(definition, 'Bearded Dragon')
}

function mentionsReserve(definition: CardDefinition | undefined): boolean {
  return mentionsPhrase(definition, 'Reserve')
}

export function recordCardEffectExhaust(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  sourcePlayer: PlayerId,
  targetOwner: PlayerId,
  target: CardInstance,
  sourceCardId: string,
): void {
  const wasReady = target.readyState === 'ready'
  if (target.restrictions.cannotBeExhaustedByEffects) { appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} cannot be Exhausted by card effects this turn.`); return }
  target.readyState = 'exhausted'
  if (!wasReady || sourcePlayer === targetOwner) return
  const progress = state.taskProgress[sourcePlayer] ?? (state.taskProgress[sourcePlayer] = {})
  progress['HDM-110'] = Math.min(2, (progress['HDM-110'] ?? 0) + 1)
  appendLog(state, `${definitions[sourceCardId]?.name ?? sourceCardId} Exhausted an opposing Hoodmon by card effect. Crash Their Feed progress: ${progress['HDM-110']}/2.`)
}

function mentionsPhrase(definition: CardDefinition | undefined, phrase: string): boolean {
  if (!definition) return false
  const wanted = phrase.toLowerCase()
  return Boolean(
    definition.name.toLowerCase().includes(wanted)
    || definition.effectText?.toLowerCase().includes(wanted)
    || definition.archetypeTags?.some((tag) => tag.toLowerCase().includes(wanted)),
  )
}

function mentionsResearchOrTruthNetwork(definition: CardDefinition | undefined): boolean {
  return mentionsPhrase(definition, 'Research') || mentionsPhrase(definition, 'Truth Network')
}

function isPsychicHoodmon(definition: CardDefinition | undefined): boolean {
  return Boolean(definition?.cardType === 'hoodmon' && definition.alignment?.includes('Psychic'))
}

function truthNetworkSearchable(definition: CardDefinition | undefined): boolean {
  return Boolean(definition && (definition.id === 'HDM-081' || definition.id === 'HDM-082' || mentionsPhrase(definition, 'Truth Network')))
}

function oracleSearchable(definition: CardDefinition | undefined): boolean {
  return Boolean(isPsychicHoodmon(definition) || mentionsResearchOrTruthNetwork(definition))
}

function isDarkOrFairy(definition: CardDefinition | undefined): boolean {
  return Boolean(definition?.alignment?.some((alignment) => alignment === 'Dark' || alignment === 'Fairy'))
}

function isCherryArchetype(definition: CardDefinition | undefined): boolean {
  return Boolean(definition && (definition.id === 'HDM-046' || definition.archetypeTags?.includes('High-Class Charm')))
}

function nextTurnNumberForPlayer(state: GameState, playerId: PlayerId): number {
  return state.currentPlayerTurn === playerId ? state.turnNumber + 2 : state.turnNumber + 1
}

function isBeastOrDark(definition: CardDefinition | undefined): boolean {
  return Boolean(definition?.alignment?.some((alignment) => alignment === 'Beast' || alignment === 'Dark'))
}

function isBeast(definition: CardDefinition | undefined): boolean {
  return Boolean(definition?.alignment?.includes('Beast'))
}

function effectMentionsCharmed(definition: CardDefinition | undefined): boolean {
  return Boolean(definition?.effectText?.toLowerCase().includes('charmed'))
}

function prettyGirlsSearchable(definition: CardDefinition | undefined): boolean {
  if (!definition) return false
  return definition.cardType === 'tamer' || (definition.cardType === 'hoodmon' && isBeastOrDark(definition))
}

type FieldTurnMarkerKind = 'field_charm_cycle_used' | 'field_attack_bonus_used' | 'field_mark_draw_used' | 'field_mark_exhaust_used' | 'on_air_play_used' | 'on_air_reveal_used'

function fieldHasTurnMarker(field: CardInstance, kind: FieldTurnMarkerKind, turn: number): boolean {
  return Boolean(field.runtimeAbilities?.some((ability) => ability.kind === kind && ability.expiresOnTurn === turn))
}

function addFieldTurnMarker(state: GameState, field: CardInstance, sourceCardId: 'HDM-042' | 'HDM-051' | 'HDM-090', kind: FieldTurnMarkerKind): void {
  addRuntimeAbility(state, field, sourceCardId, kind, 1, state.turnNumber)
}

export function fieldExecutionReady(definitionId: string): boolean {
  return definitionId === 'HDM-042' || definitionId === 'HDM-051' || definitionId === 'HDM-090' || support39FieldReady(definitionId)
}

export function removeFieldEffect(
  state: GameState,
  _definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
): GameState {
  if (support39FieldReady(definitionId)) return support39FieldRemove(state, _definitions, playerId, definitionId)
  if (definitionId !== 'HDM-042' && definitionId !== 'HDM-051') return state
  for (const card of ownHoodmon(state, playerId)) {
    card.modifiers = card.modifiers.filter((modifier) => modifier.sourceCardId !== definitionId)
  }
  return state
}

export function syncPersistentFieldEffects(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): GameState {
  const player = state.players[playerId]
  const kennelActive = player.field?.definitionId === 'HDM-042' && !support39CardEffectsNegated(state, player.field)
  const hideoutActive = player.field?.definitionId === 'HDM-051' && !support39CardEffectsNegated(state, player.field)
  for (const card of ownHoodmon(state, playerId)) {
    card.modifiers = card.modifiers.filter((modifier) => !['HDM-042', 'HDM-051'].includes(modifier.sourceCardId))
    if (kennelActive && isBeastOrDark(definitions[card.definitionId])) {
      addModifier(state, card, 'HDM-042', 'hp', 200, 'persistent')
    }
    if (hideoutActive && isDarkOrFairy(definitions[card.definitionId])) {
      addModifier(state, card, 'HDM-051', 'atk', 100, 'persistent')
      addModifier(state, card, 'HDM-051', 'hp', 200, 'persistent')
    }
  }
  syncSupport39PersistentFields(state, definitions, playerId)
  return state
}

export function activateFieldEffect(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
): GameState {
  if (support39FieldReady(definitionId)) return support39FieldActivate(state, definitions, playerId, definitionId)
  if (definitionId !== 'HDM-042' && definitionId !== 'HDM-051' && definitionId !== 'HDM-090') throw new Error('That Field does not have a digital resolver yet.')
  syncPersistentFieldEffects(state, definitions, playerId)
  if (definitionId === 'HDM-042') appendLog(state, 'Velvet Block Kennel gives your Beast and Dark Hoodmon +200 HP.')
  if (definitionId === 'HDM-051') appendLog(state, 'Moonlit Hideout gives your Dark and Fairy Hoodmon +100 ATK and +200 HP.')
  if (definitionId === 'HDM-090') appendLog(state, 'On Air Tonight is live. Its two once-per-turn Truth Protocol triggers are active.')
  return state
}

function maybeTriggerVelvetKennelCharmCycle(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  newlyCharmedOwner: PlayerId,
): GameState {
  const controller = otherPlayer(newlyCharmedOwner)
  const field = state.players[controller].field
  if (!field || field.definitionId !== 'HDM-042' || support39CardEffectsNegated(state, field) || fieldHasTurnMarker(field, 'field_charm_cycle_used', state.turnNumber)) return state

  addFieldTurnMarker(state, field, 'HDM-042', 'field_charm_cycle_used')
  drawOne(state, controller)
  if (state.status === 'game_over') return state
  appendLog(state, 'Velvet Block Kennel triggered: draw 1 card, then discard 1 card.')

  const hand = state.players[controller].hand
  if (!hand.length) return state
  return openChoice(state, {
    player: controller,
    sourceCardId: 'HDM-042',
    sourceInstanceId: field.instanceId,
    prompt: 'Velvet Block Kennel: choose 1 card from your hand to discard.',
    minSelections: 1,
    maxSelections: 1,
    options: hand.map((cardId, index) => indexedCardOption(definitions, 'hand', cardId, index)),
    actionKey: 'HDM042_DISCARD',
  })
}

export function applyCharmedStatus(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  targetOwner: PlayerId,
  target: CardInstance,
): GameState {
  const wasCharmed = hasStatus(target, 'charmed')
  setStatus(target, 'charmed', true)
  if (!wasCharmed) {
    appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} became Charmed.`)
    maybeTriggerVelvetKennelCharmCycle(state, definitions, targetOwner)
    return attachContinuations(state, definitions, [`SUP39_CHARM|${targetOwner}|`])
  }
  return state
}

function mergeChoiceContinuations(choice: PendingChoice, continuations: string[]): void {
  if (!continuations.length) return
  const existing = Array.isArray(choice.context?.continuations) ? choice.context?.continuations as string[] : []
  choice.context = { ...(choice.context ?? {}), continuations: [...existing, ...continuations] }
}

function choiceContinuations(context: PendingChoice['context'] | PendingTargetedEffect['context']): string[] {
  return Array.isArray(context?.continuations) ? context.continuations as string[] : []
}

function revealOption(definitions: Record<string, CardDefinition>, entry: string): ChoiceOption {
  const [indexText, cardId] = entry.split('|')
  const definition = definitions[cardId]
  return {
    id: `reveal:${indexText}:${cardId}`,
    value: entry,
    label: definition?.name ?? cardId,
    detail: `${cardId} · ${definition?.cardType.toUpperCase() ?? 'CARD'}${definition?.alignment?.length ? ` · ${definition.alignment.join('/')}` : ''}`,
    cardId,
  }
}

function bottomOrderOption(definitions: Record<string, CardDefinition>, entry: string): ChoiceOption {
  const [indexText, cardId] = entry.split('|')
  const definition = definitions[cardId]
  return {
    id: `bottom:${indexText}:${cardId}`,
    value: entry,
    label: definition?.name ?? cardId,
    detail: 'Click order = nearest bottom first; last selected becomes the deepest card.',
    cardId,
  }
}

function appendEntriesToBottom(state: GameState, playerId: PlayerId, entries: string[]): void {
  for (const entry of entries) {
    const cardId = entry.split('|')[1]
    if (cardId) state.players[playerId].hoodmonDeck.push(cardId)
  }
}

function openBottomOrderChoice(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  sourceCardId: string,
  sourceInstanceId: string | undefined,
  entries: string[],
  actionKey: string,
  continuations: string[] = [],
): GameState {
  if (entries.length <= 1) {
    appendEntriesToBottom(state, playerId, entries)
    return runContinuations(state, definitions, continuations)
  }
  return openChoice(state, {
    player: playerId,
    sourceCardId,
    sourceInstanceId,
    prompt: 'Put the remaining revealed cards on the bottom of your Deck in any order. Select every card in the order you want them placed: nearest bottom first, deepest bottom last.',
    minSelections: entries.length,
    maxSelections: entries.length,
    options: entries.map((entry) => bottomOrderOption(definitions, entry)),
    actionKey,
    context: { continuations },
  })
}

function startTopDeckLook(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  sourceCardId: string,
  sourceInstanceId: string | undefined,
  count: number,
  legal: (definition: CardDefinition | undefined) => boolean,
  actionKey: string,
  prompt: string,
  continuations: string[] = [],
  requiredPick = false,
): GameState {
  const player = state.players[playerId]
  const revealContinuations = [...continuations, `SUP39_LOOK|${playerId}|${playerId}`]
  const revealed = player.hoodmonDeck.splice(0, Math.min(count, player.hoodmonDeck.length))
  if (!revealed.length) {
    appendLog(state, `${definitions[sourceCardId]?.name ?? sourceCardId} found no cards to look at.`)
    return runContinuations(state, definitions, revealContinuations)
  }
  const entries = revealed.map((cardId, index) => `${index}|${cardId}`)
  const options = entries.filter((entry) => legal(definitions[entry.split('|')[1]])).map((entry) => revealOption(definitions, entry))
  if (!options.length) {
    appendLog(state, `${definitions[sourceCardId]?.name ?? sourceCardId} revealed ${revealed.length} card${revealed.length === 1 ? '' : 's'}, but none were eligible to take.`)
    return openBottomOrderChoice(state, definitions, playerId, sourceCardId, sourceInstanceId, entries, `${actionKey}_BOTTOM`, revealContinuations)
  }
  return openChoice(state, {
    player: playerId,
    sourceCardId,
    sourceInstanceId,
    prompt,
    minSelections: requiredPick ? 1 : 0,
    maxSelections: 1,
    options,
    actionKey,
    context: { revealedEntries: entries, continuations: revealContinuations },
  })
}

function onAirQualifyingPlay(definition: CardDefinition | undefined): boolean {
  if (!definition || definition.id === 'HDM-090') return false
  return Boolean(definition.cardType === 'trap' || definition.alignment?.includes('Psychic') || mentionsPhrase(definition, 'Research'))
}

function triggerOnAirPlay(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  playedDefinitionId: string,
): GameState {
  const field = state.players[playerId].field
  if (!field || field.definitionId !== 'HDM-090' || support39CardEffectsNegated(state, field) || fieldHasTurnMarker(field, 'on_air_play_used', state.turnNumber)) return state
  if (!onAirQualifyingPlay(definitions[playedDefinitionId])) return state
  addFieldTurnMarker(state, field, 'HDM-090', 'on_air_play_used')
  appendLog(state, `On Air Tonight triggered because ${definitions[playedDefinitionId]?.name ?? playedDefinitionId} was played.`)
  return startTopDeckLook(
    state,
    definitions,
    playerId,
    'HDM-090',
    field.instanceId,
    2,
    (definition) => Boolean(definition),
    'HDM090_PLAY_PICK',
    'TRUTH PROTOCOL — choose 1 of the top 2 cards to put into your hand. The other goes to the bottom of your Hoodmon Deck.',
    [],
    true,
  )
}

function triggerOnAirOpponentReveal(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  revealedOwner: PlayerId,
): GameState {
  const controller = otherPlayer(revealedOwner)
  const field = state.players[controller].field
  if (!field || field.definitionId !== 'HDM-090' || support39CardEffectsNegated(state, field) || fieldHasTurnMarker(field, 'on_air_reveal_used', state.turnNumber)) return state
  addFieldTurnMarker(state, field, 'HDM-090', 'on_air_reveal_used')
  drawOne(state, controller)
  if (state.status === 'game_over') return state
  appendLog(state, `On Air Tonight triggered because ${revealedOwner}'s card was revealed: ${controller} draws 1 card, then discards 1 card.`)
  const hand = state.players[controller].hand
  if (!hand.length) return state
  return openChoice(state, {
    player: controller,
    sourceCardId: 'HDM-090',
    sourceInstanceId: field.instanceId,
    prompt: 'TRUTH PROTOCOL — choose 1 card from your hand to discard after the opponent-card reveal trigger.',
    minSelections: 1,
    maxSelections: 1,
    options: hand.map((cardId, index) => indexedCardOption(definitions, 'hand', cardId, index)),
    actionKey: 'HDM090_REVEAL_DISCARD',
  })
}

export function notifyOpponentCardRevealed(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  revealedOwner: PlayerId,
): GameState {
  return triggerOnAirOpponentReveal(state, definitions, revealedOwner)
}

export function attachContinuations(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  continuations: string[],
): GameState {
  if (!continuations.length || state.status === 'game_over') return state
  if (state.pendingChoice) {
    mergeChoiceContinuations(state.pendingChoice, continuations)
    return state
  }
  return runContinuations(state, definitions, continuations)
}

export function afterCardPlayed(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
): GameState {
  return attachContinuations(state, definitions, [`HDM090_PLAY|${playerId}|${definitionId}`, `SUP39_PLAY|${playerId}|${definitionId}`])
}

export type ActivationKind = 'magic' | 'field' | 'activate'

export function shouldOpenActivationReaction(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  sourcePlayer: PlayerId,
  kind: ActivationKind,
): boolean {
  const opponent = otherPlayer(sourcePlayer)
  const responder = state.players[opponent]
  return responder.traps.some((card) => {
    if (!card || card.turnSet === state.turnNumber) return false
    const def = definitions[card.definitionId]
    if (!def || responder.bond < (def.bondCost ?? 0)) return false
    if (card.definitionId === 'HDM-091') return true
    if (card.definitionId === 'HDM-086') return kind === 'magic' || kind === 'activate'
    return false
  })
}

export function openActivationReaction(
  state: GameState,
  sourcePlayer: PlayerId,
  sourceCardId: string,
  effectKey: string,
  kind: ActivationKind,
  context: PendingTargetedEffect['context'] = {},
): GameState {
  state.status = 'reaction'
  state.reactionWindow = {
    openedBy: 'effect',
    nonActivePlayerResponded: false,
    activePlayerResponded: false,
    priority: otherPlayer(sourcePlayer),
    pendingEffect: {
      sourcePlayer,
      sourceCardId,
      effectKey,
      targetRefs: [],
      context: { ...context, activationKind: kind },
    },
    responseStack: [],
    responseCards: [],
  }
  appendLog(state, `${sourceCardId} activated. Reaction Window opened for activation responses.`)
  return state
}

export function banishActivationSource(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  pending: PendingTargetedEffect,
): void {
  const zone = String(pending.context?.sourceZone ?? '')
  const sourceInstanceId = String(pending.context?.sourceInstanceId ?? '')
  const player = state.players[pending.sourcePlayer]
  if (zone === 'field' && player.field && (!sourceInstanceId || player.field.instanceId === sourceInstanceId)) {
    const card = player.field
    removeFieldEffect(state, definitions, pending.sourcePlayer, card.definitionId)
    player.field = null
    player.banished.push(card.definitionId)
    appendLog(state, `${definitions[card.definitionId]?.name ?? card.definitionId} was banished from the Field by Expose the Cover-Up.`)
    return
  }
  if (zone === 'tamer' && player.tamer && (!sourceInstanceId || player.tamer.instanceId === sourceInstanceId)) {
    const card = player.tamer
    player.tamer = null
    player.banished.push(card.definitionId)
    appendLog(state, `${definitions[card.definitionId]?.name ?? card.definitionId} was banished from the Tamer zone by Expose the Cover-Up.`)
  }
}

function returnHoodmonToHand(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  owner: PlayerId,
  card: CardInstance,
  sourceCardId: string,
): void {
  const player = state.players[owner]
  const wasActive = player.activeHoodmon?.instanceId === card.instanceId
  if (wasActive) player.activeHoodmon = null
  player.reserves = player.reserves.map((entry) => entry?.instanceId === card.instanceId ? null : entry) as typeof player.reserves
  const returned = [...card.evolutionStack, card.definitionId]
  player.hand.push(...returned)
  card.evolutionStack = []
  card.statuses = []
  card.statusExpiresOnTurn = {}
  card.restrictions = {}
  card.restrictionExpiresOnTurn = {}
  card.modifiers = []
  card.runtimeAbilities = []
  appendLog(state, `${definitions[card.definitionId]?.name ?? card.definitionId} returned to ${owner}'s hand from ${definitions[sourceCardId]?.name ?? sourceCardId}${returned.length > 1 ? ` with ${returned.length - 1} evolution card${returned.length === 2 ? '' : 's'}` : ''}.`)
  if (wasActive && player.reserves.some(Boolean) && !state.pendingPromotion) state.pendingPromotion = owner
}

function openMisoNineLivesChoice(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  controller: PlayerId,
  targetOwner: PlayerId,
  target: CardInstance,
  misoIds: string[],
  continuations: string[] = [],
): GameState {
  const [misoId, ...remaining] = misoIds
  if (!misoId || !findHoodmon(state.players[targetOwner], target.instanceId)) return runContinuations(state, definitions, continuations)
  return openChoice(state, {
    player: controller,
    sourceCardId: 'HDM-049',
    sourceInstanceId: misoId,
    prompt: 'NINE LIVES — choose what happens to the Hoodmon that just became Marked.',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: 'return', value: 'return', label: 'RETURN TO HAND', detail: 'Return the Marked Hoodmon and its evolution stack to its owner’s hand.' },
      { id: 'lock', value: 'lock', label: 'LOCK ITS NEXT TURN', detail: 'It cannot attack during its controller’s next turn.' },
    ],
    actionKey: 'HDM049_NINE_LIVES',
    context: { targetOwner, targetInstanceId: target.instanceId, remainingMisoIds: remaining, continuations },
  })
}

export function applyMarkedStatus(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  sourcePlayer: PlayerId,
  targetOwner: PlayerId,
  target: CardInstance,
  expiresOnTurn?: number,
  continuations: string[] = [],
): GameState {
  const wasMarked = hasStatus(target, 'marked')
  if (!wasMarked) {
    setStatus(target, 'marked', true, expiresOnTurn)
  } else if (expiresOnTurn === undefined) {
    setStatus(target, 'marked', true)
  } else if (target.statusExpiresOnTurn?.marked !== undefined) {
    setStatus(target, 'marked', true, Math.max(target.statusExpiresOnTurn.marked, expiresOnTurn))
  }
  if (wasMarked) return runContinuations(state, definitions, continuations)

  appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} became Marked${expiresOnTurn !== undefined ? ` through turn ${expiresOnTurn}` : ''}.`)

  const field = state.players[sourcePlayer].field
  if (field?.definitionId === 'HDM-051' && !support39CardEffectsNegated(state, field) && targetOwner !== sourcePlayer) {
    if (!fieldHasTurnMarker(field, 'field_mark_draw_used', state.turnNumber)) {
      addFieldTurnMarker(state, field, 'HDM-051', 'field_mark_draw_used')
      drawOne(state, sourcePlayer)
      appendLog(state, 'Moonlit Hideout triggered from the first Mark this turn: draw 1 card.')
      if (state.status === 'game_over') return state
    }
    if (controlsCherry(state, sourcePlayer) && !fieldHasTurnMarker(field, 'field_mark_exhaust_used', state.turnNumber)) {
      addFieldTurnMarker(state, field, 'HDM-051', 'field_mark_exhaust_used')
      recordCardEffectExhaust(state, definitions, sourcePlayer, targetOwner, target, 'HDM-051')
      appendLog(state, 'Moonlit Hideout + Cherry Banks made the first opposing Hoodmon Marked this turn enter Exhausted.')
    }
  }

  const misos = ownHoodmon(state, sourcePlayer).filter((card) => card.definitionId === 'HDM-049' && !(card.runtimeAbilities ?? []).some((ability) => ability.kind === 'miso_nine_lives_used' && ability.expiresOnTurn === state.turnNumber))
  if (targetOwner !== sourcePlayer && misos.length) {
    for (const miso of misos) addRuntimeAbility(state, miso, 'HDM-049', 'miso_nine_lives_used', 1, state.turnNumber)
    return openMisoNineLivesChoice(state, definitions, sourcePlayer, targetOwner, target, misos.map((card) => card.instanceId), continuations)
  }
  return runContinuations(state, definitions, continuations)
}

function triggerCherrySilentOperator(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  attackerInstanceId: string,
  continuations: string[] = [],
): GameState {
  const tamer = state.players[playerId].tamer
  const attacker = findHoodmon(state.players[playerId], attackerInstanceId)
  if (!tamer || tamer.definitionId !== 'HDM-046' || support39CardEffectsNegated(state, tamer) || !attacker || !isDarkOrFairy(definitions[attacker.definitionId])) return runContinuations(state, definitions, continuations)
  const used = (tamer.runtimeAbilities ?? []).some((ability) => ability.kind === 'cherry_silent_operator_used' && ability.expiresOnTurn === state.turnNumber)
  if (used) return runContinuations(state, definitions, continuations)
  addRuntimeAbility(state, tamer, 'HDM-046', 'cherry_silent_operator_used', 1, state.turnNumber)
  appendLog(state, 'Cherry Banks — Silent Operator triggered from a Dark/Fairy attack.')
  return startTopDeckLook(
    state, definitions, playerId, 'HDM-046', tamer.instanceId, 3,
    (definition) => Boolean(definition && ['trap', 'task', 'hoodmon'].includes(definition.cardType)),
    'HDM046_SILENT_PICK',
    'SILENT OPERATOR — you may take 1 Trap, Task, or Hoodmon from the top 3 cards. The rest go to the bottom in any order.',
    continuations,
  )
}

function runContinuations(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  continuations: string[],
): GameState {
  let remaining = [...continuations]
  while (remaining.length && state.status !== 'game_over') {
    const token = remaining.shift()!
    const [kind, playerText, instanceText, extraText, extraText2] = token.split('|')
    const playerId = playerText as PlayerId
    if (kind === 'SUP39_PLAY') {
      const before = state.pendingChoice
      onCardPlayed39(state, definitions, playerId, instanceText)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'SUP39_DEPLOY') {
      const card = findHoodmon(state.players[playerId], instanceText)
      const before = state.pendingChoice
      if (card) onHoodmonDeployed39(state, definitions, playerId, card)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'SUP39_EVOLVE') {
      const card = findHoodmon(state.players[playerId], instanceText)
      const before = state.pendingChoice
      if (card) onHoodmonEvolved39(state, definitions, playerId, card)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'SUP39_TASK') {
      const card = findHoodmon(state.players[playerId], instanceText)
      const before = state.pendingChoice
      if (card) onTaskCompleted39(state, definitions, playerId, card)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'SUP39_ATTACK') {
      const card = findHoodmon(state.players[playerId], instanceText)
      const before = state.pendingChoice
      if (card) onAttackResolved39(state, definitions, playerId, card, extraText !== '0', extraText2 || null)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      if (state.status === 'reaction') return state
      continue
    }
    if (kind === 'SUP39_RESUME_ATTACK') {
      resumePendingAttack39(state, definitions)
      return state
    }
    if (kind === 'SUP39_LOOK') {
      const before = state.pendingChoice
      notifyDeckLook39(state, definitions, playerId, (instanceText || playerId) as PlayerId)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'SUP39_CHARM') {
      const before = state.pendingChoice
      onOpponentCharmed39(state, definitions, playerId)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'HDM082_TRIGGER') {
      const before = state.pendingChoice
      triggerMonicalOmniscience39(state, definitions, playerId)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'HDM044_HEAL_CONT') {
      const before = state.pendingChoice
      openWalkHimDownHeal(state, definitions, playerId)
      if (state.pendingChoice && state.pendingChoice !== before) { mergeChoiceContinuations(state.pendingChoice, remaining); return state }
      continue
    }
    if (kind === 'HDM048_TRAP_RETURN') {
      const options = state.players[playerId].discard.flatMap((cardId, index) => definitions[cardId]?.cardType === 'trap' ? [indexedCardOption(definitions, 'discard', cardId, index)] : [])
      if (options.length) {
        openChoice(state, { player: playerId, sourceCardId: 'HDM-048', sourceInstanceId: instanceText, prompt: 'SHADOW STEP — you may return 1 Trap from your discard pile to your hand.', minSelections: 0, maxSelections: 1, options, actionKey: 'HDM048_TRAP_RETURN', context: { continuations: remaining } })
        return state
      }
      appendLog(state, 'Shadowcat found no Trap in the discard pile to return.')
      continue
    }
    if (kind === 'HDM049_SPLASH') {
      const defenderInstanceId = instanceText
      const opponent = otherPlayer(playerId)
      const options = opposingHoodmon(state, playerId).filter((card) => card.instanceId !== defenderInstanceId).map((card) => hoodmonOption(definitions, opponent, card))
      if (options.length) {
        openChoice(state, { player: playerId, sourceCardId: 'HDM-049', prompt: 'PAW OF SILK — choose 1 other opposing Hoodmon to take 200 damage.', minSelections: 1, maxSelections: 1, options, actionKey: 'HDM049_SPLASH', context: { continuations: remaining } })
        return state
      }
      continue
    }
    if (kind === 'HDM054_MARK') {
      const opponent = otherPlayer(playerId)
      const options = opposingHoodmon(state, playerId).map((card) => hoodmonOption(definitions, opponent, card))
      if (options.length) {
        openChoice(state, { player: playerId, sourceCardId: 'HDM-054', prompt: 'ROOFTOP SLASH — choose 1 opposing Hoodmon to Mark.', minSelections: 1, maxSelections: 1, options, actionKey: 'HDM054_MARK', context: { continuations: remaining } })
        return state
      }
      continue
    }
    if (kind === 'CHERRY_SILENT') {
      const before = state.pendingChoice
      triggerCherrySilentOperator(state, definitions, playerId, instanceText, remaining)
      if (state.pendingChoice && state.pendingChoice !== before) return state
      remaining = []
      return state
    }
    if (kind === 'HDM090_PLAY') {
      const before = state.pendingChoice
      triggerOnAirPlay(state, definitions, playerId, instanceText)
      if (state.pendingChoice && state.pendingChoice !== before) {
        mergeChoiceContinuations(state.pendingChoice, remaining)
        return state
      }
      continue
    }
    if (kind === 'HDM090_OPP_REVEAL') {
      const before = state.pendingChoice
      triggerOnAirOpponentReveal(state, definitions, playerId)
      if (state.pendingChoice && state.pendingChoice !== before) {
        mergeChoiceContinuations(state.pendingChoice, remaining)
        return state
      }
      continue
    }
    if (kind === 'HDM093_OPP_DISCARD') {
      const opponent = otherPlayer(playerId)
      const hand = state.players[opponent].hand
      if (hand.length) {
        openChoice(state, {
          player: opponent,
          sourceCardId: 'HDM-093',
          prompt: 'STATUS SYSTEM LEAK — choose 1 card from your hand to discard.',
          minSelections: 1,
          maxSelections: 1,
          options: hand.map((cardId, index) => indexedCardOption(definitions, 'hand', cardId, index)),
          actionKey: 'HDM093_OPP_DISCARD',
          context: { sourcePlayer: playerId, continuations: remaining },
        })
        return state
      }
      appendLog(state, `Status System Leak found no card for ${opponent} to discard.`)
      continue
    }

    if (kind === 'TASK010_FINISH') {
      state.players[playerId].hoodmonDeck = shuffle(state.players[playerId].hoodmonDeck)
      appendLog(state, 'Puppy Chow Promise shuffled the Main Deck after resolving its top-3 effect.')
      if (state.players[playerId].activeHoodmon?.definitionId === 'HDM-002') {
        state.players[playerId].bond = Math.min(MAX_BOND, state.players[playerId].bond + 1)
        appendLog(state, 'Puppy Chow Promise bonus gained 1 Bond because Alley Pup is Active.')
      }
      continue
    }
    if (kind === 'TASK055_BONUS') {
      const activeId = state.players[playerId].activeHoodmon?.definitionId
      if (activeId === 'HDM-048' || activeId === 'HDM-049') {
        const before = state.pendingChoice
        taskBonusMarkChoice(state, definitions, playerId)
        if (state.pendingChoice && state.pendingChoice !== before) {
          mergeChoiceContinuations(state.pendingChoice, remaining)
          return state
        }
      }
      continue
    }
    if (kind === 'TASK058_BONUS') {
      if (!controlsCherry(state, playerId)) continue
      const opponent = otherPlayer(playerId)
      const top = state.players[opponent].hoodmonDeck[0]
      if (!top) {
        appendLog(state, `Dead Drop Message bonus found no card on top of ${opponent}'s Main Deck.`)
        continue
      }
      openChoice(state, {
        player: playerId,
        sourceCardId: 'HDM-058',
        prompt: `CHERRY BANKS BONUS — privately look at the top card of ${opponent}'s Main Deck.`,
        minSelections: 1,
        maxSelections: 1,
        options: [{ id: `peek:${top}`, value: 'continue', cardId: top, label: definitions[top]?.name ?? top, detail: 'TOP CARD · information only; the card stays on top.' }],
        actionKey: 'TASK058_PEEK',
        context: { continuations: remaining },
      })
      return state
    }
    if (kind === 'TASK062_REWARD') {
      const discard = state.players[playerId].discard
      if (!discard.length) {
        drawOne(state, playerId)
        if ((state.status as GameState['status']) !== 'game_over') appendLog(state, 'Data Snatch drew 1 card; there was no Discard card to recycle.')
        continue
      }
      openChoice(state, {
        player: playerId,
        sourceCardId: 'HDM-062',
        prompt: 'DATA SNATCH REWARD — you may put 1 card from your Discard on the bottom of your Main Deck, then draw 1 card.',
        minSelections: 0,
        maxSelections: 1,
        options: discard.map((cardId, index) => indexedCardOption(definitions, 'discard', cardId, index)),
        actionKey: 'TASK062_RECYCLE',
        context: { continuations: remaining },
      })
      return state
    }
    if (kind === 'TASK085_BONUS') {
      const activeId = state.players[playerId].activeHoodmon?.definitionId
      if (activeId === 'HDM-079' || activeId === 'HDM-080') {
        drawOne(state, playerId)
        if ((state.status as GameState['status']) !== 'game_over') appendLog(state, 'Research, Record, Reveal! bonus drew 1 card because Kitklaws or Scratchwiser is Active.')
      }
      continue
    }
    if (kind === 'TASK103_BONUS') {
      const count = state.players[playerId].reserves.filter((card) => card && isBeardedDragon(definitions[card.definitionId])).length
      if (count >= 2) {
        drawOne(state, playerId)
        if ((state.status as GameState['status']) !== 'game_over') appendLog(state, 'Reserve Roll Call bonus drew 1 card for controlling 2+ Bearded Dragons in Reserve.')
      }
      continue
    }
  }
  if (state.reactionWindow && !state.pendingChoice && state.status !== 'game_over') {
    state.status = 'reaction'
    return state
  }
  if (state.status === 'active' && state.pendingPromotion) state.status = 'awaiting_promotion'
  return state
}

export function tamerActivationReady(
  state: GameState,
  _definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): boolean {
  if (support39TamerActivationReady(state, _definitions, playerId)) return true
  const tamer = state.players[playerId].tamer
  return Boolean(
    state.status === 'active'
    && state.currentPlayerTurn === playerId
    && state.currentPhase === 'Main'
    && tamer?.definitionId === 'HDM-046'
    && !support39CardEffectsNegated(state, tamer)
    && tamer.readyState === 'ready'
    && opposingHoodmon(state, playerId).length > 0
  )
}

function openCherryTamerActivationChoice(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  sourceInstanceId?: string,
): GameState {
  const opponent = otherPlayer(playerId)
  return openChoice(state, {
    player: playerId,
    sourceCardId: 'HDM-046',
    sourceInstanceId,
    prompt: 'HIT WITHOUT WARNING — choose 1 opposing Hoodmon. It becomes Marked until the end of that opponent’s next turn.',
    minSelections: 1,
    maxSelections: 1,
    options: opposingHoodmon(state, playerId).map((card) => hoodmonOption(definitions, opponent, card)),
    actionKey: 'HDM046_MARK',
  })
}

export function activateTamerEffect(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): GameState {
  if (!tamerActivationReady(state, definitions, playerId)) throw new Error('That Tamer has no legal activated ability right now.')
  const tamer = state.players[playerId].tamer!
  if (tamer.definitionId !== 'HDM-046') {
    if (shouldOpenActivationReaction(state, definitions, playerId, 'activate')) {
      return openActivationReaction(state, playerId, tamer.definitionId, 'ACTIVATE_TAMER', 'activate', { sourceZone: 'tamer', sourceInstanceId: tamer.instanceId })
    }
    return attachContinuations(activateSupport39Tamer(state, definitions, playerId), definitions, [`HDM082_TRIGGER|${playerId}|`])
  }
  tamer.readyState = 'exhausted'
  if (shouldOpenActivationReaction(state, definitions, playerId, 'activate')) {
    return openActivationReaction(state, playerId, tamer.definitionId, 'ACTIVATE_TAMER', 'activate', {
      sourceZone: 'tamer',
      sourceInstanceId: tamer.instanceId,
    })
  }
  return attachContinuations(openCherryTamerActivationChoice(state, definitions, playerId, tamer.instanceId), definitions, [`HDM082_TRIGGER|${playerId}|`])
}

export function velvetKennelAttackBonus(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  attacker: CardInstance,
  target: CardInstance | null,
): number {
  const field = state.players[playerId].field
  if (!field || field.definitionId !== 'HDM-042' || support39CardEffectsNegated(state, field)) return 0
  if (!isBeast(definitions[attacker.definitionId]) || !hasStatus(target, 'charmed')) return 0
  if (fieldHasTurnMarker(field, 'field_attack_bonus_used', state.turnNumber)) return 0
  addFieldTurnMarker(state, field, 'HDM-042', 'field_attack_bonus_used')
  appendLog(state, 'Velvet Block Kennel adds +100 damage to the first Beast attack against a Charmed Hoodmon this turn.')
  return 100
}

export function prepareCherryBattleModifiers(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  attackerPlayer: PlayerId,
  attacker: CardInstance,
  target: CardInstance | null,
): void {
  if (target && hasStatus(target, 'marked') && controlsCherry(state, attackerPlayer)) {
    addModifier(state, target, 'HDM-046-BATTLE', 'atk', -200, 'until_end_of_turn')
    appendLog(state, 'Cherry Banks — Hit Without Warning gives the Marked defender -200 ATK during this battle.')
  }
  for (const card of [attacker, target].filter((entry): entry is CardInstance => Boolean(entry))) {
    const penalties = (card.runtimeAbilities ?? []).filter((ability) => ability.kind === 'next_battle_atk_penalty')
    if (!penalties.length) continue
    for (const ability of penalties) addModifier(state, card, 'HDM-050-BATTLE', 'atk', ability.amount, 'until_end_of_turn')
    const consumed = new Set(penalties.map((ability) => ability.id))
    card.runtimeAbilities = (card.runtimeAbilities ?? []).filter((ability) => !consumed.has(ability.id))
    appendLog(state, `${definitions[card.definitionId]?.name ?? card.definitionId} takes ${penalties.reduce((sum, ability) => sum + ability.amount, 0)} ATK in this battle from Needle Swipe.`)
  }
}

export function cleanupCherryBattleModifiers(attacker: CardInstance | null, target: CardInstance | null): void {
  for (const card of [attacker, target].filter((entry): entry is CardInstance => Boolean(entry))) {
    card.modifiers = card.modifiers.filter((modifier) => !['HDM-046-BATTLE', 'HDM-050-BATTLE'].includes(modifier.sourceCardId))
  }
}

export function triggerCherryBatchAttackAftermath(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  attackerPlayer: PlayerId,
  attackerInstanceId: string,
  defenderInstanceId: string | null,
  targetWasMarked: boolean,
  attackResolved: boolean,
): GameState {
  const attacker = findHoodmon(state.players[attackerPlayer], attackerInstanceId)
  if (!attacker) return state
  const attackerDefinition = definitions[attacker.definitionId]

  const attackerEffectsLive = !support39CardEffectsNegated(state, attacker)

  if (attackerEffectsLive && attackResolved && targetWasMarked && attacker.definitionId === 'HDM-047') {
    drawOne(state, attackerPlayer)
    appendLog(state, 'Kitten — Paw Tap drew 1 card for attacking a Marked Hoodmon.')
    if (state.status === 'game_over') return state
  }

  if (attackResolved && targetWasMarked) {
    const drawAbilities = (attacker.runtimeAbilities ?? []).filter((ability) => ability.kind === 'draw_on_attack_marked' && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber)
    for (const ability of drawAbilities) {
      drawOne(state, attackerPlayer)
      attacker.runtimeAbilities = (attacker.runtimeAbilities ?? []).filter((entry) => entry.id !== ability.id)
      appendLog(state, `${attackerDefinition?.name ?? attacker.definitionId} attacked a Marked Hoodmon and triggered ${ability.sourceCardId}.`)
      if (state.status === 'game_over') return state
    }
  }

  const target = defenderInstanceId ? findHoodmon(state.players[otherPlayer(attackerPlayer)], defenderInstanceId) : null
  if (attackerEffectsLive && attackResolved && targetWasMarked && attacker.definitionId === 'HDM-050' && target) {
    ;(target.runtimeAbilities ??= []).push({
      id: `HDM-050-next-battle-${state.turnNumber}-${Math.random().toString(36).slice(2, 8)}`,
      sourceCardId: 'HDM-050',
      kind: 'next_battle_atk_penalty',
      amount: -100,
    })
    appendLog(state, 'Velvet Paw Scout — Needle Swipe gives the Marked defender -100 ATK during its next battle.')
  }

  const continuations: string[] = []
  if (attackerEffectsLive && attackResolved && targetWasMarked && attacker.definitionId === 'HDM-049') continuations.push(`HDM049_SPLASH|${attackerPlayer}|${defenderInstanceId ?? ''}`)
  if (attackResolved && attacker.definitionId === 'HDM-054' && controlsCherry(state, attackerPlayer)) continuations.push(`HDM054_MARK|${attackerPlayer}|`)
  if (attackerDefinition && isDarkOrFairy(attackerDefinition) && controlsCherry(state, attackerPlayer)) continuations.push(`CHERRY_SILENT|${attackerPlayer}|${attackerInstanceId}`)
  return runContinuations(state, definitions, continuations)
}

function openTargetedEffectReaction(
  state: GameState,
  sourcePlayer: PlayerId,
  sourceCardId: string,
  effectKey: string,
  targetRefs: string[],
  context?: PendingTargetedEffect['context'],
): GameState {
  const firstTargetOwner = targetRefs[0]?.split('|')[0] as PlayerId | undefined
  state.status = 'reaction'
  state.reactionWindow = {
    openedBy: 'effect',
    nonActivePlayerResponded: false,
    activePlayerResponded: false,
    priority: firstTargetOwner ?? otherPlayer(sourcePlayer),
    pendingEffect: { sourcePlayer, sourceCardId, effectKey, targetRefs, context },
    responseStack: [],
    responseCards: [],
  }
  appendLog(state, `${sourceCardId} targeted a Hoodmon. Reaction Window opened.`)
  return state
}

export function resolvePendingTargetedEffect(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  pending: PendingTargetedEffect,
): GameState {
  if (pending.negated) {
    appendLog(state, `${definitions[pending.sourceCardId]?.name ?? pending.sourceCardId}'s activation or effect was negated.`)
    if (pending.effectKey === 'ACTIVATE_STANDARD_MAGIC') return afterCardPlayed(state, definitions, pending.sourcePlayer, pending.sourceCardId)
    if (pending.sourceCardId === 'HDM-054') return runContinuations(state, definitions, choiceContinuations(pending.context))
    return runContinuations(state, definitions, choiceContinuations(pending.context))
  }

  const targets = pending.targetRefs.flatMap((ref) => {
    const [owner, instanceId] = ref.split('|') as [PlayerId, string]
    const card = findHoodmon(state.players[owner], instanceId)
    if (!card) return []
    if (support39TargetProtected(state, definitions, pending.sourcePlayer, owner, card)) {
      appendLog(state, `${definitions[card.definitionId]?.name ?? card.definitionId} is protected from opponent targeting effects.`)
      return []
    }
    return [{ owner, card }]
  })

  switch (pending.effectKey) {
    case 'ACTIVATE_STANDARD_MAGIC': {
      return afterCardPlayed(
        activateStandardMagicEffect(state, definitions, pending.sourcePlayer, pending.sourceCardId),
        definitions,
        pending.sourcePlayer,
        pending.sourceCardId,
      )
    }
    case 'ACTIVATE_FIELD': {
      const result = activateFieldEffect(state, definitions, pending.sourcePlayer, pending.sourceCardId)
      return afterCardPlayed(result, definitions, pending.sourcePlayer, pending.sourceCardId)
    }
    case 'ACTIVATE_TAMER': {
      const tamer = state.players[pending.sourcePlayer].tamer
      if (!tamer || tamer.definitionId !== pending.sourceCardId) return state
      if (pending.sourceCardId === 'HDM-046') return attachContinuations(openCherryTamerActivationChoice(state, definitions, pending.sourcePlayer, tamer.instanceId), definitions, [`HDM082_TRIGGER|${pending.sourcePlayer}|`])
      return attachContinuations(activateSupport39Tamer(state, definitions, pending.sourcePlayer), definitions, [`HDM082_TRIGGER|${pending.sourcePlayer}|`])
    }
    case 'HDM031_CHARM': {
      const target = targets[0]
      if (target) applyCharmedStatus(state, definitions, target.owner, target.card)
      break
    }
    case 'HDM032_WEAKEN': {
      const target = targets[0]
      if (target && hasStatus(target.card, 'charmed')) {
        addModifier(state, target.card, 'HDM-032', 'atk', -200, 'until_end_of_turn')
        appendLog(state, `${definitions[target.card.definitionId]?.name ?? target.card.definitionId} gets -200 ATK this turn from Iron Jaw.`)
      }
      break
    }
    case 'HDM033_MODE': {
      const mode = String(pending.context?.mode ?? '')
      for (const target of targets) {
        if (mode === 'charm') applyCharmedStatus(state, definitions, target.owner, target.card)
        else if (mode === 'weaken') addModifier(state, target.card, 'HDM-033', 'atk', -300, 'until_end_of_turn')
      }
      appendLog(state, mode === 'charm' ? 'Redline made the selected Hoodmon Charmed.' : 'Redline gave the selected Hoodmon -300 ATK this turn.')
      break
    }
    case 'HDM037_LOCK': {
      const target = targets[0]
      if (!target) break
      if (hasStatus(target.card, 'charmed')) {
        target.card.damageTaken += 200
        setTemporaryRestriction(state, target.card, 'cannotAttack', true)
        appendLog(state, `${definitions[target.card.definitionId]?.name ?? target.card.definitionId} was already Charmed: it loses 200 HP and cannot attack this turn.`)
      } else {
        applyCharmedStatus(state, definitions, target.owner, target.card)
      }
      break
    }
    case 'HDM046_MARK': {
      const target = targets[0]
      if (target) {
        const expiry = nextTurnNumberForPlayer(state, target.owner)
        return applyMarkedStatus(state, definitions, pending.sourcePlayer, target.owner, target.card, expiry, choiceContinuations(pending.context))
      }
      break
    }
    case 'HDM048_MARK': {
      const target = targets[0]
      const continuations = [`HDM048_TRAP_RETURN|${pending.sourcePlayer}|${String(pending.context?.sourceInstanceId ?? '')}`, ...choiceContinuations(pending.context)]
      if (target) return applyMarkedStatus(state, definitions, pending.sourcePlayer, target.owner, target.card, undefined, continuations)
      return runContinuations(state, definitions, continuations)
    }
    case 'HDM054_MARK': {
      const target = targets[0]
      if (target) return applyMarkedStatus(state, definitions, pending.sourcePlayer, target.owner, target.card, undefined, choiceContinuations(pending.context))
      return runContinuations(state, definitions, choiceContinuations(pending.context))
    }
    default:
      if (resolveSupport39TargetedEffect(state, definitions, pending)) {
        return runContinuations(state, definitions, choiceContinuations(pending.context))
      }
      throw new Error(`Unknown targeted effect resolver: ${pending.effectKey}`)
  }
  return state
}

export function triggerOnDeploy(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  instanceId: string,
): GameState {
  syncPersistentFieldEffects(state, definitions, playerId)
  const card = findHoodmon(state.players[playerId], instanceId)
  if (!card) return state

  if (card.definitionId === 'HDM-031') {
    const opponent = otherPlayer(playerId)
    const options = opposingHoodmon(state, playerId)
      .filter((target) => effectiveAtk(definitions[target.definitionId], target) <= 300)
      .map((target) => hoodmonOption(definitions, opponent, target))
    if (!options.length) {
      appendLog(state, 'Puppy — Bite N Hold has no opposing Hoodmon with 300 ATK or less.')
      return state
    }
    return openChoice(state, {
      player: playerId,
      sourceCardId: 'HDM-031',
      sourceInstanceId: instanceId,
      prompt: 'Choose 1 opposing Hoodmon with 300 ATK or less. It becomes Charmed.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM031_CHARM',
    })
  }

  if (card.definitionId === 'HDM-034') {
    const player = state.players[playerId]
    const options = player.hoodmonDeck.flatMap((cardId, index) => {
      const definition = definitions[cardId]
      const legal = (definition?.cardType === 'hoodmon' && isBeastOrDark(definition)) || effectMentionsCharmed(definition)
      return legal ? [indexedCardOption(definitions, 'deck', cardId, index)] : []
    })
    if (!options.length) {
      appendLog(state, 'Chainjaw Pup — Street Sniffer found no legal card in the deck.')
      return state
    }
    return openChoice(state, {
      player: playerId,
      sourceCardId: 'HDM-034',
      sourceInstanceId: instanceId,
      prompt: 'Choose 1 Beast/Dark Hoodmon or 1 card that mentions Charmed from your Deck and add it to your hand.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM034_SEARCH',
    })
  }


  if (card.definitionId === 'HDM-047') {
    return startTopDeckLook(
      state, definitions, playerId, 'HDM-047', instanceId, 3,
      (definition) => Boolean(definition && (definition.cardType === 'trap' || definition.cardType === 'task' || isCherryArchetype(definition))),
      'HDM047_CURIOUS_PICK',
      'CURIOUS INSTINCT — you may add 1 Trap, Task, or Cherry Banks / High-Class Charm card from the revealed top 3 cards to your hand.',
    )
  }

  if (card.definitionId === 'HDM-050') {
    return startTopDeckLook(
      state, definitions, playerId, 'HDM-050', instanceId, 4,
      (definition) => Boolean(definition && (definition.cardType === 'trap' || isCherryArchetype(definition))),
      'HDM050_EYES_PICK',
      'EYES IN THE ALLEY — choose 1 Trap or Cherry Banks / High-Class Charm card from the top 4 cards to put into your hand.',
    )
  }

  if (card.definitionId === 'HDM-054') {
    const opponent = otherPlayer(playerId)
    const hand = state.players[opponent].hand
    if (!hand.length) {
      appendLog(state, 'Rooftop Informant — Intel Snatch found an empty opposing hand.')
      return state
    }
    return openChoice(state, {
      player: playerId,
      sourceCardId: 'HDM-054',
      sourceInstanceId: instanceId,
      prompt: 'INTEL SNATCH — look at the opponent’s hand and choose 1 card for them to reveal. Magic, Trap, or Task cards are placed on the bottom of their Deck.',
      minSelections: 1,
      maxSelections: 1,
      options: hand.map((cardId, index) => indexedCardOption(definitions, 'opponent-hand', cardId, index)),
      actionKey: 'HDM054_INTEL',
      context: { opponent },
    })
  }

  return state
}

export function triggerOnEvolve(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  instanceId: string,
  definitionId: string,
): GameState {
  syncPersistentFieldEffects(state, definitions, playerId)
  const card = findHoodmon(state.players[playerId], instanceId)
  if (!card || card.definitionId !== definitionId) return state
  if (support39CardEffectsNegated(state, card)) {
    appendLog(state, `${definitions[definitionId]?.name ?? definitionId}'s evolve effect is negated.`)
    return state
  }

  if (definitionId === 'HDM-032') {
    if (controlsPeaches(state, playerId)) {
      addModifier(state, card, definitionId, 'atk', 200, 'persistent')
      appendLog(state, 'Brawler gains +200 ATK from Iron Jaw because Peaches is in play.')
    }
    const opponent = otherPlayer(playerId)
    const options = opposingHoodmon(state, playerId)
      .filter((target) => hasStatus(target, 'charmed'))
      .map((target) => hoodmonOption(definitions, opponent, target))
    if (!options.length) {
      appendLog(state, 'Brawler — Iron Jaw has no Charmed opposing Hoodmon to weaken.')
      return state
    }
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      sourceInstanceId: instanceId,
      prompt: 'Choose 1 Charmed opposing Hoodmon. It gets -200 ATK this turn.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM032_WEAKEN',
    })
  }

  if (definitionId === 'HDM-033') {
    const otherCharmedBeast = ownHoodmon(state, playerId).some((ally) => {
      if (ally.instanceId === instanceId) return false
      return hasStatus(ally, 'charmed') && definitions[ally.definitionId]?.alignment?.includes('Beast')
    })
    if (otherCharmedBeast) {
      addModifier(state, card, definitionId, 'hp', 300, 'persistent')
      appendLog(state, 'Redline gains +300 HP from Blood Oath because another Beast you control is Charmed.')
    }
    const opponent = otherPlayer(playerId)
    const options = opposingHoodmon(state, playerId).map((target) => hoodmonOption(definitions, opponent, target))
    if (!options.length) {
      appendLog(state, 'Redline — Blood Oath has no opposing Hoodmon to choose.')
      return state
    }
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      sourceInstanceId: instanceId,
      prompt: 'Choose up to 2 opposing Hoodmon for Blood Oath.',
      minSelections: 0,
      maxSelections: Math.min(2, options.length),
      options,
      actionKey: 'HDM033_TARGETS',
    })
  }

  if (definitionId === 'HDM-035') {
    if (!opposingHoodmon(state, playerId).some((target) => hasStatus(target, 'charmed'))) {
      appendLog(state, 'Velvet Mauler — Pretty But Mean does not trigger because no opposing Hoodmon is Charmed.')
      return state
    }
    const player = state.players[playerId]
    const options = player.discard.flatMap((cardId, index) => isBeastOrDark(definitions[cardId])
      ? [indexedCardOption(definitions, 'discard', cardId, index)]
      : [])
    if (!options.length) {
      appendLog(state, 'Velvet Mauler — Pretty But Mean has no Beast or Dark card in the discard pile.')
      return state
    }
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      sourceInstanceId: instanceId,
      prompt: 'You may return 1 Beast or Dark card from your discard pile to your hand.',
      minSelections: 0,
      maxSelections: 1,
      options,
      actionKey: 'HDM035_RETURN',
    })
  }


  if (definitionId === 'HDM-048') {
    const opponent = otherPlayer(playerId)
    const options = opposingHoodmon(state, playerId).map((target) => hoodmonOption(definitions, opponent, target))
    if (!options.length) return runContinuations(state, definitions, [`HDM048_TRAP_RETURN|${playerId}|${instanceId}`])
    return openChoice(state, {
      player: playerId,
      sourceCardId: 'HDM-048',
      sourceInstanceId: instanceId,
      prompt: 'SHADOW STEP — choose 1 opposing Hoodmon to Mark. Afterward, you may return 1 Trap from your discard pile to your hand.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM048_MARK',
    })
  }

  return state
}

export function standardMagicExecutionReady(definitionId: string): boolean {
  return support39StandardMagicReady(definitionId) || new Set([
    'HDM-036', 'HDM-037', 'HDM-038', 'HDM-039', 'HDM-045', 'HDM-052', 'HDM-053',
    'HDM-087', 'HDM-088', 'HDM-089', 'HDM-092', 'HDM-093',
  ]).has(definitionId)
}

export function standardMagicHasLegalTarget(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
): boolean {
  if (support39StandardMagicReady(definitionId)) return support39StandardMagicHasLegalTarget(state, definitions, playerId, definitionId)
  if (definitionId === 'HDM-036' || definitionId === 'HDM-039') {
    return ownHoodmon(state, playerId).some((card) => isBeastOrDark(definitions[card.definitionId]))
  }
  if (definitionId === 'HDM-037') return opposingHoodmon(state, playerId).length > 0
  if (definitionId === 'HDM-038') return state.players[playerId].hoodmonDeck.some((cardId) => prettyGirlsSearchable(definitions[cardId]))
  if (definitionId === 'HDM-045') return ownHoodmon(state, playerId).length > 0
  if (definitionId === 'HDM-052') return ownHoodmon(state, playerId).some((card) => isDarkOrFairy(definitions[card.definitionId]))
  if (definitionId === 'HDM-053') return ownHoodmon(state, playerId).some((card) => {
    const definition = definitions[card.definitionId]
    return Boolean(isDarkOrFairy(definition) && definition?.stageLevel && definition.stageLevel <= 2)
  })
  // These effects remain legal even when they may find zero eligible cards; the printed
  // effect still performs its draw/look/reveal portion.
  if (definitionId === 'HDM-087' || definitionId === 'HDM-088' || definitionId === 'HDM-093') return true
  if (definitionId === 'HDM-089') return state.players[playerId].hoodmonDeck.some((cardId) => truthNetworkSearchable(definitions[cardId]))
  if (definitionId === 'HDM-092') return state.players[playerId].hoodmonDeck.some((cardId) => oracleSearchable(definitions[cardId]))
  return false
}

export function activateStandardMagicEffect(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
): GameState {
  if (support39StandardMagicReady(definitionId)) return activateSupport39StandardMagic(state, definitions, playerId, definitionId)
  if (definitionId === 'HDM-036') {
    const options = ownHoodmon(state, playerId)
      .filter((card) => isBeastOrDark(definitions[card.definitionId]))
      .map((card) => hoodmonOption(definitions, playerId, card))
    if (!options.length) throw new Error('I Know My Worth needs a Beast or Dark Hoodmon you control.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'Choose 1 Beast or Dark Hoodmon you control. It gains +300 ATK this turn and draws 1 card if it attacks a Charmed Hoodmon this turn.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM036_BUFF',
    })
  }

  if (definitionId === 'HDM-037') {
    const opponent = otherPlayer(playerId)
    const options = opposingHoodmon(state, playerId).map((card) => hoodmonOption(definitions, opponent, card))
    if (!options.length) throw new Error('Iron Jaw Lock needs an opposing Hoodmon.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'Choose 1 opposing Hoodmon. It becomes Charmed; an already Charmed target also loses 200 HP and cannot attack this turn.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM037_TARGET',
    })
  }

  if (definitionId === 'HDM-038') {
    const player = state.players[playerId]
    const options = player.hoodmonDeck.flatMap((cardId, index) => prettyGirlsSearchable(definitions[cardId])
      ? [indexedCardOption(definitions, 'deck', cardId, index)]
      : [])
    if (!options.length) throw new Error('Pretty Girls Raise Monsters found no Beast Hoodmon, Dark Hoodmon, or Tamer card in your Deck.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'Search your Deck for 1 Beast Hoodmon, Dark Hoodmon, or Tamer card and add it to your hand.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM038_SEARCH',
    })
  }

  if (definitionId === 'HDM-039') {
    const options = ownHoodmon(state, playerId)
      .filter((card) => isBeastOrDark(definitions[card.definitionId]))
      .map((card) => hoodmonOption(definitions, playerId, card))
    if (!options.length) throw new Error('Off the Leash needs a Beast or Dark Hoodmon you control.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'Choose 1 Beast or Dark Hoodmon you control. It gains +200 ATK this turn and +200 attack damage when attacking a Charmed Hoodmon this turn.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM039_BUFF',
    })
  }

  if (definitionId === 'HDM-045') {
    const options = ownHoodmon(state, playerId).map((card) => hoodmonOption(definitions, playerId, card))
    if (!options.length) throw new Error('Street Contract needs a Hoodmon you control.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'Choose 1 Hoodmon you control. Its next evolution this turn costs 1 less Bond and draws 1 card; Peaches or EB & Igniscale also grants +200 ATK/+200 HP this turn.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM045_CONTRACT',
    })
  }

  if (definitionId === 'HDM-052') {
    const options = ownHoodmon(state, playerId).filter((card) => isDarkOrFairy(definitions[card.definitionId])).map((card) => hoodmonOption(definitions, playerId, card))
    if (!options.length) throw new Error('Silent Claws needs a Dark or Fairy Hoodmon you control.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'Choose 1 Dark or Fairy Hoodmon you control. It gains +200 ATK this turn and draws 1 card if it attacks a Marked Hoodmon this turn.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM052_BUFF',
    })
  }

  if (definitionId === 'HDM-053') {
    const options = ownHoodmon(state, playerId).filter((card) => {
      const definition = definitions[card.definitionId]
      return Boolean(isDarkOrFairy(definition) && definition?.stageLevel && definition.stageLevel <= 2)
    }).map((card) => hoodmonOption(definitions, playerId, card))
    if (!options.length) throw new Error('Shadow Step needs a Stage 1 or Stage 2 Dark/Fairy Hoodmon you control.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'Return 1 Stage 1 or Stage 2 Dark/Fairy Hoodmon you control to your hand. Then you may immediately evolve another Hoodmon from your hand for 1 less Bond.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM053_RETURN',
    })
  }

  if (definitionId === 'HDM-087') {
    const seen = new Set<string>()
    const options = state.players[playerId].discard.flatMap((cardId, index) => {
      const name = (definitions[cardId]?.name ?? cardId).trim().toLowerCase()
      if (seen.has(name)) return []
      seen.add(name)
      return [indexedCardOption(definitions, 'discard', cardId, index)]
    })
    if (!options.length) {
      appendLog(state, 'Field Notes Archive found no cards to recycle, then draws 1 card.')
      drawOne(state, playerId)
      return state
    }
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'FIELD NOTES ARCHIVE — choose up to 2 cards with different names from your discard pile to return to the bottom of your Hoodmon Deck. Then draw 1 card.',
      minSelections: 0,
      maxSelections: Math.min(2, options.length),
      options,
      actionKey: 'HDM087_SELECT',
    })
  }

  if (definitionId === 'HDM-088') {
    return startTopDeckLook(
      state, definitions, playerId, definitionId, undefined, 4,
      (definition) => definition?.cardType === 'hoodmon',
      'HDM088_PICK',
      'EYEWITNESS REPORT — you may reveal 1 Hoodmon among the top 4 cards and put it into your hand. Put the rest on the bottom in any order.',
    )
  }

  if (definitionId === 'HDM-089') {
    const options = state.players[playerId].hoodmonDeck.flatMap((cardId, index) => truthNetworkSearchable(definitions[cardId])
      ? [indexedCardOption(definitions, 'deck', cardId, index)]
      : [])
    if (!options.length) throw new Error('Hidden Pattern Decode found no Calicore, Monical, or Truth Network card in your Hoodmon Deck.')
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: 'HIDDEN PATTERN DECODE — choose Calicore, Monical, or a card that mentions Truth Network. Reveal it, add it to your hand, then shuffle.',
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM089_SEARCH',
    })
  }

  if (definitionId === 'HDM-092') {
    const options = state.players[playerId].hoodmonDeck.flatMap((cardId, index) => oracleSearchable(definitions[cardId])
      ? [indexedCardOption(definitions, 'deck', cardId, index)]
      : [])
    if (!options.length) throw new Error("Oracle's Data Stream found no Psychic Hoodmon, Research card, or Truth Network card in your Hoodmon Deck.")
    return openChoice(state, {
      player: playerId,
      sourceCardId: definitionId,
      prompt: "ORACLE'S DATA STREAM — choose 1 Psychic Hoodmon or 1 card that mentions Research or Truth Network. Reveal it, add it to your hand, then shuffle.",
      minSelections: 1,
      maxSelections: 1,
      options,
      actionKey: 'HDM092_SEARCH',
    })
  }

  if (definitionId === 'HDM-093') {
    return startTopDeckLook(
      state, definitions, playerId, definitionId, undefined, 4,
      (definition) => oracleSearchable(definition),
      'HDM093_PICK',
      'STATUS SYSTEM LEAK — you may add 1 Psychic Hoodmon or 1 card that mentions Research or Truth Network among the revealed top 4 cards to your hand.',
      [`HDM090_OPP_REVEAL|${playerId}|`],
    )
  }

  throw new Error('That Standard Magic does not have a digital resolver yet.')
}


function taskSearchOption(definitions: Record<string, CardDefinition>, zone: string, cardId: string, index: number, detailPrefix = ''): ChoiceOption {
  const option = indexedCardOption(definitions, zone, cardId, index)
  if (detailPrefix) option.detail = `${detailPrefix}${option.detail ? ` · ${option.detail}` : ''}`
  return option
}

function openTaskSearch(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  sourceCardId: string,
  options: ChoiceOption[],
  prompt: string,
  actionKey: string,
  required = true,
  context: PendingChoice['context'] = {},
): GameState {
  if (!options.length) {
    appendLog(state, `${definitions[sourceCardId]?.name ?? sourceCardId} found no legal search target.`)
    return runContinuations(state, definitions, choiceContinuations(context))
  }
  return openChoice(state, {
    player: playerId,
    sourceCardId,
    prompt,
    minSelections: required ? 1 : 0,
    maxSelections: 1,
    options,
    actionKey,
    context,
  })
}

function taskBonusMarkChoice(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): GameState {
  const opponent = otherPlayer(playerId)
  const options = opposingHoodmon(state, playerId).map((card) => hoodmonOption(definitions, opponent, card))
  if (!options.length) {
    appendLog(state, 'Marked for Midnight bonus had no opposing Hoodmon to Mark.')
    return state
  }
  return openChoice(state, {
    player: playerId,
    sourceCardId: 'HDM-055',
    prompt: 'BONUS — Shadowcat or Miso is Active. Choose 1 opposing Hoodmon to Mark.',
    minSelections: 1,
    maxSelections: 1,
    options,
    actionKey: 'TASK055_MARK',
  })
}

function task110TargetChoice(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): GameState {
  const opponent = otherPlayer(playerId)
  const options = opposingHoodmon(state, playerId).map((card) => hoodmonOption(definitions, opponent, card))
  if (!options.length) {
    appendLog(state, 'Crash Their Feed had no opposing Hoodmon to weaken.')
    return state
  }
  return openChoice(state, {
    player: playerId,
    sourceCardId: 'HDM-110',
    prompt: 'CRASH THEIR FEED — choose 1 opposing Hoodmon. It gets -200 ATK until end of turn.',
    minSelections: 1,
    maxSelections: 1,
    options,
    actionKey: 'TASK110_TARGET',
  })
}

export function resolveCompletedTaskEffect(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  taskId: string,
  taskerInstanceId: string,
): GameState {
  const player = state.players[playerId]
  switch (taskId) {
    case 'HDM-010':
      return startTopDeckLook(
        state,
        definitions,
        playerId,
        taskId,
        taskerInstanceId,
        3,
        (definition) => Boolean(definition && ((isBasicHoodmon(definition) && definition.alignment?.includes('Beast')) || hasTrait(definition, 'Neighborhood Loyalty'))),
        'TASK010_PICK',
        'PUPPY CHOW PROMISE — you may add 1 Stage 1 Beast Hoodmon or 1 Neighborhood Loyalty card to your hand.',
        [`TASK010_FINISH|${playerId}|`],
      )
    case 'HDM-011': {
      player.bond = Math.min(MAX_BOND, player.bond + 1)
      appendLog(state, 'Corner Bowl Offering gained 1 Bond.')
      if (controlsOddPaul(state, playerId)) {
        drawOne(state, playerId)
        appendLog(state, 'Corner Bowl Offering bonus drew 1 card because O.D.D. Paul is in play.')
        if (state.status === 'game_over') return state
      }
      const damagedBeasts = ownHoodmon(state, playerId).filter((card) => card.damageTaken > 0 && definitions[card.definitionId]?.alignment?.includes('Beast'))
      if (!damagedBeasts.length) return state
      return openChoice(state, {
        player: playerId,
        sourceCardId: taskId,
        prompt: 'Choose 1 damaged Beast Hoodmon you control to heal 200 HP.',
        minSelections: 1,
        maxSelections: 1,
        options: damagedBeasts.map((card) => hoodmonOption(definitions, playerId, card)),
        actionKey: 'TASK011_HEAL',
      })
    }
    case 'HDM-028':
      player.bond = Math.min(MAX_BOND, player.bond + 1)
      drawOne(state, playerId)
      appendLog(state, 'Check on the Block completed: gain 1 Bond and draw 1 card.')
      return state
    case 'HDM-029': {
      player.bond = Math.min(MAX_BOND, player.bond + 1)
      const damaged = ownHoodmon(state, playerId).filter((card) => card.damageTaken > 0)
      if (!damaged.length) {
        appendLog(state, 'Everybody Eats gained 1 Bond; there was no damaged Hoodmon to heal.')
        return state
      }
      return openChoice(state, {
        player: playerId,
        sourceCardId: taskId,
        prompt: 'EVERYBODY EATS — choose 1 damaged Hoodmon you control to heal 200 HP.',
        minSelections: 1,
        maxSelections: 1,
        options: damaged.map((card) => hoodmonOption(definitions, playerId, card)),
        actionKey: 'TASK029_HEAL',
      })
    }
    case 'HDM-055':
      return startTopDeckLook(
        state,
        definitions,
        playerId,
        taskId,
        taskerInstanceId,
        3,
        (definition) => Boolean(definition && ((definition.cardType === 'hoodmon' && isDarkOrFairy(definition)) || definition.cardType === 'trap')),
        'TASK055_PICK',
        'MARKED FOR MIDNIGHT — you may add 1 Dark/Fairy Hoodmon or 1 Trap card to your hand.',
        [`TASK055_BONUS|${playerId}|`],
      )
    case 'HDM-058': {
      const mainOptions = player.hoodmonDeck.flatMap((cardId, index) => definitions[cardId]?.cardType === 'trap'
        ? [taskSearchOption(definitions, 'main', cardId, index, 'MAIN DECK TRAP')]
        : [])
      const taskOptions = player.taskDeck.map((cardId, index) => taskSearchOption(definitions, 'taskdeck', cardId, index, 'TASK DECK · PUT ON TOP'))
      return openTaskSearch(
        state,
        definitions,
        playerId,
        taskId,
        [...mainOptions, ...taskOptions],
        'DEAD DROP MESSAGE — choose a Trap from your Main Deck to add to hand, or a Task from your Task Deck to place on top of that Task Deck.',
        'TASK058_SEARCH',
        true,
      )
    }
    case 'HDM-062':
      return startTopDeckLook(
        state,
        definitions,
        playerId,
        taskId,
        taskerInstanceId,
        3,
        (definition) => Boolean(definition && (definition.alignment?.includes('Dark') || hasTrait(definition, 'Tech'))),
        'TASK062_PICK',
        'DATA SNATCH — you may add 1 Dark card or 1 card with the Tech trait to your hand.',
      )
    case 'HDM-068': {
      const options = player.hoodmonDeck.flatMap((cardId, index) => definitions[cardId]?.alignment?.some((item) => item === 'Water' || item === 'Nature')
        ? [indexedCardOption(definitions, 'main', cardId, index)]
        : [])
      if (!options.length) {
        player.hoodmonDeck = shuffle(player.hoodmonDeck)
        player.bond = Math.min(MAX_BOND, player.bond + 1)
        appendLog(state, 'Dewdrop Cache found no Water/Nature card, then gained 1 Bond.')
        return state
      }
      return openTaskSearch(state, definitions, playerId, taskId, options, 'DEWDROP CACHE — choose 1 Water or Nature card to add to your hand.', 'TASK068_SEARCH')
    }
    case 'HDM-076': {
      player.bond = Math.min(MAX_BOND, player.bond + 1)
      const exhaustedBasics = ownHoodmon(state, playerId).filter((card) => card.readyState === 'exhausted' && isBasicHoodmon(definitions[card.definitionId]))
      if (!exhaustedBasics.length) return state
      return openChoice(state, {
        player: playerId,
        sourceCardId: taskId,
        prompt: 'TINY CREATURES, BIGGER MOVES — choose 1 exhausted Basic Hoodmon to ready. It cannot attempt another Task this turn.',
        minSelections: 1,
        maxSelections: 1,
        options: exhaustedBasics.map((card) => hoodmonOption(definitions, playerId, card)),
        actionKey: 'TASK076_READY',
      })
    }
    case 'HDM-085':
      return startTopDeckLook(
        state,
        definitions,
        playerId,
        taskId,
        taskerInstanceId,
        3,
        (definition) => Boolean(definition && ((definition.cardType === 'hoodmon' && definition.alignment?.includes('Psychic')) || definition.cardType === 'trap')),
        'TASK085_PICK',
        'RESEARCH, RECORD, REVEAL! — you may add 1 Psychic Hoodmon or 1 Trap card to your hand.',
        [`TASK085_BONUS|${playerId}|`],
      )
    case 'HDM-103':
      return startTopDeckLook(
        state,
        definitions,
        playerId,
        taskId,
        taskerInstanceId,
        3,
        (definition) => Boolean(definition && (isBeardedDragon(definition) || mentionsReserve(definition))),
        'TASK103_PICK',
        'RESERVE ROLL CALL — you may add 1 Bearded Dragon Hoodmon or 1 card that mentions Reserve to your hand.',
        [`TASK103_BONUS|${playerId}|`],
      )
    case 'HDM-110': {
      for (let i = 0; i < 2; i += 1) {
        drawOne(state, playerId)
        if (state.status === 'game_over') return state
      }
      if (!player.hand.length) return task110TargetChoice(state, definitions, playerId)
      return openChoice(state, {
        player: playerId,
        sourceCardId: taskId,
        prompt: 'CRASH THEIR FEED — draw 2 completed. Choose 1 card from your hand to discard.',
        minSelections: 1,
        maxSelections: 1,
        options: player.hand.map((cardId, index) => indexedCardOption(definitions, 'hand', cardId, index)),
        actionKey: 'TASK110_DISCARD',
      })
    }
    default:
      return state
  }
}

export function openWalkHimDownReward(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): GameState {
  const opponent = otherPlayer(playerId)
  const options = opposingHoodmon(state, playerId).map((card) => hoodmonOption(definitions, opponent, card))
  if (!options.length) {
    appendLog(state, 'Walk Him Down had no opposing Hoodmon to Charm.')
    if (controlsPeaches(state, playerId)) return openWalkHimDownHeal(state, definitions, playerId)
    return state
  }
  return openChoice(state, {
    player: playerId,
    sourceCardId: 'HDM-044',
    prompt: 'Walk Him Down reward: choose 1 opposing Hoodmon. It becomes Charmed.',
    minSelections: 1,
    maxSelections: 1,
    options,
    actionKey: 'HDM044_CHARM_REWARD',
  })
}

function openWalkHimDownHeal(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
): GameState {
  const damaged = ownHoodmon(state, playerId).filter((card) => card.damageTaken > 0)
  if (!damaged.length) {
    appendLog(state, 'Walk Him Down had no damaged Hoodmon to heal with Peaches.')
    return state
  }
  return openChoice(state, {
    player: playerId,
    sourceCardId: 'HDM-044',
    prompt: 'Peaches bonus: choose 1 of your Hoodmon to heal 200 HP.',
    minSelections: 1,
    maxSelections: 1,
    options: damaged.map((card) => hoodmonOption(definitions, playerId, card)),
    actionKey: 'HDM044_HEAL',
  })
}

export function resolvePendingChoice(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  selectedOptionIds: string[],
): GameState {
  const choice = state.pendingChoice
  if (state.status !== 'choice' || !choice) throw new Error('No card choice is pending.')
  if (choice.player !== playerId) throw new Error('That player does not own the pending choice.')

  const unique = [...new Set(selectedOptionIds)]
  if (unique.length < choice.minSelections || unique.length > choice.maxSelections) {
    throw new Error(`Choose between ${choice.minSelections} and ${choice.maxSelections} option${choice.maxSelections === 1 ? '' : 's'}.`)
  }
  const selected = unique.map((id) => {
    const option = choice.options.find((entry) => entry.id === id)
    if (!option) throw new Error('A selected choice is no longer legal.')
    return option
  })

  state.pendingChoice = null
  state.status = 'active'

  switch (choice.actionKey) {
    case 'HDM031_CHARM': {
      const option = selected[0]
      if (option?.player && option.instanceId) return openTargetedEffectReaction(state, playerId, 'HDM-031', 'HDM031_CHARM', [`${option.player}|${option.instanceId}`])
      break
    }
    case 'HDM032_WEAKEN': {
      const option = selected[0]
      if (option?.player && option.instanceId) return openTargetedEffectReaction(state, playerId, 'HDM-032', 'HDM032_WEAKEN', [`${option.player}|${option.instanceId}`])
      break
    }
    case 'HDM033_TARGETS': {
      if (!selected.length) {
        appendLog(state, 'Redline — Blood Oath chose no targets.')
        break
      }
      const targets = selected.flatMap((option) => option.player && option.instanceId ? [`${option.player}|${option.instanceId}`] : [])
      return openChoice(state, {
        player: playerId,
        sourceCardId: 'HDM-033',
        sourceInstanceId: choice.sourceInstanceId,
        prompt: 'Choose the Blood Oath effect for the selected Hoodmon.',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'charm', value: 'charm', label: 'MAKE THEM CHARMED', detail: 'Each selected opposing Hoodmon becomes Charmed.' },
          { id: 'weaken', value: 'weaken', label: 'BREAK THEIR POWER', detail: 'Each selected opposing Hoodmon gets -300 ATK this turn.' },
        ],
        actionKey: 'HDM033_MODE',
        context: { targets },
      })
    }
    case 'HDM033_MODE': {
      const mode = selected[0]?.value
      const refs = Array.isArray(choice.context?.targets) ? choice.context?.targets as string[] : []
      if (mode && refs.length) return openTargetedEffectReaction(state, playerId, 'HDM-033', 'HDM033_MODE', refs, { mode })
      break
    }
    case 'HDM034_SEARCH': {
      const player = state.players[playerId]
      const option = selected[0]
      if (option?.cardId) {
        const index = player.hoodmonDeck.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = player.hoodmonDeck.splice(index, 1)
          player.hand.push(cardId)
          appendLog(state, `Chainjaw Pup added ${definitions[cardId]?.name ?? cardId} from the Deck to ${playerId}'s hand.`)
        }
      }
      player.hoodmonDeck = shuffle(player.hoodmonDeck)
      appendLog(state, `${playerId} shuffled the Hoodmon Deck.`)
      break
    }
    case 'HDM035_RETURN': {
      const player = state.players[playerId]
      const option = selected[0]
      if (option?.cardId) {
        const index = player.discard.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = player.discard.splice(index, 1)
          player.hand.push(cardId)
          appendLog(state, `Velvet Mauler returned ${definitions[cardId]?.name ?? cardId} from the discard pile to ${playerId}'s hand.`)
        }
      } else {
        appendLog(state, 'Velvet Mauler declined to return a card with Pretty But Mean.')
      }
      break
    }
    case 'HDM036_BUFF': {
      const option = selected[0]
      const target = option?.instanceId ? findHoodmon(state.players[playerId], option.instanceId) : null
      if (!target || !isBeastOrDark(definitions[target.definitionId])) throw new Error('The chosen Hoodmon is no longer a legal I Know My Worth target.')
      addModifier(state, target, 'HDM-036', 'atk', 300, 'until_end_of_turn')
      addRuntimeAbility(state, target, 'HDM-036', 'draw_on_attack_charmed', 1, state.turnNumber)
      appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} gains +300 ATK this turn from I Know My Worth.`)
      break
    }
    case 'HDM037_TARGET': {
      const option = selected[0]
      if (option?.player && option.instanceId) return openTargetedEffectReaction(state, playerId, 'HDM-037', 'HDM037_LOCK', [`${option.player}|${option.instanceId}`])
      break
    }
    case 'HDM038_SEARCH': {
      const player = state.players[playerId]
      const option = selected[0]
      if (option?.cardId) {
        const index = player.hoodmonDeck.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = player.hoodmonDeck.splice(index, 1)
          player.hand.push(cardId)
          appendLog(state, `Pretty Girls Raise Monsters added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand.`)
        }
      }
      player.hoodmonDeck = shuffle(player.hoodmonDeck)
      const tamer = state.players[playerId].tamer?.definitionId
      if (tamer === 'HDM-030' || tamer === 'HDM-016' || tamer === 'HDM-046') {
        state.players[playerId].bond = Math.min(10, state.players[playerId].bond + 1)
        appendLog(state, 'Pretty Girls Raise Monsters gained +1 Bond from Peaches, Cinnamon, or Cherry.')
      }
      break
    }
    case 'HDM039_BUFF': {
      const option = selected[0]
      const target = option?.instanceId ? findHoodmon(state.players[playerId], option.instanceId) : null
      if (!target || !isBeastOrDark(definitions[target.definitionId])) throw new Error('The chosen Hoodmon is no longer a legal Off the Leash target.')
      addModifier(state, target, 'HDM-039', 'atk', 200, 'until_end_of_turn')
      addRuntimeAbility(state, target, 'HDM-039', 'bonus_damage_on_attack_charmed', 200, state.turnNumber)
      appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} gains +200 ATK this turn from Off the Leash.`)
      break
    }
    case 'HDM041_CHARM': {
      const option = selected[0]
      const target = option?.player && option.instanceId ? findHoodmon(state.players[option.player], option.instanceId) : null
      if (target && option.player) applyCharmedStatus(state, definitions, option.player, target)
      break
    }
    case 'HDM042_DISCARD': {
      const option = selected[0]
      if (option?.cardId) {
        const player = state.players[playerId]
        const index = player.hand.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = player.hand.splice(index, 1)
          player.discard.push(cardId)
          appendLog(state, `${playerId} discarded ${definitions[cardId]?.name ?? cardId} for Velvet Block Kennel.`)
        }
      }
      break
    }
    case 'HDM044_CHARM_REWARD': {
      const option = selected[0]
      const target = option?.player && option.instanceId ? findHoodmon(state.players[option.player], option.instanceId) : null
      if (target && option.player) applyCharmedStatus(state, definitions, option.player, target)
      if (controlsPeaches(state, playerId)) {
        // Charmed can legitimately open other once-per-turn choices first (for example
        // Peaches' own passive or Velvet Block Kennel). Queue the heal behind those
        // choices instead of dropping the reward when another choice is already open.
        return attachContinuations(state, definitions, [`HDM044_HEAL_CONT|${playerId}|`])
      }
      break
    }
    case 'HDM044_HEAL': {
      const option = selected[0]
      const target = option?.instanceId ? findHoodmon(state.players[playerId], option.instanceId) : null
      if (target) {
        const healed = Math.min(200, target.damageTaken)
        target.damageTaken -= healed
        appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} healed ${healed} HP from Walk Him Down.`)
      }
      break
    }
    case 'HDM045_CONTRACT': {
      const option = selected[0]
      const target = option?.instanceId ? findHoodmon(state.players[playerId], option.instanceId) : null
      if (!target) throw new Error('The chosen Hoodmon is no longer a legal Street Contract target.')
      addRuntimeAbility(state, target, 'HDM-045', 'street_contract', 1, state.turnNumber)
      if (controlsStreetContractTamer(state, playerId)) {
        addModifier(state, target, 'HDM-045', 'atk', 200, 'until_end_of_turn')
        addModifier(state, target, 'HDM-045', 'hp', 200, 'until_end_of_turn')
        appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} gains +200 ATK and +200 HP this turn from Street Contract.`)
      }
      appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId}'s next evolution this turn costs 1 less Bond and will draw 1 card.`)
      break
    }
    case 'HDM046_MARK': {
      const option = selected[0]
      if (option?.player && option.instanceId) {
        return openTargetedEffectReaction(state, playerId, 'HDM-046', 'HDM046_MARK', [`${option.player}|${option.instanceId}`], { continuations: choiceContinuations(choice.context) })
      }
      break
    }
    case 'HDM046_SILENT_PICK':
    case 'HDM047_CURIOUS_PICK':
    case 'HDM050_EYES_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context?.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `${definitions[choice.sourceCardId]?.name ?? choice.sourceCardId} put ${definitions[cardId]?.name ?? cardId} into ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      const bottomKey = `${choice.actionKey}_BOTTOM`
      return openBottomOrderChoice(state, definitions, playerId, choice.sourceCardId, choice.sourceInstanceId, remaining, bottomKey, choiceContinuations(choice.context))
    }
    case 'HDM046_SILENT_PICK_BOTTOM':
    case 'HDM047_CURIOUS_PICK_BOTTOM':
    case 'HDM050_EYES_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      appendLog(state, `${playerId} returned the remaining revealed cards to the bottom of the Deck in the chosen order.`)
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM048_MARK': {
      const option = selected[0]
      if (option?.player && option.instanceId) {
        return openTargetedEffectReaction(state, playerId, 'HDM-048', 'HDM048_MARK', [`${option.player}|${option.instanceId}`], { sourceInstanceId: choice.sourceInstanceId ?? '', continuations: choiceContinuations(choice.context) })
      }
      return runContinuations(state, definitions, [`HDM048_TRAP_RETURN|${playerId}|${choice.sourceInstanceId ?? ''}`, ...choiceContinuations(choice.context)])
    }
    case 'HDM048_TRAP_RETURN': {
      const option = selected[0]
      if (option?.cardId) {
        const index = state.players[playerId].discard.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = state.players[playerId].discard.splice(index, 1)
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Shadowcat returned ${definitions[cardId]?.name ?? cardId} from the discard pile to ${playerId}'s hand.`)
        }
      } else {
        appendLog(state, 'Shadowcat declined to return a Trap from the discard pile.')
      }
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM049_NINE_LIVES': {
      const targetOwner = String(choice.context?.targetOwner ?? '') as PlayerId
      const targetInstanceId = String(choice.context?.targetInstanceId ?? '')
      const target = targetOwner ? findHoodmon(state.players[targetOwner], targetInstanceId) : null
      const mode = selected[0]?.value
      if (target && mode === 'return') {
        returnHoodmonToHand(state, definitions, targetOwner, target, 'HDM-049')
        syncPersistentFieldEffects(state, definitions, targetOwner)
      } else if (target && mode === 'lock') {
        const expiry = nextTurnNumberForPlayer(state, targetOwner)
        setTemporaryRestriction(state, target, 'cannotAttack', true, expiry)
        appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} cannot attack during ${targetOwner}'s next turn from Nine Lives.`)
      }
      const remainingMisos = Array.isArray(choice.context?.remainingMisoIds) ? choice.context?.remainingMisoIds as string[] : []
      const stillThere = targetOwner ? findHoodmon(state.players[targetOwner], targetInstanceId) : null
      if (stillThere && remainingMisos.length) return openMisoNineLivesChoice(state, definitions, playerId, targetOwner, stillThere, remainingMisos, choiceContinuations(choice.context))
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM049_SPLASH': {
      const option = selected[0]
      const target = option?.player && option.instanceId ? findHoodmon(state.players[option.player], option.instanceId) : null
      if (target && option.player) {
        target.damageTaken += 200
        appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} took 200 damage from Miso — Paw of Silk.`)
        resolveDefeats(state, definitions)
      }
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM052_BUFF': {
      const option = selected[0]
      const target = option?.instanceId ? findHoodmon(state.players[playerId], option.instanceId) : null
      if (!target || !isDarkOrFairy(definitions[target.definitionId])) throw new Error('The chosen Hoodmon is no longer a legal Silent Claws target.')
      addModifier(state, target, 'HDM-052', 'atk', 200, 'until_end_of_turn')
      addRuntimeAbility(state, target, 'HDM-052', 'draw_on_attack_marked', 1, state.turnNumber)
      appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} gains +200 ATK this turn from Silent Claws.`)
      break
    }
    case 'HDM053_RETURN': {
      const option = selected[0]
      const target = option?.instanceId ? findHoodmon(state.players[playerId], option.instanceId) : null
      if (!target) throw new Error('The chosen Shadow Step return target is no longer in play.')
      const targetDef = definitions[target.definitionId]
      if (!isDarkOrFairy(targetDef) || !targetDef.stageLevel || targetDef.stageLevel > 2) throw new Error('Shadow Step must return a Stage 1 or Stage 2 Dark/Fairy Hoodmon.')
      returnHoodmonToHand(state, definitions, playerId, target, 'HDM-053')
      syncPersistentFieldEffects(state, definitions, playerId)

      if (state.round < 2) {
        appendLog(state, 'Shadow Step cannot perform its optional evolution during Round 1.')
        break
      }
      const player = state.players[playerId]
      const evolveOptions: ChoiceOption[] = []
      for (const fieldCard of ownHoodmon(state, playerId)) {
        if (fieldCard.restrictions.cannotEvolve) continue
        const currentDef = definitions[fieldCard.definitionId]
        if (!currentDef?.stageLevel) continue
        player.hand.forEach((nextId, handIndex) => {
          const nextDef = definitions[nextId]
          if (!nextDef?.stageLevel || nextDef.stageLevel !== currentDef.stageLevel! + 1 || nextDef.evolvesFrom !== currentDef.id) return
          const streetDiscount = (fieldCard.runtimeAbilities ?? []).filter((ability) => ability.kind === 'street_contract' && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber).reduce((sum, ability) => sum + Math.max(0, ability.amount), 0)
          const cost = Math.max(0, (nextDef.bondCost ?? 0) - 1 - streetDiscount)
          if (player.bond < cost) return
          evolveOptions.push({
            id: `shadow-evolve:${fieldCard.instanceId}:${handIndex}:${nextId}`,
            value: `${fieldCard.instanceId}|${handIndex}|${nextId}`,
            label: `${currentDef.name} → ${nextDef.name}`,
            detail: `Immediate evolution · ${cost} Bond after Shadow Step discount${controlsCherry(state, playerId) ? ' · opponent cannot respond' : ''}`,
            cardId: nextId,
            instanceId: fieldCard.instanceId,
            player: playerId,
          })
        })
      }
      if (!evolveOptions.length) {
        appendLog(state, 'Shadow Step has no legal affordable evolution after the return; the optional evolution is skipped.')
        break
      }
      return openChoice(state, {
        player: playerId,
        sourceCardId: 'HDM-053',
        prompt: 'SHADOW STEP — you may immediately evolve 1 Hoodmon from your hand. Its Bond Cost is reduced by 1.',
        minSelections: 0,
        maxSelections: 1,
        options: evolveOptions,
        actionKey: 'HDM053_EVOLVE',
        context: { continuations: choiceContinuations(choice.context) },
      })
    }
    case 'HDM053_EVOLVE': {
      const option = selected[0]
      if (!option?.value) {
        appendLog(state, 'Shadow Step declined its optional evolution.')
        return runContinuations(state, definitions, choiceContinuations(choice.context))
      }
      const [instanceId, _handIndexText, nextDefinitionId] = option.value.split('|')
      const card = findHoodmon(state.players[playerId], instanceId)
      const currentDef = card ? definitions[card.definitionId] : undefined
      const nextDef = definitions[nextDefinitionId]
      if (!card || !currentDef?.stageLevel || !nextDef?.stageLevel || nextDef.stageLevel !== currentDef.stageLevel + 1 || nextDef.evolvesFrom !== currentDef.id) throw new Error('The Shadow Step evolution is no longer legal.')
      const player = state.players[playerId]
      const handIndex = player.hand.indexOf(nextDefinitionId)
      if (handIndex < 0) throw new Error('The chosen evolution card is no longer in hand.')
      const streetContracts = (card.runtimeAbilities ?? []).filter((ability) => ability.kind === 'street_contract' && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber)
      const streetDiscount = streetContracts.reduce((sum, ability) => sum + Math.max(0, ability.amount), 0)
      const cost = Math.max(0, (nextDef.bondCost ?? 0) - 1 - streetDiscount)
      if (player.bond < cost) throw new Error('Not enough Bond for the Shadow Step evolution.')
      player.bond -= cost
      player.hand.splice(handIndex, 1)
      card.evolutionStack.push(card.definitionId)
      card.definitionId = nextDefinitionId
      card.evolvedThisTurn = true
      appendLog(state, `${playerId} evolved ${currentDef.name} into ${nextDef.name} for ${cost} Bond using Shadow Step.`)
      if (streetContracts.length) {
        const consumed = new Set(streetContracts.map((ability) => ability.id))
        card.runtimeAbilities = (card.runtimeAbilities ?? []).filter((ability) => !consumed.has(ability.id))
        for (const _contract of streetContracts) {
          drawOne(state, playerId)
          if ((state.status as GameState['status']) === 'game_over') return state
        }
        appendLog(state, `${playerId} drew ${streetContracts.length} card${streetContracts.length === 1 ? '' : 's'} from Street Contract.`)
      }
      if (controlsCherry(state, playerId)) {
        appendLog(state, 'Cherry Banks suppresses the opponent’s response to the Shadow Step evolution.')
        const result = triggerOnEvolve(state, definitions, playerId, card.instanceId, nextDefinitionId)
        if (result.pendingChoice) {
          mergeChoiceContinuations(result.pendingChoice, choiceContinuations(choice.context))
          return result
        }
        return runContinuations(result, definitions, choiceContinuations(choice.context))
      }
      state.status = 'reaction'
      state.reactionWindow = {
        openedBy: 'evolution',
        nonActivePlayerResponded: false,
        activePlayerResponded: false,
        priority: otherPlayer(playerId),
        pendingEvolution: { player: playerId, instanceId: card.instanceId, definitionId: nextDefinitionId },
        responseStack: [],
        responseCards: [],
      }
      appendLog(state, 'Shadow Step evolution opened a normal Reaction Window.')
      return state
    }
    case 'HDM087_SELECT': {
      const selectedIds = selected.flatMap((option) => option.cardId ? [option.cardId] : [])
      if (!selectedIds.length) {
        drawOne(state, playerId)
        appendLog(state, 'Field Notes Archive recycled no cards and drew 1 card.')
        break
      }
      if (controlsCapin(state, playerId)) {
        return openChoice(state, {
          player: playerId,
          sourceCardId: 'HDM-087',
          prompt: 'CAPIN MDH — you may put 1 of the selected archive cards into your hand instead of returning it to the bottom of your Deck.',
          minSelections: 0,
          maxSelections: 1,
          options: selectedIds.map((cardId, index) => ({
            id: `archive-hand:${index}:${cardId}`,
            value: cardId,
            cardId,
            label: definitions[cardId]?.name ?? cardId,
            detail: 'Put this selected card into your hand instead.',
          })),
          actionKey: 'HDM087_CAPIN',
          context: { selectedCardIds: selectedIds, continuations: choiceContinuations(choice.context) },
        })
      }
      for (const cardId of selectedIds) {
        const index = state.players[playerId].discard.indexOf(cardId)
        if (index >= 0) state.players[playerId].hoodmonDeck.push(state.players[playerId].discard.splice(index, 1)[0])
      }
      appendLog(state, `Field Notes Archive returned ${selectedIds.length} card${selectedIds.length === 1 ? '' : 's'} to the bottom of ${playerId}'s Hoodmon Deck.`)
      drawOne(state, playerId)
      break
    }
    case 'HDM087_CAPIN': {
      const selectedCardIds = Array.isArray(choice.context?.selectedCardIds) ? choice.context?.selectedCardIds as string[] : []
      const handCardId = selected[0]?.value
      for (const cardId of selectedCardIds) {
        const index = state.players[playerId].discard.indexOf(cardId)
        if (index < 0) continue
        const [moved] = state.players[playerId].discard.splice(index, 1)
        if (handCardId === cardId) state.players[playerId].hand.push(moved)
        else state.players[playerId].hoodmonDeck.push(moved)
      }
      appendLog(state, handCardId
        ? `Capin MDH routed ${definitions[handCardId]?.name ?? handCardId} from Field Notes Archive into ${playerId}'s hand; the other selected card went to the bottom of the Deck.`
        : 'Field Notes Archive returned the selected cards to the bottom of the Deck.')
      drawOne(state, playerId)
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM088_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context?.revealedEntries as string[] : []
      const picked = selected[0]?.value
      const continuations = [...choiceContinuations(choice.context)]
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Eyewitness Report revealed ${definitions[cardId]?.name ?? cardId} and put it into ${playerId}'s hand.`)
          continuations.push(`HDM090_OPP_REVEAL|${playerId}|`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-088', choice.sourceInstanceId, remaining, 'HDM088_PICK_BOTTOM', continuations)
    }
    case 'HDM088_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      appendLog(state, `${playerId} put the remaining Eyewitness Report cards on the bottom of the Hoodmon Deck in the chosen order.`)
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM089_SEARCH': {
      const option = selected[0]
      if (!option?.cardId) throw new Error('Hidden Pattern Decode requires a search result.')
      const player = state.players[playerId]
      const index = player.hoodmonDeck.indexOf(option.cardId)
      if (index < 0) throw new Error('The selected Hidden Pattern Decode card is no longer in the Hoodmon Deck.')
      const [cardId] = player.hoodmonDeck.splice(index, 1)
      player.hand.push(cardId)
      player.hoodmonDeck = shuffle(player.hoodmonDeck)
      appendLog(state, `Hidden Pattern Decode revealed ${definitions[cardId]?.name ?? cardId}, added it to ${playerId}'s hand, then shuffled the Hoodmon Deck.`)
      const continuations = [...choiceContinuations(choice.context), `HDM090_OPP_REVEAL|${playerId}|`]
      if (cardId === 'HDM-082') {
        if (!player.hand.length) return runContinuations(state, definitions, continuations)
        return openChoice(state, {
          player: playerId,
          sourceCardId: 'HDM-089',
          prompt: 'MONICAL FOUND — discard 1 card from your hand.',
          minSelections: 1,
          maxSelections: 1,
          options: player.hand.map((handId, handIndex) => indexedCardOption(definitions, 'hand', handId, handIndex)),
          actionKey: 'HDM089_DISCARD',
          context: { continuations },
        })
      }
      return runContinuations(state, definitions, continuations)
    }
    case 'HDM089_DISCARD': {
      const option = selected[0]
      if (option?.cardId) {
        const index = state.players[playerId].hand.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = state.players[playerId].hand.splice(index, 1)
          state.players[playerId].discard.push(cardId)
          appendLog(state, `${playerId} discarded ${definitions[cardId]?.name ?? cardId} because Hidden Pattern Decode added Monical.`)
        }
      }
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM090_PLAY_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context?.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `On Air Tonight put ${definitions[cardId]?.name ?? cardId} into ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-090', choice.sourceInstanceId, remaining, 'HDM090_PLAY_PICK_BOTTOM', choiceContinuations(choice.context))
    }
    case 'HDM090_PLAY_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM090_REVEAL_DISCARD': {
      const option = selected[0]
      if (option?.cardId) {
        const index = state.players[playerId].hand.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = state.players[playerId].hand.splice(index, 1)
          state.players[playerId].discard.push(cardId)
          appendLog(state, `On Air Tonight discarded ${definitions[cardId]?.name ?? cardId} from ${playerId}'s hand.`)
        }
      }
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM086_PAY': {
      const mode = selected[0]?.value
      const controller = String(choice.context?.controller ?? otherPlayer(playerId)) as PlayerId
      if (mode === 'pay') {
        if (state.players[playerId].bond < 1) throw new Error('Not enough Bond to pay Signal Intercept.')
        state.players[playerId].bond -= 1
        appendLog(state, `${playerId} paid 1 Bond to prevent Signal Intercept from negating the activation.`)
      } else if (state.reactionWindow?.pendingEffect) {
        state.reactionWindow.pendingEffect.negated = true
        appendLog(state, `${playerId} did not pay 1 Bond. Signal Intercept negated the activation.`)
      }
      const targetHand = state.players[playerId].hand
      if (targetHand.length) {
        return openChoice(state, {
          player: controller,
          sourceCardId: 'HDM-086',
          prompt: `SIGNAL INTERCEPT — you may reveal 1 random card from ${playerId}'s hand.`,
          minSelections: 0,
          maxSelections: 1,
          options: [{ id: 'reveal-random', value: 'reveal', label: 'REVEAL RANDOM CARD', detail: `Reveal 1 random card from ${playerId}'s hand.` }],
          actionKey: 'HDM086_REVEAL',
          context: { targetPlayer: playerId },
        })
      }
      break
    }
    case 'HDM086_REVEAL': {
      const targetPlayer = String(choice.context?.targetPlayer ?? otherPlayer(playerId)) as PlayerId
      if (selected[0]?.value === 'reveal' && state.players[targetPlayer].hand.length) {
        const hand = state.players[targetPlayer].hand
        const cardId = hand[Math.floor(Math.random() * hand.length)]
        appendLog(state, `Signal Intercept randomly revealed ${definitions[cardId]?.name ?? cardId} from ${targetPlayer}'s hand.`)
        const beforeChoice = state.pendingChoice
        notifyHandCardRevealed39(state, definitions, targetPlayer, cardId)
        const continuations = [`HDM090_OPP_REVEAL|${targetPlayer}|`, ...choiceContinuations(choice.context)]
        if (state.pendingChoice && state.pendingChoice !== beforeChoice) { mergeChoiceContinuations(state.pendingChoice, continuations); return state }
        return runContinuations(state, definitions, continuations)
      }
      appendLog(state, 'Signal Intercept declined the optional random hand reveal.')
      break
    }
    case 'HDM091_BOTTOM': {
      const revealedOwner = String(choice.context?.revealedOwner ?? otherPlayer(playerId)) as PlayerId
      appendEntriesToBottom(state, revealedOwner, selected.flatMap((option) => option.value ? [option.value] : []))
      appendLog(state, `${revealedOwner} put the Expose the Cover-Up cards on the bottom of the Hoodmon Deck in the chosen order.`)
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM092_SEARCH': {
      const option = selected[0]
      if (!option?.cardId) throw new Error("Oracle's Data Stream requires a search result.")
      const player = state.players[playerId]
      const index = player.hoodmonDeck.indexOf(option.cardId)
      if (index < 0) throw new Error("The selected Oracle's Data Stream card is no longer in the Hoodmon Deck.")
      const [cardId] = player.hoodmonDeck.splice(index, 1)
      player.hand.push(cardId)
      player.hoodmonDeck = shuffle(player.hoodmonDeck)
      appendLog(state, `Oracle's Data Stream revealed ${definitions[cardId]?.name ?? cardId}, added it to ${playerId}'s hand, then shuffled the Hoodmon Deck.`)
      if (controlsCapin(state, playerId)) {
        player.bond = Math.min(MAX_BOND, player.bond + 1)
        appendLog(state, "Oracle's Data Stream gained +1 Bond because Capin MDH is controlled.")
      }
      return runContinuations(state, definitions, [...choiceContinuations(choice.context), `HDM090_OPP_REVEAL|${playerId}|`])
    }
    case 'HDM093_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context?.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Status System Leak added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      const continuations = [...(picked ? [`HDM093_OPP_DISCARD|${playerId}|`] : []), ...choiceContinuations(choice.context)]
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-093', choice.sourceInstanceId, remaining, 'HDM093_PICK_BOTTOM', continuations)
    }
    case 'HDM093_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      appendLog(state, `${playerId} put the remaining Status System Leak cards on the bottom of the Hoodmon Deck in the chosen order.`)
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM093_OPP_DISCARD': {
      const option = selected[0]
      if (option?.cardId) {
        const index = state.players[playerId].hand.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = state.players[playerId].hand.splice(index, 1)
          state.players[playerId].discard.push(cardId)
          appendLog(state, `${playerId} discarded ${definitions[cardId]?.name ?? cardId} to Status System Leak.`)
        }
      }
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'HDM054_INTEL': {
      const opponent = String(choice.context?.opponent ?? otherPlayer(playerId)) as PlayerId
      const option = selected[0]
      if (!option?.cardId) break
      const definition = definitions[option.cardId]
      appendLog(state, `${opponent} revealed ${definition?.name ?? option.cardId} to Rooftop Informant.`)
      if (definition && ['magic', 'trap', 'task'].includes(definition.cardType)) {
        const index = state.players[opponent].hand.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = state.players[opponent].hand.splice(index, 1)
          state.players[opponent].hoodmonDeck.push(cardId)
          appendLog(state, `${definitions[cardId]?.name ?? cardId} was placed on the bottom of ${opponent}'s Deck by Intel Snatch.`)
        }
      }
      return runContinuations(state, definitions, [...choiceContinuations(choice.context), `HDM090_OPP_REVEAL|${opponent}|`])
    }
    case 'HDM054_MARK': {
      const option = selected[0]
      if (option?.player && option.instanceId) {
        return openTargetedEffectReaction(state, playerId, 'HDM-054', 'HDM054_MARK', [`${option.player}|${option.instanceId}`], { continuations: choiceContinuations(choice.context) })
      }
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK010_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Puppy Chow Promise added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-010', choice.sourceInstanceId, remaining, 'TASK010_PICK_BOTTOM', choiceContinuations(choice.context))
    }
    case 'TASK010_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK011_HEAL': {
      const option = selected[0]
      if (option?.instanceId) {
        const target = findHoodmon(state.players[playerId], option.instanceId)
        if (target) {
          const healed = Math.min(200, target.damageTaken)
          target.damageTaken -= healed
          appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} healed ${healed} HP from Corner Bowl Offering.`)
        }
      }
      break
    }
    case 'TASK029_HEAL': {
      const option = selected[0]
      if (option?.instanceId) {
        const target = findHoodmon(state.players[playerId], option.instanceId)
        if (target) {
          const healed = Math.min(200, target.damageTaken)
          target.damageTaken -= healed
          appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} healed ${healed} HP from Everybody Eats.`)
        }
      }
      break
    }
    case 'TASK055_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Marked for Midnight added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-055', choice.sourceInstanceId, remaining, 'TASK055_PICK_BOTTOM', choiceContinuations(choice.context))
    }
    case 'TASK055_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK055_MARK': {
      const option = selected[0]
      if (option?.player && option.instanceId) {
        const target = findHoodmon(state.players[option.player], option.instanceId)
        if (target) return applyMarkedStatus(state, definitions, playerId, option.player, target)
      }
      break
    }
    case 'TASK058_SEARCH': {
      const option = selected[0]
      if (!option?.cardId) throw new Error('Dead Drop Message requires a legal search target.')
      const player = state.players[playerId]
      if (option.id.startsWith('taskdeck:')) {
        const index = player.taskDeck.indexOf(option.cardId)
        if (index < 0) throw new Error('The selected Task is no longer in the Task Deck.')
        const [cardId] = player.taskDeck.splice(index, 1)
        player.taskDeck = shuffle(player.taskDeck)
        player.taskDeck.unshift(cardId)
        appendLog(state, `Dead Drop Message moved ${definitions[cardId]?.name ?? cardId} to the top of ${playerId}'s separate Task Deck.`)
      } else {
        const index = player.hoodmonDeck.indexOf(option.cardId)
        if (index < 0) throw new Error('The selected Trap is no longer in the Main Deck.')
        const [cardId] = player.hoodmonDeck.splice(index, 1)
        player.hand.push(cardId)
        player.hoodmonDeck = shuffle(player.hoodmonDeck)
        appendLog(state, `Dead Drop Message added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand, then shuffled the Main Deck.`)
      }
      return runContinuations(state, definitions, [`TASK058_BONUS|${playerId}|`, ...choiceContinuations(choice.context)])
    }
    case 'TASK058_PEEK': {
      appendLog(state, `${playerId} privately viewed the top card of the opponent's Main Deck with Dead Drop Message.`)
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK062_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Data Snatch added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      const continuations = picked ? [`TASK062_REWARD|${playerId}|`, ...choiceContinuations(choice.context)] : choiceContinuations(choice.context)
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-062', choice.sourceInstanceId, remaining, 'TASK062_PICK_BOTTOM', continuations)
    }
    case 'TASK062_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK062_RECYCLE': {
      const option = selected[0]
      if (option?.cardId) {
        const index = state.players[playerId].discard.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = state.players[playerId].discard.splice(index, 1)
          state.players[playerId].hoodmonDeck.push(cardId)
          appendLog(state, `Data Snatch put ${definitions[cardId]?.name ?? cardId} from the Discard on the bottom of the Main Deck.`)
        }
      }
      drawOne(state, playerId)
      if ((state.status as GameState['status']) !== 'game_over') appendLog(state, 'Data Snatch reward drew 1 card.')
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK068_SEARCH': {
      const option = selected[0]
      if (!option?.cardId) throw new Error('Dewdrop Cache requires a legal Water or Nature search target.')
      const player = state.players[playerId]
      const index = player.hoodmonDeck.indexOf(option.cardId)
      if (index < 0) throw new Error('The selected Dewdrop Cache card is no longer in the Main Deck.')
      const [cardId] = player.hoodmonDeck.splice(index, 1)
      player.hand.push(cardId)
      player.hoodmonDeck = shuffle(player.hoodmonDeck)
      player.bond = Math.min(MAX_BOND, player.bond + 1)
      appendLog(state, `Dewdrop Cache added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand and gained 1 Bond.`)
      break
    }
    case 'TASK076_READY': {
      const option = selected[0]
      if (option?.instanceId) {
        const target = findHoodmon(state.players[playerId], option.instanceId)
        if (target && isBasicHoodmon(definitions[target.definitionId])) {
          target.readyState = 'ready'
          setTemporaryRestriction(state, target, 'cannotTask', true)
          appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} readied from Tiny Creatures, Bigger Moves and cannot attempt another Task this turn.`)
        }
      }
      break
    }
    case 'TASK085_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Research, Record, Reveal! added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-085', choice.sourceInstanceId, remaining, 'TASK085_PICK_BOTTOM', choiceContinuations(choice.context))
    }
    case 'TASK085_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK103_PICK': {
      const entries = Array.isArray(choice.context?.revealedEntries) ? choice.context.revealedEntries as string[] : []
      const picked = selected[0]?.value
      if (picked) {
        const cardId = picked.split('|')[1]
        if (cardId) {
          state.players[playerId].hand.push(cardId)
          appendLog(state, `Reserve Roll Call added ${definitions[cardId]?.name ?? cardId} to ${playerId}'s hand.`)
        }
      }
      const remaining = picked ? entries.filter((entry) => entry !== picked) : entries
      return openBottomOrderChoice(state, definitions, playerId, 'HDM-103', choice.sourceInstanceId, remaining, 'TASK103_PICK_BOTTOM', choiceContinuations(choice.context))
    }
    case 'TASK103_PICK_BOTTOM': {
      appendEntriesToBottom(state, playerId, selected.flatMap((option) => option.value ? [option.value] : []))
      return runContinuations(state, definitions, choiceContinuations(choice.context))
    }
    case 'TASK110_DISCARD': {
      const option = selected[0]
      if (option?.cardId) {
        const index = state.players[playerId].hand.indexOf(option.cardId)
        if (index >= 0) {
          const [cardId] = state.players[playerId].hand.splice(index, 1)
          state.players[playerId].discard.push(cardId)
          appendLog(state, `Crash Their Feed discarded ${definitions[cardId]?.name ?? cardId}.`)
        }
      }
      return task110TargetChoice(state, definitions, playerId)
    }
    case 'TASK110_TARGET': {
      const option = selected[0]
      if (option?.player && option.instanceId) {
        const target = findHoodmon(state.players[option.player], option.instanceId)
        if (target) {
          addModifier(state, target, 'HDM-110', 'atk', -200, 'until_end_of_turn')
          appendLog(state, `${definitions[target.definitionId]?.name ?? target.definitionId} gets -200 ATK until end of turn from Crash Their Feed.`)
        }
      }
      break
    }
    case 'HDM094_NATURAL': {
      if (!resolveSupport39Choice(state, definitions, choice, selected)) throw new Error('Natural Bond choice could not resolve.')
      resolveStartOfGame39(state, definitions)
      if (state.pendingChoice) return state
      appendLog(state, `Round 1 begins. ${state.currentPlayerTurn} takes the first turn. Evolution is locked this round.`)
      return enterPhase(state, 'Refresh')
    }
    default:
      if (!resolveSupport39Choice(state, definitions, choice, selected)) throw new Error(`Unknown digital choice resolver: ${choice.actionKey}`)
  }

  if (state.pendingChoice || (state.status as GameState['status']) === 'choice' || (state.status as GameState['status']) === 'reaction' || (state.status as GameState['status']) === 'game_over') return state
  const continued = runContinuations(state, definitions, choiceContinuations(choice.context))
  if (continued.pendingChoice || (continued.status as GameState['status']) === 'choice' || (continued.status as GameState['status']) === 'reaction' || (continued.status as GameState['status']) === 'game_over') return continued
  return finishChoice(continued)
}

export function suggestedChoiceSelections(choice: PendingChoice): string[] {
  if (!choice.options.length) return []
  if (choice.actionKey === 'HDM033_MODE') {
    const charm = choice.options.find((option) => option.value === 'charm')
    return charm ? [charm.id] : [choice.options[0].id]
  }
  const desired = choice.minSelections === 0 ? Math.min(1, choice.maxSelections) : choice.maxSelections
  return choice.options.slice(0, Math.max(choice.minSelections, desired)).map((option) => option.id)
}
