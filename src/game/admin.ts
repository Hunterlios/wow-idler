// Tryb administratora (przyspieszanie czasu do testów) odblokowany hasłem.
// W kodzie jest tylko skrót SHA-256 hasła, nie samo hasło.
const HASH = '9efd07c4678d1819e30153868d63dafc4689b5bd54f0ee62f6bda945e1588e17'
const KEY = 'azeroth-idle-admin'
let admin = false
try { admin = localStorage.getItem(KEY) === HASH } catch { /* nic */ }
export const isAdmin = () => admin
async function sha256(t: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export async function unlockAdmin(password: string) {
  if ((await sha256(password)) !== HASH) return false
  admin = true
  try { localStorage.setItem(KEY, HASH) } catch { /* nic */ }
  return true
}
export function lockAdmin() {
  admin = false
  try { localStorage.removeItem(KEY) } catch { /* nic */ }
}
// prędkość gry: bez trybu administratora zawsze ×1 (także po imporcie zapisu)
export const gameSpeed = (speed: number) => (admin ? speed : 1)
