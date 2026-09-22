import { useEffect } from 'react'
import { AUDIO_CUES, installedAudioCueCount } from '../audio/audioRegistry'
import { useAudio } from '../audio/AudioContext'

function percent(value: number) { return Math.round(value * 100) }

export function AudioSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, resetSettings, toggleMasterMute, audioUnlocked } = useAudio()
  const installed = installedAudioCueCount()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop audio-settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="audio-settings-modal" role="dialog" aria-modal="true" aria-labelledby="audio-settings-title">
        <button className="modal-close" data-audio-cue="ui_close" onClick={onClose} aria-label="Close audio settings">×</button>
        <div className="audio-settings-heading">
          <span className="eyebrow">HOODMON AUDIO</span>
          <h2 id="audio-settings-title">SOUND SETTINGS</h2>
          <p>The audio system is ready, but this build intentionally contains <b>no playable audio assets</b>. Approved commercial-use sounds can be added later without changing battle logic.</p>
        </div>

        <div className="audio-readiness-card">
          <div><span>LICENSED AUDIO INSTALLED</span><b>{installed}/{AUDIO_CUES.length}</b></div>
          <div><span>BROWSER AUDIO</span><b>{audioUnlocked ? 'READY' : 'UNLOCKS ON INPUT'}</b></div>
          <small>{installed === 0 ? 'Silent placeholder mode is active. No unlicensed sound can accidentally play.' : 'Only manifest-approved audio slots are enabled.'}</small>
        </div>

        <div className="audio-master-row">
          <button className={`audio-mute-button ${settings.masterMuted ? 'muted' : ''}`} onClick={toggleMasterMute}>
            {settings.masterMuted ? '🔇 UNMUTE ALL' : '🔊 MUTE ALL'}
          </button>
          <label className="audio-slider master">
            <span><b>MASTER</b><i>{percent(settings.masterVolume)}%</i></span>
            <input aria-label="Master volume" type="range" min="0" max="100" value={percent(settings.masterVolume)} onChange={(event) => updateSettings({ masterVolume: Number(event.target.value) / 100 })} />
          </label>
        </div>

        <div className="audio-channel-grid">
          <AudioChannel label="MUSIC" value={settings.musicVolume} muted={settings.musicMuted} onVolume={(value) => updateSettings({ musicVolume: value })} onMute={() => updateSettings({ musicMuted: !settings.musicMuted })} />
          <AudioChannel label="BATTLE SFX" value={settings.sfxVolume} muted={settings.sfxMuted} onVolume={(value) => updateSettings({ sfxVolume: value })} onMute={() => updateSettings({ sfxMuted: !settings.sfxMuted })} />
          <AudioChannel label="UI / CARDS" value={settings.uiVolume} muted={settings.uiMuted} onVolume={(value) => updateSettings({ uiVolume: value })} onMute={() => updateSettings({ uiMuted: !settings.uiMuted })} />
        </div>

        <label className="audio-checkbox-row">
          <input type="checkbox" checked={settings.pauseWhenHidden} onChange={(event) => updateSettings({ pauseWhenHidden: event.target.checked })} />
          <span><b>PAUSE MUSIC WHEN APP IS HIDDEN</b><small>Prevents background music from continuing when the tab/app is not visible.</small></span>
        </label>

        <div className="audio-policy-note">
          <b>COMMERCIAL-SAFETY LOCK</b>
          <p>Audio slots stay silent unless an asset is deliberately registered and its rights are documented in <code>public/audio/LICENSE_MANIFEST.json</code>. Free-plan MusicGPT generations, ripped sounds, copyrighted songs, and unclear “royalty-free” assets should not be registered.</p>
        </div>

        <div className="audio-modal-actions">
          <button onClick={resetSettings}>RESET LEVELS</button>
          <button className="primary-action" data-audio-cue="ui_close" onClick={onClose}>DONE</button>
        </div>
      </section>
    </div>
  )
}

function AudioChannel({ label, value, muted, onVolume, onMute }: { label: string; value: number; muted: boolean; onVolume: (value: number) => void; onMute: () => void }) {
  return (
    <div className={`audio-channel ${muted ? 'muted' : ''}`}>
      <div className="audio-channel-title"><b>{label}</b><button onClick={onMute}>{muted ? 'OFF' : 'ON'}</button></div>
      <label className="audio-slider"><span><i>{percent(value)}%</i></span><input aria-label={`${label} volume`} type="range" min="0" max="100" value={percent(value)} onChange={(event) => onVolume(Number(event.target.value) / 100)} /></label>
    </div>
  )
}
