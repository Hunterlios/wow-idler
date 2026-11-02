// Umiejętność broni jak w WoW Classic: każdy typ broni ma własny poziom (limit = poziom postaci × 5),
// rośnie od trafień tą bronią. Obrona wroga = jego poziom × 5. Różnica decyduje o chybieniach,
// unikach, parowaniach i ciosach ześlizgujących się (glancing blow). Specjalizacje rasowe dają +5.
import { classById } from '../data/classes'
import { raceById } from '../data/races'
import type { Hero, Item } from './types'
import type { Rng } from './rng'

export const skillCap = (level: number) => level * 5

// Broń używana do ataku (null = forma zwierzęcia druida / walka bez broni: zawsze pełna umiejętność)
export function weaponUsed(h: Hero, ranged: boolean): Item | null {
  if (h.cls === 'druid' && (h.form === 'bear' || h.form === 'cat')) return null
  const w = ranged || (h.cls === 'hunter' && !h.equip.mainhand) ? h.equip.ranged ?? h.equip.mainhand : h.equip.mainhand
  if (!w?.weaponType || !w.dps || w.dur === 0) return null
  return w
}
export const racialBonus = (h: Hero, type: string) => raceById(h.race).wspec?.[type] ?? 0
export function baseSkill(h: Hero, type: string) {
  return Math.min(skillCap(h.level), h.wskill?.[type] ?? skillCap(h.level))
}
// Umiejętność do walki: { typ broni, bazowa, z bonusem rasowym, limit }
export function skillOf(h: Hero, ranged: boolean) {
  const cap = skillCap(h.level)
  const w = weaponUsed(h, ranged)
  if (!w) return { type: null as string | null, base: cap, eff: cap, cap }
  const base = baseSkill(h, w.weaponType!)
  return { type: w.weaponType!, base, eff: base + racialBonus(h, w.weaponType!), cap }
}

export type Table = { miss: number; dodge: number; parry: number; glance: number; glanceMul: number; crit: number }
// Tabela ataku przeciw wrogowi danego poziomu (ranged: strzały łowcy, white: zwykły atak bronią)
export function attackTable(h: Hero, mobLvl: number, ranged: boolean, white: boolean, hit = 0, stunned = false): Table {
  const sk = skillOf(h, ranged)
  const def = mobLvl * 5
  const diff = def - sk.eff
  let miss = diff > 10 ? 0.07 + (diff - 10) * 0.004 : diff >= 0 ? 0.05 + diff * 0.001 : 0.05 + diff * 0.0004
  miss = Math.max(0, miss - hit)
  const dodge = stunned ? 0 : Math.max(0, 0.05 + diff * 0.001)
  const parry = stunned || ranged ? 0 : Math.max(0, diff > 10 ? 0.05 + diff * 0.006 : 0.05 + diff * 0.001)
  const glance = white && !ranged ? Math.max(0, 0.1 + (def - Math.min(sk.eff, sk.cap)) * 0.02) : 0
  const glanceMul = 1 - Math.min(0.6, Math.max(0.05, 0.15 + (diff - 10) * 0.04))
  return { miss, dodge, parry, glance, glanceMul, crit: -diff * 0.0004 }
}

// Szansa na wzrost umiejętności przy ataku: tym większa, im dalej do limitu
export function trySkillUp(h: Hero, ranged: boolean, rng: Rng): { type: string; skill: number } | null {
  const sk = skillOf(h, ranged)
  if (!sk.type || sk.base >= sk.cap) return null
  const p = Math.min(1, Math.max(0.015, (1.5 * (sk.cap - sk.base)) / sk.cap))
  if (!rng.chance(p)) return null
  h.wskill[sk.type] = sk.base + 1
  return { type: sk.type, skill: sk.base + 1 }
}

// Typy broni z umiejętnością do pokazania w oknie postaci
export function skillRows(h: Hero) {
  const cap = skillCap(h.level)
  const types = h.weaponSkills.filter((w) => classById(h.cls).skills.includes(w))
  return types.map((t) => ({ type: t, base: baseSkill(h, t), bonus: racialBonus(h, t), cap }))
}
