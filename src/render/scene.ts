// Scena na pasku: proceduralny pixel-art (bez zewnętrznych assetów). Rysuje tło strefy z paralaksą,
// bohatera, pupila, moba, pociski czarów i latające liczby. Sterowana zdarzeniami z symulacji.
import { classById, type School } from '../data/classes'
import { raceById } from '../data/races'
import type { Biome, MobType } from '../data/zones'
import { currentZone, activePet, aliveOf as aliveOfMob, heroInMelee } from '../game/sim'
import { styleOf, grants, active } from '../game/formulas'
import { abilityIcon, racialIcon, stateIcon } from './icons'
import { heroSprite, formSprite, LOOKS, type Anim, type CAnim, type FormAnim, type FormKind, type HeroKey, type OffKind, type WeaponKind, type Sprite } from './sprites'
import { mobSprite, npcSprite, petSprite, totemSprite, type NpcRole } from './mobsprites'
import type { RaceId } from '../data/races'
import { drawBackdrop, drawForeground, drawTown, drawSea, shipSprite, zeppelinSprite, type BackOpts } from './backdrop'

// obrazki ikon (data URL) do rysowania na canvasie
const IMG = new Map<string, HTMLImageElement>()
function img(url: string) {
  let i = IMG.get(url)
  if (!i) { i = new Image(); i.src = url; IMG.set(url, i) }
  return i
}
import { zoneById } from '../data/zones'
import { townOf } from '../game/world'
import type { GameEvent, GameState } from '../game/types'
import { RARITY_COLOR } from '../game/types'

type Float = { x: number; y: number; vy: number; text: string; color: string; life: number; max: number; size: number }
type Proj = { x: number; y: number; tx: number; color: string; life: number }
type Corpse = { name: string; type: MobType; color: string; x: number; life: number; count: number; scale: number }
type Fx = { kind: 'levelup' | 'heal' | 'racial' | 'death' | 'nova'; life: number; text?: string; x?: number }

const SCHOOL_COLOR: Record<School, string> = {
  physical: '#ffffff', fire: '#ff7a1a', frost: '#7fd4ff', arcane: '#ff8af0', shadow: '#a066ff', holy: '#ffe680', nature: '#7dff6a',
}

function townLabel(s: GameState) {
  const z = zoneById(s.loc.zone)
  return townOf(z, s.hero.faction) ?? z.name
}
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

export type MobAura = { icon: string; name: string; desc: string; left?: number; kind: 'buff' | 'debuff' }

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

  // wróg zawsze dochodzi do zwarcia; dystansowcy strzelają, gdy jeszcze biegnie
  mobTarget(_s: GameState) {
    return this.heroX + 44 * (this.px / 2)
  }
  totemVis: { id: string; el: string; x: number; life: number; gone: boolean }[] = []

  onEvent(e: GameEvent, s: GameState) {
    const hx = this.heroX
    const mx = this.mobX
    const top = this.groundY - 20 * this.px
    const add = (x: number, text: string, color: string, size = 12) => this.floats.push({ x: x + (Math.random() * 16 - 8), y: top, vy: -18, text, color, life: 1.4, max: 1.4, size })
    switch (e.t) {
      case 'dmg':
        if (e.src === 'mob') {
          this.mobAtkT = 0.42
          if (e.miss) add(hx, e.miss === 'dodge' ? 'Dodge' : e.miss === 'parry' ? 'Parry' : e.miss === 'absorb' ? 'Absorb' : 'Miss', '#ffffff', 10)
          else { add(hx, `-${e.amt}`, '#ff4040', 12); this.hurtT = 0.24 }
        } else {
          if (e.src === 'hero' && (!e.school || e.school === 'physical') && this.atkT <= 0.1 && !s.mob?.dots.some((d) => d.name === e.ability)) this.atkT = 0.45
          if (e.miss) add(mx, `${e.ability ? `${e.ability}: ` : ''}${e.miss === 'dodge' ? 'Dodge' : e.miss === 'parry' ? 'Parry' : 'Miss'}`, '#dddddd', 11)
          else {
            add(mx, `${e.amt}${e.glance ? ' (glancing)' : ''}`, e.src === 'pet' ? '#ffd28a' : e.school && e.school !== 'physical' ? SCHOOL_COLOR[e.school] : '#ffff66', e.crit ? 17 : 12)
            this.mobFlash = 0.15
            this.mobHurtT = 0.2
            if (e.src === 'hero' && (!e.school || e.school === 'physical')) this.heroLunge = 0.18
            if (e.src === 'pet') this.petAtkT = 0.42
          }
        }
        break
      case 'heal':
        add(hx, `+${e.amt}`, '#40ff60', 12)
        this.fx.push({ kind: 'heal', life: 0.8 })
        break
      case 'cast':
        if (e.kind === 'spell' || e.kind === 'dot') {
          const st = styleOf(s.hero)
          if (e.school && e.school !== 'physical' || st === 'ranged') this.projs.push({ x: hx + 8, y: this.groundY - 14 * this.px, tx: mx, color: SCHOOL_COLOR[e.school ?? 'physical'], life: 1 })
        }
        this.castGlow = 0.4
        this.castColor = SCHOOL_COLOR[e.school ?? 'physical']
        if (e.ability === 'Fire Nova') {
          const ft = this.totemVis.find((v) => v.el === 'fire' && !v.gone)
          this.fx.push({ kind: 'nova', life: 0.7, x: ft ? ft.x + 2 * (this.px / 2) : this.heroX })
        }
        break
      case 'interrupt':
        add(hx, 'Interrupted!', '#ff8040', 13)
        break
      case 'kill': {
        const m = this.lastMobState
        if (m) this.corpses.push({ name: m.name, type: m.type, color: m.color, x: this.mobX, life: 2.5, count: 1, scale: m.scale })
        break
      }
      case 'subkill': {
        const m = this.lastMobState
        // padł jeden z grupy: zwłoki w miejscu ostatniego z rzędu
        if (m) this.corpses.push({ name: m.name, type: m.type, color: m.color, x: this.mobX + (this.lastAlive - 1) * this.groupGap, life: 2.5, count: 1, scale: m.scale })
        break
      }
      case 'xp':
        add(mx, `+${e.amt} XP`, '#c77dff', 11)
        break
      case 'loot':
        if (e.item.rarity >= 2) add(mx, e.item.name, RARITY_COLOR[e.item.rarity], 11)
        break
      case 'level':
        this.fx.push({ kind: 'levelup', life: 2.5, text: `Level ${e.level}!` })
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
  lastMobState: { name: string; type: MobType; color: string; count: number; scale: number } | null = null
  mobAtkT = 0
  petAtkT = 0
  mobHurtT = 0
  mobAnimT = 0
  get sc() { return Math.max(1, Math.round((this.px / 2) * this.dpr * 1.05)) / this.dpr }
  get groupGap() { return 22 * this.sc }
  lastAlive = 1

  draw(s: GameState, dt: number) {
    dt = Math.max(0, Number.isFinite(dt) ? dt : 0)
    const { ctx, w, h } = this
    const p = this.px
    this.t += dt
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    const zone = currentZone(s)
    // postać walcząca wręcz biegnie do nadchodzącego wroga
    const charging = s.phase === 'fight' && !!s.mob && s.mob.dist > 0 && s.mob.dist0 < 2
    const moving = s.phase === 'walk' || s.phase === 'travel' || charging || (s.phase === 'dead' && s.phaseT > 3)
    if (moving) this.scroll += dt * (s.phase === 'travel' ? 70 : 42) * (s.phase === 'dead' ? 1.5 : 1)

    // tło: pikselowe niebo, wzgórza, rekwizyty biomu i ziemia (render/backdrop.ts)
    const gy = this.groundY
    const bo: BackOpts = { w, h, sc: this.sc, scroll: this.scroll, t: this.t, biome: zone.biome, gy, town: s.where !== 'field' }
    if (!(s.phase === 'travel' && s.trip && (s.trip.kind === 'ship' || s.trip.kind === 'zeppelin'))) drawBackdrop(ctx, bo)

    if (s.where !== 'field') {
      this.town(s, gy, dt)
      drawForeground(ctx, bo)
      return
    }
    if (s.phase === 'travel' && s.trip && (s.trip.kind === 'ship' || s.trip.kind === 'zeppelin')) {
      this.transport(s, dt)
      return
    }

    // zwłoki: animacja śmierci, potem leżą i znikają
    for (const c of this.corpses) {
      if (moving) c.x -= dt * 42
      c.life -= dt
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life))
      const f = Math.min(5, Math.floor((2.5 - c.life) / 0.12))
      const sp = mobSprite(c.name, c.type, c.color, 'death', f)
      this.blitS(sp, c.x, gy, sp.scale * c.scale)
      ctx.globalAlpha = 1
    }
    this.corpses = this.corpses.filter((c) => c.life > 0)

    // mob: pikselowy sprite z animacją (podchodzi, stoi, atakuje, dostaje cios); grupa = kilka osobników jeden za drugim
    this.mobBox = null
    if (this.mobAtkT > 0) this.mobAtkT -= dt
    if (this.mobHurtT > 0) this.mobHurtT -= dt
    if (this.mobFlash > 0) this.mobFlash -= dt
    this.mobAnimT += dt
    if (s.mob) {
      const target = this.mobTarget(s)
      const start = this.w + 30
      const k = s.mob.dist0 > 0 ? Math.max(0, Math.min(1, s.mob.dist / s.mob.dist0)) : 0
      const want = target + (start - target) * k
      const approaching = this.mobX > want + 0.5 || s.mob.dist > 0
      this.mobX = this.mobX > want ? Math.max(want, this.mobX - dt * 900) : want
      const boss = s.mob.boss
      const bscale = boss === 'zone' ? 1.7 : boss === 'mini' ? 1.4 : 1
      const stunned = s.mob.stun > 0
      let anim: CAnim = 'idle', f = Math.floor(this.mobAnimT * 5) % 4
      if (stunned) f = 0
      else if (this.mobHurtT > 0) { anim = 'hurt'; f = Math.min(3, Math.floor((0.2 - this.mobHurtT) / 0.05)) }
      else if (this.mobAtkT > 0) { anim = 'attack'; f = Math.min(5, Math.floor((0.42 - this.mobAtkT) / 0.07)) }
      else if (approaching) { anim = 'walk'; f = Math.floor(this.mobAnimT * 12) % 8 }
      const alive = Math.max(1, Math.min(s.mob.count, Math.ceil(s.mob.hp / s.mob.per - 1e-6)))
      this.lastAlive = alive
      const main = mobSprite(s.mob.name, s.mob.type, s.mob.color, anim, f)
      const scale = main.scale * bscale
      this.lastMobState = { name: s.mob.name, type: s.mob.type, color: s.mob.color, count: s.mob.count, scale: bscale }
      // dalsi z grupy (ciemniejsi), za głównym
      for (let i = alive - 1; i >= 1; i--) {
        const sp = mobSprite(s.mob.name, s.mob.type, s.mob.color, approaching ? 'walk' : 'idle', (f + i * 3) % (approaching ? 8 : 4), 0.12 * i)
        this.shadow(this.mobX + i * this.groupGap, gy, ((sp.right - sp.left) / 2.4) * this.sc * scale)
        this.blitS(sp, this.mobX + i * this.groupGap, gy, scale)
      }
      if (boss) {
        const ag = ctx.createRadialGradient(this.mobX, gy - 14 * p * bscale / 2, 2, this.mobX, gy - 14 * p * bscale / 2, 30 * bscale * (p / 2))
        ag.addColorStop(0, boss === 'zone' ? 'rgba(255,60,30,.35)' : 'rgba(255,160,40,.28)')
        ag.addColorStop(1, 'rgba(255,80,0,0)')
        ctx.fillStyle = ag
        ctx.fillRect(this.mobX - 60 * bscale, gy - 70 * bscale, 120 * bscale, 80 * bscale)
      }
      if (!main.air) this.shadow(this.mobX, gy, ((main.right - main.left) / 2.4) * this.sc * scale)
      else this.shadow(this.mobX, gy, 6 * this.sc * scale)
      ctx.save()
      if (this.mobFlash > 0) ctx.filter = 'brightness(1.8)'
      const r = this.blitS(main, this.mobX, gy, scale)
      ctx.restore()
      if (stunned) { ctx.fillStyle = '#ffe680'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(this.mobX - 6 + Math.cos(this.t * 6 + i * 2) * 8), Math.round(r.top - 4 + Math.sin(this.t * 6 + i * 2) * 3), 2 * this.sc, 2 * this.sc) }
      // tabliczka z imieniem i pasek HP moba (jak nameplate) nad głową
      const bw = boss ? 70 : 44
      const by = Math.max(boss ? 40 : 36, Math.round(r.top - 8))
      ctx.fillStyle = 'rgba(0,0,0,.7)'
      ctx.fillRect(this.mobX - bw / 2 - 1, by - 1, bw + 2, 6)
      ctx.fillStyle = s.mob.lvl > s.hero.level + 2 ? '#d01c1c' : s.mob.lvl >= s.hero.level - 2 ? '#d8b018' : '#3cb83c'
      ctx.fillRect(this.mobX - bw / 2, by, bw * Math.max(0, s.mob.hp / s.mob.maxHp), 4)
      if (boss) {
        ctx.strokeStyle = '#d4a838'; ctx.lineWidth = 1.5; ctx.strokeRect(this.mobX - bw / 2 - 2, by - 2, bw + 4, 8)
        this.text(`${s.mob.name}${boss === 'zone' ? ' ☠' : ''}`, this.mobX, by - 5, boss === 'zone' ? '#ff6a40' : '#ffb347', 11, true)
      } else {
        const col = s.mob.lvl > s.hero.level + 2 ? '#ff5050' : s.mob.lvl >= s.hero.level - 2 ? '#ffe060' : '#60e060'
        this.text(`${s.mob.name} (${s.mob.lvl})${s.mob.count > 1 ? ` ×${aliveOfMob(s.mob)}` : ''}`, this.mobX, by - 4, col, 10, true)
      }
      this.mobDebuffs(s, by - 24)
      this.mobBox = { x0: Math.min(r.left, this.mobX - bw / 2) - 4, y0: by - 16, x1: Math.max(r.right, this.mobX + bw / 2) + (alive - 1) * this.groupGap + 4, y1: gy + 4 }
    }

    // pupil
    const pet = activePet(s.hero)
    if (pet && s.phase !== 'dead') {
      const q = p / 2
      const melee = s.hero.cls === 'hunter' || pet.tank
      const px = s.mob && melee ? this.mobX - 26 * q : this.heroX - 22 * q
      const walk = moving ? Math.sin(this.t * 10) : 0
      const kind = s.hero.cls === 'hunter' ? 'beast' : pet.tank ? 'voidwalker' : 'imp'
      const pa: CAnim = moving ? 'walk' : this.petAtkT > 0 ? 'attack' : 'idle'
      if (this.petAtkT > 0) this.petAtkT -= dt
      const pf = pa === 'walk' ? Math.floor(this.t * 12) % 8 : pa === 'attack' ? Math.min(5, Math.floor((0.42 - this.petAtkT) / 0.07)) : Math.floor(this.t * 5) % 4
      const sp = petSprite(kind, pa, pf)
      this.shadow(px, gy, ((sp.right - sp.left) / 2.4) * this.sc)
      if (kind === 'voidwalker') { ctx.save(); ctx.globalAlpha = 0.9 }
      this.blitS(sp, px, gy, 1)
      if (kind === 'voidwalker') ctx.restore()
      void walk
    }

    // totemy szamana: stoją tam, gdzie je postawiono; gdy postać odchodzi, zostają w tyle i znikają
    this.totems(s, gy, moving, dt)

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
      } else if (f.kind === 'nova') {
        // Fire Nova: pierścień ognia rozchodzący się od totemu ognia
        const k = 1 - f.life / 0.7
        const r = (8 + k * 70) * (p / 2)
        ctx.globalAlpha = Math.max(0, f.life / 0.7)
        ctx.strokeStyle = '#ff8a30'; ctx.lineWidth = 3 + 4 * (1 - k)
        ctx.shadowColor = '#ff4a10'; ctx.shadowBlur = 12
        ctx.beginPath(); ctx.ellipse(f.x ?? this.heroX, gy - 4 * p, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(255,140,40,.25)'; ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      } else if (f.kind === 'heal') {
        ctx.globalAlpha = f.life
        ctx.fillStyle = '#7dff6a'
        for (let i = 0; i < 6; i++) ctx.fillRect(this.heroX - 10 + hash(i) * 20, gy - (1 - f.life) * 40 - hash(i + 9) * 30, 2, 2)
        ctx.globalAlpha = 1
      }
    }
    this.fx = this.fx.filter((f) => f.life > 0)

    drawForeground(ctx, bo)

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

    // pasek rzucania nad postacią
    const cst = s.hero.casting
    if (cst && (s.phase === 'fight' || s.phase === 'heal')) {
      const ab = classById(s.hero.cls).abilities.find((a) => a.id === cst.id)
      // mały pasek nad głową (nazwa czaru jest w ramce postaci)
      const bw = 34, bx = this.heroX - bw / 2, by = Math.max(4, gy - 27 * p)
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5)
      const k = ab?.channel ? cst.left / cst.total : 1 - cst.left / cst.total
      ctx.fillStyle = ab?.channel ? '#4ad04a' : '#ffd24a'; ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, k)), 3)
    }

    // napisy stanu
    if (s.phase === 'travel') this.travelBanner(s)
    if (s.phase === 'dead') this.text(`Your ghost is running back to the corpse... ${Math.ceil(s.phaseT)} s`, w / 2, 16, '#c0d8ff', 12, true)
  }

  // Podróż: skąd → dokąd, pasek postępu i odliczanie
  travelBanner(s: GameState) {
    const c = this.ctx
    const t = s.trip
    const total = t?.total ?? 1
    const left = Math.max(0, s.phaseT)
    const k = Math.max(0, Math.min(1, 1 - left / total))
    const bw = Math.min(420, this.w * 0.5), bx = this.w / 2 - bw / 2, by = 22
    const m = Math.floor(left / 60), sec = Math.ceil(left % 60)
    this.text(`${t?.from ?? ''}  →  ${t?.to ?? t?.label ?? ''}`, this.w / 2, 13, '#ffd100', 12, true)
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(bx - 2, by - 2, bw + 4, 10)
    c.fillStyle = '#c8a040'; c.fillRect(bx, by, bw * k, 6)
    c.fillStyle = '#fff'; c.fillRect(bx + bw * k - 1, by - 2, 3, 10)
    this.text(`${m ? `${m}:${String(sec).padStart(2, '0')}` : `${sec} s`}${t?.form ? ` · ${t.form}` : ''}`, this.w / 2, by + 19, '#ffffff', 11, true)
  }

  totems(s: GameState, gy: number, moving: boolean, dt: number) {
    const c = this.ctx
    const p = this.px / 2
    const live = s.hero.totems ?? []
    const ORDER = ['earth', 'fire', 'water', 'air']
    for (const t of live) {
      const v = this.totemVis.find((x) => x.id === t.id && !x.gone)
      if (!v) this.totemVis.push({ id: t.id, el: t.el, x: this.heroX - (16 + ORDER.indexOf(t.el) * 9) * p, life: 1, gone: false })
    }
    for (const v of this.totemVis) {
      if (!v.gone && !live.some((t) => t.id === v.id)) v.gone = true
      if (v.gone) { v.life -= dt * 0.6; if (moving) v.x -= dt * 42 }
    }
    this.totemVis = this.totemVis.filter((v) => v.life > 0 && v.x > -20)
    for (const v of this.totemVis) {
      c.globalAlpha = Math.max(0, Math.min(1, v.life))
      this.shadow(Math.round(v.x), gy, 4 * this.sc)
      this.blitS(totemSprite(v.el, v.gone ? 0 : Math.floor(this.t * 4) % 2), Math.round(v.x), gy, 1)
      c.globalAlpha = 1
    }
    void p
  }

  // Rejs statkiem albo lot zeppelinem
  transport(s: GameState, dt: number) {
    const c = this.ctx
    const { w, h } = this
    const zep = s.trip!.kind === 'zeppelin'
    this.scroll += dt * (zep ? 90 : 55)
    const bo: BackOpts = { w, h, sc: this.sc, scroll: this.scroll, t: this.t, biome: zep ? 'mountain' : 'coast', gy: this.groundY, onlySky: true }
    drawBackdrop(c, bo)
    const cx = Math.round(w * 0.42)
    const bob = Math.round(Math.sin(this.t * 1.6) * 2)
    const k = Math.max(1, Math.round(this.sc * this.dpr)) / this.dpr
    c.save(); c.imageSmoothingEnabled = false
    if (zep) {
      const cv = zeppelinSprite()
      const top = Math.round(h * 0.7 - 22 * k + bob)
      c.drawImage(cv, cx - 62 * k, top, cv.width * k, cv.height * k)
      c.restore()
      // bohater na gondoli
      const deck = top + 40 * k
      c.save(); c.translate(cx - this.heroX, -(this.groundY - deck)); this.hero(s, this.groundY, false, dt); c.restore()
    } else {
      const sea = Math.round(h * 0.74)
      drawSea(c, bo, sea)
      const cv = shipSprite(s.hero.faction === 'horde')
      const top = sea - 50 * k + bob + 6 * k
      c.drawImage(cv, cx - 60 * k, top, cv.width * k, cv.height * k)
      c.restore()
      const deck = top + 36 * k
      c.save(); c.translate(cx - this.heroX + 30 * k, -(this.groundY - deck)); this.hero(s, this.groundY, false, dt); c.restore()
    }
    this.text(s.trip!.label, w * 0.78, 18, '#ffd100', 13, true)
    this.text(`${Math.ceil(s.phaseT)} s to arrival`, w * 0.78, 34, '#ffffff', 11, true)
  }


  shadow(x: number, gy: number, rx: number) {
    const c = this.ctx
    c.fillStyle = 'rgba(0,0,0,.28)'
    c.beginPath()
    c.ellipse(x, gy + 1, rx, Math.max(2, rx * 0.22), 0, 0, Math.PI * 2)
    c.fill()
  }


  // Miasto / stolica: zabudowa, NPC (trener, kupiec, zleceniodawca), bohater odpoczywa
  town(s: GameState, gy: number, dt: number) {
    const horde = s.hero.faction === 'horde'
    const capital = s.where === 'capital'
    const undead = s.hero.race === 'undead' && capital
    this.scroll += dt * 2
    const bo: BackOpts = { w: this.w, h: this.h, sc: this.sc, scroll: this.scroll, t: this.t, biome: currentZone(s).biome, gy }
    drawTown(this.ctx, bo, undead ? 'undercity' : horde ? 'horde' : 'alliance', capital)
    // NPC: zleceniodawca / trener klasy i kupiec, plus strażnik; ta sama grafika co postaci
    const r = s.hero.race
    const npcs: [number, string, NpcRole, RaceId][] = capital
      ? [[0.45, 'Trainer', 'trainer', r], [0.62, 'Vendor', 'vendor', horde ? 'orc' : 'dwarf'], [0.82, '', 'guard', horde ? 'orc' : 'human']]
      : [[0.45, 'Quests', 'quest', horde ? 'tauren' : 'human'], [0.62, 'Vendor', 'vendor', horde ? 'troll' : 'gnome'], [0.82, '', 'guard', horde ? 'orc' : 'human']]
    for (const [fx, label, role, race] of npcs) {
      const x = Math.round(this.w * fx)
      const sp = npcSprite(role, race, s.hero.cls, 'idle', Math.floor(this.t * 5 + fx * 10) % 8, true)
      this.shadow(x, gy, ((sp.right - sp.left) / 2.4) * this.sc)
      const rr = this.blitS(sp, x, gy, 1)
      if (role === 'quest') this.text(s.quests.some((q) => q.have >= q.need && q.zone === s.loc.zone) ? '?' : '!', x, rr.top - 12, '#ffd100', 18, true)
      if (label) this.text(label, x, rr.top - 3, '#ffffff', 10, true)
    }
    // bohater stoi
    const saved = s.phase
    s.phase = 'fight'
    this.hero(s, gy, false, dt)
    s.phase = saved
    this.text(capital ? `${raceById(s.hero.race).start.capital}` : townLabel(s), this.w / 2, 16, '#ffd100', 14, true)
  }

  // Aury na wrogu (jak na nameplate w grze): DoT-y, klątwy / okrzyki / znaki, ogłuszenie, spowolnienie, obezwładnienie.
  // Ta sama lista służy do ikon pod paskiem zdrowia i do tooltipa po najechaniu na wroga.
  mobAuras(s: GameState): MobAura[] {
    const mob = s.mob
    if (!mob) return []
    const h = s.hero
    const c = classById(h.cls)
    const g = grants(h)
    const list: MobAura[] = []
    for (const d of mob.dots) {
      const a = c.abilities.find((x) => x.id === d.id)
      list.push({ icon: a ? abilityIcon(a, h.cls) : stateIcon('dot', 'cannibalize'), name: d.name, desc: `${Math.round(d.perTick)} ${d.school === 'physical' ? 'Physical' : d.school[0].toUpperCase() + d.school.slice(1)} damage every 3 s.`, left: d.left, kind: 'debuff' })
    }
    for (const a of c.abilities) if (a.debuff && active(h, a, g)) list.push({ icon: abilityIcon(a, h.cls), name: a.name, desc: a.desc, kind: 'debuff' })
    if (mob.stun > 0) list.push({ icon: stateIcon('stun', 'warstomp'), name: 'Stunned', desc: 'Cannot attack or move.', left: mob.stun, kind: 'debuff' })
    if (mob.slow > 0) list.push({ icon: stateIcon('slow', 'slow'), name: 'Slowed', desc: 'Movement speed reduced: takes longer to reach you.', left: mob.slow, kind: 'debuff' })
    if (mob.cc > 0) list.push({ icon: stateIcon('cc', 'escape'), name: 'Incapacitated', desc: 'One enemy of the group is out of the fight.', left: mob.cc, kind: 'debuff' })
    if (mob.boss === 'zone') list.push({ icon: stateIcon('boss', 'bloodfury'), name: 'Zone Boss', desc: 'Much more health and damage than normal enemies.', kind: 'buff' })
    else if (mob.boss === 'mini') list.push({ icon: stateIcon('elite', 'bloodfury'), name: 'Elite', desc: 'More health and damage than normal enemies.', kind: 'buff' })
    return list
  }
  // obszar wroga na płótnie (do tooltipa), w pikselach CSS płótna
  mobBox: { x0: number; y0: number; x1: number; y1: number } | null = null

  mobDebuffs(s: GameState, y: number) {
    const list = this.mobAuras(s)
    if (!list.length) return
    const ctx = this.ctx
    const sz = 16
    const x0 = this.mobX - (list.length * (sz + 2) - 2) / 2
    list.forEach((d, i) => {
      const x = x0 + i * (sz + 2)
      const im = img(d.icon)
      ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, sz + 2, sz + 2)
      if (im.complete) ctx.drawImage(im, x, y, sz, sz)
      ctx.strokeStyle = d.kind === 'buff' ? '#20a020' : '#c02020'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, sz + 1, sz + 1)
      if (d.left != null) this.text(`${Math.ceil(d.left)}`, x + sz / 2, y + sz - 1, '#ffd100', 9, true)
    })
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



  // ---------------------------------------------------------------- postacie
  // Bohater jako pikselowy sprite z animacjami (render/sprites.ts): idle, chód, atak, strzał, czar, trafienie, śmierć, odpoczynek.
  // Formy druida i duch wilka szamana mają własne sprite'y.
  heroAnimT = 0
  hurtT = 0
  atkT = 0
  deathT = 0
  heroKey(s: GameState): HeroKey {
    const h = s.hero
    const shooting = h.cls === 'hunter' && !!h.equip.ranged && !(s.phase === 'fight' && heroInMelee(s))
    const it = shooting ? h.equip.ranged : h.equip.mainhand
    const t = it?.weaponType ?? (h.cls === 'hunter' ? 'Bow' : h.cls === 'rogue' ? 'Dagger' : h.cls === 'warrior' || h.cls === 'paladin' ? 'Sword' : h.cls === 'shaman' ? 'Mace' : 'Staff')
    const W: Record<string, WeaponKind> = { 'Fist Weapon': 'Fist', Thrown: 'Dagger', Shield: 'none', Orb: 'none' }
    const weapon = (W[t] ?? t) as WeaponKind
    const o = h.equip.offhand?.weaponType
    const off: OffKind = !o ? 'none' : o === 'Shield' ? 'Shield' : o === 'Orb' ? 'Orb' : 'Weapon'
    return { race: h.race, cls: h.cls, weapon, off }
  }
  // rysuje sprite stopami w (x, gy); skala w całych pikselach ekranu, bez wygładzania. Zwraca obrys treści.
  blitS(sp: Sprite, x: number, gy: number, mult = 1) {
    const c = this.ctx
    const k = Math.max(1, Math.round(this.sc * this.dpr * mult)) / this.dpr
    const dx = Math.round((x - sp.ox * k) * this.dpr) / this.dpr, dy = Math.round((gy - sp.oy * k) * this.dpr) / this.dpr
    const prev = c.imageSmoothingEnabled
    c.imageSmoothingEnabled = false
    c.drawImage(sp.cv, dx, dy, sp.cv.width * k, sp.cv.height * k)
    c.imageSmoothingEnabled = prev
    return { top: dy + sp.top * k, left: dx + sp.left * k, right: dx + sp.right * k, k }
  }
  hero(s: GameState, gy: number, moving: boolean, dt: number) {
    const c = this.ctx
    const p = this.px / 2
    const h = s.hero
    this.heroAnimT += dt
    if (this.heroLunge > 0) this.heroLunge -= dt
    if (this.castGlow > 0) this.castGlow -= dt
    if (this.hurtT > 0) this.hurtT -= dt
    if (this.atkT > 0) this.atkT -= dt
    const dead = s.phase === 'dead'
    if (dead) this.deathT += dt; else this.deathT = 0
    const x = this.heroX
    const fr = (fps: number, n: number) => Math.floor(this.heroAnimT * fps) % n
    // formy: duch wilka / forma podróżna druida w drodze, formy bojowe druida
    let form: FormKind | null = null
    if (s.phase === 'travel' && s.trip?.form && s.trip.kind === 'walk') form = h.cls === 'shaman' ? 'wolf' : 'cheetah'
    else if (h.cls === 'druid' && h.form !== 'caster' && !dead) form = h.form === 'bear' ? 'bear' : h.form === 'cat' ? 'cat' : 'moonkin'
    if (form) {
      const fa: FormAnim = moving || form === 'wolf' || form === 'cheetah' ? 'walk' : this.atkT > 0 ? 'attack' : 'idle'
      const f = fa === 'walk' ? fr(14, 8) : fa === 'attack' ? Math.min(5, Math.floor((0.45 - this.atkT) / 0.45 * 6)) : fr(5, 4)
      this.shadow(x, gy, (form === 'bear' ? 15 : 12) * p)
      c.save()
      if (form === 'wolf') { c.globalAlpha = 0.85; c.filter = 'drop-shadow(0 0 4px #7ad0ff)' }
      this.blitS(formSprite(form, h.race, fa, f), x + (this.heroLunge > 0 ? 4 : 0), gy)
      c.restore()
      if (form === 'moonkin' && this.castGlow > 0) { c.globalAlpha = Math.min(1, this.castGlow * 2); c.fillStyle = this.castColor; c.beginPath(); c.arc(x + 14 * p, gy - 22 * p, 3 * p, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1 }
      return
    }
    const key = this.heroKey(s)
    let anim: Anim = 'idle', f = fr(6, 8)
    const shooting = key.weapon === 'Bow' || key.weapon === 'Gun' || key.weapon === 'Crossbow'
    if (dead) { anim = 'death'; f = Math.min(7, Math.floor(this.deathT / 0.14)) }
    else if (s.phase === 'rest') { anim = 'sit'; f = fr(1.5, 2) }
    else if (moving) { anim = 'walk'; f = fr(12, 8) }
    else if (this.hurtT > 0 && this.atkT <= 0) { anim = 'hurt'; f = Math.min(3, Math.floor((0.24 - this.hurtT) / 0.06)) }
    else if (this.atkT > 0) { anim = shooting ? 'shoot' : 'attack'; f = Math.min(7, Math.floor((0.45 - this.atkT) / 0.45 * 8)) }
    else if (h.casting || this.castGlow > 0) { anim = 'cast'; const t = Math.floor(this.heroAnimT * 12); f = t < 3 ? t : 3 + (t % 5) }
    if (anim !== this.lastAnim) { if (anim === 'cast' || anim === 'walk' || anim === 'idle') this.heroAnimT = 0; this.lastAnim = anim }
    const L = LOOKS[h.race]
    if (!dead || f < 7) this.shadow(x, gy, (L.torsoW * 0.75 + 2) * p)
    c.save()
    if (dead && this.deathT > 1.2) { c.globalAlpha = 0.5; c.filter = 'grayscale(1) brightness(1.4)' }
    this.blitS(heroSprite(key, anim, f), x + (this.heroLunge > 0 && anim !== 'attack' ? 3 : 0), gy)
    c.restore()
    const top = gy - (L.leg + L.torsoH + L.headH) * p
    if (h.shield > 0) { c.strokeStyle = 'rgba(255,240,160,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(x, gy - (L.leg + L.torsoH) * p * 0.8, (L.leg + L.torsoH + L.headH) * p * 0.75, 0, Math.PI * 2); c.stroke() }
    if (s.phase === 'rest') this.text('🍞', x + 12 * p, top + 6 * p, '#fff', 12)
  }
  lastAnim: Anim = 'idle'













}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)))
  r = f(r); g = f(g); b = f(b)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
