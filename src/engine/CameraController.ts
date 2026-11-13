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
  }

  public updateTitleTour(camera: THREE.PerspectiveCamera, elapsed: number): void {
    const angle = elapsed * 0.14;
    const radius = 34;
    camera.position.set(
      Math.sin(angle) * radius,
      12.5 + Math.sin(elapsed * 0.25) * 2.2,
      14 + Math.cos(angle) * 22
    );
    camera.lookAt(0, 3.2, -8);
  }

  public updateIntroCutsceneCamera(
    camera: THREE.PerspectiveCamera,
    floriePos: THREE.Vector3,
    introTime: number
  ): void {
    const tNorm = Math.min(1, Math.max(0, introTime / 9.2));
    const smoothT = tNorm * tNorm * (3 - 2 * tNorm);

    const camX = THREE.MathUtils.lerp(-0.28, 0.22, smoothT) + Math.sin(introTime * 1.2) * 0.04;
    const camY = THREE.MathUtils.lerp(1.42, 1.48, smoothT);
    const camZ = floriePos.z + THREE.MathUtils.lerp(2.15, 1.82, smoothT);

    camera.position.set(camX, camY, camZ);

    const lookX = floriePos.x * 0.5;
    const lookY = THREE.MathUtils.lerp(1.42, 1.56, smoothT);
    const lookZ = floriePos.z - 2.4;
    camera.lookAt(lookX, lookY, lookZ);
  }
}
