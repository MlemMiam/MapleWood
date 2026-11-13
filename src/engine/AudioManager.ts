import { Howl, Howler } from 'howler';

function encodeWavDataUri(samples: Float32Array, sampleRate = 22050): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function synthFootstep(freq: number, decay: number): string {
  const sr = 22050;
  const len = Math.floor(sr * 0.14);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-t * decay);
    const thud = Math.sin(2 * Math.PI * freq * t * Math.exp(-t * 8));
    const grit = (Math.random() * 2 - 1) * 0.25;
    data[i] = (thud * 0.65 + grit) * env * 0.45;
  }
  return encodeWavDataUri(data, sr);
}

function synthDoor(): string {
  const sr = 22050;
  const len = Math.floor(sr * 0.24);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 14);
    const click = Math.sin(2 * Math.PI * 190 * t) * 0.5 + Math.sin(2 * Math.PI * 420 * t) * 0.3;
    data[i] = click * env * 0.5;
  }
  return encodeWavDataUri(data, sr);
}

function synthDing(): string {
  const sr = 22050;
  const len = Math.floor(sr * 0.36);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 9);
    const tone =
      Math.sin(2 * Math.PI * 784 * t) * 0.55 +
      Math.sin(2 * Math.PI * 1174.6 * t) * 0.35;
    data[i] = tone * env * 0.4;
  }
  return encodeWavDataUri(data, sr);
}

function synthAmbientLoop(): string {
  const sr = 11025;
  const len = sr * 3;
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const fade = Math.sin((t / 3) * Math.PI);
    const chord =
      Math.sin(2 * Math.PI * 130.8 * t) * 0.12 +
      Math.sin(2 * Math.PI * 196.0 * t) * 0.08 +
      Math.sin(2 * Math.PI * 261.6 * t) * 0.06;
    data[i] = chord * (0.4 + 0.6 * fade) * 0.25;
  }
  return encodeWavDataUri(data, sr);
}

/**
 * Synthesizes a seamless 4-second looping fountain water sound:
 * - Warm cascading water rush (band-filtered pink/brown noise)
 * - Gentle basin splash modulation (periodic crossfaded envelope)
 * - Crystalline water droplets & bubbling ripples that wrap seamlessly across the loop boundary
 */
function synthFountainWaterLoop(): string {
  const sr = 22050;
  const duration = 4.0;
  const len = Math.floor(sr * duration);
  const data = new Float32Array(len);

  // Deterministic PRNG so loop texture is consistent
  let seed = 133742;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // 1) Continuous cascading water rush (filtered noise with cyclic state warm-up)
  let lp1 = 0;
  let lp2 = 0;
  let hp = 0;
  // Warm up filter state for seamless wrap
  for (let w = 0; w < 2048; w++) {
    const white = rand() * 2 - 1;
    lp1 += 0.16 * (white - lp1);
    lp2 += 0.045 * (white - lp2);
    hp = lp1 - lp2;
  }

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const phase = (t / duration) * Math.PI * 2;
    const white = rand() * 2 - 1;

    // Band-passed cascading stream + soft low-frequency basin murmur
    lp1 += 0.16 * (white - lp1);
    lp2 += 0.045 * (white - lp2);
    hp = lp1 - lp2;

    const cascadeMod =
      0.78 +
      0.14 * Math.sin(phase * 2.0) +
      0.08 * Math.cos(phase * 5.0 + 0.7);
    data[i] = (hp * 0.34 + lp2 * 0.22) * cascadeMod;
  }

  // 2) Add 68 crystalline water droplets / bubbles wrapped toroidally across the buffer
  for (let d = 0; d < 68; d++) {
    const startIdx = Math.floor(rand() * len);
    const dropDur = 0.028 + rand() * 0.036;
    const dropSamples = Math.floor(sr * dropDur);
    const baseFreq = 620 + rand() * 1150;
    const chirpRate = 5.5 + rand() * 6.0;
    const amp = 0.045 + rand() * 0.055;

    for (let j = 0; j < dropSamples; j++) {
      const jt = j / sr;
      // Upward pitch chirp characteristic of air bubbles rising in water
      const instPhase = 2 * Math.PI * baseFreq * jt * (1 + chirpRate * jt);
      const win = Math.sin((j / dropSamples) * Math.PI) * Math.exp(-jt * 36);
      const idx = (startIdx + j) % len;
      data[idx] += Math.sin(instPhase) * win * amp;
    }
  }

  // 3) Smooth cross-fade at loop seam (first/last 1024 samples) for zero-click looping
  const seam = 1024;
  for (let i = 0; i < seam; i++) {
    const alpha = i / seam;
    const head = data[i];
    const tail = data[len - seam + i];
    const blended = tail * (1 - alpha) + head * alpha;
    data[i] = blended;
    data[len - seam + i] = blended * (1 - alpha) + tail * alpha;
  }

  return encodeWavDataUri(data, sr);
}

export class AudioManager {
  private footstepHard: Howl;
  private footstepGrass: Howl;
  private doorSfx: Howl;
  private dingSfx: Howl;
  private ambientLoop: Howl;
  private fountainLoop: Howl;
  private startedAmbient = false;
  private lastFountainVol = 0;

  constructor(initialVolume = 0.65) {
    Howler.volume(initialVolume);
    this.footstepHard = new Howl({ src: [synthFootstep(145, 28)], volume: 0.38 });
    this.footstepGrass = new Howl({ src: [synthFootstep(95, 22)], volume: 0.32 });
    this.doorSfx = new Howl({ src: [synthDoor()], volume: 0.5 });
    this.dingSfx = new Howl({ src: [synthDing()], volume: 0.45 });
    this.ambientLoop = new Howl({
      src: [synthAmbientLoop()],
      loop: true,
      volume: 0.18,
    });
    this.fountainLoop = new Howl({
      src: [synthFountainWaterLoop()],
      loop: true,
      volume: 0.24,
    });
  }

  public setVolume(v: number): void {
    Howler.volume(Math.max(0, Math.min(1, v)));
  }

  public startAmbient(): void {
    if (this.startedAmbient) return;
    this.startedAmbient = true;
    try {
      this.ambientLoop.play();
      this.fountainLoop.play();
    } catch {
      // Autoplay blocked until next interaction
    }
  }

  public pauseLoops(): void {
    if (this.ambientLoop.playing()) {
      this.ambientLoop.pause();
    }
    if (this.fountainLoop.playing()) {
      this.fountainLoop.pause();
    }
  }

  public resumeLoops(): void {
    if (this.startedAmbient && !this.ambientLoop.playing()) {
      this.ambientLoop.play();
    }
    if (this.startedAmbient && !this.fountainLoop.playing()) {
      this.fountainLoop.play();
    }
  }

  /**
   * Spatial 3D distance attenuation for the central courtyard fountain at (X = 0, Z = 15.5).
   */
  public updateFountainSpatialAudio(
    playerX: number,
    playerZ: number,
    isExterior: boolean
  ): void {
    if (!this.startedAmbient) return;
    const dx = playerX - 0;
    const dz = playerZ - 15.5;
    const dist = Math.hypot(dx, dz);
    const maxRange = 36;
    let targetVol = 0;
    if (dist < maxRange) {
      const norm = Math.max(0, 1 - dist / maxRange);
      // Smooth quadratic proximity curve peaking at 0.46 near the basin rim
      const indoorFactor = isExterior ? 1.0 : 0.22;
      targetVol = Math.min(0.46, (norm * norm * 0.44 + norm * 0.06) * indoorFactor);
    }
    if (Math.abs(targetVol - this.lastFountainVol) > 0.008) {
      this.lastFountainVol = targetVol;
      this.fountainLoop.volume(targetVol);
    }
  }

  public playFootstep(surface: 'grass' | 'hard'): void {
    const howl = surface === 'grass' ? this.footstepGrass : this.footstepHard;
    howl.rate(0.92 + Math.random() * 0.16);
    howl.play();
  }

  public playDoor(): void {
    this.doorSfx.play();
  }

  public playInteractDing(): void {
    this.dingSfx.play();
  }

  public dispose(): void {
    this.footstepHard.unload();
    this.footstepGrass.unload();
    this.doorSfx.unload();
    this.dingSfx.unload();
    this.ambientLoop.unload();
    this.fountainLoop.unload();
  }
}
