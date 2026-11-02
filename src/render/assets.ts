// Grafiki zewnętrzne z folderu assets/ (ikony, mapy) dostarczone przez gracza. Folder nie jest częścią repozytorium
// ani paczki: aplikacja (Electron) czyta go obok exe / w folderze projektu, wersja przeglądarkowa z assets/manifest.js.
// Gdy pliku brak, gra rysuje własne ikony i mapę.
import { native } from '../platform'

type Manifest = { base: string; icons: string[]; graphics: string[] }
type Lib = { base: string; icons: Map<string, string>; graphics: Map<string, string>; byPrefix: Map<string, string[]> }

let lib: Lib | null = null
function load(): Lib {
  if (lib) return lib
  let m: Manifest | null = null
  try { m = native?.getAssets?.() ?? null } catch { m = null }
  if (!m && typeof window !== 'undefined') {
    const w = (window as unknown as { AZ_ASSETS?: Partial<Manifest> }).AZ_ASSETS
    if (w) m = { base: w.base ?? 'assets/', icons: w.icons ?? [], graphics: w.graphics ?? [] }
  }
  const strip = (f: string) => f.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '').toLowerCase()
  lib = {
    base: m?.base ?? 'assets/',
    icons: new Map((m?.icons ?? []).map((f) => [strip(f), f])),
    graphics: new Map((m?.graphics ?? []).map((f) => [strip(f), f])),
    byPrefix: new Map(),
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
    list = [...l.icons.keys()].filter((n) => prefixes.some((p) => n.startsWith(p))).sort()
    l.byPrefix.set(pk, list)
  }
  if (!list.length) return null
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return iconUrl(list[(h >>> 0) % list.length])
}
export function graphicUrl(name: string): string | null {
  const l = load()
  const f = l.graphics.get(name.toLowerCase())
  return f ? `${l.base}graphics/${f}` : null
}
