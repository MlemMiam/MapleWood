import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import type { GraphicsQuality } from './InputBindings';

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
  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private envRT: THREE.WebGLRenderTarget;
  private sunTime = 0.36; // Morning sunlight (~9:30 AM)

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
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'campus-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x9bc4eb);
    this.scene.background = horizonColor;
    // Keep the entire campus crystal clear; fade only the distant terrain edge (200m–400m)
    this.scene.fog = new THREE.Fog(0x9bc4eb, 200, 400);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.15, 420);

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
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 230;
    const d = 85;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.updateSunPosition(0.36);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    window.addEventListener('resize', this.handleResize);
  }

  public setQuality(quality: GraphicsQuality): void {
    if (this.isSoftwareGl) return;

    if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
    }
  }

  public updateDayCycle(dt: number, enabled: boolean): void {
    if (!enabled) {
      if (Math.abs(this.sunTime - 0.36) > 0.01) {
        this.sunTime = 0.36;
        this.updateSunPosition(this.sunTime);
      }
      return;
    }
    this.sunTime = (this.sunTime + dt * 0.006) % 1;
    this.updateSunPosition(this.sunTime);
  }

  private updateSunPosition(t: number): void {
    const phi = THREE.MathUtils.degToRad(90 - (12 + Math.sin(t * Math.PI) * 52));
    const theta = THREE.MathUtils.degToRad(130 + t * 90);
    const sunVec = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms['sunPosition'].value.copy(sunVec);
    this.sunLight.position.copy(sunVec).multiplyScalar(95);
    this.sunLight.intensity = 0.44 + Math.sin(t * Math.PI) * 0.32;
  }

  public precompile(): void {
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public renderFrame(): void {
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

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver.disconnect();
    this.envRT.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
