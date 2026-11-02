// Dźwięki z folderu assets/sound (dostarczone przez gracza, jak ikony). Gra nie zawiera własnych plików:
// gdy folderu nie ma, po prostu jest cicho. Kanały: efekty (walka, czary, interfejs), głosy, muzyka strefy i tło (ambient).
// Mapa zdarzeń → plików jest w soundmap.ts (wygenerowana z listy plików gracza).
import { soundUrl } from '../render/assets'
import { SOUNDS, type SoundKey } from './soundmap'

export type Bus = 'sfx' | 'ui' | 'voice' | 'music' | 'ambience'
export type SoundSettings = { on: boolean; master: number; sfx: number; ui: number; voice: number; music: number; ambience: number }
const KEY = 'azeroth-idle-sound'
const DEF: SoundSettings = { on: true, master: 0.7, sfx: 0.8, ui: 0.7, voice: 0.7, music: 0.35, ambience: 0.4 }
let settings: SoundSettings = { ...DEF }
try { settings = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { /* domyślne */ }
const listeners = new Set<() => void>()
export const soundSettings = () => settings
export function setSoundSettings(p: Partial<SoundSettings>) {
  settings = { ...settings, ...p }
  try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* brak pamięci */ }
  applyLoops()
  listeners.forEach((f) => f())
}
export const onSoundSettings = (f: () => void) => { listeners.add(f); return () => listeners.delete(f) }
const vol = (bus: Bus, k = 1) => (settings.on ? Math.max(0, Math.min(1, settings.master * settings[bus] * k)) : 0)

// ---------------------------------------------------------------- krótkie dźwięki
const bad = new Set<string>()
const last = new Map<string, number>()
let playing = 0
const MAX_VOICES = 10
export function play(key: SoundKey, opts: { bus?: Bus; vol?: number; gap?: number; rate?: number } = {}) {
  const list = SOUNDS[key]
  if (!list?.length || !settings.on) return
  const now = performance.now()
  const gap = opts.gap ?? 60
  if (now - (last.get(key) ?? -1e9) < gap) return
  if (playing >= MAX_VOICES) return
  last.set(key, now)
  const pick = list.filter((p) => !bad.has(p))
  if (!pick.length) return
  const rel = pick[Math.floor(Math.random() * pick.length)]
  const url = soundUrl(rel)
  if (!url) return
  const a = new Audio(url)
  a.volume = vol(opts.bus ?? 'sfx', opts.vol ?? 1)
  if (opts.rate) a.playbackRate = opts.rate
  playing++
  const done = () => { playing = Math.max(0, playing - 1); a.onended = a.onerror = null }
  a.onended = done
  a.onerror = () => { bad.add(rel); done() }
  a.play().catch(() => done())
}

// ---------------------------------------------------------------- pętle: muzyka strefy i ambient (płynne przejścia)
type Loop = { key: SoundKey | null; el: HTMLAudioElement | null; bus: Bus; fade?: number }
const loops: Record<'music' | 'ambience', Loop> = { music: { key: null, el: null, bus: 'music' }, ambience: { key: null, el: null, bus: 'ambience' } }
function fadeOut(el: HTMLAudioElement) {
  const step = () => { el.volume = Math.max(0, el.volume - 0.04); if (el.volume > 0.01) setTimeout(step, 80); else { el.pause(); el.src = '' } }
  step()
}
function startLoop(which: 'music' | 'ambience', key: SoundKey | null) {
  const L = loops[which]
  if (L.key === key && L.el) return
  if (L.el) fadeOut(L.el)
  L.key = key; L.el = null
  if (!key || !settings.on || settings[L.bus] <= 0) return
  const list = (SOUNDS[key] ?? []).filter((p) => !bad.has(p))
  if (!list.length) return
  const rel = list[Math.floor(Math.random() * list.length)]
  const url = soundUrl(rel)
  if (!url) return
  const el = new Audio(url)
  el.volume = 0
  // muzyka: po utworze chwila ciszy i następny z puli; ambient: pętla
  if (which === 'ambience') el.loop = true
  else el.onended = () => { L.el = null; const k = L.key; L.key = null; setTimeout(() => { if (!loops.music.el) startLoop('music', k) }, 20000 + Math.random() * 40000) }
  el.onerror = () => { bad.add(rel); if (L.el === el) { L.el = null; L.key = null } }
  L.el = el
  el.play().then(() => {
    const target = vol(L.bus)
    const up = () => { if (L.el !== el) return; el.volume = Math.min(target, el.volume + 0.03); if (el.volume < target) setTimeout(up, 80) }
    up()
  }).catch(() => { if (L.el === el) { L.el = null; L.key = null } })
}
function applyLoops() {
  for (const w of ['music', 'ambience'] as const) {
    const L = loops[w]
    if (!settings.on || settings[L.bus] <= 0) { if (L.el) { fadeOut(L.el); L.el = null } continue }
    if (L.el) L.el.volume = vol(L.bus)
    else if (L.key) { const k = L.key; L.key = null; startLoop(w, k) }
  }
}
export const music = (key: SoundKey | null) => startLoop('music', key)
export const ambience = (key: SoundKey | null) => startLoop('ambience', key)
export const hasSound = (key: SoundKey) => !!SOUNDS[key]?.length
