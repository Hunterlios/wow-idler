// Nazwy ikon (pliki w assets/icons) dla umiejętności, rasówek, menu i przedmiotów. Pierwsza dostępna wygrywa:
// najpierw nazwa jak w grze, potem podobne zastępstwa. Gdy żadnej nie ma, gra rysuje własną ikonę.
import type { Item } from '../game/types'

export const ABILITY_ICONS: Record<string, string[]> = {
  // Warrior
  battle_shout: ['ability_warrior_battleshout', 'ability_warrior_rallyingcry'], heroic_strike: ['ability_rogue_ambush', 'ability_warrior_innerrage'],
  charge: ['ability_warrior_charge'], rend: ['ability_gouge'], thunder_clap: ['ability_thunderclap'], hamstring: ['ability_shockwave'],
  bloodrage: ['ability_racial_bloodrage'], sunder_armor: ['ability_warrior_sunder'], overpower: ['ability_meleedamage', 'ability_warrior_endlessrage'],
  demoralizing_shout: ['ability_warrior_warcry', 'ability_warrior_commandingshout'], revenge: ['ability_warrior_revenge'], shield_block: ['ability_defend'],
  cleave: ['ability_warrior_cleave'], retaliation: ['ability_warrior_challange'], intimidating_shout: ['ability_golemthunderclap'],
  execute: ['inv_sword_48', 'ability_warrior_bloodnova'], shield_wall: ['ability_warrior_shieldwall', 'ability_warrior_shieldreflection'],
  slam: ['ability_warrior_decisivestrike', 'ability_warrior_improveddisciplines'], berserker_rage: ['spell_nature_ancestralguardian', 'ability_warrior_innerrage'],
  whirlwind: ['ability_whirlwind'], recklessness: ['ability_criticalstrike', 'ability_warrior_endlessrage'], sweeping_strikes: ['ability_rogue_slicedice'],
  spearing_strike: ['inv_spear_06', 'ability_warrior_intervene'], mortal_strike: ['ability_warrior_savageblow', 'ability_warrior_bladestorm'],
  piercing_howl: ['spell_shadow_deathscream', 'spell_misc_emotionafraid'], death_wish: ['spell_shadow_deathpact', 'spell_shadow_unholystrength'],
  bloodthirst: ['spell_nature_bloodlust', 'ability_warrior_bloodfrenzy'], last_stand: ['spell_holy_ashestoashes'],
  concussion_blow: ['ability_thunderbolt', 'ability_warrior_disarm'], shield_slam: ['inv_shield_05', 'ability_warrior_shieldbash'],
  // Paladin
  devotion_aura: ['spell_holy_devotionaura', 'spell_holy_auraoflight'], seal_righteousness: ['ability_thunderbolt', 'spell_holy_sealofwrath'],
  holy_light: ['spell_holy_holybolt'], holy_strike: ['spell_holy_holysmite', 'ability_paladin_judgementblue'], blessing_might: ['spell_holy_fistofjustice', 'spell_holy_blessingofstrength'],
  judgement: ['spell_holy_righteousfury', 'ability_paladin_judgementblue'], divine_protection: ['spell_holy_restoration', 'spell_holy_holyprotection'],
  seal_crusader: ['spell_holy_holysmite', 'spell_holy_crusade'], hammer_justice: ['spell_holy_sealofmight'], lay_on_hands: ['spell_holy_layonhands', 'spell_holy_resurrection'],
  blessing_wisdom: ['spell_holy_sealofwisdom'], retribution_aura: ['spell_holy_auraoflight'], exorcism: ['spell_holy_excorcism_02', 'spell_holy_harmundeadaura'],
  flash_of_light: ['spell_holy_flashheal', 'spell_holy_greaterheal'], blessing_kings: ['spell_magic_magearmor'], seal_fury: ['spell_holy_sealoffury', 'spell_holy_sealofvalor'],
  seal_light: ['spell_holy_healingaura', 'spell_holy_aspiration'], divine_shield: ['spell_holy_divineintervention'], seal_wisdom: ['spell_holy_righteousnessaura', 'spell_holy_sealofwisdom'],
  hammer_wrath: ['ability_thunderclap', 'spell_holy_sealofwrath'], holy_wrath: ['spell_holy_excorcism', 'spell_holy_harmundeadaura'], consecration: ['spell_holy_innerfire', 'spell_holy_auramastery'],
  voice_of_truth: ['spell_holy_stoicism'], holy_shock: ['spell_holy_searinglight', 'spell_holy_holybolt'], blessing_sanctuary: ['spell_nature_lightningshield', 'spell_holy_prayerofspirit'],
  holy_shield: ['spell_holy_blessingofprotection', 'ability_paladin_shieldofvengeance'], seal_command: ['ability_warrior_innerrage'], sanctity_aura: ['spell_holy_mindvision', 'spell_holy_auramastery'],
  repentance: ['spell_holy_prayerofhealing', 'spell_holy_redemption'],
  // Hunter
  raptor_strike: ['ability_meleedamage', 'ability_warrior_riposte'], aspect_monkey: ['ability_hunter_aspectofthemonkey', 'ability_hunter_pet_gorilla'],
  serpent_sting: ['ability_hunter_quickshot'], arcane_shot: ['ability_impalingbolt', 'ability_hunter_snipershot'], concussive_shot: ['spell_frost_stun', 'ability_hunter_criticalshot'],
  aspect_hawk: ['spell_nature_ravenform'], wing_clip: ['ability_rogue_trip', 'ability_ensnare'], mongoose_bite: ['ability_hunter_swiftstrike', 'ability_hunter_harass'],
  immolation_trap: ['spell_fire_flameshock'], multi_shot: ['ability_upgrademoonglaive', 'ability_hunter_longshots'], summon_hawk: ['ability_hunter_pet_owl', 'ability_eyeoftheowl'],
  freezing_trap: ['spell_frost_chainsofice', 'spell_frost_frost'], rapid_fire: ['ability_hunter_runningshot', 'ability_hunter_focusedaim'], explosive_trap: ['spell_fire_selfdestruct', 'spell_fire_volcano'],
  volley: ['ability_marksmanship', 'ability_hunter_mastermarksman'], intimidation: ['ability_devour', 'ability_hunter_beastcall'], bestial_wrath: ['ability_druid_ferociousbite', 'ability_hunter_pet_bear'],
  aimed_shot: ['inv_spear_07', 'ability_hunter_snipershot'], scatter_shot: ['ability_golemstormbolt', 'ability_hunter_displacement'], trueshot_aura: ['ability_trueshot'],
  counterattack: ['ability_warrior_challange'], deterrence: ['ability_hunter_resourcefulness', 'ability_whirlwind'], wyvern_sting: ['inv_spear_02', 'ability_hunter_pet_windserpent'],
  hunters_mark: ['ability_hunter_snipershot', 'ability_tracking'],
  // Rogue
  sinister_strike: ['spell_shadow_ritualofsacrifice', 'ability_dualwield'], eviscerate: ['ability_rogue_eviscerate', 'ability_rogue_feint'], backstab: ['ability_backstab', 'ability_rogue_shadowstep'],
  gouge: ['ability_gouge'], evasion: ['spell_shadow_shadowward', 'ability_rogue_feint'], slice_dice: ['ability_rogue_slicedice'], garrote: ['ability_rogue_garrote'],
  expose_armor: ['ability_warrior_riposte'], ambush: ['ability_rogue_ambush', 'ability_ambush'], rupture: ['ability_rogue_rupture', 'ability_warrior_bloodnova'],
  instant_poison: ['ability_poisons'], cheap_shot: ['ability_cheapshot'], kidney_shot: ['ability_rogue_kidneyshot'], deadly_poison: ['ability_rogue_dualweild', 'ability_creature_poison_02'],
  wound_poison: ['inv_misc_herb_16', 'ability_poisonsting'], blind: ['spell_shadow_mindsteal', 'spell_shadow_charm'], cold_blood: ['spell_ice_lament', 'ability_rogue_masterofsubtlety'],
  mutilate: ['ability_rogue_shadowstrikes', 'ability_dualwield'], venom: ['ability_creature_poison_01'], riposte: ['ability_parry', 'ability_warrior_challange'],
  blade_flurry: ['ability_warrior_punishingblow', 'ability_warrior_bladestorm'], adrenaline_rush: ['spell_shadow_shadowworddominate', 'ability_rogue_sprint'],
  ghostly_strike: ['spell_shadow_curse'], preparation: ['spell_shadow_antishadow', 'ability_vanish'], hemorrhage: ['spell_shadow_lifedrain'],
  // Priest
  pw_fortitude: ['spell_holy_wordfortitude'], smite: ['spell_holy_holysmite', 'spell_holy_holybolt'], lesser_heal: ['spell_holy_lesserheal', 'spell_holy_greaterheal'],
  sw_pain: ['spell_shadow_shadowwordpain', 'spell_shadow_twistedfaith'], pw_shield: ['spell_holy_powerwordshield', 'spell_holy_holyprotection'], renew: ['spell_holy_renew', 'spell_holy_prayerofspirit'],
  desperate_prayer: ['spell_holy_restoration', 'spell_holy_resurrection'], mind_blast: ['spell_shadow_unholyfrenzy', 'spell_shadow_destructivesoul'], inner_fire: ['spell_holy_innerfire', 'spell_holy_aspiration'],
  psychic_scream: ['spell_shadow_psychicscream', 'spell_misc_emotionafraid'], heal: ['spell_holy_heal', 'spell_holy_greaterheal'], flash_heal: ['spell_holy_flashheal', 'spell_holy_borrowedtime'],
  holy_fire: ['spell_holy_searinglight', 'spell_holy_ashestoashes'], fear_ward: ['spell_holy_excorcism', 'spell_holy_stoicism'], devouring_plague: ['spell_shadow_blackplague', 'ability_creature_disease_01'],
  prayer_healing: ['spell_holy_prayerofhealing02'], shadow_protection: ['spell_shadow_antishadow', 'spell_shadow_grimward'], greater_heal: ['spell_holy_greaterheal'],
  inner_focus: ['spell_frost_windwalkon', 'spell_nature_focusedmind'], divine_spirit: ['spell_holy_divinespirit', 'spell_holy_prayerofspirit'], penance: ['spell_holy_penance', 'spell_holy_holybolt'],
  power_infusion: ['spell_holy_powerinfusion', 'spell_holy_auramastery'], holy_nova: ['spell_holy_holynova', 'spell_holy_auraoflight'], prayer_mending: ['spell_holy_prayerofmendingtga', 'spell_holy_redemption'],
  lightwell: ['spell_holy_summonlightwell', 'spell_holy_crusade'], mind_flay: ['spell_shadow_siphonmana', 'spell_shadow_haunting'], silence: ['spell_shadow_impphaseshift', 'spell_shadow_curseoftounges'],
  vampiric_embrace: ['spell_shadow_unsummonbuilding'], shadowform: ['spell_shadow_shadowform'],
  // Shaman
  rockbiter: ['spell_nature_rockbiter', 'spell_nature_strength'], lightning_bolt: ['spell_nature_lightning', 'spell_nature_chainlightning'], healing_wave: ['spell_nature_magicimmunity', 'classic_spell_nature_healingway'],
  earth_shock: ['spell_nature_earthshock', 'spell_nature_earthbind'], stoneskin_totem: ['spell_nature_stoneskintotem', 'spell_nature_skinofearth'], lightning_shield: ['spell_nature_lightningshield'],
  strength_earth: ['spell_nature_earthbindtotem', 'spell_nature_tremortotem'], flametongue: ['spell_fire_flametounge'], searing_totem: ['spell_fire_searingtotem'], flame_shock: ['spell_fire_flameshock'],
  fire_nova: ['spell_fire_sealoffire', 'spell_fire_blueimmolation'], frost_shock: ['spell_frost_frostshock', 'spell_frost_iceshock'], ghost_wolf: ['spell_nature_spiritwolf', 'ability_hunter_pet_wolf'],
  frostbrand: ['spell_frost_frostbrand', 'spell_frost_frostarmor02'], healing_stream: ['inv_spear_04', 'spell_frost_summonwaterelemental_2'], lesser_healing_wave: ['spell_nature_healingwavelesser', 'classic_spell_nature_healingway'],
  magma_totem: ['spell_fire_selfdestruct', 'spell_fire_volcano'], mana_spring: ['spell_nature_manaregentotem', 'spell_nature_guardianward'], windfury: ['spell_nature_cyclone'],
  call_elements: ['spell_shaman_totemrecall'], chain_lightning: ['spell_nature_chainlightning'], windfury_totem: ['spell_nature_windfury', 'spell_nature_groundingtotem'],
  totemic_projection: ['spell_shaman_totemrecall', 'spell_nature_groundingtotem'], chain_heal: ['spell_nature_healingwavegreater', 'spell_nature_rejuvenation'],
  grace_of_air: ['spell_nature_invisibilitytotem', 'spell_nature_groundingtotem'], lava_burst: ['spell_shaman_lavaburst'], stormstrike: ['ability_shaman_stormstrike', 'spell_nature_elementalprecision_1'],
  rage_farseer: ['spell_nature_bloodlust', 'spell_nature_strength'], water_shield: ['ability_shaman_watershield'], riptide: ['spell_nature_riptide', 'spell_frost_summonwaterelemental_2'],
  mana_tide: ['spell_frost_summonwaterelemental', 'spell_frost_summonwaterelemental_2'],
  // Mage
  frost_armor: ['spell_frost_frostarmor02'], arcane_intellect: ['spell_holy_magicalsentry', 'spell_nature_brilliance'], fireball: ['spell_fire_flamebolt'], frostbolt: ['spell_frost_frostbolt02', 'spell_frost_frostblast'],
  fire_blast: ['spell_fire_fireball'], arcane_missiles: ['spell_nature_starfall', 'spell_nature_wispsplode'], polymorph: ['spell_nature_polymorph'], frost_nova: ['spell_frost_frostnova', 'spell_frost_freezingbreath'],
  arcane_explosion: ['spell_nature_wispexplosion', 'spell_nature_wispsplodegreen'], flamestrike: ['spell_fire_selfdestruct', 'spell_fire_fireball02'], blizzard: ['spell_frost_icestorm', 'spell_frost_frost'],
  mana_shield: ['spell_shadow_detectlesserinvisibility', 'spell_shadow_detectinvisibility'], evocation: ['spell_nature_purge', 'spell_nature_focusedmind'], scorch: ['spell_fire_soulburn', 'spell_fire_burnout'],
  cone_of_cold: ['spell_frost_glacier', 'spell_frost_freezingbreath'], ice_armor: ['spell_frost_frostarmor02', 'spell_deathknight_frostpresence'], arcane_blast: ['spell_arcane_blast'], mage_armor: ['spell_magearmor'],
  presence_of_mind: ['spell_nature_enchantarmor'], arcane_power: ['spell_nature_lightning', 'ability_mage_invisibility'], pyroblast: ['spell_fire_fireball02'], blast_wave: ['spell_holy_excorcism_02', 'spell_fire_blueflamebreath'],
  combustion: ['spell_fire_sealoffire', 'spell_fire_blueimmolation'], cold_snap: ['spell_frost_wizardmark', 'spell_deathknight_icetouch'], ice_block: ['spell_frost_frost'], ice_barrier: ['spell_ice_lament', 'spell_deathknight_iceboundfortitude'],
  // Warlock
  demon_skin: ['spell_shadow_ragingscream', 'spell_shadow_metamorphosis'], shadow_bolt: ['spell_shadow_shadowbolt', 'spell_shadow_carrionswarm'], immolate: ['spell_fire_immolation', 'spell_fire_incinerate'],
  corruption: ['spell_shadow_abominationexplosion'], curse_weakness: ['spell_shadow_curseofmannoroth'], life_tap: ['spell_shadow_burningspirit', 'spell_shadow_bloodboil'], curse_agony: ['spell_shadow_curseofsargeras'],
  fear: ['spell_shadow_possession'], drain_soul: ['spell_shadow_haunting'], drain_life: ['spell_shadow_lifedrain02', 'spell_shadow_lifedrain'], searing_pain: ['spell_fire_soulburn', 'spell_fire_burnout'],
  rain_of_fire: ['spell_shadow_rainoffire', 'spell_fire_volcano'], demon_armor: ['spell_shadow_ragingscream', 'spell_shadow_sacrificialshield'], hellfire: ['spell_fire_incinerate'],
  shadow_ward: ['spell_shadow_antishadow', 'spell_shadow_grimward'], howl_terror: ['spell_shadow_deathscream', 'spell_shadow_curseoftounges'], drain_hope: ['spell_shadow_twistedfaith'],
  death_coil: ['spell_shadow_deathcoil', 'spell_shadow_skull'], soul_fire: ['spell_fire_fireball02', 'spell_fire_blueimmolation'], summon_imp: ['spell_shadow_summonimp', 'spell_fire_burnout'],
  summon_voidwalker: ['spell_shadow_summonvoidwalker', 'spell_shadow_enslavedemon'], summon_succubus: ['spell_shadow_summonsuccubus'], summon_felhunter: ['spell_shadow_summonfelhunter', 'spell_shadow_detectinvisibility'],
  amplify_curse: ['spell_shadow_contagion', 'spell_shadow_curse'], siphon_life: ['spell_shadow_requiem', 'spell_shadow_lifedrain'], dark_pact: ['spell_shadow_darkritual', 'spell_shadow_corpseexplode'],
  demonic_sacrifice: ['spell_shadow_psychicscream', 'spell_shadow_sacrificialshield'], soul_link: ['spell_shadow_gathershadows', 'spell_shadow_enslavedemon'], shadowburn: ['spell_shadow_scourgebuild', 'spell_shadow_destructivesoul'],
  conflagrate: ['spell_fire_fireball', 'spell_fire_volcano'],
  // Druid
  mark_wild: ['spell_nature_regeneration', 'spell_nature_natureguardian'], wrath: ['spell_nature_abolishmagic', 'spell_nature_wispsplodegreen'], healing_touch: ['spell_nature_healingtouch', 'ability_druid_giftoftheearthmother'],
  moonfire: ['spell_nature_starfall'], rejuvenation: ['spell_nature_rejuvenation'], thorns: ['spell_nature_thorns', 'spell_nature_spiritarmor'], entangling_roots: ['spell_nature_stranglevines', 'spell_nature_earthbind'],
  bear_form: ['ability_racial_bearform', 'ability_hunter_pet_bear'], maul: ['ability_druid_maul', 'ability_druid_bash'], demoralizing_roar: ['ability_druid_demoralizingroar', 'classic_ability_druid_demoralizingroar'],
  enrage: ['ability_druid_enrage', 'ability_druid_challangingroar'], regrowth: ['spell_nature_resistnature', 'ability_druid_naturalperfection'], bash: ['ability_druid_bash'], swipe: ['inv_misc_monsterclaw_03', 'ability_ghoulfrenzy'],
  faerie_fire: ['spell_nature_faeriefire', 'spell_nature_moonkey'], cat_form: ['ability_druid_catform'], claw: ['ability_druid_rake'], rip: ['ability_ghoulfrenzy'], starfire: ['spell_arcane_starfire', 'spell_nature_wispsplode'],
  shred: ['spell_shadow_vampiricaura', 'ability_druid_mangle-tga'], rake: ['ability_druid_disembowel', 'ability_druid_rake'], travel_form: ['ability_druid_travelform', 'ability_hunter_pet_cat'],
  tranquility: ['spell_nature_tranquility', 'spell_nature_forceofnature'], ravage: ['ability_druid_ravage', 'ability_hunter_pet_cat'], ferocious_bite: ['ability_druid_ferociousbite', 'ability_druid_mangle-tga'],
  pounce: ['ability_druid_supriseattack', 'ability_hunter_pet_cat'], frenzied_regen: ['ability_bullrush', 'ability_druid_giftoftheearthmother'], innervate: ['spell_nature_lightning', 'spell_nature_focusedmind'],
  hurricane: ['spell_nature_cyclone'], barkskin: ['spell_nature_stoneclawtotem', 'spell_nature_spiritarmor'], moonkin_form: ['spell_nature_forceofnature'], feral_charge: ['ability_hunter_pet_bear'],
  mangle: ['ability_druid_mangle-tga'], leader_pack: ['spell_nature_unyeildingstamina', 'ability_druid_challangingroar'], berserk: ['ability_druid_berserk'], insect_swarm: ['spell_nature_insectswarm'],
  swiftmend: ['inv_relics_idolofrejuvenation', 'ability_druid_naturalperfection'],
}

export const RACIAL_ICONS: Record<string, string[]> = {
  bloodfury: ['racial_orc_berserkerstrength'], berserking: ['racial_troll_berserk'], stoneform: ['spell_shadow_unholystrength'], warstomp: ['ability_warstomp'],
  cannibalize: ['ability_racial_cannibalize'], shadowmeld: ['ability_ambush'], escape: ['ability_rogue_trip', 'ability_rogue_sprint'], perception: ['spell_nature_sleep', 'ability_spy'],
  wotf: ['spell_shadow_raisedead', 'spell_shadow_twistedfaith'], slow: ['spell_frost_frostshock', 'spell_frost_iceshock'],
}

export const MENU_ICONS: Record<string, string[]> = {
  spell: ['inv_misc_book_09', 'inv_misc_book_11', 'inv_misc_book_07'], talent: ['ability_marksmanship', 'ability_warrior_improveddisciplines'],
  skills: ['ability_dualwield', 'trade_engineering'], quest: ['inv_misc_note_02', 'inv_letter_15'], map: ['inv_misc_map_01', 'inv_misc_spyglass_02', 'inv_misc_spyglass_03'],
  log: ['inv_misc_book_08', 'inv_scroll_03'], gear: ['trade_engineering', 'inv_misc_gear_01'], // złote koło zębate jak w grze
  town: ['inv_misc_rune_01', 'spell_holy_sealofsacrifice'], capital: ['spell_arcane_teleportstormwind', 'spell_arcane_teleportorgrimmar', 'inv_misc_rune_01'],
}

export const RACE_ICON = (race: string, female = false) => `race_${race === 'undead' ? 'scourge' : race}_${female ? 'female' : 'male'}`
export const CLASS_ICON = (cls: string) => `classicon_${cls}`

// Grupy ikon przedmiotów (prefiksy nazw plików) według tego, czym przedmiot jest
const ARMOR_SLOT: Record<string, string[]> = {
  head: ['inv_helmet_'], shoulder: ['inv_shoulder_'], wrist: ['inv_bracer_'], hands: ['inv_gauntlets_'], waist: ['inv_belt_'], feet: ['inv_boots_'],
  back: ['inv_misc_cape_'], neck: ['inv_jewelry_necklace_', 'inv_jewelry_amulet_'], finger: ['inv_jewelry_ring_'], trinket: ['inv_jewelry_talisman_', 'inv_misc_ahnqirajtrinket_', 'inv_jewelry_frostwolftrinket_'],
  shirt: ['inv_shirt_'], tabard: ['inv_misc_tournaments_tabard_'],
}
const WEAPON: Record<string, string[]> = {
  Dagger: ['inv_weapon_shortblade_'], 'Fist Weapon': ['inv_weapon_hand_'], Sword: ['inv_sword_'], Greatsword: ['inv_sword_'], Axe: ['inv_axe_'], Greataxe: ['inv_axe_'],
  Mace: ['inv_mace_'], Maul: ['inv_hammer_'], Polearm: ['inv_weapon_halberd_', 'inv_spear_'], Staff: ['inv_staff_'], Bow: ['inv_weapon_bow_'], Gun: ['inv_weapon_rifle_'],
  Crossbow: ['inv_weapon_crossbow_'], Wand: ['inv_wand_'], Thrown: ['inv_throwingknife_', 'thrown_'], Shield: ['inv_shield_'], Orb: ['inv_misc_orb_', 'inv_misc_book_'],
}
const ARMOR_TYPE: Record<string, string> = { cloth: 'cloth', leather: 'leather', mail: 'chain', plate: 'plate' }
const JUNK: Record<string, string[]> = {
  beast: ['inv_misc_pelt_', 'inv_misc_monstertail_'], cat: ['inv_misc_pelt_', 'inv_misc_monstertail_'], boar: ['inv_misc_pelt_boar_'], raptor: ['inv_misc_monsterscales_'],
  murloc: ['inv_misc_monsterscales_', 'inv_misc_fish_'], spider: ['inv_misc_monsterscales_'], insect: ['inv_misc_monsterscales_'], flyer: ['inv_misc_monstertail_'],
  undead: ['inv_misc_dust_', 'inv_misc_powder_'], elemental: ['inv_elemental_', 'inv_misc_dust_'], dragon: ['inv_misc_monsterscales_', 'inv_misc_head_dragon_'],
  giant: ['inv_stone_', 'inv_misc_monsterhead_'], humanoid: ['inv_fabric_', 'inv_misc_leatherscrap_'], small: ['inv_misc_leatherscrap_', 'inv_fabric_'],
}
// Prefiksy ikon dla przedmiotu (null = rysowana ikona)
export function itemIconGroups(it: Item, junkType?: string): string[] | null {
  if (it.kit) return ['inv_misc_armorkit_']
  if (it.bagSize) return ['inv_misc_bag_']
  if (it.food) return it.food.kind === 'drink' ? ['inv_drink_'] : ['inv_misc_food_1', 'inv_misc_food_6']
  if (it.quest) return ['inv_misc_note_', 'inv_letter_', 'inv_misc_stonetablet_']
  if (it.weaponType && WEAPON[it.weaponType]) return WEAPON[it.weaponType]
  if (it.slot === 'chest' || it.slot === 'legs') {
    const base = it.slot === 'chest' ? 'inv_chest_' : 'inv_pants_'
    const t = it.armorType ? ARMOR_TYPE[it.armorType] : ''
    return t ? [`${base}${t}_`, base] : [base]
  }
  if (it.slot && ARMOR_SLOT[it.slot]) return ARMOR_SLOT[it.slot]
  if (!it.slot && it.rarity === 0) return JUNK[junkType ?? ''] ?? ['inv_misc_monsterscales_', 'inv_misc_leatherscrap_', 'inv_misc_dust_']
  return null
}

// Ikony konkretnych przedmiotów po nazwie (pierwsza dostępna). Wybrane ręcznie po obejrzeniu grafik,
// żeby chleb był chlebem, a śmieci z humanoidów nie wyglądały jak monety.
export const ITEM_ICONS: Record<string, string[]> = {
  // plecak i umiejętności broni (okno Skills pokazuje ikonę typu broni)
  Backpack: ['inv_misc_bag_08'], Sword: ['inv_sword_04', 'inv_sword_27'], Greatsword: ['inv_sword_06', 'inv_sword_04'], Axe: ['inv_axe_01', 'inv_axe_02'], Greataxe: ['inv_axe_09', 'inv_axe_04'],
  Mace: ['inv_mace_01', 'inv_mace_13'], Maul: ['inv_hammer_05', 'inv_hammer_04'], Dagger: ['inv_weapon_shortblade_05', 'inv_weapon_shortblade_01'], 'Fist Weapon': ['inv_gauntlets_04', 'inv_weapon_hand_01'],
  Staff: ['inv_staff_08', 'inv_staff_11'], Polearm: ['inv_weapon_halberd_09', 'inv_spear_06'], Bow: ['inv_weapon_bow_05', 'inv_weapon_bow_08'], Gun: ['inv_weapon_rifle_01'], Crossbow: ['inv_weapon_crossbow_01', 'inv_weapon_crossbow_08'],
  Thrown: ['inv_throwingknife_02', 'inv_throwingaxe_01'], Wand: ['inv_wand_01', 'inv_wand_11'],
  // jedzenie
  'Tough Hunk of Bread': ['inv_misc_food_11', 'inv_misc_food_12'], 'Freshly Baked Bread': ['inv_misc_food_12', 'inv_misc_food_11'],
  'Moist Cornbread': ['inv_misc_food_09', 'inv_misc_food_11'], 'Mulgore Spice Bread': ['inv_misc_food_12', 'inv_misc_food_11'],
  'Soft Banana Bread': ['inv_misc_food_23', 'inv_misc_food_12'], 'Homemade Cherry Pie': ['inv_misc_food_10', 'inv_food_christmasfruitcake_01', 'inv_misc_food_12'],
  // picie
  'Refreshing Spring Water': ['inv_drink_07', 'inv_drink_waterskin_10'], 'Ice Cold Milk': ['inv_drink_milk_05', 'inv_drink_26_goatsmilk'],
  'Melon Juice': ['inv_drink_09', 'inv_potion_06', 'inv_drink_06'], 'Sweet Nectar': ['inv_drink_12', 'inv_drink_06'],
  'Moonberry Juice': ['inv_drink_11', 'inv_potion_11', 'inv_drink_14'], 'Morning Glory Dew': ['inv_drink_10', 'inv_drink_14', 'inv_drink_01'],
  // jedzenie z buffem (Well Fed)
  'Herb Baked Egg': ['inv_misc_food_15_egg', 'inv_egg_03'], 'Crocolisk Steak': ['inv_misc_food_14', 'inv_misc_food_69'],
  'Curiously Tasty Omelet': ['inv_misc_food_13', 'inv_egg_03'], 'Grilled Squid': ['inv_misc_fish_13', 'inv_misc_fish_19'],
  'Nightfin Soup': ['inv_drink_17', 'inv_misc_food_64'], 'Monster Omelet': ['inv_misc_food_06', 'inv_misc_food_51', 'inv_egg_03'],
  'Runn Tum Tuber Surprise': ['inv_misc_food_63', 'inv_misc_food_25'], 'Smoked Desert Dumplings': ['inv_misc_food_64', 'inv_misc_food_pinenut'],
  "Dirge's Kickin' Chimaerok Chops": ['inv_misc_food_65', 'inv_misc_food_46', 'inv_misc_food_69'],
  // zestawy naprawcze
  'Light Repair Kit': ['inv_misc_armorkit_17', 'inv_misc_armorkit_30'], 'Medium Repair Kit': ['inv_misc_armorkit_16', 'inv_misc_armorkit_30'],
  'Heavy Repair Kit': ['inv_misc_armorkit_08'], 'Thorium Repair Kit': ['inv_misc_armorkit_15', 'inv_misc_armorkit_08'],
  // śmieci
  'Broken Fang': ['inv_misc_bone_08', 'inv_misc_bone_04'], 'Chipped Claw': ['inv_misc_monsterclaw_04', 'inv_misc_monsterclaw_06'],
  'Ruined Pelt': ['inv_misc_pelt_bear_ruin_02'], 'Matted Fur': ['inv_misc_pelt_wolf_01', 'inv_misc_pelt_03'], 'Torn Pelt': ['inv_misc_pelt_bear_ruin_03'],
  'Sharp Claw': ['inv_misc_monsterclaw_02', 'inv_misc_monsterclaw_06'], 'Cracked Tusk': ['inv_misc_bone_09', 'inv_misc_bone_04'],
  'Coarse Hide': ['inv_misc_pelt_boar_ruin_01'], 'Boar Ribs': ['inv_misc_food_16', 'inv_misc_food_69'],
  'Raptor Talon': ['inv_misc_monsterclaw_06'], 'Shredded Scale': ['inv_misc_monsterscales_08'],
  'Tattered Cloth': ['inv_fabric_linen_02', 'inv_fabric_linen_01'], 'Cracked Pottery': ['inv_misc_bowl_01'], 'Bent Spoon': ['inv_misc_spoon_01', 'inv_gizmo_pipe_01'],
  'Torn Map': ['inv_misc_map_01', 'inv_misc_map02'], 'Large Candle': ['inv_misc_candle_01'], 'Dirty Rag': ['inv_fabric_linen_01', 'inv_misc_leatherscrap_02'],
  'Rusty Gear': ['inv_misc_gear_01'], 'Slimy Scale': ['inv_misc_monsterscales_11'], 'Murloc Fin': ['inv_misc_monstertail_04', 'inv_misc_fish_10'],
  'Murky Pearl Fragment': ['inv_misc_gem_pearl_02'], 'Bone Fragments': ['inv_misc_bone_04'], 'Grave Dust': ['inv_misc_dust_02'], 'Rotting Flesh': ['inv_misc_organ_02'],
  'Gooey Spider Leg': ['inv_misc_slime_02'], 'Silken Thread Scrap': ['inv_misc_web_02'], 'Venom Sac': ['inv_misc_organ_02', 'inv_potion_19'],
  'Ragged Feather': ['inv_feather_05'], 'Broken Talon': ['inv_misc_monsterclaw_06'], 'Beak Shard': ['inv_misc_horn_01'],
  'Glowing Shard': ['inv_enchant_shardbrilliantsmall'], 'Elemental Dust': ['inv_misc_dust_01'], 'Cracked Core': ['inv_stone_02', 'inv_elemental_primal_air'],
  'Charred Scale': ['inv_misc_monsterscales_16'], 'Whelp Claw': ['inv_misc_monsterclaw_06'], 'Heavy Bone': ['inv_misc_bone_04', 'inv_misc_bone_orcskull_01'],
  'Crude Trinket': ['inv_misc_rune_01'], 'Big Toenail': ['inv_stone_10'], 'Cracked Carapace': ['inv_misc_monsterscales_02'],
  'Stinger Fragment': ['inv_misc_monstertail_03'], 'Chitin Shard': ['inv_misc_monsterscales_09'],
}

// Pasywne rasówki: ikona jak w Classicu, potem zastępstwa z dostępnych plików
export const PASSIVE_ICONS: Record<string, string[]> = {
  'The Human Spirit': ['inv_enchant_shardbrilliantsmall'], 'Sword Specialization': ['inv_sword_27'], 'Mace Specialization': ['inv_mace_01', 'inv_mace_13'],
  Diplomacy: ['inv_misc_note_02'], 'Gun Specialization': ['inv_musket_03', 'inv_weapon_rifle_01'], 'Frost Resistance': ['spell_frost_wizardmark', 'spell_frost_frostward', 'spell_frost_frost'],
  'Treasure Finding': ['racial_dwarf_findtreasure', 'inv_misc_coin_02'], Quickness: ['ability_racial_shadowmeld', 'ability_rogue_sprint'], 'Wisp Spirit': ['spell_nature_wispsplode'],
  'Nature Resistance': ['spell_nature_resistnature', 'spell_nature_spiritarmor'], 'Expansive Mind': ['inv_enchant_essenceeternallarge', 'inv_enchant_essenceastrallarge'],
  'Arcane Resistance': ['spell_nature_starfall'], 'Engineering Specialization': ['inv_misc_gear_01'], Hardiness: ['inv_helmet_23'],
  Command: ['ability_warrior_warcry', 'ability_warrior_battleshout'], 'Axe Specialization': ['inv_axe_02'], 'Underwater Breathing': ['spell_shadow_demonbreath', 'ability_shaman_watershield'],
  'Shadow Resistance': ['spell_shadow_detectinvisibility'], Endurance: ['spell_nature_unyeildingstamina', 'spell_holy_wordfortitude'],
  'Plainsrunning': ['ability_mount_kodo_03', 'ability_mount_kodo_02', 'ability_rogue_sprint'], Regeneration: ['spell_nature_regenerate', 'spell_nature_rejuvenation'],
  'Beast Slaying': ['inv_misc_pelt_bear_ruin_02'], 'Throwing / Bow Specialization': ['inv_throwingknife_02', 'inv_weapon_bow_12', 'inv_weapon_bow_08'],
}

// Talenty: nazwa ikony jak w Classicu. "Improved X" bez wpisu dostaje ikonę zdolności X.
export const TALENT_ICONS: Record<string, string> = {
  // Warrior
  deflection: 'ability_parry', imp_charge: 'ability_warrior_charge', tactical_mastery: 'spell_nature_enchantarmor', anger_management: 'spell_holy_blessingofstamina',
  deep_wounds: 'ability_backstab', two_handed_spec: 'inv_axe_09', impale: 'ability_searingarrow', axe_spec: 'inv_axe_06', mace_spec: 'inv_mace_01', sword_spec: 'inv_sword_27',
  polearm_spec: 'inv_weapon_halbard_01', bloodthrill: 'ability_warrior_bloodfrenzy', booming_voice: 'spell_nature_purge', cruelty: 'ability_rogue_eviscerate',
  unbridled_wrath: 'spell_nature_stoneclawtotem', blood_craze: 'spell_shadow_summonimp', dual_wield_spec: 'ability_dualwield', enrage: 'spell_shadow_unholyfrenzy',
  raging_blows: 'ability_warrior_endlessrage', flurry: 'ability_ghoulfrenzy', shield_spec: 'inv_shield_06', anticipation: 'spell_nature_mirrorimage', toughness: 'spell_holy_devotion',
  iron_will: 'spell_magic_magearmor', defiance: 'ability_warrior_innerrage', vanguard: 'ability_warrior_defensivestance', one_handed_spec: 'inv_sword_20',
  imp_shield_bash: 'ability_warrior_shieldbash', imp_demo_shout: 'ability_warrior_warcry',
  // Paladin
  divine_strength: 'ability_golemthunderclap', divine_intellect: 'spell_nature_sleep', spiritual_focus: 'spell_arcane_blink', healing_light: 'spell_holy_holybolt',
  unyielding_faith: 'spell_holy_unyieldingfaith', illumination: 'spell_holy_greaterheal', divine_favor: 'spell_holy_heal', lasting_judgement: 'spell_holy_healingaura',
  holy_power: 'spell_holy_power', redoubt: 'ability_defend', precision_p: 'ability_rogue_ambush', guardians_favor: 'spell_holy_sealofprotection', toughness_p: 'spell_holy_devotion',
  imp_righteous_fury: 'spell_holy_sealoffury', shield_spec_p: 'inv_shield_06', anticipation_p: 'spell_magic_lesserinvisibilty', reckoning: 'spell_holy_blessingofstrength',
  one_handed_spec_p: 'inv_sword_20', benediction: 'spell_frost_windwalkon', deflection_p: 'ability_parry', vindication: 'spell_holy_vindication', conviction: 'spell_holy_retributionaura',
  eye_for_eye: 'spell_holy_eyeforaneye', two_handed_spec_p: 'inv_hammer_04', vengeance: 'ability_racial_avatar', imp_judgement: 'spell_holy_righteousfury', imp_devotion: 'spell_holy_devotionaura',
  // Hunter
  endurance_training: 'spell_nature_reincarnation', thick_hide_h: 'inv_misc_pelt_bear_03', bestial_swiftness: 'ability_druid_dash', unleashed_fury: 'ability_bullrush',
  imp_mend_pet: 'ability_hunter_mendpet', ferocity: 'inv_misc_monsterclaw_04', spirit_bond: 'ability_druid_demoralizingroar', bestial_discipline: 'spell_nature_abolishmagic',
  frenzy: 'inv_misc_monsterclaw_03', efficiency: 'spell_frost_wizardmark', lethal_shots: 'ability_searingarrow', hawk_eye: 'ability_townwatch', mortal_shots: 'ability_piercedamage',
  barrage: 'ability_upgrademoonglaive', ranged_weapon_spec: 'inv_weapon_rifle_06', lone_wolf: 'ability_hunter_pet_wolf', monster_slaying: 'inv_misc_head_dragon_black',
  humanoid_slaying: 'spell_holy_prayerofhealing', deflection_h: 'ability_parry', entrapment: 'spell_nature_stranglevines', savage_strikes: 'ability_racial_bloodrage',
  clever_traps: 'spell_nature_timestop', survivalist: 'spell_shadow_twilight', trap_mastery: 'ability_ensnare', surefooted: 'ability_kick', killer_instinct: 'spell_holy_blessingofstamina',
  resourcefulness: 'ability_hunter_resourcefulness', lightning_reflexes: 'spell_nature_invisibilty', imp_concussive: 'spell_frost_stun',
  // Rogue
  remorseless: 'ability_fiegndead', malice: 'ability_racial_bloodrage', ruthlessness: 'ability_druid_disembowel', murder: 'spell_shadow_deathscream',
  relentless_strikes: 'ability_warrior_decisivestrike', lethality: 'ability_criticalstrike', vile_poisons: 'ability_rogue_feigndeath', imp_poisons: 'ability_poisons',
  seal_fate: 'spell_shadow_chilltouch', vigor: 'spell_nature_earthbindtotem', lightning_reflexes_r: 'spell_nature_invisibilty', deflection_r: 'ability_parry',
  precision: 'ability_marksmanship', endurance_r: 'spell_shadow_shadowward', dagger_spec: 'inv_weapon_shortblade_05', dual_wield_spec_r: 'ability_dualwield',
  mace_spec_r: 'inv_mace_01', sword_spec_r: 'inv_sword_27', fist_spec: 'inv_gauntlets_04', weapon_expertise: 'spell_holy_blessingofstrength', aggression: 'ability_racial_avatar',
  master_deceiver: 'spell_shadow_charm', opportunity: 'ability_warrior_warcry', sleight_hand: 'ability_rogue_feint', elusiveness: 'spell_magic_lesserinvisibilty',
  camouflage: 'ability_stealth', initiative: 'spell_shadow_fumble', setup: 'spell_nature_mirrorimage', serrated_blades: 'inv_sword_17', heightened_senses: 'ability_ambush',
  dirty_deeds: 'spell_shadow_summonsuccubus',
  // Priest
  unbreakable_will: 'spell_magic_magearmor', wand_spec: 'inv_wand_01', silent_resolve: 'spell_nature_manaregentotem', martyrdom: 'spell_nature_tranquility',
  meditation: 'spell_nature_sleep', mental_agility: 'ability_hibernation', mental_strength: 'spell_nature_enchantarmor', force_will: 'spell_nature_slowingtotem',
  healing_focus: 'spell_holy_healingfocus', holy_spec: 'spell_holy_sealofsalvation', spell_warding: 'spell_holy_spellwarding', divine_fury: 'spell_holy_sealofwrath',
  blessed_recovery: 'spell_holy_blessedrecovery', inspiration: 'spell_holy_layonhands', holy_reach: 'spell_holy_purify', imp_healing: 'spell_holy_heal02',
  searing_light: 'spell_holy_searinglightpriest', spirit_redemption: 'inv_enchant_essenceeternallarge', spiritual_guidance: 'spell_holy_spiritualguidence',
  spiritual_healing: 'spell_nature_moonglow', spirit_tap: 'spell_shadow_requiem', blackout: 'spell_shadow_gathershadows', shadow_affinity: 'spell_shadow_shadowward',
  shadow_focus: 'spell_shadow_burningspirit', shadow_reach: 'spell_shadow_chilltouch', shadow_weaving: 'spell_shadow_blackplague', darkness: 'spell_shadow_twilight',
  divine_aegis: 'spell_holy_devineaegis', imp_vampiric: 'spell_shadow_improvedvampiricembrace',
  // Shaman
  convection: 'spell_nature_wispsplode', concussion: 'spell_fire_fireball', elemental_warding: 'spell_nature_spiritarmor', reverberation: 'spell_frost_frostward',
  call_of_flame: 'spell_fire_immolation', elemental_devastation: 'spell_fire_elementaldevastation', elemental_focus: 'spell_shadow_manaburn', eye_storm: 'spell_shadow_soulleech_2',
  call_of_thunder: 'spell_lightning_lightningbolt01', elemental_reach: 'spell_nature_stormreach', lightning_overload: 'spell_nature_lightningoverload', elemental_fury: 'spell_fire_volcano',
  ancestral_knowledge: 'spell_shadow_grimward', thundering_strikes: 'ability_thunderbolt', guardian_totems: 'spell_nature_stoneskintotem', imp_ghost_wolf: 'spell_nature_spiritwolf',
  anticipation_e: 'spell_nature_mirrorimage', flurry_s: 'ability_ghoulfrenzy', toughness_e: 'spell_holy_devotion', elemental_weapons: 'spell_fire_flametounge', spirit_weapons: 'ability_parry',
  maelstrom_weapon: 'spell_shaman_maelstromweapon', imp_healing_wave: 'spell_nature_magicimmunity', tidal_focus: 'spell_frost_manarecharge', imp_reincarnation: 'spell_nature_reincarnation',
  ancestral_healing: 'spell_nature_undyingstrength', totemic_focus: 'spell_nature_moonglow', natures_guidance: 'spell_frost_stun', healing_focus_s: 'spell_nature_healingwavelesser',
  totemic_mastery: 'spell_nature_nullward', healing_grace: 'spell_nature_healingtouch', restorative_totems: 'spell_nature_manaregentotem', tidal_mastery: 'spell_nature_tranquility',
  healing_way: 'spell_nature_healingway', purification: 'spell_frost_wizardmark', imp_lightning_shield: 'spell_nature_lightningshield',
  // Mage
  arcane_subtlety: 'spell_holy_dispelmagic', arcane_focus: 'spell_holy_devotion', wand_spec_m: 'inv_wand_01', magic_absorption: 'spell_nature_astralrecalgroup',
  arcane_concentration: 'spell_shadow_manaburn', arcane_resilience: 'spell_arcane_arcaneresilience', imp_counterspell: 'spell_frost_iceshock', arcane_meditation: 'spell_shadow_siphonmana',
  arcane_mind: 'spell_shadow_charm', arcane_instability: 'spell_shadow_teleport', impact: 'spell_fire_meteorstorm', ignite: 'spell_fire_incinerate', flame_throwing: 'spell_fire_flare',
  incinerate: 'spell_fire_flameshock', burning_soul: 'spell_fire_fire', master_of_elements: 'spell_fire_masterofelements', critical_mass: 'spell_nature_wispheal',
  fire_power: 'spell_fire_immolation', frost_warding: 'spell_frost_frostward', elemental_precision: 'spell_ice_magicdamage', ice_shards: 'spell_frost_iceshard',
  frostbite: 'spell_frost_frostarmor', permafrost: 'spell_frost_wisp', piercing_ice: 'spell_frost_frostbolt', arctic_reach: 'spell_shadow_darkritual', frost_channeling: 'spell_frost_stun',
  shatter: 'spell_frost_frostshock', winters_chill: 'spell_frost_chillingblast', imp_cone_cold: 'spell_frost_glacier', imp_mana_shield: 'spell_shadow_detectlesserinvisibility',
  // Warlock
  suppression: 'spell_shadow_unsummonbuilding', fel_concentration: 'spell_shadow_fingerofdeath', grim_reach: 'spell_shadow_callofbone', nightfall: 'spell_shadow_twilight',
  shadow_mastery: 'spell_shadow_shadetruesight', imp_healthstone: 'inv_stone_04', imp_imp: 'spell_shadow_summonimp', demonic_embrace: 'spell_shadow_metamorphosis',
  imp_health_funnel: 'spell_shadow_lifedrain', imp_voidwalker: 'spell_shadow_summonvoidwalker', fel_intellect: 'spell_holy_magicalsentry', imp_succubus: 'spell_shadow_summonsuccubus',
  fel_domination: 'spell_nature_removecurse', fel_stamina: 'spell_shadow_antishadow', master_summoner: 'spell_shadow_impphaseshift', unholy_power: 'spell_shadow_shadowworddominate',
  imp_firestone: 'inv_ammo_firetar', master_demonologist: 'spell_shadow_shadowpact', cataclysm: 'spell_fire_windsofwoe', bane: 'spell_shadow_deathpact', aftermath: 'spell_fire_fire',
  imp_firebolt: 'spell_fire_firebolt', imp_lash: 'spell_shadow_curse', devastation: 'spell_fire_flameshock', intensity: 'spell_fire_lavaspawn',
  destructive_reach: 'spell_shadow_corpseexplode', emberstorm: 'spell_fire_selfdestruct', pyroclasm: 'spell_fire_volcano', ruin: 'spell_shadow_shadowwordpain',
  // Druid
  natures_grasp: 'spell_nature_natureswrath', imp_natures_grasp: 'spell_nature_natureswrath', natural_weapons: 'inv_staff_01', natural_shapeshifter: 'spell_nature_wispsplode',
  omen_of_clarity: 'spell_nature_crystalball', natures_reach: 'spell_nature_naturetouchgrow', vengeance_d: 'spell_nature_purge', moonfury: 'spell_nature_moonglow',
  natures_grace: 'spell_nature_naturesblessing', moonglow: 'spell_nature_sentinal', ferocity_d: 'ability_hunter_pet_hyena', feral_aggression: 'ability_druid_demoralizingroar',
  feral_instinct: 'ability_ambush', brutal_impact: 'ability_druid_bash', thick_hide: 'inv_misc_pelt_bear_03', feline_swiftness: 'spell_nature_spiritwolf',
  sharpened_claws: 'inv_misc_monsterclaw_04', heart_of_the_wild: 'spell_holy_blessingofagility', predatory_strikes: 'ability_hunter_pet_cat', blood_frenzy: 'ability_ghoulfrenzy',
  primal_fury: 'ability_racial_cannibalize', savage_fury: 'ability_druid_ravage', furor: 'spell_holy_blessingofstamina', natures_focus: 'spell_nature_healingwavegreater',
  reflection: 'spell_frost_windwalkon', subtlety_d: 'ability_eyeoftheowl', tranquil_spirit: 'spell_holy_elunesgrace', gift_of_nature: 'spell_nature_protectionformnature',
  imp_entangling: 'spell_nature_stranglevines', imp_mark_wild: 'spell_nature_regeneration',
}
// Zdolność, której ikonę bierze "Improved X", gdy brakuje własnej
export function talentAbility(id: string): string | null {
  const m = /^imp_(.+?)(?:_[a-z])?$/.exec(id)
  if (!m) return null
  const ALIAS: Record<string, string> = { demo_shout: 'demoralizing_shout', concussive: 'concussive_shot', cone_cold: 'cone_of_cold', vampiric: 'vampiric_embrace',
    entangling: 'entangling_roots', devotion: 'devotion_aura', retribution_aura: 'retribution_aura', pw_shield: 'pw_shield', hammer_justice: 'hammer_justice',
    seal_righteousness: 'seal_righteousness', mark_wild: 'mark_wild', searing_pain: 'searing_pain', shadow_bolt: 'shadow_bolt' }
  return ALIAS[m[1]] ?? m[1]
}

// Stany wroga i inne znaczniki (ogłuszenie, spowolnienie, obezwładnienie, elita, boss, Well Fed)
export const STATE_ICONS: Record<string, string[]> = {
  stun: ['spell_frost_stun', 'ability_warstomp'], slow: ['spell_frost_frostshock', 'spell_frost_iceshock'], cc: ['spell_nature_polymorph', 'spell_frost_chainsofice'],
  root: ['spell_nature_stranglevines'], freeze: ['spell_frost_frostnova'], fear: ['spell_shadow_possession', 'spell_shadow_psychicscream'],
  elite: ['inv_misc_head_dragon_01', 'ability_creature_cursed_02'], boss: ['inv_misc_head_dragon_black', 'achievement_boss_onyxia'], wellfed: ['spell_misc_food'], dot: ['ability_creature_poison_02'],
}
