// Rdzeń gry: czysta funkcja kroku symulacji (bez DOM). Ten sam kod liczy grę na żywo,
// progres offline i testy balansu.
import { classById, type Ability, type Cond, type PetDef } from '../data/classes'
import { raceById, type RaceId } from '../data/races'
import type { ClassId } from '../data/classes'
import { zoneById, ROUTES } from '../data/zones'
import { basePower, derive, dmgMult, grants, knows, formOk, mobStats, mobXp, rageConv, resourceOf, styleOf, xpToNext, MAX_LEVEL, type Derived } from './formulas'
import { makeGear, makeJunk, makeBag, starterGear } from './items'
import { addToInv, autoEquip, fixInv } from './inventory'
import { makeRng, type Rng } from './rng'
import { subsOf, subOf, progOf, subMobs, subLevels, killsNeeded, bossLevel, bossLook, routeZones, planTrip } from './world'
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
    cds: {}, buffs: {}, casting: null, hot: null, shield: 0, gcd: 0, swing: 0, sinceCast: 99, petSwing: 0,
  }
  for (const it of starterGear(hero)) hero.equip[it.slot === 'twohand' ? 'mainhand' : (it.slot as keyof Hero['equip'])] = it
  for (const a of classById(cls).abilities) if (a.lvl === 1 && !a.talent) hero.trained[a.id] = 1
  fixInv(hero)
  const d = derive(hero)
  hero.hp = d.maxHp
  hero.res = d.res === 'rage' ? 0 : d.maxRes
  const start = r.start.zone
  const s: GameState = {
    v: 3, seed, itemSeq: 10, hero, start, loc: { zone: start, sub: 0 }, where: 'field', prog: { [start]: { cleared: 0, kills: 0 } },
    unlocked: [start], autoAdvance: true, autoEquip: true, trip: null, phase: 'walk', phaseT: 2, mob: null, quests: [], questsDone: [],
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
  const key = `${h.level}|${Object.values(h.equip).map((i) => i?.id).join(',')}|${(h.buffs.bloodfury ?? 0) > 0}|${(h.buffs.stoneform ?? 0) > 0}|${(h.buffs.berserking ?? 0) > 0}|${Object.values(h.trained).join(',')}|${JSON.stringify(h.talents)}|${JSON.stringify(h.disabled)}|${h.form}|${temps}`
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
  h.sinceCast += dt
  h.gcd = Math.max(0, h.gcd - dt)

  if (s.where !== 'field') {
    s.phase = 'town'
    h.hp = d.maxHp
    if (d.res === 'mana') h.res = d.maxRes
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

  switch (s.phase) {
    case 'walk':
      regenOut(h, d, dt, 0.008)
      s.phaseT -= dt
      if (s.phaseT <= 0) spawn(s, rng, emit)
      break
    case 'fight':
      if (!s.mob) { s.phase = 'walk'; s.phaseT = 1; break }
      fight(s, d, dt, rng, emit)
      break
    case 'rest': {
      const k = 0.06 * (1 + (raceById(h.race).mods.regenPct ?? 0))
      h.hp = Math.min(d.maxHp, h.hp + d.maxHp * k * dt)
      if (d.res === 'mana') h.res = Math.min(d.maxRes, h.res + d.maxRes * 0.06 * dt)
      const full = h.hp >= d.maxHp * 0.98 && (d.res !== 'mana' || h.res >= d.maxRes * 0.98)
      if (full) { s.phase = 'walk'; s.phaseT = 1 + rng.next() * 2 }
      break
    }
    case 'dead':
      s.phaseT -= dt
      if (s.phaseT <= 0) {
        h.hp = d.maxHp * 0.5
        if (d.res === 'mana') h.res = d.maxRes * 0.5
        s.phase = 'rest'
        emit({ t: 'revive' })
      }
      break
    case 'travel':
      regenOut(h, d, dt, 0.05)
      s.phaseT -= dt
      if (s.phaseT <= 0) { s.phase = 'walk'; s.phaseT = 1; s.trip = null }
      break
  }
}

function regenOut(h: Hero, d: Derived, dt: number, pct: number) {
  h.hp = Math.min(d.maxHp, h.hp + d.maxHp * pct * dt * (1 + (raceById(h.race).mods.regenPct ?? 0)))
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
  if (b.frontier && b.full) {
    const look = bossLook(zoneId, sub)
    const zoneBoss = subOf(s).zoneBoss
    const ms = mobStats(b.lvl)
    const hp = Math.round(ms.hp * (zoneBoss ? 3.6 : 2.4))
    s.mob = { name: look.name, type: look.type, color: look.color, lvl: b.lvl, hp, maxHp: hp, per: hp, dmg: ms.dmg * (zoneBoss ? 1.35 : 1.2), speed: ms.speed, swing: style === 'melee' ? 1.2 : 2.6, dots: [], stun: 0, dodged: false, count: 1, boss: zoneBoss ? 'zone' : 'mini' }
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
    s.mob = { name, type, color, lvl, hp: per * count, maxHp: per * count, per, dmg: ms.dmg * each, speed: ms.speed, swing: style === 'melee' ? 1.2 : 2.6, dots: [], stun: 0, dodged: false, count }
    emit({ t: 'spawn', mob: name, lvl })
  }
  s.phase = 'fight'
  h.swing = style === 'melee' ? 0.4 : 0
  h.cp = 0
  h.sinceCast = Math.min(h.sinceCast, 99)
  fightT = 0
  const ready = (k: string) => !(h.cds[k] > 0)
  if (r.active === 'bloodfury' && ready('bloodfury')) { h.buffs.bloodfury = 15; h.cds.bloodfury = 120; emit({ t: 'racial', name: 'Blood Fury' }) }
  if (r.active === 'berserking' && ready('berserking')) { h.buffs.berserking = 10; h.cds.berserking = 180; emit({ t: 'racial', name: 'Berserking' }) }
  if (r.active === 'warstomp' && ready('warstomp') && s.mob) { s.mob.stun = 2; h.cds.warstomp = 120; emit({ t: 'racial', name: 'War Stomp' }) }
}

let fightT = 0
const BEASTS = new Set(['beast', 'cat', 'boar', 'raptor'])

function fight(s: GameState, d: Derived, dt: number, rng: Rng, emit: Emit) {
  const h = s.hero
  const mob = s.mob!
  const haste = d.haste
  fightT += dt

  // DoT-y na mobach
  for (const dot of mob.dots) {
    dot.left -= dt
    dot.tickIn -= dt
    if (dot.tickIn <= 0) { hitMob(s, d, dot.perTick, false, emit, dot.school, dot.name); dot.tickIn += 3 }
  }
  mob.dots = mob.dots.filter((x) => x.left > 0)
  if (mob.hp <= 0) return onKill(s, rng, emit)

  // rzucanie / rotacja
  if (h.casting) {
    h.casting.left -= dt * haste
    if (h.casting.left <= 0) {
      const a = classById(h.cls).abilities.find((x) => x.id === h.casting!.id)!
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
      h.gcd = d.res === 'energy' ? 1 : 1.5
      lastNoAction = false
    } else lastNoAction = true
  }
  if (!s.mob) return

  // białe ataki: melee/łowca; caster tylko bez many albo gdy nie ma czego rzucać
  const style = styleOf(h)
  const lowMana = d.res === 'mana' && h.res < d.maxRes * 0.12
  if ((style !== 'caster' || lowMana || lastNoAction) && !h.casting) {
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

  // ataki mobów (grupa bije razem)
  if (!s.mob) return
  if (mob.stun > 0) mob.stun -= dt
  else {
    mob.swing -= dt
    if (mob.swing <= 0) {
      mob.swing += mob.speed
      const alive = aliveOf(mob)
      if (pet?.tank && rng.chance(0.7)) {
        // pupil przyjmuje cios
      } else {
        const roll = rng.next()
        if (roll < 0.05) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'miss' })
        else if (roll < 0.05 + Math.min(0.75, d.dodge)) emit({ t: 'dmg', src: 'mob', amt: 0, miss: 'dodge' })
        else {
          const up = Math.max(0, mob.lvl - h.level)
          let dmg = mob.dmg * alive * (alive > 1 ? 0.75 : 1) * (1 + 0.12 * up + 0.02 * up * up) * (0.85 + rng.next() * 0.3) * (1 - d.dr(mob.lvl))
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
            if (d.res === 'rage') h.res = Math.min(100, h.res + ((2.5 * dmg) / rageConv(h.level)) * (1 + (d.m.resGen ?? 0)))
          }
          procs(s, d, rng, emit, 'taken')
          if (s.mob && s.mob.hp <= 0) return onKill(s, rng, emit)
        }
        const r = raceById(h.race)
        if (r.active === 'stoneform' && h.hp < d.maxHp * 0.4 && !(h.cds.stoneform > 0)) { h.buffs.stoneform = 8; h.cds.stoneform = 180; emit({ t: 'racial', name: 'Stoneform' }) }
      }
    }
  }
  if (h.hp <= 0) onDeath(s, emit)
}
let lastNoAction = false

function whiteSwing(s: GameState, d: Derived, rng: Rng, emit: Emit, mult: number) {
  const h = s.hero
  const mob = s.mob!
  const roll = rng.next()
  const miss = 0.05 + Math.max(0, mob.lvl - h.level) * 0.02
  if (roll < miss) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss' }); return }
  if (roll < miss + 0.05) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'dodge' }); mob.dodged = true; return }
  const crit = rng.chance(d.crit)
  let dmg = whiteHit(d, rng) * (crit ? 2 + (d.m.critDmg ?? 0) : 1) * mult * dmgMult(d, null, true)
  if (h.race === 'troll' && BEASTS.has(mob.type)) dmg *= 1.05
  hitMob(s, d, dmg, crit, emit, 'physical')
  if (d.res === 'rage') h.res = Math.min(100, h.res + ((7.5 * dmg) / rageConv(h.level) / (crit ? 2 : 1)) * (1 + (d.m.resGen ?? 0)))
  procs(s, d, rng, emit, 'hit')
}

// Procki: trucizny, pieczęcie, nasycenia broni (on: hit) i tarcze/aury (on: taken)
function procs(s: GameState, d: Derived, rng: Rng, emit: Emit, on: 'hit' | 'taken') {
  const h = s.hero
  if (!s.mob) return
  const g = grants(h)
  for (const a of classById(h.cls).abilities) {
    if (a.kind !== 'proc' || !a.proc || a.proc.on !== on || h.disabled[a.id] || !knows(h, a, g) || !formOk(h, a)) continue
    if (!rng.chance(a.proc.chance)) continue
    if (a.proc.extra) { whiteSwingNoProc(s, d, rng, emit); continue }
    const bp = basePower(Math.min(h.level, h.trained[a.id] ?? h.level))
    hitMob(s, d, bp * a.proc.power * d.spellMult * dmgMult(d, a, false), false, emit, a.school ?? 'physical', a.name)
    if (!s.mob || s.mob.hp <= 0) return
  }
}
function whiteSwingNoProc(s: GameState, d: Derived, rng: Rng, emit: Emit) {
  const crit = rng.chance(d.crit)
  hitMob(s, d, whiteHit(d, rng) * (crit ? 2 : 1) * dmgMult(d, null, true), crit, emit, 'physical', 'Windfury')
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
  const mul = Math.max(0, 1 - tempCost)
  return d.res === 'mana' ? Math.round((a.cost / 100) * d.maxRes * 0.22 * mul) : Math.round(a.cost * (tempCost < 0 ? 0 : 1))
}
function castTime(h: Hero, d: Derived, a: Ability) {
  if (!a.cast) return 0
  if ((d.m.instant ?? 0) > 0) return 0
  const red = (d.m[`cast:${a.id}`] ?? 0) + (d.m[`cast:${a.school}`] ?? 0) + (d.m['cast:all'] ?? 0)
  return Math.max(0, a.cast * (1 - Math.min(0.6, red)))
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
    case 'hp<35': return hp < 0.35
    case 'hp<45': return hp < 0.45
    case 'hp<50': return hp < 0.5
    case 'hp<60': return hp < 0.6
    case 'hp<75': return hp < 0.75
    case 'hp>60': return hp > 0.6
    case 'mob<20': return mobPct < 0.2
    case 'mob>30': return mobPct > 0.3
    case 'mob>50': return mobPct > 0.5
    case 'noDot': return !mob.dots.some((x) => x.id === a.id)
    case 'dodged': return mob.dodged
    case 'cp>=2': return h.cp >= 2
    case 'cp>=3': return h.cp >= 3
    case 'cp5': return h.cp >= 5
    case 'pack': return aliveOf(mob) >= 2
    case 'opener': return fightT < 1.6
    case 'mana<20': return d.res === 'mana' && mana < 0.2
    case 'mana<30': return d.res === 'mana' && mana < 0.3
    case 'mana>40': return mana > 0.4
    case 'mana>60': return mana > 0.6
    case 'res>=25': return h.res >= 25
    case 'res>=30': return h.res >= 30
    case 'res>=40': return h.res >= 40
    case 'res>=50': return h.res >= 50
    case 'noShield': return h.shield <= 0
    case 'noHot': return !h.hot
    case 'hot': return !!h.hot
    case 'undead': return mob.type === 'undead'
    case 'stunned': return mob.stun > 0
    case 'notStunned': return mob.stun <= 0
    case 'noTemp': return !(h.temp[a.id] > 0)
    case 'lvl<10': return h.level < 10
    case 'dot:immolate': return mob.dots.some((x) => x.id === 'immolate')
  }
  return true
}

// Domyślne warunki i priorytety wg rodzaju (gdy umiejętność nie ma własnych)
const KIND_PRIO: Record<string, number> = { heal: 8, shield: 10, stun: 12, regen: 6, lifetap: 6, cooldown: 14, execute: 16, finisher: 25, dot: 36, drain: 45, hot: 9, strike: 60, spell: 60 }
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
  const g = grants(h)
  const shadowform = (d.m['school:shadow'] ?? 0) >= 0.15 && !h.disabled.shadowform && g.has('shadowform')
  let best: Ability | null = null
  let bestP = Infinity
  let bestScore = -1
  for (const a of classById(h.cls).abilities) {
    if (a.kind === 'buff' || a.kind === 'proc' || a.kind === 'form' || a.kind === 'summon') continue
    if (!knows(h, a, g) || h.disabled[a.id] || !formOk(h, a)) continue
    if (h.cds[a.id] > 0) continue
    if (shadowform && a.school === 'holy' && a.kind !== 'heal' && a.kind !== 'shield' && a.kind !== 'hot') continue
    if (a.kind === 'lifetap') { if (!(a.when ?? []).every((c) => cond(s, d, c, a))) continue }
    else if (h.res < costOf(h, a, d)) continue
    if (a.kind === 'finisher') {
      const fin = h.cp >= 5 || (h.cp >= 3 && (s.mob!.hp / s.mob!.maxHp < 0.3 || h.level < 10)) || (h.cp >= 1 && s.mob!.hp / s.mob!.maxHp < 0.08)
      if (!fin) continue
    }
    const conds = [...defaults(a), ...(a.when ?? [])]
    if (!conds.every((c) => cond(s, d, c, a))) continue
    const p = a.prio ?? KIND_PRIO[a.kind] ?? 60
    const score = (a.power ?? 1) / Math.max(1.5, a.cast ?? 0) * (a.aoe ? aliveOf(s.mob!) : 1)
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
  if (a.cd) h.cds[a.id] = a.cd
  const bp = basePower(a.talent ? h.level : Math.min(h.level, h.trained[a.id] ?? h.level))
  const beast = h.race === 'troll' && BEASTS.has(mob.type) ? 1.05 : 1
  if (!a.cast) emit({ t: 'cast', ability: a.name, school: a.school, kind: a.kind })
  const phys = a.school === 'physical' || !a.school
  const mult = dmgMult(d, a, phys) * beast
  const aoeN = a.aoe ? Math.min(3, aliveOf(mob)) : 1
  const spellMiss = () => rng.chance(0.04 + Math.max(0, mob.lvl - h.level) * 0.03)
  const critMul = (p: boolean) => (p ? 2 + (d.m.critDmg ?? 0) : 1.5 + (d.m.critDmg ?? 0) / 2)
  if (a.gain) h.res = Math.min(d.res === 'mana' ? d.maxRes : 100, h.res + a.gain)

  switch (a.kind) {
    case 'strike': {
      if (rng.chance(0.05)) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability: a.name }); return }
      const crit = rng.chance(d.crit + (a.buff?.crit ?? 0))
      const base = a.school && a.school !== 'physical' ? whiteHit(d, rng) * 0.5 + bp * 0.6 * d.spellMult : whiteHit(d, rng) * 0.55 + bp * 0.55
      hitMob(s, d, base * (a.power ?? 1) * (crit ? critMul(true) : 1) * mult * aoeN, crit, emit, a.school, a.name)
      if (a.heal) heal(h, d, d.maxHp * a.heal, emit, a.name)
      if (a.cp) h.cp = Math.min(5, h.cp + a.cp)
      if (a.stun && s.mob) s.mob.stun = Math.max(s.mob.stun, a.stun)
      if (a.id === 'overpower' || a.id === 'mongoose_bite') mob.dodged = false
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
      if (spellMiss()) { emit({ t: 'dmg', src: 'hero', amt: 0, miss: 'miss', ability: a.name }); return }
      const crit = rng.chance((phys ? d.crit : d.spellCrit) + (a.buff?.crit ?? 0))
      const base = phys ? whiteHit(d, rng) * 0.8 + bp * 0.4 : bp * d.spellMult * (0.92 + rng.next() * 0.16)
      const dmg = base * (a.power ?? 1) * (crit ? critMul(phys) : 1) * mult * aoeN
      hitMob(s, d, dmg, crit, emit, a.school, a.name)
      if (a.heal) heal(h, d, dmg * a.heal, emit, a.name)
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
      const hm = 1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)
      heal(h, d, bp * (a.power ?? 1) * d.spellMult * hm, emit, a.name)
      return
    }
    case 'hot': {
      const ticks = Math.max(1, Math.round((a.dur ?? 12) / 3))
      const hm = 1 + (d.m.heal ?? 0) + (d.m[`ab:${a.id}`] ?? 0)
      h.hot = { perTick: (bp * (a.power ?? 1) * d.spellMult * hm) / ticks, left: a.dur ?? 12, tickIn: 3 }
      return
    }
    case 'shield':
      h.shield = bp * (a.power ?? 1) * d.spellMult * (1 + (d.m.shield ?? 0))
      return
    case 'stun':
      mob.stun = Math.max(mob.stun, a.dur ?? 2)
      return
    case 'cooldown':
      h.temp[a.id] = a.dur ?? 10
      return
    case 'regen':
      h.res = Math.min(d.maxRes, h.res + d.maxRes * (a.power ?? 0.3))
      return
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
  }
  if (mob.boss) addLoot(s, makeGear(rng, s.itemSeq++, h, mob.lvl, mob.boss === 'zone' ? (rng.chance(0.1) ? 4 : 3) : rng.chance(0.25) ? 3 : 2), emit)
  if (!mob.boss && mob.type === 'humanoid' && rng.chance(0.006 * mob.count)) addLoot(s, makeBag(s.itemSeq++, mob.lvl < 20 ? 6 : mob.lvl < 40 ? 8 : 10, mob.lvl < 20 ? 'Linen Bag' : mob.lvl < 40 ? 'Woolen Bag' : 'Silk Bag'), emit)

  for (const q of s.quests) {
    if (q.have >= q.need || q.target !== mob.name) continue
    let n = 0
    for (let i = 0; i < mob.count; i++) if (q.kind !== 'collect' || rng.chance(0.55)) n++
    if (!n) continue
    q.have = Math.min(q.need, q.have + n)
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
      if (next && !s.unlocked.includes(next)) {
        s.unlocked.push(next)
        s.prog[next] ??= { cleared: 0, kills: 0 }
        log(s, `Odblokowano: ${zoneById(next).name} (${zoneById(next).min}-${zoneById(next).max})`, '#69ccf0')
      }
      if (next && s.autoAdvance) return moveTo(s, next, 0, emit, true)
    } else {
      log(s, `${mob.name} pokonany! Odblokowano: ${subs[s.loc.sub + 1].name}`, '#ff8040')
      if (s.autoAdvance) return moveTo(s, s.loc.zone, s.loc.sub + 1, emit, true)
    }
  } else if (s.loc.sub === p.cleared && p.cleared < subs.length) {
    p.kills = Math.min(killsNeeded(s.loc.zone, s.loc.sub), p.kills + mob.count)
  }

  const d = stats(h)
  const needRest = h.hp < d.maxHp * 0.55 || (d.res === 'mana' && h.res < d.maxRes * 0.35)
  if (needRest) {
    s.phase = 'rest'
    if (raceById(h.race).active === 'cannibalize' && h.hp < d.maxHp * 0.5) emit({ t: 'racial', name: 'Cannibalize' })
  } else { s.phase = 'walk'; s.phaseT = 2.5 + rng.next() * 2.5 }
}

// Podróż: piesza w obrębie lądu, statki / zeppeliny między kontynentami
export function moveTo(s: GameState, zone: string, sub: number, emit: Emit = noop, auto = false) {
  const changedZone = zone !== s.loc.zone
  const plan = changedZone ? planTrip(s.hero.faction, s.loc.zone, zone) : { total: auto ? 5 : 3, kind: 'walk' as const, label: '' }
  s.loc = { zone, sub }
  s.where = 'field'
  s.mob = null
  s.hero.casting = null
  s.phase = 'travel'
  s.phaseT = plan.total
  s.trip = { kind: plan.kind, label: plan.label || (changedZone ? `Podróż: ${zoneById(zone).name}` : ''), total: plan.total }
  progOf(s, zone)
  if (changedZone) emit({ t: 'zone', zone })
  emit({ t: 'sub', zone, sub })
  if (plan.kind !== 'walk') log(s, `${plan.label} (${plan.total} s)`, '#69ccf0')
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
  if (s.autoEquip && autoEquip(h, it)) {
    emit({ t: 'loot', item: it, equipped: true })
    if (it.rarity >= 2) log(s, `Zakładasz: [${it.name}]`, ['#9d9d9d', '#fff', '#1eff00', '#0070dd', '#a335ee'][it.rarity])
    return
  }
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
