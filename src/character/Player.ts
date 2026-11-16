import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
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
import { BLENDER_SIT_DURATIONS, sampleSitRootTravel } from './BlenderSitAnim';
import {
  type PlayerGender,
  type PlayerHairSelection,
  applyHairSelectionToVrm,
  loadBaseScalpMeshData,
  loadHairCatalog,
  loadPlayerVrmBuffer,
} from './PlayerHairSystem';
import {
  type PlayerClothesSelection,
  type PlayerDisplayOptions,
  DEFAULT_PLAYER_DISPLAY_OPTIONS,
  applyClothesSelectionToVrm,
  getDefaultClothesSelection,
  loadClothesCatalog,
  loadClothesTemplates,
} from './PlayerClothesSystem';

const _desiredMove = new THREE.Vector3();

export class Player {
  public readonly rig: HumanoidRig;
  public readonly position = new THREE.Vector3();
  public yaw = 0; // 0 = facing North (-Z)
  public stamina = 100;
  public readonly maxStamina = 100;
  public isGrounded = true;
  public isRidingElevator = false;
  public elevatorY = 0;
  public vrmLabel: string | null = 'Florie.vrm';
  public readonly readyPromise: Promise<void>;

  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private vrmController: FlorieVRMController | null = null;
  private florieIntroController: FlorieVRMController | null = null;
  private customFemPlayerController: FlorieVRMController | null = null;
  private customMalePlayerController: FlorieVRMController | null = null;
  private onVrmLoaded?: (label: string) => void;
  private verticalVel = 0;
  private gaitPhase = 0;
  private lastStepIndex = 0;
  private interactTimer = 0;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private sitPhase: 'none' | 'approaching' | 'sitting' | 'seated' | 'standing' = 'none';
  private sitTimer = 0;
  private sitOriginPos = new THREE.Vector3();
  private sitStartPos = new THREE.Vector3();
  private sitFrontPos = new THREE.Vector3();
  private sitTargetPos = new THREE.Vector3();
  private sitStartYaw = 0;
  private sitTargetYaw = 0;
  private readonly walkSpeed = 1.95;
  private readonly runSpeed = 4.9;
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
    if (fileName.toLowerCase().includes('florie')) {
      this.florieIntroController = controller;
    }
    this.vrmLabel = controller.sourceLabel;
    this.rig.root.add(controller.container);

    if (persistToCache) {
      await saveVrmBufferToCache(buffer, fileName);
    }

    this.onVrmLoaded?.(controller.sourceLabel);
    return controller.sourceLabel;
  }

  public async applyCustomPlayerAvatar(
    gender: PlayerGender,
    hairSelection: PlayerHairSelection,
    clothesSelection?: PlayerClothesSelection,
    displayOptions: PlayerDisplayOptions = DEFAULT_PLAYER_DISPLAY_OPTIONS
  ): Promise<void> {
    try {
      const [playerBuffer, hairCatalog, baseScalp, clothesCatalog, clothesTemplates] =
        await Promise.all([
          loadPlayerVrmBuffer(gender),
          loadHairCatalog(),
          loadBaseScalpMeshData(),
          loadClothesCatalog(),
          loadClothesTemplates(),
        ]);

      const label = gender === 'male' ? 'MalePlayer.vrm' : 'FemPlayer.vrm';
      let targetController =
        gender === 'male' ? this.customMalePlayerController : this.customFemPlayerController;

      if (!targetController) {
        targetController = await parseFlorieVrmFromBuffer(playerBuffer.slice(0), label);
        if (gender === 'male') {
          this.customMalePlayerController = targetController;
        } else {
          this.customFemPlayerController = targetController;
        }
      }

      if (targetController.vrm) {
        const hairRoot = applyHairSelectionToVrm(
          targetController.vrm,
          hairSelection,
          hairCatalog,
          baseScalp
        );
        if (hairRoot) {
          hairRoot.visible = displayOptions.showHair;
        }
        applyClothesSelectionToVrm(
          targetController.vrm,
          gender,
          clothesSelection || getDefaultClothesSelection(gender),
          clothesCatalog,
          clothesTemplates,
          displayOptions
        );
      }

      if (this.vrmController) {
        this.rig.root.remove(this.vrmController.container);
      }
      this.rig.bodyGroup.visible = false;
      this.vrmController = targetController;
      this.vrmLabel = label;
      this.rig.root.add(targetController.container);
      this.onVrmLoaded?.(label);
    } catch (err) {
      console.error('Failed to apply custom Player avatar:', err);
    }
  }

  public async applyCustomFemPlayerAvatar(
    hairSelection: PlayerHairSelection,
    clothesSelection?: PlayerClothesSelection,
    displayOptions?: PlayerDisplayOptions
  ): Promise<void> {
    return this.applyCustomPlayerAvatar('female', hairSelection, clothesSelection, displayOptions);
  }

  public restoreFlorieIntroAvatar(): void {
    if (!this.florieIntroController || this.vrmController === this.florieIntroController) {
      return;
    }
    if (this.vrmController) {
      this.rig.root.remove(this.vrmController.container);
    }
    this.vrmController = this.florieIntroController;
    this.vrmLabel = this.florieIntroController.sourceLabel;
    this.rig.root.add(this.florieIntroController.container);
    this.onVrmLoaded?.(this.vrmLabel);
  }

  public triggerInteractAnim(): void {
    this.interactTimer = 0.35;
  }

  public isSeated(): boolean {
    return this.sitPhase !== 'none';
  }

  public sitAt(x: number, y: number, z: number, yaw: number): void {
    if (this.sitPhase !== 'none') return;
    this.sitOriginPos.copy(this.position);
    this.sitStartPos.copy(this.position);
    this.sitStartYaw = this.yaw;
    this.sitTargetPos.set(x, y, z);
    this.sitTargetYaw = yaw;
    // Stand/front edge spot 0.85m in front of seat center (clear of armchair/sofa & table colliders)
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    this.sitFrontPos.set(x + fwdX * 0.85, y, z + fwdZ * 0.85);
    this.collider.setSensor(true);
    this.sitTimer = 0;
    this.sitPhase = 'approaching';
  }

  public standUp(): void {
    if (this.sitPhase === 'none' || this.sitPhase === 'standing') return;
    this.sitStartPos.copy(this.position);
    this.sitStartYaw = this.yaw;
    this.sitTimer = 0;
    this.sitPhase = 'standing';
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
    footstepSurface: 'grass' | 'carpet' | 'hard'
  ): void {
    if (this.interactTimer > 0) {
      this.interactTimer = Math.max(0, this.interactTimer - dt);
    }

    if (this.sitPhase !== 'none') {
      this.stamina = Math.min(this.maxStamina, this.stamina + 24 * dt);
      const wantsExit =
        Math.abs(input.moveX) > 0.1 ||
        Math.abs(input.moveZ) > 0.1 ||
        input.jumpJustPressed;

      if (this.sitPhase === 'approaching') {
        if (wantsExit) {
          this.collider.setSensor(false);
          this.sitPhase = 'none';
          return;
        }
        const dur = 0.65;
        this.sitTimer += dt;
        const u = Math.min(1, this.sitTimer / dur);
        const s = u * u * (3 - 2 * u);
        this.position.lerpVectors(this.sitStartPos, this.sitFrontPos, s);
        let diff = this.sitTargetYaw - this.sitStartYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.yaw = this.sitStartYaw + diff * s;
        this.teleport(this.position.x, this.position.y, this.position.z, this.yaw);
        this.gaitPhase += dt * 4.2;
        const anim: AnimState = u < 0.72 ? 'walk' : 'idle';
        if (this.vrmController) {
          this.vrmController.update(anim, this.gaitPhase, this.interactTimer, dt);
        } else {
          animateHumanoid(this.rig, anim, this.gaitPhase, this.interactTimer, dt);
        }
        if (u >= 1) {
          this.sitStartPos.copy(this.sitFrontPos);
          this.sitPhase = 'sitting';
          this.sitTimer = 0;
        }
        return;
      }

      if (this.sitPhase === 'sitting') {
        const dur = BLENDER_SIT_DURATIONS.sit_down;
        this.sitTimer += dt;
        const u = Math.min(1, this.sitTimer / dur);
        const travel = sampleSitRootTravel('sit_down', this.sitTimer);
        const fwdX = -Math.sin(this.sitTargetYaw);
        const fwdZ = -Math.cos(this.sitTargetYaw);
        this.teleport(
          this.sitTargetPos.x + fwdX * travel,
          this.sitTargetPos.y,
          this.sitTargetPos.z + fwdZ * travel,
          this.sitTargetYaw
        );
        this.gaitPhase += dt * 1.4;
        if (this.vrmController) {
          this.vrmController.update('sit_down', this.gaitPhase, this.interactTimer, dt);
        } else {
          animateHumanoid(this.rig, 'sit', this.gaitPhase, this.interactTimer, dt);
        }
        if (u >= 1) {
          this.teleport(this.sitTargetPos.x, this.sitTargetPos.y, this.sitTargetPos.z, this.sitTargetYaw);
          this.sitPhase = 'seated';
        }
        return;
      }

      if (this.sitPhase === 'seated') {
        if (wantsExit) {
          this.standUp();
        } else {
          this.gaitPhase += dt * 1.4;
          if (this.vrmController) {
            this.vrmController.update('sit', this.gaitPhase, this.interactTimer, dt);
          } else {
            animateHumanoid(this.rig, 'sit', this.gaitPhase, this.interactTimer, dt);
          }
          return;
        }
      }

      if (this.sitPhase === 'standing') {
        const dur = BLENDER_SIT_DURATIONS.stand_up;
        this.sitTimer += dt;
        const u = Math.min(1, this.sitTimer / dur);
        const travel = sampleSitRootTravel('stand_up', this.sitTimer);
        const fwdX = -Math.sin(this.sitTargetYaw);
        const fwdZ = -Math.cos(this.sitTargetYaw);
        this.teleport(
          this.sitTargetPos.x + fwdX * travel,
          this.sitTargetPos.y,
          this.sitTargetPos.z + fwdZ * travel,
          this.sitTargetYaw
        );
        this.gaitPhase += dt * 1.4;
        if (this.vrmController) {
          this.vrmController.update('stand_up', this.gaitPhase, this.interactTimer, dt);
        } else {
          animateHumanoid(this.rig, 'idle', this.gaitPhase, this.interactTimer, dt);
        }
        if (u >= 1) {
          this.teleport(this.sitFrontPos.x, this.sitFrontPos.y, this.sitFrontPos.z, this.sitTargetYaw);
          this.collider.setSensor(false);
          this.sitPhase = 'none';
        }
        return;
      }
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

    // Elevator riding mode: roots the player smoothly to the moving elevator cabin
    if (this.isRidingElevator) {
      this.verticalVel = 0;
      this.isGrounded = true;
      this.coyoteTimer = 0.1;
      this.jumpBufferTimer = 0;

      // Allow gentle horizontal turning/stepping inside cabin without vertical falling
      const desiredDx = _desiredMove.x * speed * dt;
      const desiredDz = _desiredMove.z * speed * dt;

      physics.characterController.computeColliderMovement(
        this.collider,
        {
          x: desiredDx,
          y: 0,
          z: desiredDz,
        },
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
      );

      const corrected = physics.characterController.computedMovement();
      const cur = this.body.translation();
      const nx = cur.x + corrected.x;
      const nz = cur.z + corrected.z;
      const ny = this.elevatorY + 0.875;

      const bodyPos = { x: nx, y: ny, z: nz };
      this.body.setTranslation(bodyPos, true);
      this.body.setNextKinematicTranslation(bodyPos);

      this.position.set(nx, this.elevatorY, nz);
      this.rig.root.position.copy(this.position);

      const horizDist = Math.hypot(corrected.x, corrected.z);
      if (moving && horizDist > 0.001) {
        const targetYaw = Math.atan2(-_desiredMove.x, -_desiredMove.z);
        let diff = targetYaw - this.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.yaw += diff * Math.min(1, dt * 12);
      }
      this.rig.root.rotation.y = this.yaw;

      let animState: AnimState = 'idle';
      if (moving && horizDist > 0.002) {
        animState = wantsSprint ? 'run' : 'walk';
        this.gaitPhase += horizDist * (wantsSprint ? 2.05 : 3.6);
        const stepIndex = Math.floor(this.gaitPhase / Math.PI);
        if (stepIndex !== this.lastStepIndex) {
          this.lastStepIndex = stepIndex;
          audio.playFootstep(footstepSurface);
        }
      }

      if (this.vrmController) {
        this.vrmController.update(animState, this.gaitPhase, this.interactTimer, dt);
      } else {
        animateHumanoid(this.rig, animState, this.gaitPhase, this.interactTimer, dt);
      }
      return;
    }

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

    physics.characterController.computeColliderMovement(
      this.collider,
      {
        x: desiredDx,
        y: desiredDy,
        z: desiredDz,
      },
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
    );

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
      // Sync gait phase to unhurried walk (~0.87m step) and fluid airborne run (~1.53m step)
      this.gaitPhase += horizDist * (wantsSprint ? 2.05 : 3.60);
      const stepIndex = Math.floor(this.gaitPhase / Math.PI);
      if (stepIndex !== this.lastStepIndex) {
        this.lastStepIndex = stepIndex;
        audio.playFootstep(footstepSurface);
      }
    }

    if (this.vrmController) {
      this.vrmController.update(animState, this.gaitPhase, this.interactTimer, dt);
    } else {
      animateHumanoid(this.rig, animState, this.gaitPhase, this.interactTimer, dt);
    }
  }

  public getVrmController(): FlorieVRMController | null {
    return this.vrmController;
  }

  public updateCutscenePose(state: AnimState, gaitPhase: number, dt: number): void {
    if (this.vrmController) {
      this.vrmController.update(state, gaitPhase, 0, dt);
    } else {
      animateHumanoid(this.rig, state, gaitPhase, 0, dt);
    }
  }

  public updateIntroCutscene(
    introTime: number,
    dt: number,
    cameraPos?: THREE.Vector3
  ): void {
    // Smoothly start walking forward toward the Maplewood entrance door (Z = -6.0) as soon as "Suis-moi !" begins (~5.65s),
    // easing in over the first 22% and keeping a steady stride right up to the cut at 11.65s (no walking in place at the end).
    const walkRaw = Math.min(1, Math.max(0, (introTime - 5.65) / 6.0));
    const walkProgress =
      walkRaw < 0.22
        ? (0.5 * (walkRaw * walkRaw) / 0.22) / 0.89
        : (walkRaw - 0.11) / 0.89;

    // Smoothly turn around from facing the camera (Math.PI) to walking forward toward the entrance door (0.42 -> 0.0)
    // using a natural pivot-step ease over 5.35s -> 6.65s so she walks forward rather than sideways.
    const turnToBeckon = Math.min(1, Math.max(0, (introTime - 5.35) / 1.3));
    const smoothTurn = turnToBeckon * turnToBeckon * (3 - 2 * turnToBeckon);

    const finalTurn = Math.min(1, Math.max(0, (introTime - 9.0) / 1.4));
    const smoothFinalTurn = finalTurn * finalTurn * (3 - 2 * finalTurn);

    // Walk continuously from Z = 0.6 (courtyard portico approach) right up to the closed entrance door (Z = -5.15)
    const targetZ = THREE.MathUtils.lerp(0.6, -5.15, walkProgress);
    const targetX =
      Math.sin(introTime * 1.3) * 0.02 * (1 - smoothTurn) +
      Math.sin((introTime - 5.65) * 3.6) * 0.03 * smoothTurn;

    const midWalkYaw = 0.42;
    const targetYaw =
      THREE.MathUtils.lerp(Math.PI, midWalkYaw, smoothTurn) * (1 - smoothFinalTurn);

    const posDamp = 1 - Math.exp(-10 * dt);
    this.position.x = THREE.MathUtils.lerp(this.position.x, targetX, posDamp);
    this.position.y = 0.05;
    this.position.z = THREE.MathUtils.lerp(this.position.z, targetZ, posDamp);
    this.yaw = THREE.MathUtils.lerp(this.yaw, targetYaw, posDamp);

    const bodyPos = { x: this.position.x, y: this.position.y + 0.875, z: this.position.z };
    this.body.setTranslation(bodyPos, true);
    this.body.setNextKinematicTranslation(bodyPos);

    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.yaw;

    if (this.vrmController) {
      this.vrmController.updateIntroCutscene(
        introTime,
        dt,
        this.position,
        this.yaw,
        cameraPos
      );
    } else {
      animateHumanoidIntro(this.rig, introTime, dt);
    }
  }
}

