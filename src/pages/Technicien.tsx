import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet'
import {
  ArrowLeft,
  BatteryLow,
  BatteryMedium,
  Clock,
  ClipboardCheck,
  LocateFixed,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Wrench,
} from 'lucide-react'
import { Header } from '../components/Brand'
import { StatutBadge, UrgenceBadge } from '../components/Badges'
import { FitBounds, FlyTo, InvalidateOnResize } from '../components/MapBits'
import { ReportModal } from '../components/ReportModal'
import { DEPOT, TECHNICIENS } from '../data/seed'
import { useStore } from '../data/store'
import type { LatLng, Panne } from '../data/types'
import { distanceKm, formatDistance, formatDuree, optimiserTournee, tracer, type Trace } from '../lib/route'
import { depotIcon, heure, meIcon, PARIS_CENTER, pinIcon, TILES } from '../lib/ui'

const SEUIL_SUR_PLACE_KM = 0.05
const PREF_KEY = 'bluemove.tech'

function readPref(): string {
  try {
    return localStorage.getItem(PREF_KEY) || 't1'
  } catch {
    return 't1'
  }
}

export default function Technicien() {
  const { pannes, rapports } = useStore()
  const [techId, setTechId] = useState(readPref)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gps, setGps] = useState<LatLng | null>(null)
  const [simulee, setSimulee] = useState<LatLng | null>(null)
  const [ordre, setOrdre] = useState<string[] | null>(null)
  const [trace, setTrace] = useState<Trace | null>(null)
  const [calcul, setCalcul] = useState(false)
  const [rapportPour, setRapportPour] = useState<Panne | null>(null)
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const tech = TECHNICIENS.find((t) => t.id === techId)!
  const mesPannes = useMemo(() => pannes.filter((p) => p.technicienId === techId), [pannes, techId])
  const aFaire = mesPannes.filter((p) => p.statut === 'a_faire')
  const faites = mesPannes.length - aFaire.length
  const selected = mesPannes.find((p) => p.id === selectedId) ?? null
  const position: LatLng = simulee ?? gps ?? DEPOT
  const sourcePosition = simulee ? 'simulée' : gps ? 'GPS' : 'dépôt'

  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, techId)
    } catch {
      /* préférence non mémorisée */
    }
    setSelectedId(null)
    setOrdre(null)
    setTrace(null)
    setSimulee(null)
  }, [techId])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude }
        // Hors de Paris (démo en cours), le GPS n'a pas de sens : on garde le dépôt.
        if (distanceKm(here, DEPOT) < 15) setGps(here)
      },
      () => setGps(null),
      { enableHighAccuracy: true, maximumAge: 10000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const calculer = useCallback(
    async (depart: LatLng, restantes: Panne[]) => {
      if (!restantes.length) {
        setOrdre([])
        setTrace(null)
        return
      }
      setCalcul(true)
      const tour = optimiserTournee(depart, restantes)
      setOrdre(tour.map((p) => p.id))
      setTrace(await tracer(depart, tour))
      setCalcul(false)
    },
    [],
  )

  const tournee = useMemo(() => {
    if (!ordre) return null
    return ordre.map((id) => mesPannes.find((p) => p.id === id)!).filter((p) => p && p.statut === 'a_faire')
  }, [ordre, mesPannes])

  const liste = tournee ?? [...aFaire].sort((a, b) => b.urgence - a.urgence || b.signaleIlYaH - a.signaleIlYaH)
  const traitees = mesPannes.filter((p) => p.statut !== 'a_faire')

  const selectionner = (p: Panne, scroll = false) => {
    setSelectedId(p.id)
    setFlyTarget({ lat: p.lat, lng: p.lng })
    if (scroll && window.matchMedia('(max-width: 1023px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const apresRapport = () => {
    const done = rapportPour
    setRapportPour(null)
    if (ordre && done) {
      const restantes = aFaire.filter((p) => p.id !== done.id)
      calculer({ lat: done.lat, lng: done.lng }, restantes)
    }
  }

  const ordreDe = (id: string) => {
    const i = tournee?.findIndex((p) => p.id === id) ?? -1
    return i >= 0 ? i + 1 : undefined
  }

  return (
    <div className="flex h-full flex-col">
      <Header>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Technicien connecté</span>
          <select
            value={techId}
            onChange={(e) => setTechId(e.target.value)}
            className="min-h-11 rounded-full border border-line bg-white px-4 font-semibold text-ink"
          >
            {TECHNICIENS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.prenom} {t.nom} · {t.zone}
              </option>
            ))}
          </select>
        </label>
      </Header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 p-3 sm:p-4 lg:min-h-0 lg:flex-row-reverse">
        {/* Carte */}
        <section className="card relative h-[52vh] shrink-0 overflow-hidden lg:h-auto lg:flex-1" aria-label="Carte des interventions">
          <MapContainer center={PARIS_CENTER} zoom={13} className="h-full w-full" zoomControl={false}>
            <ZoomControl position="bottomright" />
            <TileLayer url={TILES.url} attribution={TILES.attribution} />
            <InvalidateOnResize />
            <FitBounds points={[...mesPannes, DEPOT]} k={techId} />
            <FlyTo target={flyTarget} />
            <Marker position={[DEPOT.lat, DEPOT.lng]} icon={depotIcon} title={DEPOT.nom} />
            {trace && (
              <>
                <Polyline positions={trace.points} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
                <Polyline positions={trace.points} pathOptions={{ color: '#1664c0', weight: 5, opacity: 0.9 }} />
              </>
            )}
            {mesPannes.map((p) => (
              <Marker
                key={p.id + p.statut + (ordreDe(p.id) ?? '') + (p.id === selectedId)}
                position={[p.lat, p.lng]}
                icon={pinIcon(p, { ordre: ordreDe(p.id), selected: p.id === selectedId })}
                title={`${p.scooterId}, urgence ${p.urgence}`}
                eventHandlers={{ click: () => selectionner(p) }}
              >
                <Popup>
                  <div className="min-w-52 font-sans">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-display text-base">{p.scooterId}</strong>
                      <UrgenceBadge u={p.urgence} compact />
                    </div>
                    <p className="!my-1 text-sm text-ink-2">{p.type}</p>
                    <p className="!my-0 text-xs text-muted">
                      {p.quartier} · {formatDistance(distanceKm(position, p))}
                    </p>
                    <button
                      onClick={() => selectionner(p, true)}
                      className="mt-2 min-h-10 w-full rounded-lg bg-blue text-sm font-semibold text-white"
                    >
                      Ouvrir la fiche
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            {sourcePosition !== 'dépôt' && (
              <Marker position={[position.lat, position.lng]} icon={meIcon} title="Ma position" zIndexOffset={1000} />
            )}
          </MapContainer>

          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap gap-2">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-card">
              <LocateFixed size={14} className="text-blue-2" aria-hidden="true" />
              Position {sourcePosition}
            </span>
            <Legende />
          </div>
        </section>

        {/* Panneau */}
        <aside ref={panelRef} className="flex scroll-mt-20 flex-col gap-4 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto lg:pb-2">
          {selected ? (
            <Fiche
              p={selected}
              position={position}
              ordre={ordreDe(selected.id)}
              rapport={rapports.filter((r) => r.panneId === selected.id).at(-1)}
              onBack={() => setSelectedId(null)}
              onSimuler={() => setSimulee({ lat: selected.lat + 0.0002, lng: selected.lng + 0.0001 })}
              onRapport={() => setRapportPour(selected)}
            />
          ) : (
            <>
              <div className="card p-5">
                <p className="eyebrow">Bonjour {tech.prenom}</p>
                <h1 className="mt-1 text-2xl font-bold">Ta tournée du jour</h1>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-sm text-muted">
                    <span className="num font-display text-3xl font-bold text-ink">{faites}</span>
                    <span className="num"> / {mesPannes.length}</span> interventions traitées
                  </p>
                  <p className="text-sm font-semibold text-critical">
                    {aFaire.filter((p) => p.urgence >= 4).length} urgentes
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-50" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue to-teal transition-[width] duration-500"
                    style={{ width: `${(faites / Math.max(1, mesPannes.length)) * 100}%` }}
                  />
                </div>

                <button
                  onClick={() => calculer(position, aFaire)}
                  disabled={calcul || !aFaire.length}
                  className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue font-semibold text-white transition-colors hover:bg-[#1257a8] disabled:opacity-50"
                >
                  <RouteIcon size={18} aria-hidden="true" />
                  {calcul ? 'Calcul en cours…' : ordre ? 'Recalculer depuis ma position' : 'Calculer mon itinéraire'}
                </button>

                {trace && tournee && tournee.length > 0 && (
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Étapes" value={String(tournee.length)} />
                    <Stat label="Distance" value={formatDistance(trace.km)} />
                    <Stat label="Durée est." value={formatDuree(trace.minutes)} />
                  </dl>
                )}
                {trace && (
                  <p className="mt-3 rounded-xl border border-dashed border-[#b8d0ee] bg-soft p-3 text-xs leading-relaxed text-ink-2">
                    Ordre calculé selon la <strong>proximité</strong> et l’<strong>urgence</strong> : les urgences 5 passent en
                    premier, puis chaque km de retard coûte plus cher sur une panne urgente.{' '}
                    {trace.source === 'estimation' ? 'Tracé approximatif (service de routage indisponible).' : 'Tracé routier OSRM, 20 min par intervention.'}
                  </p>
                )}
              </div>

              <section className="card p-2" aria-labelledby="todo-title">
                <h2 id="todo-title" className="eyebrow px-3 pt-3 pb-2">
                  {tournee ? 'Ordre de passage' : 'À faire · par urgence'}
                </h2>
                {liste.length === 0 ? (
                  <p className="px-3 pb-4 text-sm text-muted">Tout est traité. Belle journée !</p>
                ) : (
                  <ol className="grid gap-1">
                    {liste.map((p, i) => (
                      <li key={p.id}>
                        <LigneIntervention p={p} index={tournee ? i + 1 : undefined} position={position} onClick={() => selectionner(p)} />
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {traitees.length > 0 && (
                <section className="card p-2" aria-labelledby="done-title">
                  <h2 id="done-title" className="eyebrow px-3 pt-3 pb-2">
                    Déjà traitées
                  </h2>
                  <ul className="grid gap-1">
                    {traitees.map((p) => (
                      <li key={p.id}>
                        <LigneIntervention p={p} position={position} onClick={() => selectionner(p)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </aside>
      </main>

      {rapportPour && <ReportModal panne={rapportPour} onClose={() => setRapportPour(null)} onDone={apresRapport} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-[#fbfdff] px-2 py-2.5">
      <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="num mt-0.5 font-display text-lg font-bold">{value}</dd>
    </div>
  )
}

function Legende() {
  return (
    <span className="pointer-events-auto hidden items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-card sm:inline-flex">
      Urgence
      {[1, 2, 3, 4, 5].map((u) => (
        <span
          key={u}
          className="num grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold"
          style={{ background: ['#43aa8b', '#8cc63f', '#f6c445', '#f4a261', '#e63946'][u - 1], color: u === 1 || u === 5 ? '#fff' : '#3d2f00' }}
        >
          {u}
        </span>
      ))}
    </span>
  )
}

function LigneIntervention({ p, index, position, onClick }: { p: Panne; index?: number; position: LatLng; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-soft">
      {index != null ? (
        <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white">
          {index}
        </span>
      ) : (
        <MapPin size={20} className="shrink-0 text-muted" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold">{p.scooterId}</span>
          <span className="truncate text-sm text-muted">{p.quartier}</span>
        </span>
        <span className="block truncate text-sm text-ink-2">{p.type}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        {p.statut === 'a_faire' ? <UrgenceBadge u={p.urgence} compact /> : <StatutBadge s={p.statut} />}
        <span className="num text-xs text-muted">{formatDistance(distanceKm(position, p))}</span>
      </span>
    </button>
  )
}

function Fiche({
  p,
  position,
  ordre,
  rapport,
  onBack,
  onSimuler,
  onRapport,
}: {
  p: Panne
  position: LatLng
  ordre?: number
  rapport?: { date: string; note?: string; statut: string }
  onBack: () => void
  onSimuler: () => void
  onRapport: () => void
}) {
  const d = distanceKm(position, p)
  const surPlace = d <= SEUIL_SUR_PLACE_KM
  const Batt = p.batterie < 20 ? BatteryLow : BatteryMedium
  return (
    <div className="card anim-sheet p-5">
      <button onClick={onBack} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-blue hover:bg-blue-50">
        <ArrowLeft size={16} aria-hidden="true" /> Retour à la tournée
      </button>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{ordre ? `Étape ${ordre} · ` : ''}Fiche panne</p>
          <h2 className="mt-1 text-3xl font-bold">{p.scooterId}</h2>
          <p className="mt-1 text-sm text-muted">
            {p.quartier} · {p.cp} Paris
          </p>
        </div>
        {p.statut === 'a_faire' ? <UrgenceBadge u={p.urgence} /> : <StatutBadge s={p.statut} />}
      </div>

      <div className="mt-4 rounded-2xl bg-soft p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Wrench size={16} className="text-blue" aria-hidden="true" />
          {p.type}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{p.description}</p>
        <p className="mt-2 text-sm">
          <span className="text-muted">Action conseillée : </span>
          <strong>{p.action}</strong>
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Info icon={<Navigation size={14} />} label="Distance" value={formatDistance(d)} />
        <Info icon={<Batt size={14} />} label="Batterie" value={`${p.batterie} %`} warn={p.batterie < 20} />
        <Info icon={<Clock size={14} />} label="Signalé" value={`il y a ${p.signaleIlYaH} h`} />
      </dl>

      {p.statut !== 'a_faire' ? (
        <div className="mt-4 rounded-2xl border border-line p-4 text-sm">
          <p className="font-semibold">Rapport envoyé {rapport ? `à ${heure(rapport.date)}` : ''}</p>
          {rapport?.note && <p className="mt-1.5 leading-relaxed text-ink-2">« {rapport.note} »</p>}
        </div>
      ) : (
        <div className="mt-4">
          {surPlace ? (
            <p className="mb-3 flex items-center gap-2 rounded-xl bg-[#e7f6f0] px-3 py-2.5 text-sm font-semibold text-[#1f6e55]">
              <LocateFixed size={16} aria-hidden="true" /> Tu es sur place, tu peux faire ton rapport.
            </p>
          ) : (
            <p className="mb-3 text-sm text-muted">
              Le rapport se débloque à moins de 50 m du scooter (tu es à {formatDistance(d)}).
            </p>
          )}
          <button
            onClick={onRapport}
            disabled={!surPlace}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue font-semibold text-white transition-colors hover:bg-[#1257a8] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            <ClipboardCheck size={18} aria-hidden="true" /> Faire mon rapport
          </button>
          {!surPlace && (
            <button
              onClick={onSimuler}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-2 text-sm font-semibold text-blue hover:bg-blue-50"
            >
              <LocateFixed size={16} aria-hidden="true" /> Mode démo : simuler mon arrivée
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Info({ icon, label, value, warn }: { icon: ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5">
      <dt className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-muted uppercase">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className={`num mt-0.5 font-display text-base font-bold ${warn ? 'text-critical' : ''}`}>{value}</dd>
    </div>
  )
}
