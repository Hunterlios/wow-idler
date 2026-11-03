// npx tsx scripts/gearcheck.ts [h] — ta sama postać z ekwipunkiem i bez (nago) w tej samej strefie przez 30 min
import { RACES } from '../src/data/races'
import { newGame, advance } from '../src/game/sim'
import { visit } from './balance'
import type { GameState } from '../src/game/types'
const hours = Number(process.argv[2] ?? 4)
const only = process.argv[3]
for (const r of RACES) for (const c of r.classes.slice(0, 9)) {
  if (only && !`${r.id}/${c}`.includes(only)) continue
  if (!['human/warrior', 'human/mage', 'orc/hunter', 'human/rogue', 'human/priest', 'dwarf/paladin', 'orc/shaman', 'undead/warlock', 'nightelf/druid'].includes(`${r.id}/${c}`)) continue
  const s0 = newGame('T', r.id, c, 99)
  for (let t = 0; t < hours * 3600; t += 1800) { advance(s0, 1800, () => {}, 0.2); visit(s0) }
  const snap = JSON.stringify(s0)
  const run = (naked: boolean) => {
    const s: GameState = JSON.parse(snap)
    if (naked) { for (const k of Object.keys(s.hero.equip)) delete (s.hero.equip as any)[k] }
    s.autoEquip = false
    let kills = 0, deaths = 0
    for (let t = 0; t < 1800; t += 60) { advance(s, 60, (e: any) => { if (e.t === 'kill') kills += e.count; if (e.t === 'death') deaths++ }, 0.2); s.hero.xp = 0 }
    return `${String(kills).padStart(4)} kills ${String(deaths).padStart(3)} deaths`
  }
  console.log(`${r.id}/${c}`.padEnd(16), `lvl ${s0.hero.level}`, 'geared:', run(false), ' | naked:', run(true))
}
