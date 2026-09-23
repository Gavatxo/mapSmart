# MapSmart — Document d'architecture

> Plateforme SaaS de cartographie et d'analyse de secteurs pour agences immobilières / foncières.
> Croise **terrains de l'agence (KML)**, **données publiques légales (DVF, cadastre)** et, en option modulaire, **annonces de portails immo** (mode agrégateur/redirection).

**Statut :** document de cadrage v1 — 2026-09-23
**Base existante :** prototype `carte-terrains-agence-code/` (Leaflet + KML + isochrones Valhalla, mono-fichier)

---

## 1. Vision & périmètre

### 1.1 Ce que fait le produit
Un utilisateur (agent immobilier) se connecte, importe/gère ses terrains, dessine des **zones de recherche** (isochrone temps de trajet, distance routière, ou polygone), et voit sur une carte **tout ce qui est pertinent dans cette zone** :

- ses **terrains** (stock agence, import KML/Google My Maps) ;
- les **ventes réelles** (DVF) et le **parcellaire cadastral** ;
- en bonus optionnel, des **annonces de portails** (lien + infos minimales → redirection vers la source).

Chaque utilisateur a **son compte, ses cartes, ses zones sauvegardées, ses imports**, accessibles depuis n'importe quel poste.

### 1.2 Modèle
**SaaS multi-tenant** : un compte = un utilisateur ou une **agence** (plusieurs membres partageant les mêmes cartes). Facturation par abonnement.

### 1.3 Principe directeur : la valeur ne dépend PAS du scraping
Le produit doit être **vendable et complet avec les seules sources légales** (DVF, cadastre, BAN, KML). Le module « portails immo » est un **greffon isolé, activable/désactivable**, jamais un point de dépendance. Si un portail bloque ou met en demeure, on coupe le module sans casser le produit.

---

## 2. Cadre juridique (à traiter comme une exigence, pas un détail)

> ⚠️ **Go/No-go** sur le module scraping. À faire valider par un avocat spécialisé IT/données personnelles **avant** toute mise en production commerciale du module.

| Source | Statut | Contrainte |
|---|---|---|
| **DVF** (valeurs foncières) | ✅ Open data officiel | API data.gouv / fichiers ; aucune restriction de réutilisation |
| **Cadastre / PCI / PLU** | ✅ Open data (IGN, data.gouv) | Attribution ; formats GeoJSON/vecteur |
| **BAN** (adresses) | ✅ Open data | Géocodage gratuit et illimité — remplace Nominatim |
| **Fond de carte** | ✅ OSM / MapTiler / IGN | Attribution ; en SaaS commercial → héberger ses tuiles ou clé MapTiler payante |
| **Isochrones (Valhalla)** | ⚠️ | L'instance publique est interdite en prod commerciale → **auto-héberger Valhalla** |
| **Annonces portails (Leboncoin, SeLoger…)** | ⛔ Risqué | Contraire aux CGU ; RGPD (données de particuliers) ; anti-bot (DataDome) |

### 2.1 Règles de conception du module « portails » pour limiter le risque
- **Mode agrégateur** : afficher un minimum (titre, prix, vignette, secteur) + **lien** ; le contact se fait **chez le portail, pas chez nous**.
- **Ne rien stocker de personnel en base.** Fetch à la volée, pas de « cache revendable » d'annonces. Idéalement TTL court et anonymisation.
- **Isolation technique** : worker séparé (voir §5), proxies dédiés, coupe-circuit.
- Ce mode transforme le risque « republication + RGPD » (élevé) en risque « collecte/CGU » (modéré) — mais **ne supprime pas** le mur anti-bot ni la contrariété aux CGU.

---

## 3. Vue d'ensemble de l'architecture

```
                         ┌───────────────────────────────┐
                         │         React + TypeScript      │
                         │   MapLibre GL · état zones/     │
                         │   filtres · auth · dashboard    │
                         └───────────────┬─────────────────┘
                                         │ HTTPS / JSON (Sanctum token)
                         ┌───────────────▼─────────────────┐
                         │           Laravel API            │
                         │  Auth/multi-tenant · CRUD cartes │
                         │  zones · imports KML · billing   │
                         │  orchestration jobs (Horizon)    │
                         └───┬───────────────┬──────────────┘
                             │               │ dispatch (queue Redis)
              ┌──────────────▼──┐   ┌─────────▼───────────────┐
              │ PostgreSQL +    │   │  Worker scraping         │
              │ PostGIS         │   │  Node + Playwright       │
              │ (cœur géo)      │   │  (service isolé, opt.)   │
              └──────────────┬──┘   └─────────┬───────────────┘
                             │                │
        ┌────────────────────▼──┐   ┌─────────▼──────────────┐
        │ Ingestion sources     │   │ Portails immo (opt.)   │
        │ légales : DVF, cadastre│   │ via proxies résidentiels│
        │ BAN, Valhalla (self)  │   │ → lien + infos mini    │
        └───────────────────────┘   └────────────────────────┘
```

### 3.1 Choix de stack et justification

| Couche | Choix | Pourquoi |
|---|---|---|
| Front | **React + TypeScript + Vite** | Réutilise toute la logique du prototype ; écosystème mûr |
| Carte | **MapLibre GL JS** (vectoriel) | Milliers de points fluides, style custom — Leaflet plafonne en SaaS. Migration directe depuis le prototype |
| API | **Laravel 11 + Sanctum** | Auth/multi-tenant/billing/queues clés en main ; PHP suffisant pour l'API |
| DB | **PostgreSQL 16 + PostGIS** | **Non négociable** : requêtes « dans ce polygone/isochrone » en SQL indexé |
| Files d'attente | **Redis + Laravel Horizon** | Planifier ingestions DVF et jobs scraping |
| Scraping | **Service Node + Playwright séparé** | Isolation ; Playwright >> libs PHP face à l'anti-bot |
| Routage/isochrones | **Valhalla auto-hébergé** (Docker) | Usage commercial impossible sur l'instance publique |
| Géocodage | **BAN** (api-adresse.data.gouv.fr) | Gratuit, illimité, français — remplace Nominatim |

---

## 4. Modèle de données (PostgreSQL + PostGIS)

### 4.1 Multi-tenant & comptes

```
tenants                       (une agence ou un compte individuel)
  id, name, plan, stripe_id, created_at

users
  id, tenant_id (FK), name, email, password_hash,
  role ENUM('owner','admin','agent'), created_at

  → un user appartient à un tenant ; toutes les données sont scopées par tenant_id.
  → l'API filtre SYSTÉMATIQUEMENT sur le tenant du user connecté (global scope Eloquent).
```

**Multi-tenant = "single database, shared schema"** : chaque table métier porte `tenant_id`, appliqué par un *global scope* Laravel. Simple, suffisant à ce stade ; on pourra isoler par schéma plus tard si besoin réglementaire.

### 4.2 Données métier

```
maps                          (une "carte" = un espace de travail sauvegardé)
  id, tenant_id, name, owner_id, view_state (jsonb: center/zoom), created_at

terrains                      (stock agence, issu des imports KML)
  id, tenant_id, map_id, name, description, layer,
  geom GEOGRAPHY(Point|Polygon|LineString, 4326),   -- indexé GIST
  source_import_id, created_at

kml_imports
  id, tenant_id, map_id, filename, raw_kml (ou lien blob), feature_count, imported_at

search_zones                  (zones A/B sauvegardées d'une carte)
  id, tenant_id, map_id, label,
  mode ENUM('time','distance','polygon'),
  origin GEOGRAPHY(Point,4326), value_minutes_or_km,
  geom GEOGRAPHY(Polygon,4326),   -- isochrone calculée, en cache
  created_at

dvf_transactions              (ingestion légale, partagée / non tenant-scoped)
  id, geom GEOGRAPHY(Point,4326), date_mutation, valeur_fonciere,
  type_local, surface, nb_pieces, commune_insee   -- index GIST + date

cadastre_parcelles            (open data)
  id, geom GEOGRAPHY(Polygon,4326), section, numero, commune_insee, surface
```

> Les tables **DVF/cadastre sont globales** (données publiques), pas scopées par tenant : on les ingère une fois et tous les comptes les interrogent.

### 4.3 Requêtes géo typiques (la valeur du produit)

```sql
-- Terrains de l'agence dans l'isochrone de la zone A
SELECT t.* FROM terrains t
JOIN search_zones z ON z.id = :zoneId
WHERE t.tenant_id = :tenant
  AND ST_Within(t.geom::geometry, z.geom::geometry);

-- Ventes DVF réelles dans un secteur dessiné (12 derniers mois)
SELECT * FROM dvf_transactions
WHERE ST_Within(geom::geometry, ST_GeomFromGeoJSON(:polygon))
  AND date_mutation > now() - interval '12 months';
```

C'est ce que le point-dans-polygone JS du prototype ne peut pas faire à l'échelle SaaS.

---

## 5. Composants

### 5.1 Front React
Structure cible (reprend la logique du prototype, réorganisée) :

```
src/
  map/            MapLibre init, couches, marqueurs, popups
  zones/          création zone (temps/distance/polygone), appel isochrone
  layers/         filtres calques (terrains, DVF, cadastre, annonces)
  imports/        upload KML → API
  auth/           login, register, contexte user/tenant
  workspace/      liste des cartes, sauvegarde view_state
  api/            client HTTP (token Sanctum), hooks React Query
```

Migration prototype → cible :
- `parseKml()` → déplacé côté serveur (validation + stockage), le front reçoit du GeoJSON.
- isochrones Valhalla → appel via l'API Laravel (proxy vers Valhalla self-hosted), résultat mis en cache dans `search_zones.geom`.
- géocodage Nominatim → **BAN**.
- `localStorage` → **stockage serveur par compte**.

### 5.2 API Laravel — endpoints principaux

```
POST   /auth/register            création compte + tenant
POST   /auth/login               → token Sanctum
GET    /me

GET    /maps                     cartes du tenant
POST   /maps                     créer une carte
GET    /maps/{id}                détail + view_state
PATCH  /maps/{id}

POST   /maps/{id}/imports        upload KML → parse serveur → terrains
GET    /maps/{id}/terrains       GeoJSON des terrains (filtrable)

POST   /maps/{id}/zones          créer zone (mode time/distance/polygon)
                                 → calcule isochrone (Valhalla) et met en cache
GET    /maps/{id}/results        terrains + DVF + (annonces) dans les zones

GET    /dvf?bbox=|polygon=       ventes réelles dans un secteur
GET    /cadastre?bbox=           parcelles
GET    /geocode?q=               proxy BAN

POST   /listings/search          [module opt.] annonces agrégées (worker)
```

### 5.3 Worker scraping (Node + Playwright) — module optionnel
- Service **séparé**, déployé indépendamment, désactivable par feature-flag.
- Reçoit des jobs depuis Laravel (queue Redis) : « annonces terrain dans ce polygone/commune ».
- Playwright headless furtif + **proxies résidentiels rotatifs**.
- Retourne **infos minimales + URL source** ; **ne persiste aucune donnée personnelle**.
- Coupe-circuit : quotas, backoff, détection de blocage → désactivation auto.
- **N'est jamais un point de dépendance** du produit principal.

### 5.4 Ingestion sources légales
- Jobs planifiés (Horizon scheduler) : téléchargement périodique DVF + cadastre → chargement PostGIS (`ogr2ogr` / COPY).
- Idempotent, versionné par millésime.

---

## 6. Sécurité & conformité
- Auth par token **Sanctum** ; mots de passe hashés (bcrypt/argon2).
- **Isolation tenant** garantie par global scope Eloquent + tests dédiés (un tenant ne doit jamais voir les données d'un autre).
- RGPD : registre de traitement, minimisation (pas de stockage d'annonces perso), politique de rétention, DPA si besoin.
- Rate-limiting API ; validation stricte des uploads KML (taille, XML bombs).
- Secrets/proxies hors code (variables d'env / vault).

---

## 7. Roadmap

| Phase | Contenu | Résultat |
|---|---|---|
| **0. Juridique** (parallèle) | Validation avocat scraping + RGPD ; choix fond de carte | Go/No-go module portails |
| **1. Socle** | Laravel + PostGIS + React/MapLibre ; auth multi-tenant ; import KML serveur ; isochrones Valhalla self-hosted ; géocodage BAN ; sauvegarde cartes/zones par compte | Le prototype devient une vraie app multi-utilisateurs |
| **2. Valeur légale** | Ingestion DVF + cadastre ; affichage ventes réelles et parcelles par secteur | **Produit déjà vendable** « analyse de secteur » |
| **3. SaaS** | Facturation Stripe (Cashier), plans/quotas, rôles agence, dashboard | Commercialisable |
| **4. Module portails** (si Go) | Worker Node/Playwright isolé, mode agrégateur/redirection, proxies, coupe-circuit | Bonus différenciant |

> Phases 1 et 2 constituent la **v1 minimale viable** sans aucun risque juridique.

---

## 8. Coûts récurrents à anticiper (SaaS)
- Hébergement app + DB PostGIS (VPS/managed).
- **Valhalla self-hosted** (CPU/RAM pour le routage).
- Fond de carte commercial (MapTiler) ou tuiles auto-hébergées.
- Redis (queues).
- **Si module portails** : proxies résidentiels (poste mensuel réel et récurrent) + maintenance continue (l'anti-bot évolue).

---

## 9. Décisions ouvertes (à trancher au scaffold)
1. **Tenant = individu ou agence multi-membres** dès la v1 ? (impacte le modèle users/roles)
2. Monorepo unique (`laravel-api/`, `react-front/`, `scraper/`) ou dépôts séparés ?
3. Stockage des KML bruts : base vs objet (S3-like) ?
4. Fond de carte retenu (OSM auto-hébergé / MapTiler / IGN) ?
5. Périmètre géographique de départ DVF/cadastre (national d'emblée, ou une région pilote) ?

---

## 10. Prochaine étape proposée
Sur validation de ce document, scaffolder le **monorepo** :
`laravel-api/` (auth multi-tenant + PostGIS + import KML) · `react-front/` (MapLibre reprenant les 83 terrains + login) · `scraper/` (squelette désactivé).
Objectif : voir tourner rapidement l'app avec comptes utilisateurs et les données existantes.
