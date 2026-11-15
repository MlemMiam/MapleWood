import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import type { PlayerGender } from './PlayerHairSystem';

export type ClothesCategoryId =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'socks'
  | 'shoes'
  | 'arm'
  | 'neck'
  | 'glasses';

export interface PlayerClothesSelection {
  items: Record<ClothesCategoryId, string | null>;
  colors: Record<ClothesCategoryId, string>;
}

export interface PlayerDisplayOptions {
  showHair: boolean;
  visibleCategories: Record<ClothesCategoryId, boolean>;
  isolateActiveCategory: boolean;
  celShadingBoost: boolean;
  turntableAutoSpin: boolean;
  posePreset: 'natural' | 'showcase' | 'runway';
}

export interface CatalogClothesLayer {
  partgroup: string;
  mainTextureUrl: string | null;
  blendShapes: Record<string, number>;
}

export interface CatalogClothesItem {
  id: string;
  rawId: string;
  gender: PlayerGender;
  category: ClothesCategoryId;
  displayName: string;
  thumbnailUrl: string;
  skinAlphaMaskUrl?: string;
  layers: CatalogClothesLayer[];
}

export interface ClothesCatalogData {
  version: number;
  female: CatalogClothesItem[];
  male: CatalogClothesItem[];
}

export interface HeelFootMorphData {
  uvs: number[];
  signs: number[];
  deltas: number[];
}

export interface ClothesTemplateMeshData {
  id?: string;
  vertexCount?: number;
  jointNames: string[];
  jointBindPos: Array<[number, number, number]>;
  positions: number[];
  normals: number[];
  uvs: number[];
  joints: number[];
  weights: number[];
  indices: number[];
  blendShapes?: Record<string, number[]>;
}

export type ClothesTemplatesBundle = Record<
  string,
  ClothesTemplateMeshData | HeelFootMorphData
>;

export interface ClothesCategoryMeta {
  id: ClothesCategoryId;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: string;
  cameraPreset: 'full' | 'head' | 'torso' | 'legs' | 'feet';
  defaultCameraYaw: number;
  defaultCameraPitch: number;
  femaleOnly?: boolean;
}

export const CLOTHES_CATEGORIES: ClothesCategoryMeta[] = [
  {
    id: 'top',
    label: 'Hauts & Vestes',
    shortLabel: 'Hauts',
    subtitle: 'Chemises, pulls, sweats & vestes superposables',
    icon: '👕',
    cameraPreset: 'torso',
    defaultCameraYaw: 0.18,
    defaultCameraPitch: 0.04,
  },
  {
    id: 'bottom',
    label: 'Bas & Jupes',
    shortLabel: 'Bas',
    subtitle: 'Pantalons, jupes plissées, shorts & jeans',
    icon: '👖',
    cameraPreset: 'legs',
    defaultCameraYaw: -0.22,
    defaultCameraPitch: 0.05,
  },
  {
    id: 'dress',
    label: 'Robes & Tenues',
    shortLabel: 'Robes',
    subtitle: 'Robes complètes, salopettes & ensembles',
    icon: '👗',
    cameraPreset: 'full',
    defaultCameraYaw: 0.24,
    defaultCameraPitch: 0.04,
    femaleOnly: true,
  },
  {
    id: 'socks',
    label: 'Chaussettes & Collants',
    shortLabel: 'Chaussettes',
    subtitle: 'Chaussettes hautes, mi-bas & collants',
    icon: '🧦',
    cameraPreset: 'legs',
    defaultCameraYaw: 0.28,
    defaultCameraPitch: 0.06,
  },
  {
    id: 'shoes',
    label: 'Chaussures',
    shortLabel: 'Chaussures',
    subtitle: 'Mocassins, baskets, bottines & escarpins',
    icon: '👟',
    cameraPreset: 'feet',
    defaultCameraYaw: -0.35,
    defaultCameraPitch: 0.12,
  },
  {
    id: 'arm',
    label: 'Bras & Gants',
    shortLabel: 'Bras',
    subtitle: 'Mitaines, manchettes, gants & bracelets',
    icon: '🧤',
    cameraPreset: 'torso',
    defaultCameraYaw: 0.42,
    defaultCameraPitch: 0.05,
  },
  {
    id: 'neck',
    label: 'Col & Cravates',
    shortLabel: 'Col',
    subtitle: 'Rubans, cravates, nœuds & accessoires de col',
    icon: '🎀',
    cameraPreset: 'torso',
    defaultCameraYaw: 0.08,
    defaultCameraPitch: 0.04,
  },
  {
    id: 'glasses',
    label: 'Lunettes',
    shortLabel: 'Lunettes',
    subtitle: 'Montures fines, lunettes de lecture & style',
    icon: '👓',
    cameraPreset: 'head',
    defaultCameraYaw: 0.22,
    defaultCameraPitch: 0.04,
  },
];

export const CLOTHES_COLOR_SWATCHES: Array<{ name: string; hex: string }> = [
  { name: 'Original (Blanc Pur)', hex: '#ffffff' },
  { name: 'Rose Pétale', hex: '#ffd6e0' },
  { name: 'Corail Doux', hex: '#ffadad' },
  { name: 'Pêche Dorée', hex: '#ffd6a5' },
  { name: 'Crème Vanille', hex: '#fdffb6' },
  { name: 'Menthe Pastel', hex: '#caffbf' },
  { name: 'Ciel Azur', hex: '#a0c4ff' },
  { name: 'Lavande Douce', hex: '#bdb2ff' },
  { name: 'Lilas Brillant', hex: '#ffc6ff' },
  { name: 'Bleu Marine Lycée', hex: '#3d5a80' },
  { name: 'Bordeaux Académie', hex: '#9b2226' },
  { name: 'Vert Forêt', hex: '#40916c' },
  { name: 'Caramel Chaud', hex: '#bc6c25' },
  { name: 'Gris Ardoise', hex: '#6c757d' },
  { name: 'Anthracite Nuit', hex: '#2b2d42' },
];

export const DEFAULT_CLOTHES_COLORS: Record<ClothesCategoryId, string> = {
  top: '#ffffff',
  bottom: '#ffffff',
  dress: '#ffffff',
  socks: '#ffffff',
  shoes: '#ffffff',
  arm: '#ffffff',
  neck: '#ffffff',
  glasses: '#ffffff',
};

export const DEFAULT_FEMALE_CLOTHES_SELECTION: PlayerClothesSelection = {
  items: {
    top: 'female_Top3',
    bottom: 'female_Bottom4',
    dress: null,
    socks: 'female_Socks1',
    shoes: 'female_Shoes1',
    arm: null,
    neck: 'female_Neck1',
    glasses: null,
  },
  colors: { ...DEFAULT_CLOTHES_COLORS },
};

export const DEFAULT_MALE_CLOTHES_SELECTION: PlayerClothesSelection = {
  items: {
    top: 'male_Top2',
    bottom: 'male_Bottom1',
    dress: null,
    socks: 'male_Socks1',
    shoes: 'male_Shoes1',
    arm: null,
    neck: 'male_Neck1',
    glasses: null,
  },
  colors: { ...DEFAULT_CLOTHES_COLORS },
};

export function getDefaultClothesSelection(gender: PlayerGender): PlayerClothesSelection {
  const base =
    gender === 'male' ? DEFAULT_MALE_CLOTHES_SELECTION : DEFAULT_FEMALE_CLOTHES_SELECTION;
  return {
    items: { ...base.items },
    colors: { ...base.colors },
  };
}

export const DEFAULT_PLAYER_DISPLAY_OPTIONS: PlayerDisplayOptions = {
  showHair: true,
  visibleCategories: {
    top: true,
    bottom: true,
    dress: true,
    socks: true,
    shoes: true,
    arm: true,
    neck: true,
    glasses: true,
  },
  isolateActiveCategory: false,
  celShadingBoost: true,
  turntableAutoSpin: false,
  posePreset: 'natural',
};

export interface OutfitPreset {
  id: string;
  name: string;
  badge: string;
  gender: PlayerGender;
  selection: PlayerClothesSelection;
}

export const OUTFIT_PRESETS: OutfitPreset[] = [
  {
    id: 'fem_campus',
    name: 'Uniforme MapleWood',
    badge: 'Classique',
    gender: 'female',
    selection: {
      items: {
        top: 'female_Top8',
        bottom: 'female_Bottom4',
        dress: null,
        socks: 'female_Socks1',
        shoes: 'female_Shoes3',
        arm: null,
        neck: 'female_Neck1',
        glasses: null,
      },
      colors: { ...DEFAULT_CLOTHES_COLORS },
    },
  },
  {
    id: 'fem_street',
    name: 'Streetwear Automne',
    badge: 'Casual',
    gender: 'female',
    selection: {
      items: {
        top: 'female_Top3',
        bottom: 'female_Bottom1',
        dress: null,
        socks: 'female_Socks3',
        shoes: 'female_Shoes5',
        arm: 'female_Arm2',
        neck: null,
        glasses: 'female_Glasses1',
      },
      colors: {
        ...DEFAULT_CLOTHES_COLORS,
        top: '#ffd6e0',
      },
    },
  },
  {
    id: 'fem_gala',
    name: 'Robe de Soirée Pastel',
    badge: 'Élégant',
    gender: 'female',
    selection: {
      items: {
        top: null,
        bottom: null,
        dress: 'female_Dress5',
        socks: 'female_Socks5',
        shoes: 'female_Shoes1',
        arm: 'female_Arm4',
        neck: 'female_Neck3',
        glasses: null,
      },
      colors: {
        ...DEFAULT_CLOTHES_COLORS,
        dress: '#a0c4ff',
      },
    },
  },
  {
    id: 'male_campus',
    name: 'Académie MapleWood',
    badge: 'Classique',
    gender: 'male',
    selection: {
      items: {
        top: 'male_Top5',
        bottom: 'male_Bottom1',
        dress: null,
        socks: 'male_Socks1',
        shoes: 'male_Shoes1',
        arm: null,
        neck: 'male_Neck2',
        glasses: null,
      },
      colors: { ...DEFAULT_CLOTHES_COLORS },
    },
  },
  {
    id: 'male_hoodie',
    name: 'Hoodie Campus Relax',
    badge: 'Casual',
    gender: 'male',
    selection: {
      items: {
        top: 'male_Top2',
        bottom: 'male_Bottom3',
        dress: null,
        socks: 'male_Socks2',
        shoes: 'male_Shoes3',
        arm: 'male_Arm2',
        neck: null,
        glasses: 'male_Glasses1',
      },
      colors: {
        ...DEFAULT_CLOTHES_COLORS,
        top: '#a0c4ff',
      },
    },
  },
  {
    id: 'male_sport',
    name: 'Look Urbain Nocturne',
    badge: 'Urbain',
    gender: 'male',
    selection: {
      items: {
        top: 'male_Top3',
        bottom: 'male_Bottom2',
        dress: null,
        socks: 'male_Socks4',
        shoes: 'male_Shoes4',
        arm: 'male_Arm6',
        neck: 'male_Neck4',
        glasses: 'male_Glasses2',
      },
      colors: {
        ...DEFAULT_CLOTHES_COLORS,
        top: '#bdb2ff',
      },
    },
  },
];

let _clothesCatalogPromise: Promise<ClothesCatalogData> | null = null;
let _clothesTemplatesPromise: Promise<ClothesTemplatesBundle> | null = null;
let _clothesGradientTex: THREE.DataTexture | null = null;
const _clothesTextureCache = new Map<string, THREE.Texture>();

export function loadClothesCatalog(): Promise<ClothesCatalogData> {
  if (!_clothesCatalogPromise) {
    _clothesCatalogPromise = fetch('/assets/player/clothes_catalog.json').then(async (res) => {
      if (!res.ok) throw new Error('Impossible de charger clothes_catalog.json');
      return (await res.json()) as ClothesCatalogData;
    });
  }
  return _clothesCatalogPromise;
}

export function loadClothesTemplates(): Promise<ClothesTemplatesBundle> {
  if (!_clothesTemplatesPromise) {
    _clothesTemplatesPromise = fetch('/assets/player/clothes_templates.json').then(async (res) => {
      if (!res.ok) throw new Error('Impossible de charger clothes_templates.json');
      return (await res.json()) as ClothesTemplatesBundle;
    });
  }
  return _clothesTemplatesPromise;
}

function getClothesTexture(url: string): THREE.Texture {
  let tex = _clothesTextureCache.get(url);
  if (!tex) {
    const loader = new THREE.TextureLoader();
    tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.flipY = false;
    _clothesTextureCache.set(url, tex);
  }
  return tex;
}

function getAnimeClothesGradientMap(): THREE.DataTexture {
  if (!_clothesGradientTex) {
    const data = new Uint8Array([
      165, 160, 176, 255,
      208, 204, 216, 255,
      242, 240, 246, 255,
      255, 255, 255, 255,
    ]);
    const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    _clothesGradientTex = tex;
  }
  return _clothesGradientTex;
}

function findBodySkinnedMesh(vrm: VRM): THREE.SkinnedMesh | null {
  let found: THREE.SkinnedMesh | null = null;
  vrm.scene.traverse((obj) => {
    const sm = obj as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh && sm.name.includes('Body')) {
      found = sm;
    }
  });
  if (!found) {
    vrm.scene.traverse((obj) => {
      const sm = obj as THREE.SkinnedMesh;
      if (!found && sm.isSkinnedMesh && !sm.name.includes('Face') && !sm.name.includes('Hair')) {
        found = sm;
      }
    });
  }
  return found;
}

export const CATEGORY_RENDER_ORDER: Record<ClothesCategoryId, number> = {
  socks: 10,
  arm: 15,
  bottom: 20,
  top: 30,
  dress: 35,
  shoes: 40,
  neck: 50,
  glasses: 60,
};

export interface BuiltClothSurface {
  category: ClothesCategoryId;
  itemId: string;
  partgroup: string;
  posArr: Float32Array;
  normArr: Float32Array;
  vertCount: number;
}

const CATEGORY_CLEARANCE_METERS: Record<ClothesCategoryId, number> = {
  socks: 0.0035,
  arm: 0.0045,
  bottom: 0.0090,
  top: 0.0145,
  dress: 0.0195,
  shoes: 0.0110,
  neck: 0.0240,
  glasses: 0.0260,
};

type BodyAnatomicalRegion =
  | 'head'
  | 'torso'
  | 'arm_l'
  | 'arm_r'
  | 'hand_l'
  | 'hand_r'
  | 'leg_l'
  | 'leg_r'
  | 'foot_l'
  | 'foot_r';

function classifyBoneRegion(boneName: string | undefined): BodyAnatomicalRegion {
  if (!boneName) return 'torso';
  if (boneName.includes('Head') || boneName.includes('Face') || boneName.includes('Glasses')) {
    return 'head';
  }
  if (
    boneName.includes('_L_UpperArm') ||
    boneName.includes('_L_LowerArm') ||
    boneName.includes('_L_Shoulder')
  ) {
    return 'arm_l';
  }
  if (
    boneName.includes('_R_UpperArm') ||
    boneName.includes('_R_LowerArm') ||
    boneName.includes('_R_Shoulder')
  ) {
    return 'arm_r';
  }
  if (
    boneName.includes('_L_Hand') ||
    boneName.includes('_L_Index') ||
    boneName.includes('_L_Middle') ||
    boneName.includes('_L_Ring') ||
    boneName.includes('_L_Little') ||
    boneName.includes('_L_Thumb')
  ) {
    return 'hand_l';
  }
  if (
    boneName.includes('_R_Hand') ||
    boneName.includes('_R_Index') ||
    boneName.includes('_R_Middle') ||
    boneName.includes('_R_Ring') ||
    boneName.includes('_R_Little') ||
    boneName.includes('_R_Thumb')
  ) {
    return 'hand_r';
  }
  if (boneName.includes('_L_UpperLeg') || boneName.includes('_L_LowerLeg')) {
    return 'leg_l';
  }
  if (boneName.includes('_R_UpperLeg') || boneName.includes('_R_LowerLeg')) {
    return 'leg_r';
  }
  if (boneName.includes('_L_Foot') || boneName.includes('_L_ToeBase')) {
    return 'foot_l';
  }
  if (boneName.includes('_R_Foot') || boneName.includes('_R_ToeBase')) {
    return 'foot_r';
  }
  return 'torso';
}

interface CachedBodySurfaceData {
  vertCount: number;
  originalPositions: Float32Array;
  posArr: Float32Array;
  uvArr: Float32Array;
  weldedNormals: Float32Array;
  skinIndices: ArrayLike<number>;
  skinWeights: ArrayLike<number>;
  primaryBoneNames: string[];
  regions: BodyAnatomicalRegion[];
  dstBoneBindPos: Record<string, [number, number, number]>;
  boneNameMap: Map<string, number>;
  originalIndices: Uint32Array;
}

const _bodySurfaceCache = new WeakMap<THREE.SkinnedMesh, CachedBodySurfaceData>();

function getCachedBodySurfaceData(baseBodyMesh: THREE.SkinnedMesh): CachedBodySurfaceData {
  let cached = _bodySurfaceCache.get(baseBodyMesh);
  if (cached) return cached;

  const geom = baseBodyMesh.geometry;
  const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
  const uvAttr = geom.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const normAttr = geom.getAttribute('normal') as THREE.BufferAttribute;
  const skinIdxAttr = geom.getAttribute('skinIndex') as THREE.BufferAttribute;
  const skinWAttr = geom.getAttribute('skinWeight') as THREE.BufferAttribute;

  const originalPositions = Float32Array.from(posAttr.array as ArrayLike<number>);
  const posArr = Float32Array.from(originalPositions);
  const normArr = normAttr.array as ArrayLike<number>;
  const skinIndices = skinIdxAttr.array as ArrayLike<number>;
  const skinWeights = skinWAttr.array as ArrayLike<number>;
  const vertCount = posAttr.count;
  const uvArr = uvAttr
    ? Float32Array.from(uvAttr.array as ArrayLike<number>)
    : new Float32Array(vertCount * 2);

  // Compute welded outward normals so UV seams never split when inflated or used for clearance
  const weldedNormals = new Float32Array(vertCount * 3);
  const posGroups = new Map<string, number[]>();
  for (let i = 0; i < vertCount; i++) {
    const key = `${Math.round(posArr[i * 3] * 2500)}_${Math.round(posArr[i * 3 + 1] * 2500)}_${Math.round(posArr[i * 3 + 2] * 2500)}`;
    let list = posGroups.get(key);
    if (!list) {
      list = [];
      posGroups.set(key, list);
    }
    list.push(i);
  }
  for (const group of posGroups.values()) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (const vi of group) {
      sx += normArr[vi * 3];
      sy += normArr[vi * 3 + 1];
      sz += normArr[vi * 3 + 2];
    }
    const len = Math.hypot(sx, sy, sz) || 1;
    sx /= len;
    sy /= len;
    sz /= len;
    for (const vi of group) {
      weldedNormals[vi * 3] = sx;
      weldedNormals[vi * 3 + 1] = sy;
      weldedNormals[vi * 3 + 2] = sz;
    }
  }

  const skeleton = baseBodyMesh.skeleton;
  const boneNameMap = new Map<string, number>();
  const dstBoneBindPos: Record<string, [number, number, number]> = {};
  skeleton.bones.forEach((b, idx) => {
    boneNameMap.set(b.name, idx);
    const m = new THREE.Matrix4()
      .multiplyMatrices(skeleton.boneInverses[idx], baseBodyMesh.bindMatrix)
      .invert();
    const e = m.elements;
    dstBoneBindPos[b.name] = [e[12], e[13], e[14]];
  });

  const primaryBoneNames = new Array<string>(vertCount);
  const regions = new Array<BodyAnatomicalRegion>(vertCount);
  for (let i = 0; i < vertCount; i++) {
    let bestK = 0;
    let bestW = -1;
    for (let k = 0; k < 4; k++) {
      const w = skinWeights[i * 4 + k];
      if (w > bestW) {
        bestW = w;
        bestK = k;
      }
    }
    const bIdx = skinIndices[i * 4 + bestK];
    const bName = skeleton.bones[bIdx]?.name || 'J_Bip_C_Hips';
    primaryBoneNames[i] = bName;
    regions[i] = classifyBoneRegion(bName);
  }

  const indexAttr = geom.getIndex();
  const originalIndices = indexAttr
    ? new Uint32Array(indexAttr.array as ArrayLike<number>)
    : new Uint32Array(0);

  cached = {
    vertCount,
    originalPositions,
    posArr,
    uvArr,
    weldedNormals,
    skinIndices,
    skinWeights,
    primaryBoneNames,
    regions,
    dstBoneBindPos,
    boneNameMap,
    originalIndices,
  };
  _bodySurfaceCache.set(baseBodyMesh, cached);
  return cached;
}

type ShoeMaskMode = 'none' | 'heel' | 'ballet' | 'closed';

function getActiveShoeMaskMode(
  hasShoes: boolean,
  equippedPartGroups: { has(key: string): boolean }
): ShoeMaskMode {
  if (!hasShoes) return 'none';
  if (equippedPartGroups.has('N00_009_01_Shoes')) return 'heel';
  if (equippedPartGroups.has('N00_003_01_Shoes')) return 'ballet';
  return 'closed';
}

function isFootVertMaskedByShoes(
  reg: BodyAnatomicalRegion,
  _x: number,
  y: number,
  z: number,
  footXAbs: number,
  footY: number,
  shoeMode: ShoeMaskMode
): boolean {
  if (shoeMode === 'none') return false;
  if (reg !== 'foot_l' && reg !== 'foot_r') return false;
  const femScale = footY / 0.08567;
  if (shoeMode === 'heel') {
    // Keep the visible upper forefoot/instep inside the open pump vamp; only mask deep toe-tip,
    // sole underside below the leather insole, and the enclosed heel counter.
    const soleLineY = z < -0.015 * femScale ? -0.044 * femScale : (-0.044 + (z + 0.015 * femScale) * 0.72) * femScale;
    return z < -0.052 * femScale || y < soleLineY || z > 0.068 * femScale;
  }
  if (shoeMode === 'ballet') {
    // Ballet flat has a low-cut vamp (closed only past z < -0.068); keep the front top of foot intact.
    const isSideLower =
      Math.abs(Math.abs(_x) - footXAbs) > 0.025 * femScale && y < 0.022 * femScale;
    const isHeelCup = z > 0.062 * femScale && y < footY * 0.65;
    return y < 0.011 * femScale || z < -0.068 * femScale || isHeelCup || isSideLower;
  }
  return y < footY * 0.68 || z < -0.035 * femScale;
}

function applyBodyFootHeelMorph(
  baseBodyMesh: THREE.SkinnedMesh,
  templates: ClothesTemplatesBundle,
  shoeMode: ShoeMaskMode
): void {
  const surface = getCachedBodySurfaceData(baseBodyMesh);
  const workBodyPos = Float32Array.from(surface.originalPositions);
  const rawMorph = templates['__HeelFootMorph'];
  const heelMorph = rawMorph && 'deltas' in rawMorph ? rawMorph : null;
  const footY = surface.dstBoneBindPos['J_Bip_L_Foot']?.[1] || 0.08567;
  const footScale = footY / 0.09577;

  if (shoeMode === 'heel' && heelMorph) {
    const mCount = heelMorph.signs.length;
    const mUvs = heelMorph.uvs;
    const mSigns = heelMorph.signs;
    const mDeltas = heelMorph.deltas;

    for (let vi = 0; vi < surface.vertCount; vi++) {
      const oy = surface.originalPositions[vi * 3 + 1];
      if (oy >= 0.125) continue;
      const sign = surface.originalPositions[vi * 3] < 0 ? -1 : 1;
      const u = surface.uvArr[vi * 2];
      const v = surface.uvArr[vi * 2 + 1];

      let bestJ = -1;
      let bestD2 = 1e9;
      for (let j = 0; j < mCount; j++) {
        if (mSigns[j] !== sign) continue;
        const du = u - mUvs[j * 2];
        const dv = v - mUvs[j * 2 + 1];
        const d2 = du * du + dv * dv;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestJ = j;
        }
      }
      if (bestJ >= 0 && bestD2 < 1e-6) {
        workBodyPos[vi * 3] += mDeltas[bestJ * 3] * footScale;
        workBodyPos[vi * 3 + 1] += mDeltas[bestJ * 3 + 1] * footScale;
        workBodyPos[vi * 3 + 2] += mDeltas[bestJ * 3 + 2] * footScale;
      }
    }
  }

  // Pull shoe-enclosed foot vertices inward/downward so straddling seam triangles stay inside the shoe cavity
  if (shoeMode !== 'none') {
    const femScale = footY / 0.08567;
    const leftFootX = surface.dstBoneBindPos['J_Bip_L_Foot']?.[0] ?? -0.0765;
    const rightFootX = surface.dstBoneBindPos['J_Bip_R_Foot']?.[0] ?? 0.0765;
    const footXAbs = Math.abs(leftFootX);
    const xPull = (shoeMode === 'closed' ? 0.006 : 0.004) * femScale;
    const yDrop = shoeMode === 'closed' ? 0.004 * femScale : 0.006 * femScale;
    const yFloorClamp = shoeMode === 'heel' ? -0.050 * femScale : 0.002 * femScale;

    for (let vi = 0; vi < surface.vertCount; vi++) {
      const reg = surface.regions[vi];
      const vx = workBodyPos[vi * 3];
      const vy = workBodyPos[vi * 3 + 1];
      const vz = workBodyPos[vi * 3 + 2];
      if (!isFootVertMaskedByShoes(reg, vx, vy, vz, footXAbs, footY, shoeMode)) {
        continue;
      }

      const footX = reg === 'foot_l' ? leftFootX : rightFootX;
      const dx = vx - footX;
      const absDx = Math.abs(dx);
      if (absDx > 1e-4) {
        workBodyPos[vi * 3] -= Math.sign(dx) * Math.min(xPull, absDx * 0.5);
      }
      workBodyPos[vi * 3 + 1] = Math.max(yFloorClamp, vy - yDrop);
    }
  }

  const posAttr = baseBodyMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  (posAttr.array as Float32Array).set(workBodyPos);
  posAttr.needsUpdate = true;
  surface.posArr.set(workBodyPos);
}

function buildBodyOverlaySkinnedMesh(
  baseBodyMesh: THREE.SkinnedMesh,
  _category: ClothesCategoryId,
  layerIndex: number,
  _blendShapes: Record<string, number>,
  material: THREE.Material
): THREE.SkinnedMesh {
  const surface = getCachedBodySurfaceData(baseBodyMesh);
  const geom = baseBodyMesh.geometry.clone();
  // Ensure overlay uses the full unmasked body index buffer
  if (surface.originalIndices.length > 0) {
    geom.setIndex(new THREE.Uint32BufferAttribute(surface.originalIndices, 1));
  }

  const vertCount = surface.vertCount;
  const posArr = new Float32Array(vertCount * 3);
  // Subtle skin-tight offset using welded normals so UV seams stay 100% watertight
  const inflate = 0.0009 + layerIndex * 0.0004;

  for (let i = 0; i < vertCount; i++) {
    const px = surface.posArr[i * 3];
    const py = surface.posArr[i * 3 + 1];
    const pz = surface.posArr[i * 3 + 2];
    const nx = surface.weldedNormals[i * 3];
    const ny = surface.weldedNormals[i * 3 + 1];
    const nz = surface.weldedNormals[i * 3 + 2];

    const factor = py > 1.35 ? 0.2 : 1.0;
    posArr[i * 3] = px + nx * inflate * factor;
    posArr[i * 3 + 1] = py + ny * inflate * factor;
    posArr[i * 3 + 2] = pz + nz * inflate * factor;
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));

  const skinned = new THREE.SkinnedMesh(geom, material);
  skinned.castShadow = true;
  skinned.receiveShadow = true;
  skinned.frustumCulled = false;
  skinned.bind(baseBodyMesh.skeleton, baseBodyMesh.bindMatrix);
  return skinned;
}

const CHILD_BONE_MAP: Record<string, string> = {
  J_Bip_C_Hips: 'J_Bip_C_Spine',
  J_Bip_C_Spine: 'J_Bip_C_Chest',
  J_Bip_C_Chest: 'J_Bip_C_UpperChest',
  J_Bip_C_UpperChest: 'J_Bip_C_Neck',
  J_Bip_C_Neck: 'J_Bip_C_Head',
  J_Bip_L_Shoulder: 'J_Bip_L_UpperArm',
  J_Bip_L_UpperArm: 'J_Bip_L_LowerArm',
  J_Bip_L_LowerArm: 'J_Bip_L_Hand',
  J_Bip_R_Shoulder: 'J_Bip_R_UpperArm',
  J_Bip_R_UpperArm: 'J_Bip_R_LowerArm',
  J_Bip_R_LowerArm: 'J_Bip_R_Hand',
  J_Bip_L_UpperLeg: 'J_Bip_L_LowerLeg',
  J_Bip_L_LowerLeg: 'J_Bip_L_Foot',
  J_Bip_L_Foot: 'J_Bip_L_ToeBase',
  J_Bip_R_UpperLeg: 'J_Bip_R_LowerLeg',
  J_Bip_R_LowerLeg: 'J_Bip_R_Foot',
  J_Bip_R_Foot: 'J_Bip_R_ToeBase',
};

function isCompatibleBodyVert(
  cBone: string,
  cReg: BodyAnatomicalRegion,
  bBone: string,
  bReg: BodyAnatomicalRegion
): boolean {
  if (cReg === 'hand_l' || cReg === 'hand_r') {
    return bBone === cBone;
  }
  return (
    cReg === bReg ||
    ((cReg === 'leg_l' || cReg === 'leg_r') && bReg === 'torso') ||
    (cReg === 'torso' && (bReg === 'leg_l' || bReg === 'leg_r')) ||
    ((cReg === 'arm_l' || cReg === 'arm_r') && bReg === 'torso') ||
    (cReg === 'foot_l' && bReg === 'leg_l') ||
    (cReg === 'leg_l' && bReg === 'foot_l') ||
    (cReg === 'foot_r' && bReg === 'leg_r') ||
    (cReg === 'leg_r' && bReg === 'foot_r')
  );
}

function buildTemplateSkinnedMesh(
  baseBodyMesh: THREE.SkinnedMesh,
  gender: PlayerGender,
  partgroup: string,
  template: ClothesTemplateMeshData,
  category: ClothesCategoryId,
  layerIndex: number,
  blendShapeWeights: Record<string, number>,
  material: THREE.Material,
  itemId?: string,
  priorSurfaces?: BuiltClothSurface[]
): THREE.SkinnedMesh {
  const surface = getCachedBodySurfaceData(baseBodyMesh);
  const { boneNameMap, dstBoneBindPos } = surface;
  const fallbackBoneIdx = boneNameMap.get('J_Bip_C_Hips') ?? 0;

  const vertCount = Math.floor(template.positions.length / 3);
  const workPos = Float32Array.from(template.positions);

  // 1. Apply official VRoid BlendShapes (.Male when gender === 'male' + item blendShapes)
  let effectiveBlendShapes = blendShapeWeights;
  if (itemId === 'female_Top2' && layerIndex === 1) {
    // Keep collar layer aligned with base shirt layer instead of inflating away from the nape
    effectiveBlendShapes = {
      ...blendShapeWeights,
      ClavicleLow: 62,
      AllInflate: 8,
    };
  }
  const combinedBS: Record<string, number> = {
    ...(gender === 'male' ? { Male: 100 } : {}),
    ...effectiveBlendShapes,
  };
  if (template.blendShapes) {
    for (const [bsKey, weightVal] of Object.entries(combinedBS)) {
      const sparse = template.blendShapes[bsKey];
      if (!sparse || !weightVal) continue;
      const factor = weightVal / 100;
      for (let s = 0; s < sparse.length; s += 4) {
        const vi = sparse[s];
        workPos[vi * 3] += sparse[s + 1] * factor;
        workPos[vi * 3 + 1] += sparse[s + 2] * factor;
        workPos[vi * 3 + 2] += sparse[s + 3] * factor;
      }
    }
  }

  // Female Top4: shorten the two isolated drawstring cord components (~45% shorter from top anchor)
  if (itemId === 'female_Top4' && template.indices && template.indices.length > 0) {
    const adj: number[][] = Array.from({ length: vertCount }, () => []);
    for (let t = 0; t < template.indices.length; t += 3) {
      const a = template.indices[t];
      const b = template.indices[t + 1];
      const c = template.indices[t + 2];
      adj[a].push(b, c);
      adj[b].push(a, c);
      adj[c].push(a, b);
    }
    const vis = new Uint8Array(vertCount);
    const stack: number[] = [];
    for (let i = 0; i < vertCount; i++) {
      if (vis[i]) continue;
      vis[i] = 1;
      stack.length = 0;
      stack.push(i);
      const comp: number[] = [];
      let minY = Infinity;
      let maxY = -Infinity;
      let minZ = Infinity;
      let maxAbsX = 0;
      while (stack.length > 0) {
        const u = stack.pop()!;
        comp.push(u);
        const ax = Math.abs(workPos[u * 3]);
        const uy = workPos[u * 3 + 1];
        const uz = workPos[u * 3 + 2];
        if (ax > maxAbsX) maxAbsX = ax;
        if (uy < minY) minY = uy;
        if (uy > maxY) maxY = uy;
        if (uz < minZ) minZ = uz;
        const nb = adj[u];
        for (let k = 0; k < nb.length; k++) {
          if (!vis[nb[k]]) {
            vis[nb[k]] = 1;
            stack.push(nb[k]);
          }
        }
      }
      if (comp.length <= 60 && maxAbsX < 0.08 && minY > 1.08 && maxY > 1.30 && minZ < -0.10) {
        for (let k = 0; k < comp.length; k++) {
          const vi = comp[k];
          const drop = maxY - workPos[vi * 3 + 1];
          workPos[vi * 3 + 1] = maxY - drop * 0.55;
          workPos[vi * 3 + 2] += drop * 0.035;
        }
      }
    }
  }

  // 2. Compute per-bone segment scales between canonical VRoid template and target player VRM
  const srcMap: Record<string, [number, number, number]> = {};
  const mappedJointIndices: number[] = [];
  for (let j = 0; j < template.jointNames.length; j++) {
    const jName = template.jointNames[j];
    srcMap[jName] = template.jointBindPos[j] || [0, 0, 0];
    mappedJointIndices.push(boneNameMap.get(jName) ?? fallbackBoneIdx);
  }

  const charScaleY = (dstBoneBindPos['J_Bip_C_Neck']?.[1] || 1.3065) / 1.36828;
  const boneScales: Array<[number, number, number]> = template.jointNames.map((bName) => {
    // Avoid 4.38x (female) / 4.65x (male) vertical collar/tie distortion from canonical Neck->Head spacing
    if (bName === 'J_Bip_C_Neck') {
      return [charScaleY, charScaleY, charScaleY];
    }
    const childName = CHILD_BONE_MAP[bName];
    if (childName && srcMap[bName] && srcMap[childName] && dstBoneBindPos[bName] && dstBoneBindPos[childName]) {
      const sLen = Math.hypot(
        srcMap[childName][0] - srcMap[bName][0],
        srcMap[childName][1] - srcMap[bName][1],
        srcMap[childName][2] - srcMap[bName][2]
      );
      const dLen = Math.hypot(
        dstBoneBindPos[childName][0] - dstBoneBindPos[bName][0],
        dstBoneBindPos[childName][1] - dstBoneBindPos[bName][1],
        dstBoneBindPos[childName][2] - dstBoneBindPos[bName][2]
      );
      if (sLen > 0.01) {
        const segScale = dLen / sLen;
        if (bName.includes('Arm')) return [segScale, charScaleY, charScaleY];
        if (bName.includes('Foot')) {
          const sy = (dstBoneBindPos[bName][1] || 0.09) / (srcMap[bName][1] || 0.09577);
          const sz =
            Math.abs(dstBoneBindPos[childName][2] - dstBoneBindPos[bName][2]) /
            Math.abs(srcMap[childName][2] - srcMap[bName][2]);
          return [sy, sy, sz];
        }
        return [charScaleY, segScale, charScaleY];
      }
    }
    if (
      bName.includes('ToeBase') &&
      srcMap['J_Bip_L_Foot'] &&
      dstBoneBindPos['J_Bip_L_Foot'] &&
      srcMap['J_Bip_L_ToeBase'] &&
      dstBoneBindPos['J_Bip_L_ToeBase']
    ) {
      const sy = (dstBoneBindPos['J_Bip_L_Foot'][1] || 0.09) / (srcMap['J_Bip_L_Foot'][1] || 0.09577);
      const sz =
        Math.abs(dstBoneBindPos['J_Bip_L_ToeBase'][2] - dstBoneBindPos['J_Bip_L_Foot'][2]) /
        Math.abs(srcMap['J_Bip_L_ToeBase'][2] - srcMap['J_Bip_L_Foot'][2]);
      return [sy, sy, sz];
    }
    return [charScaleY, charScaleY, charScaleY];
  });

  const posArr = new Float32Array(vertCount * 3);
  const normArr = Float32Array.from(template.normals);
  const uvArr = Float32Array.from(template.uvs);
  const skinIndexArr = new Uint16Array(vertCount * 4);
  const skinWeightArr = Float32Array.from(template.weights);

  if (partgroup.includes('Glasses')) {
    const headIdx = boneNameMap.get('J_Bip_C_Head') ?? fallbackBoneIdx;
    const headPos = dstBoneBindPos['J_Bip_C_Head'] || [
      0,
      gender === 'male' ? 1.4853 : 1.3797,
      0.025,
    ];
    const eyeL = dstBoneBindPos['J_Adj_L_FaceEye'];
    const eyeR = dstBoneBindPos['J_Adj_R_FaceEye'];
    const targetEyeY =
      eyeL && eyeR ? (eyeL[1] + eyeR[1]) * 0.5 - 0.006 : headPos[1] + 0.057;
    const templateLensCenterY = 1.4275;
    const dyGlasses = targetEyeY - templateLensCenterY;
    const dzGlasses = headPos[2] - 0.025 - 0.004;
    const isFemaleGlasses = itemId === 'female_Glasses1' || itemId === 'female_Glasses2';
    const scaleXY = isFemaleGlasses ? 0.88 : 1.0;
    const scaleZ = isFemaleGlasses ? 0.90 : 1.0;
    const pivotZ = -0.072;

    for (let v = 0; v < vertCount; v++) {
      const gx = workPos[v * 3] * scaleXY;
      const gy = templateLensCenterY + (workPos[v * 3 + 1] - templateLensCenterY) * scaleXY + dyGlasses;
      const gz = pivotZ + (workPos[v * 3 + 2] - pivotZ) * scaleZ + dzGlasses;
      posArr[v * 3] = gx;
      posArr[v * 3 + 1] = gy;
      posArr[v * 3 + 2] = gz;
      skinIndexArr[v * 4] = headIdx;
      skinIndexArr[v * 4 + 1] = 0;
      skinIndexArr[v * 4 + 2] = 0;
      skinIndexArr[v * 4 + 3] = 0;
      skinWeightArr[v * 4] = 1;
      skinWeightArr[v * 4 + 1] = 0;
      skinWeightArr[v * 4 + 2] = 0;
      skinWeightArr[v * 4 + 3] = 0;
    }
  } else if (category === 'shoes') {
    for (let v = 0; v < vertCount; v++) {
      const vx = workPos[v * 3];
      const vy = workPos[v * 3 + 1];
      const vz = workPos[v * 3 + 2];
      const isLeft = vx < 0;
      const footBoneName = isLeft ? 'J_Bip_L_Foot' : 'J_Bip_R_Foot';
      const srcFoot: [number, number, number] = isLeft
        ? [-0.08098, 0.09577, 0.03419]
        : [0.08098, 0.09577, 0.03419];
      const dstFoot = dstBoneBindPos[footBoneName] || srcFoot;
      const footScale = (dstFoot[1] || 0.0857) / 0.09577;
      const xzMargin = partgroup === 'N00_003_01_Shoes' ? 1.045 : 1.015;

      posArr[v * 3] = dstFoot[0] + (vx - srcFoot[0]) * footScale * xzMargin;
      posArr[v * 3 + 1] = dstFoot[1] + (vy - srcFoot[1]) * footScale;
      posArr[v * 3 + 2] = dstFoot[2] + (vz - srcFoot[2]) * footScale * xzMargin;

      for (let k = 0; k < 4; k++) {
        const localJ = template.joints[v * 4 + k];
        skinIndexArr[v * 4 + k] = mappedJointIndices[localJ] ?? fallbackBoneIdx;
      }
    }
  } else {
    for (let v = 0; v < vertCount; v++) {
      const vx = workPos[v * 3];
      const vy = workPos[v * 3 + 1];
      const vz = workPos[v * 3 + 2];

      let outX = 0;
      let outY = 0;
      let outZ = 0;
      let wSum = 0;

      for (let k = 0; k < 4; k++) {
        const localJ = template.joints[v * 4 + k];
        const w = template.weights[v * 4 + k];
        const skelIdx = mappedJointIndices[localJ] ?? fallbackBoneIdx;
        skinIndexArr[v * 4 + k] = skelIdx;

        if (w > 0.0001) {
          const jName = template.jointNames[localJ];
          const srcJ = srcMap[jName] || [0, 0, 0];
          const dstJ = dstBoneBindPos[jName] || srcJ;
          const sc = boneScales[localJ];
          outX += w * (dstJ[0] + (vx - srcJ[0]) * sc[0]);
          outY += w * (dstJ[1] + (vy - srcJ[1]) * sc[1]);
          outZ += w * (dstJ[2] + (vz - srcJ[2]) * sc[2]);
          wSum += w;
        }
      }

      if (wSum > 0.0001) {
        outX /= wSum;
        outY /= wSum;
        outZ /= wSum;
      } else {
        outX = vx;
        outY = vy;
        outZ = vz;
      }

      posArr[v * 3] = outX;
      posArr[v * 3 + 1] = outY;
      posArr[v * 3 + 2] = outZ;
    }

    // Targeted female collar & neck-ribbon seating prior to surface clearance pass
    if (
      itemId === 'female_Top7' ||
      itemId === 'female_Top8' ||
      itemId === 'female_Dress8' ||
      itemId === 'female_Dress9'
    ) {
      const collarBaseY = itemId === 'female_Top7' ? 1.294 : 1.288;
      const dropStrength = itemId === 'female_Top7' ? 0.50 : 0.58;
      for (let v = 0; v < vertCount; v++) {
        const vx = posArr[v * 3];
        const vy = posArr[v * 3 + 1];
        const vz = posArr[v * 3 + 2];
        if (vy > collarBaseY && Math.abs(vx) < 0.11) {
          const backW = THREE.MathUtils.clamp((vz + 0.015) / 0.055, 0, 1);
          if (backW > 0) {
            const excess = vy - collarBaseY;
            posArr[v * 3 + 1] = collarBaseY + excess * (1 - dropStrength * backW);
            posArr[v * 3 + 2] -= 0.006 * backW * THREE.MathUtils.clamp(excess / 0.05, 0, 1);
          }
        }
      }
    } else if (itemId === 'female_Top1' || itemId === 'female_Top2') {
      // Draw upper-back collar edges snug to the nape so it does not gap open behind
      for (let v = 0; v < vertCount; v++) {
        const vx = posArr[v * 3];
        const vy = posArr[v * 3 + 1];
        const vz = posArr[v * 3 + 2];
        if (vy > 1.255 && vz > 0.015 && Math.abs(vx) < 0.09) {
          const hFactor = THREE.MathUtils.clamp((vy - 1.255) / 0.065, 0, 1);
          posArr[v * 3 + 2] -= 0.008 * hFactor;
        }
      }
    } else if (
      itemId === 'female_Neck1' ||
      itemId === 'female_Neck2' ||
      itemId === 'female_Neck4'
    ) {
      // Lower neck ribbon/strap from mid-throat onto the collar base
      for (let v = 0; v < vertCount; v++) {
        const vy = posArr[v * 3 + 1];
        if (vy > 1.255) {
          const wDrop = THREE.MathUtils.clamp((vy - 1.255) / 0.055, 0.25, 1.0);
          posArr[v * 3 + 1] = vy - 0.019 * wDrop;
          posArr[v * 3 + 2] -= 0.003 * wDrop;
        }
      }
    } else if (itemId === 'male_Top1') {
      // Lower Male Top1 back collar rim to sit naturally at nape height without altering front neckline
      for (let v = 0; v < vertCount; v++) {
        const vx = posArr[v * 3];
        const vy = posArr[v * 3 + 1];
        const vz = posArr[v * 3 + 2];
        if (vy > 1.365 && Math.abs(vx) < 0.14) {
          const backW = THREE.MathUtils.clamp((vz + 0.01) / 0.045, 0, 1);
          if (backW > 0) {
            const excess = vy - 1.365;
            posArr[v * 3 + 1] = 1.365 + excess * (1 - 0.52 * backW);
          }
        }
      }
    } else if (itemId === 'male_Top2') {
      // Lower Male Top2 back jacket collar to sit naturally without flattening or exposing shoulders
      for (let v = 0; v < vertCount; v++) {
        const vx = posArr[v * 3];
        const vy = posArr[v * 3 + 1];
        const vz = posArr[v * 3 + 2];
        if (vy > 1.370 && Math.abs(vx) < 0.14) {
          const backW = THREE.MathUtils.clamp((vz + 0.01) / 0.045, 0, 1);
          if (backW > 0) {
            const excess = vy - 1.370;
            posArr[v * 3 + 1] = 1.370 + excess * (1 - 0.48 * backW);
          }
        }
      }
    } else if (itemId === 'male_Top3') {
      // Lower Male Top3 resting hood and back collar smoothly behind the neck
      for (let v = 0; v < vertCount; v++) {
        const vx = posArr[v * 3];
        const vy = posArr[v * 3 + 1];
        const vz = posArr[v * 3 + 2];
        if (vy > 1.365 && Math.abs(vx) < 0.15) {
          const hoodBackW = THREE.MathUtils.clamp((vz + 0.01) / 0.06, 0, 1);
          if (hoodBackW > 0) {
            const excess = vy - 1.365;
            posArr[v * 3 + 1] = 1.365 + excess * (1 - 0.52 * hoodBackW);
          }
        }
      }
    } else if (itemId === 'male_Neck1' || itemId === 'male_Neck2') {
      // Seat Male neck ribbons/ties at collar base (~1.37)
      for (let v = 0; v < vertCount; v++) {
        const vy = posArr[v * 3 + 1];
        if (vy > 1.33) {
          const wDrop = THREE.MathUtils.clamp((vy - 1.33) / 0.06, 0, 1);
          posArr[v * 3 + 1] = vy - 0.024 * wDrop;
          posArr[v * 3 + 2] -= 0.003 * wDrop;
        }
      }
    } else if (itemId === 'male_Neck3') {
      // Seat Male bow tie cleanly at collar base
      for (let v = 0; v < vertCount; v++) {
        const vy = posArr[v * 3 + 1];
        if (vy > 1.33) {
          const wDrop = THREE.MathUtils.clamp((vy - 1.33) / 0.06, 0, 1);
          posArr[v * 3 + 1] = vy - 0.022 * wDrop;
          posArr[v * 3 + 2] -= 0.004 * wDrop;
        }
      }
    }
  }

  // 3. Multi-pass anatomical surface clearance + bone-weight lock to prevent any body penetration
  if (!partgroup.includes('Glasses') && category !== 'shoes') {
    const minClearance =
      (CATEGORY_CLEARANCE_METERS[category] || 0.0032) + layerIndex * 0.0009;
    const bCount = surface.vertCount;
    const bPos = surface.posArr;
    const bNorm = surface.weldedNormals;
    const bBones = surface.primaryBoneNames;
    const bRegs = surface.regions;

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < vertCount; i++) {
        const vx = posArr[i * 3];
        const vy = posArr[i * 3 + 1];
        const vz = posArr[i * 3 + 2];
        const cBone = template.jointNames[template.joints[i * 4]] || 'J_Bip_C_Hips';
        const cReg = classifyBoneRegion(cBone);

        let bestD2 = Infinity;
        let bestJ = -1;
        for (let j = 0; j < bCount; j++) {
          const dy = vy - bPos[j * 3 + 1];
          if (dy > 0.08 || dy < -0.08) continue;
          if (!isCompatibleBodyVert(cBone, cReg, bBones[j], bRegs[j])) continue;
          const dx = vx - bPos[j * 3];
          const dz = vz - bPos[j * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestD2) {
            bestD2 = d2;
            bestJ = j;
          }
        }

        if (bestJ >= 0 && bestD2 < 0.0036) {
          const dx = vx - bPos[bestJ * 3];
          const dy = vy - bPos[bestJ * 3 + 1];
          const dz = vz - bPos[bestJ * 3 + 2];
          const nx = bNorm[bestJ * 3];
          const ny = bNorm[bestJ * 3 + 1];
          const nz = bNorm[bestJ * 3 + 2];
          const signedDist = dx * nx + dy * ny + dz * nz;
          const ndot =
            normArr[i * 3] * nx + normArr[i * 3 + 1] * ny + normArr[i * 3 + 2] * nz;
          const targetClearance =
            itemId === 'female_Arm2' && (cReg === 'hand_l' || cReg === 'hand_r')
              ? 0.0028
              : minClearance;
          const allowPush =
            (itemId === 'female_Arm2' && (cReg === 'hand_l' || cReg === 'hand_r')) ||
            ndot >= -0.15;
          if (allowPush && signedDist < targetClearance) {
            const push = targetClearance - signedDist;
            const yClearScale =
              itemId === 'male_Neck1' || itemId === 'male_Neck2' || itemId === 'male_Neck3'
                ? 0.25
                : 1.0;
            posArr[i * 3] += nx * push;
            posArr[i * 3 + 1] += ny * push * yClearScale;
            posArr[i * 3 + 2] += nz * push;
          }

          // Lock skinning weights to the closest underlying body vertex so joints move in 100% unison
          if (pass === 0 && bestD2 < 0.0025) {
            skinIndexArr[i * 4] = surface.skinIndices[bestJ * 4];
            skinIndexArr[i * 4 + 1] = surface.skinIndices[bestJ * 4 + 1];
            skinIndexArr[i * 4 + 2] = surface.skinIndices[bestJ * 4 + 2];
            skinIndexArr[i * 4 + 3] = surface.skinIndices[bestJ * 4 + 3];
            skinWeightArr[i * 4] = surface.skinWeights[bestJ * 4];
            skinWeightArr[i * 4 + 1] = surface.skinWeights[bestJ * 4 + 1];
            skinWeightArr[i * 4 + 2] = surface.skinWeights[bestJ * 4 + 2];
            skinWeightArr[i * 4 + 3] = surface.skinWeights[bestJ * 4 + 3];
          }
        }
      }
    }
  }

  // 3b. Multi-layer clothing clearance against underlying clothing layers
  if (priorSurfaces && priorSurfaces.length > 0 && !partgroup.includes('Glasses')) {
    for (const under of priorSurfaces) {
      const isUnder =
        (category === 'top' && under.category === 'bottom') ||
        (category === 'dress' && (under.category === 'top' || under.category === 'bottom')) ||
        (category === 'shoes' && (under.category === 'socks' || under.category === 'bottom')) ||
        (category === 'neck' && (under.category === 'top' || under.category === 'dress'));
      if (!isUnder) continue;

      const interLayerMargin =
        category === 'neck' ? 0.0100 :
        category === 'dress' ? 0.0085 :
        0.0075;
      const uCount = under.vertCount;
      const uPos = under.posArr;
      const uNorm = under.normArr;

      // Special case: 1:1 vertex correspondence for identical partgroup templates (e.g. dress over top)
      if (under.partgroup === partgroup && uCount === vertCount) {
        for (let i = 0; i < vertCount; i++) {
          const vx = posArr[i * 3];
          const vy = posArr[i * 3 + 1];
          const vz = posArr[i * 3 + 2];
          const ux = uPos[i * 3];
          const uy = uPos[i * 3 + 1];
          const uz = uPos[i * 3 + 2];
          const nx = uNorm[i * 3];
          const ny = uNorm[i * 3 + 1];
          const nz = uNorm[i * 3 + 2];

          const dx = vx - ux;
          const dy = vy - uy;
          const dz = vz - uz;
          const signedDist = dx * nx + dy * ny + dz * nz;
          if (signedDist < interLayerMargin) {
            const push = interLayerMargin - signedDist;
            posArr[i * 3] += nx * push;
            posArr[i * 3 + 1] += ny * push;
            posArr[i * 3 + 2] += nz * push;
          }
        }
        continue;
      }

      // General case: 2-iteration nearest-surface clearance with 12 cm search radius
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < vertCount; i++) {
          const vx = posArr[i * 3];
          const vy = posArr[i * 3 + 1];
          const vz = posArr[i * 3 + 2];

          let bestD2 = Infinity;
          let bestU = -1;
          for (let j = 0; j < uCount; j++) {
            const dy = vy - uPos[j * 3 + 1];
            if (dy > 0.10 || dy < -0.10) continue;
            const dx = vx - uPos[j * 3];
            const dz = vz - uPos[j * 3 + 2];
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < bestD2) {
              bestD2 = d2;
              bestU = j;
            }
          }

          if (bestU >= 0 && bestD2 < 0.0144) {
            const dx = vx - uPos[bestU * 3];
            const dy = vy - uPos[bestU * 3 + 1];
            const dz = vz - uPos[bestU * 3 + 2];
            const nx = uNorm[bestU * 3];
            const ny = uNorm[bestU * 3 + 1];
            const nz = uNorm[bestU * 3 + 2];
            const signedDist = dx * nx + dy * ny + dz * nz;
            if (signedDist < interLayerMargin) {
              const push = interLayerMargin - signedDist;
              posArr[i * 3] += nx * push;
              posArr[i * 3 + 1] += ny * push;
              posArr[i * 3 + 2] += nz * push;
            }
          }
        }
      }
    }
  }

  if (priorSurfaces) {
    priorSurfaces.push({
      category,
      itemId: itemId || '',
      partgroup,
      posArr: Float32Array.from(posArr),
      normArr: Float32Array.from(normArr),
      vertCount,
    });
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndexArr, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeightArr, 4));
  geom.setIndex(template.indices);
  geom.computeBoundingSphere();

  const skinned = new THREE.SkinnedMesh(geom, material);
  skinned.castShadow = true;
  skinned.receiveShadow = true;
  skinned.frustumCulled = false;
  skinned.bind(baseBodyMesh.skeleton, baseBodyMesh.bindMatrix);
  return skinned;
}

function selectTemplateForPartGroup(
  partgroup: string,
  templates: ClothesTemplatesBundle
): ClothesTemplateMeshData | null {
  if (partgroup === 'SkinOverlay') {
    return null;
  }
  const entry =
    partgroup === 'GlassesHi' || partgroup === 'GlassesLow'
      ? templates[`${partgroup}_frame`]
      : templates[partgroup];
  if (entry && 'positions' in entry) {
    return entry;
  }
  return null;
}

/**
 * Hides body/overlay foot geometry enclosed inside equipped shoes so bare toes,
 * heels, and socks do not poke through shoe meshes, while keeping exposed arches
 * and all legs, torso, and arms intact.
 */
function updateBodyMeshCoverageMask(
  baseBodyMesh: THREE.SkinnedMesh,
  equippedPartGroups: Set<string>,
  hasShoes: boolean
): THREE.Uint32BufferAttribute | null {
  const surface = getCachedBodySurfaceData(baseBodyMesh);
  const orig = surface.originalIndices;
  if (orig.length === 0) return null;

  const shoeMode = getActiveShoeMaskMode(hasShoes, equippedPartGroups);
  if (shoeMode === 'none') {
    const origAttr = new THREE.Uint32BufferAttribute(orig, 1);
    baseBodyMesh.geometry.setIndex(origAttr);
    return origAttr;
  }

  const footY = surface.dstBoneBindPos['J_Bip_L_Foot']?.[1] || 0.08567;
  const footXAbs = Math.abs(surface.dstBoneBindPos['J_Bip_L_Foot']?.[0] ?? -0.0765);
  const kept: number[] = [];
  for (let i = 0; i < orig.length; i += 3) {
    const i0 = orig[i];
    const i1 = orig[i + 1];
    const i2 = orig[i + 2];
    const h0 = isFootVertMaskedByShoes(
      surface.regions[i0],
      surface.posArr[i0 * 3],
      surface.posArr[i0 * 3 + 1],
      surface.posArr[i0 * 3 + 2],
      footXAbs,
      footY,
      shoeMode
    );
    const h1 = isFootVertMaskedByShoes(
      surface.regions[i1],
      surface.posArr[i1 * 3],
      surface.posArr[i1 * 3 + 1],
      surface.posArr[i1 * 3 + 2],
      footXAbs,
      footY,
      shoeMode
    );
    const h2 = isFootVertMaskedByShoes(
      surface.regions[i2],
      surface.posArr[i2 * 3],
      surface.posArr[i2 * 3 + 1],
      surface.posArr[i2 * 3 + 2],
      footXAbs,
      footY,
      shoeMode
    );
    if (h0 && h1 && h2) {
      continue;
    }
    kept.push(i0, i1, i2);
  }

  const maskedAttr = new THREE.Uint32BufferAttribute(kept, 1);
  baseBodyMesh.geometry.setIndex(maskedAttr);
  return maskedAttr;
}

export interface ClothPhysicsSpring {
  category: 'skirt' | 'top' | 'neck';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  target: THREE.Vector3;
  uniform: THREE.IUniform<THREE.Vector3>;
}

export interface ClothesPhysicsRuntime {
  time: number;
  initialized: boolean;
  lastHipsWorldPos: THREE.Vector3;
  lastHipsWorldQuat: THREE.Quaternion;
  lastHipsLinearVel: THREE.Vector3;
  springs: {
    skirt: ClothPhysicsSpring;
    top: ClothPhysicsSpring;
    neck: ClothPhysicsSpring;
  };
}

export function initOrGetClothesPhysicsRuntime(clothesRoot: THREE.Group): ClothesPhysicsRuntime {
  if (clothesRoot.userData.clothesPhysics) {
    return clothesRoot.userData.clothesPhysics as ClothesPhysicsRuntime;
  }
  const runtime: ClothesPhysicsRuntime = {
    time: 0,
    initialized: false,
    lastHipsWorldPos: new THREE.Vector3(),
    lastHipsWorldQuat: new THREE.Quaternion(),
    lastHipsLinearVel: new THREE.Vector3(),
    springs: {
      skirt: {
        category: 'skirt',
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        target: new THREE.Vector3(),
        uniform: { value: new THREE.Vector3() },
      },
      top: {
        category: 'top',
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        target: new THREE.Vector3(),
        uniform: { value: new THREE.Vector3() },
      },
      neck: {
        category: 'neck',
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        target: new THREE.Vector3(),
        uniform: { value: new THREE.Vector3() },
      },
    },
  };
  clothesRoot.userData.clothesPhysics = runtime;
  return runtime;
}

const _tmpHipsPos = new THREE.Vector3();
const _tmpHipsQuat = new THREE.Quaternion();
const _tmpHipsLinearVel = new THREE.Vector3();
const _tmpHipsLinearAccel = new THREE.Vector3();
const _tmpHipsQuatInv = new THREE.Quaternion();
const _tmpHipsLocalAccel = new THREE.Vector3();
const _tmpHipsRotDelta = new THREE.Quaternion();
const _tmpHipsEuler = new THREE.Euler();

export function updateClothesPhysics(
  vrm: VRM,
  dt: number,
  isMoving = false,
  gaitPhase = 0
): void {
  const clothesRoot = vrm.scene.getObjectByName('PlayerCustomClothesRoot') as THREE.Group | undefined;
  if (!clothesRoot) return;
  const runtime = clothesRoot.userData.clothesPhysics as ClothesPhysicsRuntime | undefined;
  if (!runtime) return;

  const hips =
    vrm.humanoid?.getRawBoneNode('hips') ||
    vrm.scene.getObjectByName('J_Bip_C_Hips') ||
    vrm.scene;

  const safeDt = THREE.MathUtils.clamp(dt, 0.001, 0.05);
  runtime.time += safeDt;

  hips.updateWorldMatrix(true, false);
  hips.getWorldPosition(_tmpHipsPos);
  hips.getWorldQuaternion(_tmpHipsQuat);

  if (!runtime.initialized) {
    runtime.initialized = true;
    runtime.lastHipsWorldPos.copy(_tmpHipsPos);
    runtime.lastHipsWorldQuat.copy(_tmpHipsQuat);
    runtime.lastHipsLinearVel.set(0, 0, 0);
    return;
  }

  const frameDistSq = _tmpHipsPos.distanceToSquared(runtime.lastHipsWorldPos);
  if (frameDistSq > 0.35) {
    runtime.lastHipsWorldPos.copy(_tmpHipsPos);
    runtime.lastHipsWorldQuat.copy(_tmpHipsQuat);
    runtime.lastHipsLinearVel.set(0, 0, 0);
    return;
  }

  _tmpHipsLinearVel.subVectors(_tmpHipsPos, runtime.lastHipsWorldPos).divideScalar(safeDt);
  _tmpHipsLinearAccel.subVectors(_tmpHipsLinearVel, runtime.lastHipsLinearVel).divideScalar(safeDt);
  runtime.lastHipsWorldPos.copy(_tmpHipsPos);
  runtime.lastHipsLinearVel.copy(_tmpHipsLinearVel);

  _tmpHipsQuatInv.copy(_tmpHipsQuat).invert();
  _tmpHipsLocalAccel.copy(_tmpHipsLinearAccel).applyQuaternion(_tmpHipsQuatInv);
  _tmpHipsLocalAccel.x = THREE.MathUtils.clamp(_tmpHipsLocalAccel.x, -12.0, 12.0);
  _tmpHipsLocalAccel.y = THREE.MathUtils.clamp(_tmpHipsLocalAccel.y, -16.0, 16.0);
  _tmpHipsLocalAccel.z = THREE.MathUtils.clamp(_tmpHipsLocalAccel.z, -12.0, 12.0);

  _tmpHipsRotDelta.copy(runtime.lastHipsWorldQuat).invert().multiply(_tmpHipsQuat);
  runtime.lastHipsWorldQuat.copy(_tmpHipsQuat);
  _tmpHipsEuler.setFromQuaternion(_tmpHipsRotDelta, 'YXZ');
  const yawRate = THREE.MathUtils.clamp(_tmpHipsEuler.y / safeDt, -6.0, 6.0);

  const t = runtime.time;
  const breezeX = Math.sin(t * 1.6) * 0.005 + Math.sin(t * 2.7) * 0.003;
  const breezeZ = Math.cos(t * 1.3) * 0.004 + Math.sin(t * 2.1) * 0.002;
  const breezeY = Math.sin(t * 1.8) * 0.0025;

  let walkBounceY = 0;
  let walkSwayX = 0;
  let walkDragZ = 0;
  if (isMoving) {
    walkBounceY = -Math.abs(Math.sin(gaitPhase)) * 0.016;
    walkSwayX = Math.sin(gaitPhase * 0.5) * 0.014;
    walkDragZ = 0.028 + Math.sin(gaitPhase) * 0.012;
  }

  // 1. Skirt / Dress Spring
  {
    const s = runtime.springs.skirt;
    let tx = -_tmpHipsLocalAccel.x * 0.0025 - yawRate * 0.006 + breezeX + (isMoving ? walkSwayX : 0);
    let ty = -_tmpHipsLocalAccel.y * 0.0020 + breezeY + (isMoving ? walkBounceY : 0);
    let tz = -_tmpHipsLocalAccel.z * 0.0025 + breezeZ + (isMoving ? walkDragZ : 0);
    tx = THREE.MathUtils.clamp(tx, -0.065, 0.065);
    ty = THREE.MathUtils.clamp(ty, -0.035, 0.035);
    tz = THREE.MathUtils.clamp(tz, -0.050, 0.075);
    s.target.set(tx, ty, tz);

    const omega = 11.5;
    const zeta = 0.72;
    const fx = -omega * omega * (s.pos.x - tx) - 2.0 * zeta * omega * s.vel.x;
    const fy = -omega * omega * (s.pos.y - ty) - 2.0 * zeta * omega * s.vel.y;
    const fz = -omega * omega * (s.pos.z - tz) - 2.0 * zeta * omega * s.vel.z;
    s.vel.x += fx * safeDt;
    s.vel.y += fy * safeDt;
    s.vel.z += fz * safeDt;
    s.pos.addScaledVector(s.vel, safeDt);
    s.uniform.value.copy(s.pos);
  }

  // 2. Top Spring
  {
    const s = runtime.springs.top;
    let tx = -_tmpHipsLocalAccel.x * 0.0015 - yawRate * 0.003 + breezeX * 0.6 + (isMoving ? walkSwayX * 0.6 : 0);
    let ty = -_tmpHipsLocalAccel.y * 0.0012 + breezeY * 0.5 + (isMoving ? walkBounceY * 0.5 : 0);
    let tz = -_tmpHipsLocalAccel.z * 0.0015 + breezeZ * 0.6 + (isMoving ? walkDragZ * 0.5 : 0);
    tx = THREE.MathUtils.clamp(tx, -0.025, 0.025);
    ty = THREE.MathUtils.clamp(ty, -0.015, 0.015);
    tz = THREE.MathUtils.clamp(tz, -0.020, 0.035);
    s.target.set(tx, ty, tz);

    const omega = 14.0;
    const zeta = 0.78;
    const fx = -omega * omega * (s.pos.x - tx) - 2.0 * zeta * omega * s.vel.x;
    const fy = -omega * omega * (s.pos.y - ty) - 2.0 * zeta * omega * s.vel.y;
    const fz = -omega * omega * (s.pos.z - tz) - 2.0 * zeta * omega * s.vel.z;
    s.vel.x += fx * safeDt;
    s.vel.y += fy * safeDt;
    s.vel.z += fz * safeDt;
    s.pos.addScaledVector(s.vel, safeDt);
    s.uniform.value.copy(s.pos);
  }

  // 3. Neck Ribbon / Tie Spring
  {
    const s = runtime.springs.neck;
    let tx = -_tmpHipsLocalAccel.x * 0.0020 - yawRate * 0.005 + breezeX * 0.8 + (isMoving ? walkSwayX * 0.8 : 0);
    let ty = -_tmpHipsLocalAccel.y * 0.0015 + breezeY * 0.6 + (isMoving ? walkBounceY * 0.6 : 0);
    let tz = -_tmpHipsLocalAccel.z * 0.0020 + breezeZ * 0.8 + (isMoving ? walkDragZ * 0.7 : 0);
    tx = THREE.MathUtils.clamp(tx, -0.035, 0.035);
    ty = THREE.MathUtils.clamp(ty, -0.020, 0.020);
    tz = THREE.MathUtils.clamp(tz, -0.025, 0.045);
    s.target.set(tx, ty, tz);

    const omega = 12.0;
    const zeta = 0.68;
    const fx = -omega * omega * (s.pos.x - tx) - 2.0 * zeta * omega * s.vel.x;
    const fy = -omega * omega * (s.pos.y - ty) - 2.0 * zeta * omega * s.vel.y;
    const fz = -omega * omega * (s.pos.z - tz) - 2.0 * zeta * omega * s.vel.z;
    s.vel.x += fx * safeDt;
    s.vel.y += fy * safeDt;
    s.vel.z += fz * safeDt;
    s.pos.addScaledVector(s.vel, safeDt);
    s.uniform.value.copy(s.pos);
  }
}

const LAYER_ORDER: ClothesCategoryId[] = [
  'socks',
  'arm',
  'bottom',
  'top',
  'dress',
  'shoes',
  'neck',
  'glasses',
];

/**
 * Applies the cumulative clothing selection (all equipped categories + per-category colors
 * + display visibility options) onto a VRM avatar (`FemPlayer.vrm` or `MalePlayer.vrm`).
 */
export function applyClothesSelectionToVrm(
  vrm: VRM,
  gender: PlayerGender,
  selection: PlayerClothesSelection,
  catalog: ClothesCatalogData,
  templates: ClothesTemplatesBundle,
  displayOptions: PlayerDisplayOptions = DEFAULT_PLAYER_DISPLAY_OPTIONS,
  activeCategoryForIsolate?: ClothesCategoryId,
  overrideSelection?: Partial<Record<ClothesCategoryId, string | null>>
): THREE.Group | null {
  const bodyMesh = findBodySkinnedMesh(vrm);
  if (!bodyMesh || !bodyMesh.parent) return null;

  // Body outline pass is an inverted-hull extrusion (0.0008) intended for naked models;
  // when clothes are worn, it pokes through clothing folds, waist, seams, and cuffs.
  const bodyMats = Array.isArray(bodyMesh.material) ? bodyMesh.material : [bodyMesh.material];
  for (const m of bodyMats) {
    if (
      /outline/i.test(m?.name ?? '') ||
      (m as unknown as { isOutline?: boolean }).isOutline
    ) {
      m.visible = false;
      if ('outlineWidthFactor' in m) {
        (m as unknown as { outlineWidthFactor: number }).outlineWidthFactor = 0;
      }
    }
  }

  const hostParent = bodyMesh.parent;
  const oldRoot = hostParent.getObjectByName('PlayerCustomClothesRoot');
  if (oldRoot) {
    oldRoot.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
    hostParent.remove(oldRoot);
  }

  const clothesRoot = new THREE.Group();
  clothesRoot.name = 'PlayerCustomClothesRoot';
  hostParent.add(clothesRoot);

  const genderItems = gender === 'male' ? catalog.male : catalog.female;
  const itemMap = new Map<string, CatalogClothesItem>();
  for (const it of genderItems) {
    itemMap.set(it.id, it);
    itemMap.set(it.rawId, it);
  }

  // Morph bare feet into arched high-heel pose when N00_009_01_Shoes (Chaussures #1/#2) is active
  const shoesVisible =
    displayOptions.visibleCategories.shoes &&
    (!displayOptions.isolateActiveCategory ||
      !activeCategoryForIsolate ||
      activeCategoryForIsolate === 'shoes');
  const activeShoesId = shoesVisible
    ? overrideSelection && 'shoes' in overrideSelection
      ? overrideSelection.shoes
      : selection.items.shoes
    : null;
  const activeShoesItem = activeShoesId ? itemMap.get(activeShoesId) : null;
  const activeShoeGroups = new Set<string>(
    activeShoesItem?.layers.map((l) => l.partgroup) || []
  );
  const shoeMode = getActiveShoeMaskMode(
    Boolean(activeShoesItem),
    activeShoeGroups
  );
  applyBodyFootHeelMorph(bodyMesh, templates, shoeMode);
  _soleProbeCache.delete(vrm.scene);
  const bodySurface = getCachedBodySurfaceData(bodyMesh);
  void bodySurface;

  const gradientMap = getAnimeClothesGradientMap();
  const physicsRuntime = initOrGetClothesPhysicsRuntime(clothesRoot);
  const builtSurfaces: BuiltClothSurface[] = [];
  let globalLayerCounter = 0;
  const activePartGroups = new Set<string>();
  let hasActiveShoes = false;

  for (const catId of LAYER_ORDER) {
    if (!displayOptions.visibleCategories[catId]) continue;
    if (
      displayOptions.isolateActiveCategory &&
      activeCategoryForIsolate &&
      catId !== activeCategoryForIsolate
    ) {
      continue;
    }

    const equippedId =
      overrideSelection && catId in overrideSelection
        ? overrideSelection[catId]
        : selection.items[catId];
    if (!equippedId) continue;

    const item = itemMap.get(equippedId);
    if (!item) continue;

    if (catId === 'shoes') {
      hasActiveShoes = true;
    }

    const tintColor = new THREE.Color(selection.colors[catId] || '#ffffff');

    for (let lIdx = 0; lIdx < item.layers.length; lIdx++) {
      const layer = item.layers[lIdx];
      activePartGroups.add(layer.partgroup);
      const map = layer.mainTextureUrl ? getClothesTexture(layer.mainTextureUrl) : null;
      const baseRenderOrder = CATEGORY_RENDER_ORDER[catId] || 20;
      const itemRenderOrder = baseRenderOrder + lIdx;

      const mat = new THREE.MeshToonMaterial({
        map,
        color: tintColor,
        gradientMap,
        transparent: false,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -2.0 - itemRenderOrder * 0.20,
        polygonOffsetUnits: -4.0 - itemRenderOrder * 0.40,
      });

      // Hook up physics uniforms and vertex displacement
      if (catId === 'bottom' || catId === 'dress') {
        const skirtSpring = physicsRuntime.springs.skirt;
        mat.customProgramCacheKey = () => `cloth_physics_skirt_${catId}`;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uClothSway = skirtSpring.uniform;
          shader.vertexShader = `
uniform vec3 uClothSway;
` + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
float skirtFactor = clamp((0.98 - position.y) / 0.45, 0.0, 1.0);
vec3 skirtDisp = uClothSway * pow(skirtFactor, 1.35);

vec3 candCloth = position + skirtDisp;
if (candCloth.y < 0.92 && candCloth.y > 0.42) {
  float lDist = length(vec2(candCloth.x - (-0.082), candCloth.z - (-0.012)));
  float rDist = length(vec2(candCloth.x - 0.082, candCloth.z - (-0.012)));
  float tRad = 0.074;
  if (lDist < tRad) {
    vec2 lDir = lDist > 0.001 ? normalize(vec2(candCloth.x - (-0.082), candCloth.z - (-0.012))) : vec2(-1.0, 0.0);
    candCloth.x = -0.082 + lDir.x * (tRad + 0.003);
    candCloth.z = -0.012 + lDir.y * (tRad + 0.003);
  }
  if (rDist < tRad) {
    vec2 rDir = rDist > 0.001 ? normalize(vec2(candCloth.x - 0.082, candCloth.z - (-0.012))) : vec2(1.0, 0.0);
    candCloth.x = 0.082 + rDir.x * (tRad + 0.003);
    candCloth.z = -0.012 + rDir.y * (tRad + 0.003);
  }
}
transformed = candCloth;`
          );
        };
      } else if (catId === 'top') {
        const topSpring = physicsRuntime.springs.top;
        mat.customProgramCacheKey = () => `cloth_physics_top`;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTopSway = topSpring.uniform;
          shader.vertexShader = `
uniform vec3 uTopSway;
` + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
float topHemFactor = clamp((1.06 - position.y) / 0.22, 0.0, 1.0);
transformed += uTopSway * pow(topHemFactor, 1.35);`
          );
        };
      } else if (catId === 'neck') {
        const neckSpring = physicsRuntime.springs.neck;
        mat.customProgramCacheKey = () => `cloth_physics_neck`;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uNeckSway = neckSpring.uniform;
          shader.vertexShader = `
uniform vec3 uNeckSway;
` + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
float neckHemFactor = clamp((1.34 - position.y) / 0.20, 0.0, 1.0);
vec3 neckDisp = uNeckSway * pow(neckHemFactor, 1.25);
vec3 candNeck = position + neckDisp;
if (candNeck.y < 1.34 && candNeck.y > 1.14 && candNeck.z > -0.076) {
  candNeck.z = -0.076;
}
transformed = candNeck;`
          );
        };
      }

      const template = selectTemplateForPartGroup(layer.partgroup, templates);
      if (template) {
        const mesh = buildTemplateSkinnedMesh(
          bodyMesh,
          gender,
          layer.partgroup,
          template,
          catId,
          globalLayerCounter,
          layer.blendShapes || {},
          mat,
          item.id,
          builtSurfaces
        );
        mesh.renderOrder = itemRenderOrder;
        mesh.name = `Clothes_${catId}_${item.rawId}_L${lIdx}`;
        clothesRoot.add(mesh);

        // If Glasses, also add the semi-transparent lens mesh
        const lensEntry = templates[`${layer.partgroup}_lens`];
        const lensTemplate =
          lensEntry && 'positions' in lensEntry ? lensEntry : null;
        if (layer.partgroup.includes('Glasses') && lensTemplate) {
          const lensMat = new THREE.MeshPhysicalMaterial({
            color: tintColor.clone().lerp(new THREE.Color('#bde0fe'), 0.45),
            transparent: true,
            opacity: 0.36,
            roughness: 0.12,
            metalness: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const lensMesh = buildTemplateSkinnedMesh(
            bodyMesh,
            gender,
            layer.partgroup,
            lensTemplate,
            catId,
            globalLayerCounter + 1,
            {},
            lensMat,
            item.id
          );
          lensMesh.renderOrder = itemRenderOrder + 1;
          lensMesh.name = `Clothes_${catId}_${item.rawId}_Lens`;
          clothesRoot.add(lensMesh);
        }
      } else if (map) {
        const overlayMesh = buildBodyOverlaySkinnedMesh(
          bodyMesh,
          catId,
          globalLayerCounter,
          layer.blendShapes || {},
          mat
        );
        overlayMesh.renderOrder = itemRenderOrder;
        overlayMesh.name = `ClothesOverlay_${catId}_${item.rawId}_L${lIdx}`;
        clothesRoot.add(overlayMesh);
      }

      globalLayerCounter++;
    }
  }

  const maskedIndexAttr = updateBodyMeshCoverageMask(
    bodyMesh,
    activePartGroups,
    hasActiveShoes
  );
  if (maskedIndexAttr) {
    for (const child of clothesRoot.children) {
      if (
        child instanceof THREE.SkinnedMesh &&
        child.name.startsWith('ClothesOverlay_')
      ) {
        child.geometry.setIndex(maskedIndexAttr.clone());
      }
    }
  }

  resolveVrmPlatformCollision(vrm, vrm.scene.parent?.parent || vrm.scene, 0);

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__clothesDebug = {
      gender,
      report: () => debugReportClothes(vrm, bodyMesh, clothesRoot, gender),
    };
  }

  return clothesRoot;
}

// DEV-only diagnostic: reports real skinned (rendered) vertex heights of clothes vs body neck/chin
function debugReportClothes(
  vrm: VRM,
  bodyMesh: THREE.SkinnedMesh,
  clothesRoot: THREE.Group,
  gender: PlayerGender
) {
  const v = new THREE.Vector3();
  const toBodyLocal = (mesh: THREE.Object3D, p: THREE.Vector3) =>
    bodyMesh.worldToLocal(mesh.localToWorld(p));
  vrm.scene.updateMatrixWorld(true);
  const bonePos = (name: string) => {
    const b = bodyMesh.skeleton.getBoneByName(name);
    if (!b) return null;
    const p = bodyMesh.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
    return [+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4)];
  };
  let chinY = Infinity;
  vrm.scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && /face/i.test(m.name)) {
      const pa = m.geometry.getAttribute('position');
      for (let i = 0; i < pa.count; i++) {
        m.getVertexPosition(i, v);
        const y = toBodyLocal(m, v).y;
        if (y < chinY) chinY = y;
      }
    }
  });
  const meshes: unknown[] = [];
  clothesRoot.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const pa = m.geometry.getAttribute('position');
    const uv = m.geometry.getAttribute('uv');
    let bindMaxY = -Infinity;
    const top: Array<[number, number, number, number, number, number]> = [];
    for (let i = 0; i < pa.count; i++) {
      bindMaxY = Math.max(bindMaxY, pa.getY(i));
      m.getVertexPosition(i, v);
      const p = toBodyLocal(m, v);
      if (Math.abs(p.x) < 0.2 && p.y > 1.2) {
        top.push([
          +p.x.toFixed(4),
          +p.y.toFixed(4),
          +p.z.toFixed(4),
          uv ? +uv.getX(i).toFixed(4) : 0,
          uv ? +uv.getY(i).toFixed(4) : 0,
          i,
        ]);
      }
    }
    top.sort((a, b) => b[1] - a[1]);
    meshes.push({ name: m.name, verts: pa.count, bindMaxY: +bindMaxY.toFixed(4), top: top.slice(0, 60) });
  });
  return {
    gender,
    chinY: +chinY.toFixed(4),
    neck: bonePos('J_Bip_C_Neck'),
    head: bonePos('J_Bip_C_Head'),
    shoulderL: bonePos('J_Bip_L_Shoulder'),
    meshes,
  };
}

interface SoleProbeGroup {
  mesh: THREE.SkinnedMesh;
  indices: number[];
}

const _soleProbeCache = new WeakMap<THREE.Object3D, SoleProbeGroup[]>();
const _soleProbeVec = new THREE.Vector3();

function collectMeshSoleProbes(
  mesh: THREE.SkinnedMesh,
  bandMeters: number,
  regionFilter?: (vi: number) => boolean
): number[] {
  const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!posAttr) return [];

  const indexAttr = mesh.geometry.getIndex();
  const vertSet = new Set<number>();
  if (indexAttr) {
    const arr = indexAttr.array;
    for (let i = 0; i < arr.length; i++) {
      const vi = arr[i];
      if (!regionFilter || regionFilter(vi)) vertSet.add(vi);
    }
  } else {
    for (let vi = 0; vi < posAttr.count; vi++) {
      if (!regionFilter || regionFilter(vi)) vertSet.add(vi);
    }
  }

  let minY = Infinity;
  for (const vi of vertSet) {
    const y = posAttr.getY(vi);
    if (y < minY) minY = y;
  }
  if (!Number.isFinite(minY)) return [];

  const cutoff = minY + bandMeters;
  const indices: number[] = [];
  for (const vi of vertSet) {
    if (posAttr.getY(vi) <= cutoff) {
      indices.push(vi);
    }
  }
  return indices;
}

function getOrBuildSoleProbes(vrm: VRM): SoleProbeGroup[] {
  const cached = _soleProbeCache.get(vrm.scene);
  if (cached) return cached;

  const groups: SoleProbeGroup[] = [];
  const clothesRoot = vrm.scene.getObjectByName('PlayerCustomClothesRoot');
  if (clothesRoot) {
    clothesRoot.traverse((obj) => {
      if (
        obj instanceof THREE.SkinnedMesh &&
        obj.visible &&
        obj.name.startsWith('Clothes_shoes_')
      ) {
        const indices = collectMeshSoleProbes(obj, 0.025);
        if (indices.length > 0) {
          groups.push({ mesh: obj, indices });
        }
      }
    });
  }

  if (groups.length === 0) {
    const bodyMesh = findBodySkinnedMesh(vrm);
    if (bodyMesh) {
      const surface = getCachedBodySurfaceData(bodyMesh);
      const indices = collectMeshSoleProbes(
        bodyMesh,
        0.018,
        (vi) => surface.regions[vi] === 'foot_l' || surface.regions[vi] === 'foot_r'
      );
      if (indices.length > 0) {
        groups.push({ mesh: bodyMesh, indices });
      }
    }
  }

  _soleProbeCache.set(vrm.scene, groups);
  return groups;
}

/**
 * Resolves vertical collision between the live posed VRM feet/shoes and the platform top plane
 * relative to `rootToUpdate`'s world Y origin. Keeps the lowest skinned sole/foot vertex flush
 * with `floorOffsetY` above `rootToUpdate` so the character never sinks into or floats above
 * the pedestal (or ground) across shoe types and idle animations.
 */
export function resolveVrmPlatformCollision(
  vrm: VRM,
  rootToUpdate: THREE.Object3D,
  floorOffsetY = 0.0005
): void {
  rootToUpdate.updateMatrixWorld(true);
  const probes = getOrBuildSoleProbes(vrm);
  if (probes.length === 0) return;

  let minWorldY = Infinity;
  for (let g = 0; g < probes.length; g++) {
    const { mesh, indices } = probes[g];
    const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!posAttr) continue;
    for (let k = 0; k < indices.length; k++) {
      const vi = indices[k];
      _soleProbeVec.fromBufferAttribute(posAttr, vi);
      mesh.applyBoneTransform(vi, _soleProbeVec);
      _soleProbeVec.applyMatrix4(mesh.matrixWorld);
      if (_soleProbeVec.y < minWorldY) {
        minWorldY = _soleProbeVec.y;
      }
    }
  }

  if (Number.isFinite(minWorldY)) {
    const rootWorldY = rootToUpdate.matrixWorld.elements[13];
    const targetWorldY = rootWorldY + floorOffsetY;
    vrm.scene.position.y += targetWorldY - minWorldY;
    rootToUpdate.updateMatrixWorld(true);
  }
}
