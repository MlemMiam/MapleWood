import * as THREE from 'three';
import type { PhysicsWorld } from '../engine/Physics';
import type { MaterialLibrary } from '../utils/Materials';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { ClockUpdateRef } from '../utils/Geometry';
import type { WorldBuildContext, WorldCallbacks } from './WorldContext';
import type { InteractiveDoor } from './props/Door';
import { buildMainBuilding } from './buildings/MainBuilding';
import { buildCourtyard } from './exterior/Courtyard';
import { buildFencing } from './exterior/Fencing';
import type { ElevatorSystem } from './buildings/ElevatorSystem';
import type { Player } from '../character/Player';
import type { CampusNPC } from '../character/NPC';

export class CampusWorld {
  public readonly doors: InteractiveDoor[] = [];
  public readonly clocks: ClockUpdateRef[] = [];
  public readonly cameraColliders: THREE.Object3D[] = [];
  public readonly wingLights: Record<string, THREE.PointLight[]> = {};
  public elevatorSystem?: ElevatorSystem;
  private callbacks: WorldCallbacks;
  private animatedObjects: Array<(elapsed: number, dt: number) => void> = [];
  private windUniforms = {
    uWindTime: { value: 0 },
    uWindStrength: { value: 0.32 },
  };
  private lightsOn = true;
  private clockTimer = 1.0;
  private lightCullTimer = 0.25;
  private allLights: Array<{ light: THREE.PointLight; x: number; z: number }> = [];

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    mats: MaterialLibrary,
    interactions: InteractionSystem,
    callbacks: WorldCallbacks
  ) {
    this.callbacks = callbacks;
    const ctx: WorldBuildContext = {
      scene,
      physics,
      mats,
      interactions,
      doors: this.doors,
      clocks: this.clocks,
      cameraColliders: this.cameraColliders,
      animatedObjects: this.animatedObjects,
      wingLights: this.wingLights,
      windUniforms: this.windUniforms,
      callbacks,
      setElevatorSystem: (system: ElevatorSystem) => {
        this.elevatorSystem = system;
      },
    };

    buildCourtyard(ctx);
    buildMainBuilding(ctx);
    buildFencing(ctx);

    // Collect all interior PointLights for distance culling so distant rooms
    // don't burn GPU PBR fragment shader loops when outdoors or across campus.
    const tmpWorld = new THREE.Vector3();
    scene.updateMatrixWorld(true);
    scene.traverse((obj) => {
      if ((obj as THREE.PointLight).isPointLight) {
        obj.getWorldPosition(tmpWorld);
        this.allLights.push({
          light: obj as THREE.PointLight,
          x: tmpWorld.x,
          z: tmpWorld.z,
        });
      }
    });
  }
  public toggleWingLights(wing: string): boolean {
    this.lightsOn = !this.lightsOn;
    const lights = this.wingLights[wing] || [];
    for (const l of lights) {
      l.intensity = this.lightsOn ? 2.2 : 0.25;
    }
    return this.lightsOn;
  }

  public update(
    elapsed: number,
    dt: number,
    focusPos?: THREE.Vector3,
    windTime?: number,
    windStrength?: number,
    player?: Player,
    npcs?: CampusNPC[]
  ): void {
    if (windTime !== undefined) {
      this.windUniforms.uWindTime.value = windTime;
    } else {
      this.windUniforms.uWindTime.value = elapsed * 1.45;
    }
    if (windStrength !== undefined) {
      this.windUniforms.uWindStrength.value = windStrength;
    }

    for (const door of this.doors) {
      door.update(dt, focusPos);
    }
    if (this.elevatorSystem) {
      this.elevatorSystem.update(dt, player, npcs ?? [], this.callbacks);
    }
    for (const fn of this.animatedObjects) {
      fn(elapsed, dt);
    }

    // Distance-cull interior PointLights (~4 Hz) to keep active shader light count minimal
    if (focusPos && this.allLights.length > 0) {
      this.lightCullTimer += dt;
      if (this.lightCullTimer >= 0.25) {
        this.lightCullTimer = 0;
        const maxDistSq = 40 * 40;
        for (let i = 0; i < this.allLights.length; i++) {
          const entry = this.allLights[i];
          const dx = entry.x - focusPos.x;
          const dz = entry.z - focusPos.z;
          entry.light.visible = dx * dx + dz * dz <= maxDistSq;
        }
      }
    }

    // Real-time functional wall clocks (updated once per second instead of every frame)
    this.clockTimer += dt;
    if (this.clockTimer >= 1.0) {
      this.clockTimer = 0;
      const now = new Date();
      const minutes = now.getMinutes() + now.getSeconds() / 60;
      const hours = (now.getHours() % 12) + minutes / 60;
      const minAngle = -(minutes / 60) * Math.PI * 2;
      const hourAngle = -(hours / 12) * Math.PI * 2;
      for (const c of this.clocks) {
        c.minuteHand.rotation.z = minAngle;
        c.hourHand.rotation.z = hourAngle;
      }
    }
  }
}
