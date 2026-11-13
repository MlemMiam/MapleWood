import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../engine/Physics';
import type { InputSnapshot } from '../engine/InputManager';
import type { AudioManager } from '../engine/AudioManager';
import {
  type AnimState,
  type HumanoidRig,
  animateHumanoid,
  animateHumanoidIntro,
  createFlorieRig,
} from './PlayerAnimations';
import {
  type FlorieVRMController,
  discoverFlorieVrmBuffer,
  parseFlorieVrmFromBuffer,
  saveVrmBufferToCache,
} from './FlorieVRM';

const _desiredMove = new THREE.Vector3();

export class Player {
  public readonly rig: HumanoidRig;
  public readonly position = new THREE.Vector3();
  public yaw = 0; // 0 = facing North (-Z)
  public stamina = 100;
  public readonly maxStamina = 100;
  public isGrounded = true;
  public vrmLabel: string | null = 'Florie.vrm';
  public readonly readyPromise: Promise<void>;

  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private vrmController: FlorieVRMController | null = null;
  private onVrmLoaded?: (label: string) => void;
  private verticalVel = 0;
  private gaitPhase = 0;
  private lastStepIndex = 0;
  private interactTimer = 0;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private readonly walkSpeed = 2.5;
  private readonly runSpeed = 5.5;
  private readonly gravity = 18.0;
  private readonly jumpSpeed = Math.sqrt(2 * 18.0 * 1.2); // Exact 1.2m jump apex

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    spawn: { x: number; y: number; z: number; yaw: number },
    onVrmLoaded?: (label: string) => void
  ) {
    this.onVrmLoaded = onVrmLoaded;
    this.rig = createFlorieRig();
    this.position.set(spawn.x, spawn.y, spawn.z);
    this.yaw = spawn.yaw;
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.yaw;
    scene.add(this.rig.root);

    const phys = physics.createPlayerBody(spawn.x, spawn.y, spawn.z);
    this.body = phys.body;
    this.collider = phys.collider;

    // Automatically discover & load Florie.vrm by default at startup
    this.readyPromise = this.autoLoadFlorieVrm();
  }

  private async autoLoadFlorieVrm(): Promise<void> {
    const found = await discoverFlorieVrmBuffer();
    if (!found) return;
    try {
      await this.applyVrmBuffer(found.buffer, found.label, false);
    } catch {
      // Keep sculpted Florie protagonist rig if the VRM buffer fails to parse
    }
  }

  public async applyVrmBuffer(
    buffer: ArrayBuffer,
    fileName = 'Florie.vrm',
    persistToCache = true
  ): Promise<string> {
    const controller = await parseFlorieVrmFromBuffer(buffer, fileName);

    // Remove previous VRM container if replacing
    if (this.vrmController) {
      this.rig.root.remove(this.vrmController.container);
    }

    // Hide fallback procedural Florie body while VRM is active
    this.rig.bodyGroup.visible = false;
    this.vrmController = controller;
    this.vrmLabel = controller.sourceLabel;
    this.rig.root.add(controller.container);

    if (persistToCache) {
      await saveVrmBufferToCache(buffer, fileName);
    }

    this.onVrmLoaded?.(controller.sourceLabel);
    return controller.sourceLabel;
  }

  public triggerInteractAnim(): void {
    this.interactTimer = 0.35;
  }

  public teleport(x: number, y: number, z: number, yaw = 0): void {
    this.position.set(x, y, z);
    this.yaw = yaw;
    this.verticalVel = 0;
    const bodyPos = { x, y: y + 0.875, z };
    this.body.setTranslation(bodyPos, true);
    this.body.setNextKinematicTranslation(bodyPos);
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.yaw;
  }

  public update(
    dt: number,
    input: InputSnapshot,
    cameraYaw: number,
    physics: PhysicsWorld,
    audio: AudioManager,
    isExteriorGrass: boolean
  ): void {
    if (this.interactTimer > 0) {
      this.interactTimer = Math.max(0, this.interactTimer - dt);
    }

    // Movement vector relative to camera yaw
    const sinYaw = Math.sin(cameraYaw);
    const cosYaw = Math.cos(cameraYaw);
    const forwardX = -sinYaw;
    const forwardZ = -cosYaw;
    const rightX = cosYaw;
    const rightZ = -sinYaw;

    _desiredMove.set(
      forwardX * input.moveZ + rightX * input.moveX,
      0,
      forwardZ * input.moveZ + rightZ * input.moveX
    );

    const moving = _desiredMove.lengthSq() > 0.001;
    if (moving) _desiredMove.normalize();

    // Stamina & Sprint logic
    const wantsSprint = input.sprint && moving && this.stamina > 2;
    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - 22 * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 16 * dt);
    }

    const speed = wantsSprint ? this.runSpeed : this.walkSpeed;

    // Coyote time + Jump buffer
    if (this.isGrounded) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (input.jumpJustPressed) {
      this.jumpBufferTimer = 0.12;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.verticalVel = this.jumpSpeed;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    // Gravity
    this.verticalVel = Math.max(-24, this.verticalVel - this.gravity * dt);

    const desiredDx = _desiredMove.x * speed * dt;
    const desiredDy = this.verticalVel * dt;
    const desiredDz = _desiredMove.z * speed * dt;

    physics.characterController.computeColliderMovement(this.collider, {
      x: desiredDx,
      y: desiredDy,
      z: desiredDz,
    });

    const corrected = physics.characterController.computedMovement();
    this.isGrounded = physics.characterController.computedGrounded();
    if (this.isGrounded && this.verticalVel < 0) {
      this.verticalVel = -0.5;
    }

    const cur = this.body.translation();
    const nx = cur.x + corrected.x;
    const ny = cur.y + corrected.y;
    const nz = cur.z + corrected.z;
    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });

    // Capsule center sits 0.875m above feet
    this.position.set(nx, ny - 0.875, nz);
    this.rig.root.position.copy(this.position);

    // Smoothly turn character toward horizontal velocity direction
    const horizDist = Math.hypot(corrected.x, corrected.z);
    if (moving && horizDist > 0.001) {
      const targetYaw = Math.atan2(-_desiredMove.x, -_desiredMove.z);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 12);
    }
    this.rig.root.rotation.y = this.yaw;

    // Distance-synced gait animation + footsteps
    let animState: AnimState = 'idle';
    if (!this.isGrounded) {
      animState = 'jump';
    } else if (moving && horizDist > 0.002) {
      animState = wantsSprint ? 'run' : 'walk';
      this.gaitPhase += horizDist * (wantsSprint ? 2.15 : 2.65);
      const stepIndex = Math.floor(this.gaitPhase / Math.PI);
      if (stepIndex !== this.lastStepIndex) {
        this.lastStepIndex = stepIndex;
        audio.playFootstep(isExteriorGrass ? 'grass' : 'hard');
      }
    }

    if (this.vrmController) {
      this.vrmController.update(animState, this.gaitPhase, this.interactTimer, dt);
    } else {
      animateHumanoid(this.rig, animState, this.gaitPhase, this.interactTimer, dt);
    }
  }

  public updateIntroCutscene(introTime: number, dt: number): void {
    const isBeckonPhase = introTime >= 4.8;
    const targetZ = isBeckonPhase
      ? THREE.MathUtils.lerp(4.4, 3.85, Math.min(1, (introTime - 4.8) / 3.8))
      : 4.4;
    const targetYaw = isBeckonPhase ? Math.PI - 0.36 : Math.PI;

    this.position.set(0, 0, targetZ);
    const damp = 1 - Math.exp(-8 * dt);
    this.yaw = THREE.MathUtils.lerp(this.yaw, targetYaw, damp);

    const bodyPos = { x: this.position.x, y: this.position.y + 0.875, z: this.position.z };
    this.body.setTranslation(bodyPos, true);
    this.body.setNextKinematicTranslation(bodyPos);

    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.yaw;

    if (this.vrmController) {
      this.vrmController.updateIntroCutscene(introTime, dt);
    } else {
      animateHumanoidIntro(this.rig, introTime, dt);
    }
  }
}

