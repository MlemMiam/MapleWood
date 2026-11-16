# One More Line — Maplewood High School 3D

Jeu d'exploration et de narration 3D à la troisième personne dans un lycée américain, construit avec **Three.js**, **@pixiv/three-vrm**, **Rapier (WASM)**, **TypeScript strict**, **React / Tailwind CSS** et **Howler.js**.

## Fonctionnalités principales

- **Personnages VRM & Personnalisation** : support des modèles `.vrm` (`FemPlayer.vrm`, `MalePlayer.vrm`, `Florie.vrm`, `Helen.vrm`), choix de coiffure, couleur et vêtements (`PlayerCustomizationModal`, `PlayerHairSystem`, `PlayerClothesSystem`).
- **Cinématiques & Galerie de Souvenirs** : cinématique d'introduction (Florie) et cinématique post-personnalisation *« A New Beginning »* (`PostCustomCutscene`), rejouables à tout moment depuis la galerie (`CutsceneGalleryModal`), avec synchronisation labiale, expressions faciales et blipping vocal.
- **Animations Blender & Procédurales** : clips VRM normalisés exportés depuis Blender (`player_sit.json`, `player_inspect_hands.json`, `florie_arrival.json`) combinés à des animations procédurales (`StylizedWalk`, `FlorieVRM`).
- **Bâtiment principal 1:1 & Interactions** : hall d'accueil modélisé, double porte d'entrée interactive (`MainBuilding.ts`), quêtes/dialogues (`QuestLogic`, `DialogueUI`), sièges interactifs, carte du campus et minimap.

## Prérequis

- **Node.js** `^20.19.0` ou `>=22.12.0` (exigé par Vite 8)
- **npm** >= 9
- Navigateur compatible WebGL2

## Installation et lancement

```bash
npm install
npm run dev
```

Ouvrez ensuite `http://localhost:3000`.

### Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur de développement sur le port 3000 |
| `npm run build` | Compile le bundle de production dans `dist/` |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le typage TypeScript strict (`tsc --noEmit`) |
| `npm test` | Exécute les tests unitaires (`node:test` via `tsx`) |
| `npm run clean` | Supprime `dist/` et `server.js` |

### Configuration

Copiez `.env.example` vers `.env` et renseignez éventuellement `GEMINI_API_KEY`. La clé est utilisée par les endpoints serveur `/api/intro/*` (génération de la vidéo et de la voix d'introduction) ; sans clé, ces routes répondent `400` et le reste du jeu fonctionne normalement.

## Contrôles

| Action | Clavier / Souris | Manette |
|---|---|---|
| Déplacement | ZQSD / WASD / Flèches | Stick gauche |
| Courir | Shift | LT |
| Sauter | Espace | A |
| Interagir | E | X |
| Carte complète | M | Select |
| Menu Pause / Paramètres | Échap / P | Start |
| Caméra 3e personne | Souris (clic pour verrouiller ou glisser) | Stick droit |
| Zoom caméra | Molette | — |
| Mode Debug (FPS / Draw calls) | F3 | — |

## Dépendances principales

- **`three` & `@types/three`** : moteur de rendu 3D WebGL (PBR, ombres PCFSoft, `RoomEnvironment`, `Sky`, `GLTFLoader`).
- **`@pixiv/three-vrm`** : chargement, squelette humanoïde normalisé, expressions et look-at des personnages VRM.
- **`@dimforge/rapier3d-compat`** : moteur physique WASM (`KinematicCharacterController`, collisions de portes cinématiques).
- **`howler` & `@types/howler`** : gestion unifiée du volume global et lecture des ambiances/effets.
- **`react`, `react-dom`, `lucide-react`, `tailwindcss`** : interface utilisateur, personnalisation, menus et overlays de cinématiques.

## Structure du projet

```
src/
├── engine/         # Renderer, Physics (Rapier), CameraController, InputManager, AudioManager, PostCustomCutscene
├── world/
│   ├── buildings/  # MainBuilding, Gymnasium, Library, Cafeteria
│   ├── exterior/   # Courtyard, Fencing
│   └── props/      # Door, Locker, Desk, Chair, Whiteboard, Bookshelf, VendingMachine, Bench
├── character/      # Player, FlorieVRM, NPC, StylizedWalk, BlenderSitAnim, BlenderCutsceneAnim, Hair/Clothes
├── interaction/    # InteractionSystem, Interactable, QuestLogic, DialogueUI
├── ui/             # LoadingScreen, TitleOverlay, HUD, Minimap, CampusMapModal, CutsceneGalleryModal, Customization
├── data/           # rooms.json, npcs.json
└── utils/          # Materials, Geometry, CampusLayout, Debug, i18n
```

## Ajouter une pièce ou un bâtiment

1. Ajoutez la définition de la pièce (`id`, `name`, `building`, `position`, `size`, `doors`, `npcs`) dans `src/data/rooms.json`.
2. Construisez ses murs et ouvertures dans `src/world/buildings/` à l'aide de `buildWallWithOpenings` (`src/utils/Geometry.ts`).
3. Ajoutez une porte interactive avec `createDoor(...)` (`src/world/props/Door.ts`).

## Importer un modèle GLTF / GLB

Déposez vos fichiers `.glb` dans `public/assets/models/`, puis chargez-les avec le `GLTFLoader` de Three.js (`three/addons/loaders/GLTFLoader.js`) ou avec le loader VRM existant dans `src/character/`.

## Tests et intégration continue

Les tests unitaires couvrent la logique de quêtes et la validation de l'architecture du campus :

```bash
npm test
```

Le workflow GitHub Actions (`.github/workflows/ci.yml`) exécute le typage, les tests et le build de production à chaque push sur `main` et à chaque pull request.

## Licence

MIT — voir [LICENSE](LICENSE).
