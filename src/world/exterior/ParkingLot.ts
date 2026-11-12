import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSignTexture } from '../../utils/Materials';
import type { WorldBuildContext } from '../WorldContext';

export function buildParkingLots(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ParkingLots';

  const { physics, mats } = ctx;

  // --- Teachers Parking Lot (West: X = -82..-54, Z = -26..+10) ---
  const teachPad = new THREE.Mesh(new THREE.BoxGeometry(28, 0.04, 36), mats.asphalt);
  teachPad.position.set(-68, 0.015, -8);
  teachPad.receiveShadow = true;
  group.add(teachPad);

  // --- Students Parking Lot (East: X = +56..+88, Z = -26..+18) ---
  const studPad = new THREE.Mesh(new THREE.BoxGeometry(32, 0.04, 44), mats.asphalt);
  studPad.position.set(72, 0.015, -4);
  studPad.receiveShadow = true;
  group.add(studPad);

  // Boom barrier gate at Student Parking entry
  const gatePost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), mats.gold);
  gatePost.position.set(57.5, 0.55, 19.5);
  const boomArm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 0.1), mats.exitSign);
  boomArm.position.set(59.6, 0.95, 19.5);
  group.add(gatePost, boomArm);
  physics.addStaticBox(57.5, 0.55, 19.5, 0.2, 0.55, 0.2);

  // --- School Bus Stop Driveway (South: X = -42..+42, Z = 32..44) ---
  const busRoad = new THREE.Mesh(new THREE.BoxGeometry(92, 0.04, 10), mats.asphalt);
  busRoad.position.set(0, 0.015, 37);
  busRoad.receiveShadow = true;
  group.add(busRoad);

  // Bus Shelter, Bench & Sign
  const shelterBack = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 0.1), mats.tintedGlass);
  shelterBack.position.set(-7.5, 1.2, 31.2);
  const shelterRoof = new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.14, 1.8, 2, 0.03), mats.navy);
  shelterRoof.position.set(-7.5, 2.45, 31.8);
  const shelterBench = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.07, 0.45, 2, 0.015), mats.woodDesk);
  shelterBench.position.set(-7.5, 0.46, 31.55);
  const busSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.65, 0.08),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('ARRÊT DE BUS', 'MAPLEWOOD HIGH'),
      roughness: 0.5,
    })
  );
  busSign.position.set(-4.2, 2.3, 31.5);
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), mats.chrome);
  signPole.position.set(-4.2, 1.2, 31.5);
  group.add(shelterBack, shelterRoof, shelterBench, busSign, signPole);

  // --- Hero Modeled American School Bus (X = 9.5, Z = 35.5) ---
  const bus = new THREE.Group();
  bus.position.set(9.5, 0, 35.5);
  const busYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.36, metalness: 0.16 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const amberLightMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
  });

  const chassis = new THREE.Mesh(new RoundedBoxGeometry(9.6, 2.15, 2.48, 3, 0.18), busYellow);
  chassis.position.set(0, 1.58, 0);
  chassis.castShadow = true;

  // Sloped engine hood via ExtrudeGeometry
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(0, 0);
  hoodShape.lineTo(1.65, 0);
  hoodShape.lineTo(1.65, 1.25);
  hoodShape.lineTo(0.2, 1.02);
  hoodShape.lineTo(0, 0.72);
  hoodShape.closePath();
  const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
    depth: 2.28,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  hoodGeo.translate(-6.3, 0.62, -1.14);
  const nose = new THREE.Mesh(hoodGeo, busYellow);
  nose.castShadow = true;

  const frontBumper = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.34, 2.52, 2, 0.05), rubberMat);
  frontBumper.position.set(-6.35, 0.66, 0);
  const rearBumper = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.34, 2.52, 2, 0.05), rubberMat);
  rearBumper.position.set(4.85, 0.66, 0);
  const grille = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.58, 1.35, 2, 0.02), mats.chrome);
  grille.position.set(-6.34, 1.1, 0);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.82, 2.2), mats.tintedGlass);
  windshield.position.set(-4.72, 2.1, 0);
  windshield.rotation.z = 0.12;
  // Individual framed bus passenger windows
  for (let w = 0; w < 6; w++) {
    const wx = -3.4 + w * 1.42;
    const winFrame = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.68, 2.52, 2, 0.03), rubberMat);
    winFrame.position.set(wx, 2.02, 0);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.56, 2.54), mats.tintedGlass);
    winGlass.position.set(wx, 2.02, 0);
    bus.add(winFrame, winGlass);
  }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(9.64, 0.16, 2.51), mats.concreteDark);
  stripe.position.set(0, 1.38, 0);
  const rubRail = new THREE.Mesh(new THREE.BoxGeometry(9.64, 0.08, 2.52), mats.concreteDark);
  rubRail.position.set(0, 0.96, 0);

  // Roof hatches, amber beacon, exhaust pipe & stop sign arm
  const roofBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.18, 12), amberLightMat);
  roofBeacon.position.set(-2.5, 2.74, 0);
  const stopArm = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 8), mats.exitSign);
  stopArm.rotation.x = Math.PI / 2;
  stopArm.position.set(-4.1, 1.65, -1.28);
  const exhaust = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(4.3, 0.45, -0.85),
        new THREE.Vector3(4.95, 0.42, -0.92),
      ]),
      6,
      0.045,
      8,
      false
    ),
    mats.chrome
  );
  bus.add(rubRail, exhaust);

  for (const lz of [-0.88, 0.88]) {
    const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), amberLightMat);
    headlight.rotation.z = Math.PI / 2;
    headlight.position.set(-6.32, 1.05, lz);
    const mirrorArm = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-4.8, 1.75, lz * 1.4),
          new THREE.Vector3(-5.1, 2.0, lz * 1.56),
        ]),
        6,
        0.025,
        6,
        false
      ),
      mats.chrome
    );
    bus.add(headlight, mirrorArm);
  }

  bus.add(
    chassis,
    nose,
    frontBumper,
    rearBumper,
    grille,
    windshield,
    stripe,
    roofBeacon,
    stopArm
  );

  for (const wx of [-4.0, 2.8]) {
    for (const wz of [-1.18, 1.18]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 16), rubberMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.48, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.32, 12), mats.chrome);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.48, wz);
      bus.add(wheel, hub);
    }
  }
  group.add(bus);
  physics.addStaticBox(9.5, 1.4, 35.5, 5.5, 1.4, 1.3);

  // --- Instanced Stylized Sedan Cars across Teacher & Student Lots ---
  const carPositions: Array<[number, number, number]> = [];
  for (let r = 0; r < 6; r++) {
    carPositions.push([-76, -20 + r * 4.8, Math.PI / 2]);
    if (r % 2 === 0) carPositions.push([-60, -20 + r * 4.8, -Math.PI / 2]);
  }
  for (let r = 0; r < 8; r++) {
    carPositions.push([62, -20 + r * 4.8, Math.PI / 2]);
    if (r !== 3) carPositions.push([72, -20 + r * 4.8, -Math.PI / 2]);
    if (r % 2 === 1) carPositions.push([82, -20 + r * 4.8, -Math.PI / 2]);
  }

  const sedanShape = new THREE.Shape();
  sedanShape.moveTo(-2.05, 0.3);
  sedanShape.lineTo(2.05, 0.3);
  sedanShape.lineTo(2.02, 0.84);
  sedanShape.lineTo(1.22, 0.96);
  sedanShape.lineTo(0.65, 1.48);
  sedanShape.lineTo(-0.8, 1.48);
  sedanShape.lineTo(-1.35, 0.95);
  sedanShape.lineTo(-2.02, 0.8);
  sedanShape.closePath();
  const carBodyGeo = new THREE.ExtrudeGeometry(sedanShape, {
    depth: 1.76,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  carBodyGeo.translate(0, 0, -0.88);

  const ensureNonIndexed = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

  const sideWinGeo = ensureNonIndexed(new RoundedBoxGeometry(1.54, 0.35, 1.92, 2, 0.04));
  sideWinGeo.translate(-0.07, 1.2, 0);
  const frontGlassGeo = ensureNonIndexed(new THREE.BoxGeometry(0.68, 0.05, 1.56));
  frontGlassGeo.rotateZ(-0.74);
  frontGlassGeo.translate(1.01, 1.25, 0);
  const rearGlassGeo = ensureNonIndexed(new THREE.BoxGeometry(0.68, 0.05, 1.54));
  rearGlassGeo.rotateZ(0.76);
  rearGlassGeo.translate(-1.14, 1.24, 0);
  const cabinWindowGeo = mergeGeometries([sideWinGeo, frontGlassGeo, rearGlassGeo]);

  const carWheelGeo = mergeGeometries(
    [
      [-1.3, 0.34, -0.86],
      [-1.3, 0.34, 0.86],
      [1.3, 0.34, -0.86],
      [1.3, 0.34, 0.86],
    ].map(([wx, wy, wz]) => {
      const wg = ensureNonIndexed(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12));
      wg.rotateX(Math.PI / 2);
      wg.translate(wx, wy, wz);
      return wg;
    })
  );

  const carHubGeo = mergeGeometries(
    [
      [-1.3, 0.34, -0.87],
      [-1.3, 0.34, 0.87],
      [1.3, 0.34, -0.87],
      [1.3, 0.34, 0.87],
    ].map(([wx, wy, wz]) => {
      const hg = ensureNonIndexed(new THREE.CylinderGeometry(0.19, 0.19, 0.24, 10));
      hg.rotateX(Math.PI / 2);
      hg.translate(wx, wy, wz);
      return hg;
    })
  );

  const carLightGeo = mergeGeometries(
    [
      [2.08, 0.66, -0.62],
      [2.08, 0.66, 0.62],
    ].map(([lx, ly, lz]) => {
      const lg = ensureNonIndexed(new RoundedBoxGeometry(0.08, 0.14, 0.28, 1, 0.02));
      lg.translate(lx, ly, lz);
      return lg;
    })
  );

  const carTailGeo = mergeGeometries(
    [
      [-2.08, 0.68, -0.64],
      [-2.08, 0.68, 0.64],
    ].map(([lx, ly, lz]) => {
      const lg = ensureNonIndexed(new RoundedBoxGeometry(0.08, 0.13, 0.3, 1, 0.02));
      lg.translate(lx, ly, lz);
      return lg;
    })
  );

  const carMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.5 });
  const bodies = new THREE.InstancedMesh(carBodyGeo, carMat, carPositions.length);
  const cabins = new THREE.InstancedMesh(cabinWindowGeo, mats.tintedGlass, carPositions.length);
  const carWheels = new THREE.InstancedMesh(carWheelGeo, rubberMat, carPositions.length);
  const carHubs = new THREE.InstancedMesh(carHubGeo, mats.chrome, carPositions.length);
  const carLights = new THREE.InstancedMesh(carLightGeo, mats.neonCeiling, carPositions.length);
  const carTails = new THREE.InstancedMesh(carTailGeo, mats.exitSign, carPositions.length);
  bodies.castShadow = true;
  bodies.receiveShadow = true;

  const carColors = [0x1f3864, 0x991b1b, 0x334155, 0xd97706, 0x0f766e, 0xe2e8f0];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  carPositions.forEach(([cx, cz, rot], i) => {
    dummy.position.set(cx, 0, cz);
    dummy.rotation.set(0, rot, 0);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    cabins.setMatrixAt(i, dummy.matrix);
    carWheels.setMatrixAt(i, dummy.matrix);
    carHubs.setMatrixAt(i, dummy.matrix);
    carLights.setMatrixAt(i, dummy.matrix);
    carTails.setMatrixAt(i, dummy.matrix);

    color.setHex(carColors[i % carColors.length]);
    bodies.setColorAt(i, color);

    physics.addStaticBox(cx, 0.85, cz, 2.05, 0.85, 0.95, rot);
  });

  bodies.instanceMatrix.needsUpdate = true;
  cabins.instanceMatrix.needsUpdate = true;
  carWheels.instanceMatrix.needsUpdate = true;
  carHubs.instanceMatrix.needsUpdate = true;
  carLights.instanceMatrix.needsUpdate = true;
  carTails.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  bodies.computeBoundingSphere();
  cabins.computeBoundingSphere();
  carWheels.computeBoundingSphere();
  carHubs.computeBoundingSphere();
  carLights.computeBoundingSphere();
  carTails.computeBoundingSphere();
  group.add(bodies, cabins, carWheels, carHubs, carLights, carTails);

  // Parking Line Markings
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 });
  const lineGeo = new THREE.BoxGeometry(4.4, 0.02, 0.1);
  const lines = new THREE.InstancedMesh(lineGeo, lineMat, 48);
  let lIdx = 0;
  for (let r = 0; r < 10; r++) {
    if (lIdx < 48) {
      dummy.position.set(-76, 0.04, -22 + r * 4.0);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      lines.setMatrixAt(lIdx++, dummy.matrix);
    }
    if (lIdx < 48) {
      dummy.position.set(62, 0.04, -22 + r * 4.0);
      dummy.updateMatrix();
      lines.setMatrixAt(lIdx++, dummy.matrix);
    }
    if (lIdx < 48) {
      dummy.position.set(72, 0.04, -22 + r * 4.0);
      dummy.updateMatrix();
      lines.setMatrixAt(lIdx++, dummy.matrix);
    }
  }
  lines.count = lIdx;
  lines.instanceMatrix.needsUpdate = true;
  lines.computeBoundingSphere();
  group.add(lines);

  ctx.scene.add(group);
  return group;
}
