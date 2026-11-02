// Ikony rysowane proceduralnie na canvasie (własne, w klimacie Classica): przedmioty i umiejętności.
// Wynik cache'owany jako dataURL.
import { firstIcon, pickIcon, iconUrl } from './assets'
import { ABILITY_ICONS, RACIAL_ICONS, MENU_ICONS, RACE_ICON, CLASS_ICON, ITEM_ICONS, PASSIVE_ICONS, TALENT_ICONS, STATE_ICONS, talentAbility, itemIconGroups } from './iconmap'
import { JUNK as JUNK_NAMES } from '../game/items'
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
    case 'Fist Weapon': {
      fillShape(g, '#6a4a2a', () => { g.roundRect(-12, 0, 24, 16, 4) }, -12, 0, 12, 16)
      for (const o of [-8, 0, 8]) fillShape(g, steel, () => { g.moveTo(o - 3, 2); g.quadraticCurveTo(o + 6, -14, o + 2, -24); g.quadraticCurveTo(o, -10, o - 3, 2) }, o - 3, -24, o + 6, 2)
      gem(g, 0, 8, 3, gemColor)
      break
    }
    case 'Polearm': {
      g.rotate(-Math.PI / 4)
      fillShape(g, wood, () => { g.rect(-2, -14, 4, 42) }, -2, -14, 2, 28)
      fillShape(g, steel, () => { g.moveTo(0, -28); g.lineTo(4, -16); g.lineTo(14, -12); g.lineTo(14, -2); g.lineTo(2, -8); g.lineTo(-2, -8); g.lineTo(-4, -16); g.closePath() }, -4, -28, 14, -2)
      gem(g, 0, -12, 3, gemColor)
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
  if (/water|milk|juice|nectar|dew/.test(n)) {
    fillShape(g, '#c8e4f0', () => { g.moveTo(24, 10); g.lineTo(40, 10); g.lineTo(40, 20); g.quadraticCurveTo(52, 30, 48, 54); g.lineTo(16, 54); g.quadraticCurveTo(12, 30, 24, 20); g.closePath() })
    g.fillStyle = /milk/.test(n) ? '#f8f8f0' : /juice|nectar/.test(n) ? '#e89a40' : /dew/.test(n) ? '#a0e0a0' : '#5aa8e8'; g.fillRect(17, 34, 30, 18)
    fillShape(g, '#8a6a3a', () => { g.rect(26, 6, 12, 6) })
  } else if (/bread|pie|cornbread/.test(n)) {
    fillShape(g, '#c88a3a', () => { g.ellipse(32, 36, 22, 14, 0, 0, 7) })
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); for (const x of [22, 32, 42]) { g.moveTo(x - 4, 28); g.lineTo(x + 4, 42) } g.stroke()
    if (/pie/.test(n)) { g.fillStyle = '#a01a2a'; g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fill() }
  } else if (/egg|omelet/.test(n)) {
    fillShape(g, '#f4ecd4', () => { g.ellipse(32, 34, 16, 20, 0, 0, 7) }); g.fillStyle = '#f0c030'; g.beginPath(); g.arc(32, 36, 7, 0, 7); g.fill()
  } else if (/steak|chops|squid|dumpling|soup|tuber/.test(n)) {
    fillShape(g, /soup/.test(n) ? '#8a6a4a' : '#a04a3a', () => { g.ellipse(32, 34, 22, 15, -0.3, 0, 7) })
    g.fillStyle = /soup/.test(n) ? '#e0a040' : '#f0d0c0'; g.beginPath(); g.ellipse(32, 32, 10, 6, -0.3, 0, 7); g.fill()
  } else if (/fang|claw|tusk|talon|tooth|toenail|stinger|beak/.test(n)) {
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

// Ikona z assets/icons dla przedmiotu (stabilna dla nazwy), jeśli gracz dostarczył ikony
function extItemIcon(it: Item): string | null {
  const junkType = !it.slot && it.rarity === 0 ? Object.entries(JUNK_NAMES).find(([, l]) => l.includes(it.name))?.[0] : undefined
  const named = firstIcon(ITEM_ICONS[it.name])
  if (named) return named
  const groups = itemIconGroups(it, junkType)
  if (!groups) return null
  for (const g of groups) { const u = pickIcon([g], it.name); if (u) return u }
  return null
}
export function itemIcon(it: Item): string {
  const ext = extItemIcon(it)
  if (ext) return ext
  const key = `${it.slot}|${it.weaponType}|${it.armorType}|${it.rarity}|${it.ilvl >> 3}|${it.bagSize ?? 0}|${it.slot ? '' : it.name}|${it.quest ? 'q' : ''}`
  const hit = cache.get(key)
  if (hit) return hit
  const g = canvas()
  bg(g)
  const gc = GEM[it.rarity]
  if (it.bagSize) {
    fillShape(g, '#8a6a3a', () => { g.moveTo(16, 24); g.quadraticCurveTo(12, 56, 32, 56); g.quadraticCurveTo(52, 56, 48, 24); g.closePath() })
    g.strokeStyle = '#d4a838'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(18, 24); g.lineTo(46, 24); g.stroke()
    fillShape(g, '#6a4a2a', () => { g.moveTo(24, 24); g.lineTo(28, 10); g.lineTo(36, 10); g.lineTo(40, 24); g.closePath() })
  } else if (it.kit) {
    glyph(g, 'hammer', '#c8ccd8')
  } else if (!it.slot) {
    drawJunk(g, it.name, gc)
    if (it.quest) { g.fillStyle = '#ffd100'; g.font = 'bold 22px serif'; g.fillText('!', 48, 22) }
  }
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
  charge: 'arrow', hamstring: 'sword', bloodrage: 'drops', sunder_armor: 'axe', demoralizing_shout: 'horn', revenge: 'sword', shield_block: 'bubble',
  cleave: 'axe', retaliation: 'sword', intimidating_shout: 'horn', shield_wall: 'bubble', slam: 'hammer', berserker_rage: 'fist', whirlwind: 'swirl',
  recklessness: 'skull', sweeping_strikes: 'swirl', spearing_strike: 'arrow', mortal_strike: 'axe', piercing_howl: 'horn', death_wish: 'skull',
  bloodthirst: 'drops', last_stand: 'cross', concussion_blow: 'hammer', shield_slam: 'bubble',
  holy_strike: 'hammer', divine_protection: 'bubble', seal_crusader: 'sun', lay_on_hands: 'cross', blessing_wisdom: 'drops', retribution_aura: 'aura',
  flash_of_light: 'cross', blessing_kings: 'star', seal_fury: 'sun', seal_light: 'sun', divine_shield: 'bubble', seal_wisdom: 'drops', hammer_wrath: 'hammer',
  holy_wrath: 'sun', consecration: 'ring', voice_of_truth: 'horn', holy_shock: 'bolt', blessing_sanctuary: 'aura', holy_shield: 'bubble', templars_bulwark: 'bubble',
  seal_command: 'sun', sanctity_aura: 'aura', repentance: 'stars',
  aspect_monkey: 'paw', aspect_hawk: 'target', wing_clip: 'claw', mongoose_bite: 'claw', immolation_trap: 'flame', summon_hawk: 'arrow', freezing_trap: 'flake',
  rapid_fire: 'arrows', explosive_trap: 'flame', volley: 'arrows', intimidation: 'paw', bestial_wrath: 'paw', aimed_shot: 'target', scatter_shot: 'stars',
  trueshot_aura: 'aura', counterattack: 'claw', deterrence: 'wind', wyvern_sting: 'snake',
  garrote: 'drops', expose_armor: 'dagger', ambush: 'dagger', rupture: 'drops', instant_poison: 'drops', cheap_shot: 'fist', kidney_shot: 'fist',
  deadly_poison: 'drops', wound_poison: 'drops', blind: 'stars', cold_blood: 'skull', mutilate: 'dagger', venom: 'snake', riposte: 'dagger', blade_flurry: 'swirl',
  adrenaline_rush: 'wind', ghostly_strike: 'skull', preparation: 'swirl', hemorrhage: 'drops',
  desperate_prayer: 'cross', inner_fire: 'flame', psychic_scream: 'skull', heal: 'cross', flash_heal: 'cross', holy_fire: 'flame', fear_ward: 'bubble',
  devouring_plague: 'skull', prayer_healing: 'cross', shadow_protection: 'bubble', greater_heal: 'cross', inner_focus: 'star', divine_spirit: 'star',
  penance: 'sun', power_infusion: 'star', holy_nova: 'ring', prayer_mending: 'cross', lightwell: 'sun', mind_flay: 'swirl', silence: 'stars',
  vampiric_embrace: 'drops', shadowform: 'skull',
  stoneskin_totem: 'totem', lightning_shield: 'orb', strength_earth: 'totem', flametongue: 'flame', fire_nova: 'ring', frost_shock: 'flake',
  frostbrand: 'flake', healing_stream: 'totem', lesser_healing_wave: 'wave', magma_totem: 'totem', mana_spring: 'totem', windfury: 'wind',
  call_elements: 'totem', chain_lightning: 'bolt', windfury_totem: 'totem', totemic_projection: 'totem', chain_heal: 'wave', grace_of_air: 'totem',
  lava_burst: 'flame', stormstrike: 'bolt', rage_farseer: 'wind', water_shield: 'bubble', natures_swiftness_sh: 'leaf', riptide: 'wave', mana_tide: 'totem',
  polymorph: 'stars', arcane_explosion: 'ring', flamestrike: 'flame', blizzard: 'flake', mana_shield: 'bubble', evocation: 'swirl', scorch: 'flame',
  cone_of_cold: 'flake', ice_armor: 'flake', arcane_blast: 'star', mage_armor: 'star', presence_of_mind: 'star', arcane_power: 'star', pyroblast: 'flame',
  blast_wave: 'ring', combustion: 'flame', cold_snap: 'flake', ice_block: 'bubble', ice_barrier: 'bubble',
  curse_weakness: 'skull', fear: 'skull', drain_soul: 'swirl', drain_life: 'drops', searing_pain: 'flame', rain_of_fire: 'flame', demon_armor: 'skull',
  hellfire: 'flame', shadow_ward: 'bubble', howl_terror: 'horn', drain_hope: 'swirl', death_coil: 'skull', soul_fire: 'flame', amplify_curse: 'skull',
  siphon_life: 'drops', dark_pact: 'drops', demonic_sacrifice: 'skull', soul_link: 'ring', shadowburn: 'skull', conflagrate: 'flame',
  summon_imp: 'flame', summon_voidwalker: 'orb', summon_succubus: 'skull', summon_felhunter: 'paw',
  thorns: 'leaf', bear_form: 'paw', maul: 'claw', demoralizing_roar: 'horn', enrage: 'drops', regrowth: 'leaf', bash: 'fist', swipe: 'claw',
  faerie_fire: 'star', cat_form: 'paw', claw: 'claw', rip: 'drops', shred: 'claw', rake: 'claw', tigers_fury: 'paw', tranquility: 'leaf', ravage: 'claw',
  ferocious_bite: 'claw', pounce: 'paw', frenzied_regen: 'cross', innervate: 'drops', hurricane: 'wind', barkskin: 'bubble', moonkin_form: 'moon',
  feral_charge: 'paw', mangle: 'claw', leader_pack: 'aura', berserk: 'paw', insect_swarm: 'stars', natures_swiftness_dr: 'leaf', swiftmend: 'leaf',
  rockbiter_weapon: 'rock',
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
  const ext = firstIcon(ABILITY_ICONS[a.id])
  if (ext) return ext
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

// Ikony rasowych zdolności i stanów wroga (ogłuszenie, spowolnienie)
const RACIAL_LOOK: Record<string, [string, string]> = {
  bloodfury: ['fire', 'drops'], berserking: ['fire', 'axe'], stoneform: ['physical', 'rock'], warstomp: ['physical', 'stars'], cannibalize: ['shadow', 'skull'],
  shadowmeld: ['shadow', 'moon'], escape: ['arcane', 'wind'], perception: ['holy', 'target'], wotf: ['shadow', 'skull'], slow: ['frost', 'flake'],
}
export function racialIcon(id: string): string {
  const ext = firstIcon(RACIAL_ICONS[id])
  if (ext) return ext
  const key = `r|${id}`
  const hit = cache.get(key)
  if (hit) return hit
  const [school, gl] = RACIAL_LOOK[id] ?? ['physical', 'orb']
  const g = canvas()
  const [c1, c2] = SCHOOL_BG[school as keyof typeof SCHOOL_BG]
  bg(g, shade(c1, -0.35), c2)
  glyph(g, gl, shade(c1, 0.2))
  frame(g)
  const url = g.canvas.toDataURL()
  cache.set(key, url)
  return url
}

// Ikony mikro-menu: czytelne piktogramy (postać, księga, talenty, umiejętności, zadania, mapa, kronika, ustawienia)
export type MenuKind = 'char' | 'spell' | 'talent' | 'skills' | 'quest' | 'map' | 'town' | 'capital' | 'gear' | 'log' | 'hide'
export function menuIcon(kind: MenuKind): string {
  const ext = firstIcon(MENU_ICONS[kind])
  if (ext) return ext
  const key = `m2|${kind}`
  const hit = cache.get(key)
  if (hit) return hit
  const g = canvas()
  const BG: Record<MenuKind, [string, string]> = {
    char: ['#6a4a2a', '#140c04'], spell: ['#2a3a7a', '#060a1c'], talent: ['#2a6a2a', '#061406'], skills: ['#6a2a2a', '#140404'],
    quest: ['#7a6a2a', '#141004'], map: ['#3a6a7a', '#04121a'], town: ['#5a4a3a', '#100a04'], capital: ['#5a4a3a', '#100a04'],
    gear: ['#4a4a4a', '#0c0c0c'], log: ['#5a3a6a', '#0e0614'], hide: ['#3a3a3a', '#0a0a0a'],
  }
  bg(g, BG[kind][0], BG[kind][1])
  const P = (pts: [number, number][], fill: string, stroke?: string) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke() } }
  switch (kind) {
    case 'char': // popiersie w hełmie
      P([[14, 58], [18, 44], [30, 40], [34, 40], [46, 44], [50, 58]], '#8a6a3a', '#2a1a08')
      g.fillStyle = '#e0b890'; g.beginPath(); g.arc(32, 28, 11, 0, 7); g.fill()
      P([[19, 27], [21, 15], [32, 9], [43, 15], [45, 27], [40, 22], [24, 22]], '#b8bcc6', '#3a3a3a')
      g.fillStyle = '#2a1a08'; g.fillRect(27, 28, 3, 3); g.fillRect(35, 28, 3, 3)
      break
    case 'spell': // księga z gwiazdą
      P([[10, 18], [32, 14], [32, 54], [10, 56]], '#c8b080', '#3a2a10'); P([[32, 14], [54, 18], [54, 56], [32, 54]], '#d8c090', '#3a2a10')
      g.strokeStyle = '#3a2a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 14); g.lineTo(32, 54); g.stroke()
      g.fillStyle = '#4a6aff'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, r = k % 2 ? 4 : 9; g.lineTo(43 + Math.cos(a) * r, 34 + Math.sin(a) * r) } g.fill()
      g.fillStyle = '#7a6a4a'; for (const y of [26, 32, 38, 44]) g.fillRect(14, y, 14, 2)
      break
    case 'talent': // drzewko z trzema gałęziami
      g.strokeStyle = '#8a6a3a'; g.lineWidth = 5; g.lineCap = 'round'
      g.beginPath(); g.moveTo(32, 58); g.lineTo(32, 26); g.moveTo(32, 40); g.lineTo(18, 26); g.moveTo(32, 40); g.lineTo(46, 26); g.stroke()
      for (const [x, y] of [[32, 18], [16, 22], [48, 22]]) { g.fillStyle = '#5ad05a'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.fillStyle = '#c8ffc8'; g.beginPath(); g.arc(x - 2, y - 2, 3, 0, 7); g.fill() }
      break
    case 'skills': // skrzyżowane miecze
      for (const s of [1, -1]) {
        g.save(); g.translate(32, 34); g.rotate((s * Math.PI) / 4)
        P([[-3, 14], [-3, -22], [0, -27], [3, -22], [3, 14]], '#d0d4dc', '#3a3a3a')
        g.fillStyle = '#c8a040'; g.fillRect(-9, 12, 18, 4); g.fillStyle = '#5a3a1a'; g.fillRect(-2, 16, 4, 9)
        g.restore()
      }
      break
    case 'quest': // zwój z wykrzyknikiem
      P([[14, 12], [50, 12], [50, 54], [14, 54]], '#e8d8a8', '#5a4a20')
      g.fillStyle = '#c8b480'; g.fillRect(12, 8, 40, 6); g.fillRect(12, 52, 40, 6)
      g.fillStyle = '#ffd100'; g.strokeStyle = '#3a2a00'; g.lineWidth = 2
      g.beginPath(); g.moveTo(28, 18); g.lineTo(36, 18); g.lineTo(34, 38); g.lineTo(30, 38); g.closePath(); g.fill(); g.stroke()
      g.beginPath(); g.arc(32, 45, 4, 0, 7); g.fill(); g.stroke()
      break
    case 'map': // złożona mapa z trasą
      P([[8, 16], [24, 10], [40, 16], [56, 10], [56, 50], [40, 56], [24, 50], [8, 56]], '#d8c890', '#4a3a10')
      g.strokeStyle = 'rgba(80,60,20,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(24, 10); g.lineTo(24, 50); g.moveTo(40, 16); g.lineTo(40, 56); g.stroke()
      g.fillStyle = '#6aa04a'; g.beginPath(); g.ellipse(20, 30, 8, 10, 0.3, 0, 7); g.fill(); g.fillStyle = '#4a8ac8'; g.beginPath(); g.ellipse(44, 38, 8, 6, 0, 0, 7); g.fill()
      g.strokeStyle = '#c02020'; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(16, 44); g.quadraticCurveTo(30, 20, 46, 24); g.stroke(); g.setLineDash([])
      g.strokeStyle = '#c02020'; g.lineWidth = 3; g.beginPath(); g.moveTo(42, 20); g.lineTo(50, 28); g.moveTo(50, 20); g.lineTo(42, 28); g.stroke()
      break
    case 'log': // książka z piórem
      P([[12, 14], [46, 14], [46, 54], [12, 54]], '#7a3a8a', '#200a28'); g.fillStyle = '#e8d8b0'; g.fillRect(16, 18, 26, 32)
      g.fillStyle = '#8a7a5a'; for (const y of [24, 30, 36, 42]) g.fillRect(19, y, 20, 2)
      P([[56, 8], [36, 44], [34, 50], [38, 46], [58, 12]], '#f0f0f0', '#5a5a5a')
      break
    case 'gear': { // zębatka
      g.fillStyle = '#b8bcc6'; g.strokeStyle = '#2a2a2a'; g.lineWidth = 2
      g.beginPath()
      for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, r = k % 2 ? 16 : 22; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r) }
      g.closePath(); g.fill(); g.stroke()
      g.fillStyle = BG.gear[1]; g.beginPath(); g.arc(32, 32, 7, 0, 7); g.fill()
      break
    }
    case 'hide': g.fillStyle = '#000'; g.fillRect(14, 37, 36, 10); g.fillStyle = '#e8e8e8'; g.fillRect(16, 39, 32, 6); break // minus: schowaj do zasobnika
    case 'town': case 'capital':
      P([[12, 54], [12, 30], [32, 14], [52, 30], [52, 54]], '#c8a070', '#3a2a10'); g.fillStyle = '#5a3a1a'; g.fillRect(27, 38, 10, 16)
      break
  }
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
export function talentIcon(key: string | undefined, tree: number, id?: string, cls?: string): string {
  if (id) {
    const own = TALENT_ICONS[id] ? iconUrl(TALENT_ICONS[id]) : null
    if (own) return own
    const ab = talentAbility(id)
    const viaAb = ab ? firstIcon(ABILITY_ICONS[ab]) : null
    if (viaAb) return viaAb
  }
  void cls
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

// Pasywna rasówka (po nazwie); brak pliku = rysowana ikona w kolorze szkoły
const PASSIVE_LOOK: [RegExp, string, string][] = [
  [/Resistance/, 'bubble', 'nature'], [/Specialization/, 'sword', 'physical'], [/Spirit|Mind/, 'swirl', 'arcane'], [/Endurance|Hardiness/, 'fist', 'physical'],
  [/Plainsrunning|Quickness/, 'wind', 'nature'], [/Regeneration|Breathing/, 'drops', 'nature'], [/Slaying|Command/, 'target', 'fire'],
]
export function passiveIcon(name: string): string {
  const ext = firstIcon(PASSIVE_ICONS[name])
  if (ext) return ext
  const key = `p|${name}`
  const hit = cache.get(key)
  if (hit) return hit
  const m = PASSIVE_LOOK.find(([re]) => re.test(name)) ?? [null, 'orb', 'holy']
  const g = canvas()
  const [c1, c2] = SCHOOL_BG[m[2] as keyof typeof SCHOOL_BG]
  bg(g, shade(c1, -0.35), c2)
  glyph(g, m[1] as string, shade(c1, 0.2))
  frame(g)
  const url = g.canvas.toDataURL()
  cache.set(key, url)
  return url
}
export const xpIconUrl = () => iconUrl('xp_icon')
// ikona stanu (z assets) albo zastępcza rysowana ikona rasówki
export const stateIcon = (k: string, fallback: string) => firstIcon(STATE_ICONS[k]) ?? racialIcon(fallback)
export const borderUrl = () => iconUrl('default')

// Portret rasy i ikona klasy z assets (null = brak, wtedy UI pokazuje własny znak)
export const raceIcon = (race: string, female = false) => iconUrl(RACE_ICON(race, female))
export const classIcon = (cls: string) => iconUrl(CLASS_ICON(cls))
