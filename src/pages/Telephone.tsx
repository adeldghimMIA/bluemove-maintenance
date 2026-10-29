import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { BatteryFull, LayoutDashboard, RotateCw, Signal, Wifi, Wrench } from 'lucide-react'
import { Header } from '../components/Brand'

const ECRAN = { w: 390, h: 844 }
const BORD = 14
const BARRE_ETAT = 47

const VUES = [
  { path: '/technicien', label: 'Technicien', icon: Wrench },
  { path: '/dashboard', label: 'Opérations', icon: LayoutDashboard },
] as const

/** Maquette d'iPhone qui affiche l'app en taille réelle de téléphone (390 × 844). */
export default function Telephone() {
  const [vue, setVue] = useState<(typeof VUES)[number]['path']>('/technicien')
  const [cle, setCle] = useState(0)
  const [echelle, setEchelle] = useState(1)
  const [qr, setQr] = useState<string | null>(null)
  const zone = useRef<HTMLDivElement>(null)
  const urlApp = `${window.location.origin}/technicien`
  const surVraiTelephone = window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1023px)').matches

  useEffect(() => {
    QRCode.toDataURL(urlApp, { margin: 1, width: 240, color: { dark: '#12304a', light: '#ffffff' } }).then(setQr, () => setQr(null))
  }, [urlApp])

  useEffect(() => {
    const el = zone.current
    if (!el) return
    const calc = () => {
      const h = el.clientHeight - 16
      setEchelle(Math.min(1, h / (ECRAN.h + BORD * 2)))
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (surVraiTelephone) return <Navigate to="/technicien" replace />

  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const largeur = (ECRAN.w + BORD * 2) * echelle
  const hauteur = (ECRAN.h + BORD * 2) * echelle

  return (
    <div className="flex h-[100dvh] flex-col">
      <Header retour={{ label: 'Retour à l’accueil', to: '/' }} />
      <main className="mx-auto grid min-h-0 w-full max-w-[1200px] flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-10 px-6 py-4">
        <section className="max-w-md">
          <p className="eyebrow">Vue téléphone</p>
          <h1 className="mt-1 text-4xl font-extrabold">L’app dans la poche du technicien</h1>
          <p className="mt-3 leading-relaxed text-muted">
            BlueMove est pensée d’abord pour le téléphone : carte plein écran, panneau à faire glisser avec le pouce, rapport en deux
            gestes avec dictée et photo. La maquette ci-contre affiche l’app réelle à la taille d’un iPhone.
          </p>

          <div className="mt-6 inline-flex rounded-full border border-line bg-white p-1 shadow-card" role="group" aria-label="Écran affiché dans le téléphone">
            {VUES.map((v) => (
              <button
                key={v.path}
                onClick={() => setVue(v.path)}
                aria-pressed={vue === v.path}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  vue === v.path ? 'bg-blue text-white' : 'text-ink-2 hover:bg-blue-50'
                }`}
              >
                <v.icon size={16} aria-hidden="true" />
                {v.label}
              </button>
            ))}
            <button
              onClick={() => setCle((k) => k + 1)}
              className="ml-1 grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-blue-50"
              aria-label="Recharger l’app dans le téléphone"
            >
              <RotateCw size={16} />
            </button>
          </div>

          <div className="card mt-8 flex items-center gap-5 p-5">
            {qr ? (
              <img src={qr} alt="QR code pour ouvrir BlueMove sur ton téléphone" width={120} height={120} className="rounded-lg" />
            ) : (
              <div className="h-[120px] w-[120px] rounded-lg bg-bg" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-display text-lg font-bold">Teste sur ton vrai téléphone</p>
              <p className="mt-1 text-sm text-muted">Scanne le QR code : la géolocalisation, la caméra et le micro fonctionnent pour de vrai.</p>
              <a href={urlApp} className="mt-2 block truncate text-sm font-semibold text-blue underline-offset-2 hover:underline">
                {urlApp.replace(/^https?:\/\//, '')}
              </a>
            </div>
          </div>
        </section>

        <div ref={zone} className="flex h-full min-h-0 items-center justify-center">
          <div style={{ width: largeur, height: hauteur }}>
            <div
              className="relative rounded-[62px] bg-[#0f1b2a] shadow-[0_40px_80px_rgba(18,48,74,.35),inset_0_0_0_2px_#2b3b4f]"
              style={{ width: ECRAN.w + BORD * 2, height: ECRAN.h + BORD * 2, padding: BORD, transform: `scale(${echelle})`, transformOrigin: 'top left' }}
            >
              {/* Boutons latéraux */}
              <span className="absolute top-[170px] -left-[3px] h-16 w-[3px] rounded-l bg-[#2b3b4f]" aria-hidden="true" />
              <span className="absolute top-[250px] -left-[3px] h-16 w-[3px] rounded-l bg-[#2b3b4f]" aria-hidden="true" />
              <span className="absolute top-[210px] -right-[3px] h-24 w-[3px] rounded-r bg-[#2b3b4f]" aria-hidden="true" />

              <div className="relative h-full w-full overflow-hidden rounded-[48px] bg-white">
                <div className="relative z-10 flex items-center justify-between bg-white px-8 text-[15px] font-semibold text-ink" style={{ height: BARRE_ETAT }}>
                  <span className="num pt-1">{now}</span>
                  <span className="absolute top-[11px] left-1/2 h-[30px] w-[120px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
                  <span className="flex items-center gap-1.5 pt-1" aria-hidden="true">
                    <Signal size={16} />
                    <Wifi size={16} />
                    <BatteryFull size={20} />
                  </span>
                </div>
                <iframe
                  key={`${vue}-${cle}`}
                  src={vue}
                  title={`BlueMove sur téléphone, vue ${vue === '/technicien' ? 'technicien' : 'opérations'}`}
                  allow="geolocation; microphone; camera"
                  className="block border-0"
                  style={{ width: ECRAN.w, height: ECRAN.h - BARRE_ETAT }}
                />
                <span className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/80" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
