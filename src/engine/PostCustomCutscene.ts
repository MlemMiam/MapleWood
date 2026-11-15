import * as THREE from 'three';
import {
  discoverFlorieVrmBuffer,
  parseFlorieVrmFromBuffer,
  type FlorieVRMController,
} from '../character/FlorieVRM';
import type { CampusNPC } from '../character/NPC';
import type { Player } from '../character/Player';

export const POST_CUSTOM_CUTSCENE_DURATION = 44.5;

export interface CutsceneSubtitleState {
  speaker: string;
  text: string;
}

const HELEN_POS = new THREE.Vector3(-5.43, 1.18, -20.74);
const PLAYER_START = new THREE.Vector3(-0.32, 0.05, -2.0);
const PLAYER_DOOR_POS = new THREE.Vector3(-0.26, 0.05, -10.85);
const PLAYER_END = new THREE.Vector3(-4.15, 0.05, -19.05);
const FLORIE_CALL_POS = new THREE.Vector3(1.18, 0.05, -3.15);
const FLORIE_CORNER_POS = new THREE.Vector3(1.18, 0.05, -2.05);
const FLORIE_ARM_START = new THREE.Vector3(0.58, 0.05, -2.05);
const FLORIE_APPROACH_CURVE = new THREE.QuadraticBezierCurve3(
  FLORIE_CALL_POS,
  FLORIE_CORNER_POS,
  FLORIE_ARM_START
);
const FLORIE_DOOR_POS = new THREE.Vector3(0.54, 0.05, -10.65);
const FLORIE_END = new THREE.Vector3(-3.05, 0.05, -18.65);

// Segment 1: Approach centered entrance doors under the portico arch (z = -2.0 -> -10.85 / -10.55)
// Segment 2: Pass through the exact center of the open doorway (z = -11.275, x = ±0.26) -> Reception Desk
const PLAYER_HALL_CURVE = new THREE.CatmullRomCurve3([
  PLAYER_DOOR_POS,
  new THREE.Vector3(-0.26, 0.05, -12.0),
  new THREE.Vector3(-2.10, 0.05, -15.8),
  PLAYER_END,
]);
const FLORIE_HALL_CURVE = new THREE.CatmullRomCurve3([
  FLORIE_DOOR_POS,
  new THREE.Vector3(0.40, 0.05, -11.8),
  new THREE.Vector3(-1.15, 0.05, -15.4),
  FLORIE_END,
]);

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function yawToTarget(from: THREE.Vector3, to: THREE.Vector3): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
}

export class PostCustomCutsceneDirector {
  private scene: THREE.Scene;
  private florieController: FlorieVRMController | null = null;
  private florieLoading = false;
  private disposed = false;

  private audioEl: HTMLAudioElement | null = null;
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

  // Enrollment form & desk drawer props for Scenes 1-4 (t = 32.8s - 44.5s)
  private propsInitialized = false;
  private deskTopY = 1.04;
  private paperYaw = Math.atan2(0.60, 0.80);
  private paperRestPos = new THREE.Vector3(-4.88, 1.045, -20.02);
  private drawerBasePos = new THREE.Vector3(-5.58, 0.88, -20.38);
  private prenomWorldPos = new THREE.Vector3(-4.88, 1.045, -20.02);
  private drawerGroup: THREE.Group | null = null;
  private drawerBox: THREE.Group | null = null;
  private paperGroup: THREE.Group | null = null;
  private paperTexture: THREE.CanvasTexture | null = null;
  private savedCamera: THREE.PerspectiveCamera | null = null;
  private tmpHelenHandPos = new THREE.Vector3();
  private tmpHelenThumbPos = new THREE.Vector3();
  private drawerPosLocked = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public start(): void {
    this.disposed = false;
    this.cuesTriggered.clear();
    this.playerGaitPhase = 0;
    this.florieGaitPhase = 0;
    this.camInitialized = false;
    this.lastShotIndex = -1;
    this.propsInitialized = false;
    this.drawerPosLocked = false;

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
    if (t >= 32.8 && t < 35.8) {
      return {
        speaker: 'Mme Parker',
        text: 'Et bien, vérifions de suite !',
      };
    }
    return null;
  }

  private createEnrollmentFormTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1360;
    const ctx = canvas.getContext('2d')!;

    // Authentic warm ivory paper background
    ctx.fillStyle = '#FCF9F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper grain border & double academic frame
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 8;
    ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);
    ctx.strokeStyle = '#C9A23F';
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, canvas.width - 92, canvas.height - 92);

    // School Header
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(58, 58, canvas.width - 116, 132);
    ctx.fillStyle = '#F5E08B';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ACADEMIC AFFAIRS · OFFICE OF THE REGISTRAR', canvas.width / 2, 98);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText('MAPLEWOOD HIGH SCHOOL', canvas.width / 2, 144);
    ctx.fillStyle = '#DCE6FA';
    ctx.font = '600 18px sans-serif';
    ctx.fillText("FORMULAIRE OFFICIEL D'INSCRIPTION · ANNÉE 2026–2027", canvas.width / 2, 174);

    // Section: EMPLOI DU TEMPS
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText('EMPLOI DU TEMPS', 74, 246);
    ctx.fillStyle = '#C9A23F';
    ctx.fillRect(74, 256, 310, 4);

    // Weekly Timetable Grid
    const days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];
    const slots = ['08:00', '09:30', '11:00', '13:00', '14:30'];
    const schedule = [
      ['Mathématiques', 'Littérature', 'Biologie', 'Mathématiques', 'Histoire'],
      ['Anglais', 'Physique-Chimie', 'Histoire', 'Informatique', 'Littérature'],
      ['Biologie', 'Mathématiques', 'Anglais', 'Physique-Chimie', 'Arts'],
      ['Éduc. Physique', 'Histoire', 'Informatique', 'Langues', 'Biologie'],
      ['Informatique', 'Langues', 'Éduc. Physique', 'Arts', 'Club Aigles'],
    ];

    const gx = 74;
    const gy = 282;
    const timeW = 104;
    const colW = (canvas.width - 148 - timeW) / 5;
    const headerH = 48;
    const rowH = 92;

    // Header row
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(gx, gy, timeW + colW * 5, headerH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HEURE', gx + timeW / 2, gy + 30);
    days.forEach((d, idx) => {
      ctx.fillText(d, gx + timeW + colW * idx + colW / 2, gy + 30);
    });

    // Rows
    slots.forEach((slot, r) => {
      const ry = gy + headerH + r * rowH;
      ctx.fillStyle = r % 2 === 0 ? '#F3F6FC' : '#FFFFFF';
      ctx.fillRect(gx, ry, timeW + colW * 5, rowH);

      ctx.strokeStyle = '#B8C4DC';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx, ry, timeW, rowH);
      ctx.fillStyle = '#1E3A8A';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slot, gx + timeW / 2, ry + 52);

      schedule[r].forEach((subj, c) => {
        const cx = gx + timeW + c * colW;
        ctx.strokeStyle = '#C7D2E6';
        ctx.strokeRect(cx, ry, colW, rowH);
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(subj, cx + colW / 2, ry + 44);
        ctx.fillStyle = '#64748B';
        ctx.font = '13px sans-serif';
        ctx.fillText(`Salle ${102 + ((r * 3 + c * 2) % 18)}`, cx + colW / 2, ry + 68);
      });
    });

    // Registration Section
    const regY = 824;
    ctx.fillStyle = '#F2ECD8';
    ctx.fillRect(74, regY, canvas.width - 148, 390);
    ctx.strokeStyle = '#C9A23F';
    ctx.lineWidth = 3;
    ctx.strokeRect(74, regY, canvas.width - 148, 390);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('INSCRIPTION ÉLÈVE · VALIDATION ACCUEIL', 102, regY + 50);

    ctx.fillStyle = '#475569';
    ctx.font = '600 18px sans-serif';
    ctx.fillText('Établissement : Maplewood High School (Aigles)', 102, regY + 90);
    ctx.fillText('Statut : Nouvel arrivant · Dossier vérifié par Mme Parker', 102, regY + 120);

    // Prominent PRÉNOM : field (centered around x = 512, y = 1045 -> u = 0.5, v = 0.768)
    const fieldY = regY + 175;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText('PRÉNOM :', 108, fieldY + 54);

    // Empty white input box next to PRÉNOM :
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(310, fieldY, 608, 82);
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 4;
    ctx.strokeRect(310, fieldY, 608, 82);

    // Subtle baseline & signature footer
    ctx.fillStyle = '#64748B';
    ctx.font = 'italic 17px Georgia, serif';
    ctx.fillText('Signature Secrétariat : H. Parker', 108, regY + 340);
    ctx.textAlign = 'right';
    ctx.fillText('MAPLEWOOD REGISTRAR · FORM #MW-2026', canvas.width - 108, regY + 340);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  private ensureEnrollmentProps(): void {
    if (this.propsInitialized) return;
    this.propsInitialized = true;

    // Detect exact desk top height via raycast onto Hall_ReceptionDesk
    const receptionDesk = this.scene.getObjectByName('Hall_ReceptionDesk');
    let detectedY = 1.04;
    if (receptionDesk) {
      receptionDesk.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(
        new THREE.Vector3(-4.88, 2.5, -20.02),
        new THREE.Vector3(0, -1, 0),
        0.1,
        2.4
      );
      const hits = ray.intersectObject(receptionDesk, true);
      if (hits.length > 0 && hits[0].point.y > 0.6 && hits[0].point.y < 1.35) {
        detectedY = hits[0].point.y;
      }
    }
    this.deskTopY = detectedY;
    this.paperRestPos.set(-4.88, this.deskTopY + 0.005, -20.02);
    this.drawerBasePos.set(-5.58, this.deskTopY - 0.14, -20.38);

    // Build 3D Desk Drawer
    const drawerGroup = new THREE.Group();
    drawerGroup.position.copy(this.drawerBasePos);
    drawerGroup.rotation.y = this.paperYaw;

    const drawerBox = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5030, roughness: 0.7 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.75 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.32), woodMat);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.02), woodMat);
    front.position.set(0, 0, -0.16);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.016, 0.024), brassMat);
    handle.position.set(0, 0, -0.178);
    drawerBox.add(body, front, handle);
    drawerGroup.add(drawerBox);
    drawerGroup.visible = false;
    this.scene.add(drawerGroup);
    this.drawerGroup = drawerGroup;
    this.drawerBox = drawerBox;

    // Build 3D Enrollment Form Paper (0.26m x 0.345m)
    const paperW = 0.26;
    const paperH = 0.345;
    this.paperTexture = this.createEnrollmentFormTexture();
    const paperMat = new THREE.MeshStandardMaterial({
      map: this.paperTexture,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const paperMesh = new THREE.Mesh(new THREE.PlaneGeometry(paperW, paperH), paperMat);
    paperMesh.rotation.x = -Math.PI / 2;
    paperMesh.receiveShadow = true;

    const paperGroup = new THREE.Group();
    paperGroup.add(paperMesh);
    paperGroup.position.copy(this.paperRestPos);
    paperGroup.rotation.y = this.paperYaw;
    paperGroup.visible = false;
    this.scene.add(paperGroup);
    this.paperGroup = paperGroup;

    // Compute exact world position of the "PRÉNOM :" field center (canvas x=512, y=1040 -> u=0.5, v=0.765)
    paperGroup.updateMatrixWorld(true);
    const localField = new THREE.Vector3(0, 0, (0.765 - 0.5) * paperH);
    this.prenomWorldPos.copy(localField).applyMatrix4(paperGroup.matrixWorld);
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
    this.savedCamera = camera;
    this.ensureEnrollmentProps();

    // Drive lip-sync strictly from the exact 36ms typewriter letter cadence & blipping
    const activeSub = this.getSubtitle(t);
    const lineStart =
      t >= 32.8 ? 32.8 : t >= 26.7 ? 26.7 : t >= 23.8 ? 23.8 : t >= 21.0 ? 21.0 : t >= 7.1 ? 7.1 : 0;
    const charInterval = 0.036;
    const typingDur = activeSub ? activeSub.text.length * charInterval : 0;
    const isActivelyTyping = !!activeSub && t >= lineStart && t <= lineStart + typingDur;
    const charIdx = activeSub && isActivelyTyping ? Math.floor((t - lineStart) / charInterval) : -1;
    const currentChar =
      activeSub && charIdx >= 0 && charIdx < activeSub.text.length ? activeSub.text[charIdx] : '';
    const isPronouncedLetter = /[a-zA-ZÀ-ÿ0-9]/.test(currentChar);
    const isVowel = /[aeiouyàâéèêëîïôùûüAEIOUYÀÂÉÈÊËÎÏÔÙÛÜ]/.test(currentChar);
    const charPhase = isActivelyTyping ? ((t - lineStart) % charInterval) / charInterval : 0;
    const florieTalking = isActivelyTyping && activeSub?.speaker === 'Florie';
    const helenTalking = isActivelyTyping && activeSub?.speaker === 'Mme Parker';
    const speechLevel =
      isActivelyTyping && isPronouncedLetter
        ? (isVowel ? 0.82 : 0.52) * (0.45 + 0.55 * Math.sin(charPhase * Math.PI))
        : 0;
    const speechTime = t - lineStart;

    if (t >= 16.65 && !this.cuesTriggered.has('openDoor')) {
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
    } else if (t < 16.2) {
      // Walk unhurriedly together under the portico arch, Player slightly ahead of Florie
      const walkU = smoothstep((t - 11.6) / 4.6);
      this.tmpPlayerPos.lerpVectors(PLAYER_START, PLAYER_DOOR_POS, walkU);
      playerYaw = yawToTarget(PLAYER_START, PLAYER_DOOR_POS);
      if (walkU < 0.99) {
        playerState = 'walk';
        this.playerGaitPhase += dt * 4.4;
      }
    } else if (t < 17.6) {
      // Pause politely right in front of the door while Florie pushes it open
      this.tmpPlayerPos.copy(PLAYER_DOOR_POS);
      playerYaw = yawToTarget(PLAYER_DOOR_POS, new THREE.Vector3(-0.26, 0.05, -11.8));
    } else if (t < 21.4) {
      // Walk calmly through the open doorway to the reception desk, Player leading in front
      const walkU = smoothstep((t - 17.6) / 3.8);
      PLAYER_HALL_CURVE.getPointAt(walkU, this.tmpPlayerPos);
      PLAYER_HALL_CURVE.getTangentAt(walkU, this.tmpTangent);
      const walkYaw = Math.atan2(-this.tmpTangent.x, -this.tmpTangent.z);
      const endYaw = yawToTarget(PLAYER_END, HELEN_POS);
      const turnEndU = smoothstep((t - 20.3) / 1.1);
      playerYaw = THREE.MathUtils.lerp(walkYaw, endYaw, turnEndU);
      if (walkU < 0.99) {
        playerState = 'walk';
        this.playerGaitPhase += dt * 4.5;
      }
    } else {
      this.tmpPlayerPos.copy(PLAYER_END);
      playerYaw = yawToTarget(PLAYER_END, HELEN_POS);
    }

    player.teleport(this.tmpPlayerPos.x, this.tmpPlayerPos.y, this.tmpPlayerPos.z, playerYaw);
    const playerVrm = player.getVrmController();
    // Player gaze: looks at hands (0-7s), Florie (7-11.6s), entrance doors (11.6-17.6s), Helen (17.6s+)
    // During confusedGlance (26.8s+), head stays toward Helen while only the irises glance sideways.
    const playerLookTarget =
      t < 11.6
        ? new THREE.Vector3(this.tmpFloriePos.x, 1.48, this.tmpFloriePos.z)
        : t < 17.6
          ? new THREE.Vector3(-0.26, 1.42, -11.5)
          : HELEN_POS;

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
      } else if (t >= 11.6 && t < 16.2) {
        playerVrm.setCutsceneOverride({
          pose: 'takeArm',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 26.8 && t < 31.0) {
        // Confused reaction right as Florie says she forgot the player's name (Blender MCP clip + iris side glance)
        playerVrm.setCutsceneOverride({
          pose: 'confusedGlance',
          expression: 'confused',
          headGesture: 'none',
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
      } else if (t < 10.95) {
        // Curved right-angle path: starts toward the fountain (+Z), curves smoothly toward the player (-X)
        const approachU = smoothstep((t - 9.1) / 1.85);
        FLORIE_APPROACH_CURVE.getPointAt(approachU, this.tmpFloriePos);
        FLORIE_APPROACH_CURVE.getTangentAt(approachU, this.tmpTangent);
        const startYaw = yawToTarget(FLORIE_CALL_POS, PLAYER_START);
        const curveYaw = Math.atan2(-this.tmpTangent.x, -this.tmpTangent.z);
        const doorYaw = yawToTarget(FLORIE_ARM_START, FLORIE_DOOR_POS);
        const blendedCurveYaw = lerpAngle(startYaw, curveYaw, smoothstep((t - 9.1) / 0.35));
        // Begin a gentle, unhurried turn toward the building during the final stretch
        const earlyTurnU = t >= 10.55 ? smoothstep((t - 10.55) / 1.05) : 0;
        florieYaw = lerpAngle(blendedCurveYaw, doorYaw, earlyTurnU);
        florieState = 'walk';
        this.florieGaitPhase += dt * 4.5;
      } else if (t < 11.6) {
        // Finish the slow, natural turn toward the building before taking the player's arm
        this.tmpFloriePos.copy(FLORIE_ARM_START);
        const endCurveYaw = yawToTarget(FLORIE_CORNER_POS, FLORIE_ARM_START);
        const doorYaw = yawToTarget(FLORIE_ARM_START, FLORIE_DOOR_POS);
        const turnU = smoothstep((t - 10.55) / 1.05);
        florieYaw = lerpAngle(endCurveYaw, doorYaw, turnU);
        if (turnU < 0.92) {
          florieState = 'walk';
          this.florieGaitPhase += dt * 3.0;
        }
      } else if (t < 16.2) {
        // Walk unhurriedly under the portico arch right up to the entrance doors (z = -10.55)
        const walkU = smoothstep((t - 11.6) / 4.6);
        this.tmpFloriePos.lerpVectors(FLORIE_ARM_START, FLORIE_DOOR_POS, walkU);
        florieYaw = yawToTarget(FLORIE_ARM_START, FLORIE_DOOR_POS);
        if (walkU < 0.99) {
          florieState = 'walk';
          this.florieGaitPhase += dt * 4.4;
        }
      } else if (t < 17.6) {
        // Stop right in front of door, push both double doors open & wait for clearance
        this.tmpFloriePos.copy(FLORIE_DOOR_POS);
        const doorTarget = new THREE.Vector3(0.0, 0.05, -11.275);
        florieYaw = yawToTarget(FLORIE_DOOR_POS, doorTarget);
      } else if (t < 21.4) {
        // Walk calmly through the open doorway to the reception desk, staying behind/beside Player
        const walkU = smoothstep((t - 17.6) / 3.8);
        FLORIE_HALL_CURVE.getPointAt(walkU, this.tmpFloriePos);
        FLORIE_HALL_CURVE.getTangentAt(walkU, this.tmpTangent);
        const walkYaw = Math.atan2(-this.tmpTangent.x, -this.tmpTangent.z);
        const endYaw = yawToTarget(FLORIE_END, HELEN_POS);
        florieYaw = THREE.MathUtils.lerp(walkYaw, endYaw, smoothstep((t - 20.3) / 1.1));
        if (walkU < 0.99) {
          florieState = 'walk';
          this.florieGaitPhase += dt * 4.5;
        }
      } else {
        this.tmpFloriePos.copy(FLORIE_END);
        const helenYaw = yawToTarget(FLORIE_END, HELEN_POS);
        const playerFaceYaw = yawToTarget(FLORIE_END, PLAYER_END);
        const glanceU = t >= 24.4 ? smoothstep((t - 24.4) / 0.7) : 0;
        florieYaw = THREE.MathUtils.lerp(helenYaw, playerFaceYaw, glanceU * 0.78);
      }

      this.florieController.container.position.copy(this.tmpFloriePos);
      this.florieController.container.rotation.y = florieYaw;

      // Scene 5 gaze: looks at player (0-11.6s), entrance doors (11.6-16.2s), handle (16.2-17.6s), Helen (17.6-24.4s), then player (24.4s+)
      const florieLookTarget =
        t < 11.6
          ? new THREE.Vector3(this.tmpPlayerPos.x, 1.48, this.tmpPlayerPos.z)
          : t < 16.2
            ? new THREE.Vector3(0.26, 1.42, -11.5)
            : t < 17.6
              ? new THREE.Vector3(0.0, 1.05, -11.275)
              : t < 24.4
                ? HELEN_POS
                : new THREE.Vector3(this.tmpPlayerPos.x, 1.48, this.tmpPlayerPos.z);

      this.florieController.setNpcDialogueVisuals?.({
        lookAtPos: florieLookTarget,
        isTalking: florieTalking,
        speechLevel: florieTalking ? speechLevel : 0,
        speechTime,
      });

      const blushAmount = t >= 26.8 ? smoothstep((t - 26.8) / 0.6) : 0;
      if (t >= 7.0 && t < 9.1) {
        this.florieController.setCutsceneOverride?.({
          pose: 'florieArrival',
          expression: 'happy',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 11.6 && t < 16.2) {
        this.florieController.setCutsceneOverride?.({
          pose: 'takeArm',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 16.2 && t < 17.6) {
        this.florieController.setCutsceneOverride?.({
          pose: 'openDoor',
          expression: 'warmSmile',
          headGesture: 'none',
          blush: 0,
          time: t,
        });
      } else if (t >= 26.8) {
        this.florieController.setCutsceneOverride?.({
          pose: 'embarrassed',
          expression: 'embarrassed',
          headGesture: 'none',
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

    // 3. Helen (Mme Parker): calm deskRest, opens drawer & places enrollment form on desk (32.8s+)
    if (helen) {
      const helenVrm = helen.getVrmController();
      const drawerPos = new THREE.Vector3(-5.58, this.deskTopY - 0.14, -20.38);
      const lookTarget =
        t < 20.4
          ? new THREE.Vector3(-5.0, 0.72, -19.8)
          : t >= 32.8 && t < 36.0
            ? drawerPos
            : t >= 36.0 && t < 38.6
              ? this.paperRestPos
              : new THREE.Vector3(this.tmpPlayerPos.x, 1.48, this.tmpPlayerPos.z);

      if (helenVrm?.setCutsceneOverride) {
        if (t >= 32.8 && t < 34.25) {
          helenVrm.setCutsceneOverride({
            pose: 'standUp',
            expression: 'warmSmile',
            headGesture: 'none',
            blush: 0,
            time: t,
          });
        } else if (t >= 34.25 && t < 37.2) {
          helenVrm.setCutsceneOverride({
            pose: 'openDrawer',
            expression: 'warmSmile',
            headGesture: 'none',
            blush: 0,
            time: t,
          });
        } else if (t >= 37.2 && t < 39.65) {
          helenVrm.setCutsceneOverride({
            pose: 'placePaper',
            expression: 'warmSmile',
            headGesture: 'none',
            blush: 0,
            time: t,
          });
        } else if (t >= 39.65) {
          helenVrm.setCutsceneOverride({
            pose: 'placePaper',
            expression: 'warmSmile',
            headGesture: 'none',
            blush: 0,
            time: t,
          });
        } else if (t >= 20.8 && t < 22.8) {
          helenVrm.setCutsceneOverride({
            pose: 'deskRest',
            expression: 'happy',
            headGesture: 'gentleNod',
            blush: 0,
            time: t,
          });
        } else if (t >= 22.8 && t < 27.6) {
          helenVrm.setCutsceneOverride({
            pose: 'deskRest',
            expression: 'warmSmile',
            headGesture: 'none',
            blush: 0,
            time: t,
          });
        } else if (t >= 27.6 && t < 29.6) {
          helenVrm.setCutsceneOverride({
            pose: 'deskRest',
            expression: 'amused',
            headGesture: 'tilt',
            blush: 0,
            time: t,
          });
        } else if (t >= 29.6) {
          helenVrm.setCutsceneOverride({
            pose: 'deskRest',
            expression: 'happy',
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
      helen.update(dt, this.tmpPlayerPos, t >= 21.2, {
        lookAtPos: lookTarget,
        speechLevel: helenTalking ? speechLevel : 0,
        speechTime,
      });
    }

    // 3b. Animate Desk Drawer (tucked under desk edge) & 3D Paper held directly between Helen's thumb and fingertips
    const helenHumanoid = helen?.getVrmController()?.vrm?.humanoid;
    const helenFingerTip =
      helenHumanoid?.getNormalizedBoneNode('rightIndexDistal') ??
      helenHumanoid?.getNormalizedBoneNode('rightIndexIntermediate') ??
      helenHumanoid?.getNormalizedBoneNode('rightHand');
    const helenThumbTip = helenHumanoid?.getNormalizedBoneNode('rightThumbDistal');
    if (helenFingerTip) {
      helenFingerTip.updateWorldMatrix(true, false);
      helenFingerTip.getWorldPosition(this.tmpHelenHandPos);
      if (helenThumbTip) {
        helenThumbTip.updateWorldMatrix(true, false);
        helenThumbTip.getWorldPosition(this.tmpHelenThumbPos);
        this.tmpHelenHandPos.lerp(this.tmpHelenThumbPos, 0.5);
      }
    }
    if (this.drawerGroup && this.drawerBox) {
      if (t >= 35.2 && !this.drawerPosLocked && helenFingerTip) {
        // Keep drawer tucked cleanly BELOW deskTopY so it is only lightly visible under the desk edge
        this.drawerGroup.position.set(
          this.tmpHelenHandPos.x,
          this.deskTopY - 0.095,
          this.tmpHelenHandPos.z
        );
        this.drawerPosLocked = true;
      }
      if (t >= 34.4 && t < 38.2) {
        this.drawerGroup.visible = true;
        const openU = smoothstep((t - 34.6) / 0.9);
        const closeU = smoothstep((t - 36.4) / 1.0);
        const slideAmount = openU * (1 - closeU) * 0.075;
        this.drawerBox.position.z = -slideAmount;
      } else {
        this.drawerGroup.visible = false;
      }
    }
    if (this.paperGroup) {
      if (t >= 35.9) {
        this.paperGroup.visible = true;
        if (t < 37.6 && helenFingerTip) {
          this.paperGroup.position.set(
            this.tmpHelenHandPos.x + 0.03,
            this.tmpHelenHandPos.y,
            this.tmpHelenHandPos.z + 0.04
          );
          this.paperGroup.rotation.x = THREE.MathUtils.lerp(-0.22, -0.05, smoothstep((t - 35.9) / 1.7));
          this.paperGroup.rotation.y = this.paperYaw;
        } else if (t < 38.7) {
          const placeU = smoothstep((t - 37.6) / 1.1);
          if (helenFingerTip) {
            this.tmpHelenThumbPos.set(
              this.tmpHelenHandPos.x + 0.03,
              this.tmpHelenHandPos.y,
              this.tmpHelenHandPos.z + 0.04
            );
            this.paperGroup.position.lerpVectors(this.tmpHelenThumbPos, this.paperRestPos, placeU);
          } else {
            this.paperGroup.position.copy(this.paperRestPos);
          }
          this.paperGroup.rotation.x = THREE.MathUtils.lerp(-0.05, 0, placeU);
          this.paperGroup.rotation.y = this.paperYaw;
        } else {
          this.paperGroup.position.copy(this.paperRestPos);
          this.paperGroup.rotation.set(0, this.paperYaw, 0);
        }
      } else {
        this.paperGroup.visible = false;
      }
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
    } else if (t < 21.4) {
      shotIndex = 2;
      // Clean cut behind the duo: steady, unhurried walking follow under the arch & through the open doorway (z = -11.275)
      const midX = (this.tmpPlayerPos.x + this.tmpFloriePos.x) * 0.5;
      const midZ = (this.tmpPlayerPos.z + this.tmpFloriePos.z) * 0.5;
      const lobbyU = midZ < -13.2 ? smoothstep((-13.2 - midZ) / 4.5) : 0;
      const offsetX = THREE.MathUtils.lerp(-0.08, 0.45, lobbyU);
      const offsetZ = THREE.MathUtils.lerp(2.25, 2.05, lobbyU);
      this.desiredCamPos.set(midX + offsetX, 1.46, midZ + offsetZ);
      this.tmpCamTarget.set(midX, 1.30, midZ - 1.20);
    } else if (t < 24.4) {
      shotIndex = 3;
      // Clean cut to Helen behind the reception desk (clear of Player standing at the desk)
      const u = smoothstep((t - 21.4) / 3.0);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-4.65, -4.78, u),
        THREE.MathUtils.lerp(1.44, 1.45, u),
        THREE.MathUtils.lerp(-19.65, -19.78, u)
      );
      this.tmpCamTarget.set(HELEN_POS.x, THREE.MathUtils.lerp(1.22, 1.25, u), HELEN_POS.z);
    } else if (t < 28.8) {
      shotIndex = 4;
      // Framed cleanly on Florie (offset to the side behind Player) without obscuring Player at the desk
      const closeU = smoothstep((t - 26.4) / 1.8);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-4.52, -4.40, closeU),
        THREE.MathUtils.lerp(1.46, 1.47, closeU),
        THREE.MathUtils.lerp(-19.72, -19.58, closeU)
      );
      this.tmpCamTarget.set(
        this.tmpFloriePos.x,
        THREE.MathUtils.lerp(1.38, 1.41, closeU),
        this.tmpFloriePos.z
      );
    } else if (t < 32.8) {
      shotIndex = 5;
      // Clean cut to a calm, balanced 3-shot framing player in foreground, Florie behind him, and Helen
      const u = smoothstep((t - 28.8) / 4.0);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-2.35, -2.22, u),
        1.50,
        THREE.MathUtils.lerp(-17.35, -17.32, u)
      );
      this.tmpCamTarget.set(-4.15, 1.30, -19.05);
    } else if (t < 36.8) {
      shotIndex = 6;
      // SCENE 1: Camera smoothly turns toward Helen as she stands up, opens the drawer, and takes out the form
      const u = smoothstep((t - 32.8) / 2.4);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-2.22, -4.22, u),
        THREE.MathUtils.lerp(1.50, 1.46, u),
        THREE.MathUtils.lerp(-17.32, -19.25, u)
      );
      this.tmpCamTarget.set(
        THREE.MathUtils.lerp(-4.15, -5.28, u),
        THREE.MathUtils.lerp(1.30, 1.08, u),
        THREE.MathUtils.lerp(-19.05, -20.38, u)
      );
    } else if (t < 39.6) {
      shotIndex = 7;
      // SCENE 2: Smooth tracking downward following the document to an exact 90-degree top-down view
      const trackU = smoothstep((t - 36.8) / 2.8);
      this.desiredCamPos.set(
        THREE.MathUtils.lerp(-4.22, this.paperRestPos.x, trackU),
        THREE.MathUtils.lerp(1.46, this.deskTopY + 0.50, trackU),
        THREE.MathUtils.lerp(-19.25, this.paperRestPos.z, trackU)
      );
      this.tmpCamTarget.set(
        THREE.MathUtils.lerp(-5.28, this.paperRestPos.x, trackU),
        THREE.MathUtils.lerp(1.08, this.deskTopY, trackU),
        THREE.MathUtils.lerp(-20.38, this.paperRestPos.z, trackU)
      );
    } else if (t < 41.4) {
      shotIndex = 8;
      // SCENE 3: Exact 90-degree vertical top-down view centered on the enrollment form
      this.desiredCamPos.set(this.paperRestPos.x, this.deskTopY + 0.50, this.paperRestPos.z);
      this.tmpCamTarget.set(this.paperRestPos.x, this.deskTopY, this.paperRestPos.z);
    } else {
      shotIndex = 9;
      // SCENE 4: Straight, progressive push-in centered on the "PRÉNOM :" field (zero rotation)
      const zoomU = smoothstep((t - 41.4) / 3.1);
      const camX = THREE.MathUtils.lerp(this.paperRestPos.x, this.prenomWorldPos.x, zoomU);
      const camZ = THREE.MathUtils.lerp(this.paperRestPos.z, this.prenomWorldPos.z, zoomU);
      const camY = THREE.MathUtils.lerp(this.deskTopY + 0.50, this.deskTopY + 0.135, zoomU);
      this.desiredCamPos.set(camX, camY, camZ);
      this.tmpCamTarget.set(camX, this.deskTopY, camZ);
    }

    // Strict physical collision clamping for the camera (disabled during close desk/top-down tracking at t >= 36s)
    if (t < 36.0) {
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
    }

    const isSmoothTransition =
      this.camInitialized && this.lastShotIndex !== shotIndex && (shotIndex <= 2 || shotIndex >= 6);
    if (!this.camInitialized || (this.lastShotIndex !== shotIndex && !isSmoothTransition)) {
      this.camPosCurrent.copy(this.desiredCamPos);
      this.camLookCurrent.copy(this.tmpCamTarget);
      this.camInitialized = true;
      this.lastShotIndex = shotIndex;
    } else {
      this.lastShotIndex = shotIndex;
      const dampRate = shotIndex >= 7 ? 12.0 : shotIndex <= 2 || shotIndex === 6 ? 2.6 : 3.8;
      const camDamp = 1 - Math.exp(-dampRate * Math.min(Math.max(dt, 0.001), 0.05));
      this.camPosCurrent.lerp(this.desiredCamPos, camDamp);
      this.camLookCurrent.lerp(this.tmpCamTarget, camDamp);
    }

    // Align camera.up smoothly to paper orientation for exact 90-degree gimbal-free top-down view
    const topUpX = -Math.sin(this.paperYaw);
    const topUpZ = -Math.cos(this.paperYaw);
    if (t < 36.8) {
      camera.up.set(0, 1, 0);
    } else if (t < 39.6) {
      const upU = smoothstep((t - 36.8) / 2.8);
      camera.up.set(topUpX * upU, 1 - upU, topUpZ * upU).normalize();
    } else {
      camera.up.set(topUpX, 0, topUpZ);
    }

    camera.position.copy(this.camPosCurrent);
    camera.lookAt(this.camLookCurrent);
  }

  public dispose(player: Player, helen: CampusNPC | undefined): void {
    this.disposed = true;
    if (this.savedCamera) {
      this.savedCamera.up.set(0, 1, 0);
      this.savedCamera = null;
    }
    if (this.drawerGroup) {
      this.scene.remove(this.drawerGroup);
      this.drawerGroup = null;
      this.drawerBox = null;
    }
    if (this.paperGroup) {
      this.scene.remove(this.paperGroup);
      this.paperGroup = null;
    }
    if (this.paperTexture) {
      this.paperTexture.dispose();
      this.paperTexture = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
    }
    if (this.florieController) {
      this.scene.remove(this.florieController.container);
      this.florieController = null;
    }
    player.getVrmController()?.setCutsceneOverride?.(null);
    player.getVrmController()?.setNpcDialogueVisuals?.({
      lookAtPos: null,
      isTalking: false,
      speechLevel: 0,
      speechTime: 0,
    });
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
