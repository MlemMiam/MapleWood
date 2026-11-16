import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  EYEBROW_COLOR_PRESETS,
  EYE_COLOR_PRESETS,
  HAIR_CATEGORIES_META as HAIR_CATEGORIES,
  HAIR_COLOR_PRESETS,
  SKIN_COLOR_PRESETS,
  type BaseScalpMeshData,
  type HairCatalogData,
  type HairCategoryId,
  type PlayerGender,
  type PlayerHairSelection,
  applyHairSelectionToVrm,
  loadBaseScalpMeshData,
  loadHairCatalog,
  loadPlayerVrmBuffer,
} from '../character/PlayerHairSystem';
import {
  CLOTHES_CATEGORIES,
  CLOTHES_COLOR_SWATCHES,
  DEFAULT_PLAYER_DISPLAY_OPTIONS,
  type ClothesCatalogData,
  type ClothesCategoryId,
  type ClothesTemplatesBundle,
  type PlayerClothesSelection,
  type PlayerDisplayOptions,
  type ClothingColorZone,
  type ClothingPatternType,
  type ClothingPatternConfig,
  applyClothesSelectionToVrm,
  getDefaultClothesSelection,
  loadClothesCatalog,
  loadClothesTemplates,
  resolveVrmPlatformCollision,
} from '../character/PlayerClothesSystem';
import {
  type FlorieVRMController,
  parseFlorieVrmFromBuffer,
} from '../character/FlorieVRM';

export type CustomizationStep = 'genderChoice' | 'customization';
export type StudioTabMode = 'hair' | 'clothes' | 'face';
export type FaceTraitCategoryId = 'skin' | 'eyes' | 'eyebrows';
export type CameraFramingPreset = 'head' | 'torso' | 'legs' | 'feet' | 'full';

interface PlayerCustomizationModalProps {
  step: CustomizationStep;
  initialGender: PlayerGender;
  initialSelection: PlayerHairSelection;
  initialClothesSelection: PlayerClothesSelection;
  initialDisplayOptions?: PlayerDisplayOptions;
  onSelectGender: (gender: PlayerGender) => void;
  onConfirmCustomization: (
    gender: PlayerGender,
    hairSelection: PlayerHairSelection,
    clothesSelection: PlayerClothesSelection,
    displayOptions: PlayerDisplayOptions
  ) => void;
  onBackToGender?: () => void;
  onPlayHover?: () => void;
  onPlayClick?: () => void;
  onPlayConfirm?: () => void;
  onPlayClothEquip?: () => void;
  onPlayAccessoryEquip?: () => void;
  onPlayColorSwatch?: () => void;
  onStartMusic?: () => void;
  onStopMusic?: () => void;
}

const CAMERA_FRAMING_CONFIG: Record<
  CameraFramingPreset,
  { label: string; targetYFem: number; targetYMale: number; dist: number; pitch: number }
> = {
  full: {
    label: 'Corps entier',
    targetYFem: 0.88,
    targetYMale: 0.94,
    dist: 2.15,
    pitch: 0.04,
  },
  head: {
    label: 'Visage & Coiffure',
    targetYFem: 1.43,
    targetYMale: 1.52,
    dist: 0.72,
    pitch: 0.05,
  },
  torso: {
    label: 'Buste & Haut',
    targetYFem: 1.15,
    targetYMale: 1.22,
    dist: 1.15,
    pitch: 0.04,
  },
  legs: {
    label: 'Bas & Jambes',
    targetYFem: 0.65,
    targetYMale: 0.7,
    dist: 1.35,
    pitch: 0.05,
  },
  feet: {
    label: 'Chaussures',
    targetYFem: 0.22,
    targetYMale: 0.24,
    dist: 0.95,
    pitch: 0.12,
  },
};

// ============================================================================
// CUSTOM HAND-CRAFTED SVG ICONS (NO EMOJIS)
// ============================================================================

const SvgIcon: React.FC<{
  size?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ size = 16, children, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

const IconFemale: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <SvgIcon size={size}>
    <circle cx="12" cy="9" r="5.5" />
    <path d="M12 14.5V21" />
    <path d="M9 18H15" />
  </SvgIcon>
);

const IconMale: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <SvgIcon size={size}>
    <circle cx="10" cy="14" r="5.5" />
    <path d="M14 10L20 4" />
    <path d="M15 4H20V9" />
  </SvgIcon>
);

const IconHanger: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <SvgIcon size={size}>
    <path d="M12 7a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 9.5 4" />
    <path d="M12 7v2L3.6 14.6A2 2 0 0 0 4.7 18h14.6a2 2 0 0 0 1.1-3.4L12 9" />
  </SvgIcon>
);

const IconScissors: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <SvgIcon size={size}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4L8.12 15.88" />
    <path d="M14.47 14.48L20 20" />
    <path d="M8.12 8.12L12 12" />
  </SvgIcon>
);

const IconPalette: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <SvgIcon size={size}>
    <path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.6-.2-1.1-.6-1.5-.4-.4-.6-.9-.6-1.5a2.5 2.5 0 0 1 2.5-2.5H17a5 5 0 0 0 5-5c0-3.9-4.5-7-10-7Z" />
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
  </SvgIcon>
);

const IconSparkles: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <SvgIcon size={size}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
  </SvgIcon>
);

const IconRotate360: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <SvgIcon size={size}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </SvgIcon>
);

const IconChevronDown: React.FC<{ size?: number; open?: boolean }> = ({
  size = 15,
  open = false,
}) => (
  <SvgIcon
    size={size}
    style={{
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.18s ease',
    }}
  >
    <path d="m6 9 6 6 6-6" />
  </SvgIcon>
);

const IconArrowLeft: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <SvgIcon size={size}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </SvgIcon>
);

const IconArrowRight: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <SvgIcon size={size}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </SvgIcon>
);

const IconCheck: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <SvgIcon size={size}>
    <path d="M20 6 9 17l-5-5" />
  </SvgIcon>
);

const IconClose: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <SvgIcon size={size}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </SvgIcon>
);

const IconLayers: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <SvgIcon size={size}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </SvgIcon>
);

const IconCameraFrame: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <SvgIcon size={size}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2" />
    <path d="M4 16v2a2 2 0 0 0 2 2h2" />
    <path d="M16 4h2a2 2 0 0 1 2 2v2" />
    <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
    <circle cx="12" cy="12" r="3" />
  </SvgIcon>
);

const ClothesCategorySvgIcon: React.FC<{
  category: ClothesCategoryId;
  size?: number;
}> = ({ category, size = 16 }) => {
  switch (category) {
    case 'top':
      return (
        <SvgIcon size={size}>
          <path d="M8.5 3h7l4.5 4.5-2.5 3-2-1.5V20H8.5V9l-2 1.5-2.5-3L8.5 3Z" />
        </SvgIcon>
      );
    case 'bottom':
      return (
        <SvgIcon size={size}>
          <path d="M6 3h12l1.5 18h-5l-2.5-10-2.5 10h-5L6 3Z" />
        </SvgIcon>
      );
    case 'dress':
      return (
        <SvgIcon size={size}>
          <path d="M9 3h6l1.5 5-2 2.5L19 21H5l4.5-10.5-2-2.5L9 3Z" />
        </SvgIcon>
      );
    case 'socks':
      return (
        <SvgIcon size={size}>
          <path d="M10 3h5v9.5a3.5 3.5 0 0 1-1.5 2.9L9.5 18A2.8 2.8 0 0 1 6 14.5l4-2.5V3Z" />
        </SvgIcon>
      );
    case 'shoes':
      return (
        <SvgIcon size={size}>
          <path d="M3 16.5V12l4-4 3.5 3.5 5.5 1.5a4 4 0 0 1 4 4v1.5H3Z" />
        </SvgIcon>
      );
    case 'arm':
      return (
        <SvgIcon size={size}>
          <path d="M8 12V6a1.5 1.5 0 0 1 3 0v4" />
          <path d="M11 5a1.5 1.5 0 0 1 3 0v5" />
          <path d="M14 6.5a1.5 1.5 0 0 1 3 0v7.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-3a1.5 1.5 0 0 1 3 0" />
        </SvgIcon>
      );
    case 'neck':
      return (
        <SvgIcon size={size}>
          <path d="M9 4h6l-1.5 3.5L15.5 17 12 20l-3.5-3 2-9.5L9 4Z" />
        </SvgIcon>
      );
      case 'glasses':
      return (
        <SvgIcon size={size}>
          <circle cx="6.5" cy="13.5" r="3.5" />
          <circle cx="17.5" cy="13.5" r="3.5" />
          <path d="M10 13.5h4" />
          <path d="M3 12 5 7" />
          <path d="M21 12 19 7" />
        </SvgIcon>
      );
  }
};

const IconFace: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <SvgIcon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 10h.01" />
    <path d="M15 10h.01" />
    <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
  </SvgIcon>
);

const FaceTraitSvgIcon: React.FC<{
  category: FaceTraitCategoryId;
  size?: number;
}> = ({ category, size = 15 }) => {
  switch (category) {
    case 'skin':
      return (
        <SvgIcon size={size}>
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </SvgIcon>
      );
    case 'eyes':
      return (
        <SvgIcon size={size}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" />
        </SvgIcon>
      );
    case 'eyebrows':
      return (
        <SvgIcon size={size}>
          <path d="M4 11c2.5-3 6.5-3.5 10-1.5" />
          <path d="M14 9.5c2 .8 4 2 6 3.5" />
          <circle cx="11" cy="15" r="2" />
        </SvgIcon>
      );
  }
};

const FACE_TRAIT_CATEGORIES: Array<{
  id: FaceTraitCategoryId;
  label: string;
  shortLabel: string;
  subtitle: string;
}> = [
  {
    id: 'skin',
    label: 'Teint de la Peau',
    shortLabel: 'Peau',
    subtitle: 'Personnalisez la carnation du visage et du corps',
  },
  {
    id: 'eyes',
    label: 'Couleur des Yeux',
    shortLabel: 'Yeux',
    subtitle: "Choisissez la teinte de l'iris du personnage",
  },
  {
    id: 'eyebrows',
    label: 'Couleur des Sourcils',
    shortLabel: 'Sourcils',
    subtitle: 'Harmonisez les sourcils avec la coiffure ou créez un contraste',
  },
];

export const PlayerCustomizationModal: React.FC<PlayerCustomizationModalProps> = ({
  step,
  initialGender,
  initialSelection,
  initialClothesSelection,
  initialDisplayOptions = DEFAULT_PLAYER_DISPLAY_OPTIONS,
  onSelectGender,
  onConfirmCustomization,
  onBackToGender,
  onPlayHover,
  onPlayClick,
  onPlayConfirm,
  onPlayClothEquip,
  onPlayAccessoryEquip,
  onPlayColorSwatch,
  onStartMusic,
  onStopMusic,
}) => {
  const [selectedGender, setSelectedGender] = useState<PlayerGender>(initialGender);
  const [studioMode, setStudioMode] = useState<StudioTabMode>('clothes');
  const [selection, setSelection] = useState<PlayerHairSelection>(() => {
    const removedIds = new Set([
      'Front1',
      'Front6',
      'Front7',
      'Front8',
      'Back10',
      'Ex2',
      'Ex3',
      'Ex10',
      'Ex11',
      'Ex13',
    ]);
    return {
      ...initialSelection,
      skinColorHex: initialSelection.skinColorHex || '#ffffff',
      eyebrowColorHex: initialSelection.eyebrowColorHex || '#ffffff',
      eyeColorHex: initialSelection.eyeColorHex || '#ffffff',
      front: removedIds.has(initialSelection.front || '')
        ? 'Front2'
        : initialSelection.front,
      back: removedIds.has(initialSelection.back || '')
        ? 'Back1'
        : initialSelection.back,
      ex: removedIds.has(initialSelection.ex || '')
        ? null
        : initialSelection.ex,
    };
  });
  const [clothesSelection, setClothesSelection] =
    useState<PlayerClothesSelection>(initialClothesSelection);
  const [displayOptions, setDisplayOptions] =
    useState<PlayerDisplayOptions>(initialDisplayOptions);

  const [activeCategory, setActiveCategory] = useState<HairCategoryId>('front');
  const [activeClothesCategory, setActiveClothesCategory] =
    useState<ClothesCategoryId>('top');
  const [activeFaceCategory, setActiveFaceCategory] =
    useState<FaceTraitCategoryId>('skin');
  const [cameraFraming, setCameraFraming] = useState<CameraFramingPreset>('full');

  const [activeClothingZone, setActiveClothingZone] =
    useState<ClothingColorZone>('main');
  const [clothingColorTab, setClothingColorTab] =
    useState<'color' | 'pattern'>('color');

  // Dropdown states ("menus déroulants")
  const [openDropdown, setOpenDropdown] = useState<
    'none' | 'colors' | 'layers' | 'camera'
  >('none');

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [hoveredClothesItemId, setHoveredClothesItemId] = useState<string | null>(null);
  const [autoDemoActive, setAutoDemoActive] = useState<boolean>(false);
  const [demoItemId, setDemoItemId] = useState<string | null>(null);

  const [loading3D, setLoading3D] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<FlorieVRMController | null>(null);
  const hairCatalogRef = useRef<HairCatalogData | null>(null);
  const baseScalpRef = useRef<BaseScalpMeshData | null>(null);
  const clothesCatalogRef = useRef<ClothesCatalogData | null>(null);
  const clothesTemplatesRef = useRef<ClothesTemplatesBundle | null>(null);

  const targetYawRef = useRef<number>(0.18);
  const currentYawRef = useRef<number>(0.18);
  const targetPitchRef = useRef<number>(0.04);
  const currentPitchRef = useRef<number>(0.04);
  const targetZoomRef = useRef<number>(2.15);
  const currentZoomRef = useRef<number>(2.15);
  const targetLookYRef = useRef<number>(0.88);
  const currentLookYRef = useRef<number>(0.88);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);

  const selectionReactTimerRef = useRef<number>(0);
  const displayOptionsRef = useRef<PlayerDisplayOptions>(displayOptions);
  displayOptionsRef.current = displayOptions;
  const hairSelectionRef = useRef<PlayerHairSelection>(selection);
  hairSelectionRef.current = selection;
  const clothesSelectionRef = useRef<PlayerClothesSelection>(clothesSelection);
  clothesSelectionRef.current = clothesSelection;

  const [colorAllClothes, setColorAllClothes] = useState<boolean>(false);

  const onStartMusicRef = useRef(onStartMusic);
  const onStopMusicRef = useRef(onStopMusic);
  onStartMusicRef.current = onStartMusic;
  onStopMusicRef.current = onStopMusic;

  useEffect(() => {
    onStartMusicRef.current?.();
    return () => {
      onStopMusicRef.current?.();
    };
  }, []);

  useEffect(() => {
    setSelectedGender(initialGender);
  }, [initialGender]);

  const triggerSelectionReaction = () => {
    selectionReactTimerRef.current = 2.4;
  };

  const applyFraming = (
    preset: CameraFramingPreset,
    gender: PlayerGender = selectedGender,
    customYaw?: number,
    customPitch?: number
  ) => {
    setCameraFraming(preset);
    const cfg = CAMERA_FRAMING_CONFIG[preset];
    targetLookYRef.current = gender === 'male' ? cfg.targetYMale : cfg.targetYFem;
    targetZoomRef.current = cfg.dist;
    if (customYaw !== undefined) targetYawRef.current = customYaw;
    if (customPitch !== undefined) targetPitchRef.current = customPitch;
    else targetPitchRef.current = cfg.pitch;
  };

  const visibleClothesCategories = useMemo(
    () =>
      CLOTHES_CATEGORIES.filter(
        (cat) => !(cat.femaleOnly && selectedGender === 'male')
      ),
    [selectedGender]
  );

  useEffect(() => {
    if (selectedGender === 'male' && activeClothesCategory === 'dress') {
      setActiveClothesCategory('top');
    }
  }, [selectedGender, activeClothesCategory]);

  useEffect(() => {
    if (step !== 'customization' || !autoDemoActive || studioMode !== 'hair') {
      setDemoItemId(null);
      return;
    }
    const catMeta = HAIR_CATEGORIES.find((c) => c.id === activeCategory);
    if (!catMeta || catMeta.items.length === 0) return;

    let idx = 0;
    setDemoItemId(catMeta.items[0].id);
    const timer = window.setInterval(() => {
      idx = (idx + 1) % catMeta.items.length;
      setDemoItemId(catMeta.items[idx].id);
    }, 850);

    return () => window.clearInterval(timer);
  }, [step, autoDemoActive, activeCategory, studioMode]);

  // Setup Three.js 3D Studio Viewport
  useEffect(() => {
    if (step !== 'customization') return;
    const containerEl = mountRef.current;
    if (!containerEl) return;

    let disposed = false;
    let animFrameId = 0;
    setLoading3D(true);
    setLoadError(null);

    const width = containerEl.clientWidth || 520;
    const height = containerEl.clientHeight || 640;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.05, 25);

    const initFraming = CAMERA_FRAMING_CONFIG[cameraFraming];
    const initLookY =
      selectedGender === 'male' ? initFraming.targetYMale : initFraming.targetYFem;
    targetLookYRef.current = initLookY;
    currentLookYRef.current = initLookY;
    targetZoomRef.current = initFraming.dist;
    currentZoomRef.current = initFraming.dist;
    camera.position.set(0, initLookY + 0.03, initFraming.dist);
    camera.lookAt(0, initLookY, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerEl.innerHTML = '';
    containerEl.appendChild(renderer.domElement);

    // Natural, color-faithful lighting matching in-game daylight (no pink/magenta color cast)
    const hemiLight = new THREE.HemisphereLight(0xf1f5f9, 0x475569, 0.60);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 0.82);
    keyLight.position.set(1.8, 2.8, 2.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.28);
    rimLight.position.set(-1.8, 2.2, -1.8);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.38);
    fillLight.position.set(-1.4, 1.4, 1.8);
    scene.add(fillLight);

    // Crisp white & rose pedestal
    const pedestalGeo = new THREE.CylinderGeometry(0.52, 0.58, 0.04, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xfff5f7,
      roughness: 0.4,
      metalness: 0.06,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -0.02, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const ringGeo = new THREE.RingGeometry(0.46, 0.5, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe11d48,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0.002, 0);
    scene.add(ringMesh);

    const label = selectedGender === 'male' ? 'MalePlayer.vrm' : 'FemPlayer.vrm';

    Promise.all([
      loadPlayerVrmBuffer(selectedGender),
      loadHairCatalog(),
      loadBaseScalpMeshData(),
      loadClothesCatalog(),
      loadClothesTemplates(),
    ])
      .then(
        async ([
          playerBuffer,
          hairCatalog,
          baseScalp,
          clothesCatalog,
          clothesTemplates,
        ]) => {
          if (disposed) return;
          hairCatalogRef.current = hairCatalog;
          baseScalpRef.current = baseScalp;
          clothesCatalogRef.current = clothesCatalog;
          clothesTemplatesRef.current = clothesTemplates;

          const controller = await parseFlorieVrmFromBuffer(
            playerBuffer.slice(0),
            label
          );
          if (disposed) return;

          controllerRef.current = controller;
          controller.container.rotation.y = Math.PI + currentYawRef.current;
          scene.add(controller.container);

          if (controller.vrm) {
            const hairRoot = applyHairSelectionToVrm(
              controller.vrm,
              hairSelectionRef.current,
              hairCatalog,
              baseScalp
            );
            if (hairRoot) {
              hairRoot.visible = displayOptionsRef.current.showHair;
            }
            applyClothesSelectionToVrm(
              controller.vrm,
              selectedGender,
              clothesSelectionRef.current,
              clothesCatalog,
              clothesTemplates,
              displayOptionsRef.current
            );
            resolveVrmPlatformCollision(
              controller.vrm,
              controller.container,
              0.0005
            );
          }
          setLoading3D(false);
          triggerSelectionReaction();
        }
      )
      .catch((err) => {
        if (disposed) return;
        console.error('3D Studio load error:', err);
        setLoadError(err instanceof Error ? err.message : 'Erreur de chargement 3D');
        setLoading3D(false);
      });

    const handleResize = () => {
      if (!containerEl || disposed) return;
      const w = containerEl.clientWidth || 520;
      const h = containerEl.clientHeight || 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    const animate = () => {
      if (disposed) return;
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      const opts = displayOptionsRef.current;
      if ((autoDemoActive || opts.turntableAutoSpin) && !isDraggingRef.current) {
        targetYawRef.current += dt * 0.55;
      }

      const damp = 1 - Math.exp(-10.5 * dt);
      currentYawRef.current += (targetYawRef.current - currentYawRef.current) * damp;
      currentPitchRef.current +=
        (targetPitchRef.current - currentPitchRef.current) * damp;
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * damp;
      currentLookYRef.current +=
        (targetLookYRef.current - currentLookYRef.current) * damp;

      if (selectionReactTimerRef.current > 0) {
        selectionReactTimerRef.current = Math.max(
          0,
          selectionReactTimerRef.current - dt
        );
      }

      const ctrl = controllerRef.current;
      if (ctrl) {
        ctrl.container.rotation.y = Math.PI + currentYawRef.current;
        ctrl.setCutsceneOverride?.({
          pose: 'none',
          expression: 'none',
          headGesture: 'none',
          blush: 0,
          time: 0,
        });
        ctrl.update('idle', 0, 0, dt);
        if (ctrl.vrm) {
          resolveVrmPlatformCollision(ctrl.vrm, ctrl.container, 0.0005);
        }
      }

      const lookY = currentLookYRef.current;
      const camY = lookY + Math.sin(currentPitchRef.current) * currentZoomRef.current;
      const camZ = Math.cos(currentPitchRef.current) * currentZoomRef.current;
      camera.position.set(0, camY, camZ);
      camera.lookAt(0, lookY, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedGender]);

  useEffect(() => {
    const ctrl = controllerRef.current;
    const catalog = hairCatalogRef.current;
    const baseScalp = baseScalpRef.current;
    if (!ctrl?.vrm || !catalog || !baseScalp) return;

    const previewItem = hoveredItemId ?? demoItemId;
    const override = previewItem
      ? { category: activeCategory, itemId: previewItem }
      : undefined;

    const hairRoot = applyHairSelectionToVrm(
      ctrl.vrm,
      selection,
      catalog,
      baseScalp,
      override
    );
    if (hairRoot) {
      hairRoot.visible = displayOptions.showHair;
    }
  }, [
    selection,
    hoveredItemId,
    demoItemId,
    activeCategory,
    displayOptions.showHair,
    loading3D,
  ]);

  useEffect(() => {
    const ctrl = controllerRef.current;
    const clothesCatalog = clothesCatalogRef.current;
    const clothesTemplates = clothesTemplatesRef.current;
    if (!ctrl?.vrm || !clothesCatalog || !clothesTemplates) return;

    const override = hoveredClothesItemId
      ? { [activeClothesCategory]: hoveredClothesItemId }
      : undefined;

    applyClothesSelectionToVrm(
      ctrl.vrm,
      selectedGender,
      clothesSelection,
      clothesCatalog,
      clothesTemplates,
      displayOptions,
      activeClothesCategory,
      override
    );
    resolveVrmPlatformCollision(ctrl.vrm, ctrl.container, 0.0005);
  }, [
    clothesSelection,
    hoveredClothesItemId,
    activeClothesCategory,
    selectedGender,
    displayOptions,
    loading3D,
  ]);

  const activeHairCatMeta = useMemo(
    () => HAIR_CATEGORIES.find((c) => c.id === activeCategory) || HAIR_CATEGORIES[1],
    [activeCategory]
  );

  const activeClothesCatMeta = useMemo(
    () =>
      CLOTHES_CATEGORIES.find((c) => c.id === activeClothesCategory) ||
      CLOTHES_CATEGORIES[0],
    [activeClothesCategory]
  );

  const currentClothesItems = useMemo(() => {
    const numCounts: Record<PlayerGender, Record<ClothesCategoryId, number>> = {
      female: {
        top: 8,
        bottom: 12,
        dress: 9,
        socks: 8,
        shoes: 7,
        arm: 6,
        neck: 4,
        glasses: 2,
      },
      male: {
        top: 5,
        bottom: 7,
        dress: 0,
        socks: 6,
        shoes: 5,
        arm: 8,
        neck: 4,
        glasses: 2,
      },
    };
    const prefixMap: Record<ClothesCategoryId, string> = {
      top: 'Top',
      bottom: 'Bottom',
      dress: 'Dress',
      socks: 'Socks',
      shoes: 'Shoes',
      arm: 'Arm',
      neck: 'Neck',
      glasses: 'Glasses',
    };
    const excludedIds: Record<PlayerGender, Set<string>> = {
      female: new Set(['Dress4', 'Arm5', 'Arm6']),
      male: new Set(['Arm7', 'Arm8']),
    };
    const excluded = excludedIds[selectedGender];
    const count = numCounts[selectedGender][activeClothesCategory] || 0;
    const prefix = prefixMap[activeClothesCategory];
    return Array.from({ length: count }, (_, idx) => {
      const n = idx + 1;
      const rawId = `${prefix}${n}`;
      return {
        id: `${selectedGender}_${rawId}`,
        rawId,
        name: `${activeClothesCatMeta.shortLabel} #${n}`,
        badge: rawId,
        thumbnail: `/assets/player/clothes/thumbnails/${selectedGender}/${rawId}.png`,
      };
    }).filter((item) => !excluded.has(item.rawId));
  }, [selectedGender, activeClothesCategory, activeClothesCatMeta]);

  const handleSelectHairCategory = (catId: HairCategoryId) => {
    onPlayClick?.();
    setStudioMode('hair');
    setActiveCategory(catId);
    setHoveredItemId(null);
    setOpenDropdown('none');
    const meta = HAIR_CATEGORIES.find((c) => c.id === catId);
    if (meta) {
      applyFraming('head', selectedGender, meta.defaultCameraYaw, meta.defaultCameraPitch);
    }
  };

  const handleSelectClothesCategory = (catId: ClothesCategoryId) => {
    onPlayClick?.();
    setStudioMode('clothes');
    setActiveClothesCategory(catId);
    setHoveredClothesItemId(null);
    setOpenDropdown('none');
    const meta = CLOTHES_CATEGORIES.find((c) => c.id === catId);
    if (meta) {
      applyFraming(
        meta.cameraPreset,
        selectedGender,
        meta.defaultCameraYaw,
        meta.defaultCameraPitch
      );
    }
  };

  const handleSelectHairItem = (catId: HairCategoryId, itemId: string | null) => {
    onPlayAccessoryEquip ? onPlayAccessoryEquip() : onPlayClick?.();
    setAutoDemoActive(false);
    setSelection((prev) => ({
      ...prev,
      [catId]: itemId,
    }));
    triggerSelectionReaction();
  };

  const handleSelectClothesItem = (
    catId: ClothesCategoryId,
    itemId: string | null
  ) => {
    if (catId === 'glasses' || catId === 'neck') {
      onPlayAccessoryEquip ? onPlayAccessoryEquip() : onPlayClick?.();
    } else {
      onPlayClothEquip ? onPlayClothEquip() : onPlayClick?.();
    }
    setClothesSelection((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [catId]: itemId,
      },
    }));
    triggerSelectionReaction();
  };

  const handleSelectClothesColor = (
    catId: ClothesCategoryId,
    hex: string,
    applyToAll = colorAllClothes,
    zone: ClothingColorZone = activeClothingZone
  ) => {
    onPlayColorSwatch ? onPlayColorSwatch() : onPlayClick?.();
    setClothesSelection((prev) => {
      const prevZones = prev.zoneColors || {};
      const catZones = { ...(prevZones[catId] || {}) };
      if (applyToAll) {
        return {
          ...prev,
          colors: {
            top: hex,
            bottom: hex,
            dress: hex,
            socks: hex,
            shoes: hex,
            arm: hex,
            neck: hex,
            glasses: hex,
          },
          zoneColors: {
            ...prevZones,
            top: { main: hex, sleeves: hex, collar: hex, belt: hex },
            bottom: { main: hex, belt: hex },
            dress: { main: hex, sleeves: hex, collar: hex, belt: hex },
          },
        };
      }
      if (zone === 'main') {
        catZones.main = hex;
        return {
          ...prev,
          colors: {
            ...prev.colors,
            [catId]: hex,
          },
          zoneColors: {
            ...prevZones,
            [catId]: catZones,
          },
        };
      }
      catZones[zone] = hex;
      return {
        ...prev,
        zoneColors: {
          ...prevZones,
          [catId]: catZones,
        },
      };
    });
    triggerSelectionReaction();
  };

  const handleSelectClothesPattern = (
    catId: ClothesCategoryId,
    config: ClothingPatternConfig
  ) => {
    onPlayClick?.();
    setClothesSelection((prev) => ({
      ...prev,
      patterns: {
        ...(prev.patterns || {}),
        [catId]: config,
      },
    }));
    triggerSelectionReaction();
  };

  const handleClearAllClothes = () => {
    onPlayClick?.();
    setClothesSelection({
      items: {
        top: null,
        bottom: null,
        dress: null,
        socks: null,
        shoes: null,
        arm: null,
        neck: null,
        glasses: null,
      },
      colors: { ...clothesSelection.colors },
    });
    setOpenDropdown('none');
    triggerSelectionReaction();
  };

  const handleSwitchGenderInStudio = (newGender: PlayerGender) => {
    if (newGender === selectedGender) return;
    onPlayClick?.();
    setSelectedGender(newGender);
    const defaultForGender = getDefaultClothesSelection(newGender);
    setClothesSelection((prev) => ({
      items: { ...defaultForGender.items },
      colors: { ...prev.colors },
    }));
    setOpenDropdown('none');
    applyFraming('full', newGender, 0.18, 0.04);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    const dy = e.clientY - dragStartYRef.current;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;

    targetYawRef.current += dx * 0.011;
    targetPitchRef.current = Math.max(
      -0.35,
      Math.min(0.48, targetPitchRef.current + dy * 0.007)
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const zoomStep = e.deltaY * 0.0014 * Math.max(0.65, targetZoomRef.current * 0.55);
    targetZoomRef.current = Math.max(
      0.42,
      Math.min(3.40, targetZoomRef.current + zoomStep)
    );
  };

  // ============================================================================
  // STEP 1: GENDER CHOICE SCREEN (RED, PINK & WHITE THEME)
  // ============================================================================
  if (step === 'genderChoice') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background:
            'radial-gradient(circle at 50% 25%, rgba(255, 240, 245, 0.85) 0%, rgba(45, 10, 22, 0.78) 100%)',
          backdropFilter: 'blur(12px)',
          fontFamily: '"Quicksand", "Nunito", "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: 'min(860px, 95vw)',
            background: '#ffffff',
            borderRadius: 28,
            border: '2px solid #fecdd3',
            boxShadow: '0 24px 64px rgba(136, 19, 55, 0.25)',
            padding: '34px 38px',
            color: '#2d1219',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 14px',
                borderRadius: 999,
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              <IconSparkles size={14} />
              <span>Création du Protagoniste</span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(24px, 3vw, 34px)',
                fontWeight: 900,
                color: '#881337',
              }}
            >
              Choisis ton Genre
            </h1>
            <p
              style={{
                margin: '6px auto 0',
                maxWidth: 560,
                fontSize: 14,
                color: '#9f1239',
                opacity: 0.85,
                lineHeight: 1.5,
                fontWeight: 600,
              }}
            >
              Sélectionne ton modèle de base pour accéder au studio de coiffure et
              de vêtements.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: 18,
            }}
          >
            {/* FEMALE CARD */}
            <button
              type="button"
              onMouseEnter={() => onPlayHover?.()}
              onClick={() => {
                onPlayClick?.();
                if (selectedGender !== 'female') {
                  const def = getDefaultClothesSelection('female');
                  setClothesSelection((prev) => ({
                    items: { ...def.items },
                    colors: { ...prev.colors },
                  }));
                }
                setSelectedGender('female');
              }}
              style={{
                textAlign: 'left',
                padding: 24,
                borderRadius: 22,
                cursor: 'pointer',
                border:
                  selectedGender === 'female'
                    ? '2.5px solid #e11d48'
                    : '1.5px solid #fecdd3',
                background:
                  selectedGender === 'female'
                    ? 'linear-gradient(160deg, #ffffff 0%, #fff1f2 100%)'
                    : '#ffffff',
                boxShadow:
                  selectedGender === 'female'
                    ? '0 14px 32px rgba(225, 29, 72, 0.16)'
                    : '0 4px 12px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.18s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background:
                      selectedGender === 'female' ? '#e11d48' : '#fff1f2',
                    color: selectedGender === 'female' ? '#ffffff' : '#e11d48',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconFemale size={24} />
                </div>
                <span
                  style={{
                    padding: '4px 11px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    background:
                      selectedGender === 'female' ? '#e11d48' : '#fff1f2',
                    color: selectedGender === 'female' ? '#ffffff' : '#be123c',
                  }}
                >
                  {selectedGender === 'female' ? 'Sélectionné' : 'FemPlayer.vrm'}
                </span>
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#881337',
                  marginBottom: 4,
                }}
              >
                Féminin
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#6b2135',
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                56 vêtements féminins (hauts, jupes, robes, accessoires) et 45
                coiffures cumulables.
              </p>
            </button>

            {/* MALE CARD */}
            <button
              type="button"
              onMouseEnter={() => onPlayHover?.()}
              onClick={() => {
                onPlayClick?.();
                if (selectedGender !== 'male') {
                  const def = getDefaultClothesSelection('male');
                  setClothesSelection((prev) => ({
                    items: { ...def.items },
                    colors: { ...prev.colors },
                  }));
                }
                setSelectedGender('male');
              }}
              style={{
                textAlign: 'left',
                padding: 24,
                borderRadius: 22,
                cursor: 'pointer',
                border:
                  selectedGender === 'male'
                    ? '2.5px solid #e11d48'
                    : '1.5px solid #fecdd3',
                background:
                  selectedGender === 'male'
                    ? 'linear-gradient(160deg, #ffffff 0%, #fff1f2 100%)'
                    : '#ffffff',
                boxShadow:
                  selectedGender === 'male'
                    ? '0 14px 32px rgba(225, 29, 72, 0.16)'
                    : '0 4px 12px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.18s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: selectedGender === 'male' ? '#e11d48' : '#fff1f2',
                    color: selectedGender === 'male' ? '#ffffff' : '#e11d48',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconMale size={24} />
                </div>
                <span
                  style={{
                    padding: '4px 11px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    background: selectedGender === 'male' ? '#e11d48' : '#fff1f2',
                    color: selectedGender === 'male' ? '#ffffff' : '#be123c',
                  }}
                >
                  {selectedGender === 'male' ? 'Sélectionné' : 'MalePlayer.vrm'}
                </span>
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#881337',
                  marginBottom: 4,
                }}
              >
                Masculin
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#6b2135',
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                37 vêtements masculins (vestes, chemises, pantalons, accessoires) et
                45 coiffures cumulables.
              </p>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onMouseEnter={() => onPlayHover?.()}
              onClick={() => {
                onPlayConfirm?.();
                onSelectGender(selectedGender);
              }}
              style={{
                padding: '14px 34px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 800,
                boxShadow: '0 10px 24px rgba(225, 29, 72, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>Continuer vers le Studio</span>
              <IconArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STEP 2: SIMPLIFIED RED, PINK & WHITE 3D STUDIO WITH DROPDOWN MENUS
  // ============================================================================
  const activeCategorySelection = selection[activeCategory] as string | null;
  const activeClothesEquippedId = clothesSelection.items[activeClothesCategory];
  const activeClothingZoneHex =
    clothesSelection.zoneColors?.[activeClothesCategory]?.[activeClothingZone] ||
    clothesSelection.colors[activeClothesCategory] ||
    '#ffffff';
  const activeClothesColorHex =
    activeClothingZone !== 'main'
      ? activeClothingZoneHex
      : clothesSelection.colors[activeClothesCategory] || '#ffffff';

  const activeFaceCatMeta =
    FACE_TRAIT_CATEGORIES.find((c) => c.id === activeFaceCategory) ||
    FACE_TRAIT_CATEGORIES[0];

  const activeFaceColorHex =
    activeFaceCategory === 'skin'
      ? selection.skinColorHex || '#ffffff'
      : activeFaceCategory === 'eyes'
        ? selection.eyeColorHex || '#ffffff'
        : selection.eyebrowColorHex || '#ffffff';

  const currentActiveColorHex =
    studioMode === 'hair'
      ? selection.colorHex
      : studioMode === 'face'
        ? activeFaceColorHex
        : activeClothesColorHex;

  const activeColorPresets =
    studioMode === 'hair'
      ? HAIR_COLOR_PRESETS
      : studioMode === 'face'
        ? activeFaceCategory === 'skin'
          ? SKIN_COLOR_PRESETS
          : activeFaceCategory === 'eyes'
            ? EYE_COLOR_PRESETS
            : EYEBROW_COLOR_PRESETS
        : CLOTHES_COLOR_SWATCHES;

  const resolveSwatchPreviewBg = (
    hex: string,
    presets: ReadonlyArray<{ hex: string; swatch?: string }>
  ) => {
    const match = presets.find(
      (p) => p.hex.toLowerCase() === hex.toLowerCase()
    );
    return match && 'swatch' in match && typeof match.swatch === 'string'
      ? match.swatch
      : hex;
  };

  const currentActiveSwatchDisplayBg = resolveSwatchPreviewBg(
    currentActiveColorHex,
    activeColorPresets
  );

  const handleSelectFaceTraitColor = (
    trait: FaceTraitCategoryId,
    hex: string
  ) => {
    onPlayColorSwatch ? onPlayColorSwatch() : onPlayClick?.();
    setSelection((prev) => ({
      ...prev,
      ...(trait === 'skin'
        ? { skinColorHex: hex }
        : trait === 'eyes'
          ? { eyeColorHex: hex }
          : { eyebrowColorHex: hex }),
    }));
    triggerSelectionReaction();
  };

  const equippedClothesList = visibleClothesCategories.filter(
    (cat) => Boolean(clothesSelection.items[cat.id])
  );
  const equippedCount = equippedClothesList.length;

  const toggleDropdown = (menu: 'colors' | 'layers' | 'camera') => {
    onPlayClick?.();
    setOpenDropdown((prev) => (prev === menu ? 'none' : menu));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px 18px',
        background:
          'radial-gradient(circle at 30% 30%, rgba(255, 240, 244, 0.72) 0%, rgba(38, 9, 19, 0.82) 100%)',
        backdropFilter: 'blur(12px)',
        fontFamily: '"Quicksand", "Nunito", "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: 'min(1280px, 97vw)',
          height: 'min(820px, 93vh)',
          background: '#ffffff',
          borderRadius: 28,
          border: '2px solid #fecdd3',
          boxShadow: '0 28px 72px rgba(136, 19, 55, 0.28)',
          display: 'grid',
          gridTemplateColumns: 'minmax(350px, 41%) 1fr',
          overflow: 'hidden',
          color: '#2d1219',
        }}
      >
        {/* LEFT COLUMN: 3D VIEWPORT */}
        <div
          style={{
            position: 'relative',
            background:
              'radial-gradient(circle at 50% 38%, #ffffff 0%, #fff0f3 58%, #ffe0e7 100%)',
            borderRight: '1.5px solid #fecdd3',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            userSelect: 'none',
          }}
        >
          {/* Top Viewport Controls */}
          <div
            style={{
              position: 'relative',
              zIndex: 6,
              padding: '14px 16px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {onBackToGender && (
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick?.();
                    onBackToGender();
                  }}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 999,
                    border: '1.5px solid #fecdd3',
                    background: '#ffffff',
                    color: '#be123c',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <IconArrowLeft size={14} />
                  <span>Genre</span>
                </button>
              )}

              {/* Gender Pill Switch */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#ffffff',
                  borderRadius: 999,
                  padding: 3,
                  border: '1.5px solid #fecdd3',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSwitchGenderInStudio('female')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background:
                      selectedGender === 'female' ? '#e11d48' : 'transparent',
                    color: selectedGender === 'female' ? '#ffffff' : '#9f1239',
                  }}
                >
                  <IconFemale size={13} />
                  <span>Femme</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchGenderInStudio('male')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background:
                      selectedGender === 'male' ? '#e11d48' : 'transparent',
                    color: selectedGender === 'male' ? '#ffffff' : '#9f1239',
                  }}
                >
                  <IconMale size={13} />
                  <span>Homme</span>
                </button>
              </div>
            </div>
          </div>

          {/* Three.js Canvas */}
          <div
            ref={mountRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            style={{
              position: 'absolute',
              inset: 0,
              cursor: 'grab',
            }}
          />

          {loading3D && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 245, 247, 0.72)',
                zIndex: 4,
              }}
            >
              <div
                style={{
                  padding: '10px 20px',
                  borderRadius: 999,
                  background: '#ffffff',
                  border: '1.5px solid #f43f5e',
                  fontWeight: 800,
                  color: '#be123c',
                  fontSize: 13,
                }}
              >
                Chargement du modèle 3D...
              </div>
            </div>
          )}

          {loadError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                zIndex: 4,
              }}
            >
              <div
                style={{
                  background: '#fff1f2',
                  border: '2px solid #f43f5e',
                  padding: 16,
                  borderRadius: 16,
                  color: '#9f1239',
                  fontWeight: 700,
                }}
              >
                {loadError}
              </div>
            </div>
          )}

          {/* Bottom Viewport Controls: Camera Dropdown + 360 Spin */}
          <div
            style={{
              position: 'relative',
              zIndex: 6,
              padding: '0 16px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            {/* Camera Framing Dropdown Menu */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => toggleDropdown('camera')}
                style={{
                  padding: '7px 13px',
                  borderRadius: 999,
                  border: '1.5px solid #fecdd3',
                  background: '#ffffff',
                  color: '#881337',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)',
                }}
              >
                <IconCameraFrame size={14} />
                <span>Vue : {CAMERA_FRAMING_CONFIG[cameraFraming].label}</span>
                <IconChevronDown size={14} open={openDropdown === 'camera'} />
              </button>

              {openDropdown === 'camera' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: 0,
                    minWidth: 190,
                    background: '#ffffff',
                    borderRadius: 16,
                    border: '1.5px solid #fecdd3',
                    boxShadow: '0 12px 28px rgba(136, 19, 55, 0.18)',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {(
                    ['full', 'head', 'torso', 'legs', 'feet'] as CameraFramingPreset[]
                  ).map((preset) => {
                    const active = cameraFraming === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          onPlayClick?.();
                          applyFraming(preset, selectedGender);
                          setOpenDropdown('none');
                        }}
                        style={{
                          padding: '7px 11px',
                          borderRadius: 10,
                          border: 'none',
                          background: active ? '#fff1f2' : 'transparent',
                          color: active ? '#e11d48' : '#2d1219',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{CAMERA_FRAMING_CONFIG[preset].label}</span>
                        {active && <IconCheck size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onPlayClick?.();
                setDisplayOptions((prev) => ({
                  ...prev,
                  turntableAutoSpin: !prev.turntableAutoSpin,
                }));
              }}
              style={{
                padding: '7px 13px',
                borderRadius: 999,
                border: displayOptions.turntableAutoSpin
                  ? '1.5px solid #e11d48'
                  : '1.5px solid #fecdd3',
                background: displayOptions.turntableAutoSpin
                  ? '#e11d48'
                  : '#ffffff',
                color: displayOptions.turntableAutoSpin ? '#ffffff' : '#881337',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <IconRotate360 size={14} />
              <span>Rotation 360°</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: STREAMLINED RED/PINK/WHITE STUDIO */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          {/* COMPACT HEADER: Mode Switcher + Dropdown Menus (Looks, Couleur, Équipés) */}
          <div
            style={{
              padding: '14px 22px 12px',
              borderBottom: '1.5px solid #ffe4e6',
              background: '#fff5f7',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              position: 'relative',
              zIndex: 50,
            }}
          >
            {/* Row 1: Mode Switcher + Dropdown Triggers */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              {/* Main Mode Tabs (Vêtements / Coiffure / Display) */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#ffffff',
                  padding: 4,
                  borderRadius: 14,
                  border: '1.5px solid #fecdd3',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onPlayClick?.();
                    setStudioMode('clothes');
                    setOpenDropdown('none');
                    applyFraming('full', selectedGender);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background:
                      studioMode === 'clothes' ? '#e11d48' : 'transparent',
                    color: studioMode === 'clothes' ? '#ffffff' : '#881337',
                  }}
                >
                  <IconHanger size={15} />
                  <span>Vêtements</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPlayClick?.();
                    setStudioMode('hair');
                    setOpenDropdown('none');
                    applyFraming('head', selectedGender, 0, 0.05);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: studioMode === 'hair' ? '#e11d48' : 'transparent',
                    color: studioMode === 'hair' ? '#ffffff' : '#881337',
                  }}
                >
                  <IconScissors size={15} />
                  <span>Coiffure</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPlayClick?.();
                    setStudioMode('face');
                    setOpenDropdown('none');
                    applyFraming('head', selectedGender, 0, 0.05);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: studioMode === 'face' ? '#e11d48' : 'transparent',
                    color: studioMode === 'face' ? '#ffffff' : '#881337',
                  }}
                >
                  <IconFace size={15} />
                  <span>Visage & Peau</span>
                </button>
              </div>

              {/* COLOR DROPDOWN MENU (Centralized / Left-aligned, opens clearly towards right) */}
              <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => toggleDropdown('colors')}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 12,
                        border:
                          openDropdown === 'colors'
                            ? '1.5px solid #e11d48'
                            : '1.5px solid #fecdd3',
                        background: '#ffffff',
                        color: '#881337',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <IconPalette size={15} />
                      <span>
                        Couleur (
                        {studioMode === 'hair'
                          ? 'Cheveux'
                          : studioMode === 'face'
                            ? activeFaceCatMeta.shortLabel
                            : activeClothesCatMeta.shortLabel}
                        )
                      </span>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: currentActiveSwatchDisplayBg,
                          border: '1.5px solid rgba(136, 19, 55, 0.35)',
                        }}
                      />
                      <IconChevronDown
                        size={14}
                        open={openDropdown === 'colors'}
                      />
                    </button>

                    {openDropdown === 'colors' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          left: 0,
                          width: 320,
                          maxWidth: 'calc(100vw - 48px)',
                          background: '#ffffff',
                          borderRadius: 18,
                          border: '1.5px solid #fecdd3',
                          boxShadow: '0 20px 48px rgba(136, 19, 55, 0.22)',
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          zIndex: 100,
                        }}
                      >
                        {studioMode === 'clothes' && (
                          <div
                            style={{
                              display: 'flex',
                              borderRadius: 10,
                              background: '#fff1f2',
                              padding: 2,
                              gap: 2,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setClothingColorTab('color')}
                              style={{
                                flex: 1,
                                padding: '5px 8px',
                                borderRadius: 8,
                                border: 'none',
                                background:
                                  clothingColorTab === 'color' ? '#e11d48' : 'transparent',
                                color: clothingColorTab === 'color' ? '#ffffff' : '#881337',
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              🎨 Teintes & Zones
                            </button>
                            <button
                              type="button"
                              onClick={() => setClothingColorTab('pattern')}
                              style={{
                                flex: 1,
                                padding: '5px 8px',
                                borderRadius: 8,
                                border: 'none',
                                background:
                                  clothingColorTab === 'pattern' ? '#e11d48' : 'transparent',
                                color: clothingColorTab === 'pattern' ? '#ffffff' : '#881337',
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              ✨ Motifs & Tissus
                            </button>
                          </div>
                        )}

                        {studioMode === 'clothes' && clothingColorTab === 'pattern' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#881337' }}>
                              Motif pour {activeClothesCatMeta.shortLabel} :
                            </span>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 6,
                                maxHeight: 180,
                                overflowY: 'auto',
                                paddingRight: 2,
                              }}
                            >
                              {[
                                { id: 'none' as const, label: 'Uni', desc: 'Sans motif', icon: '⚪' },
                                { id: 'dots' as const, label: 'Pois', desc: 'Petits pois', icon: '🔴' },
                                { id: 'stripes' as const, label: 'Rayures', desc: 'Fines rayures', icon: '💈' },
                                { id: 'plaid' as const, label: 'Carreaux', desc: 'Tartan classique', icon: '🏁' },
                                { id: 'wool' as const, label: 'Laine', desc: 'Maille tricotée', icon: '🧶' },
                                { id: 'cotton' as const, label: 'Coton', desc: 'Tissage lin/coton', icon: '🧵' },
                                { id: 'denim' as const, label: 'Denim', desc: 'Toile de jean', icon: '👖' },
                              ].map((pat) => {
                                const currentPat =
                                  clothesSelection.patterns?.[activeClothesCategory]?.type || 'none';
                                const isSel = currentPat === pat.id;
                                return (
                                  <button
                                    key={pat.id}
                                    type="button"
                                    onClick={() => {
                                      const oldCfg = (clothesSelection.patterns?.[activeClothesCategory] ||
                                        {}) as Partial<ClothingPatternConfig>;
                                      handleSelectClothesPattern(activeClothesCategory, {
                                        type: pat.id,
                                        color: oldCfg.color || '#ffffff',
                                        scale: oldCfg.scale || 1.0,
                                        opacity: oldCfg.opacity !== undefined ? oldCfg.opacity : 0.85,
                                      });
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '6px 8px',
                                      borderRadius: 10,
                                      border: isSel
                                        ? '1.5px solid #e11d48'
                                        : '1px solid #fecdd3',
                                      background: isSel ? '#fff1f2' : '#ffffff',
                                      color: isSel ? '#881337' : '#475569',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span style={{ fontSize: 16 }}>{pat.icon}</span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: 11, fontWeight: 800 }}>
                                        {pat.label}
                                      </span>
                                      <span style={{ fontSize: 9.5, opacity: 0.75 }}>
                                        {pat.desc}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {clothesSelection.patterns?.[activeClothesCategory]?.type &&
                              clothesSelection.patterns[activeClothesCategory]!.type !== 'none' && (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                    paddingTop: 6,
                                    borderTop: '1px solid #fecdd3',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <span
                                      style={{ fontSize: 10.5, fontWeight: 800, color: '#881337' }}
                                    >
                                      Couleur du motif :
                                    </span>
                                    <input
                                      type="color"
                                      value={
                                        clothesSelection.patterns[activeClothesCategory]?.color ||
                                        '#ffffff'
                                      }
                                      onChange={(e) => {
                                        const oldCfg = (clothesSelection.patterns?.[activeClothesCategory] ||
                                          {}) as Partial<ClothingPatternConfig>;
                                        handleSelectClothesPattern(activeClothesCategory, {
                                          ...oldCfg,
                                          type: oldCfg.type || 'dots',
                                          color: e.target.value,
                                        });
                                      }}
                                      style={{
                                        width: 22,
                                        height: 22,
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                      }}
                                    />
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 4,
                                    }}
                                  >
                                    <span
                                      style={{ fontSize: 10.5, fontWeight: 800, color: '#881337' }}
                                    >
                                      Échelle :
                                    </span>
                                    <div style={{ display: 'flex', gap: 3 }}>
                                      {[
                                        { label: 'Fin', val: 0.7 },
                                        { label: 'Moyen', val: 1.0 },
                                        { label: 'Grand', val: 1.5 },
                                      ].map((sc) => {
                                        const curScale =
                                          clothesSelection.patterns?.[activeClothesCategory]?.scale ||
                                          1.0;
                                        const isCur = Math.abs(curScale - sc.val) < 0.1;
                                        return (
                                          <button
                                            key={sc.label}
                                            type="button"
                                            onClick={() => {
                                              const oldCfg = (clothesSelection.patterns?.[activeClothesCategory] ||
                                                {}) as Partial<ClothingPatternConfig>;
                                              handleSelectClothesPattern(activeClothesCategory, {
                                                ...oldCfg,
                                                type: oldCfg.type || 'dots',
                                                scale: sc.val,
                                              });
                                            }}
                                            style={{
                                              padding: '2px 7px',
                                              borderRadius: 6,
                                              border: isCur
                                                ? '1px solid #e11d48'
                                                : '1px solid #fecdd3',
                                              background: isCur ? '#e11d48' : '#fff1f2',
                                              color: isCur ? '#ffffff' : '#881337',
                                              fontSize: 9.5,
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {sc.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: '#881337',
                                }}
                              >
                                Teinte :{' '}
                                {studioMode === 'hair'
                                  ? 'Cheveux'
                                  : studioMode === 'face'
                                    ? activeFaceCatMeta.shortLabel
                                    : colorAllClothes
                                      ? 'Toute la tenue'
                                      : activeClothesCatMeta.shortLabel}
                              </span>
                              {studioMode === 'clothes' && (
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onPlayClick?.();
                                      setColorAllClothes((prev) => !prev);
                                    }}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 999,
                                      border: colorAllClothes
                                        ? '1px solid #e11d48'
                                        : '1px solid #fecdd3',
                                      background: colorAllClothes ? '#e11d48' : '#fff1f2',
                                      color: colorAllClothes ? '#ffffff' : '#be123c',
                                      fontSize: 10.5,
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Toute la tenue
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectClothesColor(
                                        activeClothesCategory,
                                        '#ffffff',
                                        colorAllClothes,
                                        activeClothingZone
                                      )
                                    }
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 999,
                                      border: '1px solid #fecdd3',
                                      background: '#fff1f2',
                                      color: '#be123c',
                                      fontSize: 10.5,
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Original
                                  </button>
                                </div>
                              )}
                              {studioMode === 'face' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSelectFaceTraitColor(
                                      activeFaceCategory,
                                      '#ffffff'
                                    )
                                  }
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 999,
                                    border: '1px solid #fecdd3',
                                    background: '#fff1f2',
                                    color: '#be123c',
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Original
                                </button>
                              )}
                            </div>

                            {studioMode === 'clothes' && !colorAllClothes && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 4,
                                  padding: '4px 0',
                                }}
                              >
                                {[
                                  { id: 'main' as const, label: '👕 Corps' },
                                  ...((activeClothesCategory === 'top' || activeClothesCategory === 'dress')
                                    ? [
                                        { id: 'sleeves' as const, label: '🦾 Manches' },
                                        { id: 'collar' as const, label: '👔 Col' },
                                        { id: 'belt' as const, label: '🎗️ Ceinture' },
                                      ]
                                    : activeClothesCategory === 'bottom'
                                      ? [{ id: 'belt' as const, label: '🎗️ Ceinture' }]
                                      : []),
                                ].map((z) => {
                                  const isZActive = activeClothingZone === z.id;
                                  return (
                                    <button
                                      key={z.id}
                                      type="button"
                                      onClick={() => setActiveClothingZone(z.id)}
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: 8,
                                        border: isZActive
                                          ? '1.5px solid #e11d48'
                                          : '1px solid #fecdd3',
                                        background: isZActive ? '#fff1f2' : '#ffffff',
                                        color: isZActive ? '#881337' : '#64748b',
                                        fontSize: 10.5,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {z.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: 7,
                                justifyItems: 'center',
                                maxHeight: 180,
                                overflowY: 'auto',
                                padding: '4px 2px',
                              }}
                            >
                              {activeColorPresets.map((swatch) => {
                                const isSelected =
                                  currentActiveColorHex.toLowerCase() ===
                                  swatch.hex.toLowerCase();
                                const previewBg =
                                  'swatch' in swatch && typeof swatch.swatch === 'string'
                                    ? swatch.swatch
                                    : swatch.hex;
                                return (
                                  <button
                                    key={`${swatch.name}_${swatch.hex}`}
                                    type="button"
                                    title={swatch.name}
                                    onClick={() => {
                                      if (studioMode === 'hair') {
                                        onPlayColorSwatch
                                          ? onPlayColorSwatch()
                                          : onPlayClick?.();
                                        setSelection((prev) => ({
                                          ...prev,
                                          colorHex: swatch.hex,
                                        }));
                                        triggerSelectionReaction();
                                      } else if (studioMode === 'face') {
                                        handleSelectFaceTraitColor(
                                          activeFaceCategory,
                                          swatch.hex
                                        );
                                      } else {
                                        handleSelectClothesColor(
                                          activeClothesCategory,
                                          swatch.hex,
                                          colorAllClothes,
                                          activeClothingZone
                                        );
                                      }
                                    }}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '50%',
                                      background: previewBg,
                                      border: isSelected
                                        ? '3px solid #e11d48'
                                        : '1.5px solid rgba(136, 19, 55, 0.25)',
                                      cursor: 'pointer',
                                    }}
                                  />
                                );
                              })}
                            </div>

                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: 10,
                                background: '#fff1f2',
                                border: '1px solid #fecdd3',
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: '#881337',
                                cursor: 'pointer',
                              }}
                            >
                              <span>Couleur personnalisée</span>
                              <input
                                type="color"
                                value={currentActiveColorHex}
                                onChange={(e) => {
                                  if (studioMode === 'hair') {
                                    onPlayColorSwatch
                                      ? onPlayColorSwatch()
                                      : onPlayClick?.();
                                    setSelection((prev) => ({
                                      ...prev,
                                      colorHex: e.target.value,
                                    }));
                                  } else if (studioMode === 'face') {
                                    handleSelectFaceTraitColor(
                                      activeFaceCategory,
                                      e.target.value
                                    );
                                  } else {
                                    handleSelectClothesColor(
                                      activeClothesCategory,
                                      e.target.value,
                                      colorAllClothes,
                                      activeClothingZone
                                    );
                                  }
                                }}
                                style={{
                                  width: 24,
                                  height: 24,
                                  border: 'none',
                                  padding: 0,
                                  background: 'transparent',
                                  cursor: 'pointer',
                                }}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2) EQUIPPED LAYERS DROPDOWN MENU (Clothes mode, on the right) */}
                  {studioMode === 'clothes' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 8,
                        marginLeft: 'auto',
                        position: 'relative',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => toggleDropdown('layers')}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 12,
                          border:
                            openDropdown === 'layers'
                              ? '1.5px solid #e11d48'
                              : '1.5px solid #fecdd3',
                          background: '#ffffff',
                          color: '#881337',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <IconLayers size={14} />
                        <span>Équipés ({equippedCount})</span>
                        <IconChevronDown
                          size={14}
                          open={openDropdown === 'layers'}
                        />
                      </button>

                      {openDropdown === 'layers' && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            right: 0,
                            width: 235,
                            background: '#ffffff',
                            borderRadius: 16,
                            border: '1.5px solid #fecdd3',
                            boxShadow: '0 16px 36px rgba(136, 19, 55, 0.2)',
                            padding: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            zIndex: 40,
                          }}
                        >
                          {equippedClothesList.length === 0 ? (
                            <div
                              style={{
                                padding: 10,
                                fontSize: 12,
                                color: '#9f1239',
                                textAlign: 'center',
                                fontWeight: 600,
                              }}
                            >
                              Aucun vêtement équipé
                            </div>
                          ) : (
                            equippedClothesList.map((cat) => {
                              const eqId = clothesSelection.items[cat.id]!;
                              const shortId = eqId.replace(
                                `${selectedGender}_`,
                                ''
                              );
                              const col =
                                clothesSelection.colors[cat.id] || '#ffffff';
                              return (
                                <div
                                  key={cat.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '6px 9px',
                                    borderRadius: 10,
                                    background: '#fff5f7',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: '#881337',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectClothesCategory(cat.id)
                                    }
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#881337',
                                      fontWeight: 800,
                                      fontSize: 12,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: 0,
                                    }}
                                  >
                                    <ClothesCategorySvgIcon
                                      category={cat.id}
                                      size={14}
                                    />
                                    <span>{shortId}</span>
                                    <span
                                      style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: col,
                                        border:
                                          '1px solid rgba(136,19,55,0.3)',
                                      }}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectClothesItem(cat.id, null)
                                    }
                                    title="Retirer"
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#e11d48',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      padding: 2,
                                    }}
                                  >
                                    <IconClose size={13} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                          {equippedClothesList.length > 0 && (
                            <>
                              <div
                                style={{
                                  height: 1,
                                  background: '#ffe4e6',
                                  margin: '3px 0',
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleClearAllClothes}
                                style={{
                                  padding: '7px 10px',
                                  borderRadius: 10,
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#be123c',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <IconClose size={13} />
                                <span>Tout retirer</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            {/* Row 2: Category Pills (with custom SVG icons) */}
            {studioMode === 'clothes' && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingBottom: 2,
                }}
              >
                {visibleClothesCategories.map((cat) => {
                  const isActive = activeClothesCategory === cat.id;
                  const isEquipped = Boolean(clothesSelection.items[cat.id]);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectClothesCategory(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 11,
                        border: isActive
                          ? '1.5px solid #e11d48'
                          : '1.5px solid #fecdd3',
                        background: isActive ? '#e11d48' : '#ffffff',
                        color: isActive ? '#ffffff' : '#881337',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ClothesCategorySvgIcon category={cat.id} size={14} />
                      <span>{cat.shortLabel}</span>
                      {isEquipped && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isActive ? '#ffffff' : '#e11d48',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {studioMode === 'hair' && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingBottom: 2,
                }}
              >
                {HAIR_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const equippedVal = selection[cat.id] as string | null;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectHairCategory(cat.id)}
                      style={{
                        padding: '6px 13px',
                        borderRadius: 11,
                        border: isActive
                          ? '1.5px solid #e11d48'
                          : '1.5px solid #fecdd3',
                        background: isActive ? '#e11d48' : '#ffffff',
                        color: isActive ? '#ffffff' : '#881337',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{cat.label}</span>
                      {equippedVal && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isActive ? '#ffffff' : '#e11d48',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {studioMode === 'face' && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingBottom: 2,
                }}
              >
                {FACE_TRAIT_CATEGORIES.map((cat) => {
                  const isActive = activeFaceCategory === cat.id;
                  const traitHex =
                    cat.id === 'skin'
                      ? selection.skinColorHex || '#ffffff'
                      : cat.id === 'eyes'
                        ? selection.eyeColorHex || '#ffffff'
                        : selection.eyebrowColorHex || '#ffffff';
                  const traitPresets =
                    cat.id === 'skin'
                      ? SKIN_COLOR_PRESETS
                      : cat.id === 'eyes'
                        ? EYE_COLOR_PRESETS
                        : EYEBROW_COLOR_PRESETS;
                  const dotBg = resolveSwatchPreviewBg(traitHex, traitPresets);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onPlayClick?.();
                        setActiveFaceCategory(cat.id);
                        setOpenDropdown('none');
                        applyFraming('head', selectedGender, 0, 0.05);
                      }}
                      style={{
                        padding: '6px 13px',
                        borderRadius: 11,
                        border: isActive
                          ? '1.5px solid #e11d48'
                          : '1.5px solid #fecdd3',
                        background: isActive ? '#e11d48' : '#ffffff',
                        color: isActive ? '#ffffff' : '#881337',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <FaceTraitSvgIcon category={cat.id} size={14} />
                      <span>{cat.label}</span>
                      <span
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: dotBg,
                          border: isActive
                            ? '1.5px solid #ffffff'
                            : '1.5px solid rgba(136, 19, 55, 0.35)',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* MAIN SCROLLABLE CATALOG GRID                                     */}
          {/* ================================================================ */}
          {studioMode === 'clothes' && (
            <div
              onClick={() => {
                if (openDropdown !== 'none') setOpenDropdown('none');
              }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 22px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                {/* "Aucun" card (omitted for mandatory slots: top, bottom, shoes) */}
                {activeClothesCategory !== 'top' &&
                  activeClothesCategory !== 'bottom' &&
                  activeClothesCategory !== 'shoes' && (
                  <button
                  type="button"
                  onMouseEnter={() => {
                    onPlayHover?.();
                    setHoveredClothesItemId(null);
                  }}
                  onClick={() =>
                    handleSelectClothesItem(activeClothesCategory, null)
                  }
                  style={{
                    borderRadius: 16,
                    padding: 10,
                    cursor: 'pointer',
                    border:
                      activeClothesEquippedId === null
                        ? '2.5px solid #e11d48'
                        : '1.5px solid #ffe4e6',
                    background:
                      activeClothesEquippedId === null ? '#fff1f2' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 148,
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#ffe4e6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#e11d48',
                    }}
                  >
                    <IconClose size={18} />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#881337',
                    }}
                  >
                    Aucun
                  </div>
                </button>
                )}

                {currentClothesItems.map((item) => {
                  const isSelected = activeClothesEquippedId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => {
                        onPlayHover?.();
                        setHoveredClothesItemId(item.id);
                      }}
                      onMouseLeave={() => setHoveredClothesItemId(null)}
                      onClick={() =>
                        handleSelectClothesItem(activeClothesCategory, item.id)
                      }
                      style={{
                        borderRadius: 16,
                        padding: 8,
                        cursor: 'pointer',
                        border: isSelected
                          ? '2.5px solid #e11d48'
                          : '1.5px solid #ffe4e6',
                        background: isSelected ? '#fff1f2' : '#ffffff',
                        boxShadow: isSelected
                          ? '0 8px 18px rgba(225, 29, 72, 0.14)'
                          : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 11,
                          overflow: 'hidden',
                          background: '#fff5f7',
                        }}
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: '#2d1219',
                        }}
                      >
                        {item.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {studioMode === 'hair' && (
            <div
              onClick={() => {
                if (openDropdown !== 'none') setOpenDropdown('none');
              }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 22px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(126px, 1fr))',
                  gap: 12,
                }}
              >
                {activeHairCatMeta.allowNone && (
                  <button
                    type="button"
                    onMouseEnter={() => {
                      onPlayHover?.();
                      setHoveredItemId(null);
                    }}
                    onClick={() => handleSelectHairItem(activeCategory, null)}
                    style={{
                      borderRadius: 16,
                      padding: 10,
                      cursor: 'pointer',
                      border:
                        activeCategorySelection === null
                          ? '2.5px solid #e11d48'
                          : '1.5px solid #ffe4e6',
                      background:
                        activeCategorySelection === null ? '#fff1f2' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 148,
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#ffe4e6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#e11d48',
                      }}
                    >
                      <IconClose size={18} />
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#881337',
                      }}
                    >
                      Aucun
                    </div>
                  </button>
                )}

                {activeHairCatMeta.items.map((item) => {
                  const isSelected = activeCategorySelection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => {
                        onPlayHover?.();
                        setHoveredItemId(item.id);
                      }}
                      onMouseLeave={() => setHoveredItemId(null)}
                      onClick={() =>
                        handleSelectHairItem(activeCategory, item.id)
                      }
                      style={{
                        borderRadius: 16,
                        padding: 8,
                        cursor: 'pointer',
                        border: isSelected
                          ? '2.5px solid #e11d48'
                          : '1.5px solid #ffe4e6',
                        background: isSelected ? '#fff1f2' : '#ffffff',
                        boxShadow: isSelected
                          ? '0 8px 18px rgba(225, 29, 72, 0.14)'
                          : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 11,
                          overflow: 'hidden',
                          background: '#fff5f7',
                        }}
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: '#2d1219',
                          textAlign: 'center',
                        }}
                      >
                        {item.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {studioMode === 'face' && (
            <div
              onClick={() => {
                if (openDropdown !== 'none') setOpenDropdown('none');
              }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Action & Info Header for Active Face Trait */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: '#fff5f7',
                  border: '1.5px solid #ffe4e6',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 900,
                      color: '#881337',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <FaceTraitSvgIcon category={activeFaceCategory} size={15} />
                    <span>{activeFaceCatMeta.label}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#9f1239',
                    }}
                  >
                    {activeFaceCatMeta.subtitle}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {activeFaceCategory === 'eyebrows' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectFaceTraitColor(
                          'eyebrows',
                          selection.colorHex || '#ffffff'
                        )
                      }
                      style={{
                        padding: '6px 11px',
                        borderRadius: 999,
                        border: '1.5px solid #fecdd3',
                        background: '#ffffff',
                        color: '#be123c',
                        fontSize: 11.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <IconScissors size={13} />
                      <span>Assortir aux cheveux</span>
                    </button>
                  )}

                  <label
                    style={{
                      padding: '5px 11px',
                      borderRadius: 999,
                      border: '1.5px solid #fecdd3',
                      background: '#ffffff',
                      color: '#881337',
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <span>Nuancier libre</span>
                    <input
                      type="color"
                      value={activeFaceColorHex}
                      onChange={(e) =>
                        handleSelectFaceTraitColor(
                          activeFaceCategory,
                          e.target.value
                        )
                      }
                      style={{
                        width: 20,
                        height: 20,
                        border: 'none',
                        padding: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectFaceTraitColor(activeFaceCategory, '#ffffff')
                    }
                    style={{
                      padding: '6px 11px',
                      borderRadius: 999,
                      border: '1.5px solid #fecdd3',
                      background: '#ffffff',
                      color: '#be123c',
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Original
                  </button>
                </div>
              </div>

              {/* Swatch Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(126px, 1fr))',
                  gap: 10,
                }}
              >
                {activeColorPresets.map((swatch) => {
                  const isSelected =
                    activeFaceColorHex.toLowerCase() ===
                    swatch.hex.toLowerCase();
                  const previewBg =
                    'swatch' in swatch && typeof swatch.swatch === 'string'
                      ? swatch.swatch
                      : swatch.hex;
                  return (
                    <button
                      key={`${activeFaceCategory}_${swatch.name}_${swatch.hex}`}
                      type="button"
                      onMouseEnter={() => onPlayHover?.()}
                      onClick={() =>
                        handleSelectFaceTraitColor(
                          activeFaceCategory,
                          swatch.hex
                        )
                      }
                      style={{
                        borderRadius: 16,
                        padding: '12px 10px',
                        cursor: 'pointer',
                        border: isSelected
                          ? '2.5px solid #e11d48'
                          : '1.5px solid #ffe4e6',
                        background: isSelected ? '#fff1f2' : '#ffffff',
                        boxShadow: isSelected
                          ? '0 8px 18px rgba(225, 29, 72, 0.14)'
                          : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: '50%',
                          background: previewBg,
                          border: isSelected
                            ? '3px solid #e11d48'
                            : '1.5px solid rgba(136, 19, 55, 0.25)',
                          boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                        }}
                      >
                        {isSelected && <IconCheck size={18} />}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: '#2d1219',
                          textAlign: 'center',
                          lineHeight: 1.25,
                        }}
                      >
                        {swatch.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SLIM, CLEAN FOOTER */}
          <div
            style={{
              padding: '12px 22px',
              borderTop: '1.5px solid #ffe4e6',
              background: '#fff5f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: '#9f1239',
                fontWeight: 700,
              }}
            >
              {equippedCount} élément{equippedCount > 1 ? 's' : ''} équipé
              {equippedCount > 1 ? 's' : ''} • Cliquer-glisser sur le personnage
              pour tourner
            </div>

            <button
              type="button"
              onMouseEnter={() => onPlayHover?.()}
              onClick={() => {
                onPlayConfirm?.();
                onConfirmCustomization(
                  selectedGender,
                  { ...selection },
                  {
                    items: { ...clothesSelection.items },
                    colors: { ...clothesSelection.colors },
                    zoneColors: clothesSelection.zoneColors
                      ? JSON.parse(JSON.stringify(clothesSelection.zoneColors))
                      : undefined,
                    patterns: clothesSelection.patterns
                      ? JSON.parse(JSON.stringify(clothesSelection.patterns))
                      : undefined,
                  },
                  {
                    ...displayOptions,
                    isolateActiveCategory: false,
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
                  }
                );
              }}
              style={{
                padding: '11px 24px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 800,
                boxShadow: '0 8px 20px rgba(225, 29, 72, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
              }}
            >
              <span>Valider et Jouer</span>
              <IconArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
