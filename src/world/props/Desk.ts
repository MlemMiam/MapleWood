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
 * Builds instanced classroom student desks (beveled wooden top + under-desk tray + 4 tubular steel legs).
 */
export function buildInstancedDesks(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  desks: DeskTransform[]
): void {
  if (desks.length === 0) return;

  const topGeo = new RoundedBoxGeometry(0.75, 0.045, 0.52, 2, 0.015);
  const cubbyGeo = ensureNonIndexed(new RoundedBoxGeometry(0.64, 0.09, 0.42, 2, 0.01));
  cubbyGeo.translate(0, 0.64, 0);

  const legParts: THREE.BufferGeometry[] = [cubbyGeo];
  for (const [lx, lz] of [
    [-0.31, -0.2],
    [0.31, -0.2],
    [-0.31, 0.2],
    [0.31, 0.2],
  ]) {
    const leg = ensureNonIndexed(new THREE.CylinderGeometry(0.016, 0.014, 0.72, 8));
    leg.translate(lx, 0.36, lz);
    legParts.push(leg);
  }
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
 * Builds a multi-part teacher / executive desk with beveled top, recessed drawer pulls, and blotter.
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

  const top = new THREE.Mesh(new RoundedBoxGeometry(1.64, 0.06, 0.84, 2, 0.02), mats.woodDark);
  top.position.y = 0.76;
  top.castShadow = true;
  top.receiveShadow = true;

  const pedLeft = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.73, 0.72, 2, 0.015), mats.woodDesk);
  pedLeft.position.set(-0.55, 0.365, 0);
  const pedRight = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.73, 0.72, 2, 0.015), mats.woodDesk);
  pedRight.position.set(0.55, 0.365, 0);
  const modesty = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.04), mats.woodDark);
  modesty.position.set(0, 0.45, -0.34);

  const blotter = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.012, 0.4, 2, 0.005), mats.navy);
  blotter.position.set(0, 0.795, 0.06);

  for (const px of [-0.55, 0.55]) {
    for (const dy of [0.22, 0.46, 0.64]) {
      const pull = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 6), mats.gold);
      pull.rotation.z = Math.PI / 2;
      pull.position.set(px, dy, 0.37);
      g.add(pull);
    }
  }

  g.add(top, pedLeft, pedRight, modesty, blotter);
  parent.add(g);
  physics.addStaticBox(x, y + 0.39, z, 0.8, 0.39, 0.4, rotY);
  return g;
}
