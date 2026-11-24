// ============================================================================
// CYRUS YSR — 3D DEPTH-MAPPED SCULPTURE & WORDMARK PARTICLE SAMPLER (28,000 PTS)
// 1. High-contrast David bust & Anime Girl -> volumetric 3D relief point clouds
// 2. High-density uniform sampling for Finale Particle Wordmark ("CYRUS YSR")
// ============================================================================

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function sampleSculptureFromImage(img, count, options = {}) {
  const {
    scaleX = 4.6,
    scaleY = 4.6,
    depthZ = 1.35,
    offsetX = 0,
    offsetY = 0,
    threshold = 18,
    preserveColor = false,
    accentBias = 0.0
  } = options;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);

  const data = ctx.getImageData(0, 0, size, size).data;
  const lum = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const candidates = [];
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const l = lum[idx];
      if (l < threshold) continue;

      const gx = lum[idx + 1] - lum[idx - 1];
      const gy = lum[idx + size] - lum[idx - size];
      const edge = Math.min(255, Math.hypot(gx, gy));
      const weight = (l / 255) * 0.72 + (edge / 255) * 1.15;

      if (Math.random() < Math.min(0.98, weight * 1.25)) {
        candidates.push({
          x, y, l: l / 255, edge: edge / 255,
          r: data[idx * 4] / 255,
          g: data[idx * 4 + 1] / 255,
          b: data[idx * 4 + 2] / 255
        });
      }
    }
  }

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  if (candidates.length < 100) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rad = 1.4;
      positions[i * 3] = rad * Math.sin(phi) * Math.cos(theta) + offsetX;
      positions[i * 3 + 1] = rad * Math.cos(phi) + offsetY;
      positions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
      colors[i * 3] = 0.94; colors[i * 3 + 1] = 0.90; colors[i * 3 + 2] = 0.86;
    }
    return { positions, colors };
  }

  const total = candidates.length;
  for (let i = 0; i < count; i++) {
    const c = candidates[Math.floor((i * 1.61803398875 * total) % total)];
    const nx = (c.x / size - 0.5) * 2.0;
    const ny = (0.5 - c.y / size) * 2.0;

    const radial = Math.max(0, 1.0 - (nx * nx * 0.85 + ny * ny * 0.55));
    const zRelief = (Math.pow(c.l, 0.85) * 0.72 + Math.sqrt(radial) * 0.48 - 0.35) * depthZ;
    const jitter = 0.016;

    positions[i * 3]     = nx * (scaleX * 0.5) + offsetX + (Math.random() - 0.5) * jitter;
    positions[i * 3 + 1] = ny * (scaleY * 0.5) + offsetY + (Math.random() - 0.5) * jitter;
    positions[i * 3 + 2] = zRelief + (Math.random() - 0.5) * 0.05;

    if (preserveColor) {
      const boost = 0.25 + c.l * 0.85 + c.edge * 0.25;
      colors[i * 3]     = Math.min(1.0, c.r * 1.18 * boost + accentBias * c.edge * 0.4);
      colors[i * 3 + 1] = Math.min(1.0, c.g * 1.08 * boost);
      colors[i * 3 + 2] = Math.min(1.0, c.b * 1.04 * boost);
    } else {
      const rim = Math.min(1.0, c.edge * 1.15);
      const lumShade = 0.32 + Math.pow(c.l, 0.8) * 0.68;
      colors[i * 3]     = Math.min(1.0, lumShade * 0.96 + rim * 0.28);
      colors[i * 3 + 1] = Math.min(1.0, lumShade * 0.92 + rim * 0.08);
      colors[i * 3 + 2] = Math.min(1.0, lumShade * 0.88);
    }
  }

  return { positions, colors };
}

/**
 * Sample a full-width halftone/volumetric 3D particle wordmark ("CYRUS YSR")
 * for the Finale chapter, using uniform stride sampling so letters are NEVER clipped.
 */
export function sampleWordmarkParticles(text, count, options = {}) {
  const {
    worldWidth = 6.2,
    worldHeight = 1.45,
    offsetX = -0.16,
    offsetY = -0.64,
    depthZ = 0.22
  } = options;

  const cw = 1400;
  const ch = 300;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Auto-fit font size to guarantee wide display fonts (like Syne) NEVER clip left/right
  let fSize = 180;
  ctx.font = `800 ${fSize}px "Syne", "Space Grotesk", sans-serif`;
  const measured = ctx.measureText(text).width;
  if (measured > cw * 0.90) {
    fSize = Math.floor(fSize * ((cw * 0.90) / measured));
    ctx.font = `800 ${fSize}px "Syne", "Space Grotesk", sans-serif`;
  }
  ctx.fillText(text, cw / 2, ch / 2);

  const data = ctx.getImageData(0, 0, cw, ch).data;
  const pts = [];
  const step = 3;
  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      const a = data[(y * cw + x) * 4];
      if (a > 110) {
        pts.push({
          nx: (x / cw - 0.5),
          ny: (0.5 - y / ch),
          edge: a < 220 ? 1.0 : 0.0
        });
      }
    }
  }

  const positions = new Float32Array(count * 3);
  const total = Math.max(1, pts.length);
  for (let i = 0; i < count; i++) {
    const p = pts[Math.floor((i * 1.61803398875 * total) % total)] || { nx: 0, ny: 0, edge: 0 };
    positions[i * 3]     = p.nx * worldWidth + offsetX + (Math.random() - 0.5) * 0.015;
    positions[i * 3 + 1] = p.ny * worldHeight + offsetY + (Math.random() - 0.5) * 0.015;
    positions[i * 3 + 2] = (Math.random() - 0.5) * depthZ + p.edge * 0.06;
  }

  return positions;
}
