import { classById, ranksOf, startSkills } from '../data/classes'
import { ROUTES } from '../data/zones'
import { subsOf } from './world'
import { newGame } from './sim'
import { fixInv, addToInv } from './inventory'
import { makeQuestItem, makeFood, FOODS } from './items'
import type { GameState, Item } from './types'

const KEY = 'azeroth-idle-save-v1'
const BACKUP = 'azeroth-idle-backup-v1'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export function loadGame(): GameState | null {
  for (const k of [KEY, BACKUP]) {
    try {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const s = migrate(JSON.parse(raw))
      if (s) return s
    } catch { /* uszkodzony zapis: spróbuj kopii */ }
  }
  return null
}

export function migrate(o: Any): GameState | null {
  if (!o || !o.hero) return null
  if (o.v === 4) { fixInv(o.hero); return o as GameState }
  if (o.v === 3) return v3to4(o)
  if (o.v === 2) return v3to4(v2to3(o))
  if (o.v !== 1) return null
  // v1 -> v2: zachowaj postać, poziom, pieniądze i ekwipunek; odblokuj mapy przebyte na starej trasie
  const old = o
  const s = newGame(old.hero.name, old.hero.race, old.hero.cls, old.seed)
  const h = s.hero
  h.level = old.hero.level
  h.xp = old.hero.xp
  h.rested = old.hero.rested ?? 0
  h.copper = old.hero.copper ?? 0
  h.equip = {}
  for (const [slot, it] of Object.entries(old.hero.equip ?? {}) as [string, Item][]) {
    if (!it) continue
    if (slot === 'weapon') { it.slot = 'mainhand'; h.equip.mainhand = it } else (h.equip as Any)[slot] = it
  }
  h.inv = []
  fixInv(h)
  ;(old.hero.bags ?? []).slice(0, 16).forEach((it: Item, i: number) => { if (it.slot === ('weapon' as Any)) it.slot = 'mainhand'; h.inv[i] = it })
  for (const a of classById(h.cls).abilities) {
    const r = ranksOf(a).filter((x) => x <= h.level)
    if (r.length) h.trained[a.id] = r[r.length - 1]
  }
  const route = ROUTES[s.start].map((r) => r[0])
  const idx = Math.min(old.routeIdx ?? 0, route.length - 1)
  s.unlocked = route.slice(0, idx + 1)
  for (let i = 0; i < idx; i++) s.prog[route[i]] = { cleared: subsOf(route[i]).length, kills: 0 }
  s.prog[route[idx]] = { cleared: 0, kills: 0 }
  s.loc = { zone: route[idx], sub: 0 }
  s.itemSeq = Math.max(old.itemSeq ?? 10, 10) + 10
  s.totals = { ...s.totals, ...old.totals, bosses: 0 }
  s.log = old.log ?? []
  s.savedAt = old.savedAt ?? Date.now()
  s.speed = old.speed ?? 1
  s.log.push({ time: Date.now(), text: 'Zapis zaktualizowany do wersji 0.2: mapy z podstrefami, trener, zadania w mieście.', color: '#69ccf0' })
  return s
}

// v3 -> v4: wybór nasyceń/totemów, umiejętności broni, jedzenie, prawdziwe przedmioty zadań, odkup
function v3to4(o: Any): GameState {
  o.v = 4
  const h = o.hero
  const c = classById(h.cls)
  h.choice ??= {}
  h.totems ??= []
  h.eating ??= null
  h.wellFed ??= null
  h.stacks ??= {}
  h.heroDodged ??= false
  // umiejętności broni: startowe + typy, które postać już nosi
  const skills = new Set<string>(startSkills(c))
  for (const it of Object.values(h.equip ?? {}) as Item[]) if (it?.weaponType && c.skills.includes(it.weaponType)) skills.add(it.weaponType)
  h.weaponSkills = [...skills]
  // nowe umiejętności z poziomu postaci: od razu wyuczone (żeby nie płacić za stare rangi drugi raz)
  for (const a of c.abilities) {
    if (a.talent || h.trained[a.id]) continue
    const r = ranksOf(a).filter((x) => x <= h.level)
    if (r.length && a.lvl <= Math.max(1, h.level - 6)) h.trained[a.id] = r[r.length - 1]
  }
  o.buyback ??= []
  // drzewka talentów zmieniły się (WoW Forever): punkty wracają do rozdania za darmo
  h.talents = {}
  fixInv(h)
  // postęp zadań "zbierz" zamieniony na przedmioty w torbach
  for (const q of o.quests ?? []) {
    if (q.kind !== 'collect' || !q.have) continue
    addToInv(h, { ...makeQuestItem(o.itemSeq++, q.item, q.id), count: q.have })
  }
  // trochę jedzenia na start nowej wersji
  const food = FOODS.filter((f) => f.kind === 'food' && f.lvl <= h.level).pop()!
  addToInv(h, makeFood(o.itemSeq++, food, 10))
  if (c.resource === 'mana') addToInv(h, makeFood(o.itemSeq++, FOODS.filter((f) => f.kind === 'drink' && f.lvl <= h.level).pop()!, 10))
  if (o.mob) { o.mob.dist ??= 0; o.mob.dist0 ??= 0; o.mob.cc ??= 0 }
  o.log?.push({ time: Date.now(), text: 'Wersja 0.4: przeciąganie przedmiotów, jedzenie i picie, totemy, umiejętności broni, talenty z WoW Forever. Punkty talentów zwrócone — rozdaj je od nowa (N).', color: '#69ccf0' })
  return o as GameState
}

function v2to3(o: Any): GameState {
  o.v = 3
  const h = o.hero
  h.talents ??= {}
  h.disabled ??= {}
  h.form ??= 'caster'
  h.pet ??= h.level >= 10 && h.cls === 'warlock' ? 'voidwalker' : 'imp'
  h.temp ??= {}
  if (h.cls === 'warlock' && h.level >= 10) h.trained.summon_voidwalker ??= 10
  if (h.cls === 'warlock') h.trained.summon_imp ??= 1
  delete o.bossCd
  delete o.forceBoss
  o.autoEquip ??= true
  o.trip = null
  if (o.mob) { o.mob.per ??= o.mob.maxHp / (o.mob.count || 1); o.mob.count ??= 1 }
  fixInv(h)
  o.log?.push({ time: Date.now(), text: 'Wersja 0.3: talenty, wybór umiejętności, grupy mobów, statki i zeppeliny.', color: '#69ccf0' })
  return o as GameState
}

let lastBackup = 0
export function saveGame(s: GameState) {
  s.savedAt = Date.now()
  try {
    const raw = JSON.stringify(s)
    localStorage.setItem(KEY, raw)
    if (Date.now() - lastBackup > 5 * 60 * 1000) { localStorage.setItem(BACKUP, raw); lastBackup = Date.now() }
  } catch { /* brak miejsca / tryb prywatny */ }
}

export function wipeSave() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(BACKUP) } catch { /* nic */ }
}

export function exportSave(s: GameState) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))))
}

export function importSave(text: string): GameState | null {
  try { return migrate(JSON.parse(decodeURIComponent(escape(atob(text.trim()))))) } catch { return null }
}
