// Bezpieczny most strona <-> proces główny (contextIsolation + sandbox).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('azeroth', {
  overlay: true,
  setSolid: (solid) => ipcRenderer.send('overlay:solid', !!solid),
  hide: () => ipcRenderer.send('app:hide'),
  quit: () => ipcRenderer.send('app:quit'),
  setAutostart: (on) => ipcRenderer.send('app:autostart', !!on),
  getAutostart: () => ipcRenderer.sendSync('app:autostart:get'),
  getDisplays: () => ipcRenderer.sendSync('app:displays'),
  setDisplay: (id) => ipcRenderer.send('app:display', id),
  dropAt: (x, y) => ipcRenderer.send('app:dropAt', { x, y }),
  getAssets: () => ipcRenderer.sendSync('app:assets'),
  onPlace: (cb) => ipcRenderer.on('strip:place', (_e, p) => cb(p)),
  onReset: (cb) => ipcRenderer.on('ui:reset', () => cb()),
  onDisplay: (cb) => { const f = () => cb(); ipcRenderer.on('app:display-changed', f); return () => ipcRenderer.removeListener('app:display-changed', f) },
})
