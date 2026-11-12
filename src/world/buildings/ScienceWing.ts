import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  addBuildingParapetAndHVAC,
  addFacadeDetailing,
  buildWallWithOpenings,
  createExitSign,
  createExteriorNoticeBoard,
  createExteriorPoster,
  createFireExtinguisher,
} from '../../utils/Geometry';
import { createPeriodicTableTexture } from '../../utils/Materials';
import type { WorldBuildContext } from '../WorldContext';
import { createDoor } from '../props/Door';
import { createWhiteboard } from '../props/Whiteboard';
import { buildInstancedChairs } from '../props/Chair';

export function buildScienceWing(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ScienceWing';

  const { physics, mats, interactions, doors, callbacks } = ctx;
  const wallH = 4.2;
  const floorY = 0.05;

  // Floor slab (X: 32..54 = 22m, Z: -23..-6 = 17m)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.1, 17), mats.linoleum);
  floor.position.set(43, floorY - 0.05, -14.5);
  floor.receiveShadow = true;
  group.add(floor);
  physics.addStaticBox(43, floorY - 0.05, -14.5, 11, 0.05, 8.5);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.25, 17.4), mats.roof);
  roof.position.set(43, floorY + wallH + 0.12, -14.5);
  roof.castShadow = true;
  group.add(roof);
  addBuildingParapetAndHVAC(group, mats, 43, -14.5, 22.4, 17.4, floorY + wallH + 0.245, {
    hvacCount: 2,
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(21.6, 16.6), mats.plasterWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(43, floorY + wallH - 0.015, -14.5);
  group.add(ceiling);

  // Exterior East Wall (X = 54)
  buildWallWithOpenings(group, physics, mats, {
    x: 54,
    z: -14.5,
    length: 17,
    height: wallH,
    thickness: 0.3,
    axis: 'z',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -4.5, width: 2.8, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 4.5, width: 2.8, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });

  // Exterior North Wall (Z = -23)
  buildWallWithOpenings(group, physics, mats, {
    x: 43,
    z: -23,
    length: 22,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -5, width: 3.4, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 5, width: 3.0, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });

  // Exterior South Wall (Z = -6)
  buildWallWithOpenings(group, physics, mats, {
    x: 43,
    z: -6,
    length: 22,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -5.5, width: 3.2, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 5.5, width: 3.2, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: 43,
    z: -6,
    length: 22,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    pilasterOffsets: [-10, 0, 10],
    vents: [
      { offset: -2.0, y: 3.1, scale: 0.9 },
      { offset: 2.0, y: 3.1, scale: 0.9 },
    ],
  });

  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-science-wing',
    theme: 'science',
    x: 41.0,
    y: 1.65,
    z: -5.81,
    rotY: 0,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorNoticeBoard(group, mats, interactions, {
    id: 'ext-board-science-wing',
    title: 'Annonces Aile des Sciences',
    details:
      'Fête des Sciences ce vendredi à 14h ! Inscriptions des projets de chimie, biologie et physique au secrétariat des laboratoires.',
    variant: 'activities',
    x: 45.1,
    y: 1.65,
    z: -5.81,
    rotY: 0,
    width: 1.56,
    height: 1.0,
    onReadNotice: callbacks.onReadNotice,
  });
  addFacadeDetailing(group, mats, {
    x: 43,
    z: -23,
    length: 22,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    pilasterOffsets: [-10, 0, 10],
    vents: [
      { offset: -8.3, y: 3.1, scale: 0.95 },
      { offset: 8.3, y: 3.1, scale: 0.95 },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: 54,
    z: -14.5,
    length: 17,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    axis: 'z',
    pilasterOffsets: [-7.8, -1.6, 1.6, 7.8],
    vents: [{ offset: 0, y: 3.1, scale: 1.05 }],
  });

  // Corridor walls (Z = -15.75 and Z = -12.25)
  buildWallWithOpenings(group, physics, mats, {
    x: 43,
    z: -15.75,
    length: 22,
    height: wallH,
    thickness: 0.2,
    axis: 'x',
    material: mats.plasterWall,
    baseY: floorY,
    openings: [
      { offset: -5, width: 1.4, height: 2.45, sillHeight: 0 }, // Chemistry (38)
      { offset: 6, width: 1.4, height: 2.45, sillHeight: 0 },  // Prep (49)
    ],
  });
  buildWallWithOpenings(group, physics, mats, {
    x: 43,
    z: -12.25,
    length: 22,
    height: wallH,
    thickness: 0.2,
    axis: 'x',
    material: mats.plasterWall,
    baseY: floorY,
    openings: [
      { offset: -5.5, width: 1.4, height: 2.45, sillHeight: 0 }, // Biology (37.5)
      { offset: 5.5, width: 1.4, height: 2.45, sillHeight: 0 },  // Physics (48.5)
    ],
  });

  // Partitions
  buildWallWithOpenings(group, physics, mats, {
    x: 44,
    z: -19.375,
    length: 7.25,
    height: wallH,
    thickness: 0.18,
    axis: 'z',
    material: mats.plasterWall,
    baseY: floorY,
  });
  buildWallWithOpenings(group, physics, mats, {
    x: 43,
    z: -9.125,
    length: 6.25,
    height: wallH,
    thickness: 0.18,
    axis: 'z',
    material: mats.plasterWall,
    baseY: floorY,
  });

  // Doors
  const sciDoors = [
    { id: 'chem', label: 'Laboratoire de Chimie', x: 38, z: -15.75 },
    { id: 'prep', label: 'Salle de Préparation', x: 49, z: -15.75 },
    { id: 'bio', label: 'Laboratoire de Biologie', x: 37.5, z: -12.25 },
    { id: 'phys', label: 'Laboratoire de Physique', x: 48.5, z: -12.25 },
  ];
  sciDoors.forEach((d) => {
    doors.push(
      createDoor(group, physics, mats, interactions, {
        id: `sci-${d.id}`,
        label: d.label,
        x: d.x,
        y: floorY,
        z: d.z,
        width: 1.35,
        height: 2.4,
        onToggle: callbacks.onDoorToggle,
      })
    );
  });

  // --- Chemistry Lab (X = 32..44, Z = -23..-15.75) ---
  // Lab Island Bench shifted North so teleport/walkway center (38, -19.375) is unobstructed
  const chemBench = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.88, 1.3, 2, 0.03), mats.concreteDark);
  chemBench.position.set(38.2, floorY + 0.44, -21.05);
  chemBench.castShadow = true;
  const chemTop = new THREE.Mesh(new RoundedBoxGeometry(5.7, 0.06, 1.4, 2, 0.02), mats.woodDark);
  chemTop.position.set(38.2, floorY + 0.9, -21.05);
  group.add(chemBench, chemTop);
  physics.addStaticBox(38.2, floorY + 0.46, -21.05, 2.85, 0.46, 0.7);

  // Sculpted LatheGeometry Erlenmeyer flasks with colored chemical reagents
  const flaskProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.095, 0.0),
    new THREE.Vector2(0.095, 0.04),
    new THREE.Vector2(0.032, 0.19),
    new THREE.Vector2(0.032, 0.27),
    new THREE.Vector2(0.044, 0.285),
  ];
  const flaskGeo = new THREE.LatheGeometry(flaskProfile, 14);
  const liquidGeo = new THREE.CylinderGeometry(0.035, 0.082, 0.1, 12);
  const reagentColors = [0x38bdf8, 0x34d399, 0xfbbf24, 0xf472b6];
  for (let b = 0; b < 4; b++) {
    const fx = 36.4 + b * 1.15;
    const flask = new THREE.Mesh(flaskGeo, mats.tintedGlass);
    flask.position.set(fx, floorY + 0.93, -21.05);
    const liquid = new THREE.Mesh(
      liquidGeo,
      new THREE.MeshStandardMaterial({ color: reagentColors[b], roughness: 0.25, metalness: 0.05 })
    );
    liquid.position.set(fx, floorY + 0.99, -21.05);
    group.add(flask, liquid);
  }

  // Fume hood & Safety Shower & Periodic Table
  const fumeHood = new THREE.Mesh(new RoundedBoxGeometry(2.0, 2.3, 0.9, 2, 0.03), mats.chrome);
  fumeHood.position.set(33.8, floorY + 1.15, -22.3);
  group.add(fumeHood);
  physics.addStaticBox(33.8, floorY + 1.15, -22.3, 1.0, 1.15, 0.45);

  const periodicBoard = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 1.5, 0.06),
    new THREE.MeshStandardMaterial({ map: createPeriodicTableTexture(), roughness: 0.4 })
  );
  periodicBoard.position.set(43.88, floorY + 1.85, -19.375);
  periodicBoard.rotation.y = -Math.PI / 2;
  group.add(periodicBoard);

  group.add(createFireExtinguisher(mats, 43.6, floorY + 0.95, -22.4, 0));

  // --- Biology Lab (X = 32..43, Z = -12.25..-6) ---
  const bioBench = new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.88, 1.2, 2, 0.03), mats.concreteDark);
  bioBench.position.set(37.5, floorY + 0.44, -7.7);
  group.add(bioBench);
  physics.addStaticBox(37.5, floorY + 0.44, -7.7, 2.4, 0.44, 0.6);

  // Microscopes & Aquarium
  for (const mx of [36.2, 38.6]) {
    const scopeBase = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.08, 0.26, 2, 0.02), mats.chrome);
    scopeBase.position.set(mx, floorY + 0.92, -7.7);
    const scopeArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), mats.concreteDark);
    scopeArm.position.set(mx, floorY + 1.08, -7.75);
    group.add(scopeBase, scopeArm);
  }

  const aquarium = new THREE.Mesh(
    new RoundedBoxGeometry(1.4, 0.7, 0.55, 2, 0.03),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      roughness: 0.2,
    })
  );
  aquarium.position.set(33.5, floorY + 1.1, -6.7);
  group.add(aquarium);

  // Quest Item: Leo's Lost Blue Biology Notebook on Bio Lab Bench!
  const notebookGroup = new THREE.Group();
  notebookGroup.position.set(37.5, floorY + 0.91, -7.4);
  const nbCover = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.34), mats.navy);
  const nbStripe = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.045, 0.05), mats.gold);
  notebookGroup.add(nbCover, nbStripe);
  group.add(notebookGroup);

  interactions.register({
    id: 'quest-notebook-pickup',
    label: 'ramasser le carnet bleu de Léo',
    type: 'notebook',
    targetObject: notebookGroup,
    worldPosition: new THREE.Vector3(37.5, floorY + 0.95, -7.4),
    onInteract: () => {
      notebookGroup.visible = false;
      interactions.unregister('quest-notebook-pickup');
      callbacks.onPickupNotebook();
    },
  });

  // --- Physics Lab (X = 43..54, Z = -12.25..-6) ---
  createWhiteboard(group, mats, interactions, {
    id: 'physics-chalk',
    subject: 'Physique — E = mc² & Cinématique',
    x: 43.12,
    y: floorY + 1.65,
    z: -9.125,
    rotY: Math.PI / 2,
    isChalkboard: true,
    onInspect: callbacks.onInspectWhiteboard,
  });

  const airTrack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.28), mats.chrome);
  airTrack.position.set(48.5, floorY + 0.95, -7.7);
  const physBench = new THREE.Mesh(new RoundedBoxGeometry(4.5, 0.86, 1.2, 2, 0.03), mats.woodDesk);
  physBench.position.set(48.5, floorY + 0.43, -7.7);
  group.add(physBench, airTrack);
  physics.addStaticBox(48.5, floorY + 0.43, -7.7, 2.25, 0.43, 0.6);

  buildInstancedChairs(group, mats, [
    { x: 36.8, y: floorY, z: -20.05, rotY: Math.PI },
    { x: 39.6, y: floorY, z: -20.05, rotY: Math.PI },
    { x: 36.5, y: floorY, z: -6.8, rotY: Math.PI },
    { x: 38.5, y: floorY, z: -6.8, rotY: Math.PI },
    { x: 47.5, y: floorY, z: -6.8, rotY: Math.PI },
    { x: 49.5, y: floorY, z: -6.8, rotY: Math.PI },
  ]);

  const pt = new THREE.PointLight(0xfff1d6, 2.0, 24, 1.4);
  pt.position.set(43, floorY + wallH - 0.5, -14);
  group.add(pt, createExitSign(mats, 53.6, floorY + 3.0, -14, -Math.PI / 2));

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== floor) {
      ctx.cameraColliders.push(obj);
    }
  });

  ctx.scene.add(group);
  return group;
}
