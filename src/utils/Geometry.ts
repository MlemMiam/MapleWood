import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PhysicsWorld } from '../engine/Physics';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import {
  createCampusBulletinTexture,
  createEventPosterTexture,
  type EventPosterTheme,
  type MaterialLibrary,
} from './Materials';

const ensureNonIndexed = (g: THREE.BufferGeometry): THREE.BufferGeometry =>
  g.index ? g.toNonIndexed() : g;

export interface OpeningSpec {
  offset: number; // Center offset along wall length (-length/2 .. +length/2)
  width: number;
  height: number;
  sillHeight?: number; // 0 for doors, > 0 for windows
  glazed?: boolean;
}

/**
 * Builds a solid wall along X or Z axis with clean cutouts for doors/windows,
 * adding matching Rapier static box colliders for solid piers and lintels.
 */
export function buildWallWithOpenings(
  parent: THREE.Group,
  physics: PhysicsWorld,
  mats: MaterialLibrary,
  opts: {
    x: number;
    z: number;
    length: number;
    height: number;
    thickness: number;
    axis: 'x' | 'z';
    material: THREE.Material;
    openings?: OpeningSpec[];
    castShadow?: boolean;
    receiveShadow?: boolean;
    baseY?: number;
  }
): void {
  const {
    x,
    z,
    length,
    height,
    thickness,
    axis,
    material,
    openings = [],
    castShadow = true,
    receiveShadow = true,
    baseY = 0,
  } = opts;

  const sorted = [...openings].sort((a, b) => a.offset - b.offset);
  const start = -length * 0.5;
  const end = length * 0.5;

  const addBox = (cxLocal: number, cyLocal: number, segLen: number, segH: number, isGlass = false) => {
    if (segLen <= 0.04 || segH <= 0.04) return;
    const w = axis === 'x' ? segLen : thickness;
    const d = axis === 'x' ? thickness : segLen;
    const wx = axis === 'x' ? x + cxLocal : x;
    const wz = axis === 'z' ? z + cxLocal : z;
    const wy = baseY + cyLocal;

    const geom = new THREE.BoxGeometry(w, segH, isGlass ? Math.min(d, 0.06) : d);
    const mesh = new THREE.Mesh(geom, isGlass ? mats.tintedGlass : material);
    mesh.position.set(wx, wy, wz);
    mesh.castShadow = !isGlass && castShadow;
    mesh.receiveShadow = !isGlass && receiveShadow;
    parent.add(mesh);

    if (!isGlass || segH > 0.2) {
      // Glazed windows still get a collider so players don't walk through windows
      physics.addStaticBox(wx, wy, wz, w * 0.5, segH * 0.5, d * 0.5);
    }
  };

  let cursor = start;
  for (const op of sorted) {
    const opStart = Math.max(start, op.offset - op.width * 0.5);
    const opEnd = Math.min(end, op.offset + op.width * 0.5);
    const pierLen = opStart - cursor;
    if (pierLen > 0.05) {
      addBox(cursor + pierLen * 0.5, height * 0.5, pierLen, height);
    }

    const sill = op.sillHeight ?? 0;
    if (sill > 0.05) {
      addBox(op.offset, sill * 0.5, opEnd - opStart, sill);
    }

    const topStart = sill + op.height;
    const lintelH = height - topStart;
    if (lintelH > 0.05) {
      addBox(op.offset, topStart + lintelH * 0.5, opEnd - opStart, lintelH);
    }

    if (op.glazed) {
      addBox(op.offset, sill + op.height * 0.5, opEnd - opStart, op.height, true);

      // Raised architectural window surround in relief (merged into 1 limestone + 1 chrome + 1 dark frame mesh)
      const winLen = opEnd - opStart;
      const sillW = axis === 'x' ? winLen + 0.24 : thickness + 0.22;
      const sillD = axis === 'x' ? thickness + 0.22 : winLen + 0.24;
      const wx = axis === 'x' ? x + op.offset : x;
      const wz = axis === 'z' ? z + op.offset : z;
      const stoneParts: THREE.BufferGeometry[] = [];
      const addStonePart = (geo: THREE.BufferGeometry, lx: number, ly: number, lz: number) => {
        const g = ensureNonIndexed(geo);
        g.translate(lx, ly, lz);
        stoneParts.push(g);
      };

      // Projecting beveled sill + drip edge
      addStonePart(new RoundedBoxGeometry(sillW, 0.11, sillD, 2, 0.02), 0, baseY + sill - 0.025, 0);

      // Under-sill stone corbel brackets
      const corbelOffset = winLen * 0.5 - 0.02;
      const corbelW = axis === 'x' ? 0.14 : thickness + 0.16;
      const corbelD = axis === 'x' ? thickness + 0.16 : 0.14;
      for (const side of [-1, 1]) {
        addStonePart(
          new RoundedBoxGeometry(corbelW, 0.13, corbelD, 2, 0.02),
          axis === 'x' ? side * corbelOffset : 0,
          baseY + sill - 0.13,
          axis === 'z' ? side * corbelOffset : 0
        );
      }

      // Flanking raised limestone casing pilasters connecting sill to header
      const casingW = axis === 'x' ? 0.13 : thickness + 0.12;
      const casingD = axis === 'x' ? thickness + 0.12 : 0.13;
      const casingOffset = winLen * 0.5 + 0.05;
      for (const side of [-1, 1]) {
        addStonePart(
          new RoundedBoxGeometry(casingW, op.height + 0.02, casingD, 2, 0.02),
          axis === 'x' ? side * casingOffset : 0,
          baseY + sill + op.height * 0.5,
          axis === 'z' ? side * casingOffset : 0
        );
      }

      // Projecting lintel header + upper crown molding + raised central keystone
      const headY = baseY + sill + op.height + 0.055;
      addStonePart(
        new RoundedBoxGeometry(
          axis === 'x' ? winLen + 0.28 : thickness + 0.22,
          0.15,
          axis === 'x' ? thickness + 0.22 : winLen + 0.28,
          2,
          0.025
        ),
        0,
        headY,
        0
      );
      addStonePart(
        new RoundedBoxGeometry(
          axis === 'x' ? winLen + 0.36 : thickness + 0.28,
          0.06,
          axis === 'x' ? thickness + 0.28 : winLen + 0.36,
          2,
          0.015
        ),
        0,
        headY + 0.095,
        0
      );
      addStonePart(
        new RoundedBoxGeometry(
          axis === 'x' ? 0.24 : thickness + 0.28,
          0.22,
          axis === 'x' ? thickness + 0.28 : 0.24,
          2,
          0.02
        ),
        0,
        headY + 0.02,
        0
      );

      const stoneSurround = new THREE.Mesh(mergeGeometries(stoneParts), mats.limestone);
      stoneSurround.position.set(wx, 0, wz);
      stoneSurround.castShadow = true;
      stoneSurround.receiveShadow = true;
      parent.add(stoneSurround);

      // Merged chrome transom & vertical mullions
      const chromeParts: THREE.BufferGeometry[] = [];
      const transW = axis === 'x' ? winLen - 0.12 : 0.09;
      const transD = axis === 'x' ? 0.09 : winLen - 0.12;
      const transomGeo = ensureNonIndexed(new THREE.BoxGeometry(transW, 0.055, transD));
      transomGeo.translate(0, baseY + sill + op.height * 0.62, 0);
      chromeParts.push(transomGeo);

      const paneCount = winLen >= 2.6 ? 3 : 2;
      for (let m = 1; m < paneCount; m++) {
        const mOffset = -winLen * 0.5 + (winLen / paneCount) * m;
        const mullGeo = ensureNonIndexed(
          new THREE.BoxGeometry(
            axis === 'x' ? 0.05 : 0.085,
            op.height - 0.08,
            axis === 'x' ? 0.085 : 0.05
          )
        );
        mullGeo.translate(
          axis === 'x' ? mOffset : 0,
          baseY + sill + op.height * 0.5,
          axis === 'z' ? mOffset : 0
        );
        chromeParts.push(mullGeo);
      }
      const mullionMesh = new THREE.Mesh(mergeGeometries(chromeParts), mats.chrome);
      mullionMesh.position.set(wx, 0, wz);
      parent.add(mullionMesh);
    }

    // Merged dark perimeter frame trim around doors/windows
    const frameThickness = 0.085;
    const frameDepth = thickness + 0.06;
    const fw = axis === 'x' ? frameThickness : frameDepth;
    const fd = axis === 'x' ? frameDepth : frameThickness;
    const leftLocal = opStart + frameThickness * 0.5;
    const rightLocal = opEnd - frameThickness * 0.5;

    const frameParts: THREE.BufferGeometry[] = [];
    const lj = ensureNonIndexed(new THREE.BoxGeometry(fw, op.height, fd));
    lj.translate(axis === 'x' ? x + leftLocal : x, baseY + sill + op.height * 0.5, axis === 'z' ? z + leftLocal : z);
    const rj = ensureNonIndexed(new THREE.BoxGeometry(fw, op.height, fd));
    rj.translate(axis === 'x' ? x + rightLocal : x, baseY + sill + op.height * 0.5, axis === 'z' ? z + rightLocal : z);
    frameParts.push(lj, rj);

    if (op.glazed) {
      const topBar = ensureNonIndexed(
        new THREE.BoxGeometry(
          axis === 'x' ? opEnd - opStart : frameDepth,
          0.07,
          axis === 'x' ? frameDepth : opEnd - opStart
        )
      );
      topBar.translate(
        axis === 'x' ? x + op.offset : x,
        baseY + sill + op.height - 0.035,
        axis === 'z' ? z + op.offset : z
      );
      const botBar = ensureNonIndexed(
        new THREE.BoxGeometry(
          axis === 'x' ? opEnd - opStart : frameDepth,
          0.06,
          axis === 'x' ? frameDepth : opEnd - opStart
        )
      );
      botBar.translate(
        axis === 'x' ? x + op.offset : x,
        baseY + sill + 0.03,
        axis === 'z' ? z + op.offset : z
      );
      frameParts.push(topBar, botBar);
    }

    const frameMesh = new THREE.Mesh(mergeGeometries(frameParts), mats.concreteDark);
    parent.add(frameMesh);

    cursor = opEnd;
  }

  const tailLen = end - cursor;
  if (tailLen > 0.05) {
    addBox(cursor + tailLen * 0.5, height * 0.5, tailLen, height);
  }
}

export interface ClockUpdateRef {
  hourHand: THREE.Object3D;
  minuteHand: THREE.Object3D;
}

/**
 * Creates a composite 3D wall clock whose hands track real local time.
 */
export function createWallClock(
  mats: MaterialLibrary,
  x: number,
  y: number,
  z: number,
  rotY: number
): { group: THREE.Group; clockRef: ClockUpdateRef } {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20), mats.navy);
  rim.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 20), mats.whiteboard);
  face.rotation.x = Math.PI / 2;

  const hourPivot = new THREE.Group();
  hourPivot.position.z = 0.04;
  const hourMesh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.13, 0.012), mats.concreteDark);
  hourMesh.position.y = 0.055;
  hourPivot.add(hourMesh);

  const minutePivot = new THREE.Group();
  minutePivot.position.z = 0.045;
  const minuteMesh = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.19, 0.012), mats.navy);
  minuteMesh.position.y = 0.085;
  minutePivot.add(minuteMesh);

  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), mats.gold);
  pin.position.z = 0.05;

  group.add(rim, face, hourPivot, minutePivot, pin);
  return { group, clockRef: { hourHand: hourPivot, minuteHand: minutePivot } };
}

/**
 * Creates a glowing EXIT sign box mounted above corridors/exits.
 */
export function createExitSign(
  mats: MaterialLibrary,
  x: number,
  y: number,
  z: number,
  rotY = 0
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.1), mats.concreteDark);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.115), mats.exitSign);
  group.add(housing, face);
  return group;
}

/**
 * Creates a composite red fire extinguisher mounted on walls.
 */
export function createFireExtinguisher(
  mats: MaterialLibrary,
  x: number,
  y: number,
  z: number,
  rotY = 0
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xc81e1e,
    roughness: 0.35,
    metalness: 0.3,
  });

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 12), redMat);
  tank.position.y = 0.25;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), redMat);
  dome.position.y = 0.47;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 8), mats.concreteDark);
  nozzle.position.set(0, 0.56, 0.03);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.04), mats.chrome);
  bracket.position.set(0, 0.3, -0.09);

  group.add(tank, dome, nozzle, bracket);
  return group;
}

/**
 * Adds architectural coping parapets, rounded rooftop HVAC mechanical units,
 * and optional pitched glass skylights to flat campus roofs.
 */
export function addBuildingParapetAndHVAC(
  parent: THREE.Group,
  mats: MaterialLibrary,
  x: number,
  z: number,
  w: number,
  d: number,
  roofTopY: number,
  options: { hvacCount?: number; addSkylight?: boolean } = {}
): void {
  const { hvacCount = 2, addSkylight = false } = options;
  const parapetH = 0.34;
  const parapetT = 0.28;

  const northRim = new THREE.Mesh(new THREE.BoxGeometry(w, parapetH, parapetT), mats.limestone);
  northRim.position.set(x, roofTopY + parapetH * 0.5, z - d * 0.5 + parapetT * 0.5);
  const southRim = new THREE.Mesh(new THREE.BoxGeometry(w, parapetH, parapetT), mats.limestone);
  southRim.position.set(x, roofTopY + parapetH * 0.5, z + d * 0.5 - parapetT * 0.5);
  const westRim = new THREE.Mesh(
    new THREE.BoxGeometry(parapetT, parapetH, d - parapetT * 2),
    mats.limestone
  );
  westRim.position.set(x - w * 0.5 + parapetT * 0.5, roofTopY + parapetH * 0.5, z);
  const eastRim = new THREE.Mesh(
    new THREE.BoxGeometry(parapetT, parapetH, d - parapetT * 2),
    mats.limestone
  );
  eastRim.position.set(x + w * 0.5 - parapetT * 0.5, roofTopY + parapetH * 0.5, z);

  // Stepped classical roofline cornice + dentil molding blocks merged into 1 limestone draw call
  const corniceDarkBand = new THREE.Mesh(
    new RoundedBoxGeometry(w + 0.16, 0.09, d + 0.16, 2, 0.015),
    mats.concreteDark
  );
  corniceDarkBand.position.set(x, roofTopY - 0.16, z);

  const corniceParts: THREE.BufferGeometry[] = [];
  const bedMold = ensureNonIndexed(new RoundedBoxGeometry(w + 0.3, 0.09, d + 0.3, 2, 0.02));
  bedMold.translate(0, roofTopY - 0.06, 0);
  const crownMold = ensureNonIndexed(new RoundedBoxGeometry(w + 0.48, 0.11, d + 0.48, 2, 0.025));
  crownMold.translate(0, roofTopY + 0.04, 0);
  corniceParts.push(bedMold, crownMold);

  const dentilStep = 1.15;
  const dentilGeoBase = ensureNonIndexed(new THREE.BoxGeometry(0.18, 0.11, 0.14));
  for (let dx = -w * 0.5 + 0.6; dx <= w * 0.5 - 0.6; dx += dentilStep) {
    for (const sz of [-1, 1]) {
      const dGeo = dentilGeoBase.clone();
      dGeo.translate(dx, roofTopY - 0.08, sz * (d * 0.5 + 0.16));
      corniceParts.push(dGeo);
    }
  }
  const dentilGeoSide = ensureNonIndexed(new THREE.BoxGeometry(0.14, 0.11, 0.18));
  for (let dz = -d * 0.5 + 0.6; dz <= d * 0.5 - 0.6; dz += dentilStep) {
    for (const sx of [-1, 1]) {
      const dGeo = dentilGeoSide.clone();
      dGeo.translate(sx * (w * 0.5 + 0.16), roofTopY - 0.08, dz);
      corniceParts.push(dGeo);
    }
  }

  const corniceMesh = new THREE.Mesh(mergeGeometries(corniceParts), mats.limestone);
  corniceMesh.position.set(x, 0, z);
  corniceMesh.castShadow = true;
  corniceMesh.receiveShadow = true;
  parent.add(northRim, southRim, westRim, eastRim, corniceDarkBand, corniceMesh);

  // Rooftop HVAC mechanical units (RoundedBoxGeometry + circular exhaust shrouds + pipe ducts)
  const hvacGeo = new RoundedBoxGeometry(2.1, 1.05, 1.4, 3, 0.08);
  const fanGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.22, 16);
  const louverGeo = new RoundedBoxGeometry(0.75, 0.55, 0.08, 2, 0.02);
  for (let i = 0; i < hvacCount; i++) {
    const hx = x + (i - (hvacCount - 1) * 0.5) * Math.min(12, w * 0.32);
    const hz = z - d * 0.16;
    const unit = new THREE.Mesh(hvacGeo, mats.chrome);
    unit.position.set(hx, roofTopY + 0.525, hz);
    unit.castShadow = true;
    const fan = new THREE.Mesh(fanGeo, mats.concreteDark);
    fan.position.set(hx + 0.45, roofTopY + 1.15, hz);
    const louver = new THREE.Mesh(louverGeo, mats.navy);
    louver.position.set(hx - 0.4, roofTopY + 0.52, hz + 0.7);
    parent.add(unit, fan, louver);
  }

  if (addSkylight) {
    const curb = new THREE.Mesh(new RoundedBoxGeometry(4.4, 0.26, 3.0, 2, 0.04), mats.navy);
    curb.position.set(x, roofTopY + 0.13, z + d * 0.12);
    const domeShape = new THREE.Shape();
    domeShape.moveTo(-1.4, 0);
    domeShape.lineTo(0, 0.72);
    domeShape.lineTo(1.4, 0);
    domeShape.closePath();
    const skyGeo = new THREE.ExtrudeGeometry(domeShape, {
      depth: 4.1,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    skyGeo.center();
    const skyPrism = new THREE.Mesh(skyGeo, mats.tintedGlass);
    skyPrism.rotation.y = Math.PI / 2;
    skyPrism.position.set(x, roofTopY + 0.58, z + d * 0.12);
    const ridgeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8), mats.chrome);
    ridgeCap.rotation.z = Math.PI / 2;
    ridgeCap.position.set(x, roofTopY + 0.94, z + d * 0.12);
    parent.add(curb, skyPrism, ridgeCap);
  }
}

export interface FacadeVentSpec {
  offset: number;
  y: number;
  scale?: number;
}

/**
 * Adds dressed limestone water-table base, projecting masonry pilasters with capitals,
 * optional mid-height limestone belt courses, curved metal downspouts, and instanced
 * louvered ventilation grilles along an exterior wall (X or Z axis).
 */
export function addFacadeDetailing(
  parent: THREE.Group,
  mats: MaterialLibrary,
  opts: {
    x: number;
    z: number;
    length: number;
    height: number;
    baseY: number;
    facingSign: 1 | -1; // +1 for +Z/+X outward face, -1 for -Z/-X outward face
    axis?: 'x' | 'z';
    pilasterOffsets: number[];
    skipPlinthRange?: [number, number];
    beltHeight?: number;
    addDownspouts?: boolean;
    vents?: FacadeVentSpec[];
  }
): void {
  const {
    x,
    z,
    length,
    height,
    baseY,
    facingSign,
    axis = 'x',
    pilasterOffsets,
    skipPlinthRange,
    beltHeight,
    addDownspouts = true,
    vents = [],
  } = opts;

  const outCoord = (axis === 'x' ? z : x) + facingSign * 0.2;
  const wallRotY = axis === 'x' ? (facingSign === 1 ? 0 : Math.PI) : facingSign === 1 ? Math.PI / 2 : -Math.PI / 2;

  const placeAt = (alongOffset: number, y: number, outExtra = 0): [number, number, number] => {
    const out = outCoord + facingSign * outExtra;
    return axis === 'x' ? [x + alongOffset, y, out] : [out, y, z + alongOffset];
  };

  // Limestone water-table plinth & optional mid-height belt cornice (merged per wall)
  const trimParts: THREE.BufferGeometry[] = [];
  const addPlinthSeg = (alongCenter: number, segLen: number) => {
    if (segLen <= 0.2) return;
    const g = ensureNonIndexed(
      new RoundedBoxGeometry(
        axis === 'x' ? segLen : 0.12,
        0.48,
        axis === 'x' ? 0.12 : segLen,
        2,
        0.02
      )
    );
    const [px, py, pz] = placeAt(alongCenter, baseY + 0.24);
    g.translate(px, py, pz);
    trimParts.push(g);
  };

  if (skipPlinthRange) {
    const [gMin, gMax] = skipPlinthRange;
    const leftLen = gMin - -length * 0.5;
    const rightLen = length * 0.5 - gMax;
    addPlinthSeg((-length * 0.5 + gMin) * 0.5, leftLen);
    addPlinthSeg((gMax + length * 0.5) * 0.5, rightLen);
  } else {
    addPlinthSeg(0, length);
  }

  if (beltHeight !== undefined) {
    const belt = ensureNonIndexed(
      new RoundedBoxGeometry(
        axis === 'x' ? length + 0.08 : 0.14,
        0.16,
        axis === 'x' ? 0.14 : length + 0.08,
        2,
        0.02
      )
    );
    const [bx, by, bz] = placeAt(0, baseY + beltHeight, 0.01);
    belt.translate(bx, by, bz);
    trimParts.push(belt);
  }

  // Masonry pilasters with limestone bases & capitals
  const pilasterParts: THREE.BufferGeometry[] = [];
  const basePilasterGeo = ensureNonIndexed(
    new THREE.BoxGeometry(axis === 'x' ? 0.42 : 0.12, height - 0.52, axis === 'x' ? 0.12 : 0.42)
  );
  const capGeo = ensureNonIndexed(
    new RoundedBoxGeometry(axis === 'x' ? 0.54 : 0.18, 0.16, axis === 'x' ? 0.18 : 0.54, 2, 0.025)
  );
  const baseBlockGeo = ensureNonIndexed(
    new RoundedBoxGeometry(axis === 'x' ? 0.52 : 0.16, 0.52, axis === 'x' ? 0.16 : 0.52, 2, 0.025)
  );

  for (const po of pilasterOffsets) {
    const pil = basePilasterGeo.clone();
    const [px, py, pz] = placeAt(po, baseY + 0.48 + (height - 0.52) * 0.5);
    pil.translate(px, py, pz);
    pilasterParts.push(pil);

    const bb = baseBlockGeo.clone();
    const [bx, by, bz] = placeAt(po, baseY + 0.26, 0.01);
    bb.translate(bx, by, bz);
    trimParts.push(bb);

    const cap = capGeo.clone();
    const [cx, cy, cz] = placeAt(po, baseY + height - 0.08, 0.015);
    cap.translate(cx, cy, cz);
    trimParts.push(cap);
  }

  if (trimParts.length > 0) {
    const trimMesh = new THREE.Mesh(mergeGeometries(trimParts), mats.limestone);
    trimMesh.castShadow = true;
    trimMesh.receiveShadow = true;
    parent.add(trimMesh);
  }
  if (pilasterParts.length > 0) {
    const pilMesh = new THREE.Mesh(mergeGeometries(pilasterParts), mats.brick);
    pilMesh.castShadow = true;
    pilMesh.receiveShadow = true;
    parent.add(pilMesh);
  }

  if (addDownspouts) {
    for (const endSide of [-1, 1]) {
      const dAlong = endSide * (length * 0.5 - 0.65);
      const p0 = placeAt(dAlong, baseY + height - 0.05, 0.04);
      const p1 = placeAt(dAlong, baseY + height - 0.35, 0.09);
      const p2 = placeAt(dAlong, baseY + 0.32, 0.09);
      const p3 = placeAt(dAlong, baseY + 0.1, 0.26);
      const pipeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...p0),
        new THREE.Vector3(...p1),
        new THREE.Vector3(...p2),
        new THREE.Vector3(...p3),
      ]);
      const pipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 14, 0.042, 8, false), mats.concreteDark);
      pipe.castShadow = true;
      parent.add(pipe);
    }
  }

  // Instanced Louvered Ventilation Grilles (2 draw calls total per wall)
  if (vents.length > 0) {
    const frameParts: THREE.BufferGeometry[] = [];
    const topF = ensureNonIndexed(new RoundedBoxGeometry(0.96, 0.06, 0.08, 2, 0.012));
    topF.translate(0, 0.28, 0);
    const botF = ensureNonIndexed(new RoundedBoxGeometry(0.96, 0.06, 0.08, 2, 0.012));
    botF.translate(0, -0.28, 0);
    const leftF = ensureNonIndexed(new RoundedBoxGeometry(0.06, 0.62, 0.08, 2, 0.012));
    leftF.translate(-0.45, 0, 0);
    const rightF = ensureNonIndexed(new RoundedBoxGeometry(0.06, 0.62, 0.08, 2, 0.012));
    rightF.translate(0.45, 0, 0);
    const centerBar = ensureNonIndexed(new THREE.BoxGeometry(0.03, 0.5, 0.05));
    frameParts.push(topF, botF, leftF, rightF, centerBar);

    for (let s = 0; s < 5; s++) {
      const slat = ensureNonIndexed(new THREE.BoxGeometry(0.84, 0.022, 0.065));
      slat.rotateX(0.42);
      slat.translate(0, -0.19 + s * 0.095, 0.01);
      frameParts.push(slat);
    }

    const ventFrameGeo = mergeGeometries(frameParts);
    const ventBackGeo = new THREE.BoxGeometry(0.84, 0.5, 0.03);

    const frameInst = new THREE.InstancedMesh(ventFrameGeo, mats.chrome, vents.length);
    const backInst = new THREE.InstancedMesh(ventBackGeo, mats.concreteDark, vents.length);
    frameInst.castShadow = true;

    const dummy = new THREE.Object3D();
    vents.forEach((v, i) => {
      const [vx, vy, vz] = placeAt(v.offset, baseY + v.y, 0.0);
      dummy.position.set(vx, vy, vz);
      dummy.rotation.set(0, wallRotY, 0);
      dummy.scale.setScalar(v.scale ?? 1);
      dummy.updateMatrix();
      frameInst.setMatrixAt(i, dummy.matrix);
      backInst.setMatrixAt(i, dummy.matrix);
    });
    frameInst.instanceMatrix.needsUpdate = true;
    backInst.instanceMatrix.needsUpdate = true;
    frameInst.computeBoundingSphere();
    backInst.computeBoundingSphere();
    parent.add(frameInst, backInst);
  }
}

/**
 * Builds a weather-protected glass-fronted campus notice board mounted on an exterior wall.
 */
export function createExteriorNoticeBoard(
  parent: THREE.Group,
  mats: MaterialLibrary,
  interactions: InteractionSystem,
  opts: {
    id: string;
    title: string;
    details: string;
    variant?: 'courtyard' | 'activities';
    x: number;
    y: number;
    z: number;
    rotY?: number;
    width?: number;
    height?: number;
    onReadNotice: (title: string, details: string) => void;
  }
): THREE.Group {
  const {
    id,
    title,
    details,
    variant = 'courtyard',
    x,
    y,
    z,
    rotY = 0,
    width = 1.65,
    height = 1.06,
    onReadNotice,
  } = opts;

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const cabinet = new THREE.Mesh(
    new RoundedBoxGeometry(width + 0.14, height + 0.14, 0.08, 2, 0.015),
    mats.navy
  );
  cabinet.castShadow = true;

  const hood = new THREE.Mesh(
    new RoundedBoxGeometry(width + 0.22, 0.05, 0.16, 2, 0.012),
    mats.chrome
  );
  hood.position.set(0, height * 0.5 + 0.075, 0.045);
  hood.rotation.x = 0.2;

  const tex = createCampusBulletinTexture(variant);
  mats.textures.push(tex);
  const corkMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78 });
  const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(width, height), corkMat);
  boardFace.position.z = 0.042;

  const glassCover = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.02, height + 0.02), mats.tintedGlass);
  glassCover.position.z = 0.052;

  group.add(cabinet, hood, boardFace, glassCover);
  parent.add(group);

  interactions.register({
    id,
    label: `consulter : ${title}`,
    type: 'book',
    targetObject: cabinet,
    worldPosition: new THREE.Vector3(x, y, z),
    maxDistance: 3.4,
    onInteract: () => onReadNotice(title, details),
  });

  return group;
}

const POSTER_META: Record<EventPosterTheme, { title: string; details: string }> = {
  prom: {
    title: 'Bal de Promo — Prom Night',
    details:
      'Samedi à 20h00 au Gymnase des Aigles. Tenue de soirée, DJ live, espace photo et couronnement du roi et de la reine de Maplewood !',
  },
  science: {
    title: 'Fête des Sciences — Science Fair',
    details:
      'Vendredi à 14h00 dans l\'Aile des Sciences (Labo de Chimie). Démonstrations de robotique, chimie expérimentale et remise du Prix du Jury.',
  },
  gameday: {
    title: 'Match des Aigles — Go Eagles!',
    details:
      'Vendredi à 18h00 au Stade & Gymnase. Finale régionale des Aigles de Maplewood — entrée gratuite sur présentation de la carte élève.',
  },
  musical: {
    title: 'Soirée Musique & Théâtre',
    details:
      'Jeudi à 19h30 en Salle 106 (Musique). Représentation annuelle de l\'orchestre, de la chorale et du club théâtre de Maplewood.',
  },
  bookfair: {
    title: 'Foire aux Livres de Maplewood',
    details:
      'Toute la semaine de 12h00 à 17h00 à la Bibliothèque. Romans, bandes dessinées, échanges de manuels et rencontres du Club Lecture.',
  },
};

/**
 * Builds a framed textured event poster mounted on an exterior campus wall.
 */
export function createExteriorPoster(
  parent: THREE.Group,
  mats: MaterialLibrary,
  interactions: InteractionSystem,
  opts: {
    id: string;
    theme: EventPosterTheme;
    x: number;
    y: number;
    z: number;
    rotY?: number;
    width?: number;
    height?: number;
    onReadNotice: (title: string, details: string) => void;
  }
): THREE.Group {
  const { id, theme, x, y, z, rotY = 0, width = 0.74, height = 1.0, onReadNotice } = opts;

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(width + 0.08, height + 0.08, 0.045, 2, 0.01),
    mats.concreteDark
  );
  frame.castShadow = true;

  const tex = createEventPosterTexture(theme);
  mats.textures.push(tex);
  const posterMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 });
  const print = new THREE.Mesh(new THREE.PlaneGeometry(width, height), posterMat);
  print.position.z = 0.025;

  const boltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.018, 8);
  boltGeo.rotateX(Math.PI / 2);
  for (const bx of [-width * 0.46, width * 0.46]) {
    for (const by of [-height * 0.46, height * 0.46]) {
      const bolt = new THREE.Mesh(boltGeo, mats.gold);
      bolt.position.set(bx, by, 0.026);
      group.add(bolt);
    }
  }

  group.add(frame, print);
  parent.add(group);

  const meta = POSTER_META[theme];
  interactions.register({
    id,
    label: `lire l'affiche « ${meta.title} »`,
    type: 'book',
    targetObject: frame,
    worldPosition: new THREE.Vector3(x, y, z),
    maxDistance: 3.2,
    onInteract: () => onReadNotice(meta.title, meta.details),
  });

  return group;
}
