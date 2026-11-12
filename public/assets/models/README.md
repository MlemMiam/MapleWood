# Modèles GLTF / GLB — Maplewood High School 3D

Ce dossier accueille des modèles 3D externes au format `.glb` ou `.gltf` pour remplacer ou enrichir les géométries procédurales du campus.

## Utilisation dans le code

Le module `src/utils/ModelLoader.ts` expose `loadOptionalGltfModel(url, fallbackBuilder)` basé sur `GLTFLoader` de Three.js :

```ts
import { loadOptionalGltfModel } from '@/src/utils/ModelLoader';

const customModel = await loadOptionalGltfModel('/assets/models/player.glb', () =>
  createProceduralCharacter()
);
```

## Convention d'échelle et d'orientation

- **Unité** : 1 unité = 1 mètre.
- **Pivot** : centré en X/Z et posé au sol (`y = 0`).
- **Orientation avant** : axe `-Z` (standard Three.js).
- **Personnages** : hauteur recommandée `1.75 m`.
