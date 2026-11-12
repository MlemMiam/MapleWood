import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSignTexture, createUSFlagTexture } from '../../utils/Materials';
import type { WorldBuildContext } from '../WorldContext';
import { createBench } from '../props/Bench';

export function buildCourtyard(ctx: WorldBuildContext): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Courtyard';

  const { physics, mats, interactions, animatedObjects, callbacks } = ctx;

  // Extended Campus Terrain Ground (340m x 340m at Y = 0)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), mats.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  group.add(ground);
  physics.addStaticBox(0, -0.25, 0, 170, 0.25, 170);

  // Main Courtyard Concrete Walkways (Y = 0.025) + Limestone Edging Curbs + Plaza Compass Ring
  const northSouthWalk = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.04, 38), mats.concrete);
  northSouthWalk.position.set(0, 0.02, 12);
  northSouthWalk.receiveShadow = true;

  const eastWestWalk = new THREE.Mesh(new THREE.BoxGeometry(44, 0.04, 4.5), mats.concrete);
  eastWestWalk.position.set(0, 0.02, 14);
  eastWestWalk.receiveShadow = true;

  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.05, 36), mats.concrete);
  plaza.position.set(0, 0.025, 15.5);
  plaza.receiveShadow = true;

  const plazaRingMat = mats.navy.clone();
  plazaRingMat.polygonOffset = true;
  plazaRingMat.polygonOffsetFactor = -1;
  plazaRingMat.polygonOffsetUnits = -1;
  const plazaRing = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.55, 40), plazaRingMat);
  plazaRing.rotation.x = -Math.PI / 2;
  plazaRing.position.set(0, 0.053, 15.5);

  // Limestone walkway curbs (split cleanly around central plaza & pergola patio entrances)
  for (const side of [-1, 1]) {
    const northCurb = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.11, 15.2, 2, 0.03), mats.limestone);
    northCurb.position.set(side * 3.08, 0.055, 2.2);
    const southCurb = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.11, 3.8, 2, 0.03), mats.limestone);
    southCurb.position.set(side * 3.08, 0.055, 23.0);

    // North edge of east-west walk split at X = ±7.3..±10.3 for step-free pergola rest alcoves
    const ewNorthInner = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.11, 0.18, 2, 0.03), mats.limestone);
    ewNorthInner.position.set(side * 6.55, 0.055, 14 - 2.34);
    const ewNorthOuter = new THREE.Mesh(new RoundedBoxGeometry(11.7, 0.11, 0.18, 2, 0.03), mats.limestone);
    ewNorthOuter.position.set(side * 16.15, 0.055, 14 - 2.34);

    // South edge of east-west walk stays continuous
    const ewSouth = new THREE.Mesh(new RoundedBoxGeometry(16.2, 0.11, 0.18, 2, 0.03), mats.limestone);
    ewSouth.position.set(side * 13.9, 0.055, 14 + 2.34);
    group.add(northCurb, southCurb, ewNorthInner, ewNorthOuter, ewSouth);
  }
  group.add(northSouthWalk, eastWestWalk, plaza, plazaRing);

  // Covered South Walkway (Couloir couvert: X = -22..+22, Z = 25..28.5) with LatheGeometry columns
  const southWalkFloor = new THREE.Mesh(new THREE.BoxGeometry(44, 0.06, 3.6), mats.concrete);
  southWalkFloor.position.set(0, 0.03, 26.8);
  southWalkFloor.receiveShadow = true;
  const southCanopyShadow = new THREE.Mesh(new THREE.PlaneGeometry(43.4, 3.35), mats.shadowPergola);
  southCanopyShadow.rotation.x = -Math.PI / 2;
  southCanopyShadow.position.set(0, 0.064, 26.95);
  southCanopyShadow.renderOrder = 1;
  const southCanopy = new THREE.Mesh(new RoundedBoxGeometry(44.4, 0.24, 4.1, 2, 0.04), mats.roof);
  southCanopy.position.set(0, 3.6, 26.8);
  southCanopy.castShadow = true;
  const southFascia = new THREE.Mesh(new RoundedBoxGeometry(44.6, 0.14, 4.24, 2, 0.03), mats.limestone);
  southFascia.position.set(0, 3.74, 26.8);
  group.add(southWalkFloor, southCanopyShadow, southCanopy, southFascia);

  const walkwayColGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.24, 0.0),
      new THREE.Vector2(0.24, 0.14),
      new THREE.Vector2(0.17, 0.24),
      new THREE.Vector2(0.13, 3.25),
      new THREE.Vector2(0.19, 3.38),
      new THREE.Vector2(0.22, 3.5),
      new THREE.Vector2(0.0, 3.5),
    ],
    14
  );

  for (let px = -20; px <= 20; px += 8) {
    if (Math.abs(px) < 3) continue; // Keep central entrance archway wide open!
    const colA = new THREE.Mesh(walkwayColGeo, mats.navy);
    colA.position.set(px, 0, 25.2);
    const colB = new THREE.Mesh(walkwayColGeo, mats.navy);
    colB.position.set(px, 0, 28.4);
    colA.castShadow = true;
    colB.castShadow = true;
    group.add(colA, colB);
    physics.addStaticBox(px, 1.75, 25.2, 0.18, 1.75, 0.18);
    physics.addStaticBox(px, 1.75, 28.4, 0.18, 1.75, 0.18);
  }

  // Breezeway Canopies connecting Main/Admin -> Cafeteria and Main/Science -> Library
  for (const bx of [-36, 36]) {
    const bwWalk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 10), mats.concrete);
    bwWalk.position.set(bx, 0.025, -1);
    const bwRoof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 10.2), mats.roof);
    bwRoof.position.set(bx, 3.6, -1);
    bwRoof.castShadow = true;
    group.add(bwWalk, bwRoof);

    for (const bz of [-4, 1.5]) {
      for (const side of [-1.8, 1.8]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.5, 8), mats.navy);
        post.position.set(bx + side, 1.75, bz);
        group.add(post);
      }
    }
  }

  // Central Profiled Stone Fountain (X = 0, Z = 15.5) — LatheGeometry basin + TubeGeometry water arcs
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0, 15.5);

  const basinProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(2.85, 0.0),
    new THREE.Vector2(2.85, 0.14),
    new THREE.Vector2(2.65, 0.22),
    new THREE.Vector2(2.62, 0.56),
    new THREE.Vector2(2.74, 0.64),
    new THREE.Vector2(2.74, 0.72),
    new THREE.Vector2(2.38, 0.72),
    new THREE.Vector2(2.34, 0.34),
    new THREE.Vector2(0.65, 0.34),
    new THREE.Vector2(0.55, 0.52),
    new THREE.Vector2(0.42, 0.95),
    new THREE.Vector2(0.35, 1.48),
    new THREE.Vector2(0.98, 1.66),
    new THREE.Vector2(1.04, 1.76),
    new THREE.Vector2(0.84, 1.76),
    new THREE.Vector2(0.24, 1.6),
    new THREE.Vector2(0.0, 1.6),
  ];
  const fountainStone = new THREE.Mesh(new THREE.LatheGeometry(basinProfile, 32), mats.concrete);
  fountainStone.castShadow = true;
  fountainStone.receiveShadow = true;

  const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.34, 2.34, 0.06, 28), mats.water);
  waterDisc.position.y = 0.58;
  const topWaterDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.05, 20), mats.water);
  topWaterDisc.position.y = 1.69;

  const spoutProfile = [
    new THREE.Vector2(0.0, 1.62),
    new THREE.Vector2(0.18, 1.62),
    new THREE.Vector2(0.12, 1.95),
    new THREE.Vector2(0.16, 2.04),
    new THREE.Vector2(0.07, 2.18),
    new THREE.Vector2(0.0, 2.22),
  ];
  const spout = new THREE.Mesh(new THREE.LatheGeometry(spoutProfile, 16), mats.gold);

  // 4 curved water jet arcs from upper finial into lower basin
  const waterJets: THREE.Mesh[] = [];
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 2 + Math.PI / 4;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.1, 2.18, sinA * 0.1),
      new THREE.Vector3(cosA * 0.75, 2.32, sinA * 0.75),
      new THREE.Vector3(cosA * 1.45, 1.55, sinA * 1.45),
      new THREE.Vector3(cosA * 1.85, 0.62, sinA * 1.85),
    ]);
    const jetMesh = new THREE.Mesh(new THREE.TubeGeometry(jetCurve, 14, 0.024, 6, false), mats.water);
    fountainGroup.add(jetMesh);
    waterJets.push(jetMesh);
  }
  // Secondary smaller jets around the central spout
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.15, 1.7, sinA * 0.15),
      new THREE.Vector3(cosA * 0.5, 1.95, sinA * 0.5),
      new THREE.Vector3(cosA * 0.9, 1.4, sinA * 0.9),
      new THREE.Vector3(cosA * 1.2, 0.62, sinA * 1.2),
    ]);
    const jetMesh = new THREE.Mesh(new THREE.TubeGeometry(jetCurve, 10, 0.016, 5, false), mats.water);
    fountainGroup.add(jetMesh);
    waterJets.push(jetMesh);
  }
  // Basin rim molding detail
  const rimMolding = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.06, 8, 40), mats.concreteDark);
  rimMolding.rotation.x = Math.PI / 2;
  rimMolding.position.y = 0.72;
  fountainGroup.add(rimMolding);

  fountainGroup.add(fountainStone, waterDisc, topWaterDisc, spout);
  group.add(fountainGroup);
  physics.addStaticBox(0, 0.45, 15.5, 2.75, 0.45, 2.75);

  interactions.register({
    id: 'courtyard-fountain',
    label: 'se rafraîchir à la fontaine',
    type: 'fountain',
    targetObject: fountainGroup,
    worldPosition: new THREE.Vector3(0, 1.0, 15.5),
    maxDistance: 3.8,
    onInteract: callbacks.onUseFountain,
  });

  animatedObjects.push((elapsed) => {
    waterDisc.position.y = 0.58 + Math.sin(elapsed * 2.5) * 0.015;
    waterJets.forEach((jet, idx) => {
      jet.scale.y = 0.97 + Math.sin(elapsed * 6 + idx * 1.4) * 0.03;
    });
  });

  // Maplewood Eagle Mascot Statue (X = -5.5, Z = 1.5) — beveled ExtrudeGeometry wings & tail
  const statueGroup = new THREE.Group();
  statueGroup.position.set(-5.5, 0, 1.5);
  const plinthBase = new THREE.Mesh(
    new RoundedBoxGeometry(1.92, 0.26, 1.92, 2, 0.04),
    mats.concreteDark
  );
  plinthBase.position.y = 0.13;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.0, 1.55), mats.concrete);
  plinth.position.y = 0.72;
  plinth.castShadow = true;
  const plinthCap = new THREE.Mesh(
    new RoundedBoxGeometry(1.74, 0.16, 1.74, 2, 0.03),
    mats.navy
  );
  plinthCap.position.y = 1.28;

  const plaqueTex = createSignTexture('LES AIGLES', 'MAPLEWOOD · EST. 1994', '#1F3864', '#D4AF37');
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.35, metalness: 0.3 });
  const plaqueFront = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.06), plaqueMat);
  plaqueFront.position.set(0, 0.75, 0.78);
  const plaqueBack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.06), plaqueMat);
  plaqueBack.position.set(0, 0.75, -0.78);
  plaqueBack.rotation.y = Math.PI;

  const perchRock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), mats.concreteDark);
  perchRock.position.set(0, 1.48, 0);
  perchRock.scale.set(1.28, 0.58, 1.08);

  // Sculpted LatheGeometry avian torso & curved neck transitioning into head
  const eagleBodyProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18, 0.04),
    new THREE.Vector2(0.28, 0.22),
    new THREE.Vector2(0.31, 0.42),
    new THREE.Vector2(0.26, 0.62),
    new THREE.Vector2(0.15, 0.78),
    new THREE.Vector2(0.13, 0.88),
    new THREE.Vector2(0.0, 0.9),
  ];
  const eagleTorso = new THREE.Mesh(new THREE.LatheGeometry(eagleBodyProfile, 18), mats.gold);
  eagleTorso.position.set(0, 1.56, -0.02);
  eagleTorso.rotation.x = 0.22;
  eagleTorso.castShadow = true;

  const eagleHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), mats.gold);
  eagleHead.scale.set(0.95, 1.02, 1.1);
  eagleHead.position.set(0, 2.4, 0.15);
  const eagleBrow = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.055, 0.16, 2, 0.02),
    mats.gold
  );
  eagleBrow.position.set(0, 2.48, 0.22);
  eagleBrow.rotation.x = 0.2;

  const eagleEyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.4 });
  for (const ex of [-0.125, 0.125]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eagleEyeMat);
    eye.position.set(ex, 2.43, 0.24);
    statueGroup.add(eye);
  }

  // Hooked eagle beak via curved TubeGeometry
  const beakCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.39, 0.3),
    new THREE.Vector3(0, 2.37, 0.43),
    new THREE.Vector3(0, 2.29, 0.48),
  ]);
  const eagleBeak = new THREE.Mesh(new THREE.TubeGeometry(beakCurve, 10, 0.042, 8, false), mats.terracotta);
  const beakTip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 8), mats.terracotta);
  beakTip.position.set(0, 2.26, 0.48);
  beakTip.rotation.x = Math.PI - 0.15;
  statueGroup.add(beakTip);

  // Sculpted beveled tail fan via ExtrudeGeometry
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.1, 0);
  tailShape.lineTo(-0.34, -0.52);
  tailShape.lineTo(-0.12, -0.48);
  tailShape.lineTo(0, -0.58);
  tailShape.lineTo(0.12, -0.48);
  tailShape.lineTo(0.34, -0.52);
  tailShape.lineTo(0.1, 0);
  tailShape.closePath();
  const tailMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tailShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    }),
    mats.gold
  );
  tailMesh.position.set(0, 1.72, -0.18);
  tailMesh.rotation.x = 0.48;
  statueGroup.add(tailMesh);

  // Sculpted notched feather wings via ExtrudeGeometry
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.16);
  wingShape.quadraticCurveTo(0.55, 0.32, 1.18, 0.14);
  wingShape.lineTo(1.02, 0.02);
  wingShape.lineTo(1.1, -0.06);
  wingShape.lineTo(0.84, -0.14);
  wingShape.lineTo(0.9, -0.2);
  wingShape.quadraticCurveTo(0.45, -0.26, 0, -0.18);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  wingGeo.translate(0, 0, -0.03);

  for (const side of [-1, 1]) {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(side * 0.2, 2.08, -0.04);
    wingPivot.rotation.set(0.22, side * 0.2, side * 0.38);

    const wingMesh = new THREE.Mesh(wingGeo, mats.gold);
    if (side === -1) {
      wingMesh.rotation.y = Math.PI;
    }
    wingMesh.castShadow = true;
    wingPivot.add(wingMesh);

    const talon = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.24, 8), mats.gold);
    talon.position.set(side * 0.14, 1.66, 0.1);

    statueGroup.add(wingPivot, talon);
  }

  statueGroup.add(
    plinthBase,
    plinth,
    plinthCap,
    plaqueFront,
    plaqueBack,
    perchRock,
    eagleTorso,
    eagleHead,
    eagleBrow,
    eagleBeak
  );
  group.add(statueGroup);
  physics.addStaticBox(-5.5, 1.0, 1.5, 0.85, 1.0, 0.85);

  // US Flagpole (X = +5.5, Z = 1.5)
  const poleGroup = new THREE.Group();
  poleGroup.position.set(5.5, 0, 1.5);
  const poleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.5, 12), mats.concrete);
  poleBase.position.y = 0.25;
  const poleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 10.5, 12), mats.chrome);
  poleShaft.position.y = 5.25;
  poleShaft.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), mats.gold);
  finial.position.y = 10.58;
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 1.2, 8, 4),
    new THREE.MeshStandardMaterial({
      map: createUSFlagTexture(),
      side: THREE.DoubleSide,
      roughness: 0.72,
    })
  );
  flag.position.set(1.08, 9.6, 0);
  poleGroup.add(poleBase, poleShaft, finial, flag);
  group.add(poleGroup);
  physics.addStaticBox(5.5, 1.0, 1.5, 0.45, 1.0, 0.45);

  animatedObjects.push((elapsed) => {
    flag.rotation.y = Math.sin(elapsed * 2.1) * 0.14;
  });

  // Repositioned Courtyard Plaza Benches (flush on circular plaza facing fountain, R ≈ 4.98m)
  createBench(group, physics, mats, -3.78, 0.05, 18.75, Math.atan2(3.78, -3.25));
  createBench(group, physics, mats, 3.78, 0.05, 18.75, Math.atan2(-3.78, -3.25));

  // Sheltered Benches inside the Covered South Walkway Bays (facing North into courtyard)
  createBench(group, physics, mats, -8.0, 0.06, 27.85, Math.PI);
  createBench(group, physics, mats, 8.0, 0.06, 27.85, Math.PI);

  // Two Architectural Wood & Metal Shade Pergola Alcoves along East-West Promenade
  const postCollarGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.14, 12);
  const pergolaPostGeo = new THREE.CylinderGeometry(0.065, 0.075, 3.05, 12);
  const sideBeamGeo = new RoundedBoxGeometry(0.14, 0.18, 3.1, 2, 0.02);
  const crossHeaderGeo = new RoundedBoxGeometry(5.1, 0.14, 0.14, 2, 0.02);
  const rafterGeo = new RoundedBoxGeometry(0.11, 0.14, 3.3, 2, 0.02);

  for (const px of [-8.8, 8.8]) {
    const pz = 9.85;
    const pergolaGroup = new THREE.Group();
    pergolaGroup.position.set(px, 0, pz);

    // Stone patio slab + walkway entrance apron + perimeter limestone border
    const patio = new THREE.Mesh(new RoundedBoxGeometry(5.0, 0.05, 3.2, 2, 0.02), mats.concrete);
    patio.position.set(0, 0.015, 0);
    patio.receiveShadow = true;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.045, 0.55), mats.concrete);
    apron.position.set(0, 0.0175, 1.72);
    apron.receiveShadow = true;

    const rimNorth = new THREE.Mesh(new RoundedBoxGeometry(5.16, 0.08, 0.14, 2, 0.02), mats.limestone);
    rimNorth.position.set(0, 0.04, -1.6);
    const rimWest = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.08, 3.2, 2, 0.02), mats.limestone);
    rimWest.position.set(-2.51, 0.04, 0);
    const rimEast = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.08, 3.2, 2, 0.02), mats.limestone);
    rimEast.position.set(2.51, 0.04, 0);

    // Projected slatted pergola shadow zone on patio + soft SW grass overhang shade
    const patioShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.86, 3.08), mats.shadowPergola);
    patioShadow.rotation.x = -Math.PI / 2;
    patioShadow.position.set(-0.04, 0.044, 0.06);
    patioShadow.renderOrder = 1;

    const swGrassShade = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.5), mats.shadowCanopy);
    swGrassShade.rotation.x = -Math.PI / 2;
    swGrassShade.position.set(-2.85, 0.014, 0.55);
    swGrassShade.renderOrder = 1;

    pergolaGroup.add(patio, apron, rimNorth, rimWest, rimEast, patioShadow, swGrassShade);

    // 4 Wrought-iron columns with limestone collars
    for (const cx of [-2.25, 2.25]) {
      for (const cz of [-1.25, 1.25]) {
        const collar = new THREE.Mesh(postCollarGeo, mats.limestone);
        collar.position.set(cx, 0.11, cz);
        const post = new THREE.Mesh(pergolaPostGeo, mats.wroughtIron);
        post.position.set(cx, 1.565, cz);
        post.castShadow = true;
        post.receiveShadow = true;
        pergolaGroup.add(collar, post);
        physics.addStaticBox(px + cx, 1.5, pz + cz, 0.11, 1.5, 0.11);
      }

      const sideBeam = new THREE.Mesh(sideBeamGeo, mats.wroughtIron);
      sideBeam.position.set(cx, 3.04, 0);
      sideBeam.castShadow = true;
      pergolaGroup.add(sideBeam);
    }

    for (const hz of [-1.25, 1.25]) {
      const header = new THREE.Mesh(crossHeaderGeo, mats.woodDark);
      header.position.set(0, 3.12, hz);
      header.castShadow = true;
      pergolaGroup.add(header);
    }

    // 11 Hardwood shade rafters casting rhythmic slatted shadows
    for (let r = -5; r <= 5; r++) {
      const rafter = new THREE.Mesh(rafterGeo, mats.woodDesk);
      rafter.position.set(r * 0.44, 3.24, 0);
      rafter.castShadow = true;
      rafter.receiveShadow = true;
      pergolaGroup.add(rafter);
    }

    group.add(pergolaGroup);

    // Two paired wood & metal benches sheltered under each pergola facing South
    createBench(group, physics, mats, px - 1.15, 0.04, pz - 0.32, 0);
    createBench(group, physics, mats, px + 1.15, 0.04, pz - 0.32, 0);
  }

  // Four Under-Oak Shaded Bench Rest Pads tucked beneath outer Courtyard Oak Canopies
  const oakBenchSpots: Array<{ x: number; z: number; targetX: number; targetZ: number }> = [
    { x: -14.25, z: 4.15, targetX: 0, targetZ: 15.5 },
    { x: 14.25, z: 4.15, targetX: 0, targetZ: 15.5 },
    { x: -15.25, z: 22.15, targetX: 0, targetZ: 15.5 },
    { x: 15.25, z: 22.15, targetX: 0, targetZ: 15.5 },
  ];
  const oakPadGeo = new RoundedBoxGeometry(2.65, 0.04, 1.48, 2, 0.015);
  const oakPadRimGeo = new RoundedBoxGeometry(2.82, 0.032, 1.65, 2, 0.02);

  for (const spot of oakBenchSpots) {
    const yaw = Math.atan2(spot.targetX - spot.x, spot.targetZ - spot.z);
    const padGroup = new THREE.Group();
    padGroup.position.set(spot.x, 0, spot.z);
    padGroup.rotation.y = yaw;

    const rim = new THREE.Mesh(oakPadRimGeo, mats.limestone);
    rim.position.y = 0.016;
    rim.receiveShadow = true;
    const pad = new THREE.Mesh(oakPadGeo, mats.concrete);
    pad.position.y = 0.02;
    pad.receiveShadow = true;
    const padShade = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 1.38), mats.shadowCanopy);
    padShade.rotation.x = -Math.PI / 2;
    padShade.position.y = 0.043;
    padShade.renderOrder = 1;

    padGroup.add(rim, pad, padShade);
    group.add(padGroup);

    createBench(group, physics, mats, spot.x, 0.04, spot.z, yaw);
  }

  // Additional benches along the east-west promenade and beneath courtyard trees
  const extraBenchSpots: Array<{ x: number; z: number; rotY: number }> = [
    { x: -18, z: 14, rotY: 0 },
    { x: 18, z: 14, rotY: 0 },
    { x: -12, z: 6, rotY: Math.PI / 2 },
    { x: 12, z: 6, rotY: -Math.PI / 2 },
    { x: -12, z: 22, rotY: Math.PI / 2 },
    { x: 12, z: 22, rotY: -Math.PI / 2 },
    { x: 0, z: 8, rotY: 0 },
    { x: 0, z: 20, rotY: Math.PI },
  ];
  extraBenchSpots.forEach((b) => {
    createBench(group, physics, mats, b.x, 0.05, b.z, b.rotY);
  });

  // Courtyard & Campus Perimeter Oak Trees (LatheGeometry root-flared trunk + branches + multi-lobe crown)
  // Reorganized tree placement: aligned along main walkways, grouped at corners,
  // and framing the campus perimeter for a more natural, readable layout.
  const treePositions: Array<[number, number, number]> = [
    // Courtyard: flanking the north-south promenade (pairs)
    [-4.5, 0, 2],
    [4.5, 0, 2],
    [-4.5, 0, 10],
    [4.5, 0, 10],
    [-4.5, 0, 18],
    [4.5, 0, 18],
    // Courtyard: east/west lawn clusters
    [-14, 0, 6],
    [-14, 0, 14],
    [-14, 0, 22],
    [14, 0, 6],
    [14, 0, 14],
    [14, 0, 22],
    // Campus perimeter framing
    [-58, 0, 24],
    [-64, 0, 32],
    [58, 0, 26],
    [66, 0, 32],
    [-56, 0, -42],
    [56, 0, -42],
    [-64, 0, -76],
    [64, 0, -76],
    [-64, 0, -110],
    [64, 0, -110],
    [-40, 0, -148],
    [0, 0, -150],
    [40, 0, -148],
    [-85, 0, -60],
    [88, 0, -60],
    [-86, 0, 22],
    [88, 0, 24],
  ];

  const ensureNonIndexed = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

  const trunkBaseGeo = ensureNonIndexed(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.62, 0.0),
        new THREE.Vector2(0.42, 0.45),
        new THREE.Vector2(0.32, 1.4),
        new THREE.Vector2(0.25, 2.65),
        new THREE.Vector2(0.18, 3.25),
        new THREE.Vector2(0.0, 3.32),
      ],
      12
    )
  );

  // Curved organic boughs via TubeGeometry along CatmullRomCurve3
  const makeBranchGeo = (pts: THREE.Vector3[], radius: number) =>
    ensureNonIndexed(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, radius, 8, false));

  // More detailed branching: 5 primary boughs + secondary twigs
  const branchA = makeBranchGeo(
    [new THREE.Vector3(0, 2.55, 0), new THREE.Vector3(-0.45, 3.15, 0.22), new THREE.Vector3(-1.05, 3.75, 0.42)],
    0.13
  );
  const branchB = makeBranchGeo(
    [new THREE.Vector3(0, 2.65, 0), new THREE.Vector3(0.48, 3.2, -0.18), new THREE.Vector3(1.02, 3.85, -0.35)],
    0.12
  );
  const branchC = makeBranchGeo(
    [new THREE.Vector3(0, 2.85, 0), new THREE.Vector3(0.08, 3.55, 0.42), new THREE.Vector3(0.16, 4.15, 0.85)],
    0.11
  );
  const branchD = makeBranchGeo(
    [new THREE.Vector3(0, 2.7, 0), new THREE.Vector3(-0.3, 3.4, -0.5), new THREE.Vector3(-0.7, 4.0, -0.9)],
    0.10
  );
  const branchE = makeBranchGeo(
    [new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0.35, 3.35, 0.45), new THREE.Vector3(0.8, 3.95, 0.85)],
    0.10
  );
  // Secondary twigs on branch tips
  const twig1 = makeBranchGeo(
    [new THREE.Vector3(-1.05, 3.75, 0.42), new THREE.Vector3(-1.35, 4.0, 0.55), new THREE.Vector3(-1.6, 4.15, 0.7)],
    0.06
  );
  const twig2 = makeBranchGeo(
    [new THREE.Vector3(1.02, 3.85, -0.35), new THREE.Vector3(1.3, 4.05, -0.45), new THREE.Vector3(1.55, 4.2, -0.55)],
    0.06
  );
  const twig3 = makeBranchGeo(
    [new THREE.Vector3(0.16, 4.15, 0.85), new THREE.Vector3(0.25, 4.45, 1.05), new THREE.Vector3(0.3, 4.7, 1.2)],
    0.055
  );
  const trunkGeo = mergeGeometries([trunkBaseGeo, branchA, branchB, branchC, branchD, branchE, twig1, twig2, twig3]);

  // Smooth organically perturbed multi-lobe foliage crown (non-faceted)
  const makeOrganicLeafLobe = (radius: number, ox: number, oy: number, oz: number, seed: number) => {
    const geo = new THREE.IcosahedronGeometry(radius, 2);
    const pos = geo.attributes.position;
    for (let vi = 0; vi < pos.count; vi++) {
      const vx = pos.getX(vi);
      const vy = pos.getY(vi);
      const vz = pos.getZ(vi);
      const len = Math.hypot(vx, vy, vz) || 1;
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;
      const disp =
        1 +
        0.1 * Math.sin(nx * 3.8 + seed) * Math.cos(ny * 3.2 - seed * 0.7) +
        0.06 * Math.sin(nz * 5.4 + seed * 1.3);
      pos.setXYZ(vi, vx * disp + ox, vy * disp * 0.86 + oy, vz * disp + oz);
    }
    geo.computeVertexNormals();
    return ensureNonIndexed(geo);
  };

  const canopyGeo = mergeGeometries([
    makeOrganicLeafLobe(1.85, 0, 4.35, 0, 0.5),
    makeOrganicLeafLobe(1.38, -1.12, 3.9, 0.48, 1.9),
    makeOrganicLeafLobe(1.34, 1.08, 3.98, -0.38, 3.4),
    makeOrganicLeafLobe(1.26, 0.18, 4.12, 1.0, 4.7),
    makeOrganicLeafLobe(1.28, -0.15, 5.25, -0.12, 6.1),
    makeOrganicLeafLobe(1.15, -0.6, 3.6, -0.9, 7.3),
    makeOrganicLeafLobe(1.1, 0.7, 3.55, 0.95, 8.1),
    makeOrganicLeafLobe(0.95, 0.05, 5.0, 0.4, 9.0),
  ]);

  const trunks = new THREE.InstancedMesh(trunkGeo, mats.bark, treePositions.length);
  const canopies = new THREE.InstancedMesh(canopyGeo, mats.foliage, treePositions.length);
  trunks.castShadow = true;
  canopies.castShadow = true;
  canopies.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  treePositions.forEach(([tx, ty, tz], i) => {
    const scale = 0.88 + ((i * 19) % 30) / 100;
    dummy.position.set(tx, ty, tz);
    dummy.rotation.set(0, i * 1.15, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    canopies.setMatrixAt(i, dummy.matrix);

    tint.setHSL(0.28 + (i % 4) * 0.015, 0.42, 0.46 + (i % 3) * 0.06);
    canopies.setColorAt(i, tint);

    // Circular limestone tree-pit ring, mulch bed & projected dappled canopy shadow for the 6 inner Courtyard oak trees
    if (i < 6) {
      const pitRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 8, 20), mats.limestone);
      pitRing.rotation.x = Math.PI / 2;
      pitRing.position.set(tx, 0.05, tz);
      const mulch = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.95, 0.05, 18), mats.woodDark);
      mulch.position.set(tx, 0.025, tz);
      const canopyShadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4 * scale, 6.4 * scale), mats.shadowCanopy);
      canopyShadow.rotation.x = -Math.PI / 2;
      canopyShadow.rotation.z = i * 0.9;
      canopyShadow.position.set(tx - 0.55, 0.013, tz + 1.35);
      canopyShadow.renderOrder = 1;
      group.add(pitRing, mulch, canopyShadow);
    }

    physics.addStaticCylinder(tx, ty + 1.5, tz, 0.38 * scale, 1.5);
  });

  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  canopies.computeBoundingSphere();
  group.add(trunks, canopies);

  // Sculpted Ornamental Shrubs flanking Eagle Statue, Flagpole, and Main Facade Corners
  const shrubGeo = mergeGeometries([
    makeOrganicLeafLobe(0.46, 0, 0.36, 0, 1.1),
    makeOrganicLeafLobe(0.34, -0.32, 0.28, 0.14, 2.5),
    makeOrganicLeafLobe(0.32, 0.3, 0.27, -0.1, 4.0),
  ]);
  const shrubSpots: Array<[number, number, number]> = [
    [-7.1, 0, 1.5],
    [7.1, 0, 1.5],
    [-12.2, 0, -4.6],
    [12.2, 0, -4.6],
    [-20.8, 0, 4.5],
    [20.8, 0, 4.5],
    [-20.8, 0, 23.5],
    [20.8, 0, 23.5],
  ];
  const shrubs = new THREE.InstancedMesh(shrubGeo, mats.foliage, shrubSpots.length);
  shrubs.castShadow = true;
  shrubs.receiveShadow = true;
  shrubSpots.forEach(([sx, sy, sz], i) => {
    dummy.position.set(sx, sy, sz);
    dummy.rotation.set(0, i * 0.9, 0);
    dummy.scale.setScalar(0.9 + (i % 3) * 0.12);
    dummy.updateMatrix();
    shrubs.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.31, 0.45, 0.48 + (i % 2) * 0.08);
    shrubs.setColorAt(i, tint);
  });
  shrubs.instanceMatrix.needsUpdate = true;
  if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;
  shrubs.computeBoundingSphere();
  group.add(shrubs);

  // Sculpted Gooseneck Courtyard Lamp Posts (LatheGeometry base + TubeGeometry bracket + octagonal cap)
  const lampBaseGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.22, 0.0),
      new THREE.Vector2(0.2, 0.18),
      new THREE.Vector2(0.13, 0.52),
      new THREE.Vector2(0.08, 0.9),
      new THREE.Vector2(0.065, 3.45),
      new THREE.Vector2(0.0, 3.48),
    ],
    12
  );
  const lampArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.35, 0),
    new THREE.Vector3(0.12, 3.72, 0),
    new THREE.Vector3(0.45, 3.78, 0),
    new THREE.Vector3(0.56, 3.55, 0),
  ]);
  const lampArmGeo = new THREE.TubeGeometry(lampArmCurve, 12, 0.032, 8, false);
  const lampCapGeo = new THREE.ConeGeometry(0.22, 0.18, 8);

  for (const [lx, lz] of [
    [-3.8, 8.8],
    [3.8, 8.8],
    [-4.2, 21.5],
    [4.2, 21.5],
  ]) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lx, 0, lz);
    lampGroup.rotation.y = lx < 0 ? 0 : Math.PI;

    const post = new THREE.Mesh(lampBaseGeo, mats.navy);
    post.castShadow = true;
    const arm = new THREE.Mesh(lampArmGeo, mats.navy);
    const cap = new THREE.Mesh(lampCapGeo, mats.navy);
    cap.position.set(0.56, 3.54, 0);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), mats.neonCeiling);
    globe.position.set(0.56, 3.36, 0);

    lampGroup.add(post, arm, cap, globe);
    group.add(lampGroup);
    physics.addStaticBox(lx, 1.8, lz, 0.2, 1.8, 0.2);
  }

  // Brick Flower Planters with Boxwood Hedges & Instanced Blossoms flanking Entrance Walkway
  const flowerCoords: Array<[number, number, number]> = [];
  const hedgeGeo = new RoundedBoxGeometry(3.4, 0.55, 1.15, 2, 0.18);
  for (const [px, pz] of [
    [-5.8, -4.6],
    [5.8, -4.6],
    [-5.8, 6.5],
    [5.8, 6.5],
  ]) {
    const planterBox = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 1.5), mats.brick);
    planterBox.position.set(px, 0.25, pz);
    planterBox.castShadow = true;
    planterBox.receiveShadow = true;
    const coping = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.08, 1.66), mats.concreteDark);
    coping.position.set(px, 0.52, pz);
    const hedge = new THREE.Mesh(hedgeGeo, mats.foliage);
    hedge.position.set(px, 0.68, pz);
    hedge.castShadow = true;
    group.add(planterBox, coping, hedge);
    physics.addStaticBox(px, 0.45, pz, 1.95, 0.45, 0.8);

    for (let f = 0; f < 10; f++) {
      flowerCoords.push([px - 1.4 + f * 0.31, 0.96, pz + ((f % 3) - 1) * 0.28]);
    }
  }

  // Blossoms removed from concrete planters; flowers are now placed on grass lawns
  // in ExteriorDetails.ts to avoid flowers on paved surfaces.
  void flowerCoords;
  // Outdoor Wooden Picnic Tables on East & West Courtyard Lawns
  const topPlankGeo = new RoundedBoxGeometry(2.1, 0.06, 0.95, 2, 0.015);
  const benchPlankGeo = new RoundedBoxGeometry(2.1, 0.05, 0.32, 2, 0.012);
  for (const [tx, tz] of [
    [-11.5, 16.0],
    [11.5, 16.0],
  ]) {
    const pt = new THREE.Group();
    pt.position.set(tx, 0, tz);
    const tableTop = new THREE.Mesh(topPlankGeo, mats.woodDesk);
    tableTop.position.y = 0.76;
    tableTop.castShadow = true;
    const seatL = new THREE.Mesh(benchPlankGeo, mats.woodDesk);
    seatL.position.set(0, 0.44, -0.78);
    const seatR = new THREE.Mesh(benchPlankGeo, mats.woodDesk);
    seatR.position.set(0, 0.44, 0.78);
    for (const sx of [-0.75, 0.75]) {
      const legA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), mats.navy);
      legA.position.set(sx, 0.38, -0.35);
      legA.rotation.x = 0.38;
      const legB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), mats.navy);
      legB.position.set(sx, 0.38, 0.35);
      legB.rotation.x = -0.38;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 1.68), mats.navy);
      tie.position.set(sx, 0.4, 0);
      pt.add(legA, legB, tie);
    }
    pt.add(tableTop, seatL, seatR);
    group.add(pt);
    physics.addStaticBox(tx, 0.42, tz, 1.1, 0.42, 0.95);
  }

  // Wrought-Iron Courtyard Trash / Recycling Bins
  const binBodyGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.78, 12);
  const binRimGeo = new THREE.TorusGeometry(0.23, 0.03, 8, 14);
  for (const [bx, bz] of [
    [-3.6, 10.2],
    [3.6, 10.2],
    [-3.6, 20.8],
    [3.6, 20.8],
  ]) {
    const bin = new THREE.Mesh(binBodyGeo, mats.navy);
    bin.position.set(bx, 0.39, bz);
    bin.castShadow = true;
    const rim = new THREE.Mesh(binRimGeo, mats.gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(bx, 0.78, bz);
    group.add(bin, rim);
    physics.addStaticBox(bx, 0.4, bz, 0.26, 0.4, 0.26);
  }

  // Pitched-Roof Campus Welcome Kiosk near South Covered Walkway (X = 8.5, Z = 23.6)
  const kiosk = new THREE.Group();
  kiosk.position.set(8.5, 0, 23.6);
  kiosk.rotation.y = -0.35;
  for (const kx of [-0.95, 0.95]) {
    const kPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), mats.woodDark);
    kPost.position.set(kx, 1.15, 0);
    kPost.castShadow = true;
    kiosk.add(kPost);
  }
  const kioskBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 1.1, 0.1),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('BIENVENUE À MAPLEWOOD', 'PLAN · CLUBS · HORAIRES', '#1F3864', '#D4AF37'),
      roughness: 0.55,
    })
  );
  kioskBoard.position.set(0, 1.48, 0);
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-0.55, 0);
  gableShape.lineTo(0, 0.45);
  gableShape.lineTo(0.55, 0);
  gableShape.closePath();
  const kioskRoofGeo = new THREE.ExtrudeGeometry(gableShape, {
    depth: 2.25,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  kioskRoofGeo.center();
  const kioskRoof = new THREE.Mesh(kioskRoofGeo, mats.navy);
  kioskRoof.rotation.y = Math.PI / 2;
  kioskRoof.position.set(0, 2.4, 0);
  kioskRoof.castShadow = true;
  kiosk.add(kioskBoard, kioskRoof);
  group.add(kiosk);
  physics.addStaticBox(8.5, 1.1, 23.6, 1.05, 1.1, 0.25, -0.35);

  ctx.scene.add(group);
  return group;
}
