import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  VRM,
  VRMLoaderPlugin,
  VRMUtils,
  VRMHumanBoneName,
  VRMSpringBoneColliderShapeSphere,
  VRMSpringBoneColliderShapeCapsule,
} from '@pixiv/three-vrm';
import { createSoftContactShadow, type AnimState } from './PlayerAnimations';
import {
  computeStylizedAnimeGait,
  createEmptyGaitPose,
  createStylizedGaitBlendState,
} from './StylizedWalk';
import {
  applyBlenderSitPose,
  isBlenderSitAnimReady,
  preloadBlenderSitAnim,
} from './BlenderSitAnim';
import {
  applyBlenderFlorieArrivalPose,
  applyBlenderFlorieEmbarrassedPose,
  applyBlenderFloriePushDoorPose,
  applyBlenderHelenDrawerPaperPose,
  applyBlenderInspectHandsPose,
  applyBlenderPlayerConfusedGlancePose,
  preloadBlenderFlorieArrivalAnim,
  preloadBlenderFlorieEmbarrassedAnim,
  preloadBlenderFloriePushDoorAnim,
  preloadBlenderHelenDrawerPaperAnim,
  preloadBlenderInspectHandsAnim,
  preloadBlenderPlayerConfusedGlanceAnim,
} from './BlenderCutsceneAnim';

export type CutsceneActorPose =
  | 'none'
  | 'inspectHands'
  | 'florieArrival'
  | 'wave'
  | 'takeArm'
  | 'openDoor'
  | 'deskRest'
  | 'standUp'
  | 'openDrawer'
  | 'placePaper'
  | 'confusedGlance'
  | 'embarrassed'
  | 'chuckle';

export type CutsceneExpression =
  | 'none'
  | 'confused'
  | 'warmSmile'
  | 'happy'
  | 'embarrassed'
  | 'amused'
  | 'laugh'
  | 'surprised';

export type CutsceneHeadGesture = 'none' | 'nod' | 'gentleNod' | 'shake' | 'tilt';

export interface CutsceneActorOverride {
  pose: CutsceneActorPose;
  expression: CutsceneExpression;
  headGesture: CutsceneHeadGesture;
  blush: number;
  time: number;
}

export interface FlorieVRMController {
  vrm: VRM | null;
  container: THREE.Group;
  sourceLabel: string;
  update: (state: AnimState, gaitPhase: number, interactTimer: number, dt: number) => void;
  updateIntroCutscene: (
    introTime: number,
    dt: number,
    floriePos?: THREE.Vector3,
    playerYaw?: number,
    cameraPos?: THREE.Vector3
  ) => void;
  setNpcDialogueVisuals?: (opts: {
    lookAtPos: THREE.Vector3 | null;
    isTalking: boolean;
    speechLevel: number;
    speechTime: number;
  }) => void;
  setCutsceneOverride?: (opts: CutsceneActorOverride | null) => void;
}

type VisemeKey = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';
type VisemeCue = [
  start: number,
  end: number,
  v1: VisemeKey,
  w1: number,
  v2?: VisemeKey,
  w2?: number,
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Character-accurate French phoneme-to-viseme cues extracted via ElevenLabs Scribe v2
 * from florie_intro_1.mp3 ("Coucou, bienvenue à Maple Wood. Je m'appelle Florie. Je suis trop contente de te voir aujourd'hui")
 * Weights are calibrated (0.14 - 0.25) so her mouth opens delicately and closes naturally on bilabials (b, m, p).
 */
const VISEME_CUES_LINE_0: VisemeCue[] = [
  // "Cou-cou" (0.10 - 0.48)
  [0.10, 0.25, 'ou', 0.24, 'oh', 0.06],
  [0.27, 0.48, 'ou', 0.25, 'oh', 0.05],
  // "bien-ve-nue" (0.88 - 1.26, 'b' closed 0.88-0.92)
  [0.92, 0.99, 'ih', 0.19],
  [0.99, 1.10, 'ee', 0.20, 'aa', 0.08],
  [1.13, 1.19, 'oh', 0.15],
  [1.19, 1.27, 'ou', 0.22, 'ih', 0.07],
  // "à" (1.31 - 1.41)
  [1.31, 1.41, 'aa', 0.23],
  // "Ma-ple" (1.46 - 1.76, 'M' closed 1.46-1.50, 'p' closed 1.62-1.65)
  [1.51, 1.62, 'ee', 0.19, 'aa', 0.11],
  [1.65, 1.76, 'oh', 0.16],
  // "Wood" (1.82 - 2.12)
  [1.82, 2.04, 'ou', 0.24, 'oh', 0.06],
  [2.04, 2.12, 'ih', 0.10],
  // "Je" (2.48 - 2.55)
  [2.48, 2.55, 'oh', 0.16, 'ou', 0.06],
  // "m'ap-pelle" (2.56 - 2.88, 'm' closed 2.56-2.61, 'pp' closed 2.68-2.73)
  [2.61, 2.68, 'aa', 0.22],
  [2.73, 2.89, 'ee', 0.21, 'aa', 0.07],
  // "Flo-rie" (2.96 - 3.32)
  [2.97, 3.05, 'ih', 0.07],
  [3.05, 3.18, 'oh', 0.22],
  [3.18, 3.33, 'ih', 0.21, 'ee', 0.07],
  // "Je suis" (3.48 - 3.86)
  [3.48, 3.60, 'oh', 0.16],
  [3.64, 3.72, 'ou', 0.21],
  [3.72, 3.86, 'ih', 0.20],
  // "trop" (3.92 - 4.18, 'p' closed at end)
  [3.93, 4.01, 'ih', 0.07],
  [4.01, 4.16, 'oh', 0.22, 'ou', 0.06],
  // "con-ten-te" (4.22 - 4.56)
  [4.24, 4.38, 'oh', 0.21, 'ou', 0.07],
  [4.39, 4.50, 'aa', 0.21, 'oh', 0.07],
  [4.50, 4.56, 'ih', 0.11],
  // "de te" (4.60 - 4.76)
  [4.60, 4.67, 'oh', 0.14],
  [4.70, 4.77, 'oh', 0.14],
  // "voir" (4.78 - 4.96)
  [4.81, 4.87, 'ou', 0.19],
  [4.87, 4.96, 'aa', 0.22],
  // "au-jour-d'hui" (4.98 - 5.44)
  [4.98, 5.08, 'oh', 0.20],
  [5.08, 5.22, 'ou', 0.23],
  [5.26, 5.34, 'ou', 0.20],
  [5.34, 5.45, 'ih', 0.21, 'ee', 0.08],
];

/**
 * Character-accurate French phoneme-to-viseme cues extracted via ElevenLabs Scribe v2
 * from florie_intro_2.mp3 ("Allez, viens, suis-moi à l'intérieur du bâtiment. Je vais te faire visiter tout le campus")
 */
const VISEME_CUES_LINE_1: VisemeCue[] = [
  // "Al-lez" (0.05 - 0.25)
  [0.05, 0.13, 'aa', 0.22],
  [0.13, 0.25, 'ee', 0.21, 'ih', 0.07],
  // "viens" (0.30 - 0.50)
  [0.33, 0.39, 'ih', 0.19],
  [0.39, 0.51, 'ee', 0.20, 'aa', 0.10],
  // "suis-moi" (0.82 - 1.08, 'm' closed 0.95-1.00)
  [0.83, 0.89, 'ou', 0.21],
  [0.89, 0.95, 'ih', 0.19],
  [1.00, 1.04, 'ou', 0.19],
  [1.04, 1.09, 'aa', 0.22],
  // "à l'in-té-rieur" (1.11 - 1.56)
  [1.11, 1.16, 'aa', 0.19],
  [1.17, 1.31, 'ee', 0.19, 'ih', 0.08],
  [1.31, 1.41, 'ee', 0.21],
  [1.41, 1.48, 'ih', 0.19],
  [1.48, 1.57, 'oh', 0.19, 'ee', 0.07],
  // "du" (1.60 - 1.67)
  [1.60, 1.67, 'ou', 0.22],
  // "bâ-ti-ment" (1.70 - 2.12, 'b' closed 1.70-1.74, 'm' closed 1.96-1.99)
  [1.75, 1.86, 'aa', 0.23],
  [1.86, 1.96, 'ih', 0.19],
  [2.00, 2.13, 'aa', 0.18, 'oh', 0.10],
  // "Je vais te faire" (2.54 - 3.05)
  [2.54, 2.61, 'oh', 0.15],
  [2.65, 2.73, 'ee', 0.20],
  [2.76, 2.85, 'oh', 0.14],
  [2.90, 3.05, 'ee', 0.20, 'aa', 0.10],
  // "vi-si-ter" (3.08 - 3.45)
  [3.11, 3.20, 'ih', 0.19],
  [3.21, 3.33, 'ih', 0.21],
  [3.33, 3.45, 'ee', 0.21],
  // "tout le cam-pus" (3.66 - 4.42, 'mp' closed 4.08-4.16)
  [3.66, 3.77, 'ou', 0.22],
  [3.80, 3.89, 'oh', 0.15],
  [3.94, 4.08, 'aa', 0.21, 'oh', 0.07],
  [4.16, 4.26, 'ou', 0.22],
  [4.26, 4.42, 'ih', 0.13],
];

function sampleIntroVisemes(introTime: number): Record<VisemeKey, number> {
  const out: Record<VisemeKey, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  const isSecondLine = introTime >= 6.2;
  const lineTime = isSecondLine ? introTime - 6.25 : introTime - 0.08;
  if (lineTime < 0) return out;

  const cues = isSecondLine ? VISEME_CUES_LINE_1 : VISEME_CUES_LINE_0;
  for (let i = 0; i < cues.length; i++) {
    const [start, end, v1, w1, v2, w2] = cues[i];
    if (lineTime >= start && lineTime <= end) {
      const u = (lineTime - start) / Math.max(0.01, end - start);
      const env = Math.sin(u * Math.PI);
      out[v1] = Math.max(out[v1], w1 * env);
      if (v2 && w2) {
        out[v2] = Math.max(out[v2], w2 * env);
      }
    }
  }
  return out;
}

const IDB_NAME = 'maplewood-vrm-cache';
const IDB_STORE = 'models';
const IDB_KEY = 'florie-vrm-buffer-v2';

function openVrmDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVrmBufferToCache(buffer: ArrayBuffer, fileName: string): Promise<void> {
  try {
    const db = await openVrmDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ buffer, fileName, updatedAt: Date.now() }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export async function loadVrmBufferFromCache(): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  try {
    const db = await openVrmDb();
    const res = await new Promise<{ buffer: ArrayBuffer; fileName: string } | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return res;
  } catch {
    return null;
  }
}

/**
 * Verifies that an ArrayBuffer starts with the binary glTF/VRM magic header ("glTF" = 0x46546C67).
 * Prevents Vite SPA HTML fallbacks from being parsed as VRM models.
 */
function isBinaryGltfOrVrm(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 20) return false;
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  return magic === 0x46546c67;
}

/**
 * Discovers Florie's VRM model by checking:
 * 1) User-imported VRM persisted in IndexedDB (if the user customized it via drag-and-drop / file picker)
 * 2) Default bundled /Florie.vrm and /assets/models/Florie.vrm (or any .vrm in /src)
 */
export async function discoverFlorieVrmBuffer(): Promise<{ buffer: ArrayBuffer; label: string } | null> {
  // 1) Check IndexedDB cache first in case the user imported a custom .vrm in the browser
  const cached = await loadVrmBufferFromCache();
  if (cached && isBinaryGltfOrVrm(cached.buffer)) {
    return { buffer: cached.buffer, label: cached.fileName };
  }

  // 2) Check /src tree for any bundled .vrm file
  const globModules = import.meta.glob(['/src/**/*.vrm', '/src/**/*.VRM'], {
    query: '?url',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const candidateUrls: Array<{ url: string; label: string }> = [];

  for (const [path, url] of Object.entries(globModules)) {
    if (typeof url === 'string') {
      const fileName = path.split('/').pop() || 'Florie.vrm';
      candidateUrls.push({ url, label: fileName });
    }
  }

  // 3) Standard static public candidate paths (with bundled /Florie.vrm & /assets/models/Florie.vrm first)
  const staticPaths = [
    '/assets/models/Florie.vrm',
    '/assets/models/florie.vrm',
    '/assets/models/player.vrm',
    '/assets/aistudio/Florie.vrm',
    '/assets/aistudio/florie.vrm',
    '/models/Florie.vrm',
    '/models/florie.vrm',
  ];
  for (const sp of staticPaths) {
    candidateUrls.push({ url: sp, label: sp.split('/').pop() || 'Florie.vrm' });
  }

  for (const cand of candidateUrls) {
    try {
      const res = await fetch(cand.url);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) continue;
      const buf = await res.arrayBuffer();
      if (isBinaryGltfOrVrm(buf)) {
        return { buffer: buf, label: cand.label };
      }
    } catch {
      // Continue checking next candidate path
    }
  }

  return null;
}

const _worldPosA = new THREE.Vector3();
const _worldPosB = new THREE.Vector3();
const _worldPosC = new THREE.Vector3();
const _clampedQuat = new THREE.Quaternion();

interface TunedSpringJoint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  joint: any;
  isDressOrSkirt: boolean;
  maxAngleRad: number;
  restQuat: THREE.Quaternion;
  smoothedQuat: THREE.Quaternion;
}

/**
 * Checks if a bone node belongs to the dress/skirt/lower-body cloth hierarchy
 * (either by name or by NOT being a descendant of the head/neck).
 */
function isDressOrClothBone(bone: THREE.Object3D, headNode: THREE.Object3D | null): boolean {
  const name = (bone.name || '').toLowerCase();
  if (/skirt|dress|robe|hem|frill|apron|coat|cloth|pleat|hip|leg|pelvis/i.test(name)) {
    return true;
  }
  if (/hair|bang|ahoge|lock|pony|twin|ear/i.test(name)) {
    return false;
  }
  if (headNode) {
    let cur: THREE.Object3D | null = bone;
    while (cur) {
      if (cur === headNode) return false;
      cur = cur.parent;
    }
    return true;
  }
  return false;
}

/**
 * Parses a binary .vrm (or .glb) ArrayBuffer and constructs an animated FlorieVRMController
 * with supple, anatomical multi-joint walking kinematics and natural, non-bouncing cloth physics.
 */
export async function parseFlorieVrmFromBuffer(
  buffer: ArrayBuffer,
  sourceLabel = 'Florie.vrm'
): Promise<FlorieVRMController> {
  if (!isBinaryGltfOrVrm(buffer)) {
    throw new Error('Le fichier sélectionné n’est pas un fichier binaire VRM / GLB valide.');
  }

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await loader.parseAsync(buffer, '');
  const vrm = (gltf.userData.vrm as VRM | undefined) || null;

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);

  const container = new THREE.Group();
  container.name = 'FlorieVRMContainer';

  const modelRoot = vrm ? vrm.scene : gltf.scene;

  if (vrm) {
    // Normalize VRM 0.0 orientation to match VRM 1.0 (+Z forward in local space)
    VRMUtils.rotateVRM0(vrm);
  }

  // Rotate by PI so character faces -Z (North) when Player.yaw === 0
  const facingPivot = new THREE.Group();
  facingPivot.rotation.y = Math.PI;
  facingPivot.add(modelRoot);
  container.add(facingPivot);

  modelRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = false;
      obj.frustumCulled = false;
    }
  });

  // Feathered radial contact shadow under Florie
  container.add(createSoftContactShadow(1.05));

  // Resolve VRM humanoid normalized bone nodes for procedural gait & idle animation
  const getBone = (name: VRMHumanBoneName): THREE.Object3D | null =>
    vrm?.humanoid?.getNormalizedBoneNode(name) || null;

  const hips = getBone(VRMHumanBoneName.Hips);
  const spine = getBone(VRMHumanBoneName.Spine);
  const chest = getBone(VRMHumanBoneName.Chest);
  const upperChest = getBone(VRMHumanBoneName.UpperChest);
  const neck = getBone(VRMHumanBoneName.Neck);
  const head = getBone(VRMHumanBoneName.Head);
  const leftEye = getBone(VRMHumanBoneName.LeftEye);
  const rightEye = getBone(VRMHumanBoneName.RightEye);

  const leftShoulder = getBone(VRMHumanBoneName.LeftShoulder);
  const rightShoulder = getBone(VRMHumanBoneName.RightShoulder);
  const leftUpperArm = getBone(VRMHumanBoneName.LeftUpperArm);
  const rightUpperArm = getBone(VRMHumanBoneName.RightUpperArm);
  const leftLowerArm = getBone(VRMHumanBoneName.LeftLowerArm);
  const rightLowerArm = getBone(VRMHumanBoneName.RightLowerArm);
  const leftHand = getBone(VRMHumanBoneName.LeftHand);
  const rightHand = getBone(VRMHumanBoneName.RightHand);

  const leftUpperLeg = getBone(VRMHumanBoneName.LeftUpperLeg);
  const rightUpperLeg = getBone(VRMHumanBoneName.RightUpperLeg);
  const leftLowerLeg = getBone(VRMHumanBoneName.LeftLowerLeg);
  const rightLowerLeg = getBone(VRMHumanBoneName.RightLowerLeg);
  const leftFoot = getBone(VRMHumanBoneName.LeftFoot);
  const rightFoot = getBone(VRMHumanBoneName.RightFoot);
  const leftToes = getBone(VRMHumanBoneName.LeftToes);
  const rightToes = getBone(VRMHumanBoneName.RightToes);

  // Optional direct reference to bundled skirt drape node for subtle procedural cloth ripple
  const bundledSkirtDrape = modelRoot.getObjectByName('skirtDrapeRoot') || null;

  const baseHipsPos = hips ? hips.position.clone() : new THREE.Vector3(0, 0.85, 0);

  // Ensure XYZ Euler order on upper arms so Z lowers from T-pose first and X swings forward/back cleanly
  if (leftUpperArm) leftUpperArm.rotation.order = 'XYZ';
  if (rightUpperArm) rightUpperArm.rotation.order = 'XYZ';
  // Use YXZ on lower arms so X twists around the forearm shaft before Y bends the elbow
  if (leftLowerArm) leftLowerArm.rotation.order = 'YXZ';
  if (rightLowerArm) rightLowerArm.rotation.order = 'YXZ';
  if (leftHand) leftHand.rotation.order = 'XYZ';
  if (rightHand) rightHand.rotation.order = 'XYZ';

  // Automatically determine which Z-rotation sign brings each upper arm DOWN from T-pose
  let leftArmDownZ = -1.26;
  let rightArmDownZ = 1.26;

  if (vrm && leftUpperArm && (leftHand || leftLowerArm)) {
    const probe = leftHand || leftLowerArm!;
    leftUpperArm.rotation.z = -1.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(_worldPosA);

    leftUpperArm.rotation.z = 1.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(_worldPosB);

    leftArmDownZ = _worldPosA.y < _worldPosB.y ? -1.26 : 1.26;
    leftUpperArm.rotation.z = leftArmDownZ;
  }

  if (vrm && rightUpperArm && (rightHand || rightLowerArm)) {
    const probe = rightHand || rightLowerArm!;
    rightUpperArm.rotation.z = 1.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(_worldPosA);

    rightUpperArm.rotation.z = -1.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(_worldPosB);

    rightArmDownZ = _worldPosA.y < _worldPosB.y ? 1.26 : -1.26;
    rightUpperArm.rotation.z = rightArmDownZ;
  }

  // In VRM 0.0 (rightArmDownZ < 0), +X pitches a lowered arm forward; in VRM 1.0 (rightArmDownZ > 0), -X pitches forward
  const armForwardXSign = -Math.sign(rightArmDownZ);
  const leftCurlSign = Math.sign(leftArmDownZ);

  // Probe lower-body X-axis & Z-adduction signs in container space (-Z forward, +Z back, -Y down)
  let thighForwardXSign = -1;
  let leftThighInwardZSign = -1;
  let rightThighInwardZSign = 1;
  let kneeBackXSign = 1;
  let ankleDownXSign = 1;

  if (vrm && leftUpperLeg && leftFoot) {
    leftUpperLeg.rotation.x = -0.6;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftFoot.getWorldPosition(_worldPosA);

    leftUpperLeg.rotation.x = 0.6;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftFoot.getWorldPosition(_worldPosB);

    thighForwardXSign = _worldPosA.z < _worldPosB.z ? -1 : 1;
    leftUpperLeg.rotation.x = 0;

    // Probe which Z sign brings leftFoot closer to centerline (smaller |x| in container space)
    leftUpperLeg.rotation.z = -0.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftFoot.getWorldPosition(_worldPosA);

    leftUpperLeg.rotation.z = 0.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftFoot.getWorldPosition(_worldPosB);

    leftThighInwardZSign = Math.abs(_worldPosA.x) < Math.abs(_worldPosB.x) ? -1 : 1;
    leftUpperLeg.rotation.z = 0;
  }

  if (vrm && rightUpperLeg && rightFoot) {
    rightUpperLeg.rotation.z = 0.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    rightFoot.getWorldPosition(_worldPosA);

    rightUpperLeg.rotation.z = -0.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    rightFoot.getWorldPosition(_worldPosB);

    rightThighInwardZSign = Math.abs(_worldPosA.x) < Math.abs(_worldPosB.x) ? 1 : -1;
    rightUpperLeg.rotation.z = 0;
  }

  if (vrm && leftLowerLeg && leftFoot) {
    leftLowerLeg.rotation.x = 0.6;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftFoot.getWorldPosition(_worldPosA);

    leftLowerLeg.rotation.x = -0.6;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftFoot.getWorldPosition(_worldPosB);

    kneeBackXSign = _worldPosA.z > _worldPosB.z ? 1 : -1;
    leftLowerLeg.rotation.x = 0;
  }

  if (vrm && leftFoot && leftToes) {
    leftFoot.rotation.x = 0.5;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftToes.getWorldPosition(_worldPosA);

    leftFoot.rotation.x = -0.5;
    vrm.update(0);
    container.updateMatrixWorld(true);
    leftToes.getWorldPosition(_worldPosB);

    ankleDownXSign = _worldPosA.y < _worldPosB.y ? 1 : -1;
    leftFoot.rotation.x = 0;
    vrm.update(0);
  }
  const rightCurlSign = Math.sign(rightArmDownZ);

  // Geometrically probe upper-body forward pitch & elbow flexion signs in container space (-Z forward)
  const probeForwardZSign = (
    bone: THREE.Object3D | null,
    axis: 'x' | 'y',
    effector: THREE.Object3D | null,
    angle = 0.55,
    fallback = 1
  ): number => {
    if (!vrm || !bone || !effector) return fallback;
    const prev = bone.rotation[axis];
    bone.rotation[axis] = angle;
    vrm.update(0);
    container.updateMatrixWorld(true);
    effector.getWorldPosition(_worldPosA);

    bone.rotation[axis] = -angle;
    vrm.update(0);
    container.updateMatrixWorld(true);
    effector.getWorldPosition(_worldPosB);

    bone.rotation[axis] = prev;
    vrm.update(0);
    return _worldPosA.z < _worldPosB.z ? 1 : -1;
  };

  const spineForwardXSign = probeForwardZSign(spine, 'x', head || chest, 0.4, 1);
  const leftArmForwardXSign = probeForwardZSign(
    leftUpperArm,
    'x',
    leftHand || leftLowerArm,
    0.55,
    armForwardXSign
  );
  const rightArmForwardXSign = probeForwardZSign(
    rightUpperArm,
    'x',
    rightHand || rightLowerArm,
    0.55,
    armForwardXSign
  );
  const leftElbowForwardYSign = probeForwardZSign(leftLowerArm, 'y', leftHand, 0.6, -1);
  const rightElbowForwardYSign = probeForwardZSign(rightLowerArm, 'y', rightHand, 0.6, 1);

  const probeArmInwardYSign = (
    upperArm: THREE.Object3D | null,
    lowerArm: THREE.Object3D | null,
    handNode: THREE.Object3D | null,
    elbowSign: number,
    fallback: number
  ): number => {
    if (!vrm || !upperArm || !lowerArm || !handNode) return fallback;
    const prevY = upperArm.rotation.y;
    const prevElbow = lowerArm.rotation.y;
    lowerArm.rotation.y = elbowSign * 1.1;

    upperArm.rotation.y = 0.5;
    vrm.update(0);
    container.updateMatrixWorld(true);
    handNode.getWorldPosition(_worldPosA);

    upperArm.rotation.y = -0.5;
    vrm.update(0);
    container.updateMatrixWorld(true);
    handNode.getWorldPosition(_worldPosB);

    upperArm.rotation.y = prevY;
    lowerArm.rotation.y = prevElbow;
    vrm.update(0);
    return Math.abs(_worldPosA.x) < Math.abs(_worldPosB.x) ? 1 : -1;
  };

  const leftArmInwardYSign = probeArmInwardYSign(leftUpperArm, leftLowerArm, leftHand, leftElbowForwardYSign, -1);
  const rightArmInwardYSign = probeArmInwardYSign(
    rightUpperArm,
    rightLowerArm,
    rightHand,
    rightElbowForwardYSign,
    1
  );

  const probeShoulderUpZSign = (
    shoulder: THREE.Object3D | null,
    upperArm: THREE.Object3D | null,
    fallback: number
  ): number => {
    if (!vrm || !shoulder || !upperArm) return fallback;
    const prevZ = shoulder.rotation.z;
    shoulder.rotation.z = 0.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    upperArm.getWorldPosition(_worldPosA);

    shoulder.rotation.z = -0.25;
    vrm.update(0);
    container.updateMatrixWorld(true);
    upperArm.getWorldPosition(_worldPosB);

    shoulder.rotation.z = prevZ;
    vrm.update(0);
    return _worldPosA.y > _worldPosB.y ? 1 : -1;
  };

  const leftShoulderUpZSign = probeShoulderUpZSign(leftShoulder, leftUpperArm, -Math.sign(leftArmDownZ));
  const rightShoulderUpZSign = probeShoulderUpZSign(rightShoulder, rightUpperArm, -Math.sign(rightArmDownZ));

  // Geometrically probe palm curl sign in T-pose (smaller world Y = inward toward palm)
  const probeFingerCurlSign = (
    upperArm: THREE.Object3D | null,
    fingerProx: THREE.Object3D | null,
    fingerTip: THREE.Object3D | null,
    fallback: number
  ): number => {
    if (!vrm || !upperArm || !fingerProx || !fingerTip) return fallback;
    const prevArmZ = upperArm.rotation.z;
    const prevZ = fingerProx.rotation.z;
    upperArm.rotation.z = 0;

    fingerProx.rotation.z = 0.8;
    vrm.update(0);
    container.updateMatrixWorld(true);
    fingerTip.getWorldPosition(_worldPosA);

    fingerProx.rotation.z = -0.8;
    vrm.update(0);
    container.updateMatrixWorld(true);
    fingerTip.getWorldPosition(_worldPosB);

    fingerProx.rotation.z = prevZ;
    upperArm.rotation.z = prevArmZ;
    vrm.update(0);
    return _worldPosA.y < _worldPosB.y ? 1 : -1;
  };

  const leftFingerCurlSign = probeFingerCurlSign(
    leftUpperArm,
    getBone(VRMHumanBoneName.LeftMiddleProximal),
    getBone(VRMHumanBoneName.LeftMiddleDistal) || getBone(VRMHumanBoneName.LeftMiddleIntermediate),
    leftCurlSign
  );
  const rightFingerCurlSign = probeFingerCurlSign(
    rightUpperArm,
    getBone(VRMHumanBoneName.RightMiddleProximal),
    getBone(VRMHumanBoneName.RightMiddleDistal) || getBone(VRMHumanBoneName.RightMiddleIntermediate),
    rightCurlSign
  );

  // Cache all 3 phalanges (proximal, intermediate, distal) per finger for resting curl, fanning & closed fists
  interface CachedFingerBone {
    bone: THREE.Object3D;
    restZ: number;
    fistZ: number;
    fingerIdx: number;
  }
  const buildHandFingers = (
    defs: Array<[VRMHumanBoneName, number, number, number]>,
    curlSign: number
  ): CachedFingerBone[] => {
    const out: CachedFingerBone[] = [];
    for (const [fName, restMag, fistMag, fingerIdx] of defs) {
      const fb = getBone(fName);
      if (fb) {
        const restZ = curlSign * restMag;
        const fistZ = curlSign * fistMag;
        fb.rotation.z = restZ;
        out.push({ bone: fb, restZ, fistZ, fingerIdx });
      }
    }
    return out;
  };

  const leftFingerBones = buildHandFingers(
    [
      [VRMHumanBoneName.LeftIndexProximal, 0.18, 1.24, 0],
      [VRMHumanBoneName.LeftIndexIntermediate, 0.22, 1.44, 0],
      [VRMHumanBoneName.LeftIndexDistal, 0.14, 0.96, 0],
      [VRMHumanBoneName.LeftMiddleProximal, 0.22, 1.28, 1],
      [VRMHumanBoneName.LeftMiddleIntermediate, 0.25, 1.46, 1],
      [VRMHumanBoneName.LeftMiddleDistal, 0.16, 0.98, 1],
      [VRMHumanBoneName.LeftRingProximal, 0.25, 1.28, 2],
      [VRMHumanBoneName.LeftRingIntermediate, 0.28, 1.46, 2],
      [VRMHumanBoneName.LeftRingDistal, 0.18, 0.96, 2],
      [VRMHumanBoneName.LeftLittleProximal, 0.28, 1.24, 3],
      [VRMHumanBoneName.LeftLittleIntermediate, 0.3, 1.42, 3],
      [VRMHumanBoneName.LeftLittleDistal, 0.2, 0.92, 3],
    ],
    leftFingerCurlSign
  );

  const rightFingerBones = buildHandFingers(
    [
      [VRMHumanBoneName.RightIndexProximal, 0.18, 1.24, 0],
      [VRMHumanBoneName.RightIndexIntermediate, 0.22, 1.44, 0],
      [VRMHumanBoneName.RightIndexDistal, 0.14, 0.96, 0],
      [VRMHumanBoneName.RightMiddleProximal, 0.22, 1.28, 1],
      [VRMHumanBoneName.RightMiddleIntermediate, 0.25, 1.46, 1],
      [VRMHumanBoneName.RightMiddleDistal, 0.16, 0.98, 1],
      [VRMHumanBoneName.RightRingProximal, 0.25, 1.28, 2],
      [VRMHumanBoneName.RightRingIntermediate, 0.28, 1.46, 2],
      [VRMHumanBoneName.RightRingDistal, 0.18, 0.96, 2],
      [VRMHumanBoneName.RightLittleProximal, 0.28, 1.24, 3],
      [VRMHumanBoneName.RightLittleIntermediate, 0.3, 1.42, 3],
      [VRMHumanBoneName.RightLittleDistal, 0.2, 0.92, 3],
    ],
    rightFingerCurlSign
  );

  const leftThumbMetacarpal = getBone(VRMHumanBoneName.LeftThumbMetacarpal);
  const leftThumbProximal = getBone(VRMHumanBoneName.LeftThumbProximal);
  const leftThumbDistal = getBone(VRMHumanBoneName.LeftThumbDistal);
  const rightThumbMetacarpal = getBone(VRMHumanBoneName.RightThumbMetacarpal);
  const rightThumbProximal = getBone(VRMHumanBoneName.RightThumbProximal);
  const rightThumbIntermediate = getBone(VRMHumanBoneName.RightThumbDistal);

  // Geometrically probe which forearm/wrist X-rotation sign turns the palm forward (-Z in container space,
  // facing the camera when Florie faces +Z) by checking which sign moves the thumb outward (larger |x|).
  const probePalmForwardXSign = (
    upperArm: THREE.Object3D | null,
    downZ: number,
    lowerArm: THREE.Object3D | null,
    elbowSign: number,
    thumbBone: THREE.Object3D | null,
    fallback: number
  ): number => {
    if (!vrm || !upperArm || !lowerArm || !thumbBone) return fallback;
    const prevUZ = upperArm.rotation.z;
    const prevLY = lowerArm.rotation.y;
    const prevLX = lowerArm.rotation.x;
    upperArm.rotation.z = downZ * 0.75;
    lowerArm.rotation.y = elbowSign * 1.1;

    lowerArm.rotation.x = 1.0;
    vrm.update(0);
    container.updateMatrixWorld(true);
    thumbBone.getWorldPosition(_worldPosA);

    lowerArm.rotation.x = -1.0;
    vrm.update(0);
    container.updateMatrixWorld(true);
    thumbBone.getWorldPosition(_worldPosB);

    upperArm.rotation.z = prevUZ;
    lowerArm.rotation.y = prevLY;
    lowerArm.rotation.x = prevLX;
    vrm.update(0);
    return Math.abs(_worldPosA.x) > Math.abs(_worldPosB.x) ? 1 : -1;
  };
  const leftPalmForwardXSign = probePalmForwardXSign(
    leftUpperArm,
    leftArmDownZ,
    leftLowerArm,
    leftElbowForwardYSign,
    leftThumbProximal,
    1
  );
  const rightPalmForwardXSign = probePalmForwardXSign(
    rightUpperArm,
    rightArmDownZ,
    rightLowerArm,
    rightElbowForwardYSign,
    rightThumbProximal,
    -1
  );

  // Geometrically probe which thumb rotation axes/signs tuck the thumb across curled fingers into a fist
  interface ThumbTuckAxes {
    x: number;
    y: number;
    z: number;
  }
  const probeThumbTuckAxes = (
    fingerBones: CachedFingerBone[],
    thumbProx: THREE.Object3D | null,
    thumbTip: THREE.Object3D | null,
    targetKnuckle: THREE.Object3D | null,
    fallbackZ: number
  ): ThumbTuckAxes => {
    if (!vrm || !thumbProx || !thumbTip || !targetKnuckle) {
      return { x: 0, y: 0.65, z: fallbackZ * 0.65 };
    }
    // Temporarily curl fingers into a real fist so targetKnuckle sits inside the palm
    const savedFingers = fingerBones.map((f) => f.bone.rotation.z);
    for (const f of fingerBones) f.bone.rotation.z = f.fistZ;
    vrm.update(0);
    container.updateMatrixWorld(true);
    targetKnuckle.getWorldPosition(_worldPosC);
    thumbTip.getWorldPosition(_worldPosA);
    const baseDistSq = _worldPosA.distanceToSquared(_worldPosC);

    const testAxis = (axis: 'x' | 'y' | 'z'): { sign: number; gain: number } => {
      const prev = thumbProx.rotation[axis];
      thumbProx.rotation[axis] = 0.65;
      vrm.update(0);
      container.updateMatrixWorld(true);
      thumbTip.getWorldPosition(_worldPosA);
      const dPos = _worldPosA.distanceToSquared(_worldPosC);

      thumbProx.rotation[axis] = -0.65;
      vrm.update(0);
      container.updateMatrixWorld(true);
      thumbTip.getWorldPosition(_worldPosB);
      const dNeg = _worldPosB.distanceToSquared(_worldPosC);

      thumbProx.rotation[axis] = prev;
      const best = Math.min(dPos, dNeg);
      return { sign: dPos < dNeg ? 1 : -1, gain: Math.max(0, baseDistSq - best) };
    };

    const rx = testAxis('x');
    const ry = testAxis('y');
    const rz = testAxis('z');

    for (let i = 0; i < fingerBones.length; i++) {
      fingerBones[i].bone.rotation.z = savedFingers[i];
    }
    vrm.update(0);

    const maxGain = Math.max(rx.gain, ry.gain, rz.gain, 1e-6);
    if (maxGain <= 1e-5) {
      return { x: 0, y: 0.65, z: fallbackZ * 0.65 };
    }
    const nx = (rx.gain / maxGain) * rx.sign;
    const ny = (ry.gain / maxGain) * ry.sign;
    const nz = (rz.gain / maxGain) * rz.sign;
    const mag = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / mag, y: ny / mag, z: nz / mag };
  };

  const leftThumbTuck = probeThumbTuckAxes(
    leftFingerBones,
    leftThumbProximal,
    leftThumbDistal,
    getBone(VRMHumanBoneName.LeftMiddleIntermediate),
    leftFingerCurlSign
  );
  const rightThumbTuck = probeThumbTuckAxes(
    rightFingerBones,
    rightThumbProximal,
    rightThumbIntermediate,
    getBone(VRMHumanBoneName.RightMiddleIntermediate),
    rightFingerCurlSign
  );

  // Normalize height to ~1.66m and ground feet at Y = 0 in standing posture
  if (vrm) {
    vrm.update(0);
  }
  container.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = box.getSize(new THREE.Vector3());
  const targetHeight = 1.66;
  if (size.y > 0.1) {
    const scale = targetHeight / size.y;
    modelRoot.scale.setScalar(scale);
    container.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(modelRoot);
    modelRoot.position.y -= scaledBox.min.y;
  }

  // Locate ALL Face mesh primitives & eye-interior sub-meshes (iris/highlight/sclera)
  const faceMorphTargets: Array<{
    mesh: THREE.Mesh;
    dict: Record<string, number>;
    influences: number[];
    isEyeInterior: boolean;
  }> = [];
  modelRoot.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const isEyeInterior = mats.some((m) => /EyeIris|EyeHighlight|EyeWhite/i.test(m?.name ?? ''));
    const hasFaceMorphs = !!(
      mesh.morphTargetDictionary &&
      mesh.morphTargetInfluences &&
      'Fcl_MTH_Fun' in mesh.morphTargetDictionary
    );
    if (hasFaceMorphs || isEyeInterior) {
      faceMorphTargets.push({
        mesh,
        dict: mesh.morphTargetDictionary ?? {},
        influences: mesh.morphTargetInfluences ?? [],
        isEyeInterior,
      });
    }
  });

  // Smoothed viseme weights so phoneme transitions are silky-smooth
  const currentVisemes: Record<VisemeKey, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

  // --- RECALIBRATE VRM SPRINGBONE PHYSICS FOR SOFT, NATURAL DRESS & HAIR ---
  // 1) Attach a local-space spring center inside facingPivot so world-space running velocity
  //    never drags the dress meters behind Florie or causes violent rebound.
  const springCenter = new THREE.Object3D();
  springCenter.name = 'FlorieSoftClothCenter';
  facingPivot.add(springCenter);
  container.updateMatrixWorld(true);

  const tunedJoints: TunedSpringJoint[] = [];
  const rawHeadNode = vrm?.humanoid?.getRawBoneNode(VRMHumanBoneName.Head) || head;

  if (vrm?.springBoneManager) {
    // Soften oversized leg/pelvis colliders so thighs brush the dress gently instead of kicking it out
    const colliders = vrm.springBoneManager.colliders || [];
    for (const col of colliders) {
      const parentName = (col.parent?.name || col.name || '').toLowerCase();
      const isLegOrHipCollider = /leg|thigh|hip|pelvis|skirt|butt|knee/i.test(parentName);
      const shape = col.shape;
      if (shape instanceof VRMSpringBoneColliderShapeSphere) {
        shape.radius = isLegOrHipCollider
          ? Math.min(shape.radius * 0.58, 0.058)
          : Math.min(shape.radius * 0.82, 0.105);
      } else if (shape instanceof VRMSpringBoneColliderShapeCapsule) {
        shape.radius = isLegOrHipCollider
          ? Math.min(shape.radius * 0.58, 0.058)
          : Math.min(shape.radius * 0.82, 0.105);
      }
    }

    // Configure every SpringBone joint for supple, non-bouncing cloth/hair behavior
    for (const joint of vrm.springBoneManager.joints) {
      const isDress = isDressOrClothBone(joint.bone, rawHeadNode);
      joint.center = springCenter;

      if (isDress) {
        // High drag (0.91) eliminates Verlet rebound/bounce when leg colliders brush the skirt
        joint.settings.dragForce = Math.max(joint.settings.dragForce, 0.91);
        joint.settings.stiffness = THREE.MathUtils.clamp(joint.settings.stiffness, 0.52, 0.72);
        joint.settings.gravityPower = THREE.MathUtils.clamp(
          joint.settings.gravityPower || 0.24,
          0.2,
          0.32
        );
        joint.settings.gravityDir.set(0, -1, 0);
        joint.settings.hitRadius = Math.min(joint.settings.hitRadius, 0.012);
      } else {
        // Supple flowing hair & ribbons
        joint.settings.dragForce = Math.max(joint.settings.dragForce, 0.74);
        joint.settings.stiffness = THREE.MathUtils.clamp(joint.settings.stiffness, 0.75, 1.0);
        joint.settings.gravityPower = THREE.MathUtils.clamp(
          joint.settings.gravityPower || 0.15,
          0.1,
          0.22
        );
        joint.settings.gravityDir.set(0, -1, 0);
        joint.settings.hitRadius = Math.min(joint.settings.hitRadius, 0.02);
      }

      joint.reset();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initQuat: THREE.Quaternion = (joint as any)._initialLocalRotation
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (joint as any)._initialLocalRotation.clone()
        : joint.bone.quaternion.clone();

      tunedJoints.push({
        joint,
        isDressOrSkirt: isDress,
        // Cap dress deflection to ~15 deg (0.26 rad) so the dress never flies far out or flips up
        maxAngleRad: isDress ? 0.26 : 0.36,
        restQuat: initQuat,
        smoothedQuat: initQuat.clone(),
      });
    }
  }

  const skirtFrontBones: { bone: THREE.Object3D; restQuat: THREE.Quaternion; rad: number }[] = [];
  modelRoot.traverse((obj) => {
    if (!obj.name || /end/i.test(obj.name)) return;
    if (/SkirtFront0/i.test(obj.name)) {
      skirtFrontBones.push({ bone: obj, restQuat: obj.quaternion.clone(), rad: 0.22 });
    } else if (/SkirtFront1/i.test(obj.name)) {
      skirtFrontBones.push({ bone: obj, restQuat: obj.quaternion.clone(), rad: 0.13 });
    } else if (/SkirtFront2/i.test(obj.name)) {
      skirtFrontBones.push({ bone: obj, restQuat: obj.quaternion.clone(), rad: 0.07 });
    }
  });
  const _skirtDrapeAxis = new THREE.Vector3(1, 0, 0);
  const _skirtDrapeQ = new THREE.Quaternion();
  let skirtFrontSitWeight = 0;

  const gaitBlend = createStylizedGaitBlendState();
  const gaitPose = createEmptyGaitPose();
  void preloadBlenderSitAnim();
  void preloadBlenderInspectHandsAnim();
  void preloadBlenderFlorieArrivalAnim();
  void preloadBlenderFloriePushDoorAnim();
  void preloadBlenderFlorieEmbarrassedAnim();
  void preloadBlenderPlayerConfusedGlanceAnim();
  void preloadBlenderHelenDrawerPaperAnim();

  let prevSitAnimState: AnimState = 'idle';
  let sitDownTime = 0;
  let sitIdleTime = 0;
  let standUpTime = 0;
  let sitClipBlend = 0;

  const npcTalkState = {
    lookAtPos: null as THREE.Vector3 | null,
    isTalking: false,
    speechLevel: 0,
    speechTime: 0,
  };
  let npcTalkBlend = 0;
  let npcLookBlend = 0;
  let npcSpeechSmooth = 0;
  let npcTalkYaw = 0;
  let npcTalkPitch = 0;
  let npcEyeYaw = 0;
  let npcEyePitch = 0;
  let cutHeadTiltZ = 0;
  let cutNeckTiltZ = 0;
  let prevCutPose: CutsceneActorPose = 'none';
  let cutPoseElapsed = 0;
  const _npcHeadWorld = new THREE.Vector3();
  const _npcInvQuat = new THREE.Quaternion();
  const _npcLocalDir = new THREE.Vector3();
  const setNpcDialogueVisuals = (opts: {
    lookAtPos: THREE.Vector3 | null;
    isTalking: boolean;
    speechLevel: number;
    speechTime: number;
  }) => {
    npcTalkState.lookAtPos = opts.lookAtPos;
    npcTalkState.isTalking = opts.isTalking;
    npcTalkState.speechLevel = opts.speechLevel;
    npcTalkState.speechTime = opts.speechTime;
  };

  let cutsceneOverride: CutsceneActorOverride | null = null;
  let blushLeftMat: THREE.MeshBasicMaterial | null = null;
  let blushRightMat: THREE.MeshBasicMaterial | null = null;
  let blushInitDone = false;

  const ensureBlushSprites = () => {
    if (blushInitDone || !head) return;
    blushInitDone = true;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createRadialGradient(32, 16, 2, 32, 16, 30);
    grad.addColorStop(0, 'rgba(255, 105, 135, 0.85)');
    grad.addColorStop(0.55, 'rgba(255, 125, 150, 0.45)');
    grad.addColorStop(1, 'rgba(255, 125, 150, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(0.055, 0.026);
    blushLeftMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    blushRightMat = blushLeftMat.clone();
    const leftMesh = new THREE.Mesh(geo, blushLeftMat);
    leftMesh.position.set(-0.041, 0.042, 0.092);
    leftMesh.rotation.y = -0.35;
    leftMesh.renderOrder = 5;
    const rightMesh = new THREE.Mesh(geo, blushRightMat);
    rightMesh.position.set(0.041, 0.042, 0.092);
    rightMesh.rotation.y = 0.35;
    rightMesh.renderOrder = 5;
    head.add(leftMesh, rightMesh);
  };

  const setCutsceneOverride = (opts: CutsceneActorOverride | null) => {
    cutsceneOverride = opts;
    if (opts && opts.blush > 0.01) ensureBlushSprites();
  };

  const update = (state: AnimState, gaitPhase: number, interactTimer: number, dt: number) => {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
    // Keep Helen standing (idle base) once she stands up at t >= 33.95s so she never sits back down
    const effState: AnimState =
      cutsceneOverride &&
      (cutsceneOverride.pose === 'openDrawer' ||
        cutsceneOverride.pose === 'placePaper' ||
        (cutsceneOverride.pose === 'deskRest' && cutsceneOverride.time >= 34.25))
        ? 'idle'
        : state;
    const pose = computeStylizedAnimeGait(
      effState,
      gaitPhase,
      interactTimer,
      safeDt,
      gaitBlend,
      gaitPose,
      Boolean(cutsceneOverride)
    );
    const elapsedAccum = gaitBlend.elapsedAccum;
    // Completely disable all idle animations during scripted cutscenes so only cutsceneOverride controls the actor
    if (cutsceneOverride && effState === 'idle') {
      Object.assign(pose, createEmptyGaitPose());
      const breath = Math.sin(elapsedAccum * 2.1) * 0.012;
      pose.spineRotX = breath * 0.4;
      pose.chestRotX = breath;
      pose.upperChestRotX = breath * 0.5;
      pose.leftArmAdduction = 0.06;
      pose.rightArmAdduction = 0.06;
      pose.leftArmForwardX = 0.05;
      pose.rightArmForwardX = 0.05;
      pose.leftElbowBend = 0.16;
      pose.rightElbowBend = 0.16;
      pose.leftThighZ = 0.02;
      pose.rightThighZ = 0.02;
      pose.leftFingerCurlScale = 0.22;
      pose.rightFingerCurlScale = 0.22;
      pose.expressionHappy = 0;
    }
    const dampRate = THREE.MathUtils.lerp(11.5, 19.0, pose.runWeight);
    const damp = 1 - Math.exp(-dampRate * safeDt);

    if (vrm) {
      // Subtle local cloth-center inertia & breeze response so hair and skirt sway organically
      springCenter.position.set(
        pose.hipsOffsetX * 0.36 + pose.chestRotZ * 0.08 + pose.idleBreezeX,
        -pose.hipsOffsetY * 0.24,
        pose.hipsOffsetZ * 0.85 - pose.chestRotX * 0.06 + pose.idleBreezeZ
      );

      // 1) HIPS / PELVIS (3D weight shift, figure-8 pelvic list, forward/back tilt & axial rotation)
      if (hips) {
        if (prevSitAnimState === 'stand_up' && state !== 'stand_up' && state !== 'sit' && state !== 'sit_down') {
          // Clear stand_up's forward hipsOffset at the exact frame Player.position hands off to sitFrontPos
          hips.position.copy(baseHipsPos);
        } else {
          hips.position.x = THREE.MathUtils.lerp(hips.position.x, baseHipsPos.x + pose.hipsOffsetX, damp);
          hips.position.y = THREE.MathUtils.lerp(hips.position.y, baseHipsPos.y + pose.hipsOffsetY, damp);
          hips.position.z = THREE.MathUtils.lerp(hips.position.z, baseHipsPos.z + pose.hipsOffsetZ, damp);
        }
        hips.rotation.x = THREE.MathUtils.lerp(hips.rotation.x, spineForwardXSign * pose.hipsRotX, damp);
        hips.rotation.y = THREE.MathUtils.lerp(hips.rotation.y, pose.hipsRotY, damp);
        hips.rotation.z = THREE.MathUtils.lerp(hips.rotation.z, pose.hipsRotZ, damp);
      }

      // 2) SPINE, CHEST & UPPER CHEST (Supple 3-joint S-curve cascade & rib arch)
      if (spine) {
        spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, spineForwardXSign * pose.spineRotX, damp);
        spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, pose.spineRotY, damp);
        spine.rotation.z = THREE.MathUtils.lerp(spine.rotation.z, pose.spineRotZ, damp);
      }

      if (chest) {
        chest.rotation.x = THREE.MathUtils.lerp(chest.rotation.x, spineForwardXSign * pose.chestRotX, damp);
        chest.rotation.y = THREE.MathUtils.lerp(chest.rotation.y, pose.chestRotY, damp);
        chest.rotation.z = THREE.MathUtils.lerp(chest.rotation.z, pose.chestRotZ, damp);
      }

      if (upperChest) {
        upperChest.rotation.x = THREE.MathUtils.lerp(
          upperChest.rotation.x,
          spineForwardXSign * pose.upperChestRotX,
          damp
        );
        upperChest.rotation.y = THREE.MathUtils.lerp(upperChest.rotation.y, pose.upperChestRotY, damp);
        upperChest.rotation.z = THREE.MathUtils.lerp(upperChest.rotation.z, pose.upperChestRotZ, damp);
      }

      // 3) NECK & HEAD (Gaze stabilization & full pitch/yaw/roll expression)
      if (neck) {
        neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, spineForwardXSign * pose.neckRotX, damp);
        neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, pose.neckRotY, damp);
        neck.rotation.z = THREE.MathUtils.lerp(neck.rotation.z, pose.neckRotZ, damp);
      }

      if (head) {
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, spineForwardXSign * pose.headRotX, damp);
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, pose.headRotY, damp);
        head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, pose.headRotZ, damp);
      }

      // 4) LEGS, KNEES, ANKLES & TOES (Probed world-space signs, feet/toes kept straight forward)
      if (leftUpperLeg && rightUpperLeg) {
        leftUpperLeg.rotation.x = THREE.MathUtils.lerp(
          leftUpperLeg.rotation.x,
          thighForwardXSign * pose.leftThighX,
          damp
        );
        rightUpperLeg.rotation.x = THREE.MathUtils.lerp(
          rightUpperLeg.rotation.x,
          thighForwardXSign * pose.rightThighX,
          damp
        );
        // Counter-rotate hips Y twist so feet and toes stay pointed straight ahead
        leftUpperLeg.rotation.y = THREE.MathUtils.lerp(
          leftUpperLeg.rotation.y,
          -pose.hipsRotY * 0.85,
          damp
        );
        rightUpperLeg.rotation.y = THREE.MathUtils.lerp(
          rightUpperLeg.rotation.y,
          -pose.hipsRotY * 0.85,
          damp
        );
        leftUpperLeg.rotation.z = THREE.MathUtils.lerp(
          leftUpperLeg.rotation.z,
          leftThighInwardZSign * pose.leftThighZ,
          damp
        );
        rightUpperLeg.rotation.z = THREE.MathUtils.lerp(
          rightUpperLeg.rotation.z,
          rightThighInwardZSign * pose.rightThighZ,
          damp
        );
      }

      if (leftLowerLeg && rightLowerLeg) {
        leftLowerLeg.rotation.x = THREE.MathUtils.lerp(
          leftLowerLeg.rotation.x,
          kneeBackXSign * pose.leftKneeX,
          damp
        );
        rightLowerLeg.rotation.x = THREE.MathUtils.lerp(
          rightLowerLeg.rotation.x,
          kneeBackXSign * pose.rightKneeX,
          damp
        );
      }

      if (leftFoot && rightFoot) {
        leftFoot.rotation.x = THREE.MathUtils.lerp(
          leftFoot.rotation.x,
          ankleDownXSign * pose.leftAnkleX,
          damp
        );
        leftFoot.rotation.y = THREE.MathUtils.lerp(leftFoot.rotation.y, 0, damp);
        leftFoot.rotation.z = THREE.MathUtils.lerp(leftFoot.rotation.z, 0, damp);
        rightFoot.rotation.x = THREE.MathUtils.lerp(
          rightFoot.rotation.x,
          ankleDownXSign * pose.rightAnkleX,
          damp
        );
        rightFoot.rotation.y = THREE.MathUtils.lerp(rightFoot.rotation.y, 0, damp);
        rightFoot.rotation.z = THREE.MathUtils.lerp(rightFoot.rotation.z, 0, damp);
      }

      if (leftToes && rightToes) {
        leftToes.rotation.x = THREE.MathUtils.lerp(
          leftToes.rotation.x,
          ankleDownXSign * pose.leftToeX,
          damp
        );
        leftToes.rotation.y = THREE.MathUtils.lerp(leftToes.rotation.y, 0, damp);
        leftToes.rotation.z = THREE.MathUtils.lerp(leftToes.rotation.z, 0, damp);
        rightToes.rotation.x = THREE.MathUtils.lerp(
          rightToes.rotation.x,
          ankleDownXSign * pose.rightToeX,
          damp
        );
        rightToes.rotation.y = THREE.MathUtils.lerp(rightToes.rotation.y, 0, damp);
        rightToes.rotation.z = THREE.MathUtils.lerp(rightToes.rotation.z, 0, damp);
      }

      // 5) SHOULDERS, ARMS, FOREARMS & WRISTS (4-joint overlapping pendulum)
      if (leftShoulder && rightShoulder) {
        leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, pose.leftShoulderY, damp);
        rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, pose.rightShoulderY, damp);
        leftShoulder.rotation.z = THREE.MathUtils.lerp(
          leftShoulder.rotation.z,
          leftShoulderUpZSign * pose.leftShoulderZ,
          damp
        );
        rightShoulder.rotation.z = THREE.MathUtils.lerp(
          rightShoulder.rotation.z,
          rightShoulderUpZSign * pose.rightShoulderZ,
          damp
        );
      }

      if (leftUpperArm) {
        leftUpperArm.rotation.z = THREE.MathUtils.lerp(
          leftUpperArm.rotation.z,
          leftArmDownZ + Math.sign(leftArmDownZ) * pose.leftArmAdduction,
          damp
        );
        leftUpperArm.rotation.x = THREE.MathUtils.lerp(
          leftUpperArm.rotation.x,
          leftArmForwardXSign * pose.leftArmForwardX,
          damp
        );
        leftUpperArm.rotation.y = THREE.MathUtils.lerp(
          leftUpperArm.rotation.y,
          pose.leftArmRotY + leftArmInwardYSign * pose.leftArmInward,
          damp
        );
      }

      if (rightUpperArm) {
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(
          rightUpperArm.rotation.z,
          rightArmDownZ + Math.sign(rightArmDownZ) * pose.rightArmAdduction,
          damp
        );
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(
          rightUpperArm.rotation.x,
          rightArmForwardXSign * pose.rightArmForwardX,
          damp
        );
        rightUpperArm.rotation.y = THREE.MathUtils.lerp(
          rightUpperArm.rotation.y,
          pose.rightArmRotY + rightArmInwardYSign * pose.rightArmInward,
          damp
        );
      }

      if (leftLowerArm && rightLowerArm) {
        leftLowerArm.rotation.x = THREE.MathUtils.lerp(
          leftLowerArm.rotation.x,
          armForwardXSign * pose.leftForearmTwist,
          damp
        );
        leftLowerArm.rotation.y = THREE.MathUtils.lerp(
          leftLowerArm.rotation.y,
          leftElbowForwardYSign * pose.leftElbowBend,
          damp
        );
        leftLowerArm.rotation.z = THREE.MathUtils.lerp(leftLowerArm.rotation.z, 0, damp);
        rightLowerArm.rotation.x = THREE.MathUtils.lerp(
          rightLowerArm.rotation.x,
          armForwardXSign * pose.rightForearmTwist,
          damp
        );
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(
          rightLowerArm.rotation.y,
          rightElbowForwardYSign * pose.rightElbowBend,
          damp
        );
        rightLowerArm.rotation.z = THREE.MathUtils.lerp(rightLowerArm.rotation.z, 0, damp);
      }

      if (leftHand && rightHand) {
        leftHand.rotation.x = THREE.MathUtils.lerp(leftHand.rotation.x, pose.leftWristX, damp);
        leftHand.rotation.y = THREE.MathUtils.lerp(leftHand.rotation.y, pose.leftWristY, damp);
        leftHand.rotation.z = THREE.MathUtils.lerp(leftHand.rotation.z, pose.leftWristZ, damp);
        rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, pose.rightWristX, damp);
        rightHand.rotation.y = THREE.MathUtils.lerp(rightHand.rotation.y, pose.rightWristY, damp);
        rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, pose.rightWristZ, damp);
      }

      const applyHandPose = (
        fingers: CachedFingerBone[],
        curlScale: number,
        fistWeight: number,
        thumbMeta: THREE.Object3D | null,
        thumbProx: THREE.Object3D | null,
        thumbDist: THREE.Object3D | null,
        tuck: ThumbTuckAxes,
        fingerTap?: [number, number, number, number]
      ) => {
        const openness = Math.max(0, 1 - curlScale);
        for (const f of fingers) {
          const fan = 1 + (f.fingerIdx - 1.5) * 0.08 * openness;
          const openZ = f.restZ * curlScale * fan;
          const tapWeight = fingerTap ? fingerTap[f.fingerIdx] ?? 0 : 0;
          const effectiveWeight = Math.max(fistWeight, tapWeight * 0.78);
          const targetZ = THREE.MathUtils.lerp(openZ, f.fistZ, effectiveWeight);
          f.bone.rotation.z = THREE.MathUtils.lerp(f.bone.rotation.z, targetZ, damp);
        }
        // Bend thumbs strongly during fists and gently follow soft finger curls (e.g., hair tuck)
        const thumbFlex = Math.max(fistWeight, Math.min(0.32, Math.max(0, curlScale - 1) * 0.25));
        if (thumbMeta) {
          thumbMeta.rotation.x = THREE.MathUtils.lerp(thumbMeta.rotation.x, tuck.x * 0.45 * thumbFlex, damp);
          thumbMeta.rotation.y = THREE.MathUtils.lerp(thumbMeta.rotation.y, tuck.y * 0.48 * thumbFlex, damp);
          thumbMeta.rotation.z = THREE.MathUtils.lerp(thumbMeta.rotation.z, tuck.z * 0.42 * thumbFlex, damp);
        }
        if (thumbProx) {
          thumbProx.rotation.x = THREE.MathUtils.lerp(thumbProx.rotation.x, tuck.x * 0.92 * thumbFlex, damp);
          thumbProx.rotation.y = THREE.MathUtils.lerp(thumbProx.rotation.y, tuck.y * 0.96 * thumbFlex, damp);
          thumbProx.rotation.z = THREE.MathUtils.lerp(thumbProx.rotation.z, tuck.z * 0.78 * thumbFlex, damp);
        }
        if (thumbDist) {
          thumbDist.rotation.x = THREE.MathUtils.lerp(thumbDist.rotation.x, tuck.x * 0.98 * thumbFlex, damp);
          thumbDist.rotation.y = THREE.MathUtils.lerp(thumbDist.rotation.y, tuck.y * 1.02 * thumbFlex, damp);
          thumbDist.rotation.z = THREE.MathUtils.lerp(thumbDist.rotation.z, tuck.z * 0.82 * thumbFlex, damp);
        }
      };

      applyHandPose(
        rightFingerBones,
        pose.rightFingerCurlScale,
        pose.rightFistWeight,
        rightThumbMetacarpal,
        rightThumbProximal,
        rightThumbIntermediate,
        rightThumbTuck,
        pose.rightFingerTap
      );
      applyHandPose(
        leftFingerBones,
        pose.leftFingerCurlScale,
        pose.leftFistWeight,
        leftThumbMetacarpal,
        leftThumbProximal,
        leftThumbDistal,
        leftThumbTuck,
        pose.leftFingerTap
      );

      // Apply Blender-authored VRM sitting / transition clips when active
      const isSitClipState = effState === 'sit_down' || effState === 'sit' || effState === 'stand_up';
      if (isSitClipState && isBlenderSitAnimReady()) {
        if (effState === 'sit_down') {
          if (prevSitAnimState !== 'sit_down') {
            sitDownTime = 0;
            sitClipBlend = 0.25;
          }
          sitDownTime += safeDt;
          sitClipBlend = Math.min(1, sitClipBlend + safeDt / 0.14);
          applyBlenderSitPose(vrm, baseHipsPos, 'sit_down', sitDownTime, sitClipBlend, false);
        } else if (effState === 'sit') {
          if (prevSitAnimState !== 'sit') {
            sitIdleTime = 0;
            sitClipBlend = prevSitAnimState === 'sit_down' ? 1 : 0.25;
          }
          sitIdleTime += safeDt;
          sitClipBlend = Math.min(1, sitClipBlend + safeDt / 0.16);
          applyBlenderSitPose(vrm, baseHipsPos, 'sit_idle', sitIdleTime, sitClipBlend, true);
        } else {
          if (prevSitAnimState !== 'stand_up') {
            standUpTime = 0;
            sitClipBlend = prevSitAnimState === 'sit' ? 1 : 0.35;
          }
          standUpTime += safeDt;
          sitClipBlend = Math.min(1, sitClipBlend + safeDt / 0.12);
          applyBlenderSitPose(vrm, baseHipsPos, 'stand_up', standUpTime, sitClipBlend, false);
        }
      } else {
        sitClipBlend = 0;
      }
      prevSitAnimState = effState;

      // 5b) NPC dialogue head/gaze tracking toward target + expressive speaking nods
      npcTalkBlend = THREE.MathUtils.damp(npcTalkBlend, npcTalkState.isTalking ? 1 : 0, 7.5, safeDt);
      npcLookBlend = THREE.MathUtils.damp(npcLookBlend, npcTalkState.lookAtPos ? 1 : 0, 8.5, safeDt);
      if (npcLookBlend > 0.005 && head) {
        let targetYaw = 0;
        let targetPitch = 0;
        if (npcTalkState.lookAtPos) {
          head.getWorldPosition(_npcHeadWorld);
          _npcLocalDir.copy(npcTalkState.lookAtPos).sub(_npcHeadWorld);
          container.getWorldQuaternion(_npcInvQuat).invert();
          _npcLocalDir.applyQuaternion(_npcInvQuat);
          if (_npcLocalDir.lengthSq() > 0.0001) {
            _npcLocalDir.normalize();
            targetYaw = THREE.MathUtils.clamp(Math.atan2(-_npcLocalDir.x, -_npcLocalDir.z), -1.08, 1.08);
            targetPitch = THREE.MathUtils.clamp(
              Math.atan2(_npcLocalDir.y, Math.hypot(_npcLocalDir.x, _npcLocalDir.z)),
              -0.36,
              0.36
            );
          }
        }
        const gazeDamp = 1 - Math.exp(-9.0 * safeDt);
        npcTalkYaw = THREE.MathUtils.lerp(npcTalkYaw, targetYaw, gazeDamp);
        npcTalkPitch = THREE.MathUtils.lerp(npcTalkPitch, targetPitch, gazeDamp);

        npcSpeechSmooth = THREE.MathUtils.damp(npcSpeechSmooth, npcTalkState.speechLevel, 6.0, safeDt);
        const sTime = npcTalkState.speechTime;
        const talkNod =
          npcSpeechSmooth > 0.04 ? Math.sin(sTime * 2.6) * 0.016 * Math.min(1, npcSpeechSmooth * 1.4) * npcTalkBlend : 0;
        const gentleTilt = Math.sin(elapsedAccum * 1.35) * 0.032 * npcTalkBlend;

        if (neck) {
          const targetNeckY = THREE.MathUtils.lerp(pose.neckRotY, npcTalkYaw * 0.36, npcLookBlend);
          const targetNeckX = THREE.MathUtils.lerp(
            spineForwardXSign * pose.neckRotX,
            -spineForwardXSign * (npcTalkPitch * 0.35 + talkNod * 0.4),
            npcLookBlend
          );
          neck.rotation.y = targetNeckY;
          neck.rotation.x = targetNeckX;
        }
        const targetHeadY = THREE.MathUtils.lerp(pose.headRotY, npcTalkYaw * 0.64, npcLookBlend);
        const targetHeadX = THREE.MathUtils.lerp(
          spineForwardXSign * pose.headRotX,
          -spineForwardXSign * (npcTalkPitch * 0.65 + talkNod),
          npcLookBlend
        );
        const targetHeadZ = THREE.MathUtils.lerp(pose.headRotZ, gentleTilt, npcLookBlend);
        head.rotation.y = targetHeadY;
        head.rotation.x = targetHeadX;
        head.rotation.z = targetHeadZ;
      }

      // 5c) Expressive anime cutscene pose & head gestures
      if (cutsceneOverride) {
        const co = cutsceneOverride;
        const ct = co.time;
        const cDamp = 1 - Math.exp(-4.0 * safeDt);
        const sameDrawerGroup =
          (prevCutPose === 'openDrawer' && co.pose === 'placePaper') ||
          (prevCutPose === 'placePaper' && co.pose === 'openDrawer');
        if (co.pose !== prevCutPose && !sameDrawerGroup) {
          cutPoseElapsed = 0;
        } else {
          cutPoseElapsed += safeDt;
        }
        prevCutPose = co.pose;
        const clipBlend = Math.min(1, cutPoseElapsed / 0.28);

        if (co.pose === 'inspectHands') {
          if (vrm && applyBlenderInspectHandsPose(vrm, baseHipsPos, ct)) {
            // Blender-authored full-body & finger animation applied directly
          } else {
          // Fallback procedural inspectHands if bundle is still loading
          const raiseU = smoothstep(3.0, 3.85, ct);
          const headFocusU = smoothstep(4.95, 5.55, ct);
          const focusL = smoothstep(3.5, 4.1, ct) * (1 - smoothstep(4.95, 5.45, ct));
          const focusR = smoothstep(5.0, 5.55, ct) * (1 - smoothstep(6.65, 7.05, ct));
          const leftTurnU = smoothstep(3.95, 4.90, ct);
          const rightTurnU = smoothstep(5.35, 6.40, ct);
          const palmTurnL = THREE.MathUtils.lerp(-0.78, 0.88, leftTurnU);
          const palmTurnR = THREE.MathUtils.lerp(-0.78, 0.88, rightTurnU);
          const breath = Math.sin(ct * 1.65);
          const floatL = Math.sin(ct * 2.1);
          const floatR = Math.cos(ct * 2.1);

          if (leftUpperArm) {
            leftUpperArm.rotation.x = THREE.MathUtils.lerp(
              leftUpperArm.rotation.x,
              leftArmForwardXSign * (0.10 + breath * 0.02 + raiseU * (0.50 + focusL * 0.14 + floatL * 0.025)),
              cDamp
            );
            leftUpperArm.rotation.y = THREE.MathUtils.lerp(
              leftUpperArm.rotation.y,
              0.04 + raiseU * (0.16 + focusL * 0.12),
              cDamp
            );
            leftUpperArm.rotation.z = THREE.MathUtils.lerp(
              leftUpperArm.rotation.z,
              leftArmDownZ * (0.91 - breath * 0.015 - raiseU * (0.24 + focusL * 0.06)),
              cDamp
            );
          }
          if (rightUpperArm) {
            rightUpperArm.rotation.x = THREE.MathUtils.lerp(
              rightUpperArm.rotation.x,
              rightArmForwardXSign * (0.10 - breath * 0.02 + raiseU * (0.50 + focusR * 0.14 + floatR * 0.025)),
              cDamp
            );
            rightUpperArm.rotation.y = THREE.MathUtils.lerp(
              rightUpperArm.rotation.y,
              -(0.04 + raiseU * (0.16 + focusR * 0.12)),
              cDamp
            );
            rightUpperArm.rotation.z = THREE.MathUtils.lerp(
              rightUpperArm.rotation.z,
              rightArmDownZ * (0.91 - breath * 0.015 - raiseU * (0.24 + focusR * 0.06)),
              cDamp
            );
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.x = THREE.MathUtils.lerp(
              leftLowerArm.rotation.x,
              leftPalmForwardXSign * (0.08 * (1 - raiseU) + raiseU * (palmTurnL + floatL * 0.05)),
              cDamp
            );
            leftLowerArm.rotation.y = THREE.MathUtils.lerp(
              leftLowerArm.rotation.y,
              leftElbowForwardYSign * (0.34 + breath * 0.04 + raiseU * (1.08 + focusL * 0.22)),
              cDamp
            );
            leftLowerArm.rotation.z = THREE.MathUtils.lerp(
              leftLowerArm.rotation.z,
              leftArmDownZ * (0.04 + raiseU * 0.08 * focusL),
              cDamp
            );
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.x = THREE.MathUtils.lerp(
              rightLowerArm.rotation.x,
              rightPalmForwardXSign * (0.08 * (1 - raiseU) + raiseU * (palmTurnR + floatR * 0.05)),
              cDamp
            );
            rightLowerArm.rotation.y = THREE.MathUtils.lerp(
              rightLowerArm.rotation.y,
              rightElbowForwardYSign * (0.34 - breath * 0.04 + raiseU * (1.08 + focusR * 0.22)),
              cDamp
            );
            rightLowerArm.rotation.z = THREE.MathUtils.lerp(
              rightLowerArm.rotation.z,
              rightArmDownZ * (0.04 + raiseU * 0.08 * focusR),
              cDamp
            );
          }
          if (leftHand) {
            leftHand.rotation.x = THREE.MathUtils.lerp(
              leftHand.rotation.x,
              leftPalmForwardXSign * (0.06 + raiseU * (palmTurnL * 0.58 + floatL * 0.08)),
              cDamp
            );
            leftHand.rotation.y = THREE.MathUtils.lerp(
              leftHand.rotation.y,
              raiseU * (0.14 + Math.sin(ct * 2.5) * 0.10),
              cDamp
            );
            leftHand.rotation.z = THREE.MathUtils.lerp(
              leftHand.rotation.z,
              leftCurlSign * (0.16 + breath * 0.04 - raiseU * (0.28 + Math.sin(ct * 2.8) * 0.12)),
              cDamp
            );
          }
          if (rightHand) {
            rightHand.rotation.x = THREE.MathUtils.lerp(
              rightHand.rotation.x,
              rightPalmForwardXSign * (0.06 + raiseU * (palmTurnR * 0.58 + floatR * 0.08)),
              cDamp
            );
            rightHand.rotation.y = THREE.MathUtils.lerp(
              rightHand.rotation.y,
              -raiseU * (0.14 + Math.cos(ct * 2.5) * 0.10),
              cDamp
            );
            rightHand.rotation.z = THREE.MathUtils.lerp(
              rightHand.rotation.z,
              rightCurlSign * (0.16 + breath * 0.04 - raiseU * (0.28 + Math.cos(ct * 2.8) * 0.12)),
              cDamp
            );
          }
          for (const f of leftFingerBones) {
            const idleCurl = 0.22 + f.fingerIdx * 0.05 + Math.sin(ct * 1.9 + f.fingerIdx * 0.55) * 0.05;
            const inspectWave = 0.14 + 0.34 * (0.5 + 0.5 * Math.sin(ct * 3.8 - f.fingerIdx * 0.72));
            const curlAmt = THREE.MathUtils.lerp(idleCurl, inspectWave * (0.55 + 0.45 * focusL), raiseU);
            f.bone.rotation.z = THREE.MathUtils.lerp(
              f.bone.rotation.z,
              THREE.MathUtils.lerp(f.restZ * 0.45, f.fistZ, curlAmt),
              cDamp
            );
          }
          for (const f of rightFingerBones) {
            const idleCurl = 0.22 + f.fingerIdx * 0.05 + Math.cos(ct * 1.9 + f.fingerIdx * 0.55) * 0.05;
            const inspectWave = 0.14 + 0.34 * (0.5 + 0.5 * Math.sin(ct * 3.8 - f.fingerIdx * 0.72 + 1.1));
            const curlAmt = THREE.MathUtils.lerp(idleCurl, inspectWave * (0.55 + 0.45 * focusR), raiseU);
            f.bone.rotation.z = THREE.MathUtils.lerp(
              f.bone.rotation.z,
              THREE.MathUtils.lerp(f.restZ * 0.45, f.fistZ, curlAmt),
              cDamp
            );
          }
          const thumbFlexL = 0.14 + raiseU * (0.22 + 0.18 * Math.sin(ct * 3.2));
          const thumbFlexR = 0.14 + raiseU * (0.22 + 0.18 * Math.cos(ct * 3.2));
          if (leftThumbProximal) {
            leftThumbProximal.rotation.z = THREE.MathUtils.lerp(leftThumbProximal.rotation.z, leftCurlSign * thumbFlexL, cDamp);
          }
          if (leftThumbDistal) {
            leftThumbDistal.rotation.z = THREE.MathUtils.lerp(leftThumbDistal.rotation.z, leftCurlSign * thumbFlexL * 1.2, cDamp);
          }
          if (rightThumbProximal) {
            rightThumbProximal.rotation.z = THREE.MathUtils.lerp(rightThumbProximal.rotation.z, rightCurlSign * thumbFlexR, cDamp);
          }
          if (rightThumbIntermediate) {
            rightThumbIntermediate.rotation.z = THREE.MathUtils.lerp(rightThumbIntermediate.rotation.z, rightCurlSign * thumbFlexR * 1.2, cDamp);
          }

          // Head follows gaze slightly downward (+spineForwardXSign) from left hand (+Y) to right hand (-Y)
          const scanYaw = raiseU * THREE.MathUtils.lerp(0.24, -0.26, headFocusU);
          if (neck) neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, scanYaw * 0.4, cDamp);
          if (head) {
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, scanYaw * 0.6, cDamp);
            head.rotation.x = THREE.MathUtils.lerp(
              head.rotation.x,
              spineForwardXSign * (0.02 + raiseU * 0.18),
              cDamp
            );
            head.rotation.z = THREE.MathUtils.lerp(
              head.rotation.z,
              raiseU * THREE.MathUtils.lerp(0.08, -0.08, headFocusU),
              cDamp
            );
          }
          }
        } else if (co.pose === 'florieArrival') {
          if (vrm) {
            applyBlenderFlorieArrivalPose(vrm, baseHipsPos, Math.max(0, ct - 7.0));
          }
        } else if (co.pose === 'wave') {
          if (rightUpperArm) {
            rightUpperArm.rotation.x = THREE.MathUtils.lerp(
              rightUpperArm.rotation.x,
              rightArmForwardXSign * 0.28,
              cDamp
            );
            rightUpperArm.rotation.z = THREE.MathUtils.lerp(
              rightUpperArm.rotation.z,
              rightArmDownZ * 0.44,
              cDamp
            );
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.x = THREE.MathUtils.lerp(
              rightLowerArm.rotation.x,
              rightPalmForwardXSign * 0.92,
              cDamp
            );
            rightLowerArm.rotation.y = THREE.MathUtils.lerp(
              rightLowerArm.rotation.y,
              rightElbowForwardYSign * 1.32,
              cDamp
            );
          }
          if (rightHand) {
            rightHand.rotation.y = THREE.MathUtils.lerp(rightHand.rotation.y, Math.sin(ct * 7.4) * 0.36, cDamp);
          }
        } else if (co.pose === 'takeArm') {
          if (leftUpperArm) {
            leftUpperArm.rotation.x = THREE.MathUtils.lerp(
              leftUpperArm.rotation.x,
              leftArmForwardXSign * 0.22,
              cDamp
            );
            leftUpperArm.rotation.z = THREE.MathUtils.lerp(
              leftUpperArm.rotation.z,
              leftArmDownZ * 0.85,
              cDamp
            );
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.x = THREE.MathUtils.lerp(
              leftLowerArm.rotation.x,
              leftPalmForwardXSign * 0.18,
              cDamp
            );
            leftLowerArm.rotation.y = THREE.MathUtils.lerp(
              leftLowerArm.rotation.y,
              leftElbowForwardYSign * 0.86,
              cDamp
            );
          }
          for (const f of leftFingerBones) {
            f.bone.rotation.z = THREE.MathUtils.lerp(
              f.bone.rotation.z,
              leftCurlSign * (0.34 + f.fingerIdx * 0.05),
              cDamp
            );
          }
        } else if (co.pose === 'openDoor') {
          if (vrm && applyBlenderFloriePushDoorPose(vrm, baseHipsPos, Math.max(0, ct - 16.2))) {
            // Driven by Blender-authored full-body florie_push_door.json
          } else {
            // Fallback procedural reach if clip is still loading
            const reachU = smoothstep(15.7, 16.25, ct) * (1 - smoothstep(16.85, 17.35, ct));
            if (rightUpperArm) {
              rightUpperArm.rotation.x = THREE.MathUtils.lerp(
                rightUpperArm.rotation.x,
                rightArmForwardXSign * (0.12 + reachU * 0.68),
                cDamp
              );
              rightUpperArm.rotation.z = THREE.MathUtils.lerp(
                rightUpperArm.rotation.z,
                rightArmDownZ * (0.88 - reachU * 0.22),
                cDamp
              );
            }
            if (rightLowerArm) {
              rightLowerArm.rotation.y = THREE.MathUtils.lerp(
                rightLowerArm.rotation.y,
                rightElbowForwardYSign * (0.22 + reachU * 0.45),
                cDamp
              );
              rightLowerArm.rotation.x = THREE.MathUtils.lerp(
                rightLowerArm.rotation.x,
                rightPalmForwardXSign * reachU * 0.25,
                cDamp
              );
            }
            if (rightHand) {
              const handleTurn = smoothstep(16.1, 16.35, ct) * (1 - smoothstep(16.55, 16.85, ct));
              rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, handleTurn * 0.35, cDamp);
            }
            for (const f of rightFingerBones) {
              f.bone.rotation.z = THREE.MathUtils.lerp(
                f.bone.rotation.z,
                rightCurlSign * (0.24 + reachU * 0.36),
                cDamp
              );
            }
          }
        } else if (co.pose === 'deskRest') {
          // Helen's hands poised cleanly above the desk/keyboard (zero clipping, zero typing)
          if (leftUpperArm) {
            leftUpperArm.rotation.x = THREE.MathUtils.lerp(leftUpperArm.rotation.x, leftArmForwardXSign * 0.14, cDamp);
            leftUpperArm.rotation.z = THREE.MathUtils.lerp(leftUpperArm.rotation.z, leftArmDownZ * 0.66, cDamp);
          }
          if (rightUpperArm) {
            rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, rightArmForwardXSign * 0.14, cDamp);
            rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, rightArmDownZ * 0.66, cDamp);
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.y = THREE.MathUtils.lerp(leftLowerArm.rotation.y, leftElbowForwardYSign * 1.02, cDamp);
            leftLowerArm.rotation.x = THREE.MathUtils.lerp(leftLowerArm.rotation.x, leftPalmForwardXSign * 0.16, cDamp);
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.y = THREE.MathUtils.lerp(rightLowerArm.rotation.y, rightElbowForwardYSign * 1.02, cDamp);
            rightLowerArm.rotation.x = THREE.MathUtils.lerp(rightLowerArm.rotation.x, rightPalmForwardXSign * 0.16, cDamp);
          }
          for (const f of leftFingerBones) {
            f.bone.rotation.z = THREE.MathUtils.lerp(f.bone.rotation.z, leftCurlSign * 0.22, cDamp);
          }
          for (const f of rightFingerBones) {
            f.bone.rotation.z = THREE.MathUtils.lerp(f.bone.rotation.z, rightCurlSign * 0.22, cDamp);
          }
        } else if (co.pose === 'standUp') {
          // Gentle, smooth sit-to-stand transition using Blender stand_up clip
          const standBlend = Math.min(1, cutPoseElapsed / 0.35);
          applyBlenderSitPose(vrm, baseHipsPos, 'stand_up', Math.max(0, ct - 32.8) * 0.78, standBlend, false);
        } else if (co.pose === 'openDrawer' || co.pose === 'placePaper') {
          // Use Blender-authored Helen drawer-to-desk paper animation (5.4s seamless clip after standing up)
          applyBlenderHelenDrawerPaperPose(vrm, baseHipsPos, Math.max(0, ct - 34.25), clipBlend);
        } else if (co.pose === 'confusedGlance') {
          // Use Blender-authored zero-tremble confused glance clip (with smooth return to neutral)
          applyBlenderPlayerConfusedGlancePose(vrm, baseHipsPos, Math.max(0, ct - 26.8), clipBlend);
        } else if (co.pose === 'embarrassed') {
          // Use Blender-authored zero-tremble embarrassed slouch & hand-on-hip clip
          const appliedBlenderEmb = applyBlenderFlorieEmbarrassedPose(vrm, baseHipsPos, Math.max(0, ct - 26.8), clipBlend);
          if (!appliedBlenderEmb) {
            if (spine) {
              spine.rotation.x += spineForwardXSign * 0.065;
            }
            if (chest) {
              chest.rotation.x += spineForwardXSign * 0.055;
            }
            if (head) {
              head.rotation.x += spineForwardXSign * 0.06;
            }
            if (leftShoulder) {
              leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, leftArmDownZ * 0.08, cDamp);
            }
            if (rightUpperArm) {
              rightUpperArm.rotation.x = THREE.MathUtils.lerp(
                rightUpperArm.rotation.x,
                rightArmForwardXSign * 0.42,
                cDamp
              );
              rightUpperArm.rotation.z = THREE.MathUtils.lerp(
                rightUpperArm.rotation.z,
                rightArmDownZ * 0.62,
                cDamp
              );
            }
            if (rightLowerArm) {
              rightLowerArm.rotation.x = THREE.MathUtils.lerp(
                rightLowerArm.rotation.x,
                rightPalmForwardXSign * 0.45,
                cDamp
              );
              rightLowerArm.rotation.y = THREE.MathUtils.lerp(
                rightLowerArm.rotation.y,
                rightElbowForwardYSign * 1.35,
                cDamp
              );
            }
          }
        } else if (co.pose === 'chuckle') {
          if (chest) {
            chest.rotation.x += Math.abs(Math.sin(ct * 8.0)) * 0.03;
          }
          if (leftShoulder) {
            leftShoulder.rotation.z = THREE.MathUtils.lerp(
              leftShoulder.rotation.z,
              -leftArmDownZ * (0.04 + Math.abs(Math.sin(ct * 8.0)) * 0.04),
              cDamp
            );
          }
          if (rightShoulder) {
            rightShoulder.rotation.z = THREE.MathUtils.lerp(
              rightShoulder.rotation.z,
              -rightArmDownZ * (0.04 + Math.abs(Math.sin(ct * 8.0)) * 0.04),
              cDamp
            );
          }
          if (head) {
            head.rotation.x += Math.sin(ct * 8.0) * 0.035;
          }
        } else if (co.pose === 'none') {
          // Gentle breathing only (no idle sway/oscillation)
          if (chest) {
            chest.rotation.x += Math.sin(ct * 1.65) * 0.008;
          }
        }

        const targetNeckTiltZ = co.headGesture === 'tilt' ? -0.04 : 0;
        const targetHeadTiltZ = co.headGesture === 'tilt' ? -0.11 : co.pose === 'chuckle' ? 0.06 : 0;
        cutNeckTiltZ = THREE.MathUtils.damp(cutNeckTiltZ, targetNeckTiltZ, 6.0, safeDt);
        cutHeadTiltZ = THREE.MathUtils.damp(cutHeadTiltZ, targetHeadTiltZ, 6.0, safeDt);
        if (neck && Math.abs(cutNeckTiltZ) > 0.0005) {
          neck.rotation.z += cutNeckTiltZ;
        }
        if (head) {
          if (Math.abs(cutHeadTiltZ) > 0.0005) {
            head.rotation.z += cutHeadTiltZ;
          }
          if (co.headGesture === 'nod') {
            // Subtle upward affirmative chin-lift (-spineForwardXSign lifts chin UP), then returns cleanly to neutral
            const upNod = Math.max(0, Math.sin((ct - 8.5) * 4.2));
            head.rotation.x += -spineForwardXSign * 0.10 * upNod;
          } else if (co.headGesture === 'gentleNod') {
            // Warm, smooth affirmative nod (downward dip)
            const dip = Math.max(0, Math.sin((ct - 21.0) * 3.2));
            head.rotation.x += spineForwardXSign * 0.075 * dip;
          } else if (co.headGesture === 'shake') {
            head.rotation.y += Math.sin(ct * 3.0) * 0.09;
          }
        }

        if (blushLeftMat && blushRightMat) {
          blushLeftMat.opacity = THREE.MathUtils.lerp(blushLeftMat.opacity, co.blush * 0.72, cDamp);
          blushRightMat.opacity = blushLeftMat.opacity;
        }
      } else {
        cutNeckTiltZ = THREE.MathUtils.damp(cutNeckTiltZ, 0, 8.0, safeDt);
        cutHeadTiltZ = THREE.MathUtils.damp(cutHeadTiltZ, 0, 8.0, safeDt);
        if (blushLeftMat && blushRightMat && blushLeftMat.opacity > 0.005) {
          blushLeftMat.opacity = THREE.MathUtils.lerp(blushLeftMat.opacity, 0, damp);
          blushRightMat.opacity = blushLeftMat.opacity;
        }
      }

      // 5d) Lock irises (leftEye / rightEye) onto lookAtPos or scan during cutscenes ONLY.
      //     In-game (cutsceneOverride === null), eyes stay strictly neutral.
      if (cutsceneOverride && head && (leftEye || rightEye)) {
        let targetEyeYaw = 0;
        let targetEyePitch = 0;
        const inspectEyesActive = cutsceneOverride.pose === 'inspectHands' && npcLookBlend <= 0.005;
        const sideGlanceEyesActive = cutsceneOverride.pose === 'confusedGlance';
        if (sideGlanceEyesActive) {
          // Only irises glance sideways toward Florie while head stays facing Helen
          targetEyeYaw = -0.20;
          targetEyePitch = -0.02;
        } else if (npcLookBlend > 0.005 && npcTalkState.lookAtPos) {
          container.updateMatrixWorld(true);
          head.getWorldPosition(_npcHeadWorld);
          _npcLocalDir.copy(npcTalkState.lookAtPos).sub(_npcHeadWorld);
          head.getWorldQuaternion(_npcInvQuat).invert();
          _npcLocalDir.applyQuaternion(_npcInvQuat);
          if (_npcLocalDir.lengthSq() > 0.0001) {
            _npcLocalDir.normalize();
            targetEyeYaw = THREE.MathUtils.clamp(Math.atan2(-_npcLocalDir.x, -_npcLocalDir.z), -0.22, 0.22);
            targetEyePitch = THREE.MathUtils.clamp(
              Math.atan2(_npcLocalDir.y, Math.hypot(_npcLocalDir.x, _npcLocalDir.z)),
              -0.14,
              0.14
            );
          }
        } else if (inspectEyesActive) {
          const tScan = cutsceneOverride.time;
          targetEyeYaw = THREE.MathUtils.clamp(
            Math.sin(tScan * 1.45) * 0.13 + Math.sin(tScan * 3.1) * 0.03,
            -0.16,
            0.16
          );
          targetEyePitch = THREE.MathUtils.clamp(-0.08 + Math.cos(tScan * 1.1) * 0.035, -0.12, 0.06);
        }
        const eyeBlend = inspectEyesActive || sideGlanceEyesActive ? 1 : npcLookBlend;
        const eyeDamp = 1 - Math.exp(-16.0 * safeDt);
        npcEyeYaw = THREE.MathUtils.lerp(npcEyeYaw, targetEyeYaw * eyeBlend, eyeDamp);
        npcEyePitch = THREE.MathUtils.lerp(npcEyePitch, targetEyePitch * eyeBlend, eyeDamp);
        const eyeRotX = -spineForwardXSign * npcEyePitch;
        if (leftEye) {
          leftEye.rotation.y = npcEyeYaw;
          leftEye.rotation.x = eyeRotX;
        }
        if (rightEye) {
          rightEye.rotation.y = npcEyeYaw;
          rightEye.rotation.x = eyeRotX;
        }
      } else if (npcEyeYaw !== 0 || npcEyePitch !== 0) {
        npcEyeYaw = 0;
        npcEyePitch = 0;
        if (leftEye) {
          leftEye.rotation.y = 0;
          leftEye.rotation.x = 0;
        }
        if (rightEye) {
          rightEye.rotation.y = 0;
          rightEye.rotation.x = 0;
        }
      }

      // 6) Natural periodic eye blinking & nuanced facial expressions via VRM ExpressionManager
      const hasVRoidMorphs = faceMorphTargets.length > 0;
      let activeBlink = 0;
      const talkSmile = npcTalkBlend * (0.34 + npcTalkState.speechLevel * 0.16);
      const talkBrow = npcTalkBlend * Math.max(0, (npcTalkState.speechLevel - 0.18) * 0.85);
      const cutExpr = cutsceneOverride?.expression ?? 'none';
      const cutHappy =
        cutExpr === 'happy'
          ? 0.85
          : cutExpr === 'warmSmile'
            ? 0.58
            : cutExpr === 'amused'
              ? 0.5
              : cutExpr === 'laugh'
                ? 0.72
                : 0;
      const cutEyeSquint =
        cutExpr === 'happy'
          ? 1.0
          : cutExpr === 'embarrassed'
            ? 0.22
            : cutExpr === 'laugh'
              ? 0.38
              : cutExpr === 'warmSmile' || cutExpr === 'amused'
                ? 0.16
                : 0;
      const cutBrow = cutExpr === 'confused' ? 0.55 : cutExpr === 'surprised' ? 0.68 : 0;
      const effHappy = Math.max(pose.expressionHappy, talkSmile, cutHappy);
      const effEyeSquint = Math.max(pose.expressionEyeSquint, npcTalkBlend * 0.24, cutEyeSquint);
      const effCuriousBrow = Math.max(pose.expressionCuriousBrow, talkBrow, cutBrow);

      if (vrm.expressionManager) {
        const blinkCycle = elapsedAccum % 3.8;
        let autoBlink = 0;
        if (blinkCycle > 3.64) {
          autoBlink = Math.sin(((blinkCycle - 3.64) / 0.16) * Math.PI);
        }
        let confusedBlink = 0;
        if (cutExpr === 'confused' && cutsceneOverride && cutsceneOverride.time >= 26.8) {
          const p = ((cutsceneOverride.time - 26.8) % 0.54) / 0.54;
          if (p < 0.28) {
            confusedBlink = Math.sin((p / 0.28) * Math.PI);
          }
        }
        activeBlink =
          cutExpr === 'happy'
            ? 0
            : Math.max(0, Math.min(1, Math.max(autoBlink, confusedBlink, pose.blinkOverride)));
        vrm.expressionManager.setValue('blink', activeBlink);
        // Let direct VRoid morphs render delicate closed smiles so 'happy' never pops the jaw wide open
        vrm.expressionManager.setValue('happy', hasVRoidMorphs ? 0 : Math.min(0.85, effHappy));
        vrm.expressionManager.setValue('relaxed', hasVRoidMorphs ? 0 : effEyeSquint * 0.65);
        vrm.expressionManager.setValue('surprised', hasVRoidMorphs ? 0 : effCuriousBrow * 0.45);
        const sLvl = npcTalkState.speechLevel;
        const sTime = npcTalkState.speechTime;
        const lipActive = npcTalkBlend > 0.05 && sLvl > 0.03;
        const lipDamp = lipActive ? 1 - Math.exp(-34 * safeDt) : 1 - Math.exp(-18 * safeDt);
        const cycle = (sTime * 9.5) % 4.0;
        const wAa = lipActive ? sLvl * (0.42 + 0.38 * Math.max(0, Math.sin(cycle * 1.57))) : 0;
        const wOh = lipActive ? sLvl * 0.38 * Math.max(0, Math.cos(cycle * 1.57)) : 0;
        const wIh = lipActive ? sLvl * 0.28 * Math.max(0, Math.sin((cycle + 1.2) * 1.57)) : 0;
        const wEe = lipActive ? sLvl * 0.22 * Math.max(0, -Math.sin(cycle * 1.57)) : 0;

        for (const vk of ['aa', 'ih', 'ou', 'ee', 'oh'] as VisemeKey[]) {
          let targetV =
            vk === 'oh'
              ? pose.expressionSoftMouthOpen * 0.85
              : vk === 'aa'
                ? pose.expressionSoftMouthOpen * 0.22
                : 0;
          if (lipActive) {
            targetV =
              vk === 'aa'
                ? wAa
                : vk === 'oh'
                  ? wOh
                  : vk === 'ih'
                    ? wIh
                    : vk === 'ee'
                      ? wEe
                      : wOh * 0.35;
          }
          currentVisemes[vk] = THREE.MathUtils.lerp(currentVisemes[vk], targetV, lipDamp);
          vrm.expressionManager.setValue(vk, currentVisemes[vk]);
        }
      }

      // 7) Advance VRM SpringBones & enforce supple, non-bouncing cloth physics on the dress
      vrm.update(safeDt);

      // Apply delicate eyebrow/eye/mouth-corner VRoid morphs across ALL Face primitives & hide eye interiors when eyes close
      const eyesClosed = cutExpr === 'happy' || activeBlink > 0.65;
      for (const entry of faceMorphTargets) {
        if (entry.isEyeInterior) {
          entry.mesh.visible = !eyesClosed;
        }
        const dict = entry.dict;
        const inf = entry.influences;
        if (!inf.length) continue;
        const brwJoyIdx = dict['Fcl_BRW_Joy'];
        const brwSurpIdx = dict['Fcl_BRW_Surprised'];
        const brwSorrowIdx = dict['Fcl_BRW_Sorrow'];
        const eyeFunIdx = dict['Fcl_EYE_Fun'];
        const eyeJoyIdx = dict['Fcl_EYE_Joy'];
        const eyeIrisHideIdx = dict['Fcl_EYE_Iris_Hide'];
        const eyeHighlightHideIdx = dict['Fcl_EYE_Highlight_Hide'];
        const mthFunIdx = dict['Fcl_MTH_Fun'];
        const mthSorrowIdx = dict['Fcl_MTH_Sorrow'];
        if (brwJoyIdx !== undefined) {
          inf[brwJoyIdx] = cutExpr === 'embarrassed' ? 0 : Math.min(0.75, effHappy * 0.72);
        }
        if (brwSurpIdx !== undefined) {
          inf[brwSurpIdx] = cutExpr === 'confused' ? 0.72 : effCuriousBrow * 0.65;
        }
        if (brwSorrowIdx !== undefined) {
          inf[brwSorrowIdx] = cutExpr === 'confused' ? 0.55 : cutExpr === 'embarrassed' ? 0.72 : 0;
        }
        if (mthSorrowIdx !== undefined) {
          inf[mthSorrowIdx] = cutExpr === 'confused' ? 0.28 : cutExpr === 'embarrassed' ? 0.36 : 0;
        }
        if (eyeJoyIdx !== undefined) {
          inf[eyeJoyIdx] = cutExpr === 'happy' ? 1.0 : 0;
        }
        if (eyeIrisHideIdx !== undefined) {
          inf[eyeIrisHideIdx] = eyesClosed ? 1 : 0;
        }
        if (eyeHighlightHideIdx !== undefined) {
          inf[eyeHighlightHideIdx] = eyesClosed ? 1 : 0;
        }
        if (eyeFunIdx !== undefined) {
          // Attenuate happy eye-squint while blinking so eyelids never over-close or clip
          inf[eyeFunIdx] =
            cutExpr === 'happy' ? 0 : effEyeSquint * 0.62 * (1 - activeBlink * 0.85);
        }
        if (mthFunIdx !== undefined) {
          inf[mthFunIdx] = Math.min(0.45, effHappy * 0.48);
        }
      }

      const clothSmoothAlpha = 1 - Math.exp(-10 * safeDt);
      for (const tj of tunedJoints) {
        const bone = tj.joint.bone as THREE.Object3D;
        _clampedQuat.copy(bone.quaternion);

        // Softly clamp maximum angular deflection from rest pose (tighter on skirt while seated so front never lifts high)
        const effectiveMaxAngle =
          isSitClipState && tj.isDressOrSkirt ? 0.10 : tj.maxAngleRad;
        const angle = tj.restQuat.angleTo(_clampedQuat);
        if (angle > effectiveMaxAngle && angle > 0.0001) {
          const allowedFraction = effectiveMaxAngle / angle;
          _clampedQuat.copy(tj.restQuat).slerp(bone.quaternion, allowedFraction);
        }

        if (tj.isDressOrSkirt) {
          // Bleed off any collision-kick velocity spike inside Verlet tail buffers so it never rebounds
          if (tj.joint._prevTail && tj.joint._currentTail) {
            tj.joint._prevTail.lerp(tj.joint._currentTail, 0.82);
          }
          tj.smoothedQuat.slerp(_clampedQuat, clothSmoothAlpha);
          bone.quaternion.copy(tj.smoothedQuat);
        } else {
          bone.quaternion.copy(_clampedQuat);
        }
        bone.updateMatrix();
      }

      // Smoothly drape front skirt bones down onto thighs while sitting/seated so SpringBones never lift them
      const targetSkirtWeight = state === 'sit' ? 1 : state === 'sit_down' || state === 'stand_up' ? 0.85 : 0;
      skirtFrontSitWeight = THREE.MathUtils.damp(skirtFrontSitWeight, targetSkirtWeight, 8, safeDt);
      if (skirtFrontSitWeight > 0.005 && skirtFrontBones.length > 0) {
        for (const sf of skirtFrontBones) {
          _skirtDrapeQ.setFromAxisAngle(_skirtDrapeAxis, -thighForwardXSign * sf.rad * skirtFrontSitWeight);
          sf.bone.quaternion.copy(sf.restQuat).multiply(_skirtDrapeQ);
          sf.bone.updateMatrix();
        }
      }

      // Add subtle, organic woven-fabric ripple to the bundled skirt drape during locomotion
      if (bundledSkirtDrape) {
        bundledSkirtDrape.rotation.x = THREE.MathUtils.lerp(
          bundledSkirtDrape.rotation.x,
          pose.skirtRipplePitch,
          clothSmoothAlpha
        );
        bundledSkirtDrape.rotation.z = THREE.MathUtils.lerp(
          bundledSkirtDrape.rotation.z,
          pose.skirtRippleRoll,
          clothSmoothAlpha
        );
        bundledSkirtDrape.updateMatrix();
      }
    }
  };

  const updateIntroCutscene = (
    introTime: number,
    dt: number,
    floriePos?: THREE.Vector3,
    playerYaw = Math.PI,
    cameraPos?: THREE.Vector3
  ) => {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
    gaitBlend.elapsedAccum += safeDt;
    const damp = 1 - Math.exp(-7.2 * safeDt);
    const fastDamp = 1 - Math.exp(-10.5 * safeDt);
    const visemeDamp = 1 - Math.exp(-24 * safeDt);

    if (!vrm) return;

    // Continuous C1-smooth choreography across the 11.65s cutscene:
    // - raiseEnv: smoothly raises right arm for greeting (0.0s -> 0.45s)
    // - waveBlend: enthusiastic greeting wave on "Bonjour !" (0.0s -> 2.2s)
    // - introSelfEnv: warm hand-to-chest + welcoming left hand on "Je m'appelle Florie" (1.85s -> 3.85s)
    // - happyClaspEnv: excited soft clasp on "trop contente que tu sois ici !" (3.45s -> 5.65s)
    // - beckonBlend: turns & beckons warmly on "Allez viens, suis-moi !" (5.5s -> 9.0s)
    // - walkWeight: transitions smoothly into StylizedWalk gait (5.65s -> 6.55s)
    // - walkArmsWeight: transitions arms into natural walking swing through the open door (8.5s -> 9.3s)
    // - afterBeckon: turns head/torso forward into the entrance right before the cut (10.1s -> 10.95s)
    const raiseEnv = smoothstep(0.0, 0.45, introTime);
    const waveBlend = smoothstep(0.0, 0.35, introTime) * (1 - smoothstep(1.6, 2.25, introTime));
    const introSelfEnv = smoothstep(1.85, 2.35, introTime) * (1 - smoothstep(3.35, 3.85, introTime));
    const happyClaspEnv = smoothstep(3.45, 3.95, introTime) * (1 - smoothstep(5.1, 5.65, introTime));
    const toBeckon = smoothstep(5.35, 6.55, introTime);
    const turnStepEnv = Math.sin(toBeckon * Math.PI);
    const walkArmsWeight = smoothstep(8.5, 9.3, introTime);
    const afterBeckon = smoothstep(9.1, 10.5, introTime);
    const beckonBlend = toBeckon * (1 - smoothstep(8.3, 9.1, introTime));
    const walkWeight = smoothstep(5.55, 6.75, introTime);

    // Continuous walking gait clock using the exact in-game StylizedWalk animation
    const walkClock = Math.max(0, introTime - 5.45) * 6.2;
    const walkS = Math.sin(walkClock);
    const walkPose = computeStylizedAnimeGait(
      'walk',
      walkClock,
      0,
      safeDt,
      gaitBlend,
      gaitPose,
      true
    );

    const idleBounceY = Math.abs(Math.sin(introTime * 5.0)) * 0.016 + turnStepEnv * 0.022;
    const bounceY = THREE.MathUtils.lerp(idleBounceY, walkPose.hipsOffsetY, walkWeight);

    const idleSwayX = Math.sin(introTime * 2.5) * 0.016;
    const swayX = THREE.MathUtils.lerp(idleSwayX, walkPose.hipsOffsetX, walkWeight);

    springCenter.position.set(swayX * 0.25, -bounceY * 0.2, 0.006);

    // Compute exact world-space yaw from Florie to the camera (the player's eyes)
    // In Florie.vrm, total world yaw = Math.PI + camYaw makes her face point 100% directly at cameraPos!
    const camDx = cameraPos && floriePos ? cameraPos.x - floriePos.x : 0;
    const camDz = cameraPos && floriePos ? cameraPos.z - floriePos.z : 1.8;
    const camYawFromFlorie = Math.atan2(camDx, Math.max(0.25, camDz));
    const desiredLookWorldYaw = Math.PI + camYawFromFlorie;

    // 1) Hips & Torso contrapposto -> fluid upper-body twist back toward the camera while walking to the door
    if (hips) {
      hips.position.x = THREE.MathUtils.lerp(hips.position.x, baseHipsPos.x + swayX, damp);
      hips.position.y = THREE.MathUtils.lerp(hips.position.y, baseHipsPos.y + bounceY, damp);
      hips.position.z = THREE.MathUtils.lerp(
        hips.position.z,
        baseHipsPos.z + walkPose.hipsOffsetZ * walkWeight,
        damp
      );

      const waveHipsY = Math.sin(introTime * 2.5) * 0.05;
      const targetHipsYRot = THREE.MathUtils.lerp(waveHipsY, walkPose.hipsRotY, walkWeight);

      const waveHipsZ = 0.035 + Math.cos(introTime * 2.5) * 0.015;
      const targetHipsZRot = THREE.MathUtils.lerp(waveHipsZ, walkPose.hipsRotZ, walkWeight);
      const targetHipsXRot = THREE.MathUtils.lerp(
        -0.02,
        spineForwardXSign * walkPose.hipsRotX,
        walkWeight
      );

      hips.rotation.x = THREE.MathUtils.lerp(hips.rotation.x, targetHipsXRot, damp);
      hips.rotation.y = THREE.MathUtils.lerp(hips.rotation.y, targetHipsYRot, damp);
      hips.rotation.z = THREE.MathUtils.lerp(hips.rotation.z, targetHipsZRot, damp);
    }

    if (spine) {
      const targetSpineX =
        (-0.04 + Math.sin(introTime * 5.0) * 0.016) * (1 - toBeckon) +
        (0.03 + Math.sin(introTime * 5.0) * 0.018) * toBeckon;
      // Spine twists naturally over her right shoulder (-Y) during beckonBlend as she turns to walk forward
      const targetSpineY =
        Math.sin(introTime * 2.5 - 0.3) * 0.05 * (1 - toBeckon) +
        -0.28 * beckonBlend +
        -0.14 * turnStepEnv +
        -walkS * 0.06 * afterBeckon;
      const targetSpineZ = -0.05 * (1 - toBeckon) + 0.03 * beckonBlend;
      spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, targetSpineX, damp);
      spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, targetSpineY, damp);
      spine.rotation.z = THREE.MathUtils.lerp(spine.rotation.z, targetSpineZ, damp);
    }

    if (chest) {
      const targetChestX = -0.035 * (1 - toBeckon) + 0.015 * toBeckon;
      const targetChestY = -0.04 * (1 - toBeckon) - 0.24 * beckonBlend;
      const targetChestZ = -0.04 * (1 - toBeckon) - 0.025 * beckonBlend;
      chest.rotation.x = THREE.MathUtils.lerp(chest.rotation.x, targetChestX, damp);
      chest.rotation.y = THREE.MathUtils.lerp(chest.rotation.y, targetChestY, damp);
      chest.rotation.z = THREE.MathUtils.lerp(chest.rotation.z, targetChestZ, damp);
    }

    if (upperChest) {
      const targetUpperChestY = -0.03 * (1 - toBeckon) - 0.16 * beckonBlend;
      const targetUpperChestZ = -0.025 * (1 - toBeckon) - 0.02 * beckonBlend;
      upperChest.rotation.x = THREE.MathUtils.lerp(
        upperChest.rotation.x,
        Math.sin(introTime * 3.0) * 0.016,
        damp
      );
      upperChest.rotation.y = THREE.MathUtils.lerp(upperChest.rotation.y, targetUpperChestY, damp);
      upperChest.rotation.z = THREE.MathUtils.lerp(upperChest.rotation.z, targetUpperChestZ, damp);
    }

    // 2) Neck & Head: mathematically locked onto the player/camera (desiredLookWorldYaw)
    //    during both the greeting wave AND the entire "Suis-moi !" walk!
    const currentTorsoWorldYaw =
      playerYaw +
      (hips?.rotation.y ?? 0) +
      (spine?.rotation.y ?? 0) +
      (chest?.rotation.y ?? 0) +
      (upperChest?.rotation.y ?? 0);

    const rawYawDiff = desiredLookWorldYaw - currentTorsoWorldYaw;
    const normalizedYawDiff = Math.atan2(Math.sin(rawYawDiff), Math.cos(rawYawDiff));
    const clampedLookDiff = THREE.MathUtils.clamp(normalizedYawDiff, -1.05, 1.05);
    // Keep looking directly at the camera until 11.4s (when she finishes speaking and steps through the door)
    const lookAtCameraWeight = 1 - afterBeckon;

    if (neck) {
      const targetNeckY = clampedLookDiff * 0.42 * lookAtCameraWeight;
      const targetNeckZ = 0.05 * (1 - toBeckon) + 0.04 * beckonBlend;
      const targetNeckX = -0.02 * (1 - toBeckon) + -0.015 * beckonBlend;
      neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, targetNeckX, fastDamp);
      neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, targetNeckY, fastDamp);
      neck.rotation.z = THREE.MathUtils.lerp(neck.rotation.z, targetNeckZ, fastDamp);
    }

    if (head) {
      const targetHeadX = -0.05 + Math.sin(introTime * 6.2) * 0.052;
      const targetHeadY =
        (clampedLookDiff * 0.62 + Math.sin(introTime * 2.4) * 0.045) * lookAtCameraWeight;
      const targetHeadZ =
        (0.14 + Math.sin(introTime * 3.4) * 0.045) * (1 - toBeckon) +
        (0.10 + Math.cos(introTime * 2.8) * 0.032) * beckonBlend;

      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetHeadX, fastDamp);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadY, fastDamp);
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, targetHeadZ, fastDamp);
    }

    // 3) Left Clavicle, Upper Arm, Forearm, Wrist & Fingers (Palms Toward Camera, Natural Welcome & Clasp)
    if (leftShoulder) {
      const lShZ =
        -leftArmDownZ * (0.04 + 0.08 * introSelfEnv + 0.10 * happyClaspEnv) * (1 - toBeckon);
      const lShY = -0.02 * (1 - toBeckon) + 0.04 * beckonBlend;
      leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, lShZ, damp);
      leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, lShY, damp);
    }

    if (leftUpperArm) {
      const walkSwingL = walkS * 0.42 * walkWeight;
      const welcomeOpenLX = 0.28 * introSelfEnv + 0.36 * happyClaspEnv;
      const welcomeOpenLZ = leftArmDownZ * (0.82 - 0.18 * introSelfEnv - 0.22 * happyClaspEnv);
      const targetLZ = THREE.MathUtils.lerp(
        welcomeOpenLZ + Math.sin(introTime * 2.5) * 0.025,
        leftArmDownZ * 0.90,
        walkWeight
      );
      const targetLX =
        leftArmForwardXSign *
        THREE.MathUtils.lerp(0.18 + welcomeOpenLX, walkSwingL + 0.08 * beckonBlend, walkWeight);
      const targetLY = 0.08 * (1 - afterBeckon) - 0.12 * happyClaspEnv;
      leftUpperArm.rotation.z = THREE.MathUtils.lerp(leftUpperArm.rotation.z, targetLZ, damp);
      leftUpperArm.rotation.x = THREE.MathUtils.lerp(leftUpperArm.rotation.x, targetLX, damp);
      leftUpperArm.rotation.y = THREE.MathUtils.lerp(leftUpperArm.rotation.y, targetLY, damp);
    }

    if (leftLowerArm) {
      const walkElbowL = leftElbowForwardYSign * (0.28 + Math.max(0, walkS) * 0.28);
      const gestureElbowL =
        leftElbowForwardYSign *
        (0.46 + 0.56 * introSelfEnv + 0.72 * happyClaspEnv + Math.sin(introTime * 2.5) * 0.04);
      const targetLElbowY = THREE.MathUtils.lerp(gestureElbowL, walkElbowL, walkWeight);
      const targetLElbowX =
        leftPalmForwardXSign *
        THREE.MathUtils.lerp(0.55 + 0.48 * introSelfEnv + 0.28 * happyClaspEnv, 0.08, walkWeight);
      leftLowerArm.rotation.x = THREE.MathUtils.lerp(leftLowerArm.rotation.x, targetLElbowX, damp);
      leftLowerArm.rotation.y = THREE.MathUtils.lerp(leftLowerArm.rotation.y, targetLElbowY, damp);
      leftLowerArm.rotation.z = THREE.MathUtils.lerp(leftLowerArm.rotation.z, 0, damp);
    }

    if (leftHand) {
      const lWristX =
        leftPalmForwardXSign *
        THREE.MathUtils.lerp(0.24 + 0.22 * introSelfEnv + 0.14 * happyClaspEnv, 0.04, walkWeight);
      const lWristY =
        (Math.sin(introTime * 2.8) * 0.12 + 0.12 * introSelfEnv - 0.12 * happyClaspEnv) *
        (1 - walkWeight);
      const lWristZ =
        leftCurlSign *
        THREE.MathUtils.lerp(-0.14 * introSelfEnv + 0.18 * happyClaspEnv, 0.14, walkWeight);
      leftHand.rotation.x = THREE.MathUtils.lerp(leftHand.rotation.x, lWristX, fastDamp);
      leftHand.rotation.y = THREE.MathUtils.lerp(leftHand.rotation.y, lWristY, fastDamp);
      leftHand.rotation.z = THREE.MathUtils.lerp(leftHand.rotation.z, lWristZ, fastDamp);
    }

    for (const f of leftFingerBones) {
      const welcomeSpread = 0.05 + f.fingerIdx * 0.025;
      const claspCurl = 0.44 + f.fingerIdx * 0.055;
      const walkCurl = 0.28 + f.fingerIdx * 0.045;
      const gestureCurl =
        THREE.MathUtils.lerp(0.14 + f.fingerIdx * 0.03, welcomeSpread, introSelfEnv) *
          (1 - happyClaspEnv) +
        claspCurl * happyClaspEnv;
      const targetLFingerZ = leftCurlSign * THREE.MathUtils.lerp(gestureCurl, walkCurl, walkWeight);
      f.bone.rotation.z = THREE.MathUtils.lerp(f.bone.rotation.z, targetLFingerZ, fastDamp);
    }
    if (leftThumbProximal) {
      const lThumbY = 0.20 * happyClaspEnv - 0.14 * introSelfEnv;
      const lThumbZ = leftCurlSign * (0.22 * happyClaspEnv + 0.10 * walkWeight);
      leftThumbProximal.rotation.y = THREE.MathUtils.lerp(leftThumbProximal.rotation.y, lThumbY, fastDamp);
      leftThumbProximal.rotation.z = THREE.MathUtils.lerp(leftThumbProximal.rotation.z, lThumbZ, fastDamp);
    }

    // 4) Right Clavicle, Upper Arm, Forearm, Wrist & Fingers (Palms Toward Camera: Wave -> Welcome -> Clasp -> Beckon -> Walk)
    if (rightUpperArm && rightLowerArm) {
      // Wave phase oscillators (Act I)
      const wavePhase = introTime * 7.8;
      const waveUpper = Math.sin(wavePhase);
      const waveForearm = Math.sin(wavePhase - 0.28);
      const waveWrist = Math.sin(wavePhase - 0.58);

      // Beckon phase oscillators (Act II)
      const beckonPhase = Math.max(0, introTime - 5.95) * 5.0;
      const pullUpper = Math.sin(beckonPhase) * 0.5 + 0.5;
      const pullElbow = Math.sin(beckonPhase - 0.35) * 0.5 + 0.5;
      const pullWrist = Math.sin(beckonPhase - 0.68) * 0.5 + 0.5;
      const pullFingers = Math.sin(beckonPhase - 0.95) * 0.5 + 0.5;

      // Walk-in arm swing (Act III)
      const walkSwingR = -walkS * 0.40;

      if (rightShoulder) {
        const shZ =
          -rightArmDownZ * 0.12 * waveBlend +
          -rightArmDownZ * 0.08 * (introSelfEnv + happyClaspEnv) +
          -rightArmDownZ * (0.06 + pullUpper * 0.06) * beckonBlend;
        const shY =
          waveUpper * 0.04 * waveBlend + (-0.04 + pullUpper * 0.14) * beckonBlend;
        rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, shZ, fastDamp);
        rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, shY, fastDamp);
      }

      // Upper arm raised naturally out/forward (never folded back into chest)
      const waveArmZ = rightArmDownZ * 0.42 + waveUpper * 0.05;
      const selfArmZ = rightArmDownZ * 0.62;
      const claspArmZ = rightArmDownZ * 0.58;
      const beckonArmZ = rightArmDownZ * (0.50 - pullUpper * 0.12);
      const walkArmZ = rightArmDownZ * 0.90;
      const act1ArmZ =
        waveArmZ * waveBlend +
        selfArmZ * introSelfEnv +
        claspArmZ * happyClaspEnv +
        rightArmDownZ * Math.max(0, 1 - waveBlend - introSelfEnv - happyClaspEnv);
      const activeArmZ =
        act1ArmZ * (1 - toBeckon) +
        beckonArmZ * beckonBlend +
        walkArmZ * walkArmsWeight +
        rightArmDownZ * Math.max(0, toBeckon - beckonBlend - walkArmsWeight);
      const targetZ = THREE.MathUtils.lerp(rightArmDownZ, activeArmZ, raiseEnv);

      const waveArmX = rightArmForwardXSign * (0.30 + Math.cos(wavePhase * 0.5) * 0.03);
      const selfArmX = rightArmForwardXSign * 0.34;
      const claspArmX = rightArmForwardXSign * 0.44;
      const beckonArmX = rightArmForwardXSign * (0.48 + pullUpper * 0.24);
      const walkArmX = rightArmForwardXSign * walkSwingR;
      const act1ArmX =
        waveArmX * waveBlend + selfArmX * introSelfEnv + claspArmX * happyClaspEnv;
      const targetX =
        (act1ArmX * (1 - toBeckon) + beckonArmX * beckonBlend + walkArmX * walkArmsWeight) *
        raiseEnv;

      const waveArmY = waveUpper * 0.08;
      const selfArmY = 0.08;
      const claspArmY = -0.10;
      const beckonArmY = -rightArmForwardXSign * (0.14 - pullUpper * 0.24);
      const act1ArmY =
        waveArmY * waveBlend + selfArmY * introSelfEnv + claspArmY * happyClaspEnv;
      const targetY = (act1ArmY * (1 - toBeckon) + beckonArmY * beckonBlend) * raiseEnv;

      rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, targetZ, fastDamp);
      rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, targetX, fastDamp);
      rightUpperArm.rotation.y = THREE.MathUtils.lerp(rightUpperArm.rotation.y, targetY, fastDamp);

      // Forearm bent forward cleanly & rotated so the palm faces the camera
      const waveElbowY = rightElbowForwardYSign * (1.38 + Math.cos(wavePhase) * 0.06);
      const selfElbowY = rightElbowForwardYSign * 1.02;
      const claspElbowY = rightElbowForwardYSign * 1.18;
      const beckonElbowY = rightElbowForwardYSign * (0.82 + pullElbow * 0.62);
      const walkElbowY = rightElbowForwardYSign * (0.28 + Math.max(0, -walkS) * 0.28);
      const act1ElbowY =
        waveElbowY * waveBlend +
        selfElbowY * introSelfEnv +
        claspElbowY * happyClaspEnv +
        rightElbowForwardYSign * 0.28 * Math.max(0, 1 - waveBlend - introSelfEnv - happyClaspEnv);
      const activeElbowY =
        act1ElbowY * (1 - toBeckon) +
        beckonElbowY * beckonBlend +
        walkElbowY * walkArmsWeight +
        rightElbowForwardYSign * 0.28 * Math.max(0, toBeckon - beckonBlend - walkArmsWeight);
      const targetElbowY = THREE.MathUtils.lerp(rightElbowForwardYSign * 0.2, activeElbowY, raiseEnv);

      const waveElbowX = rightPalmForwardXSign * 0.98 + waveForearm * 0.08;
      const selfElbowX = rightPalmForwardXSign * 1.04;
      const claspElbowX = rightPalmForwardXSign * 0.78;
      const beckonElbowX = rightPalmForwardXSign * 0.95;
      const act1ElbowX =
        waveElbowX * waveBlend + selfElbowX * introSelfEnv + claspElbowX * happyClaspEnv;
      const targetElbowX =
        (act1ElbowX * (1 - toBeckon) + beckonElbowX * beckonBlend + rightPalmForwardXSign * 0.08 * walkArmsWeight) *
        raiseEnv;

      const waveElbowZ = waveForearm * 0.14;
      const beckonElbowZ = (pullElbow - 0.5) * 0.18;
      const targetElbowZ = (waveElbowZ * waveBlend + beckonElbowZ * beckonBlend) * raiseEnv;

      rightLowerArm.rotation.y = THREE.MathUtils.lerp(
        rightLowerArm.rotation.y,
        targetElbowY,
        fastDamp
      );
      rightLowerArm.rotation.x = THREE.MathUtils.lerp(
        rightLowerArm.rotation.x,
        targetElbowX,
        fastDamp
      );
      rightLowerArm.rotation.z = THREE.MathUtils.lerp(
        rightLowerArm.rotation.z,
        targetElbowZ,
        fastDamp
      );

      // Wrist aligned so palm faces the camera cleanly, with expressive wave & beckon flexion
      if (rightHand) {
        const waveWristY = waveWrist * 0.44;
        const selfWristY = -0.14;
        const claspWristY = 0.14;
        const beckonWristY = (pullWrist - 0.5) * 0.30;
        const targetWristY =
          (waveWristY * waveBlend +
            selfWristY * introSelfEnv +
            claspWristY * happyClaspEnv +
            beckonWristY * beckonBlend) *
          raiseEnv;

        const waveWristZ = -rightCurlSign * 0.12;
        const selfWristZ = -rightCurlSign * 0.10;
        const claspWristZ = rightCurlSign * 0.18;
        const beckonWristZ = rightCurlSign * (-0.22 + pullWrist * 0.76);
        const walkWristZ = rightCurlSign * 0.14;
        const targetWristZ =
          (waveWristZ * waveBlend +
            selfWristZ * introSelfEnv +
            claspWristZ * happyClaspEnv +
            beckonWristZ * beckonBlend +
            walkWristZ * walkArmsWeight) *
          raiseEnv;

        const waveWristX = rightPalmForwardXSign * 0.32 + waveWrist * 0.12;
        const selfWristX = rightPalmForwardXSign * 0.24;
        const claspWristX = rightPalmForwardXSign * 0.16;
        const beckonWristX = rightPalmForwardXSign * 0.26;
        const targetWristX =
          (waveWristX * waveBlend +
            selfWristX * introSelfEnv +
            claspWristX * happyClaspEnv +
            beckonWristX * beckonBlend) *
          raiseEnv;

        rightHand.rotation.y = THREE.MathUtils.lerp(rightHand.rotation.y, targetWristY, fastDamp);
        rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, targetWristZ, fastDamp);
        rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, targetWristX, fastDamp);
      }

      // Fingers blended continuously: open wave ripple -> soft chest curl -> excited clasp -> beckon curl -> walk
      for (const f of rightFingerBones) {
        const waveRipple = rightCurlSign * (0.04 + Math.sin(wavePhase - 0.8 - f.fingerIdx * 0.32) * 0.05);
        const selfCurl = rightCurlSign * (0.36 + f.fingerIdx * 0.055);
        const claspCurl = rightCurlSign * (0.48 + f.fingerIdx * 0.06);
        const fingerPull = Math.sin(beckonPhase - 0.92 - f.fingerIdx * 0.14) * 0.5 + 0.5;
        const beckonCurl = rightCurlSign * (0.06 + fingerPull * 0.64 + f.fingerIdx * 0.035);
        const walkCurl = rightCurlSign * (0.30 + f.fingerIdx * 0.045);
        const restWeight = Math.max(
          0,
          1 - waveBlend - introSelfEnv - happyClaspEnv - beckonBlend - walkArmsWeight
        );
        const targetFingerZ =
          waveRipple * waveBlend +
          selfCurl * introSelfEnv +
          claspCurl * happyClaspEnv +
          beckonCurl * beckonBlend +
          walkCurl * walkArmsWeight +
          rightCurlSign * (0.14 + f.fingerIdx * 0.03) * restWeight;
        f.bone.rotation.z = THREE.MathUtils.lerp(f.bone.rotation.z, targetFingerZ, fastDamp);
      }
      if (rightThumbProximal) {
        const thumbY = -0.18 * waveBlend + (-0.12 + pullFingers * 0.28) * beckonBlend;
        const thumbZ = 0.08 * waveBlend + rightCurlSign * pullFingers * 0.22 * beckonBlend;
        rightThumbProximal.rotation.y = THREE.MathUtils.lerp(
          rightThumbProximal.rotation.y,
          thumbY,
          fastDamp
        );
        rightThumbProximal.rotation.z = THREE.MathUtils.lerp(
          rightThumbProximal.rotation.z,
          thumbZ,
          fastDamp
        );
      }
      if (rightThumbIntermediate) {
        rightThumbIntermediate.rotation.y = THREE.MathUtils.lerp(
          rightThumbIntermediate.rotation.y,
          pullFingers * 0.25 * beckonBlend,
          fastDamp
        );
      }
    }

    // 5) Full Lower-Body Articulation: smooth transition from contrapposto weight shift to exact StylizedWalk gait
    if (leftUpperLeg && rightUpperLeg && leftLowerLeg && rightLowerLeg) {
      const weightShift = Math.sin(introTime * 2.5);

      const idleLUX = thighForwardXSign * (-0.04 + weightShift * 0.03);
      const idleRUX = thighForwardXSign * (0.04 - weightShift * 0.03);
      const walkLUX = thighForwardXSign * walkPose.leftThighX;
      const walkRUX = thighForwardXSign * walkPose.rightThighX;

      leftUpperLeg.rotation.x = THREE.MathUtils.lerp(
        leftUpperLeg.rotation.x,
        THREE.MathUtils.lerp(idleLUX, walkLUX, walkWeight),
        damp
      );
      rightUpperLeg.rotation.x = THREE.MathUtils.lerp(
        rightUpperLeg.rotation.x,
        THREE.MathUtils.lerp(idleRUX, walkRUX, walkWeight),
        damp
      );
      leftUpperLeg.rotation.y = THREE.MathUtils.lerp(
        leftUpperLeg.rotation.y,
        -walkPose.hipsRotY * 0.85 * walkWeight,
        damp
      );
      rightUpperLeg.rotation.y = THREE.MathUtils.lerp(
        rightUpperLeg.rotation.y,
        -walkPose.hipsRotY * 0.85 * walkWeight,
        damp
      );
      leftUpperLeg.rotation.z = THREE.MathUtils.lerp(
        leftUpperLeg.rotation.z,
        THREE.MathUtils.lerp(-0.025, leftThighInwardZSign * walkPose.leftThighZ, walkWeight),
        damp
      );
      rightUpperLeg.rotation.z = THREE.MathUtils.lerp(
        rightUpperLeg.rotation.z,
        THREE.MathUtils.lerp(0.025, rightThighInwardZSign * walkPose.rightThighZ, walkWeight),
        damp
      );

      const idleLLX = kneeBackXSign * (0.06 + Math.max(0, weightShift) * 0.06);
      const idleRLX = kneeBackXSign * (0.06 + Math.max(0, -weightShift) * 0.06);
      const walkLLX = kneeBackXSign * walkPose.leftKneeX;
      const walkRLX = kneeBackXSign * walkPose.rightKneeX;

      leftLowerLeg.rotation.x = THREE.MathUtils.lerp(
        leftLowerLeg.rotation.x,
        THREE.MathUtils.lerp(idleLLX, walkLLX, walkWeight),
        damp
      );
      rightLowerLeg.rotation.x = THREE.MathUtils.lerp(
        rightLowerLeg.rotation.x,
        THREE.MathUtils.lerp(idleRLX, walkRLX, walkWeight),
        damp
      );

      if (leftFoot && rightFoot) {
        leftFoot.rotation.x = THREE.MathUtils.lerp(
          leftFoot.rotation.x,
          THREE.MathUtils.lerp(0, ankleDownXSign * walkPose.leftAnkleX, walkWeight),
          damp
        );
        rightFoot.rotation.x = THREE.MathUtils.lerp(
          rightFoot.rotation.x,
          THREE.MathUtils.lerp(0, ankleDownXSign * walkPose.rightAnkleX, walkWeight),
          damp
        );
      }
      if (leftToes && rightToes) {
        const toeRollL = THREE.MathUtils.lerp(0.04, -Math.max(0, -walkS) * 0.18, walkWeight);
        const toeRollR = THREE.MathUtils.lerp(0.04, -Math.max(0, walkS) * 0.18, walkWeight);
        leftToes.rotation.x = THREE.MathUtils.lerp(leftToes.rotation.x, toeRollL, damp);
        rightToes.rotation.x = THREE.MathUtils.lerp(rightToes.rotation.x, toeRollR, damp);
      }
    }

    // 6) Phoneme-Accurate French Lip-Sync (`aa`, `ih`, `ou`, `ee`, `oh`) & Natural Eye Expressions
    let activeIntroBlink = 0;
    let introMouthQuiet = 1;
    if (vrm.expressionManager) {
      const blinkCycle = introTime % 3.4;
      const blinkWeight =
        blinkCycle > 3.24 ? Math.sin(((blinkCycle - 3.24) / 0.16) * Math.PI) : 0;
      activeIntroBlink = Math.max(0, Math.min(1, blinkWeight));
      vrm.expressionManager.setValue('blink', activeIntroBlink);

      const targetVisemes = sampleIntroVisemes(introTime);
      let totalVisemeEnergy = 0;
      for (const vk of ['aa', 'ih', 'ou', 'ee', 'oh'] as VisemeKey[]) {
        currentVisemes[vk] = THREE.MathUtils.lerp(
          currentVisemes[vk],
          targetVisemes[vk],
          visemeDamp
        );
        vrm.expressionManager.setValue(vk, currentVisemes[vk]);
        totalVisemeEnergy += currentVisemes[vk];
      }

      // Keep 'happy' (Fcl_ALL_Joy) at 0 so it never stacks over vowel visemes or squints the eyes.
      vrm.expressionManager.setValue('happy', 0);
      introMouthQuiet = Math.max(0, 1 - totalVisemeEnergy * 3.5);
    }

    ensureBlushSprites();
    if (blushLeftMat && blushRightMat) {
      blushLeftMat.opacity = THREE.MathUtils.lerp(blushLeftMat.opacity, 0.24, damp);
      blushRightMat.opacity = blushLeftMat.opacity;
    }

    vrm.update(safeDt);

    // Apply expressive eyebrows, open clear eyes (brief warm squint only on pause smiles),
    // and gentle mouth-corner smile only when not speaking so vowel visemes never deform.
    const introEyesClosed = activeIntroBlink > 0.65;
    const excitedBurst =
      (introTime < 1.2 || (introTime >= 6.2 && introTime < 7.3)) ? 0.32 : 0;
    const briefEyeSmile =
      smoothstep(5.15, 5.4, introTime) * (1 - smoothstep(5.9, 6.2, introTime)) +
      smoothstep(11.35, 11.65, introTime);
    for (const entry of faceMorphTargets) {
      if (entry.isEyeInterior) {
        entry.mesh.visible = !introEyesClosed;
      }
      const dict = entry.dict;
      const inf = entry.influences;
      if (!inf.length) continue;
      const brwJoyIdx = dict['Fcl_BRW_Joy'];
      const brwSurpIdx = dict['Fcl_BRW_Surprised'];
      const eyeFunIdx = dict['Fcl_EYE_Fun'];
      const eyeIrisHideIdx = dict['Fcl_EYE_Iris_Hide'];
      const eyeHighlightHideIdx = dict['Fcl_EYE_Highlight_Hide'];
      const mthFunIdx = dict['Fcl_MTH_Fun'];
      if (brwJoyIdx !== undefined) inf[brwJoyIdx] = 0.65;
      if (brwSurpIdx !== undefined) inf[brwSurpIdx] = excitedBurst;
      if (eyeIrisHideIdx !== undefined) inf[eyeIrisHideIdx] = introEyesClosed ? 1 : 0;
      if (eyeHighlightHideIdx !== undefined) inf[eyeHighlightHideIdx] = introEyesClosed ? 1 : 0;
      if (eyeFunIdx !== undefined) {
        inf[eyeFunIdx] = Math.min(0.22, briefEyeSmile * 0.22) * (1 - activeIntroBlink * 0.85);
      }
      if (mthFunIdx !== undefined) {
        inf[mthFunIdx] = 0.16 * introMouthQuiet;
      }
    }

    const clothSmoothAlpha = 1 - Math.exp(-10 * safeDt);
    for (const tj of tunedJoints) {
      const bone = tj.joint.bone as THREE.Object3D;
      _clampedQuat.copy(bone.quaternion);
      const angle = tj.restQuat.angleTo(_clampedQuat);
      if (angle > tj.maxAngleRad && angle > 0.0001) {
        const allowedFraction = tj.maxAngleRad / angle;
        _clampedQuat.copy(tj.restQuat).slerp(bone.quaternion, allowedFraction);
      }
      if (tj.isDressOrSkirt) {
        if (tj.joint._prevTail && tj.joint._currentTail) {
          tj.joint._prevTail.lerp(tj.joint._currentTail, 0.82);
        }
        tj.smoothedQuat.slerp(_clampedQuat, clothSmoothAlpha);
        bone.quaternion.copy(tj.smoothedQuat);
      } else {
        bone.quaternion.copy(_clampedQuat);
      }
      bone.updateMatrix();
    }

    if (bundledSkirtDrape) {
      bundledSkirtDrape.rotation.x = THREE.MathUtils.lerp(
        bundledSkirtDrape.rotation.x,
        Math.sin(introTime * 3.6) * 0.022,
        clothSmoothAlpha
      );
      bundledSkirtDrape.rotation.z = THREE.MathUtils.lerp(
        bundledSkirtDrape.rotation.z,
        Math.cos(introTime * 2.7) * 0.018,
        clothSmoothAlpha
      );
      bundledSkirtDrape.updateMatrix();
    }
  };

  // Run one initial tick so Florie is immediately in a natural idle pose (no T-pose flash)
  update('idle', 0, 0, 0.016);

  return {
    vrm,
    container,
    sourceLabel,
    update,
    updateIntroCutscene,
    setNpcDialogueVisuals,
    setCutsceneOverride,
  };
}
