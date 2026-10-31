// Azeroth Idle: proces główny Electrona.
// Jedno przezroczyste okno bez ramki, zawsze na wierzchu, na obszarze roboczym głównego monitora
// (workArea, czyli BEZ paska zadań, żeby Windows nie uznał okna za pełnoekranowe i nie chował taskbara).
// Kliknięcia przelatują do pulpitu, dopóki kursor nie znajdzie się nad paskiem gry lub panelem:
// strona wysyła wtedy 'overlay:solid' (patrz src/platform.ts).
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')
const path = require('path')

const DIST = path.join(__dirname, '..', 'dist')
let win = null
let tray = null

if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', () => showWin())

const area = () => screen.getPrimaryDisplay().workArea

function createWindow() {
  const wa = area()
  win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, thickFrame: false,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: true, show: false, title: 'Azeroth Idle',
    icon: path.join(DIST, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false, // gra liczy się także, gdy okno nie ma fokusu
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
  win.show()
  win.setAlwaysOnTop(true, 'screen-saver')
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(DIST, 'icon.png')).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Azeroth Idle')
  const menu = () => Menu.buildFromTemplate([
    { label: win && win.isVisible() ? 'Ukryj pasek' : 'Pokaż pasek', click: () => (win && win.isVisible() ? win.hide() : showWin()) },
    { type: 'checkbox', label: 'Uruchamiaj z Windowsem', checked: app.getLoginItemSettings().openAtLogin, click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { type: 'separator' },
    { label: 'Zamknij', click: () => app.quit() },
  ])
  tray.on('click', () => (win && win.isVisible() ? win.hide() : showWin()))
  tray.on('right-click', () => tray.popUpContextMenu(menu()))
}

ipcMain.on('overlay:solid', (_e, solid) => {
  if (!win || win.isDestroyed()) return
  win.setIgnoreMouseEvents(!solid, { forward: true })
})
ipcMain.on('app:hide', () => win && win.hide())
ipcMain.on('app:quit', () => app.quit())
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
