import { applyEffect } from "./effects";
import { appendLog, effectiveAtk, findHoodmon, hasStatus, modifierTotal, otherPlayer } from "./helpers";
import { applyCharmedStatus, attachContinuations, cleanupCherryBattleModifiers, prepareCherryBattleModifiers, resolvePendingTargetedEffect, triggerCherryBatchAttackAftermath, triggerOnEvolve, velvetKennelAttackBonus } from "./cardEffects";
import { applySupport39KnockoutReplacement, beginSupport39AttackPrelude, support39OpponentHasRevealedCard } from "./support39";
import { resolvePendingTask } from "./tasks";
import type { AttackDefinition, CardDefinition, GameState, PendingAttack, PlayerId } from "./types";
import { resolveDefeats } from "./defeat";
import { resolveReactionCard } from "./reactions";

function ruleApplies(
  condition: AttackDefinition["conditionalDamage"] extends (infer T)[] | undefined ? T : never,
  target: ReturnType<typeof findHoodmon>,
  attacker: ReturnType<typeof findHoodmon>,
  state?: GameState,
  definitions?: Record<string, CardDefinition>,
  attackerPlayer?: PlayerId,
): boolean {
  if (!condition) return false;
  switch (condition.condition) {
    case "target_exhausted": return target?.readyState === "exhausted";
    case "target_atk_reduced": return Boolean(target?.modifiers.some((m) => m.stat === "atk" && m.amount < 0));
    case "attacker_evolved_this_turn": return Boolean(attacker?.evolvedThisTurn);
    case "custom": {
      if (condition.customKey === 'reserve_bearded_dragons_gte_2' && state && definitions && attackerPlayer) {
        const reserves = state.players[attackerPlayer].reserves.filter((card) => {
          if (!card) return false
          return definitions[card.definitionId]?.archetypeTags?.includes('Bearded Dragon')
        })
        return reserves.length >= 2
      }
      if (condition.customKey === 'target_charmed') return hasStatus(target, 'charmed')
      if (condition.customKey === 'target_marked') return hasStatus(target, 'marked')
      if (condition.customKey === 'control_peaches' && state && attackerPlayer) {
        return state.players[attackerPlayer].tamer?.definitionId === 'HDM-030'
      }
      if (condition.customKey === 'control_tamer' && state && attackerPlayer) {
        return Boolean(state.players[attackerPlayer].tamer)
      }
      if (condition.customKey === 'control_another_beast' && state && definitions && attackerPlayer && attacker) {
        const player = state.players[attackerPlayer]
        const allies = [player.activeHoodmon, ...player.reserves].filter((card): card is NonNullable<typeof card> => Boolean(card))
        return allies.some((card) => card.instanceId !== attacker.instanceId && definitions[card.definitionId]?.alignment?.includes('Beast'))
      }
      if (condition.customKey === 'opponent_has_revealed_card' && state && attackerPlayer) {
        return support39OpponentHasRevealedCard(state, otherPlayer(attackerPlayer))
      }
      if ((condition.customKey === 'opponent_revealed_or_target_exhausted' || condition.customKey === 'target_exhausted_or_revealed') && state && attackerPlayer) {
        return target?.readyState === 'exhausted' || support39OpponentHasRevealedCard(state, otherPlayer(attackerPlayer))
      }
      if (condition.customKey === 'control_beast' && state && definitions && attackerPlayer) {
        const player = state.players[attackerPlayer]
        const allies = [player.activeHoodmon, ...player.reserves].filter((card): card is NonNullable<typeof card> => Boolean(card))
        return allies.some((card) => definitions[card.definitionId]?.alignment?.includes('Beast'))
      }
      if (condition.customKey === 'switched_between_active_reserve_this_turn' && state && attacker) {
        return Boolean(attacker.runtimeAbilities?.some((ability) => ability.kind === 'support39_marker' && ability.sourceCardId === 'SUP39_SWITCHED' && ability.expiresOnTurn === state.turnNumber))
      }
      return false
    }
  }
}

export function calculateAttackDamage(
  attack: AttackDefinition,
  attackerDef: CardDefinition,
  attackerInstance: ReturnType<typeof findHoodmon>,
  targetInstance: ReturnType<typeof findHoodmon>,
  state?: GameState,
  definitions?: Record<string, CardDefinition>,
  attackerPlayer?: PlayerId,
): number {
  let damage = attack.baseDamage;
  if (attack.usesAtkInFormula) {
    damage += Math.round(effectiveAtk(attackerDef, attackerInstance) * (attack.atkMultiplier ?? 1));
  }

  for (const rule of attack.conditionalDamage ?? []) {
    if (!ruleApplies(rule, targetInstance, attackerInstance, state, definitions, attackerPlayer)) continue;
    if (rule.replaceDamage !== undefined) damage = rule.replaceDamage;
    if (rule.bonusDamage !== undefined) damage += rule.bonusDamage;
  }
  damage += modifierTotal(attackerInstance, "attack_damage");
  return Math.max(0, damage);
}

export function declareAttack(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  attackIndex: number,
): GameState {
  if (state.status !== "active") throw new Error("Game is not accepting a new command.");
  if (state.currentPhase !== "Command") throw new Error("Attacks are only legal in the Command Phase.");

  const attackerId = state.currentPlayerTurn;
  const defenderId = otherPlayer(attackerId);
  const attacker = state.players[attackerId].activeHoodmon;
  if (!attacker) throw new Error("No Active Hoodmon available to attack.");
  if (attacker.readyState !== "ready") throw new Error("Active Hoodmon is Exhausted.");
  if (attacker.restrictions.cannotAttack) throw new Error("This Hoodmon cannot attack.");
  if (attacker.commandsUsedThisTurn >= 1) throw new Error("This Hoodmon has already used its normal Command.");

  const def = definitions[attacker.definitionId];
  if (!def) throw new Error(`Missing card definition ${attacker.definitionId}.`);
  const attack = def.attacks?.[attackIndex];
  if (!attack) throw new Error("Printed attack not found.");

  attacker.readyState = "exhausted";
  attacker.commandsUsedThisTurn += 1;

  const target = state.players[defenderId].activeHoodmon;
  const pending: PendingAttack = {
    attacker: attackerId,
    attackerInstanceId: attacker.instanceId,
    defender: defenderId,
    defenderInstanceId: target?.instanceId ?? null,
    attack,
  };

  if (beginSupport39AttackPrelude(state, definitions, pending)) return state;

  state.status = "reaction";
  state.reactionWindow = {
    openedBy: "attack",
    nonActivePlayerResponded: false,
    activePlayerResponded: false,
    priority: defenderId,
    pendingAttack: pending,
    responseStack: [],
    responseCards: [],
  };
  appendLog(state, `${attackerId} declared ${attack.attackName}. Reaction Window opened.`);
  return state;
}

export function addReaction(state: GameState, by: PlayerId, effects: import("./types").EngineEffect[]): GameState {
  const window = state.reactionWindow;
  if (state.status !== "reaction" || !window) throw new Error("No Reaction Window is open.");
  if (window.priority !== by) throw new Error("That player does not have reaction priority.");

  const active = state.currentPlayerTurn;
  const nonActive = otherPlayer(active);
  if (by === nonActive) {
    if (window.nonActivePlayerResponded) throw new Error("Non-active player already used their response.");
    window.nonActivePlayerResponded = true;
    window.priority = active;
  } else {
    if (!window.nonActivePlayerResponded) throw new Error("Active player cannot answer before the opponent responds/passes.");
    if (window.activePlayerResponded) throw new Error("Active player already used their answer.");
    window.activePlayerResponded = true;
  }

  window.responseStack.push(...effects);
  appendLog(state, `${by} added a response to the Reaction Window.`);
  return state;
}

export function passReaction(state: GameState, by: PlayerId): GameState {
  const window = state.reactionWindow;
  if (state.status !== "reaction" || !window) throw new Error("No Reaction Window is open.");
  if (window.priority !== by) throw new Error("That player does not have reaction priority.");
  const active = state.currentPlayerTurn;
  const nonActive = otherPlayer(active);

  if (by === nonActive) {
    window.nonActivePlayerResponded = true;
    window.priority = active;
  } else {
    window.activePlayerResponded = true;
  }
  appendLog(state, `${by} passed reaction priority.`);
  return state;
}

function resolveAttack(
  state: GameState,
  definitions: Record<string, CardDefinition>,
  pending: PendingAttack,
): void {
  const attacker = findHoodmon(state.players[pending.attacker], pending.attackerInstanceId);
  const target = pending.defenderInstanceId
    ? findHoodmon(state.players[pending.defender], pending.defenderInstanceId)
    : null;
  if (!attacker) {
    appendLog(state, `The attacking Hoodmon left play before its attack resolved.`);
    return;
  }
  const attackerDef = definitions[attacker.definitionId];
  if (!attackerDef) throw new Error("Missing attacker definition.");
  if (pending.cancelled) {
    appendLog(state, `${pending.attack.attackName} was ended by a reaction and deals no damage.`);
    triggerCherryBatchAttackAftermath(state, definitions, pending.attacker, pending.attackerInstanceId, pending.defenderInstanceId, false, false);
    attachContinuations(state, definitions, [`SUP39_ATTACK|${pending.attacker}|${pending.attackerInstanceId}|0|${pending.defenderInstanceId ?? ''}`]);
    return;
  }
  // If an Active target existed when the attack was declared but left play during the
  // Reaction Window, the original attack does not become a direct Tamer attack automatically.
  if (pending.defenderInstanceId && !target) {
    appendLog(state, `${pending.attack.attackName} lost its declared target before resolution.`);
    triggerCherryBatchAttackAftermath(state, definitions, pending.attacker, pending.attackerInstanceId, pending.defenderInstanceId, false, false);
    attachContinuations(state, definitions, [`SUP39_ATTACK|${pending.attacker}|${pending.attackerInstanceId}|0|${pending.defenderInstanceId ?? ''}`]);
    return;
  }

  const targetWasCharmed = hasStatus(target, "charmed");
  const targetWasMarked = hasStatus(target, "marked");
  prepareCherryBattleModifiers(state, definitions, pending.attacker, attacker, target);
  const offTheLeashBonus = targetWasCharmed
    ? (attacker.runtimeAbilities ?? [])
      .filter((ability) => ability.kind === "bonus_damage_on_attack_charmed" && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber)
      .reduce((sum, ability) => sum + ability.amount, 0)
    : 0;
  const kennelBonus = target ? velvetKennelAttackBonus(state, definitions, pending.attacker, attacker, target) : 0;
  const damage = Math.max(0, calculateAttackDamage(pending.attack, attackerDef, attacker, target, state, definitions, pending.attacker) + (pending.damageModifier ?? 0) + offTheLeashBonus + kennelBonus);
  if (target) {
    // Delay defeat cleanup until attack replacement effects (for example Street Guardian Oath
    // and Nine Lives Escape) have had a chance to replace a would-be knockout.
    applyEffect(state, { type: "damage_hoodmon", player: pending.defender, instanceId: target.instanceId, amount: damage });
    if (targetWasCharmed && damage > 0) {
      const taskFaceUp = state.players.P1.taskZone.includes("HDM-043") || state.players.P2.taskZone.includes("HDM-043");
      if (taskFaceUp) state.taskProgress[pending.attacker]["HDM-043"] = 1;
    }
  } else {
    applyEffect(state, { type: "damage_lp", player: pending.defender, amount: damage }, definitions);
  }

  if ((state.status as GameState["status"]) !== "game_over" && targetWasCharmed) {
    const drawAbilities = (attacker.runtimeAbilities ?? []).filter((ability) =>
      ability.kind === "draw_on_attack_charmed" && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber,
    );
    for (const ability of drawAbilities) {
      applyEffect(state, { type: "draw", player: pending.attacker, amount: ability.amount }, definitions);
      attacker.runtimeAbilities = (attacker.runtimeAbilities ?? []).filter((entry) => entry.id !== ability.id);
      appendLog(state, `${attackerDef.name} attacked a Charmed Hoodmon and triggered ${ability.sourceCardId}.`);
      if ((state.status as GameState["status"]) === "game_over") break;
    }
  }

  if ((state.status as GameState["status"]) !== "game_over") {
    applySupport39KnockoutReplacement(state, definitions, pending, target);
  }

  if ((state.status as GameState["status"]) !== "game_over" && pending.charmAttackerAfterResolution) {
    const stillAttacking = findHoodmon(state.players[pending.attacker], pending.attackerInstanceId);
    if (stillAttacking) applyCharmedStatus(state, definitions, pending.attacker, stillAttacking);
  }

  cleanupCherryBattleModifiers(attacker, target);
  resolveDefeats(state, definitions);
  if ((state.status as GameState["status"]) === "game_over") return;
  triggerCherryBatchAttackAftermath(state, definitions, pending.attacker, pending.attackerInstanceId, pending.defenderInstanceId, targetWasMarked, true);
  attachContinuations(state, definitions, [`SUP39_ATTACK|${pending.attacker}|${pending.attackerInstanceId}|1|${pending.defenderInstanceId ?? ''}`]);
}

export function resolveReactionWindow(
  state: GameState,
  definitions: Record<string, CardDefinition>,
): GameState {
  const window = state.reactionWindow;
  if (!window || !["reaction", "choice"].includes(state.status)) throw new Error("No Reaction Window is open.");

  if (!window.resolving) {
    if (state.status !== "reaction") throw new Error("The Reaction Window is waiting on a card choice.");
    if (!window.nonActivePlayerResponded || !window.activePlayerResponded) {
      throw new Error("Both response opportunities must be used or passed before resolution.");
    }
    window.resolving = true;
    window.resolutionCursor = window.responseCards.length - 1;
    window.genericResponsesResolved = false;
  }

  // Newest card response resolves first. A response may open a PendingChoice; in that
  // case the cursor is advanced before resolving so a resumed window never double-resolves it.
  while ((window.resolutionCursor ?? -1) >= 0) {
    const index = window.resolutionCursor!;
    window.resolutionCursor = index - 1;
    const response = window.responseCards[index];
    if (response.negated) {
      appendLog(state, `${definitions[response.definitionId]?.name ?? response.definitionId} was negated before resolution.`);
      continue;
    }
    resolveReactionCard(state, definitions, response.player, response.definitionId);
    if (definitions[response.definitionId]?.cardType === 'trap') {
      attachContinuations(state, definitions, [`HDM082_TRIGGER|${response.player}|`])
    }
    resolveDefeats(state, definitions);
    if ((state.status as GameState["status"]) === "game_over") return state;
    if (state.pendingChoice || (state.status as GameState["status"]) === "choice") return state;
  }

  if (!window.genericResponsesResolved) {
    for (let i = window.responseStack.length - 1; i >= 0; i -= 1) {
      applyEffect(state, window.responseStack[i], definitions);
      if ((state.status as GameState["status"]) === "game_over") return state;
    }
    window.genericResponsesResolved = true;
  }

  const pendingEffect = window.pendingEffect;
  const pendingAttack = window.pendingAttack;
  const pendingTask = window.pendingTask;
  const pendingEvolution = window.pendingEvolution;

  // The response stack is finished. Close it before the original action resolves so any
  // choice opened by that action belongs to the action itself, not to the old Reaction Window.
  state.reactionWindow = null;
  if ((state.status as GameState["status"]) !== "game_over") state.status = "active";

  if (pendingEffect) {
    resolvePendingTargetedEffect(state, definitions, pendingEffect);
  } else if (pendingAttack) {
    resolveAttack(state, definitions, pendingAttack);
  } else if (pendingTask) {
    resolvePendingTask(state, definitions, pendingTask);
  }

  resolveDefeats(state, definitions);
  if ((state.status as GameState["status"]) !== "game_over") {
    // A resolving effect can legitimately open a brand-new Reaction Window (for example,
    // Nebulizard's targeted attack prelude finishing and then opening the normal attack window).
    // Do not collapse that new window back to active here.
    if ((state.status as GameState["status"]) !== "reaction") {
      state.status = state.pendingChoice ? "choice" : "active";
    }
    if (pendingEvolution && !state.pendingChoice && (state.status as GameState["status"]) !== "reaction") {
      triggerOnEvolve(state, definitions, pendingEvolution.player, pendingEvolution.instanceId, pendingEvolution.definitionId);
      attachContinuations(state, definitions, [`SUP39_EVOLVE|${pendingEvolution.player}|${pendingEvolution.instanceId}`]);
    }
    if ((state.status as GameState["status"]) === "active" && state.pendingPromotion) state.status = "awaiting_promotion";
  }
  return state;
}
