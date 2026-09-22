import { useEffect, useState, type CSSProperties } from 'react'
import { useGame } from '../game/GameContext'
import type { CardInstance, Phase, PlayerId } from '../game/engine/types'
import { legalReactionCardIds } from '../game/engine/reactions'
import { PendingChoicePanel } from './PendingChoicePanel'
import { hoodmonCanAttemptTask, taskCanBeAttempted } from '../game/engine/tasks'
import { tamerActivationReady } from '../game/engine/cardEffects'
import { COMPLETED_TASKS_TO_WIN } from '../game/engine/constants'

const phaseOrder: Phase[] = ['Refresh', 'Draw', 'Bond', 'Main', 'Command', 'End']

export const REACTION_DECISION_SECONDS = 10
export const NO_LEGAL_REACTION_SECONDS = 2
export const AI_REACTION_DISPLAY_SECONDS = 2

function nextPhaseLabel(phase: Phase) {
  const index = phaseOrder.indexOf(phase)
  return phase === 'End' ? 'END TURN' : `GO TO ${phaseOrder[index + 1].toUpperCase()}`
}

const phaseHelp: Record<Phase, string> = {
  Refresh: 'All eligible cards have readied. Damage stays on Hoodmon unless an effect heals it.',
  Draw: 'Draw 1 from the 40-card Hoodmon Deck. If you are required to draw while your Main Deck is empty, you lose by deck-out.',
  Bond: 'Gain +1 Bond, up to 10. Unspent Bond carries over between turns.',
  Main: 'Deploy 1 Basic from hand, evolve any legal Active/Reserve Hoodmon from Round 2 onward, and play setup cards.',
  Command: 'Each ready Hoodmon normally gets 1 Command. Active may Battle or Task; Reserves may Task. Every successful Task adds +1 toward the 10-Task win.',
  End: 'Resolve end effects, refill an empty Task source zone if needed, then pass the turn.',
}

export function BattleControls() {
  const { state, definitions, actions } = useGame()
  const [setupActive, setSetupActive] = useState<string>('')
  const [setupReserve, setSetupReserve] = useState<string>('')
  const reaction = state.reactionWindow
  const [reactionSecondsLeft, setReactionSecondsLeft] = useState(REACTION_DECISION_SECONDS)
  const bothReactionPlayersAnswered = Boolean(reaction?.nonActivePlayerResponded && reaction?.activePlayerResponded)
  const humanHasReactionPriority = Boolean(reaction && (state.localFaceToFaceMode || reaction.priority === 'P1'))
  const aiHasReactionPriority = Boolean(reaction && !state.localFaceToFaceMode && reaction.priority === 'P2')
  const legalPriorityReactions = reaction ? legalReactionCardIds(state, definitions, reaction.priority) : []
  const reactionTimerLimit = aiHasReactionPriority
    ? AI_REACTION_DISPLAY_SECONDS
    : (legalPriorityReactions.length > 0 ? REACTION_DECISION_SECONDS : NO_LEGAL_REACTION_SECONDS)
  const reactionTimerKey = reaction
    ? `${state.turnNumber}:${reaction.openedBy}:${reaction.priority}:${reaction.nonActivePlayerResponded ? 1 : 0}:${reaction.activePlayerResponded ? 1 : 0}:${reaction.responseCards.length}:${reaction.resolving ? 1 : 0}`
    : 'none'

  useEffect(() => {
    setReactionSecondsLeft(reactionTimerLimit)
    if (state.status !== 'reaction' || !reaction || bothReactionPlayersAnswered || (!humanHasReactionPriority && !aiHasReactionPriority)) return

    const priorityAtStart = reaction.priority
    const deadline = Date.now() + reactionTimerLimit * 1000
    const updateCountdown = () => {
      setReactionSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }
    updateCountdown()
    const interval = window.setInterval(updateCountdown, 200)
    const timeout = humanHasReactionPriority
      ? window.setTimeout(() => { actions.passReaction(priorityAtStart) }, reactionTimerLimit * 1000)
      : undefined

    return () => {
      window.clearInterval(interval)
      if (timeout !== undefined) window.clearTimeout(timeout)
    }
  }, [actions, aiHasReactionPriority, bothReactionPlayersAnswered, humanHasReactionPriority, reactionTimerKey, reactionTimerLimit, state.status])

  if (state.status === 'setup') {
    const hand = state.players.P1.hand
    const basics = hand.filter((id) => definitions[id]?.cardType === 'hoodmon' && definitions[id]?.stageLevel === 1)
    const uniqueBasics = [...new Set(basics)]
    const active = setupActive || uniqueBasics[0] || ''
    const reserveOptions = uniqueBasics.filter((id) => id !== active || basics.filter((entry) => entry === id).length > 1)
    return (
      <div className="setup-panel">
        <span className="eyebrow">OPENING SETUP · FREE PLACEMENT</span>
        <h2>CHOOSE YOUR STARTING HOODMON</h2>
        <p>Choose 1 Basic from your opening hand as Active. You may also choose 1 Basic Reserve. These setup placements cost no Bond.</p>
        <div className="setup-choice-grid">
          <label>ACTIVE<select value={active} onChange={(e) => { setSetupActive(e.target.value); setSetupReserve('') }}>
            {uniqueBasics.map((id) => <option key={id} value={id}>{definitions[id]?.name ?? id}</option>)}
          </select></label>
          <label>OPTIONAL RESERVE<select value={setupReserve} onChange={(e) => setSetupReserve(e.target.value)}>
            <option value="">NO STARTING RESERVE</option>
            {reserveOptions.map((id) => <option key={id} value={id}>{definitions[id]?.name ?? id}</option>)}
          </select></label>
        </div>
        <button disabled={!active} onClick={() => actions.chooseStarting(active, setupReserve || undefined)}>LOCK STARTING FIELD</button>
      </div>
    )
  }

  if (state.winner) {
    const winner = state.players[state.winner.player]
    const loserId: PlayerId = state.winner.player === 'P1' ? 'P2' : 'P1'
    const loser = state.players[loserId]
    const resultLabel = state.winner.reason === 'tasks' ? '10 TASKS COMPLETED' : state.winner.reason === 'deckout' ? 'REQUIRED DRAW · EMPTY DECK' : 'OPPONENT LP DEPLETED'
    return (
      <div className={`victory-panel winner-${state.winner.player.toLowerCase()}`}>
        <div className="victory-impact-ring victory-impact-ring-a" aria-hidden="true" />
        <div className="victory-impact-ring victory-impact-ring-b" aria-hidden="true" />
        <div className="victory-confetti" aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => <i key={index} style={{ left: `${6 + index * 5.7}%`, animationDelay: `${index * 0.045}s`, animationDuration: `${1.45 + index * 0.035}s` } as CSSProperties} />)}
        </div>
        <div className="victory-emblem">♛</div>
        <span className="eyebrow">MATCH COMPLETE · {state.winner.reason.toUpperCase()}</span>
        <h2>{state.winner.player} WINS</h2>
        <p className="victory-reason">{resultLabel}</p>
        <div className="victory-stats">
          <div><span>WINNER LP</span><b>{winner.lp}</b></div>
          <div><span>TASKS</span><b>{winner.completedTasks}/{COMPLETED_TASKS_TO_WIN}</b></div>
          <div><span>CARDS LEFT</span><b>{winner.hoodmonDeck.length}</b></div>
          <div><span>OPPONENT LP</span><b>{loser.lp}</b></div>
        </div>
        <button onClick={actions.restart}>RUN IT BACK</button>
      </div>
    )
  }

  if (state.needsPassInterstitial) {
    return (
      <div className="pass-panel">
        <span className="eyebrow">LOCAL MATCH PRIVACY</span>
        <h2>PASS TO {state.viewportOwner}</h2>
        <p>Private zones stay hidden while the device changes hands.</p>
        <button onClick={actions.acknowledgePass}>I'M READY</button>
      </div>
    )
  }

  if (state.status === 'choice' && state.pendingChoice) {
    return <PendingChoicePanel />
  }

  if (state.status === 'awaiting_promotion' && state.pendingPromotion) {
    const playerId = state.pendingPromotion
    const player = state.players[playerId]
    if (playerId === 'P2' && !state.localFaceToFaceMode) {
      return <div className="promotion-panel"><div><span className="eyebrow">OPPONENT DECISION</span><h3>P2 IS PROMOTING A RESERVE</h3><p>The AI is choosing its replacement Active Hoodmon.</p></div></div>
    }
    return (
      <div className="promotion-panel">
        <div>
          <span className="eyebrow">DEFEATED HOODMON</span>
          <h3>{playerId} — PROMOTE A RESERVE</h3>
          <p>The current action has finished. Choose one Reserve Hoodmon to become Active before play continues.</p>
        </div>
        <div className="promotion-actions">
          {player.reserves.map((card, index) => {
            if (!card) return null
            const definition = definitions[card.definitionId]
            return (
              <button key={card.instanceId} onClick={() => actions.promote(playerId, index as 0 | 1 | 2)}>
                PROMOTE {definition?.name ?? `RESERVE ${index + 1}`}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (state.status === 'reaction' && reaction) {
    const bothAnswered = reaction.nonActivePlayerResponded && reaction.activePlayerResponded
    const actionName = reaction.openedBy === 'attack' ? 'ATTACK' : reaction.openedBy === 'task' ? 'TASK' : reaction.openedBy.toUpperCase()
    const timerPercent = Math.max(0, Math.min(100, (reactionSecondsLeft / Math.max(1, reactionTimerLimit)) * 100))
    const timerUrgent = reactionSecondsLeft <= 3
    return (
      <div className="controls reaction-controls">
        <div className="control-copy">
          <span className="eyebrow">REACTION WINDOW · {actionName}</span>
          <strong>Priority: {reaction.priority}</strong>
          <small>Non-active player gets one legal Trap/Quick response; active player may answer once. Newest response resolves first.</small>
          {!bothAnswered && (humanHasReactionPriority || aiHasReactionPriority) && (
            <div className={`reaction-timer ${timerUrgent ? 'urgent' : ''}`} role="timer" aria-live="polite">
              <div className="reaction-timer-copy">
                <b>{reactionSecondsLeft}s</b>
                <span>{aiHasReactionPriority ? 'AI RESPONSE WINDOW' : (legalPriorityReactions.length ? 'ACT OR PASS' : 'NO LEGAL REACTION · AUTO-PASS')}</span>
              </div>
              <div className="reaction-timer-track"><span style={{ width: `${timerPercent}%` }} /></div>
            </div>
          )}
        </div>
        {!bothAnswered ? (
          reaction.priority === 'P2' && !state.localFaceToFaceMode ? (
            <div className="reaction-action-list ai-waiting"><span>OPPONENT IS CONSIDERING A RESPONSE…</span></div>
          ) : (
            <div className="reaction-action-list">
              {legalPriorityReactions.map((id) => (
                <button key={id} className="reaction-card-action" onClick={() => actions.playReaction(reaction.priority, id)}>
                  ACTIVATE · {definitions[id]?.name ?? id}
                </button>
              ))}
              <button onClick={() => actions.passReaction(reaction.priority)}>PASS REACTION ({reaction.priority})</button>
            </div>
          )
        ) : (
          <div className="reaction-action-list ai-waiting"><span>REACTIONS LOCKED · RESOLVING…</span></div>
        )}
      </div>
    )
  }

  const playerId = state.currentPlayerTurn
  const player = state.players[playerId]
  const hoodmon = [player.activeHoodmon, ...player.reserves].filter((card): card is CardInstance => Boolean(card))
  const active = player.activeHoodmon
  const activeDefinition = active ? definitions[active.definitionId] : undefined

  if (playerId === 'P2' && !state.localFaceToFaceMode) {
    return (
      <div className="turn-console ai-turn-console">
        <div className="turn-guidance">
          <span className="eyebrow">P2 · ROUND {state.round} · {state.currentPhase.toUpperCase()} PHASE</span>
          <strong>OPPONENT TURN · AI CONTROLS P2</strong>
          <small>The opponent is choosing its legal action. Your controls return when P1 has priority or the turn passes back to you.</small>
        </div>
      </div>
    )
  }

  const visibleTasks = (['P1', 'P2'] as PlayerId[]).flatMap((owner) =>
    state.players[owner].taskZone.flatMap((taskId, index) => {
      if (!taskId) return []
      const definition = definitions[taskId]
      if (!definition) return []
      return [{ owner, slot: index as 0 | 1 | 2, definition }]
    }),
  )

  const attemptableTasks = visibleTasks.filter((task) => taskCanBeAttempted(state, definitions, playerId, task.definition.id))

  const readyTaskers = hoodmon.filter((card) =>
    card.readyState === 'ready'
    && card.commandsUsedThisTurn < 1
    && !card.restrictions.cannotTask,
  )

  const canAttack = state.currentPhase === 'Command'
    && Boolean(active)
    && active?.readyState === 'ready'
    && (active?.commandsUsedThisTurn ?? 0) < 1
    && !active?.restrictions.cannotAttack
    && Boolean(activeDefinition?.attacks?.length)

  return (
    <div className="turn-console">
      <div className="turn-guidance">
        <span className="eyebrow">{playerId} · ROUND {state.round} · {state.currentPhase.toUpperCase()} PHASE</span>
        <strong>{phaseHelp[state.currentPhase]}</strong>
        <small>
          {activeDefinition
            ? `${activeDefinition.name} is Active · ${active?.readyState.toUpperCase()} · ${active?.commandsUsedThisTurn ?? 0}/1 normal Command used`
            : 'No Active Hoodmon. A legal Basic deployment can enter Active during Main; otherwise the Tamer can be attacked directly.'}
        </small>
      </div>

      <div className="controls primary-controls">
        {state.currentPhase === 'Main' && (
          <div className="action-group drag-play-guidance">
            <span className="action-group-title">PLAY FROM HAND · DRAG & DROP</span>
            <strong>{player.normalDeployUsed ? 'NORMAL DEPLOY USED' : 'NORMAL DEPLOY AVAILABLE'}</strong>
            <small>Drag a Basic Hoodmon to an open legal Hoodmon zone, an evolution card onto its matching Hoodmon, or a Field / Magic / Trap onto its matching support zone. Legal destinations glow.</small>
            {state.round < 2 && <small>Evolution remains locked until Round 2.</small>}
            {tamerActivationReady(state, definitions, playerId) && (
              <button className="battle-action tamer-action" type="button" onClick={actions.activateTamer}>ACTIVATE TAMER · {definitions[player.tamer?.definitionId ?? '']?.name ?? 'TAMER EFFECT'}</button>
            )}
          </div>
        )}

        {state.currentPhase === 'Command' && (
          <>
            <div className="action-group">
              <span className="action-group-title">BATTLE COMMAND · ACTIVE ONLY</span>
              {(activeDefinition?.attacks?.length ?? 0) > 0 ? activeDefinition!.attacks!.map((attack, index) => (
                <button className="battle-action attack-action" key={`${attack.attackName}-${index}`} disabled={!canAttack} onClick={() => actions.attack(index)}>
                  ATTACK · {attack.attackName} · {attack.baseDamage} DMG
                </button>
              )) : <button disabled>NO ENCODED ATTACK YET</button>}
            </div>

            <div className="action-group task-command-grid">
              <span className="action-group-title">TASK COMMAND · ACTIVE OR RESERVE · EACH SUCCESS = +1 COMPLETED TASK</span>
              {readyTaskers.length === 0 && <small>No ready Hoodmon has a normal Command available.</small>}
              {visibleTasks.length === 0 && <small>No face-up Task is available.</small>}
              {visibleTasks.length > 0 && attemptableTasks.length === 0 && <small>No face-up Task currently meets its objective requirements.</small>}
              {readyTaskers.flatMap((card) => {
                const definition = definitions[card.definitionId]
                return attemptableTasks
                  .filter((task) => hoodmonCanAttemptTask(state, definitions, playerId, card.instanceId, task.definition.id))
                  .map((task) => (
                    <button
                      className="ghost battle-action task-action"
                      key={`task-${card.instanceId}-${task.owner}-${task.slot}`}
                      onClick={() => actions.attemptTask(card.instanceId, task.owner, task.slot)}
                    >
                      {definition?.name ?? card.definitionId} TASK {definition?.taskRating ?? 0} → {task.owner} {task.definition.name}{task.definition.taskDifficulty ? ` (${task.definition.taskDifficulty})` : ''}
                    </button>
                  ))
              })}
              {readyTaskers.length > 0 && attemptableTasks.length > 0 && !readyTaskers.some((card) => attemptableTasks.some((task) => hoodmonCanAttemptTask(state, definitions, playerId, card.instanceId, task.definition.id))) && <small>Your ready Hoodmon do not meet the Tasking-Hoodmon requirement for the available objective.</small>}
            </div>
          </>
        )}

        <button className="advance" onClick={actions.advancePhase}>{nextPhaseLabel(state.currentPhase)}</button>
        <button className="ghost reset-match" onClick={actions.restart}>RESET MATCH</button>
      </div>
    </div>
  )
}
