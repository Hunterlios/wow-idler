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
  log: ['inv_misc_book_08', 'inv_scroll_03'], gear: ['inv_misc_enggizmos_01', 'inv_gizmo_02', 'trade_engineering'],
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
  giant: ['inv_stone_', 'inv_misc_monsterhead_'], humanoid: ['inv_misc_coin_', 'inv_misc_note_', 'inv_misc_leatherscrap_'], small: ['inv_misc_leatherscrap_', 'inv_misc_coin_'],
}
// Prefiksy ikon dla przedmiotu (null = rysowana ikona)
export function itemIconGroups(it: Item, junkType?: string): string[] | null {
  if (it.kit) return ['inv_misc_armorkit_']
  if (it.bagSize) return ['inv_misc_bag_']
  if (it.food) return it.food.kind === 'drink' ? ['inv_drink_', 'inv_misc_beer_'] : ['inv_misc_food_', 'inv_misc_fish_']
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
