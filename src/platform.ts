// Most do Electrona (preload.cjs wystawia window.azeroth). W przeglądarce go nie ma.
export type NativeBridge = {
  overlay: true
  setSolid: (solid: boolean) => void
  hide: () => void
  quit: () => void
  setAutostart: (on: boolean) => void
  getAutostart: () => boolean
  getDisplays?: () => { id: number; label: string; current: boolean }[]
  setDisplay?: (id: number) => void
  dropAt?: (x: number, y: number) => void
  onPlace?: (cb: (p: { x: number; y: number }) => void) => void
  onReset?: (cb: () => void) => void
  onDisplay?: (cb: () => void) => () => void
  getAssets?: () => { base: string; icons: string[]; graphics: string[]; cursor?: string | null; soundDir?: string | null } | null
}

declare global {
  interface Window { azeroth?: NativeBridge }
}

export const native = typeof window !== 'undefined' ? window.azeroth : undefined
export const isOverlay = !!native?.overlay

// Podczas przeciągania okno musi łapać mysz cały czas (inaczej puszczenie przycisku nad pulpitem zginie)
let dragging = false
let solid = false
export function setDragging(on: boolean) {
  dragging = on
  if (native && on && !solid) { solid = true; native.setSolid(true) }
}

// Po powrocie myszy nad grę (okno znów łapie mysz) Chromium nie odświeża kursora, bo CSS się nie zmienił,
// a system pokazał w międzyczasie swój. Przełączamy więc na równoważną kopię kursora gry, co wymusza odświeżenie.
export function refreshCursor() {
  const r = document.documentElement
  r.classList.toggle('cur-b')
}

// W trybie nakładki okno przepuszcza kliknięcia wszędzie poza elementami z [data-solid].
export function installClickThrough() {
  if (!native) return
  const check = (x: number, y: number) => {
    if (dragging) return
    const el = document.elementFromPoint(x, y)
    const s = !!el?.closest('[data-solid]')
    if (s !== solid) { solid = s; native.setSolid(s); if (s) refreshCursor() }
  }
  window.addEventListener('mousemove', (e) => check(e.clientX, e.clientY), { passive: true })
  window.addEventListener('mouseleave', () => { if (solid && !dragging) { solid = false; native.setSolid(false) } })
}
