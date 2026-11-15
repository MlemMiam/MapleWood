import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

export type BlenderSitClipName = 'sit_down' | 'sit_idle' | 'stand_up';

export const BLENDER_SIT_DURATIONS: Record<'sit_down' | 'stand_up', number> = {
  sit_down: 1.2,
  stand_up: 1.1333,
};

interface SitAnimFrame {
  rootTravel?: number;
  hipsOffset: [number, number, number];
  quats: Record<string, [number, number, number, number]>;
}

interface SitAnimClip {
  fps: number;
  duration: number;
  frames: SitAnimFrame[];
}

interface SitAnimBundle {
  version: number;
  source: string;
  clips: Record<BlenderSitClipName, SitAnimClip>;
}

let cachedBundle: SitAnimBundle | null = null;
let loadPromise: Promise<SitAnimBundle | null> | null = null;

const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();
const _qSample = new THREE.Quaternion();
const _hipsTarget = new THREE.Vector3();

/** Preload the Blender-authored VRM sitting animation bundle once. */
export function preloadBlenderSitAnim(): Promise<SitAnimBundle | null> {
  if (cachedBundle) return Promise.resolve(cachedBundle);
  if (!loadPromise) {
    loadPromise = fetch('/assets/animations/player_sit.json')
      .then((res) => (res.ok ? (res.json() as Promise<SitAnimBundle>) : null))
      .then((data) => {
        if (data && data.clips) {
          cachedBundle = data;
        }
        return cachedBundle;
      })
      .catch(() => null);
  }
  return loadPromise;
}

export function isBlenderSitAnimReady(): boolean {
  return cachedBundle !== null;
}

/** Sample smooth forward rootTravel (meters in front of sitTargetPos) for Player.position & camera continuity. */
export function sampleSitRootTravel(clipName: BlenderSitClipName, timeSec: number): number {
  if (!cachedBundle) return clipName === 'sit_down' ? 0.85 : 0;
  const clip = cachedBundle.clips[clipName];
  if (!clip || clip.frames.length === 0) return 0;

  const maxIdx = clip.frames.length - 1;
  const duration = Math.max(0.001, clip.duration);
  const t = THREE.MathUtils.clamp(timeSec, 0, duration);
  const exactFrame = t * clip.fps;
  const idx0 = Math.min(maxIdx, Math.floor(exactFrame));
  const idx1 = Math.min(maxIdx, idx0 + 1);
  const alpha = exactFrame - idx0;

  const r0 = clip.frames[idx0].rootTravel ?? 0;
  const r1 = clip.frames[idx1].rootTravel ?? r0;
  return THREE.MathUtils.lerp(r0, r1, alpha);
}

/**
 * Sample and apply a Blender-authored VRM normalized-bone sit animation frame.
 * Returns true if the bundle was ready and applied, false otherwise.
 */
export function applyBlenderSitPose(
  vrm: VRM,
  baseHipsPos: THREE.Vector3,
  clipName: BlenderSitClipName,
  timeSec: number,
  blendWeight: number,
  loop = false
): boolean {
  if (!cachedBundle || !vrm.humanoid) return false;
  const clip = cachedBundle.clips[clipName];
  if (!clip || clip.frames.length === 0) return false;

  const w = THREE.MathUtils.clamp(blendWeight, 0, 1);
  const maxIdx = clip.frames.length - 1;
  const duration = Math.max(0.001, clip.duration);
  const t = loop ? ((timeSec % duration) + duration) % duration : THREE.MathUtils.clamp(timeSec, 0, duration);
  const exactFrame = t * clip.fps;
  const idx0 = Math.min(maxIdx, Math.floor(exactFrame));
  const idx1 = loop ? (idx0 + 1) % clip.frames.length : Math.min(maxIdx, idx0 + 1);
  const alpha = exactFrame - idx0;

  const f0 = clip.frames[idx0];
  const f1 = clip.frames[idx1];

  const hips = vrm.humanoid.getNormalizedBoneNode('hips' as VRMHumanBoneName);
  if (hips) {
    const ox = THREE.MathUtils.lerp(f0.hipsOffset[0], f1.hipsOffset[0], alpha);
    const oy = THREE.MathUtils.lerp(f0.hipsOffset[1], f1.hipsOffset[1], alpha);
    const oz = THREE.MathUtils.lerp(f0.hipsOffset[2], f1.hipsOffset[2], alpha);
    _hipsTarget.set(baseHipsPos.x + ox, baseHipsPos.y + oy, baseHipsPos.z + oz);
    // Always apply hips position directly so Player.position handoffs never lag or pop
    hips.position.copy(_hipsTarget);
  }

  for (const boneName of Object.keys(f0.quats)) {
    const node = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
    const q0Arr = f0.quats[boneName];
    const q1Arr = f1.quats[boneName] ?? q0Arr;
    if (!node || !q0Arr) continue;

    _qA.set(q0Arr[0], q0Arr[1], q0Arr[2], q0Arr[3]);
    _qB.set(q1Arr[0], q1Arr[1], q1Arr[2], q1Arr[3]);
    _qSample.copy(_qA).slerp(_qB, alpha);

    if (w >= 0.999) {
      node.quaternion.copy(_qSample);
    } else {
      node.quaternion.slerp(_qSample, w);
    }
  }

  return true;
}
