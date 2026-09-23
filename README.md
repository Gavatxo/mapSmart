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

### 4. (Optionnel) Isochrones
Le calcul des zones temps/distance nécessite une instance **Valhalla** auto-hébergée
(voir le service commenté dans `docker-compose.yml`). Sans elle, l'import KML,
les filtres, DVF et le tracé de zones à la main fonctionnent.

## Fonctionnel disponible (v1 socle)
- ✅ Comptes utilisateurs multi-tenant (chaque compte = ses cartes, ses données)
- ✅ Import KML côté serveur → terrains stockés en PostGIS
- ✅ Affichage carte MapLibre (points / polygones / lignes)
- ✅ Géocodage d'adresse (BAN)
- ✅ Zones de recherche (isochrone Valhalla) + filtrage des terrains dans les zones (PostGIS `ST_Within`)
- ✅ DVF (ventes réelles) — proxy open data
- ⏳ Module portails immo : squelette désactivé (validation juridique requise)

## Rappel juridique
Le module `scraper/` est **désactivé par défaut**. Son activation est soumise à une
validation juridique (CGU des portails + RGPD). La valeur du produit ne dépend pas
de lui : DVF + cadastre + KML suffisent à une v1 vendable. Voir `ARCHITECTURE.md` §2.
