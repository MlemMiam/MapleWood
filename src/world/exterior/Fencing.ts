import * as THREE from 'three';
import type { WorldBuildContext } from '../WorldContext';

export function buildFencing(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Fencing';

  const { physics, mats } = ctx;
  const minX = -92;
  const maxX = 92;
  const minZ = -152;
  const maxZ = 48;

  const segments: Array<{ x: number; z: number; len: number; axis: 'x' | 'z' }> = [
    // North fence
    { x: 0, z: minZ, len: maxX - minX, axis: 'x' },
    // West fence
    { x: minX, z: (minZ + maxZ) * 0.5, len: maxZ - minZ, axis: 'z' },
    // East fence
    { x: maxX, z: (minZ + maxZ) * 0.5, len: maxZ - minZ, axis: 'z' },
    // South fence with wide Bus Entry Gate (X = -20..+20 open!)
    { x: -56, z: maxZ, len: 72, axis: 'x' },
    { x: 56, z: maxZ, len: 72, axis: 'x' },
  ];

  const postPositions: Array<[number, number]> = [];
  for (const seg of segments) {
    const w = seg.axis === 'x' ? seg.len : 0.08;
    const d = seg.axis === 'z' ? seg.len : 0.08;
    const meshMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, 1.9, d),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.7,
        metalness: 0.5,
        transparent: true,
        opacity: 0.42,
      })
    );
    meshMesh.position.set(seg.x, 1.0, seg.z);
    group.add(meshMesh);
    physics.addStaticBox(seg.x, 1.0, seg.z, w * 0.5, 1.0, d * 0.5);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d + 0.04), mats.chrome);
    rail.position.set(seg.x, 1.95, seg.z);
    group.add(rail);

    const steps = Math.floor(seg.len / 6);
    for (let i = 0; i <= steps; i++) {
      const offset = -seg.len * 0.5 + i * 6;
      postPositions.push([
        seg.axis === 'x' ? seg.x + offset : seg.x,
        seg.axis === 'z' ? seg.z + offset : seg.z,
      ]);
    }
  }

  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 2.1, 6);
  const posts = new THREE.InstancedMesh(postGeo, mats.navy, postPositions.length);
  const dummy = new THREE.Object3D();
  postPositions.forEach(([px, pz], i) => {
    dummy.position.set(px, 1.05, pz);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  });
  posts.instanceMatrix.needsUpdate = true;
  posts.computeBoundingSphere();
  group.add(posts);

  // Gate Pillars at Main Entrance (X = -20 and +20, Z = 48)
  for (const gx of [-20, 20]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.8, 1.1), mats.brick);
    pillar.position.set(gx, 1.4, maxZ);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 1.3), mats.gold);
    cap.position.set(gx, 2.9, maxZ);
    group.add(pillar, cap);
    physics.addStaticBox(gx, 1.4, maxZ, 0.6, 1.4, 0.6);
  }

  ctx.scene.add(group);
  return group;
}
