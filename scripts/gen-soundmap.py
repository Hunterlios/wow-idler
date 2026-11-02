# Generuje src/audio/soundmap.ts: zdarzenia gry -> konkretne pliki z assets/sound (wg assets/lista-plikow.txt).
#   python scripts/gen-soundmap.py assets/lista-plikow.txt abilities.json
# Reguły to wzorce (regex) po ścieżkach w stylu oryginalnego klienta (sound/interface/..., sound/item/weapons/...).
import json, re, sys, collections

lst = sys.argv[1] if len(sys.argv) > 1 else 'assets/lista-plikow.txt'
abil = json.load(open(sys.argv[2] if len(sys.argv) > 2 else '/tmp/abil.json'))
out_path = sys.argv[3] if len(sys.argv) > 3 else 'src/audio/soundmap.ts'
S, sec = [], None
for l in open(lst, encoding='utf-8').read().split('\n'):
    if l.startswith('# '): sec = l[2:]; continue
    if sec == 'SOUNDS' and l: S.append(l.split('\t')[0])
by_dir = collections.defaultdict(list)
for p in S: by_dir[p.rsplit('/', 1)[0]].append(p)

M = {}
def add(key, pats, cap=10, excl=None):
    if isinstance(pats, str): pats = [pats]
    for pat in pats:  # pierwszy wzorzec, który coś znajdzie, wygrywa
        r = [p for p in S if re.search(pat, p) and not (excl and re.search(excl, p))]
        if r:
            M[key] = sorted(r)[:cap]
            return True
    return False

# ---------------------------------------------------------------- interfejs
I = r'^interface/'
add('ui.click', I + r'iuiinterfacebuttona\.ogg$'); add('ui.micro', I + r'iuimainmenubuttona\.ogg$')
for k, o, c in [('char', 'ucharactersheetopen', 'ucharactersheetclose'), ('spells', 'iabilitiesopena', 'iabilitiesclosea'), ('talents', 'talentscreenopen', 'talentscreenclose'),
                ('quests', 'iquestlogopena', 'iquestlogclosea'), ('map', 'uminimapopen', 'uminimapclose'), ('bags', 'iequipmentcontaineropena', 'iequipmentcontainerclosea'),
                ('skills', 'ucharactersheettab', 'ucharactersheettab'), ('settings', 'uescapescreenopen', 'uescapescreenclose'), ('log', 'iquestlogopena', 'iquestlogclosea'),
                ('city', 'imoneydialogopen', 'imoneydialogclose')]:
    add(f'ui.open.{k}', I + o + r'\.ogg$'); add(f'ui.close.{k}', I + c + r'\.ogg$')
add('ui.page', I + r'iabilitiesturnpage[abc]\.ogg$'); add('ui.tab', I + r'ucharactersheettab\.ogg$')
add('ui.error', I + r'error\.ogg$'); add('ui.target', I + r'iselecttarget\.ogg$'); add('ui.hover', I + r'mouseovertarget\.ogg$')
add('ui.coins', I + r'lootcoinsmall\.ogg$'); add('ui.coinsbig', I + r'lootcoinlarge\.ogg$'); add('ui.loot', I + r'uilootpickupitem\.ogg$')
add('ui.lootrare', I + r'ui_epicloot_toast_01\.ogg$'); add('ui.lootlegend', I + r'ui_legendary_item_toast\.ogg$')
add('ui.questaccept', I + r'iquestactivate\.ogg$'); add('ui.questprog', I + r'iquestupdate\.ogg$'); add('ui.questdone', I + r'iquestcomplete\.ogg$')
add('ui.objective', I + r'ui_quest_objectivecomplete_01\.ogg$'); add('ui.levelup', I + r'levelup\.ogg$')
add('ui.bind', I + r'igplayerbind\.ogg$'); add('ui.hearth', [r'^spells/astralrecall\.ogg$', r'^spells/teleport\.ogg$'])
add('ui.eat', I + r'ieating1\.ogg$'); add('ui.drink', I + r'idrinking1\.ogg$'); add('ui.repair', [r'^spells/sharpenweapon', r'^item/usesounds/usestonerunbbingonstone'])
add('ui.boss', I + r'raidbosswarning\.ogg$'); add('ui.cleared', I + r'ui_scenario_stage_end\.ogg$'); add('ui.zoneboss', I + r'ui_scenario_ending\.ogg$')
add('ui.revive', [r'^spells/resurrection\.ogg$', r'^spells/resurrection']); add('ui.spirit', [r'^spells/resurrection\.ogg$'])
add('ui.learn', [I + r'glyph_minorcreate\.ogg$', I + r'magicclick\.ogg$']); add('ui.talent', [I + r'glyph_majorcreate\.ogg$'])
add('ui.buy', I + r'lootcoinsmall\.ogg$'); add('ui.skillup', [I + r'ui_tradeskill_levelup_01\.ogg$'])
add('ui.equip.weapon', I + r'unsheathmetal\.ogg$'); add('ui.sheath', I + r'sheathmetal\.ogg$')
for race in ['human', 'dwarf', 'gnome', 'nightelf', 'orc', 'undead', 'tauren', 'troll']:
    add(f'ui.explore.{race}', I + race + r'exploration\.ogg$')
for m in ['bag', 'book', 'cloth_leather01', 'foodgeneric', 'gems', 'herb', 'largechain', 'meat', 'metallarge', 'metalsmall', 'parchment_paper', 'ring', 'rocks_ore01', 'smallchain', 'wand', 'water_liquid01', 'woodlarge', 'woodsmall']:
    short = m.split('_')[0].replace('generic', '').replace('01', '')
    add(f'pick.{short}', I + r'pickup/pickup' + m + r'\.ogg$')
    alt = {'metallarge': 'largemetal', 'metalsmall': 'smallmetal'}.get(m, m)
    add(f'drop.{short}', I + r'pickup/putdown' + alt + r'\.ogg$')

# ---------------------------------------------------------------- broń i walka
W = r'^item/weapons/'
for sz in ['small', 'medium', 'large']:
    add(f'swing.{sz}', W + r'weaponswings/mwoosh' + sz + r'\d\.ogg$'); add(f'swing.{sz}.crit', W + r'weaponswings/mwoosh' + sz + r'crit\.ogg$')
add('miss.1h', W + r'missswings/misswhoosh1handed'); add('miss.2h', W + r'missswings/misswhoosh2handed')
add('parry', W + r'parrysounds/1hparrymetalhitmetal\.ogg$'); add('parry.2h', W + r'parrysounds/2hparrymetalhitmetal\.ogg$')
add('block.metal', W + r'shields/metalshieldblock'); add('block.wood', W + r'shields/woodenshieldblock')
add('bow.pull', W + r'bow/bowpullback'); add('bow.release', W + r'bow/bowrelease'); add('arrow.hit', W + r'bow/arrowhit')
add('gun.fire', [W + r'gun/gunfire', W + r'gunfire01']); add('gun.load', W + r'gun/gunload')
add('wand', [r'^spells/shootwandlaunch'])
for d in ['axe1h', 'axe2h', 'dagger', 'mace1h', 'mace2h', 'sword1h', 'sword2h', 'unarmed']:
    for mat in ['flesh', 'chain', 'plate', 'stone', 'wood']:
        files = [p for p in by_dir.get('item/weapons/' + d, []) if re.search('hit' + mat, p.split('/')[-1]) and 'shield' not in p]
        if d == 'unarmed': files = [p for p in by_dir.get('item/weapons/unarmed', []) if 'attack' in p]
        norm = [p for p in files if not re.search(r'crit', p)]
        crit = [p for p in files if re.search(r'crit', p)]
        if norm: M[f'hit.{d}.{mat}'] = sorted(norm)
        if crit: M[f'hit.{d}.{mat}.crit'] = sorted(crit)
for sz in ['small', 'medium', 'large']:
    add(f'claw.{sz}', W + r'unarmed/unarmedattack' + sz + r'[abc]\.ogg$'); add(f'claw.{sz}.crit', W + r'unarmed/unarmedattack' + sz + r'crit\.ogg$')
add('death.impact', r'^effects/deathimpacts/', 6)

# ---------------------------------------------------------------- głosy bohatera (wysiłek, rany, śmierć, okrzyk, błędy)
PX = {'human': 'humanmalemain', 'dwarf': 'dwarfmalemain', 'gnome': 'gnomemalemain', 'nightelf': 'nightelfmalemain', 'orc': 'orcmalemain', 'undead': 'undeadmalemain', 'tauren': 'taurenmalemain', 'troll': 'trollmalemain'}
DIR = {'human': 'human', 'dwarf': 'dwarf', 'gnome': 'gnome', 'nightelf': 'nightelf', 'orc': 'orc', 'undead': 'scourge', 'tauren': 'tauren', 'troll': 'troll'}
for race, px in PX.items():
    E = r'^character/playerexertions/(?:[^/]*/)?' + px
    add(f'voice.{race}.attack', E + r'attack'); add(f'voice.{race}.wound', E + r'wound[a-d]\.ogg$'); add(f'voice.{race}.crit', E + r'woundcrit')
    add(f'voice.{race}.death', E + r'death'); add(f'voice.{race}.roar', r'^character/playerroars/characterroars' + race + r'male\.ogg$')
    rd = DIR[race]
    for k, pat in [('bagfull', 'inventoryfull'), ('money', 'notenoughmoney'), ('mana', 'nomana'), ('rage', 'norage'), ('energy', 'noenergy'), ('cooldown', 'spellcooldown'), ('range', 'outofrange')]:
        add(f'voice.{race}.err.{k}', r'^character/' + rd + r'/[^/]*male[^/]*errormessages/[^/]*_err_' + pat, excl='female')
    for k in ['hello', 'thankyou', 'cheer', 'goodbye', 'outofmana', 'healme', 'charge', 'yes']:
        add(f'voice.{race}.{k}', r'^character/' + rd + r'/[^/]*vocalmale/[^/]*male' + k + r'\d', excl='female')

# NPC: powitania w mieście (rasa kupca / zleceniodawcy / strażnika)
for race, pats in {
    'human': [r'^creature/humanmalestandardnpc/.*greeting', r'^character/human/malenpc/.*greeting'], 'dwarf': [r'^creature/dwarfmalestandardnpc/.*greeting', r'^character/dwarf/dwarfmalenpc/.*greeting'],
    'gnome': [r'^creature/gnomemalestandardnpc/.*greeting'], 'nightelf': [r'^creature/nightelfmale[^/]*npc/.*greeting'], 'orc': [r'^character/orc/orcmalenpc/.*greeting', r'^creature/genorcmale1/.*greet'],
    'tauren': [r'^creature/taurenmalewarriornpc/.*greeting', r'^creature/taurenmale[^/]*npc/.*greeting'], 'troll': [r'^creature/generictrollmale/.*greet', r'^creature/trollmale[^/]*npc/.*greeting'],
    'undead': [r'^character/scourge/undeadnpc/.*greeting', r'^character/scourge/undeadnpc/'],
}.items():
    add(f'npc.{race}.greet', pats, 8)
    add(f'npc.{race}.vendor', [p.replace('greeting', 'vendor') for p in pats], 6)

# ---------------------------------------------------------------- czary: rzucanie wg szkoły + konkretne efekty zdolności
for sch, word in [('fire', 'fire'), ('frost', 'frostmagic'), ('holy', 'holymagic'), ('nature', 'naturemagic'), ('shadow', 'shadowmagic'), ('arcane', 'mage')]:
    add(f'precast.{sch}', r'^spells/precast' + word + r'(low|medium)\.ogg$'); add(f'precast.{sch}.high', r'^spells/precast' + word + r'high\.ogg$')
add('impact.fire', r'^spells/fireballimpact'); add('impact.frost', [r'^spells/iceblastimpact', r'^spells/icenuke_impact']); add('impact.arcane', r'^spells/arcanemissileimpact')
add('impact.nature', [r'^spells/natureimpact', r'^spells/lightningboltimpact']); add('impact.shadow', [r'^spells/shadowwordpaintarget', r'^spells/hauntimpact']); add('impact.holy', [r'^spells/holyimpactddlow', r'^spells/holyimpactdd'])
add('heal', [r'^spells/heal_low_base', r'^spells/holyimpactddlow']); add('heal.big', [r'^spells/greaterheal_low_base', r'^spells/holyimpactddmedium']); add('hot', [r'^spells/renew', r'^spells/rejuvenation'])
for sch in ['fire', 'frost', 'holy', 'nature', 'shadow']: add(f'fizzle.{sch}', r'^spells/fizzle/fizzle' + sch)
add('shield.absorb', r'^spells/absorbgethit'); add('stun', [r'^spells/knockdown', r'^spells/bonk']); add('totem.drop', [r'^spells/totem', r'^interface/pickup/putdownwoodlarge'])
add('form.shift', [r'^spells/druidmorph_impact_base', r'^spells/druidmorph']); add('ghostwolf', r'^spells/spiritwolf')

def compact(s): return re.sub(r'[^a-z]', '', s.lower())
spell_files = [p for p in S if p.startswith('spells/') and not re.match(r'spells/(\d|fx_|sha_|alert)', p)]
manual = {  # zdolności o nazwach plików innych niż nazwa czaru
    'frostbolt': ['icenuke_impact', 'iceblastimpact'], 'shadow_bolt': ['shadowwordpaintarget'], 'smite': ['holyimpactddlow'], 'mind_blast': ['shadowwordpaintarget'],
    'heroic_strike': ['savageblowtarget', 'strike'], 'charge': ['bullrush'], 'mortal_strike': ['savageblowtarget'], 'overpower': ['strike'], 'whirlwind': ['swingweaponspecialwarrior'],
    'lightning_bolt': ['lightningboltimpact'], 'chain_lightning': ['lightningboltimpact'], 'earth_shock': ['rockbiterimpact'], 'frost_shock': ['iceblastimpact'], 'flame_shock': ['fireballimpact'],
    'healing_wave': ['restorationimpact'], 'lesser_healing_wave': ['restorationimpact'], 'chain_heal': ['restorationimpact'], 'healing_touch': ['restorationimpact'], 'regrowth': ['restorationimpact'],
    'wrath': ['druid_wrath_impact'], 'holy_light': ['holylight_low_head', 'holyimpactddmedium'], 'flash_of_light': ['holyimpactddlow'], 'flash_heal': ['flashheal_low_base'], 'greater_heal': ['greaterheal_low_base'],
    'lesser_heal': ['heal_low_base'], 'heal': ['heal_low_base'], 'pw_shield': ['holyprotection'], 'pw_fortitude': ['innerfire'], 'sw_pain': ['shadowwordpaintarget'], 'judgement': ['judgmentsofthewiseimpact'],
    'hammer_justice': ['fistofjustice'], 'seal_righteousness': ['sealofmight'], 'seal_crusader': ['sealofcrusader_impact'], 'blessing_might': ['sealofmight'], 'raptor_strike': ['strike'],
    'arcane_shot': ['arcanemissileimpact'], 'serpent_sting': ['naturemissileloop'], 'multi_shot': ['concussiveshotimpact'], 'aimed_shot': ['concussiveshotimpact'], 'demon_skin': ['demonarmor'],
    'demon_armor': ['demonarmor'], 'corruption': ['curse'], 'curse_agony': ['curse'], 'curse_weakness': ['curse'], 'drain_life': ['lifedrainloop'], 'drain_soul': ['lifedrainloop'], 'life_tap': ['bloodboil'],
    'searing_pain': ['scorchimpact'], 'hellfire': ['rainoffireimpact'], 'rain_of_fire': ['rainoffireimpact'], 'death_coil': ['deathcoiltarget'], 'howl_terror': ['fear'], 'psychic_scream': ['fear'],
    'intimidating_shout': ['fear'], 'claw': ['swipetarget'], 'rake': ['swipetarget'], 'shred': ['swipetarget'], 'rip': ['rendtarget'], 'ferocious_bite': ['evisceratetarget'], 'maul': ['swipetarget'],
    'mangle': ['mangle_impact'], 'bash': ['knockdown'], 'concussion_blow': ['knockdown'], 'cheap_shot': ['kidneyshot'], 'garrote': ['rendtarget'], 'rupture': ['rendtarget'], 'ambush': ['backstab'],
    'slice_dice': ['coldblood'], 'fire_blast': ['fireballimpact'], 'pyroblast': ['meteorimpactbase'], 'arcane_missiles': ['arcanemissileimpact'], 'cone_of_cold': ['coneofcoldhand'],
    'ice_armor': ['frostarmor'], 'frost_armor': ['frostarmor'], 'mage_armor': ['magearmorimpact'], 'ice_barrier': ['icebarrirerimpact'], 'mana_shield': ['magearmorimpact'], 'arcane_intellect': ['astralrecall'],
    'mark_wild': ['restorationimpact'], 'bear_form': ['druidmorph_impact_base'], 'cat_form': ['druidmorph_impact_base'], 'moonkin_form': ['druidmorph_impact_base'], 'travel_form': ['druidmorph_impact_base'],
    'ghost_wolf': ['spiritwolf'], 'retribution_aura': ['retributionaur'], 'devotion_aura': ['devotionaur'], 'holy_wrath': ['holyimpactddhigh'], 'holy_shock': ['holyimpactddmedium'], 'holy_fire': ['holyimpactddmedium'],
    'consecration': ['holyimpactddmedium'], 'exorcism': ['exorcism'], 'shield_slam': ['shieldbreak'], 'shield_block': ['shieldwalltarget'], 'sunder_armor': ['strike'], 'demoralizing_shout': ['battleshouttarget'],
    'demoralizing_roar': ['challengingroar'], 'enrage': ['challengingroar'], 'bloodrage': ['bloodboil'], 'berserker_rage': ['challengingshout'], 'retaliation': ['strike'], 'shield_wall': ['shieldwalltarget'],
    'last_stand': ['shieldwalltarget'], 'hamstring': ['cripple'], 'wing_clip': ['cripple'], 'mongoose_bite': ['strike'], 'counterattack': ['strike'], 'freezing_trap': ['freezingcircleimpact'],
    'immolation_trap': ['fireballimpact'], 'explosive_trap': ['fireballimpact'], 'summon_imp': ['demoniccirclesummon'], 'summon_voidwalker': ['demoniccirclesummon'], 'summon_succubus': ['demoniccirclesummon'],
    'summon_felhunter': ['demoniccirclesummon'], 'summon_hawk': ['petcall'], 'rockbiter': ['rockbiterimpact'], 'flametongue': ['firecast'], 'frostbrand': ['icecast'], 'windfury': ['cycloneofelements'],
    'stormstrike': ['lightningshieldimpact'], 'lava_burst': ['shaman_lavaburstimpact'], 'fire_nova': ['firenov'], 'frost_nova': ['frostnov'], 'blast_wave': ['firenov'], 'combustion': ['firecast'],
    'presence_of_mind': ['arcanepower_state_chest'], 'arcane_power': ['arcanepower_state_chest'], 'innervate': ['restorationimpact'], 'starfire': ['starfireimpact'], 'moonfire': ['moonfireimpact'],
    'insect_swarm': ['insectswarm_state_chest'], 'barkskin': ['spiritarmorimpact'], 'frenzied_regen': ['restorationimpact'], 'swiftmend': ['restorationimpact'], 'penance': ['priest_pennance_missileloop'],
    'mind_flay': ['priest_mindsearcast'], 'devouring_plague': ['bestowdiseaseimpact'], 'vampiric_embrace': ['shadowformimpact'], 'shadowform': ['shadowformimpact'], 'silence': ['shadowwordsilence'],
    'holy_nova': ['holyimpactddmedium'], 'prayer_healing': ['prayerofhealing'], 'prayer_mending': ['prayerofmending_impact_head'], 'power_infusion': ['priest_powerinfusion'], 'inner_focus': ['innerfire'],
    'evasion': ['stealth'], 'blind': ['gougetarget'], 'sinister_strike': ['sinisterstrikeimpact'], 'hemorrhage': ['rendtarget'], 'ghostly_strike': ['ghostlystrikeimpact'], 'mutilate': ['mutilate_impact_chest'],
    'adrenaline_rush': ['coldblood'], 'blade_flurry': ['fanofknivesloop'], 'riposte': ['strike'], 'preparation': ['coldblood'], 'cold_blood': ['coldblood'], 'kidney_shot': ['kidneyshot'],
    'deterrence': ['stealth'], 'rapid_fire': ['hunter_rapidfire'], 'bestial_wrath': ['challengingroar'], 'intimidation': ['challengingroar'], 'scatter_shot': ['concussiveshotimpact'],
    'conflagrate': ['fireballimpact'], 'shadowburn': ['shadowwordpaintarget'], 'soul_fire': ['fireballimpact'], 'siphon_life': ['lifedrainloop'], 'dark_pact': ['bloodboil'], 'amplify_curse': ['curse'],
    'seal_crusader': ['sealofcrusader'], 'seal_fury': ['sealoflight'], 'seal_wisdom': ['sealoflight'], 'seal_command': ['sealofblood'], 'seal_light': ['sealoflight'],
    'blessing_wisdom': ['sealoflight'], 'blessing_kings': ['sealofmight'], 'blessing_sanctuary': ['sealofmight'], 'sanctity_aura': ['resistanceaura'], 'trueshot_aura': ['resistanceaura'],
    'rapid_fire': ['hunterrapidfire'], 'feral_charge': ['druidferalcharge'], 'leader_pack': ['challengingroar'], 'berserk': ['druidberserk'], 'pounce': ['druidpounce'], 'ravage': ['swipetarget'],
    'tigers_fury': ['druidsavageroar'], 'hurricane': ['cycloneofelements'], 'evocation': ['arcaneformprecast'], 'ice_block': ['icebarrirerimpact'], 'cold_snap': ['iceveins'], 'arcane_blast': ['arcanemissileimpact'],
    'piercing_howl': ['furioushowl'], 'bloodthirst': ['savageblowtarget'], 'slam': ['strike'], 'revenge': ['strike'], 'sweeping_strikes': ['swingweaponspecialwarrior'], 'death_wish': ['recklessnesstarget'],
    'volley': ['concussiveshotimpact'], 'wyvern_sting': ['sleepimpact'], 'expose_armor': ['evisceratetarget'], 'desperate_prayer': ['heallowbase'], 'fear_ward': ['holyprotection'], 'shadow_protection': ['shadowward'],
    'divine_spirit': ['innerfire'], 'lightwell': ['holyimpactddmedium'], 'drain_hope': ['lifedrainloop'], 'demonic_sacrifice': ['soulshatterimpact'], 'soul_link': ['soulfunnel'], 'holy_strike': ['holyimpactddlow'],
    'divine_protection': ['divineshield'], 'hammer_wrath': ['hammeroftherighteousimpact'], 'voice_of_truth': ['battleshouttarget'], 'holy_shield': ['holyprotection'], 'templars_bulwark': ['holyprotection'],
    'repentance': ['sleepimpact'], 'spearing_strike': ['strike'], 'natures_swiftness_sh': ['restorationimpact'], 'natures_swiftness_dr': ['restorationimpact'], 'hunters_mark': ['misdirectionimpact'],
    'call_elements': ['totem'], 'totemic_projection': ['totem'], 'mana_tide': ['totem'], 'riptide': ['restorationimpact'], 'water_shield': ['lightningshieldimpact'], 'rage_farseer': ['heroism_cast'],
}
used = {}
for a in abil:
    cands = []
    keys = [(compact(a['name']), False), (compact(a['id']), False)] + [(compact(m), True) for m in manual.get(a['id'], [])]
    for k, contains in keys:
        if not k: continue
        r = [p for p in spell_files if (k in compact(p.split('/')[-1][:-4])) if contains] if contains else [p for p in spell_files if compact(p.split('/')[-1][:-4]).startswith(k)]
        if r: cands = r; break
    if not cands: continue
    # bez pętli dźwiękowych (stan aury / kanał) — to jednorazowe efekty
    one = [p for p in cands if 'loop' not in p] or cands
    M[f'spell.{a["id"]}'] = sorted(one)[:6]
    used[a['id']] = M[f'spell.{a["id"]}'][0]

# ---------------------------------------------------------------- moby: głosy wg rodzaju (folder creature/<nazwa>)
MOB = {
    'canine': ['wolf'], 'hyena': ['hyena', 'wolf'], 'felhound': ['felhound', 'wolf'], 'bear': ['bear', 'bearv2'], 'boar': ['boar'], 'cat': ['cat', 'tiger'], 'tiger': ['tiger', 'cat'],
    'croc': ['cataclysmcrocodile', 'basilisk'], 'basilisk': ['basilisk'], 'turtle': ['seaturtle', 'deepseaturtle', 'turtlespeedy'], 'kodo': ['kodobeast', 'triceratops'], 'ape': ['gorilla'], 'yeti': ['yeti'],
    'furbolg': ['furbolg', 'bear'], 'worgen': ['worgen', 'worgenmale', 'wolf'], 'kobold': ['kobold', 'kobold2'], 'murloc': ['murloc'], 'naga': ['naga', 'nagafemale'], 'gnoll': ['gnoll'], 'quilboar': ['quillboar', 'boar'],
    'harpy': ['harpy'], 'ogre': ['ogre', 'ogreking'], 'golem': ['golemiron', 'stonegolem', 'golem_stone'], 'harvestgolem': ['harvestgolem', 'golemiron'], 'abomination': ['abomination'], 'skeleton': ['skeleton', 'skeletonmage'],
    'ghoul': ['ghoul', 'zombie'], 'zombie': ['zombie', 'ghoul'], 'ghost': ['ghost'], 'raptor': ['raptor'], 'spider': ['giantspider', 'spiderunderground'], 'scorpid': ['durotarscorpion', 'amberscorpion'],
    'vulture': ['carrion', 'arcticcondor'], 'bat': ['giantvampirebat', 'vampiricbatling', 'felbat'], 'owl': ['owl'], 'strider': ['tallstrider'], 'hippogryph': ['hippogryph'], 'chimera': ['chimera'],
    'ptero': ['pterodactyl'], 'whelp': ['dragonwhelp'], 'dragonkin': ['dragonfootsoldier', 'dragonwhelp'], 'fire': ['elementalfire'], 'earth': ['elementalearth', 'earthelementalsmall'], 'air': ['elementalair'],
    'water': ['waterelemental'], 'ooze': ['slime', 'greaterslime'], 'lasher': ['lasher'], 'treant': ['ancientprotector', 'ancientofarcane'], 'satyr': ['satyr', 'satyre'], 'centaur': ['centaur'],
    'troll': ['foresttroll', 'foresttrollmale', 'troll'], 'goblin': ['goblin', 'goblin01'], 'gnome': ['gnome', 'gnomemale'], 'imp': ['demonfelimp', 'impvo'], 'voidwalker': ['voidwalker', 'demonvoidwalker'],
    'gargoyle': ['felbat', 'bat'], 'snake': ['snake', 'serpent'],
}
mob_ok = {}
for v, folders in MOB.items():
    got = False
    for f in folders:
        files = [p for p in S if p.startswith(f'creature/{f}/')]
        if not files: continue
        nm = lambda p: p.split('/')[-1]
        groups = {
            'aggro': [p for p in files if re.search(r'aggro', nm(p)) and 'preaggro' not in nm(p)],
            'attack': [p for p in files if re.search(r'attack', nm(p)) and 'crit' not in nm(p) and 'mytarget' not in nm(p)],
            'wound': [p for p in files if re.search(r'wound', nm(p)) and not re.search(r'crit|death', nm(p))],
            'death': [p for p in files if re.search(r'death', nm(p))],
        }
        if not groups['attack'] and not groups['wound']: continue
        for k, l in groups.items():
            if l: M[f'mob.{v}.{k}'] = sorted(l)[:8]
        mob_ok[v] = f; got = True
        break
# humanoidy (ludzie, orkowie, krasnoludy...): odgłosy jak gracze tej rasy
for race in PX:
    for k, src in [('attack', 'attack'), ('wound', 'wound'), ('death', 'death')]:
        if f'voice.{race}.{src}' in M: M[f'mob.h{race}.{k}'] = M[f'voice.{race}.{src}']

# ---------------------------------------------------------------- muzyka i ambient
Z = r'^music/zonemusic/'
for b, dirs in {'forest': ['forest'], 'snow': ['mountain'], 'nightforest': ['enchantedforest', 'evilforest'], 'desert': ['desert', 'barrendry'], 'undead': ['evilforest'], 'plains': ['plains', 'barrendry'],
                'swamp': ['soggyplace'], 'jungle': ['jungle'], 'volcanic': ['volcanic'], 'plague': ['cursedland'], 'coast': ['forest', 'plains'], 'mountain': ['mountain'], 'crater': ['jungle']}.items():
    r = [p for p in S if any(p.startswith(f'music/zonemusic/{d}/') for d in dirs)]
    if r: M[f'music.{b}'] = sorted(r)
for city in ['stormwind', 'ironforge', 'darnassus', 'orgrimmar', 'thunderbluff', 'undercity']:
    add(f'music.city.{city}', r'^music/citymusic/' + city + '/', 20)
for race, t in {'human': 'tavernhuman', 'dwarf': 'taverndwarf', 'gnome': 'taverndwarf', 'nightelf': 'tavernnightelf', 'orc': 'tavernorc', 'troll': 'tavernorc', 'tauren': 'taverntauren', 'undead': 'tavernundead'}.items():
    add(f'music.town.{race}', Z + t + '/', 10)
add('music.ghost', Z + r'ghostmusic/')
A = r'^ambience/zoneambience/'
for b, pats in {'forest': ['forestnormalday'], 'snow': ['forestsnowday'], 'nightforest': ['enchantedforestnight', 'forestdarkenchantednight'], 'desert': ['plainsdesertday', 'canyondesertday'],
                'undead': ['forestscarynight'], 'plains': ['grasslandsday', 'plainsdesertday'], 'swamp': ['marshday'], 'jungle': ['jungleday'], 'volcanic': ['volcanicday'], 'plague': ['plaguelandsday'],
                'coast': ['beachday'], 'mountain': ['foresthighday'], 'crater': ['jungleday']}.items():
    add(f'amb.{b}', [A + p + r'\.ogg$' for p in pats])
add('amb.ghost', r'^ambience/ghoststate\.ogg$'); add('amb.sea', r'^ambience/water/oceana\.ogg$'); add('amb.air', A + r'amb_high_altitude_wind_loop_01\.ogg$')

# ---------------------------------------------------------------- zapis
keys = sorted(M)
lines = ['// WYGENEROWANE przez scripts/gen-soundmap.py z assets/lista-plikow.txt — nie edytuj ręcznie.',
         '// Klucz zdarzenia -> pliki w assets/sound (ścieżki względne). Brak klucza = brak dźwięku.',
         'export const SOUNDS: Record<string, string[]> = {']
for k in keys: lines.append(f'  {json.dumps(k)}: {json.dumps(M[k])},')
lines += ['}', 'export type SoundKey = string', f'export const MOB_SOUND_FOLDERS: Record<string, string> = {json.dumps(mob_ok)}', '']
open(out_path, 'w', encoding='utf-8').write('\n'.join(lines))
files = sorted({p for v in M.values() for p in v})
open(out_path.replace('soundmap.ts', 'soundfiles.json'), 'w').write(json.dumps(files))
print(len(keys), 'kluczy,', len(files), 'plików;', 'zdolności z dźwiękiem:', len(used), '/', len(abil), '; moby:', len(mob_ok), '/', len(MOB))
print('bez dźwięku:', [a['id'] for a in abil if a['id'] not in used])
print('moby bez dźwięku:', [v for v in MOB if v not in mob_ok])
missing_ui = [k for k in ['ui.click', 'ui.levelup', 'ui.questdone', 'ui.loot', 'ui.coins', 'hit.sword1h.flesh', 'swing.medium', 'voice.orc.attack', 'music.forest', 'amb.forest'] if k not in M]
print('brak podstawowych:', missing_ui)
