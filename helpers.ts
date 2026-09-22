import type { CardDefinition, CardInstance, CardStatus, GameState, Modifier, PlayerId, PlayerState, RuntimeAbility } from "./types";

export const otherPlayer = (id: PlayerId): PlayerId => (id === "P1" ? "P2" : "P1");

export function allHoodmon(player: PlayerState): CardInstance[] {
  return [player.activeHoodmon, ...player.reserves].filter((x): x is CardInstance => Boolean(x));
}

export function findHoodmon(player: PlayerState, instanceId: string): CardInstance | null {
  return allHoodmon(player).find((c) => c.instanceId === instanceId) ?? null;
}

export function hasStatus(card: CardInstance | null, status: CardStatus): boolean {
  return Boolean(card?.statuses?.includes(status));
}

export function setStatus(card: CardInstance | null, status: CardStatus, value = true, expiresOnTurn?: number): void {
  if (!card) return;
  const statuses = card.statuses ?? (card.statuses = []);
  const expirations = card.statusExpiresOnTurn ?? (card.statusExpiresOnTurn = {});
  const has = statuses.includes(status);
  if (value && !has) statuses.push(status);
  if (value) {
    if (expiresOnTurn !== undefined) expirations[status] = expiresOnTurn;
    else delete expirations[status];
  }
  if (!value && has) card.statuses = statuses.filter((entry) => entry !== status);
  if (!value) delete expirations[status];
}

export function modifierTotal(card: CardInstance | null, stat: Modifier["stat"]): number {
  return card?.modifiers?.filter((m) => m.stat === stat).reduce((sum, modifier) => sum + modifier.amount, 0) ?? 0;
}

export function effectiveAtk(definition: CardDefinition | undefined, card: CardInstance | null): number {
  return Math.max(0, (definition?.atk ?? 0) + modifierTotal(card, "atk"));
}

export function effectiveHp(definition: CardDefinition | undefined, card: CardInstance | null): number {
  return Math.max(0, (definition?.hp ?? 0) + modifierTotal(card, "hp"));
}

export function effectiveTask(definition: CardDefinition | undefined, card: CardInstance | null): number {
  return Math.max(0, (definition?.taskRating ?? 0) + modifierTotal(card, "task"));
}

export function addModifier(
  state: GameState,
  card: CardInstance,
  sourceCardId: string,
  stat: Modifier["stat"],
  amount: number,
  duration: Modifier["duration"] = "persistent",
): Modifier {
  const modifier: Modifier = {
    id: `${sourceCardId}-${stat}-${state.turnNumber}-${Math.random().toString(36).slice(2, 8)}`,
    sourceCardId,
    stat,
    amount,
    duration,
    expiresOnTurn: duration === "until_end_of_turn" ? state.turnNumber : duration === "until_end_of_next_turn" ? state.turnNumber + 1 : undefined,
  };
  card.modifiers.push(modifier);
  return modifier;
}

export function addRuntimeAbility(
  state: GameState,
  card: CardInstance,
  sourceCardId: string,
  kind: RuntimeAbility["kind"],
  amount: number,
  expiresOnTurn = state.turnNumber,
): RuntimeAbility {
  const ability: RuntimeAbility = {
    id: `${sourceCardId}-${kind}-${state.turnNumber}-${Math.random().toString(36).slice(2, 8)}`,
    sourceCardId,
    kind,
    amount,
    expiresOnTurn,
  };
  (card.runtimeAbilities ??= []).push(ability);
  return ability;
}

export function setTemporaryRestriction(
  state: GameState,
  card: CardInstance,
  restriction: keyof CardInstance["restrictions"],
  value: boolean,
  expiresOnTurn = state.turnNumber,
): void {
  card.restrictions[restriction] = value;
  const expirations = card.restrictionExpiresOnTurn ?? (card.restrictionExpiresOnTurn = {});
  if (value) expirations[restriction] = expiresOnTurn;
  else delete expirations[restriction];
}

function allRuntimeCards(player: PlayerState): CardInstance[] {
  return [player.tamer, ...allHoodmon(player), player.field, ...player.magic, ...player.traps].filter((card): card is CardInstance => Boolean(card));
}

export function expireStatusesAtEndOfTurn(state: GameState, playerId: PlayerId): void {
  const player = state.players[playerId];
  for (const card of allRuntimeCards(player)) {
    for (const status of [...(card.statuses ?? [])]) {
      if ((card.statusExpiresOnTurn?.[status] ?? Infinity) <= state.turnNumber) {
        setStatus(card, status, false);
        appendLog(state, `${card.instanceId} is no longer ${status === "charmed" ? "Charmed" : status === "marked" ? "Marked" : status}.`);
      }
    }
  }
}

export function expireTemporaryRuntimeEffectsAtEndOfTurn(state: GameState): void {
  for (const playerId of ["P1", "P2"] as PlayerId[]) {
    for (const card of allRuntimeCards(state.players[playerId])) {
      card.modifiers = (card.modifiers ?? []).filter((modifier) => {
        if (modifier.duration === "persistent") return true;
        return (modifier.expiresOnTurn ?? state.turnNumber) > state.turnNumber;
      });
      card.runtimeAbilities = (card.runtimeAbilities ?? []).filter((ability) => (ability.expiresOnTurn ?? Infinity) > state.turnNumber);
      for (const restriction of Object.keys(card.restrictionExpiresOnTurn ?? {}) as Array<keyof CardInstance["restrictions"]>) {
        if ((card.restrictionExpiresOnTurn?.[restriction] ?? Infinity) <= state.turnNumber) {
          card.restrictions[restriction] = false;
          delete card.restrictionExpiresOnTurn?.[restriction];
        }
      }
    }
  }
}

export function cloneState<T>(value: T): T {
  return structuredClone(value);
}

export function appendLog(state: GameState, entry: string): void {
  state.eventLog.push(entry);
  if (state.eventLog.length > 300) state.eventLog.shift();
}
