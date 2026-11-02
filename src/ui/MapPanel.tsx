// Mapa świata (schemat Kalimdoru i Eastern Kingdoms) + szczegóły mapy: podstrefy, postęp, bossowie, podróż.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ZONES, LINKS, zoneById, type Zone } from '../data/zones'
import type { GameState } from '../game/types'
import { routeZones, subsOf, progOf, subLevels, bossLevel, killsNeeded, canTravel, townOf, zonePct, portsOf, TRANSPORTS } from '../game/world'
import { travel } from '../game/town'
import { tripPlan, ride, canTurnBack, tripPosition, turnBack } from '../game/sim'
import { menuIcon } from '../render/icons'
import { graphicUrl } from '../render/assets'
import { Bar, Frame } from './common'

const W = 1000, H = 630
const BOX = { kalimdor: { x: 20, y: 44, w: 440, h: 530 }, ek: { x: 540, y: 44, w: 440, h: 530 } }
const COL = { alliance: '#3f78e0', horde: '#d0392b', contested: '#d8a72a' }
const pos = (z: Zone) => { const b = BOX[z.continent]; return { x: b.x + (z.x / 100) * b.w, y: b.y + (z.y / 100) * b.h } }

// Położenie map na grafikach kontynentów (piksele obrazka 772×515)
const MAP_IMG = { ek: 'wow_eastern_kingdoms_map', kalimdor: 'wow_kalimdor_map' } as const
const IW = 772, IH = 515
const MAP_POS: Record<string, [number, number]> = {
  deathknell: [305, 112], tirisfal: [365, 110], silverpine: [318, 170], wpl: [438, 112], epl: [480, 75], alterac: [385, 150], hillsbrad: [372, 182],
  hinterlands: [465, 150], arathi: [425, 190], wetlands: [398, 242], dun_morogh: [388, 285], coldridge: [352, 280], loch_modan: [445, 262],
  badlands: [440, 305], searing_gorge: [380, 312], burning_steppes: [392, 338], elwynn: [362, 365], northshire: [376, 350], redridge: [425, 347],
  westfall: [328, 392], duskwood: [372, 395], swamp_sorrows: [440, 378], blasted_lands: [445, 412], stranglethorn: [365, 445],
  teldrassil: [330, 62], shadowglen: [342, 48], darkshore: [355, 150], felwood: [405, 168], winterspring: [450, 130], azshara: [480, 190],
  ashenvale: [370, 215], stonetalon: [318, 255], durotar: [448, 255], valley_of_trials: [452, 282], barrens: [412, 290], mulgore: [365, 298],
  camp_narache: [350, 333], desolace: [312, 322], ungoro: [378, 442], thousand_needles: [410, 385], dustwallow: [440, 345], feralas: [325, 370], tanaris: [430, 440], silithus: [325, 440],
}
// przesunięcie podpisu, gdzie mapy leżą blisko siebie
const LABEL: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  camp_narache: [-7, 3, 'end'], valley_of_trials: [7, 3, 'start'], coldridge: [-7, 3, 'end'], northshire: [7, 3, 'start'], deathknell: [-7, 3, 'end'], shadowglen: [7, 3, 'start'],
  durotar: [10, 3, 'start'], mulgore: [0, -11, 'middle'], stonetalon: [0, -11, 'middle'], ungoro: [0, -11, 'middle'], tirisfal: [0, -11, 'middle'],
  wetlands: [0, -11, 'middle'], dun_morogh: [0, -11, 'middle'], searing_gorge: [0, -11, 'middle'], elwynn: [-10, 3, 'end'], westfall: [-10, 3, 'end'],
}
const ipos = (id: string) => { const p = MAP_POS[id] ?? [IW / 2, IH / 2]; return { x: p[0], y: p[1] } }

// Mapa na grafice kontynentu (gdy gracz dostarczył obrazki map)
function ImgMap({ s, cont, sel, setSel, setHover }: { s: GameState; cont: 'ek' | 'kalimdor'; sel: string; setSel: (id: string) => void; setHover: (z: Zone | null) => void }) {
  const url = graphicUrl(MAP_IMG[cont])!
  const unlocked = new Set(s.unlocked)
  const route = routeZones(s).filter((id) => zoneById(id).continent === cont)
  const onRoute = route.filter((id) => unlocked.has(id))
  const full = routeZones(s)
  const lastOpen = full.filter((id) => unlocked.has(id)).pop()
  const next = lastOpen ? full[full.indexOf(lastOpen) + 1] : undefined
  const lines = TRANSPORTS.filter((t) => (t.faction === 'neutral' || t.faction === s.hero.faction))
  const zones = ZONES.filter((z) => z.continent === cont)
  return (
    <svg viewBox={`0 0 ${IW} ${IH}`} className="map img">
      <image href={url} x="0" y="0" width={IW} height={IH} />
      {LINKS.filter(([a, b]) => zoneById(a).continent === cont && zoneById(b).continent === cont).map(([a, b]) => { const pa = ipos(a), q = ipos(b); return <line key={a + b} x1={pa.x} y1={pa.y} x2={q.x} y2={q.y} stroke="#2a1a08" strokeWidth="1" opacity="0.35" /> })}
      <polyline points={onRoute.map((id) => { const p = ipos(id); return `${p.x},${p.y}` }).join(' ')} fill="none" stroke="#ffd100" strokeWidth="2.5" opacity="0.9" />
      {lastOpen && next && zoneById(lastOpen).continent === cont && zoneById(next).continent === cont && (() => { const a = ipos(lastOpen), b = ipos(next); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffd100" strokeWidth="2" strokeDasharray="5 4" opacity="0.85" /> })()}
      {lines.map((t) => {
        const ends = [t.a, t.b].filter((id) => zoneById(id).continent === cont)
        const both = ends.length === 2
        const a = ipos(t.a), b = ipos(t.b)
        const ico = t.kind === 'ship' ? '⚓' : t.kind === 'tram' ? '🚋' : '🎈'
        return (
          <g key={t.label}>
            {both && <path d={`M${a.x},${a.y} Q${(a.x + b.x) / 2 - 40},${(a.y + b.y) / 2} ${b.x},${b.y}`} fill="none" stroke={t.kind === 'ship' ? '#9ad8ff' : t.kind === 'tram' ? '#d0d0d0' : '#ffb060'} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.9" />}
            {ends.map((id) => { const p = ipos(id); return <text key={id} x={p.x - 16} y={p.y - 8} className="map-port"><title>{t.label}</title>{ico}</text> })}
          </g>
        )
      })}
      {zones.map((zz) => {
        const pt = ipos(zz.id)
        const isStart = !!zz.parent
        const rad = isStart ? 4 : 7
        const done = unlocked.has(zz.id) && zonePct(s, zz.id) >= 1
        return (
          <g key={zz.id} onMouseEnter={() => setHover(zz)} onMouseLeave={() => setHover(null)} onClick={() => setSel(zz.id)} style={{ cursor: 'pointer' }}>
            <circle cx={pt.x} cy={pt.y} r={rad + 6} fill="transparent" />
            <circle cx={pt.x} cy={pt.y} r={rad} fill={COL[zz.control]} opacity={unlocked.has(zz.id) ? 1 : 0.55} stroke={zz.id === sel ? '#fff' : '#1a1206'} strokeWidth={zz.id === sel ? 2.5 : 1.2} />
            {done && <text x={pt.x} y={pt.y + 3} className="map-lvl small">✓</text>}
            {(() => {
              // obszary startowe podpisane tylko, gdy są wybrane albo tam jesteś (reszta w podpowiedzi pod mapą)
              if (isStart && zz.id !== sel && zz.id !== s.loc.zone) return null
              const [dx, dy, an] = LABEL[zz.id] ?? [0, 17, 'middle']
              return (
                <>
                  <text x={pt.x + dx} y={pt.y + dy} style={{ textAnchor: an }} className={`${isStart ? 'map-sub' : 'map-name'} sm ${unlocked.has(zz.id) ? '' : 'locked'}`}>{zz.name}</text>
                  {zz.capital && <text x={pt.x + dx} y={pt.y + dy + (dy < 0 ? -10 : 10)} style={{ textAnchor: an }} className="map-cap sm">★ {zz.capital}</text>}
                </>
              )
            })()}
          </g>
        )
      })}
      {zoneById(s.loc.zone).continent === cont && (() => { const pt = ipos(s.loc.zone); return <circle cx={pt.x} cy={pt.y} r="14" fill="none" stroke="#fff" strokeWidth="2" className="pulse" /> })()}
    </svg>
  )
}

export function MapPanel({ s, onClose, bump }: { s: GameState; onClose: () => void; bump: () => void }) {
  const [sel, setSel] = useState(s.loc.zone)
  const [hover, setHover] = useState<Zone | null>(null)
  const [ask, setAsk] = useState<{ zone: string; sub: number } | null>(null)
  const [askRide, setAskRide] = useState<number | null>(null)
  const pics = !!graphicUrl(MAP_IMG.ek) && !!graphicUrl(MAP_IMG.kalimdor)
  const [cont, setCont] = useState<'ek' | 'kalimdor'>(zoneById(s.loc.zone).continent)
  const pick = (id: string) => { setSel(id); setCont(zoneById(id).continent) }
  const traveling = s.phase === 'travel'
  const myPorts = portsOf(s.hero.faction, s.loc.zone)
  const lines = TRANSPORTS.filter((t) => t.faction === 'neutral' || t.faction === s.hero.faction)
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
          {pics && (
            <div className="map-tabs">
              {(['ek', 'kalimdor'] as const).map((k) => <button key={k} className={`tab ${cont === k ? 'on' : ''}`} onClick={() => setCont(k)}>{k === 'ek' ? 'Eastern Kingdoms' : 'Kalimdor'}</button>)}
              <span className="map-legend-html"><i style={{ background: COL.alliance }} /> Alliance <i style={{ background: COL.horde }} /> Horde <i style={{ background: COL.contested }} /> Contested · ⚓ ship · 🎈 zeppelin · 🚋 tram</span>
            </div>
          )}
          {pics ? <ImgMap s={s} cont={cont} sel={sel} setSel={pick} setHover={setHover} /> : (
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
            {lines.map((t) => { const a = pos(zoneById(t.a)), b = pos(zoneById(t.b)); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 30; return (
              <g key={t.label}>
                <path d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} fill="none" stroke={t.kind === 'ship' ? '#9ad8ff' : t.kind === 'tram' ? '#c0c0c0' : '#ffb060'} strokeWidth="2" strokeDasharray="5 4" opacity="0.85" />
                <text x={a.x + 12} y={a.y - 14} className="map-port">{t.kind === 'ship' ? '⚓' : t.kind === 'tram' ? '🚋' : '🎈'}</text>
                <text x={b.x + 12} y={b.y - 14} className="map-port">{t.kind === 'ship' ? '⚓' : t.kind === 'tram' ? '🚋' : '🎈'}</text>
              </g>
            ) })}
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
              <circle r="5" cx="0" cy="-3" fill={COL.alliance} /><text x="9" y="0">Alliance</text>
              <circle r="5" cx="95" cy="-3" fill={COL.horde} /><text x="104" y="0">Horde</text>
              <circle r="5" cx="160" cy="-3" fill={COL.contested} /><text x="169" y="0">Contested</text>
              <line x1="235" y1="-3" x2="260" y2="-3" stroke="#ffd100" strokeWidth="3" /><text x="266" y="0">Unlocked</text>
              <line x1="350" y1="-3" x2="375" y2="-3" stroke="#ffd100" strokeWidth="2" strokeDasharray="6 5" /><text x="381" y="0">Next (after the boss)</text>
            </g>
          </svg>
          )}
          <div className="map-hover">{hover ? <><b>{hover.name}</b> ({hover.min}-{hover.max}) · click to see its subzones{hover.min > s.hero.level + 3 ? ' · warning: high level' : ''}</> : 'Click any zone to see its subzones and travel there (higher-level zones too).'}</div>
        </div>
        <div className="map-right parchment">
          <h3>{z.name}</h3>
          <div className="pdim">Levels {z.min}-{z.max} · {townOf(z, s.hero.faction) ? `town: ${townOf(z, s.hero.faction)}` : 'no town'}</div>
          {traveling && (
            <div className="trip-block">
              You are travelling ({s.trip?.to}). Pick a new destination once you arrive.
              {canTurnBack(s) && (() => { const pos = tripPosition(s)!; return (
                <div className="tr-foot">
                  <button className="wbtn small" onClick={() => { turnBack(s, 'origin'); bump() }}>↩ Turn back to {zoneById(pos.origin.zone).name} ({Math.max(2, Math.round(pos.el))} s)</button>
                  <button className="wbtn small" onClick={() => { turnBack(s, 'here'); bump() }}>⏹ Stay in {zoneById(pos.cur.zone).name}</button>
                </div>
              ) })()}
            </div>
          )}
          {!traveling && sel !== s.loc.zone && (() => { const t = tripPlan(s, sel, 0); return t.blocked ? <div className="trip-block">{t.blocked}</div> : <div className="trip-info">🥾 On foot: {fmtSecs(t.total)}{t.form ? ` (${t.form})` : ''}</div> })()}
          {sel === s.loc.zone && myPorts.length > 0 && (
            <div className="ports">
              <b>Transport in this zone</b>
              {myPorts.map((p) => (
                <div key={p.i} className="port-row">
                  <span>{p.t.kind === 'ship' ? '⚓' : p.t.kind === 'tram' ? '🚋' : '🎈'} {p.t.label} → <b>{zoneById(p.to).name}</b> ({fmtSecs(p.t.secs)})</span>
                  <button className="wbtn small" disabled={traveling} onClick={() => setAskRide(p.i)}>Board</button>
                </div>
              ))}
            </div>
          )}
          {sel !== s.loc.zone && portsOf(s.hero.faction, sel).length > 0 && <div className="pdim small">Port: {portsOf(s.hero.faction, sel).map((p) => `${p.t.kind === 'ship' ? '⚓' : p.t.kind === 'tram' ? '🚋' : '🎈'} ${zoneById(p.to).name}`).join(', ')}</div>}
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
                    {can && !here ? <button className="wbtn small" disabled={traveling || !!tripPlan(s, sel, i).blocked} onClick={() => setAsk({ zone: sel, sub: i })}>Go</button> : here ? <span className="subz-here">you are here</span> : null}
                  </div>
                  <div className="subz-boss">
                    {sz.zoneBoss ? '☠ Zone boss' : 'Miniboss'}: <b>{sz.boss.name}</b> ({bossLevel(sel, i)}) {cleared ? <span className="ok">✓ defeated</span> : frontier ? <span>· {Math.min(need, p.kills)}/{need}</span> : <span className="pdim">· locked</span>}
                  </div>
                  {frontier && <Bar value={Math.min(need, p.kills)} max={need} color="linear-gradient(#e0b030,#7a5a00)" height={6} />}
                </div>
              )
            })}
          </div>
          {ask && <TravelConfirm s={s} zone={ask.zone} sub={ask.sub} onCancel={() => setAsk(null)} onGo={() => { travel(s, ask.zone, ask.sub); setAsk(null); bump() }} />}
          {askRide != null && <RideConfirm s={s} index={askRide} onCancel={() => setAskRide(null)} onGo={() => { ride(s, askRide); setAskRide(null); bump() }} />}
          <label className="auto-adv"><input type="checkbox" checked={s.autoAdvance} onChange={(e) => { s.autoAdvance = e.target.checked; bump() }} /> Automatically move on after a boss</label>
        </div>
      </div>
    </Frame>
  )
}

export const fmtSecs = (t: number) => { const m = Math.floor(t / 60), sec = Math.round(t % 60); return m ? `${m} min ${sec} s` : `${sec} s` }

// Okno potwierdzenia podróży: skąd, dokąd, czym i ile to potrwa
export function TravelConfirm({ s, zone, sub, onGo, onCancel }: { s: GameState; zone: string; sub: number; onGo: () => void; onCancel: () => void }) {
  const t = tripPlan(s, zone, sub)
  const z = zoneById(zone)
  const { lo } = subLevels(zone, sub)
  const lvl = Math.max(z.min, lo)
  return createPortal(
    <div className="modal-back" data-solid onClick={onCancel}>
      <div className="modal wframe travel-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="wframe-head"><span className="wframe-title">Travel</span></div>
        <div className="wframe-body parchment">
          <div className="tc-row"><span>From:</span><b>{t.fromName}</b></div>
          <div className="tc-row"><span>To:</span><b>{t.toName}</b></div>
          <div className="tc-row"><span>Time:</span><b>{fmtSecs(t.total)}</b></div>
          <div className="tc-row"><span>How:</span><b>{t.label || 'on foot'}{t.form ? ` · ${t.form} (faster)` : ''}</b></div>
          {t.via.length > 0 && <div className="tc-row"><span>Via:</span><b>{t.via.map((z) => zoneById(z).name).join(' → ')}</b></div>}
          {lvl > s.hero.level + 3 && <div className="tc-warn">Warning: enemies from level {lvl}, and you are level {s.hero.level}. This will be very hard.</div>}
          <div className="pdim small">Your character doesn't fight while travelling. Quests and progress in other zones are kept.</div>
          <div className="tc-btns"><button className="wbtn" onClick={onGo}>Set off</button><button className="wbtn" onClick={onCancel}>Cancel</button></div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function RideConfirm({ s, index, onGo, onCancel }: { s: GameState; index: number; onGo: () => void; onCancel: () => void }) {
  const p = portsOf(s.hero.faction, s.loc.zone).find((x) => x.i === index)
  if (!p) return null
  return createPortal(
    <div className="modal-back" data-solid onClick={onCancel}>
      <div className="modal wframe travel-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="wframe-head"><span className="wframe-title">{p.t.kind === 'ship' ? 'Boat' : p.t.kind === 'tram' ? 'Deeprun Tram' : 'Zeppelin'}</span></div>
        <div className="wframe-body parchment">
          <div className="tc-row"><span>From:</span><b>{zoneById(s.loc.zone).name}</b></div>
          <div className="tc-row"><span>To:</span><b>{zoneById(p.to).name}: {subsOf(p.to)[0].name}</b></div>
          <div className="tc-row"><span>Time:</span><b>{fmtSecs(p.t.secs)}</b></div>
          <div className="tc-row"><span>How:</span><b>{p.t.label}</b></div>
          <div className="pdim small">After you arrive, you continue on foot by picking a destination on the map.</div>
          <div className="tc-btns"><button className="wbtn" onClick={onGo}>Board</button><button className="wbtn" onClick={onCancel}>Cancel</button></div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
