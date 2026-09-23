export type PlayerId = "P1" | "P2";
export type Phase = "Refresh" | "Draw" | "Bond" | "Main" | "Command" | "End";
export type EngineStatus = "setup" | "active" | "choice" | "reaction" | "awaiting_promotion" | "game_over";
export type ReadyState = "ready" | "exhausted";
export type CardStatus = "charmed" | "marked";
export type Position =
  | "tamer"
  | "active"
  | "reserve_1"
  | "reserve_2"
  | "reserve_3"
  | "discard"
  | "banished"
  | "field"
  | "magic_1"
  | "magic_2"
  | "magic_3"
  | "trap_1"
  | "trap_2";
export type CardType = "tamer" | "hoodmon" | "magic" | "trap" | "field" | "task";
export type StageLevel = 1 | 2 | 3 | 4;

export interface ConditionalDamageRule {
  condition:
    | "target_exhausted"
    | "target_atk_reduced"
    | "attacker_evolved_this_turn"
    | "custom";
  replaceDamage?: number;
  bonusDamage?: number;
  customKey?: string;
}

export interface AttackDefinition {
  attackName: string;
  baseDamage: number;
  cost?: number;
  usesAtkInFormula?: boolean;
  atkMultiplier?: number;
  conditionalDamage?: ConditionalDamageRule[];
}

export interface CardDefinition {
  id: string;
  name: string;
  cardType: CardType;
  stageLevel?: StageLevel;
  evolvesFrom?: string | null;
  bondCost?: number;
  atk?: number;
  hp?: number;
  taskRating?: number;
  attacks?: AttackDefinition[];
  taskDifficulty?: number;
  taskTier?: "Street" | "Major" | "Crisis";
  magicSubtype?: "Standard" | "Quick" | "Continuous" | "Equipment";
  alignment?: string[];
  archetypeTags?: string[];
  effectStatus?: "verified_data" | "pending";
  effectText?: string;
  /** Rules text is verified, but this indicates whether the full digital resolver/choice UI is complete. */
  digitalEffectReady?: boolean;
  /** Objective-style Tasks can be verified visually before their tracker is implemented. */
  taskExecutionReady?: boolean;
  reactionTrigger?: string;
  taskRewardEffectsByPlayer?: Partial<Record<PlayerId, EngineEffect[]>>;
  taskFailureEffectsByPlayer?: Partial<Record<PlayerId, EngineEffect[]>>;
}

export interface RuntimeRestrictions {
  cannotEvolve?: boolean;
  cannotRetreat?: boolean;
  cannotAttack?: boolean;
  cannotTask?: boolean;
  /** Prevents manually activated Hoodmon abilities while the restriction is live. */
  cannotActivate?: boolean;
  cannotBeTargetedByOpponentEffects?: boolean;
  cannotBeExhaustedByEffects?: boolean;
}

export interface RuntimeAbility {
  id: string;
  sourceCardId: string;
  kind:
    | "draw_on_attack_charmed"
    | "draw_on_attack_marked"
    | "bonus_damage_on_attack_charmed"
    | "street_contract"
    | "field_charm_cycle_used"
    | "field_attack_bonus_used"
    | "field_mark_draw_used"
    | "field_mark_exhaust_used"
    | "cherry_silent_operator_used"
    | "miso_nine_lives_used"
    | "next_battle_atk_penalty"
    | "on_air_play_used"
    | "on_air_reveal_used"
    | "support39_marker";
  amount: number;
  expiresOnTurn?: number;
}

export interface Modifier {
  id: string;
  sourceCardId: string;
  stat: "atk" | "hp" | "task" | "attack_damage";
  amount: number;
  duration: "until_end_of_turn" | "until_end_of_next_turn" | "persistent";
  expiresOnTurn?: number;
}

export interface CardInstance {
  instanceId: string;
  definitionId: string;
  owner: PlayerId;
  controller: PlayerId;
  readyState: ReadyState;
  position: Position;
  damageTaken: number;
  commandsUsedThisTurn: number;
  turnSet?: number;
  evolvedThisTurn?: boolean;
  evolutionStack: string[];
  restrictions: RuntimeRestrictions;
  restrictionExpiresOnTurn?: Partial<Record<keyof RuntimeRestrictions, number>>;
  modifiers: Modifier[];
  runtimeAbilities?: RuntimeAbility[];
  /** Named statuses. Charmed and Marked have no intrinsic penalty; cards define what they do with them. */
  statuses?: CardStatus[];
  /** Optional turn-number expiry used by temporary statuses such as Marked. */
  statusExpiresOnTurn?: Partial<Record<CardStatus, number>>;
}

export interface PlayerState {
  id: PlayerId;
  lp: number;
  maxLp: number;
  bond: number;
  completedTasks: number;
  hoodmonDeck: string[];
  hand: string[];
  discard: string[];
  banished: string[];
  tamer: CardInstance | null;
  activeHoodmon: CardInstance | null;
  reserves: [CardInstance | null, CardInstance | null, CardInstance | null];
  magic: [CardInstance | null, CardInstance | null, CardInstance | null];
  traps: [CardInstance | null, CardInstance | null];
  field: CardInstance | null;
  taskDeck: string[];
  taskZone: [string | null, string | null, string | null];
  resolvedTasks: string[];
  normalDeployUsed: boolean;
}

export interface PendingAttack {
  damageModifier?: number;
  cancelled?: boolean;
  charmAttackerAfterResolution?: boolean;
  preventKnockoutByOath?: boolean;
  returnOnKnockoutByNineLives?: boolean;
  attacker: PlayerId;
  attackerInstanceId: string;
  defender: PlayerId;
  defenderInstanceId: string | null;
  attack: AttackDefinition;
}

export interface PendingTargetedEffect {
  sourcePlayer: PlayerId;
  sourceCardId: string;
  effectKey: string;
  targetRefs: string[];
  negated?: boolean;
  context?: Record<string, string | number | boolean | string[]>;
}

export interface PendingTask {
  player: PlayerId;
  hoodmonInstanceId: string;
  taskOwner: PlayerId;
  taskSlot: 0 | 1 | 2;
  taskId: string;
  taskBonus: number;
  rewardEffects: EngineEffect[];
  failureEffects: EngineEffect[];
}

export interface ChoiceOption {
  id: string;
  label: string;
  detail?: string;
  cardId?: string;
  instanceId?: string;
  player?: PlayerId;
  value?: string;
}

export interface PendingChoice {
  player: PlayerId;
  sourceCardId: string;
  sourceInstanceId?: string;
  prompt: string;
  minSelections: number;
  maxSelections: number;
  options: ChoiceOption[];
  actionKey: string;
  context?: Record<string, string | number | boolean | string[]>;
}

export interface ReactionWindow {
  openedBy: "attack" | "task" | "evolution" | "effect";
  nonActivePlayerResponded: boolean;
  activePlayerResponded: boolean;
  priority: PlayerId;
  pendingAttack?: PendingAttack;
  pendingTask?: PendingTask;
  pendingEvolution?: { player: PlayerId; instanceId: string; definitionId: string };
  pendingEffect?: PendingTargetedEffect;
  responseStack: EngineEffect[];
  responseCards: Array<{ player: PlayerId; definitionId: string; negated?: boolean }>;
  /** Cursor used when a resolving response opens a player choice. */
  resolutionCursor?: number;
  /** Generic queued engine responses have already been resolved. */
  genericResponsesResolved?: boolean;
  /** True after both players have answered and the response stack has begun resolving. */
  resolving?: boolean;
}

export type EngineEffect =
  | { type: "draw"; player: PlayerId; amount: number }
  | { type: "damage_lp"; player: PlayerId; amount: number }
  | { type: "damage_hoodmon"; player: PlayerId; instanceId: string; amount: number }
  | { type: "exhaust"; player: PlayerId; instanceId: string }
  | { type: "ready"; player: PlayerId; instanceId: string }
  | { type: "gain_bond"; player: PlayerId; amount: number }
  | { type: "restrict"; player: PlayerId; instanceId: string; restriction: keyof RuntimeRestrictions; value: boolean }
  | { type: "set_status"; player: PlayerId; instanceId: string; status: CardStatus; value: boolean; expiresOnTurn?: number };

export interface WinnerState {
  player: PlayerId;
  reason: "knockout" | "tasks" | "deckout";
}

export interface GameState {
  status: EngineStatus;
  currentPlayerTurn: PlayerId;
  currentPhase: Phase;
  round: number;
  turnNumber: number;
  players: Record<PlayerId, PlayerState>;
  reactionWindow: ReactionWindow | null;
  /** Attack waiting for a mandatory/optional pre-attack Hoodmon trigger to finish. */
  pendingAttackSetup?: PendingAttack | null;
  pendingChoice: PendingChoice | null;
  taskProgress: Record<PlayerId, Record<string, number>>;
  pendingPromotion: PlayerId | null;
  winner: WinnerState | null;
  localFaceToFaceMode: boolean;
  viewportOwner: PlayerId;
  needsPassInterstitial: boolean;
  eventLog: string[];
  setupPending: PlayerId[];
}

export interface GameSetup {
  p1Deck: string[];
  p2Deck: string[];
  p1TaskDeck: string[];
  p2TaskDeck: string[];
  p1TamerId?: string;
  p2TamerId?: string;
  localFaceToFaceMode?: boolean;
  firstPlayer?: PlayerId;
  shuffleDecks?: boolean;
}
