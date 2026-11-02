import type { ClassId, ArmorType, School, Form } from '../data/classes'
import type { RaceId, Faction, Stats } from '../data/races'
import type { MobType } from '../data/zones'

export type Rarity = 0 | 1 | 2 | 3 | 4 // poor, common, uncommon, rare, epic
export const RARITY_COLOR = ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee']
export const RARITY_PL = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic']

// Sloty ekwipunku jak w oknie postaci Classica
export type EquipSlot =
  | 'head' | 'neck' | 'shoulder' | 'back' | 'chest' | 'shirt' | 'tabard' | 'wrist'
  | 'hands' | 'waist' | 'legs' | 'feet' | 'finger1' | 'finger2' | 'trinket1' | 'trinket2'
  | 'mainhand' | 'offhand' | 'ranged'
export const LEFT_SLOTS: EquipSlot[] = ['head', 'neck', 'shoulder', 'back', 'chest', 'shirt', 'tabard', 'wrist']
export const RIGHT_SLOTS: EquipSlot[] = ['hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2']
export const WEAPON_SLOTS: EquipSlot[] = ['mainhand', 'offhand', 'ranged']
export const ALL_SLOTS: EquipSlot[] = [...LEFT_SLOTS, ...RIGHT_SLOTS, ...WEAPON_SLOTS]

// Rodzaj przedmiotu (gdzie da się go założyć)
export type ItemSlot =
  | 'head' | 'neck' | 'shoulder' | 'back' | 'chest' | 'shirt' | 'tabard' | 'wrist' | 'hands' | 'waist' | 'legs' | 'feet'
  | 'finger' | 'trinket' | 'mainhand' | 'twohand' | 'offhand' | 'ranged'

export const SLOT_PL: Record<EquipSlot | ItemSlot, string> = {
  head: 'Head', neck: 'Neck', shoulder: 'Shoulder', back: 'Back', chest: 'Chest', shirt: 'Shirt', tabard: 'Tabard', wrist: 'Wrist',
  hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', finger: 'Finger', finger1: 'Finger', finger2: 'Finger', trinket: 'Trinket',
  trinket1: 'Trinket', trinket2: 'Trinket', mainhand: 'Main Hand', twohand: 'Two-Hand', offhand: 'Off Hand', ranged: 'Ranged',
}

export type Item = {
  id: number
  name: string
  rarity: Rarity
  ilvl: number
  value: number // miedziaki
  slot?: ItemSlot // brak = śmieć / torba / przedmiot zadania
  armorType?: ArmorType
  weaponType?: string
  armor?: number
  dps?: number
  speed?: number
  stats?: Partial<Stats>
  sp?: number // "Equip: +X do obrażeń i leczenia czarami" (moc czarów)
  dur?: number // aktualna wytrzymałość (brak = pełna); 0 = zepsuty, nie daje bonusów
  bagSize?: number // torba
  count?: number // stos (śmieci, jedzenie, przedmioty zadań)
  food?: Food // jedzenie / picie / jedzenie z buffem
  kit?: number // zestaw naprawczy: naprawia zepsute przedmioty do tego poziomu przedmiotu
  quest?: string // id zadania, do którego należy przedmiot
}

// Jedzenie i picie (kupowane u kupca). Zwykłe odnawia HP/manę przy odpoczynku, z buffem daje Well Fed.
export type Food = { kind: 'food' | 'drink' | 'buff'; lvl: number; amt: number; buff?: { name: string; fx: Record<string, number>; text: string } }

export type Dot = { id: string; name: string; school: School; perTick: number; left: number; tickIn: number }

export type MobState = {
  name: string
  type: MobType
  color: string
  lvl: number
  hp: number
  maxHp: number
  dmg: number
  speed: number
  swing: number
  dots: Dot[]
  stun: number
  dodged: boolean
  count: number // ile mobów w grupie (1-3)
  per: number // HP jednego moba w grupie
  boss?: 'mini' | 'zone'
  dist: number // ile sekund wróg jeszcze podchodzi (zwarcie dopiero przy 0)
  dist0: number
  cc: number // jeden z grupy obezwładniony (Polymorph, Freezing Trap)
  slow: number // spowolnienie (Frost Shock): wolniej podchodzi
}

export type TotemState = { id: string; el: string; left: number; tickIn: number }

export type Phase = 'walk' | 'fight' | 'rest' | 'dead' | 'travel' | 'town' | 'heal'
export type Where = 'field' | 'town' | 'capital'

export type Hero = {
  name: string
  race: RaceId
  cls: ClassId
  faction: Faction
  level: number
  xp: number
  rested: number
  hp: number
  res: number
  cp: number
  copper: number
  equip: Partial<Record<EquipSlot, Item>>
  bags: (Item | null)[] // 4 sloty na torby
  inv: (Item | null)[] // plecak (16) + zawartość toreb
  trained: Record<string, number> // id umiejętności -> wytrenowany poziom rangi
  talents: Record<string, number> // id talentu -> ranga
  disabled: Record<string, boolean> // umiejętności wyłączone przez gracza
  form: Form // druid
  pet: string // wybrany demon (warlock)
  temp: Record<string, number> // aktywne cooldowny-buffy (s)
  choice: Record<string, string> // wybór w grupach (nasycenie broni, pieczęć, aura, totem żywiołu)
  totems: TotemState[] // postawione totemy (znikają, gdy postać odchodzi)
  weaponSkills: string[] // wyuczone typy broni
  wskill: Record<string, number> // poziom umiejętności broni (bez bonusu rasowego), limit = poziom × 5
  eating: { hp: number; mana: number; left: number } | null // jedzenie/picie w trakcie odpoczynku (na sekundę)
  wellFed: { name: string; fx: Record<string, number>; left: number } | null // buff z jedzenia
  stacks: Record<string, number> // ładunki: Maelstrom, Arcane Blast
  heroDodged: boolean
  mode?: 'mixed' | 'melee' | 'caster' // styl walki hybryd: czary z dystansu i wręcz / tylko wręcz / czary także w zwarciu
  cds: Record<string, number>
  buffs: Record<string, number>
  casting: { id: string; left: number; total: number; mult?: number; pb?: number } | null
  hot: { id?: string; name?: string; perTick: number; left: number; tickIn: number } | null
  shield: number
  gcd: number
  swing: number
  sinceCast: number
  petSwing: number
}

export type QuestKind = 'kill' | 'collect' | 'boss'
export type Quest = {
  id: string
  zone: string
  sub: number
  kind: QuestKind
  title: string
  text: string
  target: string // nazwa moba / bossa
  item?: string // dla 'collect'
  need: number
  have: number
  level: number
  xp: number
  copper: number
  reward?: Item
}

export type ZoneProgress = { cleared: number; kills: number; bossAt?: number; bossFails?: number }

export type GameEvent =
  | { t: 'dmg'; src: 'hero' | 'mob' | 'pet'; amt: number; crit?: boolean; school?: School; ability?: string; miss?: 'miss' | 'dodge' | 'parry' | 'absorb'; glance?: boolean }
  | { t: 'heal'; amt: number; ability?: string }
  | { t: 'cast'; ability: string; school?: School; kind: string }
  | { t: 'xp'; amt: number; rested: number }
  | { t: 'kill'; mob: string; boss?: 'mini' | 'zone'; count: number }
  | { t: 'subkill'; mob: string }
  | { t: 'loot'; item: Item; equipped: boolean }
  | { t: 'bagsfull'; item: Item }
  | { t: 'gold'; amt: number }
  | { t: 'level'; level: number; learnable: number }
  | { t: 'death'; boss?: string; reset: boolean }
  | { t: 'revive' }
  | { t: 'zone'; zone: string }
  | { t: 'sub'; zone: string; sub: number }
  | { t: 'cleared'; zone: string; sub: number; boss: string; zoneBoss: boolean }
  | { t: 'questprog'; quest: Quest }
  | { t: 'questdone'; quest: Quest }
  | { t: 'spawn'; mob: string; lvl: number; boss?: 'mini' | 'zone' }
  | { t: 'racial'; name: string }
  | { t: 'skillup'; weapon: string; skill: number }
  | { t: 'totem'; name: string }
  | { t: 'interrupt'; ability: string }

export type LogLine = { time: number; text: string; color?: string }

export type Totals = { kills: number; deaths: number; copper: number; xp: number; items: number; quests: number; played: number; bosses: number }

export type Trip = { kind: 'walk' | 'ship' | 'zeppelin' | 'tram'; label: string; total: number; from?: string; to?: string; form?: string; dest?: { zone: string; sub: number }; path?: { zone: string; at: number }[] }

export type GameState = {
  v: 4
  seed: number
  itemSeq: number
  hero: Hero
  start: string // id obszaru startowego (klucz trasy)
  loc: { zone: string; sub: number }
  where: Where
  prog: Record<string, ZoneProgress>
  unlocked: string[] // odblokowane mapy (w kolejności trasy)
  autoAdvance: boolean
  autoEquip: boolean
  trip: Trip | null
  phase: Phase
  phaseT: number
  mob: MobState | null
  quests: Quest[]
  questsDone: string[]
  buyback: Item[] // ostatnie sprzedane (max 10)
  home?: string // stolica przypisana do Hearthstone
  inCap?: string // stolica, w której teraz jesteś
  v09?: boolean
  totals: Totals
  log: LogLine[]
  savedAt: number
  speed: number
}

export type OfflineSummary = {
  seconds: number
  simulated: number
  kills: number
  xp: number
  levels: number
  copper: number
  items: Item[]
  lost: number
  deaths: number
  bosses: string[]
  restedGained: number
  questsReady: number
}
