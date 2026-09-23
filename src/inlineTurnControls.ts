const INLINE_CONTROLS_ID = 'p1-inline-turn-controls'

let syncQueued = false

function queueSync() {
  if (syncQueued) return
  syncQueued = true
  window.requestAnimationFrame(() => {
    syncQueued = false
    syncInlineTurnControls()
  })
}

function syncInlineTurnControls() {
  const stats = document.querySelector<HTMLElement>('.player-panel:not(.opponent) .stat-row')
  const advance = document.querySelector<HTMLButtonElement>('.app-shell > .turn-console .primary-controls > button.advance')
  const reset = document.querySelector<HTMLButtonElement>('.app-shell > .turn-console .primary-controls > button.reset-match')
  const activePhase = document.querySelector<HTMLElement>('.phase-pill.active')?.textContent?.trim().toLowerCase() || ''
  let host = document.getElementById(INLINE_CONTROLS_ID)

  if (!stats || !advance || !reset) {
    host?.remove()
    return
  }

  if (!host) {
    host = document.createElement('div')
    host.id = INLINE_CONTROLS_ID
    host.className = 'inline-turn-controls'
    host.setAttribute('role', 'group')
    host.setAttribute('aria-label', 'Turn controls')

    const nextButton = document.createElement('button')
    nextButton.type = 'button'
    nextButton.className = 'inline-turn-advance'
    nextButton.addEventListener('click', () => {
      const source = document.querySelector<HTMLButtonElement>('.app-shell > .turn-console .primary-controls > button.advance')
      if (source && !source.disabled) source.click()
    })

    const resetButton = document.createElement('button')
    resetButton.type = 'button'
    resetButton.className = 'inline-turn-reset'
    resetButton.textContent = 'RESET'
    resetButton.addEventListener('click', () => {
      const confirmed = window.confirm('Reset this match? All current battle progress will be lost.')
      if (!confirmed) return
      const source = document.querySelector<HTMLButtonElement>('.app-shell > .turn-console .primary-controls > button.reset-match')
      source?.click()
    })

    host.append(nextButton, resetButton)

    const taskStat = stats.children.item(2)
    stats.insertBefore(host, taskStat)
  } else if (host.parentElement !== stats) {
    const taskStat = stats.children.item(2)
    stats.insertBefore(host, taskStat)
  }

  if (activePhase) host.dataset.phase = activePhase
  else delete host.dataset.phase

  const nextButton = host.querySelector<HTMLButtonElement>('.inline-turn-advance')
  if (nextButton) {
    const label = advance.textContent?.trim() || 'NEXT PHASE'
    if (nextButton.textContent !== label) nextButton.textContent = label
    nextButton.disabled = advance.disabled
    nextButton.setAttribute('aria-label', label)
  }
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(queueSync)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'disabled'],
  })
  queueSync()
}
