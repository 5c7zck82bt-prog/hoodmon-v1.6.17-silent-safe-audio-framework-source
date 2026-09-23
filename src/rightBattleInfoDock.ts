export {}

type BattleInfoPanel = 'feed' | 'turn'

const HOST_ID = 'battle-info-tabs'
let syncQueued = false

function setOpenPanel(panel: BattleInfoPanel | null) {
  if (panel) document.body.dataset.battleInfoPanel = panel
  else delete document.body.dataset.battleInfoPanel
  syncDockState()
}

function makeTab(panel: BattleInfoPanel, label: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.panel = panel
  button.setAttribute('role', 'tab')
  button.setAttribute('aria-controls', panel === 'feed' ? 'battle-feed-panel' : 'turn-phase-panel')
  button.textContent = label
  button.addEventListener('click', () => {
    const current = document.body.dataset.battleInfoPanel as BattleInfoPanel | undefined
    setOpenPanel(current === panel ? null : panel)
  })
  return button
}

function ensureHost() {
  let host = document.getElementById(HOST_ID)
  if (host) return host

  host = document.createElement('div')
  host.id = HOST_ID
  host.setAttribute('role', 'tablist')
  host.setAttribute('aria-label', 'Battle information')
  host.append(
    makeTab('feed', 'BATTLE FEED'),
    makeTab('turn', 'TURN GUIDE'),
  )
  document.body.appendChild(host)
  return host
}

function syncDockState() {
  const shell = document.querySelector<HTMLElement>('.app-shell')
  const host = ensureHost()
  host.hidden = !shell

  const feed = shell?.querySelector<HTMLElement>(':scope > .event-log')
  const turn = shell?.querySelector<HTMLElement>(':scope > .phase-bar')
  if (feed) feed.id = 'battle-feed-panel'
  if (turn) turn.id = 'turn-phase-panel'

  const current = document.body.dataset.battleInfoPanel as BattleInfoPanel | undefined
  if (!shell && current) delete document.body.dataset.battleInfoPanel

  host.querySelectorAll<HTMLButtonElement>('button[data-panel]').forEach((button) => {
    const panel = button.dataset.panel as BattleInfoPanel
    const selected = Boolean(shell && current === panel)
    button.setAttribute('aria-selected', String(selected))
    button.setAttribute('aria-expanded', String(selected))
  })
}

function queueSync() {
  if (syncQueued) return
  syncQueued = true
  window.requestAnimationFrame(() => {
    syncQueued = false
    syncDockState()
  })
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(queueSync)
  observer.observe(document.body, { subtree: true, childList: true })
  queueSync()
}
