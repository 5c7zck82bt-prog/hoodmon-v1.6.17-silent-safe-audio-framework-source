import { useEffect, useMemo, useState } from 'react'
import { cardById } from '../data/series1Cards'
import { useGame } from '../game/GameContext'

export function PendingChoicePanel() {
  const { state, definitions, actions } = useGame()
  const choice = state.pendingChoice
  const [selected, setSelected] = useState<string[]>([])

  const signature = useMemo(() => choice
    ? `${choice.actionKey}|${choice.sourceInstanceId ?? ''}|${choice.options.map((option) => option.id).join(',')}`
    : '', [choice])

  useEffect(() => { setSelected([]) }, [signature])

  if (!choice || state.status !== 'choice') return null

  if (choice.player === 'P2' && !state.localFaceToFaceMode) {
    return (
      <div className="choice-panel ai-choice-panel">
        <div className="choice-heading">
          <span className="eyebrow">CARD EFFECT CHOICE</span>
          <h3>OPPONENT IS RESOLVING {definitions[choice.sourceCardId]?.name ?? choice.sourceCardId}</h3>
          <p>{choice.prompt}</p>
        </div>
      </div>
    )
  }

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id)
      if (choice.maxSelections <= 1) return [id]
      if (current.length >= choice.maxSelections) return current
      return [...current, id]
    })
  }

  const canConfirm = selected.length >= choice.minSelections && selected.length <= choice.maxSelections
  const source = definitions[choice.sourceCardId]

  return (
    <div className="choice-panel">
      <div className="choice-heading">
        <span className="eyebrow">CARD EFFECT CHOICE · {choice.player}</span>
        <h3>{source?.name ?? choice.sourceCardId}</h3>
        <p>{choice.prompt}</p>
        <small>SELECT {choice.minSelections === choice.maxSelections ? choice.maxSelections : `${choice.minSelections}–${choice.maxSelections}`} · {selected.length} CHOSEN</small>
      </div>

      <div className="choice-options">
        {choice.options.map((option) => {
          const art = option.cardId ? cardById[option.cardId] : undefined
          const active = selected.includes(option.id)
          return (
            <button
              type="button"
              className={`choice-option ${active ? 'selected' : ''}`}
              key={option.id}
              onClick={() => toggle(option.id)}
              aria-pressed={active}
            >
              {art && <img src={art.image} alt="" />}
              <span><b>{option.label}</b>{option.detail && <small>{option.detail}</small>}</span>
            </button>
          )
        })}
      </div>

      <div className="choice-actions">
        {choice.minSelections === 0 && <button className="ghost" onClick={() => actions.resolveChoice(choice.player, [])}>SKIP / CHOOSE NONE</button>}
        <button disabled={!canConfirm} onClick={() => actions.resolveChoice(choice.player, selected)}>CONFIRM EFFECT</button>
      </div>
    </div>
  )
}
