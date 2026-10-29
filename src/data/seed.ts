import type { LatLng, Panne, Rapport, Technicien, TypePanne, Urgence } from './types'

export const DEPOT: LatLng & { nom: string } = {
  nom: 'Dépôt BlueMove — Quai de la Rapée',
  lat: 48.8443,
  lng: 2.3656,
}

export const TECHNICIENS: Technicien[] = [
  { id: 't1', prenom: 'Karim', nom: 'Benali', zone: 'Ouest' },
  { id: 't2', prenom: 'Léa', nom: 'Moreau', zone: 'Centre' },
  { id: 't3', prenom: 'Sofiane', nom: 'Haddad', zone: 'Nord-Est' },
  { id: 't4', prenom: 'Inès', nom: 'Roussel', zone: 'Sud-Est' },
]

const DESCRIPTIONS: Record<TypePanne, string> = {
  'Batterie / alimentation': 'Batterie qui ne tient plus la charge, coupures signalées par plusieurs clients.',
  Freinage: 'Frein avant mou, distance de freinage anormale remontée par le capteur.',
  'Moteur / traction': 'À-coups à l’accélération, le moteur se coupe au-dessus de 20 km/h.',
  'Roue / pneu': 'Pneu arrière à plat, jante potentiellement voilée.',
  'Connectivité / IoT': 'Boîtier télématique muet, plus de position GPS fiable.',
  'Guidon / verrouillage': 'Verrou du guidon bloqué, le scooter ne se déverrouille pas depuis l’app.',
  Éclairage: 'Feu arrière HS, non conforme pour une circulation de nuit.',
  Béquille: 'Béquille latérale desserrée, le scooter tombe à l’arrêt.',
}

// Base : les 22 scooters du prototype Workshop 5 (+4 ajoutés). Le score de récupération est converti en urgence 1-5.
type Raw = [string, number, number, string, string, TypePanne, number, number, string, string, number]
//          id    lat     lng     arr    quartier type     score  batt  action tech  heures
const RAW: Raw[] = [
  ['BM-014', 48.8623, 2.3522, '4e', 'Hôtel de Ville', 'Freinage', 94, 41, 'Contrôle freinage complet', 't2', 13],
  ['BM-021', 48.8601, 2.3364, '1er', 'Louvre', 'Connectivité / IoT', 48, 58, 'Diagnostic IoT, redémarrage module', 't2', 6],
  ['BM-033', 48.8632, 2.2875, '16e', 'Trocadéro', 'Moteur / traction', 86, 53, 'Test moteur et contrôleur', 't1', 11],
  ['BM-045', 48.8867, 2.3431, '18e', 'Montmartre', 'Roue / pneu', 79, 60, 'Changement roue / pneu', 't3', 9],
  ['BM-052', 48.8532, 2.3692, '11e', 'Bastille', 'Batterie / alimentation', 97, 6, 'Remplacement batterie', 't3', 15],
  ['BM-061', 48.8463, 2.3461, '5e', 'Panthéon', 'Guidon / verrouillage', 42, 67, 'Inspection du verrou', 't2', 4],
  ['BM-075', 48.8556, 2.3126, '7e', 'Invalides', 'Freinage', 99, 38, 'Neutraliser, changer plaquettes', 't1', 17],
  ['BM-083', 48.8809, 2.3553, '10e', 'Gare du Nord', 'Connectivité / IoT', 74, 46, 'Vérifier boîtier télématique', 't2', 8],
  ['BM-094', 48.8481, 2.3958, '12e', 'Nation', 'Moteur / traction', 92, 34, 'Diagnostic moteur, passage atelier si besoin', 't4', 14],
  ['BM-108', 48.8424, 2.3211, '14e', 'Montparnasse', 'Batterie / alimentation', 82, 9, 'Changement batterie', 't4', 10],
  ['BM-111', 48.8975, 2.3446, '18e', 'Porte de Clignancourt', 'Roue / pneu', 56, 55, 'Regonflage / rustine', 't3', 7],
  ['BM-126', 48.8698, 2.3075, '8e', 'Champs-Élysées', 'Guidon / verrouillage', 78, 50, 'Déblocage verrou guidon', 't1', 12],
  ['BM-137', 48.8556, 2.3536, '4e', 'Saint-Gervais', 'Batterie / alimentation', 96, 4, 'Remplacement batterie + test BMS', 't2', 16],
  ['BM-149', 48.8721, 2.3846, '20e', 'Belleville', 'Connectivité / IoT', 40, 62, 'Redémarrage module', 't3', 5],
  ['BM-154', 48.8486, 2.2877, '15e', 'Beaugrenelle', 'Freinage', 81, 49, 'Réglage frein arrière', 't1', 9],
  ['BM-163', 48.8312, 2.3561, '13e', 'Place d’Italie', 'Moteur / traction', 77, 40, 'Test moteur', 't4', 8],
  ['BM-174', 48.8478, 2.2649, '16e', 'Porte d’Auteuil', 'Batterie / alimentation', 52, 11, 'Recharge / échange batterie', 't1', 6],
  ['BM-181', 48.8662, 2.3604, '3e', 'Temple', 'Roue / pneu', 76, 51, 'Changement pneu avant', 't2', 10],
  ['BM-192', 48.8521, 2.3022, '7e', 'École Militaire', 'Freinage', 100, 37, 'Arrêt immédiat, changement étrier', 't1', 18],
  ['BM-204', 48.8722, 2.3655, '10e', 'Canal Saint-Martin', 'Connectivité / IoT', 44, 63, 'Diagnostic à distance puis sur place', 't3', 5],
  ['BM-218', 48.8448, 2.3733, '12e', 'Gare de Lyon', 'Guidon / verrouillage', 73, 57, 'Vérification verrou + sécurisation', 't4', 9],
  ['BM-227', 48.8718, 2.3317, '9e', 'Opéra', 'Moteur / traction', 91, 43, 'Contrôle moteur', 't2', 14],
  ['BM-233', 48.8838, 2.3207, '17e', 'Batignolles', 'Éclairage', 58, 72, 'Remplacement feu arrière', 't1', 5],
  ['BM-241', 48.8222, 2.3376, '14e', 'Parc Montsouris', 'Éclairage', 61, 66, 'Remplacement feu arrière', 't4', 6],
  ['BM-256', 48.8364, 2.3826, '12e', 'Bercy', 'Béquille', 35, 70, 'Resserrage béquille', 't4', 3],
  ['BM-262', 48.8797, 2.2966, '17e', 'Ternes', 'Connectivité / IoT', 88, 29, 'Remplacement boîtier IoT', 't1', 12],
]

function urgenceFromScore(score: number): Urgence {
  if (score >= 95) return 5
  if (score >= 85) return 4
  if (score >= 70) return 3
  if (score >= 50) return 2
  return 1
}

function cp(arr: string): string {
  const n = parseInt(arr, 10)
  return `750${String(n).padStart(2, '0')}`
}

export function buildSeed(): { pannes: Panne[]; rapports: Rapport[] } {
  const pannes: Panne[] = RAW.map(([id, lat, lng, arr, quartier, type, score, batterie, action, tech, h]) => ({
    id: `P-${id.slice(3)}`,
    scooterId: id,
    lat,
    lng,
    arrondissement: arr,
    quartier,
    cp: cp(arr),
    type,
    description: DESCRIPTIONS[type],
    action,
    urgence: urgenceFromScore(score),
    batterie,
    signaleIlYaH: h,
    technicienId: tech,
    statut: 'a_faire',
  }))

  // Quelques interventions déjà faites ce matin pour que le tableau de bord soit vivant
  const today = new Date()
  const at = (h: number, m: number) => {
    const d = new Date(today)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const rapports: Rapport[] = [
    { id: 'R-1', panneId: 'P-111', technicienId: 't3', date: at(8, 42), statut: 'repare' },
    { id: 'R-2', panneId: 'P-149', technicienId: 't3', date: at(9, 18), statut: 'repare' },
    {
      id: 'R-3',
      panneId: 'P-204',
      technicienId: 't3',
      date: at(9, 51),
      statut: 'probleme',
      note: 'Module IoT redémarré deux fois mais le scooter ne remonte toujours pas sur le réseau. Je pense que la carte SIM est HS, il faut le rapatrier à l’atelier.',
    },
    { id: 'R-4', panneId: 'P-256', technicienId: 't4', date: at(8, 55), statut: 'repare' },
    {
      id: 'R-5',
      panneId: 'P-241',
      technicienId: 't4',
      date: at(9, 37),
      statut: 'probleme',
      note: 'Le support du feu arrière est cassé, pas la pièce dans le camion. Scooter désactivé en attendant, à prévoir demain matin.',
    },
    { id: 'R-6', panneId: 'P-021', technicienId: 't2', date: at(9, 5), statut: 'repare' },
  ]
  for (const r of rapports) {
    const p = pannes.find((x) => x.id === r.panneId)
    if (p) p.statut = r.statut
  }
  return { pannes, rapports }
}
