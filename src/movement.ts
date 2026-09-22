import { appendLog, findHoodmon } from "./helpers";
import type { CardDefinition, GameState, PlayerId } from "./types";
import { markHoodmonSwitched39, markReserveToActive39, syncSupport39PersistentFields } from "./support39";

export function moveActiveToReserve(state: GameState, playerId: PlayerId, reserveIndex: 0 | 1 | 2, definitions?: Record<string, CardDefinition>): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting movement right now.");
  if (state.currentPhase !== "Main") throw new Error("Hoodmon movement is only legal in Main Phase.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");

  const player = state.players[playerId];
  const active = player.activeHoodmon;
  if (!active) throw new Error("No Active Hoodmon to move.");
  if (active.restrictions.cannotRetreat) throw new Error("A card effect prevents this Hoodmon from retreating.");
  if (player.reserves[reserveIndex]) throw new Error("Reserve slot is occupied.");

  player.activeHoodmon = null;
  active.position = (`reserve_${reserveIndex + 1}`) as "reserve_1" | "reserve_2" | "reserve_3";
  player.reserves[reserveIndex] = active;
  appendLog(state, `${playerId} moved ${active.instanceId} to Reserve ${reserveIndex + 1}.`);
  if (definitions) {
    markHoodmonSwitched39(state, active);
    syncSupport39PersistentFields(state, definitions, playerId);
  }
  return state;
}

export function switchActiveWithReserve(state: GameState, playerId: PlayerId, reserveIndex: 0 | 1 | 2, definitions?: Record<string, CardDefinition>): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting movement right now.");
  if (state.currentPhase !== "Main") throw new Error("Switching Hoodmon is only legal in Main Phase.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");

  const player = state.players[playerId];
  const active = player.activeHoodmon;
  const reserve = player.reserves[reserveIndex];
  if (!active) throw new Error("No Active Hoodmon to switch.");
  if (!reserve) throw new Error("That Reserve slot is empty.");
  if (active.restrictions.cannotRetreat) throw new Error("A card effect prevents this Hoodmon from retreating.");

  active.position = (`reserve_${reserveIndex + 1}`) as "reserve_1" | "reserve_2" | "reserve_3";
  reserve.position = "active";
  player.activeHoodmon = reserve;
  player.reserves[reserveIndex] = active;
  appendLog(state, `${playerId} switched Active Hoodmon with Reserve ${reserveIndex + 1}.`);
  if (definitions) {
    markHoodmonSwitched39(state, active);
    markReserveToActive39(state, definitions, playerId, reserve);
  }
  return state;
}

export function promoteReserveToActive(state: GameState, playerId: PlayerId, reserveIndex: 0 | 1 | 2, definitions?: Record<string, CardDefinition>): GameState {
  if (state.status !== "awaiting_promotion") throw new Error("No promotion is currently required.");
  if (state.pendingPromotion !== playerId) throw new Error("That player is not choosing a promotion.");

  const player = state.players[playerId];
  if (player.activeHoodmon) throw new Error("An Active Hoodmon is already in play.");
  const reserve = player.reserves[reserveIndex];
  if (!reserve) throw new Error("That Reserve slot is empty.");

  reserve.position = "active";
  player.activeHoodmon = reserve;
  player.reserves[reserveIndex] = null;
  state.pendingPromotion = null;
  state.status = "active";
  appendLog(state, `${playerId} promoted Reserve ${reserveIndex + 1} to Active.`);
  if (definitions) markReserveToActive39(state, definitions, playerId, reserve);
  return state;
}

export function leavePlayToDiscard(state: GameState, playerId: PlayerId, instanceId: string): GameState {
  const player = state.players[playerId];
  const card = findHoodmon(player, instanceId);
  if (!card) throw new Error("Hoodmon not found.");

  if (player.activeHoodmon?.instanceId === instanceId) player.activeHoodmon = null;
  player.reserves = player.reserves.map((c) => c?.instanceId === instanceId ? null : c) as typeof player.reserves;

  card.position = "discard";
  card.restrictions = {};
  card.statuses = [];
  card.statusExpiresOnTurn = {};
  player.discard.push(...card.evolutionStack, card.definitionId);
  card.evolutionStack = [];
  return state;
}
