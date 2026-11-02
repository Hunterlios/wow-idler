// Rasy z WoW Classic (patch 1.12). Staty bazowe na 1 poziomie (przed bonusem klasy).
import type { ClassId } from './classes'

export type Faction = 'alliance' | 'horde'
export type RaceId = 'human' | 'dwarf' | 'nightelf' | 'gnome' | 'orc' | 'undead' | 'tauren' | 'troll'
export type Stats = { str: number; agi: number; sta: number; int: number; spi: number }

export type Racial = {
  name: string
  desc: string // opis z oryginału (skrócony)
  inGame?: string // jak działa w tym demie
}

export type Race = {
  id: RaceId
  name: string
  plural: string
  faction: Faction
  classes: ClassId[]
  start: { zone: string; area: string; settlement: string; capital: string }
  base: Stats
  racials: Racial[]
  blurb: string
  look: { skin: string; hair: string; height: number; width: number; feature?: 'ears' | 'beard' | 'horns' | 'tusks' | 'bones' | 'bignose' }
  // modyfikatory pasywne używane przez symulację
  mods: Partial<{ spiPct: number; intPct: number; hpPct: number; dodge: number; regenPct: number; beastDmg: number; respawnPct: number; lootPct: number; petDmg: number
    travelPct: number; resist: number; questGold: number; repairPct: number; pushback: number }>
  // specjalizacje broni: +5 do umiejętności tych typów (jak w Classicu)
  wspec?: Record<string, number>
  // umiejętności rasowe aktywne (postać używa ich sama, widać je w pasku buffów i w księdze)
  actives: RacialId[]
}
export type RacialId = 'bloodfury' | 'berserking' | 'stoneform' | 'warstomp' | 'cannibalize' | 'shadowmeld' | 'escape' | 'perception' | 'wotf'
// Rasowe aktywne: nazwa, czas trwania i cooldown (s), opis działania w grze
export const RACIAL_ACTIVE: Record<RacialId, { name: string; dur: number; cd: number; school: 'physical' | 'fire' | 'nature' | 'shadow' | 'arcane' | 'holy' | 'frost'; text: string }> = {
  bloodfury: { name: 'Blood Fury', dur: 15, cd: 120, school: 'fire', text: '+25% base attack power for 15 s. Used at the start of a fight.' },
  berserking: { name: 'Berserking', dur: 10, cd: 180, school: 'fire', text: 'Attack and casting speed +10% to +30% (the lower your health, the more) for 10 s. Used at the start of a fight.' },
  stoneform: { name: 'Stoneform', dur: 8, cd: 180, school: 'physical', text: '+10% armor and 20% less damage taken for 8 s. Used when your health drops below 40%.' },
  warstomp: { name: 'War Stomp', dur: 2, cd: 120, school: 'physical', text: 'Stuns enemies for 2 s when they reach melee range.' },
  cannibalize: { name: 'Cannibalize', dur: 10, cd: 120, school: 'shadow', text: 'With no food after a fight, eats a corpse: heals 35% health over 10 s.' },
  shadowmeld: { name: 'Shadowmeld', dur: 0, cd: 300, school: 'shadow', text: 'When your health drops below 10%, you melt into the shadows: the enemy loses sight of you and the fight ends (no death, no loot).' },
  escape: { name: 'Escape Artist', dur: 0, cd: 60, school: 'arcane', text: 'Spellcasters: when an enemy reaches melee range, you slip away to range (the enemy needs 2 more seconds to reach you).' },
  perception: { name: 'Perception', dur: 20, cd: 180, school: 'holy', text: '+10% damage for 20 s against bosses and groups of 3 enemies.' },
  wotf: { name: 'Will of the Forsaken', dur: 5, cd: 120, school: 'shadow', text: 'When an enemy interrupts or pushes back a spell: for 5 s your spells can\'t be interrupted or pushed back.' },
}

export const RACES: Race[] = [
  {
    id: 'human', name: 'Human', plural: 'Humans', faction: 'alliance',
    classes: ['warrior', 'paladin', 'rogue', 'priest', 'mage', 'warlock'],
    start: { zone: 'northshire', area: 'Northshire Valley', settlement: 'Northshire Abbey', capital: 'Stormwind' },
    base: { str: 20, agi: 20, sta: 20, int: 20, spi: 21 },
    blurb: 'The most versatile race of the Alliance. The kingdom of Stormwind, rebuilt after the First War.',
    racials: [
      { name: 'The Human Spirit', desc: 'Spirit increased by 5%.', inGame: '+5% Spirit' },
      { name: 'Perception', desc: 'Active: increases stealth detection for 20 s.', inGame: '+10% damage for 20 s against bosses and groups (3 min CD)' },
      { name: 'Sword Specialization', desc: '+5 Swords skill.', inGame: '+5 Swords skill (one- and two-handed)' },
      { name: 'Mace Specialization', desc: '+5 Maces skill.', inGame: '+5 Maces skill (one- and two-handed)' },
      { name: 'Diplomacy', desc: 'Reputation gains increased by 10%.', inGame: '+10% gold from quest rewards' },
    ],
    look: { skin: '#e8b98f', hair: '#6b4423', height: 24, width: 10 },
    mods: { spiPct: 0.05, questGold: 0.1 },
    wspec: { Sword: 5, Greatsword: 5, Mace: 5, Maul: 5 },
    actives: ['perception'],
  },
  {
    id: 'dwarf', name: 'Dwarf', plural: 'Dwarves', faction: 'alliance',
    classes: ['warrior', 'paladin', 'hunter', 'rogue', 'priest'],
    start: { zone: 'coldridge', area: 'Coldridge Valley', settlement: 'Anvilmar', capital: 'Ironforge' },
    base: { str: 22, agi: 16, sta: 23, int: 19, spi: 19 },
    blurb: 'Hardy miners of Ironforge, loyal allies of humanity and explorers of titan secrets.',
    racials: [
      { name: 'Stoneform', desc: 'Active: immunity to bleed, poison and disease, +10% armor for 8 s.', inGame: 'Below 40% health: +10% armor and -20% damage taken for 8 s (3 min CD)' },
      { name: 'Gun Specialization', desc: '+5 Guns skill.', inGame: '+5 Guns skill' },
      { name: 'Frost Resistance', desc: '+10 Frost resistance.', inGame: '2% less damage taken' },
      { name: 'Treasure Finding', desc: 'Allows the dwarf to sense nearby treasure chests.', inGame: '+5% chance for extra loot' },
    ],
    look: { skin: '#e3a882', hair: '#8a4b20', height: 18, width: 12, feature: 'beard' },
    mods: { lootPct: 0.05, resist: 0.02 },
    wspec: { Gun: 5 },
    actives: ['stoneform'],
  },
  {
    id: 'nightelf', name: 'Night Elf', plural: 'Night Elves', faction: 'alliance',
    classes: ['warrior', 'hunter', 'rogue', 'priest', 'druid'],
    start: { zone: 'shadowglen', area: 'Shadowglen', settlement: 'Aldrassil', capital: 'Darnassus' },
    base: { str: 17, agi: 25, sta: 19, int: 20, spi: 20 },
    blurb: 'An ancient race from the island of Teldrassil, guardians of nature and followers of Elune.',
    racials: [
      { name: 'Shadowmeld', desc: 'Active: hide in the shadows while standing still.', inGame: 'Below 10% health: escape the fight without dying (5 min CD)' },
      { name: 'Quickness', desc: 'Dodge chance increased by 1%.', inGame: '+1% dodge' },
      { name: 'Wisp Spirit', desc: 'Moves 50% faster as a ghost.', inGame: 'Shorter corpse run' },
      { name: 'Nature Resistance', desc: '+10 Nature resistance.', inGame: '2% less damage taken' },
    ],
    look: { skin: '#a58fd6', hair: '#3e6fb5', height: 27, width: 9, feature: 'ears' },
    mods: { dodge: 0.01, respawnPct: 0.5, resist: 0.02 },
    actives: ['shadowmeld'],
  },
  {
    id: 'gnome', name: 'Gnome', plural: 'Gnomes', faction: 'alliance',
    classes: ['warrior', 'rogue', 'mage', 'warlock'],
    start: { zone: 'coldridge', area: 'Coldridge Valley', settlement: 'Anvilmar', capital: 'Ironforge' },
    base: { str: 15, agi: 23, sta: 19, int: 24, spi: 20 },
    blurb: 'Brilliant inventors exiled from Gnomeregan who found refuge with the dwarves of Ironforge.',
    racials: [
      { name: 'Escape Artist', desc: 'Active: escape the effects of any immobilization or movement speed reduction.', inGame: 'Mage / warlock: slips away from an enemy in melee for 2 s (1 min CD)' },
      { name: 'Expansive Mind', desc: 'Intellect increased by 5%.', inGame: '+5% Intellect' },
      { name: 'Arcane Resistance', desc: '+10 Arcane resistance.', inGame: '2% less damage taken' },
      { name: 'Engineering Specialization', desc: '+15 Engineering skill.', inGame: 'Gear repairs 20% cheaper' },
    ],
    look: { skin: '#f1cfb0', hair: '#e0508a', height: 15, width: 9, feature: 'bignose' },
    mods: { intPct: 0.05, resist: 0.02, repairPct: 0.2 },
    actives: ['escape'],
  },
  {
    id: 'orc', name: 'Orc', plural: 'Orcs', faction: 'horde',
    classes: ['warrior', 'hunter', 'rogue', 'shaman', 'warlock'],
    start: { zone: 'valley_of_trials', area: 'Valley of Trials', settlement: 'The Den', capital: 'Orgrimmar' },
    base: { str: 23, agi: 17, sta: 22, int: 17, spi: 23 },
    blurb: 'Thrall\'s warriors, freed from the demonic curse, building a new home in Durotar.',
    racials: [
      { name: 'Blood Fury', desc: 'Active: +25% base attack power for 15 s.', inGame: 'At the start of a fight: +25% attack power for 15 s (2 min CD)' },
      { name: 'Hardiness', desc: '+25% chance to resist stun effects.', inGame: 'Spells are interrupted and pushed back by hits 25% less often' },
      { name: 'Command', desc: 'Damage dealt by beasts and demons increased by 5%.', inGame: '+5% pet damage' },
      { name: 'Axe Specialization', desc: '+5 Axes skill.', inGame: '+5 Axes skill (one- and two-handed)' },
    ],
    look: { skin: '#5f8f3a', hair: '#1d1d1d', height: 25, width: 13, feature: 'tusks' },
    mods: { petDmg: 0.05, pushback: 0.25 },
    wspec: { Axe: 5, Greataxe: 5 },
    actives: ['bloodfury'],
  },
  {
    id: 'undead', name: 'Undead', plural: 'Forsaken', faction: 'horde',
    classes: ['warrior', 'rogue', 'priest', 'mage', 'warlock'],
    start: { zone: 'deathknell', area: 'Deathknell', settlement: 'Deathknell', capital: 'Undercity' },
    base: { str: 19, agi: 18, sta: 21, int: 18, spi: 25 },
    blurb: 'The Forsaken led by Sylvanas, freed from the Lich King\'s control, living in the ruins of Lordaeron.',
    racials: [
      { name: 'Will of the Forsaken', desc: 'Active: immunity to fear, sleep and charm for 5 s.', inGame: 'After an interrupted spell: 5 s without interrupts or pushback (2 min CD)' },
      { name: 'Cannibalize', desc: 'Active: heals 7% health every 2 s for 10 s while eating a corpse.', inGame: 'Without food: heals 35% health after a fight (2 min CD)' },
      { name: 'Underwater Breathing', desc: 'Underwater breath lasts 4x longer.', inGame: 'Resting after a fight is 25% faster' },
      { name: 'Shadow Resistance', desc: '+10 Shadow resistance.', inGame: '2% less damage taken' },
    ],
    look: { skin: '#9aa58e', hair: '#3a3a3a', height: 23, width: 9, feature: 'bones' },
    mods: { regenPct: 0.25, resist: 0.02 },
    actives: ['cannibalize', 'wotf'],
  },
  {
    id: 'tauren', name: 'Tauren', plural: 'Tauren', faction: 'horde',
    classes: ['warrior', 'hunter', 'shaman', 'druid'],
    start: { zone: 'camp_narache', area: 'Red Cloud Mesa', settlement: 'Camp Narache', capital: 'Thunder Bluff' },
    base: { str: 25, agi: 15, sta: 22, int: 15, spi: 22 },
    blurb: 'Peaceful giants of the plains of Mulgore who worship the Earth Mother.',
    racials: [
      { name: 'War Stomp', desc: 'Active: stuns up to 5 enemies for 2 s.', inGame: 'Stuns enemies for 2 s when they reach melee range (2 min CD)' },
      { name: 'Endurance', desc: 'Base health increased by 5%.', inGame: '+5% HP' },
      { name: 'Plainsrunning', desc: 'Replaces Cultivation (+15 Herbalism), since there are no professions here: the tauren are born wanderers of the Mulgore plains.', inGame: 'Walking between zones is 10% faster' },
      { name: 'Nature Resistance', desc: '+10 Nature resistance.', inGame: '2% less damage taken' },
    ],
    look: { skin: '#7a5236', hair: '#2e1d12', height: 30, width: 16, feature: 'horns' },
    mods: { hpPct: 0.05, travelPct: 0.1, resist: 0.02 },
    actives: ['warstomp'],
  },
  {
    id: 'troll', name: 'Troll', plural: 'Trolls', faction: 'horde',
    classes: ['warrior', 'hunter', 'rogue', 'priest', 'shaman', 'mage'],
    start: { zone: 'valley_of_trials', area: 'Valley of Trials', settlement: 'The Den', capital: 'Orgrimmar' },
    base: { str: 21, agi: 22, sta: 21, int: 16, spi: 21 },
    blurb: 'The Darkspear tribe, rescued by Thrall and settled on the coast of Durotar.',
    racials: [
      { name: 'Berserking', desc: 'Active: increases attack and casting speed by 10-30% for 10 s.', inGame: 'At the start of a fight: +10-30% speed for 10 s (3 min CD)' },
      { name: 'Regeneration', desc: 'Health regeneration increased by 10%; 10% of it works in combat.', inGame: '+10% health regeneration' },
      { name: 'Beast Slaying', desc: '+5% damage dealt to beasts.', inGame: '+5% damage vs beasts' },
      { name: 'Throwing / Bow Specialization', desc: '+5 Bows and Thrown skill.', inGame: '+5 Bows and Thrown skill' },
    ],
    look: { skin: '#4f8fa8', hair: '#d24a2a', height: 27, width: 10, feature: 'tusks' },
    mods: { regenPct: 0.1, beastDmg: 0.05 },
    wspec: { Bow: 5, Thrown: 5 },
    actives: ['berserking'],
  },
]

export const raceById = (id: RaceId) => RACES.find((r) => r.id === id)!
