import { useEffect, useState } from 'react'
import { TALENTS, TALENT_COLS, talentPoints, spentIn, spentTotal, canLearnTalent, respecCost } from '../data/talents'
import { learnTalent, autoTalents, resetTalents } from '../game/talents'
import { grants, knows, formOk, chosenIn } from '../game/formulas'
import { layout, saveLayout, startDrag, uiScale } from './layout'
import { classById, ranksOf, trainCost, isMelee, WEAPON_SKILL_PL, type Ability } from '../data/classes'
import { raceById, RACIAL_ACTIVE } from '../data/races'
import { skillRows, attackTable } from '../game/wskill'
import { zoneById } from '../data/zones'
import { stats, costOf, cdOf, isHybrid, abilityInfo, tripPlan } from '../game/sim'
import { exportSave, importSave } from '../game/save'
import { isAdmin, unlockAdmin, lockAdmin } from '../game/admin'
import { LEFT_SLOTS, RIGHT_SLOTS, WEAPON_SLOTS, SLOT_PL, type EquipSlot, type GameState, type Quest } from '../game/types'
import { segmentsOf, equipFromInv, unequip, sortBags, BACKPACK, capacity, usedSlots } from '../game/inventory'
import { rightClickInv, rightClickEquip } from './itemActions'
import { boardFor, acceptQuest, abandonQuest, questReady, questXp, MAX_QUESTS } from '../game/quests'
import { trainerRows, train, trainAll, sellJunk, buyBag, turnIn, placeName, buyBack, buyFood, buyKit, restock, weaponRows, trainWeapon, travel, bindHearth, repairAll, repairAllCost, repairDiscount } from '../game/town'
import { TravelConfirm } from './MapPanel'
import { BAGS_FOR_SALE, FOODS, KITS, canWear, makeFood, makeKit } from '../game/items'
import { townOf, capitalOf, homeOf, progOf, subsOf } from '../game/world'
import { abilityIcon, itemIcon, menuIcon, talentIcon, racialIcon } from '../render/icons'
import { Bar, Frame, Hover, ItemSlotBox, ItemTooltip, Money, Portrait, keepOnScreen } from './common'
import { isOverlay, native } from '../platform'

type Act = { bump: () => void; toast: (t: string, c?: string) => void }

// ---------------------------------------------------------------- Postać
const SLOT_KIND: Partial<Record<EquipSlot, string[]>> = { finger1: ['finger'], finger2: ['finger'], trinket1: ['trinket'], trinket2: ['trinket'], mainhand: ['mainhand', 'twohand'] }
type Res = { msg: string; color?: string } | null
const report = (toast: Act['toast'], r: Res) => { if (r) toast(r.msg, r.color) }
export function CharacterPanel({ s, onClose, bump, toast }: { s: GameState; onClose: () => void } & Act) {
  const h = s.hero
  const c = classById(h.cls)
  const r = raceById(h.race)
  const d = stats(h)
  const [fly, setFly] = useState<EquipSlot | null>(null)
  const pct = (x: number) => `${(x * 100).toFixed(2)}%`
  const fits = (sl: EquipSlot) => h.inv.map((it, i) => ({ it, i })).filter(({ it }) => it && it.slot && (SLOT_KIND[sl] ?? [sl]).includes(it.slot) && canWear(h, it))
  const slot = (sl: EquipSlot) => (
    <div key={sl} className={`pd-slot ${fly === sl ? 'open' : ''}`}>
      <ItemSlotBox item={h.equip[sl]} hero={h} empty={SLOT_PL[sl]} hint="drag to a bag or right-click: unequip · click: choose from bags" drag={{ k: 'eq', slot: sl }} drop={`eq:${sl}`}
        onClick={() => setFly(fly === sl ? null : sl)} onRight={() => { report(toast, rightClickEquip(s, sl)); bump() }} />
      {fits(sl).length > 0 && <span className="pd-has">{fits(sl).length}</span>}
    </div>
  )
  const opts = fly ? fits(fly) : []
  const tip = statTips(h, d)
  const broken = Object.values(h.equip).filter((it) => it?.dur === 0).length
  return (
    <Frame id="char" title={h.name} onClose={onClose} className="char-frame" icon={menuIcon('char')}>
      <div className="char-sub">Level {h.level} {r.name} <span style={{ color: c.color }}>{c.name}</span>{h.cls === 'druid' && h.form !== 'caster' ? ` · ${h.form === 'bear' ? 'Bear Form' : h.form === 'cat' ? 'Cat Form' : 'Moonkin Form'}` : ''}{h.wellFed ? <span className="wellfed"> · Well Fed ({Math.ceil(h.wellFed.left / 60)} min)</span> : null}</div>
      <div className="paperdoll">
        <div className="pd-col">{LEFT_SLOTS.map(slot)}</div>
        <div className="pd-model">
          <Portrait race={h.race} cls={h.cls} width={170} height={230} level={h.level} />
          {fly && (
            <div className="flyout">
              <div className="fly-head">{SLOT_PL[fly]}: choose from your bags</div>
              <div className="fly-items">
                {opts.map(({ it, i }) => (
                  <ItemSlotBox key={it!.id} item={it} hero={h} hint="click to equip" onClick={() => {
                    const forced = fly === 'finger1' || fly === 'finger2' || fly === 'trinket1' || fly === 'trinket2' ? fly : undefined
                    const e = equipFromInv(h, i, forced); if (e) toast(e, '#ff4040'); setFly(null); bump()
                  }} />
                ))}
                {!opts.length && <span className="dim small">No matching items in your bags.</span>}
              </div>
              <div className="fly-foot">
                {h.equip[fly] && <button className="wbtn small" onClick={() => { const e = unequip(h, fly); if (e) toast(e, '#ff4040'); setFly(null); bump() }}>Unequip</button>}
                <button className="wbtn small" onClick={() => setFly(null)}>Close</button>
              </div>
            </div>
          )}
        </div>
        <div className="pd-col">{RIGHT_SLOTS.map(slot)}</div>
      </div>
      <div className="pd-weapons">{WEAPON_SLOTS.map(slot)}</div>
      <div className="char-stats">
        <div className="stat-box">
          <Row k="Strength" v={d.str} tip={tip.str} /><Row k="Agility" v={d.agi} tip={tip.agi} /><Row k="Stamina" v={d.sta} tip={tip.sta} /><Row k="Intellect" v={d.int} tip={tip.int} /><Row k="Spirit" v={d.spi} tip={tip.spi} /><Row k="Armor" v={d.armor} tip={tip.armor} />
        </div>
        <div className="stat-box">
          <Row k="Health" v={d.maxHp} tip={tip.hp} /><Row k={d.res === 'mana' ? 'Mana' : d.res === 'rage' ? 'Rage' : 'Energy'} v={d.maxRes} tip={tip.res} />
          <Row k="Attack Power" v={d.ap} tip={tip.ap} /><Row k="Spell Power" v={d.sp} tip={tip.sp} /><Row k="Crit" v={pct(d.crit)} tip={tip.crit} /><Row k="Spell Crit" v={pct(d.spellCrit)} tip={tip.spellCrit} /><Row k="Dodge" v={pct(Math.min(0.75, d.dodge))} tip={tip.dodge} />
        </div>
      </div>
      {broken > 0 && <div className="broken-warn">Broken items: {broken}. They give no bonuses; repair them at a vendor or with a repair kit.</div>}
    </Frame>
  )
}
const Row = ({ k, v, tip }: { k: string; v: number | string; tip?: string[] }) => (
  <Hover className="srow" tip={tip ? <div className="tooltip-body"><div className="tt-name">{k} {v}</div>{tip.map((t, i) => <div key={i} className={i ? 'tt-dim' : ''}>{t}</div>)}</div> : null}>
    <span>{k}:</span><b>{v}</b>
  </Hover>
)

// ---------------------------------------------------------------- Umiejętności (Skills, K): specjalizacje broni, w przyszłości crafting
export function SkillsPanel({ s, onClose }: { s: GameState; onClose: () => void }) {
  const h = s.hero
  const skills = skillRows(h)
  return (
    <Frame id="skills" title="Skills" onClose={onClose} className="skills-frame" icon={menuIcon('skills')}>
      <div className="parchment wskills">
        <div className="board-sec">Weapon Skills</div>
        {skills.map((r) => {
          const tb = attackTable({ ...h, wskill: { ...h.wskill, [r.type]: r.base } }, h.level, ['Bow', 'Gun', 'Crossbow', 'Thrown'].includes(r.type), true)
          return (
            <Hover key={r.type} className="wsk" tip={<div className="tooltip-body"><div className="tt-name">{WEAPON_SKILL_PL[r.type] ?? r.type} {r.base + r.bonus}/{r.cap}{r.bonus ? ` (+${r.bonus} racial)` : ''}</div>
              <div>Increases as you fight with this weapon type, up to your level × 5. Enemy defense is their level × 5.</div>
              <div className="tt-dim">Against an enemy of your level: miss {(tb.miss * 100).toFixed(1)}%, dodge {(tb.dodge * 100).toFixed(1)}%, parry {(tb.parry * 100).toFixed(1)}%, glancing {(tb.glance * 100).toFixed(0)}% (−{Math.round((1 - tb.glanceMul) * 100)}% damage).</div></div>}>
              <span className="wsk-name">{WEAPON_SKILL_PL[r.type] ?? r.type}</span>
              <Bar value={r.base + r.bonus} max={r.cap + r.bonus} color={r.base < r.cap ? 'linear-gradient(#5a7aff,#1a2a8a)' : 'linear-gradient(#3a8a3a,#1a4a1a)'} height={14} label={`${r.base + r.bonus} / ${r.cap}${r.bonus ? ` (+${r.bonus})` : ''}`} />
            </Hover>
          )
        })}
        <div className="pdim small">New weapon types are taught by the Weapon Master in capital cities (they start at 1).</div>
        <div className="board-sec">Professions</div>
        <div className="pdim small">Coming in a future update.</div>
      </div>
    </Frame>
  )
}

// Objaśnienia atrybutów, liczone tymi samymi wzorami co symulacja
function statTips(h: GameState['hero'], d: ReturnType<typeof stats>): Record<string, string[]> {
  const c = classById(h.cls)
  const L = h.level
  const cat = h.cls === 'druid' && h.form === 'cat'
  const f1 = (x: number) => (x * 100).toFixed(2) + '%'
  const apStr = h.cls === 'hunter' || h.cls === 'rogue' || h.cls === 'mage' || h.cls === 'priest' || h.cls === 'warlock' ? 1 : 2
  const apAgi = h.cls === 'hunter' ? 2 : h.cls === 'rogue' || cat ? 1 : 0
  const critDiv = h.cls === 'rogue' || h.cls === 'hunter' || cat ? 29 : 20
  const hpMul = 1 + (L / 60) * 0.7
  const staHp = Math.round((Math.min(20, d.sta) + 10 * Math.max(0, d.sta - 20)) * hpMul)
  const intMana = Math.min(20, d.int) + 15 * Math.max(0, d.int - 20)
  const perTick = h.cls === 'mage' || h.cls === 'priest' ? 12.5 + d.spi / 4 : 15 + d.spi / 5
  const inCombat = Math.min(1, (d.m.regen ?? 0) + (d.m.castRegen ?? 0))
  const drL = d.dr(L), drUp = d.dr(L + 3)
  const armorOnly = (lvl: number) => d.armor / (d.armor + 400 + 85 * lvl)
  return {
    str: [`Increases attack power by ${Math.round(d.str * apStr)} (${apStr} AP per point).`],
    agi: [`Critical strike: +${f1(d.agi / critDiv / 100)}.`, `Dodge: +${f1(d.agi / 20 / 100)}.`, `Armor: +${d.agi * 2}.`, ...(apAgi ? [`Attack power: +${d.agi * apAgi}.`] : [])],
    sta: [`Increases health by ${staHp} (10 health per point above 20, scaled by level).`],
    int: [...(d.res === 'mana' || c.resource === 'mana' ? [`Mana: +${intMana} (15 per point above 20).`] : ['Your class does not use mana.']), `Spell crit: +${f1(d.int / 60 / 100)}.`],
    sp: ['Added to spell damage and healing by each spell\'s coefficient (cast time / 3.5 s; DoTs and HoTs: duration / 15 s; AoE about 1/3).', `E.g. a 3.5 s spell: +${d.sp}, an instant spell: +${Math.round(d.sp * 1.5 / 3.5)}.`, 'Sources: items "of Sorcery", "of Healing", "of ... Wrath" and talents.'],
    spi: [c.resource === 'mana' || h.cls === 'druid' ? `Mana regeneration out of combat: ${(perTick / 2).toFixed(1)} per second.` : 'Spirit speeds up resting.', inCombat > 0 ? `In combat: ${Math.round(inCombat * 100)}% of that regeneration.` : 'No mana regeneration in combat (5 s after a spell).'],
    armor: [`Reduces physical damage from an enemy of your level (${L}) by ${f1(armorOnly(L))}.`, `Against an enemy 3 levels higher: ${f1(armorOnly(L + 3))}.`, ...(drL > armorOnly(L) + 0.001 ? [`Including talents and buffs: ${f1(drL)} (enemy +3: ${f1(drUp)}).`] : [])],
    hp: [`From Stamina: ${staHp}. The rest comes from your class and level.`, 'Health is restored by eating while resting.'],
    res: d.res === 'mana' ? [`From Intellect: ${intMana}.`, 'Mana is restored by drinking while resting.'] : d.res === 'rage' ? ['Rage builds when you deal and take damage, and decays out of combat.'] : ['Energy regenerates 10 per second.'],
    ap: [`Increases weapon damage by ${(d.ap / 14).toFixed(1)} DPS.`, `Weapon: ${d.weaponDps.toFixed(1)} DPS, speed ${d.weaponSpeed.toFixed(2)}.`, ...(h.cls === 'hunter' ? [`Melee: ${d.melee.ap} AP, weapon ${d.melee.dps.toFixed(1)} DPS, speed ${d.melee.speed.toFixed(2)}.`] : [])],
    crit: ['Chance for double damage on strikes and shots.', `From Agility: ${f1(d.agi / critDiv / 100)}, base 5%, the rest from talents and buffs.`],
    spellCrit: ['Chance for 150% damage / healing from spells.', `From Intellect: ${f1(d.int / 60 / 100)}.`],
    dodge: ['Chance to dodge an enemy attack (max 75%).', `From Agility: ${f1(d.agi / 20 / 100)}.`],
  }
}

// ---------------------------------------------------------------- Torby
export function BagsPanel({ s, onClose, bump, toast }: { s: GameState; onClose: () => void } & Act) {
  const h = s.hero
  // każda torba ma własne przesunięcie (domyślnie stos przy prawej krawędzi), zapisywane w układzie
  const key = (i: number) => `bag${i}`
  const [offs, setOffs] = useState<Record<string, { dx: number; dy: number }>>(() => Object.fromEntries([0, 1, 2, 3, 4].map((i) => [key(i), layout().frames[key(i)] ?? { dx: 0, dy: 0 }])))
  const offRef = { current: offs }
  // torba, która uciekła poza ekran (np. drugi monitor), wraca na krawędź
  useEffect(() => {
    const fix = () => {
      const n = { ...offRef.current }
      let changed = false
      document.querySelectorAll<HTMLElement>('.bagwin[data-bag]').forEach((el) => {
        const k = key(Number(el.dataset.bag))
        const o = n[k] ?? { dx: 0, dy: 0 }
        const f = keepOnScreen(el, o, uiScale())
        if (f !== o) { n[k] = f; changed = true }
      })
      if (changed) { setOffs(n); const fr = { ...layout().frames }; for (const [k, v] of Object.entries(n)) fr[k] = v; saveLayout({ frames: fr }) }
    }
    fix()
    window.addEventListener('resize', fix)
    return () => window.removeEventListener('resize', fix)
  }, [])
  const segs = segmentsOf(h)
  const vendor = s.where !== 'field'
  let base = 0
  const blocks = segs.map((seg, i) => {
    const start = base
    base += i === 0 ? BACKPACK : h.bags[i - 1]?.bagSize ?? 0
    if (i > 0 && !h.bags[i - 1]) return null
    const name = i === 0 ? 'Backpack' : h.bags[i - 1]!.name
    const o = offs[key(i)] ?? { dx: 0, dy: 0 }
    return (
      <div key={i} className="bagwin" data-solid data-bag={i} style={{ transform: `translate(${o.dx}px, ${o.dy}px)` }}>
        <div className="bagwin-head" title="Drag to move this bag (double-click: reset position)"
          onDoubleClick={() => { const n = { ...offRef.current, [key(i)]: { dx: 0, dy: 0 } }; setOffs(n); saveLayout({ frames: { ...layout().frames, [key(i)]: { dx: 0, dy: 0 } } }) }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return
            const b0 = offRef.current[key(i)] ?? { dx: 0, dy: 0 }
            let last = b0
            const el = (e.currentTarget as HTMLElement).closest('.bagwin') as HTMLElement
            startDrag(e, (dx, dy) => { last = { dx: b0.dx + dx / uiScale(), dy: b0.dy + dy / uiScale() }; setOffs((cur) => ({ ...cur, [key(i)]: last })) },
              () => { requestAnimationFrame(() => { last = keepOnScreen(el, last, uiScale()); setOffs((cur) => ({ ...cur, [key(i)]: last })); saveLayout({ frames: { ...layout().frames, [key(i)]: last } }) }) })
          }}>
          <img src={itemIcon(i === 0 ? { id: -1, name: 'Backpack', rarity: 1, ilvl: 1, value: 0, bagSize: 16 } : h.bags[i - 1]!)} alt="" draggable={false} /><span>{name}</span>
          {i === 0 && <button className="wbtn small" title="Sort bags" onClick={() => { sortBags(h); bump() }}>Sort</button>}
          {i === 0 && <button className="wbtn small" title="Stack all bags back at the right edge" onClick={() => { const z = { dx: 0, dy: 0 }; const n = Object.fromEntries([0, 1, 2, 3, 4].map((k) => [key(k), z])); setOffs(n); const fr = { ...layout().frames }; for (const k of Object.keys(n)) fr[k] = z; saveLayout({ frames: fr }) }}>Stack</button>}
          {i === 0 && <button className="wclose" onClick={onClose}>✕</button>}
        </div>
        <div className="bagwin-grid">
          {seg.map((it, k) => {
            const idx = start + k
            const hint = vendor ? (it?.quest ? 'quest item' : 'right-click: sell · drag to the vendor') : it?.food?.kind === 'buff' ? 'right-click: eat' : it?.slot || it?.bagSize ? 'right-click: equip · drag' : 'drag to move'
            return <ItemSlotBox key={k} item={it} hero={h} hint={it ? hint : undefined} drag={{ k: 'inv', idx }} drop={`inv:${idx}`}
              onRight={() => { report(toast, rightClickInv(s, idx)); bump() }} />
          })}
        </div>
        {i === 0 && (
          <div className="bagwin-foot">
            <span className="dim small">{usedSlots(h)}/{capacity(h)}</span>
            <Money copper={h.copper} />
          </div>
        )}
      </div>
    )
  })
  return <div className="bags-stack">{blocks}</div>
}

// ---------------------------------------------------------------- Dziennik zadań
export function QuestLog({ s, onClose, bump, toast }: { s: GameState; onClose: () => void } & Act) {
  const [sel, setSel] = useState<string | null>(s.quests[0]?.id ?? null)
  const [go, setGo] = useState<{ zone: string; sub: number } | null>(null)
  const q = s.quests.find((x) => x.id === sel) ?? s.quests[0]
  const byZone = new Map<string, Quest[]>()
  for (const x of s.quests) byZone.set(x.zone, [...(byZone.get(x.zone) ?? []), x])
  return (
    <Frame id="quests" title={`Quest Log (${s.quests.length}/${MAX_QUESTS})`} onClose={onClose} className="quest-frame" icon={menuIcon('quest')}>
      <div className="parchment ql">
        <div className="ql-list">
          {!s.quests.length && <div className="pdim">No quests. Pick them up in the zone's town (the ⌂ button on the bar).</div>}
          {[...byZone.entries()].map(([z, qs]) => (
            <div key={z}>
              <div className="ql-zone">{zoneById(z).name}</div>
              {qs.map((x) => (
                <div key={x.id} className={`ql-item ${x.id === q?.id ? 'sel' : ''}`} onClick={() => setSel(x.id)}>
                  <span className="ql-lvl">[{x.level}]</span> {x.title} {questReady(x) ? <span className="ql-done">(Complete)</span> : <span className="ql-cnt">{x.have}/{x.need}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        {q && (
          <div className="ql-detail">
            <h3>{q.title}</h3>
            <p>{q.text}</p>
            <h4>Objective</h4>
            <p>{q.kind === 'collect' ? `${q.item}: ${q.have}/${q.need}` : `${q.target} slain: ${q.have}/${q.need}`}</p>
            {questReady(q) && <p className="ql-turnin">Turn in at: <b>{townOf(zoneById(q.zone), s.hero.faction)}</b></p>}
            <h4>Rewards</h4>
            <p>{questXp(s, q).toLocaleString('en-US')} XP · <Money copper={q.copper} /></p>
            {q.reward && <div className="ql-reward"><ItemSlotBox item={q.reward} hero={s.hero} /><span style={{ color: ['#9d9d9d', '#fff', '#1eff00', '#0070dd', '#a335ee'][q.reward.rarity] }}>{q.reward.name}</span></div>}
            <div className="ql-btns">
              {(() => {
                const sub = Math.min(q.sub, progOf(s, q.zone).cleared, subsOf(q.zone).length - 1)
                const here = s.loc.zone === q.zone && s.loc.sub === sub && s.where === 'field'
                const plan = tripPlan(s, q.zone, sub)
                return here ? <span className="pdim">You are at the quest location.</span> : (
                  <button className="wbtn" disabled={s.phase === 'travel'} title={plan.blocked ?? ''} onClick={() => { if (plan.blocked) toast(plan.blocked, '#ff8040'); else setGo({ zone: q.zone, sub }) }}>Go: {zoneById(q.zone).name}{sub !== q.sub ? '' : ` · ${subsOf(q.zone)[sub].name}`}</button>
                )
              })()}
              <button className="wbtn" onClick={() => { abandonQuest(s, q.id); setSel(null); bump() }}>Abandon</button>
            </div>
            {go && <TravelConfirm s={s} zone={go.zone} sub={go.sub} onCancel={() => setGo(null)} onGo={() => { const e = travel(s, go.zone, go.sub); if (e) toast(e, '#ff4040'); setGo(null); bump() }} />}
          </div>
        )}
      </div>
    </Frame>
  )
}

// ---------------------------------------------------------------- Miasto / stolica
export function CityPanel({ s, onLeave, bump, toast }: { s: GameState; onLeave: () => void } & Act) {
  const capital = s.where === 'capital'
  type Tab = 'quests' | 'trainer' | 'vendor' | 'weapons'
  const [tab, setTab] = useState<Tab>(capital ? 'vendor' : 'quests')
  const tabs: [Tab, string][] = capital ? [['vendor', 'Vendor'], ['trainer', 'Trainer'], ['weapons', 'Weapon Master']] : [['quests', 'Quests'], ['vendor', 'Vendor']]
  return (
    <Frame id="city" title={placeName(s)} onClose={onLeave} className="city-frame" icon={menuIcon(capital ? 'capital' : 'town')}>
      <div className="tabs">
        {tabs.map(([k, l]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        <button className="wbtn right" onClick={onLeave}>Leave town</button>
      </div>
      {tab === 'quests' && <QuestBoard s={s} bump={bump} toast={toast} />}
      {tab === 'trainer' && <Trainer s={s} bump={bump} toast={toast} />}
      {tab === 'vendor' && <Vendor s={s} bump={bump} toast={toast} />}
      {tab === 'weapons' && <WeaponMaster s={s} bump={bump} toast={toast} />}
      {!capital && <div className="dim small">Trainers and Weapon Masters are in your faction's capital cities.</div>}
      {capital && (
        <div className="hearth-row">
          <span className="dim small">Hearthstone: <b>{s.home ?? 'not set'}</b></span>
          {s.home !== s.inCap && <button className="wbtn small" onClick={() => { const e = bindHearth(s); toast(e ?? `Hearthstone set to: ${s.inCap}`, e ? '#ff4040' : '#ffd100'); bump() }}>Set Hearthstone here</button>}
        </div>
      )}
    </Frame>
  )
}

function QuestBoard({ s, bump, toast }: { s: GameState } & Act) {
  const board = boardFor(s, s.loc.zone)
  const ready = s.quests.filter((q) => q.zone === s.loc.zone && questReady(q))
  const other = s.quests.filter((q) => q.zone !== s.loc.zone && questReady(q))
  return (
    <div className="parchment board">
      {ready.length > 0 && <div className="board-sec">Ready to turn in</div>}
      {ready.map((q) => (
        <div key={q.id} className="board-q ready">
          <span className="qmark">?</span>
          <div className="bq-main"><b>{q.title}</b><div className="pdim">{questXp(s, q)} XP · <Money copper={q.copper} />{q.reward ? ` · [${q.reward.name}]` : ''}</div></div>
          <button className="wbtn" onClick={() => { const e = turnIn(s, q); if (e) toast(e, '#ff4040'); else toast(`Completed: ${q.title}`); bump() }}>Complete</button>
        </div>
      ))}
      <div className="board-sec">Available quests</div>
      {!board.length && <div className="pdim">No new quests. Defeat the miniboss to unlock the next subzone.</div>}
      {board.map((q) => (
        <div key={q.id} className="board-q">
          <span className="qmark">!</span>
          <div className="bq-main"><b>[{q.level}] {q.title}</b><div className="pdim">{q.text}</div><div className="pdim">{questXp(s, q)} XP · <Money copper={q.copper} />{q.reward ? <> · <span style={{ color: '#1e8a00' }}>[{q.reward.name}]</span></> : null}</div></div>
          <button className="wbtn" disabled={s.quests.length >= MAX_QUESTS} onClick={() => { acceptQuest(s, q); bump() }}>Accept</button>
        </div>
      ))}
      {board.length > 1 && <button className="wbtn" disabled={s.quests.length >= MAX_QUESTS} onClick={() => { for (const q of board) acceptQuest(s, q); bump() }}>Accept all</button>}
      {other.length > 0 && <div className="pdim">Completed quests from other zones are turned in at their towns: {[...new Set(other.map((q) => townOf(zoneById(q.zone), s.hero.faction)))].join(', ')}.</div>}
    </div>
  )
}

function Trainer({ s, bump, toast }: { s: GameState } & Act) {
  const h = s.hero
  const c = classById(h.cls)
  const rows = trainerRows(s)
  const avail = rows.filter((r) => r.status === 'available')
  const total = avail.reduce((a, r) => a + r.cost, 0)
  return (
    <div className="parchment trainer">
      <div className="tr-head"><span>{c.name} Trainer</span><span>Your money: <Money copper={h.copper} /></span></div>
      <div className="tr-list">
        {rows.map((r) => {
          const a = c.abilities.find((x) => x.id === r.id)!
          return (
            <div key={r.id} className={`tr-row ${r.status}`}>
              <img src={abilityIcon(a, h.cls)} alt="" />
              <div className="tr-main"><b>{r.name}</b> <span className="pdim">Rank {r.rank}{r.status === 'locked' ? ` · requires level ${r.rankLvl}` : ''}</span><div className="pdim">{a.desc}</div></div>
              {r.status === 'known' ? <span className="pdim">Known</span> : r.status === 'available' ? (
                <button className="wbtn" disabled={h.copper < r.cost} onClick={() => { const e = train(s, r.id); if (e) toast(e, '#ff4040'); bump() }}>Train <Money copper={r.cost} /></button>
              ) : <span className="pdim"><Money copper={r.cost} /></span>}
            </div>
          )
        })}
      </div>
      <div className="tr-foot">
        <button className="wbtn" disabled={!spentTotal(h.talents)} onClick={() => { const e = resetTalents(s); toast(e ?? 'Talents reset', e ? '#ff4040' : '#ffd100'); bump() }}>Reset talents (<Money copper={respecCost(h.level)} />)</button>
        <button className="wbtn" disabled={!avail.length} onClick={() => { const n = trainAll(s); toast(n ? `Learned ${n} ranks` : 'Not enough money', n ? '#ffd100' : '#ff4040'); bump() }}>Train all (<Money copper={total} />)</button>
      </div>
    </div>
  )
}

function Vendor({ s, bump, toast }: { s: GameState } & Act) {
  const h = s.hero
  const [sub, setSub] = useState<'goods' | 'bags' | 'buyback'>('goods')
  const junk = h.inv.filter((x) => x && x.rarity === 0).reduce((a, x) => a + x!.value * (x!.count ?? 1), 0)
  const have = (name: string) => h.inv.reduce((a, x) => a + (x?.name === name ? x.count ?? 1 : 0), 0)
  // jak u kupca w grze: towar na twój poziom (dwa najlepsze z każdego rodzaju) + następny do odblokowania
  const kinds = classById(h.cls).resource === 'mana' || h.cls === 'druid' ? (['food', 'drink', 'buff'] as const) : (['food', 'buff'] as const)
  const goods = kinds.flatMap((k) => {
    const all = FOODS.filter((f) => f.kind === k)
    const ok = all.filter((f) => f.lvl <= h.level).slice(k === 'buff' ? -2 : -1)
    const next = all.find((f) => f.lvl > h.level)
    return next ? [...ok, next] : ok
  })
  const buy = (name: string, n: number) => { const e = buyFood(s, name, n); if (e) toast(e, '#ff4040'); bump() }
  const repairCost = repairAllCost(s)
  return (
    <div className="parchment vendor" data-drop="vendor">
      <div className="tr-head"><span>General Goods</span><span><Money copper={h.copper} /></span></div>
      <div className="pdim">To sell: right-click an item in your bags or drag it here.</div>
      <div className="vend-actions">
        <button className="wbtn" disabled={!junk} onClick={() => { const v = sellJunk(s); toast(`Sold junk for ${(v / 100).toFixed(2)} s`, '#fff'); bump() }}>Sell grey items (<Money copper={junk} />)</button>
        <button className="wbtn" onClick={() => { const v = restock(s, 1); toast(v ? 'Food and drink restocked' : 'You already have enough (or not enough money)', '#fff'); bump() }}>Restock food and drink</button>
        <Hover tip={<div className="tooltip-body"><div className="tt-name">Repair</div><div>Restores full durability of equipped items and items in your bags.</div>{repairDiscount(s) > 0 && <div className="tt-dim">Racial discount: {Math.round(repairDiscount(s) * 100)}%.</div>}</div>}>
          <button className="wbtn" disabled={!repairCost || h.copper < repairCost} onClick={() => { const e = repairAll(s); toast(e ?? 'Gear repaired', e ? '#ff4040' : '#fff'); bump() }}>🔨 Repair all {repairCost ? <Money copper={repairCost} /> : '(nothing to repair)'}</button>
        </Hover>
      </div>
      <div className="tabs small">
        {([['goods', 'Goods'], ['bags', 'Bags'], ['buyback', `Buyback (${s.buyback.length})`]] as const).map(([k, l]) => <button key={k} className={`tab ${sub === k ? 'on' : ''}`} onClick={() => setSub(k)}>{l}</button>)}
      </div>
      {sub === 'goods' && goods.map((f) => {
        const locked = f.lvl > h.level
        const it = makeFood(-3, f)
        return (
          <div key={f.name} className={`tr-row ${locked ? 'locked' : 'available'}`}>
            <ItemSlotBox item={it} hero={h} size={32} />
            <div className="tr-main"><b>{f.name}</b> <span className="pdim">{f.kind === 'food' ? 'Food' : f.kind === 'drink' ? 'Drink' : 'Buff food'} · level {f.lvl}{have(f.name) ? ` · you have ${have(f.name)}` : ''}</span>
              <div className="pdim">{f.kind === 'buff' ? `${f.buff!.text} (15 min, right-click in your bags)` : `${f.amt} ${f.kind === 'food' ? 'health' : 'mana'} while resting`}</div></div>
            <span className="vend-buy">
              <Money copper={f.price} />
              {[1, 5, 20].map((n) => <button key={n} className="wbtn small" disabled={h.copper < f.price * n} onClick={() => buy(f.name, n)}>×{n}</button>)}
            </span>
          </div>
        )
      })}
      {sub === 'goods' && (() => {
        const ok = KITS.filter((k) => k.lvl <= h.level).slice(-1)
        const next = KITS.find((k) => k.lvl > h.level)
        return [...ok, ...(next ? [next] : [])].map((k) => {
          const locked = k.lvl > h.level
          return (
            <div key={k.name} className={`tr-row ${locked ? 'locked' : 'available'}`}>
              <ItemSlotBox item={makeKit(-6, k)} hero={h} size={32} />
              <div className="tr-main"><b>{k.name}</b> <span className="pdim">Repair kit · level {k.lvl}{have(k.name) ? ` · you have ${have(k.name)}` : ''}</span>
                <div className="pdim">Your character uses it to repair a broken item (up to item level {k.maxIlvl}) between fights.</div></div>
              <span className="vend-buy">
                <Money copper={k.price} />
                {[1, 5].map((n) => <button key={n} className="wbtn small" disabled={locked || h.copper < k.price * n} onClick={() => { const e = buyKit(s, k.name, n); if (e) toast(e, '#ff4040'); bump() }}>×{n}</button>)}
              </span>
            </div>
          )
        })
      })()}
      {sub === 'bags' && BAGS_FOR_SALE.map((b) => (
        <div key={b.size} className="tr-row available">
          <img src={itemIcon({ id: -2, name: b.name, rarity: 1, ilvl: 1, value: 0, bagSize: b.size })} alt="" />
          <div className="tr-main"><b>{b.name}</b><div className="pdim">{b.size} Slot Bag</div></div>
          <button className="wbtn" disabled={h.copper < b.price} onClick={() => { const e = buyBag(s, b.size); if (e) toast(e, '#ff4040'); bump() }}>Buy <Money copper={b.price} /></button>
        </div>
      ))}
      {sub === 'buyback' && (
        <>
          {!s.buyback.length && <div className="pdim">Nothing sold yet. Your 10 most recently sold items appear here.</div>}
          {s.buyback.map((it, i) => (
            <div key={`${it.id}-${i}`} className="tr-row available">
              <ItemSlotBox item={it} hero={h} size={32} />
              <div className="tr-main"><b style={{ color: ['#9d9d9d', '#333', '#1e8a00', '#0050a0', '#7a2aa0'][it.rarity] }}>{it.name}</b>{(it.count ?? 1) > 1 && <span className="pdim"> ×{it.count}</span>}</div>
              <button className="wbtn" disabled={h.copper < it.value * (it.count ?? 1)} onClick={() => { const e = buyBack(s, i); if (e) toast(e, '#ff4040'); bump() }}>Buy back <Money copper={it.value * (it.count ?? 1)} /></button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function WeaponMaster({ s, bump, toast }: { s: GameState } & Act) {
  const h = s.hero
  const rows = weaponRows(s)
  return (
    <div className="parchment trainer">
      <div className="tr-head"><span>Weapon Master</span><span>Your money: <Money copper={h.copper} /></span></div>
      <div className="pdim">Weapon types a {classById(h.cls).name} can learn. You can't equip a weapon type you haven't learned.</div>
      <div className="tr-list">
        {rows.map((r) => (
          <div key={r.type} className={`tr-row ${r.status}`}>
            <img src={itemIcon({ id: -4, name: r.type, rarity: 1, ilvl: 1, value: 0, slot: RANGED_TYPES.includes(r.type) ? 'ranged' : 'mainhand', weaponType: r.type })} alt="" />
            <div className="tr-main"><b>{r.name}</b>{r.status === 'locked' && <span className="pdim"> · requires level {r.lvl}</span>}</div>
            {r.status === 'known' ? <span className="pdim">Known</span> : (
              <button className="wbtn" disabled={r.status !== 'available' || h.copper < r.cost} onClick={() => { const e = trainWeapon(s, r.type); if (e) toast(e, '#ff4040'); bump() }}>Train <Money copper={r.cost} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
const RANGED_TYPES = ['Bow', 'Gun', 'Crossbow', 'Thrown', 'Wand']

// ---------------------------------------------------------------- Księga umiejętności (wybór skilli)
const GROUP_PL: Record<string, string> = {
  imbue: 'Weapon imbue (one at a time)', seal: 'Seal', aura: 'Aura', blessing: 'Blessing', aspect: 'Aspect', armor: 'Armor',
  curse: 'Curse', shout: 'Shout', eshield: 'Elemental shield (one at a time)', 'totem:earth': 'Earth totem', 'totem:fire': 'Fire totem',
  'totem:water': 'Water totem', 'totem:air': 'Air totem',
}
export function Spellbook({ s, onClose, bump }: { s: GameState; onClose: () => void; bump: () => void }) {
  const h = s.hero
  const c = classById(h.cls)
  const d = stats(h)
  const g = grants(h)
  const known = c.abilities.filter((a) => knows(h, a, g))
  const forms = known.filter((a) => a.kind === 'form')
  const pets = known.filter((a) => a.kind === 'summon')
  const groups = [...new Set(known.filter((a) => a.group).map((a) => a.group!))]
  const rest = known.filter((a) => a.kind !== 'form' && a.kind !== 'summon' && !a.group)
  const locked = c.abilities.filter((a) => !knows(h, a, g) && a.kind !== 'form' && a.kind !== 'summon')
  const toggle = (id: string) => { if (h.disabled[id]) delete h.disabled[id]; else h.disabled[id] = true; bump() }
  const hybrid = isHybrid(h)
  const tipOf = (a: Ability, wrongForm = false) => <div className="tooltip-body"><div className="tt-name">{a.name}</div><div>{a.desc}</div>{abilityInfo(h, a, d).map((l, i) => <div key={i} className="tt-info">{l}</div>)}{a.cost ? <div className="tt-dim">{costOf(h, a, d)} {d.res}</div> : null}{a.cd ? <div className="tt-dim">Cooldown {cdOf(a, d)} s</div> : null}{a.cast ? <div className="tt-dim">{a.cast} s cast</div> : null}{a.aoe ? <div className="tt-dim">AoE: hits the whole group</div> : null}{isMelee(a) ? <div className="tt-dim">Requires melee range</div> : null}{wrongForm ? <div className="tt-dim">Only works in form: {a.form ?? a.forms?.join('/')}</div> : null}</div>
  return (
    <Frame id="spells" title="Spellbook" onClose={onClose} className="spell-frame" icon={menuIcon('spell')}>
      <div className="parchment spells">
        {h.cls === 'druid' && (
          <div className="sp-group">
            <div className="board-sec">Form</div>
            <div className="sp-forms">
              <label><input type="radio" checked={h.form === 'caster'} onChange={() => { h.form = 'caster'; h.res = stats(h).maxRes; bump() }} /> Caster</label>
              {forms.map((f) => <label key={f.id}><input type="radio" checked={h.form === f.form} onChange={() => { h.form = f.form!; h.res = f.form === 'cat' ? 100 : f.form === 'bear' ? 0 : stats(h).maxRes; bump() }} /> {f.name}</label>)}
            </div>
          </div>
        )}
        {pets.length > 0 && (
          <div className="sp-group">
            <div className="board-sec">Demon</div>
            <div className="sp-forms">
              {pets.map((p) => { const id = p.id.replace('summon_', ''); return <label key={p.id}><input type="radio" checked={h.pet === id} onChange={() => { h.pet = id; bump() }} /> {p.name.replace('Summon ', '')} <span className="pdim">({p.desc.split(':')[1]?.trim()})</span></label> })}
            </div>
          </div>
        )}
        {(hybrid || h.cls === 'hunter') && (
          <div className="sp-group">
            <div className="board-sec">Combat style</div>
            <div className="sp-forms col">
              {(h.cls === 'hunter' ? ([['mixed', 'Ranged', 'shoots from range; your pet holds the enemy. Without a pet you switch to your melee weapon when the enemy reaches you'], ['melee', 'Melee', 'runs to the enemy and fights with your melee weapon (Raptor Strike, Mongoose Bite, Wing Clip)']] as const) : ([['mixed', 'Mixed', 'spells from range while the enemy approaches; in melee, weapon strikes and instant spells only'], ['melee', 'Melee', 'runs straight to the enemy, casts instant spells only'], ['caster', 'Caster', 'keeps casting spells in melee too (weapon attacks only when out of mana)']] as const)).map(([k, l, t]) => (
                <label key={k}><input type="radio" checked={(h.mode ?? 'mixed') === k} onChange={() => { h.mode = k; bump() }} /> <b>{l}</b> <span className="pdim">— {t}</span></label>
              ))}
            </div>
          </div>
        )}
        {h.cls === 'hunter' && h.level >= 10 && (
          <div className="sp-group">
            <div className="board-sec">Pet</div>
            <div className="sp-forms">
              <label><input type="radio" checked={!h.disabled.pet} onChange={() => { delete h.disabled.pet; bump() }} /> Your tamed beast fights with you</label>
              <label><input type="radio" checked={!!h.disabled.pet} onChange={() => { h.disabled.pet = true; bump() }} /> No pet <span className="pdim">(Lone Wolf talent: +20% damage)</span></label>
            </div>
          </div>
        )}
        {groups.map((gr) => {
          const members = known.filter((a) => a.group === gr)
          const cur = chosenIn(h, gr, g)
          return (
            <div key={gr} className="sp-group">
              <div className="board-sec">{GROUP_PL[gr] ?? gr}</div>
              <div className="sp-choice">
                {members.map((a) => (
                  <Hover key={a.id} className={`sp-opt ${cur === a.id ? 'on' : ''}`} onClick={() => { h.choice[gr] = a.id; bump() }} tip={tipOf(a, !formOk(h, a))}>
                    <img src={abilityIcon(a, h.cls)} alt="" draggable={false} /><span>{a.name.replace(' Weapon', '').replace(' Totem', '')}</span>
                  </Hover>
                ))}
                <div className={`sp-opt none ${cur === null ? 'on' : ''}`} onClick={() => { h.choice[gr] = 'none'; bump() }}><span>— none</span></div>
              </div>
              {gr.startsWith('totem:') && <div className="pdim small">Totems are placed at the start of a fight and disappear when you move on to the next enemy.</div>}
            </div>
          )
        })}
        <div className="board-sec">Abilities — uncheck to stop your character from using them</div>
        {rest.map((a) => {
          const off = !!h.disabled[a.id]
          const wrongForm = !formOk(h, a)
          return (
            <Hover key={a.id} className={`sp-row ${off ? 'off' : ''} ${wrongForm ? 'wrongform' : ''}`} onClick={() => toggle(a.id)} tip={tipOf(a, wrongForm)}>
              <input type="checkbox" checked={!off} readOnly />
              <img src={abilityIcon(a, h.cls)} alt="" draggable={false} />
              <div className="sp-main"><b>{a.name}</b>{a.talent && <span className="sp-tag">talent</span>}{a.kind === 'buff' || a.kind === 'proc' ? <span className="sp-tag pas">passive</span> : null}{a.cd ? <span className="sp-tag cd">{cdOf(a, d)} s</span> : null}<div className="pdim">{a.desc}</div></div>
            </Hover>
          )
        })}
        <div className="board-sec">Racial ({raceById(h.race).name}) — used automatically</div>
        {raceById(h.race).racials.map((rc) => {
          const id = raceById(h.race).actives.find((x) => RACIAL_ACTIVE[x].name === rc.name)
          const cd = id ? h.cds[id] ?? 0 : 0
          return (
            <div key={rc.name} className="sp-row racial">
              <img src={racialIcon(id ?? 'perception')} alt="" draggable={false} style={id ? undefined : { filter: 'grayscale(.6)' }} />
              <div className="sp-main"><b>{rc.name}</b>{id ? <span className="sp-tag cd">{cd > 0 ? `ready in ${Math.ceil(cd)} s` : 'ready'}</span> : <span className="sp-tag pas">passive</span>}
                <div className="pdim">{id ? RACIAL_ACTIVE[id].text : rc.inGame ?? rc.desc}</div></div>
            </div>
          )
        })}
        {locked.length > 0 && <div className="board-sec">Not learned yet</div>}
        {locked.map((a) => (
          <div key={a.id} className="sp-row locked">
            <img src={abilityIcon(a, h.cls)} alt="" draggable={false} />
            <div className="sp-main"><b>{a.name}</b><div className="pdim">{a.talent ? 'From the talent tree' : `Trainer, level ${a.lvl}${(ranksOf(a)[0] ?? 0) <= h.level ? ` · ${(trainCost(a.lvl) / 100).toFixed(0)} s` : ''}`}</div></div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

// ---------------------------------------------------------------- Talenty
const FX_ICON: Record<string, string> = {}
export function TalentsPanel({ s, onClose, bump, toast }: { s: GameState; onClose: () => void } & Act) {
  const h = s.hero
  const c = classById(h.cls)
  const list = TALENTS[h.cls]
  const total = talentPoints(h.level)
  const free = total - spentTotal(h.talents)
  void FX_ICON
  return (
    <Frame id="talents" title={`Talents — unspent points: ${free}`} onClose={onClose} className="talent-frame" icon={menuIcon('talent')}>
      {h.level < 10 && <div className="dim small center">Your first talent point comes at level 10.</div>}
      <div className="trees">
        {c.trees.map((name, tree) => {
          const spent = spentIn(h.cls, h.talents, tree)
          const tl = list.filter((x) => x.tree === tree)
          return (
            <div key={tree} className={`tree tree${tree}`}>
              <div className="tree-head"><b>{name}</b> <span>{spent}</span></div>
              <div className="tree-grid">
                {Array.from({ length: 7 }, (_, tier) => (
                  <div key={tier} className={`tier ${spent >= tier * 5 ? '' : 'locked'}`}>
                    {Array.from({ length: TALENT_COLS }, (_, col) => {
                      const t = tl.find((x) => x.tier === tier && x.col === col)
                      if (!t) return <div key={col} className="tal empty" />
                      const rank = h.talents[t.id] ?? 0
                      const can = canLearnTalent(h.cls, h.talents, h.level, t.id)
                      const ab = t.grants ? c.abilities.find((a) => a.id === t.grants) : undefined
                      const icon = ab ? abilityIcon(ab, h.cls) : talentIcon(t.fx[0]?.[0], tree)
                      return (
                        <Hover key={col} className={`tal ${rank ? 'has' : ''} ${can ? 'can' : ''} ${rank >= t.max ? 'max' : ''}`} onClick={() => { if (learnTalent(s, t.id)) bump() }}
                          tip={<div className="tooltip-body"><div className="tt-name">{t.name}</div><div className="tt-dim">Rank {rank}/{t.max}{tier ? ` · requires ${tier * 5} points in ${name}` : ''}</div><div>{t.desc}</div>{ab && <div className="tt-dim">Grants ability: {ab.name}</div>}{can && <div style={{ color: '#40ff40' }}>Click to learn</div>}</div>}>
                          <img src={icon} alt="" draggable={false} />
                          <span className="tal-rank">{rank}/{t.max}</span>
                        </Hover>
                      )
                    })}
                  </div>
                ))}
              </div>
              <button className="wbtn small" disabled={!free} onClick={() => { const n = autoTalents(s, tree); toast(`Spent ${n} points in ${name}`); bump() }}>Auto: {name}</button>
            </div>
          )
        })}
      </div>
      <div className="dim small center">Reset talents at a trainer in a capital ({(respecCost(h.level) / 10000).toFixed(2)} g). Talent abilities can be toggled in the spellbook (P).</div>
    </Frame>
  )
}

// ---------------------------------------------------------------- Kronika
export function LogPanel({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <Frame id="log" title="Chronicle" onClose={onClose} className="log-frame" icon={menuIcon('log')}>
      <div className="log">
        {[...s.log].reverse().map((l, i) => (
          <div key={i} style={{ color: l.color }}><span className="dim">{new Date(l.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span> {l.text}</div>
        ))}
      </div>
    </Frame>
  )
}

// ---------------------------------------------------------------- Ustawienia
export function Settings({ s, onClose, onReset, onImport, bump }: { s: GameState; onClose: () => void; onReset: () => void; onImport: (g: GameState) => void; bump: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const [txt, setTxt] = useState('')
  const [msg, setMsg] = useState('')
  const [auto, setAuto] = useState(() => native?.getAutostart() ?? false)
  const [pw, setPw] = useState('')
  const [displays, setDisplays] = useState(() => native?.getDisplays?.() ?? [])
  // ekran zmieniony przeciągnięciem paska na inny monitor: odśwież zaznaczenie
  useEffect(() => native?.onDisplay?.(() => setDisplays(native?.getDisplays?.() ?? [])), [])
  return (
    <Frame id="settings" title="Settings" onClose={onClose} className="settings-frame" icon={menuIcon('gear')}>
      <div className="settings">
        {isAdmin() ? (
          <div className="set-row">
            <span>Game speed (admin):</span>
            {[1, 2, 5, 20].map((n) => <button key={n} className={`wbtn ${s.speed === n ? 'on' : ''}`} onClick={() => { s.speed = n; bump() }}>×{n}</button>)}
            <button className="wbtn" onClick={() => { lockAdmin(); s.speed = 1; bump() }}>Lock</button>
          </div>
        ) : (
          <div className="set-row">
            <span>Test mode:</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="admin password" className="pw" />
            <button className="wbtn" onClick={async () => { if (await unlockAdmin(pw)) { setPw(''); setMsg('Admin mode enabled.') } else setMsg('Wrong password.'); bump() }}>Unlock</button>
          </div>
        )}
        {isOverlay && displays.length > 1 && (
          <div className="set-row">
            <span>Display:</span>
            {displays.map((dd) => <button key={dd.id} className={`wbtn ${dd.current ? 'on' : ''}`} onClick={() => { native?.setDisplay?.(dd.id); setDisplays(native?.getDisplays?.() ?? []) }}>{dd.label}</button>)}
          </div>
        )}
        {isOverlay && displays.length > 1 && <div className="dim small">Change the display here or drag the bar by its ⠿ grip onto another monitor.</div>}
        <div className="set-row">
          <span>UI scale:</span>
          {(['auto', 0.8, 0.9, 1, 1.1] as const).map((v) => <button key={String(v)} className={`wbtn ${layout().scale === v ? 'on' : ''}`} onClick={() => { saveLayout({ scale: v }); bump() }}>{v === 'auto' ? 'Auto' : `${Math.round(v * 100)}%`}</button>)}
        </div>
        <div className="set-row">
          <span>Bar width:</span>
          {(['full', 1500, 1200] as const).map((v) => <button key={String(v)} className={`wbtn ${layout().strip.w === v ? 'on' : ''}`} onClick={() => { saveLayout({ strip: { ...layout().strip, w: v } }); bump() }}>{v === 'full' ? 'Full' : `${v}px`}</button>)}
          <button className="wbtn" onClick={() => { saveLayout({ strip: { x: null, y: null, w: 'full' }, frames: {} }); location.reload() }}>Reset window positions</button>
        </div>
        <div className="dim small">Move the bar with the ⠿ grip on the left; move windows by their title (double-click resets the position).</div>
        <label className="set-row"><input type="checkbox" checked={s.autoAdvance} onChange={(e) => { s.autoAdvance = e.target.checked; bump() }} /> Automatically move on to the next subzone / zone after a boss</label>
        {isOverlay && <label className="set-row"><input type="checkbox" checked={auto} onChange={(e) => { native!.setAutostart(e.target.checked); setAuto(e.target.checked) }} /> Start with Windows</label>}
        <div className="set-row col">
          <span>Save backup (text):</span>
          <div className="row">
            <button className="wbtn" onClick={() => { const t = exportSave(s); navigator.clipboard?.writeText(t).then(() => setMsg('Copied to clipboard.'), () => { setTxt(t); setMsg('Copy the text from the box below.') }) }}>Export</button>
            <button className="wbtn" onClick={() => { const g = importSave(txt); if (g) { onImport(g); setMsg('Save loaded.') } else setMsg('Invalid save.') }}>Import from box</button>
          </div>
          <textarea value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Paste a save here to import" rows={2} />
          {msg && <span className="dim">{msg}</span>}
        </div>
        <div className="set-row">
          {!confirm ? <button className="wbtn red" onClick={() => setConfirm(true)}>New character…</button> : (
            <><span>Delete {s.hero.name} forever?</span><button className="wbtn red" onClick={onReset}>Yes, delete</button><button className="wbtn" onClick={() => setConfirm(false)}>Cancel</button></>
          )}
        </div>
        <div className="dim small">The game keeps running while closed: up to 8 h of fighting, and further hours (up to a week) give Rested XP. Full bags mean lost loot, so visit a vendor now and then.</div>
        {isOverlay && <button className="wbtn" onClick={() => native?.quit()}>Quit game</button>}
      </div>
    </Frame>
  )
}

export { ItemTooltip }
export function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
