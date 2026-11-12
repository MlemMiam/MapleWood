import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameRenderer } from './engine/Renderer';
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
  type RoomDefinition,
  findRoomAtPosition,
} from './utils/CampusLayout';
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
import { type CampusNPC, type NPCChoiceData, type NPCData, spawnCampusNPCs } from './character/NPC';
import { LoadingScreen } from './ui/LoadingScreen';
import { TitleOverlay } from './ui/TitleOverlay';
import { HUD } from './ui/HUD';
import { type MinimapNpcMarker } from './ui/Minimap';
import { type ActiveModalContent, DialogueUI } from './interaction/DialogueUI';
import { CampusMapModal } from './ui/CampusMapModal';
import { SettingsMenu } from './ui/SettingsMenu';

type GamePhase = 'loading' | 'title' | 'playing' | 'paused' | 'map' | 'dialogue';

const LOADING_TIPS = [
  'Utilisez la touche E près des portes, casiers, tableaux et ordinateurs pour interagir.',
  'Maintenez Shift pour sprinter à travers la cour centrale ou le terrain de sport.',
  'Appuyez sur M à tout moment pour ouvrir le plan complet et vous déplacer rapidement.',
  'Parlez à Mme Vance dans le hall d\'entrée et à Léo près des casiers pour démarrer les missions.',
  'Le Coach Miller vous attend au gymnase pour un défi de lancers francs.',
];

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [loadProgress, setLoadProgress] = useState(10);
  const [loadingTip] = useState(
    () => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]
  );
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [muted, setMuted] = useState(false);

  // Throttled HUD state
  const [zoneName, setZoneName] = useState('Cour Centrale');
  const [buildingName, setBuildingName] = useState('Extérieur');
  const [zoneToast, setZoneToast] = useState<string | null>(null);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [hudPos, setHudPos] = useState({ x: 0, z: 6, yaw: 0, stamina: 100 });
  const [npcMarkers, setNpcMarkers] = useState<MinimapNpcMarker[]>([]);
  const [questState, setQuestState] = useState<QuestState>(() => createInitialQuestState());
  const [activeModal, setActiveModal] = useState<ActiveModalContent | null>(null);

  // Refs synced for the 60Hz loop so HUD state updates never recreate the WebGL canvas
  const phaseRef = useRef<GamePhase>('loading');
  const settingsRef = useRef<GameSettings>(settings);
  const questRef = useRef<QuestState>(questState);
  const activeNpcIdRef = useRef<string | null>(null);

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
    const { input, audio, renderer } = engineRefs.current;
    if (next === 'paused' || next === 'dialogue' || next === 'map' || next === 'title') {
      input?.exitPointerLock();
      input?.clearAll();
    }
    // Optimize fluidity on title screen: disable expensive shadows/render cost
    renderer?.setTitleMode(next === 'title');
    if (next === 'paused') {
      audio?.pauseLoops();
    } else if (next === 'playing') {
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

  // Main Engine Lifecycle (mounts ONCE)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;

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
      const input = new InputManager(
        gameRenderer.renderer.domElement,
        settingsRef.current.bindings
      );
      const cameraCtrl = new CameraController();
      const interactions = new InteractionSystem();
      const debug = new DebugOverlay();

      setLoadProgress(70);

      const openInfoModal = (title: string, subtitle: string, body: string) => {
        audio.playInteractDing();
        setActiveModal({ kind: 'info', title, subtitle, body });
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
        }
      );

      setLoadProgress(88);

      const player = new Player(gameRenderer.scene, physics, CAMPUS_DATA.spawn);
      cameraCtrl.resetToPlayer(player.position, CAMPUS_DATA.spawn.yaw);

      const npcs = spawnCampusNPCs(gameRenderer.scene, interactions, (npcData: NPCData) => {
        audio.playInteractDing();
        activeNpcIdRef.current = npcData.id;

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
      });

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
      updatePhase(autostart ? 'playing' : 'title');

      // Click on canvas locks pointer when playing
      const onCanvasClick = () => {
        if (phaseRef.current === 'playing') {
          input.requestPointerLock();
        }
      };
      gameRenderer.renderer.domElement.addEventListener('click', onCanvasClick);

      const clock = new THREE.Clock();
      let hudAccum = 0;
      let lastRoomId = 'courtyard';
      let lastPrompt: string | null = null;

      const tick = () => {
        if (disposed) return;
        debug.beginFrame();

        const rawDt = clock.getDelta();
        const frameDt = Math.min(rawDt, 0.22);
        const dt = Math.min(rawDt, 0.05);
        const elapsed = clock.elapsedTime;
        const curPhase = phaseRef.current;
        const curSettings = settingsRef.current;

        const snap = input.consumeSnapshot();
        if (snap.debugJustPressed) {
          debug.toggle();
        }

        if (curPhase === 'title') {
          cameraCtrl.updateTitleTour(gameRenderer.camera, elapsed);
          // Throttle expensive world/NPC updates on title screen for smoother FPS
          titleFrameCounter.current = (titleFrameCounter.current + 1) % 3;
          if (titleFrameCounter.current === 0) {
            world.update(elapsed, dt * 3);
            for (const npc of npcs) {
              npc.update(dt * 3, player.position, false);
            }
          }
        } else if (curPhase === 'playing') {
          if (snap.pauseJustPressed) {
            updatePhase('paused');
          } else if (snap.mapJustPressed) {
            updatePhase('map');
          } else {
            cameraCtrl.applyInput(
              snap.lookDeltaX,
              snap.lookDeltaY,
              snap.zoomDelta,
              curSettings.mouseSensitivity
            );

            const currentRoom = findRoomAtPosition(player.position.x, player.position.z);
            const onGrass = currentRoom?.type === 'exterior' && currentRoom.id === 'courtyard';

            // Sub-step physics & player locomotion in <= 40ms increments for stability at any framerate
            let remaining = frameDt;
            let firstStep = true;
            while (remaining > 0.0001) {
              const stepDt = Math.min(remaining, 0.04);
              const stepSnap = firstStep ? snap : { ...snap, jumpJustPressed: false };
              player.update(stepDt, stepSnap, cameraCtrl.yaw, physics, audio, onGrass);
              physics.step(stepDt);
              firstStep = false;
              remaining -= stepDt;
            }

            world.update(elapsed, frameDt);

            for (const npc of npcs) {
              npc.update(frameDt, player.position, false);
            }

            cameraCtrl.updateThirdPerson(
              gameRenderer.camera,
              player.position,
              world.cameraColliders,
              frameDt,
              curSettings.reducedMotion
            );

            gameRenderer.updateDayCycle(frameDt, curSettings.dayCycleEnabled);

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

            // Room change detection & throttled HUD sync (~10 Hz)
            if (currentRoom && currentRoom.id !== lastRoomId) {
              lastRoomId = currentRoom.id;
              setZoneName(currentRoom.name);
              setBuildingName(currentRoom.building);
              applyQuestUpdate((q) => recordRoomVisit(q, currentRoom.id));
              showToast(`Zone : ${currentRoom.name}`);
            }

            hudAccum += frameDt;
            if (hudAccum >= 0.1) {
              hudAccum = 0;
              setHudPos({
                x: player.position.x,
                z: player.position.z,
                yaw: cameraCtrl.yaw,
                stamina: player.stamina,
              });
              setNpcMarkers(
                npcs.map((n) => ({
                  id: n.data.id,
                  name: n.data.name,
                  x: n.position.x,
                  z: n.position.z,
                }))
              );
            }
          }
        } else if (curPhase === 'dialogue' || curPhase === 'map') {
          if (snap.pauseJustPressed) {
            setActiveModal(null);
            activeNpcIdRef.current = null;
            updatePhase('playing');
          } else {
            world.update(elapsed, dt);
            for (const npc of npcs) {
              npc.update(dt, player.position, npc.data.id === activeNpcIdRef.current);
            }
          }
        } else if (curPhase === 'paused') {
          if (snap.pauseJustPressed) {
            updatePhase('playing');
          }
        }

        gameRenderer.renderFrame();
        debug.endFrame(gameRenderer.renderer, player.position);

        if (gameRenderer.isSoftwareGl) {
          frameId = gameRenderer.afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      cameraCtrl.updateTitleTour(gameRenderer.camera, 0);
      gameRenderer.renderFrame();

      if (gameRenderer.isSoftwareGl) {
        frameId = gameRenderer.afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }

      return () => {
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
    boot().then((cleanup) => {
      cleanupInner = cleanup;
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      cleanupInner?.();
    };
  }, [applyQuestUpdate, showToast, updatePhase]);

  const handleStartGame = useCallback(() => {
    engineRefs.current.audio?.startAmbient();
    const { player, cameraCtrl } = engineRefs.current;
    if (player && cameraCtrl) {
      cameraCtrl.resetToPlayer(player.position, player.yaw);
    }
    updatePhase('playing');
  }, [updatePhase]);

  const handleSelectDialogueChoice = useCallback(
    (choice: NPCChoiceData) => {
      let replyText = choice.reply;

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

      setActiveModal((prev) =>
        prev
          ? {
              ...prev,
              body: replyText,
              choices: [],
            }
          : null
      );
    },
    [applyQuestUpdate, showToast]
  );

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
    activeNpcIdRef.current = null;
    updatePhase('playing');
  }, [updatePhase]);

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

  const handleFastTravel = useCallback(
    (room: RoomDefinition) => {
      const { player, cameraCtrl } = engineRefs.current;
      if (player && cameraCtrl) {
        player.teleport(room.position.x, room.position.y, room.position.z, 0);
        cameraCtrl.resetToPlayer(player.position, 0);
        setZoneName(room.name);
        setBuildingName(room.building);
        applyQuestUpdate((q) => recordRoomVisit(q, room.id));
        showToast(`Déplacement vers : ${room.name}`);
      }
      updatePhase('playing');
    },
    [applyQuestUpdate, showToast, updatePhase]
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

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Isolated WebGL Viewport Container */}
      <div id="canvas-container" ref={mountRef} className="fixed inset-0 z-0" />

      {phase === 'loading' && (
        <LoadingScreen progress={loadProgress} tip={loadingTip} />
      )}

      {phase === 'title' && (
        <TitleOverlay language={settings.language} onStart={handleStartGame} />
      )}

      {(phase === 'playing' || phase === 'dialogue') && (
        <HUD
          zoneName={zoneName}
          buildingName={buildingName}
          zoneToast={zoneToast}
          playerX={hudPos.x}
          playerZ={hudPos.z}
          playerYaw={hudPos.yaw}
          stamina={hudPos.stamina}
          interactPrompt={phase === 'playing' ? interactPrompt : null}
          npcs={npcMarkers}
          questState={questState}
          muted={muted}
          language={settings.language}
          onToggleMute={handleToggleMute}
          onOpenMap={() => updatePhase('map')}
          onOpenPause={() => updatePhase('paused')}
        />
      )}

      {phase === 'dialogue' && activeModal && (
        <DialogueUI
          modal={activeModal}
          subtitlesEnabled={settings.subtitlesEnabled}
          onSelectChoice={handleSelectDialogueChoice}
          onClose={handleCloseModal}
          onBasketballComplete={handleBasketballComplete}
        />
      )}

      {phase === 'map' && (
        <CampusMapModal
          playerX={hudPos.x}
          playerZ={hudPos.z}
          visitedRooms={questState.visitedRooms}
          npcs={npcMarkers}
          onFastTravel={handleFastTravel}
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
    </div>
  );
}
