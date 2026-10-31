// Strefy z WoW Classic: przedziały poziomów, kontrola frakcji, kontynent i przybliżone położenie
// na schematycznej mapie (0-100 w obrębie kontynentu). Moby to nazwy z oryginalnych stref.
export type Continent = 'kalimdor' | 'ek'
export type Control = 'alliance' | 'horde' | 'contested'
export type Biome = 'forest' | 'snow' | 'nightforest' | 'desert' | 'undead' | 'plains' | 'swamp' | 'jungle' | 'volcanic' | 'plague' | 'coast' | 'mountain' | 'crater'
export type MobType = 'beast' | 'humanoid' | 'small' | 'murloc' | 'undead' | 'spider' | 'flyer' | 'elemental' | 'dragon' | 'giant' | 'insect' | 'boar' | 'cat' | 'raptor'
export type Mob = [name: string, type: MobType, color: string]

export type Zone = {
  id: string
  name: string
  continent: Continent
  min: number
  max: number
  control: Control
  x: number
  y: number
  biome: Biome
  mobs: Mob[]
  parent?: string // obszar startowy leży w strefie-rodzicu
  town?: string
  capital?: string
}

const Z = (id: string, name: string, continent: Continent, min: number, max: number, control: Control, x: number, y: number, biome: Biome, mobs: Mob[], extra: Partial<Zone> = {}): Zone =>
  ({ id, name, continent, min, max, control, x, y, biome, mobs, ...extra })

export const ZONES: Zone[] = [
  // ---- obszary startowe (1-5)
  Z('northshire', 'Northshire Valley', 'ek', 1, 5, 'alliance', 37, 75, 'forest', [['Young Wolf', 'beast', '#8a8a8a'], ['Kobold Vermin', 'small', '#a87b4f'], ['Kobold Worker', 'small', '#9c6e44'], ['Defias Thug', 'humanoid', '#b33a3a']], { parent: 'elwynn', town: 'Northshire Abbey' }),
  Z('coldridge', 'Coldridge Valley', 'ek', 1, 5, 'alliance', 21, 53, 'snow', [['Rockjaw Trogg', 'humanoid', '#8b8f7a'], ['Ragged Young Wolf', 'beast', '#9a9a9a'], ['Small Crag Boar', 'boar', '#7a5a3a'], ['Frostmane Troll Whelp', 'humanoid', '#6fa6b8']], { parent: 'dun_morogh', town: 'Anvilmar' }),
  Z('deathknell', 'Deathknell', 'ek', 1, 5, 'horde', 17, 4, 'undead', [['Mindless Zombie', 'undead', '#7d8a6a'], ['Rattlecage Skeleton', 'undead', '#d8d2be'], ['Duskbat', 'flyer', '#4a3a4a'], ['Scarlet Convert', 'humanoid', '#c0392b']], { parent: 'tirisfal', town: 'Deathknell' }),
  Z('shadowglen', 'Shadowglen', 'kalimdor', 1, 5, 'alliance', 22, 4, 'nightforest', [['Young Nightsaber', 'cat', '#5b4a7a'], ['Young Thistle Boar', 'boar', '#6a4a3a'], ['Grell', 'small', '#5a8a3a'], ['Webwood Spider', 'spider', '#3a3a3a']], { parent: 'teldrassil', town: 'Aldrassil' }),
  Z('valley_of_trials', 'Valley of Trials', 'kalimdor', 1, 5, 'horde', 85, 51, 'desert', [['Mottled Boar', 'boar', '#7a4a2a'], ['Scorpid Worker', 'insect', '#b8743a'], ['Vile Familiar', 'small', '#d0502a'], ['Sarkoth', 'insect', '#8a3a2a']], { parent: 'durotar', town: 'The Den' }),
  Z('camp_narache', 'Red Cloud Mesa', 'kalimdor', 1, 5, 'horde', 29, 70, 'plains', [['Plainstrider', 'flyer', '#c8a46a'], ['Battleboar', 'boar', '#6a4030'], ['Bristleback Quilboar', 'humanoid', '#8a5a3a'], ['Mountain Cougar', 'cat', '#b08a5a']], { parent: 'mulgore', town: 'Camp Narache' }),

  // ---- Eastern Kingdoms
  Z('elwynn', 'Elwynn Forest', 'ek', 5, 10, 'alliance', 29, 83, 'forest', [['Defias Bandit', 'humanoid', '#b33a3a'], ['Kobold Tunneler', 'small', '#a87b4f'], ['Murloc Forager', 'murloc', '#5a9a6a'], ['Prowler', 'beast', '#6a6a6a'], ['Riverpaw Runt', 'humanoid', '#a0784a']], { town: 'Goldshire', capital: 'Stormwind' }),
  Z('dun_morogh', 'Dun Morogh', 'ek', 5, 10, 'alliance', 33, 55, 'snow', [['Frostmane Seer', 'humanoid', '#6fa6b8'], ['Leper Gnome', 'small', '#8aa05a'], ['Ice Claw Bear', 'beast', '#e0e6ec'], ['Snow Leopard', 'cat', '#d8d8d8'], ['Winter Wolf', 'beast', '#c8ccd2']], { town: 'Kharanos', capital: 'Ironforge' }),
  Z('tirisfal', 'Tirisfal Glades', 'ek', 5, 10, 'horde', 26, 10, 'undead', [['Scarlet Warrior', 'humanoid', '#c0392b'], ['Rot Hide Gnoll', 'humanoid', '#6a7a4a'], ['Ravenous Darkhound', 'beast', '#3a3a4a'], ['Vile Fin Puddlejumper', 'murloc', '#4a7a6a']], { town: 'Brill', capital: 'Undercity' }),
  Z('westfall', 'Westfall', 'ek', 10, 20, 'alliance', 16, 91, 'plains', [['Harvest Watcher', 'giant', '#c8a24a'], ['Defias Trapper', 'humanoid', '#b33a3a'], ['Fleshripper', 'flyer', '#6a4a3a'], ['Murloc Coastrunner', 'murloc', '#4a8a7a'], ['Riverpaw Gnoll', 'humanoid', '#a0784a']], { town: 'Sentinel Hill' }),
  Z('loch_modan', 'Loch Modan', 'ek', 10, 20, 'alliance', 59, 54, 'mountain', [['Stonesplinter Trogg', 'humanoid', '#8b8f7a'], ['Mountain Boar', 'boar', '#6a4a3a'], ['Tunnel Rat Kobold', 'small', '#a87b4f'], ["Mo'grosh Ogre", 'giant', '#7a8a5a'], ['Elder Black Bear', 'beast', '#2a2a2a']], { town: 'Thelsamar' }),
  Z('silverpine', 'Silverpine Forest', 'ek', 10, 20, 'horde', 15, 22, 'nightforest', [['Moonrage Glutton', 'beast', '#5a5a6a'], ['Dalaran Apprentice', 'humanoid', '#7a5ab0'], ['Rot Hide Plague Weaver', 'humanoid', '#6a7a4a'], ['Giant Grizzled Bear', 'beast', '#5a4030']], { town: 'The Sepulcher' }),
  Z('redridge', 'Redridge Mountains', 'ek', 15, 25, 'alliance', 68, 79, 'mountain', [['Blackrock Grunt', 'humanoid', '#3a5a2a'], ['Redridge Mongrel', 'humanoid', '#a0784a'], ['Tarantula', 'spider', '#5a3a2a'], ['Murloc Flesheater', 'murloc', '#5a8a5a'], ['Black Dragon Whelp', 'dragon', '#2a2a2a']], { town: 'Lakeshire' }),
  Z('duskwood', 'Duskwood', 'ek', 18, 30, 'alliance', 43, 90, 'nightforest', [['Skeletal Fiend', 'undead', '#d8d2be'], ['Nightbane Shadow Weaver', 'beast', '#4a4a5a'], ['Pygmy Venom Web Spider', 'spider', '#3a3a3a'], ['Rotting Horror', 'undead', '#7d8a6a'], ['Defias Night Runner', 'humanoid', '#8a2a2a']], { town: 'Darkshire' }),
  Z('wetlands', 'Wetlands', 'ek', 20, 30, 'alliance', 46, 44, 'swamp', [['Mottled Raptor', 'raptor', '#6a8a3a'], ['Dragonmaw Grunt', 'humanoid', '#3a5a2a'], ['Bluegill Murloc', 'murloc', '#4a6aa0'], ['Mosshide Gnoll', 'humanoid', '#6a7a4a'], ['Young Wetlands Crocolisk', 'beast', '#4a6a3a']], { town: 'Menethil Harbor' }),
  Z('hillsbrad', 'Hillsbrad Foothills', 'ek', 20, 30, 'contested', 28, 32, 'forest', [['Syndicate Footpad', 'humanoid', '#4a4a6a'], ['Daggerspine Siren', 'murloc', '#3a8a8a'], ['Mountain Lion', 'cat', '#b08a5a'], ['Hillsbrad Farmhand', 'humanoid', '#8a6a4a'], ['Elder Moss Creeper', 'spider', '#4a6a3a']], { town: 'Southshore / Tarren Mill' }),
  Z('alterac', 'Alterac Mountains', 'ek', 30, 40, 'contested', 37, 20, 'snow', [['Crushridge Mauler', 'giant', '#7a8aa0'], ['Syndicate Shadow Mage', 'humanoid', '#4a4a6a'], ['Alterac Yeti', 'beast', '#e8e8f0'], ['Elder Gray Bear', 'beast', '#7a7a7a']]),
  Z('arathi', 'Arathi Highlands', 'ek', 30, 40, 'contested', 52, 33, 'plains', [['Witherbark Axe Thrower', 'humanoid', '#4f8fa8'], ['Boulderfist Ogre', 'giant', '#8a7a5a'], ['Syndicate Highwayman', 'humanoid', '#4a4a6a'], ['Highland Thrasher', 'raptor', '#8a6a3a'], ['Drywhisker Kobold', 'small', '#a87b4f']], { town: 'Refuge Pointe / Hammerfall' }),
  Z('stranglethorn', 'Stranglethorn Vale', 'ek', 30, 45, 'contested', 29, 98, 'jungle', [['Kurzen Jungle Fighter', 'humanoid', '#6a7a3a'], ['Bloodscalp Warrior', 'humanoid', '#4f8fa8'], ['Shadowmaw Panther', 'cat', '#1a1a1a'], ['Elder Stranglethorn Tiger', 'cat', '#d08a2a'], ['Jungle Stalker', 'raptor', '#4a7a3a'], ['Bloodsail Swashbuckler', 'humanoid', '#a02a2a']], { town: 'Booty Bay' }),
  Z('badlands', 'Badlands', 'ek', 35, 45, 'contested', 61, 65, 'desert', [['Dustbelcher Mauler', 'giant', '#8a7a5a'], ['Shadowforge Darkweaver', 'humanoid', '#5a4a6a'], ['Starving Buzzard', 'flyer', '#6a4a3a'], ['Ridge Stalker', 'cat', '#b07a4a'], ['Scalding Whelp', 'dragon', '#c04a2a'], ['Rock Elemental', 'elemental', '#8a7a6a']], { town: 'Kargath' }),
  Z('swamp_sorrows', 'Swamp of Sorrows', 'ek', 35, 45, 'contested', 66, 88, 'swamp', [['Lost One Hunter', 'humanoid', '#6a8aa0'], ['Sawtooth Crocolisk', 'beast', '#4a6a3a'], ['Marsh Flesheater', 'murloc', '#5a7a5a'], ['Swamp Jaguar', 'cat', '#3a3a2a']], { town: 'Stonard' }),
  Z('hinterlands', 'The Hinterlands', 'ek', 40, 50, 'contested', 64, 22, 'forest', [['Vilebranch Headhunter', 'humanoid', '#4f8fa8'], ['Silvermane Stalker', 'beast', '#c8ccd2'], ['Savage Owlbeast', 'beast', '#6a5a3a'], ['Green Sludge', 'elemental', '#5aa03a'], ['Witherbark Shadow Hunter', 'humanoid', '#4f8fa8']], { town: "Aerie Peak / Revantusk" }),
  Z('searing_gorge', 'Searing Gorge', 'ek', 43, 50, 'contested', 37, 65, 'volcanic', [['Dark Iron Geologist', 'humanoid', '#5a4a4a'], ['Glassweb Spider', 'spider', '#b8743a'], ['Heavy War Golem', 'giant', '#6a6a7a'], ['Magma Elemental', 'elemental', '#e05a1a'], ['Firegut Ogre', 'giant', '#8a6a4a']], { town: 'Thorium Point' }),
  Z('blasted_lands', 'Blasted Lands', 'ek', 45, 55, 'contested', 73, 97, 'volcanic', [['Felhound', 'beast', '#8a3a2a'], ['Snickerfang Hyena', 'beast', '#8a7a4a'], ['Redstone Basilisk', 'beast', '#a04a3a'], ['Shadowsworn Cultist', 'humanoid', '#4a2a5a'], ['Ashmane Boar', 'boar', '#4a3a3a']], { town: 'Nethergarde Keep' }),
  Z('burning_steppes', 'Burning Steppes', 'ek', 50, 58, 'contested', 52, 74, 'volcanic', [['Blackrock Soldier', 'humanoid', '#3a5a2a'], ['Firegut Brute', 'giant', '#8a6a4a'], ['Black Dragonspawn', 'dragon', '#2a2a3a'], ['Blazing Elemental', 'elemental', '#f07a1a']], { town: 'Morgan\'s Vigil / Flame Crest' }),
  Z('wpl', 'Western Plaguelands', 'ek', 51, 58, 'contested', 47, 9, 'plague', [['Diseased Wolf', 'beast', '#7a8a5a'], ['Scarlet Spellbinder', 'humanoid', '#c0392b'], ['Skeletal Flayer', 'undead', '#d8d2be'], ['Plague Monstrosity', 'giant', '#7a8a5a'], ['Putrid Gargoyle', 'flyer', '#6a6a6a']], { town: 'Chillwind Camp / The Bulwark' }),
  Z('epl', 'Eastern Plaguelands', 'ek', 53, 60, 'contested', 70, 9, 'plague', [['Plaguehound', 'beast', '#6a7a4a'], ['Cannibal Ghoul', 'undead', '#7d8a6a'], ['Stitched Horror', 'giant', '#8a9a7a'], ['Crypt Horror', 'spider', '#4a4a3a'], ['Scourge Warder', 'undead', '#5a6a7a']], { town: 'Light\'s Hope Chapel' }),

  // ---- Kalimdor
  Z('teldrassil', 'Teldrassil', 'kalimdor', 5, 10, 'alliance', 30, 10, 'nightforest', [['Gnarlpine Warrior', 'humanoid', '#6a5a3a'], ['Timberling', 'elemental', '#5a7a3a'], ['Strigid Owl', 'flyer', '#8a7a6a'], ['Webwood Venomfang', 'spider', '#3a3a3a'], ['Nightsaber', 'cat', '#4a3a6a']], { town: 'Dolanaar', capital: 'Darnassus' }),
  Z('durotar', 'Durotar', 'kalimdor', 5, 10, 'horde', 77, 43, 'desert', [['Dustwind Harpy', 'flyer', '#a07a5a'], ['Razormane Quilboar', 'humanoid', '#8a5a3a'], ['Kul Tiras Sailor', 'humanoid', '#3a5aa0'], ['Bloodtalon Scythemaw', 'raptor', '#a04a2a'], ['Burning Blade Cultist', 'humanoid', '#8a2a2a']], { town: 'Razor Hill', capital: 'Orgrimmar' }),
  Z('mulgore', 'Mulgore', 'kalimdor', 5, 10, 'horde', 42, 64, 'plains', [['Palemane Tanner', 'humanoid', '#b0a08a'], ['Bristleback Shaman', 'humanoid', '#8a5a3a'], ['Windfury Harpy', 'flyer', '#a07a5a'], ['Prairie Wolf', 'beast', '#9a8a6a'], ['Venture Co. Laborer', 'small', '#3a7a3a']], { town: 'Bloodhoof Village', capital: 'Thunder Bluff' }),
  Z('darkshore', 'Darkshore', 'kalimdor', 10, 20, 'alliance', 40, 20, 'coast', [['Moonstalker', 'cat', '#5a5a7a'], ['Blackwood Warrior', 'beast', '#4a3a2a'], ['Greymist Raider', 'murloc', '#5a7a8a'], ['Darkshore Thresher', 'beast', '#3a5a6a'], ['Rabid Thistle Bear', 'beast', '#6a4a3a']], { town: 'Auberdine' }),
  Z('barrens', 'The Barrens', 'kalimdor', 10, 25, 'horde', 58, 50, 'plains', [['Zhevra Runner', 'beast', '#e8e0d0'], ['Razormane Thornweaver', 'humanoid', '#8a5a3a'], ['Ornery Plainstrider', 'flyer', '#c8a46a'], ['Savannah Huntress', 'cat', '#c8a050'], ['Kolkar Bloodcharger', 'humanoid', '#8a6a4a'], ['Witchwing Harpy', 'flyer', '#7a5a5a']], { town: 'The Crossroads' }),
  Z('stonetalon', 'Stonetalon Mountains', 'kalimdor', 15, 27, 'contested', 26, 41, 'mountain', [['Venture Co. Logger', 'small', '#3a7a3a'], ['Bloodfury Harpy', 'flyer', '#8a3a3a'], ['Deepmoss Creeper', 'spider', '#4a6a3a'], ['Grimtotem Mercenary', 'giant', '#6a4a3a']], { town: "Stonetalon Peak / Sun Rock Retreat" }),
  Z('ashenvale', 'Ashenvale', 'kalimdor', 18, 30, 'contested', 44, 34, 'nightforest', [['Foulweald Ursa', 'beast', '#4a3a2a'], ['Dark Strand Fanatic', 'humanoid', '#5a3a6a'], ['Wildthorn Stalker', 'spider', '#3a4a3a'], ['Ashenvale Bear', 'beast', '#5a4030'], ['Felslayer', 'beast', '#6a3a6a']], { town: 'Astranaar / Splintertree Post' }),
  Z('thousand_needles', 'Thousand Needles', 'kalimdor', 25, 35, 'contested', 60, 75, 'desert', [['Galak Scout', 'humanoid', '#8a6a4a'], ['Grimtotem Brute', 'giant', '#6a4a3a'], ['Scorpid Reaver', 'insect', '#b8743a'], ['Salt Flats Vulture', 'flyer', '#6a4a3a'], ['Pesterhide Hyena', 'beast', '#8a7a4a']], { town: 'Freewind Post' }),
  Z('desolace', 'Desolace', 'kalimdor', 30, 40, 'contested', 23, 57, 'desert', [['Gelkis Earthcaller', 'humanoid', '#8a6a4a'], ['Magram Wrangler', 'humanoid', '#6a5a4a'], ['Thunderhead', 'beast', '#5a7a8a'], ['Burning Blade Adept', 'humanoid', '#8a2a2a'], ['Scorpashi Venomlash', 'insect', '#8a5a3a']], { town: 'Nijel\'s Point / Shadowprey' }),
  Z('dustwallow', 'Dustwallow Marsh', 'kalimdor', 35, 45, 'contested', 78, 64, 'swamp', [['Darkmist Lurker', 'spider', '#3a3a4a'], ['Mudrock Tortoise', 'beast', '#6a6a4a'], ['Firemane Scout', 'dragon', '#c04a2a'], ['Bloodfen Raptor', 'raptor', '#8a3a2a'], ['Drywallow Crocolisk', 'beast', '#5a6a3a']], { town: 'Theramore / Brackenwall' }),
  Z('feralas', 'Feralas', 'kalimdor', 40, 50, 'contested', 24, 77, 'jungle', [['Gordunni Ogre', 'giant', '#7a8a5a'], ['Woodpaw Mongrel', 'humanoid', '#a0784a'], ['Northspring Harpy', 'flyer', '#7a5a5a'], ['Frayfeather Stagwing', 'flyer', '#a0a07a'], ['Groddoc Ape', 'beast', '#5a4a3a']], { town: 'Feathermoon / Camp Mojache' }),
  Z('tanaris', 'Tanaris', 'kalimdor', 40, 50, 'contested', 70, 91, 'desert', [['Wastewander Bandit', 'humanoid', '#b09060'], ['Sandfury Hideskinner', 'humanoid', '#4f8fa8'], ['Southsea Pirate', 'humanoid', '#a02a2a'], ['Glasshide Basilisk', 'beast', '#a0b0b0'], ['Searing Roc', 'flyer', '#c06030']], { town: 'Gadgetzan' }),
  Z('azshara', 'Azshara', 'kalimdor', 45, 55, 'contested', 80, 30, 'coast', [['Spitelash Siren', 'murloc', '#3a8a8a'], ['Legashi Satyr', 'humanoid', '#6a3a6a'], ['Thunderhead Hippogryph', 'flyer', '#8a8aa0'], ['Blood Elf Surveyor', 'humanoid', '#c0a03a']], { town: 'Talrendis / Valormok' }),
  Z('ungoro', "Un'Goro Crater", 'kalimdor', 48, 55, 'contested', 50, 88, 'crater', [['Ravasaur Hunter', 'raptor', '#6a8a3a'], ['Frenzied Pterrordax', 'flyer', '#8a6a4a'], ["Un'Goro Gorilla", 'beast', '#3a3a3a'], ['Bloodpetal Lasher', 'elemental', '#c03a5a'], ['Tar Beast', 'elemental', '#2a2a2a'], ['Plated Stegodon', 'beast', '#7a7a5a']], { town: "Marshal's Refuge" }),
  Z('felwood', 'Felwood', 'kalimdor', 48, 55, 'contested', 53, 25, 'plague', [['Jadefire Felsworn', 'humanoid', '#3aa04a'], ['Deadwood Warrior', 'beast', '#4a3a2a'], ['Irontree Stomper', 'elemental', '#5a5a4a'], ['Toxic Horror', 'elemental', '#6aa03a'], ['Warpwood Moss Flayer', 'elemental', '#4a6a3a']], { town: 'Talonbranch Glade / Bloodvenom Post' }),
  Z('winterspring', 'Winterspring', 'kalimdor', 55, 60, 'contested', 70, 13, 'snow', [['Winterfall Den Watcher', 'beast', '#c8ccd2'], ['Frostsaber', 'cat', '#e0e8f0'], ['Ice Thistle Yeti', 'beast', '#e8e8f0'], ['Chillwind Chimaera', 'flyer', '#6a9ac0'], ['Shardtooth Bear', 'beast', '#c8c8d0']], { town: 'Everlook' }),
  Z('silithus', 'Silithus', 'kalimdor', 55, 60, 'contested', 31, 94, 'desert', [['Twilight Geolord', 'humanoid', '#5a3a6a'], ["Hive'Ashi Drone", 'insect', '#8a6a2a'], ['Dust Stormer', 'elemental', '#c0a070'], ['Stonelash Scorpid', 'insect', '#a07040'], ['Desert Rumbler', 'elemental', '#a08a5a']], { town: 'Cenarion Hold' }),
]

export const zoneById = (id: string) => ZONES.find((z) => z.id === id)!

// Trasy levelowania: [strefa, poziom, na którym bohater rusza dalej].
// Obszar startowy -> strefa startowa rasy -> typowa trasa frakcji z Classica.
export type RouteStep = [zone: string, leaveAt: number]
const ALLIANCE_TAIL: RouteStep[] = [
  ['redridge', 21], ['duskwood', 25], ['wetlands', 29], ['arathi', 33], ['stranglethorn', 38], ['dustwallow', 41], ['swamp_sorrows', 43],
  ['hinterlands', 46], ['feralas', 48], ['tanaris', 49], ['searing_gorge', 50], ['blasted_lands', 52], ['ungoro', 53], ['felwood', 54],
  ['burning_steppes', 55], ['wpl', 57], ['epl', 58], ['winterspring', 59], ['silithus', 999],
]
const HORDE_TAIL: RouteStep[] = [
  ['stonetalon', 22], ['ashenvale', 25], ['hillsbrad', 28], ['thousand_needles', 32], ['desolace', 36], ['arathi', 38], ['stranglethorn', 41],
  ['badlands', 43], ['swamp_sorrows', 45], ['tanaris', 47], ['feralas', 48], ['hinterlands', 49], ['searing_gorge', 50], ['ungoro', 52],
  ['felwood', 53], ['azshara', 54], ['burning_steppes', 55], ['wpl', 57], ['epl', 58], ['winterspring', 59], ['silithus', 999],
]

export const ROUTES: Record<string, RouteStep[]> = {
  northshire: [['northshire', 5], ['elwynn', 11], ['westfall', 17], ...ALLIANCE_TAIL],
  coldridge: [['coldridge', 5], ['dun_morogh', 11], ['loch_modan', 15], ['westfall', 18], ...ALLIANCE_TAIL],
  shadowglen: [['shadowglen', 5], ['teldrassil', 11], ['darkshore', 18], ['ashenvale', 25], ...ALLIANCE_TAIL.slice(2)],
  valley_of_trials: [['valley_of_trials', 5], ['durotar', 11], ['barrens', 19], ...HORDE_TAIL],
  deathknell: [['deathknell', 5], ['tirisfal', 11], ['silverpine', 17], ['barrens', 21], ...HORDE_TAIL],
  camp_narache: [['camp_narache', 5], ['mulgore', 11], ['barrens', 19], ...HORDE_TAIL],
}

// Sąsiedztwo stref (do rysowania połączeń na mapie).
export const LINKS: [string, string][] = [
  ['tirisfal', 'silverpine'], ['tirisfal', 'wpl'], ['silverpine', 'hillsbrad'], ['hillsbrad', 'alterac'], ['alterac', 'wpl'], ['wpl', 'epl'],
  ['hillsbrad', 'hinterlands'], ['hillsbrad', 'arathi'], ['arathi', 'wetlands'], ['wetlands', 'dun_morogh'], ['wetlands', 'loch_modan'],
  ['dun_morogh', 'loch_modan'], ['dun_morogh', 'searing_gorge'], ['loch_modan', 'badlands'], ['searing_gorge', 'burning_steppes'], ['badlands', 'searing_gorge'],
  ['burning_steppes', 'redridge'], ['burning_steppes', 'elwynn'], ['elwynn', 'redridge'], ['elwynn', 'westfall'], ['elwynn', 'duskwood'],
  ['westfall', 'duskwood'], ['redridge', 'duskwood'], ['duskwood', 'stranglethorn'], ['duskwood', 'swamp_sorrows'], ['swamp_sorrows', 'blasted_lands'], ['epl', 'hinterlands'],
  ['northshire', 'elwynn'], ['coldridge', 'dun_morogh'], ['deathknell', 'tirisfal'],
  ['teldrassil', 'darkshore'], ['darkshore', 'ashenvale'], ['darkshore', 'felwood'], ['felwood', 'winterspring'], ['felwood', 'ashenvale'], ['ashenvale', 'azshara'],
  ['ashenvale', 'stonetalon'], ['ashenvale', 'barrens'], ['stonetalon', 'barrens'], ['stonetalon', 'desolace'], ['barrens', 'durotar'], ['barrens', 'mulgore'],
  ['barrens', 'dustwallow'], ['barrens', 'thousand_needles'], ['desolace', 'feralas'], ['feralas', 'thousand_needles'], ['thousand_needles', 'tanaris'],
  ['tanaris', 'ungoro'], ['ungoro', 'silithus'], ['durotar', 'azshara'], ['shadowglen', 'teldrassil'], ['valley_of_trials', 'durotar'], ['camp_narache', 'mulgore'],
]
