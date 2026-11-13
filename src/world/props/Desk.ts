import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PhysicsWorld } from '../../engine/Physics';
import type { MaterialLibrary } from '../../utils/Materials';

export interface DeskTransform {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scaleX?: number;
  scaleZ?: number;
}

const ensureNonIndexed = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

/**
 * Builds instanced classroom student desks (beveled wooden top with pencil rail + curved C-frame tubular legs + floor glides).
 */
export function buildInstancedDesks(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  desks: DeskTransform[]
): void {
  if (desks.length === 0) return;

  const mainSlab = ensureNonIndexed(new RoundedBoxGeometry(0.76, 0.038, 0.52, 2, 0.015));
  const pencilLip = ensureNonIndexed(new RoundedBoxGeometry(0.68, 0.014, 0.024, 2, 0.006));
  pencilLip.translate(0, 0.022, -0.22);
  const topGeo = mergeGeometries([mainSlab, pencilLip]);

  const cubbyGeo = ensureNonIndexed(new RoundedBoxGeometry(0.62, 0.085, 0.4, 2, 0.012));
  cubbyGeo.translate(0, 0.635, 0);

  const legParts: THREE.BufferGeometry[] = [cubbyGeo];
  for (const sx of [-0.31, 0.31]) {
    // Curved C-frame cantilever leg + foot runner + floor glides
    const cCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.72, 0.16),
      new THREE.Vector3(sx, 0.72, -0.17),
      new THREE.Vector3(sx, 0.38, -0.19),
      new THREE.Vector3(sx, 0.03, -0.17),
      new THREE.Vector3(sx, 0.02, 0.21),
    ]);
    legParts.push(ensureNonIndexed(new THREE.TubeGeometry(cCurve, 12, 0.015, 7, false)));

    for (const gz of [-0.17, 0.21]) {
      const glide = ensureNonIndexed(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 8));
      glide.translate(sx, 0.01, gz);
      legParts.push(glide);
    }
  }
  // Rear cross-brace stabilizer bar
  const crossBar = ensureNonIndexed(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 7));
  crossBar.rotateZ(Math.PI / 2);
  crossBar.translate(0, 0.26, -0.19);
  legParts.push(crossBar);

  const frameGeo = mergeGeometries(legParts);

  const tops = new THREE.InstancedMesh(topGeo, mats.woodDesk, desks.length);
  const frames = new THREE.InstancedMesh(frameGeo, mats.chrome, desks.length);
  tops.castShadow = true;
  tops.receiveShadow = true;

  const dummy = new THREE.Object3D();
  desks.forEach((d, i) => {
    const sx = d.scaleX ?? 1;
    const sz = d.scaleZ ?? 1;

    dummy.position.set(d.x, d.y + 0.74, d.z);
    dummy.rotation.set(0, d.rotY, 0);
    dummy.scale.set(sx, 1, sz);
    dummy.updateMatrix();
    tops.setMatrixAt(i, dummy.matrix);

    dummy.position.set(d.x, d.y, d.z);
    dummy.scale.set(sx, 1, sz);
    dummy.updateMatrix();
    frames.setMatrixAt(i, dummy.matrix);

    physics.addStaticBox(d.x, d.y + 0.38, d.z, 0.37 * sx, 0.38, 0.26 * sz, d.rotY);
  });

  tops.instanceMatrix.needsUpdate = true;
  frames.instanceMatrix.needsUpdate = true;
  tops.computeBoundingSphere();
  frames.computeBoundingSphere();
  parent.add(tops, frames);
}

/**
 * Builds a multi-part teacher / executive desk with molded overhang top, turned corner feet, recessed arch pulls, blotter & desk lamp.
 */
export function createTeacherDesk(
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

  const top = new THREE.Mesh(new RoundedBoxGeometry(1.66, 0.055, 0.86, 2, 0.02), mats.woodDark);
  top.position.y = 0.765;
  top.castShadow = true;
  top.receiveShadow = true;

  const topTrim = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.024, 0.9, 2, 0.01), mats.woodDesk);
  topTrim.position.y = 0.742;

  const pedLeft = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.68, 0.74, 2, 0.018), mats.woodDesk);
  pedLeft.position.set(-0.55, 0.39, 0);
  const pedRight = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.68, 0.74, 2, 0.018), mats.woodDesk);
  pedRight.position.set(0.55, 0.39, 0);
  const modesty = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.56, 0.045, 2, 0.01), mats.woodDark);
  modesty.position.set(0, 0.45, -0.34);

  const blotter = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.014, 0.42, 2, 0.006), mats.navy);
  blotter.position.set(0, 0.796, 0.06);

  // Turned corner bun feet & recessed brass arch pulls
  const hardwareParts: THREE.BufferGeometry[] = [];
  for (const px of [-0.55, 0.55]) {
    for (const dy of [0.22, 0.44, 0.62]) {
      const pull = ensureNonIndexed(new THREE.TorusGeometry(0.045, 0.008, 6, 10, Math.PI));
      pull.rotateX(Math.PI / 2);
      pull.translate(px, dy, 0.37);
      hardwareParts.push(pull);
    }
    for (const fz of [-0.31, 0.31]) {
      const foot = ensureNonIndexed(new THREE.CylinderGeometry(0.032, 0.022, 0.05, 8));
      foot.translate(px - 0.16, 0.025, fz);
      const foot2 = ensureNonIndexed(new THREE.CylinderGeometry(0.032, 0.022, 0.05, 8));
      foot2.translate(px + 0.16, 0.025, fz);
      hardwareParts.push(foot, foot2);
    }
  }
  // Brass banker's desk lamp on the corner of the teacher desk
  const lampBase = ensureNonIndexed(new THREE.CylinderGeometry(0.065, 0.08, 0.025, 10));
  lampBase.translate(-0.56, 0.805, -0.22);
  const lampStem = ensureNonIndexed(new THREE.CylinderGeometry(0.012, 0.015, 0.24, 8));
  lampStem.translate(-0.56, 0.93, -0.22);
  hardwareParts.push(lampBase, lampStem);
  const hardwareMesh = new THREE.Mesh(mergeGeometries(hardwareParts), mats.gold);

  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.085, 0.09, 10),
    new THREE.MeshStandardMaterial({ color: 0x15803d, emissive: 0x14532d, emissiveIntensity: 0.35, roughness: 0.25 })
  );
  lampShade.rotation.z = Math.PI / 2;
  lampShade.position.set(-0.56, 1.05, -0.19);

  g.add(top, topTrim, pedLeft, pedRight, modesty, blotter, hardwareMesh, lampShade);
  parent.add(g);
  physics.addStaticBox(x, y + 0.39, z, 0.8, 0.39, 0.4, rotY);
  return g;
}
