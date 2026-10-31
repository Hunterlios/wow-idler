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
  mods: Partial<{ spiPct: number; intPct: number; hpPct: number; dodge: number; regenPct: number; beastDmg: number; respawnPct: number; lootPct: number; petDmg: number }>
  active?: 'bloodfury' | 'berserking' | 'stoneform' | 'warstomp' | 'cannibalize' | 'shadowmeld' | 'escape' | 'perception' | 'wotf'
}

export const RACES: Race[] = [
  {
    id: 'human', name: 'Human', plural: 'Humans', faction: 'alliance',
    classes: ['warrior', 'paladin', 'rogue', 'priest', 'mage', 'warlock'],
    start: { zone: 'northshire', area: 'Northshire Valley', settlement: 'Northshire Abbey', capital: 'Stormwind' },
    base: { str: 20, agi: 20, sta: 20, int: 20, spi: 21 },
    blurb: 'Najbardziej wszechstronna rasa Przymierza. Królestwo Stormwind odbudowane po Pierwszej Wojnie.',
    racials: [
      { name: 'The Human Spirit', desc: 'Spirit zwiększony o 5%.', inGame: '+5% Spirit' },
      { name: 'Perception', desc: 'Aktywna: zwiększa wykrywanie ukrycia na 20 s.' },
      { name: 'Sword Specialization', desc: '+5 do umiejętności walki mieczami.', inGame: '+1% trafień krytycznych' },
      { name: 'Mace Specialization', desc: '+5 do umiejętności walki buławami.' },
      { name: 'Diplomacy', desc: 'Reputacja zdobywana o 10% szybciej.' },
    ],
    look: { skin: '#e8b98f', hair: '#6b4423', height: 24, width: 10 },
    mods: { spiPct: 0.05 },
  },
  {
    id: 'dwarf', name: 'Dwarf', plural: 'Dwarves', faction: 'alliance',
    classes: ['warrior', 'paladin', 'hunter', 'rogue', 'priest'],
    start: { zone: 'coldridge', area: 'Coldridge Valley', settlement: 'Anvilmar', capital: 'Ironforge' },
    base: { str: 22, agi: 16, sta: 23, int: 19, spi: 19 },
    blurb: 'Twardzi górnicy z Ironforge, wierni sojusznicy ludzi i odkrywcy tytańskich tajemnic.',
    racials: [
      { name: 'Stoneform', desc: 'Aktywna: odporność na krwawienie, truciznę i choroby, +10% pancerza na 8 s.', inGame: 'Używana automatycznie przy niskim HP' },
      { name: 'Gun Specialization', desc: '+5 do umiejętności strzelania z broni palnej.' },
      { name: 'Frost Resistance', desc: '+10 odporności na mróz.' },
      { name: 'Treasure Finding', desc: 'Pozwala wykrywać skrzynie ze skarbami.', inGame: '+5% szans na dodatkowy łup' },
    ],
    look: { skin: '#e3a882', hair: '#8a4b20', height: 18, width: 12, feature: 'beard' },
    mods: { lootPct: 0.05 },
    active: 'stoneform',
  },
  {
    id: 'nightelf', name: 'Night Elf', plural: 'Night Elves', faction: 'alliance',
    classes: ['warrior', 'hunter', 'rogue', 'priest', 'druid'],
    start: { zone: 'shadowglen', area: 'Shadowglen', settlement: 'Aldrassil', capital: 'Darnassus' },
    base: { str: 17, agi: 25, sta: 19, int: 20, spi: 20 },
    blurb: 'Pradawna rasa z wyspy Teldrassil, strażnicy natury i kultu Elune.',
    racials: [
      { name: 'Shadowmeld', desc: 'Aktywna: ukrycie się w cieniu, gdy postać stoi w miejscu.' },
      { name: 'Quickness', desc: 'Szansa na unik zwiększona o 1%.', inGame: '+1% uniku' },
      { name: 'Wisp Spirit', desc: 'Jako duch porusza się o 50% szybciej.', inGame: 'Krótszy powrót po śmierci' },
      { name: 'Nature Resistance', desc: '+10 odporności na naturę.' },
    ],
    look: { skin: '#a58fd6', hair: '#3e6fb5', height: 27, width: 9, feature: 'ears' },
    mods: { dodge: 0.01, respawnPct: 0.5 },
  },
  {
    id: 'gnome', name: 'Gnome', plural: 'Gnomes', faction: 'alliance',
    classes: ['warrior', 'rogue', 'mage', 'warlock'],
    start: { zone: 'coldridge', area: 'Coldridge Valley', settlement: 'Anvilmar', capital: 'Ironforge' },
    base: { str: 15, agi: 23, sta: 19, int: 24, spi: 20 },
    blurb: 'Genialni wynalazcy wygnani z Gnomeregan, schronienie znaleźli u krasnoludów w Ironforge.',
    racials: [
      { name: 'Escape Artist', desc: 'Aktywna: uwolnienie się z unieruchomienia i spowolnienia.' },
      { name: 'Expansive Mind', desc: 'Intellect zwiększony o 5%.', inGame: '+5% Intellect' },
      { name: 'Arcane Resistance', desc: '+10 odporności na magię tajemną.' },
      { name: 'Engineering Specialization', desc: '+15 do Engineering.' },
    ],
    look: { skin: '#f1cfb0', hair: '#e0508a', height: 15, width: 9, feature: 'bignose' },
    mods: { intPct: 0.05 },
  },
  {
    id: 'orc', name: 'Orc', plural: 'Orcs', faction: 'horde',
    classes: ['warrior', 'hunter', 'rogue', 'shaman', 'warlock'],
    start: { zone: 'valley_of_trials', area: 'Valley of Trials', settlement: 'The Den', capital: 'Orgrimmar' },
    base: { str: 23, agi: 17, sta: 22, int: 17, spi: 23 },
    blurb: 'Uwolnieni spod klątwy demonów wojownicy Thralla, budujący nowy dom w Durotarze.',
    racials: [
      { name: 'Blood Fury', desc: 'Aktywna: +25% bazowej siły ataku na 15 s.', inGame: 'Używana automatycznie w walce' },
      { name: 'Hardiness', desc: '+25% szans na oparcie się ogłuszeniu.' },
      { name: 'Command', desc: 'Obrażenia zwierząt i demonów zwiększone o 5%.', inGame: '+5% obrażeń pupila' },
      { name: 'Axe Specialization', desc: '+5 do umiejętności walki toporami.' },
    ],
    look: { skin: '#5f8f3a', hair: '#1d1d1d', height: 25, width: 13, feature: 'tusks' },
    mods: { petDmg: 0.05 },
    active: 'bloodfury',
  },
  {
    id: 'undead', name: 'Undead', plural: 'Forsaken', faction: 'horde',
    classes: ['warrior', 'rogue', 'priest', 'mage', 'warlock'],
    start: { zone: 'deathknell', area: 'Deathknell', settlement: 'Deathknell', capital: 'Undercity' },
    base: { str: 19, agi: 18, sta: 21, int: 18, spi: 25 },
    blurb: 'Forsaken pod wodzą Sylvanas, wyzwoleni spod władzy Króla Lisza, żyjący w ruinach Lordaeronu.',
    racials: [
      { name: 'Will of the Forsaken', desc: 'Aktywna: odporność na strach, sen i zauroczenie na 5 s.' },
      { name: 'Cannibalize', desc: 'Aktywna: leczy 7% HP co 2 s przez 10 s, zjadając zwłoki.', inGame: 'Szybszy odpoczynek po walce' },
      { name: 'Underwater Breathing', desc: 'Oddychanie pod wodą 4x dłużej.' },
      { name: 'Shadow Resistance', desc: '+10 odporności na cień.' },
    ],
    look: { skin: '#9aa58e', hair: '#3a3a3a', height: 23, width: 9, feature: 'bones' },
    mods: { regenPct: 0.25 },
    active: 'cannibalize',
  },
  {
    id: 'tauren', name: 'Tauren', plural: 'Tauren', faction: 'horde',
    classes: ['warrior', 'hunter', 'shaman', 'druid'],
    start: { zone: 'camp_narache', area: 'Red Cloud Mesa', settlement: 'Camp Narache', capital: 'Thunder Bluff' },
    base: { str: 25, agi: 15, sta: 22, int: 15, spi: 22 },
    blurb: 'Spokojni olbrzymi z równin Mulgore, czciciele Matki Ziemi.',
    racials: [
      { name: 'War Stomp', desc: 'Aktywna: ogłusza do 5 wrogów na 2 s.', inGame: 'Przerywa ataki wroga' },
      { name: 'Endurance', desc: 'Bazowe HP zwiększone o 5%.', inGame: '+5% HP' },
      { name: 'Cultivation', desc: '+15 do Herbalism.' },
      { name: 'Nature Resistance', desc: '+10 odporności na naturę.' },
    ],
    look: { skin: '#7a5236', hair: '#2e1d12', height: 30, width: 16, feature: 'horns' },
    mods: { hpPct: 0.05 },
    active: 'warstomp',
  },
  {
    id: 'troll', name: 'Troll', plural: 'Trolls', faction: 'horde',
    classes: ['warrior', 'hunter', 'rogue', 'priest', 'shaman', 'mage'],
    start: { zone: 'valley_of_trials', area: 'Valley of Trials', settlement: 'The Den', capital: 'Orgrimmar' },
    base: { str: 21, agi: 22, sta: 21, int: 16, spi: 21 },
    blurb: 'Plemię Darkspear, uratowane przez Thralla i osiedlone na wybrzeżu Durotaru.',
    racials: [
      { name: 'Berserking', desc: 'Aktywna: przyspiesza ataki i rzucanie czarów o 10-30% na 10 s.', inGame: 'Używana automatycznie w walce' },
      { name: 'Regeneration', desc: 'Regeneracja zdrowia zwiększona o 10%; 10% regeneracji działa w walce.', inGame: '+10% regeneracji HP' },
      { name: 'Beast Slaying', desc: '+5% obrażeń zadawanych bestiom.', inGame: '+5% obrażeń vs bestie' },
      { name: 'Throwing / Bow Specialization', desc: '+5 do umiejętności broni miotanych i łuków.' },
    ],
    look: { skin: '#4f8fa8', hair: '#d24a2a', height: 27, width: 10, feature: 'tusks' },
    mods: { regenPct: 0.1, beastDmg: 0.05 },
    active: 'berserking',
  },
]

export const raceById = (id: RaceId) => RACES.find((r) => r.id === id)!
