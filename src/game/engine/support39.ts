import { MAX_BOND } from './constants'
import { addModifier, addRuntimeAbility, allHoodmon, appendLog, effectiveAtk, effectiveHp, findHoodmon, hasStatus, modifierTotal, otherPlayer, setTemporaryRestriction } from './helpers'
import type { CardDefinition, CardInstance, ChoiceOption, GameState, PendingAttack, PendingChoice, PendingTargetedEffect, PlayerId, Position } from './types'

export const SUPPORT39_IDS = new Set([
  'HDM-001','HDM-008','HDM-009','HDM-012','HDM-013','HDM-014','HDM-015','HDM-016','HDM-022','HDM-023','HDM-024','HDM-025','HDM-027','HDM-030',
  'HDM-056','HDM-057','HDM-059','HDM-060','HDM-061','HDM-063','HDM-067','HDM-070','HDM-071','HDM-072','HDM-073','HDM-074','HDM-075','HDM-077','HDM-078','HDM-083','HDM-084',
  'HDM-094','HDM-101','HDM-102','HDM-104','HDM-105','HDM-106','HDM-107','HDM-108','HDM-109',
])

const STANDARD_MAGIC_IDS = new Set(['HDM-009','HDM-012','HDM-013','HDM-022','HDM-025','HDM-059','HDM-061','HDM-070','HDM-071','HDM-075','HDM-084','HDM-101','HDM-102','HDM-106','HDM-109'])
const FIELD_IDS = new Set(['HDM-008','HDM-023','HDM-067','HDM-074','HDM-083','HDM-105','HDM-108'])
const REACTION_IDS = new Set(['HDM-014','HDM-015','HDM-024','HDM-027','HDM-056','HDM-057','HDM-060','HDM-072','HDM-073','HDM-077','HDM-104','HDM-107'])
const TAMER_IDS = new Set(['HDM-001','HDM-016','HDM-030','HDM-063','HDM-078','HDM-094'])

function definitionText(definition: CardDefinition | undefined): string {
  return [definition?.name ?? '', definition?.effectText ?? '', ...(definition?.archetypeTags ?? [])].join(' ').toLowerCase()
}
function hasAlignment(definition: CardDefinition | undefined, ...wanted: string[]): boolean {
  return Boolean(definition?.alignment?.some((value) => wanted.includes(value)))
}
function hasTrait(definition: CardDefinition | undefined, ...wanted: string[]): boolean {
  return Boolean(definition?.archetypeTags?.some((value) => wanted.includes(value)))
}
function mentions(definition: CardDefinition | undefined, text: string): boolean { return definitionText(definition).includes(text.toLowerCase()) }
function isBeast(definition: CardDefinition | undefined): boolean { return hasAlignment(definition, 'Beast') }
function isWind(definition: CardDefinition | undefined): boolean { return hasAlignment(definition, 'Wind') }
function isWaterNatureSmoke(definition: CardDefinition | undefined): boolean { return hasAlignment(definition, 'Water','Nature','Smoke') }
function isWaterOrSmoke(definition: CardDefinition | undefined): boolean { return hasAlignment(definition, 'Water','Smoke') }
function isDarkOrFairy(definition: CardDefinition | undefined): boolean { return hasAlignment(definition, 'Dark','Fairy') }
function isBearded(definition: CardDefinition | undefined): boolean { return hasTrait(definition, 'Bearded Dragon') }
function isPitBull(definition: CardDefinition | undefined): boolean { return hasTrait(definition, 'Pit Bull') }
function isBright(definition: CardDefinition | undefined): boolean { return hasTrait(definition, 'Bright Flame') }
function isShadow(definition: CardDefinition | undefined): boolean { return hasTrait(definition, 'Shadow Ember') }
function isTech(definition: CardDefinition | undefined): boolean { return hasTrait(definition, 'Tech') || mentions(definition, 'Tech') }
function isBird(definition: CardDefinition | undefined): boolean { return hasTrait(definition, 'Bird') }
export function support39OpponentHasRevealedCard(state:GameState,playerId:PlayerId):boolean{
  if(usedThisTurn(state,playerId,'SUP39','hand_revealed'))return true
  const truthField=['P1','P2'].some((controller)=>{
    const field=state.players[controller as PlayerId].field
    return field?.definitionId==='HDM-083'&&!support39CardEffectsNegated(state,field)
  })
  return truthField&&state.players[playerId].hoodmonDeck.length>0
}

function markerKey(source: string, kind: string) { return `__${source}_${kind}` }
function usedThisTurn(state: GameState, playerId: PlayerId, source: string, kind: string): boolean {
  return state.taskProgress[playerId]?.[markerKey(source, kind)] === state.turnNumber
}
function markThisTurn(state: GameState, playerId: PlayerId, source: string, kind: string): void {
  state.taskProgress[playerId] ??= {}
  state.taskProgress[playerId][markerKey(source, kind)] = state.turnNumber
}
function instanceMarker(card: CardInstance | null, source: string, turn: number): boolean {
  return Boolean(card?.runtimeAbilities?.some((ability) => ability.kind === 'support39_marker' && ability.sourceCardId === source && (ability.expiresOnTurn ?? -1) >= turn))
}
function addInstanceMarker(state: GameState, card: CardInstance, source: string, expiresOnTurn = state.turnNumber): void {
  addRuntimeAbility(state, card, source, 'support39_marker', 1, expiresOnTurn)
}
export function support39CardEffectsNegated(state: GameState, card: CardInstance | null | undefined): boolean {
  return instanceMarker(card ?? null, 'HDM-016-NEGATED', state.turnNumber)
}
function runtimeCardByInstance(state: GameState, playerId: PlayerId, instanceId: string): CardInstance | null {
  return allRuntimeControlled(state, playerId).find((card) => card.instanceId === instanceId) ?? null
}
function visibleEffectCards(state: GameState, playerId: PlayerId): CardInstance[] {
  const p = state.players[playerId]
  return [p.tamer, p.activeHoodmon, ...p.reserves, p.field, ...p.magic].filter((card): card is CardInstance => Boolean(card))
}
function hasNeighborhoodLoyaltyRuntime(state: GameState, defs: Record<string, CardDefinition>, card: CardInstance): boolean {
  return hasTrait(defs[card.definitionId], 'Neighborhood Loyalty') || instanceMarker(card, 'SUP39_NEIGHBORHOOD_LOYALTY', state.turnNumber)
}

function openChoice(state: GameState, choice: PendingChoice): GameState {
  state.pendingChoice = choice
  state.status = 'choice'
  appendLog(state, `${choice.player} must resolve ${choice.sourceCardId}: ${choice.prompt}`)
  return state
}
function cardOption(defs: Record<string, CardDefinition>, zone: string, cardId: string, index: number): ChoiceOption {
  const def = defs[cardId]
  return { id: `${zone}:${index}:${cardId}`, value: `${index}|${cardId}`, cardId, label: def?.name ?? cardId, detail: `${cardId} · ${def?.cardType.toUpperCase() ?? 'CARD'}${def?.alignment?.length ? ` · ${def.alignment.join('/')}` : ''}` }
}
function hoodmonOption(defs: Record<string, CardDefinition>, owner: PlayerId, card: CardInstance): ChoiceOption {
  const def = defs[card.definitionId]
  return { id: `${owner}:${card.instanceId}`, player: owner, instanceId: card.instanceId, cardId: card.definitionId, label: def?.name ?? card.definitionId, detail: `${owner} · ${def?.alignment?.join('/') ?? ''} · ${card.readyState.toUpperCase()}` }
}
function shuffle<T>(items: T[]): T[] {
  const copy=[...items]
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}
  return copy
}
function drawRequired(state: GameState, playerId: PlayerId, amount=1): void {
  for(let i=0;i<amount;i++){
    if(state.status==='game_over') return
    const player=state.players[playerId]
    if(!player.hoodmonDeck.length){
      const winner=otherPlayer(playerId)
      state.winner={player:winner,reason:'deckout'}
      state.status='game_over'; state.reactionWindow=null; state.pendingChoice=null
      appendLog(state, `${playerId} was required to draw from an empty Hoodmon Deck. ${winner} wins by deck-out.`)
      return
    }
    const card=player.hoodmonDeck.shift()!; player.hand.push(card); appendLog(state, `${playerId} drew 1 card.`)
    notifyTopCardChanged39(state, playerId)
  }
}
function gainBond(state: GameState, playerId: PlayerId, amount=1, source?: string): void {
  const before=state.players[playerId].bond; state.players[playerId].bond=Math.min(MAX_BOND,before+amount)
  if(state.players[playerId].bond!==before) appendLog(state, `${source ? source+' — ' : ''}${playerId} gained ${state.players[playerId].bond-before} Bond.`)
}
function exhaustByCardEffect39(state:GameState,defs:Record<string,CardDefinition>,sourcePlayer:PlayerId,targetOwner:PlayerId,target:CardInstance,sourceCardId:string):void{
  const wasReady=target.readyState==='ready'
  if(target.restrictions.cannotBeExhaustedByEffects){appendLog(state,`${defs[target.definitionId]?.name??target.definitionId} cannot be Exhausted by card effects this turn.`);return}
  target.readyState='exhausted'
  if(!wasReady||sourcePlayer===targetOwner)return
  state.taskProgress[sourcePlayer]??={}
  const progress=state.taskProgress[sourcePlayer]
  progress['HDM-110']=Math.min(2,(progress['HDM-110']??0)+1)
  appendLog(state,`${defs[sourceCardId]?.name??sourceCardId} Exhausted an opposing Hoodmon by card effect. Crash Their Feed progress: ${progress['HDM-110']}/2.`)
}
function discardChoice(state: GameState, defs: Record<string, CardDefinition>, playerId: PlayerId, sourceCardId: string, actionKey: string, prompt='Choose 1 card from your hand to discard.', context?: PendingChoice['context']): GameState {
  const hand=state.players[playerId].hand
  if(!hand.length) return state
  return openChoice(state,{player:playerId,sourceCardId,prompt,minSelections:1,maxSelections:1,options:hand.map((id,i)=>cardOption(defs,'hand',id,i)),actionKey,context})
}
function deckLookOrderChoice(state: GameState, defs: Record<string, CardDefinition>, chooser: PlayerId, deckOwner: PlayerId, sourceCardId: string, count: number, actionKey: string, allowBottomOne=false, context?: PendingChoice['context']): GameState {
  const deck=state.players[deckOwner].hoodmonDeck
  const shown=deck.splice(0,Math.min(count,deck.length))
  if(!shown.length){ appendLog(state, `${sourceCardId} found no cards to inspect.`); return state }
  const entries=shown.map((id,i)=>`${i}|${id}`)
  const options=entries.map((entry)=>{const [i,id]=entry.split('|'); return {id:`look:${i}:${id}`,value:entry,cardId:id,label:defs[id]?.name??id,detail: allowBottomOne ? 'Select all in preferred top order; a later step may bottom one card.' : 'Select all in the order they should return to the top.'}})
  return openChoice(state,{player:chooser,sourceCardId,prompt:`Reorder the top ${shown.length} card${shown.length===1?'':'s'} of ${deckOwner}'s Hoodmon Deck.`,minSelections:shown.length,maxSelections:shown.length,options,actionKey,context:{...(context??{}),deckOwner,allowBottomOne,entries,triggerDeckLook:true}})
}
function restoreTopInSelectedOrder(state: GameState, choice: PendingChoice, selected: ChoiceOption[]): void {
  const deckOwner=String(choice.context?.deckOwner ?? choice.player) as PlayerId
  const ids=selected.map((o)=>String(o.value??'').split('|')[1]).filter(Boolean)
  state.players[deckOwner].hoodmonDeck.unshift(...ids)
  notifyTopCardChanged39(state, deckOwner)
}
function allRuntimeControlled(state: GameState, playerId: PlayerId): CardInstance[] {
  const p=state.players[playerId]
  return [p.tamer,p.activeHoodmon,...p.reserves,p.field,...p.magic,...p.traps].filter((c):c is CardInstance=>Boolean(c))
}
function removeFromBoard(state: GameState, owner: PlayerId, card: CardInstance): void {
  const p=state.players[owner]
  if(p.activeHoodmon?.instanceId===card.instanceId) p.activeHoodmon=null
  p.reserves=p.reserves.map((c)=>c?.instanceId===card.instanceId?null:c) as typeof p.reserves
}
function returnWholeStackToHand(state: GameState, defs: Record<string, CardDefinition>, owner: PlayerId, card: CardInstance): void {
  removeFromBoard(state,owner,card)
  state.players[owner].hand.push(...card.evolutionStack,card.definitionId)
  appendLog(state, `${owner} returned ${card.evolutionStack.length+1} card${card.evolutionStack.length?'s':''} from that Hoodmon stack to hand.`)
  syncSupport39PersistentFields(state,defs,owner)
  if(!state.players[owner].activeHoodmon && state.players[owner].reserves.some(Boolean)) state.pendingPromotion=owner
}
function makeFreeHoodmonInstance(definitionId:string, owner:PlayerId, position:Position):CardInstance{
  return {instanceId:`${owner}-FREE-${definitionId}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,definitionId,owner,controller:owner,readyState:'ready',position,damageTaken:0,commandsUsedThisTurn:0,evolutionStack:[],restrictions:{},restrictionExpiresOnTurn:{},modifiers:[],runtimeAbilities:[],statuses:[],statusExpiresOnTurn:{}}
}

export function support39StandardMagicReady(id:string){return STANDARD_MAGIC_IDS.has(id)}
export function support39FieldReady(id:string){return FIELD_IDS.has(id)}
export function support39ReactionReady(id:string){return REACTION_IDS.has(id)}
export function support39TamerId(id:string|undefined){return Boolean(id&&TAMER_IDS.has(id))}

export function support39StandardMagicHasLegalTarget(state:GameState, defs:Record<string,CardDefinition>, p:PlayerId, id:string):boolean{
  const own=allHoodmon(state.players[p]), opp=allHoodmon(state.players[otherPlayer(p)])
  if(id==='HDM-009') return state.players[p].discard.some(x=>x!==id&&isBeast(defs[x]))
  if(id==='HDM-012') return own.some(c=>isBeast(defs[c.definitionId]))
  if(id==='HDM-013') return own.some(c=>isBeast(defs[c.definitionId]))
  if(id==='HDM-022') return state.players[p].discard.some(x=>isWind(defs[x])) && own.some(c=>isWind(defs[c.definitionId]))
  if(id==='HDM-025') return allRuntimeControlled(state,p).some(c=>isTech(defs[c.definitionId]))
  if(id==='HDM-059') return state.players[otherPlayer(p)].hand.some(x=>defs[x]?.cardType!=='hoodmon')
  if(id==='HDM-061') return state.players[p].hoodmonDeck.some(x=>defs[x]?.cardType==='trap') || state.players[p].taskDeck.length>0
  if(id==='HDM-070') return state.players[p].discard.some(x=>x!==id&&isWaterNatureSmoke(defs[x]))
  if(id==='HDM-071') return opp.length>0
  if(id==='HDM-075') return state.players[p].hoodmonDeck.some(x=>defs[x]?.cardType==='hoodmon'&&defs[x]?.stageLevel===1&&isWaterOrSmoke(defs[x]))
  if(id==='HDM-084') return own.length>0 && state.players[otherPlayer(p)].hoodmonDeck.length>0
  if(id==='HDM-101') return state.players[p].hoodmonDeck.some(x=>isBright(defs[x])||isShadow(defs[x]))
  if(id==='HDM-102') return own.some(c=>isBearded(defs[c.definitionId])||isPitBull(defs[c.definitionId]))
  if(id==='HDM-106') { const a=state.players[p].activeHoodmon; return Boolean(a&&(isBright(defs[a.definitionId])||isShadow(defs[a.definitionId]))&&state.players[p].reserves.some(r=>r&&r.definitionId!==a.definitionId&&isBearded(defs[r.definitionId]))) }
  if(id==='HDM-109') return own.some(c=>isBright(defs[c.definitionId])||isShadow(defs[c.definitionId]))
  return true
}

export function activateSupport39StandardMagic(state:GameState, defs:Record<string,CardDefinition>, p:PlayerId, id:string):GameState{
  const own=allHoodmon(state.players[p]); const oppId=otherPlayer(p)
  if(id==='HDM-009'||id==='HDM-070'){
    const predicate=id==='HDM-009'?(x:string)=>isBeast(defs[x]):(x:string)=>isWaterNatureSmoke(defs[x])
    // Standard Magic is staged in Discard before its resolver runs. Exclude the just-played
    // copy from its own recovery pool. Older copies of the same recovery Magic are also excluded
    // so two copies cannot recursively loop forever during one Main Phase.
    const justPlayedIndex=state.players[p].discard.length-1
    const options=state.players[p].discard.flatMap((x,i)=>i!==justPlayedIndex&&x!==id&&predicate(x)?[cardOption(defs,'discard',x,i)]:[])
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose 1 or 2 eligible cards from your Discard. The first selected returns to hand; a second selected card is shuffled into your Deck.',minSelections:1,maxSelections:Math.min(2,options.length),options,actionKey:`${id}_RECOVER`})
  }
  if(id==='HDM-012'){
    const options=own.filter(c=>isBeast(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c))
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose 1 Beast Hoodmon you control for Drunken Fist Lesson.',minSelections:1,maxSelections:1,options,actionKey:'HDM012_BUFF'})
  }
  if(id==='HDM-013'){
    own.filter(c=>isBeast(defs[c.definitionId])).forEach(c=>addModifier(state,c,id,'atk',200,'until_end_of_turn'))
    if(own.some(c=>['HDM-003','HDM-004'].includes(c.definitionId))) drawRequired(state,p,1)
    appendLog(state,'Pack Howl Rally gave all controlled Beast Hoodmon +200 ATK this turn.')
    return state
  }
  if(id==='HDM-022'){
    const options=state.players[p].discard.flatMap((x,i)=>isWind(defs[x])?[cardOption(defs,'discard',x,i)]:[])
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose 1 Wind Hoodmon in your Discard to return to hand.',minSelections:1,maxSelections:1,options,actionKey:'HDM022_RETURN'})
  }
  if(id==='HDM-025'){
    drawRequired(state,p,2); if(state.status==='game_over') return state
    if(own.some(c=>isWind(defs[c.definitionId]))) gainBond(state,p,1,'Good Neighbors Share Passwords')
    return discardChoice(state,defs,p,id,'HDM025_DISCARD','Draw 2 resolved. Choose 1 card to discard.')
  }
  if(id==='HDM-059'){
    const options=state.players[oppId].hand.flatMap((x,i)=>defs[x]?.cardType!=='hoodmon'?[cardOption(defs,'opponent-hand',x,i)]:[])
    return openChoice(state,{player:p,sourceCardId:id,prompt:`Choose 1 non-Hoodmon card from ${oppId}'s hand to place on the bottom of their Hoodmon Deck.`,minSelections:1,maxSelections:1,options,actionKey:'HDM059_BOTTOM',context:{targetPlayer:oppId}})
  }
  if(id==='HDM-061'){
    const options:ChoiceOption[]=[]
    state.players[p].hoodmonDeck.forEach((x,i)=>{if(defs[x]?.cardType==='trap')options.push({...cardOption(defs,'deck',x,i),detail:'TRAP · add to hand'})})
    state.players[p].taskDeck.forEach((x,i)=>options.push({...cardOption(defs,'taskdeck',x,i),detail:'TASK · move to top of separate Task Deck'}))
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose a Trap from your Hoodmon Deck or a Task from your separate Task Deck. Tamer cards are fixed outside the Main Deck in digital rules.',minSelections:1,maxSelections:1,options,actionKey:'HDM061_SEARCH'})
  }
  if(id==='HDM-071'){
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose 1 opposing Hoodmon for Gecko Ambush.',minSelections:1,maxSelections:1,options:allHoodmon(state.players[oppId]).map(c=>hoodmonOption(defs,oppId,c)),actionKey:'HDM071_TARGET'})
  }
  if(id==='HDM-075'||id==='HDM-101'){
    const predicate=id==='HDM-075'?(x:string)=>defs[x]?.cardType==='hoodmon'&&defs[x]?.stageLevel===1&&isWaterOrSmoke(defs[x]):(x:string)=>isBright(defs[x])||isShadow(defs[x])
    const options=state.players[p].hoodmonDeck.flatMap((x,i)=>predicate(x)?[cardOption(defs,'deck',x,i)]:[])
    return openChoice(state,{player:p,sourceCardId:id,prompt:id==='HDM-075'?'Search for 1 Stage 1 Water or Smoke Hoodmon.':'Search for 1 Bright Flame or Shadow Ember Hoodmon.',minSelections:1,maxSelections:1,options,actionKey:`${id}_SEARCH`})
  }
  if(id==='HDM-084'){
    return deckLookOrderChoice(state,defs,p,oppId,id,2,'HDM084_ORDER',false)
  }
  if(id==='HDM-102'){
    const options=own.filter(c=>isBearded(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c))
    if(!options.length) return openPitChoice102(state,defs,p,[])
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose up to 1 Bearded Dragon Hoodmon to gain +300 ATK this turn.',minSelections:0,maxSelections:1,options,actionKey:'HDM102_DRAGON'})
  }
  if(id==='HDM-106'){
    const active=state.players[p].activeHoodmon!
    returnWholeStackToHand(state,defs,p,active)
    state.pendingPromotion=null
    const options=state.players[p].reserves.flatMap(c=>c&&c.definitionId!==active.definitionId&&isBearded(defs[c.definitionId])?[hoodmonOption(defs,p,c)]:[])
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose a differently named Bearded Dragon from Reserve to become Active.',minSelections:1,maxSelections:1,options,actionKey:'HDM106_PROMOTE'})
  }
  if(id==='HDM-109'){
    const options=own.filter(c=>isBright(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c))
    if(!options.length) return openShadowChoice109(state,defs,p,[])
    return openChoice(state,{player:p,sourceCardId:id,prompt:'Choose up to 1 Bright Flame Hoodmon.',minSelections:0,maxSelections:1,options,actionKey:'HDM109_BRIGHT'})
  }
  return state
}

function openPitChoice102(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,chosen:string[]):GameState{
  const options=allHoodmon(state.players[p]).filter(c=>isPitBull(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c))
  if(!options.length){finish102(state,defs,p,chosen);return state}
  return openChoice(state,{player:p,sourceCardId:'HDM-102',prompt:'Choose up to 1 Pit Bull Hoodmon to gain +300 ATK this turn.',minSelections:0,maxSelections:1,options,actionKey:'HDM102_PIT',context:{chosen}})
}
function finish102(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,ids:string[]):void{
  for(const instanceId of ids){const c=findHoodmon(state.players[p],instanceId);if(c)addModifier(state,c,'HDM-102','atk',300,'until_end_of_turn')}
  if(state.players[p].tamer?.definitionId==='HDM-030'||allHoodmon(state.players[p]).some(c=>isPitBull(defs[c.definitionId]))) gainBond(state,p,1,'Street Sweetheart Pact')
}
function openShadowChoice109(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,chosen:string[]):GameState{
  const options=allHoodmon(state.players[p]).filter(c=>isShadow(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c))
  if(!options.length){finish109(state,defs,p,chosen);return state}
  return openChoice(state,{player:p,sourceCardId:'HDM-109',prompt:'Choose up to 1 Shadow Ember Hoodmon.',minSelections:0,maxSelections:1,options,actionKey:'HDM109_SHADOW',context:{chosen}})
}
function finish109(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,ids:string[]):void{
  let moved=false
  for(const instanceId of ids){const c=findHoodmon(state.players[p],instanceId);if(!c)continue;addModifier(state,c,'HDM-109','atk',400,'until_end_of_turn');c.restrictions.cannotBeExhaustedByEffects=true;c.restrictionExpiresOnTurn??={};c.restrictionExpiresOnTurn.cannotBeExhaustedByEffects=state.turnNumber;if(instanceMarker(c,'SUP39_MOVED_ACTIVE',state.turnNumber))moved=true}
  if(moved) drawRequired(state,p,1)
}

export function support39FieldActivate(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,id:string):GameState{
  syncSupport39PersistentFields(state,defs,p)
  appendLog(state,`${defs[id]?.name??id} is active and its encoded Field rules are live.`)
  return state
}
export function support39FieldRemove(state:GameState,_defs:Record<string,CardDefinition>,p:PlayerId,id:string):GameState{
  if(!FIELD_IDS.has(id))return state
  for(const c of allHoodmon(state.players[p]))c.modifiers=c.modifiers.filter(m=>m.sourceCardId!==id)
  return state
}
export function syncSupport39PersistentFields(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId):void{
  const liveField=state.players[p].field && !support39CardEffectsNegated(state,state.players[p].field) ? state.players[p].field : null
  const field=liveField?.definitionId
  for(const c of allHoodmon(state.players[p])){
    c.modifiers=c.modifiers.filter(m=>!FIELD_IDS.has(m.sourceCardId))
    const d=defs[c.definitionId]
    if(field==='HDM-008'&&isBeast(d))addModifier(state,c,field,'hp',200,'persistent')
    if(field==='HDM-023'&&isWind(d))addModifier(state,c,field,'task',100,'persistent')
    if(field==='HDM-067'&&hasAlignment(d,'Water'))addModifier(state,c,field,'hp',100,'persistent')
    if(field==='HDM-074'&&isWaterOrSmoke(d))addModifier(state,c,field,'hp',200,'persistent')
    if(field==='HDM-083'&&hasAlignment(d,'Psychic'))addModifier(state,c,field,'task',100,'persistent')
    if(field==='HDM-108'&&c.position!=='active'&&(isBearded(d)||isPitBull(d)))addModifier(state,c,field,'hp',200,'persistent')
  }
  if(field==='HDM-105'){
    const own=allHoodmon(state.players[p]); const both=own.some(c=>isBright(defs[c.definitionId]))&&own.some(c=>isShadow(defs[c.definitionId]))
    if(both) for(const c of own) if(isBright(defs[c.definitionId])||isShadow(defs[c.definitionId])) addModifier(state,c,field,'hp',200,'persistent')
  }
}

export function support39CardCostDiscount(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,definitionId:string,consume=false):number{
  const def=defs[definitionId]; let discount=0
  const tamer=state.players[p].tamer
  if(def?.cardType==='hoodmon'&&def.stageLevel===1&&hasAlignment(def,'Smoke')&&tamer?.definitionId==='HDM-063'&&!support39CardEffectsNegated(state,tamer)&&state.currentPlayerTurn===p) discount+=1
  const field=state.players[p].field
  if(field?.definitionId==='HDM-074'&&!support39CardEffectsNegated(state,field)&&isWaterOrSmoke(def)&&tamer?.definitionId==='HDM-063'&&!support39CardEffectsNegated(state,tamer)&&!usedThisTurn(state,p,'HDM-074','cost_discount')){
    discount+=1
    if(consume) markThisTurn(state,p,'HDM-074','cost_discount')
  }
  return discount
}
export function support39EvolutionDiscount(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,nextId:string,consume=false):number{
  const next=defs[nextId]; let discount=0
  const field=state.players[p].field, tamer=state.players[p].tamer
  if(field?.definitionId==='HDM-008'&&!support39CardEffectsNegated(state,field)&&tamer?.definitionId==='HDM-001'&&!support39CardEffectsNegated(state,tamer)&&isBeast(next)&&!usedThisTurn(state,p,'HDM-008','evolve_discount')){
    discount+=1;if(consume)markThisTurn(state,p,'HDM-008','evolve_discount')
  }
  return discount
}

export function support39TamerActivationReady(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId):boolean{
  if(state.status!=='active'||state.currentPlayerTurn!==p||state.currentPhase!=='Main')return false
  const t=state.players[p].tamer;if(!t||support39CardEffectsNegated(state,t))return false
  if(t.definitionId==='HDM-016')return !usedThisTurn(state,p,'HDM-016','crowd_control')&&visibleEffectCards(state,otherPlayer(p)).length>0
  if(t.readyState!=='ready')return false
  if(t.definitionId==='HDM-001')return state.players[p].hoodmonDeck.some(x=>isBeast(defs[x])||mentions(defs[x],'Neighborhood Loyalty'))
  if(t.definitionId==='HDM-030')return allHoodmon(state.players[otherPlayer(p)]).some(c=>hasStatus(c,'charmed'))
  if(t.definitionId==='HDM-063')return state.players[p].hoodmonDeck.length>0&&!usedThisTurn(state,p,'HDM-063','street_advantage')
  if(t.definitionId==='HDM-078')return state.players[p].hoodmonDeck.length>0||state.players[otherPlayer(p)].hoodmonDeck.length>0
  if(t.definitionId==='HDM-094')return state.players[p].reserves.some(c=>c&&isBearded(defs[c.definitionId]))&&!usedThisTurn(state,p,'HDM-094','reserve_connection')
  return false
}

export function activateSupport39Tamer(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId):GameState{
  const t=state.players[p].tamer;if(!t)throw new Error('No Tamer.')
  if(support39CardEffectsNegated(state,t))throw new Error("That Tamer's effects are negated.")
  if(t.definitionId==='HDM-001'){
    t.readyState='exhausted';const shown=state.players[p].hoodmonDeck.splice(0,Math.min(4,state.players[p].hoodmonDeck.length))
    const entries=shown.map((id,i)=>`${i}|${id}`);const options=entries.filter(e=>{const id=e.split('|')[1];return isBeast(defs[id])||mentions(defs[id],'Neighborhood Loyalty')}).map(e=>{const [i,id]=e.split('|');return {id:`odd:${i}:${id}`,value:e,cardId:id,label:defs[id]?.name??id}})
    return openChoice(state,{player:p,sourceCardId:'HDM-001',sourceInstanceId:t.instanceId,prompt:'ODD Paul: choose 1 Beast card or Neighborhood Loyalty card from the top 4.',minSelections:options.length?1:0,maxSelections:options.length?1:0,options,actionKey:'HDM001_PICK',context:{entries,triggerDeckLook:true}})
  }
  if(t.definitionId==='HDM-016'){
    markThisTurn(state,p,'HDM-016','crowd_control')
    const opponent=otherPlayer(p)
    const options=visibleEffectCards(state,opponent).map((card)=>({id:`${opponent}:${card.instanceId}`,player:opponent,instanceId:card.instanceId,cardId:card.definitionId,label:defs[card.definitionId]?.name??card.definitionId,detail:`${defs[card.definitionId]?.cardType.toUpperCase()??'CARD'} · FACE-UP`}))
    return openChoice(state,{player:p,sourceCardId:'HDM-016',sourceInstanceId:t.instanceId,prompt:"CROWD CONTROL — choose 1 opponent face-up card. Its effects are negated until the end of that player's next turn.",minSelections:1,maxSelections:1,options,actionKey:'HDM016_NEGATE'})
  }
  if(t.definitionId==='HDM-030'){
    t.readyState='exhausted';const opp=otherPlayer(p);const options=allHoodmon(state.players[opp]).filter(c=>hasStatus(c,'charmed')).map(c=>hoodmonOption(defs,opp,c))
    return openChoice(state,{player:p,sourceCardId:'HDM-030',sourceInstanceId:t.instanceId,prompt:'CASH IN — choose 1 Charmed opposing Hoodmon.',minSelections:1,maxSelections:1,options,actionKey:'HDM030_CASHIN'})
  }
  if(t.definitionId==='HDM-063'){
    markThisTurn(state,p,'HDM-063','street_advantage')
    const shown=state.players[p].hoodmonDeck.splice(0,Math.min(3,state.players[p].hoodmonDeck.length));const entries=shown.map((id,i)=>`${i}|${id}`)
    const options=entries.filter(e=>{const d=defs[e.split('|')[1]];return d?.cardType==='hoodmon'||['magic','trap','field'].includes(d?.cardType??'')}).map(e=>{const[i,id]=e.split('|');return{id:`tax:${i}:${id}`,value:e,cardId:id,label:defs[id]?.name??id}})
    return openChoice(state,{player:p,sourceCardId:'HDM-063',sourceInstanceId:t.instanceId,prompt:'STREET ADVANTAGE — choose 1 Hoodmon or Support card from the top 3.',minSelections:options.length?1:0,maxSelections:options.length?1:0,options,actionKey:'HDM063_PICK',context:{entries,triggerDeckLook:true}})
  }
  if(t.definitionId==='HDM-078'){
    t.readyState='exhausted';return openChoice(state,{player:p,sourceCardId:'HDM-078',sourceInstanceId:t.instanceId,prompt:'Choose which Hoodmon Deck to inspect with Capin MDH.',minSelections:1,maxSelections:1,options:[{id:'own',value:p,label:'YOUR HOODMON DECK'},{id:'opp',value:otherPlayer(p),label:"OPPONENT'S HOODMON DECK"}],actionKey:'HDM078_DECK'})
  }
  if(t.definitionId==='HDM-094'){
    markThisTurn(state,p,'HDM-094','reserve_connection')
    const options=state.players[p].reserves.flatMap(c=>c&&isBearded(defs[c.definitionId])?[hoodmonOption(defs,p,c)]:[])
    return openChoice(state,{player:p,sourceCardId:'HDM-094',sourceInstanceId:t.instanceId,prompt:'RESERVE CONNECTION — return 1 Bearded Dragon from Reserve to hand; gain 1 Bond.',minSelections:1,maxSelections:1,options,actionKey:'HDM094_RETURN'})
  }
  return state
}

export function onOpponentCharmed39(state:GameState,defs:Record<string,CardDefinition>,targetOwner:PlayerId):void{
  const controller=otherPlayer(targetOwner);const tamer=state.players[controller].tamer;if(tamer?.definitionId!=='HDM-030'||support39CardEffectsNegated(state,tamer)||usedThisTurn(state,controller,'HDM-030','charm_passive'))return
  markThisTurn(state,controller,'HDM-030','charm_passive')
  openChoice(state,{player:controller,sourceCardId:'HDM-030',prompt:'I KNOW MY WORTH — choose your once-per-turn Charmed reward.',minSelections:1,maxSelections:1,options:[{id:'bond',value:'bond',label:'GAIN 1 BOND'},{id:'cycle',value:'cycle',label:'DRAW 1, THEN DISCARD 1'}],actionKey:'HDM030_PASSIVE'})
}

export function notifyDeckLook39(state:GameState,defs:Record<string,CardDefinition>,viewer:PlayerId,_deckOwner:PlayerId):void{
  const p=state.players[viewer]
  const wifi = p.field?.definitionId==='HDM-023'&&!support39CardEffectsNegated(state,p.field)&&!usedThisTurn(state,viewer,'HDM-023','look_cycle')
  const capin = p.tamer?.definitionId==='HDM-078'&&!support39CardEffectsNegated(state,p.tamer)&&!usedThisTurn(state,viewer,'HDM-078','look_task')
  if (wifi) {
    markThisTurn(state,viewer,'HDM-023','look_cycle')
    if (capin) markThisTurn(state,viewer,'HDM-078','look_task')
    drawRequired(state,viewer,1)
    if(state.status!=='game_over') discardChoice(state,defs,viewer,'HDM-023','HDM023_DISCARD','Neighborhood Wi-Fi: choose 1 card to discard after drawing.', capin ? { capinAfter: true } : undefined)
    return
  }
  if(capin){
    markThisTurn(state,viewer,'HDM-078','look_task')
    const options=allHoodmon(p).map(c=>hoodmonOption(defs,viewer,c))
    if(options.length)openChoice(state,{player:viewer,sourceCardId:'HDM-078',prompt:'Capin MDH — choose 1 Hoodmon to gain +100 TASK this turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM078_TASK'})
  }
}


export function notifyHandCardRevealed39(state:GameState,defs:Record<string,CardDefinition>,owner:PlayerId,cardId:string):GameState{
  markThisTurn(state,owner,'SUP39','hand_revealed')
  const tamer=state.players[owner].tamer
  const revealed=defs[cardId]
  if(tamer?.definitionId!=='HDM-016'||support39CardEffectsNegated(state,tamer)||usedThisTurn(state,owner,'HDM-016','reveal_passive')||!(isBird(revealed)||isTech(revealed)))return state
  const shown=state.players[owner].hoodmonDeck.splice(0,Math.min(3,state.players[owner].hoodmonDeck.length))
  if(!shown.length)return state
  markThisTurn(state,owner,'HDM-016','reveal_passive')
  const entries=shown.map((id,i)=>`${i}|${id}`)
  return openChoice(state,{player:owner,sourceCardId:'HDM-016',sourceInstanceId:tamer.instanceId,prompt:'PASSIVE — choose 1 of the inspected cards to place on top of your Hoodmon Deck. You will then choose 1 of the remaining cards for the bottom before drawing.',minSelections:1,maxSelections:1,options:entries.map((entry)=>{const[i,id]=entry.split('|');return{id:`cinnamon-top:${i}:${id}`,value:entry,cardId:id,label:defs[id]?.name??id,detail:'PLACE ON TOP'} }),actionKey:'HDM016_PASSIVE_TOP',context:{entries}})
}

export function notifyTopCardChanged39(state:GameState,deckOwner:PlayerId):void{
  for(const controller of ['P1','P2'] as PlayerId[]){if(state.players[controller].field?.definitionId==='HDM-083'&&!support39CardEffectsNegated(state,state.players[controller].field)&&!usedThisTurn(state,controller,'HDM-083','top_changed')){markThisTurn(state,controller,'HDM-083','top_changed');gainBond(state,controller,1,'Hoodmon Truth Network')}}
  void deckOwner
}

function pendingAttackWouldKo(state: GameState, defs: Record<string, CardDefinition>, pending: PendingAttack): boolean {
  if (!pending.defenderInstanceId) return false
  const attacker = findHoodmon(state.players[pending.attacker], pending.attackerInstanceId)
  const target = findHoodmon(state.players[pending.defender], pending.defenderInstanceId)
  if (!attacker || !target) return false
  const attackerDef = defs[attacker.definitionId]
  const targetDef = defs[target.definitionId]
  if (!attackerDef || !targetDef) return false
  let damage = pending.attack.baseDamage
  if (pending.attack.usesAtkInFormula) damage += Math.round(effectiveAtk(attackerDef, attacker) * (pending.attack.atkMultiplier ?? 1))
  for (const rule of pending.attack.conditionalDamage ?? []) {
    let applies = false
    if (rule.condition === 'target_exhausted') applies = target.readyState === 'exhausted'
    else if (rule.condition === 'target_atk_reduced') applies = target.modifiers.some((m) => m.stat === 'atk' && m.amount < 0)
    else if (rule.condition === 'attacker_evolved_this_turn') applies = Boolean(attacker.evolvedThisTurn)
    else if (rule.condition === 'custom') {
      if (rule.customKey === 'target_charmed') applies = hasStatus(target, 'charmed')
      else if (rule.customKey === 'target_marked') applies = hasStatus(target, 'marked')
      else if (rule.customKey === 'control_peaches') applies = state.players[pending.attacker].tamer?.definitionId === 'HDM-030'
      else if (rule.customKey === 'reserve_bearded_dragons_gte_2') applies = state.players[pending.attacker].reserves.filter((card) => card && isBearded(defs[card.definitionId])).length >= 2
      else if (rule.customKey === 'switched_between_active_reserve_this_turn') applies = instanceMarker(attacker, 'SUP39_SWITCHED', state.turnNumber)
    }
    if (!applies) continue
    if (rule.replaceDamage !== undefined) damage = rule.replaceDamage
    if (rule.bonusDamage !== undefined) damage += rule.bonusDamage
  }
  damage += modifierTotal(attacker, 'attack_damage') + (pending.damageModifier ?? 0)
  const remaining = Math.max(0, effectiveHp(targetDef, target) - target.damageTaken)
  return Math.max(0, damage) >= remaining
}

function openBirdBackdoorBottomChoice(state: GameState, defs: Record<string, CardDefinition>, p: PlayerId, deckOwner: PlayerId): GameState {
  const deck = state.players[deckOwner].hoodmonDeck
  const shown = deck.splice(0, Math.min(3, deck.length))
  if (!shown.length) return state
  const entries = shown.map((id, i) => `${i}|${id}`)
  return openChoice(state, {
    player: p, sourceCardId: 'HDM-024',
    prompt: "Bird's-Eye Backdoor — choose 1 inspected card to put on the bottom. The others stay on top in their current relative order.",
    minSelections: 1, maxSelections: 1,
    options: entries.map((entry) => { const [i,id]=entry.split('|'); return { id:`bird-bottom:${i}:${id}`, value:entry, cardId:id, label:defs[id]?.name??id } }),
    actionKey: 'HDM024_BOTTOM', context: { deckOwner, entries, triggerDeckLook: true },
  })
}

export function support39TargetProtected(state:GameState,defs:Record<string,CardDefinition>,sourcePlayer:PlayerId,targetOwner:PlayerId,target:CardInstance):boolean{
  if(sourcePlayer===targetOwner)return false
  if(target.restrictions.cannotBeTargetedByOpponentEffects)return true
  if(state.players[targetOwner].field?.definitionId==='HDM-067'&&!support39CardEffectsNegated(state,state.players[targetOwner].field)&&state.turnNumber<=2&&state.currentPlayerTurn===sourcePlayer&&hasAlignment(defs[target.definitionId],'Water'))return true
  return false
}

export function triggerMonicalOmniscience39(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId):GameState{
  const monical=allHoodmon(state.players[p]).find(c=>c.definitionId==='HDM-082'&&!support39CardEffectsNegated(state,c))
  if(!monical||usedThisTurn(state,p,'HDM-082','omniscience'))return state
  const opponent=otherPlayer(p);const options=allHoodmon(state.players[opponent]).map(c=>hoodmonOption(defs,opponent,c))
  if(!options.length)return state
  markThisTurn(state,p,'HDM-082','omniscience')
  return openChoice(state,{player:p,sourceCardId:'HDM-082',sourceInstanceId:monical.instanceId,prompt:"OMNISCIENCE ENGINE — choose 1 opposing Hoodmon. It gets -300 ATK and cannot use Activated effects through the end of its controller's next turn.",minSelections:1,maxSelections:1,options,actionKey:'HDM082_TARGET'})
}

export function onCardPlayed39(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,definitionId:string):GameState{
  const def=defs[definitionId]
  syncSupport39PersistentFields(state,defs,p)
  if(state.players[p].field?.definitionId==='HDM-008'&&!support39CardEffectsNegated(state,state.players[p].field)&&def?.cardType==='hoodmon'&&def.stageLevel===1&&isBeast(def)&&!usedThisTurn(state,p,'HDM-008','stage1_cycle')){
    markThisTurn(state,p,'HDM-008','stage1_cycle');drawRequired(state,p,1);if(state.status!=='game_over')return discardChoice(state,defs,p,'HDM-008','HDM008_DISCARD','Corner Store Den: choose 1 card to discard after drawing.')
  }
  if(state.players[p].field?.definitionId==='HDM-074'&&!support39CardEffectsNegated(state,state.players[p].field)&&def?.cardType==='magic'&&!usedThisTurn(state,p,'HDM-074','play_task_cycle')){
    markThisTurn(state,p,'HDM-074','play_task_cycle');drawRequired(state,p,1);if(state.status!=='game_over')return discardChoice(state,defs,p,'HDM-074','HDM074_DISCARD','Urban Mist Network: choose 1 card to discard after drawing.')
  }
  if(def?.cardType==='magic')return triggerMonicalOmniscience39(state,defs,p)
  return state
}

function replayToken(kind:'DEPLOY'|'EVOLVE'|'ATTACK',p:PlayerId,card:CardInstance):string{return `SUP39_${kind}|${p}|${card.instanceId}`}
function hasAnotherReserve(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,card:CardInstance,predicate:(d:CardDefinition|undefined)=>boolean):boolean{
  return state.players[p].reserves.some(c=>Boolean(c&&c.instanceId!==card.instanceId&&predicate(defs[c.definitionId])))
}
function final11BottomChoice(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,source:string,entries:string[],actionKey:string,context:PendingChoice['context']):GameState{
  if(entries.length<=1){for(const entry of entries){const id=entry.split('|')[1];if(id)state.players[p].hoodmonDeck.push(id)};notifyTopCardChanged39(state,p);return state}
  const options=entries.map(entry=>{const[i,id]=entry.split('|');return{id:`bottom:${i}:${id}`,value:entry,cardId:id,label:defs[id]?.name??id,detail:'Choose every card in the order they should be placed on the bottom.'}})
  return openChoice(state,{player:p,sourceCardId:source,prompt:'Put the remaining cards on the bottom of your Hoodmon Deck in any order.',minSelections:entries.length,maxSelections:entries.length,options,actionKey,context})
}
function final11Top3(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,card:CardInstance,source:string,predicate:(d:CardDefinition|undefined)=>boolean,pickKey:string,bottomKey:string,replay:string):GameState{
  const shown=state.players[p].hoodmonDeck.splice(0,Math.min(3,state.players[p].hoodmonDeck.length))
  const entries=shown.map((id,i)=>`${i}|${id}`)
  if(!shown.length)return state
  const options=entries.filter(e=>predicate(defs[e.split('|')[1]])).map(e=>{const[i,id]=e.split('|');return{id:`pick:${i}:${id}`,value:e,cardId:id,label:defs[id]?.name??id}})
  return openChoice(state,{player:p,sourceCardId:source,sourceInstanceId:card.instanceId,prompt:`${defs[source]?.name??source} — you may add 1 eligible card from the top 3 to your hand.`,minSelections:0,maxSelections:Math.min(1,options.length),options,actionKey:pickKey,context:{entries,bottomKey,continuations:[`SUP39_LOOK|${p}|${p}`,replay]}})
}
function open065Target(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,card:CardInstance,continuations:string[]):GameState{
  if(state.players[p].tamer?.definitionId!=='HDM-063')return state
  const opp=otherPlayer(p);const options=allHoodmon(state.players[opp]).map(c=>hoodmonOption(defs,opp,c))
  if(!options.length)return state
  return openChoice(state,{player:p,sourceCardId:'HDM-065',sourceInstanceId:card.instanceId,prompt:'MOISTURE CONTROL — choose 1 opposing Hoodmon to get -200 ATK this turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM065_TARGET',context:{continuations}})
}
function open099Target(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,card:CardInstance,gainBondAfter:boolean,continuations:string[]):GameState{
  const opp=otherPlayer(p);const options=allHoodmon(state.players[opp]).map(c=>hoodmonOption(defs,opp,c))
  if(!options.length){if(gainBondAfter)gainBond(state,p,1,'Duskwyrm');return state}
  return openChoice(state,{player:p,sourceCardId:'HDM-099',sourceInstanceId:card.instanceId,prompt:"VEIL SLINK — choose 1 opposing Hoodmon to get -200 ATK through the end of its controller's next turn.",minSelections:1,maxSelections:1,options,actionKey:'HDM099_TARGET',context:{gainBondAfter,continuations}})
}

export function onHoodmonDeployed39(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,card:CardInstance):GameState{
  syncSupport39PersistentFields(state,defs,p)
  const replay=replayToken('DEPLOY',p,card)
  const ownMarker=`FINAL11_DEPLOY_${card.definitionId}`
  const ownEffectsLive=!support39CardEffectsNegated(state,card)
  if(ownEffectsLive&&!instanceMarker(card,ownMarker,state.turnNumber)){
    if(['HDM-002','HDM-005','HDM-017','HDM-020','HDM-064','HDM-069','HDM-079','HDM-095','HDM-098'].includes(card.definitionId))addInstanceMarker(state,card,ownMarker,state.turnNumber)
    if(card.definitionId==='HDM-002')return final11Top3(state,defs,p,card,'HDM-002',d=>isBeast(d)||mentions(d,'Neighborhood Loyalty'),'HDM002_TOP3','HDM002_BOTTOM',replay)
    if(card.definitionId==='HDM-005'){
      const options=allHoodmon(state.players[p]).filter(c=>isBeast(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c))
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-005',sourceInstanceId:card.instanceId,prompt:'PACK SUPPORT — choose 1 Beast Hoodmon you control to gain +100 ATK this turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM005_BUFF',context:{continuations:[replay]}})
    }
    if(card.definitionId==='HDM-017'){
      const shown=state.players[p].hoodmonDeck.splice(0,Math.min(2,state.players[p].hoodmonDeck.length));const entries=shown.map((id,i)=>`${i}|${id}`)
      if(shown.length){const options=entries.filter(e=>{const d=defs[e.split('|')[1]];return isBird(d)||isTech(d)}).map(e=>{const[i,id]=e.split('|');return{id:`squab:${i}:${id}`,value:e,cardId:id,label:defs[id]?.name??id}});return openChoice(state,{player:p,sourceCardId:'HDM-017',sourceInstanceId:card.instanceId,prompt:'HEAD TILT — you may reveal 1 Bird or Tech card from the top 2 and put it into your hand.',minSelections:0,maxSelections:Math.min(1,options.length),options,actionKey:'HDM017_PICK',context:{entries,continuations:[replay]}})}
    }
    if(card.definitionId==='HDM-020'){
      const shown=state.players[p].hoodmonDeck.splice(0,Math.min(3,state.players[p].hoodmonDeck.length));const entries=shown.map((id,i)=>`${i}|${id}`)
      if(shown.length){const options=entries.filter(e=>{const d=defs[e.split('|')[1]];return isBird(d)||isBeast(d)||d?.cardType==='field'||d?.cardType==='tamer'}).map(e=>{const[i,id]=e.split('|');return{id:`pigeon:${i}:${id}`,value:e,cardId:id,label:defs[id]?.name??id}});return openChoice(state,{player:p,sourceCardId:'HDM-020',sourceInstanceId:card.instanceId,prompt:'NEIGHBORHOOD SCOUT — add 1 Bird, Beast, Field, or Tamer card among the top 3 to your hand.',minSelections:options.length?1:0,maxSelections:options.length?1:0,options,actionKey:'HDM020_PICK',context:{entries,continuations:[replay]}})}
    }
    if(card.definitionId==='HDM-064')return final11Top3(state,defs,p,card,'HDM-064',d=>hasAlignment(d,'Water','Smoke'),'HDM064_TOP3','HDM064_BOTTOM',replay)
    if(card.definitionId==='HDM-069')return final11Top3(state,defs,p,card,'HDM-069',d=>hasAlignment(d,'Smoke'),'HDM069_TOP3','HDM069_BOTTOM',replay)
    if(card.definitionId==='HDM-079')return final11Top3(state,defs,p,card,'HDM-079',d=>d?.cardType==='trap'||mentions(d,'Research'),'HDM079_TOP3','HDM079_BOTTOM',replay)
    if(card.definitionId==='HDM-095'&&hasAnotherReserve(state,defs,p,card,isBearded)){addModifier(state,card,'HDM-095','hp',100,'persistent');appendLog(state,'Ember Hatchling — Heat Nuzzle granted +100 HP.')}
    if(card.definitionId==='HDM-098'&&hasAnotherReserve(state,defs,p,card,isBearded)){addModifier(state,card,'HDM-098','atk',100,'until_end_of_turn');appendLog(state,'Shadow Hatchling — Gloom Nest granted +100 ATK this turn.')}
  }
  if(card.position!=='active'&&isBearded(defs[card.definitionId])){
    const warden=allHoodmon(state.players[p]).find(c=>c.definitionId==='HDM-097'&&!support39CardEffectsNegated(state,c))
    if(warden&&!usedThisTurn(state,p,'HDM-097','reserve_deploy')){
      markThisTurn(state,p,'HDM-097','reserve_deploy')
      const options=allHoodmon(state.players[p]).map(c=>hoodmonOption(defs,p,c))
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-097',sourceInstanceId:warden.instanceId,prompt:'PACKFIRE VANGUARD — choose 1 Hoodmon you control to gain +300 ATK this turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM097_BUFF',context:{continuations:[replay]}})
    }
    const abyss=allHoodmon(state.players[p]).find(c=>c.definitionId==='HDM-100'&&!support39CardEffectsNegated(state,c))
    if(abyss&&!usedThisTurn(state,p,'HDM-100','reserve_deploy')){
      markThisTurn(state,p,'HDM-100','reserve_deploy')
      const opp=otherPlayer(p);const options=allHoodmon(state.players[opp]).map(c=>hoodmonOption(defs,opp,c))
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-100',sourceInstanceId:abyss.instanceId,prompt:"ABYSS IGNISCALE — choose 1 opposing Hoodmon to get -300 ATK until the end of that opponent's next turn.",minSelections:1,maxSelections:1,options,actionKey:'HDM100_WEAKEN',context:{deployedId:card.definitionId,continuations:[replay]}})
      if(isShadow(defs[card.definitionId]))drawRequired(state,p,1)
    }
  }
  if(state.players[p].field?.definitionId==='HDM-105'&&!support39CardEffectsNegated(state,state.players[p].field)&&(isBright(defs[card.definitionId])||isShadow(defs[card.definitionId])))return trigger105Look(state,defs,p)
  return state
}
export function onHoodmonEvolved39(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,card:CardInstance):GameState{
  syncSupport39PersistentFields(state,defs,p)
  const replay=replayToken('EVOLVE',p,card)
  const ownMarker=`FINAL11_EVOLVE_${card.definitionId}`
  const ownEffectsLive=!support39CardEffectsNegated(state,card)
  if(ownEffectsLive&&!instanceMarker(card,ownMarker,state.turnNumber)){
    if(['HDM-003','HDM-006','HDM-007','HDM-018','HDM-021','HDM-065','HDM-080','HDM-081','HDM-096','HDM-099'].includes(card.definitionId))addInstanceMarker(state,card,ownMarker,state.turnNumber)
    if(card.definitionId==='HDM-003'){
      if(state.players[p].tamer)gainBond(state,p,1,'Bluefang Hound')
      const options=state.players[p].discard.flatMap((id,i)=>isBeast(defs[id])?[cardOption(defs,'discard',id,i)]:[])
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-003',sourceInstanceId:card.instanceId,prompt:'NEIGHBORHOOD LOYALTY — you may return 1 Beast card from your Discard to your hand.',minSelections:0,maxSelections:1,options,actionKey:'HDM003_RETURN',context:{continuations:[replay]}})
    }
    if(card.definitionId==='HDM-006'||card.definitionId==='HDM-007'){
      const options=allHoodmon(state.players[p]).filter(c=>isBeast(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c))
      if(options.length)return openChoice(state,{player:p,sourceCardId:card.definitionId,sourceInstanceId:card.instanceId,prompt:card.definitionId==='HDM-006'?'GUARDIAN BOND — choose 1 Beast Hoodmon you control. It gains Neighborhood Loyalty until end of turn.':'CONCRETE DOMINION — choose 1 Beast Hoodmon you control. It gains Neighborhood Loyalty until end of turn.',minSelections:1,maxSelections:1,options,actionKey:card.definitionId==='HDM-006'?'HDM006_BOND':'HDM007_DOMINION',context:{continuations:[replay]}})
    }
    if(card.definitionId==='HDM-018'){
      const deckOwner=otherPlayer(p)
      if(state.players[deckOwner].hoodmonDeck.length)return deckLookOrderChoice(state,defs,p,deckOwner,'HDM-018',3,'HDM018_ORDER',false,{continuations:[replay]})
    }
    if(card.definitionId==='HDM-021'){
      const options=allHoodmon(state.players[p]).filter(c=>c.instanceId!==card.instanceId&&(isBird(defs[c.definitionId])||isBeast(defs[c.definitionId]))).map(c=>hoodmonOption(defs,p,c))
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-021',sourceInstanceId:card.instanceId,prompt:'PROTECT THE PERCH — choose another Bird or Beast Hoodmon you control. It gains +200 HP.',minSelections:1,maxSelections:1,options,actionKey:'HDM021_PERCH',context:{continuations:[replay]}})
    }
    if(card.definitionId==='HDM-065'){
      const options=state.players[p].discard.flatMap((id,i)=>hasAlignment(defs[id],'Water','Nature')?[cardOption(defs,'discard',id,i)]:[])
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-065',sourceInstanceId:card.instanceId,prompt:'MOISTURE CONTROL — you may return 1 Water or Nature card from your Discard to your hand.',minSelections:0,maxSelections:1,options,actionKey:'HDM065_RECOVER',context:{continuations:[replay]}})
      const targeted=open065Target(state,defs,p,card,[replay]);if(targeted.pendingChoice)return targeted
    }
    if(card.definitionId==='HDM-080'){
      const opponent=otherPlayer(p);const options=allHoodmon(state.players[opponent]).map(c=>hoodmonOption(defs,opponent,c))
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-080',sourceInstanceId:card.instanceId,prompt:"PATTERN READ — choose 1 opposing Hoodmon to get -200 ATK through the end of its controller's next turn.",minSelections:1,maxSelections:1,options,actionKey:'HDM080_TARGET',context:{continuations:[replay]}})
    }
    if(card.definitionId==='HDM-081'){
      const options=state.players[p].discard.flatMap((id,i)=>{const d=defs[id];return d?.cardType==='trap'||mentions(d,'Research')||mentions(d,'Truth Network')?[cardOption(defs,'discard',id,i)]:[]})
      if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-081',sourceInstanceId:card.instanceId,prompt:'DATA SAGE — you may return 1 Research, Trap, or Truth Network card from your Discard to your hand.',minSelections:0,maxSelections:1,options,actionKey:'HDM081_RECOVER',context:{gainBond:state.players[p].tamer?.definitionId==='HDM-078',continuations:[replay]}})
      if(state.players[p].tamer?.definitionId==='HDM-078')gainBond(state,p,1,'Calicore')
    }
    if(card.definitionId==='HDM-096'&&hasAnotherReserve(state,defs,p,card,isBearded)){gainBond(state,p,1,'Smoldering Beard');addModifier(state,card,'HDM-096','atk',200,'until_end_of_turn');appendLog(state,'Smoldering Beard — Reserve Ember granted +200 ATK this turn.')}
    if(card.definitionId==='HDM-099'){
      const gain=hasAnotherReserve(state,defs,p,card,isShadow);const targeted=open099Target(state,defs,p,card,gain,[replay]);if(targeted.pendingChoice)return targeted
    }
  }
  if(state.players[p].field?.definitionId==='HDM-105'&&!support39CardEffectsNegated(state,state.players[p].field)&&(isBright(defs[card.definitionId])||isShadow(defs[card.definitionId])))return trigger105Look(state,defs,p)
  return state
}
function trigger105Look(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId):GameState{
  if(usedThisTurn(state,p,'HDM-105','look'))return state;markThisTurn(state,p,'HDM-105','look')
  const shown=state.players[p].hoodmonDeck.splice(0,Math.min(2,state.players[p].hoodmonDeck.length));const entries=shown.map((id,i)=>`${i}|${id}`);const options=entries.filter(e=>isBearded(defs[e.split('|')[1]])).map(e=>{const[i,id]=e.split('|');return{id:`fam:${i}:${id}`,value:e,cardId:id,label:defs[id]?.name??id}})
  if(!shown.length)return state
  return openChoice(state,{player:p,sourceCardId:'HDM-105',prompt:'Split Flames, One Family — you may add 1 Bearded Dragon from the top 2 to hand.',minSelections:0,maxSelections:Math.min(1,options.length),options,actionKey:'HDM105_PICK',context:{entries,triggerDeckLook:true}})
}

export function onTaskCompleted39(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,hoodmon:CardInstance):GameState{
  addInstanceMarker(state,hoodmon,'SUP39_TASK_COMPLETED',state.turnNumber)
  if(state.players[p].field?.definitionId==='HDM-074'&&!support39CardEffectsNegated(state,state.players[p].field)&&!usedThisTurn(state,p,'HDM-074','play_task_cycle')){
    markThisTurn(state,p,'HDM-074','play_task_cycle');drawRequired(state,p,1);if(state.status!=='game_over')return discardChoice(state,defs,p,'HDM-074','HDM074_DISCARD','Urban Mist Network: choose 1 card to discard after drawing.')
  }
  return state
}

export function beginSupport39AttackPrelude(state:GameState,defs:Record<string,CardDefinition>,pending:PendingAttack):boolean{
  const attacker=findHoodmon(state.players[pending.attacker],pending.attackerInstanceId)
  if(!attacker)return false
  if(!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-004'&&state.players[pending.attacker].tamer&&!usedThisTurn(state,pending.attacker,'HDM-004','attack_trigger')){
    markThisTurn(state,pending.attacker,'HDM-004','attack_trigger')
    addModifier(state,attacker,'HDM-004','atk',400,'until_end_of_turn')
    attacker.restrictions.cannotBeTargetedByOpponentEffects=true
    attacker.restrictionExpiresOnTurn??={}
    attacker.restrictionExpiresOnTurn.cannotBeTargetedByOpponentEffects=state.turnNumber
    appendLog(state,'Drunk Fist Wulf — Neighborhood Loyalty granted +400 ATK and opponent-effect targeting protection until end of turn.')
  }
  if(!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-019'&&pending.defenderInstanceId){
    const target=findHoodmon(state.players[pending.defender],pending.defenderInstanceId)
    if(target&&hasStatus(target,'marked')){
      if(Math.random()<0.5){pending.damageModifier=(pending.damageModifier??0)+200;appendLog(state,'Bird Brain — Loose Cannon flipped heads: the Marked target will take 800 damage.')}
      else{pending.damageModifier=(pending.damageModifier??0)-100;addInstanceMarker(state,attacker,'HDM019_TAILS_DRAW',state.turnNumber);appendLog(state,'Bird Brain — Loose Cannon flipped tails: the Marked target will take 500 damage, then Bird Brain draws 1 if the attack resolves.')}
    }
  }
  if(support39CardEffectsNegated(state,attacker)||attacker.definitionId!=='HDM-066'||usedThisTurn(state,pending.attacker,'HDM-066','attack_trigger'))return false
  markThisTurn(state,pending.attacker,'HDM-066','attack_trigger')
  if(state.players[pending.attacker].tamer?.definitionId==='HDM-063')gainBond(state,pending.attacker,1,'Nebulizard')
  const options=allHoodmon(state.players[pending.defender]).map(c=>hoodmonOption(defs,pending.defender,c))
  if(!options.length)return false
  state.pendingAttackSetup=pending
  openChoice(state,{player:pending.attacker,sourceCardId:'HDM-066',sourceInstanceId:attacker.instanceId,prompt:'OBEDIENCE THROUGH FOG — choose 1 opposing Hoodmon to get -400 ATK and lose Activate abilities through the end of its controller’s next turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM066_TARGET'})
  appendLog(state,`${pending.attacker} declared ${pending.attack.attackName}; Nebulizard's attack trigger must resolve before the attack Reaction Window.`)
  return true
}
export function resumePendingAttack39(state:GameState,defs:Record<string,CardDefinition>):GameState{
  const pending=state.pendingAttackSetup
  state.pendingAttackSetup=null
  if(!pending)return state
  const attacker=findHoodmon(state.players[pending.attacker],pending.attackerInstanceId)
  if(!attacker){state.status='active';appendLog(state,'The declared attack ended because its attacker left play before the attack Reaction Window.');return state}
  state.status='reaction';state.reactionWindow={openedBy:'attack',nonActivePlayerResponded:false,activePlayerResponded:false,priority:pending.defender,pendingAttack:pending,responseStack:[],responseCards:[]}
  appendLog(state,`${pending.attacker} declared ${pending.attack.attackName}. Reaction Window opened.`)
  return state
}

export function onAttackResolved39(state:GameState,defs:Record<string,CardDefinition>,attackerPlayer:PlayerId,attacker:CardInstance,attackResolved=true,defenderInstanceId:string|null=null):GameState{
  if(attackResolved&&!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-079'&&usedThisTurn(state,otherPlayer(attackerPlayer),'SUP39','hand_revealed'))drawRequired(state,attackerPlayer,1)
  const replay=replayToken('ATTACK',attackerPlayer,attacker)
  if(attackResolved&&!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-004'&&state.players[attackerPlayer].bond>=1&&!instanceMarker(attacker,'HDM004_SPLASH_USED',state.turnNumber)){
    const opponent=otherPlayer(attackerPlayer)
    const options=allHoodmon(state.players[opponent]).filter(c=>c.instanceId!==defenderInstanceId).map(c=>hoodmonOption(defs,opponent,c))
    addInstanceMarker(state,attacker,'HDM004_SPLASH_USED',state.turnNumber)
    if(options.length)return openChoice(state,{player:attackerPlayer,sourceCardId:'HDM-004',sourceInstanceId:attacker.instanceId,prompt:'DRUNK FIST FANG — you may deal 200 damage to 1 other opposing Hoodmon.',minSelections:0,maxSelections:1,options,actionKey:'HDM004_SPLASH',context:{continuations:[replay]}})
  }
  if(!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-069'&&attacker.position==='active'&&!attacker.restrictions.cannotRetreat&&!instanceMarker(attacker,'FINAL11_HDM069_QUICK_DASH',state.turnNumber)){
    addInstanceMarker(state,attacker,'FINAL11_HDM069_QUICK_DASH',state.turnNumber)
    const options=state.players[attackerPlayer].reserves.flatMap(c=>c?[hoodmonOption(defs,attackerPlayer,c)]:[])
    if(options.length)return openChoice(state,{player:attackerPlayer,sourceCardId:'HDM-069',sourceInstanceId:attacker.instanceId,prompt:'QUICK DASH — you may switch Spotlet with 1 of your Reserve Hoodmon after this attack.',minSelections:0,maxSelections:1,options,actionKey:'HDM069_SWITCH',context:{continuations:[replay]}})
  }
  if(attackResolved&&!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-017'&&defenderInstanceId&&!instanceMarker(attacker,'HDM017_ATTACK_EFFECT',state.turnNumber)){
    addInstanceMarker(state,attacker,'HDM017_ATTACK_EFFECT',state.turnNumber)
    const target=findHoodmon(state.players[otherPlayer(attackerPlayer)],defenderInstanceId)
    if(target){addModifier(state,target,'HDM-017','atk',-100,'until_end_of_next_turn');appendLog(state,'Squab — Lucky Poo gave the damaged opposing Hoodmon -100 ATK through the end of its controller’s next turn.')}
  }
  if(attackResolved&&!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-019'&&instanceMarker(attacker,'HDM019_TAILS_DRAW',state.turnNumber)){
    attacker.runtimeAbilities=(attacker.runtimeAbilities??[]).filter(a=>!(a.kind==='support39_marker'&&a.sourceCardId==='HDM019_TAILS_DRAW'))
    drawRequired(state,attackerPlayer,1)
    if(state.status==='game_over')return state
  }
  if(attackResolved&&!support39CardEffectsNegated(state,attacker)&&attacker.definitionId==='HDM-020'&&!instanceMarker(attacker,'HDM020_ATTACK_CYCLE',state.turnNumber)&&allHoodmon(state.players[attackerPlayer]).some(c=>isBeast(defs[c.definitionId]))){
    addInstanceMarker(state,attacker,'HDM020_ATTACK_CYCLE',state.turnNumber)
    drawRequired(state,attackerPlayer,1)
    if(state.status!=='game_over'&&state.players[attackerPlayer].hand.length)return discardChoice(state,defs,attackerPlayer,'HDM-020','HDM020_DISCARD','PECK & CHECK — choose 1 card to discard after drawing.',{continuations:[replay]})
  }
  if(state.players[attackerPlayer].field?.definitionId==='HDM-067'&&!support39CardEffectsNegated(state,state.players[attackerPlayer].field)&&hasAlignment(defs[attacker.definitionId],'Water')&&!usedThisTurn(state,attackerPlayer,'HDM-067','attack_draw')){
    markThisTurn(state,attackerPlayer,'HDM-067','attack_draw')
    return openChoice(state,{player:attackerPlayer,sourceCardId:'HDM-067',prompt:'Rooftop Condensation — draw the top card of your Hoodmon Deck?',minSelections:0,maxSelections:1,options:[{id:'draw',value:'draw',label:'DRAW 1 CARD'}],actionKey:'HDM067_DRAW',context:{continuations:[replay]}})
  }
  if(state.players[attackerPlayer].tamer?.definitionId==='HDM-001'&&!support39CardEffectsNegated(state,state.players[attackerPlayer].tamer)&&isBeast(defs[attacker.definitionId])&&hasNeighborhoodLoyaltyRuntime(state,defs,attacker)&&!usedThisTurn(state,attackerPlayer,'HDM-001','attack_bond')){
    markThisTurn(state,attackerPlayer,'HDM-001','attack_bond');gainBond(state,attackerPlayer,1,'O.D.D. Paul')
  }
  return state
}

export function markHoodmonSwitched39(state:GameState,card:CardInstance):void{addInstanceMarker(state,card,'SUP39_SWITCHED',state.turnNumber)}
export function markReserveToActive39(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,card:CardInstance):void{
  addInstanceMarker(state,card,'SUP39_MOVED_ACTIVE',state.turnNumber)
  markHoodmonSwitched39(state,card)
  syncSupport39PersistentFields(state,defs,p)
  if(state.players[p].field?.definitionId==='HDM-108'&&!support39CardEffectsNegated(state,state.players[p].field)&&(isBearded(defs[card.definitionId])||isPitBull(defs[card.definitionId]))&&!usedThisTurn(state,p,'HDM-108','move_bond')){markThisTurn(state,p,'HDM-108','move_bond');gainBond(state,p,1,'Blockfire Kennel')}
}

export function resolveStartOfGame39(state:GameState,defs:Record<string,CardDefinition>):GameState{
  for(const p of ['P1','P2'] as PlayerId[]){
    if(state.players[p].tamer?.definitionId!=='HDM-094'||usedThisTurn(state,p,'HDM-094','natural_bond'))continue
    const options=state.players[p].hoodmonDeck.flatMap((x,i)=>isBearded(defs[x])?[cardOption(defs,'deck',x,i)]:[])
    markThisTurn(state,p,'HDM-094','natural_bond')
    if(options.length)return openChoice(state,{player:p,sourceCardId:'HDM-094',prompt:'NATURAL BOND — search your Hoodmon Deck for 1 Bearded Dragon Hoodmon.',minSelections:1,maxSelections:1,options,actionKey:'HDM094_NATURAL',context:{resumeSetup:true}})
  }
  return state
}

export function support39ReactionSpecificLegality(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,id:string):boolean{
  const w=state.reactionWindow;if(!w)return false;const atk=w.pendingAttack;const eff=w.pendingEffect
  if(id==='HDM-024')return true
  if(id==='HDM-014'||id==='HDM-027'||id==='HDM-072'){
    if(w.openedBy!=='effect'||!eff||eff.sourcePlayer===p)return false
    return eff.targetRefs.some(ref=>{const[owner,inst]=ref.split('|') as [PlayerId,string];if(owner!==p)return false;const c=findHoodmon(state.players[p],inst);if(!c)return false;const d=defs[c.definitionId];return id==='HDM-014'?isBeast(d):id==='HDM-027'?(isTech(d)||hasTrait(d,'Bird')):isWaterNatureSmoke(d)})
  }
  if(id==='HDM-015'){const target=atk?.defenderInstanceId?findHoodmon(state.players[p],atk.defenderInstanceId):null;return w.openedBy==='attack'&&Boolean(atk&&atk.defender===p&&target&&isBeast(defs[target.definitionId])&&pendingAttackWouldKo(state,defs,atk))}
  if(id==='HDM-057')return w.openedBy==='attack'&&Boolean(atk&&atk.defender===p&&atk.defenderInstanceId&&pendingAttackWouldKo(state,defs,atk))
  if(id==='HDM-056')return w.openedBy==='attack'&&Boolean(atk&&atk.defender===p&&state.players[p].activeHoodmon&&isDarkOrFairy(defs[state.players[p].activeHoodmon!.definitionId]))
  if(id==='HDM-060'){
    if(w.openedBy==='attack'&&atk&&atk.attacker!==p){const c=findHoodmon(state.players[atk.attacker],atk.attackerInstanceId);return Boolean(c&&hasStatus(c,'marked'))}
    if(w.openedBy==='effect'&&eff&&eff.sourcePlayer!==p){return allHoodmon(state.players[eff.sourcePlayer]).some(c=>c.definitionId===eff.sourceCardId&&hasStatus(c,'marked'))}
    return false
  }
  if(id==='HDM-073')return w.openedBy==='attack'&&Boolean(atk&&atk.defender===p&&state.players[p].activeHoodmon)
  if(id==='HDM-077'){const active=state.players[p].activeHoodmon;return w.openedBy==='attack'&&Boolean(atk&&atk.defender===p&&active&&isWaterOrSmoke(defs[active.definitionId])&&state.players[p].reserves.some(c=>c&&isWaterOrSmoke(defs[c.definitionId])))}
  if(id==='HDM-104')return w.openedBy==='attack'&&Boolean(atk&&atk.defender===p&&atk.defenderInstanceId&&findHoodmon(state.players[p],atk.defenderInstanceId)&&isBearded(defs[findHoodmon(state.players[p],atk.defenderInstanceId)!.definitionId])&&state.players[p].reserves.some(c=>c&&isBearded(defs[c.definitionId])))
  if(id==='HDM-107')return w.openedBy==='attack'&&Boolean(atk&&atk.attacker===p&&findHoodmon(state.players[p],atk.attackerInstanceId)&&isBearded(defs[findHoodmon(state.players[p],atk.attackerInstanceId)!.definitionId]))
  return true
}

export function resolveSupport39Reaction(state:GameState,defs:Record<string,CardDefinition>,p:PlayerId,id:string):boolean{
  const w=state.reactionWindow;if(!w)return false;const atk=w.pendingAttack;const eff=w.pendingEffect
  if(!REACTION_IDS.has(id))return false
  if(id==='HDM-024'){
    openChoice(state,{player:p,sourceCardId:id,prompt:"Bird's-Eye Backdoor — choose which Hoodmon Deck to inspect.",minSelections:1,maxSelections:1,options:[{id:'own',value:p,label:'YOUR HOODMON DECK'},{id:'opp',value:otherPlayer(p),label:"OPPONENT'S HOODMON DECK"}],actionKey:'HDM024_DECK'});return true
  }
  if(id==='HDM-014'||id==='HDM-027'||id==='HDM-072'){
    if(eff)eff.negated=true
    appendLog(state,`${defs[id]?.name??id} negated the targeted effect.`)
    if(id==='HDM-014'){
      const options=state.players[p].discard.flatMap((x,i)=>isBeast(defs[x])?[cardOption(defs,'discard',x,i)]:[]);if(options.length)openChoice(state,{player:p,sourceCardId:id,prompt:'You may return 1 Beast card from your Discard to hand.',minSelections:0,maxSelections:1,options,actionKey:'HDM014_RETURN'})
    } else if(id==='HDM-027') deckLookOrderChoice(state,defs,p,otherPlayer(p),id,2,'HDM027_ORDER')
    else {
      const options=state.players[p].discard.flatMap((x,i)=>isWaterNatureSmoke(defs[x])?[cardOption(defs,'discard',x,i)]:[])
      openChoice(state,{player:p,sourceCardId:id,prompt:'Mist Network — choose a reward.',minSelections:1,maxSelections:1,options:[{id:'draw',value:'draw',label:'DRAW 1 CARD'},...(options.length?[{id:'return',value:'return',label:'RETURN A WATER / NATURE / SMOKE CARD'}]:[])],actionKey:'HDM072_MODE',context:{eligible:options.map(o=>o.id)}})
    }
    return true
  }
  if(id==='HDM-015'){if(atk)atk.preventKnockoutByOath=true;return true}
  if(id==='HDM-057'){if(atk)atk.returnOnKnockoutByNineLives=true;return true}
  if(id==='HDM-056'){
    if(!atk)return true
    const attacker=findHoodmon(state.players[atk.attacker],atk.attackerInstanceId)
    if(attacker) exhaustByCardEffect39(state,defs,p,atk.attacker,attacker,'HDM-056')
    const active=state.players[p].activeHoodmon
    if(active&&isDarkOrFairy(defs[active.definitionId])){
      // The digital battle model has one attackable Active Hoodmon. Making that chosen
      // Dark/Fairy Hoodmon invalid for this battle leaves no legal declared target.
      atk.cancelled=true
      appendLog(state,hasStatus(attacker,'marked')?'Smoke Screen Alibi exhausted the Marked attacker and ended the attack.':'Smoke Screen Alibi protected the Active Dark/Fairy Hoodmon for this battle; the declared attack ends.')
    }
    return true
  }
  if(id==='HDM-060'){
    if(atk&&atk.attacker!==p){const attacker=findHoodmon(state.players[atk.attacker],atk.attackerInstanceId);if(attacker&&hasStatus(attacker,'marked')){atk.cancelled=true;returnWholeStackToHand(state,defs,atk.attacker,attacker);state.pendingPromotion=null;if(state.players[p].tamer?.definitionId==='HDM-046')gainBond(state,p,1,'Perfect Getaway')}}
    if(eff&&eff.sourcePlayer!==p){eff.negated=true;const source=allHoodmon(state.players[eff.sourcePlayer]).find(c=>c.definitionId===eff.sourceCardId&&hasStatus(c,'marked'));if(source)returnWholeStackToHand(state,defs,eff.sourcePlayer,source);if(state.players[p].tamer?.definitionId==='HDM-046')gainBond(state,p,1,'Perfect Getaway')}
    return true
  }
  if(id==='HDM-073'){
    if(atk)atk.damageModifier=(atk.damageModifier??0)-300
    const active=state.players[p].activeHoodmon;const eligible=Boolean(active&&(hasAlignment(defs[active.definitionId],'Smoke')||active.definitionId==='HDM-066'||active.evolutionStack.includes('HDM-066')))
    const options=state.players[p].reserves.flatMap(c=>c?[hoodmonOption(defs,p,c)]:[])
    if(eligible&&options.length)openChoice(state,{player:p,sourceCardId:id,prompt:'Smokescreen Slip — you may switch your Active with a Reserve before damage.',minSelections:0,maxSelections:1,options,actionKey:'HDM073_SWITCH'})
    return true
  }
  if(id==='HDM-077'){
    if(atk)atk.damageModifier=(atk.damageModifier??0)-200
    const options=state.players[p].reserves.flatMap(c=>c&&isWaterOrSmoke(defs[c.definitionId])?[hoodmonOption(defs,p,c)]:[])
    if(options.length)openChoice(state,{player:p,sourceCardId:id,prompt:"What You Don't See... Obeys — switch your Active Water/Smoke Hoodmon with 1 Reserve Water/Smoke Hoodmon.",minSelections:1,maxSelections:1,options,actionKey:'HDM077_SWITCH'})
    return true
  }
  if(id==='HDM-104'){
    const options=state.players[p].reserves.flatMap(c=>c&&isBearded(defs[c.definitionId])?[hoodmonOption(defs,p,c)]:[]);if(options.length)openChoice(state,{player:p,sourceCardId:id,prompt:'Flame Tag-Out — choose 1 Bearded Dragon in Reserve to switch into Active.',minSelections:1,maxSelections:1,options,actionKey:'HDM104_SWITCH'});return true
  }
  if(id==='HDM-107'){
    const options=state.players[p].hand.flatMap((x,i)=>(isPitBull(defs[x])||mentions(defs[x],'Peaches'))?[cardOption(defs,'hand',x,i)]:[])
    if(options.length){
      openChoice(state,{player:p,sourceCardId:id,prompt:"Peaches' Backup Bite — you may reveal 1 Pit Bull card or card that mentions Peaches to give this attack +200 damage.",minSelections:0,maxSelections:1,options,actionKey:'HDM107_REVEAL'})
    }else{
      const opp=otherPlayer(p);const exhaustOptions=allHoodmon(state.players[opp]).map(c=>hoodmonOption(defs,opp,c))
      if(exhaustOptions.length)openChoice(state,{player:p,sourceCardId:id,prompt:'Peaches’ Backup Bite — you may Exhaust 1 opposing Hoodmon.',minSelections:0,maxSelections:1,options:exhaustOptions,actionKey:'HDM107_EXHAUST'})
    }
    return true
  }
  return true
}

export function applySupport39KnockoutReplacement(state:GameState,defs:Record<string,CardDefinition>,pending:PendingAttack,target:CardInstance|null):void{
  if(!target)return;const hp=effectiveHp(defs[target.definitionId],target);if(target.damageTaken<hp)return
  if(pending.returnOnKnockoutByNineLives){
    const owner=pending.defender;const wasMiso=target.definitionId==='HDM-049';returnWholeStackToHand(state,defs,owner,target)
    if(wasMiso){const options=state.players[owner].discard.flatMap((x,i)=>x==='HDM-047'?[cardOption(defs,'discard',x,i)]:[]);if(options.length)openChoice(state,{player:owner,sourceCardId:'HDM-057',prompt:'Nine Lives Escape — you may play a Kitten from your Discard without paying its cost.',minSelections:0,maxSelections:1,options,actionKey:'HDM057_KITTEN'})}
    return
  }
  if(pending.preventKnockoutByOath&&isBeast(defs[target.definitionId])){
    target.damageTaken=Math.max(0,hp-100);addModifier(state,target,'HDM-015','atk',200,'until_end_of_turn');if(target.definitionId==='HDM-004')gainBond(state,pending.defender,1,'Street Guardian Oath');appendLog(state,'Street Guardian Oath prevented the knockout and left the Beast at 100 HP.')
  }
}

export function support39NoProtectReaction(state:GameState,p:PlayerId):boolean{
  const atk=state.reactionWindow?.pendingAttack;if(!atk||atk.defender!==p||!atk.defenderInstanceId)return false;const target=findHoodmon(state.players[p],atk.defenderInstanceId);return instanceMarker(target,'HDM-030-NO-PROTECT',state.turnNumber)
}

export function resolveSupport39TargetedEffect(state:GameState,defs:Record<string,CardDefinition>,pending:PendingTargetedEffect):boolean{
  if(pending.effectKey==='HDM080_WEAKEN'){
    const [owner,instanceId]=pending.targetRefs[0]?.split('|') as [PlayerId,string]
    const target=owner&&instanceId?findHoodmon(state.players[owner],instanceId):null
    if(target){addModifier(state,target,'HDM-080','atk',-200,'until_end_of_next_turn');if(state.players[pending.sourcePlayer].tamer?.definitionId==='HDM-078'&&state.players[owner].hand.length){const cardId=state.players[owner].hand[Math.floor(Math.random()*state.players[owner].hand.length)];appendLog(state,`Scratchwiser revealed ${defs[cardId]?.name??cardId} at random from ${owner}'s hand.`);notifyHandCardRevealed39(state,defs,owner,cardId)}}
    return true
  }
  if(pending.effectKey==='HDM082_OMNI'){
    const [owner,instanceId]=pending.targetRefs[0]?.split('|') as [PlayerId,string]
    const target=owner&&instanceId?findHoodmon(state.players[owner],instanceId):null
    if(target){addModifier(state,target,'HDM-082','atk',-300,'until_end_of_next_turn');setTemporaryRestriction(state,target,'cannotActivate',true,state.turnNumber+1);appendLog(state,'Monical — Omniscience Engine applied -300 ATK and disabled Activated effects through the end of the opponent’s next turn.')}
    return true
  }
  const ref=pending.targetRefs[0]
  const targetFromRef=()=>{if(!ref)return null;const[owner,inst]=ref.split('|') as [PlayerId,string];const target=findHoodmon(state.players[owner],inst);if(target&&support39TargetProtected(state,defs,pending.sourcePlayer,owner,target))return null;return target}
  if(pending.effectKey==='HDM071_APPLY'){
    if(pending.negated)return true;const target=targetFromRef();if(!target)return true
    target.damageTaken+=200;addModifier(state,target,'HDM-071','atk',-200,'until_end_of_next_turn');if(allHoodmon(state.players[pending.sourcePlayer]).some(c=>c.definitionId==='HDM-065'))setTemporaryRestriction(state,target,'cannotAttack',true,state.turnNumber+1);appendLog(state,'Gecko Ambush dealt 200 damage and applied -200 ATK through the opponent’s next turn.');return true
  }
  if(pending.effectKey==='HDM065_WEAKEN'){
    const target=targetFromRef();if(!target)return true
    addModifier(state,target,'HDM-065','atk',-200,'until_end_of_turn');appendLog(state,'Vaporgeck — Moisture Control applied -200 ATK this turn.');return true
  }
  if(pending.effectKey==='HDM066_FOG'){
    const target=targetFromRef();if(!target)return true
    addModifier(state,target,'HDM-066','atk',-400,'until_end_of_next_turn');setTemporaryRestriction(state,target,'cannotActivate',true,state.turnNumber+1);appendLog(state,'Nebulizard — Obedience Through Fog applied -400 ATK and disabled Activate effects through the end of the opponent’s next turn.');return true
  }
  if(pending.effectKey==='HDM099_WEAKEN'){
    const target=targetFromRef();if(target)addModifier(state,target,'HDM-099','atk',-200,'until_end_of_next_turn')
    if(Boolean(pending.context?.gainBondAfter))gainBond(state,pending.sourcePlayer,1,'Duskwyrm')
    appendLog(state,'Duskwyrm — Veil Slink applied -200 ATK through the end of the opponent’s next turn.');return true
  }
  if(pending.effectKey==='HDM100_WEAKEN'){
    const target=targetFromRef();if(target)addModifier(state,target,'HDM-100','atk',-300,'until_end_of_next_turn')
    const deployedId=String(pending.context?.deployedId??'')
    if(isShadow(defs[deployedId]))drawRequired(state,pending.sourcePlayer,1)
    appendLog(state,'Abyss Igniscale applied -300 ATK through the end of the opponent’s next turn.');return true
  }
  return false
}

export function resolveSupport39Choice(state:GameState,defs:Record<string,CardDefinition>,choice:PendingChoice,selected:ChoiceOption[]):boolean{
  const p=choice.player;const first=selected[0]
  const takeFromZone=(zone:'discard'|'hand'|'deck',option:ChoiceOption|undefined)=>{if(!option?.cardId)return null;const arr=zone==='discard'?state.players[p].discard:zone==='hand'?state.players[p].hand:state.players[p].hoodmonDeck;let idx=Number(String(option.value??'').split('|')[0]);if(!Number.isFinite(idx)||arr[idx]!==option.cardId)idx=arr.indexOf(option.cardId);if(idx<0)return null;return arr.splice(idx,1)[0]}
  if(choice.actionKey==='HDM005_BUFF'){
    const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null
    if(c)addModifier(state,c,'HDM-005','atk',100,'until_end_of_turn')
    if(state.players[p].tamer?.definitionId==='HDM-001')gainBond(state,p,1,'Loyal Packmate')
    return true
  }
  if(choice.actionKey==='HDM003_RETURN'){
    const c=takeFromZone('discard',first);if(c)state.players[p].hand.push(c);return true
  }
  if(choice.actionKey==='HDM006_BOND'||choice.actionKey==='HDM007_DOMINION'){
    const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null
    if(c){
      addInstanceMarker(state,c,'SUP39_NEIGHBORHOOD_LOYALTY',state.turnNumber)
      if(state.players[p].tamer?.definitionId==='HDM-001'){
        if(choice.actionKey==='HDM006_BOND')addModifier(state,c,'HDM-006','hp',200,'until_end_of_turn')
        else{addModifier(state,c,'HDM-007','atk',300,'until_end_of_turn');addModifier(state,c,'HDM-007','hp',300,'until_end_of_turn')}
      }
    }
    return true
  }
  if(choice.actionKey==='HDM004_SPLASH'){
    if(first?.player&&first.instanceId){
      const owner=first.player;const c=findHoodmon(state.players[owner],first.instanceId)
      if(c){
        c.damageTaken+=200
        const hp=effectiveHp(defs[c.definitionId],c)
        if(c.damageTaken>=hp){
          const wasActive=state.players[owner].activeHoodmon?.instanceId===c.instanceId
          removeFromBoard(state,owner,c);c.position='discard';c.restrictions={};c.statuses=[];c.statusExpiresOnTurn={};state.players[owner].discard.push(...c.evolutionStack,c.definitionId);c.evolutionStack=[]
          appendLog(state,`${defs[c.definitionId]?.name??c.definitionId} was defeated by Drunk Fist Fang's secondary hit.`)
          if(wasActive&&state.players[owner].reserves.some(Boolean))state.pendingPromotion=owner
          syncSupport39PersistentFields(state,defs,owner)
        }else appendLog(state,`Drunk Fist Fang dealt 200 damage to ${defs[c.definitionId]?.name??c.definitionId}.`)
      }
    }
    return true
  }
  if(choice.actionKey==='HDM002_TOP3'||choice.actionKey==='HDM064_TOP3'||choice.actionKey==='HDM069_TOP3'||choice.actionKey==='HDM079_TOP3'){
    const entries=Array.isArray(choice.context?.entries)?choice.context!.entries as string[]:[]
    const picked=first?.value?String(first.value):''
    if(picked){const id=picked.split('|')[1];if(id)state.players[p].hand.push(id)}
    const remaining=entries.filter(entry=>entry!==picked)
    const bottomKey=String(choice.context?.bottomKey??(choice.actionKey==='HDM064_TOP3'?'HDM064_BOTTOM':choice.actionKey==='HDM079_TOP3'?'HDM079_BOTTOM':'HDM069_BOTTOM'))
    final11BottomChoice(state,defs,p,choice.sourceCardId,remaining,bottomKey,choice.context??{})
    return true
  }
  if(choice.actionKey==='HDM002_BOTTOM'||choice.actionKey==='HDM064_BOTTOM'||choice.actionKey==='HDM069_BOTTOM'||choice.actionKey==='HDM079_BOTTOM'){
    for(const option of selected){const id=String(option.value??'').split('|')[1];if(id)state.players[p].hoodmonDeck.push(id)}
    notifyTopCardChanged39(state,p)
    return true
  }
  if(choice.actionKey==='HDM065_RECOVER'){
    if(first?.cardId){
      let idx=Number(String(first.value??'').split('|')[0]);if(state.players[p].discard[idx]!==first.cardId)idx=state.players[p].discard.indexOf(first.cardId)
      if(idx>=0){const[id]=state.players[p].discard.splice(idx,1);state.players[p].hand.push(id)}
    }
    const source=choice.sourceInstanceId?findHoodmon(state.players[p],choice.sourceInstanceId):null
    const continuations=Array.isArray(choice.context?.continuations)?choice.context!.continuations as string[]:[]
    if(source)open065Target(state,defs,p,source,continuations)
    return true
  }
  if(choice.actionKey==='HDM065_TARGET'){
    if(first?.player&&first.instanceId){
      const continuations=Array.isArray(choice.context?.continuations)?choice.context!.continuations as string[]:[]
      openTargeted39(state,p,'HDM-065','HDM065_WEAKEN',[`${first.player}|${first.instanceId}`],{continuations})
    }
    return true
  }
  if(choice.actionKey==='HDM066_TARGET'){
    if(first?.player&&first.instanceId){
      openTargeted39(state,p,'HDM-066','HDM066_FOG',[`${first.player}|${first.instanceId}`],{continuations:[`SUP39_RESUME_ATTACK|${p}|${choice.sourceInstanceId??''}`]})
    }else resumePendingAttack39(state,defs)
    return true
  }
  if(choice.actionKey==='HDM069_SWITCH'){
    const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null
    const old=choice.sourceInstanceId?findHoodmon(state.players[p],choice.sourceInstanceId):null
    if(c&&old&&state.players[p].activeHoodmon?.instanceId===old.instanceId){
      const idx=state.players[p].reserves.findIndex(r=>r?.instanceId===c.instanceId)
      if(idx>=0){markHoodmonSwitched39(state,old);c.position='active';state.players[p].activeHoodmon=c;old.position=`reserve_${idx+1}` as Position;state.players[p].reserves[idx]=old;markReserveToActive39(state,defs,p,c);appendLog(state,'Spotlet used Quick Dash and switched with a Reserve Hoodmon.')}
    }
    return true
  }
  if(choice.actionKey==='HDM099_TARGET'){
    if(first?.player&&first.instanceId){
      const continuations=Array.isArray(choice.context?.continuations)?choice.context!.continuations as string[]:[]
      openTargeted39(state,p,'HDM-099','HDM099_WEAKEN',[`${first.player}|${first.instanceId}`],{gainBondAfter:Boolean(choice.context?.gainBondAfter),continuations})
    }else if(Boolean(choice.context?.gainBondAfter))gainBond(state,p,1,'Duskwyrm')
    return true
  }
  if(choice.actionKey==='HDM001_PICK'||choice.actionKey==='HDM063_PICK'||choice.actionKey==='HDM105_PICK'){
    const entries=Array.isArray(choice.context?.entries)?choice.context!.entries as string[]:[];const picked=first?.value;let remaining=[...entries]
    if(picked){const id=String(picked).split('|')[1];if(id)state.players[p].hand.push(id);remaining=remaining.filter(x=>x!==picked)}
    for(const entry of remaining){const id=entry.split('|')[1];if(id)state.players[p].hoodmonDeck.push(id)}
    // These effects LOOK at the top cards and put unchosen cards on the bottom; they do not shuffle.
    notifyTopCardChanged39(state,p);if(choice.context?.triggerDeckLook)notifyDeckLook39(state,defs,p,p);return true
  }
  if(choice.actionKey==='HDM016_NEGATE'){
    if(first?.player&&first.instanceId){const target=runtimeCardByInstance(state,first.player,first.instanceId);if(target){addInstanceMarker(state,target,'HDM-016-NEGATED',state.turnNumber+1);setTemporaryRestriction(state,target,'cannotActivate',true,state.turnNumber+1);if(target.definitionId==='HDM-042'||target.definitionId==='HDM-051'){for(const hoodmon of allHoodmon(state.players[first.player]))hoodmon.modifiers=hoodmon.modifiers.filter(m=>m.sourceCardId!==target.definitionId)}syncSupport39PersistentFields(state,defs,first.player);appendLog(state,`Cinnamon — Crowd Control negated ${defs[target.definitionId]?.name??target.definitionId}'s effects through the end of ${first.player}'s next turn.`)}}return true
  }
  if(choice.actionKey==='HDM016_PASSIVE_TOP'){
    const entries=Array.isArray(choice.context?.entries)?choice.context!.entries as string[]:[];const top=String(first?.value??'');const remaining=entries.filter(e=>e!==top)
    if(remaining.length<=1){const topId=top.split('|')[1];if(topId)state.players[p].hoodmonDeck.unshift(topId);for(const entry of remaining){const id=entry.split('|')[1];if(id)state.players[p].hoodmonDeck.push(id)};notifyTopCardChanged39(state,p);drawRequired(state,p,1);if(state.status!=='game_over')notifyDeckLook39(state,defs,p,p);return true}
    const options=remaining.map((entry)=>{const[i,id]=entry.split('|');return{id:`cinnamon-bottom:${i}:${id}`,value:entry,cardId:id,label:defs[id]?.name??id,detail:'PLACE ON BOTTOM'}})
    openChoice(state,{player:p,sourceCardId:'HDM-016',sourceInstanceId:choice.sourceInstanceId,prompt:'PASSIVE — choose 1 of the remaining inspected cards to place on the bottom. The other stays immediately behind the chosen top card.',minSelections:1,maxSelections:1,options,actionKey:'HDM016_PASSIVE_BOTTOM',context:{top,remaining,continuations:choice.context?.continuations??[]}});return true
  }
  if(choice.actionKey==='HDM016_PASSIVE_BOTTOM'){
    const top=String(choice.context?.top??'');const remaining=Array.isArray(choice.context?.remaining)?choice.context!.remaining as string[]:[];const bottom=String(first?.value??'');const middle=remaining.filter(e=>e!==bottom);const topId=top.split('|')[1];if(topId)state.players[p].hoodmonDeck.unshift(topId,...middle.map(e=>e.split('|')[1]).filter(Boolean));const bottomId=bottom.split('|')[1];if(bottomId)state.players[p].hoodmonDeck.push(bottomId);notifyTopCardChanged39(state,p);drawRequired(state,p,1);if(state.status!=='game_over')notifyDeckLook39(state,defs,p,p);return true
  }
  if(choice.actionKey==='HDM017_PICK'||choice.actionKey==='HDM020_PICK'){
    const entries=Array.isArray(choice.context?.entries)?choice.context!.entries as string[]:[];const picked=String(first?.value??'');if(picked){const id=picked.split('|')[1];if(id)state.players[p].hand.push(id)}const remaining=entries.filter(e=>e!==picked);const actionKey=choice.actionKey==='HDM017_PICK'?'HDM017_BOTTOM':'HDM020_BOTTOM';if(!remaining.length){notifyTopCardChanged39(state,p);notifyDeckLook39(state,defs,p,p);return true}if(remaining.length===1){const id=remaining[0].split('|')[1];if(id)state.players[p].hoodmonDeck.push(id);notifyTopCardChanged39(state,p);notifyDeckLook39(state,defs,p,p);return true}const options=remaining.map(entry=>{const[i,id]=entry.split('|');return{id:`bottom:${i}:${id}`,value:entry,cardId:id,label:defs[id]?.name??id,detail:'Choose every remaining card in bottom-deck order.'}});openChoice(state,{player:p,sourceCardId:choice.sourceCardId,sourceInstanceId:choice.sourceInstanceId,prompt:'Put the remaining inspected cards on the bottom of your Hoodmon Deck in any order.',minSelections:remaining.length,maxSelections:remaining.length,options,actionKey,context:{continuations:choice.context?.continuations??[]}});return true
  }
  if(choice.actionKey==='HDM017_BOTTOM'||choice.actionKey==='HDM020_BOTTOM'){
    for(const option of selected){const id=String(option.value??'').split('|')[1];if(id)state.players[p].hoodmonDeck.push(id)}notifyTopCardChanged39(state,p);notifyDeckLook39(state,defs,p,p);return true
  }
  if(choice.actionKey==='HDM018_ORDER'){
    restoreTopInSelectedOrder(state,choice,selected);const deckOwner=String(choice.context?.deckOwner??otherPlayer(p)) as PlayerId
    const marked=['P1','P2'].some(owner=>allHoodmon(state.players[owner as PlayerId]).some(c=>hasStatus(c,'marked')))
    if(marked){drawRequired(state,p,1);if(state.status!=='game_over'&&state.players[p].hand.length){discardChoice(state,defs,p,'HDM-018','HDM018_DISCARD','STREET SURVEILLANCE — choose 1 card to discard after drawing.',{deckOwner,triggerDeckLook:true,continuations:choice.context?.continuations??[]});return true}}
    if(state.status!=='game_over')notifyDeckLook39(state,defs,p,deckOwner);return true
  }
  if(choice.actionKey==='HDM018_DISCARD'){const c=takeFromZone('hand',first);if(c)state.players[p].discard.push(c);if(choice.context?.triggerDeckLook)notifyDeckLook39(state,defs,p,String(choice.context?.deckOwner??otherPlayer(p)) as PlayerId);return true}
  if(choice.actionKey==='HDM020_DISCARD'){const c=takeFromZone('hand',first);if(c)state.players[p].discard.push(c);return true}
  if(choice.actionKey==='HDM021_PERCH'){
    const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c){addModifier(state,c,'HDM-021','hp',200,'persistent');const t=state.players[p].tamer;if(t?.definitionId==='HDM-001'&&!support39CardEffectsNegated(state,t))addInstanceMarker(state,c,'SUP39_NEIGHBORHOOD_LOYALTY',state.turnNumber)}return true
  }
  if(choice.actionKey==='HDM016_READY'){const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c){c.readyState='ready';setTemporaryRestriction(state,c,'cannotTask',true,state.turnNumber)}return true}
  if(choice.actionKey==='HDM016_DECK'){const owner=String(first?.value) as PlayerId;deckLookOrderChoice(state,defs,p,owner,'HDM-016',2,'HDM016_ORDER');return true}
  if(choice.actionKey==='HDM016_ORDER'||choice.actionKey==='HDM027_ORDER'||choice.actionKey==='HDM078_ORDER'||choice.actionKey==='HDM084_ORDER'){
    restoreTopInSelectedOrder(state,choice,selected)
    const deckOwner=String(choice.context?.deckOwner??p) as PlayerId
    if(choice.actionKey==='HDM084_ORDER'){
      const options=allHoodmon(state.players[p]).map(c=>hoodmonOption(defs,p,c))
      if(options.length) openChoice(state,{player:p,sourceCardId:'HDM-084',prompt:'Choose 1 of your Hoodmon to gain +200 TASK this turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM084_TASK',context:{deckOwner,triggerDeckLook:Boolean(choice.context?.triggerDeckLook)}})
      else if(choice.context?.triggerDeckLook) notifyDeckLook39(state,defs,p,deckOwner)
    } else if(choice.context?.triggerDeckLook) notifyDeckLook39(state,defs,p,deckOwner)
    return true
  }
  if(choice.actionKey==='HDM023_DISCARD'||choice.actionKey==='HDM025_DISCARD'||choice.actionKey==='HDM074_DISCARD'||choice.actionKey==='HDM030_CYCLE_DISCARD'||choice.actionKey==='HDM084_DISCARD'){const card=takeFromZone('hand',first);if(card)state.players[p].discard.push(card);if(choice.actionKey==='HDM023_DISCARD'&&choice.context?.capinAfter){const options=allHoodmon(state.players[p]).map(c=>hoodmonOption(defs,p,c));if(options.length)openChoice(state,{player:p,sourceCardId:'HDM-078',prompt:'Capin MDH — choose 1 Hoodmon to gain +100 TASK this turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM078_TASK'})}if(choice.actionKey==='HDM084_DISCARD'&&choice.context?.triggerDeckLook&&!state.pendingChoice)notifyDeckLook39(state,defs,p,String(choice.context?.deckOwner??p) as PlayerId);return true}
  if(choice.actionKey==='HDM030_PASSIVE'){if(first?.value==='bond')gainBond(state,p,1,'Peaches');else{drawRequired(state,p,1);if(state.status!=='game_over')discardChoice(state,defs,p,'HDM-030','HDM030_CYCLE_DISCARD','Peaches: choose 1 card to discard.')}return true}
  if(choice.actionKey==='HDM030_CASHIN'){const owner=first?.player,inst=first?.instanceId;if(owner&&inst){const c=findHoodmon(state.players[owner],inst);if(c){addModifier(state,c,'HDM-030','atk',-200,'until_end_of_turn');addInstanceMarker(state,c,'HDM-030-NO-PROTECT',state.turnNumber)}}return true}
  if(choice.actionKey==='HDM078_DECK'){const owner=String(first?.value) as PlayerId;deckLookOrderChoice(state,defs,p,owner,'HDM-078',3,'HDM078_ORDER');return true}
  if(choice.actionKey==='HDM078_TASK'||choice.actionKey==='HDM084_TASK'){
    const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null
    if(c)addModifier(state,c,choice.sourceCardId,'task',choice.actionKey==='HDM084_TASK'?200:100,'until_end_of_turn')
    if(choice.actionKey==='HDM084_TASK'){
      const deckOwner=String(choice.context?.deckOwner??p) as PlayerId
      const triggerLook=Boolean(choice.context?.triggerDeckLook)
      if(state.players[p].tamer?.definitionId==='HDM-078'){
        drawRequired(state,p,1)
        if(state.status!=='game_over'&&state.players[p].hand.length){discardChoice(state,defs,p,'HDM-084','HDM084_DISCARD','Data Over Fear: choose 1 card to discard.',{deckOwner,triggerDeckLook:triggerLook});return true}
      }
      if(triggerLook) notifyDeckLook39(state,defs,p,deckOwner)
    }
    return true
  }
  if(choice.actionKey==='HDM094_RETURN'){const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c){returnWholeStackToHand(state,defs,p,c);state.pendingPromotion=null;gainBond(state,p,1,'EB & Igniscale')}return true}
  if(choice.actionKey==='HDM094_NATURAL'){const card=takeFromZone('deck',first);if(card){state.players[p].hand.push(card);state.players[p].hoodmonDeck=shuffle(state.players[p].hoodmonDeck);notifyTopCardChanged39(state,p)}return true}
  if(choice.actionKey==='HDM008_DISCARD'){const card=takeFromZone('hand',first);if(card)state.players[p].discard.push(card);return true}
  if(choice.actionKey==='HDM-009_RECOVER'||choice.actionKey==='HDM-070_RECOVER'){
    if(selected[0]){const c=takeFromZone('discard',selected[0]);if(c)state.players[p].hand.push(c)}
    if(selected[1]){const c=takeFromZone('discard',selected[1]);if(c){state.players[p].hoodmonDeck.push(c);state.players[p].hoodmonDeck=shuffle(state.players[p].hoodmonDeck);notifyTopCardChanged39(state,p)}}
    if(choice.actionKey==='HDM-009_RECOVER'&&state.players[p].tamer?.definitionId==='HDM-001')gainBond(state,p,1,'Good Dogs Great People')
    if(choice.actionKey==='HDM-070_RECOVER'&&allHoodmon(state.players[p]).some(c=>['HDM-065','HDM-066'].includes(c.definitionId)))gainBond(state,p,1,'Vapor Cache')
    return true
  }
  if(choice.actionKey==='HDM012_BUFF'){const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c){addModifier(state,c,'HDM-012','atk',300,'until_end_of_turn');c.restrictions.cannotBeTargetedByOpponentEffects=true;c.restrictionExpiresOnTurn??={};c.restrictionExpiresOnTurn.cannotBeTargetedByOpponentEffects=state.turnNumber;if(c.definitionId==='HDM-004'){const opp=otherPlayer(p);const options=allHoodmon(state.players[opp]).map(x=>hoodmonOption(defs,opp,x));if(options.length)openChoice(state,{player:p,sourceCardId:'HDM-012',prompt:'Drunk Fist Wulf bonus — you may deal 100 damage to 1 opposing Hoodmon.',minSelections:0,maxSelections:1,options,actionKey:'HDM012_PING'})}}return true}
  if(choice.actionKey==='HDM012_PING'){
    if(first?.player&&first.instanceId){
      const owner=first.player;const c=findHoodmon(state.players[owner],first.instanceId)
      if(c){
        c.damageTaken+=100
        const hp=effectiveHp(defs[c.definitionId],c)
        if(c.damageTaken>=hp){
          const wasActive=state.players[owner].activeHoodmon?.instanceId===c.instanceId
          removeFromBoard(state,owner,c);c.position='discard';c.restrictions={};c.statuses=[];c.statusExpiresOnTurn={};state.players[owner].discard.push(...c.evolutionStack,c.definitionId);c.evolutionStack=[]
          appendLog(state,`${defs[c.definitionId]?.name??c.definitionId} was defeated by Drunken Fist Lesson.`)
          if(wasActive&&state.players[owner].reserves.some(Boolean))state.pendingPromotion=owner
          syncSupport39PersistentFields(state,defs,owner)
        }
      }
    }
    return true
  }
  if(choice.actionKey==='HDM022_RETURN'){const card=takeFromZone('discard',first);if(card)state.players[p].hand.push(card);const options=allHoodmon(state.players[p]).filter(c=>isWind(defs[c.definitionId])).map(c=>hoodmonOption(defs,p,c));if(options.length)openChoice(state,{player:p,sourceCardId:'HDM-022',prompt:'Choose 1 Wind Hoodmon you control to gain +100 TASK this turn.',minSelections:1,maxSelections:1,options,actionKey:'HDM022_TASK'});return true}
  if(choice.actionKey==='HDM022_TASK'){const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c)addModifier(state,c,'HDM-022','task',100,'until_end_of_turn');return true}
  if(choice.actionKey==='HDM059_BOTTOM'){const target=String(choice.context?.targetPlayer) as PlayerId;if(first?.cardId){let idx=Number(String(first.value??'').split('|')[0]);if(state.players[target].hand[idx]!==first.cardId)idx=state.players[target].hand.indexOf(first.cardId);if(idx>=0){const[c]=state.players[target].hand.splice(idx,1);state.players[target].hoodmonDeck.push(c);notifyTopCardChanged39(state,target)}}if(allHoodmon(state.players[p]).some(c=>isDarkOrFairy(defs[c.definitionId])))drawRequired(state,p,1);return true}
  if(choice.actionKey==='HDM061_SEARCH'){
    if(first?.id.startsWith('taskdeck:')){let idx=Number(String(first.value??'').split('|')[0]);if(state.players[p].taskDeck[idx]!==first.cardId)idx=state.players[p].taskDeck.indexOf(first.cardId!);if(idx>=0){const[c]=state.players[p].taskDeck.splice(idx,1);state.players[p].taskDeck.unshift(c)}}else{const c=takeFromZone('deck',first);if(c){state.players[p].hand.push(c);state.players[p].hoodmonDeck=shuffle(state.players[p].hoodmonDeck);notifyTopCardChanged39(state,p)}}
    openChoice(state,{player:p,sourceCardId:'HDM-061',prompt:'Choose a Hoodmon Deck whose top 2 cards you will rearrange.',minSelections:1,maxSelections:1,options:[{id:'own',value:p,label:'YOUR HOODMON DECK'},{id:'opp',value:otherPlayer(p),label:"OPPONENT'S HOODMON DECK"}],actionKey:'HDM061_DECK'});return true
  }
  if(choice.actionKey==='HDM061_DECK'){const owner=String(first?.value) as PlayerId;deckLookOrderChoice(state,defs,p,owner,'HDM-061',2,'HDM061_ORDER');return true}
  if(choice.actionKey==='HDM061_ORDER'){restoreTopInSelectedOrder(state,choice,selected);if(state.players[p].tamer?.definitionId==='HDM-078')drawRequired(state,p,1);if(state.status!=='game_over'&&choice.context?.triggerDeckLook)notifyDeckLook39(state,defs,p,String(choice.context?.deckOwner??p) as PlayerId);return true}
  if(choice.actionKey==='HDM080_TARGET'){if(first?.player&&first.instanceId){const cont=Array.isArray(choice.context?.continuations)?choice.context!.continuations as string[]:[];const revealCont=state.players[p].tamer?.definitionId==='HDM-078'?[`HDM090_OPP_REVEAL|${first.player}|`,...cont]:cont;openTargeted39(state,p,'HDM-080','HDM080_WEAKEN',[`${first.player}|${first.instanceId}`],{continuations:revealCont})}return true}
  if(choice.actionKey==='HDM081_RECOVER'){if(first?.cardId){const c=takeFromZone('discard',first);if(c)state.players[p].hand.push(c)}if(Boolean(choice.context?.gainBond))gainBond(state,p,1,'Calicore');return true}
  if(choice.actionKey==='HDM082_TARGET'){if(first?.player&&first.instanceId)openTargeted39(state,p,'HDM-082','HDM082_OMNI',[`${first.player}|${first.instanceId}`]);return true}
  if(choice.actionKey==='HDM071_TARGET'){if(first?.player&&first.instanceId){openTargeted39(state,p,'HDM-071','HDM071_APPLY',[`${first.player}|${first.instanceId}`]);}return true}
  if(choice.actionKey==='HDM-075_SEARCH'||choice.actionKey==='HDM-101_SEARCH'){const card=takeFromZone('deck',first);if(card){const pickedDef=defs[card];state.players[p].hand.push(card);state.players[p].hoodmonDeck=shuffle(state.players[p].hoodmonDeck);notifyTopCardChanged39(state,p);if(choice.actionKey==='HDM-075_SEARCH'&&state.players[p].tamer?.definitionId==='HDM-063')gainBond(state,p,1,'Mist Map');if(choice.actionKey==='HDM-101_SEARCH'){const opposite=isBright(pickedDef)?'Shadow Ember':'Bright Flame';if(allHoodmon(state.players[p]).some(c=>hasTrait(defs[c.definitionId],opposite)))gainBond(state,p,1,'Different Blood, Same Loyalty')}notifyDeckLook39(state,defs,p,p)}return true}
  if(choice.actionKey==='HDM102_DRAGON'){const chosen=first?.instanceId?[first.instanceId]:[];openPitChoice102(state,defs,p,chosen);return true}
  if(choice.actionKey==='HDM102_PIT'){const chosen=Array.isArray(choice.context?.chosen)?choice.context!.chosen as string[]:[];if(first?.instanceId)chosen.push(first.instanceId);finish102(state,defs,p,chosen);return true}
  if(choice.actionKey==='HDM106_PROMOTE'){const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c){const idx=state.players[p].reserves.findIndex(r=>r?.instanceId===c.instanceId);if(idx>=0){state.players[p].reserves[idx]=null;c.position='active';state.players[p].activeHoodmon=c;markReserveToActive39(state,defs,p,c)}}return true}
  if(choice.actionKey==='HDM109_BRIGHT'){const chosen=first?.instanceId?[first.instanceId]:[];openShadowChoice109(state,defs,p,chosen);return true}
  if(choice.actionKey==='HDM109_SHADOW'){const chosen=Array.isArray(choice.context?.chosen)?choice.context!.chosen as string[]:[];if(first?.instanceId)chosen.push(first.instanceId);finish109(state,defs,p,chosen);return true}
  if(choice.actionKey==='HDM014_RETURN'){const c=takeFromZone('discard',first);if(c)state.players[p].hand.push(c);return true}
  if(choice.actionKey==='HDM024_DECK'){
    const owner=String(first?.value) as PlayerId
    const bird=allHoodmon(state.players[p]).some(c=>hasTrait(defs[c.definitionId],'Bird'))
    if(bird)return openChoice(state,{player:p,sourceCardId:'HDM-024',prompt:"Bird's-Eye Backdoor — reorder the top 3, or put 1 of them on the bottom instead.",minSelections:1,maxSelections:1,options:[{id:'reorder',value:'reorder',label:'REORDER TOP 3'},{id:'bottom',value:'bottom',label:'PUT 1 ON BOTTOM'}],actionKey:'HDM024_MODE',context:{deckOwner:owner}}),true
    deckLookOrderChoice(state,defs,p,owner,'HDM-024',3,'HDM024_ORDER',false);return true
  }
  if(choice.actionKey==='HDM024_MODE'){const owner=String(choice.context?.deckOwner??p) as PlayerId;if(first?.value==='bottom')openBirdBackdoorBottomChoice(state,defs,p,owner);else deckLookOrderChoice(state,defs,p,owner,'HDM-024',3,'HDM024_ORDER',false);return true}
  if(choice.actionKey==='HDM024_ORDER'){restoreTopInSelectedOrder(state,choice,selected);if(choice.context?.triggerDeckLook)notifyDeckLook39(state,defs,p,String(choice.context?.deckOwner??p) as PlayerId);return true}
  if(choice.actionKey==='HDM024_BOTTOM'){const owner=String(choice.context?.deckOwner??p) as PlayerId;const entries=Array.isArray(choice.context?.entries)?choice.context!.entries as string[]:[];const picked=first?.value;const remaining=entries.filter(e=>e!==picked).map(e=>e.split('|')[1]).filter(Boolean);const bottom=String(picked??'').split('|')[1];state.players[owner].hoodmonDeck.unshift(...remaining);if(bottom)state.players[owner].hoodmonDeck.push(bottom);notifyTopCardChanged39(state,owner);if(choice.context?.triggerDeckLook)notifyDeckLook39(state,defs,p,owner);return true}
  if(choice.actionKey==='HDM072_MODE'){if(first?.value==='draw')drawRequired(state,p,1);else{const options=state.players[p].discard.flatMap((x,i)=>isWaterNatureSmoke(defs[x])?[cardOption(defs,'discard',x,i)]:[]);if(options.length)openChoice(state,{player:p,sourceCardId:'HDM-072',prompt:'Return 1 Water, Nature, or Smoke card from Discard to hand.',minSelections:1,maxSelections:1,options,actionKey:'HDM072_RETURN'})}return true}
  if(choice.actionKey==='HDM072_RETURN'){const c=takeFromZone('discard',first);if(c)state.players[p].hand.push(c);return true}
  if(choice.actionKey==='HDM073_SWITCH'||choice.actionKey==='HDM077_SWITCH'||choice.actionKey==='HDM104_SWITCH'){
    const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c){const idx=state.players[p].reserves.findIndex(r=>r?.instanceId===c.instanceId);const old=state.players[p].activeHoodmon;if(idx>=0){if(old)markHoodmonSwitched39(state,old);c.position='active';state.players[p].activeHoodmon=c;if(old){old.position=`reserve_${idx+1}` as Position;state.players[p].reserves[idx]=old}else state.players[p].reserves[idx]=null;markReserveToActive39(state,defs,p,c);const atk=state.reactionWindow?.pendingAttack;if(atk)atk.defenderInstanceId=c.instanceId;if(choice.actionKey==='HDM104_SWITCH')addModifier(state,c,'HDM-104','atk',200,'until_end_of_turn')}}return true
  }
  if(choice.actionKey==='HDM107_REVEAL'){
    const atk=state.reactionWindow?.pendingAttack
    if(first?.cardId&&atk){atk.damageModifier=(atk.damageModifier??0)+200;appendLog(state,`Peaches' Backup Bite revealed ${defs[first.cardId]?.name??first.cardId}; the attack gains +200 damage.`)}
    const opp=otherPlayer(p);const options=allHoodmon(state.players[opp]).map(c=>hoodmonOption(defs,opp,c));if(options.length)openChoice(state,{player:p,sourceCardId:'HDM-107',prompt:'Peaches’ Backup Bite — you may Exhaust 1 opposing Hoodmon.',minSelections:0,maxSelections:1,options,actionKey:'HDM107_EXHAUST'});return true
  }
  if(choice.actionKey==='HDM107_EXHAUST'){if(first?.player&&first.instanceId){const c=findHoodmon(state.players[first.player],first.instanceId);if(c)exhaustByCardEffect39(state,defs,p,first.player,c,'HDM-107')}return true}
  if(choice.actionKey==='HDM057_KITTEN'){
    if(first?.cardId){
      let idx=Number(String(first.value??'').split('|')[0]);if(state.players[p].discard[idx]!==first.cardId)idx=state.players[p].discard.indexOf(first.cardId)
      if(idx>=0){
        const[id]=state.players[p].discard.splice(idx,1);const player=state.players[p];let pos:Position='active'
        if(player.activeHoodmon){const slot=player.reserves.findIndex(x=>!x);if(slot<0){player.discard.push(id);return true}pos=`reserve_${slot+1}` as Position;player.reserves[slot]=makeFreeHoodmonInstance(id,p,pos)}
        else player.activeHoodmon=makeFreeHoodmonInstance(id,p,pos)
        appendLog(state,'Nine Lives Escape played Kitten from the Discard without paying its cost.')
      }
    }
    if(state.players[p].activeHoodmon)state.pendingPromotion=null
    else if(state.players[p].reserves.some(Boolean))state.pendingPromotion=p
    return true
  }
  if(choice.actionKey==='HDM067_DRAW'){if(first?.value==='draw')drawRequired(state,p,1);return true}
  if(choice.actionKey==='HDM097_BUFF'){const c=first?.instanceId?findHoodmon(state.players[p],first.instanceId):null;if(c){addModifier(state,c,'HDM-097','atk',300,'until_end_of_turn');if(isBright(defs[c.definitionId]))gainBond(state,p,1,'Ashen Warden')}return true}
  if(choice.actionKey==='HDM100_WEAKEN'){
    if(first?.player&&first.instanceId){
      const continuations=Array.isArray(choice.context?.continuations)?choice.context!.continuations as string[]:[]
      openTargeted39(state,p,'HDM-100','HDM100_WEAKEN',[`${first.player}|${first.instanceId}`],{deployedId:String(choice.context?.deployedId??''),continuations})
    }else if(isShadow(defs[String(choice.context?.deployedId??'')]))drawRequired(state,p,1)
    return true
  }
  return false
}

function openTargeted39(state:GameState,sourcePlayer:PlayerId,sourceCardId:string,effectKey:string,targetRefs:string[],context:PendingTargetedEffect['context']={}):void{
  const owner=(targetRefs[0]?.split('|')[0] as PlayerId|undefined)??otherPlayer(sourcePlayer)
  state.status='reaction';state.reactionWindow={openedBy:'effect',nonActivePlayerResponded:false,activePlayerResponded:false,priority:owner,pendingEffect:{sourcePlayer,sourceCardId,effectKey,targetRefs,context},responseStack:[],responseCards:[]};appendLog(state,`${sourceCardId} targeted a Hoodmon. Reaction Window opened.`)
}
