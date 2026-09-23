import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useGame } from '../game/GameContext'
import { cardById } from '../data/series1Cards'
import { canDropOnHoodmonSlot, canDropOnSupportZone, type HoodmonDropTarget } from '../game/handLegality'
import type { SupportTarget } from '../game/engine/support'
import type { CardInstance, PlayerId } from '../game/engine/types'
import { COMPLETED_TASKS_TO_WIN } from '../game/engine/constants'
import { effectiveAtk, effectiveHp, effectiveTask } from '../game/engine/helpers'
import { CardZoomViewer } from './CardZoomViewer'

type SlotImpact = { kind: 'deploy' | 'evolve' | 'damage' | 'ko' | 'switch' | 'leave'; ghostDefinitionId?: string }
type BoardInspection = { definitionId: string; instance: CardInstance | null; zoneLabel: string }
type InspectHandler = (definitionId: string, instance: CardInstance | null, zoneLabel: string) => void

type ActivateHandler = (definitionId: string, instance: CardInstance | null, zoneLabel: string) => void

interface PlayerPanelProps {
  playerId: PlayerId
  opponent?: boolean
  handCardId?: string | null
  acceptHandDrops?: boolean
  onCardPlayed?: () => void
}

export function PlayerPanel({ playerId, opponent = false, handCardId = null, acceptHandDrops = false, onCardPlayed }: PlayerPanelProps) {
  const { state, definitions, actions } = useGame()
  const player = state.players[playerId]
  const isTurn = state.currentPlayerTurn === playerId
  const tamerDefinition = player.tamer ? definitions[player.tamer.definitionId] : undefined
  const tamerArt = player.tamer ? cardById[player.tamer.definitionId] : undefined
  const slots = [player.activeHoodmon, ...player.reserves]
  const slotSignature = slots.map((card) => card ? `${card.instanceId}:${card.definitionId}:${card.damageTaken}` : '-').join('|')
  const previousSlotsRef = useRef<Array<CardInstance | null> | null>(null)
  const impactTimersRef = useRef<Record<number, number>>({})
  const [slotImpacts, setSlotImpacts] = useState<Record<number, SlotImpact>>({})
  const [hoverInspection, setHoverInspection] = useState<BoardInspection | null>(null)
  const [selectedInspection, setSelectedInspection] = useState<BoardInspection | null>(null)
  const [selectedInspectionKey, setSelectedInspectionKey] = useState<string | null>(null)
  const [zoomedDefinitionId, setZoomedDefinitionId] = useState<string | null>(null)
  const inspection = hoverInspection ?? selectedInspection

  const inspectCard: InspectHandler = (definitionId, instance, zoneLabel) => setHoverInspection({ definitionId, instance, zoneLabel })
  const clearInspection = () => setHoverInspection(null)
  const activateVisibleCard: ActivateHandler = (definitionId, instance, zoneLabel) => {
    const key = `${zoneLabel}:${instance?.instanceId ?? definitionId}`
    if (selectedInspectionKey === key) {
      setZoomedDefinitionId(definitionId)
      return
    }
    setSelectedInspection({ definitionId, instance, zoneLabel })
    setSelectedInspectionKey(key)
  }

  useEffect(() => {
    const snapshot = slots.map((card) => card ? { ...card, statuses: [...(card.statuses ?? [])] } : null)
    const previous = previousSlotsRef.current
    previousSlotsRef.current = snapshot
    if (!previous) return

    const currentIds = new Set(snapshot.filter(Boolean).map((card) => card!.instanceId))
    const previousIds = new Set(previous.filter(Boolean).map((card) => card!.instanceId))
    const nextImpacts: Record<number, SlotImpact> = {}

    snapshot.forEach((card, index) => {
      const before = previous[index]
      if (before && card && before.instanceId === card.instanceId) {
        if (before.definitionId !== card.definitionId) nextImpacts[index] = { kind: 'evolve' }
        else if (card.damageTaken > before.damageTaken) nextImpacts[index] = { kind: 'damage' }
        return
      }
      if (!before && card) {
        nextImpacts[index] = { kind: previousIds.has(card.instanceId) ? 'switch' : 'deploy' }
        return
      }
      if (before && !card) {
        if (currentIds.has(before.instanceId)) return
        const beforeName = definitions[before.definitionId]?.name ?? before.definitionId
        const wasDefeated = state.eventLog.slice(-5).some((line) => line.includes(`${beforeName} was defeated.`))
        nextImpacts[index] = { kind: wasDefeated ? 'ko' : 'leave', ghostDefinitionId: before.definitionId }
        return
      }
      if (before && card && before.instanceId !== card.instanceId) {
        nextImpacts[index] = { kind: previousIds.has(card.instanceId) ? 'switch' : 'deploy' }
      }
    })

    const entries = Object.entries(nextImpacts)
    if (!entries.length) return
    setSlotImpacts((current) => ({ ...current, ...nextImpacts }))
    for (const [rawIndex, impact] of entries) {
      const index = Number(rawIndex)
      const existing = impactTimersRef.current[index]
      if (existing) window.clearTimeout(existing)
      const duration = impact.kind === 'ko' || impact.kind === 'leave' ? 760 : impact.kind === 'evolve' ? 900 : 620
      impactTimersRef.current[index] = window.setTimeout(() => {
        setSlotImpacts((current) => {
          const next = { ...current }
          delete next[index]
          return next
        })
        delete impactTimersRef.current[index]
      }, duration)
    }
  }, [slotSignature])

  useEffect(() => () => {
    Object.values(impactTimersRef.current).forEach((timer) => window.clearTimeout(timer))
  }, [])

  const draggedCard = (event: DragEvent<HTMLElement>) => event.dataTransfer.getData('text/hoodmon-card-id') || handCardId || ''

  const dropSupport = (event: DragEvent<HTMLElement>, target: SupportTarget) => {
    if (!acceptHandDrops) return
    event.preventDefault()
    const cardId = draggedCard(event)
    if (!cardId) return
    actions.playSupport(cardId, target)
    onCardPlayed?.()
  }

  const clickSupport = (target: SupportTarget) => {
    if (!acceptHandDrops || !handCardId) return
    actions.playSupport(handCardId, target)
    onCardPlayed?.()
  }

  const dropHoodmon = (event: DragEvent<HTMLElement>, target: HoodmonDropTarget, occupant: CardInstance | null) => {
    if (!acceptHandDrops) return
    event.preventDefault()
    const cardId = draggedCard(event)
    if (!cardId) return
    if (occupant) actions.evolve(occupant.instanceId, cardId)
    else actions.deploy(cardId, target)
    onCardPlayed?.()
  }

  const clickHoodmon = (target: HoodmonDropTarget, occupant: CardInstance | null) => {
    if (!acceptHandDrops || !handCardId) return
    if (occupant) actions.evolve(occupant.instanceId, handCardId)
    else actions.deploy(handCardId, target)
    onCardPlayed?.()
  }

  return (
    <section className={`player-panel ${opponent ? 'opponent' : ''} ${isTurn ? 'turn-owner' : ''}`}>
      <div className="player-header">
        <div>
          <span className="eyebrow">{playerId === 'P1' ? 'PLAYER 1' : 'PLAYER 2'}</span>
          <strong>{isTurn ? '● ACTIVE TURN' : 'WAITING'}</strong>
        </div>
        <div className="stat-row">
          <span>LP <b>{player.lp}</b></span>
          <span>BOND <b>{player.bond}/10</b></span>
          <span>TASKS <b>{player.completedTasks}/{COMPLETED_TASKS_TO_WIN}</b></span>
          <span>HAND <b>{player.hand.length}</b></span>
        </div>
      </div>

      <div className="task-race-strip" aria-label={`${player.completedTasks} of ${COMPLETED_TASKS_TO_WIN} Tasks completed`}>
        <span>TASK WIN PROGRESS</span>
        <div className="task-race-track"><i style={{ width: `${Math.min(100, (player.completedTasks / COMPLETED_TASKS_TO_WIN) * 100)}%` }} /></div>
        <b>{player.completedTasks}/{COMPLETED_TASKS_TO_WIN}</b>
      </div>

      <div className="zone-row">
        <div
          className={`zone tamer-zone ${player.tamer ? 'filled board-face-readable' : ''}`}
          tabIndex={player.tamer ? 0 : undefined}
          onMouseEnter={() => player.tamer && inspectCard(player.tamer.definitionId, player.tamer, 'TAMER')}
          onMouseLeave={clearInspection}
          onFocus={() => player.tamer && inspectCard(player.tamer.definitionId, player.tamer, 'TAMER')}
          onBlur={clearInspection}
          onClick={() => player.tamer && activateVisibleCard(player.tamer.definitionId, player.tamer, 'TAMER')}
          role={player.tamer ? 'button' : undefined}
          onKeyDown={player.tamer ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              activateVisibleCard(player.tamer!.definitionId, player.tamer, 'TAMER')
            }
          } : undefined}
        >
          {tamerArt && <img src={tamerArt.image} alt="" />}
          <span>TAMER</span>
          <small>{tamerDefinition?.name ?? 'UNASSIGNED'}{player.tamer ? ` · ${player.tamer.readyState.toUpperCase()}` : ''}</small>
        </div>
        <SupportZone title="FIELD" card={player.field} target="field" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'field')} onDrop={dropSupport} onClick={clickSupport} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
        <SupportZone title="MAGIC / EQUIP 1" card={player.magic[0]} target="magic_1" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'magic_1')} onDrop={dropSupport} onClick={clickSupport} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
        <SupportZone title="MAGIC / EQUIP 2" card={player.magic[1]} target="magic_2" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'magic_2')} onDrop={dropSupport} onClick={clickSupport} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
        <SupportZone title="MAGIC / EQUIP 3" card={player.magic[2]} target="magic_3" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'magic_3')} onDrop={dropSupport} onClick={clickSupport} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
        <SupportZone title="TRAP 1" card={player.traps[0]} target="trap_1" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'trap_1')} onDrop={dropSupport} onClick={clickSupport} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
        <SupportZone title="TRAP 2" card={player.traps[1]} target="trap_2" opponent={opponent} valid={acceptHandDrops && canDropOnSupportZone(state, definitions, playerId, handCardId, 'trap_2')} onDrop={dropSupport} onClick={clickSupport} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
      </div>

      <div className="hoodmon-row">
        <HoodmonSlot card={player.activeHoodmon} title="ACTIVE HOODMON" target="active" active impact={slotImpacts[0]} valid={acceptHandDrops && canDropOnHoodmonSlot(state, definitions, playerId, handCardId, 'active', player.activeHoodmon)} onDrop={dropHoodmon} onClick={clickHoodmon} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
        {player.reserves.map((card, index) => {
          const target = `reserve_${index + 1}` as HoodmonDropTarget
          return <HoodmonSlot key={index} card={card} title={`RESERVE ${index + 1}`} target={target} impact={slotImpacts[index + 1]} valid={acceptHandDrops && canDropOnHoodmonSlot(state, definitions, playerId, handCardId, target, card)} onDrop={dropHoodmon} onClick={clickHoodmon} onInspect={inspectCard} onInspectEnd={clearInspection} onActivate={activateVisibleCard} />
        })}
      </div>

      <div className="task-row">
        <span className="eyebrow">FACE-UP TASKS · EITHER PLAYER MAY ATTEMPT</span>
        {player.taskZone.map((task, index) => {
          const definition = task ? definitions[task] : undefined
          const zoneLabel = `TASK ${index + 1}`
          return (
            <div
              className={`task-slot ${task ? 'filled board-face-readable' : ''}`}
              key={index}
              tabIndex={task ? 0 : undefined}
              onMouseEnter={() => task && inspectCard(task, null, zoneLabel)}
              onMouseLeave={clearInspection}
              onFocus={() => task && inspectCard(task, null, zoneLabel)}
              onBlur={clearInspection}
              onClick={() => task && activateVisibleCard(task, null, zoneLabel)}
              role={task ? 'button' : undefined}
              onKeyDown={task ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  activateVisibleCard(task, null, zoneLabel)
                }
              } : undefined}
            >
              {definition ? (
                <><b>{definition.name}</b><small>{definition.taskTier ?? 'Task'} · Difficulty {definition.taskDifficulty ?? 0} · +1 Completed Task</small></>
              ) : 'EMPTY'}
            </div>
          )
        })}
        <div className="deck-count">TASK DECK <b>{player.taskDeck.length}</b></div>
        <div className="deck-count">MAIN DECK <b>{player.hoodmonDeck.length}</b></div>
        {(state.players.P1.field?.definitionId === 'HDM-083' || state.players.P2.field?.definitionId === 'HDM-083') && (
          <div className="deck-count truth-network-reveal">TOP REVEALED <b>{player.hoodmonDeck[0] ? (definitions[player.hoodmonDeck[0]]?.name ?? player.hoodmonDeck[0]) : 'EMPTY'}</b></div>
        )}
        <div className="deck-count">DISCARD <b>{player.discard.length}</b></div>
      </div>

      {inspection && <BoardCardInspector inspection={inspection} />}
      <CardZoomViewer definitionId={zoomedDefinitionId} onClose={() => setZoomedDefinitionId(null)} />
    </section>
  )
}

function BoardCardInspector({ inspection }: { inspection: BoardInspection }) {
  const { definitions } = useGame()
  const definition = definitions[inspection.definitionId]
  const art = cardById[inspection.definitionId]
  if (!definition) return null

  const instance = inspection.instance
  const atk = effectiveAtk(definition, instance)
  const hp = effectiveHp(definition, instance)
  const task = effectiveTask(definition, instance)
  const remainingHp = instance && hp > 0 ? Math.max(0, hp - instance.damageTaken) : hp
  const effectText = definition.effectText?.trim()
  const typeLabel = definition.cardType.toUpperCase()

  return (
    <aside className="board-card-inspector" aria-live="polite">
      {art && <img src={art.image} alt="" />}
      <div className="board-inspector-copy">
        <span>{inspection.zoneLabel} · {typeLabel}{definition.stageLevel ? ` · STAGE ${definition.stageLevel}` : ''}</span>
        <strong>{definition.name}</strong>
        <div className="board-inspector-stats">
          {definition.cardType === 'hoodmon' && <><small>ATK <b>{atk}</b></small><small>HP <b>{remainingHp}/{hp}</b></small><small>TASK <b>{task}</b></small></>}
          {definition.cardType === 'task' && <><small>DIFFICULTY <b>{definition.taskDifficulty ?? 0}</b></small><small>TIER <b>{definition.taskTier ?? 'TASK'}</b></small></>}
          {definition.cardType !== 'hoodmon' && definition.cardType !== 'task' && <small>COST <b>{definition.bondCost ?? 0}</b></small>}
          {definition.magicSubtype && <small>TYPE <b>{definition.magicSubtype}</b></small>}
          {instance && <small>STATE <b>{instance.readyState.toUpperCase()}</b></small>}
        </div>
        {definition.attacks && definition.attacks.length > 0 && (
          <div className="board-inspector-attacks">
            {definition.attacks.map((attack) => <small key={attack.attackName}><b>{attack.attackName}</b> · {attack.baseDamage} DMG{attack.cost ? ` · ${attack.cost} Bond` : ''}</small>)}
          </div>
        )}
        <p className="board-inspector-effect">{effectText || 'No additional effect text.'}</p>
      </div>
    </aside>
  )
}

function HoodmonSlot({ card, title, target, active = false, impact, valid, onDrop, onClick, onInspect, onInspectEnd, onActivate }: {
  card: CardInstance | null
  title: string
  target: HoodmonDropTarget
  active?: boolean
  impact?: SlotImpact
  valid: boolean
  onDrop: (event: DragEvent<HTMLElement>, target: HoodmonDropTarget, occupant: CardInstance | null) => void
  onClick: (target: HoodmonDropTarget, occupant: CardInstance | null) => void
  onInspect: InspectHandler
  onInspectEnd: () => void
  onActivate: ActivateHandler
}) {
  const { definitions } = useGame()
  const definition = card ? definitions[card.definitionId] : undefined
  const art = card ? cardById[card.definitionId] : undefined
  const hp = effectiveHp(definition, card)
  const atk = effectiveAtk(definition, card)
  const task = effectiveTask(definition, card)
  const remainingHp = Math.max(0, hp - (card?.damageTaken ?? 0))
  const healthPct = hp > 0 ? Math.max(0, Math.min(100, (remainingHp / hp) * 100)) : 0

  const className = `hoodmon-slot ${active ? 'active-card' : 'reserve-card'} ${!card ? 'empty' : 'has-card board-face-readable'} ${card?.readyState === 'exhausted' ? 'exhausted' : ''} ${healthPct <= 35 && card ? 'critical-hp' : ''} ${valid ? 'valid-drop' : ''} ${impact ? `impact-${impact.kind}` : ''}`
  const ghostArt = impact?.ghostDefinitionId ? cardById[impact.ghostDefinitionId] : undefined

  const activateOrPlay = () => {
    if (valid) {
      onClick(target, card)
      return
    }
    if (card) onActivate(card.definitionId, card, title)
  }

  return (
    <div
      className={className}
      onDragOver={(event) => { if (valid) event.preventDefault() }}
      onDrop={valid ? (event) => onDrop(event, target, card) : undefined}
      onClick={card || valid ? activateOrPlay : undefined}
      onMouseEnter={() => card && onInspect(card.definitionId, card, title)}
      onMouseLeave={onInspectEnd}
      onFocus={() => card && onInspect(card.definitionId, card, title)}
      onBlur={onInspectEnd}
      role={card || valid ? 'button' : undefined}
      tabIndex={card || valid ? 0 : undefined}
      onKeyDown={card || valid ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activateOrPlay()
        }
      } : undefined}
    >
      {ghostArt && (impact?.kind === 'ko' || impact?.kind === 'leave') && (
        <div className={`hoodmon-exit-ghost ${impact.kind}`} aria-hidden="true"><img src={ghostArt.image} alt="" /></div>
      )}
      {!card ? (
        <><span>{title}</span><small>{valid ? 'DROP CARD HERE' : 'EMPTY'}</small></>
      ) : (
        <>
          {art && <img className="battle-card-art" src={art.image} alt="" />}
          <div className="battle-card-copy">
            <div className="hoodmon-slot-heading"><span className="eyebrow">{valid ? 'EVOLVE HERE' : title}</span><span className={`readiness-badge ${card.readyState}`}>{card.readyState.toUpperCase()}</span></div>
            <strong>{definition?.name ?? card.definitionId}</strong>
            <small>HP {remainingHp}/{hp || '?'} · {healthPct <= 35 ? 'DANGER' : 'STABLE'}</small>
            <div className="battle-status-row">
              {card.statuses?.includes('charmed') && <small className="status-chip charmed">CHARMED</small>}
              {card.statuses?.includes('marked') && <small className="status-chip marked">MARKED</small>}
            </div>
            <div className="health-track" aria-label={`${remainingHp} of ${hp} HP`}><i style={{ width: `${healthPct}%` }} /></div>
            {definition && <div className="hoodmon-statline"><small>ATK <b>{atk}</b></small><small>TASK <b>{task}</b></small><small>CMD <b>{card.commandsUsedThisTurn}/1</b></small></div>}
          </div>
        </>
      )}
    </div>
  )
}

function SupportZone({ title, card, target, opponent, valid, onDrop, onClick, onInspect, onInspectEnd, onActivate }: {
  title: string
  card: CardInstance | null
  target: SupportTarget
  opponent: boolean
  valid: boolean
  onDrop: (event: DragEvent<HTMLElement>, target: SupportTarget) => void
  onClick: (target: SupportTarget) => void
  onInspect: InspectHandler
  onInspectEnd: () => void
  onActivate: ActivateHandler
}) {
  const { definitions } = useGame()
  const definition = card ? definitions[card.definitionId] : undefined
  const art = card ? cardById[card.definitionId] : undefined
  const hiddenTrap = opponent && target.startsWith('trap_') && Boolean(card)
  const readable = Boolean(card) && !hiddenTrap

  const activateOrPlay = () => {
    if (valid) {
      onClick(target)
      return
    }
    if (readable && card) onActivate(card.definitionId, card, title)
  }

  return (
    <div
      className={`zone support-zone ${card ? 'filled' : ''} ${readable ? 'board-face-readable' : ''} ${valid ? 'valid-drop' : ''}`}
      onDragOver={(event) => { if (valid) event.preventDefault() }}
      onDrop={valid ? (event) => onDrop(event, target) : undefined}
      onClick={readable || valid ? activateOrPlay : undefined}
      onMouseEnter={() => readable && card && onInspect(card.definitionId, card, title)}
      onMouseLeave={onInspectEnd}
      onFocus={() => readable && card && onInspect(card.definitionId, card, title)}
      onBlur={onInspectEnd}
      role={readable || valid ? 'button' : undefined}
      tabIndex={readable || valid ? 0 : undefined}
      onKeyDown={readable || valid ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activateOrPlay()
        }
      } : undefined}
    >
      <span className="zone-name">{title}</span>
      {card ? (
        hiddenTrap ? <div className="trap-card-back"><b>♛</b><span>SET TRAP</span></div> : (
          <>
            {art && <img className="support-card-art" src={art.image} alt="" />}
            <small>{definition?.name ?? card.definitionId}</small>
          </>
        )
      ) : <small>{valid ? 'DROP CARD HERE' : 'OPEN'}</small>}
    </div>
  )
}
