import * as THREE from 'three';
import {
  discoverFlorieVrmBuffer,
  parseFlorieVrmFromBuffer,
  type FlorieVRMController,
} from '../character/FlorieVRM';
import type { CampusNPC } from '../character/NPC';
import type { Player } from '../character/Player';

export const POST_CUSTOM_CUTSCENE_DURATION = 32.0;

export interface CutsceneSubtitleState {
  speaker: string;
  text: string;
}

const HELEN_POS = new THREE.Vector3(-5.43, 1.18, -20.74);
const PLAYER_START = new THREE.Vector3(-0.32, 0.05, -2.0);
const PLAYER_DOOR_POS = new THREE.Vector3(-0.26, 0.05, -10.55);
const PLAYER_END = new THREE.Vector3(-3.35, 0.05, -18.35);
const FLORIE_CALL_POS = new THREE.Vector3(1.18, 0.05, -3.15);
const FLORIE_ARM_START = new THREE.Vector3(0.24, 0.05, -2.05);
const FLORIE_DOOR_POS = new THREE.Vector3(0.26, 0.05, -10.55);
const FLORIE_END = new THREE.Vector3(-4.05, 0.05, -18.48);

// Segment 1: Approach centered entrance doors under the portico arch (z = -2.0 -> -10.55)
// Segment 2: Pass through the exact center of the open doorway (z = -11.275, x = ±0.26) -> Reception Desk
const PLAYER_HALL_CURVE = new THREE.CatmullRomCurve3([
  PLAYER_DOOR_POS,
  new THREE.Vector3(-0.26, 0.05, -11.8),
  new THREE.Vector3(-1.65, 0.05, -15.2),
  PLAYER_END,
]);
const FLORIE_HALL_CURVE = new THREE.CatmullRomCurve3([
  FLORIE_DOOR_POS,
  new THREE.Vector3(0.26, 0.05, -11.8),
  new THREE.Vector3(-1.10, 0.05, -15.2),
  FLORIE_END,
]);

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function yawToTarget(from: THREE.Vector3, to: THREE.Vector3): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

export class PostCustomCutsceneDirector {
  private scene: THREE.Scene;
  private florieController: FlorieVRMController | null = null;
  private florieLoading = false;
  private disposed = false;

  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBins: Uint8Array<ArrayBuffer> | null = null;
  private activeSpeaker: 'florie' | 'helen' | null = null;
  private cuesTriggered = new Set<string>();

  private playerGaitPhase = 0;
  private florieGaitPhase = 0;
  private tmpPlayerPos = new THREE.Vector3();
  private tmpFloriePos = new THREE.Vector3();
  private tmpCamTarget = new THREE.Vector3();
  private desiredCamPos = new THREE.Vector3();
  private camPosCurrent = new THREE.Vector3();
  private camLookCurrent = new THREE.Vector3();
  private camInitialized = false;
  private lastShotIndex = -1;
  private tmpTangent = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public start(): void {
    this.disposed = false;
    this.cuesTriggered.clear();
    this.activeSpeaker = null;
    this.playerGaitPhase = 0;
    this.florieGaitPhase = 0;
    this.camInitialized = false;
    this.lastShotIndex = -1;

    if (!this.florieController && !this.florieLoading) {
      this.florieLoading = true;
      void discoverFlorieVrmBuffer()
        .then((found) => (found ? parseFlorieVrmFromBuffer(found.buffer, found.label) : null))
        .then((ctrl: FlorieVRMController | null) => {
          this.florieLoading = false;
          if (!ctrl || this.disposed) {
            if (ctrl) this.scene.remove(ctrl.container);
            return;
          }
          this.florieController = ctrl;
          ctrl.container.position.copy(FLORIE_CALL_POS);
          ctrl.container.rotation.y = yawToTarget(FLORIE_CALL_POS, PLAYER_START);
          this.scene.add(ctrl.container);
        })
        .catch(() => {
          this.florieLoading = false;
        });
    }
  }

  private playLine(url: string, speaker: 'florie' | 'helen', masterVolume: number): void {
    if (!this.audioEl) {
      this.audioEl = new Audio();
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const src = ctx.createMediaElementSource(this.audioEl);
        const an = ctx.createAnalyser();
        an.fftSize = 128;
        an.smoothingTimeConstant = 0.55;
        src.connect(an);
        an.connect(ctx.destination);
        this.audioCtx = ctx;
        this.analyser = an;
        this.freqBins = new Uint8Array(an.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      } catch {
        // Fallback: audio plays without analyser
      }
    }
    if (this.audioCtx?.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    this.activeSpeaker = speaker;
    this.audioEl.pause();
    this.audioEl.src = url;
    this.audioEl.currentTime = 0;
    this.audioEl.volume = Math.min(1, masterVolume * 0.95);
    this.audioEl.onended = () => {
      if (this.activeSpeaker === speaker) {
        this.activeSpeaker = null;
      }
    };
    void this.audioEl.play().catch(() => {});
  }

  private sampleSpeechLevel(): number {
    if (!this.audioEl || this.audioEl.paused || this.audioEl.ended || !this.analyser || !this.freqBins) {
      return 0;
    }
    this.analyser.getByteFrequencyData(this.freqBins);
    let sum = 0;
    const count = Math.min(18, this.freqBins.length);
    for (let i = 1; i < count; i++) {
      sum += this.freqBins[i];
    }
    return Math.min(1, (sum / (Math.max(1, count - 1) * 255)) * 2.9);
  }

  public getSubtitle(t: number): CutsceneSubtitleState | null {
    if (t >= 7.1 && t < 10.7) {
      return {
        speaker: 'Florie',
        text: "Allons-y ! Il faut qu'on récupère ton emploi du temps !",
      };
    }
    if (t >= 18.8 + 2.2 && t < 21.5 + 2.2) {
      return {
        speaker: 'Mme Parker',
        text: 'Bonjour ! Comment puis-je vous aider aujourd’hui ?',
      };
    }
    if (t >= 21.6 + 2.2 && t < 24.0 + 2.2) {
      return {
        speaker: 'Florie',
        text: "Il faut qu'on récupère l'emploi du temps de... de...",
      };
    }
    if (t >= 24.5 + 2.2 && t < 27.6 + 2.2) {
      return {
        speaker: 'Florie',
        text: "Je crois que j'ai oublié ton prénom...",
      };
    }
    return null;
  }

  public update(
    t: number,
    dt: number,
    camera: THREE.PerspectiveCamera,
    player: Player,
    helen: CampusNPC | undefined,
    _masterVolume: number,
    onOpenEntranceDoor?: () => void
  ): void {
    // Drive lip-sync strictly during each line's typing window
    const activeSub = this.getSubtitle(t);
    const lineStart =
      t >= 26.7 ? 26.7 : t >= 23.8 ? 23.8 : t >= 21.0 ? 21.0 : t >= 7.1 ? 7.1 : 0;
    const typingDur = activeSub ? activeSub.text.length / 25 : 0;
    const isActivelyTyping = !!activeSub && t >= lineStart && t <= lineStart + typingDur;
    const florieTalking = isActivelyTyping && activeSub?.speaker === 'Florie';
    const helenTalking = isActivelyTyping && activeSub?.speaker === 'Mme Parker';
    const speechLevel = isActivelyTyping
      ? 0.28 + Math.abs(Math.sin(t * 15.5)) * 0.42
      : 0;
    const speechTime = t - lineStart;

    if (t >= 16.15 && !this.cuesTriggered.has('openDoor')) {
      this.cuesTriggered.add('openDoor');
      onOpenEntranceDoor?.();
    }

    // 1. Player position, yaw & expressive animation
    let playerState: 'idle' | 'walk' = 'idle';
    let playerYaw = 0;

    if (t < 7.0) {
      this.tmpPlayerPos.copy(PLAYER_START);
      playerYaw = 0;
    } else if (t < 11.6) {
      this.tmpPlayerPos.copy(PLAYER_START);
      const turnU = smoothstep((t - 7.1) / 0.9);
      playerYaw = THREE.MathUtils.lerp(0, yawToTarget(PLAYER_START, FLORIE_CALL_POS), turnU);
    } else if (t < 15.7) {
      // Walk together from courtyard under the portico arch right up to the closed entrance doors (z = -10.55)
      const walkU = smoothstep((t - 11.6) / 4.1);
      this.tmpPlayerPos.lerpVectors(PLAYER_START, PLAYER_DOOR_POS, walkU);
      playerYaw = yawToTarget(PLAYER_START, PLAYER_DOOR_POS);
      if (walkU < 0.99) {
        playerState = 'walk';
        this.playerGaitPhase += dt * 6.8;
      }
    } else if (t < 17.2) {
      // Pause politely right in front of the door while Florie reaches for the handle and opens it
      this.tmpPlayerPos.copy(PLAYER_DOOR_POS);
      playerYaw = yawToTarget(PLAYER_DOOR_POS, new THREE.Vector3(-0.26, 0.05, -11.8));
    } else if (t < 20.6) {
      // Resume walking cleanly through the center of the open doorway (z = -11.275) to the reception desk
      const walkU = smoothstep((t - 17.2) / 3.4);
      PLAYER_HALL_CURVE.getPointAt(walkU, this.tmpPlayerPos);
      PLAYER_HALL_CURVE.getTangentAt(walkU, this.tmpTangent);
      const walkYaw = Math.atan2(-this.tmpTangent.x, -this.tmpTangent.z);
      const endYaw = yawToTarget(PLAYER_END, HELEN_POS);
      const turnEndU = smoothstep((t - 19.5) / 1.1);
      playerYaw = THREE.MathUtils.lerp(walkYaw, endYaw, turnEndU);
      if (walkU < 0.99) {
        playerState = 'walk';
        this.playerGaitPhase += dt * 7.0;
      }
    } else {
      this.tmpPlayerPos.copy(PLAYER_END);
      playerYaw = yawToTarget(PLAYER_END, HELEN_POS);
    }

    player.teleport(this.tmpPlayerPos.x, this.tmpPlayerPos.y, this.tmpPlayerPos.z, playerYaw);
    const playerVrm = player.getVrmController();
    // Player gaze: looks at hands (0-7s), Florie (7-20.6s), Helen (20.6-23.6s), then puzzled glance between Florie & Helen (28.0-32s)
    const playerLookTarget =
      t < 20.6
        ? new THREE.Vector3(this.tmpFloriePos.x, 1.48, this.tmpFloriePos.z)
        : t < 23.6
          ? HELEN_POS
          : t >= 29.0 && t < 30.6
            ? HELEN_POS
            : new THREE.Vector3(this.tmpFloriePos.x, 1.48, this.tmpFloriePos.z);

    playerVrm?.setNpcDialogueVisuals?.({
      lookAtPos: t >= 7.0 ? playerLookTarget : null,
      isTalking: false,
      speechLevel: 0,
      speechTime: 0,
    });

    if (playerVrm?.setCutsceneOverride) {
      if (t < 7.0) {
        playerVrm.setCutsceneOverride({
          pose: 'inspectHands',
          expression: t >= 3.2 ? 'confused' : 'none',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 11.0 && t < 11.6) {
        playerVrm.setCutsceneOverride({
          pose: 'takeArm',
          expression: 'surprised',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 11.6 && t < 15.7) {
        playerVrm.setCutsceneOverride({
          pose: 'takeArm',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 27.8) {
        // Confused reaction ("Wait... she forgot my name?"): NO laugh, raised eyebrows & subtle tilt
        playerVrm.setCutsceneOverride({
          pose: 'confusedGlance',
          expression: 'confused',
          headGesture: 'tilt',
          blush: 0,
          time: t,
        });
      } else {
        playerVrm.setCutsceneOverride({
          pose: 'none',
          expression: 'none',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      }
    }
    player.updateCutscenePose(playerState, this.playerGaitPhase, dt);

    // 2. Florie position, yaw, gaze, door opening & anime blush
    if (this.florieController) {
      let florieState: 'idle' | 'walk' = 'idle';
      let florieYaw = 0;

      if (t < 9.1) {
        this.tmpFloriePos.copy(FLORIE_CALL_POS);
        florieYaw = yawToTarget(FLORIE_CALL_POS, PLAYER_START);
      } else if (t < 10.7) {
        // Curved walking approach from FLORIE_CALL_POS toward FLORIE_ARM_START so she arrives already angled toward the door
        const approachU = smoothstep((t - 9.1) / 1.6);
        this.tmpFloriePos.lerpVectors(FLORIE_CALL_POS, FLORIE_ARM_START, approachU);
        // Subtle arc outward (+X) mid-step so the curve looks organic
        this.tmpFloriePos.x += Math.sin(approachU * Math.PI) * 0.16;
        const startYaw = yawToTarget(FLORIE_CALL_POS, PLAYER_START);
        const midTurnYaw = 0.62; // ~35 deg angled toward player & doorway
        florieYaw = THREE.MathUtils.lerp(startYaw, midTurnYaw, approachU);
        if (approachU < 0.96) {
          florieState = 'walk';
          this.florieGaitPhase += dt * 7.0;
        }
      } else if (t < 11.6) {
        // Gentle grounded pivot step (driven by florie_arrival.json) from 35 deg into doorway heading
        this.tmpFloriePos.copy(FLORIE_ARM_START);
        const turnU = smoothstep((t - 10.7) / 0.85);
        florieYaw = THREE.MathUtils.lerp(0.62, yawToTarget(FLORIE_ARM_START, FLORIE_DOOR_POS), turnU);
      } else if (t < 15.7) {
        // Walk together under the portico arch right up to the closed entrance doors (z = -10.55)
        const walkU = smoothstep((t - 11.6) / 4.1);
        this.tmpFloriePos.lerpVectors(FLORIE_ARM_START, FLORIE_DOOR_POS, walkU);
        florieYaw = yawToTarget(FLORIE_ARM_START, FLORIE_DOOR_POS);
        if (walkU < 0.99) {
          florieState = 'walk';
          this.florieGaitPhase += dt * 6.8;
        }
      } else if (t < 17.2) {
        // Stop right in front of door, turn toward handle, open door & wait for clearance
        this.tmpFloriePos.copy(FLORIE_DOOR_POS);
        const doorTarget = new THREE.Vector3(0.0, 0.05, -11.275);
        florieYaw = yawToTarget(FLORIE_DOOR_POS, doorTarget);
      } else if (t < 20.6) {
        // Walk smoothly through the center of the open doorway (z = -11.275) to the reception desk
        const walkU = smoothstep((t - 17.2) / 3.4);
        FLORIE_HALL_CURVE.getPointAt(walkU, this.tmpFloriePos);
        FLORIE_HALL_CURVE.getTangentAt(walkU, this.tmpTangent);
        const walkYaw = Math.atan2(-this.tmpTangent.x, -this.tmpTangent.z);
        const endYaw = yawToTarget(FLORIE_END, HELEN_POS);
        florieYaw = THREE.MathUtils.lerp(walkYaw, endYaw, smoothstep((t - 19.5) / 1.1));
        if (walkU < 0.99) {
          florieState = 'walk';
          this.florieGaitPhase += dt * 7.0;
        }
      } else {
        this.tmpFloriePos.copy(FLORIE_END);
        const helenYaw = yawToTarget(FLORIE_END, HELEN_POS);
        const playerFaceYaw = yawToTarget(FLORIE_END, PLAYER_END);
        const glanceU = t >= 23.6 ? smoothstep((t - 23.6) / 0.7) : 0;
        florieYaw = THREE.MathUtils.lerp(helenYaw, playerFaceYaw, glanceU * 0.78);
      }

      this.florieController.container.position.copy(this.tmpFloriePos);
      this.florieController.container.rotation.y = florieYaw;

      // Scene 5 gaze: looks directly at player (23.6-25.8s), briefly looks away hesitating (25.8-26.7s), then back at player (26.7s+)
      const shySideTarget = new THREE.Vector3(this.tmpPlayerPos.x + 1.05, 1.44, this.tmpPlayerPos.z + 0.7);
      const florieLookTarget =
        t < 15.7
          ? new THREE.Vector3(this.tmpPlayerPos.x, 1.48, this.tmpPlayerPos.z)
          : t < 17.2
            ? new THREE.Vector3(0.0, 1.05, -11.275)
            : t < 23.6
              ? HELEN_POS
              : t >= 25.8 && t < 26.7
                ? shySideTarget
                : new THREE.Vector3(this.tmpPlayerPos.x, 1.48, this.tmpPlayerPos.z);

      this.florieController.setNpcDialogueVisuals?.({
        lookAtPos: florieLookTarget,
        isTalking: florieTalking,
        speechLevel: florieTalking ? speechLevel : 0,
        speechTime,
      });

      const blushAmount = t >= 26.0 ? smoothstep((t - 26.0) / 0.85) : 0;
      if (t >= 7.0 && t < 11.6) {
        this.florieController.setCutsceneOverride?.({
          pose: 'florieArrival',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 11.6 && t < 15.7) {
        this.florieController.setCutsceneOverride?.({
          pose: 'takeArm',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 15.7 && t < 17.2) {
        this.florieController.setCutsceneOverride?.({
          pose: 'openDoor',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 26.0) {
        this.florieController.setCutsceneOverride?.({
          pose: 'embarrassed',
          expression: 'embarrassed',
          headGesture: 'tilt',
          blush: blushAmount,
          time: t,
        });
      } else {
        this.florieController.setCutsceneOverride?.({
          pose: 'none',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      }

      this.florieController.update(florieState, this.florieGaitPhase, 0, dt);
    }

    // 3. Helen (Mme Parker): calm deskRest (no typing!), raises head on arrival, sustained eye contact with PLAYER
    if (helen) {
      const helenVrm = helen.getVrmController();
      const lookTarget =
        t < 20.4
          ? new THREE.Vector3(-5.0, 0.72, -19.8)
          : new THREE.Vector3(this.tmpPlayerPos.x, 1.48, this.tmpPlayerPos.z);

      if (helenVrm?.setCutsceneOverride) {
        if (t >= 20.6 && t < 28.0) {
          helenVrm.setCutsceneOverride({
            pose: 'deskRest',
            expression: 'warmSmile',
            headGesture: 'none',
            blush: 0,
            time: t,
          });
        } else if (t >= 28.0) {
          helenVrm.setCutsceneOverride({
            pose: 'deskRest',
            expression: 'amused',
            headGesture: 'shake',
            blush: 0,
            time: t,
          });
        } else {
          helenVrm.setCutsceneOverride({
            pose: 'deskRest',
            expression: 'none',
            headGesture: 'none',
            blush: 0,
            time: t,
          });
        }
      }
      helen.update(dt, this.tmpPlayerPos, t >= 20.4, {
        lookAtPos: lookTarget,
        speechLevel: helenTalking ? speechLevel : 0,
        speechTime,
      });
    }

    // 4. Natural, Grounded Cinematic Camera (Clean Editorial Cuts + Gentle Motivated Moves)
    let shotIndex = 0;
    if (t < 7.0) {
      shotIndex = 0;
      if (t < 3.4) {
        // Calm vertical pedestal up from shoes to eye-level 3/4 front (no dizzying 180° spin)
        const u = smoothstep(t / 3.4);
        this.desiredCamPos.set(
          this.tmpPlayerPos.x + THREE.MathUtils.lerp(0.28, 0.14, u),
          THREE.MathUtils.lerp(0.42, 1.44, u),
          THREE.MathUtils.lerp(-3.35, -3.38, u)
        );
        this.tmpCamTarget.set(
          this.tmpPlayerPos.x,
          THREE.MathUtils.lerp(0.28, 1.38, u),
          this.tmpPlayerPos.z
        );
      } else {
        // Steady medium close-up with a subtle 18 cm push-in while inspecting hands
        const u = smoothstep((t - 3.4) / 3.6);
        this.desiredCamPos.set(
          this.tmpPlayerPos.x + THREE.MathUtils.lerp(0.14, 0.08, u),
          THREE.MathUtils.lerp(1.44, 1.42, u),
          THREE.MathUtils.lerp(-3.38, -3.20, u)
        );
        this.tmpCamTarget.set(this.tmpPlayerPos.x, 1.35, this.tmpPlayerPos.z);
      }
    } else if (t < 11.6) {
      shotIndex = 1;
      // Clean cut to calm two-shot positioned slightly right so shifted player is on the left & Florie is unobstructed
      const u = smoothstep((t - 7.0) / 4.6);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(0.10, 0.04, u),
        1.46,
        THREE.MathUtils.lerp(-0.78, -0.92, u)
      );
      this.tmpCamTarget.set(
        THREE.MathUtils.lerp(0.52, 0.14, u),
        1.38,
        THREE.MathUtils.lerp(-2.65, -2.05, u)
      );
    } else if (t < 20.6) {
      shotIndex = 2;
      // Clean cut behind the duo: steady, unhurried walking follow under the arch & through the open doorway (z = -11.275)
      const midX = (this.tmpPlayerPos.x + this.tmpFloriePos.x) * 0.5;
      const midZ = (this.tmpPlayerPos.z + this.tmpFloriePos.z) * 0.5;
      const lobbyU = midZ < -13.2 ? smoothstep((-13.2 - midZ) / 4.5) : 0;
      const offsetX = THREE.MathUtils.lerp(-0.08, 0.45, lobbyU);
      const offsetZ = THREE.MathUtils.lerp(2.25, 2.05, lobbyU);
      this.desiredCamPos.set(midX + offsetX, 1.46, midZ + offsetZ);
      this.tmpCamTarget.set(midX, 1.30, midZ - 1.20);
    } else if (t < 23.6) {
      shotIndex = 3;
      // Clean cut to Helen behind the reception desk with a gentle 20 cm push-in
      const u = smoothstep((t - 20.6) / 3.0);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-4.05, -4.22, u),
        THREE.MathUtils.lerp(1.42, 1.43, u),
        THREE.MathUtils.lerp(-19.05, -19.22, u)
      );
      this.tmpCamTarget.set(HELEN_POS.x, THREE.MathUtils.lerp(1.22, 1.25, u), HELEN_POS.z);
    } else if (t < 28.0) {
      shotIndex = 4;
      // Clean cut to 3/4 medium shot of Florie speaking & blushing
      const closeU = smoothstep((t - 25.6) / 1.8);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-4.58, -4.45, closeU),
        THREE.MathUtils.lerp(1.44, 1.45, closeU),
        THREE.MathUtils.lerp(-19.48, -19.34, closeU)
      );
      this.tmpCamTarget.set(
        this.tmpFloriePos.x,
        THREE.MathUtils.lerp(1.38, 1.41, closeU),
        this.tmpFloriePos.z
      );
    } else {
      shotIndex = 5;
      // Clean cut to a calm, balanced 3-shot framing player's confusion, Florie, and Helen
      const u = smoothstep((t - 28.0) / 4.0);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-2.35, -2.22, u),
        1.50,
        THREE.MathUtils.lerp(-17.35, -17.32, u)
      );
      this.tmpCamTarget.set(-4.15, 1.30, -19.05);
    }

    // Strict physical collision clamping for the camera
    this.desiredCamPos.y = Math.max(0.32, Math.min(3.35, this.desiredCamPos.y));
    if (this.desiredCamPos.z < -10.0 && this.desiredCamPos.z > -12.5) {
      this.desiredCamPos.x = THREE.MathUtils.clamp(this.desiredCamPos.x, -0.82, 0.82);
    }
    if (this.desiredCamPos.x < -4.25 && this.desiredCamPos.z < -19.55) {
      this.desiredCamPos.z = -19.55;
    }
    const pushAwayFromActor = (actorPos: THREE.Vector3, minDist: number) => {
      const dx = this.desiredCamPos.x - actorPos.x;
      const dz = this.desiredCamPos.z - actorPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 1e-6) {
        const d = Math.sqrt(distSq);
        const s = minDist / d;
        this.desiredCamPos.x = actorPos.x + dx * s;
        this.desiredCamPos.z = actorPos.z + dz * s;
      }
    };
    pushAwayFromActor(this.tmpPlayerPos, 0.90);
    if (this.florieController) {
      pushAwayFromActor(this.tmpFloriePos, 0.90);
    }

    if (!this.camInitialized || this.lastShotIndex !== shotIndex) {
      this.camPosCurrent.copy(this.desiredCamPos);
      this.camLookCurrent.copy(this.tmpCamTarget);
      this.camInitialized = true;
      this.lastShotIndex = shotIndex;
    } else {
      const camDamp = 1 - Math.exp(-3.8 * Math.min(Math.max(dt, 0.001), 0.05));
      this.camPosCurrent.lerp(this.desiredCamPos, camDamp);
      this.camLookCurrent.lerp(this.tmpCamTarget, camDamp);
    }

    camera.position.copy(this.camPosCurrent);
    camera.lookAt(this.camLookCurrent);
  }

  public dispose(player: Player, helen: CampusNPC | undefined): void {
    this.disposed = true;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
    }
    if (this.florieController) {
      this.scene.remove(this.florieController.container);
      this.florieController = null;
    }
    player.getVrmController()?.setCutsceneOverride?.(null);
    if (helen) {
      helen.getVrmController()?.setCutsceneOverride?.(null);
      helen.getVrmController()?.setNpcDialogueVisuals?.({
        lookAtPos: null,
        isTalking: false,
        speechLevel: 0,
        speechTime: 0,
      });
    }
  }
}
