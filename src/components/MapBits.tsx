import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from '../data/types'

/** Recadre la carte quand la liste de points change (changement de technicien, etc.). */
export function FitBounds({ points, k }: { points: LatLng[]; k: string }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    const fit = () => {
      map.invalidateSize()
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 })
    }
    fit()
    const t = setTimeout(fit, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, map])
  return null
}

export function FlyTo({ target }: { target: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
  }, [target, map])
  return null
}

/** Leaflet calcule sa taille au montage : on le prévient quand le conteneur change. */
export function InvalidateOnResize() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}
