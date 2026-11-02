import { newGame, advance, heroInMelee } from '../src/game/sim'
import { enterCapital, bindHearth } from '../src/game/town'
import { damageGear } from '../src/game/items'
import { addToInv } from '../src/game/inventory'
import { makeKit, KITS } from '../src/game/items'
const ok = (c: boolean, m: string) => console.log(c ? 'OK ' : 'FAIL', m)
// hearth
const s = newGame('T', 'orc', 'warrior', 3)
const e = enterCapital(s)
ok(!!e && s.where === 'field', `nowa postać nie teleportuje się: ${e}`)
s.loc = { zone: 'durotar', sub: 0 }; s.unlocked.push('durotar')
ok(!enterCapital(s) && s.where === 'capital', 'wejście pieszo do Orgrimmara')
ok(!bindHearth(s) && s.home === 'Orgrimmar', 'przypisany hearth')
// hunter bez pupila: walka wręcz bronią z ręki
const h = newGame('H', 'troll', 'hunter', 5)
let melee = 0, ranged = 0
advance(h, 600, (ev) => { if (ev.t === 'dmg' && ev.src === 'hero' && !ev.ability) { if (heroInMelee(h)) melee++; else ranged++ } })
ok(melee > 0 && ranged > 0, `hunter <10: strzały ${ranged}, wręcz ${melee}`)
// kit między walkami
const k = newGame('K', 'human', 'warrior', 4)
advance(k, 120)
damageGear(k.hero, 1)
addToInv(k.hero, makeKit(999, KITS[0], 3))
advance(k, 60)
ok(Object.values(k.hero.equip).every((i) => i?.dur !== 0) || k.hero.inv.every((x) => !x?.kit), 'naprawa zestawem między walkami')
