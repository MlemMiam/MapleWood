import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  addBuildingParapetAndHVAC,
  addFacadeDetailing,
  buildWallWithOpenings,
  createClassicalEntrancePortico,
  createExitSign,
  createExteriorNoticeBoard,
  createExteriorPoster,
  createWallClock,
} from '../../utils/Geometry';
import { createSignTexture } from '../../utils/Materials';
import type { WorldBuildContext } from '../WorldContext';
import { createDoor } from '../props/Door';
import { buildInstancedChairs, type ChairTransform } from '../props/Chair';
import { createVendingMachine } from '../props/VendingMachine';

export function buildCafeteria(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Cafeteria';

  const { physics, mats, interactions, doors, clocks, callbacks } = ctx;
  const floorY = 0.05;
  const wallH = 4.6;

  // Floor slab (X: -50..-22 = 28m, Z: +4..+24 = 20m)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 0.1, 20), mats.linoleum);
  floor.position.set(-36, floorY - 0.05, 14);
  floor.receiveShadow = true;
  group.add(floor);
  physics.addStaticBox(-36, floorY - 0.05, 14, 14, 0.05, 10);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(28.4, 0.25, 20.4), mats.roof);
  roof.position.set(-36, floorY + wallH + 0.12, 14);
  roof.castShadow = true;
  group.add(roof);
  addBuildingParapetAndHVAC(group, mats, -36, 14, 28.4, 20.4, floorY + wallH + 0.245, {
    hvacCount: 2,
    addSkylight: true,
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(27.6, 19.6), mats.plasterWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(-36, floorY + wallH - 0.015, 14);
  group.add(ceiling);

  // North Wall (Z = 4) with courtyard/breezeway door at X = -36
  buildWallWithOpenings(group, physics, mats, {
    x: -36,
    z: 4,
    length: 28,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -8, width: 4.0, height: 2.0, sillHeight: 0.9, glazed: true },
      { offset: 0, width: 2.6, height: 2.6, sillHeight: 0 },
      { offset: 8, width: 4.0, height: 2.0, sillHeight: 0.9, glazed: true },
    ],
  });

  // South Wall (Z = 24)
  buildWallWithOpenings(group, physics, mats, {
    x: -36,
    z: 24,
    length: 28,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -7, width: 4.2, height: 2.0, sillHeight: 0.9, glazed: true },
      { offset: 7, width: 4.2, height: 2.0, sillHeight: 0.9, glazed: true },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: -36,
    z: 4,
    length: 28,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    pilasterOffsets: [-12.5, -3.5, 3.5, 12.5],
    skipPlinthRange: [-1.5, 1.5],
    vents: [
      { offset: -11.0, y: 3.5, scale: 0.9 },
      { offset: 11.0, y: 3.5, scale: 0.9 },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: -36,
    z: 24,
    length: 28,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    pilasterOffsets: [-12.5, 0, 12.5],
    vents: [
      { offset: -2.2, y: 3.5, scale: 0.95 },
      { offset: 2.2, y: 3.5, scale: 0.95 },
    ],
  });

  // Exterior notice board & framed event posters on Cafeteria South facade (near covered walkway)
  createExteriorNoticeBoard(group, mats, interactions, {
    id: 'ext-board-cafe-south',
    title: 'Annonces Clubs & Cantine',
    details:
      'Menu spécial du jour à la Cafétéria, inscriptions au Club Théâtre (Salle 106), Club Écologie le mercredi à 15h et Foire aux Livres à la Bibliothèque.',
    variant: 'activities',
    x: -38.3,
    y: 1.68,
    z: 24.19,
    rotY: 0,
    width: 1.62,
    height: 1.04,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-musical-cafe',
    theme: 'musical',
    x: -34.2,
    y: 1.68,
    z: 24.19,
    rotY: 0,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-gameday-cafe',
    theme: 'gameday',
    x: -33.15,
    y: 1.68,
    z: 24.19,
    rotY: 0,
    onReadNotice: callbacks.onReadNotice,
  });

  // West Wall (X = -50)
  buildWallWithOpenings(group, physics, mats, {
    x: -50,
    z: 14,
    length: 20,
    height: wallH,
    thickness: 0.3,
    axis: 'z',
    material: mats.brick,
    baseY: floorY,
  });
  addFacadeDetailing(group, mats, {
    x: -50,
    z: 14,
    length: 20,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    axis: 'z',
    pilasterOffsets: [-9.2, -3.2, 3.2, 9.2],
    vents: [
      { offset: -6.2, y: 3.4, scale: 1.25 },
      { offset: 0, y: 3.4, scale: 1.35 },
      { offset: 6.2, y: 3.4, scale: 1.25 },
    ],
  });

  // East Wall facing Courtyard (X = -22) with big glass windows & double courtyard doors at Z = 14
  buildWallWithOpenings(group, physics, mats, {
    x: -22,
    z: 14,
    length: 20,
    height: wallH,
    thickness: 0.3,
    axis: 'z',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -5.5, width: 4.5, height: 2.2, sillHeight: 0.8, glazed: true },
      { offset: 0, width: 2.8, height: 2.6, sillHeight: 0 },
      { offset: 5.5, width: 4.5, height: 2.2, sillHeight: 0.8, glazed: true },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: -22,
    z: 14,
    length: 20,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    axis: 'z',
    pilasterOffsets: [-9.2, -2.3, 2.3, 9.2],
    skipPlinthRange: [-1.6, 1.6],
  });

  // Classical fluted-column & molded-pediment porticos at Cafeteria entrances
  createClassicalEntrancePortico(group, physics, mats, {
    x: -22,
    y: floorY,
    z: 14,
    rotY: Math.PI / 2,
    spanWidth: 3.45,
    columnHeight: 3.35,
    depth: 0.72,
    columnRadius: 0.17,
    pedimentHeight: 0.76,
  });
  createClassicalEntrancePortico(group, physics, mats, {
    x: -36,
    y: floorY,
    z: 4,
    rotY: Math.PI,
    spanWidth: 3.1,
    columnHeight: 3.25,
    depth: 0.42,
    columnRadius: 0.16,
    pedimentHeight: 0.68,
    addColumnColliders: false,
  });

  // Doors
  doors.push(
    createDoor(group, physics, mats, interactions, {
      id: 'cafe-east-courtyard',
      label: 'Cafétéria (Entrée Cour)',
      x: -22,
      y: floorY,
      z: 14,
      rotY: Math.PI / 2,
      width: 2.4,
      height: 2.55,
      isGlass: true,
      onToggle: callbacks.onDoorToggle,
    }),
    createDoor(group, physics, mats, interactions, {
      id: 'cafe-north',
      label: 'Cafétéria (Passage Nord)',
      x: -36,
      y: floorY,
      z: 4,
      width: 2.3,
      height: 2.55,
      isGlass: true,
      onToggle: callbacks.onDoorToggle,
    })
  );

  // Serving Counter along West Wall (X = -47)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 11.0), mats.chrome);
  counter.position.set(-46.5, floorY + 0.5, 14);
  counter.castShadow = true;
  const sneezeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 10.6), mats.tintedGlass);
  sneezeGuard.position.set(-46.1, floorY + 1.28, 14);
  group.add(counter, sneezeGuard);
  physics.addStaticBox(-46.5, floorY + 0.5, 14, 0.7, 0.5, 5.5);

  // Interactive Vending Machines near North-East corner
  createVendingMachine(group, physics, mats, interactions, {
    id: 'cafe-drinks',
    kind: 'Boissons',
    x: -24.5,
    y: floorY,
    z: 5.2,
    rotY: 0,
    onUse: callbacks.onUseVending,
  });
  createVendingMachine(group, physics, mats, interactions, {
    id: 'cafe-snacks',
    kind: 'Snacks',
    x: -26.0,
    y: floorY,
    z: 5.2,
    rotY: 0,
    onUse: callbacks.onUseVending,
  });

  // Recycling / Sorting Bins
  const binColors = [0x2563eb, 0x16a34a, 0xd97706];
  binColors.forEach((col, i) => {
    const bin = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.85, 0.5),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })
    );
    bin.position.set(-29.5 + i * 0.65, floorY + 0.425, 22.8);
    group.add(bin);
  });

  // Dining Tables & Instanced Chairs (clear aisle around X = -35.2)
  const ensureNonIndexedCafe = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
  const cafeTableTopGeo = new RoundedBoxGeometry(2.4, 0.055, 1.1, 2, 0.02);
  const cafePedParts: THREE.BufferGeometry[] = [];
  for (const px of [-0.72, 0.72]) {
    const col = ensureNonIndexedCafe(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 10));
    col.translate(px, 0.36, 0);
    const baseDisc = ensureNonIndexedCafe(new THREE.CylinderGeometry(0.24, 0.28, 0.03, 12));
    baseDisc.translate(px, 0.015, 0);
    cafePedParts.push(col, baseDisc);
  }
  const tieBar = ensureNonIndexedCafe(new THREE.CylinderGeometry(0.022, 0.022, 1.44, 8));
  tieBar.rotateZ(Math.PI / 2);
  tieBar.translate(0, 0.14, 0);
  cafePedParts.push(tieBar);
  const cafePedGeo = mergeGeometries(cafePedParts);

  const chairs: ChairTransform[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const tx = -42.8 + col * 5.2;
      const tz = 9.0 + row * 5.0;
      const table = new THREE.Mesh(cafeTableTopGeo, mats.woodDesk);
      table.position.set(tx, floorY + 0.76, tz);
      table.castShadow = true;
      table.receiveShadow = true;
      const ped = new THREE.Mesh(cafePedGeo, mats.chrome);
      ped.position.set(tx, floorY, tz);
      group.add(table, ped);
      physics.addStaticBox(tx, floorY + 0.39, tz, 1.2, 0.39, 0.55);

      for (const offset of [-0.75, 0.75]) {
        chairs.push({ x: tx + offset, y: floorY, z: tz - 0.82, rotY: 0 });
        chairs.push({ x: tx + offset, y: floorY, z: tz + 0.82, rotY: Math.PI });
      }
    }
  }
  buildInstancedChairs(group, mats, chairs);

  // Wall TV & Clock
  const tvTex = createSignTexture('MENU DU JOUR', 'BURGER MAISON · SALADE · JUS', '#111827', '#F0D778');
  const tv = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.2, 0.1),
    new THREE.MeshStandardMaterial({ map: tvTex, emissive: 0x111827, roughness: 0.25 })
  );
  tv.position.set(-49.75, floorY + 3.0, 14);
  tv.rotation.y = Math.PI / 2;
  group.add(tv);

  const clock = createWallClock(mats, -22.25, floorY + 3.2, 14, -Math.PI / 2);
  group.add(clock.group);
  clocks.push(clock.clockRef);

  const pt = new THREE.PointLight(0xfff1d6, 2.2, 32, 1.2);
  pt.position.set(-36, floorY + wallH - 0.6, 14);
  group.add(pt, createExitSign(mats, -22.25, floorY + 2.9, 14, -Math.PI / 2));

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== floor) {
      ctx.cameraColliders.push(obj);
    }
  });

  ctx.scene.add(group);
  return group;
}
