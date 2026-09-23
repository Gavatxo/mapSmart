# scraper — module portails immo (optionnel)

Service **isolé** et **désactivé par défaut**. Il n'est jamais un point de dépendance : l'app MapSmart fonctionne pleinement sans lui (terrains KML + DVF + cadastre).

## ⚠️ Avant toute activation
- Faire valider par un avocat IT/données : CGU des portails + RGPD (annonces = données personnelles).
- Mode **agrégateur** uniquement : afficher un minimum (titre, prix, vignette) + **lien** vers la source ; le contact se fait chez le portail.
- **Ne rien persister** de personnel ; pas de cache revendable d'annonces.

## Contraintes techniques
- Anti-bot (DataDome) → Playwright headless furtif + **proxies résidentiels rotatifs** (coût mensuel récurrent).
- Rate-limit, backoff, détection de blocage → **coupe-circuit** (désactivation auto).

## Lancer (squelette)
```bash
npm install
npm start        # renvoie 501 tant que LISTINGS_MODULE_ENABLED != true
```
