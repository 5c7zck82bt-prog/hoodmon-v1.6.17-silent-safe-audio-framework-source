import { applyEffects } from "./effects";
import { COMPLETED_TASKS_TO_WIN } from "./constants";
import { appendLog, effectiveTask, findHoodmon, otherPlayer } from "./helpers";
import type { CardDefinition, CardInstance, EngineEffect, GameState, PendingTask, PlayerId } from "./types";
import { haltIfWinner } from "./win";
import { attachContinuations, openWalkHimDownReward, resolveCompletedTaskEffect } from "./cardEffects";

function alignment(definition: CardDefinition | undefined, wanted: string): boolean {
  return Boolean(definition?.alignment?.includes(wanted));
}

function trait(definition: CardDefinition | undefined, wanted: string): boolean {
  return Boolean(definition?.archetypeTags?.includes(wanted));
}

function controlledHoodmon(state: GameState, playerId: PlayerId): CardInstance[] {
  return [state.players[playerId].activeHoodmon, ...state.players[playerId].reserves].filter((card): card is CardInstance => Boolean(card));
}

function walkHimDownCondition(state: GameState, definitions: Record<string, CardDefinition>, playerId: PlayerId): boolean {
  const hoodmon = controlledHoodmon(state, playerId);
  const beasts = hoodmon.filter((card) => alignment(definitions[card.definitionId], "Beast"));
  if (beasts.length >= 2) return true;
  return hoodmon.some((beast) => alignment(definitions[beast.definitionId], "Beast") && hoodmon.some((dark) =>
    dark.instanceId !== beast.instanceId && alignment(definitions[dark.definitionId], "Dark"),
  ));
}

function checkOnBlockCondition(state: GameState, definitions: Record<string, CardDefinition>, playerId: PlayerId): boolean {
  const hoodmon = controlledHoodmon(state, playerId);
  const qualifying = hoodmon.filter((card) => alignment(definitions[card.definitionId], "Beast") || trait(definitions[card.definitionId], "Bird"));
  if (!qualifying.length) return false;
  return qualifying.some((card) => state.players[playerId].reserves.some((reserve) => reserve && reserve.instanceId !== card.instanceId));
}

const SPECIES_TRAITS = ["Bird", "Pit Bull", "Feline", "Reptile", "Beast"];
function speciesOf(definition: CardDefinition | undefined): string | null {
  if (!definition) return null;
  return SPECIES_TRAITS.find((name) => definition.archetypeTags?.includes(name)) ?? null;
}

function everybodyEatsCondition(state: GameState, definitions: Record<string, CardDefinition>, playerId: PlayerId): boolean {
  const hoodmon = controlledHoodmon(state, playerId);
  for (let i = 0; i < hoodmon.length; i += 1) {
    const a = speciesOf(definitions[hoodmon[i].definitionId]);
    if (!a) continue;
    for (let j = i + 1; j < hoodmon.length; j += 1) {
      const b = speciesOf(definitions[hoodmon[j].definitionId]);
      if (b && a !== b) return true;
    }
  }
  return false;
}

function crashTheirFeedReady(state: GameState, playerId: PlayerId): boolean {
  return (state.taskProgress[playerId]?.["HDM-110"] ?? 0) >= 2;
}

export function taskCanBeAttempted(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  taskId: string,
): boolean {
  const task = definitions[taskId];
  if (!task || task.cardType !== "task" || task.taskExecutionReady === false) return false;
  if (taskId === "HDM-028") return checkOnBlockCondition(state, definitions, playerId);
  if (taskId === "HDM-029") return everybodyEatsCondition(state, definitions, playerId);
  if (taskId === "HDM-043") return (state.taskProgress[playerId]?.["HDM-043"] ?? 0) > 0;
  if (taskId === "HDM-044") return walkHimDownCondition(state, definitions, playerId);
  if (taskId === "HDM-110") return crashTheirFeedReady(state, playerId);
  return true;
}

export function hoodmonCanAttemptTask(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  hoodmonInstanceId: string,
  taskId: string,
  taskBonus = 0,
): boolean {
  if (!taskCanBeAttempted(state, definitions, playerId, taskId)) return false;
  const hoodmon = findHoodmon(state.players[playerId], hoodmonInstanceId);
  if (!hoodmon) return false;
  const definition = definitions[hoodmon.definitionId];
  if (!definition) return false;
  if (taskId === "HDM-076") return definition.stageLevel === 1 && effectiveTask(definition, hoodmon) + taskBonus >= 700;
  if (taskId === "HDM-085") return effectiveTask(definition, hoodmon) + taskBonus >= 100;
  return true;
}

function taskFailureReason(taskId: string): string {
  switch (taskId) {
    case "HDM-028": return "Check on the Block is not ready: control a Bird or Beast Hoodmon and at least 1 other Hoodmon in Reserve.";
    case "HDM-029": return "Everybody Eats is not ready: control 2 Hoodmon of different species.";
    case "HDM-043": return "Cash In When It Counts is not ready: damage or knock out a Charmed opposing Hoodmon first.";
    case "HDM-044": return "Walk Him Down is not ready: control at least 2 Beast Hoodmon, or 1 Beast and 1 different Dark Hoodmon.";
    case "HDM-076": return "Tiny Creatures, Bigger Moves requires the Tasking Hoodmon to be Basic with TASK 700 or higher.";
    case "HDM-085": return "Research, Record, Reveal! requires the Tasking Hoodmon to have TASK 100 or higher.";
    case "HDM-110": return "Crash Their Feed is not ready: Exhaust 2 opposing Hoodmon with card effects first.";
    default: return "That Task is not ready to be completed right now.";
  }
}

export function declareTask(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  playerId: PlayerId,
  hoodmonInstanceId: string,
  taskOwner: PlayerId,
  taskSlot: 0 | 1 | 2,
  taskBonus = 0,
  rewardEffects: EngineEffect[] = [],
  failureEffects: EngineEffect[] = [],
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a new command.");
  if (state.currentPhase !== "Command") throw new Error("Tasks are attempted in the Command Phase.");
  if (state.currentPlayerTurn !== playerId) throw new Error("It is not that player's turn.");

  const player = state.players[playerId];
  const hoodmon = findHoodmon(player, hoodmonInstanceId);
  if (!hoodmon) throw new Error("Tasking Hoodmon not found.");
  if (hoodmon.readyState !== "ready") throw new Error("Hoodmon is Exhausted.");
  if (hoodmon.restrictions.cannotTask) throw new Error("This Hoodmon cannot attempt Tasks.");
  if (hoodmon.commandsUsedThisTurn >= 1) throw new Error("No normal Command remains for that Hoodmon.");

  const taskId = state.players[taskOwner].taskZone[taskSlot];
  if (!taskId) throw new Error("No face-up Task in that slot.");
  const task = definitions[taskId];
  if (!task || task.cardType !== "task") throw new Error("Task definition is invalid.");
  if (task.taskExecutionReady === false) {
    throw new Error(`${task.name} uses verified Task rules that still need digital objective/choice tracking.`);
  }
  if (!hoodmonCanAttemptTask(state, definitions, playerId, hoodmonInstanceId, taskId, taskBonus)) {
    throw new Error(taskFailureReason(taskId));
  }

  hoodmon.readyState = "exhausted";
  hoodmon.commandsUsedThisTurn += 1;

  const pendingTask: PendingTask = {
    player: playerId,
    hoodmonInstanceId,
    taskOwner,
    taskSlot,
    taskId,
    taskBonus,
    rewardEffects,
    failureEffects,
  };

  state.status = "reaction";
  state.reactionWindow = {
    openedBy: "task",
    nonActivePlayerResponded: false,
    activePlayerResponded: false,
    priority: otherPlayer(playerId),
    pendingTask,
    responseStack: [],
    responseCards: [],
  };
  appendLog(state, `${playerId} declared a Task Command on ${task.name}. Reaction Window opened.`);
  return state;
}

function completeTaskSlot(state: GameState, pending: PendingTask): void {
  const sourcePlayer = state.players[pending.taskOwner];
  sourcePlayer.taskZone[pending.taskSlot] = null;
  sourcePlayer.resolvedTasks.push(pending.taskId);
  state.players[pending.player].completedTasks += 1;
}

function objectiveTask(taskId: string): boolean {
  return ["HDM-028", "HDM-029", "HDM-043", "HDM-044", "HDM-076", "HDM-085", "HDM-103", "HDM-110"].includes(taskId);
}

export function resolvePendingTask(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  pending: PendingTask,
): GameState {
  const sourcePlayer = state.players[pending.taskOwner];
  const currentTaskId = sourcePlayer.taskZone[pending.taskSlot];
  if (currentTaskId !== pending.taskId) {
    appendLog(state, `The declared Task left its slot before resolution; the attempt ends.`);
    return state;
  }

  const hoodmon = findHoodmon(state.players[pending.player], pending.hoodmonInstanceId);
  if (!hoodmon) {
    appendLog(state, `The Tasking Hoodmon left play before the Task resolved.`);
    return state;
  }

  const task = definitions[pending.taskId];
  const hoodmonDef = definitions[hoodmon.definitionId];
  if (!task || task.cardType !== "task") throw new Error("Task definition is invalid at resolution.");

  // Objective-style Tasks must still be legal when the Reaction Window finishes.
  if (!hoodmonCanAttemptTask(state, definitions, pending.player, pending.hoodmonInstanceId, pending.taskId, pending.taskBonus)) {
    appendLog(state, `${task.name} no longer meets its completion requirement after reactions. The Task remains face-up.`);
    return state;
  }

  const rating = effectiveTask(hoodmonDef, hoodmon) + pending.taskBonus;
  const difficulty = task.taskDifficulty ?? 0;
  const success = objectiveTask(pending.taskId) || rating >= difficulty;

  if (!success) {
    applyEffects(state, [...(task.taskFailureEffectsByPlayer?.[pending.player] ?? []), ...pending.failureEffects], definitions);
    appendLog(state, `${pending.player} failed ${task.name} with TASK ${rating} vs Difficulty ${difficulty}. The Task remains face-up.`);
    return haltIfWinner(state);
  }

  completeTaskSlot(state, pending);
  const completingPlayer = state.players[pending.player];

  if (pending.taskId === "HDM-043") state.taskProgress[pending.player]["HDM-043"] = 0;
  if (pending.taskId === "HDM-110") state.taskProgress[pending.player]["HDM-110"] = 0;

  appendLog(state, `${pending.player} completed ${task.name} (${completingPlayer.completedTasks}/${COMPLETED_TASKS_TO_WIN} Tasks).`);

  // Reaching the Task win threshold ends the game immediately. Completion rewards do not need to resolve after match end.
  haltIfWinner(state);
  if ((state.status as GameState["status"]) === "game_over") return state;

  // Legacy generic Task rewards still apply where encoded, then the card-specific resolver handles current printed rules.
  applyEffects(state, [...(task.taskRewardEffectsByPlayer?.[pending.player] ?? []), ...pending.rewardEffects], definitions);
  if ((state.status as GameState["status"]) === "game_over") return state;

  if (pending.taskId === "HDM-043") {
    applyEffects(state, [
      { type: "gain_bond", player: pending.player, amount: 1 },
      { type: "draw", player: pending.player, amount: 1 },
    ], definitions);
    return attachContinuations(state, definitions, [`SUP39_TASK|${pending.player}|${pending.hoodmonInstanceId}`]);
  }

  if (pending.taskId === "HDM-044") {
    return attachContinuations(openWalkHimDownReward(state, definitions, pending.player), definitions, [`SUP39_TASK|${pending.player}|${pending.hoodmonInstanceId}`]);
  }

  return attachContinuations(resolveCompletedTaskEffect(state, definitions, pending.player, pending.taskId, pending.hoodmonInstanceId), definitions, [`SUP39_TASK|${pending.player}|${pending.hoodmonInstanceId}`]);
}
