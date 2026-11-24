// ============================================================================
// CYRUS YSR — AWARD SITE GLSL SHADER PIPELINE
// 1. 28,000-Particle 3D Sculpture & Flow Field Engine (David -> Anime -> Stack -> Vinyl)
// 2. UMO-Inspired Lava Star Expansion & Domain-Warped Molten Magma Fluid
// 3. Lusion-Inspired Liquid Zoom + Ping-Pong Lava Thermal Ink Brush (100% Lava Orange)
// 4. Liquid Rubber Membrane Project Cover Transition
// 5. Cinematic Post-Processing (Subtle Chromatic Aberration, Motion Blur, DOF, Film Noise)
// ============================================================================

export const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

vec3 curlNoise(vec3 p){
  float e=0.12;
  float n1=snoise(p+vec3(0.0,e,0.0));
  float n2=snoise(p-vec3(0.0,e,0.0));
  float n3=snoise(p+vec3(0.0,0.0,e));
  float n4=snoise(p-vec3(0.0,0.0,e));
  float n5=snoise(p+vec3(e,0.0,0.0));
  float n6=snoise(p-vec3(e,0.0,0.0));
  return vec3((n1-n2)-(n3-n4), (n3-n4)-(n5-n6), (n5-n6)-(n1-n2));
}

float hash21(vec2 p){
  p=fract(p*vec2(234.34,435.345));
  p+=dot(p,p+34.23);
  return fract(p.x*p.y);
}
`;

// ----------------------------------------------------------------------------
// 1. 28,000 GPU PARTICLE SCULPTURE SHADER
// ----------------------------------------------------------------------------
export const PARTICLE_VERT = /* glsl */ `
${NOISE_GLSL}

attribute vec3 aVoidPos;
attribute vec3 aDavidPos;
attribute vec3 aDavidColor;
attribute vec3 aAnimePos;
attribute vec3 aAnimeColor;
attribute vec3 aStreamPos;
attribute vec3 aWordmarkPos;
attribute vec4 aRand; // x: delay, y: size, z: phase, w: wanderFactor

uniform float uTime;
uniform float uPixelRatio;
uniform float uHeroForm;       // 0 = pure black void drift, 1 = David statue assembled
uniform float uHeroScatter;    // 0 -> 1 dissolve David during Lava Star
uniform float uAnimePresence;  // 0 -> 1 assemble Anime Girl in Lab
uniform float uAnimeDissolve;  // 0 -> 1 shatter Anime Girl & fly to right side
uniform float uVinylMode;      // 0 -> 1 orbit around Vinyl turntable
uniform float uWordmarkMode;   // 0 -> 1 coalesce into Finale "CYRUS YSR" particle wordmark
uniform float uMasterOpacity;  // global particle visibility
uniform vec2  uMouseWorld;     // mouse projected into particle plane
uniform vec2  uMouseVel;       // smoothed pointer velocity for silky particle drift follow
uniform float uAudioBass;      // 0..1 bass impulse from Web Audio
uniform float uAudioMid;       // 0..1 mid spectrum energy
uniform vec3  uAccentColor;    // Lava Orange (#FF4D00) or active Vinyl album tint

varying vec3  vColor;
varying float vAlpha;
varying float vSpark;

mat2 rot2(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

void main(){
  float delay = aRand.x;
  float phase = aRand.z * 6.28318;
  float wander = aRand.w;

  // --- STAGE A: VOID DRIFT ---
  vec3 voidP = aVoidPos;
  voidP += curlNoise(voidP * 0.28 + uTime * 0.14) * 0.75;

  // --- STAGE B: DAVID SCULPTURE (breathing, slow rotation, organic mouse-following drift) ---
  float formT = smoothstep(delay * 0.42, 0.56 + delay * 0.44, uHeroForm);
  vec3 davidP = aDavidPos;
  float breath = sin(uTime * 1.15 + davidP.y * 1.4) * 0.032;
  davidP *= (1.0 + breath);
  vec3 lifeNoise = curlNoise(davidP * 1.35 + uTime * 0.34);
  float detach = smoothstep(0.80, 1.0, wander) * (0.5 + 0.5 * sin(uTime * 0.95 + phase));
  davidP += lifeNoise * (0.048 + detach * 0.30);

  // Silky mouse-following floating drift (different depth/delay particles trail softly like stardust)
  float followWeight = 0.09 + wander * 0.14 + (1.0 - delay) * 0.08;
  davidP.xy += uMouseWorld * followWeight;
  davidP.xy += uMouseVel * (0.45 + wander * 1.25);
  davidP.z  += length(uMouseVel) * (0.35 + wander * 0.5);

  float davidAngle = sin(uTime * 0.34) * 0.30 + uMouseWorld.x * 0.11;
  davidP.xz *= rot2(davidAngle);
  davidP.yz *= rot2(-uMouseWorld.y * 0.08);

  vec3 pos = mix(voidP, davidP, formT);
  float flyArc = sin(formT * 3.14159) * (1.0 - step(0.99, formT));
  pos += curlNoise(pos * 0.45 + uTime * 0.25) * flyArc * 1.25;

  // Dissolve David outward when YSR* star expands
  if(uHeroScatter > 0.001){
    float sc = smoothstep(delay * 0.28, 0.72 + delay * 0.28, uHeroScatter);
    vec3 blastDir = normalize(pos + vec3(0.001)) + curlNoise(pos * 0.8 + uTime * 0.5) * 0.95;
    pos += blastDir * sc * 5.2;
  }

  // --- STAGE C: LAB ANIME GIRL (particle assembly + silky mouse-following wind drift) ---
  vec3 animeP = aAnimePos;
  float hairZone = smoothstep(-0.2, 1.3, length(animeP.xy));
  float animeBreath = sin(uTime * 1.45 + animeP.y * 2.2) * 0.028;
  animeP *= (1.0 + animeBreath);
  animeP.x += sin(uTime * 1.9 + animeP.y * 3.5 + phase) * 0.06 * hairZone;
  animeP.z += cos(uTime * 1.6 + animeP.x * 2.8) * 0.065 * hairZone;
  animeP += curlNoise(animeP * 1.6 + uTime * 0.38) * (0.028 + smoothstep(0.82, 1.0, wander) * 0.18);

  // Follow mouse gently with wind-blown hair trails
  animeP.xy += uMouseWorld * (0.08 + hairZone * 0.16 + wander * 0.08);
  animeP.xy += uMouseVel * (0.42 + hairZone * 1.35);
  animeP.xz *= rot2(sin(uTime * 0.42) * 0.16 + uMouseWorld.x * 0.09);

  float animeT = smoothstep(delay * 0.38, 0.62 + delay * 0.38, uAnimePresence);
  if(uAnimePresence > 0.001){
    vec3 labVoid = aVoidPos * 1.15 + curlNoise(aVoidPos * 0.35 + uTime * 0.2) * 0.8;
    vec3 labPos = mix(labVoid, animeP, animeT);
    labPos += curlNoise(labPos * 0.55 + uTime * 0.35) * sin(animeT * 3.14159) * 1.1;
    pos = mix(pos, labPos, smoothstep(0.0, 0.25, uAnimePresence));
  }

  // --- STAGE D: ANIME GIRL DISSOLVES & FLIES TO RIGHT -> TECH STACK STREAM ---
  float dissT = smoothstep(delay * 0.36, 0.64 + delay * 0.36, uAnimeDissolve);
  if(uAnimeDissolve > 0.001){
    vec3 streamP = aStreamPos;
    streamP.x += mod(uTime * (0.38 + aRand.y * 0.4) + aRand.x * 6.0, 8.5) - 4.25;
    streamP.y += sin(uTime * 0.9 + streamP.x * 0.8 + phase) * 0.35;
    streamP.z += cos(uTime * 0.7 + phase) * 0.3;

    vec3 shatterBurst = curlNoise(animeP * 1.8 + uTime * 0.9) * 2.1 + vec3(2.8, 0.4 * sin(phase), 0.6);
    vec3 midFly = animeP + shatterBurst * sin(dissT * 3.14159);
    vec3 flown = mix(midFly, streamP, smoothstep(0.18, 1.0, dissT));
    pos = mix(pos, flown, dissT);
  }

  // --- STAGE E: VINYL SANCTUARY AUDIO-REACTIVE ORBIT ---
  if(uVinylMode > 0.001){
    float vAngle = aRand.z * 6.28318 + uTime * (0.22 + uAudioMid * 0.65);
    float ringR = 1.65 + aRand.x * 3.4 + uAudioBass * (0.55 + aRand.w * 0.65);
    vec3 vinylP = vec3(
      -1.15 + cos(vAngle) * ringR,
      sin(vAngle) * ringR * 0.62 + sin(uTime * 1.6 + phase) * (0.18 + uAudioBass * 0.4),
      -1.2 + sin(vAngle * 2.0 + uTime * 0.6) * 0.9
    );
    pos = mix(pos, vinylP, smoothstep(0.0, 1.0, uVinylMode));
  }

  // --- STAGE F: FINALE PARTICLE WORDMARK ("CYRUS YSR", UMO-INSPIRED) ---
  float wmT = smoothstep(delay * 0.32, 0.68 + delay * 0.32, uWordmarkMode);
  if(uWordmarkMode > 0.001){
    vec3 wmP = aWordmarkPos;
    // Gentle living shimmer + audio bass micro-pulse
    wmP.y += sin(uTime * 1.8 + wmP.x * 1.5 + phase) * (0.015 + uAudioBass * 0.045);
    wmP.z += cos(uTime * 1.4 + wmP.x * 1.2) * 0.04;
    // Swirl arc during coalescence from Vinyl orbit into CYRUS YSR letters
    vec3 swirl = curlNoise(wmP * 0.9 + uTime * 0.45) * sin(wmT * 3.14159) * 1.4;
    pos = mix(pos, wmP + swirl, wmT);
  }

  // --- GLOBAL CURSOR WIND WAKE (SILKY FLOW DRIFT WITH ZERO HARSH STATIC HOLE) ---
  vec2 toMouse = pos.xy - uMouseWorld;
  float mDist = length(toMouse);
  float wakeRange = mix(1.9, 1.35, wmT);
  float mForce = 1.0 - smoothstep(0.0, wakeRange, mDist);
  if(mDist > 0.001){
    vec2 dir = toMouse / mDist;
    vec2 tangent = vec2(-dir.y, dir.x);
    float velMag = length(uMouseVel);
    // Sculptures drift strictly along cursor wind velocity + gentle curl swirl (zero dead hole at rest!)
    pos.xy += uMouseVel * mForce * (2.1 + wander * 1.4);
    pos.xy += (dir * (0.025 + wmT * 0.32 + velMag * 0.14) + tangent * (0.12 + velMag * 0.85)) * mForce * mForce;
    pos.z  += mForce * (0.28 + velMag * 0.85);
  }

  // --- DYNAMIC COLOR CHOREOGRAPHY ---
  vec3 davidTint = mix(aDavidColor, uAccentColor * 1.35, smoothstep(0.55, 0.95, wander) * 0.42 + mForce * 0.65);
  vec3 animeTint = mix(aAnimeColor, uAccentColor * 1.5, smoothstep(0.45, 0.95, aAnimeColor.r - aAnimeColor.b) * 0.85 + mForce * 0.65);
  vec3 emberTint = mix(uAccentColor * 1.35, vec3(1.0, 0.86, 0.72), aRand.y * 0.45 + uAudioBass * 0.45);
  vec3 wordmarkTint = mix(uAccentColor * 1.42, vec3(1.0, 0.93, 0.84), smoothstep(0.72, 1.0, aRand.y) * 0.65 + mForce * 0.85);

  vec3 col = mix(vec3(0.95, 0.42, 0.14), davidTint, formT);
  col = mix(col, animeTint, smoothstep(0.05, 0.85, uAnimePresence));
  col = mix(col, emberTint, clamp(dissT * 0.95 + uVinylMode, 0.0, 1.0));
  col = mix(col, wordmarkTint, wmT);
  col += uAccentColor * mForce * 0.75;

  vColor = col;
  vSpark = mForce + uAudioBass * 0.5 + smoothstep(0.85, 1.0, aRand.y) * 0.35;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  float baseSz = mix(10.0, 22.0, aRand.y);
  float sculptTight = max(max(formT * (1.0 - uHeroScatter), animeT * (1.0 - dissT)), wmT);
  float sz = mix(baseSz, baseSz * (wmT > 0.5 ? 0.84 : 0.76), sculptTight);
  sz *= (1.0 + uAudioBass * 0.50 * (uVinylMode + wmT * 0.4) + mForce * 0.42);
  gl_PointSize = clamp(sz * uPixelRatio / max(-mvPos.z, 0.8), 1.4, 16.0);

  float depthFade = 1.0 - smoothstep(2.2, 10.5, -mvPos.z);
  vAlpha = uMasterOpacity * depthFade * (0.48 + 0.52 * max(sculptTight, 0.45 + aRand.y * 0.45));
}
`;

export const PARTICLE_FRAG = /* glsl */ `
precision highp float;
varying vec3  vColor;
varying float vAlpha;
varying float vSpark;

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d > 0.5) discard;
  // Crisp luminous core + soft subtle halo for UnrealBloom pickup
  float core = 1.0 - smoothstep(0.05, 0.5, d);
  float hot  = 1.0 - smoothstep(0.0, 0.24, d);
  vec3 col = vColor + vec3(0.45, 0.25, 0.15) * hot * (0.4 + vSpark * 0.6);
  gl_FragColor = vec4(col, core * vAlpha);
}
`;

// ----------------------------------------------------------------------------
// 2. UMO-INSPIRED LAVA STAR EXPANSION + MOLTEN MAGMA FLOW FIELD
// ----------------------------------------------------------------------------
export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const LAVA_TRANSITION_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}

varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform float uStarScale;    // 0 -> 1 (grows seamlessly from YSR's * anchor to engulf screen)
uniform vec2  uStarOrigin;   // exact UV coordinates of the "*" next to YSR
uniform float uStarInitSize; // exact initial arm size matching the DOM "*" glyph
uniform float uLavaFlow;     // 0 -> 1 (screen turns molten orange then flows & melts open)
uniform float uLavaMeltOut;  // 0 -> 1 (melts away via liquid noise into Chapter 3)
uniform vec3  uAccent;

// Sharp 6-point sculptural asterisk / star symbol SDF
float sdAsterisk(vec2 p, float armLen, float thickness){
  float d = 1e5;
  for(int i = 0; i < 3; i++){
    float a = float(i) * 1.04719755; // 60 deg
    float cs = cos(a), sn = sin(a);
    vec2 rp = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
    vec2 q = abs(rp) - vec2(armLen, thickness);
    float seg = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    d = min(d, seg);
  }
  return d;
}

float fbmLava(vec2 p, float t){
  float v = 0.0;
  float a = 0.52;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 4; i++){
    v += a * (0.5 + 0.5 * snoise(vec3(p, t)));
    p = m * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main(){
  if(uStarScale <= 0.001 || uLavaMeltOut >= 0.999) discard;

  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 p = (vUv - 0.5) * aspect;

  // Seamless full-screen molten handoff once the single DOM/SVG "*" after YSR has expanded to engulf the screen
  float coverAlpha = smoothstep(0.0, 0.05, uStarScale);

  // Domain-warped molten lava fluid texture
  vec2 q = p * 2.2;
  vec2 warp = vec2(
    fbmLava(q + vec2(0.0, uTime * 0.25), uTime * 0.22),
    fbmLava(q + vec2(4.2, -uTime * 0.28), uTime * 0.22)
  );
  float lavaN = fbmLava(q + warp * 2.3 + vec2(0.0, -uTime * 0.35), uTime * 0.18);

  // Exact #FF4D00 match at uLavaFlow = 0 -> boils into rich molten magma fluid
  vec3 obsidian = vec3(0.05, 0.012, 0.005);
  vec3 hotCore  = vec3(1.0, 0.72, 0.26);
  vec3 solidOrange = uAccent;
  vec3 molten = mix(obsidian, uAccent * 1.35, smoothstep(0.24, 0.68, lavaN));
  molten = mix(molten, hotCore, smoothstep(0.68, 0.92, lavaN));

  vec3 col = mix(solidOrange, molten, smoothstep(0.0, 0.82, uLavaFlow));

  // Liquid melt-out reveal into next chapter (NO FADE — pure fluid noise dissolve)
  float meltField = fbmLava(p * 2.6 + warp * 1.6, uTime * 0.25);
  float meltEdge = uLavaMeltOut * 1.35 - 0.15;
  float keepMask = smoothstep(meltEdge - 0.08, meltEdge + 0.08, meltField);
  float seam = (1.0 - smoothstep(0.0, 0.11, abs(meltField - meltEdge))) * smoothstep(0.01, 0.15, uLavaMeltOut) * (1.0 - smoothstep(0.88, 1.0, uLavaMeltOut));
  col += hotCore * seam * 1.4;

  float alpha = coverAlpha * keepMask;
  if(alpha <= 0.004) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

// ----------------------------------------------------------------------------
// 3A. LUSION-INSPIRED PING-PONG LAVA THERMAL INK FLUID BUFFER (100% LAVA ORANGE)
// ----------------------------------------------------------------------------
export const THERMAL_SIM_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}

varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;      // 0..1 UV
uniform vec2  uPrevMouse;  // 0..1 UV
uniform float uMouseSpeed;
uniform float uActive;

float distToSegment(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main(){
  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);

  // Advect previous thermal ink along organic curling flow field (like rising heat & magma ink)
  float n1 = snoise(vec3(vUv * 4.2, uTime * 0.42));
  float n2 = snoise(vec3(vUv * 4.2 + 11.7, uTime * 0.42));
  vec2 flow = vec2(n1, n2) * 0.0042 + vec2(0.0, -0.0016);
  vec2 advUv = vUv - flow;

  // 4-tap subtle thermal diffusion blur + cooling decay
  vec2 px = 1.5 / uRes;
  vec4 prev = (
    texture2D(uPrev, advUv) * 0.48 +
    texture2D(uPrev, advUv + vec2(px.x, 0.0)) * 0.13 +
    texture2D(uPrev, advUv - vec2(px.x, 0.0)) * 0.13 +
    texture2D(uPrev, advUv + vec2(0.0, px.y)) * 0.13 +
    texture2D(uPrev, advUv - vec2(0.0, px.y)) * 0.13
  );
  float heat = prev.r * 0.968;
  vec2 vel = prev.gb * 0.94;

  // Inject molten lava brush stroke along cursor segment
  if(uActive > 0.05){
    float segD = distToSegment(vUv * aspect, uPrevMouse * aspect, uMouse * aspect);
    float radius = 0.022 + clamp(uMouseSpeed * 0.06, 0.0, 0.038);
    float brush = (1.0 - smoothstep(0.0, radius, segD)) * (0.55 + clamp(uMouseSpeed * 2.8, 0.0, 1.0));
    // Add ambient subtle autonomous magma ribbon even before mouse moves so screen feels alive
    vec2 autoPt = vec2(0.5 + sin(uTime * 0.72) * 0.28, 0.5 + cos(uTime * 0.53) * 0.18);
    float autoStroke = (1.0 - smoothstep(0.0, 0.026, length((vUv - autoPt) * aspect))) * 0.14;
    heat = clamp(heat + (brush + autoStroke) * uActive, 0.0, 1.4);
    vec2 mDelta = (uMouse - uPrevMouse) * 18.0;
    vel += mDelta * brush;
  }

  gl_FragColor = vec4(heat, clamp(vel.x, -1.0, 1.0), clamp(vel.y, -1.0, 1.0), 1.0);
}
`;

// ----------------------------------------------------------------------------
// 3B. THERMAL FLOW BACKGROUND ("LIQUID MAGNIFIER PULL" + LAVA INK COMPOSITE)
// ----------------------------------------------------------------------------
export const THERMAL_DISPLAY_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}

varying vec2 vUv;
uniform sampler2D uInkTex;
uniform sampler2D uBgTex;
uniform vec2  uRes;
uniform float uTime;
uniform float uReveal;    // 0 -> 1 liquid magnifier pull-out reveal
uniform float uExit;      // 0 -> 1 melt out into Projects
uniform vec2  uMouse;
uniform vec3  uAccent;

void main(){
  if(uReveal <= 0.002 || uExit >= 0.998) discard;

  vec2 centered = vUv - 0.5;
  float r = length(centered);

  // Liquid Zoom + Flow Field + Noise Warp ("pulled out like a water lens")
  float pull = 1.0 - uReveal;
  float lensZoom = mix(1.0, 0.35, pull * pull);
  vec2 flowWarp = vec2(
    snoise(vec3(vUv * 3.0, uTime * 0.35)),
    snoise(vec3(vUv * 3.0 + 7.3, uTime * 0.35))
  );
  vec2 warpedUv = 0.5 + centered * (lensZoom + r * r * pull * 1.45) + flowWarp * (0.018 + pull * 0.14);

  // Sample lava ink FBO (100% molten lava orange — ZERO blue!)
  vec4 ink = texture2D(uInkTex, vUv);
  float heat = ink.r;
  vec2 inkDistort = ink.gb * 0.045;

  // Distort kinetic fluid backdrop using thermal heat wave
  vec2 bgUv = clamp(warpedUv + inkDistort + flowWarp * heat * 0.04, 0.001, 0.999);
  // Subtle RGB chromatic split inside hot lava wake
  float ca = 0.003 + heat * 0.009 + pull * 0.015;
  vec3 bgCol = vec3(
    texture2D(uBgTex, bgUv + vec2(ca, 0.0)).r,
    texture2D(uBgTex, bgUv).g,
    texture2D(uBgTex, bgUv - vec2(ca, 0.0)).b
  ) * 0.42;

  // Flowing dark magma energy currents in background
  float stream = 0.5 + 0.5 * snoise(vec3(warpedUv * 5.0 + vec2(-uTime * 0.25, uTime * 0.14), uTime * 0.18));
  float vein = smoothstep(0.68, 0.92, stream);
  bgCol += uAccent * vein * 0.24;

  // Render Lava Thermal Ink Brush: dark ember -> blazing lava orange -> incandescent white-gold
  vec3 deepMagma = vec3(0.52, 0.07, 0.01);
  vec3 brightLava = uAccent * 1.55;
  vec3 incandescent = vec3(1.0, 0.88, 0.52);

  vec3 inkCol = mix(vec3(0.0), deepMagma, smoothstep(0.03, 0.24, heat));
  inkCol = mix(inkCol, brightLava, smoothstep(0.22, 0.62, heat));
  inkCol = mix(inkCol, incandescent, smoothstep(0.62, 1.15, heat));

  vec3 col = bgCol + inkCol * (1.05 + 0.35 * sin(uTime * 6.0 + heat * 8.0));

  // Liquid water-ripple reveal mask & melt exit
  float nMask = 0.5 + 0.5 * snoise(vec3(vUv * 3.4, uTime * 0.3));
  float inMask = smoothstep(r * 0.85 + nMask * 0.25 - 0.12, r * 0.85 + nMask * 0.25 + 0.06, uReveal * 1.25);
  float outMask = 1.0 - smoothstep(nMask * 0.7 - 0.08, nMask * 0.7 + 0.08, uExit * 1.15 - 0.15);

  float alpha = inMask * outMask;
  if(alpha <= 0.004) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

// ----------------------------------------------------------------------------
// 4. PROJECTS SECTION — LIQUID RUBBER MEMBRANE COVER SHADER
// ----------------------------------------------------------------------------
export const PROJECT_MEMBRANE_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}

varying vec2 vUv;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec2  uRes;
uniform float uTime;
uniform float uMix;         // 0 = pure TexA, 0..1 = TexB liquid membrane surging over TexA
uniform float uEnter;       // 0 -> 1 fluid entry into Projects chapter
uniform float uExit;        // 0 -> 1 dissolve exit into Lab
uniform vec2  uMouse;       // 0..1
uniform float uHoverVel;
uniform vec3  uAccent;

// Aspect-preserving cover UV
vec2 coverUv(vec2 uv, vec2 screenRes, float imgAspect){
  float screenAspect = screenRes.x / max(screenRes.y, 1.0);
  vec2 scale = vec2(1.0);
  if(screenAspect > imgAspect){
    scale.y = imgAspect / screenAspect;
  } else {
    scale.x = screenAspect / imgAspect;
  }
  return (uv - 0.5) * scale + 0.5;
}

void main(){
  if(uEnter <= 0.002 || uExit >= 0.998) discard;

  vec2 uv = vUv;
  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);

  // Rubber elastic surface ripple driven by cursor
  vec2 mDelta = (uv - uMouse) * aspect;
  float mDist = length(mDelta);
  float rubber = exp(-mDist * 4.2) * sin(mDist * 18.0 - uTime * 5.0) * (0.012 + uHoverVel * 0.045);
  vec2 elasticUv = uv + normalize(mDelta + 1e-4) * rubber;

  // Fluid Membrane Noise Surface surging upward like liquid rubber
  float n1 = snoise(vec3(uv * vec2(2.6, 2.0), uTime * 0.32));
  float n2 = snoise(vec3(uv * vec2(5.4, 4.2) + 4.1, uTime * 0.55));
  float organicFront = (n1 * 0.14 + n2 * 0.05) + sin(uv.x * 3.14159) * 0.09;

  // Membrane bulge progress from bottom (y=0) to top (y=1)
  float threshold = uMix * 1.38 - 0.19;
  float distFront = uv.y - (threshold + organicFront);
  // STRICT GLSL spec: edge0 MUST be < edge1 (never reverse smoothstep!)
  float maskB = 1.0 - smoothstep(-0.035, 0.035, distFront);

  // Elastic rubber bulge distortion strictly around the advancing liquid front
  float frontBand = exp(-abs(distFront) * 14.0) * sin(uMix * 3.14159);
  vec2 bulgeOffset = vec2(n1, -0.6 + n2) * frontBand * 0.095;

  vec2 uvA = coverUv(clamp(elasticUv - bulgeOffset * 0.65, 0.002, 0.998), uRes, 1.7777);
  vec2 uvB = coverUv(clamp(elasticUv + bulgeOffset * 1.15, 0.002, 0.998), uRes, 1.7777);

  // Slight chromatic aberration on the stretching rubber ridge
  float ca = 0.0025 + frontBand * 0.014;
  vec3 colA = vec3(
    texture2D(uTexA, uvA + vec2(ca, 0.0)).r,
    texture2D(uTexA, uvA).g,
    texture2D(uTexA, uvA - vec2(ca, 0.0)).b
  );
  vec3 colB = vec3(
    texture2D(uTexB, uvB + vec2(ca, 0.0)).r,
    texture2D(uTexB, uvB).g,
    texture2D(uTexB, uvB - vec2(ca, 0.0)).b
  );

  // Subtle dark cinematic vignette centered on artwork focus (right-center)
  float vig = 1.0 - smoothstep(0.28, 1.05, length((uv - vec2(0.62, 0.5)) * vec2(1.05, 0.92)));
  vec3 col = mix(colA, colB, maskB) * (0.56 + 0.56 * vig);

  // Molten lava-orange specular rim along the liquid membrane crest
  col += uAccent * 1.85 * frontBand * (1.0 - smoothstep(0.0, 0.18, abs(distFront)));

  // Enter & exit fluid masks (strictly ascending smoothstep edges!)
  float enterField = uv.y + n1 * 0.18;
  float enterCutoff = uEnter * 1.48 - 0.24;
  float enterMask = 1.0 - smoothstep(enterCutoff - 0.06, enterCutoff + 0.06, enterField);
  float exitField = 0.5 + 0.5 * n1 + (1.0 - uv.y) * 0.35;
  float exitCutoff = uExit * 1.48 - 0.14;
  float exitMask = smoothstep(exitCutoff - 0.09, exitCutoff + 0.09, exitField);

  // Glowing rim during enter/exit liquid sweep
  float enterRim = (1.0 - smoothstep(0.0, 0.09, abs(enterField - enterCutoff))) * smoothstep(0.02, 0.15, uEnter) * (1.0 - smoothstep(0.88, 1.0, uEnter));
  col += uAccent * 1.4 * enterRim;

  float alpha = enterMask * exitMask;
  if(alpha <= 0.004) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

// ----------------------------------------------------------------------------
// 5. CINEMATIC AWARD POST-PROCESSING PASS (Chromatic Aberration + Motion Blur + DOF + Noise)
// ----------------------------------------------------------------------------
export const AWARD_POST_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uScrollVel: { value: 0 },
    uBass: { value: 0 },
    uRes: { value: null }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uScrollVel;
    uniform float uBass;
    uniform vec2  uRes;
    varying vec2 vUv;

    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main(){
      vec2 uv = vUv;
      vec2 dir = uv - 0.5;
      float dist = length(dir);

      // 1. Subtle radial Chromatic Aberration (amplified slightly on fast scroll or bass hit)
      float caAmt = 0.0014 + dist * 0.0022 + abs(uScrollVel) * 0.0045 + uBass * 0.0022;
      vec2 caOff = dir * caAmt;

      // 2. Subtle directional Motion Blur on fast scrolling + Edge Depth-of-Field softness
      float dofBlur = smoothstep(0.42, 0.85, dist) * 0.0026;
      float mbAmt = clamp(abs(uScrollVel) * 0.012, 0.0, 0.014);
      vec2 mbStep = vec2(0.0, sign(uScrollVel) * mbAmt);

      vec3 col = vec3(0.0);
      // 3-tap velocity motion blur + subtle peripheral DOF + RGB split
      for(int i = -1; i <= 1; i++){
        float fi = float(i);
        vec2 sUv = uv + mbStep * fi + vec2(dofBlur * fi, -dofBlur * fi * 0.5);
        col.r += texture2D(tDiffuse, clamp(sUv + caOff, 0.001, 0.999)).r;
        col.g += texture2D(tDiffuse, clamp(sUv, 0.001, 0.999)).g;
        col.b += texture2D(tDiffuse, clamp(sUv - caOff, 0.001, 0.999)).b;
      }
      col /= 3.0;

      // 3. Subtle Organic Film Grain Noise
      float grain = (rand(uv * uRes + fract(uTime * 17.3)) - 0.5) * 0.028;
      col += grain;

      // 4. Gentle Cinematic Vignette
      float vig = 1.0 - smoothstep(0.35, 1.18, dist);
      col *= (0.76 + 0.24 * vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
