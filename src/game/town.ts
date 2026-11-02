// Akcje gracza: miasto mapy (zadania + trener), stolica (trener + sprzedawca), podróże.
import { classById, ranksOf, trainCost, WEAPON_SKILL_COST, WEAPON_SKILL_LVL, WEAPON_SKILL_PL } from '../data/classes'
import { zoneById } from '../data/zones'
import { BAGS_FOR_SALE, FOODS, KITS, makeBag, makeFood, makeKit, repairCost } from './items'
import { raceById } from '../data/races'
import { addToInv, equipBag, freeSlots, removeItems, STACK, autoEquip } from './inventory'
import { questXp, questReady, isQuestItem, canTurnInHere, turnInPlace } from './quests'
import { gainXp, log, moveTo, stats, spiritRes } from './sim'
import { canTravel, capitalOf, capitalZone, capitalHere, homeOf, progOf, townOf, zoneOfCapital } from './world'
import type { GameEvent, GameState, Quest } from './types'

type Emit = (e: GameEvent) => void
const noop: Emit = () => {}

export const HEARTH_CD = 30 * 60 // Hearthstone (w Classicu 60 min; w idlerze 30)
export function enterTown(s: GameState) {
  const z = zoneById(s.loc.zone)
  if (s.phase === 'travel' || !townOf(z, s.hero.faction)) return false
  spiritRes(s, noop, 'Your ghost enters the town. ')
  s.where = 'town'
  s.mob = null
  s.hero.casting = null
  return true
}
// Stolica: wchodzisz pieszo, jeśli jesteś na jej mapie; z innych map tylko Hearthstone (cooldown),
// który przenosi postać na mapę stolicy.
export function enterCapital(s: GameState): string | null {
  if (s.phase === 'travel') return 'You are travelling.'
  if (!capitalHere(s) && !s.home) return `Your Hearthstone is not set yet. Walk to ${raceById(s.hero.race).start.capital} (${zoneById(zoneOfCapital(raceById(s.hero.race).start.capital)).name}) or another capital of your faction and set it there.`
  if (!capitalHere(s) && (s.hero.cds.hearth ?? 0) > 0) return `Hearthstone is ready in ${Math.ceil(s.hero.cds.hearth / 60)} min. You can also walk to the capital (${zoneById(capitalZone(s)).name}).`
  spiritRes(s, noop, 'Your ghost enters the capital. ')
  const here = capitalHere(s)
  if (here) { s.inCap = here } else {
    const cz = capitalZone(s)
    const cd = s.hero.cds.hearth ?? 0
    if (cd > 0) return `Hearthstone is ready in ${Math.ceil(cd / 60)} min. You can also walk to the capital (${zoneById(cz).name}).`
    s.hero.cds.hearth = HEARTH_CD
    s.loc = { zone: cz, sub: 0 }
    if (!s.unlocked.includes(cz)) s.unlocked.push(cz)
    progOf(s, cz)
    s.hero.totems = []
    s.inCap = homeOf(s)
    log(s, `Hearthstone: you return to ${homeOf(s)} (${zoneById(cz).name}).`, '#69ccf0')
  }
  s.where = 'capital'
  s.mob = null
  s.hero.casting = null
  return null
}
export const hearthReady = (s: GameState) => !(s.hero.cds.hearth > 0)
// Przypisanie Hearthstone do stolicy, w której jesteś (u karczmarza)
export function bindHearth(s: GameState): string | null {
  if (s.where !== 'capital' || !s.inCap) return 'You can set your Hearthstone in a capital city.'
  s.home = s.inCap
  log(s, `Hearthstone set to: ${s.home}.`, '#ffd100')
  return null
}
export function leaveTown(s: GameState) {
  s.where = 'field'
  s.phase = 'walk'
  s.phaseT = 1.5
}
export function travel(s: GameState, zone: string, sub: number, emit: Emit = noop): string | null {
  if (!canTravel(s, zone, sub)) return 'This subzone is still locked.'
  return moveTo(s, zone, sub, emit)
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
  if (!row || row.status !== 'available') return 'You can\'t learn this yet.'
  if (s.hero.copper < row.cost) return 'Not enough money.'
  s.hero.copper -= row.cost
  s.hero.trained[id] = row.rankLvl
  log(s, `Learned: ${row.name} (Rank ${row.rank})`, '#ffd100')
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
  if (!row || row.status !== 'available') return 'You can\'t learn this.'
  if (s.where !== 'capital') return 'The Weapon Master is in a capital city.'
  if (s.hero.copper < row.cost) return 'Not enough money.'
  s.hero.copper -= row.cost
  s.hero.weaponSkills.push(type)
  s.hero.wskill[type] = 1 // jak w Classicu: nowa broń zaczyna od 1 i trzeba ją wyćwiczyć
  log(s, `Weapon Master: learned ${row.name} (skill 1/${s.hero.level * 5}, it grows as you fight with this weapon).`, '#ffd100')
  return null
}

// ---------- sprzedawca (tylko w stolicy) + odkup ostatnich 10 sprzedanych
export const BUYBACK = 10
export function sellAt(s: GameState, idx: number) {
  const it = s.hero.inv[idx]
  if (!it || s.where === 'field' || it.quest) return 0
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
  if (!it || s.where === 'field') return null
  const price = it.value * (it.count ?? 1)
  if (s.hero.copper < price) return 'Not enough money.'
  if (!addToInv(s.hero, it)) return 'Not enough space in your bags.'
  s.hero.copper -= price
  s.totals.copper -= price
  s.buyback.splice(i, 1)
  return null
}
export function buyKit(s: GameState, name: string, n: number): string | null {
  const k = KITS.find((x) => x.name === name)
  if (!k || s.where === 'field') return null
  if (s.hero.level < k.lvl) return `Requires level ${k.lvl}.`
  const cost = k.price * n
  if (s.hero.copper < cost) return 'Not enough money.'
  if (!addToInv(s.hero, makeKit(s.itemSeq++, k, n))) return 'Not enough space in your bags.'
  s.hero.copper -= cost
  return null
}
export function buyFood(s: GameState, name: string, n: number): string | null {
  const f = FOODS.find((x) => x.name === name)
  if (!f || s.where === 'field') return null
  const cost = f.price * n
  if (s.hero.copper < cost) return 'Not enough money.'
  if (!addToInv(s.hero, makeFood(s.itemSeq++, f, n))) return 'Not enough space in your bags.'
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
  if (s.where === 'field') return 0
  let sum = 0
  s.hero.inv.forEach((it, i) => { if (it && it.rarity === 0) sum += sellAt(s, i) })
  return sum
}
export function buyBag(s: GameState, size: number): string | null {
  const b = BAGS_FOR_SALE.find((x) => x.size === size)
  if (!b || s.where === 'field') return null
  if (s.hero.copper < b.price) return 'Not enough money.'
  const bag = makeBag(s.itemSeq++, size)
  if (s.hero.bags.some((x) => !x)) equipBag(s.hero, bag)
  else if (!addToInv(s.hero, bag)) return 'Not enough space.'
  s.hero.copper -= b.price
  log(s, `Bought: ${b.name} (${size} slots)`, '#ffffff')
  return null
}

// ---------- zadania
export function turnIn(s: GameState, q: Quest, emit: Emit = noop): string | null {
  if (!questReady(q)) return 'The quest is not complete.'
  if (!canTurnInHere(s, q)) return `Turn it in at ${turnInPlace(s, q)}.`
  if (q.reward && freeSlots(s.hero) < 1) return 'Make room in your bags for the reward.'
  s.quests = s.quests.filter((x) => x.id !== q.id)
  s.questsDone.push(q.id)
  if (q.kind === 'collect') removeItems(s.hero, isQuestItem(q), q.need)
  s.totals.quests++
  const xp = questXp(s, q)
  const gold = Math.round(q.copper * (1 + (raceById(s.hero.race).mods.questGold ?? 0)))
  s.hero.copper += gold
  s.totals.copper += gold
  if (q.reward) { const it = { ...q.reward, id: s.itemSeq++ }; if (!(s.autoEquip && autoEquip(s.hero, it))) addToInv(s.hero, it); else log(s, `Equipped: [${it.name}]`, '#1eff00') }
  log(s, `Oddano: ${q.title} (+${xp} XP)`, '#ffd100')
  gainXp(s, xp, emit)
  stats(s.hero)
  return null
}

export const placeName = (s: GameState) =>
  s.where === 'capital' ? capitalOf(s) : s.where === 'town' ? townOf(zoneById(s.loc.zone), s.hero.faction) ?? '' : ''

// ---------- naprawa u kupca (jak u kowala / kupca w Classicu)
export function repairDiscount(s: GameState) { return raceById(s.hero.race).mods.repairPct ?? 0 }
export function repairAllCost(s: GameState) {
  const h = s.hero
  const disc = repairDiscount(s)
  let sum = 0
  for (const it of [...Object.values(h.equip), ...h.inv]) if (it) sum += repairCost(it, disc)
  return sum
}
export function repairAll(s: GameState): string | null {
  if (s.where === 'field') return 'Repairs are done at a vendor in town.'
  const cost = repairAllCost(s)
  if (!cost) return 'Nothing to repair.'
  if (s.hero.copper < cost) return 'Not enough money for repairs.'
  s.hero.copper -= cost
  for (const it of [...Object.values(s.hero.equip), ...s.hero.inv]) if (it && it.dur != null) delete it.dur
  stats(s.hero)
  log(s, 'Gear repaired.', '#ffffff')
  return null
}
