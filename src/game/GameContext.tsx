import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { HoodmonEngine } from './engine/engine'
import type { CardDefinition, EngineEffect, GameSetup, GameState, PlayerId } from './engine/types'
import type { SupportTarget } from './engine/support'

interface GameActions {
  advancePhase: () => void
  acknowledgePass: () => void
  attack: (attackIndex?: number) => void
  chooseStarting: (activeDefinitionId: string, reserveDefinitionId?: string) => void
  deploy: (definitionId: string, target?: "active" | "reserve_1" | "reserve_2" | "reserve_3") => void
  playSupport: (definitionId: string, target: SupportTarget) => void
  attemptTask: (hoodmonInstanceId: string, taskOwner: PlayerId, slot: 0 | 1 | 2) => void
  evolve: (hoodmonInstanceId: string, nextDefinitionId: string) => void
  promote: (player: PlayerId, reserveIndex: 0 | 1 | 2) => void
  passReaction: (player: PlayerId) => void
  playReaction: (player: PlayerId, definitionId: string) => void
  resolveReaction: () => void
  resolveChoice: (player: PlayerId, selectedOptionIds: string[]) => void
  activateTamer: () => void
  applyEffect: (effect: EngineEffect) => void
  restart: () => void
}

interface GameContextValue {
  state: GameState
  definitions: Record<string, CardDefinition>
  actions: GameActions
}

const GameContext = createContext<GameContextValue | null>(null)

interface Props {
  children: ReactNode
  definitions: Record<string, CardDefinition>
  setup: GameSetup
  storageKey?: string
}

function restoreState(storageKey: string | undefined): GameState | null {
  if (!storageKey) return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const state = JSON.parse(raw) as GameState
    if (!state?.players?.P1 || !state?.players?.P2 || !state.currentPhase || !state.currentPlayerTurn) return null
    if (!Number.isFinite(state.players.P1.completedTasks) || !Number.isFinite(state.players.P2.completedTasks)) return null
    if (state.pendingChoice === undefined) state.pendingChoice = null
    if (!state.taskProgress) state.taskProgress = { P1: {}, P2: {} }
    return state
  } catch {
    return null
  }
}

export function GameProvider({ children, definitions, setup, storageKey }: Props) {
  const engineRef = useRef<HoodmonEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new HoodmonEngine(definitions, setup)
    const savedState = restoreState(storageKey)
    if (savedState) engineRef.current.state = savedState
  }

  const [state, setState] = useState<GameState>(() => structuredClone(engineRef.current!.state))

  const persist = useCallback((nextState: GameState) => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState))
    } catch {
      // Storage failure should never stop a match from continuing.
    }
  }, [storageKey])

  const sync = useCallback(() => {
    const nextState = structuredClone(engineRef.current!.state)
    setState(nextState)
    persist(nextState)
  }, [persist])

  const guarded = useCallback((fn: () => void) => {
    try {
      fn()
      sync()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      engineRef.current!.state.eventLog.push(`RULES: ${message}`)
      sync()
    }
  }, [sync])

  const actions = useMemo<GameActions>(() => ({
    advancePhase: () => guarded(() => { engineRef.current!.advancePhase() }),
    acknowledgePass: () => guarded(() => { engineRef.current!.acknowledgePass() }),
    attack: (attackIndex = 0) => guarded(() => { engineRef.current!.attack(attackIndex) }),
    chooseStarting: (activeDefinitionId, reserveDefinitionId) => guarded(() => { engineRef.current!.chooseStarting("P1", activeDefinitionId, reserveDefinitionId) }),
    deploy: (definitionId, target) => guarded(() => {
      const player = engineRef.current!.state.currentPlayerTurn
      engineRef.current!.deploy(player, definitionId, target)
    }),
    playSupport: (definitionId, target) => guarded(() => {
      const player = engineRef.current!.state.currentPlayerTurn
      engineRef.current!.playSupport(player, definitionId, target)
    }),
    attemptTask: (hoodmonInstanceId, taskOwner, slot) => guarded(() => {
      const player = engineRef.current!.state.currentPlayerTurn
      engineRef.current!.task(player, hoodmonInstanceId, taskOwner, slot)
    }),
    evolve: (hoodmonInstanceId, nextDefinitionId) => guarded(() => {
      const player = engineRef.current!.state.currentPlayerTurn
      engineRef.current!.evolve(player, hoodmonInstanceId, nextDefinitionId)
    }),
    promote: (player, reserveIndex) => guarded(() => { engineRef.current!.promote(player, reserveIndex) }),
    passReaction: (player) => guarded(() => { engineRef.current!.passReaction(player) }),
    playReaction: (player, definitionId) => guarded(() => { engineRef.current!.playReaction(player, definitionId) }),
    resolveReaction: () => guarded(() => { engineRef.current!.resolveReaction() }),
    resolveChoice: (player, selectedOptionIds) => guarded(() => { engineRef.current!.resolveChoice(player, selectedOptionIds) }),
    activateTamer: () => guarded(() => {
      const player = engineRef.current!.state.currentPlayerTurn
      engineRef.current!.activateTamer(player)
    }),
    applyEffect: (effect) => guarded(() => { engineRef.current!.effect(effect) }),
    restart: () => {
      engineRef.current = new HoodmonEngine(definitions, setup)
      sync()
    },
  }), [definitions, guarded, setup, sync])

  return <GameContext.Provider value={{ state, definitions, actions }}>{children}</GameContext.Provider>
}

export function useGame() {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside GameProvider')
  return value
}
