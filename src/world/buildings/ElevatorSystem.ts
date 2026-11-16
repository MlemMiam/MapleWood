import * as THREE from 'three';
import type { WorldBuildContext } from '../WorldContext';
import type { CampusNPC } from '../../character/NPC';
import type { Player } from '../../character/Player';
import type RAPIER from '@dimforge/rapier3d-compat';

export interface ElevatorFloorInfo {
  index: number;
  name: string;
  shortName: string;
  y: number;
}

export const ELEVATOR_FLOORS: ElevatorFloorInfo[] = [
  { index: 0, name: "Rez-de-chaussée (RDC) — Hall d'accueil & Cafétéria", shortName: 'RDC', y: 0.05 },
  { index: 1, name: 'Étage 1 — Salles de cours & Ateliers', shortName: 'Étage 1', y: 4.85 },
  { index: 2, name: 'Étage 2 — Bibliothèque & Laboratoires', shortName: 'Étage 2', y: 9.45 },
  { index: 3, name: 'Étage 3 — Direction & Clubs étudiants', shortName: 'Étage 3', y: 14.05 },
];

export type ElevatorSide = 'east' | 'west';

interface FloorDoorAssembly {
  floorIndex: number;
  root: THREE.Group;
  leafL: THREE.Mesh;
  leafR: THREE.Mesh;
  colL: { body: RAPIER.RigidBody; collider: RAPIER.Collider };
  colR: { body: RAPIER.RigidBody; collider: RAPIER.Collider };
}

export class ElevatorCabin {
  public readonly side: ElevatorSide;
  public readonly shaftX: number;
  // Doorway is at Z = -26.19; shaft back glass is at Z = -29.65
  // Cabin depth = 3.44m, so center Z = (-26.19 + -29.63) / 2 = -27.91
  public readonly shaftZ = -27.91;
  public readonly doorZ = -26.19;
  public readonly cabinW = 2.50;
  public readonly cabinD = 3.44;
  public readonly cabinH = 2.70;
  public readonly floorCenterZ = -27.84;
  public readonly floorHalfD = 1.79;

  public currentFloor = 0;
  public targetFloor = 0;
  public currentY = ELEVATOR_FLOORS[0].y;
  public startY = ELEVATOR_FLOORS[0].y;
  public targetY = ELEVATOR_FLOORS[0].y;

  private state: 'idle' | 'moving' | 'opening' | 'open' | 'closing' = 'idle';
  private travelElapsed = 0;
  private travelDuration = 2.0;
  private doorOpenFactor = 0; // 0 = closed, 1 = fully open
  private waitOpenTimer = 0;
  private floorDoors: FloorDoorAssembly[] = [];

  public readonly cabinGroup: THREE.Group;
  private cabinLeafL!: THREE.Mesh;
  private cabinLeafR!: THREE.Mesh;
  private floorCollider: { body: RAPIER.RigidBody; collider: RAPIER.Collider };
  private cabinWallColliders: Array<{
    body: RAPIER.RigidBody;
    x: number;
    yOffset: number;
    z: number;
  }> = [];
  private panelWorldPos: THREE.Vector3;
  private indicatorCanvas!: HTMLCanvasElement;
  private indicatorTexture!: THREE.CanvasTexture;
  private indicatorMesh!: THREE.Mesh;
  private downLight!: THREE.PointLight;

  private queuedFloors: number[] = [];

  // Player boarding & auto-menu state
  private playerInsideCabin = false;
  private menuTriggeredThisRide = false;
  private justArrived = false;

  // NPC autonomous ride queue
  private activeNpcPassenger: {
    npc: CampusNPC;
    targetFloor: number;
    phase: 'waiting_outside' | 'entering' | 'riding' | 'exiting';
    timer: number;
  } | null = null;

  constructor(
    ctx: WorldBuildContext,
    parent: THREE.Group,
    side: ElevatorSide,
    glassMat: THREE.MeshStandardMaterial
  ) {
    this.side = side;
    this.shaftX = side === 'east' ? 14.25 : -14.25;

    const { physics, mats, interactions, callbacks } = ctx;

    // Materials
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc89d42,
      roughness: 0.25,
      metalness: 0.88,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.35,
      metalness: 0.75,
    });
    const marbleFloorMat = new THREE.MeshStandardMaterial({
      color: 0x16181b,
      roughness: 0.22,
      metalness: 0.15,
    });
    const doorPanelMat = new THREE.MeshStandardMaterial({
      color: 0x484e55,
      roughness: 0.32,
      metalness: 0.65,
    });
    const buttonOnMat = new THREE.MeshStandardMaterial({
      color: 0xffeeaa,
      emissive: 0xffcc33,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // 1. Build Cabin Group
    this.cabinGroup = new THREE.Group();
    this.cabinGroup.name = `ElevatorCabin_${side}`;
    this.cabinGroup.position.set(this.shaftX, this.currentY, this.shaftZ);
    parent.add(this.cabinGroup);

    const halfW = this.cabinW * 0.5;
    const halfD = this.cabinD * 0.5; // 1.72m

    // Flush Marble Floor Platform inside cabin (thickness 0.01m, top at +0.005m relative to cabin floorY)
    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.cabinW - 0.04, 0.01, this.cabinD - 0.04),
      marbleFloorMat
    );
    floorMesh.position.set(0, 0.005, 0);
    floorMesh.receiveShadow = true;
    this.cabinGroup.add(floorMesh);

    // Subtle brass perimeter inlay
    const floorInlay = new THREE.Mesh(
      new THREE.BoxGeometry(this.cabinW - 0.20, 0.002, this.cabinD - 0.20),
      brassMat
    );
    floorInlay.position.set(0, 0.011, 0);
    this.cabinGroup.add(floorInlay);

    // Polished Brass Entrance Threshold Sill (bridges corridor at Z = -26.19 to cabin floor)
    const thresholdSill = new THREE.Mesh(
      new THREE.BoxGeometry(1.90, 0.01, 0.16),
      brassMat
    );
    thresholdSill.position.set(0, 0.008, halfD - 0.08);
    thresholdSill.receiveShadow = true;
    this.cabinGroup.add(thresholdSill);

    // Ceiling with recessed warm spotlight
    const ceilingMesh = new THREE.Mesh(new THREE.BoxGeometry(this.cabinW, 0.08, this.cabinD), darkSteelMat);
    ceilingMesh.position.set(0, this.cabinH + 0.04, 0);
    this.cabinGroup.add(ceilingMesh);

    const ceilingTrim = new THREE.Mesh(new THREE.BoxGeometry(this.cabinW * 0.85, 0.02, this.cabinD * 0.85), brassMat);
    ceilingTrim.position.set(0, this.cabinH - 0.01, 0);
    this.cabinGroup.add(ceilingTrim);

    this.downLight = new THREE.PointLight(0xfff6ea, 1.4, 6.0);
    this.downLight.position.set(0, this.cabinH - 0.2, 0);
    this.cabinGroup.add(this.downLight);

    // Panoramic Glass walls (Back at -Z, Left at -X, Right at +X)
    const glassT = 0.03;
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(this.cabinW - 0.1, this.cabinH - 0.1, glassT), glassMat);
    backGlass.position.set(0, this.cabinH * 0.5, -halfD + glassT * 0.5);
    this.cabinGroup.add(backGlass);

    const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(glassT, this.cabinH - 0.1, this.cabinD - 0.1), glassMat);
    sideGlassL.position.set(-halfW + glassT * 0.5, this.cabinH * 0.5, 0);
    this.cabinGroup.add(sideGlassL);

    const sideGlassR = new THREE.Mesh(new THREE.BoxGeometry(glassT, this.cabinH - 0.1, this.cabinD - 0.1), glassMat);
    sideGlassR.position.set(halfW - glassT * 0.5, this.cabinH * 0.5, 0);
    this.cabinGroup.add(sideGlassR);

    // Brass handrails along interior panoramic walls
    const createRail = (w: number, d: number, x: number, z: number, isSide: boolean) => {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, isSide ? d : w, 12),
        brassMat
      );
      rail.position.set(x, 0.95, z);
      if (isSide) rail.rotation.x = Math.PI * 0.5;
      else rail.rotation.z = Math.PI * 0.5;
      this.cabinGroup.add(rail);
    };
    createRail(this.cabinW - 0.3, 0, 0, -halfD + 0.1, false);
    createRail(0, this.cabinD - 0.3, -halfW + 0.1, 0, true);
    createRail(0, this.cabinD - 0.3, halfW - 0.1, 0, true);

    // Front Wall frame & Doorway
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, this.cabinH, 0.06), darkSteelMat);
    frontWallLeft.position.set(-halfW + 0.175, this.cabinH * 0.5, halfD - 0.03);
    this.cabinGroup.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, this.cabinH, 0.06), darkSteelMat);
    frontWallRight.position.set(halfW - 0.175, this.cabinH * 0.5, halfD - 0.03);
    this.cabinGroup.add(frontWallRight);

    const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(this.cabinW, 0.35, 0.06), darkSteelMat);
    frontWallTop.position.set(0, this.cabinH - 0.175, halfD - 0.03);
    this.cabinGroup.add(frontWallTop);

    // Cabin Sliding Doors (Bipartite, open width = 1.76m)
    const doorLeafW = 0.88;
    const doorLeafH = this.cabinH - 0.35;
    const doorLeafT = 0.035;

    this.cabinLeafL = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW, doorLeafH, doorLeafT), doorPanelMat);
    this.cabinLeafL.position.set(-doorLeafW * 0.5, doorLeafH * 0.5, halfD - 0.015);
    this.cabinGroup.add(this.cabinLeafL);

    this.cabinLeafR = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW, doorLeafH, doorLeafT), doorPanelMat);
    this.cabinLeafR.position.set(doorLeafW * 0.5, doorLeafH * 0.5, halfD - 0.015);
    this.cabinGroup.add(this.cabinLeafR);

    // Digital Floor Indicator screen above the cabin door
    this.indicatorCanvas = document.createElement('canvas');
    this.indicatorCanvas.width = 256;
    this.indicatorCanvas.height = 64;
    this.indicatorTexture = new THREE.CanvasTexture(this.indicatorCanvas);
    this.indicatorTexture.minFilter = THREE.LinearFilter;
    const indicatorMat = new THREE.MeshBasicMaterial({
      map: this.indicatorTexture,
      transparent: true,
    });
    this.indicatorMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.80, 0.22), indicatorMat);
    this.indicatorMesh.position.set(0, this.cabinH - 0.18, halfD - 0.08);
    this.indicatorMesh.rotation.y = Math.PI;
    this.cabinGroup.add(this.indicatorMesh);
    this.updateIndicatorDisplay();

    // Interior Control Panel Totem (right side of front door inside cabin)
    const panelTotem = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.35, 0.04), darkSteelMat);
    panelTotem.position.set(halfW - 0.24, 1.25, halfD - 0.08);
    this.cabinGroup.add(panelTotem);

    const panelPlate = new THREE.Mesh(new THREE.BoxGeometry(0.20, 1.30, 0.01), brassMat);
    panelPlate.position.set(halfW - 0.24, 1.25, halfD - 0.105);
    this.cabinGroup.add(panelPlate);

    this.panelWorldPos = new THREE.Vector3(
      this.shaftX + halfW - 0.24,
      this.currentY + 1.25,
      this.shaftZ + halfD - 0.12
    );

    // Manual Interior Control Panel Interaction (backup in case player wants to reopen menu)
    interactions.register({
      id: `elev-panel-${side}`,
      label: "E — Choisir l'étage de destination",
      type: 'elevator',
      targetObject: panelPlate,
      worldPosition: this.panelWorldPos,
      maxDistance: 3.0,
      onInteract: () => this.openDestinationMenu(callbacks),
    });

    // Floor Buttons on the totem
    const btnGeom = new THREE.CylinderGeometry(0.028, 0.028, 0.02, 16);
    btnGeom.rotateX(Math.PI * 0.5);

    for (let f = 0; f < ELEVATOR_FLOORS.length; f++) {
      const btnMesh = new THREE.Mesh(btnGeom, buttonOnMat);
      const btnY = 1.62 - f * 0.18;
      btnMesh.position.set(halfW - 0.24, btnY, halfD - 0.115);
      this.cabinGroup.add(btnMesh);
    }

    // Fixed Rapier Floor Collider (KinematicCharacterController requires a fixed body for seamless walking across floor thresholds)
    this.floorCollider = physics.addStaticBodyBox(
      this.shaftX,
      this.currentY - 0.05,
      this.floorCenterZ,
      halfW,
      0.05,
      this.floorHalfD
    );

    // Fixed Rapier Cabin Wall Colliders (back, left, right glass + front doorway side jambs leaving a 1.80m clear doorway)
    const wallSpecs = [
      // Back glass wall
      { x: this.shaftX, yOffset: this.cabinH * 0.5, z: this.shaftZ - halfD + 0.02, hx: halfW, hy: this.cabinH * 0.5, hz: 0.04 },
      // Left glass wall
      { x: this.shaftX - halfW + 0.02, yOffset: this.cabinH * 0.5, z: this.shaftZ, hx: 0.04, hy: this.cabinH * 0.5, hz: halfD },
      // Right glass wall
      { x: this.shaftX + halfW - 0.02, yOffset: this.cabinH * 0.5, z: this.shaftZ, hx: 0.04, hy: this.cabinH * 0.5, hz: halfD },
      // Front doorway left jamb (inner edge at shaftX - 0.90)
      { x: this.shaftX - halfW + 0.175, yOffset: this.cabinH * 0.5, z: this.doorZ - 0.03, hx: 0.175, hy: this.cabinH * 0.5, hz: 0.04 },
      // Front doorway right jamb (inner edge at shaftX + 0.90)
      { x: this.shaftX + halfW - 0.175, yOffset: this.cabinH * 0.5, z: this.doorZ - 0.03, hx: 0.175, hy: this.cabinH * 0.5, hz: 0.04 },
    ];
    for (const w of wallSpecs) {
      const box = physics.addStaticBodyBox(
        w.x,
        this.currentY + w.yOffset,
        w.z,
        w.hx,
        w.hy,
        w.hz
      );
      this.cabinWallColliders.push({
        body: box.body,
        x: w.x,
        yOffset: w.yOffset,
        z: w.z,
      });
    }

    // 2. Build Floor Doors for each of the 4 floors at shaft entrance (Z = -26.19)
    for (let f = 0; f < ELEVATOR_FLOORS.length; f++) {
      const flInfo = ELEVATOR_FLOORS[f];
      const doorRoot = new THREE.Group();
      doorRoot.name = `ElevatorShaftDoor_${side}_f${f}`;
      doorRoot.position.set(this.shaftX, flInfo.y, this.doorZ);
      parent.add(doorRoot);

      // Shaft Outer Bipartite Sliding Doors
      const flLeafL = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW, doorLeafH, doorLeafT), doorPanelMat);
      flLeafL.position.set(-doorLeafW * 0.5, doorLeafH * 0.5, 0);
      flLeafL.castShadow = true;
      flLeafL.receiveShadow = true;
      doorRoot.add(flLeafL);

      const flLeafR = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW, doorLeafH, doorLeafT), doorPanelMat);
      flLeafR.position.set(doorLeafW * 0.5, doorLeafH * 0.5, 0);
      flLeafR.castShadow = true;
      flLeafR.receiveShadow = true;
      doorRoot.add(flLeafR);

      // Kinematic door barrier colliders (solid when closed, disabled & subterranean when open)
      const colL = physics.addKinematicDoorBox(
        this.shaftX - doorLeafW * 0.5,
        flInfo.y + doorLeafH * 0.5,
        this.doorZ,
        doorLeafW * 0.5,
        doorLeafH * 0.5,
        doorLeafT * 0.5
      );
      const colR = physics.addKinematicDoorBox(
        this.shaftX + doorLeafW * 0.5,
        flInfo.y + doorLeafH * 0.5,
        this.doorZ,
        doorLeafW * 0.5,
        doorLeafH * 0.5,
        doorLeafT * 0.5
      );

      this.floorDoors.push({
        floorIndex: f,
        root: doorRoot,
        leafL: flLeafL,
        leafR: flLeafR,
        colL,
        colR,
      });

      // Exterior Call Button Box on corridor wall beside shaft entrance
      const callBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.30, 0.05), darkSteelMat);
      const callBoxX = this.shaftX + (side === 'east' ? 1.45 : -1.45);
      callBox.position.set(callBoxX, flInfo.y + 1.25, this.doorZ + 0.04);
      parent.add(callBox);

      const callPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.01), brassMat);
      callPlate.position.set(callBoxX, flInfo.y + 1.25, this.doorZ + 0.065);
      parent.add(callPlate);

      const callBtn = new THREE.Mesh(btnGeom, buttonOnMat);
      callBtn.position.set(callBoxX, flInfo.y + 1.25, this.doorZ + 0.08);
      parent.add(callBtn);

      interactions.register({
        id: `elev-call-${side}-${f}`,
        label: `E — Appeler l'ascenseur (${flInfo.shortName})`,
        type: 'elevator',
        targetObject: callBtn,
        worldPosition: new THREE.Vector3(callBoxX, flInfo.y + 1.25, this.doorZ + 0.1),
        maxDistance: 3.5,
        onInteract: () => this.handleExteriorCall(f, callbacks),
      });
    }

    // Set initial doors open at floor 0
    this.setDoorsOpen(1);
    this.state = 'open';
    this.waitOpenTimer = 8.0;
  }

  private updateIndicatorDisplay(): void {
    const ctx = this.indicatorCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#08090a';
    ctx.fillRect(0, 0, 256, 64);

    ctx.strokeStyle = '#c89d42';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 56);

    ctx.fillStyle = '#ffdf6d';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let arrow = '●';
    if (this.state === 'moving') {
      arrow = this.targetFloor > this.currentFloor ? '▲' : '▼';
    }
    const floorLabel = ELEVATOR_FLOORS[this.currentFloor]?.shortName || 'RDC';
    ctx.fillText(`${arrow}  ${floorLabel}`, 128, 33);
    this.indicatorTexture.needsUpdate = true;
  }

  private syncCabinPhysics(y: number): void {
    this.floorCollider.body.setTranslation(
      { x: this.shaftX, y: y - 0.05, z: this.floorCenterZ },
      true
    );
    for (const w of this.cabinWallColliders) {
      w.body.setTranslation({ x: w.x, y: y + w.yOffset, z: w.z }, true);
    }
    this.panelWorldPos.y = y + 1.25;
  }

  public openDestinationMenu(callbacks?: WorldBuildContext['callbacks']): void {
    callbacks?.onOpenElevatorMenu?.(
      this.side,
      this.currentFloor,
      (chosenFloor) => {
        this.requestFloor(chosenFloor, callbacks);
      },
      () => {
        // Player closed/cancelled menu without travelling: reopen doors so they can walk back out freely
        if (this.state === 'idle' || this.state === 'closing') {
          this.justArrived = true;
          this.state = 'opening';
          callbacks?.onDoorToggle(true);
        }
      }
    );
  }

  public handleExteriorCall(floorIndex: number, callbacks?: WorldBuildContext['callbacks']): void {
    if (this.currentFloor === floorIndex) {
      if (this.state === 'idle' || this.state === 'closing') {
        this.state = 'opening';
        callbacks?.onDoorToggle(true);
      }
      return;
    }
    this.callToFloor(floorIndex, callbacks);
  }

  public callToFloor(floorIndex: number, callbacks?: WorldBuildContext['callbacks']): void {
    if (this.currentFloor === floorIndex && (this.state === 'idle' || this.state === 'open')) {
      this.state = 'opening';
      callbacks?.onDoorToggle(true);
      return;
    }
    if (!this.queuedFloors.includes(floorIndex)) {
      this.queuedFloors.push(floorIndex);
    }
    if (this.state === 'idle' || this.state === 'open') {
      this.processNextQueuedFloor(callbacks);
    }
  }

  public requestFloor(floorIndex: number, callbacks?: WorldBuildContext['callbacks']): void {
    if (this.currentFloor === floorIndex) {
      // Already at requested floor: reopen doors and mark ready for exit
      this.justArrived = true;
      if (this.state === 'idle' || this.state === 'closing') {
        this.state = 'opening';
        callbacks?.onDoorToggle(true);
      } else if (this.state === 'open') {
        this.waitOpenTimer = Math.max(this.waitOpenTimer, 5.0);
      }
      return;
    }
    // Set target and start moving immediately
    this.justArrived = false;
    this.targetFloor = floorIndex;
    this.startY = this.currentY;
    this.targetY = ELEVATOR_FLOORS[floorIndex].y;
    const dist = Math.abs(this.targetY - this.startY);
    this.travelDuration = Math.max(1.8, dist / 2.8);
    this.travelElapsed = 0;

    if (this.doorOpenFactor > 0.02) {
      this.state = 'closing';
      callbacks?.onDoorToggle(false);
    } else {
      this.state = 'moving';
      this.updateIndicatorDisplay();
    }
  }

  private processNextQueuedFloor(callbacks?: WorldBuildContext['callbacks']): void {
    if (this.queuedFloors.length === 0) {
      this.state = 'idle';
      this.updateIndicatorDisplay();
      return;
    }
    const next = this.queuedFloors.shift()!;
    this.targetFloor = next;
    this.startY = this.currentY;
    this.targetY = ELEVATOR_FLOORS[next].y;

    const dist = Math.abs(this.targetY - this.startY);
    this.travelDuration = Math.max(1.8, dist / 2.8);
    this.travelElapsed = 0;

    if (this.doorOpenFactor > 0.02) {
      this.state = 'closing';
      callbacks?.onDoorToggle(false);
    } else {
      this.state = 'moving';
      this.updateIndicatorDisplay();
    }
  }

  public update(
    dt: number,
    player: Player | undefined,
    npcs: CampusNPC[],
    callbacks?: WorldBuildContext['callbacks']
  ): void {
    const prevY = this.currentY;

    // 1. Proximity & Passenger Detection
    if (player) {
      const dx = player.position.x - this.shaftX;
      const dz = player.position.z - this.doorZ;
      const dy = Math.abs(player.position.y - this.currentY);

      // Player near exterior doorway on current elevator floor (outside the doorway)
      const isNearOutside = Math.abs(dx) < 1.7 && dz > 0.02 && dz < 2.6 && dy < 1.2;

      // Player crossing the doorway threshold (keep doors safely open so they aren't clipped!)
      const inDoorwayZone = Math.abs(dx) < 1.1 && dz >= -0.45 && dz <= 0.45 && dy < 1.2;

      // Player cleanly inside cabin (past threshold radius to back glass)
      const inCabin =
        Math.abs(dx) < this.cabinW * 0.5 &&
        player.position.z < this.doorZ - 0.30 &&
        player.position.z >= this.shaftZ - this.cabinD * 0.5 - 0.1 &&
        dy < 2.5;

      // Player standing right inside a closed door wanting to walk out
      const approachingExitFromInside =
        inCabin && dz > -1.10 && dy < 1.2 && (this.menuTriggeredThisRide || this.justArrived);

      // Automatic Door Opening when approaching doorway from outside, crossing doorway, or exiting from inside
      if (
        this.state !== 'moving' &&
        (isNearOutside || inDoorwayZone || approachingExitFromInside)
      ) {
        if (this.state === 'idle' || this.state === 'closing') {
          this.state = 'opening';
          callbacks?.onDoorToggle(true);
        } else if (this.state === 'open') {
          // Hold doors open while player is approaching or standing in the doorway
          this.waitOpenTimer = Math.max(this.waitOpenTimer, 3.0);
        }
      }

      // Track passenger boarding
      if (inCabin) {
        if (!this.playerInsideCabin) {
          this.playerInsideCabin = true;
          // Newly stepped in: close doors smoothly after 1.3s to pick destination
          if (this.state === 'open' && !this.justArrived) {
            this.waitOpenTimer = Math.min(this.waitOpenTimer, 1.3);
          }
        }
      } else {
        if (this.playerInsideCabin) {
          this.playerInsideCabin = false;
          this.menuTriggeredThisRide = false;
          this.justArrived = false;
          player.isRidingElevator = false;
        }
      }

      // Root player vertically to cabin strictly while cabin is moving
      if (this.playerInsideCabin && this.state === 'moving') {
        player.isRidingElevator = true;
        player.elevatorY = this.currentY;
      } else if (player.isRidingElevator) {
        player.isRidingElevator = false;
      }
    }

    // 2. State Machine
    switch (this.state) {
      case 'closing': {
        this.doorOpenFactor = Math.max(0, this.doorOpenFactor - dt * 2.2);
        this.setDoorsOpen(this.doorOpenFactor);
        if (this.doorOpenFactor <= 0.001) {
          this.doorOpenFactor = 0;
          this.setDoorsOpen(0);
          if (this.targetFloor !== this.currentFloor) {
            this.state = 'moving';
            this.travelElapsed = 0;
            this.updateIndicatorDisplay();
          } else {
            this.state = 'idle';
            // Doors are now fully closed!
            // If player just boarded, automatically open destination menu
            if (this.playerInsideCabin && !this.menuTriggeredThisRide && !this.justArrived) {
              this.menuTriggeredThisRide = true;
              this.openDestinationMenu(callbacks);
            }
          }
        }
        break;
      }
      case 'moving': {
        this.travelElapsed += dt;
        const t = Math.min(1, this.travelElapsed / this.travelDuration);
        // Quintic smoothstep ease
        const ease = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
        this.currentY = THREE.MathUtils.lerp(this.startY, this.targetY, ease);
        this.cabinGroup.position.y = this.currentY;

        // Update floor estimation
        const midFloor = ELEVATOR_FLOORS.reduce((closest, f) => {
          return Math.abs(f.y - this.currentY) < Math.abs(closest.y - this.currentY) ? f : closest;
        }, ELEVATOR_FLOORS[0]);
        if (midFloor.index !== this.currentFloor) {
          this.currentFloor = midFloor.index;
          this.updateIndicatorDisplay();
        }

        // Update Fixed Rapier cabin floor & wall colliders
        this.syncCabinPhysics(this.currentY);

        if (player && this.playerInsideCabin) {
          player.isRidingElevator = true;
          player.elevatorY = this.currentY;
        }

        if (t >= 1) {
          this.currentY = this.targetY;
          this.currentFloor = this.targetFloor;
          this.cabinGroup.position.y = this.currentY;
          this.syncCabinPhysics(this.currentY);
          this.state = 'opening';
          this.justArrived = true;
          this.updateIndicatorDisplay();
          this.menuTriggeredThisRide = false; // Reset for next ride
          if (player) {
            player.isRidingElevator = false;
          }
          callbacks?.onElevatorArrive?.(); // Play arrival Ding!
          callbacks?.onDoorToggle(true); // Play door open slide sound!
        }
        break;
      }
      case 'opening': {
        this.doorOpenFactor = Math.min(1, this.doorOpenFactor + dt * 2.2);
        this.setDoorsOpen(this.doorOpenFactor);
        if (this.doorOpenFactor >= 0.999) {
          this.doorOpenFactor = 1;
          this.setDoorsOpen(1);
          this.state = 'open';
          this.waitOpenTimer = 6.0; // Hold open for 6.0s
        }
        break;
      }
      case 'open': {
        this.waitOpenTimer -= dt;
        if (this.waitOpenTimer <= 0) {
          if (this.queuedFloors.length > 0) {
            this.processNextQueuedFloor(callbacks);
          } else {
            this.state = 'closing';
            callbacks?.onDoorToggle(false);
          }
        }
        break;
      }
      case 'idle': {
        if (this.queuedFloors.length > 0) {
          this.processNextQueuedFloor(callbacks);
        } else if (
          this.playerInsideCabin &&
          !this.menuTriggeredThisRide &&
          !this.justArrived &&
          this.doorOpenFactor <= 0.01
        ) {
          // In case doors were already closed when player was inside
          this.menuTriggeredThisRide = true;
          this.openDestinationMenu(callbacks);
        }
        break;
      }
    }

    // Carry NPC Passenger Logic inside cabin bounds
    const deltaY = this.currentY - prevY;
    if (Math.abs(deltaY) > 0.0001) {
      for (const npc of npcs) {
        const ndx = npc.position.x - this.shaftX;
        const ndz = npc.position.z - this.shaftZ;
        const inNpcCabin =
          Math.abs(ndx) < this.cabinW * 0.5 + 0.1 &&
          Math.abs(ndz) < this.cabinD * 0.5 + 0.1 &&
          npc.position.y >= prevY - 0.4 &&
          npc.position.y <= prevY + 2.7;

        if (inNpcCabin) {
          npc.position.y = this.currentY;
          npc.rig.root.position.copy(npc.position);
        }
      }
    }

    // NPC Autonomous Handler
    if (this.activeNpcPassenger) {
      this.updateActiveNpcPassenger(dt, callbacks);
    }
  }

  private setDoorsOpen(factor: number): void {
    const maxSlide = 0.90; // Slide open by 90cm to each side
    const slide = factor * maxSlide;

    // Cabin Doors
    this.cabinLeafL.position.x = -0.44 - slide;
    this.cabinLeafR.position.x = 0.44 + slide;

    const doorLeafH = this.cabinH - 0.35;

    // Floor Doors across all 4 floors
    for (const d of this.floorDoors) {
      if (d.floorIndex === this.currentFloor) {
        d.leafL.position.x = -0.44 - slide;
        d.leafR.position.x = 0.44 + slide;

        if (factor > 0.05) {
          // Open: set to sensors and slide open with the leaves so doorway is completely clear
          d.colL.collider.setSensor(true);
          d.colR.collider.setSensor(true);
          const posL = {
            x: this.shaftX - 0.44 - slide,
            y: ELEVATOR_FLOORS[this.currentFloor].y + doorLeafH * 0.5,
            z: this.doorZ,
          };
          const posR = {
            x: this.shaftX + 0.44 + slide,
            y: ELEVATOR_FLOORS[this.currentFloor].y + doorLeafH * 0.5,
            z: this.doorZ,
          };
          d.colL.body.setNextKinematicTranslation(posL);
          d.colR.body.setNextKinematicTranslation(posR);
        } else {
          // Closed: solid colliders blocking the doorway
          d.colL.collider.setSensor(false);
          d.colR.collider.setSensor(false);
          const posL = {
            x: this.shaftX - 0.44,
            y: ELEVATOR_FLOORS[this.currentFloor].y + doorLeafH * 0.5,
            z: this.doorZ,
          };
          const posR = {
            x: this.shaftX + 0.44,
            y: ELEVATOR_FLOORS[this.currentFloor].y + doorLeafH * 0.5,
            z: this.doorZ,
          };
          d.colL.body.setNextKinematicTranslation(posL);
          d.colR.body.setNextKinematicTranslation(posR);
        }
      } else {
        // Closed doors at other floors stay in place blocking shaft
        d.leafL.position.x = -0.44;
        d.leafR.position.x = 0.44;
        d.colL.collider.setSensor(false);
        d.colR.collider.setSensor(false);
        const posL = {
          x: this.shaftX - 0.44,
          y: ELEVATOR_FLOORS[d.floorIndex].y + doorLeafH * 0.5,
          z: this.doorZ,
        };
        const posR = {
          x: this.shaftX + 0.44,
          y: ELEVATOR_FLOORS[d.floorIndex].y + doorLeafH * 0.5,
          z: this.doorZ,
        };
        d.colL.body.setNextKinematicTranslation(posL);
        d.colR.body.setNextKinematicTranslation(posR);
      }
    }
  }

  public sendNpcToFloor(
    npc: CampusNPC,
    targetFloor: number,
    callbacks?: WorldBuildContext['callbacks']
  ): void {
    this.activeNpcPassenger = {
      npc,
      targetFloor,
      phase: 'waiting_outside',
      timer: 0,
    };
    const npcFloor = ELEVATOR_FLOORS.reduce((closest, f) => {
      return Math.abs(f.y - npc.position.y) < Math.abs(closest.y - npc.position.y) ? f : closest;
    }, ELEVATOR_FLOORS[0]);

    this.callToFloor(npcFloor.index, callbacks);
  }

  private updateActiveNpcPassenger(
    dt: number,
    callbacks?: WorldBuildContext['callbacks']
  ): void {
    if (!this.activeNpcPassenger) return;
    const { npc, targetFloor, phase } = this.activeNpcPassenger;
    this.activeNpcPassenger.timer += dt;

    switch (phase) {
      case 'waiting_outside': {
        const npcFloor = ELEVATOR_FLOORS.reduce((closest, f) => {
          return Math.abs(f.y - npc.position.y) < Math.abs(closest.y - npc.position.y) ? f : closest;
        }, ELEVATOR_FLOORS[0]);

        if (this.currentFloor === npcFloor.index && this.state === 'open') {
          this.activeNpcPassenger.phase = 'entering';
          this.activeNpcPassenger.timer = 0;
        }
        break;
      }
      case 'entering': {
        const targetCabinPos = new THREE.Vector3(this.shaftX, this.currentY, this.shaftZ);
        npc.position.lerp(targetCabinPos, dt * 2.0);
        npc.rig.root.position.copy(npc.position);

        if (this.activeNpcPassenger.timer > 1.2) {
          this.activeNpcPassenger.phase = 'riding';
          this.activeNpcPassenger.timer = 0;
          this.requestFloor(targetFloor, callbacks);
        }
        break;
      }
      case 'riding': {
        if (this.currentFloor === targetFloor && this.state === 'open') {
          this.activeNpcPassenger.phase = 'exiting';
          this.activeNpcPassenger.timer = 0;
        }
        break;
      }
      case 'exiting': {
        const exitPos = new THREE.Vector3(this.shaftX, this.currentY, this.doorZ + 1.8);
        npc.position.lerp(exitPos, dt * 2.0);
        npc.rig.root.position.copy(npc.position);

        if (this.activeNpcPassenger.timer > 1.4) {
          this.activeNpcPassenger = null;
        }
        break;
      }
    }
  }
}

export class ElevatorSystem {
  public readonly eastElevator: ElevatorCabin;
  public readonly westElevator: ElevatorCabin;

  constructor(
    ctx: WorldBuildContext,
    parent: THREE.Group,
    floorY: number,
    glassMat: THREE.MeshStandardMaterial
  ) {
    this.eastElevator = new ElevatorCabin(ctx, parent, 'east', glassMat);
    this.westElevator = new ElevatorCabin(ctx, parent, 'west', glassMat);
  }

  public update(
    dt: number,
    player: Player | undefined,
    npcs: CampusNPC[],
    callbacks?: WorldBuildContext['callbacks']
  ): void {
    this.eastElevator.update(dt, player, npcs, callbacks);
    this.westElevator.update(dt, player, npcs, callbacks);
  }

  public sendNpcToFloor(
    npc: CampusNPC,
    targetFloor: number,
    side: ElevatorSide = 'east',
    callbacks?: WorldBuildContext['callbacks']
  ): void {
    if (side === 'east') {
      this.eastElevator.sendNpcToFloor(npc, targetFloor, callbacks);
    } else {
      this.westElevator.sendNpcToFloor(npc, targetFloor, callbacks);
    }
  }
}
