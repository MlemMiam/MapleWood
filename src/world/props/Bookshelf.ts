import * as THREE from 'three';
import type { PhysicsWorld } from '../../engine/Physics';
import type { MaterialLibrary } from '../../utils/Materials';
import type { InteractionSystem } from '../../interaction/InteractionSystem';

const BOOK_PALETTE = [0x1f3864, 0xd4af37, 0x8b3a3a, 0x2e7d6b, 0x5c4b7d];

export function createBookshelf(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  interactions: InteractionSystem,
  opts: {
    id: string;
    title: string;
    x: number;
    y: number;
    z: number;
    rotY?: number;
    onReadBook: (title: string) => void;
  }
): THREE.Group {
  const { id, title, x, y, z, rotY = 0, onReadBook } = opts;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;

  const w = 1.8;
  const h = 2.1;
  const d = 0.45;

  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), mats.woodDark);
  back.position.set(0, h * 0.5, -d * 0.5 + 0.02);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, d), mats.woodDark);
  sideL.position.set(-w * 0.5 + 0.025, h * 0.5, 0);
  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, d), mats.woodDark);
  sideR.position.set(w * 0.5 - 0.025, h * 0.5, 0);

  g.add(back, sideL, sideR);

  for (let s = 0; s < 5; s++) {
    const sy = 0.1 + s * 0.48;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.04, d), mats.woodDesk);
    shelf.position.set(0, sy, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    g.add(shelf);

    if (s < 4) {
      // Cluster of stylized books on each shelf
      for (let b = 0; b < 5; b++) {
        const bookMat = new THREE.MeshStandardMaterial({
          color: BOOK_PALETTE[(s + b) % BOOK_PALETTE.length],
          roughness: 0.72,
        });
        const bh = 0.24 + ((s * 3 + b) % 3) * 0.04;
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.18, bh, 0.28), bookMat);
        book.position.set(-0.65 + b * 0.32, sy + 0.02 + bh * 0.5, 0.03);
        g.add(book);
      }
    }
  }

  parent.add(g);
  physics.addStaticBox(x, y + h * 0.5, z, w * 0.5, h * 0.5, d * 0.5, rotY);

  interactions.register({
    id: `bookshelf-${id}`,
    label: `consulter les livres (${title})`,
    type: 'book',
    targetObject: g,
    worldPosition: new THREE.Vector3(x, y + 1.1, z),
    maxDistance: 2.8,
    onInteract: () => onReadBook(title),
  });

  return g;
}
