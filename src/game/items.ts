// Generator łupów w stylu Classica: szare śmieci, białe, zielone z sufiksami "of the Bear/Eagle/...",
// niebieskie i (rzadko) fioletowe; pełny zestaw slotów okna postaci; torby.
import { classById, ONE_HAND, TWO_HAND, RANGED, type ArmorType, type ClassId } from '../data/classes'
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
  Dagger: 1.8, 'Fist Weapon': 2.0, Sword: 2.5, Axe: 2.6, Mace: 2.7, Greatsword: 3.4, Greataxe: 3.5, Maul: 3.6, Polearm: 3.4, Staff: 3.0,
  Bow: 2.8, Gun: 2.8, Crossbow: 3.0, Wand: 1.6, Thrown: 2.0,
}
const TWO = new Set(TWO_HAND)
const WEAPON_NOUN: Record<string, string> = { 'Fist Weapon': 'Claw', Polearm: 'Halberd' }
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
  const own = (pool: string[]) => pool.filter((w) => cls.skills.includes(w))
  if (slot === 'offhand' && !cls.weapons.off.length) slot = 'mainhand'
  if (slot === 'ranged' && !own(RANGED).length && rng.chance(0.6)) slot = 'mainhand'
  if (slot === 'mainhand' && rng.chance(own(TWO_HAND).length ? (cls.style === 'caster' ? 0.6 : 0.35) : 0.2)) slot = 'twohand'
  let rarity = forced ?? rollRarity(rng)
  if ((slot === 'neck' || slot === 'finger' || slot === 'trinket') && rarity < 2) rarity = 2 // biżuteria tylko z bonusami
  const ilvl = Math.max(1, ilvlIn + (rarity >= 3 ? 2 : 0) + (rarity === 4 ? 3 : 0))
  const item: Item = { id: seq, name: '', rarity, ilvl, value: 0, slot }
  let name: string
  if (slot === 'mainhand' || slot === 'twohand' || slot === 'ranged' || (slot === 'offhand' && rng.chance(0.5) && cls.weapons.off.includes('Shield'))) {
    // broń: zwykle typ, którego klasa może się nauczyć, ale czasem dowolny (jak losowe dropy w grze)
    const any = slot === 'mainhand' ? ONE_HAND : slot === 'twohand' ? TWO_HAND : slot === 'ranged' ? RANGED : ['Shield']
    const mine = slot === 'offhand' ? any : own(any)
    const pool = mine.length && rng.chance(0.6) ? mine : any
    const wt = rng.pick(pool)
    item.weaponType = wt
    if (wt === 'Shield') {
      item.armor = Math.round((20 + ilvl * 9) * RAR_K[rarity])
      name = `${MATERIAL.plate[TIER(ilvl)]} Shield`
    } else {
      item.speed = WEAPON_SPEED[wt] ?? 2.5
      item.dps = Math.round((1.6 + 0.55 * ilvl) * RAR_K[rarity] * (TWO.has(wt) ? 1.3 : 1) * 10) / 10
      name = `${WEAPON_TIER[TIER(ilvl)]} ${WEAPON_NOUN[wt] ?? wt}`
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
  // sufiksy z mocą czarów jak w Classicu: "of Sorcery" (Intellect, Stamina, moc), "of Healing" / "of ... Wrath" (sama moc)
  const spellish = (cls.weights.sp ?? 0) > 0
  if (rarity >= 2 && slot !== 'ranged' && ilvl >= 8 && rng.chance(spellish ? 0.35 : 0.06)) {
    const budget = Math.max(1, ilvl * GEAR_BUDGET * SLOT_K[slot] * (rarity === 2 ? 1 : rarity === 3 ? 1.35 : 1.7))
    const SCH: Record<string, string> = { mage: 'Fiery', warlock: 'Shadow', priest: 'Holy', druid: "Nature's", shaman: "Nature's", paladin: 'Holy' }
    const kind = rng.pick(['sorcery', 'wrath', 'healing'] as const)
    item.stats = {}
    if (kind === 'sorcery') { item.stats.int = Math.max(1, Math.round(budget * 0.35)); item.stats.sta = Math.max(1, Math.round(budget * 0.3)); item.sp = Math.max(1, Math.round(budget * 0.4)) }
    else item.sp = Math.max(1, Math.round(budget * 0.85))
    const suf = kind === 'sorcery' ? 'of Sorcery' : kind === 'healing' ? 'of Healing' : `of ${SCH[cls.id] ?? 'Arcane'} Wrath`
    if (rarity === 2) name = `${name} ${suf}`
    else name = `${rng.pick(rarity === 3 ? RARE_PREFIX : EPIC_PREFIX)} ${name}`
  } else if (rarity >= 2) {
    let suffix = rng.pick(SUFFIXES)
    if (rng.chance(0.5)) {
      const w = cls.weights
      const scored = SUFFIXES.map((s) => [s, s[1].reduce((a, k) => a + (w[k] ?? 0), 0) / s[1].length] as const).sort((a, b) => b[1] - a[1])
      suffix = rng.pick(scored.slice(0, 4))[0]
    }
    const budget = Math.max(1, ilvl * GEAR_BUDGET * SLOT_K[slot] * (rarity === 2 ? 1 : rarity === 3 ? 1.35 : 1.7) * (slot === 'twohand' ? 1 : 1))
    item.stats = {}
    suffix[1].forEach((k, i) => (item.stats![k] = Math.max(1, Math.round((budget / suffix[1].length) * (i === 0 ? 1.1 : 0.9)))))
    if (rarity === 2) name = `${name} ${suffix[0]}`
    else name = `${rng.pick(rarity === 3 ? RARE_PREFIX : EPIC_PREFIX)} ${name}`
  }
  item.name = name
  item.value = Math.round((ilvl * ilvl * 0.15 + 5) * [0.5, 1, 2.5, 5, 12][rarity])
  return item
}

// 0.9.10: ekwipunek daje wyraźnie więcej (postać bez ekwipunku ma się czuć słaba, jak w Classicu)
export const GEAR_BUDGET = 0.8
export const GEAR_RESCALE = 0.8 / 0.45

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
  let s = (w.sp ?? 0) * (it.sp ?? 0)
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
  if (it.slot === 'offhand') return !!it.weaponType && c.weapons.off.includes(it.weaponType)
  if (it.slot === 'mainhand' || it.slot === 'twohand' || it.slot === 'ranged') return !it.weaponType || (hero.weaponSkills ?? []).includes(it.weaponType)
  return true
}
// Broń, której klasa może się nauczyć, ale postać jeszcze nie umie
export const learnableWeapon = (hero: Hero, it: Item) =>
  !!it.weaponType && it.slot !== 'offhand' && classById(hero.cls).skills.includes(it.weaponType) && !(hero.weaponSkills ?? []).includes(it.weaponType)

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
  if (c.id === 'rogue') out.push({ id: 6, name: 'Small Throwing Knife', rarity: 1, ilvl: 1, value: 1, slot: 'ranged', weaponType: 'Thrown', speed: 2.0, dps: 1.8 })
  if (c.id === 'hunter') out.push({ id: 6, name: 'Worn Shortbow', rarity: 1, ilvl: 1, value: 3, slot: 'ranged', weaponType: 'Bow', speed: 2.8, dps: 2.4 })
  return out
}

export const slotOfEquipped = (s: EquipSlot) => s

// ---------------------------------------------------------------- jedzenie i picie (nazwy jak u kupców Classica)
export type FoodDef = { name: string; kind: 'food' | 'drink' | 'buff'; lvl: number; amt: number; price: number; buff?: { name: string; fx: Record<string, number>; text: string } }
export const FOODS: FoodDef[] = [
  { name: 'Tough Hunk of Bread', kind: 'food', lvl: 1, amt: 61, price: 2 },
  { name: 'Freshly Baked Bread', kind: 'food', lvl: 5, amt: 243, price: 5 },
  { name: 'Moist Cornbread', kind: 'food', lvl: 15, amt: 552, price: 15 },
  { name: 'Mulgore Spice Bread', kind: 'food', lvl: 25, amt: 874, price: 25 },
  { name: 'Soft Banana Bread', kind: 'food', lvl: 35, amt: 1392, price: 40 },
  { name: 'Homemade Cherry Pie', kind: 'food', lvl: 45, amt: 2148, price: 60 },
  { name: 'Refreshing Spring Water', kind: 'drink', lvl: 1, amt: 151, price: 2 },
  { name: 'Ice Cold Milk', kind: 'drink', lvl: 5, amt: 436, price: 5 },
  { name: 'Melon Juice', kind: 'drink', lvl: 15, amt: 835, price: 15 },
  { name: 'Sweet Nectar', kind: 'drink', lvl: 25, amt: 1344, price: 25 },
  { name: 'Moonberry Juice', kind: 'drink', lvl: 35, amt: 1992, price: 40 },
  { name: 'Morning Glory Dew', kind: 'drink', lvl: 45, amt: 2934, price: 60 },
  { name: 'Herb Baked Egg', kind: 'buff', lvl: 1, amt: 0, price: 50, buff: { name: 'Well Fed', fx: { sta: 3, spi: 3 }, text: '+3 Stamina and Spirit' } },
  { name: 'Crocolisk Steak', kind: 'buff', lvl: 15, amt: 0, price: 200, buff: { name: 'Well Fed', fx: { sta: 6, spi: 6 }, text: '+6 Stamina and Spirit' } },
  { name: 'Curiously Tasty Omelet', kind: 'buff', lvl: 25, amt: 0, price: 500, buff: { name: 'Well Fed', fx: { sta: 8, spi: 8 }, text: '+8 Stamina and Spirit' } },
  { name: 'Grilled Squid', kind: 'buff', lvl: 35, amt: 0, price: 1000, buff: { name: 'Well Fed', fx: { agi: 10 }, text: '+10 Agility' } },
  { name: 'Nightfin Soup', kind: 'buff', lvl: 35, amt: 0, price: 1000, buff: { name: 'Well Fed', fx: { castRegen: 0.1 }, text: '+10% in-combat mana regeneration' } },
  { name: 'Monster Omelet', kind: 'buff', lvl: 40, amt: 0, price: 1500, buff: { name: 'Well Fed', fx: { sta: 12, spi: 12 }, text: '+12 Stamina and Spirit' } },
  { name: 'Runn Tum Tuber Surprise', kind: 'buff', lvl: 45, amt: 0, price: 2000, buff: { name: 'Well Fed', fx: { int: 10 }, text: '+10 Intellect' } },
  { name: 'Smoked Desert Dumplings', kind: 'buff', lvl: 45, amt: 0, price: 2000, buff: { name: 'Well Fed', fx: { str: 20 }, text: '+20 Strength' } },
  { name: "Dirge's Kickin' Chimaerok Chops", kind: 'buff', lvl: 55, amt: 0, price: 4000, buff: { name: 'Well Fed', fx: { sta: 25 }, text: '+25 Stamina' } },
]
export const WELL_FED_SECS = 15 * 60

// Zestawy naprawcze (u kupca): postać sama naprawia nimi zepsute przedmioty podczas odpoczynku,
// jak je i pije. Jeden zestaw = jeden zepsuty przedmiot do pełnej wytrzymałości.
export type KitDef = { name: string; lvl: number; maxIlvl: number; price: number }
export const KITS: KitDef[] = [
  { name: 'Light Repair Kit', lvl: 1, maxIlvl: 20, price: 50 },
  { name: 'Medium Repair Kit', lvl: 15, maxIlvl: 35, price: 400 },
  { name: 'Heavy Repair Kit', lvl: 30, maxIlvl: 50, price: 1500 },
  { name: 'Thorium Repair Kit', lvl: 45, maxIlvl: 70, price: 3500 },
]
export function makeKit(seq: number, def: KitDef, count = 1): Item {
  return { id: seq, name: def.name, rarity: 1, ilvl: def.lvl, value: Math.max(1, Math.round(def.price / 4)), count, kit: def.maxIlvl }
}
export function makeFood(seq: number, def: FoodDef, count = 1): Item {
  return { id: seq, name: def.name, rarity: 1, ilvl: def.lvl, value: Math.max(1, Math.round(def.price / 4)), count, food: { kind: def.kind, lvl: def.lvl, amt: def.amt, buff: def.buff } }
}
export function makeQuestItem(seq: number, name: string, questId: string): Item {
  return { id: seq, name, rarity: 1, ilvl: 1, value: 0, quest: questId, count: 1 }
}

// ---------------------------------------------------------------- wytrzymałość i naprawa (jak w Classicu)
// Maksymalna wytrzymałość zależy od slotu i typu pancerza; biżuteria, peleryna i koszula jej nie mają.
const DUR_SLOT: Partial<Record<ItemSlot, number>> = { head: 60, shoulder: 60, chest: 100, wrist: 35, hands: 35, waist: 35, legs: 75, feet: 50, mainhand: 75, twohand: 100, ranged: 75, offhand: 60 }
const DUR_ARMOR: Record<ArmorType, number> = { cloth: 0.7, leather: 0.85, mail: 1, plate: 1.2 }
export function maxDur(it: Item): number {
  if (!it.slot) return 0
  if (it.slot === 'offhand' && it.weaponType !== 'Shield') return 0
  const base = it.slot === 'offhand' ? 100 : DUR_SLOT[it.slot] ?? 0
  return Math.round(base * (it.armorType ? DUR_ARMOR[it.armorType] : 1))
}
export const curDur = (it: Item) => (it.dur == null ? maxDur(it) : it.dur)
export const isBroken = (it: Item | undefined | null) => !!it && maxDur(it) > 0 && it.dur === 0
// Utrata wytrzymałości (ułamek maksimum) na założonych przedmiotach
export function damageGear(hero: Hero, frac: number) {
  for (const it of Object.values(hero.equip)) {
    if (!it) continue
    const m = maxDur(it)
    if (!m) continue
    it.dur = Math.max(0, curDur(it) - Math.ceil(m * frac))
  }
}
// Koszt naprawy jednego punktu: rośnie z poziomem i jakością przedmiotu
const REP_RAR = [0.5, 1, 1.2, 1.5, 2]
export function repairCost(it: Item, discount = 0) {
  const miss = maxDur(it) - curDur(it)
  if (miss <= 0) return 0
  return Math.max(1, Math.round(miss * (Math.pow(it.ilvl, 1.5) * 0.04 + 0.5) * REP_RAR[it.rarity] * (1 - discount)))
}
