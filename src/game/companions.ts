// Towarzysze (ozdobne zwierzęta): kupowane u NPC w stolicy, chodzą obok postaci i nie walczą.
// Muł kupiecki: gdy torby się zapełnią, sam zanosi wybrane przedmioty do kupca i wraca z pieniędzmi.
import type { GameState, Hero, Item } from './types'
import { freeSlots } from './inventory'

export type CompanionDef = { id: string; name: string; price: number; kind: 'mule'; desc: string; icon: string }
export const COMPANIONS: CompanionDef[] = [
  { id: 'mule', name: 'Pack Mule', price: 500000, kind: 'mule', icon: 'mule', desc: 'Walks beside you. When your bags are full, it carries the items you choose to a vendor in town, sells them and comes back with the money.' },
]
export const companionById = (id: string | null | undefined) => COMPANIONS.find((c) => c.id === id) ?? null
export const MULE_TRIP = 120 // s: droga do kupca i z powrotem
export const SELL_Q_DEFAULT = [0, 1]
export const QUALITY = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic']
export const QUALITY_COL = ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee']

export const owns = (h: Hero, id: string) => !!h.comps?.includes(id)
export const sellQ = (h: Hero) => h.sellQ ?? SELL_Q_DEFAULT
// co muł zabiera: przedmioty wybranej jakości (bez przedmiotów zadań, jedzenia, zestawów naprawczych i toreb)
export const muleTakes = (h: Hero) => (it: Item | null): it is Item => !!it && !it.quest && !it.food && !it.kit && !it.bagSize && it.value > 0 && sellQ(h).includes(it.rarity)
// muł jest przy postaci (kupiony, wybrany i nie w drodze)
export const muleHere = (h: Hero) => h.comp === 'mule' && owns(h, 'mule') && !h.mule

export function buyCompanion(s: GameState, id: string): string | null {
  const c = companionById(id)
  const h = s.hero
  if (!c || s.where !== 'capital') return null
  if (owns(h, id)) return 'You already have it.'
  if (h.copper < c.price) return 'Not enough money.'
  h.copper -= c.price
  h.comps = [...(h.comps ?? []), id]
  h.comp = id
  h.sellQ ??= [...SELL_Q_DEFAULT]
  return null
}

type Log = (s: GameState, text: string, color?: string) => void
const fmt = (c: number) => `${c >= 10000 ? `${Math.floor(c / 10000)}g ` : ''}${c >= 100 ? `${Math.floor(c / 100) % 100}s ` : ''}${c % 100}c`

// wysyła muła, gdy torby są pełne; zwraca true, jeśli wyruszył
export function sendMule(s: GameState, log: Log, force = false) {
  const h = s.hero
  if (!muleHere(h) || s.where !== 'field') return false
  if (!force && freeSlots(h) > 0) return false
  const take = muleTakes(h)
  let copper = 0, n = 0
  h.inv.forEach((it, i) => { if (take(it)) { copper += it.value * (it.count ?? 1); n += it.count ?? 1; h.inv[i] = null } })
  if (!n) return false
  h.mule = { left: MULE_TRIP, copper, n }
  log(s, `Your Pack Mule heads to town with ${n} item${n > 1 ? 's' : ''} to sell (back in ${Math.round(MULE_TRIP / 60)} min).`, '#c8a060')
  return true
}

export function muleTick(s: GameState, dt: number, log: Log) {
  const h = s.hero
  if (h.mule) {
    h.mule.left -= dt
    if (h.mule.left <= 0) {
      h.copper += h.mule.copper
      s.totals.copper += h.mule.copper
      log(s, `Your Pack Mule is back: sold ${h.mule.n} item${h.mule.n > 1 ? 's' : ''} for ${fmt(h.mule.copper)}.`, '#ffd100')
      h.mule = null
    }
    return
  }
  sendMule(s, log)
}
