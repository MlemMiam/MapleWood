import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import type { GraphicsQuality } from './InputBindings';
import { isUnderWeatherShelter } from './WeatherBounds';

export type WeatherType = 'sunny' | 'rainy';
export type TimePhase = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';

// Pre-allocated temporaries to avoid per-frame GC allocations
const _sunVec = new THREE.Vector3();
const _moonVec = new THREE.Vector3();
const _skyDayColor = new THREE.Color(0x9cc7ee);
const _skySunsetColor = new THREE.Color(0xe69482);
const _skyNightColor = new THREE.Color(0x0c1328);
const _rainDayColor = new THREE.Color(0x6d7f93);
const _rainNightColor = new THREE.Color(0x182032);
const _bgColor = new THREE.Color();
const _rainColor = new THREE.Color();
const _sunMorningColor = new THREE.Color(0xffd599);
const _sunDayColor = new THREE.Color(0xffe8c2);
const _sunSunsetColor = new THREE.Color(0xff9454);
const _sunOrbDayColor = new THREE.Color(0xfff6dc);
const _sunOrbSunsetColor = new THREE.Color(0xffc785);
const _sunGlowDayColor = new THREE.Color(0xffd478);
const _sunGlowSunsetColor = new THREE.Color(0xff8c42);
const _moonLightColor = new THREE.Color(0x8faeff);
const _hemiSkyDay = new THREE.Color(0xb4daf7);
const _hemiSkySunset = new THREE.Color(0xf4a9b8);
const _hemiSkyNight = new THREE.Color(0x364878);
const _hemiGroundDay = new THREE.Color(0x456137);
const _hemiGroundSunset = new THREE.Color(0x453448);
const _hemiGroundNight = new THREE.Color(0x141926);
const _tmpHemiSky = new THREE.Color();
const _tmpHemiGround = new THREE.Color();
const _cloudDayColor = new THREE.Color(0xffffff);
const _cloudSunsetColor = new THREE.Color(0xffcab8);
const _cloudNightColor = new THREE.Color(0x263254);
const _cloudRainDay = new THREE.Color(0x8292a6);
const _cloudRainNight = new THREE.Color(0x1f283e);
const _tmpCloudColor = new THREE.Color();
const _tmpCloudRain = new THREE.Color();
const _moteSunColor = new THREE.Color(0xfef3c7);
const _moteRainColor = new THREE.Color(0xdbeafe);
const _cloudDummy = new THREE.Object3D();

const QUEST_SUN_STOPS = [0.25, 0.44, 0.62, 0.78, 0.94];
const RAIN_COUNT = 1200;
const RAIN_BOX_XZ = 30;
const RAIN_BOX_Y = 15;
const BREEZE_MOTE_COUNT = 72;
const BREEZE_STREAK_COUNT = 26;
const BREEZE_BOX_XZ = 32;
const BREEZE_BOX_Y = 8;
const CLOUD_COUNT = 18;
const PUFFS_PER_CLOUD = 5;

export function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createSunGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half - 2);
  grad.addColorStop(0.0, 'rgba(255, 250, 224, 0.96)');
  grad.addColorStop(0.16, 'rgba(255, 226, 148, 0.72)');
  grad.addColorStop(0.38, 'rgba(255, 196, 98, 0.34)');
  grad.addColorStop(0.68, 'rgba(255, 174, 72, 0.10)');
  grad.addColorStop(1.0, 'rgba(255, 165, 64, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class GameRenderer {
  public readonly isSoftwareGl: boolean;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  private sky: Sky;
  private sunMesh: THREE.Mesh;
  private sunMat: THREE.MeshBasicMaterial;
  private sunGlowSprite: THREE.Sprite;
  private sunGlowMat: THREE.SpriteMaterial;
  private sunGlowTex: THREE.CanvasTexture;
  private starsMesh: THREE.Points;
  private starsMat: THREE.PointsMaterial;
  private moonMesh: THREE.Mesh;
  private moonMat: THREE.MeshBasicMaterial;
  private rainMesh: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private rainPositions: Float32Array;
  private rainOffsets: Float32Array;
  private rainLengths: Float32Array;
  private rainSpeeds: Float32Array;
  private breezeMotesMesh: THREE.Points;
  private breezeMotesMat: THREE.PointsMaterial;
  private breezeMotePositions: Float32Array;
  private breezeMoteOffsets: Float32Array;
  private breezeMoteSeeds: Float32Array;
  private breezeStreaksMesh: THREE.LineSegments;
  private breezeStreaksMat: THREE.LineBasicMaterial;
  private breezeStreakPositions: Float32Array;
  private breezeStreakOffsets: Float32Array;
  private breezeStreakSeeds: Float32Array;
  private cloudMesh: THREE.InstancedMesh;
  private cloudMat: THREE.MeshLambertMaterial;
  private cloudData: Array<{
    x: number;
    y: number;
    z: number;
    speed: number;
    scale: number;
    puffs: Array<{ dx: number; dy: number; dz: number; sx: number; sy: number; sz: number }>;
  }> = [];
  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private envRT: THREE.WebGLRenderTarget;
  private contextLost = false;
  private sunTime = 0.25; // Morning sunlight (~9:30 AM)
  private weather: WeatherType = 'sunny';
  private rainIntensity = 0;
  private rainExteriorFade = 1;
  private windTime = 0;
  private windClock = 0;
  private windStrength = 0.32;
  private nextWeatherTimer = 115 + Math.random() * 85; // Rare random rain after sunny default

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.72;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'campus-canvas');
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );

    this.scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x9bc4eb);
    this.scene.background = horizonColor;
    // Keep the entire campus crystal clear; fade only the distant terrain edge (200m–400m)
    this.scene.fog = new THREE.Fog(0x9bc4eb, 200, 400);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.25, 450);

    // Subtle procedural environment reflection for PBR metals & glass without blowing out matte surfaces
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.20;
    roomEnv.dispose();
    pmrem.dispose();

    // Procedural Sky dome (clear sky with subtle warm scatter around the sun)
    this.sky = new Sky();
    this.sky.scale.setScalar(600);
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 1.45;
    skyUniforms['rayleigh'].value = 0.85;
    skyUniforms['mieCoefficient'].value = 0.0018;
    skyUniforms['mieDirectionalG'].value = 0.78;
    skyUniforms['showSunDisc'].value = 0;
    this.scene.add(this.sky);

    // Visible Warm Glowing Sun Orb + Radial Golden Corona in the Sky
    this.sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff6dc,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), this.sunMat);
    this.sunMesh.frustumCulled = false;
    this.scene.add(this.sunMesh);

    this.sunGlowTex = createSunGlowTexture();
    this.sunGlowMat = new THREE.SpriteMaterial({
      map: this.sunGlowTex,
      color: 0xffd478,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sunGlowSprite = new THREE.Sprite(this.sunGlowMat);
    this.sunGlowSprite.scale.set(96, 96, 1);
    this.sunGlowSprite.frustumCulled = false;
    this.scene.add(this.sunGlowSprite);

    // Natural sky ambient fill + gentle warm directional sunlight from the sky sun
    this.hemiLight = new THREE.HemisphereLight(0xb4daf7, 0x456137, 0.56);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe8c2, 0.88);
    this.sunLight.position.set(50, 80, 30);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 210;
    const d = 46;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.shadow.radius = 2.2;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Procedural Starfield Dome for clear nights
    const starCount = 360;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.15 + Math.random() * 0.85); // Upper hemisphere
      const r = 340;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.starsMesh = new THREE.Points(starGeo, this.starsMat);
    this.starsMesh.visible = false;
    this.starsMesh.frustumCulled = false;
    this.scene.add(this.starsMesh);

    // Glowing Moon for night skybox
    this.moonMat = new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), this.moonMat);
    this.moonMesh.visible = false;
    this.moonMesh.frustumCulled = false;
    this.scene.add(this.moonMesh);

    // Fine 3D Rain Streaks (1 draw call, excluded from building & covered shelters)
    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    this.rainOffsets = new Float32Array(RAIN_COUNT * 3);
    this.rainLengths = new Float32Array(RAIN_COUNT);
    this.rainSpeeds = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainOffsets[i * 3] = (Math.random() - 0.5) * RAIN_BOX_XZ;
      this.rainOffsets[i * 3 + 1] = Math.random() * RAIN_BOX_Y - 1.5;
      this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * RAIN_BOX_XZ;
      this.rainLengths[i] = 0.21 + Math.random() * 0.13;
      this.rainSpeeds[i] = 17 + Math.random() * 5.5;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainMesh = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainMesh.visible = false;
    this.rainMesh.frustumCulled = false;
    this.scene.add(this.rainMesh);

    // Subtle Exterior Breeze Motes (floating sunlight pollen / tiny leaf specks outdoors)
    this.breezeMotePositions = new Float32Array(BREEZE_MOTE_COUNT * 3);
    this.breezeMoteOffsets = new Float32Array(BREEZE_MOTE_COUNT * 3);
    this.breezeMoteSeeds = new Float32Array(BREEZE_MOTE_COUNT);
    for (let i = 0; i < BREEZE_MOTE_COUNT; i++) {
      this.breezeMoteOffsets[i * 3] = (Math.random() - 0.5) * BREEZE_BOX_XZ;
      this.breezeMoteOffsets[i * 3 + 1] = 0.4 + Math.random() * BREEZE_BOX_Y;
      this.breezeMoteOffsets[i * 3 + 2] = (Math.random() - 0.5) * BREEZE_BOX_XZ;
      this.breezeMoteSeeds[i] = Math.random() * Math.PI * 2;
    }
    const breezeMoteGeo = new THREE.BufferGeometry();
    breezeMoteGeo.setAttribute('position', new THREE.BufferAttribute(this.breezeMotePositions, 3));
    this.breezeMotesMat = new THREE.PointsMaterial({
      color: 0xfef3c7,
      size: 0.085,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.breezeMotesMesh = new THREE.Points(breezeMoteGeo, this.breezeMotesMat);
    this.breezeMotesMesh.visible = false;
    this.breezeMotesMesh.frustumCulled = false;
    this.scene.add(this.breezeMotesMesh);

    // Translucent Air-Breeze Wisps outdoors (gentle sunlit zephyr, stronger during rain gusts)
    this.breezeStreakPositions = new Float32Array(BREEZE_STREAK_COUNT * 6);
    this.breezeStreakOffsets = new Float32Array(BREEZE_STREAK_COUNT * 3);
    this.breezeStreakSeeds = new Float32Array(BREEZE_STREAK_COUNT);
    for (let i = 0; i < BREEZE_STREAK_COUNT; i++) {
      this.breezeStreakOffsets[i * 3] = (Math.random() - 0.5) * BREEZE_BOX_XZ;
      this.breezeStreakOffsets[i * 3 + 1] = 0.9 + Math.random() * (BREEZE_BOX_Y - 1.2);
      this.breezeStreakOffsets[i * 3 + 2] = (Math.random() - 0.5) * BREEZE_BOX_XZ;
      this.breezeStreakSeeds[i] = Math.random() * Math.PI * 2;
    }
    const breezeStreakGeo = new THREE.BufferGeometry();
    breezeStreakGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.breezeStreakPositions, 3)
    );
    this.breezeStreaksMat = new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.breezeStreaksMesh = new THREE.LineSegments(breezeStreakGeo, this.breezeStreaksMat);
    this.breezeStreaksMesh.visible = false;
    this.breezeStreaksMesh.frustumCulled = false;
    this.scene.add(this.breezeStreaksMesh);

    // Stylized Anime Clouds (1 InstancedMesh draw call, drifts & adapts to time/weather)
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);
    this.cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.48,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      fog: true,
    });
    this.cloudMesh = new THREE.InstancedMesh(puffGeo, this.cloudMat, CLOUD_COUNT * PUFFS_PER_CLOUD);
    this.cloudMesh.frustumCulled = false;
    this.cloudMesh.castShadow = false;
    this.cloudMesh.receiveShadow = false;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const baseScale = 2.6 + Math.random() * 2.4;
      const puffs = [];
      for (let p = 0; p < PUFFS_PER_CLOUD; p++) {
        const angle = (p / PUFFS_PER_CLOUD) * Math.PI * 2 + Math.random() * 0.4;
        const dist = p === 0 ? 0 : (1.1 + Math.random() * 1.1) * baseScale;
        puffs.push({
          dx: Math.cos(angle) * dist * 1.35,
          dy: p === 0 ? baseScale * 0.35 : (Math.random() - 0.3) * baseScale * 0.32,
          dz: Math.sin(angle) * dist * 0.75,
          sx: (p === 0 ? 1.55 : 0.95 + Math.random() * 0.45) * baseScale,
          sy: (p === 0 ? 0.85 : 0.58 + Math.random() * 0.25) * baseScale,
          sz: (p === 0 ? 1.15 : 0.78 + Math.random() * 0.35) * baseScale,
        });
      }
      this.cloudData.push({
        x: (Math.random() - 0.5) * 360,
        y: 64 + Math.random() * 26,
        z: -190 + Math.random() * 340,
        speed: 1.4 + Math.random() * 1.3,
        scale: baseScale,
        puffs,
      });
    }
    this.scene.add(this.cloudMesh);
    this.updateClouds(0);

    this.applySkyAndLighting();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    window.addEventListener('resize', this.handleResize);
  }

  private titleMode = false;
  private currentQuality: GraphicsQuality = 'medium';
  private shadowFrameCounter = 0;
  private cloudAccum = 0;
  private lastSkyKey = '';

  public setTitleMode(enabled: boolean): void {
    if (this.titleMode === enabled) return;
    this.titleMode = enabled;
    if (enabled) {
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      if (!this.isSoftwareGl) {
        this.renderer.setPixelRatio(1);
      }
    } else {
      this.setQuality(this.currentQuality);
    }
  }

  public setQuality(quality: GraphicsQuality): void {
    this.currentQuality = quality;
    if (this.isSoftwareGl) return;

    const targetMapSize = quality === 'high' ? 2048 : 1024;
    if (this.sunLight.shadow.mapSize.width !== targetMapSize) {
      this.sunLight.shadow.mapSize.set(targetMapSize, targetMapSize);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }

    const d = quality === 'high' ? 46 : 38;
    if (this.sunLight.shadow.camera.right !== d) {
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.camera.updateProjectionMatrix();
    }

    if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      this.renderer.shadowMap.needsUpdate = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  public getWeather(): WeatherType {
    return this.weather;
  }

  public getRainIntensity(): number {
    return this.rainIntensity;
  }

  public getWindStrength(): number {
    return this.windStrength;
  }

  public getWindTime(): number {
    return this.windTime;
  }

  public getTimePhase(): TimePhase {
    if (this.sunTime >= 0.85 || this.sunTime < 0.12) return 'night';
    if (this.sunTime >= 0.69) return 'sunset';
    if (this.sunTime >= 0.52) return 'afternoon';
    if (this.sunTime >= 0.36) return 'midday';
    return 'morning';
  }

  public updateEnvironment(
    dt: number,
    dayCycleEnabled: boolean,
    completedQuests: number,
    totalQuests: number,
    focusPos: THREE.Vector3,
    isOutdoors: boolean,
    allowWeatherEvents = true
  ): void {
    // 1. Quest-adapted Day/Night Cycle
    const clampedTotal = Math.max(1, totalQuests);
    const ratio = THREE.MathUtils.clamp(completedQuests / clampedTotal, 0, 1);
    const stopIdx = Math.min(4, Math.floor(ratio * 4 + 0.0001));
    const targetSunTime = dayCycleEnabled ? QUEST_SUN_STOPS[stopIdx] : 0.25;

    const sunDiff = targetSunTime - this.sunTime;
    if (Math.abs(sunDiff) > 0.0005) {
      this.sunTime += sunDiff * Math.min(1, dt * 0.45);
    } else {
      this.sunTime = targetSunTime;
    }

    // 2. Random, infrequent rain weather system (Sunny by default)
    if (allowWeatherEvents) {
      this.nextWeatherTimer -= dt;
      if (this.nextWeatherTimer <= 0) {
        if (this.weather === 'sunny') {
          if (Math.random() < 0.38) {
            this.weather = 'rainy';
            this.nextWeatherTimer = 28 + Math.random() * 20; // Brief shower (28-48s)
          } else {
            this.nextWeatherTimer = 95 + Math.random() * 85; // Stay sunny
          }
        } else {
          this.weather = 'sunny';
          this.nextWeatherTimer = 120 + Math.random() * 100; // Long sunny stretch
        }
      }
    } else if (this.weather !== 'sunny') {
      this.weather = 'sunny';
    }

    const targetRain = this.weather === 'rainy' ? 1 : 0;
    if (Math.abs(targetRain - this.rainIntensity) > 0.002) {
      const step = dt * 0.28;
      this.rainIntensity =
        targetRain > this.rainIntensity
          ? Math.min(1, this.rainIntensity + step)
          : Math.max(0, this.rainIntensity - step);
    } else {
      this.rainIntensity = targetRain;
    }

    // 3. Exterior Breeze (soft pleasant zephyr when sunny, noticeably stronger gusts when raining)
    this.windClock += dt;
    const sunnyGust =
      0.30 +
      0.085 * Math.sin(this.windClock * 0.46) +
      0.055 * Math.sin(this.windClock * 1.18 + 1.1);
    const rainyGust =
      1.08 +
      0.22 * Math.sin(this.windClock * 0.85 + 0.4) +
      0.13 * Math.cos(this.windClock * 1.75);
    const targetWind = THREE.MathUtils.lerp(sunnyGust, rainyGust, this.rainIntensity);
    this.windStrength += (targetWind - this.windStrength) * Math.min(1, dt * 2.5);
    this.windTime += dt * (1.1 + this.windStrength * 1.25);

    const targetExt = isOutdoors ? 1 : 0;
    this.rainExteriorFade += (targetExt - this.rainExteriorFade) * Math.min(1, dt * 3.5);

    const cx = focusPos ? Math.round(focusPos.x * 0.5) * 2 : 0;
    const cz = focusPos ? Math.round(focusPos.z * 0.5) * 2 : 0;
    const skyKey = `${this.sunTime.toFixed(4)}_${this.rainIntensity.toFixed(3)}_${cx}_${cz}`;
    if (skyKey !== this.lastSkyKey) {
      this.lastSkyKey = skyKey;
      this.applySkyAndLighting(focusPos);
    }

    if (isOutdoors) {
      this.cloudAccum += dt;
      if (this.cloudAccum >= 0.05) {
        this.updateClouds(this.cloudAccum);
        this.cloudAccum = 0;
      }
    }
    this.updateRainParticles(dt, focusPos);
    this.updateBreezeParticles(dt, focusPos);
  }

  private updateClouds(dt: number): void {
    const speedMult = 0.85 + this.windStrength * 0.85 + this.rainIntensity * 0.4;
    let idx = 0;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      c.x += c.speed * speedMult * dt;
      if (c.x > 195) c.x = -195;
      for (let p = 0; p < c.puffs.length; p++) {
        const pf = c.puffs[p];
        _cloudDummy.position.set(c.x + pf.dx, c.y + pf.dy, c.z + pf.dz);
        _cloudDummy.scale.set(pf.sx, pf.sy, pf.sz);
        _cloudDummy.updateMatrix();
        this.cloudMesh.setMatrixAt(idx++, _cloudDummy.matrix);
      }
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;
  }

  private updateRainParticles(dt: number, focusPos: THREE.Vector3): void {
    // Keep exterior rain gently visible through windows when inside, while excluding interior volume completely
    const visibleAlpha = this.rainIntensity * (0.55 + 0.45 * this.rainExteriorFade);
    if (visibleAlpha <= 0.01) {
      this.rainMesh.visible = false;
      return;
    }
    this.rainMesh.visible = true;
    this.rainMat.opacity = 0.24 * visibleAlpha;

    const windDriftX = (1.6 + this.windStrength * 3.1) * dt;
    const windDriftZ = (0.45 + this.windStrength * 0.85) * dt;
    const halfXZ = RAIN_BOX_XZ * 0.5;
    const baseY = focusPos.y - 1.2;
    const tiltFactorX = 0.045 + this.windStrength * 0.09;
    const tiltFactorZ = 0.02 + this.windStrength * 0.025;

    for (let i = 0; i < RAIN_COUNT; i++) {
      const oIdx = i * 3;
      let ox = this.rainOffsets[oIdx] + windDriftX;
      let oy = this.rainOffsets[oIdx + 1] - this.rainSpeeds[i] * dt;
      let oz = this.rainOffsets[oIdx + 2] + windDriftZ;

      if (oy < 0) oy += RAIN_BOX_Y;
      if (ox > halfXZ) ox -= RAIN_BOX_XZ;
      if (oz > halfXZ) oz -= RAIN_BOX_XZ;

      this.rainOffsets[oIdx] = ox;
      this.rainOffsets[oIdx + 1] = oy;
      this.rainOffsets[oIdx + 2] = oz;

      const wx = focusPos.x + ox;
      const wy = baseY + oy;
      const wz = focusPos.z + oz;
      const len = this.rainLengths[i];
      const wx2 = wx + len * tiltFactorX;
      const wy2 = wy + len;
      const wz2 = wz + len * tiltFactorZ;

      const pIdx = i * 6;
      // Strict spatial exclusion: never render rain inside MainBuilding, Portico, Covered Walkway, or Breezeways
      if (isUnderWeatherShelter(wx, wy, wz) || isUnderWeatherShelter(wx2, wy2, wz2)) {
        this.rainPositions[pIdx] = wx;
        this.rainPositions[pIdx + 1] = wy;
        this.rainPositions[pIdx + 2] = wz;
        this.rainPositions[pIdx + 3] = wx;
        this.rainPositions[pIdx + 4] = wy;
        this.rainPositions[pIdx + 5] = wz;
      } else {
        this.rainPositions[pIdx] = wx;
        this.rainPositions[pIdx + 1] = wy;
        this.rainPositions[pIdx + 2] = wz;
        this.rainPositions[pIdx + 3] = wx2;
        this.rainPositions[pIdx + 4] = wy2;
        this.rainPositions[pIdx + 5] = wz2;
      }
    }
    (this.rainMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateBreezeParticles(dt: number, focusPos: THREE.Vector3): void {
    const extAlpha = this.rainExteriorFade;
    if (extAlpha <= 0.02) {
      this.breezeMotesMesh.visible = false;
      this.breezeStreaksMesh.visible = false;
      return;
    }

    const halfXZ = BREEZE_BOX_XZ * 0.5;
    const speedX = (0.95 + this.windStrength * 2.9) * dt;
    const speedZ = (0.28 + this.windStrength * 0.78) * dt;

    // 1. Floating sunlit breeze motes / leaf pollen
    this.breezeMotesMesh.visible = true;
    this.breezeMotesMat.color.copy(_moteSunColor).lerp(_moteRainColor, this.rainIntensity * 0.7);
    this.breezeMotesMat.opacity = (0.26 - this.rainIntensity * 0.08) * extAlpha;

    for (let i = 0; i < BREEZE_MOTE_COUNT; i++) {
      const oIdx = i * 3;
      const seed = this.breezeMoteSeeds[i];
      let ox = this.breezeMoteOffsets[oIdx] + speedX * (0.75 + 0.35 * Math.sin(seed));
      let oy =
        this.breezeMoteOffsets[oIdx + 1] +
        Math.sin(this.windClock * 1.4 + seed) * 0.14 * dt;
      let oz = this.breezeMoteOffsets[oIdx + 2] + speedZ + Math.cos(this.windClock + seed) * 0.16 * dt;

      if (ox > halfXZ) ox -= BREEZE_BOX_XZ;
      if (ox < -halfXZ) ox += BREEZE_BOX_XZ;
      if (oz > halfXZ) oz -= BREEZE_BOX_XZ;
      if (oz < -halfXZ) oz += BREEZE_BOX_XZ;
      if (oy > BREEZE_BOX_Y) oy -= BREEZE_BOX_Y - 0.5;
      if (oy < 0.35) oy += BREEZE_BOX_Y - 0.5;

      this.breezeMoteOffsets[oIdx] = ox;
      this.breezeMoteOffsets[oIdx + 1] = oy;
      this.breezeMoteOffsets[oIdx + 2] = oz;

      const wx = focusPos.x + ox;
      const wy = Math.max(0.3, focusPos.y + oy - 0.8);
      const wz = focusPos.z + oz;

      if (isUnderWeatherShelter(wx, wy, wz)) {
        this.breezeMotePositions[oIdx] = wx;
        this.breezeMotePositions[oIdx + 1] = -100;
        this.breezeMotePositions[oIdx + 2] = wz;
      } else {
        this.breezeMotePositions[oIdx] = wx;
        this.breezeMotePositions[oIdx + 1] = wy;
        this.breezeMotePositions[oIdx + 2] = wz;
      }
    }
    (this.breezeMotesMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // 2. Fine horizontal air-breeze wisps (light during sunny breeze, livelier in rainy wind)
    this.breezeStreaksMesh.visible = true;
    this.breezeStreaksMat.opacity =
      (0.055 + this.windStrength * 0.055 + this.rainIntensity * 0.06) * extAlpha;

    const streakSpeedX = (3.4 + this.windStrength * 6.4) * dt;
    const streakSpeedZ = (0.9 + this.windStrength * 1.65) * dt;
    const streakLen = 0.75 + this.windStrength * 0.75;

    for (let i = 0; i < BREEZE_STREAK_COUNT; i++) {
      const oIdx = i * 3;
      const seed = this.breezeStreakSeeds[i];
      let ox = this.breezeStreakOffsets[oIdx] + streakSpeedX;
      const oy = this.breezeStreakOffsets[oIdx + 1];
      let oz = this.breezeStreakOffsets[oIdx + 2] + streakSpeedZ;

      if (ox > halfXZ) ox -= BREEZE_BOX_XZ;
      if (oz > halfXZ) oz -= BREEZE_BOX_XZ;

      this.breezeStreakOffsets[oIdx] = ox;
      this.breezeStreakOffsets[oIdx + 2] = oz;

      const wx = focusPos.x + ox;
      const wy = Math.max(0.6, focusPos.y + oy - 0.4 + Math.sin(this.windClock * 1.9 + seed) * 0.15);
      const wz = focusPos.z + oz;
      const wx2 = wx + streakLen;
      const wy2 = wy + Math.cos(this.windClock * 2.3 + seed) * 0.04;
      const wz2 = wz + streakLen * 0.26;

      const pIdx = i * 6;
      if (isUnderWeatherShelter(wx, wy, wz) || isUnderWeatherShelter(wx2, wy2, wz2)) {
        this.breezeStreakPositions[pIdx] = wx;
        this.breezeStreakPositions[pIdx + 1] = wy;
        this.breezeStreakPositions[pIdx + 2] = wz;
        this.breezeStreakPositions[pIdx + 3] = wx;
        this.breezeStreakPositions[pIdx + 4] = wy;
        this.breezeStreakPositions[pIdx + 5] = wz;
      } else {
        this.breezeStreakPositions[pIdx] = wx;
        this.breezeStreakPositions[pIdx + 1] = wy;
        this.breezeStreakPositions[pIdx + 2] = wz;
        this.breezeStreakPositions[pIdx + 3] = wx2;
        this.breezeStreakPositions[pIdx + 4] = wy2;
        this.breezeStreakPositions[pIdx + 5] = wz2;
      }
    }
    (this.breezeStreaksMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private applySkyAndLighting(focusPos?: THREE.Vector3): void {
    const t = this.sunTime;
    // Elevation peaks at midday (~0.45), dips toward horizon at sunset (~0.78), below horizon at night (~0.94)
    const elevDeg = 10 + Math.sin(t * Math.PI * 1.18) * 54;
    const phi = THREE.MathUtils.degToRad(90 - elevDeg);
    const theta = THREE.MathUtils.degToRad(130 + t * 95);
    _sunVec.setFromSphericalCoords(1, phi, theta);

    // Phase weights
    const sunsetFactor = Math.exp(-Math.pow((t - 0.77) / 0.09, 2));
    const nightFactor = THREE.MathUtils.smoothstep(t, 0.81, 0.92);
    const rain = this.rainIntensity;

    // Sky shader uniforms (clear blue sky with gentle warm scattering near the sun)
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['sunPosition'].value.copy(_sunVec);
    skyUniforms['turbidity'].value = THREE.MathUtils.lerp(1.45 + sunsetFactor * 3.6, 7.5, rain);
    skyUniforms['rayleigh'].value = THREE.MathUtils.lerp(
      Math.max(0.18, 0.85 + sunsetFactor * 2.0 - nightFactor * 0.45),
      0.22,
      rain
    );
    skyUniforms['mieCoefficient'].value = THREE.MathUtils.lerp(
      0.0018 + sunsetFactor * 0.0038,
      0.012,
      rain
    );
    skyUniforms['mieDirectionalG'].value = THREE.MathUtils.lerp(0.78, 0.65, rain);

    // Background & Fog color blend: Day -> Sunset -> Night, then Overcast Rain
    _bgColor.copy(_skyDayColor).lerp(_skySunsetColor, sunsetFactor * 0.85).lerp(_skyNightColor, nightFactor);
    _rainColor.copy(_rainDayColor).lerp(_rainNightColor, nightFactor);
    _bgColor.lerp(_rainColor, rain * 0.85);

    (this.scene.background as THREE.Color).copy(_bgColor);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(_bgColor);
    fog.near = THREE.MathUtils.lerp(200, 75, rain);
    fog.far = THREE.MathUtils.lerp(400, 210, rain);

    // Directional Sun / Moon light (shadow frustum centered near player, snapped to 2m grid to prevent shimmer)
    const cx = focusPos ? Math.round(focusPos.x * 0.5) * 2 : 0;
    const cz = focusPos ? Math.round(focusPos.z * 0.5) * 2 : 0;
    this.sunLight.target.position.set(cx, 0, cz);
    this.sunLight.target.updateMatrixWorld();

    // Anchor celestial dome elements around current focus so Sun, Moon & Stars stay parallax-free and never clip
    this.starsMesh.position.set(cx, 0, cz);
    this.sunMesh.position.set(
      cx + _sunVec.x * 295,
      _sunVec.y * 295,
      cz + _sunVec.z * 295
    );
    this.sunGlowSprite.position.copy(this.sunMesh.position);

    const sunAboveHorizon = THREE.MathUtils.smoothstep(_sunVec.y, -0.02, 0.16);
    const clearSun = Math.max(0, 1 - nightFactor * 1.1) * sunAboveHorizon * (1 - rain * 0.92);
    this.sunMesh.visible = clearSun > 0.02;
    this.sunGlowSprite.visible = clearSun > 0.02;
    this.sunMat.color.copy(_sunOrbDayColor).lerp(_sunOrbSunsetColor, sunsetFactor * 0.85);
    this.sunMat.opacity = clearSun;
    this.sunGlowMat.color.copy(_sunGlowDayColor).lerp(_sunGlowSunsetColor, sunsetFactor * 0.9);
    this.sunGlowMat.opacity = clearSun * (0.86 + sunsetFactor * 0.12);
    const haloSize = 94 + sunsetFactor * 26;
    this.sunGlowSprite.scale.set(haloSize, haloSize, 1);

    if (nightFactor > 0.5) {
      _moonVec.set(-_sunVec.x, Math.max(0.32, Math.abs(_sunVec.y) + 0.28), -_sunVec.z).normalize();
      this.sunLight.position.set(
        cx + _moonVec.x * 95,
        _moonVec.y * 95,
        cz + _moonVec.z * 95
      );
      this.sunLight.color.copy(_moonLightColor);
      this.sunLight.intensity = 0.34 * (1 - 0.5 * rain);
      this.moonMesh.position.set(
        cx + _moonVec.x * 320,
        _moonVec.y * 320,
        cz + _moonVec.z * 320
      );
    } else {
      this.sunLight.position.set(
        cx + _sunVec.x * 95,
        _sunVec.y * 95,
        cz + _sunVec.z * 95
      );
      // Natural warm sunlight coming from the visible Sun without over-yellowing the scene
      const goldenBlend = THREE.MathUtils.clamp(Math.abs(t - 0.44) / 0.22, 0, 1);
      this.sunLight.color
        .copy(_sunDayColor)
        .lerp(_sunMorningColor, goldenBlend * 0.55)
        .lerp(_sunSunsetColor, sunsetFactor * 0.85);
      const daySunIntensity = 0.68 + Math.max(0, Math.sin(t * Math.PI)) * 0.34;
      this.sunLight.intensity = daySunIntensity * (1 - 0.58 * rain);
      _moonVec.set(-_sunVec.x, Math.max(0.25, Math.abs(_sunVec.y) + 0.2), -_sunVec.z).normalize();
      this.moonMesh.position.set(
        cx + _moonVec.x * 320,
        _moonVec.y * 320,
        cz + _moonVec.z * 320
      );
    }

    // Hemisphere ambient fill (balanced natural sky/ground contrast so whites stay crisp and colors stay vibrant)
    _tmpHemiSky.copy(_hemiSkyDay).lerp(_hemiSkySunset, sunsetFactor * 0.8).lerp(_hemiSkyNight, nightFactor);
    _tmpHemiGround.copy(_hemiGroundDay).lerp(_hemiGroundSunset, sunsetFactor * 0.7).lerp(_hemiGroundNight, nightFactor);
    _tmpHemiSky.lerp(_rainColor, rain * 0.65);
    this.hemiLight.color.copy(_tmpHemiSky);
    this.hemiLight.groundColor.copy(_tmpHemiGround);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.56, 0.42, nightFactor) * (1 - 0.20 * rain);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.20, 0.08, nightFactor) * (1 - 0.3 * rain);

    // Stars & Moon visibility at night (hidden in heavy overcast rain)
    const clearNight = Math.max(0, (nightFactor - 0.15) / 0.85) * (1 - rain * 0.9);
    this.starsMesh.visible = clearNight > 0.02;
    this.starsMat.opacity = clearNight * 0.88;
    this.moonMesh.visible = clearNight > 0.02;
    this.moonMat.opacity = clearNight * 0.95;

    // Stylized Clouds tint & opacity adapted to time of day and weather
    _tmpCloudColor
      .copy(_cloudDayColor)
      .lerp(_cloudSunsetColor, sunsetFactor * 0.9)
      .lerp(_cloudNightColor, nightFactor);
    _tmpCloudRain.copy(_cloudRainDay).lerp(_cloudRainNight, nightFactor);
    _tmpCloudColor.lerp(_tmpCloudRain, rain * 0.88);
    this.cloudMat.color.copy(_tmpCloudColor);
    this.cloudMat.emissive.copy(_tmpCloudColor);
    this.cloudMat.emissiveIntensity = THREE.MathUtils.lerp(0.48, 0.28, nightFactor) * (1 - 0.25 * rain);
    this.cloudMat.opacity = THREE.MathUtils.lerp(0.90, 0.48, nightFactor) * (1 - rain * 0.0) + rain * 0.06;
  }

  public precompile(): void {
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public renderFrame(): void {
    if (this.renderer.shadowMap.enabled) {
      const stride = this.currentQuality === 'high' ? 2 : 3;
      this.shadowFrameCounter = (this.shadowFrameCounter + 1) % stride;
      if (this.shadowFrameCounter === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  public afterDraw(cb: () => void): number {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    let timerId = 0;
    const poll = () => {
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        timerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        timerId = window.setTimeout(cb, 80);
      }
    };
    timerId = window.setTimeout(poll, 5);
    return timerId;
  }

  private handleResize = (): void => {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    window.dispatchEvent(new CustomEvent('maplewood:webgl-context-lost'));
  };

  private handleContextRestored = (): void => {
    this.contextLost = false;
    window.dispatchEvent(new CustomEvent('maplewood:webgl-context-restored'));
  };

  public isContextLost(): boolean {
    return this.contextLost;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );
    this.resizeObserver.disconnect();
    this.sunGlowTex.dispose();
    this.sunGlowMat.dispose();
    this.sunMat.dispose();
    this.sunMesh.geometry.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
