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
 * Builds instanced classroom & cafeteria chairs (contoured waterfall seat + curved lumbar backrest + tubular chrome frame).
 */
export function buildInstancedChairs(
  parent: THREE.Group,
  mats: MaterialLibrary,
  chairs: ChairTransform[]
): void {
  if (chairs.length === 0) return;

  // Contoured seat pan with rolled waterfall front edge
  const seatPan = ensureNonIndexed(new RoundedBoxGeometry(0.42, 0.036, 0.4, 2, 0.016));
  const waterfallLip = ensureNonIndexed(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 8));
  waterfallLip.rotateZ(Math.PI / 2);
  waterfallLip.translate(0, -0.006, 0.19);
  const seatGeo = mergeGeometries([seatPan, waterfallLip]);

  // Ergonomic curved lumbar backrest
  const backGeo = new RoundedBoxGeometry(0.4, 0.34, 0.038, 3, 0.016);
  const backPos = backGeo.attributes.position;
  for (let i = 0; i < backPos.count; i++) {
    const vx = backPos.getX(i);
    const vy = backPos.getY(i);
    const vz = backPos.getZ(i);
    // Gentle horizontal wrap + vertical lumbar arch
    const wrapZ = (vx * vx) * 0.28 - Math.cos(vy * 6.0) * 0.012;
    backPos.setZ(i, vz + wrapZ);
  }
  backGeo.computeVertexNormals();

  const legParts: THREE.BufferGeometry[] = [];
  for (const sx of [-0.17, 0.17]) {
    // Sled-style splayed tubular front & rear legs + upright spine tubes
    const frontLeg = ensureNonIndexed(new THREE.CylinderGeometry(0.013, 0.011, 0.45, 8));
    frontLeg.rotateX(-0.08);
    frontLeg.translate(sx, 0.22, 0.16);
    const rearLeg = ensureNonIndexed(new THREE.CylinderGeometry(0.013, 0.011, 0.45, 8));
    rearLeg.rotateX(0.1);
    rearLeg.translate(sx, 0.22, -0.16);
    const spineTube = ensureNonIndexed(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8));
    spineTube.rotateX(-0.08);
    spineTube.translate(sx * 0.72, 0.54, -0.19);
    legParts.push(frontLeg, rearLeg, spineTube);
  }
  const backRail = ensureNonIndexed(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8));
  backRail.rotateZ(Math.PI / 2);
  backRail.translate(0, 0.42, -0.17);
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
