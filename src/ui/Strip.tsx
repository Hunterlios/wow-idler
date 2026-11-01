import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type CSSProperties, type ReactNode } from 'react'
import { classById } from '../data/classes'
import { raceById } from '../data/races'
import { zoneById } from '../data/zones'
import { talentPoints, spentTotal } from '../data/talents'
import { xpToNext, MAX_LEVEL, grants, active, styleOf } from '../game/formulas'
import { stats, activePet, bossState, costOf, cdOf, learnableCount } from '../game/sim'
import { subOf, subsOf, townOf, capitalOf, zonePct } from '../game/world'
import { capacity, usedSlots } from '../game/inventory'
import { questReady } from '../game/quests'
import type { GameState } from '../game/types'
import { Scene } from '../render/scene'
import { abilityIcon, itemIcon, menuIcon } from '../render/icons'
import { Bar, Hover, Money } from './common'
import { layout, saveLayout, startDrag, uiScale } from './layout'
import { beginItemDrag } from './dnd'
import { isOverlay, native } from '../platform'

export type PanelId = 'char' | 'bags' | 'map' | 'log' | 'settings' | 'quests' | 'spells' | 'talents'

const RES_COLOR = { mana: 'linear-gradient(#3a7aff,#0a2aa0)', rage: 'linear-gradient(#ff3a3a,#900a0a)', energy: 'linear-gradient(#ffe24a,#b09000)' }
const CONTROL_COLOR = { alliance: '#4f86ff', horde: '#ff4a3a', contested: '#ffd100' }
const Tip = ({ title, children }: { title: string; children?: ReactNode }) => <div className="tooltip-body"><div className="tt-name">{title}</div>{children}</div>

export function Strip({ s, sceneRef, open, toggle, act }: {
  s: GameState; sceneRef: React.MutableRefObject<Scene | null>; open: Set<PanelId>; toggle: (p: PanelId) => void
  act: (a: 'town' | 'capital' | 'leave') => void
}) {
  const h = s.hero
  const c = classById(h.cls)
  const r = raceById(h.race)
  const d = stats(h)
  const z = zoneById(s.loc.zone)
  const sub = subOf(s)
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [pos, setPos] = useState(layout().strip)
  const posRef = useRef(pos)
  posRef.current = pos

  useEffect(() => {
    const el = wrap.current!
    const scene = new Scene(canvas.current!)
    sceneRef.current = scene
    scene.resize(el.clientWidth, el.clientHeight)
    const ro = new ResizeObserver(() => scene.resize(el.clientWidth, el.clientHeight))
    ro.observe(el)
    return () => { ro.disconnect(); if (sceneRef.current === scene) sceneRef.current = null }
  }, [sceneRef])
  useEffect(() => setPos(layout().strip), [layout().strip.w])

  const need = xpToNext(h.level)
  const b = bossState(s)
  const town = townOf(z, h.faction)
  const inTown = s.where !== 'field'
  const phaseText =
    s.phase === 'fight' && s.mob && s.mob.dist > 0 ? `${s.mob.name}${s.mob.count > 1 ? ` ×${s.mob.count}` : ''} (${s.mob.lvl}) nadchodzi...`
    : s.phase === 'town' ? (s.where === 'capital' ? `W stolicy: ${capitalOf(s)}` : `W mieście: ${town}`)
    : s.phase === 'fight' && s.mob ? `Walka: ${s.mob.name}${s.mob.count > 1 ? ` ×${s.mob.count}` : ''} (${s.mob.lvl})`
    : s.phase === 'rest' ? (h.eating && (h.eating.hp || h.eating.mana) && h.eating.left > 0 ? (h.eating.hp && h.eating.mana ? 'Je i pije...' : h.eating.mana ? 'Pije...' : 'Je...') : 'Odpoczywa (brak jedzenia)...')
    : s.phase === 'fight' && s.mob && s.mob.dist > 0 ? `${s.mob.name} nadchodzi...`
    : s.phase === 'dead' ? 'Duch'
    : s.phase === 'travel' ? `${s.trip?.form ? `${s.trip.form} · ` : ''}${s.trip?.to ?? sub.name} · ${Math.ceil(s.phaseT)} s`
    : 'Szuka celu...'
  const cast = h.casting
  const pet = activePet(h)
  const g = grants(h)
  const bar = c.abilities.filter((a) => active(h, a, g) && a.kind !== 'form' && a.kind !== 'summon' && a.id !== 'totemic_projection')
  const learnable = learnableCount(h)
  const freeTalents = talentPoints(h.level) - spentTotal(h.talents)
  const readyQuests = s.quests.filter(questReady).length
  const subs = subsOf(s.loc.zone)

  // pozycja paska (przesuwany za uchwyt)
  const W = pos.w === 'full' ? null : pos.w
  const style: CSSProperties = pos.x == null && W == null ? {} : {
    left: pos.x ?? `calc(50% - ${(W ?? 0) / 2}px)`, right: 'auto', width: W ?? '100%',
    ...(pos.y != null ? { top: pos.y, bottom: 'auto' } : {}),
  }
  const grip = (e: RPointerEvent) => {
    const el = (e.currentTarget as HTMLElement).closest('.strip') as HTMLElement
    const rect = el.getBoundingClientRect()
    const k = uiScale()
    const bx = rect.left / k, by = rect.top / k
    const w = rect.width / k, hgt = rect.height / k
    const maxX = Math.max(0, window.innerWidth / k - w), maxY = Math.max(0, window.innerHeight / k - hgt)
    startDrag(e, (dx, dy) => setPos({ ...posRef.current, x: Math.min(maxX, Math.max(0, bx + dx / k)), y: Math.min(maxY, Math.max(0, by + dy / k)), w: posRef.current.w === 'full' ? Math.round(w) : posRef.current.w }),
      () => saveLayout({ strip: posRef.current }))
  }

  return (
    <div className="strip" data-solid style={style}>
      <div className="xp">
        <div className="grip" onPointerDown={grip} onDoubleClick={() => { const p = { x: null, y: null, w: 'full' as const }; setPos(p); saveLayout({ strip: p }) }}>⠿</div>
        {h.level < MAX_LEVEL ? (
          <Bar value={h.xp} max={need} color="linear-gradient(#b04ae0,#5a0a8a)" extra={h.rested} extraColor="#2f6fff" height={11}
            label={`XP ${Math.floor(h.xp).toLocaleString('pl-PL')} / ${need.toLocaleString('pl-PL')}${h.rested > 1 ? ` · Rested ${Math.floor(h.rested).toLocaleString('pl-PL')}` : ''}`} />
        ) : <Bar value={1} max={1} color="linear-gradient(#806020,#4a3410)" label="Poziom 60" height={11} />}
        <div className="xp-ticks">{Array.from({ length: 19 }, (_, i) => <i key={i} />)}</div>
      </div>

      <div className="unit">
        <div className="portrait-ring">
          <div className="pface" style={{ background: `radial-gradient(circle at 40% 35%, ${r.look.skin}, #000 120%)` }}>
            <span style={{ color: c.color }}>{c.name[0]}</span>
          </div>
          <div className="plevel">{h.level}</div>
          {h.rested > 1 && <div className="prested">zZ</div>}
        </div>
        <div className="unit-bars">
          <div className="unit-name"><span className="nm">{h.name}</span> <span style={{ color: c.color }}>{c.name}</span></div>
          <Bar value={h.hp} max={d.maxHp} color="linear-gradient(#22d822,#086808)" label={`${Math.ceil(Math.max(0, h.hp))} / ${d.maxHp}`} height={14} />
          <Bar value={h.res} max={d.maxRes} color={RES_COLOR[d.res]} label={d.res === 'mana' ? `${Math.floor(h.res)} / ${d.maxRes}` : `${Math.floor(h.res)}`} height={11} />
          {cast ? (
            <Bar className="castbar" value={cast.total - cast.left} max={cast.total} color="linear-gradient(#ffd24a,#b08000)" label={c.abilities.find((a) => a.id === cast.id)?.name} height={10} />
          ) : null}
          {!cast && (
            <div className="phase">{phaseText}{h.cp > 0 && <span className="cp">{'●'.repeat(h.cp)}</span>}{(h.stacks.mw ?? 0) > 0 && <span className="cp mw">{'◆'.repeat(h.stacks.mw)}</span>}{(h.stacks.ab ?? 0) > 0 && <span className="cp ab">{'✦'.repeat(h.stacks.ab)}</span>}{pet && <span className="pet"> · {pet.name}</span>}{h.wellFed && <span className="wellfed" title={`${h.wellFed.name}: Well Fed`}> · 🍖</span>}</div>
          )}
          {s.phase === 'fight' && s.mob && styleOf(h) !== 'caster' && (styleOf(h) === 'ranged' || s.mob.dist <= 0) && (
            <Bar className="swingbar" value={Math.max(0, d.weaponSpeed - Math.max(0, h.swing))} max={d.weaponSpeed} color="linear-gradient(#e0e0e0,#808080)" height={4} />
          )}
        </div>
      </div>

      <div className="scene" ref={wrap}><canvas ref={canvas} /></div>

      <div className="side">
        <div className="zone-name" style={{ color: CONTROL_COLOR[z.control] }}>{z.name} <span className="zr">({z.min}-{z.max})</span></div>
        <div className="sub-name">{sub.name} <span className="zr">{s.loc.sub + 1}/{subs.length}</span></div>
        {b.frontier ? (
          <Hover className="prog" anchor="above" tip={<Tip title={`${sub.zoneBoss ? 'Boss mapy' : 'Miniboss'}: ${sub.boss.name} (${b.lvl})`}>
            <div>Pokonaj {b.need} wrogów w tej podstrefie, a potem bossa. Śmierć zeruje postęp podstrefy.</div>
            {sub.zoneBoss && <div className="tt-dim">Blokuje przejście do następnej mapy.</div>}
          </Tip>}>
            <Bar value={b.kills} max={b.need} color={b.full ? 'linear-gradient(#ff8a2a,#a03000)' : 'linear-gradient(#e0b030,#7a5a00)'} height={13}
              label={b.full ? `Boss: ${sub.boss.name}!` : `${b.kills}/${b.need} · boss: ${sub.boss.name}`} />
          </Hover>
        ) : (
          <Bar value={1} max={1} color="linear-gradient(#3a8a3a,#1a4a1a)" height={13} label={s.prog[s.loc.zone].cleared >= subs.length ? 'Mapa ukończona' : 'Podstrefa oczyszczona (farmienie)'} />
        )}
        <div className="zone-pct"><Bar value={zonePct(s, s.loc.zone)} max={1} color="linear-gradient(#5aa0ff,#1a3a8a)" height={6} /><span>{Math.round(zonePct(s, s.loc.zone) * 100)}% mapy</span></div>
        <div className="town-btns">
          {inTown ? <button className="wbtn" onClick={() => act('leave')}>Wyjdź z miasta</button> : (
            <>
              {town && <Hover anchor="above" tip={<Tip title={town}>Zadania i trener tej mapy.</Tip>}><button className="wbtn" onClick={() => act('town')}>⌂ {town}</button></Hover>}
              <Hover anchor="above" tip={<Tip title={capitalOf(s)}>Stolica: trener, kupiec, torby.</Tip>}><button className="wbtn" onClick={() => act('capital')}>♜ {capitalOf(s)}</button></Hover>
            </>
          )}
        </div>
      </div>

      <div className="actionbar">
        {bar.map((a, i) => {
          const tot = h.totems.find((t) => t.id === a.id)
          const cd = tot ? Math.min(1, tot.left / 300) : h.cds[a.id] > 0 && a.cd ? Math.min(1, h.cds[a.id] / cdOf(a, d)) : 0
          const passive = a.kind === 'buff' || a.kind === 'proc'
          const oom = !passive && a.kind !== 'lifetap' && h.res < costOf(h, a, d)
          const on = (h.temp[a.id] ?? 0) > 0 || h.totems.some((t) => t.id === a.id)
          return (
            <Hover key={a.id} anchor="above" className={`abtn ${passive ? 'passive' : ''} ${oom ? 'oom' : ''} ${cast?.id === a.id || on ? 'casting' : ''}`}
              tip={<Tip title={a.name}><div className="tt-dim">{a.cost ? `${costOf(h, a, d)} ${d.res === 'mana' ? 'Mana' : d.res === 'rage' ? 'Rage' : 'Energy'}` : passive ? 'Pasywna' : 'Bez kosztu'}{a.cd ? ` · CD ${cdOf(a, d)} s` : ''}{tot ? ` · totem stoi jeszcze ${Math.ceil(tot.left)} s` : ''}{a.cast ? ` · ${a.cast} s` : ' · natychmiast'}</div><div>{a.desc}</div><div className="tt-dim">Wyłączysz ją w księdze umiejętności (P).</div></Tip>}>
              <img src={abilityIcon(a, h.cls)} alt="" draggable={false} />
              {cd > 0 && <div className="cd" style={{ background: `conic-gradient(rgba(0,0,0,.7) ${cd * 360}deg, transparent 0)` }} />}
            </Hover>
          )
        })}
      </div>

      <div className="micro">
        <MicroBtn icon={menuIcon('char')} label="Postać (C)" on={open.has('char')} onClick={() => toggle('char')} />
        <MicroBtn icon={menuIcon('spell')} label={`Umiejętności (P)${learnable ? ` · ${learnable} do nauki u trenera` : ''}`} on={open.has('spells')} onClick={() => toggle('spells')} badge={learnable || undefined} />
        <MicroBtn icon={menuIcon('gear')} label={`Talenty (N)${freeTalents > 0 ? ` · ${freeTalents} wolnych punktów` : ''}`} on={open.has('talents')} onClick={() => toggle('talents')} badge={freeTalents > 0 ? freeTalents : undefined} text="✦" />
        <MicroBtn icon={menuIcon('quest')} label="Dziennik zadań (L)" on={open.has('quests')} onClick={() => toggle('quests')} badge={readyQuests || undefined} />
        <MicroBtn icon={menuIcon('map')} label="Mapa (M)" on={open.has('map')} onClick={() => toggle('map')} />
        <MicroBtn icon={menuIcon('log')} label="Kronika" on={open.has('log')} onClick={() => toggle('log')} />
        <MicroBtn icon={menuIcon('gear')} label="Ustawienia" on={open.has('settings')} onClick={() => toggle('settings')} />
        {isOverlay && <MicroBtn icon={menuIcon('gear')} label="Schowaj do zasobnika" onClick={() => native?.hide()} text="–" />}
      </div>

      <div className="bagbar">
        <span className="bb-money"><Money copper={h.copper} /></span>
        {[3, 2, 1, 0].map((i) => {
          const bag = h.bags[i]
          return (
            <Hover key={i} anchor="above" className={`bagslot ${bag ? '' : 'empty'}`} onClick={() => toggle('bags')} drop={`bag:${i}`}
              onPointerDown={bag ? (e) => beginItemDrag(e, { k: 'bag', i }, itemIcon(bag)) : undefined}
              tip={bag ? <Tip title={bag.name}><div>{bag.bagSize} Slot Bag</div><div className="tt-dim">Przeciągnij na wolne miejsce w innej torbie, żeby ją zdjąć. Upuść tu przedmiot, żeby go do niej włożyć.</div></Tip> : <Tip title="Pusty slot na torbę"><div className="tt-dim">Przeciągnij tu torbę z plecaka. Torby kupisz u kupca w stolicy.</div></Tip>}>
              {bag && <img src={itemIcon(bag)} alt="" draggable={false} />}
            </Hover>
          )
        })}
        <Hover anchor="above" className={`bagslot backpack ${open.has('bags') ? 'on' : ''}`} onClick={() => toggle('bags')} drop="bag:-1"
          tip={<Tip title="Backpack (B)"><div>{usedSlots(h)}/{capacity(h)} zajętych</div></Tip>}>
          <img src={itemIcon({ id: -1, name: 'Backpack', rarity: 1, ilvl: 1, value: 0, bagSize: 16 })} alt="" draggable={false} />
          <span className={`bb-free ${capacity(h) - usedSlots(h) === 0 ? 'full' : ''}`}>{capacity(h) - usedSlots(h)}</span>
        </Hover>
      </div>
    </div>
  )
}

function MicroBtn({ icon, label, on, onClick, badge, text }: { icon: string; label: string; on?: boolean; onClick: () => void; badge?: number; text?: string }) {
  return (
    <Hover anchor="above" className={`mbtn ${on ? 'on' : ''}`} onClick={onClick} tip={<div className="tooltip-body"><div>{label}</div></div>}>
      {text ? <span className="mtext">{text}</span> : <img src={icon} alt="" draggable={false} />}
      {badge ? <span className="mbadge">{badge}</span> : null}
    </Hover>
  )
}
