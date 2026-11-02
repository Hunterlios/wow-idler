// Rdzeń gry: czysta funkcja kroku symulacji (bez DOM). Ten sam kod liczy grę na żywo,
// progres offline i testy balansu.
import { classById, isMelee, startSkills, type Ability, type Cond, type PetDef } from '../data/classes'
import { raceById, type RaceId } from '../data/races'
import type { ClassId } from '../data/classes'
import { zoneById, ROUTES } from '../data/zones'
import { basePower, derive, dmgMult, grants, knows, active, chosenIn, mobStats, mobXp, rageConv, resourceOf, styleOf, xpToNext, MAX_LEVEL, type Derived } from './formulas'
import { makeGear, makeJunk, makeBag, starterGear, makeQuestItem, makeFood, FOODS } from './items'
import { addToInv, fixInv, countItems } from './inventory'
import { syncQuests } from './quests'
import { makeRng, type Rng } from './rng'
import { subsOf, subOf, progOf, subMobs, subLevels, killsNeeded, bossLevel, bossLook, routeZones, planTrip, portsOf, RIDE_SECS } from './world'
import type { GameEvent, GameState, Hero, Item, MobState, OfflineSummary } from './types'
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
    choice: {}, totems: [], weaponSkills: startSkills(classById(cls)), eating: null, wellFed: null, stacks: {}, heroDodged: false,
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
    unlocked: [start], autoAdvance: true, autoEquip: true, trip: null, phase: 'walk', phaseT: 2, mob: null, quests: [], questsDone: [], buyback: [],
    totals: { kills: 0, deaths: 0, copper: 0, xp: 0, items: 0, quests: 0, played: 0, bosses: 0 }, log: [], savedAt: Date.now(), speed: 1,
  }
  const parent = zoneById(start).parent
  log(s, `${name} budzi się w ${r.start.area}${parent ? ` (${zoneById(parent).name})` : ''}. Zadania czekają w ${r.start.settlement}.`, '#ffd100')
  return s
}

export const currentZone = (s: GameState) => zoneById(s.loc.zone)
export const route = (s: GameState) => ROUTES[s.start]

export function log(s: GameState, text: string, color?: string) {
  s.log.push({ time: Date.now(), text, color })
  if (s.log.length > 150) s.log.splice(0, s.log.length - 150)
}

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
  const key = `${h.level}|${Object.values(h.equip).map((i) => i?.id).join(',')}|${(h.buffs.bloodfury ?? 0) > 0}|${(h.buffs.stoneform ?? 0) > 0}|${(h.buffs.berserking ?? 0) > 0}|${Object.values(h.trained).join(',')}|${JSON.stringify(h.talents)}|${JSON.stringify(h.disabled)}|${h.form}|${temps}|${(h.totems ?? []).map((t) => t.id).join('.')}|${h.wellFed && h.wellFed.left > 0 ? h.wellFed.name : ''}|${JSON.stringify(h.choice)}`
  const c = dcache.get(h)
  if (c && c.key === key) return c.d
  const d = derive(h)
  dcache.set(h, { key, d })
  return d
}

// ------------------------------------------------------------------ pupile
export function activePet(h: Hero): PetDef | null {
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
  if (h.wellFed) { h.wellFed.left -= dt; if (h.wellFed.left <= 0) { h.wellFed = null; log(s, 'Well Fed minął.', '#aaaaaa') } }
  h.sinceCast += dt
  h.gcd = Math.max(0, h.gcd - dt)

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
    h.res = Math.min(d.maxRes, h.res + (perTick / 2) * dt * k)
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
    case 'rest': {
      // bez jedzenia i picia odpoczynek trwa dużo dłużej
      const race = 1 + (raceById(h.race).mods.regenPct ?? 0)
      const e = h.eating
      const eat = e && e.left > 0
      // klasy z leczeniem leczą się czarem po walce (talenty leczenia skracają odpoczynek)
      const selfHeal = healerRest(h, d)
      h.hp = Math.min(d.maxHp, h.hp + (d.maxHp * (0.018 * race + selfHeal) + (eat ? e!.hp : 0)) * dt)
      if (d.res === 'mana') h.res = Math.min(d.maxRes, h.res + (d.maxRes * 0.02 + (eat ? e!.mana : 0)) * dt)
      if (e) e.left -= dt
      const full = h.hp >= d.maxHp * 0.98 && (d.res !== 'mana' || h.res >= d.maxRes * 0.98)
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
      if (s.phaseT <= 0) arrive(s, emit)
      break
  }
}

function regenOut(h: Hero, d: Derived, dt: number, pct: number) {
  h.hp = Math.min(d.maxHp, h.hp + d.maxHp * pct * dt * (1 + (raceById(h.race).mods.regenPct ?? 0)))
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
function startRest(s: GameState, d: Derived) {
  const h = s.hero
  const needHp = h.hp < d.maxHp * 0.9
  const needMana = d.res === 'mana' && h.res < d.maxRes * 0.9
  h.eating = { hp: 0, mana: 0, left: 15 }
  let missing = false
  if (needHp) {
    const i = bestFood(h, 'food')
    if (i >= 0) h.eating.hp = Math.max(consume(h, i).food!.amt * 1.3, d.maxHp * 0.3) / 15
    else if (raceById(h.race).active === 'cannibalize' && !(h.cds.cannibalize > 0)) { h.eating.hp = (d.maxHp * 0.35) / 10; h.cds.cannibalize = 120 }
    else missing = true
  }
  if (needMana) {
    const i = bestFood(h, 'drink')
    if (i >= 0) h.eating.mana = Math.max(consume(h, i).food!.amt * 1.1, d.maxRes * 0.3) / 15
    else missing = true
  }
  if (missing && s.totals.played - lastFoodWarn > 300) {
    lastFoodWarn = s.totals.played
    log(s, `Brak ${needHp && needMana ? 'jedzenia i picia' : needHp ? 'jedzenia' : 'picia'} w torbach: odpoczynek trwa dłużej. Kupisz je u kupca w stolicy.`, '#ff9040')
  }
}
// Jedzenie z buffem (klik w torbie): jeden Well Fed naraz
export function useItem(s: GameState, idx: number): string | null {
  const h = s.hero
  const it = h.inv[idx]
  if (!it?.food) return null
  if (it.food.lvl > h.level) return `Wymaga poziomu ${it.food.lvl}.`
  if (it.food.kind !== 'buff') return 'Postać sama je i pije podczas odpoczynku.'
  if (s.phase === 'fight') return 'Nie możesz jeść w walce.'
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
      hitMob(s, d, bp * a.tick.power * d.spellMult * dmgMult(d, a, false) * n, false, emit, a.school ?? 'fire', a.name)
    }
    if (a.tick.heal) heal(h, d, bp * a.tick.heal * d.spellMult * (1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)), emit, a.name)
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
  return { frontier, need, kills: Math.min(need, p.kills), full: p.kills >= need, lvl }
}

export const aliveOf = (m: MobState) => Math.max(1, Math.min(m.count, Math.ceil(m.hp / m.per - 1e-6)))

function spawn(s: GameState, rng: Rng, emit: Emit) {
  const h = s.hero
  const zoneId = s.loc.zone
  const z = zoneById(zoneId)
  const sub = s.loc.sub
  const style = styleOf(h)
  const b = bossState(s)
  const r = raceById(h.race)
  // wróg podchodzi: postać walcząca wręcz biegnie mu naprzeciw (krótko); kto ma czary/strzały z dystansu,
  // czeka i rzuca je, zanim wróg dojdzie
  const dist = closesIn(h) ? 1.2 : 4.5
  if (b.frontier && b.full) {
    const look = bossLook(zoneId, sub)
    const zoneBoss = subOf(s).zoneBoss
    const ms = mobStats(b.lvl)
    const hp = Math.round(ms.hp * (zoneBoss ? 3.6 : 2.4))
    s.mob = { name: look.name, type: look.type, color: look.color, lvl: b.lvl, hp, maxHp: hp, per: hp, dmg: ms.dmg * (zoneBoss ? 1.35 : 1.2), speed: ms.speed, swing: 1.2, dots: [], stun: 0, dodged: false, count: 1, boss: zoneBoss ? 'zone' : 'mini', dist, dist0: dist, cc: 0, slow: 0 }
    emit({ t: 'spawn', mob: look.name, lvl: b.lvl, boss: s.mob.boss })
    log(s, `${zoneBoss ? 'BOSS' : 'Miniboss'}: ${look.name} (${b.lvl}) wychodzi do walki!`, '#ff8040')
  } else {
    const [name, type, color] = rng.pick(subMobs(zoneId, sub))
    const { lo, hi } = subLevels(zoneId, sub)
    const lvl = Math.max(Math.max(z.min, lo), Math.min(Math.max(lo, hi), h.level + rng.pick([-1, 0, 0, 0, 1])))
    const ms = mobStats(lvl)
    const roll = rng.next()
    const count = h.level < 4 ? 1 : h.level < 8 ? (roll < 0.75 ? 1 : 2) : roll < 0.5 ? 1 : roll < 0.83 ? 2 : 3
    const each = count === 1 ? 1 : count === 2 ? 0.8 : 0.7 // w grupach moby są nieco słabsze
    const per = Math.round(ms.hp * (0.92 + rng.next() * 0.16) * each)
    s.mob = { name, type, color, lvl, hp: per * count, maxHp: per * count, per, dmg: ms.dmg * each, speed: ms.speed, swing: 1.2, dots: [], stun: 0, dodged: false, count, dist, dist0: dist, cc: 0, slow: 0 }
    emit({ t: 'spawn', mob: name, lvl })
  }
  s.phase = 'fight'
  h.swing = style === 'melee' ? 0.3 : 0
  h.cp = 0
  h.heroDodged = false
  h.sinceCast = Math.min(h.sinceCast, 99)
  fightT = 0
  const ready = (k: string) => !(h.cds[k] > 0)
  if (r.active === 'bloodfury' && ready('bloodfury')) { h.buffs.bloodfury = 15; h.cds.bloodfury = 120; emit({ t: 'racial', name: 'Blood Fury' }) }
  if (r.active === 'berserking' && ready('berserking')) { h.buffs.berserking = 10; h.cds.berserking = 180; emit({ t: 'racial', name: 'Berserking' }) }
  if (r.active === 'warstomp' && ready('warstomp') && s.mob) { s.mob.stun = 2; h.cds.warstomp = 120; emit({ t: 'racial', name: 'War Stomp' }) }
}

// Hybryda = walczy wręcz, ale ma czary rzucane z dystansu (szaman, paladyn, druid w formie zwierzęcia nie)
export function isHybrid(h: Hero) {
  if (styleOf(h) !== 'melee') return false
  const g = grants(h)
  return classById(h.cls).abilities.some((a) => (a.kind === 'spell' || a.kind === 'dot' || a.kind === 'drain') && !isMelee(a) && (a.cast ?? 0) > 0 && knows(h, a, g))
}
// Czy postać od razu biegnie do wroga (brak aktywnych czarów z dystansu albo styl "Wręcz")
function closesIn(h: Hero) {
  if (styleOf(h) !== 'melee') return false
  if (h.mode === 'melee') return true
  const g = grants(h)
  return !classById(h.cls).abilities.some((a) => (a.kind === 'spell' || a.kind === 'dot' || a.kind === 'drain') && !isMelee(a) && (a.power ?? 0) > 0 && active(h, a, g))
}

let fightT = 0
const BEASTS = new Set(['beast', 'cat', 'boar', 'raptor'])
const missChance = (d: Derived, up: number, spell: boolean) => Math.max(0, (spell ? 0.04 + up * 0.03 : 0.05 + up * 0.02) - (d.m.hit ?? 0))

function fight(s: GameState, d: Derived, dt: number, rng: Rng, emit: Emit) {
  const h = s.hero
  const mob = s.mob!
  const haste = d.haste
  fightT += dt
  if (mob.slow > 0) mob.slow -= dt
  if (mob.dist > 0) mob.dist = Math.max(0, mob.dist - dt * (mob.slow > 0 ? 0.5 : 1))
  if (mob.cc > 0) mob.cc -= dt
  const inMelee = mob.dist <= 0

  // DoT-y na mobach
  for (const dot of mob.dots) {
    dot.left -= dt
    dot.tickIn -= dt
    if (dot.tickIn <= 0) {
      const crit = (d.m.dotCrit ?? 0) > 0 && rng.chance(d.spellCrit)
      hitMob(s, d, dot.perTick * (crit ? 1.5 + (d.m.critDmg ?? 0) / 2 : 1), crit, emit, dot.school, dot.name)
      dot.tickIn += 3
    }
  }
  mob.dots = mob.dots.filter((x) => x.left > 0)
  if (mob.hp <= 0) return onKill(s, rng, emit)

  // rzucanie / rotacja
  if (h.casting) {
    h.casting.left -= dt * haste
    if (h.casting.left <= 0) {
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
      if (castT > 0) { h.casting = { id: a.id, left: castT, total: castT }; emit({ t: 'cast', ability: a.name, school: a.school, kind: a.kind }) }
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
  const reach = style === 'ranged' || s.mob.dist <= 0
  if ((style !== 'caster' || lowMana || lastNoAction) && !h.casting && reach) {
    h.swing -= dt * haste
    if (h.swing <= 0) {
      h.swing += d.weaponSpeed
      whiteSwing(s, d, rng, emit, style === 'caster' ? 0.6 : 1)
      if (s.mob && s.mob.hp <= 0) return onKill(s, rng, emit)
    }
  }

  // pupil
  const pet = activePet(h)
  if (pet && s.mob) {
    h.petSwing -= dt
    if (h.petSwing <= 0) {
      h.petSwing += 2
      const dmg = basePower(h.level) * pet.dmg * (1 + (raceById(h.race).mods.petDmg ?? 0) + (d.m.pet ?? 0) + (d.m.petDmg ?? 0)) * (0.85 + rng.next() * 0.3)
      hitMob(s, d, dmg, false, emit, pet.school, pet.name, 'pet')
      if (s.mob.hp <= 0) return onKill(s, rng, emit)
    }
  }

  // ataki mobów (grupa bije razem) — dopiero gdy dojdą do postaci
  if (!s.mob || !inMelee) { if (h.hp <= 0) onDeath(s, emit); return }
  if (mob.stun > 0) mob.stun -= dt
  else {
    mob.swing -= dt
    if (mob.swing <= 0) {
      mob.swing += mob.speed
      const alive = aliveOf(mob)
      const attackers = Math.max(alive > 1 && mob.cc > 0 ? alive - 1 : alive, 1)
      if (pet?.tank && rng.chance(0.7)) {
        // pupil przyjmuje cios
      } else if ((d.m.immune ?? 0) > 0) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'absorb' })
      else {
        const roll = rng.next()
        if (roll < 0.05) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'miss' })
        else if (roll < 0.05 + Math.min(0.75, d.dodge)) { emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'dodge' }); h.heroDodged = true }
        else {
          const up = Math.max(0, mob.lvl - h.level)
          let dmg = mob.dmg * attackers * (attackers > 1 ? 0.75 : 1) * (1 + 0.12 * up + 0.02 * up * up) * (0.85 + rng.next() * 0.3) * (1 - d.dr(mob.lvl))
          if (rng.chance(0.05)) dmg *= 1.5
          if (h.shield > 0) {
            const ab = Math.min(h.shield, dmg)
            h.shield -= ab
            dmg -= ab
            if (dmg <= 0) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'absorb' })
          }
          if (dmg > 0) {
            h.hp -= dmg
            emit({ t: 'dmg', src: 'mob', amt: Math.round(dmg) })
            castHit(s, d, rng, emit)
            if (d.res === 'rage') h.res = Math.min(100, h.res + ((2.5 * dmg) / rageConv(h.level)) * (1 + (d.m.resGen ?? 0)))
          }
          procs(s, d, rng, emit, 'taken')
          if (s.mob && s.mob.hp <= 0) return onKill(s, rng, emit)
        }
        if ((d.m.retal ?? 0) > 0 && s.mob) {
          hitMob(s, d, whiteHit(d, rng) * d.m.retal, false, emit, 'physical', 'Retaliation')
          if (s.mob.hp <= 0) return onKill(s, rng, emit)
        }
        const r = raceById(h.race)
        if (r.active === 'stoneform' && h.hp < d.maxHp * 0.4 && !(h.cds.stoneform > 0)) { h.buffs.stoneform = 8; h.cds.stoneform = 180; emit({ t: 'racial', name: 'Stoneform' }) }
      }
    }
  }
  if (h.hp <= 0) onDeath(s, emit)
}
let lastNoAction = false

// Ciosy w trakcie rzucania: cofają pasek (czary) albo skracają kanał; czasem wróg przerywa czar.
// Talenty "mniej przerywania" (np. Eye of the Storm, Healing Focus) dają klucz pushback.
function castHit(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const h = s.hero
  const c = h.casting
  const mob = s.mob
  if (!c || !mob) return
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

function whiteSwing(s: GameState, d: Derived, rng: Rng, emit: Emit, mult: number) {
  const h = s.hero
  const mob = s.mob!
  const roll = rng.next()
  const miss = missChance(d, Math.max(0, mob.lvl - h.level), false)
  if (roll < miss) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss' }); return }
  if (roll < miss + 0.05) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'dodge' }); mob.dodged = true; return }
  const crit = rng.chance(d.crit)
  let dmg = whiteHit(d, rng) * (crit ? 2 + (d.m.critDmg ?? 0) : 1) * mult * dmgMult(d, null, true) * sweepMul(s, d)
  if (h.race === 'troll' && BEASTS.has(mob.type)) dmg *= 1.05
  hitMob(s, d, dmg, crit, emit, 'physical')
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
    if (a.proc.heal) heal(h, d, bp * a.proc.heal * d.spellMult, emit, a.name)
    if (a.proc.mana && d.res === 'mana') h.res = Math.min(d.maxRes, h.res + d.maxRes * a.proc.mana)
    if (a.proc.power > 0) hitMob(s, d, bp * a.proc.power * d.spellMult * dmgMult(d, a, false), false, emit, a.school ?? 'physical', a.name)
    if (!s.mob || s.mob.hp <= 0) return
  }
}
function whiteSwingNoProc(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const crit = rng.chance(d.crit)
  hitMob(s, d, whiteHit(d, rng) * (crit ? 2 : 1) * dmgMult(d, null, true) * (1 + (d.m['ab:windfury'] ?? 0)), crit, emit, 'physical', 'Windfury')
}

function whiteHit(d: Derived, rng: Rng) {
  return (d.weaponDps + d.ap / 14) * d.weaponSpeed * (0.85 + rng.next() * 0.3)
}

function hitMob(s: GameState, d: Derived, amt: number, crit: boolean, emit: Emit, school: Ability['school'], ability?: string, src: 'hero' | 'pet' = 'hero') {
  const mob = s.mob
  if (!mob) return
  const up = Math.max(0, mob.lvl - s.hero.level)
  const a = Math.max(1, Math.round(amt * Math.max(0.4, 1 - 0.05 * up)))
  const before = aliveOf(mob)
  mob.hp -= a
  emit({ t: 'dmg', src, amt: a, crit, school, ability })
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
  return d.res === 'mana' ? Math.round((a.cost / 100) * d.maxRes * 0.22 * mul) : Math.round(a.cost * (tempCost < 0 ? 0 : 1))
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
    case 'opener': return fightT < mob.dist0 + 1.6
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
    case 'notStunned': return mob.stun <= 0
    case 'noTemp': return !(h.temp[a.id] > 0)
    case 'lvl<10': return h.level < 10
    case 'lvl<20': return h.level < 20
    case 'dot:immolate': return mob.dots.some((x) => x.id === 'immolate')
    case 'fireTotem': return h.totems.some((t) => t.el === 'fire')
    case 'shield': return h.equip.offhand?.weaponType === 'Shield'
    case 'boss': return !!mob.boss || aliveOf(mob) >= 3
    case 'twoTotems': return missingTotems(h).length >= 2
    case 'behind': return mob.stun > 0 || fightT < mob.dist0 + 1.6
  }
  return true
}

// Domyślne warunki i priorytety wg rodzaju (gdy umiejętność nie ma własnych)
const KIND_PRIO: Record<string, number> = { heal: 8, shield: 10, stun: 12, regen: 6, lifetap: 6, totem: 4, cooldown: 14, execute: 16, finisher: 25, dot: 36, drain: 45, hot: 9, strike: 60, spell: 60 }
function defaults(a: Ability): Cond[] {
  switch (a.kind) {
    case 'heal': return ['hp<45']
    case 'hot': return ['hp<75', 'noHot']
    case 'shield': return ['noShield']
    case 'dot': return ['noDot', 'mob>30']
    case 'stun': return ['notStunned', 'hp<50']
    case 'cooldown': return ['noTemp']
    case 'execute': return ['mob<20']
    case 'regen': return ['mana<30']
    default: return []
  }
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
  let best: Ability | null = null
  let bestP = Infinity
  let bestScore = -1
  for (const a of classById(h.cls).abilities) {
    if (a.kind === 'buff' || a.kind === 'proc' || a.kind === 'form' || a.kind === 'summon') continue
    if (!active(h, a, g)) continue
    if (h.cds[a.id] > 0) continue
    if (mob.dist > 0 && isMelee(a) && !a.closes) continue // poza zasięgiem zwarcia
    if (a.closes && mob.dist <= 0) continue
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
    let p = a.prio ?? KIND_PRIO[a.kind] ?? 60
    // pełny Maelstrom: natychmiastowy Lightning Bolt; 4 ładunki Arcane Blast: Arcane Missiles
    const special = (a.id === 'lightning_bolt' && (h.stacks.mw ?? 0) >= 5) || (a.id === 'arcane_missiles' && (h.stacks.ab ?? 0) >= 4)
    if (special) p = 5
    else {
      const conds = [...(a.closes ? [] : defaults(a)), ...(a.when ?? [])]
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
  if (a.closes) mob.dist = 0
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
      if (rng.chance(missChance(d, up, false))) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability: a.name }); return }
      const crit = rng.chance(d.crit + (a.buff?.crit ?? 0))
      const base = a.school && a.school !== 'physical' ? whiteHit(d, rng) * 0.5 + bp * 0.6 * d.spellMult : whiteHit(d, rng) * 0.55 + bp * 0.55
      hitMob(s, d, base * (a.power ?? 1) * (crit ? critMul(true) : 1) * mult * aoeN * (a.aoe ? 1 : sweepMul(s, d)), crit, emit, a.school, a.name)
      if (a.heal) heal(h, d, d.maxHp * a.heal, emit, a.name)
      if (a.cp) h.cp = Math.min(5, h.cp + a.cp)
      if (a.stun && s.mob) s.mob.stun = Math.max(s.mob.stun, a.stun)
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
      if (a.stun) { mob.stun = Math.max(mob.stun, a.stun * cp); return }
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
      if (spellMiss()) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability: a.name }); return }
      let stack = 1
      if (a.id === 'arcane_blast') { stack = 1 + 0.15 * (h.stacks.ab ?? 0); h.stacks.ab = Math.min(4, (h.stacks.ab ?? 0) + 1) }
      if (a.id === 'arcane_missiles') { stack = 1 + 0.15 * (h.stacks.ab ?? 0); h.stacks.ab = 0 }
      if (a.id === 'lightning_bolt') h.stacks.mw = 0
      const crit = rng.chance((phys ? d.crit : d.spellCrit) + (a.buff?.crit ?? 0))
      const base = phys ? whiteHit(d, rng) * 0.8 + bp * 0.4 : bp * d.spellMult * (0.92 + rng.next() * 0.16)
      const dmg = base * (a.power ?? 1) * (crit ? critMul(phys) : 1) * mult * aoeN * stack
      hitMob(s, d, dmg, crit, emit, a.school, a.name)
      if (a.heal) heal(h, d, dmg * a.heal, emit, a.name)
      if (a.dot && s.mob) {
        const total = bp * a.dot.power * d.spellMult * mult
        const ticks = Math.max(1, Math.round(a.dot.dur / 3))
        s.mob.dots = s.mob.dots.filter((x) => x.id !== a.id)
        s.mob.dots.push({ id: a.id, name: a.name, school: a.school ?? 'fire', perTick: total / ticks, left: a.dot.dur, tickIn: 3 })
      }
      if (a.slow && s.mob) s.mob.slow = Math.max(s.mob.slow, a.slow)
      // Lightning Overload (Forever): darmowa kopia błyskawicy za połowę obrażeń
      if ((a.id === 'lightning_bolt' || a.id === 'chain_lightning') && s.mob && s.mob.hp > 0 && rng.chance(d.m.overload ?? 0)) hitMob(s, d, dmg * 0.5, false, emit, a.school, `${a.name} (Overload)`)
      if (d.m.instant && a.cast) clearInstant(h)
      return
    }
    case 'dot': {
      const total = bp * (a.power ?? 1) * d.spellMult * mult * aoeN
      const ticks = Math.max(1, Math.round((a.dur ?? 12) / 3))
      mob.dots = mob.dots.filter((x) => x.id !== a.id)
      mob.dots.push({ id: a.id, name: a.name, school: a.school ?? 'shadow', perTick: total / ticks, left: a.dur ?? 12, tickIn: 3 })
      if (a.cp) h.cp = Math.min(5, h.cp + a.cp)
      if (a.heal) heal(h, d, total * a.heal * 0.5, emit, a.name)
      return
    }
    case 'heal': {
      if (a.healPct) { heal(h, d, d.maxHp * a.healPct, emit, a.name); return }
      const hm = 1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)
      heal(h, d, bp * (a.power ?? 1) * d.spellMult * hm, emit, a.name)
      return
    }
    case 'hot': {
      const ticks = Math.max(1, Math.round((a.dur ?? 12) / 3))
      const hm = 1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)
      h.hot = { perTick: (bp * (a.power ?? 1) * d.spellMult * hm) / ticks, left: a.dur ?? 12, tickIn: 3 }
      if (a.id === 'riptide') heal(h, d, bp * 1.2 * d.spellMult * hm, emit, a.name)
      return
    }
    case 'shield':
      h.shield = a.shieldPct ? d.maxHp * a.shieldPct : bp * (a.power ?? 1) * d.spellMult * (1 + (d.m.shield ?? 0))
      return
    case 'stun':
      if (a.cc) { if (aliveOf(mob) >= 2) mob.cc = Math.max(mob.cc, a.dur ?? 6) }
      else mob.stun = Math.max(mob.stun, a.dur ?? 2)
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
    if (q.have >= q.need) { emit({ t: 'questdone', quest: q }); log(s, `Zadanie gotowe do oddania: ${q.title}`, '#ffd100') }
  }

  const p = progOf(s)
  const subs = subsOf(s.loc.zone)
  if (mob.boss) {
    s.totals.bosses++
    const sz = subs[s.loc.sub]
    p.cleared = Math.max(p.cleared, s.loc.sub + 1)
    p.kills = 0
    emit({ t: 'cleared', zone: s.loc.zone, sub: s.loc.sub, boss: mob.name, zoneBoss: sz.zoneBoss })
    if (sz.zoneBoss) {
      const r = routeZones(s)
      const next = r[r.indexOf(s.loc.zone) + 1]
      log(s, `${mob.name} pokonany! ${zoneById(s.loc.zone).name} ukończona.`, '#ff8040')
      if (next) log(s, `Następna mapa na trasie: ${zoneById(next).name} (${zoneById(next).min}-${zoneById(next).max})`, '#69ccf0')
      if (next && s.autoAdvance) { moveTo(s, next, 0, emit, true); return }
    } else {
      log(s, `${mob.name} pokonany! Odblokowano: ${subs[s.loc.sub + 1].name}`, '#ff8040')
      if (s.autoAdvance) { moveTo(s, s.loc.zone, s.loc.sub + 1, emit, true); return }
    }
  } else if (s.loc.sub === p.cleared && p.cleared < subs.length) {
    p.kills = Math.min(killsNeeded(s.loc.zone, s.loc.sub), p.kills + mob.count)
  }

  const d = stats(h)
  const needRest = h.hp < d.maxHp * 0.55 || (d.res === 'mana' && h.res < d.maxRes * 0.35)
  if (needRest) {
    s.phase = 'rest'
    if (raceById(h.race).active === 'cannibalize' && h.hp < d.maxHp * 0.5 && !(h.cds.cannibalize > 0) && bestFood(h, 'food') < 0) emit({ t: 'racial', name: 'Cannibalize' })
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
  const p = planTrip(s.hero.faction, s.loc.zone, zone, form?.speed ?? 0, auto)
  const fromName = `${zoneById(s.loc.zone).name}${s.where === 'field' ? `: ${subOf(s).name}` : ''}`
  const toName = `${zoneById(zone).name}: ${subsOf(zone)[sub].name}`
  return { ...p, form: form?.name, fromName, toName }
}
export const isTraveling = (s: GameState) => s.phase === 'travel' && !!s.trip

function startTrip(s: GameState, trip: GameState['trip'], secs: number) {
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
  if (isTraveling(s)) return 'Jesteś już w podróży.'
  const plan = tripPlan(s, zone, sub, auto)
  if (plan.blocked) return plan.blocked
  startTrip(s, { kind: plan.kind, label: plan.label || `${zone !== s.loc.zone ? 'Podróż' : 'Marsz'}: ${plan.toName}`, total: plan.total, from: plan.fromName, to: plan.toName, form: plan.form, dest: { zone, sub } }, plan.total)
  log(s, `${plan.label || `Podróż: ${plan.fromName} → ${plan.toName}`} (${plan.total} s${plan.form ? `, ${plan.form}` : ''})`, '#69ccf0')
  return null
}

// Statek / zeppelin z portu na obecnej mapie
export function ride(s: GameState, index: number, emit: Emit = noop): string | null {
  if (isTraveling(s)) return 'Jesteś już w podróży.'
  const port = portsOf(s.hero.faction, s.loc.zone).find((p) => p.i === index)
  if (!port) return 'Z tej mapy nie odpływa ten transport.'
  const toName = `${zoneById(port.to).name}: ${subsOf(port.to)[0].name}`
  const secs = RIDE_SECS + 10
  startTrip(s, { kind: port.t.kind, label: port.t.label, total: secs, from: zoneById(s.loc.zone).name, to: toName, dest: { zone: port.to, sub: 0 } }, secs)
  log(s, `${port.t.label} (${secs} s)`, '#69ccf0')
  void emit
  return null
}

function arrive(s: GameState, emit: Emit) {
  const dest = s.trip?.dest
  s.phase = 'walk'
  s.phaseT = 1
  s.trip = null
  if (!dest) return
  const changed = dest.zone !== s.loc.zone
  s.loc = { zone: dest.zone, sub: dest.sub }
  if (!s.unlocked.includes(dest.zone)) {
    s.unlocked.push(dest.zone)
    log(s, `Odkryto: ${zoneById(dest.zone).name} (${zoneById(dest.zone).min}-${zoneById(dest.zone).max})`, '#69ccf0')
  }
  progOf(s, dest.zone)
  if (changed) emit({ t: 'zone', zone: dest.zone })
  emit({ t: 'sub', zone: dest.zone, sub: dest.sub })
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
    log(s, `Awans! Poziom ${h.level}.${learnable ? ` Trener ma dla ciebie ${learnable} ${learnable === 1 ? 'nową rangę' : 'nowych rang'}.` : ''}${h.level >= 10 ? ' +1 punkt talentu.' : ''}`, '#ffd100')
  }
  if (h.level >= MAX_LEVEL) h.xp = 0
}

let lastFullWarn = 0
function addLoot(s: GameState, it: Item, emit: Emit) {
  const h = s.hero
  s.totals.items++
  if (addToInv(h, it)) {
    emit({ t: 'loot', item: it, equipped: false })
    if (it.rarity >= 2) log(s, `Łup: [${it.name}]`, ['#9d9d9d', '#fff', '#1eff00', '#0070dd', '#a335ee'][it.rarity])
  } else {
    emit({ t: 'bagsfull', item: it })
    if (s.totals.played - lastFullWarn > 60 || it.rarity >= 2) { lastFullWarn = s.totals.played; log(s, `Torby pełne! Przepada: [${it.name}]. Sprzedaj rzeczy w stolicy.`, '#ff6060') }
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
  // śmierć w podstrefie, której jeszcze nie oczyszczono = zaczynasz ją od początku
  const p = progOf(s)
  const reset = s.loc.sub === p.cleared && p.kills > 0
  if (reset) p.kills = 0
  emit({ t: 'death', boss, reset })
  log(s, `${boss ? `${boss} cię pokonał.` : 'Zginąłeś.'}${reset ? ' Postęp podstrefy wyzerowany: zaczynasz od nowa.' : ''}`, '#ff4040')
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
  if (sum.kills) log(s, `Gdy cię nie było: ${sum.kills} zabitych, +${sum.levels} poz.`, '#69ccf0')
  return sum
}

export { resourceOf }
