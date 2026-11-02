import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { advance, newGame, simulateOffline } from '../game/sim'
import { loadGame, saveGame, wipeSave } from '../game/save'
import { enterCapital, enterTown, leaveTown } from '../game/town'
import type { GameEvent, GameState, OfflineSummary } from '../game/types'
import { RARITY_COLOR } from '../game/types'
import type { Scene } from '../render/scene'
import { CharacterCreate } from './CharacterCreate'
import { Strip, type PanelId } from './Strip'
import { DragGhost, setDropHandler } from './dnd'
import { gameSpeed } from '../game/admin'
import { dropItem } from './itemActions'
import { BagsPanel, CharacterPanel, CityPanel, LogPanel, QuestLog, Settings, Spellbook, TalentsPanel, fmtTime } from './Panels'
import { onLayout, uiScale } from './layout'
import { MapPanel } from './MapPanel'
import { Money } from './common'
import { isOverlay } from '../platform'
import { classById } from '../data/classes'
import { zoneById } from '../data/zones'

type Toast = { id: number; text: string; color: string }

export function App() {
  const [game, setGame] = useState<GameState | null>(() => loadGame())
  const [, bump] = useReducer((x: number) => x + 1, 0)
  const [open, setOpen] = useState<Set<PanelId>>(new Set())
  const [offline, setOffline] = useState<OfflineSummary | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const sceneRef = useRef<Scene | null>(null)
  const gameRef = useRef(game)
  gameRef.current = game

  const toast = useCallback((text: string, color = '#ffd100') => {
    const id = Math.random()
    setToasts((t) => [...t.slice(-3), { id, text, color }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  const toggle = useCallback((p: PanelId) => setOpen((o) => { const n = new Set(o); if (n.has(p)) n.delete(p); else n.add(p); return n }), [])
  const close = (p: PanelId) => setOpen((o) => { const n = new Set(o); n.delete(p); return n })

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
    let raf = 0
    const emit = (e: GameEvent) => {
      const s = gameRef.current!
      sceneRef.current?.onEvent(e, s)
      if (e.t === 'level') toast(`Poziom ${e.level}!${e.learnable ? ` Trener: ${e.learnable} do nauki` : ''}`)
      else if (e.t === 'loot' && e.item.rarity >= 3) toast(`${e.equipped ? 'Zakładasz' : 'Łup'}: [${e.item.name}]`, RARITY_COLOR[e.item.rarity])
      else if (e.t === 'cleared') toast(e.zoneBoss ? `${e.boss} pokonany! Nowa mapa odblokowana` : `${e.boss} pokonany!`, '#ff9a40')
      else if (e.t === 'zone') toast(`Wyruszasz: ${zoneById(e.zone).name}`, '#69ccf0')
      else if (e.t === 'death') toast(`${e.boss ? `${e.boss} cię pokonał!` : 'Zginąłeś!'}${e.reset ? ' Podstrefa od nowa.' : ''}`, '#ff4040')
      else if (e.t === 'questdone') toast(`Zadanie gotowe: ${e.quest.title}`, '#ffd100')
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
      const map: Record<string, PanelId> = { c: 'char', b: 'bags', m: 'map', l: 'quests', p: 'spells', n: 'talents' }
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

  const act = (a: 'town' | 'capital' | 'leave') => {
    if (a === 'town') { if (!enterTown(game)) toast(game.phase === 'travel' ? 'Jesteś w podróży.' : 'Ta mapa nie ma miasta.', '#ff4040'); else setOpen((o) => new Set([...o, 'bags'])) }
    else if (a === 'capital') { const e = enterCapital(game); if (e) toast(e, '#ff4040'); else setOpen((o) => new Set([...o, 'bags'])) }
    else if (a === 'leave') leaveTown(game)
    bump()
  }
  const ax = { bump, toast }
  setDropHandler((src, target) => { const r = dropItem(game, src, target); if (r) toast(r.msg, r.color); bump() })

  return (
    <div className={`root ${isOverlay ? 'overlay' : 'web'}`}>
      {!isOverlay && <WebBackdrop />}
      <div className="dock-left">
        {game.where !== 'field' && <CityPanel s={game} onLeave={() => act('leave')} {...ax} />}
        {open.has('char') && <CharacterPanel s={game} onClose={() => close('char')} {...ax} />}
        {open.has('quests') && <QuestLog s={game} onClose={() => close('quests')} {...ax} />}
        {open.has('spells') && <Spellbook s={game} onClose={() => close('spells')} bump={bump} />}
        {open.has('talents') && <TalentsPanel s={game} onClose={() => close('talents')} {...ax} />}
        {open.has('log') && <LogPanel s={game} onClose={() => close('log')} />}
        {open.has('settings') && (
          <Settings s={game} onClose={() => close('settings')} bump={bump}
            onReset={() => { wipeSave(); setOpen(new Set()); setGame(null) }}
            onImport={(g) => { saveGame(g); setGame(g) }} />
        )}
      </div>
      {open.has('map') && <div className="dock-center"><MapPanel s={game} onClose={() => close('map')} bump={bump} /></div>}
      {open.has('bags') && <div className="dock-right"><BagsPanel s={game} onClose={() => close('bags')} {...ax} /></div>}
      {offline && <OfflineModal sum={offline} s={game} onClose={() => setOffline(null)} />}
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
      <div className="wframe-head"><span className="wframe-title">Gdy cię nie było ({fmtTime(sum.seconds)})</span></div>
      <div className="modal-body">
        <div>Postać <span style={{ color: c.color }}>{s.hero.name}</span> nie próżnowała{sum.simulated < sum.seconds ? ` (walka liczona przez ${fmtTime(sum.simulated)}, reszta to Rested XP)` : ''}.</div>
        <ul>
          <li>Zabitych: <b>{sum.kills}</b></li>
          <li>Doświadczenie: <b>+{sum.xp.toLocaleString('pl-PL')}</b>{sum.levels ? <> · <b style={{ color: '#ffd100' }}>+{sum.levels} poz.</b> (teraz {s.hero.level})</> : ''}</li>
          <li>Pieniądze: <Money copper={sum.copper} /></li>
          {sum.bosses.length > 0 && <li style={{ color: '#ff9a40' }}>Pokonani bossowie: {sum.bosses.join(', ')}</li>}
          {sum.questsReady > 0 && <li style={{ color: '#ffd100' }}>Zadań gotowych do oddania: {sum.questsReady}</li>}
          {sum.deaths > 0 && <li style={{ color: '#ff6060' }}>Śmierci: {sum.deaths}</li>}
          {sum.lost > 0 && <li style={{ color: '#ff6060' }}>Przepadło łupów (pełne torby): {sum.lost}</li>}
          {sum.restedGained > 0 && <li style={{ color: '#6f9fff' }}>Rested XP: +{sum.restedGained.toLocaleString('pl-PL')}</li>}
        </ul>
        {sum.items.length > 0 && (
          <div className="off-items">{sum.items.slice(-12).map((i) => <div key={i.id} style={{ color: RARITY_COLOR[i.rarity] }}>[{i.name}]</div>)}</div>
        )}
      </div>
      <button className="wbtn big" onClick={onClose}>Wracam do gry</button>
    </div>
  )
}

function WebBackdrop() {
  return (
    <div className="backdrop">
      <div className="backdrop-note">
        <b>Azeroth Idle — wersja przeglądarkowa (demo 0.6)</b>
        <span>W aplikacji (Electron) tło jest przezroczyste, a pasek siedzi nad paskiem zadań Windows.</span>
        <span>Skróty: C postać · B torby · L zadania · P umiejętności · N talenty · M mapa · Esc zamyka okna</span>
      </div>
    </div>
  )
}
