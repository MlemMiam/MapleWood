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
    targetLegAmp = 0.55;
    targetArmAmp = 0.45;
    targetBob = Math.abs(Math.sin(phase)) * 0.04;
  } else if (state === 'run') {
    targetLegAmp = 0.92;
    targetArmAmp = 0.82;
    targetBob = Math.abs(Math.sin(phase)) * 0.075;
  } else if (state === 'jump') {
    rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0.45, damp);
    rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, -0.35, damp);
    rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, -0.6, damp);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -0.6, damp);
    return;
  }

  const legSwing = Math.sin(phase) * targetLegAmp;
  const armSwing = Math.sin(phase) * targetArmAmp;

  rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, legSwing, damp);
  rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, -legSwing, damp);
  rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, -armSwing, damp);

  if (interactTimer > 0) {
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -1.15, damp);
  } else {
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, armSwing, damp);
  }

  const idleBreath = state === 'idle' ? Math.sin(phase * 1.4) * 0.012 : 0;
  rig.bodyGroup.position.y = THREE.MathUtils.lerp(
    rig.bodyGroup.position.y,
    targetBob + idleBreath,
    damp
  );
}
