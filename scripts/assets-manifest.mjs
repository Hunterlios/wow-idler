// Spis grafik z folderu assets/ dla wersji przeglądarkowej (graj-w-przegladarce.html).
// Aplikacja (exe) czyta folder sama; tę komendę uruchom po dodaniu nowych plików, jeśli grasz w przeglądarce:
//   node scripts/assets-manifest.mjs
import fs from 'node:fs'
import path from 'node:path'
const dir = process.argv[2] ?? 'assets'
const list = (sub) => { try { return fs.readdirSync(path.join(dir, sub)).filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).sort() } catch { return [] } }
const m = { base: 'assets/', icons: list('icons'), graphics: list('graphics') }
fs.writeFileSync(path.join(dir, 'manifest.js'), `window.AZ_ASSETS = ${JSON.stringify(m)}\n`)
console.log(`assets/manifest.js: ${m.icons.length} ikon, ${m.graphics.length} grafik`)
