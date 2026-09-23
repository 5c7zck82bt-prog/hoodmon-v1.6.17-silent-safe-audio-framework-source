import { appendLog, findHoodmon, otherPlayer } from "./helpers";
import { drawOne } from "./fsm";
import { support39EvolutionDiscount } from "./support39";
import type { CardDefinition, GameState, PlayerId } from "./types";

export function evolveHoodmon(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  instanceId: string,
  nextDefinitionId: string,
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a new action.");
  if (state.currentPhase !== "Main") throw new Error("Evolution is only legal in Main Phase.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");
  if (state.round < 2) throw new Error("Evolution is locked during Round 1.");

  const card = findHoodmon(state.players[playerId], instanceId);
  if (!card) throw new Error("Hoodmon not found.");
  if (card.restrictions.cannotEvolve) throw new Error("A card effect prevents this Hoodmon from evolving.");

  const currentDef = definitions[card.definitionId];
  const nextDef = definitions[nextDefinitionId];
  if (!currentDef || !nextDef) throw new Error("Evolution definition missing.");
  if (!currentDef.stageLevel || !nextDef.stageLevel) throw new Error("Evolution stages are missing.");
  if (nextDef.stageLevel !== currentDef.stageLevel + 1) throw new Error("Evolution must advance exactly one Stage.");
  if (nextDef.stageLevel > 4) throw new Error("Stage exceeds Transcended (Stage 4).");
  if (nextDef.evolvesFrom !== currentDef.id) throw new Error("The selected card does not evolve from this Hoodmon.");

  const player = state.players[playerId];
  const handIndex = player.hand.indexOf(nextDefinitionId);
  if (handIndex < 0) throw new Error(`${nextDef.name} must be in your hand to evolve into it.`);

  const streetContracts = (card.runtimeAbilities ?? []).filter((ability) =>
    ability.kind === "street_contract" && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber,
  );
  const streetDiscount = streetContracts.reduce((sum, ability) => sum + Math.max(0, ability.amount), 0);
  const supportDiscount = support39EvolutionDiscount(state, definitions, playerId, nextDefinitionId, false);
  const discount = streetDiscount + supportDiscount;
  const printedCost = nextDef.bondCost ?? 0;
  const cost = Math.max(0, printedCost - discount);
  if (player.bond < cost) throw new Error("Not enough Bond.");
  player.bond -= cost;
  if (supportDiscount) support39EvolutionDiscount(state, definitions, playerId, nextDefinitionId, true);
  player.hand.splice(handIndex, 1);

  card.evolutionStack.push(card.definitionId);
  card.definitionId = nextDefinitionId;
  card.evolvedThisTurn = true;
  // Damage and runtime restrictions persist through evolution unless card text specifically changes them.
  appendLog(state, `${playerId} evolved ${currentDef.name} into ${nextDef.name} for ${cost} Bond${discount ? ` (${discount} Street Contract discount)` : ''}. Damage remains on the stack.`);

  if (streetContracts.length) {
    const consumed = new Set(streetContracts.map((ability) => ability.id));
    card.runtimeAbilities = (card.runtimeAbilities ?? []).filter((ability) => !consumed.has(ability.id));
    for (const _contract of streetContracts) {
      drawOne(state, playerId);
      if ((state.status as GameState["status"]) === "game_over") return state;
    }
    appendLog(state, `${playerId} drew ${streetContracts.length} card${streetContracts.length === 1 ? '' : 's'} from Street Contract.`);
  }

  // The current standard opens a reaction opportunity after evolution. The evolution itself has already resolved;
  // reactions here answer Evolve/Awaken timing and related legal Quick/Trap responses.
  state.status = "reaction";
  state.reactionWindow = {
    openedBy: "evolution",
    nonActivePlayerResponded: false,
    activePlayerResponded: false,
    priority: otherPlayer(playerId),
    pendingEvolution: { player: playerId, instanceId: card.instanceId, definitionId: nextDefinitionId },
    responseStack: [],
    responseCards: [],
  };
  return state;
}
