import * as THREE from 'three';

interface DistConstraint {
  a: number;
  b: number;
  restLen: number;
  stiffness: number;
}

/**
 * Lightweight Position-Based / Verlet soft-body paper sheet (`7x11` grid) with
 * crisp bending stiffness, aerodynamic normal drag, pinch-grip attachment, and
 * per-vertex desk heightmap collision so the sheet never clips into the desk.
 */
export class PaperSoftBody {
  public readonly mesh: THREE.Mesh;

  private readonly cols: number;
  private readonly rows: number;
  private readonly count: number;
  private readonly baseLocal: Float32Array;
  private readonly pos: Float32Array;
  private readonly prevPos: Float32Array;
  private readonly targetVerts: Float32Array;
  private readonly pinchWeights: Float32Array;
  private readonly restVerts: Float32Array;
  private readonly hasRestVerts: boolean[] = [];
  private readonly constraints: DistConstraint[] = [];

  private readonly heightGridSize = 29;
  private readonly heightHalfExtent = 0.52;
  private heightOriginX = 0;
  private heightOriginZ = 0;
  private heightMap: Float32Array | null = null;
  private fallbackSurfaceY = 1.04;

  private initialized = false;
  private lastSimTime = -1;

  private readonly tmpTargetMat = new THREE.Matrix4();
  private readonly tmpScale = new THREE.Vector3(1, 1, 1);
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpN = new THREE.Vector3();

  constructor(
    width: number,
    height: number,
    material: THREE.Material,
    segX = 6,
    segZ = 10
  ) {
    this.cols = segX + 1;
    this.rows = segZ + 1;
    this.count = this.cols * this.rows;

    const geom = new THREE.PlaneGeometry(width, height, segX, segZ);
    geom.rotateX(-Math.PI / 2);

    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    this.baseLocal = new Float32Array(posAttr.array as Float32Array);
    this.pos = new Float32Array(this.count * 3);
    this.prevPos = new Float32Array(this.count * 3);
    this.targetVerts = new Float32Array(this.count * 3);
    this.pinchWeights = new Float32Array(this.count);
    this.restVerts = new Float32Array(this.count * 3);

    // Pinch center lies near the top-center header where Helen's thumb & index meet (z = -0.142)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const lx = this.baseLocal[idx * 3];
        const lz = this.baseLocal[idx * 3 + 2];
        const distFromPinch = Math.hypot(lx, lz + 0.142);
        const padT = 1 - THREE.MathUtils.smoothstep(distFromPinch, 0.016, 0.052);
        // Mild cantilever weight along the very top edge (r <= 2) keeps top corners slightly supported like bond paper
        const topCantilever = r <= 2 ? (1 - r / 3) * 0.24 : 0;
        this.pinchWeights[idx] = Math.max(padT, topCantilever);
        this.hasRestVerts.push(false);
      }
    }

    this.buildConstraints();

    this.mesh = new THREE.Mesh(geom, material);
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
  }

  private buildConstraints(): void {
    const idxOf = (r: number, c: number) => r * this.cols + c;
    const addPair = (a: number, b: number, stiffness: number) => {
      const dx = this.baseLocal[b * 3] - this.baseLocal[a * 3];
      const dy = this.baseLocal[b * 3 + 1] - this.baseLocal[a * 3 + 1];
      const dz = this.baseLocal[b * 3 + 2] - this.baseLocal[a * 3 + 2];
      const restLen = Math.hypot(dx, dy, dz);
      if (restLen > 1e-5) {
        this.constraints.push({ a, b, restLen, stiffness });
      }
    };

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cur = idxOf(r, c);
        if (c + 1 < this.cols) addPair(cur, idxOf(r, c + 1), 0.96);
        if (r + 1 < this.rows) addPair(cur, idxOf(r + 1, c), 0.96);
        if (c + 1 < this.cols && r + 1 < this.rows) addPair(cur, idxOf(r + 1, c + 1), 0.85);
        if (c - 1 >= 0 && r + 1 < this.rows) addPair(cur, idxOf(r + 1, c - 1), 0.85);
        // 2-hop, 3-hop & 4-hop bending constraints give crisp A4-paper stiffness instead of floppy fabric
        if (c + 2 < this.cols) addPair(cur, idxOf(r, c + 2), 0.45);
        if (r + 2 < this.rows) addPair(cur, idxOf(r + 2, c), 0.45);
        if (c + 3 < this.cols) addPair(cur, idxOf(r, c + 3), 0.25);
        if (r + 3 < this.rows) addPair(cur, idxOf(r + 3, c), 0.25);
        if (c + 4 < this.cols) addPair(cur, idxOf(r, c + 4), 0.14);
        if (r + 4 < this.rows) addPair(cur, idxOf(r + 4, c), 0.14);
      }
    }
  }

  /**
   * Builds a local world-space heightmap over the reception desk around `center`
   * (with a 3x3 max filter so intermediate triangle edges also clear raised desk pads/rims).
   * Returns the highest detected desk Y inside the target resting paper footprint.
   */
  public buildDeskHeightMap(
    deskObject: THREE.Object3D | undefined,
    centerX: number,
    centerZ: number,
    fallbackY: number,
    paperYaw: number
  ): number {
    this.fallbackSurfaceY = fallbackY;
    // Offset heightmap origin toward Helen's side of the counter so the entire carry path over the desk is covered
    this.heightOriginX = centerX - 0.17 - this.heightHalfExtent;
    this.heightOriginZ = centerZ - 0.10 - this.heightHalfExtent;

    if (!deskObject) {
      this.heightMap = null;
      return fallbackY;
    }

    deskObject.updateMatrixWorld(true);
    const n = this.heightGridSize;
    const raw = new Float32Array(n * n);
    const step = (this.heightHalfExtent * 2) / (n - 1);
    const ray = new THREE.Raycaster();
    const rayOrig = new THREE.Vector3();
    const rayDir = new THREE.Vector3(0, -1, 0);
    ray.near = 0.05;
    ray.far = 2.0;

    for (let rz = 0; rz < n; rz++) {
      for (let cx = 0; cx < n; cx++) {
        const wx = this.heightOriginX + cx * step;
        const wz = this.heightOriginZ + rz * step;
        rayOrig.set(wx, 2.2, wz);
        ray.set(rayOrig, rayDir);
        const hits = ray.intersectObject(deskObject, true);
        let topY = fallbackY;
        for (let hi = 0; hi < hits.length; hi++) {
          const hy = hits[hi].point.y;
          if (hy > fallbackY - 0.08 && hy < fallbackY + 0.05) {
            topY = hy;
            break;
          }
        }
        raw[rz * n + cx] = topY;
      }
    }

    // 3x3 dilation prevents triangle chords between neighboring grid vertices from dipping into stepped rims
    const dilated = new Float32Array(n * n);
    for (let rz = 0; rz < n; rz++) {
      for (let cx = 0; cx < n; cx++) {
        let best = raw[rz * n + cx];
        for (let dz = -1; dz <= 1; dz++) {
          const nz = THREE.MathUtils.clamp(rz + dz, 0, n - 1);
          for (let dx = -1; dx <= 1; dx++) {
            const nx = THREE.MathUtils.clamp(cx + dx, 0, n - 1);
            const v = raw[nz * n + nx];
            if (v > best) best = v;
          }
        }
        dilated[rz * n + cx] = best;
      }
    }
    this.heightMap = dilated;

    // Sample the paper's actual rest footprint and precompute target resting X/Z coords
    const restQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, paperYaw, 0, 'YXZ'));
    this.tmpTargetMat.compose(new THREE.Vector3(centerX, 0, centerZ), restQuat, this.tmpScale);
    let maxFootprintY = fallbackY;
    for (let i = 0; i < this.count; i++) {
      this.tmpV.set(this.baseLocal[i * 3], this.baseLocal[i * 3 + 1], this.baseLocal[i * 3 + 2]);
      this.tmpV.applyMatrix4(this.tmpTargetMat);
      this.restVerts[i * 3] = this.tmpV.x;
      this.restVerts[i * 3 + 1] = this.sampleSurfaceY(this.tmpV.x, this.tmpV.z);
      this.restVerts[i * 3 + 2] = this.tmpV.z;
      this.hasRestVerts[i] = true;
      if (this.restVerts[i * 3 + 1] > maxFootprintY) {
        maxFootprintY = this.restVerts[i * 3 + 1];
      }
    }
    return maxFootprintY;
  }

  public sampleSurfaceY(wx: number, wz: number): number {
    const span = this.heightHalfExtent * 2;
    if (
      wx < this.heightOriginX ||
      wx > this.heightOriginX + span ||
      wz < this.heightOriginZ ||
      wz > this.heightOriginZ + span
    ) {
      // Outside the counter placement footprint (e.g. near the lower side drawer): no false counter lift
      return this.fallbackSurfaceY - 0.35;
    }
    if (!this.heightMap) return this.fallbackSurfaceY;
    const n = this.heightGridSize;
    const fx = THREE.MathUtils.clamp(((wx - this.heightOriginX) / span) * (n - 1), 0, n - 1);
    const fz = THREE.MathUtils.clamp(((wz - this.heightOriginZ) / span) * (n - 1), 0, n - 1);
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = Math.min(n - 1, x0 + 1);
    const z1 = Math.min(n - 1, z0 + 1);
    const tx = fx - x0;
    const tz = fz - z0;
    const h00 = this.heightMap[z0 * n + x0];
    const h10 = this.heightMap[z0 * n + x1];
    const h01 = this.heightMap[z1 * n + x0];
    const h11 = this.heightMap[z1 * n + x1];
    const hx0 = THREE.MathUtils.lerp(h00, h10, tx);
    const hx1 = THREE.MathUtils.lerp(h01, h11, tx);
    return THREE.MathUtils.lerp(hx0, hx1, tz);
  }

  public reset(): void {
    this.initialized = false;
    this.lastSimTime = -1;
  }

  /**
   * Advances soft-body simulation and writes deformed world-space vertex positions + normals.
   * `gripStrength` blends from `1` (pinched between Helen's thumb & index) down to `0` (released on desk).
   * `restGuideStrength` gently aligns horizontal X/Z after release while letting Y drape & collide strictly above desk.
   */
  public step(
    t: number,
    dt: number,
    targetPos: THREE.Vector3,
    targetQuat: THREE.Quaternion,
    gripStrength: number,
    restGuideStrength: number
  ): void {
    const deskCollideBlend = THREE.MathUtils.smoothstep(t, 36.45, 36.95);
    const collideDesk = deskCollideBlend > 0.001;
    const floorOffset = THREE.MathUtils.lerp(-0.22, 0.006, deskCollideBlend);
    this.tmpTargetMat.compose(targetPos, targetQuat, this.tmpScale);
    for (let i = 0; i < this.count; i++) {
      this.tmpV.set(this.baseLocal[i * 3], this.baseLocal[i * 3 + 1], this.baseLocal[i * 3 + 2]);
      this.tmpV.applyMatrix4(this.tmpTargetMat);
      this.targetVerts[i * 3] = this.tmpV.x;
      if (collideDesk) {
        const minY = this.sampleSurfaceY(this.tmpV.x, this.tmpV.z) + floorOffset;
        this.targetVerts[i * 3 + 1] = Math.max(this.tmpV.y, minY);
      } else {
        this.targetVerts[i * 3 + 1] = this.tmpV.y;
      }
      this.targetVerts[i * 3 + 2] = this.tmpV.z;
    }

    const scrubbed = this.lastSimTime >= 0 && Math.abs(t - this.lastSimTime) > 0.25;
    if (!this.initialized || scrubbed) {
      this.pos.set(this.targetVerts);
      this.prevPos.set(this.targetVerts);
      this.initialized = true;
      this.lastSimTime = t;
      this.commitGeometry();
      return;
    }

    const frameDt = THREE.MathUtils.clamp(dt > 0 ? dt : t - this.lastSimTime, 0, 1 / 30);
    this.lastSimTime = t;
    if (frameDt <= 1e-5) {
      this.commitGeometry();
      return;
    }

    const substeps = 5;
    const subDt = frameDt / substeps;
    const gravSq = -8.6 * subDt * subDt;
    const grip = THREE.MathUtils.clamp(gripStrength, 0, 1);
    const guide = THREE.MathUtils.clamp(restGuideStrength, 0, 1);

    for (let s = 0; s < substeps; s++) {
      // 1) Verlet step + aerodynamic normal drag + gravity
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const i = r * this.cols + c;
          const i3 = i * 3;
          let vx = (this.pos[i3] - this.prevPos[i3]) * 0.965;
          let vy = (this.pos[i3 + 1] - this.prevPos[i3 + 1]) * 0.965;
          let vz = (this.pos[i3 + 2] - this.prevPos[i3 + 2]) * 0.965;

          // Approximate local sheet normal for crisp air resistance
          const cl = Math.max(0, c - 1);
          const cr = Math.min(this.cols - 1, c + 1);
          const ru = Math.max(0, r - 1);
          const rd = Math.min(this.rows - 1, r + 1);
          const il = (r * this.cols + cl) * 3;
          const ir = (r * this.cols + cr) * 3;
          const iu = (ru * this.cols + c) * 3;
          const id = (rd * this.cols + c) * 3;
          this.tmpA.set(this.pos[ir] - this.pos[il], this.pos[ir + 1] - this.pos[il + 1], this.pos[ir + 2] - this.pos[il + 2]);
          this.tmpB.set(this.pos[id] - this.pos[iu], this.pos[id + 1] - this.pos[iu + 1], this.pos[id + 2] - this.pos[iu + 2]);
          this.tmpN.crossVectors(this.tmpA, this.tmpB);
          const nLenSq = this.tmpN.lengthSq();
          if (nLenSq > 1e-10) {
            this.tmpN.divideScalar(Math.sqrt(nLenSq));
            const vDotN = vx * this.tmpN.x + vy * this.tmpN.y + vz * this.tmpN.z;
            const aero = 0.14;
            vx -= this.tmpN.x * vDotN * aero;
            vy -= this.tmpN.y * vDotN * aero;
            vz -= this.tmpN.z * vDotN * aero;
          }

          this.prevPos[i3] = this.pos[i3];
          this.prevPos[i3 + 1] = this.pos[i3 + 1];
          this.prevPos[i3 + 2] = this.pos[i3 + 2];

          this.pos[i3] += vx;
          this.pos[i3 + 1] += vy + gravSq;
          this.pos[i3 + 2] += vz;
        }
      }

      // 2) Pinch attachment + mild crisp-paper shape memory while held + horizontal settle guide on release
      for (let r = 0; r < this.rows; r++) {
        const rowT = r / (this.rows - 1);
        const holdFlex = (0.075 * (1 - rowT) + 0.022) * grip;
        for (let c = 0; c < this.cols; c++) {
          const i = r * this.cols + c;
          const i3 = i * 3;
          const pw = Math.max(this.pinchWeights[i] * grip, holdFlex);
          if (pw > 0.001) {
            this.pos[i3] = THREE.MathUtils.lerp(this.pos[i3], this.targetVerts[i3], pw);
            this.pos[i3 + 1] = THREE.MathUtils.lerp(this.pos[i3 + 1], this.targetVerts[i3 + 1], pw);
            this.pos[i3 + 2] = THREE.MathUtils.lerp(this.pos[i3 + 2], this.targetVerts[i3 + 2], pw);
          }
          if (guide > 0.001 && this.hasRestVerts[i]) {
            const gk = guide * 0.28;
            this.pos[i3] = THREE.MathUtils.lerp(this.pos[i3], this.restVerts[i3], gk);
            this.pos[i3 + 2] = THREE.MathUtils.lerp(this.pos[i3 + 2], this.restVerts[i3 + 2], gk);
          }
        }
      }

      // 3) Iterative structural, shear & bending relaxation + desk surface collision
      const solverIters = 4;
      for (let it = 0; it < solverIters; it++) {
        for (let k = 0; k < this.constraints.length; k++) {
          const con = this.constraints[k];
          const a3 = con.a * 3;
          const b3 = con.b * 3;
          const dx = this.pos[b3] - this.pos[a3];
          const dy = this.pos[b3 + 1] - this.pos[a3 + 1];
          const dz = this.pos[b3 + 2] - this.pos[a3 + 2];
          const dist = Math.hypot(dx, dy, dz);
          if (dist < 1e-6) continue;

          const pinA = this.pinchWeights[con.a] * grip;
          const pinB = this.pinchWeights[con.b] * grip;
          const wA = Math.max(0.02, 1 - pinA);
          const wB = Math.max(0.02, 1 - pinB);
          const wSum = wA + wB;
          const diff = ((dist - con.restLen) / dist) * con.stiffness;

          this.pos[a3] += dx * diff * (wA / wSum);
          this.pos[a3 + 1] += dy * diff * (wA / wSum);
          this.pos[a3 + 2] += dz * diff * (wA / wSum);
          this.pos[b3] -= dx * diff * (wB / wSum);
          this.pos[b3 + 1] -= dy * diff * (wB / wSum);
          this.pos[b3 + 2] -= dz * diff * (wB / wSum);
        }

        // Strict tabletop collision on every pass: paper vertices can never penetrate the desk or sloped pad
        if (collideDesk) {
          for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const floorLimitY = this.sampleSurfaceY(this.pos[i3], this.pos[i3 + 2]) + floorOffset;
            if (this.pos[i3 + 1] < floorLimitY) {
              this.pos[i3 + 1] = floorLimitY;
              // Tabletop contact friction & zero downward penetration memory
              this.prevPos[i3] = THREE.MathUtils.lerp(this.prevPos[i3], this.pos[i3], 0.35);
              this.prevPos[i3 + 1] = floorLimitY;
              this.prevPos[i3 + 2] = THREE.MathUtils.lerp(this.prevPos[i3 + 2], this.pos[i3 + 2], 0.35);
            }
          }
        }
      }
    }

    this.commitGeometry();
  }

  private commitGeometry(): void {
    const posAttr = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    arr.set(this.pos);
    posAttr.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
  }
}
