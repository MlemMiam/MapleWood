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
import type { AnimState } from './PlayerAnimations';

export interface FlorieVRMController {
  vrm: VRM | null;
  container: THREE.Group;
  sourceLabel: string;
  update: (state: AnimState, gaitPhase: number, interactTimer: number, dt: number) => void;
  updateIntroCutscene: (introTime: number, dt: number) => void;
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
    '/Florie.vrm',
    '/assets/models/Florie.vrm',
    '/florie.vrm',
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
      obj.receiveShadow = true;
      obj.frustumCulled = false;
    }
  });

  // Soft radial contact shadow under Florie
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x090d16,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.018;
  container.add(shadowDisc);

  // Resolve VRM humanoid normalized bone nodes for procedural gait & idle animation
  const getBone = (name: VRMHumanBoneName): THREE.Object3D | null =>
    vrm?.humanoid?.getNormalizedBoneNode(name) || null;

  const hips = getBone(VRMHumanBoneName.Hips);
  const spine = getBone(VRMHumanBoneName.Spine);
  const chest = getBone(VRMHumanBoneName.Chest);
  const upperChest = getBone(VRMHumanBoneName.UpperChest);
  const neck = getBone(VRMHumanBoneName.Neck);
  const head = getBone(VRMHumanBoneName.Head);

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

  // Apply natural, softly relaxed finger curl if finger bones exist on the VRM
  const fingerBoneNames: Array<[VRMHumanBoneName, number]> = [
    [VRMHumanBoneName.LeftIndexProximal, -0.18],
    [VRMHumanBoneName.LeftIndexIntermediate, -0.22],
    [VRMHumanBoneName.LeftMiddleProximal, -0.22],
    [VRMHumanBoneName.LeftMiddleIntermediate, -0.25],
    [VRMHumanBoneName.LeftRingProximal, -0.25],
    [VRMHumanBoneName.LeftRingIntermediate, -0.28],
    [VRMHumanBoneName.LeftLittleProximal, -0.28],
    [VRMHumanBoneName.LeftLittleIntermediate, -0.3],
    [VRMHumanBoneName.RightIndexProximal, 0.18],
    [VRMHumanBoneName.RightIndexIntermediate, 0.22],
    [VRMHumanBoneName.RightMiddleProximal, 0.22],
    [VRMHumanBoneName.RightMiddleIntermediate, 0.25],
    [VRMHumanBoneName.RightRingProximal, 0.25],
    [VRMHumanBoneName.RightRingIntermediate, 0.28],
    [VRMHumanBoneName.RightLittleProximal, 0.28],
    [VRMHumanBoneName.RightLittleIntermediate, 0.3],
  ];
  for (const [fName, curlZ] of fingerBoneNames) {
    const fb = getBone(fName);
    if (fb) {
      fb.rotation.z = curlZ;
    }
  }

  const baseHipsPos = hips ? hips.position.clone() : new THREE.Vector3(0, 0.85, 0);

  // Ensure XYZ Euler order on upper arms so Z lowers from T-pose first and X swings forward/back cleanly
  if (leftUpperArm) leftUpperArm.rotation.order = 'XYZ';
  if (rightUpperArm) rightUpperArm.rotation.order = 'XYZ';

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

  let elapsedAccum = 0;
  let moveWeight = 0;
  let runWeight = 0;
  let airWeight = 0;

  const update = (state: AnimState, gaitPhase: number, interactTimer: number, dt: number) => {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
    elapsedAccum += safeDt;

    // Smooth continuous blend weights for transitions between idle, walk, run, and jump
    const targetMove = state === 'walk' || state === 'run' ? 1 : 0;
    const targetRun = state === 'run' ? 1 : 0;
    const targetAir = state === 'jump' ? 1 : 0;

    moveWeight = THREE.MathUtils.damp(moveWeight, targetMove, 10, safeDt);
    runWeight = THREE.MathUtils.damp(runWeight, targetRun, 9, safeDt);
    airWeight = THREE.MathUtils.damp(airWeight, targetAir, 14, safeDt);

    const damp = 1 - Math.exp(-15 * safeDt);

    if (vrm) {
      // Primary & harmonic gait waves (s > 0 => Left leg swings forward, Right leg in stance)
      const s = Math.sin(gaitPhase);
      const c = Math.cos(gaitPhase);
      const s2 = Math.sin(gaitPhase * 2);
      const c2 = Math.cos(gaitPhase * 2);

      // Phase-delayed waves for supple spine, shoulder, and forearm follow-through
      const sSpineLag = Math.sin(gaitPhase - 0.22);
      const sArmLag = Math.sin(gaitPhase - 0.14);
      const sElbowLag = Math.sin(gaitPhase - 0.48);
      const sWristLag = Math.sin(gaitPhase - 0.78);

      // Blend walk vs run amplitudes smoothly
      const legStrideAmp = THREE.MathUtils.lerp(0.45, 0.84, runWeight) * moveWeight;
      const legHarmonicAmp = THREE.MathUtils.lerp(0.055, 0.1, runWeight) * moveWeight;
      const kneeFlexAmp = THREE.MathUtils.lerp(0.64, 1.14, runWeight) * moveWeight;
      const stanceCushionAmp = THREE.MathUtils.lerp(0.13, 0.22, runWeight) * moveWeight;
      const armSwingAmp = THREE.MathUtils.lerp(0.36, 0.74, runWeight) * moveWeight;
      const baseElbowBend = THREE.MathUtils.lerp(
        0.12,
        THREE.MathUtils.lerp(0.22, 0.56, runWeight),
        moveWeight
      );
      const dynamicElbowAmp = THREE.MathUtils.lerp(0.22, 0.44, runWeight) * moveWeight;

      // Vertical double-bounce (peaks at mid-stance twice per stride, dips at heel-strike)
      const walkBobY = (-c2 * 0.5 + 0.5) * THREE.MathUtils.lerp(0.028, 0.06, runWeight) * moveWeight;
      const idleBreathY = Math.sin(elapsedAccum * 2.0) * 0.008 * (1 - moveWeight * 0.7);
      const lateralWeightShiftX = -s * THREE.MathUtils.lerp(0.016, 0.022, runWeight) * moveWeight;

      // Subtle local cloth-center breathing offset so the dress feels a gentle, capped breeze
      springCenter.position.set(
        lateralWeightShiftX * 0.2,
        -walkBobY * 0.18,
        moveWeight * THREE.MathUtils.lerp(0.006, 0.012, runWeight)
      );

      // 1) HIPS / PELVIS (3D weight shift, pelvic list & axial rotation)
      if (hips) {
        const targetHipsX = baseHipsPos.x + lateralWeightShiftX;
        const targetHipsY = baseHipsPos.y + walkBobY + idleBreathY;
        hips.position.x = THREE.MathUtils.lerp(hips.position.x, targetHipsX, damp);
        hips.position.y = THREE.MathUtils.lerp(hips.position.y, targetHipsY, damp);

        const pelvicTwistY =
          -s * THREE.MathUtils.lerp(0.08, 0.13, runWeight) * moveWeight +
          Math.sin(elapsedAccum * 1.1) * 0.02 * (1 - moveWeight);
        const pelvicListZ =
          s * THREE.MathUtils.lerp(0.046, 0.064, runWeight) * moveWeight +
          Math.cos(elapsedAccum * 1.1) * 0.012 * (1 - moveWeight);

        hips.rotation.y = THREE.MathUtils.lerp(hips.rotation.y, pelvicTwistY, damp);
        hips.rotation.z = THREE.MathUtils.lerp(hips.rotation.z, pelvicListZ, damp);
      }

      // 2) SPINE, CHEST & UPPER CHEST (Supple counter-rotation & S-curve balance)
      const forwardLean =
        THREE.MathUtils.lerp(0.032, 0.12, runWeight) * moveWeight +
        s2 * 0.012 * moveWeight -
        0.04 * airWeight;
      const breathPitch = Math.sin(elapsedAccum * 2.0) * 0.014;
      const counterTwistY = sSpineLag * THREE.MathUtils.lerp(0.075, 0.13, runWeight) * moveWeight;
      const counterSwayZ = -s * THREE.MathUtils.lerp(0.032, 0.048, runWeight) * moveWeight;

      if (spine) {
        spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, forwardLean * 0.6 + breathPitch, damp);
        spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, counterTwistY * 0.55, damp);
        spine.rotation.z = THREE.MathUtils.lerp(spine.rotation.z, counterSwayZ * 0.6, damp);
      }

      if (chest) {
        chest.rotation.x = THREE.MathUtils.lerp(chest.rotation.x, forwardLean * 0.4 + breathPitch * 0.6, damp);
        chest.rotation.y = THREE.MathUtils.lerp(chest.rotation.y, counterTwistY * 0.65, damp);
        chest.rotation.z = THREE.MathUtils.lerp(chest.rotation.z, counterSwayZ * 0.5, damp);
      }

      if (upperChest) {
        upperChest.rotation.y = THREE.MathUtils.lerp(upperChest.rotation.y, counterTwistY * 0.35, damp);
      }

      // 3) NECK & HEAD (Gaze stabilization & soft secondary nod)
      if (neck) {
        neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, -counterTwistY * 0.35, damp);
        neck.rotation.z = THREE.MathUtils.lerp(neck.rotation.z, -counterSwayZ * 0.3, damp);
      }

      if (head) {
        const headNodX =
          -forwardLean * 0.45 +
          Math.sin(gaitPhase * 2 - 0.5) * 0.018 * moveWeight +
          Math.sin(elapsedAccum * 1.5) * 0.024 * (1 - moveWeight);
        const headTiltZ =
          s * 0.02 * moveWeight + Math.cos(elapsedAccum * 1.2) * 0.02 * (1 - moveWeight);
        const headTurnY = -counterTwistY * 0.4;

        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, headNodX, damp);
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, headTurnY, damp);
        head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, headTiltZ, damp);
      }

      // 4) LEGS, KNEES, ANKLES & TOES (Anatomical 4-phase gait cycle)
      if (leftUpperLeg && rightUpperLeg) {
        const walkThighL = -s * legStrideAmp - c2 * legHarmonicAmp - 0.03 * moveWeight;
        const walkThighR = s * legStrideAmp - c2 * legHarmonicAmp - 0.03 * moveWeight;

        const targetThighL = THREE.MathUtils.lerp(walkThighL, -0.45, airWeight);
        const targetThighR = THREE.MathUtils.lerp(walkThighR, 0.25, airWeight);

        leftUpperLeg.rotation.x = THREE.MathUtils.lerp(leftUpperLeg.rotation.x, targetThighL, damp);
        rightUpperLeg.rotation.x = THREE.MathUtils.lerp(rightUpperLeg.rotation.x, targetThighR, damp);

        // Subtle feminine hip adduction (feet track naturally along walking line)
        leftUpperLeg.rotation.z = THREE.MathUtils.lerp(
          leftUpperLeg.rotation.z,
          -0.022 * moveWeight + c * 0.015 * moveWeight,
          damp
        );
        rightUpperLeg.rotation.z = THREE.MathUtils.lerp(
          rightUpperLeg.rotation.z,
          0.022 * moveWeight + c * 0.015 * moveWeight,
          damp
        );
      }

      if (leftLowerLeg && rightLowerLeg) {
        // Two-peak POSITIVE knee flexion (anatomical backward bend >= 0)
        const swingWaveL = Math.max(0, Math.sin(gaitPhase - 0.95));
        const cushionWaveL = Math.max(0, Math.sin(gaitPhase - 2.35));
        const walkKneeL =
          Math.pow(swingWaveL, 1.35) * kneeFlexAmp +
          Math.pow(cushionWaveL, 1.6) * stanceCushionAmp +
          0.03;

        const swingWaveR = Math.max(0, Math.sin(gaitPhase + Math.PI - 0.95));
        const cushionWaveR = Math.max(0, Math.sin(gaitPhase + Math.PI - 2.35));
        const walkKneeR =
          Math.pow(swingWaveR, 1.35) * kneeFlexAmp +
          Math.pow(cushionWaveR, 1.6) * stanceCushionAmp +
          0.03;

        const targetKneeL = THREE.MathUtils.lerp(walkKneeL, 0.82, airWeight);
        const targetKneeR = THREE.MathUtils.lerp(walkKneeR, 0.64, airWeight);

        leftLowerLeg.rotation.x = THREE.MathUtils.lerp(
          leftLowerLeg.rotation.x,
          Math.max(0, targetKneeL),
          damp
        );
        rightLowerLeg.rotation.x = THREE.MathUtils.lerp(
          rightLowerLeg.rotation.x,
          Math.max(0, targetKneeR),
          damp
        );
      }

      if (leftFoot && rightFoot) {
        const ankleL =
          (-Math.sin(gaitPhase + 0.35) * 0.22 + Math.cos(gaitPhase * 2) * 0.05) * moveWeight +
          0.25 * airWeight;
        const ankleR =
          (Math.sin(gaitPhase + 0.35) * 0.22 + Math.cos(gaitPhase * 2) * 0.05) * moveWeight +
          0.2 * airWeight;

        leftFoot.rotation.x = THREE.MathUtils.lerp(leftFoot.rotation.x, ankleL, damp);
        rightFoot.rotation.x = THREE.MathUtils.lerp(rightFoot.rotation.x, ankleR, damp);
      }

      if (leftToes && rightToes) {
        const toeL = Math.max(0, -s) * 0.22 * moveWeight;
        const toeR = Math.max(0, s) * 0.22 * moveWeight;
        leftToes.rotation.x = THREE.MathUtils.lerp(leftToes.rotation.x, -toeL, damp);
        rightToes.rotation.x = THREE.MathUtils.lerp(rightToes.rotation.x, -toeR, damp);
      }

      // 5) SHOULDERS, ARMS, FOREARMS & WRISTS (Phase-delayed pendulum opposite to legs)
      if (leftShoulder && rightShoulder) {
        leftShoulder.rotation.y = THREE.MathUtils.lerp(
          leftShoulder.rotation.y,
          sArmLag * 0.045 * moveWeight,
          damp
        );
        rightShoulder.rotation.y = THREE.MathUtils.lerp(
          rightShoulder.rotation.y,
          sArmLag * 0.045 * moveWeight,
          damp
        );
      }

      const idleBreathArm = Math.sin(elapsedAccum * 2.0) * 0.018;
      if (leftUpperArm) {
        leftUpperArm.rotation.z = THREE.MathUtils.lerp(
          leftUpperArm.rotation.z,
          leftArmDownZ + Math.sign(leftArmDownZ) * idleBreathArm,
          damp
        );
        const walkArmLX = sArmLag * armSwingAmp - 0.03 * moveWeight;
        const targetArmLX = THREE.MathUtils.lerp(walkArmLX, -0.42, airWeight);
        leftUpperArm.rotation.x = THREE.MathUtils.lerp(leftUpperArm.rotation.x, targetArmLX, damp);
        leftUpperArm.rotation.y = THREE.MathUtils.lerp(
          leftUpperArm.rotation.y,
          -sArmLag * 0.06 * moveWeight,
          damp
        );
      }

      if (rightUpperArm) {
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(
          rightUpperArm.rotation.z,
          rightArmDownZ + Math.sign(rightArmDownZ) * idleBreathArm,
          damp
        );
        const walkArmRX = -sArmLag * armSwingAmp - 0.03 * moveWeight;
        const targetArmRX =
          interactTimer > 0
            ? -0.95
            : THREE.MathUtils.lerp(walkArmRX, -0.42, airWeight);
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, targetArmRX, damp);
        rightUpperArm.rotation.y = THREE.MathUtils.lerp(
          rightUpperArm.rotation.y,
          -sArmLag * 0.06 * moveWeight,
          damp
        );
      }

      if (leftLowerArm && rightLowerArm) {
        const lFlex =
          baseElbowBend + Math.max(0, -sElbowLag * 0.85 + 0.15) * dynamicElbowAmp;
        const rFlex =
          interactTimer > 0
            ? 0.55
            : baseElbowBend + Math.max(0, sElbowLag * 0.85 + 0.15) * dynamicElbowAmp;

        leftLowerArm.rotation.y = THREE.MathUtils.lerp(leftLowerArm.rotation.y, -lFlex, damp);
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(rightLowerArm.rotation.y, rFlex, damp);
      }

      if (leftHand && rightHand) {
        const wristWaveL = sWristLag * 0.08 * moveWeight;
        const wristWaveR = -sWristLag * 0.08 * moveWeight;
        leftHand.rotation.z = THREE.MathUtils.lerp(leftHand.rotation.z, wristWaveL, damp);
        rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, wristWaveR, damp);
      }

      // 6) Natural periodic eye blinking & lively facial expression via VRM ExpressionManager
      if (vrm.expressionManager) {
        const blinkCycle = elapsedAccum % 3.8;
        let blinkWeight = 0;
        if (blinkCycle > 3.64) {
          blinkWeight = Math.sin(((blinkCycle - 3.64) / 0.16) * Math.PI);
        }
        vrm.expressionManager.setValue('blink', Math.max(0, Math.min(1, blinkWeight)));
        vrm.expressionManager.setValue('happy', state === 'run' || interactTimer > 0 ? 0.35 : 0.12);
      }

      // 7) Advance VRM SpringBones & enforce supple, non-bouncing cloth physics on the dress
      vrm.update(safeDt);

      const clothSmoothAlpha = 1 - Math.exp(-10 * safeDt);
      for (const tj of tunedJoints) {
        const bone = tj.joint.bone as THREE.Object3D;
        _clampedQuat.copy(bone.quaternion);

        // Softly clamp maximum angular deflection from rest pose so the dress never flies far out
        const angle = tj.restQuat.angleTo(_clampedQuat);
        if (angle > tj.maxAngleRad && angle > 0.0001) {
          const allowedFraction = tj.maxAngleRad / angle;
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

      // Add subtle, organic woven-fabric ripple to the bundled skirt drape during locomotion
      if (bundledSkirtDrape) {
        const ripplePitch =
          (Math.sin(gaitPhase * 2 - 0.6) * 0.032 + THREE.MathUtils.lerp(0.025, 0.065, runWeight)) *
          moveWeight;
        const rippleRoll = -s * 0.028 * moveWeight;
        bundledSkirtDrape.rotation.x = THREE.MathUtils.lerp(
          bundledSkirtDrape.rotation.x,
          ripplePitch,
          clothSmoothAlpha
        );
        bundledSkirtDrape.rotation.z = THREE.MathUtils.lerp(
          bundledSkirtDrape.rotation.z,
          rippleRoll,
          clothSmoothAlpha
        );
        bundledSkirtDrape.updateMatrix();
      }
    }
  };

  const updateIntroCutscene = (introTime: number, dt: number) => {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
    elapsedAccum += safeDt;
    const damp = 1 - Math.exp(-12 * safeDt);

    if (!vrm) return;

    const isWavePhase = introTime < 4.8;
    const isBeckonPhase = introTime >= 4.8 && introTime < 8.8;

    const bounceFreq = isWavePhase ? 5.4 : 4.6;
    const bounceAmp = isWavePhase || isBeckonPhase ? 0.026 : 0.008;
    const bounceY = Math.abs(Math.sin(introTime * bounceFreq)) * bounceAmp;
    const swayX = Math.sin(introTime * 2.7) * 0.018;

    springCenter.position.set(swayX * 0.25, -bounceY * 0.2, 0.006);

    if (hips) {
      hips.position.x = THREE.MathUtils.lerp(hips.position.x, baseHipsPos.x + swayX, damp);
      hips.position.y = THREE.MathUtils.lerp(hips.position.y, baseHipsPos.y + bounceY, damp);

      const targetHipsYRot = isBeckonPhase ? 0.42 : Math.sin(introTime * 2.4) * 0.06;
      const targetHipsZRot = isWavePhase ? 0.045 : -0.035;
      hips.rotation.y = THREE.MathUtils.lerp(hips.rotation.y, targetHipsYRot, damp);
      hips.rotation.z = THREE.MathUtils.lerp(hips.rotation.z, targetHipsZRot, damp);
    }

    if (spine) {
      const targetSpineX = isWavePhase ? -0.04 : 0.03;
      const targetSpineY = isBeckonPhase ? 0.22 : Math.sin(introTime * 2.4) * 0.04;
      const targetSpineZ = isWavePhase ? -0.05 : 0.03;
      spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, targetSpineX, damp);
      spine.rotation.y = THREE.MathUtils.lerp(spine.rotation.y, targetSpineY, damp);
      spine.rotation.z = THREE.MathUtils.lerp(spine.rotation.z, targetSpineZ, damp);
    }

    if (chest) {
      const targetChestY = isBeckonPhase ? 0.16 : 0;
      const targetChestZ = isWavePhase ? -0.04 : 0.02;
      chest.rotation.x = THREE.MathUtils.lerp(chest.rotation.x, -0.03, damp);
      chest.rotation.y = THREE.MathUtils.lerp(chest.rotation.y, targetChestY, damp);
      chest.rotation.z = THREE.MathUtils.lerp(chest.rotation.z, targetChestZ, damp);
    }

    if (neck) {
      const targetNeckY = isBeckonPhase ? -0.32 : 0;
      neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, targetNeckY, damp);
      neck.rotation.z = THREE.MathUtils.lerp(neck.rotation.z, isWavePhase ? 0.05 : -0.04, damp);
    }

    if (head) {
      const targetHeadX = isWavePhase
        ? -0.06 + Math.sin(introTime * 5.4) * 0.035
        : -0.04 + Math.sin(introTime * 6.5) * 0.045;
      const targetHeadY = isBeckonPhase ? -0.44 : Math.sin(introTime * 2.0) * 0.05;
      const targetHeadZ = isWavePhase
        ? 0.14 + Math.sin(introTime * 3.2) * 0.04
        : -0.11 + Math.cos(introTime * 3.0) * 0.03;

      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetHeadX, damp);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadY, damp);
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, targetHeadZ, damp);
    }

    if (leftUpperArm) {
      leftUpperArm.rotation.z = THREE.MathUtils.lerp(
        leftUpperArm.rotation.z,
        leftArmDownZ * 0.84,
        damp
      );
      leftUpperArm.rotation.x = THREE.MathUtils.lerp(
        leftUpperArm.rotation.x,
        isWavePhase ? -0.26 : -0.18,
        damp
      );
      leftUpperArm.rotation.y = THREE.MathUtils.lerp(leftUpperArm.rotation.y, 0.12, damp);
    }
    if (leftLowerArm) {
      leftLowerArm.rotation.y = THREE.MathUtils.lerp(
        leftLowerArm.rotation.y,
        isWavePhase ? -0.52 : -0.32,
        damp
      );
    }

    if (rightUpperArm && rightLowerArm) {
      if (isWavePhase) {
        const waveOsc = Math.sin(introTime * 9.6);
        const targetZ = rightArmDownZ * 0.18 + waveOsc * 0.24;
        const targetX = -0.88 + Math.cos(introTime * 4.8) * 0.06;
        const targetY = -0.18;
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, targetZ, damp);
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, targetX, damp);
        rightUpperArm.rotation.y = THREE.MathUtils.lerp(rightUpperArm.rotation.y, targetY, damp);

        const targetElbowY = 0.88 + waveOsc * 0.22;
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(
          rightLowerArm.rotation.y,
          targetElbowY,
          damp
        );
        if (rightHand) {
          rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, waveOsc * 0.36, damp);
          rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, 0, damp);
        }
      } else if (isBeckonPhase) {
        const beckonCycle = (introTime - 4.8) * 7.8;
        const beckonOsc = Math.sin(beckonCycle);
        const beckonPull = Math.max(0, beckonOsc);
        const targetZ = rightArmDownZ * 0.48;
        const targetX = -0.74 - beckonPull * 0.22;
        const targetY = 0.22;
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, targetZ, damp);
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, targetX, damp);
        rightUpperArm.rotation.y = THREE.MathUtils.lerp(rightUpperArm.rotation.y, targetY, damp);

        const targetElbowY = 0.58 + beckonPull * 0.62;
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(
          rightLowerArm.rotation.y,
          targetElbowY,
          damp
        );
        if (rightHand) {
          rightHand.rotation.x = THREE.MathUtils.lerp(
            rightHand.rotation.x,
            beckonOsc * 0.42,
            damp
          );
          rightHand.rotation.z = THREE.MathUtils.lerp(
            rightHand.rotation.z,
            beckonPull * 0.25,
            damp
          );
        }
      } else {
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(
          rightUpperArm.rotation.z,
          rightArmDownZ,
          damp
        );
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, 0, damp);
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(rightLowerArm.rotation.y, 0.15, damp);
      }
    }

    if (leftUpperLeg && rightUpperLeg && leftLowerLeg && rightLowerLeg) {
      const stepOsc = isBeckonPhase ? Math.sin((introTime - 4.8) * 4.6) * 0.18 : 0;
      leftUpperLeg.rotation.x = THREE.MathUtils.lerp(
        leftUpperLeg.rotation.x,
        -0.04 + stepOsc,
        damp
      );
      rightUpperLeg.rotation.x = THREE.MathUtils.lerp(
        rightUpperLeg.rotation.x,
        0.04 - stepOsc,
        damp
      );
      leftLowerLeg.rotation.x = THREE.MathUtils.lerp(
        leftLowerLeg.rotation.x,
        0.06 + Math.max(0, stepOsc) * 0.25,
        damp
      );
      rightLowerLeg.rotation.x = THREE.MathUtils.lerp(
        rightLowerLeg.rotation.x,
        0.06 + Math.max(0, -stepOsc) * 0.25,
        damp
      );
    }

    if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', 0);
      vrm.expressionManager.setValue('happy', 1.0);
      const speakingActive =
        (introTime > 0.35 && introTime < 4.4) || (introTime > 4.9 && introTime < 8.4);
      const mouthOpen = speakingActive
        ? (Math.sin(introTime * 14.5) * 0.5 + 0.5) * 0.55
        : 0.12;
      vrm.expressionManager.setValue('aa', mouthOpen);
    }

    vrm.update(safeDt);

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
  };
}
