import * as THREE from 'three';

export interface MaterialLibrary {
  brick: THREE.MeshStandardMaterial;
  gymBrick: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  concreteDark: THREE.MeshStandardMaterial;
  limestone: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  linoleum: THREE.MeshStandardMaterial;
  plasterWall: THREE.MeshStandardMaterial;
  lockerMetal: THREE.MeshStandardMaterial;
  lockerTrim: THREE.MeshStandardMaterial;
  woodDesk: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  gymParquet: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  tintedGlass: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  navy: THREE.MeshStandardMaterial;
  neonCeiling: THREE.MeshStandardMaterial;
  exitSign: THREE.MeshStandardMaterial;
  whiteboard: THREE.MeshStandardMaterial;
  chalkboard: THREE.MeshStandardMaterial;
  terracotta: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  trackRed: THREE.MeshStandardMaterial;
  turfGreen: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  plasticSeat: THREE.MeshStandardMaterial;
  wroughtIron: THREE.MeshStandardMaterial;
  shadowContact: THREE.MeshBasicMaterial;
  shadowCanopy: THREE.MeshBasicMaterial;
  shadowPergola: THREE.MeshBasicMaterial;
  textures: THREE.Texture[];
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function createBrickTextures(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(512, 512);
  const [bumpCanvas, bumpCtx] = makeCanvas(512, 512);

  // Mortar base
  ctx.fillStyle = '#C6BEB5';
  ctx.fillRect(0, 0, 512, 512);
  bumpCtx.fillStyle = '#404040';
  bumpCtx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const cols = 8;
  const brickH = 512 / rows;
  const brickW = 512 / cols;
  const mortar = 3;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (brickW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * brickW + offset;
      const y = r * brickH;
      const shade = ((r * 17 + c * 31) % 24) - 12;
      const red = Math.min(255, Math.max(0, 139 + shade));
      const green = Math.min(255, Math.max(0, 58 + Math.round(shade * 0.4)));
      const blue = Math.min(255, Math.max(0, 58 + Math.round(shade * 0.4)));
      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      ctx.fillRect(x + mortar, y + mortar, brickW - mortar * 2, brickH - mortar * 2);

      // Subtle brick grain
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x + mortar, y + brickH - mortar - 3, brickW - mortar * 2, 3);

      bumpCtx.fillStyle = `rgb(${210 + shade}, ${210 + shade}, ${210 + shade})`;
      bumpCtx.fillRect(x + mortar, y + mortar, brickW - mortar * 2, brickH - mortar * 2);
    }
  }

  // Procedural normal map derived from bump for richer PBR surface detail
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = 512;
  normalCanvas.height = 512;
  const nctx = normalCanvas.getContext('2d')!;
  const bumpData = bumpCtx.getImageData(0, 0, 512, 512);
  const normalData = nctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const left = bumpData.data[((y * 512 + ((x - 1 + 512) % 512)) * 4)];
      const right = bumpData.data[((y * 512 + ((x + 1) % 512)) * 4)];
      const up = bumpData.data[(((y - 1 + 512) % 512) * 512 + x) * 4];
      const down = bumpData.data[(((y + 1) % 512) * 512 + x) * 4];
      const dx = (right - left) / 255;
      const dy = (down - up) / 255;
      normalData.data[idx] = Math.round((dx * 0.5 + 0.5) * 255);
      normalData.data[idx + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      normalData.data[idx + 2] = 255;
      normalData.data[idx + 3] = 255;
    }
  }
  nctx.putImageData(normalData, 0, 0);
  const normalTex = configureTexture(normalCanvas, 1, 1, false, maxAniso);

  return {
    map: configureTexture(canvas, 1, 1, true, maxAniso),
    bumpMap: configureTexture(bumpCanvas, 1, 1, false, maxAniso),
    normalMap: normalTex,
  };
}
function hash01(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function createConcreteTexture(maxAniso: number, baseHex: string, withPaverJoints = false) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4200; i++) {
    const x = Math.floor(hash01(i * 1.13 + 3.1) * 256);
    const y = Math.floor(hash01(i * 2.71 + 9.7) * 256);
    const size = hash01(i * 4.3) > 0.7 ? 2 : 1;
    const alpha = 0.02 + hash01(i * 5.9) * 0.045;
    ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(28,32,38,${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  if (withPaverJoints) {
    ctx.strokeStyle = 'rgba(40,45,52,0.16)';
    ctx.lineWidth = 2;
    for (const p of [64, 128, 192]) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
  }

  const nCanvas = document.createElement('canvas');
  nCanvas.width = 256;
  nCanvas.height = 256;
  const nctx = nCanvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const out = nctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const l = imgData.data[((y * 256 + ((x - 1 + 256) % 256)) * 4)];
      const r = imgData.data[((y * 256 + ((x + 1) % 256)) * 4)];
      const u = imgData.data[(((y - 1 + 256) % 256) * 256 + x) * 4];
      const d = imgData.data[(((y + 1) % 256) * 256 + x) * 4];
      const dx = (r - l) / 255;
      const dy = (d - u) / 255;
      out.data[i] = Math.round((dx * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      out.data[i + 2] = 255;
      out.data[i + 3] = 255;
    }
  }
  nctx.putImageData(out, 0, 0);
  const colorTex = configureTexture(canvas, 1, 1, true, maxAniso);
  const normalTex = configureTexture(nCanvas, 1, 1, false, maxAniso);
  return { map: colorTex, normalMap: normalTex };
}

function createLinoleumTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(256, 256);
  const tile = 64;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const dark = (x + y) % 2 === 1;
      ctx.fillStyle = dark ? '#343A46' : '#E8E8E8';
      ctx.fillRect(x * tile, y * tile, tile, tile);

      // Subtle speckle
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
      for (let s = 0; s < 16; s++) {
        ctx.fillRect(x * tile + ((s * 19) % 58) + 2, y * tile + ((s * 29) % 58) + 2, 2, 2);
      }
    }
  }
  return configureTexture(canvas, 1, 1, true, maxAniso);
}

function createWoodTexture(maxAniso: number, lightHex: string, grainHex: string) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = lightHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = grainHex;
  for (let y = 0; y < 256; y += 32) {
    ctx.fillRect(0, y, 256, 2);
    for (let g = 0; g < 18; g++) {
      ctx.globalAlpha = 0.14;
      ctx.fillRect((g * 37) % 256, y + ((g * 7) % 26) + 3, 44, 1.5);
    }
  }
  ctx.globalAlpha = 1;
  return configureTexture(canvas, 1, 1, true, maxAniso);
}

function createGymCourtTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(1024, 512);
  ctx.fillStyle = '#B88352';
  ctx.fillRect(0, 0, 1024, 512);

  // Parquet planks
  for (let y = 0; y < 512; y += 16) {
    const shade = ((y / 16) % 3) * 6 - 6;
    ctx.fillStyle = `rgb(${165 + shade}, ${118 + shade}, ${76 + shade})`;
    ctx.fillRect(0, y, 1024, 15);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y + 15, 1024, 1);
  }

  // Court border & lines in Maplewood Navy & Gold
  ctx.strokeStyle = '#1F3864';
  ctx.lineWidth = 8;
  ctx.strokeRect(48, 36, 928, 440);

  // Center line
  ctx.beginPath();
  ctx.moveTo(512, 36);
  ctx.lineTo(512, 476);
  ctx.stroke();

  // Center circle & Maplewood Eagles emblem
  ctx.fillStyle = 'rgba(31, 56, 100, 0.85)';
  ctx.beginPath();
  ctx.arc(512, 256, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EAGLES', 512, 256);

  // Key areas & 3-point arcs
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 5;
  ctx.strokeRect(48, 176, 160, 160);
  ctx.strokeRect(816, 176, 160, 160);

  ctx.beginPath();
  ctx.arc(110, 256, 175, -Math.PI * 0.44, Math.PI * 0.44);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(914, 256, 175, Math.PI * 0.56, Math.PI * 1.44);
  ctx.stroke();

  const tex = configureTexture(canvas, 1, 1, true, maxAniso);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createProjectedShadowTexture(
  kind: 'contact' | 'canopy' | 'pergola',
  maxAniso: number
): THREE.CanvasTexture {
  const size = kind === 'contact' ? 128 : 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);

  if (kind === 'contact') {
    const grad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.14,
      size * 0.5,
      size * 0.5,
      size * 0.48
    );
    grad.addColorStop(0, 'rgba(10, 17, 30, 0.34)');
    grad.addColorStop(0.65, 'rgba(10, 17, 30, 0.18)');
    grad.addColorStop(1, 'rgba(10, 17, 30, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  } else if (kind === 'canopy') {
    const lobes: Array<[number, number, number, number]> = [
      [0.5, 0.5, 0.42, 0.3],
      [0.34, 0.44, 0.28, 0.18],
      [0.66, 0.46, 0.27, 0.18],
      [0.48, 0.33, 0.26, 0.16],
      [0.52, 0.67, 0.25, 0.16],
    ];
    for (const [lx, ly, r, alpha] of lobes) {
      const grad = ctx.createRadialGradient(
        lx * size,
        ly * size,
        r * size * 0.12,
        lx * size,
        ly * size,
        r * size
      );
      grad.addColorStop(0, `rgba(12, 22, 34, ${alpha})`);
      grad.addColorStop(0.68, `rgba(12, 22, 34, ${alpha * 0.55})`);
      grad.addColorStop(1, 'rgba(12, 22, 34, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    // Subtle dappled sun-fleck pockets for natural foliage light filtering
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 18; i++) {
      const fx = (0.24 + hash01(i * 3.17 + 1.1) * 0.52) * size;
      const fy = (0.24 + hash01(i * 5.41 + 2.7) * 0.52) * size;
      const fr = (0.025 + hash01(i * 7.83) * 0.03) * size;
      const hole = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      hole.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
      hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    // Pergola: soft ambient canopy base + rhythmic slatted rafter shadows
    const baseGrad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.18,
      size * 0.5,
      size * 0.5,
      size * 0.54
    );
    baseGrad.addColorStop(0, 'rgba(12, 20, 35, 0.26)');
    baseGrad.addColorStop(0.76, 'rgba(12, 20, 35, 0.16)');
    baseGrad.addColorStop(1, 'rgba(12, 20, 35, 0)');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(14, 14, size - 28, size - 28, 16);
    ctx.clip();
    ctx.fillStyle = 'rgba(12, 20, 35, 0.22)';
    for (let sx = 14; sx < size - 14; sx += 22) {
      ctx.fillRect(sx, 14, 10, size - 28);
    }
    ctx.fillStyle = 'rgba(12, 20, 35, 0.18)';
    ctx.fillRect(14, 16, size - 28, 10);
    ctx.fillRect(14, size - 26, size - 28, 10);
    ctx.restore();
  }

  const tex = configureTexture(canvas, 1, 1, true, maxAniso);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createGrassTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#4A7C3F';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4600; i++) {
    const x = Math.floor(hash01(i * 1.9 + 1.4) * 256);
    const y = Math.floor(hash01(i * 3.7 + 6.2) * 256);
    ctx.fillStyle = i % 3 === 0 ? '#558B48' : i % 3 === 1 ? '#3F6C35' : '#4E8242';
    ctx.fillRect(x, y, 2, 4);
  }
  return configureTexture(canvas, 1, 1, true, maxAniso);
}

function createAsphaltTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#383A40';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4800; i++) {
    const x = Math.floor(hash01(i * 2.3 + 4.1) * 256);
    const y = Math.floor(hash01(i * 4.9 + 8.3) * 256);
    const alpha = 0.03 + hash01(i * 7.1) * 0.06;
    ctx.fillStyle = i % 2 === 0 ? `rgba(220,226,232,${alpha})` : `rgba(12,14,18,${alpha * 1.4})`;
    ctx.fillRect(x, y, 2, 2);
  }
  return configureTexture(canvas, 1, 1, true, maxAniso);
}

function createBarkTextures(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(256, 256);
  const [bumpCanvas, bumpCtx] = makeCanvas(256, 256);
  ctx.fillStyle = '#5B4031';
  ctx.fillRect(0, 0, 256, 256);
  bumpCtx.fillStyle = '#707070';
  bumpCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 220; i++) {
    const x = Math.floor(hash01(i * 3.1) * 256);
    const y = Math.floor(hash01(i * 5.7) * 256);
    const w = 2 + Math.floor(hash01(i * 7.3) * 5);
    const h = 18 + Math.floor(hash01(i * 11.1) * 44);
    const dark = i % 2 === 0;
    ctx.fillStyle = dark ? 'rgba(38,24,18,0.45)' : 'rgba(125,92,68,0.28)';
    ctx.fillRect(x, y, w, h);
    bumpCtx.fillStyle = dark ? '#353535' : '#b8b8b8';
    bumpCtx.fillRect(x, y, w, h);
  }
  return {
    map: configureTexture(canvas, 2, 2, true, maxAniso),
    bumpMap: configureTexture(bumpCanvas, 2, 2, false, maxAniso),
  };
}

function createFoliageTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#478440';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const x = Math.floor(hash01(i * 1.7 + 0.5) * 256);
    const y = Math.floor(hash01(i * 4.1 + 2.9) * 256);
    const r = 2 + hash01(i * 6.3) * 4;
    ctx.fillStyle =
      i % 3 === 0 ? 'rgba(116,178,76,0.32)' : i % 3 === 1 ? 'rgba(42,88,38,0.38)' : 'rgba(84,142,64,0.32)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return configureTexture(canvas, 2, 2, true, maxAniso);
}

export function createSignTexture(
  title: string,
  subtitle: string,
  bgColor = '#1F3864',
  textColor = '#D4AF37'
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 160);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 140);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, subtitle ? 62 : 82, 464);

  if (subtitle) {
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(subtitle, 256, 114, 464);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createPeriodicTableTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#1F3864';
  ctx.fillRect(0, 0, 512, 34);
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('TABLEAU PÉRIODIQUE DES ÉLÉMENTS', 18, 23);

  const colors = ['#FCA5A5', '#FCD34D', '#93C5FD', '#86EFAC', '#C4B5FD'];
  const cellW = 25;
  const cellH = 26;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 18; col++) {
      if (row === 0 && col > 0 && col < 17) continue;
      if ((row === 1 || row === 2) && col > 1 && col < 12) continue;
      const x = 28 + col * (cellW + 1);
      const y = 46 + row * (cellH + 2);
      ctx.fillStyle = colors[(col + row) % colors.length];
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellW, cellH);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createUSFlagTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 280);
  const stripeH = 280 / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF';
    ctx.fillRect(0, i * stripeH, 512, stripeH + 1);
  }
  ctx.fillStyle = '#3C3B6E';
  ctx.fillRect(0, 0, 210, stripeH * 7);
  ctx.fillStyle = '#FFFFFF';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      ctx.beginPath();
      ctx.arc(18 + c * 34, 15 + r * 28, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type EventPosterTheme = 'prom' | 'science' | 'gameday' | 'musical' | 'bookfair';

export function createEventPosterTexture(theme: EventPosterTheme): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(384, 512);

  if (theme === 'prom') {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0B152B');
    grad.addColorStop(0.65, '#1B2D58');
    grad.addColorStop(1, '#2D1E4F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 384, 512);

    // Golden arch & stars
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 352, 480);
    ctx.beginPath();
    ctx.arc(192, 220, 108, Math.PI, 0);
    ctx.stroke();

    for (let i = 0; i < 24; i++) {
      const sx = 32 + hash01(i * 4.7) * 320;
      const sy = 34 + hash01(i * 9.3) * 190;
      ctx.fillStyle = i % 3 === 0 ? '#FEF08A' : '#D4AF37';
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Disco ball motif
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(192, 168, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(192, 112);
    ctx.lineTo(192, 134);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FCD34D';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('MAPLEWOOD HIGH', 192, 74);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('PROM', 192, 272);
    ctx.fillStyle = '#F0D778';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('NIGHT', 192, 320);

    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(72, 344, 240, 3);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('BAL DE PROMO · STARLIGHT', 192, 384);
    ctx.font = '600 18px sans-serif';
    ctx.fillStyle = '#FCD34D';
    ctx.fillText('SAMEDI · 20H00 — GYMNASE', 192, 424);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '15px sans-serif';
    ctx.fillText('DJ LIVE · PHOTOS · COURONNEMENT', 192, 460);
  } else if (theme === 'science') {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0F3A42');
    grad.addColorStop(1, '#115E59');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 384, 512);

    // Subtle blueprint grid
    ctx.strokeStyle = 'rgba(153, 246, 228, 0.14)';
    ctx.lineWidth = 1;
    for (let g = 32; g < 384; g += 32) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 512);
      ctx.stroke();
    }
    for (let g = 32; g < 512; g += 32) {
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(384, g);
      ctx.stroke();
    }

    ctx.strokeStyle = '#5EEAD4';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 352, 480);

    // Atom orbital rings + flask icon
    ctx.save();
    ctx.translate(192, 178);
    ctx.strokeStyle = '#99F6E4';
    ctx.lineWidth = 3;
    for (const rot of [0, Math.PI / 3, -Math.PI / 3]) {
      ctx.save();
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(-12, -26);
    ctx.lineTo(12, -26);
    ctx.lineTo(30, 26);
    ctx.lineTo(-30, 26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#99F6E4';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText('AILE DES SCIENCES', 192, 62);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('SCIENCE', 192, 294);
    ctx.fillStyle = '#5EEAD4';
    ctx.fillText('FAIR', 192, 342);
    ctx.fillStyle = '#CCFBF1';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText('EXPOSITION & CONCOURS', 192, 392);
    ctx.fillStyle = '#FCD34D';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('VENDREDI · 14H00 · LABO CHIMIE', 192, 432);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '15px sans-serif';
    ctx.fillText('ROBOTIQUE · CHIMIE · ÉCOLOGIE', 192, 464);
  } else if (theme === 'gameday') {
    ctx.fillStyle = '#172A4D';
    ctx.fillRect(0, 0, 384, 512);
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(384, 0);
    ctx.lineTo(384, 96);
    ctx.lineTo(0, 140);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 352, 480);

    // Basketball icon
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.arc(192, 200, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(136, 200);
    ctx.lineTo(248, 200);
    ctx.moveTo(192, 144);
    ctx.lineTo(192, 256);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#172A4D';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('LES AIGLES', 192, 68);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('GO EAGLES!', 192, 306);
    ctx.fillStyle = '#FCD34D';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText('FINALE RÉGIONALE', 192, 354);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('VENDREDI · 18H00 · STADE', 192, 404);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '15px sans-serif';
    ctx.fillText('BASKET & FOOTBALL · ENTRÉE ÉLÈVES', 192, 446);
  } else if (theme === 'musical') {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#581C2E');
    grad.addColorStop(1, '#2E1025');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 384, 512);

    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 352, 480);

    // Stage spotlight beam
    ctx.fillStyle = 'rgba(253, 224, 71, 0.16)';
    ctx.beginPath();
    ctx.moveTo(192, 40);
    ctx.lineTo(84, 290);
    ctx.lineTo(300, 290);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 62px sans-serif';
    ctx.fillText('♪  ♫', 192, 185);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('CLUB MUSIQUE & THÉÂTRE', 192, 72);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('SPRING', 192, 286);
    ctx.fillStyle = '#FBBF24';
    ctx.fillText('MUSICAL', 192, 334);
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('JEUDI · 19H30 · SALLE 106', 192, 398);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '15px sans-serif';
    ctx.fillText('ORCHESTRE · CHORALE · ENTRÉE LIBRE', 192, 444);
  } else {
    ctx.fillStyle = '#F5EFE6';
    ctx.fillRect(0, 0, 384, 512);
    ctx.fillStyle = '#7F1D1D';
    ctx.fillRect(16, 16, 352, 84);
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 352, 480);

    // Book illustration
    ctx.fillStyle = '#1F3864';
    ctx.fillRect(114, 152, 74, 98);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(196, 152, 74, 98);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(122, 162, 58, 78);
    ctx.fillRect(204, 162, 58, 78);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('BIBLIOTHÈQUE', 192, 66);
    ctx.fillStyle = '#7F1D1D';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('FOIRE AUX', 192, 308);
    ctx.fillText('LIVRES', 192, 354);
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('LUNDI À VENDREDI · 12H–17H', 192, 408);
    ctx.fillStyle = '#475569';
    ctx.font = '15px sans-serif';
    ctx.fillText('ROMANS · BD · CLUB DE LECTURE', 192, 448);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function createCampusBulletinTexture(variant: 'courtyard' | 'activities'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 320);

  // Corkboard base with organic grain speckles
  ctx.fillStyle = '#B88B58';
  ctx.fillRect(0, 0, 512, 320);
  for (let i = 0; i < 1800; i++) {
    const x = hash01(i * 2.1 + 1.3) * 512;
    const y = hash01(i * 4.7 + 3.9) * 320;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(92,58,28,0.16)' : 'rgba(245,214,174,0.16)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Top title header strip
  ctx.fillStyle = '#1F3864';
  ctx.fillRect(14, 14, 484, 40);
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    variant === 'courtyard'
      ? 'PANNEAU D\'AFFICHAGE · MAPLEWOOD HIGH'
      : 'VIE SCOLAIRE · CLUBS & ÉVÉNEMENTS',
    256,
    34
  );

  const cards =
    variant === 'courtyard'
      ? [
          { x: 26, y: 70, w: 144, h: 110, bg: '#1E293B', fg: '#FCD34D', title: 'PROM NIGHT', sub: 'Sam. 20h · Gym', pin: '#EF4444' },
          { x: 184, y: 68, w: 144, h: 112, bg: '#0F766E', fg: '#CCFBF1', title: 'SCIENCE FAIR', sub: 'Ven. 14h · Labo', pin: '#F59E0B' },
          { x: 342, y: 72, w: 144, h: 108, bg: '#FEF3C7', fg: '#1F3864', title: 'EXAMS BLANCS', sub: 'Salles 101–103', pin: '#2563EB' },
          { x: 32, y: 196, w: 208, h: 104, bg: '#F8FAFC', fg: '#1E293B', title: 'BUS SCOLAIRES', sub: 'Départs 16h30 · Arrêt Sud', pin: '#10B981' },
          { x: 262, y: 194, w: 220, h: 106, bg: '#7F1D1D', fg: '#FDE68A', title: 'EAGLES BASKET', sub: 'Finale Régionale · Ven. 18h', pin: '#F59E0B' },
        ]
      : [
          { x: 26, y: 70, w: 144, h: 110, bg: '#581C87', fg: '#FDE68A', title: 'CLUB THÉÂTRE', sub: 'Jeudi 19h30', pin: '#F59E0B' },
          { x: 184, y: 68, w: 144, h: 112, bg: '#FFFFFF', fg: '#1F3864', title: 'MENU CANTINE', sub: 'Burger · Salade', pin: '#EF4444' },
          { x: 342, y: 72, w: 144, h: 108, bg: '#065F46', fg: '#ECFDF5', title: 'CLUB ÉCOLOGIE', sub: 'Mercredi 15h', pin: '#3B82F6' },
          { x: 32, y: 196, w: 208, h: 104, bg: '#EFF6FF', fg: '#1E3A8A', title: 'CLUB INFORMATIQUE', sub: 'Salle 104 · Accès libre', pin: '#EF4444' },
          { x: 262, y: 194, w: 220, h: 106, bg: '#1F3864', fg: '#D4AF37', title: 'FOIRE AUX LIVRES', sub: 'Bibliothèque · Toute la semaine', pin: '#10B981' },
        ];

  for (const c of cards) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(c.x + 4, c.y + 4, c.w, c.h);
    ctx.fillStyle = c.bg;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(15,23,42,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);

    ctx.fillStyle = c.pin;
    ctx.beginPath();
    ctx.arc(c.x + c.w * 0.5, c.y + 11, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.fg;
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(c.title, c.x + c.w * 0.5, c.y + 46, c.w - 14);
    ctx.font = '600 13px sans-serif';
    ctx.fillText(c.sub, c.x + c.w * 0.5, c.y + 78, c.w - 14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function createMaterialLibrary(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): MaterialLibrary {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures: THREE.Texture[] = [];

  const brickTex = createBrickTextures(maxAniso);
  brickTex.map.repeat.set(6, 2);
  brickTex.bumpMap.repeat.set(6, 2);
  brickTex.normalMap.repeat.set(6, 2);
  textures.push(brickTex.map, brickTex.bumpMap, brickTex.normalMap);

  const gymBrickMap = brickTex.map.clone();
  gymBrickMap.repeat.set(6, 4.5);
  gymBrickMap.needsUpdate = true;
  const gymBrickBump = brickTex.bumpMap.clone();
  gymBrickBump.repeat.set(6, 4.5);
  gymBrickBump.needsUpdate = true;
  textures.push(gymBrickMap, gymBrickBump);

  const concreteTex = createConcreteTexture(maxAniso, '#C8C5BE', true);
  concreteTex.map.repeat.set(6, 6);
  concreteTex.normalMap.repeat.set(6, 6);
  textures.push(concreteTex.map, concreteTex.normalMap);

  const limestoneTex = createConcreteTexture(maxAniso, '#DCD5C7', false);
  limestoneTex.map.repeat.set(3, 2);
  limestoneTex.normalMap.repeat.set(3, 2);
  textures.push(limestoneTex.map, limestoneTex.normalMap);

  const linoTex = createLinoleumTexture(maxAniso);
  linoTex.repeat.set(16, 3);
  textures.push(linoTex);

  const woodDeskTex = createWoodTexture(maxAniso, '#C89B6E', '#8F6239');
  textures.push(woodDeskTex);

  const gymTex = createGymCourtTexture(maxAniso);
  textures.push(gymTex);

  const grassTex = createGrassTexture(maxAniso);
  grassTex.repeat.set(24, 24);
  textures.push(grassTex);

  const asphaltTex = createAsphaltTexture(maxAniso);
  asphaltTex.repeat.set(16, 16);
  textures.push(asphaltTex);

  const barkTex = createBarkTextures(maxAniso);
  textures.push(barkTex.map, barkTex.bumpMap);

  const foliageTex = createFoliageTexture(maxAniso);
  textures.push(foliageTex);

  const shadowContactTex = createProjectedShadowTexture('contact', maxAniso);
  const shadowCanopyTex = createProjectedShadowTexture('canopy', maxAniso);
  const shadowPergolaTex = createProjectedShadowTexture('pergola', maxAniso);
  textures.push(shadowContactTex, shadowCanopyTex, shadowPergolaTex);

  const brick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: brickTex.map,
    bumpMap: brickTex.bumpMap,
    bumpScale: 0.045,
    normalMap: brickTex.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.82,
    metalness: 0.05,
  });

  const gymBrick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: gymBrickMap,
    bumpMap: gymBrickBump,
    bumpScale: 0.045,
    roughness: 0.85,
    metalness: 0.05,
  });

  const concrete = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: concreteTex.map,
    normalMap: concreteTex.normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.84,
    metalness: 0.04,
  });

  const concreteDark = new THREE.MeshStandardMaterial({
    color: 0x767b83,
    roughness: 0.88,
    metalness: 0.06,
  });

  const limestone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: limestoneTex.map,
    normalMap: limestoneTex.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.72,
    metalness: 0.04,
  });

  const roof = new THREE.MeshStandardMaterial({
    color: 0x5c6169,
    roughness: 0.92,
    metalness: 0.05,
  });

  const linoleum = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: linoTex,
    roughness: 0.42,
    metalness: 0.05,
  });

  const plasterWall = new THREE.MeshStandardMaterial({
    color: 0xeae6dc,
    roughness: 0.85,
    metalness: 0.02,
  });

  const lockerMetal = new THREE.MeshStandardMaterial({
    color: 0x1f3864,
    roughness: 0.36,
    metalness: 0.62,
  });

  const lockerTrim = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.78,
  });

  const woodDesk = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodDeskTex,
    roughness: 0.62,
    metalness: 0.04,
  });

  const woodDark = new THREE.MeshStandardMaterial({
    color: 0x5a3b24,
    roughness: 0.58,
    metalness: 0.05,
  });

  const gymParquet = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: gymTex,
    roughness: 0.32,
    metalness: 0.06,
  });

  const grass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grassTex,
    roughness: 0.95,
    metalness: 0.0,
  });

  const asphalt = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: asphaltTex,
    roughness: 0.9,
    metalness: 0.04,
  });

  const tintedGlass = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    roughness: 0.08,
    metalness: 0.1,
    transmission: isSoftwareGl ? 0 : 0.45,
    transparent: true,
    opacity: isSoftwareGl ? 0.48 : 0.72,
    ior: 1.5,
    depthWrite: false,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xd8dee6,
    roughness: 0.18,
    metalness: 0.9,
  });

  const gold = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.24,
    metalness: 0.88,
  });

  const navy = new THREE.MeshStandardMaterial({
    color: 0x1f3864,
    roughness: 0.52,
    metalness: 0.15,
  });

  const neonCeiling = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xfff4dd),
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const exitSign = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: new THREE.Color(0xef4444),
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });

  const whiteboard = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    metalness: 0.05,
  });

  const chalkboard = new THREE.MeshStandardMaterial({
    color: 0x1f4032,
    roughness: 0.85,
    metalness: 0.02,
  });

  const terracotta = new THREE.MeshStandardMaterial({
    color: 0x9e4738,
    roughness: 0.8,
    metalness: 0.05,
  });

  const bark = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: barkTex.map,
    bumpMap: barkTex.bumpMap,
    bumpScale: 0.06,
    roughness: 0.94,
    metalness: 0.0,
  });

  const foliage = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: foliageTex,
    roughness: 0.82,
    metalness: 0.0,
  });

  const trackRed = new THREE.MeshStandardMaterial({
    color: 0xa44234,
    roughness: 0.85,
    metalness: 0.02,
  });

  const turfGreen = new THREE.MeshStandardMaterial({
    color: 0x2f7532,
    roughness: 0.9,
    metalness: 0.0,
  });

  const water = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
  });

  const plasticSeat = new THREE.MeshStandardMaterial({
    color: 0x2a4b7c,
    roughness: 0.45,
    metalness: 0.08,
  });

  const wroughtIron = new THREE.MeshStandardMaterial({
    color: 0x222934,
    roughness: 0.36,
    metalness: 0.74,
  });

  const makeShadowDecalMat = (map: THREE.CanvasTexture) =>
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

  const shadowContact = makeShadowDecalMat(shadowContactTex);
  const shadowCanopy = makeShadowDecalMat(shadowCanopyTex);
  const shadowPergola = makeShadowDecalMat(shadowPergolaTex);

  const allMats = [
    brick,
    gymBrick,
    concrete,
    concreteDark,
    limestone,
    roof,
    linoleum,
    plasterWall,
    lockerMetal,
    lockerTrim,
    woodDesk,
    woodDark,
    gymParquet,
    grass,
    asphalt,
    tintedGlass,
    chrome,
    gold,
    navy,
    neonCeiling,
    exitSign,
    whiteboard,
    chalkboard,
    terracotta,
    bark,
    foliage,
    trackRed,
    turfGreen,
    water,
    plasticSeat,
    wroughtIron,
    shadowContact,
    shadowCanopy,
    shadowPergola,
  ];

  return {
    brick,
    gymBrick,
    concrete,
    concreteDark,
    limestone,
    roof,
    linoleum,
    plasterWall,
    lockerMetal,
    lockerTrim,
    woodDesk,
    woodDark,
    gymParquet,
    grass,
    asphalt,
    tintedGlass,
    chrome,
    gold,
    navy,
    neonCeiling,
    exitSign,
    whiteboard,
    chalkboard,
    terracotta,
    bark,
    foliage,
    trackRed,
    turfGreen,
    water,
    plasticSeat,
    wroughtIron,
    shadowContact,
    shadowCanopy,
    shadowPergola,
    textures,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      allMats.forEach((m) => m.dispose());
    },
  };
}
