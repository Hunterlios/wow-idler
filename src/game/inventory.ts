// Plecak (16) + 4 sloty na torby, zakładanie / zdejmowanie przedmiotów.
import { canWear, displacedScore, itemScore, targetSlot } from './items'
import { ALL_SLOTS, type EquipSlot, type Hero, type Item } from './types'

export const BACKPACK = 16
export const capacity = (h: Hero) => BACKPACK + h.bags.reduce((a, b) => a + (b?.bagSize ?? 0), 0)
export const freeSlots = (h: Hero) => h.inv.filter((x) => !x).length
export const usedSlots = (h: Hero) => h.inv.filter((x) => x).length

export function fixInv(h: Hero) {
  const cap = capacity(h)
  while (h.inv.length < cap) h.inv.push(null)
}

export const STACK = 20
export const stackable = (it: Item) => !it.slot && !it.bagSize
const sameStack = (a: Item, b: Item) => stackable(a) && stackable(b) && a.name === b.name && (a.quest ?? '') === (b.quest ?? '') && a.rarity === b.rarity
export function addToInv(h: Hero, it: Item): boolean {
  fixInv(h)
  if (stackable(it)) {
    let left = it.count ?? 1
    for (const st of h.inv) {
      if (!st || !sameStack(st, it) || (st.count ?? 1) >= STACK) continue
      const n = Math.min(left, STACK - (st.count ?? 1))
      st.count = (st.count ?? 1) + n
      left -= n
      if (!left) return true
    }
    it = { ...it, count: left }
  }
  const i = h.inv.findIndex((x) => !x)
  if (i < 0) return false
  h.inv[i] = it
  return true
}
// Ile sztuk przedmiotu jest w torbach
export const countItems = (h: Hero, pred: (it: Item) => boolean) => h.inv.reduce((a, x) => a + (x && pred(x) ? x.count ?? 1 : 0), 0)
export function removeItems(h: Hero, pred: (it: Item) => boolean, n: number) {
  for (let i = h.inv.length - 1; i >= 0 && n > 0; i--) {
    const x = h.inv[i]
    if (!x || !pred(x)) continue
    const take = Math.min(n, x.count ?? 1)
    n -= take
    if ((x.count ?? 1) - take <= 0) h.inv[i] = null
    else x.count = (x.count ?? 1) - take
  }
}

// Przeciąganie w torbach: łączy stosy albo zamienia miejscami
export function moveInv(h: Hero, from: number, to: number) {
  if (from === to) return
  const a = h.inv[from], b = h.inv[to]
  if (!a) return
  if (b && sameStack(a, b) && (b.count ?? 1) < STACK) {
    const n = Math.min(a.count ?? 1, STACK - (b.count ?? 1))
    b.count = (b.count ?? 1) + n
    if ((a.count ?? 1) - n <= 0) h.inv[from] = null
    else a.count = (a.count ?? 1) - n
    return
  }
  h.inv[from] = b
  h.inv[to] = a
}

// Sortowanie toreb: ekwipunek (wg slotu, jakości), torby, jedzenie, przedmioty zadań, śmieci
export function sortBags(h: Hero) {
  const items: Item[] = []
  for (const it of h.inv) {
    if (!it) continue
    const st = items.find((x) => sameStack(x, it) && (x.count ?? 1) < STACK)
    if (st) {
      const n = Math.min(it.count ?? 1, STACK - (st.count ?? 1))
      st.count = (st.count ?? 1) + n
      if ((it.count ?? 1) - n > 0) items.push({ ...it, count: (it.count ?? 1) - n })
    } else items.push({ ...it })
  }
  const group = (it: Item) => (it.slot ? 0 : it.bagSize ? 1 : it.food ? 2 : it.quest ? 3 : it.rarity === 0 ? 5 : 4)
  const slotIdx = (it: Item) => { const k = ['mainhand', 'twohand', 'offhand', 'ranged', 'head', 'neck', 'shoulder', 'back', 'chest', 'shirt', 'tabard', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger', 'trinket'].indexOf(it.slot ?? ''); return k < 0 ? 99 : k }
  items.sort((a, b) => group(a) - group(b) || slotIdx(a) - slotIdx(b) || b.rarity - a.rarity || b.ilvl - a.ilvl || a.name.localeCompare(b.name))
  h.inv = h.inv.map((_, i) => items[i] ?? null)
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
    if (!h.bags.some((b) => !b)) return 'No free bag slot.'
    h.inv[idx] = null
    equipBag(h, it)
    return null
  }
  if (!it.slot) return 'You can\'t equip that.'
  if (!canWear(h, it)) return 'Your class can\'t use that.'
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

// Pierwszy indeks w inv należący do torby bagIdx
export function bagStart(h: Hero, bagIdx: number) {
  let off = BACKPACK
  for (let b = 0; b < bagIdx; b++) off += h.bags[b]?.bagSize ?? 0
  return off
}

// Zdejmuje torbę ze slotu i odkłada ją do innej torby (target = indeks w inv; brak = pierwsze wolne miejsce).
// Zawartość zdejmowanej torby trafia na wolne miejsca w pozostałych torbach.
export function unequipBag(h: Hero, bagIdx: number, target?: number): string | null {
  const bag = h.bags[bagIdx]
  if (!bag) return null
  const segs = segmentsOf(h)
  const start = bagStart(h, bagIdx)
  const size = bag.bagSize ?? 0
  if (target != null && target >= start && target < start + size) return 'You can\'t put a bag inside itself.'
  if (target != null && h.inv[target]) return 'Drop the bag on a free slot in another bag.'
  const inside = segs[bagIdx + 1].filter((x): x is Item => !!x)
  const freeElsewhere = segs.reduce((a, seg, i) => (i === bagIdx + 1 ? a : a + seg.filter((x) => !x).length), 0)
  if (freeElsewhere < inside.length + 1) return 'Not enough space to empty and store the bag.'
  h.bags[bagIdx] = null
  const rest: (Item | null)[] = [...segs[0]]
  for (let b = 0; b < 4; b++) if (b !== bagIdx && h.bags[b]) rest.push(...segs[b + 1])
  h.inv = rest
  if (target != null) {
    const t = target >= start + size ? target - size : target
    h.inv[t] = bag
  }
  for (const it of inside) addToInv(h, it)
  if (target == null) addToInv(h, bag)
  return null
}

// Zakłada torbę z inv do wskazanego (pustego) slotu na torby
export function equipBagAt(h: Hero, idx: number, bagIdx: number): string | null {
  const it = h.inv[idx]
  if (!it?.bagSize) return 'That is not a bag.'
  if (h.bags[bagIdx]) return 'That bag slot is taken.'
  // tymczasowo zajmij inne sloty, by equipBag trafił w wybrany
  const saved = h.bags.slice()
  for (let b = 0; b < 4; b++) if (b !== bagIdx && !h.bags[b]) h.bags[b] = { id: -9, name: '', rarity: 0, ilvl: 0, value: 0, bagSize: 0 }
  h.inv[idx] = null
  equipBag(h, it)
  for (let b = 0; b < 4; b++) if (b !== bagIdx && !saved[b]) h.bags[b] = null
  return null
}

// Zdejmuje przedmiot na konkretne miejsce w torbach (przeciąganie z okna postaci)
export function unequipTo(h: Hero, slot: EquipSlot, idx: number): string | null {
  const it = h.equip[slot]
  if (!it) return null
  const there = h.inv[idx]
  if (!there) { h.inv[idx] = it; delete h.equip[slot]; return null }
  if (there.slot && fitsSlot(there, slot) && canWear(h, there)) return equipFromInv(h, idx, slot)
  return 'Drop it on a free bag slot.'
}

// Czy przedmiot pasuje do slotu postaci
export function fitsSlot(it: Item, slot: EquipSlot) {
  if (!it.slot) return false
  if (slot === 'finger1' || slot === 'finger2') return it.slot === 'finger'
  if (slot === 'trinket1' || slot === 'trinket2') return it.slot === 'trinket'
  if (slot === 'mainhand') return it.slot === 'mainhand' || it.slot === 'twohand'
  return it.slot === slot
}
export const isSlot = (x: string): x is EquipSlot => (ALL_SLOTS as string[]).includes(x)

export function unequip(h: Hero, slot: EquipSlot): string | null {
  const it = h.equip[slot]
  if (!it) return null
  if (!addToInv(h, it)) return 'Your bags are full.'
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

// Zamiana miejscami dwóch slotów na torby (z zawartością)
export function moveBag(h: Hero, i: number, j: number) {
  if (i === j) return
  const segs = segmentsOf(h)
  ;[h.bags[i], h.bags[j]] = [h.bags[j], h.bags[i]]
  ;[segs[i + 1], segs[j + 1]] = [segs[j + 1], segs[i + 1]]
  h.inv = segs.flat()
}

// Gracz przegląda torby i zakłada lepsze rzeczy (używane przez test balansu, w grze robi to gracz ręcznie)
export function equipUpgrades(h: Hero) {
  let n = 0
  for (let i = 0; i < h.inv.length; i++) {
    const it = h.inv[i]
    if (!it?.slot) continue
    h.inv[i] = null
    if (autoEquip(h, it)) n++
    else h.inv[i] = it
  }
  return n
}
