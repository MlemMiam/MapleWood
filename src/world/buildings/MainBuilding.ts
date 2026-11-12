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
  createWallClock,
} from '../../utils/Geometry';
import { createSignTexture, createUSFlagTexture } from '../../utils/Materials';
import type { WorldBuildContext } from '../WorldContext';
import { createDoor } from '../props/Door';
import { buildLockerBank, type LockerTransform } from '../props/Locker';
import { buildInstancedDesks, createTeacherDesk, type DeskTransform } from '../props/Desk';
import { buildInstancedChairs, type ChairTransform } from '../props/Chair';
import { createWhiteboard } from '../props/Whiteboard';

export function buildMainBuilding(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MainBuilding';

  const { physics, mats, interactions, doors, clocks, callbacks } = ctx;
  const wallH = 4.2;
  const floorY = 0.05;

  // Floor slab (X: -32..32 = 64m, Z: -23..-6 = 17m)
  const floorGeo = new THREE.BoxGeometry(64, 0.1, 17);
  const floor = new THREE.Mesh(floorGeo, mats.linoleum);
  floor.position.set(0, floorY - 0.05, -14.5);
  floor.receiveShadow = true;
  group.add(floor);
  physics.addStaticBox(0, floorY - 0.05, -14.5, 32, 0.05, 8.5);

  // Roof slab + parapet + HVAC units + central skylight
  const roof = new THREE.Mesh(new THREE.BoxGeometry(64.4, 0.25, 17.4), mats.roof);
  roof.position.set(0, floorY + wallH + 0.12, -14.5);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  addBuildingParapetAndHVAC(group, mats, 0, -14.5, 64.4, 17.4, floorY + wallH + 0.245, {
    hvacCount: 4,
    addSkylight: true,
  });

  // Finished acoustic plaster interior ceiling soffit (faces downward into rooms/corridors)
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(63.6, 16.6), mats.plasterWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, floorY + wallH - 0.015, -14.5);
  group.add(ceiling);

  // Architectural Entrance Sign mounted cleanly on front portico fascia (unobstructed by columns)
  const signTex = createSignTexture('MAPLEWOOD HIGH SCHOOL', 'LES AIGLES DE MAPLEWOOD · EST. 1994');
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(7.6, 1.15, 0.2),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4, metalness: 0.2 })
  );
  signMesh.position.set(0, floorY + wallH + 0.48, -3.52);
  signMesh.castShadow = true;
  group.add(signMesh);

  // Portico columns with molded LatheGeometry bases & capitals
  const colProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.46, 0.0),
    new THREE.Vector2(0.46, 0.18),
    new THREE.Vector2(0.36, 0.32),
    new THREE.Vector2(0.31, 0.48),
    new THREE.Vector2(0.27, wallH - 0.55),
    new THREE.Vector2(0.34, wallH - 0.35),
    new THREE.Vector2(0.45, wallH - 0.18),
    new THREE.Vector2(0.45, wallH),
    new THREE.Vector2(0.0, wallH),
  ];
  const porticoColGeo = new THREE.LatheGeometry(colProfile, 18);
  for (const cx of [-4.2, 4.2]) {
    const col = new THREE.Mesh(porticoColGeo, mats.concrete);
    col.position.set(cx, floorY, -4.3);
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);
    physics.addStaticBox(cx, floorY + wallH * 0.5, -4.3, 0.34, wallH * 0.5, 0.34);
  }
  const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.28, 2.7), mats.concreteDark);
  porticoRoof.position.set(0, floorY + wallH - 0.1, -4.7);
  porticoRoof.castShadow = true;
  group.add(porticoRoof);

  // Beveled triangular pediment crowning the entrance sign
  const pedShape = new THREE.Shape();
  pedShape.moveTo(-4.3, 0);
  pedShape.lineTo(0, 0.95);
  pedShape.lineTo(4.3, 0);
  pedShape.closePath();
  const pedGeo = new THREE.ExtrudeGeometry(pedShape, {
    depth: 0.35,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  const pediment = new THREE.Mesh(pedGeo, mats.limestone);
  pediment.position.set(0, floorY + wallH + 1.04, -3.72);
  pediment.castShadow = true;
  group.add(pediment);

  // Pediment Tympanum Crest Medallion
  const medallionRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 10, 20), mats.gold);
  medallionRim.position.set(0, floorY + wallH + 1.48, -3.3);
  const medallionDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), mats.navy);
  medallionDisc.rotation.x = Math.PI / 2;
  medallionDisc.position.set(0, floorY + wallH + 1.48, -3.32);
  const medallionStar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 5), mats.gold);
  medallionStar.rotation.x = Math.PI / 2;
  medallionStar.position.set(0, floorY + wallH + 1.48, -3.29);
  group.add(medallionRim, medallionDisc, medallionStar);

  // Hanging Campus Banners & Exterior Wall Lantern Sconces + Portico Handrails
  const bannerTex = createSignTexture('AIGLES', '1994', '#1F3864', '#D4AF37');
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.72, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    // Portico column banner arm, gold finial & cloth pennant (clear of column shaft)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.86, 8), mats.gold);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(side * 4.86, floorY + 3.15, -4.3);
    const armFinial = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), mats.gold);
    armFinial.position.set(side * 5.29, floorY + 3.15, -4.3);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 1.22), bannerMat);
    banner.position.set(side * 4.9, floorY + 2.48, -4.3);
    group.add(arm, armFinial, banner);

    // Wrought-iron exterior lantern sconces flanking main entrance
    const sconceX = side * 2.15;
    const backplate = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.3, 0.05, 2, 0.015), mats.navy);
    backplate.position.set(sconceX, floorY + 2.45, -5.82);
    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 6), mats.navy);
    lanternCap.position.set(sconceX, floorY + 2.58, -5.66);
    const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.24, 6), mats.neonCeiling);
    lanternGlass.position.set(sconceX, floorY + 2.4, -5.66);
    group.add(backplate, lanternCap, lanternGlass);

    // Curved chrome portico threshold handrails
    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 1.78, floorY, -3.85),
      new THREE.Vector3(side * 1.78, floorY + 0.88, -3.85),
      new THREE.Vector3(side * 1.78, floorY + 0.9, -5.65),
      new THREE.Vector3(side * 1.78, floorY, -5.65),
    ]);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 18, 0.028, 8, false), mats.chrome);
    rail.castShadow = true;
    group.add(rail);
  }

  // Exterior South Wall (Z = -6) with double entrance opening at X = 0 (width 3.0m) + classroom windows
  buildWallWithOpenings(group, physics, mats, {
    x: 0,
    z: -6,
    length: 64,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -28, width: 3.4, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: -20, width: 3.4, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: -12, width: 3.4, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 0, width: 3.0, height: 2.6, sillHeight: 0, glazed: false },
      { offset: 12, width: 3.4, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 20, width: 3.4, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 28, width: 3.4, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: 0,
    z: -6,
    length: 64,
    height: wallH,
    baseY: floorY,
    facingSign: 1,
    pilasterOffsets: [-24, -16, -8, 8, 16, 24],
    skipPlinthRange: [-4.4, 4.4],
    vents: [
      { offset: -6.65, y: 3.2, scale: 0.82 },
      { offset: 6.65, y: 3.2, scale: 0.82 },
    ],
  });

  // Sheltered Exterior Portico Notice Board (left) & Event Posters (right)
  createExteriorNoticeBoard(group, mats, interactions, {
    id: 'ext-board-main-portico',
    title: 'Panneau d\'affichage principal',
    details:
      'Annonces de la semaine : Bal de Promo (Samedi 20h, Gymnase), Science Fair (Vendredi 14h, Labo Chimie), Examens blancs en salles 101–103 et Finale des Aigles !',
    variant: 'courtyard',
    x: -3.08,
    y: 1.65,
    z: -5.81,
    rotY: 0,
    width: 1.48,
    height: 0.96,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-prom-main',
    theme: 'prom',
    x: 2.66,
    y: 1.68,
    z: -5.82,
    rotY: 0,
    width: 0.68,
    height: 0.92,
    onReadNotice: callbacks.onReadNotice,
  });
  createExteriorPoster(group, mats, interactions, {
    id: 'ext-poster-science-main',
    theme: 'science',
    x: 3.5,
    y: 1.68,
    z: -5.82,
    rotY: 0,
    width: 0.68,
    height: 0.92,
    onReadNotice: callbacks.onReadNotice,
  });

  // Main Entrance Double Glass Doors
  doors.push(
    createDoor(group, physics, mats, interactions, {
      id: 'main-entrance-left',
      label: 'Entrée Principale (Gauche)',
      x: -0.75,
      y: floorY,
      z: -6,
      width: 1.45,
      height: 2.55,
      isGlass: true,
      onToggle: callbacks.onDoorToggle,
    }),
    createDoor(group, physics, mats, interactions, {
      id: 'main-entrance-right',
      label: 'Entrée Principale (Droite)',
      x: 0.75,
      y: floorY,
      z: -6,
      rotY: Math.PI,
      width: 1.45,
      height: 2.55,
      isGlass: true,
      onToggle: callbacks.onDoorToggle,
    })
  );

  // Exterior North Wall (Z = -23) with central opening for Gym Connector (X = 0, width 4.0m)
  buildWallWithOpenings(group, physics, mats, {
    x: 0,
    z: -23,
    length: 64,
    height: wallH,
    thickness: 0.3,
    axis: 'x',
    material: mats.brick,
    baseY: floorY,
    openings: [
      { offset: -27.5, width: 3.6, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: -18.5, width: 3.6, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: -9.5, width: 3.6, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 0, width: 4.0, height: 2.8, sillHeight: 0, glazed: false },
      { offset: 9.5, width: 3.6, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 18.5, width: 3.6, height: 1.6, sillHeight: 1.0, glazed: true },
      { offset: 27.5, width: 3.6, height: 1.6, sillHeight: 1.0, glazed: true },
    ],
  });
  addFacadeDetailing(group, mats, {
    x: 0,
    z: -23,
    length: 64,
    height: wallH,
    baseY: floorY,
    facingSign: -1,
    pilasterOffsets: [-23, -14, -5, 5, 14, 23],
    skipPlinthRange: [-2.2, 2.2],
    vents: [
      { offset: -3.5, y: 3.15, scale: 0.9 },
      { offset: 3.5, y: 3.15, scale: 0.9 },
    ],
  });

  // North Corridor Wall (Z = -15.75) separating Main Corridor from North Rooms & Gym Connector
  const northDoors = [-27.5, -18.5, -9.5, -3.5, 3.5, 9.5, 18.5, 27.5];
  buildWallWithOpenings(group, physics, mats, {
    x: 0,
    z: -15.75,
    length: 64,
    height: wallH,
    thickness: 0.2,
    axis: 'x',
    material: mats.plasterWall,
    baseY: floorY,
    openings: [
      ...northDoors.map((dx) => ({ offset: dx, width: 1.4, height: 2.45, sillHeight: 0 })),
      { offset: 0, width: 3.8, height: 2.7, sillHeight: 0 },
    ],
  });

  const northLabels = [
    'Salle 101 — Mathématiques',
    'Salle 102 — Histoire',
    'Salle 103 — Anglais',
    'Toilettes Hommes',
    'Toilettes Femmes',
    'Salle 104 — Informatique',
    'Salle 105 — Arts Plastiques',
    'Salle 106 — Musique',
  ];
  northDoors.forEach((dx, idx) => {
    doors.push(
      createDoor(group, physics, mats, interactions, {
        id: `north-room-${idx}`,
        label: northLabels[idx],
        x: dx,
        y: floorY,
        z: -15.75,
        width: 1.35,
        height: 2.4,
        onToggle: callbacks.onDoorToggle,
      })
    );
  });

  // South Corridor Wall (Z = -12.25) with open arch into Lobby (X = 0, width 10m) & doors to South Classrooms
  const southDoors = [-28, -20, -12, 12, 20, 28];
  buildWallWithOpenings(group, physics, mats, {
    x: 0,
    z: -12.25,
    length: 64,
    height: wallH,
    thickness: 0.2,
    axis: 'x',
    material: mats.plasterWall,
    baseY: floorY,
    openings: [
      ...southDoors.map((dx) => ({ offset: dx, width: 1.4, height: 2.45, sillHeight: 0 })),
      { offset: 0, width: 9.0, height: 3.1, sillHeight: 0 },
    ],
  });

  const southLabels = [
    'Salle 107 — Langues Vivantes',
    'Salle 108 — Sciences Sociales',
    'Salle 109 — Économie',
    'Salle 110 — Littérature',
    'Salle 111 — Philosophie',
    'Salle 112 — Salle d\'Étude',
  ];
  southDoors.forEach((dx, idx) => {
    doors.push(
      createDoor(group, physics, mats, interactions, {
        id: `south-room-${idx}`,
        label: southLabels[idx],
        x: dx,
        y: floorY,
        z: -12.25,
        width: 1.35,
        height: 2.4,
        onToggle: callbacks.onDoorToggle,
      })
    );
  });

  // Partition walls between North rooms (Z: -23..-15.75)
  for (const px of [-23, -14, -5, -2, 2, 5, 14, 23]) {
    buildWallWithOpenings(group, physics, mats, {
      x: px,
      z: -19.375,
      length: 7.25,
      height: wallH,
      thickness: 0.18,
      axis: 'z',
      material: mats.plasterWall,
      baseY: floorY,
    });
  }

  // Partition walls between South rooms & Lobby (Z: -12.25..-6)
  for (const px of [-24, -16, -8, 8, 16, 24]) {
    buildWallWithOpenings(group, physics, mats, {
      x: px,
      z: -9.125,
      length: 6.25,
      height: wallH,
      thickness: 0.18,
      axis: 'z',
      material: mats.plasterWall,
      baseY: floorY,
    });
  }

  // West boundary wall (X = -32) connecting to Admin Office via corridor opening at Z = -14
  buildWallWithOpenings(group, physics, mats, {
    x: -32,
    z: -14.5,
    length: 17,
    height: wallH,
    thickness: 0.24,
    axis: 'z',
    material: mats.brick,
    baseY: floorY,
    openings: [{ offset: 0.5, width: 3.1, height: 2.7, sillHeight: 0 }],
  });

  // East boundary wall (X = +32) connecting to Science Wing via corridor opening at Z = -14
  buildWallWithOpenings(group, physics, mats, {
    x: 32,
    z: -14.5,
    length: 17,
    height: wallH,
    thickness: 0.24,
    axis: 'z',
    material: mats.brick,
    baseY: floorY,
    openings: [{ offset: 0.5, width: 3.1, height: 2.7, sillHeight: 0 }],
  });

  // --- Lobby Details: Reception Desk, Trophy Cases, US Flag, Bulletin Board ---
  const recepCounter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.9), mats.woodDark);
  recepCounter.position.set(-2.8, floorY + 0.525, -8.3);
  recepCounter.castShadow = true;
  recepCounter.receiveShadow = true;
  group.add(recepCounter);
  physics.addStaticBox(-2.8, floorY + 0.525, -8.3, 1.6, 0.525, 0.45);

  // Glass trophy display cases along East Lobby wall
  for (const tz of [-10.2, -8.2]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.6), mats.navy);
    base.position.set(7.4, floorY + 0.35, tz);
    const vitrine = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.3, 1.55), mats.tintedGlass);
    vitrine.position.set(7.4, floorY + 1.35, tz);
    const trophy = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.32, 10), mats.gold);
    trophy.position.set(7.4, floorY + 1.05, tz);
    group.add(base, vitrine, trophy);
    physics.addStaticBox(7.4, floorY + 1.0, tz, 0.3, 1.0, 0.8);
  }

  // US Flag & Maplewood Banner in Lobby
  const flagMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.9),
    new THREE.MeshStandardMaterial({ map: createUSFlagTexture(), side: THREE.DoubleSide, roughness: 0.7 })
  );
  flagMesh.position.set(-7.75, floorY + 2.3, -9.2);
  flagMesh.rotation.y = Math.PI / 2;
  group.add(flagMesh);

  // Bulletin board in Lobby
  const boardTex = createSignTexture('INFOS DU LYCÉE', 'CLUBS · SPORT · EXAMENS', '#F4EFE6', '#1F3864');
  const bulletin = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.2, 2.2),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 })
  );
  bulletin.position.set(-7.82, floorY + 1.85, -11.0);
  group.add(bulletin);

  // --- Corridor Lockers (InstancedMesh) ---
  const lockers: LockerTransform[] = [];
  let lockerNum = 101;
  for (let x = -30.5; x <= 30.5; x += 0.46) {
    // Skip doorway gaps on North wall
    const nearNorthDoor =
      northDoors.some((d) => Math.abs(x - d) < 1.1) || Math.abs(x) < 2.4;
    if (!nearNorthDoor) {
      lockers.push({
        x,
        y: floorY,
        z: -15.42,
        rotY: 0,
        interactiveLabel: lockerNum % 14 === 0 ? `Casier #${lockerNum}` : undefined,
      });
      lockerNum++;
    }
    // Skip doorway gaps on South wall & Lobby opening
    const nearSouthDoor =
      southDoors.some((d) => Math.abs(x - d) < 1.1) || Math.abs(x) < 5.0;
    if (!nearSouthDoor) {
      lockers.push({
        x,
        y: floorY,
        z: -12.58,
        rotY: Math.PI,
        interactiveLabel: lockerNum % 17 === 0 ? `Casier #${lockerNum}` : undefined,
      });
      lockerNum++;
    }
  }
  buildLockerBank(group, physics, mats, interactions, lockers, callbacks.onInspectLocker);

  // --- Corridor Details: Clocks, EXIT signs, Fire Extinguishers, Light Switch, Fire Alarm, Fluorescent Strips ---
  const corridorLights: THREE.PointLight[] = [];
  for (const lx of [-24, -8, 8, 24]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.35), mats.neonCeiling);
    strip.position.set(lx, floorY + wallH - 0.12, -14);
    group.add(strip);

    const pt = new THREE.PointLight(0xfff1d6, 2.2, 18, 1.5);
    pt.position.set(lx, floorY + wallH - 0.5, -14);
    group.add(pt);
    corridorLights.push(pt);
  }
  ctx.wingLights['main'] = corridorLights;

  const lobbyClock = createWallClock(mats, 0, floorY + 2.9, -12.08, 0);
  group.add(lobbyClock.group);
  clocks.push(lobbyClock.clockRef);

  group.add(
    createExitSign(mats, 0, floorY + 3.05, -6.2, Math.PI),
    createExitSign(mats, -31.7, floorY + 3.05, -14, Math.PI / 2),
    createExitSign(mats, 31.7, floorY + 3.05, -14, -Math.PI / 2),
    createFireExtinguisher(mats, -6.2, floorY + 0.95, -12.4, Math.PI),
    createFireExtinguisher(mats, 6.2, floorY + 0.95, -15.6, 0)
  );

  // Interactive Light Switch & Fire Alarm in Corridor
  const switchBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.06), mats.chrome);
  switchBox.position.set(-4.8, floorY + 1.35, -12.38);
  group.add(switchBox);
  interactions.register({
    id: 'switch-main',
    label: 'actionner l\'interrupteur du couloir',
    type: 'switch',
    targetObject: switchBox,
    worldPosition: new THREE.Vector3(-4.8, floorY + 1.35, -12.38),
    onInteract: () => callbacks.onToggleLights('main'),
  });

  const alarmBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.08), mats.exitSign);
  alarmBox.position.set(4.8, floorY + 1.4, -12.38);
  group.add(alarmBox);
  interactions.register({
    id: 'fire-alarm-main',
    label: 'inspecter l\'alarme incendie',
    type: 'fire_alarm',
    targetObject: alarmBox,
    worldPosition: new THREE.Vector3(4.8, floorY + 1.4, -12.38),
    onInteract: callbacks.onPullFireAlarm,
  });

  // --- Populate Classrooms (Desks, Chairs, Teacher Desks, Whiteboards, Clocks) ---
  const studentDesks: DeskTransform[] = [];
  const studentChairs: ChairTransform[] = [];

  const northClassrooms = [
    { x: -27.5, name: 'Mathématiques' },
    { x: -18.5, name: 'Histoire' },
    { x: -9.5, name: 'Anglais' },
    { x: 18.5, name: 'Arts Plastiques' },
    { x: 27.5, name: 'Musique' },
  ];

  northClassrooms.forEach((cls, idx) => {
    const boardOnWest = cls.x > 25;
    const boardX = boardOnWest ? cls.x - 4.38 : cls.x + 4.38;
    const boardRotY = boardOnWest ? Math.PI / 2 : -Math.PI / 2;
    const teacherX = boardOnWest ? cls.x - 2.75 : cls.x + 2.75;
    const deskRotY = boardOnWest ? -Math.PI / 2 : Math.PI / 2;
    const chairDx = boardOnWest ? 0.48 : -0.48;

    createWhiteboard(group, mats, interactions, {
      id: `n-cls-${idx}`,
      subject: cls.name,
      x: boardX,
      y: floorY + 1.65,
      z: -19.375,
      rotY: boardRotY,
      onInspect: callbacks.onInspectWhiteboard,
    });
    createTeacherDesk(group, physics, mats, teacherX, floorY, -17.3, -boardRotY);
    const c = createWallClock(mats, boardX, floorY + 2.8, -17.0, boardRotY);
    group.add(c.group);
    clocks.push(c.clockRef);

    // Flush ceiling fluorescent light panel inside each north classroom
    const troffer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.035, 0.55), mats.neonCeiling);
    troffer.position.set(cls.x, floorY + wallH - 0.03, -19.375);
    group.add(troffer);

    if (cls.name === 'Musique') {
      // Stage riser + Upright Piano placed cleanly along East wall away from North window
      const stage = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 5.8), mats.woodDark);
      stage.position.set(cls.x + 2.9, floorY + 0.125, -19.4);
      const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.25, 1.5), mats.woodDark);
      pianoBody.position.set(cls.x + 3.0, floorY + 0.875, -19.4);
      const keys = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 1.3), mats.whiteboard);
      keys.position.set(cls.x + 2.62, floorY + 0.98, -19.4);
      group.add(stage, pianoBody, keys);
      physics.addStaticBox(cls.x + 3.0, floorY + 0.875, -19.4, 0.35, 0.625, 0.75);
    } else {
      // 3 columns x 4 rows facing the whiteboard partition, keeping center Z = -19.375 aisle open
      const rowZs = [-21.6, -20.4, -18.35, -17.15];
      for (const dz of rowZs) {
        for (let col = 0; col < 3; col++) {
          const dx = cls.x - 2.6 + col * 1.65;
          studentDesks.push({ x: dx, y: floorY, z: dz, rotY: deskRotY });
          studentChairs.push({ x: dx + chairDx, y: floorY, z: dz, rotY: deskRotY });
        }
      }
    }
  });

  // Computer Lab (Room 104: X = +9.5, Z = -19.375) with interactive PCs & server rack
  createWhiteboard(group, mats, interactions, {
    id: 'comp-lab',
    subject: 'Informatique & Réseaux',
    x: 13.88,
    y: floorY + 1.65,
    z: -19.375,
    rotY: -Math.PI / 2,
    onInspect: callbacks.onInspectWhiteboard,
  });
  const labTroffer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.035, 0.55), mats.neonCeiling);
  labTroffer.position.set(9.5, floorY + wallH - 0.03, -19.375);
  group.add(labTroffer);

  const serverRack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.8), mats.concreteDark);
  serverRack.position.set(13.1, floorY + 1.0, -22.1);
  group.add(serverRack);
  physics.addStaticBox(13.1, floorY + 1.0, -22.1, 0.45, 1.0, 0.4);

  for (const dz of [-21.4, -20.25, -18.4, -17.2]) {
    for (let col = 0; col < 3; col++) {
      const dx = 6.9 + col * 1.65;
      studentDesks.push({ x: dx, y: floorY, z: dz, rotY: Math.PI / 2 });
      studentChairs.push({ x: dx - 0.48, y: floorY, z: dz, rotY: Math.PI / 2 });

      const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.46), mats.concreteDark);
      monitor.position.set(dx + 0.14, floorY + 0.96, dz);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.42), mats.navy);
      screen.position.set(dx + 0.135, floorY + 0.96, dz);
      group.add(monitor, screen);

      if (dz === -20.25 && col === 1) {
        interactions.register({
          id: 'pc-lab-104',
          label: 'utiliser un ordinateur (Salle 104)',
          type: 'computer',
          targetObject: monitor,
          worldPosition: new THREE.Vector3(dx, floorY + 1.0, dz),
          onInteract: () => callbacks.onUseComputer('Salle Informatique 104'),
        });
      }
    }
  }

  // South Classrooms (X: -28, -20, -12, 12, 20, 28)
  const southClassrooms = [
    { x: -28, name: 'Langues Vivantes' },
    { x: -20, name: 'Sciences Sociales' },
    { x: -12, name: 'Économie' },
    { x: 12, name: 'Littérature' },
    { x: 20, name: 'Philosophie' },
    { x: 28, name: 'Salle d\'Étude' },
  ];

  southClassrooms.forEach((cls, idx) => {
    const boardOnWest = cls.x > 25;
    const boardX = boardOnWest ? cls.x - 3.88 : cls.x + 3.88;
    const boardRotY = boardOnWest ? Math.PI / 2 : -Math.PI / 2;
    const teacherX = boardOnWest ? cls.x - 2.45 : cls.x + 2.45;
    const deskRotY = boardOnWest ? -Math.PI / 2 : Math.PI / 2;
    const chairDx = boardOnWest ? 0.46 : -0.46;

    createWhiteboard(group, mats, interactions, {
      id: `s-cls-${idx}`,
      subject: cls.name,
      x: boardX,
      y: floorY + 1.65,
      z: -9.125,
      rotY: boardRotY,
      onInspect: callbacks.onInspectWhiteboard,
    });
    const sTroffer = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.035, 0.55), mats.neonCeiling);
    sTroffer.position.set(cls.x, floorY + wallH - 0.03, -9.125);
    group.add(sTroffer);

    createTeacherDesk(group, physics, mats, teacherX, floorY, -7.4, -boardRotY);
    for (const dz of [-10.55, -7.75]) {
      for (let col = 0; col < 3; col++) {
        const dx = boardOnWest ? cls.x + 2.3 - col * 1.5 : cls.x - 2.3 + col * 1.5;
        studentDesks.push({ x: dx, y: floorY, z: dz, rotY: deskRotY });
        studentChairs.push({ x: dx + chairDx, y: floorY, z: dz, rotY: deskRotY });
      }
    }
  });

  buildInstancedDesks(group, physics, mats, studentDesks);
  buildInstancedChairs(group, mats, studentChairs);

  // Restroom Sinks (Men X = -3.5, Women X = +3.5)
  for (const rx of [-3.5, 3.5]) {
    const vanity = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.55), mats.concrete);
    vanity.position.set(rx, floorY + 0.425, -22.5);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.04), mats.chrome);
    mirror.position.set(rx, floorY + 1.45, -22.75);
    group.add(vanity, mirror);
    physics.addStaticBox(rx, floorY + 0.425, -22.5, 1.1, 0.425, 0.28);

    interactions.register({
      id: `sink-${rx > 0 ? 'f' : 'm'}`,
      label: 'utiliser le lavabo',
      type: 'sink',
      targetObject: vanity,
      worldPosition: new THREE.Vector3(rx, floorY + 0.9, -22.5),
      onInteract: callbacks.onUseSink,
    });
  }

  // Register solid wall meshes for camera spring-arm collision
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== floor) {
      ctx.cameraColliders.push(obj);
    }
  });

  ctx.scene.add(group);
  return group;
}
