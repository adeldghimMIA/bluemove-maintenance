import { Link, NavLink } from 'react-router-dom'
import { LayoutDashboard, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-xl" aria-label="BlueMove, accueil">
      <img
        src="/logo-mark.png"
        alt=""
        width={size * 1.7}
        height={size}
        className="rounded-lg object-contain"
        style={{ height: size, width: 'auto' }}
      />
      <span className="font-display text-[22px] leading-none font-extrabold tracking-tight">
        <span className="text-blue">Blue</span>
        <span className="text-ink">Move</span>
      </span>
    </Link>
  )
}

export function Header({ children }: { children?: ReactNode }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
      isActive ? 'bg-blue text-white' : 'text-ink-2 hover:bg-blue-50'
    }`
  return (
    <header className="sticky top-0 z-[1000] border-b border-line/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
        <Logo size={36} />
        <nav className="ml-auto flex items-center gap-1" aria-label="Vues">
          <NavLink to="/technicien" className={tab}>
            <Wrench size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Technicien</span>
          </NavLink>
          <NavLink to="/dashboard" className={tab}>
            <LayoutDashboard size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Opérations</span>
          </NavLink>
        </nav>
        {children}
      </div>
    </header>
  )
}
