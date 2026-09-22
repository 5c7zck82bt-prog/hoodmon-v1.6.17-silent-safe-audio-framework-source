import type { AttackDefinition, CardDefinition, ConditionalDamageRule } from "./types";

export interface CmsAttack {
  attack_name?: string;
  cost?: number | null;
  base_damage?: number | null;
  uses_atk_in_formula?: boolean;
  conditional_damage?: Array<{
    condition: ConditionalDamageRule["condition"];
    replace_damage?: number;
    bonus_damage?: number;
    custom_key?: string;
  }>;
}

export interface CmsCard {
  card_series_id: string;
  card_name: string;
  card_type: CardDefinition["cardType"];
  stage_level?: 1 | 2 | 3 | 4 | null;
  evolves_from?: string | null;
  bond_cost?: number | null;
  atk?: number | null;
  hp?: number | null;
  task_rating?: number | null;
  attacks?: CmsAttack[];
  task_difficulty?: number | null;
  task_tier?: "Street" | "Major" | "Crisis" | null;
  magic_subtype?: "Standard" | "Quick" | "Continuous" | "Equipment" | null;
}

function mapAttack(a: CmsAttack): AttackDefinition {
  return {
    attackName: a.attack_name ?? "Unnamed Attack",
    baseDamage: a.base_damage ?? 0,
    cost: a.cost ?? undefined,
    usesAtkInFormula: a.uses_atk_in_formula ?? false,
    conditionalDamage: a.conditional_damage?.map((r) => ({
      condition: r.condition,
      replaceDamage: r.replace_damage,
      bonusDamage: r.bonus_damage,
      customKey: r.custom_key,
    })),
  };
}

export function cmsCardToDefinition(card: CmsCard): CardDefinition {
  return {
    id: card.card_series_id,
    name: card.card_name,
    cardType: card.card_type,
    stageLevel: card.stage_level ?? undefined,
    evolvesFrom: card.evolves_from ?? undefined,
    bondCost: card.bond_cost ?? undefined,
    atk: card.atk ?? undefined,
    hp: card.hp ?? undefined,
    taskRating: card.task_rating ?? undefined,
    attacks: card.attacks?.map(mapAttack),
    taskDifficulty: card.task_difficulty ?? undefined,
    taskTier: card.task_tier ?? undefined,
    magicSubtype: card.magic_subtype ?? undefined,
  };
}

export function cmsCardsToDefinitionMap(cards: CmsCard[]): Record<string, CardDefinition> {
  return Object.fromEntries(cards.map((card) => {
    const definition = cmsCardToDefinition(card);
    return [definition.id, definition];
  }));
}
