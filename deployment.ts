import { appendLog } from "./helpers";
import { afterCardPlayed, attachContinuations, triggerOnDeploy } from "./cardEffects";
import { support39CardCostDiscount } from "./support39";
import type { CardDefinition, CardInstance, GameState, PlayerId, Position } from "./types";

function makeInstance(definitionId: string, owner: PlayerId, position: Position, serial: string): CardInstance {
  return {
    instanceId: `${owner}-${serial}-${definitionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

export function deployBasic(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  definitionId: string,
  requestedPosition?: "active" | "reserve_1" | "reserve_2" | "reserve_3",
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a deployment right now.");
  if (state.currentPhase !== "Main") throw new Error("Basic Hoodmon are normally deployed during Main Phase.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");

  const player = state.players[playerId];
  if (player.normalDeployUsed) throw new Error("You have already used your normal Basic deployment this turn.");
  const handIndex = player.hand.indexOf(definitionId);
  if (handIndex < 0) throw new Error("That Hoodmon is not in your hand.");

  const definition = definitions[definitionId];
  if (!definition || definition.cardType !== "hoodmon" || definition.stageLevel !== 1) {
    throw new Error("Only a Basic (Stage 1) Hoodmon can be normally deployed.");
  }

  const printedCost = definition.bondCost ?? 0;
  const supportDiscount = support39CardCostDiscount(state, definitions, playerId, definitionId, false);
  const cost = Math.max(0, printedCost - supportDiscount);
  if (player.bond < cost) throw new Error("Not enough Bond to deploy that Hoodmon.");

  let position: Position;
  let reserveIndex = -1;
  if (!player.activeHoodmon) {
    if (requestedPosition && requestedPosition !== "active") {
      throw new Error("With no Active Hoodmon, normal deployment must fill the Active zone first.");
    }
    position = "active";
  } else {
    if (requestedPosition === "active") throw new Error("The Active zone is already occupied.");
    if (requestedPosition?.startsWith("reserve_")) {
      reserveIndex = Number(requestedPosition.split("_")[1]) - 1;
      if (reserveIndex < 0 || reserveIndex > 2) throw new Error("Invalid Reserve slot.");
      if (player.reserves[reserveIndex]) throw new Error(`Reserve ${reserveIndex + 1} is occupied.`);
    } else {
      reserveIndex = player.reserves.findIndex((card) => !card);
      if (reserveIndex < 0) throw new Error("All three Reserve slots are occupied.");
    }
    position = `reserve_${reserveIndex + 1}` as Position;
  }

  player.bond -= cost;
  if (supportDiscount) support39CardCostDiscount(state, definitions, playerId, definitionId, true);
  player.hand.splice(handIndex, 1);
  const instance = makeInstance(definitionId, playerId, position, "DEPLOY");
  if (position === "active") player.activeHoodmon = instance;
  else player.reserves[reserveIndex] = instance;
  player.normalDeployUsed = true;
  appendLog(state, `${playerId} deployed ${definition.name} for ${cost} Bond${supportDiscount ? ` (${supportDiscount} support discount)` : ""}.`);
  const resolved = afterCardPlayed(triggerOnDeploy(state, definitions, playerId, instance.instanceId), definitions, playerId, definitionId);
  return attachContinuations(resolved, definitions, [`SUP39_DEPLOY|${playerId}|${instance.instanceId}`]);
}
