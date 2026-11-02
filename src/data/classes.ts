// 9 klas. Umiejętności i poziomy nauki według WoW Classic (pierwsze rangi) uzupełnione o nowości
// z WoW Forever. Umiejętności z talentów mają `talent`. Liczby uproszczone do idlera.
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
  | 'mob<20' | 'mob<25' | 'mob>30' | 'mob>50' | 'noDot' | 'dodged' | 'heroDodged' | 'cp>=2' | 'cp>=3' | 'cp5' | 'pack' | 'opener' | 'approaching'
  | 'mana<20' | 'mana<30' | 'mana>40' | 'mana>60' | 'res>=25' | 'res>=30' | 'res>=40' | 'res>=50' | 'res>=60'
  | 'noShield' | 'noHot' | 'hot' | 'undead' | 'stunned' | 'notStunned' | 'noTemp' | 'lvl<10' | 'lvl<20' | 'dot:immolate'
  | 'fireTotem' | 'shield' | 'boss' | 'twoTotems' | 'behind'

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
  channel?: boolean // kanałowane: obrażenia skracają kanał zamiast go cofać
  dot?: { power: number; dur: number } // dodatkowy DoT po trafieniu (Flame Shock)
  slow?: number // spowalnia podchodzącego wroga na X s (Frost Shock)
  travel?: number // forma podróżna: +X szybkości przy podróżach (Ghost Wolf, Travel Form)
  debuff?: boolean // działa na wroga (pokazywane na pasku wroga, a nie w buffach postaci)
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
  weights: Partial<Record<keyof Stats | 'dps' | 'armor' | 'sp', number>>
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
const capDesc = <X extends { desc?: string }>(o: X): X => (o.desc ? { ...o, desc: o.desc[0].toUpperCase() + o.desc.slice(1) } : o) // opisy zawsze od wielkiej litery
const A = (id: string, name: string, lvl: number, kind: Kind, o: Omit<Ability, 'id' | 'name' | 'lvl' | 'kind'>): Ability => ({ id, name, lvl, kind, ...capDesc(o) })
const T = (id: string, name: string, kind: Kind, o: Omit<Ability, 'id' | 'name' | 'lvl' | 'kind'>): Ability => ({ id, name, lvl: 10, kind, talent: true, ...capDesc(o) })

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior', name: 'Warrior', pl: 'Wojownik', color: '#C79C6E', resource: 'rage', trees: ['Arms', 'Fury', 'Protection'],
    bonus: { str: 3, agi: 0, sta: 2, int: 0, spi: 0 }, growth: { str: 1.6, agi: 0.9, sta: 1.4, int: 0.15, spi: 0.35 },
    hp: [60, 18], style: 'melee', armor: plateAt40('mail', 'plate'),
    weapons: { main: ['Sword', 'Axe', 'Mace', 'Dagger'], two: ['Greatsword'], ranged: ['Thrown'], off: ['Shield'] },
    skills: ['Dagger', 'Fist Weapon', 'Sword', 'Axe', 'Mace', 'Greatsword', 'Greataxe', 'Maul', 'Polearm', 'Staff', 'Bow', 'Gun', 'Crossbow', 'Thrown'],
    weights: { str: 2.2, agi: 1.2, sta: 1.1, armor: 0.04, dps: 14 },
    role: 'Tank / melee',
    abilities: [
      A('battle_shout', 'Battle Shout', 1, 'buff', { buff: { ap: 15 }, group: 'shout', gprio: 1, desc: 'A shout that increases attack power.' }),
      A('heroic_strike', 'Heroic Strike', 1, 'strike', { cost: 15, power: 0.9, school: 'physical', when: ['res>=30'], prio: 70, desc: 'A stronger weapon strike (uses excess Rage).' }),
      A('charge', 'Charge', 4, 'strike', { cd: 15, power: 0.3, gain: 15, stun: 1, closes: true, school: 'physical', when: ['opener'], prio: 1, desc: 'Charge the enemy: closes the distance, stuns for 1 s and grants 15 Rage.' }),
      A('rend', 'Rend', 4, 'dot', { cost: 10, power: 1.1, dur: 9, melee: true, school: 'physical', desc: 'A bleed lasting 9 s.' }),
      A('thunder_clap', 'Thunder Clap', 6, 'strike', { cost: 20, cd: 4, power: 0.6, aoe: true, school: 'physical', when: ['pack'], desc: 'Strikes all nearby enemies.' }),
      A('hamstring', 'Hamstring', 8, 'strike', { cost: 10, power: 0.3, school: 'physical', when: ['res>=60'], prio: 85, desc: 'Hamstring: minor damage, uses excess Rage.' }),
      A('bloodrage', 'Bloodrage', 10, 'cooldown', { cd: 60, gain: 20, dur: 1, when: ['opener'], prio: 2, desc: 'Instantly grants 20 Rage.' }),
      A('sunder_armor', 'Sunder Armor', 10, 'strike', { cost: 15, power: 0.45, school: 'physical', when: ['res>=50'], prio: 75, desc: 'Sunders the enemy\'s armor.' }),
      A('overpower', 'Overpower', 12, 'strike', { cost: 5, cd: 5, power: 1.0, school: 'physical', when: ['dodged'], prio: 20, desc: 'Counterattack after the enemy dodges.' }),
      A('demoralizing_shout', 'Demoralizing Shout', 14, 'buff', { debuff: true, buff: { dr: 0.05 }, desc: 'Weakens the attacks of nearby enemies (−5% damage taken).' }),
      A('revenge', 'Revenge', 14, 'strike', { cost: 5, cd: 5, power: 1.1, school: 'physical', when: ['heroDodged'], prio: 22, desc: 'Retaliate after you dodge or block.' }),
      A('shield_block', 'Shield Block', 16, 'cooldown', { cost: 10, cd: 5, dur: 5, buff: { dodge: 0.3 }, when: ['shield', 'hp<75'], desc: 'Blocks attacks with your shield for 5 s (requires a shield).' }),
      A('cleave', 'Cleave', 20, 'strike', { cost: 20, power: 0.8, aoe: true, school: 'physical', when: ['pack', 'res>=30'], prio: 40, desc: 'Strikes several enemies at once.' }),
      A('retaliation', 'Retaliation', 20, 'cooldown', { cd: 300, dur: 15, buff: { retal: 0.5 }, when: ['pack', 'hp<75'], desc: 'For 15 s you counterattack every hit you take.' }),
      A('intimidating_shout', 'Intimidating Shout', 22, 'stun', { cost: 25, cd: 120, dur: 5, when: ['pack', 'hp<45'], desc: 'Frightens nearby enemies for a few seconds.' }),
      A('execute', 'Execute', 24, 'execute', { cost: 15, power: 2.4, school: 'physical', desc: 'Finishes off an enemy below 20% health.' }),
      A('shield_wall', 'Shield Wall', 28, 'cooldown', { cd: 600, dur: 10, buff: { dr: 0.4 }, when: ['hp<35'], prio: 3, desc: '−40% damage taken for 10 s.' }),
      A('slam', 'Slam', 30, 'strike', { cost: 15, cast: 1.5, power: 1.3, school: 'physical', when: ['res>=40'], prio: 65, desc: 'A powerful strike (1.5 s).' }),
      A('berserker_rage', 'Berserker Rage', 32, 'cooldown', { cd: 30, gain: 10, dur: 10, buff: { resGen: 0.25 }, desc: 'Enrage: +10 Rage and more Rage from hits taken.' }),
      A('whirlwind', 'Whirlwind', 36, 'strike', { cost: 25, cd: 10, power: 1.1, aoe: true, school: 'physical', prio: 35, desc: 'A whirlwind of blades hitting everything nearby.' }),
      A('recklessness', 'Recklessness', 50, 'cooldown', { cd: 900, dur: 15, buff: { crit: 1, dr: -0.2 }, when: ['boss'], prio: 4, desc: 'Every hit crits for 15 s, but +20% damage taken.' }),
      T('sweeping_strikes', 'Sweeping Strikes', 'cooldown', { cd: 30, dur: 10, buff: { sweep: 1 }, when: ['pack'], prio: 5, desc: 'Arms talent: your strikes also hit a second enemy.' }),
      T('spearing_strike', 'Spearing Strike', 'strike', { cost: 15, cd: 10, power: 1.25, bonusVs: ['giant', 'dragon'], school: 'physical', prio: 32, desc: 'Arms talent: a weapon thrust, +50% against giants and dragons.' }),
      T('mortal_strike', 'Mortal Strike', 'strike', { cost: 30, cd: 6, power: 2.2, school: 'physical', prio: 30, desc: 'Arms talent: a powerful strike.' }),
      T('piercing_howl', 'Piercing Howl', 'stun', { cost: 10, cd: 30, dur: 2, when: ['pack'], desc: 'Fury talent: slows nearby enemies.' }),
      T('death_wish', 'Death Wish', 'cooldown', { cost: 10, cd: 180, dur: 30, buff: { dmg: 0.2, dr: -0.05 }, prio: 6, desc: 'Fury talent: +20% damage, +5% damage taken.' }),
      T('bloodthirst', 'Bloodthirst', 'strike', { cost: 30, cd: 6, power: 1.9, heal: 0.1, school: 'physical', prio: 30, desc: 'Fury talent: a strike that heals.' }),
      T('last_stand', 'Last Stand', 'heal', { cd: 300, healPct: 0.3, when: ['hp<25'], prio: 2, desc: 'Protection talent: instantly +30% health.' }),
      T('concussion_blow', 'Concussion Blow', 'stun', { cost: 15, cd: 45, dur: 5, melee: true, desc: 'Protection talent: stuns for 5 s.' }),
      T('shield_slam', 'Shield Slam', 'strike', { cost: 20, cd: 6, power: 1.8, school: 'physical', prio: 30, desc: 'Protection talent: a shield bash.' }),
    ],
  },
  {
    id: 'paladin', name: 'Paladin', pl: 'Paladyn', color: '#F58CBA', resource: 'mana', trees: ['Holy', 'Protection', 'Retribution'],
    bonus: { str: 2, agi: 0, sta: 2, int: 0, spi: 1 }, growth: { str: 1.4, agi: 0.6, sta: 1.3, int: 0.8, spi: 0.8 },
    hp: [55, 17], mana: [60, 14], style: 'melee', armor: plateAt40('mail', 'plate'),
    weapons: { main: ['Mace', 'Sword'], two: ['Maul'], ranged: [], off: ['Shield'] },
    skills: ['Sword', 'Axe', 'Mace', 'Greatsword', 'Greataxe', 'Maul', 'Polearm'],
    weights: { str: 2, int: 1, sta: 1.1, spi: 0.5, sp: 0.8, armor: 0.04, dps: 13 },
    role: 'Tank / healer / melee',
    abilities: [
      A('devotion_aura', 'Devotion Aura', 1, 'buff', { buff: { armor: 0.15 }, group: 'aura', gprio: 2, desc: 'An aura that increases armor.' }),
      A('seal_righteousness', 'Seal of Righteousness', 1, 'proc', { proc: { chance: 1, power: 0.12, on: 'hit' }, school: 'holy', group: 'seal', gprio: 2, desc: 'Each hit deals extra Holy damage.' }),
      A('holy_light', 'Holy Light', 1, 'heal', { cost: 35, cast: 2.5, cd: 10, power: 2.6, school: 'holy', desc: 'A strong heal.' }),
      A('holy_strike', 'Holy Strike', 2, 'strike', { cost: 15, cd: 8, power: 1.1, school: 'holy', prio: 45, desc: 'an instant weapon strike infused with the Light.' }),
      A('blessing_might', 'Blessing of Might', 4, 'buff', { buff: { ap: 20 }, group: 'blessing', gprio: 1, desc: 'A blessing of attack power.' }),
      A('judgement', 'Judgement', 4, 'spell', { cost: 25, cd: 10, power: 1.3, school: 'holy', desc: 'Unleashes the power of your seal.' }),
      A('divine_protection', 'Divine Protection', 6, 'cooldown', { cost: 15, cd: 300, dur: 8, buff: { dr: 0.4 }, when: ['hp<35'], prio: 3, desc: 'Divine protection: −40% damage for 8 s.' }),
      A('seal_crusader', 'Seal of the Crusader', 6, 'buff', { buff: { ap: 15, haste: 0.1 }, group: 'seal', gprio: 3, desc: 'Faster attacks and more attack power.' }),
      A('hammer_justice', 'Hammer of Justice', 8, 'stun', { cost: 30, cd: 60, dur: 3, desc: 'Stuns the enemy for 3 s.' }),
      A('lay_on_hands', 'Lay on Hands', 10, 'heal', { cd: 1800, healPct: 1, when: ['hp<20'], prio: 1, desc: 'A full heal in a critical moment (30 min).' }),
      A('blessing_wisdom', 'Blessing of Wisdom', 14, 'buff', { buff: { castRegen: 0.15 }, group: 'blessing', gprio: 3, desc: 'In-combat mana regeneration.' }),
      A('retribution_aura', 'Retribution Aura', 16, 'proc', { proc: { chance: 1, power: 0.12, on: 'taken' }, school: 'holy', group: 'aura', gprio: 1, desc: 'Enemies that hurt you take Holy damage.' }),
      A('exorcism', 'Exorcism', 20, 'spell', { cost: 60, cd: 15, power: 1.8, school: 'holy', when: ['undead'], desc: 'A strong strike against undead and demons.' }),
      A('flash_of_light', 'Flash of Light', 20, 'heal', { cost: 20, cast: 1.5, cd: 8, power: 1.6, school: 'holy', when: ['hp<60'], desc: 'A quick heal.' }),
      A('blessing_kings', 'Blessing of Kings', 20, 'buff', { buff: { allPct: 0.1 }, group: 'blessing', gprio: 2, desc: 'baseline instead of a talent, +10% to all attributes.' }),
      A('seal_fury', 'Seal of Fury', 22, 'proc', { proc: { chance: 1, power: 0.08, on: 'hit' }, buff: { dr: 0.03 }, school: 'holy', group: 'seal', gprio: 4, desc: 'a defender\'s seal, less Holy damage and −3% damage taken.' }),
      A('seal_light', 'Seal of Light', 30, 'proc', { proc: { chance: 0.3, power: 0, on: 'hit', heal: 0.5 }, school: 'holy', group: 'seal', gprio: 5, desc: 'Your hits can heal you.' }),
      A('divine_shield', 'Divine Shield', 34, 'cooldown', { cost: 20, cd: 300, dur: 10, buff: { immune: 1 }, when: ['hp<20'], prio: 2, desc: 'Invulnerability for 10 s.' }),
      A('seal_wisdom', 'Seal of Wisdom', 38, 'proc', { proc: { chance: 0.3, power: 0, on: 'hit', mana: 0.02 }, school: 'holy', group: 'seal', gprio: 6, desc: 'Your hits can restore mana.' }),
      A('hammer_wrath', 'Hammer of Wrath', 44, 'spell', { cost: 30, cd: 6, cast: 1, power: 2.2, school: 'holy', when: ['mob<20'], prio: 18, desc: 'A finishing hammer of Light (enemy below 20% health).' }),
      A('holy_wrath', 'Holy Wrath', 50, 'spell', { cost: 70, cd: 60, cast: 2, power: 1.6, aoe: true, school: 'holy', when: ['undead'], desc: 'The wrath of the Light on nearby undead.' }),
      T('consecration', 'Consecration', 'dot', { cost: 40, cd: 8, power: 1.2, dur: 8, aoe: true, school: 'holy', desc: 'Holy talent: consecrates the ground (AoE).' }),
      T('voice_of_truth', 'Voice of Truth', 'stun', { cost: 10, cd: 30, dur: 2, desc: 'Holy talent: a short silence on the enemy.' }),
      T('holy_shock', 'Holy Shock', 'spell', { cost: 40, cd: 30, power: 1.6, school: 'holy', desc: 'Holy talent: an instant strike of Light.' }),
      T('blessing_sanctuary', 'Blessing of Sanctuary', 'buff', { buff: { dr: 0.06 }, group: 'blessing', gprio: 4, desc: 'Protection talent: −6% damage taken.' }),
      T('holy_shield', 'Holy Shield', 'proc', { proc: { chance: 0.6, power: 0.25, on: 'taken' }, buff: { dodge: 0.12 }, school: 'holy', desc: 'Protection talent: +12% block, blocking deals Holy damage.' }),
      T('templars_bulwark', "Templar's Bulwark", 'shield', { cost: 30, cd: 300, shieldPct: 1, when: ['hp<35'], prio: 2, desc: 'Protection talent: a shield equal to 100% of your health.' }),
      T('seal_command', 'Seal of Command', 'proc', { proc: { chance: 0.25, power: 1.2, on: 'hit' }, school: 'holy', group: 'seal', gprio: 1, desc: 'Retribution talent: chance for a powerful Holy strike.' }),
      T('sanctity_aura', 'Sanctity Aura', 'buff', { buff: { 'school:holy': 0.1 }, group: 'aura', gprio: 0, desc: 'Retribution talent: +10% Holy damage.' }),
      T('repentance', 'Repentance', 'stun', { cost: 30, cd: 60, dur: 6, desc: 'Retribution talent: incapacitates the enemy.' }),
    ],
  },
  {
    id: 'hunter', name: 'Hunter', pl: 'Hunter', color: '#ABD473', resource: 'mana', trees: ['Beast Mastery', 'Marksmanship', 'Survival'],
    bonus: { str: 0, agi: 3, sta: 1, int: 0, spi: 1 }, growth: { str: 0.6, agi: 1.7, sta: 1.2, int: 0.6, spi: 0.6 },
    hp: [50, 15], mana: [70, 12], style: 'ranged', armor: plateAt40('leather', 'mail'),
    weapons: { main: ['Axe', 'Dagger'], two: ['Greataxe'], ranged: ['Bow', 'Gun', 'Crossbow'], off: [] },
    skills: ['Dagger', 'Fist Weapon', 'Sword', 'Axe', 'Greatsword', 'Greataxe', 'Polearm', 'Staff', 'Bow', 'Gun', 'Crossbow', 'Thrown'],
    weights: { agi: 2.5, sta: 1, int: 0.5, str: 0.3, armor: 0.02, dps: 14 },
    role: 'Ranged combat with a pet',
    pets: [{ id: 'beast', name: 'Tamed beast', lvl: 10, tank: true, dmg: 0.4, school: 'physical' }],
    abilities: [
      A('raptor_strike', 'Raptor Strike', 1, 'strike', { cost: 15, cd: 6, power: 0.8, school: 'physical', desc: 'A melee strike (when the enemy gets close).' }),
      A('aspect_monkey', 'Aspect of the Monkey', 4, 'buff', { buff: { dodge: 0.05 }, group: 'aspect', gprio: 2, desc: '+5% dodge.' }),
      A('serpent_sting', 'Serpent Sting', 4, 'dot', { cost: 15, power: 1.2, dur: 15, school: 'nature', desc: 'Poison over 15 s.' }),
      A('arcane_shot', 'Arcane Shot', 6, 'spell', { cost: 25, cd: 6, power: 1.0, school: 'arcane', desc: 'An instant magical shot.' }),
      A('hunters_mark', "Hunter's Mark", 6, 'buff', { debuff: true, buff: { ap: 20 }, desc: 'Increases ranged damage.' }),
      A('concussive_shot', 'Concussive Shot', 8, 'stun', { cost: 20, cd: 12, dur: 4, when: ['approaching'], prio: 3, desc: 'Dazes the enemy while it approaches: it moves at half speed for 4 s, so you get more shots before it reaches you.' }),
      A('aspect_hawk', 'Aspect of the Hawk', 10, 'buff', { buff: { ap: 30 }, group: 'aspect', gprio: 1, desc: 'A large ranged attack power bonus.' }),
      A('wing_clip', 'Wing Clip', 12, 'strike', { cost: 10, cd: 10, power: 0.35, stun: 1, school: 'physical', when: ['hp<60'], desc: 'Hamstrings the enemy in melee.' }),
      A('mongoose_bite', 'Mongoose Bite', 16, 'strike', { cost: 20, cd: 5, power: 1.0, school: 'physical', when: ['heroDodged'], desc: 'Counter after you dodge.' }),
      A('immolation_trap', 'Immolation Trap', 16, 'dot', { cost: 30, cd: 15, power: 1.3, dur: 15, school: 'fire', when: ['opener'], desc: 'A trap that sets the enemy on fire.' }),
      A('multi_shot', 'Multi-Shot', 18, 'spell', { cost: 60, cd: 10, power: 1.0, aoe: true, school: 'physical', desc: 'A shot that hits several targets.' }),
      A('summon_hawk', 'Summon Hawk', 20, 'spell', { cost: 25, cd: 6, power: 1.05, shareCd: 'arcane_shot', school: 'physical', desc: 'a hawk dives at the enemy (shares a cooldown with Arcane Shot).' }),
      A('freezing_trap', 'Freezing Trap', 20, 'stun', { cost: 25, cd: 15, dur: 6, cc: true, when: ['pack'], desc: 'Freezes one enemy from a group.' }),
      A('rapid_fire', 'Rapid Fire', 26, 'cooldown', { cost: 30, cd: 300, dur: 15, buff: { haste: 0.4 }, desc: '+40% shot speed for 15 s.' }),
      A('explosive_trap', 'Explosive Trap', 34, 'dot', { cost: 40, cd: 15, power: 1.4, dur: 10, aoe: true, school: 'fire', when: ['pack'], desc: 'A trap that burns a whole group.' }),
      A('volley', 'Volley', 40, 'spell', { channel: true, cost: 80, cast: 6, power: 2.4, aoe: true, school: 'arcane', when: ['pack'], desc: 'A rain of arrows over an area (channeled).' }),
      T('intimidation', 'Intimidation', 'stun', { cost: 20, cd: 60, dur: 3, desc: 'Beast Mastery talent: your pet stuns the enemy.' }),
      T('bestial_wrath', 'Bestial Wrath', 'cooldown', { cost: 30, cd: 60, dur: 18, buff: { petDmg: 1 }, desc: 'Beast Mastery talent: your pet deals double damage for 18 s.' }),
      T('aimed_shot', 'Aimed Shot', 'spell', { cost: 45, cd: 6, cast: 3, power: 3.2, school: 'physical', desc: 'Marksmanship talent: a precise shot.' }),
      T('scatter_shot', 'Scatter Shot', 'stun', { cost: 20, cd: 30, dur: 4, when: ['hp<50'], desc: 'Marksmanship talent: disorients the enemy.' }),
      T('trueshot_aura', 'Trueshot Aura', 'buff', { buff: { ap: 45 }, desc: 'Marksmanship talent: a ranged attack power aura.' }),
      T('counterattack', 'Counterattack', 'strike', { cost: 20, cd: 5, power: 1.1, stun: 1, school: 'physical', when: ['heroDodged'], prio: 21, desc: 'Survival talent: counter after a dodge.' }),
      T('deterrence', 'Deterrence', 'cooldown', { cd: 300, dur: 10, buff: { dodge: 0.5 }, when: ['hp<35'], prio: 3, desc: 'Survival talent: +50% dodge for 10 s.' }),
      T('wyvern_sting', 'Wyvern Sting', 'stun', { cost: 40, cd: 120, dur: 8, desc: 'Survival talent: puts the enemy to sleep.' }),
    ],
  },
  {
    id: 'rogue', name: 'Rogue', pl: 'Rogue', color: '#FFF569', resource: 'energy', trees: ['Assassination', 'Combat', 'Subtlety'],
    bonus: { str: 1, agi: 3, sta: 1, int: 0, spi: 0 }, growth: { str: 1.0, agi: 1.8, sta: 1.1, int: 0.25, spi: 0.4 },
    hp: [55, 16], style: 'melee', armor: () => 'leather',
    weapons: { main: ['Dagger', 'Sword'], two: [], ranged: ['Thrown'], off: [] },
    skills: ['Dagger', 'Fist Weapon', 'Sword', 'Mace', 'Bow', 'Gun', 'Crossbow', 'Thrown'],
    weights: { agi: 2.3, str: 1, sta: 0.9, armor: 0.02, dps: 15 },
    role: 'Melee fighting from the shadows',
    abilities: [
      A('sinister_strike', 'Sinister Strike', 1, 'strike', { cost: 45, power: 0.85, cp: 1, school: 'physical', desc: 'A strike that grants a combo point.' }),
      A('eviscerate', 'Eviscerate', 1, 'finisher', { cost: 35, power: 0.65, school: 'physical', desc: 'Finisher: damage per combo point.' }),
      A('backstab', 'Backstab', 4, 'strike', { cost: 60, power: 1.35, cp: 1, school: 'physical', when: ['behind'], prio: 50, desc: 'A strike in the back: as an opener or while the enemy is stunned.' }),
      A('gouge', 'Gouge', 6, 'stun', { cost: 45, cd: 10, dur: 4, melee: true, when: ['hp<45'], desc: 'Incapacitates the enemy.' }),
      A('evasion', 'Evasion', 8, 'cooldown', { cd: 300, dur: 15, buff: { dodge: 0.5 }, when: ['hp<50'], desc: '+50% dodge chance for 15 s.' }),
      A('slice_dice', 'Slice and Dice', 10, 'buff', { buff: { haste: 0.2 }, desc: 'Faster attacks (kept up at all times).' }),
      A('garrote', 'Garrote', 14, 'dot', { cost: 50, power: 1.3, dur: 18, cp: 1, melee: true, school: 'physical', when: ['opener'], prio: 3, desc: 'Opener from stealth: a garrote, bleeding for 18 s.' }),
      A('expose_armor', 'Expose Armor', 14, 'finisher', { cost: 25, power: 0, dur: 30, buff: { meleeDmg: 0.08 }, when: ['noTemp', 'boss'], prio: 26, desc: 'Finisher: sunders the enemy\'s armor (+8% physical damage for 30 s).' }),
      A('ambush', 'Ambush', 18, 'strike', { cost: 60, power: 2.4, cp: 2, school: 'physical', when: ['opener'], prio: 2, desc: 'Opener from stealth: a powerful strike.' }),
      A('rupture', 'Rupture', 20, 'finisher', { cost: 25, power: 0.6, dur: 12, school: 'physical', when: ['noDot', 'mob>50'], prio: 24, desc: 'Finisher: a bleed that depends on combo points.' }),
      A('instant_poison', 'Instant Poison', 20, 'proc', { proc: { chance: 0.2, power: 0.32, on: 'hit' }, school: 'nature', desc: 'Weapon poison: chance for Nature damage.' }),
      A('cheap_shot', 'Cheap Shot', 26, 'stun', { cost: 60, dur: 4, cp: 2, melee: true, when: ['opener'], prio: 1, desc: 'Opener from stealth: stuns for 4 s (2 combo points).' }),
      A('kidney_shot', 'Kidney Shot', 30, 'finisher', { cost: 25, cd: 20, power: 0, stun: 1, when: ['hp<60', 'notStunned'], prio: 15, desc: 'Finisher: stuns for 1 s per combo point.' }),
      A('deadly_poison', 'Deadly Poison', 30, 'proc', { proc: { chance: 0.3, power: 0.27, on: 'hit' }, school: 'nature', desc: 'Weapon poison: damage over time.' }),
      A('wound_poison', 'Wound Poison', 32, 'proc', { proc: { chance: 0.3, power: 0.12, on: 'hit' }, school: 'nature', desc: 'Weapon poison: wounds that reduce healing.' }),
      A('blind', 'Blind', 34, 'stun', { cost: 30, cd: 300, dur: 8, cc: true, when: ['pack', 'hp<45'], desc: 'Blinds one enemy from a group.' }),
      T('cold_blood', 'Cold Blood', 'cooldown', { cd: 180, dur: 3, buff: { crit: 1 }, when: ['cp5'], prio: 5, desc: 'Assassination talent: your next strike crits.' }),
      T('mutilate', 'Mutilate', 'strike', { cost: 55, power: 1.8, cp: 2, school: 'physical', prio: 52, desc: 'Assassination talent: two strikes at once, 2 combo points.' }),
      T('venom', 'Venom', 'finisher', { cost: 25, power: 0, dur: 20, buff: { 'school:nature': 0.4 }, when: ['noTemp'], prio: 23, desc: 'Assassination talent: a finisher that empowers poisons.' }),
      T('riposte', 'Riposte', 'strike', { cost: 10, cd: 6, power: 1.1, school: 'physical', when: ['heroDodged'], prio: 21, desc: 'Combat talent: counter after a parry.' }),
      T('blade_flurry', 'Blade Flurry', 'cooldown', { cost: 25, cd: 120, dur: 15, buff: { haste: 0.2, sweep: 1 }, desc: 'Combat talent: +20% attack speed, strikes hit a second enemy.' }),
      T('adrenaline_rush', 'Adrenaline Rush', 'cooldown', { cd: 300, dur: 15, buff: { energy: 1 }, desc: 'Combat talent: double Energy regeneration.' }),
      T('ghostly_strike', 'Ghostly Strike', 'strike', { cost: 40, cd: 20, power: 1.25, cp: 1, school: 'physical', desc: 'Subtlety talent: a ghostly strike.' }),
      T('preparation', 'Preparation', 'cooldown', { cd: 600, dur: 1, reset: ['evasion', 'blind', 'cold_blood', 'adrenaline_rush', 'blade_flurry'], when: ['hp<35'], desc: 'Subtlety talent: resets rogue cooldowns.' }),
      T('hemorrhage', 'Hemorrhage', 'strike', { cost: 35, power: 1.15, cp: 1, school: 'physical', prio: 55, desc: 'Subtlety talent: a bleeding strike.' }),
    ],
  },
  {
    id: 'priest', name: 'Priest', pl: 'Priest', color: '#FFFFFF', resource: 'mana', trees: ['Discipline', 'Holy', 'Shadow'],
    bonus: { str: 0, agi: 0, sta: 0, int: 2, spi: 3 }, growth: { str: 0.2, agi: 0.3, sta: 0.9, int: 1.5, spi: 1.6 },
    hp: [45, 13], mana: [110, 20], style: 'caster', armor: () => 'cloth',
    weapons: { main: ['Mace'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    skills: ['Dagger', 'Mace', 'Staff', 'Wand'],
    weights: { int: 1.8, spi: 1.8, sta: 0.9, sp: 2 },
    role: 'Healing / shadow magic',
    abilities: [
      A('pw_fortitude', 'Power Word: Fortitude', 1, 'buff', { buff: { sta: 8 }, desc: 'Increases Stamina.' }),
      A('smite', 'Smite', 1, 'spell', { cost: 20, cast: 2.5, power: 1.6, school: 'holy', desc: 'Holy damage.' }),
      A('lesser_heal', 'Lesser Heal', 1, 'heal', { cost: 30, cast: 2.5, cd: 10, power: 2.4, school: 'holy', desc: 'A heal.' }),
      A('sw_pain', 'Shadow Word: Pain', 4, 'dot', { cost: 25, power: 1.5, dur: 18, school: 'shadow', desc: 'Shadow damage over 18 s.' }),
      A('pw_shield', 'Power Word: Shield', 6, 'shield', { cost: 45, cd: 15, power: 2.0, school: 'holy', desc: 'A shield that absorbs damage (Weakened Soul: 15 s).' }),
      A('renew', 'Renew', 8, 'hot', { cost: 30, power: 2.2, dur: 15, school: 'holy', desc: 'Healing over time.' }),
      A('desperate_prayer', 'Desperate Prayer', 10, 'heal', { cd: 600, healPct: 0.3, when: ['hp<25'], prio: 2, school: 'holy', desc: 'instantly +30% health (previously racial only).' }),
      A('mind_blast', 'Mind Blast', 10, 'spell', { cost: 50, cd: 8, cast: 1.5, power: 1.9, school: 'shadow', desc: 'A strong Shadow spell.' }),
      A('inner_fire', 'Inner Fire', 12, 'buff', { buff: { armor: 0.3, ap: 15 }, desc: 'Inner fire: armor.' }),
      A('psychic_scream', 'Psychic Scream', 14, 'stun', { cost: 40, cd: 30, dur: 4, when: ['hp<45'], desc: 'Frightens enemies for 4 s.' }),
      A('heal', 'Heal', 16, 'heal', { cost: 45, cast: 3, cd: 10, power: 3.4, school: 'holy', desc: 'A stronger heal.' }),
      A('flash_heal', 'Flash Heal', 20, 'heal', { cost: 35, cast: 1.5, cd: 12, power: 2.2, school: 'holy', when: ['hp<35'], prio: 4, desc: 'A quick heal.' }),
      A('holy_fire', 'Holy Fire', 20, 'spell', { cost: 50, cd: 10, cast: 3.5, power: 2.3, school: 'holy', desc: 'Holy fire.' }),
      A('fear_ward', 'Fear Ward', 20, 'buff', { buff: { dr: 0.03 }, desc: 'for all priests from level 20. Protection from fear.' }),
      A('devouring_plague', 'Devouring Plague', 20, 'dot', { cost: 55, cd: 60, power: 1.8, dur: 24, heal: 1, school: 'shadow', desc: 'for everyone from level 20. A plague that heals you.' }),
      A('prayer_healing', 'Prayer of Healing', 30, 'heal', { cost: 60, cast: 3, cd: 15, power: 3.0, school: 'holy', when: ['hp<35'], desc: 'A prayer of healing.' }),
      A('shadow_protection', 'Shadow Protection', 30, 'buff', { buff: { dr: 0.03 }, desc: 'Protection from Shadow.' }),
      A('greater_heal', 'Greater Heal', 40, 'heal', { cost: 70, cast: 3, cd: 10, power: 4.6, school: 'holy', desc: 'A great heal.' }),
      T('inner_focus', 'Inner Focus', 'cooldown', { cd: 180, dur: 4, buff: { spellCrit: 0.25, cost: -1 }, desc: 'Discipline talent: a free, powerful spell.' }),
      T('divine_spirit', 'Divine Spirit', 'buff', { buff: { spi: 20 }, desc: 'Discipline talent: a lot of Spirit.' }),
      T('penance', 'Penance', 'spell', { channel: true, cost: 40, cd: 10, cast: 2, power: 2.1, heal: 0.3, school: 'holy', prio: 30, desc: 'Discipline talent: channeled bolts of Light, part of it heals.' }),
      T('power_infusion', 'Power Infusion', 'cooldown', { cd: 180, dur: 15, buff: { dmg: 0.2 }, desc: 'Discipline talent: +20% damage.' }),
      T('holy_nova', 'Holy Nova', 'spell', { cost: 50, power: 0.9, aoe: true, school: 'holy', when: ['pack'], desc: 'Holy talent: a burst of Light around you.' }),
      T('prayer_mending', 'Prayer of Mending', 'hot', { cost: 30, cd: 10, power: 2.6, dur: 9, school: 'holy', desc: 'Holy talent: a heal that jumps when you are hit.' }),
      T('lightwell', 'Lightwell', 'hot', { cost: 60, cd: 180, power: 3.5, dur: 12, school: 'holy', desc: 'Holy talent: a well of light.' }),
      T('mind_flay', 'Mind Flay', 'spell', { channel: true, cost: 45, cast: 3, power: 2.1, school: 'shadow', desc: 'Shadow talent: a channeled Shadow spell.' }),
      T('silence', 'Silence', 'stun', { cost: 20, cd: 45, dur: 3, desc: 'Shadow talent: silences the enemy.' }),
      T('vampiric_embrace', 'Vampiric Embrace', 'buff', { buff: { lifesteal: 0.15 }, desc: 'Shadow talent: Shadow damage heals you.' }),
      T('shadowform', 'Shadowform', 'buff', { buff: { shadow: 0.3, dr: 0.15 }, desc: 'Shadow talent: +30% Shadow, −15% damage taken; blocks Holy spells.' }),
    ],
  },
  {
    id: 'shaman', name: 'Shaman', pl: 'Szaman', color: '#0070DE', resource: 'mana', trees: ['Elemental', 'Enhancement', 'Restoration'],
    bonus: { str: 1, agi: 0, sta: 1, int: 1, spi: 2 }, growth: { str: 1.1, agi: 0.6, sta: 1.2, int: 1.0, spi: 1.1 },
    hp: [55, 16], mana: [80, 16], style: 'melee', armor: plateAt40('leather', 'mail'),
    weapons: { main: ['Mace'], two: ['Staff'], ranged: [], off: ['Shield', 'Orb'] },
    skills: ['Dagger', 'Fist Weapon', 'Axe', 'Mace', 'Greataxe', 'Maul', 'Staff'],
    weights: { str: 1.4, int: 1.4, agi: 0.8, sta: 1, spi: 0.6, sp: 1, armor: 0.03, dps: 12 },
    role: 'Elemental / healer / melee',
    abilities: [
      // nasycenia broni: tylko jedno naraz (wybór w księdze umiejętności)
      A('rockbiter', 'Rockbiter Weapon', 1, 'buff', { buff: { ap: 20 }, group: 'imbue', gprio: 4, desc: 'Imbues your weapon with the power of earth (+attack power).' }),
      A('lightning_bolt', 'Lightning Bolt', 1, 'spell', { cost: 25, cast: 2.0, power: 1.5, school: 'nature', when: ['mana>40'], desc: 'Lightning. Disable it to play purely in melee.' }),
      A('healing_wave', 'Healing Wave', 1, 'heal', { cost: 30, cast: 2.5, cd: 10, power: 2.5, school: 'nature', desc: 'A heal (10 s cooldown in this idler).' }),
      A('earth_shock', 'Earth Shock', 4, 'spell', { cost: 30, cd: 6, power: 1.3, school: 'nature', group: 'shock', gprio: 2, desc: 'Earth Shock: the strongest instant damage, interrupts enemy spells. Shocks share a cooldown, so you pick one.' }),
      A('stoneskin_totem', 'Stoneskin Totem', 4, 'totem', { cost: 12, totem: 'earth', group: 'totem:earth', gprio: 2, buff: { dr: 0.05 }, desc: 'Earth totem: −5% damage taken while you stand near it.' }),
      A('lightning_shield', 'Lightning Shield', 8, 'proc', { proc: { chance: 0.5, power: 0.3, on: 'taken' }, school: 'nature', group: 'eshield', gprio: 1, desc: 'Lightning orbs damage attackers (one elemental shield at a time).' }),
      A('strength_earth', 'Strength of Earth Totem', 10, 'totem', { cost: 15, totem: 'earth', group: 'totem:earth', gprio: 1, buff: { str: 6 }, desc: 'Earth totem: +Strength while you stand near it.' }),
      A('flametongue', 'Flametongue Weapon', 10, 'proc', { proc: { chance: 0.35, power: 0.35, on: 'hit' }, school: 'fire', group: 'imbue', gprio: 2, desc: 'Your weapon deals extra Fire damage.' }),
      A('searing_totem', 'Searing Totem', 10, 'totem', { cost: 18, totem: 'fire', group: 'totem:fire', gprio: 1, tick: { every: 2.2, power: 0.16 }, school: 'fire', desc: 'A fire totem that shoots the enemy every 2.2 s.' }),
      A('flame_shock', 'Flame Shock', 10, 'spell', { cost: 50, cd: 6, power: 0.6, dot: { power: 1.2, dur: 12 }, school: 'fire', group: 'shock', gprio: 1, desc: 'Flame: instant damage plus a burn (DoT) for 12 s. Empowers Lava Burst.' }),
      A('fire_nova', 'Fire Nova', 12, 'spell', { cost: 45, cd: 10, power: 1.0, aoe: true, needTotem: 'fire', school: 'fire', when: ['fireTotem'], desc: 'an explosion of fire around your fire totem (10 s cooldown).' }),
      A('frost_shock', 'Frost Shock', 20, 'spell', { cost: 45, cd: 6, power: 1.15, slow: 8, school: 'frost', group: 'shock', gprio: 3, desc: 'Frost Shock: damage and a slow on the enemy for 8 s (it takes longer to reach you).' }),
      A('ghost_wolf', 'Ghost Wolf', 20, 'buff', { travel: 0.4, desc: 'Ghost wolf form: used automatically when travelling between zones (+40% speed).' }),
      A('frostbrand', 'Frostbrand Weapon', 20, 'proc', { proc: { chance: 0.25, power: 0.42, on: 'hit' }, school: 'frost', group: 'imbue', gprio: 3, desc: 'Your weapon deals Frost damage and slows.' }),
      A('healing_stream', 'Healing Stream Totem', 20, 'totem', { cost: 12, totem: 'water', group: 'totem:water', gprio: 2, tick: { every: 2, heal: 0.07 }, school: 'nature', desc: 'Water totem: heals every 2 s.' }),
      A('lesser_healing_wave', 'Lesser Healing Wave', 20, 'heal', { cost: 25, cast: 1.5, cd: 15, power: 1.7, school: 'nature', when: ['hp<35'], prio: 4, desc: 'A quick heal.' }),
      A('magma_totem', 'Magma Totem', 26, 'totem', { cost: 28, totem: 'fire', group: 'totem:fire', gprio: 2, tick: { every: 2, power: 0.12 }, aoe: true, school: 'fire', desc: 'Fire totem: pulses fire at the whole group.' }),
      A('mana_spring', 'Mana Spring Totem', 26, 'totem', { cost: 10, totem: 'water', group: 'totem:water', gprio: 1, tick: { every: 2, mana: 0.012 }, desc: 'Water totem: restores mana every 2 s.' }),
      A('windfury', 'Windfury Weapon', 30, 'proc', { proc: { chance: 0.2, power: 1, on: 'hit', extra: true }, school: 'physical', group: 'imbue', gprio: 1, desc: '20% chance for an extra attack.' }),
      A('call_elements', 'Call of the Elements', 30, 'totem', { cost: 30, when: ['twoTotems'], prio: 3, desc: 'drops all chosen totems at once.' }),
      A('chain_lightning', 'Chain Lightning', 32, 'spell', { cost: 60, cd: 6, cast: 2.5, power: 1.4, aoe: true, school: 'nature', desc: 'Lightning that jumps between enemies.' }),
      A('windfury_totem', 'Windfury Totem', 32, 'totem', { cost: 14, totem: 'air', group: 'totem:air', gprio: 2, buff: { haste: 0.08 }, desc: 'Air totem: faster melee attacks.' }),
      A('totemic_projection', 'Totemic Projection', 36, 'buff', { desc: 'moves your totems to a new spot (1 min cooldown), so they don\'t disappear when you move to the next enemy.' }),
      A('chain_heal', 'Chain Heal', 40, 'heal', { cost: 50, cast: 2.5, cd: 10, power: 2.9, school: 'nature', desc: 'A chain of healing.' }),
      A('grace_of_air', 'Grace of Air Totem', 42, 'totem', { cost: 16, totem: 'air', group: 'totem:air', gprio: 1, buff: { agi: 6 }, desc: 'Air totem: +Agility.' }),
      T('lava_burst', 'Lava Burst', 'spell', { cost: 40, cd: 8, cast: 2, power: 2.3, dotBonus: 'flame_shock', school: 'fire', prio: 28, desc: 'Elemental talent: lava, +20% when Flame Shock is on the target.' }),
      T('stormstrike', 'Stormstrike', 'strike', { cost: 30, cd: 12, power: 1.6, school: 'nature', prio: 30, desc: 'Enhancement talent: a double storm strike.' }),
      T('rage_farseer', 'Rage of the Farseer', 'cooldown', { cd: 180, dur: 25, buff: { haste: 0.3 }, prio: 6, desc: 'Enhancement talent: +30% attack speed for 25 s.' }),
      T('water_shield', 'Water Shield', 'proc', { proc: { chance: 0.6, power: 0, on: 'taken', mana: 0.02 }, group: 'eshield', gprio: 2, desc: 'Restoration talent: restores 2% mana when you are hit.' }),
      T('natures_swiftness_sh', "Nature's Swiftness", 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, when: ['hp<45'], prio: 3, desc: 'Restoration talent: your next spell is instant.' }),
      T('riptide', 'Riptide', 'hot', { cost: 30, cd: 6, power: 2.4, dur: 15, school: 'nature', desc: 'Restoration talent: an instant heal plus healing over time.' }),
      T('mana_tide', 'Mana Tide Totem', 'regen', { cd: 300, power: 0.3, when: ['mana<30'], desc: 'Restoration talent: restores mana.' }),
    ],
  },
  {
    id: 'mage', name: 'Mage', pl: 'Mag', color: '#69CCF0', resource: 'mana', trees: ['Arcane', 'Fire', 'Frost'],
    bonus: { str: 0, agi: 0, sta: 0, int: 3, spi: 2 }, growth: { str: 0.2, agi: 0.3, sta: 0.8, int: 1.8, spi: 1.4 },
    hp: [42, 12], mana: [120, 22], style: 'caster', armor: () => 'cloth',
    weapons: { main: ['Dagger'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    skills: ['Dagger', 'Sword', 'Staff', 'Wand'],
    weights: { int: 2.1, spi: 1.2, sta: 0.9, sp: 2.2 },
    role: 'Ranged magic',
    abilities: [
      A('frost_armor', 'Frost Armor', 1, 'buff', { buff: { armor: 0.3 }, group: 'armor', gprio: 3, desc: 'Frost armor.' }),
      A('arcane_intellect', 'Arcane Intellect', 1, 'buff', { buff: { int: 6 }, desc: 'Increases Intellect.' }),
      A('fireball', 'Fireball', 1, 'spell', { cost: 30, cast: 3, power: 2.0, school: 'fire', desc: 'A ball of fire.' }),
      A('frostbolt', 'Frostbolt', 4, 'spell', { cost: 25, cast: 2.5, power: 1.75, school: 'frost', desc: 'A bolt of frost.' }),
      A('fire_blast', 'Fire Blast', 6, 'spell', { cost: 40, cd: 8, power: 1.2, school: 'fire', desc: 'An instant burst of fire.' }),
      A('arcane_missiles', 'Arcane Missiles', 8, 'spell', { channel: true, cost: 85, cast: 3, power: 2.4, school: 'arcane', when: ['mana>60'], desc: 'A volley of arcane missiles (channeled).' }),
      A('polymorph', 'Polymorph', 8, 'stun', { cost: 40, cd: 30, cast: 1.5, dur: 10, cc: true, when: ['pack'], desc: 'Turns one enemy from a group into a sheep.' }),
      A('frost_nova', 'Frost Nova', 10, 'stun', { cost: 55, cd: 25, dur: 4, when: ['hp<60'], desc: 'Freezes enemies in place.' }),
      A('arcane_explosion', 'Arcane Explosion', 14, 'spell', { cost: 60, power: 0.9, aoe: true, school: 'arcane', when: ['pack'], desc: 'An explosion of magic around the mage (weaker AoE farming).' }),
      A('flamestrike', 'Flamestrike', 16, 'dot', { cost: 80, cast: 3, cd: 8, power: 1.8, dur: 8, aoe: true, school: 'fire', when: ['pack'], desc: 'A pillar of fire on a group.' }),
      A('blizzard', 'Blizzard', 20, 'spell', { channel: true, cost: 120, cast: 8, power: 3.0, aoe: true, school: 'frost', when: ['pack'], desc: 'An icy blizzard (channeled).' }),
      A('mana_shield', 'Mana Shield', 20, 'shield', { cost: 40, cd: 15, power: 1.6, school: 'arcane', when: ['hp<60'], desc: 'A shield made of mana.' }),
      A('evocation', 'Evocation', 20, 'regen', { channel: true, cd: 480, cast: 8, power: 0.6, when: ['mana<20'], desc: 'Restores 60% mana.' }),
      A('scorch', 'Scorch', 22, 'spell', { cost: 25, cast: 1.5, power: 1.0, school: 'fire', desc: 'A quick Fire spell.' }),
      A('cone_of_cold', 'Cone of Cold', 26, 'spell', { cost: 70, cd: 10, power: 1.1, aoe: true, school: 'frost', when: ['pack'], desc: 'A cone of cold.' }),
      A('ice_armor', 'Ice Armor', 30, 'buff', { buff: { armor: 0.6 }, group: 'armor', gprio: 2, desc: 'A stronger ice armor.' }),
      A('arcane_blast', 'Arcane Blast', 30, 'spell', { cost: 35, cast: 2.5, power: 1.6, school: 'arcane', when: ['mana>40'], desc: 'an arcane spell, each one stronger and more expensive (up to 4 charges).' }),
      A('mage_armor', 'Mage Armor', 34, 'buff', { buff: { castRegen: 0.3 }, group: 'armor', gprio: 1, desc: '30% in-combat mana regeneration.' }),
      T('presence_of_mind', 'Presence of Mind', 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, desc: 'Arcane talent: your next spell is instant.' }),
      T('arcane_power', 'Arcane Power', 'cooldown', { cd: 180, dur: 15, buff: { dmg: 0.3, cost: -0.3 }, desc: 'Arcane talent: +30% damage, +30% cost.' }),
      T('pyroblast', 'Pyroblast', 'spell', { cost: 90, cast: 6, power: 4.2, school: 'fire', when: ['opener'], prio: 3, desc: 'Fire talent: a powerful opening spell.' }),
      T('blast_wave', 'Blast Wave', 'spell', { cost: 80, cd: 45, power: 1.4, aoe: true, school: 'fire', desc: 'Fire talent: a wave of fire.' }),
      T('combustion', 'Combustion', 'cooldown', { cd: 180, dur: 10, buff: { spellCrit: 0.4 }, desc: 'Fire talent: a lot of Fire crits.' }),
      T('cold_snap', 'Cold Snap', 'cooldown', { cd: 600, dur: 1, reset: ['frost_nova', 'cone_of_cold', 'ice_barrier', 'ice_block'], when: ['hp<35'], desc: 'Frost talent: resets Frost spell cooldowns.' }),
      T('ice_block', 'Ice Block', 'cooldown', { cd: 300, dur: 10, buff: { immune: 1 }, when: ['hp<20'], prio: 2, desc: 'Frost talent: encases the mage in ice (invulnerable for 10 s).' }),
      T('ice_barrier', 'Ice Barrier', 'shield', { cost: 60, cd: 30, power: 3, school: 'frost', desc: 'Frost talent: a barrier of ice.' }),
    ],
  },
  {
    id: 'warlock', name: 'Warlock', pl: 'Warlock', color: '#9482C9', resource: 'mana', trees: ['Affliction', 'Demonology', 'Destruction'],
    bonus: { str: 0, agi: 0, sta: 1, int: 2, spi: 2 }, growth: { str: 0.3, agi: 0.4, sta: 1.0, int: 1.5, spi: 1.4 },
    hp: [48, 13], mana: [100, 19], style: 'caster', armor: () => 'cloth',
    weapons: { main: ['Dagger'], two: ['Staff'], ranged: ['Wand'], off: ['Orb'] },
    skills: ['Dagger', 'Sword', 'Staff', 'Wand'],
    weights: { int: 1.6, sta: 1.4, spi: 1.1, sp: 2 },
    role: 'Curses and demons',
    pets: [
      { id: 'imp', name: 'Imp', lvl: 1, dmg: 0.38, school: 'fire' },
      { id: 'voidwalker', name: 'Voidwalker', lvl: 10, tank: true, dmg: 0.22, school: 'shadow' },
      { id: 'succubus', name: 'Succubus', lvl: 20, dmg: 0.55, school: 'shadow' },
      { id: 'felhunter', name: 'Felhunter', lvl: 30, dmg: 0.45, school: 'shadow' },
    ],
    abilities: [
      A('demon_skin', 'Demon Skin', 1, 'buff', { buff: { armor: 0.25 }, group: 'armor', gprio: 2, desc: 'Demon skin.' }),
      A('shadow_bolt', 'Shadow Bolt', 1, 'spell', { cost: 25, cast: 2.5, power: 1.65, school: 'shadow', desc: 'A bolt of shadow.' }),
      A('immolate', 'Immolate', 1, 'dot', { cost: 25, cast: 2.0, power: 1.6, dur: 15, school: 'fire', desc: 'Sets the enemy on fire.' }),
      A('corruption', 'Corruption', 4, 'dot', { cost: 35, power: 1.6, dur: 12, school: 'shadow', desc: 'Corruption over time.' }),
      A('curse_weakness', 'Curse of Weakness', 4, 'buff', { debuff: true, buff: { dr: 0.05 }, group: 'curse', gprio: 2, desc: 'Curse of weakness: the enemy deals less damage.' }),
      A('life_tap', 'Life Tap', 6, 'lifetap', { when: ['mana<30', 'hp>60'], prio: 6, desc: 'Converts health into mana.' }),
      A('curse_agony', 'Curse of Agony', 8, 'dot', { cost: 25, power: 1.5, dur: 24, school: 'shadow', group: 'curse', gprio: 1, desc: 'A curse that deals increasing damage (one curse at a time).' }),
      A('fear', 'Fear', 8, 'stun', { cost: 30, cd: 30, cast: 1.5, dur: 6, when: ['hp<45'], desc: 'Frightens the enemy.' }),
      A('drain_soul', 'Drain Soul', 10, 'drain', { channel: true, cost: 30, cast: 4, power: 1.5, school: 'shadow', when: ['mob<25'], prio: 20, desc: 'Drains the soul of a dying enemy (channeled).' }),
      A('drain_life', 'Drain Life', 14, 'drain', { channel: true, cost: 40, cast: 5, power: 1.6, heal: 1, school: 'shadow', when: ['hp<60'], prio: 9, desc: 'Drains life (channeled).' }),
      A('searing_pain', 'Searing Pain', 18, 'spell', { cost: 30, cast: 1.5, power: 1.1, school: 'fire', desc: 'A quick Fire spell.' }),
      A('rain_of_fire', 'Rain of Fire', 20, 'spell', { channel: true, cost: 100, cast: 8, power: 3.0, aoe: true, school: 'fire', when: ['pack'], desc: 'A rain of fire (channeled).' }),
      A('demon_armor', 'Demon Armor', 20, 'buff', { buff: { armor: 0.4, castRegen: 0.1 }, group: 'armor', gprio: 1, desc: 'Demonic armor.' }),
      A('hellfire', 'Hellfire', 30, 'spell', { channel: true, cost: 90, cast: 6, power: 2.6, aoe: true, school: 'fire', when: ['pack', 'hp>60'], desc: 'Hellfire around you (channeled).' }),
      A('shadow_ward', 'Shadow Ward', 32, 'shield', { cost: 30, cd: 30, power: 1.4, school: 'shadow', when: ['hp<60'], desc: 'Protection from Shadow.' }),
      A('howl_terror', 'Howl of Terror', 40, 'stun', { cost: 50, cd: 40, cast: 1.5, dur: 5, when: ['pack', 'hp<50'], desc: 'Frightens nearby enemies.' }),
      A('drain_hope', 'Drain Hope', 40, 'drain', { channel: true, cost: 45, cd: 12, cast: 3, power: 1.8, dur: 12, buff: { dot: 0.2 }, school: 'shadow', prio: 34, desc: 'channeled Shadow, empowers your DoTs on the target (+20% for 12 s).' }),
      A('death_coil', 'Death Coil', 42, 'drain', { cost: 60, cd: 120, power: 1.4, heal: 1, school: 'shadow', when: ['hp<50'], prio: 5, desc: 'Frightens and drains life.' }),
      A('soul_fire', 'Soul Fire', 48, 'spell', { cost: 90, cd: 60, cast: 6, power: 3.6, school: 'fire', when: ['opener'], prio: 4, desc: 'A powerful soul fire.' }),
      A('summon_imp', 'Summon Imp', 1, 'summon', { desc: 'Imp: deals Fire damage.' }),
      A('summon_voidwalker', 'Summon Voidwalker', 10, 'summon', { desc: 'Voidwalker: takes hits for you.' }),
      A('summon_succubus', 'Summon Succubus', 20, 'summon', { desc: 'Succubus: the most damage.' }),
      A('summon_felhunter', 'Summon Felhunter', 30, 'summon', { desc: 'Felhunter: Shadow damage.' }),
      T('amplify_curse', 'Amplify Curse', 'cooldown', { cd: 180, dur: 24, buff: { 'ab:curse_agony': 0.5 }, prio: 7, desc: 'Affliction talent: +50% curse damage.' }),
      T('siphon_life', 'Siphon Life', 'dot', { cost: 40, power: 1.4, dur: 15, heal: 0.5, school: 'shadow', desc: 'Affliction talent: a DoT that heals the warlock.' }),
      T('dark_pact', 'Dark Pact', 'regen', { cd: 30, power: 0.15, when: ['mana<30'], prio: 7, desc: 'Affliction talent: mana from your demon.' }),
      T('demonic_sacrifice', 'Demonic Sacrifice', 'buff', { buff: { noPet: 1, dmg: 0.15 }, desc: 'Demonology talent: sacrifices your demon, +15% damage.' }),
      T('soul_link', 'Soul Link', 'buff', { buff: { dr: 0.2 }, desc: 'Demonology talent: 20% of damage is taken by your demon.' }),
      T('shadowburn', 'Shadowburn', 'spell', { cost: 50, cd: 15, power: 1.7, school: 'shadow', when: ['mob<20'], prio: 18, desc: 'Destruction talent: a finishing Shadow spell.' }),
      T('conflagrate', 'Conflagrate', 'spell', { cost: 45, cd: 10, power: 1.8, school: 'fire', when: ['dot:immolate'], prio: 32, desc: 'Destruction talent: detonates Immolate.' }),
    ],
  },
  {
    id: 'druid', name: 'Druid', pl: 'Druid', color: '#FF7D0A', resource: 'mana', trees: ['Balance', 'Feral Combat', 'Restoration'],
    bonus: { str: 1, agi: 0, sta: 0, int: 2, spi: 2 }, growth: { str: 0.9, agi: 0.9, sta: 1.0, int: 1.2, spi: 1.3 },
    hp: [50, 15], mana: [90, 18], style: 'caster', armor: () => 'leather',
    weapons: { main: ['Mace'], two: ['Staff'], ranged: [], off: ['Orb'] },
    skills: ['Dagger', 'Fist Weapon', 'Mace', 'Maul', 'Staff'],
    weights: { int: 1.4, agi: 1.1, str: 1, sta: 1, spi: 1, sp: 1.4 },
    role: 'Shapeshifting hybrid',
    abilities: [
      A('mark_wild', 'Mark of the Wild', 1, 'buff', { buff: { all: 3, armor: 0.1 }, desc: 'Increases all attributes.' }),
      A('wrath', 'Wrath', 1, 'spell', { cost: 20, cast: 2.0, power: 1.45, school: 'nature', form: 'caster', desc: 'Nature\'s wrath.' }),
      A('healing_touch', 'Healing Touch', 1, 'heal', { cost: 30, cast: 3, cd: 10, power: 2.8, school: 'nature', form: 'caster', desc: 'A heal.' }),
      A('moonfire', 'Moonfire', 4, 'spell', { cost: 25, power: 0.5, dot: { power: 1.0, dur: 12 }, school: 'arcane', form: 'caster', desc: 'Moonbeam: instant damage plus more over 12 s (DoT on the enemy).' }),
      A('rejuvenation', 'Rejuvenation', 4, 'hot', { cost: 25, power: 2.0, dur: 12, school: 'nature', form: 'caster', desc: 'Healing over time.' }),
      A('thorns', 'Thorns', 6, 'proc', { proc: { chance: 1, power: 0.1, on: 'taken' }, school: 'nature', desc: 'Thorns that damage attackers.' }),
      A('entangling_roots', 'Entangling Roots', 8, 'stun', { cost: 50, cd: 20, cast: 1.5, dur: 3, form: 'caster', when: ['hp<50'], desc: 'Entangles the enemy in roots.' }),
      A('bear_form', 'Bear Form', 10, 'form', { form: 'bear', desc: 'Bear form: Rage, lots of armor and health.' }),
      A('maul', 'Maul', 10, 'strike', { cost: 15, power: 1.3, school: 'physical', form: 'bear', when: ['res>=25'], desc: 'A powerful paw strike.' }),
      A('demoralizing_roar', 'Demoralizing Roar', 10, 'buff', { debuff: true, buff: { dr: 0.05 }, form: 'bear', desc: 'Weakens enemy attacks.' }),
      A('enrage', 'Enrage', 12, 'cooldown', { cd: 60, gain: 20, dur: 10, form: 'bear', when: ['opener'], prio: 2, desc: 'Instantly grants 20 Rage.' }),
      A('regrowth', 'Regrowth', 12, 'heal', { cost: 45, cast: 2, cd: 12, power: 2.6, school: 'nature', form: 'caster', desc: 'A heal with an over-time effect.' }),
      A('bash', 'Bash', 14, 'stun', { cost: 10, cd: 60, dur: 3, melee: true, form: 'bear', desc: 'Stuns the enemy for 3 s.' }),
      A('swipe', 'Swipe', 16, 'strike', { cost: 20, power: 0.8, aoe: true, school: 'physical', form: 'bear', when: ['pack'], desc: 'A swipe at everything nearby.' }),
      A('faerie_fire', 'Faerie Fire', 18, 'buff', { debuff: true, buff: { meleeDmg: 0.04 }, desc: 'Faerie fire: the enemy loses armor (+4% physical damage).' }),
      A('cat_form', 'Cat Form', 20, 'form', { form: 'cat', desc: 'Cat form: Energy, combo points, quick strikes.' }),
      A('claw', 'Claw', 20, 'strike', { cost: 40, power: 0.9, cp: 1, school: 'physical', form: 'cat', desc: 'Claws (grants a combo point).' }),
      A('rip', 'Rip', 20, 'finisher', { cost: 30, power: 0.6, dur: 12, school: 'physical', form: 'cat', when: ['noDot', 'mob>50'], prio: 24, desc: 'Finisher: a bleed.' }),
      A('starfire', 'Starfire', 20, 'spell', { cost: 90, cast: 3, power: 2.4, school: 'arcane', form: 'caster', when: ['mana>40'], desc: 'A powerful starfire.' }),
      A('shred', 'Shred', 22, 'strike', { cost: 60, power: 1.5, cp: 1, school: 'physical', form: 'cat', when: ['stunned'], prio: 50, desc: 'Shreds from behind.' }),
      A('rake', 'Rake', 24, 'dot', { cost: 35, power: 0.9, dur: 9, cp: 1, melee: true, school: 'physical', form: 'cat', desc: 'A bleed (grants a combo point).' }),
      A('tigers_fury', "Tiger's Fury", 24, 'cooldown', { cost: 30, cd: 30, dur: 6, buff: { dmg: 0.15 }, form: 'cat', when: ['res>=50'], desc: '+15% damage for 6 s.' }),
      A('travel_form', 'Travel Form', 30, 'buff', { travel: 0.4, desc: 'Travel form: used automatically when travelling between zones (+40% speed).' }),
      A('tranquility', 'Tranquility', 30, 'heal', { channel: true, cost: 80, cd: 300, cast: 5, power: 4.5, school: 'nature', form: 'caster', when: ['hp<35'], desc: 'Channeled healing around the druid.' }),
      A('ravage', 'Ravage', 32, 'strike', { cost: 60, power: 2.3, cp: 1, school: 'physical', form: 'cat', when: ['opener'], prio: 2, desc: 'Opener from stealth: a powerful strike.' }),
      A('ferocious_bite', 'Ferocious Bite', 32, 'finisher', { cost: 35, power: 0.75, school: 'physical', form: 'cat', desc: 'Finisher: a powerful bite.' }),
      A('pounce', 'Pounce', 36, 'stun', { cost: 50, dur: 3, cp: 1, melee: true, form: 'cat', when: ['opener'], prio: 1, desc: 'Opener from stealth: stuns for 3 s.' }),
      A('frenzied_regen', 'Frenzied Regeneration', 36, 'heal', { cd: 180, healPct: 0.25, form: 'bear', when: ['hp<40'], prio: 3, desc: 'Converts Rage into health (+25% HP).' }),
      A('innervate', 'Innervate', 40, 'regen', { cd: 360, power: 0.5, form: 'caster', when: ['mana<20'], desc: 'Fast mana regeneration.' }),
      A('hurricane', 'Hurricane', 40, 'spell', { channel: true, cost: 120, cd: 60, cast: 10, power: 3.5, aoe: true, school: 'nature', form: 'caster', when: ['pack'], desc: 'A hurricane (channeled).' }),
      A('barkskin', 'Barkskin', 44, 'cooldown', { cd: 60, dur: 12, buff: { dr: 0.2 }, when: ['hp<50'], desc: '−20% damage taken for 12 s.' }),
      T('moonkin_form', 'Moonkin Form', 'form', { form: 'moonkin', desc: 'Balance talent: owl form (armor, spell crits).' }),
      T('feral_charge', 'Feral Charge', 'stun', { cost: 5, cd: 15, dur: 1, closes: true, forms: ['bear', 'cat'], when: ['opener'], prio: 1, desc: 'Feral talent: a bear charge or a cat leap.' }),
      T('mangle', 'Mangle', 'strike', { cost: 40, cd: 6, power: 1.35, cp: 1, school: 'physical', forms: ['bear', 'cat'], prio: 31, desc: 'Feral talent: mangle (cat and bear).' }),
      T('leader_pack', 'Leader of the Pack', 'buff', { buff: { crit: 0.03 }, desc: 'Feral talent: +3% critical strike chance.' }),
      T('berserk', 'Berserk', 'cooldown', { cd: 180, dur: 15, buff: { crit: 0.5, sweep: 1 }, forms: ['bear', 'cat'], when: ['boss'], prio: 5, desc: 'Feral talent: a big cooldown, Mangle on multiple targets and many crits.' }),
      T('insect_swarm', 'Insect Swarm', 'dot', { cost: 30, power: 1.3, dur: 12, school: 'nature', form: 'caster', desc: 'Restoration talent: an insect swarm.' }),
      T('natures_swiftness_dr', "Nature's Swiftness", 'cooldown', { cd: 180, dur: 4, buff: { instant: 1 }, when: ['hp<45'], prio: 3, desc: 'Restoration talent: your next spell is instant.' }),
      T('swiftmend', 'Swiftmend', 'heal', { cost: 40, cd: 15, power: 2.8, school: 'nature', form: 'caster', when: ['hp<45', 'hot'], prio: 2, desc: 'Restoration talent: an instant heal.' }),
    ],
  },
]

export const classById = (id: ClassId) => CLASSES.find((c) => c.id === id)!
export const startSkills = (c: ClassDef) => [...new Set([...c.weapons.main, ...c.weapons.two, ...c.weapons.ranged])].filter((w) => c.skills.includes(w))

// Czy umiejętność wymaga zwarcia
export const isMelee = (a: Ability) => a.melee ?? (a.kind === 'strike' || a.kind === 'finisher' || a.kind === 'execute')

// Rangi umiejętności: kolejne rangi co 6 poziomów (ataki/czary) lub co 10 (buffy, kontrola, totemy)
export function ranksOf(a: Ability): number[] {
  if (a.talent || a.travel || a.kind === 'form' || a.kind === 'summon' || a.healPct || a.reset || a.id === 'call_elements' || a.id === 'totemic_projection') return [a.lvl]
  const step = a.kind === 'buff' || a.kind === 'stun' || a.kind === 'cooldown' || a.kind === 'lifetap' || a.kind === 'proc' || a.kind === 'regen' || a.kind === 'totem' ? 10 : 6
  const out: number[] = []
  for (let l = a.lvl; l <= 60; l += step) out.push(l)
  return out
}
// Koszt nauki rangi u trenera (miedziaki), skala jak w Classicu: ~4 s na 10 poz., ~4 g na 60
export const trainCost = (lvl: number) => (lvl <= 1 ? 0 : Math.max(10, Math.round(Math.pow(lvl, 2.6))))
