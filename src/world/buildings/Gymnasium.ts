import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  addBuildingParapetAndHVAC,
  addFacadeDetailing,
  buildWallWithOpenings,
  createClassicalEntrancePortico,
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

  // Open-web steel Warren roof trusses for realistic gym ceiling
  const ensureNonIndexedGym = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
  const trussParts: THREE.BufferGeometry[] = [];
  const topChord = ensureNonIndexedGym(new THREE.BoxGeometry(39.4, 0.14, 0.28));
  topChord.translate(0, 0.3, 0);
  const botChord = ensureNonIndexedGym(new THREE.BoxGeometry(39.4, 0.14, 0.28));
  botChord.translate(0, -0.3, 0);
  trussParts.push(topChord, botChord);
  for (let wx = -18; wx <= 18; wx += 3) {
    const vert = ensureNonIndexedGym(new THREE.BoxGeometry(0.1, 0.6, 0.2));
    vert.translate(wx, 0, 0);
    trussParts.push(vert);
    if (wx < 18) {
      const diag = ensureNonIndexedGym(new THREE.BoxGeometry(0.08, 0.85, 0.16));
      diag.rotateZ(wx % 6 === 0 ? 1.12 : -1.12);
      diag.translate(wx + 1.5, 0, 0);
      trussParts.push(diag);
    }
  }
  const singleTrussGeo = mergeGeometries(trussParts);
  for (const tz of [-51, -46, -41, -36]) {
    const truss = new THREE.Mesh(singleTrussGeo, mats.concreteDark);
    truss.position.set(0, floorY + wallH - 0.5, tz);
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

  // Classical fluted-column & molded-pediment porticos at Gymnasium entrances
  createClassicalEntrancePortico(group, physics, mats, {
    x: 0,
    y: floorY,
    z: -56,
    rotY: Math.PI,
    spanWidth: 4.3,
    columnHeight: 4.1,
    depth: 0.85,
    columnRadius: 0.22,
    pedimentHeight: 0.92,
  });
  createClassicalEntrancePortico(group, physics, mats, {
    x: 0,
    y: floorY,
    z: -31,
    rotY: 0,
    spanWidth: 3.8,
    columnHeight: 3.35,
    depth: 0.24,
    columnRadius: 0.16,
    pedimentHeight: 0.62,
    addColumnColliders: false,
  });

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

  // Telescopic Bleachers along North-West & North-East sides with Chrome Side Safety Railings
  for (const side of [-1, 1]) {
    const bx = side * 17.4;
    for (let tier = 0; tier < 4; tier++) {
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(0.85, 0.35, 16, 2, 0.02),
        tier % 2 === 0 ? mats.navy : mats.woodDesk
      );
      seat.position.set(bx - side * tier * 0.72, floorY + 0.35 + tier * 0.42, -43.5);
      seat.castShadow = true;
      seat.receiveShadow = true;
      group.add(seat);
    }
    for (const rz of [-51.4, -35.6]) {
      const railCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(bx + side * 0.3, floorY + 0.4, rz),
        new THREE.Vector3(bx + side * 0.3, floorY + 1.15, rz),
        new THREE.Vector3(bx - side * 2.45, floorY + 2.35, rz),
        new THREE.Vector3(bx - side * 2.45, floorY + 1.6, rz),
      ]);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 12, 0.026, 7, false), mats.chrome);
      group.add(rail);
    }
    physics.addStaticBox(bx - side * 1.1, floorY + 1.0, -43.5, 1.6, 1.0, 8.0);
  }

  // Basketball Hoops (West & East Court Ends at X = -12.5 and X = +12.5, Z = -43.5) with H-Brace & Net
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.75,
    wireframe: true,
  });
  for (const dir of [-1, 1]) {
    const hx = dir * 12.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.8, 12), mats.navy);
    pole.position.set(hx + dir * 0.8, floorY + 1.9, -43.5);
    const arm = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.14, 0.14, 2, 0.02), mats.navy);
    arm.position.set(hx + dir * 0.3, floorY + 3.45, -43.5);
    const diagBrace = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.15, 8), mats.chrome);
    diagBrace.position.set(hx + dir * 0.42, floorY + 3.12, -43.5);
    diagBrace.rotation.z = dir * 0.78;
    const backboardFrame = new THREE.Mesh(new RoundedBoxGeometry(0.09, 1.16, 1.86, 2, 0.02), mats.chrome);
    backboardFrame.position.set(hx + dir * 0.02, floorY + 3.45, -43.5);
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.8), mats.tintedGlass);
    backboard.position.set(hx, floorY + 3.45, -43.5);
    const targetSquare = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.38, 0.56), mats.whiteboard);
    targetSquare.position.set(hx - dir * 0.01, floorY + 3.28, -43.5);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 18), mats.terracotta);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(hx - dir * 0.34, floorY + 3.05, -43.5);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.16, 0.42, 12, 4, true), netMat);
    net.position.set(hx - dir * 0.34, floorY + 2.83, -43.5);
    group.add(pole, arm, diagBrace, backboardFrame, backboard, targetSquare, rim, net);
    physics.addStaticBox(hx + dir * 0.8, floorY + 1.9, -43.5, 0.2, 1.9, 0.2);

    // Interactive Basketball Rack near East Hoop
    if (dir === 1) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), mats.terracotta);
      ball.position.set(10.5, floorY + 0.55, -43.5);
      const rack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.45, 12), mats.chrome);
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
