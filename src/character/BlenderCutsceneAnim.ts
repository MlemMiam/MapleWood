import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

interface CutsceneAnimFrame {
  hipsOffset: [number, number, number];
  quats: Record<string, [number, number, number, number]>;
}

interface CutsceneAnimClip {
  fps: number;
  duration: number;
  frames: CutsceneAnimFrame[];
}

interface CutsceneAnimBundle {
  version: number;
  source: string;
  clips: {
    inspect_hands?: CutsceneAnimClip;
    florie_arrival?: CutsceneAnimClip;
    florie_push_door?: CutsceneAnimClip;
    florie_embarrassed?: CutsceneAnimClip;
    player_confused_glance?: CutsceneAnimClip;
    helen_drawer_paper?: CutsceneAnimClip;
  };
}

let cachedBundle: CutsceneAnimBundle | null = null;
let loadPromise: Promise<CutsceneAnimBundle | null> | null = null;
let cachedFlorieArrival: CutsceneAnimBundle | null = null;
let florieArrivalPromise: Promise<CutsceneAnimBundle | null> | null = null;
let cachedFloriePushDoor: CutsceneAnimBundle | null = null;
let floriePushDoorPromise: Promise<CutsceneAnimBundle | null> | null = null;
let cachedFlorieEmbarrassed: CutsceneAnimBundle | null = null;
let florieEmbarrassedPromise: Promise<CutsceneAnimBundle | null> | null = null;
let cachedPlayerConfusedGlance: CutsceneAnimBundle | null = null;
let playerConfusedGlancePromise: Promise<CutsceneAnimBundle | null> | null = null;
let cachedHelenDrawerPaper: CutsceneAnimBundle | null = null;
let helenDrawerPaperPromise: Promise<CutsceneAnimBundle | null> | null = null;

const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();
const _qSample = new THREE.Quaternion();
const _hipsTarget = new THREE.Vector3();

/** Preload the Blender-authored VRM hand-inspection animation bundle once. */
export function preloadBlenderInspectHandsAnim(): Promise<CutsceneAnimBundle | null> {
  if (cachedBundle) return Promise.resolve(cachedBundle);
  if (!loadPromise) {
    loadPromise = fetch('/assets/animations/player_inspect_hands.json')
      .then((res) => (res.ok ? (res.json() as Promise<CutsceneAnimBundle>) : null))
      .then((data) => {
        if (data && data.clips?.inspect_hands) {
          cachedBundle = data;
        }
        return cachedBundle;
      })
      .catch(() => null);
  }
  return loadPromise;
}

/** Preload the Blender-authored VRM Florie arrival animation bundle once. */
export function preloadBlenderFlorieArrivalAnim(): Promise<CutsceneAnimBundle | null> {
  if (cachedFlorieArrival) return Promise.resolve(cachedFlorieArrival);
  if (!florieArrivalPromise) {
    florieArrivalPromise = fetch('/assets/animations/florie_arrival.json')
      .then((res) => (res.ok ? (res.json() as Promise<CutsceneAnimBundle>) : null))
      .then((data) => {
        if (data && data.clips?.florie_arrival) {
          cachedFlorieArrival = data;
        }
        return cachedFlorieArrival;
      })
      .catch(() => null);
  }
  return florieArrivalPromise;
}

/** Preload the Blender-authored VRM Florie push-door animation bundle once. */
export function preloadBlenderFloriePushDoorAnim(): Promise<CutsceneAnimBundle | null> {
  if (cachedFloriePushDoor) return Promise.resolve(cachedFloriePushDoor);
  if (!floriePushDoorPromise) {
    floriePushDoorPromise = fetch('/assets/animations/florie_push_door.json')
      .then((res) => (res.ok ? (res.json() as Promise<CutsceneAnimBundle>) : null))
      .then((data) => {
        if (data && data.clips?.florie_push_door) {
          cachedFloriePushDoor = data;
        }
        return cachedFloriePushDoor;
      })
      .catch(() => null);
  }
  return floriePushDoorPromise;
}

/** Preload the Blender-authored VRM Florie embarrassed animation bundle once. */
export function preloadBlenderFlorieEmbarrassedAnim(): Promise<CutsceneAnimBundle | null> {
  if (cachedFlorieEmbarrassed) return Promise.resolve(cachedFlorieEmbarrassed);
  if (!florieEmbarrassedPromise) {
    florieEmbarrassedPromise = fetch('/assets/animations/florie_embarrassed.json')
      .then((res) => (res.ok ? (res.json() as Promise<CutsceneAnimBundle>) : null))
      .then((data) => {
        if (data && data.clips?.florie_embarrassed) {
          cachedFlorieEmbarrassed = data;
        }
        return cachedFlorieEmbarrassed;
      })
      .catch(() => null);
  }
  return florieEmbarrassedPromise;
}

/** Preload the Blender-authored VRM Player confused glance animation bundle once. */
export function preloadBlenderPlayerConfusedGlanceAnim(): Promise<CutsceneAnimBundle | null> {
  if (cachedPlayerConfusedGlance) return Promise.resolve(cachedPlayerConfusedGlance);
  if (!playerConfusedGlancePromise) {
    playerConfusedGlancePromise = fetch('/assets/animations/player_confused_glance.json')
      .then((res) => (res.ok ? (res.json() as Promise<CutsceneAnimBundle>) : null))
      .then((data) => {
        if (data && data.clips?.player_confused_glance) {
          cachedPlayerConfusedGlance = data;
        }
        return cachedPlayerConfusedGlance;
      })
      .catch(() => null);
  }
  return playerConfusedGlancePromise;
}

/** Preload the Blender-authored VRM Helen drawer & paper animation bundle once. */
export function preloadBlenderHelenDrawerPaperAnim(): Promise<CutsceneAnimBundle | null> {
  if (cachedHelenDrawerPaper) return Promise.resolve(cachedHelenDrawerPaper);
  if (!helenDrawerPaperPromise) {
    helenDrawerPaperPromise = fetch('/assets/animations/helen_drawer_paper.json')
      .then((res) => (res.ok ? (res.json() as Promise<CutsceneAnimBundle>) : null))
      .then((data) => {
        if (data && data.clips?.helen_drawer_paper) {
          cachedHelenDrawerPaper = data;
        }
        return cachedHelenDrawerPaper;
      })
      .catch(() => null);
  }
  return helenDrawerPaperPromise;
}

function applyClipFrame(
  clip: CutsceneAnimClip | undefined,
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  timeSec: number,
  blendWeight: number
): boolean {
  if (!clip || clip.frames.length === 0 || !vrm.humanoid) return false;

  const w = THREE.MathUtils.clamp(blendWeight, 0, 1);
  const maxIdx = clip.frames.length - 1;
  const duration = Math.max(0.001, clip.duration);
  const t = THREE.MathUtils.clamp(timeSec, 0, duration);
  const exactFrame = t * clip.fps;
  const idx0 = Math.min(maxIdx, Math.floor(exactFrame));
  const idx1 = Math.min(maxIdx, idx0 + 1);
  const alpha = exactFrame - idx0;

  const f0 = clip.frames[idx0];
  const f1 = clip.frames[idx1];

  const hips = vrm.humanoid.getNormalizedBoneNode('hips' as VRMHumanBoneName);
  if (hips) {
    const ox = THREE.MathUtils.lerp(f0.hipsOffset[0], f1.hipsOffset[0], alpha);
    const oy = THREE.MathUtils.lerp(f0.hipsOffset[1], f1.hipsOffset[1], alpha);
    const oz = THREE.MathUtils.lerp(f0.hipsOffset[2], f1.hipsOffset[2], alpha);
    _hipsTarget.set(baseHipsPos.x + ox, baseHipsPos.y + oy, baseHipsPos.z + oz);
    hips.position.lerp(_hipsTarget, w);
  }

  for (const boneName of Object.keys(f0.quats)) {
    const node = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
    const q0Arr = f0.quats[boneName];
    const q1Arr = f1.quats[boneName] ?? q0Arr;
    if (!node || !q0Arr) continue;

    _qA.set(q0Arr[0], q0Arr[1], q0Arr[2], q0Arr[3]);
    _qB.set(q1Arr[0], q1Arr[1], q1Arr[2], q1Arr[3]);
    _qSample.slerpQuaternions(_qA, _qB, alpha);
    if (w >= 0.999) {
      node.quaternion.copy(_qSample);
    } else {
      node.quaternion.slerp(_qSample, w);
    }
  }

  return true;
}

/**
 * Sample and apply the Blender-authored VRM normalized-bone inspect_hands animation frame.
 */
export function applyBlenderInspectHandsPose(
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  timeSec: number,
  blendWeight = 1
): boolean {
  return applyClipFrame(cachedBundle?.clips.inspect_hands, vrm, baseHipsPos, timeSec, blendWeight);
}

/**
 * Sample and apply the Blender-authored VRM normalized-bone florie_arrival animation frame.
 */
export function applyBlenderFlorieArrivalPose(
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  timeSec: number,
  blendWeight = 1
): boolean {
  return applyClipFrame(cachedFlorieArrival?.clips.florie_arrival, vrm, baseHipsPos, timeSec, blendWeight);
}

/**
 * Sample and apply the Blender-authored VRM normalized-bone florie_push_door animation frame.
 */
export function applyBlenderFloriePushDoorPose(
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  timeSec: number,
  blendWeight = 1
): boolean {
  return applyClipFrame(cachedFloriePushDoor?.clips.florie_push_door, vrm, baseHipsPos, timeSec, blendWeight);
}

/**
 * Sample and apply the Blender-authored VRM normalized-bone florie_embarrassed animation frame.
 */
export function applyBlenderFlorieEmbarrassedPose(
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  timeSec: number,
  blendWeight = 1
): boolean {
  return applyClipFrame(cachedFlorieEmbarrassed?.clips.florie_embarrassed, vrm, baseHipsPos, timeSec, blendWeight);
}

/**
 * Sample and apply the Blender-authored VRM normalized-bone player_confused_glance animation frame.
 */
export function applyBlenderPlayerConfusedGlancePose(
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  timeSec: number,
  blendWeight = 1
): boolean {
  return applyClipFrame(cachedPlayerConfusedGlance?.clips.player_confused_glance, vrm, baseHipsPos, timeSec, blendWeight);
}

/**
 * Sample and apply the Blender-authored VRM normalized-bone helen_drawer_paper animation frame.
 */
export function applyBlenderHelenDrawerPaperPose(
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  timeSec: number,
  blendWeight = 1
): boolean {
  return applyClipFrame(cachedHelenDrawerPaper?.clips.helen_drawer_paper, vrm, baseHipsPos, timeSec, blendWeight);
}
