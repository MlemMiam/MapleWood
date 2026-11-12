import * as THREE from 'three';
import type { PhysicsWorld } from '../../engine/Physics';
import type { MaterialLibrary } from '../../utils/Materials';
import type { InteractionSystem } from '../../interaction/InteractionSystem';

export function createVendingMachine(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  interactions: InteractionSystem,
  opts: {
    id: string;
    kind: 'Boissons' | 'Snacks';
    x: number;
    y: number;
    z: number;
    rotY?: number;
    onUse: (kind: 'Boissons' | 'Snacks') => void;
  }
): THREE.Group {
  const { id, kind, x, y, z, rotY = 0, onUse } = opts;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;

  const w = 1.05;
  const h = 1.95;
  const d = 0.82;

  const cabinetMat = kind === 'Boissons' ? mats.navy : mats.brick;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cabinetMat);
  body.position.y = h * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;

  const frontWindow = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.72, h * 0.56, 0.05),
    mats.neonCeiling
  );
  frontWindow.position.set(-0.08, h * 0.58, d * 0.5 + 0.01);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.18, h * 0.78, 0.06), mats.chrome);
  trim.position.set(w * 0.36, h * 0.52, d * 0.5 + 0.01);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.22, 0.08), mats.concreteDark);
  tray.position.set(-0.08, 0.32, d * 0.5 + 0.02);

  g.add(body, frontWindow, trim, tray);
  parent.add(g);

  physics.addStaticBox(x, y + h * 0.5, z, w * 0.5, h * 0.5, d * 0.5, rotY);

  interactions.register({
    id: `vending-${id}`,
    label: `utiliser le distributeur (${kind})`,
    type: 'vending',
    targetObject: g,
    worldPosition: new THREE.Vector3(x, y + 1.0, z),
    maxDistance: 2.8,
    onInteract: () => onUse(kind),
  });

  return g;
}
