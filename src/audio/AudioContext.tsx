import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AUDIO_REGISTRY, isAudioCue, type AudioCategory, type AudioCue } from './audioRegistry'

export type AudioSettings = {
  masterMuted: boolean
  masterVolume: number
  musicMuted: boolean
  musicVolume: number
  sfxMuted: boolean
  sfxVolume: number
  uiMuted: boolean
  uiVolume: number
  pauseWhenHidden: boolean
}

type AudioContextValue = {
  settings: AudioSettings
  audioUnlocked: boolean
  currentMusicCue: AudioCue | null
  updateSettings: (patch: Partial<AudioSettings>) => void
  resetSettings: () => void
  toggleMasterMute: () => void
  playCue: (cue: AudioCue) => void
  setMusic: (cue: AudioCue | null) => void
  stopMusic: () => void
}

const STORAGE_KEY = 'hoodmon.audio.settings.v1'
const DEFAULT_SETTINGS: AudioSettings = {
  masterMuted: false,
  masterVolume: 0.85,
  musicMuted: false,
  musicVolume: 0.55,
  sfxMuted: false,
  sfxVolume: 0.85,
  uiMuted: false,
  uiVolume: 0.65,
  pauseWhenHidden: true,
}

const AudioContext = createContext<AudioContextValue | null>(null)

function clamp01(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback
}

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const saved = JSON.parse(raw) as Partial<AudioSettings>
    return {
      masterMuted: saved.masterMuted === true,
      masterVolume: clamp01(saved.masterVolume, DEFAULT_SETTINGS.masterVolume),
      musicMuted: saved.musicMuted === true,
      musicVolume: clamp01(saved.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxMuted: saved.sfxMuted === true,
      sfxVolume: clamp01(saved.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
      uiMuted: saved.uiMuted === true,
      uiVolume: clamp01(saved.uiVolume, DEFAULT_SETTINGS.uiVolume),
      pauseWhenHidden: saved.pauseWhenHidden !== false,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function channelVolume(settings: AudioSettings, category: AudioCategory) {
  if (settings.masterMuted) return 0
  if (category === 'music') return settings.musicMuted ? 0 : settings.masterVolume * settings.musicVolume
  if (category === 'sfx') return settings.sfxMuted ? 0 : settings.masterVolume * settings.sfxVolume
  return settings.uiMuted ? 0 : settings.masterVolume * settings.uiVolume
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(() => loadSettings())
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [currentMusicCue, setCurrentMusicCue] = useState<AudioCue | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const desiredMusicRef = useRef<AudioCue | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const updateSettings = useCallback((patch: Partial<AudioSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [])
  const toggleMasterMute = useCallback(() => setSettings((current) => ({ ...current, masterMuted: !current.masterMuted })), [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* Audio preferences must never break the app. */ }
    const music = musicRef.current
    if (music && currentMusicCue) {
      const asset = AUDIO_REGISTRY[currentMusicCue]
      music.volume = Math.min(1, channelVolume(settings, 'music') * (asset.baseVolume ?? 1))
      if (channelVolume(settings, 'music') <= 0 || (settings.pauseWhenHidden && document.visibilityState === 'hidden')) music.pause()
      else if (audioUnlocked && (document.visibilityState !== 'hidden' || !settings.pauseWhenHidden)) void music.play().catch(() => {})
    }
  }, [audioUnlocked, currentMusicCue, settings])

  const stopMusic = useCallback(() => {
    desiredMusicRef.current = null
    if (musicRef.current) {
      musicRef.current.pause()
      musicRef.current.currentTime = 0
      musicRef.current = null
    }
    setCurrentMusicCue(null)
  }, [])

  const startMusic = useCallback((cue: AudioCue | null) => {
    if (cue === null) {
      stopMusic()
      return
    }
    desiredMusicRef.current = cue
    const asset = AUDIO_REGISTRY[cue]
    if (asset.category !== 'music') return
    setCurrentMusicCue(cue)
    if (!asset.src || !asset.licenseId || !asset.approvedForCommercialUse) {
      if (musicRef.current) {
        musicRef.current.pause()
        musicRef.current = null
      }
      return
    }
    if (musicRef.current?.dataset.hoodmonCue === cue) return
    if (musicRef.current) musicRef.current.pause()
    const audio = new Audio(asset.src)
    audio.dataset.hoodmonCue = cue
    audio.loop = asset.loop === true
    audio.preload = 'auto'
    audio.volume = Math.min(1, channelVolume(settingsRef.current, 'music') * (asset.baseVolume ?? 1))
    musicRef.current = audio
    if (audioUnlocked && audio.volume > 0 && document.visibilityState !== 'hidden') void audio.play().catch(() => {})
  }, [audioUnlocked, stopMusic])

  const playCue = useCallback((cue: AudioCue) => {
    const asset = AUDIO_REGISTRY[cue]
    if (!asset || asset.category === 'music') {
      if (asset?.category === 'music') startMusic(cue)
      return
    }
    const volume = channelVolume(settingsRef.current, asset.category) * (asset.baseVolume ?? 1)
    if (!asset.src || !asset.licenseId || !asset.approvedForCommercialUse || volume <= 0 || !audioUnlocked) return
    const audio = new Audio(asset.src)
    audio.preload = 'auto'
    audio.volume = Math.min(1, volume)
    void audio.play().catch(() => {})
  }, [audioUnlocked, startMusic])

  useEffect(() => {
    const unlock = () => setAudioUnlocked(true)
    window.addEventListener('pointerdown', unlock, { once: true, passive: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!audioUnlocked) return
    const cue = desiredMusicRef.current
    if (cue) startMusic(cue)
  }, [audioUnlocked, startMusic])

  useEffect(() => {
    const onVisibility = () => {
      const music = musicRef.current
      if (!music || !settingsRef.current.pauseWhenHidden) return
      if (document.visibilityState === 'hidden') music.pause()
      else if (audioUnlocked && music.volume > 0) void music.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [audioUnlocked])

  useEffect(() => {
    const onUiInteraction = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const interactive = target.closest('button, a, select, input[type="checkbox"], input[type="range"]')
      if (!interactive || interactive.hasAttribute('data-audio-silent')) return
      const requested = interactive.getAttribute('data-audio-cue')
      playCue(requested && isAudioCue(requested) ? requested : 'ui_click')
    }
    document.addEventListener('pointerup', onUiInteraction, { passive: true })
    return () => document.removeEventListener('pointerup', onUiInteraction)
  }, [playCue])

  useEffect(() => () => {
    if (musicRef.current) musicRef.current.pause()
  }, [])

  const value = useMemo<AudioContextValue>(() => ({
    settings,
    audioUnlocked,
    currentMusicCue,
    updateSettings,
    resetSettings,
    toggleMasterMute,
    playCue,
    setMusic: startMusic,
    stopMusic,
  }), [settings, audioUnlocked, currentMusicCue, updateSettings, resetSettings, toggleMasterMute, playCue, startMusic, stopMusic])

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export function useAudio() {
  const value = useContext(AudioContext)
  if (!value) throw new Error('useAudio must be used inside AudioProvider')
  return value
}
