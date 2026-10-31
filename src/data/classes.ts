// 9 klas z WoW Classic. Umiejętności i poziomy nauki według oryginału (pierwsze rangi), umiejętności
// z talentów oznaczone `talent`. Obrażenia uproszczone do skali idlera.
import type { Stats } from './races'

export type ClassId = 'warrior' | 'paladin' | 'hunter' | 'rogue' | 'priest' | 'shaman' | 'mage' | 'warlock' | 'druid'
export type Resource = 'rage' | 'energy' | 'mana'
export type School = 'physical' | 'fire' | 'frost' | 'arcane' | 'shadow' | 'holy' | 'nature'
export type ArmorType = 'cloth' | 'leather' | 'mail' | 'plate'
export type Form = 'caster' | 'bear' | 'cat' | 'moonkin'

// Warunki użycia w rotacji (sprawdzane w symulacji)
export type Cond =
  | 'hp<20' | 'hp<35' | 'hp<45' | 'hp<50' | 'hp<60' | 'hp<75' | 'hp>60'
  | 'mob<20' | 'mob>30' | 'mob>50' | 'noDot' | 'dodged' | 'cp>=2' | 'cp>=3' | 'cp5' | 'pack' | 'opener'
  | 'mana<20' | 'mana<30' | 'mana>40' | 'mana>60' | 'res>=25' | 'res>=30' | 'res>=40' | 'res>=50'
  | 'noShield' | 'noHot' | 'hot' | 'undead' | 'stunned' | 'notStunned' | 'noTemp' | 'lvl<10' | 'dot:immolate'

export type Kind =
  | 'strike' | 'spell' | 'dot' | 'heal' | 'hot' | 'finisher' | 'buff' | 'stun' | 'shield' | 'lifetap' | 'execute'
  | 'cooldown' | 'drain' | 'regen' | 'proc' | 'form' | 'summon'

export type BuffFx = Partial<{
  ap: number; sta: number; int: number; spi: number; all: number; armor: number; crit: number; spellCrit: number; dodge: number
  dmg: number; dr: number; castRegen: number; lifesteal: number; noPet: number; shadow: number; haste: number; pet: number; cost: number
  energy: number; instant: number; petDmg: number
}>

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
  buff?: BuffFx // pasywne (kind 'buff') albo czasowe (kind 'cooldown')
  gain?: number // zyskany zasób (Charge, Bloodrage)
  stun?: number // dodatkowe ogłuszenie (Charge) / ogłuszenie za CP (Kidney Shot)
  heal?: number // drain: część obrażeń wraca jako HP
  proc?: { chance: number; power: number; on: 'hit' | 'taken'; extra?: boolean }
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
  weapons: { main: string[]; two: string[]; ranged: string[]; off: string[] }
  weights: Partial<Record<keyof Stats | 'dps' | 'armor', number>>
  pets?: PetDef[]
  abilities: Ability[]
  role: string
  trees: [string, string, string]
}

const plateAt40 = (a: ArmorType, b: ArmorType) => (lvl: number) => (lvl >= 40 ? b : a)
const A = (id: string, name: string, lvl: number, kind: Kind, o: Omit<Ability, 'id' | 'name' | 'lvl' | 'kind'>): Ability => ({ id, name, lvl, kind, ...o })
const T = (id: string, name: string, kind: Kind, o: Omit<Ability, 'id' | 'name' | 'lvl' | 'kind'>): Ability => ({ id, name, lvl: 10, kind, talent: true, ...o })

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior', name: 'Warrior', pl: 'Wojownik', color: '#C79C6E', resource: 'rage', trees: ['Arms', 'Fury', 'Protection'],
    bonus: { str: 3, agi: 0, sta: 2, int: 0, spi: 0 }, growth: { str: 1.6, agi: 0.9, sta: 1.4, int: 0.15, spi: 0.35 },
    hp: [60, 18], style: 'melee', armor: plateAt40('mail', 'plate'), weapons: { main: ['Sword', 'Axe', 'Mace', 'Dagger'], two: ['Greatsword', 'Greataxe', 'Maul', 'Staff'], ranged: ['Bow', 'Gun', 'Crossbow', 'Thrown'], off: ['Shield'] },
    weights: { str: 2.2, agi: 1.2, sta: 1.1, armor: 0.04, dps: 14 },
    role: 'Tank / walka wręcz',
    abilities: [
      A('battle_shout', 'Battle Shout', 1, 'buff', { buff: { ap: 15 }, desc: 'Okrzyk zwiększający siłę ataku.' }),
      A('heroic_strike', 'Heroic Strike', 1, 'strike', { cost: 15, power: 0.9, school: 'physical', when: ['res>=30'], prio: 70, desc: 'Mocniejszy cios bronią (zużywa nadmiar Rage).' }),
      A('charge', 'Charge', 4, 'strike', { cd: 15, power: 0.3, gain: 15, stun: 1, school: 'physical', when: ['opener'], prio: 1, desc: 'Szarża na wroga: ogłusza na 1 s i daje 15 Rage.' }),
      A('rend', 'Rend', 4, 'dot', { cost: 10, power: 1.1, dur: 9, school: 'physical', desc: 'Krwawienie przez 9 s.' }),
      A('thunder_clap', 'Thunder Clap', 6, 'strike', { cost: 20, cd: 4, power: 0.6, aoe: true, school: 'physical', when: ['pack'], desc: 'Uderzenie we wszystkich wrogów wokół.' }),
      A('bloodrage', 'Bloodrage', 10, 'cooldown', { cd: 60, gain: 20, dur: 1, when: ['opener'], prio: 2, desc: 'Natychmiast daje 20 Rage.' }),
      A('overpower', 'Overpower', 12, 'strike', { cost: 5, cd: 5, power: 1.0, school: 'physical', when: ['dodged'], prio: 20, desc: 'Kontratak po uniku wroga.' }),
      A('sunder_armor', 'Sunder Armor', 10, 'strike', { cost: 15, power: 0.45, school: 'physical', when: ['res>=50'], prio: 75, desc: 'Rozbija pancerz wroga.' }),
      A('cleave', 'Cleave', 20, 'strike', { cost: 20, power: 0.8, aoe: true, school: 'physical', when: ['pack', 'res>=30'], prio: 40, desc: 'Cios w kilku wrogów naraz.' }),
      A('execute', 'Execute', 24, 'execute', { cost: 15, power: 2.4, school: 'physical', desc: 'Dobija wroga poniżej 20% HP.' }),
      A('slam', 'Slam', 30, 'strike', { cost: 15, cast: 1.5, power: 1.3, school: 'physical', when: ['res>=40'], prio: 65, desc: 'Potężne uderzenie (1,5 s).' }),
      A('whirlwind', 'Whirlwind', 36, 'strike', { cost: 25, cd: 10, power: 1.1, aoe: true, school: 'physical', prio: 35, desc: 'Wir ostrzy trafiający wszystkich wokół.' }),
      T('mortal_strike', 'Mortal Strike', 'strike', { cost: 30, cd: 6, power: 1.7, school: 'physical', prio: 30, desc: 'Talent Arms: potężny cios.' }),
      T('bloodthirst', 'Bloodthirst', 'strike', { cost: 30, cd: 6, power: 1.5, heal: 0.1, school: 'physical', prio: 30, desc: 'Talent Fury: cios, który leczy.' }),
      T('shield_slam', 'Shield Slam', 'strike', { cost: 20, cd: 6, power: 1.4, school: 'physical', prio: 30, desc: 'Talent Protection: uderzenie tarczą.' }),
    ],
  },
  {
    id: 'paladin', name: 'Paladin', pl: 'Paladyn', color: '#F58CBA', resource: 'mana', trees: ['Holy', 'Protection', 'Retribution'],
    bonus: { str: 2, agi: 0, sta: 2, int: 0, spi: 1 }, growth: { str: 1.4, agi: 0.6, sta: 1.3, int: 0.8, spi: 0.8 },
    hp: [55, 17], mana: [60, 14], style: 'melee', armor: plateAt40('mail', 'plate'), weapons: { main: ['Mace', 'Sword', 'Axe'], two: ['Greatsword', 'Greataxe', 'Maul'], ranged: [], off: ['Shield'] },
    weights: { str: 2, int: 1, sta: 1.1, spi: 0.5, armor: 0.04, dps: 13 },
    role: 'Tank / leczenie / walka wręcz',
    abilities: [
      A('devotion_aura', 'Devotion Aura', 1, 'buff', { buff: { armor: 0.15 }, desc: 'Aura zwiększająca pancerz.' }),
      A('seal_righteousness', 'Seal of Righteousness', 1, 'proc', { proc: { chance: 1, power: 0.12, on: 'hit' }, school: 'holy', desc: 'Każdy cios zadaje dodatkowe obrażenia Holy.' }),
      A('holy_light', 'Holy Light', 1, 'heal', { cost: 35, cast: 2.5, power: 2.6, school: 'holy', desc: 'Silne leczenie.' }),
      A('blessing_might', 'Blessing of Might', 4, 'buff', { buff: { ap: 20 }, desc: 'Błogosławieństwo siły ataku.' }),
      A('judgement', 'Judgement', 4, 'spell', { cost: 25, cd: 8, power: 1.3, school: 'holy', desc: 'Uwalnia moc pieczęci.' }),
      A('seal_crusader', 'Seal of the Crusader', 6, 'buff', { buff: { ap: 15, haste: 0.1 }, desc: 'Szybsze ataki i więcej siły ataku.' }),
      A('hammer_justice', 'Hammer of Justice', 8, 'stun', { cost: 30, cd: 60, dur: 3, desc: 'Ogłusza wroga na 3 s.' }),
      A('lay_on_hands', 'Lay on Hands', 10, 'heal', { cd: 600, power: 9, school: 'holy', when: ['hp<20'], prio: 1, desc: 'Pełne uleczenie w krytycznej chwili.' }),
      A('blessing_wisdom', 'Blessing of Wisdom', 14, 'buff', { buff: { castRegen: 0.15 }, desc: 'Regeneracja many w walce.' }),
      A('retribution_aura', 'Retribution Aura', 16, 'proc', { proc: { chance: 1, power: 0.12, on: 'taken' }, school: 'holy', desc: 'Raniący cię wróg dostaje obrażenia Holy.' }),
      A('exorcism', 'Exorcism', 20, 'spell', { cost: 60, cd: 15, power: 1.8, school: 'holy', when: ['undead'], desc: 'Silny cios przeciw nieumarłym i demonom.' }),
      A('flash_of_light', 'Flash of Light', 20, 'heal', { cost: 20, cast: 1.5, power: 1.6, school: 'holy', when: ['hp<60'], desc: 'Szybkie leczenie.' }),
      A('holy_wrath', 'Holy Wrath', 50, 'spell', { cost: 70, cd: 60, cast: 2, power: 1.6, aoe: true, school: 'holy', when: ['undead'], desc: 'Gniew Światła na nieumarłych wokół.' }),
      T('consecration', 'Consecration', 'dot', { cost: 40, cd: 8, power: 1.2, dur: 8, aoe: true, school: 'holy', desc: 'Talent Holy: uświęca ziemię (AoE).' }),
      T('holy_shock', 'Holy Shock', 'spell', { cost: 40, cd: 30, power: 1.6, school: 'holy', desc: 'Talent Holy: natychmiastowy cios Światła.' }),
      T('holy_shield', 'Holy Shield', 'cooldown', { cost: 25, cd: 10, dur: 10, buff: { dodge: 0.3 }, desc: 'Talent Protection: +30% blokowania (unik).' }),
      T('seal_command', 'Seal of Command', 'proc', { proc: { chance: 0.25, power: 0.9, on: 'hit' }, school: 'holy', desc: 'Talent Retribution: szansa na potężny cios Holy.' }),
      T('repentance', 'Repentance', 'stun', { cost: 30, cd: 60, dur: 6, desc: 'Talent Retribution: obezwładnia wroga.' }),
    ],
  },
  {
    id: 'hunter', name: 'Hunter', pl: 'Łowca', color: '#ABD473', resource: 'mana', trees: ['Beast Mastery', 'Marksmanship', 'Survival'],
    bonus: { str: 0, agi: 3, sta: 1, int: 0, spi: 1 }, growth: { str: 0.6, agi: 1.7, sta: 1.2, int: 0.6, spi: 0.6 },
    hp: [50, 15], mana: [70, 12], style: 'ranged', armor: plateAt40('leather', 'mail'), weapons: { main: ['Sword', 'Axe', 'Dagger'], two: ['Greataxe', 'Staff'], ranged: ['Bow', 'Gun', 'Crossbow'], off: [] },
    weights: { agi: 2.5, sta: 1, int: 0.5, str: 0.3, armor: 0.02, dps: 14 },
    role: 'Walka dystansowa z pupilem',
    pets: [{ id: 'beast', name: 'Oswojona bestia', lvl: 10, tank: true, dmg: 0.4, school: 'physical' }],
    abilities: [
      A('raptor_strike', 'Raptor Strike', 1, 'strike', { cost: 15, cd: 6, power: 0.8, school: 'physical', when: ['lvl<10'], desc: 'Cios wręcz.' }),
      A('aspect_monkey', 'Aspect of the Monkey', 4, 'buff', { buff: { dodge: 0.05 }, desc: '+5% uniku.' }),
      A('serpent_sting', 'Serpent Sting', 4, 'dot', { cost: 15, power: 1.2, dur: 15, school: 'nature', desc: 'Trucizna przez 15 s.' }),
      A('arcane_shot', 'Arcane Shot', 6, 'spell', { cost: 25, cd: 6, power: 1.0, school: 'arcane', desc: 'Natychmiastowy strzał magiczny.' }),
      A('hunters_mark', "Hunter's Mark", 6, 'buff', { buff: { ap: 20 }, desc: 'Zwiększa obrażenia dystansowe.' }),
      A('concussive_shot', 'Concussive Shot', 8, 'stun', { cost: 20, cd: 12, dur: 2, when: ['hp<50'], desc: 'Spowalnia wroga.' }),
      A('aspect_hawk', 'Aspect of the Hawk', 10, 'buff', { buff: { ap: 30 }, desc: 'Duży bonus do siły ataku dystansowego.' }),
      A('mongoose_bite', 'Mongoose Bite', 16, 'strike', { cost: 20, cd: 5, power: 1.0, school: 'physical', when: ['dodged'], desc: 'Kontra po uniku.' }),
      A('multi_shot', 'Multi-Shot', 18, 'spell', { cost: 60, cd: 10, power: 1.0, aoe: true, school: 'physical', desc: 'Strzał w kilka celów.' }),
      A('rapid_fire', 'Rapid Fire', 26, 'cooldown', { cost: 30, cd: 300, dur: 15, buff: { haste: 0.4 }, desc: '+40% szybkości strzałów na 15 s.' }),
      A('explosive_trap', 'Explosive Trap', 34, 'dot', { cost: 40, cd: 15, power: 1.4, dur: 10, aoe: true, school: 'fire', when: ['pack'], desc: 'Pułapka podpalająca grupę.' }),
      A('volley', 'Volley', 40, 'spell', { cost: 80, cast: 6, power: 2.4, aoe: true, school: 'arcane', when: ['pack'], desc: 'Grad strzał na obszar (kanałowane).' }),
      T('aimed_shot', 'Aimed Shot', 'spell', { cost: 45, cd: 6, cast: 3, power: 2.2, school: 'physical', desc: 'Talent Marksmanship: precyzyjny strzał.' }),
      T('trueshot_aura', 'Trueshot Aura', 'buff', { buff: { ap: 45 }, desc: 'Talent Marksmanship: aura siły ataku.' }),
      T('intimidation', 'Intimidation', 'stun', { cost: 20, cd: 60, dur: 3, desc: 'Talent Beast Mastery: pupil ogłusza wroga.' }),
      T('bestial_wrath', 'Bestial Wrath', 'cooldown', { cost: 30, cd: 120, dur: 18, buff: { petDmg: 0.5 }, desc: 'Talent Beast Mastery: pupil +50% obrażeń.' }),
      T('wyvern_sting', 'Wyvern Sting', 'stun', { cost: 40, cd: 120, dur: 8, desc: 'Talent Survival: usypia wroga.' }),
    ],
  },
  {
    id: 'rogue', name: 'Rogue', pl: 'Łotrzyk', color: '#FFF569', resource: 'energy', trees: ['Assassination', 'Combat', 'Subtlety'],
    bonus: { str: 1, agi: 3, sta: 1, int: 0, spi: 0 }, growth: { str: 1.0, agi: 1.8, sta: 1.1, int: 0.25, spi: 0.4 },
    hp: [55, 16], style: 'melee', armor: () => 'leather', weapons: { main: ['Dagger', 'Sword', 'Mace'], two: [], ranged: ['Bow', 'Gun', 'Crossbow', 'Thrown'], off: [] },
    weights: { agi: 2.3, str: 1, sta: 0.9, armor: 0.02, dps: 15 },
    role: 'Walka wręcz z ukrycia',
    abilities: [
      A('sinister_strike', 'Sinister Strike', 1, 'strike', { cost: 45, power: 0.85, cp: 1, school: 'physical', desc: 'Cios dający punkt kombinacji.' }),
      A('eviscerate', 'Eviscerate', 1, 'finisher', { cost: 35, power: 0.65, school: 'physical', desc: 'Finisher: obrażenia za każdy punkt kombinacji.' }),
      A('backstab', 'Backstab', 4, 'strike', { cost: 60, power: 1.35, cp: 1, school: 'physical', when: ['stunned'], prio: 50, desc: 'Cios w plecy (gdy wróg jest ogłuszony).' }),
      A('gouge', 'Gouge', 6, 'stun', { cost: 45, cd: 10, dur: 4, when: ['hp<45'], desc: 'Obezwładnia wroga.' }),
      A('evasion', 'Evasion', 8, 'cooldown', { cd: 300, dur: 15, buff: { dodge: 0.5 }, when: ['hp<50'], desc: '+50% szansy na unik przez 15 s.' }),
      A('slice_dice', 'Slice and Dice', 10, 'buff', { buff: { haste: 0.2 }, desc: 'Szybsze ataki (stale utrzymywane).' }),
      A('rupture', 'Rupture', 20, 'finisher', { cost: 25, power: 0.6, dur: 12, school: 'physical', when: ['noDot', 'mob>50'], prio: 24, desc: 'Finisher: krwawienie zależne od punktów kombinacji.' }),
      A('instant_poison', 'Instant Poison', 20, 'proc', { proc: { chance: 0.2, power: 0.35, on: 'hit' }, school: 'nature', desc: 'Trucizna na broni: szansa na obrażenia Nature.' }),
      A('kidney_shot', 'Kidney Shot', 30, 'finisher', { cost: 25, cd: 20, power: 0, stun: 1, when: ['hp<60', 'notStunned'], prio: 15, desc: 'Finisher: ogłusza na 1 s za każdy punkt kombinacji.' }),
      A('deadly_poison', 'Deadly Poison', 30, 'proc', { proc: { chance: 0.3, power: 0.3, on: 'hit' }, school: 'nature', desc: 'Trucizna na broni: obrażenia w czasie.' }),
      T('cold_blood', 'Cold Blood', 'cooldown', { cd: 180, dur: 3, buff: { crit: 1 }, when: ['cp5'], prio: 5, desc: 'Talent Assassination: następny cios krytyczny.' }),
      T('blade_flurry', 'Blade Flurry', 'cooldown', { cost: 25, cd: 120, dur: 15, buff: { haste: 0.2 }, desc: 'Talent Combat: +20% szybkości ataków.' }),
      T('adrenaline_rush', 'Adrenaline Rush', 'cooldown', { cd: 300, dur: 15, buff: { energy: 1 }, desc: 'Talent Combat: podwójna regeneracja Energy.' }),
      T('ghostly_strike', 'Ghostly Strike', 'strike', { cost: 40, cd: 20, power: 1.25, cp: 1, school: 'physical', desc: 'Talent Subtlety: widmowy cios.' }),
      T('hemorrhage', 'Hemorrhage', 'strike', { cost: 35, power: 1.15, cp: 1, school: 'physical', prio: 55, desc: 'Talent Subtlety: krwawiący cios.' }),
    ],
  },
  {
    id: 'priest', name: 'Priest', pl: 'Kapłan', color: '#FFFFFF', resource: 'mana', trees: ['Discipline', 'Holy', 'Shadow'],
    bonus: { str: 0, agi: 0, sta: 0, int: 2, spi: 3 }, growth: { str: 0.2, agi: 0.3, sta: 0.9, int: 1.5, spi: 1.6 },
    hp: [45, 13], mana: [110, 20], style: 'caster', armor: () => 'cloth', weapons: { main: ['Mace', 'Dagger'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    weights: { int: 1.8, spi: 1.8, sta: 0.9 },
    role: 'Leczenie / magia cienia',
    abilities: [
      A('pw_fortitude', 'Power Word: Fortitude', 1, 'buff', { buff: { sta: 8 }, desc: 'Zwiększa Stamina.' }),
      A('smite', 'Smite', 1, 'spell', { cost: 20, cast: 2.5, power: 1.6, school: 'holy', desc: 'Święte obrażenia.' }),
      A('lesser_heal', 'Lesser Heal', 1, 'heal', { cost: 30, cast: 2.5, power: 2.4, school: 'holy', desc: 'Leczenie.' }),
      A('sw_pain', 'Shadow Word: Pain', 4, 'dot', { cost: 25, power: 1.5, dur: 18, school: 'shadow', desc: 'Obrażenia cienia przez 18 s.' }),
      A('pw_shield', 'Power Word: Shield', 6, 'shield', { cost: 45, cd: 15, power: 2.0, school: 'holy', desc: 'Tarcza pochłaniająca obrażenia.' }),
      A('renew', 'Renew', 8, 'hot', { cost: 30, power: 2.2, dur: 15, school: 'holy', desc: 'Leczenie w czasie.' }),
      A('mind_blast', 'Mind Blast', 10, 'spell', { cost: 50, cd: 8, cast: 1.5, power: 1.9, school: 'shadow', desc: 'Silny czar cienia.' }),
      A('inner_fire', 'Inner Fire', 12, 'buff', { buff: { armor: 0.3, ap: 15 }, desc: 'Wewnętrzny ogień: pancerz.' }),
      A('psychic_scream', 'Psychic Scream', 14, 'stun', { cost: 40, cd: 30, dur: 4, when: ['hp<45'], desc: 'Odstrasza wrogów na 4 s.' }),
      A('heal', 'Heal', 16, 'heal', { cost: 45, cast: 3, power: 3.4, school: 'holy', desc: 'Mocniejsze leczenie.' }),
      A('flash_heal', 'Flash Heal', 20, 'heal', { cost: 35, cast: 1.5, power: 2.2, school: 'holy', when: ['hp<35'], prio: 4, desc: 'Szybkie leczenie.' }),
      A('holy_fire', 'Holy Fire', 20, 'spell', { cost: 50, cd: 10, cast: 3.5, power: 2.3, school: 'holy', desc: 'Święty ogień.' }),
      A('greater_heal', 'Greater Heal', 40, 'heal', { cost: 70, cast: 3, power: 4.6, school: 'holy', desc: 'Wielkie leczenie.' }),
      T('inner_focus', 'Inner Focus', 'cooldown', { cd: 180, dur: 4, buff: { spellCrit: 0.25, cost: -1 }, desc: 'Talent Discipline: darmowy, mocny czar.' }),
      T('power_infusion', 'Power Infusion', 'cooldown', { cd: 180, dur: 15, buff: { dmg: 0.2 }, desc: 'Talent Discipline: +20% obrażeń.' }),
      T('divine_spirit', 'Divine Spirit', 'buff', { buff: { spi: 20 }, desc: 'Talent Discipline: dużo Spirit.' }),
      T('holy_nova', 'Holy Nova', 'spell', { cost: 50, power: 0.9, aoe: true, school: 'holy', when: ['pack'], desc: 'Talent Holy: wybuch Światła wokół.' }),
      T('lightwell', 'Lightwell', 'hot', { cost: 60, cd: 180, power: 3.5, dur: 12, school: 'holy', desc: 'Talent Holy: studnia światła.' }),
      T('mind_flay', 'Mind Flay', 'spell', { cost: 45, cast: 3, power: 2.1, school: 'shadow', desc: 'Talent Shadow: kanałowany czar cienia.' }),
      T('vampiric_embrace', 'Vampiric Embrace', 'buff', { buff: { lifesteal: 0.15 }, desc: 'Talent Shadow: obrażenia cienia leczą.' }),
      T('shadowform', 'Shadowform', 'buff', { buff: { shadow: 0.15, dr: 0.15 }, desc: 'Talent Shadow: +15% cienia, -15% obrażeń; blokuje czary Holy.' }),
    ],
  },
  {
    id: 'shaman', name: 'Shaman', pl: 'Szaman', color: '#0070DE', resource: 'mana', trees: ['Elemental', 'Enhancement', 'Restoration'],
    bonus: { str: 1, agi: 0, sta: 1, int: 1, spi: 2 }, growth: { str: 1.1, agi: 0.6, sta: 1.2, int: 1.0, spi: 1.1 },
    hp: [55, 16], mana: [80, 16], style: 'melee', armor: plateAt40('leather', 'mail'), weapons: { main: ['Mace', 'Axe', 'Dagger'], two: ['Staff', 'Maul', 'Greataxe'], ranged: [], off: ['Shield', 'Orb'] },
    weights: { str: 1.4, int: 1.4, agi: 0.8, sta: 1, spi: 0.6, armor: 0.03, dps: 12 },
    role: 'Żywioły / leczenie / walka wręcz',
    abilities: [
      A('rockbiter', 'Rockbiter Weapon', 1, 'buff', { buff: { ap: 20 }, desc: 'Nasyca broń mocą ziemi (+siła ataku).' }),
      A('lightning_bolt', 'Lightning Bolt', 1, 'spell', { cost: 25, cast: 2.0, power: 1.5, school: 'nature', when: ['mana>40'], desc: 'Błyskawica. Wyłącz, by grać czysto w zwarciu.' }),
      A('healing_wave', 'Healing Wave', 1, 'heal', { cost: 30, cast: 2.5, power: 2.5, school: 'nature', desc: 'Leczenie.' }),
      A('earth_shock', 'Earth Shock', 4, 'spell', { cost: 30, cd: 6, power: 1.1, school: 'nature', desc: 'Natychmiastowy wstrząs ziemi.' }),
      A('lightning_shield', 'Lightning Shield', 8, 'proc', { proc: { chance: 0.5, power: 0.3, on: 'taken' }, school: 'nature', desc: 'Kule błyskawic ranią atakujących.' }),
      A('strength_earth', 'Strength of Earth Totem', 10, 'buff', { buff: { ap: 20 }, desc: 'Totem siły.' }),
      A('flametongue', 'Flametongue Weapon', 10, 'proc', { proc: { chance: 0.35, power: 0.35, on: 'hit' }, school: 'fire', desc: 'Broń zadaje dodatkowe obrażenia ognia.' }),
      A('searing_totem', 'Searing Totem', 10, 'dot', { cost: 40, cd: 30, power: 1.6, dur: 30, school: 'fire', desc: 'Totem atakujący wroga.' }),
      A('flame_shock', 'Flame Shock', 10, 'dot', { cost: 50, cd: 6, power: 1.5, dur: 12, school: 'fire', desc: 'Ogień w czasie.' }),
      A('frost_shock', 'Frost Shock', 20, 'spell', { cost: 45, cd: 6, power: 1.3, school: 'frost', desc: 'Lodowy wstrząs.' }),
      A('lesser_healing_wave', 'Lesser Healing Wave', 20, 'heal', { cost: 25, cast: 1.5, power: 1.7, school: 'nature', when: ['hp<35'], prio: 4, desc: 'Szybkie leczenie.' }),
      A('magma_totem', 'Magma Totem', 26, 'dot', { cost: 50, cd: 20, power: 1.6, dur: 20, aoe: true, school: 'fire', when: ['pack'], desc: 'Totem ognia raniący grupę.' }),
      A('windfury', 'Windfury Weapon', 30, 'proc', { proc: { chance: 0.2, power: 1, on: 'hit', extra: true }, school: 'physical', desc: '20% szansy na dodatkowy atak.' }),
      A('chain_lightning', 'Chain Lightning', 32, 'spell', { cost: 60, cd: 6, cast: 2.5, power: 1.4, aoe: true, school: 'nature', desc: 'Błyskawica przeskakująca po wrogach.' }),
      A('chain_heal', 'Chain Heal', 40, 'heal', { cost: 50, cast: 2.5, power: 2.9, school: 'nature', desc: 'Łańcuch leczenia.' }),
      T('elemental_mastery', 'Elemental Mastery', 'cooldown', { cd: 180, dur: 4, buff: { spellCrit: 1, cost: -1 }, desc: 'Talent Elemental: następny czar krytyczny i darmowy.' }),
      T('stormstrike', 'Stormstrike', 'strike', { cost: 30, cd: 12, power: 1.6, school: 'nature', prio: 30, desc: 'Talent Enhancement: podwójny cios burzy.' }),
      T('natures_swiftness_sh', "Nature's Swiftness", 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, when: ['hp<45'], prio: 3, desc: 'Talent Restoration: następny czar natychmiast.' }),
      T('mana_tide', 'Mana Tide Totem', 'regen', { cd: 300, power: 0.3, when: ['mana<30'], desc: 'Talent Restoration: odnawia manę.' }),
    ],
  },
  {
    id: 'mage', name: 'Mage', pl: 'Mag', color: '#69CCF0', resource: 'mana', trees: ['Arcane', 'Fire', 'Frost'],
    bonus: { str: 0, agi: 0, sta: 0, int: 3, spi: 2 }, growth: { str: 0.2, agi: 0.3, sta: 0.8, int: 1.8, spi: 1.4 },
    hp: [42, 12], mana: [120, 22], style: 'caster', armor: () => 'cloth', weapons: { main: ['Dagger', 'Sword'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    weights: { int: 2.1, spi: 1.2, sta: 0.9 },
    role: 'Magia dystansowa',
    abilities: [
      A('frost_armor', 'Frost Armor', 1, 'buff', { buff: { armor: 0.3 }, desc: 'Lodowy pancerz.' }),
      A('arcane_intellect', 'Arcane Intellect', 1, 'buff', { buff: { int: 6 }, desc: 'Zwiększa Intellect.' }),
      A('fireball', 'Fireball', 1, 'spell', { cost: 30, cast: 3, power: 2.0, school: 'fire', desc: 'Kula ognia.' }),
      A('frostbolt', 'Frostbolt', 4, 'spell', { cost: 25, cast: 2.5, power: 1.75, school: 'frost', desc: 'Lodowy pocisk.' }),
      A('fire_blast', 'Fire Blast', 6, 'spell', { cost: 40, cd: 8, power: 1.2, school: 'fire', desc: 'Natychmiastowy wybuch ognia.' }),
      A('arcane_missiles', 'Arcane Missiles', 8, 'spell', { cost: 85, cast: 3, power: 2.4, school: 'arcane', when: ['mana>60'], desc: 'Seria pocisków tajemnych (kanałowane).' }),
      A('frost_nova', 'Frost Nova', 10, 'stun', { cost: 55, cd: 25, dur: 4, when: ['hp<60'], desc: 'Zamraża wrogów w miejscu.' }),
      A('arcane_explosion', 'Arcane Explosion', 14, 'spell', { cost: 60, power: 0.9, aoe: true, school: 'arcane', when: ['pack'], desc: 'Wybuch magii wokół maga.' }),
      A('flamestrike', 'Flamestrike', 16, 'dot', { cost: 80, cast: 3, cd: 8, power: 1.8, dur: 8, aoe: true, school: 'fire', when: ['pack'], desc: 'Słup ognia na grupę.' }),
      A('blizzard', 'Blizzard', 20, 'spell', { cost: 120, cast: 8, power: 3.2, aoe: true, school: 'frost', when: ['pack'], desc: 'Zamieć lodowa (kanałowane).' }),
      A('mana_shield', 'Mana Shield', 20, 'shield', { cost: 40, cd: 15, power: 1.6, school: 'arcane', when: ['hp<60'], desc: 'Tarcza z many.' }),
      A('evocation', 'Evocation', 20, 'regen', { cd: 480, cast: 8, power: 0.6, when: ['mana<20'], desc: 'Odnawia 60% many.' }),
      A('scorch', 'Scorch', 22, 'spell', { cost: 25, cast: 1.5, power: 1.0, school: 'fire', desc: 'Szybki czar ognia.' }),
      A('cone_of_cold', 'Cone of Cold', 26, 'spell', { cost: 70, cd: 10, power: 1.1, aoe: true, school: 'frost', when: ['pack'], desc: 'Stożek zimna.' }),
      A('ice_armor', 'Ice Armor', 30, 'buff', { buff: { armor: 0.6 }, desc: 'Mocniejszy lodowy pancerz.' }),
      A('mage_armor', 'Mage Armor', 34, 'buff', { buff: { castRegen: 0.3 }, desc: '30% regeneracji many w walce.' }),
      T('presence_of_mind', 'Presence of Mind', 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, desc: 'Talent Arcane: następny czar natychmiast.' }),
      T('arcane_power', 'Arcane Power', 'cooldown', { cd: 180, dur: 15, buff: { dmg: 0.3, cost: 0.3 }, desc: 'Talent Arcane: +30% obrażeń, +30% kosztu.' }),
      T('pyroblast', 'Pyroblast', 'spell', { cost: 120, cast: 6, power: 3.4, school: 'fire', when: ['opener'], prio: 3, desc: 'Talent Fire: potężny otwierający czar.' }),
      T('blast_wave', 'Blast Wave', 'spell', { cost: 80, cd: 45, power: 1.4, aoe: true, school: 'fire', desc: 'Talent Fire: fala ognia.' }),
      T('combustion', 'Combustion', 'cooldown', { cd: 180, dur: 10, buff: { spellCrit: 0.4 }, desc: 'Talent Fire: dużo trafień krytycznych ogniem.' }),
      T('ice_barrier', 'Ice Barrier', 'shield', { cost: 60, cd: 30, power: 3, school: 'frost', desc: 'Talent Frost: lodowa bariera.' }),
    ],
  },
  {
    id: 'warlock', name: 'Warlock', pl: 'Czarnoksiężnik', color: '#9482C9', resource: 'mana', trees: ['Affliction', 'Demonology', 'Destruction'],
    bonus: { str: 0, agi: 0, sta: 1, int: 2, spi: 2 }, growth: { str: 0.3, agi: 0.4, sta: 1.0, int: 1.5, spi: 1.4 },
    hp: [48, 13], mana: [100, 19], style: 'caster', armor: () => 'cloth', weapons: { main: ['Dagger', 'Sword'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    weights: { int: 1.6, sta: 1.4, spi: 1.1 },
    role: 'Klątwy i demony',
    pets: [
      { id: 'imp', name: 'Imp', lvl: 1, dmg: 0.38, school: 'fire' },
      { id: 'voidwalker', name: 'Voidwalker', lvl: 10, tank: true, dmg: 0.22, school: 'shadow' },
      { id: 'succubus', name: 'Succubus', lvl: 20, dmg: 0.55, school: 'shadow' },
      { id: 'felhunter', name: 'Felhunter', lvl: 30, dmg: 0.45, school: 'shadow' },
    ],
    abilities: [
      A('demon_skin', 'Demon Skin', 1, 'buff', { buff: { armor: 0.25 }, desc: 'Demoniczna skóra.' }),
      A('shadow_bolt', 'Shadow Bolt', 1, 'spell', { cost: 25, cast: 2.5, power: 1.65, school: 'shadow', desc: 'Pocisk cienia.' }),
      A('immolate', 'Immolate', 1, 'dot', { cost: 25, cast: 2.0, power: 1.6, dur: 15, school: 'fire', desc: 'Podpala wroga.' }),
      A('corruption', 'Corruption', 4, 'dot', { cost: 35, power: 1.6, dur: 12, school: 'shadow', desc: 'Zepsucie w czasie.' }),
      A('life_tap', 'Life Tap', 6, 'lifetap', { when: ['mana<30', 'hp>60'], prio: 6, desc: 'Zamienia zdrowie na manę.' }),
      A('curse_agony', 'Curse of Agony', 8, 'dot', { cost: 25, power: 1.5, dur: 24, school: 'shadow', desc: 'Klątwa zadająca rosnące obrażenia.' }),
      A('fear', 'Fear', 8, 'stun', { cost: 30, cd: 30, dur: 6, when: ['hp<45'], desc: 'Przeraża wroga.' }),
      A('drain_life', 'Drain Life', 14, 'drain', { cost: 40, cast: 5, power: 1.6, heal: 1, school: 'shadow', when: ['hp<60'], prio: 9, desc: 'Wysysa życie (kanałowane).' }),
      A('searing_pain', 'Searing Pain', 18, 'spell', { cost: 30, cast: 1.5, power: 1.1, school: 'fire', desc: 'Szybki czar ognia.' }),
      A('rain_of_fire', 'Rain of Fire', 20, 'spell', { cost: 100, cast: 8, power: 3.0, aoe: true, school: 'fire', when: ['pack'], desc: 'Deszcz ognia (kanałowane).' }),
      A('demon_armor', 'Demon Armor', 20, 'buff', { buff: { armor: 0.4, castRegen: 0.1 }, desc: 'Demoniczny pancerz.' }),
      A('hellfire', 'Hellfire', 30, 'spell', { cost: 90, cast: 6, power: 2.6, aoe: true, school: 'fire', when: ['pack', 'hp>60'], desc: 'Piekielny ogień wokół (kanałowane).' }),
      A('death_coil', 'Death Coil', 42, 'drain', { cost: 60, cd: 120, power: 1.4, heal: 1, school: 'shadow', when: ['hp<50'], prio: 5, desc: 'Przeraża i wysysa życie.' }),
      A('summon_imp', 'Summon Imp', 1, 'summon', { desc: 'Imp: zadaje obrażenia ogniem.' }),
      A('summon_voidwalker', 'Summon Voidwalker', 10, 'summon', { desc: 'Voidwalker: przyjmuje ciosy na siebie.' }),
      A('summon_succubus', 'Summon Succubus', 20, 'summon', { desc: 'Succubus: najwięcej obrażeń.' }),
      A('summon_felhunter', 'Summon Felhunter', 30, 'summon', { desc: 'Felhunter: obrażenia cienia.' }),
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
    hp: [50, 15], mana: [90, 18], style: 'caster', armor: () => 'leather', weapons: { main: ['Mace', 'Dagger'], two: ['Staff', 'Maul'], ranged: [], off: ['Orb'] },
    weights: { int: 1.4, agi: 1.1, str: 1, sta: 1, spi: 1 },
    role: 'Zmiennokształtny hybryda',
    abilities: [
      A('mark_wild', 'Mark of the Wild', 1, 'buff', { buff: { all: 3, armor: 0.1 }, desc: 'Zwiększa wszystkie atrybuty.' }),
      A('wrath', 'Wrath', 1, 'spell', { cost: 20, cast: 2.0, power: 1.45, school: 'nature', form: 'caster', desc: 'Gniew natury.' }),
      A('healing_touch', 'Healing Touch', 1, 'heal', { cost: 30, cast: 3, power: 2.8, school: 'nature', form: 'caster', desc: 'Leczenie.' }),
      A('moonfire', 'Moonfire', 4, 'dot', { cost: 25, power: 1.4, dur: 9, school: 'arcane', form: 'caster', desc: 'Promień księżyca.' }),
      A('rejuvenation', 'Rejuvenation', 4, 'hot', { cost: 25, power: 2.0, dur: 12, school: 'nature', form: 'caster', desc: 'Leczenie w czasie.' }),
      A('thorns', 'Thorns', 6, 'proc', { proc: { chance: 1, power: 0.1, on: 'taken' }, school: 'nature', desc: 'Kolce raniące atakujących.' }),
      A('entangling_roots', 'Entangling Roots', 8, 'stun', { cost: 50, cd: 20, dur: 3, form: 'caster', when: ['hp<50'], desc: 'Oplata wroga korzeniami.' }),
      A('bear_form', 'Bear Form', 10, 'form', { form: 'bear', desc: 'Forma niedźwiedzia: Rage, dużo pancerza i HP.' }),
      A('maul', 'Maul', 10, 'strike', { cost: 15, power: 1.0, school: 'physical', form: 'bear', when: ['res>=25'], desc: 'Potężny cios łapą.' }),
      A('demoralizing_roar', 'Demoralizing Roar', 10, 'buff', { buff: { dr: 0.05 }, form: 'bear', desc: 'Osłabia ataki wrogów.' }),
      A('regrowth', 'Regrowth', 12, 'heal', { cost: 45, cast: 2, power: 2.6, school: 'nature', form: 'caster', desc: 'Leczenie z efektem w czasie.' }),
      A('swipe', 'Swipe', 16, 'strike', { cost: 20, power: 0.6, aoe: true, school: 'physical', form: 'bear', when: ['pack'], desc: 'Zamach na wszystkich wokół.' }),
      A('cat_form', 'Cat Form', 20, 'form', { form: 'cat', desc: 'Forma kota: Energy, punkty kombinacji, szybkie ciosy.' }),
      A('claw', 'Claw', 20, 'strike', { cost: 40, power: 0.9, cp: 1, school: 'physical', form: 'cat', desc: 'Pazury (daje punkt kombinacji).' }),
      A('rip', 'Rip', 20, 'finisher', { cost: 30, power: 0.6, dur: 12, school: 'physical', form: 'cat', when: ['noDot', 'mob>50'], prio: 24, desc: 'Finisher: krwawienie.' }),
      A('starfire', 'Starfire', 20, 'spell', { cost: 90, cast: 3, power: 2.4, school: 'arcane', form: 'caster', when: ['mana>40'], desc: 'Potężny gwiezdny ogień.' }),
      A('shred', 'Shred', 22, 'strike', { cost: 60, power: 1.5, cp: 1, school: 'physical', form: 'cat', when: ['stunned'], prio: 50, desc: 'Rozszarpanie od tyłu.' }),
      A('rake', 'Rake', 24, 'dot', { cost: 35, power: 0.9, dur: 9, cp: 1, school: 'physical', form: 'cat', desc: 'Krwawienie (daje punkt kombinacji).' }),
      A('tigers_fury', "Tiger's Fury", 24, 'cooldown', { cost: 30, cd: 30, dur: 6, buff: { dmg: 0.15 }, form: 'cat', when: ['res>=50'], desc: '+15% obrażeń na 6 s.' }),
      A('ferocious_bite', 'Ferocious Bite', 32, 'finisher', { cost: 35, power: 0.75, school: 'physical', form: 'cat', desc: 'Finisher: potężne ugryzienie.' }),
      A('hurricane', 'Hurricane', 40, 'spell', { cost: 120, cd: 60, cast: 10, power: 3.5, aoe: true, school: 'nature', form: 'caster', when: ['pack'], desc: 'Huragan (kanałowane).' }),
      T('moonkin_form', 'Moonkin Form', 'form', { form: 'moonkin', desc: 'Talent Balance: forma sowy (pancerz, krytyki czarów).' }),
      T('leader_pack', 'Leader of the Pack', 'buff', { buff: { crit: 0.03 }, desc: 'Talent Feral: +3% trafień krytycznych.' }),
      T('feral_charge', 'Feral Charge', 'stun', { cost: 5, cd: 15, dur: 1, form: 'bear', when: ['opener'], prio: 1, desc: 'Talent Feral: szarża niedźwiedzia.' }),
      T('insect_swarm', 'Insect Swarm', 'dot', { cost: 30, power: 1.3, dur: 12, school: 'nature', form: 'caster', desc: 'Talent Restoration: rój owadów.' }),
      T('natures_swiftness_dr', "Nature's Swiftness", 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, when: ['hp<45'], prio: 3, desc: 'Talent Restoration: następny czar natychmiast.' }),
      T('swiftmend', 'Swiftmend', 'heal', { cost: 40, cd: 15, power: 2.8, school: 'nature', form: 'caster', when: ['hp<45', 'hot'], prio: 2, desc: 'Talent Restoration: natychmiastowe leczenie.' }),
    ],
  },
]

export const classById = (id: ClassId) => CLASSES.find((c) => c.id === id)!

// Rangi umiejętności: kolejne rangi co 6 poziomów (ataki/czary) lub co 10 (buffy, kontrola)
export function ranksOf(a: Ability): number[] {
  if (a.talent || a.kind === 'form' || a.kind === 'summon') return [a.lvl]
  const step = a.kind === 'buff' || a.kind === 'stun' || a.kind === 'cooldown' || a.kind === 'lifetap' || a.kind === 'proc' || a.kind === 'regen' ? 10 : 6
  const out: number[] = []
  for (let l = a.lvl; l <= 60; l += step) out.push(l)
  return out
}
// Koszt nauki rangi u trenera (miedziaki), skala jak w Classicu: ~4 s na 10 poz., ~4 g na 60
export const trainCost = (lvl: number) => (lvl <= 1 ? 0 : Math.max(10, Math.round(Math.pow(lvl, 2.6))))
