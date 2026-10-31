// Ikony rysowane proceduralnie na canvasie (własne, w klimacie Classica): przedmioty i umiejętności.
// Wynik cache'owany jako dataURL.
import type { Ability, School } from '../data/classes'
import type { Item } from '../game/types'

const S = 64
const cache = new Map<string, string>()

function canvas() {
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  return c.getContext('2d')!
}

const TIER_CLOTH = ['#cbb68c', '#9c8a66', '#b8566e', '#7a56b8', '#4a74c8']
const MAT: Record<string, string> = { leather: '#8a5a32', mail: '#8d9aab', plate: '#c9ced8' }
const GEM = ['#9d9d9d', '#e8e8e8', '#3cd04a', '#3a8aff', '#c04aff']
const SCHOOL_BG: Record<School, [string, string]> = {
  physical: ['#8a6a4a', '#2a1a10'], fire: ['#ff9a2a', '#5a1000'], frost: ['#a8e4ff', '#0a2a5a'], arcane: ['#ff9af0', '#3a0a5a'],
  shadow: ['#a070ff', '#12002a'], holy: ['#fff0a0', '#6a4a00'], nature: ['#9aff6a', '#0a3a10'],
}

function bg(g: CanvasRenderingContext2D, a = '#3a3020', b = '#0c0a06') {
  const r = g.createRadialGradient(S / 2, S / 2.4, 4, S / 2, S / 2, S * 0.75)
  r.addColorStop(0, a)
  r.addColorStop(1, b)
  g.fillStyle = r
  g.fillRect(0, 0, S, S)
}
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)))
  return `#${((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`
}
function fillShape(g: CanvasRenderingContext2D, color: string, path: () => void, x0 = 16, y0 = 10, x1 = 48, y1 = 56) {
  const lg = g.createLinearGradient(x0, y0, x1, y1)
  lg.addColorStop(0, shade(color, 0.45))
  lg.addColorStop(0.5, color)
  lg.addColorStop(1, shade(color, -0.55))
  g.beginPath()
  path()
  g.fillStyle = lg
  g.fill()
  g.lineWidth = 2
  g.strokeStyle = 'rgba(0,0,0,.75)'
  g.stroke()
}
function gem(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const rg = g.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r)
  rg.addColorStop(0, '#fff')
  rg.addColorStop(0.35, color)
  rg.addColorStop(1, shade(color, -0.6))
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = rg; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke()
}
function frame(g: CanvasRenderingContext2D) {
  // bevel jak w ikonach z gry
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.strokeRect(2, 2, S - 4, S - 4)
  g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 3; g.strokeRect(0.5, 0.5, S - 1, S - 1)
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)')
  g.fillStyle = v; g.fillRect(0, 0, S, S)
}

// ---------------------------------------------------------------- przedmioty
function drawWeapon(g: CanvasRenderingContext2D, wt: string, gemColor: string) {
  const steel = '#c8ced8', wood = '#7a4a22', gold = '#d4a838'
  g.save()
  g.translate(S / 2, S / 2)
  switch (wt) {
    case 'Sword': case 'Greatsword': case 'Dagger': {
      const len = wt === 'Dagger' ? 22 : wt === 'Greatsword' ? 34 : 28
      g.rotate(-Math.PI / 4)
      fillShape(g, steel, () => { g.moveTo(-3.5, 8); g.lineTo(-3.5, -len + 6); g.lineTo(0, -len); g.lineTo(3.5, -len + 6); g.lineTo(3.5, 8); g.closePath() }, -4, -len, 4, 8)
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-0.5, -len + 6, 1, len - 6)
      fillShape(g, gold, () => { g.rect(-10, 8, 20, 4) }, -10, 8, 10, 12)
      fillShape(g, wood, () => { g.rect(-2.5, 12, 5, 12) }, -3, 12, 3, 24)
      gem(g, 0, 26, 3.5, gemColor)
      break
    }
    case 'Axe': case 'Greataxe': {
      g.rotate(-Math.PI / 5)
      fillShape(g, wood, () => { g.rect(-2.5, -22, 5, 46) }, -3, -22, 3, 24)
      fillShape(g, steel, () => { g.moveTo(2, -20); g.quadraticCurveTo(22, -24, 20, -6); g.quadraticCurveTo(16, 0, 2, -4); g.closePath() }, 2, -24, 22, 0)
      if (wt === 'Greataxe') fillShape(g, steel, () => { g.moveTo(-2, -20); g.quadraticCurveTo(-22, -24, -20, -6); g.quadraticCurveTo(-16, 0, -2, -4); g.closePath() }, -22, -24, -2, 0)
      gem(g, 0, -12, 3, gemColor)
      break
    }
    case 'Mace': case 'Maul': {
      g.rotate(-Math.PI / 4)
      fillShape(g, wood, () => { g.rect(-2.5, -8, 5, 32) }, -3, -8, 3, 24)
      const w = wt === 'Maul' ? 16 : 11
      fillShape(g, steel, () => { g.roundRect(-w, -24, w * 2, 18, 4) }, -w, -24, w, -6)
      for (let i = -1; i <= 1; i++) { g.fillStyle = shade(steel, -0.3); g.fillRect(i * 7 - 1.5, -28, 3, 5) }
      gem(g, 0, -15, 3.5, gemColor)
      break
    }
    case 'Staff': {
      g.rotate(-Math.PI / 5)
      fillShape(g, wood, () => { g.rect(-2.5, -20, 5, 46) }, -3, -20, 3, 26)
      g.strokeStyle = gold; g.lineWidth = 2.5; g.beginPath(); g.arc(0, -24, 7, Math.PI * 0.1, Math.PI * 0.9, true); g.stroke()
      gem(g, 0, -25, 5.5, gemColor)
      break
    }
    case 'Bow': {
      g.rotate(-Math.PI / 4)
      g.strokeStyle = '#000'; g.lineWidth = 6; g.beginPath(); g.arc(-14, 0, 26, -Math.PI / 2.6, Math.PI / 2.6); g.stroke()
      g.strokeStyle = wood; g.lineWidth = 4; g.beginPath(); g.arc(-14, 0, 26, -Math.PI / 2.6, Math.PI / 2.6); g.stroke()
      g.strokeStyle = '#ddd'; g.lineWidth = 1; g.beginPath(); g.moveTo(-14 + 26 * Math.cos(Math.PI / 2.6), -26 * Math.sin(Math.PI / 2.6)); g.lineTo(-14 + 26 * Math.cos(Math.PI / 2.6), 26 * Math.sin(Math.PI / 2.6)); g.stroke()
      gem(g, 12, 0, 3, gemColor)
      break
    }
    case 'Gun': {
      g.rotate(-Math.PI / 8)
      fillShape(g, steel, () => { g.rect(-22, -8, 36, 6) }, -22, -8, 14, -2)
      fillShape(g, wood, () => { g.moveTo(10, -9); g.lineTo(24, -6); g.lineTo(24, 10); g.lineTo(14, 8); g.lineTo(8, -2); g.closePath() }, 8, -9, 24, 10)
      gem(g, 4, -5, 2.5, gemColor)
      break
    }
    case 'Crossbow': {
      fillShape(g, wood, () => { g.rect(-4, -20, 8, 40) }, -4, -20, 4, 20)
      g.strokeStyle = '#000'; g.lineWidth = 5; g.beginPath(); g.moveTo(-22, -6); g.quadraticCurveTo(0, -18, 22, -6); g.stroke()
      g.strokeStyle = steel; g.lineWidth = 3; g.beginPath(); g.moveTo(-22, -6); g.quadraticCurveTo(0, -18, 22, -6); g.stroke()
      gem(g, 0, 8, 3, gemColor)
      break
    }
    case 'Wand': {
      g.rotate(-Math.PI / 4)
      fillShape(g, '#5a3a6a', () => { g.rect(-2, -10, 4, 34) }, -2, -10, 2, 24)
      gem(g, 0, -15, 6, gemColor)
      g.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 5; i++) g.fillRect(Math.cos(i * 1.3) * 11 - 1, -15 + Math.sin(i * 1.3) * 11 - 1, 2, 2)
      break
    }
    case 'Thrown': {
      for (let i = -1; i <= 1; i++) { g.save(); g.rotate(i * 0.5 - 0.6); fillShape(g, steel, () => { g.moveTo(-2, 14); g.lineTo(0, -18); g.lineTo(2, 14); g.closePath() }, -2, -18, 2, 14); g.restore() }
      break
    }
    case 'Shield': {
      fillShape(g, '#8a2a2a', () => { g.moveTo(-18, -20); g.lineTo(18, -20); g.lineTo(18, 0); g.quadraticCurveTo(16, 18, 0, 24); g.quadraticCurveTo(-16, 18, -18, 0); g.closePath() }, -18, -20, 18, 24)
      g.strokeStyle = steel; g.lineWidth = 3; g.stroke()
      fillShape(g, steel, () => { g.arc(0, -2, 6, 0, Math.PI * 2) }, -6, -8, 6, 4)
      gem(g, 0, -2, 3, gemColor)
      break
    }
    case 'Orb': default: {
      const rg = g.createRadialGradient(-6, -8, 2, 0, 0, 20)
      rg.addColorStop(0, '#fff'); rg.addColorStop(0.3, gemColor); rg.addColorStop(1, '#0a0a20')
      g.beginPath(); g.arc(0, -2, 18, 0, Math.PI * 2); g.fillStyle = rg; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke()
      fillShape(g, gold, () => { g.moveTo(-14, 12); g.lineTo(14, 12); g.lineTo(8, 22); g.lineTo(-8, 22); g.closePath() }, -14, 12, 14, 22)
    }
  }
  g.restore()
}

function drawArmor(g: CanvasRenderingContext2D, slot: string, color: string, gemColor: string) {
  const c = color
  switch (slot) {
    case 'head':
      fillShape(g, c, () => { g.moveTo(14, 40); g.quadraticCurveTo(14, 10, 32, 10); g.quadraticCurveTo(50, 10, 50, 40); g.lineTo(44, 50); g.lineTo(20, 50); g.closePath() })
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(22, 32, 20, 6); g.fillRect(30, 32, 4, 16)
      gem(g, 32, 20, 3.5, gemColor)
      break
    case 'shoulder':
      fillShape(g, c, () => { g.ellipse(20, 32, 14, 12, -0.3, 0, Math.PI * 2) })
      fillShape(g, c, () => { g.ellipse(44, 32, 14, 12, 0.3, 0, Math.PI * 2) })
      gem(g, 20, 30, 3, gemColor); gem(g, 44, 30, 3, gemColor)
      break
    case 'chest':
      fillShape(g, c, () => { g.moveTo(18, 12); g.lineTo(26, 16); g.lineTo(38, 16); g.lineTo(46, 12); g.lineTo(56, 22); g.lineTo(48, 30); g.lineTo(46, 54); g.lineTo(18, 54); g.lineTo(16, 30); g.lineTo(8, 22); g.closePath() })
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(32, 18); g.lineTo(32, 52); g.stroke()
      gem(g, 32, 26, 3.5, gemColor)
      break
    case 'wrist':
      fillShape(g, c, () => { g.roundRect(14, 22, 36, 20, 6) })
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(14, 30, 36, 3)
      gem(g, 32, 32, 3, gemColor)
      break
    case 'hands':
      fillShape(g, c, () => { g.moveTo(20, 54); g.lineTo(20, 30); g.lineTo(22, 14); g.lineTo(27, 14); g.lineTo(28, 28); g.lineTo(30, 10); g.lineTo(35, 10); g.lineTo(36, 28); g.lineTo(38, 12); g.lineTo(43, 13); g.lineTo(43, 32); g.lineTo(50, 24); g.lineTo(53, 28); g.lineTo(44, 44); g.lineTo(42, 54); g.closePath() })
      break
    case 'waist':
      fillShape(g, c, () => { g.roundRect(6, 26, 52, 12, 3) })
      fillShape(g, '#d4a838', () => { g.rect(26, 23, 12, 18) })
      gem(g, 32, 32, 3, gemColor)
      break
    case 'legs':
      fillShape(g, c, () => { g.moveTo(18, 10); g.lineTo(46, 10); g.lineTo(48, 56); g.lineTo(36, 56); g.lineTo(32, 26); g.lineTo(28, 56); g.lineTo(16, 56); g.closePath() })
      break
    case 'feet':
      fillShape(g, c, () => { g.moveTo(24, 10); g.lineTo(38, 10); g.lineTo(38, 38); g.lineTo(54, 44); g.lineTo(54, 54); g.lineTo(22, 54); g.closePath() })
      break
    case 'back':
      fillShape(g, c, () => { g.moveTo(22, 10); g.lineTo(42, 10); g.quadraticCurveTo(56, 40, 52, 56); g.lineTo(12, 56); g.quadraticCurveTo(8, 40, 22, 10); g.closePath() })
      gem(g, 32, 14, 3.5, gemColor)
      break
    case 'neck':
      g.strokeStyle = '#d4a838'; g.lineWidth = 3; g.beginPath(); g.arc(32, 22, 16, 0.2, Math.PI - 0.2); g.stroke()
      gem(g, 32, 42, 8, gemColor)
      break
    case 'finger':
      g.strokeStyle = '#000'; g.lineWidth = 8; g.beginPath(); g.ellipse(32, 38, 15, 11, 0, 0, Math.PI * 2); g.stroke()
      g.strokeStyle = '#d4a838'; g.lineWidth = 5; g.beginPath(); g.ellipse(32, 38, 15, 11, 0, 0, Math.PI * 2); g.stroke()
      gem(g, 32, 24, 7, gemColor)
      break
    case 'trinket':
      fillShape(g, '#8a7a5a', () => { g.moveTo(32, 8); g.lineTo(50, 30); g.lineTo(32, 56); g.lineTo(14, 30); g.closePath() })
      gem(g, 32, 31, 8, gemColor)
      break
    case 'shirt': case 'tabard':
      fillShape(g, '#d8d0bc', () => { g.moveTo(18, 12); g.lineTo(46, 12); g.lineTo(56, 24); g.lineTo(48, 30); g.lineTo(46, 54); g.lineTo(18, 54); g.lineTo(16, 30); g.lineTo(8, 24); g.closePath() })
      break
  }
}

function drawJunk(g: CanvasRenderingContext2D, name: string, rarityColor: string) {
  const n = name.toLowerCase()
  if (/fang|claw|tusk|talon|tooth|toenail|stinger|beak/.test(n)) {
    fillShape(g, '#e8dcc0', () => { g.moveTo(22, 12); g.quadraticCurveTo(46, 20, 42, 54); g.quadraticCurveTo(30, 34, 22, 12) })
  } else if (/pelt|hide|fur/.test(n)) {
    fillShape(g, '#8a6a4a', () => { g.moveTo(14, 16); g.lineTo(50, 14); g.lineTo(54, 30); g.lineTo(46, 52); g.lineTo(20, 54); g.lineTo(10, 34); g.closePath() })
  } else if (/bone|rib/.test(n)) {
    fillShape(g, '#e8e2cc', () => { g.roundRect(14, 28, 36, 8, 4); g.arc(14, 28, 5, 0, 7); g.arc(14, 36, 5, 0, 7); g.arc(50, 28, 5, 0, 7); g.arc(50, 36, 5, 0, 7) })
  } else if (/candle/.test(n)) {
    fillShape(g, '#f0e8c8', () => { g.rect(26, 22, 12, 32) }); g.fillStyle = '#ffb030'; g.beginPath(); g.ellipse(32, 16, 4, 7, 0, 0, 7); g.fill()
  } else if (/scale|fin|carapace|chitin/.test(n)) {
    fillShape(g, '#4a8a7a', () => { g.moveTo(32, 10); g.quadraticCurveTo(54, 30, 32, 54); g.quadraticCurveTo(10, 30, 32, 10) })
  } else if (/shard|dust|core|pearl/.test(n)) {
    fillShape(g, '#8ab0d8', () => { g.moveTo(32, 8); g.lineTo(44, 30); g.lineTo(32, 56); g.lineTo(20, 30); g.closePath() })
  } else if (/feather/.test(n)) {
    fillShape(g, '#c8b89a', () => { g.moveTo(16, 54); g.quadraticCurveTo(20, 10, 50, 10); g.quadraticCurveTo(40, 40, 16, 54) })
  } else if (/gear/.test(n)) {
    g.fillStyle = '#9a9aa2'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 20 : 15; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r) } g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#222'; g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fill()
  } else if (/leg|venom|sac|flesh|slime/.test(n)) {
    fillShape(g, '#6a8a3a', () => { g.ellipse(32, 34, 16, 18, 0, 0, 7) })
  } else {
    fillShape(g, '#b8a888', () => { g.moveTo(14, 18); g.lineTo(50, 14); g.lineTo(48, 50); g.lineTo(16, 52); g.closePath() })
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(20, 26); g.lineTo(42, 24); g.moveTo(20, 34); g.lineTo(40, 33); g.stroke()
  }
  void rarityColor
}

export function itemIcon(it: Item): string {
  const key = `${it.slot}|${it.weaponType}|${it.armorType}|${it.rarity}|${it.ilvl >> 3}|${it.bagSize ?? 0}|${it.slot ? '' : it.name}`
  const hit = cache.get(key)
  if (hit) return hit
  const g = canvas()
  bg(g)
  const gc = GEM[it.rarity]
  if (it.bagSize) {
    fillShape(g, '#8a6a3a', () => { g.moveTo(16, 24); g.quadraticCurveTo(12, 56, 32, 56); g.quadraticCurveTo(52, 56, 48, 24); g.closePath() })
    g.strokeStyle = '#d4a838'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(18, 24); g.lineTo(46, 24); g.stroke()
    fillShape(g, '#6a4a2a', () => { g.moveTo(24, 24); g.lineTo(28, 10); g.lineTo(36, 10); g.lineTo(40, 24); g.closePath() })
  } else if (!it.slot) drawJunk(g, it.name, gc)
  else if (it.weaponType) drawWeapon(g, it.weaponType, gc)
  else {
    const t = Math.min(4, Math.floor(it.ilvl / 12))
    const color = it.armorType === 'cloth' ? TIER_CLOTH[t] : it.armorType ? MAT[it.armorType] : '#8a7a9a'
    drawArmor(g, it.slot, color, gc)
  }
  frame(g)
  const url = g.canvas.toDataURL()
  cache.set(key, url)
  return url
}

// ---------------------------------------------------------------- umiejętności
const GLYPH: Record<string, string> = {
  heroic_strike: 'sword', rend: 'drops', thunder_clap: 'ring', overpower: 'sword', execute: 'axe', battle_shout: 'horn',
  devotion_aura: 'aura', seal_righteousness: 'sun', holy_light: 'sun', blessing_might: 'fist', judgement: 'hammer', hammer_justice: 'hammer', exorcism: 'sun',
  raptor_strike: 'claw', hunters_mark: 'target', serpent_sting: 'snake', arcane_shot: 'arrow', concussive_shot: 'arrow', multi_shot: 'arrows',
  sinister_strike: 'dagger', eviscerate: 'dagger', backstab: 'dagger', gouge: 'stars', evasion: 'wind', slice_dice: 'dagger',
  pw_fortitude: 'fist', smite: 'sun', lesser_heal: 'cross', sw_pain: 'skull', pw_shield: 'bubble', renew: 'cross', mind_blast: 'skull',
  rockbiter: 'rock', lightning_bolt: 'bolt', healing_wave: 'wave', earth_shock: 'rock', flame_shock: 'flame', searing_totem: 'totem',
  frost_armor: 'flake', arcane_intellect: 'star', fireball: 'flame', frostbolt: 'flake', fire_blast: 'flame', arcane_missiles: 'star', frost_nova: 'flake',
  demon_skin: 'skull', shadow_bolt: 'orb', immolate: 'flame', corruption: 'swirl', life_tap: 'drops', curse_agony: 'skull',
  mark_wild: 'paw', wrath: 'leaf', healing_touch: 'leaf', moonfire: 'moon', rejuvenation: 'leaf', entangling_roots: 'leaf', starfire: 'star',
}

function glyph(g: CanvasRenderingContext2D, kind: string, col: string) {
  g.save()
  g.translate(32, 32)
  g.fillStyle = col
  g.strokeStyle = col
  g.lineWidth = 4
  g.shadowColor = col
  g.shadowBlur = 10
  const P = (pts: number[][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill() }
  switch (kind) {
    case 'sword': g.rotate(-Math.PI / 4); P([[-3, 14], [-3, -18], [0, -24], [3, -18], [3, 14]]); g.fillRect(-10, 12, 20, 4); g.fillRect(-2, 16, 4, 10); break
    case 'axe': g.rotate(-0.6); g.fillRect(-2, -20, 4, 44); P([[2, -20], [20, -24], [18, -2], [2, -6]]); break
    case 'dagger': g.rotate(-Math.PI / 4); P([[-3, 8], [-2, -16], [0, -22], [2, -16], [3, 8]]); g.fillRect(-8, 8, 16, 3); g.fillRect(-2, 11, 4, 9); break
    case 'hammer': g.rotate(-0.6); g.fillRect(-2, -10, 4, 34); g.fillRect(-12, -22, 24, 13); break
    case 'flame': g.beginPath(); g.moveTo(0, 22); g.quadraticCurveTo(-20, 10, -8, -10); g.quadraticCurveTo(-6, 0, 0, -24); g.quadraticCurveTo(8, -6, 10, -10); g.quadraticCurveTo(20, 10, 0, 22); g.fill(); g.fillStyle = '#fff6a0'; g.beginPath(); g.ellipse(0, 10, 5, 8, 0, 0, 7); g.fill(); break
    case 'flake': for (let i = 0; i < 6; i++) { g.save(); g.rotate((i * Math.PI) / 3); g.fillRect(-1.5, -22, 3, 22); g.fillRect(-6, -16, 12, 2.5); g.restore() } break
    case 'star': P(Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 ? 9 : 22; return [Math.cos(a) * r, Math.sin(a) * r] })); break
    case 'sun': g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill(); for (let i = 0; i < 8; i++) { g.save(); g.rotate((i * Math.PI) / 4); g.fillRect(-2, -24, 4, 9); g.restore() } break
    case 'cross': g.fillRect(-5, -20, 10, 40); g.fillRect(-20, -5, 40, 10); break
    case 'skull': g.beginPath(); g.arc(0, -4, 15, 0, 7); g.fill(); g.fillRect(-9, 6, 18, 10); g.fillStyle = '#000'; g.beginPath(); g.arc(-6, -4, 4, 0, 7); g.arc(6, -4, 4, 0, 7); g.fill(); break
    case 'orb': g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); break
    case 'swirl': g.lineWidth = 4; g.beginPath(); for (let t = 0; t < 14; t += 0.2) g.lineTo(Math.cos(t) * t * 1.6, Math.sin(t) * t * 1.6); g.stroke(); break
    case 'bolt': P([[4, -24], [-10, 2], [0, 2], [-6, 24], [12, -4], [2, -4]]); break
    case 'wave': g.lineWidth = 5; for (let k = -1; k <= 1; k++) { g.beginPath(); for (let x = -22; x <= 22; x += 2) g.lineTo(x, k * 11 + Math.sin(x / 5) * 4); g.stroke() } break
    case 'rock': P([[-18, 14], [-14, -8], [0, -18], [16, -10], [20, 12], [4, 20]]); break
    case 'leaf': g.beginPath(); g.moveTo(-16, 18); g.quadraticCurveTo(-16, -20, 20, -20); g.quadraticCurveTo(18, 16, -16, 18); g.fill(); break
    case 'moon': g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(8, -6, 15, 0, 7); g.fill(); break
    case 'bubble': g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.stroke(); g.globalAlpha = 0.3; g.fill(); break
    case 'ring': g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.stroke(); break
    case 'drops': for (const [x, y] of [[-8, -6], [8, 0], [-2, 12]]) { g.beginPath(); g.moveTo(x, y - 12); g.quadraticCurveTo(x + 8, y, x, y + 6); g.quadraticCurveTo(x - 8, y, x, y - 12); g.fill() } break
    case 'target': g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 9, 0, 7); g.stroke(); g.fillRect(-2, -2, 4, 4); break
    case 'arrow': g.rotate(-Math.PI / 4); g.fillRect(-1.5, -14, 3, 34); P([[0, -24], [-7, -12], [7, -12]]); break
    case 'arrows': for (const o of [-9, 0, 9]) { g.save(); g.translate(o, 0); g.rotate(-Math.PI / 4); g.fillRect(-1, -10, 2, 26); P([[0, -18], [-5, -9], [5, -9]]); g.restore() } break
    case 'snake': g.lineWidth = 6; g.beginPath(); for (let t = -20; t <= 20; t += 2) g.lineTo(t, Math.sin(t / 5) * 9); g.stroke(); break
    case 'claw': for (const o of [-9, 0, 9]) { g.beginPath(); g.moveTo(o - 3, 18); g.quadraticCurveTo(o + 10, 0, o, -20); g.quadraticCurveTo(o + 3, 0, o - 3, 18); g.fill() } break
    case 'stars': for (const [x, y] of [[-10, -8], [10, -4], [0, 12]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill() } break
    case 'wind': g.lineWidth = 4; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-20, k * 10); g.quadraticCurveTo(0, k * 10 - 8, 20, k * 10); g.stroke() } break
    case 'horn': P([[-18, 10], [12, -18], [20, -10], [-10, 18]]); break
    case 'fist': g.fillRect(-14, -10, 28, 22); for (let i = 0; i < 4; i++) g.fillRect(-14 + i * 7, -16, 6, 8); break
    case 'aura': g.lineWidth = 3; for (const r of [8, 14, 20]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke() } break
    case 'totem': g.fillRect(-7, -20, 14, 40); g.fillStyle = '#000'; g.fillRect(-4, -12, 3, 3); g.fillRect(2, -12, 3, 3); break
    case 'paw': g.beginPath(); g.arc(0, 6, 10, 0, 7); g.fill(); for (const [x, y] of [[-12, -8], [-4, -14], [4, -14], [12, -8]]) { g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill() } break
    default: g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill()
  }
  g.restore()
}

export function abilityIcon(a: Ability, cls: string): string {
  const key = `a|${a.id}`
  const hit = cache.get(key)
  if (hit) return hit
  const g = canvas()
  const school = a.school ?? (a.kind === 'heal' || a.kind === 'hot' ? 'holy' : 'physical')
  const [c1, c2] = SCHOOL_BG[school]
  bg(g, shade(c1, -0.35), c2)
  glyph(g, GLYPH[a.id] ?? 'orb', shade(c1, 0.2))
  frame(g)
  void cls
  const url = g.canvas.toDataURL()
  cache.set(key, url)
  return url
}

// Ikona ogólna (przyciski menu)
export function menuIcon(kind: 'char' | 'spell' | 'quest' | 'map' | 'town' | 'capital' | 'gear' | 'log'): string {
  const key = `m|${kind}`
  const hit = cache.get(key)
  if (hit) return hit
  const g = canvas()
  bg(g, '#4a3a22', '#100a04')
  const map: Record<string, string> = { char: 'fist', spell: 'star', quest: 'cross', map: 'target', town: 'sun', capital: 'sun', gear: 'ring', log: 'wave' }
  glyph(g, map[kind], '#ffd76a')
  frame(g)
  const url = g.canvas.toDataURL()
  cache.set(key, url)
  return url
}

// Ikona talentu według jego głównego efektu
const FX_GLYPH: [RegExp, string, School][] = [
  [/^school:fire|^ab:(fireball|immolate|flametongue|scorch|fire_blast)/, 'flame', 'fire'], [/^school:frost|^ab:frostbolt|^cast:frostbolt/, 'flake', 'frost'],
  [/^school:shadow|^ab:(sw_pain|corruption|curse|shadow_bolt)/, 'skull', 'shadow'], [/^school:holy|^ab:judgement/, 'sun', 'holy'],
  [/^school:nature|^cast:nature|^ab:(lightning|rejuv)/, 'bolt', 'nature'], [/^school:arcane|^ab:arcane|^spellDmg/, 'star', 'arcane'],
  [/^heal|^cast:heal|^ab:renew/, 'cross', 'holy'], [/^crit|^spellCrit/, 'target', 'physical'], [/^critDmg/, 'axe', 'physical'],
  [/^dodge/, 'wind', 'nature'], [/^armor|^dr/, 'bubble', 'frost'], [/^hp|^sta/, 'fist', 'physical'], [/^pet/, 'paw', 'nature'],
  [/^haste/, 'wind', 'physical'], [/^cost|^regen|^resGen|^int|^spi/, 'drops', 'arcane'], [/^cast:/, 'swirl', 'arcane'],
  [/^aoe/, 'ring', 'fire'], [/^dot/, 'drops', 'shadow'], [/^allstat|^ap|^str|^agi/, 'fist', 'holy'], [/^meleeDmg|^dmg|^ab:/, 'sword', 'physical'],
]
export function talentIcon(key: string | undefined, tree: number): string {
  const ck = `t|${key}|${tree}`
  const hit = cache.get(ck)
  if (hit) return hit
  const m = FX_GLYPH.find(([re]) => re.test(key ?? '')) ?? [null, 'orb', (['arcane', 'fire', 'nature'] as School[])[tree]]
  const g = canvas()
  const [c1, c2] = SCHOOL_BG[m[2] as School]
  bg(g, shade(c1, -0.35), c2)
  glyph(g, m[1] as string, shade(c1, 0.2))
  frame(g)
  const url = g.canvas.toDataURL()
  cache.set(ck, url)
  return url
}
