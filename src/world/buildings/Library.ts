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
import { createBookshelf } from '../props/Bookshelf';
import { buildInstancedChairs, type ChairTransform } from '../props/Chair';

export function buildLibrary(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Library';

  const { physics, mats, interactions, doors, clocks, callbacks } = ctx;
  const floorY = 0.05;
  const wallH = 4.6;

  // Floor slab (X: +22..+50 = 28m, Z: +4..+24 = 20m)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 0.1, 20), mats.woodDesk);
  floor.position.set(36, floorY - 0.05, 14);
  floor.receiveShadow = true;
  group.add(floor);
  physics.addStaticBox(36, floorY - 0.05, 14, 14, 0.05, 10);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(28.4, 0.25, 20.4), mats.roof);
  roof.position.set(36, floorY + wallH + 0.12, 14);
  roof.castShadow = true;
  group.add(roof);
  addBuildingParapetAndHVAC(group, mats, 36, 14, 28.4, 20.4, floorY + wallH + 0.245, {
    hvacCount: 2,
    addSkylight: true,
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(27.6, 19.6), mats.plasterWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(36, floorY + wallH - 0.015, 14);
  group.add(ceiling);

  // North Wall (Z = 4)
  buildWallWithOpenings(group, physics, mats, {
    x: 36,
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
    x: 36,
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
    x: 36,
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
    x: 36,
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

  // Exterior notice board & Book Fair / Science Fair posters on Library South facade
  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-bookfair-lib',
    theme: 'bookfair',
    x: 33.25,
    y: 1.68,
    z: 24.19,
    rotY: 0,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-science-lib',
    theme: 'science',
    x: 34.3,
    y: 1.68,
    z: 24.19,
    rotY: 0,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorNoticeBoard(group, mats, interactions, {
    id: 'ext-board-lib-south',
    title: 'Babillard Culturel & Horaires',
    details:
      'Horaires étendus de la Bibliothèque (8h–18h), Foire aux Livres toute la semaine et ateliers de révision pour les examens blancs.',
    variant: 'courtyard',
    x: 38.3,
    y: 1.68,
    z: 24.19,
    rotY: 0,
    width: 1.62,
    height: 1.04,
    onReadNotice: callbacks.onReadNotice,
  });

  // East Wall (X = 50)
  buildWallWithOpenings(group, physics, mats, {
    x: 50,
    z: 14,
    length: 20,
    height: wallH,
    thickness: 0.3,
    axis: 'z',
    material: mats.brick,
    baseY: floorY,
  });
  addFacadeDetailing(group, mats, {
    x: 50,
    z: 14,
    length: 20,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    axis: 'z',
    pilasterOffsets: [-9.2, -3.2, 3.2, 9.2],
    vents: [
      { offset: -6.2, y: 3.5, scale: 1.0 },
      { offset: 6.2, y: 3.5, scale: 1.0 },
    ],
  });

  // West Wall facing Courtyard (X = 22)
  buildWallWithOpenings(group, physics, mats, {
    x: 22,
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
    x: 22,
    z: 14,
    length: 20,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    axis: 'z',
    pilasterOffsets: [-9.2, -2.3, 2.3, 9.2],
    skipPlinthRange: [-1.6, 1.6],
  });

  // Classical fluted-column & molded-pediment porticos at Library entrances
  createClassicalEntrancePortico(group, physics, mats, {
    x: 22,
    y: floorY,
    z: 14,
    rotY: -Math.PI / 2,
    spanWidth: 3.45,
    columnHeight: 3.35,
    depth: 0.72,
    columnRadius: 0.17,
    pedimentHeight: 0.76,
  });
  createClassicalEntrancePortico(group, physics, mats, {
    x: 36,
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

  doors.push(
    createDoor(group, physics, mats, interactions, {
      id: 'lib-west-courtyard',
      label: 'Bibliothèque (Entrée Cour)',
      x: 22,
      y: floorY,
      z: 14,
      rotY: Math.PI / 2,
      width: 2.4,
      height: 2.55,
      isGlass: true,
      onToggle: callbacks.onDoorToggle,
    }),
    createDoor(group, physics, mats, interactions, {
      id: 'lib-north',
      label: 'Bibliothèque (Passage Nord)',
      x: 36,
      y: floorY,
      z: 4,
      width: 2.3,
      height: 2.55,
      isGlass: true,
      onToggle: callbacks.onDoorToggle,
    })
  );

  // Librarian Counter
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 4.2), mats.woodDark);
  desk.position.set(26.0, floorY + 0.525, 11.5);
  desk.castShadow = true;
  group.add(desk);
  physics.addStaticBox(26.0, floorY + 0.525, 11.5, 0.55, 0.525, 2.1);

  // Photocopier next to counter
  const copier = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.8), mats.concrete);
  copier.position.set(26.0, floorY + 0.55, 7.2);
  group.add(copier);
  physics.addStaticBox(26.0, floorY + 0.55, 7.2, 0.45, 0.55, 0.4);

  // Rows of Bookshelves
  const shelfTitles = [
    'Histoire de Maplewood',
    'Sciences & Physique',
    'Littérature Classique',
    'Mathématiques Avancées',
    'Biologie & Écologie',
    'Arts & Musique',
  ];
  let titleIdx = 0;
  for (const sx of [33.5, 39.5, 45.5]) {
    for (const sz of [9.0, 14.5, 19.5]) {
      createBookshelf(group, physics, mats, interactions, {
        id: `lib-${sx}-${sz}`,
        title: shelfTitles[titleIdx % shelfTitles.length],
        x: sx,
        y: floorY,
        z: sz,
        rotY: Math.PI / 2,
        onReadBook: callbacks.onReadBook,
      });
      titleIdx++;
    }
  }

  // Study Tables + Media Computers + Classic Green Library Reading Lamps
  const ensureNonIndexedLib = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
  const libTableTopGeo = new RoundedBoxGeometry(3.2, 0.06, 1.22, 2, 0.02);
  const libLegParts: THREE.BufferGeometry[] = [];
  for (const lx of [-1.42, 1.42]) {
    for (const lz of [-0.46, 0.46]) {
      const leg = ensureNonIndexedLib(new THREE.CylinderGeometry(0.036, 0.028, 0.74, 10));
      leg.translate(lx, 0.37, lz);
      libLegParts.push(leg);
    }
  }
  const stretcher = ensureNonIndexedLib(new THREE.CylinderGeometry(0.022, 0.022, 2.84, 8));
  stretcher.rotateZ(Math.PI / 2);
  stretcher.translate(0, 0.18, 0);
  libLegParts.push(stretcher);
  const libLegsGeo = mergeGeometries(libLegParts);

  const chairs: ChairTransform[] = [];
  for (const tz of [8.5, 17.5]) {
    const table = new THREE.Mesh(libTableTopGeo, mats.woodDark);
    table.position.set(29.5, floorY + 0.76, tz);
    table.castShadow = true;
    table.receiveShadow = true;
    const legs = new THREE.Mesh(libLegsGeo, mats.chrome);
    legs.position.set(29.5, floorY, tz);
    group.add(table, legs);
    physics.addStaticBox(29.5, floorY + 0.39, tz, 1.6, 0.39, 0.6);

    chairs.push(
      { x: 28.7, y: floorY, z: tz - 0.85, rotY: 0 },
      { x: 30.3, y: floorY, z: tz - 0.85, rotY: 0 },
      { x: 28.7, y: floorY, z: tz + 0.85, rotY: Math.PI },
      { x: 30.3, y: floorY, z: tz + 0.85, rotY: Math.PI }
    );

    if (tz === 8.5) {
      const pc = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.32, 0.05, 2, 0.01), mats.navy);
      pc.position.set(29.5, floorY + 0.96, tz);
      const pcStand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.08, 8), mats.chrome);
      pcStand.position.set(29.5, floorY + 0.82, tz);
      group.add(pc, pcStand);
      interactions.register({
        id: 'lib-computer',
        label: 'consulter le catalogue sur PC',
        type: 'computer',
        targetObject: pc,
        worldPosition: new THREE.Vector3(29.5, floorY + 0.96, tz),
        onInteract: () => callbacks.onUseComputer('Centre de Médias — Bibliothèque'),
      });
    } else {
      // Classic green banker's reading lamp on the second study table
      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.06, 0.24, 10), mats.gold);
      lampStem.position.set(29.5, floorY + 0.9, tz);
      const lampShade = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x15803d, emissive: 0x14532d, emissiveIntensity: 0.4, roughness: 0.25 })
      );
      lampShade.position.set(29.5, floorY + 1.03, tz);
      group.add(lampStem, lampShade);
    }
  }
  buildInstancedChairs(group, mats, chairs);

  // Reading Poster & Clock
  const poster = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.2, 0.06),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('CENTRE DE MÉDIAS', 'LIRE · CHERCHER · CRÉER'),
      roughness: 0.6,
    })
  );
  poster.position.set(49.75, floorY + 2.5, 14);
  poster.rotation.y = -Math.PI / 2;
  group.add(poster);

  const clock = createWallClock(mats, 22.25, floorY + 3.2, 14, Math.PI / 2);
  group.add(clock.group);
  clocks.push(clock.clockRef);

  const pt = new THREE.PointLight(0xfff1d6, 2.2, 32, 1.2);
  pt.position.set(36, floorY + wallH - 0.6, 14);
  group.add(pt, createExitSign(mats, 22.25, floorY + 2.9, 14, Math.PI / 2));

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== floor) {
      ctx.cameraColliders.push(obj);
    }
  });

  ctx.scene.add(group);
  return group;
}
