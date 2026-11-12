import * as THREE from 'three';
import type { WorldBuildContext } from '../WorldContext';

export function buildExteriorDetails(ctx: WorldBuildContext): void {
  const { scene, mats, physics, animatedObjects } = ctx;
  const group = new THREE.Group();
  group.name = 'ExteriorDetails';

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  // Helper: organic perturbed icosahedron lobe (reused for foliage)
  const makeOrganicLobe = (radius: number, ox: number, oy: number, oz: number, seed: number) => {
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
        0.12 * Math.sin(nx * 4.2 + seed) * Math.cos(ny * 3.6 - seed * 0.7) +
        0.07 * Math.sin(nz * 5.8 + seed * 1.3);
      pos.setXYZ(vi, vx * disp + ox, vy * disp * 0.88 + oy, vz * disp + oz);
    }
    geo.computeVertexNormals();
    return geo.index ? geo.toNonIndexed() : geo;
  };

  // =========================================================================
  // 1. VARIED, DETAILED VEGETATION
  // =========================================================================

  // ---- Spruce trees with tiered branches ----
  const spruceTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.92, metalness: 0.02 });
  const spruceBarkBump = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.95 });
  const spruceFoliageMats = [
    new THREE.MeshStandardMaterial({ color: 0x1f5e2a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x2a6e33, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x184f22, roughness: 0.85 }),
  ];

  const spruceSpots: Array<[number, number, number, number]> = [
    [-48, 0, 14, 0.9], [48, 0, 16, 1.0], [-52, 0, -30, 1.1], [52, 0, -28, 0.95],
    [-70, 0, -60, 1.05], [70, 0, -58, 0.9], [-80, 0, 10, 1.0], [80, 0, 12, 1.1],
    [-60, 0, 40, 0.95], [60, 0, 42, 1.0],
  ];

  spruceSpots.forEach(([x, y, z, scale], idx) => {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    // Trunk with slight taper and bark ridges
    const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 4.2 * scale, 10);
    const trunk = new THREE.Mesh(trunkGeo, spruceTrunkMat);
    trunk.position.y = 2.1 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    // Bark ridge details
    for (let r = 0; r < 6; r++) {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.03 * scale, 4.0 * scale, 0.02 * scale), spruceBarkBump);
      const a = (r / 6) * Math.PI * 2;
      ridge.position.set(Math.cos(a) * 0.14 * scale, 2.1 * scale, Math.sin(a) * 0.14 * scale);
      ridge.rotation.y = a;
      tree.add(ridge);
    }

    // Tiered foliage cones (3 levels) with organic perturbation
    const levels = 3;
    for (let lvl = 0; lvl < levels; lvl++) {
      const coneRadius = (1.3 - lvl * 0.35) * scale;
      const coneHeight = (1.6 - lvl * 0.2) * scale;
      const yPos = (2.6 + lvl * 1.1) * scale;
      const mat = spruceFoliageMats[(idx + lvl) % spruceFoliageMats.length];
      const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 10);
      // perturb vertices
      const pos = coneGeo.attributes.position;
      for (let vi = 0; vi < pos.count; vi++) {
        const vx = pos.getX(vi);
        const vy = pos.getY(vi);
        const vz = pos.getZ(vi);
        const n = Math.sin(vx * 3 + vy * 2 + vz * 4 + lvl) * 0.08;
        pos.setXYZ(vi, vx * (1 + n), vy, vz * (1 + n));
      }
      coneGeo.computeVertexNormals();
      const cone = new THREE.Mesh(coneGeo, mat);
      cone.position.y = yPos;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    }

    // Top spire
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 0.9 * scale, 8), spruceFoliageMats[idx % 3]);
    spire.position.y = (2.6 + 3 * 1.1 + 0.6) * scale;
    spire.castShadow = true;
    tree.add(spire);

    group.add(tree);
    physics.addStaticCylinder(x, 2.1 * scale, z, 0.2 * scale, 2.1 * scale);
  });

  // ---- Birch trees with drooping branches and detailed bark ----
  const birchTrunkMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.55, metalness: 0.05 });
  const birchMarkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
  const birchCanopyMat = new THREE.MeshStandardMaterial({ color: 0x8fbf7a, roughness: 0.82 });
  const birchCanopyMat2 = new THREE.MeshStandardMaterial({ color: 0xa8d49a, roughness: 0.82 });

  const birchSpots: Array<[number, number, number]> = [
    [-22, 0, 6], [22, 0, 7], [-24, 0, 24], [24, 0, 23],
    [-16, 0, -8], [16, 0, -7], [-30, 0, 18], [30, 0, 19],
  ];

  birchSpots.forEach(([x, y, z], idx) => {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 4.6, 10), birchTrunkMat);
    trunk.position.y = 2.3;
    trunk.castShadow = true;
    tree.add(trunk);

    // Bark marks (horizontal dark streaks)
    for (let m = 0; m < 8; m++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.02), birchMarkMat);
      const a = Math.random() * Math.PI * 2;
      const h = 0.6 + m * 0.5;
      mark.position.set(Math.cos(a) * 0.12, h, Math.sin(a) * 0.12);
      mark.rotation.y = a;
      tree.add(mark);
    }

    // Main canopy (organic lobe)
    const canopy = new THREE.Mesh(makeOrganicLobe(1.5, 0, 4.6, 0, idx * 1.3), idx % 2 === 0 ? birchCanopyMat : birchCanopyMat2);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    tree.add(canopy);

    // Side lobes
    for (let s = 0; s < 3; s++) {
      const a = (s / 3) * Math.PI * 2 + idx;
      const lobe = new THREE.Mesh(makeOrganicLobe(0.9, Math.cos(a) * 1.1, 4.2, Math.sin(a) * 1.1, idx + s * 2), birchCanopyMat2);
      lobe.castShadow = true;
      tree.add(lobe);
    }

    // Drooping branches
    for (let b = 0; b < 5; b++) {
      const a = (b / 5) * Math.PI * 2;
      const branchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 4.0, 0),
        new THREE.Vector3(Math.cos(a) * 0.6, 3.6, Math.sin(a) * 0.6),
        new THREE.Vector3(Math.cos(a) * 1.2, 3.0, Math.sin(a) * 1.2),
      ]);
      const branch = new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 8, 0.025, 6, false), birchTrunkMat);
      branch.castShadow = true;
      tree.add(branch);

      // Small leaf cluster at branch tip
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), birchCanopyMat);
      tip.position.set(Math.cos(a) * 1.2, 3.0, Math.sin(a) * 1.2);
      tip.castShadow = true;
      tree.add(tip);
    }

    group.add(tree);
    physics.addStaticCylinder(x, 2.3, z, 0.18, 2.3);
  });

  // ---- Oak trees (more detailed than base ones, added in outer areas) ----
  const oakBarkMat = new THREE.MeshStandardMaterial({ color: 0x5b4031, roughness: 0.94, bumpScale: 0.06 });
  const oakLeafMat = new THREE.MeshStandardMaterial({ color: 0x4a7c3f, roughness: 0.88 });
  const oakLeafMat2 = new THREE.MeshStandardMaterial({ color: 0x558b48, roughness: 0.88 });

  const oakSpots: Array<[number, number, number]> = [
    [-36, 0, -12], [36, 0, -10], [-40, 0, 28], [40, 0, 30],
    [-50, 0, -50], [50, 0, -48], [-75, 0, -90], [75, 0, -88],
  ];

  oakSpots.forEach(([x, y, z], idx) => {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 3.8, 10), oakBarkMat);
    trunk.position.y = 1.9;
    trunk.castShadow = true;
    tree.add(trunk);

    // Major branches
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + idx * 0.7;
      const branchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 3.0, 0),
        new THREE.Vector3(Math.cos(a) * 0.8, 3.6, Math.sin(a) * 0.8),
        new THREE.Vector3(Math.cos(a) * 1.6, 4.0, Math.sin(a) * 1.6),
      ]);
      const branch = new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 10, 0.07, 8, false), oakBarkMat);
      branch.castShadow = true;
      tree.add(branch);
    }

    // Multi-lobe canopy
    const lobes = [
      [0, 4.6, 0, 1.9],
      [-1.2, 4.0, 0.5, 1.4],
      [1.1, 4.1, -0.4, 1.35],
      [0.3, 4.3, 1.2, 1.3],
      [-0.4, 5.0, -0.2, 1.2],
    ];
    lobes.forEach(([lx, ly, lz, r], li) => {
      const lobe = new THREE.Mesh(makeOrganicLobe(r, lx, ly, lz, idx * 2 + li), li % 2 === 0 ? oakLeafMat : oakLeafMat2);
      lobe.castShadow = true;
      lobe.receiveShadow = true;
      tree.add(lobe);
    });

    group.add(tree);
    physics.addStaticCylinder(x, 1.9, z, 0.35, 1.9);
  });

  // ---- Seasonal flowers: ultra-fine, multi-species, smooth & non-pixelated ----
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.8, metalness: 0.02 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a5e32, roughness: 0.75, side: THREE.DoubleSide, metalness: 0.02 });

  const flowerColors = [0xf59e0b, 0xef4444, 0xfbbf24, 0xf472b6, 0xffffff, 0x8b5cf6, 0x22c55e, 0xfb7185, 0xf97316, 0xeab308];

  // Procedural petal texture with veins and soft gradient for non-pixelated look
  function makePetalTexture(baseHex: string): THREE.CanvasTexture {
    const [canvas, ctx] = ((): [HTMLCanvasElement, CanvasRenderingContext2D] => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      return [c, c.getContext('2d')!];
    })();
    // Soft radial gradient base
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, baseHex);
    grad.addColorStop(0.6, baseHex);
    grad.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // Veins
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.2;
    for (let v = 0; v < 7; v++) {
      const a = (v / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.quadraticCurveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40, 128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
      ctx.stroke();
    }
    // Subtle noise for organic feel
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // Place flowers in garden beds (grass areas) as small clusters, not scattered.
  const flowerPositions: Array<[number, number, number]> = [];
  const clusterCenters: Array<[number, number]> = [];
  // Define cluster centers on the lawns, away from walkways and buildings
  const lawnZones: Array<{ xMin: number; xMax: number; zMin: number; zMax: number }> = [
    { xMin: -19, xMax: -8, zMin: 3, zMax: 9 },
    { xMin: -19, xMax: -8, zMin: 18, zMax: 24 },
    { xMin: 8, xMax: 19, zMin: 3, zMax: 9 },
    { xMin: 8, xMax: 19, zMin: 18, zMax: 24 },
    { xMin: -14, xMax: -9, zMin: 12, zMax: 14 },
    { xMin: 9, xMax: 14, zMin: 12, zMax: 14 },
  ];
  lawnZones.forEach((zone) => {
    const clustersInZone = 2 + Math.floor(Math.random() * 2);
    for (let c = 0; c < clustersInZone; c++) {
      const cx = zone.xMin + Math.random() * (zone.xMax - zone.xMin);
      const cz = zone.zMin + Math.random() * (zone.zMax - zone.zMin);
      clusterCenters.push([cx, cz]);
    }
  });
  // Generate flowers around each cluster center
  clusterCenters.forEach(([cx, cz]) => {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let f = 0; f < count; f++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.9;
      const x = cx + Math.cos(angle) * radius;
      const z = cz + Math.sin(angle) * radius;
      flowerPositions.push([x, 0.05, z]);
    }
  });

  flowerPositions.forEach((pos, i) => {
    const flower = new THREE.Group();
    flower.position.set(pos[0], pos[1], pos[2]);

    const species = i % 4;
    const scale = 0.8 + Math.random() * 0.35;
    flower.scale.setScalar(scale);

    // Smooth curved stem via high-segment TubeGeometry
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3((Math.random() - 0.5) * 0.03, 0.1, (Math.random() - 0.5) * 0.03),
      new THREE.Vector3((Math.random() - 0.5) * 0.05, 0.2, (Math.random() - 0.5) * 0.05),
    ]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 16, 0.01, 8, false), stemMat);
    stem.castShadow = true;
    flower.add(stem);

    // Leaves along stem (curved planes)
    for (let l = 0; l < 2; l++) {
      const leafGeo = new THREE.PlaneGeometry(0.07, 0.03, 4, 2);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const ly = 0.07 + l * 0.09;
      leaf.position.set((l % 2 === 0 ? 0.035 : -0.035), ly, 0);
      leaf.rotation.z = (l % 2 === 0 ? 0.65 : -0.65);
      leaf.rotation.x = 0.15;
      leaf.castShadow = true;
      flower.add(leaf);
    }

    const color = flowerColors[i % flowerColors.length];
    const colorStr = '#' + color.toString(16).padStart(6, '0');
    const petalTex = makePetalTexture(colorStr);
    const petalMat = new THREE.MeshStandardMaterial({
      map: petalTex,
      color: 0xffffff,
      roughness: 0.4,
      side: THREE.DoubleSide,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
    });

    if (species === 0) {
      // Daisy: high-res petals with smooth curves
      const petalGeo = new THREE.PlaneGeometry(0.1, 0.04, 8, 4);
      for (let p = 0; p < 14; p++) {
        const petal = new THREE.Mesh(petalGeo, petalMat);
        const a = (p / 14) * Math.PI * 2;
        petal.position.set(Math.cos(a) * 0.065, 0.25, Math.sin(a) * 0.065);
        petal.rotation.y = a;
        petal.rotation.x = 0.55;
        petal.castShadow = true;
        flower.add(petal);
      }
      // Inner ring
      for (let p = 0; p < 8; p++) {
        const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03, 6, 3), petalMat);
        const a = (p / 8) * Math.PI * 2 + 0.4;
        petal.position.set(Math.cos(a) * 0.045, 0.25, Math.sin(a) * 0.045);
        petal.rotation.y = a;
        petal.rotation.x = 0.65;
        flower.add(petal);
      }
      // Center (detailed sphere with stamens)
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35, metalness: 0.05 }));
      center.position.y = 0.25;
      flower.add(center);
      for (let s = 0; s < 8; s++) {
        const stamen = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.035, 6), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 }));
        const a = (s / 8) * Math.PI * 2;
        stamen.position.set(Math.cos(a) * 0.03, 0.275, Math.sin(a) * 0.03);
        stamen.rotation.z = Math.cos(a) * 0.3;
        flower.add(stamen);
        const anther = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 }));
        anther.position.set(Math.cos(a) * 0.03, 0.295, Math.sin(a) * 0.03);
        flower.add(anther);
      }
    } else if (species === 1) {
      // Rose: high-res spiral petals
      const calyxMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.75 });
      for (let c = 0; c < 5; c++) {
        const sepal = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08, 4, 3), calyxMat);
        const a = (c / 5) * Math.PI * 2;
        sepal.position.set(Math.cos(a) * 0.035, 0.2, Math.sin(a) * 0.035);
        sepal.rotation.y = a;
        sepal.rotation.x = 0.75;
        flower.add(sepal);
      }
      for (let layer = 0; layer < 5; layer++) {
        const r = 0.03 + layer * 0.018;
        const petalCount = 6 + layer * 2;
        for (let p = 0; p < petalCount; p++) {
          const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.05, 6, 4), petalMat);
          const a = (p / petalCount) * Math.PI * 2 + layer * 0.25;
          petal.position.set(Math.cos(a) * r, 0.23 + layer * 0.018, Math.sin(a) * r);
          petal.rotation.y = a;
          petal.rotation.x = 0.35 + layer * 0.12;
          petal.scale.setScalar(1 - layer * 0.1);
          petal.castShadow = true;
          flower.add(petal);
        }
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), petalMat);
      center.position.y = 0.25;
      flower.add(center);
    } else if (species === 2) {
      // Tulip: smooth cup petals
      for (let p = 0; p < 6; p++) {
        const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.1, 6, 5), petalMat);
        const a = (p / 6) * Math.PI * 2;
        petal.position.set(Math.cos(a) * 0.045, 0.27, Math.sin(a) * 0.045);
        petal.rotation.y = a;
        petal.rotation.x = 0.2;
        petal.castShadow = true;
        flower.add(petal);
      }
      for (let p = 0; p < 3; p++) {
        const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08, 5, 4), petalMat);
        const a = (p / 3) * Math.PI * 2 + 0.5;
        petal.position.set(Math.cos(a) * 0.025, 0.28, Math.sin(a) * 0.025);
        petal.rotation.y = a;
        petal.rotation.x = 0.1;
        flower.add(petal);
      }
      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.07, 10), new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, metalness: 0.05 }));
      center.position.y = 0.26;
      flower.add(center);
      // Stamens inside
      for (let s = 0; s < 6; s++) {
        const stamen = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 4), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 }));
        const a = (s / 6) * Math.PI * 2;
        stamen.position.set(Math.cos(a) * 0.015, 0.29, Math.sin(a) * 0.015);
        flower.add(stamen);
      }
    } else {
      // Lavender: high-res spike
      const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5, metalness: 0.02 });
      const spikeHeight = 0.2;
      const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, spikeHeight, 8), stemMat);
      spike.position.y = 0.22 + spikeHeight / 2;
      flower.add(spike);
      for (let f = 0; f < 18; f++) {
        const y = 0.24 + f * 0.011;
        for (let r = 0; r < 4; r++) {
          const a = (r / 4) * Math.PI * 2 + f * 0.4;
          const small = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), lavenderMat);
          small.position.set(Math.cos(a) * 0.028, y, Math.sin(a) * 0.028);
          small.castShadow = true;
          flower.add(small);
        }
      }
      for (let l = 0; l < 4; l++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.02, 4, 2), leafMat);
        leaf.position.set((l % 2 === 0 ? 0.025 : -0.025), 0.09 + l * 0.035, 0);
        leaf.rotation.z = (l % 2 === 0 ? 0.75 : -0.75);
        leaf.rotation.x = 0.1;
        flower.add(leaf);
      }
    }

    group.add(flower);
  });

  // ---- Trimmed hedges with organic shape ----
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.85 });
  const hedgePositions: Array<[number, number, number, number]> = [
    [-5.8, 0, -4.6, 0], [5.8, 0, -4.6, 0],
    [-5.8, 0, 6.5, 0], [5.8, 0, 6.5, 0],
  ];
  hedgePositions.forEach(([x, y, z, ry]) => {
    const hedge = new THREE.Mesh(makeOrganicLobe(0.9, 0, 0.5, 0, x + z), hedgeMat);
    // flatten into hedge shape
    const pos = hedge.geometry.attributes.position;
    for (let vi = 0; vi < pos.count; vi++) {
      const py = pos.getY(vi);
      pos.setY(vi, py * 0.5 + 0.25);
    }
    hedge.geometry.computeVertexNormals();
    hedge.position.set(x, 0.1, z);
    hedge.scale.set(1.8, 0.7, 0.9);
    hedge.rotation.y = ry;
    hedge.castShadow = true;
    hedge.receiveShadow = true;
    group.add(hedge);
  });

  // ---- Additional shrubs (organic) ----
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3a7a42, roughness: 0.88 });
  const shrubSpots: Array<[number, number, number]> = [
    [-7.1, 0, 1.5], [7.1, 0, 1.5],
    [-12.2, 0, -4.6], [12.2, 0, -4.6],
    [-20.8, 0, 4.5], [20.8, 0, 4.5],
    [-20.8, 0, 23.5], [20.8, 0, 23.5],
    [-14, 0, 10], [14, 0, 10],
  ];
  shrubSpots.forEach(([x, y, z], i) => {
    const shrub = new THREE.Mesh(makeOrganicLobe(0.55, 0, 0.4, 0, i * 1.7), shrubMat);
    shrub.position.set(x, 0, z);
    shrub.scale.set(1, 0.85, 1);
    shrub.castShadow = true;
    shrub.receiveShadow = true;
    // color variation
    const m = shrub.material as THREE.MeshStandardMaterial;
    m.color.setHSL(0.3 + (i % 3) * 0.02, 0.45, 0.42 + (i % 2) * 0.06);
    group.add(shrub);
  });

  // ---- Vines on building walls (thin planes) ----
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x2d5a30, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  const vineGeo = new THREE.PlaneGeometry(0.6, 1.8);
  const vineSpots: Array<[number, number, number, number]> = [
    [-10, 0, -6, 0], [10, 0, -6, 0], [-18, 0, 12, 0], [18, 0, 12, 0],
  ];
  vineSpots.forEach(([x, y, z, ry]) => {
    for (let v = 0; v < 3; v++) {
      const vine = new THREE.Mesh(vineGeo, vineMat);
      vine.position.set(x + (v - 1) * 0.4, 0.9, z);
      vine.rotation.y = ry;
      group.add(vine);
    }
  });

  // =========================================================================
  // 2. FOUNTAIN UPGRADE (keep)
  // =========================================================================
  const foundFountain = ((): THREE.Group | null => {
    let result: THREE.Group | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Group && obj.position.x === 0 && Math.abs(obj.position.z - 15.5) < 0.1) {
        result = obj;
      }
    });
    return result;
  })();
  const fountainGroup = foundFountain;
  if (fountainGroup) {
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.72,
      transmission: 0.6,
      thickness: 0.5,
      ior: 1.33,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
    });
    fountainGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material === mats.water) {
        obj.material = waterMat;
      }
    });

    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const foam = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.06, 8, 32), foamMat);
    foam.rotation.x = Math.PI / 2;
    foam.position.set(0, 0.6, 0);
    fountainGroup.add(foam);

    const splashCount = 60;
    const splashGeo = new THREE.BufferGeometry();
    const splashPos = new Float32Array(splashCount * 3);
    const splashVel = new Float32Array(splashCount * 3);
    for (let i = 0; i < splashCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.1 + Math.random() * 0.3;
      splashPos[i * 3] = Math.cos(a) * r;
      splashPos[i * 3 + 1] = 1.7 + Math.random() * 0.4;
      splashPos[i * 3 + 2] = Math.sin(a) * r;
      splashVel[i * 3] = Math.cos(a) * (0.3 + Math.random() * 0.6);
      splashVel[i * 3 + 1] = 0.5 + Math.random() * 1.2;
      splashVel[i * 3 + 2] = Math.sin(a) * (0.3 + Math.random() * 0.6);
    }
    splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
    const splashMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false });
    const splashes = new THREE.Points(splashGeo, splashMat);
    fountainGroup.add(splashes);

    animatedObjects.push((elapsed, dt) => {
      const pos = splashes.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < splashCount; i++) {
        pos.array[i * 3] += splashVel[i * 3] * dt * 0.6;
        pos.array[i * 3 + 1] += splashVel[i * 3 + 1] * dt * 0.6;
        pos.array[i * 3 + 2] += splashVel[i * 3 + 2] * dt * 0.6;
        splashVel[i * 3 + 1] -= 2.5 * dt;
        if (pos.array[i * 3 + 1] < 0.6) {
          const a = Math.random() * Math.PI * 2;
          const r = 0.1 + Math.random() * 0.3;
          pos.array[i * 3] = Math.cos(a) * r;
          pos.array[i * 3 + 1] = 1.7 + Math.random() * 0.4;
          pos.array[i * 3 + 2] = Math.sin(a) * r;
          splashVel[i * 3] = Math.cos(a) * (0.3 + Math.random() * 0.6);
          splashVel[i * 3 + 1] = 0.5 + Math.random() * 1.2;
          splashVel[i * 3 + 2] = Math.sin(a) * (0.3 + Math.random() * 0.6);
        }
      }
      pos.needsUpdate = true;
      foam.rotation.z = elapsed * 0.4;
    });
  }

  ctx.scene.add(group);
}
