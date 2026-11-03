// Test trasy: każda rasa (obszar startowy) i frakcja — kolejne mapy, zboczenia z trasy, podróż do następnej mapy
import { newGame, advance } from '../src/game/sim'
import { nextRouteZone, routeZones, subsOf, planTrip, landmass } from '../src/game/world'
import { ROUTES, zoneById, ZONES } from '../src/data/zones'
import { RACES } from '../src/data/races'
import { CLASSES } from '../src/data/classes'
import { importSave } from '../src/game/save'
import { readFileSync, existsSync } from 'fs'
let fails = 0
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }
const done = (s: any, z: string) => { s.prog[z] = { cleared: subsOf(z).length, kills: 0 } }
for (const r of RACES) {
  for (const c of CLASSES) {
    let s: any
    try { s = newGame('T', r.id as any, c.id as any, 1) } catch { continue }
    if (!s || !ROUTES[s.start]) continue
    const route = routeZones(s)
    // 1) trasa po kolei
    let at = route[0], steps = 0
    const seen: string[] = [at]
    while (at && steps < 60) {
      done(s, at); s.hero.level = Math.min(60, zoneById(at).max)
      const nx = nextRouteZone(s, at)
      if (!nx) break
      const p = planTrip(s.hero.faction, at, nx, 0, true)
      ok(!p.blocked, `${r.id}/${c.id}: no path ${at} -> ${nx} (${p.blocked})`)
      ok(!seen.includes(nx), `${r.id}/${c.id}: route revisits ${nx}`)
      seen.push(nx); at = nx; steps++
    }
    ok(seen.length === route.length, `${r.id}/${c.id}: visited ${seen.length}/${route.length}`)
    // 2) zboczenie: po 2 mapach trasy idziemy na dowolną inną mapę i ją kończymy
    for (const z of ZONES) {
      if (route.indexOf(z.id) === 0 || (z.parent && !route.includes(z.id))) continue
      const t: any = newGame('T', r.id as any, c.id as any, 1)
      done(t, route[0]); done(t, route[1]); done(t, z.id); t.hero.level = Math.max(t.hero.level, z.min + 2)
      const nx = nextRouteZone(t, z.id)
      ok(!!nx && nx !== route[0] && nx !== route[1] && nx !== z.id, `${r.id}/${c.id}: detour ${z.id} -> ${nx}`)
      if (nx && landmass(nx) === landmass(z.id)) ok(!planTrip(t.hero.faction, z.id, nx, 0, true).blocked, `${r.id}/${c.id}: no path detour ${z.id} -> ${nx}`)
    }
  }
}
// 3) save gracza: krasnolud, Coldridge + Dun Morogh, potem Elwynn — po Elwynn nie wraca do Dun Morogh
const SAVE = process.argv[2] ?? '/tmp/route/save.b64' // eksport save'a (tekst) — opcjonalnie
if (existsSync(SAVE)) {
const sv = importSave(readFileSync(SAVE, 'utf8'))!
sv.prog.elwynn = { cleared: subsOf('elwynn').length, kills: 0 }
const nx = nextRouteZone(sv, 'elwynn')
console.log('save: after Elwynn ->', nx)
ok(nx !== 'dun_morogh' && nx !== 'coldridge', 'save goes back to Dun Morogh')
// 4) prawdziwa symulacja: zabij bossa Elwynn w save i zobacz, dokąd rusza
const s2 = importSave(readFileSync(SAVE, 'utf8'))!
s2.loc = { zone: 'elwynn', sub: subsOf('elwynn').length - 1 }; s2.where = 'field'; s2.mob = null; s2.phase = 'walk'
s2.prog.elwynn = { cleared: subsOf('elwynn').length - 1, kills: 999 }
s2.hero.level = 30
for (let i = 0; i < 2000 && s2.loc.zone === 'elwynn' && !s2.trip; i++) advance(s2, 5)
console.log('sim:', JSON.stringify(s2.trip), s2.loc, s2.log.slice(-6).map((l: any) => l.text))
}
console.log(fails ? `${fails} FAILS` : 'ALL OK')
