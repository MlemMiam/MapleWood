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
  tex.anisotropy = Math.min(4, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function generateCyclicNormalMap(
  sourceCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  maxAniso: number,
  strength = 1.4,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const [nCanvas, nctx] = makeCanvas(w, h);
  const src = sourceCtx.getImageData(0, 0, w, h).data;
  const out = nctx.createImageData(w, h);
  const dst = out.data;

  const lumAt = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    const idx = (wy * w + wx) * 4;
    return (src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114) / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 3x3 cyclic Sobel filter for smooth, non-blocky normal transitions
      const tl = lumAt(x - 1, y - 1);
      const t = lumAt(x, y - 1);
      const tr = lumAt(x + 1, y - 1);
      const l = lumAt(x - 1, y);
      const r = lumAt(x + 1, y);
      const bl = lumAt(x - 1, y + 1);
      const b = lumAt(x, y + 1);
      const br = lumAt(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const invLen = 1 / Math.hypot(dx, dy, 1);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  nctx.putImageData(out, 0, 0);
  return configureTexture(nCanvas, repeatX, repeatY, false, maxAniso);
}

function drawToroidalEllipse(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): void {
  for (const ox of [-w, 0, w]) {
    if (cx + ox + rx < 0 || cx + ox - rx > w) continue;
    for (const oy of [-h, 0, h]) {
      if (cy + oy + ry < 0 || cy + oy - ry > h) continue;
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function createBrickTextures(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(512, 512);
  const [bumpCanvas, bumpCtx] = makeCanvas(512, 512);

  // Warm recessed mortar base
  ctx.fillStyle = '#C2B9AE';
  ctx.fillRect(0, 0, 512, 512);
  bumpCtx.fillStyle = '#2E2E2E';
  bumpCtx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const cols = 8;
  const brickH = 512 / rows;
  const brickW = 512 / cols;
  const mortar = 2.5;

  for (let r = 0; r < rows; r++) {
    const isFlemish = r % 4 === 2;
    const offset = (r % 2) * (brickW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * brickW + offset;
      const y = r * brickH;
      const seed = ((r * 19 + ((c + cols) % cols) * 37) % 29) - 14;
      const kilnWarmth = isFlemish && c % 2 === 0 ? -10 : 0;
      const red = Math.min(255, Math.max(0, 142 + seed + kilnWarmth));
      const green = Math.min(255, Math.max(0, 59 + Math.round((seed + kilnWarmth) * 0.44)));
      const blue = Math.min(255, Math.max(0, 54 + Math.round((seed + kilnWarmth) * 0.38)));

      const bx = x + mortar;
      const by = y + mortar;
      const bw = brickW - mortar * 2;
      const bh = brickH - mortar * 2;

      // Softly beveled brick face with kiln gradient
      const bGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
      bGrad.addColorStop(0, `rgb(${Math.min(255, red + 10)},${Math.min(255, green + 6)},${Math.min(255, blue + 5)})`);
      bGrad.addColorStop(0.75, `rgb(${red},${green},${blue})`);
      bGrad.addColorStop(1, `rgb(${Math.max(0, red - 14)},${Math.max(0, green - 8)},${Math.max(0, blue - 8)})`);
      ctx.fillStyle = bGrad;
      ctx.fillRect(bx, by, bw, bh);

      // Fine clay pores and mineral speckles inside each brick
      for (let p = 0; p < 14; p++) {
        const px = bx + 2 + hash01(r * 41 + c * 17 + p * 7.3) * (bw - 4);
        const py = by + 2 + hash01(r * 23 + c * 53 + p * 11.1) * (bh - 4);
        ctx.fillStyle = p % 2 === 0 ? 'rgba(28,14,10,0.12)' : 'rgba(245,215,195,0.09)';
        ctx.fillRect(px, py, 2, 1.5);
      }

      // Smooth pillowed height profile on bump canvas for rounded brick edges
      const hVal = 205 + seed;
      bumpCtx.fillStyle = `rgb(${hVal - 28}, ${hVal - 28}, ${hVal - 28})`;
      bumpCtx.fillRect(bx, by, bw, bh);
      bumpCtx.fillStyle = `rgb(${hVal}, ${hVal}, ${hVal})`;
      bumpCtx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
    }
  }

  const normalTex = generateCyclicNormalMap(bumpCtx, 512, 512, maxAniso, 1.8);

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
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Seamless periodic mineral clouds (toroidal ellipses)
  for (let i = 0; i < 140; i++) {
    const cx = hash01(i * 3.17 + 1.9) * size;
    const cy = hash01(i * 5.83 + 4.2) * size;
    const rx = 8 + hash01(i * 7.11) * 18;
    const ry = 6 + hash01(i * 9.43) * 14;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.032)' : 'rgba(30,34,40,0.032)';
    drawToroidalEllipse(ctx, size, size, cx, cy, rx, ry);
  }

  // Fine mineral aggregate & travertine pores (wrapped toroidally)
  for (let i = 0; i < 4600; i++) {
    const x = Math.floor(hash01(i * 1.13 + 3.1) * size);
    const y = Math.floor(hash01(i * 2.71 + 9.7) * size);
    const s = hash01(i * 4.3) > 0.72 ? 2 : 1;
    const alpha = 0.022 + hash01(i * 5.9) * 0.045;
    ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(28,32,38,${alpha})`;
    ctx.fillRect(x, y, s, s);
  }

  if (withPaverJoints) {
    // Dressed ashlar stone joints with subtle highlight bevel
    for (const p of [0, 64, 128, 192]) {
      ctx.fillStyle = 'rgba(38,44,52,0.17)';
      ctx.fillRect(0, p, size, 2);
      ctx.fillRect(p, 0, 2, size);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(0, (p + 2) % size, size, 1);
      ctx.fillRect((p + 2) % size, 0, 1, size);
    }
  } else {
    // Subtle horizontal limestone sedimentary veining (periodic sin wave)
    for (let v = 0; v < 10; v++) {
      const baseY = hash01(v * 13.7) * size;
      const amp = 2 + hash01(v * 7.9) * 4;
      const phase = hash01(v * 3.3) * Math.PI * 2;
      ctx.fillStyle = v % 2 === 0 ? 'rgba(255,250,240,0.06)' : 'rgba(90,82,70,0.05)';
      for (let x = 0; x < size; x += 2) {
        const wy = ((Math.round(baseY + Math.sin((x / size) * Math.PI * 2 + phase) * amp) % size) + size) % size;
        ctx.fillRect(x, wy, 2, 1.5);
      }
    }
  }

  const colorTex = configureTexture(canvas, 1, 1, true, maxAniso);
  const normalTex = generateCyclicNormalMap(ctx, size, size, maxAniso, withPaverJoints ? 1.5 : 1.1);
  return { map: colorTex, normalMap: normalTex };
}

function createLinoleumTexture(maxAniso: number) {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  const tile = 64;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const dark = (x + y) % 2 === 1;
      const tx = x * tile;
      const ty = y * tile;
      const grad = ctx.createLinearGradient(tx, ty, tx + tile, ty + tile);
      if (dark) {
        grad.addColorStop(0, '#363D4B');
        grad.addColorStop(1, '#2C323E');
      } else {
        grad.addColorStop(0, '#EFECE6');
        grad.addColorStop(1, '#E2DDD5');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(tx, ty, tile, tile);

      // Terrazzo marble flecks inside each tile
      for (let s = 0; s < 36; s++) {
        const fx = tx + 3 + (hash01(x * 13 + y * 29 + s * 3.7) * (tile - 6));
        const fy = ty + 3 + (hash01(x * 31 + y * 17 + s * 7.1) * (tile - 6));
        ctx.fillStyle =
          s % 3 === 0
            ? dark
              ? 'rgba(255,255,255,0.09)'
              : 'rgba(255,255,255,0.35)'
            : dark
              ? 'rgba(15,20,28,0.18)'
              : 'rgba(120,114,104,0.14)';
        ctx.fillRect(fx, fy, 2, 2);
      }

      // Fine recessed tile grout line + micro-bevel
      ctx.fillStyle = 'rgba(20,24,30,0.22)';
      ctx.fillRect(tx, ty, tile, 1.5);
      ctx.fillRect(tx, ty, 1.5, tile);
    }
  }
  return {
    map: configureTexture(canvas, 1, 1, true, maxAniso),
    normalMap: generateCyclicNormalMap(ctx, size, size, maxAniso, 0.9),
  };
}

function createWoodTexture(maxAniso: number, lightHex: string, grainHex: string) {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = lightHex;
  ctx.fillRect(0, 0, size, size);

  // Seamless periodic wood plank bands & organic cathedral grain waves
  const plankCount = 8;
  const plankH = size / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const py = p * plankH;
    const toneDelta = ((p * 7) % 3) - 1;
    if (toneDelta !== 0) {
      ctx.fillStyle = toneDelta > 0 ? 'rgba(255,245,230,0.06)' : 'rgba(40,22,10,0.05)';
      ctx.fillRect(0, py, size, plankH);
    }

    // Plank joint seam
    ctx.fillStyle = grainHex;
    ctx.globalAlpha = 0.38;
    ctx.fillRect(0, py, size, 1.5);

    // Continuous sinusoidal wood grain fibers (strictly periodic over X = 0..256)
    for (let f = 0; f < 10; f++) {
      const fyBase = py + 3 + (f / 10) * (plankH - 5);
      const amp = 0.8 + hash01(p * 19 + f * 7) * 1.8;
      const freq = (1 + (f % 3)) * ((Math.PI * 2) / size);
      const phase = hash01(p * 31 + f * 11) * Math.PI * 2;
      ctx.globalAlpha = 0.08 + (f % 3) * 0.04;
      for (let x = 0; x < size; x += 2) {
        const y = fyBase + Math.sin(x * freq + phase) * amp;
        ctx.fillRect(x, y, 2, 1.2);
      }
    }
  }
  ctx.globalAlpha = 1;
  return {
    map: configureTexture(canvas, 1, 1, true, maxAniso),
    normalMap: generateCyclicNormalMap(ctx, size, size, maxAniso, 1.0),
  };
}

function createGymCourtTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(1024, 512);
  ctx.fillStyle = '#BA8552';
  ctx.fillRect(0, 0, 1024, 512);

  // Detailed maple hardwood strips with staggered butt-joints and grain
  for (let y = 0; y < 512; y += 16) {
    const rowIdx = y / 16;
    const stagger = (rowIdx * 137) % 160;
    for (let x = -stagger; x < 1024; x += 160) {
      const shade = ((rowIdx * 13 + Math.floor((x + 200) / 160) * 7) % 5) * 4 - 8;
      ctx.fillStyle = `rgb(${182 + shade}, ${130 + shade}, ${80 + Math.round(shade * 0.7)})`;
      ctx.fillRect(x, y, 159, 15);
      ctx.fillStyle = 'rgba(70,40,18,0.16)';
      ctx.fillRect(x, y + 4, 159, 1);
      ctx.fillRect(x, y + 10, 159, 1);
      ctx.fillStyle = 'rgba(45,25,10,0.28)';
      ctx.fillRect(x + 158, y, 1.5, 15);
    }
    ctx.fillStyle = 'rgba(40,22,10,0.22)';
    ctx.fillRect(0, y + 15, 1024, 1);
  }

  // Painted perimeter apron border in Maplewood Navy
  ctx.strokeStyle = '#1F3864';
  ctx.lineWidth = 22;
  ctx.strokeRect(34, 24, 956, 464);

  // Crisp gold inner court boundary line
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 5;
  ctx.strokeRect(48, 36, 928, 440);

  // Center line
  ctx.beginPath();
  ctx.moveTo(512, 36);
  ctx.lineTo(512, 476);
  ctx.stroke();

  // Center circle & Maplewood Eagles emblem
  ctx.fillStyle = 'rgba(31, 56, 100, 0.92)';
  ctx.beginPath();
  ctx.arc(512, 256, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EAGLES', 512, 256);

  // Shaded paint keys & 3-point arcs
  ctx.fillStyle = 'rgba(31, 56, 100, 0.78)';
  ctx.fillRect(48, 176, 160, 160);
  ctx.fillRect(816, 176, 160, 160);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 5;
  ctx.strokeRect(48, 176, 160, 160);
  ctx.strokeRect(816, 176, 160, 160);

  // Free-throw circles
  ctx.beginPath();
  ctx.arc(208, 256, 54, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(816, 256, 54, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();

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
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#4A7C3F';
  ctx.fillRect(0, 0, size, size);

  // Seamless toroidal turf patches for natural lawn variation without grid seams
  for (let p = 0; p < 160; p++) {
    const cx = hash01(p * 2.9 + 0.7) * size;
    const cy = hash01(p * 5.3 + 1.3) * size;
    const rx = 10 + hash01(p * 7.7) * 20;
    const ry = 10 + hash01(p * 11.3) * 20;
    ctx.fillStyle = p % 2 === 0 ? 'rgba(96, 152, 74, 0.08)' : 'rgba(52, 96, 44, 0.08)';
    drawToroidalEllipse(ctx, size, size, cx, cy, rx, ry);
  }

  // Fine individual grass blades wrapped modulo 256
  for (let i = 0; i < 5200; i++) {
    const x = Math.floor(hash01(i * 1.9 + 1.4) * size);
    const y = Math.floor(hash01(i * 3.7 + 6.2) * size);
    ctx.fillStyle =
      i % 4 === 0 ? '#5B944C' : i % 4 === 1 ? '#3D6A33' : i % 4 === 2 ? '#4E8242' : '#659E54';
    ctx.fillRect(x, y, 1.5, 3);
    if (y + 3 > size) {
      ctx.fillRect(x, 0, 1.5, y + 3 - size);
    }
  }
  return {
    map: configureTexture(canvas, 1, 1, true, maxAniso),
    normalMap: generateCyclicNormalMap(ctx, size, size, maxAniso, 1.15),
  };
}

function createAsphaltTexture(maxAniso: number) {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#363940';
  ctx.fillRect(0, 0, size, size);

  // Toroidal weathered aggregate patches
  for (let p = 0; p < 90; p++) {
    const cx = hash01(p * 4.1 + 2.2) * size;
    const cy = hash01(p * 6.7 + 3.8) * size;
    const r = 8 + hash01(p * 8.9) * 16;
    ctx.fillStyle = p % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(12,14,18,0.035)';
    drawToroidalEllipse(ctx, size, size, cx, cy, r, r);
  }

  for (let i = 0; i < 5400; i++) {
    const x = Math.floor(hash01(i * 2.3 + 4.1) * size);
    const y = Math.floor(hash01(i * 4.9 + 8.3) * size);
    const alpha = 0.035 + hash01(i * 7.1) * 0.065;
    ctx.fillStyle = i % 3 === 0 ? `rgba(220,226,232,${alpha})` : `rgba(12,14,18,${alpha * 1.35})`;
    ctx.fillRect(x, y, 2, 2);
  }
  return {
    map: configureTexture(canvas, 1, 1, true, maxAniso),
    normalMap: generateCyclicNormalMap(ctx, size, size, maxAniso, 1.4),
  };
}

function createBarkTextures(maxAniso: number) {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  const [bumpCanvas, bumpCtx] = makeCanvas(size, size);
  ctx.fillStyle = '#5B4031';
  ctx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#787878';
  bumpCtx.fillRect(0, 0, size, size);

  // Seamless vertical bark fissures wrapped modulo 256 on both X and Y
  for (let i = 0; i < 280; i++) {
    const x = Math.floor(hash01(i * 3.1) * size);
    const y = Math.floor(hash01(i * 5.7) * size);
    const w = 2 + Math.floor(hash01(i * 7.3) * 4);
    const h = 20 + Math.floor(hash01(i * 11.1) * 48);
    const dark = i % 2 === 0;
    const colorFill = dark ? 'rgba(34,21,15,0.46)' : 'rgba(132,98,72,0.3)';
    const bumpFill = dark ? '#303030' : '#C2C2C2';

    for (const oy of [-size, 0, size]) {
      if (y + oy + h < 0 || y + oy > size) continue;
      ctx.fillStyle = colorFill;
      ctx.fillRect(x, y + oy, w, h);
      bumpCtx.fillStyle = bumpFill;
      bumpCtx.fillRect(x, y + oy, w, h);
    }
  }
  return {
    map: configureTexture(canvas, 2, 2, true, maxAniso),
    bumpMap: configureTexture(bumpCanvas, 2, 2, false, maxAniso),
    normalMap: generateCyclicNormalMap(bumpCtx, size, size, maxAniso, 1.6, 2, 2),
  };
}

function createFoliageTexture(maxAniso: number) {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#478440';
  ctx.fillRect(0, 0, size, size);

  // Seamless overlapping leaf clusters (toroidal wrapping on X & Y)
  for (let i = 0; i < 1800; i++) {
    const cx = hash01(i * 1.7 + 0.5) * size;
    const cy = hash01(i * 4.1 + 2.9) * size;
    const rx = 2.5 + hash01(i * 6.3) * 4.2;
    const ry = 1.8 + hash01(i * 8.1) * 3.2;
    ctx.fillStyle =
      i % 4 === 0
        ? 'rgba(122,186,82,0.34)'
        : i % 4 === 1
          ? 'rgba(38,84,34,0.38)'
          : i % 4 === 2
            ? 'rgba(88,148,66,0.32)'
            : 'rgba(142,202,96,0.22)';
    drawToroidalEllipse(ctx, size, size, cx, cy, rx, ry);
  }
  return {
    map: configureTexture(canvas, 2, 2, true, maxAniso),
    normalMap: generateCyclicNormalMap(ctx, size, size, maxAniso, 1.35, 2, 2),
  };
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
  linoTex.map.repeat.set(16, 3);
  linoTex.normalMap.repeat.set(16, 3);
  textures.push(linoTex.map, linoTex.normalMap);

  const woodDeskTex = createWoodTexture(maxAniso, '#C89B6E', '#8F6239');
  textures.push(woodDeskTex.map, woodDeskTex.normalMap);

  const woodDarkTex = createWoodTexture(maxAniso, '#6B462B', '#3E2514');
  textures.push(woodDarkTex.map, woodDarkTex.normalMap);

  const gymTex = createGymCourtTexture(maxAniso);
  textures.push(gymTex);

  const grassTex = createGrassTexture(maxAniso);
  grassTex.map.repeat.set(28, 28);
  grassTex.normalMap.repeat.set(28, 28);
  textures.push(grassTex.map, grassTex.normalMap);

  const asphaltTex = createAsphaltTexture(maxAniso);
  asphaltTex.map.repeat.set(18, 18);
  asphaltTex.normalMap.repeat.set(18, 18);
  textures.push(asphaltTex.map, asphaltTex.normalMap);

  const barkTex = createBarkTextures(maxAniso);
  textures.push(barkTex.map, barkTex.bumpMap, barkTex.normalMap);

  const foliageTex = createFoliageTexture(maxAniso);
  textures.push(foliageTex.map, foliageTex.normalMap);

  const plasterTex = createConcreteTexture(maxAniso, '#EAE6DC', false);
  plasterTex.map.repeat.set(8, 2);
  plasterTex.normalMap.repeat.set(8, 2);
  textures.push(plasterTex.map, plasterTex.normalMap);

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
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.8,
    metalness: 0.05,
  });

  const gymBrick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: gymBrickMap,
    bumpMap: gymBrickBump,
    bumpScale: 0.045,
    roughness: 0.84,
    metalness: 0.05,
  });

  const concrete = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: concreteTex.map,
    normalMap: concreteTex.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.82,
    metalness: 0.04,
  });

  const concreteDark = new THREE.MeshStandardMaterial({
    color: 0x767b83,
    normalMap: concreteTex.normalMap,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughness: 0.86,
    metalness: 0.06,
  });

  const limestone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: limestoneTex.map,
    normalMap: limestoneTex.normalMap,
    normalScale: new THREE.Vector2(0.38, 0.38),
    roughness: 0.7,
    metalness: 0.04,
  });

  const roof = new THREE.MeshStandardMaterial({
    color: 0x5c6169,
    normalMap: asphaltTex.normalMap,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.9,
    metalness: 0.05,
  });

  const linoleum = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: linoTex.map,
    normalMap: linoTex.normalMap,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.36,
    metalness: 0.06,
  });

  const plasterWall = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plasterTex.map,
    normalMap: plasterTex.normalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
    roughness: 0.82,
    metalness: 0.02,
  });

  const lockerMetal = new THREE.MeshStandardMaterial({
    color: 0x1f3864,
    roughness: 0.34,
    metalness: 0.65,
  });

  const lockerTrim = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 0.8,
  });

  const woodDesk = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodDeskTex.map,
    normalMap: woodDeskTex.normalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.56,
    metalness: 0.05,
  });

  const woodDark = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodDarkTex.map,
    normalMap: woodDarkTex.normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.52,
    metalness: 0.05,
  });

  const gymParquet = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: gymTex,
    normalMap: woodDeskTex.normalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
    roughness: 0.28,
    metalness: 0.07,
  });

  const grass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grassTex.map,
    normalMap: grassTex.normalMap,
    normalScale: new THREE.Vector2(0.38, 0.38),
    roughness: 0.92,
    metalness: 0.0,
  });

  const asphalt = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: asphaltTex.map,
    normalMap: asphaltTex.normalMap,
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughness: 0.88,
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
    roughness: 0.22,
    metalness: 0.88,
  });

  const navy = new THREE.MeshStandardMaterial({
    color: 0x1f3864,
    roughness: 0.5,
    metalness: 0.16,
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
    roughness: 0.2,
    metalness: 0.06,
  });

  const chalkboard = new THREE.MeshStandardMaterial({
    color: 0x1f4032,
    roughness: 0.82,
    metalness: 0.02,
  });

  const terracotta = new THREE.MeshStandardMaterial({
    color: 0x9e4738,
    roughness: 0.78,
    metalness: 0.05,
  });

  const bark = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: barkTex.map,
    bumpMap: barkTex.bumpMap,
    bumpScale: 0.06,
    normalMap: barkTex.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.92,
    metalness: 0.0,
  });

  const foliage = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: foliageTex.map,
    normalMap: foliageTex.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.8,
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
