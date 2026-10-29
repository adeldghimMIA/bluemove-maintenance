# BLUEMOVE — Prototype « Carte maintenance » (plan)

## Contexte
Projet de cours data/IA. BLUEMOVE loue des scooters électriques en free floating à Paris. On construit un prototype web pour :
1. **Les techniciens** : carte de Paris avec les scooters en panne du jour, fiche de panne, itinéraire optimisé (proximité + urgence 1→5), rapport sur place (case « réparé, aucun problème » ou dictée vocale des problèmes).
2. **Le chef des opérations** : tableau de bord global de la journée (réparés / problèmes / restants, par technicien).

Dossier vide (`/Users/adel/Desktop/APP_BLUEMOVE`). Outils vérifiés : node 24, gh (compte `adeldghimMIA`), vercel CLI (`adeldghim-1892`) connectés.
Décisions : données fictives + **localStorage** (pas de backend), repo GitHub **public**.

## Stack
- **Vite + React + TypeScript + Tailwind CSS**
- **react-leaflet / Leaflet** + tuiles CARTO (OpenStreetMap), gratuites sans clé
- **OSRM public** (`router.project-osrm.org`, profil vélo/voiture) pour tracer le trajet réel sur les rues ; fallback lignes droites si l'API ne répond pas
- **Web Speech API** (`fr-FR`) pour la dictée vocale, fallback zone de texte si non supporté (Firefox)
- **Recharts** pour les graphiques du dashboard
- **react-router** : `/` (choix du rôle), `/technicien`, `/dashboard`

## Données (`src/data/`)
- `seed.ts` : ~26 scooters en panne (base = les 22 de l'ancien prototype, voir section DA), 4 techniciens (ex. Karim, Léa, Sofiane, Inès), chaque panne assignée à un technicien.
- Panne : `{ id, scooterId (BM-xxxx), lat, lng, adresse, type (batterie, frein, pneu, éclairage, béquille, écran, vandalisme…), description, urgence 1-5, batterie %, signaléÀ, technicienId, statut: 'à faire' | 'réparé' | 'problème' }`
- Rapport : `{ panneId, technicienId, date, statut, noteVocale?: string, durée }`
- `store.ts` : lecture/écriture localStorage (try/catch), init depuis le seed, bouton « Réinitialiser la démo ». Quelques rapports pré-remplis pour que le dashboard ne soit pas vide.

## Vue Technicien (`src/pages/Technicien.tsx`)
- Sélecteur de technicien en haut (simule la connexion du matin) + liste « Mes interventions du jour ».
- **Carte** : pinpoints colorés par urgence (1 vert → 5 rouge, numéro d'urgence dans le marqueur), grisés/cochés si traités ; position du technicien (point bleu).
- **Clic sur un pin** → popup/fiche : scooter, type de panne, description, urgence (badge), batterie, adresse, distance.
- **Bouton « Calculer mon itinéraire »** (`src/lib/route.ts`) :
  - Point de départ = position GPS (ou dépôt BLUEMOVE par défaut si refus).
  - Algorithme glouton pondéré : à chaque étape, choisir la panne minimisant `distance_km / poids(urgence)` avec `poids = 1 + 0.6·(urgence−1)` (une urgence 5 « attire » ~3,4× plus qu'une 1), puis amélioration **2-opt** sur le coût pondéré. Les urgences 5 sont forcées en tête de tournée.
  - Affiche l'ordre numéroté sur la carte + polyline OSRM, distance totale, durée estimée, liste ordonnée.
- **Détection sur place** : `navigator.geolocation.watchPosition` ; si distance < 50 m du scooter → bouton **« Faire mon rapport »** actif. Pour la démo en classe : interrupteur **« Mode démo : me téléporter au scooter »**.
- **Rapport** (`src/components/ReportModal.tsx`) :
  - Case **« Réparé — aucun problème »** → valide directement.
  - Sinon **« Signaler un problème »** → bouton micro 🎤 (dictée vocale, transcription en direct, éditable) → envoi. Statut `problème` + texte enregistré.
  - Le pin passe en état traité, l'itinéraire se met à jour.

## Vue Chef des opérations (`src/pages/Dashboard.tsx`)
- KPI : pannes du jour, réparées, avec problème, restantes, taux de résolution, urgences 5 non traitées.
- Graphiques : avancement par technicien (barres empilées réparé/problème/à faire), répartition par type de panne, répartition par urgence.
- Tableau par technicien (assignées / faites / problèmes / %).
- Flux des **rapports avec problème** (texte dicté, scooter, technicien, heure) + mini-carte globale de tous les scooters par statut.
- Rafraîchit en écoutant l'événement `storage` (technicien dans un autre onglet → dashboard mis à jour en direct).

## Logo & DA (reprise de l'existant)
Sources fournies : `~/Downloads/bluemove-maintenance-map/Gemini_Generated_Image_5w99b75w99b75w99.jpeg` (scooter bleu 3D + volutes bleu/turquoise) et `~/Downloads/bluemove-maintenance-map/src/index.html` (prototype Workshop 5).
- **Logo** : copié en `public/logo.jpeg` (+ version recadrée sur le scooter pour le header/favicon, via `sips`).
  - **Écran de chargement** (`src/components/Splash.tsx`) à l'ouverture : logo en grand centré sur fond blanc/dégradé `#eef4fb → #f9fbfe`, wordmark « BlueMove », légère animation (scooter qui glisse + barre de progression bleue), ~1,8 s puis fondu vers l'app.
  - **Header** de chaque vue : logo recadré + « BlueMove ».
- **Tokens DA repris tels quels** dans Tailwind/CSS : `--bg #f4f7fb`, `--text #12304a`, `--muted #5f7388`, `--line #d9e3ee`, `--blue #1664c0`, `--blue2 #3a86ff`, `--critical #e63946`, `--high #f4a261`, `--medium #f6c445`, `--ok #43aa8b`, rayon 18px, ombre douce `0 12px 30px rgba(21,45,77,.08)`, police Inter, cartes blanches, KPI en majuscules, badges pilule, `.note` en pointillés bleus. Turquoise du logo (#22c3c9) en accent.
- **Couleurs d'urgence 1→5** dérivées de la palette : 1 `--ok`, 2 `#8cc63f`, 3 `--medium`, 4 `--high`, 5 `--critical`.
- **Données** : on reprend les 22 scooters de l'ancien prototype (id BM-xxx, quartier, arrondissement, lat/lon, type de panne, batterie, action conseillée) comme base du seed, criticité convertie en urgence 1-5 via leur score (≥95→5, ≥85→4, ≥70→3, ≥50→2, sinon 1), + quelques scooters ajoutés pour 4 techniciens.
- Mobile-first pour le technicien (carte plein écran + bottom sheet), desktop pour le dashboard.

## Livrables & déploiement
1. `PLAN.md` à la racine du repo (copie de ce plan) + `README.md` (fonctionnalités, lancement local, lien Vercel).
2. `git init`, commit, `gh repo create bluemove-maintenance --public --source . --push`.
3. `vercel.json` avec rewrite SPA (`/(.*) → /index.html`), puis `vercel --prod --yes` ; lier le projet à GitHub (`vercel git connect`) pour les déploiements auto.

## Vérification
- `npm run build` sans erreur TypeScript.
- `npm run dev` + test manuel : choisir un technicien → pins affichés → calcul d'itinéraire (ordre cohérent : urgences hautes tôt, trajet sans zigzag) → mode démo téléportation → rapport « réparé » et rapport avec dictée (Chrome) → ouvrir `/dashboard` dans un autre onglet et vérifier la mise à jour des KPI.
- Après déploiement : ouvrir l'URL Vercel, vérifier les routes `/technicien` et `/dashboard` en accès direct (rewrite) et le micro (HTTPS requis → OK sur Vercel).
