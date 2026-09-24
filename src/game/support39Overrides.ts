import type { CardDefinition } from './engine/types'

const ids = [
  'HDM-001','HDM-008','HDM-009','HDM-012','HDM-013','HDM-014','HDM-015','HDM-016','HDM-022','HDM-023','HDM-024','HDM-025','HDM-027','HDM-030',
  'HDM-056','HDM-057','HDM-059','HDM-060','HDM-061','HDM-063','HDM-067','HDM-070','HDM-071','HDM-072','HDM-073','HDM-074','HDM-075','HDM-077','HDM-078','HDM-083','HDM-084',
  'HDM-094','HDM-101','HDM-102','HDM-104','HDM-105','HDM-106','HDM-107','HDM-108','HDM-109',
] as const

export const support39RuntimeOverrides: Record<string, Partial<CardDefinition>> = Object.fromEntries(
  ids.map((id) => [id, { effectStatus: 'verified_data' as const, digitalEffectReady: true }]),
)

support39RuntimeOverrides['HDM-061'] = {
  ...support39RuntimeOverrides['HDM-061'],
  effectText: 'Search your Hoodmon Deck for 1 Trap card, or choose 1 Task from your separate Task Deck. A Trap is added to your hand; a chosen Task is moved to the top of your Task Deck. Then look at the top 2 cards of either Hoodmon Deck and rearrange them. If Capin MDH is in play, draw 1 card. DIGITAL RULES NOTE — Tamers live outside the Main Deck and cannot be searched into hand.',
}

support39RuntimeOverrides['HDM-078'] = {
  ...support39RuntimeOverrides['HDM-078'],
  effectText: 'TRUTH AMPLIFIER — Once per turn, when one of your Research, Psychic, or Trap cards reveals an opponent’s card or reduces a Hoodmon’s ATK, gain 1 Bond. RECORD. DECODE. REVEAL. — You may exhaust this Tamer to search your deck for 1 Truth Network: Research or “Oracle” card, reveal it, put it into your hand, then shuffle your deck.',
}
