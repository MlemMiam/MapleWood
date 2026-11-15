import * as THREE from 'three';

const _pivot = new THREE.Vector3();
const _desiredCam = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export class CameraController {
  public yaw = 0; // 0 = facing North (-Z)
  public pitch = 0.22; // Slight downward angle
  public distance = 4.2;
  private readonly minDistance = 2.0;
  private readonly maxDistance = 8.0;
  private readonly minPitch = THREE.MathUtils.degToRad(-55);
  private readonly maxPitch = THREE.MathUtils.degToRad(60);
  private raycaster = new THREE.Raycaster();
  private currentPos = new THREE.Vector3(0, 3, 12);
  private currentLook = new THREE.Vector3(0, 1.5, 0);
  private initialized = false;
  private titlePos = new THREE.Vector3(5.5, 4.4, 21.0);
  private titleLook = new THREE.Vector3(0, 3.4, -8.5);
  private titleInitialized = false;
  private readonly titlePosCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-10, 3.6, 25),
      new THREE.Vector3(11, 4.4, 21),
      new THREE.Vector3(26, 13.5, 10),
      new THREE.Vector3(24, 15.0, -68),
      new THREE.Vector3(-26, 9.5, -108),
      new THREE.Vector3(-30, 14.0, -28),
      new THREE.Vector3(-20, 6.2, 16),
    ],
    true,
    'centripetal',
    0.5
  );
  private readonly titleLookCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 3.2, -6),
      new THREE.Vector3(0, 3.4, -7),
      new THREE.Vector3(0, 4.0, -18),
      new THREE.Vector3(-4, 2.5, -94),
      new THREE.Vector3(0, 3.0, -78),
      new THREE.Vector3(0, 3.5, -10),
      new THREE.Vector3(0, 3.0, -4),
    ],
    true,
    'centripetal',
    0.5
  );

  public resetToPlayer(playerPos: THREE.Vector3, yaw = 0): void {
    this.yaw = yaw;
    this.pitch = 0.2;
    this.distance = 4.2;
    this.computeDesired(playerPos, _desiredCam, _lookTarget);
    this.currentPos.copy(_desiredCam);
    this.currentLook.copy(_lookTarget);
    this.initialized = true;
  }

  public applyInput(
    lookDeltaX: number,
    lookDeltaY: number,
    zoomDelta: number,
    sensitivity: number
  ): void {
    const sens = 0.0028 * sensitivity;
    this.yaw -= lookDeltaX * sens;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + lookDeltaY * sens,
      this.minPitch,
      this.maxPitch
    );
    this.distance = THREE.MathUtils.clamp(
      this.distance + zoomDelta,
      this.minDistance,
      this.maxDistance
    );
  }

  private computeDesired(
    playerPos: THREE.Vector3,
    outCam: THREE.Vector3,
    outLook: THREE.Vector3
  ): void {
    _pivot.set(playerPos.x, playerPos.y + 1.58, playerPos.z);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    // Camera orbits behind player relative to yaw (0 = player faces -Z, camera is +Z behind)
    outCam.set(
      _pivot.x + sinYaw * cosPitch * this.distance,
      _pivot.y + sinPitch * this.distance,
      _pivot.z + cosYaw * cosPitch * this.distance
    );

    outLook.set(
      _pivot.x - sinYaw * 1.4,
      _pivot.y - 0.15,
      _pivot.z - cosYaw * 1.4
    );
  }

  public updateThirdPerson(
    camera: THREE.PerspectiveCamera,
    playerPos: THREE.Vector3,
    collidableMeshes: THREE.Object3D[],
    dt: number,
    reducedMotion: boolean
  ): void {
    if (!this.initialized) {
      this.resetToPlayer(playerPos, this.yaw);
    }

    this.computeDesired(playerPos, _desiredCam, _lookTarget);

    // Spring-arm wall collision check: raycast from player head pivot to desired camera pos
    _pivot.set(playerPos.x, playerPos.y + 1.58, playerPos.z);
    _rayDir.subVectors(_desiredCam, _pivot);
    const desiredLen = _rayDir.length();
    if (desiredLen > 0.05) {
      _rayDir.divideScalar(desiredLen);
      this.raycaster.set(_pivot, _rayDir);
      this.raycaster.near = 0.1;
      this.raycaster.far = desiredLen;
      const hits = this.raycaster.intersectObjects(collidableMeshes, false);
      if (hits.length > 0 && hits[0].distance < desiredLen) {
        const pullInDist = Math.max(0.55, hits[0].distance - 0.25);
        _desiredCam.copy(_pivot).addScaledVector(_rayDir, pullInDist);
      }
    }

    // Clamp camera above floor
    if (_desiredCam.y < playerPos.y + 0.35) {
      _desiredCam.y = playerPos.y + 0.35;
    }

    const alpha = reducedMotion ? 1 : 1 - Math.exp(-12 * dt);
    this.currentPos.lerp(_desiredCam, alpha);
    this.currentLook.lerp(_lookTarget, alpha);

    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentLook);
    if (Math.abs(camera.fov - 55) > 0.05) {
      camera.fov = 55;
      camera.updateProjectionMatrix();
    }
  }

  public updateTitleTour(
    camera: THREE.PerspectiveCamera,
    elapsed: number,
    travelingEnabled = true
  ): void {
    if (Math.abs(camera.fov - 46) > 0.05) {
      camera.fov = 46;
      camera.updateProjectionMatrix();
    }

    if (!travelingEnabled) {
      // Calm static framing of the main high school facade & courtyard
      _desiredCam.set(5.5, 4.4, 21.0);
      _lookTarget.set(0, 3.4, -8.5);
    } else {
      // Continuous closed centripetal Catmull-Rom spline around the campus (zero breaks or cuts)
      const loopDuration = 42.0;
      const u = (((elapsed % loopDuration) + loopDuration) % loopDuration) / loopDuration;
      this.titlePosCurve.getPointAt(u, _desiredCam);
      this.titleLookCurve.getPointAt(u, _lookTarget);
    }

    if (!this.titleInitialized) {
      this.titlePos.copy(_desiredCam);
      this.titleLook.copy(_lookTarget);
      this.titleInitialized = true;
    } else {
      // Smoothly damp between traveling and static framing when toggled
      this.titlePos.lerp(_desiredCam, 0.075);
      this.titleLook.lerp(_lookTarget, 0.075);
    }

    camera.position.copy(this.titlePos);
    camera.lookAt(this.titleLook);
  }

  /**
   * Smooth head-to-bust portrait close-up camera for NPC dialogues.
   */
  public updateNpcCloseupCamera(
    camera: THREE.PerspectiveCamera,
    npcPos: THREE.Vector3,
    npcYaw: number,
    isSeated: boolean,
    dt: number,
    reducedMotion: boolean
  ): void {
    const fwdX = -Math.sin(npcYaw);
    const fwdZ = -Math.cos(npcYaw);
    const rightX = Math.cos(npcYaw);
    const rightZ = -Math.sin(npcYaw);

    const lookHeight = isSeated ? 1.10 : 1.44;
    const camHeight = isSeated ? 1.20 : 1.50;
    const dist = 0.96;
    const sideOffset = 0.16;

    _desiredCam.set(
      npcPos.x + fwdX * dist + rightX * sideOffset,
      npcPos.y + camHeight,
      npcPos.z + fwdZ * dist + rightZ * sideOffset
    );
    _lookTarget.set(npcPos.x, npcPos.y + lookHeight, npcPos.z);

    if (reducedMotion) {
      this.currentPos.copy(_desiredCam);
      this.currentLook.copy(_lookTarget);
    } else {
      const damp = 1 - Math.exp(-8.5 * Math.min(dt, 0.05));
      this.currentPos.lerp(_desiredCam, damp);
      this.currentLook.lerp(_lookTarget, damp);
    }

    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentLook);
  }

  public updateIntroCutsceneCamera(
    camera: THREE.PerspectiveCamera,
    floriePos: THREE.Vector3,
    introTime: number
  ): void {
    // Continuous C2-smooth blended camera choreography (no hard cuts or jumps!):
    // - w1: Opening crane dolly-in (0.0s -> 2.2s)
    // - w2: Intimate hero close-up orbit during wrist wave (1.8s -> 6.0s)
    // - w3: Over-the-shoulder tracking dolly that follows Florie as she walks & beckons toward the entrance (5.6s -> 12.6s)
    const smoothstep = (e0: number, e1: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    };

    const craneEase = smoothstep(0.0, 2.2, introTime);
    const orbitProgress = smoothstep(1.8, 6.2, introTime);
    const beckonArc = smoothstep(5.6, 11.8, introTime);

    const handheldX = Math.sin(introTime * 1.4) * 0.014;
    const handheldY = Math.cos(introTime * 1.9) * 0.01;

    // Smoothly blend camera offset relative to Florie's walking position as she walks to the door (Z = -5.5)
    const establishX = THREE.MathUtils.lerp(-0.95, -0.14, craneEase);
    const heroX = THREE.MathUtils.lerp(establishX, 0.16, orbitProgress);
    const camX = THREE.MathUtils.lerp(heroX, 0.36, beckonArc) + handheldX;

    const establishY = THREE.MathUtils.lerp(1.18, 1.48, craneEase);
    const heroY = THREE.MathUtils.lerp(establishY, 1.50, orbitProgress);
    const camY = THREE.MathUtils.lerp(heroY, 1.56, beckonArc) + handheldY;

    const establishZOff = THREE.MathUtils.lerp(2.65, 1.62, craneEase);
    const heroZOff = THREE.MathUtils.lerp(establishZOff, 1.56, orbitProgress);
    const camZOff = THREE.MathUtils.lerp(heroZOff, 1.88, beckonArc);
    const camZ = floriePos.z + camZOff;

    const lookX =
      floriePos.x +
      THREE.MathUtils.lerp(0.1, -0.04, craneEase) * (1 - beckonArc) +
      -0.06 * beckonArc;
    const lookY = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(1.52, 1.44, craneEase),
      1.48,
      beckonArc
    );
    const lookZ =
      floriePos.z -
      THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.4, 1.2, craneEase), 2.8, beckonArc);

    const targetFov = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(44, 34, craneEase),
      41,
      beckonArc
    );

    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, lookY, lookZ);
    if (Math.abs(camera.fov - targetFov) > 0.04) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }
}
