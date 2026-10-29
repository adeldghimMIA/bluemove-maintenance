import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AttributionControl, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet'
import {
  ArrowLeft,
  ArrowRight,
  BatteryLow,
  BatteryMedium,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardCheck,
  ExternalLink,
  ListOrdered,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation,
  PartyPopper,
  Play,
  SkipForward,
  Wrench,
} from 'lucide-react'
import { Header } from '../components/Brand'
import { StatutBadge, UrgenceBadge } from '../components/Badges'
import { FitBounds, FlyTo, InvalidateOnResize } from '../components/MapBits'
import { Miniatures, PhotoViewer } from '../components/PhotoViewer'
import { ReportModal } from '../components/ReportModal'
import { DEPOT, TECHNICIENS } from '../data/seed'
import { useStore } from '../data/store'
import type { LatLng, Panne, Rapport } from '../data/types'
import { distanceKm, formatDistance, formatDuree, googleMapsLiens, optimiserTournee, tracer, type Trace } from '../lib/route'
import { depotIcon, heure, meIcon, PARIS_CENTER, pinIcon, TILES } from '../lib/ui'

const SEUIL_SUR_PLACE_KM = 0.05
const RAYON_PARIS_KM = 15
const PARIS: LatLng = { lat: PARIS_CENTER[0], lng: PARIS_CENTER[1] }
const SESSION_KEY = 'bluemove.session'

type Cran = 'apercu' | 'moitie' | 'plein'
const HAUTEUR_CRAN: Record<Cran, string> = { apercu: '200px', moitie: '60%', plein: 'calc(100% - 12px)' }
type EtatGps = 'attente' | 'ok' | 'refuse' | 'indispo'
type Vue = 'accueil' | 'etape' | 'liste'

function lire(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function ecrire(key: string, v: string | null) {
  try {
    if (v == null) localStorage.removeItem(key)
    else localStorage.setItem(key, v)
  } catch {
    /* non mémorisé */
  }
}

function useIsDesktop() {
  const q = '(min-width: 1024px)'
  const [v, setV] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setV(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return v
}

export default function Technicien() {
  const [techId, setTechId] = useState<string | null>(() => lire(SESSION_KEY))
  const connecter = (id: string | null) => {
    ecrire(SESSION_KEY, id)
    setTechId(id)
  }
  if (!techId || !TECHNICIENS.some((t) => t.id === techId)) return <Connexion onChoose={connecter} />
  return <Tournee key={techId} techId={techId} onLogout={() => connecter(null)} />
}

/* ─────────────── Connexion ─────────────── */

function Connexion({ onChoose }: { onChoose: (id: string) => void }) {
  const { pannes } = useStore()
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header retour={{ label: 'Retour à l’accueil', to: '/' }} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <img src="/logo-mark.png" alt="" className="mx-auto w-44" />
        <h1 className="mt-3 text-center text-3xl font-extrabold">Connexion technicien</h1>
        <p className="mt-1 text-center text-muted">Qui démarre sa tournée aujourd’hui ?</p>
        <ul className="mt-6 grid gap-3">
          {TECHNICIENS.map((t) => {
            const mine = pannes.filter((p) => p.technicienId === t.id && p.statut === 'a_faire')
            const urg = mine.filter((p) => p.urgence >= 4).length
            return (
              <li key={t.id}>
                <button
                  onClick={() => onChoose(t.id)}
                  className="card flex min-h-20 w-full items-center gap-4 p-4 text-left transition-transform active:scale-[0.99]"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue to-teal font-display text-lg font-bold text-white" aria-hidden="true">
                    {t.prenom[0]}
                    {t.nom[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-bold">
                      {t.prenom} {t.nom}
                    </span>
                    <span className="block text-sm text-muted">
                      Zone {t.zone} · <span className="num">{mine.length}</span> panne{mine.length > 1 ? 's' : ''}
                      {urg > 0 && (
                        <>
                          {' '}
                          · <span className="font-semibold text-critical">
                            {urg} urgente{urg > 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <ArrowRight size={20} className="shrink-0 text-blue" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-6 text-center text-xs text-muted">Prototype : pas de mot de passe, choisis simplement ton profil.</p>
      </main>
    </div>
  )
}

/* ─────────────── Tournée guidée ─────────────── */

function Tournee({ techId, onLogout }: { techId: string; onLogout: () => void }) {
  const { pannes, rapports } = useStore()
  const desktop = useIsDesktop()
  const ordreKey = `bluemove.ordre.${techId}`
  const [ordre, setOrdre] = useState<string[] | null>(() => {
    const raw = lire(ordreKey)
    return raw ? (JSON.parse(raw) as string[]) : null
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [vue, setVue] = useState<Vue>(() => (lire(`bluemove.ordre.${techId}`) ? 'etape' : 'accueil'))
  const [gps, setGps] = useState<(LatLng & { precision: number }) | null>(null)
  const [etatGps, setEtatGps] = useState<EtatGps>('attente')
  const [simulee, setSimulee] = useState<LatLng | null>(null)
  const [depuisDepot, setDepuisDepot] = useState(false)
  const [trace, setTrace] = useState<Trace | null>(null)
  const [calcul, setCalcul] = useState(false)
  const [rapportPour, setRapportPour] = useState<Panne | null>(null)
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null)
  const [cran, setCran] = useState<Cran>('moitie')
  const [toast, setToast] = useState<string | null>(null)
  const [visionneuse, setVisionneuse] = useState<{ photos: string[]; i: number; legende: string } | null>(null)
  const sheetScroll = useRef<HTMLDivElement>(null)
  const touchY = useRef<number | null>(null)

  const tech = TECHNICIENS.find((t) => t.id === techId)!
  const mesPannes = useMemo(() => pannes.filter((p) => p.technicienId === techId), [pannes, techId])
  const aFaire = mesPannes.filter((p) => p.statut === 'a_faire')
  const faites = mesPannes.length - aFaire.length
  const selected = mesPannes.find((p) => p.id === selectedId) ?? null

  const loinDeParis = gps ? distanceKm(gps, PARIS) > RAYON_PARIS_KM : false
  const position: LatLng = simulee ?? (gps && !depuisDepot ? gps : DEPOT)
  const surGpsReel = !simulee && !!gps && !depuisDepot
  const marqueurMoi = simulee ?? gps

  const tournee = useMemo(() => {
    if (!ordre) return null
    const enOrdre = ordre.map((id) => mesPannes.find((p) => p.id === id)).filter((p): p is Panne => !!p && p.statut === 'a_faire')
    // Pannes ajoutées après le calcul : en fin de tournée
    const oubliees = mesPannes.filter((p) => p.statut === 'a_faire' && !ordre.includes(p.id))
    return [...enOrdre, ...oubliees]
  }, [ordre, mesPannes])
  const demarree = tournee !== null
  const etape = tournee?.[0] ?? null
  const numEtape = faites + 1

  useEffect(() => {
    ecrire(ordreKey, ordre ? JSON.stringify(ordre) : null)
  }, [ordre, ordreKey])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setEtatGps('indispo')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) })
        setEtatGps('ok')
      },
      (e) => setEtatGps(e.code === e.PERMISSION_DENIED ? 'refuse' : 'indispo'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Tracé routier de la tournée restante (recalculé à chaque étape validée)
  const tourneeIds = tournee?.map((p) => p.id).join(',') ?? ''
  useEffect(() => {
    if (!tournee?.length) {
      setTrace(null)
      return
    }
    let annule = false
    tracer(position, tournee).then((t) => !annule && setTrace(t))
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourneeIds])

  // On centre la carte sur l'étape en cours
  useEffect(() => {
    if (etape && vue === 'etape' && !selectedId) setFlyTarget({ lat: etape.lat, lng: etape.lng })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape?.id])

  const localiser = () => {
    setSimulee(null)
    setDepuisDepot(false)
    if (!('geolocation' in navigator)) return setEtatGps('indispo')
    setEtatGps((e) => (e === 'ok' ? e : 'attente'))
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) }
        setGps(here)
        setEtatGps('ok')
        setFlyTarget({ lat: here.lat, lng: here.lng })
      },
      (e) => setEtatGps(e.code === e.PERMISSION_DENIED ? 'refuse' : 'indispo'),
      { enableHighAccuracy: true, timeout: 20000 },
    )
  }

  const demarrer = useCallback(
    (depart: LatLng) => {
      setCalcul(true)
      setOrdre(optimiserTournee(depart, aFaire).map((p) => p.id))
      setCalcul(false)
      setVue('etape')
      setSelectedId(null)
      if (!desktop) setCran('moitie')
    },
    [aFaire, desktop],
  )

  const passer = () => {
    if (!tournee || tournee.length < 2) return
    const [premiere, ...reste] = tournee
    setOrdre([...reste.map((p) => p.id), premiere.id])
    setSimulee(null)
    setToast(`${premiere.scooterId} repoussé en fin de tournée.`)
  }

  const apresRapport = () => {
    const done = rapportPour
    setRapportPour(null)
    if (!done) return
    setSelectedId(null)
    setVue('etape')
    // On réoptimise la suite depuis le scooter qu'on vient de traiter
    const restantes = aFaire.filter((p) => p.id !== done.id)
    const suite = optimiserTournee({ lat: done.lat, lng: done.lng }, restantes)
    setOrdre(suite.map((p) => p.id))
    setSimulee(null)
    setToast(suite.length ? `Rapport envoyé. Étape suivante : ${suite[0].scooterId}` : 'Rapport envoyé. Tournée terminée !')
    if (!desktop) setCran('moitie')
    sheetScroll.current?.scrollTo({ top: 0 })
  }

  const ouvrirFiche = (p: Panne) => {
    setSelectedId(p.id)
    setFlyTarget({ lat: p.lat, lng: p.lng })
    if (!desktop) setCran((c) => (c === 'apercu' ? 'moitie' : c))
    sheetScroll.current?.scrollTo({ top: 0 })
  }

  const ordreDe = (id: string) => {
    if (!tournee) return undefined
    const i = tournee.findIndex((p) => p.id === id)
    return i >= 0 ? faites + i + 1 : undefined
  }

  const libelleGps = simulee
    ? 'Position simulée (démo)'
    : depuisDepot
      ? 'Départ du dépôt'
      : etatGps === 'ok' && gps
        ? `GPS · ± ${gps.precision} m`
        : etatGps === 'attente'
          ? 'Localisation…'
          : etatGps === 'refuse'
            ? 'GPS refusé · départ du dépôt'
            : 'GPS indisponible · départ du dépôt'

  const decalage = desktop ? 0 : cran === 'apercu' ? 100 : cran === 'moitie' ? Math.round(window.innerHeight * 0.28) : 0
  const pointsCadrage = [...mesPannes, DEPOT, ...(gps && !loinDeParis ? [gps] : [])]
  const sheetStyle = { '--sheet-h': HAUTEUR_CRAN[cran] } as CSSProperties
  const monter = () => setCran((c) => (c === 'apercu' ? 'moitie' : 'plein'))
  const descendre = () => setCran((c) => (c === 'plein' ? 'moitie' : 'apercu'))
  const origineGmaps = surGpsReel ? undefined : position
  // Flèche retour : remonte d'un niveau (fiche → étape → accueil de la tournée → choix du technicien)
  const surAccueil = vue === 'accueil' || !demarree
  const retour = selectedId
    ? { label: vue === 'liste' ? 'Retour à la tournée' : 'Retour à l’étape', onClick: () => setSelectedId(null) }
    : vue === 'liste'
      ? { label: 'Retour à l’étape en cours', onClick: () => setVue('etape') }
      : !surAccueil
        ? {
            label: 'Retour à l’accueil de la tournée',
            onClick: () => {
              setVue('accueil')
              if (!desktop) setCran('moitie')
            },
          }
        : { label: 'Changer de technicien', onClick: onLogout }

  const focusId = selectedId ?? (vue === 'etape' ? etape?.id : undefined)

  return (
    <div className="flex h-[100dvh] flex-col">
      <Header retour={retour} />

      <main style={sheetStyle} className="relative min-h-0 flex-1 lg:mx-auto lg:flex lg:w-full lg:max-w-[1440px] lg:flex-row-reverse lg:gap-4 lg:p-4">
        {/* Carte */}
        <section
          className="absolute inset-0 overflow-hidden lg:relative lg:inset-auto lg:flex-1 lg:rounded-[18px] lg:border lg:border-line lg:shadow-card"
          aria-label="Carte des interventions"
        >
          <MapContainer center={PARIS_CENTER} zoom={13} className="h-full w-full" zoomControl={false} attributionControl={false}>
            {desktop && <ZoomControl position="bottomright" />}
            <AttributionControl position={desktop ? 'bottomleft' : 'topright'} prefix={false} />
            <TileLayer url={TILES.url} attribution={TILES.attribution} />
            <InvalidateOnResize />
            <FitBounds points={pointsCadrage} k={techId} />
            <FlyTo target={flyTarget} offsetY={decalage} />
            <Marker position={[DEPOT.lat, DEPOT.lng]} icon={depotIcon} title={DEPOT.nom} />
            {trace && (
              <>
                <Polyline positions={trace.points} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
                <Polyline positions={trace.points} pathOptions={{ color: '#1664c0', weight: 5, opacity: 0.85 }} />
              </>
            )}
            {mesPannes.map((p) => (
              <Marker
                key={p.id + p.statut + (ordreDe(p.id) ?? '') + (p.id === focusId)}
                position={[p.lat, p.lng]}
                icon={pinIcon(p, { ordre: ordreDe(p.id), selected: p.id === focusId })}
                title={`${p.scooterId}, urgence ${p.urgence}`}
                zIndexOffset={p.id === focusId ? 500 : 0}
                eventHandlers={{ click: () => ouvrirFiche(p) }}
              >
                {desktop && (
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
                    </div>
                  </Popup>
                )}
              </Marker>
            ))}
            {marqueurMoi && <Marker position={[marqueurMoi.lat, marqueurMoi.lng]} icon={meIcon} title="Ma position" zIndexOffset={1000} />}
          </MapContainer>

          <div className="pointer-events-none absolute top-3 left-3 z-[500] flex max-w-[calc(100%-24px)] flex-wrap gap-2">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-card">
              <LocateFixed size={14} className={etatGps === 'ok' && !simulee ? 'text-ok' : 'text-blue-2'} aria-hidden="true" />
              {libelleGps}
            </span>
            <Legende />
          </div>

          <button
            onClick={localiser}
            className="absolute right-3 bottom-[calc(var(--sheet-h)+12px)] z-[550] grid h-12 w-12 place-items-center rounded-full bg-white text-blue shadow-pop transition-[bottom] duration-300 hover:bg-blue-50 lg:right-auto lg:bottom-4 lg:left-4"
            aria-label="Me localiser"
          >
            <LocateFixed size={22} />
          </button>
        </section>

        {/* Panneau : bottom sheet sur mobile, colonne sur ordinateur */}
        <aside
          className="absolute inset-x-0 bottom-0 z-[600] flex h-[var(--sheet-h)] flex-col rounded-t-[26px] bg-bg shadow-[0_-12px_32px_rgba(21,45,77,.18)] transition-[height] duration-300 ease-out lg:static lg:h-auto lg:w-[400px] lg:shrink-0 lg:rounded-none lg:bg-transparent lg:shadow-none"
          aria-label="Ma tournée"
        >
          <div
            className="flex shrink-0 items-center justify-center lg:hidden"
            onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
            onTouchEnd={(e) => {
              if (touchY.current == null) return
              const dy = e.changedTouches[0].clientY - touchY.current
              if (dy < -30) monter()
              else if (dy > 30) descendre()
              touchY.current = null
            }}
          >
            <button
              onClick={() => setCran((c) => (c === 'plein' ? 'apercu' : c === 'apercu' ? 'moitie' : 'plein'))}
              className="flex h-9 w-full flex-col items-center justify-center gap-0.5 text-muted"
              aria-label={cran === 'plein' ? 'Réduire le panneau' : 'Agrandir le panneau'}
            >
              <span className="h-1.5 w-11 rounded-full bg-[#c5d3e2]" aria-hidden="true" />
              {cran === 'plein' ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
            </button>
          </div>

          <div
            ref={sheetScroll}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:gap-4 lg:px-0 lg:pb-2"
          >
            {selected ? (
              <Fiche
                p={selected}
                position={position}
                ordre={ordreDe(selected.id)}
                rapport={rapports.filter((r) => r.panneId === selected.id).at(-1)}
                onBack={() => setSelectedId(null)}
                onSimuler={() => setSimulee({ lat: selected.lat + 0.0002, lng: selected.lng + 0.0001 })}
                onRapport={() => setRapportPour(selected)}
                onPhoto={(photos, i) => setVisionneuse({ photos, i, legende: selected.scooterId })}
              />
            ) : surAccueil ? (
              <Briefing
                prenom={tech.prenom}
                aFaire={aFaire}
                faites={faites}
                calcul={calcul}
                loinDeParis={loinDeParis && !simulee}
                distanceParis={gps ? distanceKm(gps, PARIS) : 0}
                depuisDepot={depuisDepot}
                onDepuisDepot={setDepuisDepot}
                onStart={() => demarrer(position)}
                reprise={demarree && tournee!.length > 0 ? { num: numEtape, total: mesPannes.length } : undefined}
                onReprendre={() => setVue('etape')}
                onLogout={onLogout}
              />
            ) : etape && vue === 'etape' ? (
              <Etape
                p={etape}
                num={numEtape}
                total={mesPannes.length}
                faites={faites}
                position={position}
                origineGmaps={origineGmaps}
                restantes={tournee!.length}
                onSimuler={() => setSimulee({ lat: etape.lat + 0.0002, lng: etape.lng + 0.0001 })}
                onRapport={() => setRapportPour(etape)}
                onPasser={passer}
                onListe={() => {
                  setVue('liste')
                  if (!desktop) setCran('plein')
                }}
              />
            ) : etape ? (
              <ListeTournee
                tournee={tournee!}
                traitees={mesPannes.filter((p) => p.statut !== 'a_faire')}
                faites={faites}
                position={position}
                trace={trace}
                liensGmaps={googleMapsLiens(tournee!, origineGmaps)}
                onRetour={() => setVue('etape')}
                onOuvrir={ouvrirFiche}
                onRecalculer={() => demarrer(position)}
              />
            ) : (
              <Fin
                prenom={tech.prenom}
                mesPannes={mesPannes}
                rapports={rapports.filter((r) => r.technicienId === techId)}
                onOuvrir={ouvrirFiche}
                onLogout={onLogout}
              />
            )}
          </div>
        </aside>

        {toast && (
          <div
            role="status"
            className="anim-sheet pointer-events-none absolute top-14 left-1/2 z-[2000] flex w-[min(92%,420px)] -translate-x-1/2 items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-pop lg:top-6"
          >
            <CheckCircle2 size={18} className="shrink-0 text-[#7fe0c0]" aria-hidden="true" />
            {toast}
          </div>
        )}
      </main>

      {rapportPour && <ReportModal panne={rapportPour} onClose={() => setRapportPour(null)} onDone={apresRapport} />}
      {visionneuse && (
        <PhotoViewer
          photos={visionneuse.photos}
          index={visionneuse.i}
          legende={visionneuse.legende}
          onIndex={(i) => setVisionneuse((v) => v && { ...v, i })}
          onClose={() => setVisionneuse(null)}
        />
      )}
    </div>
  )
}

/* ─────────────── Écrans du panneau ─────────────── */

function Progression({ faites, total }: { faites: number; total: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < faites ? 'bg-ok' : i === faites ? 'bg-blue' : 'bg-blue-50'}`} />
      ))}
    </div>
  )
}

function Briefing({
  prenom,
  aFaire,
  faites,
  calcul,
  loinDeParis,
  distanceParis,
  depuisDepot,
  onDepuisDepot,
  onStart,
  reprise,
  onReprendre,
  onLogout,
}: {
  prenom: string
  aFaire: Panne[]
  faites: number
  calcul: boolean
  loinDeParis: boolean
  distanceParis: number
  depuisDepot: boolean
  onDepuisDepot: (v: boolean) => void
  onStart: () => void
  reprise?: { num: number; total: number }
  onReprendre: () => void
  onLogout: () => void
}) {
  const urgentes = aFaire.filter((p) => p.urgence >= 4).length
  const top = [...aFaire].sort((a, b) => b.urgence - a.urgence).slice(0, 3)
  return (
    <div className="card p-5">
      <div>
        <div>
          <p className="eyebrow">Bonjour {prenom}</p>
          <h1 className="mt-1 text-2xl leading-tight font-extrabold">
            {aFaire.length ? (
              <>
                Tu as <span className="num text-blue">{aFaire.length}</span> panne{aFaire.length > 1 ? 's' : ''} à réparer aujourd’hui
              </>
            ) : (
              'Aucune panne à réparer aujourd’hui'
            )}
          </h1>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="À réparer" value={String(aFaire.length)} />
        <Stat label="Urgentes" value={String(urgentes)} />
        <Stat label="Déjà faites" value={String(faites)} />
      </dl>

      {top.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink-2">Les plus urgentes</p>
          <ul className="mt-2 grid gap-1.5">
            {top.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-soft px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <strong>{p.scooterId}</strong> · {p.type}
                </span>
                <UrgenceBadge u={p.urgence} compact />
              </li>
            ))}
          </ul>
        </div>
      )}

      {loinDeParis && (
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#fff6e6] px-3 py-2.5 text-sm text-[#6b4a00]">
          <span>
            Tu es à <strong className="num">{formatDistance(distanceParis)}</strong> de Paris. Partir du dépôt ?
          </span>
          <input type="checkbox" checked={depuisDepot} onChange={(e) => onDepuisDepot(e.target.checked)} className="h-5 w-5 shrink-0 accent-blue" />
        </label>
      )}

      {aFaire.length > 0 && (
        <>
          <button
            onClick={reprise ? onReprendre : onStart}
            disabled={calcul}
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue text-lg font-bold text-white shadow-[0_10px_24px_rgba(22,100,192,.35)] transition-colors hover:bg-[#1257a8] disabled:opacity-60"
          >
            <Play size={20} fill="currentColor" aria-hidden="true" />
            {calcul ? 'Calcul de la tournée…' : reprise ? `Reprendre · étape ${reprise.num}/${reprise.total}` : 'Démarrer ma tournée'}
          </button>
          {reprise ? (
            <button onClick={onStart} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-blue hover:bg-blue-50">
              Recalculer l’ordre depuis ma position
            </button>
          ) : (
            <p className="mt-2 text-center text-xs text-muted">L’ordre est calculé selon l’urgence et la proximité des scooters.</p>
          )}
        </>
      )}

      <button
        onClick={onLogout}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-ink-2 hover:bg-bg"
      >
        <LogOut size={16} aria-hidden="true" /> Changer de technicien
      </button>
    </div>
  )
}

function Etape({
  p,
  num,
  total,
  faites,
  position,
  origineGmaps,
  restantes,
  onSimuler,
  onRapport,
  onPasser,
  onListe,
}: {
  p: Panne
  num: number
  total: number
  faites: number
  position: LatLng
  origineGmaps?: LatLng
  restantes: number
  onSimuler: () => void
  onRapport: () => void
  onPasser: () => void
  onListe: () => void
}) {
  const d = distanceKm(position, p)
  const surPlace = d <= SEUIL_SUR_PLACE_KM
  const itineraire = googleMapsLiens([p], origineGmaps)[0].url

  const Pas = ({ n, fait, actif, titre, children }: { n: number; fait: boolean; actif: boolean; titre: string; children?: ReactNode }) => (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <span
        className={`num relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${
          fait ? 'bg-ok text-white' : actif ? 'bg-blue text-white' : 'bg-blue-50 text-muted'
        }`}
        aria-hidden="true"
      >
        {fait ? <Check size={16} strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className={`font-semibold ${actif || fait ? 'text-ink' : 'text-muted'}`}>
          {titre}
          {fait && <span className="sr-only"> (fait)</span>}
        </p>
        {children}
      </div>
    </li>
  )

  return (
    <div className="card anim-sheet p-4 lg:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">
          Étape <span className="num">{num}</span> sur <span className="num">{total}</span>
        </p>
        <button onClick={onListe} className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-blue hover:bg-blue-50">
          <ListOrdered size={16} aria-hidden="true" /> Toute la tournée
        </button>
      </div>
      <Progression faites={faites} total={total} />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl leading-none font-extrabold">{p.scooterId}</h2>
          <p className="mt-1.5 text-sm text-muted">
            {p.quartier} · {p.cp} Paris · <span className="num font-semibold text-ink-2">{formatDistance(d)}</span>
          </p>
        </div>
        <UrgenceBadge u={p.urgence} />
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-soft px-3 py-2.5 text-sm text-ink-2">
        <Wrench size={16} className="mt-0.5 shrink-0 text-blue" aria-hidden="true" />
        <span>
          <strong className="text-ink">{p.type}.</strong> {p.description}
        </span>
      </p>

      <ol className="relative mt-5 before:absolute before:top-4 before:bottom-4 before:left-4 before:w-0.5 before:bg-blue-50" aria-label="Marche à suivre">
        <Pas n={1} fait={surPlace} actif={!surPlace} titre="Aller jusqu’au scooter">
          {!surPlace && (
            <>
              <a
                href={itineraire}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue font-semibold text-white transition-colors hover:bg-[#1257a8]"
              >
                <Navigation size={18} aria-hidden="true" /> Itinéraire Google Maps
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <button onClick={onSimuler} className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-blue-2 text-sm font-semibold text-blue hover:bg-blue-50">
                Mode démo : simuler mon arrivée
              </button>
            </>
          )}
          {surPlace && <p className="text-sm text-[#1f6e55]">Tu es sur place.</p>}
        </Pas>
        <Pas n={2} fait={false} actif={surPlace} titre="Réparer">
          <p className="text-sm text-muted">{p.action}</p>
        </Pas>
        <Pas n={3} fait={false} actif={surPlace} titre="Faire mon rapport">
          <button
            onClick={onRapport}
            disabled={!surPlace}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue font-semibold text-white transition-colors hover:bg-[#1257a8] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            <ClipboardCheck size={18} aria-hidden="true" /> Faire mon rapport
          </button>
          {!surPlace && <p className="mt-1.5 text-xs text-muted">Disponible une fois à moins de 50 m du scooter.</p>}
        </Pas>
      </ol>

      {restantes > 1 && (
        <button onClick={onPasser} className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-bg">
          <SkipForward size={16} aria-hidden="true" /> Passer, je le ferai plus tard
        </button>
      )}
    </div>
  )
}

function ListeTournee({
  tournee,
  traitees,
  faites,
  position,
  trace,
  liensGmaps,
  onRetour,
  onOuvrir,
  onRecalculer,
}: {
  tournee: Panne[]
  traitees: Panne[]
  faites: number
  position: LatLng
  trace: Trace | null
  liensGmaps: { label: string; url: string }[]
  onRetour: () => void
  onOuvrir: (p: Panne) => void
  onRecalculer: () => void
}) {
  return (
    <>
      <div className="card p-4 lg:p-5">
        <button onClick={onRetour} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-blue hover:bg-blue-50">
          <ArrowLeft size={16} aria-hidden="true" /> Revenir à l’étape en cours
        </button>
        <h2 className="mt-1 text-2xl font-bold">Ma tournée</h2>
        {trace && (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Restantes" value={String(tournee.length)} />
            <Stat label="Distance" value={formatDistance(trace.km)} />
            <Stat label="Durée est." value={formatDuree(trace.minutes)} />
          </dl>
        )}
        <div className="mt-3 grid gap-2">
          {liensGmaps.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-blue bg-white font-semibold text-blue hover:bg-blue-50"
            >
              <Navigation size={18} aria-hidden="true" /> Toute la tournée dans Google Maps{l.label ? ` (${l.label})` : ''}
            </a>
          ))}
          <button onClick={onRecalculer} className="min-h-11 rounded-xl text-sm font-semibold text-muted hover:bg-bg">
            Recalculer l’ordre depuis ma position
          </button>
        </div>
      </div>
      <section className="card p-2" aria-labelledby="todo-title">
        <h2 id="todo-title" className="eyebrow px-3 pt-3 pb-2">
          Ordre de passage
        </h2>
        <ol className="grid gap-1">
          {tournee.map((p, i) => (
            <li key={p.id}>
              <LigneIntervention p={p} index={faites + i + 1} position={position} onClick={() => onOuvrir(p)} />
            </li>
          ))}
        </ol>
      </section>
      {traitees.length > 0 && (
        <section className="card p-2" aria-labelledby="done-title">
          <h2 id="done-title" className="eyebrow px-3 pt-3 pb-2">
            Déjà traitées
          </h2>
          <ul className="grid gap-1">
            {traitees.map((p) => (
              <li key={p.id}>
                <LigneIntervention p={p} position={position} onClick={() => onOuvrir(p)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function Fin({
  prenom,
  mesPannes,
  rapports,
  onOuvrir,
  onLogout,
}: {
  prenom: string
  mesPannes: Panne[]
  rapports: Rapport[]
  onOuvrir: (p: Panne) => void
  onLogout: () => void
}) {
  const ok = mesPannes.filter((p) => p.statut === 'repare').length
  const pb = mesPannes.filter((p) => p.statut === 'probleme').length
  return (
    <>
      <div className="card anim-sheet p-5 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e7f6f0] text-ok" aria-hidden="true">
          <PartyPopper size={30} />
        </span>
        <h2 className="mt-3 text-2xl font-extrabold">Tournée terminée, bravo {prenom} !</h2>
        <p className="mt-1 text-muted">Tous tes rapports sont remontés au chef des opérations.</p>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Réparées" value={String(ok)} />
          <Stat label="Problèmes" value={String(pb)} />
          <Stat label="Rapports" value={String(rapports.length)} />
        </dl>
        <button onClick={onLogout} className="mt-4 min-h-11 w-full rounded-xl border border-line font-semibold text-ink-2 hover:bg-bg">
          Se déconnecter
        </button>
      </div>
      <section className="card p-2" aria-labelledby="done-title">
        <h2 id="done-title" className="eyebrow px-3 pt-3 pb-2">
          Mes interventions
        </h2>
        <ul className="grid gap-1">
          {mesPannes.map((p) => (
            <li key={p.id}>
              <LigneIntervention p={p} onClick={() => onOuvrir(p)} />
            </li>
          ))}
        </ul>
      </section>
    </>
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

function LigneIntervention({ p, index, position, onClick }: { p: Panne; index?: number; position?: LatLng; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-soft active:bg-blue-50">
      {index != null ? (
        <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white">{index}</span>
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
        {position && <span className="num text-xs text-muted">{formatDistance(distanceKm(position, p))}</span>}
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
  onPhoto,
}: {
  p: Panne
  position: LatLng
  ordre?: number
  rapport?: Rapport
  onBack: () => void
  onSimuler: () => void
  onRapport: () => void
  onPhoto: (photos: string[], i: number) => void
}) {
  const d = distanceKm(position, p)
  const surPlace = d <= SEUIL_SUR_PLACE_KM
  const Batt = p.batterie < 20 ? BatteryLow : BatteryMedium
  const yAller = googleMapsLiens([p])[0].url
  return (
    <div className="card anim-sheet p-4 lg:p-5">
      <button onClick={onBack} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-blue hover:bg-blue-50">
        <ArrowLeft size={16} aria-hidden="true" /> Retour à la tournée
      </button>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{ordre ? `Étape ${ordre} · ` : ''}Fiche panne</p>
          <h2 className="mt-1 text-2xl font-bold lg:text-3xl">{p.scooterId}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {p.quartier} · {p.cp} Paris
          </p>
        </div>
        {p.statut === 'a_faire' ? <UrgenceBadge u={p.urgence} /> : <StatutBadge s={p.statut} />}
      </div>

      {p.statut === 'a_faire' && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={onRapport}
            disabled={!surPlace}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue font-semibold text-white transition-colors hover:bg-[#1257a8] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            <ClipboardCheck size={18} aria-hidden="true" /> Faire mon rapport
          </button>
          <a
            href={yAller}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-blue px-4 font-semibold text-blue hover:bg-blue-50"
          >
            <Navigation size={17} aria-hidden="true" /> Y aller
          </a>
        </div>
      )}
      {p.statut === 'a_faire' &&
        (surPlace ? (
          <p className="mt-2 flex items-center gap-2 rounded-xl bg-[#e7f6f0] px-3 py-2.5 text-sm font-semibold text-[#1f6e55]">
            <LocateFixed size={16} aria-hidden="true" /> Tu es sur place, tu peux faire ton rapport.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">Le rapport se débloque à moins de 50 m du scooter (tu es à {formatDistance(d)}).</p>
            <button
              onClick={onSimuler}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-2 text-sm font-semibold text-blue hover:bg-blue-50"
            >
              <LocateFixed size={16} aria-hidden="true" /> Mode démo : simuler mon arrivée
            </button>
          </>
        ))}

      <div className="mt-3 rounded-2xl bg-soft p-4">
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

      {p.statut !== 'a_faire' && rapport && (
        <div className="mt-3 rounded-2xl border border-line p-4 text-sm">
          <p className="num text-xs font-semibold text-muted">
            {rapport.reference} · {heure(rapport.date)}
          </p>
          <p className="mt-1 font-semibold">{rapport.titre}</p>
          {rapport.categorie && <p className="mt-1 text-xs font-bold text-critical">{rapport.categorie}</p>}
          {rapport.note && <p className="mt-1.5 leading-relaxed text-ink-2">« {rapport.note} »</p>}
          {rapport.photos?.length ? (
            <div className="mt-3">
              <Miniatures photos={rapport.photos} onOpen={(i) => onPhoto(rapport.photos!, i)} />
            </div>
          ) : null}
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
