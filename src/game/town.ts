// Akcje gracza: miasto mapy (zadania + trener), stolica (trener + sprzedawca), podróże.
import { classById, ranksOf, trainCost, WEAPON_SKILL_COST, WEAPON_SKILL_LVL, WEAPON_SKILL_PL } from '../data/classes'
import { zoneById } from '../data/zones'
import { BAGS_FOR_SALE, FOODS, makeBag, makeFood } from './items'
import { addToInv, equipBag, freeSlots, removeItems, STACK } from './inventory'
import { questXp, questReady, isQuestItem } from './quests'
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

// ---------- Weapon Master (stolica): nauka typów broni
export type WeaponRow = { type: string; name: string; lvl: number; cost: number; status: 'known' | 'available' | 'locked' }
export function weaponRows(s: GameState): WeaponRow[] {
  const h = s.hero
  return classById(h.cls).skills.map((w) => {
    const lvl = WEAPON_SKILL_LVL[w] ?? 1
    const status = h.weaponSkills.includes(w) ? 'known' : h.level >= lvl ? 'available' : 'locked'
    return { type: w, name: WEAPON_SKILL_PL[w] ?? w, lvl, cost: WEAPON_SKILL_COST, status }
  })
}
export function trainWeapon(s: GameState, type: string): string | null {
  const row = weaponRows(s).find((r) => r.type === type)
  if (!row || row.status !== 'available') return 'Nie możesz się tego nauczyć.'
  if (s.where !== 'capital') return 'Weapon Master jest w stolicy.'
  if (s.hero.copper < row.cost) return 'Za mało pieniędzy.'
  s.hero.copper -= row.cost
  s.hero.weaponSkills.push(type)
  log(s, `Weapon Master: nauczono ${row.name}.`, '#ffd100')
  return null
}

// ---------- sprzedawca (tylko w stolicy) + odkup ostatnich 10 sprzedanych
export const BUYBACK = 10
export function sellAt(s: GameState, idx: number) {
  const it = s.hero.inv[idx]
  if (!it || s.where !== 'capital' || it.quest) return 0
  s.hero.inv[idx] = null
  const v = it.value * (it.count ?? 1)
  s.hero.copper += v
  s.totals.copper += v
  s.buyback.unshift(it)
  if (s.buyback.length > BUYBACK) s.buyback.length = BUYBACK
  return v
}
export function buyBack(s: GameState, i: number): string | null {
  const it = s.buyback[i]
  if (!it || s.where !== 'capital') return null
  const price = it.value * (it.count ?? 1)
  if (s.hero.copper < price) return 'Za mało pieniędzy.'
  if (!addToInv(s.hero, it)) return 'Brak miejsca w torbach.'
  s.hero.copper -= price
  s.totals.copper -= price
  s.buyback.splice(i, 1)
  return null
}
export function buyFood(s: GameState, name: string, n: number): string | null {
  const f = FOODS.find((x) => x.name === name)
  if (!f || s.where !== 'capital') return null
  const cost = f.price * n
  if (s.hero.copper < cost) return 'Za mało pieniędzy.'
  if (!addToInv(s.hero, makeFood(s.itemSeq++, f, n))) return 'Brak miejsca w torbach.'
  s.hero.copper -= cost
  return null
}
// Uzupełnij zapas jedzenia/picia z najlepszej dostępnej półki do `stacks` stosów
export function restock(s: GameState, stacks = 1) {
  const h = s.hero
  const want = (kind: 'food' | 'drink') => FOODS.filter((f) => f.kind === kind && f.lvl <= h.level).pop()
  let spent = 0
  for (const kind of ['food', 'drink'] as const) {
    if (kind === 'drink' && classById(h.cls).resource !== 'mana' && h.cls !== 'druid') continue
    const f = want(kind)
    if (!f) continue
    const have = h.inv.reduce((a, x) => a + (x?.name === f.name ? x.count ?? 1 : 0), 0)
    const n = Math.max(0, Math.min(STACK * stacks - have, Math.floor(h.copper / f.price)))
    if (n > 0 && freeSlots(h) > 0 && !buyFood(s, f.name, n)) spent += n * f.price
  }
  return spent
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
  if (q.kind === 'collect') removeItems(s.hero, isQuestItem(q), q.need)
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
