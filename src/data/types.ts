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

export interface Rapport {
  id: string
  panneId: string
  technicienId: string
  date: string
  statut: Exclude<Statut, 'a_faire'>
  note?: string
}

export interface LatLng {
  lat: number
  lng: number
}
