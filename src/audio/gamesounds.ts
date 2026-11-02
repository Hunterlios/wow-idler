// Zdarzenia gry → dźwięki (walka, czary, łup, zadania, poziom, śmierć) oraz muzyka i ambient zależne od miejsca.
import type { GameEvent, GameState } from '../game/types'
import { classById } from '../data/classes'
import { currentZone, heroInMelee } from '../game/sim'
import { raceById } from '../data/races'
import { mobVoice, mobMaterial, mobStrike } from '../render/mobsprites'
import { play, music, ambience, hasSound } from './sound'

const WEAPON_DIR: Record<string, string> = { Sword: 'sword1h', Greatsword: 'sword2h', Axe: 'axe1h', Greataxe: 'axe2h', Mace: 'mace1h', Maul: 'mace2h', Staff: 'mace2h', Polearm: 'axe2h', Dagger: 'dagger', 'Fist Weapon': 'unarmed', Wand: 'mace1h', Thrown: 'dagger' }
const TWO_HAND = new Set(['sword2h', 'axe2h', 'mace2h'])
const chance = (p: number) => Math.random() < p
const first = (...keys: string[]) => keys.find((k) => hasSound(k))

function heroWeapon(s: GameState) {
  const h = s.hero
  const shooting = h.cls === 'hunter' && !!h.equip.ranged && !(s.phase === 'fight' && heroInMelee(s))
  if (shooting) return { ranged: h.equip.ranged?.weaponType ?? 'Bow', dir: '' }
  const t = h.equip.mainhand?.weaponType
  return { ranged: '', dir: (t && WEAPON_DIR[t]) || 'unarmed' }
}
function heroArmorMat(s: GameState) {
  const a = classById(s.hero.cls).armor(s.hero.level)
  return a === 'plate' ? 'plate' : a === 'mail' ? 'chain' : 'flesh'
}
const voice = (s: GameState, k: string, gap = 900, p = 1) => { if (chance(p)) play(`voice.${s.hero.race}.${k}`, { bus: 'voice', gap }) }
function abilityId(s: GameState, name?: string) {
  if (!name) return null
  return classById(s.hero.cls).abilities.find((a) => a.name === name)?.id ?? null
}
const mobKey = (s: GameState, k: string) => s.mob ? `mob.${mobVoice(s.mob.name, s.mob.type)}.${k}` : ''

let lastMob: { name: string; type: import('../data/zones').MobType } | null = null
export function onGameEvent(e: GameEvent, s: GameState) {
  if (s.mob) lastMob = { name: s.mob.name, type: s.mob.type }
  switch (e.t) {
    case 'dmg': {
      if (e.src === 'hero') {
        const w = heroWeapon(s)
        if (e.miss) {
          if (e.miss === 'parry') play(TWO_HAND.has(w.dir) ? 'parry.2h' : 'parry', { gap: 120 })
          else if (!e.school || e.school === 'physical') play(TWO_HAND.has(w.dir) ? 'miss.2h' : 'miss.1h', { gap: 120 })
          break
        }
        const id = abilityId(s, e.ability)
        // DoT / zaklęcie: uderzenie wg szkoły (konkretny dźwięk czaru gra przy rzuceniu)
        if (e.school && e.school !== 'physical') { play(`impact.${e.school}`, { gap: 250, vol: 0.8 }); break }
        if (id && hasSound(`spell.${id}`) && e.ability && !s.mob?.dots.some((d) => d.name === e.ability)) { play(`spell.${id}`, { gap: 150 }); voice(s, 'attack', 1500, 0.35); break }
        if (w.ranged) { play('arrow.hit', { gap: 120, vol: 0.8 }); break }
        const mat = s.mob ? mobMaterial(s.mob.name, s.mob.type) : 'flesh'
        const key = first(`hit.${w.dir}.${mat}${e.crit ? '.crit' : ''}`, `hit.${w.dir}.flesh${e.crit ? '.crit' : ''}`, `hit.${w.dir}.flesh`)
        if (key) play(key, { gap: 80 })
        play(`swing.${TWO_HAND.has(w.dir) ? 'large' : w.dir === 'dagger' || w.dir === 'unarmed' ? 'small' : 'medium'}${e.crit ? '.crit' : ''}`, { gap: 80, vol: 0.6 })
        if (e.crit) voice(s, 'attack', 1200); else voice(s, 'attack', 2500, 0.15)
        if (s.mob && chance(0.25)) play(mobKey(s, 'wound'), { bus: 'voice', gap: 1200, vol: 0.8 })
      } else if (e.src === 'mob') {
        if (e.miss === 'absorb') { play('shield.absorb', { gap: 300 }); break }
        if (e.miss) { play(e.miss === 'parry' ? 'parry' : 'miss.1h', { gap: 150, vol: 0.7 }); break }
        if (!s.mob) break
        if (chance(0.4)) play(mobKey(s, 'attack'), { bus: 'voice', gap: 900, vol: 0.8 })
        const st = mobStrike(s.mob.name, s.mob.type)
        const mat = heroArmorMat(s)
        if ('weapon' in st) { const k = first(`hit.${st.weapon}.${mat}${e.crit ? '.crit' : ''}`, `hit.${st.weapon}.flesh`); if (k) play(k, { gap: 100, vol: 0.85 }) }
        else play(`claw.${st.claw}${e.crit ? '.crit' : ''}`, { gap: 100, vol: 0.85 })
        if (e.crit) voice(s, 'crit', 1000); else voice(s, 'wound', 2200, 0.3)
      } else if (e.src === 'pet' && !e.miss) play('claw.small', { gap: 200, vol: 0.6 })
      break
    }
    case 'heal': play(e.amt > 400 ? 'heal.big' : 'heal', { gap: 600, vol: 0.8 }); break
    case 'cast': {
      const id = abilityId(s, e.ability)
      const a = id ? classById(s.hero.cls).abilities.find((x) => x.id === id) : null
      if (a?.kind === 'totem') { play('totem.drop', { gap: 300 }); break }
      if (a?.kind === 'form') { play(first(`spell.${id}`, 'form.shift') ?? 'form.shift', { gap: 300 }); break }
      if (id && hasSound(`spell.${id}`) && (e.school && e.school !== 'physical' || a?.kind !== 'strike')) play(`spell.${id}`, { gap: 200 })
      else if (e.school && e.school !== 'physical') play(`precast.${e.school}`, { gap: 300, vol: 0.7 })
      if (s.hero.cls === 'hunter' && e.kind !== 'spell' && !heroInMelee(s)) play(s.hero.equip.ranged?.weaponType === 'Gun' ? 'gun.fire' : 'bow.release', { gap: 200, vol: 0.8 })
      break
    }
    case 'racial': {
      if (/Blood Fury|Berserking/.test(e.name)) voice(s, 'roar', 3000)
      else if (/War Stomp/.test(e.name)) play('stun', { gap: 500 })
      else play('precast.arcane', { gap: 500 })
      break
    }
    case 'interrupt': play('fizzle.fire', { gap: 500 }); break
    case 'kill': case 'subkill': {
      const m = s.mob ?? lastMob
      if (m) play(`mob.${mobVoice(m.name, m.type)}.death`, { bus: 'voice', gap: 200 })
      break
    }
    case 'spawn': {
      if (e.boss) play('ui.boss', { bus: 'ui', gap: 3000, vol: 0.7 })
      setTimeout(() => { if (s.mob) play(mobKey(s, 'aggro'), { bus: 'voice', gap: 1500, vol: 0.8 }) }, 50)
      break
    }
    case 'loot': {
      const r = e.item.rarity
      play(r >= 5 ? 'ui.lootlegend' : r >= 4 ? 'ui.lootrare' : r >= 3 ? 'ui.lootrare' : 'ui.loot', { bus: 'ui', gap: 250, vol: r >= 3 ? 0.9 : 0.6 })
      break
    }
    case 'gold': play(e.amt >= 100 ? 'ui.coinsbig' : 'ui.coins', { bus: 'ui', gap: 300, vol: 0.6 }); break
    case 'bagsfull': play(`voice.${s.hero.race}.err.bagfull`, { bus: 'voice', gap: 30000 }); break
    case 'level': play('ui.levelup', { bus: 'ui', gap: 1000 }); voice(s, 'cheer', 1000, 0.6); break
    case 'death': play(`voice.${s.hero.race}.death`, { bus: 'voice', gap: 1000 }); break
    case 'revive': play('ui.revive', { bus: 'ui', gap: 1000 }); break
    case 'zone': play(`ui.explore.${s.hero.race}`, { bus: 'ui', gap: 3000 }); break
    case 'cleared': play(e.zoneBoss ? 'ui.zoneboss' : 'ui.cleared', { bus: 'ui', gap: 1000 }); break
    case 'questprog': play('ui.questprog', { bus: 'ui', gap: 1500, vol: 0.6 }); break
    case 'questdone': play('ui.questdone', { bus: 'ui', gap: 800 }); break
    case 'totem': play('totem.drop', { gap: 300 }); break
  }
}

// Muzyka i ambient wg miejsca: stolica, miasto, strefa (biom), duch po śmierci, rejs, lot zeppelinem
const CAPITAL_MUSIC: Record<string, string> = { Stormwind: 'stormwind', Ironforge: 'ironforge', Darnassus: 'darnassus', Orgrimmar: 'orgrimmar', 'Thunder Bluff': 'thunderbluff', Undercity: 'undercity' }
let lastPhase = ''
export function updateLoops(s: GameState) {
  const z = currentZone(s)
  let m: string | null = null, a: string | null = null
  if (s.phase === 'dead') { m = 'music.ghost'; a = 'amb.ghost' }
  else if (s.phase === 'travel' && s.trip?.kind === 'ship') { m = `music.coast`; a = 'amb.sea' }
  else if (s.phase === 'travel' && s.trip?.kind === 'zeppelin') { m = `music.mountain`; a = 'amb.air' }
  else if (s.where === 'capital') {
    const city = CAPITAL_MUSIC[raceById(s.hero.race).start.capital]
    m = city ? `music.city.${city}` : `music.town.${s.hero.race}`; a = `amb.${z.biome}`
  } else if (s.where === 'town') { m = `music.town.${s.hero.race}`; a = `amb.${z.biome}` }
  else { m = `music.${z.biome}`; a = `amb.${z.biome}` }
  music(m && hasSound(m) ? m : null)
  ambience(a && hasSound(a) ? a : null)
  // jedzenie / picie przy odpoczynku
  if (s.phase === 'rest' && lastPhase !== 'rest') { play('ui.eat', { bus: 'sfx', gap: 2000, vol: 0.7 }); setTimeout(() => play('ui.drink', { gap: 2000, vol: 0.6 }), 1200) }
  lastPhase = s.phase
}

// Interfejs: otwieranie / zamykanie okien, przyciski, przenoszenie przedmiotów
export const uiOpen = (panel: string, open: boolean) => play(`ui.${open ? 'open' : 'close'}.${panel}`, { bus: 'ui', gap: 80 })
export const uiClick = () => play('ui.click', { bus: 'ui', gap: 60, vol: 0.7 })
export const uiMicro = () => play('ui.micro', { bus: 'ui', gap: 60, vol: 0.8 })
// materiał przedmiotu → dźwięk podniesienia / odłożenia
export function itemMat(it: { slot?: string; weaponType?: string; armorType?: string; food?: { kind: string }; quest?: string; bagSize?: number; kit?: number; rarity: number }) {
  if (it.bagSize) return 'bag'
  if (it.food) return it.food.kind === 'drink' ? 'water' : 'food'
  if (it.quest) return 'parchment'
  if (it.kit) return 'metalsmall'
  if (it.weaponType) return ['Staff', 'Bow', 'Polearm', 'Crossbow'].includes(it.weaponType) ? 'woodlarge' : it.weaponType === 'Wand' ? 'wand' : ['Greatsword', 'Greataxe', 'Maul', 'Shield'].includes(it.weaponType) ? 'metallarge' : 'metalsmall'
  if (it.slot === 'finger' || it.slot === 'neck' || it.slot === 'trinket') return 'ring'
  if (it.armorType === 'plate' || it.armorType === 'mail') return it.slot === 'chest' || it.slot === 'legs' ? 'largechain' : 'smallchain'
  if (it.slot) return 'cloth'
  return 'meat'
}
export const itemPick = (it: Parameters<typeof itemMat>[0]) => play(`pick.${itemMat(it)}`, { bus: 'ui', gap: 60 })
export const itemDrop = (it: Parameters<typeof itemMat>[0]) => play(`drop.${itemMat(it)}`, { bus: 'ui', gap: 60 })
export const uiSound = (key: string, gap = 200) => play(key, { bus: 'ui', gap })
export const npcGreet = (race: string) => { play(hasSound(`npc.${race}.greet`) ? `npc.${race}.greet` : `voice.${race}.hello`, { bus: 'voice', gap: 4000 }) }
