import L from 'leaflet'
import type { Panne, Statut, Urgence } from '../data/types'

export const URGENCE: Record<Urgence, { label: string; color: string; text: string }> = {
  1: { label: 'Faible', color: '#43aa8b', text: '#ffffff' },
  2: { label: 'Modérée', color: '#8cc63f', text: '#1d3a08' },
  3: { label: 'Moyenne', color: '#f6c445', text: '#5e4a00' },
  4: { label: 'Élevée', color: '#f4a261', text: '#5a2a00' },
  5: { label: 'Critique', color: '#e63946', text: '#ffffff' },
}

export const STATUT: Record<Statut, { label: string; color: string }> = {
  a_faire: { label: 'À faire', color: '#1664c0' },
  repare: { label: 'Réparé', color: '#43aa8b' },
  probleme: { label: 'Problème', color: '#e63946' },
}

export const PARIS_CENTER: [number, number] = [48.8584, 2.3376]

export const TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}

/** Marqueur goutte : couleur + chiffre d'urgence (jamais la couleur seule). */
export function pinIcon(p: Panne, opts: { ordre?: number; selected?: boolean } = {}): L.DivIcon {
  const u = URGENCE[p.urgence]
  const done = p.statut !== 'a_faire'
  const fill = done ? '#ffffff' : u.color
  const stroke = done ? (p.statut === 'repare' ? '#43aa8b' : '#e63946') : '#ffffff'
  const glyph =
    p.statut === 'repare'
      ? '<path d="M12.5 17.5l3 3 6-6.5" fill="none" stroke="#43aa8b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
      : p.statut === 'probleme'
        ? '<text x="17" y="22.5" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="15" fill="#e63946">!</text>'
        : `<text x="17" y="22.5" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="14" fill="${u.text}">${p.urgence}</text>`
  const ordre =
    opts.ordre != null
      ? `<span style="position:absolute;top:-6px;right:-8px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#12304a;color:#fff;font:700 11px/20px Outfit,sans-serif;text-align:center;border:2px solid #fff">${opts.ordre}</span>`
      : ''
  const html = `<div class="pin ${opts.selected ? 'pin-selected' : ''}" style="position:relative;width:34px;height:44px;opacity:${done && !opts.selected ? 0.85 : 1}">
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true" style="filter:drop-shadow(0 4px 6px rgba(18,48,74,.28))">
      <path d="M17 1.5C8.7 1.5 2 8.1 2 16.3c0 10.6 12.4 24.3 14 26a1.4 1.4 0 0 0 2 0c1.6-1.7 14-15.4 14-26C32 8.1 25.3 1.5 17 1.5z" fill="${fill}" stroke="${opts.selected ? '#12304a' : stroke}" stroke-width="${opts.selected ? 3 : 2.5}"/>
      ${glyph}
    </svg>${ordre}</div>`
  return L.divIcon({ html, className: '', iconSize: [34, 44], iconAnchor: [17, 43], popupAnchor: [0, -40] })
}

export const meIcon = L.divIcon({ html: '<div class="me-dot"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] })

export const depotIcon = L.divIcon({
  html: `<div style="width:30px;height:30px;border-radius:10px;background:#12304a;border:3px solid #fff;box-shadow:0 4px 10px rgba(18,48,74,.3);display:grid;place-items:center">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-6 9 6v10H3z"/><path d="M9 20v-6h6v6"/></svg></div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

export function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
