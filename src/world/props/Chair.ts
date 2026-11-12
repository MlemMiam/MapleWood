import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialLibrary } from '../../utils/Materials';

export interface ChairTransform {
  x: number;
  y: number;
  z: number;
  rotY: number;
}

const ensureNonIndexed = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

/**
 * Builds instanced classroom & cafeteria chairs (contoured seat + backrest + 4 tubular chrome legs).
 */
export function buildInstancedChairs(
  parent: THREE.Group,
  mats: MaterialLibrary,
  chairs: ChairTransform[]
): void {
  if (chairs.length === 0) return;

  const seatGeo = new RoundedBoxGeometry(0.42, 0.045, 0.42, 2, 0.018);
  const backGeo = new RoundedBoxGeometry(0.4, 0.36, 0.04, 2, 0.016);

  const legParts: THREE.BufferGeometry[] = [];
  for (const [lx, lz] of [
    [-0.17, -0.17],
    [0.17, -0.17],
    [-0.17, 0.17],
    [0.17, 0.17],
  ]) {
    const leg = ensureNonIndexed(new THREE.CylinderGeometry(0.014, 0.012, 0.44, 8));
    leg.translate(lx, 0.22, lz);
    legParts.push(leg);
  }
  const backRail = ensureNonIndexed(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8));
  backRail.rotateZ(Math.PI / 2);
  backRail.translate(0, 0.4, -0.17);
  legParts.push(backRail);
  const legsGeo = mergeGeometries(legParts);

  const seats = new THREE.InstancedMesh(seatGeo, mats.plasticSeat, chairs.length);
  const backs = new THREE.InstancedMesh(backGeo, mats.plasticSeat, chairs.length);
  const legs = new THREE.InstancedMesh(legsGeo, mats.chrome, chairs.length);

  const dummy = new THREE.Object3D();
  chairs.forEach((c, i) => {
    dummy.position.set(c.x, c.y + 0.44, c.z);
    dummy.rotation.set(0, c.rotY, 0);
    dummy.updateMatrix();
    seats.setMatrixAt(i, dummy.matrix);

    const bx = c.x - Math.sin(c.rotY) * 0.19;
    const bz = c.z - Math.cos(c.rotY) * 0.19;
    dummy.position.set(bx, c.y + 0.66, bz);
    dummy.rotation.set(-0.08, c.rotY, 0);
    dummy.updateMatrix();
    backs.setMatrixAt(i, dummy.matrix);

    dummy.position.set(c.x, c.y, c.z);
    dummy.rotation.set(0, c.rotY, 0);
    dummy.updateMatrix();
    legs.setMatrixAt(i, dummy.matrix);
  });

  seats.instanceMatrix.needsUpdate = true;
  backs.instanceMatrix.needsUpdate = true;
  legs.instanceMatrix.needsUpdate = true;
  seats.computeBoundingSphere();
  backs.computeBoundingSphere();
  legs.computeBoundingSphere();
  parent.add(seats, backs, legs);
}
