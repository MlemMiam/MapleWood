import * as THREE from 'three';
import npcsData from '../data/npcs.json';
import type { PhysicsWorld } from '../engine/Physics';
import RAPIER from '@dimforge/rapier3d-compat';
import type { WorldCallbacks } from '../world/WorldContext';
import type { ElevatorSystem } from '../world/buildings/ElevatorSystem';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { AudioManager } from '../engine/AudioManager';
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

import { CAMPUS_DATA, findRoomAtPosition, getFloorFromY, getRoomById } from '../utils/CampusLayout';

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

const NPC_CAPSULE_HALF_HEIGHT = 0.45;
const NPC_CAPSULE_RADIUS = 0.25;
const NPC_CENTER_OFFSET = NPC_CAPSULE_HALF_HEIGHT + NPC_CAPSULE_RADIUS; // 0.70m
const NPC_SKIN_OFFSET = 0.03;
const NPC_APPROACH_AUDIO_RADIUS = 4.2;
const NPC_APPROACH_AUDIO_EXIT_RADIUS = 5.6;

interface NavPoint {
  x: number;
  z: number;
  y: number;
  run?: boolean;
}

function buildDoorwayPath(
  fromX: number,
  fromY: number,
  fromZ: number,
  target: NPCWaypoint
): NavPoint[] {
  const destY = target.y ?? fromY;
  const fromRoom = findRoomAtPosition(fromX, fromZ, fromY);
  const toRoom = findRoomAtPosition(target.x, target.z, destY);

  if (
    !fromRoom ||
    !toRoom ||
    fromRoom.id === toRoom.id ||
    fromRoom.floor !== toRoom.floor
  ) {
    return [{ x: target.x, z: target.z, y: destY, run: target.run }];
  }

  // Build undirected adjacency graph from rooms.json on this floor
  const adj = new Map<string, Array<{ to: string; x: number; z: number }>>();
  const pushEdge = (a: string, b: string, x: number, z: number) => {
    let list = adj.get(a);
    if (!list) {
      list = [];
      adj.set(a, list);
    }
    if (!list.some((e) => e.to === b)) {
      list.push({ to: b, x, z });
    }
  };
  for (const r of CAMPUS_DATA.rooms) {
    if (r.floor !== fromRoom.floor) continue;
    for (const d of r.doors) {
      const nb = getRoomById(d.to);
      if (!nb || nb.floor !== fromRoom.floor) continue;
      pushEdge(r.id, d.to, d.x, d.z);
      pushEdge(d.to, r.id, d.x, d.z);
    }
  }

  // BFS from fromRoom.id -> toRoom.id
  const queue: string[] = [fromRoom.id];
  const parent = new Map<string, { prevId: string; x: number; z: number } | null>();
  parent.set(fromRoom.id, null);

  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === toRoom.id) {
      found = true;
      break;
    }
    for (const edge of adj.get(cur) ?? []) {
      if (!parent.has(edge.to)) {
        parent.set(edge.to, { prevId: cur, x: edge.x, z: edge.z });
        queue.push(edge.to);
      }
    }
  }

  if (!found) {
    return [{ x: target.x, z: target.z, y: destY, run: target.run }];
  }

  const doors: Array<{ roomA: string; roomB: string; x: number; z: number }> = [];
  let cursor = toRoom.id;
  while (cursor !== fromRoom.id) {
    const step = parent.get(cursor);
    if (!step) break;
    doors.unshift({ roomA: step.prevId, roomB: cursor, x: step.x, z: step.z });
    cursor = step.prevId;
  }

  const path: NavPoint[] = [];
  for (let i = 0; i < doors.length; i++) {
    const curDoor = doors[i];
    path.push({ x: curDoor.x, z: curDoor.z, y: destY, run: target.run });
    // If traversing a corridor between two doorways, walk down the corridor centerline first
    if (i + 1 < doors.length) {
      const nextDoor = doors[i + 1];
      const midRoom = getRoomById(curDoor.roomB);
      if (midRoom && midRoom.type === 'corridor') {
        path.push({
          x: nextDoor.x,
          z: midRoom.position.z,
          y: destY,
          run: target.run,
        });
      }
    }
  }

  path.push({ x: target.x, z: target.z, y: destY, run: target.run });
  return path;
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
  private audio: Pick<AudioManager, 'playNpcApproachSnippet'> | null = null;
  private wasPlayerNear = false;
  private approachAudioCooldown = 0;
  private isRidingElevator = false;
  private pendingElevatorFloor: number | null = null;
  private pendingElevatorSide: 'east' | 'west' = 'east';
  private lastTimePhase: string | null = null;
  private navQueue: NavPoint[] = [];
  private navTargetKey = '';
  private arrivedSingleTargetKey = '';
  private blockedTimer = 0;
  private steerSign = 1;
  private stuckTimer = 0;
  private nudgeCount = 0;
  private readonly stuckAnchor = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    data: NPCData,
    interactions: InteractionSystem,
    onTalk: (npc: NPCData) => void,
    physics?: PhysicsWorld,
    elevatorSystem?: ElevatorSystem,
    callbacks?: WorldCallbacks,
    audio?: Pick<AudioManager, 'playNpcApproachSnippet'>
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
    this.stuckAnchor.copy(this.position);
    if (data.seatYaw !== undefined) {
      this.yaw = data.seatYaw;
      this.rig.root.rotation.y = this.yaw;
    }
    this.rig.root.position.copy(this.position);
    scene.add(this.rig.root);

    this.physics = physics ?? null;
    this.elevatorSystem = elevatorSystem ?? null;
    this.callbacks = callbacks ?? null;
    this.audio = audio ?? null;
    if (physics) {
      const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        this.position.x,
        this.position.y + NPC_CENTER_OFFSET + NPC_SKIN_OFFSET,
        this.position.z
      );
      this.body = physics.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.capsule(
        NPC_CAPSULE_HALF_HEIGHT,
        NPC_CAPSULE_RADIUS
      );
      this.collider = physics.world.createCollider(colliderDesc, this.body);
      this.characterController = physics.world.createCharacterController(NPC_SKIN_OFFSET);
      this.characterController.enableAutostep(0.28, 0.18, true);
      this.characterController.enableSnapToGround(0.25);
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

  public syncPhysicsBody(
    x = this.position.x,
    y = this.position.y,
    z = this.position.z
  ): void {
    if (!this.body) return;
    const bodyPos = { x, y: y + NPC_CENTER_OFFSET + NPC_SKIN_OFFSET, z };
    this.body.setTranslation(bodyPos, true);
    this.body.setNextKinematicTranslation(bodyPos);
  }

  private resetNavigationState(resetWaypoints = false): void {
    this.navQueue = [];
    this.navTargetKey = '';
    this.blockedTimer = 0;
    this.stuckTimer = 0;
    this.nudgeCount = 0;
    this.stuckAnchor.copy(this.position);
    this.pendingElevatorFloor = null;
    if (resetWaypoints) {
      this.wpIndex = 0;
      this.waitTimer = 0;
      this.arrivedSingleTargetKey = '';
    }
  }

  public finishElevatorRide(): void {
    this.isRidingElevator = false;
    this.resetNavigationState(false);
    this.syncPhysicsBody();
    this.rig.root.position.copy(this.position);
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

  private moveWithCollision(
    dirX: number,
    dirZ: number,
    step: number,
    fallbackY: number,
    dt: number
  ): number {
    if (this.physics && this.characterController && this.body && this.collider) {
      const cur = this.body.translation();
      // Gentle downward snap velocity matching Player locomotion so capsules never tunnel thin floor slabs
      const desiredY = Math.max(-0.025, -0.5 * dt);

      const tryMove = (vx: number, vz: number) => {
        this.characterController!.computeColliderMovement(
          this.collider!,
          { x: vx * step, y: desiredY, z: vz * step },
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
        );
        return this.characterController!.computedMovement();
      };

      let bestM = tryMove(dirX, dirZ);
      let bestHoriz = Math.hypot(bestM.x, bestM.z);

      // If blocked (e.g. corner of furniture, doorway frame, or player), test lateral steering angles
      if (step > 0.002 && bestHoriz < step * 0.25) {
        const angles = [
          this.steerSign * 0.65,
          this.steerSign * 1.25,
          -this.steerSign * 0.65,
          -this.steerSign * 1.25,
        ];
        for (const a of angles) {
          const cosA = Math.cos(a);
          const sinA = Math.sin(a);
          const rx = dirX * cosA - dirZ * sinA;
          const rz = dirX * sinA + dirZ * cosA;
          const cand = tryMove(rx, rz);
          const candHoriz = Math.hypot(cand.x, cand.z);
          if (candHoriz > bestHoriz) {
            bestM = cand;
            bestHoriz = candHoriz;
            if (candHoriz > step * 0.55) break;
          }
        }
        if (bestHoriz < step * 0.35) {
          this.blockedTimer += dt;
          if (this.blockedTimer > 0.6) {
            this.steerSign *= -1;
            this.blockedTimer = 0;
          }
        } else {
          this.blockedTimer = 0;
        }
      } else {
        this.blockedTimer = Math.max(0, this.blockedTimer - dt * 2);
      }

      const nx = cur.x + bestM.x;
      let ny = cur.y + bestM.y;
      const nz = cur.z + bestM.z;
      // Compute feet height matching Player (ny - capsuleHalfTotalHeight)
      let feetY = Number.isFinite(ny) ? ny - NPC_CENTER_OFFSET : fallbackY;
      // Guard against falling/tunneling below the expected floor slab on startup or async trimesh load
      if (feetY < fallbackY - 0.12) {
        feetY = fallbackY + NPC_SKIN_OFFSET;
        ny = feetY + NPC_CENTER_OFFSET;
        this.body.setTranslation({ x: nx, y: ny, z: nz }, true);
      }
      this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
      this.position.set(nx, feetY, nz);
      return bestHoriz;
    }

    this.position.x += dirX * step;
    this.position.z += dirZ * step;
    this.position.y = fallbackY;
    return step;
  }

  private nudgeOutOfStuck(dirX: number, dirZ: number, fallbackY: number, isRunning = false): void {
    const perpX = -dirZ * this.steerSign;
    const perpZ = dirX * this.steerSign;
    const nudgeStep = 0.75;
    let chosenCx = perpX;
    let chosenCz = perpZ;
    let nx = this.position.x;
    let nz = this.position.z;

    if (this.physics && this.characterController && this.body && this.collider) {
      const cur = this.body.translation();
      const rawCandidates: Array<[number, number]> = [
        [perpX, perpZ],
        [-perpX, -perpZ],
        [perpX - dirX * 0.55, perpZ - dirZ * 0.55],
        [-perpX - dirX * 0.55, -perpZ - dirZ * 0.55],
        [-dirX, -dirZ],
      ];
      let bestM: { x: number; y: number; z: number } | null = null;
      let bestDist = 0;
      for (const [rx, rz] of rawCandidates) {
        const len = Math.hypot(rx, rz) || 1;
        const cx = rx / len;
        const cz = rz / len;
        this.characterController.computeColliderMovement(
          this.collider,
          { x: cx * nudgeStep, y: 0.02, z: cz * nudgeStep },
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
        );
        const m = this.characterController.computedMovement();
        const d = Math.hypot(m.x, m.z);
        if (d > bestDist) {
          bestDist = d;
          bestM = m;
          chosenCx = cx;
          chosenCz = cz;
        }
      }
      if (bestM && bestDist > 0.05) {
        nx = cur.x + bestM.x;
        const ny = Math.max(cur.y + bestM.y, fallbackY + NPC_CENTER_OFFSET + NPC_SKIN_OFFSET);
        nz = cur.z + bestM.z;
        this.body.setTranslation({ x: nx, y: ny, z: nz }, true);
        this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
        this.position.set(nx, ny - NPC_CENTER_OFFSET, nz);
      }
    } else {
      nx = this.position.x + perpX * nudgeStep;
      nz = this.position.z + perpZ * nudgeStep;
      this.position.x = nx;
      this.position.z = nz;
    }

    // Align steerSign with chosen lateral side, or reverse for next attempt if backing out
    const perpDot = chosenCx * perpX + chosenCz * perpZ;
    if (perpDot < -0.25) {
      this.steerSign *= -1;
    } else if (Math.abs(perpDot) < 0.15) {
      this.steerSign *= -1;
    }

    const activePerpX = -dirZ * this.steerSign;
    const activePerpZ = dirX * this.steerSign;
    const forwardDot = chosenCx * dirX + chosenCz * dirZ;

    // Insert temporary detour sub-waypoint(s) at the head of navQueue so NPC sidesteps around obstacle
    const detourPoint: NavPoint =
      forwardDot < -0.35
        ? {
            x: nx + chosenCx * 0.65 + activePerpX * 1.6,
            z: nz + chosenCz * 0.65 + activePerpZ * 1.6,
            y: fallbackY,
            run: isRunning,
          }
        : {
            x: nx + chosenCx * 1.15,
            z: nz + chosenCz * 1.15,
            y: fallbackY,
            run: isRunning,
          };
    this.navQueue.unshift(detourPoint);

    this.stuckTimer = 0;
    this.blockedTimer = 0;
    this.nudgeCount += 1;
    this.stuckAnchor.copy(this.position);
  }

  private updateApproachAudio(
    dt: number,
    playerPos: THREE.Vector3,
    distToPlayer: number,
    isTalkingToThis: boolean,
    allowMovement: boolean
  ): void {
    if (this.approachAudioCooldown > 0) {
      this.approachAudioCooldown = Math.max(0, this.approachAudioCooldown - dt);
    }

    const sameFloor = Math.abs(playerPos.y - this.position.y) < 1.8;
    const withinTriggerRadius = distToPlayer <= NPC_APPROACH_AUDIO_RADIUS && sameFloor;
    const outsideExitRadius =
      distToPlayer > NPC_APPROACH_AUDIO_EXIT_RADIUS ||
      Math.abs(playerPos.y - this.position.y) >= 2.2;

    if (outsideExitRadius) {
      this.wasPlayerNear = false;
      return;
    }

    if (withinTriggerRadius) {
      if (allowMovement && !isTalkingToThis && !this.wasPlayerNear && this.approachAudioCooldown <= 0) {
        const snippet: 'hello' | 'nod' = Math.random() < 0.55 ? 'hello' : 'nod';
        const voice: 'helen' | 'student' =
          this.data.id === 'npc-receptionist' ? 'helen' : 'student';
        this.audio?.playNpcApproachSnippet(snippet, voice);
        this.approachAudioCooldown = 14 + Math.random() * 6;
      }
      this.wasPlayerNear = true;
    }
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
    timePhase?: string,
    allowMovement = true
  ): void {
    this.vrmController?.setNpcDialogueVisuals?.({
      lookAtPos: isTalkingToThis ? (dialogueVisuals?.lookAtPos ?? null) : null,
      isTalking: isTalkingToThis,
      speechLevel: isTalkingToThis ? (dialogueVisuals?.speechLevel ?? 0) : 0,
      speechTime: dialogueVisuals?.speechTime ?? 0,
      visemeHint: isTalkingToThis ? (dialogueVisuals?.visemeHint ?? null) : null,
    });
    const distToPlayer = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);
    this.updateApproachAudio(dt, playerPos, distToPlayer, isTalkingToThis, allowMovement);

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

    // During dialogue with this NPC, pause walking and face player cleanly
    if (isTalkingToThis) {
      const talkYaw = Math.atan2(
        -(playerPos.x - this.position.x),
        -(playerPos.z - this.position.z)
      );
      let diff = talkYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 8);
      this.rig.root.rotation.y = this.yaw;
      this.rig.root.position.copy(this.position);
      this.phase += dt * 1.4;
      this.updateRigAnimation('idle', dt);
      if (!this.vrmController) {
        this.updateHeadTrack(playerPos, distToPlayer, dt);
      }
      return;
    }

    if (this.isRidingElevator) {
      this.rig.root.position.copy(this.position);
      this.syncPhysicsBody();
      this.phase += dt * 1.4;
      this.updateRigAnimation('idle', dt);
      if (!this.vrmController) this.updateHeadTrack(playerPos, distToPlayer, dt);
      return;
    }

    if (!allowMovement) {
      this.rig.root.position.copy(this.position);
      this.phase += dt * 1.4;
      if (shouldAnimateRig) {
        this.updateRigAnimation('idle', isFar ? dt * 4 : dt);
        if (!isFar && !this.vrmController) {
          this.updateHeadTrack(playerPos, distToPlayer, dt);
        }
      }
      return;
    }

    // Reset navigation state machine cleanly when schedule timePhase changes
    if (timePhase && timePhase !== this.lastTimePhase) {
      this.lastTimePhase = timePhase;
      this.resetNavigationState(true);
    }

    let wps = this.data.waypoints;
    if (this.data.schedule && timePhase) {
      const entry = this.data.schedule.find((s) => s.timePhase === timePhase);
      if (entry && entry.waypoints && entry.waypoints.length > 0) {
        wps = entry.waypoints;
      }
    }

    let animState: AnimState = 'idle';
    if (wps.length >= 1) {
      if (this.waitTimer > 0) {
        this.waitTimer -= dt;
        this.phase += dt * 1.4;
      } else {
        const target = wps[this.wpIndex % wps.length];
        const tKey = `${timePhase ?? 'default'}:${this.wpIndex % wps.length}`;
        const curFloor = getFloorFromY(this.position.y);
        const targetFloor = getFloorFromY(target.y ?? this.position.y);

        if (wps.length === 1 && this.arrivedSingleTargetKey === tKey) {
          this.phase += dt * 1.4;
        } else if (
          curFloor !== targetFloor &&
          this.physics &&
          this.elevatorSystem &&
          this.callbacks
        ) {
          // If target is on a different floor, route to the nearest elevator lobby first before boarding
          if (this.pendingElevatorFloor !== targetFloor) {
            this.pendingElevatorFloor = targetFloor;
            this.pendingElevatorSide = this.position.x >= 0 ? 'east' : 'west';
            const lobbyX = this.pendingElevatorSide === 'east' ? 14.25 : -14.25;
            const lobbyZ = -24.5;
            this.navTargetKey = `elev-${targetFloor}-${this.pendingElevatorSide}`;
            this.navQueue = buildDoorwayPath(this.position.x, this.position.y, this.position.z, {
              x: lobbyX,
              z: lobbyZ,
              y: this.position.y,
            });
            this.stuckTimer = 0;
            this.stuckAnchor.copy(this.position);
          }
          const lobbyGoal = this.navQueue[0];
          if (lobbyGoal) {
            const dx = lobbyGoal.x - this.position.x;
            const dz = lobbyGoal.z - this.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 0.45) {
              this.navQueue.shift();
              this.stuckTimer = 0;
              this.stuckAnchor.copy(this.position);
              if (this.navQueue.length === 0) {
                this.elevatorSystem.sendNpcToFloor(
                  this,
                  targetFloor,
                  this.pendingElevatorSide,
                  this.callbacks
                );
                this.isRidingElevator = true;
                return;
              }
            } else {
              animState = 'walk';
              const step = Math.min(dist, 1.65 * dt);
              const moved = this.moveWithCollision(dx / dist, dz / dist, step, lobbyGoal.y, dt);
              const targetYaw = Math.atan2(-dx, -dz);
              let diff = targetYaw - this.yaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              this.yaw += diff * Math.min(1, dt * 8);
              this.rig.root.rotation.y = this.yaw;
              this.phase += moved * 3.6;

              const progress = Math.hypot(
                this.position.x - this.stuckAnchor.x,
                this.position.z - this.stuckAnchor.z
              );
              if (progress >= 0.45) {
                this.stuckTimer = 0;
                this.stuckAnchor.copy(this.position);
              } else {
                this.stuckTimer += dt;
                if (this.stuckTimer >= 5.0) {
                  this.nudgeOutOfStuck(dx / dist, dz / dist, lobbyGoal.y, false);
                }
              }
            }
          }
        } else {
          this.pendingElevatorFloor = null;
          if (this.navTargetKey !== tKey || this.navQueue.length === 0) {
            const directDist = Math.hypot(target.x - this.position.x, target.z - this.position.z);
            if (directDist >= 0.25) {
              this.navTargetKey = tKey;
              this.navQueue = buildDoorwayPath(
                this.position.x,
                this.position.y,
                this.position.z,
                target
              );
            }
          }

          const navNext = this.navQueue[0] ?? {
            x: target.x,
            z: target.z,
            y: target.y ?? this.position.y,
            run: target.run,
          };
          const dx = navNext.x - this.position.x;
          const dz = navNext.z - this.position.z;
          const dist = Math.hypot(dx, dz);

          const isFinalSubGoal = this.navQueue.length <= 1;
          const arrivalRadius = isFinalSubGoal ? 0.25 : 0.45;

          if (dist < arrivalRadius) {
            if (this.navQueue.length > 1) {
              this.navQueue.shift();
              this.blockedTimer = 0;
              this.stuckTimer = 0;
              this.nudgeCount = 0;
              this.stuckAnchor.copy(this.position);
            } else {
              // Destination reached -> cleanly reset navigation state machine
              this.resetNavigationState(false);
              if (wps.length > 1) {
                this.wpIndex = (this.wpIndex + 1) % wps.length;
                this.waitTimer = 0;
              } else {
                this.arrivedSingleTargetKey = tKey;
                this.phase += dt * 1.4;
              }
            }
          } else {
            const isRunning = Boolean(navNext.run);
            animState = isRunning ? 'run' : 'walk';
            const speed = isRunning ? 4.2 : 1.65;
            const step = Math.min(dist, speed * dt);
            const moved = this.moveWithCollision(dx / dist, dz / dist, step, navNext.y, dt);

            const targetYaw = Math.atan2(-dx, -dz);
            let diff = targetYaw - this.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.yaw += diff * Math.min(1, dt * 8);
            this.rig.root.rotation.y = this.yaw;

            this.phase += (moved > 0.0005 ? moved : step * 0.35) * (isRunning ? 2.05 : 3.6);

            // Check if NPC remained at roughly the same position for more than 5 seconds
            const progressFromAnchor = Math.hypot(
              this.position.x - this.stuckAnchor.x,
              this.position.z - this.stuckAnchor.z
            );
            if (progressFromAnchor >= 0.45) {
              this.stuckTimer = 0;
              this.stuckAnchor.copy(this.position);
            } else {
              this.stuckTimer += dt;
              if (this.stuckTimer >= 5.0) {
                if (this.nudgeCount >= 2) {
                  // Obstacle permanently blocks current waypoint (e.g. waypoint inside staircase); advance cleanly
                  this.resetNavigationState(false);
                  if (wps.length > 1) {
                    this.wpIndex = (this.wpIndex + 1) % wps.length;
                  } else {
                    this.arrivedSingleTargetKey = tKey;
                  }
                } else {
                  this.nudgeOutOfStuck(dx / dist, dz / dist, navNext.y, isRunning);
                }
              }
            }
          }
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
  callbacks?: WorldCallbacks,
  audio?: Pick<AudioManager, 'playNpcApproachSnippet'>
): CampusNPC[] {
  const list = npcsData as NPCData[];
  return list.map(
    (data) =>
      new CampusNPC(scene, data, interactions, onTalk, physics, elevatorSystem, callbacks, audio)
  );
}
