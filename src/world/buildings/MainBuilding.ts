import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { WorldBuildContext } from '../WorldContext';
import { ElevatorSystem } from './ElevatorSystem';

interface CarpetZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const carpetZones: CarpetZone[] = [];

export function isOnCarpet(x: number, z: number): boolean {
  for (let i = 0; i < carpetZones.length; i++) {
    const zBox = carpetZones[i];
    if (x >= zBox.minX && x <= zBox.maxX && z >= zBox.minZ && z <= zBox.maxZ) {
      return true;
    }
  }
  return false;
}

export function stripBakedStaticElevatorParts(
  mesh: THREE.Mesh,
  baseName: 'MW_Elevators_Steel' | 'MW_Elevators_Brass'
): number {
  const geom = mesh.geometry;
  const posAttr = geom.getAttribute('position');
  if (!posAttr) return 0;

  const idxAttr = geom.index;
  const triCount = idxAttr ? Math.floor(idxAttr.count / 3) : Math.floor(posAttr.count / 3);
  const keptIndices: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let removedTris = 0;

  for (let t = 0; t < triCount; t++) {
    const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
    const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;

    a.fromBufferAttribute(posAttr, i0).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(posAttr, i1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(posAttr, i2).applyMatrix4(mesh.matrixWorld);

    const minAbsX = Math.min(Math.abs(a.x), Math.abs(b.x), Math.abs(c.x));
    const maxAbsX = Math.max(Math.abs(a.x), Math.abs(b.x), Math.abs(c.x));
    const minZ = Math.min(a.z, b.z, c.z);
    const maxZ = Math.max(a.z, b.z, c.z);

    // 1. Baked static closed door leaves inside the doorway opening (|x| in [13.15, 15.35], z in [-26.32, -26.22])
    const isInactiveStaticDoor =
      baseName === 'MW_Elevators_Steel' &&
      minAbsX >= 13.15 &&
      maxAbsX <= 15.35 &&
      minZ >= -26.32 &&
      maxZ <= -26.22;

    // 2. Baked static dummy cabin floor/ceiling slabs inside the shaft (|x| in [12.84, 15.66], z in [-29.68, -26.33])
    const isDummyStaticCabinSlab =
      minAbsX >= 12.84 && maxAbsX <= 15.66 && minZ >= -29.68 && maxZ <= -26.33;

    if (isInactiveStaticDoor || isDummyStaticCabinSlab) {
      removedTris++;
      continue;
    }

    keptIndices.push(i0, i1, i2);
  }

  if (removedTris > 0) {
    geom.setIndex(keptIndices);
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
  }
  return removedTris;
}

/**
 * Builds the new Grand American Campus MainBuilding exported from Blender (`main_building.glb`),
 * with shared materials, static matrix optimization, selective shadow casting, walkable Rapier
 * trimesh colliders, and the new Grand Reception Desk inside the Hall d'accueil.
 */
export function buildMainBuilding(ctx: WorldBuildContext): THREE.Group {
  carpetZones.length = 0;
  const group = new THREE.Group();
  group.name = 'MainBuilding';

  const { physics, mats, cameraColliders } = ctx;
  const floorY = 0.05;

  // Shared transparent glass material (fast alpha blend, no expensive transmission pass)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9ecae1,
    transparent: true,
    opacity: 0.34,
    roughness: 0.08,
    metalness: 0.12,
    depthWrite: false,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0x458b74,
    roughness: 0.42,
    metalness: 0.45,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x383c44,
    roughness: 0.35,
    metalness: 0.85,
  });
  const signCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0x731014,
    roughness: 0.35,
  });
  // Clean matte architectural floor material (avoids stretched/z-fighting checkerboard linoleum UVs)
  const cleanFloorMat = new THREE.MeshStandardMaterial({
    color: 0xd6d1c7,
    roughness: 0.72,
    metalness: 0.04,
  });

  // Fallback ground slab under the 132m x 26m footprint while GLB streams in (recessed 3cm to avoid z-fighting)
  const baseFloor = new THREE.Mesh(new THREE.BoxGeometry(132, 0.1, 26), cleanFloorMat);
  baseFloor.position.set(0, floorY - 0.08, -24.0);
  baseFloor.receiveShadow = true;
  baseFloor.matrixAutoUpdate = false;
  baseFloor.updateMatrix();
  group.add(baseFloor);
  physics.addStaticBox(0, floorY - 0.05, -24.0, 66, 0.05, 13);

  // Lightweight camera collider box for the exterior shell
  const camBox1 = new THREE.Mesh(new THREE.BoxGeometry(132, 22, 23));
  camBox1.position.set(0, 11, -24.0);
  camBox1.visible = false;
  camBox1.updateMatrixWorld(true);
  cameraColliders.push(camBox1);

  const EXTERIOR_SHADOW_CASTERS = new Set([
    'MW_Walls',
    'MW_Walls_Pediment',
    'MW_Roof',
    'MW_Columns',
    'MW_Stone',
    'MW_Trim_Main',
    'MW_Trim_Portico',
    'MW_Cupola_White',
    'MW_Cupola_Copper',
    'MW_Cupola_Finials',
  ]);
  const COLLIDER_MESHES = new Set([
    'MW_Floors',
    'MW_Walls',
    'MW_InteriorWalls',
    'MW_InteriorStairs',
    'MW_Stone',
    'MW_Columns',
  ]);

  const loader = new GLTFLoader();
  loader.load(
    '/assets/models/main_building.glb',
    (gltf) => {
      const building = gltf.scene;
      building.name = 'MainBuilding_Blender';
      // 1:1 monumental scale (132m x 26m, 4.3m ceilings, spacious rooms for 10+ NPCs)
      building.scale.set(1, 1, 1);
      // Align Blender Level 0 (Z=0.6m) to floorY (0.05m) -> Y = -0.55m, North of Courtyard
      building.position.set(0, floorY - 0.6, -24.0);
      building.updateMatrixWorld(true);

      const tmpPos = new THREE.Vector3();

      building.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        const name = mesh.name || '';
        const baseName = name.replace(/\.\d+$/, '');

        // Map to shared campus materials to cut shader & draw-call overhead
        const origMatName = Array.isArray(mesh.material)
          ? mesh.material[0]?.name || ''
          : mesh.material?.name || '';

        if (origMatName.startsWith('MW_Brick')) mesh.material = mats.brick;
        else if (origMatName.startsWith('MW_Slate')) mesh.material = mats.roof;
        else if (origMatName.startsWith('MW_Stone')) mesh.material = mats.limestone;
        else if (origMatName.startsWith('MW_WhiteTrim')) mesh.material = mats.plasterWall;
        else if (origMatName.startsWith('MW_InteriorPlaster')) mesh.material = mats.plasterWall;
        else if (origMatName.startsWith('MW_Concrete')) mesh.material = cleanFloorMat;
        else if (origMatName.startsWith('MW_Glass')) mesh.material = glassMat;
        else if (origMatName.startsWith('MW_Copper')) mesh.material = copperMat;
        else if (origMatName.startsWith('MW_Gold')) mesh.material = mats.gold;
        else if (origMatName.startsWith('MW_ElevSteel')) mesh.material = steelMat;
        else if (origMatName.startsWith('MW_SignCrimson')) mesh.material = signCrimsonMat;

        const isSign = baseName.startsWith('Sign_');
        mesh.castShadow = EXTERIOR_SHADOW_CASTERS.has(baseName);
        mesh.receiveShadow = !isSign && !baseName.includes('Glass');
        mesh.frustumCulled = true;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();

        // Remove baked inactive static elevator doors & dummy cabin slabs from main_building.glb
        // so only the animated interactive ElevatorSystem doors and cabins appear.
        if (
          (baseName === 'MW_Elevators_Steel' || baseName === 'MW_Elevators_Brass') &&
          mesh.geometry
        ) {
          stripBakedStaticElevatorParts(mesh, baseName);
        }

        // Register walkable & wall trimesh colliders in Rapier
        if (COLLIDER_MESHES.has(baseName) && mesh.geometry) {
          const posAttr = mesh.geometry.getAttribute('position');
          if (posAttr) {
            const worldMat = mesh.matrixWorld;
            const verts = new Float32Array(posAttr.count * 3);
            for (let i = 0; i < posAttr.count; i++) {
              tmpPos.fromBufferAttribute(posAttr, i).applyMatrix4(worldMat);
              verts[i * 3] = tmpPos.x;
              verts[i * 3 + 1] = tmpPos.y;
              verts[i * 3 + 2] = tmpPos.z;
            }
            let indices: Uint32Array;
            if (mesh.geometry.index) {
              const idxArr = mesh.geometry.index.array;
              indices = new Uint32Array(idxArr.length);
              for (let i = 0; i < idxArr.length; i++) indices[i] = idxArr[i];
            } else {
              indices = new Uint32Array(posAttr.count);
              for (let i = 0; i < posAttr.count; i++) indices[i] = i;
            }
            physics.addStaticTrimesh(verts, indices);
          }
        }
      });

      group.add(building);
    },
    undefined,
    (err) => {
      console.warn('Failed to load main_building.glb:', err);
    }
  );

  // Load interactive Georgian double entrance door at the front portico doorway
  loadMainEntranceDoor(ctx, group, floorY, glassMat);
  // Load interactive stairwell doors across all 4 levels (East & West)
  loadStairwellDoors(ctx, group, floorY, glassMat);
  // Load interactive glass elevators across all 4 levels (East & West)
  const elevatorSystem = new ElevatorSystem(ctx, group, floorY, glassMat);
  ctx.setElevatorSystem?.(elevatorSystem);
  // Load Blender-modeled Hall d'accueil furniture & decor
  loadHallFurniture(ctx, group, floorY, glassMat);

  ctx.scene.add(group);
  return group;
}

function loadMainEntranceDoor(
  ctx: WorldBuildContext,
  parent: THREE.Group,
  floorY: number,
  glassMat: THREE.MeshStandardMaterial
): void {
  const { physics, mats, interactions, doors, callbacks } = ctx;
  const doorX = 0.0;
  const doorY = floorY;
  const doorZ = -11.275; // Blender Y=-12.725 -> Three Z = -(-12.725) - 24.0

  const doorWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3b1c10,
    roughness: 0.36,
    metalness: 0.04,
  });

  let leafLeft: THREE.Object3D | null = null;
  let leafRight: THREE.Object3D | null = null;
  let opened = false;
  let openElapsed = 0;
  let angle = 0;
  const AUTO_CLOSE_DISTANCE = 6.0;
  const MIN_OPEN_SECONDS = 0.8;

  const leafW = 1.375;
  const leafH = 3.13;
  const leafT = 0.09;
  const hingeOffset = 1.38;

  const colL = physics.addKinematicDoorBox(
    doorX - hingeOffset + leafW * 0.5,
    doorY + leafH * 0.5,
    doorZ,
    leafW * 0.5,
    leafH * 0.5,
    leafT * 0.5
  );
  const colR = physics.addKinematicDoorBox(
    doorX + hingeOffset - leafW * 0.5,
    doorY + leafH * 0.5,
    doorZ,
    leafW * 0.5,
    leafH * 0.5,
    leafT * 0.5
  );

  const syncColliders = () => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const halfW = leafW * 0.5;
    const isSensor = Math.abs(angle) > 0.45;

    // Left leaf swings +angle around +Y (inward toward -Z)
    colL.body.setNextKinematicTranslation({
      x: doorX - hingeOffset + halfW * cosA,
      y: doorY + leafH * 0.5,
      z: doorZ - halfW * sinA,
    });
    colL.body.setNextKinematicRotation({
      x: 0,
      y: Math.sin(angle * 0.5),
      z: 0,
      w: Math.cos(angle * 0.5),
    });
    colL.collider.setSensor(isSensor);

    // Right leaf swings -angle around +Y (inward toward -Z)
    colR.body.setNextKinematicTranslation({
      x: doorX + hingeOffset - halfW * cosA,
      y: doorY + leafH * 0.5,
      z: doorZ - halfW * sinA,
    });
    colR.body.setNextKinematicRotation({
      x: 0,
      y: Math.sin(-angle * 0.5),
      z: 0,
      w: Math.cos(-angle * 0.5),
    });
    colR.collider.setSensor(isSensor);
  };

  syncColliders();

  const toggle = () => {
    opened = !opened;
    openElapsed = 0;
    callbacks.onDoorToggle(opened);
  };

  const doorRoot = new THREE.Group();
  doorRoot.name = 'MainEntranceDoor';
  doorRoot.position.set(doorX, doorY, doorZ);
  parent.add(doorRoot);

  // Invisible hit proxy so InteractionSystem raycast works immediately
  const hitProxy = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.2, 0.35));
  hitProxy.position.set(0, 1.6, 0);
  hitProxy.visible = false;
  doorRoot.add(hitProxy);

  interactions.register({
    id: 'door-main-entrance',
    label: "ouvrir / fermer : Entrée du Hall d'accueil",
    type: 'door',
    targetObject: doorRoot,
    worldPosition: new THREE.Vector3(doorX, doorY + 1.2, doorZ),
    maxDistance: 3.6,
    onInteract: toggle,
  });

  doors.push({
    update(dt: number, playerPos?: THREE.Vector3) {
      if (opened) {
        openElapsed += dt;
        if (playerPos && openElapsed >= MIN_OPEN_SECONDS) {
          const dist = Math.hypot(
            playerPos.x - doorX,
            playerPos.y - doorY,
            playerPos.z - doorZ
          );
          if (dist > AUTO_CLOSE_DISTANCE) {
            opened = false;
            openElapsed = 0;
          }
        }
      }
      const target = opened ? Math.PI * 0.48 : 0;
      const diff = target - angle;
      if (Math.abs(diff) > 0.002) {
        angle += diff * Math.min(1, dt * 7.5);
        if (leafLeft) leafLeft.rotation.y = angle;
        if (leafRight) leafRight.rotation.y = -angle;
        syncColliders();
      } else if (angle !== target) {
        angle = target;
        if (leafLeft) leafLeft.rotation.y = angle;
        if (leafRight) leafRight.rotation.y = -angle;
        syncColliders();
      }
    },
    isOpen: () => opened,
    toggle,
  });

  const loader = new GLTFLoader();
  loader.load(
    '/assets/models/main_entrance_door.glb',
    (gltf) => {
      const model = gltf.scene;
      model.traverse((obj) => {
        if (!leafLeft && obj.name === 'Door_Leaf_Left') leafLeft = obj;
        else if (!leafRight && obj.name === 'Door_Leaf_Right') leafRight = obj;

        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        const applyMat = (m: THREE.Material): THREE.Material => {
          const n = m.name || '';
          if (n.startsWith('MW_DoorWood')) return doorWoodMat;
          if (n.startsWith('MW_WhiteTrim')) return mats.plasterWall;
          if (n.startsWith('MW_Stone')) return mats.limestone;
          if (n.startsWith('MW_Brass')) return mats.gold;
          if (n.startsWith('MW_Glass')) return glassMat;
          return m;
        };
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(applyMat)
          : applyMat(mesh.material);
        mesh.castShadow = !mesh.name.includes('Glass');
        mesh.receiveShadow = true;
      });
      if (leafLeft) (leafLeft as THREE.Object3D).rotation.y = angle;
      if (leafRight) (leafRight as THREE.Object3D).rotation.y = -angle;
      doorRoot.add(model);
      // Re-tag loaded meshes so InteractionSystem raycasts detect them
      interactions.unregister('door-main-entrance');
      interactions.register({
        id: 'door-main-entrance',
        label: "ouvrir / fermer : Entrée du Hall d'accueil",
        type: 'door',
        targetObject: doorRoot,
        worldPosition: new THREE.Vector3(doorX, doorY + 1.2, doorZ),
        maxDistance: 3.6,
        onInteract: toggle,
      });
    },
    undefined,
    (err) => {
      console.warn('Failed to load main_entrance_door.glb:', err);
    }
  );
}

function loadStairwellDoors(
  ctx: WorldBuildContext,
  parent: THREE.Group,
  floorY: number,
  glassMat: THREE.MeshStandardMaterial
): void {
  const { physics, mats, interactions, doors, callbacks } = ctx;

  const doorMetalMat = new THREE.MeshStandardMaterial({
    color: 0x545b63,
    roughness: 0.42,
    metalness: 0.28,
  });
  const kickPlateMat = new THREE.MeshStandardMaterial({
    color: 0x8a9299,
    roughness: 0.28,
    metalness: 0.72,
  });
  const panicBarMat = new THREE.MeshStandardMaterial({
    color: 0x202225,
    roughness: 0.35,
    metalness: 0.55,
  });
  const panicBarActiveMat = new THREE.MeshStandardMaterial({
    color: 0x9e2424,
    roughness: 0.35,
    metalness: 0.3,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3d4349,
    roughness: 0.45,
    metalness: 0.3,
  });

  const leafW = 0.88;
  const leafH = 2.66;
  const leafT = 0.055;
  const hingeOffset = 0.90;
  const AUTO_CLOSE_DISTANCE = 5.5;
  const MIN_OPEN_SECONDS = 0.8;

  const doorConfigs = [
    { id: 'east-f0', name: "Cage d'escalier Est - RDC", x: 39.0, y: floorY, z: -26.20 },
    { id: 'east-f1', name: "Cage d'escalier Est - Étage 1", x: 39.0, y: floorY + 4.80, z: -26.20 },
    { id: 'east-f2', name: "Cage d'escalier Est - Étage 2", x: 39.0, y: floorY + 9.40, z: -26.20 },
    { id: 'east-f3', name: "Cage d'escalier Est - Étage 3", x: 39.0, y: floorY + 14.00, z: -26.20 },
    { id: 'west-f0', name: "Cage d'escalier Ouest - RDC", x: -39.0, y: floorY, z: -26.20 },
    { id: 'west-f1', name: "Cage d'escalier Ouest - Étage 1", x: -39.0, y: floorY + 4.80, z: -26.20 },
    { id: 'west-f2', name: "Cage d'escalier Ouest - Étage 2", x: -39.0, y: floorY + 9.40, z: -26.20 },
    { id: 'west-f3', name: "Cage d'escalier Ouest - Étage 3", x: -39.0, y: floorY + 14.00, z: -26.20 },
  ];

  for (const cfg of doorConfigs) {
    const doorX = cfg.x;
    const doorY = cfg.y;
    const doorZ = cfg.z;

    let opened = false;
    let openElapsed = 0;
    let angle = 0;

    const colL = physics.addKinematicDoorBox(
      doorX - hingeOffset + leafW * 0.5,
      doorY + leafH * 0.5,
      doorZ,
      leafW * 0.5,
      leafH * 0.5,
      leafT * 0.5
    );
    const colR = physics.addKinematicDoorBox(
      doorX + hingeOffset - leafW * 0.5,
      doorY + leafH * 0.5,
      doorZ,
      leafW * 0.5,
      leafH * 0.5,
      leafT * 0.5
    );

    const syncColliders = () => {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const halfW = leafW * 0.5;
      const isSensor = Math.abs(angle) > 0.40;

      colL.body.setNextKinematicTranslation({
        x: doorX - hingeOffset + halfW * cosA,
        y: doorY + leafH * 0.5,
        z: doorZ - halfW * sinA,
      });
      colL.body.setNextKinematicRotation({
        x: 0,
        y: Math.sin(angle * 0.5),
        z: 0,
        w: Math.cos(angle * 0.5),
      });
      colL.collider.setSensor(isSensor);

      colR.body.setNextKinematicTranslation({
        x: doorX + hingeOffset - halfW * cosA,
        y: doorY + leafH * 0.5,
        z: doorZ - halfW * sinA,
      });
      colR.body.setNextKinematicRotation({
        x: 0,
        y: Math.sin(-angle * 0.5),
        z: 0,
        w: Math.cos(-angle * 0.5),
      });
      colR.collider.setSensor(isSensor);
    };

    syncColliders();

    const toggle = () => {
      opened = !opened;
      openElapsed = 0;
      callbacks.onDoorToggle(opened);
    };

    const doorRoot = new THREE.Group();
    doorRoot.name = `StairwellDoor_${cfg.id}`;
    doorRoot.position.set(doorX, doorY, doorZ);
    parent.add(doorRoot);

    const createLeaf = (isLeft: boolean): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(isLeft ? -hingeOffset : hingeOffset, 0, 0);

      const leafGroup = new THREE.Group();
      const centerOffsetX = isLeft ? leafW * 0.5 : -leafW * 0.5;

      const panel = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, leafT), doorMetalMat);
      panel.position.set(centerOffsetX, leafH * 0.5, 0);
      panel.castShadow = true;
      panel.receiveShadow = true;
      leafGroup.add(panel);

      const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.98, 0.35, leafT + 0.008), kickPlateMat);
      kickPlate.position.set(centerOffsetX, 0.175, 0);
      kickPlate.castShadow = true;
      leafGroup.add(kickPlate);

      const winW = 0.32;
      const winH = 0.85;
      const winCenterY = 1.70;
      const winTrim = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.05, winH + 0.05, leafT + 0.01), frameMat);
      winTrim.position.set(centerOffsetX, winCenterY, 0);
      leafGroup.add(winTrim);

      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.015), glassMat);
      winGlass.position.set(centerOffsetX, winCenterY, 0);
      leafGroup.add(winGlass);

      const pushBar = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.82, 0.04, 0.035), panicBarActiveMat);
      pushBar.position.set(centerOffsetX, 1.05, leafT * 0.5 + 0.04);
      leafGroup.add(pushBar);

      const pushBarBase = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.86, 0.08, 0.02), panicBarMat);
      pushBarBase.position.set(centerOffsetX, 1.05, leafT * 0.5 + 0.015);
      leafGroup.add(pushBarBase);

      const pullHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.06), panicBarMat);
      pullHandle.position.set(
        isLeft ? centerOffsetX + leafW * 0.35 : centerOffsetX - leafW * 0.35,
        1.05,
        -leafT * 0.5 - 0.03
      );
      leafGroup.add(pullHandle);

      pivot.add(leafGroup);
      return pivot;
    };

    const pivotL = createLeaf(true);
    const pivotR = createLeaf(false);
    doorRoot.add(pivotL);
    doorRoot.add(pivotR);

    const hitProxy = new THREE.Mesh(new THREE.BoxGeometry(leafW * 2 + 0.4, leafH + 0.2, 0.5));
    hitProxy.position.set(0, (leafH + 0.2) * 0.5, 0);
    hitProxy.visible = false;
    doorRoot.add(hitProxy);

    interactions.register({
      id: `door-stairwell-${cfg.id}`,
      label: `ouvrir / fermer : ${cfg.name}`,
      type: 'door',
      targetObject: doorRoot,
      worldPosition: new THREE.Vector3(doorX, doorY + 1.35, doorZ),
      maxDistance: 3.5,
      onInteract: toggle,
    });

    doors.push({
      update(dt: number, playerPos?: THREE.Vector3) {
        if (opened) {
          openElapsed += dt;
          if (playerPos && openElapsed >= MIN_OPEN_SECONDS) {
            const dist = Math.hypot(
              playerPos.x - doorX,
              playerPos.y - doorY,
              playerPos.z - doorZ
            );
            if (dist > AUTO_CLOSE_DISTANCE) {
              opened = false;
              openElapsed = 0;
            }
          }
        }
        const target = opened ? Math.PI * 0.48 : 0;
        const diff = target - angle;
        if (Math.abs(diff) > 0.002) {
          angle += diff * Math.min(1, dt * 7.5);
          pivotL.rotation.y = angle;
          pivotR.rotation.y = -angle;
          syncColliders();
        } else if (angle !== target) {
          angle = target;
          pivotL.rotation.y = angle;
          pivotR.rotation.y = -angle;
          syncColliders();
        }
      },
      isOpen: () => opened,
      toggle,
    });
  }
}

function loadHallFurniture(
  ctx: WorldBuildContext,
  parent: THREE.Group,
  floorY: number,
  glassMat: THREE.MeshStandardMaterial
): void {
  const { physics, mats, interactions, callbacks, animatedObjects } = ctx;
  const screenMat = createReceptionVideoScreenMaterial(animatedObjects);
  const loader = new GLTFLoader();
  loader.load(
    '/assets/models/hall_furniture.glb',
    (gltf) => {
      const furniture = gltf.scene;
      furniture.name = 'HallFurniture_Blender';
      furniture.position.set(0, floorY, -24.0);
      const receptionDesk = furniture.getObjectByName('Hall_ReceptionDesk');
      if (receptionDesk) {
        receptionDesk.position.x += 0.55;
        receptionDesk.position.z -= 0.75;
      }
      furniture.updateMatrixWorld(true);

      const tmpPos = new THREE.Vector3();
      const NO_COLLIDER_PREFIXES = ['Hall_Carpet', 'Hall_Chandelier', 'Hall_Banner', 'Hall_Planter'];

      furniture.traverse((obj) => {
        if (obj.name.startsWith('Hall_Planter')) {
          obj.getWorldPosition(tmpPos);
          physics.addStaticBox(tmpPos.x, floorY + 0.35, tmpPos.z, 0.36, 0.35, 0.36);
        }
        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        const origMatName = Array.isArray(mesh.material)
          ? mesh.material[0]?.name || ''
          : mesh.material?.name || '';

        if (origMatName.startsWith('MW_Glass')) mesh.material = glassMat;
        else if (origMatName.startsWith('MW_Brass')) mesh.material = mats.gold;
        else if (origMatName.startsWith('MW_Stone')) mesh.material = mats.limestone;
        else if (origMatName.startsWith('MW_Screen')) mesh.material = screenMat;
        else if (origMatName.startsWith('MW_Leaf') && !Array.isArray(mesh.material)) {
          mesh.material.side = THREE.DoubleSide;
        }

        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();

        const objName = mesh.parent?.name || mesh.name;
        const isCarpetMesh =
          objName.endsWith('_Rug') ||
          objName.startsWith('Hall_Carpet') ||
          mesh.name.endsWith('_Rug') ||
          mesh.name.startsWith('Hall_Carpet');
        if (isCarpetMesh) {
          const box = new THREE.Box3().setFromObject(mesh);
          carpetZones.push({
            minX: box.min.x,
            maxX: box.max.x,
            minZ: box.min.z,
            maxZ: box.max.z,
          });
        }
        const skipCol =
          objName.endsWith('_Rug') || NO_COLLIDER_PREFIXES.some((p) => objName.startsWith(p));
        if (!skipCol && !origMatName.startsWith('MW_Glass') && mesh.geometry) {
          const posAttr = mesh.geometry.getAttribute('position');
          if (posAttr) {
            const worldMat = mesh.matrixWorld;
            const verts = new Float32Array(posAttr.count * 3);
            for (let i = 0; i < posAttr.count; i++) {
              tmpPos.fromBufferAttribute(posAttr, i).applyMatrix4(worldMat);
              verts[i * 3] = tmpPos.x;
              verts[i * 3 + 1] = tmpPos.y;
              verts[i * 3 + 2] = tmpPos.z;
            }
            let indices: Uint32Array;
            if (mesh.geometry.index) {
              const idxArr = mesh.geometry.index.array;
              indices = new Uint32Array(idxArr.length);
              for (let i = 0; i < idxArr.length; i++) indices[i] = idxArr[i];
            } else {
              indices = new Uint32Array(posAttr.count);
              for (let i = 0; i < posAttr.count; i++) indices[i] = i;
            }
            physics.addStaticTrimesh(verts, indices);
          }
        }
      });

      parent.add(furniture);

      // Register interactive bulletin board & trophy cases
      const bulletin = furniture.getObjectByName('Hall_BulletinBoard');
      if (bulletin) {
        const wp = new THREE.Vector3();
        bulletin.getWorldPosition(wp);
        interactions.register({
          id: 'hall-bulletin-board',
          label: "lire le panneau d'affichage : Vie du Campus",
          type: 'whiteboard',
          targetObject: bulletin,
          worldPosition: new THREE.Vector3(wp.x, floorY + 1.5, wp.z),
          maxDistance: 3.2,
          onInteract: () =>
            callbacks.onReadNotice(
              'Panneau du Hall — Vie du Campus',
              '• Inscriptions aux clubs (Journal, Théâtre, Échecs, Robotique) au 2e étage\n• Tournoi inter-lycées des Aigles de MapleWood ce vendredi\n• Permanence de la Conseillère d’orientation : RDC Aile Ouest'
            ),
        });
      }

      const trophy1 = furniture.getObjectByName('Hall_TrophyCase_1');

        // Register interactive welcome brochure on the coffee tables
        let brochureRegistered = false;
        furniture.traverse((obj) => {
          if (!(obj as THREE.Mesh).isMesh) return;
          const name = (obj.name || '').toLowerCase();
          if (!name.includes('coffeetable')) return;
          const wp = new THREE.Vector3();
          obj.getWorldPosition(wp);
          interactions.register({
            id: `hall-brochure-${obj.name}`,
            label: 'lire la brochure de bienvenue',
            type: 'book',
            targetObject: obj,
            worldPosition: new THREE.Vector3(wp.x, floorY + 1.0, wp.z),
            maxDistance: 3.2,
            onInteract: () => callbacks.onViewBrochure(),
          });
          brochureRegistered = true;
        });
        if (!brochureRegistered) {
          const proxyGeo = new THREE.BoxGeometry(1.6, 0.4, 1.2);
          const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
          const proxy = new THREE.Mesh(proxyGeo, proxyMat);
          proxy.position.set(0, floorY + 0.5, -15.6);
          furniture.add(proxy);
          furniture.updateMatrixWorld(true);
          interactions.register({
            id: 'hall-brochure',
            label: 'lire la brochure de bienvenue',
            type: 'book',
            targetObject: proxy,
            worldPosition: new THREE.Vector3(0, floorY + 0.5, -15.6),
            maxDistance: 3.5,
            onInteract: () => callbacks.onViewBrochure(),
          });
        }
      if (trophy1) {
        const wp = new THREE.Vector3();
        trophy1.getWorldPosition(wp);
        interactions.register({
          id: 'hall-trophy-case',
          label: 'admirer les trophées des Aigles',
          type: 'book',
          targetObject: trophy1,
          worldPosition: new THREE.Vector3(wp.x, floorY + 1.3, wp.z),
          maxDistance: 3.2,
          onInteract: () =>
            callbacks.onReadNotice(
              'Vitrine des Trophées — Les Aigles de MapleWood',
              'Coupes régionales de basketball (2022, 2024), championnat académique de débat et médailles d’excellence scientifique.'
            ),
        });
      }

      // Register sitting interactions on all 4 Chesterfield armchairs & 2 sofas
      const seatNames = [
        'Hall_Lounge_West_Armchair_1',
        'Hall_Lounge_West_Armchair_2',
        'Hall_Lounge_East_Armchair_1',
        'Hall_Lounge_East_Armchair_2',
        'Hall_Lounge_West_Sofa',
        'Hall_Lounge_East_Sofa',
      ];
      const seatPos = new THREE.Vector3();
      const seatQuat = new THREE.Quaternion();
      const seatForward = new THREE.Vector3();
      for (const sName of seatNames) {
        const seatObj = furniture.getObjectByName(sName);
        if (!seatObj) continue;
        seatObj.getWorldPosition(seatPos);
        seatObj.getWorldQuaternion(seatQuat);
        // In glTF, Blender's local -Y (front of chair/sofa) becomes local +Z
        seatForward.set(0, 0, 1).applyQuaternion(seatQuat).normalize();
        const sitX = seatPos.x + seatForward.x * 0.10;
        const sitZ = seatPos.z + seatForward.z * 0.10;
        const sitYaw = Math.atan2(-seatForward.x, -seatForward.z);
        const isSofa = sName.endsWith('_Sofa');
        interactions.register({
          id: `seat-${sName}`,
          label: isSofa ? "s'asseoir / se lever : Canapé" : "s'asseoir / se lever : Fauteuil",
          type: 'locker',
          targetObject: seatObj,
          worldPosition: new THREE.Vector3(seatPos.x, floorY + 0.65, seatPos.z),
          maxDistance: 2.8,
          onInteract: () => callbacks.onSit?.(sitX, floorY, sitZ, sitYaw),
        });
      }
    },
    undefined,
    (err) => {
      console.warn('Failed to load hall_furniture.glb:', err);
    }
  );

  // Warm chandelier light in the Hall d'accueil (Blender Y=-5.2 -> Three Z = -24 + 5.2 = -18.8)
  const hallLight = new THREE.PointLight(0xffe6ba, 2.4, 28, 1.4);
  hallLight.position.set(0, floorY + 7.2, -18.8);
  parent.add(hallLight);
}

function createReceptionVideoScreenMaterial(
  animatedObjects: Array<(elapsed: number, dt: number) => void>
): THREE.MeshBasicMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const c = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const drawFrame = (t: number) => {
    if (!c) return;
    const W = 512;
    const H = 320;

    // Desktop background
    c.fillStyle = '#0d1b2a';
    c.fillRect(0, 0, W, H);

    // Top OS / MapleWood TV header bar
    c.fillStyle = '#14263d';
    c.fillRect(0, 0, W, 34);
    c.fillStyle = '#d4af37';
    c.font = 'bold 15px sans-serif';
    c.fillText('MAPLEWOOD TV  •  CAMPUS LIVE', 14, 22);

    // Blinking LIVE badge
    if (Math.sin(t * 4.5) > -0.2) {
      c.fillStyle = '#e63946';
      c.beginPath();
      c.arc(W - 62, 17, 6, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#f8f9fa';
    c.font = 'bold 13px sans-serif';
    c.fillText('LIVE', W - 48, 22);

    // Left main video player frame (332 x 238)
    const vx = 12;
    const vy = 44;
    const vw = 332;
    const vh = 238;
    const skyGrad = c.createLinearGradient(vx, vy, vx, vy + vh);
    skyGrad.addColorStop(0, '#1d3557');
    skyGrad.addColorStop(0.65, '#457b9d');
    skyGrad.addColorStop(1, '#a8dadc');
    c.fillStyle = skyGrad;
    c.fillRect(vx, vy, vw, vh);

    // Animated drifting clouds
    c.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 3; i++) {
      const cx = vx + (((t * (18 + i * 7) + i * 110) % (vw + 80)) - 40);
      const cy = vy + 36 + i * 26;
      c.beginPath();
      c.ellipse(cx, cy, 28, 11, 0, 0, Math.PI * 2);
      c.fill();
    }

    // Green campus lawn & silhouette building
    c.fillStyle = '#2d6a4f';
    c.fillRect(vx, vy + 168, vw, 70);
    c.fillStyle = '#731014';
    c.fillRect(vx + 72, vy + 108, 188, 62);
    c.fillStyle = '#f1faee';
    c.fillRect(vx + 136, vy + 98, 60, 72);

    // Animated pulsing MapleWood Eagles crest & bouncing basketball
    const pulse = 1 + Math.sin(t * 3.2) * 0.06;
    c.save();
    c.translate(vx + vw * 0.5, vy + 66);
    c.scale(pulse, pulse);
    c.fillStyle = '#d4af37';
    c.beginPath();
    c.arc(0, 0, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#731014';
    c.font = 'bold 14px sans-serif';
    c.textAlign = 'center';
    c.fillText('EAGLES', 0, 5);
    c.restore();
    c.textAlign = 'left';

    const ballX = vx + 46 + ((t * 55) % (vw - 92));
    const ballY = vy + 188 - Math.abs(Math.sin(t * 5.2)) * 42;
    c.fillStyle = '#e76f51';
    c.beginPath();
    c.arc(ballX, ballY, 10, 0, Math.PI * 2);
    c.fill();

    // Video player scrubber bar at bottom of video
    c.fillStyle = 'rgba(0,0,0,0.65)';
    c.fillRect(vx, vy + vh - 26, vw, 26);
    c.fillStyle = '#495057';
    c.fillRect(vx + 12, vy + vh - 15, vw - 24, 5);
    const prog = (t * 0.08) % 1;
    c.fillStyle = '#e63946';
    c.fillRect(vx + 12, vy + vh - 15, (vw - 24) * prog, 5);

    // Right sidebar: Live visitor log / Helen's typing console
    const rx = 354;
    c.fillStyle = '#102030';
    c.fillRect(rx, 44, W - rx - 12, 238);
    c.fillStyle = '#a8dadc';
    c.font = 'bold 12px monospace';
    c.fillText('REGISTRE ACCUEIL', rx + 10, 64);

    const logs = [
      '> Florie : Entree OK',
      '> Portes : Auto-Lock',
      '> Hall : 21.5 C',
      '> Club Journal 14h',
      '> Match Aigles Ven.',
      '> Helen : En ligne',
    ];
    const scrollShift = Math.floor(t * 0.9) % logs.length;
    c.font = '11px monospace';
    for (let i = 0; i < 6; i++) {
      const line = logs[(i + scrollShift) % logs.length];
      c.fillStyle = i === 5 ? '#70e000' : '#ced4da';
      c.fillText(line, rx + 10, 92 + i * 28);
    }

    // Bottom scrolling news ticker
    c.fillStyle = '#731014';
    c.fillRect(0, H - 28, W, 28);
    c.fillStyle = '#ffffff';
    c.font = 'bold 13px sans-serif';
    const ticker = 'BIENVENUE A MAPLEWOOD HIGH  •  TOURNOI DES AIGLES VENDREDI 17H  •  INSCRIPTIONS CLUBS OUVERTES  •  ';
    const offset = (t * 68) % 520;
    c.fillText(ticker + ticker, -offset, H - 9);

    tex.needsUpdate = true;
  };

  drawFrame(0);
  let accum = 0;
  animatedObjects.push((elapsed, dt) => {
    accum += dt;
    if (accum >= 0.05) {
      accum = 0;
      drawFrame(elapsed);
    }
  });

  return new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
}
