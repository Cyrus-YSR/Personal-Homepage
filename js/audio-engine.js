// ============================================================================
// CYRUS YSR — CONCERT GRAND PIANO WEB AUDIO ENGINE (5 CLASSIC PIANO PIECES)
// 1. Croatian Rhapsody (Maksim — G minor)
// 2. Canon in D (Pachelbel — D major)
// 3. The Truth That You Leave (Pianoboy — F minor)
// 4. Carrying You / Castle in the Sky (Joe Hisaishi — A minor)
// 5. Night Piano No.5 (Shi Jin — C major)
// Realistic multi-harmonic grand piano voice + hall convolution reverb + vinyl crackle
// ============================================================================

const NOTE_CACHE = {};
function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert note name like "C4", "F#5", "Bb3" to frequency in Hz
function n(name) {
  if (!name) return 0;
  if (NOTE_CACHE[name]) return NOTE_CACHE[name];
  const map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  let semi = map[m[1]];
  if (m[2] === '#') semi += 1;
  if (m[2] === 'b') semi -= 1;
  const midi = (parseInt(m[3], 10) + 1) * 12 + semi;
  NOTE_CACHE[name] = midiToHz(midi);
  return NOTE_CACHE[name];
}

export const VINYL_ALBUMS = [
  {
    id: 'croatian-rhapsody',
    index: '01',
    title: 'CROATIAN RHAPSODY',
    subtitle: 'G MINOR · VIRTUOSO PIANO',
    bpm: 116,
    accentHex: '#FF4D00',
    accentRGB: [1.0, 0.30, 0.0],
    bgGlow: 'rgba(255, 77, 0, 0.25)',
    hasPulseKick: true,
    // 32 sixteenth-note steps (2 fiery bars in G minor: Gm -> F -> Eb -> D7)
    rh: [
      'G5', 'Bb5', 'D6', 'G5', 'Bb5', 'D6', 'G5', 'D6',
      'F5', 'A5',  'C6', 'F5', 'A5',  'C6', 'F5', 'C6',
      'Eb5','G5',  'Bb5','Eb5','G5',  'Bb5','Eb5','Bb5',
      'D5', 'F#5', 'A5', 'D6', 'C6',  'Bb5','A5', 'F#5'
    ],
    lh: [
      ['G2','G3'], 0, 'D3', 0, ['G2','Bb3'], 0, 'D3', 0,
      ['F2','F3'], 0, 'C3', 0, ['F2','A3'],  0, 'C3', 0,
      ['Eb2','Eb3'], 0, 'Bb2', 0, ['Eb2','G3'], 0, 'Bb2', 0,
      ['D2','D3'], 0, 'A2', 0, ['D2','F#3'], 0, 'A2', 'D3'
    ]
  },
  {
    id: 'canon-in-d',
    index: '02',
    title: 'CANON IN D',
    subtitle: 'PACHELBEL · BAROQUE PIANO',
    bpm: 76,
    accentHex: '#FF7A1A',
    accentRGB: [1.0, 0.48, 0.10],
    bgGlow: 'rgba(255, 122, 26, 0.24)',
    hasPulseKick: false,
    // Classic 8-chord Canon progression (32 eighth-note steps)
    rh: [
      'F#5', 0, 'A4', 'D5', 'E5', 0, 'A4', 'C#5',
      'D5',  0, 'F#4','B4', 'C#5',0, 'F#4','A4',
      'B4',  0, 'D4', 'G4', 'A4', 0, 'F#4','D5',
      'B4',  'D5','G5','F#5','E5', 'D5','C#5','E5'
    ],
    lh: [
      ['D2','D3'], 'A3', 'D4', 'F#4', ['A1','A2'], 'E3', 'A3', 'C#4',
      ['B1','B2'], 'F#3','B3', 'D4',  ['F#1','F#2'],'C#3','F#3','A3',
      ['G1','G2'], 'D3', 'G3', 'B3',  ['D2','D3'], 'A3', 'D4', 'F#4',
      ['G1','G2'], 'D3', 'G3', 'B3',  ['A1','A2'], 'E3', 'A3', 'C#4'
    ]
  },
  {
    id: 'truth-that-you-leave',
    index: '03',
    title: 'THE TRUTH YOU LEAVE',
    subtitle: 'PIANOBOY · MELANCHOLIC',
    bpm: 88,
    accentHex: '#FF2E1F',
    accentRGB: [1.0, 0.18, 0.12],
    bgGlow: 'rgba(255, 46, 31, 0.24)',
    hasPulseKick: true,
    // Iconic F minor / Ab major flowing motif (Db -> Eb -> Fm -> Fm)
    rh: [
      'C5', 'Db5', 'C5', 'Bb4', 'Ab4', 0, 'Ab4', 'Bb4',
      'C5', 'Db5', 'C5', 'Bb4', 'Eb5', 0, 'C5',  'Bb4',
      'Ab4','Bb4', 'C5', 'Eb5', 'F5',  0, 'Eb5', 'Db5',
      'C5', 'Bb4', 'Ab4','G4',  'Ab4', 0, 'Bb4', 0
    ],
    lh: [
      ['Db2','Db3'], 'Ab3', 'Db4', 'F4',  'Ab3', 'Db4', 'F4', 'Ab3',
      ['Eb2','Eb3'], 'Bb3', 'Eb4', 'G4',  'Bb3', 'Eb4', 'G4', 'Bb3',
      ['F2','F3'],   'C4',  'F4',  'Ab4', 'C4',  'F4',  'Ab4','C4',
      ['C2','C3'],   'G3',  'C4',  'Eb4', 'G3',  'C4',  'G3', 0
    ]
  },
  {
    id: 'castle-in-the-sky',
    index: '04',
    title: 'CASTLE IN THE SKY',
    subtitle: 'LAPUTA · CARRYING YOU',
    bpm: 80,
    accentHex: '#FF9130',
    accentRGB: [1.0, 0.57, 0.19],
    bgGlow: 'rgba(255, 145, 48, 0.24)',
    hasPulseKick: false,
    // Iconic Joe Hisaishi "Carrying You" A minor melody
    rh: [
      'A4', 'B4', 'C5', 0, 'B4', 'C5', 'E5', 0,
      'B4', 0,    0,   'E4','A4', 0,   'G4', 'A4',
      'C5', 0,    'G4', 0,  0,   'E4', 'F4', 'E4',
      'F4', 'C5', 'E4', 0,  'B4', 0,   'A4', 0
    ],
    lh: [
      ['A2','E3'], 'A3', 'C4', 'E4', ['G2','D3'], 'G3', 'B3', 'D4',
      ['F2','C3'], 'F3', 'A3', 'C4', ['E2','B2'], 'E3', 'G#3','B3',
      ['D2','A2'], 'D3', 'F3', 'A3', ['C2','G2'], 'C3', 'E3', 'G3',
      ['F2','C3'], 'F3', 'A3', 'C4', ['E2','B2'], 'E3', 'G#3','E3'
    ]
  },
  {
    id: 'night-piano-5',
    index: '05',
    title: 'NIGHT PIANO NO.5',
    subtitle: 'SHI JIN · MIDNIGHT SOLO',
    bpm: 74,
    accentHex: '#FF3D5A',
    accentRGB: [1.0, 0.24, 0.35],
    bgGlow: 'rgba(255, 61, 90, 0.24)',
    hasPulseKick: false,
    // Tender C major Arpeggio Ballad (C -> G/B -> Am -> Em -> F -> C -> Dm -> G)
    rh: [
      'E5', 'G5', 'A5', 'G5', 'E5', 0, 'D5', 'E5',
      'D5', 'C5', 'A4', 0,    'E5', 0, 'D5', 'C5',
      'C5', 'D5', 'E5', 'G5', 'A5', 0, 'G5', 'E5',
      'D5', 'E5', 'D5', 'C5', 'C5', 0, 0,    0
    ],
    lh: [
      ['C2','C3'], 'G3', 'C4', 'E4', ['B1','B2'], 'G3', 'D4', 'G4',
      ['A1','A2'], 'E3', 'A3', 'C4', ['E2','E3'], 'B3', 'E4', 'G4',
      ['F1','F2'], 'C3', 'F3', 'A3', ['C2','C3'], 'G3', 'C4', 'E4',
      ['D2','D3'], 'A3', 'D4', 'F4', ['G1','G2'], 'D3', 'G3', 'B3'
    ]
  }
];

export class VinylAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.freqData = new Uint8Array(64);
    this.isPlaying = false;
    this.albumIndex = 0;
    this.step = 0;
    this.timer = null;
    this.vinylNoiseNode = null;
    this.bassLevel = 0;
    this.midLevel = 0;
    this.spectrum = new Float32Array(32);
  }

  ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.78;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.68;

    // Warm Concert Hall Convolution Reverb (generated procedurally, zero external files)
    const revLen = Math.floor(this.ctx.sampleRate * 2.2);
    const revBuf = this.ctx.createBuffer(2, revLen, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = revBuf.getChannelData(ch);
      for (let i = 0; i < revLen; i++) {
        const env = Math.pow(1 - i / revLen, 2.6);
        d[i] = (Math.random() * 2 - 1) * env * 0.45;
      }
    }
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = revBuf;

    const wetGain = this.ctx.createGain();
    wetGain.gain.value = 0.34;
    const dryGain = this.ctx.createGain();
    dryGain.gain.value = 0.88;

    // Dynamics compressor to keep piano chords rich & warm without clipping
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3.5;

    this.masterGain.connect(dryGain);
    this.masterGain.connect(this.reverbNode);
    this.reverbNode.connect(wetGain);

    dryGain.connect(comp);
    wetGain.connect(comp);
    comp.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  startCrackle() {
    if (!this.ctx || this.vinylNoiseNode) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.0055 + (Math.random() > 0.9995 ? (Math.random() * 2 - 1) * 0.1 : 0);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 0.8;

    const g = this.ctx.createGain();
    g.gain.value = 0.28;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start();
    this.vinylNoiseNode = src;
  }

  stopCrackle() {
    if (this.vinylNoiseNode) {
      try { this.vinylNoiseNode.stop(); } catch (_) {}
      this.vinylNoiseNode = null;
    }
  }

  // Expressive Grand Piano Voice: 3 detuned harmonic strings + key-tracked filter + hammer strike
  playPianoNote(time, freq, velocity = 0.65, duration = 1.65) {
    if (!freq || freq < 20) return;
    const ctx = this.ctx;

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, time);
    noteGain.gain.linearRampToValueAtTime(velocity * 0.26, time + 0.009);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.11, time + 0.16);
    noteGain.gain.exponentialRampToValueAtTime(0.0004, time + duration);

    // Key-tracked lowpass filter: bright crisp attack decaying into warm woody resonance
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const peakCutoff = Math.min(7200, freq * (5.2 + velocity * 3.5));
    lp.frequency.setValueAtTime(peakCutoff, time);
    lp.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.9), time + duration * 0.65);
    lp.Q.value = 0.85;

    lp.connect(noteGain);
    noteGain.connect(this.masterGain);

    // Layer 1: Fundamental warm body (triangle)
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(freq, time);

    // Layer 2: Slightly detuned second unison string (sine + subtle richness)
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 1.0014, time);
    const g2 = ctx.createGain();
    g2.gain.value = 0.65;

    // Layer 3: Second harmonic overtone (gives authentic piano metallic sparkle)
    const o3 = ctx.createOscillator();
    o3.type = 'sine';
    o3.frequency.setValueAtTime(freq * 2.001, time);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.28, time);
    g3.gain.exponentialRampToValueAtTime(0.015, time + duration * 0.45);

    // Layer 4: Soft felt hammer transient thump
    const o4 = ctx.createOscillator();
    o4.type = 'sawtooth';
    o4.frequency.setValueAtTime(freq * 3.0, time);
    const g4 = ctx.createGain();
    g4.gain.setValueAtTime(0.09 * velocity, time);
    g4.gain.exponentialRampToValueAtTime(0.0005, time + 0.045);

    o1.connect(lp);
    o2.connect(g2); g2.connect(lp);
    o3.connect(g3); g3.connect(lp);
    o4.connect(g4); g4.connect(lp);

    const stopAt = time + duration + 0.06;
    o1.start(time); o1.stop(stopAt);
    o2.start(time); o2.stop(stopAt);
    o3.start(time); o3.stop(stopAt);
    o4.start(time); o4.stop(time + 0.06);
  }

  // Subtle cinematic sub-bass pulse on strong beats (drives vinyl platter vibration)
  playSubPulse(time, strong = false) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(strong ? 108 : 82, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.18);
    g.gain.setValueAtTime(strong ? 0.36 : 0.18, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  tickStep() {
    if (!this.isPlaying || !this.ctx) return;
    const album = VINYL_ALBUMS[this.albumIndex];
    const now = this.ctx.currentTime + 0.02;
    const idx = this.step % album.rh.length;
    const beatDur = 60 / album.bpm;

    // Right-hand melody
    const rhNote = album.rh[idx];
    if (rhNote) {
      const vel = idx % 4 === 0 ? 0.85 : 0.68;
      this.playPianoNote(now, n(rhNote), vel, beatDur * 2.1);
    }

    // Left-hand accompaniment / octaves
    const lhItem = album.lh[idx];
    if (lhItem) {
      if (Array.isArray(lhItem)) {
        lhItem.forEach((nt, k) => {
          this.playPianoNote(now + k * 0.012, n(nt), 0.72, beatDur * 3.0);
        });
        // Deep bass impulse drives physical vinyl turntable & spectrum lighting
        this.playSubPulse(now, album.hasPulseKick);
      } else {
        this.playPianoNote(now, n(lhItem), 0.50, beatDur * 2.2);
      }
    }

    this.step++;
  }

  play(albumIdx = this.albumIndex) {
    this.ensureContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.albumIndex = albumIdx;
    this.stopLoopOnly();
    this.isPlaying = true;
    this.step = 0;
    this.startCrackle();
    const album = VINYL_ALBUMS[this.albumIndex];
    // Croatian Rhapsody uses brisk 16th steps; lyrical piano ballads use expressive 8th steps
    const div = album.id === 'croatian-rhapsody' ? 3.2 : 2.0;
    const stepMs = (60 / album.bpm / div) * 1000;
    this.tickStep();
    this.timer = setInterval(() => this.tickStep(), stepMs);
  }

  stopLoopOnly() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  pause() {
    this.isPlaying = false;
    this.stopLoopOnly();
    this.stopCrackle();
  }

  toggle() {
    if (this.isPlaying) this.pause();
    else this.play(this.albumIndex);
    return this.isPlaying;
  }

  selectAlbum(idx, autoStart = true) {
    this.albumIndex = idx;
    if (this.isPlaying || autoStart) {
      this.play(idx);
    }
    return VINYL_ALBUMS[idx];
  }

  sample(time) {
    if (this.isPlaying && this.analyser) {
      this.analyser.getByteFrequencyData(this.freqData);
      let bass = 0, mid = 0;
      for (let i = 0; i < 6; i++) bass += this.freqData[i];
      for (let i = 6; i < 24; i++) mid += this.freqData[i];
      const rawBass = bass / (6 * 255);
      const rawMid = mid / (18 * 255);
      this.bassLevel += (rawBass - this.bassLevel) * 0.35;
      this.midLevel += (rawMid - this.midLevel) * 0.25;
      for (let i = 0; i < 32; i++) {
        this.spectrum[i] = this.freqData[i] / 255;
      }
    } else {
      const idleBass = 0.06 + 0.04 * Math.pow(0.5 + 0.5 * Math.sin(time * 2.8), 3.0);
      this.bassLevel += (idleBass - this.bassLevel) * 0.1;
      this.midLevel += (0.05 - this.midLevel) * 0.1;
      for (let i = 0; i < 32; i++) {
        this.spectrum[i] = 0.06 + 0.05 * Math.sin(time * 2.0 + i * 0.45);
      }
    }
    return { bass: this.bassLevel, mid: this.midLevel, spectrum: this.spectrum };
  }
}
