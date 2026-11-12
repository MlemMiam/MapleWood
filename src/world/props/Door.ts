import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '../../engine/Physics';
import type { MaterialLibrary } from '../../utils/Materials';
import type { InteractionSystem } from '../../interaction/InteractionSystem';

export interface InteractiveDoor {
  update: (dt: number) => void;
  isOpen: () => boolean;
  toggle: () => void;
}

export function createDoor(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  interactions: InteractionSystem,
  opts: {
    id: string;
    label: string;
    x: number;
    y?: number;
    z: number;
    rotY?: number;
    width?: number;
    height?: number;
    isGlass?: boolean;
    onToggle?: (open: boolean) => void;
  }
): InteractiveDoor {
  const {
    id,
    label,
    x,
    y = 0.05,
    z,
    rotY = 0,
    width = 1.35,
    height = 2.4,
    isGlass = false,
    onToggle,
  } = opts;

  const thickness = 0.08;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rotY;

  const hinge = new THREE.Group();
  hinge.position.set(-width * 0.5, 0, 0);
  root.add(hinge);

  const leafMat = isGlass ? mats.tintedGlass : mats.woodDark;
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), leafMat);
  leaf.position.set(width * 0.5, height * 0.5, 0);
  leaf.castShadow = !isGlass;
  leaf.receiveShadow = true;
  hinge.add(leaf);

  if (isGlass) {
    // Perimeter aluminum/navy frame & push bar for glass doors
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(width, 0.11, thickness + 0.02), mats.navy);
    frameTop.position.set(width * 0.5, height - 0.055, 0);
    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, thickness + 0.02), mats.navy);
    frameBot.position.set(width * 0.5, 0.08, 0);
    const stileL = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, thickness + 0.02), mats.navy);
    stileL.position.set(0.04, height * 0.5, 0);
    const stileR = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, thickness + 0.02), mats.navy);
    stileR.position.set(width - 0.04, height * 0.5, 0);
    const pushBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, width * 0.72, 10),
      mats.chrome
    );
    pushBar.rotation.z = Math.PI / 2;
    pushBar.position.set(width * 0.5, 1.02, 0.065);
    hinge.add(frameTop, frameBot, stileL, stileR, pushBar);
  } else {
    // Raised wood moldings & glass vision slit on classroom doors
    const visionFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, thickness + 0.015), mats.navy);
    visionFrame.position.set(width * 0.62, 1.62, 0);
    const visionGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.48, thickness + 0.02),
      mats.tintedGlass
    );
    visionGlass.position.set(width * 0.62, 1.62, 0);
    const kickPlate = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.12, 0.22, thickness + 0.012),
      mats.chrome
    );
    kickPlate.position.set(width * 0.5, 0.12, 0);
    hinge.add(visionFrame, visionGlass, kickPlate);
  }

  // Curved brass/gold lever handle on both faces
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 10), mats.gold);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(width - 0.15, 1.04, side * (thickness * 0.5 + 0.01));
    const leverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(width - 0.15, 1.04, side * (thickness * 0.5 + 0.015)),
      new THREE.Vector3(width - 0.15, 1.04, side * (thickness * 0.5 + 0.06)),
      new THREE.Vector3(width - 0.25, 1.04, side * (thickness * 0.5 + 0.06)),
    ]);
    const lever = new THREE.Mesh(new THREE.TubeGeometry(leverCurve, 8, 0.012, 6, false), mats.gold);
    hinge.add(plate, lever);
  }

  parent.add(root);

  const { body, collider } = physics.addKinematicDoorBox(
    x,
    y + height * 0.5,
    z,
    width * 0.5,
    height * 0.5,
    thickness * 0.5
  );

  let opened = false;
  let angle = 0;

  const syncCollider = () => {
    const worldAngle = rotY + angle;
    const halfOffset = width * 0.5;
    const hingeX = x - Math.cos(rotY) * halfOffset;
    const hingeZ = z + Math.sin(rotY) * halfOffset;
    const cx = hingeX + Math.cos(worldAngle) * halfOffset;
    const cz = hingeZ - Math.sin(worldAngle) * halfOffset;

    body.setNextKinematicTranslation({ x: cx, y: y + height * 0.5, z: cz });
    const half = worldAngle * 0.5;
    body.setNextKinematicRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
    collider.setSensor(Math.abs(angle) > 0.45);
  };

  syncCollider();

  const toggle = () => {
    opened = !opened;
    onToggle?.(opened);
  };

  const itemLabel = `ouvrir / fermer : ${label}`;
  interactions.register({
    id: `door-${id}`,
    label: itemLabel,
    type: 'door',
    targetObject: leaf,
    worldPosition: new THREE.Vector3(x, y + 1.1, z),
    maxDistance: 3.0,
    onInteract: toggle,
  });

  return {
    update(dt: number) {
      const target = opened ? Math.PI * 0.48 : 0;
      if (Math.abs(target - angle) > 0.002) {
        angle += (target - angle) * Math.min(1, dt * 8.5);
        hinge.rotation.y = angle;
        syncCollider();
      }
    },
    isOpen: () => opened,
    toggle,
  };
}
