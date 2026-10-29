import type { LatLng, Panne } from '../data/types'

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Poids d'attraction : une urgence 5 « attire » 3,4× plus qu'une urgence 1. */
export const poids = (u: number) => 1 + 0.6 * (u - 1)

/** Pénalité de retard : chaque km parcouru avant d'atteindre une panne coûte selon son urgence. */
const RETARD = 0.15

/**
 * Coût d'une tournée = distance totale + RETARD × Σ (urgence − 1) × km parcourus avant d'arriver.
 * On cherche donc un trajet court, mais qui atteint vite les pannes urgentes.
 */
function cout(start: LatLng, tour: Panne[]): number {
  let km = 0
  let retard = 0
  let prev = start
  for (const p of tour) {
    km += distanceKm(prev, p)
    retard += (p.urgence - 1) * km
    prev = p
  }
  return km + RETARD * retard
}

function glouton(start: LatLng, pannes: Panne[]): Panne[] {
  const restantes = [...pannes]
  const tour: Panne[] = []
  let pos = start
  while (restantes.length) {
    let best = 0
    let bestScore = Infinity
    restantes.forEach((p, i) => {
      const s = distanceKm(pos, p) / poids(p.urgence)
      if (s < bestScore) {
        bestScore = s
        best = i
      }
    })
    const [p] = restantes.splice(best, 1)
    tour.push(p)
    pos = p
  }
  return tour
}

function deuxOpt(start: LatLng, tour: Panne[]): Panne[] {
  let best = tour
  let bestCost = cout(start, best)
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)]
        const c = cout(start, cand)
        if (c < bestCost - 1e-9) {
          best = cand
          bestCost = c
          improved = true
        }
      }
    }
  }
  return best
}

/** Urgences 5 d'abord (ordonnées entre elles), puis le reste optimisé depuis la dernière urgence 5. */
export function optimiserTournee(start: LatLng, pannes: Panne[]): Panne[] {
  const critiques = pannes.filter((p) => p.urgence === 5)
  const autres = pannes.filter((p) => p.urgence !== 5)
  const t1 = deuxOpt(start, glouton(start, critiques))
  const relais = t1.length ? t1[t1.length - 1] : start
  const t2 = deuxOpt(relais, glouton(relais, autres))
  return [...t1, ...t2]
}

export interface Trace {
  points: [number, number][]
  km: number
  minutes: number
  source: 'osrm' | 'estimation'
}

const MIN_PAR_INTERVENTION = 20

export async function tracer(start: LatLng, tour: Panne[]): Promise<Trace> {
  const etapes = [start, ...tour]
  const intervention = tour.length * MIN_PAR_INTERVENTION
  try {
    const coords = etapes.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: ctrl.signal },
    )
    clearTimeout(timer)
    const json = await res.json()
    const r = json.routes?.[0]
    if (!r) throw new Error('pas de route')
    return {
      points: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      km: r.distance / 1000,
      minutes: Math.round(r.duration / 60) + intervention,
      source: 'osrm',
    }
  } catch {
    let km = 0
    for (let i = 1; i < etapes.length; i++) km += distanceKm(etapes[i - 1], etapes[i])
    km *= 1.3 // facteur de détour en ville
    return {
      points: etapes.map((p) => [p.lat, p.lng]),
      km,
      minutes: Math.round((km / 18) * 60) + intervention,
      source: 'estimation',
    }
  }
}

export function formatDuree(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

const GMAPS_MAX_ETAPES = 9

/**
 * Liens Google Maps pour la tournée. Google accepte 9 étapes intermédiaires : au-delà, on découpe en tronçons.
 * Sans `depart`, Google Maps part de la position actuelle du téléphone.
 */
export function googleMapsLiens(tour: LatLng[], depart?: LatLng): { label: string; url: string }[] {
  const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
  const liens: { label: string; url: string }[] = []
  const parTroncon = GMAPS_MAX_ETAPES + 1
  for (let i = 0; i < tour.length; i += parTroncon) {
    const morceau = tour.slice(i, i + parTroncon)
    const origine = i === 0 ? depart : tour[i - 1]
    const params = new URLSearchParams({ api: '1', destination: fmt(morceau[morceau.length - 1]), travelmode: 'driving' })
    if (origine) params.set('origin', fmt(origine))
    if (morceau.length > 1) params.set('waypoints', morceau.slice(0, -1).map(fmt).join('|'))
    const fin = Math.min(i + parTroncon, tour.length)
    liens.push({
      label: tour.length > parTroncon ? `étapes ${i + 1} à ${fin}` : '',
      url: `https://www.google.com/maps/dir/?${params.toString()}`,
    })
  }
  return liens
}
