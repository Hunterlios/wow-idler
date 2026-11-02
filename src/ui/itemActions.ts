// Akcje na przedmiotach z interfejsu: prawy przycisk i przeciąganie
import { equipFromInv, equipBagAt, fitsSlot, isSlot, moveBag, moveInv, segmentsOf, bagStart, unequip, unequipBag, unequipTo } from '../game/inventory'
import { canWear } from '../game/items'
import { sellAt } from '../game/town'
import { useItem, stats } from '../game/sim'
import { syncQuests } from '../game/quests'
import { formatMoney } from '../game/formulas'
import type { EquipSlot, GameState } from '../game/types'
import type { DragSrc } from './dnd'
import { itemDrop, uiSound } from '../audio/gamesounds'

type Res = { msg: string; color?: string } | null
const money = (c: number) => { const m = formatMoney(c); return [m.g && `${m.g} g`, m.s && `${m.s} s`, (m.c || (!m.g && !m.s)) && `${m.c} c`].filter(Boolean).join(' ') }
const err = (e: string | null): Res => (e ? { msg: e, color: '#ff4040' } : null)

function sell(s: GameState, idx: number): Res {
  const it = s.hero.inv[idx]
  if (!it) return null
  if (it.quest) return err('Quest items can\'t be sold.')
  const v = sellAt(s, idx)
  syncQuests(s)
  uiSound('ui.coins', 80)
  return { msg: `Sold ${it.name}${(it.count ?? 1) > 1 ? ` ×${it.count}` : ''} for ${money(v)} (buy it back in the Buyback tab)`, color: '#ffffff' }
}

// Sprzedaż tylko przy otwartej zakładce kupca (jak w grze: okno handlu). Inaczej w mieście też można zmieniać ekwipunek.
let vendorOpen = false
export const setVendorOpen = (v: boolean) => { vendorOpen = v }
export const canSell = (s: GameState) => vendorOpen && s.where !== 'field'
// po założeniu przedmiotu z torby otwórz okno postaci (widać zmianę od razu)
let onEquipped: () => void = () => {}
export const setEquipHook = (f: () => void) => { onEquipped = f }

// Prawy przycisk na przedmiocie w torbie: u kupca sprzedaj, poza tym załóż / użyj
export function rightClickInv(s: GameState, idx: number): Res {
  const h = s.hero
  const it = h.inv[idx]
  if (!it) return null
  if (canSell(s)) return sell(s, idx)
  if (it.food) { const e = useItem(s, idx); stats(h); if (!e) uiSound(it.food.kind === 'drink' ? 'ui.drink' : 'ui.eat', 300); return e ? err(e) : { msg: `${it.name}: Well Fed`, color: '#40ff40' } }
  if (it.bagSize || it.slot) { const e = equipFromInv(h, idx); if (!e) { itemDrop(it); if (it.slot) onEquipped() } return err(e) }
  if (s.where !== 'field') return err('Open the Vendor tab to sell items.')
  return null
}

export function rightClickEquip(s: GameState, slot: EquipSlot): Res {
  const it = s.hero.equip[slot]
  const e = unequip(s.hero, slot)
  if (!e && it) itemDrop(it)
  return err(e)
}

export function dropItem(s: GameState, src: DragSrc, target: string | null): Res {
  const h = s.hero
  if (!target || target === 'outside') return null
  let [kind, arg] = target.split(':')
  // upuszczenie na ikonę plecaka = pierwsze wolne miejsce w plecaku
  if (kind === 'bag' && arg === '-1') {
    const free = h.inv.slice(0, 16).findIndex((x) => !x)
    if (free < 0) return err('Your backpack is full.')
    kind = 'inv'; arg = String(free)
  }
  if (src.k === 'inv') {
    const it = h.inv[src.idx]
    if (!it) return null
    if (kind === 'inv') { moveInv(h, src.idx, Number(arg)); return null }
    if (kind === 'vendor') return canSell(s) ? sell(s, src.idx) : err('You can only sell to a vendor in town.')
    if (kind === 'eq' && isSlot(arg)) {
      if (!fitsSlot(it, arg)) return err('That doesn\'t go in that slot.')
      if (!canWear(h, it)) return err('You can\'t use that.')
      return err(equipFromInv(h, src.idx, arg))
    }
    if (kind === 'bag') {
      const i = Number(arg)
      if (it.bagSize && !h.bags[i]) return err(equipBagAt(h, src.idx, i))
      if (!h.bags[i]) return err('That is not a bag.')
      const start = bagStart(h, i)
      const free = segmentsOf(h)[i + 1].findIndex((x) => !x)
      if (free < 0) return err('That bag is full.')
      moveInv(h, src.idx, start + free)
      return null
    }
  }
  if (src.k === 'eq' && isSlot(src.slot)) {
    const slot = src.slot as EquipSlot
    if (kind === 'inv') return err(unequipTo(h, slot, Number(arg)))
    if (kind === 'eq' && isSlot(arg) && arg !== slot) {
      const a = h.equip[slot], b = h.equip[arg]
      if (a && fitsSlot(a, arg) && (!b || fitsSlot(b, slot))) { h.equip[arg] = a; if (b) h.equip[slot] = b; else delete h.equip[slot] }
      return null
    }
    if (kind === 'bag') {
      const i = Number(arg)
      if (!h.bags[i]) return err('There is no bag there.')
      const free = segmentsOf(h)[i + 1].findIndex((x) => !x)
      if (free < 0) return err('That bag is full.')
      return err(unequipTo(h, slot, bagStart(h, i) + free))
    }
  }
  if (src.k === 'bag') {
    if (kind === 'inv') { const e = unequipBag(h, src.i, Number(arg)); return e ? err(e) : { msg: 'Bag removed.', color: '#ffffff' } }
    if (kind === 'bag') { moveBag(h, src.i, Number(arg)); return null }
    if (kind === 'vendor') return err('Remove the bag first (drag it into another bag).')
  }
  return null
}
