import * as THREE from 'three';

const _pivot = new THREE.Vector3();
const _desiredCam = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

interface TitleShot {
  duration: number;
  posStart: THREE.Vector3;
  posEnd: THREE.Vector3;
  lookStart: THREE.Vector3;
  lookEnd: THREE.Vector3;
}

const TITLE_SHORTS_TOTAL = 48.5;

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
  private titlePos = new THREE.Vector3(-11.0, 2.8, 16.5);
  private titleLook = new THREE.Vector3(0, 4.6, -11.0);
  private titleInitialized = false;
  private lastTitleShotIndex = -1;
  private lastTravelingEnabled = true;
  private readonly titleShots: TitleShot[] = [
    {
      // 1. La Devanture & Cour d'honneur (Full Building Facade, Roof & Cupola)
      duration: 6.5,
      posStart: new THREE.Vector3(-28.0, 14.5, 68.0),
      posEnd: new THREE.Vector3(24.0, 17.5, 62.0),
      lookStart: new THREE.Vector3(0.0, 9.5, -18.0),
      lookEnd: new THREE.Vector3(0.0, 10.5, -18.0),
    },
    {
      // 2. Grand Hall d'Accueil & Réception (Lobby, Chandelier & Reception Desk)
      duration: 6.0,
      posStart: new THREE.Vector3(6.2, 2.4, -13.5),
      posEnd: new THREE.Vector3(-0.8, 2.2, -16.2),
      lookStart: new THREE.Vector3(-3.5, 1.6, -19.2),
      lookEnd: new THREE.Vector3(-5.0, 1.5, -20.0),
    },
    {
      // 3. Atrium Central & Ascenseurs Vitrés (Multi-floor Atrium & Glass Elevators)
      duration: 6.0,
      posStart: new THREE.Vector3(-8.5, 2.2, -23.6),
      posEnd: new THREE.Vector3(6.5, 6.2, -23.8),
      lookStart: new THREE.Vector3(4.0, 5.5, -24.5),
      lookEnd: new THREE.Vector3(-4.0, 9.0, -24.5),
    },
    {
      // 4. Aile Est RDC — Couloir & Cafétéria
      duration: 6.0,
      posStart: new THREE.Vector3(21.0, 2.1, -24.0),
      posEnd: new THREE.Vector3(34.5, 2.1, -23.0),
      lookStart: new THREE.Vector3(34.5, 2.0, -23.5),
      lookEnd: new THREE.Vector3(35.0, 1.8, -17.0),
    },
    {
      // 5. Grand Escalier Est (RDC -> 1er Étage)
      duration: 6.0,
      posStart: new THREE.Vector3(33.5, 2.2, -24.2),
      posEnd: new THREE.Vector3(38.5, 5.2, -24.6),
      lookStart: new THREE.Vector3(39.2, 3.2, -27.5),
      lookEnd: new THREE.Vector3(39.2, 6.2, -28.0),
    },
    {
      // 6. Aile Ouest 1er Étage — Couloir & Bibliothèque
      duration: 6.0,
      posStart: new THREE.Vector3(-42.0, 6.7, -24.0),
      posEnd: new THREE.Vector3(-55.2, 6.7, -23.1),
      lookStart: new THREE.Vector3(-56.0, 6.5, -23.5),
      lookEnd: new THREE.Vector3(-56.7, 6.3, -17.0),
    },
    {
      // 7. 3e Étage — Salle de Conférence
      duration: 6.0,
      posStart: new THREE.Vector3(-10.0, 15.8, -24.0),
      posEnd: new THREE.Vector3(0.0, 15.8, -22.5),
      lookStart: new THREE.Vector3(0.0, 15.6, -23.5),
      lookEnd: new THREE.Vector3(0.0, 15.3, -16.5),
    },
    {
      // 8. Vue Aérienne — Fronton & Coupole du Bâtiment
      duration: 6.0,
      posStart: new THREE.Vector3(22.0, 12.5, 10.0),
      posEnd: new THREE.Vector3(-18.0, 10.5, 14.0),
      lookStart: new THREE.Vector3(0.0, 6.8, -17.0),
      lookEnd: new THREE.Vector3(0.0, 5.2, -14.0),
    },
  ];

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

    let shotIndex = -1;
    if (!travelingEnabled) {
      // Calm static framing of the main high school facade & courtyard
      _desiredCam.set(5.5, 4.4, 21.0);
      _lookTarget.set(0, 3.4, -8.5);
    } else {
      const tLoop = ((elapsed % TITLE_SHORTS_TOTAL) + TITLE_SHORTS_TOTAL) % TITLE_SHORTS_TOTAL;
      let acc = 0;
      shotIndex = this.titleShots.length - 1;
      let localU = 1;
      for (let i = 0; i < this.titleShots.length; i++) {
        const s = this.titleShots[i];
        if (tLoop < acc + s.duration || i === this.titleShots.length - 1) {
          shotIndex = i;
          localU = THREE.MathUtils.clamp((tLoop - acc) / s.duration, 0, 1);
          break;
        }
        acc += s.duration;
      }
      const shot = this.titleShots[shotIndex];
      const easedU = 0.5 - 0.5 * Math.cos(Math.PI * localU);
      _desiredCam.lerpVectors(shot.posStart, shot.posEnd, easedU);
      _lookTarget.lerpVectors(shot.lookStart, shot.lookEnd, easedU);
    }

    const isCutBetweenShots =
      travelingEnabled &&
      this.lastTravelingEnabled &&
      this.lastTitleShotIndex !== -1 &&
      shotIndex !== this.lastTitleShotIndex;

    if (!this.titleInitialized || isCutBetweenShots) {
      this.titlePos.copy(_desiredCam);
      this.titleLook.copy(_lookTarget);
      this.titleInitialized = true;
    } else {
      // Smoothly damp within a shot or when toggling traveling on/off
      this.titlePos.lerp(_desiredCam, 0.14);
      this.titleLook.lerp(_lookTarget, 0.14);
    }
    this.lastTitleShotIndex = shotIndex;
    this.lastTravelingEnabled = travelingEnabled;

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
