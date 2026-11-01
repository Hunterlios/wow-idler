// npx tsx scripts/balance.ts [godziny] [co ile minut gracz zagląda do miasta]
// Symuluje każdą kombinację rasa+klasa. "Gracz" co X minut: trenuje, oddaje i bierze zadania, sprzedaje.
import { RACES } from '../src/data/races'
import { newGame, advance } from '../src/game/sim'
import { zoneById } from '../src/data/zones'
import { boardFor, acceptQuest, questReady } from '../src/game/quests'
import { enterTown, enterCapital, leaveTown, trainAll, sellJunk, turnIn, buyBag, restock } from '../src/game/town'
import { BAGS_FOR_SALE } from '../src/game/items'
import { autoTalents } from '../src/game/talents'
import { equipUpgrades } from '../src/game/inventory'
import type { GameState } from '../src/game/types'

const hours = Number(process.argv[2] ?? 24)
const MAIN = process.argv[1]?.includes("balance")
const visitMin = Number(process.argv[3] ?? 60)
const only = process.argv[4]
const spec = Number(process.argv[5] ?? 0)
const form = process.argv[6]
const disable = (process.argv[7] ?? '').split(',').filter(Boolean)

export function visit(s: GameState) {
  equipUpgrades(s.hero)
  enterCapital(s)
  trainAll(s)
  autoTalents(s, spec)
  if (s.hero.cls === 'warlock' && s.hero.trained.summon_voidwalker) s.hero.pet = 'voidwalker'
  s.hero.inv.forEach((it, i) => { if (it && !it.bagSize && !it.food && !it.quest) { s.hero.inv[i] = null; s.hero.copper += it.value * (it.count ?? 1) } })
  sellJunk(s)
  if (!process.env.NOFOOD) restock(s, Number(process.env.FOOD ?? 2))
  for (const b of [...BAGS_FOR_SALE].reverse()) if (s.hero.bags.some((x) => !x) && s.hero.copper > b.price * 3) buyBag(s, b.size)
  // oddaj zadania we wszystkich miastach odblokowanych map
  for (const z of s.unlocked) {
    const loc = s.loc
    s.loc = { zone: z, sub: loc.sub }
    if (enterTown(s)) {
      for (const q of [...s.quests]) if (q.zone === z && questReady(q)) turnIn(s, q)
    }
    s.loc = loc
  }
  if (enterTown(s)) for (const q of boardFor(s, s.loc.zone)) acceptQuest(s, q)
  leaveTown(s)
}

const marks = [1, 3, 8, 24, 48, 96, 168].filter((m) => m <= hours)
if (MAIN) console.log('combo'.padEnd(18), marks.map((m) => `${m}h`.padStart(5)).join(''), ' deaths  bosses  zone')
if (MAIN) for (const r of RACES) for (const c of r.classes) {
  if (only && `${r.id}/${c}` !== only) continue
  const s = newGame('Test', r.id, c, 12345)
  for (const id of disable) s.hero.disabled[id] = true
  const lv: number[] = []
  let t = 0
  for (const m of marks) {
    while (t < m * 3600) {
      const step = Math.min(visitMin * 60, m * 3600 - t); advance(s, step, () => {}, 0.2); t += step; visit(s)
      if (form && s.hero.trained[`${form}_form`]) s.hero.form = form as any
    }
    lv.push(s.hero.level)
  }
  const z = zoneById(s.loc.zone)
  console.log(`${r.id}/${c}`.padEnd(18), lv.map((l) => String(l).padStart(5)).join(''), String(s.totals.deaths).padStart(7), String(s.totals.bosses).padStart(7), ' ', `${z.name} #${s.loc.sub + 1} (${z.min}-${z.max})`)
}
