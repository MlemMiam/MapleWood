import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildFlutedColumnGeo } from '../../utils/Geometry';
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

  const walkwayColGeo = buildFlutedColumnGeo(3.5, 0.14, 12);

  for (let px = -20; px <= 20; px += 8) {
    if (Math.abs(px) < 3) continue; // Keep central entrance archway wide open!
    const colA = new THREE.Mesh(walkwayColGeo, mats.limestone);
    colA.position.set(px, 0, 25.2);
    const colB = new THREE.Mesh(walkwayColGeo, mats.limestone);
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
        const post = new THREE.Mesh(walkwayColGeo, mats.limestone);
        post.position.set(bx + side, 0, bz);
        post.castShadow = true;
        group.add(post);
      }
    }
  }

  // Central Monumental Fountain with Gadrooned Basins (Fontaine à trois vasques godronnées: X = 0, Z = 15.5)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0, 15.5);

  const ensureNonIndexedFtn = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

  // 3-tier LatheGeometry core: Lower Pool + Fluted Pedestal + Middle Gadrooned Basin + Upper Gadrooned Basin
  const basinProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(2.96, 0.0),
    new THREE.Vector2(2.96, 0.1),
    new THREE.Vector2(2.84, 0.15),
    new THREE.Vector2(2.82, 0.22),
    new THREE.Vector2(2.65, 0.26),
    new THREE.Vector2(2.62, 0.56),
    new THREE.Vector2(2.76, 0.65),
    new THREE.Vector2(2.76, 0.73),
    new THREE.Vector2(2.38, 0.73),
    new THREE.Vector2(2.34, 0.34),
    new THREE.Vector2(0.72, 0.34),
    new THREE.Vector2(0.64, 0.46),
    new THREE.Vector2(0.46, 0.62),
    new THREE.Vector2(0.42, 0.98),
    // Middle Gadrooned Basin (Vasque médiane godronnée at Y = 1.04..1.32, R = 1.42m)
    new THREE.Vector2(0.54, 1.04),
    new THREE.Vector2(1.16, 1.14),
    new THREE.Vector2(1.42, 1.24),
    new THREE.Vector2(1.46, 1.31),
    new THREE.Vector2(1.24, 1.31),
    new THREE.Vector2(1.18, 1.18),
    new THREE.Vector2(0.38, 1.18),
    // Upper Fluted Column Neck + Upper Gadrooned Basin (Vasque supérieure godronnée at Y = 1.66..1.92, R = 0.88m)
    new THREE.Vector2(0.32, 1.56),
    new THREE.Vector2(0.44, 1.68),
    new THREE.Vector2(0.84, 1.8),
    new THREE.Vector2(0.9, 1.9),
    new THREE.Vector2(0.74, 1.9),
    new THREE.Vector2(0.22, 1.76),
    new THREE.Vector2(0.0, 1.76),
  ];

  const ftnLimestoneParts: THREE.BufferGeometry[] = [
    ensureNonIndexedFtn(new THREE.LatheGeometry(basinProfile, 36)),
  ];

  // 1) Lower Basin Exterior Gadroons (24 godrons bombés autour du grand bassin)
  for (let g = 0; g < 24; g++) {
    const ang = (g / 24) * Math.PI * 2;
    const gadroon = ensureNonIndexedFtn(new THREE.SphereGeometry(0.14, 7, 6));
    gadroon.scale(0.82, 1.35, 0.55);
    gadroon.rotateY(-ang);
    gadroon.translate(Math.cos(ang) * 2.64, 0.43, Math.sin(ang) * 2.64);
    ftnLimestoneParts.push(gadroon);
  }

  // 2) Middle Basin Sculpted Radial Gadroons (20 godrons rayonnants sous la vasque médiane et sur son rebord)
  for (let g = 0; g < 20; g++) {
    const ang = (g / 20) * Math.PI * 2;
    // Underside radial gadroon rib
    const underRib = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.065, 0.115, 0.88, 7));
    underRib.scale(1.0, 1.0, 0.58);
    underRib.rotateZ(Math.PI / 2 - 0.23);
    underRib.rotateY(-ang);
    underRib.translate(Math.cos(ang) * 0.94, 1.13, Math.sin(ang) * 0.94);
    // Scalloped lip boss on middle rim
    const lipBoss = ensureNonIndexedFtn(new THREE.SphereGeometry(0.095, 7, 6));
    lipBoss.scale(1.25, 0.58, 0.82);
    lipBoss.rotateY(-ang);
    lipBoss.translate(Math.cos(ang) * 1.41, 1.28, Math.sin(ang) * 1.41);
    ftnLimestoneParts.push(underRib, lipBoss);
  }

  // 3) Upper Basin Sculpted Radial Gadroons (16 godrons rayonnants sous la vasque supérieure)
  for (let g = 0; g < 16; g++) {
    const ang = (g / 16) * Math.PI * 2;
    const upperRib = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.048, 0.088, 0.52, 7));
    upperRib.scale(1.0, 1.0, 0.58);
    upperRib.rotateZ(Math.PI / 2 - 0.28);
    upperRib.rotateY(-ang);
    upperRib.translate(Math.cos(ang) * 0.6, 1.76, Math.sin(ang) * 0.6);

    const upperLip = ensureNonIndexedFtn(new THREE.SphereGeometry(0.072, 7, 6));
    upperLip.scale(1.25, 0.55, 0.82);
    upperLip.rotateY(-ang);
    upperLip.translate(Math.cos(ang) * 0.87, 1.87, Math.sin(ang) * 0.87);
    ftnLimestoneParts.push(upperRib, upperLip);
  }

  const fountainStone = new THREE.Mesh(mergeGeometries(ftnLimestoneParts), mats.limestone);
  fountainStone.castShadow = true;
  fountainStone.receiveShadow = true;

  // Sculpted classical shaft fluting, 4 cardinal scroll buttresses, and 8 carved stone mascarons
  const ftnDetailParts: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 12; f++) {
    const ang = (f / 12) * Math.PI * 2;
    const lowerFlute = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.034, 0.042, 0.48, 6));
    lowerFlute.translate(Math.cos(ang) * 0.43, 0.78, Math.sin(ang) * 0.43);
    const upperFlute = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.026, 0.032, 0.38, 6));
    upperFlute.translate(Math.cos(ang) * 0.34, 1.45, Math.sin(ang) * 0.34);
    ftnDetailParts.push(lowerFlute, upperFlute);
  }
  for (let b = 0; b < 4; b++) {
    const ang = (b * Math.PI) / 2;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);

    // Outer basin cardinal scroll console buttress
    const consoleButtress = ensureNonIndexedFtn(new RoundedBoxGeometry(0.32, 0.58, 0.28, 2, 0.04));
    consoleButtress.rotateY(-ang);
    consoleButtress.translate(ca * 2.74, 0.38, sa * 2.74);

    // Lower column mascaron boss + ring + spout lip
    const boss = ensureNonIndexedFtn(new RoundedBoxGeometry(0.22, 0.24, 0.2, 2, 0.04));
    boss.rotateY(-ang);
    boss.translate(ca * 0.48, 0.84, sa * 0.48);
    const ringBoss = ensureNonIndexedFtn(new THREE.TorusGeometry(0.055, 0.018, 6, 10));
    ringBoss.rotateY(Math.PI / 2 - ang);
    ringBoss.translate(ca * 0.56, 0.83, sa * 0.56);
    const spoutLip = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.024, 0.034, 0.14, 8));
    spoutLip.rotateZ(Math.PI / 2 - 0.25);
    spoutLip.rotateY(-ang);
    spoutLip.translate(ca * 0.57, 0.82, sa * 0.57);

    // Upper column lion-head mascaron boss
    const upperBoss = ensureNonIndexedFtn(new RoundedBoxGeometry(0.16, 0.18, 0.16, 2, 0.03));
    upperBoss.rotateY(-ang);
    upperBoss.translate(ca * 0.36, 1.5, sa * 0.36);

    ftnDetailParts.push(consoleButtress, boss, ringBoss, spoutLip, upperBoss);
  }
  const ftnCarvedDetails = new THREE.Mesh(mergeGeometries(ftnDetailParts), mats.concreteDark);
  ftnCarvedDetails.castShadow = true;
  fountainGroup.add(ftnCarvedDetails);

  // Water discs in all 3 gadrooned tiers
  const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.34, 2.34, 0.06, 28), mats.water);
  waterDisc.position.y = 0.58;
  const midWaterDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.045, 24), mats.water);
  midWaterDisc.position.y = 1.24;
  const topWaterDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.04, 20), mats.water);
  topWaterDisc.position.y = 1.84;

  // Sculpted Bronze-Gold Pine-Cone & Acanthus Finial Crown
  const spoutProfile = [
    new THREE.Vector2(0.0, 1.78),
    new THREE.Vector2(0.2, 1.78),
    new THREE.Vector2(0.14, 1.98),
    new THREE.Vector2(0.22, 2.08),
    new THREE.Vector2(0.12, 2.18),
    new THREE.Vector2(0.17, 2.28),
    new THREE.Vector2(0.11, 2.4),
    new THREE.Vector2(0.0, 2.48),
  ];
  const spout = new THREE.Mesh(new THREE.LatheGeometry(spoutProfile, 18), mats.gold);

  // Parabolic cascading water streams carefully calibrated to NEVER intersect any stone basin rim or shaft
  // Basin geometry bounds:
  // - Finial nozzle: r = 0.06m, y = 2.46m
  // - Upper basin: inner water r <= 0.73m at y = 1.84m; outer stone lip r = 0.90..0.94m at y = 1.88m
  // - Middle basin: inner water r = 0.42..1.22m at y = 1.24m; outer stone lip r = 1.46..1.50m at y = 1.29m
  // - Lower basin: inner water r = 0.72..2.34m at y = 0.58m; outer stone rim r = 2.76m at y = 0.73m
  const waterJets: THREE.Mesh[] = [];

  // 1) 8 Top Finial Jets: Arch from finial nozzle (r=0.06, y=2.46) cleanly into Upper Basin water (r=0.56, y=1.84)
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4 + Math.PI / 8;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.06, 2.46, sinA * 0.06),
      new THREE.Vector3(cosA * 0.26, 2.68, sinA * 0.26),
      new THREE.Vector3(cosA * 0.44, 2.28, sinA * 0.44),
      new THREE.Vector3(cosA * 0.56, 1.84, sinA * 0.56),
    ]);
    const jetMesh = new THREE.Mesh(
      new THREE.TubeGeometry(jetCurve, 14, 0.018, 6, false),
      mats.water
    );
    fountainGroup.add(jetMesh);
    waterJets.push(jetMesh);
  }

  // 2) 8 Upper Basin Lip Cascades: Start outside upper stone lip (r=0.94, y=1.88) -> Middle Basin water (r=1.14, y=1.24)
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4 + Math.PI / 8;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.94, 1.88, sinA * 0.94),
      new THREE.Vector3(cosA * 1.03, 1.89, sinA * 1.03),
      new THREE.Vector3(cosA * 1.1, 1.58, sinA * 1.1),
      new THREE.Vector3(cosA * 1.14, 1.24, sinA * 1.14),
    ]);
    const jetMesh = new THREE.Mesh(
      new THREE.TubeGeometry(jetCurve, 12, 0.017, 6, false),
      mats.water
    );
    fountainGroup.add(jetMesh);
    waterJets.push(jetMesh);
  }

  // 3) 4 Upper Column Mascaron Spouts: Start at upper mascaron mouth (r=0.45, y=1.50) -> Middle Basin water (r=0.84, y=1.24)
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.45, 1.5, sinA * 0.45),
      new THREE.Vector3(cosA * 0.62, 1.48, sinA * 0.62),
      new THREE.Vector3(cosA * 0.75, 1.37, sinA * 0.75),
      new THREE.Vector3(cosA * 0.84, 1.24, sinA * 0.84),
    ]);
    const jetMesh = new THREE.Mesh(
      new THREE.TubeGeometry(jetCurve, 10, 0.015, 5, false),
      mats.water
    );
    fountainGroup.add(jetMesh);
    waterJets.push(jetMesh);
  }

  // 4) 8 Middle Basin Lip Cascades: Start outside middle stone lip (r=1.50, y=1.29) -> Lower Pool water (r=2.02, y=0.58)
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4 + Math.PI / 8;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 1.5, 1.29, sinA * 1.5),
      new THREE.Vector3(cosA * 1.68, 1.31, sinA * 1.68),
      new THREE.Vector3(cosA * 1.88, 0.96, sinA * 1.88),
      new THREE.Vector3(cosA * 2.02, 0.58, sinA * 2.02),
    ]);
    const jetMesh = new THREE.Mesh(
      new THREE.TubeGeometry(jetCurve, 12, 0.019, 6, false),
      mats.water
    );
    fountainGroup.add(jetMesh);
    waterJets.push(jetMesh);
  }

  // 5) 4 Lower Column Mascaron Spouts: Start at bronze/stone spout tip (r=0.64, y=0.81) -> Lower Pool water (r=1.36, y=0.58)
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.64, 0.81, sinA * 0.64),
      new THREE.Vector3(cosA * 0.95, 0.82, sinA * 0.95),
      new THREE.Vector3(cosA * 1.19, 0.71, sinA * 1.19),
      new THREE.Vector3(cosA * 1.36, 0.58, sinA * 1.36),
    ]);
    const jetMesh = new THREE.Mesh(
      new THREE.TubeGeometry(jetCurve, 10, 0.018, 6, false),
      mats.water
    );
    fountainGroup.add(jetMesh);
    waterJets.push(jetMesh);
  }

  // Animated concentric foam ripple rings on the 3 water surfaces where the jets land
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xe6f7ff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const rippleRings: Array<{ mesh: THREE.Mesh; baseRadius: number; phaseOffset: number }> = [];
  const rippleConfigs = [
    { y: 1.862, baseRadius: 0.55, phaseOffset: 0.0 },
    { y: 1.264, baseRadius: 0.84, phaseOffset: 1.2 },
    { y: 1.264, baseRadius: 1.12, phaseOffset: 2.5 },
    { y: 0.612, baseRadius: 1.36, phaseOffset: 0.8 },
    { y: 0.612, baseRadius: 2.0, phaseOffset: 2.1 },
  ];
  for (const rc of rippleConfigs) {
    const rMesh = new THREE.Mesh(
      new THREE.RingGeometry(rc.baseRadius - 0.03, rc.baseRadius + 0.03, 32),
      rippleMat
    );
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.y = rc.y;
    fountainGroup.add(rMesh);
    rippleRings.push({ mesh: rMesh, baseRadius: rc.baseRadius, phaseOffset: rc.phaseOffset });
  }

  // Multi-tiered Water Particle System (THREE.Points + Instanced 3D Water Droplets)
  const dropCanvas = document.createElement('canvas');
  dropCanvas.width = 64;
  dropCanvas.height = 64;
  const dCtx = dropCanvas.getContext('2d');
  if (dCtx) {
    const grad = dCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(250, 254, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(195, 238, 255, 0.88)');
    grad.addColorStop(0.7, 'rgba(130, 208, 250, 0.38)');
    grad.addColorStop(1, 'rgba(110, 195, 245, 0.0)');
    dCtx.fillStyle = grad;
    dCtx.fillRect(0, 0, 64, 64);
  }
  const dropletTex = new THREE.CanvasTexture(dropCanvas);
  dropletTex.colorSpace = THREE.SRGBColorSpace;

  const PARTICLE_COUNT = 260;
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleZone = new Uint8Array(PARTICLE_COUNT);
  const particleAngle = new Float32Array(PARTICLE_COUNT);
  const particlePhase = new Float32Array(PARTICLE_COUNT);
  const particleSpeed = new Float32Array(PARTICLE_COUNT);
  const particleSpread = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Zone 0: Crown Geyser (0..83)
    // Zone 1: Upper-to-Middle Cascade (84..151)
    // Zone 2: Middle-to-Lower Cascade (152..223)
    // Zone 3: Cardinal Mascaron Spouts (224..259)
    let zone = 0;
    let angle = 0;
    if (i < 84) {
      zone = 0;
      const jetIdx = i % 8;
      angle = (jetIdx * Math.PI) / 4 + Math.PI / 8 + ((i * 7) % 11 - 5) * 0.032;
    } else if (i < 152) {
      zone = 1;
      const jetIdx = i % 8;
      angle = (jetIdx * Math.PI) / 4 + Math.PI / 8 + ((i * 13) % 9 - 4) * 0.025;
    } else if (i < 224) {
      zone = 2;
      const jetIdx = i % 8;
      angle = (jetIdx * Math.PI) / 4 + Math.PI / 8 + ((i * 11) % 9 - 4) * 0.024;
    } else {
      zone = 3;
      const spoutIdx = i % 4;
      angle = (spoutIdx * Math.PI) / 2 + ((i * 5) % 7 - 3) * 0.022;
    }
    particleZone[i] = zone;
    particleAngle[i] = angle;
    particlePhase[i] = (i * 0.6180339887) % 1.0;
    particleSpeed[i] = 0.88 + ((i * 17) % 13) * 0.025;
    particleSpread[i] = (((i * 23) % 11) - 5) * 0.012;
  }

  const evalWaterParticlePosition = (
    idx: number,
    phase: number,
    out: Float32Array,
    offset: number
  ) => {
    const zone = particleZone[idx];
    const ang = particleAngle[idx];
    const spread = particleSpread[idx];
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);

    let r = 0;
    let y = 0;

    if (zone === 0) {
      // Crown Geyser: rises from finial nozzle (r=0.04, y=2.47), peaks at y=2.82, lands at r=0.56, y=1.86
      if (phase < 0.82) {
        const u = phase / 0.82;
        r = 0.04 + (0.52 + spread) * u;
        y = 2.47 + 0.92 * u - 1.53 * u * u;
      } else {
        // Splash crown inside upper basin (r=0.56..0.64, y=1.86..1.96)
        const s = (phase - 0.82) / 0.18;
        r = 0.56 + spread + 0.08 * s;
        y = 1.86 + Math.sin(s * Math.PI) * 0.095;
      }
    } else if (zone === 1) {
      // Upper-to-Middle Cascade: starts outside upper lip (r=0.94, y=1.88) -> middle water (r=1.14, y=1.26)
      if (phase < 0.82) {
        const u = phase / 0.82;
        r = 0.94 + (0.2 + spread) * u;
        y = 1.88 + 0.16 * u - 0.78 * u * u;
      } else {
        const s = (phase - 0.82) / 0.18;
        r = 1.14 + spread + 0.05 * s;
        y = 1.26 + Math.sin(s * Math.PI) * 0.075;
      }
    } else if (zone === 2) {
      // Middle-to-Lower Cascade: starts outside middle lip (r=1.50, y=1.29) -> lower pool (r=2.02, y=0.61)
      if (phase < 0.82) {
        const u = phase / 0.82;
        r = 1.5 + (0.52 + spread) * u;
        y = 1.29 + 0.18 * u - 0.86 * u * u;
      } else {
        const s = (phase - 0.82) / 0.18;
        r = 2.02 + spread + 0.09 * s;
        y = 0.61 + Math.sin(s * Math.PI) * 0.11;
      }
    } else {
      // Cardinal Lower Mascaron Spouts: starts at spout tip (r=0.64, y=0.81) -> lower pool (r=1.36, y=0.61)
      if (phase < 0.82) {
        const u = phase / 0.82;
        r = 0.64 + (0.72 + spread) * u;
        y = 0.81 + 0.15 * u - 0.35 * u * u;
      } else {
        const s = (phase - 0.82) / 0.18;
        r = 1.36 + spread + 0.08 * s;
        y = 0.61 + Math.sin(s * Math.PI) * 0.085;
      }
    }

    out[offset] = ca * r;
    out[offset + 1] = y;
    out[offset + 2] = sa * r;
  };

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    evalWaterParticlePosition(i, particlePhase[i], particlePositions, i * 3);
  }

  const particleGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(particlePositions, 3);
  particleGeo.setAttribute('position', posAttr);

  const particleMat = new THREE.PointsMaterial({
    map: dropletTex,
    color: 0xe8f8ff,
    size: 0.14,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const waterParticles = new THREE.Points(particleGeo, particleMat);
  waterParticles.frustumCulled = false;
  fountainGroup.add(waterParticles);

  // 3D Instanced Water Bead Droplets for Volumetric Geyser & Splash Plumes (48 instances, zero GC)
  const BEAD_COUNT = 48;
  const beadGeo = new THREE.IcosahedronGeometry(0.024, 1);
  const beadMat = new THREE.MeshStandardMaterial({
    color: 0xdff6ff,
    emissive: 0x3898d8,
    emissiveIntensity: 0.28,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.84,
  });
  const waterBeadMesh = new THREE.InstancedMesh(beadGeo, beadMat, BEAD_COUNT);
  waterBeadMesh.frustumCulled = false;
  const _beadDummy = new THREE.Object3D();
  const _beadCoord = new Float32Array(3);
  fountainGroup.add(waterBeadMesh);

  // Basin rim molding detail
  const rimMolding = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.068, 10, 44), mats.concreteDark);
  rimMolding.rotation.x = Math.PI / 2;
  rimMolding.position.y = 0.73;
  fountainGroup.add(rimMolding);

  fountainGroup.add(fountainStone, waterDisc, midWaterDisc, topWaterDisc, spout);
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

  animatedObjects.push((elapsed, dt) => {
    waterDisc.position.y = 0.58 + Math.sin(elapsed * 2.5) * 0.008;
    midWaterDisc.position.y = 1.24 + Math.cos(elapsed * 2.8) * 0.006;
    topWaterDisc.position.y = 1.84 + Math.sin(elapsed * 3.1) * 0.005;

    // Advance ballistic water particles without ever crossing stone boundaries
    const stepDt = Math.min(dt, 0.05);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let p = particlePhase[i] + stepDt * particleSpeed[i];
      if (p >= 1.0) p -= 1.0;
      particlePhase[i] = p;
      evalWaterParticlePosition(i, p, particlePositions, i * 3);
    }
    posAttr.needsUpdate = true;

    // Update 3D instanced water beads along the trajectories
    for (let b = 0; b < BEAD_COUNT; b++) {
      const pIdx = (b * 5) % PARTICLE_COUNT;
      evalWaterParticlePosition(pIdx, particlePhase[pIdx], _beadCoord, 0);
      _beadDummy.position.set(_beadCoord[0], _beadCoord[1], _beadCoord[2]);
      const pulse = 0.8 + 0.45 * Math.sin(particlePhase[pIdx] * Math.PI);
      _beadDummy.scale.set(pulse, pulse * 1.25, pulse);
      _beadDummy.updateMatrix();
      waterBeadMesh.setMatrixAt(b, _beadDummy.matrix);
    }
    waterBeadMesh.instanceMatrix.needsUpdate = true;

    // Animate surface foam ripple rings at landing zones
    for (let r = 0; r < rippleRings.length; r++) {
      const rr = rippleRings[r];
      const wave = ((elapsed * 1.15 + rr.phaseOffset) % 1.0);
      const s = 0.94 + wave * 0.14;
      rr.mesh.scale.set(s, s, 1);
    }
  });

  // Maplewood Eagle Mascot Statue (X = -5.5, Z = 1.5) — Fluted colonnette pedestal + articulated multi-tier plumage
  const statueGroup = new THREE.Group();
  statueGroup.position.set(-5.5, 0, 1.5);
  const plinthBase = new THREE.Mesh(
    new RoundedBoxGeometry(2.04, 0.24, 2.04, 2, 0.04),
    mats.concreteDark
  );
  plinthBase.position.y = 0.12;
  const plinthStep = new THREE.Mesh(
    new RoundedBoxGeometry(1.8, 0.15, 1.8, 2, 0.03),
    mats.limestone
  );
  plinthStep.position.y = 0.295;
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.92, 1.5, 2, 0.03), mats.limestone);
  plinth.position.y = 0.79;
  plinth.castShadow = true;

  // 4 Classical Fluted Corner Colonnettes & Dentil Cornice on the Statue Pedestal
  const colonnetteParts: THREE.BufferGeometry[] = [];
  for (const cx of [-0.74, 0.74]) {
    for (const cz of [-0.74, 0.74]) {
      const colShaft = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.068, 0.078, 0.86, 10));
      colShaft.translate(cx, 0.79, cz);
      const colBase = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.1, 0.11, 0.08, 10));
      colBase.translate(cx, 0.39, cz);
      const colCap = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.11, 0.09, 0.08, 10));
      colCap.translate(cx, 1.19, cz);
      colonnetteParts.push(colShaft, colBase, colCap);
      // 8 vertical flutes on each corner colonnette
      for (let cf = 0; cf < 8; cf++) {
        const cAng = (cf / 8) * Math.PI * 2;
        const cRib = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.012, 0.014, 0.74, 5));
        cRib.translate(cx + Math.cos(cAng) * 0.072, 0.79, cz + Math.sin(cAng) * 0.072);
        colonnetteParts.push(cRib);
      }
    }
  }
  // Dentil molding blocks around the top of the pedestal
  for (let d = -3; d <= 3; d++) {
    for (const sz of [-0.76, 0.76]) {
      const dent = ensureNonIndexedFtn(new THREE.BoxGeometry(0.09, 0.06, 0.06));
      dent.translate(d * 0.18, 1.2, sz);
      colonnetteParts.push(dent);
    }
  }
  const plinthColonnettes = new THREE.Mesh(mergeGeometries(colonnetteParts), mats.concreteDark);
  plinthColonnettes.castShadow = true;

  const plinthCap = new THREE.Mesh(
    new RoundedBoxGeometry(1.82, 0.16, 1.82, 2, 0.03),
    mats.navy
  );
  plinthCap.position.y = 1.29;

  const plaqueTex = createSignTexture('LES AIGLES', 'MAPLEWOOD · EST. 1994', '#1F3864', '#D4AF37');
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.35, metalness: 0.3 });
  const plaqueFront = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.4, 0.06, 2, 0.015), plaqueMat);
  plaqueFront.position.set(0, 0.78, 0.76);
  const plaqueBack = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.4, 0.06, 2, 0.015), plaqueMat);
  plaqueBack.position.set(0, 0.78, -0.76);
  plaqueBack.rotation.y = Math.PI;

  const perchRock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.44, 2), mats.concreteDark);
  perchRock.position.set(0, 1.49, 0);
  perchRock.scale.set(1.32, 0.6, 1.12);

  // Sculpted LatheGeometry avian torso & curved neck transitioning into head
  const eagleBodyProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.19, 0.04),
    new THREE.Vector2(0.3, 0.22),
    new THREE.Vector2(0.35, 0.45),
    new THREE.Vector2(0.29, 0.65),
    new THREE.Vector2(0.19, 0.79),
    new THREE.Vector2(0.15, 0.89),
    new THREE.Vector2(0.0, 0.92),
  ];
  const eagleTorso = new THREE.Mesh(new THREE.LatheGeometry(eagleBodyProfile, 22), mats.gold);
  eagleTorso.position.set(0, 1.56, -0.02);
  eagleTorso.rotation.x = 0.22;
  eagleTorso.castShadow = true;

  // Sculpted ruff, imbricated breast plumage scales, head crest feathers, pedestal laurel wreath & side medallions
  const eagleSculptParts: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 12; r++) {
    const ang = (r / 12) * Math.PI * 2;
    const plume = ensureNonIndexedFtn(new THREE.ConeGeometry(0.055, 0.19, 6));
    plume.rotateX(Math.PI - 0.38);
    plume.rotateY(ang);
    plume.translate(Math.sin(ang) * 0.17, 2.22, Math.cos(ang) * 0.17 + 0.09);
    eagleSculptParts.push(plume);
  }
  // Imbricated breast & pectoral feather scales (3 rows across chest)
  for (let row = 0; row < 3; row++) {
    const count = 6 + row;
    for (let c = 0; c < count; c++) {
      const ang = -0.75 + (c / (count - 1)) * 1.5;
      const scaleFeather = ensureNonIndexedFtn(new THREE.SphereGeometry(0.058, 6, 5));
      scaleFeather.scale(0.95, 1.45, 0.42);
      scaleFeather.rotateX(0.25);
      scaleFeather.rotateY(ang);
      const rad = 0.29 - row * 0.022;
      scaleFeather.translate(
        Math.sin(ang) * rad,
        1.82 + row * 0.13,
        Math.cos(ang) * rad + 0.05
      );
      eagleSculptParts.push(scaleFeather);
    }
  }
  // Swept-back crown & nape crest feathers on the eagle head
  for (let hc = -2; hc <= 2; hc++) {
    const crest = ensureNonIndexedFtn(new THREE.ConeGeometry(0.036, 0.16, 6));
    crest.rotateX(-1.15);
    crest.rotateY(hc * 0.16);
    crest.translate(hc * 0.035, 2.47 - Math.abs(hc) * 0.015, 0.02);
    eagleSculptParts.push(crest);
  }
  // Bronze laurel wreath crowning front plaque & side bas-relief medallions on pedestal
  const frontGarland = ensureNonIndexedFtn(new THREE.TorusGeometry(0.14, 0.024, 6, 14));
  frontGarland.translate(0, 1.08, 0.76);
  eagleSculptParts.push(frontGarland);
  for (const sx of [-0.76, 0.76]) {
    const sideMedallion = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16));
    sideMedallion.rotateZ(Math.PI / 2);
    sideMedallion.translate(sx, 0.79, 0);
    const sideRing = ensureNonIndexedFtn(new THREE.TorusGeometry(0.23, 0.025, 6, 16));
    sideRing.rotateY(Math.PI / 2);
    sideRing.translate(sx, 0.79, 0);
    eagleSculptParts.push(sideMedallion, sideRing);
  }
  // Bronze oak/laurel branch across the perch boulder
  for (let lf = -3; lf <= 3; lf++) {
    const leaf = ensureNonIndexedFtn(new THREE.SphereGeometry(0.045, 6, 5));
    leaf.scale(1.6, 0.5, 0.7);
    leaf.rotateZ(lf * 0.22);
    leaf.translate(lf * 0.08, 1.44 + Math.abs(lf) * 0.01, 0.42);
    eagleSculptParts.push(leaf);
  }
  const eagleRuff = new THREE.Mesh(mergeGeometries(eagleSculptParts), mats.gold);
  eagleRuff.castShadow = true;
  statueGroup.add(eagleRuff);

  const eagleHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), mats.gold);
  eagleHead.scale.set(0.95, 1.02, 1.14);
  eagleHead.position.set(0, 2.4, 0.15);
  const eagleBrow = new THREE.Mesh(
    new RoundedBoxGeometry(0.26, 0.06, 0.18, 2, 0.02),
    mats.gold
  );
  eagleBrow.position.set(0, 2.48, 0.23);
  eagleBrow.rotation.x = 0.24;

  const eagleEyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.4 });
  for (const ex of [-0.125, 0.125]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eagleEyeMat);
    eye.position.set(ex, 2.43, 0.24);
    statueGroup.add(eye);
  }

  // Hooked eagle upper beak + lower mandible via curved TubeGeometry
  const beakCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.4, 0.3),
    new THREE.Vector3(0, 2.38, 0.44),
    new THREE.Vector3(0, 2.29, 0.5),
  ]);
  const eagleBeak = new THREE.Mesh(new THREE.TubeGeometry(beakCurve, 10, 0.044, 8, false), mats.terracotta);
  const beakTip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.1, 8), mats.terracotta);
  beakTip.position.set(0, 2.25, 0.5);
  beakTip.rotation.x = Math.PI - 0.15;
  const lowerJaw = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.028, 0.14, 2, 0.008), mats.terracotta);
  lowerJaw.position.set(0, 2.32, 0.36);
  lowerJaw.rotation.x = 0.28;
  statueGroup.add(beakTip, lowerJaw);

  // Sculpted beveled tail fan with 7 distinct rectrices via ExtrudeGeometry
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.11, 0);
  tailShape.lineTo(-0.4, -0.52);
  tailShape.lineTo(-0.27, -0.49);
  tailShape.lineTo(-0.2, -0.57);
  tailShape.lineTo(-0.1, -0.53);
  tailShape.lineTo(0, -0.62);
  tailShape.lineTo(0.1, -0.53);
  tailShape.lineTo(0.2, -0.57);
  tailShape.lineTo(0.27, -0.49);
  tailShape.lineTo(0.4, -0.52);
  tailShape.lineTo(0.11, 0);
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

  // Articulated 3-layer sculpted feather wings (primary flight feathers + secondary covert tier + 9 individual fanned remiges)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.18);
  wingShape.quadraticCurveTo(0.58, 0.38, 1.28, 0.18);
  wingShape.lineTo(1.1, 0.05);
  wingShape.lineTo(1.2, -0.03);
  wingShape.lineTo(0.98, -0.11);
  wingShape.lineTo(1.06, -0.17);
  wingShape.lineTo(0.82, -0.22);
  wingShape.lineTo(0.88, -0.27);
  wingShape.quadraticCurveTo(0.44, -0.32, 0, -0.2);
  wingShape.closePath();
  const wingPrimaryGeo = ensureNonIndexedFtn(
    new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    })
  );
  wingPrimaryGeo.translate(0, 0, -0.027);

  const covertShape = new THREE.Shape();
  covertShape.moveTo(0, 0.16);
  covertShape.quadraticCurveTo(0.42, 0.28, 0.84, 0.11);
  covertShape.lineTo(0.7, -0.02);
  covertShape.lineTo(0.76, -0.08);
  covertShape.quadraticCurveTo(0.36, -0.16, 0, -0.12);
  covertShape.closePath();
  const wingCovertGeo = ensureNonIndexedFtn(
    new THREE.ExtrudeGeometry(covertShape, {
      depth: 0.078,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 2,
    })
  );
  wingCovertGeo.translate(0.02, 0.02, -0.039);

  // 9 Individual sculpted primary & secondary feather blades fanned along the wing
  const wingFeatherBlades: THREE.BufferGeometry[] = [wingPrimaryGeo, wingCovertGeo];
  for (let fb = 0; fb < 9; fb++) {
    const t = fb / 8;
    const bladeLen = 0.42 + (1 - Math.abs(t - 0.35)) * 0.36;
    const blade = ensureNonIndexedFtn(
      new RoundedBoxGeometry(bladeLen, 0.065, 0.028, 2, 0.01)
    );
    blade.rotateZ(-0.08 - t * 0.42);
    blade.translate(0.32 + t * 0.72, 0.12 - t * 0.26, 0.022);
    wingFeatherBlades.push(blade);
  }
  const wingGeo = mergeGeometries(wingFeatherBlades);

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

    const legThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.072, 0.24, 8), mats.gold);
    legThigh.position.set(side * 0.14, 1.66, 0.1);
    statueGroup.add(wingPivot, legThigh);

    // 3 front talons + 1 rear hallux claw gripping the stone perch
    for (const clawOffset of [-0.038, 0, 0.038]) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.095, 6), mats.terracotta);
      claw.position.set(side * 0.14 + clawOffset, 1.54, 0.175);
      claw.rotation.x = Math.PI * 0.62;
      statueGroup.add(claw);
    }
    const halluxClaw = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.08, 6), mats.terracotta);
    halluxClaw.position.set(side * 0.14, 1.55, 0.03);
    halluxClaw.rotation.x = -Math.PI * 0.58;
    statueGroup.add(halluxClaw);
  }

  statueGroup.add(
    plinthBase,
    plinthStep,
    plinth,
    plinthColonnettes,
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

  // Two Flanking Classical Courtyard Sculptures on Fluted Pedestals (South Plaza Lawn Approaches: X = ±6.4, Z = 21.8)
  // 1) West Monument (-6.4, 21.8): Classical Torch of Knowledge & Open Tome
  // 2) East Monument (+6.4, 21.8): Celestial Armillary Sphere of Sciences
  const monumentPedestalGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    const base = ensureNonIndexedFtn(new RoundedBoxGeometry(1.18, 0.18, 1.18, 2, 0.03));
    base.translate(0, 0.09, 0);
    const step = ensureNonIndexedFtn(new RoundedBoxGeometry(1.0, 0.12, 1.0, 2, 0.02));
    step.translate(0, 0.24, 0);
    const core = ensureNonIndexedFtn(buildFlutedColumnGeo(1.05, 0.26, 16));
    core.translate(0, 0.3, 0);
    const cap = ensureNonIndexedFtn(new RoundedBoxGeometry(1.04, 0.12, 1.04, 2, 0.025));
    cap.translate(0, 1.38, 0);
    parts.push(base, step, core, cap);
    return mergeGeometries(parts);
  })();

  for (const side of [-1, 1]) {
    const mx = side * 6.4;
    const mz = 21.8;
    const monGroup = new THREE.Group();
    monGroup.position.set(mx, 0, mz);

    const pedMesh = new THREE.Mesh(monumentPedestalGeo, mats.limestone);
    pedMesh.castShadow = true;
    pedMesh.receiveShadow = true;
    monGroup.add(pedMesh);

    const bronzeParts: THREE.BufferGeometry[] = [];
    if (side === -1) {
      // Sculpted Open Book of Wisdom + Laurel Ring + Fluted Torch with Sculpted Flame
      for (const pageSide of [-1, 1]) {
        const page = ensureNonIndexedFtn(new RoundedBoxGeometry(0.36, 0.05, 0.44, 2, 0.01));
        page.rotateZ(-pageSide * 0.22);
        page.translate(pageSide * 0.16, 1.48, 0);
        bronzeParts.push(page);
      }
      const torchShaft = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.08, 0.042, 0.62, 12));
      torchShaft.translate(0, 1.8, 0);
      const torchBowl = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.16, 0.07, 0.14, 12));
      torchBowl.translate(0, 2.14, 0);
      const torchWreath = ensureNonIndexedFtn(new THREE.TorusGeometry(0.18, 0.022, 8, 16));
      torchWreath.rotateX(Math.PI / 2);
      torchWreath.translate(0, 1.54, 0);
      // Twisted flame tongues
      for (let ft = 0; ft < 5; ft++) {
        const fAng = (ft / 5) * Math.PI * 2;
        const tongue = ensureNonIndexedFtn(new THREE.ConeGeometry(0.055, 0.28, 7));
        tongue.rotateX(0.18);
        tongue.rotateY(fAng);
        tongue.translate(Math.cos(fAng) * 0.03, 2.32, Math.sin(fAng) * 0.03);
        bronzeParts.push(tongue);
      }
      bronzeParts.push(torchShaft, torchBowl, torchWreath);
    } else {
      // Sculpted Celestial Armillary Sphere (Meridian, Ecliptic, Equator Rings, Central Globe & Axis Arrow)
      const standBase = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.18, 0.26, 0.12, 14));
      standBase.translate(0, 1.5, 0);
      const cradleArc = ensureNonIndexedFtn(new THREE.TorusGeometry(0.44, 0.026, 8, 24, Math.PI));
      cradleArc.rotateZ(Math.PI);
      cradleArc.translate(0, 1.98, 0);
      const meridianRing = ensureNonIndexedFtn(new THREE.TorusGeometry(0.4, 0.022, 8, 28));
      meridianRing.translate(0, 1.98, 0);
      const horizonRing = ensureNonIndexedFtn(new THREE.TorusGeometry(0.41, 0.024, 8, 28));
      horizonRing.rotateX(Math.PI / 2);
      horizonRing.translate(0, 1.98, 0);
      const eclipticRing = ensureNonIndexedFtn(new THREE.TorusGeometry(0.36, 0.02, 8, 24));
      eclipticRing.rotateX(0.41);
      eclipticRing.rotateY(0.55);
      eclipticRing.translate(0, 1.98, 0);
      const colureRing = ensureNonIndexedFtn(new THREE.TorusGeometry(0.36, 0.018, 8, 24));
      colureRing.rotateY(Math.PI / 2);
      colureRing.translate(0, 1.98, 0);
      const earthGlobe = ensureNonIndexedFtn(new THREE.SphereGeometry(0.11, 14, 12));
      earthGlobe.translate(0, 1.98, 0);
      const gnomonRod = ensureNonIndexedFtn(new THREE.CylinderGeometry(0.012, 0.012, 0.98, 6));
      gnomonRod.rotateZ(0.41);
      gnomonRod.translate(0, 1.98, 0);
      bronzeParts.push(
        standBase,
        cradleArc,
        meridianRing,
        horizonRing,
        eclipticRing,
        colureRing,
        earthGlobe,
        gnomonRod
      );
    }

    const bronzeSculpture = new THREE.Mesh(mergeGeometries(bronzeParts), mats.gold);
    bronzeSculpture.castShadow = true;
    monGroup.add(bronzeSculpture);
    group.add(monGroup);
    physics.addStaticBox(mx, 0.85, mz, 0.56, 0.85, 0.56);
  }

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

  // Courtyard & Campus Perimeter Oak Trees (LatheGeometry root-flared trunk + branches + multi-lobe crown)
  // Balanced layout: 6 inner courtyard oaks shading the lawn corners & oak bench pads (all walkways kept wide open)
  const treePositions: Array<[number, number, number]> = [
    // Inner courtyard: 6 oaks tucked beside the oak bench pads and flanking pergolas
    [-14.0, 0, 2.0],
    [14.0, 0, 2.0],
    [-13.2, 0, 9.8],
    [13.2, 0, 9.8],
    [-15.2, 0, 20.0],
    [15.2, 0, 20.0],
    // Campus perimeter framing (clear of parking, sports track & buildings)
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
    [-86, 0, -56],
    [88, 0, -56],
    [-88, 0, 22],
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
      10
    )
  );

  // Curved organic boughs & flared buttress root spurs via TubeGeometry along CatmullRomCurve3
  const makeBranchGeo = (pts: THREE.Vector3[], radius: number) =>
    ensureNonIndexed(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, radius, 6, false));

  const rootSpurs: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 4; r++) {
    const ang = (r * Math.PI) / 2 + 0.35;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    rootSpurs.push(
      makeBranchGeo(
        [
          new THREE.Vector3(ca * 0.22, 0.55, sa * 0.22),
          new THREE.Vector3(ca * 0.48, 0.22, sa * 0.48),
          new THREE.Vector3(ca * 0.78, 0.03, sa * 0.78),
        ],
        0.11
      )
    );
  }

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
    [new THREE.Vector3(0, 2.7, 0), new THREE.Vector3(-0.28, 3.38, -0.48), new THREE.Vector3(-0.68, 3.95, -0.82)],
    0.10
  );
  const trunkGeo = mergeGeometries([trunkBaseGeo, ...rootSpurs, branchA, branchB, branchC, branchD]);

  // Smooth organically perturbed multi-lobe foliage crown (5 lobes at detail 2 = smooth silhouette, low instance count)
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
    makeOrganicLeafLobe(1.88, 0, 4.35, 0, 0.5),
    makeOrganicLeafLobe(1.38, -1.12, 3.9, 0.48, 1.9),
    makeOrganicLeafLobe(1.34, 1.08, 3.98, -0.38, 3.4),
    makeOrganicLeafLobe(1.26, 0.18, 4.12, 1.0, 4.7),
    makeOrganicLeafLobe(1.28, -0.15, 5.25, -0.12, 6.1),
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
      const pitRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 8, 18), mats.limestone);
      pitRing.rotation.x = Math.PI / 2;
      pitRing.position.set(tx, 0.05, tz);
      const mulch = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.95, 0.05, 16), mats.woodDark);
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

  // Sculpted Gooseneck Courtyard Lamp Posts (Fluted base + scroll volute bracket + lantern cage)
  const lampBaseGeo = ensureNonIndexed(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.24, 0.0),
        new THREE.Vector2(0.24, 0.1),
        new THREE.Vector2(0.2, 0.22),
        new THREE.Vector2(0.14, 0.56),
        new THREE.Vector2(0.16, 0.64),
        new THREE.Vector2(0.085, 0.92),
        new THREE.Vector2(0.065, 3.45),
        new THREE.Vector2(0.095, 3.5),
        new THREE.Vector2(0.0, 3.56),
      ],
      14
    )
  );
  const lampArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.35, 0),
    new THREE.Vector3(0.12, 3.74, 0),
    new THREE.Vector3(0.45, 3.8, 0),
    new THREE.Vector3(0.56, 3.55, 0),
  ]);
  const lampArmGeo = ensureNonIndexed(new THREE.TubeGeometry(lampArmCurve, 14, 0.032, 8, false));
  const lampScrollCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, 3.05, 0),
    new THREE.Vector3(0.24, 3.22, 0),
    new THREE.Vector3(0.18, 3.42, 0),
    new THREE.Vector3(0.38, 3.65, 0),
  ]);
  const lampScrollGeo = ensureNonIndexed(new THREE.TubeGeometry(lampScrollCurve, 12, 0.018, 6, false));
  const lampCapGeo = ensureNonIndexed(new THREE.ConeGeometry(0.22, 0.18, 8));
  lampCapGeo.translate(0.56, 3.54, 0);
  const lampFinialGeo = ensureNonIndexed(new THREE.SphereGeometry(0.035, 8, 6));
  lampFinialGeo.translate(0.56, 3.65, 0);
  const lampIronMergedGeo = mergeGeometries([lampBaseGeo, lampArmGeo, lampScrollGeo, lampCapGeo, lampFinialGeo]);

  for (const [lx, lz] of [
    [-3.8, 8.8],
    [3.8, 8.8],
    [-4.2, 21.5],
    [4.2, 21.5],
  ]) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lx, 0, lz);
    lampGroup.rotation.y = lx < 0 ? 0 : Math.PI;

    const post = new THREE.Mesh(lampIronMergedGeo, mats.navy);
    post.castShadow = true;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), mats.neonCeiling);
    globe.position.set(0.56, 3.36, 0);
    const brassCollar = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 6, 12), mats.gold);
    brassCollar.rotation.x = Math.PI / 2;
    brassCollar.position.set(0, 0.64, 0);

    lampGroup.add(post, globe, brassCollar);
    group.add(lampGroup);
    physics.addStaticBox(lx, 1.8, lz, 0.2, 1.8, 0.2);
  }

  // Brick Flower Planters with Boxwood Hedges & Instanced Blossoms flanking Entrance Walkway
  const flowerCoords: Array<{ x: number; y: number; z: number; scale: number; colorIdx: number }> = [];
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

    for (let f = 0; f < 14; f++) {
      const fx = px - 1.45 + f * 0.223;
      const fz = pz + ((f % 3) - 1) * 0.34;
      flowerCoords.push({
        x: fx,
        y: 0.95 + (f % 2) * 0.03,
        z: fz,
        scale: 0.95 + (f % 3) * 0.12,
        colorIdx: f,
      });
    }
  }

  // Limestone & Cedar Flower Planters flanking Courtyard Pergola Alcoves, Plaza Benches & Oak Bench Pads
  const benchPlanterSpots: Array<{ x: number; z: number; rotY: number }> = [
    // Flanking West & East Pergola entrances (clear of E-W walkway curb at Z=11.66)
    { x: -11.75, z: 10.55, rotY: 0 },
    { x: -5.85, z: 10.55, rotY: 0 },
    { x: 5.85, z: 10.55, rotY: 0 },
    { x: 11.75, z: 10.55, rotY: 0 },
    // Flanking Central Plaza Benches on the grass verge
    { x: -5.35, z: 19.55, rotY: 0.4 },
    { x: 5.35, z: 19.55, rotY: -0.4 },
    // Flanking Under-Oak Bench Pads
    { x: -16.15, z: 4.25, rotY: 0.25 },
    { x: 16.15, z: 4.25, rotY: -0.25 },
    { x: -17.15, z: 22.15, rotY: -0.25 },
    { x: 17.15, z: 22.15, rotY: 0.25 },
    // Flanking Covered South Walkway Benches
    { x: -9.55, z: 27.75, rotY: 0 },
    { x: 9.55, z: 27.75, rotY: 0 },
  ];

  const bpBaseGeo = ensureNonIndexed(new RoundedBoxGeometry(0.84, 0.36, 0.84, 2, 0.03));
  bpBaseGeo.translate(0, 0.18, 0);
  const bpRimGeo = ensureNonIndexed(new RoundedBoxGeometry(0.92, 0.07, 0.92, 2, 0.02));
  bpRimGeo.translate(0, 0.38, 0);
  const bpBoxGeo = mergeGeometries([bpBaseGeo, bpRimGeo]);
  const bpSoilGeo = new THREE.BoxGeometry(0.74, 0.06, 0.74);
  bpSoilGeo.translate(0, 0.36, 0);
  const bpMoundGeo = mergeGeometries([
    makeOrganicLeafLobe(0.28, 0, 0.44, 0, 0.8),
    makeOrganicLeafLobe(0.19, -0.17, 0.41, 0.14, 2.2),
    makeOrganicLeafLobe(0.19, 0.17, 0.41, -0.14, 3.7),
  ]);

  const bpBoxes = new THREE.InstancedMesh(bpBoxGeo, mats.limestone, benchPlanterSpots.length);
  const bpSoils = new THREE.InstancedMesh(bpSoilGeo, mats.woodDark, benchPlanterSpots.length);
  const bpMounds = new THREE.InstancedMesh(bpMoundGeo, mats.foliage, benchPlanterSpots.length);
  bpBoxes.castShadow = true;
  bpBoxes.receiveShadow = true;
  bpMounds.castShadow = true;

  benchPlanterSpots.forEach((p, idx) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    bpBoxes.setMatrixAt(idx, dummy.matrix);
    bpSoils.setMatrixAt(idx, dummy.matrix);
    bpMounds.setMatrixAt(idx, dummy.matrix);

    physics.addStaticBox(p.x, 0.25, p.z, 0.46, 0.25, 0.46);

    // 7 colorful blossoms nestled across each bench planter's foliage mound
    const offsets: Array<[number, number, number]> = [
      [0, 0.62, 0],
      [-0.19, 0.56, 0.15],
      [0.19, 0.56, -0.15],
      [-0.16, 0.55, -0.17],
      [0.17, 0.55, 0.16],
      [0.02, 0.57, 0.23],
      [-0.03, 0.57, -0.23],
    ];
    offsets.forEach(([ox, oy, oz], oi) => {
      const cosR = Math.cos(p.rotY);
      const sinR = Math.sin(p.rotY);
      flowerCoords.push({
        x: p.x + ox * cosR + oz * sinR,
        y: oy,
        z: p.z - ox * sinR + oz * cosR,
        scale: 0.85 + ((idx + oi) % 3) * 0.12,
        colorIdx: idx * 3 + oi,
      });
    });
  });

  bpBoxes.instanceMatrix.needsUpdate = true;
  bpSoils.instanceMatrix.needsUpdate = true;
  bpMounds.instanceMatrix.needsUpdate = true;
  bpBoxes.computeBoundingSphere();
  bpSoils.computeBoundingSphere();
  bpMounds.computeBoundingSphere();
  group.add(bpBoxes, bpSoils, bpMounds);

  // Shared Multi-Petal Instanced Flowers across all brick & courtyard bench planters (3 draw calls total!)
  const petalParts: THREE.BufferGeometry[] = [];
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    const petal = ensureNonIndexed(new THREE.SphereGeometry(0.052, 6, 4));
    petal.scale(0.85, 0.38, 1.35);
    petal.rotateX(-0.28);
    petal.rotateY(a);
    petal.translate(Math.sin(a) * 0.055, 0.06, Math.cos(a) * 0.055);
    petalParts.push(petal);
  }
  const blossomPetalGeo = mergeGeometries(petalParts);
  const blossomCenterGeo = new THREE.SphereGeometry(0.036, 7, 5);
  blossomCenterGeo.translate(0, 0.068, 0);
  const blossomStemGeo = ensureNonIndexed(new THREE.CylinderGeometry(0.008, 0.011, 0.09, 5));
  blossomStemGeo.translate(0, 0.02, 0);

  const petalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.02 });
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4, metalness: 0.04 });

  const blossomPetals = new THREE.InstancedMesh(blossomPetalGeo, petalMat, flowerCoords.length);
  const blossomCenters = new THREE.InstancedMesh(blossomCenterGeo, centerMat, flowerCoords.length);
  const blossomStems = new THREE.InstancedMesh(blossomStemGeo, mats.foliage, flowerCoords.length);
  const flowerPalette = [0xf43f5e, 0xf59e0b, 0xfbbf24, 0xf472b6, 0x8b5cf6, 0xfb7185, 0xfff7ed];

  flowerCoords.forEach((fc, i) => {
    dummy.position.set(fc.x, fc.y, fc.z);
    dummy.rotation.set(((i % 5) - 2) * 0.06, i * 1.3, (((i + 2) % 5) - 2) * 0.06);
    dummy.scale.setScalar(fc.scale);
    dummy.updateMatrix();
    blossomPetals.setMatrixAt(i, dummy.matrix);
    blossomCenters.setMatrixAt(i, dummy.matrix);
    blossomStems.setMatrixAt(i, dummy.matrix);
    tint.setHex(flowerPalette[fc.colorIdx % flowerPalette.length]);
    blossomPetals.setColorAt(i, tint);
  });
  blossomPetals.instanceMatrix.needsUpdate = true;
  blossomCenters.instanceMatrix.needsUpdate = true;
  blossomStems.instanceMatrix.needsUpdate = true;
  if (blossomPetals.instanceColor) blossomPetals.instanceColor.needsUpdate = true;
  blossomPetals.computeBoundingSphere();
  blossomCenters.computeBoundingSphere();
  blossomStems.computeBoundingSphere();
  group.add(blossomPetals, blossomCenters, blossomStems);
  // Outdoor Slatted Timber Picnic Tables with Tubular Steel A-Frames on East & West Courtyard Lawns
  const picnicWoodParts: THREE.BufferGeometry[] = [];
  for (let p = -2; p <= 2; p++) {
    const plank = ensureNonIndexed(new RoundedBoxGeometry(2.12, 0.048, 0.17, 2, 0.012));
    plank.translate(0, 0.76, p * 0.19);
    picnicWoodParts.push(plank);
  }
  for (const sz of [-0.78, 0.78]) {
    for (const sp of [-0.08, 0.08]) {
      const seatSlat = ensureNonIndexed(new RoundedBoxGeometry(2.12, 0.045, 0.145, 2, 0.01));
      seatSlat.translate(0, 0.44, sz + sp);
      picnicWoodParts.push(seatSlat);
    }
  }
  const picnicWoodGeo = mergeGeometries(picnicWoodParts);

  const picnicFrameParts: THREE.BufferGeometry[] = [];
  for (const sx of [-0.75, 0.75]) {
    const legA = ensureNonIndexed(new THREE.CylinderGeometry(0.032, 0.032, 0.86, 8));
    legA.rotateX(0.38);
    legA.translate(sx, 0.38, -0.35);
    const legB = ensureNonIndexed(new THREE.CylinderGeometry(0.032, 0.032, 0.86, 8));
    legB.rotateX(-0.38);
    legB.translate(sx, 0.38, 0.35);
    const tie = ensureNonIndexed(new RoundedBoxGeometry(0.06, 0.055, 1.68, 2, 0.01));
    tie.translate(sx, 0.4, 0);
    picnicFrameParts.push(legA, legB, tie);
  }
  const picnicFrameGeo = mergeGeometries(picnicFrameParts);

  for (const [tx, tz] of [
    [-10.6, 19.2],
    [10.6, 19.2],
  ]) {
    const pt = new THREE.Group();
    pt.position.set(tx, 0, tz);
    const woodMesh = new THREE.Mesh(picnicWoodGeo, mats.woodDesk);
    woodMesh.castShadow = true;
    woodMesh.receiveShadow = true;
    const frameMesh = new THREE.Mesh(picnicFrameGeo, mats.navy);
    frameMesh.castShadow = true;
    pt.add(woodMesh, frameMesh);
    group.add(pt);
    physics.addStaticBox(tx, 0.42, tz, 1.1, 0.42, 0.95);
  }

  // Sculpted Wrought-Iron Ribbed Courtyard Trash / Recycling Bins with Domed Rain Hoods
  const binParts: THREE.BufferGeometry[] = [
    (() => {
      const core = ensureNonIndexed(new THREE.CylinderGeometry(0.22, 0.19, 0.76, 14));
      core.translate(0, 0.38, 0);
      return core;
    })(),
    (() => {
      const hood = ensureNonIndexed(new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45));
      hood.translate(0, 0.86, 0);
      return hood;
    })(),
  ];
  for (let r = 0; r < 10; r++) {
    const ang = (r / 10) * Math.PI * 2;
    const rib = ensureNonIndexed(new RoundedBoxGeometry(0.024, 0.74, 0.032, 2, 0.006));
    rib.rotateY(-ang);
    rib.translate(Math.cos(ang) * 0.215, 0.39, Math.sin(ang) * 0.215);
    binParts.push(rib);
  }
  const binMergedGeo = mergeGeometries(binParts);
  const binRimGeo = new THREE.TorusGeometry(0.235, 0.026, 8, 16);
  for (const [bx, bz] of [
    [-3.6, 10.2],
    [3.6, 10.2],
    [-3.6, 20.8],
    [3.6, 20.8],
  ]) {
    const bin = new THREE.Mesh(binMergedGeo, mats.navy);
    bin.position.set(bx, 0, bz);
    bin.castShadow = true;
    const rim = new THREE.Mesh(binRimGeo, mats.gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(bx, 0.77, bz);
    group.add(bin, rim);
    physics.addStaticBox(bx, 0.4, bz, 0.26, 0.4, 0.26);
  }

  // Pitched-Roof Campus Welcome Kiosk near South Covered Walkway (X = 8.5, Z = 23.6) with carved timber braces & finial
  const kiosk = new THREE.Group();
  kiosk.position.set(8.5, 0, 23.6);
  kiosk.rotation.y = -0.35;
  for (const kx of [-0.95, 0.95]) {
    const kBase = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.26, 0.24, 2, 0.03), mats.limestone);
    kBase.position.set(kx, 0.13, 0);
    const kPost = new THREE.Mesh(new RoundedBoxGeometry(0.13, 2.3, 0.13, 2, 0.02), mats.woodDark);
    kPost.position.set(kx, 1.15, 0);
    kPost.castShadow = true;
    const kBrace = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.42, 0.08, 2, 0.015), mats.woodDark);
    kBrace.position.set(kx - Math.sign(kx) * 0.16, 2.08, 0);
    kBrace.rotation.z = Math.sign(kx) * 0.72;
    kiosk.add(kBase, kPost, kBrace);
  }
  const kioskFrame = new THREE.Mesh(new RoundedBoxGeometry(1.94, 1.18, 0.08, 2, 0.02), mats.woodDark);
  kioskFrame.position.set(0, 1.48, 0);
  const kioskBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 1.06, 0.11),
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
  const kioskFinial = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), mats.gold);
  kioskFinial.position.set(0, 2.74, 0);
  kiosk.add(kioskFrame, kioskBoard, kioskRoof, kioskFinial);
  group.add(kiosk);
  physics.addStaticBox(8.5, 1.1, 23.6, 1.05, 1.1, 0.25, -0.35);

  ctx.scene.add(group);
  return group;
}
