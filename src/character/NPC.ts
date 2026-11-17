import * as THREE from 'three';
import npcsData from '../data/npcs.json';
import type { PhysicsWorld } from '../engine/Physics';
import RAPIER from '@dimforge/rapier3d-compat';
import type { WorldCallbacks } from '../world/WorldContext';
import type { ElevatorSystem } from '../world/buildings/ElevatorSystem';
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
  audioUrl?: string | null;
}

export interface NPCWaypoint {
  x: number;
  z: number;
  y?: number;
  run?: boolean;
}

export interface NPCScheduleEntry {
  timePhase: string;
  waypoints: NPCWaypoint[];
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
  schedule?: NPCScheduleEntry[];
  greeting: string;
  greetingAudioUrl?: string | null;
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
  private physics: PhysicsWorld | null = null;
  private body: RAPIER.RigidBody | null = null;
  private collider: RAPIER.Collider | null = null;
  private characterController: RAPIER.KinematicCharacterController | null = null;
  private elevatorSystem: ElevatorSystem | null = null;
  private callbacks: WorldCallbacks | null = null;
  private isRidingElevator = false;
  private currentSchedule: NPCWaypoint[] = [];
  private lastTimePhase: string | null = null;

  constructor(
    scene: THREE.Scene,
    data: NPCData,
    interactions: InteractionSystem,
    onTalk: (npc: NPCData) => void,
    physics?: PhysicsWorld,
    elevatorSystem?: ElevatorSystem,
    callbacks?: WorldCallbacks
  ) {
    this.data = data;
    this.rig = createHumanoidRig({
      shirt: data.shirtColor,
      pants: data.pantsColor,
      skin: data.skinColor,
      hair: data.hairColor,
      accent: '#D4AF37',
    });

    const start = data.waypoints[0] || { x: 0, z: 0, y: 0.05 };
    this.position.set(start.x, start.y ?? 0.05, start.z);
    if (data.seatYaw !== undefined) {
      this.yaw = data.seatYaw;
      this.rig.root.rotation.y = this.yaw;
    }
    this.rig.root.position.copy(this.position);
    scene.add(this.rig.root);

    this.physics = physics ?? null;
    this.elevatorSystem = elevatorSystem ?? null;
    this.callbacks = callbacks ?? null;
    if (physics) {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(this.position.x, this.position.y, this.position.z);
      this.body = physics.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.capsule(0.4, 0.25);
      this.collider = physics.world.createCollider(colliderDesc, this.body);
      this.characterController = physics.world.createCharacterController(0.01);
      this.characterController.setApplyImpulsesToDynamicBodies(true);
    }

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
    },
    timePhase?: string
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

    // Reset waypoint index when schedule changes
    if (timePhase && timePhase !== this.lastTimePhase) {
      this.lastTimePhase = timePhase;
      this.wpIndex = 0;
      this.waitTimer = 0;
    }

    // Floor transition via elevator
    if (this.data.schedule && timePhase && this.physics && this.elevatorSystem && this.callbacks && !this.isRidingElevator) {
      const _entry = this.data.schedule.find((s) => s.timePhase === timePhase);
      const _wps = (_entry && _entry.waypoints && _entry.waypoints.length > 0) ? _entry.waypoints : this.data.waypoints;
      const _target = _wps[this.wpIndex % _wps.length];
      const _targetY = _target.y ?? this.position.y;
      const _floorDiff = Math.abs(_targetY - this.position.y);
      if (_floorDiff > 2.0) {
        const _targetFloor = Math.round(_targetY / 4.6);
        this.elevatorSystem.sendNpcToFloor(this as any, _targetFloor, 'east', this.callbacks);
        this.isRidingElevator = true;
      }
    }

    if (this.isRidingElevator) {
      this.rig.root.position.copy(this.position);
      this.phase += dt * 1.4;
      this.updateRigAnimation('idle', dt);
      if (!this.vrmController) this.updateHeadTrack(playerPos, distToPlayer, dt);
      return;
    }

let wps = this.data.waypoints;
    if (this.data.schedule && timePhase) {
      const entry = this.data.schedule.find((s) => s.timePhase === timePhase);
      if (entry && entry.waypoints && entry.waypoints.length > 0) {
        wps = entry.waypoints;
      }
    }
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

          // Physics-based movement (collision with floors/walls/stairs)
          if (this.physics && this.characterController && this.body && this.collider) {
            const desired = { x: (dx / dist) * step, y: -0.02, z: (dz / dist) * step };
            this.physics.characterController.computeColliderMovement(this.collider, desired, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
            const m = this.physics.characterController.computedMovement();
            const cur = this.body.translation();
            const nx = cur.x + m.x;
            const ny = cur.y + m.y;
            const nz = cur.z + m.z;
            this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
            this.position.set(nx, (target.y ?? this.position.y), nz);
          } else {
            this.position.x += (dx / dist) * step;
            this.position.z += (dz / dist) * step;
            if (target.y !== undefined) this.position.y = target.y;
          }

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
  onTalk: (npc: NPCData) => void,
  physics?: PhysicsWorld,
  elevatorSystem?: ElevatorSystem,
  callbacks?: WorldCallbacks
): CampusNPC[] {
  const list = npcsData as NPCData[];
  return list.map((data) => new CampusNPC(scene, data, interactions, onTalk, physics, elevatorSystem, callbacks));
}
