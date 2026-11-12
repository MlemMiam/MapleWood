import * as THREE from 'three';
import type { WorldBuildContext } from '../WorldContext';

export function buildSportsField(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SportsField';

  const { physics, mats } = ctx;

  // Walkway connecting Gymnasium North exit (0, -56) to Sports Field (0, -64)
  const path = new THREE.Mesh(new THREE.BoxGeometry(5, 0.04, 12), mats.concrete);
  path.position.set(0, 0.02, -62);
  path.receiveShadow = true;
  group.add(path);

  // Rounded Stadium Running Track Perimeter (ExtrudeGeometry oval around Z = -104)
  const trackShape = new THREE.Shape();
  const straightHalf = 16;
  const outerR = 34;
  trackShape.absarc(-straightHalf, 0, outerR, Math.PI * 0.5, Math.PI * 1.5, false);
  trackShape.lineTo(straightHalf, -outerR);
  trackShape.absarc(straightHalf, 0, outerR, -Math.PI * 0.5, Math.PI * 0.5, false);
  trackShape.closePath();

  const trackGeo = new THREE.ExtrudeGeometry(trackShape, { depth: 0.04, bevelEnabled: false });
  trackGeo.rotateX(-Math.PI / 2);
  const track = new THREE.Mesh(trackGeo, mats.trackRed);
  track.position.set(0, 0.005, -104);
  track.receiveShadow = true;
  group.add(track);

  // White Oval Track Lane Striping
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  for (const laneR of [30.2, 32.1]) {
    const outerLane = new THREE.Shape();
    outerLane.absarc(-straightHalf, 0, laneR, Math.PI * 0.5, Math.PI * 1.5, false);
    outerLane.lineTo(straightHalf, -laneR);
    outerLane.absarc(straightHalf, 0, laneR, -Math.PI * 0.5, Math.PI * 0.5, false);
    outerLane.closePath();

    const innerHole = new THREE.Path();
    const ir = laneR - 0.14;
    innerHole.absarc(-straightHalf, 0, ir, Math.PI * 0.5, Math.PI * 1.5, false);
    innerHole.lineTo(straightHalf, -ir);
    innerHole.absarc(straightHalf, 0, ir, -Math.PI * 0.5, Math.PI * 0.5, false);
    innerHole.closePath();
    outerLane.holes.push(innerHole);

    const laneGeo = new THREE.ExtrudeGeometry(outerLane, { depth: 0.015, bevelEnabled: false });
    laneGeo.rotateX(-Math.PI / 2);
    const laneMesh = new THREE.Mesh(laneGeo, lineMat);
    laneMesh.position.set(0, 0.042, -104);
    group.add(laneMesh);
  }

  // Green American Football Turf inside Track (Z: -131..-77, X: -31..+31)
  const turf = new THREE.Mesh(new THREE.BoxGeometry(62, 0.05, 54), mats.turfGreen);
  turf.position.set(0, 0.04, -104);
  turf.receiveShadow = true;
  group.add(turf);

  // 4 Corner Stadium Floodlight Towers via TubeGeometry arms & spotlight cans
  for (const [fx, fz] of [
    [-38, -72],
    [38, -72],
    [-38, -136],
    [38, -136],
  ]) {
    const tower = new THREE.Group();
    tower.position.set(fx, 0, fz);
    tower.lookAt(0, 0, -104);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 14, 10), mats.chrome);
    pole.position.y = 7;
    pole.castShadow = true;
    const arm = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 13.4, 0),
          new THREE.Vector3(0, 14.1, 0.35),
          new THREE.Vector3(0, 14.2, 0.85),
        ]),
        8,
        0.09,
        8,
        false
      ),
      mats.chrome
    );
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.22), mats.navy);
    rack.position.set(0, 14.2, 0.88);
    tower.add(pole, arm, rack);

    for (const sx of [-0.9, -0.3, 0.3, 0.9]) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.34, 10), mats.navy);
      can.rotation.x = Math.PI / 2 + 0.35;
      can.position.set(sx, 14.35, 0.96);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 10), mats.neonCeiling);
      lens.rotation.x = Math.PI / 2 + 0.35;
      lens.position.set(sx, 14.28, 1.09);
      tower.add(can, lens);
    }

    group.add(tower);
    physics.addStaticBox(fx, 2, fz, 0.3, 2, 0.3);
  }

  // White Yard Lines
  for (let x = -28; x <= 28; x += 7) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 48), lineMat);
    line.position.set(x, 0.07, -104);
    group.add(line);
  }
  for (const z of [-128, -80]) {
    const sideline = new THREE.Mesh(new THREE.BoxGeometry(56, 0.02, 0.22), lineMat);
    sideline.position.set(0, 0.07, z);
    group.add(sideline);
  }

  // Yellow American Football Goalposts at West & East Endzones (X = -29, +29)
  for (const gx of [-29, 29]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8), mats.gold);
    post.position.set(gx, 1.5, -104);
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.6, 8), mats.gold);
    cross.rotation.x = Math.PI / 2;
    cross.position.set(gx, 3.0, -104);
    const uprightL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8), mats.gold);
    uprightL.position.set(gx, 5.1, -106.75);
    const uprightR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8), mats.gold);
    uprightR.position.set(gx, 5.1, -101.25);
    group.add(post, cross, uprightL, uprightR);
    physics.addStaticBox(gx, 1.5, -104, 0.2, 1.5, 0.2);
  }

  // Outdoor Spectator Bleachers (South side of track, X = -28..-8 and +8..+28, Z = -65)
  for (const bx of [-18, 18]) {
    for (let t = 0; t < 4; t++) {
      const tier = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.35, 0.9),
        t % 2 === 0 ? mats.navy : mats.chrome
      );
      tier.position.set(bx, 0.4 + t * 0.48, -65.5 + t * 0.9);
      tier.castShadow = true;
      group.add(tier);
    }
    physics.addStaticBox(bx, 1.1, -64.2, 8, 1.1, 2.0);
  }

  // Outdoor Locker / Concession Shed (X = -43, Z = -68)
  const shed = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.2, 4.5), mats.brick);
  shed.position.set(-43, 1.6, -68);
  shed.castShadow = true;
  const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.2, 5.0), mats.roof);
  shedRoof.position.set(-43, 3.3, -68);
  group.add(shed, shedRoof);
  physics.addStaticBox(-43, 1.6, -68, 3.25, 1.6, 2.25);

  ctx.scene.add(group);
  return group;
}
