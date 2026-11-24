import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import gsap from 'gsap';
import Lenis from 'lenis';

import {
  PARTICLE_VERT,
  PARTICLE_FRAG,
  FULLSCREEN_VERT,
  LAVA_TRANSITION_FRAG,
  THERMAL_SIM_FRAG,
  THERMAL_DISPLAY_FRAG,
  PROJECT_MEMBRANE_FRAG,
  AWARD_POST_SHADER
} from './shaders.js';
import { loadImage, sampleSculptureFromImage, sampleWordmarkParticles } from './sculptures.js';
import { VINYL_ALBUMS, VinylAudioEngine } from './audio-engine.js';

// ============================================================================
// MATH & KINETIC TYPOGRAPHY HELPERS
// ============================================================================
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+#*<>—';

function kineticDecrypt(el, targetText, duration = 750) {
  if (!el) return;
  const finalStr = targetText ?? el.dataset.text ?? el.textContent;
  el.dataset.text = finalStr;
  if (el._decryptRaf) cancelAnimationFrame(el._decryptRaf);
  const start = performance.now();
  const len = finalStr.length;

  const step = (now) => {
    const t = clamp((now - start) / duration);
    const locked = Math.floor(t * len);
    let out = '';
    for (let i = 0; i < len; i++) {
      const ch = finalStr[i];
      if (ch === ' ' || ch === '\n') {
        out += ch;
      } else if (i < locked) {
        out += ch;
      } else {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    el.textContent = out;
    if (t < 1) el._decryptRaf = requestAnimationFrame(step);
    else el.textContent = finalStr;
  };
  el._decryptRaf = requestAnimationFrame(step);
}

function typewriterPrint(el, text, speedMs = 26) {
  if (!el) return;
  if (el._typeTimer) clearInterval(el._typeTimer);
  el.textContent = '';
  let i = 0;
  el._typeTimer = setInterval(() => {
    i++;
    el.textContent = text.slice(0, i) + (i < text.length ? '_' : '');
    if (i >= text.length) {
      clearInterval(el._typeTimer);
      el.textContent = text;
    }
  }, speedMs);
}

// ============================================================================
// PORTFOLIO DATA (100% REAL CYRUS YSR DATA — STRICT ENGLISH ONLY)
// ============================================================================
const PROJECTS = [
  {
    idx: '01',
    kicker: 'DISTRIBUTED MICROSERVICES // GOLANG',
    title: 'MICRO-COMMERCE',
    desc: 'High-concurrency microservice e-commerce platform engineered in Golang. Implements RocketMQ distributed transactions with atomic inventory rollback, Redis distributed locks & captcha blacklist defense, MySQL sharding with optimistic/pessimistic locking, and Docker/Kubernetes deployment.',
    metrics: [
      ['CORE', 'GOLANG'],
      ['TX QUEUE', 'ROCKETMQ'],
      ['STORAGE', 'MYSQL + REDIS'],
      ['INFRA', 'DOCKER / K8S']
    ]
  },
  {
    idx: '02',
    kicker: 'HIGH-CONCURRENCY MESSAGING // GOLANG',
    title: 'REALTIME IM',
    desc: 'Low-latency instant messaging engine built on Go goroutines and non-blocking channel multiplexing. Architected for massive concurrent connections, deterministic session routing, and lock-minimized real-time message fan-out.',
    metrics: [
      ['CORE', 'GOLANG'],
      ['RUNTIME', 'GOROUTINES'],
      ['CACHE', 'REDIS PUB/SUB'],
      ['LATENCY', 'SUB-MS ROUTE']
    ]
  },
  {
    idx: '03',
    kicker: 'DISTRIBUTED STORAGE // BACKEND',
    title: 'CLOUD DISK',
    desc: 'Cloud storage backend service engineered with Gin, GORM, and MySQL. Features modular API pipelines, chunked file transfer orchestration, metadata indexing, and isolated containerized middleware via Docker.',
    metrics: [
      ['CORE', 'GOLANG'],
      ['FRAMEWORK', 'GIN + GORM'],
      ['METADATA', 'MYSQL TUNED'],
      ['RUNTIME', 'DOCKERIZED']
    ]
  },
  {
    idx: '04',
    kicker: 'SIMULATION LOOP // PYTHON',
    title: 'PVZ ENGINE',
    desc: 'Custom Python re-engineering of Plants vs. Zombies built from pure game-dev curiosity. Features a deterministic tick loop, entity state machines, grid collision solver, projectile physics, and wave scheduling.',
    metrics: [
      ['CORE', 'PYTHON'],
      ['ARCH', 'ENTITY OOP'],
      ['ENGINE', 'STATE MACHINE'],
      ['SPIRIT', 'GAME LOVER']
    ]
  }
];

const TECH_SKILLS = [
  { cat: 'BACKEND CORE', name: 'GOLANG', score: 98 },
  { cat: 'FULL-STACK', name: 'TYPESCRIPT', score: 95 },
  { cat: 'ALGORITHMS', name: 'C++ / ICPC', score: 94 },
  { cat: 'UI ENGINE', name: 'REACT / NEXT', score: 92 },
  { cat: 'LOCK & CACHE', name: 'REDIS', score: 92 },
  { cat: 'DATABASE', name: 'MYSQL', score: 90 },
  { cat: 'DISTRIBUTED', name: 'ROCKETMQ', score: 88 },
  { cat: 'CLOUD NATIVE', name: 'DOCKER / K8S', score: 86 }
];

const CHAPTER_META = [
  { code: 'CH.01 // VOID & DAVID', range: [0.0, 0.12] },
  { code: 'CH.02 // MAGMA SINGULARITY', range: [0.12, 0.24] },
  { code: 'CH.03 // THERMAL LAVA INK', range: [0.24, 0.38] },
  { code: 'CH.04 // SELECTED SYSTEMS', range: [0.38, 0.61] },
  { code: 'CH.05 // LAB · TECH STACK', range: [0.61, 0.77] },
  { code: 'CH.06 // ANALOG VINYL', range: [0.77, 0.90] },
  { code: 'CH.07 // CYRUS YSR · FINALE', range: [0.90, 1.01] }
];

// ============================================================================
// INIT MECHANICAL TECH STACK CARDS + VINYL FAN ALBUMS + SOUND WAVE NAV
// ============================================================================
const mechGrid = document.getElementById('mech-grid');
const mechCards = [];
TECH_SKILLS.forEach((sk) => {
  const card = document.createElement('div');
  card.className = 'mech-card';
  card.innerHTML = `
    <div class="mech-cat">${sk.cat}</div>
    <div class="mech-name" data-full="${sk.name}"></div>
    <div class="mech-counter-row">
      <span class="mech-digits">000</span>
      <span class="mech-pct">%</span>
    </div>
    <div class="mech-bar"><i></i></div>
  `;
  mechGrid.appendChild(card);
  mechCards.push({
    el: card,
    nameEl: card.querySelector('.mech-name'),
    digitsEl: card.querySelector('.mech-digits'),
    barEl: card.querySelector('.mech-bar i'),
    skill: sk
  });
});

let stackTriggered = false;
function triggerMechanicalCounters() {
  if (stackTriggered) return;
  stackTriggered = true;
  const headerEl = document.getElementById('stack-typewriter');
  typewriterPrint(headerEl, headerEl.dataset.full, 24);

  mechCards.forEach((item, idx) => {
    setTimeout(() => {
      typewriterPrint(item.nameEl, item.skill.name, 34);
      const obj = { val: 0 };
      gsap.to(obj, {
        val: item.skill.score,
        duration: 1.55 + idx * 0.08,
        ease: 'power3.out',
        onUpdate: () => {
          // Mechanical counter step feel (rapid jitter + rolling digits)
          const v = Math.round(obj.val);
          item.digitsEl.textContent = String(v).padStart(3, '0');
          item.barEl.style.width = v + '%';
        }
      });
    }, idx * 85);
  });
}

function resetMechanicalCounters() {
  if (!stackTriggered) return;
  stackTriggered = false;
  mechCards.forEach((item) => {
    item.digitsEl.textContent = '000';
    item.barEl.style.width = '0%';
  });
}

// Sound Wave Navigator (36 bars)
const swBarsEl = document.getElementById('sw-bars');
const swReadout = document.getElementById('sw-readout');
const swLabels = Array.from(document.querySelectorAll('.sw-label'));
const SW_COUNT = 36;
const swBars = [];
for (let i = 0; i < SW_COUNT; i++) {
  const bar = document.createElement('div');
  bar.className = 'sw-bar';
  bar.dataset.p = (i / (SW_COUNT - 1)).toFixed(4);
  swBarsEl.appendChild(bar);
  swBars.push(bar);
}

// Vinyl Audio Engine + Fan-Out Albums
const audio = new VinylAudioEngine();
const albumFanWrapper = document.getElementById('album-fan-wrapper');
const albumCards = [];
const hoverOffsets = [-42, 28, 104, 180, 250];
const targetAccentColor = new THREE.Color('#FF4D00');
const liveAccentColor = new THREE.Color('#FF4D00');

function applyAlbumTheme(idx, shouldPlay = true) {
  const album = audio.selectAlbum(idx, shouldPlay);
  targetAccentColor.set(album.accentHex);

  document.documentElement.style.setProperty('--accent', album.accentHex);
  document.documentElement.style.setProperty('--accent-soft', album.bgGlow);
  document.documentElement.style.setProperty('--accent-glow', album.accentHex);

  document.getElementById('vl-index').textContent = album.index;
  document.getElementById('vl-title').textContent = album.title;
  document.getElementById('deck-now').textContent = album.title;
  document.getElementById('deck-bpm').textContent = `${album.bpm} BPM · ${album.subtitle}`;
  document.getElementById('vinyl-label').style.background =
    `radial-gradient(circle at 30% 30%, ${album.accentHex} 0%, #3d0d00 90%)`;

  albumCards.forEach((c, i) => c.classList.toggle('selected', i === idx));
  syncVinylPlayUI(audio.isPlaying);
}

VINYL_ALBUMS.forEach((alb, idx) => {
  const btn = document.createElement('button');
  btn.className = 'album-card' + (idx === 0 ? ' selected' : '');
  btn.style.setProperty('--card-accent', alb.accentHex);
  btn.style.setProperty('--card-glow', alb.bgGlow);
  btn.style.setProperty('--hover-x', `${hoverOffsets[idx]}px`);
  btn.innerHTML = `
    <div class="album-art-ring"></div>
    <span class="album-idx">SIDE A // ${alb.index}</span>
    <strong class="album-name">${alb.title}</strong>
    <span class="album-sub">${alb.subtitle} · ${alb.bpm} BPM</span>
  `;
  btn.addEventListener('click', () => applyAlbumTheme(idx, true));
  albumFanWrapper.appendChild(btn);
  albumCards.push(btn);
});

const playBtn = document.getElementById('btn-vinyl-play');
const playIcon = document.getElementById('play-icon');
const playLabel = document.getElementById('play-label');
const tonearmEl = document.getElementById('tonearm-arm');
const vinylFreqStatus = document.getElementById('vinyl-freq-status');

function syncVinylPlayUI(playing) {
  playBtn.classList.toggle('playing', playing);
  playIcon.textContent = playing ? '❚❚' : '▶';
  playLabel.textContent = playing ? 'PAUSE DECK' : 'SPIN RECORD';
  tonearmEl.classList.toggle('engaged', playing);
  vinylFreqStatus.textContent = playing
    ? `SPECTRUM ENGINE // LIVE AUDIO REACTIVE · ${VINYL_ALBUMS[audio.albumIndex].title}`
    : 'SPECTRUM ENGINE // STANDBY — CLICK RECORD OR ALBUM TO PLAY';
}

playBtn.addEventListener('click', () => {
  const playing = audio.toggle();
  syncVinylPlayUI(playing);
});
document.getElementById('vinyl-disc').addEventListener('click', () => {
  const playing = audio.toggle();
  syncVinylPlayUI(playing);
});

// ============================================================================
// LENIS SMOOTH SCROLL + CURSOR + AUTO CINEMA MODE
// ============================================================================
const lenis = new Lenis({
  duration: 1.45,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 0.92
});

let scrollProgress = 0;
let smoothProgress = 0;
let scrollVel = 0;
let autoCinema = false;
let chapterWavePulse = 0;
let activeChapterIdx = -1;

lenis.on('scroll', ({ progress, velocity }) => {
  scrollProgress = clamp(progress);
  scrollVel = clamp(velocity * 0.015, -1.2, 1.2);
});

function jumpToProgress(p) {
  autoCinema = false;
  document.getElementById('btn-auto-film').classList.remove('playing');
  document.getElementById('btn-auto-film').textContent = 'AUTO CINEMA';
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  lenis.scrollTo(clamp(p) * maxY, { duration: 1.5 });
}

document.querySelectorAll('[data-jump]').forEach((btn) => {
  btn.addEventListener('click', () => jumpToProgress(parseFloat(btn.dataset.jump)));
});
swLabels.forEach((lbl) => lbl.addEventListener('click', () => jumpToProgress(parseFloat(lbl.dataset.progress))));
swBars.forEach((b) => b.addEventListener('click', () => jumpToProgress(parseFloat(b.dataset.p))));
document.querySelectorAll('.p-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    const idx = parseInt(pill.dataset.proj, 10);
    jumpToProgress(0.415 + idx * 0.056);
  });
});

const autoFilmBtn = document.getElementById('btn-auto-film');
autoFilmBtn.addEventListener('click', () => {
  autoCinema = !autoCinema;
  autoFilmBtn.classList.toggle('playing', autoCinema);
  autoFilmBtn.textContent = autoCinema ? 'STOP CINEMA' : 'AUTO CINEMA';
  if (autoCinema && smoothProgress > 0.96) {
    lenis.scrollTo(0, { immediate: true });
    scrollProgress = 0;
    smoothProgress = 0;
  }
});
window.addEventListener('wheel', () => {
  if (autoCinema) {
    autoCinema = false;
    autoFilmBtn.classList.remove('playing');
    autoFilmBtn.textContent = 'AUTO CINEMA';
  }
}, { passive: true });

// Smooth Cursor Tracking (Native Lava-Orange SVG Pointer Cursor)
const mouse = {
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.5,
  tx: window.innerWidth * 0.5,
  ty: window.innerHeight * 0.5,
  uv: new THREE.Vector2(0.5, 0.5),
  prevUv: new THREE.Vector2(0.5, 0.5),
  world: new THREE.Vector2(0, 0),
  prevWorld: new THREE.Vector2(0, 0),
  vel: new THREE.Vector2(0, 0),
  speed: 0
};

window.addEventListener('mousemove', (e) => {
  mouse.tx = e.clientX;
  mouse.ty = e.clientY;
}, { passive: true });

// ============================================================================
// CH.07 FINALE — ACETERNITY-STYLE TEXT REVEAL QUOTE ("Hover me, guys" MECHANIC)
// Default: "Life is always full of bitterness" + twinkling micro-stars
// Hover scrub X: clips open Lava-Orange "but sometimes, you just need to taste it."
// ============================================================================
const revealBox = document.getElementById('reveal-quote-box');
const revealTop = document.getElementById('reveal-top-layer');
const revealDivider = document.getElementById('reveal-divider');
const revealStars = document.getElementById('reveal-stars');

if (revealStars) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 76; i++) {
    const dot = document.createElement('span');
    dot.className = 'reveal-star-dot';
    dot.style.left = `${(Math.random() * 100).toFixed(2)}%`;
    dot.style.top = `${(Math.random() * 100).toFixed(2)}%`;
    dot.style.setProperty('--dur', `${(2.6 + Math.random() * 4.2).toFixed(2)}s`);
    dot.style.setProperty('--delay', `${(-Math.random() * 5).toFixed(2)}s`);
    dot.style.setProperty('--dx', `${((Math.random() - 0.5) * 8).toFixed(1)}px`);
    dot.style.setProperty('--dy', `${((Math.random() - 0.5) * 8).toFixed(1)}px`);
    frag.appendChild(dot);
  }
  revealStars.appendChild(frag);
}

if (revealBox && revealTop && revealDivider) {
  const updateReveal = (clientX) => {
    const rect = revealBox.getBoundingClientRect();
    const pct = clamp(((clientX - rect.left) / Math.max(rect.width, 1)) * 100, 0, 100);
    const tilt = (pct - 50) * 0.1;
    revealTop.style.clipPath = `inset(0px ${(100 - pct).toFixed(2)}% 0px 0px)`;
    revealTop.style.opacity = '1';
    revealDivider.style.left = `${pct.toFixed(2)}%`;
    revealDivider.style.transform = `translateX(-50%) rotate(${tilt.toFixed(2)}deg)`;
    revealDivider.style.opacity = pct > 0.5 && pct < 99.5 ? '1' : '0';
  };

  revealBox.addEventListener('mouseenter', (e) => {
    revealBox.classList.add('scrubbing');
    updateReveal(e.clientX);
  });
  revealBox.addEventListener('mousemove', (e) => {
    updateReveal(e.clientX);
  });
  revealBox.addEventListener('mouseleave', () => {
    revealBox.classList.remove('scrubbing');
    revealTop.style.clipPath = 'inset(0px 100% 0px 0px)';
    revealTop.style.opacity = '0';
    revealDivider.style.opacity = '0';
  });
}

// ============================================================================
// THREE.JS WEBGL2 ENGINE + POST-PROCESSING PIPELINE
// ============================================================================
const canvas = document.getElementById('webgl-stage');
let W = window.innerWidth;
let H = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance'
});
renderer.setSize(W, H);
renderer.setPixelRatio(dpr);
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 50);
camera.position.set(0, 0, 6.4);

// Post-Processing: RenderPass -> Controlled UnrealBloomPass -> AwardPostShader (CA + Motion Blur + DOF + Film Noise)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.42, 0.55, 0.66);
composer.addPass(bloomPass);

const postPass = new ShaderPass(AWARD_POST_SHADER);
postPass.uniforms.uRes.value = new THREE.Vector2(W, H);
composer.addPass(postPass);

// Ping-Pong FBO for Chapter 3 Lava Orange Thermal Ink Brush
const fboOpts = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType
};
const fboW = Math.floor(Math.min(W, 1024) * 0.65);
const fboH = Math.floor(Math.min(H, 640) * 0.65);
let inkRead = new THREE.WebGLRenderTarget(fboW, fboH, fboOpts);
let inkWrite = new THREE.WebGLRenderTarget(fboW, fboH, fboOpts);

const simScene = new THREE.Scene();
const simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const simUniforms = {
  uPrev: { value: null },
  uRes: { value: new THREE.Vector2(fboW, fboH) },
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uMouseSpeed: { value: 0 },
  uActive: { value: 0 }
};
const simMat = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: THERMAL_SIM_FRAG,
  uniforms: simUniforms,
  depthTest: false,
  depthWrite: false
});
simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat));

// Placeholder 1x1 dark texture before high-res textures finish loading
const fallbackTex = new THREE.DataTexture(new Uint8Array([8, 4, 2, 255]), 1, 1);
fallbackTex.needsUpdate = true;

// Fullscreen Shader Layer 1: Projects Liquid Rubber Membrane
const projectUniforms = {
  uTexA: { value: fallbackTex },
  uTexB: { value: fallbackTex },
  uRes: { value: new THREE.Vector2(W, H) },
  uTime: { value: 0 },
  uMix: { value: 0 },
  uEnter: { value: 0 },
  uExit: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uHoverVel: { value: 0 },
  uAccent: { value: liveAccentColor }
};
const projectMat = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: PROJECT_MEMBRANE_FRAG,
  uniforms: projectUniforms,
  transparent: true,
  depthTest: false,
  depthWrite: false
});
const projectMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), projectMat);
projectMesh.frustumCulled = false;
projectMesh.renderOrder = 1;
scene.add(projectMesh);

// Fullscreen Shader Layer 2: Lusion-Inspired Thermal Flow + Lava Brush Display
const thermalUniforms = {
  uInkTex: { value: inkRead.texture },
  uBgTex: { value: fallbackTex },
  uRes: { value: new THREE.Vector2(W, H) },
  uTime: { value: 0 },
  uReveal: { value: 0 },
  uExit: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uAccent: { value: liveAccentColor }
};
const thermalMat = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: THERMAL_DISPLAY_FRAG,
  uniforms: thermalUniforms,
  transparent: true,
  depthTest: false,
  depthWrite: false
});
const thermalMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), thermalMat);
thermalMesh.frustumCulled = false;
thermalMesh.renderOrder = 2;
scene.add(thermalMesh);

// Fullscreen Shader Layer 4: UMO-Inspired Lava Star Expansion from YSR's "*" Anchor + Molten Magma Fluid
const lavaUniforms = {
  uRes: { value: new THREE.Vector2(W, H) },
  uTime: { value: 0 },
  uStarScale: { value: 0 },
  uStarOrigin: { value: new THREE.Vector2(0.32, 0.25) },
  uStarInitSize: { value: 0.042 },
  uLavaFlow: { value: 0 },
  uLavaMeltOut: { value: 0 },
  uAccent: { value: liveAccentColor }
};
const lavaMat = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: LAVA_TRANSITION_FRAG,
  uniforms: lavaUniforms,
  transparent: true,
  depthTest: false,
  depthWrite: false
});
const lavaMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lavaMat);
lavaMesh.frustumCulled = false;
lavaMesh.renderOrder = 4;
scene.add(lavaMesh);

// ============================================================================
// 28,000-PARTICLE 3D SCULPTURE ENGINE (VOID -> DAVID -> ANIME GIRL -> RIGHT STREAM -> VINYL)
// ============================================================================
const PARTICLE_COUNT = 28000;
const pGeo = new THREE.BufferGeometry();

const voidArr = new Float32Array(PARTICLE_COUNT * 3);
const streamArr = new Float32Array(PARTICLE_COUNT * 3);
const randArr = new Float32Array(PARTICLE_COUNT * 4);
const initPos = new Float32Array(PARTICLE_COUNT * 3);
const initCol = new Float32Array(PARTICLE_COUNT * 3);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  // Deep void distribution
  const r = 1.6 + Math.pow(Math.random(), 0.65) * 6.8;
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(2 * Math.random() - 1);
  voidArr[i * 3]     = r * Math.sin(ph) * Math.cos(th);
  voidArr[i * 3 + 1] = r * Math.cos(ph) * 0.72;
  voidArr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 0.6;

  // Right-side stream passing behind the glass Tech Stack drawer
  streamArr[i * 3]     = 0.3 + Math.random() * 6.2;
  streamArr[i * 3 + 1] = (Math.random() - 0.5) * 4.8;
  streamArr[i * 3 + 2] = (Math.random() - 0.5) * 2.4 - 0.4;

  randArr[i * 4]     = Math.random(); // delay
  randArr[i * 4 + 1] = Math.random(); // size
  randArr[i * 4 + 2] = Math.random(); // phase
  randArr[i * 4 + 3] = Math.random(); // wander

  initPos[i * 3]     = voidArr[i * 3];
  initPos[i * 3 + 1] = voidArr[i * 3 + 1];
  initPos[i * 3 + 2] = voidArr[i * 3 + 2];

  initCol[i * 3]     = 0.94;
  initCol[i * 3 + 1] = 0.88;
  initCol[i * 3 + 2] = 0.82;
}

pGeo.setAttribute('position', new THREE.BufferAttribute(initPos, 3));
pGeo.setAttribute('aVoidPos', new THREE.BufferAttribute(voidArr, 3));
pGeo.setAttribute('aDavidPos', new THREE.BufferAttribute(new Float32Array(initPos), 3));
pGeo.setAttribute('aDavidColor', new THREE.BufferAttribute(new Float32Array(initCol), 3));
pGeo.setAttribute('aAnimePos', new THREE.BufferAttribute(new Float32Array(initPos), 3));
pGeo.setAttribute('aAnimeColor', new THREE.BufferAttribute(new Float32Array(initCol), 3));
pGeo.setAttribute('aStreamPos', new THREE.BufferAttribute(streamArr, 3));
pGeo.setAttribute('aWordmarkPos', new THREE.BufferAttribute(new Float32Array(initPos), 3));
pGeo.setAttribute('aRand', new THREE.BufferAttribute(randArr, 4));

const particleUniforms = {
  uTime: { value: 0 },
  uPixelRatio: { value: dpr },
  uHeroForm: { value: 0 },
  uHeroScatter: { value: 0 },
  uAnimePresence: { value: 0 },
  uAnimeDissolve: { value: 0 },
  uVinylMode: { value: 0 },
  uWordmarkMode: { value: 0 },
  uMasterOpacity: { value: 1.0 },
  uMouseWorld: { value: new THREE.Vector2(0, 0) },
  uMouseVel: { value: new THREE.Vector2(0, 0) },
  uAudioBass: { value: 0 },
  uAudioMid: { value: 0 },
  uAccentColor: { value: liveAccentColor }
};

function rebuildWordmark() {
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
  const visW = visH * (W / Math.max(H, 1));
  const targetW = visW * 0.80;
  const wmPos = sampleWordmarkParticles('CYRUS YSR', PARTICLE_COUNT, {
    worldWidth: targetW,
    worldHeight: targetW * (300 / 1400),
    offsetX: -visW * 0.025,
    offsetY: -0.68,
    depthZ: 0.22
  });
  pGeo.getAttribute('aWordmarkPos').array.set(wmPos);
  pGeo.getAttribute('aWordmarkPos').needsUpdate = true;
}
rebuildWordmark();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    rebuildWordmark();
    measureStarAnchor();
  });
}

const particleMat = new THREE.ShaderMaterial({
  vertexShader: PARTICLE_VERT,
  fragmentShader: PARTICLE_FRAG,
  uniforms: particleUniforms,
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const particlePoints = new THREE.Points(pGeo, particleMat);
particlePoints.frustumCulled = false;
particlePoints.renderOrder = 3;
scene.add(particlePoints);

// ============================================================================
// LOAD HIGH-RES SCULPTURE & PROJECT ARTWORK ASSETS + LAUNCH OPENING SEQUENCE
// ============================================================================
const texLoader = new THREE.TextureLoader();
const projectTextures = [fallbackTex, fallbackTex, fallbackTex, fallbackTex];

function loadProjectTex(url, idx) {
  texLoader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    projectTextures[idx] = tex;
    if (idx === 0) {
      projectUniforms.uTexA.value = tex;
    }
    if (idx === 1) {
      projectUniforms.uTexB.value = tex;
      thermalUniforms.uBgTex.value = tex; // Warp tunnel energy backdrop for Thermal Lava chapter
    }
  });
}

loadProjectTex('./assets/project_1.jpg', 0);
loadProjectTex('./assets/project_2.jpg', 1);
loadProjectTex('./assets/project_3.jpg', 2);
loadProjectTex('./assets/project_4.jpg', 3);

const heroState = { form: 0 };
let heroTitleRevealed = false;

async function initSculptures() {
  try {
    const [davidImg, animeImg] = await Promise.all([
      loadImage('./assets/david_bust.jpg'),
      loadImage('./assets/anime_girl.jpg')
    ]);

    const david = sampleSculptureFromImage(davidImg, PARTICLE_COUNT, {
      scaleX: 4.5,
      scaleY: 4.5,
      depthZ: 1.45,
      offsetX: 0.55,
      offsetY: 0.12,
      threshold: 16,
      preserveColor: false
    });
    pGeo.getAttribute('aDavidPos').array.set(david.positions);
    pGeo.getAttribute('aDavidPos').needsUpdate = true;
    pGeo.getAttribute('aDavidColor').array.set(david.colors);
    pGeo.getAttribute('aDavidColor').needsUpdate = true;

    const anime = sampleSculptureFromImage(animeImg, PARTICLE_COUNT, {
      scaleX: 4.7,
      scaleY: 4.7,
      depthZ: 1.25,
      offsetX: 0.0,
      offsetY: 0.08,
      threshold: 14,
      preserveColor: true,
      accentBias: 0.35
    });
    pGeo.getAttribute('aAnimePos').array.set(anime.positions);
    pGeo.getAttribute('aAnimePos').needsUpdate = true;
    pGeo.getAttribute('aAnimeColor').array.set(anime.colors);
    pGeo.getAttribute('aAnimeColor').needsUpdate = true;
  } catch (err) {
    console.warn('Sculpture sampling fallback:', err);
  }

  // Opening choreography: Pure Black Void -> Particles Coalesce into Living David -> Title Reveals AFTER formation
  gsap.to(heroState, {
    form: 1.0,
    duration: 2.85,
    delay: 0.45,
    ease: 'power3.inOut',
    onComplete: () => {
      if (!heroTitleRevealed) revealHeroTypography();
    }
  });

  // Trigger title reveal right as David crystallizes (~2.6s)
  setTimeout(() => {
    if (!heroTitleRevealed) revealHeroTypography();
  }, 2650);
}

function revealHeroTypography() {
  heroTitleRevealed = true;
  const content = document.getElementById('hero-content');
  content.classList.add('revealed');
  if (zoomStarLayer) zoomStarLayer.classList.add('ready');
  const statusLbl = document.getElementById('hero-phase-label');
  kineticDecrypt(statusLbl, 'SCULPTURE ACTIVE // 28,000 LIVE PARTICLES', 650);
  content.querySelectorAll('.kinetic-line, .kinetic-text').forEach((el, idx) => {
    setTimeout(() => kineticDecrypt(el, el.dataset.text, 780), idx * 140);
  });
  setTimeout(measureStarAnchor, 60);
  setTimeout(measureStarAnchor, 500);
  setTimeout(measureStarAnchor, 1100);
}

initSculptures();

// ============================================================================
// DOM LAYER REFERENCES & PROJECT SWITCHER
// ============================================================================
const layers = {
  hero: document.getElementById('layer-hero'),
  lava: document.getElementById('layer-lava'),
  thermal: document.getElementById('layer-thermal'),
  projects: document.getElementById('layer-projects'),
  lab: document.getElementById('layer-lab'),
  vinyl: document.getElementById('layer-vinyl'),
  finale: document.getElementById('layer-finale')
};
const heroParts = {
  status: document.getElementById('hero-status'),
  eyebrow: document.getElementById('hero-eyebrow'),
  cyrus: document.getElementById('hero-line-cyrus'),
  ysr: document.getElementById('hero-line-ysr'),
  starSlot: document.getElementById('hero-star-slot'),
  footer: document.getElementById('hero-footer-strip')
};
const zoomStarLayer = document.getElementById('zoom-star-layer');
const zoomStarSvg = document.getElementById('zoom-star-svg');
const starHome = { x: 420, y: 520, size: 96 };

function measureStarAnchor() {
  if (!heroParts.starSlot || !zoomStarSvg) return;
  if (smoothProgress > 0.03) return;
  const r = heroParts.starSlot.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return;
  starHome.x = r.left + r.width * 0.5;
  starHome.y = r.top + r.height * 0.44;
  starHome.size = clamp(r.height * 0.62, 46, 150);
  zoomStarSvg.style.width = `${starHome.size.toFixed(1)}px`;
  zoomStarSvg.style.height = `${starHome.size.toFixed(1)}px`;
}

const hudChapterCode = document.getElementById('hud-chapter-code');
const ambientVeil = document.getElementById('ambient-light-veil');
const labAnimeHud = document.getElementById('lab-anime-hud');
const stackDrawer = document.getElementById('stack-drawer');
const vinylDiscEl = document.getElementById('vinyl-disc');
const turntableChassis = document.getElementById('turntable-chassis');
const turntableSpotlight = document.getElementById('turntable-spotlight');
const headshellEl = document.getElementById('tonearm-headshell');
const vuBars = Array.from(document.querySelectorAll('#deck-vu i'));

let currentProjectIdx = -1;
function syncProjectCopy(idx) {
  if (idx === currentProjectIdx) return;
  currentProjectIdx = idx;
  const proj = PROJECTS[idx];
  document.getElementById('proj-idx-num').textContent = proj.idx;
  kineticDecrypt(document.getElementById('proj-kicker'), proj.kicker, 520);
  kineticDecrypt(document.getElementById('proj-title'), proj.title, 640);
  document.getElementById('proj-desc').textContent = proj.desc;

  const metricsEl = document.getElementById('proj-metrics');
  metricsEl.innerHTML = proj.metrics
    .map(([k, v]) => `<div class="metric-cell"><span>${k}</span><strong>${v}</strong></div>`)
    .join('');

  document.querySelectorAll('.p-pill').forEach((p, i) => p.classList.toggle('active', i === idx));
}
syncProjectCopy(0);

function setLayerState(el, opacity, interactive = false, transform = '') {
  const vis = opacity > 0.01;
  el.style.visibility = vis ? 'visible' : 'hidden';
  el.style.opacity = opacity.toFixed(3);
  if (transform) el.style.transform = transform;
  el.classList.toggle('interactive-active', vis && interactive);
}

// ============================================================================
// MAIN 60FPS ANIMATION LOOP
// ============================================================================
let clockTime = 0;
let vinylAngle = 0;
let vinylAngularSpeed = 0;
let thermalChapterEntered = false;
let labChapterEntered = false;

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
  renderer.setPixelRatio(dpr);
  composer.setSize(W, H);
  bloomPass.setSize(W, H);
  postPass.uniforms.uRes.value.set(W, H);
  projectUniforms.uRes.value.set(W, H);
  thermalUniforms.uRes.value.set(W, H);
  lavaUniforms.uRes.value.set(W, H);
  particleUniforms.uPixelRatio.value = dpr;
  rebuildWordmark();
  measureStarAnchor();
});

function animate(now) {
  requestAnimationFrame(animate);
  lenis.raf(now);
  clockTime += 0.016;

  // Auto Cinema mode for effortless 60FPS video recording
  if (autoCinema) {
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const nextP = clamp(scrollProgress + 0.00048);
    window.scrollTo(0, nextP * maxY);
    scrollProgress = nextP;
    if (nextP >= 0.999) {
      autoCinema = false;
      autoFilmBtn.classList.remove('playing');
      autoFilmBtn.textContent = 'AUTO CINEMA';
    }
  }

  // Smooth scroll state
  const prevP = smoothProgress;
  smoothProgress += (scrollProgress - smoothProgress) * 0.095;
  const p = smoothProgress;
  const frameScrollVel = clamp((p - prevP) * 90.0 + scrollVel * 0.35, -1.5, 1.5);
  scrollVel *= 0.88;

  // Smooth cursor kinematics + world velocity for silky sculpture particle drift
  mouse.prevUv.copy(mouse.uv);
  mouse.prevWorld.copy(mouse.world);
  mouse.x += (mouse.tx - mouse.x) * 0.14;
  mouse.y += (mouse.ty - mouse.y) * 0.14;
  mouse.uv.set(mouse.x / Math.max(W, 1), 1.0 - mouse.y / Math.max(H, 1));
  const mSpeed = mouse.uv.distanceTo(mouse.prevUv) * 38.0;
  mouse.speed = lerp(mouse.speed, mSpeed, 0.22);

  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
  const halfW = halfH * (W / Math.max(H, 1));
  mouse.world.set((mouse.uv.x * 2 - 1) * halfW, (mouse.uv.y * 2 - 1) * halfH);
  // Smooth world-space cursor velocity vector (drives organic particle wind follow)
  mouse.vel.x = lerp(mouse.vel.x, clamp(mouse.world.x - mouse.prevWorld.x, -0.6, 0.6) * 2.8, 0.16);
  mouse.vel.y = lerp(mouse.vel.y, clamp(mouse.world.y - mouse.prevWorld.y, -0.6, 0.6) * 2.8, 0.16);

  // Smoothly interpolate active accent color (Lava Orange or active Vinyl album hue)
  liveAccentColor.lerp(targetAccentColor, 0.06);

  // Sample real-time Web Audio Bass & Spectrum
  const { bass, mid, spectrum } = audio.sample(clockTime);

  // ==========================================================================
  // 7-CHAPTER CONTINUOUS SCROLL TIMELINE (0.00 -> 1.00, ZERO HARD CUTS)
  // ==========================================================================

  // Active chapter detection & Sound Wave ripple trigger
  let chIdx = 0;
  for (let i = 0; i < CHAPTER_META.length; i++) {
    if (p >= CHAPTER_META[i].range[0]) chIdx = i;
  }
  if (chIdx !== activeChapterIdx) {
    activeChapterIdx = chIdx;
    chapterWavePulse = 1.0;
    kineticDecrypt(hudChapterCode, CHAPTER_META[chIdx].code, 420);
    swLabels.forEach((l, i) => l.classList.toggle('active', i === chIdx));
  }
  chapterWavePulse *= 0.92;

  // --- CH.01 -> CH.02: ZERO-SWAP DIRECT ZOOM OF THE EXACT "*" AFTER YSR + SURROUNDING SCATTER ---
  if (p < 0.025) measureStarAnchor();
  if (p > 0.03 && zoomStarLayer && !zoomStarLayer.classList.contains('ready')) {
    zoomStarLayer.classList.add('ready');
  }

  const heroScatter = smoothstep(0.065, 0.165, p);
  const starZoom = smoothstep(0.045, 0.155, p);
  const disperse = smoothstep(0.045, 0.12, p);
  const heroLayerAlpha = 1.0 - smoothstep(0.11, 0.14, p);
  setLayerState(layers.hero, heroLayerAlpha, false);

  // Single seamless SVG "*" zooms directly from YSR's slot to 100% solid Lava Orange screen coverage (ZERO swap!)
  if (zoomStarSvg && zoomStarLayer) {
    const maxScale = (Math.hypot(W, H) / Math.max(starHome.size * 0.34, 1)) * 1.15;
    const curScale = Math.pow(maxScale, Math.pow(starZoom, 1.32));
    const curX = lerp(starHome.x, W * 0.5, smoothstep(0.0, 0.65, starZoom));
    const curY = lerp(starHome.y, H * 0.5, smoothstep(0.0, 0.65, starZoom));
    const curRot = Math.pow(starZoom, 1.25) * 150;
    // Once full-screen solid #FF4D00 is reached (p >= 0.155), WebGL Lava seamlessly takes over with identical #FF4D00
    const handoffFade = 1.0 - smoothstep(0.156, 0.17, p);
    zoomStarSvg.style.transform =
      `translate3d(${(curX - starHome.size * 0.5).toFixed(1)}px, ${(curY - starHome.size * 0.5).toFixed(1)}px, 0) rotate(${curRot.toFixed(2)}deg) scale(${curScale.toFixed(3)})`;
    zoomStarSvg.style.opacity = handoffFade.toFixed(3);
    zoomStarLayer.style.visibility = handoffFade > 0.005 ? 'visible' : 'hidden';
  }

  // Radial scatter & fade-out of every Hero element around the expanding "*"
  const dEase = disperse * disperse;
  const fadeOut = (1.0 - disperse).toFixed(3);
  const blurPx = (dEase * 10.0).toFixed(1);
  if (heroParts.status) {
    heroParts.status.style.transform = `translate3d(0, ${(-dEase * 70).toFixed(1)}px, 0)`;
    heroParts.status.style.opacity = fadeOut;
    heroParts.status.style.filter = `blur(${blurPx}px)`;
  }
  if (heroParts.eyebrow) {
    heroParts.eyebrow.style.transform = `translate3d(${(-dEase * 95).toFixed(1)}px, ${(-dEase * 55).toFixed(1)}px, 0)`;
    heroParts.eyebrow.style.opacity = fadeOut;
    heroParts.eyebrow.style.filter = `blur(${blurPx}px)`;
  }
  if (heroParts.cyrus) {
    heroParts.cyrus.style.transform = `translate3d(${(-dEase * 165).toFixed(1)}px, ${(-dEase * 85).toFixed(1)}px, 0) rotate(${(-dEase * 4.5).toFixed(2)}deg)`;
    heroParts.cyrus.style.opacity = fadeOut;
    heroParts.cyrus.style.filter = `blur(${blurPx}px)`;
  }
  if (heroParts.ysr) {
    heroParts.ysr.style.transform = `translate3d(${(-dEase * 220).toFixed(1)}px, ${(dEase * 14).toFixed(1)}px, 0) rotate(${(-dEase * 3.0).toFixed(2)}deg)`;
    heroParts.ysr.style.opacity = fadeOut;
    heroParts.ysr.style.filter = `blur(${blurPx}px)`;
  }
  if (heroParts.footer) {
    heroParts.footer.style.transform = `translate3d(0, ${(dEase * 115).toFixed(1)}px, 0)`;
    heroParts.footer.style.opacity = fadeOut;
    heroParts.footer.style.filter = `blur(${blurPx}px)`;
  }

  // --- CH.02: SEAMLESS MOLTEN MAGMA FLOW AFTER FULL-SCREEN COVERAGE [0.15 - 0.255] ---
  const lavaCover = smoothstep(0.145, 0.156, p);
  const lavaFlow = smoothstep(0.16, 0.21, p);
  const lavaMeltOut = smoothstep(0.21, 0.258, p);
  lavaUniforms.uTime.value = clockTime;
  lavaUniforms.uStarScale.value = lavaCover;
  lavaUniforms.uLavaFlow.value = lavaFlow;
  lavaUniforms.uLavaMeltOut.value = lavaMeltOut;

  const lavaCaptionAlpha = smoothstep(0.155, 0.18, p) * (1.0 - smoothstep(0.21, 0.242, p));
  setLayerState(layers.lava, lavaCaptionAlpha, false, `scale(${lerp(0.88, 1.12, smoothstep(0.155, 0.242, p)).toFixed(3)})`);

  // --- CH.03: LUSION THERMAL FLOW + 100% LAVA ORANGE BRUSH [0.22 - 0.39] ---
  const thermalReveal = smoothstep(0.22, 0.285, p);
  const thermalExit = smoothstep(0.345, 0.395, p);
  const thermalActive = smoothstep(0.21, 0.26, p) * (1.0 - smoothstep(0.36, 0.40, p));

  if (thermalActive > 0.3 && !thermalChapterEntered) {
    thermalChapterEntered = true;
    layers.thermal.querySelectorAll('.kinetic-line, .kinetic-text').forEach((el, i) => {
      setTimeout(() => kineticDecrypt(el, el.dataset.text, 680), i * 130);
    });
  } else if (thermalActive < 0.05) {
    thermalChapterEntered = false;
  }

  simUniforms.uTime.value = clockTime;
  simUniforms.uMouse.value.copy(mouse.uv);
  simUniforms.uPrevMouse.value.copy(mouse.prevUv);
  simUniforms.uMouseSpeed.value = mouse.speed;
  simUniforms.uActive.value = thermalActive;

  if (thermalActive > 0.01) {
    simUniforms.uPrev.value = inkRead.texture;
    renderer.setRenderTarget(inkWrite);
    renderer.render(simScene, simCam);
    renderer.setRenderTarget(null);
    const tmp = inkRead; inkRead = inkWrite; inkWrite = tmp;
    thermalUniforms.uInkTex.value = inkRead.texture;
  }

  thermalUniforms.uTime.value = clockTime;
  thermalUniforms.uReveal.value = thermalReveal;
  thermalUniforms.uExit.value = thermalExit;
  thermalUniforms.uMouse.value.copy(mouse.uv);

  const thermalUiAlpha = smoothstep(0.245, 0.29, p) * (1.0 - smoothstep(0.335, 0.38, p));
  setLayerState(layers.thermal, thermalUiAlpha, false);

  // --- CH.04: SELECTED SYSTEMS — LIQUID RUBBER MEMBRANE COVER [0.365 - 0.62] ---
  const projEnter = smoothstep(0.365, 0.41, p);
  const projExit = smoothstep(0.585, 0.625, p);
  const projFloat = clamp((p - 0.41) / 0.175, 0, 1) * 3.0; // 0.0 -> 3.0 across 4 scenes
  const idxA = Math.min(2, Math.floor(projFloat));
  const idxB = Math.min(3, idxA + 1);
  const mixVal = projFloat - idxA;

  projectUniforms.uTexA.value = projectTextures[idxA];
  projectUniforms.uTexB.value = projectTextures[idxB];
  projectUniforms.uMix.value = mixVal;
  projectUniforms.uEnter.value = projEnter;
  projectUniforms.uExit.value = projExit;
  projectUniforms.uTime.value = clockTime;
  projectUniforms.uMouse.value.copy(mouse.uv);
  projectUniforms.uHoverVel.value = mouse.speed;

  const displayProjIdx = clamp(Math.round(projFloat), 0, 3);
  if (projEnter > 0.25 && projExit < 0.75) {
    syncProjectCopy(displayProjIdx);
  }
  const projUiAlpha = smoothstep(0.385, 0.42, p) * (1.0 - smoothstep(0.575, 0.61, p));
  setLayerState(layers.projects, projUiAlpha, true);

  // --- CH.05: FROM THE LAB (ANIME GIRL PARTICLES -> DISSOLVE RIGHT -> TECH STACK DRAWER) [0.605 - 0.785] ---
  const animePresence = smoothstep(0.605, 0.665, p);
  const animeDissolve = smoothstep(0.675, 0.735, p);
  const labIn = smoothstep(0.605, 0.64, p) * (1.0 - smoothstep(0.765, 0.795, p));

  if (animePresence > 0.45 && !labChapterEntered) {
    labChapterEntered = true;
    labAnimeHud.querySelectorAll('.kinetic-line').forEach((el, i) => {
      setTimeout(() => kineticDecrypt(el, el.dataset.text, 620), i * 120);
    });
  } else if (animePresence < 0.05) {
    labChapterEntered = false;
  }

  setLayerState(layers.lab, labIn, true);
  const animeHudAlpha = smoothstep(0.625, 0.66, p) * (1.0 - smoothstep(0.675, 0.71, p));
  labAnimeHud.style.opacity = animeHudAlpha.toFixed(3);
  labAnimeHud.style.transform = `translateY(${lerp(24, 0, smoothstep(0.625, 0.665, p)).toFixed(1)}px)`;

  const drawerSlideIn = smoothstep(0.695, 0.74, p);
  const drawerSlideOut = smoothstep(0.765, 0.795, p);
  const drawerX = lerp(115, 0, drawerSlideIn) + lerp(0, 115, drawerSlideOut);
  const drawerOp = drawerSlideIn * (1.0 - drawerSlideOut);
  stackDrawer.style.transform = `translate(${drawerX.toFixed(2)}%, -50%)`;
  stackDrawer.style.opacity = drawerOp.toFixed(3);
  stackDrawer.style.pointerEvents = drawerOp > 0.5 ? 'auto' : 'none';

  if (drawerSlideIn > 0.45 && drawerSlideOut < 0.3) triggerMechanicalCounters();
  else if (p < 0.64) resetMechanicalCounters();

  // --- CH.06: ANALOG VINYL SANCTUARY [0.77 - 0.91] ---
  const vinylMode = smoothstep(0.77, 0.825, p);
  const vinylUiAlpha = smoothstep(0.785, 0.825, p) * (1.0 - smoothstep(0.885, 0.92, p));
  const vinylShiftY = lerp(24, 0, smoothstep(0.785, 0.825, p)) - lerp(0, 48, smoothstep(0.885, 0.92, p));
  setLayerState(layers.vinyl, vinylUiAlpha, true, `translateY(${vinylShiftY.toFixed(1)}px)`);

  const targetSpin = audio.isPlaying ? 1.85 : 0.0;
  vinylAngularSpeed += (targetSpin - vinylAngularSpeed) * 0.045;
  if (vinylAngularSpeed > 0.002) vinylAngle = (vinylAngle + vinylAngularSpeed) % 360;
  const bassVibX = audio.isPlaying ? (Math.random() - 0.5) * bass * 5.2 : 0;
  const bassVibY = audio.isPlaying ? (Math.random() - 0.5) * bass * 5.2 : 0;
  const discScale = 1.0 + bass * (audio.isPlaying ? 0.022 : 0.004);
  vinylDiscEl.style.transform = `rotate(${vinylAngle.toFixed(2)}deg) scale(${discScale.toFixed(4)})`;

  if (vinylUiAlpha > 0.05) {
    turntableChassis.style.transform = `translate3d(${(bassVibX * 0.65).toFixed(2)}px, ${(bassVibY * 0.65).toFixed(2)}px, 0)`;
    turntableChassis.style.boxShadow = `0 34px 90px rgba(0,0,0,0.92), 0 0 ${(40 + bass * 85).toFixed(0)}px var(--accent-soft), inset 0 1px 1px rgba(255,255,255,0.18)`;
    turntableSpotlight.style.transform = `scale(${(1.0 + bass * 0.32).toFixed(3)})`;
    headshellEl.style.transform = `rotate(${(18 + (audio.isPlaying ? Math.sin(clockTime * 48) * (0.4 + bass * 2.2) : 0)).toFixed(2)}deg)`;

    vuBars.forEach((bar, i) => {
      const val = spectrum[i * 3] || 0;
      bar.style.height = `${Math.max(4, Math.round(val * 22))}px`;
    });
    ambientVeil.style.opacity = (vinylUiAlpha * (0.35 + bass * 0.65)).toFixed(3);
  } else {
    ambientVeil.style.opacity = '0';
  }

  // --- CH.07: FINALE PARTICLE WORDMARK ("CYRUS YSR", UMO-INSPIRED) [0.895 - 1.00] ---
  const wordmarkMode = smoothstep(0.895, 0.965, p);
  const finaleUiAlpha = smoothstep(0.91, 0.96, p);
  setLayerState(layers.finale, finaleUiAlpha, true, `translateY(${lerp(28, 0, finaleUiAlpha).toFixed(1)}px)`);

  // --- UPDATE 28,000-PARTICLE 3D SCULPTURE UNIFORMS ---
  const particleMidMask =
    (1.0 - smoothstep(0.15, 0.21, p)) +
    smoothstep(0.595, 0.64, p);

  particleUniforms.uTime.value = clockTime;
  particleUniforms.uHeroForm.value = heroState.form;
  particleUniforms.uHeroScatter.value = heroScatter;
  particleUniforms.uAnimePresence.value = animePresence;
  particleUniforms.uAnimeDissolve.value = animeDissolve;
  particleUniforms.uVinylMode.value = vinylMode;
  particleUniforms.uWordmarkMode.value = wordmarkMode;
  particleUniforms.uMasterOpacity.value = clamp(particleMidMask, 0.0, 1.0);
  particleUniforms.uMouseWorld.value.copy(mouse.world);
  particleUniforms.uMouseVel.value.copy(mouse.vel);
  particleUniforms.uAudioBass.value = bass;
  particleUniforms.uAudioMid.value = mid;

  // --- UPDATE RIGHT-SIDE SOUND WAVE NAVIGATOR ---
  swReadout.textContent = (p * 100).toFixed(1).padStart(4, '0') + '%';
  const peakIdx = p * (SW_COUNT - 1);
  for (let i = 0; i < SW_COUNT; i++) {
    const dist = Math.abs(i - peakIdx);
    const gauss = Math.exp(-dist * dist * 0.16);
    const wave = Math.sin(clockTime * 3.8 + i * 0.42) * (3.5 + chapterWavePulse * 14.0);
    const specBoost = (spectrum[i % 32] || 0) * (audio.isPlaying ? 26.0 : 5.0);
    const w = clamp(8 + gauss * 28 + Math.abs(wave) * (0.35 + gauss * 0.65) + specBoost * (0.3 + gauss * 0.7), 6, 46);
    swBars[i].style.width = `${w.toFixed(1)}px`;
    swBars[i].classList.toggle('peak', dist < 2.2);
  }

  // --- UPDATE CINEMATIC POST-PROCESSING ---
  postPass.uniforms.uTime.value = clockTime;
  postPass.uniforms.uScrollVel.value = frameScrollVel;
  postPass.uniforms.uBass.value = audio.isPlaying ? bass : 0;
  bloomPass.strength = 0.40 + bass * 0.25 * (vinylMode + wordmarkMode * 0.4) + lavaFlow * (1.0 - lavaMeltOut) * 0.18;

  composer.render();
}

requestAnimationFrame(animate);
