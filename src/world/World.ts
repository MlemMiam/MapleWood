import * as THREE from 'three';
import type { PhysicsWorld } from '../engine/Physics';
import type { MaterialLibrary } from '../utils/Materials';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { ClockUpdateRef } from '../utils/Geometry';
import type { WorldBuildContext, WorldCallbacks } from './WorldContext';
import type { InteractiveDoor } from './props/Door';
import { buildMainBuilding } from './buildings/MainBuilding';
import { buildAdminOffice } from './buildings/AdminOffice';
import { buildScienceWing } from './buildings/ScienceWing';
import { buildGymnasium } from './buildings/Gymnasium';
import { buildCafeteria } from './buildings/Cafeteria';
import { buildLibrary } from './buildings/Library';
import { buildCourtyard } from './exterior/Courtyard';
import { buildParkingLots } from './exterior/ParkingLot';
import { buildSportsField } from './exterior/SportsField';
import { buildFencing } from './exterior/Fencing';
import { buildExteriorDetails } from './exterior/ExteriorDetails';
export class CampusWorld {
  public readonly doors: InteractiveDoor[] = [];
  public readonly clocks: ClockUpdateRef[] = [];
  public readonly cameraColliders: THREE.Object3D[] = [];
  public readonly wingLights: Record<string, THREE.PointLight[]> = {};
  private animatedObjects: Array<(elapsed: number, dt: number) => void> = [];
  private lightsOn = true;

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    mats: MaterialLibrary,
    interactions: InteractionSystem,
    callbacks: WorldCallbacks
  ) {
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
      callbacks,
    };

    buildCourtyard(ctx);
    buildMainBuilding(ctx);
    buildAdminOffice(ctx);
    buildScienceWing(ctx);
    buildGymnasium(ctx);
    buildCafeteria(ctx);
    buildLibrary(ctx);
    buildParkingLots(ctx);
    buildSportsField(ctx);
    buildFencing(ctx);
    buildExteriorDetails(ctx);
  }
  public toggleWingLights(wing: string): boolean {
    this.lightsOn = !this.lightsOn;
    const lights = this.wingLights[wing] || [];
    for (const l of lights) {
      l.intensity = this.lightsOn ? 2.2 : 0.25;
    }
    return this.lightsOn;
  }

  public update(elapsed: number, dt: number): void {
    for (const door of this.doors) {
      door.update(dt);
    }
    for (const fn of this.animatedObjects) {
      fn(elapsed, dt);
    }

    // Real-time functional wall clocks
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
