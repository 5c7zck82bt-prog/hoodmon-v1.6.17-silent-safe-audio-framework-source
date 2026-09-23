import { useGame } from '../game/GameContext'
import type { Phase } from '../game/engine/types'

const phases: Phase[] = ['Refresh', 'Draw', 'Bond', 'Main', 'Command', 'End']

export function PhaseBar() {
  const { state } = useGame()
  return (
    <div className="phase-bar">
      {phases.map((phase) => (
        <div key={phase} className={`phase-pill ${state.currentPhase === phase ? 'active' : ''}`}>{phase}</div>
      ))}
    </div>
  )
}
