// Grafiki zewnętrzne z folderu assets/ (ikony, mapy) dostarczone przez gracza. Folder nie jest częścią repozytorium
// ani paczki: aplikacja (Electron) czyta go obok exe / w folderze projektu, wersja przeglądarkowa z assets/manifest.js.
// Gdy pliku brak, gra rysuje własne ikony i mapę.
import { native } from '../platform'

type Manifest = { base: string; icons: string[]; graphics: string[]; cursor?: string | null; soundDir?: string | null }
type Lib = { base: string; icons: Map<string, string>; graphics: Map<string, string>; byPrefix: Map<string, string[]>; cursor: string | null; soundDir: string | null }

let lib: Lib | null = null
function load(): Lib {
  if (lib) return lib
  let m: Manifest | null = null
  try { m = native?.getAssets?.() ?? null } catch { m = null }
  if (!m && typeof window !== 'undefined') {
    const w = (window as unknown as { AZ_ASSETS?: Partial<Manifest> }).AZ_ASSETS
    if (w) m = { base: w.base ?? 'assets/', icons: w.icons ?? [], graphics: w.graphics ?? [], soundDir: w.soundDir ?? null }
  }
  const strip = (f: string) => f.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '').toLowerCase()
  lib = {
    base: m?.base ?? 'assets/',
    icons: new Map((m?.icons ?? []).map((f) => [strip(f), f])),
    graphics: new Map((m?.graphics ?? []).map((f) => [strip(f), f])),
    byPrefix: new Map(),
    cursor: m?.cursor ?? null,
    soundDir: m?.soundDir ?? null,
  }
  return lib
}

export const hasAssets = () => load().icons.size > 0
// Adres ikony o tej nazwie (bez rozszerzenia) albo null
export function iconUrl(name: string): string | null {
  const l = load()
  const f = l.icons.get(name.toLowerCase())
  return f ? `${l.base}icons/${f}` : null
}
// Pierwsza dostępna z listy nazw
export function firstIcon(names: string[] | undefined): string | null {
  for (const n of names ?? []) { const u = iconUrl(n); if (u) return u }
  return null
}
// Ikona z grupy (prefiksy nazw), wybrana stabilnie według klucza (ten sam przedmiot = ta sama ikona)
export function pickIcon(prefixes: string[], key: string): string | null {
  const l = load()
  const pk = prefixes.join('|')
  let list = l.byPrefix.get(pk)
  if (!list) {
    const all = [...l.icons.keys()].filter((n) => prefixes.some((p) => n.startsWith(p))).sort()
    // nazwy w stylu Classica (prefiks + numer do 99) mają pierwszeństwo przed nowszymi ikonami z dodatków
    const classic = all.filter((n) => prefixes.some((p) => n.startsWith(p) && /^\d{1,2}[ab]?$/.test(n.slice(p.length))))
    list = classic.length >= 3 ? classic : all
    l.byPrefix.set(pk, list)
  }
  if (!list.length) return null
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return iconUrl(list[(h >>> 0) % list.length])
}
// Adres pliku dźwiękowego (ścieżka względna w assets/sound), gdy gracz dostarczył folder z dźwiękami
export function soundUrl(rel: string): string | null {
  const l = load()
  if (!l.soundDir) return null
  return `${l.base}${l.soundDir}/${rel.split('/').map(encodeURIComponent).join('/')}`
}
export function graphicUrl(name: string): string | null {
  const l = load()
  const f = l.graphics.get(name.toLowerCase())
  return f ? `${l.base}graphics/${f}` : null
}

// Kursor gry (32x32, data URL). Electron wycina go w procesie głównym; w przeglądarce wycinamy z arkusza na canvasie.
export async function cursorUrl(): Promise<string | null> {
  const l = load()
  if (l.cursor) return l.cursor
  const src = graphicUrl('cursor')
  if (!src || typeof document === 'undefined') return null
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 32; c.height = 32
        const g = c.getContext('2d')!
        if (img.width === 512 && img.height === 256) g.drawImage(img, 260, 66, 32, 32, 0, 0, 32, 32)
        else g.drawImage(img, 0, 0, 32, Math.round((32 * img.height) / img.width))
        res(c.toDataURL())
      } catch { res(null) }
    }
    img.onerror = () => res(null)
    img.src = src
  })
}
