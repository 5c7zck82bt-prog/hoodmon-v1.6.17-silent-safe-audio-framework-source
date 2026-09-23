import { MAX_BOND } from "./constants";
import { appendLog, findHoodmon, setStatus } from "./helpers";
import type { CardDefinition, EngineEffect, GameState } from "./types";
import { resolveDefeats } from "./defeat";
import { haltIfWinner } from "./win";
import { drawOne } from "./fsm";
import { applyCharmedStatus } from "./cardEffects";

export function applyEffect(state: GameState, effect: EngineEffect, definitions?: Record<string, CardDefinition>): GameState {
  if (state.status === "game_over") return state;
  const player = state.players[effect.player];

  switch (effect.type) {
    case "draw":
      for (let i = 0; i < Math.max(0, Math.floor(effect.amount)); i += 1) {
        drawOne(state, effect.player);
        if ((state.status as string) === "game_over") break;
      }
      break;
    case "damage_lp":
      player.lp = Math.max(0, player.lp - Math.max(0, effect.amount));
      appendLog(state, `${effect.player} takes ${effect.amount} LP damage.`);
      break;
    case "damage_hoodmon": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      card.damageTaken += Math.max(0, effect.amount);
      appendLog(state, `${effect.instanceId} takes ${effect.amount} damage.`);
      break;
    }
    case "exhaust": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      if (!card.restrictions.cannotBeExhaustedByEffects) card.readyState = "exhausted";
      else appendLog(state, `${effect.instanceId} cannot be Exhausted by card effects this turn.`);
      break;
    }
    case "ready": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      card.readyState = "ready";
      break;
    }
    case "gain_bond":
      player.bond = Math.min(MAX_BOND, Math.max(0, player.bond + effect.amount));
      break;
    case "restrict": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      card.restrictions[effect.restriction] = effect.value;
      break;
    }
    case "set_status": {
      const card = findHoodmon(player, effect.instanceId);
      if (!card) throw new Error(`Hoodmon ${effect.instanceId} not found.`);
      let expiresOnTurn = effect.expiresOnTurn;
      if (effect.value && effect.status === "marked" && expiresOnTurn === undefined) {
        // Default Marked duration: through the next End Phase controlled by that Hoodmon's controller.
        // If marked on its controller's current turn, that means the current turn; otherwise the upcoming turn.
        expiresOnTurn = card.controller === state.currentPlayerTurn ? state.turnNumber : state.turnNumber + 1;
      }
      if (effect.status === "charmed" && effect.value && definitions) {
        applyCharmedStatus(state, definitions, effect.player, card);
      } else {
        setStatus(card, effect.status, effect.value, expiresOnTurn);
      }
      const statusLabel = effect.status === "charmed" ? "Charmed" : effect.status === "marked" ? "Marked" : effect.status;
      if (!(effect.status === "charmed" && effect.value && definitions)) appendLog(state, `${effect.instanceId} ${effect.value ? "became" : "is no longer"} ${statusLabel}.`);
      break;
    }
  }

  if (definitions) { resolveDefeats(state, definitions); if (state.pendingPromotion && state.status !== "reaction") state.status = "awaiting_promotion"; }
  return haltIfWinner(state);
}

export function applyEffects(state: GameState, effects: EngineEffect[], definitions?: Record<string, CardDefinition>): GameState {
  for (const effect of effects) {
    applyEffect(state, effect, definitions);
    if ((state.status as string) === "game_over") break;
  }
  return state;
}
