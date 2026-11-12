import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PhysicsWorld } from '../../engine/Physics';
import type { MaterialLibrary } from '../../utils/Materials';

export function createBench(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  x: number,
  y: number,
  z: number,
  rotY = 0
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;

  // Soft ground contact shadow under the bench
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.86), mats.shadowContact);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.008, 0.02);
  contactShadow.renderOrder = 1;
  g.add(contactShadow);

  // 3 contoured hardwood seat slats + 2 angled backrest slats
  const slatGeo = new RoundedBoxGeometry(1.94, 0.045, 0.135, 2, 0.012);
  for (let s = -1; s <= 1; s++) {
    const slat = new THREE.Mesh(slatGeo, mats.woodDesk);
    slat.position.set(0, 0.455, s * 0.15);
    slat.castShadow = true;
    slat.receiveShadow = true;
    g.add(slat);
  }

  for (let b = 0; b < 2; b++) {
    const backSlat = new THREE.Mesh(slatGeo, mats.woodDesk);
    backSlat.position.set(0, 0.65 + b * 0.16, -0.21 - b * 0.025);
    backSlat.rotation.x = -0.18;
    backSlat.castShadow = true;
    backSlat.receiveShadow = true;
    g.add(backSlat);
  }

  // Curved wrought-iron side frames & armrests via TubeGeometry
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0, 0.2),
    new THREE.Vector3(0, 0.45, 0.2),
    new THREE.Vector3(0, 0.64, 0.16),
    new THREE.Vector3(0, 0.66, -0.08),
    new THREE.Vector3(0, 0.86, -0.24),
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 16, 0.032, 8, false);
  const backLegGeo = new THREE.CylinderGeometry(0.03, 0.036, 0.46, 8);
  const footPlateGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.024, 10);
  const boltGeo = new THREE.SphereGeometry(0.014, 6, 6);

  for (const sx of [-0.78, 0.78]) {
    const frame = new THREE.Mesh(armGeo, mats.wroughtIron);
    frame.position.x = sx;
    frame.castShadow = true;
    frame.receiveShadow = true;

    const rearLeg = new THREE.Mesh(backLegGeo, mats.wroughtIron);
    rearLeg.position.set(sx, 0.23, -0.18);
    rearLeg.castShadow = true;
    rearLeg.receiveShadow = true;

    const frontFoot = new THREE.Mesh(footPlateGeo, mats.wroughtIron);
    frontFoot.position.set(sx, 0.012, 0.2);
    const rearFoot = new THREE.Mesh(footPlateGeo, mats.wroughtIron);
    rearFoot.position.set(sx, 0.012, -0.18);

    // Brushed metal carriage bolts securing wooden slats to side frames
    for (let s = -1; s <= 1; s++) {
      const bolt = new THREE.Mesh(boltGeo, mats.chrome);
      bolt.position.set(sx, 0.478, s * 0.15);
      g.add(bolt);
    }
    for (let b = 0; b < 2; b++) {
      const backBolt = new THREE.Mesh(boltGeo, mats.chrome);
      backBolt.position.set(sx, 0.65 + b * 0.16, -0.185 - b * 0.025);
      g.add(backBolt);
    }

    g.add(frame, rearLeg, frontFoot, rearFoot);
  }

  // Central wrought-iron under-seat rib & backrest brace
  const centerSeatBrace = new THREE.Mesh(
    new RoundedBoxGeometry(0.045, 0.04, 0.44, 2, 0.01),
    mats.wroughtIron
  );
  centerSeatBrace.position.set(0, 0.415, 0);
  centerSeatBrace.castShadow = true;

  const centerBackBrace = new THREE.Mesh(
    new RoundedBoxGeometry(0.04, 0.36, 0.035, 2, 0.01),
    mats.wroughtIron
  );
  centerBackBrace.position.set(0, 0.66, -0.23);
  centerBackBrace.rotation.x = -0.18;
  centerBackBrace.castShadow = true;

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.56, 8), mats.wroughtIron);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 0.22, 0);
  crossbar.castShadow = true;
  g.add(centerSeatBrace, centerBackBrace, crossbar);

  parent.add(g);
  physics.addStaticBox(x, y + 0.36, z, 0.98, 0.36, 0.28, rotY);
  return g;
}
