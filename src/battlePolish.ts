let polishQueued = false

function queuePolishSync() {
  if (polishQueued) return
  polishQueued = true
  window.requestAnimationFrame(() => {
    polishQueued = false
    syncBattlePhase()
    syncAttackVector()
  })
}

function syncBattlePhase() {
  const shell = document.querySelector<HTMLElement>('.app-shell')
  const activePhase = document.querySelector<HTMLElement>('.phase-pill.active')?.textContent?.trim().toLowerCase()
  if (!shell) return
  if (activePhase) shell.dataset.phase = activePhase
  else delete shell.dataset.phase
}

function removeAttackVector() {
  document.getElementById('hoodmon-attack-vector')?.remove()
}

function syncAttackVector() {
  const impact = document.querySelector<HTMLElement>('.attack-impact-lane')
  if (!impact) {
    removeAttackVector()
    return
  }

  const attacker = impact.classList.contains('attacker-p2') ? 'p2' : 'p1'
  const sourceSelector = attacker === 'p1'
    ? '.player-panel:not(.opponent) .hoodmon-slot.active-card.has-card'
    : '.player-panel.opponent .hoodmon-slot.active-card.has-card'
  const targetSelector = attacker === 'p1'
    ? '.player-panel.opponent .hoodmon-slot.active-card.has-card'
    : '.player-panel:not(.opponent) .hoodmon-slot.active-card.has-card'

  const source = document.querySelector<HTMLElement>(sourceSelector)
  const target = document.querySelector<HTMLElement>(targetSelector)
  if (!source || !target) {
    removeAttackVector()
    return
  }

  const sourceRect = source.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const x1 = sourceRect.left + sourceRect.width / 2
  const y1 = sourceRect.top + sourceRect.height / 2
  const x2 = targetRect.left + targetRect.width / 2
  const y2 = targetRect.top + targetRect.height / 2

  let svg = document.getElementById('hoodmon-attack-vector') as SVGSVGElement | null
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = 'hoodmon-attack-vector'
    svg.setAttribute('aria-hidden', 'true')
    document.body.appendChild(svg)
  }

  svg.dataset.attacker = attacker
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`)
  svg.innerHTML = `
    <line class="attack-vector-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
    <circle class="attack-vector-source" cx="${x1}" cy="${y1}" r="6" />
    <circle class="attack-vector-target" cx="${x2}" cy="${y2}" r="8" />
  `
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(queuePolishSync)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'disabled'],
  })
  window.addEventListener('resize', queuePolishSync)
  window.addEventListener('scroll', queuePolishSync, { passive: true })
  queuePolishSync()
}
