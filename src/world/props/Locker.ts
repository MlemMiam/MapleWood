import * as THREE from 'three';
import type { PhysicsWorld } from '../../engine/Physics';
import type { MaterialLibrary } from '../../utils/Materials';
import type { InteractionSystem } from '../../interaction/InteractionSystem';

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface LockerTransform {
  x: number;
  y: number;
  z: number;
  rotY: number;
  interactiveLabel?: string;
}

const ensureNonIndexed = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

/**
 * Renders banks of blue Maplewood metal lockers using InstancedMesh for high performance,
 * and registers key lockers as interactable objects.
 */
export function buildLockerBank(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  interactions: InteractionSystem,
  lockers: LockerTransform[],
  onInspectLocker: (label: string) => void
): void {
  if (lockers.length === 0) return;

  const w = 0.42;
  const h = 1.85;
  const d = 0.45;

  const bodyGeo = new RoundedBoxGeometry(w, h, d, 2, 0.015);
  const plate = ensureNonIndexed(new RoundedBoxGeometry(w * 0.72, 0.08, 0.025, 1, 0.006));
  const louverTop = ensureNonIndexed(new THREE.BoxGeometry(w * 0.65, 0.02, 0.02));
  louverTop.translate(0, -0.14, 0);
  const louverBot = ensureNonIndexed(new THREE.BoxGeometry(w * 0.65, 0.02, 0.02));
  louverBot.translate(0, -0.2, 0);
  const trimGeo = mergeGeometries([plate, louverTop, louverBot]);
  const handleGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.14, 8);

  const bodies = new THREE.InstancedMesh(bodyGeo, mats.lockerMetal, lockers.length);
  const trims = new THREE.InstancedMesh(trimGeo, mats.lockerTrim, lockers.length);
  const handles = new THREE.InstancedMesh(handleGeo, mats.chrome, lockers.length);
  bodies.castShadow = true;
  bodies.receiveShadow = true;

  const dummy = new THREE.Object3D();

  lockers.forEach((l, i) => {
    dummy.position.set(l.x, l.y + h * 0.5, l.z);
    dummy.rotation.set(0, l.rotY, 0);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);

    const forwardX = Math.sin(l.rotY);
    const forwardZ = Math.cos(l.rotY);
    dummy.position.set(l.x + forwardX * (d * 0.5 + 0.01), l.y + h - 0.18, l.z + forwardZ * (d * 0.5 + 0.01));
    dummy.updateMatrix();
    trims.setMatrixAt(i, dummy.matrix);

    dummy.position.set(
      l.x + forwardX * (d * 0.5 + 0.02) + forwardZ * 0.12,
      l.y + 1.0,
      l.z + forwardZ * (d * 0.5 + 0.02) - forwardX * 0.12
    );
    dummy.updateMatrix();
    handles.setMatrixAt(i, dummy.matrix);

    if (l.interactiveLabel) {
      const proxy = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.position.set(l.x, l.y + h * 0.5, l.z);
      proxy.rotation.y = l.rotY;
      parent.add(proxy);

      interactions.register({
        id: `locker-${i}-${l.interactiveLabel}`,
        label: `fouiller le ${l.interactiveLabel}`,
        type: 'locker',
        targetObject: proxy,
        worldPosition: new THREE.Vector3(l.x, l.y + 1.0, l.z),
        maxDistance: 2.5,
        onInteract: () => onInspectLocker(l.interactiveLabel!),
      });
    }
  });

  bodies.instanceMatrix.needsUpdate = true;
  trims.instanceMatrix.needsUpdate = true;
  handles.instanceMatrix.needsUpdate = true;
  bodies.computeBoundingSphere();
  trims.computeBoundingSphere();
  handles.computeBoundingSphere();

  parent.add(bodies, trims, handles);

  // Group contiguous lockers into coarse colliders along rows for efficiency
  for (let i = 0; i < lockers.length; i++) {
    const l = lockers[i];
    physics.addStaticBox(l.x, l.y + h * 0.5, l.z, w * 0.5, h * 0.5, d * 0.5, l.rotY);
  }
}
