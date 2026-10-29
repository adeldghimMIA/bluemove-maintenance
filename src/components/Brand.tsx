import { Link, NavLink } from 'react-router-dom'
import { LayoutDashboard, Smartphone, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'

/** Vrai quand l'app tourne dans la maquette de téléphone (iframe de /telephone). */
export const DANS_MAQUETTE = typeof window !== 'undefined' && window.self !== window.top

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-xl" aria-label="BlueMove, accueil">
      <img
        src="/logo-mark.png"
        alt=""
        width={size * 2}
        height={size}
        className="object-contain"
        style={{ height: size, width: 'auto' }}
      />
      <span className="font-display text-xl leading-none font-extrabold tracking-tight sm:text-[22px]">
        <span className="text-blue">Blue</span>
        <span className="text-ink">Move</span>
      </span>
    </Link>
  )
}

export function Header({ children }: { children?: ReactNode }) {
  const tab = ({ isActive }: { isActive: boolean }, display = 'inline-flex') =>
    `${display} min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors sm:px-4 ${
      isActive ? 'bg-blue text-white' : 'text-ink-2 hover:bg-blue-50'
    }`
  return (
    <header className="sticky top-0 z-[1000] border-b border-line/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-6 sm:py-2">
        <Logo size={32} />
        <nav className="ml-auto flex items-center gap-1" aria-label="Vues">
          <NavLink to="/technicien" className={tab} aria-label="Vue technicien">
            <Wrench size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Technicien</span>
          </NavLink>
          <NavLink to="/dashboard" className={tab} aria-label="Vue opérations">
            <LayoutDashboard size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Opérations</span>
          </NavLink>
          {!DANS_MAQUETTE && (
            <NavLink to="/telephone" className={(s) => tab(s, 'hidden md:inline-flex')} aria-label="Vue téléphone">
              <Smartphone size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Vue téléphone</span>
            </NavLink>
          )}
        </nav>
        {children}
      </div>
    </header>
  )
}
