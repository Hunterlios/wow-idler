// Rdzeń gry: czysta funkcja kroku symulacji (bez DOM). Ten sam kod liczy grę na żywo,
// progres offline i testy balansu.
import { classById, isMelee, startSkills, type Ability, type Cond, type PetDef, type School } from '../data/classes'
import { raceById, type RaceId } from '../data/races'
import type { ClassId } from '../data/classes'
import { zoneById, ROUTES } from '../data/zones'
import { basePower, derive, dmgMult, grants, knows, active, chosenIn, mobStats, mobXp, rageConv, resourceOf, styleOf, hasRanged, hasWand, modeOf, xpToNext, MAX_LEVEL, spellValue, spCoef, type Derived } from './formulas'
import { makeGear, makeJunk, makeBag, starterGear, makeQuestItem, makeFood, FOODS, damageGear } from './items'
import { attackTable, trySkillUp, skillOf } from './wskill'
import { RACIAL_ACTIVE, type RacialId } from '../data/races'
import { addToInv, fixInv, countItems, autoEquip, equipUpgrades } from './inventory'
import { muleTick, sendMule } from './companions'
import { syncQuests } from './quests'
import { makeRng, type Rng } from './rng'
import { subsOf, subOf, progOf, subMobs, subLevels, killsNeeded, bossLevel, bossLook, routeZones, nextRouteZone, planTrip, portsOf, knownOf, SUB_WALK } from './world'
import type { GameEvent, GameState, Hero, Item, MobState, OfflineSummary } from './types'
import { HEAL_DEFAULT } from './types'
import { ranksOf } from '../data/classes'

export const TICK = 0.1
export const OFFLINE_SIM_CAP = 8 * 3600
export const OFFLINE_CAP = 7 * 24 * 3600

type Emit = (e: GameEvent) => void
const noop: Emit = () => {}

// ------------------------------------------------------------------ tworzenie postaci
export function newGame(name: string, race: RaceId, cls: ClassId, seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0): GameState {
  const r = raceById(race)
  const hero: Hero = {
    name, race, cls, faction: r.faction, level: 1, xp: 0, rested: 0, hp: 1, res: 0, cp: 0, copper: 0,
    equip: {}, bags: [null, null, null, null], inv: [], trained: {}, talents: {}, disabled: {}, form: 'caster', pet: 'imp', temp: {},
    choice: {}, totems: [], weaponSkills: startSkills(classById(cls)), wskill: Object.fromEntries(startSkills(classById(cls)).map((w) => [w, 5])), eating: null, wellFed: null, stacks: {}, heroDodged: false,
    cds: {}, buffs: {}, casting: null, hot: null, shield: 0, gcd: 0, swing: 0, sinceCast: 99, petSwing: 0,
  }
  for (const it of starterGear(hero)) hero.equip[it.slot === 'twohand' ? 'mainhand' : (it.slot as keyof Hero['equip'])] = it
  for (const a of classById(cls).abilities) if (a.lvl === 1 && !a.talent) hero.trained[a.id] = 1
  fixInv(hero)
  // na start trochę jedzenia i picia, jak w Classicu
  addToInv(hero, makeFood(7, FOODS[0], 8))
  if (classById(cls).resource === 'mana') addToInv(hero, makeFood(8, FOODS[6], 8))
  const d = derive(hero)
  hero.hp = d.maxHp
  hero.res = d.res === 'rage' ? 0 : d.maxRes
  const start = r.start.zone
  const s: GameState = {
    v: 4, seed, itemSeq: 10, hero, start, loc: { zone: start, sub: 0 }, where: 'field', prog: { [start]: { cleared: 0, kills: 0 } },
    unlocked: [start], autoAdvance: true, autoEquip: false, v0914: true, trip: null, phase: 'walk', phaseT: 2, mob: null, quests: [], questsDone: [], buyback: [],
    totals: { kills: 0, deaths: 0, copper: 0, xp: 0, items: 0, quests: 0, played: 0, bosses: 0 }, log: [], savedAt: Date.now(), speed: 1, v0910: true,
  }
  const parent = zoneById(start).parent
  log(s, `${name} wakes up in ${r.start.area}${parent ? ` (${zoneById(parent).name})` : ''}. Quests await in ${r.start.settlement}.`, '#ffd100')
  return s
}

export const currentZone = (s: GameState) => zoneById(s.loc.zone)
export const route = (s: GameState) => ROUTES[s.start]

export function log(s: GameState, text: string, color?: string) {
  s.log.push({ time: Date.now(), text, color })
  if (s.log.length > 150) s.log.splice(0, s.log.length - 150)
}

export const hasRacial = (h: Hero, id: RacialId) => raceById(h.race).actives.includes(id)
function racial(s: GameState, id: RacialId, emit: Emit) {
  const h = s.hero
  const r = RACIAL_ACTIVE[id]
  h.cds[id] = r.cd
  if (r.dur) h.buffs[id] = r.dur
  emit({ t: 'racial', name: r.name })
}
const racialReady = (h: Hero, id: RacialId) => hasRacial(h, id) && !(h.cds[id] > 0)

export function learnableCount(h: Hero) {
  let n = 0
  for (const a of classById(h.cls).abilities) {
    if (a.talent) continue
    for (const r of ranksOf(a)) if (r <= h.level && r > (h.trained[a.id] ?? 0)) n++
  }
  return n
}

const dcache = new WeakMap<Hero, { key: string; d: Derived }>()
export function stats(h: Hero): Derived {
  const temps = Object.entries(h.temp ?? {}).filter(([, v]) => v > 0).map(([k]) => k).join(',')
  const key = `${h.level}|${Object.values(h.equip).map((i) => i?.id).join(',')}|${(h.buffs.bloodfury ?? 0) > 0}|${(h.buffs.stoneform ?? 0) > 0}|${(h.buffs.berserking ?? 0) > 0}|${Object.values(h.trained).join(',')}|${JSON.stringify(h.talents)}|${JSON.stringify(h.disabled)}|${h.form}|${temps}|${(h.totems ?? []).map((t) => t.id).join('.')}|${h.wellFed && h.wellFed.left > 0 ? h.wellFed.name : ''}|${JSON.stringify(h.choice)}|${Object.values(h.equip).map((i) => (i?.dur === 0 ? 'x' : '')).join('')}|${(h.buffs.perception ?? 0) > 0}|${h.stacks?.berserk ?? 0}`
  const c = dcache.get(h)
  if (c && c.key === key) return c.d
  const d = derive(h)
  dcache.set(h, { key, d })
  return d
}

// ------------------------------------------------------------------ pupile
// Pupil jest, ale mógł paść (czeka na wskrzeszenie / przywołanie)
export function activePet(h: Hero): PetDef | null {
  if ((h.petCd ?? 0) > 0) return null
  return petDef(h)
}
// Ile zdrowia ma pupil: tank (bestia łowcy, Voidwalker) prawie tyle co postać, reszta połowę
export function petMaxHp(h: Hero, d = stats(h)) {
  const p = petDef(h)
  if (!p) return 0
  return Math.round(d.maxHp * (p.tank ? (h.cls === 'hunter' ? 0.9 : 1.05) : 0.5))
}
export const PET_CD = 60
export function petDef(h: Hero): PetDef | null {
  const pets = classById(h.cls).pets
  if (!pets) return null
  const d = stats(h)
  if ((d.m.noPet ?? 0) > 0) return null
  if (h.cls === 'hunter' && h.disabled.pet) return null
  if (h.cls === 'warlock') {
    const want = pets.find((p) => p.id === h.pet && h.level >= p.lvl && (h.trained[`summon_${p.id}`] ?? 0) > 0)
    return want ?? pets.find((p) => p.id === 'imp') ?? null
  }
  return pets.find((p) => h.level >= p.lvl) ?? null
}

// ------------------------------------------------------------------ pętla
export function advance(s: GameState, seconds: number, emit: Emit = noop, dt = TICK) {
  const rng = makeRng(s.seed)
  let left = seconds
  while (left > 1e-9) {
    const step = Math.min(dt, left)
    tick(s, step, rng, emit)
    left -= step
  }
  s.seed = rng.seed()
}

function tick(s: GameState, dt: number, rng: Rng, emit: Emit) {
  const h = s.hero
  const d = stats(h)
  s.totals.played += dt
  for (const k in h.cds) if (h.cds[k] > 0) h.cds[k] -= dt
  for (const k in h.buffs) if (h.buffs[k] > 0) h.buffs[k] -= dt
  for (const k in h.temp) if (h.temp[k] > 0) h.temp[k] -= dt
  if (h.wellFed) { h.wellFed.left -= dt; if (h.wellFed.left <= 0) { h.wellFed = null; log(s, 'Well Fed has worn off.', '#aaaaaa') } }
  h.sinceCast += dt
  h.gcd = Math.max(0, h.gcd - dt)
  if (!s.mob && h.cp) h.cp = 0 // bez celu nie ma punktów kombinacji
  // pupil: powrót po śmierci, regeneracja poza walką (w mieście pełne zdrowie)
  const pd = petDef(h)
  if (pd) {
    const pmax = petMaxHp(h, d)
    if ((h.petCd ?? 0) > 0) {
      h.petCd! -= dt
      if (h.petCd! <= 0) { h.petCd = 0; h.petHp = Math.round(pmax * 0.6); emit({ t: 'petback', name: pd.name }); log(s, h.cls === 'hunter' ? `You revive ${pd.name}.` : `You summon your ${pd.name} again.`, '#69ccf0') }
    } else {
      if (h.petHp == null || h.petHp > pmax) h.petHp = pmax
      if (s.where !== 'field') h.petHp = pmax
      else if (s.phase !== 'fight') h.petHp = Math.min(pmax, h.petHp + pmax * (s.phase === 'rest' ? 0.04 : 0.02) * dt)
    }
  }

  muleTick(s, dt, log)
  if (s.where !== 'field') {
    s.phase = 'town'
    h.hp = d.maxHp
    if (d.res === 'mana') h.res = d.maxRes
    h.totems = []
    return
  }
  if (s.phase === 'town') { s.phase = 'walk'; s.phaseT = 1.5 }

  if (d.res === 'energy') h.res = Math.min(100, h.res + 10 * dt * (1 + (d.m.energy ?? 0)))
  else if (d.res === 'rage') { if (s.phase !== 'fight') h.res = Math.max(0, h.res - 2 * dt) }
  else {
    const perTick = h.cls === 'mage' || h.cls === 'priest' ? 12.5 + d.spi / 4 : 15 + d.spi / 5
    const inCombatPct = Math.min(1, (d.m.regen ?? 0) + (d.m.castRegen ?? 0))
    const k = h.sinceCast >= 5 ? 1 : inCombatPct
    h.res = Math.min(d.maxRes, h.res + (perTick / 2) * dt * k + ((d.m.mp5 ?? 0) / 5) * dt) // mp5 działa też w trakcie rzucania
  }
  if (h.hot) {
    h.hot.left -= dt
    h.hot.tickIn -= dt
    if (h.hot.tickIn <= 0) { heal(h, d, h.hot.perTick, emit, 'HoT'); h.hot.tickIn += 3 }
    if (h.hot.left <= 0) h.hot = null
  }
  totemTick(s, d, dt, emit)

  switch (s.phase) {
    case 'walk':
      // odejście od totemów: znikają razem z buffem (chyba że Totemic Projection je przeniesie)
      if (h.totems.length) leaveTotems(s, d, emit)
      regenOut(h, d, dt, 0.008)
      s.phaseT -= dt
      if (s.phaseT <= 0) spawn(s, rng, emit)
      break
    case 'fight':
      if (!s.mob) { s.phase = 'walk'; s.phaseT = 1; break }
      fight(s, d, dt, rng, emit)
      break
    case 'heal': {
      // leczenie czarem po walce (Holy Light, Healing Wave, Heal...): widać pasek rzucania i leczenie
      if (h.casting) {
        h.casting.left -= dt * d.haste
        if (h.casting.left <= 0) {
          const a = classById(h.cls).abilities.find((x) => x.id === h.casting!.id)!
          h.casting = null
          castHeal(h, d, a, emit)
          h.gcd = 1.5
        }
        break
      }
      if (h.gcd > 0) break
      const a = h.hp < d.maxHp * Math.max(0.9, (h.heal ?? HEAL_DEFAULT).after / 100) ? pickHeal(h, d) : null
      if (!a) { afterFight(s, d, rng, emit); break }
      const ct = castTime(h, d, a)
      emit({ t: 'cast', ability: a.name, school: a.school, kind: a.kind })
      if (ct > 0) h.casting = { id: a.id, left: ct, total: ct }
      else { castHeal(h, d, a, emit); h.gcd = 1.5 }
      break
    }
    case 'rest': {
      // bez jedzenia i picia odpoczynek trwa dużo dłużej
      const race = 1 + (raceById(h.race).mods.regenPct ?? 0)
      const e = h.eating
      const eat = e && e.left > 0
      // klasy z leczeniem leczą się czarem po walce (talenty leczenia skracają odpoczynek)
      const selfHeal = 0
      h.hp = Math.min(d.maxHp, h.hp + (d.maxHp * (0.018 * race + selfHeal) + (eat ? e!.hp : 0)) * dt)
      if (d.res === 'mana') h.res = Math.min(d.maxRes, h.res + (d.maxRes * 0.02 + (eat ? e!.mana : 0)) * dt)
      if (e) e.left -= dt
      const full = h.hp >= d.maxHp * 0.98 && (d.res !== 'mana' || h.res >= d.maxRes * 0.98) && (!activePet(h)?.tank || (h.petHp ?? 0) >= petMaxHp(h, d) * 0.9)
      if (full) { s.phase = 'walk'; s.phaseT = 1 + rng.next() * 2; h.eating = null }
      break
    }
    case 'dead':
      h.totems = []
      s.phaseT -= dt
      if (s.phaseT <= 0) {
        h.hp = d.maxHp * 0.5
        if (d.res === 'mana') h.res = d.maxRes * 0.5
        s.phase = 'rest'
        startRest(s, d)
        emit({ t: 'revive' })
      }
      break
    case 'travel':
      h.totems = []
      regenOut(h, d, dt, 0.05)
      s.phaseT -= dt
      // mapy po drodze odkrywają się, gdy przez nie przechodzisz
      if (s.trip?.path) {
        const el = s.trip.total - s.phaseT
        for (const w of s.trip.path) if (w.at <= el && w.zone !== s.trip.dest?.zone && !s.unlocked.includes(w.zone)) {
          s.unlocked.push(w.zone)
          progOf(s, w.zone)
          log(s, `Discovered on the way: ${zoneById(w.zone).name} (${zoneById(w.zone).min}-${zoneById(w.zone).max})`, '#69ccf0')
        }
      }
      if (s.phaseT <= 0) arrive(s, emit)
      break
  }
}

function regenOut(h: Hero, d: Derived, dt: number, pct: number) {
  h.hp = Math.min(d.maxHp, h.hp + d.maxHp * pct * dt * (1 + (raceById(h.race).mods.regenPct ?? 0)))
}

// Czar leczący do użycia po walce: znany, włączony, gotowy, na który stać postać (mana > 25%)
function pickHeal(h: Hero, d: Derived): Ability | null {
  if (d.res !== 'mana' || h.res < d.maxRes * 0.25) return null
  const g = grants(h)
  const miss = d.maxHp - h.hp
  const list = classById(h.cls).abilities.filter((a) => a.kind === 'heal' && !a.healPct && active(h, a, g) && !(h.cds[a.id] > 0) && h.res >= costOf(h, a, d))
  if (!list.length) return null
  // najmniejsze leczenie, które pokrywa brak zdrowia; inaczej najmocniejsze
  const amt = (a: Ability) => healAmount(h, d, a)
  const fit = list.filter((a) => amt(a) >= miss * 0.8).sort((a, b) => amt(a) - amt(b))
  return fit[0] ?? list.sort((a, b) => amt(b) - amt(a))[0]
}
export function healAmount(h: Hero, d: Derived, a: Ability) {
  const bp = basePower(a.talent ? h.level : Math.min(h.level, h.trained[a.id] ?? h.level))
  return spellValue(d, bp, a.power ?? 1, spCoef(a)) * (1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0))
}
function castHeal(h: Hero, d: Derived, a: Ability, emit: Emit) {
  h.res = Math.max(0, h.res - costOf(h, a, d))
  h.sinceCast = 0
  if (a.cd) h.cds[a.id] = cdOf(a, d)
  heal(h, d, healAmount(h, d, a), emit, a.name)
}

// Leczenie poza walką: % max HP na sekundę dla klas, które znają czar leczący
export function healerRest(h: Hero, d: Derived) {
  const g = grants(h)
  const heals = classById(h.cls).abilities.filter((a) => (a.kind === 'heal' || a.kind === 'hot') && !a.healPct && knows(h, a, g) && !h.disabled[a.id])
  if (!heals.length || d.res !== 'mana') return 0
  const ab = Math.max(...heals.map((a) => d.m[`ab:${a.id}`] ?? 0))
  const cast = Math.max(...heals.map((a) => d.m[`cast:${a.id}`] ?? 0))
  return 0.025 * (1 + 3 * (d.m.heal ?? 0) + ab + cast)
}

// ------------------------------------------------------------------ jedzenie i picie
let lastFoodWarn = -1e9
export function bestFood(h: Hero, kind: 'food' | 'drink') {
  let best = -1
  h.inv.forEach((it, i) => { if (it?.food?.kind === kind && it.food.lvl <= h.level && (best < 0 || it.food.lvl > h.inv[best]!.food!.lvl)) best = i })
  return best
}
function consume(h: Hero, idx: number) {
  const it = h.inv[idx]!
  if ((it.count ?? 1) > 1) it.count = (it.count ?? 1) - 1
  else h.inv[idx] = null
  return it
}
// Naprawa zepsutych przedmiotów zestawem z toreb (jak jedzenie: postać robi to sama przy odpoczynku)
let lastKitWarn = -1e9
function kitRepair(s: GameState) {
  const h = s.hero
  const broken = Object.values(h.equip).filter((it): it is Item => !!it && it.dur === 0)
  if (!broken.length) return
  const fixed: string[] = []
  let missing = false
  for (const it of broken) {
    // najtańszy zestaw, który wystarczy na poziom przedmiotu
    let best = -1
    h.inv.forEach((x, i) => { if (x?.kit && x.kit >= it.ilvl && (best < 0 || x.kit < h.inv[best]!.kit!)) best = i })
    if (best < 0) { missing = true; continue }
    consume(h, best)
    delete it.dur
    fixed.push(it.name)
  }
  if (fixed.length) { log(s, `Repaired with a kit: ${fixed.join(', ')}.`, '#c0c0ff'); dcache.delete(h) }
  if (missing && s.totals.played - lastKitWarn > 300) {
    lastKitWarn = s.totals.played
    log(s, 'Broken gear and no suitable repair kit in your bags. Buy one from a vendor (or repair everything there).', '#ff9040')
  }
}

function startRest(s: GameState, d: Derived) {
  const h = s.hero
  kitRepair(s)
  const needHp = h.hp < d.maxHp * 0.9
  const needMana = d.res === 'mana' && h.res < d.maxRes * 0.9
  h.eating = { hp: 0, mana: 0, left: 15 }
  let missing = false
  if (needHp) {
    const i = bestFood(h, 'food')
    if (i >= 0) h.eating.hp = Math.max(consume(h, i).food!.amt * 1.3, d.maxHp * 0.3) / 15
    else if (racialReady(h, 'cannibalize')) { h.eating.hp = (d.maxHp * 0.35) / 10; h.cds.cannibalize = 120 }
    else missing = true
  }
  if (needMana) {
    const i = bestFood(h, 'drink')
    if (i >= 0) h.eating.mana = Math.max(consume(h, i).food!.amt * 1.1, d.maxRes * 0.3) / 15
    else missing = true
  }
  if (missing && s.totals.played - lastFoodWarn > 300) {
    lastFoodWarn = s.totals.played
    log(s, `No ${needHp && needMana ? 'food or drink' : needHp ? 'food' : 'drink'} in your bags: resting takes longer. Buy some from a vendor.`, '#ff9040')
  }
}
// Jedzenie z buffem (klik w torbie): jeden Well Fed naraz
export function useItem(s: GameState, idx: number): string | null {
  const h = s.hero
  const it = h.inv[idx]
  if (!it?.food) return null
  if (it.food.lvl > h.level) return `Requires level ${it.food.lvl}.`
  if (it.food.kind !== 'buff') return 'Your character eats and drinks automatically while resting.'
  if (s.phase === 'fight') return 'You can\'t eat in combat.'
  if (s.phase === 'dead' || h.hp <= 0) return 'You can\'t eat while dead.'
  consume(h, idx)
  h.wellFed = { name: it.name, fx: it.food.buff!.fx, left: WELL_FED }
  log(s, `${it.name}: Well Fed (${it.food.buff!.text}, 15 min).`, '#40ff40')
  return null
}
const WELL_FED = 15 * 60

// ------------------------------------------------------------------ totemy
function totemTick(s: GameState, d: Derived, dt: number, emit: Emit) {
  const h = s.hero
  if (!h.totems.length) return
  const abs = classById(h.cls).abilities
  for (const t of h.totems) {
    t.left -= dt
    const a = abs.find((x) => x.id === t.id)
    if (!a?.tick) continue
    t.tickIn -= dt
    if (t.tickIn > 0) continue
    t.tickIn += a.tick.every
    const bp = basePower(Math.min(h.level, h.trained[a.id] ?? h.level))
    if (a.tick.power && s.phase === 'fight' && s.mob && s.mob.dist <= 0) {
      const n = a.aoe ? Math.min(3, aliveOf(s.mob)) : 1
      hitMob(s, d, spellValue(d, bp, a.tick.power, spCoef(a)) * dmgMult(d, a, false) * n, false, emit, a.school ?? 'fire', a.name)
    }
    if (a.tick.heal) heal(h, d, spellValue(d, bp, a.tick.heal, spCoef(a)) * (1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)), emit, a.name)
    if (a.tick.mana && d.res === 'mana') h.res = Math.min(d.maxRes, h.res + d.maxRes * a.tick.mana * (1 + (d.m[`ab:${a.id}`] ?? 0)))
  }
  h.totems = h.totems.filter((t) => t.left > 0)
}
function leaveTotems(s: GameState, d: Derived, emit: Emit) {
  const h = s.hero
  const proj = classById(h.cls).abilities.find((a) => a.id === 'totemic_projection')
  if (proj && knows(h, proj) && !h.disabled[proj.id] && !(h.cds[proj.id] > 0) && d.res === 'mana' && h.res > d.maxRes * 0.25) {
    h.res -= d.maxRes * 0.1
    h.cds[proj.id] = 60
    emit({ t: 'totem', name: 'Totemic Projection' })
    return
  }
  h.totems = []
}
function placeTotem(h: Hero, a: Ability) {
  h.totems = h.totems.filter((t) => t.el !== a.totem)
  h.totems.push({ id: a.id, el: a.totem!, left: 300, tickIn: a.tick ? 0.5 : 0 })
}
// wybrane totemy, których jeszcze nie ma
function missingTotems(h: Hero, g = grants(h)) {
  const out: Ability[] = []
  for (const el of ['earth', 'fire', 'water', 'air']) {
    if (h.totems.some((t) => t.el === el)) continue
    const id = chosenIn(h, `totem:${el}`, g)
    const a = id ? classById(h.cls).abilities.find((x) => x.id === id) : undefined
    if (a && !h.disabled[a.id]) out.push(a)
  }
  return out
}

// ------------------------------------------------------------------ bossowie i moby
export function bossState(s: GameState) {
  const p = progOf(s)
  const n = subsOf(s.loc.zone).length
  const frontier = s.loc.sub === p.cleared && p.cleared < n
  const need = killsNeeded(s.loc.zone, s.loc.sub)
  const lvl = bossLevel(s.loc.zone, s.loc.sub)
  // po przegranej z bossem wraca on dopiero po chwili (postęp zostaje, a ty zbierasz doświadczenie)
  const wait = Math.max(0, (p.bossAt ?? 0) - s.totals.played)
  const held = p.bossHold != null && s.hero.level <= p.bossHold
  return { frontier, need, kills: Math.min(need, p.kills), full: p.kills >= need && wait <= 0 && !held, wait, lvl, held, holdLvl: (p.bossHold ?? 0) + 1 }
}

export const aliveOf = (m: MobState) => Math.max(1, Math.min(m.count, Math.ceil(m.hp / m.per - 1e-6)))

function spawn(s: GameState, rng: Rng, emit: Emit) {
  const h = s.hero
  kitRepair(s) // między walkami: zepsuty przedmiot naprawiany zestawem z toreb
  const zoneId = s.loc.zone
  const z = zoneById(zoneId)
  const sub = s.loc.sub
  const style = styleOf(h)
  const b = bossState(s)
  const r = raceById(h.race)
  // wróg podchodzi: postać walcząca wręcz biegnie mu naprzeciw (krótko); kto ma czary/strzały z dystansu,
  // czeka i rzuca je, zanim wróg dojdzie
  // postać walcząca wręcz biegnie wrogowi naprzeciw (spotkanie w połowie drogi: dystans 2.4 przy podwójnej prędkości zbliżania)
  const dist = closesIn(h) ? 2.4 : 4.5
  if (b.frontier && b.full) {
    const look = bossLook(zoneId, sub)
    const zoneBoss = subOf(s).zoneBoss
    const ms = mobStats(b.lvl)
    const hp = Math.round(ms.hp * (zoneBoss ? 3.6 : 2.4))
    s.mob = { name: look.name, type: look.type, color: look.color, lvl: b.lvl, hp, maxHp: hp, per: hp, dmg: ms.dmg * (zoneBoss ? 1.35 : 1.2), speed: ms.speed, swing: 1.2, dots: [], stun: 0, dodged: false, count: 1, boss: zoneBoss ? 'zone' : 'mini', dist, dist0: dist, cc: 0, slow: 0, ranged: RANGED_MOB.test(look.name) }
    emit({ t: 'spawn', mob: look.name, lvl: b.lvl, boss: s.mob.boss })
    log(s, `${zoneBoss ? 'BOSS' : 'Miniboss'}: ${look.name} (${b.lvl}) steps out to fight!`, '#ff8040')
  } else {
    const [name, type, color] = rng.pick(subMobs(zoneId, sub))
    const { lo, hi } = subLevels(zoneId, sub)
    const lvl = Math.max(Math.max(z.min, lo), Math.min(Math.max(lo, hi), h.level + rng.pick([-1, 0, 0, 0, 1])))
    const ms = mobStats(lvl)
    const roll = rng.next()
    const count = h.level < 4 ? 1 : h.level < 8 ? (roll < 0.75 ? 1 : 2) : roll < 0.5 ? 1 : roll < 0.83 ? 2 : 3
    const each = count === 1 ? 1 : count === 2 ? 0.8 : 0.7 // w grupach moby są nieco słabsze
    const per = Math.round(ms.hp * (0.92 + rng.next() * 0.16) * each)
    s.mob = { name, type, color, lvl, hp: per * count, maxHp: per * count, per, dmg: ms.dmg * each, speed: ms.speed, swing: 1.2, dots: [], stun: 0, dodged: false, count, dist, dist0: dist, cc: 0, slow: 0, ranged: RANGED_MOB.test(name) }
    emit({ t: 'spawn', mob: name, lvl })
  }
  // wróg dystansowy najpierw wchodzi w pole widzenia, staje i strzela; postać walcząca wręcz biegnie do niego
  if (s.mob?.ranged && closesIn(h)) { s.mob.dist = 4.4; s.mob.dist0 = 4.4 }
  s.phase = 'fight'
  h.swing = style === 'melee' ? 0.3 : 0
  h.cp = 0
  h.heroDodged = false
  h.sinceCast = Math.min(h.sinceCast, 99)
  fightT = 0
  void r
  if (racialReady(h, 'bloodfury')) racial(s, 'bloodfury', emit)
  if (racialReady(h, 'berserking')) {
    // Classic: 10% przy pełnym zdrowiu do 30% przy niskim
    const d0 = stats(h)
    h.stacks.berserk = Math.round((0.1 + 0.2 * Math.max(0, 1 - h.hp / d0.maxHp)) * 100) / 100
    racial(s, 'berserking', emit)
  }
  if (racialReady(h, 'perception') && s.mob && (s.mob.boss || s.mob.count >= 3)) racial(s, 'perception', emit)
}

// Wróg dochodzi do zwarcia: War Stomp (tauren), Escape Artist (gnom rzucający czary)
function onContact(s: GameState, emit: Emit) {
  const h = s.hero
  const mob = s.mob
  if (!mob) return
  if (racialReady(h, 'warstomp')) { applyCC(s, 'warstomp', 2); racial(s, 'warstomp', emit) }
  else if (racialReady(h, 'escape') && styleOf(h) === 'caster') { mob.retreat = 2; racial(s, 'escape', emit) }
}
// Czy postać teraz bije białymi atakami (także caster bez many albo z wyłączonymi czarami)
export function autoAttacking(s: GameState) {
  const h = s.hero
  if (s.phase !== 'fight' || !s.mob || h.casting) return false
  const style = styleOf(h)
  const d = stats(h)
  const lowMana = d.res === 'mana' && h.res < d.maxRes * 0.12
  return (style !== 'caster' || lowMana || lastNoAction) && (style === 'ranged' || (style === 'caster' && hasWand(h)) || s.mob.dist <= 0)
}

// Czy postać walczy teraz wręcz. Łowca: pupil trzyma wroga, a łowca strzela; bez pupila (albo w stylu
// "Wręcz") przy wrogu w zwarciu przechodzi na broń do walki wręcz.
export function heroInMelee(s: GameState) {
  const mob = s.mob
  if (!mob || mob.dist > 0) return false
  const h = s.hero
  if (h.cls !== 'hunter') return true
  return modeOf(h) === 'melee' || !activePet(h)
}
export function swingSpeed(s: GameState, d = stats(s.hero)) {
  return s.hero.cls === 'hunter' && heroInMelee(s) ? d.melee.speed : d.weaponSpeed
}

// Hybryda = walczy wręcz, ale ma czary rzucane z dystansu (szaman, paladyn, druid w formie zwierzęcia nie)
export function isHybrid(h: Hero) {
  if (styleOf(h) !== 'melee') return false
  const g = grants(h)
  return classById(h.cls).abilities.some((a) => (a.kind === 'spell' || a.kind === 'dot' || a.kind === 'drain') && !isMelee(a) && (a.cast ?? 0) > 0 && knows(h, a, g))
}
// Czy postać od razu biegnie do wroga (brak aktywnych czarów z dystansu albo styl "Wręcz")
function closesIn(h: Hero) {
  if (h.cls === 'hunter') return modeOf(h) === 'melee'
  if (styleOf(h) !== 'melee') return false
  // paladyn to postać do walki wręcz: Judgement / Exorcism rzuca po drodze albo już w zwarciu, a nie stoi z daleka
  if (h.cls === 'paladin') return h.mode !== 'caster'
  if (h.mode === 'melee') return true
  const g = grants(h)
  return !classById(h.cls).abilities.some((a) => (a.kind === 'spell' || a.kind === 'dot' || a.kind === 'drain') && !isMelee(a) && (a.power ?? 0) > 0 && active(h, a, g))
}

let fightT = 0
export const CHARGE_DELAY = 1.1 // s od pojawienia się wroga do szarży
function readyCloser(h: Hero, d: Derived) {
  const g = grants(h)
  return classById(h.cls).abilities.find((a) => a.closes && active(h, a, g) && !(h.cds[a.id] > 0) && h.res >= costOf(h, a, d)) ?? null
}
// Rogue / wojownik z bronią miotaną / łukiem / strzelbą: otwiera walkę z dystansu (Throw / Shoot), a wróg podchodzi
export function throwOpener(h: Hero) {
  return (h.cls === 'rogue' || h.cls === 'warrior') && styleOf(h) === 'melee' && hasRanged(h, ['Thrown', 'Bow', 'Gun', 'Crossbow'])
}
export const throwName = (h: Hero) => h.equip.ranged?.weaponType === 'Thrown' ? 'Throw' : 'Shoot'
// wrogowie dystansowi: zatrzymują się w tej odległości (sekundy marszu) i strzelają / rzucają czary
export const RANGED_STOP = 2
export const RANGED_MOB = /trapper|archer|marksman|rifle|shaman|mage|caster|priest|warlock|necromancer|witch|seer|oracle|mystic|geomancer|conjur|cultist|channeler|acolyte|apprentice|sorcer|hexer|spellbinder|enchanter|wizard|summoner|invoker|shooter|thrower|headhunter|sniper|earthcaller|adept|felsworn|shadow hunter|scout/i
let ticking = false
const NEEDS_RANGED = /shot|sting|volley|rapid_fire/
// Kontrola tłumu: co dokładnie robi każda umiejętność (ogłuszenie, unieruchomienie, strach, spowolnienie, obezwładnienie jednego z grupy)
type CCEff = { e: 'stun' | 'root' | 'fear' | 'slow' | 'cc'; look: string; dur?: number }
const CC: Record<string, CCEff> = {
  charge: { e: 'stun', look: 'stun' }, intimidating_shout: { e: 'fear', look: 'fear' }, piercing_howl: { e: 'slow', look: 'slow', dur: 6 },
  concussion_blow: { e: 'stun', look: 'stun' }, hammer_justice: { e: 'stun', look: 'stun' }, voice_of_truth: { e: 'stun', look: 'silence' },
  repentance: { e: 'stun', look: 'sleep' }, concussive_shot: { e: 'slow', look: 'slow', dur: 4 }, wing_clip: { e: 'slow', look: 'slow', dur: 10 },
  freezing_trap: { e: 'cc', look: 'ice' }, intimidation: { e: 'stun', look: 'stun' }, scatter_shot: { e: 'stun', look: 'daze' },
  counterattack: { e: 'root', look: 'root', dur: 5 }, wyvern_sting: { e: 'stun', look: 'sleep' }, gouge: { e: 'stun', look: 'daze' },
  cheap_shot: { e: 'stun', look: 'stun' }, kidney_shot: { e: 'stun', look: 'stun' }, blind: { e: 'cc', look: 'blind' },
  psychic_scream: { e: 'fear', look: 'fear' }, silence: { e: 'stun', look: 'silence' }, polymorph: { e: 'cc', look: 'poly' },
  frost_nova: { e: 'root', look: 'ice' }, fear: { e: 'fear', look: 'fear' }, howl_terror: { e: 'fear', look: 'fear' },
  entangling_roots: { e: 'root', look: 'root' }, bash: { e: 'stun', look: 'stun' }, pounce: { e: 'stun', look: 'stun' },
  feral_charge: { e: 'root', look: 'root', dur: 4 }, warstomp: { e: 'stun', look: 'stun' },
}
export function applyCC(s: GameState, id: string, dur: number) {
  const mob = s.mob
  if (!mob || dur <= 0) return
  const c = CC[id] ?? { e: 'stun', look: 'stun' }
  const t = c.dur ?? dur
  const style = styleOf(s.hero)
  mob.by = { ...(mob.by ?? {}), [c.e === 'cc' && aliveOf(mob) < 2 ? 'stun' : c.e]: id }
  switch (c.e) {
    case 'stun': mob.stun = Math.max(mob.stun, t); mob.cct = c.look; return
    case 'slow': mob.slow = Math.max(mob.slow, t); return
    case 'cc':
      if (aliveOf(mob) >= 2) { mob.cc = Math.max(mob.cc, t); mob.ccl = c.look }
      else { mob.stun = Math.max(mob.stun, Math.min(t, 4)); mob.cct = c.look } // pojedynczy wróg: krótko obezwładniony (pęka od obrażeń)
      return
    case 'root':
      mob.root = Math.max(mob.root ?? 0, t); mob.rootl = c.look
      // w zwarciu postać dystansowa odskakuje, póki wróg jest unieruchomiony
      if (mob.dist <= 0 && style !== 'melee') mob.retreat = Math.max(mob.retreat ?? 0, Math.min(1.6, t * 0.5)) // odbiega, a nie teleportuje się
      return
    case 'fear':
      mob.fear = Math.max(mob.fear ?? 0, t)
      if (style === 'melee') { mob.stun = Math.max(mob.stun, t * 0.6); mob.cct = 'fear' } // wojownik nie goni uciekających: krótkie obezwładnienie
      return
  }
}
const BEASTS = new Set(['beast', 'cat', 'boar', 'raptor'])
// Classic: trafienie czarem 96/95/94% na +0..+2, potem skok: 83/72/61% na +3..+5 i -11% na każdy kolejny poziom
export const spellMissBase = (up: number) => up <= 2 ? 0.04 + up * 0.01 : Math.min(0.99, 0.06 + (up - 2) * 0.11)
const missChance = (d: Derived, up: number, spell: boolean) => Math.max(spell && up > 2 ? 0.01 : 0, (spell ? spellMissBase(up) : 0.05 + up * 0.02) - (d.m.hit ?? 0))
// Wróg wyższy o kilka poziomów: częściej trafia krytycznie, rzadziej pudłuje, od +3 zadaje miażdżące ciosy (150%)
export const mobCritChance = (up: number) => Math.min(0.35, 0.05 + 0.025 * Math.max(0, up))
export const crushChance = (up: number) => up >= 3 ? Math.min(0.45, 0.12 * (up - 2)) : 0

function fight(s: GameState, d: Derived, dt: number, rng: Rng, emit: Emit) {
  const h = s.hero
  const mob = s.mob!
  const haste = d.haste
  fightT += dt
  if (mob.slow > 0) mob.slow -= dt
  if ((mob.root ?? 0) > 0) mob.root! -= dt
  const feared = (mob.fear ?? 0) > 0 && styleOf(h) !== 'melee'
  if ((mob.fear ?? 0) > 0) mob.fear! -= dt
  const stunnedNow = mob.stun > 0
  if (stunnedNow) mob.stun -= dt
  // pupil-tank (bestia łowcy, Voidwalker) biegnie do wroga i go zatrzymuje: wróg bije pupila
  const tankPet = activePet(h)?.tank ? activePet(h) : null
  if (!tankPet) { mob.petOn = false; mob.petIn = undefined }
  else if (!mob.petOn) {
    if (mob.dist <= 0) mob.petOn = true
    else { mob.petIn = (mob.petIn ?? mob.dist) - dt * 3; if (mob.petIn <= 0) mob.petOn = true }
  }
  const held = !!mob.petOn
  // z gotowym Charge / Feral Charge postać czeka chwilę, aż wróg wejdzie w pole widzenia, i dopiero wtedy szarżuje
  const closer = readyCloser(h, d)
  const mobWalks = !stunnedNow && !((mob.root ?? 0) > 0) && !held && !(mob.ranged && mob.dist <= RANGED_STOP)
  // rzucający czeka, aż wróg podejdzie (rzuca w niego); gdy wróg stoi (dystansowy, unieruchomiony) – biegnie
  const throwing = !closer && throwOpener(h) && mob.dist > 0 && mobWalks && !feared
  const heroRuns = closesIn(h) && mob.dist > 0 && !feared && !throwing && !(closer && fightT < CHARGE_DELAY + 0.6)
  // postać odbiega od wroga (po Frost Nova / Entangling Roots w zwarciu, Escape Artist): płynnie, ok. 1,6 „sekundy dystansu” na sekundę
  if ((mob.retreat ?? 0) > 0) {
    const st = Math.min(mob.retreat!, dt * 1.6)
    mob.dist += st
    mob.heroRun = (mob.heroRun ?? 0) - st
    mob.retreat! -= st
  }
  if (feared) { mob.dist = Math.min(mob.dist + dt * 0.6, 6) } // ucieka
  else if (mob.dist > 0) {
    const step = (mobWalks ? (mob.slow > 0 ? 0.5 : 1) : 0) + (heroRuns ? 1 : 0)
    if (step > 0) {
      mob.dist = Math.max(0, mob.dist - dt * step)
      if (heroRuns) mob.heroRun = (mob.heroRun ?? 0) + dt
      if (mob.dist <= 0) onContact(s, emit)
    }
  }
  if (mob.cc > 0) mob.cc -= dt
  const inMelee = mob.dist <= 0

  // DoT-y na mobach
  for (const dot of mob.dots) {
    dot.left -= dt
    dot.tickIn -= dt
    if (dot.tickIn <= 0) {
      const crit = (d.m.dotCrit ?? 0) > 0 && rng.chance(d.spellCrit)
      ticking = true
      hitMob(s, d, dot.perTick * (crit ? 1.5 + (d.m.critDmg ?? 0) / 2 : 1), crit, emit, dot.school, dot.name)
      ticking = false
      dot.tickIn += 3
    }
  }
  mob.dots = mob.dots.filter((x) => x.left > 0)
  if (mob.hp <= 0) return onKill(s, rng, emit)

  // rzucanie / rotacja
  if (h.casting) {
    h.casting.left -= dt * haste
    const ach = classById(h.cls).abilities.find((x) => x.id === h.casting!.id)
    if (ach?.channel && h.casting) {
      // czar kanałowany (Rain of Fire, Blizzard, Volley, Hurricane, Hellfire...): obrażenia co 1 s przez cały czas trwania
      const c = h.casting
      const n = Math.max(1, Math.round(c.total))
      const due = Math.min(n, Math.floor((c.total - Math.max(0, c.left)) / (c.total / n) + 1e-6))
      while ((c.ticks ?? 0) < due && s.mob) {
        c.ticks = (c.ticks ?? 0) + 1
        resolve(s, { ...ach, power: ((ach.power ?? 1) * (c.mult ?? 1)) / n, cost: 0, cd: 0, shareCd: undefined }, d, rng, emit)
        if (s.mob && s.mob.hp <= 0) { h.casting = null; return onKill(s, rng, emit) }
      }
      if (!s.mob) return
      if (c.left <= 0) h.casting = null
    } else if (h.casting.left <= 0) {
      const a0 = classById(h.cls).abilities.find((x) => x.id === h.casting!.id)!
      const pm = h.casting.mult ?? 1
      const a = pm < 1 ? { ...a0, power: (a0.power ?? 1) * pm } : a0
      h.casting = null
      resolve(s, a, d, rng, emit)
      if (s.mob && s.mob.hp <= 0) return onKill(s, rng, emit)
      if (!s.mob) return
    }
  } else if (h.gcd <= 0) {
    const a = rotation(s, d)
    if (a) {
      const castT = castTime(h, d, a)
      if (castT > 0) {
        h.casting = { id: a.id, left: castT, total: castT }
        emit({ t: 'cast', ability: a.name, school: a.school, kind: a.kind })
        // kanał: koszt i odnowienie płacone na starcie (obrażenia lecą tickami)
        if (a.channel) { h.res = Math.max(0, h.res - costOf(h, a, d)); if (d.res === 'mana') h.sinceCast = 0; if (a.cd) h.cds[a.id] = cdOf(a, d); h.casting.ticks = 0 }
      }
      else { resolve(s, a, d, rng, emit); if (s.mob && s.mob.hp <= 0) return onKill(s, rng, emit) }
      if ((d.m.instant ?? 0) > 0 && castT === 0 && a.cast) clearInstant(h)
      h.gcd = a.kind === 'totem' ? 1 : d.res === 'energy' ? 1 : 1.5
      lastNoAction = false
    } else lastNoAction = true
  }
  if (!s.mob) return

  // białe ataki: melee (tylko w zwarciu) / łowca (strzela od razu); caster tylko bez many albo gdy nie ma czego rzucać
  const style = styleOf(h)
  const lowMana = d.res === 'mana' && h.res < d.maxRes * 0.12
  const wand = style === 'caster' && hasWand(h)
  const tossing = s.mob.dist > 0 && throwOpener(h) && !readyCloser(h, d)
  const reach = style === 'ranged' || wand || s.mob.dist <= 0 || tossing
  if (tossing && fightT < 0.6 && h.swing > 0.6) h.swing = 0.6 // pierwszy rzut od razu po zauważeniu wroga
  if ((style !== 'caster' || lowMana || lastNoAction) && !h.casting && reach) {
    h.swing -= dt * haste
    if (h.swing <= 0) {
      h.swing += wand ? h.equip.ranged!.speed ?? 1.6 : tossing ? h.equip.ranged!.speed ?? 2 : swingSpeed(s, d)
      if (wand) wandShot(s, d, rng, emit)
      else if (tossing) throwShot(s, d, rng, emit)
      else whiteSwing(s, d, rng, emit, style === 'caster' ? 0.6 : 1)
      if (s.mob && s.mob.hp <= 0) return onKill(s, rng, emit)
    }
  }

  // pupil
  const pet = activePet(h)
  if (pet && s.mob && (!pet.tank || s.mob.petOn || s.mob.dist <= 0)) {
    h.petSwing -= dt
    if (h.petSwing <= 0) {
      h.petSwing += 2
      const dmg = basePower(h.level) * pet.dmg * (0.6 + 0.4 * d.gear) * (1 + (raceById(h.race).mods.petDmg ?? 0) + (d.m.pet ?? 0) + (d.m.petDmg ?? 0)) * (0.85 + rng.next() * 0.3)
      hitMob(s, d, dmg, false, emit, pet.school, pet.name, 'pet')
      if (s.mob.hp <= 0) return onKill(s, rng, emit)
    }
  }

  // ataki mobów (grupa bije razem): w zwarciu, z dystansu (wróg dystansowy) albo w pupila, który go trzyma
  const canHit = inMelee || held || (!!mob.ranged && mob.dist <= RANGED_STOP + 0.01)
  if (!s.mob || !canHit) { if (h.hp <= 0) onDeath(s, emit); return }
  const frozen = (mob.root ?? 0) > 0 && mob.rootl === 'ice'
  if (stunnedNow || feared || frozen) { /* ogłuszony / zamrożony / w strachu: żadnych ataków, także z dystansu */ }
  else {
    mob.swing -= dt
    if (mob.swing <= 0) {
      mob.swing += mob.speed
      const alive = aliveOf(mob)
      const attackers = Math.max(alive > 1 && mob.cc > 0 ? alive - 1 : alive, 1)
      if (held && tankPet) {
        // pupil przyjmuje ciosy całej grupy (pancerz pupila: -25%)
        if (rng.chance(0.06)) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'miss', target: 'pet' })
        else {
          const up = Math.max(0, mob.lvl - h.level)
          const crit = rng.chance(mobCritChance(up))
          const dmg = mob.dmg * attackers * (attackers > 1 ? 0.75 : 1) * (1 + 0.1 * up + 0.05 * up * up) * (0.85 + rng.next() * 0.3) * 0.75 * (crit ? 2 : 1)
          const max = petMaxHp(h, d)
          h.petHp = Math.min(max, h.petHp ?? max) - dmg
          emit({ t: 'dmg', src: 'mob', amt: Math.round(dmg), crit: crit || undefined, target: 'pet' })
          if (h.petHp <= 0) {
            h.petHp = 0
            h.petCd = PET_CD
            mob.petOn = false
            mob.petIn = undefined
            emit({ t: 'petdeath', name: tankPet.name })
            log(s, `${tankPet.name} has died. It will be back in ${PET_CD} s.`, '#ff6060')
          }
        }
      } else if ((d.m.immune ?? 0) > 0) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'absorb' })
      else {
        const roll = rng.next()
        const up = Math.max(0, mob.lvl - h.level)
        const dodge = Math.max(0, Math.min(0.75, d.dodge) - 0.01 * up)
        const parry = PARRY.has(h.cls) && styleOf(h) !== 'caster' ? Math.max(0, 0.05 - 0.01 * up) : 0
        const mmiss = Math.max(0, 0.05 - 0.01 * up)
        if (roll < mmiss) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'miss' })
        else if (roll < mmiss + dodge) { emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'dodge' }); h.heroDodged = true }
        else if (roll < mmiss + dodge + parry) { emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'parry' }); h.heroDodged = true }
        else {
          let dmg = mob.dmg * attackers * (attackers > 1 ? 0.75 : 1) * (1 + 0.1 * up + 0.05 * up * up) * (0.85 + rng.next() * 0.3) * (1 - d.dr(mob.lvl))
          const r2 = rng.next()
          const crit = r2 < mobCritChance(up)
          if (crit) dmg *= 2
          else if (r2 < mobCritChance(up) + crushChance(up)) dmg *= 1.5
          if (h.shield > 0) {
            const ab = Math.min(h.shield, dmg)
            h.shield -= ab
            dmg -= ab
            if (dmg <= 0) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'absorb' })
          }
          if (dmg > 0) {
            // Shadowmeld działa też przy jednym ciosie, który zbiłby zdrowie z ponad 10% do zera: zostaje 1 HP i ucieczka
            if (racialReady(h, 'shadowmeld') && h.hp - dmg < d.maxHp * 0.1) h.hp = Math.max(1, h.hp - dmg)
            else h.hp -= dmg
            emit({ t: 'dmg', src: 'mob', amt: Math.round(dmg), crit: crit || undefined })
            castHit(s, d, rng, emit)
            if (d.res === 'rage') h.res = Math.min(100, h.res + ((2.5 * dmg) / rageConv(h.level)) * (1 + (d.m.resGen ?? 0)))
          }
          procs(s, d, rng, emit, 'taken')
          if (s.mob && s.mob.hp <= 0) return onKill(s, rng, emit)
        }
        if ((d.m.retal ?? 0) > 0 && s.mob) {
          hitMob(s, d, whiteHit(d, rng, true) * d.m.retal, false, emit, 'physical', 'Retaliation')
          if (s.mob.hp <= 0) return onKill(s, rng, emit)
        }
        if (racialReady(h, 'stoneform') && h.hp < d.maxHp * 0.4) racial(s, 'stoneform', emit)
        // Shadowmeld (nocny elf): ucieczka z przegranej walki
        if (h.hp > 0 && h.hp < d.maxHp * 0.1 && racialReady(h, 'shadowmeld') && s.mob) {
          racial(s, 'shadowmeld', emit)
          log(s, `Shadowmeld: ${s.mob.name} loses sight of you.`, '#a58fd6')
          s.mob = null
          h.casting = null
          afterFight(s, d, rng, emit)
          return
        }
      }
    }
  }
  if (h.hp <= 0) onDeath(s, emit)
}
const PARRY = new Set(['warrior', 'paladin', 'rogue', 'hunter'])
let lastNoAction = false

// Ciosy w trakcie rzucania: cofają pasek (czary) albo skracają kanał; czasem wróg przerywa czar.
// Talenty "mniej przerywania" (np. Eye of the Storm, Healing Focus) dają klucz pushback.
function castHit(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const h = s.hero
  const c = h.casting
  const mob = s.mob
  if (!c || !mob) return
  if ((h.buffs.wotf ?? 0) > 0) return // Will of the Forsaken: bez przerywania i cofania
  if (racialReady(h, 'wotf')) { racial(s, 'wotf', emit); return }
  const resist = Math.min(0.9, d.m.pushback ?? 0)
  const a = classById(h.cls).abilities.find((x) => x.id === c.id)
  const kick = (mob.type === 'humanoid' ? 0.08 : mob.boss ? 0.06 : 0) * (1 - resist)
  if (kick > 0 && rng.chance(kick)) {
    h.casting = null
    h.gcd = 2
    emit({ t: 'interrupt', ability: a?.name ?? '' })
    return
  }
  if (a?.channel) {
    const cut = c.total * 0.2 * (1 - resist)
    c.left -= cut
    c.mult = (c.mult ?? 1) * (1 - 0.2 * (1 - resist))
  } else if ((c.pb ?? 0) < 3) {
    c.left = Math.min(c.total, c.left + 0.5 * (1 - resist))
    c.pb = (c.pb ?? 0) + 1
  }
}

const sweepMul = (s: GameState, d: Derived) => ((d.m.sweep ?? 0) > 0 && s.mob && aliveOf(s.mob) >= 2 ? 1.5 : 1)

// Tabela ataku bronią (Classic): pudło / unik / parowanie / cios ześlizgujący się / krytyk / trafienie.
// Zwraca mnożnik obrażeń (0 = chybienie) i czy był krytyk; przy okazji ćwiczy umiejętność broni.
function weaponRoll(s: GameState, d: Derived, rng: Rng, emit: Emit, ranged: boolean, white: boolean, ability?: string, extraCrit = 0): { mul: number; crit: boolean; glance: boolean } {
  const h = s.hero
  const mob = s.mob!
  const up = trySkillUp(h, ranged, rng)
  if (up) {
    emit({ t: 'skillup', weapon: up.type, skill: up.skill })
    if (up.skill % 5 === 0 || up.skill >= h.level * 5) log(s, `${up.type} skill: ${up.skill}/${h.level * 5}.`, '#8080ff')
  }
  const tb = attackTable(h, mob.lvl, ranged, white, d.m.hit ?? 0, mob.stun > 0)
  let roll = rng.next()
  if ((roll -= tb.miss) < 0) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability }); return { mul: 0, crit: false, glance: false } }
  if ((roll -= tb.dodge) < 0) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'dodge', ability }); mob.dodged = true; return { mul: 0, crit: false, glance: false } }
  if ((roll -= tb.parry) < 0) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'parry', ability }); return { mul: 0, crit: false, glance: false } }
  if ((roll -= tb.glance) < 0) return { mul: tb.glanceMul, crit: false, glance: true }
  const crit = rng.chance(d.crit + tb.crit + extraCrit - 0.01 * Math.max(0, mob.lvl - h.level))
  return { mul: 1, crit, glance: false }
}

// różdżka: strzał z dystansu za obrażenia różdżki (szkoła magii z przedmiotu, domyślnie arcane)
function wandShot(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const h = s.hero
  const w = h.equip.ranged!
  const mob = s.mob!
  const up = Math.max(0, mob.lvl - h.level)
  if (rng.chance(missChance(d, up, true))) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability: 'Shoot', school: WAND_SCHOOL(w) }); return }
  const crit = rng.chance(d.spellCrit)
  const dmg = (w.dps ?? 3) * (w.speed ?? 1.6) * (0.85 + rng.next() * 0.3) * (crit ? 1.5 : 1) * (1 + (d.m.wand ?? 0))
  hitMob(s, d, dmg, crit, emit, WAND_SCHOOL(w), 'Shoot')
}
// Throw / Shoot rogue'a i wojownika: fizyczny strzał bronią dystansową (zanim wróg dojdzie do zwarcia)
function throwShot(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const h = s.hero
  const w = h.equip.ranged!
  const mob = s.mob!
  const up = Math.max(0, mob.lvl - h.level)
  const name = throwName(h)
  if (rng.chance(missChance(d, up, false))) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability: name, school: 'physical' }); return }
  const crit = rng.chance(d.crit)
  const dmg = ((w.dps ?? 2.5) + d.ap / 14) * (w.speed ?? 2) * (0.85 + rng.next() * 0.3) * (crit ? 2 : 1) * dmgMult(d, null, true)
  hitMob(s, d, dmg, crit, emit, 'physical', name)
}
const WAND_SCHOOL = (w: { name: string }): School => /fire|flame|burn|blaze|ember/i.test(w.name) ? 'fire' : /frost|ice|cold|snow/i.test(w.name) ? 'frost' : /shadow|dark|necro|skull|bone|death/i.test(w.name) ? 'shadow' : /holy|light|sacred|divine/i.test(w.name) ? 'holy' : /nature|thorn|leaf|bramble/i.test(w.name) ? 'nature' : 'arcane'
function whiteSwing(s: GameState, d: Derived, rng: Rng, emit: Emit, mult: number) {
  const h = s.hero
  const mob = s.mob!
  const ranged = styleOf(h) === 'ranged' && !heroInMelee(s)
  const w = weaponRoll(s, d, rng, emit, ranged, true)
  if (!w.mul) return
  const crit = w.crit
  let dmg = whiteHit(d, rng, !ranged) * w.mul * (crit ? 2 + (d.m.critDmg ?? 0) : 1) * mult * dmgMult(d, null, true) * sweepMul(s, d)
  if (h.race === 'troll' && BEASTS.has(mob.type)) dmg *= 1.05
  hitMob(s, d, dmg, crit, emit, 'physical', undefined, 'hero', w.glance)
  if (d.res === 'rage') h.res = Math.min(100, h.res + ((7.5 * dmg) / rageConv(h.level) / (crit ? 2 : 1)) * (1 + (d.m.resGen ?? 0)))
  maelstrom(h, d, rng)
  procs(s, d, rng, emit, 'hit')
}
// Maelstrom Weapon (Forever): ciosy wręcz ładują do 5 ładunków
function maelstrom(h: Hero, d: Derived, rng: Rng) {
  const mw = d.m.mw ?? 0
  if (mw > 0 && styleOf(h) === 'melee' && rng.chance(mw * 0.06)) h.stacks.mw = Math.min(5, (h.stacks.mw ?? 0) + 1)
}

// Procki: trucizny, pieczęcie, nasycenia broni (on: hit) i tarcze/aury (on: taken)
function procs(s: GameState, d: Derived, rng: Rng, emit: Emit, on: 'hit' | 'taken') {
  const h = s.hero
  if (!s.mob) return
  const g = grants(h)
  for (const a of classById(h.cls).abilities) {
    if (a.kind !== 'proc' || !a.proc || a.proc.on !== on || !active(h, a, g)) continue
    if (!rng.chance(a.proc.chance)) continue
    if (a.proc.extra) { whiteSwingNoProc(s, d, rng, emit); continue }
    const bp = basePower(Math.min(h.level, h.trained[a.id] ?? h.level))
    if (a.proc.heal) heal(h, d, spellValue(d, bp, a.proc.heal, spCoef(a)), emit, a.name)
    if (a.proc.mana && d.res === 'mana') h.res = Math.min(d.maxRes, h.res + d.maxRes * a.proc.mana)
    if (a.proc.power > 0) hitMob(s, d, spellValue(d, bp, a.proc.power, spCoef(a)) * dmgMult(d, a, false), false, emit, a.school ?? 'physical', a.name)
    if (!s.mob || s.mob.hp <= 0) return
  }
}
function whiteSwingNoProc(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const crit = rng.chance(d.crit)
  hitMob(s, d, whiteHit(d, rng, true) * (crit ? 2 : 1) * dmgMult(d, null, true) * (1 + (d.m['ab:windfury'] ?? 0)), crit, emit, 'physical', 'Windfury')
}

function whiteHit(d: Derived, rng: Rng, melee = false) {
  if (melee) return (d.melee.dps + d.melee.ap / 14) * d.melee.speed * (0.85 + rng.next() * 0.3)
  return (d.weaponDps + d.ap / 14) * d.weaponSpeed * (0.85 + rng.next() * 0.3)
}

function hitMob(s: GameState, d: Derived, amt: number, crit: boolean, emit: Emit, school: Ability['school'], ability?: string, src: 'hero' | 'pet' = 'hero', glance = false) {
  const mob = s.mob
  if (!mob) return
  const up = Math.max(0, mob.lvl - s.hero.level)
  const a = Math.max(1, Math.round(amt * Math.max(0.4, 1 - 0.05 * up)))
  const before = aliveOf(mob)
  mob.hp -= a
  emit({ t: 'dmg', src, amt: a, crit, school, ability, glance: glance || undefined, tick: ticking || undefined })
  if (school === 'shadow' && (d.m.lifesteal ?? 0) > 0) heal(s.hero, d, a * d.m.lifesteal, () => {})
  const after = mob.hp > 0 ? aliveOf(mob) : 0
  for (let i = after; i < before; i++) if (after > 0) emit({ t: 'subkill', mob: mob.name })
}

function heal(h: Hero, d: Derived, amt: number, emit: Emit, ability?: string) {
  const a = Math.round(Math.min(amt, d.maxHp - h.hp))
  if (a <= 0) return
  h.hp += a
  emit({ t: 'heal', amt: a, ability })
}

// ------------------------------------------------------------------ umiejętności
export const costOf = (h: Hero, a: Ability, d: Derived) => {
  if (!a.cost) return 0
  const tempCost = d.m.cost ?? 0 // talenty (+) i Arcane Power (-) w jednym kluczu
  let mul = Math.max(0, 1 - tempCost)
  if (a.id === 'lightning_bolt') mul *= 1 - 0.2 * (h.stacks?.mw ?? 0)
  if (a.id === 'arcane_blast') mul *= 1 + 0.5 * (h.stacks?.ab ?? 0)
  if (a.kind === 'totem' && a.id !== 'call_elements') mul *= 1
  // talenty obniżające koszt działają też na wściekłość i energię (ujemny klucz = darmowe umiejętności, np. Arcane Power ma sens tylko dla many)
  return d.res === 'mana' ? Math.round((a.cost / 100) * d.maxRes * 0.22 * mul) : tempCost < 0 ? 0 : Math.round(a.cost * mul)
}
export const cdOf = (a: Ability, d: Derived) => (a.cd ? Math.max(0.5, a.cd - (d.m[`cd:${a.id}`] ?? 0)) : 0)
function castTime(h: Hero, d: Derived, a: Ability) {
  if (!a.cast) return 0
  if ((d.m.instant ?? 0) > 0) return 0
  const red = (d.m[`cast:${a.id}`] ?? 0) + (d.m[`cast:${a.school}`] ?? 0) + (d.m['cast:all'] ?? 0) + (a.id === 'lightning_bolt' ? 0.2 * (h.stacks.mw ?? 0) : 0)
  return Math.max(0, a.cast * (1 - Math.min(1, red)))
}
function clearInstant(h: Hero) {
  for (const a of classById(h.cls).abilities) if (a.buff?.instant && h.temp[a.id] > 0) h.temp[a.id] = 0
}

function cond(s: GameState, d: Derived, c: Cond, a: Ability): boolean {
  const h = s.hero
  const mob = s.mob!
  const hp = h.hp / d.maxHp
  const mobPct = mob.hp / mob.maxHp
  const mana = d.res === 'mana' ? h.res / d.maxRes : 1
  switch (c) {
    case 'hp<20': return hp < 0.2
    case 'hp<25': return hp < 0.25
    case 'hp<35': return hp < 0.35
    case 'hp<40': return hp < 0.4
    case 'hp<45': return hp < 0.45
    case 'hp<50': return hp < 0.5
    case 'hp<60': return hp < 0.6
    case 'hp<75': return hp < 0.75
    case 'hp>60': return hp > 0.6
    case 'mob<20': return mobPct < 0.2
    case 'mob<25': return mobPct < 0.25
    case 'mob>30': return mobPct > 0.3
    case 'mob>50': return mobPct > 0.5
    case 'noDot': return !mob.dots.some((x) => x.id === a.id)
    case 'dodged': return mob.dodged
    case 'heroDodged': return h.heroDodged
    case 'cp>=2': return h.cp >= 2
    case 'cp>=3': return h.cp >= 3
    case 'cp5': return h.cp >= 5
    case 'pack': return aliveOf(mob) >= 2
    case 'opener': return fightT < mob.dist0 / (closesIn(h) ? 2 : 1) + 1.6
    case 'approaching': return mob.dist > 0.6 && mob.slow <= 0
    case 'mana<20': return d.res === 'mana' && mana < 0.2
    case 'mana<30': return d.res === 'mana' && mana < 0.3
    case 'mana>40': return mana > 0.4
    case 'mana>60': return mana > 0.6
    case 'res>=25': return h.res >= 25
    case 'res>=30': return h.res >= 30
    case 'res>=40': return h.res >= 40
    case 'res>=50': return h.res >= 50
    case 'res>=60': return h.res >= 60
    case 'noShield': return h.shield <= 0
    case 'noHot': return !h.hot
    case 'hot': return !!h.hot
    case 'undead': return mob.type === 'undead'
    case 'stunned': return mob.stun > 0
    case 'notStunned': return mob.stun <= 0 && !((mob.root ?? 0) > 0) && !((mob.fear ?? 0) > 0)
    case 'noTemp': return !(h.temp[a.id] > 0)
    case 'lvl<10': return h.level < 10
    case 'lvl<20': return h.level < 20
    case 'dot:immolate': return mob.dots.some((x) => x.id === 'immolate')
    case 'fireTotem': return h.totems.some((t) => t.el === 'fire')
    case 'shield': return h.equip.offhand?.weaponType === 'Shield'
    case 'boss': return !!mob.boss || aliveOf(mob) >= 3
    case 'twoTotems': return missingTotems(h).length >= 2
    case 'behind': return mob.stun > 0 || fightT < mob.dist0 / (closesIn(h) ? 2 : 1) + 1.6
  }
  return true
}

// Domyślne warunki i priorytety wg rodzaju (gdy umiejętność nie ma własnych)
const KIND_PRIO: Record<string, number> = { heal: 8, shield: 10, stun: 12, regen: 6, lifetap: 6, totem: 4, cooldown: 14, execute: 16, finisher: 25, dot: 36, drain: 45, hot: 9, strike: 60, spell: 60 }
function defaults(a: Ability): Cond[] {
  switch (a.kind) {
    case 'heal': return ['hp<50']
    case 'hot': return ['hp<75', 'noHot']
    case 'shield': return ['noShield']
    case 'dot': return ['noDot', 'mob>30']
    case 'stun': return a.when ? ['notStunned'] : ['notStunned', 'hp<50'] // własne warunki umiejętności zastępują domyślny próg zdrowia
    case 'cooldown': return ['noTemp']
    case 'execute': return ['mob<20']
    case 'regen': return ['mana<30']
    default: return []
  }
}

// Umiejętności, które rotacja może wybrać, w kolejności: własnej (h.prio) albo domyślnej (priorytet, potem siła)
export function rotationOrder(h: Hero): Ability[] {
  const g = grants(h)
  const d = stats(h)
  const list = classById(h.cls).abilities.filter((a) => knows(h, a, g) && a.kind !== 'buff' && a.kind !== 'proc' && a.kind !== 'form' && a.kind !== 'summon')
  const def = (a: Ability) => a.prio ?? (a.kind === 'spell' && a.dot && !a.cast ? KIND_PRIO.dot : KIND_PRIO[a.kind]) ?? 60
  const score = (a: Ability) => ((a.power ?? 1) * dmgMult(d, a, a.school === 'physical' || !a.school)) / Math.max(1.5, castTime(h, d, a)) * (a.aoe ? 2 : 1)
  const auto = [...list].sort((a, b) => def(a) - def(b) || score(b) - score(a))
  if (!h.prio?.length) return auto
  const idx = (a: Ability) => { const i = h.prio!.indexOf(a.id); return i >= 0 ? i : 1000 + auto.indexOf(a) }
  return [...list].sort((a, b) => idx(a) - idx(b))
}
export function usableAbilities(h: Hero) {
  const g = grants(h)
  return classById(h.cls).abilities.filter((a) => knows(h, a, g))
}

function rotation(s: GameState, d: Derived): Ability | null {
  const h = s.hero
  const mob = s.mob!
  const g = grants(h)
  const shadowform = (d.m['school:shadow'] ?? 0) >= 0.15 && !h.disabled.shadowform && g.has('shadowform')
  const missing = missingTotems(h, g)
  const melee = styleOf(h) === 'melee'
  const engaged = heroInMelee(s)
  let best: Ability | null = null
  let bestP = Infinity
  let bestScore = -1
  for (const a of classById(h.cls).abilities) {
    if (a.kind === 'buff' || a.kind === 'proc' || a.kind === 'form' || a.kind === 'summon') continue
    if (!active(h, a, g)) continue
    if (h.cds[a.id] > 0) continue
    if (!engaged && isMelee(a) && !a.closes) continue // poza zasięgiem zwarcia
    // łowca w zwarciu nie strzela (martwa strefa jak w Classicu): tylko ciosy wręcz i pułapki
    if (h.cls === 'hunter' && engaged && !isMelee(a) && (a.kind === 'spell' || a.kind === 'dot' || a.kind === 'drain')) continue
    // strzały wymagają łuku / strzelby / kuszy
    if (h.cls === 'hunter' && !hasRanged(h) && NEEDS_RANGED.test(a.id)) continue
    if (a.closes && (mob.dist <= 0 || fightT < CHARGE_DELAY)) continue // szarża dopiero, gdy wróg jest już widoczny
    if (shadowform && a.school === 'holy' && a.kind !== 'heal' && a.kind !== 'shield' && a.kind !== 'hot') continue
    // styl walki hybrydy: w zwarciu (albo zawsze w stylu "Wręcz") bez czarów rzucanych dłużej niż natychmiast
    if (melee && (a.kind === 'spell' || a.kind === 'dot' || a.kind === 'drain') && !isMelee(a) && castTime(h, d, a) > 0 && (h.mode === 'melee' || (h.mode !== 'caster' && mob.dist <= 0))) continue
    if (a.kind === 'totem') {
      if (a.totem ? h.totems.some((t) => t.el === a.totem) : missing.length < 2) continue
    }
    if (a.kind === 'lifetap') { if (!(a.when ?? []).every((c) => cond(s, d, c, a))) continue }
    else if (h.res < costOf(h, a, d)) continue
    if (a.kind === 'finisher') {
      const fin = h.cp >= 5 || (h.cp >= 3 && (mob.hp / mob.maxHp < 0.3 || h.level < 10)) || (h.cp >= 1 && mob.hp / mob.maxHp < 0.08)
      if (!fin) continue
    }
    // natychmiastowy czar z DoT-em (Moonfire, Flame Shock): nie odnawiaj, dopóki DoT jest na wrogu
    const instantDot = a.kind === 'spell' && !!a.dot && !(a.cast ?? 0)
    if (instantDot && mob.dots.some((x) => x.id === a.id)) continue
    if (a.kind === 'finisher' && a.buff && (h.temp[a.id] ?? 0) > 0) continue
    let p = a.prio ?? (instantDot ? KIND_PRIO.dot : KIND_PRIO[a.kind]) ?? 60
    // własna kolejność z księgi (zakładka Rotation): pozycja na liście zastępuje domyślny priorytet
    const ci = h.prio?.length ? h.prio.indexOf(a.id) : -1
    if (h.prio?.length) p = ci >= 0 ? ci : 1000 + p
    // pełny Maelstrom: natychmiastowy Lightning Bolt; 4 ładunki Arcane Blast: Arcane Missiles
    const special = (a.id === 'lightning_bolt' && (h.stacks.mw ?? 0) >= 5) || (a.id === 'arcane_missiles' && (h.stacks.ab ?? 0) >= 4)
    if (special && !h.prio?.length) p = 5
    else {
      let conds = [...(a.closes ? [] : defaults(a)), ...(a.when ?? [])]
      // unieruchomienie / strach u postaci dystansowej: dopiero gdy wróg dojdzie do zwarcia (potem odbiega i rzuca dalej)
      const ce = CC[a.id]?.e
      if (a.kind === 'stun' && (ce === 'root' || ce === 'fear') && styleOf(h) !== 'melee') {
        if (mob.dist > 0) continue
        conds = conds.filter((c) => !c.startsWith('hp<'))
      }
      // leczenie w walce: próg zdrowia z ustawień gracza zamiast domyślnego
      if ((a.kind === 'heal' || a.kind === 'hot') && !a.healPct) {
        const hc = h.heal ?? HEAL_DEFAULT
        const lim = a.kind === 'heal' ? hc.combat / 100 : Math.min(0.95, hc.combat / 100 + 0.25)
        if (h.hp / d.maxHp >= lim) continue
        conds = conds.filter((c) => !c.startsWith('hp<'))
      }
      if (!conds.every((c) => cond(s, d, c, a))) continue
    }
    // wybór między równorzędnymi: realne obrażenia na sekundę rzucania (z talentami skracającymi czas i wzmacniającymi czar)
    const phys = a.school === 'physical' || !a.school
    const score = ((a.power ?? 1) * dmgMult(d, a, phys)) / Math.max(1.5, castTime(h, d, a)) * (a.aoe ? aliveOf(mob) : 1)
    if (p < bestP || (p === bestP && score > bestScore)) { best = a; bestP = p; bestScore = score }
  }
  return best
}

function resolve(s: GameState, a: Ability, d: Derived, rng: Rng, emit: Emit) {
  const h = s.hero
  const mob = s.mob
  if (!mob) return
  const cost = costOf(h, a, d)
  h.res = Math.max(0, h.res - cost)
  if (d.res === 'mana' && cost > 0) h.sinceCast = 0
  if (a.cd) h.cds[a.id] = cdOf(a, d)
  if (a.shareCd) h.cds[a.shareCd] = Math.max(h.cds[a.shareCd] ?? 0, cdOf(a, d))
  if (a.id === 'arcane_shot') { const hawk = classById(h.cls).abilities.find((x) => x.id === 'summon_hawk'); if (hawk) h.cds.summon_hawk = Math.max(h.cds.summon_hawk ?? 0, h.cds.arcane_shot ?? 0) }
  // gap closer (Charge, Feral Charge): postać doskakuje do wroga, ogłuszenie dopiero przy kontakcie
  if (a.closes && mob.dist > 0) { mob.heroRun = (mob.heroRun ?? 0) + mob.dist; mob.dist = 0; emit({ t: 'charge', ability: a.name }); onContact(s, emit) }
  emit({ t: 'use', id: a.id, ability: a.name, school: a.school, kind: a.kind })
  const bp = basePower(a.talent ? h.level : Math.min(h.level, h.trained[a.id] ?? h.level))
  const beast = h.race === 'troll' && BEASTS.has(mob.type) ? 1.05 : 1
  const vs = a.bonusVs?.includes(mob.type) ? 1.5 : 1
  const dotB = a.dotBonus && mob.dots.some((x) => x.id === a.dotBonus) ? 1.2 : 1
  if (!a.cast) emit({ t: 'cast', ability: a.name, school: a.school, kind: a.kind })
  const phys = a.school === 'physical' || !a.school
  const mult = dmgMult(d, a, phys) * beast * vs * dotB
  const aoeN = a.aoe ? Math.min(3, aliveOf(mob)) : 1
  const up = Math.max(0, mob.lvl - h.level)
  const spellMiss = () => rng.chance(missChance(d, up, true))
  const critMul = (p: boolean) => (p ? 2 + (d.m.critDmg ?? 0) : 1.5 + (d.m.critDmg ?? 0) / 2)
  if (a.gain) h.res = Math.min(d.res === 'mana' ? d.maxRes : 100, h.res + a.gain)
  if (a.when?.includes('heroDodged')) h.heroDodged = false
  if (a.reset) for (const id of a.reset) h.cds[id] = 0

  switch (a.kind) {
    case 'strike': {
      const w = weaponRoll(s, d, rng, emit, !isMelee(a) && styleOf(h) === 'ranged', false, a.name, a.buff?.crit ?? 0)
      if (!w.mul) return
      const crit = w.crit
      const mw = isMelee(a)
      const base = a.school && a.school !== 'physical' ? whiteHit(d, rng, mw) * 0.5 + spellValue(d, bp, 0.6, spCoef(a)) : whiteHit(d, rng, mw) * 0.55 + bp * 0.55
      hitMob(s, d, base * (a.power ?? 1) * (crit ? critMul(true) : 1) * mult * aoeN * (a.aoe ? 1 : sweepMul(s, d)), crit, emit, a.school, a.name)
      if (a.heal) heal(h, d, d.maxHp * a.heal, emit, a.name)
      if (a.cp) h.cp = Math.min(5, h.cp + a.cp)
      if (a.stun && s.mob) applyCC(s, a.id, a.stun)
      if (a.id === 'overpower' || a.id === 'mongoose_bite') mob.dodged = false
      maelstrom(h, d, rng)
      if (s.mob && s.mob.hp > 0) procs(s, d, rng, emit, 'hit')
      return
    }
    case 'execute': {
      const extra = h.res
      h.res = 0
      hitMob(s, d, (bp * (a.power ?? 1) + extra * 3) * mult, false, emit, 'physical', a.name)
      return
    }
    case 'finisher': {
      const cp = h.cp
      h.cp = 0
      if (a.stun) { applyCC(s, a.id, a.stun * cp); return }
      if (a.buff) { h.temp[a.id] = (a.dur ?? 20) * (0.4 + cp * 0.12); return } // Expose Armor, Venom
      if (a.dur) {
        const total = (bp * 0.55 + d.ap * 0.12) * (a.power ?? 1) * cp * mult * (1 + (d.m.dot ?? 0))
        const ticks = Math.max(1, Math.round(a.dur / 3))
        mob.dots = mob.dots.filter((x) => x.id !== a.id)
        mob.dots.push({ id: a.id, name: a.name, school: a.school ?? 'physical', perTick: total / ticks, left: a.dur, tickIn: 3 })
        return
      }
      const crit = rng.chance(d.crit)
      hitMob(s, d, (bp * 0.55 + d.ap * 0.12) * (a.power ?? 1) * cp * (crit ? critMul(true) : 1) * mult, crit, emit, 'physical', a.name)
      return
    }
    case 'spell': case 'drain': {
      if (a.buff && a.dur) h.temp[a.id] = a.dur // Drain Hope
      let wr: { mul: number; crit: boolean } | null = null
      if (phys) { wr = weaponRoll(s, d, rng, emit, !isMelee(a), false, a.name, a.buff?.crit ?? 0); if (!wr.mul) return } // strzały i ciosy fizyczne: tabela broni
      else if (spellMiss()) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability: a.name }); return }
      let stack = 1
      if (a.id === 'arcane_blast') { stack = 1 + 0.15 * (h.stacks.ab ?? 0); h.stacks.ab = Math.min(4, (h.stacks.ab ?? 0) + 1) }
      if (a.id === 'arcane_missiles') { stack = 1 + 0.15 * (h.stacks.ab ?? 0); h.stacks.ab = 0 }
      if (a.id === 'lightning_bolt') h.stacks.mw = 0
      const crit = wr ? wr.crit : rng.chance(d.spellCrit + (a.buff?.crit ?? 0))
      const base = phys ? whiteHit(d, rng) * 0.8 + bp * 0.4 : (bp * (a.power ?? 1) * d.spellMult * (0.92 + rng.next() * 0.16) + d.sp * spCoef(a)) / Math.max(0.01, a.power ?? 1)
      const dmg = base * (a.power ?? 1) * (crit ? critMul(phys) : 1) * mult * aoeN * stack
      hitMob(s, d, dmg, crit, emit, a.school, a.name)
      if (a.heal) heal(h, d, dmg * a.heal, emit, a.name)
      if (a.dot && s.mob) {
        const total = spellValue(d, bp, a.dot.power, spCoef(a, 'dot') * 0.5) * mult
        const ticks = Math.max(1, Math.round(a.dot.dur / 3))
        s.mob.dots = s.mob.dots.filter((x) => x.id !== a.id)
        s.mob.dots.push({ id: a.id, name: a.name, school: a.school ?? 'fire', perTick: total / ticks, left: a.dot.dur, tickIn: 3 })
      }
      if (a.slow && s.mob) { s.mob.slow = Math.max(s.mob.slow, a.slow); s.mob.by = { ...(s.mob.by ?? {}), slow: a.id } }
      // Lightning Overload (Forever): darmowa kopia błyskawicy za połowę obrażeń
      if ((a.id === 'lightning_bolt' || a.id === 'chain_lightning') && s.mob && s.mob.hp > 0 && rng.chance(d.m.overload ?? 0)) hitMob(s, d, dmg * 0.5, false, emit, a.school, `${a.name} (Overload)`)
      if (d.m.instant && a.cast) clearInstant(h)
      return
    }
    case 'dot': {
      const total = (a.school === 'physical' ? bp * (a.power ?? 1) * d.spellMult + d.ap * 0.1 * (a.dur ?? 12) / 3 : spellValue(d, bp, a.power ?? 1, spCoef(a))) * mult * aoeN
      const ticks = Math.max(1, Math.round((a.dur ?? 12) / 3))
      mob.dots = mob.dots.filter((x) => x.id !== a.id)
      mob.dots.push({ id: a.id, name: a.name, school: a.school ?? 'shadow', perTick: total / ticks, left: a.dur ?? 12, tickIn: 3 })
      if (a.cp) h.cp = Math.min(5, h.cp + a.cp)
      if (a.heal) heal(h, d, total * a.heal * 0.5, emit, a.name)
      return
    }
    case 'heal': {
      if (a.healPct) { heal(h, d, d.maxHp * a.healPct, emit, a.name); return }
      heal(h, d, healAmount(h, d, a), emit, a.name)
      return
    }
    case 'hot': {
      const ticks = Math.max(1, Math.round((a.dur ?? 12) / 3))
      const hm = 1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)
      h.hot = { id: a.id, name: a.name, perTick: (spellValue(d, bp, a.power ?? 1, spCoef(a)) * hm) / ticks, left: a.dur ?? 12, tickIn: 3 }
      if (a.id === 'riptide') heal(h, d, spellValue(d, bp, 1.2, 0.43) * hm, emit, a.name)
      return
    }
    case 'shield':
      h.shield = a.shieldPct ? d.maxHp * a.shieldPct : spellValue(d, bp, a.power ?? 1, spCoef(a)) * (1 + (d.m.shield ?? 0))
      return
    case 'stun':
      applyCC(s, a.id, a.dur ?? (a.cc ? 6 : 2))
      if (a.cp) h.cp = Math.min(5, h.cp + a.cp)
      return
    case 'cooldown':
      h.temp[a.id] = a.dur ?? 10
      return
    case 'regen':
      h.res = Math.min(d.maxRes, h.res + d.maxRes * (a.power ?? 0.3))
      return
    case 'totem': {
      const list = a.totem ? [a] : missingTotems(h)
      for (const t of list) placeTotem(h, t)
      emit({ t: 'totem', name: a.totem ? a.name : list.map((x) => x.name.replace(' Totem', '')).join(', ') })
      stats(h)
      return
    }
    case 'lifetap': {
      const amt = bp * 0.9 * (1 + (d.m['ab:life_tap'] ?? 0))
      h.hp = Math.max(1, h.hp - bp * 0.9)
      h.res = Math.min(d.maxRes, h.res + amt)
      return
    }
  }
}

// ------------------------------------------------------------------ zabicie, łup, poziomy
function onKill(s: GameState, rng: Rng, emit: Emit) {
  const h = s.hero
  const mob = s.mob!
  s.mob = null
  h.cp = 0 // punkty kombinacji są na celu: znikają razem z nim
  s.totals.kills += mob.count
  emit({ t: 'kill', mob: mob.name, boss: mob.boss, count: mob.count })

  const mult = mob.boss === 'zone' ? 8 : mob.boss === 'mini' ? 4 : mob.count === 1 ? 1 : mob.count === 2 ? 1.7 : 2.25
  const xp = mobXp(mob.lvl, h.level) * mult
  const rested = Math.min(h.rested, xp)
  h.rested -= rested
  if (xp > 0) emit({ t: 'xp', amt: xp + rested, rested })
  gainXp(s, xp + rested, emit)

  const copper = Math.round((Math.pow(mob.lvl, 1.6) * 0.3 + 2) * (0.5 + rng.next()) * (mob.boss ? 5 : mob.count))
  h.copper += copper
  s.totals.copper += copper
  emit({ t: 'gold', amt: copper })

  const lootBonus = raceById(h.race).mods.lootPct ?? 0
  for (let i = 0; i < mob.count; i++) {
    if (rng.chance(0.4 + lootBonus)) addLoot(s, makeJunk(rng, s.itemSeq++, mob.type, mob.lvl), emit)
    if (!mob.boss && rng.chance(0.11 + lootBonus)) addLoot(s, makeGear(rng, s.itemSeq++, h, mob.lvl), emit)
    // humanoidy noszą przy sobie jedzenie i picie
    if (mob.type === 'humanoid' && rng.chance(0.05)) {
      const pool = FOODS.filter((f) => f.lvl <= mob.lvl && (f.kind !== 'buff' || rng.chance(0.15)))
      if (pool.length) { const top = pool.filter((f) => f.kind === pool[pool.length - 1].kind); addLoot(s, makeFood(s.itemSeq++, rng.pick(top.slice(-2)), 1 + rng.int(0, 1)), emit) }
    }
  }
  if (mob.boss) addLoot(s, makeGear(rng, s.itemSeq++, h, mob.lvl, mob.boss === 'zone' ? (rng.chance(0.1) ? 4 : 3) : rng.chance(0.25) ? 3 : 2), emit)
  if (!mob.boss && mob.type === 'humanoid' && rng.chance(0.006 * mob.count)) addLoot(s, makeBag(s.itemSeq++, mob.lvl < 20 ? 6 : mob.lvl < 40 ? 8 : 10, mob.lvl < 20 ? 'Linen Bag' : mob.lvl < 40 ? 'Woolen Bag' : 'Silk Bag'), emit)

  for (const q of s.quests) {
    if (q.have >= q.need || q.target !== mob.name) continue
    if (q.kind === 'collect') {
      // przedmioty zadania trafiają do toreb; postęp liczy się z tego, co masz
      for (let i = 0; i < mob.count; i++) if (rng.chance(0.55) && countItems(h, (it) => it.quest === q.id) < q.need) {
        const it = makeQuestItem(s.itemSeq++, q.item!, q.id)
        if (!addToInv(h, it)) emit({ t: 'bagsfull', item: it })
      }
      const before = q.have
      syncQuests(s)
      if (q.have === before) continue
    } else q.have = Math.min(q.need, q.have + mob.count)
    emit({ t: 'questprog', quest: q })
    if (q.have >= q.need) { emit({ t: 'questdone', quest: q }); log(s, `Quest ready to turn in: ${q.title}`, '#ffd100') }
  }

  const p = progOf(s)
  const subs = subsOf(s.loc.zone)
  if (mob.boss) {
    s.totals.bosses++
    const sz = subs[s.loc.sub]
    p.cleared = Math.max(p.cleared, s.loc.sub + 1)
    p.kills = 0
    p.bossFails = 0
    p.bossAt = 0
    p.bossHold = undefined
    emit({ t: 'cleared', zone: s.loc.zone, sub: s.loc.sub, boss: mob.name, zoneBoss: sz.zoneBoss })
    if (sz.zoneBoss) {
      const next = nextRouteZone(s, s.loc.zone)
      log(s, `${mob.name} defeated! ${zoneById(s.loc.zone).name} completed.`, '#ff8040')
      if (next) log(s, `Next zone on your route: ${zoneById(next).name} (${zoneById(next).min}-${zoneById(next).max})`, '#69ccf0')
      if (next && s.autoAdvance) { moveTo(s, next, 0, emit, true); return }
    } else {
      log(s, `${mob.name} defeated! Unlocked: ${subs[s.loc.sub + 1].name}`, '#ff8040')
      if (s.autoAdvance) { moveTo(s, s.loc.zone, s.loc.sub + 1, emit, true); return }
    }
  } else if (s.loc.sub === p.cleared && p.cleared < subs.length) {
    p.kills = Math.min(killsNeeded(s.loc.zone, s.loc.sub), p.kills + mob.count)
  }

  const d = stats(h)
  // klasy z leczeniem najpierw leczą się czarem, a jedzą dopiero, gdy brakuje many (albo wg ustawień: tylko jedzenie)
  const hc = h.heal ?? HEAL_DEFAULT
  if (hc.prefer === 'heal' && h.hp < d.maxHp * (hc.after / 100) && pickHeal(h, d)) { s.phase = 'heal'; return }
  afterFight(s, d, rng, emit)
}
function afterFight(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const h = s.hero
  const petLow = !!activePet(h)?.tank && (h.petHp ?? 0) < petMaxHp(h, d) * 0.45
  const needRest = h.hp < d.maxHp * ((h.heal ?? HEAL_DEFAULT).rest / 100) || (d.res === 'mana' && h.res < d.maxRes * 0.35) || petLow
  if (needRest) {
    s.phase = 'rest'
    if (racialReady(h, 'cannibalize') && h.hp < d.maxHp * 0.5 && bestFood(h, 'food') < 0) emit({ t: 'racial', name: 'Cannibalize' })
    startRest(s, d)
  } else { s.phase = 'walk'; s.phaseT = 2.5 + rng.next() * 2.5 }
}

// Forma podróżna (Ghost Wolf, Travel Form) przyspiesza odcinki piesze
export function travelForm(h: Hero): { name: string; speed: number } | null {
  const g = grants(h)
  const a = classById(h.cls).abilities.find((x) => x.travel && knows(h, x, g) && !h.disabled[x.id])
  if (!a) return null
  return { name: a.name, speed: a.travel! + (stats(h).m.travel ?? 0) }
}
export function tripPlan(s: GameState, zone: string, sub: number, auto = false) {
  const form = travelForm(s.hero)
  const p = planTrip(s.hero.faction, s.loc.zone, zone, (form?.speed ?? 0) + (raceById(s.hero.race).mods.travelPct ?? 0), auto, knownOf(s))
  const fromName = `${zoneById(s.loc.zone).name}${s.where === 'field' ? `: ${subOf(s).name}` : ''}`
  const toName = `${zoneById(zone).name}: ${subsOf(zone)[sub].name}`
  return { ...p, form: form?.name, fromName, toName }
}
export const isTraveling = (s: GameState) => s.phase === 'travel' && !!s.trip

function startTrip(s: GameState, trip: GameState['trip'], secs: number) {
  // duch nie podróżuje za darmo: wyruszenie oznacza wskrzeszenie u Ducha Uzdrowiciela
  spiritRes(s, noop, 'Travelling as a ghost. ')
  s.where = 'field'
  s.mob = null
  s.hero.casting = null
  s.hero.totems = []
  s.phase = 'travel'
  s.phaseT = secs
  s.trip = trip
}

// Podróż: postać jest w drodze, a cel (i odkrycie mapy) liczy się dopiero po dotarciu
export function moveTo(s: GameState, zone: string, sub: number, emit: Emit = noop, auto = false): string | null {
  if (isTraveling(s)) return 'You are already travelling.'
  const plan = tripPlan(s, zone, sub, auto)
  if (plan.blocked) return plan.blocked
  const origin = { zone: s.loc.zone, sub: s.loc.sub }
  // trasa z transportem (statek / zeppelin / tramwaj): po kolei — marsz do portu, rejs, marsz dalej.
  // Każdy odcinek to osobna podróż; po dotarciu do portu postać dopiero wsiada.
  const steps = plan.steps ?? []
  // transport odjeżdża z tej mapy, ale postać nie stoi w porcie: najpierw dojście do przystani / wieży / tramwaju
  if (steps[0]?.ride && s.atPort !== s.loc.zone) {
    const ride = steps[0].ride
    const secs = Math.max(8, Math.round(2 * SUB_WALK / (1 + (plan.speed ?? 0))))
    const here = zoneById(s.loc.zone).name
    const label = `Walking to the ${portWord(ride.kind)}: ${ride.label.split(':')[1]?.split('↔')[ride.a === s.loc.zone ? 0 : 1]?.trim() ?? here}`
    startTrip(s, { kind: 'walk', label, total: secs, from: plan.fromName, to: `${here} (${portWord(ride.kind)})`, form: plan.form, dest: { zone: s.loc.zone, sub: s.loc.sub }, path: [], origin, final: { zone, sub }, port: true }, secs)
    log(s, `${label} (${secs} s). Final destination: ${plan.toName}.`, '#69ccf0')
    return null
  }
  s.atPort = undefined
  if (steps.some((x) => x.ride) && steps.length > 1) {
    const seg = steps[0].ride ? [steps[0]] : steps.slice(0, steps.findIndex((x) => x.ride))
    const end = seg[seg.length - 1].zone
    if (end !== zone) {
      const ride = seg[0].ride
      const total = Math.max(1, Math.round(seg.reduce((a, x) => a + x.secs, 0)))
      let at = 0
      const path = seg.map((x) => ({ zone: x.zone, at: Math.round((at += x.secs)) }))
      const p = progOf(s, end)
      const endSub = Math.min(p.cleared, subsOf(end).length - 1)
      const toName = ride ? `${zoneById(end).name} (${ride.label.split(':')[0]})` : `${zoneById(end).name} (port)`
      const label = ride ? ride.label : `Walking to the ${portWord(steps.find((x) => x.ride)!.ride!.kind)}: ${zoneById(end).name}`
      startTrip(s, { kind: ride ? ride.kind : 'walk', label, total, from: plan.fromName, to: toName, form: ride ? undefined : plan.form, dest: { zone: end, sub: endSub }, path, origin, final: { zone, sub }, port: !ride }, total)
      log(s, `${label} (${total} s). Final destination: ${plan.toName}.`, '#69ccf0')
      return null
    }
  }
  startTrip(s, { kind: plan.kind, label: plan.label || `${zone !== s.loc.zone ? 'Travel' : 'Walk'}: ${plan.toName}`, total: plan.total, from: plan.fromName, to: plan.toName, form: plan.form, dest: { zone, sub }, path: plan.path, origin }, plan.total)
  log(s, `${plan.label || `Travel: ${plan.fromName} → ${plan.toName}`} (${plan.total} s${plan.form ? `, ${plan.form}` : ''})`, '#69ccf0')
  return null
}

// Zawrócenie z podróży pieszej: powrót tą samą drogą trwa tyle, ile już szliśmy,
// albo zatrzymanie się na mapie, przez którą akurat idziemy.
export function tripPosition(s: GameState) {
  const tr = s.trip
  if (!tr || s.phase !== 'travel') return null
  const el = Math.max(0, tr.total - s.phaseT)
  const o = tr.origin ?? { zone: s.loc.zone, sub: s.loc.sub }
  const zones = [{ zone: o.zone, at: 0 }, ...(tr.path ?? []).filter((w) => w.at <= el)]
  const cur = zones[zones.length - 1]
  return { el, origin: o, zones, cur }
}
export function canTurnBack(s: GameState) {
  const tr = s.trip
  return !!tr && s.phase === 'travel' && tr.kind === 'walk' && !tr.back && !!tr.origin && tr.total - s.phaseT > 1
}
export function turnBack(s: GameState, how: 'origin' | 'here', emit: Emit = noop): string | null {
  if (!canTurnBack(s)) return 'You can only turn back while walking (not on a ship, zeppelin or tram).'
  const pos = tripPosition(s)!
  const tr = s.trip!
  if (how === 'origin') {
    const secs = Math.max(2, Math.round(pos.el))
    // droga powrotna: mapy w odwrotnej kolejności
    const path: { zone: string; at: number }[] = []
    for (let j = pos.zones.length - 2; j >= 0; j--) path.push({ zone: pos.zones[j].zone, at: Math.round(pos.el - pos.zones[j + 1].at) })
    const name = `${zoneById(pos.origin.zone).name}: ${subsOf(pos.origin.zone)[pos.origin.sub]?.name ?? ''}`
    startTrip(s, { kind: 'walk', label: `Returning: ${name}`, total: secs, from: tr.to, to: name, form: tr.form, dest: pos.origin, path, back: true }, secs)
    log(s, `You turn back to ${name} (${secs} s).`, '#69ccf0')
    emit({ t: 'turnback' })
    return null
  }
  // zostań na mapie, przez którą idziesz: najbliższa odblokowana podstrefa
  const z = pos.cur.zone
  if (!s.unlocked.includes(z)) { s.unlocked.push(z); progOf(s, z) }
  const p = progOf(s, z)
  const sub = Math.min(p.cleared, subsOf(z).length - 1)
  const secs = 5
  const name = `${zoneById(z).name}: ${subsOf(z)[sub].name}`
  startTrip(s, { kind: 'walk', label: `Stopping in ${name}`, total: secs, from: tr.to, to: name, form: tr.form, dest: { zone: z, sub }, path: [], back: true }, secs)
  log(s, `You leave the road and stay in ${name}.`, '#69ccf0')
  emit({ t: 'turnback' })
  return null
}

// Statek / zeppelin z portu na obecnej mapie
export function ride(s: GameState, index: number, emit: Emit = noop): string | null {
  if (isTraveling(s)) return 'You are already travelling.'
  const port = portsOf(s.hero.faction, s.loc.zone).find((p) => p.i === index)
  if (!port) return 'This transport does not depart from this zone.'
  const toName = `${zoneById(port.to).name}: ${subsOf(port.to)[0].name}`
  const secs = port.t.secs
  startTrip(s, { kind: port.t.kind, label: port.t.label, total: secs, from: zoneById(s.loc.zone).name, to: toName, dest: { zone: port.to, sub: 0 } }, secs)
  log(s, `${port.t.label} (${secs} s)`, '#69ccf0')
  void emit
  return null
}

const portWord = (k: string) => k === 'ship' ? 'harbor' : k === 'zeppelin' ? 'zeppelin tower' : 'tram'
function arrive(s: GameState, emit: Emit) {
  const dest = s.trip?.dest
  const final = s.trip?.final
  const port = !!s.trip?.port
  s.phase = 'walk'
  s.phaseT = 1
  s.trip = null
  if (!dest) return
  const changed = dest.zone !== s.loc.zone
  s.loc = { zone: dest.zone, sub: dest.sub }
  if (!s.unlocked.includes(dest.zone)) {
    s.unlocked.push(dest.zone)
    log(s, `Discovered: ${zoneById(dest.zone).name} (${zoneById(dest.zone).min}-${zoneById(dest.zone).max})`, '#69ccf0')
  }
  progOf(s, dest.zone)
  if (changed) emit({ t: 'zone', zone: dest.zone })
  emit({ t: 'sub', zone: dest.zone, sub: dest.sub })
  // kolejny odcinek trasy (z portu: rejs; po rejsie: marsz do celu)
  s.atPort = port ? dest.zone : undefined
  if (final && (final.zone !== dest.zone || final.sub !== dest.sub || port)) moveTo(s, final.zone, final.sub, emit, true)
}

export function gainXp(s: GameState, amt: number, emit: Emit) {
  const h = s.hero
  if (h.level >= MAX_LEVEL || amt <= 0) return
  h.xp += amt
  s.totals.xp += amt
  while (h.level < MAX_LEVEL && h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level)
    h.level++
    const d = stats(h)
    h.hp = d.maxHp
    if (d.res === 'mana') h.res = d.maxRes
    const learnable = learnableCount(h)
    emit({ t: 'level', level: h.level, learnable })
    log(s, `Level up! You reached level ${h.level}.${learnable ? ` Your trainer has ${learnable} new ${learnable === 1 ? 'rank' : 'ranks'} for you.` : ''}${h.level >= 10 ? ' +1 talent point.' : ''}`, '#ffd100')
  }
  if (h.level >= MAX_LEVEL) h.xp = 0
}

// Tryb testowy: ręczne ustawienie poziomu postaci (punkty talentów przeliczane od nowa przy obniżeniu)
export function setLevelAdmin(s: GameState, lvl: number) {
  const h = s.hero
  const n = Math.max(1, Math.min(MAX_LEVEL, Math.round(lvl)))
  if (n < h.level) h.talents = {}
  h.level = n
  h.xp = 0
  const d = stats(h)
  h.hp = d.maxHp
  h.res = d.res === 'mana' ? d.maxRes : d.res === 'energy' ? 100 : 0
  log(s, `Test mode: level set to ${n}.`, '#ffd100')
}

let lastFullWarn = 0
function addLoot(s: GameState, it: Item, emit: Emit) {
  const h = s.hero
  s.totals.items++
  // automatyczne zakładanie lepszego łupu (ustawienie), stary przedmiot wraca do toreb
  if (s.autoEquip && it.slot && autoEquip(h, it)) {
    emit({ t: 'loot', item: it, equipped: true })
    log(s, `Equipped: [${it.name}] (better for your class)`, ['#9d9d9d', '#fff', '#1eff00', '#0070dd', '#a335ee'][it.rarity])
    return
  }
  if (addToInv(h, it) || (sendMule(s, log, true) && addToInv(h, it))) {
    emit({ t: 'loot', item: it, equipped: false })
    if (it.rarity >= 2) log(s, `Loot: [${it.name}]`, ['#9d9d9d', '#fff', '#1eff00', '#0070dd', '#a335ee'][it.rarity])
  } else {
    emit({ t: 'bagsfull', item: it })
    if (s.totals.played - lastFullWarn > 60 || it.rarity >= 2) { lastFullWarn = s.totals.played; log(s, `Bags are full! Lost: [${it.name}]. Sell some items to a vendor.`, '#ff6060') }
  }
}

function onDeath(s: GameState, emit: Emit) {
  const h = s.hero
  const boss = s.mob?.boss ? s.mob.name : undefined
  h.hp = 0
  h.casting = null
  h.hot = null
  h.shield = 0
  h.totems = []
  h.eating = null
  s.mob = null
  s.phase = 'dead'
  s.phaseT = 30 * (1 - (raceById(h.race).mods.respawnPct ?? 0))
  s.totals.deaths++
  if (boss) {
    const p = progOf(s)
    p.bossFails = (p.bossFails ?? 0) + 1
    p.bossAt = s.totals.played + BOSS_RESPAWN
    // trzy porażki z rzędu: postać nie rusza bossa sama, dopóki nie zdobędzie poziomu (albo gracz go wyzwie)
    if (p.bossFails >= 3) { p.bossHold = h.level; log(s, `${boss} is too strong for now. Your character will try again after the next level up (or challenge the boss yourself on the bar).`, '#ff8040') }
  }
  // duch biegnie do zwłok: postęp podstrefy zostaje (natychmiastowe odrodzenie u Ducha Uzdrowiciela go zeruje)
  emit({ t: 'death', boss, reset: false })
  log(s, `${boss ? `${boss} has defeated you.` : 'You have died.'} Your ghost runs back to your corpse (${Math.ceil(s.phaseT)} s), or resurrect now at the Spirit Healer.`, '#ff4040')
}

// Duch Uzdrowiciel (jak w Classicu): natychmiastowe wskrzeszenie na cmentarzu, ale założone przedmioty
// tracą 25% wytrzymałości, a postęp podstrefy, w której zginąłeś, zaczyna się od nowa.
export const SPIRIT_DUR = 0.25
export function challengeBoss(s: GameState) { const p = progOf(s); p.bossHold = undefined; p.bossFails = 0; p.bossAt = 0 }
export const BOSS_RESPAWN = 300 // s: boss, który cię pokonał, wraca zawsze po 5 min
export function spiritRes(s: GameState, emit: Emit = noop, why = ''): boolean {
  if (s.phase !== 'dead') return false
  const h = s.hero
  damageGear(h, SPIRIT_DUR)
  const p = progOf(s)
  const reset = s.loc.sub === p.cleared && p.kills > 0
  if (reset) { p.kills = 0; p.bossAt = 0 }
  const d = stats(h)
  h.hp = d.maxHp * 0.5
  if (d.res === 'mana') h.res = d.maxRes * 0.5
  s.phase = 'rest'
  startRest(s, d)
  emit({ t: 'revive' })
  const broken = Object.values(h.equip).filter((it) => it?.dur === 0).length
  log(s, `${why}The Spirit Healer resurrects you: -25% gear durability${reset ? ', subzone progress reset' : ''}.${broken ? ` Broken items (${broken}) give no bonuses: repair them at a vendor.` : ''}`, '#a0c8ff')
  return true
}

// ------------------------------------------------------------------ offline
export function simulateOffline(s: GameState, seconds: number): OfflineSummary {
  const h = s.hero
  if (s.where !== 'field') s.where = 'field'
  const total = Math.min(seconds, OFFLINE_CAP)
  const simulated = Math.min(total, OFFLINE_SIM_CAP)
  const sum: OfflineSummary = { seconds, simulated, kills: 0, xp: 0, levels: 0, copper: 0, items: [], lost: 0, deaths: 0, bosses: [], restedGained: 0, questsReady: 0 }
  const lvl0 = h.level
  const c0 = h.copper
  advance(s, simulated, (e) => {
    if (e.t === 'kill') sum.kills += e.count
    else if (e.t === 'xp') sum.xp += e.amt
    else if (e.t === 'death') sum.deaths++
    else if (e.t === 'loot' && e.item.rarity >= 2) sum.items.push(e.item)
    else if (e.t === 'bagsfull') sum.lost++
    else if (e.t === 'cleared') sum.bosses.push(e.boss)
    else if (e.t === 'questdone') sum.questsReady++
  }, 0.25)
  sum.levels = h.level - lvl0
  sum.copper = h.copper - c0
  const restSecs = total - simulated
  if (restSecs > 0 && h.level < MAX_LEVEL) {
    const cap = xpToNext(h.level) * 1.5
    const gain = Math.min(cap - h.rested, (restSecs / (8 * 3600)) * xpToNext(h.level) * 0.05)
    if (gain > 0) { h.rested += gain; sum.restedGained = Math.round(gain) }
  }
  if (sum.kills) log(s, `While you were away: ${sum.kills} kills, +${sum.levels} levels.`, '#69ccf0')
  return sum
}

export { resourceOf }

// ------------------------------------------------------------------ opis umiejętności (tooltipy)
// Liczone tymi samymi wzorami co walka: widełki obrażeń / leczenia i czym się skalują.
// Dokładny opis kontroli tłumu: co wróg robi w trakcie i co dzieje się potem (tak, jak to liczy symulacja)
export function ccText(h: Hero, a: Ability): string[] {
  const c = CC[a.id] ?? (a.kind === 'stun' ? { e: a.cc ? 'cc' : 'stun', look: 'stun' } as CCEff : null)
  if (!c) return []
  const dur = c.dur ?? (a.kind === 'stun' ? a.dur : a.stun ?? a.dur) ?? 0
  const melee = styleOf(h) === 'melee'
  const LOOK: Record<string, string> = { silence: 'Silence', sleep: 'Sleep', daze: 'Disorient', blind: 'Blind', poly: 'Polymorph', ice: 'Freeze' }
  const name = LOOK[c.look]
  const out: string[] = []
  switch (c.e) {
    case 'stun':
      out.push(`${name ?? 'Stun'}: the enemy (the whole group) cannot move, attack or cast for ${dur} s. Damage does not break it.`)
      if (a.id === 'charge' || a.id === 'feral_charge') out.push('Used at the start of a fight: you close the distance first, then the stun lands.')
      break
    case 'cc':
      out.push(`${name ?? 'Incapacitate'}: one enemy of a group is taken out of the fight for ${dur} s — it does not attack, the rest of the group does. Damage does not break it.`)
      out.push(`Against a single enemy it only incapacitates it for ${Math.min(dur, 4)} s.`)
      break
    case 'root':
      if (c.look === 'ice') out.push(`Freeze: the enemy is frozen in place for ${dur} s — it cannot move or attack, even from range.`)
      else out.push(`Root: the enemy cannot move for ${dur} s, but still attacks if it stands next to you (ranged enemies keep casting).`)
      if (!melee) out.push(`If the enemy is in melee range, you step back ${c.look === 'ice' ? 'while it is frozen' : 'out of its reach'}; when the effect ends it walks up to you again.`)
      break
    case 'fear':
      if (melee) out.push(`Fear: the enemy cowers for ${Math.round(dur * 0.6 * 10) / 10} s and does not attack (you do not chase a fleeing enemy).`)
      else out.push(`Fear: the enemy runs away in terror for ${dur} s and does not attack; afterwards it has to walk back to you, while your spells keep hitting it.`)
      break
    case 'slow':
      out.push(`Slow: the enemy moves at half speed for ${dur} s, so it needs twice as long to reach you. It still attacks normally in melee.`)
      break
  }
  return out
}
export function abilityInfo(h: Hero, a: Ability, d = stats(h)): string[] {
  const bp = basePower(a.talent ? h.level : Math.min(h.level, h.trained[a.id] ?? h.level))
  const phys = a.school === 'physical' || !a.school
  const mult = dmgMult(d, a, phys)
  const white = (d.weaponDps + d.ap / 14) * d.weaponSpeed
  const r = (x: number, lo = 0.92, hi = 1.08) => `${Math.round(x * lo)}–${Math.round(x * hi)}`
  const k = spCoef(a)
  const pc = (x: number) => `${Math.round(x * 100)}%`
  // Classic: czary skalują się rangą (poziomem) i mocą czarów z przedmiotów; Intellect daje manę i krytyki, nie moc
  const spellScale = (coef: number) => `rank (level ${a.talent ? h.level : Math.min(h.level, h.trained[a.id] ?? h.level)}) and spell power (${d.sp}, coefficient ${pc(coef)} = +${Math.round(d.sp * coef)})`
  const out: string[] = []
  const p = a.power ?? 1
  switch (a.kind) {
    case 'strike': {
      const base = a.school && a.school !== 'physical' ? white * 0.5 + spellValue(d, bp, 0.6, k) : white * 0.55 + bp * 0.55
      out.push(`Damage: ${r(base * p * mult, 0.85, 1.15)}${a.aoe ? ' to each enemy in the group' : ''}`)
      out.push(`Scales with: weapon (${d.weaponDps.toFixed(1)} DPS), attack power (${d.ap}) and rank${a.school && a.school !== 'physical' ? `, spell power (${d.sp})` : ''}. Hit chance depends on weapon skill.`)
      break
    }
    case 'execute': out.push(`Damage: ${Math.round(bp * p * mult)} + 3 per Rage point above the cost`); out.push('Scales with: rank and Rage spent.'); break
    case 'finisher':
      if (a.stun) { out.push(`Stuns for ${a.stun} s per combo point (5 points: ${a.stun * 5} s).`); break }
      if (a.buff) { out.push('Lasts longer with each combo point. Not refreshed while active.'); break }
      out.push(`${a.dur ? 'Bleed' : 'Damage'} at 5 points: ${r((bp * 0.55 + d.ap * 0.12) * p * 5 * mult)}${a.dur ? ` over ${a.dur} s` : ''}`)
      out.push(`Scales with: combo points, attack power (${d.ap}) and rank.`)
      break
    case 'spell': case 'drain': {
      const base = phys ? white * 0.8 + bp * 0.4 : bp * d.spellMult + (d.sp * k) / Math.max(0.01, p)
      out.push(`Damage: ${r(base * p * mult)}${a.aoe ? ' to each enemy in the group' : ''}`)
      if (a.dot) out.push(`Plus a DoT on the enemy: ${Math.round(spellValue(d, bp, a.dot.power, spCoef(a, 'dot') * 0.5) * mult)} over ${a.dot.dur} s${!a.cast ? ' (not refreshed while active)' : ''}`)
      if (a.heal) out.push(`Heals you for ${Math.round(a.heal * 100)}% of the damage dealt.`)
      out.push(`Scales with: ${phys ? `weapon and attack power (${d.ap}); hit chance depends on weapon skill` : spellScale(k)}.`)
      break
    }
    case 'dot':
      if (phys) { out.push(`Damage: ${Math.round((bp * p * d.spellMult + d.ap * 0.1 * (a.dur ?? 12) / 3) * mult)} over ${a.dur ?? 12} s`); out.push(`Scales with: rank and attack power (${d.ap}).`); break }
      out.push(`Damage: ${Math.round(spellValue(d, bp, p, k) * mult)} over ${a.dur ?? 12} s${a.aoe ? ' to each enemy in the group' : ''} (DoT on the enemy, not refreshed while active)`)
      out.push(`Scales with: ${spellScale(k)}.`)
      break
    case 'heal':
      if (a.healPct) out.push(`Heals ${Math.round(a.healPct * 100)}% of maximum health (${Math.round(d.maxHp * a.healPct)}).`)
      else { out.push(`Healing: ${r(healAmount(h, d, a))}`); out.push(`Scales with: ${spellScale(k)} and healing talents.`) }
      break
    case 'hot': {
      const hm = 1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)
      out.push(`Healing: ${Math.round(spellValue(d, bp, p, k) * hm)} over ${a.dur ?? 12} s`)
      out.push(`Scales with: ${spellScale(k)}.`)
      break
    }
    case 'shield': out.push(`Absorbs: ${Math.round(a.shieldPct ? d.maxHp * a.shieldPct : spellValue(d, bp, p, k) * (1 + (d.m.shield ?? 0)))} damage`); break
    case 'stun': break // opis kontroli tłumu niżej (ccText)
    case 'regen': out.push(`Restores ${Math.round((a.power ?? 0.3) * 100)}% mana (${Math.round(d.maxRes * (a.power ?? 0.3))}).`); break
    case 'proc':
      if (a.proc?.extra) out.push(`${Math.round(a.proc.chance * 100)}% chance for an extra weapon attack.`)
      else if (a.proc) {
        const dmg = spellValue(d, bp, a.proc.power, k) * dmgMult(d, a, false)
        if (a.proc.power > 0) out.push(`${Math.round(a.proc.chance * 100)}% chance ${a.proc.on === 'hit' ? 'on hit' : 'when hit'}: ${r(dmg)} damage`)
        if (a.proc.heal) out.push(`${Math.round(a.proc.chance * 100)}% chance: heals ${Math.round(spellValue(d, bp, a.proc.heal, k))}`)
        if (a.proc.mana) out.push(`${Math.round(a.proc.chance * 100)}% chance: +${Math.round(d.maxRes * a.proc.mana)} mana`)
        if (a.proc.power > 0 || a.proc.heal) out.push(`Scales with: ${spellScale(k)}.`)
      }
      break
    case 'totem':
      if (a.tick?.power) out.push(`Every ${a.tick.every} s: ${r(spellValue(d, bp, a.tick.power, k) * dmgMult(d, a, false))} damage${a.aoe ? ' to each enemy' : ''}`)
      if (a.tick?.heal) out.push(`Every ${a.tick.every} s: heals ${Math.round(spellValue(d, bp, a.tick.heal, k))}`)
      if (a.tick?.mana) out.push(`Every ${a.tick.every} s: +${Math.round(d.maxRes * a.tick.mana)} mana`)
      out.push('The totem lasts 5 min, but disappears when you move on to the next enemy.')
      break
  }
  out.push(...ccText(h, a))
  if (a.slow && !CC[a.id]) out.push(`Slow: the enemy moves at half speed for ${a.slow} s, so it needs twice as long to reach you.`)
  if (a.buff && (a.kind === 'buff' || a.kind === 'cooldown' || a.kind === 'totem' || a.kind === 'proc' || a.kind === 'finisher')) {
    const scale = a.kind === 'cooldown' || a.kind === 'finisher' ? 1 : 1 + (a.talent ? h.level : h.trained[a.id] ?? h.level) / 12
    const fx = Object.entries(a.buff).filter(([k]) => k !== 'instant' && k !== 'noPet').map(([k, v]) => {
      const flat = ['ap', 'sta', 'int', 'spi', 'all', 'str', 'agi', 'sp'].includes(k)
      const val = flat ? `+${Math.round((v ?? 0) * scale)}` : k === 'immune' ? '' : `${(v ?? 0) > 0 ? '+' : ''}${Math.round((v ?? 0) * 100)}%`
      const PL: Record<string, string> = { ap: 'attack power', sta: 'Stamina', int: 'Intellect', spi: 'Spirit', all: 'all attributes', str: 'Strength', agi: 'Agility', armor: 'armor', dr: 'damage reduction', crit: 'critical strike', spellCrit: 'spell crit', dodge: 'dodge', haste: 'attack speed', dmg: 'damage', meleeDmg: 'physical damage', castRegen: 'in-combat mana regeneration', mp5: 'mana every 5 s', immune: 'invulnerability', allPct: 'all attributes', petDmg: 'pet damage', energy: 'Energy regeneration', resGen: 'Rage generation', lifesteal: 'healing from Shadow damage', sp: 'spell power', hit: 'hit', sweep: 'damage vs groups (second target)', retal: 'counterattack', cost: 'cost', shadow: 'Shadow damage', dot: 'DoT damage' }
      return `${val} ${PL[k] ?? k}`.trim()
    })
    if (fx.length) out.push(`Effect: ${fx.join(', ')}${a.dur && a.kind !== 'buff' ? ` for ${a.dur} s` : ''}`)
    if (scale > 1) out.push('Flat values grow with the rank you train.')
  }
  return out
}
