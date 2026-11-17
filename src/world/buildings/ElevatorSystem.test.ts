import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../engine/Physics';
import { InteractionSystem } from '../../interaction/InteractionSystem';
import { ElevatorCabin, ElevatorSystem, ELEVATOR_FLOORS } from './ElevatorSystem';
import type { WorldBuildContext } from '../WorldContext';
import type { Player } from '../../character/Player';

import type { Interactable } from '../../interaction/Interactable';

function createMockContext(physics: PhysicsWorld): {
  ctx: WorldBuildContext;
  registered: Interactable[];
  menuCalls: Array<{ side: string; currentFloor: number; onSelect: (f: number) => void; onCancel?: () => void }>;
} {
  const scene = new THREE.Scene();
  const interactions = new InteractionSystem();
  const registered: Interactable[] = [];
  const origRegister = interactions.register.bind(interactions);
  interactions.register = (item: Interactable) => {
    registered.push(item);
    origRegister(item);
  };
  const menuCalls: Array<{
    side: string;
    currentFloor: number;
    onSelect: (f: number) => void;
    onCancel?: () => void;
  }> = [];

  const ctx = {
    scene,
    physics,
    mats: {} as WorldBuildContext['mats'],
    interactions,
    doors: [],
    clocks: [],
    cameraColliders: [],
    animatedObjects: [],
    wingLights: {},
    windUniforms: { uWindTime: { value: 0 }, uWindStrength: { value: 0.3 } },
    callbacks: {
      onDoorToggle: () => {},
      onInspectLocker: () => {},
      onInspectWhiteboard: () => {},
      onUseComputer: () => {},
      onUseVending: () => {},
      onReadBook: () => {},
      onReadNotice: () => {},
      onViewBrochure: () => {},
      onUseFountain: () => {},
      onUseSink: () => {},
      onToggleLights: () => {},
      onPullFireAlarm: () => {},
      onPickupNotebook: () => {},
      onShootBasketball: () => {},
      onOpenElevatorMenu: (side, currentFloor, onSelect, onCancel) => {
        menuCalls.push({ side, currentFloor, onSelect, onCancel });
      },
      onElevatorArrive: () => {},
    },
  } as WorldBuildContext;

  return { ctx, registered, menuCalls };
}

function stepPlayerWalk(
  physics: PhysicsWorld,
  updater: { update: (dt: number, player: Player | undefined, npcs: [], callbacks?: WorldBuildContext['callbacks']) => void },
  playerBody: RAPIER.RigidBody,
  playerCol: RAPIER.Collider,
  fakePlayer: { position: THREE.Vector3; isRidingElevator: boolean; elevatorY: number },
  moveX: number,
  moveZ: number,
  steps: number,
  callbacks: WorldBuildContext['callbacks']
): void {
  const dt = 0.016;
  for (let i = 0; i < steps; i++) {
    physics.characterController.computeColliderMovement(
      playerCol,
      { x: moveX, y: -0.02, z: moveZ },
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
    );
    const m = physics.characterController.computedMovement();
    const cur = playerBody.translation();
    const nx = cur.x + m.x;
    const ny = cur.y + m.y;
    const nz = cur.z + m.z;
    playerBody.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    physics.step(dt);
    fakePlayer.position.set(nx, ny - 0.875, nz);
    updater.update(dt, fakePlayer as unknown as Player, [], callbacks);
  }
}

describe('ElevatorCabin walkability & door state machine', () => {
  it('allows player to walk smoothly into and out of cabin on RDC and Floor 1 without getting stuck', async () => {
    const prevDoc = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    };

    const physics = new PhysicsWorld();
    try {
      await physics.init();
      const { ctx, registered, menuCalls } = createMockContext(physics);

      // Ground slab at RDC (y = 0.05) and Floor 1 corridor slab (y = 4.85, ending at z = -26.20)
      physics.addStaticBox(0, 0.0, -24.0, 66, 0.05, 13);
      physics.addStaticBox(14.25, 4.85 - 0.175, -19.65, 20, 0.175, 6.55);

      const parent = new THREE.Group();
      const glassMat = new THREE.MeshStandardMaterial();
      const cabin = new ElevatorCabin(ctx, parent, 'east', glassMat);

      const p = physics.createPlayerBody(cabin.shaftX, ELEVATOR_FLOORS[0].y, -24.6);
      const fakePlayer = {
        position: new THREE.Vector3(cabin.shaftX, ELEVATOR_FLOORS[0].y, -24.6),
        isRidingElevator: false,
        elevatorY: ELEVATOR_FLOORS[0].y,
      };

      physics.step(0.016);
      cabin.update(0.016, fakePlayer as unknown as Player, [], ctx.callbacks);

      // 1. Walk straight into the East elevator cabin at RDC
      stepPlayerWalk(physics, cabin, p.body, p.collider, fakePlayer, 0, -0.06, 65, ctx.callbacks);
      assert.ok(
        fakePlayer.position.z < -27.4,
        `Expected player to enter cabin (z < -27.4), got z=${fakePlayer.position.z.toFixed(3)}`
      );

      // Wait for automatic door close & menu trigger (~2.5s)
      for (let i = 0; i < 160; i++) {
        physics.step(0.016);
        cabin.update(0.016, fakePlayer as unknown as Player, [], ctx.callbacks);
      }
      assert.equal(menuCalls.length, 1, 'Destination menu should open once doors close inside cabin');

      // Test cancelling menu via Esc/Fermer and walking back out
      menuCalls[0].onCancel?.();
      for (let i = 0; i < 50; i++) {
        physics.step(0.016);
        cabin.update(0.016, fakePlayer as unknown as Player, [], ctx.callbacks);
      }
      stepPlayerWalk(physics, cabin, p.body, p.collider, fakePlayer, 0, 0.06, 65, ctx.callbacks);
      assert.ok(
        fakePlayer.position.z > -25.2,
        `Expected player to exit cabin freely after cancelling menu, got z=${fakePlayer.position.z.toFixed(3)}`
      );

      // 2. Walk back in and take elevator to Floor 1
      stepPlayerWalk(physics, cabin, p.body, p.collider, fakePlayer, 0, -0.06, 65, ctx.callbacks);
      assert.ok(fakePlayer.position.z < -27.4, 'Player should re-enter cabin at RDC');

      cabin.requestFloor(1, ctx.callbacks);
      for (let i = 0; i < 240; i++) {
        physics.step(0.016);
        cabin.update(0.016, fakePlayer as unknown as Player, [], ctx.callbacks);
        if (fakePlayer.isRidingElevator) {
          p.body.setTranslation(
            { x: fakePlayer.position.x, y: fakePlayer.elevatorY + 0.875 + 0.03, z: fakePlayer.position.z },
            true
          );
          fakePlayer.position.y = fakePlayer.elevatorY + 0.03;
        }
      }

      assert.equal(cabin.currentFloor, 1);
      assert.ok(Math.abs(cabin.currentY - ELEVATOR_FLOORS[1].y) < 0.01);

      // Interior panel interaction worldPosition should have moved up to Floor 1
      const panelEntry = registered.find((i) => i.id === 'elev-panel-east');
      assert.ok(panelEntry, 'Interior panel interactable should exist');
      assert.ok(
        Math.abs(panelEntry.worldPosition.y - (ELEVATOR_FLOORS[1].y + 1.25)) < 0.05,
        `Panel worldPosition.y should move with cabin to Floor 1, got ${panelEntry.worldPosition.y}`
      );

      // 3. Walk out onto Floor 1 corridor
      stepPlayerWalk(physics, cabin, p.body, p.collider, fakePlayer, 0, 0.06, 65, ctx.callbacks);
      assert.ok(
        fakePlayer.position.z > -25.2,
        `Expected player to exit cabin on Floor 1 (z > -25.2), got z=${fakePlayer.position.z.toFixed(3)}`
      );
      assert.ok(
        Math.abs(fakePlayer.position.y - ELEVATOR_FLOORS[1].y) < 0.15,
        `Expected player to stay at Floor 1 height, got y=${fakePlayer.position.y.toFixed(3)}`
      );

      // 4. Walk back in on Floor 1
      stepPlayerWalk(physics, cabin, p.body, p.collider, fakePlayer, 0, -0.06, 65, ctx.callbacks);
      assert.ok(
        fakePlayer.position.z < -27.4,
        `Expected player to re-enter cabin on Floor 1 (z < -27.4), got z=${fakePlayer.position.z.toFixed(3)}`
      );
    } finally {
      physics.dispose();
      if (prevDoc === undefined) {
        delete (globalThis as { document?: unknown }).document;
      } else {
        (globalThis as { document?: unknown }).document = prevDoc;
      }
    }
  });

  it('preserves East elevator riding state alongside West elevator and lets player walk out mid-close', async () => {
    const prevDoc = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    };

    const physics = new PhysicsWorld();
    try {
      await physics.init();
      const { ctx, menuCalls } = createMockContext(physics);
      physics.addStaticBox(0, 0.0, -24.0, 66, 0.05, 13);

      const parent = new THREE.Group();
      const glassMat = new THREE.MeshStandardMaterial();
      const system = new ElevatorSystem(ctx, parent, ELEVATOR_FLOORS[0].y, glassMat);

      const p = physics.createPlayerBody(system.eastElevator.shaftX, ELEVATOR_FLOORS[0].y, -24.6);
      const fakePlayer = {
        position: new THREE.Vector3(system.eastElevator.shaftX, ELEVATOR_FLOORS[0].y, -24.6),
        isRidingElevator: false,
        elevatorY: ELEVATOR_FLOORS[0].y,
      };

      physics.step(0.016);
      system.update(0.016, fakePlayer as unknown as Player, [], ctx.callbacks);

      // Walk into East elevator
      stepPlayerWalk(physics, system, p.body, p.collider, fakePlayer, 0, -0.06, 65, ctx.callbacks);
      assert.ok(fakePlayer.position.z < -27.4);

      // Wait until doors start closing (before destination menu opens), then immediately walk back out
      for (let i = 0; i < 100; i++) {
        physics.step(0.016);
        system.update(0.016, fakePlayer as unknown as Player, [], ctx.callbacks);
        if (menuCalls.length > 0) break;
        // Stop waiting ~0.18s after 1.3s boarding countdown finishes so doors are mid-closing
        if (i >= 62) break;
      }
      assert.equal(menuCalls.length, 0);
      stepPlayerWalk(physics, system, p.body, p.collider, fakePlayer, 0, 0.06, 65, ctx.callbacks);
      assert.ok(
        fakePlayer.position.z > -25.2,
        `Expected player to exit freely when walking out mid-close, got z=${fakePlayer.position.z.toFixed(3)}`
      );

      // Re-enter East elevator and ride up to Floor 2 while West elevator updates in the same system tick
      stepPlayerWalk(physics, system, p.body, p.collider, fakePlayer, 0, -0.06, 65, ctx.callbacks);
      system.eastElevator.requestFloor(2, ctx.callbacks);

      let observedActiveRideFlag = false;
      let maxSinkDuringAscent = 0;
      const syncedPlayer = Object.assign(fakePlayer, {
        syncElevatorRide(this: typeof fakePlayer, y: number) {
          this.isRidingElevator = true;
          this.elevatorY = y;
          p.body.setTranslation(
            { x: this.position.x, y: y + 0.875 + 0.038, z: this.position.z },
            true
          );
          this.position.y = y + 0.038;
        },
      });
      for (let i = 0; i < 240; i++) {
        physics.step(0.016);
        system.update(0.016, syncedPlayer as unknown as Player, [], ctx.callbacks);
        if (syncedPlayer.isRidingElevator) {
          observedActiveRideFlag = true;
          const cabinFloorTop = system.eastElevator.currentY + 0.009;
          const sink = cabinFloorTop - syncedPlayer.position.y;
          if (sink > maxSinkDuringAscent) maxSinkDuringAscent = sink;
        }
      }
      assert.ok(observedActiveRideFlag, 'West elevator update must not clear East elevator riding state');
      assert.ok(maxSinkDuringAscent <= 0, `Player must never sink below cabin floor top during ascent, got sink=${maxSinkDuringAscent}`);
      assert.equal(system.eastElevator.currentFloor, 2);
      assert.equal(syncedPlayer.isRidingElevator, false);
    } finally {
      physics.dispose();
      if (prevDoc === undefined) {
        delete (globalThis as { document?: unknown }).document;
      } else {
        (globalThis as { document?: unknown }).document = prevDoc;
      }
    }
  });

  it('removes baked inactive static elevator doors and dummy cabin slabs from main_building.glb', async () => {
    const fs = await import('node:fs');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { stripBakedStaticElevatorParts } = await import('./MainBuilding');

    const buf = fs.readFileSync('public/assets/models/main_building.glb');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const loader = new GLTFLoader();
    const gltf = await new Promise<{ scene: THREE.Group }>((res, rej) =>
      loader.parse(ab, '', res as unknown as (gltf: unknown) => void, rej)
    );
    const building = gltf.scene;
    building.position.set(0, 0.05 - 0.6, -24.0);
    building.updateMatrixWorld(true);

    let steelRemoved = 0;
    let brassRemoved = 0;
    let steelRemainingTris = 0;
    building.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      if (mesh.name === 'MW_Elevators_Steel') {
        steelRemoved += stripBakedStaticElevatorParts(mesh, 'MW_Elevators_Steel');
        steelRemainingTris = mesh.geometry.index ? mesh.geometry.index.count / 3 : 0;
      } else if (mesh.name === 'MW_Elevators_Brass') {
        brassRemoved += stripBakedStaticElevatorParts(mesh, 'MW_Elevators_Brass');
      }
    });

    assert.ok(
      steelRemoved === 4 || steelRemoved === 216,
      `Expected steelRemoved to be 4 (cleaned GLB) or 216 (uncleaned GLB), got ${steelRemoved}`
    );
    assert.equal(steelRemainingTris, 96, 'Should keep all 96 shaft corner steel column tris intact');
    assert.ok(
      brassRemoved === 8 || brassRemoved === 24,
      `Expected brassRemoved to be 8 (cleaned GLB) or 24 (uncleaned GLB), got ${brassRemoved}`
    );
  });
});
