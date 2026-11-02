// Ogólny pobieracz obrazków ze strony: otwiera stronę w przeglądarce (Playwright, więc działa też ze stronami
// renderowanymi przez JavaScript), znajduje elementy pasujące do selektora CSS i zapisuje ich obrazki
// (<img src> albo CSS background-image) do folderu. Obsługuje stronicowanie (przycisk "następna strona").
//
// Instalacja (raz):  npm i -D playwright  &&  npx playwright install chromium
// Użycie:            node scripts/grab-images.mjs <url> [folder] [maks]
//
// Odpowiedzialność za to, skąd pobierasz i jak używasz plików (prawa autorskie, regulamin strony), jest po twojej
// stronie. Folder assets/ jest w .gitignore, żeby nie trafił na GitHuba ani do paczki.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

// ===================== TU USTAW, CO POBIERAĆ =====================
// Selektor CSS elementów z obrazkiem: klasa (".nazwa-klasy"), id ("#id"), albo kilka po przecinku.
// Obrazek może być w samym elemencie (<img>), w jego dzieciach albo jako background-image.
const SELECTOR = '.iconlarge'
// Nazwa pliku: 'url' = oryginalna nazwa pliku z adresu obrazka (zalecane: jednoznaczna i stała),
// albo nazwa atrybutu elementu (np. 'title', 'alt', 'data-name')
const NAME_FROM = 'url'
// Stronicowanie: selektor linku/przycisku "następna strona" ('' = bez stronicowania)
const NEXT_SELECTOR = '.listview-nav-link'
// Opcjonalnie: tekst, który musi zawierać ten link (gdy ten sam selektor mają np. "Next" i "Last")
const NEXT_TEXT = 'Next ›'
const MAX_PAGES = 6
// Przerwa między pobraniami i między stronami (ms), żeby nie obciążać serwera
const DELAY = 300
const PAGE_DELAY = 1500
// false = widoczne okno przeglądarki (niektóre strony blokują przeglądarkę bez okna albo pokazują zgodę na cookies,
// którą wtedy klikniesz sam). Ile sekund czekać na pojawienie się elementów.
const HEADLESS = false
const WAIT_SECS = 30
// ==================================================================

const [url, outDir = 'assets/downloaded', maxArg] = process.argv.slice(2)
if (!url) { console.log('Użycie: node scripts/grab-images.mjs <url> [folder] [maks]'); process.exit(1) }
const MAX = Number(maxArg ?? 100000)
fs.mkdirSync(outDir, { recursive: true })

const safe = (s) => s.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100) || 'img'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ headless: HEADLESS })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
// czekaj, aż elementy się pojawią (strony ładujące listę skryptem, zgoda na cookies, sprawdzanie przeglądarki)
console.log(`Czekam do ${WAIT_SECS} s na elementy ${SELECTOR}...`)
const ok = await page.waitForSelector(SELECTOR, { timeout: WAIT_SECS * 1000 }).then(() => true, () => false)
if (!ok) {
  const shot = path.join(outDir, '_debug.png')
  await page.screenshot({ path: shot, fullPage: false })
  console.log(`Nie znaleziono elementów ${SELECTOR}. Tytuł strony: "${await page.title()}". Zrzut ekranu: ${shot}`)
  console.log('Sprawdź na zrzucie, co widzi przeglądarka (np. zgoda na cookies albo blokada), i czy selektor jest dobry.')
  await browser.close()
  process.exit(1)
}
await page.waitForTimeout(1000)

// Przewiń stronę do końca i z powrotem: wiele stron ładuje obrazki dopiero, gdy są widoczne (lazy loading)
async function scrollAll() {
  let last = -1
  for (let i = 0; i < 200; i++) {
    const { y, h } = await page.evaluate(() => { window.scrollBy(0, window.innerHeight * 0.8); return { y: window.scrollY + window.innerHeight, h: document.body.scrollHeight } })
    await sleep(150)
    if (y >= h - 2) { if (h === last) break; last = h }
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(300)
}

// adresy obrazków z pasujących elementów na bieżącej stronie
const collectRaw = () => page.$$eval(SELECTOR, (els, nameFrom) => {
  const out = []
  const bg = (el) => { const m = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/); return m ? m[1] : null }
  for (const el of els) {
    let src = null
    for (const c of [el, ...el.querySelectorAll('*')]) { src = (c.tagName === 'IMG' && (c.currentSrc || c.src)) || bg(c); if (src) break }
    if (src) out.push({ src: new URL(src, location.href).href, name: nameFrom === 'url' ? '' : el.getAttribute(nameFrom) || '' })
  }
  return out
}, NAME_FROM)
const collect = async () => { await scrollAll(); return collectRaw() }

// przejście na następną stronę; false = nie ma już następnej
async function next() {
  if (!NEXT_SELECTOR) return false
  const links = await page.$$(NEXT_SELECTOR)
  for (const l of links) {
    const txt = (await l.innerText()).replace(/\s+/g, ' ').trim()
    if (NEXT_TEXT && !txt.includes(NEXT_TEXT)) continue
    if (!(await l.isVisible())) continue
    const before = JSON.stringify((await collectRaw()).slice(0, 3))
    await l.click()
    // czekaj, aż zawartość się zmieni (strony przełączane bez przeładowania)
    for (let i = 0; i < 40; i++) { await sleep(250); if (JSON.stringify((await collectRaw()).slice(0, 3)) !== before) return true }
    return false
  }
  return false
}

const seen = new Set()
const used = new Set(fs.readdirSync(outDir).map((f) => path.parse(f).name))
let saved = 0
for (let p = 1; p <= MAX_PAGES && saved < MAX; p++) {
  const found = (await collect()).filter((x) => !seen.has(x.src))
  const all = await collectRaw()
  console.log(`Strona ${p}: ${all.length} elementów, ${found.length} nowych obrazków`)
  for (const { src, name } of found) {
    if (saved >= MAX) break
    seen.add(src)
    const ext = path.extname(new URL(src).pathname) || '.png'
    let base = safe(name || path.basename(new URL(src).pathname, ext))
    if (used.has(base) && !name) continue // już pobrany wcześniej (wznowienie)
    while (used.has(base)) base += '_'
    try {
      const res = await page.request.get(src)
      if (!res.ok()) { console.log('  pominięto', src, res.status()); continue }
      fs.writeFileSync(path.join(outDir, base + ext), await res.body())
      used.add(base)
      saved++
      await sleep(DELAY)
    } catch (e) { console.log('  błąd', src, e.message) }
  }
  if (!(await next())) break
  await sleep(PAGE_DELAY)
}
console.log(`Zapisano ${saved} plików w ${outDir}`)
await browser.close()
