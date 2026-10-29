import { useSyncExternalStore } from 'react'
import { buildSeed } from './seed'
import type { Panne, Rapport } from './types'

const KEY = 'bluemove.maintenance.v1'
const EVENT = 'bluemove:change'

export interface State {
  pannes: Panne[]
  rapports: Rapport[]
}

let cache: State | null = null

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    /* stockage indisponible : on repart du seed */
  }
  const seed = buildSeed()
  save(seed)
  return seed
}

function save(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* mode privé : l'état reste en mémoire */
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

export function addRapport(r: Omit<Rapport, 'id' | 'date'>) {
  const s = getState()
  const rapport: Rapport = { ...r, id: `R-${Date.now()}`, date: new Date().toISOString() }
  setState({
    rapports: [...s.rapports, rapport],
    pannes: s.pannes.map((p) => (p.id === r.panneId ? { ...p, statut: r.statut } : p)),
  })
}

export function resetDemo() {
  setState(buildSeed())
}
