# BlueMove — Carte de maintenance

Prototype (cours Data & IA) pour **BlueMove**, location de scooters électriques en free floating à Paris.

## Fonctionnalités

**Vue technicien** (`/technicien`, pensée pour le téléphone) : un parcours guidé
1. **Connexion** : le technicien choisit son profil et voit combien de pannes il a à réparer.
2. **Démarrer ma tournée** : l'ordre est calculé (urgence + proximité).
3. **Étape par étape** : pour chaque scooter, une marche à suivre « Aller jusqu'au scooter » (bouton **Itinéraire Google Maps**) → « Réparer » → « Faire mon rapport ». Le rapport validé, l'app passe automatiquement à la panne suivante. On peut aussi passer une panne à plus tard.
4. **Fin de tournée** avec le récapitulatif.

Détails :
- Carte de Paris avec les scooters en panne du jour, marqueurs colorés **et numérotés** par urgence (1 → 5).
- Clic sur un pin : aperçu de la panne, puis fiche complète (type, description, action conseillée, batterie, distance).
- **Calcul d'itinéraire** : les urgences 5 passent en premier, puis on optimise un coût
  `distance totale + 0,15 × Σ (urgence − 1) × km parcourus avant d'arriver` (glouton pondéré + 2-opt).
  Tracé routier via OSRM, avec une estimation de repli si le service ne répond pas.
- **Détection sur place** (GPS, < 50 m) qui débloque **« Faire mon rapport »**. Un mode démo simule l'arrivée.
- Rapport **nommé** (titre modifiable + référence `RAP-JJMM-HHMM-BMxxx`) : **« Réparé, aucun problème »** ou **« Signaler un problème »** avec catégorie, **dictée vocale** (Web Speech API, fr-FR) et **jusqu'à 3 photos** (appareil photo du téléphone, compressées dans le navigateur).
- Position GPS réelle (avec précision), bouton « Me localiser », option « Partir du dépôt » si on est loin de Paris.
- Bouton **Google Maps** pour chaque étape et pour toute la tournée.

**Vue chef des opérations** (`/dashboard`)
- KPI du jour : pannes, réparées, avec problème, restantes, critiques en attente.
- Avancement par technicien (graphique + tableau), pannes par type, restantes par urgence, carte de la flotte.
- Fil des problèmes remontés (titre, référence, catégorie, dictée, photos) et des derniers rapports, avec visionneuse photo.

**Vue téléphone** (`/telephone`, sur ordinateur) : l'app affichée dans une maquette d'iPhone, avec un QR code pour l'ouvrir sur son vrai téléphone.
- Mise à jour en direct entre onglets (technicien dans un onglet, dashboard dans l'autre).

Données fictives (26 scooters, 4 techniciens) stockées dans le `localStorage` du navigateur. Le bouton « Réinitialiser la démo » remet tout à zéro.

## Lancer en local

```bash
npm install
npm run dev
```

Stack : Vite, React 18, TypeScript, Tailwind CSS 4, Leaflet / OpenStreetMap, Recharts, Lucide.
Le plan de conception est dans [`PLAN.md`](PLAN.md).

Photos de démonstration : Wikimedia Commons, licences libres, crédits dans [`public/photos/CREDITS.md`](public/photos/CREDITS.md).
