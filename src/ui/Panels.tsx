import { useState } from 'react'
import { TALENTS, talentPoints, spentIn, spentTotal, canLearnTalent, respecCost } from '../data/talents'
import { learnTalent, autoTalents, resetTalents } from '../game/talents'
import { grants, knows, formOk } from '../game/formulas'
import { layout, saveLayout, startDrag, uiScale } from './layout'
import { classById, ranksOf, trainCost } from '../data/classes'
import { raceById } from '../data/races'
import { zoneById } from '../data/zones'
import { stats, activePet, costOf } from '../game/sim'
import { exportSave, importSave } from '../game/save'
import { LEFT_SLOTS, RIGHT_SLOTS, WEAPON_SLOTS, SLOT_PL, type EquipSlot, type GameState, type Quest } from '../game/types'
import { segmentsOf, equipFromInv, unequip, unequipBag, BACKPACK, capacity, usedSlots } from '../game/inventory'
import { boardFor, acceptQuest, abandonQuest, questReady, questXp, MAX_QUESTS } from '../game/quests'
import { trainerRows, train, trainAll, sellAt, sellJunk, buyBag, turnIn, placeName } from '../game/town'
import { BAGS_FOR_SALE, canWear, targetSlot } from '../game/items'
import { townOf, capitalOf } from '../game/world'
import { abilityIcon, itemIcon, menuIcon, talentIcon } from '../render/icons'
import { Frame, Hover, ItemSlotBox, ItemTooltip, Money, Portrait } from './common'
import { isOverlay, native } from '../platform'

type Act = { bump: () => void; toast: (t: string, c?: string) => void }

// ---------------------------------------------------------------- Postać
const SLOT_KIND: Partial<Record<EquipSlot, string[]>> = { finger1: ['finger'], finger2: ['finger'], trinket1: ['trinket'], trinket2: ['trinket'], mainhand: ['mainhand', 'twohand'] }
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
      <ItemSlotBox item={h.equip[sl]} hero={h} empty={SLOT_PL[sl]} hint="kliknij: zmień / zdejmij" onClick={() => setFly(fly === sl ? null : sl)} />
      {fits(sl).length > 0 && <span className="pd-has">{fits(sl).length}</span>}
    </div>
  )
  const opts = fly ? fits(fly) : []
  return (
    <Frame id="char" title={h.name} onClose={onClose} className="char-frame" icon={menuIcon('char')}>
      <div className="char-sub">Level {h.level} {r.name} <span style={{ color: c.color }}>{c.name}</span>{h.cls === 'druid' && h.form !== 'caster' ? ` · ${h.form === 'bear' ? 'Bear Form' : h.form === 'cat' ? 'Cat Form' : 'Moonkin Form'}` : ''}</div>
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
          <Row k="Strength" v={d.str} /><Row k="Agility" v={d.agi} /><Row k="Stamina" v={d.sta} /><Row k="Intellect" v={d.int} /><Row k="Spirit" v={d.spi} /><Row k="Armor" v={d.armor} />
        </div>
        <div className="stat-box">
          <Row k="Health" v={d.maxHp} /><Row k={d.res === 'mana' ? 'Mana' : d.res === 'rage' ? 'Rage' : 'Energy'} v={d.maxRes} />
          <Row k="Attack Power" v={d.ap} /><Row k="Crit" v={pct(d.crit)} /><Row k="Spell Crit" v={pct(d.spellCrit)} /><Row k="Dodge" v={pct(Math.min(0.75, d.dodge))} />
        </div>
      </div>
      <label className="auto-eq"><input type="checkbox" checked={s.autoEquip} onChange={(e) => { s.autoEquip = e.target.checked; bump() }} /> Automatycznie zakładaj lepsze przedmioty z łupu</label>
    </Frame>
  )
}
const Row = ({ k, v }: { k: string; v: number | string }) => <div className="srow"><span>{k}:</span><b>{v}</b></div>

// ---------------------------------------------------------------- Torby
export function BagsPanel({ s, onClose, bump, toast }: { s: GameState; onClose: () => void } & Act) {
  const h = s.hero
  const [off, setOff] = useState(layout().frames.bags ?? { dx: 0, dy: 0 })
  const offRef = { current: off }
  const segs = segmentsOf(h)
  const vendor = s.where === 'capital'
  let base = 0
  const blocks = segs.map((seg, i) => {
    const off = base
    base += i === 0 ? BACKPACK : h.bags[i - 1]?.bagSize ?? 0
    if (i > 0 && !h.bags[i - 1]) return null
    const name = i === 0 ? 'Backpack' : h.bags[i - 1]!.name
    return (
      <div key={i} className="bagwin" data-solid>
        <div className="bagwin-head" onPointerDown={(e) => { if ((e.target as HTMLElement).closest('button')) return; const base = offRef.current; startDrag(e, (dx, dy) => setOff({ dx: base.dx + dx / uiScale(), dy: base.dy + dy / uiScale() }), () => saveLayout({ frames: { ...layout().frames, bags: offRef.current } })) }}>
          <img src={itemIcon(i === 0 ? { id: -1, name: 'Backpack', rarity: 1, ilvl: 1, value: 0, bagSize: 16 } : h.bags[i - 1]!)} alt="" draggable={false} /><span>{name}</span>
          {i > 0 && <button className="wbtn small" title="" onClick={() => { const e = unequipBag(h, i - 1); if (e) toast(e, '#ff4040'); else toast(`${name} zdjęta do plecaka${vendor ? ' — możesz ją sprzedać' : ''}`, '#fff'); bump() }}>Zdejmij</button>}
          {i === 0 && <button className="wclose" onClick={onClose}>✕</button>}
        </div>
        <div className="bagwin-grid">
          {seg.map((it, k) => (
            <ItemSlotBox key={k} item={it} hero={h} hint={vendor ? 'kliknij, aby sprzedać' : it?.slot || it?.bagSize ? 'kliknij, aby założyć' : undefined}
              onClick={() => {
                if (!it) return
                const idx = off + k
                if (vendor) { const v = sellAt(s, idx); toast(`Sprzedano za ${(v / 100).toFixed(2)} s`, '#ffffff') }
                else { const e = equipFromInv(h, idx); if (e) toast(e, '#ff4040') }
                bump()
              }} />
          ))}
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
  return <div className="bags-stack" style={{ transform: `translate(${off.dx}px, ${off.dy}px)` }} onDoubleClick={(e) => { if ((e.target as HTMLElement).closest('.bagwin-head')) { setOff({ dx: 0, dy: 0 }); saveLayout({ frames: { ...layout().frames, bags: { dx: 0, dy: 0 } } }) } }}>{blocks}</div>
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
  const [tab, setTab] = useState<'quests' | 'trainer' | 'vendor'>(capital ? 'trainer' : 'quests')
  const tabs: ['quests' | 'trainer' | 'vendor', string][] = capital ? [['trainer', 'Trener'], ['vendor', 'Kupiec']] : [['quests', 'Zadania'], ['trainer', 'Trener']]
  return (
    <Frame id="city" title={placeName(s)} onClose={onLeave} className="city-frame" icon={menuIcon(capital ? 'capital' : 'town')}>
      <div className="tabs">
        {tabs.map(([k, l]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        <button className="wbtn right" onClick={onLeave}>Wyjdź z miasta</button>
      </div>
      {tab === 'quests' && <QuestBoard s={s} bump={bump} toast={toast} />}
      {tab === 'trainer' && <Trainer s={s} bump={bump} toast={toast} />}
      {tab === 'vendor' && <Vendor s={s} bump={bump} toast={toast} />}
      {!capital && <div className="dim small">Kupiec jest tylko w stolicy ({capitalOf(s)}).</div>}
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
  const junk = h.inv.filter((x) => x && x.rarity === 0).reduce((a, x) => a + x!.value * (x!.count ?? 1), 0)
  return (
    <div className="parchment vendor">
      <div className="tr-head"><span>General Goods</span><span><Money copper={h.copper} /></span></div>
      <div className="pdim">Kliknij przedmiot w torbach, żeby go sprzedać.</div>
      <div className="vend-actions">
        <button className="wbtn" disabled={!junk} onClick={() => { const v = sellJunk(s); toast(`Sprzedano śmieci za ${(v / 100).toFixed(2)} s`, '#fff'); bump() }}>Sprzedaj szare (<Money copper={junk} />)</button>
      </div>
      <div className="board-sec">Torby</div>
      {BAGS_FOR_SALE.map((b) => (
        <div key={b.size} className="tr-row available">
          <img src={itemIcon({ id: -2, name: b.name, rarity: 1, ilvl: 1, value: 0, bagSize: b.size })} alt="" />
          <div className="tr-main"><b>{b.name}</b><div className="pdim">{b.size} Slot Bag</div></div>
          <button className="wbtn" disabled={h.copper < b.price} onClick={() => { const e = buyBag(s, b.size); if (e) toast(e, '#ff4040'); bump() }}>Kup <Money copper={b.price} /></button>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Księga umiejętności (wybór skilli)
export function Spellbook({ s, onClose, bump }: { s: GameState; onClose: () => void; bump: () => void }) {
  const h = s.hero
  const c = classById(h.cls)
  const d = stats(h)
  const g = grants(h)
  const known = c.abilities.filter((a) => knows(h, a, g))
  const forms = known.filter((a) => a.kind === 'form')
  const pets = known.filter((a) => a.kind === 'summon')
  const rest = known.filter((a) => a.kind !== 'form' && a.kind !== 'summon')
  const locked = c.abilities.filter((a) => !knows(h, a, g) && a.kind !== 'form' && a.kind !== 'summon')
  const toggle = (id: string) => { if (h.disabled[id]) delete h.disabled[id]; else h.disabled[id] = true; bump() }
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
        <div className="board-sec">Umiejętności — odznacz, żeby postać ich nie używała</div>
        {rest.map((a) => {
          const off = !!h.disabled[a.id]
          const wrongForm = !formOk(h, a)
          return (
            <Hover key={a.id} className={`sp-row ${off ? 'off' : ''} ${wrongForm ? 'wrongform' : ''}`} onClick={() => toggle(a.id)}
              tip={<div className="tooltip-body"><div className="tt-name">{a.name}</div><div>{a.desc}</div>{a.cost ? <div className="tt-dim">{costOf(h, a, d)} {d.res}</div> : null}{a.cd ? <div className="tt-dim">Cooldown {a.cd} s</div> : null}{a.aoe ? <div className="tt-dim">Obszarowe: trafia całą grupę</div> : null}{wrongForm ? <div className="tt-dim">Działa tylko w formie: {a.form}</div> : null}</div>}>
              <input type="checkbox" checked={!off} readOnly />
              <img src={abilityIcon(a, h.cls)} alt="" draggable={false} />
              <div className="sp-main"><b>{a.name}</b>{a.talent && <span className="sp-tag">talent</span>}{a.kind === 'buff' || a.kind === 'proc' ? <span className="sp-tag pas">pasywna</span> : null}<div className="pdim">{a.desc}</div></div>
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
                    {Array.from({ length: 3 }, (_, col) => {
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
  return (
    <Frame id="settings" title="Ustawienia" onClose={onClose} className="settings-frame" icon={menuIcon('gear')}>
      <div className="settings">
        <div className="set-row">
          <span>Prędkość gry (test):</span>
          {[1, 2, 5, 20].map((n) => <button key={n} className={`wbtn ${s.speed === n ? 'on' : ''}`} onClick={() => { s.speed = n; bump() }}>×{n}</button>)}
        </div>
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
