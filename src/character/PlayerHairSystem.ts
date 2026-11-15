import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMHumanBoneName, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export type HairCategoryId = 'base' | 'front' | 'back' | 'side' | 'ex' | 'extra';

export interface HairStrandData {
  /** Effective strand width in meters (already scaled by group multiplier) */
  w: number;
  /** Effective strand diamond thickness in meters (already scaled by group multiplier) */
  t: number;
  /** Peak width position along the strand (0.05..0.85) */
  pk?: number;
  /** Root cross-section profile preset (0 = pinched root, >0 = unpinched root) */
  pr?: number;
  /** [x, y, z, nx, ny, nz] in J_Bip_C_Head local VRM0 space */
  pts: Array<[number, number, number, number, number, number]>;
}

export interface HairCatalogItem {
  id: string;
  thumbnail: string;
  mainTexture: string;
  strandsCount: number;
  strands: HairStrandData[];
}

export interface HairCatalogData {
  items: Record<string, HairCatalogItem>;
}

export interface BaseScalpMeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

export interface PlayerHairSelection {
  base: string | null;
  front: string | null;
  back: string | null;
  side: string | null;
  ex: string | null;
  extra: string | null;
  colorHex: string;
}

export type PlayerGender = 'female' | 'male';

export interface HairCategoryMeta {
  id: HairCategoryId;
  label: string;
  subtitle: string;
  assetPrefix: string;
  allowNone: boolean;
  defaultCameraYaw: number;
  defaultCameraPitch: number;
  items: Array<{
    id: string;
    name: string;
    badge: string;
    thumbnail: string;
  }>;
}

export const HAIR_COLOR_PRESETS: Array<{
  id: string;
  name: string;
  hex: string;
  swatch: string;
}> = [
  { id: 'natural', name: 'Châtain Original', hex: '#ffffff', swatch: '#7e5643' },
  { id: 'raven', name: 'Noir Corbeau', hex: '#4a4656', swatch: '#23212b' },
  { id: 'blonde', name: 'Blond Doré', hex: '#ffd88a', swatch: '#eab959' },
  { id: 'sakura', name: 'Rose Sakura', hex: '#ffb5d0', swatch: '#e87ea6' },
  { id: 'auburn', name: 'Roux Cuivré', hex: '#e87a52', swatch: '#c44f29' },
  { id: 'silver', name: 'Argent Céleste', hex: '#dce5f7', swatch: '#b4c2de' },
  { id: 'midnight', name: 'Bleu Nuit', hex: '#5f82d9', swatch: '#3553a1' },
  { id: 'lavender', name: 'Violet Lavande', hex: '#bfa0f5', swatch: '#8f6bc9' },
];

export const DEFAULT_PLAYER_HAIR_SELECTION: PlayerHairSelection = {
  base: 'Base1',
  front: 'Front2',
  back: 'Back1',
  side: 'Side1',
  ex: null,
  extra: null,
  colorHex: '#ffffff',
};

export const HAIR_CATEGORIES_META: HairCategoryMeta[] = [
  {
    id: 'base',
    label: 'Base',
    subtitle: 'Calotte & implantation de base',
    assetPrefix: 'Base',
    allowNone: true,
    defaultCameraYaw: 0.25,
    defaultCameraPitch: 0.14,
    items: [
      {
        id: 'Base1',
        name: 'Base Classique N00',
        badge: 'Base 1',
        thumbnail: '/assets/player/thumbnails/Base1.png',
      },
    ],
  },
  {
    id: 'front',
    label: 'Franges',
    subtitle: 'Assets "front" — Franges & rideaux avant',
    assetPrefix: 'Front',
    allowNone: true,
    defaultCameraYaw: 0.0,
    defaultCameraPitch: 0.04,
    items: [
      { id: 'Front2', name: 'Frange Rideau Élégante', badge: 'Front 1', thumbnail: '/assets/player/thumbnails/Front2.png' },
      { id: 'Front3', name: 'Frange Aérée Courte', badge: 'Front 2', thumbnail: '/assets/player/thumbnails/Front3.png' },
      { id: 'Front4', name: 'Frange Droite Écolière', badge: 'Front 3', thumbnail: '/assets/player/thumbnails/Front4.png' },
      { id: 'Front5', name: 'Frange Asymétrique Rebelle', badge: 'Front 4', thumbnail: '/assets/player/thumbnails/Front5.png' },
      { id: 'Front9', name: 'Frange Ouverte Soleil', badge: 'Front 5', thumbnail: '/assets/player/thumbnails/Front9.png' },
    ],
  },
  {
    id: 'back',
    label: 'Cheveux',
    subtitle: 'Assets "back" — Coupe & volume arrière',
    assetPrefix: 'Back',
    allowNone: true,
    defaultCameraYaw: 2.35,
    defaultCameraPitch: 0.08,
    items: [
      { id: 'Back1', name: 'Carré Plongeant Court', badge: 'Back 1', thumbnail: '/assets/player/thumbnails/Back1.png' },
      { id: 'Back2', name: 'Mi-Long Ondulé Souple', badge: 'Back 2', thumbnail: '/assets/player/thumbnails/Back2.png' },
      { id: 'Back3', name: 'Volume Évasé Dynamique', badge: 'Back 3', thumbnail: '/assets/player/thumbnails/Back3.png' },
      { id: 'Back4', name: 'Longue Cascade Soyeuse', badge: 'Back 4', thumbnail: '/assets/player/thumbnails/Back4.png' },
      { id: 'Back5', name: 'Carré Arrondi Classique', badge: 'Back 5', thumbnail: '/assets/player/thumbnails/Back5.png' },
      { id: 'Back6', name: 'Dégradé Mi-Long Aéré', badge: 'Back 6', thumbnail: '/assets/player/thumbnails/Back6.png' },
      { id: 'Back7', name: 'Coupe Courte Effilée', badge: 'Back 7', thumbnail: '/assets/player/thumbnails/Back7.png' },
      { id: 'Back8', name: 'Longueur Épaules Douce', badge: 'Back 8', thumbnail: '/assets/player/thumbnails/Back8.png' },
      { id: 'Back9', name: 'Carré Structuré Moderne', badge: 'Back 9', thumbnail: '/assets/player/thumbnails/Back9.png' },
      { id: 'Back11', name: 'Nuque Dégradée Fine', badge: 'Back 10', thumbnail: '/assets/player/thumbnails/Back11.png' },
      { id: 'Back12', name: 'Carré Flou Naturel', badge: 'Back 11', thumbnail: '/assets/player/thumbnails/Back12.png' },
    ],
  },
  {
    id: 'side',
    label: 'Mèches',
    subtitle: 'Assets "side" — Mèches latérales & favoris',
    assetPrefix: 'Side',
    allowNone: true,
    defaultCameraYaw: 0.58,
    defaultCameraPitch: 0.03,
    items: Array.from({ length: 4 }, (_, i) => {
      const n = i + 1;
      const names = [
        'Mèches Ondulées Longues',
        'Mèches Encadrantes Douces',
        'Longues Mèches Princesse',
        'Mèches Effilées Joues',
      ];
      return {
        id: `Side${n}`,
        name: names[i] || `Mèches ${n}`,
        badge: `Side ${n}`,
        thumbnail: `/assets/player/thumbnails/Side${n}.png`,
      };
    }),
  },
  {
    id: 'ex',
    label: 'Extensions',
    subtitle: 'Assets "ex" — Couettes, tresses & queues',
    assetPrefix: 'Ex',
    allowNone: true,
    defaultCameraYaw: -0.55,
    defaultCameraPitch: 0.06,
    items: [
      { id: 'Ex1', name: 'Couettes Cœur Tressées', badge: 'Ex 1', thumbnail: '/assets/player/thumbnails/Ex1.png' },
      { id: 'Ex4', name: 'Couettes Cœur Romantiques', badge: 'Ex 2', thumbnail: '/assets/player/thumbnails/Ex4.png' },
      { id: 'Ex5', name: 'Petits Chignons Hauts', badge: 'Ex 3', thumbnail: '/assets/player/thumbnails/Ex5.png' },
      { id: 'Ex6', name: 'Demi-Couettes Ruban', badge: 'Ex 4', thumbnail: '/assets/player/thumbnails/Ex6.png' },
      { id: 'Ex7', name: 'Couettes Basses Souples', badge: 'Ex 5', thumbnail: '/assets/player/thumbnails/Ex7.png' },
      { id: 'Ex8', name: 'Attaches Latérales Douces', badge: 'Ex 6', thumbnail: '/assets/player/thumbnails/Ex8.png' },
      { id: 'Ex9', name: 'Longues Couettes Fluides', badge: 'Ex 7', thumbnail: '/assets/player/thumbnails/Ex9.png' },
      { id: 'Ex12', name: 'Macarons Tressés Hauts', badge: 'Ex 8', thumbnail: '/assets/player/thumbnails/Ex12.png' },
      { id: 'Ex14', name: 'Volume Latéral Bouclé', badge: 'Ex 9', thumbnail: '/assets/player/thumbnails/Ex14.png' },
    ],
  },
  {
    id: 'extra',
    label: 'Accessoires',
    subtitle: 'Assets "extra" — Tresses d’ornement & épis',
    assetPrefix: 'Extra',
    allowNone: true,
    defaultCameraYaw: 0.38,
    defaultCameraPitch: 0.16,
    items: Array.from({ length: 5 }, (_, i) => {
      const n = i + 1;
      const names = [
        'Petites Nattes Latérales',
        'Couronne Tressée Fine',
        'Tresses Bohèmes Doubles',
        'Bandeau Tressé Épais',
        'Épi Ahoge & Mèche Anime',
      ];
      return {
        id: `Extra${n}`,
        name: names[i] || `Accessoire ${n}`,
        badge: `Extra ${n}`,
        thumbnail: `/assets/player/thumbnails/Extra${n}.png`,
      };
    }),
  },
];

let _catalogPromise: Promise<HairCatalogData> | null = null;
let _baseScalpPromise: Promise<BaseScalpMeshData> | null = null;
let _femPlayerBufferPromise: Promise<ArrayBuffer> | null = null;
let _malePlayerBufferPromise: Promise<ArrayBuffer> | null = null;
let _hairToonGradientTex: THREE.DataTexture | null = null;
const _textureCache = new Map<string, THREE.Texture>();
const _geometryCache = new Map<string, THREE.BufferGeometry>();

export function loadHairCatalog(): Promise<HairCatalogData> {
  if (!_catalogPromise) {
    _catalogPromise = fetch('/assets/player/hair_catalog.json').then(async (res) => {
      if (!res.ok) throw new Error('Impossible de charger hair_catalog.json');
      return (await res.json()) as HairCatalogData;
    });
  }
  return _catalogPromise;
}

export function loadBaseScalpMeshData(): Promise<BaseScalpMeshData> {
  if (!_baseScalpPromise) {
    _baseScalpPromise = fetch('/assets/player/base_scalp_mesh.json').then(async (res) => {
      if (!res.ok) throw new Error('Impossible de charger base_scalp_mesh.json');
      return (await res.json()) as BaseScalpMeshData;
    });
  }
  return _baseScalpPromise;
}

export function loadFemPlayerVrmBuffer(): Promise<ArrayBuffer> {
  if (!_femPlayerBufferPromise) {
    _femPlayerBufferPromise = fetch('/assets/player/FemPlayer.vrm').then(async (res) => {
      if (!res.ok) throw new Error('Impossible de charger FemPlayer.vrm');
      return await res.arrayBuffer();
    });
  }
  return _femPlayerBufferPromise;
}

export function loadMalePlayerVrmBuffer(): Promise<ArrayBuffer> {
  if (!_malePlayerBufferPromise) {
    _malePlayerBufferPromise = fetch('/assets/player/MalePlayer.vrm').then(async (res) => {
      if (!res.ok) throw new Error('Impossible de charger MalePlayer.vrm');
      return await res.arrayBuffer();
    });
  }
  return _malePlayerBufferPromise;
}

export function loadPlayerVrmBuffer(gender: PlayerGender): Promise<ArrayBuffer> {
  return gender === 'male' ? loadMalePlayerVrmBuffer() : loadFemPlayerVrmBuffer();
}

function getHairTexture(url: string): THREE.Texture {
  let tex = _textureCache.get(url);
  if (!tex) {
    const loader = new THREE.TextureLoader();
    tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.flipY = false;
    _textureCache.set(url, tex);
  }
  return tex;
}

function getAnimeHairGradientMap(): THREE.DataTexture {
  if (!_hairToonGradientTex) {
    // 4-step soft cel-shaded anime ramp (deep shadow -> mid-shadow -> lit base -> angel-ring highlight)
    const data = new Uint8Array([
      158, 152, 168, 255,
      198, 194, 206, 255,
      238, 236, 242, 255,
      255, 255, 255, 255,
    ]);
    const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    _hairToonGradientTex = tex;
  }
  return _hairToonGradientTex;
}

/**
 * Builds or retrieves a cached 3D BufferGeometry for a given hair item ID
 * in J_Bip_C_Head local VRM0 coordinate space, using the authentic VRoid Studio
 * two-strip (Front + Back) unshared-edge diamond ribbon geometry so strands
 * look like crisp anime locks instead of smoothed cylindrical blobs ("pâtés").
 */
export function buildHairItemGeometry(
  itemId: string,
  catalog: HairCatalogData,
  baseScalpData: BaseScalpMeshData
): THREE.BufferGeometry | null {
  const cached = _geometryCache.get(itemId);
  if (cached) return cached;

  if (itemId === 'Base1') {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(baseScalpData.positions, 3)
    );
    geom.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(baseScalpData.normals, 3)
    );
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(baseScalpData.uvs, 2));
    geom.setIndex(baseScalpData.indices);
    geom.computeBoundingSphere();
    _geometryCache.set(itemId, geom);
    return geom;
  }

  const item = catalog.items[itemId];
  if (!item || !item.strands || item.strands.length === 0) {
    return null;
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const STEPS = 16;
  const skullCenter = new THREE.Vector3(0, 0.085, -0.005);
  const tmpP = new THREE.Vector3();
  const tmpNext = new THREE.Vector3();
  const tmpPrev = new THREE.Vector3();
  const tmpT = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const prevN = new THREE.Vector3();
  const vLeft = new THREE.Vector3();
  const vOuter = new THREE.Vector3();
  const vRight = new THREE.Vector3();
  const vInner = new THREE.Vector3();
  const nFrontLeft = new THREE.Vector3();
  const nFrontCrest = new THREE.Vector3();
  const nFrontRight = new THREE.Vector3();
  const nBackRight = new THREE.Vector3();
  const nBackCrest = new THREE.Vector3();
  const nBackLeft = new THREE.Vector3();

  for (let sIdx = 0; sIdx < item.strands.length; sIdx++) {
    const strand = item.strands[sIdx];
    const pts = strand.pts;
    if (pts.length < 2) continue;

    const posPts = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));

    // Stabilize control point normals so adjacent control points never flip >90 deg,
    // and ensure the strand's average normal points radially outward from the skull center.
    const normPts: THREE.Vector3[] = [];
    let radialDotSum = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = posPts[i];
      const n = new THREE.Vector3(pts[i][3], pts[i][4], pts[i][5]);
      if (n.lengthSq() < 1e-6) {
        n.subVectors(p, skullCenter).normalize();
      } else {
        n.normalize();
      }
      if (i > 0 && n.dot(normPts[i - 1]) < 0) {
        n.negate();
      }
      normPts.push(n);
      radialDotSum +=
        (p.x - skullCenter.x) * n.x +
        (p.y - skullCenter.y) * n.y +
        (p.z - skullCenter.z) * n.z;
    }
    if (radialDotSum < -0.02) {
      for (const n of normPts) n.negate();
    }

    const posCurve = new THREE.CatmullRomCurve3(posPts, false, 'centripetal', 0.5);
    const normCurve = new THREE.CatmullRomCurve3(normPts, false, 'centripetal', 0.5);

    const strandWidth = Math.min(0.056, Math.max(0.0035, strand.w || 0.024));
    const strandThick = Math.min(
      0.011,
      strandWidth * 0.32,
      Math.max(0.0018, strand.t || strandWidth * 0.22)
    );
    const peakU = THREE.MathUtils.clamp(strand.pk ?? 0.24, 0.14, 0.45);
    const rootPinched = (strand.pr ?? 0) === 0;

    // Distribute UV U strips across the VRoid hair texture so strands have natural hair fiber variation
    const uStripBase = 0.14 + ((sIdx * 0.173) % 0.64);
    const uStripSpan = 0.16;
    const uFL = uStripBase;
    const uFC = uStripBase + uStripSpan * 0.5;
    const uFR = uStripBase + uStripSpan;
    const uBR = uStripBase + uStripSpan;
    const uBC = uStripBase + uStripSpan * 1.5;
    const uBL = uStripBase + uStripSpan * 2.0;

    // Each row k emits 6 vertices:
    // Front strip: 0 = FrontLeft, 1 = FrontCrest (outer), 2 = FrontRight
    // Back strip:  3 = BackRight, 4 = BackCrest (inner),  5 = BackLeft
    // Keeping Front and Back strips on separate vertices prevents sharp left/right
    // silhouette edges from ever being smoothed into round sausages!
    const baseVertexOffset = positions.length / 3;

    for (let k = 0; k <= STEPS; k++) {
      const u = k / STEPS;
      posCurve.getPoint(u, tmpP);
      normCurve.getPoint(u, tmpN).normalize();

      // Compute smooth tangent T from root toward tip
      const uPrev = Math.max(0, u - 0.035);
      const uNext = Math.min(1, u + 0.035);
      posCurve.getPoint(uPrev, tmpPrev);
      posCurve.getPoint(uNext, tmpNext);
      tmpT.subVectors(tmpNext, tmpPrev);
      if (tmpT.lengthSq() < 1e-8) {
        tmpT.set(0, -1, 0);
      } else {
        tmpT.normalize();
      }

      // Orthogonalize outward normal N against tangent T
      const dotNT = tmpN.dot(tmpT);
      tmpN.addScaledVector(tmpT, -dotNT);
      if (tmpN.lengthSq() < 1e-6) {
        if (k > 0) {
          tmpN.copy(prevN);
        } else {
          tmpN.subVectors(tmpP, skullCenter).normalize();
        }
      } else {
        tmpN.normalize();
      }
      if (k > 0 && tmpN.dot(prevN) < 0) {
        tmpN.negate();
      }
      prevN.copy(tmpN);

      // Binormal B = N_out x T so that (Left -> Crest -> Right) has outward normal +N_out
      tmpB.crossVectors(tmpN, tmpT);
      if (tmpB.lengthSq() < 1e-6) {
        tmpB.set(1, 0, 0);
      } else {
        tmpB.normalize();
      }

      // Exact VRoid Studio width & thickness envelope along u in [0, 1]:
      // Near roots (u <= peakU), strands originate fine and flat against the scalp,
      // avoiding chunky overlapping "pâtés" at the crown of the head.
      let env: number;
      if (u <= peakU) {
        const t = u / peakU;
        const s = Math.sin(t * (Math.PI * 0.5));
        const rootW = rootPinched ? 0.0 : 0.12;
        env = rootW + (1.0 - rootW) * s;
      } else {
        const t = (u - peakU) / (1.0 - peakU);
        // Smooth anime lock taper to a sharp point at u = 1.0
        env = Math.pow(Math.cos(t * (Math.PI * 0.5)), 0.88);
      }

      // Smooth taper at the very root (u < 0.06) so strands emerge smoothly without "pâtés" at the crown
      if (u < 0.06) {
        const rootTaper = u / 0.06;
        env *= 0.1 + 0.9 * Math.sin(rootTaper * Math.PI * 0.5);
      }

      // Root thickness starts flat against the skull and blooms smoothly into 3D volume
      const rootThickFactor = Math.pow(Math.min(1, u / (peakU * 0.85)), 1.4);
      const halfW = strandWidth * 0.5 * env;
      const halfT = strandThick * 0.5 * env * rootThickFactor;

      // 4 geometric corner positions of the VRoid diamond cross-section
      const isFrontBang = itemId.startsWith('Front');
      const effP = tmpP.clone();
      if (isFrontBang && effP.y > 0.01 && effP.y < 0.18 && effP.z < -0.04) {
        // Lift bangs gracefully forward outward over the brow line so eyebrows never poke through
        effP.addScaledVector(tmpN, 0.0075);
      }
      vLeft.copy(effP).addScaledVector(tmpB, -halfW);
      vOuter.copy(effP).addScaledVector(tmpN, halfT);
      vRight.copy(effP).addScaledVector(tmpB, halfW);
      vInner.copy(effP).addScaledVector(tmpN, -halfT * 0.85);

      // Exact VRoid Studio diamond crease normals (verified from Florie.vrm Hair001):
      // Front strip normals point outward (+0.85 N_out ± 0.53 B on edges, +1.0 N_out on crest)
      nFrontLeft.copy(tmpN).multiplyScalar(0.847).addScaledVector(tmpB, -0.532).normalize();
      nFrontCrest.copy(tmpN);
      nFrontRight.copy(tmpN).multiplyScalar(0.847).addScaledVector(tmpB, 0.532).normalize();

      // Back strip normals point inward (-0.85 N_out ± 0.53 B on edges, -1.0 N_out on crest)
      nBackRight.copy(tmpN).multiplyScalar(-0.847).addScaledVector(tmpB, 0.532).normalize();
      nBackCrest.copy(tmpN).negate();
      nBackLeft.copy(tmpN).multiplyScalar(-0.847).addScaledVector(tmpB, -0.532).normalize();

      positions.push(
        // Front strip (0, 1, 2)
        vLeft.x, vLeft.y, vLeft.z,
        vOuter.x, vOuter.y, vOuter.z,
        vRight.x, vRight.y, vRight.z,
        // Back strip (3, 4, 5)
        vRight.x, vRight.y, vRight.z,
        vInner.x, vInner.y, vInner.z,
        vLeft.x, vLeft.y, vLeft.z
      );

      normals.push(
        nFrontLeft.x, nFrontLeft.y, nFrontLeft.z,
        nFrontCrest.x, nFrontCrest.y, nFrontCrest.z,
        nFrontRight.x, nFrontRight.y, nFrontRight.z,
        nBackRight.x, nBackRight.y, nBackRight.z,
        nBackCrest.x, nBackCrest.y, nBackCrest.z,
        nBackLeft.x, nBackLeft.y, nBackLeft.z
      );

      const vCoord = 0.008 + u * 0.984;
      uvs.push(
        uFL, vCoord,
        uFC, vCoord,
        uFR, vCoord,
        uBR, vCoord,
        uBC, vCoord,
        uBL, vCoord
      );

      if (k < STEPS) {
        const r0 = baseVertexOffset + k * 6;
        const r1 = baseVertexOffset + (k + 1) * 6;

        // Front-Left ribbon quad (0 -> 1), CCW outward (+N_out)
        indices.push(r1 + 0, r0 + 1, r0 + 0);
        indices.push(r1 + 0, r1 + 1, r0 + 1);
        // Front-Right ribbon quad (1 -> 2), CCW outward (+N_out)
        indices.push(r1 + 1, r0 + 2, r0 + 1);
        indices.push(r1 + 1, r1 + 2, r0 + 2);

        // Back-Right ribbon quad (3 -> 4), CCW inward (-N_out)
        indices.push(r1 + 3, r0 + 4, r0 + 3);
        indices.push(r1 + 3, r1 + 4, r0 + 4);
        // Back-Left ribbon quad (4 -> 5), CCW inward (-N_out)
        indices.push(r1 + 4, r0 + 5, r0 + 4);
        indices.push(r1 + 4, r1 + 5, r0 + 5);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  // IMPORTANT: Do NOT call geom.computeVertexNormals()!
  // Our explicit VRoid diamond-ribbon normals preserve the crisp central anime highlight ridge
  // and razor-sharp silhouette edges without blobby cylinder smoothing.
  geom.computeBoundingSphere();

  _geometryCache.set(itemId, geom);
  return geom;
}

export function getItemHairCategory(itemId: string): HairCategoryId {
  if (itemId === 'Base1' || itemId.startsWith('Base')) return 'base';
  if (itemId.startsWith('Front')) return 'front';
  if (itemId.startsWith('Back')) return 'back';
  if (itemId.startsWith('Side')) return 'side';
  if (itemId.startsWith('Extra')) return 'extra';
  if (itemId.startsWith('Ex_') || itemId.startsWith('Ex')) return 'ex';
  return 'back';
}

export interface HairCategoryPhysicsConfig {
  omega: number;
  zeta: number;
  minDisp: [number, number, number];
  maxDisp: [number, number, number];
  inertiaScale: number;
  rotInertiaScale: number;
  flexPow: number;
}

export const HAIR_PHYSICS_CONFIGS: Record<HairCategoryId, HairCategoryPhysicsConfig> = {
  base: {
    omega: 30.0,
    zeta: 1.0,
    minDisp: [0, 0, 0],
    maxDisp: [0, 0, 0],
    inertiaScale: 0.0,
    rotInertiaScale: 0.0,
    flexPow: 1.0,
  },
  front: {
    omega: 18.0,
    zeta: 0.72,
    // Negative Z is forward (away from forehead); positive Z is backward (into forehead)
    minDisp: [-0.020, -0.012, -0.025],
    maxDisp: [0.020, 0.012, 0.002],
    inertiaScale: 0.0025,
    rotInertiaScale: 0.008,
    flexPow: 2.1, // Roots firmly grounded, mid-to-tips flutter visibly
  },
  back: {
    omega: 12.0,
    zeta: 0.62,
    // Negative Z is forward (into skull); positive Z is backward (flowing back)
    minDisp: [-0.050, -0.035, -0.015],
    maxDisp: [0.050, 0.045, 0.070],
    inertiaScale: 0.0045,
    rotInertiaScale: 0.016,
    flexPow: 1.5,
  },
  side: {
    omega: 14.0,
    zeta: 0.65,
    minDisp: [-0.040, -0.025, -0.020],
    maxDisp: [0.040, 0.030, 0.045],
    inertiaScale: 0.0035,
    rotInertiaScale: 0.012,
    flexPow: 1.6,
  },
  ex: {
    // Extensions: twin-tails, chignons, pony-tails, pigtails!
    // Highly dynamic, supple, bouncy anime motion with strict body clearance
    omega: 10.5,
    zeta: 0.54,
    minDisp: [-0.065, -0.045, -0.025],
    maxDisp: [0.065, 0.055, 0.085],
    inertiaScale: 0.0055,
    rotInertiaScale: 0.020,
    flexPow: 1.4, // lower power = full strand length participates generously
  },
  extra: {
    // Extra: hair ribbons, ahoge, decorative braids, clips
    omega: 13.0,
    zeta: 0.58,
    minDisp: [-0.045, -0.030, -0.020],
    maxDisp: [0.045, 0.035, 0.055],
    inertiaScale: 0.0040,
    rotInertiaScale: 0.014,
    flexPow: 1.5,
  },
};

export interface HairPhysicsSpring {
  category: HairCategoryId;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  target: THREE.Vector3;
  uniform: { value: THREE.Vector3 };
  flexPowUniform: { value: number };
}

export interface HairPhysicsRuntime {
  initialized: boolean;
  lastHeadWorldPos: THREE.Vector3;
  lastHeadWorldQuat: THREE.Quaternion;
  lastHeadLinearVel: THREE.Vector3;
  time: number;
  springs: Record<HairCategoryId, HairPhysicsSpring>;
}

export function initOrGetHairPhysicsRuntime(hairRoot: THREE.Group): HairPhysicsRuntime {
  if (hairRoot.userData.hairPhysics) {
    return hairRoot.userData.hairPhysics as HairPhysicsRuntime;
  }
  const categories: HairCategoryId[] = ['base', 'front', 'back', 'side', 'ex', 'extra'];
  const springs = {} as Record<HairCategoryId, HairPhysicsSpring>;
  for (const cat of categories) {
    const cfg = HAIR_PHYSICS_CONFIGS[cat];
    springs[cat] = {
      category: cat,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      target: new THREE.Vector3(),
      uniform: { value: new THREE.Vector3() },
      flexPowUniform: { value: cfg.flexPow },
    };
  }
  const runtime: HairPhysicsRuntime = {
    initialized: false,
    lastHeadWorldPos: new THREE.Vector3(),
    lastHeadWorldQuat: new THREE.Quaternion(),
    lastHeadLinearVel: new THREE.Vector3(),
    time: 0,
    springs,
  };
  hairRoot.userData.hairPhysics = runtime;
  return runtime;
}

const _tmpHeadWorldPos = new THREE.Vector3();
const _tmpHeadWorldQuat = new THREE.Quaternion();
const _tmpHeadWorldQuatInv = new THREE.Quaternion();
const _tmpLinearVel = new THREE.Vector3();
const _tmpLinearAccel = new THREE.Vector3();
const _tmpLocalAccel = new THREE.Vector3();
const _tmpRotDelta = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * Updates dynamic hair physics (inertia, spring-damper sway, wind drag, gait bounce, and idle breathing).
 * Modifies shader uniforms in-place so all active hair strands flow smoothly on the GPU.
 */
export function updateHairPhysics(
  vrm: VRM,
  dt: number,
  isMoving = false,
  gaitPhase = 0
): void {
  const headBone =
    vrm.humanoid?.getRawBoneNode('head') ||
    vrm.scene.getObjectByName('J_Bip_C_Head') ||
    vrm.scene;

  const hairRoot = headBone.getObjectByName('CustomPlayerHairRoot') as THREE.Group | undefined;
  if (!hairRoot) return;

  const runtime = hairRoot.userData.hairPhysics as HairPhysicsRuntime | undefined;
  if (!runtime) return;

  const safeDt = THREE.MathUtils.clamp(dt, 0.001, 0.05);
  runtime.time += safeDt;

  headBone.updateWorldMatrix(true, false);
  headBone.getWorldPosition(_tmpHeadWorldPos);
  headBone.getWorldQuaternion(_tmpHeadWorldQuat);

  if (!runtime.initialized) {
    runtime.initialized = true;
    runtime.lastHeadWorldPos.copy(_tmpHeadWorldPos);
    runtime.lastHeadWorldQuat.copy(_tmpHeadWorldQuat);
    runtime.lastHeadLinearVel.set(0, 0, 0);
    return;
  }

  // Teleport detection (> 0.5m displacement in one frame): snap without explosive velocity
  const frameDistSq = _tmpHeadWorldPos.distanceToSquared(runtime.lastHeadWorldPos);
  if (frameDistSq > 0.25) {
    runtime.lastHeadWorldPos.copy(_tmpHeadWorldPos);
    runtime.lastHeadWorldQuat.copy(_tmpHeadWorldQuat);
    runtime.lastHeadLinearVel.set(0, 0, 0);
    return;
  }

  // Linear velocity & acceleration in world space
  _tmpLinearVel.subVectors(_tmpHeadWorldPos, runtime.lastHeadWorldPos).divideScalar(safeDt);
  _tmpLinearAccel.subVectors(_tmpLinearVel, runtime.lastHeadLinearVel).divideScalar(safeDt);
  runtime.lastHeadWorldPos.copy(_tmpHeadWorldPos);
  runtime.lastHeadLinearVel.copy(_tmpLinearVel);

  // Transform world acceleration into head bone local space: local = Q_head^-1 * accel_world
  _tmpHeadWorldQuatInv.copy(_tmpHeadWorldQuat).invert();
  _tmpLocalAccel.copy(_tmpLinearAccel).applyQuaternion(_tmpHeadWorldQuatInv);
  _tmpLocalAccel.x = THREE.MathUtils.clamp(_tmpLocalAccel.x, -15.0, 15.0);
  _tmpLocalAccel.y = THREE.MathUtils.clamp(_tmpLocalAccel.y, -20.0, 20.0);
  _tmpLocalAccel.z = THREE.MathUtils.clamp(_tmpLocalAccel.z, -15.0, 15.0);

  // Angular delta between last frame and current frame in head local space
  _tmpRotDelta.copy(runtime.lastHeadWorldQuat).invert().multiply(_tmpHeadWorldQuat);
  runtime.lastHeadWorldQuat.copy(_tmpHeadWorldQuat);
  _tmpEuler.setFromQuaternion(_tmpRotDelta, 'YXZ');
  const yawRate = THREE.MathUtils.clamp(_tmpEuler.y / safeDt, -7.0, 7.0);
  const pitchRate = THREE.MathUtils.clamp(_tmpEuler.x / safeDt, -7.0, 7.0);

  // Organic idle breathing micro-sway (clearly visible, graceful alive motion)
  const t = runtime.time;
  const idleBreezeX = Math.sin(t * 1.5) * 0.007 + Math.sin(t * 2.8) * 0.0035;
  const idleBreezeZ = Math.cos(t * 1.2) * 0.006 + Math.sin(t * 2.3) * 0.0025;
  const idleBreezeY = Math.sin(t * 1.7) * 0.0035;

  // Gait locomotion dynamics (step bounce, lateral sway and trailing wind drag)
  let walkBounceY = 0;
  let walkSwayX = 0;
  let walkDragZ = 0;
  if (isMoving) {
    walkBounceY = -Math.abs(Math.sin(gaitPhase)) * 0.015;
    walkSwayX = Math.sin(gaitPhase * 0.5) * 0.010;
    walkDragZ = 0.025 + Math.sin(gaitPhase) * 0.010;
  }

  // Update spring for each category (accessories 'extra' and skull cap 'base' have 0 physics)
  const categories: HairCategoryId[] = ['front', 'back', 'side', 'ex'];
  for (const cat of categories) {
    const spring = runtime.springs[cat];
    const cfg = HAIR_PHYSICS_CONFIGS[cat];

    let targetX = -_tmpLocalAccel.x * cfg.inertiaScale - yawRate * cfg.rotInertiaScale;
    let targetY = -_tmpLocalAccel.y * cfg.inertiaScale - pitchRate * cfg.rotInertiaScale * 0.5;
    let targetZ = -_tmpLocalAccel.z * cfg.inertiaScale + pitchRate * cfg.rotInertiaScale * 0.8;

    targetX += idleBreezeX + (isMoving ? walkSwayX : 0);
    targetY += idleBreezeY + (isMoving ? walkBounceY : 0);
    targetZ += idleBreezeZ + (isMoving ? walkDragZ : 0);

    targetX = THREE.MathUtils.clamp(targetX, cfg.minDisp[0], cfg.maxDisp[0]);
    targetY = THREE.MathUtils.clamp(targetY, cfg.minDisp[1], cfg.maxDisp[1]);
    targetZ = THREE.MathUtils.clamp(targetZ, cfg.minDisp[2], cfg.maxDisp[2]);

    spring.target.set(targetX, targetY, targetZ);

    const omega = cfg.omega;
    const zeta = cfg.zeta;

    // Sub-stepping for rock-solid stability and smoothness at any framerate
    const subSteps = safeDt > 0.025 ? 2 : 1;
    const subDt = safeDt / subSteps;
    for (let s = 0; s < subSteps; s++) {
      const fSpringX = -omega * omega * (spring.pos.x - targetX);
      const fDampX = -2.0 * zeta * omega * spring.vel.x;
      spring.vel.x += (fSpringX + fDampX) * subDt;
      spring.pos.x += spring.vel.x * subDt;
      spring.pos.x = THREE.MathUtils.clamp(spring.pos.x, cfg.minDisp[0], cfg.maxDisp[0]);

      const fSpringY = -omega * omega * (spring.pos.y - targetY);
      const fDampY = -2.0 * zeta * omega * spring.vel.y;
      spring.vel.y += (fSpringY + fDampY) * subDt;
      spring.pos.y += spring.vel.y * subDt;
      spring.pos.y = THREE.MathUtils.clamp(spring.pos.y, cfg.minDisp[1], cfg.maxDisp[1]);

      const fSpringZ = -omega * omega * (spring.pos.z - targetZ);
      const fDampZ = -2.0 * zeta * omega * spring.vel.z;
      spring.vel.z += (fSpringZ + fDampZ) * subDt;
      spring.pos.z += spring.vel.z * subDt;
      spring.pos.z = THREE.MathUtils.clamp(spring.pos.z, cfg.minDisp[2], cfg.maxDisp[2]);
    }

    // Feed to shader uniform
    spring.uniform.value.copy(spring.pos);
    spring.flexPowUniform.value = cfg.flexPow;
  }
}

/**
 * Applies a PlayerHairSelection (or isolated single-item demo preview) onto a target VRM's J_Bip_C_Head bone.
 */
export function applyHairSelectionToVrm(
  vrm: VRM,
  selection: PlayerHairSelection,
  catalog: HairCatalogData,
  baseScalpData: BaseScalpMeshData,
  demoOverride?: { category: HairCategoryId; itemId: string | null; isolated?: boolean }
): THREE.Group {
  const headBone =
    vrm.humanoid?.getRawBoneNode('head') ||
    vrm.scene.getObjectByName('J_Bip_C_Head') ||
    vrm.scene;

  let hairRoot = headBone.getObjectByName('CustomPlayerHairRoot') as THREE.Group | undefined;
  if (!hairRoot) {
    hairRoot = new THREE.Group();
    hairRoot.name = 'CustomPlayerHairRoot';
    headBone.add(hairRoot);
  }

  // Slight anatomical head-fit offset so VRoid custom items sit snugly on FemPlayer's forehead & crown
  hairRoot.position.set(0, -0.004, 0.003);

  // Clear previous children
  while (hairRoot.children.length > 0) {
    const child = hairRoot.children[0] as THREE.Mesh;
    hairRoot.remove(child);
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }

  const effective: PlayerHairSelection = { ...selection };
  if (demoOverride) {
    if (demoOverride.isolated) {
      // In isolated demo mode, keep Base1 scalp cap so the skull isn't bare, plus the demoed item
      effective.base = demoOverride.category === 'base' ? demoOverride.itemId : 'Base1';
      effective.front = demoOverride.category === 'front' ? demoOverride.itemId : null;
      effective.back = demoOverride.category === 'back' ? demoOverride.itemId : null;
      effective.side = demoOverride.category === 'side' ? demoOverride.itemId : null;
      effective.ex = demoOverride.category === 'ex' ? demoOverride.itemId : null;
      effective.extra = demoOverride.category === 'extra' ? demoOverride.itemId : null;
    } else {
      effective[demoOverride.category] = demoOverride.itemId;
    }
  }

  const activeIds: string[] = [];
  if (effective.base) activeIds.push(effective.base);
  if (effective.back) activeIds.push(effective.back);
  if (effective.front) activeIds.push(effective.front);
  if (effective.side) activeIds.push(effective.side);
  if (effective.ex) activeIds.push(effective.ex);
  if (effective.extra) activeIds.push(effective.extra);

  // Ensure VRoid face & eyebrows render on the face skin beneath bangs rather than in front of hair
  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      if (/face/i.test(mesh.name) || /head/i.test(mesh.name)) {
        mesh.renderOrder = 0;
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (/FaceBrow|FaceEyeline/i.test(m?.name ?? '')) {
          mesh.renderOrder = 0;
          m.depthTest = true;
          m.depthWrite = false;
        }
      }
    }
  });

  const tintColor = new THREE.Color(effective.colorHex || '#ffffff');
  // Calibrate luminance against the ~0.58 base grayscale texture so white is radiant white
  // and vibrant anime swatches pop accurately under both studio and in-game sunlight:
  const hairColor = tintColor.clone().multiplyScalar(1.42);
  const gradientMap = getAnimeHairGradientMap();
  const physicsRuntime = initOrGetHairPhysicsRuntime(hairRoot);

  for (const itemId of activeIds) {
    const geom = buildHairItemGeometry(itemId, catalog, baseScalpData);
    if (!geom) continue;

    const isBase = itemId === 'Base1';
    const itemMeta = catalog.items[itemId];
    const texUrl =
      isBase
        ? '/assets/player/textures/fcbc9edd.png'
        : itemMeta?.mainTexture || '/assets/player/textures/da0a84c2.png';

    const map = getHairTexture(texUrl);
    const mat = new THREE.MeshToonMaterial({
      map,
      color: isBase ? tintColor : hairColor,
      gradientMap,
      side: THREE.FrontSide,
      alphaTest: isBase ? 0.5 : 0.0,
      polygonOffset: true,
      polygonOffsetFactor: isBase ? -1.0 : -3.0,
      polygonOffsetUnits: isBase ? -2.0 : -6.0,
    });

    const cat = getItemHairCategory(itemId);
    // Accessories ('extra') and base skull cap ('base') have no physics sway: they remain 100% static
    if (!isBase && cat !== 'extra') {
      const catSpring = physicsRuntime.springs[cat];
      mat.customProgramCacheKey = () => `hair_physics_${cat}`;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uHairSway = catSpring.uniform;
        shader.uniforms.uHairFlexPow = catSpring.flexPowUniform;
        shader.vertexShader = `
uniform vec3 uHairSway;
uniform float uHairFlexPow;
` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
float strandU = clamp((uv.y - 0.008) / 0.984, 0.0, 1.0);
float flexWeight = pow(strandU, uHairFlexPow);
vec3 hairDisp = uHairSway * flexWeight;

// Anatomical skull & neck outward normal for zero-penetration collision:
vec3 headC = vec3(0.0, 0.075, 0.005);
float yBlend = clamp((position.y - 0.01) / 0.06, 0.0, 1.0);

vec3 headR = (position - headC) / vec3(0.082, 0.092, 0.088);
float hLen = length(headR);
vec3 hNorm = hLen > 0.001 ? (headR / hLen) : vec3(0.0, 1.0, 0.0);

vec2 neckR = vec2(position.x, position.z - (-0.005));
float nLen = length(neckR);
vec3 nNorm = nLen > 0.001 ? vec3(neckR.x / nLen, 0.0, neckR.y / nLen) : vec3(0.0, 0.0, 1.0);

vec3 bodyNorm = normalize(mix(nNorm, hNorm, yBlend));

// If displacement pushes inward towards the skull or neck, cancel it completely
float inwardDot = dot(hairDisp, bodyNorm);
if (inwardDot < 0.0) {
  vec3 safeDisp = hairDisp - bodyNorm * inwardDot;
  float tangMag = length(safeDisp);
  // Add graceful centrifugal contour lift so hair flows smoothly around the head instead of pinching
  hairDisp = safeDisp + bodyNorm * (tangMag * 0.15);
}

vec3 candPos = position + hairDisp;

// Torso & chest collision plane limits below the neck
if (candPos.y < -0.03) {
  if (position.z > 0.02) {
    candPos.z = max(candPos.z, 0.040);
  } else if (position.z < -0.02) {
    candPos.z = min(candPos.z, -0.065);
  }
}

transformed = candPos;`
        );
      };
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = `HairPart_${itemId}`;
    mesh.renderOrder = isBase ? 5 : 50;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    hairRoot.add(mesh);
  }

  return hairRoot;
}

/**
 * Loads a standalone FemPlayer VRM instance ready for either the 3D Customization Studio
 * or the in-world Player avatar, with arms lowered naturally along the body.
 */
export async function loadPlayerVrmInstance(
  gender: PlayerGender = 'female'
): Promise<{
  vrm: VRM;
  container: THREE.Group;
}> {
  const buffer = await loadPlayerVrmBuffer(gender);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await loader.parseAsync(buffer.slice(0), '');
  const vrm = gltf.userData.vrm as VRM;

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);

  vrm.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;
    }
  });

  const container = new THREE.Group();
  container.name = gender === 'male' ? 'MalePlayerContainer' : 'FemPlayerContainer';
  container.add(vrm.scene);

  // Relax arms from T-pose into a natural anime standing pose.
  // Because FemPlayer.vrm is a VRM 0.0 model, normalized Z-rotation axes are inverted
  // compared to VRM 1.0 (+1.24 lowers leftUpperArm, -1.24 lowers rightUpperArm).
  // We probe world-Y positions dynamically (just like FlorieVRM.ts) so the arms are
  // guaranteed to rest down along the body and never raised up in the air!
  const leftShoulder = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftShoulder);
  const rightShoulder = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightShoulder);
  const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
  const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
  const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
  const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);
  const leftHand = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftHand);
  const rightHand = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightHand);

  if (leftLowerArm) leftLowerArm.rotation.order = 'YXZ';
  if (rightLowerArm) rightLowerArm.rotation.order = 'YXZ';

  const worldPosA = new THREE.Vector3();
  const worldPosB = new THREE.Vector3();

  let leftArmDownZ = 1.24;
  let rightArmDownZ = -1.24;

  if (leftUpperArm && (leftHand || leftLowerArm)) {
    const probe = (leftHand || leftLowerArm)!;
    leftUpperArm.rotation.z = -1.24;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(worldPosA);

    leftUpperArm.rotation.z = 1.24;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(worldPosB);

    leftArmDownZ = worldPosA.y < worldPosB.y ? -1.24 : 1.24;
    leftUpperArm.rotation.z = leftArmDownZ;
  }

  if (rightUpperArm && (rightHand || rightLowerArm)) {
    const probe = (rightHand || rightLowerArm)!;
    rightUpperArm.rotation.z = 1.24;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(worldPosA);

    rightUpperArm.rotation.z = -1.24;
    vrm.update(0);
    container.updateMatrixWorld(true);
    probe.getWorldPosition(worldPosB);

    rightArmDownZ = worldPosA.y < worldPosB.y ? 1.24 : -1.24;
    rightUpperArm.rotation.z = rightArmDownZ;
  }

  // Slight shoulder relaxation + gentle natural elbow bend & finger curl
  const armForwardXSign = -Math.sign(rightArmDownZ);
  const leftCurlSign = Math.sign(leftArmDownZ);
  const rightCurlSign = Math.sign(rightArmDownZ);

  if (leftShoulder) leftShoulder.rotation.z = leftArmDownZ * 0.05;
  if (rightShoulder) rightShoulder.rotation.z = rightArmDownZ * 0.05;

  if (leftUpperArm) {
    leftUpperArm.rotation.x = 0.06 * armForwardXSign;
  }
  if (rightUpperArm) {
    rightUpperArm.rotation.x = 0.06 * armForwardXSign;
  }

  if (leftLowerArm) {
    leftLowerArm.rotation.y = -0.14 * armForwardXSign;
    leftLowerArm.rotation.z = 0.06 * leftCurlSign;
  }
  if (rightLowerArm) {
    rightLowerArm.rotation.y = 0.14 * armForwardXSign;
    rightLowerArm.rotation.z = 0.06 * rightCurlSign;
  }

  if (leftHand) {
    leftHand.rotation.z = 0.12 * leftCurlSign;
  }
  if (rightHand) {
    rightHand.rotation.z = 0.12 * rightCurlSign;
  }

  // Relax fingers slightly so hands aren't stiffly splayed
  const fingerPairs: Array<[VRMHumanBoneName, number, number]> = [
    [VRMHumanBoneName.LeftIndexProximal, 0.18, leftCurlSign],
    [VRMHumanBoneName.LeftIndexIntermediate, 0.22, leftCurlSign],
    [VRMHumanBoneName.LeftMiddleProximal, 0.22, leftCurlSign],
    [VRMHumanBoneName.LeftMiddleIntermediate, 0.25, leftCurlSign],
    [VRMHumanBoneName.LeftRingProximal, 0.25, leftCurlSign],
    [VRMHumanBoneName.LeftRingIntermediate, 0.28, leftCurlSign],
    [VRMHumanBoneName.LeftLittleProximal, 0.28, leftCurlSign],
    [VRMHumanBoneName.LeftLittleIntermediate, 0.3, leftCurlSign],
    [VRMHumanBoneName.RightIndexProximal, 0.18, rightCurlSign],
    [VRMHumanBoneName.RightIndexIntermediate, 0.22, rightCurlSign],
    [VRMHumanBoneName.RightMiddleProximal, 0.22, rightCurlSign],
    [VRMHumanBoneName.RightMiddleIntermediate, 0.25, rightCurlSign],
    [VRMHumanBoneName.RightRingProximal, 0.25, rightCurlSign],
    [VRMHumanBoneName.RightRingIntermediate, 0.28, rightCurlSign],
    [VRMHumanBoneName.RightLittleProximal, 0.28, rightCurlSign],
    [VRMHumanBoneName.RightLittleIntermediate, 0.3, rightCurlSign],
  ];
  for (const [boneName, angle, sign] of fingerPairs) {
    const fBone = vrm.humanoid?.getNormalizedBoneNode(boneName);
    if (fBone) fBone.rotation.z = angle * sign;
  }

  vrm.update(0);
  container.updateMatrixWorld(true);

  return { vrm, container };
}

export function loadFemPlayerVrmInstance(): Promise<{
  vrm: VRM;
  container: THREE.Group;
}> {
  return loadPlayerVrmInstance('female');
}
