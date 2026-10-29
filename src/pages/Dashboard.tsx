import { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip as MapTooltip } from 'react-leaflet'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Camera, CheckCircle2, CircleDashed, Mic, RotateCcw, Siren, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Header } from '../components/Brand'
import { StatutBadge, UrgenceBadge } from '../components/Badges'
import { Miniatures, PhotoViewer } from '../components/PhotoViewer'
import { FitBounds, InvalidateOnResize } from '../components/MapBits'
import { TECHNICIENS } from '../data/seed'
import { resetDemo, useStore } from '../data/store'
import type { Urgence } from '../data/types'
import { heure, PARIS_CENTER, pinIcon, TILES, URGENCE } from '../lib/ui'

// Palette validée (dataviz validate_palette.js : CVD ΔE 8,3, contraste ≥ 3:1)
const C = { repare: '#2f9a7a', probleme: '#e63946', a_faire: '#3a86ff' }
const SERIES = [
  { key: 'repare', label: 'Réparé', color: C.repare },
  { key: 'probleme', label: 'Problème', color: C.probleme },
  { key: 'a_faire', label: 'À faire', color: C.a_faire },
] as const

export default function Dashboard() {
  const { pannes, rapports } = useStore()
  const [visionneuse, setVisionneuse] = useState<{ photos: string[]; i: number; legende: string } | null>(null)

  const kpi = useMemo(() => {
    const repare = pannes.filter((p) => p.statut === 'repare').length
    const probleme = pannes.filter((p) => p.statut === 'probleme').length
    const aFaire = pannes.length - repare - probleme
    const critiques = pannes.filter((p) => p.statut === 'a_faire' && p.urgence === 5).length
    return { total: pannes.length, repare, probleme, aFaire, critiques, taux: Math.round(((repare + probleme) / Math.max(1, pannes.length)) * 100) }
  }, [pannes])

  const parTech = useMemo(
    () =>
      TECHNICIENS.map((t) => {
        const mine = pannes.filter((p) => p.technicienId === t.id)
        const repare = mine.filter((p) => p.statut === 'repare').length
        const probleme = mine.filter((p) => p.statut === 'probleme').length
        const derniers = rapports.filter((r) => r.technicienId === t.id)
        return {
          nom: t.prenom,
          zone: t.zone,
          total: mine.length,
          repare,
          probleme,
          a_faire: mine.length - repare - probleme,
          dernier: derniers.length ? heure(derniers.map((r) => r.date).sort().at(-1)!) : "—",
        }
      }),
    [pannes, rapports],
  )

  const parType = useMemo(() => {
    const m = new Map<string, number>()
    pannes.forEach((p) => m.set(p.type, (m.get(p.type) ?? 0) + 1))
    return [...m.entries()].map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n)
  }, [pannes])

  const parUrgence = useMemo(
    () =>
      ([5, 4, 3, 2, 1] as Urgence[]).map((u) => {
        const l = pannes.filter((p) => p.urgence === u)
        return { u, label: `U${u}`, restantes: l.filter((p) => p.statut === 'a_faire').length, total: l.length }
      }),
    [pannes],
  )

  const problemes = rapports
    .filter((r) => r.statut === 'probleme')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => ({ r, p: pannes.find((p) => p.id === r.panneId)!, t: TECHNICIENS.find((t) => t.id === r.technicienId)! }))

  const derniers = [...rapports]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 9)
    .map((r) => ({ r, p: pannes.find((p) => p.id === r.panneId)!, t: TECHNICIENS.find((t) => t.id === r.technicienId)! }))

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-full">
      <Header retour={{ label: 'Retour à l’accueil', to: '/' }} />
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow capitalize">{today}</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Pilotage de la maintenance</h1>
            <p className="mt-1.5 max-w-2xl text-muted">
              Vue globale de la journée : avancement des techniciens, pannes restantes et problèmes remontés du terrain.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold whitespace-nowrap text-blue">
              <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
              Synchronisé · {rapports.length ? heure(rapports.map((r) => r.date).sort().at(-1)!) : "—"}
            </span>
            <button
              onClick={() => confirm('Réinitialiser toutes les données de la démo ?') && resetDemo()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold whitespace-nowrap text-ink-2 hover:bg-bg"
            >
              <RotateCcw size={15} aria-hidden="true" /> Réinitialiser la démo
            </button>
          </div>
        </div>

        {/* KPI */}
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Indicateurs du jour">
          <Kpi label="Pannes du jour" value={kpi.total} hint={`${TECHNICIENS.length} techniciens sur le terrain`} />
          <Kpi label="Réparées" value={kpi.repare} hint="Remises en service" icon={<CheckCircle2 size={16} />} color={C.repare} />
          <Kpi label="Avec problème" value={kpi.probleme} hint="À replanifier" icon={<TriangleAlert size={16} />} color={C.probleme} />
          <Kpi label="Restantes" value={kpi.aFaire} hint={`${kpi.taux} % de la journée traitée`} icon={<CircleDashed size={16} />} color={C.a_faire} />
          <Kpi
            label="Critiques en attente"
            value={kpi.critiques}
            hint="Urgence 5 non traitée"
            icon={<Siren size={16} />}
            color={kpi.critiques ? C.probleme : C.repare}
            className="col-span-2 lg:col-span-1"
          />
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
          {/* Avancement par technicien */}
          <section className="card p-5" aria-labelledby="tech-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="tech-title" className="text-lg font-bold">
                Avancement par technicien
              </h2>
              <Legend />
            </div>
            <div className="mt-3 h-56">
              <ResponsiveContainer>
                <BarChart data={parTech} layout="vertical" margin={{ left: 4, right: 16 }} barCategoryGap={14}>
                  <CartesianGrid horizontal={false} stroke="#e6eef7" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#5f7388', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nom" width={72} tick={{ fill: '#12304a', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TechTooltip />} cursor={{ fill: '#f4f9ff' }} />
                  {SERIES.map((s, i) => (
                    <Bar isAnimationActive={false}
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      stackId="a"
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth={2}
                      radius={i === SERIES.length - 1 ? [0, 4, 4, 0] : 0}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                    <th className="py-2 font-bold">Technicien</th>
                    <th className="py-2 font-bold">Zone</th>
                    <th className="py-2 text-right font-bold">Assignées</th>
                    <th className="py-2 text-right font-bold">Réparées</th>
                    <th className="py-2 text-right font-bold">Problèmes</th>
                    <th className="py-2 text-right font-bold">Avancement</th>
                    <th className="py-2 text-right font-bold">Dernier rapport</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {parTech.map((t) => {
                    const pct = Math.round(((t.repare + t.probleme) / Math.max(1, t.total)) * 100)
                    return (
                      <tr key={t.nom} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 font-semibold">{t.nom}</td>
                        <td className="py-2.5 text-muted">{t.zone}</td>
                        <td className="py-2.5 text-right">{t.total}</td>
                        <td className="py-2.5 text-right">{t.repare}</td>
                        <td className={`py-2.5 text-right ${t.probleme ? 'font-bold text-critical' : ''}`}>{t.probleme}</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-blue-50" aria-hidden="true">
                              <span className="block h-full rounded-full bg-blue" style={{ width: `${pct}%` }} />
                            </span>
                            {pct} %
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-muted">{t.dernier}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Problèmes remontés */}
          <section className="card flex flex-col p-5" aria-labelledby="pb-title">
            <div className="flex items-center justify-between">
              <h2 id="pb-title" className="text-lg font-bold">
                Problèmes remontés
              </h2>
              <span className="num rounded-full bg-[#fdecee] px-2.5 py-1 text-xs font-bold text-critical">{problemes.length}</span>
            </div>
            {problemes.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Aucun problème signalé aujourd’hui.</p>
            ) : (
              <ul className="mt-3 grid max-h-[460px] gap-3 overflow-y-auto pr-1">
                {problemes.map(({ r, p, t }) => (
                  <li key={r.id} className="rounded-2xl border border-line bg-[#fbfdff] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="num text-[11px] font-bold tracking-wide text-muted">{r.reference}</p>
                        <p className="mt-0.5 font-semibold">{r.titre}</p>
                        <p className="text-xs text-muted">
                          {p.scooterId} · {t.prenom} · {p.quartier} · {heure(r.date)}
                        </p>
                      </div>
                      <UrgenceBadge u={p.urgence} compact />
                    </div>
                    {r.categorie && (
                      <span className="mt-2 inline-flex rounded-full bg-[#fdecee] px-2.5 py-1 text-xs font-bold text-critical">{r.categorie}</span>
                    )}
                    {r.note && (
                      <p className="mt-2.5 flex gap-2 rounded-xl bg-soft p-3 text-sm leading-relaxed text-ink-2">
                        <Mic size={15} className="mt-0.5 shrink-0 text-blue" aria-label="Note dictée" />
                        {r.note}
                      </p>
                    )}
                    {r.photos?.length ? (
                      <div className="mt-3">
                        <Miniatures photos={r.photos} onOpen={(i) => setVisionneuse({ photos: r.photos!, i, legende: r.reference })} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card mt-4 p-5" aria-labelledby="feed-title">
          <div className="flex items-center justify-between">
            <h2 id="feed-title" className="text-lg font-bold">
              Derniers rapports
            </h2>
            <span className="num text-sm text-muted">{rapports.length} aujourd’hui</span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {derniers.map(({ r, p, t }) => (
              <li key={r.id} className="flex min-w-0 gap-3 rounded-2xl border border-line bg-[#fbfdff] p-3">
                {r.photos?.length ? (
                  <button
                    onClick={() => setVisionneuse({ photos: r.photos!, i: 0, legende: r.reference })}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line"
                    aria-label={`Voir les photos du rapport ${r.reference}`}
                  >
                    <img src={r.photos[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {r.photos.length > 1 && (
                      <span className="num absolute right-1 bottom-1 rounded-full bg-ink/80 px-1.5 text-[10px] font-bold text-white">+{r.photos.length - 1}</span>
                    )}
                  </button>
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-bg text-muted" aria-hidden="true">
                    <Camera size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="num truncate text-[11px] font-bold tracking-wide text-muted">{r.reference}</p>
                    <StatutBadge s={r.statut} />
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold">{r.titre}</p>
                  <p className="text-xs text-muted">
                    {t.prenom} · {p.scooterId} · {heure(r.date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
          <section className="card p-5" aria-labelledby="type-title">
            <h2 id="type-title" className="text-lg font-bold">
              Pannes par type
            </h2>
            <div className="mt-3 h-64">
              <ResponsiveContainer>
                <BarChart data={parType} layout="vertical" margin={{ left: 0, right: 24 }} barCategoryGap={6}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="type" width={150} tick={{ fill: '#28415e', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f4f9ff' }} formatter={(v) => [v, 'Pannes']} contentStyle={tooltipStyle} />
                  <Bar isAnimationActive={false}
 dataKey="n" fill="#1664c0" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#12304a', fontSize: 12, fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card p-5" aria-labelledby="urg-title">
            <h2 id="urg-title" className="text-lg font-bold">
              Restantes par urgence
            </h2>
            <p className="text-sm text-muted">Pannes non traitées, sur le total de chaque niveau</p>
            <div className="mt-3 h-56">
              <ResponsiveContainer>
                <BarChart data={parUrgence} margin={{ top: 20, left: -20, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="#e6eef7" />
                  <XAxis dataKey="label" tick={{ fill: '#12304a', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#5f7388', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f4f9ff' }}
                    contentStyle={tooltipStyle}
                    formatter={(v, _n, item) => [`${v} sur ${item.payload.total}`, URGENCE[item.payload.u as Urgence].label]}
                  />
                  <Bar isAnimationActive={false}
 dataKey="restantes" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#12304a', fontSize: 12, fontWeight: 600 }}>
                    {parUrgence.map((d) => (
                      <Cell key={d.u} fill={URGENCE[d.u].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card overflow-hidden" aria-labelledby="map-title">
            <h2 id="map-title" className="px-5 pt-5 text-lg font-bold">
              Carte de la flotte en panne
            </h2>
            <p className="px-5 text-sm text-muted">Coche verte : réparé · « ! » : problème · chiffre : urgence</p>
            <div className="mt-3 h-64">
              <MapContainer center={PARIS_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom={false}>
                <TileLayer url={TILES.url} attribution={TILES.attribution} />
                <InvalidateOnResize />
                <FitBounds points={pannes} k="all" />
                {pannes.map((p) => (
                  <Marker key={p.id + p.statut} position={[p.lat, p.lng]} icon={pinIcon(p)}>
                    <MapTooltip>
                      {p.scooterId} · {p.type} · {TECHNICIENS.find((t) => t.id === p.technicienId)?.prenom}
                    </MapTooltip>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </section>
        </div>
      </main>
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

const tooltipStyle = { borderRadius: 12, border: '1px solid #d9e3ee', boxShadow: '0 12px 30px rgba(21,45,77,.12)', fontSize: 13 }

function Legend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs font-semibold text-ink-2" aria-label="Légende">
      {SERIES.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

function TechTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-white p-3 text-sm shadow-pop">
      <p className="font-display font-bold">{label}</p>
      {payload.map((e) => (
        <p key={e.name} className="num mt-1 flex items-center gap-2 text-ink-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: e.color }} aria-hidden="true" />
          {e.name} <strong className="ml-auto pl-4 text-ink">{e.value}</strong>
        </p>
      ))}
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon,
  color,
  className = '',
}: {
  label: string
  value: number
  hint: string
  icon?: ReactNode
  color?: string
  className?: string
}) {
  return (
    <div className={`card p-4 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
        {icon && (
          <span style={{ color }} aria-hidden="true">
            {icon}
          </span>
        )}
        {label}
      </p>
      <p className="num mt-1 font-display text-4xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  )
}
