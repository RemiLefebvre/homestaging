# Intérieurs de base

Dépose ici les images d'appartements vides qui servent de point de départ au générateur.

## Formats acceptés

- **JPEG** (`.jpg`, `.jpeg`) et **PNG** (`.png`) uniquement.
- Taille maximum : **5 Mo** par fichier.
- Le MIME est vérifié côté serveur via les *magic bytes* — renommer un `.webp` en `.jpg` ne marche pas.
- WebP, HEIC, GIF, BMP, AVIF sont rejetés.

## Ajout d'une nouvelle image

1. Dépose le fichier dans ce dossier (`public/base-interiors/`).
2. Ajoute une entrée dans `manifest.json` :

```json
[
  {
    "id": "studio-baie-vitree",
    "label": "Studio avec baie vitrée",
    "filename": "studio-baie-vitree.jpg",
    "description": "Studio de 25m², grande baie vitrée sud, parquet clair"
  }
]
```

### Champs

- `id` (string, unique) — identifiant stable, utilisé par l'API. Caractères autorisés : `[a-zA-Z0-9_.-]`.
- `label` (string) — titre affiché dans la grille de sélection.
- `filename` (string) — nom du fichier dans ce dossier. Même contrainte de caractères que `id`.
- `description` (string, optionnel) — sous-titre affiché dans la carte.

## Conseils pour de bonnes bases

- Pièce vraiment vide (pas déjà meublée) pour laisser l'IA proposer un agencement.
- Cadrage large, un seul point de vue par image.
- Bonne lumière, murs neutres — ça aide l'IA à générer un meuble cohérent.
