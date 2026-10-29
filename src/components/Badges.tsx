import type { Statut, Urgence } from '../data/types'
import { STATUT, URGENCE } from '../lib/ui'

export function UrgenceBadge({ u, compact = false }: { u: Urgence; compact?: boolean }) {
  const c = URGENCE[u]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ background: c.color, color: c.text }}
    >
      <span className="num">U{u}</span>
      {!compact && <span>· {c.label}</span>}
    </span>
  )
}

export function StatutBadge({ s }: { s: Statut }) {
  const c = STATUT[s]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold"
      style={{ borderColor: c.color, color: c.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
      {c.label}
    </span>
  )
}
