// Spis plików z folderu assets/: ikony, grafiki i dźwięki.
//   node scripts/assets-manifest.mjs
// Tworzy assets/manifest.js (dla wersji przeglądarkowej: ikony, grafiki, dźwięki używane przez grę)
// oraz assets/lista-plikow.txt (pełna lista ikon i dźwięków z rozmiarami, do analizy).
import fs from 'node:fs'
import path from 'node:path'
const dir = process.argv[2] ?? 'assets'
const list = (sub) => { try { return fs.readdirSync(path.join(dir, sub)).filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).sort() } catch { return [] } }
// wszystkie pliki dźwiękowe (ogg / mp3 / wav) w assets/sound lub assets/sounds, rekurencyjnie
const soundRoot = ['sound', 'sounds'].map((s) => path.join(dir, s)).find((p) => fs.existsSync(p))
const sounds = []
const walk = (abs, rel) => {
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const a = path.join(abs, e.name), r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) walk(a, r)
    else if (/\.(ogg|mp3|wav)$/i.test(e.name)) sounds.push([r, fs.statSync(a).size])
  }
}
if (soundRoot) walk(soundRoot, '')
sounds.sort((a, b) => (a[0] < b[0] ? -1 : 1))
const icons = list('icons'), graphics = list('graphics')
const m = { base: 'assets/', icons, graphics, soundDir: soundRoot ? path.basename(soundRoot) : null }
fs.writeFileSync(path.join(dir, 'manifest.js'), `window.AZ_ASSETS = ${JSON.stringify(m)}\n`)
const txt = ['# ICONS', ...icons, '# GRAPHICS', ...graphics, '# SOUNDS', ...sounds.map(([r, s]) => `${r}\t${s}`)].join('\n')
fs.writeFileSync(path.join(dir, 'lista-plikow.txt'), txt + '\n')
console.log(`assets/manifest.js: ${icons.length} ikon, ${graphics.length} grafik; lista-plikow.txt: ${sounds.length} dźwięków`)
