import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import { BattleControls } from './components/BattleControls'
import { BattleHand } from './components/BattleHand'
import { PhaseBar } from './components/PhaseBar'
import { PlayerPanel } from './components/PlayerPanel'
import { AudioSettingsModal } from './components/AudioSettingsModal'
import { useAudio } from './audio/AudioContext'
import { GameProvider, useGame } from './game/GameContext'
import { series1Definitions } from './game/series1Runtime'
import { STARTER_UNLOCK_IDS, buildSetup, createAiDeck, createStarterDeck, deckSignature, migrateTaskDeckToCurrentRules, validateDeck, type PlayDeck } from './game/decks'
import { legalReactionCardIds, reactionExecutionReady } from './game/engine/reactions'
import { fieldExecutionReady, standardMagicExecutionReady, standardMagicHasLegalTarget, suggestedChoiceSelections, tamerActivationReady } from './game/engine/cardEffects'
import { TASK_DECK_SIZE } from './game/engine/constants'
import { hoodmonCanAttemptTask, taskCanBeAttempted } from './game/engine/tasks'
import { SERIES1_TOTAL, series1Cards, type SeriesCard } from './data/series1Cards'
import './styles.css'

type View = 'home' | 'battle' | 'shop' | 'collection' | 'deck' | 'modes' | 'rules'
type DeckSection = 'main' | 'task' | 'tamer'
type CardVariant = 'base' | 'foil' | 'gold'
type ArenaMode = 'standard' | 'tower'

type DeckState = {
  main: string[]
  task: string[]
  tamer: string[]
}

const EMPTY_DECK: DeckState = { main: [], task: [], tamer: [] }
const LEGACY_DECK_STORAGE_KEY = 'hoodmon.series1.deck.v1'
const DECK_PREFIX = 'hoodmon.player.deck.v2.'

type PlayerSession = {
  signedIn: boolean
  playerTag: string
}

type PlayerProfile = {
  playerTag: string
  rank: number
  credits: number
  gold: number
  battlePoints: number
  unlockedCardIds: string[]
  unlockedVariants: Record<string, CardVariant[]>
  towerFloor: number
  totalMatchesPlayed: number
  totalMatchesWon: number
  highestTowerFloorReached: number
  totalBattlePointsEarned: number
}

const SESSION_STORAGE_KEY = 'hoodmon.player.session.v2'
const PROFILE_PREFIX = 'hoodmon.player.profile.v2.'
const ARENA_MODE_KEY = 'hoodmon.arena.mode.v1'

function starterCardIds() { return [...STARTER_UNLOCK_IDS] }

function createProfile(playerTag: string): PlayerProfile {
  const unlocked = starterCardIds()
  return {
    playerTag,
    rank: 1,
    credits: 500,
    gold: 400,
    battlePoints: 200,
    unlockedCardIds: unlocked,
    unlockedVariants: Object.fromEntries(unlocked.map((id) => [id, ['base'] as CardVariant[]])),
    towerFloor: 1,
    totalMatchesPlayed: 0,
    totalMatchesWon: 0,
    highestTowerFloorReached: 1,
    totalBattlePointsEarned: 200,
  }
}

function loadProfile(playerTag: string): PlayerProfile {
  const key = `${PROFILE_PREFIX}${playerTag.toLowerCase()}`
  try {
    const saved = localStorage.getItem(key)
    if (saved) { const merged = { ...createProfile(playerTag), ...JSON.parse(saved), playerTag } as PlayerProfile; merged.unlockedCardIds = [...new Set([...STARTER_UNLOCK_IDS, ...merged.unlockedCardIds])]; for (const id of STARTER_UNLOCK_IDS) merged.unlockedVariants[id] = [...new Set([...(merged.unlockedVariants[id] ?? []), 'base' as CardVariant])]; return merged }

    // Migrate the profile shape used by the user's newer arena prototype when present.
    const legacy = localStorage.getItem(`pk_user_${playerTag}`)
    if (legacy) {
      const old = JSON.parse(legacy)
      const migrated = {
        ...createProfile(playerTag),
        rank: Number(old.rank) || 1,
        credits: Number(old.credits) || 0,
        gold: Number(old.gold) || 0,
        battlePoints: Number(old.battlePoints) || 0,
        unlockedCardIds: [...new Set([...STARTER_UNLOCK_IDS, ...(Array.isArray(old.unlockedCardIds) ? old.unlockedCardIds.map((id: string) => id.toUpperCase()) : starterCardIds())])],
        unlockedVariants: old.unlockedVariants || {},
        towerFloor: Number(old.towerFloor) || 1,
        totalMatchesPlayed: Number(old.totalMatchesPlayed) || 0,
        totalMatchesWon: Number(old.totalMatchesWon) || 0,
        highestTowerFloorReached: Number(old.highestTowerFloorReached) || 1,
        totalBattlePointsEarned: Number(old.totalBattlePointsEarned) || 0,
      }
      localStorage.setItem(key, JSON.stringify(migrated))
      return migrated
    }
  } catch {
    // Fall through to a fresh local profile.
  }
  const fresh = createProfile(playerTag)
  localStorage.setItem(key, JSON.stringify(fresh))
  return fresh
}

function saveProfile(profile: PlayerProfile) {
  localStorage.setItem(`${PROFILE_PREFIX}${profile.playerTag.toLowerCase()}`, JSON.stringify(profile))
}

function loadSession(): PlayerSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerSession>
      return {
        signedIn: parsed.signedIn === true,
        playerTag: typeof parsed.playerTag === 'string' ? parsed.playerTag : '',
      }
    }
    const legacyTag = localStorage.getItem('pk_active_user')
    if (legacyTag) return { signedIn: true, playerTag: legacyTag }
  } catch {
    // Ignore malformed local session data.
  }
  return { signedIn: false, playerTag: '' }
}

function loadDeck(playerTag: string): DeckState {
  const key = `${DECK_PREFIX}${playerTag.toLowerCase()}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DeckState>
      return { main: Array.isArray(parsed.main) ? parsed.main : [], task: migrateTaskDeckToCurrentRules(Array.isArray(parsed.task) ? parsed.task : []), tamer: Array.isArray(parsed.tamer) ? parsed.tamer : [] }
    }
    const legacy = localStorage.getItem(LEGACY_DECK_STORAGE_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<DeckState>
      const migrated = { main: Array.isArray(parsed.main) ? parsed.main : [], task: migrateTaskDeckToCurrentRules(Array.isArray(parsed.task) ? parsed.task : []), tamer: Array.isArray(parsed.tamer) ? parsed.tamer : [] }
      if (validateDeck(migrated).length === 0) { localStorage.setItem(key, JSON.stringify(migrated)); return migrated }
    }
  } catch { /* use starter */ }
  const starter = createStarterDeck()
  localStorage.setItem(key, JSON.stringify(starter))
  return starter
}

function loadArenaMode(): ArenaMode {
  return localStorage.getItem(ARENA_MODE_KEY) === 'tower' ? 'tower' : 'standard'
}

export default function App() {
  const { settings: audioSettings, toggleMasterMute, setMusic } = useAudio()
  const initialSession = loadSession()
  const [session, setSession] = useState<PlayerSession>(initialSession)
  const [profile, setProfile] = useState<PlayerProfile | null>(() => initialSession.signedIn ? loadProfile(initialSession.playerTag) : null)
  const [view, setView] = useState<View>(() => initialSession.signedIn ? 'battle' : 'home')
  const [arenaMode, setArenaMode] = useState<ArenaMode>(() => loadArenaMode())
  const [showSignIn, setShowSignIn] = useState(false)
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [selectedCard, setSelectedCard] = useState<SeriesCard | null>(null)
  const [deck, setDeck] = useState<DeckState>(() => initialSession.signedIn ? loadDeck(initialSession.playerTag) : EMPTY_DECK)

  useEffect(() => {
    if (session.signedIn && session.playerTag) localStorage.setItem(`${DECK_PREFIX}${session.playerTag.toLowerCase()}`, JSON.stringify(deck))
  }, [deck, session])

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    localStorage.setItem(ARENA_MODE_KEY, arenaMode)
  }, [arenaMode])

  useEffect(() => {
    setMusic(session.signedIn && view === 'battle' ? 'music_battle' : 'music_menu')
  }, [session.signedIn, setMusic, view])

  const signIn = (playerTag: string) => {
    const nextProfile = loadProfile(playerTag)
    setProfile(nextProfile)
    setDeck(loadDeck(playerTag))
    setSession({ signedIn: true, playerTag })
    setShowSignIn(false)
    setView('battle')
  }

  const signOut = () => {
    setSession({ signedIn: false, playerTag: '' })
    setProfile(null)
    setView('home')
  }

  const updateProfile = (mutator: (current: PlayerProfile) => PlayerProfile) => {
    setProfile((current) => {
      if (!current) return current
      const next = mutator(current)
      saveProfile(next)
      return next
    })
  }

  const buyCard = (card: SeriesCard, variant: CardVariant, cost: number, currency: 'bp' | 'credits' | 'gold') => {
    updateProfile((current) => {
      if (currency === 'bp' && current.battlePoints < cost) return current
      if (currency === 'credits' && current.credits < cost) return current
      if (currency === 'gold' && current.gold < cost) return current
      const owned = new Set(current.unlockedCardIds)
      const variants = { ...current.unlockedVariants }
      const currentVariants = new Set<CardVariant>(variants[card.id] ?? [])
      if (variant !== 'base' && !owned.has(card.id)) return current
      if (variant === 'base') owned.add(card.id)
      currentVariants.add(variant)
      variants[card.id] = [...currentVariants]
      return {
        ...current,
        battlePoints: currency === 'bp' ? current.battlePoints - cost : current.battlePoints,
        credits: currency === 'credits' ? current.credits - cost : current.credits,
        gold: currency === 'gold' ? current.gold - cost : current.gold,
        unlockedCardIds: [...owned],
        unlockedVariants: variants,
      }
    })
  }

  const chooseArena = (mode: ArenaMode) => {
    setArenaMode(mode)
    setView('battle')
  }

  const page = (() => {
    switch (view) {
      case 'shop':
        return profile ? <ShopPage profile={profile} onBuy={buyCard} onOpen={setSelectedCard} /> : null
      case 'collection':
        return <CollectionPage onOpen={setSelectedCard} />
      case 'deck':
        return profile ? <DeckBuilder deck={deck} setDeck={setDeck} profile={profile} onOpen={setSelectedCard} /> : null
      case 'modes':
        return profile ? <ModesPage profile={profile} activeMode={arenaMode} onChoose={chooseArena} /> : null
      case 'battle':
        return session.signedIn ? null : <HomePage onNavigate={setView} onOpen={setSelectedCard} onSignIn={() => setShowSignIn(true)} />
      case 'rules':
        return <RulesPage />
      default:
        return <HomePage onNavigate={setView} onOpen={setSelectedCard} onSignIn={() => setShowSignIn(true)} />
    }
  })()

  return (
    <div className="site-shell">
      <AppHeader
        active={view}
        session={session}
        profile={profile}
        onNavigate={setView}
        onSignIn={() => setShowSignIn(true)}
        onSignOut={signOut}
        audioMuted={audioSettings.masterMuted}
        onToggleAudioMute={toggleMasterMute}
        onAudioSettings={() => setShowAudioSettings(true)}
      />
      {session.signedIn && profile && (
        <div className={view === 'battle' ? 'preserved-battle active' : 'preserved-battle'}>
          <BattlePage active={view === 'battle'} playerTag={session.playerTag} profile={profile} deck={deck} arenaMode={arenaMode} onChooseArena={chooseArena} onProfileUpdate={updateProfile} />
        </div>
      )}
      {view !== 'battle' && page}
      {!session.signedIn && view === 'battle' && page}
      <footer className="site-footer">
        <span>HOODMON TCG · SERIES 1</span>
        <span>{SERIES1_TOTAL} CARD DIGITAL LIBRARY</span>
        <span>AWAKEN THE BOND</span>
      </footer>
      <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} onSignIn={signIn} />}
      {showAudioSettings && <AudioSettingsModal onClose={() => setShowAudioSettings(false)} />}
    </div>
  )
}

function AppHeader({
  active,
  session,
  profile,
  onNavigate,
  onSignIn,
  onSignOut,
  audioMuted,
  onToggleAudioMute,
  onAudioSettings,
}: {
  active: View
  session: PlayerSession
  profile: PlayerProfile | null
  onNavigate: (view: View) => void
  onSignIn: () => void
  onSignOut: () => void
  audioMuted: boolean
  onToggleAudioMute: () => void
  onAudioSettings: () => void
}) {
  const nav: Array<[View, string]> = session.signedIn
    ? [
        ['battle', 'BATTLE'],
        ['shop', 'SHOP'],
        ['collection', 'CARDS'],
        ['deck', 'DECK BUILDER'],
        ['modes', 'MODES'],
        ['rules', 'RULES'],
      ]
    : [
        ['home', 'HOME'],
        ['collection', 'CARDS'],
        ['rules', 'RULES'],
      ]

  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => onNavigate(session.signedIn ? 'battle' : 'home')}>
        <span className="brand-crown">♛</span>
        <span><b>HOODMON</b><small>TCG DIGITAL ARENA</small></span>
      </button>
      <nav className="main-nav" aria-label="Main navigation">
        {nav.map(([target, label]) => (
          <button key={target} className={active === target ? 'active' : ''} onClick={() => onNavigate(target)}>{label}</button>
        ))}
      </nav>
      <div className="header-actions">
        <div className="header-audio-controls" role="group" aria-label="Audio controls">
          <button className={`header-audio-mute ${audioMuted ? 'muted' : ''}`} data-audio-silent onClick={onToggleAudioMute} aria-label={audioMuted ? 'Unmute all audio' : 'Mute all audio'}>{audioMuted ? '🔇' : '🔊'}</button>
          <button className="header-audio-settings" data-audio-cue="ui_open" onClick={onAudioSettings}>AUDIO</button>
        </div>
        {session.signedIn && profile ? (
          <div className="player-chip enhanced">
            <span>PLAYER</span><b>{session.playerTag}</b>
            <div className="wallet-mini"><i>BP {profile.battlePoints}</i><i>◈ {profile.credits}</i><i>● {profile.gold}</i></div>
            <button onClick={onSignOut}>SIGN OUT</button>
          </div>
        ) : (
          <button className="header-sign-in" onClick={onSignIn}>SIGN IN</button>
        )}
        <div className="series-badge"><b>{SERIES1_TOTAL}</b><span>SERIES 1</span></div>
      </div>
    </header>
  )
}

function HomePage({ onNavigate, onOpen, onSignIn }: { onNavigate: (view: View) => void; onOpen: (card: SeriesCard) => void; onSignIn: () => void }) {
  const featureIds = ['HDM-001', 'HDM-063', 'HDM-078', 'HDM-094']
  const featured = featureIds.map((id) => series1Cards.find((card) => card.id === id)!).filter(Boolean)

  return (
    <main className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SERIES 1 · COMPLETE DIGITAL CARD LIBRARY</span>
          <h1>AWAKEN<br /><em>THE BOND.</em></h1>
          <p>Build a 40-card Hoodmon Deck, bring a separate 10-card Task Deck, choose your Tamer, and win by completing 10 Tasks, depleting your opponent’s LP, or forcing a required draw from an empty Main Deck.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={onSignIn}>SIGN IN TO THE ARENA</button>
            <button className="secondary-action" onClick={() => onNavigate('collection')}>VIEW ALL {SERIES1_TOTAL} CARDS</button>
          </div>
        </div>
        <div className="hero-stack" aria-label="Featured Hoodmon cards">
          {featured.map((card, index) => (
            <button key={card.id} className={`hero-card hero-card-${index + 1}`} onClick={() => onOpen(card)}>
              <img src={card.image} alt={`${card.id} ${card.name}`} />
            </button>
          ))}
        </div>
      </section>

      <section className="stat-grid">
        <StatCard value="2,500" label="STARTING LP" />
        <StatCard value="5" label="STARTING BOND" />
        <StatCard value="10" label="BOND CAP" />
        <StatCard value="10" label="COMPLETED TASKS TO WIN" />
      </section>

      <section className="feature-grid">
        <Feature title={`${SERIES1_TOTAL} Improved Cards`} text="All 110 Series 1 card slots are supported in the app library with the current approved card assets." action="Browse collection" onClick={() => onNavigate('collection')} />
        <Feature title="Persistent Deck Builder" text="Build Main, Task, and Tamer sections. Your current deck saves in your browser automatically." action="Build now" onClick={() => onNavigate('deck')} />
        <Feature title="Player Arena" text="Signed-in players now land directly in battle, with guided phases, Tasks, evolution, reactions, knockout promotion, and victory state." action="Enter arena" onClick={onSignIn} />
      </section>
    </main>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return <div className="stat-card"><b>{value}</b><span>{label}</span></div>
}

function Feature({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return (
    <article className="feature-card">
      <span className="feature-crown">♛</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button onClick={onClick}>{action} →</button>
    </article>
  )
}


function ShopPage({ profile, onBuy, onOpen }: {
  profile: PlayerProfile
  onBuy: (card: SeriesCard, variant: CardVariant, cost: number, currency: 'bp' | 'credits' | 'gold') => void
  onOpen: (card: SeriesCard) => void
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('ALL')
  const cards = useMemo(() => series1Cards.filter((card) => {
    const needle = query.trim().toLowerCase()
    return (!needle || card.name.toLowerCase().includes(needle) || card.id.toLowerCase().includes(needle)) && (kind === 'ALL' || card.kind === kind)
  }), [query, kind])

  return (
    <main className="page shop-page">
      <PageTitle eyebrow="PLAYER MARKET · LOCAL PROGRESSION" title="HOODMON SHOP" subtitle="Unlock cards and cosmetic variants with your earned currencies" />
      <section className="profile-economy-strip">
        <div><span>BATTLE POINTS</span><b>{profile.battlePoints}</b></div>
        <div><span>CREDITS</span><b>{profile.credits}</b></div>
        <div><span>GOLD</span><b>{profile.gold}</b></div>
        <div><span>OWNED CARDS</span><b>{profile.unlockedCardIds.length}/{SERIES1_TOTAL}</b></div>
      </section>
      <section className="filter-bar">
        <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the market…" /></label>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>{['ALL','Tamer','Hoodmon','Magic','Trap','Field','Task'].map((item) => <option key={item}>{item}</option>)}</select>
      </section>
      <section className="shop-grid">
        {cards.map((card) => {
          const owned = profile.unlockedCardIds.includes(card.id)
          const variants = profile.unlockedVariants[card.id] ?? []
          return (
            <article className={`shop-card ${owned ? 'owned' : ''}`} key={card.id}>
              <button className="shop-card-art" onClick={() => onOpen(card)}><img src={card.image} alt={`${card.id} ${card.name}`} /></button>
              <div className="shop-card-meta"><span>{card.id} · {card.kind}</span><b>{card.name}</b><small>{card.family}</small></div>
              <div className="shop-actions">
                <button disabled={owned || profile.credits < 100} onClick={() => onBuy(card, 'base', 100, 'credits')}>{owned ? 'BASE OWNED' : 'UNLOCK · 100 CREDITS'}</button>
                <button disabled={!owned || variants.includes('foil') || profile.battlePoints < 250} onClick={() => onBuy(card, 'foil', 250, 'bp')}>{variants.includes('foil') ? 'FOIL OWNED' : 'FOIL · 250 BP'}</button>
                <button disabled={!owned || variants.includes('gold') || profile.gold < 100} onClick={() => onBuy(card, 'gold', 100, 'gold')}>{variants.includes('gold') ? 'GOLD OWNED' : 'GOLD · 100'}</button>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

function ModesPage({ profile, activeMode, onChoose }: { profile: PlayerProfile; activeMode: ArenaMode; onChoose: (mode: ArenaMode) => void }) {
  const towerScale = Math.round((1 + profile.towerFloor * 0.2) * 100)
  return (
    <main className="page modes-page">
      <PageTitle eyebrow="ARENA QUEUE" title="BATTLE MODES" subtitle="Choose the rules wrapper for the battle engine. Battle remains your signed-in home." />
      <section className="mode-grid">
        <article className={`mode-card ${activeMode === 'standard' ? 'active' : ''}`}>
          <span className="mode-icon">⚔</span><span className="eyebrow">CORE 1v1</span><h2>STANDARD STREET BATTLE</h2>
          <p>Current HOODMON standard: 2,500 LP, 5 starting Bond, a separate 10-card Task Deck, and three win routes—10 completed Tasks, 0 opponent LP, or opponent deck-out on a required draw.</p>
          <button className="primary-action" onClick={() => onChoose('standard')}>{activeMode === 'standard' ? 'ENTER CURRENT MODE' : 'SELECT STANDARD'}</button>
        </article>
        <article className={`mode-card tower ${activeMode === 'tower' ? 'active' : ''}`}>
          <span className="mode-icon">♜</span><span className="eyebrow">SOLO PROGRESSION · FLOOR {profile.towerFloor}</span><h2>THE TOWER</h2>
          <p>Climb rotating Tamer archetype encounters while keeping the official battle engine underneath the mode. Progress tier index: {towerScale}%.</p>
          <div className="tower-stats"><span>BEST <b>F{profile.highestTowerFloorReached}</b></span><span>WINS <b>{profile.totalMatchesWon}</b></span><span>BP EARNED <b>{profile.totalBattlePointsEarned}</b></span></div>
          <button className="primary-action" onClick={() => onChoose('tower')}>{activeMode === 'tower' ? 'ENTER CURRENT FLOOR' : 'SELECT TOWER'}</button>
        </article>
      </section>
      <section className="mode-note"><b>LIVE MODE STATUS</b><p>Standard and Tower now use separate saved match states. Tower opponents rotate through stronger Series 1 archetype decks as floors rise, while the same official core engine remains underneath.</p></section>
    </main>
  )
}

function CollectionPage({ onOpen }: { onOpen: (card: SeriesCard) => void }) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('ALL')
  const [kind, setKind] = useState('ALL')
  const families = useMemo(() => ['ALL', ...Array.from(new Set(series1Cards.map((card) => card.family)))], [])
  const kinds = ['ALL', 'Tamer', 'Hoodmon', 'Magic', 'Trap', 'Field', 'Task']
  const cards = useMemo(() => series1Cards.filter((card) => {
    const needle = query.trim().toLowerCase()
    const matchesQuery = !needle || card.name.toLowerCase().includes(needle) || card.id.toLowerCase().includes(needle)
    const matchesFamily = family === 'ALL' || card.family === family
    const matchesKind = kind === 'ALL' || card.kind === kind
    return matchesQuery && matchesFamily && matchesKind
  }), [query, family, kind])

  return (
    <main className="page">
      <PageTitle eyebrow="SERIES 1 CARD DATABASE" title="THE HOODMON VAULT" subtitle={`${cards.length} of ${SERIES1_TOTAL} cards shown`} />
      <section className="filter-bar">
        <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search card name or HDM number…" /></label>
        <select value={family} onChange={(e) => setFamily(e.target.value)}>{families.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((item) => <option key={item}>{item}</option>)}</select>
      </section>
      <section className="card-grid">
        {cards.map((card) => <CardTile key={card.id} card={card} onOpen={onOpen} />)}
      </section>
    </main>
  )
}

function CardTile({ card, onOpen, action }: { card: SeriesCard; onOpen: (card: SeriesCard) => void; action?: ReactNode }) {
  return (
    <article className="card-tile">
      <button className="card-image-button" onClick={() => onOpen(card)}>
        <img loading="lazy" src={card.image} alt={`${card.id} ${card.name}`} />
      </button>
      <div className="card-tile-meta">
        <div><span>{card.id}</span><b>{card.name}</b><small>{card.kind} · {card.family}</small></div>
        {action}
      </div>
    </article>
  )
}

function DeckBuilder({ deck, setDeck, profile, onOpen }: { deck: DeckState; setDeck: Dispatch<SetStateAction<DeckState>>; profile: PlayerProfile; onOpen: (card: SeriesCard) => void }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('ALL')
  const [activeSection, setActiveSection] = useState<DeckSection>('main')

  const cards = useMemo(() => series1Cards.filter((card) => {
    const needle = query.trim().toLowerCase()
    const q = !needle || card.name.toLowerCase().includes(needle) || card.id.toLowerCase().includes(needle)
    const k = kind === 'ALL' || card.kind === kind
    return q && k
  }), [query, kind])

  const sectionForCard = (card: SeriesCard): DeckSection => card.kind === 'Tamer' ? 'tamer' : card.kind === 'Task' ? 'task' : 'main'
  const limitFor = (section: DeckSection) => section === 'main' ? 40 : section === 'task' ? TASK_DECK_SIZE : 1

  const addCard = (card: SeriesCard) => {
    if (!profile.unlockedCardIds.includes(card.id)) return
    const section = sectionForCard(card)
    setActiveSection(section)
    setDeck((current) => {
      if (current[section].length >= limitFor(section)) return current
      if (section === 'tamer') return { ...current, tamer: [card.id] }
      const copies = current[section].filter((id) => id === card.id).length
      if (copies >= 3) return current
      return { ...current, [section]: [...current[section], card.id] }
    })
  }

  const removeCard = (section: DeckSection, cardId: string) => {
    setDeck((current) => {
      const copy = [...current[section]]
      const index = copy.lastIndexOf(cardId)
      if (index >= 0) copy.splice(index, 1)
      return { ...current, [section]: copy }
    })
  }

  const clearDeck = () => setDeck(EMPTY_DECK)
  const section = deck[activeSection]
  const grouped = Array.from(new Set(section)).map((id) => ({ card: series1Cards.find((item) => item.id === id)!, copies: section.filter((entry) => entry === id).length })).filter((item) => item.card)

  return (
    <main className="page deck-page">
      <PageTitle eyebrow="40 MAIN · 10 TASK · 1 TAMER" title="DECK BUILDER" subtitle="Up to 3 copies of a card in a section" />
      <div className="deck-workspace">
        <section className="deck-catalog">
          <div className="filter-bar compact">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a card…" /></label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {['ALL','Tamer','Hoodmon','Magic','Trap','Field','Task'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="deck-card-grid">
            {cards.map((card) => (
              <CardTile key={card.id} card={card} onOpen={onOpen} action={profile.unlockedCardIds.includes(card.id) ? <button className="add-card" onClick={() => addCard(card)}>＋</button> : <span className="locked-card-badge">LOCKED</span>} />
            ))}
          </div>
        </section>

        <aside className="deck-panel">
          <div className="deck-panel-header"><div><span className="eyebrow">CURRENT BUILD</span><h2>STREET DECK</h2></div><button className="text-button" onClick={clearDeck}>CLEAR</button></div>
          <div className="deck-meters">
            <DeckMeter label="MAIN" count={deck.main.length} limit={40} />
            <DeckMeter label="TASK" count={deck.task.length} limit={TASK_DECK_SIZE} />
            <DeckMeter label="TAMER" count={deck.tamer.length} limit={1} />
          </div>
          <div className="deck-tabs">
            {(['main','task','tamer'] as DeckSection[]).map((name) => <button key={name} className={activeSection === name ? 'active' : ''} onClick={() => setActiveSection(name)}>{name.toUpperCase()}</button>)}
          </div>
          <div className="deck-list">
            {grouped.length === 0 && <div className="empty-deck">No cards in this section yet.</div>}
            {grouped.map(({ card, copies }) => (
              <div className="deck-list-row" key={card.id}>
                <img src={card.image} alt="" />
                <div><b>{card.name}</b><span>{card.id} · {card.kind}</span></div>
                <strong>×{copies}</strong>
                <button onClick={() => removeCard(activeSection, card.id)}>−</button>
              </div>
            ))}
          </div>
          <div className="deck-status">
            {(() => { const problems = validateDeck(deck, profile.unlockedCardIds); return <><span className={problems.length === 0 ? 'ready' : ''}>{problems.length === 0 ? '✓ LEGAL DECK · READY FOR BATTLE' : 'BUILD REQUIREMENTS IN PROGRESS'}</span>{problems.slice(0, 3).map((problem) => <small key={problem}>{problem}</small>)}</> })()}
          </div>
        </aside>
      </div>
    </main>
  )
}

function DeckMeter({ label, count, limit }: { label: string; count: number; limit: number }) {
  const pct = Math.min(100, (count / limit) * 100)
  return <div className="deck-meter"><span><b>{label}</b>{count}/{limit}</span><div><i style={{ width: `${pct}%` }} /></div></div>
}

function BattlePage({
  active, playerTag, profile, deck, arenaMode, onChooseArena, onProfileUpdate,
}: {
  active: boolean
  playerTag: string
  profile: PlayerProfile
  deck: DeckState
  arenaMode: ArenaMode
  onChooseArena: (mode: ArenaMode) => void
  onProfileUpdate: (mutator: (current: PlayerProfile) => PlayerProfile) => void
}) {
  const deckProblems = validateDeck(deck, profile.unlockedCardIds)
  const battleDeck: PlayDeck = deckProblems.length === 0 ? deck : createStarterDeck()
  const opponentDeck = createAiDeck(arenaMode === 'tower' ? profile.towerFloor : 1)
  const setup = useMemo(() => buildSetup(battleDeck, opponentDeck), [deckSignature(battleDeck), arenaMode, profile.towerFloor])
  const signature = deckSignature(battleDeck)
  const matchKey = `hoodmon.match.v11.${arenaMode}.f${arenaMode === 'tower' ? profile.towerFloor : 0}.${playerTag.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.${signature}`

  const recordResult = (winner: 'P1' | 'P2') => {
    // A completed saved match must not be reloadable for duplicate rewards.
    try { localStorage.removeItem(matchKey) } catch { /* Ignore storage failures. */ }
    onProfileUpdate((current) => {
      const won = winner === 'P1'
      const bp = arenaMode === 'tower' ? (won ? 150 + current.towerFloor * 25 : 40) : (won ? 100 : 25)
      const credits = arenaMode === 'tower' ? (won ? 75 : 25) : (won ? 50 : 20)
      const nextFloor = arenaMode === 'tower' && won ? current.towerFloor + 1 : current.towerFloor
      const goldBonus = arenaMode === 'tower' && won && nextFloor % 5 === 0 ? 10 : 0
      return {
        ...current,
        battlePoints: current.battlePoints + bp,
        credits: current.credits + credits,
        gold: current.gold + goldBonus,
        totalMatchesPlayed: current.totalMatchesPlayed + 1,
        totalMatchesWon: current.totalMatchesWon + (won ? 1 : 0),
        totalBattlePointsEarned: current.totalBattlePointsEarned + bp,
        towerFloor: nextFloor,
        highestTowerFloorReached: Math.max(current.highestTowerFloorReached, nextFloor),
      }
    })
  }

  return (
    <main className="page battle-page">
      <div className="battle-home-heading">
        <div><span className="eyebrow">PLAYER HOME · LIVE BATTLE</span><h1>{arenaMode === 'tower' ? `TOWER FLOOR ${profile.towerFloor}` : 'STREET BATTLE'}</h1></div>
        <div className="battle-player-welcome"><span>WELCOME BACK</span><b>{playerTag}</b><small>BP {profile.battlePoints} · ◈ {profile.credits} · ● {profile.gold}</small></div>
      </div>
      <div className="arena-mode-switch" role="group" aria-label="Battle mode">
        <button className={arenaMode === 'standard' ? 'active' : ''} onClick={() => onChooseArena('standard')}>STANDARD</button>
        <button className={arenaMode === 'tower' ? 'active' : ''} onClick={() => onChooseArena('tower')}>TOWER · F{profile.towerFloor}</button>
        <span>{arenaMode === 'tower' ? 'Tower AI encounter · official core rules preserved' : 'Current-standard solo street match vs AI'}</span>
      </div>
      {deckProblems.length > 0 && <div className="battle-deck-warning"><b>STARTER DECK ACTIVE</b><span>Your saved deck is not legal yet, so Battle is using the legal starter deck.</span><small>{deckProblems[0]}</small></div>}
      <GameProvider key={`${arenaMode}-${signature}`} definitions={series1Definitions} setup={setup} storageKey={matchKey}>
        <BattleTable active={active} arenaMode={arenaMode} onMatchComplete={recordResult} />
      </GameProvider>
    </main>
  )
}

function BattleTable({ active, arenaMode, onMatchComplete }: { active: boolean; arenaMode: ArenaMode; onMatchComplete: (winner: 'P1' | 'P2') => void }) {
  const { state, definitions, actions } = useGame()
  const { playCue, setMusic } = useAudio()
  const [selectedHandCard, setSelectedHandCard] = useState<string | null>(null)
  const [draggingHandCard, setDraggingHandCard] = useState<string | null>(null)
  const interactionCard = draggingHandCard ?? selectedHandCard
  const resultRecorded = useRef(false)
  const previousPhaseRef = useRef(state.currentPhase)
  const aiReactionAttemptRef = useRef<string | null>(null)
  const flashLogRef = useRef<string | null>(null)
  const flashTimerRef = useRef<number | null>(null)
  const attackTimerRef = useRef<number | null>(null)
  const taskTimerRef = useRef<number | null>(null)
  const damageTimerRef = useRef<number | null>(null)
  const [battleFlash, setBattleFlash] = useState<{ label: string; text: string; tone: 'attack' | 'damage' | 'task' | 'ko' | 'reaction' | 'deploy' | 'evolve' } | null>(null)
  const [attackImpact, setAttackImpact] = useState<{ attacker: 'P1' | 'P2'; key: number } | null>(null)
  const [damagePopup, setDamagePopup] = useState<{ player: 'P1' | 'P2'; amount: number; lp: boolean; key: number } | null>(null)
  const [taskBurst, setTaskBurst] = useState<{ player: 'P1' | 'P2'; key: number } | null>(null)

  useEffect(() => {
    if (!state.winner) { resultRecorded.current = false; return }
    if (resultRecorded.current) return
    resultRecorded.current = true
    playCue(state.winner.player === 'P1' ? 'victory' : 'defeat')
    setMusic(state.winner.player === 'P1' ? 'music_victory' : 'music_defeat')
    onMatchComplete(state.winner.player)
  }, [state.winner, onMatchComplete, playCue, setMusic])

  useEffect(() => {
    if (state.winner || !active) return
    setMusic('music_battle')
  }, [active, setMusic, state.winner])

  useEffect(() => {
    if (previousPhaseRef.current === state.currentPhase) return
    previousPhaseRef.current = state.currentPhase
    playCue('phase_change')
  }, [playCue, state.currentPhase])

  useEffect(() => {
    if (selectedHandCard && !state.players.P1.hand.includes(selectedHandCard)) setSelectedHandCard(null)
    if (draggingHandCard && !state.players.P1.hand.includes(draggingHandCard)) setDraggingHandCard(null)
  }, [draggingHandCard, selectedHandCard, state.players.P1.hand])

  useEffect(() => {
    const latest = state.eventLog[state.eventLog.length - 1]
    if (!latest) return
    const flashKey = `${state.eventLog.length}:${latest}`
    if (flashLogRef.current === flashKey) return
    flashLogRef.current = flashKey

    let next: typeof battleFlash = null
    const taskMatch = latest.match(/^(P1|P2) completed .+\(\d+\/10 Tasks\)\./i)
    const attackMatch = latest.match(/^(P1|P2) declared (?!a Task Command ).+Reaction Window opened\./i)
    const lpDamageMatch = latest.match(/^(P1|P2) takes (\d+) LP damage\./i)
    const hoodmonDamageMatch = latest.match(/^(P1|P2)-\S+ takes (\d+) damage\./i)
    if (taskMatch) {
      next = { label: 'TASK COMPLETE', text: latest, tone: 'task' }
      setTaskBurst({ player: taskMatch[1].toUpperCase() as 'P1' | 'P2', key: state.eventLog.length })
    }
    else if (/was defeated\./i.test(latest)) next = { label: 'KNOCKOUT', text: latest, tone: 'ko' }
    else if (attackMatch) {
      next = { label: 'ATTACK DECLARED', text: latest, tone: 'attack' }
      setAttackImpact({ attacker: attackMatch[1].toUpperCase() as 'P1' | 'P2', key: state.eventLog.length })
      if (attackTimerRef.current !== null) window.clearTimeout(attackTimerRef.current)
      attackTimerRef.current = window.setTimeout(() => { setAttackImpact(null); attackTimerRef.current = null }, 680)
    }
    else if (lpDamageMatch) {
      next = { label: 'LP DAMAGE', text: latest, tone: 'damage' }
      setDamagePopup({ player: lpDamageMatch[1].toUpperCase() as 'P1' | 'P2', amount: Number(lpDamageMatch[2]), lp: true, key: state.eventLog.length })
    }
    else if (hoodmonDamageMatch) {
      next = { label: 'DAMAGE', text: latest, tone: 'damage' }
      setDamagePopup({ player: hoodmonDamageMatch[1].toUpperCase() as 'P1' | 'P2', amount: Number(hoodmonDamageMatch[2]), lp: false, key: state.eventLog.length })
    }
    else if (/^P[12] deployed /i.test(latest)) next = { label: 'HOODMON DEPLOYED', text: latest, tone: 'deploy' }
    else if (/^P[12] evolved /i.test(latest)) next = { label: 'EVOLUTION', text: latest, tone: 'evolve' }
    else if (/activated .+Reaction Window|activated .+ in the Reaction Window|negated/i.test(latest)) next = { label: 'REACTION', text: latest, tone: 'reaction' }

    if (taskMatch) playCue('task_complete')
    else if (/was defeated\./i.test(latest)) playCue('ko')
    else if (attackMatch) playCue('attack')
    else if (lpDamageMatch) playCue('lp_damage')
    else if (hoodmonDamageMatch) playCue('damage')
    else if (/^P[12] deployed /i.test(latest)) playCue('hoodmon_deploy')
    else if (/^P[12] evolved /i.test(latest)) playCue('hoodmon_evolve')
    else if (/activated .+Reaction Window|activated .+ in the Reaction Window|negated/i.test(latest)) playCue('reaction')
    else if (/gained? \+?1 Bond|gains? \+?1 Bond/i.test(latest)) playCue('bond_gain')

    if (!next) return

    if (damagePopup && !lpDamageMatch && !hoodmonDamageMatch) setDamagePopup(null)
    if ((lpDamageMatch || hoodmonDamageMatch)) {
      if (damageTimerRef.current !== null) window.clearTimeout(damageTimerRef.current)
      damageTimerRef.current = window.setTimeout(() => { setDamagePopup(null); damageTimerRef.current = null }, 900)
    }
    if (taskMatch) {
      if (taskTimerRef.current !== null) window.clearTimeout(taskTimerRef.current)
      taskTimerRef.current = window.setTimeout(() => { setTaskBurst(null); taskTimerRef.current = null }, 1200)
    }

    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
    setBattleFlash(next)
    flashTimerRef.current = window.setTimeout(() => {
      setBattleFlash(null)
      flashTimerRef.current = null
    }, next.tone === 'ko' || next.tone === 'task' || next.tone === 'evolve' ? 1750 : 1150)
  }, [playCue, state.eventLog.length])

  useEffect(() => () => {
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
    if (attackTimerRef.current !== null) window.clearTimeout(attackTimerRef.current)
    if (taskTimerRef.current !== null) window.clearTimeout(taskTimerRef.current)
    if (damageTimerRef.current !== null) window.clearTimeout(damageTimerRef.current)
  }, [])

  useEffect(() => {
    if (!active || state.status !== 'reaction' || !state.reactionWindow) return
    const bothAnswered = state.reactionWindow.nonActivePlayerResponded && state.reactionWindow.activePlayerResponded
    if (!bothAnswered) return
    const timer = window.setTimeout(() => actions.resolveReaction(), 350)
    return () => window.clearTimeout(timer)
  }, [active, actions, state.status, state.reactionWindow])

  useEffect(() => {
    if (!active || state.winner || state.status === 'setup') return
    const timer = window.setTimeout(() => {
      try {
        if (state.status === 'choice' && state.pendingChoice) {
          if (state.pendingChoice.player === 'P2') actions.resolveChoice('P2', suggestedChoiceSelections(state.pendingChoice))
          return
        }
        if (state.status === 'awaiting_promotion' && state.pendingPromotion === 'P2') {
          const index = state.players.P2.reserves.findIndex(Boolean)
          if (index >= 0) actions.promote('P2', index as 0 | 1 | 2)
          return
        }
        if (state.status === 'reaction' && state.reactionWindow) {
          const windowState = state.reactionWindow
          const both = windowState.nonActivePlayerResponded && windowState.activePlayerResponded
          if (both) { aiReactionAttemptRef.current = null; return }
          if (windowState.priority === 'P2') {
            const reactionKey = `${state.turnNumber}:${windowState.openedBy}:${windowState.priority}:${windowState.nonActivePlayerResponded ? 1 : 0}:${windowState.activePlayerResponded ? 1 : 0}:${windowState.responseCards.length}`
            // A resolver mismatch must never leave the AI retrying the same response forever.
            // One failed attempt gets one short retry tick, then P2 safely passes priority.
            if (aiReactionAttemptRef.current === reactionKey) {
              aiReactionAttemptRef.current = null
              actions.passReaction('P2')
              return
            }
            aiReactionAttemptRef.current = reactionKey
            const reactions = legalReactionCardIds(state, definitions, 'P2')
            if (reactions[0]) actions.playReaction('P2', reactions[0]); else actions.passReaction('P2')
          } else {
            aiReactionAttemptRef.current = null
          }
          return
        }
        aiReactionAttemptRef.current = null
        if (state.status !== 'active' || state.currentPlayerTurn !== 'P2') return
        const p2 = state.players.P2
        if (state.currentPhase === 'Main') {
          if (!p2.normalDeployUsed) {
            const reserveTarget = p2.reserves.findIndex((slot) => !slot)
            const basic = p2.hand.find((id) => definitions[id]?.cardType === 'hoodmon' && definitions[id]?.stageLevel === 1 && (definitions[id]?.bondCost ?? 0) <= p2.bond)
            if (basic && !p2.activeHoodmon) { actions.deploy(basic, 'active'); return }
            if (basic && reserveTarget >= 0) { actions.deploy(basic, `reserve_${reserveTarget + 1}` as 'reserve_1'|'reserve_2'|'reserve_3'); return }
          }
          if (state.round >= 2) {
            const hoodmon = [p2.activeHoodmon, ...p2.reserves].filter(Boolean)
            for (const card of hoodmon) {
              if (!card) continue
              const discount = (card.runtimeAbilities ?? [])
                .filter((ability) => ability.kind === 'street_contract' && (ability.expiresOnTurn ?? state.turnNumber) >= state.turnNumber)
                .reduce((sum, ability) => sum + Math.max(0, ability.amount), 0)
              const next = p2.hand.find((id) => definitions[id]?.cardType === 'hoodmon'
                && definitions[id]?.evolvesFrom === card.definitionId
                && Math.max(0, (definitions[id]?.bondCost ?? 0) - discount) <= p2.bond)
              if (next) { actions.evolve(card.instanceId, next); return }
            }
          }
          if (tamerActivationReady(state, definitions, 'P2')) { actions.activateTamer(); return }
          if (!p2.field) {
            const field = p2.hand.find((id) => definitions[id]?.cardType === 'field' && fieldExecutionReady(id) && (definitions[id]?.bondCost ?? 0) <= p2.bond)
            if (field) { actions.playSupport(field, 'field'); return }
          }
          const openTrapIndex = p2.traps.findIndex((slot) => !slot)
          if (openTrapIndex >= 0) {
            const trap = p2.hand.find((id) => definitions[id]?.cardType === 'trap'
              && reactionExecutionReady(id)
              && (definitions[id]?.bondCost ?? 0) <= p2.bond)
            if (trap) { actions.playSupport(trap, `trap_${openTrapIndex + 1}` as 'trap_1' | 'trap_2'); return }
          }
          const standardMagic = p2.hand.find((id) =>
            definitions[id]?.cardType === 'magic'
            && definitions[id]?.magicSubtype === 'Standard'
            && standardMagicExecutionReady(id)
            && (definitions[id]?.bondCost ?? 0) <= p2.bond
            && standardMagicHasLegalTarget(state, definitions, 'P2', id),
          )
          if (standardMagic) { actions.playSupport(standardMagic, 'magic_1'); return }
          actions.advancePhase(); return
        }
        if (state.currentPhase === 'Command') {
          const active = p2.activeHoodmon
          if (active && active.readyState === 'ready' && active.commandsUsedThisTurn < 1 && (definitions[active.definitionId]?.attacks?.length ?? 0) > 0) { actions.attack(0); return }
          const readyTaskers = [p2.activeHoodmon, ...p2.reserves].filter((card) => card && card.readyState === 'ready' && card.commandsUsedThisTurn < 1 && !card.restrictions.cannotTask)
          const legalTasks = (['P1','P2'] as const).flatMap((owner) =>
            state.players[owner].taskZone.flatMap((taskId, slot) => taskId && taskCanBeAttempted(state, definitions, 'P2', taskId)
              ? [{ owner, slot: slot as 0|1|2, taskId }]
              : []),
          )
          const taskPair = readyTaskers.flatMap((card) => legalTasks
            .filter((task) => hoodmonCanAttemptTask(state, definitions, 'P2', card!.instanceId, task.taskId))
            .map((task) => ({ card: card!, task })))[0]
          if (taskPair) {
            actions.attemptTask(taskPair.card.instanceId, taskPair.task.owner, taskPair.task.slot); return
          }
          actions.advancePhase(); return
        }
        actions.advancePhase()
      } catch { /* GameContext writes rule errors for invoked actions. */ }
    }, arenaMode === 'tower' ? 450 : 600)
    return () => window.clearTimeout(timer)
  }, [active, state, definitions, actions, arenaMode])

  return (
    <section className={`app-shell viewport-${state.viewportOwner.toLowerCase()}`}>
      <header className="battle-topbar">
        <div className="brand"><span className="crown">♛</span><div><h2>HOODMON</h2><small>{arenaMode === 'tower' ? 'TOWER AI BATTLE' : 'STREET GRID vs AI'}</small></div></div>
        <div className="match-meta"><span>ROUND <b>{state.round}</b></span><span>TURN <b>{state.turnNumber}</b></span><span>STATUS <b>{state.status}</b></span></div>
      </header>
      <PhaseBar />
      {battleFlash && (
        <div className={`battle-flash ${battleFlash.tone}`} role="status" aria-live="polite">
          <span>{battleFlash.label}</span>
          <strong>{battleFlash.text}</strong>
        </div>
      )}
      {attackImpact && (
        <div key={attackImpact.key} className={`attack-impact-lane attacker-${attackImpact.attacker.toLowerCase()}`} aria-hidden="true">
          <i className="attack-streak attack-streak-a" /><i className="attack-streak attack-streak-b" /><b>✦</b>
        </div>
      )}
      {damagePopup && (
        <div key={damagePopup.key} className={`damage-popup damage-${damagePopup.player.toLowerCase()} ${damagePopup.lp ? 'lp-hit' : ''}`} role="status" aria-live="polite">
          <b>-{damagePopup.amount}</b><span>{damagePopup.lp ? 'LP' : 'DMG'}</span>
        </div>
      )}
      {taskBurst && (
        <div key={taskBurst.key} className={`task-burst task-${taskBurst.player.toLowerCase()}`} aria-hidden="true"><span>★</span><b>+1 TASK</b><i>✦</i><i>✦</i><i>✦</i></div>
      )}
      <PlayerPanel playerId="P2" opponent />
      <div className="center-mark"><span>AWAKEN THE BOND</span></div>
      <PlayerPanel playerId="P1" handCardId={interactionCard} acceptHandDrops onCardPlayed={() => { playCue('card_drop'); setSelectedHandCard(null); setDraggingHandCard(null) }} />
      <BattleControls />
      <aside className="event-log" aria-live="polite" aria-relevant="additions text"><h3>BATTLE FEED</h3>{[...state.eventLog].reverse().slice(0, 10).map((line, i) => <div key={`${line}-${i}`}>{line}</div>)}</aside>
      <BattleHand playerId="P1" selectedCardId={selectedHandCard} onSelectedCardChange={setSelectedHandCard} onDraggingCardChange={setDraggingHandCard} />
    </section>
  )
}

function RulesPage() {
  return (
    <main className="page rules-page">
      <PageTitle eyebrow="CURRENT STANDARD · SEPTEMBER 2026" title="CORE RULES" subtitle="10 Tasks · 0 LP · required-draw deck-out victory standard" />
      <section className="rules-grid">
        <RuleBlock number="01" title="SETUP"><p>Each player uses a <b>40-card Hoodmon Deck</b>, separate <b>10-card Task Deck</b>, and <b>1 Tamer</b>. Draw <b>5 cards</b>, mulligan a no-Basic hand, then place <b>1 Basic Active</b> and optionally <b>1 Basic Reserve</b> for free. Start at <b>2,500 LP</b>, <b>5 Bond</b>, and <b>0 completed Tasks</b>.</p></RuleBlock>
        <RuleBlock number="02" title="BOND"><p>Gain <b>+1 Bond</b> during your Bond Phase, up to <b>10</b>. Unspent Bond carries over. Normal deployment and evolution pay the printed Bond Cost.</p></RuleBlock>
        <RuleBlock number="03" title="BOARD"><p>Each player has <b>1 Active Hoodmon</b>, up to <b>3 Reserves</b>, <b>3 Magic/Equipment</b> zones, <b>2 Trap</b> zones, <b>1 Field</b>, and a <b>3-slot Task Card Zone</b>.</p></RuleBlock>
        <RuleBlock number="04" title="COMMANDS"><p>Each ready Hoodmon normally has <b>1 Command</b>. The Active may Battle or Task. Reserve Hoodmon may Task and use legal skills, but cannot normally Battle.</p></RuleBlock>
        <RuleBlock number="05" title="EVOLUTION"><p>No normal evolution during <b>Round 1</b>. From Round 2, Active or Reserve Hoodmon may evolve during Main by using the correct next-stage card from hand and paying its printed Bond Cost. Damage does not automatically heal.</p></RuleBlock>
        <RuleBlock number="06" title="TASKS"><p>Each player begins with <b>1 face-up Task</b>. Either player may attempt either face-up Task using a ready Active or Reserve Hoodmon. <b>Every successfully completed Task adds 1</b> to that player’s match total, regardless of which Task Deck supplied it.</p></RuleBlock>
        <RuleBlock number="07" title="COMBAT"><p>Printed attack damage is used as written; <b>ATK is not automatically added</b>. Attacks normally target the opposing Active Hoodmon. Direct Tamer attacks are legal only when no opposing Active Hoodmon exists.</p></RuleBlock>
        <RuleBlock number="08" title="TURN"><p><b>Refresh → Draw → Bond → Main → Command → End.</b> Reaction windows open after attacks, Task attempts, evolution, or effects that allow a response. Human reaction priority is timed: <b>10 seconds</b> when a legal Trap/Quick response exists and <b>2 seconds</b> when no legal response exists. Expired priority automatically passes, and once both players answer the stack resolves automatically.</p></RuleBlock>
        <RuleBlock number="09" title="VICTORY"><p>Win by <b>completing 10 Tasks</b>, reducing the opposing Tamer to <b>0 LP</b>, or forcing the opponent to draw from an <b>empty Main Deck</b>. Reaching 0 cards is not itself a loss; deck-out occurs only when a draw is required and no card is available.</p></RuleBlock>
        <RuleBlock number="10" title="CHARMED & MARKED"><p><b>Charmed</b> is a named status used by Peaches and Pack Pressure cards. Charmed has <b>no automatic penalty by itself</b>; individual card effects state what changes when a Hoodmon is Charmed. It remains on that Hoodmon while it stays in play unless a card removes it. <b>Legacy Peaches artwork that says Leashed is treated as Charmed in current play.</b></p><p><b>Marked</b> is Cherry Banks' targeting/intel status. Marked also has <b>no automatic penalty by itself</b>; Cherry cards define the payoff for attacking or affecting a Marked Hoodmon. If an effect Marks a Hoodmon without stating a duration, it remains Marked until the end of that Hoodmon controller's next turn. Marking it again refreshes that duration and does not stack. Marked remains through Active/Reserve switches and evolution, but is removed when the Hoodmon leaves play.</p></RuleBlock>
      </section>
    </main>
  )
}

function RuleBlock({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <article className="rule-block"><span>{number}</span><h3>{title}</h3>{children}</article>
}

function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <header className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></header>
}

function SignInModal({ onClose, onSignIn }: { onClose: () => void; onSignIn: (playerTag: string) => void }) {
  const [playerTag, setPlayerTag] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const tag = playerTag.trim()
    if (!tag) return
    onSignIn(tag.slice(0, 24))
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="sign-in-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <span className="brand-crown">♛</span>
        <span className="eyebrow">PLAYER SESSION</span>
        <h2>ENTER THE HOODMON ARENA</h2>
        <p>This build uses a local player profile while full account authentication is connected later. Your player tag stays on this device.</p>
        <label>
          <span>PLAYER TAG</span>
          <input autoFocus value={playerTag} onChange={(event) => setPlayerTag(event.target.value)} maxLength={24} placeholder="Enter your name or tag" />
        </label>
        <div className="sign-in-actions">
          <button type="button" className="secondary-action" onClick={onClose}>CANCEL</button>
          <button className="primary-action" disabled={!playerTag.trim()}>SIGN IN & BATTLE</button>
        </div>
      </form>
    </div>
  )
}

function CardModal({ card, onClose }: { card: SeriesCard | null; onClose: () => void }) {
  useEffect(() => {
    if (!card) return
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [card, onClose])

  if (!card) return null
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="card-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <img src={card.image} alt={`${card.id} ${card.name}`} />
        <div className="modal-meta"><span>{card.id} · {card.kind}</span><h2>{card.name}</h2><p>{card.family}</p></div>
      </div>
    </div>
  )
}
