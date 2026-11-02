import { newGame, advance } from '../src/game/sim'
const g = newGame('D', 'nightelf', 'druid', 5)
g.hero.level = 12; g.hero.trained.moonfire = 10
let bad = 0, n = 0, racials: Record<string, number> = {}, miss: Record<string, number> = {}
advance(g, 1800, (ev) => {
  if (ev.t === 'cast' && ev.ability === 'Moonfire') { n++; if (g.mob?.dots.some((d) => d.id === 'moonfire')) bad++ }
})
console.log('moonfire casts', n, 'recast while active', bad)
for (const [r, c] of [['orc', 'warrior'], ['troll', 'mage'], ['dwarf', 'paladin'], ['undead', 'priest'], ['tauren', 'warrior'], ['gnome', 'mage'], ['nightelf', 'rogue'], ['human', 'warrior']] as const) {
  const s = newGame('X', r, c, 9)
  racials = {}; miss = {}
  advance(s, 3600, (ev) => { if (ev.t === 'racial') racials[ev.name] = (racials[ev.name] ?? 0) + 1; if (ev.t === 'dmg' && ev.src === 'hero' && ev.miss) miss[ev.miss] = (miss[ev.miss] ?? 0) + 1 })
  console.log(r, c, 'lvl', s.hero.level, JSON.stringify(racials), JSON.stringify(miss), JSON.stringify(s.hero.wskill))
}
