import * as THREE from 'three';
import {
  addBuildingParapetAndHVAC,
  addFacadeDetailing,
  buildWallWithOpenings,
  createExitSign,
  createExteriorPoster,
} from '../../utils/Geometry';
import { createSignTexture } from '../../utils/Materials';
import type { WorldBuildContext } from '../WorldContext';
import { createDoor } from '../props/Door';

export function buildGymnasium(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Gymnasium';

  const { physics, mats, interactions, doors, callbacks } = ctx;
  const floorY = 0.05;
  const wallH = 11.5;

  // --- North Connector Corridor (X: -2.5..2.5, Z: -31..-23) linking Main Building to Gym ---
  const connFloor = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 8), mats.linoleum);
  connFloor.position.set(0, floorY - 0.05, -27);
  connFloor.receiveShadow = true;
  group.add(connFloor);
  physics.addStaticBox(0, floorY - 0.05, -27, 2.5, 0.05, 4);

  const connRoof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 8), mats.roof);
  connRoof.position.set(0, floorY + 4.3, -27);
  group.add(connRoof);

  for (const cx of [-2.5, 2.5]) {
    buildWallWithOpenings(group, physics, mats, {
      x: cx,
      z: -27,
      length: 8,
      height: 4.2,
      thickness: 0.25,
      axis: 'z',
      material: mats.brick,
      baseY: floorY,
      openings: [{ offset: 0, width: 3.6, height: 1.8, sillHeight: 0.9, glazed: true }],
    });
  }

  // --- Gymnasium Main Volume (X: -20..20 = 40m, Z: -56..-31 = 25m, H: 11.5m) ---
  const gymFloor = new THREE.Mesh(new THREE.BoxGeometry(40, 0.1, 25), mats.gymParquet);
  gymFloor.position.set(0, floorY - 0.05, -43.5);
  gymFloor.receiveShadow = true;
  group.add(gymFloor);
  physics.addStaticBox(0, floorY - 0.05, -43.5, 20, 0.05, 12.5);

  const gymRoof = new THREE.Mesh(new THREE.BoxGeometry(40.6, 0.35, 25.6), mats.roof);
  gymRoof.position.set(0, floorY + wallH + 0.15, -43.5);
  gymRoof.castShadow = true;
  group.add(gymRoof);
  addBuildingParapetAndHVAC(group, mats, 0, -43.5, 40.6, 25.6, floorY + wallH + 0.325, {
    hvacCount: 3,
  });

  // Steel roof trusses for realistic gym ceiling
  for (const tz of [-51, -46, -41, -36]) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(39.4, 0.45, 0.35), mats.concreteDark);
    truss.position.set(0, floorY + wallH - 0.4, tz);
    group.add(truss);
  }

  // South Wall (Z = -31) with double entrance from Main Building
  buildWallWithOpenings(group, physics, mats, {
    x: 0,
    z: -31,
    length: 40,
    height: wallH,
    thickness: 0.35,
    axis: 'x',
    material: mats.gymBrick,
    baseY: floorY,
    openings: [{ offset: 0, width: 3.4, height: 2.7, sillHeight: 0 }],
  });
  addFacadeDetailing(group, mats, {
    x: 0,
    z: -31,
    length: 40,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    pilasterOffsets: [-19, -11, -3.6, 3.6, 11, 19],
    skipPlinthRange: [-2.8, 2.8],
    beltHeight: 5.8,
    vents: [
      { offset: -15, y: 3.6, scale: 1.45 },
      { offset: -7.3, y: 3.6, scale: 1.45 },
      { offset: 7.3, y: 3.6, scale: 1.45 },
      { offset: 15, y: 3.6, scale: 1.45 },
    ],
  });

  // North Wall (Z = -56) with double exit to Sports Field
  buildWallWithOpenings(group, physics, mats, {
    x: 0,
    z: -56,
    length: 40,
    height: wallH,
    thickness: 0.35,
    axis: 'x',
    material: mats.gymBrick,
    baseY: floorY,
    openings: [
      { offset: 0, width: 3.4, height: 2.7, sillHeight: 0 },
      { offset: -12, width: 5, height: 2.2, sillHeight: 6.5, glazed: true },
      { offset: 12, width: 5, height: 2.2, sillHeight: 6.5, glazed: true },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: 0,
    z: -56,
    length: 40,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    pilasterOffsets: [-19, -8, -3.2, 3.2, 8, 19],
    skipPlinthRange: [-1.9, 1.9],
    beltHeight: 5.8,
    vents: [
      { offset: -12, y: 3.6, scale: 1.5 },
      { offset: 12, y: 3.6, scale: 1.5 },
    ],
  });

  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-gameday-gym',
    theme: 'gameday',
    x: -12.0,
    y: 1.75,
    z: -56.21,
    rotY: Math.PI,
    width: 0.86,
    height: 1.16,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-prom-gym',
    theme: 'prom',
    x: 12.0,
    y: 1.75,
    z: -56.21,
    rotY: Math.PI,
    width: 0.86,
    height: 1.16,
    onReadNotice: callbacks.onReadNotice,
  });

  // East & West Walls (X = -20, +20)
  for (const wx of [-20, 20]) {
    buildWallWithOpenings(group, physics, mats, {
      x: wx,
      z: -43.5,
      length: 25,
      height: wallH,
      thickness: 0.35,
      axis: 'z',
      material: mats.gymBrick,
      baseY: floorY,
      openings: [
        { offset: -6, width: 4.5, height: 2.0, sillHeight: 7.0, glazed: true },
        { offset: 6, width: 4.5, height: 2.0, sillHeight: 7.0, glazed: true },
      ],
    });
    addFacadeDetailing(group, mats, {
      x: wx,
      z: -43.5,
      length: 25,
      height: wallH,
      baseY: floorY,
      facingSign: wx < 0 ? -1 : 1,
      axis: 'z',
      pilasterOffsets: [-11.5, -2.2, 2.2, 11.5],
      beltHeight: 5.8,
      vents: [
        { offset: -6, y: 3.6, scale: 1.45 },
        { offset: 0, y: 8.2, scale: 1.45 },
        { offset: 6, y: 3.6, scale: 1.45 },
      ],
    });
  }

  // Gym Double Doors (South & North)
  doors.push(
    createDoor(group, physics, mats, interactions, {
      id: 'gym-south-l',
      label: 'Entrée du Gymnase (Gauche)',
      x: -0.85,
      y: floorY,
      z: -31,
      width: 1.6,
      height: 2.6,
      isGlass: false,
      onToggle: callbacks.onDoorToggle,
    }),
    createDoor(group, physics, mats, interactions, {
      id: 'gym-south-r',
      label: 'Entrée du Gymnase (Droite)',
      x: 0.85,
      y: floorY,
      z: -31,
      rotY: Math.PI,
      width: 1.6,
      height: 2.6,
      isGlass: false,
      onToggle: callbacks.onDoorToggle,
    }),
    createDoor(group, physics, mats, interactions, {
      id: 'gym-north-l',
      label: 'Sortie Terrain de Sport (Gauche)',
      x: -0.85,
      y: floorY,
      z: -56,
      width: 1.6,
      height: 2.6,
      isGlass: false,
      onToggle: callbacks.onDoorToggle,
    }),
    createDoor(group, physics, mats, interactions, {
      id: 'gym-north-r',
      label: 'Sortie Terrain de Sport (Droite)',
      x: 0.85,
      y: floorY,
      z: -56,
      rotY: Math.PI,
      width: 1.6,
      height: 2.6,
      isGlass: false,
      onToggle: callbacks.onDoorToggle,
    })
  );

  // Telescopic Bleachers along North-West & North-East sides (leaving center court clear!)
  for (const side of [-1, 1]) {
    const bx = side * 17.4;
    for (let tier = 0; tier < 4; tier++) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.35, 16),
        tier % 2 === 0 ? mats.navy : mats.woodDesk
      );
      seat.position.set(bx - side * tier * 0.72, floorY + 0.35 + tier * 0.42, -43.5);
      seat.castShadow = true;
      seat.receiveShadow = true;
      group.add(seat);
    }
    physics.addStaticBox(bx - side * 1.1, floorY + 1.0, -43.5, 1.6, 1.0, 8.0);
  }

  // Basketball Hoops (West & East Court Ends at X = -12.5 and X = +12.5, Z = -43.5)
  for (const dir of [-1, 1]) {
    const hx = dir * 12.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.8, 10), mats.navy);
    pole.position.set(hx + dir * 0.8, floorY + 1.9, -43.5);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.14), mats.navy);
    arm.position.set(hx + dir * 0.3, floorY + 3.45, -43.5);
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.8), mats.tintedGlass);
    backboard.position.set(hx, floorY + 3.45, -43.5);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 18), mats.terracotta);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(hx - dir * 0.34, floorY + 3.05, -43.5);
    group.add(pole, arm, backboard, rim);
    physics.addStaticBox(hx + dir * 0.8, floorY + 1.9, -43.5, 0.2, 1.9, 0.2);

    // Interactive Basketball Rack near East Hoop
    if (dir === 1) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), mats.terracotta);
      ball.position.set(10.5, floorY + 0.55, -43.5);
      const rack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.45, 10), mats.chrome);
      rack.position.set(10.5, floorY + 0.225, -43.5);
      group.add(ball, rack);

      interactions.register({
        id: 'gym-basketball-hoop',
        label: 'tenter un lancer franc',
        type: 'switch',
        targetObject: ball,
        worldPosition: new THREE.Vector3(10.5, floorY + 0.8, -43.5),
        maxDistance: 3.0,
        onInteract: callbacks.onShootBasketball,
      });
    }
  }

  // Electronic Scoreboard on North Wall
  const scoreTex = createSignTexture('AIGLES 64  ·  VISITEURS 58', 'Q4 · 02:14', '#0F172A', '#D4AF37');
  const scoreboard = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 2.0, 0.25),
    new THREE.MeshStandardMaterial({ map: scoreTex, emissive: 0x111827, roughness: 0.3 })
  );
  scoreboard.position.set(0, floorY + 7.2, -55.7);
  group.add(scoreboard);

  // Locker room & Coach office partition signs inside South corners
  const coachBox = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 5.5), mats.plasterWall);
  coachBox.position.set(-17, floorY + 1.6, -34);
  const lockerBox = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 6.0), mats.plasterWall);
  lockerBox.position.set(17, floorY + 1.6, -34.2);
  group.add(coachBox, lockerBox);
  physics.addStaticBox(-17, floorY + 1.6, -34, 2.75, 1.6, 2.75);
  physics.addStaticBox(17, floorY + 1.6, -34.2, 2.75, 1.6, 3.0);

  // Gym Overhead Lights
  const gymLights: THREE.PointLight[] = [];
  for (const lx of [-10, 10]) {
    const pt = new THREE.PointLight(0xfff5e0, 2.6, 36, 1.1);
    pt.position.set(lx, floorY + wallH - 1.5, -43.5);
    group.add(pt);
    gymLights.push(pt);
  }
  ctx.wingLights['gym'] = gymLights;

  group.add(
    createExitSign(mats, 0, floorY + 3.0, -31.25, Math.PI),
    createExitSign(mats, 0, floorY + 3.0, -55.75, 0)
  );

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== gymFloor && obj !== connFloor) {
      ctx.cameraColliders.push(obj);
    }
  });

  ctx.scene.add(group);
  return group;
}
