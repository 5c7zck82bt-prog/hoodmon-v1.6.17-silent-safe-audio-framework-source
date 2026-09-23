import { COMPLETED_TASKS_TO_WIN } from "./constants";
import type { GameState, PlayerId, WinnerState } from "./types";
import { otherPlayer } from "./helpers";

function playerMeetsWin(state: GameState, player: PlayerId): WinnerState | null {
  const opponent = otherPlayer(player);
  if (state.players[opponent].lp <= 0) return { player, reason: "knockout" };
  if (state.players[player].completedTasks >= COMPLETED_TASKS_TO_WIN) return { player, reason: "tasks" };
  return null;
}

export function checkWinConditions(state: GameState): WinnerState | null {
  const p1 = playerMeetsWin(state, "P1");
  const p2 = playerMeetsWin(state, "P2");

  if (p1 && p2) {
    // If one resolving effect satisfies both players' win conditions, compare progress first,
    // then remaining LP. If still tied, play continues until the next decisive result.
    if (state.players.P1.completedTasks !== state.players.P2.completedTasks) {
      return state.players.P1.completedTasks > state.players.P2.completedTasks ? p1 : p2;
    }
    if (state.players.P1.lp !== state.players.P2.lp) {
      return state.players.P1.lp > state.players.P2.lp ? p1 : p2;
    }
    return null;
  }

  return p1 ?? p2 ?? null;
}

export function haltIfWinner(state: GameState): GameState {
  // Once a resolving action has produced a winner (including required-draw deck-out),
  // later cleanup checks in the same action must not replace that result.
  if (state.winner || state.status === "game_over") return state;
  const winner = checkWinConditions(state);
  if (winner) {
    state.winner = winner;
    state.status = "game_over";
    state.reactionWindow = null;
  }
  return state;
}
