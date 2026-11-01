// Przeciąganie przedmiotów (drag & drop) jak w WoW: torby, okno postaci, pasek toreb, kupiec.
// Własna implementacja na zdarzeniach wskaźnika (działa też w nakładce Electrona z przepuszczaniem kliknięć).
import { useEffect, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { setDragging } from '../platform'

export type DragSrc = { k: 'inv'; idx: number } | { k: 'eq'; slot: string } | { k: 'bag'; i: number }
type Drag = { src: DragSrc; icon: string; x: number; y: number }

let current: Drag | null = null
const subs = new Set<() => void>()
const notify = () => subs.forEach((f) => f())
let handler: (src: DragSrc, target: string | null) => void = () => {}
export const setDropHandler = (f: typeof handler) => { handler = f }
export const isDragging = () => !!current

// Na pointerdown slotu: przeciąganie zaczyna się dopiero po przesunięciu o kilka pikseli (zwykły klik działa dalej)
export function beginItemDrag(e: RPointerEvent, src: DragSrc, icon: string) {
  if (e.button !== 0) return
  const sx = e.clientX, sy = e.clientY
  let started = false
  const move = (ev: PointerEvent) => {
    if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
    if (!started) { started = true; setDragging(true); document.body.classList.add('dragging-item') }
    current = { src, icon, x: ev.clientX, y: ev.clientY }
    notify()
  }
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (!started) return
    // zablokuj "click", który przeglądarka wyśle po puszczeniu
    const swallow = (ce: MouseEvent) => { ce.stopPropagation(); ce.preventDefault() }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
    const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
    const target = el?.closest('[data-drop]')?.getAttribute('data-drop') ?? (el?.closest('[data-solid]') ? null : 'outside')
    current = null
    setDragging(false)
    document.body.classList.remove('dragging-item')
    notify()
    handler(src, target)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

export function DragGhost() {
  const [, set] = useState(0)
  useEffect(() => { const f = () => set((x) => x + 1); subs.add(f); return () => { subs.delete(f) } }, [])
  if (!current) return null
  return createPortal(<img className="drag-ghost" src={current.icon} alt="" style={{ left: current.x - 18, top: current.y - 18 }} />, document.body)
}
