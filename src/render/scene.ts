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
import { Vfx, spellLook, PAL, type ProjKind } from './vfx'
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

type Float = { x: number; y: number; vy: number; text: string; color: string; life: number; max: number; size: number; delay?: number }
type Corpse = { name: string; type: MobType; color: string; x: number; life: number; count: number; scale: number }
type Fx = { kind: 'levelup' | 'heal' | 'racial' | 'death' | 'nova'; life: number; text?: string; x?: number }

const GHOST_AT = 1.6 // s po śmierci: przejście w ducha (w środku zaciemnienia)
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
  vfx = new Vfx(() => this.ctx)
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

  heroAt: number | null = null // stałe miejsce postaci (portret w oknie postaci)
  get heroBaseX() { return this.heroAt ?? Math.max(60, Math.min(this.w * 0.32, 260)) }
  // postać walcząca wręcz wybiega naprzeciw wroga (heroOff), po walce wraca na swoje miejsce
  heroOff = 0
  heroOffWant = 0
  petX: number | null = null
  packSlide = 0 // grupa podchodzi po śmierci pierwszego
  petCorpse: { x: number; life: number; kind: 'beast' | 'voidwalker' } | null = null
  petPos = 0
  petHurtT = 0
  get heroX() { return this.heroBaseX + this.heroOff }
  get groundY() { return this.h - 14 }
  zoom = 0
  get px() { return this.zoom || Math.max(2, Math.round(this.h / 34)) }

  // wróg zawsze dochodzi do zwarcia; dystansowcy strzelają, gdy jeszcze biegnie
  mobTarget(_s: GameState) {
    return this.heroBaseX + 44 * (this.px / 2)
  }
  totemVis: { id: string; el: string; x: number; life: number; gone: boolean }[] = []

  onEvent(e: GameEvent, s: GameState) {
    const hx = this.heroX
    const mx = this.mobX
    const top = this.groundY - 20 * this.px
    const add = (x: number, text: string, color: string, size = 12, delay = 0) => this.floats.push({ x: x + (Math.random() * 16 - 8), y: top, vy: -18, text, color, life: 1.4, max: 1.4, size, delay })
    const gy = this.groundY, sc = this.sc
    const hand = { x: hx + 9 * sc, y: gy - 13 * sc }
    const mobC = { x: mx - 2 * sc, y: gy - 11 * sc }
    switch (e.t) {
      case 'dmg':
        if (e.src === 'mob' && e.target === 'pet') {
          this.mobAtkT = 0.42
          const px2 = this.petPos || hx
          if (e.miss) add(px2, 'Miss', '#ffffff', 10)
          else { add(px2, `-${e.amt}${e.crit ? '!' : ''}`, '#ff9a60', e.crit ? 14 : 11); this.petHurtT = 0.2; this.vfx.hit({ kind: 'claw', school: 'physical', x: px2 + 4 * sc, y: gy - 8 * sc, gy, life: 0.3, crit: !!e.crit }) }
        } else if (e.src === 'mob') {
          this.mobAtkT = 0.42
          // wróg dystansowy strzela / rzuca czar z daleka
          let dl = 0
          const sm = s.mob
          if (sm?.ranged && sm.dist > 0) {
            const caster = /mage|shaman|priest|warlock|necro|witch|seer|oracle|mystic|geomancer|conjur|cultist|channel|acolyte|apprentice|sorcer|hex|spellbinder|enchant|wizard|summon|invoker|earthcaller|adept|felsworn|shadow hunter/i.test(sm.name)
            const sch = /shadow|cult|necro|warlock|felsworn|witch|hex/i.test(sm.name) ? 'shadow' : /shaman|earthcaller|geomancer|seer|oracle/i.test(sm.name) ? 'nature' : /frost/i.test(sm.name) ? 'frost' : 'fire'
            const kind = caster ? 'orb' : /thrower|headhunter/i.test(sm.name) ? 'thrown' : 'arrow'
            dl = this.shoot(kind, caster ? sch : 'physical', { x: mx - 6 * sc, y: gy - 13 * sc }, { x: hx + 2 * sc, y: gy - 12 * sc }, !!e.crit, !e.miss)
          }
          if (e.miss) { add(hx, e.miss === 'dodge' ? 'Dodge' : e.miss === 'parry' ? 'Parry' : e.miss === 'absorb' ? 'Absorb' : 'Miss', '#ffffff', 10, dl); break }
          add(hx, `-${e.amt}${e.crit ? '!' : ''}`, '#ff4040', e.crit ? 15 : 12, dl)
          const hitHero = () => { this.hurtT = 0.24; this.vfx.hit({ kind: 'claw', school: 'physical', x: this.heroX + 5 * sc, y: gy - 14 * sc, gy, life: 0.3, crit: !!e.crit }) }
          if (dl > 0) setTimeout(hitHero, dl * 1000); else hitHero()
          break
        } else {
          const school = e.school ?? 'physical'
          const phys = school === 'physical'
          const missTxt = `${e.ability ? `${e.ability}: ` : ''}${e.miss === 'dodge' ? 'Dodge' : e.miss === 'parry' ? 'Parry' : 'Miss'}`
          const num = () => `${e.amt}${e.glance ? ' (glancing)' : ''}`
          const col = e.src === 'pet' ? '#ffd28a' : !phys ? SCHOOL_COLOR[school] : '#ffff66'
          // jak pokazać trafienie: pocisk / strzała / promień / błyskawica / cięcie
          let delay = 0
          if (e.src === 'pet') {
            if (!e.miss) this.vfx.hit({ kind: 'spark', school, x: mobC.x, y: mobC.y, gy, life: 0.25, crit: !!e.crit })
          } else if (e.tick) {
            if (!e.miss) this.vfx.hit({ kind: 'tick', school, x: mobC.x, y: mobC.y, gy, life: 0.6, crit: !!e.crit })
          } else {
            const shooter = this.shotKind(s, e.ability)
            if (shooter) {
              if (shooter !== 'wand' && this.atkT <= 0.1) this.atkT = 0.45
              else if (shooter === 'wand') this.castGlow = 0.3
              delay = this.shoot(shooter, school, hand, mobC, !!e.crit, !e.miss)
            } else if (phys) {
              if (this.atkT <= 0.1) this.atkT = 0.45
              this.vfx.hit({ kind: 'slash', school, x: mobC.x - 2 * sc, y: gy - 16 * sc, gy, life: 0.24, crit: !!e.crit })
              if (!e.miss && e.crit) this.vfx.hit({ kind: 'burst', school, x: mobC.x, y: mobC.y, gy, life: 0.3, crit: true })
            } else {
              const look = spellLook(e.ability, school)
              if (look.proj) delay = this.shoot(look.proj, school, hand, mobC, !!e.crit, !e.miss)
              else if (look.hit === 'bolt') { this.vfx.hit({ kind: 'bolt', school, x: mobC.x, y: mobC.y, x0: hand.x, y0: hand.y, gy, life: 0.28, crit: !!e.crit }); if (!e.miss) this.vfx.hit({ kind: 'burst', school: 'frost', x: mobC.x, y: mobC.y, gy, life: 0.35, crit: !!e.crit }) }
              else if (look.hit === 'aoe') this.vfx.hit({ kind: 'aoe', school, x: mx + ((this.lastAlive - 1) * this.groupGap) / 2, y: mobC.y, gy, life: 0.7, crit: !!e.crit, w: 30 * sc + (this.lastAlive - 1) * this.groupGap })
              else if (look.hit) this.vfx.hit({ kind: look.hit, school, x: mobC.x, y: mobC.y, gy, life: look.hit === 'beam' ? 0.5 : 0.4, crit: !!e.crit })
            }
          }
          if (e.miss) add(mx, missTxt, '#dddddd', 11, delay)
          else {
            add(mx, num(), col, e.crit ? 17 : 12, delay)
            const hitNow = () => { this.mobFlash = 0.15; this.mobHurtT = 0.2 }
            if (delay > 0) setTimeout(hitNow, delay * 1000); else hitNow()
            if (e.src === 'hero' && phys && !this.shotKind(s, e.ability)) this.heroLunge = 0.18
            if (e.src === 'pet') this.petAtkT = 0.42
          }
        }
        break
      case 'heal':
        add(hx, `+${e.amt}`, '#40ff60', 12)
        this.vfx.hit({ kind: 'heal', school: 'nature', x: hx, y: gy - 12 * sc, gy, life: 0.9, crit: false })
        break
      case 'cast':
        this.castGlow = 0.4
        this.castColor = SCHOOL_COLOR[e.school ?? 'physical']
        if (e.kind === 'buff' || e.kind === 'shield' || e.kind === 'cooldown' || e.kind === 'regen') this.vfx.hit({ kind: 'buff', school: e.school && e.school !== 'physical' ? e.school : 'holy', x: hx, y: gy, gy, life: 0.8, crit: false })
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
        // padają wszyscy, którzy jeszcze stali (np. cała grupa jednym ciosem)
        if (m) for (let i = 0; i < Math.max(1, this.lastAlive); i++) this.corpses.push({ name: m.name, type: m.type, color: m.color, x: this.mobX + this.packSlide + i * this.groupGap, life: 2.5 + i * 0.08, count: 1, scale: m.scale })
        this.packSlide = 0
        break
      }
      case 'subkill': {
        const m = this.lastMobState
        // pada pierwszy z przodu, reszta grupy podchodzi o jedno miejsce
        if (m) this.corpses.push({ name: m.name, type: m.type, color: m.color, x: this.mobX + this.packSlide, life: 2.5, count: 1, scale: m.scale })
        this.packSlide += this.groupGap
        this.lastAlive = Math.max(1, this.lastAlive - 1)
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
      case 'petdeath':
        this.petCorpse = { x: this.petPos || this.heroX - 22 * (this.px / 2), life: 2.5, kind: s.hero.cls === 'hunter' ? 'beast' : 'voidwalker' }
        this.petX = null
        add(this.petPos || hx, `${e.name} dies`, '#ff8060', 11)
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
    // bieg naprzeciw wroga: postać rusza się sama (tło stoi)
    const charging = s.phase === 'fight' && !!s.mob && s.mob.dist > 0 && Math.abs(this.heroOffWant - this.heroOff) > 0.5
    const moving = s.phase === 'walk' || s.phase === 'travel' || (s.phase === 'dead' && this.deathT > GHOST_AT && s.phaseT > 0.6)
    if (moving) this.scroll += dt * (s.phase === 'travel' ? 70 : 42) * (s.phase === 'dead' ? 1.5 : 1)
    if (!(s.phase === 'fight' && s.mob)) this.heroOffWant = 0
    { const dlt = this.heroOffWant - this.heroOff; const sp = (s.phase === 'fight' ? 700 : s.phase === 'walk' || s.phase === 'travel' || s.phase === 'town' || s.phase === 'dead' ? 160 : 0) * dt; this.heroOff += Math.abs(dlt) <= sp ? dlt : Math.sign(dlt) * sp }

    // tło: pikselowe niebo, wzgórza, rekwizyty biomu i ziemia (render/backdrop.ts)
    const gy = this.groundY
    const bo: BackOpts = { w, h, sc: this.sc, scroll: this.scroll, t: this.t, biome: zone.biome, gy, town: s.where !== 'field' }
    if (!(s.phase === 'travel' && s.trip && (s.trip.kind === 'ship' || s.trip.kind === 'zeppelin' || s.trip.kind === 'tram'))) drawBackdrop(ctx, bo)

    if (s.where !== 'field') {
      this.town(s, gy, dt)
      drawForeground(ctx, bo)
      return
    }
    if (s.phase === 'travel' && s.trip && s.trip.kind === 'tram') {
      this.tram(s, dt)
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
    if (this.petCorpse) {
      const pc = this.petCorpse
      pc.life -= dt
      if (moving) pc.x -= dt * 42
      ctx.globalAlpha = Math.max(0, Math.min(1, pc.life))
      this.blitS(petSprite(pc.kind, 'death', Math.min(5, Math.floor((2.5 - pc.life) / 0.12))), pc.x, gy, 1)
      ctx.globalAlpha = 1
      if (pc.life <= 0) this.petCorpse = null
    }

    // mob: pikselowy sprite z animacją (podchodzi, stoi, atakuje, dostaje cios); grupa = kilka osobników jeden za drugim
    this.mobBox = null
    if (this.mobAtkT > 0) this.mobAtkT -= dt
    if (this.mobHurtT > 0) this.mobHurtT -= dt
    if (this.mobFlash > 0) this.mobFlash -= dt
    this.mobAnimT += dt
    if (s.mob) {
      const target = this.mobTarget(s)
      const start = this.w + 30
      const m = s.mob
      // podział drogi: część przebiegła postać (heroRun), resztę przeszedł wróg
      const d0 = Math.max(0.01, m.dist0)
      const G = start - target
      const heroShare = Math.max(0, Math.min(1, (m.heroRun ?? 0) / d0))
      const mobShare = Math.max(0, Math.min(1, (d0 - m.dist - (m.heroRun ?? 0)) / d0))
      this.heroOffWant = heroShare * G
      const k = 1 - mobShare
      const want = target + G * k
      const rooted = (m.root ?? 0) > 0, feared = (m.fear ?? 0) > 0 && m.stun <= 0
      const fleeing = feared && want > this.mobX + 0.01
      const approaching = !rooted && m.stun <= 0 && !feared && (this.mobX > want + 0.5 || m.dist > 0)
      this.mobX = this.mobX > want ? Math.max(want, this.mobX - dt * 900) : want
      const boss = s.mob.boss
      const bscale = boss === 'zone' ? 1.7 : boss === 'mini' ? 1.4 : 1
      const stunned = s.mob.stun > 0 || (rooted && m.rootl === 'ice')
      let anim: CAnim = 'idle', f = Math.floor(this.mobAnimT * 5) % 4
      if (stunned) f = 0
      else if (fleeing) { anim = 'walk'; f = Math.floor(this.mobAnimT * 14) % 8 }
      else if (this.mobHurtT > 0) { anim = 'hurt'; f = Math.min(3, Math.floor((0.2 - this.mobHurtT) / 0.05)) }
      else if (this.mobAtkT > 0) { anim = 'attack'; f = Math.min(5, Math.floor((0.42 - this.mobAtkT) / 0.07)) }
      else if (approaching) { anim = 'walk'; f = Math.floor(this.mobAnimT * 12) % 8 }
      const alive = Math.max(1, Math.min(s.mob.count, Math.ceil(s.mob.hp / s.mob.per - 1e-6)))
      this.lastAlive = alive
      if (this.packSlide > 0) this.packSlide = Math.max(0, this.packSlide - dt * 60)
      const sliding = this.packSlide > 0.5
      const baseX = this.mobX + this.packSlide
      const main = mobSprite(s.mob.name, s.mob.type, s.mob.color, anim, f)
      const scale = main.scale * bscale
      this.lastMobState = { name: s.mob.name, type: s.mob.type, color: s.mob.color, count: s.mob.count, scale: bscale }
      // dalsi z grupy (ciemniejsi), za głównym
      for (let i = alive - 1; i >= 1; i--) {
        const gx = baseX + i * this.groupGap
        const held = m.cc > 0 && i === alive - 1 // ostatni z grupy obezwładniony (Polymorph, Freezing Trap, Blind)
        if (held && m.ccl === 'poly') { this.shadow(gx, gy, 5 * this.sc * scale); this.sheep(gx, gy, Math.max(1, Math.round(this.sc * this.dpr * scale)) / this.dpr); continue }
        const mv = (approaching || sliding) && !held
        const sp = mobSprite(s.mob.name, s.mob.type, s.mob.color, mv ? 'walk' : 'idle', held || stunned ? 0 : (f + i * 3) % (mv ? 8 : 4), 0.12 * i)
        this.shadow(gx, gy, ((sp.right - sp.left) / 2.4) * this.sc * scale)
        const rr = this.blitFlip(sp, gx, gy, scale, fleeing)
        if (held) this.ccFx(m.ccl === 'ice' ? 'iceblock' : 'blind', rr, gy)
        else this.mobCC(m, rr, gy, true)
      }
      if (boss) {
        const ag = ctx.createRadialGradient(this.mobX, gy - 14 * p * bscale / 2, 2, this.mobX, gy - 14 * p * bscale / 2, 30 * bscale * (p / 2))
        ag.addColorStop(0, boss === 'zone' ? 'rgba(255,60,30,.35)' : 'rgba(255,160,40,.28)')
        ag.addColorStop(1, 'rgba(255,80,0,0)')
        ctx.fillStyle = ag
        ctx.fillRect(this.mobX - 60 * bscale, gy - 70 * bscale, 120 * bscale, 80 * bscale)
      }
      if (!main.air) this.shadow(baseX, gy, ((main.right - main.left) / 2.4) * this.sc * scale)
      else this.shadow(baseX, gy, 6 * this.sc * scale)
      ctx.save()
      if (this.mobFlash > 0) ctx.filter = 'brightness(1.8)'
      const r = this.blitFlip(sliding && anim === 'idle' ? mobSprite(s.mob.name, s.mob.type, s.mob.color, 'walk', Math.floor(this.mobAnimT * 12) % 8) : main, baseX, gy, scale, fleeing)
      ctx.restore()
      this.mobCC(m, r, gy, false)
      // tabliczka z imieniem i pasek HP moba (jak nameplate) nad głową
      const bw = boss ? 70 : 44
      const by = Math.max(boss ? 38 : 36, Math.round(r.top - 8))
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
      this.mobDebuffs(s, by - (boss ? 33 : 31))
      this.mobBox = { x0: Math.min(r.left, this.mobX - bw / 2) - 4, y0: by - 16, x1: Math.max(r.right, this.mobX + bw / 2) + (alive - 1) * this.groupGap + 4, y1: gy + 4 }
    }

    // pupil
    const pet = activePet(s.hero)
    if (pet && s.phase !== 'dead') {
      const q = p / 2
      // pupil-tank płynnie biegnie do wroga i trzyma go w miejscu; po walce wraca do postaci
      const m = s.phase === 'fight' ? s.mob : null
      const engage = !!m && !!pet.tank && (m.petOn || m.petIn != null || m.dist <= 0)
      const home = this.heroX - 22 * q
      if (this.petX == null || !isFinite(this.petX)) this.petX = home
      const wantX = engage ? this.mobX - 24 * q : home
      const spd = (engage ? 520 : 240) * dt
      const dx = wantX - this.petX
      this.petX += Math.abs(dx) <= spd ? dx : Math.sign(dx) * spd
      const px = this.petX
      this.petPos = px
      const running = Math.abs(dx) > 2
      const walk = moving ? Math.sin(this.t * 10) : 0
      const kind = s.hero.cls === 'hunter' ? 'beast' : pet.tank ? 'voidwalker' : 'imp'
      const pa: CAnim = moving || running ? 'walk' : this.petAtkT > 0 ? 'attack' : this.petHurtT > 0 ? 'hurt' : 'idle'
      if (this.petHurtT > 0) this.petHurtT -= dt
      if (this.petAtkT > 0) this.petAtkT -= dt
      const pf = pa === 'walk' ? Math.floor(this.t * (running ? 16 : 12)) % 8 : pa === 'attack' ? Math.min(5, Math.floor((0.42 - this.petAtkT) / 0.07)) : pa === 'hurt' ? Math.min(3, Math.floor((0.2 - this.petHurtT) / 0.05)) : Math.floor(this.t * 5) % 4
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
    this.hero(s, gy, moving || charging, dt)

    // pociski, trafienia, cięcia, promienie
    this.vfx.update(dt, this.sc)

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
      }
    }
    this.fx = this.fx.filter((f) => f.life > 0)

    drawForeground(ctx, bo)

    // świat duchów: chłodny odcień, a przy przejściu w ducha krótkie zaciemnienie
    if (s.phase === 'dead') {
      const dT = this.deathT
      if (dT > GHOST_AT - 0.2) { ctx.fillStyle = 'rgba(70,110,160,.22)'; ctx.fillRect(0, 0, w, h) }
      const fade = dT < GHOST_AT - 0.45 ? 0 : dT < GHOST_AT ? (dT - (GHOST_AT - 0.45)) / 0.45 : Math.max(0, 1 - (dT - GHOST_AT) / 0.55)
      if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, w, h) }
    }

    // latające liczby
    for (const f of this.floats) {
      if (f.delay && f.delay > 0) { f.delay -= dt; continue }
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


  // Deeprun Tram: gnomi tunel pod wodą — kamienne łuki z lampami, szklane okna na głębię (ryby, bąbelki),
  // tory z podkładami i otwarty wagonik z mosiężnymi słupkami, w którym stoi postać.
  tramScroll = 0
  tram(s: GameState, dt: number) {
    const c = this.ctx
    const { w, h } = this
    const u = Math.max(1, Math.round(this.sc * this.dpr)) / this.dpr
    this.tramScroll += dt * 210
    const sc = this.tramScroll
    const gy = this.groundY
    const R = (x: number, y: number, ww: number, hh: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(ww), Math.ceil(hh)) }
    const hsh = (n: number) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x) }
    c.save()
    c.imageSmoothingEnabled = false
    // ściana tunelu: cegły z przesunięciem (paralaksa wolniej niż tory)
    R(0, 0, w, h, '#1c1a22')
    const bh = 5 * u, bw = 14 * u
    const wallOff = (sc * 0.75) % (bw * 2)
    for (let y = 0, row = 0; y < gy; y += bh, row++) {
      const o = (row % 2 ? bw / 2 : 0) - wallOff
      for (let x = o - bw * 2; x < w + bw; x += bw) {
        const id = Math.floor((x + sc * 0.75) / bw) * 31 + row
        R(x + u, y + u, bw - u, bh - u, hsh(id) > 0.5 ? '#2c2a33' : '#26242d')
      }
    }
    // segmenty: co P pikseli filar z łukiem i lampą; pomiędzy co drugim — wielkie okno na wodę
    const P = 150 * u
    const segOff = (sc * 0.75) % P
    const segBase = Math.floor((sc * 0.75) / P)
    const wy0 = Math.round(h * 0.1), wy1 = Math.round(gy - 18 * u)
    for (let i = -1; i <= Math.ceil(w / P) + 1; i++) {
      const x0 = i * P - segOff
      const seg = segBase + i
      if (seg % 3 !== 0) {
        // okno: głęboka woda z promieniami światła, rybami i bąbelkami
        const wx0 = x0 + 14 * u, wx1 = x0 + P - 8 * u
        const gr = c.createLinearGradient(0, wy0, 0, wy1)
        gr.addColorStop(0, '#1a5a8a'); gr.addColorStop(1, '#061a30')
        c.fillStyle = gr; c.fillRect(Math.round(wx0), wy0, Math.round(wx1 - wx0), wy1 - wy0)
        c.save(); c.beginPath(); c.rect(wx0, wy0, wx1 - wx0, wy1 - wy0); c.clip()
        c.globalAlpha = 0.12
        for (let k = 0; k < 3; k++) { c.fillStyle = '#bfe8ff'; const rx = wx0 + ((seg * 37 + k * 50) % 100) / 100 * (wx1 - wx0); c.beginPath(); c.moveTo(rx, wy0); c.lineTo(rx + 10 * u, wy0); c.lineTo(rx - 14 * u, wy1); c.lineTo(rx - 22 * u, wy1); c.fill() }
        c.globalAlpha = 1
        // ryby płyną powoli w lewo (dalszy plan: wolniejsza paralaksa)
        for (let k = 0; k < 2; k++) {
          const fy = wy0 + (0.25 + hsh(seg * 7 + k) * 0.5) * (wy1 - wy0)
          const fx = wx1 - ((this.t * (14 + k * 9) + hsh(seg + k * 3) * 200) * u) % (wx1 - wx0 + 30 * u)
          const fc = k ? '#2a4a6a' : '#3a6a8a'
          R(fx, fy, 6 * u, 3 * u, fc); R(fx + 6 * u, fy - u, 2 * u, 5 * u, fc); R(fx + u, fy + u, u, u, '#8ac0e0')
        }
        if (seg % 7 === 2) { // wielki cień (rekin / leviathan) w oddali
          const fx = wx1 - ((this.t * 6) * u) % (wx1 - wx0 + 60 * u), fy = wy0 + (wy1 - wy0) * 0.45
          c.globalAlpha = 0.35; R(fx, fy, 26 * u, 6 * u, '#04101c'); R(fx + 26 * u, fy - 3 * u, 5 * u, 12 * u, '#04101c'); R(fx + 10 * u, fy - 4 * u, 4 * u, 4 * u, '#04101c'); c.globalAlpha = 1
        }
        for (let k = 0; k < 6; k++) {
          const bx = wx0 + hsh(seg * 13 + k) * (wx1 - wx0)
          const by = wy1 - ((this.t * (10 + k * 3) * u + hsh(k + seg) * (wy1 - wy0)) % (wy1 - wy0))
          R(bx + Math.sin(this.t * 3 + k) * u, by, u, u, 'rgba(200,235,255,.7)')
        }
        c.restore()
        // mosiężna rama okna z nitami
        R(wx0 - u, wy0 - 2 * u, wx1 - wx0 + 2 * u, 2 * u, '#9a7a3a'); R(wx0 - u, wy1, wx1 - wx0 + 2 * u, 2 * u, '#6a5228')
        for (let x = wx0 + 4 * u; x < wx1; x += 24 * u) { R(x, wy0, 2 * u, wy1 - wy0, 'rgba(154,122,58,.85)'); R(x, wy0 - u, 2 * u, u, '#e0c070') }
      }
      // filar z łukiem
      R(x0, 0, 10 * u, gy, '#3a3640'); R(x0 + 2 * u, 0, 2 * u, gy, '#4a4652'); R(x0 + 8 * u, 0, 2 * u, gy, '#2a2630')
      // lampa na filarze: żółte światło z poświatą
      const ly = Math.round(h * 0.32)
      const gl = c.createRadialGradient(x0 + 5 * u, ly, 1, x0 + 5 * u, ly, 26 * u)
      gl.addColorStop(0, 'rgba(255,210,120,.45)'); gl.addColorStop(1, 'rgba(255,200,100,0)')
      c.fillStyle = gl; c.fillRect(x0 - 26 * u, ly - 26 * u, 62 * u, 52 * u)
      R(x0 + 3 * u, ly - 3 * u, 4 * u, 5 * u, '#2a2018'); R(x0 + 4 * u, ly - 2 * u, 2 * u, 3 * u, Math.sin(this.t * 13 + seg) > -0.9 ? '#ffe080' : '#c09040')
    }
    // podłoże: tłuczeń, podkłady i szyny (najszybciej)
    R(0, gy - 3 * u, w, h - gy + 3 * u, '#14121a')
    const slp = 10 * u, so = sc % slp
    for (let x = -so; x < w; x += slp) R(x, gy - 2 * u, 5 * u, 3 * u, '#3a2a1c')
    R(0, gy - 3 * u, w, u, '#9a9aa8'); R(0, gy - 2 * u, w, u, '#5a5a66')
    // wagoniki: dwa otwarte wagony połączone sprzęgiem
    const cx = Math.round(w * 0.42)
    const joint = Math.floor(sc / (60 * u)) !== Math.floor((sc - dt * 210) / (60 * u)) // stuk na złączu szyn
    this.tramBump = joint ? 1 : Math.max(0, this.tramBump - dt * 8)
    const bump = Math.round(this.tramBump) * u
    const car = (x: number, len: number, front: boolean) => {
      const top = gy - 9 * u - bump
      // koła z obracającymi się szprychami
      for (const wx of [x - len / 2 + 7 * u, x + len / 2 - 7 * u]) {
        R(wx - 3 * u, gy - 7 * u, 6 * u, 6 * u, '#2a2a30'); R(wx - 2 * u, gy - 6 * u, 4 * u, 4 * u, '#6a6a74')
        const sp = Math.floor(sc / (3 * u)) % 2
        R(wx - (sp ? 2 : 0) * u, gy - (sp ? 4 : 6) * u, sp ? 4 * u : u, sp ? u : 4 * u, '#2a2a30')
      }
      // platforma, burta, słupki i dach
      R(x - len / 2, top, len, 3 * u, '#b08a3a'); R(x - len / 2, top + 2 * u, len, 2 * u, '#6a5020')
      for (let rx = x - len / 2 + 2 * u; rx < x + len / 2; rx += 8 * u) R(rx, top + u, u, u, '#f0d080')
      const roofY = top - 34 * u
      for (const px of [x - len / 2 + u, x, x + len / 2 - 3 * u]) R(px, roofY, 2 * u, 34 * u, '#8a6a2a')
      R(x - len / 2 - 2 * u, roofY - 3 * u, len + 4 * u, 3 * u, '#5a6a7a'); R(x - len / 2 - 2 * u, roofY - 4 * u, len + 4 * u, u, '#8a9aaa')
      R(x - len / 2, top - 10 * u, len, u, '#c0a050') // poręcz
      if (front) { R(x + len / 2, top - 6 * u, 3 * u, 8 * u, '#3a4048'); R(x + len / 2 + u, top - 4 * u, 2 * u, 2 * u, Math.sin(this.t * 6) > 0 ? '#ffe080' : '#ffb040') }
      return top
    }
    const len = 64 * u
    car(cx - len - 6 * u, len, false)
    R(cx - len / 2 - 7 * u, gy - 7 * u - bump, 8 * u, 2 * u, '#3a3a40') // sprzęg
    const top = car(cx, len, true)
    // iskry spod kół
    if (Math.sin(this.t * 17) > 0.7) for (let i = 0; i < 3; i++) R(cx + len / 2 - 7 * u - i * 3 * u - hsh(this.t + i) * 6 * u, gy - 2 * u - hsh(this.t * 3 + i) * 3 * u, u, u, i ? '#ffd060' : '#ffffff')
    c.restore()
    // postać stoi w wagonie (z kołysaniem)
    c.save(); c.translate(cx - this.heroX - 8 * u, -(this.groundY - top)); this.hero(s, this.groundY, false, dt); c.restore()
    // przednia poręcz przed postacią
    R(cx - len / 2, top - 10 * u, len, u, '#c0a050')
    this.text(s.trip!.label, w * 0.78, 18, '#ffd100', 13, true)
    this.text(`${Math.ceil(s.phaseT)} s to arrival`, w * 0.78, 34, '#ffffff', 11, true)
  }
  tramBump = 0

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
    const by = (k: string) => { const id = mob.by?.[k]; return id ? c.abilities.find((x) => x.id === id) : undefined }
    const ccA = (k: string, st: string, fb: string, name: string, desc: string, left: number) => {
      const a = by(k)
      list.push({ icon: a ? abilityIcon(a, h.cls) : stateIcon(st, fb), name: a ? `${a.name} — ${name}` : name, desc, left, kind: 'debuff' })
    }
    const LOOKN: Record<string, string> = { stun: 'Stunned', sleep: 'Asleep', daze: 'Disoriented', silence: 'Silenced', fear: 'Feared' }
    if (mob.stun > 0) ccA('stun', 'stun', 'warstomp', LOOKN[mob.cct ?? 'stun'] ?? 'Stunned', 'Cannot attack or move.', mob.stun)
    if ((mob.root ?? 0) > 0) ccA('root', mob.rootl === 'ice' ? 'freeze' : 'root', 'slow', mob.rootl === 'ice' ? 'Frozen' : 'Rooted', 'Cannot move: it will not reach you (but still hits in melee).', mob.root!)
    if ((mob.fear ?? 0) > 0 && mob.stun <= 0) ccA('fear', 'fear', 'escape', 'Feared', 'Runs away in terror and cannot attack.', mob.fear!)
    if (mob.slow > 0) ccA('slow', 'slow', 'slow', 'Slowed', 'Movement speed reduced: takes longer to reach you.', mob.slow)
    if (mob.cc > 0) ccA('cc', 'cc', 'escape', mob.ccl === 'poly' ? 'Polymorphed' : mob.ccl === 'ice' ? 'Frozen' : 'Incapacitated', 'One enemy of the group is out of the fight.', mob.cc)
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
  // strzał z broni dystansowej (łowca z łukiem/strzelbą, różdżka) — rodzaj pocisku albo null
  shotKind(s: GameState, ability?: string): ProjKind | null {
    const h = s.hero
    if (ability === 'Shoot' && h.equip.ranged?.weaponType === 'Wand') return 'wand'
    if (h.cls !== 'hunter' || !h.equip.ranged || (s.phase === 'fight' && heroInMelee(s))) return null
    if (ability && /strike|bite|clip|counterattack/i.test(ability)) return null
    const w = h.equip.ranged.weaponType
    return w === 'Gun' ? 'bullet' : w === 'Thrown' ? 'thrown' : 'arrow'
  }
  // wypuszcza pocisk; zwraca czas lotu (liczba obrażeń pojawia się przy trafieniu)
  shoot(kind: ProjKind, school: School, from: { x: number; y: number }, to: { x: number; y: number }, crit: boolean, hits: boolean) {
    const dist = Math.max(10, to.x - from.x)
    const speed = kind === 'bullet' ? 1400 : kind === 'arrow' ? 760 : kind === 'thrown' ? 560 : kind === 'arcane' ? 620 : 480
    const dur = Math.min(0.45, dist / speed)
    const sc = this.sc
    this.vfx.proj({
      kind, school, x0: from.x, y0: from.y, x1: to.x + (hits ? 0 : 14 * sc), y1: to.y + (hits ? 0 : -6 * sc), dur, crit,
      arc: kind === 'arrow' ? Math.min(14 * sc, dist * 0.06) : kind === 'thrown' ? 6 * sc : 0,
      onHit: hits ? () => this.vfx.hit({ kind: 'burst', school: kind === 'arrow' || kind === 'bullet' || kind === 'thrown' ? 'physical' : school, x: to.x, y: to.y, gy: this.groundY, life: 0.35, crit }) : undefined,
    })
    return dur
  }
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
  // rysuje sprite odwrócony w poziomie (wróg uciekający w strachu)
  blitFlip(sp: Sprite, x: number, gy: number, mult: number, flip: boolean) {
    if (!flip) return this.blitS(sp, x, gy, mult)
    const c = this.ctx
    c.save(); c.translate(x * 2, 0); c.scale(-1, 1)
    const r = this.blitS(sp, x, gy, mult)
    c.restore()
    return { ...r, left: 2 * x - r.right, right: 2 * x - r.left }
  }
  // Efekty kontroli tłumu na wrogu — pikselowe, w skali sprite'ów
  mobCC(m: NonNullable<GameState['mob']>, r: { top: number; left: number; right: number; k: number }, gy: number, rear: boolean) {
    if (m.stun > 0 && !rear) this.ccFx(m.cct === 'fear' ? 'fear' : (m.cct ?? 'stun'), r, gy)
    if (m.stun > 0 && rear && (m.cct === 'stun' || m.cct === 'fear')) this.ccFx(m.cct === 'fear' ? 'fear' : 'stun', r, gy)
    if ((m.root ?? 0) > 0) this.ccFx(m.rootl === 'ice' ? 'frozenfeet' : 'roots', r, gy)
    if ((m.fear ?? 0) > 0 && m.stun <= 0) this.ccFx('fear', r, gy)
    if (m.slow > 0) this.ccFx('slow', r, gy)
  }
  private pat(rows: string[], x: number, y: number, u: number, pal: Record<string, string>, alpha = 1) {
    const c = this.ctx
    const w = rows[0].length, h = rows.length
    const x0 = Math.round(x - (w * u) / 2), y0 = Math.round(y - (h * u) / 2)
    c.save(); c.globalAlpha *= alpha
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const col = pal[rows[j][i]]
      if (!col) continue
      c.fillStyle = col; c.fillRect(x0 + i * u, y0 + j * u, u, u)
    }
    c.restore()
  }
  ccFx(kind: string, r: { top: number; left: number; right: number; k: number }, gy: number) {
    const c = this.ctx, u = r.k, t = this.t
    const U = Math.max(u, Math.round(u * 1.5 * this.dpr) / this.dpr) // większe piksele dla znaczków nad głową
    const cx = (r.left + r.right) / 2, w = r.right - r.left, hgt = gy - r.top
    switch (kind) {
      case 'stun': {
        const STAR = ['..a..', '.aba.', 'abbba', '.aba.', '..a..']
        for (let i = 0; i < 3; i++) {
          const a = t * 4.5 + (i * Math.PI * 2) / 3
          const front = Math.sin(a) > 0
          this.pat(STAR, cx + Math.cos(a) * Math.max(9 * u, w * 0.42), r.top + 3 * u + Math.sin(a) * 2.5 * u, U, { a: front ? '#e8b020' : '#9a7010', b: front ? '#fff6a0' : '#c8a040' })
        }
        return
      }
      case 'sleep': {
        const Z = ['aaaa', '..a.', '.a..', 'aaaa']
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.55 + i / 3) % 1
          this.pat(Z, cx + 6 * u + ph * 8 * u + Math.sin(ph * 6) * u, r.top + 4 * u - ph * 12 * u, Math.max(1, Math.round(U * (0.6 + ph * 0.6))), { a: '#d8ecff' }, 1 - ph * 0.8)
        }
        return
      }
      case 'daze': {
        for (let i = 0; i < 7; i++) {
          const a = t * 6 + i * 0.9, rad = (2 + i * 1.1) * u
          c.fillStyle = i % 2 ? '#d8d0ff' : '#9a88e0'
          c.fillRect(Math.round(cx + Math.cos(a) * rad), Math.round(r.top + 2 * u + Math.sin(a) * rad * 0.45), U, U)
        }
        return
      }
      case 'silence': {
        const NO = ['..aaa..', '.a...a.', 'a...a.a', 'a..a..a', 'a.a...a', '.a...a.', '..aaa..']
        this.pat(NO, cx + 8 * u, r.top + 2 * u + Math.sin(t * 3) * u, U, { a: '#c070ff' })
        return
      }
      case 'fear': {
        const SK = ['.aaa.', 'abaab', 'aaaaa', '.a.a.']
        this.pat(SK, cx + 8 * u, r.top + 2 * u + Math.sin(t * 5) * u, U, { a: '#e8dcff', b: '#3a1060' })
        for (let i = 0; i < 4; i++) {
          const ph = (t * 0.8 + i / 4) % 1
          c.fillStyle = `rgba(150,70,220,${0.7 * (1 - ph)})`
          c.fillRect(Math.round(cx - 6 * u + i * 4 * u), Math.round(r.top + hgt * 0.4 - ph * 14 * u), u, 2 * u)
        }
        return
      }
      case 'roots': {
        const n = Math.max(3, Math.round(w / (4 * u)))
        const top = Math.min(hgt * 0.45, 16 * u)
        for (let i = 0; i < n; i++) {
          const bx = r.left + ((i + 0.5) / n) * w
          for (let y = 0; y < top; y += u) {
            const sx = Math.round(bx + Math.sin(y / (3 * u) + i * 1.7 + t * 1.2) * 1.6 * u)
            c.fillStyle = (Math.floor(y / u) + i) % 3 === 0 ? '#3a6a1a' : '#5a9a2a'
            c.fillRect(sx, Math.round(gy - y - u), u, u)
            if (Math.floor(y / u) % 5 === 2) { c.fillStyle = '#9ae050'; c.fillRect(sx + (i % 2 ? u : -u), Math.round(gy - y - u), u, u) }
          }
        }
        c.fillStyle = '#4a3418'; c.fillRect(Math.round(r.left - 2 * u), Math.round(gy - u), Math.round(w + 4 * u), u)
        return
      }
      case 'frozenfeet': case 'iceblock': {
        const full = kind === 'iceblock'
        const hh = full ? hgt + 2 * u : Math.min(hgt * 0.4, 14 * u)
        const x0 = Math.round(r.left - 2 * u), x1 = Math.round(r.right + 2 * u), y0 = Math.round(gy - hh)
        c.fillStyle = 'rgba(150,215,255,.42)'; c.fillRect(x0, y0, x1 - x0, gy - y0)
        c.fillStyle = 'rgba(230,250,255,.8)'
        c.fillRect(x0, y0, x1 - x0, u); c.fillRect(x0, y0, u, gy - y0); c.fillRect(x1 - u, y0, u, gy - y0)
        for (let i = 0; i < 4; i++) c.fillRect(Math.round(x0 + (2 + i) * u), Math.round(y0 + (2 + i * 2) * u), u, u)
        // szpikulce lodu u góry
        c.fillStyle = 'rgba(200,240,255,.9)'
        for (let x = x0 + u; x < x1 - u; x += 3 * u) { c.fillRect(x, y0 - u, u, u); if ((x / u) % 2 < 1) c.fillRect(x, y0 - 2 * u, u, u) }
        if (Math.sin(t * 2) > 0.85) { c.fillStyle = '#fff'; c.fillRect(x0 + 2 * u, y0 + 2 * u, u, u) }
        return
      }
      case 'blind': {
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7 + t * 1.5, rad = (3 + (i % 3) * 2) * u
          c.fillStyle = i % 3 ? 'rgba(120,110,100,.7)' : 'rgba(200,190,170,.7)'
          c.fillRect(Math.round(cx - 2 * u + Math.cos(a) * rad), Math.round(r.top + 4 * u + Math.sin(a) * rad * 0.6), 2 * u, 2 * u)
        }
        return
      }
      case 'slow': {
        for (let i = 0; i < 5; i++) {
          const ph = (t * 0.7 + i / 5) % 1
          c.fillStyle = `rgba(140,200,255,${0.8 * (1 - ph)})`
          c.fillRect(Math.round(r.left + ((i + 0.5) / 5) * w), Math.round(gy - 2 * u - ph * 10 * u), u, u)
        }
        return
      }
    }
  }
  // owca (Polymorph) — mały pikselowy sprite
  sheep(x: number, gy: number, u: number) {
    const S = [
      '...wwwwww...',
      '..wWwwwWww..',
      'kkwwwwwwwww.',
      'kekwWwwwwWw.',
      'kkwwwwwwwww.',
      '.k.wwwwwwww.',
      '...k.k..k.k.',
      '...k.k..k.k.',
    ]
    const bob = Math.sin(this.t * 3) > 0.6 ? u : 0
    u = Math.max(u, Math.round(u * 1.4 * this.dpr) / this.dpr)
    this.pat(S, x, gy - 4 * u - bob, u, { w: '#f0ece0', W: '#c8c0b0', k: '#2a2420', e: '#e04040' })
    // pink polymorph sparkle
    if (Math.sin(this.t * 4) > 0.5) { this.ctx.fillStyle = '#ffa0f0'; this.ctx.fillRect(Math.round(x + 5 * u), Math.round(gy - 12 * u), u, u) }
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
    // śmierć: animacja upadku, krótkie zaciemnienie, potem już tylko duch (bez ciała na scenie)
    const ghost = dead && this.deathT > GHOST_AT
    if (dead && !ghost) { anim = 'death'; f = Math.min(7, Math.floor(this.deathT / 0.14)) }
    else if (ghost) { anim = moving ? 'walk' : 'idle'; f = moving ? fr(10, 8) : fr(4, 8) }
    else if (s.phase === 'rest') { anim = 'sit'; f = fr(1.5, 2) }
    else if (moving) { anim = 'walk'; f = fr(12, 8) }
    else if (this.hurtT > 0 && this.atkT <= 0) { anim = 'hurt'; f = Math.min(3, Math.floor((0.24 - this.hurtT) / 0.06)) }
    else if (this.atkT > 0) { anim = shooting ? 'shoot' : 'attack'; f = Math.min(7, Math.floor((0.45 - this.atkT) / 0.45 * 8)) }
    else if (h.casting || this.castGlow > 0) { anim = 'cast'; const t = Math.floor(this.heroAnimT * 12); f = t < 3 ? t : 3 + (t % 5) }
    if (anim !== this.lastAnim) { if (anim === 'cast' || anim === 'walk' || anim === 'idle') this.heroAnimT = 0; this.lastAnim = anim }
    const L = LOOKS[h.race]
    if (!dead) this.shadow(x, gy, (L.torsoW * 0.75 + 2) * p)
    c.save()
    let gyH = gy
    if (ghost) {
      // duch: półprzezroczysty, niebieskawy, lekko unosi się nad ziemią
      const a = Math.min(1, (this.deathT - GHOST_AT) / 0.5)
      c.globalAlpha = 0.6 * a
      c.filter = 'grayscale(1) brightness(1.5) sepia(1) hue-rotate(165deg) saturate(2.2) drop-shadow(0 0 3px #8ad8ff)'
      gyH = gy - Math.round((2 + Math.sin(this.t * 2.4) * 1.5) * p)
    }
    this.blitS(heroSprite(key, anim, f), x + (this.heroLunge > 0 && anim !== 'attack' ? 3 : 0), gyH)
    c.restore()
    // rzucanie czaru: iskry w kolorze szkoły zbierają się w dłoni
    if (h.casting && !dead) {
      const ab = classById(h.cls).abilities.find((a) => a.id === h.casting!.id)
      const P = PAL[ab?.school ?? 'holy']
      const prog = 1 - h.casting.left / Math.max(0.01, h.casting.total)
      const u = this.sc, hx2 = x + 8 * u, hy = gy - 14 * u
      for (let i = 0; i < 6; i++) {
        const a = this.t * 7 + i * 1.05, rad = (9 - prog * 6) * u
        c.fillStyle = i % 2 ? P[2] : P[1]
        c.fillRect(Math.round(hx2 + Math.cos(a) * rad), Math.round(hy + Math.sin(a) * rad * 0.7), Math.ceil(u), Math.ceil(u))
      }
      c.fillStyle = P[3]; c.fillRect(Math.round(hx2 - u), Math.round(hy - u), Math.ceil(2 * u * (0.5 + prog)), Math.ceil(2 * u * (0.5 + prog)))
    }
    if (ghost) for (let i = 0; i < 4; i++) {
      const ph = (this.t * 0.9 + i / 4) % 1
      c.fillStyle = `rgba(170,225,255,${0.6 * (1 - ph)})`
      c.fillRect(Math.round(x - 8 * p + i * 5 * p), Math.round(gy - 4 * p - ph * 22 * p), Math.max(1, Math.round(p)), Math.max(1, Math.round(p)))
    }
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
