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

/**
 * Synthesizes an upbeat 7.5-second J-Pop / Slice-of-Life Anime Opening theme loop:
 * - Bright bell/celesta lead melody over warm maj7/7th anime chords (Fmaj7 - G7 - Em7 - Am7)
 * - Bouncy synth bassline and light rhythmic hi-hat pulse
 */
function synthAnimeOpeningMusicLoop(): string {
  const sr = 22050;
  const beatDur = 60 / 128; // 128 BPM (0.46875s per beat)
  const totalBeats = 16; // 4 bars of 4/4 = 7.5 seconds
  const duration = totalBeats * beatDur;
  const len = Math.floor(sr * duration);
  const data = new Float32Array(len);

  // 4-bar anime progression: Fmaj7 | G7 | Em7 | Am7 (4 beats each)
  const chords = [
    [349.23, 440.0, 523.25, 659.25], // Fmaj7
    [392.0, 493.88, 587.33, 698.46], // G7
    [329.63, 392.0, 493.88, 587.33], // Em7
    [440.0, 523.25, 659.25, 783.99], // Am7
  ];
  const bassNotes = [174.61, 196.0, 164.81, 220.0];

  // Bright pentatonic anime melody (in eighth notes, 32 steps)
  const melodyHz = [
    659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25, 523.25,
    587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 0,
    659.25, 783.99, 987.77, 1046.5, 987.77, 783.99, 659.25, 587.33,
    523.25, 659.25, 880.0, 1046.5, 1174.66, 1046.5, 880.0, 783.99,
  ];

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const beatFloat = t / beatDur;
    const barIdx = Math.min(3, Math.floor(beatFloat / 4));
    const eighthIdx = Math.min(31, Math.floor(beatFloat * 2));
    const eighthPhase = (beatFloat * 2) % 1;
    const beatPhase = beatFloat % 1;

    // 1) Warm electric-piano chord pad
    const chord = chords[barIdx];
    let pad = 0;
    const chordEnv = 0.65 + 0.35 * Math.exp(-beatPhase * 3.5);
    for (let c = 0; c < chord.length; c++) {
      pad += Math.sin(2 * Math.PI * chord[c] * t) * 0.048;
    }
    pad *= chordEnv;

    // 2) Bouncy octave bassline
    const bassFreq = bassNotes[barIdx] * (beatPhase > 0.5 ? 2 : 1);
    const bassEnv = Math.exp(-((beatPhase * 2) % 1) * 5.2);
    const bass =
      (Math.sin(2 * Math.PI * bassFreq * t) + 0.3 * Math.sin(4 * Math.PI * bassFreq * t)) *
      bassEnv *
      0.11;

    // 3) Sparkling anime bell/celesta lead melody
    const noteFreq = melodyHz[eighthIdx];
    let lead = 0;
    if (noteFreq > 0) {
      const noteTime = eighthPhase * (beatDur * 0.5);
      const env = Math.exp(-noteTime * 7.5);
      lead =
        (Math.sin(2 * Math.PI * noteFreq * t) * 0.7 +
          Math.sin(2 * Math.PI * noteFreq * 2 * t) * 0.25 +
          Math.sin(2 * Math.PI * noteFreq * 3 * t) * 0.08) *
        env *
        0.16;
    }

    // 4) Crisp anime hi-hat / tambourine pulse on eighth notes
    const hatEnv = Math.exp(-eighthPhase * 28);
    const pseudoNoise = Math.sin(i * 12.9898) * 43758.5453;
    const white = (pseudoNoise - Math.floor(pseudoNoise)) * 2 - 1;
    const hat = white * hatEnv * 0.035;

    data[i] = Math.max(-0.95, Math.min(0.95, pad + bass + lead + hat));
  }

  return encodeWavDataUri(data, sr);
}

/**
 * Synthesizes an anime "kira-kira" (sparkle) chime when Florie beams with a big smile.
 */
function synthAnimeSparkle(): string {
  const sr = 22050;
  const dur = 0.72;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);
  const notes = [1046.5, 1318.5, 1567.98, 2093.0, 2637.0, 3135.96];

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let sum = 0;
    for (let n = 0; n < notes.length; n++) {
      const onset = n * 0.075;
      if (t >= onset) {
        const dt = t - onset;
        const env = Math.exp(-dt * 11);
        sum +=
          (Math.sin(2 * Math.PI * notes[n] * dt) +
            0.35 * Math.sin(2 * Math.PI * notes[n] * 2 * dt)) *
          env *
          0.16;
      }
    }
    data[i] = sum;
  }
  return encodeWavDataUri(data, sr);
}

/**
 * Synthesizes a light anime hand-wave whoosh + cheerful bell accent.
 */
function synthAnimeWaveWhoosh(): string {
  const sr = 22050;
  const dur = 0.42;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.sin((t / dur) * Math.PI) * Math.exp(-t * 4.5);
    const sweepFreq = 380 + 540 * Math.sin((t / dur) * Math.PI);
    const chime = Math.sin(2 * Math.PI * 1174.66 * t) * Math.exp(-t * 12) * 0.22;
    const airy = Math.sin(2 * Math.PI * sweepFreq * t) * env * 0.24;
    data[i] = airy + chime;
  }
  return encodeWavDataUri(data, sr);
}

/**
 * Synthesizes an upbeat twin-note anime "Follow me! / Suis-moi !" beckon chime.
 */
function synthAnimeBeckonChime(): string {
  const sr = 22050;
  const dur = 0.55;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    if (t < 0.22) {
      const env = Math.exp(-t * 12);
      s += Math.sin(2 * Math.PI * 880.0 * t) * env * 0.32;
    }
    if (t >= 0.16) {
      const dt = t - 0.16;
      const env = Math.exp(-dt * 8.5);
      s +=
        (Math.sin(2 * Math.PI * 1318.5 * dt) + 0.3 * Math.sin(2 * Math.PI * 2637.0 * dt)) *
        env *
        0.34;
    }
    data[i] = s;
  }
  return encodeWavDataUri(data, sr);
}

/**
 * Synthesizes a cheerful feminine anime vocal inflection burst (formant-filtered harmonic syllables)
 * so Florie always has an immediate, lively female anime voice cue alongside speech synthesis.
 */
function synthAnimeFemaleVoiceCue(variant: 0 | 1): string {
  const sr = 22050;
  const dur = variant === 0 ? 0.68 : 0.62;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f0 =
      variant === 0
        ? t < 0.28
          ? 330 + t * 180
          : 390 + Math.sin((t - 0.28) * 9) * 55
        : t < 0.25
          ? 350 + t * 220
          : 440 - (t - 0.25) * 110;

    const sylEnv =
      t < 0.26
        ? Math.sin((t / 0.26) * Math.PI)
        : t > 0.3
          ? Math.sin(((t - 0.3) / (dur - 0.3)) * Math.PI) * Math.exp(-(t - 0.3) * 3.2)
          : 0;

    const wave =
      Math.sin(2 * Math.PI * f0 * t) * 0.55 +
      Math.sin(2 * Math.PI * f0 * 2 * t) * 0.32 +
      Math.sin(2 * Math.PI * f0 * 3 * t) * 0.14;

    data[i] = wave * sylEnv * 0.28;
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
  private animeMusicLoop: Howl;
  private animeSparkleSfx: Howl;
  private animeWaveSfx: Howl;
  private animeBeckonSfx: Howl;
  private florieVoiceCue0: Howl;
  private florieVoiceCue1: Howl;
  private startedAmbient = false;
  private lastFountainVol = 0;
  private activeVoiceHowl: Howl | null = null;

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
    this.animeMusicLoop = new Howl({
      src: [synthAnimeOpeningMusicLoop()],
      loop: true,
      volume: 0.36,
    });
    this.animeSparkleSfx = new Howl({
      src: [synthAnimeSparkle()],
      volume: 0.48,
    });
    this.animeWaveSfx = new Howl({
      src: [synthAnimeWaveWhoosh()],
      volume: 0.42,
    });
    this.animeBeckonSfx = new Howl({
      src: [synthAnimeBeckonChime()],
      volume: 0.46,
    });
    this.florieVoiceCue0 = new Howl({
      src: [synthAnimeFemaleVoiceCue(0)],
      volume: 0.42,
    });
    this.florieVoiceCue1 = new Howl({
      src: [synthAnimeFemaleVoiceCue(1)],
      volume: 0.42,
    });
  }

  public setVolume(v: number): void {
    Howler.volume(Math.max(0, Math.min(1, v)));
  }

  public startAnimeIntroMusic(): void {
    try {
      if (this.ambientLoop.playing()) {
        this.ambientLoop.pause();
      }
      if (!this.animeMusicLoop.playing()) {
        this.animeMusicLoop.seek(0);
        this.animeMusicLoop.play();
      }
      if (!this.fountainLoop.playing()) {
        this.fountainLoop.volume(0.14);
        this.fountainLoop.play();
      }
    } catch {
      // Autoplay blocked until interaction
    }
  }

  public stopAnimeIntroMusic(): void {
    if (this.animeMusicLoop.playing()) {
      this.animeMusicLoop.stop();
    }
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public playAnimeIntroSfx(type: 'sparkle' | 'wave' | 'beckon'): void {
    if (type === 'sparkle') {
      this.animeSparkleSfx.play();
    } else if (type === 'wave') {
      this.animeWaveSfx.play();
    } else if (type === 'beckon') {
      this.animeBeckonSfx.play();
    }
  }

  public playFlorieVoiceLine(lineIndex: 0 | 1, text: string): void {
    if (lineIndex === 0) {
      this.florieVoiceCue0.play();
    } else {
      this.florieVoiceCue1.play();
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'fr-FR';
        utter.pitch = 1.38;
        utter.rate = 1.08;
        utter.volume = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const frVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('fr'));
        const femaleVoice =
          frVoices.find((v) =>
            /amelie|amélie|audrey|aurélie|aurelie|marie|hortense|julie|eloise|éloïse|denise|vivienne|female|femme|google français/i.test(
              v.name
            )
          ) || frVoices[0];
        if (femaleVoice) {
          utter.voice = femaleVoice;
        }
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore speech synthesis errors on unsupported platforms
      }
    }
  }

  public startAmbient(): void {
    this.stopAnimeIntroMusic();
    this.startedAmbient = true;
    try {
      if (!this.ambientLoop.playing()) {
        this.ambientLoop.play();
      }
      if (!this.fountainLoop.playing()) {
        this.fountainLoop.play();
      }
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
    if (this.animeMusicLoop.playing()) {
      this.animeMusicLoop.pause();
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
    this.stopAnimeIntroMusic();
    this.footstepHard.unload();
    this.footstepGrass.unload();
    this.doorSfx.unload();
    this.dingSfx.unload();
    this.ambientLoop.unload();
    this.fountainLoop.unload();
    this.animeMusicLoop.unload();
    this.animeSparkleSfx.unload();
    this.animeWaveSfx.unload();
    this.animeBeckonSfx.unload();
    this.florieVoiceCue0.unload();
    this.florieVoiceCue1.unload();
  }
}
