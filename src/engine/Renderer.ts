import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import type { GraphicsQuality } from './InputBindings';

export type WeatherType = 'sunny' | 'rainy';
export type TimePhase = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';

// Pre-allocated temporaries to avoid per-frame GC allocations
const _sunVec = new THREE.Vector3();
const _moonVec = new THREE.Vector3();
const _skyDayColor = new THREE.Color(0x9bc4eb);
const _skySunsetColor = new THREE.Color(0xe49386);
const _skyNightColor = new THREE.Color(0x0c1328);
const _rainDayColor = new THREE.Color(0x6d7f93);
const _rainNightColor = new THREE.Color(0x182032);
const _bgColor = new THREE.Color();
const _rainColor = new THREE.Color();
const _sunDayColor = new THREE.Color(0xfff0d4);
const _sunSunsetColor = new THREE.Color(0xffa468);
const _moonLightColor = new THREE.Color(0x8faeff);
const _hemiSkyDay = new THREE.Color(0xaad0f5);
const _hemiSkySunset = new THREE.Color(0xf4a9b8);
const _hemiSkyNight = new THREE.Color(0x364878);
const _hemiGroundDay = new THREE.Color(0x3f5a36);
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
const _cloudDummy = new THREE.Object3D();

const QUEST_SUN_STOPS = [0.25, 0.44, 0.62, 0.78, 0.94];
const RAIN_COUNT = 800;
const RAIN_BOX_XZ = 34;
const RAIN_BOX_Y = 16;
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

export class GameRenderer {
  public readonly isSoftwareGl: boolean;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  private sky: Sky;
  private starsMesh: THREE.Points;
  private starsMat: THREE.PointsMaterial;
  private moonMesh: THREE.Mesh;
  private moonMat: THREE.MeshBasicMaterial;
  private rainMesh: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private rainPositions: Float32Array;
  private rainOffsets: Float32Array;
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

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.25, 280);

    // Subtle procedural environment reflection for PBR metals & glass without blowing out matte surfaces
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.22;
    roomEnv.dispose();
    pmrem.dispose();

    // Procedural Sky dome (clear blue sky without milky horizon glare)
    this.sky = new Sky();
    this.sky.scale.setScalar(600);
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 0.75;
    skyUniforms['rayleigh'].value = 0.65;
    skyUniforms['mieCoefficient'].value = 0.0004;
    skyUniforms['mieDirectionalG'].value = 0.65;
    this.scene.add(this.sky);

    // Soft ambient fill + restrained directional sun to avoid burnt whites
    this.hemiLight = new THREE.HemisphereLight(0xaad0f5, 0x3f5a36, 0.58);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d4, 0.68);
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
    this.scene.add(this.moonMesh);

    // Lightweight 3D Rain Streaks (1 draw call, fades indoors)
    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    this.rainOffsets = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainOffsets[i * 3] = (Math.random() - 0.5) * RAIN_BOX_XZ;
      this.rainOffsets[i * 3 + 1] = Math.random() * RAIN_BOX_Y - 2;
      this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * RAIN_BOX_XZ;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainMesh = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainMesh.visible = false;
    this.rainMesh.frustumCulled = false;
    this.scene.add(this.rainMesh);

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
  }

  private updateClouds(dt: number): void {
    const speedMult = 1 + this.rainIntensity * 0.8;
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
    const visibleAlpha = this.rainIntensity * this.rainExteriorFade;
    if (visibleAlpha <= 0.01) {
      this.rainMesh.visible = false;
      return;
    }
    this.rainMesh.visible = true;
    this.rainMat.opacity = 0.42 * visibleAlpha;

    const fall = 22 * dt;
    const windX = 2.4 * dt;
    const halfXZ = RAIN_BOX_XZ * 0.5;
    const baseY = focusPos.y - 1.5;

    for (let i = 0; i < RAIN_COUNT; i++) {
      const oIdx = i * 3;
      let ox = this.rainOffsets[oIdx] + windX;
      let oy = this.rainOffsets[oIdx + 1] - fall;
      const oz = this.rainOffsets[oIdx + 2];

      if (oy < 0) oy += RAIN_BOX_Y;
      if (ox > halfXZ) ox -= RAIN_BOX_XZ;

      this.rainOffsets[oIdx] = ox;
      this.rainOffsets[oIdx + 1] = oy;

      const wx = focusPos.x + ox;
      const wy = baseY + oy;
      const wz = focusPos.z + oz;

      const pIdx = i * 6;
      this.rainPositions[pIdx] = wx;
      this.rainPositions[pIdx + 1] = wy;
      this.rainPositions[pIdx + 2] = wz;
      this.rainPositions[pIdx + 3] = wx + 0.06;
      this.rainPositions[pIdx + 4] = wy + 0.58;
      this.rainPositions[pIdx + 5] = wz;
    }
    (this.rainMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
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

    // Sky shader uniforms
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['sunPosition'].value.copy(_sunVec);
    skyUniforms['turbidity'].value = THREE.MathUtils.lerp(0.75 + sunsetFactor * 3.8, 7.5, rain);
    skyUniforms['rayleigh'].value = THREE.MathUtils.lerp(
      Math.max(0.15, 0.65 + sunsetFactor * 2.1 - nightFactor * 0.45),
      0.22,
      rain
    );
    skyUniforms['mieCoefficient'].value = THREE.MathUtils.lerp(
      0.0004 + sunsetFactor * 0.003,
      0.012,
      rain
    );

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

    if (nightFactor > 0.5) {
      _moonVec.set(-_sunVec.x, Math.max(0.32, Math.abs(_sunVec.y) + 0.28), -_sunVec.z).normalize();
      this.sunLight.position.set(
        cx + _moonVec.x * 95,
        _moonVec.y * 95,
        cz + _moonVec.z * 95
      );
      this.sunLight.color.copy(_moonLightColor);
      this.sunLight.intensity = 0.34 * (1 - 0.5 * rain);
      this.moonMesh.position.copy(_moonVec).multiplyScalar(320);
    } else {
      this.sunLight.position.set(
        cx + _sunVec.x * 95,
        _sunVec.y * 95,
        cz + _sunVec.z * 95
      );
      this.sunLight.color.copy(_sunDayColor).lerp(_sunSunsetColor, sunsetFactor * 0.85);
      const daySunIntensity = 0.44 + Math.max(0, Math.sin(t * Math.PI)) * 0.32;
      this.sunLight.intensity = daySunIntensity * (1 - 0.56 * rain);
      _moonVec.set(-_sunVec.x, Math.max(0.25, Math.abs(_sunVec.y) + 0.2), -_sunVec.z).normalize();
      this.moonMesh.position.copy(_moonVec).multiplyScalar(320);
    }

    // Hemisphere ambient fill
    _tmpHemiSky.copy(_hemiSkyDay).lerp(_hemiSkySunset, sunsetFactor * 0.8).lerp(_hemiSkyNight, nightFactor);
    _tmpHemiGround.copy(_hemiGroundDay).lerp(_hemiGroundSunset, sunsetFactor * 0.7).lerp(_hemiGroundNight, nightFactor);
    _tmpHemiSky.lerp(_rainColor, rain * 0.55);
    this.hemiLight.color.copy(_tmpHemiSky);
    this.hemiLight.groundColor.copy(_tmpHemiGround);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.58, 0.42, nightFactor) * (1 - 0.22 * rain);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.22, 0.08, nightFactor) * (1 - 0.3 * rain);

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
    this.envRT.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
