import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { layout, saveLayout, startDrag } from './layout'
import { classById } from '../data/classes'
import { formatMoney } from '../game/formulas'
import { newGame } from '../game/sim'
import { Scene } from '../render/scene'
import { itemIcon } from '../render/icons'
import { RARITY_COLOR, RARITY_PL, SLOT_PL, type Item, type Hero, type EquipSlot } from '../game/types'
import type { RaceId } from '../data/races'
import type { ClassId } from '../data/classes'
import { canWear, displacedScore, itemScore, learnableWeapon, maxDur, curDur, isBroken } from '../game/items'
import { beginItemDrag, type DragSrc } from './dnd'
import type { Stats } from '../data/races'

export function Money({ copper, className }: { copper: number; className?: string }) {
  const { g, s, c } = formatMoney(copper)
  return (
    <span className={`money ${className ?? ''}`}>
      {g > 0 && <span className="coin g">{g}</span>}
      {(s > 0 || (g > 0 && c > 0)) && <span className="coin s">{s}</span>}
      {(c > 0 || (g === 0 && s === 0)) && <span className="coin c">{c}</span>}
    </span>
  )
}

export function Bar({ value, max, color, label, height = 12, extra, extraColor, className }: { value: number; max: number; color: string; label?: ReactNode; height?: number; extra?: number; extraColor?: string; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const ex = extra && max > 0 ? Math.max(0, Math.min(1 - pct, extra / max)) : 0
  return (
    <div className={`bar ${className ?? ''}`} style={{ height }}>
      <div className="bar-fill" style={{ width: `${pct * 100}%`, background: color }} />
      {ex > 0 && <div className="bar-fill" style={{ left: `${pct * 100}%`, width: `${ex * 100}%`, background: extraColor, opacity: 0.6 }} />}
      <div className="bar-gloss" />
      {label != null && <div className="bar-label">{label}</div>}
    </div>
  )
}

const STAT_PL: Record<string, string> = { str: 'Strength', agi: 'Agility', sta: 'Stamina', int: 'Intellect', spi: 'Spirit' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function TipBody({ item, hero, hint, header, diff }: { item: Item; hero?: Hero; hint?: string; header?: string; diff?: [string, number][] }) {
  const wearable = hero && item.slot ? canWear(hero, item) : true
  return (
    <div className="tooltip-body">
      {header && <div className="tt-header">{header}</div>}
      <div className="tt-name" style={{ color: RARITY_COLOR[item.rarity] }}>{item.name}</div>
      {item.quest && <div>Quest Item</div>}
      {item.bagSize ? <div>{item.bagSize} Slot Bag</div> : item.slot ? (
        <div className="tt-row"><span>{SLOT_PL[item.slot]}</span><span style={{ color: wearable ? undefined : '#ff2020' }}>{item.weaponType ?? cap(item.armorType ?? '')}</span></div>
      ) : null}
      {hero && learnableWeapon(hero, item) && <div style={{ color: '#ff2020' }}>You don't know this weapon type — learn it from a Weapon Master in a capital city.</div>}
      {item.kit && <div className="tt-use">Use: your character repairs one broken item (up to item level {item.kit}) between fights.</div>}
      {item.food && (
        <>
          {item.food.lvl > 1 && <div style={{ color: hero && hero.level < item.food.lvl ? '#ff2020' : undefined }}>Requires Level {item.food.lvl}</div>}
          <div className="tt-use">{item.food.kind === 'buff' ? `Use: ${item.food.buff!.name} — ${item.food.buff!.text} for 15 min. Only one at a time.` : item.food.kind === 'food' ? `Use: restores ${item.food.amt} health while resting.` : `Use: restores ${item.food.amt} mana while resting.`}</div>
          {item.food.kind !== 'buff' && <div className="tt-dim">Your character eats and drinks this automatically while resting.</div>}
        </>
      )}
      {item.dps != null && (
        <>
          <div className="tt-row"><span>{Math.round(item.dps * (item.speed ?? 2) * 0.8)} - {Math.round(item.dps * (item.speed ?? 2) * 1.2)} Damage</span><span>Speed {item.speed?.toFixed(2)}</span></div>
          <div>({item.dps.toFixed(1)} damage per second)</div>
        </>
      )}
      {item.armor != null && <div>{item.armor} Armor</div>}
      {Object.entries(item.stats ?? {}).map(([k, v]) => <div key={k}>+{v} {STAT_PL[k]}</div>)}
      {maxDur(item) > 0 && <div style={{ color: isBroken(item) ? '#ff2020' : curDur(item) / maxDur(item) < 0.25 ? '#ffd100' : undefined }}>Durability {curDur(item)} / {maxDur(item)}</div>}
      {isBroken(item) && <div style={{ color: '#ff2020' }}>Broken: gives no bonuses. Repair it at a vendor or with a repair kit.</div>}
      {item.sp ? <div className="tt-equip">Equip: Increases damage and healing done by magical spells and effects by up to {item.sp}.</div> : null}
      {!item.slot && !item.bagSize && !item.food && !item.quest && !item.kit && <div className="tt-dim">Junk to sell to a vendor.</div>}
      {item.slot && item.rarity > 0 && <div className="tt-dim">Item Level {item.ilvl}</div>}
      {diff && diff.length > 0 && (
        <div className="tt-diff">
          <div className="tt-dim">If equipped:</div>
          {diff.map(([k, v]) => <div key={k} style={{ color: v > 0 ? '#40ff40' : '#ff5050' }}>{v > 0 ? '+' : ''}{k === 'dps' ? v.toFixed(1) : Math.round(v)} {k === 'dps' ? 'DPS' : k === 'armor' ? 'Armor' : k === 'sp' ? 'Spell Power' : STAT_PL[k]}</div>)}
        </div>
      )}
      {item.quest ? <div className="tt-dim">Counts towards the quest while it is in your bags.</div> : <div className="tt-row tt-sell"><span>Sell Price{(item.count ?? 1) > 1 ? ` (×${item.count})` : ''}:</span><Money copper={item.value * (item.count ?? 1)} /></div>}
      <div className="tt-dim small">{RARITY_PL[item.rarity]}{hint ? ` · ${hint}` : ''}</div>
    </div>
  )
}

// Przedmioty, które dany przedmiot by zastąpił
export function displacedItems(hero: Hero, item: Item): Item[] {
  if (!item.slot) return []
  const e = hero.equip
  if (item.slot === 'finger') return [e.finger1, e.finger2].filter(Boolean) as Item[]
  if (item.slot === 'trinket') return [e.trinket1, e.trinket2].filter(Boolean) as Item[]
  if (item.slot === 'twohand') return [e.mainhand, e.offhand].filter(Boolean) as Item[]
  if (item.slot === 'mainhand') return [e.mainhand].filter(Boolean) as Item[]
  if (item.slot === 'offhand') return [e.offhand].filter(Boolean) as Item[]
  return [e[item.slot as EquipSlot]].filter(Boolean) as Item[]
}

function statDiff(item: Item, olds: Item[]): [string, number][] {
  const keys: (keyof Stats | 'armor' | 'dps' | 'sp')[] = ['str', 'agi', 'sta', 'int', 'spi', 'sp', 'armor', 'dps']
  const val = (it: Item | undefined, k: string) => (k === 'armor' ? it?.armor ?? 0 : k === 'dps' ? it?.dps ?? 0 : k === 'sp' ? it?.sp ?? 0 : (it?.stats?.[k as keyof Stats] ?? 0))
  // dla pierścieni / błyskotek porównanie ze słabszym z dwóch
  const old = olds.length === 2 && (item.slot === 'finger' || item.slot === 'trinket') ? [olds[1]] : olds
  return keys.map((k) => [k, val(item, k) - old.reduce((a, o) => a + val(o, k), 0)] as [string, number]).filter(([, v]) => Math.abs(v) > 0.05)
}

export function ItemTooltip({ item, hero, hint, compare = true }: { item: Item; hero?: Hero; hint?: string; compare?: boolean }) {
  const equipped = hero && Object.values(hero.equip).some((x) => x?.id === item.id)
  const olds = hero && compare && !equipped ? displacedItems(hero, item) : []
  const better = hero && item.slot && !equipped ? itemScore(hero, item) - displacedScore(hero, item) : 0
  const wearable = hero && item.slot ? canWear(hero, item) : true
  const verdict = hero && item.slot && !equipped && item.slot !== 'shirt' && wearable ? (better > 0 ? '▲ better for your class' : '▼ worse than equipped') : undefined
  return (
    <div className="tt-compare">
      <div>
        <TipBody item={item} hero={hero} hint={hint} diff={hero && item.slot && !equipped && wearable ? statDiff(item, olds) : undefined} />
        {verdict && <div className="tt-verdict" style={{ color: better > 0 ? '#40ff40' : '#ff6060' }}>{verdict}</div>}
      </div>
      {olds.map((o) => <TipBody key={o.id} item={o} hero={hero} header="Currently equipped" />)}
    </div>
  )
}

// Tooltip: podąża za kursorem albo (anchor="above") wisi nad elementem jak w grze
export function Hover({ tip, children, className, style, onClick, onContextMenu, anchor, onPointerDown, drop }: { tip: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void; onContextMenu?: () => void; anchor?: 'above'; onPointerDown?: (e: any) => void; drop?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; r?: DOMRect } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [tw, setTw] = useState({ w: 280, h: 100 })
  useEffect(() => { if (pos && tipRef.current) { const b = tipRef.current.getBoundingClientRect(); if (Math.abs(b.width - tw.w) > 2 || Math.abs(b.height - tw.h) > 2) setTw({ w: b.width, h: b.height }) } })
  let left = 0, top = 0
  if (pos) {
    const W = window.innerWidth, H = window.innerHeight
    if (anchor === 'above' && pos.r) {
      left = Math.min(Math.max(4, pos.r.left + pos.r.width / 2 - tw.w / 2), W - tw.w - 4)
      top = Math.max(4, pos.r.top - tw.h - 8)
    } else {
      left = Math.max(4, Math.min(pos.x + 16, W - tw.w - 6))
      top = pos.y > H / 2 ? Math.max(4, pos.y - tw.h - 10) : Math.min(H - tw.h - 4, pos.y + 22)
    }
  }
  return (
    <div ref={ref} className={className} style={style} data-drop={drop} onPointerDown={onPointerDown}
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY, r: ref.current?.getBoundingClientRect() })}
      onMouseMove={(e) => { if (anchor !== 'above') setPos({ x: e.clientX, y: e.clientY }) }}
      onMouseLeave={() => setPos(null)}
      onClick={onClick} onContextMenu={(e) => { if (onContextMenu) { e.preventDefault(); onContextMenu() } }}>
      {children}
      {pos && tip && createPortal(<div ref={tipRef} className="tooltip" style={{ left, top }}>{tip}</div>, document.body)}
    </div>
  )
}

// Slot z ikoną przedmiotu (torby, okno postaci). drag = źródło przeciągania, drop = cel upuszczenia,
// onRight = prawy przycisk (załóż / zdejmij / sprzedaj / użyj)
export function ItemSlotBox({ item, hero, empty, onClick, onRight, hint, size = 38, drag, drop, dim }: { item?: Item | null; hero?: Hero; empty?: string; onClick?: () => void; onRight?: () => void; hint?: string; size?: number; drag?: DragSrc; drop?: string; dim?: boolean }) {
  const unusable = item && hero && item.slot && !canWear(hero, item)
  const md = item ? maxDur(item) : 0
  const wear = item && md ? curDur(item) / md : 1
  return (
    <Hover className={`islot ${item ? `q${item.rarity}` : 'empty'} ${unusable ? 'unusable' : ''} ${dim ? 'dim' : ''} ${item && md && wear === 0 ? 'broken' : wear < 0.25 ? 'worn' : ''}`} style={{ width: size, height: size }} onClick={onClick} onContextMenu={onRight ?? onClick} drop={drop}
      onPointerDown={item && drag ? (e) => beginItemDrag(e, drag, itemIcon(item)) : undefined}
      tip={item ? <ItemTooltip item={item} hero={hero} hint={hint} /> : empty ? <div className="tooltip-body"><div className="tt-dim">{empty}</div></div> : null}>
      {item ? <img src={itemIcon(item)} alt="" draggable={false} /> : empty ? <span className="islot-empty">{empty.slice(0, 1)}</span> : null}
      {item?.bagSize ? <span className="islot-count">{item.bagSize}</span> : (item?.count ?? 1) > 1 ? <span className="islot-count">{item!.count}</span> : null}
    </Hover>
  )
}

// Podgląd postaci: ta sama scena co w grze, tło strefy startowej
export function Portrait({ race, cls, width = 220, height = 120, level }: { race: RaceId; cls: ClassId; width?: number; height?: number; level?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const scene = new Scene(ref.current!)
    scene.resize(width, height)
    scene.zoom = Math.max(3, Math.round(height / 30))
    const s = newGame('', race, cls, 1)
    if (level) s.hero.level = level
    s.phase = 'fight'
    s.log = []
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      scene.draw(s, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [race, cls, width, height, level])
  return <canvas ref={ref} className="portrait" />
}

export const classColor = (id: ClassId) => classById(id).color

// Okno nie może uciec poza ekran: przynajmniej pasek tytułu musi zostać widoczny
export function keepOnScreen(el: HTMLElement | null, off: { dx: number; dy: number }, zoom = 1) {
  if (!el) return off
  const r = el.getBoundingClientRect()
  const W = window.innerWidth, H = window.innerHeight
  let { dx, dy } = off
  // całe okno na ekranie (jeśli się mieści), w poziomie i w pionie
  if (r.right > W) dx -= (r.right - W) / zoom
  if (r.left - (r.right > W ? r.right - W : 0) < 0) dx += (0 - (r.left - Math.max(0, r.right - W))) / zoom
  if (r.bottom > H) dy -= Math.min(r.bottom - H, Math.max(0, r.top)) / zoom
  if (r.top < 0) dy -= r.top / zoom
  return Math.abs(dx - off.dx) > 0.5 || Math.abs(dy - off.dy) > 0.5 ? { dx, dy } : off
}

// Okno w stylu Classica; przeciągane za pasek tytułu (dwuklik przywraca miejsce)
// Okno na wierzchu: kliknięte / przeciągane okno (i jego dok) idzie nad pasek gry i nad inne okna
let TOP_Z = 40
export function bringToFront(el: HTMLElement | null) {
  if (!el) return
  TOP_Z += 1
  el.style.zIndex = String(TOP_Z)
  const dock = el.closest('.dock-left, .dock-center, .dock-right') as HTMLElement | null
  if (dock) dock.style.zIndex = String(TOP_Z)
}
export function Frame({ id, title, onClose, children, className, icon, style }: { id?: string; title: ReactNode; onClose?: () => void; children: ReactNode; className?: string; icon?: string; style?: React.CSSProperties }) {
  const saved = id ? layout().frames[id] : undefined
  const [off, setOff] = useState(saved ?? { dx: 0, dy: 0 })
  const offRef = useRef(off)
  offRef.current = off
  const zoom = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui') || '1') || 1
  const box = useRef<HTMLDivElement>(null)
  // po otwarciu, zmianie rozmiaru okna i po przeciągnięciu: wróć na ekran, jeśli uciekło
  useEffect(() => {
    const fix = () => { const n = keepOnScreen(box.current, offRef.current, zoom()); if (n !== offRef.current) { setOff(n); if (id) saveLayout({ frames: { ...layout().frames, [id]: n } }) } }
    fix()
    window.addEventListener('resize', fix)
    return () => window.removeEventListener('resize', fix)
  }, [])
  return (
    <div ref={box} className={`wframe ${className ?? ''}`} data-solid style={{ ...style, transform: `translate(${off.dx}px, ${off.dy}px)` }} onPointerDownCapture={() => bringToFront(box.current)}>
      <div className="wframe-head" onDoubleClick={() => { if (id) { setOff({ dx: 0, dy: 0 }); saveLayout({ frames: { ...layout().frames, [id]: { dx: 0, dy: 0 } } }) } }}
        onPointerDown={(e) => {
          if (!id || (e.target as HTMLElement).closest('button')) return
          const base = offRef.current
          startDrag(e, (dx, dy) => setOff({ dx: base.dx + dx / zoom(), dy: base.dy + dy / zoom() }), () => { const n = keepOnScreen(box.current, offRef.current, zoom()); setOff(n); offRef.current = n; saveLayout({ frames: { ...layout().frames, [id]: n } }) })
        }} style={{ cursor: id ? 'move' : undefined }}>
        {icon && <img className="wframe-icon" src={icon} alt="" draggable={false} />}
        <span className="wframe-title">{title}</span>
        {onClose && <button className="wclose" onClick={onClose}>✕</button>}
      </div>
      <div className="wframe-body">{children}</div>
    </div>
  )
}
