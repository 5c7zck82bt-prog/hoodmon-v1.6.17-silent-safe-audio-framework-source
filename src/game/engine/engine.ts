import {
  MAIN_DECK_SIZE,
  OPENING_HAND_SIZE,
  STANDARD_STARTING_BOND,
  STANDARD_STARTING_LP,
  TASK_DECK_SIZE,
} from "./constants";
import { applyEffect } from "./effects";
import { advancePhase, acknowledgePassInterstitial, enterPhase } from "./fsm";
import type { CardDefinition, CardInstance, EngineEffect, GameSetup, GameState, PlayerId, PlayerState, Position } from "./types";
import { declareAttack, addReaction, passReaction, resolveReactionWindow } from "./combat";
import { evolveHoodmon } from "./evolution";
import { declareTask } from "./tasks";
import { leavePlayToDiscard, promoteReserveToActive } from "./movement";
import { deployBasic } from "./deployment";
import { playSupportCard, type SupportTarget } from "./support";
import { haltIfWinner } from "./win";
import { appendLog } from "./helpers";
import { activateReactionCard } from "./reactions";
import { activateTamerEffect, resolvePendingChoice } from "./cardEffects";
import { resolveStartOfGame39 } from "./support39";

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeInstance(definitionId: string, owner: PlayerId, position: Position, serial: string): CardInstance {
  return {
    instanceId: `${owner}-${serial}-${definitionId}-${Math.random().toString(36).slice(2, 9)}`,
    definitionId,
    owner,
    controller: owner,
    readyState: "ready",
    position,
    damageTaken: 0,
    commandsUsedThisTurn: 0,
    evolutionStack: [],
    restrictions: {},
    restrictionExpiresOnTurn: {},
    modifiers: [],
    runtimeAbilities: [],
    statuses: [],
    statusExpiresOnTurn: {},
  };
}

function isBasic(definitions: Record<string, CardDefinition>, id: string): boolean {
  const definition = definitions[id];
  return Boolean(definition && definition.cardType === "hoodmon" && definition.stageLevel === 1);
}

function drawOpeningHandWithMulligan(
  deck: string[],
  definitions: Record<string, CardDefinition>,
): { deck: string[]; hand: string[]; mulligans: number } {
  let workingDeck = [...deck];
  let mulligans = 0;

  // Practice/digital setup: repeatedly reshuffle a no-Basic opener, matching the current no-Basic mulligan rule.
  while (mulligans < 25) {
    const hand = workingDeck.slice(0, OPENING_HAND_SIZE);
    if (hand.some((id) => isBasic(definitions, id))) {
      return { deck: workingDeck.slice(OPENING_HAND_SIZE), hand, mulligans };
    }
    workingDeck = shuffled(workingDeck);
    mulligans += 1;
  }

  throw new Error("This deck could not produce a Basic Hoodmon in the opening hand. Add more Basic Hoodmon.");
}

function makePlayer(
  id: PlayerId,
  deck: string[],
  taskDeck: string[],
  definitions: Record<string, CardDefinition>,
  tamerId: string | undefined,
  shouldShuffle: boolean,
): PlayerState {
  if (deck.length !== MAIN_DECK_SIZE) throw new Error(`Each player must bring exactly ${MAIN_DECK_SIZE} cards in the Hoodmon Deck.`);
  if (taskDeck.length !== TASK_DECK_SIZE) throw new Error(`Each player must bring exactly ${TASK_DECK_SIZE} Task cards.`);

  const preparedDeck = shouldShuffle ? shuffled(deck) : [...deck];
  const opening = drawOpeningHandWithMulligan(preparedDeck, definitions);
  const preparedTasks = shouldShuffle ? shuffled(taskDeck) : [...taskDeck];

  return {
    id,
    lp: STANDARD_STARTING_LP,
    maxLp: STANDARD_STARTING_LP,
    bond: STANDARD_STARTING_BOND,
    completedTasks: 0,
    hoodmonDeck: opening.deck,
    hand: opening.hand,
    discard: [],
    banished: [],
    tamer: tamerId ? makeInstance(tamerId, id, "tamer", "TAMER") : null,
    activeHoodmon: null,
    reserves: [null, null, null],
    magic: [null, null, null],
    traps: [null, null],
    field: null,
    taskDeck: preparedTasks,
    taskZone: [null, null, null],
    resolvedTasks: [],
    normalDeployUsed: false,
  };
}

function placeStartingHoodmon(state: GameState, definitions: Record<string, CardDefinition>, playerId: PlayerId): void {
  const player = state.players[playerId];
  const firstBasicIndex = player.hand.findIndex((id) => isBasic(definitions, id));
  if (firstBasicIndex < 0) throw new Error(`${playerId} has no Basic Hoodmon available after mulligan.`);

  const [activeId] = player.hand.splice(firstBasicIndex, 1);
  player.activeHoodmon = makeInstance(activeId, playerId, "active", "START-ACTIVE");
  appendLog(state, `${playerId} placed ${definitions[activeId]?.name ?? activeId} as the free starting Active Hoodmon.`);

  const reserveBasicIndex = player.hand.findIndex((id) => isBasic(definitions, id));
  if (reserveBasicIndex >= 0) {
    const [reserveId] = player.hand.splice(reserveBasicIndex, 1);
    player.reserves[0] = makeInstance(reserveId, playerId, "reserve_1", "START-RESERVE");
    appendLog(state, `${playerId} placed ${definitions[reserveId]?.name ?? reserveId} as the optional free starting Reserve.`);
  }
}

export function createGame(setup: GameSetup, definitions: Record<string, CardDefinition>): GameState {
  const shouldShuffle = setup.shuffleDecks !== false;
  const firstPlayer: PlayerId = setup.firstPlayer ?? (Math.random() < 0.5 ? "P1" : "P2");
  const state: GameState = {
    status: "setup",
    currentPlayerTurn: firstPlayer,
    currentPhase: "Refresh",
    round: 1,
    turnNumber: 1,
    players: {
      P1: makePlayer("P1", setup.p1Deck, setup.p1TaskDeck, definitions, setup.p1TamerId, shouldShuffle),
      P2: makePlayer("P2", setup.p2Deck, setup.p2TaskDeck, definitions, setup.p2TamerId, shouldShuffle),
    },
    reactionWindow: null,
    pendingAttackSetup: null,
    pendingChoice: null,
    taskProgress: { P1: {}, P2: {} },
    pendingPromotion: null,
    winner: null,
    localFaceToFaceMode: setup.localFaceToFaceMode ?? false,
    viewportOwner: firstPlayer,
    needsPassInterstitial: false,
    eventLog: [],
    setupPending: ["P1"],
  };

  placeStartingHoodmon(state, definitions, "P2");

  state.players.P1.taskZone[0] = state.players.P1.taskDeck.shift() ?? null;
  state.players.P2.taskZone[0] = state.players.P2.taskDeck.shift() ?? null;
  appendLog(state, `Opening setup: P1 must choose a Basic Active Hoodmon and may choose one Basic Reserve. ${firstPlayer} will take the first turn.`);
  return state;
}

export function chooseStartingHoodmon(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  activeDefinitionId: string,
  reserveDefinitionId?: string,
): GameState {
  if (state.status !== "setup" || !state.setupPending.includes(playerId)) throw new Error("Starting Hoodmon selection is not pending for that player.");
  const player = state.players[playerId];
  if (!isBasic(definitions, activeDefinitionId)) throw new Error("Starting Active must be a Basic Hoodmon.");
  const activeIndex = player.hand.indexOf(activeDefinitionId);
  if (activeIndex < 0) throw new Error("That Active Hoodmon is not in your opening hand.");
  player.hand.splice(activeIndex, 1);
  player.activeHoodmon = makeInstance(activeDefinitionId, playerId, "active", "START-ACTIVE");
  appendLog(state, `${playerId} chose ${definitions[activeDefinitionId]?.name ?? activeDefinitionId} as the starting Active Hoodmon.`);
  if (reserveDefinitionId) {
    if (!isBasic(definitions, reserveDefinitionId)) throw new Error("Starting Reserve must be a Basic Hoodmon.");
    const reserveIndex = player.hand.indexOf(reserveDefinitionId);
    if (reserveIndex < 0) throw new Error("That Reserve Hoodmon is not in your opening hand.");
    player.hand.splice(reserveIndex, 1);
    player.reserves[0] = makeInstance(reserveDefinitionId, playerId, "reserve_1", "START-RESERVE");
    appendLog(state, `${playerId} chose ${definitions[reserveDefinitionId]?.name ?? reserveDefinitionId} as the optional starting Reserve.`);
  }
  state.setupPending = state.setupPending.filter((id) => id !== playerId);
  if (state.setupPending.length === 0) {
    state.status = "active";
    resolveStartOfGame39(state, definitions);
    if (state.pendingChoice) return state;
    appendLog(state, `Round 1 begins. ${state.currentPlayerTurn} takes the first turn. Evolution is locked this round.`);
    return enterPhase(state, "Refresh");
  }
  return state;
}

export class HoodmonEngine {
  public state: GameState;
  constructor(public readonly definitions: Record<string, CardDefinition>, setup: GameSetup) {
    this.state = createGame(setup, definitions);
  }

  advancePhase() { this.state = advancePhase(this.state); return this.state; }
  acknowledgePass() { this.state = acknowledgePassInterstitial(this.state); return this.state; }
  attack(index: number) { this.state = declareAttack(this.state, this.definitions, index); return this.state; }
  react(player: PlayerId, effects: EngineEffect[]) { this.state = addReaction(this.state, player, effects); return this.state; }
  passReaction(player: PlayerId) { this.state = passReaction(this.state, player); return this.state; }
  playReaction(player: PlayerId, definitionId: string) { this.state = activateReactionCard(this.state, this.definitions, player, definitionId); return this.state; }
  resolveReaction() { this.state = resolveReactionWindow(this.state, this.definitions); return this.state; }
  resolveChoice(player: PlayerId, selectedOptionIds: string[]) { this.state = resolvePendingChoice(this.state, this.definitions, player, selectedOptionIds); return this.state; }
  activateTamer(player: PlayerId) { this.state = activateTamerEffect(this.state, this.definitions, player); return this.state; }
  deploy(player: PlayerId, definitionId: string, target?: "active" | "reserve_1" | "reserve_2" | "reserve_3") {
    this.state = deployBasic(this.state, this.definitions, player, definitionId, target); return this.state;
  }
  playSupport(player: PlayerId, definitionId: string, target: SupportTarget) {
    this.state = playSupportCard(this.state, this.definitions, player, definitionId, target); return this.state;
  }
  evolve(player: PlayerId, instanceId: string, nextDefinitionId: string) {
    this.state = evolveHoodmon(this.state, this.definitions, player, instanceId, nextDefinitionId); return haltIfWinner(this.state);
  }
  task(
    player: PlayerId,
    instanceId: string,
    taskOwner: PlayerId,
    slot: 0|1|2,
    bonus = 0,
    rewards: EngineEffect[] = [],
    failures: EngineEffect[] = [],
  ) {
    this.state = declareTask(this.state, this.definitions, player, instanceId, taskOwner, slot, bonus, rewards, failures); return haltIfWinner(this.state);
  }
  effect(effect: EngineEffect) { this.state = applyEffect(this.state, effect, this.definitions); return this.state; }
  chooseStarting(player: PlayerId, activeDefinitionId: string, reserveDefinitionId?: string) { this.state = chooseStartingHoodmon(this.state, this.definitions, player, activeDefinitionId, reserveDefinitionId); return this.state; }
  promote(player: PlayerId, reserveIndex: 0|1|2) { this.state = promoteReserveToActive(this.state, player, reserveIndex, this.definitions); return this.state; }
  discardHoodmon(player: PlayerId, instanceId: string) { this.state = leavePlayToDiscard(this.state, player, instanceId); return this.state; }
}
