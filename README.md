# BlueMove — Carte de maintenance

Prototype (cours Data & IA) pour **BlueMove**, location de scooters électriques en free floating à Paris.

## Fonctionnalités

**Vue technicien** (`/technicien`, mobile-first)
- Carte de Paris avec les scooters en panne du jour, marqueurs colorés **et numérotés** par urgence (1 → 5).
- Clic sur un pin : aperçu de la panne, puis fiche complète (type, description, action conseillée, batterie, distance).
- **Calcul d'itinéraire** : les urgences 5 passent en premier, puis on optimise un coût
  `distance totale + 0,15 × Σ (urgence − 1) × km parcourus avant d'arriver` (glouton pondéré + 2-opt).
  Tracé routier via OSRM, avec une estimation de repli si le service ne répond pas.
- **Détection sur place** (GPS, < 50 m) qui débloque **« Faire mon rapport »**. Un mode démo simule l'arrivée.
- Rapport : **« Réparé, aucun problème »** ou **« Signaler un problème »** avec **dictée vocale** (Web Speech API, fr-FR).

**Vue chef des opérations** (`/dashboard`)
- KPI du jour : pannes, réparées, avec problème, restantes, critiques en attente.
- Avancement par technicien (graphique + tableau), pannes par type, restantes par urgence, carte de la flotte.
- Fil des problèmes remontés, avec la transcription de la dictée.
- Mise à jour en direct entre onglets (technicien dans un onglet, dashboard dans l'autre).

Données fictives (26 scooters, 4 techniciens) stockées dans le `localStorage` du navigateur. Le bouton « Réinitialiser la démo » remet tout à zéro.

## Lancer en local

```bash
npm install
npm run dev
```

Stack : Vite, React 18, TypeScript, Tailwind CSS 4, Leaflet / OpenStreetMap, Recharts, Lucide.
Le plan de conception est dans [`PLAN.md`](PLAN.md).
