// Wzory: tabela doświadczenia z vanilli + uproszczone statystyki do idlera (talenty, formy, buffy).
import { classById, type Ability, type BuffFx, type Resource, type School } from '../data/classes'
import { raceById, type Stats } from '../data/races'
import { talentFx, talentGrants } from '../data/talents'
import type { Hero } from './types'

export const MAX_LEVEL = 60

// Vanilla: XP = round((8*CL + Diff(CL)) * MXP(CL), do setek), MXP = 45 + 5*CL
const diff = (l: number) => (l <= 28 ? 0 : l === 29 ? 1 : l === 30 ? 3 : l === 31 ? 6 : 5 * (l - 30))
export const xpToNext = (l: number) => (l >= MAX_LEVEL ? 0 : Math.round(((8 * l + diff(l)) * (45 + 5 * l)) / 100) * 100)

const zd = (l: number) => (l < 8 ? 5 : l < 10 ? 6 : l < 12 ? 7 : l < 16 ? 8 : l < 20 ? 9 : l < 30 ? 11 : l < 40 ? 12 : l < 45 ? 13 : l < 50 ? 14 : l < 55 ? 15 : 16)
export const grayLevel = (l: number) => (l <= 5 ? 0 : l <= 39 ? l - Math.floor(l / 10) - 5 : l - Math.floor(l / 5) - 1)
export function mobXp(mobLvl: number, heroLvl: number) {
  if (heroLvl >= MAX_LEVEL) return 0
  const base = 45 + 5 * mobLvl
  if (mobLvl <= grayLevel(heroLvl)) return 0
  if (mobLvl >= heroLvl) return Math.round(base * (1 + 0.05 * Math.min(4, mobLvl - heroLvl)))
  return Math.max(1, Math.round(base * (1 - (heroLvl - mobLvl) / zd(heroLvl))))
}

export const basePower = (l: number) => 9 + 6.5 * l

export function mobStats(lvl: number) {
  return { hp: Math.round(30 + 14 * lvl + 0.95 * lvl * lvl), dmg: 1.5 + 1.25 * lvl + 0.022 * lvl * lvl, speed: 2 }
}

// ---------------------------------------------------------------- dostępne umiejętności
export function grants(h: Hero) { return talentGrants(h.cls, h.talents ?? {}) }
export function knows(h: Hero, a: Ability, g = grants(h)) {
  return a.talent ? g.has(a.id) : (h.trained[a.id] ?? 0) > 0
}
export function formOk(h: Hero, a: Ability) {
  if (h.cls !== 'druid' || a.kind === 'form') return true
  if (a.forms) return a.forms.includes(h.form) || (a.forms.includes('caster') && h.form === 'moonkin')
  if (!a.form) return true
  if (a.form === 'caster') return h.form === 'caster' || h.form === 'moonkin'
  return a.form === h.form
}
// Grupy wyboru (nasycenie broni, pieczęć, aura, totem żywiołu...): aktywna tylko jedna umiejętność.
// Gracz wybiera w księdze; bez wyboru bierzemy domyślną (gprio), a przy remisie najwyższy poziom.
export function groupMembers(h: Hero, group: string, g = grants(h)) {
  return classById(h.cls).abilities.filter((a) => a.group === group && knows(h, a, g))
}
export function chosenIn(h: Hero, group: string, g = grants(h)): string | null {
  const pick = h.choice?.[group]
  if (pick === 'none') return null
  const known = groupMembers(h, group, g)
  if (pick && known.some((a) => a.id === pick)) return pick
  const best = [...known].sort((a, b) => (a.gprio ?? 50) - (b.gprio ?? 50) || b.lvl - a.lvl)[0]
  return best?.id ?? null
}
export function groupOk(h: Hero, a: Ability, g = grants(h)) {
  return !a.group || chosenIn(h, a.group, g) === a.id
}
// Umiejętność aktywna dla postaci: znana, niewyłączona, w dobrej formie i wybrana w swojej grupie
export function active(h: Hero, a: Ability, g = grants(h)) {
  return knows(h, a, g) && !h.disabled?.[a.id] && formOk(h, a) && groupOk(h, a, g)
}
export function resourceOf(h: Hero): Resource {
  if (h.cls === 'druid') return h.form === 'bear' ? 'rage' : h.form === 'cat' ? 'energy' : 'mana'
  return classById(h.cls).resource
}
export function styleOf(h: Hero): 'melee' | 'ranged' | 'caster' {
  if (h.cls === 'druid' && (h.form === 'bear' || h.form === 'cat')) return 'melee'
  return classById(h.cls).style
}
// pasywne buffy aktywne teraz: wytrenowane, niewyłączone, pasujące do formy (+ czasowe)
export function activeBuffs(h: Hero, g = grants(h)): { a: Ability; fx: BuffFx; scale: number }[] {
  const out: { a: Ability; fx: BuffFx; scale: number }[] = []
  const totems = new Set((h.totems ?? []).map((t) => t.id))
  for (const a of classById(h.cls).abilities) {
    if (!a.buff) continue
    const rank = a.talent ? h.level : h.trained[a.id] ?? h.level
    if ((a.kind === 'buff' || a.kind === 'proc') && active(h, a, g)) out.push({ a, fx: a.buff, scale: 1 + rank / 12 })
    else if (a.kind === 'totem') { if (totems.has(a.id)) out.push({ a, fx: a.buff, scale: 1 + rank / 12 }) }
    else if (a.kind !== 'buff' && a.kind !== 'proc' && (h.temp?.[a.id] ?? 0) > 0) out.push({ a, fx: a.buff, scale: 1 })
  }
  return out
}

export type Mods = Record<string, number>

export type Derived = Stats & {
  maxHp: number
  maxRes: number
  res: Resource
  ap: number
  armor: number
  crit: number
  spellCrit: number
  dodge: number
  weaponDps: number
  weaponSpeed: number
  melee: { dps: number; speed: number; ap: number } // broń do walki wręcz (łowca: ręka główna zamiast łuku)
  spellMult: number // siła rang czarów rosnąca z poziomem (jak bazowe obrażenia kolejnych rang w Classicu)
  sp: number // moc czarów: "+X do obrażeń i leczenia czarami" z przedmiotów i talentów
  haste: number
  m: Mods // talenty + buffy: dmg, meleeDmg, spellDmg, school:*, ab:*, heal, cost, pet, regen, resGen, critDmg, dot, aoe, shield, dr, lifesteal, castRegen, instant, energy, noPet, shadow
  dr: (mobLvl: number) => number
}

const FLAT_SCALED = new Set(['ap', 'sta', 'int', 'spi', 'all', 'str', 'agi', 'sp'])

export function derive(h: Hero): Derived {
  const r = raceById(h.race)
  const c = classById(h.cls)
  const L = h.level
  const g = grants(h)
  const tf = talentFx(h.cls, h.talents ?? {})
  const m: Mods = { ...tf }
  const flat = { ap: 0, sta: 0, int: 0, spi: 0, all: 0, str: 0, agi: 0, sp: 0 }
  let armorPct = tf.armor ?? 0
  let allPct = 0
  const apply = (fx: BuffFx, scale: number) => {
    for (const [k, v] of Object.entries(fx)) {
      if (v == null) continue
      if (FLAT_SCALED.has(k)) flat[k as keyof typeof flat] += v * scale
      else if (k === 'armor') armorPct += v
      else if (k === 'allPct') allPct += v
      else if (k === 'shadow') m['school:shadow'] = (m['school:shadow'] ?? 0) + v
      else m[k] = (m[k] ?? 0) + v
    }
  }
  for (const { fx, scale } of activeBuffs(h, g)) apply(fx, scale)
  if (h.wellFed && h.wellFed.left > 0) apply(h.wellFed.fx, 1)
  if ((h.buffs.perception ?? 0) > 0) m.dmg = (m.dmg ?? 0) + 0.1 // Perception (człowiek)
  if (tf.lonewolf && h.cls === 'hunter' && h.disabled?.pet) m.dmg = (m.dmg ?? 0) + tf.lonewolf
  const s: Stats = { str: 0, agi: 0, sta: 0, int: 0, spi: 0 }
  for (const k of Object.keys(s) as (keyof Stats)[]) s[k] = r.base[k] + c.bonus[k] + c.growth[k] * (L - 1) + flat.all
  s.sta += flat.sta
  s.int += flat.int
  s.spi += flat.spi
  s.str += flat.str
  s.agi += flat.agi
  let gearArmor = 0
  let weaponDps = 1 + 0.35 * L
  let weaponSpeed = c.style === 'ranged' ? 2.8 : 2.4
  let gearSp = 0
  for (const it of Object.values(h.equip)) {
    if (!it || it.dur === 0) continue // zepsuty przedmiot nie daje bonusów
    for (const [k, v] of Object.entries(it.stats ?? {})) s[k as keyof Stats] += v ?? 0
    gearArmor += it.armor ?? 0
    gearSp += it.sp ?? 0
  }
  const wpn = c.id === 'hunter' ? h.equip.ranged ?? h.equip.mainhand : h.equip.mainhand
  if (wpn?.dps && wpn.dur !== 0) { weaponDps = wpn.dps; weaponSpeed = wpn.speed ?? 2.4 }
  // formy druida
  const form = h.cls === 'druid' ? h.form : 'caster'
  if (form === 'bear') { weaponDps = 1.5 + 0.78 * L; weaponSpeed = 2.5; armorPct += 1.8; s.sta *= 1.25 }
  if (form === 'cat') { weaponDps = 1.5 + 0.7 * L; weaponSpeed = 1.0; m.crit = (m.crit ?? 0) + 0.03 }
  if (form === 'moonkin') { armorPct += 3; m.spellCrit = (m.spellCrit ?? 0) + 0.03 }

  if (r.mods.spiPct) s.spi *= 1 + r.mods.spiPct
  if (r.mods.intPct) s.int *= 1 + r.mods.intPct
  const all = (tf.allstat ?? 0) + allPct
  for (const k of Object.keys(s) as (keyof Stats)[]) s[k] = Math.round(s[k] * (1 + all + (tf[k] ?? 0)))

  let maxHp = c.hp[0] + c.hp[1] * (L - 1) + Math.min(20, s.sta) + 10 * Math.max(0, s.sta - 20)
  maxHp = Math.round(maxHp * (1 + (L / 60) * 0.7) * (1 + (r.mods.hpPct ?? 0) + (tf.hp ?? 0)))
  const res = resourceOf(h)
  const maxRes = res === 'mana' && c.mana ? Math.round(c.mana[0] + c.mana[1] * (L - 1) + Math.min(20, s.int) + 15 * Math.max(0, s.int - 20)) : 100

  // Siła ataku jak w Classicu: wojownik / paladyn / szaman 2 za Strength, łotr 1 za Strength i Agility,
  // łowca (dystans) 2 za Agility, druid 2 za Strength (w formie kota też 1 za Agility), mag / kapłan / warlock 1 za Strength
  let ap = c.id === 'hunter' ? s.agi * 2 + L * 2 - 10
    : c.id === 'rogue' ? s.str + s.agi + L * 2 - 20
    : form === 'cat' ? s.str * 2 + s.agi + L * 2 - 20
    : c.id === 'druid' ? s.str * 2 - 20
    : c.id === 'mage' || c.id === 'priest' || c.id === 'warlock' ? s.str - 10
    : s.str * 2 + L * 3 - 20
  if (form === 'bear') ap += L * 6
  if (form === 'cat') ap += L * 3
  ap += flat.ap + s.int * (tf.intAp ?? 0)
  ap *= 1 + (tf.ap ?? 0)
  if ((h.buffs.bloodfury ?? 0) > 0) ap *= 1.25
  const armor = Math.round((gearArmor + s.agi * 2) * (1 + armorPct))
  const crit = 0.05 + s.agi / (c.id === 'rogue' || c.id === 'hunter' || form === 'cat' ? 29 : 20) / 100 + (m.crit ?? 0)
  const spellCrit = 0.01 + s.int / 60 / 100 + (m.spellCrit ?? 0)
  const dodge = 0.03 + s.agi / 20 / 100 + (r.mods.dodge ?? 0) + (m.dodge ?? 0)
  // Czary jak w Classicu: Intellect daje manę i krytyki czarów, a nie moc. Obrażenia rosną z rangą
  // (poziomem) i z mocą czarów z przedmiotów ("+X do obrażeń i leczenia czarami").
  const spellMult = spellRank(L)
  const sp = Math.round(gearSp + (flat as Record<string, number>).sp + s.int * (tf.intSp ?? 0) + s.spi * (tf.spiSp ?? 0))
  const haste = 1 + (m.haste ?? 0) + ((h.buffs.berserking ?? 0) > 0 ? h.stacks?.berserk ?? 0.15 : 0)
  const stoneform = (h.buffs.stoneform ?? 0) > 0 ? 0.2 : 0
  const extraDr = Math.min(0.5, (m.dr ?? 0) + stoneform + (r.mods.resist ?? 0))
  m.pushback = (m.pushback ?? 0) + (r.mods.pushback ?? 0)
  const dr = (mobLvl: number) => Math.min(0.8, armor / (armor + 400 + 85 * mobLvl) + extraDr)
  // łowca w zwarciu: broń z ręki głównej i siła ataku wręcz (Strength + Agility)
  let melee = { dps: weaponDps, speed: weaponSpeed, ap: Math.max(0, Math.round(ap)) }
  if (c.id === 'hunter') {
    const mh = h.equip.mainhand
    const ok = mh?.dps && mh.dur !== 0
    melee = { dps: ok ? mh!.dps! : 1 + 0.35 * L, speed: ok ? mh!.speed ?? 2.4 : 2.4, ap: Math.max(0, Math.round((s.str + s.agi + L * 2 - 20 + flat.ap) * (1 + (tf.ap ?? 0)))) }
  }
  return { ...s, melee, maxHp, maxRes, res, ap: Math.max(0, Math.round(ap)), armor, crit, spellCrit, dodge, weaponDps, weaponSpeed, spellMult, sp, haste, m, dr }
}

// Mnożnik obrażeń/leczenia umiejętności z talentów i buffów
export function dmgMult(d: Derived, a: { id?: string; school?: School; aoe?: boolean; kind?: string } | null, phys: boolean) {
  const m = d.m
  let x = 1 + (m.dmg ?? 0) + (phys ? m.meleeDmg ?? 0 : m.spellDmg ?? 0)
  if (a?.school) x += m[`school:${a.school}`] ?? 0
  if (a?.id) x += m[`ab:${a.id}`] ?? 0
  if (a?.kind === 'dot') x += m.dot ?? 0
  if (a?.aoe) x += m.aoe ?? 0
  return x
}

// Siła rang: w Classicu kolejne rangi czarów zadają wielokrotnie więcej (Frostbolt r1 ~20, r11 ~530),
// tu to krzywa poziomu rangi; moc czarów z przedmiotów dodaje się według współczynnika czaru.
export const spellRank = (L: number) => 1 + L / 45

// Współczynnik mocy czarów (Classic): czas rzucania / 3,5 s (natychmiastowe jak 1,5 s), DoT/HoT: czas / 15 s,
// obszarowe ok. 1/3, procki i totemy małe.
export function spCoef(a: { kind?: string; cast?: number; dur?: number; aoe?: boolean; channel?: boolean } | null, part: 'direct' | 'dot' = 'direct') {
  if (!a) return 0
  let k: number
  if (part === 'dot' || a.kind === 'dot' || a.kind === 'hot') k = Math.min(1, (a.dur ?? 12) / 15)
  else if (a.kind === 'proc') k = 0.1
  else if (a.kind === 'totem') k = 0.08
  else if (a.kind === 'shield') k = 0.1
  else if (a.kind === 'strike') k = 0.43
  else k = Math.min(3.5, Math.max(1.5, a.cast ?? 0)) / 3.5
  if (a.aoe) k /= 3
  return k
}
// Obrażenia / leczenie czaru: siła rangi + moc czarów × współczynnik
export const spellValue = (d: { spellMult: number; sp: number }, bp: number, power: number, coef: number) => bp * power * d.spellMult + d.sp * coef

export const rageConv = (l: number) => 0.0091107836 * l * l + 3.225598133 * l + 4.2652911

export function formatMoney(copper: number) {
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = Math.floor(copper % 100)
  return { g, s, c }
}
