import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStylizedAnimeGait,
  createEmptyGaitPose,
  createStairLocomotionTracker,
  createStylizedGaitBlendState,
  resetStairLocomotionTracker,
  updateStairLocomotion,
} from './StylizedWalk';

describe('Stair locomotion detection & stylized gait poses', () => {
  it('ignores single small carpet bumps and stays flat on level ground', () => {
    const tracker = createStairLocomotionTracker();
    const dt = 1 / 60;

    // Single 0.03m bump up then flat level frames
    let mode = updateStairLocomotion(tracker, 0.032, 0.03, true, true, dt);
    assert.equal(mode, 'flat');

    for (let i = 0; i < 60; i++) {
      mode = updateStairLocomotion(tracker, 0.032, 0, true, true, dt);
      assert.equal(mode, 'flat', `Expected flat on frame ${i}, got ${mode}`);
    }
  });

  it('detects climb_stairs across discrete 0.20m risers and flat treads without flickering', () => {
    const tracker = createStairLocomotionTracker();
    const dt = 1 / 60;
    const horiz = 1.95 * dt; // 0.0325m per frame (~0.35m tread every ~11 frames)
    const modes: string[] = [];

    for (let step = 0; step < 6; step++) {
      // Riser frame (+0.20m up over 1-2 autostep frames)
      modes.push(updateStairLocomotion(tracker, horiz, 0.2, true, true, dt));
      // 10 tread frames with 0 vertical change
      for (let f = 0; f < 10; f++) {
        modes.push(updateStairLocomotion(tracker, horiz, 0, true, true, dt));
      }
    }

    assert.ok(modes.includes('climb'), 'Expected stair tracker to enter climb mode');
    const firstClimbIdx = modes.indexOf('climb');
    assert.ok(firstClimbIdx < 24, `Expected climb detection within 2 steps, took ${firstClimbIdx} frames`);
    // Once engaged on continuous stairs, it must not flicker back to flat between steps
    const afterEngage = modes.slice(firstClimbIdx);
    assert.ok(
      afterEngage.every((m) => m === 'climb'),
      `Expected continuous 'climb' mode across treads, got: ${Array.from(new Set(afterEngage)).join(', ')}`
    );

    // Walking on flat floor after exiting stairs returns cleanly to 'flat' within hold window
    for (let i = 0; i < 35; i++) {
      updateStairLocomotion(tracker, horiz, 0, true, true, dt);
    }
    assert.equal(tracker.mode, 'flat');
  });

  it('detects descend_stairs on 0.20m step-downs and resets cleanly on demand', () => {
    const tracker = createStairLocomotionTracker();
    const dt = 1 / 60;
    const horiz = 1.95 * dt;
    const modes: string[] = [];

    for (let step = 0; step < 5; step++) {
      modes.push(updateStairLocomotion(tracker, horiz, -0.2, true, true, dt));
      for (let f = 0; f < 10; f++) {
        modes.push(updateStairLocomotion(tracker, horiz, 0, true, true, dt));
      }
    }

    assert.ok(modes.includes('descend'), 'Expected stair tracker to enter descend mode');
    const firstDescIdx = modes.indexOf('descend');
    const afterEngage = modes.slice(firstDescIdx);
    assert.ok(
      afterEngage.every((m) => m === 'descend'),
      `Expected continuous 'descend' mode across treads, got: ${Array.from(new Set(afterEngage)).join(', ')}`
    );

    resetStairLocomotionTracker(tracker);
    assert.equal(tracker.mode, 'flat');
    assert.equal(tracker.netClimbY, 0);
    assert.equal(tracker.holdTimer, 0);
  });

  it('produces distinct high-knee climb and cushioned descend poses compared to flat walk', () => {
    const samplePeaks = (state: 'walk' | 'climb_stairs' | 'descend_stairs') => {
      const blend = createStylizedGaitBlendState();
      const out = createEmptyGaitPose();
      // Warm up blend weights
      for (let i = 0; i < 45; i++) {
        computeStylizedAnimeGait(state, i * 0.14, 0, 1 / 60, blend, out);
      }

      let maxThigh = -Infinity;
      let minKnee = Infinity;
      let maxKnee = -Infinity;
      let avgSpineX = 0;
      let maxArmFwd = -Infinity;
      const samples = 64;

      for (let i = 0; i < samples; i++) {
        const phase = (i / samples) * Math.PI * 2;
        computeStylizedAnimeGait(state, phase, 0, 1 / 60, blend, out);
        maxThigh = Math.max(maxThigh, out.leftThighX, out.rightThighX);
        minKnee = Math.min(minKnee, out.leftKneeX, out.rightKneeX);
        maxKnee = Math.max(maxKnee, out.leftKneeX, out.rightKneeX);
        avgSpineX += out.spineRotX / samples;
        maxArmFwd = Math.max(maxArmFwd, out.leftArmForwardX, out.rightArmForwardX);
      }

      return { maxThigh, minKnee, maxKnee, avgSpineX, maxArmFwd };
    };

    const walk = samplePeaks('walk');
    const climb = samplePeaks('climb_stairs');
    const descend = samplePeaks('descend_stairs');

    // Climb should lift knees noticeably higher, fold knees deeper, lean torso forward, and pump arms more
    assert.ok(
      climb.maxThigh > walk.maxThigh + 0.35,
      `Climb maxThigh (${climb.maxThigh.toFixed(2)}) should exceed walk (${walk.maxThigh.toFixed(2)})`
    );
    assert.ok(
      climb.maxKnee > walk.maxKnee + 0.35,
      `Climb maxKnee (${climb.maxKnee.toFixed(2)}) should exceed walk (${walk.maxKnee.toFixed(2)})`
    );
    assert.ok(
      climb.avgSpineX > walk.avgSpineX + 0.06,
      `Climb forward spine lean (${climb.avgSpineX.toFixed(2)}) should exceed walk (${walk.avgSpineX.toFixed(2)})`
    );
    assert.ok(
      climb.maxArmFwd > walk.maxArmFwd + 0.1,
      `Climb arm pump (${climb.maxArmFwd.toFixed(2)}) should exceed walk (${walk.maxArmFwd.toFixed(2)})`
    );

    // Descend should keep knees cushioned (bent) throughout the cycle compared to straight-leg walk stance
    assert.ok(
      descend.minKnee > walk.minKnee + 0.2,
      `Descend minKnee (${descend.minKnee.toFixed(2)}) should stay more flexed than walk (${walk.minKnee.toFixed(2)})`
    );
  });
});
