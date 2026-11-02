import { useState } from 'react'
import { TALENTS, TALENT_COLS, talentPoints, spentIn, spentTotal, canLearnTalent, respecCost } from '../data/talents'
import { learnTalent, autoTalents, resetTalents } from '../game/talents'
import { grants, knows, formOk, chosenIn } from '../game/formulas'
import { layout, saveLayout, startDrag, uiScale } from './layout'
import { classById, ranksOf, trainCost, isMelee, WEAPON_SKILL_PL, type Ability } from '../data/classes'
import { raceById } from '../data/races'
import { zoneById } from '../data/zones'
import { stats, costOf, cdOf, isHybrid } from '../game/sim'
import { exportSave, importSave } from '../game/save'
import { isAdmin, unlockAdmin, lockAdmin } from '../game/admin'
import { LEFT_SLOTS, RIGHT_SLOTS, WEAPON_SLOTS, SLOT_PL, type EquipSlot, type GameState, type Quest } from '../game/types'
import { segmentsOf, equipFromInv, unequip, sortBags, BACKPACK, capacity, usedSlots } from '../game/inventory'
import { rightClickInv, rightClickEquip } from './itemActions'
import { boardFor, acceptQuest, abandonQuest, questReady, questXp, MAX_QUESTS } from '../game/quests'
import { trainerRows, train, trainAll, sellJunk, buyBag, turnIn, placeName, buyBack, buyFood, restock, weaponRows, trainWeapon } from '../game/town'
import { BAGS_FOR_SALE, FOODS, canWear, makeFood } from '../game/items'
import { townOf, capitalOf } from '../game/world'
import { abilityIcon, itemIcon, menuIcon, talentIcon } from '../render/icons'
import { Frame, Hover, ItemSlotBox, ItemTooltip, Money, Portrait } from './common'
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
      <ItemSlotBox item={h.equip[sl]} hero={h} empty={SLOT_PL[sl]} hint="przeciągnij do torby lub PPM: zdejmij · klik: wybierz z toreb" drag={{ k: 'eq', slot: sl }} drop={`eq:${sl}`}
        onClick={() => setFly(fly === sl ? null : sl)} onRight={() => { report(toast, rightClickEquip(s, sl)); bump() }} />
      {fits(sl).length > 0 && <span className="pd-has">{fits(sl).length}</span>}
    </div>
  )
  const opts = fly ? fits(fly) : []
  const tip = statTips(h, d)
  const known = h.weaponSkills.map((w) => WEAPON_SKILL_PL[w] ?? w)
  return (
    <Frame id="char" title={h.name} onClose={onClose} className="char-frame" icon={menuIcon('char')}>
      <div className="char-sub">Level {h.level} {r.name} <span style={{ color: c.color }}>{c.name}</span>{h.cls === 'druid' && h.form !== 'caster' ? ` · ${h.form === 'bear' ? 'Bear Form' : h.form === 'cat' ? 'Cat Form' : 'Moonkin Form'}` : ''}{h.wellFed ? <span className="wellfed"> · Well Fed ({Math.ceil(h.wellFed.left / 60)} min)</span> : null}</div>
      <div className="paperdoll">
        <div className="pd-col">{LEFT_SLOTS.map(slot)}</div>
        <div className="pd-model">
          <Portrait race={h.race} cls={h.cls} width={170} height={230} level={h.level} />
          {fly && (
            <div className="flyout">
              <div className="fly-head">{SLOT_PL[fly]}: wybierz z toreb</div>
              <div className="fly-items">
                {opts.map(({ it, i }) => (
                  <ItemSlotBox key={it!.id} item={it} hero={h} hint="kliknij, aby założyć" onClick={() => {
                    const forced = fly === 'finger1' || fly === 'finger2' || fly === 'trinket1' || fly === 'trinket2' ? fly : undefined
                    const e = equipFromInv(h, i, forced); if (e) toast(e, '#ff4040'); setFly(null); bump()
                  }} />
                ))}
                {!opts.length && <span className="dim small">Brak pasujących przedmiotów w torbach.</span>}
              </div>
              <div className="fly-foot">
                {h.equip[fly] && <button className="wbtn small" onClick={() => { const e = unequip(h, fly); if (e) toast(e, '#ff4040'); setFly(null); bump() }}>Zdejmij</button>}
                <button className="wbtn small" onClick={() => setFly(null)}>Zamknij</button>
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
          <Row k="Attack Power" v={d.ap} tip={tip.ap} /><Row k="Crit" v={pct(d.crit)} tip={tip.crit} /><Row k="Spell Crit" v={pct(d.spellCrit)} tip={tip.spellCrit} /><Row k="Dodge" v={pct(Math.min(0.75, d.dodge))} tip={tip.dodge} />
        </div>
      </div>
      <Hover className="weapon-skills" tip={<div className="tooltip-body"><div className="tt-name">Umiejętności broni</div><div>{known.join(', ')}</div><div className="tt-dim">Kolejnych typów nauczysz się u Weapon Mastera w stolicy.</div></div>}>
        <span className="dim small">Broń: {known.join(', ')}</span>
      </Hover>
    </Frame>
  )
}
const Row = ({ k, v, tip }: { k: string; v: number | string; tip?: string[] }) => (
  <Hover className="srow" tip={tip ? <div className="tooltip-body"><div className="tt-name">{k} {v}</div>{tip.map((t, i) => <div key={i} className={i ? 'tt-dim' : ''}>{t}</div>)}</div> : null}>
    <span>{k}:</span><b>{v}</b>
  </Hover>
)

// Objaśnienia atrybutów (jak tooltipy w oknie postaci w grze), liczone tymi samymi wzorami co symulacja
function statTips(h: GameState['hero'], d: ReturnType<typeof stats>): Record<string, string[]> {
  const c = classById(h.cls)
  const L = h.level
  const cat = h.cls === 'druid' && h.form === 'cat'
  const f1 = (x: number) => (x * 100).toFixed(2) + '%'
  const apStr = h.cls === 'hunter' ? 0 : h.cls === 'rogue' || cat ? 1 : 2
  const apAgi = h.cls === 'hunter' ? 2 : h.cls === 'rogue' || cat ? 1 : 0
  const critDiv = h.cls === 'rogue' || h.cls === 'hunter' || cat ? 29 : 20
  const hpMul = 1 + (L / 60) * 0.7
  const staHp = Math.round((Math.min(20, d.sta) + 10 * Math.max(0, d.sta - 20)) * hpMul)
  const intMana = Math.min(20, d.int) + 15 * Math.max(0, d.int - 20)
  const perTick = h.cls === 'mage' || h.cls === 'priest' ? 12.5 + d.spi / 4 : 15 + d.spi / 5
  const inCombat = Math.min(1, (d.m.regen ?? 0) + (d.m.castRegen ?? 0))
  const drL = d.dr(L), drUp = d.dr(L + 3)
  const armorOnly = (lvl: number) => d.armor / (d.armor + 400 + 85 * lvl)
  const caster = c.style === 'caster' || h.cls === 'priest'
  const hybrid = h.cls === 'shaman' || h.cls === 'paladin'
  return {
    str: [apStr ? `Zwiększa siłę ataku o ${Math.round(d.str * apStr)} (${apStr} AP za punkt).` : 'Twoja klasa nie zyskuje siły ataku z Strength.', ...(hybrid ? ['Połowa Strength i Intellect wzmacnia też czary.'] : [])],
    agi: [`Trafienia krytyczne: +${f1(d.agi / critDiv / 100)}.`, `Unik: +${f1(d.agi / 20 / 100)}.`, `Pancerz: +${d.agi * 2}.`, ...(apAgi ? [`Siła ataku: +${d.agi * apAgi}.`] : []), ...(c.style === 'ranged' || h.cls === 'rogue' ? ['Wzmacnia też umiejętności (główny atrybut).'] : [])],
    sta: [`Zwiększa zdrowie o ${staHp} (10 HP za punkt powyżej 20, rośnie z poziomem).`],
    int: [...(d.res === 'mana' || c.resource === 'mana' ? [`Mana: +${intMana} (15 za punkt powyżej 20).`] : ['Twoja klasa nie używa many.']), `Krytyki czarów: +${f1(d.int / 60 / 100)}.`, ...(caster ? [`Moc czarów: +${Math.round(((d.int + d.spi * 0.3) / 260) * 100)}%.`] : [])],
    spi: [c.resource === 'mana' || h.cls === 'druid' ? `Regeneracja many poza walką: ${(perTick / 2).toFixed(1)} na sekundę.` : 'Spirit przyspiesza odpoczynek.', inCombat > 0 ? `W walce: ${Math.round(inCombat * 100)}% tej regeneracji.` : 'W walce (5 s po czarze) mana się nie odnawia.'],
    armor: [`Zmniejsza obrażenia fizyczne od wroga na twoim poziomie (${L}) o ${f1(armorOnly(L))}.`, `Przeciw wrogowi +3 poziomy: ${f1(armorOnly(L + 3))}.`, ...(drL > armorOnly(L) + 0.001 ? [`Razem z talentami i buffami: ${f1(drL)} (wróg +3: ${f1(drUp)}).`] : [])],
    hp: [`Ze Stamina: ${staHp}. Reszta z klasy i poziomu.`, 'Zdrowie odnawiasz jedząc podczas odpoczynku.'],
    res: d.res === 'mana' ? [`Z Intellect: ${intMana}.`, 'Manę odnawiasz pijąc podczas odpoczynku.'] : d.res === 'rage' ? ['Rage rośnie, gdy zadajesz i otrzymujesz ciosy; poza walką opada.'] : ['Energy odnawia się 10 na sekundę.'],
    ap: [`Zwiększa obrażenia broni o ${(d.ap / 14).toFixed(1)} DPS.`, `Broń: ${d.weaponDps.toFixed(1)} DPS, szybkość ${d.weaponSpeed.toFixed(2)}.`],
    crit: ['Szansa na podwójne obrażenia ciosów i strzałów.', `Z Agility: ${f1(d.agi / critDiv / 100)}, baza 5%, reszta z talentów i buffów.`],
    spellCrit: ['Szansa na 150% obrażeń / leczenia czarem.', `Z Intellect: ${f1(d.int / 60 / 100)}.`],
    dodge: ['Szansa na uniknięcie ciosu wroga (maks. 75%).', `Z Agility: ${f1(d.agi / 20 / 100)}.`],
  }
}

// ---------------------------------------------------------------- Torby
export function BagsPanel({ s, onClose, bump, toast }: { s: GameState; onClose: () => void } & Act) {
  const h = s.hero
  // każda torba ma własne przesunięcie (domyślnie stos przy prawej krawędzi), zapisywane w układzie
  const key = (i: number) => `bag${i}`
  const [offs, setOffs] = useState<Record<string, { dx: number; dy: number }>>(() => Object.fromEntries([0, 1, 2, 3, 4].map((i) => [key(i), layout().frames[key(i)] ?? { dx: 0, dy: 0 }])))
  const offRef = { current: offs }
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
      <div key={i} className="bagwin" data-solid style={{ transform: `translate(${o.dx}px, ${o.dy}px)` }}>
        <div className="bagwin-head" title="Przeciągnij, żeby przesunąć tę torbę (dwuklik: wróć na miejsce)"
          onDoubleClick={() => { const n = { ...offRef.current, [key(i)]: { dx: 0, dy: 0 } }; setOffs(n); saveLayout({ frames: { ...layout().frames, [key(i)]: { dx: 0, dy: 0 } } }) }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return
            const b0 = offRef.current[key(i)] ?? { dx: 0, dy: 0 }
            let last = b0
            startDrag(e, (dx, dy) => { last = { dx: b0.dx + dx / uiScale(), dy: b0.dy + dy / uiScale() }; setOffs((cur) => ({ ...cur, [key(i)]: last })) },
              () => saveLayout({ frames: { ...layout().frames, [key(i)]: last } }))
          }}>
          <img src={itemIcon(i === 0 ? { id: -1, name: 'Backpack', rarity: 1, ilvl: 1, value: 0, bagSize: 16 } : h.bags[i - 1]!)} alt="" draggable={false} /><span>{name}</span>
          {i === 0 && <button className="wbtn small" title="Sortuj torby" onClick={() => { sortBags(h); bump() }}>Sortuj</button>}
          {i === 0 && <button className="wbtn small" title="Złącz wszystkie torby z powrotem przy prawej krawędzi" onClick={() => { const z = { dx: 0, dy: 0 }; const n = Object.fromEntries([0, 1, 2, 3, 4].map((k) => [key(k), z])); setOffs(n); const fr = { ...layout().frames }; for (const k of Object.keys(n)) fr[k] = z; saveLayout({ frames: fr }) }}>Złącz</button>}
          {i === 0 && <button className="wclose" onClick={onClose}>✕</button>}
        </div>
        <div className="bagwin-grid">
          {seg.map((it, k) => {
            const idx = start + k
            const hint = vendor ? (it?.quest ? 'przedmiot zadania' : 'PPM: sprzedaj · przeciągnij do kupca') : it?.food?.kind === 'buff' ? 'PPM: zjedz' : it?.slot || it?.bagSize ? 'PPM: załóż · przeciągnij' : 'przeciągnij, aby przenieść'
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
export function QuestLog({ s, onClose, bump }: { s: GameState; onClose: () => void } & Act) {
  const [sel, setSel] = useState<string | null>(s.quests[0]?.id ?? null)
  const q = s.quests.find((x) => x.id === sel) ?? s.quests[0]
  const byZone = new Map<string, Quest[]>()
  for (const x of s.quests) byZone.set(x.zone, [...(byZone.get(x.zone) ?? []), x])
  return (
    <Frame id="quests" title={`Quest Log (${s.quests.length}/${MAX_QUESTS})`} onClose={onClose} className="quest-frame" icon={menuIcon('quest')}>
      <div className="parchment ql">
        <div className="ql-list">
          {!s.quests.length && <div className="pdim">Brak zadań. Zbierasz je w mieście mapy (przycisk ⌂ na pasku).</div>}
          {[...byZone.entries()].map(([z, qs]) => (
            <div key={z}>
              <div className="ql-zone">{zoneById(z).name}</div>
              {qs.map((x) => (
                <div key={x.id} className={`ql-item ${x.id === q?.id ? 'sel' : ''}`} onClick={() => setSel(x.id)}>
                  <span className="ql-lvl">[{x.level}]</span> {x.title} {questReady(x) ? <span className="ql-done">(Gotowe)</span> : <span className="ql-cnt">{x.have}/{x.need}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        {q && (
          <div className="ql-detail">
            <h3>{q.title}</h3>
            <p>{q.text}</p>
            <h4>Cel</h4>
            <p>{q.kind === 'collect' ? `${q.item}: ${q.have}/${q.need}` : `${q.target} zabity: ${q.have}/${q.need}`}</p>
            {questReady(q) && <p className="ql-turnin">Oddaj w: <b>{townOf(zoneById(q.zone), s.hero.faction)}</b></p>}
            <h4>Nagroda</h4>
            <p>{questXp(s, q).toLocaleString('pl-PL')} XP · <Money copper={q.copper} /></p>
            {q.reward && <div className="ql-reward"><ItemSlotBox item={q.reward} hero={s.hero} /><span style={{ color: ['#9d9d9d', '#fff', '#1eff00', '#0070dd', '#a335ee'][q.reward.rarity] }}>{q.reward.name}</span></div>}
            <button className="wbtn" onClick={() => { abandonQuest(s, q.id); setSel(null); bump() }}>Porzuć</button>
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
  const tabs: [Tab, string][] = capital ? [['vendor', 'Kupiec'], ['trainer', 'Trener'], ['weapons', 'Weapon Master']] : [['quests', 'Zadania'], ['vendor', 'Kupiec']]
  return (
    <Frame id="city" title={placeName(s)} onClose={onLeave} className="city-frame" icon={menuIcon(capital ? 'capital' : 'town')}>
      <div className="tabs">
        {tabs.map(([k, l]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        <button className="wbtn right" onClick={onLeave}>Wyjdź z miasta</button>
      </div>
      {tab === 'quests' && <QuestBoard s={s} bump={bump} toast={toast} />}
      {tab === 'trainer' && <Trainer s={s} bump={bump} toast={toast} />}
      {tab === 'vendor' && <Vendor s={s} bump={bump} toast={toast} />}
      {tab === 'weapons' && <WeaponMaster s={s} bump={bump} toast={toast} />}
      {!capital && <div className="dim small">Trener i Weapon Master są w stolicy ({capitalOf(s)}).</div>}
    </Frame>
  )
}

function QuestBoard({ s, bump, toast }: { s: GameState } & Act) {
  const board = boardFor(s, s.loc.zone)
  const ready = s.quests.filter((q) => q.zone === s.loc.zone && questReady(q))
  const other = s.quests.filter((q) => q.zone !== s.loc.zone && questReady(q))
  return (
    <div className="parchment board">
      {ready.length > 0 && <div className="board-sec">Do oddania</div>}
      {ready.map((q) => (
        <div key={q.id} className="board-q ready">
          <span className="qmark">?</span>
          <div className="bq-main"><b>{q.title}</b><div className="pdim">{questXp(s, q)} XP · <Money copper={q.copper} />{q.reward ? ` · [${q.reward.name}]` : ''}</div></div>
          <button className="wbtn" onClick={() => { const e = turnIn(s, q); if (e) toast(e, '#ff4040'); else toast(`Ukończono: ${q.title}`); bump() }}>Oddaj</button>
        </div>
      ))}
      <div className="board-sec">Dostępne zadania</div>
      {!board.length && <div className="pdim">Brak nowych zadań. Pokonaj minibossa, żeby odblokować kolejną podstrefę.</div>}
      {board.map((q) => (
        <div key={q.id} className="board-q">
          <span className="qmark">!</span>
          <div className="bq-main"><b>[{q.level}] {q.title}</b><div className="pdim">{q.text}</div><div className="pdim">{questXp(s, q)} XP · <Money copper={q.copper} />{q.reward ? <> · <span style={{ color: '#1e8a00' }}>[{q.reward.name}]</span></> : null}</div></div>
          <button className="wbtn" disabled={s.quests.length >= MAX_QUESTS} onClick={() => { acceptQuest(s, q); bump() }}>Przyjmij</button>
        </div>
      ))}
      {board.length > 1 && <button className="wbtn" disabled={s.quests.length >= MAX_QUESTS} onClick={() => { for (const q of board) acceptQuest(s, q); bump() }}>Przyjmij wszystkie</button>}
      {other.length > 0 && <div className="pdim">Gotowe zadania z innych map oddasz w ich miastach: {[...new Set(other.map((q) => townOf(zoneById(q.zone), s.hero.faction)))].join(', ')}.</div>}
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
      <div className="tr-head"><span>{c.name} Trainer</span><span>Twoje pieniądze: <Money copper={h.copper} /></span></div>
      <div className="tr-list">
        {rows.map((r) => {
          const a = c.abilities.find((x) => x.id === r.id)!
          return (
            <div key={r.id} className={`tr-row ${r.status}`}>
              <img src={abilityIcon(a, h.cls)} alt="" />
              <div className="tr-main"><b>{r.name}</b> <span className="pdim">Rank {r.rank}{r.status === 'locked' ? ` · od poziomu ${r.rankLvl}` : ''}</span><div className="pdim">{a.desc}</div></div>
              {r.status === 'known' ? <span className="pdim">Znane</span> : r.status === 'available' ? (
                <button className="wbtn" disabled={h.copper < r.cost} onClick={() => { const e = train(s, r.id); if (e) toast(e, '#ff4040'); bump() }}>Ucz <Money copper={r.cost} /></button>
              ) : <span className="pdim"><Money copper={r.cost} /></span>}
            </div>
          )
        })}
      </div>
      <div className="tr-foot">
        <button className="wbtn" disabled={!spentTotal(h.talents)} onClick={() => { const e = resetTalents(s); toast(e ?? 'Talenty zresetowane', e ? '#ff4040' : '#ffd100'); bump() }}>Reset talentów (<Money copper={respecCost(h.level)} />)</button>
        <button className="wbtn" disabled={!avail.length} onClick={() => { const n = trainAll(s); toast(n ? `Nauczono ${n} rang` : 'Za mało pieniędzy', n ? '#ffd100' : '#ff4040'); bump() }}>Ucz wszystkiego (<Money copper={total} />)</button>
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
  return (
    <div className="parchment vendor" data-drop="vendor">
      <div className="tr-head"><span>General Goods</span><span><Money copper={h.copper} /></span></div>
      <div className="pdim">Sprzedaż: prawy przycisk na przedmiocie w torbie albo przeciągnij go tutaj.</div>
      <div className="vend-actions">
        <button className="wbtn" disabled={!junk} onClick={() => { const v = sellJunk(s); toast(`Sprzedano śmieci za ${(v / 100).toFixed(2)} s`, '#fff'); bump() }}>Sprzedaj szare (<Money copper={junk} />)</button>
        <button className="wbtn" onClick={() => { const v = restock(s, 1); toast(v ? 'Uzupełniono jedzenie i picie' : 'Masz już zapas (albo brak pieniędzy)', '#fff'); bump() }}>Uzupełnij jedzenie i picie</button>
      </div>
      <div className="tabs small">
        {([['goods', 'Jedzenie i picie'], ['bags', 'Torby'], ['buyback', `Odkup (${s.buyback.length})`]] as const).map(([k, l]) => <button key={k} className={`tab ${sub === k ? 'on' : ''}`} onClick={() => setSub(k)}>{l}</button>)}
      </div>
      {sub === 'goods' && goods.map((f) => {
        const locked = f.lvl > h.level
        const it = makeFood(-3, f)
        return (
          <div key={f.name} className={`tr-row ${locked ? 'locked' : 'available'}`}>
            <ItemSlotBox item={it} hero={h} size={32} />
            <div className="tr-main"><b>{f.name}</b> <span className="pdim">{f.kind === 'food' ? 'Jedzenie' : f.kind === 'drink' ? 'Picie' : 'Jedzenie z buffem'} · poz. {f.lvl}{have(f.name) ? ` · masz ${have(f.name)}` : ''}</span>
              <div className="pdim">{f.kind === 'buff' ? `${f.buff!.text} (15 min, PPM w torbie)` : `${f.amt} ${f.kind === 'food' ? 'zdrowia' : 'many'} przy odpoczynku`}</div></div>
            <span className="vend-buy">
              <Money copper={f.price} />
              {[1, 5, 20].map((n) => <button key={n} className="wbtn small" disabled={h.copper < f.price * n} onClick={() => buy(f.name, n)}>×{n}</button>)}
            </span>
          </div>
        )
      })}
      {sub === 'bags' && BAGS_FOR_SALE.map((b) => (
        <div key={b.size} className="tr-row available">
          <img src={itemIcon({ id: -2, name: b.name, rarity: 1, ilvl: 1, value: 0, bagSize: b.size })} alt="" />
          <div className="tr-main"><b>{b.name}</b><div className="pdim">{b.size} Slot Bag</div></div>
          <button className="wbtn" disabled={h.copper < b.price} onClick={() => { const e = buyBag(s, b.size); if (e) toast(e, '#ff4040'); bump() }}>Kup <Money copper={b.price} /></button>
        </div>
      ))}
      {sub === 'buyback' && (
        <>
          {!s.buyback.length && <div className="pdim">Nic jeszcze nie sprzedano. Tu trafia 10 ostatnio sprzedanych przedmiotów.</div>}
          {s.buyback.map((it, i) => (
            <div key={`${it.id}-${i}`} className="tr-row available">
              <ItemSlotBox item={it} hero={h} size={32} />
              <div className="tr-main"><b style={{ color: ['#9d9d9d', '#333', '#1e8a00', '#0050a0', '#7a2aa0'][it.rarity] }}>{it.name}</b>{(it.count ?? 1) > 1 && <span className="pdim"> ×{it.count}</span>}</div>
              <button className="wbtn" disabled={h.copper < it.value * (it.count ?? 1)} onClick={() => { const e = buyBack(s, i); if (e) toast(e, '#ff4040'); bump() }}>Odkup <Money copper={it.value * (it.count ?? 1)} /></button>
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
      <div className="tr-head"><span>Weapon Master</span><span>Twoje pieniądze: <Money copper={h.copper} /></span></div>
      <div className="pdim">Typy broni, których {classById(h.cls).name} może się nauczyć (jak w WoW Classic). Bez umiejętności nie założysz takiej broni.</div>
      <div className="tr-list">
        {rows.map((r) => (
          <div key={r.type} className={`tr-row ${r.status}`}>
            <img src={itemIcon({ id: -4, name: r.type, rarity: 1, ilvl: 1, value: 0, slot: RANGED_TYPES.includes(r.type) ? 'ranged' : 'mainhand', weaponType: r.type })} alt="" />
            <div className="tr-main"><b>{r.name}</b>{r.status === 'locked' && <span className="pdim"> · od poziomu {r.lvl}</span>}</div>
            {r.status === 'known' ? <span className="pdim">Znane</span> : (
              <button className="wbtn" disabled={r.status !== 'available' || h.copper < r.cost} onClick={() => { const e = trainWeapon(s, r.type); if (e) toast(e, '#ff4040'); bump() }}>Ucz <Money copper={r.cost} /></button>
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
  imbue: 'Nasycenie broni (tylko jedno naraz)', seal: 'Pieczęć', aura: 'Aura', blessing: 'Błogosławieństwo', aspect: 'Aspekt', armor: 'Pancerz',
  curse: 'Klątwa', shout: 'Okrzyk', eshield: 'Tarcza żywiołu (tylko jedna)', 'totem:earth': 'Totem ziemi', 'totem:fire': 'Totem ognia',
  'totem:water': 'Totem wody', 'totem:air': 'Totem powietrza',
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
  const tipOf = (a: Ability, wrongForm = false) => <div className="tooltip-body"><div className="tt-name">{a.name}</div><div>{a.desc}</div>{a.cost ? <div className="tt-dim">{costOf(h, a, d)} {d.res}</div> : null}{a.cd ? <div className="tt-dim">Cooldown {cdOf(a, d)} s</div> : null}{a.cast ? <div className="tt-dim">Rzucanie {a.cast} s</div> : null}{a.aoe ? <div className="tt-dim">Obszarowe: trafia całą grupę</div> : null}{isMelee(a) ? <div className="tt-dim">Wymaga zwarcia</div> : null}{wrongForm ? <div className="tt-dim">Działa tylko w formie: {a.form ?? a.forms?.join('/')}</div> : null}</div>
  return (
    <Frame id="spells" title="Spellbook" onClose={onClose} className="spell-frame" icon={menuIcon('spell')}>
      <div className="parchment spells">
        {h.cls === 'druid' && (
          <div className="sp-group">
            <div className="board-sec">Forma</div>
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
        {hybrid && (
          <div className="sp-group">
            <div className="board-sec">Styl walki</div>
            <div className="sp-forms col">
              {([['mixed', 'Mieszany', 'czary z dystansu, gdy wróg nadchodzi; w zwarciu ciosy wręcz i tylko natychmiastowe czary'], ['melee', 'Wręcz', 'od razu biegnie do wroga, rzuca tylko natychmiastowe czary'], ['caster', 'Czarami', 'trzyma dystans i rzuca czary także w zwarciu (ciosy wręcz tylko bez many)']] as const).map(([k, l, t]) => (
                <label key={k}><input type="radio" checked={(h.mode ?? 'mixed') === k} onChange={() => { h.mode = k; bump() }} /> <b>{l}</b> <span className="pdim">— {t}</span></label>
              ))}
            </div>
          </div>
        )}
        {h.cls === 'hunter' && h.level >= 10 && (
          <div className="sp-group">
            <div className="board-sec">Pupil</div>
            <div className="sp-forms">
              <label><input type="radio" checked={!h.disabled.pet} onChange={() => { delete h.disabled.pet; bump() }} /> Oswojona bestia walczy z tobą</label>
              <label><input type="radio" checked={!!h.disabled.pet} onChange={() => { h.disabled.pet = true; bump() }} /> Bez pupila <span className="pdim">(talent Lone Wolf: +20% obrażeń)</span></label>
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
                <div className={`sp-opt none ${cur === null ? 'on' : ''}`} onClick={() => { h.choice[gr] = 'none'; bump() }}><span>— żadne</span></div>
              </div>
              {gr.startsWith('totem:') && <div className="pdim small">Totem stawiasz na początku walki; znika, gdy odchodzisz do kolejnego wroga.</div>}
            </div>
          )
        })}
        <div className="board-sec">Umiejętności — odznacz, żeby postać ich nie używała</div>
        {rest.map((a) => {
          const off = !!h.disabled[a.id]
          const wrongForm = !formOk(h, a)
          return (
            <Hover key={a.id} className={`sp-row ${off ? 'off' : ''} ${wrongForm ? 'wrongform' : ''}`} onClick={() => toggle(a.id)} tip={tipOf(a, wrongForm)}>
              <input type="checkbox" checked={!off} readOnly />
              <img src={abilityIcon(a, h.cls)} alt="" draggable={false} />
              <div className="sp-main"><b>{a.name}</b>{a.talent && <span className="sp-tag">talent</span>}{a.kind === 'buff' || a.kind === 'proc' ? <span className="sp-tag pas">pasywna</span> : null}{a.cd ? <span className="sp-tag cd">{cdOf(a, d)} s</span> : null}<div className="pdim">{a.desc}</div></div>
            </Hover>
          )
        })}
        {locked.length > 0 && <div className="board-sec">Jeszcze nieznane</div>}
        {locked.map((a) => (
          <div key={a.id} className="sp-row locked">
            <img src={abilityIcon(a, h.cls)} alt="" draggable={false} />
            <div className="sp-main"><b>{a.name}</b><div className="pdim">{a.talent ? 'Z drzewka talentów' : `Trener, od poziomu ${a.lvl}${(ranksOf(a)[0] ?? 0) <= h.level ? ` · ${(trainCost(a.lvl) / 100).toFixed(0)} s` : ''}`}</div></div>
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
    <Frame id="talents" title={`Talenty — wolne punkty: ${free}`} onClose={onClose} className="talent-frame" icon={menuIcon('spell')}>
      {h.level < 10 && <div className="dim small center">Pierwszy punkt talentu na 10 poziomie.</div>}
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
                          tip={<div className="tooltip-body"><div className="tt-name">{t.name}</div><div className="tt-dim">Ranga {rank}/{t.max}{tier ? ` · wymaga ${tier * 5} pkt w ${name}` : ''}</div><div>{t.desc}</div>{ab && <div className="tt-dim">Daje umiejętność: {ab.name}</div>}{can && <div style={{ color: '#40ff40' }}>Kliknij, aby nauczyć</div>}</div>}>
                          <img src={icon} alt="" draggable={false} />
                          <span className="tal-rank">{rank}/{t.max}</span>
                        </Hover>
                      )
                    })}
                  </div>
                ))}
              </div>
              <button className="wbtn small" disabled={!free} onClick={() => { const n = autoTalents(s, tree); toast(`Rozdano ${n} pkt w ${name}`); bump() }}>Auto: {name}</button>
            </div>
          )
        })}
      </div>
      <div className="dim small center">Reset talentów u trenera w mieście ({(respecCost(h.level) / 10000).toFixed(2)} g). Umiejętności z talentów włączysz/wyłączysz w księdze (P).</div>
    </Frame>
  )
}

// ---------------------------------------------------------------- Kronika
export function LogPanel({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <Frame id="log" title="Kronika" onClose={onClose} className="log-frame" icon={menuIcon('log')}>
      <div className="log">
        {[...s.log].reverse().map((l, i) => (
          <div key={i} style={{ color: l.color }}><span className="dim">{new Date(l.time).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span> {l.text}</div>
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
  return (
    <Frame id="settings" title="Ustawienia" onClose={onClose} className="settings-frame" icon={menuIcon('gear')}>
      <div className="settings">
        {isAdmin() ? (
          <div className="set-row">
            <span>Prędkość gry (admin):</span>
            {[1, 2, 5, 20].map((n) => <button key={n} className={`wbtn ${s.speed === n ? 'on' : ''}`} onClick={() => { s.speed = n; bump() }}>×{n}</button>)}
            <button className="wbtn" onClick={() => { lockAdmin(); s.speed = 1; bump() }}>Zablokuj</button>
          </div>
        ) : (
          <div className="set-row">
            <span>Tryb testowy:</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="hasło administratora" className="pw" />
            <button className="wbtn" onClick={async () => { if (await unlockAdmin(pw)) { setPw(''); setMsg('Tryb administratora włączony.') } else setMsg('Złe hasło.'); bump() }}>Odblokuj</button>
          </div>
        )}
        {isOverlay && displays.length > 1 && (
          <div className="set-row">
            <span>Ekran:</span>
            {displays.map((dd) => <button key={dd.id} className={`wbtn ${dd.current ? 'on' : ''}`} onClick={() => { native?.setDisplay?.(dd.id); setDisplays(native?.getDisplays?.() ?? []) }}>{dd.label}</button>)}
          </div>
        )}
        <div className="set-row">
          <span>Skala interfejsu:</span>
          {(['auto', 0.8, 0.9, 1, 1.1] as const).map((v) => <button key={String(v)} className={`wbtn ${layout().scale === v ? 'on' : ''}`} onClick={() => { saveLayout({ scale: v }); bump() }}>{v === 'auto' ? 'Auto' : `${Math.round(v * 100)}%`}</button>)}
        </div>
        <div className="set-row">
          <span>Szerokość paska:</span>
          {(['full', 1500, 1200] as const).map((v) => <button key={String(v)} className={`wbtn ${layout().strip.w === v ? 'on' : ''}`} onClick={() => { saveLayout({ strip: { ...layout().strip, w: v } }); bump() }}>{v === 'full' ? 'Pełna' : `${v}px`}</button>)}
          <button className="wbtn" onClick={() => { saveLayout({ strip: { x: null, y: null, w: 'full' }, frames: {} }); location.reload() }}>Resetuj położenie okien</button>
        </div>
        <div className="dim small">Pasek przesuniesz, łapiąc uchwyt ⠿ po lewej stronie; okna łapiąc za tytuł (dwuklik przywraca miejsce).</div>
        <label className="set-row"><input type="checkbox" checked={s.autoAdvance} onChange={(e) => { s.autoAdvance = e.target.checked; bump() }} /> Automatycznie idź do następnej podstrefy / mapy po bossie</label>
        {isOverlay && <label className="set-row"><input type="checkbox" checked={auto} onChange={(e) => { native!.setAutostart(e.target.checked); setAuto(e.target.checked) }} /> Uruchamiaj razem z Windowsem</label>}
        <div className="set-row col">
          <span>Kopia zapisu (tekst):</span>
          <div className="row">
            <button className="wbtn" onClick={() => { const t = exportSave(s); navigator.clipboard?.writeText(t).then(() => setMsg('Skopiowano do schowka.'), () => { setTxt(t); setMsg('Skopiuj tekst z pola poniżej.') }) }}>Eksportuj</button>
            <button className="wbtn" onClick={() => { const g = importSave(txt); if (g) { onImport(g); setMsg('Wczytano zapis.') } else setMsg('Niepoprawny zapis.') }}>Importuj z pola</button>
          </div>
          <textarea value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Wklej tu zapis do importu" rows={2} />
          {msg && <span className="dim">{msg}</span>}
        </div>
        <div className="set-row">
          {!confirm ? <button className="wbtn red" onClick={() => setConfirm(true)}>Nowa postać…</button> : (
            <><span>Usunąć {s.hero.name} na zawsze?</span><button className="wbtn red" onClick={onReset}>Tak, usuń</button><button className="wbtn" onClick={() => setConfirm(false)}>Anuluj</button></>
          )}
        </div>
        <div className="dim small">Gra liczy się także, gdy jest zamknięta: do 8 h walki, a dalsze godziny (do tygodnia) dają Rested XP. Pełne torby = łup przepada, więc zaglądaj do kupca w stolicy.</div>
        {isOverlay && <button className="wbtn" onClick={() => native?.quit()}>Zamknij grę</button>}
      </div>
    </Frame>
  )
}

export { ItemTooltip }
export function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
