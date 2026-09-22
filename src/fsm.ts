import { MAX_BOND, PHASES } from "./constants";
import { appendLog, allHoodmon, expireStatusesAtEndOfTurn, expireTemporaryRuntimeEffectsAtEndOfTurn, otherPlayer } from "./helpers";
import type { GameState, Phase, PlayerId } from "./types";
import { haltIfWinner } from "./win";
import { notifyTopCardChanged39 } from "./support39";

function nextPhase(phase: Phase): Phase {
  const i = PHASES.indexOf(phase);
  return PHASES[(i + 1) % PHASES.length];
}

function refreshPlayer(state: GameState, playerId: PlayerId): void {
  const p = state.players[playerId];
  p.normalDeployUsed = false;
  for (const card of allHoodmon(p)) {
    card.readyState = "ready";
    card.commandsUsedThisTurn = 0;
    card.evolvedThisTurn = false;
    card.modifiers = card.modifiers.filter((m) => m.duration !== "until_end_of_turn" && (m.expiresOnTurn ?? Infinity) > state.turnNumber);
  }
  if (p.tamer) p.tamer.readyState = "ready";
}

export function drawOne(state: GameState, playerId: PlayerId): void {
  const p = state.players[playerId];
  if (p.hoodmonDeck.length === 0) {
    const winner = otherPlayer(playerId);
    appendLog(state, `${playerId} was required to draw from an empty Hoodmon Deck. ${winner} wins by deck-out.`);
    state.winner = { player: winner, reason: "deckout" };
    state.status = "game_over";
    state.reactionWindow = null;
    return;
  }
  const card = p.hoodmonDeck.shift()!;
  p.hand.push(card);
  appendLog(state, `${playerId} drew 1 card.`);
  notifyTopCardChanged39(state, playerId);
}

function refillTaskZoneIfEmpty(state: GameState, playerId: PlayerId): void {
  const p = state.players[playerId];
  if (p.taskZone.some(Boolean)) return;
  if (p.taskDeck.length === 0) return;
  const openSlot = p.taskZone.findIndex((slot) => !slot);
  if (openSlot < 0) return;
  const task = p.taskDeck.shift()!;
  p.taskZone[openSlot] = task;
  appendLog(state, `${playerId} revealed a new face-up Task.`);
}

export function enterPhase(state: GameState, phase: Phase): GameState {
  if (state.status === "game_over") return state;
  state.currentPhase = phase;
  const id = state.currentPlayerTurn;

  switch (phase) {
    case "Refresh":
      refreshPlayer(state, id);
      break;
    case "Draw":
      drawOne(state, id);
      break;
    case "Bond":
      state.players[id].bond = Math.min(MAX_BOND, state.players[id].bond + 1);
      appendLog(state, `${id} gained +1 Bond (${state.players[id].bond}/${MAX_BOND}).`);
      break;
    case "Main":
    case "Command":
      break;
    case "End":
      // A face-up Task may originate from either player's Task Deck and can be completed by either player.
      // Refill each source zone that has become completely empty after the current action sequence.
      refillTaskZoneIfEmpty(state, "P1");
      refillTaskZoneIfEmpty(state, "P2");
      expireStatusesAtEndOfTurn(state, id);
      expireTemporaryRuntimeEffectsAtEndOfTurn(state);
      break;
  }

  appendLog(state, `${id} entered ${phase} Phase.`);
  return haltIfWinner(state);
}

export function advancePhase(state: GameState): GameState {
  if (state.status !== "active") throw new Error("Cannot advance phase while the engine is paused for reactions, promotion, or game over.");

  if (state.currentPhase !== "End") {
    return enterPhase(state, nextPhase(state.currentPhase));
  }

  const outgoing = state.currentPlayerTurn;
  const incoming = otherPlayer(outgoing);
  state.currentPlayerTurn = incoming;
  state.turnNumber += 1;
  // A round contains two turns: one turn for each player.
  state.round = Math.floor((state.turnNumber - 1) / 2) + 1;

  if (state.localFaceToFaceMode) {
    state.viewportOwner = incoming;
    state.needsPassInterstitial = true;
  } else {
    state.viewportOwner = incoming;
  }

  return enterPhase(state, "Refresh");
}

export function acknowledgePassInterstitial(state: GameState): GameState {
  state.needsPassInterstitial = false;
  return state;
}
