// Plecak (16) + 4 sloty na torby, zakładanie / zdejmowanie przedmiotów.
import { canWear, displacedScore, itemScore, targetSlot } from './items'
import type { EquipSlot, Hero, Item } from './types'

export const BACKPACK = 16
export const capacity = (h: Hero) => BACKPACK + h.bags.reduce((a, b) => a + (b?.bagSize ?? 0), 0)
export const freeSlots = (h: Hero) => h.inv.filter((x) => !x).length
export const usedSlots = (h: Hero) => h.inv.filter((x) => x).length

export function fixInv(h: Hero) {
  const cap = capacity(h)
  while (h.inv.length < cap) h.inv.push(null)
}

export const STACK = 20
export function addToInv(h: Hero, it: Item): boolean {
  fixInv(h)
  if (!it.slot && !it.bagSize) {
    const st = h.inv.find((x) => x && !x.slot && !x.bagSize && x.name === it.name && (x.count ?? 1) < STACK)
    if (st) { st.count = (st.count ?? 1) + (it.count ?? 1); return true }
  }
  const i = h.inv.findIndex((x) => !x)
  if (i < 0) return false
  h.inv[i] = it
  return true
}

// Zakłada torbę do wolnego slotu (zwiększa pojemność)
export function equipBag(h: Hero, it: Item): boolean {
  if (!it.bagSize) return false
  const i = h.bags.findIndex((b) => !b)
  if (i < 0) return false
  // nowa torba dokłada sloty na końcu jej segmentu: przebuduj układ
  const segments = segmentsOf(h)
  h.bags[i] = it
  const newInv: (Item | null)[] = []
  newInv.push(...segments[0])
  for (let b = 0; b < 4; b++) {
    const bag = h.bags[b]
    if (!bag) continue
    const old = segments[b + 1]
    for (let k = 0; k < (bag.bagSize ?? 0); k++) newInv.push(old?.[k] ?? null)
  }
  h.inv = newInv
  return true
}

// Podział inv na segmenty: [plecak, torba1, torba2, torba3, torba4]
export function segmentsOf(h: Hero): (Item | null)[][] {
  const out: (Item | null)[][] = [h.inv.slice(0, BACKPACK)]
  let off = BACKPACK
  for (let b = 0; b < 4; b++) {
    const size = h.bags[b]?.bagSize ?? 0
    out.push(size ? h.inv.slice(off, off + size) : [])
    off += size
  }
  return out
}

// Zakłada przedmiot z plecaka (index w inv). Zwraca komunikat błędu albo null.
export function equipFromInv(h: Hero, idx: number, forced?: EquipSlot): string | null {
  const it = h.inv[idx]
  if (!it) return null
  if (it.bagSize) {
    if (!h.bags.some((b) => !b)) return 'Brak wolnego slotu na torbę.'
    h.inv[idx] = null
    equipBag(h, it)
    return null
  }
  if (!it.slot) return 'Tego nie da się założyć.'
  if (!canWear(h, it)) return 'Twoja klasa nie może tego używać.'
  const t = forced ?? targetSlot(h, it)!
  h.inv[idx] = null
  const back: Item[] = []
  if (h.equip[t]) back.push(h.equip[t]!)
  if (it.slot === 'twohand' && h.equip.offhand) { back.push(h.equip.offhand); delete h.equip.offhand }
  if (it.slot === 'offhand' && h.equip.mainhand?.slot === 'twohand') { back.push(h.equip.mainhand); delete h.equip.mainhand }
  h.equip[t] = it
  for (const b of back) if (!addToInv(h, b)) { h.inv[idx] = b }
  return null
}

// Zdejmuje torbę ze slotu (przedmioty z niej przenosi do innych wolnych miejsc)
export function unequipBag(h: Hero, bagIdx: number): string | null {
  const bag = h.bags[bagIdx]
  if (!bag) return null
  const segs = segmentsOf(h)
  const inside = segs[bagIdx + 1].filter((x): x is Item => !!x)
  const freeElsewhere = segs.reduce((a, seg, i) => (i === bagIdx + 1 ? a : a + seg.filter((x) => !x).length), 0)
  if (freeElsewhere < inside.length + 1) return 'Za mało miejsca, żeby opróżnić i schować torbę.'
  h.bags[bagIdx] = null
  const rest: (Item | null)[] = [...segs[0]]
  for (let b = 0; b < 4; b++) if (b !== bagIdx && h.bags[b]) rest.push(...segs[b + 1])
  h.inv = rest
  for (const it of inside) addToInv(h, it)
  addToInv(h, bag)
  return null
}

export function unequip(h: Hero, slot: EquipSlot): string | null {
  const it = h.equip[slot]
  if (!it) return null
  if (!addToInv(h, it)) return 'Torby są pełne.'
  delete h.equip[slot]
  return null
}

// Automatyczne zakładanie lepszego łupu (idle). Zwraca true jeśli założono.
export function autoEquip(h: Hero, it: Item): boolean {
  if (!it.slot || it.slot === 'shirt' || it.slot === 'tabard' || !canWear(h, it)) return false
  if (itemScore(h, it) <= displacedScore(h, it) * 1.001) return false
  const t = targetSlot(h, it)!
  const back: Item[] = []
  if (h.equip[t]) back.push(h.equip[t]!)
  if (it.slot === 'twohand' && h.equip.offhand) { back.push(h.equip.offhand); delete h.equip.offhand }
  if (it.slot === 'offhand' && h.equip.mainhand?.slot === 'twohand') { back.push(h.equip.mainhand); delete h.equip.mainhand }
  h.equip[t] = it
  for (const b of back) addToInv(h, b) // brak miejsca = stary przedmiot przepada
  return true
}
