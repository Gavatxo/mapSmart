# MapSmart

Plateforme SaaS de cartographie et d'analyse de secteurs pour agences immobilières / foncières.
Croise **terrains de l'agence (KML)**, **données publiques légales (DVF, cadastre)** et, en option modulaire, des **annonces de portails** (mode agrégateur/redirection).

> Architecture détaillée : voir [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> Prototype d'origine conservé dans [`carte-terrains-agence-code/`](./carte-terrains-agence-code/).

## Structure du monorepo

| Dossier | Rôle | Stack |
|---|---|---|
| `laravel-api/` | API : auth multi-tenant, cartes, import KML, zones, proxies géo | Laravel 13 + Sanctum + PostGIS |
| `react-front/` | Interface web : carte, comptes, zones | React + TypeScript + MapLibre GL |
| `scraper/` | Module portails immo **isolé et désactivé par défaut** | Node + Playwright |
| `carte-terrains-agence-code/` | Prototype d'origine (référence) | HTML/JS + Leaflet |

## Démarrage rapide

### 1. Base de données (PostGIS) + Redis (files d'attente)
```bash
docker compose up -d db redis
```

### 2. API Laravel
```bash
cd laravel-api
composer install
php artisan migrate      # crée tenants, users, maps, terrains, zones + PostGIS
php artisan serve        # http://localhost:8000
```

### 3. Front React
```bash
cd react-front
npm install
npm run dev              # http://localhost:5173
```

Ouvrir http://localhost:5173 → créer un compte → créer une carte → importer un KML
(ex. `carte-terrains-agence-code/assets/terrain-agence.kml`).

### 4. Données publiques (DVF + cadastre) — phase 2
Les ventes DVF et les parcelles cadastrales sont chargées en base pour les départements
de `MAPSMART_DEPARTEMENTS` (défaut : `45`). Les imports passent par la file `ingestion` :
```bash
cd laravel-api
php artisan horizon                       # worker des files (tableau de bord : http://localhost:8000/horizon)
php artisan mapsmart:import-dvf           # DVF 2021-2025 des départements configurés
php artisan mapsmart:import-cadastre      # parcelles, commune par commune
# variantes : mapsmart:import-dvf 45 41 --years=2025 --sync · mapsmart:import-cadastre --communes=45327 --sync
php artisan schedule:work                 # rafraîchissements planifiés (DVF mensuel, cadastre trimestriel)
```
Ordre de grandeur (Loiret) : ~71 000 ventes DVF en quelques secondes, ~800 000 parcelles (~300 Mo) en ~1 min.
Hors des zones chargées, les ventes DVF autour d'un point restent disponibles « à la volée »
(fichiers geo-dvf de la commune).

### 5. (Optionnel) Isochrones — Valhalla
```bash
docker compose --profile routing up -d valhalla   # http://localhost:8002
```
Au premier lancement, le conteneur télécharge l'extrait OSM (région Centre-Val de Loire
par défaut, variable `VALHALLA_PBF_URLS`) et construit les tuiles dans `valhalla_tiles/`
(quelques minutes). Sans Valhalla, l'import KML, les polygones dessinés et DVF fonctionnent.

### Tests
```bash
cd laravel-api
composer test            # SQLite en mémoire (rapide)
composer test:postgis    # + requêtes spatiales réelles sur la base mapsmart_test
```
`mapsmart_test` se crée une fois : `docker compose exec db psql -U mapsmart -c "CREATE DATABASE mapsmart_test"`.

### Emails (mot de passe oublié)
En local `MAIL_MAILER=log` : le lien de réinitialisation est écrit dans
`laravel-api/storage/logs/laravel.log`.

## Fonctionnel disponible (v1 socle)
- ✅ Comptes multi-tenant, réinitialisation du mot de passe, limitation des tentatives de connexion
- ✅ Cartes : création, renommage, suppression, cadrage sauvegardé
- ✅ Import KML côté serveur (Placemarks avec ou sans Folder, DTD refusées) → PostGIS
- ✅ Affichage MapLibre (points / polygones / lignes) + filtre par calque
- ✅ Géocodage d'adresse (BAN)
- ✅ Zones de recherche : isochrone temps / distance (Valhalla) ou polygone dessiné ;
  renommage, suppression, rechargement ; terrains compatibles = intersection des zones (`ST_Within`)
- ✅ DVF (ventes réelles) autour d'un point — fichiers geo-dvf officiels

## Phase 2 — valeur légale
- ✅ Ingestion DVF + cadastre en PostGIS (commandes artisan, jobs Horizon, planification, idempotente)
- ✅ Ventes DVF **dans les zones** (intersection) ou autour du départ, filtres catégorie / période
- ✅ Synthèse : nombre de ventes, prix médian, prix médian au m² (bâti / terrain) par catégorie
- ✅ Couche cadastre (à fort zoom) + référence de parcelle dans la fiche d'un terrain
- ⏳ Module portails immo : squelette désactivé (validation juridique requise)

## Rappel juridique
Le module `scraper/` est **désactivé par défaut**. Son activation est soumise à une
validation juridique (CGU des portails + RGPD). La valeur du produit ne dépend pas
de lui : DVF + cadastre + KML suffisent à une v1 vendable. Voir `ARCHITECTURE.md` §2.
