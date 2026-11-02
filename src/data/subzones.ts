// Podstrefy każdej mapy (5-6), każda kończy się minibossem; ostatnia ma bossa blokującego przejście
// do następnej mapy. Nazwy podstref pochodzą z Classica; minibossy i bossowie to w większości
// nazwani NPC/rare/bossowie lochów z danej strefy (część uzupełniona, gdzie oryginał nie miał bossa).
// Format wpisu: "Podstrefa; Boss; typ"
import type { MobType } from './zones'

const RAW: Record<string, string[]> = {
  // ---------- obszary startowe
  northshire: ['Northshire Abbey; Ragged Alpha Wolf; beast', 'Northshire River; Kobold Taskmaster; small', 'Northshire Vineyards; Garrick Padfoot; humanoid', 'Echo Ridge Mine; Kobold Foreman; small', 'Northshire Valley Road; Defias Ringleader; humanoid'],
  coldridge: ['Anvilmar; Frostmane Scout; humanoid', 'Coldridge Pass; Old Snowpelt; beast', 'Frozen Lake; Crag Boar Matriarch; boar', 'Rockjaw Caves; Rockjaw Skullthumper; humanoid', "Grik'nir's Cave; Grik'nir the Cold; humanoid"],
  deathknell: ['Deathknell Crypts; Rattlecage Champion; undead', 'Night Web\'s Hollow; Night Web Matriarch; spider', 'Deathknell Church; Mindless Abomination; undead', 'Scarlet Outpost; Scarlet Initiate Leader; humanoid', 'Deathknell Gate; Captain Perrine; humanoid'],
  shadowglen: ['Aldrassil; Mangy Alpha Nightsaber; cat', 'Shadowthread Cave; Webwood Broodmother; spider', 'Shadowglen Springs; Grell Overseer; small', 'Fel Rock; Fel Rock Ravager; small', 'Fel Rock Depths; Lord Melenas; humanoid'],
  valley_of_trials: ['The Den; Mottled Razormane; boar', 'Scorpid Fields; Sarkoth; insect', 'Burning Blade Coven; Vile Imp Overseer; small', 'Valley Ridge; Felstalker; beast', 'Burning Blade Coven Depths; Yarrog Baneshadow; humanoid'],
  camp_narache: ['Camp Narache; Plainstrider Alpha; flyer', 'Red Cloud Mesa; Battleboar Bull; boar', 'Brambleblade Ravine; Bristleback Battleboar; boar', 'Bristleback Camp; Bristleback Thornweaver; humanoid', 'Brambleblade Hollow; Chief Sharptusk Thornmantle; humanoid'],

  // ---------- Eastern Kingdoms
  elwynn: ['Goldshire; Gruff Swiftbite; beast', 'Fargodeep Mine; Goldtooth; small', 'Jasperlode Mine; Mother Fang; spider', 'Eastvale Logging Camp; Morgan the Collector; humanoid', 'Brackwell Pumpkin Patch; Princess; boar', "Forest's Edge; Hogger; humanoid"],
  dun_morogh: ['Kharanos; Timber; beast', "Shimmer Ridge; Old Icebeard; beast", 'Brewnall Village; Bjarn; cat', 'Gnomeregan Outskirts; Gibblewilt; small', "Gol'Bolar Quarry; Edan the Howler; humanoid", 'Frostmane Hold; Great Father Arctikus; humanoid'],
  tirisfal: ['Brill; Bayne; beast', 'Agamand Mills; Devlin Agamand; undead', "Garren's Haunt; Maggot Eye; humanoid", 'Solliden Farmstead; Samuel Fipps; humanoid', 'Nightmare Vale; Gillgar; murloc', 'Scarlet Watch Post; Captain Melrache; humanoid'],
  westfall: ['Sentinel Hill; Vultros; flyer', "Saldean's Farm; Harvest Reaper; giant", 'Jangolode Mine; Foreman Thistlenettle; humanoid', 'Alexston Farmstead; Sergeant Brashclaw; humanoid', 'Gold Coast Quarry; Old Murk-Eye; murloc', 'Moonbrook (The Deadmines); Edwin VanCleef; humanoid'],
  loch_modan: ['Thelsamar; Lord Condar; beast', 'Silver Stream Mine; Shanda the Spinner; spider', "Ironband's Excavation; Grizlak; humanoid", 'Stonewrought Dam; Large Loch Crocolisk; beast', 'Stonesplinter Valley; Stonesplinter Shaman Chief; humanoid', "Mo'grosh Stronghold; Chok'sul; giant"],
  silverpine: ['The Sepulcher; Snarlmane; beast', 'Ambermill; Archmage Ataeric; humanoid', 'Fenris Isle; Thule Ravenclaw; beast', 'Pyrewood Village; Gorefang; beast', 'Shadowfang Keep; Archmage Arugal; humanoid'],
  redridge: ['Lakeshire; Bellygrub; boar', 'Lakeridge Highway; Ribchaser; humanoid', 'Three Corners; Kazon; humanoid', 'Redridge Canyons; Rohh the Silent; humanoid', "Alther's Mill; Tarantula Matriarch; spider", 'Stonewatch Keep; Gath\'Ilzogg; humanoid'],
  duskwood: ['Darkshire; Naraxis; spider', 'Brightwood Grove; Fenros; beast', 'Raven Hill Cemetery; Mor\'Ladim; undead', 'The Hushed Bank; Nefaru; beast', 'Vul\'Gol Ogre Mound; Stitches; giant', 'Manor Mistmantle; Stalvan Mistmantle; undead'],
  wetlands: ['Menethil Harbor; Leech Widow; spider', 'Bluegill Marsh; Gobbler; murloc', 'Sundown Marsh; Mottled Screecher; raptor', "Whelgar's Excavation; Ironbeak Raptor Alpha; raptor", 'Thelgen Rock; Ma\'ruk Wyrmscale; humanoid', 'Grim Batol Gates; Nek\'rosh; humanoid'],
  hillsbrad: ['Southshore / Tarren Mill; Big Samras; beast', 'Hillsbrad Fields; Farmer Getz; humanoid', 'Azurelode Mine; Foreman Bonds; humanoid', 'Darrow Hill; Elder Moss Creeper Queen; spider', 'Durnholde Keep; Syndicate Overseer; humanoid', 'Dun Garok; Lieutenant Haggerdin; humanoid'],
  alterac: ['Misty Shore; Cranky Benj; beast', 'Strahnbrad; Jimmy the Bleeder; humanoid', 'Growless Cave; Skhowl; beast', "Crushridge Hold; Lo'Grosh; giant", "Gallows' Corner; Grel'borg the Miser; giant", 'Ruins of Alterac; Lord Aliden Perenolde; humanoid'],
  arathi: ['Refuge Pointe / Hammerfall; Ruul Onestone; giant', 'Circle of West Binding; Kovork; giant', "Faldir's Cove; Prince Nazjak; murloc", 'Witherbark Village; Nimar the Slayer; humanoid', "Boulder'gor; Foulbelly; giant", 'Stromgarde Keep; Molok the Crusher; giant'],
  stranglethorn: ["Nesingwary's Expedition; King Bangalash; cat", "Kurzen's Compound; Colonel Kurzen; humanoid", "Ruins of Zul'Kunda; Gan'zulah; humanoid", 'Mizjah Ruins; Sin\'Dall; cat', 'Venture Co. Base Camp; Foreman Cozzle; small', 'Jaguero Isle; Fleet Master Firallon; humanoid'],
  badlands: ['Kargath; Broken Tooth; cat', 'Angor Fortress; Siege Golem; giant', 'Lethlor Ravine; Zaricotl; flyer', 'Camp Kosh; Rumbler; elemental', "Hammertoe's Digsite; Barnabus; humanoid", 'Uldaman; Ironaya; giant'],
  swamp_sorrows: ['Stonard; Gilmorian; murloc', 'Misty Valley; Molt Thorn; beast', 'Splinterspear Junction; Lost One Chieftain; humanoid', 'Fallow Sanctuary; Lost One Cook; humanoid', 'Pool of Tears; Sawtooth Snapper Alpha; beast', 'Temple of Atal\'Hakkar; Jammal\'an the Prophet; humanoid'],
  hinterlands: ['Aerie Peak / Revantusk; Old Cliff Jumper; beast', 'Quel\'Danil Lodge; Grimungous; beast', 'Shaol\'watha; Retherokk the Berserker; humanoid', 'Seradane; Jalinde Summerdrake; dragon', 'Skulk Rock; Mith\'rethis the Enchanter; humanoid', "Jintha'Alor; Vile Priestess Hexx; humanoid"],
  searing_gorge: ['Thorium Point; Faulty War Golem; giant', 'Firewatch Ridge; Slave Master Blackheart; humanoid', 'Grimesilt Dig Site; Shleipnarr; beast', 'Dustfire Valley; Obsidion; giant', 'The Slag Pit; Scald; elemental', 'The Cauldron; Overseer Maltorius; humanoid'],
  blasted_lands: ['Nethergarde Keep; Deatheye; beast', 'Dreadmaul Hold; Grunter; giant', "Serpent's Coil; Clack the Reaver; insect", 'Garrison Armory; Akubar the Seer; humanoid', 'Rise of the Defiler; Felhound Packleader; beast', 'The Dark Portal; Lord Kazzak; giant'],
  burning_steppes: ["Flame Crest / Morgan's Vigil; Volchan; elemental", 'Dreadmaul Rock; Gorgon\'och; giant', 'Altar of Storms; Hematos; dragon', 'Ruins of Thaurissan; Terrorspark; elemental', 'Pillar of Ash; Deathmaw; beast', 'Blackrock Spire; Rend Blackhand; humanoid'],
  wpl: ['Chillwind Camp / The Bulwark; Lord Maldazzar; undead', 'Felstone Field; Cauldron Lord Bilemaw; undead', "Dalson's Tears; The Husk; giant", 'Andorhal; Araj the Summoner; undead', 'Hearthglen; Scarlet High Clerist; humanoid', 'Scholomance; Darkmaster Gandling; undead'],
  epl: ["Light's Hope Chapel; Duggan Wildhammer; humanoid", "Corin's Crossing; Gish the Unmoving; undead", 'Plaguewood; Nerubian Overseer; spider', 'Darrowshire; Lord Darkscythe; undead', "Tyr's Hand; Hed'mush the Rotting; giant", 'Stratholme; Baron Rivendare; undead'],

  // ---------- Kalimdor
  teldrassil: ['Dolanaar; Lady Sathrah; spider', 'Starbreeze Village; Gnarlpine Ambusher; humanoid', 'Wellspring Lake; Timberling Elder; elemental', 'Oracle Glade; Ursal the Mauler; beast', "Ban'ethil Hollow; Ilkrud Magthrull; humanoid"],
  durotar: ['Razor Hill; Kul Tiras Marine Captain; humanoid', 'Thunder Ridge; Fizzle Darkstorm; humanoid', 'Drygulch Ravine; Dustwind Matriarch; flyer', 'Tiragarde Keep; Lieutenant Benedict; humanoid', 'Echo Isles; Zalazane; humanoid', 'Skull Rock; Gazz\'uz; humanoid'],
  mulgore: ['Bloodhoof Village; Snagglespear; boar', 'Palemane Rock; Ghost Howl; beast', 'Red Rocks; Mazzranache; cat', 'Winterhoof Water Well; Arra\'chea; beast', "Bael'dun Digsite; Bael'dun Foreman; small", 'The Venture Co. Mine; Supervisor Fizsprocket; small'],
  darkshore: ['Auberdine; Grimclaw; beast', "Bashal'Aran; Licillin; humanoid", 'Tower of Althalaxx; Lord Sinslayer; humanoid', 'Ruins of Mathystra; Greymist Coastrunner Chief; murloc', 'Cliffspring Falls; Lady Moongazer; humanoid', 'Grove of the Ancients; Lady Vespia; murloc'],
  barrens: ['The Crossroads; Humar the Pridelord; cat', 'Far Watch Post; Kreenig Snarlsnout; humanoid', 'The Stagnant Oasis; Owatanka; insect', 'Lushwater Oasis; Rocklance; humanoid', 'Bael Modan; Baron Longshore; humanoid', 'Wailing Caverns; Mutanus the Devourer; murloc'],
  stonetalon: ['Sun Rock Retreat; Taskmaster Whipfang; humanoid', 'Windshear Crag; Foreman Rigger; small', 'The Charred Vale; Bloodfury Ripper; flyer', 'Grimtotem Post; Grimtotem Shaman Chief; giant', 'Stonetalon Peak; Sister Riven; flyer'],
  ashenvale: ['Astranaar / Splintertree; Ursangous; beast', 'The Zoram Strand; Lady Vespira; murloc', 'Mystral Lake; Shadumbra; cat', 'Raynewood Retreat; Akkrilus; humanoid', 'Satyrnaar; Felslayer Prime; beast', 'Blackfathom Deeps; Aku\'mai; beast'],
  thousand_needles: ['Freewind Post; Steelsnap; beast', 'Camp E\'thok; Galak Messenger; humanoid', 'Darkcloud Pinnacle; Arnak Grimtotem; giant', 'Highperch; Achellios the Banished; flyer', 'Whitereach Post; Scorpid Terror; insect', 'The Shimmering Flats; Kravel Koalbeard; small'],
  desolace: ["Nijel's Point / Shadowprey; Hissperak; insect", 'Kolkar Village; Prince Kellen; humanoid', 'Thunder Axe Fortress; Lord Azrethoc; humanoid', 'Valley of Spears; Magram Warchief; humanoid', 'Kodo Graveyard; Ancient Kodo; beast', 'Maraudon; Princess Theradras; elemental'],
  dustwallow: ['Theramore / Brackenwall; Razorspine; beast', 'Witch Hill; Hammerspine; beast', 'Swamplight Manor; Lord Angler; murloc', 'Den of Flame; Firemane Flamecaller; dragon', 'Bluefen; Darkmist Widow; spider', 'Theramore Bay; Tethyr; beast'],
  feralas: ['Feathermoon / Camp Mojache; Old Grizzlegut; beast', 'Woodpaw Hills; Snarler; beast', 'Ruins of Isildien; Lord Shalzaru; murloc', 'Frayfeather Highlands; Frayfeather Patriarch; flyer', 'Grimtotem Compound; Grimtotem Warlord; giant', 'Dire Maul; King Gordok; giant'],
  tanaris: ['Gadgetzan; Cyclok the Mad; humanoid', 'Steamwheedle Port; Kregg Keelhaul; humanoid', 'Lost Rigger Cove; Captain Ironhill; humanoid', 'Noonshade Ruins; Antilos; flyer', 'Sandsorrow Watch; Sandfury Witch Doctor; humanoid', "Zul'Farrak; Chief Ukorz Sandscalp; humanoid"],
  azshara: ['Valormok / Talrendis; Lady Sesspira; murloc', 'Haldarr Encampment; Haldarr Satyr Lord; humanoid', 'Legash Encampment; Legashi Hellcaller; humanoid', 'Ruins of Eldarath; Varo\'then\'s Ghost; undead', 'Bay of Storms; Spitelash Myrmidon Lord; murloc', 'Forlorn Ridge; Azuregos; dragon'],
  ungoro: ["Marshal's Refuge; Gorilla U'cha; beast", 'Golakka Hot Springs; King Mosh; beast', 'Terror Run; Ravasaur Matriarch; raptor', 'Lakkari Tar Pits; Tar Lord; elemental', 'Fire Plume Ridge; Blazerunner; elemental', 'The Slithering Scar; Gorishi Hive Queen; insect'],
  felwood: ['Talonbranch Glade / Bloodvenom Post; Ragepaw; beast', 'Deadwood Village; Chieftain Bloodmaw; beast', 'Irontree Woods; Olm the Wise; elemental', 'Ruins of Constellas; Prince Xavalis; humanoid', 'Shatter Scar Vale; Overlord Ror; humanoid', 'Jaedenar; Shadow Lord Fel\'dan; humanoid'],
  winterspring: ['Everlook; Grizzle Snowpaw; beast', 'Frostsaber Rock; Rak\'shiri; cat', 'Winterfall Village; Winterfall Ursa Chief; beast', 'Ice Thistle Hills; Ice Thistle Patriarch; beast', 'Mazthoril; Kashoch the Reaver; humanoid', 'Darkwhisper Gorge; Lady Hederine; humanoid'],
  silithus: ['Cenarion Hold; Twilight Lord Everun; humanoid', "Hive'Ashi; Hive'Ashi Ambusher Queen; insect", 'Southwind Village; Baron Kazum; elemental', 'Twilight Base Camp; Lord Skwol; elemental', "Hive'Regal; High Marshal Whirlaxis; elemental", "Gates of Ahn'Qiraj; Ossirian the Unscarred; giant"],
}

export type SubZone = { name: string; boss: { name: string; type: MobType }; zoneBoss: boolean }

export const SUBZONES: Record<string, SubZone[]> = Object.fromEntries(
  Object.entries(RAW).map(([zone, list]) => [
    zone,
    list.map((l, i) => {
      const [name, boss, type] = l.split(';').map((x) => x.trim())
      return { name, boss: { name: boss, type: type as MobType }, zoneBoss: i === list.length - 1 }
    }),
  ]),
)

export const subzonesOf = (zone: string) => SUBZONES[zone] ?? []

// Przedział poziomów podstrefy (dzieli zakres mapy po równo)
export function subRange(min: number, max: number, i: number, n: number) {
  const span = max - min
  const lo = Math.floor(min + (span * i) / n)
  const hi = Math.max(lo, Math.round(min + (span * (i + 1)) / n))
  return { lo, hi }
}
