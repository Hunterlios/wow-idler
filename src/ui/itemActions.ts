// Akcje na przedmiotach z interfejsu: prawy przycisk i przeciąganie
import { equipFromInv, equipBagAt, fitsSlot, isSlot, moveBag, moveInv, segmentsOf, bagStart, unequip, unequipBag, unequipTo } from '../game/inventory'
import { canWear } from '../game/items'
import { sellAt } from '../game/town'
import { useItem, stats } from '../game/sim'
import { syncQuests } from '../game/quests'
import { formatMoney } from '../game/formulas'
import type { EquipSlot, GameState } from '../game/types'
import type { DragSrc } from './dnd'

type Res = { msg: string; color?: string } | null
const money = (c: number) => { const m = formatMoney(c); return [m.g && `${m.g} g`, m.s && `${m.s} s`, (m.c || (!m.g && !m.s)) && `${m.c} c`].filter(Boolean).join(' ') }
const err = (e: string | null): Res => (e ? { msg: e, color: '#ff4040' } : null)

function sell(s: GameState, idx: number): Res {
  const it = s.hero.inv[idx]
  if (!it) return null
  if (it.quest) return err('Przedmiotów zadania nie można sprzedać.')
  const v = sellAt(s, idx)
  syncQuests(s)
  return { msg: `Sprzedano ${it.name}${(it.count ?? 1) > 1 ? ` ×${it.count}` : ''} za ${money(v)} (odkupisz w zakładce Odkup)`, color: '#ffffff' }
}

// Prawy przycisk na przedmiocie w torbie: u kupca sprzedaj, w polu załóż / użyj
export function rightClickInv(s: GameState, idx: number): Res {
  const h = s.hero
  const it = h.inv[idx]
  if (!it) return null
  if (s.where !== 'field') return sell(s, idx)
  if (it.food) { const e = useItem(s, idx); stats(h); return e ? err(e) : { msg: `${it.name}: Well Fed`, color: '#40ff40' } }
  if (it.bagSize || it.slot) return err(equipFromInv(h, idx))
  return null
}

export function rightClickEquip(s: GameState, slot: EquipSlot): Res {
  return err(unequip(s.hero, slot))
}

export function dropItem(s: GameState, src: DragSrc, target: string | null): Res {
  const h = s.hero
  if (!target || target === 'outside') return null
  let [kind, arg] = target.split(':')
  // upuszczenie na ikonę plecaka = pierwsze wolne miejsce w plecaku
  if (kind === 'bag' && arg === '-1') {
    const free = h.inv.slice(0, 16).findIndex((x) => !x)
    if (free < 0) return err('Plecak jest pełny.')
    kind = 'inv'; arg = String(free)
  }
  if (src.k === 'inv') {
    const it = h.inv[src.idx]
    if (!it) return null
    if (kind === 'inv') { moveInv(h, src.idx, Number(arg)); return null }
    if (kind === 'vendor') return s.where !== 'field' ? sell(s, src.idx) : err('Sprzedasz tylko u kupca w mieście.')
    if (kind === 'eq' && isSlot(arg)) {
      if (!fitsSlot(it, arg)) return err('To nie pasuje do tego miejsca.')
      if (!canWear(h, it)) return err('Nie możesz tego używać.')
      return err(equipFromInv(h, src.idx, arg))
    }
    if (kind === 'bag') {
      const i = Number(arg)
      if (it.bagSize && !h.bags[i]) return err(equipBagAt(h, src.idx, i))
      if (!h.bags[i]) return err('To nie jest torba.')
      const start = bagStart(h, i)
      const free = segmentsOf(h)[i + 1].findIndex((x) => !x)
      if (free < 0) return err('Ta torba jest pełna.')
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
      if (!h.bags[i]) return err('Brak torby w tym miejscu.')
      const free = segmentsOf(h)[i + 1].findIndex((x) => !x)
      if (free < 0) return err('Ta torba jest pełna.')
      return err(unequipTo(h, slot, bagStart(h, i) + free))
    }
  }
  if (src.k === 'bag') {
    if (kind === 'inv') { const e = unequipBag(h, src.i, Number(arg)); return e ? err(e) : { msg: 'Torba zdjęta.', color: '#ffffff' } }
    if (kind === 'bag') { moveBag(h, src.i, Number(arg)); return null }
    if (kind === 'vendor') return err('Najpierw zdejmij torbę (przeciągnij ją do innej torby).')
  }
  return null
}
