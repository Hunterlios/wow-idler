// Świat: mapy (strefy) z trasy rasy, podstrefy, miasta, stolice, wymagania bossów.
import { ROUTES, ZONES, LINKS, zoneById, type Zone, type Mob, type MobType } from '../data/zones'
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
// Stolice frakcji: Horda (Orgrimmar, Thunder Bluff, Undercity), Przymierze (Stormwind, Ironforge, Darnassus)
export const factionCapitals = (f: Faction) => ZONES.filter((z) => z.capital && z.control === f).map((z) => ({ name: z.capital!, zone: z.id }))
// Hearthstone: przypisana stolica (domyślnie stolica rasy)
export const homeOf = (s: GameState) => s.home ?? raceById(s.hero.race).start.capital
// Hearthstone działa dopiero po przypisaniu go w stolicy (nowa postać musi tam najpierw dojść)
export const hasHearth = (s: GameState) => !!s.home
// Stolica, w której jesteś (albo przypisana do Hearthstone)
export const capitalOf = (s: GameState) => (s.where === 'capital' && s.inCap ? s.inCap : homeOf(s))
export const zoneOfCapital = (name: string) => ZONES.find((z) => z.capital === name)!.id
export const capitalZone = (s: GameState) => zoneOfCapital(homeOf(s))
// Stolica twojej frakcji na mapie, na której stoisz (można do niej wejść pieszo)
export function capitalHere(s: GameState) {
  const z = zoneById(s.loc.zone)
  return z.capital && z.control === s.hero.faction ? z.capital : null
}

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

// ---------------------------------------------------------------- transport: statki, zeppeliny i tramwaj z Classica
// Porty jak w grze: Menethil Harbor (Wetlands), Auberdine (Darkshore), Theramore (Dustwallow Marsh),
// Rut'theran Village (Teldrassil), Booty Bay i Grom'gol (Stranglethorn), Ratchet (The Barrens),
// wieże zeppelinów pod Orgrimmarem (Durotar) i Undercity (Tirisfal), Deeprun Tram (Stormwind ↔ Ironforge).
export type Transport = { kind: 'ship' | 'zeppelin' | 'tram'; faction: Faction | 'neutral'; a: string; b: string; label: string; secs: number }
export const TRANSPORTS: Transport[] = [
  { kind: 'ship', faction: 'alliance', a: 'wetlands', b: 'darkshore', label: 'Ship: Menethil Harbor ↔ Auberdine', secs: 150 },
  { kind: 'ship', faction: 'alliance', a: 'wetlands', b: 'dustwallow', label: 'Ship: Menethil Harbor ↔ Theramore', secs: 150 },
  { kind: 'ship', faction: 'alliance', a: 'teldrassil', b: 'darkshore', label: "Ship: Rut'theran Village ↔ Auberdine", secs: 60 },
  { kind: 'ship', faction: 'neutral', a: 'stranglethorn', b: 'barrens', label: 'Ship: Booty Bay ↔ Ratchet', secs: 150 },
  { kind: 'zeppelin', faction: 'horde', a: 'durotar', b: 'tirisfal', label: 'Zeppelin: Orgrimmar ↔ Undercity', secs: 120 },
  { kind: 'zeppelin', faction: 'horde', a: 'durotar', b: 'stranglethorn', label: "Zeppelin: Orgrimmar ↔ Grom'gol", secs: 120 },
  { kind: 'zeppelin', faction: 'horde', a: 'tirisfal', b: 'stranglethorn', label: "Zeppelin: Undercity ↔ Grom'gol", secs: 120 },
  { kind: 'tram', faction: 'alliance', a: 'elwynn', b: 'dun_morogh', label: 'Deeprun Tram: Stormwind ↔ Ironforge', secs: 60 },
]
// czasy: rejs / lot z czekaniem na transport, jak w grze (statki dłużej niż zeppeliny)
export const RIDE_SECS = 120
export const landmass = (id: string) => { const z = zoneById(id); const p = z.parent ?? id; return p === 'teldrassil' ? 'tel' : z.continent }
// marsz między sąsiednimi mapami (czas rośnie z odległością na mapie świata)
function walk(a: string, b: string) {
  const za = zoneById(a), zb = zoneById(b)
  return 35 + Math.hypot(za.x - zb.x, za.y - zb.y) * 2.6
}
const okFor = (f: Faction) => (t: Transport) => t.faction === 'neutral' || t.faction === f

export type Waypoint = { zone: string; at: number } // wejście na mapę po `at` sekundach drogi
export type TripPlan = { total: number; kind: 'walk' | 'ship' | 'zeppelin' | 'tram'; label: string; walkSecs: number; speed: number; blocked?: string; path: Waypoint[]; via: string[]; saved?: number }
// Statki / zeppeliny / tramwaj odjeżdżające z tej mapy
// Port leży na konkretnej mapie (np. tramwaj w Ironforge na mapie Dun Morogh), a nie w obszarze startowym
// (Coldridge Valley, Valley of Trials, Shadowglen...): stamtąd trzeba najpierw dojść.
export function portsOf(faction: Faction, zone: string) {
  const m = zone
  return TRANSPORTS.map((t, i) => ({ t, i, to: t.a === m ? t.b : t.b === m ? t.a : '' })).filter((x) => x.to && okFor(faction)(x.t))
}
export const SUB_WALK = 12 // s między podstrefami

// Graf świata: marsz po sąsiednich mapach (LINKS, ten sam ląd) + opcjonalnie transporty
type Edge = { to: string; secs: number; t?: Transport }
// Znane ścieżki (jak flight pathy): każda wyczyszczona podstrefa mapy skraca marsz przez nią, aż do -60% przy całej mapie
export const KNOWN_PATH_MAX = 0.6
export type Known = (zone: string) => number // 0..1: część wyczyszczonych podstref
export const knownOf = (s: GameState): Known => (z) => { const n = subsOf(z).length; return n ? Math.min(1, (s.prog[z]?.cleared ?? 0) / n) : 0 }
function edges(faction: Faction, z: string, rides: boolean, speed: number, known?: Known): Edge[] {
  const out: Edge[] = []
  for (const [a, b] of LINKS) {
    const o = a === z ? b : b === z ? a : null
    if (o && landmass(o) === landmass(z)) out.push({ to: o, secs: walk(z, o) / (1 + speed) * (1 - KNOWN_PATH_MAX * (known?.(o) ?? 0)) })
  }
  if (rides) for (const p of portsOf(faction, z)) out.push({ to: p.to, secs: p.t.secs, t: p.t })
  return out
}
function route(faction: Faction, from: string, to: string, rides: boolean, speed: number, known?: Known) {
  const dist: Record<string, number> = { [from]: 0 }
  const prev: Record<string, { from: string; e: Edge }> = {}
  const done = new Set<string>()
  while (true) {
    let u = '', best = Infinity
    for (const [k, v] of Object.entries(dist)) if (!done.has(k) && v < best) { best = v; u = k }
    if (!u || u === to) break
    done.add(u)
    for (const e of edges(faction, u, rides, speed, known)) {
      const c = dist[u] + e.secs
      if (c < (dist[e.to] ?? Infinity)) { dist[e.to] = c; prev[e.to] = { from: u, e } }
    }
  }
  if (dist[to] == null) return null
  const steps: { zone: string; e: Edge }[] = []
  for (let v = to; prev[v]; v = prev[v].from) steps.unshift({ zone: v, e: prev[v].e })
  return steps
}

// Najszybsza droga na inny ląd: do którego portu dojść i czym płynąć (podpowiedź na mapie)
export function portHint(faction: Faction, from: string, to: string) {
  const steps = route(faction, from, to, true, 0)
  if (!steps) return null
  let at = from
  for (const st of steps) { if (st.e.t) return { port: at, t: st.e.t }; at = st.zone }
  return null
}

// allowRide: tylko automatyczne przejście po bossie łączy marsz, rejs i marsz dalej.
// Gracz z mapy chodzi pieszo po jednym lądzie, a transportem jedzie sam z portu.
export function planTrip(faction: Faction, from: string, to: string, speed = 0, allowRide = false, known?: Known): TripPlan {
  if (from === to) { const t = Math.round(SUB_WALK / (1 + speed) * (1 - KNOWN_PATH_MAX * (known?.(to) ?? 0))); return { total: t, kind: 'walk', label: '', walkSecs: SUB_WALK, speed, path: [], via: [] } }
  if (!allowRide && landmass(from) !== landmass(to)) {
    const hint = portHint(faction, from, to)
    return { total: 0, kind: 'walk', label: '', walkSecs: 0, speed, path: [], via: [], blocked: hint ? `Another continent. Fastest way: walk to ${zoneById(hint.port).name} and take: ${hint.t.label}.` : 'Another continent: no connection for your faction.' }
  }
  const steps = route(faction, from, to, allowRide, speed, known)
  if (!steps) return { total: 0, kind: 'walk', label: '', walkSecs: 0, speed, path: [], via: [], blocked: 'No route.' }
  let t = 0, walkSecs = 0, saved = 0, prevZ = from
  let kind: TripPlan['kind'] = 'walk'
  const labels: string[] = []
  const path: Waypoint[] = []
  for (const st of steps) {
    t += st.e.secs
    if (st.e.t) { kind = st.e.t.kind; labels.push(st.e.t.label) } else { walkSecs += walk(prevZ, st.zone); saved += walk(prevZ, st.zone) / (1 + speed) - st.e.secs }
    prevZ = st.zone
    path.push({ zone: st.zone, at: Math.round(t) })
  }
  return { total: Math.round(t), kind, label: labels.join(' → '), walkSecs, speed, path, via: steps.slice(0, -1).map((x) => x.zone), saved: Math.round(saved) }
}
