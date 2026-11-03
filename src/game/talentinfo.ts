// Dokładne działanie talentów: opis liczony z efektów (fx), żeby punkty zawsze odpowiadały temu, co talent daje.
import { classById, type ClassId } from '../data/classes'
import type { Talent } from '../data/talents'

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`
const SIGNED = (v: number) => (v >= 0 ? `+${pct(v)}` : `−${pct(-v)}`)
const STAT: Record<string, string> = { str: 'Strength', agi: 'Agility', sta: 'Stamina', int: 'Intellect', allstat: 'all attributes' }
const SCHOOL: Record<string, string> = { holy: 'Holy', fire: 'Fire', frost: 'Frost', arcane: 'Arcane', shadow: 'Shadow', nature: 'Nature', physical: 'Physical' }

export function fxText(cls: ClassId, key: string, v: number): string {
  const ab = (id: string) => classById(cls).abilities.find((a) => a.id === id)?.name ?? id
  const m = /^(ab|cd|cast|school):(.+)$/.exec(key)
  if (m) {
    const [, kind, id] = m
    if (kind === 'school') return `${SIGNED(v)} ${SCHOOL[id] ?? id} damage`
    if (kind === 'cd') return `−${Math.round(v * 10) / 10} s cooldown of ${ab(id)}`
    if (kind === 'cast') return id === 'all' ? `−${pct(v)} cast time of all spells` : `−${pct(v)} cast time of ${ab(id)}`
    const a = classById(cls).abilities.find((x) => x.id === id)
    const what = !a ? id : a.kind === 'heal' || a.kind === 'hot' ? 'healing' : a.kind === 'lifetap' ? 'mana gained' : a.kind === 'buff' ? 'effect' : a.tick ? 'effect' : 'damage'
    return `${SIGNED(v)} ${ab(id)} ${what}`
  }
  if (STAT[key]) return `${SIGNED(v)} ${STAT[key]}`
  switch (key) {
    case 'dodge': return `${SIGNED(v)} dodge chance`
    case 'crit': return `${SIGNED(v)} critical strike chance`
    case 'spellCrit': return `${SIGNED(v)} spell critical strike chance`
    case 'hit': return `${SIGNED(v)} chance to hit`
    case 'haste': return `${SIGNED(v)} attack and casting speed`
    case 'dr': return `${pct(v)} less damage taken`
    case 'armor': return `${SIGNED(v)} armor`
    case 'hp': return `${SIGNED(v)} maximum health`
    case 'ap': return `${SIGNED(v)} attack power`
    case 'heal': return `${SIGNED(v)} healing done`
    case 'cost': return `${pct(v)} lower cost of abilities`
    case 'regen': return `${pct(v)} of mana regeneration continues while casting`
    case 'resGen': return `${SIGNED(v)} rage generated`
    case 'energy': return `${SIGNED(v)} energy regeneration`
    case 'dot': return `${SIGNED(v)} damage over time`
    case 'meleeDmg': return `${SIGNED(v)} physical damage`
    case 'spellDmg': return `${SIGNED(v)} spell damage`
    case 'dmg': return `${SIGNED(v)} all damage`
    case 'critDmg': return `${SIGNED(v)} critical strike damage bonus`
    case 'pushback': return `${pct(v)} less spell pushback when hit`
    case 'pet': return `${SIGNED(v)} pet damage`
    case 'aoe': return `${SIGNED(v)} area damage`
    case 'lonewolf': return `${SIGNED(v)} damage while you fight without a pet`
    case 'shield': return `${SIGNED(v)} absorption of your shields`
    case 'lifesteal': return `${pct(v)} of Shadow damage dealt returned as health`
    case 'overload': return `${pct(v)} chance for Lightning Bolt / Chain Lightning to strike again for 50%`
    case 'travel': return `${SIGNED(v)} travel form speed`
    case 'intAp': return `${pct(v)} of Intellect added as attack power`
    case 'intSp': return `${pct(v)} of Intellect added as spell power`
    case 'spiSp': return `${pct(v)} of Spirit added as spell power`
    case 'mw': return `${pct(v * 0.06)} chance per melee hit to gain a Maelstrom Weapon charge`
    case 'dotCrit': return 'your damage over time effects can critically hit'
  }
  return `${key} ${v}`
}

// Linie efektu dla danego rangu (0 = jeszcze nic)
export function talentLines(cls: ClassId, t: Talent, rank: number) {
  return t.fx.map(([k, v]) => fxText(cls, k, k === 'dotCrit' ? 1 : v * rank))
}
// Czy opis talentu to tylko liczby (wtedy zastępuje go wyliczony efekt)
export function talentInfo(cls: ClassId, t: Talent, rank: number) {
  const per = t.fx.length ? talentLines(cls, t, 1) : []
  const now = rank > 0 && t.max > 1 ? talentLines(cls, t, rank) : []
  const next = rank < t.max && rank > 0 ? talentLines(cls, t, rank + 1) : []
  const full = t.max > 1 ? talentLines(cls, t, t.max) : []
  return { per, now, next, full }
}
