// Układ UI zapamiętywany lokalnie: przesunięcia okien, pozycja i szerokość paska, skala.
import type { PointerEvent as RPointerEvent } from 'react'
import { setDragging } from '../platform'

export type Layout = {
  frames: Record<string, { dx: number; dy: number }>
  strip: { x: number | null; y: number | null; w: 'full' | number }
  scale: 'auto' | number
}
const KEY = 'azeroth-idle-ui'
let L: Layout = { frames: {}, strip: { x: null, y: null, w: 'full' }, scale: 'auto' }
try { const raw = localStorage.getItem(KEY); if (raw) L = { ...L, ...JSON.parse(raw) } } catch { /* nic */ }
const listeners = new Set<() => void>()
export const layout = () => L
export function saveLayout(patch: Partial<Layout>) {
  L = { ...L, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(L)) } catch { /* nic */ }
  listeners.forEach((f) => f())
}
export const onLayout = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export function uiScale() {
  if (L.scale !== 'auto') return L.scale
  return Math.max(0.7, Math.min(1, window.innerHeight / 1000))
}

// Przeciąganie elementu za uchwyt; onMove dostaje przesunięcie od początku przeciągania (w px ekranu)
export function startDrag(e: RPointerEvent, onMove: (dx: number, dy: number) => void, onEnd: () => void) {
  if (e.button !== 0) return
  e.preventDefault()
  const sx = e.clientX, sy = e.clientY
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  setDragging(true)
  const move = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy)
  const up = () => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', up)
    target.removeEventListener('pointercancel', up)
    setDragging(false)
    onEnd()
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', up)
  target.addEventListener('pointercancel', up)
}
