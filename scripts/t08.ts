import { newGame, advance, stats, spiritRes, moveTo, ride, tripPlan, abilityInfo } from '../src/game/sim'
import { portsOf } from '../src/game/world'
import { repairAll, repairAllCost, enterCapital } from '../src/game/town'
import { maxDur, curDur } from '../src/game/items'
import { classById } from '../src/data/classes'
const ok = (c: boolean, m: string) => console.log(c ? 'OK ' : 'FAIL', m)
// tramwaj
ok(portsOf('alliance', 'coldridge').length === 0, 'Coldridge: brak tramwaju')
ok(portsOf('alliance', 'dun_morogh').some((p) => p.t.kind === 'tram'), 'Dun Morogh: tramwaj')
ok(portsOf('horde', 'valley_of_trials').length === 0, 'Valley of Trials: brak zeppelina')
// śmierć i Duch Uzdrowiciel
const s = newGame('T', 'human', 'warrior', 3)
advance(s, 600)
s.prog[s.loc.zone].kills = 5
s.hero.hp = 0; s.phase = 'dead'; s.phaseT = 30
const chest = s.hero.equip.chest!
ok(spiritRes(s), 'spiritRes zadziałał')
ok(curDur(chest) === maxDur(chest) - Math.ceil(maxDur(chest) * 0.25), `chest dur ${curDur(chest)}/${maxDur(chest)}`)
ok(s.prog[s.loc.zone].kills === 0 || s.loc.sub < s.prog[s.loc.zone].cleared, 'postęp wyzerowany')
for (let i = 0; i < 4; i++) { s.phase = 'dead'; spiritRes(s) }
ok(chest.dur === 0, 'po 5 razach zepsuty')
const armorBroken = stats(s.hero).armor
s.where = 'capital'; s.hero.copper = 100000
const cost = repairAllCost(s)
ok(cost > 0 && !repairAll(s) && chest.dur == null && stats(s.hero).armor > armorBroken, `naprawa za ${cost} c, armor ${armorBroken} -> ${stats(s.hero).armor}`)
s.where = 'field'
// duch w podróży
s.phase = 'dead'; s.hero.hp = 0
const e = moveTo(s, 'elwynn', 0)
ok(!e && s.phase === 'travel' && s.hero.hp > 0 && curDur(chest) < maxDur(chest), 'podróż ducha = wskrzeszenie z uszkodzeniem')
// Moonfire na druidzie
const g = newGame('D', 'nightelf', 'druid', 5)
g.hero.level = 10; g.hero.trained.moonfire = 10
let casts = 0, last = -1, early = 0, t = 0
advance(g, 1800, (ev) => { if (ev.t === 'cast' && ev.ability === 'Moonfire') { casts++; if (last >= 0 && t - last < 11.5 && g.mob) {/* refresh */} last = t } })
ok(casts > 0, `Moonfire rzucany (${casts})`)
// recast check: DoT present -> no recast
const mf = classById('druid').abilities.find((a) => a.id === 'moonfire')!
console.log(abilityInfo(g.hero, mf).join(' / '))
// tauren travel
const tt = newGame('T', 'tauren', 'warrior', 1)
const ht = newGame('H', 'orc', 'warrior', 1)
ok(tripPlan(tt, 'mulgore', 0).total < tripPlan(ht, 'mulgore', 0).total, `tauren szybciej: ${tripPlan(tt, 'mulgore', 0).total} vs ${tripPlan(ht, 'mulgore', 0).total}`)
void early; void ride; void enterCapital
