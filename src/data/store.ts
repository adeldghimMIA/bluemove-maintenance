import { useSyncExternalStore } from 'react'
import { buildSeed, referenceRapport } from './seed'
import type { Panne, Rapport } from './types'

const KEY = 'bluemove.maintenance.v2'
const EVENT = 'bluemove:change'

export interface State {
  pannes: Panne[]
  rapports: Rapport[]
}

let cache: State | null = null

function load(): State {
  try {
    localStorage.removeItem('bluemove.maintenance.v1')
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    /* stockage indisponible : on repart du seed */
  }
  const seed = buildSeed()
  save(seed)
  return seed
}

/** Renvoie false si le navigateur refuse l'écriture (quota dépassé, souvent à cause des photos). */
function save(state: State): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

function getState(): State {
  if (!cache) cache = load()
  return cache
}

function setState(next: State) {
  cache = next
  save(next)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null
      cb()
    }
  }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState)
}

export type NouveauRapport = Omit<Rapport, 'id' | 'date' | 'reference'>

/** Enregistre le rapport. Renvoie false si le stockage est plein (rien n'est modifié dans ce cas). */
export function addRapport(r: NouveauRapport): boolean {
  const s = getState()
  const panne = s.pannes.find((p) => p.id === r.panneId)
  const date = new Date().toISOString()
  const rapport: Rapport = {
    ...r,
    id: `R-${Date.now()}`,
    date,
    reference: referenceRapport(panne?.scooterId ?? r.panneId, date),
  }
  const next: State = {
    rapports: [...s.rapports, rapport],
    pannes: s.pannes.map((p) => (p.id === r.panneId ? { ...p, statut: r.statut } : p)),
  }
  if (!save(next)) {
    // Mode privé sans stockage : on garde l'état en mémoire si rien n'était persisté
    try {
      if (localStorage.getItem(KEY)) return false
    } catch {
      /* stockage inaccessible */
    }
  }
  cache = next
  window.dispatchEvent(new Event(EVENT))
  return true
}

export function resetDemo() {
  setState(buildSeed())
}
