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

---

# Itération 2


## Contexte
Le prototype est en ligne (https://bluemove-maintenance.vercel.app, repo `adeldghimMIA/bluemove-maintenance`). L'utilisateur a remonté 4 points :
1. **La position affichée n'est pas la vraie.** Cause : `src/pages/Technicien.tsx` (effet `watchPosition`) ignore volontairement tout point GPS à plus de 15 km du dépôt et retombe sur le dépôt (« Position dépôt »). L'ESSEC (Cergy) est à environ 30 km de Paris, donc le GPS réel est jeté. Si le navigateur refuse la géolocalisation, on retombe aussi sur le dépôt, sans rien dire.
2. Une **vraie navigation type Google Maps** → choix de l'utilisateur : **bouton « Ouvrir dans Google Maps »** avec toute la tournée.
3. **Nommer le rapport** quand il remonte.
4. **Photo** prise par le technicien dans le rapport, avec des **photos fictives** (libres de droits) dans les rapports de démo.

## 1. Vraie position (`src/pages/Technicien.tsx`)
- Supprimer le filtre des 15 km : la position GPS réelle est toujours utilisée et affichée (point bleu).
- Afficher l'état de la position dans la pastille en haut de la carte : « Position GPS · précision ± X m », « GPS refusé, départ du dépôt » ou « Localisation… ». Ajouter un bouton **« Me localiser »** (recentre la carte et relance `getCurrentPosition` ; c'est ce bouton qui déclenche la demande d'autorisation si elle a été ignorée).
- Si l'utilisateur est à plus de 15 km de Paris : bandeau discret « Tu es à 32 km de Paris » avec un interrupteur **« Partir du dépôt »**. L'itinéraire part de la vraie position par défaut, du dépôt si l'interrupteur est activé.
- Le mode démo « simuler mon arrivée » reste prioritaire sur le GPS. Ajouter « Revenir à ma vraie position » pour en sortir.
- `FitBounds` inclut la position réelle quand elle est à moins de 15 km. Sinon on cadre sur les pannes, pour ne pas dézoomer sur toute l'Île-de-France.

## 2. Bouton Google Maps (`src/lib/route.ts` + panneau tournée)
- `googleMapsUrl(depart, tour)` → `https://www.google.com/maps/dir/?api=1&origin=lat,lng&destination=<dernière>&waypoints=<lat,lng|…>&travelmode=driving`. Google limite à **9 étapes intermédiaires**, donc on découpe la tournée en tronçons de 10 arrêts : « Ouvrir dans Google Maps (étapes 1 à 10) », puis « (11 à …) ». En pratique, aucun technicien n'a plus de 8 pannes.
- Bouton principal sous le résumé de l'itinéraire (icône Lucide `Navigation`). Sur mobile, il ouvre l'app Google Maps (lien universel), sinon un nouvel onglet.
- Dans la fiche d'une panne : bouton **« Y aller »**, un lien Google Maps vers ce seul scooter.

## 3. Rapport nommé (`src/components/ReportModal.tsx`, `src/data/types.ts`, `src/data/store.ts`)
- `Rapport` gagne `reference` (`RAP-JJMM-BM192`, générée automatiquement), `titre` (modifiable, pré-rempli « Freinage — BM-192 · École Militaire ») et pour un problème une `categorie` : Pièce manquante · Panne non résolue · Scooter à rapatrier · Vandalisme · Autre (sélection en puces, obligatoire si « Signaler un problème »).
- Champ « Titre du rapport » visible dans le modal, avec son label.
- Dashboard (`src/pages/Dashboard.tsx`) : chaque problème remonté affiche le titre, la référence, la catégorie (badge) et la note dictée. Ajout d'un fil **« Derniers rapports »** (tous statuts), pour que les rapports « réparé » nommés soient visibles aussi.
- `store.ts` : clé localStorage passée en `v2` pour régénérer les données de démo avec les nouveaux champs. Normalisation douce si un ancien rapport n'a pas de titre.

## 4. Photos
**Côté technicien (ReportModal)**
- Bouton **« Ajouter une photo »** : `<input type="file" accept="image/*" capture="environment">`, qui ouvre l'appareil photo sur téléphone et le sélecteur de fichiers sur ordinateur. Jusqu'à 3 photos, miniatures supprimables.
- Compression dans le navigateur (`src/lib/photo.ts`) : redimensionnement à 1024 px max sur un canvas, JPEG qualité 0,7, environ 80–150 Ko, stocké en data URL dans `Rapport.photos: string[]`. Si le localStorage est plein, message clair plutôt qu'un plantage (`addRapport` renvoie une erreur gérée).
- Photo facultative pour « Réparé », conseillée (texte d'aide) pour « Problème ».

**Photos fictives**
- 6 à 8 photos libres de droits (Unsplash/Pexels, licence permettant la réutilisation), trouvées via recherche web. Sujets : pneu à plat, feu arrière cassé, scooter garé dans une rue parisienne, guidon/compteur, scooter tombé, batterie. Elles sont téléchargées dans `public/photos/` en version légère (≈ 1024 px) et créditées dans `public/photos/CREDITS.md` + le README.
- Seed (`src/data/seed.ts`) : les rapports de démo existants reçoivent des photos. On ajoute 3 ou 4 rapports fictifs (dont des « réparé » avec photo avant/après) pour un dashboard plus vivant.

**Affichage**
- Dashboard : miniatures dans chaque rapport, clic pour ouvrir une **visionneuse** (`src/components/PhotoViewer.tsx` : plein écran, Échap/flèches, bouton fermer avec label).
- Fiche panne côté technicien : si un rapport existe, ses photos s'affichent.

## 5. Mobile d'abord + onglet « Vue téléphone » (demande ajoutée)
- **Vue technicien sur mobile** : carte plein écran (`100dvh` moins le header) et **bottom sheet** par-dessus, avec 3 crans (aperçu / moitié / plein) commandés par une poignée et un bouton, qui défile à l'intérieur. Safe areas iOS (`env(safe-area-inset-*)`). Header compact : logo réduit, sélecteur de technicien en pleine largeur sur une 2e ligne. Sur ordinateur, la sidebar actuelle reste.
- Bouton de la carte « Me localiser » en bas à droite, au-dessus de la sheet. Popups Leaflet adaptés au doigt.
- Dashboard : KPI en 2 colonnes, graphiques et tableau défilables, déjà responsive ; on vérifie à 375 px.
- **Nouvel onglet `/telephone`** dans la nav (« Vue téléphone », icône `Smartphone`) : maquette d'iPhone en CSS (cadre, Dynamic Island, barre d'état) avec une iframe de 390×844 sur `/technicien`. Bascule Technicien / Opérations dans la maquette, plus un QR code ou le lien pour l'ouvrir sur son vrai téléphone. Sur un vrai téléphone, cette page renvoie directement vers l'app.

## Fichiers touchés
`src/pages/Technicien.tsx`, `src/lib/route.ts`, `src/components/ReportModal.tsx`, `src/data/{types,store,seed}.ts`, `src/pages/Dashboard.tsx`, nouveaux `src/lib/photo.ts`, `src/components/PhotoViewer.tsx`, `public/photos/*`, `README.md`, `PLAN.md` (on ajoute cette itération).

## Vérification
- `npm run build` sans erreur.
- Chrome headless avec `--use-fake-ui-for-media-stream` / géolocalisation simulée impossible, donc pour la position : vérification du code + test manuel par l'utilisateur. Je préciserai ce qui n'a pas pu être testé automatiquement.
- Test du lien Google Maps généré pour la tournée de Karim (ouverture via `curl -I`, plus vérification que l'URL contient bien les 8 étapes dans l'ordre).
- Test de `photo.ts` : compression d'une des photos de démo, taille finale < 200 Ko.
- Captures headless : dashboard avec miniatures, visionneuse, modal de rapport avec titre/catégorie/photo, mobile 375 px.
- Commit + push sur `main` (Vercel redéploie automatiquement) + `vercel --prod`, puis contrôle des URLs `/`, `/technicien`, `/dashboard` et d'une photo `/photos/…` en 200.

## Ajout : parcours guidé du technicien
Connexion → « Tu as N pannes à réparer » → Démarrer ma tournée → une étape à la fois (Google Maps → Réparer → Faire mon rapport) → passage automatique à la suivante → écran de fin.
