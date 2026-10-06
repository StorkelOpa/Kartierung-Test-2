# Kartierung Baumschulenweg

Digitale Kartierung der Aneignung öffentlicher Räume rund um den S-Bahnhof Berlin-Baumschulenweg: 42 Sticker und Graffiti sowie 8 Aushänge, erhoben im Dezember 2024 per Smartphone mit [QField](https://qfield.org/) und ausgewertet in [QGIS](https://qgis.org/).

**Live:** https://storkelopa.github.io/Kartierung-Test-2/

## Funktionen

- Karte auf Basis von [basemap.de](https://basemap.de) (Web Raster Grau)
- Legende mit Filtern je Kategorie
- Auswertung: Verteilung nach Zweck, Thema und Zustand (Balken filtern die Karte)
- Popups mit Foto, Kategorie, Zustand, Datum und Beschreibung

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Seitenstruktur |
| `js/app.js` | Karte, Filter, Diagramme |
| `css/app.css` | Gestaltung (angelehnt an [cvogler.eu](https://cvogler.eu)) |
| `data/` | Erhebungsdaten als GeoJSON (aus QGIS exportiert) |
| `images/` | Fotos der Funde |

Ohne Build-Schritt: `index.html` über einen beliebigen Webserver öffnen, z. B. `python -m http.server`.
