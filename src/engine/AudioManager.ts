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

export class AudioManager {
  private footstepHard: Howl;
  private footstepGrass: Howl;
  private doorSfx: Howl;
  private dingSfx: Howl;
  private ambientLoop: Howl;
  private startedAmbient = false;

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
  }

  public setVolume(v: number): void {
    Howler.volume(Math.max(0, Math.min(1, v)));
  }

  public startAmbient(): void {
    if (this.startedAmbient) return;
    this.startedAmbient = true;
    try {
      this.ambientLoop.play();
    } catch {
      // Autoplay blocked until next interaction
    }
  }

  public pauseLoops(): void {
    if (this.ambientLoop.playing()) {
      this.ambientLoop.pause();
    }
  }

  public resumeLoops(): void {
    if (this.startedAmbient && !this.ambientLoop.playing()) {
      this.ambientLoop.play();
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
  }
}
