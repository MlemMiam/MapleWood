import * as THREE from 'three';
import type { MaterialLibrary } from '../../utils/Materials';
import type { InteractionSystem } from '../../interaction/InteractionSystem';

export function createWhiteboard(
  parent: THREE.Group,
  mats: MaterialLibrary,
  interactions: InteractionSystem,
  opts: {
    id: string;
    subject: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    isChalkboard?: boolean;
    onInspect: (subject: string) => void;
  }
): THREE.Group {
  const { id, subject, x, y, z, rotY, isChalkboard = false, onInspect } = opts;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.35, 0.06), mats.chrome);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.26, 1.22, 0.075),
    isChalkboard ? mats.chalkboard : mats.whiteboard
  );
  const tray = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.14), mats.chrome);
  tray.position.set(0, -0.64, 0.07);

  // Colored marker props on tray
  const marker1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8),
    mats.navy
  );
  marker1.rotation.z = Math.PI / 2;
  marker1.position.set(-0.3, -0.6, 0.09);

  const marker2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8),
    mats.gold
  );
  marker2.rotation.z = Math.PI / 2;
  marker2.position.set(0.1, -0.6, 0.09);

  g.add(frame, board, tray, marker1, marker2);
  parent.add(g);

  interactions.register({
    id: `board-${id}`,
    label: `lire le tableau (${subject})`,
    type: 'whiteboard',
    targetObject: board,
    worldPosition: new THREE.Vector3(x, y, z),
    maxDistance: 3.4,
    onInteract: () => onInspect(subject),
  });

  return g;
}
