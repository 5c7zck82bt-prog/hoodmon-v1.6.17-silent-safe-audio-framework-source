import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { cardById } from '../data/series1Cards'
import { useGame } from '../game/GameContext'
import type { CardDefinition, PlayerId } from '../game/engine/types'
import { definitionEffectLabel } from '../game/series1Runtime'

interface BattleHandProps {
  playerId: PlayerId
  selectedCardId: string | null
  onSelectedCardChange: (cardId: string | null) => void
  onDraggingCardChange: (cardId: string | null) => void
}

function cardCornerValue(definition: CardDefinition | undefined) {
  if (!definition) return { label: 'CARD', value: '' }
  if (definition.cardType === 'task') return { label: 'DIFF', value: String(definition.taskDifficulty ?? '—') }
  if (definition.cardType === 'hoodmon') return { label: 'BOND', value: String(definition.bondCost ?? 0) }
  if (definition.cardType === 'tamer') return { label: 'COST', value: String(definition.bondCost ?? 0) }
  return { label: 'COST', value: String(definition.bondCost ?? 0) }
}

function cardPreviewResource(definition: CardDefinition | undefined) {
  if (!definition) return 'CARD'
  if (definition.cardType === 'task') return `DIFFICULTY ${definition.taskDifficulty ?? '—'}`
  if (definition.cardType === 'hoodmon') return `BOND COST ${definition.bondCost ?? 0}`
  return `COST ${definition.bondCost ?? 0}`
}

export function BattleHand({ playerId, selectedCardId, onSelectedCardChange, onDraggingCardChange }: BattleHandProps) {
  const { state, definitions } = useGame()
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())
  const player = state.players[playerId]
  const handPlayEnabled = state.status === 'active' && state.currentPlayerTurn === playerId && state.currentPhase === 'Main'
  const previewId = hoveredCardId ?? selectedCardId
  const preview = previewId ? cardById[previewId] : undefined
  const previewDefinition = previewId ? definitions[previewId] : undefined
  const markImageFailed = (cardId: string) => setFailedImages((current) => {
    if (current.has(cardId)) return current
    const next = new Set(current)
    next.add(cardId)
    return next
  })

  const instances = useMemo(() => {
    const seen: Record<string, number> = {}
    return player.hand.map((id) => {
      seen[id] = (seen[id] ?? 0) + 1
      return { id, key: `${id}-${seen[id]}` }
    })
  }, [player.hand])

  useEffect(() => {
    if (!selectedCardId) {
      if (selectedCardKey) setSelectedCardKey(null)
      return
    }
    const matching = instances.filter((entry) => entry.id === selectedCardId)
    if (!matching.some((entry) => entry.key === selectedCardKey)) setSelectedCardKey(matching[0]?.key ?? null)
  }, [instances, selectedCardId, selectedCardKey])

  const startDrag = (event: DragEvent<HTMLButtonElement>, cardId: string, cardKey: string) => {
    if (!handPlayEnabled) {
      event.preventDefault()
      return
    }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/hoodmon-card-id', cardId)
    setSelectedCardKey(cardKey)
    onDraggingCardChange(cardId)
    onSelectedCardChange(cardId)
  }

  const endDrag = () => onDraggingCardChange(null)

  return (
    <section className="battle-hand-shell" aria-label={`${playerId} hand`}>
      <div className="hand-heading">
        <div><span className="eyebrow">YOUR HAND</span><strong>{player.hand.length} CARDS</strong></div>
        <small>{handPlayEnabled ? 'DRAG A CARD TO A GLOWING ZONE · OR SELECT THEN CLICK THE ZONE' : 'YOUR HAND STAYS VISIBLE · CARD PLAY UNLOCKS DURING YOUR MAIN PHASE'}</small>
      </div>

      <div className="battle-hand-fan">
        {instances.length === 0 && <div className="empty-hand">NO CARDS IN HAND</div>}
        {instances.map(({ id, key }, index) => {
          const art = cardById[id]
          const definition = definitions[id]
          const selected = selectedCardId === id && selectedCardKey === key
          return (
            <button
              type="button"
              className={`hand-card ${selected ? 'selected' : ''} ${handPlayEnabled ? 'play-enabled' : 'play-locked'}`}
              key={key}
              draggable={handPlayEnabled}
              onDragStart={(event) => startDrag(event, id, key)}
              onDragEnd={endDrag}
              onMouseEnter={() => setHoveredCardId(id)}
              onMouseLeave={() => setHoveredCardId(null)}
              onClick={() => {
                if (selected) {
                  setSelectedCardKey(null)
                  onSelectedCardChange(null)
                } else {
                  setSelectedCardKey(key)
                  onSelectedCardChange(id)
                }
              }}
              style={{ zIndex: index + 1 }}
              aria-label={`${definition?.name ?? id}${selected ? ', selected' : ''}`}
              data-audio-cue="card_pickup"
            >
              {art && !failedImages.has(id) ? (
                <img src={art.image} alt={definition?.name ?? id} draggable={false} onError={() => markImageFailed(id)} />
              ) : (
                <span className="hand-card-fallback"><b>{definition?.name ?? id}</b><small>{id}</small></span>
              )}
              <span className="hand-card-cost" title={cardCornerValue(definition).label}>{cardCornerValue(definition).value}</span>
            </button>
          )
        })}
      </div>

      {previewId && (
        <aside className="hand-preview">
          {preview && !failedImages.has(previewId) ? (
            <img src={preview.image} alt="" onError={() => markImageFailed(previewId)} />
          ) : (
            <div className="preview-fallback">{previewDefinition?.name ?? previewId}</div>
          )}
          <div>
            <span className="eyebrow">SELECTED / PREVIEW</span>
            <strong>{previewDefinition?.name ?? previewId}</strong>
            <small>{previewDefinition?.cardType.toUpperCase() ?? 'CARD'}{previewDefinition?.stageLevel ? ` · STAGE ${previewDefinition.stageLevel}` : ''} · {cardPreviewResource(previewDefinition)}</small>
            <small className={`effect-data-status ${previewDefinition?.effectStatus === 'pending' ? 'pending' : 'verified'}`}>{definitionEffectLabel(previewId)}</small>
          </div>
        </aside>
      )}
    </section>
  )
}
