import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type CSSProperties, type ReactNode } from 'react'
import { classById } from '../data/classes'
import { raceById, RACIAL_ACTIVE } from '../data/races'
import { zoneById } from '../data/zones'
import { talentPoints, spentTotal } from '../data/talents'
import { xpToNext, MAX_LEVEL, grants, active, knows, styleOf } from '../game/formulas'
import { challengeBoss, stats, activePet, petDef, petMaxHp, canTurnBack, tripPosition, turnBack, bossState, costOf, cdOf, learnableCount, abilityInfo, autoAttacking, SPIRIT_DUR, heroInMelee, swingSpeed } from '../game/sim'
import { subOf, subsOf, townOf, capitalOf, capitalZone, capitalHere, homeOf, zonePct, hasHearth, zoneOfCapital } from '../game/world'
import { capacity, usedSlots } from '../game/inventory'
import { questReady } from '../game/quests'
import type { GameState } from '../game/types'
import { Scene, type MobAura } from '../render/scene'
import { createPortal } from 'react-dom'
import { abilityIcon, itemIcon, menuIcon, racialIcon, raceIcon, classIcon } from '../render/icons'
import { firstIcon } from '../render/assets'
const wellFedIcon = () => firstIcon(['spell_misc_food'])
import { Bar, Hover, Money } from './common'
import { layout, saveLayout, startDrag, uiScale, onLayout, BAR_W } from './layout'
import { beginItemDrag } from './dnd'
import { isOverlay, native } from '../platform'

export type PanelId = 'char' | 'bags' | 'map' | 'log' | 'settings' | 'quests' | 'spells' | 'talents' | 'skills'

const RES_COLOR = { mana: 'linear-gradient(#3a7aff,#0a2aa0)', rage: 'linear-gradient(#ff3a3a,#900a0a)', energy: 'linear-gradient(#ffe24a,#b09000)' }
const CONTROL_COLOR = { alliance: '#4f86ff', horde: '#ff4a3a', contested: '#ffd100' }
const Tip = ({ title, children }: { title: string; children?: ReactNode }) => <div className="tooltip-body"><div className="tt-name">{title}</div>{children}</div>

export function Strip({ s, sceneRef, open, toggle, act }: {
  s: GameState; sceneRef: React.MutableRefObject<Scene | null>; open: Set<PanelId>; toggle: (p: PanelId) => void
  act: (a: 'town' | 'capital' | 'leave' | 'spirit') => void
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
  // pasek zawsze na ekranie (zmiana monitora / rozdzielczości) + przeniesienie z innego monitora
  useEffect(() => {
    const clamp = () => {
      const p = posRef.current
      if (p.x == null && p.y == null) return
      const k = uiScale()
      const el = wrap.current?.closest('.strip') as HTMLElement | null
      const w = (el?.getBoundingClientRect().width ?? 600) / k, hgt = (el?.getBoundingClientRect().height ?? 200) / k
      const n = { ...p, x: p.x == null ? null : Math.min(Math.max(0, window.innerWidth / k - w), Math.max(0, p.x)), y: p.y == null ? null : Math.min(Math.max(0, window.innerHeight / k - hgt), Math.max(0, p.y)) }
      if (n.x !== p.x || n.y !== p.y) { setPos(n); saveLayout({ strip: n }) }
    }
    clamp()
    window.addEventListener('resize', clamp)
    const offL = onLayout(() => requestAnimationFrame(clamp))
    native?.onPlace?.((pt) => { const k = uiScale(); const n = { ...posRef.current, x: Math.max(0, pt.x / k - 30), y: Math.max(0, pt.y / k - 10) }; setPos(n); saveLayout({ strip: n }); setTimeout(clamp, 300) })
    native?.onReset?.(() => { saveLayout({ strip: { x: null, y: null, w: 'full' }, frames: {} }); location.reload() })
    return () => { window.removeEventListener('resize', clamp); offL() }
  }, [])

  // Tooltip wroga po najechaniu (jak w grze: nazwa, poziom, typ, zdrowie, buffy i debuffy)
  const [mobTip, setMobTip] = useState<{ x: number; y: number } | null>(null)
  const onSceneMove = (e: { clientX: number; clientY: number }) => {
    const sc = sceneRef.current, el = wrap.current
    const box = sc?.mobBox
    if (!sc || !el || !box) { if (mobTip) setMobTip(null); return }
    const r = el.getBoundingClientRect()
    const k = r.width / Math.max(1, sc.w)
    const x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k
    const inside = x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1
    setMobTip(inside ? { x: e.clientX, y: e.clientY } : null)
  }
  const need = xpToNext(h.level)
  const b = bossState(s)
  const town = townOf(z, h.faction)
  const inTown = s.where !== 'field'
  const traveling = s.phase === 'travel'
  const here = capitalHere(s)
  const atCapital = !!here
  const hearth = h.cds.hearth ?? 0
  const bound = hasHearth(s)
  const mobTxt = s.mob ? `${s.mob.name}${s.mob.count > 1 ? ` ×${s.mob.count}` : ''} (${s.mob.lvl})` : ''
  const phaseText =
    s.phase === 'fight' && s.mob && s.mob.dist > 0 ? `${mobTxt} is approaching...`
    : s.phase === 'town' ? (s.where === 'capital' ? `In the capital: ${capitalOf(s)}` : `In town: ${town}`)
    : s.phase === 'fight' && s.mob ? `Fighting: ${mobTxt}`
    : s.phase === 'heal' ? 'Healing after the fight...'
    : s.phase === 'rest' ? (h.eating && (h.eating.hp || h.eating.mana) && h.eating.left > 0 ? (h.eating.hp && h.eating.mana ? 'Eating and drinking...' : h.eating.mana ? 'Drinking...' : 'Eating...') : 'Resting (no food)...')
    : s.phase === 'dead' ? 'Ghost'
    : s.phase === 'travel' ? `${s.trip?.form ? `${s.trip.form} · ` : ''}${s.trip?.to ?? sub.name} · ${Math.ceil(s.phaseT)} s`
    : 'Looking for a target...'
  const cast = h.casting
  const pet = activePet(h)
  const pd = petDef(h)
  const g = grants(h)
  // pasek akcji kończy się przed menu (micro): szerokość menu mierzona na żywo
  const microRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [microW, setMicroW] = useState(0)
  const [barW, setBarW] = useState(900)
  useEffect(() => {
    const el = microRef.current, bel = barRef.current
    if (!el || !bel) return
    const kids = () => { let w = 0; for (const k of Array.from(el.children)) w += (k as HTMLElement).offsetWidth + 6; return w }
    const upd = () => { setMicroW(kids()); setBarW(bel.offsetWidth) }
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(el); ro.observe(bel)
    return () => ro.disconnect()
  }, [])
  const bar = c.abilities.filter((a) => active(h, a, g) && a.kind !== 'form' && a.kind !== 'summon' && a.kind !== 'buff' && a.kind !== 'proc')
  // rozmiar przycisków: jeden rząd do 38 px; gdy umiejętności jest bardzo dużo — dwa rzędy mniejszych
  const abLay = (() => {
    const avail = Math.max(120, barW - microW - 16 - 20), n = Math.max(1, bar.length)
    const gap = n > 18 ? 3 : 6
    const one = Math.min(38, Math.floor(avail / n - gap))
    if (one >= 26) return { size: one, gap, rows: 1 }
    const two = Math.min(22, Math.floor(avail / Math.ceil(n / 2) - 3))
    return two > one ? { size: two, gap: 3, rows: 2 } : { size: one, gap, rows: 1 }
  })()
  // pasek buffów postaci: pasywne buffy, nasycenia, pieczęcie, aury, buffy czasowe, totemy, rasowe, Well Fed
  const buffs: { key: string; icon: string; name: string; desc: string; left?: number }[] = []
  for (const a of c.abilities) {
    if (a.debuff) continue // działa na wroga: pokazane nad wrogiem
    if (!a.travel && (a.kind === 'buff' || a.kind === 'proc') && active(h, a, g)) buffs.push({ key: a.id, icon: abilityIcon(a, h.cls), name: a.name, desc: [a.desc, ...abilityInfo(h, a, d)].join(' ') })
    else if ((h.temp[a.id] ?? 0) > 0 && a.buff) buffs.push({ key: a.id, icon: abilityIcon(a, h.cls), name: a.name, desc: a.desc, left: h.temp[a.id] })
  }
  for (const t of h.totems) { const a = c.abilities.find((x) => x.id === t.id); if (a?.buff) buffs.push({ key: `tot-${t.id}`, icon: abilityIcon(a, h.cls), name: a.name, desc: `${a.desc} Active while you stand near the totem.`, left: t.left }) }
  for (const id of r.actives) {
    const ra = RACIAL_ACTIVE[id]
    if ((h.buffs[id] ?? 0) > 0) buffs.push({ key: `rac-${id}`, icon: racialIcon(id), name: ra.name, desc: `Racial (${r.name}): ${ra.text}`, left: h.buffs[id] })
  }
  if (h.hot) { const a = c.abilities.find((x) => x.id === h.hot!.id); if (a) buffs.push({ key: 'hot', icon: abilityIcon(a, h.cls), name: a.name, desc: `Heals ${Math.round(h.hot.perTick)} every 3 s.`, left: h.hot.left }) }
  if (h.shield > 0) { const a = c.abilities.find((x) => x.kind === 'shield' && knows(h, x, g)); if (a) buffs.push({ key: 'shield', icon: abilityIcon(a, h.cls), name: a.name, desc: `Absorbs ${Math.round(h.shield)} more damage.` }) }
  if (h.wellFed) buffs.push({ key: 'wellfed', icon: wellFedIcon() ?? itemIcon({ id: -5, name: h.wellFed.name, rarity: 1, ilvl: 1, value: 0 }), name: 'Well Fed', desc: h.wellFed.name, left: h.wellFed.left })
  const learnable = learnableCount(h)
  const freeTalents = talentPoints(h.level) - spentTotal(h.talents)
  const readyQuests = s.quests.filter(questReady).length
  const subs = subsOf(s.loc.zone)
  // auto atak: łowca strzela (Auto Shot) albo bije wręcz, reszta Auto Attack
  const swinging = autoAttacking(s)
  const sp = swingSpeed(s, d)
  const shooting = styleOf(h) === 'ranged' && !heroInMelee(s)
  const swingLeft = Math.max(0, Math.min(sp, h.swing))
  const fmt = (x: number) => (x >= 10 ? Math.ceil(x).toString() : x.toFixed(1))

  // pozycja paska (przesuwany za uchwyt)
  // zawsze na ekranie: szerokość i pozycja przycinane do okna przy każdej zmianie skali UI / szerokości paska
  const kk = uiScale()
  const vw = window.innerWidth / kk, vh = window.innerHeight / kk
  const W = Math.min(BAR_W, vw) // stała szerokość paska
  const stripH = (wrap.current?.closest('.strip') as HTMLElement | null)?.getBoundingClientRect().height ?? 0
  const sx = pos.x == null ? null : W == null ? 0 : Math.min(Math.max(0, pos.x), Math.max(0, vw - W))
  const sy = pos.y == null ? null : Math.min(Math.max(0, pos.y), Math.max(0, vh - (stripH ? stripH / kk : 120)))
  const style: CSSProperties = sx == null && W == null && sy == null ? {} : {
    left: sx ?? (W == null ? 0 : `calc(50% - ${W / 2}px)`), right: 'auto', width: W ?? '100%', maxWidth: '100%',
    ...(sy != null ? { top: sy, bottom: 'auto' } : {}),
  }
  const grip = (e: RPointerEvent) => {
    const el = (e.currentTarget as HTMLElement).closest('.strip') as HTMLElement
    const rect = el.getBoundingClientRect()
    const k = uiScale()
    const bx = rect.left / k, by = rect.top / k
    const w = rect.width / k, hgt = rect.height / k
    const maxX = Math.max(0, window.innerWidth / k - w), maxY = Math.max(0, window.innerHeight / k - hgt)
    // upuszczenie paska na innym monitorze przenosi tam grę (Electron)
    let sx = e.screenX, sy = e.screenY
    const track = (ev: PointerEvent) => { sx = ev.screenX; sy = ev.screenY }
    window.addEventListener('pointermove', track)
    startDrag(e, (dx, dy) => setPos({ ...posRef.current, x: Math.min(maxX, Math.max(0, bx + dx / k)), y: Math.min(maxY, Math.max(0, by + dy / k)), w: posRef.current.w === 'full' ? Math.round(w) : posRef.current.w }),
      () => { window.removeEventListener('pointermove', track); saveLayout({ strip: posRef.current }); native?.dropAt?.(sx, sy) })
  }
  const capName = raceById(h.race).start.capital

  return (
    <div className="strip" data-solid style={style}>
      <div className="xp">
        <div className="grip" onPointerDown={grip} onDoubleClick={() => { const p = { x: null, y: null, w: 'full' as const }; setPos(p); saveLayout({ strip: p }) }}>⠿</div>
        {h.level < MAX_LEVEL ? (
          <Bar value={h.xp} max={need} color="linear-gradient(#b04ae0,#5a0a8a)" extra={h.rested} extraColor="#2f6fff" height={11}
            label={`XP ${Math.floor(h.xp).toLocaleString('en-US')} / ${need.toLocaleString('en-US')}${h.rested > 1 ? ` · Rested ${Math.floor(h.rested).toLocaleString('en-US')}` : ''}`} />
        ) : <Bar value={1} max={1} color="linear-gradient(#806020,#4a3410)" label="Level 60" height={11} />}
        <div className="xp-ticks">{Array.from({ length: 19 }, (_, i) => <i key={i} />)}</div>
      </div>

      <div className="unit">
        <div className="portrait-ring">
          <div className="pface" style={{ background: `radial-gradient(circle at 40% 35%, ${r.look.skin}, #000 120%)` }}>
            {raceIcon(h.race) ? <img className="pface-img" src={raceIcon(h.race)!} alt="" draggable={false} /> : <span style={{ color: c.color }}>{c.name[0]}</span>}
          </div>
          <div className="plevel">{h.level}</div>
          {h.rested > 1 && <div className="prested">zZ</div>}
          {pd && (() => {
            const cd = h.petCd ?? 0
            const pmax = petMaxHp(h, d)
            const hp = cd > 0 ? 0 : Math.max(0, Math.min(pmax, h.petHp ?? pmax))
            const sa = c.abilities.find((a) => a.id === `summon_${pd.id}`) ?? c.abilities.find((a) => a.id === 'intimidation') ?? c.abilities[0]
            const ico = (h.cls === 'hunter' ? firstIcon(['ability_hunter_pet_wolf', 'ability_hunter_beastcall', 'ability_hunter_beasttaming']) : null) ?? abilityIcon(sa, h.cls)
            return (
              <Hover className="pet-frame" anchor="above" tip={<Tip title={pd.name}>{cd > 0 ? <div>Dead — {h.cls === 'hunter' ? 'revived' : 'summoned again'} in {Math.ceil(cd)} s.</div> : <div>Health: {Math.ceil(hp)} / {pmax}</div>}{pd.tank && <div className="tt-dim">Runs to the enemy and holds it: enemies attack your pet first.</div>}</Tip>}>
                <div className={`pet-ico ${cd > 0 ? 'dead' : ''}`}><img src={ico} alt="" draggable={false} />{cd > 0 && <span className="pet-cd">{Math.ceil(cd)}</span>}</div>
                <div className="pet-hp"><i style={{ width: `${(hp / Math.max(1, pmax)) * 100}%` }} /></div>
              </Hover>
            )
          })()}
        </div>
        <div className="unit-bars">
          <div className="unit-name"><span className="nm">{h.name}</span> {classIcon(h.cls) && <img className="cls-ico" src={classIcon(h.cls)!} alt="" draggable={false} />}<span style={{ color: c.color }}>{c.name}</span>
            <span className="buffbar">{buffs.map((b) => (
              <Hover key={b.key} anchor="above" className="buff" tip={<Tip title={b.name}><div>{b.desc}</div>{b.left != null && <div className="tt-dim">Remaining: {b.left >= 60 ? `${Math.ceil(b.left / 60)} min` : `${Math.ceil(b.left)} s`}</div>}</Tip>}>
                <img src={b.icon} alt="" draggable={false} />{b.left != null && <span className="buff-t">{b.left >= 60 ? `${Math.ceil(b.left / 60)}m` : Math.ceil(b.left)}</span>}
              </Hover>
            ))}</span>
          </div>
          <Bar value={h.hp} max={d.maxHp} color="linear-gradient(#22d822,#086808)" label={`${Math.ceil(Math.max(0, h.hp))} / ${d.maxHp}`} height={14} />
          <Bar value={h.res} max={d.maxRes} color={RES_COLOR[d.res]} label={d.res === 'mana' ? `${Math.floor(h.res)} / ${d.maxRes}` : `${Math.floor(h.res)}`} height={11} />
          {cast ? (
            <Bar className="castbar" value={cast.total - cast.left} max={cast.total} color="linear-gradient(#ffd24a,#b08000)" label={<span className="bar-lr"><span>{c.abilities.find((a) => a.id === cast.id)?.name}</span><span>{fmt(Math.max(0, cast.left))} s</span></span>} height={13} />
          ) : (
            <div className="phase">{phaseText}{(h.stacks.mw ?? 0) > 0 && <span className="cp mw">{'◆'.repeat(h.stacks.mw)}</span>}{(h.stacks.ab ?? 0) > 0 && <span className="cp ab">{'✦'.repeat(h.stacks.ab)}</span>}{pet && <span className="pet"> · {pet.name}</span>}{h.wellFed && <span className="wellfed" title={`${h.wellFed.name}: Well Fed`}> · 🍖</span>}</div>
          )}
          {swinging && (
            <Bar className="swingbar" value={sp - swingLeft} max={sp} color={shooting ? 'linear-gradient(#e8d8a0,#8a7a40)' : 'linear-gradient(#e0e0e0,#808080)'} height={12}
              label={<span className="bar-lr"><span>{shooting ? 'Auto Shot (ranged)' : 'Auto Attack (melee)'}</span><span>{fmt(swingLeft)} s</span></span>} />
          )}
        </div>
      </div>

      <div className="scene" ref={wrap} onMouseMove={onSceneMove} onMouseLeave={() => setMobTip(null)}><canvas ref={canvas} />
        {s.phase === 'dead' && (
          <div className="death-pop">
            <div className="dp-title">You died</div>
            <div className="dp-sub">Your ghost runs back to your corpse: {Math.ceil(s.phaseT)} s</div>
            <Hover anchor="above" tip={<Tip title="Spirit Healer"><div>Resurrect now instead of waiting.</div><div style={{ color: '#ff8080' }}>Equipped items lose {Math.round(SPIRIT_DUR * 100)}% durability and this subzone's progress starts over.</div><div className="tt-dim">Items at 0 durability give no bonuses. Repair them at a vendor or with a repair kit. Travelling or entering a town as a ghost also means resurrecting at the Spirit Healer.</div></Tip>}>
              <button className="wbtn spirit" onClick={() => act('spirit')}>✚ Resurrect at the Spirit Healer</button>
            </Hover>
          </div>
        )}
      </div>
      {mobTip && s.mob && createPortal(<MobTooltip s={s} auras={sceneRef.current?.mobAuras(s) ?? []} x={mobTip.x} y={mobTip.y} />, document.body)}

      <div className="side">
        <div className="zone-name" style={{ color: CONTROL_COLOR[z.control] }}>{z.name} <span className="zr">({z.min}-{z.max})</span></div>
        <div className="sub-name">{sub.name} <span className="zr">{s.loc.sub + 1}/{subs.length}</span></div>
        {b.frontier ? (
          <Hover className="prog" anchor="above" tip={<Tip title={`${sub.zoneBoss ? 'Zone boss' : 'Miniboss'}: ${sub.boss.name} (${b.lvl})`}>
            <div>Defeat {b.need} enemies in this subzone, then the boss. Resurrecting at the Spirit Healer resets subzone progress (running back to your corpse keeps it).</div>
            {sub.zoneBoss && <div className="tt-dim">Blocks the way to the next zone.</div>}
          </Tip>}>
            <Bar value={b.kills} max={b.need} color={b.full ? 'linear-gradient(#ff8a2a,#a03000)' : 'linear-gradient(#e0b030,#7a5a00)'} height={13}
              label={b.full ? `Boss: ${sub.boss.name}!` : b.kills >= b.need && b.held ? `${sub.boss.name}: waits for level ${b.holdLvl}` : b.kills >= b.need && b.wait > 0 ? `${sub.boss.name} returns in ${Math.ceil(b.wait / 60)} min` : `${b.kills}/${b.need} · boss: ${sub.boss.name}`} />
            {b.kills >= b.need && b.held && <button className="wbtn small challenge" onClick={() => challengeBoss(s)}>⚔ Challenge now</button>}
          </Hover>
        ) : (
          <Bar value={1} max={1} color="linear-gradient(#3a8a3a,#1a4a1a)" height={13} label={s.prog[s.loc.zone].cleared >= subs.length ? 'Zone completed' : 'Subzone cleared (farming)'} />
        )}
        <div className="zone-pct"><Bar value={zonePct(s, s.loc.zone)} max={1} color="linear-gradient(#5aa0ff,#1a3a8a)" height={6} /><span>{Math.round(zonePct(s, s.loc.zone) * 100)}% of zone</span></div>
        <div className="town-btns">
          {s.phase === 'dead' ? <span className="dim small">Ghost: {Math.ceil(s.phaseT)} s to your corpse</span> : canTurnBack(s) ? (() => {
            const pos = tripPosition(s)!
            const back = Math.max(2, Math.round(pos.el))
            return (
              <>
                <Hover anchor="above" tip={<Tip title="Turn back">Walk back the same way to {zoneById(pos.origin.zone).name}. It takes as long as you have walked so far ({back} s).</Tip>}><button className="wbtn" onClick={() => turnBack(s, 'origin')}>↩ Back ({back} s)</button></Hover>
                <Hover anchor="above" tip={<Tip title="Stay here">Leave the road and stay in {zoneById(pos.cur.zone).name}, the zone you are walking through now.</Tip>}><button className="wbtn" onClick={() => turnBack(s, 'here')}>⏹ Stay in {zoneById(pos.cur.zone).name}</button></Hover>
              </>
            )
          })() : inTown ? <button className="wbtn" onClick={() => act('leave')}>Leave town</button> : (
            <>
              {town && <Hover anchor="above" tip={<Tip title={town}>{traveling ? 'You are travelling.' : 'Quests and a vendor for this zone.'}</Tip>}><button className="wbtn" disabled={traveling} onClick={() => act('town')}>⌂ {town}</button></Hover>}
              {atCapital ? (
                <Hover anchor="above" tip={<Tip title={here!}>{traveling ? <div>You are travelling.</div> : <div>Capital city: trainer, Weapon Master, vendor and innkeeper (set your Hearthstone here).</div>}</Tip>}>
                  <button className="wbtn" disabled={traveling} onClick={() => act('capital')}>♜ {here}</button>
                </Hover>
              ) : bound ? (
                <Hover anchor="above" tip={<Tip title={`Hearthstone: ${homeOf(s)}`}>{traveling ? <div>You are travelling.</div> : <><div>Teleports you to {homeOf(s)} ({zoneById(capitalZone(s)).name}).</div><div className="tt-dim">{hearth > 0 ? `Ready in ${Math.ceil(hearth / 60)} min.` : '30 min cooldown.'} You can also walk into any capital of your faction from its zone.</div></>}</Tip>}>
                  <button className={`wbtn ${hearth > 0 ? 'cooling' : ''}`} disabled={traveling || hearth > 0} onClick={() => act('capital')}>⌂ {homeOf(s)}{hearth > 0 ? ` (${Math.ceil(hearth / 60)} min)` : ''}</button>
                </Hover>
              ) : (
                <Hover anchor="above" tip={<Tip title="Hearthstone: not set"><div>Walk to {capName} ({zoneById(zoneOfCapital(capName)).name}) or another capital of your faction and set your Hearthstone at the innkeeper. Only then can you teleport back.</div></Tip>}>
                  <button className="wbtn" disabled>⌂ Hearthstone not set</button>
                </Hover>
              )}
            </>
          )}
        </div>
      </div>

      <div ref={barRef} className={`actionbar ${abLay.rows > 1 ? 'two' : ''}`} style={{ paddingRight: microW + 16, ['--ab' as string]: `${abLay.size}px`, ['--abg' as string]: `${abLay.gap}px`, ['--per' as string]: Math.ceil(bar.length / abLay.rows) } as CSSProperties}>
        {bar.map((a) => {
          const tot = h.totems.find((t) => t.id === a.id)
          const cdLeft = h.cds[a.id] > 0 && a.cd ? h.cds[a.id] : 0
          const cd = tot ? Math.min(1, tot.left / 300) : cdLeft ? Math.min(1, cdLeft / cdOf(a, d)) : 0
          const passive = a.kind === 'buff' || a.kind === 'proc'
          const oom = !passive && a.kind !== 'lifetap' && h.res < costOf(h, a, d)
          const on = (h.temp[a.id] ?? 0) > 0 || h.totems.some((t) => t.id === a.id)
          const castingThis = cast?.id === a.id
          // licznik: odnowienie, czas totemu / buffa albo pozostałe rzucanie
          const num = castingThis ? cast!.left : cdLeft > 0 ? cdLeft : tot ? tot.left : (h.temp[a.id] ?? 0) > 0 ? h.temp[a.id] : 0
          const numCls = castingThis ? 'casting' : cdLeft > 0 ? 'cd' : 'up'
          return (
            <Hover key={a.id} anchor="above" className={`abtn ${passive ? 'passive' : ''} ${oom ? 'oom' : ''} ${castingThis || on ? 'casting' : ''}`}
              tip={<Tip title={a.name}><div className="tt-dim">{a.cost ? `${costOf(h, a, d)} ${d.res === 'mana' ? 'Mana' : d.res === 'rage' ? 'Rage' : 'Energy'}` : passive ? 'Passive' : 'No cost'}{a.cd ? ` · ${cdOf(a, d)} s cooldown` : ''}{tot ? ` · totem lasts ${Math.ceil(tot.left)} s more` : ''}{a.cast ? ` · ${a.cast} s cast` : ' · instant'}</div><div>{a.desc}</div>{abilityInfo(h, a, d).map((l, k) => <div key={k} className="tt-info">{l}</div>)}<div className="tt-dim">You can disable it in the spellbook (P).</div></Tip>}>
              <img src={abilityIcon(a, h.cls)} alt="" draggable={false} />
              {cd > 0 && <div className="cd" style={{ background: `conic-gradient(rgba(0,0,0,.7) ${cd * 360}deg, transparent 0)` }} />}
              {num > 0.05 && <span className={`abtn-t ${numCls}`}>{num >= 60 ? `${Math.ceil(num / 60)}m` : fmt(num)}</span>}
            </Hover>
          )
        })}
      </div>

      <div className="micro" ref={microRef}>
        <MicroBtn icon={raceIcon(h.race) ?? menuIcon('char')} label="Character Info (C)" on={open.has('char')} onClick={() => toggle('char')} />
        <MicroBtn icon={menuIcon('spell')} label={`Spellbook & Abilities (P)${learnable ? ` · ${learnable} to learn at your trainer` : ''}`} on={open.has('spells')} onClick={() => toggle('spells')} badge={learnable || undefined} />
        <MicroBtn icon={menuIcon('talent')} label={`Talents (N)${freeTalents > 0 ? ` · ${freeTalents} unspent points` : ''}`} on={open.has('talents')} onClick={() => toggle('talents')} badge={freeTalents > 0 ? freeTalents : undefined} />
        <MicroBtn icon={menuIcon('skills')} label="Skills (K)" on={open.has('skills')} onClick={() => toggle('skills')} />
        <MicroBtn icon={menuIcon('quest')} label="Quest Log (L)" on={open.has('quests')} onClick={() => toggle('quests')} badge={readyQuests || undefined} />
        <MicroBtn icon={menuIcon('map')} label="World Map (M)" on={open.has('map')} onClick={() => toggle('map')} />
        <MicroBtn icon={menuIcon('log')} label="Chronicle" on={open.has('log')} onClick={() => toggle('log')} />
        <MicroBtn icon={menuIcon('gear')} label="Settings" on={open.has('settings')} onClick={() => toggle('settings')} />
        {isOverlay && <MicroBtn icon={menuIcon('hide')} label="Hide to tray" onClick={() => native?.hide()} />}
      </div>

      <div className="bagbar">
        <span className="bb-money"><Money copper={h.copper} /></span>
        {[3, 2, 1, 0].map((i) => {
          const bag = h.bags[i]
          return (
            <Hover key={i} anchor="above" className={`bagslot ${bag ? '' : 'empty'}`} onClick={() => toggle('bags')} drop={`bag:${i}`}
              onPointerDown={bag ? (e) => beginItemDrag(e, { k: 'bag', i }, itemIcon(bag)) : undefined}
              tip={bag ? <Tip title={bag.name}><div>{bag.bagSize} Slot Bag</div><div className="tt-dim">Drag it onto a free slot in another bag to remove it. Drop an item here to put it inside.</div></Tip> : <Tip title="Empty bag slot"><div className="tt-dim">Drag a bag here from your backpack. Bags are sold by vendors.</div></Tip>}>
              {bag && <img src={itemIcon(bag)} alt="" draggable={false} />}
            </Hover>
          )
        })}
        <Hover anchor="above" className={`bagslot backpack ${open.has('bags') ? 'on' : ''}`} onClick={() => toggle('bags')} drop="bag:-1"
          tip={<Tip title="Backpack (B)"><div>{usedSlots(h)}/{capacity(h)} slots used</div></Tip>}>
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

const MOB_TYPE: Record<string, string> = { beast: 'Beast', cat: 'Beast', boar: 'Beast', raptor: 'Beast', spider: 'Beast', flyer: 'Beast', insect: 'Beast', humanoid: 'Humanoid', small: 'Humanoid',
  murloc: 'Humanoid', undead: 'Undead', elemental: 'Elemental', dragon: 'Dragonkin', giant: 'Giant' }
function MobTooltip({ s, auras, x, y }: { s: GameState; auras: MobAura[]; x: number; y: number }) {
  const m = s.mob!
  const W = window.innerWidth
  const left = Math.max(4, Math.min(x + 16, W - 284))
  const buffs = auras.filter((a) => a.kind === 'buff'), debuffs = auras.filter((a) => a.kind === 'debuff')
  const row = (a: MobAura, i: number) => (
    <div key={i} className="mt-aura"><img src={a.icon} alt="" className={a.kind} /><div><b className={a.kind}>{a.name}</b>{a.left != null && <span className="tt-dim"> · {Math.ceil(a.left)} s</span>}<div className="tt-dim">{a.desc}</div></div></div>
  )
  return (
    <div className="tooltip" style={{ left, bottom: window.innerHeight - y + 12 }}>
      <div className="tooltip-body">
        <div className="tt-name">{m.name}{m.count > 1 ? ` ×${m.count}` : ''}</div>
        <div>Level {m.lvl}{m.boss === 'zone' ? ' Boss' : m.boss === 'mini' ? ' Elite' : ''} {MOB_TYPE[m.type] ?? ''}</div>
        <div className="tt-dim">Health: {Math.ceil(m.hp).toLocaleString('en-US')} / {Math.ceil(m.maxHp).toLocaleString('en-US')}</div>
        {buffs.length > 0 && <><div className="mt-sec">Buffs</div>{buffs.map(row)}</>}
        <div className="mt-sec">Debuffs</div>
        {debuffs.length ? debuffs.map(row) : <div className="tt-dim">None</div>}
      </div>
    </div>
  )
}
