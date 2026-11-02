import { newGame, advance } from '../src/game/sim'
import { visit } from './balance'
import { damageGear } from '../src/game/items'
import fs from 'fs'
const s = newGame('Kuba', 'tauren', 'druid', 21)
for (let m = 1; m <= 300; m++) { advance(s, 60); if (m % 60 === 0) visit(s) }
s.where = 'field'
damageGear(s.hero, 0.8)
s.hero.form = s.hero.trained.bear_form ? 'bear' : 'caster'
fs.writeFileSync('/tmp/save08.json', JSON.stringify(s))
console.log(s.hero.level, s.hero.form, s.loc, Object.keys(s.hero.trained).length)
