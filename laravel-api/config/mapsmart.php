<?php

return [
    // Isochrones : instance Valhalla auto-hébergée (usage commercial interdit sur l'instance publique).
    'valhalla_url' => env('VALHALLA_URL', 'http://127.0.0.1:8002'),

    // Géocodage : Base Adresse Nationale (gratuit, illimité).
    'ban_url' => env('BAN_URL', 'https://api-adresse.data.gouv.fr'),

    // Données de Valeurs Foncières (open data).
    'dvf_url' => env('DVF_URL', 'https://api.cquest.org/dvf'),

    // Module portails immo (agrégateur/redirection). Désactivé par défaut : greffon isolé, jamais critique.
    'listings' => [
        'enabled' => env('LISTINGS_MODULE_ENABLED', false),
        'scraper_url' => env('SCRAPER_URL', 'http://127.0.0.1:4000'),
    ],
];
