import { useEffect, useState } from 'react'

/** Écran d'ouverture : logo en grand, puis fondu vers l'application. */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1800)
    const t2 = setTimeout(onDone, 2200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div
      role="status"
      aria-label="Chargement de BlueMove"
      className={`fixed inset-0 z-[5000] grid place-items-center bg-white transition-opacity duration-400 ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex w-full max-w-xl flex-col items-center px-6">
        <img
          src="/logo-mark.jpeg"
          alt=""
          className="anim-ride w-[min(78vw,440px)] mix-blend-multiply"
        />
        <h1 className="anim-rise mt-4 font-display text-5xl font-extrabold sm:text-6xl" style={{ animationDelay: '.35s' }}>
          <span className="text-blue">Blue</span>
          <span className="text-ink">Move</span>
        </h1>
        <p className="anim-rise mt-2 text-muted" style={{ animationDelay: '.5s' }}>
          Maintenance terrain · Paris
        </p>
        <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-blue-50">
          <div className="anim-fill h-full rounded-full bg-gradient-to-r from-blue to-teal" style={{ animationDelay: '.3s' }} />
        </div>
      </div>
    </div>
  )
}
