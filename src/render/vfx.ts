// Pikselowe efekty walki: pociski czarów i strzały, trafienia, cięcia broni, promienie, błyskawice,
// czary obszarowe, leczenie i buffy. Rysowane w siatce pikseli sprite'ów (u = rozmiar jednego piksela).
import type { School } from '../data/classes'

// paleta szkół: ciemny, średni, jasny, rdzeń
export const PAL: Record<School, [string, string, string, string]> = {
  fire: ['#8a1a08', '#e04010', '#ff9a20', '#fff0a0'],
  frost: ['#1a4a8a', '#3a9ae0', '#9adcff', '#ffffff'],
  arcane: ['#6a1a8a', '#c040e0', '#ff9af0', '#fff0ff'],
  shadow: ['#1a0a2a', '#4a1a7a', '#9a5ae0', '#e0c0ff'],
  holy: ['#8a6a10', '#e0b030', '#ffe680', '#ffffff'],
  nature: ['#1a5a10', '#40a020', '#9ae050', '#f0ffd0'],
  physical: ['#4a4a4a', '#9a9a9a', '#dcdcdc', '#ffffff'],
}

export type ProjKind = 'orb' | 'frostbolt' | 'shadow' | 'arcane' | 'arrow' | 'bullet' | 'thrown' | 'wand' | 'hammer' | 'skull'
export type Proj = { kind: ProjKind; school: School; x0: number; y0: number; x1: number; y1: number; t: number; dur: number; crit: boolean; arc: number; trail: { x: number; y: number; life: number }[]; onHit?: () => void; big?: number; tint?: School }
export type HitKind = 'burst' | 'slash' | 'beam' | 'bolt' | 'shock' | 'aoe' | 'tick' | 'spark' | 'heal' | 'buff' | 'claw' | 'judgement' | 'nova' | 'shout' | 'channel' | 'swarm' | 'cone' | 'arrows' | 'sparkle'
export type Hit = { kind: HitKind; school: School; x: number; y: number; gy: number; life: number; max: number; crit: boolean; seed: number; x0?: number; y0?: number; w?: number; drain?: boolean }

const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

// Jakim efektem pokazać czar o danej nazwie (sprawdzone dla wszystkich czarów dystansowych każdej klasy)
const BEAM = /smite|holy fire|moonfire|starfire|exorcism|immolate/i
const BOLT = /lightning|overload|chain/i
const SHOCK = /shock|mind blast|shadow word|seal|flame shock|frost shock|stormstrike|devouring|corruption|curse|faerie|fire blast|scorch|searing pain|conflagrate|shadowburn|entangl|polymorph|silence|repentance|voice of truth/i
const NOVA = /nova|hellfire|blast wave|arcane explosion|holy wrath|thunder clap|consecration/i
const AOE = /blizzard|rain of fire|flamestrike|trap|whirlwind|cleave|hurricane|swipe/i
const CHANNEL = /drain|mind flay|siphon/i

export type Look = { hit: HitKind | null; proj: ProjKind | null; big?: number; at?: 'hero' }
export function spellLook(name: string | undefined, school: School): Look {
  const n = name ?? ''
  if (/judgement/i.test(n)) return { hit: 'judgement', proj: null }
  if (/hammer of wrath|hammer of justice/i.test(n)) return { hit: null, proj: 'hammer' }
  if (/death coil/i.test(n)) return { hit: null, proj: 'skull' }
  if (/volley/i.test(n)) return { hit: 'arrows', proj: null }
  if (/cone of cold/i.test(n)) return { hit: 'cone', proj: null }
  if (/insect swarm/i.test(n)) return { hit: 'swarm', proj: null }
  if (CHANNEL.test(n)) return { hit: 'channel', proj: null }
  if (NOVA.test(n)) return { hit: 'nova', proj: null, at: /consecration|thunder clap/i.test(n) ? undefined : 'hero' }
  if (AOE.test(n)) return { hit: 'aoe', proj: null }
  if (BOLT.test(n) && school === 'nature') return { hit: 'bolt', proj: null }
  if (BEAM.test(n)) return { hit: 'beam', proj: null }
  if (SHOCK.test(n)) return { hit: 'shock', proj: null }
  const big = /pyroblast|soul fire|lava burst|arcane blast/i.test(n) ? 2 : undefined
  if (school === 'frost') return { hit: null, proj: 'frostbolt', big }
  if (school === 'shadow') return { hit: null, proj: 'shadow', big }
  if (school === 'arcane') return { hit: null, proj: 'arcane', big }
  return { hit: null, proj: 'orb', big }
}

export class Vfx {
  projs: Proj[] = []
  hits: Hit[] = []
  t = 0
  constructor(private ctx: () => CanvasRenderingContext2D) {}

  proj(p: Omit<Proj, 't' | 'trail'>) { this.projs.push({ ...p, t: 0, trail: [] }); if (this.projs.length > 24) this.projs.shift() }
  hit(h: Omit<Hit, 'max' | 'seed'> & { max?: number }) {
    this.hits.push({ ...h, max: h.max ?? h.life, seed: Math.random() * 1000 })
    if (this.hits.length > 40) this.hits.shift()
  }

  update(dt: number, u: number) {
    this.t += dt
    const c = this.ctx()
    for (const p of this.projs) {
      p.t += dt
      const k = Math.min(1, p.t / p.dur)
      const [x, y] = this.pos(p, k)
      p.trail.push({ x, y, life: 1 })
      for (const tr of p.trail) tr.life -= dt * (p.kind === 'arrow' || p.kind === 'bullet' ? 9 : 3.2)
      p.trail = p.trail.filter((tr) => tr.life > 0)
      this.drawProj(c, p, x, y, k, u)
      if (k >= 1 && p.onHit) { p.onHit(); p.onHit = undefined }
    }
    this.projs = this.projs.filter((p) => p.t < p.dur)
    for (const h of this.hits) { h.life -= dt; if (h.life > 0) this.drawHit(c, h, u) }
    this.hits = this.hits.filter((h) => h.life > 0)
  }

  private pos(p: Proj, k: number): [number, number] {
    return [p.x0 + (p.x1 - p.x0) * k, p.y0 + (p.y1 - p.y0) * k - Math.sin(Math.PI * k) * p.arc]
  }
  private px(c: CanvasRenderingContext2D, x: number, y: number, col: string, u: number, w = 1, h = 1) {
    c.fillStyle = col
    c.fillRect(Math.round(x), Math.round(y), w * u, h * u)
  }

  private drawProj(c: CanvasRenderingContext2D, p: Proj, x: number, y: number, k: number, u: number) {
    const P = PAL[p.school]
    const big = p.crit ? 1 : 0
    switch (p.kind) {
      case 'orb': case 'wand': {
        // ognista kula / pocisk różdżki: migoczący rdzeń z ogonem iskier
        for (const tr of p.trail) {
          const j = rnd(tr.x * 0.3 + tr.y) - 0.5
          this.px(c, tr.x - u, tr.y + j * 3 * u, tr.life > 0.6 ? P[2] : tr.life > 0.3 ? P[1] : P[0], u, tr.life > 0.5 ? 2 : 1, 1)
        }
        const r = (p.kind === 'wand' ? 1 : 2) + big + (p.big ?? 0)
        const fl = Math.sin(this.t * 40) > 0 ? 1 : 0
        for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) {
          const d = Math.hypot(i, j)
          if (d > r + 0.9 - fl * 0.3) continue
          this.px(c, x + i * u, y + j * u, d < r * 0.45 ? P[3] : d < r * 0.85 ? P[2] : P[1], u)
        }
        return
      }
      case 'frostbolt': {
        for (const tr of p.trail) if (rnd(tr.x + tr.y * 7) > 0.45) this.px(c, tr.x - 2 * u + (rnd(tr.x) - 0.5) * 4 * u, tr.y + (rnd(tr.y) - 0.5) * 5 * u, tr.life > 0.5 ? '#ffffff' : P[2], u)
        // lodowy grot: romb skierowany w stronę celu
        const S = big ? ['...bb...', '.bcccb..', 'bcdddccb', '.bcccb..', '...bb...'] : ['..bb..', '.bcdcb', '..bb..']
        this.pat(c, S, x, y, u, { b: P[1], c: P[2], d: P[3] })
        return
      }
      case 'shadow': {
        for (const tr of p.trail) {
          const w = Math.sin(tr.x * 0.15 + this.t * 8) * 2 * u
          this.px(c, tr.x, tr.y + w, tr.life > 0.5 ? P[2] : P[1], u)
          if (tr.life > 0.7) this.px(c, tr.x, tr.y - w, P[0], u)
        }
        const S = ['.aaa.', 'abcba', 'acdca', 'abcba', '.aaa.']
        this.pat(c, S, x, y, u * (big ? 1.5 : 1), { a: P[0], b: P[1], c: P[2], d: P[3] })
        return
      }
      case 'arcane': {
        // pociski arkanów: trzy wirujące iskry
        for (const tr of p.trail) if (tr.life > 0.4) this.px(c, tr.x, tr.y + Math.sin(tr.x * 0.3) * 2 * u, P[1], u)
        for (let i = 0; i < 3; i++) {
          const a = this.t * 18 + (i * Math.PI * 2) / 3
          this.pat(c, ['.a.', 'aba', '.a.'], x + Math.cos(a) * 3 * u, y + Math.sin(a) * 3 * u, u, { a: P[2], b: P[3] })
        }
        return
      }
      case 'arrow': {
        const [x2, y2] = this.pos(p, Math.max(0, k - 0.04))
        let dx = x - x2, dy = y - y2
        const L = Math.hypot(dx, dy) || 1
        dx /= L; dy /= L
        const n = 9
        for (let i = 0; i < n; i++) {
          const col = i < 2 ? '#e8e8e8' : i < n - 2 ? '#8a5a2a' : '#c0c8d0'
          this.px(c, x - dx * (n - 1 - i) * u, y - dy * (n - 1 - i) * u, col, u)
        }
        this.px(c, x - dx * (n - 1) * u, y - dy * (n - 1) * u - u, '#ffffff', u) // lotka
        this.px(c, x + dx * u, y + dy * u, '#ffffff', u) // grot
        if (p.crit) for (const tr of p.trail) this.px(c, tr.x, tr.y, `rgba(255,230,120,${tr.life * 0.6})`, u)
        if (p.tint && p.tint !== 'physical') { const T = PAL[p.tint]; for (const tr of p.trail) { this.px(c, tr.x, tr.y + (rnd(tr.x) - 0.5) * 3 * u, tr.life > 0.5 ? T[2] : T[1], u) } this.pat(c, ['.a.', 'aba', '.a.'], x + dx * u, y + dy * u, u, { a: T[2], b: T[3] }) }
        return
      }
      case 'hammer': {
        // młot światła: obraca się w locie, zostawia złote iskry
        for (const tr of p.trail) if (rnd(tr.x * 3) > 0.5) this.px(c, tr.x, tr.y + (rnd(tr.y) - 0.5) * 6 * u, tr.life > 0.5 ? '#fff6c0' : '#e0b030', u)
        const q = Math.floor(this.t * 16) % 4
        const H = [['aaa.', 'aaa.', '.b..', '.b..'], ['..aa', 'bbaa', '..aa', '....'], ['..b.', '..b.', '.aaa', '.aaa'], ['....', 'aa..', 'aabb', 'aa..']][q]
        this.pat(c, H, x, y, u * (p.crit ? 2 : 1.5), { a: '#ffe680', b: '#a07020' })
        return
      }
      case 'skull': {
        for (const tr of p.trail) this.px(c, tr.x, tr.y + Math.sin(tr.x * 0.2 + this.t * 9) * 2 * u, tr.life > 0.5 ? P[2] : P[0], u)
        this.pat(c, ['.aaa.', 'abaab', 'aaaaa', '.a.a.'], x, y, u * 1.5, { a: '#e8dcff', b: '#2a0a40' })
        return
      }
      case 'bullet': {
        for (const tr of p.trail) this.px(c, tr.x, tr.y, `rgba(255,220,140,${tr.life * 0.7})`, u)
        this.px(c, x - u, y, '#fff6c0', u, 2, 1)
        return
      }
      case 'thrown': {
        const q = Math.floor(this.t * 20) % 4
        const R = [['a..', '.b.', '..c'], ['.a.', '.b.', '.c.'], ['..a', '.b.', 'c..'], ['...', 'abc', '...']][q]
        this.pat(c, R, x, y, u, { a: '#e0e0e0', b: '#9a9aa0', c: '#6a4a2a' })
        return
      }
    }
  }

  private pat(c: CanvasRenderingContext2D, rows: string[], x: number, y: number, u: number, pal: Record<string, string>) {
    const w = rows[0].length, h = rows.length
    const x0 = Math.round(x - (w * u) / 2), y0 = Math.round(y - (h * u) / 2)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const col = pal[rows[j][i]]
      if (col) { c.fillStyle = col; c.fillRect(x0 + i * u, y0 + j * u, Math.ceil(u), Math.ceil(u)) }
    }
  }

  private drawHit(c: CanvasRenderingContext2D, h: Hit, u: number) {
    const P = PAL[h.school]
    const k = 1 - h.life / h.max // 0 → 1
    const a = Math.max(0, h.life / h.max)
    c.save()
    switch (h.kind) {
      case 'burst': case 'shock': {
        const n = h.kind === 'shock' ? 14 : h.crit ? 14 : 9
        const R = (h.kind === 'shock' ? 14 : h.crit ? 13 : 9) * u
        if (k < 0.25) { c.globalAlpha = 1 - k * 4; this.pat(c, ['.a.', 'aba', '.a.'], h.x, h.y, u * (h.crit || h.kind === 'shock' ? 3 : 2), { a: P[2], b: P[3] }) }
        c.globalAlpha = a
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + rnd(h.seed + i) * 0.5
          const d = R * (0.3 + k * (0.7 + rnd(h.seed + i * 3) * 0.5))
          this.px(c, h.x + Math.cos(ang) * d, h.y + Math.sin(ang) * d * 0.8 + k * k * 6 * u, k < 0.4 ? P[3] : k < 0.7 ? P[2] : P[1], u)
        }
        break
      }
      case 'tick': {
        c.globalAlpha = a
        for (let i = 0; i < 4; i++) this.px(c, h.x + (rnd(h.seed + i) - 0.5) * 12 * u, h.y - k * 10 * u - rnd(h.seed + i * 5) * 6 * u, i % 2 ? P[2] : P[1], u)
        break
      }
      case 'slash': {
        // łuk cięcia broni: półksiężyc zamiatany od góry do dołu
        const R = (h.crit ? 14 : 11) * u
        const from = -1.9, to = 1.1
        const head = from + (to - from) * Math.min(1, k * 2.2)
        const tail = from + (to - from) * Math.max(0, k * 2.2 - 0.6)
        for (let t = tail; t <= head; t += 0.07) {
          const fade = (t - tail) / Math.max(0.01, head - tail)
          const x = h.x - Math.cos(t) * R * 0.55, y = h.y + Math.sin(t) * R
          this.px(c, x, y, fade > 0.7 ? '#ffffff' : h.crit ? '#ffd040' : '#c8d0e0', u, h.crit ? 2 : 1, 1)
          if (h.crit && fade > 0.4) this.px(c, x + 2 * u, y, '#fff6a0', u)
        }
        break
      }
      case 'claw': {
        // cios wroga w postać: krótkie czerwone iskry
        c.globalAlpha = a
        for (let i = 0; i < 6; i++) {
          const ang = Math.PI * (0.6 + rnd(h.seed + i) * 0.8)
          const d = (3 + k * 9) * u
          this.px(c, h.x + Math.cos(ang) * d, h.y + Math.sin(ang) * d * 0.7, i % 2 ? '#ffffff' : '#ff5040', u)
        }
        break
      }
      case 'beam': {
        // promień z nieba (Smite, Moonfire, Starfire, Holy Fire)
        const w = (h.crit ? 7 : 5) * u * (k < 0.2 ? k / 0.2 : 1)
        c.globalAlpha = a
        c.fillStyle = P[1]; c.fillRect(Math.round(h.x - w / 2 - u), 0, Math.round(w + 2 * u), h.gy)
        c.fillStyle = P[2]; c.fillRect(Math.round(h.x - w / 2), 0, Math.round(w), h.gy)
        c.fillStyle = P[3]; c.fillRect(Math.round(h.x - u), 0, Math.ceil(2 * u), h.gy)
        for (let i = 0; i < 8; i++) this.px(c, h.x + (rnd(h.seed + i) - 0.5) * 22 * u, h.gy - rnd(h.seed + i * 2) * 20 * u - k * 8 * u, P[3], u)
        c.globalAlpha = a * 0.6
        c.fillStyle = P[2]; c.fillRect(Math.round(h.x - 10 * u), Math.round(h.gy - u), Math.round(20 * u), Math.ceil(2 * u))
        break
      }
      case 'bolt': {
        // błyskawica z dłoni do celu, przeskakuje co 50 ms
        const segs = 9
        const sd = Math.floor(this.t * 20) + h.seed
        const x0 = h.x0 ?? h.x, y0 = h.y0 ?? h.y
        let px0 = x0, py0 = y0
        c.globalAlpha = a
        for (let i = 1; i <= segs; i++) {
          const f = i / segs
          const x = x0 + (h.x - x0) * f, y = y0 + (h.y - y0) * f + (i < segs ? (rnd(sd + i) - 0.5) * 14 * u : 0)
          this.line(c, px0, py0, x, y, '#7ab8ff', u * 3)
          this.line(c, px0, py0, x, y, '#ffffff', u)
          px0 = x; py0 = y
        }
        break
      }
      case 'aoe': {
        // czar obszarowy pod wrogiem: pierścień i deszcz cząstek w kolorze szkoły
        const W = (h.w ?? 40) * 0.5 + k * 10 * u
        c.globalAlpha = a * 0.5
        c.fillStyle = P[1]
        for (let x = -W; x <= W; x += u) {
          const yy = Math.sqrt(Math.max(0, 1 - (x / W) ** 2)) * 4 * u
          c.fillRect(Math.round(h.x + x), Math.round(h.gy - yy), Math.ceil(u), Math.ceil(u))
          c.fillRect(Math.round(h.x + x), Math.round(h.gy + yy - u), Math.ceil(u), Math.ceil(u))
        }
        c.globalAlpha = a
        for (let i = 0; i < 14; i++) {
          const fx = h.x + (rnd(h.seed + i) - 0.5) * 2 * W
          const fall = ((k * 1.8 + rnd(h.seed + i * 7)) % 1)
          const y = h.gy - (1 - fall) * 30 * u
          this.px(c, fx, y, i % 3 === 0 ? P[3] : P[2], u, 1, h.school === 'frost' || h.school === 'fire' ? 2 : 1)
        }
        break
      }
      case 'heal': {
        c.globalAlpha = a
        for (let i = 0; i < 6; i++) {
          const x = h.x + (rnd(h.seed + i) - 0.5) * 22 * u, y = h.gy - 4 * u - k * 26 * u - rnd(h.seed + i * 3) * 14 * u
          this.pat(c, ['.a.', 'aba', '.a.'], x, y, u, { a: i % 2 ? '#40d040' : '#a0ff80', b: '#ffffff' })
        }
        c.globalAlpha = a * 0.7
        const W = 12 * u + k * 6 * u
        for (let x = -W; x <= W; x += u) {
          const yy = Math.sqrt(Math.max(0, 1 - (x / W) ** 2)) * 3 * u
          this.px(c, h.x + x, h.gy - yy, '#7dff6a', u)
          this.px(c, h.x + x, h.gy + yy - u, '#3a9a2a', u)
        }
        break
      }
      case 'buff': {
        // buff: złota spirala wznosząca się wokół postaci
        c.globalAlpha = a
        for (let i = 0; i < 16; i++) {
          const f = i / 16
          const ang = f * Math.PI * 4 + this.t * 6
          const y = h.gy - (f * 34 * u) * Math.min(1, k * 2)
          this.px(c, h.x + Math.cos(ang) * 10 * u, y, Math.sin(ang) > 0 ? P[3] : P[1], u)
        }
        break
      }
      case 'judgement': {
        // Judgement: młot ze światła spada z nieba na wroga, potem rozbłysk i runiczny krąg
        const fall = Math.min(1, k / 0.3)
        const hy = h.gy * 0.05 + (h.y - 6 * u - h.gy * 0.05) * fall
        c.globalAlpha = Math.min(1, a * 1.4)
        c.fillStyle = 'rgba(255,230,140,.35)'; c.fillRect(Math.round(h.x - 2 * u), 0, Math.ceil(4 * u), Math.round(hy))
        if (k < 0.45) this.pat(c, ['.aaaaa.', 'aabbbaa', 'aabbbaa', '..aca..', '...c...', '...c...', '...c...'], h.x, hy - 4 * u, u * (h.crit ? 2 : 1.6), { a: '#ffe680', b: '#fffbe0', c: '#c89a30' })
        if (k >= 0.3) {
          const kk = (k - 0.3) / 0.7
          const R = (6 + kk * 18) * u
          for (let i = 0; i < 20; i++) { const an = (i / 20) * Math.PI * 2; this.px(c, h.x + Math.cos(an) * R, h.y + Math.sin(an) * R * 0.5, i % 2 ? '#fff6c0' : '#e0b030', u) }
          for (let i = 0; i < 10; i++) { const an = rnd(h.seed + i) * Math.PI * 2, d = kk * (10 + rnd(h.seed + i * 3) * 12) * u; this.px(c, h.x + Math.cos(an) * d, h.y + Math.sin(an) * d - kk * 6 * u, '#ffffff', u) }
          // runy na ziemi
          c.globalAlpha = a * 0.8
          for (let x = -12; x <= 12; x += 3) this.px(c, h.x + x * u, h.gy - u, (x / 3) % 2 ? '#ffe680' : '#c89a30', u, 2, 1)
        }
        break
      }
      case 'nova': {
        // pierścień rozchodzący się po ziemi wokół postaci (Frost Nova, Hellfire, Holy Nova, Arcane Explosion...)
        const R = (6 + k * 46) * u
        c.globalAlpha = a
        for (let i = 0; i < 40; i++) {
          const an = (i / 40) * Math.PI * 2
          const x = h.x + Math.cos(an) * R, y = h.gy - 3 * u + Math.sin(an) * R * 0.22
          this.px(c, x, y - (h.school === 'fire' ? rnd(h.seed + i + Math.floor(this.t * 20)) * 6 * u : 0), i % 3 ? P[2] : P[3], u, 1, h.school === 'frost' ? 3 : 2)
        }
        c.globalAlpha = a * 0.25; c.fillStyle = P[1]
        c.beginPath(); c.ellipse(h.x, h.gy - 3 * u, R, R * 0.22, 0, 0, Math.PI * 2); c.fill()
        break
      }
      case 'shout': {
        // okrzyk: łuki fali dźwiękowej w stronę wroga
        c.globalAlpha = a
        for (let j = 0; j < 3; j++) {
          const R = (6 + (k * 3 + j) % 3 * 10) * u
          for (let t = -0.8; t <= 0.8; t += 0.12) this.px(c, h.x + Math.cos(t) * R, h.y + Math.sin(t) * R, j === 0 ? P[3] : P[2], u)
        }
        break
      }
      case 'channel': {
        // kanałowany czar: falujący strumień między dłonią a celem; przy wysysaniu cząstki płyną do postaci
        const x0 = h.x0 ?? h.x, y0 = h.y0 ?? h.y
        c.globalAlpha = Math.min(1, a * 1.5)
        const n = 26
        for (let i = 0; i <= n; i++) {
          const f = i / n
          const x = x0 + (h.x - x0) * f, y = y0 + (h.y - y0) * f + Math.sin(f * 12 + this.t * 14) * 2.5 * u * Math.sin(f * Math.PI)
          this.px(c, x, y, i % 2 ? P[1] : P[2], u)
        }
        for (let i = 0; i < 6; i++) {
          let f = (this.t * 1.6 + i / 6) % 1
          if (h.drain) f = 1 - f
          const x = x0 + (h.x - x0) * f, y = y0 + (h.y - y0) * f + Math.sin(f * 12 + this.t * 14) * 2.5 * u * Math.sin(f * Math.PI)
          this.pat(c, ['.a.', 'aba', '.a.'], x, y, u, { a: h.drain ? '#60ff60' : P[2], b: P[3] })
        }
        break
      }
      case 'swarm': {
        c.globalAlpha = a
        for (let i = 0; i < 14; i++) {
          const an = this.t * (5 + (i % 4)) + i * 1.3, R = (4 + (i % 5) * 2) * u
          this.px(c, h.x + Math.cos(an) * R, h.y - 4 * u + Math.sin(an * 1.3) * R * 0.6, i % 3 ? '#2a3a10' : '#9ae050', u)
        }
        break
      }
      case 'cone': {
        // stożek mrozu z dłoni w stronę wroga
        const x0 = h.x0 ?? h.x - 40 * u, y0 = h.y0 ?? h.y
        c.globalAlpha = a
        for (let i = 0; i < 30; i++) {
          const f = ((k * 1.5 + rnd(h.seed + i)) % 1)
          const spread = (rnd(h.seed + i * 7) - 0.5) * f * 22 * u
          this.px(c, x0 + (h.x - x0) * f, y0 + (h.y - y0) * f + spread, i % 3 ? P[2] : P[3], u, 1 + (f > 0.6 ? 1 : 0), 1)
        }
        break
      }
      case 'arrows': {
        // Volley: deszcz strzał spadających na grupę
        const W = (h.w ?? 40) * 0.5 + 6 * u
        c.globalAlpha = a
        for (let i = 0; i < 12; i++) {
          const fx = h.x + (rnd(h.seed + i) - 0.5) * 2 * W
          const fall = (k * 2.2 + rnd(h.seed + i * 5)) % 1
          const y = h.gy - (1 - fall) * 40 * u
          for (let j = 0; j < 6; j++) this.px(c, fx - j * u * 0.6, y - j * u, j === 0 ? '#c0c8d0' : j > 4 ? '#ffffff' : '#8a5a2a', u)
          if (h.school !== 'physical' && fall > 0.85) this.px(c, fx, h.gy - 2 * u, P[2], u, 2, 1)
        }
        break
      }
      case 'sparkle': {
        c.globalAlpha = a
        for (let i = 0; i < 9; i++) {
          const an = rnd(h.seed + i) * Math.PI * 2, d = (2 + k * 10 + rnd(h.seed + i * 2) * 6) * u
          this.pat(c, ['.a.', 'aba', '.a.'], h.x + Math.cos(an) * d, h.y + Math.sin(an) * d * 0.7 - k * 4 * u, u, { a: P[2], b: P[3] })
        }
        break
      }
      case 'spark': {
        c.globalAlpha = a
        for (let i = 0; i < 5; i++) this.px(c, h.x + (rnd(h.seed + i) - 0.5) * 8 * u, h.y - k * 8 * u + (rnd(h.seed + i * 3) - 0.5) * 8 * u, P[2], u)
        break
      }
    }
    c.restore()
  }

  private line(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, w: number) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, w * 0.6)))
    c.fillStyle = col
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n
      c.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), Math.ceil(w), Math.ceil(w))
    }
  }
}
