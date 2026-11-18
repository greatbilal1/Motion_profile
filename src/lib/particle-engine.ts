// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- intentional, see reason below
// @ts-nocheck -- typed-array hot loops; strict index checks add noise without safety here
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type Theme = "original" | "gold" | "ice" | "ember" | "mono";
export const THEMES: Theme[] = ["original", "gold", "ice", "ember", "mono"];
const THEME_ID: Record<Theme, number> = { original: 0, gold: 1, ice: 2, ember: 3, mono: 4 };

export interface EngineSettings {
  dispersion: number; // repulsion force
  size: number;
  speed: number;
  turbulence: number;
  bloom: number;
  theme: Theme;
  autoLoop: boolean;
  pulse: number; // 0..1 audio pulse
}

// Ashima/Stefan Gustavson 3D simplex noise (MIT)
const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 noise3(vec3 p){ return vec3(snoise(p), snoise(p+vec3(31.4,17.2,-9.1)), snoise(p+vec3(-21.7,43.3,11.9))); }
`;

export const STYLE_COUNT = 3;

const vertex = /* glsl */ `
uniform float uTime, uMorph, uSize, uTurb, uPulse, uPixel, uRipple; uniform int uStyle;
attribute vec3 aColor; attribute vec3 aOffset; attribute vec4 aRand;
varying vec3 vColor; varying float vAlpha; varying float vTravel; varying float vGlow;
${noise}
void main(){
  vec3 home = position;
  float t = uTime;
  float lum = dot(aColor, vec3(0.299,0.587,0.114));

  // formed state: slow, low-frequency breathing so the portrait feels alive, not frozen
  vec3 formed = home;
  formed += noise3(home*0.28 + vec3(0.0, 0.0, t*0.09)) * 0.045 * uTurb;
  formed.z += sin(t*0.7 + home.y*0.45) * 0.03 * uTurb;
  // ripple: a ring of light that travels out from the face (triggered on tab change)
  float rr = length(home.xy - vec2(0.0, 1.6)) + snoise(home*0.9)*0.25;
  float ring = exp(-pow((rr - uRipple*5.0)*1.1, 2.0)) * exp(-uRipple*0.55);
  formed.z += ring * 0.8;
  formed.xy += normalize(home.xy - vec2(0.0, 1.6) + 1e-4) * ring * 0.08;

  // dispersed state: organic, bounded around the portrait (never over the text).
  // uMorph is uniform, so this whole block is skipped cheaply while the portrait is formed.
  vec3 p = formed; float e = 0.0;
  if (uMorph > 0.0) {
  vec3 far; float order;
  if (uStyle == 0) { // drift: carried off to the side by a soft wind, like sand
    float dist = 1.5 + aRand.z*aRand.z*5.5;
    far = home + vec3(1.0, 0.32, -0.35)*dist + noise3(home*0.22 + aRand.xyz*0.6)*(0.8+dist*0.35);
    order = 1.0 - clamp((home.x + 5.0)/10.0, 0.0, 1.0); // downwind edge leaves first
  } else if (uStyle == 1) { // nebula: loosens into a soft volumetric cloud
    vec3 dir = normalize(noise3(aRand.xyz*4.0 + home*0.08) + vec3(home.xy*0.12, 0.0));
    far = home*0.55 + dir*(2.0 + pow(aRand.w, 0.7)*3.2);
    order = clamp(1.0 - length(home.xy)/6.0, 0.0, 1.0); // outer edge first
  } else { // rise: lifts upward like embers or smoke
    float h = 2.0 + aRand.z*4.5;
    far = home + vec3((aRand.x-0.5)*3.0 + sin(h*0.9+aRand.y*6.0)*1.4, h, (aRand.y-0.5)*3.0);
    order = clamp(1.0 - (home.y + 6.0)/12.0, 0.0, 1.0); // top first
  }
  // keep the cloud gently flowing while dispersed
  far += noise3(far*0.16 + vec3(t*0.04, t*0.03, 0.0)) * 1.4 * uTurb;

  // ragged, organic stagger: sweep order broken up by noise so there's no hard front
  float delay = clamp(order*0.75 + snoise(home*0.6)*0.12 + aRand.x*0.13, 0.0, 1.0);
  float local = clamp((uMorph - delay*0.5) / 0.5, 0.0, 1.0);
  e = local*local*(3.0 - 2.0*local); // smoothstep ease in/out
  e = e*e*(3.0 - 2.0*e);             // softer start and landing

  p = mix(formed, far, e);
  // curling path while in flight
  float arc = sin(e*3.14159);
  if (arc > 0.001) p += noise3(p*0.3 + vec3(t*0.12) + aRand.zyx) * arc * 1.3 * uTurb;
  }
  p += aOffset;

  vec4 mv = modelViewMatrix * vec4(p,1.0);
  gl_Position = projectionMatrix * mv;
  float s = uSize * (0.75 + aRand.w*0.5) * mix(0.8, 1.15, lum) * mix(1.0, 0.85, e) * (1.0 + uPulse*0.8*aRand.x);
  gl_PointSize = s * uPixel * (30.0 / -mv.z);

  float twinkle = 0.7 + 0.3*sin(t*2.2 + aRand.y*40.0);
  vAlpha = mix(0.5, 1.0, smoothstep(0.03, 0.45, lum)) * mix(1.0, 0.8*twinkle, e);
  vColor = aColor; vTravel = e; vGlow = ring * (1.0 - e);
}`;

const fragment = /* glsl */ `
uniform int uTheme; uniform float uPulse;
varying vec3 vColor; varying float vAlpha; varying float vTravel; varying float vGlow;
void main(){
  vec2 c = gl_PointCoord-0.5; float d2 = dot(c,c);
  if(d2>0.25) discard;
  float a = exp(-d2*14.0) * vAlpha; // soft gaussian dot instead of a hard disc
  vec3 col = vColor;
  float l = dot(col, vec3(0.299,0.587,0.114));
  if(uTheme==0) col = pow(max(mix(vec3(l), col, 1.12), 0.0), vec3(0.9)); // gentle saturation + lift
  else if(uTheme==1) col = mix(vec3(0.08,0.04,0.0), vec3(1.0,0.78,0.38), l*1.2);
  else if(uTheme==2) col = mix(vec3(0.0,0.03,0.1), vec3(0.6,0.9,1.0), l*1.2);
  else if(uTheme==3) col = mix(vec3(0.1,0.0,0.02), vec3(1.0,0.4,0.15), l*1.3);
  else if(uTheme==4) col = vec3(l*1.1);
  // particles in flight catch a little warm light, so the cloud stays visible
  col = mix(col, col*vec3(1.15,1.02,0.88) + vec3(0.07,0.05,0.03), vTravel*0.6);
  col *= 1.0 + uPulse*0.4;
  col += vGlow * vec3(0.7, 0.55, 0.3);
  gl_FragColor = vec4(col, min(1.0, a + vGlow*0.5));
}`;

// separable box blur, radius r (in pixels)
function boxBlur(src: Float32Array, W: number, H: number, r: number) {
  const tmp = new Float32Array(W * H),
    out = new Float32Array(W * H),
    n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = sum / n;
      sum += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = sum / n;
      sum += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}

export async function sampleImage(src: string, count: number) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const W = 640;
  const H = Math.round((img.height / img.width) * W);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++)
    lum[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
  // light blur before edge detection so photo grain / JPEG noise doesn't attract stray particles
  const soft = boxBlur(lum, W, H, 1);
  // heavy blur drives the depth relief (broad forms, not pixel detail)
  const relief = boxBlur(boxBlur(lum, W, H, 12), W, H, 12);
  // importance = edge detail + tonal fill; features dense, backgrounds sparse
  const w = new Float32Array(W * H);
  let total = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = soft[i + 1] - soft[i - 1],
        gy = soft[i + W] - soft[i - W];
      const edge = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 6);
      // skin-tone detection: faces & hands get far more particles
      const r = d[i * 4],
        gg = d[i * 4 + 1],
        b = d[i * 4 + 2];
      const skin =
        r > 80 &&
        gg > 40 &&
        b > 20 &&
        r > gg &&
        r > b &&
        r - Math.min(gg, b) > 15 &&
        Math.abs(r - gg) > 10
          ? 1
          : 0;
      // soft focus on the upper-center region where the face usually sits
      const fx = (x / W - 0.5) / 0.3,
        fy = (y / H - 0.36) / 0.32;
      const focus = Math.exp(-(fx * fx + fy * fy));
      const v =
        (0.02 + soft[i] * 0.12 + edge * edge * 0.9 + edge * 0.3) * (0.2 + skin * 1.8 + focus * 3.5);
      // fade out toward the photo edges so there is no hard rectangle
      const ex = Math.min(x, W - x) / (W * 0.2),
        ey = Math.min(y, H - y) / (H * 0.14);
      const fade = Math.min(1, ex) * Math.min(1, ey);
      w[i] = v * fade * fade * fade;
      total += w[i];
    }
  const pos = new Float32Array(count * 3),
    col = new Float32Array(count * 3);
  const scale = 11 / Math.max(W, H);
  // stratified sampling over cumulative weight
  const step = total / count;
  let acc = Math.random() * step,
    k = 0,
    run = 0;
  for (let i = 0; i < W * H && k < count; i++) {
    run += w[i];
    while (run >= acc && k < count) {
      const px = i % W,
        py = Math.floor(i / W);
      // jitter wider than a pixel so the scanline sampling order never shows as hatching
      const x = px + (Math.random() - 0.5) * 1.8,
        y = py + (Math.random() - 0.5) * 1.8;
      // sculpted depth: a soft head-shaped dome + broad tonal relief + a touch of fine detail
      const dx = (px / W - 0.5) / 0.36,
        dy = (py / H - 0.4) / 0.42;
      const dome = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      pos[k * 3] = (x - W / 2) * scale;
      pos[k * 3 + 1] = -(y - H / 2) * scale;
      pos[k * 3 + 2] =
        dome * 1.6 +
        (relief[i] - 0.5) * 0.7 +
        (lum[i] - relief[i]) * 0.25 +
        (Math.random() - 0.5) * 0.06;
      col[k * 3] = d[i * 4] / 255;
      col[k * 3 + 1] = d[i * 4 + 1] / 255;
      col[k * 3 + 2] = d[i * 4 + 2] / 255;
      k++;
      acc += step;
    }
  }
  return { pos, col, count: k };
}

export class ParticleEngine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  points?: THREE.Points;
  mat: THREE.ShaderMaterial;
  base?: Float32Array;
  offset?: Float32Array;
  vel?: Float32Array;
  mouse = new THREE.Vector2(9, 9);
  mouseWorld = new THREE.Vector3();
  mouseActive = false;
  raycaster = new THREE.Raycaster();
  plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  morph = 1;
  morphTarget = 0;
  loopTimer = 0;
  style = 0;
  raf = 0;
  clock = new THREE.Clock();
  sway = new THREE.Vector2();
  localMouse = new THREE.Vector3();
  settings: EngineSettings;
  constructor(
    private el: HTMLElement,
    settings: EngineSettings,
  ) {
    this.settings = settings;
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x050507, 1);
    el.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.camera.position.set(0, 0, 19);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 40;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 1 },
        uSize: { value: 1 },
        uTurb: { value: 1 },
        uPulse: { value: 0 },
        uPixel: { value: this.renderer.getPixelRatio() },
        uTheme: { value: 0 },
        uStyle: { value: 0 },
        uRipple: { value: 99 },
      },
    });
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.4, 0.75);
    this.composer.addPass(this.bloom);
    const c = this.renderer.domElement;
    c.addEventListener("pointermove", this.onMove);
    c.addEventListener("pointerleave", () => (this.mouseActive = false));
    window.addEventListener("resize", this.resize);
    this.resize();
    this.loop();
  }
  onMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.mouseActive = true;
  };
  resize = () => {
    const w = this.el.clientWidth,
      h = this.el.clientHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // wide screens: push the portrait to the right, leaving room for profile text
    if (w >= 900) this.camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  };
  async load(src: string, count = 60000) {
    const { pos, col, count: n } = await sampleImage(src, count);
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos.subarray(0, n * 3), 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col.subarray(0, n * 3), 3));
    this.offset = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    const off = new THREE.BufferAttribute(this.offset, 3);
    off.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aOffset", off);
    const rnd = new Float32Array(n * 4);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
    this.base = pos;
    this.points = new THREE.Points(g, this.mat);
    this.scene.add(this.points);
    this.morph = 1;
    this.morphTarget = 0;
    this.loopTimer = 0;
    return n;
  }
  setMorph(target: number) {
    if (target === this.morphTarget) return;
    // new shape every time we leave the portrait; reverse stagger order randomly
    // new dispersal style each time we leave the fully formed portrait
    if (target === 1 && this.morph < 0.05) {
      let n;
      do {
        n = Math.floor(Math.random() * STYLE_COUNT);
      } while (n === this.style);
      this.style = n;
      this.mat.uniforms.uStyle.value = n;
    }
    this.morphTarget = target;
    this.loopTimer = 0;
  }
  loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05),
      s = this.settings;
    const u = this.mat.uniforms;
    u.uTime.value += dt * s.speed;
    u.uRipple.value = Math.min(99, u.uRipple.value + dt);
    u.uSize.value = s.size;
    u.uTurb.value = s.turbulence;
    u.uPulse.value = s.pulse;
    u.uTheme.value = THEME_ID[s.theme];
    this.bloom.strength = s.bloom;
    if (s.autoLoop) {
      // once settled, linger on the portrait; keep the dispersed cloud brief
      if (this.morph === this.morphTarget) this.loopTimer += dt;
      if (this.loopTimer > (this.morphTarget === 0 ? 9 : 4)) this.setMorph(1 - this.morphTarget);
    }
    // constant-rate progress; easing happens per particle in the shader, so reversing mid-flight stays smooth
    const rate = (dt * Math.max(0.2, s.speed)) / 4.2;
    this.morph =
      this.morph < this.morphTarget
        ? Math.min(this.morphTarget, this.morph + rate)
        : Math.max(this.morphTarget, this.morph - rate);
    u.uMorph.value = this.morph;
    if (this.points) {
      // slow idle head sway, plus a gentle parallax toward the pointer
      const t = u.uTime.value,
        follow = this.mouseActive ? 1 : 0;
      this.sway.x += (this.mouse.x * 0.18 * follow - this.sway.x) * (1 - Math.exp(-2 * dt));
      this.sway.y += (this.mouse.y * 0.1 * follow - this.sway.y) * (1 - Math.exp(-2 * dt));
      this.points.rotation.y = Math.sin(t * 0.21) * 0.07 + this.sway.x;
      this.points.rotation.x = Math.sin(t * 0.13 + 1.3) * 0.03 - this.sway.y;
    }
    this.repel(dt);
    this.controls.update();
    this.composer.render();
  };
  repel(dt: number) {
    const { base, offset: o, vel: v, points } = this;
    if (!base || !o || !v || !points) return;
    const active = this.mouseActive && this.morph < 0.5;
    let mx = 0,
      my = 0;
    if (active) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (!this.raycaster.ray.intersectPlane(this.plane, this.mouseWorld)) return;
      // the points are gently rotating, so test against them in their own space
      this.localMouse.copy(this.mouseWorld);
      points.worldToLocal(this.localMouse);
      mx = this.localMouse.x;
      my = this.localMouse.y;
    }
    const R = 1.3,
      force = this.settings.dispersion * 55;
    const k = 14,
      damp = Math.exp(-5 * dt);
    const n = o.length / 3;
    let moving = false;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      let fx = -o[i3] * k,
        fy = -o[i3 + 1] * k,
        fz = -o[i3 + 2] * k;
      if (active) {
        const dx = base[i3] + o[i3] - mx,
          dy = base[i3 + 1] + o[i3 + 1] - my;
        const d2 = dx * dx + dy * dy;
        // per-particle reach (golden-ratio hash) so the opening has a ragged, natural edge
        const Ri = R * (0.7 + ((i * 0.6180339) % 1) * 0.6);
        if (d2 < Ri * Ri) {
          const d = Math.sqrt(d2) + 0.001,
            f = (force * (1 - d / Ri) ** 2) / d;
          // push outward with a slight swirl, like a hand through smoke
          fx += (dx - dy * 0.6) * f;
          fy += (dy + dx * 0.6) * f;
          fz += f * d * 0.8;
        }
      }
      v[i3] = (v[i3] + fx * dt) * damp;
      v[i3 + 1] = (v[i3 + 1] + fy * dt) * damp;
      v[i3 + 2] = (v[i3 + 2] + fz * dt) * damp;
      o[i3] += v[i3] * dt;
      o[i3 + 1] += v[i3 + 1] * dt;
      o[i3 + 2] += v[i3 + 2] * dt;
      if (!moving && (Math.abs(v[i3]) > 1e-4 || Math.abs(o[i3]) > 1e-4)) moving = true;
    }
    if (moving || active)
      (points.geometry.getAttribute("aOffset") as THREE.BufferAttribute).needsUpdate = true;
  }
  /** send a ring of light through the formed portrait */
  ripple() {
    this.mat.uniforms.uRipple.value = 0;
  }
  resetView() {
    this.controls.reset();
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
