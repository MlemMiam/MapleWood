import * as THREE from 'three';
import type { WorldBuildContext } from '../WorldContext';

function makeCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildExteriorDetails(ctx: WorldBuildContext): void {
  const { scene, mats, animatedObjects } = ctx;
  const group = new THREE.Group();
  group.name = 'ExteriorDetails';

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  // ---------------------------------------------------------------------
  // 1. Ground decals: cracks, stains, leaves scattered on courtyard concrete
  // ---------------------------------------------------------------------
  const crackTex = makeCanvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = 'rgba(0,0,0,0)';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,45,52,0.55)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      const x0 = Math.random() * w;
      const y0 = Math.random() * h;
      c.beginPath();
      c.moveTo(x0, y0);
      let x = x0, y = y0;
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * 28;
        y += (Math.random() - 0.5) * 28;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  });
  const stainTex = makeCanvasTexture(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      const r = 20 + Math.random() * 40;
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, 'rgba(40,45,52,0.22)');
      g.addColorStop(1, 'rgba(40,45,52,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  });
  const leafTex = makeCanvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      c.save();
      c.translate(x, y);
      c.rotate(Math.random() * Math.PI * 2);
      c.fillStyle = i % 3 === 0 ? '#8a5a2b' : i % 3 === 1 ? '#a06b33' : '#6b4a22';
      c.beginPath();
      c.ellipse(0, 0, 6 + Math.random() * 4, 3 + Math.random() * 2, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  });

  const decalMatCrack = new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const decalMatStain = new THREE.MeshBasicMaterial({ map: stainTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const decalMatLeaf = new THREE.MeshBasicMaterial({ map: leafTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });

  const decalGeo = new THREE.PlaneGeometry(1, 1);
  const addDecals = (positions: Array<[number, number, number]>, mat: THREE.Material, scaleRange: [number, number]) => {
    const mesh = new THREE.InstancedMesh(decalGeo, mat, positions.length);
    positions.forEach(([x, y, z], i) => {
      const s = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
      dummy.position.set(x, y + 0.012, z);
      dummy.rotation.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(s, s, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  };

  // Courtyard concrete cracks/stains/leaves
  const courtyardDecals: Array<[number, number, number]> = [];
  for (let i = 0; i < 40; i++) {
    courtyardDecals.push([(Math.random() - 0.5) * 30, 0, 5 + Math.random() * 25]);
  }
  addDecals(courtyardDecals, decalMatCrack, [1.2, 2.6]);
  addDecals(courtyardDecals.map(([x, y, z]) => [x + 0.3, y, z + 0.4] as [number, number, number]), decalMatStain, [1.4, 3.0]);
  const leafPositions: Array<[number, number, number]> = [];
  for (let i = 0; i < 60; i++) {
    leafPositions.push([(Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40 + 10]);
  }
  addDecals(leafPositions, decalMatLeaf, [0.6, 1.1]);

  // ---------------------------------------------------------------------
  // 2. Moss patches on building bases (green translucent planes)
  // ---------------------------------------------------------------------
  const mossTex = makeCanvasTexture(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 8 + Math.random() * 18;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(40,90,40,0.55)');
      g.addColorStop(1, 'rgba(40,90,40,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  });
  const mossMat = new THREE.MeshBasicMaterial({ map: mossTex, transparent: true, depthWrite: false, color: 0x3f7a3a });
  const mossPositions: Array<[number, number, number, number]> = [
    [-10, 0, -6, 0], [10, 0, -6, 0], [-12, 0, 4, 0], [12, 0, 4, 0],
    [-18, 0, 12, 0], [18, 0, 12, 0], [-8, 0, 22, 0], [8, 0, 22, 0],
    [-30, 0, -2, 0], [30, 0, -2, 0],
  ];
  mossPositions.forEach(([x, y, z, ry]) => {
    const moss = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), mossMat);
    moss.rotation.x = -Math.PI / 2;
    moss.rotation.z = ry;
    moss.position.set(x, 0.014, z);
    group.add(moss);
  });

  // ---------------------------------------------------------------------
  // 3. Varied vegetation: spruce & birch trees + seasonal flowers
  // ---------------------------------------------------------------------
  // Spruce (conical)
  const spruceTrunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 3.0, 8);
  const spruceConeGeo = new THREE.ConeGeometry(1.1, 3.2, 8);
  const spruceTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.9 });
  const spruceFoliageMat = new THREE.MeshStandardMaterial({ color: 0x1f5e2a, roughness: 0.8 });

  const spruceSpots: Array<[number, number, number]> = [
    [-48, 0, 14], [48, 0, 16], [-52, 0, -30], [52, 0, -28],
    [-70, 0, -60], [70, 0, -58], [-80, 0, 10], [80, 0, 12],
  ];
  spruceSpots.forEach(([x, y, z]) => {
    const t = new THREE.Mesh(spruceTrunkGeo, spruceTrunkMat);
    t.position.set(x, 1.5, z);
    t.castShadow = true;
    const c = new THREE.Mesh(spruceConeGeo, spruceFoliageMat);
    c.position.set(x, 3.6, z);
    c.castShadow = true;
    group.add(t, c);
    ctx.physics.addStaticBox(x, 1.5, z, 0.2, 1.5, 0.2);
  });

  // Birch (white trunk + light canopy)
  const birchTrunkGeo = new THREE.CylinderGeometry(0.1, 0.13, 4.0, 8);
  const birchTrunkMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6 });
  const birchCanopyGeo = new THREE.SphereGeometry(1.4, 10, 8);
  const birchCanopyMat = new THREE.MeshStandardMaterial({ color: 0x7fb069, roughness: 0.8 });

  const birchSpots: Array<[number, number, number]> = [
    [-22, 0, 6], [22, 0, 7], [-24, 0, 24], [24, 0, 23],
    [-16, 0, -8], [16, 0, -7],
  ];
  birchSpots.forEach(([x, y, z]) => {
    const t = new THREE.Mesh(birchTrunkGeo, birchTrunkMat);
    t.position.set(x, 2.0, z);
    t.castShadow = true;
    const c = new THREE.Mesh(birchCanopyGeo, birchCanopyMat);
    c.position.set(x, 4.2, z);
    c.castShadow = true;
    c.receiveShadow = true;
    group.add(t, c);
    ctx.physics.addStaticBox(x, 2.0, z, 0.18, 2.0, 0.18);
  });

  // Seasonal flowers along walkways
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const flowerGeo = new THREE.DodecahedronGeometry(0.07, 0);
  const flowerSpots: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 80; i++) {
    const x = (Math.random() - 0.5) * 26;
    const z = 8 + Math.random() * 18;
    flowerSpots.push([x, 0.12, z, i]);
  }
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerSpots.length);
  const flowerColors = [0xf59e0b, 0xef4444, 0xfbbf24, 0xf472b6, 0xffffff, 0x8b5cf6];
  flowerSpots.forEach(([x, y, z], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.scale.setScalar(0.9 + Math.random() * 0.4);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    tint.setHex(flowerColors[i % flowerColors.length]);
    flowers.setColorAt(i, tint);
  });
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  group.add(flowers);

  // Trimmed hedges along main entrance walkway
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.85 });
  const hedgeGeo = new THREE.BoxGeometry(1.6, 0.7, 0.5);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const h = new THREE.Mesh(hedgeGeo, hedgeMat);
      h.position.set(side * (4.5 + i * 0.1), 0.35, -2 - i * 1.6);
      h.castShadow = true;
      group.add(h);
    }
  }

  // ---------------------------------------------------------------------
  // 4. Fountain upgrade: better water material + splashes + foam
  // ---------------------------------------------------------------------
  // Find fountain group in scene
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
    // Upgrade water meshes to physical material with clearcoat
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

    // Foam ring around basin top
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const foam = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.06, 8, 32), foamMat);
    foam.rotation.x = Math.PI / 2;
    foam.position.set(0, 0.6, 0);
    fountainGroup.add(foam);

    // Splash particles
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

  // ---------------------------------------------------------------------
  // 5. Puddles / wet asphalt reflections in parking lots
  // ---------------------------------------------------------------------
  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a,
    roughness: 0.05,
    metalness: 0.7,
    transparent: true,
    opacity: 0.55,
  });
  const puddleGeo = new THREE.CircleGeometry(1, 16);
  const puddleSpots: Array<[number, number, number]> = [
    [-68, 0.02, -6], [-60, 0.02, 2], [-72, 0.02, 4],
    [70, 0.02, -2], [64, 0.02, 6], [74, 0.02, 2],
    [0, 0.02, 30], [4, 0.02, 34],
  ];
  puddleSpots.forEach(([x, y, z]) => {
    const p = new THREE.Mesh(puddleGeo, puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.scale.set(1.2 + Math.random() * 1.4, 1.2 + Math.random() * 1.4, 1);
    p.position.set(x, y, z);
    group.add(p);
  });

  // ---------------------------------------------------------------------
  // 6. Weathered parking markings (faded lines)
  // ---------------------------------------------------------------------
  // (handled by slightly transparent dashed lines already; add faded decals)
  const fadeTex = makeCanvasTexture(64, 64, (c, w, h) => {
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      c.fillStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.3})`;
      c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  const fadeMat = new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false });
  const fadeDecalGeo = new THREE.PlaneGeometry(4, 0.15);
  const fadeSpots: Array<[number, number, number, number]> = [
    [-68, 0.02, -10, 0], [-68, 0.02, -6, 0], [-68, 0.02, -2, 0],
    [72, 0.02, -8, 0], [72, 0.02, -4, 0], [72, 0.02, 0, 0],
  ];
  fadeSpots.forEach(([x, y, z, ry]) => {
    const d = new THREE.Mesh(fadeDecalGeo, fadeMat);
    d.rotation.x = -Math.PI / 2;
    d.rotation.z = ry;
    d.position.set(x, y, z);
    group.add(d);
  });

  ctx.scene.add(group);
}
