// Generator łupów w stylu Classica: szare śmieci, białe, zielone z sufiksami "of the Bear/Eagle/...",
// niebieskie i (rzadko) fioletowe; pełny zestaw slotów okna postaci; torby.
import { classById, type ArmorType, type ClassId } from '../data/classes'
import type { Stats } from '../data/races'
import type { MobType } from '../data/zones'
import type { EquipSlot, Hero, Item, ItemSlot, Rarity } from './types'
import type { Rng } from './rng'

const TIER = (ilvl: number) => Math.min(4, Math.floor(ilvl / 12))
const MATERIAL: Record<ArmorType, string[]> = {
  cloth: ['Linen', 'Woolen', 'Silk', 'Mageweave', 'Runecloth'],
  leather: ['Rawhide', 'Light Leather', 'Heavy Leather', 'Thick Leather', 'Rugged Leather'],
  mail: ['Chain', 'Bronze Chain', 'Iron Chain', 'Mithril Chain', 'Thorium Chain'],
  plate: ['Copper', 'Iron', 'Steel', 'Mithril', 'Thorium'],
}
type ArmorSlot = 'head' | 'shoulder' | 'chest' | 'wrist' | 'hands' | 'waist' | 'legs' | 'feet'
const NOUN: Record<ArmorType, Record<ArmorSlot, string>> = {
  cloth: { head: 'Hood', shoulder: 'Mantle', chest: 'Robe', wrist: 'Bracers', hands: 'Gloves', waist: 'Sash', legs: 'Pants', feet: 'Shoes' },
  leather: { head: 'Cap', shoulder: 'Shoulderpads', chest: 'Tunic', wrist: 'Bracers', hands: 'Gloves', waist: 'Belt', legs: 'Pants', feet: 'Boots' },
  mail: { head: 'Coif', shoulder: 'Pauldrons', chest: 'Hauberk', wrist: 'Bracers', hands: 'Gauntlets', waist: 'Girdle', legs: 'Leggings', feet: 'Boots' },
  plate: { head: 'Helm', shoulder: 'Pauldrons', chest: 'Breastplate', wrist: 'Bracers', hands: 'Gauntlets', waist: 'Waistband', legs: 'Legplates', feet: 'Sabatons' },
}
const ARMOR_K: Record<ArmorType, number> = { cloth: 1, leather: 2, mail: 4, plate: 7 }
const SLOT_K: Record<ItemSlot, number> = {
  chest: 1, legs: 0.9, head: 0.8, shoulder: 0.75, feet: 0.7, hands: 0.6, waist: 0.55, wrist: 0.45, back: 0.5,
  neck: 0.55, finger: 0.55, trinket: 0.6, mainhand: 1, twohand: 1.4, offhand: 0.6, ranged: 0.7, shirt: 0, tabard: 0,
}
const RAR_K = [0.7, 0.9, 1, 1.15, 1.3]
export const WEAPON_SPEED: Record<string, number> = {
  Dagger: 1.8, Sword: 2.5, Axe: 2.6, Mace: 2.7, Greatsword: 3.4, Greataxe: 3.5, Maul: 3.6, Staff: 3.0,
  Bow: 2.8, Gun: 2.8, Crossbow: 3.0, Wand: 1.6, Thrown: 2.0,
}
const TWO = new Set(['Greatsword', 'Greataxe', 'Maul', 'Staff'])
const WEAPON_TIER = ['Worn', 'Sharp', 'Tempered', 'Heavy', 'Masterwork']
const RARE_PREFIX = ['Glimmering', 'Robust', 'Ornate', 'Runed', 'Brilliant', 'Sturdy', 'Ancient', 'Enchanted']
const EPIC_PREFIX = ['Sunforged', 'Stormforged', 'Starforged', 'Duskforged', 'Titanic']
const JEWEL_NOUN: Record<'neck' | 'finger' | 'trinket' | 'back' | 'offhand', string[]> = {
  neck: ['Pendant', 'Choker', 'Amulet', 'Necklace'],
  finger: ['Ring', 'Band', 'Signet', 'Loop'],
  trinket: ['Charm', 'Idol', 'Talisman', 'Figurine'],
  back: ['Cloak', 'Cape', 'Mantle'],
  offhand: ['Orb', 'Tome', 'Lantern'],
}
const JEWEL_MAT = ['Copper', 'Silver', 'Jade', 'Moonstone', 'Truesilver']

type K = keyof Stats
export const SUFFIXES: [string, K[]][] = [
  ['of the Bear', ['str', 'sta']], ['of the Eagle', ['sta', 'int']], ['of the Monkey', ['agi', 'sta']], ['of the Owl', ['int', 'spi']],
  ['of the Tiger', ['str', 'agi']], ['of the Whale', ['sta', 'spi']], ['of the Gorilla', ['str', 'int']], ['of the Boar', ['str', 'spi']],
  ['of the Falcon', ['agi', 'int']], ['of the Wolf', ['agi', 'spi']], ['of Strength', ['str']], ['of Agility', ['agi']],
  ['of Stamina', ['sta']], ['of Intellect', ['int']], ['of Spirit', ['spi']],
]

export const JUNK: Record<string, string[]> = {
  beast: ['Broken Fang', 'Chipped Claw', 'Ruined Pelt', 'Matted Fur'],
  cat: ['Broken Fang', 'Torn Pelt', 'Sharp Claw'],
  boar: ['Cracked Tusk', 'Coarse Hide', 'Boar Ribs'],
  raptor: ['Raptor Talon', 'Shredded Scale'],
  humanoid: ['Tattered Cloth', 'Cracked Pottery', 'Bent Spoon', 'Torn Map'],
  small: ['Large Candle', 'Dirty Rag', 'Rusty Gear'],
  murloc: ['Slimy Scale', 'Murloc Fin', 'Murky Pearl Fragment'],
  undead: ['Bone Fragments', 'Grave Dust', 'Rotting Flesh'],
  spider: ['Gooey Spider Leg', 'Silken Thread Scrap', 'Venom Sac'],
  flyer: ['Ragged Feather', 'Broken Talon', 'Beak Shard'],
  elemental: ['Glowing Shard', 'Elemental Dust', 'Cracked Core'],
  dragon: ['Charred Scale', 'Whelp Claw'],
  giant: ['Heavy Bone', 'Crude Trinket', 'Big Toenail'],
  insect: ['Cracked Carapace', 'Stinger Fragment', 'Chitin Shard'],
}

export const BAGS_FOR_SALE: { name: string; size: number; price: number }[] = [
  { name: 'Small Brown Pouch', size: 6, price: 500 },
  { name: 'Brown Leather Satchel', size: 8, price: 2500 },
  { name: 'Heavy Brown Bag', size: 10, price: 10000 },
  { name: 'Mageweave Bag', size: 12, price: 40000 },
  { name: 'Runecloth Bag', size: 14, price: 100000 },
]

export const armorFor = (cls: ClassId, lvl: number) => classById(cls).armor(lvl)

function rollRarity(rng: Rng): Rarity {
  const r = rng.next()
  if (r < 0.0015) return 4
  if (r < 0.045) return 3
  if (r < 0.45) return 2
  return 1
}

const GEAR_SLOTS: ItemSlot[] = ['chest', 'legs', 'head', 'shoulder', 'hands', 'feet', 'wrist', 'waist', 'back', 'mainhand', 'mainhand', 'neck', 'finger', 'trinket', 'offhand', 'ranged']

export function makeGear(rng: Rng, seq: number, hero: Hero, ilvlIn: number, forced?: Rarity): Item {
  const cls = classById(hero.cls)
  let slot = rng.pick(GEAR_SLOTS)
  if (slot === 'offhand' && !cls.weapons.off.length) slot = 'mainhand'
  if (slot === 'ranged' && !cls.weapons.ranged.length) slot = 'mainhand'
  if (slot === 'mainhand' && cls.weapons.two.length && rng.chance(cls.style === 'caster' ? 0.6 : 0.35)) slot = 'twohand'
  let rarity = forced ?? rollRarity(rng)
  if ((slot === 'neck' || slot === 'finger' || slot === 'trinket') && rarity < 2) rarity = 2 // biżuteria tylko z bonusami
  const ilvl = Math.max(1, ilvlIn + (rarity >= 3 ? 2 : 0) + (rarity === 4 ? 3 : 0))
  const item: Item = { id: seq, name: '', rarity, ilvl, value: 0, slot }
  let name: string
  if (slot === 'mainhand' || slot === 'twohand' || slot === 'ranged' || (slot === 'offhand' && rng.chance(0.5) && cls.weapons.off.includes('Shield'))) {
    const pool = slot === 'mainhand' ? cls.weapons.main : slot === 'twohand' ? cls.weapons.two : slot === 'ranged' ? cls.weapons.ranged : ['Shield']
    const wt = rng.pick(pool)
    item.weaponType = wt
    if (wt === 'Shield') {
      item.armor = Math.round((20 + ilvl * 9) * RAR_K[rarity])
      name = `${MATERIAL.plate[TIER(ilvl)]} Shield`
    } else {
      item.speed = WEAPON_SPEED[wt] ?? 2.5
      item.dps = Math.round((1.6 + 0.55 * ilvl) * RAR_K[rarity] * (TWO.has(wt) ? 1.3 : 1) * 10) / 10
      name = `${WEAPON_TIER[TIER(ilvl)]} ${wt}`
    }
  } else if (slot === 'neck' || slot === 'finger' || slot === 'trinket' || slot === 'offhand') {
    item.weaponType = slot === 'offhand' ? 'Orb' : undefined
    name = `${JEWEL_MAT[TIER(ilvl)]} ${rng.pick(JEWEL_NOUN[slot])}`
  } else if (slot === 'back') {
    item.armor = Math.round(3 + ilvl * 1.1 * RAR_K[rarity])
    name = `${MATERIAL.cloth[TIER(ilvl)]} ${rng.pick(JEWEL_NOUN.back)}`
  } else {
    const at = armorFor(hero.cls, ilvl)
    item.armorType = at
    item.armor = Math.round(5 + ARMOR_K[at] * ilvl * SLOT_K[slot] * RAR_K[rarity])
    name = `${MATERIAL[at][TIER(ilvl)]} ${NOUN[at][slot as ArmorSlot]}`
  }
  if (rarity >= 2) {
    let suffix = rng.pick(SUFFIXES)
    if (rng.chance(0.5)) {
      const w = cls.weights
      const scored = SUFFIXES.map((s) => [s, s[1].reduce((a, k) => a + (w[k] ?? 0), 0) / s[1].length] as const).sort((a, b) => b[1] - a[1])
      suffix = rng.pick(scored.slice(0, 4))[0]
    }
    const budget = Math.max(1, ilvl * 0.45 * SLOT_K[slot] * (rarity === 2 ? 1 : rarity === 3 ? 1.35 : 1.7) * (slot === 'twohand' ? 1 : 1))
    item.stats = {}
    suffix[1].forEach((k, i) => (item.stats![k] = Math.max(1, Math.round((budget / suffix[1].length) * (i === 0 ? 1.1 : 0.9)))))
    if (rarity === 2) name = `${name} ${suffix[0]}`
    else name = `${rng.pick(rarity === 3 ? RARE_PREFIX : EPIC_PREFIX)} ${name}`
  }
  item.name = name
  item.value = Math.round((ilvl * ilvl * 0.15 + 5) * [0.5, 1, 2.5, 5, 12][rarity])
  return item
}

export function makeJunk(rng: Rng, seq: number, mobType: MobType, mobLvl: number): Item {
  const list = JUNK[mobType] ?? JUNK.beast
  return { id: seq, name: rng.pick(list), rarity: 0, ilvl: mobLvl, value: Math.round(mobLvl * mobLvl * 0.09 + 3 + rng.int(0, mobLvl)) }
}

export function makeBag(seq: number, size: number, name?: string): Item {
  const b = BAGS_FOR_SALE.find((x) => x.size === size)
  return { id: seq, name: name ?? b?.name ?? `${size} Slot Bag`, rarity: 1, ilvl: size * 4, value: Math.round((b?.price ?? 400) / 4), bagSize: size }
}

export function itemScore(hero: Hero, it: Item | undefined) {
  if (!it) return 0
  const c = classById(hero.cls)
  const w = c.weights
  let s = 0
  for (const [k, v] of Object.entries(it.stats ?? {})) s += (w[k as K] ?? 0) * (v ?? 0)
  s += (w.armor ?? 0.01) * (it.armor ?? 0)
  // DPS liczy się tylko w broni, której klasa realnie używa do białych ataków
  const usesRanged = c.id === 'hunter'
  const isRanged = it.slot === 'ranged'
  if (it.dps) s += (usesRanged === isRanged ? w.dps ?? 1 : 1) * it.dps
  return s
}

export function canWear(hero: Hero, it: Item) {
  if (!it.slot) return false
  const c = classById(hero.cls)
  if (it.armorType) {
    const order: ArmorType[] = ['cloth', 'leather', 'mail', 'plate']
    return order.indexOf(it.armorType) <= order.indexOf(armorFor(hero.cls, hero.level))
  }
  if (it.slot === 'mainhand') return !it.weaponType || c.weapons.main.includes(it.weaponType)
  if (it.slot === 'twohand') return !!it.weaponType && c.weapons.two.includes(it.weaponType)
  if (it.slot === 'ranged') return !!it.weaponType && c.weapons.ranged.includes(it.weaponType)
  if (it.slot === 'offhand') return !!it.weaponType && c.weapons.off.includes(it.weaponType)
  return true
}

// Do którego slotu trafi przedmiot (pierścienie / błyskotki: wolny albo słabszy)
export function targetSlot(hero: Hero, it: Item): EquipSlot | null {
  if (!it.slot) return null
  if (it.slot === 'finger' || it.slot === 'trinket') {
    const a = `${it.slot}1` as EquipSlot, b = `${it.slot}2` as EquipSlot
    if (!hero.equip[a]) return a
    if (!hero.equip[b]) return b
    return itemScore(hero, hero.equip[a]) <= itemScore(hero, hero.equip[b]) ? a : b
  }
  if (it.slot === 'twohand') return 'mainhand'
  return it.slot as EquipSlot
}

// Wartość tego, co przedmiot by wyparł (dla broni dwuręcznej: ręka główna + druga)
export function displacedScore(hero: Hero, it: Item) {
  const t = targetSlot(hero, it)
  if (!t) return 0
  let s = itemScore(hero, hero.equip[t])
  if (it.slot === 'twohand') s += itemScore(hero, hero.equip.offhand)
  if (it.slot === 'offhand' && hero.equip.mainhand?.slot === 'twohand') s += itemScore(hero, hero.equip.mainhand)
  return s
}

export function starterGear(hero: Hero): Item[] {
  const c = classById(hero.cls)
  const at = armorFor(hero.cls, 1)
  const two = c.style === 'caster' && c.weapons.two.length
  const wt = two ? c.weapons.two[0] : c.weapons.main[0]
  const out: Item[] = [
    { id: 1, name: `Worn ${wt}`, rarity: 1, ilvl: 1, value: 4, slot: two ? 'twohand' : 'mainhand', weaponType: wt, speed: WEAPON_SPEED[wt] ?? 2.5, dps: 2.2 },
    { id: 2, name: `Recruit's ${NOUN[at].chest}`, rarity: 1, ilvl: 1, value: 1, slot: 'chest', armorType: at, armor: Math.round(3 + ARMOR_K[at]) },
    { id: 3, name: `Recruit's ${NOUN[at].legs}`, rarity: 1, ilvl: 1, value: 1, slot: 'legs', armorType: at, armor: Math.round(2 + ARMOR_K[at]) },
    { id: 4, name: `Recruit's ${NOUN[at].feet}`, rarity: 1, ilvl: 1, value: 1, slot: 'feet', armorType: at, armor: Math.round(1 + ARMOR_K[at] * 0.5) },
    { id: 5, name: "Recruit's Shirt", rarity: 1, ilvl: 1, value: 1, slot: 'shirt' },
  ]
  if (c.id === 'hunter') out.push({ id: 6, name: 'Worn Shortbow', rarity: 1, ilvl: 1, value: 3, slot: 'ranged', weaponType: 'Bow', speed: 2.8, dps: 2.4 })
  return out
}

export const slotOfEquipped = (s: EquipSlot) => s
