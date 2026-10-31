// Bezpieczny most strona <-> proces główny (contextIsolation + sandbox).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('azeroth', {
  overlay: true,
  setSolid: (solid) => ipcRenderer.send('overlay:solid', !!solid),
  hide: () => ipcRenderer.send('app:hide'),
  quit: () => ipcRenderer.send('app:quit'),
  setAutostart: (on) => ipcRenderer.send('app:autostart', !!on),
  getAutostart: () => ipcRenderer.sendSync('app:autostart:get'),
})
