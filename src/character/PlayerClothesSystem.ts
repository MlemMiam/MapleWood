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

const CATEGORY_CLEARANCE_METERS: Record<ClothesCategoryId, number> = {
  socks: 0.0022,
  arm: 0.0026,
  bottom: 0.0038,
  top: 0.0048,
  dress: 0.0052,
  neck: 0.0062,
  shoes: 0.0038,
  glasses: 0.0005,
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
  x: number,
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
    return y < 0.008 * femScale || z < -0.036 * femScale;
  }
  if (shoeMode === 'ballet') {
    const isSideLower =
      Math.abs(Math.abs(x) - footXAbs) > 0.022 * femScale && y < footY * 0.45;
    return (
      y < footY * 0.36 ||
      z < -0.042 * femScale ||
      z > 0.058 * femScale ||
      isSideLower
    );
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
    const xPull = (shoeMode === 'ballet' ? 0.008 : 0.006) * femScale;
    const yDrop = shoeMode === 'closed' ? 0.004 * femScale : 0.018 * femScale;
    const yFloorClamp = shoeMode === 'heel' ? -0.048 * femScale : 0.002 * femScale;

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
  material: THREE.Material
): THREE.SkinnedMesh {
  const surface = getCachedBodySurfaceData(baseBodyMesh);
  const { boneNameMap, dstBoneBindPos } = surface;
  const fallbackBoneIdx = boneNameMap.get('J_Bip_C_Hips') ?? 0;

  const vertCount = Math.floor(template.positions.length / 3);
  const workPos = Float32Array.from(template.positions);

  // 1. Apply official VRoid BlendShapes (.Male when gender === 'male' + item blendShapes)
  const combinedBS: Record<string, number> = {
    ...(gender === 'male' ? { Male: 100 } : {}),
    ...blendShapeWeights,
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

    for (let v = 0; v < vertCount; v++) {
      posArr[v * 3] = workPos[v * 3];
      posArr[v * 3 + 1] = workPos[v * 3 + 1] + dyGlasses;
      posArr[v * 3 + 2] = workPos[v * 3 + 2] + dzGlasses;
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
          if (ndot >= -0.15 && signedDist < minClearance) {
            const push = minClearance - signedDist;
            posArr[i * 3] += nx * push;
            posArr[i * 3 + 1] += ny * push;
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

      const mat = new THREE.MeshToonMaterial({
        map,
        color: tintColor,
        gradientMap,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1 - globalLayerCounter * 0.5,
        polygonOffsetUnits: -2 - globalLayerCounter,
      });

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
          mat
        );
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
            lensMat
          );
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

  return clothesRoot;
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
