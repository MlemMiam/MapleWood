import * as THREE from 'three';
import npcsData from '../data/npcs.json';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import {
  type AnimState,
  type HumanoidRig,
  animateHumanoid,
  createHumanoidRig,
} from './PlayerAnimations';
import {
  type FlorieVRMController,
  type VisemeKey,
  fetchVrmBufferWithFallback,
  parseFlorieVrmFromBuffer,
} from './FlorieVRM';

export interface NPCChoiceData {
  label: string;
  reply: string;
  action: string;
  audioUrl?: string;
}

export interface NPCWaypoint {
  x: number;
  z: number;
  run?: boolean;
}

export interface NPCData {
  id: string;
  name: string;
  role: string;
  promptLabel?: string;
  roomId: string;
  vrmUrl?: string;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  questId: string | null;
  seated?: boolean;
  seatYaw?: number;
  waypoints: NPCWaypoint[];
  greeting: string;
  greetingAudioUrl?: string;
  choices: NPCChoiceData[];
}

export class CampusNPC {
  public readonly data: NPCData;
  public readonly rig: HumanoidRig;
  public readonly position = new THREE.Vector3();
  private vrmController: FlorieVRMController | null = null;
  private wpIndex = 0;
  private waitTimer = 0;
  private yaw = 0;
  private phase = 0;
  private lodCounter = 0;

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
    if (data.seatYaw !== undefined) {
      this.yaw = data.seatYaw;
      this.rig.root.rotation.y = this.yaw;
    }
    this.rig.root.position.copy(this.position);
    scene.add(this.rig.root);

    interactions.register({
      id: `npc-${data.id}`,
      label: data.promptLabel ?? `Parler à ${data.name}`,
      type: 'npc',
      targetObject: this.rig.root,
      worldPosition: this.position,
      maxDistance: 3.0,
      onInteract: () => onTalk(this.data),
    });

    if (data.vrmUrl) {
      void this.loadVrmModel(data.vrmUrl);
    }
  }

  private async loadVrmModel(vrmUrl: string): Promise<void> {
    try {
      const buffer = await fetchVrmBufferWithFallback(vrmUrl);
      const label = vrmUrl.split('/').pop() || `${this.data.id}.vrm`;
      const controller = await parseFlorieVrmFromBuffer(buffer, label);
      this.rig.bodyGroup.visible = false;
      this.vrmController = controller;
      this.rig.root.add(controller.container);
    } catch (err) {
      console.warn(`Failed to load VRM for NPC ${this.data.id}:`, err);
    }
  }

  private updateRigAnimation(animState: AnimState, dt: number): void {
    if (this.vrmController) {
      this.vrmController.update(animState, this.phase, 0, dt);
    } else {
      animateHumanoid(this.rig, animState, this.phase, 0, dt);
    }
  }

  public getYaw(): number {
    return this.yaw;
  }

  public getVrmController(): FlorieVRMController | null {
    return this.vrmController;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    isTalkingToThis: boolean,
    dialogueVisuals?: {
      lookAtPos: THREE.Vector3 | null;
      speechLevel: number;
      speechTime: number;
      visemeHint?: VisemeKey | null;
    }
  ): void {
    this.vrmController?.setNpcDialogueVisuals?.({
      lookAtPos: isTalkingToThis ? (dialogueVisuals?.lookAtPos ?? null) : null,
      isTalking: isTalkingToThis,
      speechLevel: isTalkingToThis ? (dialogueVisuals?.speechLevel ?? 0) : 0,
      speechTime: dialogueVisuals?.speechTime ?? 0,
      visemeHint: isTalkingToThis ? (dialogueVisuals?.visemeHint ?? null) : null,
    });
    const distToPlayer = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);

    if (this.data.seated) {
      const targetYaw =
        this.data.seatYaw !== undefined
          ? this.data.seatYaw
          : Math.atan2(-(playerPos.x - this.position.x), -(playerPos.z - this.position.z));
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 8);
      this.rig.root.rotation.y = this.yaw;
      this.phase += dt * 1.4;
      this.updateRigAnimation('sit_type', dt);
      if (!this.vrmController) {
        this.updateHeadTrack(playerPos, distToPlayer, dt);
      }
      return;
    }

    // Pause patrol & face player if talking or very close
    if (isTalkingToThis || distToPlayer < 2.2) {
      const targetYaw = Math.atan2(-(playerPos.x - this.position.x), -(playerPos.z - this.position.z));
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 8);
      this.rig.root.rotation.y = this.yaw;
      this.phase += dt * 1.5;
      this.updateRigAnimation('idle', dt);
      if (!this.vrmController) {
        this.updateHeadTrack(playerPos, distToPlayer, dt);
      }
      return;
    }

    const isFar = distToPlayer > 32;
    if (this.vrmController) {
      const showVrm = !isFar;
      if (this.vrmController.container.visible !== showVrm) {
        this.vrmController.container.visible = showVrm;
        this.rig.bodyGroup.visible = !showVrm;
      }
    }
    this.lodCounter = (this.lodCounter + 1) & 3;
    const shouldAnimateRig =
      (!isFar && (!this.vrmController || distToPlayer <= 22 || this.lodCounter === 0)) ||
      (isFar && this.lodCounter === 0);

    const wps = this.data.waypoints;
    let animState: AnimState = 'idle';
    if (wps.length > 1) {
      if (this.waitTimer > 0) {
        this.waitTimer -= dt;
        this.phase += dt * 1.4;
      } else {
        const target = wps[this.wpIndex];
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.2) {
          this.wpIndex = (this.wpIndex + 1) % wps.length;
          this.waitTimer = 1.6;
        } else {
          const isRunning = Boolean(target.run);
          animState = isRunning ? 'run' : 'walk';
          const speed = isRunning ? 4.2 : 1.65;
          const step = Math.min(dist, speed * dt);
          this.position.x += (dx / dist) * step;
          this.position.z += (dz / dist) * step;

          const targetYaw = Math.atan2(-dx, -dz);
          let diff = targetYaw - this.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.yaw += diff * Math.min(1, dt * 8);
          this.rig.root.rotation.y = this.yaw;

          // Match player gait phase scaling for walk and run animations
          this.phase += step * (isRunning ? 2.05 : 3.6);
        }
      }
    } else {
      this.phase += dt * 1.4;
    }

    this.rig.root.position.copy(this.position);
    if (shouldAnimateRig) {
      this.updateRigAnimation(animState, isFar ? dt * 4 : dt);
      if (!isFar && !this.vrmController) {
        this.updateHeadTrack(playerPos, distToPlayer, dt);
      }
    }
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
