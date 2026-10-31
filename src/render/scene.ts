// Scena na pasku: proceduralny pixel-art (bez zewnętrznych assetów). Rysuje tło strefy z paralaksą,
// bohatera, pupila, moba, pociski czarów i latające liczby. Sterowana zdarzeniami z symulacji.
import { classById, type School } from '../data/classes'
import { raceById } from '../data/races'
import type { Biome, MobType } from '../data/zones'
import { currentZone, activePet } from '../game/sim'
import { zoneById } from '../data/zones'
import { townOf } from '../game/world'
import type { GameEvent, GameState } from '../game/types'
import { RARITY_COLOR } from '../game/types'

type Float = { x: number; y: number; vy: number; text: string; color: string; life: number; max: number; size: number }
type Proj = { x: number; y: number; tx: number; color: string; life: number }
type Corpse = { type: MobType; color: string; x: number; life: number; count: number }
type Fx = { kind: 'levelup' | 'heal' | 'racial' | 'death'; life: number; text?: string }

const SCHOOL_COLOR: Record<School, string> = {
  physical: '#ffffff', fire: '#ff7a1a', frost: '#7fd4ff', arcane: '#ff8af0', shadow: '#a066ff', holy: '#ffe680', nature: '#7dff6a',
}

const BIOMES: Record<Biome, { sky: [string, string]; far: string; mid: string; ground: string; ground2: string; prop: string; prop2: string }> = {
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

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}
function townLabel(s: GameState) {
  const z = zoneById(s.loc.zone)
  return townOf(z, s.hero.faction) ?? z.name
}
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

export class Scene {
  ctx: CanvasRenderingContext2D
  w = 0
  h = 0
  dpr = 1
  scroll = 0
  t = 0
  floats: Float[] = []
  projs: Proj[] = []
  corpses: Corpse[] = []
  fx: Fx[] = []
  mobX = 0
  mobFlash = 0
  heroLunge = 0
  castGlow = 0
  castColor = '#fff'
  lastMob = ''

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = w
    this.h = h
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
  }

  get heroX() { return Math.max(60, Math.min(this.w * 0.32, 260)) }
  get groundY() { return this.h - 14 }
  zoom = 0
  get px() { return this.zoom || Math.max(2, Math.round(this.h / 34)) }

  mobTarget(s: GameState) {
    const st = classById(s.hero.cls).style
    return this.heroX + (st === 'melee' ? 44 : 120) * (this.px / 2)
  }

  onEvent(e: GameEvent, s: GameState) {
    const hx = this.heroX
    const mx = this.mobX
    const top = this.groundY - 20 * this.px
    const add = (x: number, text: string, color: string, size = 12) => this.floats.push({ x: x + (Math.random() * 16 - 8), y: top, vy: -18, text, color, life: 1.4, max: 1.4, size })
    switch (e.t) {
      case 'dmg':
        if (e.src === 'mob') {
          if (e.miss) add(hx, e.miss === 'dodge' ? 'Unik' : e.miss === 'absorb' ? 'Pochłonięte' : 'Pudło', '#ffffff', 10)
          else add(hx, `-${e.amt}`, '#ff4040', 12)
        } else {
          if (e.miss) add(mx, e.miss === 'dodge' ? 'Unik' : 'Pudło', '#dddddd', 10)
          else {
            add(mx, `${e.amt}`, e.src === 'pet' ? '#ffd28a' : e.school && e.school !== 'physical' ? SCHOOL_COLOR[e.school] : '#ffff66', e.crit ? 17 : 12)
            this.mobFlash = 0.15
            if (e.src === 'hero' && (!e.school || e.school === 'physical')) this.heroLunge = 0.18
          }
        }
        break
      case 'heal':
        add(hx, `+${e.amt}`, '#40ff60', 12)
        this.fx.push({ kind: 'heal', life: 0.8 })
        break
      case 'cast':
        if (e.kind === 'spell' || e.kind === 'dot') {
          const st = classById(s.hero.cls).style
          if (e.school && e.school !== 'physical' || st === 'ranged') this.projs.push({ x: hx + 8, y: this.groundY - 14 * this.px, tx: mx, color: SCHOOL_COLOR[e.school ?? 'physical'], life: 1 })
        }
        this.castGlow = 0.4
        this.castColor = SCHOOL_COLOR[e.school ?? 'physical']
        break
      case 'kill': {
        const m = this.lastMobState
        if (m) this.corpses.push({ type: m.type, color: m.color, x: this.mobX, life: 2.5, count: 1 })
        break
      }
      case 'subkill': {
        const m = this.lastMobState
        // padł jeden z grupy: zwłoki w miejscu ostatniego z rzędu
        if (m) this.corpses.push({ type: m.type, color: m.color, x: this.mobX + (this.lastAlive - 1) * 24 * (this.px / 2), life: 2.5, count: 1 })
        break
      }
      case 'xp':
        add(mx, `+${e.amt} XP`, '#c77dff', 11)
        break
      case 'loot':
        if (e.item.rarity >= 2) add(mx, e.item.name, RARITY_COLOR[e.item.rarity], 11)
        break
      case 'level':
        this.fx.push({ kind: 'levelup', life: 2.5, text: `Poziom ${e.level}!` })
        break
      case 'racial':
        this.fx.push({ kind: 'racial', life: 1.6, text: e.name })
        break
      case 'death':
        this.fx.push({ kind: 'death', life: 2 })
        break
      case 'spawn':
        this.mobX = this.w + 30
        break
    }
  }
  lastMobState: { type: MobType; color: string; count: number } | null = null
  lastAlive = 1

  draw(s: GameState, dt: number) {
    const { ctx, w, h } = this
    const p = this.px
    this.t += dt
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    const zone = currentZone(s)
    const B = BIOMES[zone.biome]
    const moving = s.phase === 'walk' || s.phase === 'travel' || (s.phase === 'dead' && s.phaseT > 3)
    if (moving) this.scroll += dt * (s.phase === 'travel' ? 70 : 42) * (s.phase === 'dead' ? 1.5 : 1)

    // niebo
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, B.sky[0])
    g.addColorStop(1, B.sky[1])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // słońce / księżyc i chmury
    const night = zone.biome === 'nightforest' || zone.biome === 'undead' || zone.biome === 'volcanic'
    const sx = w * 0.78, sy = h * 0.22
    const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, h * 0.5)
    sg.addColorStop(0, night ? 'rgba(220,230,255,.55)' : 'rgba(255,250,210,.8)')
    sg.addColorStop(0.12, night ? 'rgba(200,210,255,.25)' : 'rgba(255,240,180,.35)')
    sg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sg
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = night ? '#e8ecff' : '#fffbe0'
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(5, h * 0.07), 0, Math.PI * 2); ctx.fill()
    this.clouds(night)
    // dalekie wzgórza (perspektywa powietrzna)
    this.hills(mix(B.far, B.sky[1], 0.45), 0.08, h * 0.38, 22, 200)
    this.hills(B.far, 0.15, h * 0.47, 18, 140)
    this.hills(B.mid, 0.35, h * 0.62, 12, 90)
    // rekwizyty
    this.props(zone.biome, B, 0.6)
    // ziemia
    const gy = this.groundY
    const gg = ctx.createLinearGradient(0, gy, 0, h)
    gg.addColorStop(0, B.ground)
    gg.addColorStop(1, B.ground2)
    ctx.fillStyle = gg
    ctx.fillRect(0, gy, w, h - gy)
    ctx.fillStyle = 'rgba(0,0,0,.18)'
    ctx.fillRect(0, gy, w, 2)
    ctx.fillStyle = B.ground2
    for (let i = -1; i < w / 24 + 2; i++) {
      const xx = Math.floor(i * 24 - (this.scroll % 24))
      ctx.fillRect(xx, gy + 3 + (i % 2) * 4, 10, 2)
    }
    if (zone.biome === 'volcanic') { ctx.fillStyle = '#ff6a1a'; for (let i = 0; i < w / 60 + 2; i++) ctx.fillRect(Math.floor(i * 60 - (this.scroll % 60)), gy + 8, 14, 1) }

    if (s.where !== 'field') {
      this.town(s, gy, dt)
      this.grass(B, gy)
      return
    }
    if (s.phase === 'travel' && s.trip && s.trip.kind !== 'walk') {
      this.transport(s, dt)
      return
    }

    // zwłoki
    for (const c of this.corpses) {
      if (moving) c.x -= dt * 42
      c.life -= dt
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life))
      this.mob(c.type, c.color, c.x, gy, true, c.count)
      ctx.globalAlpha = 1
    }
    this.corpses = this.corpses.filter((c) => c.life > 0)

    // mob
    if (s.mob) {
      this.lastMobState = { type: s.mob.type, color: s.mob.color, count: s.mob.count }
      const target = this.mobTarget(s)
      if (this.mobX > target) this.mobX = Math.max(target, this.mobX - dt * 160)
      if (this.mobX < target) this.mobX = target
      const bob = Math.sin(this.t * 3) * 0.5
      const boss = s.mob.boss
      const sc = boss === 'zone' ? 1.7 : boss === 'mini' ? 1.4 : 1
      this.shadow(this.mobX, gy, 16 * sc * (p / 2))
      if (boss) {
        const ag = ctx.createRadialGradient(this.mobX, gy - 14 * p * sc / 2, 2, this.mobX, gy - 14 * p * sc / 2, 30 * sc * (p / 2))
        ag.addColorStop(0, boss === 'zone' ? 'rgba(255,60,30,.35)' : 'rgba(255,160,40,.28)')
        ag.addColorStop(1, 'rgba(255,80,0,0)')
        ctx.fillStyle = ag
        ctx.fillRect(this.mobX - 60 * sc, gy - 70 * sc, 120 * sc, 80 * sc)
      }
      ctx.save()
      ctx.translate(this.mobX, gy)
      ctx.scale(sc, sc)
      ctx.translate(-this.mobX, -gy)
      ctx.filter = this.mobFlash > 0 ? 'brightness(2.2) drop-shadow(0 0 1px #000)' : 'drop-shadow(0 0 1px #000)'
      if (this.mobFlash > 0) this.mobFlash -= dt
      const alive = Math.max(1, Math.min(s.mob.count, Math.ceil(s.mob.hp / s.mob.per - 1e-6)))
      this.lastAlive = alive
      this.mob(s.mob.type, s.mob.color, this.mobX, gy + bob, false, alive, s.mob.stun > 0)
      ctx.filter = 'none'
      ctx.restore()
      // tabliczka z imieniem i pasek HP moba (jak nameplate)
      const bw = boss ? 70 : 44
      const by = Math.max(boss ? 26 : 14, gy - 32 * p * sc)
      ctx.fillStyle = 'rgba(0,0,0,.7)'
      ctx.fillRect(this.mobX - bw / 2 - 1, by - 1, bw + 2, 6)
      ctx.fillStyle = s.mob.lvl > s.hero.level + 2 ? '#d01c1c' : s.mob.lvl >= s.hero.level - 2 ? '#d8b018' : '#3cb83c'
      ctx.fillRect(this.mobX - bw / 2, by, bw * Math.max(0, s.mob.hp / s.mob.maxHp), 4)
      if (boss) {
        ctx.strokeStyle = '#d4a838'; ctx.lineWidth = 1.5; ctx.strokeRect(this.mobX - bw / 2 - 2, by - 2, bw + 4, 8)
        this.text(`${s.mob.name}${boss === 'zone' ? ' ☠' : ''}`, this.mobX, by - 5, boss === 'zone' ? '#ff6a40' : '#ffb347', 11, true)
      }
      if (s.mob.dots.length) {
        s.mob.dots.forEach((d, i) => { ctx.fillStyle = SCHOOL_COLOR[d.school]; ctx.fillRect(this.mobX - bw / 2 + i * 6, by + 6, 4, 3) })
      }
    }

    // pupil
    const pet = activePet(s.hero)
    if (pet && s.phase !== 'dead') {
      const q = p / 2
      const melee = s.hero.cls === 'hunter' || pet.tank
      const px = s.mob && melee ? this.mobX - 26 * q : this.heroX - 22 * q
      const walk = moving ? Math.sin(this.t * 10) : 0
      if (s.hero.cls === 'hunter') this.quad(px, gy, '#8a6a4a', walk, 0.8)
      else if (pet.tank) this.voidwalker(px, gy)
      else this.imp(px - 4, gy)
    }

    // bohater
    this.hero(s, gy, moving, dt)

    // pociski
    for (const pr of this.projs) {
      pr.x += dt * 420
      pr.life -= dt
      ctx.fillStyle = pr.color
      ctx.shadowColor = pr.color
      ctx.shadowBlur = 8
      ctx.fillRect(pr.x, pr.y, 6, 4)
      ctx.shadowBlur = 0
    }
    this.projs = this.projs.filter((pr) => pr.life > 0 && pr.x < pr.tx)

    // efekty
    for (const f of this.fx) {
      f.life -= dt
      if (f.kind === 'levelup') {
        const a = Math.min(1, f.life)
        ctx.globalAlpha = a * 0.5
        ctx.fillStyle = '#ffe680'
        ctx.fillRect(this.heroX - 10, 0, 20, gy)
        ctx.globalAlpha = a
        this.text(f.text!, this.heroX, 14, '#ffd100', 14, true)
        ctx.globalAlpha = 1
      } else if (f.kind === 'racial') {
        ctx.globalAlpha = Math.min(1, f.life)
        this.text(f.text!, this.heroX, gy - 34 * p, '#ffb347', 10, true)
        ctx.globalAlpha = 1
      } else if (f.kind === 'heal') {
        ctx.globalAlpha = f.life
        ctx.fillStyle = '#7dff6a'
        for (let i = 0; i < 6; i++) ctx.fillRect(this.heroX - 10 + hash(i) * 20, gy - (1 - f.life) * 40 - hash(i + 9) * 30, 2, 2)
        ctx.globalAlpha = 1
      }
    }
    this.fx = this.fx.filter((f) => f.life > 0)

    this.grass(B, gy)

    // latające liczby
    for (const f of this.floats) {
      f.life -= dt
      f.y += f.vy * dt
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.4))
      this.text(f.text, f.x, f.y, f.color, f.size, f.size > 14)
      ctx.globalAlpha = 1
    }
    this.floats = this.floats.filter((f) => f.life > 0)
    if (this.floats.length > 30) this.floats.splice(0, this.floats.length - 30)

    // napisy stanu
    if (s.phase === 'travel') this.text(`→ ${s.trip?.label || zone.name}`, w / 2, 16, '#ffd100', 13, true)
    if (s.phase === 'dead') this.text(`Duch wraca do zwłok... ${Math.ceil(s.phaseT)} s`, w / 2, 16, '#c0d8ff', 12, true)
  }

  // Rejs statkiem albo lot zeppelinem
  transport(s: GameState, dt: number) {
    const c = this.ctx
    const { w, h } = this
    const p = this.px / 2
    const zep = s.trip!.kind === 'zeppelin'
    this.scroll += dt * (zep ? 90 : 55)
    const sky = c.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, zep ? '#4a7ab8' : '#6a9ad0')
    sky.addColorStop(1, zep ? '#c8dcef' : '#d8e8f4')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    this.clouds(false)
    const cx = w * 0.42
    const bob = Math.sin(this.t * 1.6) * 2
    if (zep) {
      // chmury pod spodem + ląd daleko w dole
      this.hills('#7a9a6a', 0.1, h * 0.95, 10, 160)
      c.fillStyle = 'rgba(255,255,255,.6)'
      for (let i = 0; i < 5; i++) { const x = ((i * 220 - this.scroll * 0.6) % (w + 200) + w + 200) % (w + 200) - 100; c.beginPath(); c.ellipse(x, h * 0.75 + (i % 2) * 8, 60, 10, 0, 0, Math.PI * 2); c.fill() }
      const y = h * 0.7 + bob
      const ry = 16 * p
      // balon
      const bg = c.createLinearGradient(0, y - ry, 0, y + ry)
      bg.addColorStop(0, '#d0503a'); bg.addColorStop(1, '#6a1a10')
      c.fillStyle = bg
      c.beginPath(); c.ellipse(cx, y, 70 * p, ry, 0, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#2a0a06'; c.lineWidth = 2; c.stroke()
      c.fillStyle = '#e0b040'; for (let k = -2; k <= 2; k++) c.fillRect(cx + k * 24 * p - 2, y - ry + 2, 4, ry * 2 - 4)
      c.fillStyle = '#8a2a1a'; c.beginPath(); c.moveTo(cx - 64 * p, y); c.lineTo(cx - 86 * p, y - 14 * p); c.lineTo(cx - 80 * p, y); c.lineTo(cx - 86 * p, y + 12 * p); c.closePath(); c.fill()
      c.fillStyle = '#ccc'; c.fillRect(cx - 90 * p, y - 4 + Math.sin(this.t * 40) * 6 * p, 3, 10)
      // pokład na górze balonu (jak w grze) z barierką
      const deck = y - ry + 2
      c.fillStyle = '#6a4a2a'; c.fillRect(cx - 40 * p, deck - 4 * p, 80 * p, 5 * p)
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.5
      c.beginPath(); c.moveTo(cx - 40 * p, deck - 12 * p); c.lineTo(cx + 40 * p, deck - 12 * p); c.stroke()
      for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(cx + k * 10 * p, deck - 12 * p); c.lineTo(cx + k * 10 * p, deck - 4 * p); c.stroke() }
      c.save(); c.translate(cx - this.heroX, -(this.groundY - (deck - 4 * p))); this.hero(s, this.groundY, false, dt); c.restore()
    } else {
      // morze z falami
      const sea = h * 0.74
      const sg = c.createLinearGradient(0, sea, 0, h)
      sg.addColorStop(0, '#2a6a9a'); sg.addColorStop(1, '#0a2a4a')
      c.fillStyle = sg
      c.fillRect(0, sea, w, h - sea)
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5
      for (let row = 0; row < 3; row++) { c.beginPath(); for (let x = 0; x <= w; x += 6) c.lineTo(x, sea + 6 + row * 10 + Math.sin((x + this.scroll * (1 + row * 0.3)) / 18) * 2); c.stroke() }
      const y = sea + bob
      // kadłub
      c.fillStyle = '#5a3a1e'
      c.beginPath(); c.moveTo(cx - 80 * p, y - 10 * p); c.lineTo(cx + 90 * p, y - 10 * p); c.lineTo(cx + 70 * p, y + 8 * p); c.lineTo(cx - 70 * p, y + 8 * p); c.closePath(); c.fill()
      c.fillStyle = '#3a240e'; c.fillRect(cx - 80 * p, y - 12 * p, 170 * p, 3 * p)
      // maszty i żagle
      for (const mx of [-35, 30]) {
        c.fillStyle = '#4a2e14'; c.fillRect(cx + mx * p, y - 48 * p, 3 * p, 38 * p)
        c.fillStyle = s.hero.faction === 'horde' ? '#a8322a' : '#e8e0cc'
        c.beginPath(); c.moveTo(cx + mx * p - 18 * p, y - 46 * p); c.quadraticCurveTo(cx + mx * p + 8 * p, y - 36 * p, cx + mx * p - 18 * p, y - 18 * p); c.lineTo(cx + mx * p + 20 * p, y - 18 * p); c.quadraticCurveTo(cx + mx * p + 32 * p, y - 33 * p, cx + mx * p + 20 * p, y - 46 * p); c.closePath(); c.fill()
      }
      c.save(); c.translate(cx - this.heroX + 62 * p, -(this.groundY - (y - 12 * p))); this.hero(s, this.groundY, false, dt); c.restore()
    }
    this.text(s.trip!.label, w * 0.78, 18, '#ffd100', 13, true)
    this.text(`${Math.ceil(s.phaseT)} s do celu`, w * 0.78, 34, '#ffffff', 11, true)
  }

  clouds(night: boolean) {
    const c = this.ctx
    c.fillStyle = night ? 'rgba(200,200,230,.12)' : 'rgba(255,255,255,.55)'
    for (let i = 0; i < 6; i++) {
      const span = this.w + 200
      const x = ((hash(i) * span - this.t * (4 + hash(i + 3) * 6) - this.scroll * 0.03) % span + span) % span - 100
      const y = 8 + hash(i + 11) * this.h * 0.25
      const s = 0.6 + hash(i + 7) * 0.8
      c.beginPath()
      c.ellipse(x, y, 26 * s, 6 * s, 0, 0, Math.PI * 2)
      c.ellipse(x + 14 * s, y - 4 * s, 16 * s, 7 * s, 0, 0, Math.PI * 2)
      c.ellipse(x - 12 * s, y - 2 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2)
      c.fill()
    }
  }

  shadow(x: number, gy: number, rx: number) {
    const c = this.ctx
    c.fillStyle = 'rgba(0,0,0,.28)'
    c.beginPath()
    c.ellipse(x, gy + 1, rx, Math.max(2, rx * 0.22), 0, 0, Math.PI * 2)
    c.fill()
  }

  grass(B: (typeof BIOMES)[Biome], gy: number) {
    const c = this.ctx
    const off = this.scroll * 1.2
    c.fillStyle = shade(B.ground2, -0.25)
    for (let i = Math.floor(off / 9) - 1; i < Math.floor(off / 9) + this.w / 9 + 2; i++) {
      if (hash(i * 3.1) < 0.45) continue
      const x = Math.floor(i * 9 - off)
      const hh = 3 + hash(i) * 5
      c.fillRect(x, this.h - hh, 1.5, hh)
      c.fillRect(x + 2, this.h - hh * 0.7, 1.5, hh * 0.7)
    }
    void gy
  }

  // Miasto / stolica: zabudowa, NPC (trener, kupiec, zleceniodawca), bohater odpoczywa
  town(s: GameState, gy: number, dt: number) {
    const c = this.ctx
    const p = this.px / 2
    const horde = s.hero.faction === 'horde'
    const capital = s.where === 'capital'
    const undead = s.hero.race === 'undead' && capital
    this.scroll += dt * 2
    const n = Math.ceil(this.w / 120) + 1
    for (let i = 0; i < n; i++) {
      const x = i * 120 - 30
      const bw = 80 + hash(i) * 30, bh = Math.min(gy * (capital ? 0.62 : 0.5), (capital ? 48 : 34) * p + hash(i + 1) * 10 * p)
      if (undead) {
        c.fillStyle = '#3a3f37'; c.fillRect(x, gy - bh, bw, bh)
        c.fillStyle = '#5ac83a'; c.globalAlpha = 0.5; c.fillRect(x + bw / 2 - 8, gy - bh * 0.6, 16, bh * 0.6); c.globalAlpha = 1
        c.fillStyle = '#2a2e28'; c.beginPath(); c.arc(x + bw / 2, gy - bh, bw / 2, Math.PI, 0); c.fill()
      } else if (horde) {
        c.fillStyle = '#8a5a32'; c.beginPath(); c.moveTo(x, gy); c.lineTo(x + bw / 2, gy - bh); c.lineTo(x + bw, gy); c.closePath(); c.fill()
        c.fillStyle = '#6a4024'; c.fillRect(x + bw / 2 - 9, gy - 18 * p, 18, 18 * p)
        c.fillStyle = '#b01c1c'; c.fillRect(x + bw / 2 - 2, gy - bh - 10 * p, 3, 12 * p); c.fillRect(x + bw / 2 + 1, gy - bh - 10 * p, 12, 7 * p)
        c.strokeStyle = '#e8dcc0'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, gy - 4); c.lineTo(x - 4, gy - 22 * p); c.moveTo(x + bw - 6, gy - 4); c.lineTo(x + bw + 4, gy - 22 * p); c.stroke()
      } else {
        const wg = c.createLinearGradient(x, 0, x + bw, 0)
        wg.addColorStop(0, '#cfc6b4'); wg.addColorStop(1, '#8e8676')
        c.fillStyle = wg; c.fillRect(x, gy - bh, bw, bh)
        c.fillStyle = '#5a4a3a'; for (let k = 0; k < 3; k++) c.fillRect(x + 10 + k * 22, gy - bh + 10, 3, bh - 10)
        c.fillStyle = '#2a4a8a'; c.beginPath(); c.moveTo(x - 6, gy - bh); c.lineTo(x + bw / 2, gy - bh - 22 * p); c.lineTo(x + bw + 6, gy - bh); c.closePath(); c.fill()
        c.fillStyle = '#ffd770'; c.fillRect(x + bw - 22, gy - bh * 0.6, 9, 9)
        if (capital && i % 2 === 0) { const th = Math.min(gy - 18, bh + 22 * p); c.fillStyle = '#b8b0a0'; c.fillRect(x + bw - 12, gy - th, 18, th); c.fillStyle = '#2a4a8a'; c.beginPath(); c.moveTo(x + bw - 16, gy - th); c.lineTo(x + bw - 3, gy - th - 14); c.lineTo(x + bw + 10, gy - th); c.fill() }
      }
    }
    // droga
    c.fillStyle = 'rgba(80,60,40,.45)'
    c.fillRect(0, gy, this.w, 6)
    // NPC
    const npcs: [number, string, string][] = capital
      ? [[0.45, 'Trener', classById(s.hero.cls).color], [0.62, 'Kupiec', '#8a6a3a']]
      : [[0.45, 'Zadania', '#c8a24a'], [0.62, 'Trener', classById(s.hero.cls).color]]
    for (const [fx, label, col] of npcs) {
      const x = this.w * fx
      this.shadow(x, gy, 8 * p)
      c.filter = 'drop-shadow(0 0 1px #000)'
      this.biped(x, gy, col, 24, 10, horde ? '#5f8f3a' : '#e8b98f')
      c.filter = 'none'
      if (label === 'Zadania') this.text(s.quests.some((q) => q.have >= q.need && q.zone === s.loc.zone) ? '?' : '!', x, gy - 34 * p, '#ffd100', 18, true)
      this.text(label, x, gy - 26 * p, '#ffffff', 10, true)
    }
    // bohater stoi
    const saved = s.phase
    s.phase = 'fight'
    this.hero(s, gy, false, dt)
    s.phase = saved
    this.text(capital ? `${raceById(s.hero.race).start.capital}` : townLabel(s), this.w / 2, 16, '#ffd100', 14, true)
  }

  text(t: string, x: number, y: number, color: string, size: number, bold = false) {
    const c = this.ctx
    c.font = `${bold ? 'bold ' : ''}${size}px "Trebuchet MS", Verdana, sans-serif`
    c.textAlign = 'center'
    c.lineWidth = 3
    c.strokeStyle = 'rgba(0,0,0,.85)'
    c.strokeText(t, x, y)
    c.fillStyle = color
    c.fillText(t, x, y)
  }

  hills(color: string, speed: number, base: number, amp: number, period: number) {
    const c = this.ctx
    c.fillStyle = color
    c.beginPath()
    c.moveTo(0, this.h)
    const off = this.scroll * speed
    for (let x = 0; x <= this.w + 8; x += 8) {
      const k = (x + off) / period
      const y = base - Math.abs(Math.sin(k)) * amp - Math.sin(k * 2.3) * amp * 0.3
      c.lineTo(x, Math.floor(y))
    }
    c.lineTo(this.w, this.h)
    c.fill()
  }

  props(biome: Biome, B: (typeof BIOMES)[Biome], speed: number) {
    const c = this.ctx
    const step = 70
    const off = this.scroll * speed
    const first = Math.floor(off / step) - 1
    const gy = this.groundY
    for (let i = first; i < first + this.w / step + 3; i++) {
      if (hash(i) < 0.35) continue
      const x = Math.floor(i * step - off + hash(i + 5) * 40)
      const s = 0.7 + hash(i + 2) * 0.6
      c.fillStyle = B.prop
      switch (biome) {
        case 'forest': case 'plains': case 'crater': {
          c.fillStyle = B.prop2; c.fillRect(x + 6 * s, gy - 22 * s, 4 * s, 22 * s)
          c.fillStyle = B.prop; c.beginPath(); c.arc(x + 8 * s, gy - 28 * s, 12 * s, 0, Math.PI * 2); c.fill()
          break
        }
        case 'snow': {
          c.fillStyle = B.prop
          for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x, gy - 6 * s - k * 9 * s); c.lineTo(x + 10 * s, gy - 22 * s - k * 9 * s); c.lineTo(x + 20 * s, gy - 6 * s - k * 9 * s); c.fill() }
          c.fillStyle = B.prop2; c.fillRect(x + 6 * s, gy - 26 * s, 8 * s, 2)
          break
        }
        case 'nightforest': {
          c.fillStyle = '#2a1f3f'; c.fillRect(x + 6 * s, gy - 40 * s, 6 * s, 40 * s)
          c.fillStyle = B.prop; c.beginPath(); c.arc(x + 9 * s, gy - 44 * s, 15 * s, 0, Math.PI * 2); c.fill()
          if (hash(i + 3) > 0.6) { c.fillStyle = B.prop2; c.fillRect(x + 20 * s, gy - 30 * s + Math.sin(this.t * 2 + i) * 3, 2, 2) }
          break
        }
        case 'desert': {
          c.fillStyle = B.prop; c.fillRect(x, gy - 10 * s, 18 * s, 10 * s); c.fillRect(x + 4 * s, gy - 16 * s, 10 * s, 6 * s)
          break
        }
        case 'undead': case 'plague': {
          c.fillStyle = B.prop; c.fillRect(x + 6 * s, gy - 28 * s, 3 * s, 28 * s); c.fillRect(x, gy - 22 * s, 8 * s, 2 * s); c.fillRect(x + 8 * s, gy - 18 * s, 8 * s, 2 * s)
          if (hash(i + 7) > 0.5) { c.fillStyle = B.prop2; c.fillRect(x + 22 * s, gy - 10 * s, 7 * s, 10 * s) }
          break
        }
        case 'swamp': {
          c.fillStyle = B.prop2; c.fillRect(x - 6, gy - 2, 30 * s, 3)
          c.fillStyle = B.prop; for (let k = 0; k < 4; k++) c.fillRect(x + k * 4 * s, gy - (12 + hash(i + k) * 10) * s, 2, (12 + hash(i + k) * 10) * s)
          break
        }
        case 'jungle': {
          c.fillStyle = B.prop2; c.fillRect(x + 8 * s, gy - 34 * s, 4 * s, 34 * s)
          c.fillStyle = B.prop; for (let k = -2; k <= 2; k++) c.fillRect(x + 10 * s + k * 7 * s - 6 * s, gy - 36 * s + Math.abs(k) * 3 * s, 12 * s, 3 * s)
          break
        }
        case 'volcanic': {
          c.fillStyle = B.prop; c.beginPath(); c.moveTo(x, gy); c.lineTo(x + 12 * s, gy - 18 * s); c.lineTo(x + 24 * s, gy); c.fill()
          c.fillStyle = B.prop2; c.fillRect(x + 11 * s, gy - 10 * s, 2, 10 * s)
          break
        }
        case 'coast': {
          c.fillStyle = B.prop2; c.fillRect(x - 10, gy - 4, 40 * s, 4)
          c.fillStyle = B.prop; c.fillRect(x + 6 * s, gy - 18 * s, 3 * s, 14 * s); c.fillRect(x, gy - 20 * s, 15 * s, 3 * s)
          break
        }
        case 'mountain': {
          c.fillStyle = B.prop; c.beginPath(); c.moveTo(x, gy); c.lineTo(x + 14 * s, gy - 22 * s); c.lineTo(x + 28 * s, gy); c.fill()
          c.fillStyle = '#e8eef4'; c.beginPath(); c.moveTo(x + 10 * s, gy - 16 * s); c.lineTo(x + 14 * s, gy - 22 * s); c.lineTo(x + 18 * s, gy - 16 * s); c.fill()
          break
        }
      }
    }
  }

  // ---------------------------------------------------------------- postacie
  hero(s: GameState, gy: number, moving: boolean, dt: number) {
    const c = this.ctx
    const p = this.px / 2
    const r = raceById(s.hero.race)
    const cl = classById(s.hero.cls)
    const x = this.heroX + (this.heroLunge > 0 ? 6 : 0)
    if (this.heroLunge > 0) this.heroLunge -= dt
    if (this.castGlow > 0) this.castGlow -= dt
    const dead = s.phase === 'dead'
    const resting = s.phase === 'rest'
    const walk = moving ? Math.sin(this.t * 10) : 0
    if (!dead) this.shadow(this.heroX, gy, r.look.width * p * 0.9)
    if (dead) c.globalAlpha = 0.45
    c.filter = dead ? 'grayscale(1) brightness(1.6)' : 'drop-shadow(0 0 1px #000)'
    const H = r.look.height * p
    const W = r.look.width * p
    const base = resting ? gy + 6 * p : gy
    const legH = H * 0.32
    const torsoH = H * 0.36
    const headS = Math.max(6 * p, W * 0.75)
    const top = base - legH - torsoH - headS
    const cloth = cl.armor(s.hero.level) === 'cloth'
    const heavy = cl.armor(s.hero.level) === 'plate' || cl.armor(s.hero.level) === 'mail'
    // peleryna (za postacią)
    if (!resting && (s.hero.cls === 'warrior' || s.hero.cls === 'paladin' || s.hero.cls === 'hunter')) {
      c.fillStyle = shade(cl.color, -0.55)
      c.beginPath()
      c.moveTo(x - W / 2 + 1 * p, base - legH - torsoH + 1 * p)
      c.lineTo(x - W / 2 - 4 * p - (moving ? Math.sin(this.t * 6) * 2 * p : 0), base - 2 * p)
      c.lineTo(x - W / 2 + 4 * p, base - 3 * p)
      c.closePath()
      c.fill()
    }
    // nogi (buty ciemniejsze)
    c.fillStyle = shade(cl.color, -0.5)
    if (!resting) {
      c.fillRect(x - W / 2 + 1 * p, base - legH + walk * 2 * p, W * 0.38, legH - walk * 2 * p)
      c.fillRect(x + W * 0.1, base - legH - walk * 2 * p, W * 0.38, legH + walk * 2 * p)
      c.fillStyle = '#2a1c12'
      c.fillRect(x - W / 2 + 1 * p, base - 3 * p, W * 0.38 + 1 * p, 3 * p)
      c.fillRect(x + W * 0.1, base - 3 * p, W * 0.38 + 1 * p, 3 * p)
    } else c.fillRect(x - W / 2, base - legH * 0.4, W * 1.3, legH * 0.4)
    // tułów z cieniowaniem
    const tg = c.createLinearGradient(x - W / 2, 0, x + W / 2, 0)
    tg.addColorStop(0, shade(cl.color, 0.25))
    tg.addColorStop(1, shade(cl.color, -0.35))
    c.fillStyle = tg
    c.fillRect(x - W / 2, base - legH - torsoH, W, torsoH)
    if (cloth && !resting) {
      // szata do kolan
      c.beginPath()
      c.moveTo(x - W / 2, base - legH)
      c.lineTo(x - W / 2 - 2 * p, base - legH * 0.35)
      c.lineTo(x + W / 2 + 2 * p, base - legH * 0.35)
      c.lineTo(x + W / 2, base - legH)
      c.closePath()
      c.fill()
    }
    // pas ze sprzączką
    c.fillStyle = '#3a2412'
    c.fillRect(x - W / 2, base - legH - 3 * p, W, 2 * p)
    c.fillStyle = '#e0b84a'
    c.fillRect(x - 1 * p, base - legH - 3 * p, 2 * p, 2 * p)
    // naramienniki
    const sh = heavy ? 4 * p : 3 * p
    c.fillStyle = heavy ? '#b8bcc6' : shade(cl.color, -0.2)
    c.fillRect(x - W / 2 - sh / 2, base - legH - torsoH - 1 * p, sh + 2 * p, sh)
    c.fillRect(x + W / 2 - sh / 2 - 1 * p, base - legH - torsoH - 1 * p, sh + 2 * p, sh)
    // ręce
    c.fillStyle = r.look.skin
    c.fillRect(x + W / 2 - 1 * p, base - legH - torsoH + 2 * p, 3 * p, torsoH * 0.7)
    // głowa
    const hx = x - headS / 2 + 1 * p
    c.fillStyle = r.look.skin
    c.fillRect(hx, top, headS, headS)
    c.fillStyle = r.look.hair
    c.fillRect(hx, top - 1 * p, headS, 3 * p)
    c.fillRect(hx - 1 * p, top, 2 * p, headS * 0.7)
    c.fillStyle = s.hero.race === 'nightelf' ? '#e8f4ff' : s.hero.race === 'undead' ? '#ffe680' : '#111'
    c.fillRect(hx + headS - 3 * p, top + headS * 0.4, 2 * p, 2 * p)
    // hełm u ciężkozbrojnych od 10 poziomu
    if (heavy && s.hero.level >= 10 && r.look.feature !== 'horns') {
      c.fillStyle = '#9aa0ac'
      c.fillRect(hx - 1 * p, top - 2 * p, headS + 2 * p, 4 * p)
      c.fillStyle = '#6a707c'
      c.fillRect(hx + headS - 2 * p, top + 2 * p, 2 * p, headS * 0.35)
    }
    if (cloth && s.hero.cls !== 'druid') {
      c.fillStyle = shade(cl.color, -0.3)
      c.fillRect(hx - 1 * p, top - 2 * p, headS + 1 * p, 3 * p)
      c.fillRect(hx - 2 * p, top - 1 * p, 3 * p, headS * 0.9)
    }
    switch (r.look.feature) {
      case 'ears': c.fillStyle = r.look.skin; c.fillRect(hx - 4 * p, top + 2 * p, 4 * p, 2 * p); break
      case 'beard': c.fillStyle = r.look.hair; c.fillRect(hx + 2 * p, top + headS * 0.6, headS - 1 * p, headS * 0.7); break
      case 'horns': c.fillStyle = '#e8dcc0'; c.fillRect(hx - 3 * p, top - 3 * p, 3 * p, 4 * p); c.fillRect(hx + headS, top - 3 * p, 3 * p, 4 * p); break
      case 'tusks': c.fillStyle = '#f4f0e0'; c.fillRect(hx + headS - 2 * p, top + headS - 3 * p, 2 * p, 3 * p); break
      case 'bones': c.fillStyle = '#e8e4d4'; c.fillRect(hx + 2 * p, top + headS - 2 * p, headS - 3 * p, 1 * p); c.fillRect(x - W / 2 + 2 * p, base - legH - torsoH + 3 * p, W - 4 * p, 1 * p); break
      case 'bignose': c.fillStyle = shade(r.look.skin, -0.15); c.fillRect(hx + headS, top + headS * 0.45, 2 * p, 3 * p); break
    }
    // broń
    this.weapon(s.hero.cls, x + W / 2 + 1 * p, base - legH - torsoH * 0.4, p, cl.color)
    // poświata czaru / rzucanie
    if (s.hero.casting || this.castGlow > 0) {
      c.globalAlpha = 0.5 + Math.sin(this.t * 20) * 0.2
      c.fillStyle = this.castColor
      c.beginPath()
      c.arc(x + W / 2 + 3 * p, base - legH - torsoH * 0.6, 4 * p, 0, Math.PI * 2)
      c.fill()
      c.globalAlpha = dead ? 0.45 : 1
    }
    if (s.hero.shield > 0) { c.strokeStyle = 'rgba(255,240,160,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(x, base - H / 2, H * 0.62, 0, Math.PI * 2); c.stroke() }
    if (resting) this.text('🍞', x + W, top - 2, '#fff', 12)
    c.globalAlpha = 1
    c.filter = 'none'
  }

  weapon(cls: string, x: number, y: number, p: number, color: string) {
    const c = this.ctx
    switch (cls) {
      case 'warrior': case 'paladin':
        c.fillStyle = '#c8ccd4'; c.fillRect(x, y - 14 * p, 2 * p, 14 * p)
        c.fillStyle = '#8a6a2a'; c.fillRect(x - 2 * p, y, 6 * p, 2 * p)
        c.fillStyle = cls === 'paladin' ? '#ffe680' : '#7a2a2a'; c.fillRect(x - 16 * p, y - 6 * p, 6 * p, 9 * p)
        break
      case 'rogue':
        c.fillStyle = '#c8ccd4'; c.fillRect(x, y - 7 * p, 2 * p, 7 * p); c.fillRect(x - 14 * p, y - 5 * p, 2 * p, 6 * p)
        break
      case 'hunter':
        c.strokeStyle = '#7a4a22'; c.lineWidth = 2 * p; c.beginPath(); c.arc(x, y - 4 * p, 9 * p, -Math.PI / 2, Math.PI / 2); c.stroke()
        c.fillStyle = '#ddd'; c.fillRect(x, y - 13 * p, 1, 18 * p)
        break
      case 'shaman':
        c.fillStyle = '#6a4a2a'; c.fillRect(x, y - 10 * p, 2 * p, 12 * p); c.fillStyle = '#8a8a9a'; c.fillRect(x - 2 * p, y - 13 * p, 6 * p, 4 * p)
        break
      default:
        c.fillStyle = '#6a4a2a'; c.fillRect(x, y - 18 * p, 2 * p, 26 * p)
        c.fillStyle = color === '#FFFFFF' ? '#ffe680' : color; c.fillRect(x - 1 * p, y - 21 * p, 4 * p, 4 * p)
    }
  }

  mob(type: MobType, color: string, x: number, gy: number, dead: boolean, count = 1, stunned = false) {
    const c = this.ctx
    if (count >= 2 && !dead) {
      const off = 24 * (this.px / 2)
      for (let k = count - 1; k >= 1; k--) { this.mob(type, shade(color, -0.12 * k), x + off * k, gy - k, false, 1) }
    }
    const biped = type === 'humanoid' || type === 'small' || type === 'murloc' || type === 'undead' || type === 'giant'
    if (dead) {
      c.save()
      if (biped) {
        // leży na plecach
        c.translate(0, -5 * (this.px / 2))
        c.translate(x, gy)
        c.rotate(-Math.PI / 2)
        c.translate(-x, -gy)
      } else {
        // zwierzę: łapami do góry
        const axis = gy - 7 * (this.px / 2)
        c.translate(0, 2 * axis)
        c.scale(1, -1)
      }
    }
    const walk = Math.sin(this.t * 8)
    switch (type) {
      case 'beast': this.quad(x, gy, color, walk, 1.1, true); break
      case 'cat': this.quad(x, gy, color, walk, 1.05, true, 'cat'); break
      case 'boar': this.quad(x, gy, color, walk, 1.1, true, 'boar'); break
      case 'raptor': this.raptor(x, gy, color); break
      case 'spider': this.spider(x, gy, color); break
      case 'flyer': this.bird(x, gy, color); break
      case 'elemental': this.elemental(x, gy, color); break
      case 'dragon': this.whelp(x, gy, color); break
      case 'insect': this.scorpid(x, gy, color); break
      case 'murloc': this.biped(x, gy, color, 16, 11, '#9ad0b8', 'fin'); break
      case 'small': this.biped(x, gy, color, 15, 9, '#c8a07a', 'candle'); break
      case 'undead': this.biped(x, gy, color, 23, 9, '#d8d2be', 'bones'); break
      case 'giant': this.biped(x, gy, color, 34, 18, '#b89a7a'); break
      default: this.biped(x, gy, color, 24, 10, '#d8b08a')
    }
    if (dead) c.restore()
    if (stunned && !dead) { c.fillStyle = '#ffe680'; for (let i = 0; i < 3; i++) c.fillRect(x - 6 + Math.cos(this.t * 6 + i * 2) * 8, gy - 32 * (this.px / 2) + Math.sin(this.t * 6 + i * 2) * 3, 2, 2) }
  }

  biped(x: number, gy: number, color: string, hgt: number, wid: number, skin: string, extra?: 'fin' | 'candle' | 'bones') {
    const c = this.ctx
    const p = this.px / 2
    const H = hgt * p, W = wid * p
    const legH = H * 0.3, torsoH = H * 0.4, head = H * 0.3
    c.fillStyle = shade(color, -0.4)
    c.fillRect(x - W / 2, gy - legH, W * 0.4, legH)
    c.fillRect(x + W * 0.1, gy - legH, W * 0.4, legH)
    c.fillStyle = color
    c.fillRect(x - W / 2, gy - legH - torsoH, W, torsoH)
    c.fillStyle = skin
    c.fillRect(x - W / 2 - 3 * p, gy - legH - torsoH + 2 * p, 3 * p, torsoH * 0.7)
    c.fillStyle = extra === 'fin' ? color : skin
    c.fillRect(x - W / 2 - 1 * p, gy - legH - torsoH - head, W * 0.9, head)
    c.fillStyle = '#111'
    c.fillRect(x - W / 2, gy - legH - torsoH - head * 0.6, 2 * p, 2 * p)
    if (extra === 'fin') { c.fillStyle = shade(color, 0.3); c.fillRect(x - 1 * p, gy - legH - torsoH - head - 4 * p, 3 * p, 5 * p) }
    if (extra === 'candle') { c.fillStyle = '#f4f0d0'; c.fillRect(x - 1 * p, gy - legH - torsoH - head - 5 * p, 2 * p, 5 * p); c.fillStyle = '#ffb030'; c.fillRect(x - 1 * p, gy - legH - torsoH - head - 7 * p + Math.sin(this.t * 15), 2 * p, 2 * p) }
    if (extra === 'bones') { c.fillStyle = '#f4f0e0'; for (let i = 0; i < 3; i++) c.fillRect(x - W / 2 + 1 * p, gy - legH - torsoH + (2 + i * 3) * p, W - 2 * p, 1 * p) }
    c.fillStyle = '#9a9aa2'
    c.fillRect(x - W / 2 - 5 * p, gy - legH - torsoH - 4 * p, 2 * p, 12 * p)
  }

  quad(x: number, gy: number, color: string, walk: number, scale: number, facingLeft = false, kind?: 'cat' | 'boar') {
    const c = this.ctx
    const p = (this.px / 2) * scale
    const bw = (kind === 'boar' ? 20 : 22) * p, bh = (kind === 'boar' ? 10 : kind === 'cat' ? 7 : 8) * p
    const dir = facingLeft ? -1 : 1
    const by = gy - 7 * p - bh
    c.fillStyle = shade(color, -0.3)
    for (let i = 0; i < 4; i++) c.fillRect(x - bw / 2 + i * (bw / 3.5), gy - 7 * p, 2.5 * p, 7 * p + (i % 2 ? walk : -walk) * p)
    c.fillStyle = color
    c.fillRect(x - bw / 2, by, bw, bh)
    const hx = x + dir * (bw / 2) - (dir < 0 ? 8 * p : 0)
    c.fillRect(hx, by - 4 * p, 8 * p, 8 * p)
    c.fillStyle = shade(color, -0.2)
    c.fillRect(hx + (dir < 0 ? 0 : 6 * p), by - 7 * p, 2 * p, 3 * p)
    c.fillStyle = '#111'
    c.fillRect(hx + (dir < 0 ? 2 * p : 5 * p), by - 2 * p, 1.5 * p, 1.5 * p)
    if (kind === 'boar') { c.fillStyle = '#f0e8d0'; c.fillRect(hx + (dir < 0 ? -1 * p : 7 * p), by + 1 * p, 2 * p, 2 * p) }
    c.fillStyle = color
    c.fillRect(x - dir * (bw / 2) - (dir > 0 ? 6 * p : 0), by + 1 * p, 6 * p, 2 * p)
  }

  raptor(x: number, gy: number, color: string) {
    const c = this.ctx, p = this.px / 2
    c.fillStyle = shade(color, -0.3)
    c.fillRect(x - 2 * p, gy - 10 * p, 3 * p, 10 * p)
    c.fillRect(x + 3 * p, gy - 10 * p, 3 * p, 10 * p)
    c.fillStyle = color
    c.fillRect(x - 8 * p, gy - 20 * p, 16 * p, 10 * p)
    c.fillRect(x - 16 * p, gy - 26 * p, 10 * p, 7 * p)
    c.fillRect(x + 8 * p, gy - 18 * p, 12 * p, 3 * p)
    c.fillStyle = '#111'; c.fillRect(x - 14 * p, gy - 24 * p, 2 * p, 2 * p)
  }

  spider(x: number, gy: number, color: string) {
    const c = this.ctx, p = this.px / 2
    c.strokeStyle = shade(color, -0.2); c.lineWidth = 1.5 * p
    for (let i = 0; i < 4; i++) {
      const k = Math.sin(this.t * 10 + i) * p
      c.beginPath(); c.moveTo(x - 4 * p + i * 3 * p, gy - 8 * p); c.lineTo(x - 12 * p + i * 7 * p, gy - 13 * p + k); c.lineTo(x - 16 * p + i * 9 * p, gy); c.stroke()
    }
    c.fillStyle = color
    c.beginPath(); c.ellipse(x + 3 * p, gy - 10 * p, 9 * p, 7 * p, 0, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.ellipse(x - 8 * p, gy - 8 * p, 5 * p, 4 * p, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ff3030'; c.fillRect(x - 11 * p, gy - 9 * p, 1.5 * p, 1.5 * p); c.fillRect(x - 9 * p, gy - 9 * p, 1.5 * p, 1.5 * p)
  }

  bird(x: number, gy: number, color: string) {
    const c = this.ctx, p = this.px / 2
    const fl = Math.sin(this.t * 12) * 6 * p
    c.fillStyle = shade(color, -0.3)
    c.fillRect(x - 1 * p, gy - 8 * p, 2 * p, 8 * p); c.fillRect(x + 3 * p, gy - 8 * p, 2 * p, 8 * p)
    c.fillStyle = color
    c.beginPath(); c.ellipse(x + 2 * p, gy - 15 * p, 9 * p, 7 * p, 0, 0, Math.PI * 2); c.fill()
    c.fillRect(x - 10 * p, gy - 26 * p, 7 * p, 7 * p)
    c.fillStyle = '#e0b040'; c.fillRect(x - 14 * p, gy - 23 * p, 4 * p, 2 * p)
    c.fillStyle = shade(color, -0.2)
    c.beginPath(); c.moveTo(x, gy - 18 * p); c.lineTo(x + 14 * p, gy - 24 * p - fl); c.lineTo(x + 10 * p, gy - 14 * p); c.fill()
    c.fillStyle = '#111'; c.fillRect(x - 8 * p, gy - 24 * p, 1.5 * p, 1.5 * p)
  }

  elemental(x: number, gy: number, color: string) {
    const c = this.ctx, p = this.px / 2
    c.shadowColor = color; c.shadowBlur = 10
    c.fillStyle = color
    c.beginPath(); c.ellipse(x, gy - 14 * p + Math.sin(this.t * 3) * 2, 10 * p, 14 * p, 0, 0, Math.PI * 2); c.fill()
    c.shadowBlur = 0
    c.fillStyle = shade(color, 0.4)
    for (let i = 0; i < 5; i++) c.fillRect(x - 10 * p + hash(i) * 20 * p, gy - 30 * p - ((this.t * 20 + i * 13) % 20), 2 * p, 2 * p)
    c.fillStyle = '#fff'; c.fillRect(x - 5 * p, gy - 20 * p, 2 * p, 2 * p); c.fillRect(x - 1 * p, gy - 20 * p, 2 * p, 2 * p)
  }

  whelp(x: number, gy: number, color: string) {
    const c = this.ctx, p = this.px / 2
    const fl = Math.sin(this.t * 10) * 5 * p
    const y = gy - 10 * p
    c.fillStyle = color
    c.fillRect(x - 8 * p, y - 10 * p, 16 * p, 9 * p)
    c.fillRect(x - 14 * p, y - 15 * p, 8 * p, 7 * p)
    c.fillRect(x + 8 * p, y - 6 * p, 10 * p, 3 * p)
    c.fillStyle = shade(color, 0.25)
    c.beginPath(); c.moveTo(x - 2 * p, y - 10 * p); c.lineTo(x + 6 * p, y - 24 * p - fl); c.lineTo(x + 10 * p, y - 10 * p); c.fill()
    c.fillStyle = '#ffd040'; c.fillRect(x - 12 * p, y - 13 * p, 2 * p, 2 * p)
  }

  scorpid(x: number, gy: number, color: string) {
    const c = this.ctx, p = this.px / 2
    c.fillStyle = shade(color, -0.3)
    for (let i = 0; i < 3; i++) c.fillRect(x - 8 * p + i * 6 * p, gy - 4 * p, 2 * p, 4 * p)
    c.fillStyle = color
    c.fillRect(x - 10 * p, gy - 9 * p, 18 * p, 6 * p)
    c.fillRect(x - 16 * p, gy - 8 * p, 6 * p, 3 * p)
    for (let i = 0; i < 4; i++) c.fillRect(x + 7 * p + i * 2 * p, gy - 11 * p - i * 4 * p, 3 * p, 4 * p)
    c.fillRect(x + 6 * p, gy - 28 * p, 4 * p, 3 * p)
  }

  imp(x: number, gy: number) {
    const c = this.ctx, p = this.px / 2
    const y = gy - 14 * p + Math.sin(this.t * 4) * 2
    c.fillStyle = '#d0502a'; c.fillRect(x - 4 * p, y, 8 * p, 9 * p); c.fillRect(x - 3 * p, y - 6 * p, 7 * p, 6 * p)
    c.fillStyle = '#ffb030'; c.fillRect(x + 1 * p, y - 4 * p, 1.5 * p, 1.5 * p)
    c.fillStyle = '#ff9020'; c.fillRect(x + 4 * p, y - 9 * p + Math.sin(this.t * 15), 2 * p, 3 * p)
  }

  voidwalker(x: number, gy: number) {
    const c = this.ctx, p = this.px / 2
    c.fillStyle = '#5a3aa0'; c.shadowColor = '#8a6aff'; c.shadowBlur = 8
    c.beginPath(); c.ellipse(x, gy - 18 * p + Math.sin(this.t * 2) * 2, 9 * p, 14 * p, 0, 0, Math.PI * 2); c.fill()
    c.shadowBlur = 0
    c.fillStyle = '#e0d0ff'; c.fillRect(x + 2 * p, gy - 26 * p, 2 * p, 2 * p)
  }
}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)))
  r = f(r); g = f(g); b = f(b)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
