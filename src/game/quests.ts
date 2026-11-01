// Zadania: tablica w mieście danej mapy. Każda odblokowana podstrefa daje trzy zadania
// (zabij, zbierz, boss). Przyjmuje się je i oddaje tylko w mieście tej mapy.
import { zoneById } from '../data/zones'
import { JUNK, makeGear } from './items'
import { makeRng } from './rng'
import { subMobs, subsOf, subLevels, bossLevel, progOf, townOf } from './world'
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
      title: `Zagrożenie w ${sz.name}`,
      text: `Mieszkańcy ${town} skarżą się na ${kill[0]}. Zabij ${needK} z nich w okolicy ${sz.name} i wróć po nagrodę.`,
      xp: Math.round(xpBase * 0.1), copper,
    },
    {
      id: `${zoneId}:${sub}:c`, zone: zoneId, sub, kind: 'collect', target: col[0], item, need: needC, have: 0, level: lvl,
      title: `Zbieranie: ${item}`,
      text: `Kwatermistrz w ${town} potrzebuje materiałów. Zdobądź ${needC}× ${item} z ${col[0]}.`,
      xp: Math.round(xpBase * 0.1), copper,
    },
    {
      id: `${zoneId}:${sub}:b`, zone: zoneId, sub, kind: 'boss', target: sz.boss.name, need: 1, have: 0, level: bossLvl,
      title: sz.zoneBoss ? `Koniec rządów: ${sz.boss.name}` : `Głowa: ${sz.boss.name}`,
      text: sz.zoneBoss
        ? `${sz.boss.name} blokuje drogę dalej. Pokonaj go w ${sz.name}, a droga do następnej krainy stanie otworem.`
        : `${sz.boss.name} terroryzuje ${sz.name}. Przynieś dowód, że już nikomu nie zagrozi.`,
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
