import * as THREE from 'three';
import type { AnimState } from './PlayerAnimations';

export interface StylizedGaitBlendState {
  elapsedAccum: number;
  moveWeight: number;
  runWeight: number;
  climbWeight: number;
  descendWeight: number;
  airWeight: number;
  idleRestTimer: number;
  idleRestTarget: number;
  idleIndex: number;
  idleEmoteTimer: number;
  idleEmoteDuration: number;
}

export function createStylizedGaitBlendState(): StylizedGaitBlendState {
  return {
    elapsedAccum: 0,
    moveWeight: 0,
    runWeight: 0,
    climbWeight: 0,
    descendWeight: 0,
    airWeight: 0,
    idleRestTimer: 0,
    idleRestTarget: 1.5,
    idleIndex: 0,
    idleEmoteTimer: -1,
    idleEmoteDuration: 4.5,
  };
}

export type StairLocomotionMode = 'flat' | 'climb' | 'descend';

export interface StairLocomotionTracker {
  smoothedSlope: number;
  netClimbY: number;
  holdTimer: number;
  mode: StairLocomotionMode;
}

export function createStairLocomotionTracker(): StairLocomotionTracker {
  return {
    smoothedSlope: 0,
    netClimbY: 0,
    holdTimer: 0,
    mode: 'flat',
  };
}

export function resetStairLocomotionTracker(tracker: StairLocomotionTracker): void {
  tracker.smoothedSlope = 0;
  tracker.netClimbY = 0;
  tracker.holdTimer = 0;
  tracker.mode = 'flat';
}

/**
 * Tracks smoothed elevation gain/slope across discrete stair steps so neither single small bumps
 * (0.03m carpets) nor flat treads between risers flicker the climb/descend stair animation.
 */
export function updateStairLocomotion(
  tracker: StairLocomotionTracker,
  horizDist: number,
  dy: number,
  isGrounded: boolean,
  isMoving: boolean,
  dt: number
): StairLocomotionMode {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.1);
  if (!isGrounded || !isMoving || horizDist <= 0.0008) {
    tracker.smoothedSlope = THREE.MathUtils.damp(tracker.smoothedSlope, 0, 8, safeDt);
    tracker.netClimbY *= Math.exp(-4.0 * safeDt);
    tracker.holdTimer = Math.max(0, tracker.holdTimer - safeDt * 1.6);
    if (tracker.holdTimer <= 0) {
      tracker.mode = 'flat';
    }
    return 'flat';
  }

  // Ignore extreme teleportation/respawn vertical discontinuities
  const clampedDy = Math.abs(dy) < 0.35 ? dy : 0;
  const instSlope = THREE.MathUtils.clamp(clampedDy / Math.max(horizDist, 0.003), -1.6, 1.6);
  tracker.smoothedSlope = THREE.MathUtils.damp(tracker.smoothedSlope, instSlope, 9.0, safeDt);
  tracker.netClimbY = tracker.netClimbY * Math.exp(-2.6 * safeDt) + clampedDy;

  if (tracker.netClimbY >= 0.14 && tracker.smoothedSlope >= 0.22) {
    tracker.mode = 'climb';
    tracker.holdTimer = 0.34;
  } else if (tracker.netClimbY <= -0.14 && tracker.smoothedSlope <= -0.22) {
    tracker.mode = 'descend';
    tracker.holdTimer = 0.34;
  } else if (tracker.mode === 'climb' && clampedDy > 0.025) {
    tracker.holdTimer = 0.34;
  } else if (tracker.mode === 'descend' && clampedDy < -0.025) {
    tracker.holdTimer = 0.34;
  } else {
    tracker.holdTimer = Math.max(0, tracker.holdTimer - safeDt);
    if (tracker.holdTimer <= 0) {
      tracker.mode = 'flat';
    }
  }

  return tracker.mode;
}

/** Normalized target joint angles/offsets for the anime stylized walk, run, idle & jump cycles. */
export interface StylizedGaitPose {
  moveWeight: number;
  runWeight: number;
  airWeight: number;

  hipsOffsetX: number;
  hipsOffsetY: number;
  hipsOffsetZ: number;
  hipsRotX: number;
  hipsRotY: number;
  hipsRotZ: number;

  spineRotX: number;
  spineRotY: number;
  spineRotZ: number;
  chestRotX: number;
  chestRotY: number;
  chestRotZ: number;
  upperChestRotX: number;
  upperChestRotY: number;
  upperChestRotZ: number;

  neckRotX: number;
  neckRotY: number;
  neckRotZ: number;
  headRotX: number;
  headRotY: number;
  headRotZ: number;

  leftThighX: number;
  rightThighX: number;
  leftThighZ: number;
  rightThighZ: number;

  leftKneeX: number;
  rightKneeX: number;
  leftAnkleX: number;
  rightAnkleX: number;
  leftToeX: number;
  rightToeX: number;

  leftShoulderY: number;
  rightShoulderY: number;
  leftShoulderZ: number;
  rightShoulderZ: number;

  leftArmForwardX: number;
  rightArmForwardX: number;
  leftArmAdduction: number;
  rightArmAdduction: number;
  leftArmRotY: number;
  rightArmRotY: number;
  leftArmInward: number;
  rightArmInward: number;

  leftElbowBend: number;
  rightElbowBend: number;
  leftForearmTwist: number;
  rightForearmTwist: number;
  leftWristY: number;
  rightWristY: number;
  leftWristZ: number;
  rightWristZ: number;
  leftWristX: number;
  rightWristX: number;
  leftFingerCurlScale: number;
  rightFingerCurlScale: number;
  leftFistWeight: number;
  rightFistWeight: number;
  leftFingerTap?: [number, number, number, number];
  rightFingerTap?: [number, number, number, number];

  expressionHappy: number;
  expressionEyeSquint: number;
  expressionCuriousBrow: number;
  expressionSoftMouthOpen: number;
  blinkOverride: number;

  idleBreezeX: number;
  idleBreezeZ: number;

  skirtRipplePitch: number;
  skirtRippleRoll: number;
}

export function createEmptyGaitPose(): StylizedGaitPose {
  return {
    moveWeight: 0,
    runWeight: 0,
    airWeight: 0,
    hipsOffsetX: 0,
    hipsOffsetY: 0,
    hipsOffsetZ: 0,
    hipsRotX: 0,
    hipsRotY: 0,
    hipsRotZ: 0,
    spineRotX: 0,
    spineRotY: 0,
    spineRotZ: 0,
    chestRotX: 0,
    chestRotY: 0,
    chestRotZ: 0,
    upperChestRotX: 0,
    upperChestRotY: 0,
    upperChestRotZ: 0,
    neckRotX: 0,
    neckRotY: 0,
    neckRotZ: 0,
    headRotX: 0,
    headRotY: 0,
    headRotZ: 0,
    leftThighX: 0,
    rightThighX: 0,
    leftThighZ: 0,
    rightThighZ: 0,
    leftKneeX: 0,
    rightKneeX: 0,
    leftAnkleX: 0,
    rightAnkleX: 0,
    leftToeX: 0,
    rightToeX: 0,
    leftShoulderY: 0,
    rightShoulderY: 0,
    leftShoulderZ: 0,
    rightShoulderZ: 0,
    leftArmForwardX: 0,
    rightArmForwardX: 0,
    leftArmAdduction: 0,
    rightArmAdduction: 0,
    leftArmRotY: 0,
    rightArmRotY: 0,
    leftArmInward: 0,
    rightArmInward: 0,
    leftElbowBend: 0,
    rightElbowBend: 0,
    leftForearmTwist: 0,
    rightForearmTwist: 0,
    leftWristY: 0,
    rightWristY: 0,
    leftWristZ: 0,
    rightWristZ: 0,
    leftWristX: 0,
    rightWristX: 0,
    leftFingerCurlScale: 1,
    rightFingerCurlScale: 1,
    leftFistWeight: 0,
    rightFistWeight: 0,
    expressionHappy: 0.08,
    expressionEyeSquint: 0,
    expressionCuriousBrow: 0,
    expressionSoftMouthOpen: 0,
    blinkOverride: 0,
    idleBreezeX: 0,
    idleBreezeZ: 0,
    skirtRipplePitch: 0,
    skirtRippleRoll: 0,
  };
}

/**
 * Periodic C1-smooth Catmull-Rom keyframe sampler over u in [0, 1).
 * Ensures seamless looping with zero first/last frame discontinuity.
 */
function sampleCyclic(keys: readonly number[], u: number): number {
  const n = keys.length;
  const wrapped = ((u % 1) + 1) % 1;
  const scaled = wrapped * n;
  const i1 = Math.floor(scaled) % n;
  const t = scaled - Math.floor(scaled);
  const i0 = (i1 - 1 + n) % n;
  const i2 = (i1 + 1) % n;
  const i3 = (i1 + 2) % n;

  const p0 = keys[i0];
  const p1 = keys[i1];
  const p2 = keys[i2];
  const p3 = keys[i3];

  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

// 8 evenly-spaced gait keyframes per cycle (u = 0.000, 0.125, 0.250, 0.375, 0.500, 0.625, 0.750, 0.875)
// Unhurried, graceful walk stride (~0.85m step) without excessive leg spread
const WALK_THIGH_KEYS = [0.50, 0.32, 0.05, -0.22, -0.48, -0.22, 0.18, 0.48];
const WALK_KNEE_KEYS = [0.08, 0.18, 0.09, 0.08, 0.28, 0.76, 0.72, 0.25];
// + = toes down (plantarflex), - = heel down / toes up (dorsiflex), 0 = flat sole on ground
const WALK_ANKLE_KEYS = [-0.14, 0.01, 0.0, 0.03, 0.22, 0.14, -0.04, -0.14];
const WALK_TOE_KEYS = [0.0, 0.0, 0.0, 0.03, 0.18, 0.07, 0.0, 0.0];

// Gentle, poised vertical hip flow for walk (lowest at contact, highest at midstance)
const HIPS_BOB_KEYS = [-0.014, -0.005, 0.009, 0.0, -0.014, -0.005, 0.009, 0.0];

// Fluid, springy anime running cycle with cushioned midfoot landing, athletic knee-fold recovery & airborne flight arc
const RUN_THIGH_KEYS = [0.56, 0.24, -0.18, -0.50, -0.18, 0.38, 0.76, 0.70];
const RUN_KNEE_KEYS = [0.34, 0.56, 0.24, 0.58, 1.42, 1.48, 0.86, 0.42];
const RUN_ANKLE_KEYS = [-0.04, -0.14, 0.16, 0.42, 0.22, 0.04, -0.04, -0.06];
const RUN_TOE_KEYS = [0.0, 0.0, 0.22, 0.18, 0.04, 0.0, 0.0, 0.0];
// Elastic running bounce: lowest on midstance absorption (u=0.125/0.625), highest at airborne flight apex (u=0.375/0.875)
const RUN_HIPS_BOB_KEYS = [-0.015, -0.046, -0.004, 0.036, -0.015, -0.046, -0.004, 0.036];

// Stair climbing gait: high knee lift onto each riser, firm push-up extension & pronounced step-up bob
const CLIMB_THIGH_KEYS = [0.94, 0.56, 0.16, -0.16, -0.18, 0.28, 0.86, 1.02];
const CLIMB_KNEE_KEYS = [0.74, 0.36, 0.14, 0.24, 0.86, 1.48, 1.38, 0.98];
const CLIMB_ANKLE_KEYS = [-0.20, -0.02, 0.04, 0.20, 0.16, -0.18, -0.24, -0.22];
const CLIMB_TOE_KEYS = [0.0, 0.0, 0.0, 0.14, 0.20, 0.06, 0.0, 0.0];
const CLIMB_HIPS_BOB_KEYS = [-0.018, 0.014, 0.028, 0.008, -0.018, 0.014, 0.028, 0.008];

// Stair descending gait: cushioned knee absorption & controlled toe-first step-down
const DESCEND_THIGH_KEYS = [0.42, 0.26, 0.08, -0.14, -0.20, 0.04, 0.30, 0.44];
const DESCEND_KNEE_KEYS = [0.42, 0.62, 0.48, 0.38, 0.72, 1.06, 0.92, 0.54];
const DESCEND_ANKLE_KEYS = [0.24, 0.08, -0.02, 0.08, 0.22, 0.24, 0.22, 0.26];
const DESCEND_TOE_KEYS = [0.10, 0.0, 0.0, 0.06, 0.12, 0.08, 0.08, 0.12];
const DESCEND_HIPS_BOB_KEYS = [-0.026, -0.012, 0.006, -0.006, -0.026, -0.012, 0.006, -0.006];

// 6 Expressive Anime Idle Vignettes (durations in seconds):
// 0: Lumine-style high overhead stretch   1: Hair tuck & warm smile   2: Curious gaze & hand near chin
// 3: Poised clasp & joyful bounce         4: Horizon contemplation      5: Playful contrapposto sway
const IDLE_DURATIONS = [5.0, 4.6, 4.4, 4.2, 4.8, 4.5] as const;

function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function envelopeInHoldOut(p: number, inEnd = 0.22, outStart = 0.78): number {
  return smootherstep(0, inEnd, p) * (1 - smootherstep(outStart, 1, p));
}

function applyExpressiveIdleLayer(
  idleId: number,
  p: number,
  idlePresence: number,
  out: StylizedGaitPose
): void {
  const env = envelopeInHoldOut(p, 0.2, 0.78) * idlePresence;
  if (env <= 0.0005 && idleId !== 0) return;

  switch (idleId) {
    case 0: {
      // 0: Grand étirement bras hauts (Lumine-style high overhead stretch + tiptoes + side sway + eye/mouth sigh)
      const prep = smootherstep(0.0, 0.12, p) * (1 - smootherstep(0.16, 0.30, p)) * idlePresence;
      const rise = smootherstep(0.08, 0.34, p) * (1 - smootherstep(0.72, 0.96, p)) * idlePresence;
      const peak = smootherstep(0.26, 0.44, p) * (1 - smootherstep(0.64, 0.80, p)) * idlePresence;
      const settleDip = smootherstep(0.74, 0.84, p) * (1 - smootherstep(0.84, 0.96, p)) * idlePresence;
      if (rise <= 0.0005 && prep <= 0.0005 && settleDip <= 0.0005) return;

      const sideStretch =
        Math.sin(Math.min(1, Math.max(0, (p - 0.28) / 0.44)) * Math.PI * 2) * peak;
      // Forward diagonal arc while sweeping lower half so arms lift fluidly in front of torso, opening straight up overhead at peak
      const sweepFwdArc =
        (Math.sin(smootherstep(0.06, 0.36, p) * Math.PI) * 0.42 +
          Math.sin(smootherstep(0.68, 0.96, p) * Math.PI) * 0.34) *
        idlePresence;

      out.hipsOffsetX -= 0.022 * sideStretch;
      out.hipsOffsetY += -0.015 * prep + 0.028 * peak - 0.010 * settleDip;
      out.hipsOffsetZ += 0.026 * peak;
      out.hipsRotX -= 0.055 * peak;
      out.hipsRotZ += 0.036 * sideStretch;

      // Full-body rise onto balls of the feet during stretch peak, then cushioned settle
      out.leftKneeX += 0.13 * prep - 0.03 * peak + 0.08 * settleDip;
      out.rightKneeX += 0.13 * prep - 0.03 * peak + 0.08 * settleDip;
      out.leftAnkleX += 0.18 * peak;
      out.rightAnkleX += 0.18 * peak;
      out.leftToeX += 0.20 * peak;
      out.rightToeX += 0.20 * peak;

      // 5-joint thoracic arch + lateral ribcage stretch
      out.spineRotX -= 0.085 * peak;
      out.chestRotX -= 0.105 * peak;
      out.upperChestRotX -= 0.055 * peak;
      out.neckRotX -= 0.065 * peak;
      out.headRotX -= 0.115 * peak;

      out.spineRotZ += 0.055 * sideStretch;
      out.chestRotZ += 0.075 * sideStretch;
      out.upperChestRotZ += 0.04 * sideStretch;
      out.headRotZ += 0.095 * sideStretch;

      // Clavicles shrug up (+0.26) & upper arms sweep all the way high overhead (Rz = +1.18 -> ~82 deg above horizontal!)
      out.leftShoulderZ += 0.26 * rise - 0.04 * prep;
      out.rightShoulderZ += 0.26 * rise - 0.04 * prep;
      out.leftArmAdduction = THREE.MathUtils.lerp(out.leftArmAdduction, -2.44, rise);
      out.rightArmAdduction = THREE.MathUtils.lerp(out.rightArmAdduction, -2.44, rise);
      out.leftArmForwardX = THREE.MathUtils.lerp(out.leftArmForwardX, sweepFwdArc, rise);
      out.rightArmForwardX = THREE.MathUtils.lerp(out.rightArmForwardX, sweepFwdArc, rise);

      // Softly extend elbows toward sky at peak and close both hands into fists while arms are raised overhead
      const arcElbow = 0.56 * (1 - peak) + 0.22 * peak;
      const fistClosed =
        smootherstep(0.16, 0.34, p) * (1 - smootherstep(0.66, 0.84, p)) * idlePresence;
      out.leftElbowBend = THREE.MathUtils.lerp(out.leftElbowBend, arcElbow, rise);
      out.rightElbowBend = THREE.MathUtils.lerp(out.rightElbowBend, arcElbow, rise);
      out.leftWristZ += 0.12 * peak;
      out.rightWristZ -= 0.12 * peak;
      out.leftWristX -= 0.08 * peak;
      out.rightWristX -= 0.08 * peak;
      out.leftFistWeight = Math.max(out.leftFistWeight, fistClosed);
      out.rightFistWeight = Math.max(out.rightFistWeight, fistClosed);
      out.leftFingerCurlScale = THREE.MathUtils.lerp(out.leftFingerCurlScale, 0.45, rise * (1 - fistClosed));
      out.rightFingerCurlScale = THREE.MathUtils.lerp(out.rightFingerCurlScale, 0.45, rise * (1 - fistClosed));

      // Secondary hair & skirt physics surge
      out.idleBreezeX += 0.042 * sideStretch;
      out.idleBreezeZ -= 0.032 * peak;
      out.skirtRipplePitch += 0.055 * peak;
      out.skirtRippleRoll += 0.048 * sideStretch;

      // Expressive facial sequence: peaceful closed-eye sigh -> refreshed wide smile
      const closeEyes =
        smootherstep(0.24, 0.34, p) * (1 - smootherstep(0.54, 0.64, p)) * idlePresence;
      const yawnSigh =
        smootherstep(0.30, 0.42, p) * (1 - smootherstep(0.52, 0.62, p)) * idlePresence;
      const refreshedSmile =
        smootherstep(0.54, 0.70, p) * (1 - smootherstep(0.86, 0.98, p)) * idlePresence;

      out.blinkOverride = Math.max(out.blinkOverride, closeEyes * 0.92);
      out.expressionEyeSquint = Math.max(out.expressionEyeSquint, 0.68 * refreshedSmile);
      out.expressionSoftMouthOpen = Math.max(out.expressionSoftMouthOpen, 0.22 * yawnSigh);
      out.expressionHappy = Math.max(out.expressionHappy, 0.08 + 0.80 * refreshedSmile);
      break;
    }

    case 1: {
      // 1: Mèche derrière l'oreille & sourire doux (Hair tuck & gentle nod)
      const stroke = Math.sin(Math.max(0, p - 0.22) * Math.PI * 3.6) * 0.14 * env;
      out.hipsOffsetX -= 0.024 * env;
      out.hipsRotZ += 0.032 * env;
      out.hipsRotY += 0.055 * env;

      out.rightThighX += 0.05 * env;
      out.rightKneeX += 0.10 * env;
      out.chestRotY += 0.075 * env;
      out.neckRotZ -= 0.045 * env;
      // Shift arm cleanly outward to the right side so hand strokes beside temple/hair lock without entering the forehead
      out.headRotZ -= 0.15 * env;
      out.headRotY += 0.18 * env;
      out.headRotX += (0.045 + Math.max(0, Math.sin(p * Math.PI * 2.2)) * 0.03) * env;

      out.rightShoulderZ += 0.12 * env;
      out.rightArmForwardX = THREE.MathUtils.lerp(out.rightArmForwardX, 1.22, env);
      out.rightArmAdduction = THREE.MathUtils.lerp(out.rightArmAdduction, -0.84, env);
      out.rightArmInward -= 0.06 * env;
      out.rightElbowBend = THREE.MathUtils.lerp(out.rightElbowBend, 2.12, env) + stroke * 0.4;
      out.rightForearmTwist += 1.62 * env;
      out.rightWristY += 0.04 * env;
      out.rightWristZ += 0.14 * env + stroke;
      out.rightWristX += 0.06 * env;
      out.rightFingerCurlScale = THREE.MathUtils.lerp(out.rightFingerCurlScale, 2.15, env);

      out.idleBreezeX -= 0.02 * env;
      out.skirtRippleRoll += 0.024 * env;
      const shyBlink = smootherstep(0.45, 0.52, p) * (1 - smootherstep(0.56, 0.64, p)) * env;
      out.blinkOverride = Math.max(out.blinkOverride, shyBlink * 0.85);
      out.expressionEyeSquint = Math.max(out.expressionEyeSquint, 0.34 * env);
      out.expressionHappy = Math.max(out.expressionHappy, 0.08 + 0.62 * env);
      break;
    }

    case 2: {
      // 2: Regard curieux alentour & main posée sur la poitrine (paume vers le buste)
      const gazeWave = Math.sin((p - 0.12) * Math.PI * 2.2);
      out.hipsOffsetX -= 0.024 * gazeWave * env;
      out.hipsRotZ += 0.030 * gazeWave * env;
      out.hipsRotY -= 0.085 * gazeWave * env;

      out.spineRotY += 0.085 * gazeWave * env;
      out.chestRotY += 0.145 * gazeWave * env;
      out.headRotY += 0.35 * gazeWave * env;
      out.headRotZ += 0.145 * (0.4 + 0.6 * gazeWave) * env;
      out.headRotX -= 0.065 * env;

      out.leftShoulderY = THREE.MathUtils.lerp(out.leftShoulderY, -0.0925, env);
      out.leftShoulderZ = THREE.MathUtils.lerp(out.leftShoulderZ, 0.05, env);
      out.leftArmForwardX = THREE.MathUtils.lerp(out.leftArmForwardX, 0.15, env);
      out.leftArmAdduction = THREE.MathUtils.lerp(out.leftArmAdduction, -0.49, env);
      out.leftArmInward = THREE.MathUtils.lerp(out.leftArmInward, 0.60, env);
      out.leftElbowBend = THREE.MathUtils.lerp(out.leftElbowBend, 2.22, env);
      out.leftForearmTwist = THREE.MathUtils.lerp(out.leftForearmTwist, 0.97, env);
      out.leftWristX = THREE.MathUtils.lerp(out.leftWristX, -0.14, env);
      out.leftWristY = THREE.MathUtils.lerp(out.leftWristY, 0.38, env);
      out.leftWristZ = THREE.MathUtils.lerp(out.leftWristZ, -0.62, env);
      out.leftFingerCurlScale = THREE.MathUtils.lerp(out.leftFingerCurlScale, 0.72, env);

      out.leftKneeX += 0.09 * Math.max(0, -gazeWave) * env;
      out.rightKneeX += 0.09 * Math.max(0, gazeWave) * env;
      out.idleBreezeX -= 0.026 * gazeWave * env;
      out.skirtRippleRoll += 0.032 * gazeWave * env;

      out.expressionCuriousBrow = Math.max(out.expressionCuriousBrow, 0.72 * env);
      out.expressionSoftMouthOpen = Math.max(out.expressionSoftMouthOpen, 0.11 * Math.max(0, gazeWave) * env);
      out.expressionHappy = Math.max(out.expressionHappy, 0.08 + 0.25 * env);
      break;
    }

    case 3: {
      // 3: Mains jointes & élan joyeux avec petit battement du talon (Cheerful clasp & heel tap)
      const bounce = Math.sin(p * Math.PI * 4) * 0.012 * env;
      const claspPulse = Math.sin(p * Math.PI * 4) * 0.015 * env;
      const headSway = Math.sin(p * Math.PI * 2) * 0.13 * env;
      const heelTap = Math.max(0, Math.sin(p * Math.PI * 4 - 0.4)) * 0.14 * env;

      out.hipsOffsetY += bounce;
      out.leftKneeX += Math.max(0, -bounce * 4.5);
      out.rightKneeX += Math.max(0, -bounce * 4.5) + heelTap * 0.7;
      out.rightAnkleX += heelTap;
      out.hipsRotY += Math.sin(p * Math.PI * 2) * 0.075 * env;
      out.chestRotY -= Math.sin(p * Math.PI * 2) * 0.095 * env;

      out.spineRotX += 0.032 * env;
      out.headRotZ += 0.13 * env + headSway * 0.45;
      out.headRotY += headSway;

      // Cradle right hand smoothly above/into cupped left palm with zero mesh interpenetration
      out.leftShoulderY = THREE.MathUtils.lerp(out.leftShoulderY, -0.09, env);
      out.rightShoulderY = THREE.MathUtils.lerp(out.rightShoulderY, 0.09, env);
      out.leftShoulderZ = THREE.MathUtils.lerp(out.leftShoulderZ, -0.02, env);
      out.rightShoulderZ = THREE.MathUtils.lerp(out.rightShoulderZ, -0.02, env);

      out.leftArmForwardX = THREE.MathUtils.lerp(out.leftArmForwardX, 0.395, env) + claspPulse;
      out.rightArmForwardX = THREE.MathUtils.lerp(out.rightArmForwardX, 0.472, env) + claspPulse;
      out.leftArmAdduction = THREE.MathUtils.lerp(out.leftArmAdduction, 0.195, env);
      out.rightArmAdduction = THREE.MathUtils.lerp(out.rightArmAdduction, 0.155, env);
      out.leftArmInward = THREE.MathUtils.lerp(out.leftArmInward, 0.34, env);
      out.rightArmInward = THREE.MathUtils.lerp(out.rightArmInward, 0.326, env);
      out.leftElbowBend = THREE.MathUtils.lerp(out.leftElbowBend, 1.38, env);
      out.rightElbowBend = THREE.MathUtils.lerp(out.rightElbowBend, 1.52, env);
      out.leftForearmTwist = THREE.MathUtils.lerp(out.leftForearmTwist, 0.90, env);
      out.rightForearmTwist = THREE.MathUtils.lerp(out.rightForearmTwist, -0.22, env);

      out.leftWristX = THREE.MathUtils.lerp(out.leftWristX, 0.05, env);
      out.rightWristX = THREE.MathUtils.lerp(out.rightWristX, 0.04, env);
      out.leftWristY = THREE.MathUtils.lerp(out.leftWristY, -0.16, env);
      out.rightWristY = THREE.MathUtils.lerp(out.rightWristY, 0.22, env);
      out.leftWristZ = THREE.MathUtils.lerp(out.leftWristZ, 0.24, env);
      out.rightWristZ = THREE.MathUtils.lerp(out.rightWristZ, -0.16, env);

      out.leftFingerCurlScale = THREE.MathUtils.lerp(out.leftFingerCurlScale, 1.74, env);
      out.rightFingerCurlScale = THREE.MathUtils.lerp(out.rightFingerCurlScale, 1.63, env);
      out.leftFistWeight = Math.max(out.leftFistWeight, 0.45 * env);
      out.rightFistWeight = Math.max(out.rightFistWeight, 0.38 * env);

      out.skirtRipplePitch += Math.abs(bounce) * 3.8;
      out.expressionEyeSquint = Math.max(out.expressionEyeSquint, 0.78 * env);
      out.expressionHappy = Math.max(out.expressionHappy, 0.08 + 0.84 * env);
      break;
    }

    case 4: {
      // 4: Contemplation de l'horizon & brise dans la robe (Hand shading brow, scanning clouds)
      const scan = Math.sin((p - 0.15) * Math.PI * 1.55);
      out.hipsOffsetX -= 0.026 * env;
      out.hipsRotZ += 0.032 * env;
      out.rightThighX += 0.045 * env;
      out.rightKneeX += 0.095 * env;

      out.spineRotX -= 0.035 * env;
      out.chestRotY += 0.11 * scan * env;
      out.headRotX -= 0.135 * env;
      out.headRotY += 0.28 * scan * env;
      out.headRotZ -= 0.055 * env;

      out.leftArmForwardX = THREE.MathUtils.lerp(out.leftArmForwardX, -0.14, env);
      out.leftArmAdduction = THREE.MathUtils.lerp(out.leftArmAdduction, -0.13, env);
      out.leftArmInward += 0.26 * env;
      out.leftElbowBend = THREE.MathUtils.lerp(out.leftElbowBend, 0.94, env);

      out.rightShoulderZ += 0.11 * env;
      out.rightShoulderY += 0.08 * env;
      out.rightArmForwardX = THREE.MathUtils.lerp(out.rightArmForwardX, 1.44, env);
      out.rightArmAdduction = THREE.MathUtils.lerp(out.rightArmAdduction, -0.25, env);
      out.rightArmInward += 0.36 * env;
      out.rightElbowBend = THREE.MathUtils.lerp(out.rightElbowBend, 1.82, env);
      out.rightForearmTwist -= 0.35 * env;
      out.rightWristX -= 0.14 * env;
      out.rightFingerCurlScale = THREE.MathUtils.lerp(out.rightFingerCurlScale, 0.50, env);

      out.idleBreezeX += Math.sin(p * Math.PI * 5) * 0.022 * env;
      out.skirtRipplePitch += (0.045 + Math.sin(p * Math.PI * 4) * 0.028) * env;
      out.expressionCuriousBrow = Math.max(out.expressionCuriousBrow, 0.32 * env);
      out.expressionHappy = Math.max(out.expressionHappy, 0.08 + 0.44 * env);
      break;
    }

    case 5: {
      // 5: Balancement ludique & détente d'une jambe à l'autre (Playful weight shift & heel poise)
      const sway = Math.sin(p * Math.PI * 2);
      const liftR = Math.max(0, sway);
      const liftL = Math.max(0, -sway);

      out.hipsOffsetX -= 0.036 * sway * env;
      out.hipsOffsetY -= 0.008 * Math.abs(sway) * env;
      out.hipsRotZ += 0.046 * sway * env;
      out.hipsRotY += 0.08 * sway * env;

      out.chestRotY -= 0.10 * sway * env;
      out.chestRotZ -= 0.038 * sway * env;
      out.headRotZ -= 0.115 * sway * env;
      out.headRotY -= 0.165 * sway * env;

      out.rightThighX += 0.11 * liftR * env;
      out.rightKneeX += 0.25 * liftR * env;
      out.rightAnkleX += 0.17 * liftR * env;
      out.rightToeX += 0.15 * liftR * env;

      out.leftThighX += 0.11 * liftL * env;
      out.leftKneeX += 0.25 * liftL * env;
      out.leftAnkleX += 0.17 * liftL * env;
      out.leftToeX += 0.15 * liftL * env;

      out.leftArmForwardX += -0.22 * sway * env;
      out.rightArmForwardX += 0.22 * sway * env;
      out.leftArmAdduction = THREE.MathUtils.lerp(out.leftArmAdduction, 0.01, env);
      out.rightArmAdduction = THREE.MathUtils.lerp(out.rightArmAdduction, 0.01, env);
      out.leftElbowBend = THREE.MathUtils.lerp(out.leftElbowBend, 0.36 + 0.14 * liftR, env);
      out.rightElbowBend = THREE.MathUtils.lerp(out.rightElbowBend, 0.36 + 0.14 * liftL, env);
      out.leftWristZ += 0.15 * sway * env;
      out.rightWristZ += 0.15 * sway * env;

      out.idleBreezeX -= 0.034 * sway * env;
      out.skirtRippleRoll += 0.052 * sway * env;
      out.expressionEyeSquint = Math.max(out.expressionEyeSquint, 0.30 * env);
      out.expressionHappy = Math.max(out.expressionHappy, 0.08 + 0.56 * env);
      break;
    }
  }
}

/**
 * Computes a grounded, heel-to-toe biomechanical anime walk/run/idle pose.
 * Shared by Florie (VRM) now and reusable directly for any Player VRM or humanoid rig later.
 */
export function computeStylizedAnimeGait(
  state: AnimState,
  gaitPhase: number,
  interactTimer: number,
  dt: number,
  blend: StylizedGaitBlendState,
  out: StylizedGaitPose,
  disableIdle = false
): StylizedGaitPose {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
  blend.elapsedAccum += safeDt;

  const targetMove =
    state === 'walk' ||
    state === 'run' ||
    state === 'climb_stairs' ||
    state === 'descend_stairs'
      ? 1
      : 0;
  const targetRun = state === 'run' ? 1 : 0;
  const targetClimb = state === 'climb_stairs' ? 1 : 0;
  const targetDescend = state === 'descend_stairs' ? 1 : 0;
  const targetAir = state === 'jump' ? 1 : 0;

  blend.moveWeight = THREE.MathUtils.damp(blend.moveWeight, targetMove, 10, safeDt);
  blend.runWeight = THREE.MathUtils.damp(blend.runWeight, targetRun, 8.5, safeDt);
  blend.climbWeight = THREE.MathUtils.damp(blend.climbWeight, targetClimb, 10.5, safeDt);
  blend.descendWeight = THREE.MathUtils.damp(blend.descendWeight, targetDescend, 10.5, safeDt);
  blend.airWeight = THREE.MathUtils.damp(blend.airWeight, targetAir, 13, safeDt);

  const mw = blend.moveWeight;
  const rw = blend.runWeight;
  const cw = blend.climbWeight;
  const dw = blend.descendWeight;
  const aw = blend.airWeight;
  const stairSum = cw + dw;
  const flatBlend = stairSum > 1 ? 0 : 1 - stairSum;
  const cNorm = stairSum > 1 ? cw / stairSum : cw;
  const dNorm = stairSum > 1 ? dw / stairSum : dw;
  const tIdle = blend.elapsedAccum;
  const idleWeight = disableIdle ? 0 : 1 - mw;

  if (disableIdle) {
    blend.idleEmoteTimer = -1;
    blend.idleRestTimer = 0;
    if (state === 'idle' && mw < 0.02 && aw < 0.02) {
      Object.assign(out, createEmptyGaitPose());
      out.leftArmAdduction = 0.06;
      out.rightArmAdduction = 0.06;
      out.leftArmForwardX = 0.05;
      out.rightArmForwardX = 0.05;
      out.leftElbowBend = 0.16;
      out.rightElbowBend = 0.16;
      out.leftFingerCurlScale = 0.22;
      out.rightFingerCurlScale = 0.22;
      out.expressionHappy = 0;
      return out;
    }
  }

  // Advance expressive idle cycle only while grounded & still (resets smoothly when moving)
  if (!disableIdle && state === 'idle' && mw < 0.12 && aw < 0.12 && interactTimer <= 0) {
    if (blend.idleEmoteTimer >= 0) {
      blend.idleEmoteTimer += safeDt;
      if (blend.idleEmoteTimer >= blend.idleEmoteDuration) {
        blend.idleEmoteTimer = -1;
        blend.idleIndex = (blend.idleIndex + 1) % IDLE_DURATIONS.length;
        blend.idleRestTimer = 0;
        blend.idleRestTarget = 1.9 + (blend.idleIndex % 3) * 0.35;
      }
    } else {
      blend.idleRestTimer += safeDt;
      if (blend.idleRestTimer >= blend.idleRestTarget) {
        blend.idleEmoteTimer = 0;
        blend.idleEmoteDuration = IDLE_DURATIONS[blend.idleIndex % IDLE_DURATIONS.length];
      }
    }
  } else if (mw > 0.25 || aw > 0.25 || interactTimer > 0) {
    blend.idleEmoteTimer = -1;
    blend.idleRestTimer = 0;
    blend.idleRestTarget = 1.6;
  }

  out.moveWeight = mw;
  out.runWeight = rw;
  out.airWeight = aw;
  out.hipsRotX = 0;
  out.upperChestRotX = 0;
  out.upperChestRotZ = 0;
  out.neckRotX = 0;
  out.leftArmInward = 0;
  out.rightArmInward = 0;
  out.leftForearmTwist = 0;
  out.rightForearmTwist = 0;
  out.leftWristY = 0;
  out.rightWristY = 0;
  out.leftFingerCurlScale = 1;
  out.rightFingerCurlScale = 1;
  out.leftFistWeight = 0;
  out.rightFistWeight = 0;
  out.leftFingerTap = undefined;
  out.rightFingerTap = undefined;
  out.expressionHappy = rw > 0.25 || interactTimer > 0 ? THREE.MathUtils.lerp(0.08, 0.25, Math.max(rw, interactTimer > 0 ? 1 : 0)) : 0.08;
  out.expressionEyeSquint = 0;
  out.expressionCuriousBrow = 0;
  out.expressionSoftMouthOpen = 0;
  out.blinkOverride = 0;
  out.idleBreezeX = 0;
  out.idleBreezeZ = 0;

  // Normalized cycle u in [0, 1) for Left (uL) and Right (uR = uL + 0.5)
  const INV_TAU = 1 / (Math.PI * 2);
  const uL = ((gaitPhase * INV_TAU) % 1 + 1) % 1;
  const uR = (uL + 0.5) % 1;

  // Gentle breathing only in idle (no lateral sway or head oscillation)
  const idleSway = 0;
  const idleBreath = disableIdle ? 0 : Math.sin(tIdle * 1.65);

  // Smooth trigonometric helpers for upper-body overlapping follow-through
  const cosU = Math.cos(uL * Math.PI * 2); // +1 at uL=0 (L heel-strike), -1 at uL=0.5 (R heel-strike)
  const sinU = Math.sin(uL * Math.PI * 2); // +1 at uL=0.25 (L mid-stance), -1 at uL=0.75 (R mid-stance)
  const sSpineLag = Math.cos((uL - 0.05) * Math.PI * 2);
  const sChestLag = Math.cos((uL - 0.09) * Math.PI * 2);
  const sArmLag = Math.cos((uL - 0.04) * Math.PI * 2);
  const sElbowLag = Math.cos((uL - 0.12) * Math.PI * 2);
  const sWristLag = Math.cos((uL - 0.19) * Math.PI * 2);

  // 1) PELVIS / HIPS: keep feet anchored to ground in idle; float/bounce only during locomotion
  const walkBobY = sampleCyclic(HIPS_BOB_KEYS, uL);
  const runBobY = sampleCyclic(RUN_HIPS_BOB_KEYS, uL);
  const flatBobY = THREE.MathUtils.lerp(walkBobY, runBobY, rw);
  const climbBobY = sampleCyclic(CLIMB_HIPS_BOB_KEYS, uL);
  const descendBobY = sampleCyclic(DESCEND_HIPS_BOB_KEYS, uL);
  const gaitBobY = (flatBobY * flatBlend + climbBobY * cNorm + descendBobY * dNorm) * mw;
  const lateralShiftX = -sinU * THREE.MathUtils.lerp(0.007, 0.006, rw) * mw;

  out.hipsOffsetX = lateralShiftX;
  out.hipsOffsetY = gaitBobY;
  out.hipsOffsetZ =
    mw * (THREE.MathUtils.lerp(0.006, 0.018, rw) * flatBlend + 0.022 * cNorm - 0.006 * dNorm);

  // Smooth axial counter-rotation during gait without swaying/oscillating planted feet in idle
  out.hipsRotY =
    -cosU * (THREE.MathUtils.lerp(0.095, 0.145, rw) * flatBlend + 0.125 * cNorm + 0.075 * dNorm) * mw;
  out.hipsRotZ = sinU * (THREE.MathUtils.lerp(0.018, 0.022, rw) * flatBlend + 0.028 * cNorm + 0.016 * dNorm) * mw;

  // 2) S-CURVE SPINE CASCADE: supple counter-rotation, running lean & stair climb/descend pitch
  const absorbPulse =
    (-Math.sin(uL * Math.PI * 4 - 0.5) * 0.016 * rw +
      Math.sin(uL * Math.PI * 4) * 0.008 * (1 - rw)) *
    mw;
  const forwardLean =
    (THREE.MathUtils.lerp(0.042, 0.155, rw) * flatBlend + 0.18 * cNorm - 0.035 * dNorm) * mw +
    absorbPulse -
    0.035 * aw;
  const breathPitch = idleBreath * 0.014;
  const spineTwistY = sSpineLag * THREE.MathUtils.lerp(0.075, 0.115, rw) * mw;
  const chestTwistY = sChestLag * THREE.MathUtils.lerp(0.085, 0.145, rw) * mw;
  const counterSwayZ =
    -sinU * THREE.MathUtils.lerp(0.012, 0.014, rw) * mw - idleSway * 0.006 * idleWeight;

  out.spineRotX = forwardLean * 0.58 + breathPitch;
  out.spineRotY = spineTwistY * 0.52 - idleSway * 0.008 * idleWeight;
  out.spineRotZ = counterSwayZ * 0.55;

  out.chestRotX = forwardLean * 0.42 + breathPitch * 0.65;
  out.chestRotY = chestTwistY * 0.68;
  out.chestRotZ = counterSwayZ * 0.52;

  out.upperChestRotY = chestTwistY * 0.35;

  // 3) NECK & HEAD: steady gaze stabilization (looks forward up stairs / glances slightly down descending)
  out.neckRotY = -chestTwistY * 0.38;
  out.neckRotZ = -counterSwayZ * 0.45;

  out.headRotX =
    -forwardLean * THREE.MathUtils.lerp(0.52, 0.65, rw) +
    0.11 * dNorm * mw +
    gaitBobY * 0.38 +
    idleBreath * 0.010 * idleWeight;
  out.headRotY = -chestTwistY * 0.45;
  out.headRotZ = sinU * 0.006 * mw;

  // 4) BIOMECHANICAL WALK, RUN & STAIR LEGS (Conventions: +thigh = forward, +knee = backward, +ankle/+toe = down)
  const flatThighL = THREE.MathUtils.lerp(sampleCyclic(WALK_THIGH_KEYS, uL), sampleCyclic(RUN_THIGH_KEYS, uL), rw);
  const flatThighR = THREE.MathUtils.lerp(sampleCyclic(WALK_THIGH_KEYS, uR), sampleCyclic(RUN_THIGH_KEYS, uR), rw);
  const gaitThighL =
    (flatThighL * flatBlend +
      sampleCyclic(CLIMB_THIGH_KEYS, uL) * cNorm +
      sampleCyclic(DESCEND_THIGH_KEYS, uL) * dNorm) *
    mw;
  const gaitThighR =
    (flatThighR * flatBlend +
      sampleCyclic(CLIMB_THIGH_KEYS, uR) * cNorm +
      sampleCyclic(DESCEND_THIGH_KEYS, uR) * dNorm) *
    mw;

  out.leftThighX = THREE.MathUtils.lerp(gaitThighL, 0.44, aw);
  out.rightThighX = THREE.MathUtils.lerp(gaitThighR, -0.24, aw);

  // Subtle inward adduction (positive = toward centerline) so legs stay neatly aligned even at speed
  out.leftThighZ = THREE.MathUtils.lerp(0.022, 0.030, rw) * mw + 0.012 * idleWeight;
  out.rightThighZ = THREE.MathUtils.lerp(0.022, 0.030, rw) * mw + 0.012 * idleWeight;

  const flatKneeL = THREE.MathUtils.lerp(sampleCyclic(WALK_KNEE_KEYS, uL), sampleCyclic(RUN_KNEE_KEYS, uL), rw);
  const flatKneeR = THREE.MathUtils.lerp(sampleCyclic(WALK_KNEE_KEYS, uR), sampleCyclic(RUN_KNEE_KEYS, uR), rw);
  const gaitKneeL =
    Math.max(
      0.06 * mw,
      (flatKneeL * flatBlend +
        sampleCyclic(CLIMB_KNEE_KEYS, uL) * cNorm +
        sampleCyclic(DESCEND_KNEE_KEYS, uL) * dNorm) *
        mw
    ) +
    0.015 * idleWeight;
  const gaitKneeR =
    Math.max(
      0.06 * mw,
      (flatKneeR * flatBlend +
        sampleCyclic(CLIMB_KNEE_KEYS, uR) * cNorm +
        sampleCyclic(DESCEND_KNEE_KEYS, uR) * dNorm) *
        mw
    ) +
    0.015 * idleWeight;

  out.leftKneeX = Math.max(0, THREE.MathUtils.lerp(gaitKneeL, 0.82, aw));
  out.rightKneeX = Math.max(0, THREE.MathUtils.lerp(gaitKneeR, 0.60, aw));

  // Smooth heel-to-toe roll in walk, stair step clearance, and cushioned midfoot-to-ball push-off in run
  const flatAnkleL = THREE.MathUtils.lerp(sampleCyclic(WALK_ANKLE_KEYS, uL), sampleCyclic(RUN_ANKLE_KEYS, uL), rw);
  const flatAnkleR = THREE.MathUtils.lerp(sampleCyclic(WALK_ANKLE_KEYS, uR), sampleCyclic(RUN_ANKLE_KEYS, uR), rw);
  out.leftAnkleX = THREE.MathUtils.lerp(
    (flatAnkleL * flatBlend +
      sampleCyclic(CLIMB_ANKLE_KEYS, uL) * cNorm +
      sampleCyclic(DESCEND_ANKLE_KEYS, uL) * dNorm) *
      mw,
    0.20,
    aw
  );
  out.rightAnkleX = THREE.MathUtils.lerp(
    (flatAnkleR * flatBlend +
      sampleCyclic(CLIMB_ANKLE_KEYS, uR) * cNorm +
      sampleCyclic(DESCEND_ANKLE_KEYS, uR) * dNorm) *
      mw,
    0.16,
    aw
  );

  const flatToeL = THREE.MathUtils.lerp(sampleCyclic(WALK_TOE_KEYS, uL), sampleCyclic(RUN_TOE_KEYS, uL), rw);
  const flatToeR = THREE.MathUtils.lerp(sampleCyclic(WALK_TOE_KEYS, uR), sampleCyclic(RUN_TOE_KEYS, uR), rw);
  out.leftToeX = Math.max(
    0,
    (flatToeL * flatBlend +
      sampleCyclic(CLIMB_TOE_KEYS, uL) * cNorm +
      sampleCyclic(DESCEND_TOE_KEYS, uL) * dNorm) *
      mw
  );
  out.rightToeX = Math.max(
    0,
    (flatToeR * flatBlend +
      sampleCyclic(CLIMB_TOE_KEYS, uR) * cNorm +
      sampleCyclic(DESCEND_TOE_KEYS, uR) * dNorm) *
      mw
  );

  // 5) SHOULDERS, ARMS, FOREARMS & WRISTS (Relaxed walk drape -> stair pump -> supple athletic run swing)
  const armSwingAmp =
    (THREE.MathUtils.lerp(0.26, 0.56, rw) * flatBlend + 0.44 * cNorm + 0.24 * dNorm) * mw;
  const armForwardBias =
    (THREE.MathUtils.lerp(0.035, 0.08, rw) * flatBlend + 0.14 * cNorm + 0.06 * dNorm) * mw +
    0.03 * idleWeight;
  const shoulderRoll = sinU * THREE.MathUtils.lerp(0.022, 0.034, rw) * mw;
  out.leftShoulderY = sArmLag * THREE.MathUtils.lerp(0.045, 0.085, rw) * mw;
  out.rightShoulderY = sArmLag * THREE.MathUtils.lerp(0.045, 0.085, rw) * mw;
  // Semantic shoulder elevation (+ = lift UP, - = relax DOWN)
  out.leftShoulderZ = -0.045 + idleBreath * 0.014 + shoulderRoll;
  out.rightShoulderZ = -0.045 + idleBreath * 0.014 - shoulderRoll;

  const gaitArmLFwd = -sArmLag * armSwingAmp + armForwardBias;
  const gaitArmRFwd = sArmLag * armSwingAmp + armForwardBias;

  out.leftArmForwardX = THREE.MathUtils.lerp(gaitArmLFwd, 0.36, aw);
  out.rightArmForwardX = THREE.MathUtils.lerp(gaitArmRFwd, 0.36, aw);

  const baseAdduction =
    THREE.MathUtils.lerp(0.045, 0.062, rw) +
    0.035 * dNorm * mw +
    idleBreath * 0.014 +
    Math.abs(sArmLag) * THREE.MathUtils.lerp(0.010, 0.018, rw) * mw;
  out.leftArmAdduction = baseAdduction;
  out.rightArmAdduction = baseAdduction;
  out.leftArmRotY = -sArmLag * THREE.MathUtils.lerp(0.11, 0.16, rw) * mw + 0.04 * (1 - rw) * mw;
  out.rightArmRotY = -sArmLag * THREE.MathUtils.lerp(0.11, 0.16, rw) * mw - 0.04 * (1 - rw) * mw;

  // Smooth, un-clamped elbow flex lagging behind shoulder for organic whip/follow-through
  const restElbow = 0.20;
  const swingElbow =
    THREE.MathUtils.lerp(0.24, 1.06, rw) * flatBlend + 0.68 * cNorm + 0.46 * dNorm;
  const dynamicElbowAmp =
    (THREE.MathUtils.lerp(0.11, 0.24, rw) * flatBlend + 0.19 * cNorm + 0.12 * dNorm) * mw;
  const baseElbow = THREE.MathUtils.lerp(restElbow, swingElbow, mw);

  out.leftElbowBend = Math.max(0.10, baseElbow - sElbowLag * dynamicElbowAmp);
  out.rightElbowBend = Math.max(0.10, baseElbow + sElbowLag * dynamicElbowAmp);

  // Soft trailing wrist motion
  out.leftWristZ = sWristLag * THREE.MathUtils.lerp(0.15, 0.22, rw) * mw + idleSway * 0.022 * idleWeight;
  out.rightWristZ = -sWristLag * THREE.MathUtils.lerp(0.15, 0.22, rw) * mw - idleSway * 0.022 * idleWeight;
  out.leftWristX = sinU * THREE.MathUtils.lerp(0.055, 0.09, rw) * mw;
  out.rightWristX = -sinU * THREE.MathUtils.lerp(0.055, 0.09, rw) * mw;

  // 6) Base skirt fabric counter-ripple during locomotion
  out.skirtRipplePitch =
    (Math.sin(uL * Math.PI * 4 - 0.65) * THREE.MathUtils.lerp(0.034, 0.072, rw) +
      THREE.MathUtils.lerp(0.024, 0.088, rw)) *
    mw;
  out.skirtRippleRoll = -cosU * THREE.MathUtils.lerp(0.028, 0.042, rw) * mw;

  // 7) Layer expressive idle choreography seamlessly when standing still
  const reactDuration = 2.4;
  const reactProgress =
    interactTimer > 0
      ? 1 - Math.min(1, Math.max(0, interactTimer / reactDuration))
      : 0;
  const reactEnv =
    interactTimer > 0 ? envelopeInHoldOut(reactProgress, 0.16, 0.84) : 0;

  if (blend.idleEmoteTimer >= 0) {
    const idlePresence = Math.max(0, idleWeight * (1 - aw)) * (1 - reactEnv);
    const p = Math.min(1, blend.idleEmoteTimer / Math.max(0.5, blend.idleEmoteDuration));
    applyExpressiveIdleLayer(blend.idleIndex, p, idlePresence, out);
  }

  // 8) Selection pose: left hand resting on left hip with naturally bent fingers,
  //    slow left-to-right gaze sweep, followed by an approving head nod with a warm smile
  if (reactEnv > 0.0005) {
    const p = reactProgress;

    // Phase 1 (p = 0.06..0.64): slow gaze from left (+1) to right (-1), then back to center
    const lookLeft =
      smootherstep(0.06, 0.24, p) * (1 - smootherstep(0.28, 0.46, p));
    const lookRight =
      smootherstep(0.28, 0.46, p) * (1 - smootherstep(0.52, 0.66, p));
    const gazeSweep = lookLeft - lookRight;

    // Phase 2 (p = 0.62..0.90): clear, supple head nod with a warm smile
    const nodWave =
      smootherstep(0.62, 0.75, p) * (1 - smootherstep(0.76, 0.90, p));
    const smileEnv =
      smootherstep(0.54, 0.68, p) * (1 - smootherstep(0.86, 0.98, p));
    const softBlink =
      smootherstep(0.58, 0.65, p) * (1 - smootherstep(0.66, 0.73, p));

    // Planted contrapposto stance supporting the hand-on-hip posture (no vertical jump)
    out.hipsOffsetX = THREE.MathUtils.lerp(out.hipsOffsetX, -0.012, reactEnv);
    out.hipsRotZ = THREE.MathUtils.lerp(out.hipsRotZ, 0.024, reactEnv);
    out.hipsRotY = THREE.MathUtils.lerp(
      out.hipsRotY,
      -0.035 + 0.02 * gazeSweep,
      reactEnv
    );

    out.leftThighX = THREE.MathUtils.lerp(out.leftThighX, 0.05, reactEnv);
    out.leftKneeX = THREE.MathUtils.lerp(out.leftKneeX, 0.11, reactEnv);
    out.leftAnkleX = THREE.MathUtils.lerp(out.leftAnkleX, -0.04, reactEnv);

    // Supple spine & chest following the slow left-to-right gaze and nod
    out.spineRotX = THREE.MathUtils.lerp(
      out.spineRotX,
      -0.018 + 0.02 * nodWave,
      reactEnv
    );
    out.spineRotY = THREE.MathUtils.lerp(
      out.spineRotY,
      0.025 + 0.035 * gazeSweep,
      reactEnv
    );
    out.spineRotZ = THREE.MathUtils.lerp(out.spineRotZ, -0.016, reactEnv);

    out.chestRotX = THREE.MathUtils.lerp(
      out.chestRotX,
      -0.022 + 0.025 * nodWave,
      reactEnv
    );
    out.chestRotY = THREE.MathUtils.lerp(
      out.chestRotY,
      0.032 + 0.055 * gazeSweep,
      reactEnv
    );
    out.chestRotZ = THREE.MathUtils.lerp(out.chestRotZ, -0.018, reactEnv);

    out.upperChestRotX = THREE.MathUtils.lerp(
      out.upperChestRotX,
      -0.014 + 0.02 * nodWave,
      reactEnv
    );
    out.upperChestRotY = THREE.MathUtils.lerp(
      out.upperChestRotY,
      0.02 + 0.035 * gazeSweep,
      reactEnv
    );

    out.neckRotX = THREE.MathUtils.lerp(
      out.neckRotX,
      0.018 + 0.055 * nodWave,
      reactEnv
    );
    out.neckRotY = THREE.MathUtils.lerp(
      out.neckRotY,
      0.095 * gazeSweep,
      reactEnv
    );
    out.neckRotZ = THREE.MathUtils.lerp(
      out.neckRotZ,
      -0.02 + 0.018 * gazeSweep,
      reactEnv
    );

    out.headRotX = THREE.MathUtils.lerp(
      out.headRotX,
      0.022 + 0.145 * nodWave,
      reactEnv
    );
    out.headRotY = THREE.MathUtils.lerp(
      out.headRotY,
      0.24 * gazeSweep,
      reactEnv
    );
    out.headRotZ = THREE.MathUtils.lerp(
      out.headRotZ,
      -0.045 + 0.04 * gazeSweep,
      reactEnv
    );

    // Left arm: hand resting naturally on the left hip with bent fingers wrapping the hip contour
    out.leftShoulderY = THREE.MathUtils.lerp(out.leftShoulderY, -0.05, reactEnv);
    out.leftShoulderZ = THREE.MathUtils.lerp(out.leftShoulderZ, -0.035, reactEnv);
    out.leftArmAdduction = THREE.MathUtils.lerp(out.leftArmAdduction, -0.38, reactEnv);
    out.leftArmForwardX = THREE.MathUtils.lerp(out.leftArmForwardX, 0.35, reactEnv);
    out.leftArmInward = THREE.MathUtils.lerp(out.leftArmInward, -0.80, reactEnv);
    out.leftElbowBend = THREE.MathUtils.lerp(out.leftElbowBend, 1.58, reactEnv);
    out.leftForearmTwist = THREE.MathUtils.lerp(out.leftForearmTwist, 0.45, reactEnv);
    out.leftWristX = THREE.MathUtils.lerp(out.leftWristX, 0.06, reactEnv);
    out.leftWristY = THREE.MathUtils.lerp(out.leftWristY, 0.0, reactEnv);
    out.leftWristZ = THREE.MathUtils.lerp(out.leftWristZ, 0.28, reactEnv);
    out.leftFingerCurlScale = THREE.MathUtils.lerp(
      out.leftFingerCurlScale,
      2.25,
      reactEnv
    );

    // Right arm: relaxed natural poise alongside the body with softly curved fingers
    out.rightShoulderZ = THREE.MathUtils.lerp(out.rightShoulderZ, -0.02, reactEnv);
    out.rightArmForwardX = THREE.MathUtils.lerp(out.rightArmForwardX, 0.06, reactEnv);
    out.rightArmAdduction = THREE.MathUtils.lerp(out.rightArmAdduction, -0.04, reactEnv);
    out.rightArmInward = THREE.MathUtils.lerp(out.rightArmInward, 0.08, reactEnv);
    out.rightElbowBend = THREE.MathUtils.lerp(out.rightElbowBend, 0.26, reactEnv);
    out.rightForearmTwist = THREE.MathUtils.lerp(out.rightForearmTwist, 0.14, reactEnv);
    out.rightWristX = THREE.MathUtils.lerp(out.rightWristX, -0.04, reactEnv);
    out.rightWristY = THREE.MathUtils.lerp(out.rightWristY, -0.06, reactEnv);
    out.rightWristZ = THREE.MathUtils.lerp(out.rightWristZ, 0.08, reactEnv);
    out.rightFingerCurlScale = THREE.MathUtils.lerp(
      out.rightFingerCurlScale,
      1.35,
      reactEnv
    );

    out.blinkOverride = Math.max(out.blinkOverride, softBlink * 0.85 * reactEnv);
    out.expressionHappy = Math.max(
      out.expressionHappy,
      (0.14 + 0.62 * smileEnv) * reactEnv
    );
    out.expressionEyeSquint = Math.max(
      out.expressionEyeSquint,
      (0.08 + 0.38 * smileEnv) * reactEnv
    );
  }

  if (state === 'sit') {
    const br = Math.sin(tIdle * 1.7);
    out.hipsOffsetX = 0;
    out.hipsOffsetY = -0.34;
    out.hipsOffsetZ = -0.02;
    out.hipsRotX = 0;
    out.hipsRotY = 0;
    out.hipsRotZ = 0;
    out.spineRotX = -0.04;
    out.spineRotY = 0;
    out.spineRotZ = 0;
    out.chestRotX = -0.04 + br * 0.015;
    out.chestRotY = 0;
    out.chestRotZ = 0;
    out.headRotX = 0.03 + br * 0.015;
    out.headRotY = Math.sin(tIdle * 0.45) * 0.08;
    out.headRotZ = 0;
    out.leftThighX = 1.45;
    out.rightThighX = 1.45;
    out.leftThighZ = -0.06;
    out.rightThighZ = -0.06;
    out.leftKneeX = 1.38;
    out.rightKneeX = 1.38;
    out.leftAnkleX = 0.06;
    out.rightAnkleX = 0.06;
    // Relaxed arms resting gently on lap / armrests
    out.leftArmForwardX = 0.28;
    out.rightArmForwardX = 0.28;
    out.leftElbowBend = 0.68;
    out.rightElbowBend = 0.68;
    out.leftArmInward = 0.14;
    out.rightArmInward = 0.14;
    out.leftForearmTwist = -0.65;
    out.rightForearmTwist = -0.65;
    out.leftFingerCurlScale = 1.15;
    out.rightFingerCurlScale = 1.15;
    out.expressionHappy = 0.16;
    return out;
  }

  if (state === 'sit_type') {
    const br = Math.sin(tIdle * 1.85);
    // Natural typing burst envelope (3.4s typing, 0.9s brief glance up at monitor/door)
    const cycle = tIdle % 4.3;
    const burstEnv =
      cycle < 3.4
        ? Math.min(1, cycle * 4.0) * Math.min(1, (3.4 - cycle) * 4.0)
        : 0;
    const tp = tIdle * 10.5;
    const tap = (phase: number) =>
      Math.pow(Math.max(0, Math.sin(tp + phase)), 3) * burstEnv;

    const lTap0 = tap(0.0);
    const lTap1 = tap(1.7);
    const lTap2 = tap(3.3);
    const lTap3 = tap(4.9);
    const rTap0 = tap(0.8);
    const rTap1 = tap(2.4);
    const rTap2 = tap(4.1);
    const rTap3 = tap(5.6);

    out.hipsOffsetX = 0;
    out.hipsOffsetY = -0.32;
    out.hipsOffsetZ = -0.04;
    out.hipsRotX = 0;
    out.hipsRotY = 0;
    out.hipsRotZ = 0;
    out.spineRotX = 0.05;
    out.spineRotY = 0;
    out.spineRotZ = 0;
    out.chestRotX = 0.04 + br * 0.015;
    out.chestRotY = 0;
    out.chestRotZ = 0;
    // Glance between keyboard/monitor while typing, then look up toward door during pauses
    out.headRotX = THREE.MathUtils.lerp(0.02, 0.14, burstEnv) + br * 0.012;
    out.headRotY = THREE.MathUtils.lerp(0.04, -0.18, burstEnv);
    out.headRotZ = 0;
    out.leftThighX = 1.48;
    out.rightThighX = 1.48;
    out.leftThighZ = -0.05;
    out.rightThighZ = -0.05;
    out.leftKneeX = 1.42;
    out.rightKneeX = 1.42;
    out.leftAnkleX = 0.05;
    out.rightAnkleX = 0.05;

    // Hands poised cleanly ABOVE the keyboard with subtle typing wrist & forearm motion
    out.leftArmForwardX = 0.65;
    out.rightArmForwardX = 0.65;
    out.leftElbowBend = 1.09 + Math.sin(tp * 0.5) * 0.04 * burstEnv;
    out.rightElbowBend = 1.09 + Math.cos(tp * 0.5) * 0.04 * burstEnv;
    out.leftArmInward = 0.22;
    out.rightArmInward = 0.22;
    out.leftForearmTwist = -1.25;
    out.rightForearmTwist = -1.25;
    out.leftWristX = -0.08 + (lTap0 + lTap1 - lTap2) * 0.06;
    out.rightWristX = -0.08 + (rTap0 + rTap1 - rTap2) * 0.06;
    out.leftFingerCurlScale = 1.18;
    out.rightFingerCurlScale = 1.18;
    out.leftFingerTap = [lTap0, lTap1, lTap2, lTap3];
    out.rightFingerTap = [rTap0, rTap1, rTap2, rTap3];
    out.expressionHappy = 0.14;
    return out;
  }

  return out;
}
