// Tła w tym samym pikselowym stylu co postaci: scena tła jest rysowana w niskiej rozdzielczości (1 piksel = 1 piksel sprite'a)
// i powiększana bez wygładzania. Niebo w pasach z ditheringiem, słońce / księżyc, chmury, trzy warstwy wzgórz z paralaksą,
// rekwizyty biomu (drzewa, skały, nagrobki...), ziemia z teksturą i trawa na pierwszym planie. Do tego zabudowa miast
// (Przymierze, Horda, Undercity) oraz statek i zeppelin w podróży.
import type { Biome } from '../data/zones'
import { Grid, hex, tone, type RGB } from './sprites'

export const BIOMES: Record<Biome, { sky: [string, string]; far: string; mid: string; ground: string; ground2: string; prop: string; prop2: string }> = {
  forest: { sky: ['#5d8fc4', '#bcd9ef'], far: '#5f8a6a', mid: '#3f6e3f', ground: '#4c7a2e', ground2: '#3d6324', prop: '#2f5a26', prop2: '#6b4a2a' },
  snow: { sky: ['#7d9bc0', '#dfe8f2'], far: '#b9c7d6', mid: '#8fa3b8', ground: '#eef3f8', ground2: '#cfd9e4', prop: '#2f4f3a', prop2: '#ffffff' },
  nightforest: { sky: ['#1d1a3f', '#4a3f7a'], far: '#3a3466', mid: '#2a2550', ground: '#2f4a3a', ground2: '#243a2e', prop: '#3b2f6b', prop2: '#8f7ad6' },
  desert: { sky: ['#e2924a', '#f6d39a'], far: '#c47a45', mid: '#a85a32', ground: '#c9884f', ground2: '#b07442', prop: '#7a4a2a', prop2: '#5a3a22' },
  undead: { sky: ['#3a3f45', '#7a8079'], far: '#4c534a', mid: '#3a3f37', ground: '#4a4f3a', ground2: '#3a3f2e', prop: '#2a2a26', prop2: '#7a7a72' },
  plains: { sky: ['#6aa0d8', '#d6e9f5'], far: '#9db06a', mid: '#7f9a4a', ground: '#a8b860', ground2: '#93a24f', prop: '#6a7a2f', prop2: '#8a6a3a' },
  swamp: { sky: ['#5a6a5a', '#9aaa8a'], far: '#4a5a42', mid: '#3a4a32', ground: '#4a5a32', ground2: '#3a4a2a', prop: '#2a3a22', prop2: '#5a7a6a' },
  jungle: { sky: ['#5fa0b8', '#cfe8d8'], far: '#3f7a4a', mid: '#2a6a32', ground: '#3a6a22', ground2: '#2f5a1c', prop: '#1f5a24', prop2: '#7a5a2a' },
  volcanic: { sky: ['#3a1a14', '#a03a1a'], far: '#4a2a22', mid: '#2f1a16', ground: '#3a2a26', ground2: '#2a1a16', prop: '#1a1210', prop2: '#ff6a1a' },
  plague: { sky: ['#4a5a3a', '#9aa86a'], far: '#5a6a42', mid: '#42502f', ground: '#55603a', ground2: '#454f2e', prop: '#2e3320', prop2: '#9ad04a' },
  coast: { sky: ['#5a90c8', '#cfe2f2'], far: '#4a7aa8', mid: '#3a6a5a', ground: '#c8b88a', ground2: '#b4a476', prop: '#3a6a3a', prop2: '#2f5f9a' },
  mountain: { sky: ['#7a9cc4', '#d8e4ee'], far: '#8a8a9a', mid: '#6a6a72', ground: '#7a7a5a', ground2: '#6a6a4a', prop: '#5a5a5a', prop2: '#3f6a3a' },
  crater: { sky: ['#6aa0a8', '#d8eccc'], far: '#5a8a4a', mid: '#3a7a3a', ground: '#5a7a2a', ground2: '#4a6a22', prop: '#2a6a2a', prop2: '#c06a3a' },
}
export const NIGHT = new Set<Biome>(['nightforest', 'undead', 'volcanic'])

const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t)) as RGB
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

// ---------------------------------------------------------------- sprite'y tła (cache)
const SPR = new Map<string, HTMLCanvasElement>()
function spr(key: string, build: () => Grid) { let c = SPR.get(key); if (!c) { c = build().canvas(); SPR.set(key, c) } return c }

// chmura: pikselowe kłęby z jaśniejszym wierzchem
function cloud(v: number, night: boolean) {
  return spr(`cloud|${v}|${night}`, () => {
    const w = 30 + v * 8, g = new Grid(w, 12)
    const base: RGB = night ? [120, 120, 160] : [246, 248, 252], sh: RGB = night ? [90, 90, 130] : [214, 224, 238]
    const blobs = [[w * 0.3, 7, 8, 4], [w * 0.55, 5, 9, 5], [w * 0.75, 8, 7, 3.5], [w * 0.15, 8.5, 5, 3]]
    for (const [x, y, rx, ry] of blobs) g.ellipse(x, y, rx, ry, base, false)
    for (let x = 0; x < w; x++) for (let y = 9; y < 12; y++) if (g.get(x, y)) g.set(x, y, sh)
    return g
  })
}

// rekwizyty biomów (rysowane na warstwie średniej, z ciemnym konturem jak postaci)
type PropFn = (g: Grid, B: (typeof BIOMES)[Biome], v: number) => void
const OUT: RGB = [20, 12, 10]
function tree(g: Grid, leaf: RGB, trunk: RGB, w: number, h: number, round = true) {
  const cx = Math.floor(g.w / 2)
  g.box(cx - 1, g.h - h * 0.45, 3, h * 0.45, trunk, 0.2, -0.3)
  if (round) {
    g.ellipse(cx, g.h - h * 0.62, w / 2, h * 0.33, leaf)
    g.ellipse(cx - w * 0.22, g.h - h * 0.5, w * 0.28, h * 0.2, tone(leaf, -0.08))
    g.ellipse(cx + w * 0.22, g.h - h * 0.52, w * 0.28, h * 0.22, tone(leaf, -0.15))
    for (let i = 0; i < 5; i++) g.set(cx - w * 0.3 + i * w * 0.15, g.h - h * 0.75 + (i % 2) * 2, tone(leaf, 0.25))
  }
}
const PROPS: Record<Biome, PropFn[]> = {
  forest: [
    (g, B) => tree(g, hex(B.prop), hex(B.prop2), 20, 34),
    (g, B) => tree(g, tone(hex(B.prop), 0.12), hex(B.prop2), 16, 28),
    (g, B) => { g.ellipse(g.w / 2, g.h - 4, 7, 4, tone(hex(B.prop), 0.1)); g.set(g.w / 2 - 2, g.h - 6, [200, 60, 60]) },
  ],
  plains: [
    // sawanna: akacja z płaską koroną, kopiec termitów, kępa trawy
    (g, B) => { const cx = g.w / 2, t = hex(B.prop2); g.line(cx, g.h - 1, cx + 1, g.h - 18, t, 2); g.line(cx + 1, g.h - 16, cx - 5, g.h - 22, t, 1); g.line(cx + 1, g.h - 16, cx + 7, g.h - 21, t, 1); g.ellipse(cx + 1, g.h - 24, 13, 3.5, hex(B.prop)); g.ellipse(cx - 3, g.h - 26, 6, 2, tone(hex(B.prop), 0.15)) },
    (g, B) => { const c = tone(hex(B.prop2), 0.15); g.box(g.w / 2 - 3, g.h - 16, 6, 16, c, 0.2, -0.3); g.box(g.w / 2 - 5, g.h - 8, 3, 8, c); g.rect(g.w / 2 - 2, g.h - 18, 3, 2, c) },
    (g, B) => { for (let i = 0; i < 6; i++) g.line(g.w / 2 - 3 + i, g.h - 1, g.w / 2 - 5 + i * 2, g.h - 8 - (i % 3) * 2, tone(hex(B.prop), 0.2), 1) },
  ],
  crater: [
    (g, B) => { tree(g, hex(B.prop), hex(B.prop2), 22, 36); g.set(g.w / 2 + 4, g.h - 20, [230, 120, 60]) },
    (g, B) => { const c = hex(B.prop); for (let i = 0; i < 7; i++) g.line(g.w / 2, g.h - 1, g.w / 2 - 9 + i * 3, g.h - 14 + Math.abs(i - 3) * 2, i % 2 ? c : tone(c, 0.2), 2) },
  ],
  snow: [
    (g, B) => { const cx = g.w / 2, c = hex(B.prop); g.rect(cx - 1, g.h - 6, 3, 6, [90, 60, 40]); for (let k = 0; k < 4; k++) { const y = g.h - 6 - k * 7, w = 9 - k * 2; for (let j = 0; j < 7; j++) g.rect(cx - w + Math.round(j * w / 7), y - j, (w - Math.round(j * w / 7)) * 2, 1, c); g.rect(cx - w + 2, y - 1, w * 2 - 4, 1, [240, 246, 252]) } },
    (g) => { g.ellipse(g.w / 2, g.h - 5, 9, 6, [150, 160, 176]); g.ellipse(g.w / 2 - 1, g.h - 9, 7, 3, [240, 246, 252]) },
  ],
  nightforest: [
    (g, B) => { const cx = g.w / 2; g.box(cx - 2, g.h - 28, 5, 28, [42, 31, 63], 0.2, -0.3); g.ellipse(cx, g.h - 32, 12, 9, hex(B.prop)); g.ellipse(cx - 4, g.h - 36, 7, 5, tone(hex(B.prop), 0.15)); g.line(cx, g.h - 18, cx + 7, g.h - 24, [42, 31, 63], 2) },
    (g, B) => { g.box(g.w / 2 - 1, g.h - 6, 3, 6, [200, 190, 220]); g.ellipse(g.w / 2, g.h - 8, 6, 3, hex(B.prop2)); g.set(g.w / 2 - 2, g.h - 9, [240, 230, 255]) },
  ],
  desert: [
    (g, B) => { const c = hex(B.prop); g.ellipse(g.w / 2, g.h - 6, 10, 6, c); g.ellipse(g.w / 2 + 4, g.h - 11, 6, 4, tone(c, 0.12)); g.rect(g.w / 2 - 6, g.h - 8, 6, 1, tone(c, -0.2)) },
    (g, B) => { const cx = g.w / 2, c: RGB = [90, 140, 60]; g.box(cx - 2, g.h - 20, 5, 20, c, 0.25, -0.3); g.box(cx - 7, g.h - 14, 3, 7, c); g.rect(cx - 6, g.h - 8, 4, 2, c); g.box(cx + 4, g.h - 17, 3, 6, c); g.rect(cx + 3, g.h - 12, 3, 2, c); void B },
    (g, B) => { const t = hex(B.prop2); g.line(g.w / 2, g.h - 1, g.w / 2 - 2, g.h - 12, t, 1); g.line(g.w / 2 - 2, g.h - 12, g.w / 2 - 6, g.h - 16, t, 1); g.line(g.w / 2 - 2, g.h - 12, g.w / 2 + 3, g.h - 17, t, 1) },
  ],
  undead: [
    (g, B) => { const c = hex(B.prop); g.line(g.w / 2, g.h - 1, g.w / 2, g.h - 28, c, 3); g.line(g.w / 2, g.h - 18, g.w / 2 - 8, g.h - 25, c, 1); g.line(g.w / 2, g.h - 22, g.w / 2 + 7, g.h - 30, c, 1); g.line(g.w / 2 - 5, g.h - 22, g.w / 2 - 7, g.h - 29, c, 1) },
    (g, B) => { const c = hex(B.prop2); g.box(g.w / 2 - 3, g.h - 10, 7, 10, c, 0.25, -0.3); g.rect(g.w / 2 - 2, g.h - 11, 5, 1, c); g.rect(g.w / 2, g.h - 8, 1, 4, tone(c, -0.35)); g.rect(g.w / 2 - 1, g.h - 7, 3, 1, tone(c, -0.35)) },
    (g, B) => { const c = tone(hex(B.prop2), -0.2); for (let i = 0; i < 4; i++) g.rect(2 + i * 5, g.h - 9, 2, 9, c); g.rect(1, g.h - 7, 18, 1, c); g.rect(1, g.h - 3, 18, 1, c) },
  ],
  plague: [
    (g, B) => { const c = hex(B.prop); g.line(g.w / 2, g.h - 1, g.w / 2 + 1, g.h - 26, c, 3); g.line(g.w / 2, g.h - 16, g.w / 2 - 8, g.h - 22, c, 1); g.line(g.w / 2 + 1, g.h - 20, g.w / 2 + 8, g.h - 27, c, 1) },
    (g, B) => { g.ellipse(g.w / 2, g.h - 3, 9, 3, hex(B.prop2)); g.set(g.w / 2 - 3, g.h - 5, tone(hex(B.prop2), 0.4)); g.set(g.w / 2 + 2, g.h - 6, tone(hex(B.prop2), 0.4)) },
    (g, B) => { const c = hex(B.prop); g.box(g.w / 2 - 5, g.h - 12, 10, 12, tone(c, 0.2), 0.2, -0.3); g.rect(g.w / 2 - 6, g.h - 13, 12, 2, tone(c, -0.1)); g.rect(g.w / 2 - 1, g.h - 7, 2, 7, [30, 20, 14]) },
  ],
  swamp: [
    (g, B) => { const c = hex(B.prop); g.line(g.w / 2, g.h - 3, g.w / 2, g.h - 26, c, 3); for (const d of [-1, 1]) g.line(g.w / 2, g.h - 4, g.w / 2 + d * 6, g.h - 1, c, 2); g.ellipse(g.w / 2, g.h - 27, 9, 3, tone(c, 0.15)); for (let i = 0; i < 4; i++) g.line(g.w / 2 - 6 + i * 4, g.h - 26, g.w / 2 - 6 + i * 4, g.h - 18 - (i % 2) * 3, [70, 100, 60], 1) },
    (g, B) => { g.ellipse(g.w / 2, g.h - 2, 12, 2, hex(B.prop2), false); for (let i = 0; i < 5; i++) g.line(g.w / 2 - 6 + i * 3, g.h - 2, g.w / 2 - 6 + i * 3 + (i % 2), g.h - 10 - (i % 3) * 3, tone(hex(B.prop), 0.2), 1) },
  ],
  jungle: [
    (g, B) => { const cx = g.w / 2, t = hex(B.prop2), l = hex(B.prop); for (let y = 0; y < 32; y++) g.rect(cx + Math.round(Math.sin(y / 10) * 2), g.h - 1 - y, 2, 1, y % 4 ? t : tone(t, -0.25)); const tx = cx + Math.round(Math.sin(3.1) * 2), ty = g.h - 33; for (const [dx, dy] of [[-12, 4], [12, 5], [-8, -3], [9, -2], [0, -6]]) g.line(tx, ty, tx + dx, ty + dy, l, 2) },
    (g, B) => { const l = hex(B.prop); for (let i = 0; i < 6; i++) g.line(g.w / 2, g.h - 1, g.w / 2 - 10 + i * 4, g.h - 10 - Math.abs(i - 2.5) * -1.5 - 4, i % 2 ? l : tone(l, 0.2), 2) },
  ],
  volcanic: [
    (g, B) => { const c = hex(B.prop); for (let y = 0; y < 26; y++) { const w = Math.max(1, Math.round(10 - y * 0.38)); g.rect(g.w / 2 - w, g.h - 1 - y, w * 2, 1, y % 5 ? c : tone(c, 0.15)) } g.rect(g.w / 2, g.h - 10, 1, 9, hex(B.prop2)) },
    (g, B) => { g.ellipse(g.w / 2, g.h - 4, 8, 4, tone(hex(B.prop), 0.1)); g.rect(g.w / 2 - 4, g.h - 2, 8, 1, hex(B.prop2)) },
  ],
  coast: [
    (g, B) => { const cx = g.w / 2, t: RGB = [140, 100, 60], l = hex(B.prop); for (let y = 0; y < 28; y++) g.rect(cx + Math.round(y * y / 140), g.h - 1 - y, 2, 1, y % 4 ? t : tone(t, -0.25)); const tx = cx + 5, ty = g.h - 29; for (const [dx, dy] of [[-11, 5], [11, 5], [-7, -2], [8, -2]]) g.line(tx, ty, tx + dx, ty + dy, l, 2); g.ellipse(tx, ty + 2, 2, 2, [120, 80, 40]) },
    (g) => { g.ellipse(g.w / 2, g.h - 4, 8, 4, [130, 126, 116]); g.ellipse(g.w / 2 + 6, g.h - 3, 4, 3, [110, 106, 96]) },
  ],
  mountain: [
    (g, B) => { const c = hex(B.prop); for (let y = 0; y < 24; y++) { const w = Math.round(13 - y * 0.5); g.rect(g.w / 2 - w + (y % 3 === 0 ? 1 : 0), g.h - 1 - y, w * 2, 1, y > 18 ? [236, 240, 246] : y % 4 ? c : tone(c, 0.12)) } },
    (g, B) => { const cx = g.w / 2, c = hex(B.prop2); g.rect(cx - 1, g.h - 5, 3, 5, [90, 60, 40]); for (let k = 0; k < 3; k++) { const y = g.h - 5 - k * 6, w = 7 - k * 2; for (let j = 0; j < 6; j++) g.rect(cx - w + Math.round(j * w / 6), y - j, (w - Math.round(j * w / 6)) * 2, 1, c) } },
  ],
}
function propSprite(biome: Biome, v: number) {
  const list = PROPS[biome]
  const idx = v % list.length
  return spr(`prop|${biome}|${idx}`, () => { const g = new Grid(34, 44); list[idx](g, BIOMES[biome], v); g.outline(OUT); return g })
}

// ---------------------------------------------------------------- warstwa tła w niskiej rozdzielczości
let low: HTMLCanvasElement | null = null
let lg: CanvasRenderingContext2D | null = null
function lowCanvas(w: number, h: number) {
  if (!low) { low = document.createElement('canvas'); lg = low.getContext('2d')! }
  if (low.width !== w || low.height !== h) { low.width = w; low.height = h }
  lg!.imageSmoothingEnabled = false
  return lg!
}
// niebo w pasach z ditheringiem na granicach (wzór 2×wysokość, rozciągany poziomo)
const SKY = new Map<string, CanvasPattern>()
function skyPattern(g: CanvasRenderingContext2D, top: RGB, bot: RGB, h: number) {
  const key = `${top}|${bot}|${h}`
  let p = SKY.get(key)
  if (p) return p
  const c = document.createElement('canvas'); c.width = 2; c.height = h
  const x = c.getContext('2d')!
  const bands = 7
  for (let y = 0; y < h; y++) {
    const t = (y / Math.max(1, h - 1)) * (bands - 1)
    const b = Math.floor(t), fr = t - b
    for (let i = 0; i < 2; i++) {
      const dith = fr > 0.66 || (fr > 0.33 && (i + y) % 2 === 0)
      const k = Math.min(bands - 1, b + (dith ? 1 : 0)) / (bands - 1)
      x.fillStyle = css(mixRGB(top, bot, k)); x.fillRect(i, y, 1, 1)
    }
  }
  p = g.createPattern(c, 'repeat-x')!
  SKY.set(key, p)
  return p
}

export type BackOpts = { w: number; h: number; sc: number; scroll: number; t: number; biome: Biome; gy: number; town?: boolean; onlySky?: boolean }
// warstwy wzgórz: kolumny pikseli o wysokości z funkcji falowej, z jaśniejszą krawędzią i drobną teksturą
function hills(g: CanvasRenderingContext2D, lw: number, lh: number, col: RGB, off: number, base: number, amp: number, period: number, seed: number, jag = false) {
  const top = css(tone(col, 0.12)), body = css(col), dot = css(tone(col, -0.12))
  for (let x = 0; x < lw; x++) {
    const k = (x + off) / period
    let y = base - Math.abs(Math.sin(k + seed)) * amp - Math.sin(k * 2.3 + seed) * amp * 0.3
    if (jag) y -= Math.abs(((x + off) % 9) - 4) * 0.6
    const yy = Math.floor(y)
    g.fillStyle = body; g.fillRect(x, yy, 1, lh - yy)
    g.fillStyle = top; g.fillRect(x, yy, 1, 1)
    if (hash(Math.floor(x + off) * 0.37 + seed) > 0.86) { g.fillStyle = dot; g.fillRect(x, yy + 3 + Math.floor(hash(x + off) * 6), 1, 1) }
  }
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, o: BackOpts) {
  const lw = Math.ceil(o.w / o.sc), lh = Math.ceil(o.h / o.sc), lgy = Math.round(o.gy / o.sc)
  const g = lowCanvas(lw, lh)
  const B = BIOMES[o.biome]
  const night = NIGHT.has(o.biome)
  const sc = o.scroll / o.sc
  // niebo
  g.fillStyle = skyPattern(g, hex(B.sky[0]), hex(B.sky[1]), lh); g.fillRect(0, 0, lw, lh)
  if (night) { for (let i = 0; i < lw / 6; i++) { const x = Math.floor(hash(i * 3.3) * lw), y = Math.floor(hash(i * 7.1) * lh * 0.5); g.fillStyle = (Math.floor(o.t * 2 + i) % 7) ? '#d8dcff' : '#ffffff'; g.fillRect(x, y, 1, 1) } }
  // słońce / księżyc z pikselową poświatą
  const sx = Math.round(lw * 0.78), sy = Math.round(lh * 0.22), r = Math.max(3, Math.round(lh * 0.07))
  const halo = night ? 'rgba(220,226,255,.18)' : 'rgba(255,248,210,.35)'
  for (let ring = 2; ring >= 0; ring--) { const rr = r + 2 + ring * 2; g.fillStyle = halo; for (let y = -rr; y <= rr; y++) { const hw = Math.floor(Math.sqrt(rr * rr - y * y)); g.fillRect(sx - hw, sy + y, hw * 2 + 1, 1) } }
  g.fillStyle = night ? '#e8ecff' : '#fffbe0'
  for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(sx - hw, sy + y, hw * 2 + 1, 1) }
  if (night) { g.fillStyle = '#c8cce8'; g.fillRect(sx - 1, sy - 1, 2, 2); g.fillRect(sx + 1, sy + 1, 1, 1) }
  // chmury
  for (let i = 0; i < 6; i++) {
    const cv = cloud(i % 3, night)
    const span = lw + 80
    const x = Math.floor(((hash(i) * span - o.t * (2 + hash(i + 3) * 3) - sc * 0.03) % span + span) % span - 40)
    const y = Math.floor(2 + hash(i + 11) * lh * 0.22)
    g.globalAlpha = night ? 0.35 : 0.9; g.drawImage(cv, x, y); g.globalAlpha = 1
  }
  if (o.onlySky) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(low!, 0, 0, lw, lh, 0, 0, lw * o.sc, lh * o.sc); ctx.restore(); return }
  // wzgórza (perspektywa powietrzna: daleko jaśniej, bliżej ciemniej)
  const far = hex(B.far), mid = hex(B.mid), skyLo = hex(B.sky[1])
  const jag = o.biome === 'mountain' || o.biome === 'snow' || o.biome === 'volcanic'
  hills(g, lw, lh, mixRGB(far, skyLo, 0.45), sc * 0.08, lh * 0.38, 11, 100 / 1, 0.3, jag)
  hills(g, lw, lh, far, sc * 0.15, lh * 0.47, 9, 70, 1.7, jag)
  hills(g, lw, lh, mid, sc * 0.35, lh * 0.62, 6, 45, 4.1)
  if (o.biome === 'snow' || o.biome === 'mountain') { /* śnieżne czapy: najwyższe piksele warstwy dalekiej */ }
  // rekwizyty (warstwa średnia)
  if (!o.town) {
    const step = 36, off = sc * 0.6
    const first = Math.floor(off / step) - 2
    for (let i = first; i < first + lw / step + 4; i++) {
      if (hash(i) < 0.3) continue
      const v = Math.floor(hash(i + 9) * 97)
      const cv = propSprite(o.biome, v)
      const x = Math.floor(i * step - off + hash(i + 5) * 20)
      g.drawImage(cv, x - 17, lgy - 44 + 1)
    }
  }
  // ziemia: pas koloru, ciemniejsza linia horyzontu, tekstura (kamyki, kępki), ścieżka
  const gc = hex(B.ground), gc2 = hex(B.ground2)
  g.fillStyle = css(gc); g.fillRect(0, lgy, lw, lh - lgy)
  g.fillStyle = css(tone(gc, -0.18)); g.fillRect(0, lgy, lw, 1)
  g.fillStyle = css(tone(gc, 0.12)); g.fillRect(0, lgy + 1, lw, 1)
  const goff = Math.floor(sc)
  for (let x = -2; x < lw + 2; x++) {
    const wx = x + goff
    const r1 = hash(wx * 0.913)
    if (r1 > 0.82) { g.fillStyle = css(gc2); g.fillRect(x, lgy + 2 + Math.floor(hash(wx * 1.7) * Math.max(1, lh - lgy - 3)), 2, 1) }
    else if (r1 > 0.78) { g.fillStyle = css(tone(gc, 0.2)); g.fillRect(x, lgy + 3 + Math.floor(hash(wx * 2.3) * Math.max(1, lh - lgy - 4)), 1, 1) }
  }
  if (o.biome === 'volcanic') { g.fillStyle = B.prop2; for (let i = -1; i < lw / 30 + 2; i++) g.fillRect(Math.floor(i * 30 - (goff % 30)), lgy + 4, 7, 1) }
  if (o.biome === 'coast') { g.fillStyle = '#4a8ac0'; g.fillRect(0, lgy - 2, lw, 2); g.fillStyle = '#e8f4ff'; for (let x = 0; x < lw; x += 7) g.fillRect(x + (Math.floor(o.t * 3) % 7), lgy - 2, 2, 1) }
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(low!, 0, 0, lw, lh, 0, 0, lw * o.sc, lh * o.sc)
  ctx.restore()
}

// trawa na pierwszym planie (przed postaciami), w pikselach sprite'ów
export function drawForeground(ctx: CanvasRenderingContext2D, o: BackOpts) {
  const B = BIOMES[o.biome]
  if (o.biome === 'desert' || o.biome === 'volcanic' || o.biome === 'snow') return
  const c = css(tone(hex(B.ground2), -0.25)), c2 = css(tone(hex(B.ground), 0.1))
  const off = o.scroll * 1.2 / o.sc
  const lw = Math.ceil(o.w / o.sc), lh = Math.ceil(o.h / o.sc)
  for (let i = Math.floor(off / 5) - 1; i < Math.floor(off / 5) + lw / 5 + 2; i++) {
    if (hash(i * 3.1) < 0.5) continue
    const x = Math.floor(i * 5 - off)
    const hh = 2 + Math.floor(hash(i) * 3)
    ctx.fillStyle = c; ctx.fillRect(x * o.sc, (lh - hh) * o.sc, o.sc, hh * o.sc); ctx.fillRect((x + 1) * o.sc, (lh - hh + 1) * o.sc, o.sc, (hh - 1) * o.sc)
    ctx.fillStyle = c2; ctx.fillRect(x * o.sc, (lh - hh) * o.sc, o.sc, o.sc)
  }
}

// ---------------------------------------------------------------- miasta: zabudowa w zależności od frakcji
export type TownStyle = 'alliance' | 'horde' | 'undercity'
function building(style: TownStyle, v: number, capital: boolean) {
  return spr(`bld|${style}|${v}|${capital}`, () => {
    const g = new Grid(64, 74)
    const F = g.h - 1
    if (style === 'alliance') {
      const wall: RGB = [208, 198, 180], wallD: RGB = [150, 140, 124], roof: RGB = [42, 74, 138], wood: RGB = [90, 74, 58]
      const w = 30 + (v % 2) * 8, h = capital ? 26 : 18, x = 32 - w / 2
      g.box(x, F - h, w, h, wall, 0.15, -0.25)
      for (let k = 0; k < 3; k++) g.rect(x + 4 + k * Math.floor(w / 3), F - h, 2, h, wood)
      g.rect(x, F - h + 7, w, 1, wood)
      for (let y = 0; y < 12; y++) g.rect(x - 2 + y, F - h - y, w + 4 - y * 2, 1, y % 3 ? roof : tone(roof, 0.15))
      g.box(x + w - 10, F - h + 9, 5, 5, [255, 215, 112]); g.rect(x + w - 8, F - h + 9, 1, 5, wood)
      g.box(x + 5, F - 9, 6, 9, tone(wood, -0.1))
      if (capital) { g.box(x + w - 4, F - h - 22, 8, h + 22, wallD, 0.2, -0.3); for (let y = 0; y < 8; y++) g.rect(x + w - 6 + y, F - h - 22 - y, 12 - y * 2, 1, roof); g.rect(x + w + 3, F - h - 36, 1, 6, wood); g.rect(x + w + 4, F - h - 36, 5, 3, [58, 102, 180]) }
    } else if (style === 'horde') {
      const hide: RGB = [168, 118, 70], hideD: RGB = [120, 80, 46], pole: RGB = [90, 60, 36], red: RGB = [176, 28, 28]
      const w = 28 + (v % 2) * 6, h = capital ? 30 : 22
      for (let y = 0; y < h; y++) { const ww = Math.round(w * (y / h)); g.rect(32 - ww / 2, F - h + y, ww, 1, y % 6 ? hide : hideD) }
      g.box(30, F - 9, 5, 9, [60, 36, 20])
      for (let i = 0; i < 3; i++) g.rect(25 + i * 6, F - h + 10 + i * 2, 4, 1, red)
      g.line(32, F - h, 32, F - h - 6, pole, 1); g.line(32, F - h - 6, 28, F - h - 10, pole, 1); g.line(32, F - h - 6, 36, F - h - 10, pole, 1)
      const bone: RGB = [232, 220, 192]
      g.line(32 - w / 2 + 2, F, 32 - w / 2 - 4, F - 12, bone, 2); g.line(32 + w / 2 - 2, F, 32 + w / 2 + 4, F - 12, bone, 2)
      if (capital || v % 2) { g.rect(52, F - 26, 1, 26, pole); g.box(53, F - 25, 6, 9, red); g.set(55, F - 22, [20, 12, 10]) }
    } else {
      const st: RGB = [58, 63, 55], stD: RGB = [42, 46, 40], glow: RGB = [90, 200, 58]
      const w = 34, h = capital ? 30 : 22, x = 15
      g.box(x, F - h, w, h, st, 0.15, -0.25)
      for (let y = 0; y < 10; y++) { const hw = Math.round(Math.sqrt(100 - y * y) * 1.6); g.rect(32 - hw, F - h - y, hw * 2, 1, y % 3 ? stD : st) }
      g.rect(28, F - 14, 8, 14, [20, 24, 18]); g.rect(29, F - 13, 6, 12, glow); g.rect(30, F - 12, 4, 10, tone(glow, 0.3))
      g.rect(x + 3, F - h + 4, 2, h - 4, stD); g.rect(x + w - 5, F - h + 4, 2, h - 4, stD)
      g.set(x + 8, F - h + 8, glow); g.set(x + w - 9, F - h + 8, glow)
    }
    g.outline(OUT)
    return g
  })
}
export function drawTown(ctx: CanvasRenderingContext2D, o: BackOpts, style: TownStyle, capital: boolean) {
  const lw = Math.ceil(o.w / o.sc), lgy = Math.round(o.gy / o.sc)
  const step = 70
  ctx.save(); ctx.imageSmoothingEnabled = false
  for (let i = 0; i < Math.ceil(lw / step) + 1; i++) {
    const cv = building(style, i, capital && i % 2 === 0)
    const x = i * step - 20 + Math.floor(hash(i) * 10)
    ctx.drawImage(cv, x * o.sc, (lgy - cv.height + 1) * o.sc, cv.width * o.sc, cv.height * o.sc)
  }
  // droga
  ctx.fillStyle = 'rgba(80,60,40,.45)'; ctx.fillRect(0, lgy * o.sc, o.w, 3 * o.sc)
  ctx.restore()
}

// ---------------------------------------------------------------- statek i zeppelin
export function shipSprite(horde: boolean) {
  return spr(`ship|${horde}`, () => {
    const g = new Grid(120, 64), F = 50
    const hull: RGB = [90, 58, 30], hullD: RGB = [58, 36, 14], sail: RGB = horde ? [168, 50, 42] : [232, 224, 204]
    for (let y = 0; y < 12; y++) { const inset = Math.round(y * y / 14); g.rect(6 + inset, F - 12 + y, 108 - inset * 2 + (y < 3 ? 6 : 0), 1, y % 4 === 0 ? hullD : hull) }
    g.rect(4, F - 14, 116, 2, hullD)
    for (let i = 0; i < 8; i++) g.rect(16 + i * 12, F - 9, 4, 2, [30, 20, 10])
    for (const mx of [40, 80]) {
      g.box(mx, F - 50, 3, 37, hullD)
      for (let y = 0; y < 26; y++) { const bulge = Math.round(Math.sin((y / 26) * Math.PI) * 5); g.rect(mx - 15, F - 47 + y, 30 + bulge, 1, y % 7 ? sail : tone(sail, -0.12)) }
      g.rect(mx - 16, F - 48, 34, 1, hullD); g.rect(mx - 16, F - 21, 34, 1, hullD)
      if (horde) g.set(mx, F - 36, [20, 12, 10])
    }
    g.line(112, F - 14, 119, F - 30, hullD, 1)
    g.rect(82, F - 56, 1, 6, hullD); g.rect(83, F - 56, 6, 3, horde ? [176, 28, 28] : [58, 102, 180])
    g.outline(OUT)
    return g
  })
}
export function zeppelinSprite() {
  return spr('zep', () => {
    const g = new Grid(130, 60), cy = 22
    const bal: RGB = [200, 80, 58], balD: RGB = [110, 30, 20], gold: RGB = [224, 176, 64]
    g.ellipse(62, cy, 52, 14, bal)
    for (let y = -13; y <= 13; y++) { const hw = Math.floor(52 * Math.sqrt(1 - (y / 14) ** 2)); if (y > 6) g.rect(62 - hw, cy + y, hw * 2, 1, tone(bal, -0.25)) }
    for (const k of [-2, -1, 0, 1, 2]) for (let y = -12; y <= 12; y++) { const hw = Math.floor(52 * Math.sqrt(1 - (y / 14) ** 2)); if (Math.abs(k * 18) < hw) g.set(62 + k * 18, cy + y, gold) }
    g.line(10, cy, 2, cy - 12, balD, 3); g.line(10, cy, 2, cy + 11, balD, 3)
    // gondola z pokładem pod balonem
    g.box(36, cy + 18, 52, 8, [106, 74, 42], 0.2, -0.3)
    for (let i = 0; i < 6; i++) g.line(42 + i * 8, cy + 12, 40 + i * 9, cy + 18, [58, 42, 26], 1)
    g.rect(36, cy + 16, 52, 1, [58, 42, 26])
    g.outline(OUT)
    return g
  })
}
export function drawSea(ctx: CanvasRenderingContext2D, o: BackOpts, seaY: number) {
  const lw = Math.ceil(o.w / o.sc), lh = Math.ceil(o.h / o.sc), sy = Math.round(seaY / o.sc)
  const g = lowCanvas(lw, lh)
  g.clearRect(0, 0, lw, lh)
  const top: RGB = [42, 106, 154], bot: RGB = [10, 42, 74]
  g.fillStyle = skyPattern(g, top, bot, Math.max(2, lh - sy)); g.save(); g.translate(0, sy); g.fillRect(0, 0, lw, lh - sy); g.restore()
  for (let row = 0; row < 3; row++) {
    g.fillStyle = row ? 'rgba(220,240,255,.45)' : 'rgba(240,250,255,.8)'
    const off = Math.floor(o.scroll / o.sc * (1 + row * 0.3))
    for (let x = -10; x < lw + 10; x += 11) { const xx = ((x - off) % (lw + 20) + lw + 20) % (lw + 20) - 10; g.fillRect(xx, sy + 2 + row * 4 + ((x / 11) % 2 ? 1 : 0), 4 - row, 1) }
  }
  ctx.save(); ctx.imageSmoothingEnabled = false
  ctx.drawImage(low!, 0, sy, lw, lh - sy, 0, sy * o.sc, lw * o.sc, (lh - sy) * o.sc)
  ctx.restore()
}
