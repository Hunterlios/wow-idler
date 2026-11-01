// 9 klas. Umiejętności i poziomy nauki według WoW Classic (pierwsze rangi) uzupełnione o nowości
// z WoW Forever (np. Holy Strike, Lava Burst, Fire Nova jako czar, Arcane Blast, Drain Hope, Summon Hawk,
// totemy 5 min i Call of the Elements). Umiejętności z talentów mają `talent`. Liczby uproszczone do idlera.
import type { Stats } from './races'
import type { MobType } from './zones'

export type ClassId = 'warrior' | 'paladin' | 'hunter' | 'rogue' | 'priest' | 'shaman' | 'mage' | 'warlock' | 'druid'
export type Resource = 'rage' | 'energy' | 'mana'
export type School = 'physical' | 'fire' | 'frost' | 'arcane' | 'shadow' | 'holy' | 'nature'
export type ArmorType = 'cloth' | 'leather' | 'mail' | 'plate'
export type Form = 'caster' | 'bear' | 'cat' | 'moonkin'
export type Element = 'earth' | 'fire' | 'water' | 'air'

// Warunki użycia w rotacji (sprawdzane w symulacji)
export type Cond =
  | 'hp<20' | 'hp<25' | 'hp<35' | 'hp<40' | 'hp<45' | 'hp<50' | 'hp<60' | 'hp<75' | 'hp>60'
  | 'mob<20' | 'mob<25' | 'mob>30' | 'mob>50' | 'noDot' | 'dodged' | 'heroDodged' | 'cp>=2' | 'cp>=3' | 'cp5' | 'pack' | 'opener'
  | 'mana<20' | 'mana<30' | 'mana>40' | 'mana>60' | 'res>=25' | 'res>=30' | 'res>=40' | 'res>=50' | 'res>=60'
  | 'noShield' | 'noHot' | 'hot' | 'undead' | 'stunned' | 'notStunned' | 'noTemp' | 'lvl<10' | 'lvl<20' | 'dot:immolate'
  | 'fireTotem' | 'shield' | 'boss' | 'twoTotems'

export type Kind =
  | 'strike' | 'spell' | 'dot' | 'heal' | 'hot' | 'finisher' | 'buff' | 'stun' | 'shield' | 'lifetap' | 'execute'
  | 'cooldown' | 'drain' | 'regen' | 'proc' | 'form' | 'summon' | 'totem'

// Efekty buffów: klucze jak w modyfikatorach (ap/sta/int/spi/str/agi/all = płaskie, rosnące z rangą;
// armor = % pancerza; reszta to modyfikatory: dmg, dr, crit, haste, school:fire, ab:id, ...)
export type BuffFx = Partial<Record<string, number>>

export type Ability = {
  id: string
  name: string
  lvl: number
  kind: Kind
  cost?: number
  cd?: number // s
  cast?: number // s (0 = natychmiast); channel też liczony jako cast
  power?: number // mnożnik bazowej mocy
  dur?: number // DoT/HoT/stun/cooldown
  school?: School
  cp?: number // combo points dodawane
  aoe?: boolean // obrażenia × żywe moby w grupie (max 3)
  when?: Cond[]
  prio?: number // mniejsze = wcześniej
  talent?: boolean
  form?: Form // druid: tylko w tej formie
  forms?: Form[] // druid: w kilku formach
  buff?: BuffFx // pasywne (kind 'buff'), czasowe (kind 'cooldown' / finisher z dur) albo totem
  gain?: number // zyskany zasób (Charge, Bloodrage)
  stun?: number // dodatkowe ogłuszenie (Charge) / ogłuszenie za CP (Kidney Shot)
  heal?: number // drain: część obrażeń wraca jako HP
  healPct?: number // leczenie jako % max HP (Last Stand, Frenzied Regeneration)
  shieldPct?: number // tarcza jako % max HP (Templar's Bulwark)
  proc?: { chance: number; power: number; on: 'hit' | 'taken'; extra?: boolean; heal?: number; mana?: number }
  group?: string // tylko jedna umiejętność z grupy aktywna naraz (nasycenia broni, pieczęcie, aury, totemy żywiołu)
  gprio?: number // domyślny wybór w grupie (mniejsze = preferowane)
  totem?: Element // totem danego żywiołu
  tick?: { every: number; power?: number; heal?: number; mana?: number } // działanie totemu co X s
  melee?: boolean // wymaga zwarcia (domyślnie: strike / finisher / execute)
  closes?: boolean // skraca dystans (Charge, Feral Charge)
  bonusVs?: MobType[] // +50% obrażeń przeciw tym typom
  dotBonus?: string // +20% obrażeń, gdy na celu jest ten DoT
  needTotem?: Element // wymaga aktywnego totemu (Fire Nova)
  shareCd?: string // wspólny cooldown z inną umiejętnością
  cc?: boolean // obezwładnia jednego moba z grupy (Polymorph)
  reset?: string[] // zeruje cooldowny (Preparation, Cold Snap)
  desc: string
}

export type PetDef = { id: string; name: string; lvl: number; tank?: boolean; dmg: number; school: School }

export type ClassDef = {
  id: ClassId
  name: string
  pl: string
  color: string
  resource: Resource
  bonus: Stats
  growth: Stats
  hp: [number, number]
  mana?: [number, number]
  style: 'melee' | 'ranged' | 'caster'
  armor: (lvl: number) => ArmorType
  weapons: { main: string[]; two: string[]; ranged: string[]; off: string[] } // znane od startu (preferowane w łupach)
  skills: string[] // typy broni, których klasa może się nauczyć u Weapon Mastera
  weights: Partial<Record<keyof Stats | 'dps' | 'armor', number>>
  pets?: PetDef[]
  abilities: Ability[]
  role: string
  trees: [string, string, string]
}

// Typy broni (nazwy jak w umiejętnościach broni Classica)
export const ONE_HAND = ['Dagger', 'Fist Weapon', 'Sword', 'Axe', 'Mace']
export const TWO_HAND = ['Greatsword', 'Greataxe', 'Maul', 'Polearm', 'Staff']
export const RANGED = ['Bow', 'Gun', 'Crossbow', 'Thrown', 'Wand']
export const WEAPON_SKILL_PL: Record<string, string> = {
  Dagger: 'Daggers', 'Fist Weapon': 'Fist Weapons', Sword: 'One-Handed Swords', Axe: 'One-Handed Axes', Mace: 'One-Handed Maces',
  Greatsword: 'Two-Handed Swords', Greataxe: 'Two-Handed Axes', Maul: 'Two-Handed Maces', Polearm: 'Polearms', Staff: 'Staves',
  Bow: 'Bows', Gun: 'Guns', Crossbow: 'Crossbows', Thrown: 'Thrown', Wand: 'Wands',
}
export const WEAPON_SKILL_LVL: Record<string, number> = { Polearm: 20 }
export const WEAPON_SKILL_COST = 1000 // 10 s, jak u Weapon Mastera

const plateAt40 = (a: ArmorType, b: ArmorType) => (lvl: number) => (lvl >= 40 ? b : a)
const A = (id: string, name: string, lvl: number, kind: Kind, o: Omit<Ability, 'id' | 'name' | 'lvl' | 'kind'>): Ability => ({ id, name, lvl, kind, ...o })
const T = (id: string, name: string, kind: Kind, o: Omit<Ability, 'id' | 'name' | 'lvl' | 'kind'>): Ability => ({ id, name, lvl: 10, kind, talent: true, ...o })

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior', name: 'Warrior', pl: 'Wojownik', color: '#C79C6E', resource: 'rage', trees: ['Arms', 'Fury', 'Protection'],
    bonus: { str: 3, agi: 0, sta: 2, int: 0, spi: 0 }, growth: { str: 1.6, agi: 0.9, sta: 1.4, int: 0.15, spi: 0.35 },
    hp: [60, 18], style: 'melee', armor: plateAt40('mail', 'plate'),
    weapons: { main: ['Sword', 'Axe', 'Mace', 'Dagger'], two: ['Greatsword'], ranged: ['Thrown'], off: ['Shield'] },
    skills: ['Dagger', 'Fist Weapon', 'Sword', 'Axe', 'Mace', 'Greatsword', 'Greataxe', 'Maul', 'Polearm', 'Staff', 'Bow', 'Gun', 'Crossbow', 'Thrown'],
    weights: { str: 2.2, agi: 1.2, sta: 1.1, armor: 0.04, dps: 14 },
    role: 'Tank / walka wręcz',
    abilities: [
      A('battle_shout', 'Battle Shout', 1, 'buff', { buff: { ap: 15 }, group: 'shout', gprio: 1, desc: 'Okrzyk zwiększający siłę ataku.' }),
      A('heroic_strike', 'Heroic Strike', 1, 'strike', { cost: 15, power: 0.9, school: 'physical', when: ['res>=30'], prio: 70, desc: 'Mocniejszy cios bronią (zużywa nadmiar Rage).' }),
      A('charge', 'Charge', 4, 'strike', { cd: 15, power: 0.3, gain: 15, stun: 1, closes: true, school: 'physical', when: ['opener'], prio: 1, desc: 'Szarża na wroga: skraca dystans, ogłusza na 1 s i daje 15 Rage.' }),
      A('rend', 'Rend', 4, 'dot', { cost: 10, power: 1.1, dur: 9, melee: true, school: 'physical', desc: 'Krwawienie przez 9 s.' }),
      A('thunder_clap', 'Thunder Clap', 6, 'strike', { cost: 20, cd: 4, power: 0.6, aoe: true, school: 'physical', when: ['pack'], desc: 'Uderzenie we wszystkich wrogów wokół.' }),
      A('hamstring', 'Hamstring', 8, 'strike', { cost: 10, power: 0.3, school: 'physical', when: ['res>=60'], prio: 85, desc: 'Podcina ścięgna: drobne obrażenia, zużywa nadmiar Rage.' }),
      A('bloodrage', 'Bloodrage', 10, 'cooldown', { cd: 60, gain: 20, dur: 1, when: ['opener'], prio: 2, desc: 'Natychmiast daje 20 Rage.' }),
      A('sunder_armor', 'Sunder Armor', 10, 'strike', { cost: 15, power: 0.45, school: 'physical', when: ['res>=50'], prio: 75, desc: 'Rozbija pancerz wroga.' }),
      A('overpower', 'Overpower', 12, 'strike', { cost: 5, cd: 5, power: 1.0, school: 'physical', when: ['dodged'], prio: 20, desc: 'Kontratak po uniku wroga.' }),
      A('demoralizing_shout', 'Demoralizing Shout', 14, 'buff', { buff: { dr: 0.05 }, desc: 'Osłabia ataki wrogów wokół (−5% otrzymywanych obrażeń).' }),
      A('revenge', 'Revenge', 14, 'strike', { cost: 5, cd: 5, power: 1.1, school: 'physical', when: ['heroDodged'], prio: 22, desc: 'Odwet po twoim uniku lub bloku.' }),
      A('shield_block', 'Shield Block', 16, 'cooldown', { cost: 10, cd: 5, dur: 5, buff: { dodge: 0.3 }, when: ['shield', 'hp<75'], desc: 'Blokuje ciosy tarczą przez 5 s (wymaga tarczy).' }),
      A('cleave', 'Cleave', 20, 'strike', { cost: 20, power: 0.8, aoe: true, school: 'physical', when: ['pack', 'res>=30'], prio: 40, desc: 'Cios w kilku wrogów naraz.' }),
      A('retaliation', 'Retaliation', 20, 'cooldown', { cd: 300, dur: 15, buff: { retal: 0.5 }, when: ['pack', 'hp<75'], desc: 'Przez 15 s kontrujesz każdy otrzymany cios.' }),
      A('intimidating_shout', 'Intimidating Shout', 22, 'stun', { cost: 25, cd: 120, dur: 5, when: ['pack', 'hp<45'], desc: 'Przeraża wrogów wokół na kilka sekund.' }),
      A('execute', 'Execute', 24, 'execute', { cost: 15, power: 2.4, school: 'physical', desc: 'Dobija wroga poniżej 20% HP.' }),
      A('shield_wall', 'Shield Wall', 28, 'cooldown', { cd: 600, dur: 10, buff: { dr: 0.4 }, when: ['hp<35'], prio: 3, desc: '−40% otrzymywanych obrażeń przez 10 s.' }),
      A('slam', 'Slam', 30, 'strike', { cost: 15, cast: 1.5, power: 1.3, school: 'physical', when: ['res>=40'], prio: 65, desc: 'Potężne uderzenie (1,5 s).' }),
      A('berserker_rage', 'Berserker Rage', 32, 'cooldown', { cd: 30, gain: 10, dur: 10, buff: { resGen: 0.25 }, desc: 'Szał: +10 Rage i więcej Rage z otrzymanych ciosów.' }),
      A('whirlwind', 'Whirlwind', 36, 'strike', { cost: 25, cd: 10, power: 1.1, aoe: true, school: 'physical', prio: 35, desc: 'Wir ostrzy trafiający wszystkich wokół.' }),
      A('recklessness', 'Recklessness', 50, 'cooldown', { cd: 900, dur: 15, buff: { crit: 1, dr: -0.2 }, when: ['boss'], prio: 4, desc: 'Każdy cios krytyczny przez 15 s, ale +20% otrzymywanych obrażeń.' }),
      T('sweeping_strikes', 'Sweeping Strikes', 'cooldown', { cd: 30, dur: 10, buff: { sweep: 1 }, when: ['pack'], prio: 5, desc: 'Talent Arms: ciosy trafiają też drugiego wroga.' }),
      T('spearing_strike', 'Spearing Strike', 'strike', { cost: 15, cd: 10, power: 1.25, bonusVs: ['giant', 'dragon'], school: 'physical', prio: 32, desc: 'Talent Arms (Forever): pchnięcie bronią, +50% przeciw olbrzymom i smokom.' }),
      T('mortal_strike', 'Mortal Strike', 'strike', { cost: 30, cd: 6, power: 1.7, school: 'physical', prio: 30, desc: 'Talent Arms: potężny cios.' }),
      T('piercing_howl', 'Piercing Howl', 'stun', { cost: 10, cd: 30, dur: 2, when: ['pack'], desc: 'Talent Fury: spowalnia wrogów wokół.' }),
      T('death_wish', 'Death Wish', 'cooldown', { cost: 10, cd: 180, dur: 30, buff: { dmg: 0.2, dr: -0.05 }, prio: 6, desc: 'Talent Fury: +20% obrażeń, +5% otrzymywanych (Forever).' }),
      T('bloodthirst', 'Bloodthirst', 'strike', { cost: 30, cd: 6, power: 1.5, heal: 0.1, school: 'physical', prio: 30, desc: 'Talent Fury: cios, który leczy.' }),
      T('last_stand', 'Last Stand', 'heal', { cd: 300, healPct: 0.3, when: ['hp<25'], prio: 2, desc: 'Talent Protection: natychmiast +30% zdrowia.' }),
      T('concussion_blow', 'Concussion Blow', 'stun', { cost: 15, cd: 45, dur: 5, melee: true, desc: 'Talent Protection: ogłusza na 5 s.' }),
      T('shield_slam', 'Shield Slam', 'strike', { cost: 20, cd: 6, power: 1.4, school: 'physical', prio: 30, desc: 'Talent Protection: uderzenie tarczą.' }),
    ],
  },
  {
    id: 'paladin', name: 'Paladin', pl: 'Paladyn', color: '#F58CBA', resource: 'mana', trees: ['Holy', 'Protection', 'Retribution'],
    bonus: { str: 2, agi: 0, sta: 2, int: 0, spi: 1 }, growth: { str: 1.4, agi: 0.6, sta: 1.3, int: 0.8, spi: 0.8 },
    hp: [55, 17], mana: [60, 14], style: 'melee', armor: plateAt40('mail', 'plate'),
    weapons: { main: ['Mace', 'Sword'], two: ['Maul'], ranged: [], off: ['Shield'] },
    skills: ['Sword', 'Axe', 'Mace', 'Greatsword', 'Greataxe', 'Maul', 'Polearm'],
    weights: { str: 2, int: 1, sta: 1.1, spi: 0.5, armor: 0.04, dps: 13 },
    role: 'Tank / leczenie / walka wręcz',
    abilities: [
      A('devotion_aura', 'Devotion Aura', 1, 'buff', { buff: { armor: 0.15 }, group: 'aura', gprio: 2, desc: 'Aura zwiększająca pancerz.' }),
      A('seal_righteousness', 'Seal of Righteousness', 1, 'proc', { proc: { chance: 1, power: 0.12, on: 'hit' }, school: 'holy', group: 'seal', gprio: 2, desc: 'Każdy cios zadaje dodatkowe obrażenia Holy.' }),
      A('holy_light', 'Holy Light', 1, 'heal', { cost: 35, cast: 2.5, cd: 10, power: 2.6, school: 'holy', desc: 'Silne leczenie.' }),
      A('holy_strike', 'Holy Strike', 2, 'strike', { cost: 15, cd: 8, power: 1.1, school: 'holy', prio: 45, desc: 'Forever: natychmiastowy cios bronią nasycony Światłem.' }),
      A('blessing_might', 'Blessing of Might', 4, 'buff', { buff: { ap: 20 }, group: 'blessing', gprio: 1, desc: 'Błogosławieństwo siły ataku.' }),
      A('judgement', 'Judgement', 4, 'spell', { cost: 25, cd: 10, power: 1.3, school: 'holy', desc: 'Uwalnia moc pieczęci.' }),
      A('divine_protection', 'Divine Protection', 6, 'cooldown', { cost: 15, cd: 300, dur: 8, buff: { dr: 0.4 }, when: ['hp<35'], prio: 3, desc: 'Boska ochrona: −40% obrażeń przez 8 s.' }),
      A('seal_crusader', 'Seal of the Crusader', 6, 'buff', { buff: { ap: 15, haste: 0.1 }, group: 'seal', gprio: 3, desc: 'Szybsze ataki i więcej siły ataku.' }),
      A('hammer_justice', 'Hammer of Justice', 8, 'stun', { cost: 30, cd: 60, dur: 3, desc: 'Ogłusza wroga na 3 s.' }),
      A('lay_on_hands', 'Lay on Hands', 10, 'heal', { cd: 1800, healPct: 1, when: ['hp<20'], prio: 1, desc: 'Pełne uleczenie w krytycznej chwili (30 min).' }),
      A('blessing_wisdom', 'Blessing of Wisdom', 14, 'buff', { buff: { castRegen: 0.15 }, group: 'blessing', gprio: 3, desc: 'Regeneracja many w walce.' }),
      A('retribution_aura', 'Retribution Aura', 16, 'proc', { proc: { chance: 1, power: 0.12, on: 'taken' }, school: 'holy', group: 'aura', gprio: 1, desc: 'Raniący cię wróg dostaje obrażenia Holy.' }),
      A('exorcism', 'Exorcism', 20, 'spell', { cost: 60, cd: 15, power: 1.8, school: 'holy', when: ['undead'], desc: 'Silny cios przeciw nieumarłym i demonom.' }),
      A('flash_of_light', 'Flash of Light', 20, 'heal', { cost: 20, cast: 1.5, cd: 8, power: 1.6, school: 'holy', when: ['hp<60'], desc: 'Szybkie leczenie.' }),
      A('blessing_kings', 'Blessing of Kings', 20, 'buff', { buff: { allPct: 0.1 }, group: 'blessing', gprio: 2, desc: 'Forever: baza zamiast talentu, +10% wszystkich atrybutów.' }),
      A('seal_fury', 'Seal of Fury', 22, 'proc', { proc: { chance: 1, power: 0.08, on: 'hit' }, buff: { dr: 0.03 }, school: 'holy', group: 'seal', gprio: 4, desc: 'Forever: pieczęć obrońcy, mniejsze obrażenia Holy i −3% otrzymywanych.' }),
      A('seal_light', 'Seal of Light', 30, 'proc', { proc: { chance: 0.3, power: 0, on: 'hit', heal: 0.5 }, school: 'holy', group: 'seal', gprio: 5, desc: 'Ciosy mogą cię leczyć.' }),
      A('divine_shield', 'Divine Shield', 34, 'cooldown', { cost: 20, cd: 300, dur: 10, buff: { immune: 1 }, when: ['hp<20'], prio: 2, desc: 'Nietykalność przez 10 s.' }),
      A('seal_wisdom', 'Seal of Wisdom', 38, 'proc', { proc: { chance: 0.3, power: 0, on: 'hit', mana: 0.02 }, school: 'holy', group: 'seal', gprio: 6, desc: 'Ciosy mogą odnawiać manę.' }),
      A('hammer_wrath', 'Hammer of Wrath', 44, 'spell', { cost: 30, cd: 6, cast: 1, power: 2.2, school: 'holy', when: ['mob<20'], prio: 18, desc: 'Dobijający młot Światła (wróg poniżej 20% HP).' }),
      A('holy_wrath', 'Holy Wrath', 50, 'spell', { cost: 70, cd: 60, cast: 2, power: 1.6, aoe: true, school: 'holy', when: ['undead'], desc: 'Gniew Światła na nieumarłych wokół.' }),
      T('consecration', 'Consecration', 'dot', { cost: 40, cd: 8, power: 1.2, dur: 8, aoe: true, school: 'holy', desc: 'Talent Holy: uświęca ziemię (AoE).' }),
      T('voice_of_truth', 'Voice of Truth', 'stun', { cost: 10, cd: 30, dur: 2, desc: 'Talent Holy (Forever): krótkie uciszenie wroga.' }),
      T('holy_shock', 'Holy Shock', 'spell', { cost: 40, cd: 30, power: 1.6, school: 'holy', desc: 'Talent Holy: natychmiastowy cios Światła.' }),
      T('blessing_sanctuary', 'Blessing of Sanctuary', 'buff', { buff: { dr: 0.06 }, group: 'blessing', gprio: 4, desc: 'Talent Protection: −6% otrzymywanych obrażeń.' }),
      T('holy_shield', 'Holy Shield', 'cooldown', { cost: 25, cd: 10, dur: 10, buff: { dodge: 0.2 }, desc: 'Talent Protection: +20% blokowania (Forever: mniej niż w Classicu).' }),
      T('templars_bulwark', "Templar's Bulwark", 'shield', { cost: 30, cd: 300, shieldPct: 1, when: ['hp<35'], prio: 2, desc: 'Talent Protection (Forever): tarcza równa 100% zdrowia.' }),
      T('seal_command', 'Seal of Command', 'proc', { proc: { chance: 0.25, power: 0.9, on: 'hit' }, school: 'holy', group: 'seal', gprio: 1, desc: 'Talent Retribution: szansa na potężny cios Holy.' }),
      T('sanctity_aura', 'Sanctity Aura', 'buff', { buff: { 'school:holy': 0.1 }, group: 'aura', gprio: 0, desc: 'Talent Retribution: +10% obrażeń Holy.' }),
      T('repentance', 'Repentance', 'stun', { cost: 30, cd: 60, dur: 6, desc: 'Talent Retribution: obezwładnia wroga.' }),
    ],
  },
  {
    id: 'hunter', name: 'Hunter', pl: 'Łowca', color: '#ABD473', resource: 'mana', trees: ['Beast Mastery', 'Marksmanship', 'Survival'],
    bonus: { str: 0, agi: 3, sta: 1, int: 0, spi: 1 }, growth: { str: 0.6, agi: 1.7, sta: 1.2, int: 0.6, spi: 0.6 },
    hp: [50, 15], mana: [70, 12], style: 'ranged', armor: plateAt40('leather', 'mail'),
    weapons: { main: ['Axe', 'Dagger'], two: ['Greataxe'], ranged: ['Bow', 'Gun', 'Crossbow'], off: [] },
    skills: ['Dagger', 'Fist Weapon', 'Sword', 'Axe', 'Greatsword', 'Greataxe', 'Polearm', 'Staff', 'Bow', 'Gun', 'Crossbow', 'Thrown'],
    weights: { agi: 2.5, sta: 1, int: 0.5, str: 0.3, armor: 0.02, dps: 14 },
    role: 'Walka dystansowa z pupilem',
    pets: [{ id: 'beast', name: 'Oswojona bestia', lvl: 10, tank: true, dmg: 0.4, school: 'physical' }],
    abilities: [
      A('raptor_strike', 'Raptor Strike', 1, 'strike', { cost: 15, cd: 6, power: 0.8, school: 'physical', desc: 'Cios wręcz (gdy wróg podejdzie).' }),
      A('aspect_monkey', 'Aspect of the Monkey', 4, 'buff', { buff: { dodge: 0.05 }, group: 'aspect', gprio: 2, desc: '+5% uniku.' }),
      A('serpent_sting', 'Serpent Sting', 4, 'dot', { cost: 15, power: 1.2, dur: 15, school: 'nature', desc: 'Trucizna przez 15 s.' }),
      A('arcane_shot', 'Arcane Shot', 6, 'spell', { cost: 25, cd: 6, power: 1.0, school: 'arcane', desc: 'Natychmiastowy strzał magiczny.' }),
      A('hunters_mark', "Hunter's Mark", 6, 'buff', { buff: { ap: 20 }, desc: 'Zwiększa obrażenia dystansowe.' }),
      A('concussive_shot', 'Concussive Shot', 8, 'stun', { cost: 20, cd: 12, dur: 2, when: ['hp<50'], desc: 'Spowalnia wroga.' }),
      A('aspect_hawk', 'Aspect of the Hawk', 10, 'buff', { buff: { ap: 30 }, group: 'aspect', gprio: 1, desc: 'Duży bonus do siły ataku dystansowego.' }),
      A('wing_clip', 'Wing Clip', 12, 'strike', { cost: 10, cd: 10, power: 0.35, stun: 1, school: 'physical', when: ['hp<60'], desc: 'Podcina wroga w zwarciu.' }),
      A('mongoose_bite', 'Mongoose Bite', 16, 'strike', { cost: 20, cd: 5, power: 1.0, school: 'physical', when: ['heroDodged'], desc: 'Kontra po twoim uniku.' }),
      A('immolation_trap', 'Immolation Trap', 16, 'dot', { cost: 30, cd: 15, power: 1.3, dur: 15, school: 'fire', when: ['opener'], desc: 'Pułapka podpalająca wroga.' }),
      A('multi_shot', 'Multi-Shot', 18, 'spell', { cost: 60, cd: 10, power: 1.0, aoe: true, school: 'physical', desc: 'Strzał w kilka celów.' }),
      A('summon_hawk', 'Summon Hawk', 20, 'spell', { cost: 25, cd: 6, power: 1.05, shareCd: 'arcane_shot', school: 'physical', desc: 'Forever: jastrząb pikuje na wroga (wspólny cooldown z Arcane Shot).' }),
      A('freezing_trap', 'Freezing Trap', 20, 'stun', { cost: 25, cd: 15, dur: 6, cc: true, when: ['pack'], desc: 'Zamraża jednego wroga z grupy.' }),
      A('rapid_fire', 'Rapid Fire', 26, 'cooldown', { cost: 30, cd: 300, dur: 15, buff: { haste: 0.4 }, desc: '+40% szybkości strzałów na 15 s.' }),
      A('explosive_trap', 'Explosive Trap', 34, 'dot', { cost: 40, cd: 15, power: 1.4, dur: 10, aoe: true, school: 'fire', when: ['pack'], desc: 'Pułapka podpalająca grupę.' }),
      A('volley', 'Volley', 40, 'spell', { cost: 80, cast: 6, power: 2.4, aoe: true, school: 'arcane', when: ['pack'], desc: 'Grad strzał na obszar (kanałowane).' }),
      T('intimidation', 'Intimidation', 'stun', { cost: 20, cd: 60, dur: 3, desc: 'Talent Beast Mastery: pupil ogłusza wroga.' }),
      T('bestial_wrath', 'Bestial Wrath', 'cooldown', { cost: 30, cd: 120, dur: 18, buff: { petDmg: 0.5 }, desc: 'Talent Beast Mastery: pupil +50% obrażeń.' }),
      T('aimed_shot', 'Aimed Shot', 'spell', { cost: 45, cd: 6, cast: 3, power: 2.2, school: 'physical', desc: 'Talent Marksmanship: precyzyjny strzał.' }),
      T('scatter_shot', 'Scatter Shot', 'stun', { cost: 20, cd: 30, dur: 4, when: ['hp<50'], desc: 'Talent Marksmanship: dezorientuje wroga.' }),
      T('trueshot_aura', 'Trueshot Aura', 'buff', { buff: { ap: 45 }, desc: 'Talent Marksmanship: aura siły ataku dystansowego.' }),
      T('counterattack', 'Counterattack', 'strike', { cost: 20, cd: 5, power: 1.1, stun: 1, school: 'physical', when: ['heroDodged'], prio: 21, desc: 'Talent Survival: kontra po uniku.' }),
      T('deterrence', 'Deterrence', 'cooldown', { cd: 300, dur: 10, buff: { dodge: 0.5 }, when: ['hp<35'], prio: 3, desc: 'Talent Survival: +50% uniku przez 10 s.' }),
      T('wyvern_sting', 'Wyvern Sting', 'stun', { cost: 40, cd: 120, dur: 8, desc: 'Talent Survival: usypia wroga.' }),
    ],
  },
  {
    id: 'rogue', name: 'Rogue', pl: 'Łotrzyk', color: '#FFF569', resource: 'energy', trees: ['Assassination', 'Combat', 'Subtlety'],
    bonus: { str: 1, agi: 3, sta: 1, int: 0, spi: 0 }, growth: { str: 1.0, agi: 1.8, sta: 1.1, int: 0.25, spi: 0.4 },
    hp: [55, 16], style: 'melee', armor: () => 'leather',
    weapons: { main: ['Dagger', 'Sword'], two: [], ranged: ['Thrown'], off: [] },
    skills: ['Dagger', 'Fist Weapon', 'Sword', 'Mace', 'Bow', 'Gun', 'Crossbow', 'Thrown'],
    weights: { agi: 2.3, str: 1, sta: 0.9, armor: 0.02, dps: 15 },
    role: 'Walka wręcz z ukrycia',
    abilities: [
      A('sinister_strike', 'Sinister Strike', 1, 'strike', { cost: 45, power: 0.85, cp: 1, school: 'physical', desc: 'Cios dający punkt kombinacji.' }),
      A('eviscerate', 'Eviscerate', 1, 'finisher', { cost: 35, power: 0.65, school: 'physical', desc: 'Finisher: obrażenia za każdy punkt kombinacji.' }),
      A('backstab', 'Backstab', 4, 'strike', { cost: 60, power: 1.35, cp: 1, school: 'physical', when: ['stunned'], prio: 50, desc: 'Cios w plecy (gdy wróg jest ogłuszony).' }),
      A('gouge', 'Gouge', 6, 'stun', { cost: 45, cd: 10, dur: 4, melee: true, when: ['hp<45'], desc: 'Obezwładnia wroga.' }),
      A('evasion', 'Evasion', 8, 'cooldown', { cd: 300, dur: 15, buff: { dodge: 0.5 }, when: ['hp<50'], desc: '+50% szansy na unik przez 15 s.' }),
      A('slice_dice', 'Slice and Dice', 10, 'buff', { buff: { haste: 0.2 }, desc: 'Szybsze ataki (stale utrzymywane).' }),
      A('garrote', 'Garrote', 14, 'dot', { cost: 50, power: 1.3, dur: 18, cp: 1, melee: true, school: 'physical', when: ['opener'], prio: 3, desc: 'Otwarcie z ukrycia: duszenie, krwawienie przez 18 s.' }),
      A('expose_armor', 'Expose Armor', 14, 'finisher', { cost: 25, power: 0, dur: 30, buff: { meleeDmg: 0.08 }, when: ['noTemp', 'boss'], prio: 26, desc: 'Finisher: rozbija pancerz wroga (+8% obrażeń fizycznych na 30 s).' }),
      A('ambush', 'Ambush', 18, 'strike', { cost: 60, power: 2.4, cp: 2, school: 'physical', when: ['opener'], prio: 2, desc: 'Otwarcie z ukrycia: potężny cios.' }),
      A('rupture', 'Rupture', 20, 'finisher', { cost: 25, power: 0.6, dur: 12, school: 'physical', when: ['noDot', 'mob>50'], prio: 24, desc: 'Finisher: krwawienie zależne od punktów kombinacji.' }),
      A('instant_poison', 'Instant Poison', 20, 'proc', { proc: { chance: 0.2, power: 0.32, on: 'hit' }, school: 'nature', desc: 'Trucizna na broni: szansa na obrażenia Nature.' }),
      A('cheap_shot', 'Cheap Shot', 26, 'stun', { cost: 60, dur: 4, cp: 2, melee: true, when: ['opener'], prio: 1, desc: 'Otwarcie z ukrycia: ogłusza na 4 s (2 punkty kombinacji).' }),
      A('kidney_shot', 'Kidney Shot', 30, 'finisher', { cost: 25, cd: 20, power: 0, stun: 1, when: ['hp<60', 'notStunned'], prio: 15, desc: 'Finisher: ogłusza na 1 s za każdy punkt kombinacji.' }),
      A('deadly_poison', 'Deadly Poison', 30, 'proc', { proc: { chance: 0.3, power: 0.27, on: 'hit' }, school: 'nature', desc: 'Trucizna na broni: obrażenia w czasie.' }),
      A('wound_poison', 'Wound Poison', 32, 'proc', { proc: { chance: 0.3, power: 0.12, on: 'hit' }, school: 'nature', desc: 'Trucizna na broni: rany osłabiające leczenie.' }),
      A('blind', 'Blind', 34, 'stun', { cost: 30, cd: 300, dur: 8, cc: true, when: ['pack', 'hp<45'], desc: 'Oślepia jednego wroga z grupy.' }),
      T('cold_blood', 'Cold Blood', 'cooldown', { cd: 180, dur: 3, buff: { crit: 1 }, when: ['cp5'], prio: 5, desc: 'Talent Assassination: następny cios krytyczny.' }),
      T('mutilate', 'Mutilate', 'strike', { cost: 55, power: 1.5, cp: 2, school: 'physical', prio: 52, desc: 'Talent Assassination (Forever): dwa ciosy naraz, 2 punkty kombinacji.' }),
      T('venom', 'Venom', 'finisher', { cost: 25, power: 0, dur: 20, buff: { 'school:nature': 0.4 }, when: ['noTemp'], prio: 23, desc: 'Talent Assassination (Forever): finisher wzmacniający trucizny.' }),
      T('riposte', 'Riposte', 'strike', { cost: 10, cd: 6, power: 1.1, school: 'physical', when: ['heroDodged'], prio: 21, desc: 'Talent Combat: kontra po sparowaniu.' }),
      T('blade_flurry', 'Blade Flurry', 'cooldown', { cost: 25, cd: 120, dur: 15, buff: { haste: 0.2, sweep: 1 }, desc: 'Talent Combat: +20% szybkości ataków, ciosy trafiają drugiego wroga.' }),
      T('adrenaline_rush', 'Adrenaline Rush', 'cooldown', { cd: 300, dur: 15, buff: { energy: 1 }, desc: 'Talent Combat: podwójna regeneracja Energy.' }),
      T('ghostly_strike', 'Ghostly Strike', 'strike', { cost: 40, cd: 20, power: 1.25, cp: 1, school: 'physical', desc: 'Talent Subtlety: widmowy cios.' }),
      T('preparation', 'Preparation', 'cooldown', { cd: 600, dur: 1, reset: ['evasion', 'blind', 'cold_blood', 'adrenaline_rush', 'blade_flurry'], when: ['hp<35'], desc: 'Talent Subtlety: zeruje cooldowny umiejętności łotrzyka.' }),
      T('hemorrhage', 'Hemorrhage', 'strike', { cost: 35, power: 1.15, cp: 1, school: 'physical', prio: 55, desc: 'Talent Subtlety: krwawiący cios.' }),
    ],
  },
  {
    id: 'priest', name: 'Priest', pl: 'Kapłan', color: '#FFFFFF', resource: 'mana', trees: ['Discipline', 'Holy', 'Shadow'],
    bonus: { str: 0, agi: 0, sta: 0, int: 2, spi: 3 }, growth: { str: 0.2, agi: 0.3, sta: 0.9, int: 1.5, spi: 1.6 },
    hp: [45, 13], mana: [110, 20], style: 'caster', armor: () => 'cloth',
    weapons: { main: ['Mace'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    skills: ['Dagger', 'Mace', 'Staff', 'Wand'],
    weights: { int: 1.8, spi: 1.8, sta: 0.9 },
    role: 'Leczenie / magia cienia',
    abilities: [
      A('pw_fortitude', 'Power Word: Fortitude', 1, 'buff', { buff: { sta: 8 }, desc: 'Zwiększa Stamina.' }),
      A('smite', 'Smite', 1, 'spell', { cost: 20, cast: 2.5, power: 1.6, school: 'holy', desc: 'Święte obrażenia.' }),
      A('lesser_heal', 'Lesser Heal', 1, 'heal', { cost: 30, cast: 2.5, cd: 10, power: 2.4, school: 'holy', desc: 'Leczenie.' }),
      A('sw_pain', 'Shadow Word: Pain', 4, 'dot', { cost: 25, power: 1.5, dur: 18, school: 'shadow', desc: 'Obrażenia cienia przez 18 s.' }),
      A('pw_shield', 'Power Word: Shield', 6, 'shield', { cost: 45, cd: 15, power: 2.0, school: 'holy', desc: 'Tarcza pochłaniająca obrażenia (Weakened Soul: 15 s).' }),
      A('renew', 'Renew', 8, 'hot', { cost: 30, power: 2.2, dur: 15, school: 'holy', desc: 'Leczenie w czasie.' }),
      A('desperate_prayer', 'Desperate Prayer', 10, 'heal', { cd: 600, healPct: 0.3, when: ['hp<25'], prio: 2, school: 'holy', desc: 'Forever: natychmiast +30% zdrowia (dawniej tylko rasowe).' }),
      A('mind_blast', 'Mind Blast', 10, 'spell', { cost: 50, cd: 8, cast: 1.5, power: 1.9, school: 'shadow', desc: 'Silny czar cienia.' }),
      A('inner_fire', 'Inner Fire', 12, 'buff', { buff: { armor: 0.3, ap: 15 }, desc: 'Wewnętrzny ogień: pancerz.' }),
      A('psychic_scream', 'Psychic Scream', 14, 'stun', { cost: 40, cd: 30, dur: 4, when: ['hp<45'], desc: 'Odstrasza wrogów na 4 s.' }),
      A('heal', 'Heal', 16, 'heal', { cost: 45, cast: 3, cd: 10, power: 3.4, school: 'holy', desc: 'Mocniejsze leczenie.' }),
      A('flash_heal', 'Flash Heal', 20, 'heal', { cost: 35, cast: 1.5, cd: 12, power: 2.2, school: 'holy', when: ['hp<35'], prio: 4, desc: 'Szybkie leczenie.' }),
      A('holy_fire', 'Holy Fire', 20, 'spell', { cost: 50, cd: 10, cast: 3.5, power: 2.3, school: 'holy', desc: 'Święty ogień.' }),
      A('fear_ward', 'Fear Ward', 20, 'buff', { buff: { dr: 0.03 }, desc: 'Forever: dla wszystkich kapłanów od 20 poz. Osłona przed strachem.' }),
      A('devouring_plague', 'Devouring Plague', 20, 'dot', { cost: 55, cd: 60, power: 1.8, dur: 24, heal: 1, school: 'shadow', desc: 'Forever: dla wszystkich od 20 poz. Zaraza, która cię leczy.' }),
      A('prayer_healing', 'Prayer of Healing', 30, 'heal', { cost: 60, cast: 3, cd: 15, power: 3.0, school: 'holy', when: ['hp<35'], desc: 'Modlitwa leczenia.' }),
      A('shadow_protection', 'Shadow Protection', 30, 'buff', { buff: { dr: 0.03 }, desc: 'Ochrona przed cieniem.' }),
      A('greater_heal', 'Greater Heal', 40, 'heal', { cost: 70, cast: 3, cd: 10, power: 4.6, school: 'holy', desc: 'Wielkie leczenie.' }),
      T('inner_focus', 'Inner Focus', 'cooldown', { cd: 180, dur: 4, buff: { spellCrit: 0.25, cost: -1 }, desc: 'Talent Discipline: darmowy, mocny czar.' }),
      T('divine_spirit', 'Divine Spirit', 'buff', { buff: { spi: 20 }, desc: 'Talent Discipline: dużo Spirit.' }),
      T('penance', 'Penance', 'spell', { cost: 40, cd: 10, cast: 2, power: 2.1, heal: 0.3, school: 'holy', prio: 30, desc: 'Talent Discipline (Forever): kanałowane pociski Światła, część leczy.' }),
      T('power_infusion', 'Power Infusion', 'cooldown', { cd: 180, dur: 15, buff: { dmg: 0.2 }, desc: 'Talent Discipline: +20% obrażeń.' }),
      T('holy_nova', 'Holy Nova', 'spell', { cost: 50, power: 0.9, aoe: true, school: 'holy', when: ['pack'], desc: 'Talent Holy: wybuch Światła wokół.' }),
      T('prayer_mending', 'Prayer of Mending', 'hot', { cost: 30, cd: 10, power: 2.6, dur: 9, school: 'holy', desc: 'Talent Holy (Forever): leczenie skaczące przy otrzymaniu ciosu.' }),
      T('lightwell', 'Lightwell', 'hot', { cost: 60, cd: 180, power: 3.5, dur: 12, school: 'holy', desc: 'Talent Holy: studnia światła.' }),
      T('mind_flay', 'Mind Flay', 'spell', { cost: 45, cast: 3, power: 2.1, school: 'shadow', desc: 'Talent Shadow: kanałowany czar cienia.' }),
      T('silence', 'Silence', 'stun', { cost: 20, cd: 45, dur: 3, desc: 'Talent Shadow: ucisza wroga.' }),
      T('vampiric_embrace', 'Vampiric Embrace', 'buff', { buff: { lifesteal: 0.15 }, desc: 'Talent Shadow: obrażenia cienia leczą.' }),
      T('shadowform', 'Shadowform', 'buff', { buff: { shadow: 0.15, dr: 0.15 }, desc: 'Talent Shadow: +15% cienia, −15% obrażeń; blokuje czary Holy.' }),
    ],
  },
  {
    id: 'shaman', name: 'Shaman', pl: 'Szaman', color: '#0070DE', resource: 'mana', trees: ['Elemental', 'Enhancement', 'Restoration'],
    bonus: { str: 1, agi: 0, sta: 1, int: 1, spi: 2 }, growth: { str: 1.1, agi: 0.6, sta: 1.2, int: 1.0, spi: 1.1 },
    hp: [55, 16], mana: [80, 16], style: 'melee', armor: plateAt40('leather', 'mail'),
    weapons: { main: ['Mace'], two: ['Staff'], ranged: [], off: ['Shield', 'Orb'] },
    skills: ['Dagger', 'Fist Weapon', 'Axe', 'Mace', 'Greataxe', 'Maul', 'Staff'],
    weights: { str: 1.4, int: 1.4, agi: 0.8, sta: 1, spi: 0.6, armor: 0.03, dps: 12 },
    role: 'Żywioły / leczenie / walka wręcz',
    abilities: [
      // nasycenia broni: tylko jedno naraz (wybór w księdze umiejętności)
      A('rockbiter', 'Rockbiter Weapon', 1, 'buff', { buff: { ap: 20 }, group: 'imbue', gprio: 4, desc: 'Nasyca broń mocą ziemi (+siła ataku).' }),
      A('lightning_bolt', 'Lightning Bolt', 1, 'spell', { cost: 25, cast: 2.0, power: 1.5, school: 'nature', when: ['mana>40'], desc: 'Błyskawica. Wyłącz, by grać czysto w zwarciu.' }),
      A('healing_wave', 'Healing Wave', 1, 'heal', { cost: 30, cast: 2.5, cd: 10, power: 2.5, school: 'nature', desc: 'Leczenie (w idlerze z cooldownem 10 s).' }),
      A('earth_shock', 'Earth Shock', 4, 'spell', { cost: 30, cd: 6, power: 1.1, school: 'nature', desc: 'Natychmiastowy wstrząs ziemi.' }),
      A('stoneskin_totem', 'Stoneskin Totem', 4, 'totem', { cost: 12, totem: 'earth', group: 'totem:earth', gprio: 2, buff: { dr: 0.05 }, desc: 'Totem ziemi: −5% otrzymywanych obrażeń, gdy stoisz przy nim.' }),
      A('lightning_shield', 'Lightning Shield', 8, 'proc', { proc: { chance: 0.5, power: 0.3, on: 'taken' }, school: 'nature', group: 'eshield', gprio: 1, desc: 'Kule błyskawic ranią atakujących (jedna tarcza żywiołu naraz).' }),
      A('strength_earth', 'Strength of Earth Totem', 10, 'totem', { cost: 15, totem: 'earth', group: 'totem:earth', gprio: 1, buff: { str: 6 }, desc: 'Totem ziemi: +Strength, gdy stoisz przy nim.' }),
      A('flametongue', 'Flametongue Weapon', 10, 'proc', { proc: { chance: 0.35, power: 0.35, on: 'hit' }, school: 'fire', group: 'imbue', gprio: 2, desc: 'Broń zadaje dodatkowe obrażenia ognia.' }),
      A('searing_totem', 'Searing Totem', 10, 'totem', { cost: 18, totem: 'fire', group: 'totem:fire', gprio: 1, tick: { every: 2.2, power: 0.16 }, school: 'fire', desc: 'Totem ognia strzela do wroga co 2,2 s.' }),
      A('flame_shock', 'Flame Shock', 10, 'dot', { cost: 50, cd: 6, power: 1.5, dur: 12, school: 'fire', desc: 'Ogień w czasie.' }),
      A('fire_nova', 'Fire Nova', 12, 'spell', { cost: 45, cd: 10, power: 1.0, aoe: true, needTotem: 'fire', school: 'fire', when: ['fireTotem'], desc: 'Forever: wybuch ognia wokół twojego totemu ognia (cooldown 10 s).' }),
      A('frost_shock', 'Frost Shock', 20, 'spell', { cost: 45, cd: 6, power: 1.3, school: 'frost', desc: 'Lodowy wstrząs.' }),
      A('frostbrand', 'Frostbrand Weapon', 20, 'proc', { proc: { chance: 0.25, power: 0.42, on: 'hit' }, school: 'frost', group: 'imbue', gprio: 3, desc: 'Broń zadaje obrażenia mrozu i spowalnia.' }),
      A('healing_stream', 'Healing Stream Totem', 20, 'totem', { cost: 12, totem: 'water', group: 'totem:water', gprio: 2, tick: { every: 2, heal: 0.07 }, school: 'nature', desc: 'Totem wody: leczy co 2 s.' }),
      A('lesser_healing_wave', 'Lesser Healing Wave', 20, 'heal', { cost: 25, cast: 1.5, cd: 15, power: 1.7, school: 'nature', when: ['hp<35'], prio: 4, desc: 'Szybkie leczenie.' }),
      A('magma_totem', 'Magma Totem', 26, 'totem', { cost: 28, totem: 'fire', group: 'totem:fire', gprio: 2, tick: { every: 2, power: 0.12 }, aoe: true, school: 'fire', desc: 'Totem ognia: pulsuje ogniem w całą grupę.' }),
      A('mana_spring', 'Mana Spring Totem', 26, 'totem', { cost: 10, totem: 'water', group: 'totem:water', gprio: 1, tick: { every: 2, mana: 0.012 }, desc: 'Totem wody: odnawia manę co 2 s.' }),
      A('windfury', 'Windfury Weapon', 30, 'proc', { proc: { chance: 0.2, power: 1, on: 'hit', extra: true }, school: 'physical', group: 'imbue', gprio: 1, desc: '20% szansy na dodatkowy atak.' }),
      A('call_elements', 'Call of the Elements', 30, 'totem', { cost: 30, when: ['twoTotems'], prio: 3, desc: 'Forever: stawia naraz wszystkie wybrane totemy.' }),
      A('chain_lightning', 'Chain Lightning', 32, 'spell', { cost: 60, cd: 6, cast: 2.5, power: 1.4, aoe: true, school: 'nature', desc: 'Błyskawica przeskakująca po wrogach.' }),
      A('windfury_totem', 'Windfury Totem', 32, 'totem', { cost: 14, totem: 'air', group: 'totem:air', gprio: 2, buff: { haste: 0.08 }, desc: 'Totem powietrza: szybsze ataki wręcz.' }),
      A('totemic_projection', 'Totemic Projection', 36, 'buff', { desc: 'Forever: przenosi totemy w nowe miejsce (cooldown 1 min), więc nie znikają przy przejściu do następnego wroga.' }),
      A('chain_heal', 'Chain Heal', 40, 'heal', { cost: 50, cast: 2.5, cd: 10, power: 2.9, school: 'nature', desc: 'Łańcuch leczenia.' }),
      A('grace_of_air', 'Grace of Air Totem', 42, 'totem', { cost: 16, totem: 'air', group: 'totem:air', gprio: 1, buff: { agi: 6 }, desc: 'Totem powietrza: +Agility.' }),
      T('lava_burst', 'Lava Burst', 'spell', { cost: 40, cd: 8, cast: 2, power: 2.3, dotBonus: 'flame_shock', school: 'fire', prio: 28, desc: 'Talent Elemental (Forever): lawa, +20% gdy na celu jest Flame Shock.' }),
      T('stormstrike', 'Stormstrike', 'strike', { cost: 30, cd: 12, power: 1.6, school: 'nature', prio: 30, desc: 'Talent Enhancement: podwójny cios burzy (Forever: wzmacnia twoje czary Nature).' }),
      T('rage_farseer', 'Rage of the Farseer', 'cooldown', { cd: 180, dur: 25, buff: { haste: 0.3 }, prio: 6, desc: 'Talent Enhancement (Forever): +30% szybkości ataków na 25 s.' }),
      T('water_shield', 'Water Shield', 'proc', { proc: { chance: 0.6, power: 0, on: 'taken', mana: 0.02 }, group: 'eshield', gprio: 2, desc: 'Talent Restoration (Forever): odnawia 2% many przy otrzymaniu ciosu.' }),
      T('natures_swiftness_sh', "Nature's Swiftness", 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, when: ['hp<45'], prio: 3, desc: 'Talent Restoration: następny czar natychmiast.' }),
      T('riptide', 'Riptide', 'hot', { cost: 30, cd: 6, power: 2.4, dur: 15, school: 'nature', desc: 'Talent Restoration (Forever): natychmiastowe leczenie i leczenie w czasie.' }),
      T('mana_tide', 'Mana Tide Totem', 'regen', { cd: 300, power: 0.3, when: ['mana<30'], desc: 'Talent Restoration: odnawia manę.' }),
    ],
  },
  {
    id: 'mage', name: 'Mage', pl: 'Mag', color: '#69CCF0', resource: 'mana', trees: ['Arcane', 'Fire', 'Frost'],
    bonus: { str: 0, agi: 0, sta: 0, int: 3, spi: 2 }, growth: { str: 0.2, agi: 0.3, sta: 0.8, int: 1.8, spi: 1.4 },
    hp: [42, 12], mana: [120, 22], style: 'caster', armor: () => 'cloth',
    weapons: { main: ['Dagger'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    skills: ['Dagger', 'Sword', 'Staff', 'Wand'],
    weights: { int: 2.1, spi: 1.2, sta: 0.9 },
    role: 'Magia dystansowa',
    abilities: [
      A('frost_armor', 'Frost Armor', 1, 'buff', { buff: { armor: 0.3 }, group: 'armor', gprio: 3, desc: 'Lodowy pancerz.' }),
      A('arcane_intellect', 'Arcane Intellect', 1, 'buff', { buff: { int: 6 }, desc: 'Zwiększa Intellect.' }),
      A('fireball', 'Fireball', 1, 'spell', { cost: 30, cast: 3, power: 2.0, school: 'fire', desc: 'Kula ognia.' }),
      A('frostbolt', 'Frostbolt', 4, 'spell', { cost: 25, cast: 2.5, power: 1.75, school: 'frost', desc: 'Lodowy pocisk.' }),
      A('fire_blast', 'Fire Blast', 6, 'spell', { cost: 40, cd: 8, power: 1.2, school: 'fire', desc: 'Natychmiastowy wybuch ognia.' }),
      A('arcane_missiles', 'Arcane Missiles', 8, 'spell', { cost: 85, cast: 3, power: 2.4, school: 'arcane', when: ['mana>60'], desc: 'Seria pocisków tajemnych (kanałowane).' }),
      A('polymorph', 'Polymorph', 8, 'stun', { cost: 40, cd: 30, cast: 1.5, dur: 10, cc: true, when: ['pack'], desc: 'Zamienia jednego wroga z grupy w owcę.' }),
      A('frost_nova', 'Frost Nova', 10, 'stun', { cost: 55, cd: 25, dur: 4, when: ['hp<60'], desc: 'Zamraża wrogów w miejscu.' }),
      A('arcane_explosion', 'Arcane Explosion', 14, 'spell', { cost: 60, power: 0.9, aoe: true, school: 'arcane', when: ['pack'], desc: 'Wybuch magii wokół maga (Forever: słabszy farming AoE).' }),
      A('flamestrike', 'Flamestrike', 16, 'dot', { cost: 80, cast: 3, cd: 8, power: 1.8, dur: 8, aoe: true, school: 'fire', when: ['pack'], desc: 'Słup ognia na grupę.' }),
      A('blizzard', 'Blizzard', 20, 'spell', { cost: 120, cast: 8, power: 3.0, aoe: true, school: 'frost', when: ['pack'], desc: 'Zamieć lodowa (kanałowane).' }),
      A('mana_shield', 'Mana Shield', 20, 'shield', { cost: 40, cd: 15, power: 1.6, school: 'arcane', when: ['hp<60'], desc: 'Tarcza z many.' }),
      A('evocation', 'Evocation', 20, 'regen', { cd: 480, cast: 8, power: 0.6, when: ['mana<20'], desc: 'Odnawia 60% many.' }),
      A('scorch', 'Scorch', 22, 'spell', { cost: 25, cast: 1.5, power: 1.0, school: 'fire', desc: 'Szybki czar ognia.' }),
      A('cone_of_cold', 'Cone of Cold', 26, 'spell', { cost: 70, cd: 10, power: 1.1, aoe: true, school: 'frost', when: ['pack'], desc: 'Stożek zimna.' }),
      A('ice_armor', 'Ice Armor', 30, 'buff', { buff: { armor: 0.6 }, group: 'armor', gprio: 2, desc: 'Mocniejszy lodowy pancerz.' }),
      A('arcane_blast', 'Arcane Blast', 30, 'spell', { cost: 35, cast: 2.5, power: 1.6, school: 'arcane', when: ['mana>40'], desc: 'Forever: czar tajemny, każdy kolejny mocniejszy i droższy (do 4 ładunków).' }),
      A('mage_armor', 'Mage Armor', 34, 'buff', { buff: { castRegen: 0.3 }, group: 'armor', gprio: 1, desc: '30% regeneracji many w walce.' }),
      T('presence_of_mind', 'Presence of Mind', 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, desc: 'Talent Arcane: następny czar natychmiast.' }),
      T('arcane_power', 'Arcane Power', 'cooldown', { cd: 180, dur: 15, buff: { dmg: 0.3, cost: -0.3 }, desc: 'Talent Arcane: +30% obrażeń, +30% kosztu.' }),
      T('pyroblast', 'Pyroblast', 'spell', { cost: 120, cast: 6, power: 3.4, school: 'fire', when: ['opener'], prio: 3, desc: 'Talent Fire: potężny otwierający czar.' }),
      T('blast_wave', 'Blast Wave', 'spell', { cost: 80, cd: 45, power: 1.4, aoe: true, school: 'fire', desc: 'Talent Fire: fala ognia.' }),
      T('combustion', 'Combustion', 'cooldown', { cd: 180, dur: 10, buff: { spellCrit: 0.4 }, desc: 'Talent Fire: dużo trafień krytycznych ogniem.' }),
      T('cold_snap', 'Cold Snap', 'cooldown', { cd: 600, dur: 1, reset: ['frost_nova', 'cone_of_cold', 'ice_barrier', 'ice_block'], when: ['hp<35'], desc: 'Talent Frost: zeruje cooldowny czarów mrozu.' }),
      T('ice_block', 'Ice Block', 'cooldown', { cd: 300, dur: 10, buff: { immune: 1 }, when: ['hp<20'], prio: 2, desc: 'Talent Frost: zamyka maga w lodzie (nietykalność 10 s).' }),
      T('ice_barrier', 'Ice Barrier', 'shield', { cost: 60, cd: 30, power: 3, school: 'frost', desc: 'Talent Frost: lodowa bariera.' }),
    ],
  },
  {
    id: 'warlock', name: 'Warlock', pl: 'Czarnoksiężnik', color: '#9482C9', resource: 'mana', trees: ['Affliction', 'Demonology', 'Destruction'],
    bonus: { str: 0, agi: 0, sta: 1, int: 2, spi: 2 }, growth: { str: 0.3, agi: 0.4, sta: 1.0, int: 1.5, spi: 1.4 },
    hp: [48, 13], mana: [100, 19], style: 'caster', armor: () => 'cloth',
    weapons: { main: ['Dagger'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    skills: ['Dagger', 'Sword', 'Staff', 'Wand'],
    weights: { int: 1.6, sta: 1.4, spi: 1.1 },
    role: 'Klątwy i demony',
    pets: [
      { id: 'imp', name: 'Imp', lvl: 1, dmg: 0.38, school: 'fire' },
      { id: 'voidwalker', name: 'Voidwalker', lvl: 10, tank: true, dmg: 0.22, school: 'shadow' },
      { id: 'succubus', name: 'Succubus', lvl: 20, dmg: 0.55, school: 'shadow' },
      { id: 'felhunter', name: 'Felhunter', lvl: 30, dmg: 0.45, school: 'shadow' },
    ],
    abilities: [
      A('demon_skin', 'Demon Skin', 1, 'buff', { buff: { armor: 0.25 }, group: 'armor', gprio: 2, desc: 'Demoniczna skóra.' }),
      A('shadow_bolt', 'Shadow Bolt', 1, 'spell', { cost: 25, cast: 2.5, power: 1.65, school: 'shadow', desc: 'Pocisk cienia.' }),
      A('immolate', 'Immolate', 1, 'dot', { cost: 25, cast: 2.0, power: 1.6, dur: 15, school: 'fire', desc: 'Podpala wroga.' }),
      A('corruption', 'Corruption', 4, 'dot', { cost: 35, power: 1.6, dur: 12, school: 'shadow', desc: 'Zepsucie w czasie.' }),
      A('curse_weakness', 'Curse of Weakness', 4, 'buff', { buff: { dr: 0.05 }, group: 'curse', gprio: 2, desc: 'Klątwa osłabienia: wróg zadaje mniej obrażeń.' }),
      A('life_tap', 'Life Tap', 6, 'lifetap', { when: ['mana<30', 'hp>60'], prio: 6, desc: 'Zamienia zdrowie na manę.' }),
      A('curse_agony', 'Curse of Agony', 8, 'dot', { cost: 25, power: 1.5, dur: 24, school: 'shadow', group: 'curse', gprio: 1, desc: 'Klątwa zadająca rosnące obrażenia (jedna klątwa naraz).' }),
      A('fear', 'Fear', 8, 'stun', { cost: 30, cd: 30, cast: 1.5, dur: 6, when: ['hp<45'], desc: 'Przeraża wroga.' }),
      A('drain_soul', 'Drain Soul', 10, 'drain', { cost: 30, cast: 4, power: 1.5, school: 'shadow', when: ['mob<25'], prio: 20, desc: 'Wysysa duszę umierającego wroga (kanałowane).' }),
      A('drain_life', 'Drain Life', 14, 'drain', { cost: 40, cast: 5, power: 1.6, heal: 1, school: 'shadow', when: ['hp<60'], prio: 9, desc: 'Wysysa życie (kanałowane).' }),
      A('searing_pain', 'Searing Pain', 18, 'spell', { cost: 30, cast: 1.5, power: 1.1, school: 'fire', desc: 'Szybki czar ognia.' }),
      A('rain_of_fire', 'Rain of Fire', 20, 'spell', { cost: 100, cast: 8, power: 3.0, aoe: true, school: 'fire', when: ['pack'], desc: 'Deszcz ognia (kanałowane).' }),
      A('demon_armor', 'Demon Armor', 20, 'buff', { buff: { armor: 0.4, castRegen: 0.1 }, group: 'armor', gprio: 1, desc: 'Demoniczny pancerz.' }),
      A('hellfire', 'Hellfire', 30, 'spell', { cost: 90, cast: 6, power: 2.6, aoe: true, school: 'fire', when: ['pack', 'hp>60'], desc: 'Piekielny ogień wokół (kanałowane).' }),
      A('shadow_ward', 'Shadow Ward', 32, 'shield', { cost: 30, cd: 30, power: 1.4, school: 'shadow', when: ['hp<60'], desc: 'Osłona przed cieniem.' }),
      A('howl_terror', 'Howl of Terror', 40, 'stun', { cost: 50, cd: 40, cast: 1.5, dur: 5, when: ['pack', 'hp<50'], desc: 'Przeraża wrogów wokół.' }),
      A('drain_hope', 'Drain Hope', 40, 'drain', { cost: 45, cd: 12, cast: 3, power: 1.8, dur: 12, buff: { dot: 0.2 }, school: 'shadow', prio: 34, desc: 'Forever: kanałowany cień, wzmacnia twoje DoT-y na celu (+20% przez 12 s).' }),
      A('death_coil', 'Death Coil', 42, 'drain', { cost: 60, cd: 120, power: 1.4, heal: 1, school: 'shadow', when: ['hp<50'], prio: 5, desc: 'Przeraża i wysysa życie.' }),
      A('soul_fire', 'Soul Fire', 48, 'spell', { cost: 90, cd: 60, cast: 6, power: 3.6, school: 'fire', when: ['opener'], prio: 4, desc: 'Potężny ogień duszy.' }),
      A('summon_imp', 'Summon Imp', 1, 'summon', { desc: 'Imp: zadaje obrażenia ogniem.' }),
      A('summon_voidwalker', 'Summon Voidwalker', 10, 'summon', { desc: 'Voidwalker: przyjmuje ciosy na siebie.' }),
      A('summon_succubus', 'Summon Succubus', 20, 'summon', { desc: 'Succubus: najwięcej obrażeń.' }),
      A('summon_felhunter', 'Summon Felhunter', 30, 'summon', { desc: 'Felhunter: obrażenia cienia.' }),
      T('amplify_curse', 'Amplify Curse', 'cooldown', { cd: 180, dur: 24, buff: { 'ab:curse_agony': 0.5 }, prio: 7, desc: 'Talent Affliction: +50% obrażeń klątwy.' }),
      T('siphon_life', 'Siphon Life', 'dot', { cost: 40, power: 1.4, dur: 15, heal: 0.5, school: 'shadow', desc: 'Talent Affliction: DoT leczący warlocka.' }),
      T('dark_pact', 'Dark Pact', 'regen', { cd: 30, power: 0.15, when: ['mana<30'], prio: 7, desc: 'Talent Affliction: mana od demona.' }),
      T('demonic_sacrifice', 'Demonic Sacrifice', 'buff', { buff: { noPet: 1, dmg: 0.15 }, desc: 'Talent Demonology: poświęca demona, +15% obrażeń.' }),
      T('soul_link', 'Soul Link', 'buff', { buff: { dr: 0.2 }, desc: 'Talent Demonology: 20% obrażeń przejmuje demon.' }),
      T('shadowburn', 'Shadowburn', 'spell', { cost: 50, cd: 15, power: 1.7, school: 'shadow', when: ['mob<20'], prio: 18, desc: 'Talent Destruction: dobijający czar cienia.' }),
      T('conflagrate', 'Conflagrate', 'spell', { cost: 45, cd: 10, power: 1.8, school: 'fire', when: ['dot:immolate'], prio: 32, desc: 'Talent Destruction: wybucha Immolate.' }),
    ],
  },
  {
    id: 'druid', name: 'Druid', pl: 'Druid', color: '#FF7D0A', resource: 'mana', trees: ['Balance', 'Feral Combat', 'Restoration'],
    bonus: { str: 1, agi: 0, sta: 0, int: 2, spi: 2 }, growth: { str: 0.9, agi: 0.9, sta: 1.0, int: 1.2, spi: 1.3 },
    hp: [50, 15], mana: [90, 18], style: 'caster', armor: () => 'leather',
    weapons: { main: ['Mace'], two: ['Staff'], ranged: [], off: ['Orb'] },
    skills: ['Dagger', 'Fist Weapon', 'Mace', 'Maul', 'Staff'],
    weights: { int: 1.4, agi: 1.1, str: 1, sta: 1, spi: 1 },
    role: 'Zmiennokształtny hybryda',
    abilities: [
      A('mark_wild', 'Mark of the Wild', 1, 'buff', { buff: { all: 3, armor: 0.1 }, desc: 'Zwiększa wszystkie atrybuty.' }),
      A('wrath', 'Wrath', 1, 'spell', { cost: 20, cast: 2.0, power: 1.45, school: 'nature', form: 'caster', desc: 'Gniew natury.' }),
      A('healing_touch', 'Healing Touch', 1, 'heal', { cost: 30, cast: 3, cd: 10, power: 2.8, school: 'nature', form: 'caster', desc: 'Leczenie.' }),
      A('moonfire', 'Moonfire', 4, 'dot', { cost: 25, power: 1.4, dur: 9, school: 'arcane', form: 'caster', desc: 'Promień księżyca.' }),
      A('rejuvenation', 'Rejuvenation', 4, 'hot', { cost: 25, power: 2.0, dur: 12, school: 'nature', form: 'caster', desc: 'Leczenie w czasie.' }),
      A('thorns', 'Thorns', 6, 'proc', { proc: { chance: 1, power: 0.1, on: 'taken' }, school: 'nature', desc: 'Kolce raniące atakujących.' }),
      A('entangling_roots', 'Entangling Roots', 8, 'stun', { cost: 50, cd: 20, cast: 1.5, dur: 3, form: 'caster', when: ['hp<50'], desc: 'Oplata wroga korzeniami.' }),
      A('bear_form', 'Bear Form', 10, 'form', { form: 'bear', desc: 'Forma niedźwiedzia: Rage, dużo pancerza i HP.' }),
      A('maul', 'Maul', 10, 'strike', { cost: 15, power: 1.0, school: 'physical', form: 'bear', when: ['res>=25'], desc: 'Potężny cios łapą.' }),
      A('demoralizing_roar', 'Demoralizing Roar', 10, 'buff', { buff: { dr: 0.05 }, form: 'bear', desc: 'Osłabia ataki wrogów.' }),
      A('enrage', 'Enrage', 12, 'cooldown', { cd: 60, gain: 20, dur: 10, form: 'bear', when: ['opener'], prio: 2, desc: 'Natychmiast daje 20 Rage.' }),
      A('regrowth', 'Regrowth', 12, 'heal', { cost: 45, cast: 2, cd: 12, power: 2.6, school: 'nature', form: 'caster', desc: 'Leczenie z efektem w czasie.' }),
      A('bash', 'Bash', 14, 'stun', { cost: 10, cd: 60, dur: 3, melee: true, form: 'bear', desc: 'Ogłusza wroga na 3 s.' }),
      A('swipe', 'Swipe', 16, 'strike', { cost: 20, power: 0.6, aoe: true, school: 'physical', form: 'bear', when: ['pack'], desc: 'Zamach na wszystkich wokół.' }),
      A('faerie_fire', 'Faerie Fire', 18, 'buff', { buff: { meleeDmg: 0.04 }, desc: 'Ogień wróżek: wróg traci pancerz (+4% obrażeń fizycznych).' }),
      A('cat_form', 'Cat Form', 20, 'form', { form: 'cat', desc: 'Forma kota: Energy, punkty kombinacji, szybkie ciosy.' }),
      A('claw', 'Claw', 20, 'strike', { cost: 40, power: 0.9, cp: 1, school: 'physical', form: 'cat', desc: 'Pazury (daje punkt kombinacji).' }),
      A('rip', 'Rip', 20, 'finisher', { cost: 30, power: 0.6, dur: 12, school: 'physical', form: 'cat', when: ['noDot', 'mob>50'], prio: 24, desc: 'Finisher: krwawienie.' }),
      A('starfire', 'Starfire', 20, 'spell', { cost: 90, cast: 3, power: 2.4, school: 'arcane', form: 'caster', when: ['mana>40'], desc: 'Potężny gwiezdny ogień.' }),
      A('shred', 'Shred', 22, 'strike', { cost: 60, power: 1.5, cp: 1, school: 'physical', form: 'cat', when: ['stunned'], prio: 50, desc: 'Rozszarpanie od tyłu.' }),
      A('rake', 'Rake', 24, 'dot', { cost: 35, power: 0.9, dur: 9, cp: 1, melee: true, school: 'physical', form: 'cat', desc: 'Krwawienie (daje punkt kombinacji).' }),
      A('tigers_fury', "Tiger's Fury", 24, 'cooldown', { cost: 30, cd: 30, dur: 6, buff: { dmg: 0.15 }, form: 'cat', when: ['res>=50'], desc: '+15% obrażeń na 6 s.' }),
      A('tranquility', 'Tranquility', 30, 'heal', { cost: 80, cd: 300, cast: 5, power: 4.5, school: 'nature', form: 'caster', when: ['hp<35'], desc: 'Kanałowane leczenie wokół druida.' }),
      A('ravage', 'Ravage', 32, 'strike', { cost: 60, power: 2.3, cp: 1, school: 'physical', form: 'cat', when: ['opener'], prio: 2, desc: 'Otwarcie z ukrycia: potężny cios.' }),
      A('ferocious_bite', 'Ferocious Bite', 32, 'finisher', { cost: 35, power: 0.75, school: 'physical', form: 'cat', desc: 'Finisher: potężne ugryzienie.' }),
      A('pounce', 'Pounce', 36, 'stun', { cost: 50, dur: 3, cp: 1, melee: true, form: 'cat', when: ['opener'], prio: 1, desc: 'Otwarcie z ukrycia: ogłusza na 3 s.' }),
      A('frenzied_regen', 'Frenzied Regeneration', 36, 'heal', { cd: 180, healPct: 0.25, form: 'bear', when: ['hp<40'], prio: 3, desc: 'Zamienia Rage w zdrowie (+25% HP).' }),
      A('innervate', 'Innervate', 40, 'regen', { cd: 360, power: 0.5, form: 'caster', when: ['mana<20'], desc: 'Szybka regeneracja many.' }),
      A('hurricane', 'Hurricane', 40, 'spell', { cost: 120, cd: 60, cast: 10, power: 3.5, aoe: true, school: 'nature', form: 'caster', when: ['pack'], desc: 'Huragan (kanałowane).' }),
      A('barkskin', 'Barkskin', 44, 'cooldown', { cd: 60, dur: 12, buff: { dr: 0.2 }, when: ['hp<50'], desc: '−20% otrzymywanych obrażeń przez 12 s.' }),
      T('moonkin_form', 'Moonkin Form', 'form', { form: 'moonkin', desc: 'Talent Balance: forma sowy (pancerz, krytyki czarów).' }),
      T('feral_charge', 'Feral Charge', 'stun', { cost: 5, cd: 15, dur: 1, closes: true, forms: ['bear', 'cat'], when: ['opener'], prio: 1, desc: 'Talent Feral: szarża niedźwiedzia lub skok kota (Forever).' }),
      T('mangle', 'Mangle', 'strike', { cost: 40, cd: 6, power: 1.35, cp: 1, school: 'physical', forms: ['bear', 'cat'], prio: 31, desc: 'Talent Feral: rozszarpanie (kot i niedźwiedź).' }),
      T('leader_pack', 'Leader of the Pack', 'buff', { buff: { crit: 0.03 }, desc: 'Talent Feral: +3% trafień krytycznych.' }),
      T('berserk', 'Berserk', 'cooldown', { cd: 180, dur: 15, buff: { crit: 0.5, sweep: 1 }, forms: ['bear', 'cat'], when: ['boss'], prio: 5, desc: 'Talent Feral (Forever): wielki cooldown, Mangle w wielu celach i dużo krytyków.' }),
      T('insect_swarm', 'Insect Swarm', 'dot', { cost: 30, power: 1.3, dur: 12, school: 'nature', form: 'caster', desc: 'Talent Restoration: rój owadów.' }),
      T('natures_swiftness_dr', "Nature's Swiftness", 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, when: ['hp<45'], prio: 3, desc: 'Talent Restoration: następny czar natychmiast.' }),
      T('swiftmend', 'Swiftmend', 'heal', { cost: 40, cd: 15, power: 2.8, school: 'nature', form: 'caster', when: ['hp<45', 'hot'], prio: 2, desc: 'Talent Restoration: natychmiastowe leczenie.' }),
    ],
  },
]

export const classById = (id: ClassId) => CLASSES.find((c) => c.id === id)!
export const startSkills = (c: ClassDef) => [...new Set([...c.weapons.main, ...c.weapons.two, ...c.weapons.ranged])].filter((w) => c.skills.includes(w))

// Czy umiejętność wymaga zwarcia
export const isMelee = (a: Ability) => a.melee ?? (a.kind === 'strike' || a.kind === 'finisher' || a.kind === 'execute')

// Rangi umiejętności: kolejne rangi co 6 poziomów (ataki/czary) lub co 10 (buffy, kontrola, totemy)
export function ranksOf(a: Ability): number[] {
  if (a.talent || a.kind === 'form' || a.kind === 'summon' || a.healPct || a.reset || a.id === 'call_elements' || a.id === 'totemic_projection') return [a.lvl]
  const step = a.kind === 'buff' || a.kind === 'stun' || a.kind === 'cooldown' || a.kind === 'lifetap' || a.kind === 'proc' || a.kind === 'regen' || a.kind === 'totem' ? 10 : 6
  const out: number[] = []
  for (let l = a.lvl; l <= 60; l += step) out.push(l)
  return out
}
// Koszt nauki rangi u trenera (miedziaki), skala jak w Classicu: ~4 s na 10 poz., ~4 g na 60
export const trainCost = (lvl: number) => (lvl <= 1 ? 0 : Math.max(10, Math.round(Math.pow(lvl, 2.6))))
