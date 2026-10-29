import { Link } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { useStore } from '../data/store'

export default function Home() {
  const { pannes } = useStore()
  const restantes = pannes.filter((p) => p.statut === 'a_faire').length

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <img src="/logo-mark.jpeg" alt="" className="w-64 mix-blend-multiply sm:w-80" />
        <h1 className="mt-2 font-display text-5xl font-extrabold">
          <span className="text-blue">Blue</span>
          <span className="text-ink">Move</span>
        </h1>
        <p className="mt-2 max-w-md text-muted">
          L’outil de maintenance de la flotte de scooters électriques en free floating à Paris.
        </p>
        <p className="num mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue">
          {restantes} scooters à réparer aujourd’hui
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <RoleCard
          to="/technicien"
          icon={<Wrench size={22} />}
          title="Je suis technicien"
          text="Ma carte du jour, mon itinéraire optimisé et mes rapports d’intervention."
        />
        <RoleCard
          to="/dashboard"
          icon={<LayoutDashboard size={22} />}
          title="Chef des opérations"
          text="Avancement des équipes, pannes restantes et problèmes remontés du terrain."
        />
      </div>
      <p className="mt-8 text-center text-xs text-muted">Prototype pédagogique · données fictives</p>
    </main>
  )
}

function RoleCard({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="card group flex items-start gap-4 p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-pop"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">
        <span className="flex items-center justify-between font-display text-xl font-bold">
          {title}
          <ArrowRight size={20} className="text-blue transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{text}</span>
      </span>
    </Link>
  )
}
