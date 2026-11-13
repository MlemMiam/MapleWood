import * as THREE from 'three';

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface HumanoidRig {
  root: THREE.Group;
  headPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  bodyGroup: THREE.Group;
}

export type AnimState = 'idle' | 'walk' | 'run' | 'jump' | 'interact';

export interface HumanoidColors {
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
  accent?: string;
}

export function createHumanoidRig(colors: HumanoidColors, hasBackpack = false): HumanoidRig {
  const root = new THREE.Group();

  // Soft radial contact shadow disc grounded at bottom-center
  const shadowGeo = new THREE.CircleGeometry(0.42, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x090d16,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  root.add(shadow);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const shirtMat = new THREE.MeshStandardMaterial({ color: colors.shirt, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: colors.pants, roughness: 0.82 });
  const skinMat = new THREE.MeshStandardMaterial({ color: colors.skin, roughness: 0.58 });
  const hairMat = new THREE.MeshStandardMaterial({ color: colors.hair, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.68 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: colors.accent || '#D4AF37',
    roughness: 0.36,
    metalness: 0.3,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25 });

  // Sculpted Legs & Sneakers (pivot at hip y = 0.84)
  const legGeo = new THREE.CapsuleGeometry(0.088, 0.52, 6, 12);
  const soleGeo = new RoundedBoxGeometry(0.165, 0.045, 0.25, 2, 0.02);
  const upperShoeGeo = new RoundedBoxGeometry(0.155, 0.065, 0.21, 2, 0.025);
  const toeCapGeo = new THREE.SphereGeometry(0.076, 10, 8);

  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.84, 0);

    const legMesh = new THREE.Mesh(legGeo, pantsMat);
    legMesh.position.y = -0.36;
    legMesh.castShadow = true;

    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -0.81, -0.025);
    const upperShoe = new THREE.Mesh(upperShoeGeo, shoeMat);
    upperShoe.position.set(0, -0.765, -0.015);
    upperShoe.castShadow = true;
    const toeCap = new THREE.Mesh(toeCapGeo, soleMat);
    toeCap.scale.set(0.95, 0.65, 1.05);
    toeCap.position.set(0, -0.77, -0.1);

    legPivot.add(legMesh, sole, upperShoe, toeCap);
    bodyGroup.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.115);
  const rightLeg = makeLeg(0.115);

  // Sculpted Lathe Torso (y = 0.82 .. 1.41) — tapered waist, broad chest & rounded shoulders
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18, 0.0),
    new THREE.Vector2(0.19, 0.07),
    new THREE.Vector2(0.175, 0.22),
    new THREE.Vector2(0.222, 0.42),
    new THREE.Vector2(0.236, 0.51),
    new THREE.Vector2(0.17, 0.575),
    new THREE.Vector2(0.08, 0.59),
    new THREE.Vector2(0.0, 0.59),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 16);
  torsoGeo.scale(1.12, 1.0, 0.68);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.y = 0.82;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Ribbed varsity waist band, collar ring, chest crest & front placket
  const waistBand = new THREE.Mesh(new THREE.CylinderGeometry(0.198, 0.194, 0.06, 16), accentMat);
  waistBand.scale.set(1.16, 1, 0.72);
  waistBand.position.y = 0.855;
  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.026, 8, 16), accentMat);
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, 1.4, 0.005);
  const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.015, 6), accentMat);
  crest.rotation.x = Math.PI / 2;
  crest.position.set(0.105, 1.24, -0.145);
  const zipperLine = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.5, 0.02, 1, 0.006), accentMat);
  zipperLine.position.set(0, 1.12, -0.145);
  bodyGroup.add(waistBand, collarRing, crest, zipperLine);

  // Sculpted Backpack with pocket, top loop & shoulder straps
  if (hasBackpack) {
    const pack = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.39, 0.14, 3, 0.04), accentMat);
    pack.position.set(0, 1.14, 0.18);
    pack.castShadow = true;
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.18, 0.06, 2, 0.025), shirtMat);
    pocket.position.set(0, 1.06, 0.245);
    const loopGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.04, 1.32, 0.17),
        new THREE.Vector3(0, 1.38, 0.18),
        new THREE.Vector3(0.04, 1.32, 0.17),
      ]),
      8,
      0.012,
      6,
      false
    );
    const topLoop = new THREE.Mesh(loopGeo, shoeMat);
    bodyGroup.add(pack, pocket, topLoop);

    for (const sx of [-0.11, 0.11]) {
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx, 1.34, 0.12),
        new THREE.Vector3(sx * 1.15, 1.39, -0.02),
        new THREE.Vector3(sx * 1.15, 1.16, -0.13),
        new THREE.Vector3(sx * 1.1, 0.96, 0.12),
      ]);
      const strap = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 12, 0.018, 6, false), shoeMat);
      bodyGroup.add(strap);
    }
  }

  // Sculpted Arms (pivot tucked cleanly into sloped shoulders at y = 1.295)
  const shoulderGeo = new THREE.SphereGeometry(0.056, 10, 10);
  const sleeveGeo = new THREE.CapsuleGeometry(0.062, 0.29, 6, 10);
  const cuffGeo = new THREE.CylinderGeometry(0.06, 0.056, 0.045, 10);
  const palmGeo = new RoundedBoxGeometry(0.085, 0.095, 0.075, 2, 0.03);

  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.295, 0);

    const shoulder = new THREE.Mesh(shoulderGeo, shirtMat);
    const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
    sleeve.position.y = -0.175;
    sleeve.castShadow = true;
    const cuff = new THREE.Mesh(cuffGeo, accentMat);
    cuff.position.y = -0.355;
    const hand = new THREE.Mesh(palmGeo, skinMat);
    hand.position.y = -0.435;

    armPivot.add(shoulder, sleeve, cuff, hand);
    bodyGroup.add(armPivot);
    return armPivot;
  };
  const leftArm = makeArm(-0.242);
  const rightArm = makeArm(0.242);

  // Sculpted Head, Neck, Facial Features & Layered Organic Hair (pivot at neck y = 1.41)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.41, 0);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.1, 10), skinMat);
  neck.position.y = 0.04;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), skinMat);
  skull.scale.set(0.94, 1.09, 0.98);
  skull.position.y = 0.19;
  skull.castShadow = true;

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinMat);
  nose.scale.set(0.85, 1.1, 1.3);
  nose.position.set(0, 0.185, -0.142);

  for (const ex of [-0.135, 0.135]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), skinMat);
    ear.scale.set(0.55, 1.1, 0.8);
    ear.position.set(ex, 0.185, 0.01);
    headPivot.add(ear);
  }

  for (const ex of [-0.048, 0.048]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeWhiteMat);
    sclera.scale.set(1.0, 0.85, 0.55);
    sclera.position.set(ex, 0.21, -0.128);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), pupilMat);
    pupil.position.set(ex, 0.21, -0.138);
    const brow = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.012, 0.016, 1, 0.004), hairMat);
    brow.position.set(ex, 0.242, -0.128);
    headPivot.add(sclera, pupil, brow);
  }

  // Sculpted organic hair crown + swept back + fringe wave
  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.156, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hairCrown.scale.set(0.96, 1.02, 1.02);
  hairCrown.position.set(0, 0.205, 0.012);
  hairCrown.rotation.x = 0.14;
  hairCrown.castShadow = true;

  const hairNape = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.15, 0.11, 3, 0.045), hairMat);
  hairNape.position.set(0, 0.18, 0.095);

  const hairFringe = new THREE.Mesh(new RoundedBoxGeometry(0.23, 0.055, 0.1, 2, 0.025), hairMat);
  hairFringe.position.set(0.01, 0.295, -0.075);
  hairFringe.rotation.set(0.22, 0, -0.08);

  headPivot.add(neck, skull, nose, hairCrown, hairNape, hairFringe);
  bodyGroup.add(headPivot);

  return { root, headPivot, leftArm, rightArm, leftLeg, rightLeg, bodyGroup };
}

export function animateHumanoid(
  rig: HumanoidRig,
  state: AnimState,
  phase: number,
  interactTimer: number,
  dt: number
): void {
  const damp = 1 - Math.exp(-14 * dt);

  let targetLegAmp = 0;
  let targetArmAmp = 0;
  let targetBob = 0;

  if (state === 'walk') {
    targetLegAmp = 0.52;
    targetArmAmp = 0.42;
    targetBob = (-Math.cos(phase * 2) * 0.5 + 0.5) * 0.032;
  } else if (state === 'run') {
    targetLegAmp = 0.88;
    targetArmAmp = 0.78;
    targetBob = (-Math.cos(phase * 2) * 0.5 + 0.5) * 0.068;
  } else if (state === 'jump') {
    rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0.45, damp);
    rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, -0.35, damp);
    rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, -0.6, damp);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -0.6, damp);
    return;
  }

  const legSwing = Math.sin(phase) * targetLegAmp;
  const armSwing = Math.sin(phase - 0.14) * targetArmAmp;

  rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, legSwing, damp);
  rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, -legSwing, damp);
  rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, -armSwing, damp);

  if (interactTimer > 0) {
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -1.15, damp);
  } else {
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, armSwing, damp);
  }

  const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
  const idleBreath = state === 'idle' ? Math.sin(nowSec * 2.1) * 0.01 : 0;
  rig.bodyGroup.position.y = THREE.MathUtils.lerp(
    rig.bodyGroup.position.y,
    targetBob + idleBreath,
    damp
  );
  rig.bodyGroup.rotation.z = THREE.MathUtils.lerp(
    rig.bodyGroup.rotation.z,
    state === 'walk' || state === 'run' ? Math.sin(phase) * 0.025 : 0,
    damp
  );
}

export function animateHumanoidIntro(
  rig: HumanoidRig,
  introTime: number,
  dt: number
): void {
  const damp = 1 - Math.exp(-12 * dt);
  const isWavePhase = introTime < 4.8;
  const bounce = Math.abs(Math.sin(introTime * 5.2)) * 0.025;

  rig.bodyGroup.position.y = THREE.MathUtils.lerp(rig.bodyGroup.position.y, bounce, damp);
  rig.headPivot.rotation.z = THREE.MathUtils.lerp(
    rig.headPivot.rotation.z,
    isWavePhase ? 0.14 : -0.1,
    damp
  );
  rig.headPivot.rotation.y = THREE.MathUtils.lerp(
    rig.headPivot.rotation.y,
    isWavePhase ? 0 : -0.35,
    damp
  );

  if (isWavePhase) {
    const waveOsc = Math.sin(introTime * 9.5);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -2.4, damp);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.35 + waveOsc * 0.28, damp);
  } else {
    const beckonOsc = Math.sin((introTime - 4.8) * 7.5);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(
      rig.rightArm.rotation.x,
      -1.35 + beckonOsc * 0.35,
      damp
    );
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0.15, damp);
  }
}

/**
 * Builds the bespoke sculpted 3D avatar for Florie (our protagonist):
 * - Long flowing auburn-chestnut hair with twin front side-locks, bangs & golden hair ribbon
 * - Maplewood High tailored navy blazer, white sailor/shirt collar & crimson silk ribbon bow
 * - 14-pleat sculpted school skirt with gold trim, navy knee-high socks & varsity shoes
 */
export function createFlorieRig(): HumanoidRig {
  const root = new THREE.Group();
  root.name = 'FlorieProtagonist';

  // Soft radial contact shadow disc grounded at bottom-center
  const shadowGeo = new THREE.CircleGeometry(0.42, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x090d16,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  root.add(shadow);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const blazerMat = new THREE.MeshStandardMaterial({ color: '#1F3864', roughness: 0.65 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: '#162847', roughness: 0.72 });
  const shirtWhiteMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.55 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: '#E11D48', roughness: 0.42 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#F6D2BA', roughness: 0.52 });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#5A2D22', roughness: 0.68 });
  const sockMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.75 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: '#3B231A', roughness: 0.42 });
  const soleMat = new THREE.MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#D4AF37',
    roughness: 0.32,
    metalness: 0.45,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25 });
  const irisMat = new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.22 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.2 });

  // 1) Sculpted Legs with Navy Knee-High Socks & Loafers (hip pivot at y = 0.82)
  const upperLegGeo = new THREE.CylinderGeometry(0.068, 0.056, 0.34, 12);
  const lowerSockGeo = new THREE.CylinderGeometry(0.055, 0.044, 0.38, 12);
  const soleGeo = new RoundedBoxGeometry(0.145, 0.04, 0.235, 2, 0.018);
  const loaferGeo = new RoundedBoxGeometry(0.138, 0.062, 0.205, 2, 0.024);

  const makeFlorieLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.82, 0);

    const thigh = new THREE.Mesh(upperLegGeo, skinMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;

    const kneeSock = new THREE.Mesh(lowerSockGeo, sockMat);
    kneeSock.position.y = -0.52;
    kneeSock.castShadow = true;

    const sockTrim = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.008, 6, 14), goldMat);
    sockTrim.rotation.x = Math.PI / 2;
    sockTrim.position.y = -0.35;

    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -0.79, -0.022);
    const loafer = new THREE.Mesh(loaferGeo, shoeMat);
    loafer.position.set(0, -0.75, -0.015);
    loafer.castShadow = true;
    const buckle = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.016, 0.02, 1, 0.004), goldMat);
    buckle.position.set(0, -0.728, -0.09);

    legPivot.add(thigh, kneeSock, sockTrim, sole, loafer, buckle);
    bodyGroup.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeFlorieLeg(-0.1);
  const rightLeg = makeFlorieLeg(0.1);

  // 2) Sculpted 14-Pleat Maplewood School Skirt (y = 0.68 .. 0.92)
  const skirtCoreGeo = new THREE.CylinderGeometry(0.155, 0.245, 0.25, 18);
  skirtCoreGeo.scale(1.08, 1.0, 0.82);
  const skirtCore = new THREE.Mesh(skirtCoreGeo, skirtMat);
  skirtCore.position.y = 0.8;
  skirtCore.castShadow = true;
  bodyGroup.add(skirtCore);

  for (let p = 0; p < 14; p++) {
    const ang = (p / 14) * Math.PI * 2;
    const pleat = new THREE.Mesh(
      new RoundedBoxGeometry(0.052, 0.24, 0.032, 1, 0.008),
      skirtMat
    );
    pleat.position.set(Math.cos(ang) * 0.2 * 1.08, 0.8, Math.sin(ang) * 0.2 * 0.82);
    pleat.rotation.y = -ang;
    pleat.rotation.x = 0.28;
    bodyGroup.add(pleat);
  }

  const skirtGoldHem = new THREE.Mesh(new THREE.TorusGeometry(0.242, 0.011, 8, 24), goldMat);
  skirtGoldHem.rotation.x = Math.PI / 2;
  skirtGoldHem.scale.set(1.08, 0.82, 1.0);
  skirtGoldHem.position.y = 0.695;
  bodyGroup.add(skirtGoldHem);

  // 3) Tailored Blazer Torso + White Shirt Collar + Crimson Silk Ribbon Bow (y = 0.88 .. 1.38)
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.155, 0.0),
    new THREE.Vector2(0.145, 0.14),
    new THREE.Vector2(0.185, 0.34),
    new THREE.Vector2(0.195, 0.44),
    new THREE.Vector2(0.145, 0.5),
    new THREE.Vector2(0.07, 0.52),
    new THREE.Vector2(0.0, 0.52),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 16);
  torsoGeo.scale(1.06, 1.0, 0.68);
  const torso = new THREE.Mesh(torsoGeo, blazerMat);
  torso.position.y = 0.87;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // White V-neck shirt insert & collar
  const shirtInsert = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.04, 0.22, 10),
    shirtWhiteMat
  );
  shirtInsert.position.set(0, 1.28, -0.088);
  shirtInsert.scale.set(1.1, 1.0, 0.65);

  // Crimson silk ribbon bow at the collar
  const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), ribbonMat);
  bowCenter.position.set(0, 1.29, -0.132);
  for (const side of [-1, 1]) {
    const bowLoop = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.068, 6), ribbonMat);
    bowLoop.rotation.z = side * (Math.PI / 2 - 0.25);
    bowLoop.position.set(side * 0.032, 1.295, -0.13);
    const bowTail = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.095, 0.01, 1, 0.004), ribbonMat);
    bowTail.position.set(side * 0.02, 1.24, -0.132);
    bowTail.rotation.z = -side * 0.22;
    bodyGroup.add(bowLoop, bowTail);
  }

  // Gold Maplewood Eagle crest on left chest & gold blazer buttons
  const chestCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 6), goldMat);
  chestCrest.rotation.x = Math.PI / 2;
  chestCrest.position.set(0.095, 1.2, -0.128);
  const btn1 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), goldMat);
  btn1.position.set(0, 1.11, -0.13);
  const btn2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), goldMat);
  btn2.position.set(0, 1.01, -0.122);
  bodyGroup.add(shirtInsert, bowCenter, chestCrest, btn1, btn2);

  // Compact Maplewood Satchel Backpack
  const satchel = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.32, 0.12, 3, 0.035), goldMat);
  satchel.position.set(0, 1.12, 0.155);
  satchel.castShadow = true;
  const satchelFlap = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.14, 0.13, 2, 0.025), blazerMat);
  satchelFlap.position.set(0, 1.2, 0.158);
  bodyGroup.add(satchel, satchelFlap);

  // 4) Sculpted Arms (pivot at y = 1.28)
  const shoulderGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const sleeveGeo = new THREE.CapsuleGeometry(0.052, 0.27, 6, 10);
  const cuffGeo = new THREE.CylinderGeometry(0.052, 0.048, 0.04, 10);
  const handGeo = new THREE.SphereGeometry(0.042, 10, 8);

  const makeFlorieArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.28, 0);

    const shoulder = new THREE.Mesh(shoulderGeo, blazerMat);
    const sleeve = new THREE.Mesh(sleeveGeo, blazerMat);
    sleeve.position.y = -0.165;
    sleeve.castShadow = true;
    const cuff = new THREE.Mesh(cuffGeo, shirtWhiteMat);
    cuff.position.y = -0.33;
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.scale.set(0.85, 1.15, 0.78);
    hand.position.y = -0.395;

    armPivot.add(shoulder, sleeve, cuff, hand);
    bodyGroup.add(armPivot);
    return armPivot;
  };
  const leftArm = makeFlorieArm(-0.21);
  const rightArm = makeFlorieArm(0.21);

  // 5) Sculpted Head, Expressive Anime/VRM Eyes & Long Flowing Hair with Ribbon (neck pivot at y = 1.38)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.38, 0);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.09, 10), skinMat);
  neck.position.y = 0.035;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.142, 18, 16), skinMat);
  skull.scale.set(0.95, 1.05, 0.96);
  skull.position.y = 0.185;
  skull.castShadow = true;

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), skinMat);
  nose.scale.set(0.8, 1.0, 1.25);
  nose.position.set(0, 0.175, -0.136);

  for (const ex of [-0.048, 0.048]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), eyeWhiteMat);
    sclera.scale.set(1.05, 0.95, 0.5);
    sclera.position.set(ex, 0.195, -0.124);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), irisMat);
    iris.scale.set(1.0, 1.05, 0.45);
    iris.position.set(ex, 0.195, -0.132);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), pupilMat);
    pupil.position.set(ex, 0.195, -0.137);
    const lash = new THREE.Mesh(new RoundedBoxGeometry(0.046, 0.01, 0.014, 1, 0.003), hairMat);
    lash.position.set(ex, 0.222, -0.126);
    lash.rotation.z = ex < 0 ? 0.08 : -0.08;
    headPivot.add(sclera, iris, pupil, lash);
  }

  // Hair Crown + Swept Bangs + Long Flowing Back Cascade + Twin Front Side-Locks + Gold Hair Ribbon
  const hairDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.154, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairDome.scale.set(0.98, 1.04, 1.02);
  hairDome.position.set(0, 0.2, 0.008);
  hairDome.rotation.x = 0.12;
  hairDome.castShadow = true;

  // Sculpted front bangs (frange)
  const centerBang = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.13, 8), hairMat);
  centerBang.rotation.x = Math.PI + 0.28;
  centerBang.scale.set(1.3, 1.0, 0.45);
  centerBang.position.set(0, 0.265, -0.122);
  for (const bx of [-0.065, 0.065]) {
    const sideBang = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 8), hairMat);
    sideBang.rotation.x = Math.PI + 0.24;
    sideBang.rotation.z = bx < 0 ? -0.22 : 0.22;
    sideBang.scale.set(1.2, 1.0, 0.45);
    sideBang.position.set(bx, 0.26, -0.112);
    headPivot.add(sideBang);
  }

  // Long flowing back hair cascade reaching mid-back
  const backHairMain = new THREE.Mesh(
    new RoundedBoxGeometry(0.27, 0.48, 0.11, 3, 0.048),
    hairMat
  );
  backHairMain.position.set(0, 0.02, 0.095);
  backHairMain.rotation.x = 0.12;
  backHairMain.castShadow = true;

  // Twin front side-locks framing Florie's face
  for (const lx of [-0.128, 0.128]) {
    const sideLockCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(lx, 0.22, -0.04),
      new THREE.Vector3(lx * 1.06, 0.1, -0.075),
      new THREE.Vector3(lx * 0.96, -0.04, -0.095),
      new THREE.Vector3(lx * 0.88, -0.15, -0.085),
    ]);
    const sideLock = new THREE.Mesh(
      new THREE.TubeGeometry(sideLockCurve, 10, 0.028, 7, false),
      hairMat
    );
    sideLock.castShadow = true;
    headPivot.add(sideLock);
  }

  // Signature Golden Hair Ribbon Bow at the crown/back
  const hairBowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), goldMat);
  hairBowCenter.position.set(0, 0.24, 0.148);
  for (const side of [-1, 1]) {
    const hairWing = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.095, 7), goldMat);
    hairWing.rotation.z = side * (Math.PI / 2 - 0.18);
    hairWing.position.set(side * 0.048, 0.248, 0.148);
    headPivot.add(hairWing);
  }

  headPivot.add(neck, skull, nose, hairDome, centerBang, backHairMain, hairBowCenter);
  bodyGroup.add(headPivot);

  return { root, headPivot, leftArm, rightArm, leftLeg, rightLeg, bodyGroup };
}

