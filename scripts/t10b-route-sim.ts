// Prawdziwa symulacja trasy: każda rasa (z pierwszą możliwą klasą i dodatkowo ze zboczeniem z trasy):
// po ukończeniu mapy postać nigdy nie wraca na mapę już ukończoną.
import { RACES } from '../src/data/races'
import { CLASSES } from '../src/data/classes'
import { newGame, advance, moveTo } from '../src/game/sim'
import { subsOf, routeZones } from '../src/game/world'
import { visit } from './balance'
const H = Number(process.argv[2] ?? 30)
let fails = 0
for (const r of RACES) for (const detour of [false, true]) {
  const cls = CLASSES.find((c) => { try { newGame('T', r.id as any, c.id as any, 3); return true } catch { return false } })!
  const s: any = newGame('T', r.id as any, (detour ? CLASSES.filter((c) => { try { newGame('T', r.id as any, c.id as any, 3); return true } catch { return false } }).slice(-1)[0] : cls).id as any, 7)
  const route = routeZones(s)
  const seq: string[] = [s.loc.zone]
  let bad = ''
  let detoured = false
  for (let m = 0; m < H * 60; m++) {
    advance(s, 60)
    if (m % 60 === 0) visit(s)
    const z = s.trip?.final?.zone ?? s.trip?.dest?.zone ?? s.loc.zone // cel podróży (port po drodze się nie liczy)
    if (z !== seq[seq.length - 1]) {
      const full = (s.prog[z]?.cleared ?? 0) >= subsOf(z).length
      if (full && !bad) bad = `travelled to completed ${z}`
      seq.push(z)
    }
    // zboczenie: po ukończeniu 2. mapy trasy idź ręcznie na inną mapę o podobnym poziomie spoza trasy
    if (detour && !detoured && (s.prog[route[1]]?.cleared ?? 0) >= subsOf(route[1]).length && s.phase !== 'travel') {
      const alt = s.hero.faction === 'alliance' ? (route.includes('elwynn') ? 'dun_morogh' : 'elwynn') : (route.includes('durotar') ? 'mulgore' : 'durotar')
      if (!s.unlocked.includes(alt)) s.unlocked.push(alt)
      moveTo(s, alt, 0, () => {}, true); detoured = true; seq.push('(detour)')
    }
  }
  const line = `${r.id}${detour ? ' +detour' : ''} lvl ${s.hero.level}: ${seq.join(' > ')}`
  if (bad) { fails++; console.log('FAIL', line, '::', bad) } else console.log('OK  ', line)
}
console.log(fails ? `${fails} FAILS` : 'ALL OK')
