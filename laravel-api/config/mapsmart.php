<?php

return [
    // Isochrones : instance Valhalla auto-hébergée (usage commercial interdit sur l'instance publique).
    'valhalla_url' => env('VALHALLA_URL', 'http://127.0.0.1:8002'),

    // Géocodage : Base Adresse Nationale (gratuit, illimité).
    'ban_url' => env('BAN_URL', 'https://api-adresse.data.gouv.fr'),

    // Découpage administratif (résolution point → commune INSEE).
    'geo_api_url' => env('GEO_API_URL', 'https://geo.api.gouv.fr'),

    // Demandes de Valeurs Foncières : fichiers geo-dvf officiels (Etalab), CSV par commune/année.
    'dvf' => [
        'files_url' => env('DVF_FILES_URL', 'https://files.data.gouv.fr/geo-dvf/latest/csv'),
        'years' => array_filter(explode(',', env('DVF_YEARS', '2024,2025'))),
    ],

    // Module portails immo (agrégateur/redirection). Désactivé par défaut : greffon isolé, jamais critique.
    'listings' => [
        'enabled' => env('LISTINGS_MODULE_ENABLED', false),
        'scraper_url' => env('SCRAPER_URL', 'http://127.0.0.1:4000'),
    ],
];
