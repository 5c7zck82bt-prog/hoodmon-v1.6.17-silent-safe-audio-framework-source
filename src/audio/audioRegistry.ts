export type AudioCategory = 'music' | 'sfx' | 'ui'

export type AudioCue =
  | 'music_menu'
  | 'music_battle'
  | 'music_victory'
  | 'music_defeat'
  | 'ui_click'
  | 'ui_open'
  | 'ui_close'
  | 'card_pickup'
  | 'card_drop'
  | 'phase_change'
  | 'bond_gain'
  | 'hoodmon_deploy'
  | 'hoodmon_evolve'
  | 'attack'
  | 'damage'
  | 'lp_damage'
  | 'ko'
  | 'reaction'
  | 'task_complete'
  | 'victory'
  | 'defeat'

export type AudioAssetDefinition = {
  label: string
  category: AudioCategory
  src: string | null
  loop?: boolean
  baseVolume?: number
  licenseId?: string | null
  approvedForCommercialUse: boolean
}

/**
 * HOODMON audio registry.
 *
 * IMPORTANT: src intentionally remains null until an audio asset has been
 * independently approved for commercial use and documented in
 * public/audio/LICENSE_MANIFEST.json. Empty slots are silent by design.
 */
export const AUDIO_REGISTRY: Record<AudioCue, AudioAssetDefinition> = {
  music_menu: { label: 'Menu Music', category: 'music', src: null, loop: true, baseVolume: 0.65, licenseId: null, approvedForCommercialUse: false },
  music_battle: { label: 'Battle Music', category: 'music', src: null, loop: true, baseVolume: 0.7, licenseId: null, approvedForCommercialUse: false },
  music_victory: { label: 'Victory Music', category: 'music', src: null, loop: false, baseVolume: 0.8, licenseId: null, approvedForCommercialUse: false },
  music_defeat: { label: 'Defeat Music', category: 'music', src: null, loop: false, baseVolume: 0.75, licenseId: null, approvedForCommercialUse: false },
  ui_click: { label: 'UI Click', category: 'ui', src: null, baseVolume: 0.55, licenseId: null, approvedForCommercialUse: false },
  ui_open: { label: 'Panel Open', category: 'ui', src: null, baseVolume: 0.6, licenseId: null, approvedForCommercialUse: false },
  ui_close: { label: 'Panel Close', category: 'ui', src: null, baseVolume: 0.55, licenseId: null, approvedForCommercialUse: false },
  card_pickup: { label: 'Card Pickup', category: 'ui', src: null, baseVolume: 0.6, licenseId: null, approvedForCommercialUse: false },
  card_drop: { label: 'Card Drop', category: 'ui', src: null, baseVolume: 0.65, licenseId: null, approvedForCommercialUse: false },
  phase_change: { label: 'Phase Change', category: 'ui', src: null, baseVolume: 0.55, licenseId: null, approvedForCommercialUse: false },
  bond_gain: { label: 'Bond Gain', category: 'sfx', src: null, baseVolume: 0.65, licenseId: null, approvedForCommercialUse: false },
  hoodmon_deploy: { label: 'Hoodmon Deploy', category: 'sfx', src: null, baseVolume: 0.82, licenseId: null, approvedForCommercialUse: false },
  hoodmon_evolve: { label: 'Evolution', category: 'sfx', src: null, baseVolume: 0.9, licenseId: null, approvedForCommercialUse: false },
  attack: { label: 'Attack', category: 'sfx', src: null, baseVolume: 0.85, licenseId: null, approvedForCommercialUse: false },
  damage: { label: 'Damage', category: 'sfx', src: null, baseVolume: 0.82, licenseId: null, approvedForCommercialUse: false },
  lp_damage: { label: 'LP Damage', category: 'sfx', src: null, baseVolume: 0.9, licenseId: null, approvedForCommercialUse: false },
  ko: { label: 'Knockout', category: 'sfx', src: null, baseVolume: 0.95, licenseId: null, approvedForCommercialUse: false },
  reaction: { label: 'Reaction', category: 'sfx', src: null, baseVolume: 0.78, licenseId: null, approvedForCommercialUse: false },
  task_complete: { label: 'Task Complete', category: 'sfx', src: null, baseVolume: 0.88, licenseId: null, approvedForCommercialUse: false },
  victory: { label: 'Victory Sting', category: 'sfx', src: null, baseVolume: 1, licenseId: null, approvedForCommercialUse: false },
  defeat: { label: 'Defeat Sting', category: 'sfx', src: null, baseVolume: 0.9, licenseId: null, approvedForCommercialUse: false },
}

export const AUDIO_CUES = Object.keys(AUDIO_REGISTRY) as AudioCue[]
export const installedAudioCueCount = () => AUDIO_CUES.filter((cue) => {
  const asset = AUDIO_REGISTRY[cue]
  return Boolean(asset.src && asset.licenseId && asset.approvedForCommercialUse)
}).length

export function isAudioCue(value: string): value is AudioCue {
  return Object.prototype.hasOwnProperty.call(AUDIO_REGISTRY, value)
}
