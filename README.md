# Maplewood High School 3D — Les Aigles de Maplewood

Carte interactive en 3D d'un lycée américain jouable à la troisième personne, construite avec **Three.js**, **Rapier (WASM)**, **TypeScript strict**, **Tailwind CSS** et **Howler.js**. Toutes les textures, géométries architecturales et effets sonores sont générés de manière procédurale sans dépendance externe.

## Prérequis

- **Node.js** >= 18
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
| `npm run dev` | Lance le serveur de développement Vite sur le port 3000 |
| `npm run build` | Compile le bundle de production dans `dist/` |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le typage TypeScript strict (`tsc --noEmit`) |

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

## Justification des dépendances

- **`three` & `@types/three`** : Moteur de rendu 3D WebGL (PBR, ombres PCFSoft, `RoomEnvironment`, `Sky`, `UnrealBloomPass`, `InstancedMesh`, `GLTFLoader`).
- **`@dimforge/rapier3d-compat`** : Moteur physique WASM performant incluant le `KinematicCharacterController` (capsule 1,75 m, franchissement de seuils, collisions de portes cinématiques).
- **`howler` & `@types/howler`** : Gestion unifiée du volume global et de la lecture en boucle des sons synthétisés en WAV.
- **`stats.js` & `@types/stats.js`** : Panneau de mesure FPS / latence activable à la demande via `F3`.
- **`react`, `react-dom`, `lucide-react`, `tailwindcss`** : Couche UI/HUD accessible, réactive et découplée de la boucle 60 FPS.

## Structure du projet

```
src/
├── engine/         # Renderer, Physics (Rapier), CameraController, InputManager, InputBindings, AudioManager
├── world/
│   ├── buildings/  # MainBuilding, AdminOffice, ScienceWing, Gymnasium, Cafeteria, Library
│   ├── exterior/   # Courtyard, ParkingLot, SportsField, Fencing
│   └── props/      # Door, Locker, Desk, Chair, Whiteboard, Bookshelf, VendingMachine, Bench
├── character/      # Player, PlayerAnimations, NPC
├── interaction/    # InteractionSystem, Interactable, QuestLogic, DialogueUI
├── ui/             # LoadingScreen, TitleOverlay, HUD, Minimap, CampusMapModal, SettingsMenu
├── data/           # rooms.json, npcs.json
└── utils/          # Materials, Geometry, CampusLayout, ModelLoader, Debug, i18n
```

## Ajouter une pièce ou un bâtiment

1. Ajoutez la définition de la pièce (`id`, `name`, `building`, `position`, `size`, `doors`, `npcs`) dans `src/data/rooms.json`.
2. Construisez ses murs et ouvertures dans le module correspondant sous `src/world/buildings/` à l'aide de `buildWallWithOpenings` (`src/utils/Geometry.ts`), qui génère automatiquement les géométries et les colliders Rapier.
3. Ajoutez une porte interactive avec `createDoor(...)` (`src/world/props/Door.ts`).

## Importer un modèle GLTF / GLB

Déposez vos fichiers `.glb` dans `public/assets/models/` et chargez-les via `loadOptionalGltfModel('/assets/models/mon_modele.glb', fallbackBuilder)` depuis `src/utils/ModelLoader.ts`.
