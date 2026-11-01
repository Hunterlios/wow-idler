// Mapa świata (schemat Kalimdoru i Eastern Kingdoms) + szczegóły mapy: podstrefy, postęp, bossowie, podróż.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ZONES, LINKS, zoneById, type Zone } from '../data/zones'
import type { GameState } from '../game/types'
import { routeZones, subsOf, progOf, subLevels, bossLevel, killsNeeded, canTravel, townOf, zonePct } from '../game/world'
import { travel } from '../game/town'
import { tripPlan } from '../game/sim'
import { menuIcon } from '../render/icons'
import { Bar, Frame } from './common'

const W = 1000, H = 630
const BOX = { kalimdor: { x: 20, y: 44, w: 440, h: 530 }, ek: { x: 540, y: 44, w: 440, h: 530 } }
const COL = { alliance: '#3f78e0', horde: '#d0392b', contested: '#d8a72a' }
const pos = (z: Zone) => { const b = BOX[z.continent]; return { x: b.x + (z.x / 100) * b.w, y: b.y + (z.y / 100) * b.h } }

export function MapPanel({ s, onClose, bump }: { s: GameState; onClose: () => void; bump: () => void }) {
  const [sel, setSel] = useState(s.loc.zone)
  const [hover, setHover] = useState<Zone | null>(null)
  const [ask, setAsk] = useState<{ zone: string; sub: number } | null>(null)
  const route = routeZones(s)
  const unlocked = new Set(s.unlocked)
  const onRoute = route.filter((id) => unlocked.has(id))
  const pts = onRoute.map((id) => pos(zoneById(id)))
  const next = route[route.indexOf(onRoute[onRoute.length - 1]) + 1]
  const z = zoneById(sel)
  const subs = subsOf(sel)
  const p = progOf(s, sel)

  return (
    <Frame id="map" title="World Map" onClose={onClose} className="map-frame" icon={menuIcon('map')}>
      <div className="map-layout">
        <div className="map-left">
          <svg viewBox={`0 0 ${W} ${H}`} className="map">
            <defs>
              <radialGradient id="land" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#8a7a52" /><stop offset="100%" stopColor="#5a4a2a" /></radialGradient>
              <radialGradient id="sea" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#3a6a8a" /><stop offset="100%" stopColor="#1a3a5a" /></radialGradient>
            </defs>
            <rect x="0" y="0" width={W} height={H} fill="url(#sea)" />
            {(['kalimdor', 'ek'] as const).map((k) => (
              <g key={k}>
                <rect x={BOX[k].x} y={BOX[k].y} width={BOX[k].w} height={BOX[k].h} rx="70" fill="url(#land)" opacity="0.85" stroke="#2a1e0e" strokeWidth="3" />
                <text x={BOX[k].x + BOX[k].w / 2} y={30} className="map-cont">{k === 'kalimdor' ? 'Kalimdor' : 'Eastern Kingdoms'}</text>
              </g>
            ))}
            {LINKS.map(([a, b]) => { const pa = pos(zoneById(a)), q = pos(zoneById(b)); return <line key={a + b} x1={pa.x} y1={pa.y} x2={q.x} y2={q.y} stroke="#3a2a14" strokeWidth="1.5" opacity="0.45" /> })}
            <polyline points={pts.map((pt) => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke="#ffd100" strokeWidth="3" opacity="0.9" />
            {next && (() => { const a = pos(zoneById(onRoute[onRoute.length - 1])), b = pos(zoneById(next)); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffd100" strokeWidth="2" strokeDasharray="6 5" opacity="0.8" /> })()}
            {ZONES.map((zz) => {
              const pt = pos(zz)
              const isStart = !!zz.parent
              const open = true
              const rad = isStart ? 8 : 15
              return (
                <g key={zz.id} onMouseEnter={() => setHover(zz)} onMouseLeave={() => setHover(null)} onClick={() => open && setSel(zz.id)} style={{ cursor: open ? 'pointer' : 'default' }}>
                  <circle cx={pt.x} cy={pt.y} r={rad} fill={COL[zz.control]} opacity={unlocked.has(zz.id) ? 1 : 0.6} stroke={zz.id === sel ? '#fff' : '#1a1206'} strokeWidth={zz.id === sel ? 3 : 1.5} />
                  {unlocked.has(zz.id) && zonePct(s, zz.id) >= 1 && <text x={pt.x} y={pt.y + 4} className="map-lvl">✓</text>}
                  {!isStart && !(unlocked.has(zz.id) && zonePct(s, zz.id) >= 1) && <text x={pt.x} y={pt.y + 4} className="map-lvl">{zz.min}-{zz.max}</text>}
                  <text x={pt.x} y={pt.y + (isStart ? -11 : 27)} className={`${isStart ? 'map-sub' : 'map-name'} ${unlocked.has(zz.id) ? '' : 'locked'}`}>{zz.name}</text>
                  {zz.capital && <text x={pt.x + 18} y={pt.y - 10} className="map-cap">★ {zz.capital}</text>}
                </g>
              )
            })}
            {(() => { const pt = pos(zoneById(s.loc.zone)); return <circle cx={pt.x} cy={pt.y} r="22" fill="none" stroke="#fff" strokeWidth="2" className="pulse" /> })()}
            <g transform="translate(20,618)" className="map-legend">
              <circle r="5" cx="0" cy="-3" fill={COL.alliance} /><text x="9" y="0">Przymierze</text>
              <circle r="5" cx="95" cy="-3" fill={COL.horde} /><text x="104" y="0">Horda</text>
              <circle r="5" cx="160" cy="-3" fill={COL.contested} /><text x="169" y="0">Sporne</text>
              <line x1="235" y1="-3" x2="260" y2="-3" stroke="#ffd100" strokeWidth="3" /><text x="266" y="0">Odblokowane</text>
              <line x1="350" y1="-3" x2="375" y2="-3" stroke="#ffd100" strokeWidth="2" strokeDasharray="6 5" /><text x="381" y="0">Następna (po bossie)</text>
            </g>
          </svg>
          <div className="map-hover">{hover ? <><b>{hover.name}</b> ({hover.min}-{hover.max}) · kliknij, aby zobaczyć podstrefy{hover.min > s.hero.level + 3 ? ' · uwaga: wysoki poziom' : ''}</> : 'Kliknij dowolną mapę, żeby zobaczyć podstrefy i podróżować (także na wyższe poziomy).'}</div>
        </div>
        <div className="map-right parchment">
          <h3>{z.name}</h3>
          <div className="pdim">Poziomy {z.min}-{z.max} · {townOf(z, s.hero.faction) ? `miasto: ${townOf(z, s.hero.faction)}` : 'brak miasta'}</div>
          {sel !== s.loc.zone && (() => { const t = tripPlan(s, sel, 0); return <div className="trip-info">{t.kind === 'ship' ? '⛵' : t.kind === 'zeppelin' ? '🎈' : '🥾'} Podróż: {fmtSecs(t.total)}{t.label ? ` · ${t.label}` : ''}</div> })()}
          <div className="zone-total"><Bar value={zonePct(s, sel)} max={1} color="linear-gradient(#5aa0ff,#1a3a8a)" height={12} label={`${Math.round(zonePct(s, sel) * 100)}%`} /></div>
          <div className="subs">
            {subs.map((sz, i) => {
              const { lo, hi } = subLevels(sel, i)
              const cleared = p.cleared > i
              const frontier = p.cleared === i
              const here = s.loc.zone === sel && s.loc.sub === i && s.where === 'field'
              const can = canTravel(s, sel, i)
              const need = killsNeeded(sel, i)
              return (
                <div key={i} className={`subz ${cleared ? 'done' : frontier ? 'front' : 'locked'} ${here ? 'here' : ''}`}>
                  <div className="subz-top">
                    <span className="subz-n">{i + 1}.</span>
                    <b>{sz.name}</b>
                    <span className="pdim">({Math.max(z.min, lo)}-{Math.max(lo, hi)})</span>
                    {can && !here ? <button className="wbtn small" onClick={() => setAsk({ zone: sel, sub: i })}>Idź</button> : here ? <span className="subz-here">tu jesteś</span> : null}
                  </div>
                  <div className="subz-boss">
                    {sz.zoneBoss ? '☠ Boss mapy' : 'Miniboss'}: <b>{sz.boss.name}</b> ({bossLevel(sel, i)}) {cleared ? <span className="ok">✓ pokonany</span> : frontier ? <span>· {Math.min(need, p.kills)}/{need}</span> : <span className="pdim">· zablokowane</span>}
                  </div>
                  {frontier && <Bar value={Math.min(need, p.kills)} max={need} color="linear-gradient(#e0b030,#7a5a00)" height={6} />}
                </div>
              )
            })}
          </div>
          {ask && <TravelConfirm s={s} zone={ask.zone} sub={ask.sub} onCancel={() => setAsk(null)} onGo={() => { travel(s, ask.zone, ask.sub); setAsk(null); bump() }} />}
          <label className="auto-adv"><input type="checkbox" checked={s.autoAdvance} onChange={(e) => { s.autoAdvance = e.target.checked; bump() }} /> Po bossie idź automatycznie dalej</label>
        </div>
      </div>
    </Frame>
  )
}

export const fmtSecs = (t: number) => { const m = Math.floor(t / 60), sec = Math.round(t % 60); return m ? `${m} min ${sec} s` : `${sec} s` }

// Okno potwierdzenia podróży: skąd, dokąd, czym i ile to potrwa
function TravelConfirm({ s, zone, sub, onGo, onCancel }: { s: GameState; zone: string; sub: number; onGo: () => void; onCancel: () => void }) {
  const t = tripPlan(s, zone, sub)
  const z = zoneById(zone)
  const { lo } = subLevels(zone, sub)
  const lvl = Math.max(z.min, lo)
  return createPortal(
    <div className="modal-back" data-solid onClick={onCancel}>
      <div className="modal wframe travel-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="wframe-head"><span className="wframe-title">Podróż</span></div>
        <div className="wframe-body parchment">
          <div className="tc-row"><span>Skąd:</span><b>{t.fromName}</b></div>
          <div className="tc-row"><span>Dokąd:</span><b>{t.toName}</b></div>
          <div className="tc-row"><span>Czas:</span><b>{fmtSecs(t.total)}</b></div>
          <div className="tc-row"><span>Jak:</span><b>{t.label || 'pieszo'}{t.form ? ` · ${t.form} (szybciej)` : ''}</b></div>
          {lvl > s.hero.level + 3 && <div className="tc-warn">Uwaga: wrogowie od poziomu {lvl}, a ty masz {s.hero.level}. Będzie bardzo ciężko.</div>}
          <div className="pdim small">W trakcie podróży postać nie walczy. Zadania i postęp innych map zostają.</div>
          <div className="tc-btns"><button className="wbtn" onClick={onGo}>Wyrusz</button><button className="wbtn" onClick={onCancel}>Anuluj</button></div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
