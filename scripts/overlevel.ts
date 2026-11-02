// npx tsx scripts/overlevel.ts [rasa/klasa] [poziom] — postać na poziomie N w strefach wyższych o 3-10 poziomów
import { newGame, advance } from '../src/game/sim'
import { visit } from './balance'
import { subLevels } from '../src/game/world'
import type { GameState } from '../src/game/types'

const [race, cls] = (process.argv[2] ?? 'nightelf/druid').split('/')
const target = Number(process.argv[3] ?? 15)
const s0 = newGame('Test', race as any, cls as any, 777)
let t = 0
while (s0.hero.level < target && t < 40 * 3600) { advance(s0, 1800, () => {}, 0.2); t += 1800; visit(s0) }
console.log(`${race}/${cls} lvl ${s0.hero.level} after ${(t / 3600).toFixed(1)} h, zone ${s0.loc.zone}`)
const snap = JSON.stringify(s0)
for (const [zone, sub] of [['loch_modan', 1], ['redridge', 0], ['ashenvale', 0], ['wetlands', 0], ['hillsbrad', 1], ['wetlands', 2], ['wetlands', 3]] as const) {
  const s: GameState = JSON.parse(snap)
  s.loc = { zone, sub }
  if (!s.unlocked.includes(zone)) s.unlocked.push(zone)
  s.phase = 'walk'; s.phaseT = 1; s.mob = null
  const won: Record<number, number> = {}, lost: Record<number, number> = {}
  let pack = 1, lvls: number[] = [], deaths = 0
  const emit = (e: any) => {
    if (e.t === 'spawn' && s.mob) { pack = s.mob.count; lvls.push(s.mob.lvl) }
    if (e.t === 'kill') won[pack] = (won[pack] ?? 0) + 1
    if (e.t === 'death') { lost[pack] = (lost[pack] ?? 0) + 1; deaths++ }
  }
  let tt = 0
  while (tt < 3600) { advance(s, 60, emit, 0.2); tt += 60; s.hero.xp = 0; if (s.loc.zone !== zone) { s.loc = { zone, sub } } }
  const { lo, hi } = subLevels(zone, sub)
  const avg = lvls.length ? (lvls.reduce((a, b) => a + b, 0) / lvls.length).toFixed(1) : '-'
  const fmt = (o: Record<number, number>) => [1, 2, 3].map((k) => o[k] ?? 0).join('/')
  console.log(`${zone}#${sub} (${lo}-${hi}) mob avg ${avg}: wins 1/2/3 ${fmt(won)}  deaths 1/2/3 ${fmt(lost)}  total deaths ${deaths}`)
}
