import * as THREE from 'three';
import npcsData from '../data/npcs.json';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import {
  type HumanoidRig,
  animateHumanoid,
  createHumanoidRig,
} from './PlayerAnimations';

export interface NPCChoiceData {
  label: string;
  reply: string;
  action: string;
}

export interface NPCData {
  id: string;
  name: string;
  role: string;
  roomId: string;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  questId: string | null;
  waypoints: Array<{ x: number; z: number }>;
  greeting: string;
  choices: NPCChoiceData[];
}

export class CampusNPC {
  public readonly data: NPCData;
  public readonly rig: HumanoidRig;
  public readonly position = new THREE.Vector3();
  private wpIndex = 0;
  private waitTimer = 0;
  private yaw = 0;
  private phase = 0;

  constructor(
    scene: THREE.Scene,
    data: NPCData,
    interactions: InteractionSystem,
    onTalk: (npc: NPCData) => void
  ) {
    this.data = data;
    this.rig = createHumanoidRig({
      shirt: data.shirtColor,
      pants: data.pantsColor,
      skin: data.skinColor,
      hair: data.hairColor,
      accent: '#D4AF37',
    });

    const start = data.waypoints[0] || { x: 0, z: 0 };
    this.position.set(start.x, 0.05, start.z);
    this.rig.root.position.copy(this.position);
    scene.add(this.rig.root);

    interactions.register({
      id: `npc-${data.id}`,
      label: `parler à ${data.name} (${data.role})`,
      type: 'npc',
      targetObject: this.rig.root,
      worldPosition: this.position,
      maxDistance: 3.0,
      onInteract: () => onTalk(this.data),
    });
  }

  public update(dt: number, playerPos: THREE.Vector3, isTalkingToThis: boolean): void {
    const distToPlayer = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);

    // Pause patrol & face player if talking or very close
    if (isTalkingToThis || distToPlayer < 2.2) {
      const targetYaw = Math.atan2(-(playerPos.x - this.position.x), -(playerPos.z - this.position.z));
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 8);
      this.rig.root.rotation.y = this.yaw;
      this.phase += dt * 1.5;
      animateHumanoid(this.rig, 'idle', this.phase, 0, dt);
      this.updateHeadTrack(playerPos, distToPlayer, dt);
      return;
    }

    const wps = this.data.waypoints;
    if (wps.length > 1) {
      if (this.waitTimer > 0) {
        this.waitTimer -= dt;
        this.phase += dt * 1.4;
        animateHumanoid(this.rig, 'idle', this.phase, 0, dt);
      } else {
        const target = wps[this.wpIndex];
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.2) {
          this.wpIndex = (this.wpIndex + 1) % wps.length;
          this.waitTimer = 1.6;
        } else {
          const speed = 1.35;
          const step = Math.min(dist, speed * dt);
          this.position.x += (dx / dist) * step;
          this.position.z += (dz / dist) * step;

          const targetYaw = Math.atan2(-dx, -dz);
          let diff = targetYaw - this.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.yaw += diff * Math.min(1, dt * 8);
          this.rig.root.rotation.y = this.yaw;

          this.phase += step * 3.0;
          animateHumanoid(this.rig, 'walk', this.phase, 0, dt);
        }
      }
    } else {
      this.phase += dt * 1.4;
      animateHumanoid(this.rig, 'idle', this.phase, 0, dt);
    }

    this.rig.root.position.copy(this.position);
    this.updateHeadTrack(playerPos, distToPlayer, dt);
  }

  private updateHeadTrack(playerPos: THREE.Vector3, dist: number, dt: number): void {
    const damp = 1 - Math.exp(-8 * dt);
    if (dist < 5.5) {
      const worldAngle = Math.atan2(-(playerPos.x - this.position.x), -(playerPos.z - this.position.z));
      let rel = worldAngle - this.yaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      rel = THREE.MathUtils.clamp(rel, -0.75, 0.75);
      this.rig.headPivot.rotation.y = THREE.MathUtils.lerp(this.rig.headPivot.rotation.y, rel, damp);
    } else {
      this.rig.headPivot.rotation.y = THREE.MathUtils.lerp(this.rig.headPivot.rotation.y, 0, damp);
    }
  }
}

export function spawnCampusNPCs(
  scene: THREE.Scene,
  interactions: InteractionSystem,
  onTalk: (npc: NPCData) => void
): CampusNPC[] {
  const list = npcsData as NPCData[];
  return list.map((data) => new CampusNPC(scene, data, interactions, onTalk));
}
