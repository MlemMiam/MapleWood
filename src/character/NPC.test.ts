import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PhysicsWorld } from '../engine/Physics';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { CampusNPC, type NPCData } from './NPC';
import npcsData from '../data/npcs.json';

function withMockCanvasDocument<T>(fn: () => Promise<T>): Promise<T> {
  const prevDoc = (globalThis as { document?: unknown }).document;
  (globalThis as { document?: unknown }).document = {
    createElement: () => ({
      width: 64,
      height: 64,
      getContext: () => ({
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillStyle: '',
        fillRect: () => {},
      }),
    }),
  };
  return fn().finally(() => {
    if (prevDoc === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: unknown }).document = prevDoc;
    }
  });
}

describe('CampusNPC locomotion & Rapier physics', () => {
  it('moves Ellie smoothly along morning waypoints without ever sinking into the ground', async () => {
    await withMockCanvasDocument(async () => {
      const physics = new PhysicsWorld();
      await physics.init();
      // Walkable building floor slab (top at y = 0.05)
      physics.addStaticBox(0, 0.0, -24.0, 66, 0.05, 16);

      const scene = new THREE.Scene();
      const interactions = new InteractionSystem();
      const ellieData = (npcsData as NPCData[]).find((n) => n.id === 'npc-ellie');
      assert.ok(ellieData, 'npc-ellie must exist in npcs.json');

      const npc = new CampusNPC(
        scene,
        { ...ellieData, vrmUrl: undefined },
        interactions,
        () => {},
        physics
      );
      physics.step(1 / 60);

      const startX = npc.position.x;
      const startZ = npc.position.z;
      const playerPos = new THREE.Vector3(0, 0.05, 6);

      for (let i = 0; i < 120; i++) {
        npc.update(1 / 60, playerPos, false, undefined, 'morning', true);
        physics.step(1 / 60);
        assert.ok(
          npc.position.y >= 0.03 && npc.position.y <= 0.14,
          `Frame ${i}: Ellie feet sank/floated out of floor range (y=${npc.position.y.toFixed(4)})`
        );
      }

      const distMoved = Math.hypot(npc.position.x - startX, npc.position.z - startZ);
      assert.ok(
        distMoved > 2.0,
        `Expected Ellie to walk > 2.0m in 2 seconds, moved only ${distMoved.toFixed(3)}m`
      );
      assert.deepEqual(
        {
          x: npc.rig.root.position.x,
          y: npc.rig.root.position.y,
          z: npc.rig.root.position.z,
        },
        {
          x: npc.position.x,
          y: npc.position.y,
          z: npc.position.z,
        }
      );

      physics.dispose();
    });
  });

  it('navigates between Atrium RDC and Cafeteria via corridor doorway graph during midday', async () => {
    await withMockCanvasDocument(async () => {
      const physics = new PhysicsWorld();
      await physics.init();
      // Floor slab + wall between corridor (z=-24) and cafeteria (z=-16.7) at z=-21.8 with doorway at x=35
      physics.addStaticBox(0, 0.0, -24.0, 66, 0.05, 16);
      physics.addStaticBox(22.5, 1.5, -21.8, 10.5, 1.5, 0.2);

      const scene = new THREE.Scene();
      const interactions = new InteractionSystem();
      const ellieData = (npcsData as NPCData[]).find((n) => n.id === 'npc-ellie')!;
      const npc = new CampusNPC(
        scene,
        { ...ellieData, vrmUrl: undefined },
        interactions,
        () => {},
        physics
      );

      // Move Ellie into Atrium RDC first
      npc.position.set(0, 0.05, -29.2);
      npc.syncPhysicsBody();
      physics.step(1 / 60);

      const playerPos = new THREE.Vector3(0, 0.05, 6);

      for (let i = 0; i < 60 * 32; i++) {
        npc.update(1 / 60, playerPos, false, undefined, 'midday', true);
        physics.step(1 / 60);
      }

      assert.ok(
        npc.position.x > 30 && npc.position.z > -21.5,
        `Expected Ellie to pass through main-corridor & cafeteria doorway, ended at (${npc.position.x.toFixed(2)}, ${npc.position.z.toFixed(2)})`
      );

      physics.dispose();
    });
  });

  it('nudges an NPC if stuck in the same position for more than 5 seconds and resets navigation on destination arrival', async () => {
    await withMockCanvasDocument(async () => {
      const physics = new PhysicsWorld();
      await physics.init();
      physics.addStaticBox(0, 0.0, -24.0, 66, 0.05, 16);
      // U-pocket trapping Ellie at (0, -16.52) so she remains stuck for 5 seconds until nudged out
      physics.addStaticBox(0, 1.0, -17.0, 1.0, 1.0, 0.2);
      physics.addStaticBox(-0.6, 1.0, -16.2, 0.2, 1.0, 0.8);
      physics.addStaticBox(0.6, 1.0, -16.2, 0.2, 1.0, 0.8);

      const scene = new THREE.Scene();
      const interactions = new InteractionSystem();
      const ellieData = (npcsData as NPCData[]).find((n) => n.id === 'npc-ellie')!;
      const npc = new CampusNPC(
        scene,
        {
          ...ellieData,
          vrmUrl: undefined,
          waypoints: [{ x: 0, z: -15.8, y: 0.05 }],
          schedule: [
            {
              timePhase: 'morning',
              waypoints: [{ x: 0, z: -20, y: 0.05 }],
            },
          ],
        },
        interactions,
        () => {},
        physics
      );
      physics.step(1 / 60);

      const playerPos = new THREE.Vector3(0, 0.05, 6);
      for (let i = 0; i < 60 * 12; i++) {
        npc.update(1 / 60, playerPos, false, undefined, 'morning', true);
        physics.step(1 / 60);
      }

      // After being trapped in the pocket for 5s, the nudge backs her out around the side and reaches (0, -20)
      const distToGoal = Math.hypot(npc.position.x - 0, npc.position.z - -20);
      assert.ok(
        distToGoal < 0.35,
        `Expected 5s stuck nudge to escape U-pocket and reach (0, -20), ended at (${npc.position.x.toFixed(2)}, ${npc.position.z.toFixed(2)})`
      );
      assert.equal((npc as unknown as { navQueue: unknown[] }).navQueue.length, 0);
      assert.equal((npc as unknown as { stuckTimer: number }).stuckTimer, 0);

      physics.dispose();
    });
  });

  it('triggers randomized hello or nod audio snippets when the player approaches within radius', async () => {
    await withMockCanvasDocument(async () => {
      const calls: Array<{ kind: 'hello' | 'nod'; voice: 'helen' | 'student' }> = [];
      const mockAudio = {
        playNpcApproachSnippet: (kind: 'hello' | 'nod', voice: 'helen' | 'student' = 'student') => {
          calls.push({ kind, voice });
        },
      };

      const scene = new THREE.Scene();
      const interactions = new InteractionSystem();
      const ellieData = (npcsData as NPCData[]).find((n) => n.id === 'npc-ellie')!;
      const helenData = (npcsData as NPCData[]).find((n) => n.id === 'npc-receptionist')!;

      const ellie = new CampusNPC(
        scene,
        { ...ellieData, vrmUrl: undefined },
        interactions,
        () => {},
        undefined,
        undefined,
        undefined,
        mockAudio
      );
      const helen = new CampusNPC(
        scene,
        { ...helenData, vrmUrl: undefined },
        interactions,
        () => {},
        undefined,
        undefined,
        undefined,
        mockAudio
      );

      // Far away or paused (allowMovement=false) or different floor must NOT trigger
      ellie.update(0.05, new THREE.Vector3(0, 0.05, -2), false, undefined, 'morning', true);
      ellie.update(0.05, new THREE.Vector3(0, 0.05, -14), false, undefined, 'morning', false);
      ellie.update(0.05, new THREE.Vector3(0, 4.25, -14), false, undefined, 'morning', true);
      assert.equal(calls.length, 0);

      // Walk within approach radius (<= 4.2m) of Ellie during active gameplay -> fires once
      ellie.update(0.05, new THREE.Vector3(0, 0.05, -13.0), false, undefined, 'morning', true);
      ellie.update(0.05, new THREE.Vector3(0, 0.05, -13.2), false, undefined, 'morning', true);
      assert.equal(calls.length, 1);
      assert.ok(calls[0].kind === 'hello' || calls[0].kind === 'nod');
      assert.equal(calls[0].voice, 'student');

      // Seated receptionist (Mme Parker) also greets with 'helen' voice profile when approached
      helen.update(0.05, new THREE.Vector3(-5.0, 0.05, -18.5), false, undefined, 'morning', true);
      assert.equal(calls.length, 2);
      assert.ok(calls[1].kind === 'hello' || calls[1].kind === 'nod');
      assert.equal(calls[1].voice, 'helen');

      // Stepping slightly away inside hysteresis band (5.0m < 5.6m) then stepping back does NOT retrigger
      helen.update(0.05, new THREE.Vector3(-5.43, 0.05, -15.74), false, undefined, 'morning', true);
      helen.update(0.05, new THREE.Vector3(-5.43, 0.05, -18.5), false, undefined, 'morning', true);
      assert.equal(calls.length, 2);

      // Stepping past exit radius (> 5.6m) and letting cooldown expire allows re-triggering
      for (let i = 0; i < 25; i++) {
        helen.update(1.0, new THREE.Vector3(-5.43, 0.05, -12.0), false, undefined, 'morning', true);
      }
      helen.update(0.05, new THREE.Vector3(-5.43, 0.05, -18.5), false, undefined, 'morning', true);
      assert.equal(calls.length, 3);
    });
  });

  it('switches CampusNPC animation between climb_stairs and descend_stairs when traversing 0.20m steps', async () => {
    await withMockCanvasDocument(async () => {
      const physics = new PhysicsWorld();
      await physics.init();

      // Build lower floor, 8-step staircase (0.20m risers, 0.45m treads along -Z), and upper landing
      physics.addStaticBox(0, -0.05, 0.0, 4, 0.1, 4); // top at y = 0.05
      for (let s = 0; s < 8; s++) {
        const topY = 0.05 + (s + 1) * 0.2;
        const centerZ = -2.0 - s * 0.45 - 0.225;
        physics.addStaticBox(0, topY / 2 - 0.05, centerZ, 3.0, topY / 2 + 0.05, 0.25);
      }
      // Upper landing top at y = 1.65 (same floor band < 4.2m so NPC walks directly via waypoints)
      physics.addStaticBox(0, 1.65 / 2 - 0.05, -7.2, 4, 1.65 / 2 + 0.05, 2.0);

      const scene = new THREE.Scene();
      const interactions = new InteractionSystem();
      const ellieData = (npcsData as NPCData[]).find((n) => n.id === 'npc-ellie')!;

      const npc = new CampusNPC(
        scene,
        {
          ...ellieData,
          vrmUrl: undefined,
          waypoints: [{ x: 0, z: -0.5, y: 0.05 }],
          schedule: [
            {
              timePhase: 'morning',
              waypoints: [
                { x: 0, z: -6.4, y: 1.65 },
                { x: 0, z: -0.5, y: 0.05 },
              ],
            },
          ],
        },
        interactions,
        () => {},
        physics
      );
      physics.step(1 / 60);

      const playerPos = new THREE.Vector3(20, 0.05, 20);
      const climbStates: string[] = [];
      let reachedTop = false;
      for (let i = 0; i < 60 * 10; i++) {
        npc.update(1 / 60, playerPos, false, undefined, 'morning', true);
        physics.step(1 / 60);
        climbStates.push(npc.getAnimState());
        if (npc.position.z <= -6.1 && npc.position.y >= 1.55) {
          reachedTop = true;
          break;
        }
      }

      assert.ok(
        reachedTop,
        `Expected NPC to climb stairs to top landing (y>=1.55), ended at y=${npc.position.y.toFixed(2)}, z=${npc.position.z.toFixed(2)}`
      );
      assert.ok(
        climbStates.includes('climb_stairs'),
        `Expected NPC to enter climb_stairs while ascending, saw: ${Array.from(new Set(climbStates)).join(', ')}`
      );

      const descendStates: string[] = [];
      let reachedBottom = false;
      for (let i = 0; i < 60 * 10; i++) {
        npc.update(1 / 60, playerPos, false, undefined, 'morning', true);
        physics.step(1 / 60);
        descendStates.push(npc.getAnimState());
        if (npc.position.z >= -1.0 && npc.position.y <= 0.15) {
          reachedBottom = true;
          break;
        }
      }

      assert.ok(
        reachedBottom,
        `Expected NPC to descend stairs back to bottom floor, ended at y=${npc.position.y.toFixed(2)}, z=${npc.position.z.toFixed(2)}`
      );
      assert.ok(
        descendStates.includes('descend_stairs'),
        `Expected NPC to enter descend_stairs while descending, saw: ${Array.from(new Set(descendStates)).join(', ')}`
      );

      physics.dispose();
    });
  });
});
