import { useState } from 'react'
import { useGame } from '../game/GameContext'
import type { Phase } from '../game/engine/types'

const phases: Phase[] = ['Refresh', 'Draw', 'Bond', 'Main', 'Command', 'End']

const phaseHelp: Record<Phase, string> = {
  Refresh: 'Ready your eligible cards. Damage remains unless an effect heals it.',
  Draw: 'Draw 1 card from your Main Deck. A required draw from an empty deck loses the match.',
  Bond: 'Gain +1 Bond, up to 10. Unspent Bond carries over.',
  Main: 'Deploy, evolve, and play Field, Magic, Equipment, or Trap cards.',
  Command: 'Use ready Hoodmons to attack, attempt Tasks, or use legal Command abilities.',
  End: 'Resolve end-of-turn effects, then pass play to the opponent.',
}

export function PhaseBar() {
  const { state } = useGame()
  const [open, setOpen] = useState(true)

  if (!open) {
    return (
      <div className="phase-bar phase-tutorial-collapsed">
        <button type="button" className="phase-tutorial-reopen" onClick={() => setOpen(true)} aria-label="Open phase tutorial">
          ? <span>{state.currentPhase}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="phase-bar phase-tutorial-bubble" role="status" aria-live="polite">
      <div className="phase-tutorial-heading">
        <div>
          <span className="eyebrow">CURRENT PHASE</span>
          <strong>{state.currentPhase.toUpperCase()}</strong>
        </div>
        <button type="button" className="phase-tutorial-close" onClick={() => setOpen(false)} aria-label="Close phase tutorial">×</button>
      </div>
      <p>{phaseHelp[state.currentPhase]}</p>
      <div className="phase-tutorial-track" aria-label="Turn phase progression">
        {phases.map((phase) => (
          <span key={phase} className={`phase-pill ${state.currentPhase === phase ? 'active' : ''}`}>{phase}</span>
        ))}
      </div>
    </div>
  )
}
