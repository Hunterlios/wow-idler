import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { advance, newGame, simulateOffline, spiritRes, stats } from '../game/sim'
import { loadGame, saveGame, wipeSave } from '../game/save'
import { enterCapital, enterTown, leaveTown, inCombat } from '../game/town'
import type { EquipSlot, GameEvent, GameState, OfflineSummary } from '../game/types'
import { RARITY_COLOR } from '../game/types'
import type { Scene } from '../render/scene'
import { CharacterCreate } from './CharacterCreate'
import { Strip, type PanelId } from './Strip'
import { DragGhost, setDropHandler, setPickHandler, type DragSrc } from './dnd'
import { onGameEvent, updateLoops, uiOpen, uiClick, uiMicro, itemPick, itemDrop, uiSound, npcGreet } from '../audio/gamesounds'
import { gameSpeed } from '../game/admin'
import { dropItem, setEquipHook, setDestroyHook } from './itemActions'
import { destroyItem } from '../game/inventory'
import { syncQuests } from '../game/quests'
import { BagsPanel, CharacterPanel, CityPanel, LogPanel, QuestLog, Settings, SkillsPanel, Spellbook, TalentsPanel, fmtTime } from './Panels'
import { onLayout, uiScale } from './layout'
import { MapPanel } from './MapPanel'
import { Money, Guard } from './common'
import { isOverlay, refreshCursor } from '../platform'
import { borderUrl } from '../render/icons'
import { cursorUrl } from '../render/assets'
import { classById } from '../data/classes'
import { zoneById } from '../data/zones'

type Toast = { id: number; text: string; color: string }

export function App() {
  const [game, setGame] = useState<GameState | null>(() => loadGame())
  const [, bump] = useReducer((x: number) => x + 1, 0)
  const [open, setOpen] = useState<Set<PanelId>>(new Set())
  const [del, setDel] = useState<DragSrc | null>(null)
  const [offline, setOffline] = useState<OfflineSummary | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const sceneRef = useRef<Scene | null>(null)
  const gameRef = useRef(game)
  // dźwięki interfejsu: przyciski i mikro-menu (jeden nasłuch dla całej aplikacji)
  useEffect(() => {
    const f = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.closest('.mbtn')) uiMicro()
      else if (t.closest('button, .wbtn, .tab, input[type=checkbox], .sp-row')) uiClick()
    }
    document.addEventListener('click', f, true)
    return () => document.removeEventListener('click', f, true)
  }, [])
  // Ramka ikon (assets/icons/default.png) i kursor gry (assets/graphics/cursor.png), gdy gracz je dostarczył.
  // Kursor działa tylko, gdy okno gry ma fokus (klasa game-focus).
  useEffect(() => {
    const root = document.documentElement
    const b = borderUrl()
    if (b) { root.style.setProperty('--ico-border', `url("${b}")`); root.classList.add('ico-framed') }
    let alive = true
    cursorUrl().then((u) => { if (alive && u) { root.style.setProperty('--game-cursor', `url("${u}") 3 3, auto`); root.style.setProperty('--game-cursor-b', `url("${u}#b") 3 3, auto`); root.classList.add('has-cursor') } })
    // nakładka (exe): kursor gry zawsze nad elementami gry (okno nakładki rzadko ma fokus); przeglądarka: gdy karta ma fokus
    const focus = () => { root.classList.toggle('game-focus', isOverlay || document.hasFocus()); refreshCursor() }
    focus()
    window.addEventListener('focus', focus); window.addEventListener('blur', focus)
    return () => { alive = false; window.removeEventListener('focus', focus); window.removeEventListener('blur', focus) }
  }, [])
  gameRef.current = game

  const toast = useCallback((text: string, color = '#ffd100') => {
    const id = Math.random()
    if (color === '#ff4040') {
      const race = gameRef.current?.hero.race
      if (race && /money|gold|afford/i.test(text)) uiSound(`voice.${race}.err.money`, 3000)
      else if (race && /full/i.test(text)) uiSound(`voice.${race}.err.bagfull`, 3000)
      else uiSound('ui.error', 300)
    }
    setToasts((t) => [...t.slice(-3), { id, text, color }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  const toggle = useCallback((p: PanelId) => setOpen((o) => { const n = new Set(o); if (n.has(p)) n.delete(p); else n.add(p); uiOpen(p, n.has(p)); return n }), [])
  useEffect(() => { const r = requestAnimationFrame(() => window.dispatchEvent(new Event('ui-layout'))); return () => cancelAnimationFrame(r) }, [open])
  setEquipHook(() => setOpen((o) => { if (o.has('char')) return o; const n = new Set(o); n.add('char'); uiOpen('char', true); return n }))
  const close = (p: PanelId) => setOpen((o) => { const n = new Set(o); if (n.has(p)) uiOpen(p, false); n.delete(p); return n })

  // skala UI (zoom) liczona z wysokości okna albo z ustawień
  useEffect(() => {
    const apply = () => { document.documentElement.style.setProperty('--ui', String(uiScale())); bump() }
    apply()
    window.addEventListener('resize', apply)
    const off = onLayout(apply)
    return () => { window.removeEventListener('resize', apply); off() }
  }, [])

  // progres offline przy starcie
  useEffect(() => {
    const s = gameRef.current
    if (!s) return
    const gap = (Date.now() - s.savedAt) / 1000
    if (gap > 60) { setOffline(simulateOffline(s, gap)); saveGame(s) }
  }, [])

  // pętla gry
  useEffect(() => {
    if (!game) return
    let last = performance.now()
    let loopsAt = 0
    let raf = 0
    const emit = (e: GameEvent) => {
      const s = gameRef.current!
      sceneRef.current?.onEvent(e, s)
      onGameEvent(e, s)
      if (e.t === 'level') toast(`Level ${e.level}!${e.learnable ? ` Trainer: ${e.learnable} to learn` : ''}`)
      else if (e.t === 'loot' && e.item.rarity >= 3) toast(`${e.equipped ? 'Equipped' : 'Loot'}: [${e.item.name}]`, RARITY_COLOR[e.item.rarity])
      else if (e.t === 'cleared') toast(e.zoneBoss ? `${e.boss} defeated! New zone unlocked` : `${e.boss} defeated!`, '#ff9a40')
      else if (e.t === 'zone') toast(`Entering: ${zoneById(e.zone).name}`, '#69ccf0')
      else if (e.t === 'death') toast(`${e.boss ? `${e.boss} has defeated you!` : 'You died!'} Your ghost runs back to the corpse, or click "Spirit Healer".`, '#ff4040')
      else if (e.t === 'questdone') toast(`Quest complete: ${e.quest.title}`, '#ffd100')
    }
    const pump = (now: number, draw: boolean) => {
      const s = gameRef.current
      if (!s) return
      const real = (now - last) / 1000
      last = now
      if (real > 30) {
        const sum = simulateOffline(s, real)
        if (real > 120) setOffline(sum)
      } else if (real > 0) advance(s, real * gameSpeed(s.speed), emit)
      if (draw) sceneRef.current?.draw(s, Math.min(real, 0.1))
      if (now - loopsAt > 500) { loopsAt = now; updateLoops(s) }
    }
    const frame = (t: number) => { pump(t, true); raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    const backup = setInterval(() => { if (performance.now() - last > 900) pump(performance.now(), false) }, 1000)
    const ui = setInterval(bump, 250)
    const save = setInterval(() => gameRef.current && saveGame(gameRef.current), 10000)
    const onHide = () => { if (document.visibilityState === 'hidden' && gameRef.current) saveGame(gameRef.current) }
    const onUnload = () => gameRef.current && saveGame(gameRef.current)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      cancelAnimationFrame(raf); clearInterval(backup); clearInterval(ui); clearInterval(save)
      document.removeEventListener('visibilitychange', onHide); window.removeEventListener('beforeunload', onUnload)
    }
  }, [game, toast])

  // skróty klawiszowe jak w WoW
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const map: Record<string, PanelId> = { c: 'char', b: 'bags', m: 'map', l: 'quests', p: 'spells', n: 'talents', k: 'skills' }
      const p = map[e.key.toLowerCase()]
      if (p) toggle(p)
      if (e.key === 'Escape') setOpen(new Set())
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [toggle])

  if (!game) {
    return (
      <div className={`root ${isOverlay ? 'overlay' : 'web'}`}>
        {!isOverlay && <WebBackdrop />}
        <CharacterCreate onCreate={(name, race, cls) => { const s = newGame(name, race, cls); saveGame(s); setGame(s) }} />
      </div>
    )
  }

  const act = (a: 'town' | 'capital' | 'leave' | 'spirit') => {
    if (a === 'spirit') { spiritRes(game, (e) => sceneRef.current?.onEvent(e, game)); bump(); return }
    const vendorRace = game.hero.faction === 'horde' ? 'troll' : 'gnome'
    if (a === 'town') { if (!enterTown(game)) toast(game.phase === 'travel' ? 'You are travelling.' : inCombat(game) ? 'You can\'t do that while in combat.' : 'This zone has no town.', '#ff4040'); else { setOpen((o) => new Set([...o, 'bags'])); uiSound('ui.open.city'); npcGreet(vendorRace) } }
    else if (a === 'capital') { const e = enterCapital(game); if (e) toast(e, '#ff4040'); else { setOpen((o) => new Set([...o, 'bags'])); uiSound('ui.hearth', 500); npcGreet(game.hero.faction === 'horde' ? 'orc' : 'dwarf') } }
    else if (a === 'leave') { leaveTown(game); uiSound('ui.close.city') }
    bump()
  }
  const ax = { bump, toast }
  const itemOf = (src: DragSrc) => src.k === 'inv' ? game.hero.inv[src.idx] : src.k === 'eq' ? game.hero.equip[src.slot as keyof typeof game.hero.equip] : game.hero.bags[src.i]
  setPickHandler((src) => { const it = itemOf(src); if (it) itemPick(it) })
  setDropHandler((src, target) => {
    const it = itemOf(src)
    // upuszczenie poza oknami: pytanie o zniszczenie przedmiotu (torby z zawartością się nie niszczy)
    if (target === 'outside' && it && src.k !== 'bag') { setDel(src); return }
    const r = dropItem(game, src, target); if (r) toast(r.msg, r.color); else if (it && target && target !== 'outside') itemDrop(it); bump()
  })
  setDestroyHook((src) => { if (itemOf(src) && src.k !== 'bag') setDel(src) })
  const delItem = del ? itemOf(del) : null

  return (
    <div className={`root ${isOverlay ? 'overlay' : 'web'}`}>
      {!isOverlay && <WebBackdrop />}
      <div className="dock-left">
        {game.where !== 'field' && <Guard name="Town" onClose={() => act('leave')}><CityPanel s={game} onLeave={() => act('leave')} {...ax} /></Guard>}
        {open.has('char') && <Guard name="Character" onClose={() => close('char')}><CharacterPanel s={game} onClose={() => close('char')} {...ax} /></Guard>}
        {open.has('quests') && <Guard name="Quest Log" onClose={() => close('quests')}><QuestLog s={game} onClose={() => close('quests')} {...ax} /></Guard>}
        {open.has('spells') && <Guard name="Spellbook" onClose={() => close('spells')}><Spellbook s={game} onClose={() => close('spells')} bump={bump} /></Guard>}
        {open.has('talents') && <Guard name="Talents" onClose={() => close('talents')}><TalentsPanel s={game} onClose={() => close('talents')} {...ax} /></Guard>}
        {open.has('skills') && <Guard name="Skills" onClose={() => close('skills')}><SkillsPanel s={game} onClose={() => close('skills')} /></Guard>}
        {open.has('log') && <Guard name="Chronicle" onClose={() => close('log')}><LogPanel s={game} onClose={() => close('log')} /></Guard>}
        {open.has('settings') && (
          <Settings s={game} onClose={() => close('settings')} bump={bump}
            onReset={() => { wipeSave(); setOpen(new Set()); setGame(null) }}
            onImport={(g) => { saveGame(g); setGame(g) }} />
        )}
      </div>
      {open.has('map') && <div className="dock-center"><Guard name="World Map" onClose={() => close('map')}><MapPanel s={game} onClose={() => close('map')} bump={bump} /></Guard></div>}
      {open.has('bags') && <div className="dock-right"><Guard name="Bags" onClose={() => close('bags')}><BagsPanel s={game} onClose={() => close('bags')} {...ax} /></Guard></div>}
      {offline && <OfflineModal sum={offline} s={game} onClose={() => setOffline(null)} />}
      {del && delItem && (
        <div className="modal wframe destroy-modal" data-solid>
          <div className="wframe-head"><span className="wframe-title">Destroy item</span></div>
          <div className="modal-body">
            <p>Do you want to destroy <b style={{ color: RARITY_COLOR[delItem.rarity] }}>[{delItem.name}]</b>{(delItem.count ?? 1) > 1 ? ` ×${delItem.count}` : ''}?</p>
            <p className="dim small">It will be gone for good (no buyback).</p>
            <div className="tr-foot" style={{ justifyContent: 'center' }}>
              <button className="wbtn red" onClick={() => { const d0 = del; setDel(null); const it = destroyItem(game.hero, d0.k === 'inv' ? { k: 'inv', idx: d0.idx } : { k: 'eq', slot: (d0 as { slot: string }).slot as EquipSlot }); if (it) { syncQuests(game); stats(game.hero); toast(`Destroyed: ${it.name}`, '#ff8060'); uiSound('ui.sheath') } bump() }}>Destroy</button>
              <button className="wbtn" onClick={() => setDel(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts">{toasts.map((t) => <div key={t.id} className="toast" style={{ color: t.color }}>{t.text}</div>)}</div>
      <Strip s={game} sceneRef={sceneRef} open={open} toggle={toggle} act={act} />
      <DragGhost />
    </div>
  )
}

function OfflineModal({ sum, s, onClose }: { sum: OfflineSummary; s: GameState; onClose: () => void }) {
  const c = classById(s.hero.cls)
  return (
    <div className="modal wframe" data-solid>
      <div className="wframe-head"><span className="wframe-title">While you were away ({fmtTime(sum.seconds)})</span></div>
      <div className="modal-body">
        <div><span style={{ color: c.color }}>{s.hero.name}</span> kept busy{sum.simulated < sum.seconds ? ` (fighting simulated for ${fmtTime(sum.simulated)}, the rest became Rested XP)` : ''}.</div>
        <ul>
          <li>Kills: <b>{sum.kills}</b></li>
          <li>Experience: <b>+{sum.xp.toLocaleString('en-US')}</b>{sum.levels ? <> · <b style={{ color: '#ffd100' }}>+{sum.levels} levels</b> (now {s.hero.level})</> : ''}</li>
          <li>Money: <Money copper={sum.copper} /></li>
          {sum.bosses.length > 0 && <li style={{ color: '#ff9a40' }}>Bosses defeated: {sum.bosses.join(', ')}</li>}
          {sum.questsReady > 0 && <li style={{ color: '#ffd100' }}>Quests ready to turn in: {sum.questsReady}</li>}
          {sum.deaths > 0 && <li style={{ color: '#ff6060' }}>Deaths: {sum.deaths}</li>}
          {sum.lost > 0 && <li style={{ color: '#ff6060' }}>Loot lost (full bags): {sum.lost}</li>}
          {sum.restedGained > 0 && <li style={{ color: '#6f9fff' }}>Rested XP: +{sum.restedGained.toLocaleString('en-US')}</li>}
        </ul>
        {sum.items.length > 0 && (
          <div className="off-items">{sum.items.slice(-12).map((i) => <div key={i.id} style={{ color: RARITY_COLOR[i.rarity] }}>[{i.name}]</div>)}</div>
        )}
      </div>
      <button className="wbtn big" onClick={onClose}>Back to the game</button>
    </div>
  )
}

function WebBackdrop() {
  return (
    <div className="backdrop">
      <div className="backdrop-note">
        <b>Azeroth Idle — browser version (demo 0.9.20)</b>
        <span>In the desktop app the background is transparent and the bar sits above the Windows taskbar.</span>
        <span>Hotkeys: C character · B bags · L quests · P spellbook · N talents · K skills · M map · Esc closes windows</span>
      </div>
    </div>
  )
}
