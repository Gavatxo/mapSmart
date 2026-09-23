# Carte terrains agence

Version exportable du prototype de carte interactive.

## Contenu

- `index.html` : interface, styles et logique JavaScript du site.
- `assets/terrain-agence.kml` : les 83 terrains et les tracés exportés depuis Google My Maps.

## Lancer le projet en local

Le fichier KML est chargé par JavaScript. Il faut donc servir le dossier avec un petit serveur local plutôt que d'ouvrir directement `index.html`.

### Avec VS Code

1. Ouvrir ce dossier dans VS Code.
2. Installer l'extension **Live Server** si nécessaire.
3. Faire un clic droit sur `index.html`.
4. Choisir **Open with Live Server**.

### Avec Python

Depuis ce dossier :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000` dans le navigateur.

## Technologies utilisées

- HTML, CSS et JavaScript sans framework.
- Leaflet pour la carte.
- Fonds de carte OpenStreetMap.
- Nominatim pour rechercher les adresses.
- Valhalla pour calculer les zones en temps de route ou en distance routière.
- Stockage local du navigateur pour mémoriser un fichier KML importé.

## Organisation actuelle du code

Le prototype tient volontairement dans un seul fichier `index.html`. Pour développer davantage le projet, la première évolution conseillée est de séparer :

- le CSS dans `styles.css` ;
- le JavaScript dans `app.js` ;
- les données et paramètres dans un fichier de configuration ;
- le calcul routier derrière une API maîtrisée pour un usage professionnel régulier.

## Mise à jour des terrains

Le fichier d'origine se trouve dans `assets/terrain-agence.kml`. L'interface permet également d'importer un nouveau fichier KML depuis le navigateur ; cet import reste enregistré sur l'appareil utilisé.

