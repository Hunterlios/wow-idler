// Moby, NPC, pupile i totemy w tym samym pikselowym stylu co bohater (render/sprites.ts).
// Wygląd moba wynika z typu (beast, humanoid, ...) i nazwy (np. "Defias", "Gnoll", "Quilboar"), kolor z danych strefy.
// Wszystkie są budowane tymi samymi częściami ciała i konturem co bohater, więc scena ma jeden styl graficzny.
import type { MobType } from '../data/zones'
import type { RaceId } from '../data/races'
import type { ClassId } from '../data/classes'
import {
  Grid, hex, tone, LOOKS, OUTFITS, bipedSprite, quadSprite, creatureSprite, buildSpider, buildScorpid, buildRaptor, buildBird, buildStrider, buildWhelp, buildElemental,
  type Anim, type CAnim, type Look, type Outfit, type QuadSpec, type Sprite, type WeaponKind, type OffKind, type BipedSpec,
} from './sprites'

const shadeHex = (h: string, k: number) => { const c = tone(hex(h), k); return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}` }
const hsh = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296 }
const HUMAN_SKIN = ['#e8b48a', '#d8a078', '#c08060', '#f0c8a0', '#a87050']
const HAIR = ['#6b4423', '#2a1a10', '#b4561e', '#d8c070', '#4a4a4a']

// ---------------------------------------------------------------- humanoidalne moby: wygląd z nazwy
type BipedMob = { spec: BipedSpec; scale?: number }
const L = (base: Look, o: Partial<Look>): Look => ({ ...base, ...o })
const O = (o: Partial<Outfit> & { armor: string }): Outfit => ({ trim: shadeHex(o.armor, -0.35), legs: '#5a4026', boots: '#3a2814', magic: '#80c0ff', pauldron: 'none', ...o })

function bipedMob(name: string, type: MobType, color: string): BipedMob | null {
  const n = name.toLowerCase()
  const r = hsh(name)
  const human = L(LOOKS.human, { skin: HUMAN_SKIN[Math.floor(r * HUMAN_SKIN.length)], hair: HAIR[Math.floor(r * 7) % HAIR.length] })
  const W = (w: WeaponKind, off: OffKind = 'none') => ({ weapon: w, off })
  const mk = (look: Look, outfit: Outfit, w: WeaponKind, off: OffKind = 'none', scale?: number): BipedMob => ({ spec: { look, outfit, ...W(w, off) }, scale })

  if (type === 'humanoid' || type === 'small' || type === 'murloc' || type === 'undead' || type === 'giant' || type === 'flyer' || type === 'dragon' || type === 'beast' || type === 'elemental') {
    // --- humanoidy
    if (/gnoll|hogger|riverpaw|brashclaw|grizlak|garrick|ribchaser/.test(n)) return mk(L(LOOKS.human, { skin: '#a8804a', hair: '#5a3a1a', eye: '#ffd040', glow: true, hairStyle: 'mane', muzzle: 'hyena', ears: 'pointy', hunch: 2, fur: true }), O({ armor: color, legs: '#6a4a2a', chest: 'rags', pauldron: 'small' }), r < 0.5 ? 'Club' : 'Axe')
    if (/quilboar|bristleback|razormane|death's head|sharptusk|thornweaver|thornmantle/.test(n)) return mk(L(LOOKS.orc, { skin: color, hair: shadeHex(color, -0.4), hairStyle: 'mane', muzzle: 'boar', tusks: true, ears: 'pointy', hunch: 2, spines: '#e8dcc0', fur: true }), O({ armor: color, bare: true, loin: true, legs: '#6a4424', head: /shaman/.test(n) ? 'feather' : undefined, magic: '#80ff60' }), /shaman/.test(n) ? 'Staff' : 'Spear')
    if (/satyr|felsworn|legashi/.test(n)) return mk(L(LOOKS.human, { skin: '#a06a8a', hair: '#3a1a2a', eye: '#a0ff60', glow: true, hairStyle: 'long', horns: 'satyr', ears: 'long', lower: 'goat', tail: '#3a1a2a', hooves: true }), O({ armor: color, bare: true, legs: '#4a2a32', boots: '#2a1414', magic: '#80ff40' }), 'Dagger', 'Weapon')
    if (/kolkar|galak|gelkis|magram|centaur/.test(n)) return null // centaur → czworonóg
    if (/troll|bloodscalp|frostmane|skullsplitter|witherbark|vilebranch|gan'zulah|grik'nir/.test(n)) return mk(L(LOOKS.troll, { skin: color, hair: /frostmane/.test(n) ? '#e8f0f8' : '#d43a28' }), O({ armor: '#6a4424', bare: true, loin: true, legs: '#7a4a22', head: /seer|shaman|witch/.test(n) ? 'feather' : undefined, magic: '#60c8ff' }), /seer|shaman|witch/.test(n) ? 'Staff' : r < 0.5 ? 'Axe' : 'Spear')
    if (/blackrock|dragonmaw|burning blade|\borc|warsong|grunt|gath'ilzogg|nek'rosh|ma'ruk|yarrog/.test(n)) {
      const caster = /adept|cultist|shaman|warlock/.test(n)
      return mk(L(LOOKS.orc, { skin: /burning blade/.test(n) ? '#6c9c36' : color }), caster ? O({ armor: '#6a1a1a', robe: true, head: 'hood', chest: 'skull', magic: '#c060ff' }) : O({ armor: '#4a4a52', trim: '#6a2a1a', legs: '#3a2a1a', pauldron: 'big', head: 'helm', chest: 'belt2' }), caster ? 'Staff' : r < 0.5 ? 'Axe' : 'Greataxe')
    }
    if (/blood elf|dalaran|apprentice|magus|sorcer|archmage|arugal|melenas/.test(n)) return mk(L(LOOKS.human, { hair: /blood elf/.test(n) ? '#e8d070' : '#6b4423', ears: /blood elf/.test(n) ? 'long' : undefined, skin: '#f0c8a0' }), O({ armor: color, robe: true, head: /dalaran|apprentice/.test(n) ? 'pointy' : undefined, chest: 'trimline', trim: '#e8c048', magic: '#ff8af0' }), 'Staff')
    if (/dark iron/.test(n)) return mk(L(LOOKS.dwarf, { skin: '#6a6a72', hair: '#1a1a1a', eye: '#ff6020', glow: true }), O({ armor: color, legs: '#3a3030', pauldron: 'mid', head: 'helm', chest: 'belt2' }), 'Pick')
    if (/dark strand|fanatic|cultist|scarlet/.test(n)) return mk(human, O({ armor: color, robe: true, head: 'hood', chest: 'skull', magic: '#c060ff' }), 'Dagger')
    if (/furbolg|gnarlpine|blackwood|deadwood|timbermaw|foulweald|ursa/.test(n)) return mk(L(LOOKS.tauren, { skin: color, hair: shadeHex(color, -0.3), horns: undefined, muzzle: 'bear', ears: 'round', hairStyle: 'none', fur: true, claws: true }), O({ armor: color, bare: true, loin: true, legs: '#5a3a1a', head: r < 0.3 ? 'feather' : undefined }), 'Club', 'none', 1.05)
    if (/nightbane|moonrage|worgen/.test(n)) return mk(L(LOOKS.human, { skin: '#5a5048', hair: '#3a302a', eye: '#ffd040', glow: true, hairStyle: 'mane', muzzle: 'wolf', ears: 'pointy', hunch: 3, claws: true, fur: true, torsoW: 11 }), O({ armor: color, legs: '#3a2a22', bare: true, loin: true, chest: 'rags', magic: '#a060ff' }), 'none', 'none', 1.1)
    if (/defias|bandit|thug|night runner|trapper|smuggler|footpad|rogue|cutthroat|vancleef|ringleader|syndicate|collector|perrine/.test(n)) return mk(human, O({ armor: shadeHex(color, -0.15), trim: '#3a2414', legs: '#4a3a2a', head: 'bandana', mask: color, chest: 'strap', pauldron: 'small' }), /trapper/.test(n) ? 'Bow' : /thug/.test(n) ? 'Club' : 'Dagger', /thug/.test(n) ? 'none' : 'none')
    if (/sailor|swashbuckler|bloodsail|pirate|kul tiras/.test(n)) return mk(human, O({ armor: '#e8e0cc', trim: color, legs: '#3a3a5a', head: 'bandana', chest: 'sash' }), 'Sword')
    if (/farmhand|peasant|laborer|logger|worker/.test(n) && type !== 'small') return mk(human, O({ armor: color, legs: '#4a3a2a', chest: 'strap' }), r < 0.5 ? 'Pick' : 'Club')
    if (/kurzen|soldier|guard|footman|militia|mercenary/.test(n) && type === 'humanoid') return mk(human, O({ armor: color, legs: '#3a3a2a', pauldron: 'mid', head: 'helm', chest: 'belt2' }), 'Sword', 'Shield')
    if (/lost one/.test(n)) return mk(L(LOOKS.human, { skin: '#7a8ab8', hair: '#2a2a3a', hairStyle: 'ragged', hunch: 2, eye: '#a0e0ff', glow: true }), O({ armor: color, legs: '#3a2a22', chest: 'rags' }), 'Spear')
    if (/harpy/.test(n)) return mk(L(LOOKS.nightelf, { skin: '#c8a090', hair: color, hairStyle: 'long', ears: undefined, wings: color, lower: 'talon', claws: true, eye: '#ffd040', glow: true }), O({ armor: color, bare: true, loin: true, legs: '#c8a090', boots: '#d8b040' }), 'none')
    if (/gargoyle/.test(n)) return mk(L(LOOKS.orc, { skin: color, hair: color, hairStyle: 'none', horns: 'demon', wings: shadeHex(color, -0.2), lower: 'talon', claws: true, tusks: false, eye: '#ff4040', glow: true, hunch: 2 }), O({ armor: color, bare: true }), 'none')
    if (/dragonspawn|firemane|dragonkin|wyrmkin/.test(n)) return mk(L(LOOKS.orc, { skin: color, hair: color, hairStyle: 'none', horns: 'dragon', muzzle: 'croc', tusks: false, wings: shadeHex(color, -0.25), tail: color, lower: 'serpent', eye: '#ffd040', glow: true, claws: true }), O({ armor: color, bare: true, belt: '#8a6a2a' }), 'Polearm', 'none', 1.1)
    if (/siren|naga|spitelash|daggerspine|lady |lord shalzaru|myrmidon|nazjak|gilmorian/.test(n)) return mk(L(LOOKS.nightelf, { skin: color, hair: '#2a6a5a', hairStyle: 'long', lower: 'serpent', fin: shadeHex(color, 0.2), ears: 'long' }), O({ armor: '#c8a040', bare: true, belt: '#c8a040', magic: '#60e0ff' }), 'Polearm')
    if (type === 'murloc') return mk(L(LOOKS.gnome, { skin: color, hair: color, hairStyle: 'none', muzzle: 'fish', fin: shadeHex(color, 0.25), eye: '#ffe060', headW: 12, headH: 10, leg: 5, torsoW: 9 }), O({ armor: color, bare: true, loin: true, legs: shadeHex(color, -0.2) }), r < 0.5 ? 'Spear' : 'none')
    // --- małe
    if (/kobold/.test(n)) return mk(L(LOOKS.gnome, { skin: color, hair: shadeHex(color, -0.3), hairStyle: 'none', muzzle: 'rat', ears: 'round', tail: '#c89a8a', headW: 10, headH: 9, eye: '#140c0a' }), O({ armor: '#6a4a2a', legs: '#4a3a2a', head: 'candle', chest: 'rags' }), 'Pick')
    if (/venture|goblin/.test(n)) return mk(L(LOOKS.gnome, { skin: '#6aa040', hair: '#2a1a10', hairStyle: 'none', ears: 'goblin', nose: 'big', headW: 11 }), O({ armor: color, legs: '#4a3a2a', head: 'hardhat', chest: 'strap' }), /logger/.test(n) ? 'Axe' : 'Pick')
    if (/leper gnome|gnome/.test(n)) return mk(L(LOOKS.gnome, { skin: '#a8b090', hair: '#e8e0d0', eye: '#e0ff80', glow: true }), O({ armor: color, legs: '#4a4a3a', chest: 'rags' }), 'Gun')
    if (/familiar|imp|grell/.test(n)) return mk(L(LOOKS.gnome, { skin: color, hair: color, hairStyle: 'none', horns: 'demon', ears: 'goblin', tail: shadeHex(color, -0.2), eye: '#ffe060', glow: true, headW: 10, headH: 9 }), O({ armor: color, bare: true, loin: true, legs: '#3a1a1a', magic: '#ff8020' }), 'none')
    if (type === 'small') return mk(L(LOOKS.gnome, { skin: '#c8a07a', hair: '#4a3a2a', hairStyle: 'ragged' }), O({ armor: color, legs: '#4a3a2a', head: 'candle' }), 'Pick')
    // --- nieumarli
    if (/skelet|rattlecage|bone/.test(n)) return mk(L(LOOKS.undead, { skin: '#e8e4d4', hair: '#e8e4d4', hairStyle: 'none', ribs: true, jaw: true, eye: '#80e0ff', glow: true }), O({ armor: '#e8e4d4', bare: true, legs: '#d8d4c4', boots: '#b8b4a4', loin: true }), r < 0.5 ? 'Sword' : 'Axe', r < 0.3 ? 'Shield' : 'none')
    if (type === 'undead' && /lord|baron|gandling|darkmaster|araj|ghost|devlin|stalvan/.test(n)) return mk(L(LOOKS.undead, { skin: '#c8ccc0', eye: '#80e0ff', glow: true }), O({ armor: '#2a2a3a', trim: '#7a3ab0', robe: true, head: 'hood', chest: 'skull', magic: '#80e0ff' }), 'Staff')
    if (type === 'undead') return mk(L(LOOKS.undead, { skin: color, hunch: /ghoul|horror/.test(n) ? 3 : 1, claws: true }), O({ armor: shadeHex(color, -0.35), legs: '#3a3a30', chest: 'rags' }), 'none')
    // --- olbrzymy
    if (/golem|watcher/.test(n)) {
      const scare = /harvest/.test(n)
      return mk(L(LOOKS.orc, { skin: scare ? '#c8a24a' : color, hair: '#6a4a2a', hairStyle: scare ? 'ragged' : 'none', tusks: false, eye: '#ff3020', glow: true, torsoW: 15, torsoH: 15, leg: 11, headW: 11, headH: 10 }), O({ armor: scare ? '#8a6a3a' : color, legs: scare ? '#6a4a2a' : shadeHex(color, -0.2), boots: '#3a3a3a', pauldron: 'big', head: scare ? undefined : 'helm', chest: scare ? 'rags' : 'belt2' }), scare ? 'Pick' : 'Maul', 'none', 1.25)
    }
    if (/monstrosity|stitched|abomination/.test(n)) return mk(L(LOOKS.orc, { skin: '#9aa47a', hair: '#3a3a3a', hairStyle: 'none', tusks: false, stitches: true, torsoW: 17, torsoH: 15, leg: 9, headW: 9, headH: 9, hunch: 2, eye: '#ffe060', glow: true }), O({ armor: '#9aa47a', bare: true, loin: true, legs: '#6a6a4a' }), 'Greataxe', 'none', 1.25)
    if (/grimtotem/.test(n)) return mk(L(LOOKS.tauren, { skin: color }), O({ armor: '#3a2a1a', legs: '#4a2a1a', pauldron: 'mid', chest: 'sash', trim: '#a02020', head: 'feather' }), 'Greataxe', 'none', 1.15)
    if (type === 'giant' || /ogre|mauler|brute/.test(n)) return mk(L(LOOKS.orc, { skin: color, hair: '#2a1a10', hairStyle: 'topknot', tusks: true, oneEye: r < 0.4, torsoW: 16, torsoH: 15, leg: 11, headW: 12, headH: 11, hunch: 2 }), O({ armor: '#6a4a2a', bare: true, loin: true, legs: '#5a3a1a', belt: '#4a2c14', pauldron: r < 0.5 ? 'big' : 'none' }), 'Club', 'none', 1.25)
    if (/yeti|ape|gorilla/.test(n)) return mk(L(LOOKS.tauren, { skin: color, hair: color, horns: undefined, muzzle: 'bear', hairStyle: 'none', ears: 'round', fur: true, claws: true, armLen: 4, torsoW: 15 }), O({ armor: color, bare: true, legs: shadeHex(color, -0.15), boots: shadeHex(color, -0.3) }), 'none', 'none', 1.1)
    if (type === 'humanoid') return mk(human, O({ armor: color, legs: '#4a3a2a', chest: 'strap', pauldron: 'small' }), r < 0.5 ? 'Sword' : 'Axe', r < 0.3 ? 'Shield' : 'none')
  }
  return null
}

// ---------------------------------------------------------------- czworonogi z nazwy
function quadMob(name: string, type: MobType, color: string): QuadSpec | null {
  const n = name.toLowerCase()
  if (/kolkar|galak|gelkis|magram|centaur/.test(n)) return { col: color, len: 24, h: 10, leg: 10, legW: 3, head: 0, tail: 8, ears: 'none', muzzle: 'short', upper: L(LOOKS.human, { skin: '#9a7a5a', hair: '#2a1a10', horns: 'satyr', torsoW: 8, torsoH: 9, headW: 9, headH: 9 }), upperOutfit: O({ armor: '#9a7a5a', bare: true }) }
  if (type === 'boar') return { col: color, len: 20, h: 9, leg: 6, legW: 3, head: 7, tail: 3, ears: 'pointy', muzzle: 'blunt', tusks: true, mane: shadeHex(color, -0.3), belly: shadeHex(color, 0.15) }
  if (type === 'cat') return { col: color, len: 21, h: 7, leg: 8, legW: 3, head: 6, tail: 10, ears: 'pointy', muzzle: 'short', stripes: /tiger|nightsaber|frostsaber/.test(n) ? shadeHex(color, -0.45) : undefined, spots: /leopard|jaguar|panther/.test(n) && !/panther/.test(n) ? shadeHex(color, -0.5) : undefined, eye: /night|shadow|moon/.test(n) ? '#e8fbff' : '#ffd040' }
  if (type !== 'beast') return null
  if (/bear|ursa|grizzl|owlbeast/.test(n)) return { col: color, len: 25, h: 12, leg: 8, legW: 4, head: 7, tail: 0, ears: 'round', muzzle: /owlbeast/.test(n) ? 'beak' : 'blunt', hump: true, belly: shadeHex(color, -0.2) }
  if (/crocolisk|thresher/.test(n)) return { col: color, len: 28, h: 6, leg: 4, legW: 3, head: 6, tail: 14, tailW: 3, ears: 'none', muzzle: 'croc', spikes: shadeHex(color, -0.3), belly: shadeHex(color, 0.3) }
  if (/basilisk/.test(n)) return { col: color, len: 24, h: 7, leg: 5, legW: 3, head: 6, tail: 10, tailW: 3, ears: 'none', muzzle: 'short', spikes: /glass/.test(n) ? '#e0f8ff' : '#c06040', eye: '#ffd040' }
  if (/tortoise|turtle/.test(n)) return { col: '#6a7a4a', len: 22, h: 9, leg: 4, legW: 4, head: 6, tail: 3, ears: 'none', muzzle: 'short', shell: color }
  if (/stegodon|kodo|thunder/.test(n)) return { col: color, len: 28, h: 12, leg: 9, legW: 4, head: 8, tail: 6, tailW: 3, ears: 'none', muzzle: 'blunt', spikes: shadeHex(color, 0.25), horns: '#e8dcc0', hump: true }
  if (/fel(hound|slayer)/.test(n)) return { col: color, len: 22, h: 9, leg: 8, legW: 3, head: 7, tail: 6, ears: 'pointy', muzzle: 'long', spikes: '#80ff40', eye: '#80ff40' }
  if (/hyena/.test(n)) return { col: color, len: 20, h: 8, leg: 8, legW: 3, head: 7, tail: 5, ears: 'round', muzzle: 'long', spots: shadeHex(color, -0.4), mane: shadeHex(color, -0.3), hump: true }
  // wilki, psy, prowlery
  return { col: color, len: 21, h: 8, leg: 8, legW: 3, head: 7, tail: 7, ears: 'pointy', muzzle: 'long', eye: /diseased|plague/.test(n) ? '#c0ff40' : undefined, belly: shadeHex(color, 0.25) }
}

// ---------------------------------------------------------------- jedno wejście: sprite moba
const BIPED_ANIM: Record<CAnim, Anim> = { idle: 'idle', walk: 'walk', attack: 'attack', hurt: 'hurt', death: 'death' }
const fit = (f: number, from: number, to: number) => Math.min(to - 1, Math.round((f * (to - 1)) / Math.max(1, from - 1)))
const CF: Record<CAnim, number> = { idle: 4, walk: 8, attack: 6, hurt: 4, death: 6 }
export type MobSprite = Sprite & { scale: number; air: boolean }
export function mobSprite(name: string, type: MobType, color: string, anim: CAnim, f: number, darken = 0): MobSprite {
  const key = `${name}|${color}`
  const bm = bipedMob(name, type, color)
  if (bm) {
    const a = BIPED_ANIM[anim]
    const fr = anim === 'idle' ? f * 2 : anim === 'walk' ? f : anim === 'hurt' ? f : fit(f, CF[anim], 8)
    return { ...bipedSprite(`mob|${key}`, bm.spec, a, fr, true, darken), scale: bm.scale ?? 1, air: false }
  }
  const qm = quadMob(name, type, color)
  if (qm) return { ...quadSprite(`mob|${key}`, qm, anim, f, true, darken), scale: 1, air: false }
  const n = name.toLowerCase()
  const C = (build: () => Grid, ox: number, oy: number, scale = 1, air = false): MobSprite => ({ ...creatureSprite(`${key}|${anim}|${f}`, build, ox, oy, true, darken), scale, air })
  switch (type) {
    case 'spider': { const size = /crypt|elder|giant|tarantula/.test(n) ? 6 : 3; return C(() => buildSpider(color, size, anim, f), Math.floor((34 + size * 2) / 2), 22 + size - 3) }
    case 'insect': return C(() => buildScorpid(color, anim, f), 20, 27)
    case 'raptor': return C(() => buildRaptor(color, anim, f, /thrasher|scythemaw/.test(n)), 22, 35, /thrasher/.test(n) ? 1.15 : 1)
    case 'dragon': return C(() => buildWhelp(color, anim, f), 22, 37)
    case 'elemental': {
      const k = /fire|blazing|magma|ember|flame/.test(n) ? 'fire' : /sludge|tar|toxic|ooze|slime/.test(n) ? 'ooze' : /dust|storm|air|wind|cyclon/.test(n) ? 'air' : /lasher|petal|bloom/.test(n) ? 'lasher' : /timber|irontree|warpwood|treant|ancient/.test(n) ? 'tree' : 'rock'
      if (k === 'tree') return { ...bipedSprite(`mob|${key}`, { look: L(LOOKS.tauren, { skin: '#6a4a2a', hair: '#4a8a2a', hairStyle: 'mane', horns: undefined, muzzle: undefined, eye: '#a0ff60', glow: true, ears: undefined, claws: true, hooves: false, torsoW: 14, torsoH: 14 }), outfit: O({ armor: '#6a4a2a', bare: true, legs: '#5a3a1a', boots: '#3a2a10', pauldron: 'mid', pauldronCol: '#4a8a2a' }), weapon: 'none', off: 'none' }, BIPED_ANIM[anim], anim === 'idle' ? f * 2 : anim === 'walk' || anim === 'hurt' ? f : fit(f, CF[anim], 8), true, darken), scale: /irontree/.test(n) ? 1.2 : 1, air: false }
      return C(() => buildElemental(k, color, anim, f), 22, 47, k === 'rock' ? 1.15 : 1)
    }
    case 'flyer': {
      if (/plainstrider|strider/.test(n)) return C(() => buildStrider(color, anim, f), 18, 43)
      const kind = /bat/.test(n) ? 'bat' : /owl/.test(n) ? 'owl' : /pterro/.test(n) ? 'ptero' : /chimaera|hippogryph|stagwing|roc/.test(n) ? 'big' : 'bird'
      const big = kind === 'big' || kind === 'ptero'
      return C(() => buildBird(color, kind, anim, f), big ? 28 : 22, big ? 43 : 37, 1, true)
    }
    default: return { ...quadSprite(`mob|${key}`, quadMob('wolf', 'beast', color)!, anim, f, true, darken), scale: 1, air: false }
  }
}

// ---------------------------------------------------------------- NPC w miastach
export type NpcRole = 'quest' | 'vendor' | 'trainer' | 'guard'
export function npcSprite(role: NpcRole, race: RaceId, cls: ClassId, anim: 'idle' | 'walk', f: number, flip = false): Sprite {
  const look = LOOKS[race]
  let outfit: Outfit, weapon: WeaponKind = 'none', off: OffKind = 'none'
  if (role === 'trainer') { outfit = { ...OUTFITS[cls] }; weapon = cls === 'warrior' || cls === 'paladin' ? 'Sword' : cls === 'hunter' ? 'Bow' : cls === 'rogue' ? 'Dagger' : cls === 'shaman' ? 'Mace' : 'Staff' }
  else if (role === 'vendor') outfit = O({ armor: '#8a6a3a', trim: '#e8dcc0', legs: '#5a4026', chest: 'sash', belt: '#6a3a1a' })
  else if (role === 'guard') { outfit = O({ armor: race === 'human' || race === 'dwarf' || race === 'gnome' || race === 'nightelf' ? '#3a5aa8' : '#8a2a1a', trim: '#d8b040', legs: '#4a4a52', pauldron: 'big', head: 'helm', chest: 'tabard' }); weapon = 'Polearm' }
  else outfit = O({ armor: '#e8dcc0', trim: '#c8a24a', legs: '#6a5a3a', robe: true, chest: 'trimline' })
  return bipedSprite(`npc|${role}|${race}|${cls}`, { look, outfit, weapon, off }, anim, anim === 'idle' ? f : f, flip)
}

// ---------------------------------------------------------------- pupile: zwierzę łowcy, imp, voidwalker
export function petSprite(kind: 'beast' | 'imp' | 'voidwalker', anim: CAnim, f: number): Sprite {
  if (kind === 'beast') return quadSprite('pet|wolf', { col: '#8a6a4a', len: 18, h: 7, leg: 7, legW: 3, head: 6, tail: 6, ears: 'pointy', muzzle: 'long', belly: '#a8885a' }, anim, f)
  const bf = anim === 'idle' ? f * 2 : anim === 'walk' || anim === 'hurt' ? f : fit(f, CF[anim], 8)
  if (kind === 'imp') return bipedSprite('pet|imp', { look: L(LOOKS.gnome, { skin: '#c83a2a', hair: '#c83a2a', hairStyle: 'none', horns: 'demon', ears: 'goblin', tail: '#8a2018', eye: '#ffe060', glow: true, headW: 10, headH: 9 }), outfit: O({ armor: '#c83a2a', bare: true, loin: true, legs: '#4a1a10', magic: '#ff8020' }), weapon: 'none', off: 'none' }, BIPED_ANIM[anim] === 'attack' ? 'cast' : BIPED_ANIM[anim], bf)
  return bipedSprite('pet|void', { look: L(LOOKS.orc, { skin: '#4a3a8a', hair: '#4a3a8a', hairStyle: 'none', tusks: false, eye: '#e8f0ff', glow: true, lower: 'wisp', torsoW: 14, torsoH: 13, headW: 10, headH: 9, armLen: 3 }), outfit: O({ armor: '#4a3a8a', bare: true, glove: '#c8a040', belt: '#c8a040' }), weapon: 'none', off: 'none' }, BIPED_ANIM[anim], bf)
}

// ---------------------------------------------------------------- totem szamana
const TOTEM: Record<string, [string, string]> = { earth: ['#8a6a3a', '#c8a060'], fire: ['#a03a1a', '#ff8a30'], water: ['#2a5a9a', '#7ac8ff'], air: ['#9aa8b8', '#ffffff'] }
export function totemSprite(el: string, f: number): Sprite {
  const [base, glow] = TOTEM[el] ?? TOTEM.earth
  return creatureSprite(`totem|${el}|${f}`, () => {
    const g = new Grid(14, 26), b = hex(base), gl = hex(glow)
    g.box(4, 6, 6, 18, b, 0.25, -0.3)
    g.rect(5, 9, 1, 1, hex('#140c0a')); g.rect(8, 9, 1, 1, hex('#140c0a')); g.rect(5, 12, 4, 1, hex('#140c0a'))
    g.rect(2, 16, 10, 2, hex('#e8d8b0')); g.rect(3, 4, 8, 2, tone(b, -0.3)); g.rect(5, 2 - (f % 2), 4, 2, gl)
    g.rect(4, 23, 6, 2, hex('#3a2a1a'))
    g.outline()
    return g
  }, 7, 25)
}

// ---------------------------------------------------------------- głos moba (klucz w audio/soundmap: mob.<rodzaj>.<attack|wound|death|aggro>)
// Rodzaj z tych samych reguł co wygląd; humanoidy rasowe ("h" + rasa) używają odgłosów graczy tej rasy.
export function mobVoice(name: string, type: MobType): string {
  const n = name.toLowerCase()
  const R: [RegExp, string][] = [
    [/gnoll|hogger|riverpaw|brashclaw|grizlak|garrick|ribchaser/, 'gnoll'], [/quilboar|bristleback|razormane|death's head|sharptusk|thornweaver|thornmantle/, 'quilboar'],
    [/satyr|felsworn|legashi/, 'satyr'], [/kolkar|galak|gelkis|magram|centaur/, 'centaur'], [/troll|bloodscalp|frostmane|skullsplitter|witherbark|vilebranch|gan'zulah|grik'nir/, 'htroll'],
    [/blackrock|dragonmaw|burning blade|\borc|warsong|grunt|gath'ilzogg|nek'rosh|ma'ruk|yarrog/, 'horc'], [/dark iron/, 'hdwarf'], [/furbolg|gnarlpine|blackwood|deadwood|timbermaw|foulweald|ursa/, 'furbolg'],
    [/nightbane|moonrage|worgen/, 'worgen'], [/harpy/, 'harpy'], [/gargoyle/, 'gargoyle'], [/dragonspawn|firemane|dragonkin|wyrmkin/, 'dragonkin'], [/siren|naga|spitelash|daggerspine|lady |lord shalzaru|myrmidon|nazjak|gilmorian/, 'naga'],
    [/kobold/, 'kobold'], [/venture|goblin/, 'goblin'], [/leper gnome|gnome/, 'gnome'], [/familiar|imp\b|grell/, 'imp'], [/skelet|rattlecage|bone/, 'skeleton'], [/ghost|spirit|banshee/, 'ghost'],
    [/zombie|mindless/, 'zombie'], [/harvest/, 'harvestgolem'], [/golem/, 'golem'], [/monstrosity|stitched|abomination/, 'abomination'], [/grimtotem/, 'htauren'], [/ogre|mauler|brute|gordunni|boulderfist|firegut|crushridge|dustbelcher/, 'ogre'],
    [/yeti/, 'yeti'], [/ape|gorilla/, 'ape'], [/bear|grizzl|owlbeast/, 'bear'], [/crocolisk|thresher/, 'croc'], [/basilisk/, 'basilisk'], [/tortoise|turtle/, 'turtle'], [/stegodon|kodo|thunder lizard/, 'kodo'],
    [/fel(hound|slayer)/, 'felhound'], [/hyena/, 'hyena'], [/tiger/, 'tiger'], [/plainstrider|strider/, 'strider'], [/\bbat\b|duskbat/, 'bat'], [/owl/, 'owl'], [/pterro/, 'ptero'], [/chimaera|chimera/, 'chimera'],
    [/hippogryph|stagwing|roc\b/, 'hippogryph'], [/vulture|buzzard|fleshripper|carrion/, 'vulture'], [/whelp/, 'whelp'], [/fire|blazing|magma|ember|flame/, 'fire'], [/sludge|tar |toxic|ooze|slime/, 'ooze'],
    [/dust|storm|air|wind|cyclon/, 'air'], [/lasher|petal|bloom/, 'lasher'], [/timber|irontree|warpwood|treant|ancient/, 'treant'], [/rock|rumbler|stone|earth|boulder/, 'earth'],
  ]
  for (const [re, v] of R) if (re.test(n)) return v
  const T: Record<MobType, string> = { beast: 'canine', cat: 'cat', boar: 'boar', raptor: 'raptor', spider: 'spider', insect: 'scorpid', flyer: 'vulture', murloc: 'murloc', undead: 'ghoul',
    elemental: 'earth', dragon: 'whelp', giant: 'ogre', small: 'kobold', humanoid: 'hhuman' }
  return T[type]
}
// materiał trafienia (dźwięk uderzenia bronią w tego moba)
export function mobMaterial(name: string, type: MobType): 'flesh' | 'chain' | 'plate' | 'stone' | 'wood' {
  const v = mobVoice(name, type)
  if (v === 'skeleton') return 'wood'
  if (v === 'golem' || v === 'harvestgolem' || v === 'earth') return 'stone'
  if (v === 'treant' || v === 'lasher') return 'wood'
  if (v === 'horc' || v === 'hdwarf' || /soldier|guard|grunt|footman|mercenary|warder/.test(name.toLowerCase())) return 'chain'
  return 'flesh'
}
// broń moba (dźwięk, gdy trafia bohatera): dwunogi z bronią albo pazury / kły różnej wielkości
export function mobStrike(name: string, type: MobType): { weapon: string } | { claw: 'small' | 'medium' | 'large' } {
  const bm = bipedMob(name, type, '#808080')
  const w = bm?.spec.weapon
  const W: Record<string, string> = { Sword: 'sword1h', Greatsword: 'sword2h', Axe: 'axe1h', Greataxe: 'axe2h', Mace: 'mace1h', Maul: 'mace2h', Club: 'mace1h', Staff: 'mace2h', Polearm: 'axe2h', Spear: 'axe2h', Pick: 'axe1h', Dagger: 'dagger' }
  if (w && W[w]) return { weapon: W[w] }
  const v = mobVoice(name, type)
  const large = ['bear', 'ogre', 'yeti', 'ape', 'golem', 'abomination', 'kodo', 'earth', 'treant', 'croc'].includes(v)
  const small = ['kobold', 'murloc', 'bat', 'vulture', 'owl', 'whelp', 'spider', 'imp', 'gnome', 'goblin'].includes(v)
  return { claw: large ? 'large' : small ? 'small' : 'medium' }
}
