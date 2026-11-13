import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldBuildContext } from '../WorldContext';

const ensureNonIndexed = (g: THREE.BufferGeometry): THREE.BufferGeometry =>
  g.index ? g.toNonIndexed() : g;

export function buildExteriorDetails(ctx: WorldBuildContext): void {
  const { scene, mats, physics, animatedObjects } = ctx;
  const group = new THREE.Group();
  group.name = 'ExteriorDetails';

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  // =========================================================================
  // 1. INSTANCED OUTER-PERIMETER EVERGREEN SPRUCES (2 draw calls total)
  // Placed strictly outside courtyard walkways, buildings, parking & stadium.
  // =========================================================================
  const spruceSpots: Array<[number, number, number, number]> = [
    [-48, 0, 26, 0.95],
    [48, 0, 26, 1.0],
    [-54, 0, -32, 1.05],
    [54, 0, -32, 0.98],
    [-72, 0, -64, 1.08],
    [72, 0, -64, 0.96],
    [-86, 0, 14, 1.02],
    [92, 0, 14, 1.06],
    [-62, 0, 40, 0.95],
    [62, 0, 40, 1.0],
  ];

  const spruceTrunkGeo = ensureNonIndexed(new THREE.CylinderGeometry(0.11, 0.19, 3.8, 8));
  spruceTrunkGeo.translate(0, 1.9, 0);

  const tier1 = ensureNonIndexed(new THREE.ConeGeometry(1.35, 1.75, 9));
  tier1.translate(0, 2.55, 0);
  const tier2 = ensureNonIndexed(new THREE.ConeGeometry(1.02, 1.55, 9));
  tier2.translate(0, 3.65, 0);
  const tier3 = ensureNonIndexed(new THREE.ConeGeometry(0.68, 1.3, 9));
  tier3.translate(0, 4.65, 0);
  const spire = ensureNonIndexed(new THREE.ConeGeometry(0.34, 0.9, 8));
  spire.translate(0, 5.45, 0);
  const spruceCrownGeo = mergeGeometries([tier1, tier2, tier3, spire]);

  const spruceTrunks = new THREE.InstancedMesh(spruceTrunkGeo, mats.bark, spruceSpots.length);
  const spruceCrowns = new THREE.InstancedMesh(spruceCrownGeo, mats.foliage, spruceSpots.length);
  spruceTrunks.castShadow = true;
  spruceCrowns.castShadow = true;
  spruceCrowns.receiveShadow = true;

  spruceSpots.forEach(([x, y, z, scale], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, i * 0.85, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    spruceTrunks.setMatrixAt(i, dummy.matrix);
    spruceCrowns.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.34 + (i % 3) * 0.015, 0.48, 0.34 + (i % 2) * 0.05);
    spruceCrowns.setColorAt(i, tint);
    physics.addStaticCylinder(x, 1.9 * scale, z, 0.22 * scale, 1.9 * scale);
  });
  spruceTrunks.instanceMatrix.needsUpdate = true;
  spruceCrowns.instanceMatrix.needsUpdate = true;
  if (spruceCrowns.instanceColor) spruceCrowns.instanceColor.needsUpdate = true;
  spruceTrunks.computeBoundingSphere();
  spruceCrowns.computeBoundingSphere();
  group.add(spruceTrunks, spruceCrowns);

  // =========================================================================
  // 2. CURATED INSTANCED LAWN FLOWER BORDERS (3 draw calls total)
  // Neat accent clusters in the 4 courtyard lawn quadrants, clear of paths & trees.
  // =========================================================================
  const borderClusters: Array<[number, number]> = [
    [-7.6, 2.5],
    [7.6, 2.5],
    [-12.2, 17.6],
    [12.2, 17.6],
    [-8.2, 20.6],
    [8.2, 20.6],
  ];

  const lawnFlowers: Array<{ x: number; z: number; scale: number; rotY: number; colorIdx: number }> = [];
  borderClusters.forEach(([cx, cz], ci) => {
    for (let f = 0; f < 7; f++) {
      const a = (f / 7) * Math.PI * 2 + ci * 0.4;
      const r = f === 0 ? 0.05 : 0.28 + ((f * 13 + ci * 7) % 5) * 0.08;
      lawnFlowers.push({
        x: cx + Math.cos(a) * r,
        z: cz + Math.sin(a) * r,
        scale: 0.9 + ((ci + f) % 3) * 0.14,
        rotY: a + f * 0.7,
        colorIdx: ci * 2 + f,
      });
    }
  });

  const tuftParts: THREE.BufferGeometry[] = [];
  const stem = ensureNonIndexed(new THREE.CylinderGeometry(0.012, 0.015, 0.22, 5));
  stem.translate(0, 0.11, 0);
  tuftParts.push(stem);
  for (let l = 0; l < 3; l++) {
    const la = (l / 3) * Math.PI * 2;
    const leaf = ensureNonIndexed(new THREE.SphereGeometry(0.065, 5, 4));
    leaf.scale(1.4, 0.35, 0.75);
    leaf.rotateZ(0.32);
    leaf.rotateY(la);
    leaf.translate(Math.cos(la) * 0.06, 0.04, Math.sin(la) * 0.06);
    tuftParts.push(leaf);
  }
  const lawnTuftGeo = mergeGeometries(tuftParts);

  const petalParts: THREE.BufferGeometry[] = [];
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    const petal = ensureNonIndexed(new THREE.SphereGeometry(0.058, 6, 4));
    petal.scale(0.85, 0.38, 1.35);
    petal.rotateX(-0.24);
    petal.rotateY(a);
    petal.translate(Math.sin(a) * 0.06, 0.22, Math.cos(a) * 0.06);
    petalParts.push(petal);
  }
  const lawnPetalGeo = mergeGeometries(petalParts);
  const lawnCenterGeo = new THREE.SphereGeometry(0.038, 6, 5);
  lawnCenterGeo.translate(0, 0.23, 0);

  const lawnPetalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
  const lawnCenterMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 });

  const tuftInst = new THREE.InstancedMesh(lawnTuftGeo, mats.foliage, lawnFlowers.length);
  const petalInst = new THREE.InstancedMesh(lawnPetalGeo, lawnPetalMat, lawnFlowers.length);
  const centerInst = new THREE.InstancedMesh(lawnCenterGeo, lawnCenterMat, lawnFlowers.length);
  const palette = [0xf59e0b, 0xf43f5e, 0xfbbf24, 0xf472b6, 0x8b5cf6, 0xfff7ed];

  lawnFlowers.forEach((lf, i) => {
    dummy.position.set(lf.x, 0.01, lf.z);
    dummy.rotation.set(0, lf.rotY, 0);
    dummy.scale.setScalar(lf.scale);
    dummy.updateMatrix();
    tuftInst.setMatrixAt(i, dummy.matrix);
    petalInst.setMatrixAt(i, dummy.matrix);
    centerInst.setMatrixAt(i, dummy.matrix);
    tint.setHex(palette[lf.colorIdx % palette.length]);
    petalInst.setColorAt(i, tint);
  });
  tuftInst.instanceMatrix.needsUpdate = true;
  petalInst.instanceMatrix.needsUpdate = true;
  centerInst.instanceMatrix.needsUpdate = true;
  if (petalInst.instanceColor) petalInst.instanceColor.needsUpdate = true;
  tuftInst.computeBoundingSphere();
  petalInst.computeBoundingSphere();
  centerInst.computeBoundingSphere();
  group.add(tuftInst, petalInst, centerInst);

  // =========================================================================
  // 3. LIGHTWEIGHT FOUNTAIN BASIN FOAM RING (Zero transmission render pass)
  // =========================================================================
  let fountainGroup: THREE.Group | null = null;
  scene.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.position.x === 0 && Math.abs(obj.position.z - 15.5) < 0.1) {
      fountainGroup = obj;
    }
  });
  if (fountainGroup) {
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const foamRing = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.94, 32), foamMat);
    foamRing.rotation.x = -Math.PI / 2;
    foamRing.position.set(0, 0.625, 0);
    (fountainGroup as THREE.Group).add(foamRing);

    animatedObjects.push((elapsed) => {
      const pulse = 0.96 + Math.sin(elapsed * 2.2) * 0.04;
      foamRing.scale.set(pulse, pulse, 1);
    });
  }

  scene.add(group);
}
