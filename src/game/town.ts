// Akcje gracza: miasto mapy (zadania + trener), stolica (trener + sprzedawca), podróże.
import { classById, ranksOf, trainCost } from '../data/classes'
import { zoneById } from '../data/zones'
import { BAGS_FOR_SALE, makeBag } from './items'
import { addToInv, equipBag, freeSlots } from './inventory'
import { questXp, questReady } from './quests'
import { gainXp, log, moveTo, stats } from './sim'
import { canTravel, capitalOf, townOf } from './world'
import type { GameEvent, GameState, Quest } from './types'

type Emit = (e: GameEvent) => void
const noop: Emit = () => {}

export function enterTown(s: GameState) {
  const z = zoneById(s.loc.zone)
  if (!townOf(z, s.hero.faction)) return false
  s.where = 'town'
  s.mob = null
  s.hero.casting = null
  return true
}
export function enterCapital(s: GameState) {
  s.where = 'capital'
  s.mob = null
  s.hero.casting = null
  return true
}
export function leaveTown(s: GameState) {
  s.where = 'field'
  s.phase = 'walk'
  s.phaseT = 1.5
}
export function travel(s: GameState, zone: string, sub: number, emit: Emit = noop) {
  if (!canTravel(s, zone, sub)) return false
  moveTo(s, zone, sub, emit)
  return true
}

// ---------- trener
export type TrainRow = { id: string; name: string; rank: number; rankLvl: number; cost: number; status: 'known' | 'available' | 'locked' }
export function trainerRows(s: GameState): TrainRow[] {
  const h = s.hero
  const rows: TrainRow[] = []
  for (const a of classById(h.cls).abilities) {
    if (a.talent) continue
    const ranks = ranksOf(a)
    const have = h.trained[a.id] ?? 0
    const nextIdx = ranks.findIndex((r) => r > have)
    if (nextIdx < 0) { rows.push({ id: a.id, name: a.name, rank: ranks.length, rankLvl: have, cost: 0, status: 'known' }); continue }
    const lvl = ranks[nextIdx]
    rows.push({ id: a.id, name: a.name, rank: nextIdx + 1, rankLvl: lvl, cost: trainCost(lvl), status: lvl <= h.level ? 'available' : 'locked' })
  }
  return rows
}
export function train(s: GameState, id: string): string | null {
  const row = trainerRows(s).find((r) => r.id === id)
  if (!row || row.status !== 'available') return 'Nie możesz się tego jeszcze nauczyć.'
  if (s.hero.copper < row.cost) return 'Za mało pieniędzy.'
  s.hero.copper -= row.cost
  s.hero.trained[id] = row.rankLvl
  log(s, `Nauczono: ${row.name} (Rank ${row.rank})`, '#ffd100')
  return null
}
export function trainAll(s: GameState) {
  let n = 0
  for (let guard = 0; guard < 200; guard++) {
    const rows = trainerRows(s).filter((r) => r.status === 'available' && r.cost <= s.hero.copper).sort((a, b) => a.cost - b.cost)
    if (!rows.length) break
    train(s, rows[0].id)
    n++
  }
  return n
}

// ---------- sprzedawca (tylko w stolicy)
export function sellAt(s: GameState, idx: number) {
  const it = s.hero.inv[idx]
  if (!it || s.where !== 'capital') return 0
  s.hero.inv[idx] = null
  const v = it.value * (it.count ?? 1)
  s.hero.copper += v
  s.totals.copper += v
  return v
}
export function sellJunk(s: GameState) {
  if (s.where !== 'capital') return 0
  let sum = 0
  s.hero.inv.forEach((it, i) => { if (it && it.rarity === 0) sum += sellAt(s, i) })
  return sum
}
export function buyBag(s: GameState, size: number): string | null {
  const b = BAGS_FOR_SALE.find((x) => x.size === size)
  if (!b || s.where !== 'capital') return null
  if (s.hero.copper < b.price) return 'Za mało pieniędzy.'
  const bag = makeBag(s.itemSeq++, size)
  if (s.hero.bags.some((x) => !x)) equipBag(s.hero, bag)
  else if (!addToInv(s.hero, bag)) return 'Brak miejsca.'
  s.hero.copper -= b.price
  log(s, `Kupiono: ${b.name} (${size} slotów)`, '#ffffff')
  return null
}

// ---------- zadania
export function turnIn(s: GameState, q: Quest, emit: Emit = noop): string | null {
  if (!questReady(q)) return 'Zadanie nie jest ukończone.'
  if (s.where !== 'town' || s.loc.zone !== q.zone) return `Oddaj w ${townOf(zoneById(q.zone), s.hero.faction)}.`
  if (q.reward && freeSlots(s.hero) < 1) return 'Zrób miejsce w torbach na nagrodę.'
  s.quests = s.quests.filter((x) => x.id !== q.id)
  s.questsDone.push(q.id)
  s.totals.quests++
  const xp = questXp(s, q)
  s.hero.copper += q.copper
  s.totals.copper += q.copper
  if (q.reward) addToInv(s.hero, { ...q.reward, id: s.itemSeq++ })
  log(s, `Oddano: ${q.title} (+${xp} XP)`, '#ffd100')
  gainXp(s, xp, emit)
  stats(s.hero)
  return null
}

export const placeName = (s: GameState) =>
  s.where === 'capital' ? capitalOf(s) : s.where === 'town' ? townOf(zoneById(s.loc.zone), s.hero.faction) ?? '' : ''
