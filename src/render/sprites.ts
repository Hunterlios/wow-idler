// Pikselowe sprite'y bohatera (styl chibi, widok 3/4, postać patrzy w prawo).
// Każda klatka powstaje z części ciała na siatce pikseli: nogi, tułów, głowa z cechami rasy, strój klasy, broń.
// Na końcu kontur 1 px, jak w grafice pixel-art. Klatki są cache'owane jako małe płótna i skalowane bez wygładzania.
// Animacje: idle 8, walk 8, attack 8, shoot 8, cast 8, hurt 4, death 8, sit 2 klatki.
// Formy: niedźwiedź, kot, gepard (forma podróżna), moonkin, duch wilka — idle 4, walk 8, attack 6.
import type { RaceId } from '../data/races'
import type { ClassId } from '../data/classes'

export type RGB = [number, number, number]
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
// k > 0 rozjaśnia, k < 0 przyciemnia
export const tone = (c: RGB, k: number): RGB => (k >= 0 ? c.map((v) => Math.round(v + (255 - v) * k)) : c.map((v) => Math.round(v * (1 + k)))) as RGB
const OUTLINE: RGB = [20, 12, 10]

export class Grid {
  data: (RGB | null)[]
  constructor(public w: number, public h: number) { this.data = new Array(w * h).fill(null) }
  set(x: number, y: number, c: RGB) {
    x = Math.round(x); y = Math.round(y)
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c
  }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.data[y * this.w + x] : null }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    x = Math.round(x); y = Math.round(y)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }
  // prostokąt z cieniowaniem: jaśniejsza lewa kolumna i górny rząd, ciemniejsza prawa kolumna i dół
  box(x: number, y: number, w: number, h: number, c: RGB, lite = 0.22, dark = -0.28) {
    x = Math.round(x); y = Math.round(y)
    this.rect(x, y, w, h, c)
    if (w > 2 && h > 2) {
      this.rect(x, y, w, 1, tone(c, lite)); this.rect(x, y, 1, h, tone(c, lite * 0.6))
      this.rect(x + w - 1, y + 1, 1, h - 1, tone(c, dark)); this.rect(x + 1, y + h - 1, w - 1, 1, tone(c, dark))
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
    if (![x0, y0, x1, y1].every(Number.isFinite)) return
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    const o = Math.floor((t - 1) / 2)
    for (let guard = 0; guard < 4000; guard++) {
      if (t <= 1) this.set(x0, y0, c); else this.rect(x0 - o, y0 - o, t, t, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x0 += sx }
      if (e2 <= dx) { err += dx; y0 += sy }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, shade = true) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      if (d <= 1) {
        const lit = shade ? ((x - cx) / rx + (y - cy) / ry) : 0
        this.set(x, y, shade ? (lit < -0.9 ? tone(c, 0.2) : lit > 0.8 ? tone(c, -0.25) : c) : c)
      }
    }
  }
  outline(c: RGB = OUTLINE) {
    const add: number[] = []
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.data[y * this.w + x]) continue
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(y * this.w + x)
    }
    for (const i of add) this.data[i] = c
  }
  // obrót wokół punktu (najbliższy piksel, żeby zostały ostre krawędzie)
  rotate(a: number, px: number, py: number) {
    const src = this.data.slice()
    const cs = Math.cos(a), sn = Math.sin(a)
    this.data.fill(null)
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = x - px, dy = y - py
      const sx = Math.round(px + dx * cs + dy * sn), sy = Math.round(py - dx * sn + dy * cs)
      if (sx >= 0 && sy >= 0 && sx < this.w && sy < this.h) this.data[y * this.w + x] = src[sy * this.w + sx]
    }
  }
  tint(c: RGB, k: number) {
    for (let i = 0; i < this.data.length; i++) { const p = this.data[i]; if (p) this.data[i] = p.map((v, j) => Math.round(v + (c[j] - v) * k)) as RGB }
  }
  flipH() { for (let y = 0; y < this.h; y++) { const row = this.data.slice(y * this.w, y * this.w + this.w).reverse(); for (let x = 0; x < this.w; x++) this.data[y * this.w + x] = row[x] } }
  // odwrócenie w pionie (zwierzę na grzbiecie): oś na wysokości ay
  flipV(ay: number) { const src = this.data.slice(); this.data.fill(null); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const sy = Math.round(2 * ay - y); if (sy >= 0 && sy < this.h) this.data[y * this.w + x] = src[sy * this.w + x] } }
  shift(dx: number, dy: number) { const src = this.data.slice(); this.data.fill(null); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const sx = x - dx, sy = y - dy; if (sx >= 0 && sy >= 0 && sx < this.w && sy < this.h) this.data[y * this.w + x] = src[sy * this.w + sx] } }
  // rozpad (żywiołaki, szlam): część pikseli opada / znika
  crumble(k: number, seed = 1) { for (let i = 0; i < this.data.length; i++) { if (!this.data[i]) continue; const r = Math.abs(Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1; if (r < k) this.data[i] = null } }
  // przyciemnienie (dalsze osobniki w grupie)
  darken(k: number) { for (let i = 0; i < this.data.length; i++) { const p = this.data[i]; if (p) this.data[i] = tone(p, -k) } }
  canvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas')
    cv.width = this.w; cv.height = this.h
    const g = cv.getContext('2d')!
    const img = g.createImageData(this.w, this.h)
    this.data.forEach((p, i) => { if (p) { img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255 } })
    g.putImageData(img, 0, 0)
    return cv
  }
}

// ---------------------------------------------------------------- wygląd ciała (rasy graczy i mobów)
export type Hair = 'short' | 'beard' | 'pigtails' | 'long' | 'topknot' | 'mohawk' | 'mane' | 'ragged' | 'none'
export type Look = {
  skin: string; hair: string; eye: string; glow?: boolean; leg: number; torsoH: number; torsoW: number; headW: number; headH: number
  hairStyle: Hair; ears?: 'long' | 'troll' | 'goblin' | 'pointy' | 'round'; tusks?: boolean; horns?: 'tauren' | 'satyr' | 'demon' | 'dragon'
  muzzle?: 'tauren' | 'hyena' | 'boar' | 'bear' | 'fish' | 'beak' | 'rat' | 'croc' | 'wolf'; jaw?: boolean; nose?: 'long' | 'small' | 'big'
  hooves?: boolean; hunch?: number; spines?: string; wings?: string; tail?: string; fin?: string; lower?: 'serpent' | 'wisp' | 'goat' | 'talon'
  armLen?: number; claws?: boolean; ribs?: boolean; stitches?: boolean; oneEye?: boolean; fur?: boolean
}
export const LOOKS: Record<RaceId, Look> = {
  human: { skin: '#e8b48a', hair: '#6b4423', eye: '#24160c', leg: 8, torsoH: 9, torsoW: 9, headW: 11, headH: 11, hairStyle: 'short', nose: 'small' },
  dwarf: { skin: '#e6a47e', hair: '#b4561e', eye: '#24160c', leg: 5, torsoH: 9, torsoW: 11, headW: 11, headH: 11, hairStyle: 'beard', nose: 'small' },
  gnome: { skin: '#f2c4a4', hair: '#f06aa8', eye: '#24160c', leg: 4, torsoH: 6, torsoW: 7, headW: 12, headH: 11, hairStyle: 'pigtails', nose: 'small' },
  nightelf: { skin: '#9c7ecc', hair: '#3cc8b4', eye: '#e8fbff', glow: true, leg: 10, torsoH: 10, torsoW: 8, headW: 10, headH: 11, hairStyle: 'long', ears: 'long' },
  orc: { skin: '#6c9c36', hair: '#1e1a18', eye: '#3a0c0c', leg: 8, torsoH: 10, torsoW: 11, headW: 11, headH: 11, hairStyle: 'topknot', tusks: true },
  undead: { skin: '#9aa494', hair: '#3a2a3e', eye: '#ffe060', glow: true, leg: 8, torsoH: 9, torsoW: 8, headW: 10, headH: 11, hairStyle: 'ragged', jaw: true },
  tauren: { skin: '#74482a', hair: '#3a2414', eye: '#140c06', leg: 9, torsoH: 12, torsoW: 13, headW: 12, headH: 12, hairStyle: 'mane', horns: 'tauren', muzzle: 'tauren', hooves: true, hunch: 2 },
  troll: { skin: '#4f86c6', hair: '#d43a28', eye: '#ffd040', leg: 10, torsoH: 10, torsoW: 9, headW: 10, headH: 11, hairStyle: 'mohawk', ears: 'troll', tusks: true, nose: 'long' },
}

// ---------------------------------------------------------------- strój (klasy graczy i mobów)
export type Outfit = {
  armor: string; trim: string; legs: string; boots: string; glove?: string; robe?: boolean; pauldron?: 'big' | 'mid' | 'small' | 'none'
  head?: 'hood' | 'pointy' | 'antlers' | 'circlet' | 'bandana' | 'helm' | 'hardhat' | 'candle' | 'feather' | 'crown'
  chest?: 'tabard' | 'strap' | 'sash' | 'skull' | 'trimline' | 'belt2' | 'rags'; magic: string
  shield?: string; quiver?: boolean; mask?: string; belt?: string; pauldronCol?: string; bare?: boolean; loin?: boolean
}
export const OUTFITS: Record<ClassId, Outfit> = {
  warrior: { armor: '#8494b4', trim: '#6a4424', legs: '#5c6a86', boots: '#4a3020', glove: '#6c7a96', pauldron: 'big', chest: 'belt2', magic: '#ffd060', shield: '#8a2a24' },
  paladin: { armor: '#e2b232', trim: '#3a66b4', legs: '#b8902a', boots: '#6a4a1c', glove: '#c89a2a', pauldron: 'big', chest: 'tabard', magic: '#fff2a0', shield: '#3a66b4' },
  hunter: { armor: '#5f7c2e', trim: '#7a4a22', legs: '#6a4a26', boots: '#3e2814', glove: '#7a4a22', pauldron: 'mid', chest: 'strap', magic: '#a0ff60', quiver: true },
  rogue: { armor: '#3c3c48', trim: '#6a4424', legs: '#2c2c36', boots: '#1e1a18', glove: '#2a2a30', pauldron: 'small', head: 'hood', chest: 'strap', magic: '#c0c0c0', mask: '#32323c' },
  priest: { armor: '#ece4cc', trim: '#d8b040', legs: '#d8d0b8', boots: '#8a7a5a', robe: true, pauldron: 'small', head: 'circlet', chest: 'trimline', magic: '#fff8d0', belt: '#d8b040' },
  shaman: { armor: '#3c6cb2', trim: '#b8742a', legs: '#7a4a24', boots: '#4a2e16', glove: '#b8742a', pauldron: 'mid', chest: 'sash', magic: '#60c8ff', shield: '#8a2a24', pauldronCol: '#b8742a' },
  mage: { armor: '#2c5cc8', trim: '#a8d0ff', legs: '#1e3c8a', boots: '#3a2a4a', robe: true, pauldron: 'small', head: 'pointy', chest: 'trimline', magic: '#70d8ff' },
  warlock: { armor: '#6a2c8c', trim: '#2a1430', legs: '#3e1a52', boots: '#24122c', robe: true, pauldron: 'small', head: 'hood', chest: 'skull', magic: '#c060ff' },
  druid: { armor: '#a85c28', trim: '#5a7a2a', legs: '#7a4420', boots: '#4a2a12', glove: '#7a4420', pauldron: 'mid', head: 'antlers', chest: 'sash', magic: '#80ff80', pauldronCol: '#5a7a2a' },
}

export type WeaponKind = 'Sword' | 'Greatsword' | 'Axe' | 'Greataxe' | 'Mace' | 'Maul' | 'Dagger' | 'Staff' | 'Polearm' | 'Bow' | 'Crossbow' | 'Gun' | 'Wand' | 'Fist' | 'Club' | 'Spear' | 'Pick' | 'none'
export type OffKind = 'Shield' | 'Weapon' | 'Orb' | 'none'
export type Anim = 'idle' | 'walk' | 'attack' | 'shoot' | 'cast' | 'hurt' | 'death' | 'sit'
export const FRAMES: Record<Anim, number> = { idle: 8, walk: 8, attack: 8, shoot: 8, cast: 8, hurt: 4, death: 8, sit: 2 }

// Siatka bohatera: 56×64, stopy na y=60, środek ciała x=24 (większe postaci mają większą siatkę)
export const GRID_W = 56, GRID_H = 64, FOOT_Y = 60, BODY_X = 24
export type Sprite = { cv: HTMLCanvasElement; ox: number; oy: number; top: number; left: number; right: number }
export type BipedSpec = { look: Look; outfit: Outfit; weapon: WeaponKind; off: OffKind }
const gridFor = (L: Look) => {
  const H = Math.max(GRID_H, L.leg + L.torsoH + L.headH + 34)
  const W = Math.max(GRID_W, L.torsoW * 2 + 36)
  return { W, H, foot: H - 4, bx: Math.floor(W * 0.43) }
}

type Pose = {
  bob: number; lean: number; footF: number; footB: number; liftF: number; liftB: number
  armF: number; armB: number; wpn: number; glow: number; head: number; tintRed: number; sink: number; rot: number; sit?: boolean; draw?: number; flash?: boolean
}
const P = (o: Partial<Pose>): Pose => ({ bob: 0, lean: 0, footF: 1, footB: -1, liftF: 0, liftB: 0, armF: 0.35, armB: -0.15, wpn: 2.55, glow: 0, head: 0, tintRed: 0, sink: 0, rot: 0, ...o })

function pose(anim: Anim, f: number): Pose {
  f = Math.max(0, Math.min(FRAMES[anim] - 1, Math.floor(f) || 0))
  switch (anim) {
    case 'idle': {
      const b = [0, 0, 0, 1, 1, 1, 0, 0][f]
      return P({ bob: b, armF: 0.35 + b * 0.06, armB: -0.15 - b * 0.06, wpn: 2.55 - b * 0.05 })
    }
    case 'walk': {
      const ph = (f / 8) * Math.PI * 2
      const s = Math.sin(ph)
      return P({ bob: Math.abs(Math.cos(ph)) > 0.7 ? 0 : 1, footF: Math.round(s * 3), footB: Math.round(-s * 3), liftF: s < -0.3 ? 1 : 0, liftB: s > 0.3 ? 1 : 0, armF: 0.3 - s * 0.35, armB: s * 0.45, wpn: 2.5 - s * 0.2, lean: 1 })
    }
    case 'attack': {
      const a = [[0.35, 2.55, 0], [1.2, 3.0, 0], [2.4, 3.6, -1], [2.8, 4.0, -1], [1.8, 1.9, 2], [0.95, 1.05, 2], [0.6, 1.6, 1], [0.4, 2.3, 0]][f]
      return P({ armF: a[0], wpn: a[1], lean: a[2], armB: f >= 4 && f <= 5 ? -0.6 : 0.3, footF: f >= 4 && f <= 6 ? 3 : 1, footB: f >= 4 && f <= 6 ? -2 : -1 })
    }
    case 'shoot': {
      // łuk / broń palna: ręka z bronią przed sobą, druga naciąga cięciwę; strzał w klatce 5
      const draw = [0, 1, 2, 3, 3, 0, 0, 0][f]
      return P({ armF: 1.57, wpn: 0, armB: 1.57 - draw * 0.12, draw, flash: f === 5, lean: f === 5 ? -1 : 0, footF: 2, footB: -2 })
    }
    case 'cast': {
      const up = [0.4, 1.0, 1.5, 1.8, 1.8, 1.85, 1.8, 1.8][f]
      return P({ armF: up, armB: up * 0.85, wpn: 3.0, glow: [0, 0.3, 0.6, 1, 0.8, 1, 0.8, 1][f], bob: f >= 3 && f % 2 ? 1 : 0 })
    }
    case 'hurt': return P({ lean: [-1, -2, -2, -1][f], armF: [0.9, 1.2, 1.0, 0.6][f], armB: [-0.8, -1.0, -0.8, -0.4][f], wpn: [2.2, 2.0, 2.2, 2.4][f], tintRed: [0.4, 0.25, 0.1, 0][f], head: -1, footF: 0, footB: -2 })
    case 'death': {
      const rot = [0, 0, 0.1, 0.35, 0.75, 1.15, 1.45, 1.571][f]
      return P({ lean: f < 2 ? -2 : -1, armF: 1.1 + f * 0.1, armB: -0.9, wpn: 2.0 - f * 0.2, tintRed: f < 2 ? 0.35 - f * 0.15 : 0, sink: [0, 1, 2, 3, 3, 3, 3, 3][f], rot, head: -1 })
    }
    case 'sit': return P({ sit: true, armF: f ? 2.6 : 0.9, armB: 0.3, wpn: 2.0 })
  }
}

const SKY = (a: number, L: number): [number, number] => [Math.sin(a) * L, Math.cos(a) * L]

// ---------------------------------------------------------------- broń
export function drawWeapon(g: Grid, kind: WeaponKind, hx: number, hy: number, a: number, magic: RGB, flash: boolean) {
  const steel: RGB = hex('#d0d6e0'), steelD = hex('#8a92a0'), wood = hex('#7a4a22'), woodD = hex('#523018'), gold = hex('#d8a830')
  const L = (n: number) => SKY(a, n)
  const tip = (n: number) => { const [dx, dy] = L(n); return [hx + dx, hy + dy] as [number, number] }
  const back = (n: number) => { const [dx, dy] = L(-n); return [hx + dx, hy + dy] as [number, number] }
  switch (kind) {
    case 'Sword': case 'Greatsword': {
      const n = kind === 'Greatsword' ? 17 : 12
      const [tx, ty] = tip(n), [bx, by] = back(2)
      g.line(bx, by, hx, hy, woodD, 1)
      g.line(hx, hy, tx, ty, steel, kind === 'Greatsword' ? 3 : 2)
      g.line(...tip(2), tx, ty, tone(steel, 0.3), 1)
      const [gx, gy] = tip(1.5), [px, py] = SKY(a + Math.PI / 2, 2.5)
      g.line(gx - px, gy - py, gx + px, gy + py, gold, 1)
      break
    }
    case 'Dagger': case 'Fist': {
      const [tx, ty] = tip(kind === 'Fist' ? 4 : 7)
      g.line(hx, hy, tx, ty, steel, 2); g.set(...back(1), woodD)
      break
    }
    case 'Axe': case 'Greataxe': {
      const n = kind === 'Greataxe' ? 17 : 12
      const [bx, by] = back(2), [tx, ty] = tip(n)
      g.line(bx, by, tx, ty, wood, 2)
      const [ux, uy] = SKY(a + Math.PI / 2, 1)
      for (let i = 0; i < 5; i++) { const [cx, cy] = tip(n - 1 - i); g.line(cx, cy, cx + ux * (4 + (i === 2 ? 1 : 0)), cy + uy * (4 + (i === 2 ? 1 : 0)), i === 0 || i === 4 ? steelD : steel, 1) }
      break
    }
    case 'Mace': case 'Maul': {
      const n = kind === 'Maul' ? 16 : 10
      const [bx, by] = back(2), [tx, ty] = tip(n)
      g.line(bx, by, tx, ty, wood, 2)
      g.ellipse(tx, ty, kind === 'Maul' ? 3.5 : 2.6, kind === 'Maul' ? 3.5 : 2.6, steelD)
      g.set(tx - 1, ty - 1, steel)
      break
    }
    case 'Club': {
      const [bx, by] = back(1), [tx, ty] = tip(11)
      g.line(bx, by, tx, ty, wood, 3); g.ellipse(tx, ty, 2.5, 2.5, woodD); g.set(tx + 1, ty - 1, hex('#c8c8c8'))
      break
    }
    case 'Pick': {
      const [bx, by] = back(1), [tx, ty] = tip(11)
      g.line(bx, by, tx, ty, wood, 2)
      const [ux, uy] = SKY(a + Math.PI / 2, 5); g.line(tx - ux, ty - uy, tx + ux, ty + uy, steelD, 2); g.set(tx + ux, ty + uy, steel)
      break
    }
    case 'Spear':
    case 'Polearm': {
      const [bx, by] = back(8), [tx, ty] = tip(16)
      g.line(bx, by, tx, ty, wood, 2)
      const [sx, sy] = tip(19); g.line(tx, ty, sx, sy, steel, 2)
      break
    }
    case 'Wand': {
      const [tx, ty] = tip(6); g.line(hx, hy, tx, ty, woodD, 1); g.rect(tx - 1, ty - 1, 2, 2, magic)
      break
    }
    case 'Bow': {
      // łuk pionowo w wyciągniętej dłoni, wygięty do przodu
      for (let t = -8; t <= 8; t++) g.set(hx + 3 - Math.round((t * t) / 22), hy + t, t === -8 || t === 8 ? woodD : wood)
      break
    }
    case 'Crossbow': {
      g.line(hx - 6, hy, hx + 6, hy, wood, 2); g.line(hx + 5, hy - 4, hx + 5, hy + 4, steelD, 1)
      break
    }
    case 'Gun': {
      g.line(hx - 6, hy + 1, hx - 1, hy + 1, wood, 3); g.line(hx - 1, hy, hx + 9, hy, hex('#5a5a66'), 2)
      if (flash) { g.rect(hx + 10, hy - 1, 3, 3, hex('#fff2a0')); g.set(hx + 13, hy, hex('#ff9020')) }
      break
    }
    case 'Staff': {
      const [bx, by] = back(8), [tx, ty] = tip(14)
      g.line(bx, by, tx, ty, wood, 2)
      g.ellipse(tx, ty, 2.2, 2.2, magic)
      g.set(tx - 1, ty - 1, tone(magic, 0.6))
      break
    }
    default: break
  }
}

// ---------------------------------------------------------------- dwunożna postać (bohater, NPC, humanoidalne moby)
export function buildBiped(spec: BipedSpec, anim: Anim, f: number): Grid {
  const L = spec.look, O = spec.outfit
  const { W: GW, H: GH, foot: footY, bx: BX } = gridFor(L)
  const g = new Grid(GW, GH)
  const ps = pose(anim, f)
  const skin = hex(L.skin), hair = hex(L.hair)
  const armor = O.bare ? skin : hex(O.armor), trim = hex(O.trim), legs = hex(O.legs), boots = hex(O.boots), glove = O.glove ? hex(O.glove) : skin
  const magic = hex(O.magic)
  const hunch = L.hunch ?? 0
  const sitDrop = ps.sit ? L.leg - 1 : 0
  const legLen = L.lower === 'serpent' || L.lower === 'wisp' ? 0 : L.leg
  const hipY = footY - (L.lower === 'serpent' || L.lower === 'wisp' ? L.leg : legLen) + ps.bob + ps.sink + sitDrop
  const shY = hipY - L.torsoH
  const bx = BX + ps.lean
  const tx = bx - Math.floor(L.torsoW / 2)
  const legW = Math.max(3, Math.round(L.torsoW * 0.36))
  const ranged = anim === 'shoot'
  const torsoTop = shY + hunch
  const armLen = (L.armLen ?? 0) + Math.round(L.torsoH * 0.8) + 1
  const sleeve = O.robe ? armor : O.bare ? skin : tone(armor, -0.05)
  const nails = hex('#f0ead8')

  const drawArm = (sx: number, sy: number, a: number, dark: boolean) => {
    const [dx, dy] = SKY(a, armLen)
    const ex = sx + dx, ey = sy + dy
    const mx = sx + dx * 0.55, my = sy + dy * 0.55
    const t = L.torsoW >= 14 ? 4 : 3
    g.line(sx, sy, mx, my, dark ? tone(sleeve, -0.25) : sleeve, t)
    g.line(mx, my, ex, ey, dark ? tone(glove, -0.25) : glove, t)
    g.rect(ex - 1, ey - 1, 2, 2, dark ? tone(skin, -0.2) : skin)
    if (L.claws) { const [cx, cy] = SKY(a, armLen + 2); g.set(sx + cx, sy + cy, nails); g.set(sx + cx + 1, sy + cy - 1, nails) }
    return [ex, ey] as [number, number]
  }

  // skrzydła i ogon (za ciałem)
  if (L.wings) {
    const wc = hex(L.wings), flap = anim === 'walk' || anim === 'attack' ? [0, 2, 4, 2][f % 4] : [0, 1, 1, 0][f % 4]
    const wx = tx + 1, wy = torsoTop + 1
    for (let i = 0; i < 9; i++) g.line(wx, wy, wx - 6 - i, wy - 10 + i * 2 + flap, i % 3 === 0 ? tone(wc, -0.3) : wc, 1)
    g.line(wx, wy, wx - 14, wy - 11 + flap, tone(wc, -0.4), 1)
  }
  if (L.tail && !ps.sit) { const tc = hex(L.tail), sw = [0, 1, 0, -1][f % 4]; g.line(tx, hipY - 2, tx - 5, hipY + 1 + sw, tc, 2); g.line(tx - 5, hipY + 1 + sw, tx - 8, hipY - 2 + sw, tc, 1) }

  // tylna ręka (+ tarcza / druga broń / kula)
  const backHand = drawArm(tx + 2, shY + 2 + hunch, ps.armB, true)
  if (spec.off === 'Shield' && !ranged) {
    const sc = hex(O.shield ?? '#8a2a24')
    const sx = Math.max(tx - 3, backHand[0] - 2), sy = backHand[1] - 6
    g.box(sx, sy, 7, 10, sc, 0.25, -0.35)
    g.rect(sx, sy, 7, 1, hex('#d8a830')); g.rect(sx, sy + 9, 7, 1, hex('#a07a20')); g.rect(sx + 3, sy + 2, 1, 6, hex('#d8a830')); g.rect(sx + 2, sy + 4, 3, 1, hex('#d8a830'))
  } else if (spec.off === 'Weapon' && !ranged) drawWeapon(g, 'Dagger', backHand[0], backHand[1], ps.armB + 2.4, magic, false)
  else if (spec.off === 'Orb') g.ellipse(backHand[0] + 1, backHand[1] - 2, 2, 2, magic)
  if (O.quiver) { g.box(tx - 2, shY - 2, 3, 9, hex('#6a3e1c')); g.rect(tx - 2, shY - 4, 1, 2, hex('#e8e0c8')); g.rect(tx, shY - 5, 1, 3, hex('#e8e0c8')) }
  if (L.spines) { const sp = hex(L.spines); for (let i = 0; i < 5; i++) g.line(tx + 1, torsoTop + 1 + i * 2, tx - 4, torsoTop - 2 + i * 3, i % 2 ? sp : tone(sp, -0.25), 1) }

  // --- dół ciała: nogi / ogon węża / smuga ducha
  const legX = (front: boolean) => (front ? bx : bx - legW + (L.torsoW > 10 ? 0 : 1))
  if (L.lower === 'serpent' || L.lower === 'wisp') {
    const c = L.lower === 'wisp' ? tone(armor, -0.1) : skin
    const sw = anim === 'walk' ? Math.round(Math.sin((f / 8) * Math.PI * 2) * 2) : [0, 1, 0, -1][f % 4]
    for (let y = hipY; y < footY; y++) {
      const t = (y - hipY) / Math.max(1, footY - hipY)
      const w = Math.max(2, Math.round(L.torsoW * (1 - t * (L.lower === 'wisp' ? 0.85 : 0.45))))
      const x = tx + Math.round(t * t * sw * 2) + Math.round((L.torsoW - w) / 2)
      if (L.lower === 'wisp' && t > 0.75 && (y + f) % 2) continue
      g.rect(x, y, w, 1, y % 3 === 0 ? tone(c, -0.12) : c)
    }
    if (L.lower === 'serpent') { for (let x = 0; x < 9; x++) g.rect(tx - 9 + x + sw, footY - 2 + (x % 3 === 0 ? -1 : 0), 1, 2, tone(skin, -0.1)); g.rect(tx + 1, footY - 2, L.torsoW, 2, tone(skin, 0.15)) }
  } else {
    const drawLeg = (front: boolean) => {
      const dx = front ? ps.footF : ps.footB, lift = front ? ps.liftF : ps.liftB
      const c = front ? legs : tone(legs, -0.22), bc = front ? boots : tone(boots, -0.2)
      const x0 = legX(front)
      if (ps.sit) {
        const ly = footY - legW
        g.rect(x0, hipY - 1, legW, footY - hipY + 1, c)
        g.rect(x0, ly, L.leg + 3 + (front ? 1 : 0), legW, c)
        g.rect(x0 + L.leg + 2 + (front ? 1 : 0), ly - 2, 2, legW + 2, bc)
        return
      }
      const top = hipY, bottom = footY - lift
      for (let y = top; y < bottom; y++) {
        const t = (y - top) / Math.max(1, bottom - top)
        // nogi koźle / ptasie: kolano wygięte do tyłu
        const knee = L.lower === 'goat' || L.lower === 'talon' ? Math.round(Math.sin(t * Math.PI) * -2) : 0
        g.rect(Math.round(x0 + dx * t) + knee, y, L.lower === 'talon' ? 2 : legW, 1, y >= bottom - 3 && !L.hooves && L.lower !== 'talon' ? bc : c)
      }
      const fx = x0 + dx
      if (L.hooves || L.lower === 'goat') g.rect(fx, bottom - 1, legW, 1, hex('#2a1a10'))
      else if (L.lower === 'talon') { g.rect(fx, bottom - 1, 4, 1, hex('#d8b040')); g.set(fx - 1, bottom - 1, hex('#d8b040')) }
      else g.rect(fx + legW - 1, bottom - 2, 2, 2, bc)
      g.rect(fx, top, 1, Math.max(0, bottom - top - 3), tone(c, 0.15))
    }
    drawLeg(false)
    drawLeg(true)
  }

  // --- tułów
  g.box(tx, torsoTop, L.torsoW, hipY - torsoTop, armor)
  if (O.bare && L.fur) for (let i = 0; i < 4; i++) g.set(tx + 2 + i * 2, torsoTop + 2 + (i % 2) * 3, tone(skin, -0.18))
  if (L.ribs) for (let i = 0; i < 3; i++) { g.rect(tx + 1, torsoTop + 2 + i * 2, L.torsoW - 2, 1, hex('#e8e4d4')); g.rect(tx + Math.floor(L.torsoW / 2), torsoTop + 1, 1, hipY - torsoTop - 2, hex('#e8e4d4')) }
  if (L.stitches) { g.line(tx + 2, torsoTop + 2, tx + L.torsoW - 3, hipY - 3, hex('#3a2a2a'), 1); for (let i = 0; i < 4; i++) g.set(tx + 3 + i * 2, torsoTop + 3 + i * 2 - 1, hex('#e8d8c8')) }
  if (O.robe) {
    const sway = Math.round((ps.footF - ps.footB) / 3)
    const rb = ps.sit ? hipY + 2 : footY - 2
    for (let y = hipY - 1; y <= rb; y++) {
      const t = (y - hipY) / Math.max(1, rb - hipY)
      const w = L.torsoW + Math.round(t * 4)
      const x = tx - Math.round(t * 2) + Math.round(t * sway)
      g.rect(x, y, w, 1, armor)
      g.set(x, y, tone(armor, 0.15)); g.set(x + w - 1, y, tone(armor, -0.3))
    }
    g.rect(tx - 2 + sway, rb, L.torsoW + 4, 1, trim)
    if (!ps.sit) { g.rect(bx + ps.footF + legW - 2, footY - 2, 3, 2, boots); g.rect(legX(false) + ps.footB, footY - 2, 2, 2, tone(boots, -0.2)) }
  }
  if (O.loin) { g.rect(tx + 1, hipY - 1, L.torsoW - 2, 4, legs); g.rect(tx + 2, hipY + 3, L.torsoW - 4, 1, tone(legs, -0.3)) }
  const cx = tx + Math.floor(L.torsoW / 2)
  switch (O.chest) {
    case 'tabard': g.box(cx - 1, torsoTop + 2, 4, hipY - torsoTop + (O.robe ? 0 : 3), trim, 0.2, -0.3); g.rect(cx, torsoTop + 4, 2, 2, hex('#e8c860')); break
    case 'strap': g.line(tx + 1, torsoTop + 1, tx + L.torsoW - 2, hipY - 2, trim, 1); break
    case 'sash': g.line(tx + L.torsoW - 2, torsoTop + 1, tx + 1, hipY - 2, trim, 2); break
    case 'skull': g.rect(cx - 1, hipY - 4, 3, 2, hex('#e8e4d4')); g.set(cx - 1, hipY - 3, hex('#2a1430')); g.set(cx + 1, hipY - 3, hex('#2a1430')); g.rect(tx, torsoTop, L.torsoW, 1, trim); break
    case 'trimline': g.rect(cx, torsoTop + 1, 1, (O.robe ? footY - 3 : hipY) - torsoTop - 1, trim); g.rect(tx, torsoTop, L.torsoW, 1, trim); break
    case 'belt2': g.rect(tx + 1, torsoTop + 3, L.torsoW - 2, 1, tone(armor, -0.3)); break
    case 'rags': for (let i = 0; i < L.torsoW; i += 2) g.set(tx + i, hipY - 1 + (i % 4 ? 1 : 0), tone(armor, -0.35)); g.set(cx + 1, torsoTop + 3, skin); g.set(cx + 2, torsoTop + 4, skin); break
  }
  if (!O.bare || O.belt) { g.rect(tx, hipY - 2, L.torsoW, 2, hex(O.belt ?? '#4a2c14')); g.rect(cx, hipY - 2, 2, 2, hex('#e8c048')) }

  // --- naramienniki
  const shX = tx + L.torsoW - 3
  if (O.pauldron === 'big') { g.box(shX - 1, torsoTop - 2, 6, 5, tone(armor, 0.12), 0.3, -0.35); g.rect(shX - 1, torsoTop + 2, 6, 1, trim); g.box(tx - 2, torsoTop - 1, 4, 4, tone(armor, -0.1)) }
  else if (O.pauldron === 'mid') g.box(shX, torsoTop - 1, 5, 4, O.pauldronCol ? hex(O.pauldronCol) : tone(armor, 0.1), 0.25, -0.3)
  else if (O.pauldron === 'small') g.rect(shX, torsoTop, 4, 2, trim)

  // --- głowa
  const hw = L.headW, hh = L.headH
  const hx = bx - Math.floor(hw / 2) + 1 + ps.head + Math.round(hunch * 1.2)
  const hy = shY - hh + 1 + Math.round(hunch * 1.5)
  const bone = hex('#e8dcc0'), boneD = hex('#b8a888')
  if (L.horns === 'tauren') { g.line(hx + 1, hy + 2, hx - 3, hy - 1, boneD, 2); g.line(hx - 3, hy - 1, hx - 3, hy - 4, boneD, 1) }
  if (L.ears === 'long') g.line(hx + 1, hy + 4, hx - 4, hy, tone(skin, -0.1), 2)
  if (L.ears === 'troll') g.line(hx + 1, hy + 4, hx - 4, hy + 2, tone(skin, -0.1), 2)
  if (L.ears === 'goblin') g.line(hx + 1, hy + 4, hx - 5, hy + 1, tone(skin, -0.1), 3)
  if (L.ears === 'pointy') { g.line(hx + 1, hy + 1, hx, hy - 3, tone(skin, -0.15), 2); g.line(hx + 4, hy, hx + 4, hy - 3, skin, 2) }
  if (L.ears === 'round') { g.rect(hx, hy - 2, 3, 3, tone(skin, -0.15)); g.rect(hx + hw - 4, hy - 2, 3, 3, skin) }
  g.box(hx, hy, hw, hh, skin, 0.18, -0.2)
  const ex = hx + hw - 4, ey = hy + Math.round(hh * 0.42)
  const eye = hex(L.eye)
  if (L.glow) { g.rect(ex, ey, 2, 2, eye); g.set(ex + 1, ey, tone(eye, 0.5)) } else { g.rect(ex, ey, 2, 2, hex('#f4f0e8')); g.rect(ex + 1, ey, 1, 2, eye) }
  if (L.oneEye) g.rect(ex - 3, ey - 1, 3, 1, tone(skin, -0.35))
  if (L.hairStyle !== 'none') g.rect(ex - 1, ey - 1, 3, 1, tone(hair, -0.1))
  else g.rect(ex - 1, ey - 1, 3, 1, tone(skin, -0.3))
  if (!L.muzzle) g.set(hx + hw - 2, hy + hh - 3, tone(skin, -0.45))
  // pyski
  const mz = L.muzzle
  if (mz === 'tauren') { g.box(hx + hw - 1, ey + 1, 4, 4, tone(skin, 0.18), 0.15, -0.25); g.set(hx + hw + 2, ey + 2, hex('#1a0c06')); g.rect(hx + hw, ey + 4, 3, 1, bone) }
  if (mz === 'hyena' || mz === 'wolf') { g.box(hx + hw - 1, ey + 1, mz === 'wolf' ? 6 : 5, 4, tone(skin, 0.1), 0.15, -0.25); g.set(hx + hw + (mz === 'wolf' ? 4 : 3), ey + 1, hex('#140a06')); g.rect(hx + hw, ey + 4, 4, 1, hex('#f4f0e0')) }
  if (mz === 'boar') { g.box(hx + hw - 1, ey + 1, 4, 4, hex('#d89a8a'), 0.15, -0.25); g.set(hx + hw + 2, ey + 2, hex('#3a1a14')); g.line(hx + hw, ey + 5, hx + hw + 2, ey + 2, bone, 1) }
  if (mz === 'bear') { g.box(hx + hw - 1, ey + 1, 4, 4, tone(skin, 0.25), 0.15, -0.25); g.set(hx + hw + 2, ey + 1, hex('#140a06')) }
  if (mz === 'rat') { g.box(hx + hw - 1, ey + 1, 4, 3, tone(skin, 0.15), 0.1, -0.2); g.set(hx + hw + 2, ey + 1, hex('#e8a0a0')); g.set(hx + hw, ey + 4, bone) }
  if (mz === 'fish') { g.box(hx + hw - 2, ey + 2, 4, 4, tone(skin, 0.2), 0.1, -0.25); g.rect(hx + hw - 2, ey + 4, 4, 1, hex('#3a1a1a')); g.set(hx + hw - 1, ey + 5, bone); g.set(hx + hw + 1, ey + 5, bone) }
  if (mz === 'beak') { g.rect(hx + hw - 1, ey + 1, 3, 2, hex('#e8b040')); g.set(hx + hw + 2, ey + 2, hex('#c08020')) }
  if (mz === 'croc') { g.box(hx + hw - 1, ey + 1, 6, 4, skin, 0.1, -0.2); g.rect(hx + hw, ey + 3, 5, 1, hex('#2a1010')); g.set(hx + hw + 1, ey + 4, bone); g.set(hx + hw + 3, ey + 4, bone) }
  if (L.nose === 'long') { g.rect(hx + hw, ey + 1, 2, 2, tone(skin, -0.1)); g.set(hx + hw + 1, ey + 3, tone(skin, -0.25)) }
  if (L.nose === 'small') g.set(hx + hw, ey + 2, tone(skin, -0.12))
  if (L.nose === 'big') g.rect(hx + hw, ey + 1, 2, 3, tone(skin, -0.08))
  if (L.tusks && !mz) { g.set(hx + hw - 1, hy + hh - 3, hex('#f4f0e0')); g.set(hx + hw - 1, hy + hh - 4, hex('#f4f0e0')) }
  if (L.jaw) { g.rect(hx + hw - 4, hy + hh - 2, 4, 2, hex('#e8e4d4')); g.set(hx + hw - 3, hy + hh - 2, hex('#3a2a2a')) }
  if (L.fin) { const fc = hex(L.fin); for (let i = 0; i < hw - 2; i++) g.rect(hx + i, hy - 2 - (i % 3), 1, 3 + (i % 3), i % 2 ? fc : tone(fc, 0.2)) }
  // włosy
  const hairD = tone(hair, -0.25)
  switch (L.hairStyle) {
    case 'short': g.rect(hx - 1, hy - 1, hw + 1, 3, hair); g.rect(hx - 1, hy, 3, Math.round(hh * 0.6), hair); g.rect(hx, hy - 1, hw, 1, tone(hair, 0.2)); break
    case 'beard':
      g.rect(hx - 1, hy - 1, hw + 1, 3, hair); g.rect(hx - 1, hy, 3, Math.round(hh * 0.6), hair)
      g.box(hx + 2, hy + hh - 4, hw, 8, hair, 0.15, -0.25); g.rect(hx + hw - 4, ey + 2, 5, 1, hairD); g.set(hx + hw - 1, hy + hh - 3, tone(skin, -0.4))
      break
    case 'pigtails':
      g.rect(hx - 1, hy - 1, hw + 1, 3, hair); g.rect(hx - 1, hy, 3, 5, hair)
      g.box(hx - 4, hy + 1, 3, 4, hair); g.box(hx - 3, hy + 5, 3, 4, hair); g.rect(hx + 1, hy - 3, 4, 2, hair)
      g.rect(hx + hw - 5, ey - 1, 4, 3, hex('#c0c8d8')); g.rect(hx + hw - 4, ey, 2, 1, hex('#60c0ff'))
      break
    case 'long': g.rect(hx - 1, hy - 1, hw + 1, 3, hair); g.rect(hx - 2, hy, 4, hh + 6, hair); g.rect(hx - 2, hy + hh + 2, 2, 4, hairD); break
    case 'topknot': g.rect(hx, hy - 1, hw - 2, 1, hairD); g.box(hx + 1, hy - 4, 3, 4, hair); g.rect(hx - 1, hy + 1, 2, 4, hair); break
    case 'mohawk': for (let i = 0; i < hw - 1; i++) g.rect(hx + i, hy - 3 - (i > 1 && i < hw - 3 ? 2 : 0), 2, 4 + (i > 1 && i < hw - 3 ? 2 : 0), i % 2 ? hair : tone(hair, 0.15)); g.rect(hx - 2, hy + 1, 3, 5, hair); break
    case 'mane': g.rect(hx - 2, hy + 1, 4, hh + 2, hair); g.rect(hx, hy - 1, hw - 3, 2, hair); g.rect(hx + hw - 3, hy - 1, 2, 1, tone(hair, 0.2)); break
    case 'ragged': g.rect(hx - 1, hy - 1, hw - 2, 2, hair); g.rect(hx - 1, hy, 2, 6, hair); g.set(hx + 2, hy + 1, hairD); g.set(hx + 4, hy + 1, hair); break
  }
  if (L.horns === 'tauren') { g.line(hx + hw - 3, hy + 1, hx + hw + 1, hy - 2, bone, 2); g.line(hx + hw + 1, hy - 2, hx + hw + 1, hy - 5, bone, 1) }
  if (L.horns === 'satyr' || L.horns === 'demon') { const hc = L.horns === 'satyr' ? hex('#5a4030') : hex('#2a1a1a'); g.line(hx + 2, hy, hx - 1, hy - 4, hc, 2); g.line(hx - 1, hy - 4, hx - 3, hy - 3, hc, 1); g.line(hx + hw - 3, hy, hx + hw - 3, hy - 4, hc, 2); g.set(hx + hw - 2, hy - 5, hc) }
  if (L.horns === 'dragon') { g.line(hx + 2, hy + 1, hx - 3, hy - 3, boneD, 2); g.line(hx + 5, hy, hx + 2, hy - 4, bone, 2) }
  // nakrycie głowy
  const cl = armor, clD = tone(armor, -0.3)
  switch (O.head) {
    case 'hood':
      g.rect(hx - 1, hy - 2, hw + 1, 3, cl); g.rect(hx - 2, hy, 4, hh - 1, cl); g.rect(hx - 1, hy - 2, hw, 1, tone(cl, 0.2)); g.rect(hx + hw - 1, hy - 1, 1, 3, clD)
      if (L.horns === 'tauren') g.line(hx + hw - 3, hy, hx + hw + 1, hy - 3, bone, 2)
      break
    case 'pointy': g.rect(hx - 1, hy - 2, hw + 1, 3, cl); g.rect(hx - 2, hy, 4, hh - 1, cl); g.line(hx + 1, hy - 2, hx - 4, hy - 7, cl, 2); g.rect(hx - 1, hy - 2, hw, 1, trim); break
    case 'antlers':
      if (L.horns !== 'tauren') { const ant = hex('#8a5a2a'); g.line(hx + 2, hy, hx - 1, hy - 5, ant, 1); g.line(hx, hy - 3, hx - 3, hy - 4, ant, 1); g.line(hx + hw - 2, hy, hx + hw, hy - 5, ant, 1); g.line(hx + hw - 1, hy - 3, hx + hw + 2, hy - 4, ant, 1); g.rect(hx, hy - 1, hw, 1, hex('#5a7a2a')) }
      break
    case 'circlet': g.rect(hx, hy + 1, hw, 1, hex('#e8c048')); g.set(hx + hw - 2, hy + 1, hex('#80e0ff')); break
    case 'bandana': g.rect(hx - 1, hy - 1, hw + 1, 3, trim); g.rect(hx - 3, hy + 1, 3, 2, trim); break
    case 'helm': g.box(hx - 1, hy - 2, hw + 2, 5, hex('#8a8e98'), 0.3, -0.3); g.rect(hx + hw - 2, hy + 2, 2, 3, hex('#6a6e78')); g.rect(hx + 2, hy - 3, hw - 4, 1, trim); break
    case 'hardhat': g.box(hx - 1, hy - 3, hw + 2, 4, hex('#e8b830'), 0.25, -0.3); g.rect(hx + hw, hy, 3, 1, hex('#c89020')); g.rect(hx + 3, hy - 3, 2, 1, hex('#fff2a0')); break
    case 'candle': g.rect(hx + 3, hy - 5, 3, 5, hex('#f4f0d0')); g.rect(hx + 4, hy - 7 - (f % 2), 1, 2, hex('#ffb030')); g.set(hx + 4, hy - 8 - (f % 2), hex('#fff2a0')); break
    case 'feather': g.rect(hx, hy + 1, hw, 1, trim); g.line(hx + 1, hy, hx - 3, hy - 6, hex('#e84a3a'), 1); g.line(hx + 2, hy, hx - 1, hy - 6, hex('#f0e0b0'), 1); break
    case 'crown': g.rect(hx + 1, hy - 2, hw - 2, 2, hex('#e8c048')); for (let i = 0; i < hw - 2; i += 2) g.set(hx + 1 + i, hy - 3, hex('#e8c048')); break
  }
  if (O.mask) g.rect(hx + hw - 4, hy + hh - 4, 4, 3, hex(O.mask))

  // --- przednia ręka z bronią
  const frontSh: [number, number] = [tx + L.torsoW - 2, torsoTop + 2]
  if (ranged && (spec.weapon === 'Gun' || spec.weapon === 'Crossbow')) {
    const [hx2, hy2] = drawArm(frontSh[0], frontSh[1], 1.45, false)
    drawWeapon(g, spec.weapon, hx2, hy2 - 1, 0, magic, !!ps.flash)
  } else if (ranged) {
    const [hx2, hy2] = drawArm(frontSh[0], frontSh[1], ps.armF, false)
    drawWeapon(g, 'Bow', hx2, hy2, 0, magic, false)
    const pull = ps.draw ?? 0
    const sx = hx2 - pull * 2
    const str = hex('#e8e0c8')
    g.line(hx2, hy2 - 8, sx, hy2, str, 1); g.line(sx, hy2, hx2, hy2 + 8, str, 1)
    if (pull > 0) { g.line(sx, hy2, hx2 + 6, hy2, hex('#c8a060'), 1); g.set(hx2 + 7, hy2, hex('#d0d6e0')) }
    if (ps.flash) { g.line(hx2 + 8, hy2, hx2 + 16, hy2, hex('#c8a060'), 1); g.set(hx2 + 17, hy2, hex('#d0d6e0')) }
  } else {
    const [hx2, hy2] = drawArm(frontSh[0], frontSh[1], ps.armF, false)
    if (anim === 'death' && f >= 4) { /* broń wypada z ręki */ }
    else if (spec.weapon === 'Bow') drawWeapon(g, 'Bow', hx2, hy2 - 1, 0, magic, false)
    else if (spec.weapon === 'Gun' || spec.weapon === 'Crossbow') drawWeapon(g, spec.weapon, hx2 + 2, hy2, 0, magic, false)
    else drawWeapon(g, spec.weapon, hx2, hy2, ps.wpn, magic, false)
    if (ps.glow > 0) {
      const r = 1 + ps.glow * 2
      g.ellipse(hx2 + 2, hy2 - 2, r, r, magic, false)
      g.ellipse(hx2 + 2, hy2 - 2, Math.max(0.6, r - 1.2), Math.max(0.6, r - 1.2), tone(magic, 0.7), false)
      if (ps.glow >= 1) { g.set(hx2 + 6, hy2 - 6, tone(magic, 0.5)); g.set(hx2 - 1, hy2 - 7, tone(magic, 0.5)) }
    }
  }

  g.outline()
  if (ps.tintRed > 0) g.tint([255, 40, 30], ps.tintRed)
  // upadek na plecy: najpierw przesuwamy w prawo, żeby leżące ciało zmieściło się w siatce
  if (ps.rot) { const m = Math.round(Math.min(1, ps.rot) * (L.leg + L.torsoH + L.headH - 18)); if (m > 0) g.shift(m, 0); g.rotate(-ps.rot, BX - 2 + Math.max(0, m), footY) }
  if (anim === 'death' && f >= 4 && spec.weapon !== 'none') {
    const w = new Grid(GW, GH)
    const kind = spec.weapon === 'Bow' || spec.weapon === 'Gun' || spec.weapon === 'Crossbow' ? 'Dagger' : spec.weapon
    drawWeapon(w, kind, BX + 6, footY - 1, Math.PI / 2 - 0.08, magic, false)
    w.outline()
    w.data.forEach((c, i) => { if (c && !g.data[i]) g.data[i] = c })
  }
  return g
}

const CACHE = new Map<string, Sprite>()
// Sprite z cache. flip = postać patrzy w lewo (moby, NPC idący w lewo)
export function cached(key: string, build: () => Grid, ox: number, oy: number, flip = false, darken = 0): Sprite {
  const k = `${key}|${flip ? 1 : 0}|${darken}`
  let sp = CACHE.get(k)
  if (!sp) {
    const g = build()
    if (darken) g.darken(darken)
    if (flip) g.flipH()
    let top = g.h, left = g.w, right = 0
    g.data.forEach((c, i) => { if (c) { const y = Math.floor(i / g.w), x = i % g.w; top = Math.min(top, y); left = Math.min(left, x); right = Math.max(right, x) } })
    sp = { cv: g.canvas(), ox: flip ? g.w - 1 - ox : ox, oy, top, left, right }
    CACHE.set(k, sp)
  }
  return sp
}
export function bipedSprite(key: string, spec: BipedSpec, anim: Anim, f: number, flip = false, darken = 0): Sprite {
  const { foot, bx } = gridFor(spec.look)
  return cached(`B|${key}|${anim}|${f}`, () => buildBiped(spec, anim, f), bx, foot, flip, darken)
}

// ---------------------------------------------------------------- bohater
export type HeroKey = { race: RaceId; cls: ClassId; weapon: WeaponKind; off: OffKind }
export function heroSprite(k: HeroKey, anim: Anim, f: number): Sprite {
  return bipedSprite(`H|${k.race}|${k.cls}|${k.weapon}|${k.off}`, { look: LOOKS[k.race], outfit: OUTFITS[k.cls], weapon: k.weapon, off: k.off }, anim, f)
}
export const heroFrame = (k: HeroKey, anim: Anim, f: number) => heroSprite(k, anim, f).cv

// ---------------------------------------------------------------- stwory (czworonogi, pająki, ptaki, żywiołaki...)
export type CAnim = 'idle' | 'walk' | 'attack' | 'hurt' | 'death'
export const CFRAMES: Record<CAnim, number> = { idle: 4, walk: 8, attack: 6, hurt: 4, death: 6 }
type CPose = { bob: number; lunge: number; ph: number; swipe: boolean; open: number; red: number; dead: number }
function cpose(anim: CAnim, f: number): CPose {
  f = Math.max(0, Math.min(CFRAMES[anim] - 1, Math.floor(f) || 0))
  const p: CPose = { bob: 0, lunge: 0, ph: 0, swipe: false, open: 0, red: 0, dead: 0 }
  if (anim === 'idle') p.bob = [0, 0, 1, 1][f]
  if (anim === 'walk') { p.ph = (f / 8) * Math.PI * 2; p.bob = f % 4 < 2 ? 0 : 1 }
  if (anim === 'attack') { p.lunge = [0, -1, -2, 3, 3, 1][f]; p.swipe = f === 3 || f === 4; p.open = f >= 2 && f <= 4 ? 1 : 0 }
  if (anim === 'hurt') { p.lunge = [-2, -2, -1, 0][f]; p.red = [0.4, 0.25, 0.1, 0][f] }
  if (anim === 'death') { p.lunge = -1; p.red = f < 2 ? 0.3 : 0; p.dead = f }
  return p
}
// wspólne zakończenie klatki stwora: kontur, czerwień trafienia, śmierć (na grzbiet / rozpad)
function bounds(g: Grid) { let a = g.h, b = 0; g.data.forEach((c, i) => { if (c) { const y = Math.floor(i / g.w); a = Math.min(a, y); b = Math.max(b, y) } }); return [a, b] }
function finish(g: Grid, p: CPose, foot: number, death: 'flip' | 'crumble' | 'fall') {
  g.outline()
  if (p.red) g.tint([255, 40, 30], p.red)
  if (p.dead >= 2) {
    if (death === 'crumble') { g.crumble(Math.min(0.85, (p.dead - 1) * 0.2), p.dead); const [, b] = bounds(g); g.shift(0, Math.min(p.dead * 2, foot - b)) }
    else {
      // na grzbiet, łapami do góry (ptaki: najpierw spadają)
      if (death === 'fall' && p.dead < 4) { const [, b] = bounds(g); g.shift(0, Math.min((p.dead - 1) * 5, foot - b)) }
      else { const [a, b] = bounds(g); g.flipV((a + b) / 2); const [, b2] = bounds(g); g.shift(0, foot - b2) }
    }
  }
  return g
}

export type QuadSpec = {
  col: string; belly?: string; len: number; h: number; leg: number; legW: number; head: number; tail: number; tailW?: number
  ears?: 'pointy' | 'round' | 'none'; muzzle?: 'long' | 'short' | 'croc' | 'beak' | 'blunt'; tusks?: boolean; horns?: string
  stripes?: string; spots?: string; mane?: string; spikes?: string; shell?: string; eye?: string; hump?: boolean; neckUp?: number
  upper?: Look; upperOutfit?: Outfit // centaur: tułów i głowa jeźdźca
}
const quadGrid = (q: QuadSpec) => ({ W: q.len + q.tail + q.head * 2 + 22, H: q.h + q.leg + (q.upper ? 34 : 20) })
export function buildQuad(q: QuadSpec, anim: CAnim, f: number): Grid {
  const { W, H } = quadGrid(q)
  const g = new Grid(W, H)
  const p = cpose(anim, f)
  const foot = H - 3
  const X = Math.floor(W * 0.45) + p.lunge
  const col = hex(q.col), dark = tone(col, -0.3), lite = tone(col, 0.3)
  const bodyY = foot - q.leg - q.h + p.bob
  const x0 = X - Math.floor(q.len / 2)
  const step = (i: number) => Math.round(Math.sin(p.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 2)
  const legXs = [x0 + 2, x0 + 2 + q.legW + 1, x0 + q.len - q.legW * 2 - 3, x0 + q.len - q.legW - 2]
  legXs.forEach((lx, i) => {
    const back = i % 2 === 0
    const s = anim === 'walk' ? step(i) : 0
    const lift = anim === 'walk' && s < -1 ? 1 : 0
    for (let y = bodyY + q.h - 2; y < foot - lift; y++) { const t = (y - bodyY - q.h + 2) / q.leg; g.rect(lx + Math.round(s * t), y, q.legW, 1, back ? dark : col) }
    g.rect(lx + s, foot - 1 - lift, q.legW + (q.legW > 3 ? 1 : 0), 1, tone(dark, -0.35))
  })
  if (q.tail) {
    const tw = anim === 'idle' ? [0, 1, 0, -1][f] : Math.round(Math.sin(p.ph * 2))
    const tc = q.stripes && !q.spots ? dark : col
    g.line(x0 + 1, bodyY + 2, x0 - q.tail + 3, bodyY - 3 + tw + (q.tailW && q.tailW > 2 ? 6 : 0), tc, q.tailW ?? 2)
    g.set(x0 - q.tail + 3, bodyY - 4 + tw, dark)
  }
  g.ellipse(X, bodyY + q.h / 2, q.len / 2, q.h / 2 + 1, col)
  if (q.belly) g.rect(x0 + 4, bodyY + q.h - 2, q.len - 8, 2, hex(q.belly))
  if (q.hump) g.ellipse(X - q.len / 5, bodyY + 1, q.len / 4, q.h / 3, col)
  if (q.shell) { const sc = hex(q.shell); g.ellipse(X, bodyY + q.h / 2 - 2, q.len / 2 - 1, q.h / 2, sc); for (let i = 0; i < 3; i++) g.rect(x0 + 4 + i * Math.floor(q.len / 4), bodyY + 1, 1, q.h - 3, tone(sc, -0.3)) }
  if (q.stripes) for (let i = 0; i < 5; i++) g.rect(x0 + 4 + i * Math.floor((q.len - 8) / 5), bodyY + 1, 1, Math.max(2, q.h - 4), hex(q.stripes))
  if (q.spots) for (let i = 0; i < 8; i++) g.set(x0 + 3 + i * Math.floor((q.len - 6) / 8) + (i % 2), bodyY + 2 + (i % 3), hex(q.spots))
  if (q.spikes) for (let i = 0; i < 6; i++) { const sx = x0 + 3 + i * Math.floor((q.len - 6) / 6); g.line(sx, bodyY + 1, sx - 1, bodyY - 2 - (i % 2), hex(q.spikes), 1) }
  if (q.mane) { const mc = hex(q.mane); g.ellipse(x0 + q.len - 5, bodyY + 2, 5, q.h / 2 + 1, mc) }
  if (q.head > 0) {
  // głowa
  const hx = x0 + q.len - 3, hy = bodyY - (q.neckUp ?? 2) + (p.swipe ? 1 : 0)
  if (q.neckUp && q.neckUp > 3) g.line(hx - 2, bodyY + 2, hx + 1, hy + 3, col, 4)
  g.ellipse(hx + 2, hy + 3, q.head * 0.75, q.head * 0.62, col)
  const mzL = q.muzzle === 'long' ? 5 : q.muzzle === 'croc' ? 8 : q.muzzle === 'blunt' ? 4 : 3
  if (q.muzzle === 'beak') { g.rect(hx + 5, hy + 2, 4, 2, hex('#e8b040')); g.set(hx + 8, hy + 4, hex('#c08020')) }
  else {
    g.box(hx + 4, hy + 3 - (q.muzzle === 'croc' ? 1 : 0), mzL, 3, q.muzzle === 'croc' ? col : lite, 0.1, -0.2)
    g.set(hx + 3 + mzL, hy + 3 - (q.muzzle === 'croc' ? 1 : 0), hex('#140c0a'))
    if (p.open) { g.rect(hx + 5, hy + 6, mzL - 1, 1, hex('#5a1414')); g.rect(hx + 5, hy + 7, mzL - 1, 1, tone(lite, -0.1)) }
    if (q.muzzle === 'croc') for (let i = 0; i < mzL - 1; i += 2) g.set(hx + 5 + i, hy + 5, hex('#f4f0e0'))
  }
  if (q.tusks) { g.line(hx + 6, hy + 6, hx + 8, hy + 2, hex('#f4f0e0'), 1); g.set(hx + 9, hy + 2, hex('#f4f0e0')) }
  if (q.horns) { const hc = hex(q.horns); g.line(hx + 1, hy, hx - 2, hy - 4, hc, 2); g.line(hx + 3, hy, hx + 4, hy - 4, hc, 1) }
  if (q.ears === 'pointy') { g.rect(hx, hy - 2, 2, 3, col); g.set(hx, hy - 3, col); g.rect(hx + 3, hy - 2, 2, 3, dark); g.set(hx + 3, hy - 3, dark) }
  if (q.ears === 'round') { g.rect(hx - 1, hy - 1, 3, 2, col); g.rect(hx + 3, hy - 1, 3, 2, dark) }
  const eye = q.eye ? hex(q.eye) : hex('#140c0a')
  g.set(hx + 4, hy + 2, eye); if (q.eye) g.set(hx + 5, hy + 2, tone(eye, 0.5))
  if (p.swipe) { const cl = hex('#f4f0e0'); g.line(hx + 9 + mzL - 3, hy - 2, hx + 12 + mzL - 3, hy + 4, cl, 1); g.line(hx + 11 + mzL - 3, hy - 3, hx + 14 + mzL - 3, hy + 3, cl, 1) }
  }
  // centaur: tułów jeźdźca wyrasta z przodu
  if (q.upper && q.upperOutfit) {
    const up = q.upper, uo = q.upperOutfit
    const ux = x0 + q.len - 9, uy = bodyY + 2
    const sk = hex(up.skin), ar = uo.bare ? sk : hex(uo.armor)
    g.box(ux, uy - up.torsoH, up.torsoW, up.torsoH + 2, ar)
    const [ax, ay] = SKY(p.swipe ? 1.6 : 0.6, 8); g.line(ux + up.torsoW - 2, uy - up.torsoH + 2, ux + up.torsoW - 2 + ax, uy - up.torsoH + 2 + ay, sk, 3)
    drawWeapon(g, 'Spear', ux + up.torsoW - 2 + ax, uy - up.torsoH + 2 + ay, p.swipe ? 1.6 : 2.6, hex(uo.magic), false)
    const hw = up.headW, hh = up.headH, hx2 = ux + 1, hy2 = uy - up.torsoH - hh + 1
    g.box(hx2, hy2, hw, hh, sk, 0.18, -0.2)
    g.rect(hx2 + hw - 4, hy2 + 4, 2, 2, hex('#140c0a'))
    g.rect(hx2 - 1, hy2 - 1, hw + 1, 3, hex(up.hair)); g.rect(hx2 - 2, hy2, 3, hh + 3, hex(up.hair))
    if (up.horns) { g.line(hx2 + 2, hy2, hx2 - 1, hy2 - 4, hex('#5a4030'), 2); g.line(hx2 + hw - 3, hy2, hx2 + hw - 2, hy2 - 4, hex('#5a4030'), 2) }
  }
  return finish(g, p, foot, 'flip')
}
export function quadSprite(key: string, q: QuadSpec, anim: CAnim, f: number, flip = false, darken = 0): Sprite {
  const { W, H } = quadGrid(q)
  return cached(`Q|${key}|${anim}|${f}`, () => buildQuad(q, anim, f), Math.floor(W * 0.45), H - 3, flip, darken)
}

// --- pająk
export function buildSpider(col: string, size: number, anim: CAnim, f: number): Grid {
  const W = 34 + size * 2, H = 22 + size, g = new Grid(W, H), p = cpose(anim, f), foot = H - 3
  const c = hex(col), d = tone(c, -0.35), X = Math.floor(W / 2) + p.lunge
  const by = foot - 7 - size / 2 + p.bob
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    const s = anim === 'walk' ? Math.round(Math.sin(p.ph + i * 1.3 + (side > 0 ? Math.PI : 0)) * 2) : 0
    const kx = X + side * (4 + i * 2) + s, ky = by - 4 - (i % 2)
    g.line(X + (i - 1.5) * 2, by, kx, ky, side > 0 ? c : d, 1); g.line(kx, ky, kx + side * 3 + s, foot - 1, side > 0 ? c : d, 1)
  }
  g.ellipse(X - 5, by - 1, 6 + size / 2, 5 + size / 3, c)
  g.rect(X - 7, by - 3, 3, 1, tone(c, 0.3)); g.rect(X - 5, by - 1, 2, 1, hex('#c03020'))
  g.ellipse(X + 3, by + 1, 4, 3, d)
  g.rect(X + 5, by, 1, 1, hex('#ff3030')); g.rect(X + 6, by + 1, 1, 1, hex('#ff3030'))
  if (p.open) { g.line(X + 6, by + 2, X + 9, by + 4, hex('#f4f0e0'), 1); g.line(X + 5, by + 3, X + 7, by + 5, hex('#f4f0e0'), 1) }
  return finish(g, p, foot, 'flip')
}
// --- skorpid
export function buildScorpid(col: string, anim: CAnim, f: number): Grid {
  const W = 44, H = 30, g = new Grid(W, H), p = cpose(anim, f), foot = H - 3
  const c = hex(col), d = tone(c, -0.3), X = 20 + p.lunge
  const by = foot - 6 + p.bob
  for (let i = 0; i < 4; i++) { const s = anim === 'walk' ? Math.round(Math.sin(p.ph + i * 1.5) * 1.5) : 0; g.line(X - 6 + i * 4, by + 2, X - 7 + i * 4 + s, foot - 1, d, 1) }
  for (let i = 0; i < 5; i++) g.box(X - 9 + i * 4, by - 2, 5, 5, i % 2 ? c : tone(c, 0.08), 0.2, -0.3)
  // ogon z żądłem nad grzbietem
  const sting = p.swipe ? 4 : 0
  const pts: [number, number][] = [[X - 9, by], [X - 13, by - 4], [X - 13, by - 9], [X - 10, by - 13], [X - 5 + sting, by - 14 + sting]]
  for (let i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i % 2 ? c : d, 3)
  g.line(pts[4][0], pts[4][1], pts[4][0] + 3, pts[4][1] + 3, hex('#e8e0b0'), 1)
  // szczypce
  const cl = p.open ? 3 : 1
  g.line(X + 8, by, X + 13, by - 2, c, 2); g.box(X + 13, by - 4, 4, 3, c); g.line(X + 17, by - 4, X + 19, by - 4 - cl, d, 1); g.line(X + 17, by - 2, X + 19, by - 1 + cl, d, 1)
  g.set(X + 9, by - 2, hex('#140c0a'))
  return finish(g, p, foot, 'flip')
}
// --- raptor (dwunożny dinozaur)
export function buildRaptor(col: string, anim: CAnim, f: number, big = false): Grid {
  const W = 48, H = 38, g = new Grid(W, H), p = cpose(anim, f), foot = H - 3
  const c = hex(col), d = tone(c, -0.3), l = tone(c, 0.3), X = 22 + p.lunge, by = foot - 13 + p.bob - (big ? 2 : 0)
  for (const [i, dk] of [[0, true], [1, false]] as const) {
    const s = anim === 'walk' ? Math.round(Math.sin(p.ph + i * Math.PI) * 3) : i ? 1 : -1
    g.line(X - 2 + i * 2, by + 3, X - 4 + i * 2 + s, by + 8, dk ? d : c, 3); g.line(X - 4 + i * 2 + s, by + 8, X - 2 + i * 2 + s, foot - 1, dk ? d : c, 2); g.rect(X - 2 + i * 2 + s, foot - 1, 4, 1, hex('#d8c8a0'))
  }
  g.line(X - 6, by, X - 18, by - 4 + Math.round(Math.sin(p.ph) * 1), c, 3)
  g.ellipse(X, by + 1, 8, 5, c)
  g.rect(X - 5, by - 3, 8, 1, hex('#5a2a1a'))
  for (let i = 0; i < 4; i++) g.set(X - 7 + i * 3, by - 1, d)
  g.line(X + 5, by - 1, X + 9, by - 6, c, 3)
  g.box(X + 7, by - 10, 7, 5, c, 0.2, -0.25)
  g.box(X + 12, by - 8 + p.open, 4, 2, l, 0.1, -0.2)
  if (p.open) { g.rect(X + 12, by - 6, 4, 1, hex('#5a1414')); g.set(X + 13, by - 5, hex('#f4f0e0')); g.set(X + 15, by - 5, hex('#f4f0e0')) }
  g.set(X + 11, by - 9, hex('#ffd040'))
  g.line(X + 5, by + 2, X + 8, by + 4, d, 1)
  for (let i = 0; i < 3; i++) g.set(X + 8 + i, by - 11 - (i % 2), hex('#c04030'))
  return finish(g, p, foot, 'flip')
}
// --- ptaki: sęp / harpia-ptak / nietoperz / sowa / hipogryf; unoszą się i machają skrzydłami
export function buildBird(col: string, kind: 'bird' | 'bat' | 'owl' | 'big' | 'ptero', anim: CAnim, f: number): Grid {
  const big = kind === 'big' || kind === 'ptero'
  const W = big ? 56 : 44, H = big ? 46 : 40, g = new Grid(W, H), p = cpose(anim, f), foot = H - 3
  const c = hex(col), d = tone(c, -0.3), l = tone(c, 0.3)
  const flap = [0, 3, 6, 3][(anim === 'walk' ? f : anim === 'attack' ? f + 1 : f) % 4]
  const X = Math.floor(W / 2) + p.lunge, by = foot - (big ? 20 : 18) + Math.round(flap / 3) + p.bob
  const ws = big ? 15 : 11
  // tylne skrzydło
  g.line(X - 2, by - 1, X - ws, by - 7 + flap * 1.6, d, 2)
  for (let i = 0; i < 4; i++) g.line(X - 2 - i * 3, by, X - ws + i, by - 6 + flap * 1.6 + i * 2, d, 1)
  if (kind === 'bat') g.ellipse(X, by + 1, 4, 4, c)
  else g.ellipse(X, by + 1, big ? 8 : 6, big ? 5 : 4, c)
  if (kind !== 'bat' && kind !== 'ptero') { g.line(X - 6, by + 1, X - 11, by + 4, d, 2); g.line(X - 6, by + 2, X - 10, by + 6, d, 1) }
  const hx = X + (big ? 7 : 5), hy = by - (kind === 'owl' ? 3 : 4)
  g.ellipse(hx, hy, kind === 'owl' ? 4 : 3, 3, kind === 'bird' && col.startsWith('#6') ? hex('#c89a8a') : c)
  if (kind === 'bat') { g.rect(hx - 2, hy - 4, 1, 3, c); g.rect(hx + 1, hy - 4, 1, 3, c); g.set(hx + 1, hy, hex('#ff4040')); g.set(hx + 3, hy + 2, hex('#f4f0e0')) }
  else if (kind === 'owl') { g.rect(hx, hy - 1, 2, 2, hex('#ffd040')); g.rect(hx + 3, hy - 1, 1, 2, hex('#ffd040')); g.set(hx + 4, hy + 1, hex('#d0a040')); g.set(hx - 2, hy - 4, c); g.set(hx + 2, hy - 4, c) }
  else if (kind === 'ptero') { g.line(hx + 2, hy, hx + 9, hy + 2, hex('#e8b040'), 2); g.line(hx - 1, hy - 1, hx - 6, hy - 4, l, 2); g.set(hx + 1, hy - 1, hex('#ffd040')) }
  else { g.set(hx + 1, hy - 1, hex('#140c0a')); g.rect(hx + 3, hy, 3, 2, hex('#e8b040')); g.set(hx + 5, hy + 2, hex('#c08020')); if (big) { g.line(hx - 2, hy - 2, hx - 5, hy - 5, l, 1) } }
  // nogi ze szponami
  if (kind !== 'bat') { g.line(X - 1, by + 4, X - 1 + (p.swipe ? 4 : 0), by + 9, hex('#d8b040'), 1); g.line(X + 1, by + 4, X + 2 + (p.swipe ? 4 : 0), by + 9, hex('#d8b040'), 1) }
  // przednie skrzydło
  g.line(X, by - 1, X - ws + 3, by - 9 + flap * 1.6, c, 2)
  for (let i = 0; i < 4; i++) g.line(X - i * 3, by, X - ws + 3 + i, by - 8 + flap * 1.6 + i * 2, i === 3 ? d : c, 1)
  if (kind === 'big') { g.ellipse(X - 2, by + 3, 6, 4, hex('#c8a060')); g.line(X - 6, by + 5, X - 6, foot - 8, hex('#c8a060'), 2) }
  return finish(g, p, foot, 'fall')
}
// --- wysoki ptak nielotny (plainstrider)
export function buildStrider(col: string, anim: CAnim, f: number): Grid {
  const W = 40, H = 46, g = new Grid(W, H), p = cpose(anim, f), foot = H - 3
  const c = hex(col), d = tone(c, -0.3), X = 18 + p.lunge, by = foot - 20 + p.bob
  for (const i of [0, 1]) { const s = anim === 'walk' ? Math.round(Math.sin(p.ph + i * Math.PI) * 3) : i ? 1 : -1; g.line(X - 1 + i * 2, by + 4, X - 3 + i * 2 + s, by + 11, i ? hex('#c8a060') : hex('#9a7a40'), 1); g.line(X - 3 + i * 2 + s, by + 11, X - 1 + i * 2 + s, foot - 1, i ? hex('#c8a060') : hex('#9a7a40'), 1); g.rect(X - 1 + i * 2 + s, foot - 1, 3, 1, hex('#9a7a40')) }
  g.ellipse(X, by + 1, 7, 5, c)
  g.line(X - 6, by - 1, X - 10, by - 5, d, 2); g.line(X - 6, by, X - 11, by - 2, tone(c, 0.2), 1)
  g.line(X + 4, by - 2, X + 6 + (p.swipe ? 3 : 0), by - 11, c, 2)
  g.ellipse(X + 7 + (p.swipe ? 3 : 0), by - 13, 3, 3, c)
  g.rect(X + 9 + (p.swipe ? 3 : 0), by - 13, 4, 2, hex('#e8b040')); g.set(X + 7 + (p.swipe ? 3 : 0), by - 14, hex('#140c0a'))
  return finish(g, p, foot, 'flip')
}
// --- smocze pisklę (unosi się)
export function buildWhelp(col: string, anim: CAnim, f: number): Grid {
  const W = 48, H = 40, g = new Grid(W, H), p = cpose(anim, f), foot = H - 3
  const c = hex(col), d = tone(c, -0.3), l = tone(c, 0.35)
  const flap = [0, 3, 6, 3][f % 4], X = 22 + p.lunge, by = foot - 16 + Math.round(flap / 3) + p.bob
  g.line(X - 2, by - 2, X - 13, by - 10 + flap * 1.4, d, 2); for (let i = 0; i < 3; i++) g.line(X - 2 - i * 3, by - 1, X - 13 + i * 2, by - 9 + flap * 1.4 + i * 2, d, 1)
  g.line(X - 6, by + 2, X - 14, by + 6, c, 2); g.set(X - 15, by + 7, l)
  g.ellipse(X, by + 1, 7, 5, c); g.rect(X - 2, by + 3, 6, 2, l)
  g.line(X + 4, by - 1, X + 7, by - 5, c, 3); g.box(X + 6, by - 9, 7, 5, c, 0.2, -0.25); g.box(X + 12, by - 7, 3, 3, l, 0.1, -0.2)
  g.set(X + 10, by - 8, hex('#ffd040')); g.line(X + 7, by - 9, X + 4, by - 13, hex('#e8dcc0'), 1)
  if (p.open) { g.rect(X + 13, by - 4, 6, 2, hex('#ff8a20')); g.rect(X + 18, by - 5, 3, 3, hex('#ffd060')) }
  g.line(X, by - 2, X - 9, by - 12 + flap * 1.4, c, 2); for (let i = 0; i < 3; i++) g.line(X - i * 3, by - 1, X - 9 + i * 2, by - 11 + flap * 1.4 + i * 2, c, 1)
  g.line(X - 1, by + 5, X - 1, by + 8, d, 2); g.line(X + 3, by + 5, X + 3, by + 8, c, 2)
  return finish(g, p, foot, 'fall')
}
// --- żywiołaki
export function buildElemental(kind: 'rock' | 'fire' | 'ooze' | 'air' | 'lasher', col: string, anim: CAnim, f: number): Grid {
  const W = 48, H = 50, g = new Grid(W, H), p = cpose(anim, f), foot = H - 3
  const c = hex(col), d = tone(c, -0.3), l = tone(c, 0.35), X = 22 + p.lunge
  if (kind === 'rock') {
    const by = foot - 16 + p.bob
    for (const i of [0, 1]) { const s = anim === 'walk' ? Math.round(Math.sin(p.ph + i * Math.PI) * 2) : 0; g.box(X - 6 + i * 6 + s, by + 8, 5, foot - by - 8, i ? c : d) }
    g.ellipse(X, by, 11, 10, c); for (let i = 0; i < 6; i++) g.rect(X - 7 + (i * 5) % 13, by - 6 + i * 2, 3, 1, d)
    g.ellipse(X + 3, by - 12, 6, 5, l); g.rect(X + 5, by - 13, 2, 2, hex('#ffd060')); g.rect(X + 2, by - 13, 2, 2, hex('#ffd060'))
    const a = p.swipe ? 1.6 : 0.4; const [dx, dy] = SKY(a, 10); g.line(X + 8, by - 4, X + 8 + dx, by - 4 + dy, c, 5); g.ellipse(X + 8 + dx, by - 4 + dy, 3.5, 3.5, d)
    g.line(X - 8, by - 3, X - 11, by + 7, d, 5)
    return finish(g, p, foot, 'crumble')
  }
  if (kind === 'fire') {
    const by = foot - 6
    for (let y = 0; y < 28; y++) {
      const wv = Math.round(Math.sin((y + f * 3) * 0.6) * 2)
      const w = Math.max(2, Math.round(12 - Math.abs(y - 12) * 0.55))
      g.rect(X - w / 2 + wv, by - y, w, 1, y > 20 ? hex('#ffe070') : y > 10 ? hex('#ff9a20') : c)
    }
    g.ellipse(X + 1, by - 22, 5, 5, hex('#ff9a20')); g.rect(X + 2, by - 23, 2, 2, hex('#fff8d0'))
    for (let i = 0; i < 3; i++) g.set(X - 6 + i * 6 + ((f + i) % 3), by - 30 - ((f + i * 2) % 4), hex('#ffd060'))
    const [dx, dy] = SKY(p.swipe ? 1.6 : 0.6, 9); g.line(X + 5, by - 14, X + 5 + dx, by - 14 + dy, hex('#ff9a20'), 3)
    g.ellipse(X, by + 1, 7, 2, d, false)
    return finish(g, p, foot, 'crumble')
  }
  if (kind === 'ooze') {
    const wob = [0, 1, 2, 1][f % 4], by = foot - 1
    g.ellipse(X, by - 7 + wob / 2, 12 + wob, 8 - wob / 2, c)
    g.ellipse(X + 3, by - 13, 6, 5, c); g.rect(X - 6, by - 10, 3, 2, l); g.set(X + 6, by - 14, hex('#f4f0e0')); g.set(X + 2, by - 14, hex('#f4f0e0'))
    for (let i = 0; i < 3; i++) g.set(X - 8 + i * 7, by - 4 + (i % 2), d)
    if (p.swipe) g.line(X + 8, by - 10, X + 16, by - 6, c, 3)
    return finish(g, p, foot, 'crumble')
  }
  if (kind === 'air') {
    for (let y = 0; y < 26; y++) { const w = Math.max(2, Math.round(16 - y * 0.5)); const wv = Math.round(Math.sin((y * 0.7 + f * 1.4)) * 3); g.rect(X - w / 2 + wv, foot - 26 + y, w, 1, y % 4 === f % 4 ? l : c) }
    g.rect(X + 1, foot - 22, 2, 2, hex('#ffffff')); g.rect(X + 4, foot - 22, 2, 2, hex('#ffffff'))
    return finish(g, p, foot, 'crumble')
  }
  // lasher: cebula kwiatu z pnączami
  const by = foot - 12 + p.bob
  for (let i = 0; i < 3; i++) g.line(X - 6 + i * 6, foot - 1, X - 3 + i * 3, by + 4, hex('#3a6a22'), 2)
  g.ellipse(X, by, 8, 7, hex('#3a7a2a'))
  for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; g.line(X + 2, by - 6, X + 2 + Math.sin(a) * 9, by - 6 - Math.cos(a) * 9, i % 2 ? c : l, 3) }
  g.ellipse(X + 2, by - 6, 3, 3, hex('#ffd040'))
  const [dx, dy] = SKY(p.swipe ? 1.7 : 0.9, 12); g.line(X + 6, by, X + 6 + dx, by + dy - 4, hex('#4a8a2a'), 2)
  return finish(g, p, foot, 'crumble')
}
export function creatureSprite(key: string, build: () => Grid, ox: number, oy: number, flip = false, darken = 0): Sprite {
  return cached(`C|${key}`, build, ox, oy, flip, darken)
}

// ---------------------------------------------------------------- formy druida i duch wilka (na wspólnym budowniczym czworonogów)
export type FormKind = 'bear' | 'cat' | 'cheetah' | 'moonkin' | 'wolf'
export type FormAnim = 'idle' | 'walk' | 'attack'
export const FORM_FRAMES: Record<FormAnim, number> = { idle: 4, walk: 8, attack: 6 }
export function formSprite(kind: FormKind, race: RaceId, anim: FormAnim, f: number): Sprite {
  const ne = race === 'nightelf'
  if (kind === 'moonkin') {
    const col = ne ? '#6a5a8c' : '#8a6a46'
    const look: Look = { skin: col, hair: col, eye: '#ffe070', glow: true, leg: 7, torsoH: 13, torsoW: 15, headW: 12, headH: 10, hairStyle: 'none', muzzle: 'beak', ears: 'pointy', fur: true, hunch: 1 }
    const outfit: Outfit = { armor: col, trim: '#d8c8a0', legs: col, boots: col, bare: true, pauldron: 'none', magic: '#c0a0ff', chest: 'rags' }
    const a: Anim = anim === 'attack' ? 'cast' : anim
    return bipedSprite(`moonkin|${race}`, { look, outfit, weapon: 'none', off: 'none' }, a, a === 'cast' ? Math.min(7, f + 2) : f)
  }
  const q: Record<Exclude<FormKind, 'moonkin'>, QuadSpec> = {
    bear: { col: ne ? '#3e3452' : '#6a4426', len: 24, h: 12, leg: 8, legW: 4, head: 7, tail: 0, ears: 'round', muzzle: 'blunt', hump: true, belly: ne ? '#2e2640' : '#5a361c' },
    cat: { col: ne ? '#2e2440' : '#b08a5a', len: 20, h: 7, leg: 8, legW: 2, head: 6, tail: 9, ears: 'pointy', muzzle: 'short', stripes: ne ? '#6a4a8a' : '#7a5a3a', eye: ne ? '#e8fbff' : undefined },
    cheetah: { col: '#d8b060', len: 21, h: 7, leg: 9, legW: 2, head: 6, tail: 10, ears: 'pointy', muzzle: 'short', spots: '#3a2a14' },
    wolf: { col: '#8ab8e0', len: 20, h: 8, leg: 8, legW: 3, head: 7, tail: 7, ears: 'pointy', muzzle: 'long', eye: '#e8fbff' },
  }
  return quadSprite(`form|${kind}|${race}`, q[kind], anim, f)
}
