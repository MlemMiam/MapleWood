import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameRenderer, type TimePhase, type WeatherType } from './engine/Renderer';
import { PhysicsWorld } from './engine/Physics';
import { InputManager } from './engine/InputManager';
import { CameraController } from './engine/CameraController';
import { AudioManager } from './engine/AudioManager';
import {
  type GameSettings,
  loadSettings,
  saveSettings,
} from './engine/InputBindings';
import { createMaterialLibrary } from './utils/Materials';
import {
  CAMPUS_DATA,
  findRoomAtPosition,
} from './utils/CampusLayout';
import { isOnCarpet } from './world/buildings/MainBuilding';
import { DebugOverlay } from './utils/Debug';
import { InteractionSystem } from './interaction/InteractionSystem';
import {
  type QuestState,
  createInitialQuestState,
  getPrincipalSummaryMessage,
  pickupLostNotebook,
  receiveLibraryBook,
  recordBasketballScore,
  recordRoomVisit,
  startQuest,
  turnInLostNotebook,
} from './interaction/QuestLogic';
import { CampusWorld } from './world/World';
import { Player } from './character/Player';
import { charToFrenchSpeechSample, type VisemeKey } from './character/FlorieVRM';
import { type CampusNPC, type NPCChoiceData, type NPCData, spawnCampusNPCs } from './character/NPC';
import { LoadingScreen } from './ui/LoadingScreen';
import { TitleOverlay } from './ui/TitleOverlay';
import { HUD } from './ui/HUD';
import { type MinimapNpcMarker } from './ui/Minimap';
import { type ActiveModalContent, DialogueUI } from './interaction/DialogueUI';
import type { CutsceneGalleryId } from './ui/CutsceneGalleryModal';
import { IntroCutsceneOverlay } from './ui/IntroCutsceneOverlay';
import { PostCustomCutsceneOverlay } from './ui/PostCustomCutsceneOverlay';
import { SettingsMenu } from './ui/SettingsMenu';
import {
  POST_CUSTOM_CUTSCENE_DURATION,
  PostCustomCutsceneDirector,
  type CutsceneSubtitleState,
} from './engine/PostCustomCutscene';
import {
  IntroPresentationAndChoiceModal,
  type PlayerChoiceSelection,
} from './ui/IntroPresentationAndChoiceModal';
import { FatalErrorScreen } from './ui/FatalErrorScreen';
import {
  DEFAULT_PLAYER_HAIR_SELECTION,
  type PlayerGender,
  type PlayerHairSelection,
} from './character/PlayerHairSystem';
import {
  DEFAULT_FEMALE_CLOTHES_SELECTION,
  DEFAULT_PLAYER_DISPLAY_OPTIONS,
  getDefaultClothesSelection,
  type PlayerClothesSelection,
  type PlayerDisplayOptions,
} from './character/PlayerClothesSystem';

import { CampusMapModal } from './ui/CampusMapModal';
import { ElevatorModal } from './ui/ElevatorModal';

// Heavy overlays are loaded on demand so the initial 3D bundle stays smaller.
const PlayerCustomizationModal = lazy(() =>
  import('./ui/PlayerCustomizationModal').then((module) => ({
    default: module.PlayerCustomizationModal,
  }))
);
const CutsceneGalleryModal = lazy(() =>
  import('./ui/CutsceneGalleryModal').then((module) => ({
    default: module.CutsceneGalleryModal,
  }))
);

function ModalLoadingOverlay() {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 text-sm font-medium text-white/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      Chargement…
    </div>
  );
}

type GamePhase =
  | 'loading'
  | 'title'
  | 'intro'
  | 'presentation2d'
  | 'genderChoice'
  | 'customization'
  | 'postCustomCutscene'
  | 'playerChoice'
  | 'playing'
  | 'paused'
  | 'map'
  | 'dialogue';

const INTRO_DURATION = 11.65;

const LOADING_TIPS = [
  'Utilisez la touche E près des portes, casiers, tableaux et ordinateurs pour interagir.',
  'Maintenez Shift pour sprinter à travers la cour centrale.',
  'Appuyez sur M à tout moment pour ouvrir le plan complet du lycée.',
  'Parlez à Mme Parker dans le hall d\'entrée et à Léo près des casiers pour démarrer les missions.',
  'Appuyez sur Échap ou P pour ouvrir le menu pause et ajuster les paramètres.',
  'Faites défiler la molette pour zoomer la caméra à la troisième personne.',
  'Appuyez sur F3 pour afficher le mode Debug (FPS, draw calls).',
  'Rejouez les cinématiques à tout moment depuis la galerie des souvenirs.',
];

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [loadProgress, setLoadProgress] = useState(10);
  const [loadingTip] = useState(
    () => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]
  );
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const cursorCoordsRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.5 : 0,
  });
  const cursorElRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Throttled HUD state
  const [zoneName, setZoneName] = useState('Cour Centrale');
  const [buildingName, setBuildingName] = useState('Extérieur');
  const [zoneToast, setZoneToast] = useState<string | null>(null);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [hudPos, setHudPos] = useState({ x: 0, y: 0.05, z: 6, yaw: 0, stamina: 100 });
  const [npcMarkers, setNpcMarkers] = useState<MinimapNpcMarker[]>([]);
  const [questState, setQuestState] = useState<QuestState>(() => createInitialQuestState());
  const [activeModal, setActiveModal] = useState<ActiveModalContent | null>(null);
  const [elevatorModal, setElevatorModal] = useState<{
    side: 'east' | 'west';
    currentFloor: number;
    onSelectFloor: (floorIndex: number) => void;
    onCancel?: () => void;
  } | null>(null);
  const [, setVrmFileName] = useState<string | null>('Florie.vrm');
  const [introTime, setIntroTime] = useState(0);
  const [cutsceneSub, setCutsceneSub] = useState<CutsceneSubtitleState | null>(null);
  const [showCutsceneGallery, setShowCutsceneGallery] = useState(false);
  const postCutsceneElapsedRef = useRef(0);
  const postCutsceneDirectorRef = useRef<PostCustomCutsceneDirector | null>(null);
  const galleryReturnRef = useRef<{ x: number; y: number; z: number; yaw: number } | null>(null);
  const [playerGender, setPlayerGender] = useState<PlayerGender>('female');
  const [hairSelection, setHairSelection] = useState<PlayerHairSelection>(
    DEFAULT_PLAYER_HAIR_SELECTION
  );
  const [clothesSelection, setClothesSelection] = useState<PlayerClothesSelection>(
    DEFAULT_FEMALE_CLOTHES_SELECTION
  );
  const [displayOptions, setDisplayOptions] = useState<PlayerDisplayOptions>(
    DEFAULT_PLAYER_DISPLAY_OPTIONS
  );
  const hasCompletedIntroChoiceRef = useRef<boolean>(false);
  const hasPlayedPostCustomCutsceneRef = useRef<boolean>(false);
  const npcVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const npcAnalyserRef = useRef<AnalyserNode | null>(null);
  const npcAnalyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const playNpcVoiceUrl = useCallback((_url?: string | null) => {
    if (npcVoiceAudioRef.current) {
      npcVoiceAudioRef.current.pause();
      npcVoiceAudioRef.current.currentTime = 0;
    }
  }, []);

  const handleCharacterBlip = useCallback((ch: string, speaker: string) => {
    const now = performance.now();
    if (now - (lastBlipTimeRef.current ?? 0) > 400) {
      dialogueSpeechStartRef.current = now;
    }
    lastBlipTimeRef.current = now;
    lastBlipCharRef.current = ch;
    const s = speaker.toLowerCase();
    const voice =
      s.includes('parker') || s.includes('helen')
        ? 'helen'
        : s.includes('florie')
          ? 'florie'
          : 'student';
    engineRefs.current.audio?.playCharacterBlip(ch, voice);
  }, []);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [timePhase, setTimePhase] = useState<TimePhase>('morning');
  const vrmInputRef = useRef<HTMLInputElement | null>(null);

  // Refs synced for the 60Hz loop so HUD state updates never recreate the WebGL canvas
  const phaseRef = useRef<GamePhase>('loading');
  const settingsRef = useRef<GameSettings>(settings);
  const questRef = useRef<QuestState>(questState);
  const lastWeatherRef = useRef<WeatherType>('sunny');
  const lastTimePhaseRef = useRef<TimePhase>('morning');
  const activeNpcIdRef = useRef<string | null>(null);
  const lastBlipTimeRef = useRef<number>(0);
  const lastBlipCharRef = useRef<string>('');
  const dialogueSpeechStartRef = useRef<number>(0);
  const showCutsceneGalleryRef = useRef(false);
  showCutsceneGalleryRef.current = showCutsceneGallery;
  const elevatorModalRef = useRef(elevatorModal);
  elevatorModalRef.current = elevatorModal;
  const activeModalRef = useRef(activeModal);
  activeModalRef.current = activeModal;
  const introElapsedRef = useRef(0);
  const introStageFlagsRef = useRef({
    sparkle0: false,
    wave1: false,
    wave2: false,
    beckon: false,
    wave3: false,
    doorOpened: false,
  });

  const titleFrameCounter = useRef(0);

  const engineRefs = useRef<{
    renderer?: GameRenderer;
    physics?: PhysicsWorld;
    input?: InputManager;
    cameraCtrl?: CameraController;
    audio?: AudioManager;
    player?: Player;
    world?: CampusWorld;
    npcs?: CampusNPC[];
    debug?: DebugOverlay;
  }>({});

  const updatePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
    document.body.dataset.state =
      next === 'dialogue' || next === 'map' ? 'playing' : next;
    const { input, audio, renderer, player } = engineRefs.current;
    if (player) {
      player.rig.root.visible = next !== 'title';
    }
    if (
      next === 'paused' ||
      next === 'dialogue' ||
      next === 'map' ||
      next === 'title' ||
      next === 'intro' ||
      next === 'presentation2d' ||
      next === 'genderChoice' ||
      next === 'customization' ||
      next === 'postCustomCutscene' ||
      next === 'playerChoice'
    ) {
      input?.exitPointerLock();
      input?.clearAll();
    }
    // Optimize fluidity on title screen: disable expensive shadows/render cost
    renderer?.setTitleMode(next === 'title');
    if (next === 'paused') {
      audio?.pauseLoops();
    } else if (next === 'title') {
      audio?.startTitleMusic();
    } else if (next === 'intro') {
      audio?.pauseLoops();
      audio?.stopTitleMusic();
      audio?.startAnimeIntroMusic();
    } else if (next === 'genderChoice' || next === 'customization') {
      audio?.pauseLoops();
      audio?.stopTitleMusic();
      audio?.startCustomizationMusic();
      if (next === 'genderChoice') {
        audio?.playAnimeIntroSfx('sparkle');
      }
    } else if (next === 'postCustomCutscene') {
      audio?.pauseLoops();
      audio?.stopTitleMusic();
      audio?.startAnimeIntroMusic();
    } else if (next === 'presentation2d') {
      audio?.pauseLoops();
      audio?.stopTitleMusic();
      audio?.playAnimeIntroSfx('sparkle');
    } else if (next === 'playerChoice') {
      audio?.pauseLoops();
      audio?.stopTitleMusic();
      audio?.stopAnimeIntroMusic();
      audio?.stopCustomizationMusic();
      audio?.playAnimeIntroSfx('beckon');
    } else if (next === 'playing') {
      audio?.stopTitleMusic();
      audio?.startAmbient();
      audio?.resumeLoops();
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setZoneToast(msg);
    window.setTimeout(() => {
      setZoneToast((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  const applyQuestUpdate = useCallback((updater: (prev: QuestState) => QuestState) => {
    setQuestState((prev) => {
      const next = updater(prev);
      questRef.current = next;
      return next;
    });
  }, []);

  // Sync accessibility DOM attributes whenever settings change
  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
    document.body.dataset.colorblind = settings.colorblindMode;
    document.body.dataset.fontScale = settings.fontScale;

    const { renderer, input, audio } = engineRefs.current;
    renderer?.setQuality(settings.graphicsQuality);
    input?.setBindings(settings.bindings);
    if (!muted) {
      audio?.setVolume(settings.masterVolume);
    }
  }, [settings, muted]);

  const isMenuOpen =
    phase !== 'playing' ||
    Boolean(elevatorModal) ||
    showCutsceneGallery ||
    Boolean(activeModal) ||
    Boolean(fatalError);
  const showGameCursor =
    isMenuOpen || (settings.customCursorEnabled && !isPointerLocked);

  // Custom themed game cursor (visible in all menus and free-cursor mode; hidden only during active pointer lock)
  useEffect(() => {
    const syncCursorDom = (x: number, y: number) => {
      cursorCoordsRef.current = { x, y };
      if (cursorElRef.current) {
        cursorElRef.current.style.left = `${x}px`;
        cursorElRef.current.style.top = `${y}px`;
      }
    };

    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement) return;
      syncCursorDom(e.clientX, e.clientY);
    };

    const onPointerLockChange = () => {
      const locked = Boolean(document.pointerLockElement);
      setIsPointerLocked(locked);
      if (!locked) {
        syncCursorDom(window.innerWidth * 0.5, window.innerHeight * 0.5);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat) {
        e.preventDefault();
        setSettings((s) => {
          const next = !s.customCursorEnabled;
          const { input } = engineRefs.current || {};
          const inGameplay =
            phaseRef.current === 'playing' &&
            !elevatorModalRef.current &&
            !showCutsceneGalleryRef.current &&
            !activeModalRef.current;
          if (inGameplay) {
            if (next) input?.exitPointerLock();
            else input?.requestPointerLock();
          }
          return { ...s, customCursorEnabled: next };
        });
      }
    };

    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    window.addEventListener('mousemove', onMove, { capture: true, passive: true });
    window.addEventListener('pointerdown', onMove, { capture: true, passive: true });
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('mousemove', onMove, { capture: true });
      window.removeEventListener('pointerdown', onMove, { capture: true });
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const hideNativeCursor = showGameCursor || isPointerLocked;
    const cursorVal = hideNativeCursor ? 'none' : 'auto';
    document.documentElement.style.cursor = cursorVal;
    document.body.style.cursor = cursorVal;
    const canvas = document.getElementById('canvas-container');
    if (canvas) canvas.style.cursor = cursorVal;

    if (showGameCursor && (cursorCoordsRef.current.x < 0 || cursorCoordsRef.current.y < 0)) {
      const cx = window.innerWidth * 0.5;
      const cy = window.innerHeight * 0.5;
      cursorCoordsRef.current = { x: cx, y: cy };
      if (cursorElRef.current) {
        cursorElRef.current.style.left = `${cx}px`;
        cursorElRef.current.style.top = `${cy}px`;
      }
    }
  }, [showGameCursor, isPointerLocked]);

  // Main Engine Lifecycle (mounts ONCE)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;

    const handleContextLost = () => {
      setFatalError(
        'Le contexte graphique WebGL a été perdu. Rechargez le jeu pour reprendre la partie.'
      );
    };
    const handleContextRestored = () => {
      setFatalError(null);
    };
    window.addEventListener('maplewood:webgl-context-lost', handleContextLost);
    window.addEventListener('maplewood:webgl-context-restored', handleContextRestored);

    const boot = async () => {
      setLoadProgress(20);
      const physics = new PhysicsWorld();
      await physics.init();
      if (disposed) return;

      setLoadProgress(45);
      const gameRenderer = new GameRenderer(container);
      gameRenderer.setQuality(settingsRef.current.graphicsQuality);
      const mats = createMaterialLibrary(gameRenderer.renderer, gameRenderer.isSoftwareGl);
      const audio = new AudioManager(settingsRef.current.masterVolume);
      audio.startTitleMusic();
      const unlockTitleAudio = () => {
        if (phaseRef.current === 'title') {
          audio.startTitleMusic();
        }
      };
      window.addEventListener('pointerdown', unlockTitleAudio, { passive: true });
      window.addEventListener('keydown', unlockTitleAudio, { passive: true });
      const input = new InputManager(
        gameRenderer.renderer.domElement,
        settingsRef.current.bindings
      );
      const cameraCtrl = new CameraController();
      const interactions = new InteractionSystem();
      const debug = new DebugOverlay();

      setLoadProgress(70);

      const openInfoModal = (title: string, subtitle: string, body: string, imageUrl?: string) => {
        audio.playInteractDing();
        setActiveModal({ kind: 'info', title, subtitle, body, imageUrl });
        updatePhase('dialogue');
      };

      const world = new CampusWorld(
        gameRenderer.scene,
        physics,
        mats,
        interactions,
        {
          onDoorToggle: () => {
            audio.playDoor();
            applyQuestUpdate((q) => ({ ...q, doorsOpenedCount: q.doorsOpenedCount + 1 }));
          },
          onInspectLocker: (label) => {
            openInfoModal(
              label,
              'Couloir Principal',
              'Vous ouvrez le casier métallique : manuels de cours, emploi du temps des Aigles et un sweat bleu marine pliés proprement.'
            );
          },
          onInspectWhiteboard: (subject) => {
            openInfoModal(
              `Tableau — ${subject}`,
              'Support de cours',
              `Notes inscrites au tableau pour le cours de ${subject} : objectifs de la semaine, exercices d'application et rappel du prochain devoir surveillé.`
            );
          },
          onUseComputer: (location) => {
            openInfoModal(
              `Intranet Maplewood — ${location}`,
              'Poste informatique scolaire',
              'Portail élève connecté : 32 salles actives sur le campus, actualités des clubs (Robotique, Basket, Journal), et accès libre aux ressources documentaires.'
            );
          },
          onUseVending: (kind) => {
            audio.playInteractDing();
            player.stamina = player.maxStamina;
            showToast(`Distributeur (${kind}) : Endurance restaurée à 100% !`);
          },
          onReadBook: (title) => {
            openInfoModal(
              title,
              'Bibliothèque de Maplewood',
              `Vous feuilletez « ${title} ». Cet ouvrage retrace les traditions du lycée depuis 1994, les victoires sportives des Aigles et les projets scientifiques des élèves.`
            );
          },
          onReadNotice: (title, details) => {
            openInfoModal(title, 'Annonces du campus', details);
          },
          onViewBrochure: () => {
            openInfoModal(
              'Brochure de bienvenue — Maplewood',
              'Accueil',
              'Bienvenue à Maplewood High School !\nDécouvre ton nouveau lycée, ses clubs, ses salles et ses événements. Bonne rentrée !',
              '/assets/ui/brochure_maplewood.svg'
            );
          },
          onUseFountain: () => {
            audio.playInteractDing();
            player.stamina = player.maxStamina;
            showToast('Fontaine centrale : Vous reprenez votre souffle (Endurance 100%).');
          },
          onUseSink: () => {
            audio.playInteractDing();
            showToast('Vous vous lavez les mains.');
          },
          onToggleLights: (wing) => {
            const on = world.toggleWingLights(wing);
            audio.playInteractDing();
            showToast(on ? 'Éclairage du couloir allumé.' : 'Éclairage du couloir tamisé.');
          },
          onPullFireAlarm: () => {
            audio.playInteractDing();
            openInfoModal(
              'Boîtier Alarme Incendie',
              'Sécurité du Campus',
              'Système de sécurité opérationnel. En l\'absence d\'urgence réelle, il est strictement interdit de déclencher l\'alarme !'
            );
          },
          onPickupNotebook: () => {
            audio.playInteractDing();
            applyQuestUpdate(pickupLostNotebook);
            showToast('Carnet bleu de Léo récupéré ! Rapportez-le près des casiers.');
          },
          onShootBasketball: () => {
            audio.playInteractDing();
            setActiveModal({
              kind: 'basketball',
              title: 'Défi de Lancers Francs',
              subtitle: 'Gymnase des Aigles',
              body: '',
            });
            updatePhase('dialogue');
          },
          onSit: (x, y, z, yaw) => {
            if (player.isSeated()) {
              player.standUp();
            } else {
              player.sitAt(x, y, z, yaw);
            }
          },
          onOpenElevatorMenu: (side, currentFloor, onSelectFloor, onCancel) => {
            engineRefs.current.input?.exitPointerLock();
            setElevatorModal({ side, currentFloor, onSelectFloor, onCancel });
          },
          onElevatorArrive: () => {
            audio.playInteractDing();
          },
        }
      );

      setLoadProgress(88);

      const player = new Player(gameRenderer.scene, physics, CAMPUS_DATA.spawn, (loadedLabel) => {
        setVrmFileName(loadedLabel);
      });
      await player.readyPromise;
      cameraCtrl.resetToPlayer(player.position, CAMPUS_DATA.spawn.yaw);

      const npcs = spawnCampusNPCs(gameRenderer.scene, interactions, (npcData: NPCData) => {
        audio.playInteractDing();
        activeNpcIdRef.current = npcData.id;
        playNpcVoiceUrl(npcData.greetingAudioUrl);

        // Special dynamic replies for quest states
        let body = npcData.greeting;
        if (npcData.id === 'npc-nervous-student') {
          if (questRef.current.hasNotebookItem && questRef.current.quests['quest-lost-notebook'].status !== 'completed') {
            applyQuestUpdate(turnInLostNotebook);
            body = 'Incroyable, tu as retrouvé mon carnet de biologie ! Mille mercis, tu me sauves la vie pour le contrôle !';
          } else if (questRef.current.quests['quest-lost-notebook'].status === 'completed') {
            body = 'Merci encore pour le carnet ! Je suis prêt pour le cours maintenant.';
          }
        }

        setActiveModal({
          kind: 'npc',
          title: npcData.name,
          subtitle: npcData.role,
          body,
          npc: npcData,
          choices: npcData.choices,
        });
        updatePhase('dialogue');
      }, physics, world.elevatorSystem, world.callbacks);

      engineRefs.current = {
        renderer: gameRenderer,
        physics,
        input,
        cameraCtrl,
        audio,
        player,
        world,
        npcs,
        debug,
      };

      // Precompile shaders on real GPU
      gameRenderer.precompile();
      setLoadProgress(100);

      if (disposed) return;

      // Support ?autostart=1 for automated testing & quick launch
      const params = new URLSearchParams(window.location.search);
      const autostart = params.get('autostart') === '1';

      // Click on canvas locks pointer when playing (never when an overlay menu is open)
      const onCanvasClick = () => {
        if (
          phaseRef.current === 'playing' &&
          !elevatorModalRef.current &&
          !showCutsceneGalleryRef.current &&
          !activeModalRef.current
        ) {
          input.requestPointerLock();
        }
      };
      gameRenderer.renderer.domElement.addEventListener('click', onCanvasClick);

      const timer = new THREE.Timer();
      let hudAccum = 0;
      let lastRoomId = 'courtyard';
      let lastPrompt: string | null = null;
      let lastHudX = NaN;
      let lastHudY = NaN;
      let lastHudZ = NaN;
      let lastHudYaw = NaN;
      let lastHudStamina = NaN;
      const lastNpcCoords = npcs.map(() => ({ x: NaN, y: NaN, z: NaN }));

      const tick = () => {
        if (disposed) return;
        if (gameRenderer.isContextLost()) {
          frameId = requestAnimationFrame(tick);
          return;
        }
        debug.beginFrame();

timer.update();
        const rawDt = timer.getDelta();
        const frameDt = Math.min(rawDt, 0.22);
        const dt = Math.min(rawDt, 0.05);
        const elapsed = timer.getElapsed();
        const curPhase = phaseRef.current;
        const curSettings = settingsRef.current;

        const snap = input.consumeSnapshot();
        if (snap.debugJustPressed) {
          debug.toggle();
        }

        if (curPhase === 'title') {
          cameraCtrl.updateTitleTour(
            gameRenderer.camera,
            elapsed,
            settingsRef.current.titleTravelingEnabled
          );
          gameRenderer.updateEnvironment(
            dt,
            false,
            0,
            4,
            gameRenderer.camera.position,
            true,
            false
          );
          // Throttle expensive world/NPC updates on title screen for smoother FPS
          titleFrameCounter.current = (titleFrameCounter.current + 1) % 3;
          if (titleFrameCounter.current === 0) {
            world.update(
              elapsed,
              dt * 3,
              gameRenderer.camera.position,
              gameRenderer.getWindTime(),
              gameRenderer.getWindStrength()
            );
            for (const npc of npcs) {
              npc.update(dt * 3, gameRenderer.camera.position, false);
            }
          }
        } else if (curPhase === 'intro') {
          introElapsedRef.current += dt;
          const t = introElapsedRef.current;
          const flags = introStageFlagsRef.current;

          if (!flags.sparkle0 && t >= 0.08) {
            flags.sparkle0 = true;
            audio.playAnimeIntroSfx('sparkle');
          }
          if (!flags.wave1 && t >= 0.55) {
            flags.wave1 = true;
            audio.playAnimeIntroSfx('wave');
          }
          if (!flags.beckon && t >= 6.25) {
            flags.beckon = true;
            audio.playAnimeIntroSfx('beckon');
          }

          cameraCtrl.updateIntroCutsceneCamera(gameRenderer.camera, player.position, t);
          player.updateIntroCutscene(t, dt, gameRenderer.camera.position);
          world.update(
            elapsed,
            dt,
            player.position,
            gameRenderer.getWindTime(),
            gameRenderer.getWindStrength()
          );
          for (const npc of npcs) {
            npc.update(dt, player.position, false, undefined, timePhase);
          }

          hudAccum += dt;
          if (hudAccum >= 0.025) {
            hudAccum = 0;
            setIntroTime(t);
          }

          if (t >= INTRO_DURATION) {
            const ret = galleryReturnRef.current;
            if (ret) {
              galleryReturnRef.current = null;
              player.teleport(ret.x, ret.y, ret.z, ret.yaw);
              cameraCtrl.resetToPlayer(player.position, ret.yaw);
              updatePhase('playing');
            } else {
              updatePhase('genderChoice');
            }
          }
        } else if (curPhase === 'postCustomCutscene') {
          postCutsceneElapsedRef.current += dt;
          const t = postCutsceneElapsedRef.current;
          const director = postCutsceneDirectorRef.current;
          // Keep entrance door open until both Florie and player have passed through the doorway (t >= 18.8)
          world.update(elapsed, dt, t >= 18.8 ? player.position : undefined);
          for (const npc of npcs) {
            if (npc.data.id !== 'npc-receptionist') {
              npc.update(dt, player.position, false, undefined, timePhase);
            }
          }
          if (director) {
            const helenNpc = npcs.find((n) => n.data.id === 'npc-receptionist');
            director.update(
              t,
              dt,
              gameRenderer.camera,
              player,
              helenNpc,
              curSettings.masterVolume,
              () => {
                if (world.doors[0] && !world.doors[0].isOpen()) {
                  world.doors[0].toggle();
                  audio.playDoor();
                }
              }
            );
            hudAccum += dt;
            if (hudAccum >= 0.08) {
              hudAccum = 0;
              const nextSub = director.getSubtitle(t);
              setCutsceneSub((prev) =>
                prev?.speaker === nextSub?.speaker && prev?.text === nextSub?.text
                  ? prev
                  : nextSub
              );
            }
          }
          if (t >= POST_CUSTOM_CUTSCENE_DURATION) {
            if (director) {
              const helenNpc = npcs.find((n) => n.data.id === 'npc-receptionist');
              director.dispose(player, helenNpc);
              postCutsceneDirectorRef.current = null;
            }
            setCutsceneSub(null);
            const ret = galleryReturnRef.current;
            if (ret) {
              galleryReturnRef.current = null;
              player.teleport(ret.x, ret.y, ret.z, ret.yaw);
              cameraCtrl.resetToPlayer(player.position, ret.yaw);
              updatePhase('playing');
            } else {
              updatePhase('playerChoice');
            }
          }
        } else if (
          curPhase === 'presentation2d' ||
          curPhase === 'genderChoice' ||
          curPhase === 'customization' ||
          curPhase === 'playerChoice'
        ) {
          // Full-screen modal active (e.g. 3D Hair Studio): skip background campus update & render
        } else if (curPhase === 'playing') {
          if (snap.pauseJustPressed) {
            updatePhase('paused');
          } else if (snap.mapJustPressed && !showCutsceneGalleryRef.current) {
            updatePhase('map');
          } else {
            cameraCtrl.applyInput(
              snap.lookDeltaX,
              snap.lookDeltaY,
              snap.zoomDelta,
              curSettings.mouseSensitivity
            );

            const currentRoom = findRoomAtPosition(
              player.position.x,
              player.position.z,
              player.position.y
            );
            const footstepSurface: 'grass' | 'carpet' | 'hard' =
              currentRoom?.type === 'exterior' && currentRoom.id === 'courtyard'
                ? 'grass'
                : isOnCarpet(player.position.x, player.position.z)
                  ? 'carpet'
                  : 'hard';

            // Update world (elevators, doors) BEFORE player so riding state is fresh
            world.update(
              elapsed,
              frameDt,
              player.position,
              gameRenderer.getWindTime(),
              gameRenderer.getWindStrength(),
              player,
              npcs
            );

            // Sub-step physics & player locomotion in <= 40ms increments for stability at any framerate
            let remaining = frameDt;
            let firstStep = true;
            while (remaining > 0.0001) {
              const stepDt = Math.min(remaining, 0.04);
              const stepSnap = firstStep ? snap : { ...snap, jumpJustPressed: false };
              player.update(stepDt, stepSnap, cameraCtrl.yaw, physics, audio, footstepSurface);
              physics.step(stepDt);
              firstStep = false;
              remaining -= stepDt;
            }

            for (const npc of npcs) {
              npc.update(frameDt, player.position, false, undefined, timePhase);
            }

            cameraCtrl.updateThirdPerson(
              gameRenderer.camera,
              player.position,
              world.cameraColliders,
              frameDt,
              curSettings.reducedMotion
            );

            const questValues = Object.values(questRef.current.quests);
            const completedQuests = questValues.filter((q) => q.status === 'completed').length;
            const totalQuests = questValues.length;
            const isOutdoors = !currentRoom || currentRoom.type === 'exterior';
            gameRenderer.updateEnvironment(
              frameDt,
              curSettings.dayCycleEnabled,
              completedQuests,
              totalQuests,
              player.position,
              isOutdoors,
              true
            );
            const curWeather = gameRenderer.getWeather();
            if (curWeather !== lastWeatherRef.current) {
              lastWeatherRef.current = curWeather;
              setWeather(curWeather);
            }
            const curTimePhase = gameRenderer.getTimePhase();
            if (curTimePhase !== lastTimePhaseRef.current) {
              lastTimePhaseRef.current = curTimePhase;
              setTimePhase(curTimePhase);
            }

            const target = interactions.update(
              gameRenderer.camera,
              player.position,
              player.yaw
            );
            const nextPrompt = target ? target.label : null;
            if (nextPrompt !== lastPrompt) {
              lastPrompt = nextPrompt;
              setInteractPrompt(nextPrompt);
            }

            if (snap.interactJustPressed && target) {
              player.triggerInteractAnim();
              interactions.triggerCurrent();
            }

            // Room change detection & throttled HUD sync (~6.6 Hz)
            if (currentRoom && currentRoom.id !== lastRoomId) {
              lastRoomId = currentRoom.id;
              setZoneName(currentRoom.name);
              setBuildingName(currentRoom.building);
              applyQuestUpdate((q) => recordRoomVisit(q, currentRoom.id));
              showToast(`Zone : ${currentRoom.name}`);
            }

            hudAccum += frameDt;
            if (hudAccum >= 0.15) {
              hudAccum = 0;
              audio.updateFountainSpatialAudio(
                player.position.x,
                player.position.z,
                isOutdoors
              );
              audio.updateWeatherAudio(
                gameRenderer.getRainIntensity(),
                gameRenderer.getWindStrength(),
                isOutdoors
              );
              if (
                Math.abs(player.position.x - lastHudX) > 0.02 ||
                Math.abs(player.position.y - lastHudY) > 0.05 ||
                Math.abs(player.position.z - lastHudZ) > 0.02 ||
                Math.abs(cameraCtrl.yaw - lastHudYaw) > 0.015 ||
                Math.abs(player.stamina - lastHudStamina) > 0.25 ||
                Number.isNaN(lastHudX)
              ) {
                lastHudX = player.position.x;
                lastHudY = player.position.y;
                lastHudZ = player.position.z;
                lastHudYaw = cameraCtrl.yaw;
                lastHudStamina = player.stamina;
                setHudPos({
                  x: lastHudX,
                  y: lastHudY,
                  z: lastHudZ,
                  yaw: lastHudYaw,
                  stamina: lastHudStamina,
                });
              }

              let npcMoved = false;
              for (let i = 0; i < npcs.length; i++) {
                const n = npcs[i];
                const prev = lastNpcCoords[i];
                if (
                  Number.isNaN(prev.x) ||
                  Math.abs(n.position.x - prev.x) > 0.08 ||
                  Math.abs(n.position.y - prev.y) > 0.08 ||
                  Math.abs(n.position.z - prev.z) > 0.08
                ) {
                  npcMoved = true;
                  break;
                }
              }
              if (npcMoved) {
                for (let i = 0; i < npcs.length; i++) {
                  lastNpcCoords[i].x = npcs[i].position.x;
                  lastNpcCoords[i].y = npcs[i].position.y;
                  lastNpcCoords[i].z = npcs[i].position.z;
                }
                setNpcMarkers(
                  npcs.map((n) => ({
                    id: n.data.id,
                    name: n.data.name,
                    x: n.position.x,
                    y: n.position.y,
                    z: n.position.z,
                  }))
                );
              }
            }
          }
        } else if (curPhase === 'dialogue' || curPhase === 'map') {
          if (snap.pauseJustPressed || (curPhase === 'map' && snap.mapJustPressed)) {
            if (npcVoiceAudioRef.current) {
              npcVoiceAudioRef.current.pause();
              npcVoiceAudioRef.current = null;
            }
            setActiveModal(null);
            activeNpcIdRef.current = null;
            updatePhase('playing');
          } else if (curPhase === 'dialogue') {
            world.update(elapsed, dt, player.position);
            let speechLevel = 0;
            let speechTime = 0;
            let visemeHint: VisemeKey | null = null;
            const voiceEl = npcVoiceAudioRef.current;
            if (voiceEl && !voiceEl.paused && !voiceEl.ended) {
              speechTime = voiceEl.currentTime;
              const analyser = npcAnalyserRef.current;
              const data = npcAnalyserDataRef.current;
              if (analyser && data) {
                analyser.getByteTimeDomainData(data);
                let sumSq = 0;
                for (let i = 0; i < data.length; i++) {
                  const norm = (data[i] - 128) / 128;
                  sumSq += norm * norm;
                }
                const rms = Math.sqrt(sumSq / data.length);
                speechLevel = Math.min(1, rms * 3.8);
              } else {
                speechLevel = 0.45 + 0.35 * Math.sin(speechTime * 10);
              }
            } else {
              // Phoneme-driven lip-sync for text blips (smooth syllable bell envelope)
              const now = performance.now();
              const sinceBlip = now - (lastBlipTimeRef.current ?? 0);
              if (sinceBlip >= 0 && sinceBlip < 135) {
                speechTime = Math.max(0, (now - dialogueSpeechStartRef.current) / 1000);
                const sample = charToFrenchSpeechSample(lastBlipCharRef.current);
                const env = Math.sin((sinceBlip / 135) * Math.PI);
                speechLevel = sample.weight * (0.28 + 0.72 * env);
                visemeHint = sample.viseme;
              } else {
                speechLevel = 0;
                speechTime = 0;
                visemeHint = null;
              }
            }

            const talkingNpc = activeNpcIdRef.current
              ? npcs.find((n) => n.data.id === activeNpcIdRef.current)
              : undefined;
            if (talkingNpc) {
              cameraCtrl.updateNpcCloseupCamera(
                gameRenderer.camera,
                talkingNpc.position,
                talkingNpc.getYaw(),
                Boolean(talkingNpc.data.seated),
                dt,
                settingsRef.current.reducedMotion
              );
            }

            for (const npc of npcs) {
              const isTalking = npc.data.id === activeNpcIdRef.current;
              npc.update(
                dt,
                player.position,
                isTalking,
                isTalking
                  ? {
                      lookAtPos: gameRenderer.camera.position,
                      speechLevel,
                      speechTime,
                      visemeHint,
                    }
                  : undefined
              );
            }
          }
        } else if (curPhase === 'paused') {
          if (snap.pauseJustPressed) {
            updatePhase('playing');
          }
        }

        const shouldRenderCampus =
          curPhase === 'loading' ||
          curPhase === 'title' ||
          curPhase === 'intro' ||
          curPhase === 'postCustomCutscene' ||
          curPhase === 'playing' ||
          curPhase === 'dialogue';

        if (shouldRenderCampus) {
          gameRenderer.renderFrame();
          debug.endFrame(gameRenderer.renderer, player.position);
        }

        if (gameRenderer.isSoftwareGl) {
          frameId = gameRenderer.afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      if (autostart) {
        cameraCtrl.updateThirdPerson(
          gameRenderer.camera,
          player.position,
          world.cameraColliders,
          0.016,
          settingsRef.current.reducedMotion
        );
      } else {
        cameraCtrl.updateTitleTour(
          gameRenderer.camera,
          0,
          settingsRef.current.titleTravelingEnabled
        );
      }
      gameRenderer.renderFrame();
      updatePhase(autostart ? 'playing' : 'title');

      if (gameRenderer.isSoftwareGl) {
        frameId = gameRenderer.afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }

      return () => {
        window.removeEventListener('pointerdown', unlockTitleAudio);
        window.removeEventListener('keydown', unlockTitleAudio);
        gameRenderer.renderer.domElement.removeEventListener('click', onCanvasClick);
        mats.dispose();
        debug.dispose();
        audio.dispose();
        input.dispose();
        physics.dispose();
        gameRenderer.dispose();
      };
    };

    let cleanupInner: (() => void) | undefined;
    boot()
      .then((cleanup) => {
        cleanupInner = cleanup;
      })
      .catch((error: unknown) => {
        console.error('Impossible de démarrer la scène 3D', error);
        if (!disposed) {
          setFatalError(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement de la scène 3D.'
          );
        }
      });

    return () => {
      disposed = true;
      window.removeEventListener('maplewood:webgl-context-lost', handleContextLost);
      window.removeEventListener(
        'maplewood:webgl-context-restored',
        handleContextRestored
      );
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      cleanupInner?.();
    };
  }, [applyQuestUpdate, showToast, updatePhase]);

  const handleStartIntro = useCallback(() => {
    introElapsedRef.current = 0;
    introStageFlagsRef.current = {
      sparkle0: false,
      wave1: false,
      wave2: false,
      beckon: false,
      wave3: false,
      doorOpened: false,
    };
    setIntroTime(0);
    const { player, cameraCtrl, renderer, world } = engineRefs.current;
    if (world?.doors[0]?.isOpen()) {
      world.doors[0].toggle();
    }
    if (player && cameraCtrl && renderer) {
      player.restoreFlorieIntroAvatar();
      cameraCtrl.updateIntroCutsceneCamera(renderer.camera, player.position, 0);
      player.updateIntroCutscene(0, 0.016, renderer.camera.position);
    }
    updatePhase('intro');
  }, [updatePhase]);

  const handleFinishIntro = useCallback(() => {
    const ret = galleryReturnRef.current;
    if (ret) {
      galleryReturnRef.current = null;
      const { player, cameraCtrl } = engineRefs.current;
      if (player && cameraCtrl) {
        player.teleport(ret.x, ret.y, ret.z, ret.yaw);
        void player.applyCustomPlayerAvatar(
          playerGender,
          hairSelection,
          clothesSelection,
          displayOptions
        );
        cameraCtrl.resetToPlayer(player.position, ret.yaw);
      }
      updatePhase('playing');
    } else {
      updatePhase('genderChoice');
    }
  }, [clothesSelection, displayOptions, hairSelection, playerGender, updatePhase]);

  const handleQuickExplore = useCallback(() => {
    hasCompletedIntroChoiceRef.current = true;
    const { player, cameraCtrl } = engineRefs.current;
    if (player && cameraCtrl) {
      player.teleport(
        CAMPUS_DATA.spawn.x,
        CAMPUS_DATA.spawn.y,
        CAMPUS_DATA.spawn.z,
        CAMPUS_DATA.spawn.yaw
      );
      void player.applyCustomPlayerAvatar(
        playerGender,
        hairSelection,
        clothesSelection,
        displayOptions
      );
      cameraCtrl.resetToPlayer(player.position, CAMPUS_DATA.spawn.yaw);
    }
    updatePhase('playing');
  }, [clothesSelection, displayOptions, hairSelection, playerGender, updatePhase]);

  const handleAdvanceToPlayerChoice = useCallback(() => {
    updatePhase('genderChoice');
  }, [updatePhase]);

  const handleSelectGenderChoice = useCallback(
    (chosenGender: PlayerGender) => {
      if (chosenGender !== playerGender) {
        setPlayerGender(chosenGender);
        const def = getDefaultClothesSelection(chosenGender);
        setClothesSelection((prev) => ({
          items: { ...def.items },
          colors: { ...prev.colors },
        }));
      }
      updatePhase('customization');
    },
    [playerGender, updatePhase]
  );

  const handleFinishPostCustomCutscene = useCallback(() => {
    const { player, npcs, cameraCtrl } = engineRefs.current;
    if (postCutsceneDirectorRef.current && player) {
      const helenNpc = npcs?.find((n) => n.data.id === 'npc-receptionist');
      postCutsceneDirectorRef.current.dispose(player, helenNpc);
      postCutsceneDirectorRef.current = null;
    }
    setCutsceneSub(null);
    const ret = galleryReturnRef.current;
    if (ret && player && cameraCtrl) {
      galleryReturnRef.current = null;
      player.teleport(ret.x, ret.y, ret.z, ret.yaw);
      cameraCtrl.resetToPlayer(player.position, ret.yaw);
      updatePhase('playing');
    } else {
      updatePhase('playerChoice');
    }
  }, [updatePhase]);

  const handleOpenCutsceneGallery = useCallback(() => {
    engineRefs.current.input?.exitPointerLock();
    engineRefs.current.input?.clearAll();
    setShowCutsceneGallery(true);
  }, []);

  const handlePlayCutsceneFromGallery = useCallback(
    (id: CutsceneGalleryId) => {
      const { player, renderer, world } = engineRefs.current;
      setShowCutsceneGallery(false);
      if (player) {
        galleryReturnRef.current = {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          yaw: player.yaw,
        };
      }
      if (id === 'intro') {
        handleStartIntro();
      } else if (id === 'postCustom' && renderer && player) {
        if (world?.doors[0]?.isOpen()) {
          world.doors[0].toggle();
        }
        postCutsceneElapsedRef.current = 0;
        setCutsceneSub(null);
        const director = new PostCustomCutsceneDirector(renderer.scene);
        postCutsceneDirectorRef.current = director;
        director.start();
        updatePhase('postCustomCutscene');
      }
    },
    [handleStartIntro, updatePhase]
  );

  const handleConfirmCustomization = useCallback(
    async (
      finalGender: PlayerGender,
      finalHair: PlayerHairSelection,
      finalClothes: PlayerClothesSelection,
      finalDisplay: PlayerDisplayOptions
    ) => {
      setPlayerGender(finalGender);
      setHairSelection(finalHair);
      setClothesSelection(finalClothes);
      setDisplayOptions(finalDisplay);

      const { player, renderer, world } = engineRefs.current;
      if (player) {
        await player.applyCustomPlayerAvatar(
          finalGender,
          finalHair,
          finalClothes,
          finalDisplay
        );
      }

      if (hasCompletedIntroChoiceRef.current && hasPlayedPostCustomCutsceneRef.current) {
        updatePhase('playing');
      } else if (renderer && player) {
        hasPlayedPostCustomCutsceneRef.current = true;
        if (world?.doors[0]?.isOpen()) {
          world.doors[0].toggle();
        }
        postCutsceneElapsedRef.current = 0;
        setCutsceneSub(null);
        const director = new PostCustomCutsceneDirector(renderer.scene);
        postCutsceneDirectorRef.current = director;
        director.start();
        updatePhase('postCustomCutscene');
      } else {
        updatePhase('playerChoice');
      }
    },
    [updatePhase]
  );

  const handleConfirmPlayerChoice = useCallback(
    (selection: PlayerChoiceSelection) => {
      hasCompletedIntroChoiceRef.current = true;
      engineRefs.current.audio?.startAmbient();
      const { player, cameraCtrl, world } = engineRefs.current;
      if (world?.doors[0] && !world.doors[0].isOpen()) {
        world.doors[0].toggle();
      }
      if (player && cameraCtrl) {
        player.teleport(
          selection.spawn.x,
          selection.spawn.y,
          selection.spawn.z,
          selection.spawn.yaw
        );
        cameraCtrl.resetToPlayer(player.position, selection.spawn.yaw);
        const startRoom = findRoomAtPosition(
          selection.spawn.x,
          selection.spawn.z,
          selection.spawn.y
        );
        if (startRoom) {
          setZoneName(startRoom.name);
          setBuildingName(startRoom.building);
          applyQuestUpdate((q) => recordRoomVisit(q, startRoom.id));
        }
      }
      if (selection.archetype === 'scholar') {
        applyQuestUpdate((q) => startQuest(q, 'quest-find-room'));
      }
      showToast(
        `Bienvenue ${selection.firstName} ! Profil : ${selection.archetypeLabel} · Départ : ${selection.spawn.zoneLabel}`
      );
      updatePhase('playing');
    },
    [applyQuestUpdate, showToast, updatePhase]
  );

  const handleReplayIntroVoice = useCallback((phaseIndex: 0 | 1) => {
    engineRefs.current.audio?.playFlorieVoiceLine(phaseIndex);
  }, []);

  const stopNpcVoiceAudio = useCallback(() => {
    if (npcVoiceAudioRef.current) {
      npcVoiceAudioRef.current.pause();
      npcVoiceAudioRef.current.currentTime = 0;
    }
  }, []);

  const handleSelectDialogueChoice = useCallback(
    (choice: NPCChoiceData) => {
      let replyText = choice.reply;

      playNpcVoiceUrl(choice.audioUrl);

      if (choice.action === 'start-quest-find-room') {
        applyQuestUpdate((q) => startQuest(q, 'quest-find-room'));
        showToast('Nouvelle mission : Trouvez le Laboratoire de Chimie !');
      } else if (choice.action === 'start-quest-notebook') {
        applyQuestUpdate((q) => startQuest(q, 'quest-lost-notebook'));
        showToast('Nouvelle mission : Retrouvez le carnet bleu de Léo !');
      } else if (choice.action === 'give-library-book') {
        applyQuestUpdate(receiveLibraryBook);
        showToast('Livre ajouté : Chroniques de Maplewood !');
      } else if (choice.action === 'check-principal-summary') {
        replyText = getPrincipalSummaryMessage(questRef.current);
      } else if (choice.action === 'start-minigame-basketball') {
        setActiveModal({
          kind: 'basketball',
          title: 'Défi de Lancers Francs',
          subtitle: 'Coach Marcus Miller · Gymnase',
          body: '',
        });
        return;
      }

      const isHelenBye = choice.action === 'helen-bye';
      const isHelenWho = choice.action === 'helen-who';
      const isSchedule = choice.action === 'show-schedule';

      setActiveModal((prev) =>
        prev
          ? {
              ...prev,
              body: replyText,
              choices: isHelenBye
                ? []
                : isHelenWho || isSchedule
                  ? prev.choices
                  : [],
              scheduleImageUrl: isSchedule
                ? '/assets/ui/emploi_du_temps_prototype.jpg'
                : undefined,
            }
          : null
      );
    },
    [applyQuestUpdate, showToast, stopNpcVoiceAudio]
  );

  const handleDismissSchedule = useCallback(() => {
    setActiveModal((prev) => (prev ? { ...prev, scheduleImageUrl: undefined } : null));
  }, []);

  const handleCloseModal = useCallback(() => {
    stopNpcVoiceAudio();
    setActiveModal(null);
    activeNpcIdRef.current = null;
    updatePhase('playing');
  }, [stopNpcVoiceAudio, updatePhase]);

  const handleBasketballComplete = useCallback(
    (score: number) => {
      applyQuestUpdate((q) => recordBasketballScore(q, score));
      showToast(
        score >= 3
          ? `Bravo ! ${score}/5 paniers — Mission du Coach validée !`
          : `Score : ${score}/5 paniers. Atteignez 3 paniers pour valider la mission.`
      );
    },
    [applyQuestUpdate, showToast]
  );

  const handleRespawn = useCallback(() => {
    const { player, cameraCtrl } = engineRefs.current;
    if (player && cameraCtrl) {
      player.teleport(
        CAMPUS_DATA.spawn.x,
        CAMPUS_DATA.spawn.y,
        CAMPUS_DATA.spawn.z,
        CAMPUS_DATA.spawn.yaw
      );
      cameraCtrl.resetToPlayer(player.position, CAMPUS_DATA.spawn.yaw);
      setZoneName('Cour Centrale');
      setBuildingName('Extérieur');
    }
    updatePhase('playing');
  }, [updatePhase]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRefs.current.audio?.setVolume(next ? 0 : settingsRef.current.masterVolume);
      return next;
    });
  }, []);

  const handleLoadVrmFile = useCallback(
    async (file: File) => {
      const player = engineRefs.current.player;
      if (!player) return;
      try {
        const buffer = await file.arrayBuffer();
        const label = await player.applyVrmBuffer(buffer, file.name, true);
        setVrmFileName(label);
        showToast(`Modèle VRM de Florie chargé : ${label}`);
      } catch {
        showToast('Fichier VRM invalide. Veuillez sélectionner un fichier .vrm ou .glb valide.');
      }
    },
    [showToast]
  );

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && /\.(vrm|glb)$/i.test(file.name)) {
        void handleLoadVrmFile(file);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleLoadVrmFile]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Hidden File Input for 1-click VRM Import */}
      <input
        ref={vrmInputRef}
        type="file"
        accept=".vrm,.glb"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleLoadVrmFile(file);
            e.target.value = '';
          }
        }}
      />

      {fatalError && (
        <FatalErrorScreen
          title="Le rendu 3D s'est arrêté"
          message="Le navigateur a interrompu le rendu ou une erreur est survenue au démarrage. Rechargez le jeu pour reprendre."
          details={fatalError}
        />
      )}

      {/* Isolated WebGL Viewport Container */}
      <div id="canvas-container" ref={mountRef} className="fixed inset-0 z-0" />

      {phase === 'loading' && (
        <LoadingScreen progress={loadProgress} tip={loadingTip} />
      )}

      {phase === 'title' && (
        <TitleOverlay
          settings={settings}
          muted={muted}
          onStartStory={handleStartIntro}
          onQuickExplore={handleQuickExplore}
          onUpdateSettings={setSettings}
          onToggleMute={handleToggleMute}
          onPlayHoverSfx={() => engineRefs.current.audio?.playUiHover()}
          onPlayClickSfx={() => engineRefs.current.audio?.playUiClick()}
          onPlayConfirmSfx={() => engineRefs.current.audio?.playUiConfirm()}
        />
      )}

      {phase === 'intro' && (
        <IntroCutsceneOverlay
          introTime={introTime}
          duration={INTRO_DURATION}
          onFinish={handleFinishIntro}
          onReplay={handleStartIntro}
          onReplayVoice={handleReplayIntroVoice}
          onVoiceBlip={(ch) => engineRefs.current.audio?.playFlorieBlip(ch)}
        />
      )}

      {phase === 'postCustomCutscene' && (
        <PostCustomCutsceneOverlay
          subtitle={cutsceneSub}
          onSkip={handleFinishPostCustomCutscene}
          onVoiceBlip={handleCharacterBlip}
        />
      )}

      {(phase === 'presentation2d' || phase === 'playerChoice') && (
        <IntroPresentationAndChoiceModal
          mode={phase}
          onAdvanceToChoice={handleAdvanceToPlayerChoice}
          onConfirmChoice={handleConfirmPlayerChoice}
        />
      )}

      {(phase === 'genderChoice' || phase === 'customization') && (
        <Suspense fallback={<ModalLoadingOverlay />}>
          <PlayerCustomizationModal
            step={phase}
            initialGender={playerGender}
            initialSelection={hairSelection}
            initialClothesSelection={clothesSelection}
            initialDisplayOptions={displayOptions}
            onSelectGender={handleSelectGenderChoice}
            onBackToGender={() => updatePhase('genderChoice')}
            onConfirmCustomization={handleConfirmCustomization}
            onPlayHover={() => engineRefs.current.audio?.playUiHover()}
            onPlayClick={() => engineRefs.current.audio?.playUiClick()}
            onPlayConfirm={() => engineRefs.current.audio?.playUiConfirm()}
            onPlayClothEquip={() => engineRefs.current.audio?.playClothEquipSfx()}
            onPlayAccessoryEquip={() =>
              engineRefs.current.audio?.playAccessoryEquipSfx()
            }
            onPlayColorSwatch={() => engineRefs.current.audio?.playColorSwatchSfx()}
            onStartMusic={() => engineRefs.current.audio?.startCustomizationMusic()}
            onStopMusic={() => engineRefs.current.audio?.stopCustomizationMusic()}
          />
        </Suspense>
      )}

      {phase === 'playing' && (
        <HUD
          zoneName={zoneName}
          buildingName={buildingName}
          zoneToast={zoneToast}
          playerX={hudPos.x}
          playerY={hudPos.y}
          playerZ={hudPos.z}
          playerYaw={hudPos.yaw}
          stamina={hudPos.stamina}
          interactPrompt={phase === 'playing' ? interactPrompt : null}
          npcs={npcMarkers}
          muted={muted}
          language={settings.language}
          weather={weather}
          timePhase={timePhase}
          onToggleMute={handleToggleMute}
          onOpenMap={() => updatePhase('map')}
          onOpenPause={() => updatePhase('paused')}
          onPlayIntro={handleOpenCutsceneGallery}
          onOpenCustomization={() => updatePhase('customization')}
        />
      )}

      {showCutsceneGallery && phase === 'playing' && (
        <Suspense fallback={<ModalLoadingOverlay />}>
          <CutsceneGalleryModal
            onSelectCutscene={handlePlayCutsceneFromGallery}
            onClose={() => setShowCutsceneGallery(false)}
            onPlayHoverSfx={() => engineRefs.current.audio?.playUiHover()}
            onPlayClickSfx={() => engineRefs.current.audio?.playUiClick()}
          />
        </Suspense>
      )}

      {phase === 'dialogue' && activeModal && (
        <DialogueUI
          modal={activeModal}
          subtitlesEnabled={settings.subtitlesEnabled}
          onSelectChoice={handleSelectDialogueChoice}
          onClose={handleCloseModal}
          onDismissSchedule={handleDismissSchedule}
          onBasketballComplete={handleBasketballComplete}
          onPlayChoiceSfx={() => engineRefs.current.audio?.playUiClick()}
          onPlayHoverSfx={() => engineRefs.current.audio?.playUiHover()}
          onVoiceBlip={handleCharacterBlip}
        />
      )}

      {elevatorModal && (
        <ElevatorModal
          side={elevatorModal.side}
          currentFloor={elevatorModal.currentFloor}
          onSelectFloor={(floorIndex) => {
            const cb = elevatorModal.onSelectFloor;
            engineRefs.current.audio?.playUiClick();
            setElevatorModal(null);
            cb(floorIndex);
          }}
          onClose={() => {
            const onCancel = elevatorModal.onCancel;
            setElevatorModal(null);
            onCancel?.();
          }}
        />
      )}

      {phase === 'map' && (
        <CampusMapModal
          playerX={hudPos.x}
          playerY={hudPos.y}
          playerZ={hudPos.z}
          visitedRooms={questState.visitedRooms}
          npcs={npcMarkers}
          onClose={() => updatePhase('playing')}
        />
      )}

      {phase === 'paused' && (
        <SettingsMenu
          settings={settings}
          onUpdateSettings={setSettings}
          onResume={() => updatePhase('playing')}
          onOpenMap={() => updatePhase('map')}
          onRespawn={handleRespawn}
          onQuitToTitle={() => updatePhase('title')}
        />
      )}

      {(showGameCursor || isPointerLocked) && (
        <style>{`*, *::before, *::after { cursor: none !important; }`}</style>
      )}
      {showGameCursor && (
        <div
          ref={cursorElRef}
          aria-hidden="true"
          className="pointer-events-none fixed z-[9999] -translate-x-[4px] -translate-y-[2px]"
          style={{
            left: cursorCoordsRef.current.x,
            top: cursorCoordsRef.current.y,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              filter:
                'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.55)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))',
            }}
          >
            <path
              d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z"
              fill="#1e1b2e"
              stroke="#e11d48"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
