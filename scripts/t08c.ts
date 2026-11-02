import { newGame, advance, spiritRes } from '../src/game/sim'
import { buyKit } from '../src/game/town'
import { damageGear } from '../src/game/items'
const ok = (c: boolean, m: string) => console.log(c ? 'OK ' : 'FAIL', m)
const s = newGame('T', 'human', 'warrior', 3)
advance(s, 300)
damageGear(s.hero, 1)
s.where = 'capital'; s.hero.copper = 1000
ok(!buyKit(s, 'Light Repair Kit', 2), 'kupiono 2 zestawy')
ok(!!buyKit(s, 'Heavy Repair Kit', 1), 'Heavy wymaga poziomu')
s.where = 'field'
s.phase = 'dead'; s.hero.hp = 0
spiritRes(s)
const broken = Object.values(s.hero.equip).filter((i) => i?.dur === 0).length
const kits = s.hero.inv.reduce((a, x) => a + (x?.kit ? x.count ?? 1 : 0), 0)
ok(kits === 0 && broken > 0, `zestawy zużyte, zostało zepsutych: ${broken}`)
console.log(s.log.slice(-4).map((l) => l.text).join('\n'))
