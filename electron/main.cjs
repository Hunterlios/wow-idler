// Azeroth Idle: proces główny Electrona.
// Jedno przezroczyste okno bez ramki, zawsze na wierzchu, na obszarze roboczym głównego monitora
// (workArea, czyli BEZ paska zadań, żeby Windows nie uznał okna za pełnoekranowe i nie chował taskbara).
// Kliknięcia przelatują do pulpitu, dopóki kursor nie znajdzie się nad paskiem gry lub panelem:
// strona wysyła wtedy 'overlay:solid' (patrz src/platform.ts).
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

// ustawienia aplikacji (np. wybrany monitor) w folderze użytkownika
const CFG = () => path.join(app.getPath('userData'), 'settings.json')
function readCfg() { try { return JSON.parse(fs.readFileSync(CFG(), 'utf8')) } catch { return {} } }
function writeCfg(c) { try { fs.writeFileSync(CFG(), JSON.stringify(c)) } catch { /* nic */ } }

const DIST = path.join(__dirname, '..', 'dist')
let win = null
let tray = null

if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', () => showWin())

// monitor, na którym leży gra (wybór w ustawieniach gry albo przeciągnięcie paska na inny ekran)
function display() {
  const id = readCfg().display
  return screen.getAllDisplays().find((d) => d.id === id) ?? screen.getPrimaryDisplay()
}
const area = () => display().workArea
function displays() {
  const cur = display().id
  const prim = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((d, i) => ({ id: d.id, label: `Display ${i + 1}${d.id === prim ? ' (primary)' : ''} · ${d.size.width}×${d.size.height}`, current: d.id === cur }))
}
function setDisplay(id) {
  writeCfg({ ...readCfg(), display: id })
  fit()
  if (win && !win.isDestroyed()) win.webContents.send('app:display-changed')
}

function createWindow() {
  const wa = area()
  win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, thickFrame: false,
    resizable: false, movable: false, minimizable: true, maximizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: false, show: false, title: 'Azeroth Idle',
    icon: path.join(DIST, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false, // gra liczy się także, gdy okno nie ma fokusu
      autoplayPolicy: 'no-user-gesture-required', // dźwięki gry bez wcześniejszego kliknięcia
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true, { forward: true }) // przezroczyste, dopóki kursor nie trafi w pasek
  if (process.env.DEV_URL) win.loadURL(process.env.DEV_URL)
  else win.loadFile(path.join(DIST, 'index.html'))
  win.once('ready-to-show', () => win.showInactive())
  // po utracie fokusu niektóre okna (np. pełnoekranowe) potrafią zepchnąć nakładkę niżej
  win.on('blur', () => { if (win && win.isVisible()) win.setAlwaysOnTop(true, 'screen-saver') })
  win.on('closed', () => { win = null })
}

function fit() {
  if (win && !win.isDestroyed()) win.setBounds(area())
}

function showWin() {
  if (!win) return createWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.setAlwaysOnTop(true, 'screen-saver')
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(DIST, 'icon.png')).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Azeroth Idle')
  const menu = () => Menu.buildFromTemplate([
    { label: win && win.isVisible() ? 'Hide bar' : 'Show bar', click: () => (win && win.isVisible() ? win.hide() : showWin()) },
    { label: 'Bring bar and windows back on screen', click: () => { showWin(); win && win.webContents.send('ui:reset') } },
    { type: 'checkbox', label: 'Start with Windows', checked: app.getLoginItemSettings().openAtLogin, click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.on('click', () => (win && win.isVisible() ? win.hide() : showWin()))
  tray.on('right-click', () => tray.popUpContextMenu(menu()))
}

ipcMain.on('overlay:solid', (_e, solid) => {
  if (!win || win.isDestroyed()) return
  win.setIgnoreMouseEvents(!solid, { forward: true })
})
ipcMain.on('app:hide', () => win && win.hide())
ipcMain.on('app:displays', (e) => { e.returnValue = displays() })
ipcMain.on('app:display', (_e, id) => setDisplay(id))
// Pasek upuszczony na innym monitorze: przenieś tam okno gry i postaw pasek pod kursorem
ipcMain.on('app:dropAt', (e, p) => {
  if (!p || typeof p.x !== 'number') return
  const d = screen.getDisplayNearestPoint({ x: Math.round(p.x), y: Math.round(p.y) })
  if (d.id === display().id) return
  setDisplay(d.id)
  e.sender.send('strip:place', { x: p.x - d.workArea.x, y: p.y - d.workArea.y })
})
ipcMain.on('app:quit', () => app.quit())
// Grafiki gracza (ikony, mapy) z folderu assets: obok exe (wersja przenośna) albo w folderze projektu
// Kursor z assets/graphics/cursor.png: arkusz 512x256 jak w grze (wycinamy rękawicę 32x32), inny obraz skalujemy do 32 px.
// Wycinanie w procesie głównym, bo w oknie file:// canvas nie odda danych obrazka z innego pliku.
const CURSOR_RECT = { x: 260, y: 66, width: 32, height: 32 }
function cursorFrom(dir) {
  try {
    const f = ['cursor.png', 'cursor.webp', 'cursor.gif'].map((n) => path.join(dir, 'graphics', n)).find((p) => fs.existsSync(p))
    if (!f) return null
    const img = nativeImage.createFromPath(f)
    if (img.isEmpty()) return null
    const { width, height } = img.getSize()
    const out = width === 512 && height === 256 ? img.crop(CURSOR_RECT) : img.resize({ width: 32, height: Math.round((32 * height) / width) })
    return out.toDataURL()
  } catch { return null }
}
ipcMain.on('app:assets', (e) => {
  const dirs = [path.join(path.dirname(process.execPath), 'assets'), path.join(__dirname, '..', 'assets'), path.join(__dirname, '..', '..', '..', 'assets')]
  const dir = dirs.find((d) => fs.existsSync(d))
  if (!dir) { e.returnValue = null; return }
  const list = (sub) => { try { return fs.readdirSync(path.join(dir, sub)).filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)) } catch { return [] } }
  const soundDir = ['sound', 'sounds'].find((d) => fs.existsSync(path.join(dir, d))) ?? null
  e.returnValue = { base: pathToFileURL(dir).href + '/', icons: list('icons'), graphics: list('graphics'), cursor: cursorFrom(dir), soundDir }
})
ipcMain.on('app:autostart', (_e, on) => app.setLoginItemSettings({ openAtLogin: !!on }))
ipcMain.on('app:autostart:get', (e) => { e.returnValue = app.getLoginItemSettings().openAtLogin })

app.whenReady().then(() => {
  createWindow()
  createTray()
  screen.on('display-metrics-changed', fit)
  screen.on('display-added', fit)
  screen.on('display-removed', fit)
})

// zamknięcie okna nie kończy gry: zostaje w zasobniku
app.on('window-all-closed', (e) => e.preventDefault())
