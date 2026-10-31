import { useState } from 'react'
import { CLASSES, classById, type ClassId } from '../data/classes'
import { RACES, raceById, type Faction, type RaceId } from '../data/races'
import { zoneById } from '../data/zones'
import { Portrait } from './common'

const FACTIONS: { id: Faction; name: string; pl: string; motto: string; desc: string }[] = [
  { id: 'alliance', name: 'Alliance', pl: 'Przymierze', motto: 'For the Alliance!', desc: 'Ludzie, krasnoludy, gnomy i nocne elfy. Sojusz zbudowany na honorze, tradycji i wspólnej walce z Hordą.' },
  { id: 'horde', name: 'Horde', pl: 'Horda', motto: 'For the Horde!', desc: 'Orkowie, trolle, taureni i Forsaken. Wygnańcy i wyrzutki, którzy razem walczą o przetrwanie na Kalimdorze i w Lordaeronie.' },
]

const NAME_OK = /^[A-Za-zÀ-ž]{2,12}$/

export function CharacterCreate({ onCreate }: { onCreate: (name: string, race: RaceId, cls: ClassId) => void }) {
  const [faction, setFaction] = useState<Faction | null>(null)
  const [race, setRace] = useState<RaceId | null>(null)
  const [cls, setCls] = useState<ClassId | null>(null)
  const [name, setName] = useState('')
  const step = !faction ? 1 : !race ? 2 : !cls ? 3 : 4
  const r = race ? raceById(race) : null
  const c = cls ? classById(cls) : null
  const nameValid = NAME_OK.test(name)

  return (
    <div className="create" data-solid>
      <div className="create-head">
        <h1>Tworzenie postaci</h1>
        <div className="steps">
          {['Frakcja', 'Rasa', 'Klasa', 'Imię'].map((t, i) => (
            <button key={t} className={`step ${step === i + 1 ? 'on' : ''} ${step > i + 1 ? 'done' : ''}`} disabled={step < i + 1}
              onClick={() => { if (i === 0) { setFaction(null); setRace(null); setCls(null) } if (i === 1) { setRace(null); setCls(null) } if (i === 2) setCls(null) }}>
              {i + 1}. {t}
            </button>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="factions">
          {FACTIONS.map((f) => (
            <button key={f.id} className={`faction ${f.id}`} onClick={() => setFaction(f.id)}>
              <div className="faction-name">{f.pl}</div>
              <div className="faction-sub">{f.name}</div>
              <p>{f.desc}</p>
              <div className="faction-races">{RACES.filter((x) => x.faction === f.id).map((x) => x.name).join(' · ')}</div>
              <div className="motto">{f.motto}</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && faction && (
        <div className="races">
          {RACES.filter((x) => x.faction === faction).map((x) => {
            const z = zoneById(x.start.zone)
            return (
              <button key={x.id} className={`race-card ${faction}`} onClick={() => setRace(x.id)}>
                <Portrait race={x.id} cls={x.classes[0]} width={230} height={96} />
                <div className="race-name">{x.name}</div>
                <p className="race-blurb">{x.blurb}</p>
                <div className="race-start">Start: <b>{x.start.area}</b>, {z.parent ? zoneById(z.parent).name : ''}<br />Stolica: {x.start.capital}</div>
                <ul className="racials">{x.racials.map((rr) => <li key={rr.name}><b>{rr.name}</b> — {rr.desc}</li>)}</ul>
                <div className="race-classes">{x.classes.map((k) => <span key={k} style={{ color: classById(k).color }}>{classById(k).name}</span>)}</div>
              </button>
            )
          })}
        </div>
      )}

      {step === 3 && r && (
        <div className="classes-step">
          <p className="hint">{r.name} może być jedną z {r.classes.length} klas. Pozostałe są w Classicu niedostępne dla tej rasy.</p>
          <div className="classes">
            {CLASSES.map((k) => {
              const ok = r.classes.includes(k.id)
              const why = !ok ? (k.id === 'paladin' && r.faction === 'horde' ? 'Paladyni tylko w Przymierzu' : k.id === 'shaman' && r.faction === 'alliance' ? 'Szamani tylko w Hordzie' : `Niedostępna dla rasy ${r.name}`) : ''
              return (
                <button key={k.id} className={`class-card ${ok ? '' : 'locked'}`} disabled={!ok} onClick={() => setCls(k.id)} style={{ borderColor: ok ? k.color : undefined }}>
                  {ok && <Portrait race={r.id} cls={k.id} width={170} height={84} />}
                  <div className="class-name" style={{ color: ok ? k.color : '#666' }}>{k.name}</div>
                  <div className="class-pl">{k.pl} · {k.role}</div>
                  <div className="class-res">{k.resource === 'rage' ? 'Rage' : k.resource === 'energy' ? 'Energy' : 'Mana'} · {k.armor(1) === k.armor(40) ? cap(k.armor(1)) : `${cap(k.armor(1))} → ${cap(k.armor(40))} od 40`}</div>
                  {!ok && <div className="why">{why}</div>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 4 && r && c && (
        <div className="summary">
          <Portrait race={r.id} cls={c.id} width={360} height={150} />
          <div className="summary-info">
            <div className="summary-title"><span style={{ color: c.color }}>{r.name} {c.name}</span> · {r.faction === 'alliance' ? 'Przymierze' : 'Horda'}</div>
            <div>Zaczynasz w <b>{r.start.area}</b> ({r.start.settlement}).</div>
            <div className="stats-row">
              {(['str', 'agi', 'sta', 'int', 'spi'] as const).map((k) => (
                <div key={k} className="stat"><span>{k.toUpperCase()}</span><b>{r.base[k] + c.bonus[k]}</b></div>
              ))}
            </div>
            <div className="abil-preview">Pierwsze umiejętności: {c.abilities.filter((a) => a.lvl === 1).map((a) => a.name).join(', ')}</div>
            <label className="name-label">
              Imię postaci
              <input autoFocus value={name} maxLength={12} placeholder="np. Thrallson" onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter' && nameValid) onCreate(fixName(name), r.id, c.id) }} />
            </label>
            {name && !nameValid && <div className="why">2–12 liter, bez cyfr i spacji (jak w WoW).</div>}
            <button className="btn big" disabled={!nameValid} onClick={() => onCreate(fixName(name), r.id, c.id)}>Wejdź do świata</button>
          </div>
        </div>
      )}
    </div>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fixName = (n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
