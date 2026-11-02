// Zadania: tablica w mieście danej mapy. Każda odblokowana podstrefa daje trzy zadania
// (zabij, zbierz, boss). Przyjmuje się je i oddaje tylko w mieście tej mapy.
import { zoneById } from '../data/zones'
import { JUNK, makeGear } from './items'
import { makeRng } from './rng'
import { subMobs, subsOf, subLevels, bossLevel, progOf, townOf } from './world'
import { ZONES } from '../data/zones'
import { xpToNext } from './formulas'
import { countItems } from './inventory'
import type { GameState, Item, Quest } from './types'

export const MAX_QUESTS = 10

const hashStr = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0 }

export function questsFor(s: GameState, zoneId: string, sub: number): Quest[] {
  const z = zoneById(zoneId)
  const sz = subsOf(zoneId)[sub]
  const rng = makeRng(hashStr(`${s.hero.name}|${zoneId}|${sub}`))
  const mobs = subMobs(zoneId, sub)
  const { hi } = subLevels(zoneId, sub)
  const lvl = Math.max(z.min, hi)
  const town = townOf(z, s.hero.faction) ?? z.name
  const xpBase = xpToNext(Math.min(59, lvl))
  const copper = Math.round(lvl * lvl * 2 + 40)
  const kill = mobs[0]
  const col = mobs[1]
  const item = rng.pick(JUNK[col[1]] ?? JUNK.beast)
  const needK = rng.int(8, 12)
  const needC = rng.int(6, 9)
  const bossLvl = bossLevel(zoneId, sub)
  const out: Quest[] = [
    {
      id: `${zoneId}:${sub}:k`, zone: zoneId, sub, kind: 'kill', target: kill[0], need: needK, have: 0, level: lvl,
      title: `Trouble in ${sz.name}`,
      text: `The people of ${town} are complaining about ${kill[0]}. Kill ${needK} of them around ${sz.name} and return for your reward.`,
      xp: Math.round(xpBase * 0.1), copper,
    },
    {
      id: `${zoneId}:${sub}:c`, zone: zoneId, sub, kind: 'collect', target: col[0], item, need: needC, have: 0, level: lvl,
      title: `Gathering: ${item}`,
      text: `The quartermaster in ${town} needs supplies. Collect ${needC}× ${item} from ${col[0]}.`,
      xp: Math.round(xpBase * 0.1), copper,
    },
    {
      id: `${zoneId}:${sub}:b`, zone: zoneId, sub, kind: 'boss', target: sz.boss.name, need: 1, have: 0, level: bossLvl,
      title: sz.zoneBoss ? `The End of ${sz.boss.name}` : `The Head of ${sz.boss.name}`,
      text: sz.zoneBoss
        ? `${sz.boss.name} blocks the road ahead. Defeat them in ${sz.name} and the way to the next land will be open.`
        : `${sz.boss.name} terrorizes ${sz.name}. Bring proof that they will threaten no one again.`,
      xp: Math.round(xpBase * (sz.zoneBoss ? 0.25 : 0.16)), copper: copper * 2,
    },
  ]
  // nagroda przedmiotowa za zadanie z bossem
  out[2].reward = makeGear(rng, 900000 + (hashStr(out[2].id) % 90000), s.hero, bossLvl, sz.zoneBoss ? 3 : 2)
  return out
}

// Dostępne na tablicy w mieście: podstrefy odblokowane, niewzięte, nieoddane
export function boardFor(s: GameState, zoneId: string): Quest[] {
  const p = progOf(s, zoneId)
  const n = subsOf(zoneId).length
  const taken = new Set(s.quests.map((q) => q.id))
  const done = new Set(s.questsDone)
  const out: Quest[] = []
  for (let i = 0; i <= Math.min(p.cleared, n - 1); i++) {
    for (const q of questsFor(s, zoneId, i)) {
      if (taken.has(q.id) || done.has(q.id)) continue
      // zadanie z bossem pokonanym wcześniej: i tak można je wziąć i od razu oddać
      if (q.kind === 'boss' && p.cleared > i) q.have = 1
      out.push(q)
    }
  }
  return out
}

// Zadania w stolicy (tablica ogłoszeń / Królewskie listy gończe): dla map w przedziale poziomu postaci,
// które już odkryła. Liczenie postępu jak zwykle (zabici wrogowie danej nazwy), oddanie w dowolnej stolicy frakcji.
export function capitalBoard(s: GameState, cap: string): Quest[] {
  const h = s.hero
  const enemy = h.faction === 'alliance' ? 'horde' : 'alliance'
  const zones = ZONES.filter((z) => !z.parent && z.control !== enemy && s.unlocked.includes(z.id) && z.max >= h.level - 1 && z.min <= h.level + 3)
    .sort((a, b) => Math.abs((a.min + a.max) / 2 - h.level) - Math.abs((b.min + b.max) / 2 - h.level)).slice(0, 3)
  const taken = new Set(s.quests.map((q) => q.id))
  const done = new Set(s.questsDone)
  const out: Quest[] = []
  for (const z of zones) {
    const p = progOf(s, z.id)
    const subs = subsOf(z.id)
    const sub = Math.min(p.cleared, subs.length - 1)
    const rng = makeRng(hashStr(`${h.name}|cap|${z.id}|${sub}`))
    const { hi } = subLevels(z.id, sub)
    const lvl = Math.max(z.min, hi)
    const xpBase = xpToNext(Math.min(59, lvl))
    const copper = Math.round(lvl * lvl * 2.5 + 60)
    const [mob] = subMobs(z.id, sub)
    const need = rng.int(12, 16)
    const last = subs.length - 1
    const boss = subs[last].boss
    const bLvl = bossLevel(z.id, last)
    const qs: Quest[] = [
      {
        id: `cap:${z.id}:${sub}:k`, zone: z.id, sub, kind: 'kill', target: mob[0], need, have: 0, level: lvl, cap,
        title: `Bounty: ${mob[0]}`,
        text: `The officers of ${cap} put a bounty on ${mob[0]} in ${z.name} (${subs[sub].name}). Slay ${need} of them and report back to any capital of your faction.`,
        xp: Math.round(xpBase * 0.14), copper,
      },
      {
        id: `cap:${z.id}:boss`, zone: z.id, sub: last, kind: 'boss', target: boss.name, need: 1, have: 0, level: bLvl, cap,
        title: `Wanted: ${boss.name}`,
        text: `A wanted poster in ${cap}: ${boss.name} holds ${subs[last].name} in ${z.name}. Bring proof of their death to any capital of your faction.`,
        xp: Math.round(xpToNext(Math.min(59, bLvl)) * 0.3), copper: copper * 3,
      },
    ]
    qs[1].reward = makeGear(rng, 950000 + (hashStr(qs[1].id) % 40000), h, bLvl, 3)
    if (p.cleared > last) qs[1].have = 1 // boss już pokonany: można od razu oddać
    for (const q of qs) if (!taken.has(q.id) && !done.has(q.id)) out.push(q)
  }
  return out
}
// Gdzie oddać zadanie
export const turnInPlace = (s: GameState, q: Quest) => q.cap ? `any capital (${q.cap})` : townOf(zoneById(q.zone), s.hero.faction) ?? zoneById(q.zone).name
// Czy zadanie można oddać tutaj
export const canTurnInHere = (s: GameState, q: Quest) => q.cap ? s.where === 'capital' : s.where === 'town' && s.loc.zone === q.zone

export function acceptQuest(s: GameState, q: Quest) {
  if (s.quests.length >= MAX_QUESTS || s.quests.some((x) => x.id === q.id)) return false
  s.quests.push({ ...q })
  syncQuests(s) // przedmioty zebrane wcześniej (np. przed porzuceniem zadania) się liczą
  return true
}

// Przedmioty zadań są prawdziwymi przedmiotami w torbach: postęp = ile ich masz
export const isQuestItem = (q: Quest) => (it: Item) => it.quest === q.id
export function syncQuests(s: GameState) {
  for (const q of s.quests) if (q.kind === 'collect') q.have = Math.min(q.need, countItems(s.hero, isQuestItem(q)))
}

export function abandonQuest(s: GameState, id: string) {
  s.quests = s.quests.filter((q) => q.id !== id)
}

// Spadek nagrody XP za zadania z dużo niższym poziomem (jak w Classicu)
export function questXp(s: GameState, q: Quest) {
  const d = s.hero.level - q.level
  const mul = d <= 5 ? 1 : d === 6 ? 0.8 : d === 7 ? 0.6 : d === 8 ? 0.4 : d === 9 ? 0.2 : 0.1
  return Math.round(q.xp * mul)
}

export const questReady = (q: Quest) => q.have >= q.need
