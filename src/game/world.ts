// Świat: mapy (strefy) z trasy rasy, podstrefy, miasta, stolice, wymagania bossów.
import { ROUTES, ZONES, zoneById, type Zone, type Mob, type MobType } from '../data/zones'
const ZONE_IDS = ZONES.map((z) => z.id)
import { subzonesOf, subRange, type SubZone } from '../data/subzones'
import { raceById, type Faction } from '../data/races'
import type { GameState } from './types'

export const routeZones = (s: GameState) => ROUTES[s.start].map((r) => r[0])
export const zoneOf = (s: GameState) => zoneById(s.loc.zone)
export const subsOf = (zoneId: string) => subzonesOf(zoneId)
export const subOf = (s: GameState): SubZone => subsOf(s.loc.zone)[s.loc.sub]
export const progOf = (s: GameState, zoneId = s.loc.zone) => (s.prog[zoneId] ??= { cleared: 0, kills: 0 })

export function subLevels(zoneId: string, i: number) {
  const z = zoneById(zoneId)
  return subRange(z.min, z.max, i, subsOf(zoneId).length)
}

export const killsNeeded = (zoneId: string, i: number) => {
  const z = zoneById(zoneId)
  return z.parent ? 12 + i * 3 : 30 + i * 6
}

export function bossLevel(zoneId: string, i: number) {
  const z = zoneById(zoneId)
  const subs = subsOf(zoneId)
  if (i === subs.length - 1) return z.max + (z.parent ? 0 : 1)
  return Math.max(z.min, subLevels(zoneId, i).hi)
}
export const bossReqLevel = (zoneId: string, i: number) => bossLevel(zoneId, i) - 1

// Moby podstrefy: dwa typy z listy mapy, kolejne podstrefy przesuwają się po liście
export function subMobs(zoneId: string, i: number): Mob[] {
  const z = zoneById(zoneId)
  const n = z.mobs.length
  return [z.mobs[i % n], z.mobs[(i + 1) % n]]
}

const TYPE_COLOR: Record<MobType, string> = {
  beast: '#7a6a5a', cat: '#8a6a3a', boar: '#6a4a3a', raptor: '#6a8a3a', humanoid: '#8a3a3a', small: '#a87b4f', murloc: '#3a8a6a',
  undead: '#c8c2ae', spider: '#3a3a3a', flyer: '#7a5a4a', elemental: '#d06a2a', dragon: '#5a2a2a', giant: '#7a8a5a', insect: '#b07a3a',
}
export function bossLook(zoneId: string, i: number) {
  const z = zoneById(zoneId)
  const b = subsOf(zoneId)[i].boss
  const same = z.mobs.find((m) => m[1] === b.type)
  return { ...b, color: same ? same[2] : TYPE_COLOR[b.type] }
}

// Miasto mapy (zadania, trener). "Southshore / Tarren Mill" -> strona frakcji.
// Miasta jednej frakcji w strefach spornych -> najbliższe przyjazne miejsce z Classica
const HOSTILE_TOWN: Record<string, { faction: Faction; alt: string }> = {
  Kargath: { faction: 'horde', alt: 'Thelsamar' },
  Stonard: { faction: 'horde', alt: 'Nethergarde Keep' },
  'Nethergarde Keep': { faction: 'alliance', alt: 'Stonard' },
  'Freewind Post': { faction: 'horde', alt: 'Mirage Raceway' },
}
export function townOf(z: Zone, faction: Faction): string | null {
  if (!z.town) return null
  const parts = z.town.split(' / ').map((x) => x.trim())
  if (parts.length === 2) return faction === 'alliance' ? parts[0] : parts[1]
  const h = HOSTILE_TOWN[parts[0]]
  if (h && h.faction !== faction) return h.alt
  return parts[0]
}
export const capitalOf = (s: GameState) => raceById(s.hero.race).start.capital

export const isUnlocked = (s: GameState, zoneId: string) => s.unlocked.includes(zoneId)
// Jak w grze: na każdą mapę można pójść od razu (także wyższego poziomu). W obrębie mapy podstrefy
// otwierają się po kolei (pokonaj minibossa poprzedniej).
export const canTravel = (s: GameState, zoneId: string, sub: number) => sub <= Math.min(progOf(s, zoneId).cleared, subsOf(zoneId).length - 1)

export function zonePct(s: GameState, zoneId: string) {
  const p = progOf(s, zoneId)
  const n = subsOf(zoneId).length
  if (p.cleared >= n) return 1
  return (p.cleared + Math.min(1, p.kills / killsNeeded(zoneId, p.cleared)) * 0.9) / n
}

// ---------------------------------------------------------------- transport: statki i zeppeliny z Classica
export type Transport = { kind: 'ship' | 'zeppelin'; faction: Faction | 'neutral'; a: string; b: string; label: string }
export const TRANSPORTS: Transport[] = [
  { kind: 'ship', faction: 'alliance', a: 'wetlands', b: 'darkshore', label: 'Statek: Menethil Harbor ↔ Auberdine' },
  { kind: 'ship', faction: 'alliance', a: 'wetlands', b: 'dustwallow', label: 'Statek: Menethil Harbor ↔ Theramore' },
  { kind: 'ship', faction: 'alliance', a: 'teldrassil', b: 'darkshore', label: "Statek: Rut'theran Village ↔ Auberdine" },
  { kind: 'ship', faction: 'neutral', a: 'stranglethorn', b: 'barrens', label: 'Statek: Booty Bay ↔ Ratchet' },
  { kind: 'zeppelin', faction: 'horde', a: 'durotar', b: 'tirisfal', label: 'Zeppelin: Orgrimmar ↔ Undercity' },
  { kind: 'zeppelin', faction: 'horde', a: 'durotar', b: 'stranglethorn', label: "Zeppelin: Orgrimmar ↔ Grom'gol" },
]
const RIDE = 60 // s rejsu / lotu
const landmass = (id: string) => { const z = zoneById(id); const p = z.parent ?? id; return p === 'teldrassil' ? 'tel' : z.continent }
const mainZone = (id: string) => zoneById(id).parent ?? id
function walk(a: string, b: string) {
  const za = zoneById(a), zb = zoneById(b)
  return Math.min(150, 25 + Math.hypot(za.x - zb.x, za.y - zb.y) * 1.3)
}

export type TripPlan = { total: number; kind: 'walk' | 'ship' | 'zeppelin'; label: string; walkSecs: number; speed: number }
export const SUB_WALK = 12 // s między podstrefami
// speed = premia z formy podróżnej (Ghost Wolf, Travel Form): skraca tylko odcinki piesze
export function planTrip(faction: Faction, from: string, to: string, speed = 0): TripPlan {
  if (from === to) return { total: Math.round(SUB_WALK / (1 + speed)), kind: 'walk', label: '', walkSecs: SUB_WALK, speed }
  const ZS = ZONE_IDS
  const dist: Record<string, number> = {}
  const prev: Record<string, { via: Transport | null; from: string }> = {}
  for (const z of ZS) dist[z] = Infinity
  dist[from] = 0
  const done = new Set<string>()
  const ok = TRANSPORTS.filter((t) => t.faction === 'neutral' || t.faction === faction)
  while (true) {
    let u = ''
    let best = Infinity
    for (const z of ZS) if (!done.has(z) && dist[z] < best) { best = dist[z]; u = z }
    if (!u || u === to) break
    done.add(u)
    for (const v of ZS) {
      if (done.has(v) || landmass(v) !== landmass(u)) continue
      const c = dist[u] + walk(u, v)
      if (c < dist[v]) { dist[v] = c; prev[v] = { via: null, from: u } }
    }
    for (const t of ok) {
      const ends = mainZone(u) === t.a ? t.b : mainZone(u) === t.b ? t.a : null
      if (!ends || done.has(ends)) continue
      const c = dist[u] + RIDE
      if (c < dist[ends]) { dist[ends] = c; prev[ends] = { via: t, from: u } }
    }
  }
  let kind: TripPlan['kind'] = 'walk'
  const labels: string[] = []
  let rides = 0
  for (let v = to; prev[v]; v = prev[v].from) {
    const t = prev[v].via
    if (t) { kind = t.kind; labels.unshift(t.label); rides++ }
  }
  const label = labels.join(' → ')
  const all = dist[to] === Infinity ? 60 : dist[to]
  const walkSecs = Math.max(0, all - rides * RIDE)
  return { total: Math.round(Math.min(400, walkSecs / (1 + speed) + rides * RIDE)), kind, label, walkSecs, speed }
}
