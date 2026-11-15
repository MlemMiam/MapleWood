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

function synthFootstep(surface: 'hard' | 'grass', variant = 0): string {
  const sr = 44100;
  const dur = surface === 'grass' ? 0.145 : 0.115;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);

  // Warm 2-pole low-pass filtered noise + damped sub-thump (zero metallic ringing)
  const cutoffHz = surface === 'grass' ? 980 + variant * 90 : 680 + variant * 75;
  const alpha = (2 * Math.PI * cutoffHz) / (sr + 2 * Math.PI * cutoffHz);
  const hpAlpha = (2 * Math.PI * 140) / (sr + 2 * Math.PI * 140);

  let lp1 = 0;
  let lp2 = 0;
  let hpState = 0;
  let phase1 = 0;
  let phase2 = 0;

  const toeOffset = 0.022 + variant * 0.003;
  const f1Base = surface === 'grass' ? 50 + variant * 3 : 62 + variant * 4;

  let peak = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const white = Math.random() * 2 - 1;
    lp1 += alpha * (white - lp1);
    lp2 += alpha * (lp1 - lp2);
    hpState += hpAlpha * (lp2 - hpState);
    const warmNoise = surface === 'grass' ? lp2 - hpState * 0.55 : lp2;

    let sample = 0;
    if (surface === 'hard') {
      // Heel impact (warm thud + muffled sole tap)
      const atk1 = 1 - Math.exp(-t * 480);
      const env1 = Math.exp(-t * 52) * atk1;
      const f1 = f1Base * (0.45 + 0.55 * Math.exp(-t * 55));
      phase1 += (2 * Math.PI * f1) / sr;
      const thud1 = Math.sin(phase1) * Math.exp(-t * 88);
      sample += thud1 * 0.52 + warmNoise * env1 * 0.85;

      // Subtle toe follow-through tap
      if (t >= toeOffset) {
        const dt = t - toeOffset;
        const atk2 = 1 - Math.exp(-dt * 420);
        const env2 = Math.exp(-dt * 64) * atk2;
        const f2 = (f1Base + 14) * (0.5 + 0.5 * Math.exp(-dt * 60));
        phase2 += (2 * Math.PI * f2) / sr;
        const thud2 = Math.sin(phase2) * Math.exp(-dt * 105);
        sample += (thud2 * 0.22 + warmNoise * env2 * 0.42);
      }
    } else {
      // Grass: soft muffled weight + organic blade rustle
      const atk = 1 - Math.exp(-t * 140);
      const rustleEnv = Math.exp(-t * 25) * atk;
      const f1 = f1Base * (0.5 + 0.5 * Math.exp(-t * 50));
      phase1 += (2 * Math.PI * f1) / sr;
      const thud = Math.sin(phase1) * Math.exp(-t * 82) * atk;
      sample = thud * 0.32 + warmNoise * rustleEnv * 1.15;
    }

    // Smooth fade-out tail to avoid any end click
    const tailRemain = dur - t;
    if (tailRemain < 0.015) {
      sample *= Math.max(0, tailRemain / 0.015);
    }

    data[i] = sample;
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
  }

  const norm = peak > 0.001 ? 0.65 / peak : 1;
  for (let i = 0; i < len; i++) {
    data[i] *= norm;
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

/** Delicate crystalline bell pluck for anime otome UI hover */
function synthUiHover(): string {
  const sr = 22050;
  const dur = 0.085;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.sin(Math.min(1, t / 0.008) * (Math.PI * 0.5)) * Math.exp(-t * 44);
    data[i] = (Math.sin(2 * Math.PI * 1318.5 * t) * 0.65 + Math.sin(2 * Math.PI * 2637 * t) * 0.25) * env * 0.22;
  }
  return encodeWavDataUri(data, sr);
}

/** Crisp warm glass/wood tap for anime UI button click */
function synthUiClick(): string {
  const sr = 22050;
  const dur = 0.11;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 38);
    const freq = 660 + Math.exp(-t * 80) * 320;
    data[i] = (Math.sin(2 * Math.PI * freq * t) * 0.7 + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.3) * env * 0.28;
  }
  return encodeWavDataUri(data, sr);
}

/** Uplifting anime otome 4-note harp/chime arpeggio when starting the game */
function synthUiConfirm(): string {
  const sr = 22050;
  const dur = 0.68;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);
  const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
  for (let n = 0; n < notes.length; n++) {
    const start = Math.floor(n * 0.065 * sr);
    const f = notes[n];
    for (let i = start; i < len; i++) {
      const t = (i - start) / sr;
      const env = Math.sin(Math.min(1, t / 0.01) * (Math.PI * 0.5)) * Math.exp(-t * 7.5);
      data[i] += (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.22) * env * 0.18;
    }
  }
  return encodeWavDataUri(data, sr);
}

/**
 * Synthesizes a cozy, stylish anime Dress-Up Boutique / Salon OST loop
 * (108 BPM, 4 bars = 8.888s, warm Rhodes seventh chords Fmaj9 -> Em7 -> Dm9 -> Cmaj9
 * with a delicate music-box / celesta melody and soft lo-fi brush pulse).
 */
function synthCustomizationBoutiqueMusicLoop(): string {
  const sr = 22050;
  const bpm = 108;
  const beatDur = 60 / bpm;
  const totalBeats = 16; // 4 bars of 4/4
  const dur = totalBeats * beatDur;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);

  const chords = [
    [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
    [164.81, 246.94, 293.66, 349.23, 392.0], // Em7
    [146.83, 220.0, 261.63, 329.63, 392.0], // Dm9
    [130.81, 196.0, 246.94, 293.66, 329.63], // Cmaj9
  ];

  const melodyEighths = [
    659.25, 0, 587.33, 523.25, 659.25, 0, 783.99, 0,
    659.25, 587.33, 523.25, 0, 493.88, 523.25, 587.33, 0,
    523.25, 0, 440.0, 523.25, 659.25, 0, 587.33, 523.25,
    587.33, 659.25, 523.25, 0, 392.0, 440.0, 523.25, 0,
  ];

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const beatFloat = t / beatDur;
    const barIdx = Math.floor(beatFloat / 4) % 4;
    const beatInBar = beatFloat % 4;
    const eighthIdx = Math.floor(beatFloat * 2) % 32;
    const eighthPhase = (beatFloat * 2) % 1;

    const chord = chords[barIdx];

    const tremolo = 0.88 + 0.12 * Math.sin(2 * Math.PI * 3.6 * t);
    const chordEnv = Math.exp(-beatInBar * 0.55) * 0.75 + 0.25;
    let rhodes = 0;
    for (let c = 0; c < chord.length; c++) {
      const f = chord[c];
      rhodes +=
        (Math.sin(2 * Math.PI * f * t) +
          0.2 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-beatInBar * 1.4)) *
        0.045;
    }
    rhodes *= tremolo * chordEnv;

    const beatPhase = beatFloat % 1;
    const bassFreq = beatInBar >= 3 ? chord[0] * 1.5 : chord[0] * 0.5;
    const bassEnv = Math.exp(-beatPhase * 4.8);
    const bass =
      (Math.sin(2 * Math.PI * bassFreq * t) + 0.25 * Math.sin(2 * Math.PI * bassFreq * 2 * t)) *
      bassEnv *
      0.14;

    const melFreq = melodyEighths[eighthIdx];
    let mel = 0;
    if (melFreq > 0) {
      const melEnv = Math.exp(-eighthPhase * 5.2);
      mel =
        (Math.sin(2 * Math.PI * melFreq * t) +
          0.32 * Math.sin(2 * Math.PI * melFreq * 2 * t) * Math.exp(-eighthPhase * 11)) *
        melEnv *
        0.11;
    }

    const shakerEnv = Math.exp(-eighthPhase * 32);
    const pseudo = Math.sin(i * 12.9898) * 43758.5453;
    const noise = (pseudo - Math.floor(pseudo)) * 2 - 1;
    const shaker = noise * shakerEnv * (eighthIdx % 2 === 1 ? 0.022 : 0.01);

    data[i] = Math.max(-0.92, Math.min(0.92, rhodes + bass + mel + shaker));
  }

  return encodeWavDataUri(data, sr);
}

/**
 * Soft fabric rustle + pleasant twin chime when equipping or layering a piece of clothing.
 */
function synthClothEquipSfx(): string {
  const sr = 22050;
  const dur = 0.28;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);
  let prevNoise = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const rustleEnv = Math.sin((t / 0.18) * Math.PI) * (t < 0.18 ? 1 : 0);
    const rawNoise = Math.random() * 2 - 1;
    const filteredNoise = 0.72 * prevNoise + 0.28 * rawNoise;
    prevNoise = filteredNoise;

    const note1 = Math.sin(2 * Math.PI * 659.25 * t) * Math.exp(-t * 16) * 0.24;
    const note2 =
      t >= 0.06
        ? Math.sin(2 * Math.PI * 987.77 * (t - 0.06)) * Math.exp(-(t - 0.06) * 14) * 0.28
        : 0;
    data[i] = filteredNoise * rustleEnv * 0.26 + note1 + note2;
  }
  return encodeWavDataUri(data, sr);
}

/**
 * Crystalline boutique clink when equipping glasses, neck accessories, or hair items.
 */
function synthAccessoryEquipSfx(): string {
  const sr = 22050;
  const dur = 0.32;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);
  const freqs = [1174.66, 1567.98, 2349.32];
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let sum = 0;
    for (let k = 0; k < freqs.length; k++) {
      const onset = k * 0.045;
      if (t >= onset) {
        const dt = t - onset;
        sum += Math.sin(2 * Math.PI * freqs[k] * dt) * Math.exp(-dt * 15) * 0.22;
      }
    }
    data[i] = sum;
  }
  return encodeWavDataUri(data, sr);
}

/**
 * Warm marimba/harp dye droplet tone when selecting a custom color swatch.
 */
function synthColorSwatchSfx(): string {
  const sr = 22050;
  const dur = 0.2;
  const len = Math.floor(sr * dur);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 18);
    const sweep = 740 + 220 * (1 - Math.exp(-t * 26));
    data[i] =
      (Math.sin(2 * Math.PI * sweep * t) + 0.25 * Math.sin(2 * Math.PI * sweep * 2 * t)) *
      env *
      0.3;
  }
  return encodeWavDataUri(data, sr);
}

export class AudioManager {
  private footstepHard: Howl;
  private footstepGrass: Howl;
  private footstepCarpet: Howl;
  private doorSfx: Howl;
  private dingSfx: Howl;
  private uiHoverSfx: Howl;
  private uiClickSfx: Howl;
  private uiConfirmSfx: Howl;
  private clothEquipSfx: Howl;
  private accessoryEquipSfx: Howl;
  private colorSwatchSfx: Howl;
  private customizationMusicLoop: Howl;
  private customizationFadeTimer: number | null = null;
  private ambientLoop: Howl;
  private fountainLoop: Howl;
  private animeMusicLoop: Howl;
  private titleMusicLoop: Howl;
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
    this.footstepHard = new Howl({
      src: ['/assets/audio/footstep_hard.mp3', synthFootstep('hard', 0)],
      volume: 0.38,
    });
    this.footstepGrass = new Howl({
      src: ['/assets/audio/footstep_grass.mp3', synthFootstep('grass', 0)],
      volume: 0.32,
    });
    this.footstepCarpet = new Howl({
      src: ['/assets/audio/footstep_carpet.mp3', synthFootstep('grass', 1)],
      volume: 0.34,
    });
    this.doorSfx = new Howl({ src: [synthDoor()], volume: 0.5 });
    this.dingSfx = new Howl({ src: [synthDing()], volume: 0.45 });
    this.uiHoverSfx = new Howl({ src: [synthUiHover()], volume: 0.24 });
    this.uiClickSfx = new Howl({ src: [synthUiClick()], volume: 0.36 });
    this.uiConfirmSfx = new Howl({ src: [synthUiConfirm()], volume: 0.42 });
    this.clothEquipSfx = new Howl({ src: [synthClothEquipSfx()], volume: 0.42 });
    this.accessoryEquipSfx = new Howl({ src: [synthAccessoryEquipSfx()], volume: 0.4 });
    this.colorSwatchSfx = new Howl({ src: [synthColorSwatchSfx()], volume: 0.36 });
    const boutiqueFallback = synthCustomizationBoutiqueMusicLoop();
    this.customizationMusicLoop = new Howl({
      src: ['/assets/audio/customization_ost.mp3', boutiqueFallback],
      loop: true,
      volume: 0.26,
    });
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
      src: ['/assets/audio/anime_intro_ost.wav', '/assets/audio/anime_intro_music.mp3', synthAnimeOpeningMusicLoop()],
      loop: true,
      volume: 0.34,
    });
    this.titleMusicLoop = new Howl({
      src: ['/assets/audio/title_menu_ost.wav'],
      loop: true,
      volume: 0.28,
      preload: true,
    });
    this.animeSparkleSfx = new Howl({
      src: ['/assets/audio/anime_sparkle.mp3', synthAnimeSparkle()],
      volume: 0.38,
    });
    this.animeWaveSfx = new Howl({
      src: ['/assets/audio/anime_whoosh.mp3', synthAnimeWaveWhoosh()],
      volume: 0.34,
    });
    this.animeBeckonSfx = new Howl({
      src: ['/assets/audio/anime_chime.mp3', synthAnimeBeckonChime()],
      volume: 0.42,
    });
    this.florieVoiceCue0 = new Howl({
      src: ['/assets/audio/florie_intro_1.mp3', synthAnimeFemaleVoiceCue(0)],
      volume: 1.0,
    });
    this.florieVoiceCue1 = new Howl({
      src: ['/assets/audio/florie_intro_2.mp3', synthAnimeFemaleVoiceCue(1)],
      volume: 1.0,
    });
  }

  public setVolume(v: number): void {
    Howler.volume(Math.max(0, Math.min(1, v)));
  }

  public startTitleMusic(): void {
    try {
      if (this.animeMusicLoop.playing()) {
        this.animeMusicLoop.stop();
      }
      if (this.customizationMusicLoop.playing()) {
        this.customizationMusicLoop.stop();
      }
      if (this.ambientLoop.playing()) {
        this.ambientLoop.pause();
      }
      if (!this.titleMusicLoop.playing()) {
        this.titleMusicLoop.volume(0);
        this.titleMusicLoop.seek(0);
        this.titleMusicLoop.play();
        this.titleMusicLoop.fade(0, 0.28, 900);
      }
    } catch {
      // Autoplay blocked until interaction
    }
  }

  public stopTitleMusic(): void {
    if (this.titleMusicLoop.playing()) {
      this.titleMusicLoop.stop();
    }
  }

  public startAnimeIntroMusic(): void {
    try {
      this.stopTitleMusic();
      if (this.customizationMusicLoop.playing()) {
        this.customizationMusicLoop.stop();
      }
      if (this.ambientLoop.playing()) {
        this.ambientLoop.pause();
      }
      if (!this.animeMusicLoop.playing()) {
        this.animeMusicLoop.volume(0);
        this.animeMusicLoop.seek(0);
        this.animeMusicLoop.play();
        this.animeMusicLoop.fade(0, 0.15, 900);
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
    if (this.florieVoiceCue0.playing()) {
      this.florieVoiceCue0.stop();
    }
    if (this.florieVoiceCue1.playing()) {
      this.florieVoiceCue1.stop();
    }
    if (this.activeVoiceHowl) {
      this.activeVoiceHowl.stop();
      this.activeVoiceHowl = null;
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

  public playFlorieVoiceLine(lineIndex: 0 | 1): void {
    const targetHowl = lineIndex === 0 ? this.florieVoiceCue0 : this.florieVoiceCue1;
    if (lineIndex === 0 && this.florieVoiceCue1.playing()) {
      this.florieVoiceCue1.stop();
    }
    if (targetHowl.playing()) {
      targetHowl.stop();
    }
    this.activeVoiceHowl = targetHowl;
    targetHowl.seek(0);
    targetHowl.play();
  }

  /**
   * Plays a soft, crystalline anime "piu piu" voice blip synchronized with typed letters.
   */
  public playFlorieBlip(char: string): void {
    this.playCharacterBlip(char, 'florie');
  }

  /**
   * Plays character-adapted letter-synced voice blipping:
   * - 'florie': soft crystalline "piu piu" soprano (770-1020 Hz)
   * - 'helen': warm, calm alto/mezzo chime (380-490 Hz)
   * - 'student': friendly mid-high campus peer blip (560-720 Hz)
   */
  public playCharacterBlip(
    char: string,
    voice: 'florie' | 'helen' | 'student' = 'florie'
  ): void {
    try {
      const ctx = Howler.ctx as AudioContext | undefined;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      const lower = char.toLowerCase();
      const isVowel = 'aeiouyàâéèêëîïôùûü'.includes(lower);
      const code = lower.charCodeAt(0) || 97;
      const jitter = Math.random() * 20 - 10;

      let baseFreq: number;
      let dur: number;
      let peakGain: number;
      let harmonicGain: number;

      if (voice === 'helen') {
        baseFreq = (isVowel ? 430 : 390) + ((code % 9) * 10) + jitter * 0.6;
        dur = 0.076;
        peakGain = isVowel ? 0.22 : 0.175;
        harmonicGain = 0.14;
      } else if (voice === 'student') {
        baseFreq = (isVowel ? 620 : 570) + ((code % 10) * 12) + jitter * 0.8;
        dur = 0.066;
        peakGain = isVowel ? 0.21 : 0.165;
        harmonicGain = 0.16;
      } else {
        baseFreq = (isVowel ? 840 : 770) + ((code % 11) * 14) + jitter;
        dur = 0.068;
        peakGain = isVowel ? 0.23 : 0.18;
        harmonicGain = 0.18;
      }

      const master = Howler.masterGain || ctx.destination;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq * 0.92, now);
      osc1.frequency.exponentialRampToValueAtTime(
        baseFreq * (voice === 'helen' ? 1.07 : 1.16),
        now + 0.022
      );
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.02, now + dur);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2.0, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.022);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(harmonicGain, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc1.connect(gain);
      osc2.connect(osc2Gain);
      osc2Gain.connect(gain);
      gain.connect(master);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + dur + 0.005);
      osc2.stop(now + dur + 0.005);
    } catch {
      // Ignore if audio context is not unlocked yet
    }
  }

  public startAmbient(): void {
    this.stopAnimeIntroMusic();
    this.stopCustomizationMusic();
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

  public startCustomizationMusic(): void {
    try {
      this.stopAnimeIntroMusic();
      if (this.ambientLoop.playing()) {
        this.ambientLoop.pause();
      }
      if (this.fountainLoop.playing()) {
        this.fountainLoop.pause();
      }

      if (!this.customizationMusicLoop.playing()) {
        this.customizationMusicLoop.volume(0);
        this.customizationMusicLoop.seek(0);
        this.customizationMusicLoop.play();
      }

      if (this.customizationFadeTimer === null) {
        const baseVol = 0.26;
        const fadeInSec = 1.8;
        const fadeOutSec = 2.4;
        const smootherstep = (edge0: number, edge1: number, x: number): number => {
          const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-5, edge1 - edge0)));
          return t * t * t * (t * (t * 6 - 15) + 10);
        };

        this.customizationFadeTimer = window.setInterval(() => {
          if (!this.customizationMusicLoop.playing()) return;
          const dur = this.customizationMusicLoop.duration();
          const pos = Number(this.customizationMusicLoop.seek()) || 0;
          if (dur <= fadeInSec + fadeOutSec + 1.0) {
            this.customizationMusicLoop.volume(baseVol);
            return;
          }

          let targetVol = baseVol;
          if (pos <= fadeInSec) {
            targetVol = baseVol * smootherstep(0.0, fadeInSec, pos);
          } else if (pos >= dur - fadeOutSec) {
            targetVol = baseVol * (1 - smootherstep(dur - fadeOutSec, dur - 0.08, pos));
          }
          this.customizationMusicLoop.volume(Math.max(0, Math.min(baseVol, targetVol)));
        }, 50);
      }
    } catch {
      // Autoplay blocked until next interaction
    }
  }

  public stopCustomizationMusic(): void {
    if (this.customizationFadeTimer !== null) {
      window.clearInterval(this.customizationFadeTimer);
      this.customizationFadeTimer = null;
    }
    if (this.customizationMusicLoop.playing()) {
      this.customizationMusicLoop.stop();
    }
    if (this.startedAmbient) {
      try {
        if (!this.ambientLoop.playing()) {
          this.ambientLoop.play();
        }
        if (!this.fountainLoop.playing()) {
          this.fountainLoop.play();
        }
      } catch {
        // Ignore
      }
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
    if (this.customizationMusicLoop.playing()) {
      this.customizationMusicLoop.pause();
    }
    if (this.titleMusicLoop.playing()) {
      this.titleMusicLoop.pause();
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

  public playFootstep(surface: 'grass' | 'carpet' | 'hard'): void {
    const howl =
      surface === 'grass'
        ? this.footstepGrass
        : surface === 'carpet'
          ? this.footstepCarpet
          : this.footstepHard;
    howl.rate(0.94 + Math.random() * 0.12);
    howl.play();
  }

  public playDoor(): void {
    this.doorSfx.play();
  }

  public playInteractDing(): void {
    this.dingSfx.play();
  }

  public playUiHover(): void {
    this.uiHoverSfx.play();
  }

  public playUiClick(): void {
    this.uiClickSfx.play();
  }

  public playUiConfirm(): void {
    this.uiConfirmSfx.play();
  }

  public playClothEquipSfx(): void {
    this.clothEquipSfx.rate(0.96 + Math.random() * 0.08);
    this.clothEquipSfx.play();
  }

  public playAccessoryEquipSfx(): void {
    this.accessoryEquipSfx.rate(0.97 + Math.random() * 0.06);
    this.accessoryEquipSfx.play();
  }

  public playColorSwatchSfx(): void {
    this.colorSwatchSfx.rate(0.95 + Math.random() * 0.12);
    this.colorSwatchSfx.play();
  }

  public dispose(): void {
    this.stopTitleMusic();
    this.stopAnimeIntroMusic();
    this.stopCustomizationMusic();
    this.footstepHard.unload();
    this.footstepGrass.unload();
    this.footstepCarpet.unload();
    this.doorSfx.unload();
    this.dingSfx.unload();
    this.uiHoverSfx.unload();
    this.uiClickSfx.unload();
    this.uiConfirmSfx.unload();
    this.clothEquipSfx.unload();
    this.accessoryEquipSfx.unload();
    this.colorSwatchSfx.unload();
    this.customizationMusicLoop.unload();
    this.ambientLoop.unload();
    this.fountainLoop.unload();
    this.animeMusicLoop.unload();
    this.titleMusicLoop.unload();
    this.animeSparkleSfx.unload();
    this.animeWaveSfx.unload();
    this.animeBeckonSfx.unload();
    this.florieVoiceCue0.unload();
    this.florieVoiceCue1.unload();
  }
}
