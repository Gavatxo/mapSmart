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

### 1. Base de données (PostGIS)
```bash
docker compose up -d db
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

### 4. (Optionnel) Isochrones — Valhalla
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
- ⏳ Module portails immo : squelette désactivé (validation juridique requise)

## Rappel juridique
Le module `scraper/` est **désactivé par défaut**. Son activation est soumise à une
validation juridique (CGU des portails + RGPD). La valeur du produit ne dépend pas
de lui : DVF + cadastre + KML suffisent à une v1 vendable. Voir `ARCHITECTURE.md` §2.
