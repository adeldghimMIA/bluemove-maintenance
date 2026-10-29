export type Urgence = 1 | 2 | 3 | 4 | 5
export type Statut = 'a_faire' | 'repare' | 'probleme'

export type TypePanne =
  | 'Batterie / alimentation'
  | 'Freinage'
  | 'Moteur / traction'
  | 'Roue / pneu'
  | 'Connectivité / IoT'
  | 'Guidon / verrouillage'
  | 'Éclairage'
  | 'Béquille'

export interface Technicien {
  id: string
  prenom: string
  nom: string
  zone: string
}

export interface Panne {
  id: string
  scooterId: string
  lat: number
  lng: number
  quartier: string
  arrondissement: string
  cp: string
  type: TypePanne
  description: string
  action: string
  urgence: Urgence
  batterie: number
  signaleIlYaH: number
  technicienId: string
  statut: Statut
}

export const CATEGORIES_PROBLEME = [
  'Pièce manquante',
  'Panne non résolue',
  'Scooter à rapatrier',
  'Vandalisme',
  'Autre',
] as const
export type CategorieProbleme = (typeof CATEGORIES_PROBLEME)[number]

export interface Rapport {
  id: string
  reference: string
  titre: string
  panneId: string
  technicienId: string
  date: string
  statut: Exclude<Statut, 'a_faire'>
  categorie?: CategorieProbleme
  note?: string
  /** URL publique (photos de démo) ou data URL JPEG compressée (photos prises dans l'app) */
  photos?: string[]
}

export interface LatLng {
  lat: number
  lng: number
}
