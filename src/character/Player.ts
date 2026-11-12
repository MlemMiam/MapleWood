import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../engine/Physics';
import type { InputSnapshot } from '../engine/InputManager';
import type { AudioManager } from '../engine/AudioManager';
import {
  type AnimState,
  type HumanoidRig,
  animateHumanoid,
  createHumanoidRig,
} from './PlayerAnimations';

const _desiredMove = new THREE.Vector3();

export class Player {
  public readonly rig: HumanoidRig;
  public readonly position = new THREE.Vector3();
  public yaw = 0; // 0 = facing North (-Z)
  public stamina = 100;
  public readonly maxStamina = 100;
  public isGrounded = true;

  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
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
    spawn: { x: number; y: number; z: number; yaw: number }
  ) {
    this.rig = createHumanoidRig(
      {
        shirt: '#1F3864',
        pants: '#1E293B',
        skin: '#E6B89C',
        hair: '#3B281E',
        accent: '#D4AF37',
      },
      true
    );
    this.position.set(spawn.x, spawn.y, spawn.z);
    this.yaw = spawn.yaw;
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.yaw;
    scene.add(this.rig.root);

    const phys = physics.createPlayerBody(spawn.x, spawn.y, spawn.z);
    this.body = phys.body;
    this.collider = phys.collider;
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
      this.gaitPhase += horizDist * (wantsSprint ? 2.4 : 3.2);
      const stepIndex = Math.floor(this.gaitPhase / Math.PI);
      if (stepIndex !== this.lastStepIndex) {
        this.lastStepIndex = stepIndex;
        audio.playFootstep(isExteriorGrass ? 'grass' : 'hard');
      }
    } else {
      this.gaitPhase += dt * 1.4;
    }

    animateHumanoid(this.rig, animState, this.gaitPhase, this.interactTimer, dt);
  }
}
