import * as THREE from 'three';
import {
  addBuildingParapetAndHVAC,
  addFacadeDetailing,
  buildWallWithOpenings,
  createExitSign,
  createWallClock,
} from '../../utils/Geometry';
import { createSignTexture, createUSFlagTexture } from '../../utils/Materials';
import type { WorldBuildContext } from '../WorldContext';
import { createDoor } from '../props/Door';
import { createTeacherDesk } from '../props/Desk';
import { createBookshelf } from '../props/Bookshelf';
import { buildInstancedChairs } from '../props/Chair';

export function buildAdminOffice(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'AdminOffice';

  const { physics, mats, interactions, doors, clocks, callbacks } = ctx;
  const wallH = 4.2;
  const floorY = 0.05;

  // Floor slab (X: -52..-32 = 20m, Z: -23..-6 = 17m)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 17), mats.linoleum);
  floor.position.set(-42, floorY - 0.05, -14.5);
  floor.receiveShadow = true;
  group.add(floor);
  physics.addStaticBox(-42, floorY - 0.05, -14.5, 10, 0.05, 8.5);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.25, 17.4), mats.roof);
  roof.position.set(-42, floorY + wallH + 0.12, -14.5);
  roof.castShadow = true;
  group.add(roof);
  addBuildingParapetAndHVAC(group, mats, -42, -14.5, 20.4, 17.4, floorY + wallH + 0.245, {
    hvacCount: 2,
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 16.6), mats.plasterWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(-42, floorY + wallH - 0.015, -14.5);
  group.add(ceiling);

  // Exterior West Wall (X = -52)
  buildWallWithOpenings(group, physics, mats, {
    x: -52,
    z: -14.5,
    length: 17,
    height: wallH,
    thickness: 0.3,
    axis: 'z',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -4.5, width: 2.8, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 4.5, width: 2.8, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });

  // Exterior North Wall (Z = -23)
  buildWallWithOpenings(group, physics, mats, {
    x: -42,
    z: -23,
    length: 20,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -5, width: 3.0, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 5, width: 3.0, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });

  // Exterior South Wall (Z = -6)
  buildWallWithOpenings(group, physics, mats, {
    x: -42,
    z: -6,
    length: 20,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -6, width: 2.6, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 2, width: 2.6, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: -42,
    z: -6,
    length: 20,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    pilasterOffsets: [-9.2, -2, 6.2],
    vents: [{ offset: 8.0, y: 3.1, scale: 0.9 }],
  });
  addFacadeDetailing(group, mats, {
    x: -42,
    z: -23,
    length: 20,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    pilasterOffsets: [-9.2, 0, 9.2],
    vents: [
      { offset: -1.8, y: 3.1, scale: 0.85 },
      { offset: 1.8, y: 3.1, scale: 0.85 },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: -52,
    z: -14.5,
    length: 17,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    axis: 'z',
    pilasterOffsets: [-7.8, -1.6, 1.6, 7.8],
    vents: [{ offset: 0, y: 3.1, scale: 1.05 }],
  });

  // Corridor walls (Z = -15.75 and Z = -12.25)
  buildWallWithOpenings(group, physics, mats, {
    x: -42,
    z: -15.75,
    length: 20,
    height: wallH,
    thickness: 0.2,
    axis: 'x',
    material: mats.plasterWall,
    baseY: floorY,
    openings: [
      { offset: -5, width: 1.4, height: 2.45, sillHeight: 0 }, // Principal (-47)
      { offset: 5, width: 1.4, height: 2.45, sillHeight: 0 },  // Secretary (-37)
    ],
  });

  buildWallWithOpenings(group, physics, mats, {
    x: -42,
    z: -12.25,
    length: 20,
    height: wallH,
    thickness: 0.2,
    axis: 'x',
    material: mats.plasterWall,
    baseY: floorY,
    openings: [
      { offset: -7, width: 1.4, height: 2.45, sillHeight: 0 }, // Teachers' Lounge (-49)
      { offset: -1, width: 1.4, height: 2.45, sillHeight: 0 }, // Counselor (-43)
      { offset: 6, width: 1.4, height: 2.45, sillHeight: 0 },  // Infirmary (-36)
    ],
  });

  // Partitions
  buildWallWithOpenings(group, physics, mats, {
    x: -42,
    z: -19.375,
    length: 7.25,
    height: wallH,
    thickness: 0.18,
    axis: 'z',
    material: mats.plasterWall,
    baseY: floorY,
  });
  for (const px of [-46, -40]) {
    buildWallWithOpenings(group, physics, mats, {
      x: px,
      z: -9.125,
      length: 6.25,
      height: wallH,
      thickness: 0.18,
      axis: 'z',
      material: mats.plasterWall,
      baseY: floorY,
    });
  }

  // Doors
  const adminDoors = [
    { id: 'principal', label: 'Bureau du Principal', x: -47, z: -15.75 },
    { id: 'secretary', label: 'Secrétariat', x: -37, z: -15.75 },
    { id: 'lounge', label: 'Salle des Professeurs', x: -49, z: -12.25 },
    { id: 'counselor', label: 'Conseillère d\'Orientation', x: -43, z: -12.25 },
    { id: 'infirmary', label: 'Infirmerie', x: -36, z: -12.25 },
  ];
  adminDoors.forEach((d) => {
    doors.push(
      createDoor(group, physics, mats, interactions, {
        id: `admin-${d.id}`,
        label: d.label,
        x: d.x,
        y: floorY,
        z: d.z,
        width: 1.35,
        height: 2.4,
        onToggle: callbacks.onDoorToggle,
      })
    );
  });

  // Principal's Office Furniture
  createTeacherDesk(group, physics, mats, -47, floorY, -20.5, 0);
  createBookshelf(group, physics, mats, interactions, {
    id: 'principal-shelf',
    title: 'Règlement & Archives de Maplewood',
    x: -50.8,
    y: floorY,
    z: -19.5,
    rotY: Math.PI / 2,
    onReadBook: callbacks.onReadBook,
  });

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.8),
    new THREE.MeshStandardMaterial({ map: createUSFlagTexture(), side: THREE.DoubleSide })
  );
  flag.position.set(-44.5, floorY + 2.2, -22.8);
  group.add(flag);

  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.5, 0.08),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('PRINCIPAL DONOVAN', 'ADMINISTRATION'),
      roughness: 0.4,
    })
  );
  plaque.position.set(-47, floorY + 2.75, -15.6);
  group.add(plaque);

  // Infirmary medical beds
  const bedMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
  for (const bx of [-38.2, -34.5]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 2.0), mats.chrome);
    frame.position.set(bx, floorY + 0.225, -7.8);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 1.95), bedMat);
    mattress.position.set(bx, floorY + 0.53, -7.8);
    group.add(frame, mattress);
    physics.addStaticBox(bx, floorY + 0.3, -7.8, 0.5, 0.3, 1.0);
  }

  // Staff Lounge table & Secretary desk (clear of room teleport centers)
  createTeacherDesk(group, physics, mats, -37, floorY, -20.8, 0);
  const confTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.76, 1.1), mats.woodDark);
  confTable.position.set(-49, floorY + 0.38, -7.8);
  group.add(confTable);
  physics.addStaticBox(-49, floorY + 0.38, -7.8, 1.2, 0.38, 0.55);

  buildInstancedChairs(group, mats, [
    { x: -47, y: floorY, z: -21.4, rotY: 0 },
    { x: -47, y: floorY, z: -18.7, rotY: Math.PI },
    { x: -37, y: floorY, z: -21.6, rotY: 0 },
    { x: -49.5, y: floorY, z: -6.9, rotY: Math.PI },
    { x: -48.5, y: floorY, z: -8.7, rotY: 0 },
    { x: -43, y: floorY, z: -8.2, rotY: 0 },
  ]);

  // Lighting & Clock
  const pt = new THREE.PointLight(0xfff1d6, 2.0, 22, 1.4);
  pt.position.set(-42, floorY + wallH - 0.5, -14);
  group.add(pt, createExitSign(mats, -51.6, floorY + 3.0, -14, Math.PI / 2));

  const c = createWallClock(mats, -42, floorY + 2.8, -15.6, 0);
  group.add(c.group);
  clocks.push(c.clockRef);

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== floor) {
      ctx.cameraColliders.push(obj);
    }
  });

  ctx.scene.add(group);
  return group;
}
