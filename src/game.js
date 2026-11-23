// =====================================================================
// Vampire Garlic Heist: the 3D game engine.
// three.js WebGPURenderer (falls back to WebGL 2 automatically; add ?webgl to force it).
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { paintMaterial, addOutline, setPainted } from './paint.js';
import { Sound } from './audio.js';
import { t as tr, batName } from './i18n.js';
import { ICONS } from './icons.js';
import { ClapDetector } from './clap.js';
import { JoyConHub } from './joycon.js';
import { Kit, buildCottage, buildChurch, buildMill, buildMillSails, buildField, buildGarlicGeometry, buildStreets, buildPlaza, buildTree, buildGraveyard, buildStall, buildLampPost, buildScatter, buildCastle as buildCastleKit, garlicFromModel, buildJail } from './buildings.js';
import {
  CASTLE_X, FURNACE, FLY_Y, GRAB_TIME, GRAB_R, MAXV, CARRY_V, ECHO_CD, ECHO_DUR, IDLE_SLEEP,
  LIGHT_R0, LIGHT_R1, NOTICE, LAMP_R, LAMP_SLOW, NAP_TIME, PASS_R, WATCH_SPEEDUP, WATCH_SPEEDUP_MAX, CLAP_PUSH, CLAP_MAX, CAGE_TIME, CLAP_CAGE, FOURTH_WATCHMAN_AT, CAGE_LIVES, RESCUE_R, RESCUE_TIME, RESCUE_LIVES, THIRD_WATCHMAN_AT, ROOF_COLORS, BAT_COLORS,
  STREET_W, PLAZA, STREETS, HOUSES, PATHS, LAMPS, TREES, GRAVEYARD, STALLS, FIELDS, WORLD
} from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// sky / light colours through the night (p = share of the night that has passed)
const SKY_KEYS = [ // brighter than a real night on purpose: a projector turns dark blue into black
  { p: 0,   bg: '#2A1850', sky: '#9A80E0', gnd: '#3A2850', hi: 1.6,  key: '#D8B8FF', ki: 1.4, pos: [-20, 9, 5],  moon: '#A890FF', glow: .5 },   // dusk: violet
  { p: .35, bg: '#0C0C28', sky: '#5A64C0', gnd: '#241A40', hi: 1.35, key: '#A8BCFF', ki: 1.35, pos: [-2, 22, 3], moon: '#8098FF', glow: .5 },   // midnight: cool blue, moon overhead
  { p: .68, bg: '#4A2458', sky: '#B070C0', gnd: '#4A2A48', hi: 1.55, key: '#F0A8D0', ki: 1.7, pos: [14, 12, 4],  moon: '#D498DC', glow: .4 },   // pre-dawn: pink
  { p: .86, bg: '#C85A55', sky: '#F8A880', gnd: '#5E3A40', hi: 1.9,  key: '#FF8A48', ki: 3.0, pos: [24, 4.5, 3], moon: '#FFA070', glow: .25 },  // dawn: low orange sun, long shadows
  { p: 1,   bg: '#F7B474', sky: '#FFE6C0', gnd: '#806050', hi: 2.4,  key: '#FFD394', ki: 3.6, pos: [22, 10, 4],  moon: '#FFD8A8', glow: .12 }   // sunrise: golden
];
// poses bones by rotations given in the model's own space (so "+x = left, +z = front" holds for every bone)
class Rig {
  constructor(root) {
    this.bones = {}; root.updateMatrixWorld(true);
    const rootInv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
    root.traverse(o => {
      if (!o.isBone) return;
      const P = o.parent.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootInv);
      this.bones[o.name] = { b: o, R: o.quaternion.clone(), P, Pi: P.clone().invert() };
    });
  }
  static key(name) { return name.replace(/\s/g, '_').replace(/[\[\]\.:\/]/g, ''); } // three.js strips dots from node names
  bone(name) { const e = this.bones[Rig.key(name)]; return e ? e.b : null; }
  set(name, W) { const e = this.bones[Rig.key(name)]; if (e) e.b.quaternion.copy(e.Pi).multiply(W).multiply(e.P).multiply(e.R); }
}
const BAT_R = .32; // how wide a bat is when bumping into houses
const GARLIC_INK = .055; // outline width on garlic
const START_GARLIC = 10, GARLIC_PER_EXTRA_BAT = 3, LIVES = 3, TUT_STEPS = 4, TUT_STEP = 3.4;

export class Game {
  constructor(canvas, layer, cb) {
    this.canvas = canvas; this.layer = layer; this.cb = cb;
    this.sound = new Sound();
    this.state = 'menu'; this.time = 0; this.roundTime = 300;
    this.keys = new Set(); this.mouse = { x: 0, z: 0, last: -10, ndc: new THREE.Vector2() };
    this.joycons = new JoyConHub(); this.joycons.init();
    this.prevPad = []; this.prevPadKey = []; this.padPlayers = []; this.padUpright = false; this.floats = []; this.parts = [];
    this.hudT = 0; this.endTimer = 0; this.banner = null; this.dt = 1 / 60;
    this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); // scratch objects for posing bones
    this.clapper = new ClapDetector(); this.clapUI = null; this.clapFlash = 0; this.clapBoost = 0;
    this.clapper.onClap = () => this.clap('mic');
    this.tutorialOn = true; this.tutorial = null; // short picture tutorial, shown when the first bat of a round wakes up
  }

  async init() {
    const forceWebGL = new URLSearchParams(location.search).has('webgl');
    const r = new THREE.WebGPURenderer({ canvas: this.canvas, antialias: true, forceWebGL });
    await r.init();
    this.backend = r.backend && r.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2';
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    await this.loadModels();
    this.build();
    this.paintScene(); // brush-stroke look (menu: Style)
    this.resetRound(); this.state = 'menu';
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.fixHiddenSpots();
    this.buildStreetGraph();
    this.bindInput();
    this.last = performance.now();
    r.setAnimationLoop(() => this.frame());
    return this.backend;
  }

  // =================================================================
  // scene building
  // =================================================================
  // the characters from character.blend (exported to models/*.glb); procedural fallbacks if they can't load
  async loadModels() {
    this.models = {};
    const loader = new GLTFLoader(), base = window.VGH_MODELS || 'models/';
    await Promise.all(['batrig', 'hunter', 'garlic', 'vampire'].map(async n => {
      try {
        const packed = window.VGH_MODEL_DATA && window.VGH_MODEL_DATA[n]; // optional: models embedded as base64 (web version)
        if (packed) { const bin = Uint8Array.from(atob(packed), ch => ch.charCodeAt(0)); this.models[n] = (await loader.parseAsync(bin.buffer, '')).scene; }
        else this.models[n] = (await loader.loadAsync(base + n + '.glb')).scene;
      }
      catch (e) { console.warn(`Could not load ${n}.glb, using the built-in model instead`, e); }
    }));
  }
  // clone a loaded model, give it toon materials, scale it to `size` along `axis`, centre it
  prepModel(src, { size, axis, recolor, recolorKey = 'Material.005', feet, skip, side = THREE.DoubleSide }) {
    let skinned = false; src.traverse(o => { if (o.isSkinnedMesh) skinned = true; });
    const m = skinned ? cloneSkinned(src) : src.clone(true), cache = new Map();
    m.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (o.isSkinnedMesh) o.frustumCulled = false; // posed bones can move the mesh outside its rest-pose bounds
      const old = o.material, key = old.name;
      if (!cache.has(key)) {
        const tinted = recolor && key === recolorKey; // the bat's body and wings take the player's colour
        let mat;
        if (key === 'Glass') mat = new THREE.MeshBasicMaterial({ color: '#FFE08A' }); // the hunter's lantern glows
        else {
          const col = tinted ? new THREE.Color(recolor).multiplyScalar(.78) : /Onion/.test(key) ? new THREE.Color('#F3EDD6') : old.color.getHex() === 0 ? new THREE.Color('#3B2A58') : old.color.clone(); // pure black in Blender -> dark plum, so it doesn't read as a hole
          if (!tinted) { const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, hsl.s * .82, hsl.l); } // a touch softer, to sit with the pastel village
          // standard (not toon) shading: under the village's many lights toon steps blow the colours out to neon
          mat = new THREE.MeshStandardMaterial({ color: col, roughness: .72, metalness: 0, emissive: col, emissiveIntensity: tinted ? .14 : .12, side }); // both sides: a face modelled inside-out still shows
        }
        cache.set(key, mat);
      }
      o.material = cache.get(key);
    });
    m.updateMatrixWorld(true);
    const box = new THREE.Box3();
    // measure the meshes as they are drawn (skinned meshes: after their bones), leaving out `skip` parts
    m.traverse(o => { if (o.isMesh && !(skip && skip(o))) box.expandByObject(o, true); });
    const sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = size / (axis === 'y' ? sz.y : sz.x);
    m.position.set(-c.x, feet ? -box.min.y : -c.y, -c.z);
    const wrap = new THREE.Group(), inner = new THREE.Group();
    inner.add(m); inner.scale.setScalar(k); wrap.add(inner);
    wrap.userData.model = m; wrap.userData.scale = k;
    if (skinned) wrap.userData.rig = new Rig(m);
    return wrap;
  }
  build() {
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#0B0920');
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 200);
    this.camTarget = new THREE.Vector3((WORLD.x0 + WORLD.x1) / 2, 0, 0.55);

    this.hemi = new THREE.HemisphereLight('#4a4aa0', '#1a1030', 1.1); s.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#a8b4ff', 1.2);
    sun.position.set(-8, 20, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 19, bottom: -19, near: 1, far: 70 }); sun.shadow.mapSize.set(3072, 3072);
    sun.shadow.bias = -0.0005; s.add(sun); s.add(sun.target);

    this.glowTex = this.makeGlowTexture();
    this.std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, ...o });

    this.props = new Kit(); this.glowKit = new Kit(); this.lampKit = new Kit(); // lamps: no ink outline
    this.buildGround();
    this.buildGarlicAssets();
    this.buildHouses();
    this.buildDecor();
    this.buildCastle();
    this.buildLamps();
    const props = this.propsMesh = new THREE.Mesh(this.props.merge(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, emissive: '#2a2050', emissiveIntensity: .45 }));
    props.castShadow = props.receiveShadow = true; s.add(props);
    const lampPosts = new THREE.Mesh(this.lampKit.merge(), props.material); lampPosts.castShadow = true; s.add(lampPosts);
    s.add(new THREE.Mesh(this.glowKit.merge(), new THREE.MeshBasicMaterial({ vertexColors: true })));
    this.buildAmbience();

    // garlic spots: one at every door
    this.spots = this.houses.map(hh => this.makeSpot(hh.spot[0], hh.spot[1], false));

    this.watchmen = PATHS.map(p => this.makeWatchman(p));
    this.cat = this.makeCat();
    this.bats = BAT_COLORS.map((c, i) => this.makeBat(i, c));
    this.boss = this.makeBoss();

    // particles (one instanced mesh)
    this.partMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 400);
    this.partMesh.frustumCulled = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < 400; i++) { this.partMesh.setMatrixAt(i, zero); this.partMesh.setColorAt(i, new THREE.Color('#ffffff')); }
    s.add(this.partMesh);
    this.tmpM = new THREE.Matrix4(); this.tmpC = new THREE.Color(); this.tmpV = new THREE.Vector3(); this.tmpQ = new THREE.Quaternion(); this.tmpS = new THREE.Vector3();
    this.flyPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLY_Y);
    this.ray = new THREE.Raycaster();

    // garlic that flies back to a house after a bat is caught
    this.flyers = [];
    for (let i = 0; i < 12; i++) {
      const g = this.makeGarlic(false), gold = this.makeGarlic(true);
      g.visible = gold.visible = false; g.scale.setScalar(1.4); gold.scale.setScalar(1.4); s.add(g); s.add(gold);
      this.flyers.push({ g, gold, active: false });
    }
  }
  makeGlowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // a soft glowing edge instead of a hard ring line (for lamp and lantern light)
  softRing(color, opacity) {
    if (!this.softRingTex) {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.72, 'rgba(255,255,255,0)'); g.addColorStop(.9, 'rgba(255,255,255,.55)'); g.addColorStop(.97, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      this.softRingTex = new THREE.CanvasTexture(c); this.softRingTex.colorSpace = THREE.SRGBColorSpace;
    }
    const geo = new THREE.PlaneGeometry(2.08, 2.08); geo.rotateX(-Math.PI / 2);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, map: this.softRingTex, transparent: true, opacity, depthWrite: false }));
  }
  glowDisc(color, opacity) {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, map: this.glowTex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  }
  buildGround() {
    const s = this.scene, std = this.std;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), std('#283A58', { roughness: 1 })); // blue-teal grass: darker than the roads, different from the purple houses
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    // grass tufts for texture
    const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(.06, .22, 4), std('#3A6A62', { roughness: 1 }), 350);
    const m = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < 5000 && k < 350; i++) {
      const x = rand(WORLD.x0 + .2, CASTLE_X - .3), z = rand(-WORLD.z + .2, WORLD.z - .2);
      if (this.onStreet(x, z, .5) || this.inHouse(x, z, .3)) continue;
      m.makeTranslation(x, .11, z); tuft.setMatrixAt(k++, m);
    }
    tuft.count = k; s.add(tuft);
    // streets
    const streetMat = std('#544A8C', { roughness: 1 });
    STREETS.forEach(([x1, z1, x2, z2], i) => {
      const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
      const st = new THREE.Mesh(new THREE.BoxGeometry(len + STREET_W, .04, STREET_W), streetMat);
      st.position.set((x1 + x2) / 2, .02 + i * .0006, (z1 + z2) / 2); st.rotation.y = -ang; st.receiveShadow = true; s.add(st);
    });
    const insideOther = (x, z) => STREETS.some(([x1, z1, x2, z2]) => {
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz, t = clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      return d2(x, z, x1 + dx * t, z1 + dz * t) < STREET_W / 2 - .05;
    });
    buildStreets(this.props, STREETS, STREET_W, PLAZA, insideOther);
    // plaza with fountain
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(PLAZA.r, PLAZA.r, .06, 48), std('#3D3675', { roughness: .95 }));
    plaza.position.set(PLAZA.x, .04, PLAZA.z); plaza.receiveShadow = true; s.add(plaza);
    buildPlaza(this.props, PLAZA);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(.86, .86, .04, 28), std('#2C8FA3', { emissive: '#165a68', roughness: .2, metalness: .1 }));
    water.position.set(PLAZA.x, .44, PLAZA.z); s.add(water);
    const fglow = this.glowDisc('#5FD3E6', .35); fglow.scale.setScalar(3.6); fglow.position.set(PLAZA.x, .09, PLAZA.z); s.add(fglow);
    this.fountainT = 0;
  }
  onStreet(x, z, pad = 0) {
    if (d2(x, z, PLAZA.x, PLAZA.z) < PLAZA.r + pad) return true;
    return STREETS.some(([x1, z1, x2, z2]) => {
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz;
      const t = clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      return d2(x, z, x1 + dx * t, z1 + dz * t) < STREET_W / 2 + pad;
    });
  }
  // push a bat out of any house it flew into, and cancel the part of its speed that goes into the wall (so it slides)
  collideHouses(b, r = BAT_R) {
    for (let pass = 0; pass < 2; pass++) for (const hh of HOUSES) {
      if (hh.mill) { // round tower
        const dx = b.x - hh.x, dz = b.z - hh.z, d = Math.hypot(dx, dz), R = 1.2 + r;
        if (d < R) { const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0; b.x = hh.x + nx * R; b.z = hh.z + nz * R; const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= vn * nx; b.vz -= vn * nz; } }
        continue;
      }
      const hx = (hh.f[0] ? hh.d : hh.w) / 2 + .08, hz = (hh.f[0] ? hh.w : hh.d) / 2 + .08; // + the eaves
      const cx = clamp(b.x, hh.x - hx, hh.x + hx), cz = clamp(b.z, hh.z - hz, hh.z + hz);
      let dx = b.x - cx, dz = b.z - cz, d = Math.hypot(dx, dz);
      if (d >= r) continue;
      let nx, nz, push;
      if (d > 1e-4) { nx = dx / d; nz = dz / d; push = r - d; }
      else { // centre inside the house: leave by the nearest wall
        const ox = hx - Math.abs(b.x - hh.x), oz = hz - Math.abs(b.z - hh.z);
        if (ox < oz) { nx = Math.sign(b.x - hh.x) || 1; nz = 0; push = ox + r; } else { nx = 0; nz = Math.sign(b.z - hh.z) || 1; push = oz + r; }
      }
      b.x += nx * push; b.z += nz * push;
      const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= vn * nx; b.vz -= vn * nz; }
    }
  }
  inHouse(x, z, pad = 0) {
    return HOUSES.some(hh => Math.abs(x - hh.x) < (hh.f[0] ? hh.d : hh.w) / 2 + pad && Math.abs(z - hh.z) < (hh.f[0] ? hh.w : hh.d) / 2 + pad);
  }
  buildGarlicAssets() {
    const std = this.std;
    const prof = [[0, 0], [.12, .02], [.2, .08], [.24, .17], [.21, .27], [.14, .34], [.06, .4], [.035, .48], [0, .5]].map(([x, y]) => new THREE.Vector2(x, y));
    this.garlicGeo = this.models.garlic ? garlicFromModel(this.models.garlic) : buildGarlicGeometry(); // your Blender garlic, or the built-in one
    this.garlicMat = std('#FFFFFF', { vertexColors: true, roughness: .45, emissive: '#4a4034' });
    this.goldMat = std('#FFD84A', { roughness: .35, metalness: .2, emissive: '#8a6200' });
    this.stemMat = std('#B8C98A');
    this.goldStemMat = std('#E6B422', { emissive: '#6a4a00' });
  }
  // the whole village (houses, church, windmill, fields) is ONE merged mesh with vertex colours, see buildings.js
  buildHouses() {
    const s = this.scene, kit = new Kit();
    this.houses = []; this.occluders = []; this.windows = []; this.chimneyTops = [];
    const occMat = new THREE.MeshBasicMaterial();
    HOUSES.forEach((hd, idx) => {
      const { x, z, w, d, f } = hd, ry = Math.atan2(f[0], f[1]);
      kit.setFrame(x, z, ry);
      const frame = kit.frame.clone(), toWorld = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(frame);
      if (hd.jail) {
        // the jail has no garlic: it's where the watchmen lock up bats
        const seats = buildJail(kit, null, hd).map(([lx, lz]) => toWorld(lx, 0, lz));
        const door = toWorld(0, 0, d / 2 + .95);
        this.jail = { x, z, seats, door: [door.x, door.z], rescue: [door.x, door.z - .35], rescueT: 0 };
        const occ = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), occMat); occ.position.set(x, 1, z); occ.updateMatrixWorld(true); this.occluders.push(occ);
        return;
      }
      const pumpkinSide = f[1] === 1 && !hd.church && !hd.mill && idx % 2 === 0 ? (idx % 4 ? 1 : -1) : 0;
      const opts = { pumpkinSide, chimney: (lx, ly, lz) => this.chimneyTops.push(toWorld(lx, ly, lz)), spire: (lx, ly, lz) => { this.spireTop = toWorld(lx, ly, lz); } };
      const panes = hd.church ? buildChurch(kit, hd, opts) : hd.mill ? buildMill(kit, hd, opts) : buildCottage(kit, hd, idx, opts);
      // lit windows of this house: one mesh for the panes, one for their soft halos
      const base = hd.church ? '#F5C8F0' : '#FFE59A';
      const winMat = new THREE.MeshBasicMaterial({ color: base, side: THREE.DoubleSide });
      const haloMat = new THREE.MeshBasicMaterial({ color: hd.church ? '#F5A8D8' : '#FFC870', map: this.glowTex, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const pg = panes.build(frame);
      s.add(new THREE.Mesh(pg.geo, winMat)); s.add(new THREE.Mesh(pg.halo, haloMat));
      this.windows.push({ winMat, haloMat, on: Math.random() < .8, t: rand(4, 18), base, ph: Math.random() * 6 });
      // the windmill's sails turn
      if (hd.mill) { this.millSails = buildMillSails(this.std); this.millSails.position.copy(toWorld(0, 2.55, 1.22)); this.millSails.rotation.y = ry; s.add(this.millSails); }
      // a simple invisible block per building for "can the camera see this garlic?" checks
      const hgt = hd.church ? 2.6 : hd.mill ? 3.8 : hd.tall ? 2.4 : 1.7;
      const occ = new THREE.Mesh(new THREE.BoxGeometry(hd.mill ? 2 : w, hgt, hd.mill ? 2 : d), occMat); occ.position.set(x, hgt / 2, z); occ.rotation.y = ry; occ.updateMatrixWorld(true);
      this.occluders.push(occ);
      if (hd.church) { const tw = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 1), occMat); tw.position.copy(toWorld(-w / 2 + .5, 2.5, d / 2 - .5)); tw.updateMatrixWorld(true); this.occluders.push(tw); }
      const off = (hd.mill ? 1.25 : d / 2) + .72, perp = [f[1], -f[0]];
      this.houses.push({ ...hd, spot: [x + f[0] * off, z + f[1] * off], back: [[x - f[0] * off + perp[0] * w * .3, z - f[1] * off + perp[1] * w * .3], [x - f[0] * off - perp[0] * w * .3, z - f[1] * off - perp[1] * w * .3]] });
    });
    FIELDS.forEach(fl => buildField(kit, fl));
    if (this.jail) {
      const J = this.jail;
      const rg = new THREE.RingGeometry(RESCUE_R - .14, RESCUE_R, 56); rg.rotateX(-Math.PI / 2);
      J.ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#9FE0C9', transparent: true, opacity: .8, depthWrite: false }));
      J.ring.position.set(J.rescue[0], .19, J.rescue[1]); J.ring.visible = false; s.add(J.ring);
      J.glow = this.glowDisc('#9FE0C9', .35); J.glow.scale.setScalar(RESCUE_R * 2.2); J.glow.position.set(J.rescue[0], .185, J.rescue[1]); J.glow.visible = false; s.add(J.glow);
      J.tag = document.createElement('div'); J.tag.className = 'jail-tag'; J.tag.hidden = true;
      J.tag.innerHTML = `<span class="jt-ic">${ICONS.cage}</span><span class="jt-n"></span>`;
      this.layer.appendChild(J.tag); J.tagN = J.tag.querySelector('.jt-n');
    }
    const town = new THREE.Mesh(kit.merge(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, emissive: '#2a2050', emissiveIntensity: .55 }));
    town.castShadow = town.receiveShadow = true; s.add(town); this.town = town;
  }
  buildDecor() {
    TREES.forEach(([x, z], i) => {
      buildTree(this.props, x, z, i);
      const occ = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 1.1)); occ.position.set(x, 1, z); occ.updateMatrixWorld(true); this.occluders.push(occ);
    });
    buildGraveyard(this.props, GRAVEYARD);
    STALLS.forEach(st => buildStall(this.props, st));
    const free = () => {
      const x = rand(WORLD.x0 + .3, CASTLE_X - .6), z = rand(-WORLD.z + .3, WORLD.z - .3);
      if (this.onStreet(x, z, .35) || this.inHouse(x, z, .7) || TREES.some(([tx, tz]) => d2(x, z, tx, tz) < .7)) return null;
      if (Math.abs(x - GRAVEYARD.x) < GRAVEYARD.w / 2 + .3 && Math.abs(z - GRAVEYARD.z) < GRAVEYARD.d / 2 + .3) return null;
      if (FIELDS.some(f => Math.abs(x - f.x) < f.w / 2 + .3 && Math.abs(z - f.z) < f.d / 2 + .3)) return null;
      return [x, z];
    };
    // (no rocks / mushrooms / flowers in the grass: they cluttered the picture on a projector)
  }
  buildCastle() {
    const s = this.scene;
    buildCastleKit(this.props, this.glowKit, { X: CASTLE_X, F: FURNACE });
    const f = FURNACE;
    const fire = new THREE.Mesh(new THREE.CylinderGeometry(f.r + .2, f.r + .2, .05, 24), new THREE.MeshBasicMaterial({ color: "#8E2C16" })); fire.position.set(f.x, .7, f.z); s.add(fire); // deep ember bed, so the glowing coals and flames stand out
    this.furnaceGlow = this.glowDisc('#FF9A4A', .8); this.furnaceGlow.scale.setScalar(8); this.furnaceGlow.position.set(f.x, .16, f.z); s.add(this.furnaceGlow);
    this.furnaceLight = new THREE.PointLight('#FF9A4A', 40, 14, 2); this.furnaceLight.position.set(f.x, 2, f.z); s.add(this.furnaceLight);
    this.buildFire();
  }
  // the furnace fire: a pile of logs and three layers of cartoon flame tongues that flicker on their own
  buildFire() {
    const s = this.scene, f = FURNACE, std = this.std;
    // logs, criss-crossed, with glowing cut ends
    const wood = std('#5A3424', { roughness: .9, emissive: '#3a1408', emissiveIntensity: .6 }), ends = new THREE.MeshBasicMaterial({ color: '#FFB347' });
    const logGeo = new THREE.CylinderGeometry(.14, .16, 1.9, 8), endGeo = new THREE.CircleGeometry(.13, 10);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI + (i % 2) * .3, lg = new THREE.Group();
      lg.position.set(f.x, .82 + (i % 2) * .16, f.z); lg.rotation.set(0, a, Math.PI / 2 + (i % 2 ? .12 : -.12));
      const m = new THREE.Mesh(logGeo, wood); m.castShadow = true; lg.add(m);
      [-1, 1].forEach(sy => { const e = new THREE.Mesh(endGeo, ends); e.position.y = sy * .951; e.rotation.x = sy * -Math.PI / 2; lg.add(e); });
      s.add(lg);
    }
    // a curved, pointed flame tongue (height 1), coloured from a bright base to its tip colour
    const tongue = (base, tip) => {
      const prof = [[0, 0], [.42, .08], [.55, .26], [.5, .46], [.36, .66], [.18, .86], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y));
      const g = new THREE.LatheGeometry(prof, 12), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), cb = new THREE.Color(base), ct = new THREE.Color(tip);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + y * y * .28); c.copy(cb).lerp(ct, Math.pow(y, 1.3)); col.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      return g;
    };
    const layers = [
      { n: 10, r: .78, w: .42, h: 1.25, geo: tongue('#FF6A2A', '#C8322A'), y: .78 },   // outer: red
      { n: 8,  r: .5,  w: .38, h: 1.65, geo: tongue('#FFA040', '#F05A2A'), y: .8 },    // middle: orange
      { n: 5,  r: .24, w: .32, h: 1.9,  geo: tongue('#FFF6C8', '#FFC24A'), y: .84 },   // core: yellow-white
      { n: 1,  r: 0,   w: .42, h: 2.3,  geo: tongue('#FFFBE6', '#FFD05A'), y: .86 }    // the tall centre flame
    ];
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.flames = [];
    layers.forEach((L, li) => {
      for (let i = 0; i < L.n; i++) {
        const a = i / L.n * Math.PI * 2 + li * .4, m = new THREE.Mesh(L.geo, mat);
        m.position.set(f.x + Math.cos(a) * L.r, L.y, f.z + Math.sin(a) * L.r); s.add(m);
        this.flames.push({ m, a, L, ph: Math.random() * 20, sp: rand(.8, 1.3) });
      }
    });
    this.fireBoost = 0;
  }
  buildLamps() {
    const s = this.scene;
    const rg = new THREE.RingGeometry(.95, 1, 40); rg.rotateX(-Math.PI / 2);
    this.lamps = LAMPS.map(L => {
      buildLampPost(this.lampKit, L);
      const headMat = new THREE.MeshBasicMaterial({ color: '#FFE9A8' });
      const head = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, .3, 8), headMat); head.position.set(L.x, 2.36, L.z); s.add(head);
      const pool = this.glowDisc('#E8E0C8', .16); pool.scale.setScalar(LAMP_R * 2.0); pool.position.set(L.x, .16, L.z); s.add(pool);
      const ring = this.softRing('#FFE9A8', .55); ring.scale.setScalar(LAMP_R); ring.position.set(L.x, .17, L.z); s.add(ring);
      const light = new THREE.PointLight('#F2E6C8', 2.5, 4.5, 2); light.position.set(L.x, 2.1, L.z); s.add(light); // pale and much dimmer than a watchman's lantern
      return { x: L.x, z: L.z, offset: L.offset, onDur: L.on, offDur: L.off, head, headMat, pool, ring, light, onNow: false, warn: false };
    });
  }
  // =================================================================
  // ambience: things that make the village feel alive (purely visual, no gameplay)
  // =================================================================
  buildAmbience() {
    const s = this.scene, std = this.std;
    s.updateMatrixWorld(true);
    // a cool moonlight rim from the north-east and a soft pink bounce from the south-west
    this.moon = new THREE.DirectionalLight('#8E7CFF', .9); this.moon.position.set(14, 12, -14); s.add(this.moon); s.add(this.moon.target);
    this.bounce = new THREE.DirectionalLight('#F5A8D8', .35); this.bounce.position.set(-14, 6, 14); s.add(this.bounce); s.add(this.bounce.target);
    const glowMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, map: this.glowTex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

    // chimney smoke: soft puffs that rise, grow and fade
    this.smokeSrc = this.chimneyTops;
    const PUFFS = 5;
    this.smoke = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#A79DD6', map: this.glowTex, transparent: true, opacity: .2, depthWrite: false }), this.smokeSrc.length * PUFFS);
    this.smoke.frustumCulled = false; s.add(this.smoke);
    this.smokePuffs = [];
    this.smokeSrc.forEach((src, i) => { for (let k = 0; k < PUFFS; k++) this.smokePuffs.push({ src, ph: k / PUFFS + i * .37 }); });

    // camera-facing glow cards (fireflies, wisps): one instanced mesh
    this.fireflies = [];
    const homes = [...TREES, [GRAVEYARD.x, GRAVEYARD.z], [GRAVEYARD.x - 1, GRAVEYARD.z], ...FIELDS.map(fl => [fl.x, fl.z]), [-9, -6], [-4, 6], [8.5, 6.5], [8.5, -6.5]];
    for (let i = 0; i < 24; i++) { const [hx, hz] = homes[i % homes.length]; this.fireflies.push({ hx: hx + rand(-1.2, 1.2), hz: hz + rand(-1.2, 1.2), hy: rand(.4, 1.6), ph: rand(0, 20), sp: rand(.3, .8) }); }
    this.ffMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.42, .42), glowMat('#E6FF7A', 1), this.fireflies.length);
    this.ffMesh.frustumCulled = false; s.add(this.ffMesh);

    // ground mist drifting across the village
    this.mist = [];
    for (let i = 0; i < 0; i++) { // ground mist switched off: it greyed out the streets when projected
      const m = this.glowDisc('#7E70C8', .16); m.scale.setScalar(rand(6, 10)); m.position.set(rand(WORLD.x0, 10), .15 + i * .01, rand(-WORLD.z + 1, WORLD.z - 1)); s.add(m);
      this.mist.push({ m, sp: rand(.15, .35), base: .16 });
    }

    // graveyard wisps: little green ghost lights circling the tombstones
    this.wisps = [];
    const gglow = this.glowDisc('#7DFFC4', .22); gglow.scale.setScalar(5); gglow.position.set(GRAVEYARD.x, .05, GRAVEYARD.z); s.add(gglow); this.graveGlow = gglow;
    for (let i = 0; i < 3; i++) {
      const core = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#D9FFF0' }));
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat('#7DFFC4', .9));
      s.add(core); s.add(halo); this.wisps.push({ core, halo, ph: i * 2.1 });
    }

    // jack-o'-lanterns on the doorsteps that face the camera
    this.pumpkins = [];
    const pMat = std('#F28A2E', { roughness: .6, emissive: '#5a2400' }), faceMat = new THREE.MeshBasicMaterial({ color: '#FFE36B' }), stemMat = std('#4E7A3A');
    this.houses.forEach((hh, i) => {
      if (hh.f[1] !== 1 || hh.church || hh.mill || i % 2) return;
      const side = i % 4 ? 1 : -1, px = hh.x + side * (hh.w / 2 - .05), pz = hh.z + hh.d / 2 + .34;
      const g = new THREE.Group(); g.position.set(px, 0, pz);
      const body = new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 10), pMat); body.scale.set(1.15, .85, 1.1); body.position.y = .19; body.castShadow = true; g.add(body);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, .1, 6), stemMat); stem.position.y = .4; g.add(stem);
      [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.CircleGeometry(.05, 3), faceMat); e.position.set(sx * .08, .25, .235); e.rotation.z = Math.PI / 2; g.add(e); });
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(.17, .05), faceMat); mouth.position.set(0, .14, .228); g.add(mouth);
      const glow = this.glowDisc('#FFB347', .7); glow.scale.setScalar(1.6); glow.position.y = .05; g.add(glow);
      s.add(g); this.pumpkins.push({ glow, ph: Math.random() * 9 });
    });

    // soft light cones under the street lamps
    this.lamps.forEach(L => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(LAMP_R * .95, 2.25, 28, 1, true), new THREE.MeshBasicMaterial({ color: '#FFE9A8', transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.position.set(L.x, 1.2, L.z); s.add(cone); L.cone = cone;
    });

    // flags waving on the castle towers
    this.flags = [];
    [[10.9, -8.1], [15.6, -8.1], [10.9, 8.1], [15.6, 8.1]].forEach(([x, z], i) => {
      const top = 2.6 + .25 + .85 * 1.9 + .02;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .8, 6), std('#2A2148')); pole.position.set(x, top + .35, z); s.add(pole);
      const geo = new THREE.PlaneGeometry(.75, .42, 8, 1); geo.translate(.375, 0, 0);
      const flag = new THREE.Mesh(geo, std(i % 2 ? '#F07A6A' : '#C9B8F5', { side: THREE.DoubleSide, emissive: i % 2 ? '#5a1a14' : '#2e2550' }));
      flag.position.set(x, top + .55, z); s.add(flag);
      this.flags.push({ flag, base: geo.attributes.position.array.slice(), ph: i });
    });

    // a few small bats circling the church spire
    this.spireBats = [];
    const sb = new THREE.Shape(); sb.moveTo(0, 0); sb.lineTo(.35, .12); sb.lineTo(.28, -.04); sb.lineTo(.18, .02); sb.closePath();
    const wGeo = new THREE.ShapeGeometry(sb); wGeo.rotateX(-Math.PI / 2);
    const batMat = new THREE.MeshBasicMaterial({ color: '#120E26', side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(), r = new THREE.Mesh(wGeo, batMat), l = new THREE.Mesh(wGeo, batMat); l.scale.x = -1;
      const body = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), batMat); g.add(r); g.add(l); g.add(body); s.add(g);
      this.spireBats.push({ g, r, l, ph: i * 2.1, rad: 1.1 + i * .35 });
    }
    this.emberT = 0;
  }
  updateAmbience(dt, p) {
    const t = this.time, night = 1 - clamp((p - .55) / .45, 0, 1); // ambience fades out as the sun comes up
    const camQ = this.camera.quaternion, M = this.tmpM, V = this.tmpV, S = this.tmpS;
    this.moon.intensity = .9 * night + .1;

    // chimney smoke
    this.smokePuffs.forEach((pf, i) => {
      const k = (t * .2 + pf.ph) % 1, sc = (.35 + k * 1.1) * (k < .15 ? k / .15 : 1) * (1 - k) * 1.6;
      M.compose(V.set(pf.src.x + k * 1.2 + Math.sin(t + pf.ph * 7) * .12, pf.src.y + k * 1.8, pf.src.z - k * .3), camQ, S.set(sc, sc, sc));
      this.smoke.setMatrixAt(i, M);
    });
    this.smoke.instanceMatrix.needsUpdate = true;

    // fireflies: wander, blink, and go home at dawn
    this.fireflies.forEach((f, i) => {
      const tt = t * f.sp + f.ph, blink = Math.max(0, Math.sin(tt * 3.1)) ** 3 * night;
      M.compose(V.set(f.hx + Math.sin(tt) * .9, f.hy + Math.sin(tt * 1.7) * .3, f.hz + Math.cos(tt * .8) * .9), camQ, S.setScalar(.25 + blink * .9));
      this.ffMesh.setMatrixAt(i, M);
    });
    this.ffMesh.instanceMatrix.needsUpdate = true;

    // mist drifts east and wraps around
    this.mist.forEach(m => {
      m.m.position.x += m.sp * dt; if (m.m.position.x > 12) m.m.position.x = WORLD.x0 - 4;
      m.m.material.opacity = m.base * (.55 + .45 * Math.sin(t * .4 + m.sp * 20)) * (.3 + .7 * night);
    });

    // graveyard wisps
    this.wisps.forEach(w => {
      const a = t * .7 + w.ph, x = GRAVEYARD.x + Math.cos(a) * 1.1, z = GRAVEYARD.z + Math.sin(a * 1.3) * .6, y = .7 + Math.sin(t * 2 + w.ph) * .25;
      w.core.position.set(x, y, z); w.halo.position.set(x, y, z); w.halo.quaternion.copy(camQ);
      w.halo.scale.setScalar(.9 + Math.sin(t * 5 + w.ph) * .15); w.halo.material.opacity = .9 * night; w.core.visible = night > .1;
    });
    this.graveGlow.material.opacity = (.16 + Math.sin(t * 1.3) * .06) * night;

    // pumpkins flicker like candles
    this.pumpkins.forEach(pk => { const f = .75 + Math.sin(t * 13 + pk.ph) * .1 + Math.sin(t * 29 + pk.ph * 3) * .08; pk.glow.material.opacity = .7 * f * (.4 + .6 * night); pk.glow.scale.setScalar(1.6 * f); });

    // windows: people switch lights on and off during the night; candles flicker; at dawn everyone gets up and blows them out
    this.windows.forEach(w => {
      w.t -= dt; if (w.t <= 0) { w.on = Math.random() < .78; w.t = rand(5, 16); }
      const target = w.on && p < .9 ? 1 : 0; w.lv = (w.lv ?? target) + (target - (w.lv ?? target)) * Math.min(1, dt * 3);
      const fl = .9 + Math.sin(t * 7 + w.ph) * .05 + Math.sin(t * 17 + w.ph * 2) * .05;
      w.winMat.color.set('#3A3168').lerp(this.tmpC.set(w.base), w.lv * fl);
      w.haloMat.opacity = .55 * w.lv * fl * (.35 + .65 * night);
    });

    // lamp cones follow their lamp
    this.lamps.forEach(L => { const on = L.onNow, blink = L.warn && Math.floor(t * 8) % 2 === 0; L.cone.visible = on || blink; L.cone.material.opacity = on ? .03 * (.6 + .4 * night) : .01; });

    // castle flags wave
    this.flags.forEach(f => {
      const pos = f.flag.geometry.attributes.position, a = pos.array;
      for (let i = 0; i < pos.count; i++) { const x = f.base[i * 3]; a[i * 3 + 2] = Math.sin(x * 6 - t * 6 + f.ph) * .09 * x; a[i * 3 + 1] = f.base[i * 3 + 1] - x * .08; }
      pos.needsUpdate = true;
    });

    if (this.millSails) this.millSails.rotation.z -= dt * .6;
    // bats around the spire
    if (this.spireTop) this.spireBats.forEach(b => {
      const a = t * 1.3 + b.ph, sp = this.spireTop;
      b.g.position.set(sp.x + Math.cos(a) * b.rad, sp.y + Math.sin(t * 2 + b.ph) * .25, sp.z + Math.sin(a) * b.rad * .7);
      b.g.rotation.y = -a; const fl = Math.sin(t * 18 + b.ph) * .7; b.r.rotation.z = fl; b.l.rotation.z = -fl;
      b.g.visible = night > .2;
    });

    // embers float up from the furnace
    this.emberT -= dt;
    if (this.emberT <= 0) { this.emberT = .08; this.burst(FURNACE.x + rand(-.8, .8), 1, FURNACE.z + rand(-.8, .8), 1, ['#FFD66B', '#FF8A3D', '#FFF3B0'], .6, 1.6, .55, 2.6); }
  }
  makeGarlic(gold) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(this.garlicGeo, gold ? this.goldMat : this.garlicMat); b.castShadow = true; g.add(b);
    if (this.paintedMats) { b.material = this.painted ? this.paintedMats[gold ? 'gold' : 'garlic'] : this.plainMats[gold ? 'gold' : 'garlic']; addOutline(b, GARLIC_INK).visible = this.painted; }
    return g;
  }
  makeSpot(x, z, golden) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(1.45);
    const offs = [[0, 0], [-.34, .12], [.34, .12], [0, .3], [-.2, -.25], [.2, -.25]];
    const bulbs = offs.map(([ox, oz]) => { const m = this.makeGarlic(golden); m.position.set(ox, 0, oz); group.add(m); return m; });
    let glow = null, halo = null;
    if (golden) { glow = this.glowDisc('#FFD84A', .9); glow.scale.setScalar(2.2); glow.position.y = .08; group.add(glow); }
    else { halo = this.glowDisc('#DDEBFF', .4); halo.scale.setScalar(1.6); halo.position.set(x, .15, z); this.scene.add(halo); }
    this.scene.add(group);
    return { x, z, count: 1, golden, revealT: 0, group, bulbs, glow, halo, ph: Math.random() * 6 };
  }
  makeWatchman(path) {
    if (this.models.hunter) return this.makeHunter(path);
    const std = this.std, g = new THREE.Group(), coat = std('#2F7F86'), coatDark = std('#1E5A60'), dark = std('#163A40'), skin = std('#F2C7A5'), hair = std('#3A2418'), brass = std('#F5D66B', { metalness: .4, roughness: .4 });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
    // legs with boots (they swing while he walks)
    const legs = [-1, 1].map(sx => { const leg = new THREE.Group(); leg.position.set(sx * .13, .5, 0); g.add(leg); add(new THREE.CylinderGeometry(.08, .07, .38, 8), dark, 0, -.2, 0, 0, 0, 0, leg); add(new THREE.BoxGeometry(.16, .12, .26), std('#2A1A14'), 0, -.44, -.04, 0, 0, 0, leg); return leg; });
    add(new THREE.CylinderGeometry(.26, .38, .62, 12), coat, 0, .74, 0);            // long coat
    add(new THREE.CylinderGeometry(.28, .28, .09, 12), std('#3A2418'), 0, .76, 0);   // belt
    add(new THREE.BoxGeometry(.1, .08, .03), brass, 0, .76, -.28);                   // buckle
    [.93, 1.0, .64, .57].forEach((y, i) => add(new THREE.SphereGeometry(.025, 6, 4), brass, 0, y, -.27 + (y < .7 ? -.03 : 0)));
    add(new THREE.SphereGeometry(.27, 12, 10), coat, 0, 1.06, 0).scale.set(1, .7, .9); // shoulders
    add(new THREE.CylinderGeometry(.27, .27, .08, 12), coatDark, 0, 1.13, 0);         // collar
    const head = add(new THREE.SphereGeometry(.24, 14, 10), skin, 0, 1.36, 0);
    add(new THREE.SphereGeometry(.06, 8, 6), std('#E8A88A'), 0, 1.33, -.24);          // nose
    [-1, 1].forEach(sx => { add(new THREE.BoxGeometry(.13, .04, .04), hair, sx * .08, 1.45, -.21, 0, 0, sx * .35); add(new THREE.SphereGeometry(.03, 6, 4), std('#1A1433'), sx * .08, 1.39, -.215); });
    add(new THREE.BoxGeometry(.26, .06, .06), hair, 0, 1.27, -.23, 0, 0, 0).scale.set(1, 1, 1);
    [-1, 1].forEach(sx => add(new THREE.BoxGeometry(.08, .05, .05), hair, sx * .14, 1.25, -.22, 0, 0, sx * -.5));
    add(new THREE.CylinderGeometry(.3, .3, .06, 14), dark, 0, 1.55, 0);               // hat brim
    add(new THREE.CylinderGeometry(.2, .23, .24, 14), coatDark, 0, 1.69, 0);          // hat
    add(new THREE.BoxGeometry(.09, .09, .03), brass, 0, 1.68, -.21);                  // badge
    // arms: one swings, one holds the lantern out front
    const armL = new THREE.Group(); armL.position.set(-.3, 1.06, 0); g.add(armL); add(new THREE.CapsuleGeometry(.07, .34, 4, 8), coat, 0, -.2, 0, 0, 0, 0, armL); add(new THREE.SphereGeometry(.07, 8, 6), skin, 0, -.42, 0, 0, 0, 0, armL);
    const armR = new THREE.Group(); armR.position.set(.3, 1.06, 0); armR.rotation.x = -1.1; g.add(armR); add(new THREE.CapsuleGeometry(.07, .34, 4, 8), coat, 0, -.2, 0, 0, 0, 0, armR); add(new THREE.SphereGeometry(.07, 8, 6), skin, 0, -.42, 0, 0, 0, 0, armR);
    // lantern in a little iron cage
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFE08A' })); lantern.position.set(.36, .9, -.42); g.add(lantern);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(new THREE.BoxGeometry(.02, .26, .02), std('#2A2148'), .36 + sx * .09, .9, -.42 + sz * .09));
    add(new THREE.ConeGeometry(.15, .1, 4), std('#2A2148'), .36, 1.07, -.42, 0, Math.PI / 4, 0);
    add(new THREE.BoxGeometry(.13, .03, .13), std('#2A2148'), .36, .76, -.42);
    const light = new THREE.PointLight('#FFD27A', 14, 7, 2); light.position.copy(lantern.position); g.add(light);
    this.scene.add(g);
    const pool = this.glowDisc('#FFD98A', .75); pool.position.y = .16; this.scene.add(pool);
    const rg = new THREE.RingGeometry(.95, 1, 48); rg.rotateX(-Math.PI / 2);
    const ring = this.softRing('#FFE08A', .7); ring.position.y = .17; this.scene.add(ring);
    return { path, g, pool, ring, light, legs, armL, x: path[0][0], z: path[0][1], seg: 1, mode: 'patrol', pause: 0, chaseT: 0, chaseBat: null, inv: null, angle: 0, alertT: 0, active: false };
  }
  // ---------------------------------------------------------------------
  // painterly look: brush-dab materials everywhere, ink outlines on characters and garlic (see paint.js)
  // ---------------------------------------------------------------------
  paintScene() {
    this.painted = !new URLSearchParams(location.search).has('clean');
    const roots = new Set(); this.scene.traverse(o => { if (o.userData.model) roots.add(o.userData.model); });
    const charOf = o => { for (let p = o; p; p = p.parent) if (roots.has(p)) return p; return null; };
    const catMeshes = new Set(); if (this.cat) this.cat.g.traverse(o => catMeshes.add(o));
    const garlic = new Set(); this.scene.traverse(o => { if (o.isMesh && o.geometry === this.garlicGeo) garlic.add(o); });
    const list = []; this.scene.traverse(o => { if (o.isMesh && !o.userData.isOutline) list.push(o); });
    list.forEach(o => {
      if (!o.material || !o.material.isMeshStandardMaterial || o.material.transparent) return;
      const ch = charOf(o);
      // characters: strokes in their own space so the dabs stick to them while they move
      o.material = paintMaterial(o.material, ch ? { local: true, freq: 9 } : catMeshes.has(o) ? { local: true, freq: 7 } : {});
      const lantern = (() => { for (let p = o; p; p = p.parent) if (p.name === 'Lantern') return true; return false; })();
      if (ch && !lantern) addOutline(o, .012); else if (catMeshes.has(o)) addOutline(o, .018); else if (garlic.has(o)) addOutline(o, GARLIC_INK);
      else if (o === this.town || o === this.propsMesh) addOutline(o, .025); // ink edges on the village too
    });
    this.plainMats = { garlic: this.garlicMat, gold: this.goldMat };
    this.paintedMats = { garlic: paintMaterial(this.garlicMat), gold: paintMaterial(this.goldMat) };
    if (!this.painted) this.setStyle(false);
  }
  setStyle(on) {
    this.painted = on; setPainted(this.scene, on);
    document.body.classList.toggle('painted', on);
  }
  // the light follows the clock: dusk -> deep midnight (moon high) -> pink pre-dawn -> low orange dawn -> golden sunrise
  applyTimeLight(p) {
    const K = SKY_KEYS; let i = 0; while (i < K.length - 2 && p > K[i + 1].p) i++;
    const a = K[i], b = K[i + 1], k0 = clamp((p - a.p) / (b.p - a.p), 0, 1), k = k0 * k0 * (3 - 2 * k0);
    const C = this._skyC || (this._skyC = new THREE.Color());
    this.scene.background.set(a.bg).lerp(C.set(b.bg), k);
    this.hemi.color.set(a.sky).lerp(C.set(b.sky), k); this.hemi.groundColor.set(a.gnd).lerp(C.set(b.gnd), k); this.hemi.intensity = lerp(a.hi, b.hi, k);
    this.sun.color.set(a.key).lerp(C.set(b.key), k); this.sun.intensity = lerp(a.ki, b.ki, k);
    this.sun.position.set(lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k));
    if (this.moon) this.moon.color.set(a.moon).lerp(C.set(b.moon), k);
    // the buildings' soft night glow fades as real sunlight takes over
    const glow = lerp(a.glow, b.glow, k); [this.town, this.propsMesh].forEach(m => { if (m && m.material) m.material.emissiveIntensity = glow; });
    document.documentElement.style.setProperty('--dawn', p.toFixed(3)); // lets the screen overlay warm up too
  }
  // a little road map (street ends, crossings, the plaza) for walking somewhere along the streets
  buildStreetGraph() {
    const nodes = [], near = (x, z) => nodes.findIndex(n => Math.hypot(n[0] - x, n[1] - z) < .06);
    const add = (x, z) => { const i = near(x, z); if (i >= 0) return i; nodes.push([x, z]); return nodes.length - 1; };
    STREETS.forEach(([x1, z1, x2, z2]) => { add(x1, z1); add(x2, z2); });
    for (let i = 0; i < STREETS.length; i++) for (let j = i + 1; j < STREETS.length; j++) {
      const [ax, az, bx, bz] = STREETS[i], [cx, cz, dx, dz] = STREETS[j];
      const r = [bx - ax, bz - az], q = [dx - cx, dz - cz], den = r[0] * q[1] - r[1] * q[0];
      if (Math.abs(den) < 1e-6) continue;
      const t = ((cx - ax) * q[1] - (cz - az) * q[0]) / den, u = ((cx - ax) * r[1] - (cz - az) * r[0]) / den;
      if (t >= -.001 && t <= 1.001 && u >= -.001 && u <= 1.001) add(ax + r[0] * t, az + r[1] * t);
    }
    const edges = nodes.map(() => []), link = (a, b) => { if (a === b) return; const w = Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]); edges[a].push([b, w]); edges[b].push([a, w]); };
    const onSeg = ([x1, z1, x2, z2]) => {
      const L = Math.hypot(x2 - x1, z2 - z1);
      return nodes.map((n, i) => { const t = ((n[0] - x1) * (x2 - x1) + (n[1] - z1) * (z2 - z1)) / (L * L); const px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t; return { i, t, d: Math.hypot(n[0] - px, n[1] - pz) }; })
        .filter(o => o.d < .06 && o.t > -.001 && o.t < 1.001).sort((a, b) => a.t - b.t);
    };
    STREETS.forEach(sg => { const on = onSeg(sg); for (let k = 1; k < on.length; k++) link(on[k - 1].i, on[k].i); });
    const plaza = nodes.map((n, i) => i).filter(i => Math.hypot(nodes[i][0] - PLAZA.x, nodes[i][1] - PLAZA.z) < PLAZA.r + .1);
    plaza.forEach(a => plaza.forEach(b => { if (a < b) link(a, b); }));
    this.graph = { nodes, edges, onSeg };
  }
  // the closest street point to (x, z), plus the two crossings on either side of it
  streetEntry(x, z) {
    let best = null;
    STREETS.forEach(sg => {
      const [x1, z1, x2, z2] = sg, dx = x2 - x1, dz = z2 - z1, t = clamp(((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz), 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { d, p: [px, pz], t, sg };
    });
    const on = this.graph.onSeg(best.sg);
    let a = on[0], b = on[on.length - 1];
    on.forEach(o => { if (o.t <= best.t + 1e-6) a = o; });
    for (let k = on.length - 1; k >= 0; k--) if (on[k].t >= best.t - 1e-6) b = on[k];
    return { p: best.p, ends: [a.i, b.i], sg: best.sg };
  }
  // shortest way along the streets from (x, z) to `goal` (a list of points to walk through)
  routeTo(x, z, goal) {
    const { nodes, edges } = this.graph, S = this.streetEntry(x, z), G = this.streetEntry(goal[0], goal[1]);
    if (S.sg === G.sg) return [S.p, G.p, goal];
    const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false);
    S.ends.forEach(i => { dist[i] = Math.hypot(nodes[i][0] - S.p[0], nodes[i][1] - S.p[1]); });
    for (;;) {
      let u = -1; dist.forEach((dv, i) => { if (!done[i] && dv < Infinity && (u < 0 || dv < dist[u])) u = i; });
      if (u < 0) break; done[u] = true;
      edges[u].forEach(([v, w]) => { if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } });
    }
    let end = G.ends[0], bestD = Infinity;
    G.ends.forEach(i => { const dv = dist[i] + Math.hypot(nodes[i][0] - G.p[0], nodes[i][1] - G.p[1]); if (dv < bestD) { bestD = dv; end = i; } });
    const path = []; for (let i = end; i >= 0; i = prev[i]) path.unshift(nodes[i]);
    return [S.p, ...path, G.p, goal];
  }
  // a watchman has caught a bat with no hearts left: he carries it along the streets to the jail
  escortToJail(b, w) {
    b.state = 'carried'; b.carrier = w; b.vx = 0; b.vz = 0; b.napT = 0;
    w.mode = 'escort'; w.prisoner = b; w.chaseBat = null; w.pause = .6; w.alertT = 0;
    w.route = this.routeTo(w.x, w.z, this.jail.door); w.routeI = 0;
    this.watchmen.forEach(o => { if (o.chaseBat === b) { o.chaseBat = null; o.mode = 'return'; } });
  }
  lockUp(b) {
    const J = this.jail, taken = new Set(this.bats.filter(o => o !== b && o.state === 'caged').map(o => o.seat));
    b.seat = J.seats.findIndex((_, i) => !taken.has(i)); if (b.seat < 0) b.seat = b.slot % J.seats.length;
    const st = J.seats[b.seat];
    b.x = st.x; b.z = st.z; b.state = 'caged'; b.carrier = null; b.cageT = CAGE_TIME; b.rescueT = 0;
    this.burst(b.x, 1, b.z, 18, ['#8A7AB8', '#F5D66B'], 3, 1, 1.2, 2); this.sound.play('cage');
  }
  // an iron birdcage that drops over a bat that lost its last heart
  makeCage(color) {
    const std = this.std, g = new THREE.Group(), iron = std('#3A3060', { metalness: .35, roughness: .5 }), gold = std('#F5D66B', { metalness: .4, roughness: .4 });
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
    add(new THREE.CylinderGeometry(.62, .66, .1, 20), iron, 0, .05, 0);
    add(new THREE.TorusGeometry(.6, .035, 6, 24), iron, 0, .1, 0, Math.PI / 2);
    add(new THREE.TorusGeometry(.6, .03, 6, 24), iron, 0, .62, 0, Math.PI / 2);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; add(new THREE.CylinderGeometry(.022, .022, 1.05, 5), iron, Math.cos(a) * .6, .62, Math.sin(a) * .6); }
    for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(.6, .025, 5, 16, Math.PI), iron, 0, 1.14, 0, 0, i * Math.PI / 4, 0);
    add(new THREE.TorusGeometry(.12, .03, 6, 14), gold, 0, 1.86, 0);
    add(new THREE.CylinderGeometry(.03, .03, .18, 6), iron, 0, 1.7, 0);
    add(new THREE.BoxGeometry(.2, .18, .08), gold, 0, .45, .62);
    add(new THREE.TorusGeometry(.06, .02, 5, 10, Math.PI), gold, 0, .54, .62);
    // rescue zone: a teammate hovering inside this ring frees the bat
    const rg = new THREE.RingGeometry(RESCUE_R - .12, RESCUE_R, 48); rg.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, depthWrite: false })); ring.position.y = .13; g.add(ring);
    g.visible = false; g.userData.ring = ring; this.scene.add(g);
    return g;
  }
  // let a caged bat out: by itself after CAGE_TIME, or sooner when a teammate rescues it
  freeBat(b, helper) {
    b.state = 'active'; b.lives = helper ? RESCUE_LIVES : CAGE_LIVES; b.invulnT = 2.5; b.napT = 0; b.idleT = 0; b.rescueT = 0;
    if (b.cage) b.cage.visible = false;
    this.burst(b.x, 1, b.z, 26, ['#F5D66B', '#FFF3B0', b.color], 4, 1, 1.2, 2.5);
    this.addIcon(b.x, FLY_Y + .9, b.z, 'sparkle', 46, 1.3, b);
    if (helper) { this.addIcon(helper.x, FLY_Y + .9, helper.z, 'star', 44, 1.3, helper); this.rumble(helper, .3, .6, .5); }
    if (!helper) this.showBanner(tr('freed', { name: b.name }), 2, b.color, 'sparkle');
    this.sound.play('free'); this.rumble(b, .3, .6, .5);
  }
  updateCages(dt) {
    const J = this.jail; if (!J) return;
    const caged = this.bats.filter(b => b.state === 'caged');
    caged.forEach(b => { b.cageT -= dt; if (b.cageT <= 0) this.freeBat(b, null); });
    // jailbreak: teammates hovering at the jail door free everyone inside
    const inside = this.bats.filter(b => b.state === 'caged');
    const helpers = inside.length ? this.activeBats().filter(o => o.napT <= 0 && d2(o.x, o.z, J.rescue[0], J.rescue[1]) < RESCUE_R) : [];
    if (helpers.length) { J.rescueT += dt * (1 + .5 * (helpers.length - 1)); if (!J.rescuing) { J.rescuing = true; this.sound.play('pass'); } }
    else { J.rescueT = Math.max(0, J.rescueT - dt * .5); J.rescuing = false; }
    if (J.rescueT >= RESCUE_TIME && inside.length) {
      J.rescueT = 0; J.rescuing = false;
      inside.forEach(b => this.freeBat(b, helpers[0]));
      this.showBanner(tr('jailbreak'), 2.4, '#9FE0C9', 'sparkle');
    }
    this.bats.forEach(b => { b.rescueT = b.state === 'caged' ? J.rescueT : 0; });
  }
  // the rigged night watchman from character_rigged.blend (models/hunter.glb)
  makeHunter(path) {
    const g = new THREE.Group();
    const inLantern = o => { for (let p = o; p; p = p.parent) if (p.name === 'Lantern') return true; return false; };
    const model = this.prepModel(this.models.hunter, { size: 1.85, axis: 'y', feet: true, skip: inLantern, side: THREE.FrontSide });
    model.rotation.y = Math.PI; // the model looks along +z; watchmen walk towards -z
    g.add(model);
    const m = model.userData.model, rig = model.userData.rig;
    const lantern = m.getObjectByName('Lantern'), palm = rig.bone('palm.L');
    const light = new THREE.PointLight('#FFD27A', 12, 7, 2); light.position.set(.2, .55, -.85); g.add(light); // out in front, so it lights the street, not his coat
    this.scene.add(g);
    const pool = this.glowDisc('#FFC85A', .9); pool.position.y = .16; this.scene.add(pool);
    const rg = new THREE.RingGeometry(.95, 1, 48); rg.rotateX(-Math.PI / 2);
    const ring = this.softRing('#FFD060', .9); ring.position.y = .17; this.scene.add(ring);
    return { path, g, pool, ring, light, rig, model: m, lantern, palm, x: path[0][0], z: path[0][1], seg: 1, mode: 'patrol', pause: 0, chaseT: 0, chaseBat: null, inv: null, angle: 0, alertT: 0, active: false };
  }
  // walk cycle on the hunter's bones (all angles in model space: +z = his front, +x = his left)
  poseHunter(w, t, walk) {
    const r = w.rig, ph = t * 8, chase = w.mode === 'chase', sw = Math.sin(ph);
    const Q = (x, y, z) => this._q.setFromEuler(this._e.set(x, y, z, 'XYZ'));
    const a = Math.abs(walk) > 0 ? (chase ? .8 : .5) : 0;
    r.set('thigh.L', Q(-sw * a * .9, 0, 0)); r.set('thigh.R', Q(sw * a * .9, 0, 0));
    r.set('calf.L', Q(Math.max(0, sw) * a * 1.1, 0, 0)); r.set('calf.R', Q(Math.max(0, -sw) * a * 1.1, 0, 0));
    r.set('spine', Q(chase ? .22 : .04 + Math.sin(t * 1.3) * .02, 0, Math.sin(ph) * a * .05));
    r.set('neck', Q(0, a ? 0 : Math.sin(t * .7 + w.path.length) * .45, 0)); // his face is weighted to the neck bone
    // left hand holds the lantern out in front; the right arm swings
    r.set('bicep.L', Q(chase ? -1.1 : -.75, 0, -1.25));
    r.set('bicep.R', w.prisoner ? Q(-1.2, 0, .5) : Q(sw * a * 1.0, 0, 1.3)); // holds the caught bat out in his free hand
    if (w.prisoner) r.set('forearm.R', Q(-.5, 0, 0));
    r.set('forearm.R', Q(-.25, 0, 0));
    // the lantern hangs upright under the left hand
    const m = w.model; m.updateMatrixWorld(true);
    w.palm.getWorldPosition(this._v); m.worldToLocal(this._v);
    w.lantern.position.set(this._v.x, this._v.y - .3, this._v.z + .06);
    w.lantern.rotation.set(0, 0, Math.sin(t * 6) * .08 * (a ? 1 : .3));
  }
  // flap the bat's wing bones from the two wing angles the game sets (positive = wings up)
  poseBat(b, t) {
    const r = b.rig, f = b.wingR.rotation.z, Q = (x, y, z) => this._q.setFromEuler(this._e.set(x, y, z, 'XYZ'));
    r.set('core.L', Q(0, 0, f * .9)); r.set('core.R', Q(0, 0, -f * .9));
    r.set('upper wing.L', Q(0, 0, f * .3)); r.set('upper wing.R', Q(0, 0, -f * .3));
    r.set('middle wing.L', Q(0, 0, f * .2)); r.set('middle wing.R', Q(0, 0, -f * .2));
    r.set('leg.L', Q(Math.sin(t * 5 + b.slot) * .25, 0, 0)); r.set('leg.R', Q(Math.sin(t * 5 + b.slot + 1) * .25, 0, 0));
    r.set('head', Q(b.napT > 0 ? .4 : Math.sin(t * 2 + b.slot) * .08, 0, Math.sin(t * 1.3 + b.slot) * .1));
  }
  makeCat() {
    const std = this.std, g = new THREE.Group(), fur = std('#F4A45F'), dark = std('#B5652F'), pink = std('#F5A8B8');
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
    add(new THREE.CapsuleGeometry(.15, .36, 4, 10), fur, 0, .27, 0, Math.PI / 2);
    [-.12, 0, .12].forEach(z => add(new THREE.TorusGeometry(.15, .025, 4, 12, Math.PI), dark, 0, .28, z, 0, Math.PI / 2, 0));
    [[-.09, -.18], [.09, -.18], [-.09, .18], [.09, .18]].forEach(([x, z]) => add(new THREE.CylinderGeometry(.045, .04, .18, 6), fur, x, .09, z));
    const head = new THREE.Group(); head.position.set(0, .43, -.3); g.add(head);
    add(new THREE.SphereGeometry(.16, 12, 10), fur, 0, 0, 0, 0, 0, 0, head).scale.set(1.1, 1, 1);
    add(new THREE.SphereGeometry(.07, 8, 6), std('#F6EEDC'), 0, -.05, -.12, 0, 0, 0, head).scale.set(1.2, .8, .8);
    add(new THREE.SphereGeometry(.025, 6, 4), pink, 0, -.01, -.16, 0, 0, 0, head);
    [-1, 1].forEach(sx => {
      add(new THREE.ConeGeometry(.065, .14, 4), fur, sx * .09, .15, 0, 0, Math.PI / 4, sx * -.2, head);
      add(new THREE.ConeGeometry(.035, .08, 4), pink, sx * .09, .15, -.025, 0, Math.PI / 4, sx * -.2, head);
      const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#9FE0C9' })); e.position.set(sx * .065, .03, -.135); e.scale.set(1, 1.3, .6); head.add(e);
      add(new THREE.BoxGeometry(.012, .05, .012), std('#1A1433'), sx * .065, .03, -.155, 0, 0, 0, head);
      [-.015, .015].forEach(o => add(new THREE.BoxGeometry(.13, .006, .006), std('#F6EEDC'), sx * .12, -.04 + o, -.13, 0, 0, sx * o * 6, head));
    });
    // a curly tail made of segments
    const tail = new THREE.Group(); tail.position.set(0, .3, .26); g.add(tail);
    let parent = tail;
    for (let i = 0; i < 5; i++) { const seg = new THREE.Group(); seg.position.y = i ? .1 : 0; seg.rotation.x = i ? -.35 : -.5; parent.add(seg); add(new THREE.CylinderGeometry(.03, .035, .11, 6), i % 2 ? dark : fur, 0, .05, 0, 0, 0, 0, seg); parent = seg; }
    g.scale.setScalar(1.3); this.scene.add(g);
    return { g, tail, head, x: -13, z: -4.8, tx: -13, tz: -4.8, pause: 1, cd: 0, angle: 0 };
  }
  makeBat(slot, color) {
    const std = this.std, g = new THREE.Group();
    let wingR, wingL, eyes = null;
    let rig = null;
    if (this.models.batrig) {
      const model = this.prepModel(this.models.batrig, { size: 1.9, axis: 'x', recolor: color, recolorKey: 'Material.015' });
      model.rotation.y = Math.PI; // the model looks along +z, game bats fly towards -z
      g.add(model); rig = model.userData.rig;
      // the game drives these two "wing angles"; poseBat() turns them into bone rotations
      wingR = new THREE.Object3D(); wingL = new THREE.Object3D();
    } else {
      const inner = new THREE.Group(); g.add(inner);
      const ws = new THREE.Shape();
      ws.moveTo(0, .12); ws.quadraticCurveTo(.5, .45, 1.05, .3); ws.lineTo(.95, -.12);
      ws.quadraticCurveTo(.82, .0, .7, -.18); ws.quadraticCurveTo(.55, -.04, .42, -.2); ws.quadraticCurveTo(.25, -.05, 0, -.14); ws.closePath();
      const wg = new THREE.ShapeGeometry(ws); wg.rotateX(-Math.PI / 2);
      const wingMat = std(color, { side: THREE.DoubleSide, emissive: color, emissiveIntensity: .35, roughness: .6 });
      const mkWing = sx => { const pivot = new THREE.Group(); const m = new THREE.Mesh(wg, wingMat); m.scale.x = sx; m.castShadow = true; pivot.position.x = sx * .18; pivot.add(m); inner.add(pivot); return pivot; };
      wingR = mkWing(1); wingL = mkWing(-1);
      const bodyMat = std('#2A2148', { roughness: .7 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(.26, 14, 10), bodyMat); body.scale.set(1, .95, 1.2); body.castShadow = true; inner.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 10), bodyMat); head.position.set(0, .1, -.28); inner.add(head);
      [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 5), bodyMat); e.position.set(sx * .1, .32, -.26); inner.add(e); });
      const eyeMat = new THREE.MeshBasicMaterial({ color: '#FF3B3B' }); eyes = new THREE.Group();
      [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), eyeMat); e.position.set(sx * .08, .2, -.42); eyes.add(e); });
      inner.add(eyes);
    }
    // the ring on the ground is the bat's grab zone: garlic inside it can be picked up
    const ringGeo = new THREE.RingGeometry(GRAB_R - .13, GRAB_R, 48); ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, depthWrite: false })); ring.position.y = .18;
    const zone = this.glowDisc(color, .22); zone.scale.setScalar(GRAB_R * 2.1); zone.position.y = -.01; ring.add(zone);
    const cage = null;
    const carry = this.makeGarlic(false), carryGold = this.makeGarlic(true);
    [carry, carryGold].forEach(c => { c.scale.setScalar(1.0); c.position.y = -.68; g.add(c); });
    this.scene.add(g); this.scene.add(ring);
    // echolocation: sound-wave arcs travel from the bat to the closest garlic, where a bouncing arrow and a pulsing ring mark it
    const waveGeo = new THREE.RingGeometry(.45, .6, 24, 1, Math.PI * .12, Math.PI * .76);
    const waves = [];
    for (let i = 0; i < 6; i++) {
      const w = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? '#7FD6E0' : color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      w.visible = false; this.scene.add(w); waves.push(w);
    }
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.26, .55, 4), new THREE.MeshBasicMaterial({ color, transparent: true }));
    arrow.rotation.x = Math.PI; arrow.position.y = 2.1;
    const bRingGeo = new THREE.RingGeometry(.7, .85, 40); bRingGeo.rotateX(-Math.PI / 2);
    const bRing = new THREE.Mesh(bRingGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false })); bRing.position.y = .2;
    const bGlow = this.glowDisc(color, .8); bGlow.scale.setScalar(2.6); bGlow.position.y = .19;
    const beacon = new THREE.Group(); beacon.add(arrow); beacon.add(bRing); beacon.add(bGlow); beacon.visible = false; this.scene.add(beacon);
    const tag = document.createElement('div'); tag.className = 'tag';
    tag.innerHTML = `<span class="nm" style="color:${color}"></span><span class="hearts" aria-label="lives"><i>♥</i><i>♥</i><i>♥</i></span><span class="echo"><i></i><em>Echo</em></span><span class="grab" hidden></span><span class="passhint" hidden>${ICONS.pass}</span>`;
    this.layer.appendChild(tag);
    const roof = slot < 3 ? { x: 11.9 + slot * 1.35, z: -8.1 } : { x: 11.9 + (slot - 3) * .95, z: 8.1 };
    return { slot, color, get name() { return batName(slot); }, state: 'sleep', x: roof.x, z: roof.z, vx: 0, vz: 0, roof, yaw: 0,
      carrying: null, grabT: 0, grabSpot: null, invulnT: 0, echo: null, echoCd: 0, idleT: 0, wakeT: 0, pulseT: 0, lives: LIVES,
      g, wingL, wingR, eyes, rig, ring, cage, cageT: 0, rescueT: 0, carry, carryGold, beacon, arrow, bRing, bGlow, waves, inLamp: false, tag,
      tagNm: tag.querySelector('.nm'), tagHearts: [...tag.querySelectorAll('.hearts i')], tagEcho: tag.querySelector('.echo'), tagEchoTxt: tag.querySelector('.echo em'),
      tagGrab: tag.querySelector('.grab'), tagPass: tag.querySelector('.passhint'), napT: 0, tagCache: {} };
  }
  makeBoss() {
    if (this.models.vampire) {
      const v = this.prepModel(this.models.vampire, { size: 3.0, axis: 'y', feet: true });
      this.scene.add(v); return v;
    }
    const std = this.std, g = new THREE.Group();
    const cape = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 20, 1, true), std('#3B1F5E', { side: THREE.DoubleSide })); cape.position.y = 1.3; cape.castShadow = true; g.add(cape);
    const lining = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.4, 20, 1, true), std('#F07A6A', { side: THREE.BackSide })); lining.position.y = 1.25; g.add(lining);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.48, 16, 12), std('#E9E2FB')); head.position.y = 2.85; g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), std('#1E1636')); hair.position.y = 2.9; g.add(hair);
    [-1, 1].forEach(sx => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#FF3B3B' })); e.position.set(sx * .16, 2.9, .42); g.add(e);
      const fg = new THREE.Mesh(new THREE.ConeGeometry(.04, .14, 5), std('#ffffff')); fg.rotation.x = Math.PI; fg.position.set(sx * .07, 2.62, .44); g.add(fg);
      const col = new THREE.Mesh(new THREE.PlaneGeometry(.7, .9), std('#3B1F5E', { side: THREE.DoubleSide })); col.position.set(sx * .45, 2.7, -.1); col.rotation.y = sx * .5; g.add(col);
    });
    g.scale.setScalar(1.15); this.scene.add(g);
    return g;
  }

  // =================================================================
  // camera
  // =================================================================
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    const cam = this.camera; cam.aspect = w / h;
    const vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect), tilt = 58 * Math.PI / 180;
    const dist = Math.max(((WORLD.x1 - WORLD.x0) / 2 + .4) / Math.tan(hf / 2), (WORLD.z + 1.3) * Math.sin(tilt) / Math.tan(vf / 2)); // tight fit: the village fills the wall
    cam.position.set(this.camTarget.x, Math.sin(tilt) * dist, this.camTarget.z + Math.cos(tilt) * dist);
    cam.lookAt(this.camTarget); cam.updateProjectionMatrix();
    this.vw = w; this.vh = h;
  }
  // garlic hanging at a door that faces away from the camera is hidden behind its own house:
  // move those spots to the first side of the house the camera can see
  fixHiddenSpots() {
    const ray = new THREE.Raycaster(), cam = this.camera.position, occ = this.occluders;
    const seen = (x, z) => {
      return [.3, .75].every(y => {
        const tgt = new THREE.Vector3(x, y, z), dir = tgt.clone().sub(cam), dist = dir.length();
        ray.set(cam, dir.normalize()); ray.far = dist - .25;
        return ray.intersectObjects(occ, false).length === 0;
      });
    };
    this.moved = 0;
    this.spots.forEach((s, i) => {
      if (s.golden || seen(s.x, s.z)) return;
      const hh = this.houses[i], hw = (hh.f[0] ? hh.d : hh.w) / 2, hd = (hh.f[0] ? hh.w : hh.d) / 2;
      const doorZ = hh.z + hh.f[1] * (hd + .45);
      const tries = [[hh.x - hw - .55, doorZ], [hh.x + hw + .55, doorZ], [hh.x - hw - .55, hh.z], [hh.x + hw + .55, hh.z], [hh.x - hw * .5, hh.z + hd + .55], [hh.x + hw * .5, hh.z + hd + .55]];
      const ok = tries.find(([x, z]) => !this.inHouse(x, z, .25) && x < CASTLE_X - .8 && Math.abs(z) < WORLD.z - .6 && seen(x, z));
      if (ok) { s.x = ok[0]; s.z = ok[1]; s.group.position.set(s.x, 0, s.z); s.halo.position.set(s.x, .15, s.z); this.moved++; }
    });
  }
  toScreen(x, y, z) {
    const v = this.tmpV.set(x, y, z).project(this.camera);
    return [(v.x + 1) / 2 * this.vw, (1 - v.y) / 2 * this.vh];
  }

  // =================================================================
  // input: mouse, two keyboard players, up to 4 gamepads / Joy-Cons
  // =================================================================
  bindInput() {
    const c = this.canvas;
    const setMouse = e => {
      this.mouse.ndc.set(e.clientX / this.vw * 2 - 1, -(e.clientY / this.vh) * 2 + 1);
      this.ray.setFromCamera(this.mouse.ndc, this.camera);
      const hit = this.ray.ray.intersectPlane(this.flyPlane, this.tmpV);
      if (hit) { this.mouse.x = hit.x; this.mouse.z = hit.z; }
      this.mouse.last = this.time;
    };
    c.addEventListener('pointermove', setMouse);
    c.addEventListener('pointerdown', e => {
      setMouse(e);
      if (this.state !== 'play') return;
      if (this.tutorial) { if (this.tutorial.t > .7) this.tutorialNext(); return; }
      if (e.button === 2) { this.tryEcho(this.bats[0]); return; }
      if (e.button === 1) { e.preventDefault(); this.tryPass(this.bats[0]); return; }
      if (this.bats[0].state === 'sleep') this.wake(this.bats[0]);
    });
    c.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
      if (k === 'Escape' && this.state !== 'menu') { this.toMenu(); return; }
      const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
      if (this.state === 'menu' && k === 'Enter' && !onButton) { this.start(); return; }
      if (this.state === 'end' && (k === 'Enter' || k === ' ') && this.endTimer > 1.2 && !onButton) { this.start(); return; }
      this.keys.add(kl);
      if (this.state !== 'play' || e.repeat) return;
      if (this.tutorial) { if (this.tutorial.t > .7) this.tutorialNext(); return; }
      if ('wasd'.includes(kl) && kl.length === 1 && this.bats[1].state === 'sleep') this.wake(this.bats[1]);
      if (k.startsWith('Arrow') && this.bats[2].state === 'sleep') this.wake(this.bats[2]);
      if (k === ' ') this.tryEcho(this.bats[0]);
      if (kl === 'e') this.tryEcho(this.bats[1]);
      if (k === 'Enter') this.tryEcho(this.bats[2]);
      // pass garlic to a teammate: F (mouse bat), Q (WASD bat), Right Shift or / (arrow-keys bat)
      if (kl === 'f') this.tryPass(this.bats[0]);
      if (kl === 'q') this.tryPass(this.bats[1]);
      if (e.code === 'ShiftRight' || k === '/') this.tryPass(this.bats[2]);
      // backup for the crowd clap when there's no microphone
      if (kl === 'c') this.clap('key');
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', e => { if (this.state === 'play') this.showBanner(tr('padConnected', { n: e.gamepad.index + 1 }), 3, '#9FE0C9', 'sparkle'); });
  }
  // ---------------------------------------------------------------------
  // controllers -> players. Chrome on a Mac merges a left + right Joy-Con into ONE "Joy-Con L+R" gamepad,
  // as if they were clipped onto a Switch. We split that back into two players: the left half drives one bat,
  // the right half another. A single Joy-Con, or any other gamepad, is one player.
  // padHalf: which buttons / stick belong to each half (standard gamepad mapping)
  // ---------------------------------------------------------------------
  padPlayersNow() {
    let pads = [];
    try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []; } catch (e) { pads = []; }
    pads.sort((a, b) => a.index - b.index);
    const players = [];
    pads.forEach(gp => {
      const combined = /L\s*\+\s*R|L\/R|\b200e\b/i.test(gp.id) && gp.axes.length >= 4;
      if (combined) { players.push({ gp, half: 'L' }); players.push({ gp, half: 'R' }); }
      else players.push({ gp, half: null });
    });
    return players.slice(0, 4);
  }
  readPads() {
    // Joy-Cons connected directly (WebHID) come first, one Joy-Con = one bat, in the order they were connected.
    // Then other gamepads (Xbox, PlayStation...). Nintendo entries from the normal gamepad list are skipped while
    // Joy-Cons are connected directly, so a Joy-Con never drives two bats.
    const hid = this.joycons.read(this.padUpright);
    const players = [...hid.map(st => ({ hid: st })), ...this.padPlayersNow().filter(p => !(hid.length && /057e|Joy-Con|Pro Controller/i.test(p.gp.id)))].slice(0, 4);
    this.padPlayers = players;
    const LEFT_BTNS = [4, 6, 8, 10, 12, 13, 14, 15], RIGHT_BTNS = [0, 1, 2, 3, 5, 7, 9, 11];
    const out = [];
    for (let i = 0; i < 4; i++) {
      const p = players[i];
      if (!p) { out.push(null); this.prevPad[i] = []; continue; }
      if (p.hid) { out.push(p.hid); this.prevPadKey[i] = 'hid' + i; continue; }
      const gp = p.gp, key = gp.index + (p.half || '');
      if (this.prevPadKey[i] !== key) { this.prevPad[i] = gp.buttons.map(b => b.pressed); this.prevPadKey[i] = key; } // new controller in this seat: no fake presses
      const pressed = gp.buttons.map(b => b.pressed), prev = this.prevPad[i] || [];
      const edge = j => !!pressed[j] && !prev[j]; this.prevPad[i] = pressed;
      let ax, ay, echo, pass, any;
      if (p.half) {
        // one half of a merged pair. Kids hold each Joy-Con sideways, so turn the stick a quarter turn
        const L = p.half === 'L', rx = gp.axes[L ? 0 : 2] || 0, ry = gp.axes[L ? 1 : 3] || 0;
        if (this.padUpright) { ax = rx; ay = ry; }
        else if (L) { ax = ry; ay = -rx; } else { ax = -ry; ay = rx; }
        const mine = L ? LEFT_BTNS : RIGHT_BTNS;
        echo = L ? [12, 13, 14, 15].some(edge) : [0, 1, 2, 3].some(edge);
        pass = L ? [4, 6].some(edge) : [5, 7].some(edge);
        any = mine.some(edge);
      } else {
        // a single controller: the left stick only (no fallback to the right stick, so two sticks never share a bat)
        ax = gp.axes[0] || 0; ay = gp.axes[1] || 0;
        if (pressed[12]) ay = -1; if (pressed[13]) ay = 1; if (pressed[14]) ax = -1; if (pressed[15]) ax = 1;
        echo = [0, 1, 2, 3].some(edge); pass = [4, 5, 6, 7].some(edge); any = pressed.some((x, j) => edge(j));
      }
      const m = Math.hypot(ax, ay); if (m < .2) { ax = 0; ay = 0; } else if (m > 1) { ax /= m; ay /= m; }
      const own = p.half ? (p.half === 'L' ? LEFT_BTNS : RIGHT_BTNS) : null;
      out.push({ ax, ay, echo, pass, any, pressed: pressed.map((x, j) => x && (!own || own.includes(j)) ? j : -1).filter(j => j >= 0) });
    }
    this.padState = out;
    return out;
  }
  padConnected(i) { return !!(this.padPlayers && this.padPlayers[i]); }
  rumble(b, dur, weak, strong) {
    if (b.slot < 3) return;
    try {
      const p = this.padPlayers && this.padPlayers[b.slot - 3];
      if (p && p.hid) { this.joycons.rumble(b.slot - 3, dur, Math.max(weak, strong)); return; }
      const gp = p && p.gp, a = gp && gp.vibrationActuator;
      if (a && a.playEffect) a.playEffect('dual-rumble', { duration: dur * 1000, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
    } catch (e) { /* rumble not available */ }
  }

  // =================================================================
  // round flow
  // =================================================================
  start() {
    this.sound.init(); this.sound.music = true; this.sound.step = 0; this.sound.next = this.sound.now() + .1;
    this.resetRound(); this.tutorial = null; this.state = 'play';
    this.showBanner(tr('wakeToBegin'), 999, '#F6F1E7', 'moon');
    this.cb.onScreen('play');
  }
  toMenu() {
    this.sound.music = false; this.resetRound(); this.tutorial = null; this.state = 'menu'; this.banner = null;
    this.cb.onScreen('menu');
  }
  resetRound() {
    Object.assign(this, { clapBoost: 0, outEnd: false, burned: 0, goldenFound: 0, caught: 0, dusted: 0, maxActive: 0, elapsed: 0, started: false, roosterDone: false, shiftDone: false, cdT: 0, bossT: 0, endTimer: 0 });
    this.banner = null;
    this.floats.forEach(f => f.el.remove()); this.floats = []; this.parts = [];
    this.flyers.forEach(f => { f.active = false; f.g.visible = f.gold.visible = false; });
    const normal = this.spots.filter(s => !s.golden);
    normal.forEach(s => { s.count = 0; s.revealT = 0; });
    // garlic scales with the length of the night: 10 bulbs for 3 minutes, 17 for 5 minutes
    let n = this.garlicFor(START_GARLIC);
    for (const s of shuffle(normal.slice())) { if (n <= 0) break; s.count = 1; n--; }
    while (n > 0) { normal[n % normal.length].count++; n--; }
    this.lateShiftDone = false;
    this.watchmen.forEach((w, i) => Object.assign(w, { x: w.path[0][0], z: w.path[0][1], seg: 1, mode: 'patrol', pause: i * .8, chaseT: 0, chaseBat: null, inv: null, alertT: 0, active: i < 2, prisoner: null, route: null }));
    if (this.jail) this.jail.rescueT = 0;
    Object.assign(this.cat, { x: -13, z: -4.8, tx: -13, tz: -4.8, pause: 1, cd: 0 });
    this.bats.forEach(b => { b.carrying = null; this.sleepBat(b, true); b.lives = LIVES; });
  }
  finish(win) {
    this.state = 'end'; this.sound.music = false; this.endTimer = 0; this.banner = null;
    if (win) this.sound.play('win');
    let best = 0, isBest = false;
    try { best = +localStorage.getItem('vgh3d-best') || 0; if (this.burned > best) { localStorage.setItem('vgh3d-best', String(this.burned)); isBest = true; } } catch (e) { /* storage blocked */ }
    this.cb.onScreen('end', { win, allCaught: !win && this.outEnd, burned: this.burned, golden: this.goldenFound, caught: this.caught, dusted: this.dusted, best, isBest });
  }
  showBanner(text, dur = 3, color = '#F6F1E7', icon = null) { this.banner = { text, t: dur, color, icon }; }
  // pop-ups in the world are icons (plus a sound where it plays), not words
  // follow: the bat / watchman / cat the icon belongs to; the icon then rides along above it
  addIcon(x, y, z, name, size = 48, life = 1.3, follow = null) {
    const el = document.createElement('div'); el.className = 'float icon';
    el.innerHTML = `<div class="ic a-${name}">${ICONS[name] || ''}</div>`;
    el.style.width = el.style.height = size + 'px';
    const f = { el, x, y, z, life: life + .25, max: life + .25, follow, ox: follow ? x - follow.x : 0, oz: follow ? z - follow.z : 0, lift: follow && follow.tag ? 1.1 : 0 }; // bat icons float above the name tag
    this.placeFloat(f); // put it on the character before the browser ever draws it (no flash in the corner)
    this.layer.appendChild(el); this.floats.push(f);
  }
  placeFloat(f) {
    const age = f.max - f.life, rise = 1 - Math.exp(-age * 2.2); // rises quickly, then hovers
    const fx = f.follow ? f.follow.x + f.ox : f.x, fz = f.follow ? f.follow.z + f.oz : f.z;
    const [sx, sy] = this.toScreen(fx, f.y + (f.lift || 0) + rise * (f.follow ? .45 : .9), fz);
    f.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%)`;
    f.el.style.opacity = Math.min(1, f.life / .35).toFixed(2);
  }
  burst(x, y, z, n, colors, speed = 4, life = .8, size = 1, up = 0) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= 400) this.parts.shift();
      const a = Math.random() * Math.PI * 2, e = rand(-.6, 1), sp = rand(speed * .3, speed);
      this.parts.push({ x, y, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + up, vz: Math.sin(a) * Math.cos(e) * sp, life: rand(life * .6, life), max: life, size: rand(size * .6, size), color: colors[i % colors.length] });
    }
  }

  // =================================================================
  // gameplay actions
  // =================================================================
  activeBats() { return this.bats.filter(b => b.state === 'active'); }
  remaining() {
    let n = 0;
    this.spots.forEach(s => { if (!s.golden) n += s.count; });
    this.flyers.forEach(f => { if (f.active && !f.spot.golden) n++; });
    this.bats.forEach(b => { if (b.carrying && !b.carrying.golden) n++; });
    return n;
  }
  wake(b) {
    if (this.state !== 'play' || b.state !== 'sleep' || b.lives <= 0) return;
    Object.assign(b, { state: 'active', wakeT: .8, idleT: 0, x: b.roof.x, z: b.roof.z + (b.roof.z < 0 ? 1 : -1), vx: 0, vz: 0, echoCd: 0, napT: 0, invulnT: 0, inLamp: false });
    this.collideHouses(b); // start next to the house, not inside it
    this.addIcon(b.x, FLY_Y + .8, b.z, 'sparkle', 40, 1.3, b);
    this.burst(b.x, FLY_Y, b.z, 14, [b.color, '#F6F1E7'], 3);
    this.sound.play('yawn'); this.rumble(b, .25, .4, .2);
    if (!this.started) {
      this.started = true; this.showBanner(tr('stealBefore'), 2.5, '#F6F1E7', 'garlic');
      if (this.tutorialOn) { this.tutorial = { step: 0, t: 0 }; this.banner = null; }
    }
    const n = this.activeBats().length;
    if (n > this.maxActive) { if (n >= 2) this.moreGarlic(this.garlicFor(GARLIC_PER_EXTRA_BAT)); this.maxActive = n; }
  }
  garlicFor(base) { return Math.round(base * Math.max(.5, this.roundTime / 180)); } // more garlic in longer nights
  moreGarlic(n) {
    const normal = this.spots.filter(s => !s.golden);
    const empty = shuffle(normal.filter(s => s.count === 0)), full = shuffle(normal.filter(s => s.count > 0));
    empty.concat(full).slice(0, n).forEach(s => { s.count++; this.burst(s.x, .5, s.z, 10, ['#F5D66B', '#F6F1E7'], 2.5); });
    this.showBanner(tr('moreGarlic', { n }), 2.5, '#F5D66B', 'plusGarlic'); this.sound.play('more');
  }
  sleepBat(b, silent) {
    if (b.carrying) { this.flyBack(b.carrying, b.x, b.z, 1); b.carrying = null; }
    this.floats.forEach(f => { if (f.follow === b) { f.x = b.x + f.ox; f.z = b.z + f.oz; f.follow = null; } });
    if (b.cage) b.cage.visible = false;
    Object.assign(b, { state: 'sleep', x: b.roof.x, z: b.roof.z, vx: 0, vz: 0, grabT: 0, grabSpot: null, echo: null, napT: 0 });
    if (!silent) this.addIcon(b.x, 2.4, b.z, 'zzz', 36, 1.3, b);
  }
  tryEcho(b) {
    // no echolocation while carrying garlic: you already have one, go burn it
    if (this.state !== 'play' || b.state !== 'active' || b.wakeT > 0 || b.echoCd > 0 || b.napT > 0 || b.carrying) return;
    let best = null, bd = 1e9;
    this.spots.forEach(s => { if (s.count <= 0) return; const d = d2(s.x, s.z, b.x, b.z); if (d < bd) { bd = d; best = s; } });
    b.echo = { t: 0, spot: best }; b.echoCd = ECHO_CD; b.idleT = 0;
    if (best) this.burst(best.x, .6, best.z, 12, [b.color, '#FFF3B0'], 2.5);
    this.sound.play('squeak'); this.rumble(b, .12, .5, 0);
  }
  flyBack(spot, x, z, add) {
    const f = this.flyers.find(f => !f.active);
    if (!f) { spot.count += add; return; }
    Object.assign(f, { active: true, spot, x0: x, z0: z, t: 0, add });
  }
  nearestWatchman(x, z) {
    let best = null, bd = 1e9;
    this.watchmen.forEach(w => { if (!w.active || w.mode === 'chase') return; const d = d2(w.x, w.z, x, z); if (d < bd) { bd = d; best = w; } });
    return best;
  }
  tutorialNext() {
    const tu = this.tutorial; if (!tu) return;
    tu.step++; tu.t = 0; this.sound.play('ready');
    if (tu.step >= TUT_STEPS) { this.tutorial = null; this.showBanner(tr('tutGo'), 2.2, '#F5D66B', 'bat'); this.sound.play('more'); }
  }
  // caught with garlic: lose a heart, drop the bulb, and fall asleep on the spot for a few seconds
  caughtBat(b, src) {
    if (b.carrying) { this.flyBack(b.carrying, b.x, b.z, 1); b.carrying = null; } // the bulb goes back where it came from
    b.lives--; this.caught++; b.grabT = 0; b.grabSpot = null; b.echo = null;
    this.addIcon(src.x, 2.9, src.z, 'thief', 54, 1.3, src);
    this.burst(b.x, FLY_Y, b.z, 16, ['#F07A6A', '#FFE08A'], 4);
    this.sound.play('alarm'); this.rumble(b, .4, .8, 1);
    if (b.lives > 0) {
      b.napT = NAP_TIME; b.invulnT = NAP_TIME + 2; b.vx = 0; b.vz = 0; b.zzzT = 0;
      this.addIcon(b.x, FLY_Y + 1.2, b.z, 'heartBroken', 50, 1.6, b); this.sound.play('lifeLost');
      return;
    }
    // out of hearts: the watchman grabs the bat and carries it to the jail; it gets out after a while, or teammates break it out
    b.cageT = CAGE_TIME; b.rescueT = 0;
    if (this.jail && src && src.path) this.escortToJail(b, src);
    else if (this.jail) this.lockUp(b);
    this.addIcon(b.x, FLY_Y + 1.2, b.z, 'cage', 58, 2, src && src.path ? src : b);
    this.burst(b.x, FLY_Y, b.z, 24, ['#8A7AB8', '#F5D66B', b.color], 3.5, 1.1, 1.4, 1.5);
    this.sound.play('cage'); this.rumble(b, .6, 1, 1);
    this.showBanner(tr('freeFriend', { name: b.name }), 3.2, b.color, 'cage');
  }
  // hand your garlic to the closest teammate who isn't carrying any
  tryPass(b) {
    if (this.state !== 'play' || b.state !== 'active' || !b.carrying || b.napT > 0) return false;
    const to = this.passTarget(b);
    if (!to) return false;
    to.carrying = b.carrying; b.carrying = null; to.grabT = 0; to.grabSpot = null; to.idleT = 0;
    this.watchmen.forEach(w => { if (w.chaseBat === b) { w.chaseBat = to; } });
    for (let k = 0; k <= 8; k++) this.burst(lerp(b.x, to.x, k / 8), FLY_Y - .4, lerp(b.z, to.z, k / 8), 2, ['#9FE0C9', '#F6EEDC'], .8, .5, .8);
    this.addIcon(to.x, FLY_Y + 1.1, to.z, 'pass', 44, 1, to);
    this.sound.play('pass'); this.rumble(b, .12, .4, 0); this.rumble(to, .12, .4, 0);
    return true;
  }
  passTarget(b) {
    let best = null, bd = PASS_R;
    this.bats.forEach(o => { if (o === b || o.state !== 'active' || o.carrying || o.napT > 0) return; const d = d2(b.x, b.z, o.x, o.z); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  // the crowd claps (microphone, the C key or the on-screen button): push the sunrise back a little
  clap(source) {
    this.clapFlash = .35;
    if (this.state !== 'play' || !this.started) return false;
    // bats in jail? Then the crowd's claps help them out sooner
    const jailed = this.bats.filter(b => b.state === 'caged');
    if (jailed.length) {
      jailed.forEach(b => { b.cageT = Math.max(0, b.cageT - CLAP_CAGE); });
      if (this.jail) { this.burst(this.jail.x, 2.2, this.jail.z, 10, ['#F5D66B', '#FFF3B0', '#9FE0C9'], 3, 1, 1, 2); this.addIcon(this.jail.x, 2.8, this.jail.z, 'clap', 40, .9); }
      this.sound.play('clap'); this.lastClap = { t: this.time, source };
      return true;
    }
    return false; // no bats in jail: clapping does nothing (it never changes the time of the night)
  }

  // =================================================================
  // simulation step
  // =================================================================
  update(dt) {
    this.time += dt;
    const pads = this.readPads();
    if (this.state === 'menu' && !this.padCheckOpen && pads.some(p => p && p.any)) { this.start(); return; }
    if (this.state === 'end') { this.endTimer += dt; if (this.endTimer > 1.2 && pads.some(p => p && p.any)) { this.start(); return; } }
    // the tutorial pauses the night: every step plays for a few seconds, any button skips ahead
    if (this.tutorial) {
      const tu = this.tutorial; tu.t += dt;
      if (this.state !== 'play') this.tutorial = null;
      else if (tu.t > TUT_STEP || (tu.t > .7 && pads.some(p => p && p.any))) this.tutorialNext();
      this.clapper.update(dt);
      return;
    }
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= .94; p.vy = p.vy * .94 - 2 * dt; p.vz *= .94; p.life -= dt; });
    this.parts = this.parts.filter(p => p.life > 0);
    this.updateLamps();
    this.clapper.update(dt);
    this.clapFlash = Math.max(0, this.clapFlash - dt);
    // fountain droplets
    this.fountainT -= dt; if (this.fountainT <= 0) { this.fountainT = .12; this.burst(PLAZA.x, 1.35, PLAZA.z, 2, ['#9FE6F2', '#5FD3E6'], 1.2, .9, .6, 2.5); }
    if (this.state === 'menu' || this.state === 'end') { this.updateWatchmen(dt, 0, true); this.updateCat(dt, true); return; }

    const p = this.started ? clamp(this.elapsed / this.roundTime, 0, 1) : 0;
    this.sound.tempo = p;
    const R = this.lightR = lerp(LIGHT_R0, LIGHT_R1, p);

    if (this.state === 'play') pads.forEach((pd, i) => {
      if (!pd) return; const b = this.bats[3 + i];
      if (b.state === 'sleep' && (pd.hid ? pd.shake : pd.any)) this.wake(b); // Joy-Con: shake it to wake the bat
      else if (b.state === 'active' && pd.echo) this.tryEcho(b);
      if (b.state === 'active' && pd.pass) this.tryPass(b); // shoulder buttons
    });

    // the night shift: a third watchman
    const w3 = this.watchmen[2];
    if (!w3.active && this.started && (this.activeBats().length >= 3 || p >= THIRD_WATCHMAN_AT)) {
      Object.assign(w3, { active: true, x: w3.path[0][0], z: w3.path[0][1], seg: 1, mode: 'patrol' });
      if (!this.shiftDone) { this.shiftDone = true; this.showBanner(tr('nightShift'), 3, '#F07A6A', 'lantern'); this.sound.play('alarm'); }
    }

    // the late shift: in 5-minute nights a fourth watchman joins
    const w4 = this.watchmen[3];
    if (w4 && !w4.active && this.started && this.roundTime >= 240 && p >= FOURTH_WATCHMAN_AT) {
      Object.assign(w4, { active: true, x: w4.path[0][0], z: w4.path[0][1], seg: 1, mode: 'patrol' });
      if (!this.lateShiftDone) { this.lateShiftDone = true; this.showBanner(tr('nightShift'), 3, '#F07A6A', 'lantern'); this.sound.play('alarm'); }
    }
    this.updateWatchmen(dt, p, !this.started);
    this.updateCat(dt, !this.started);
    this.flyers.forEach(f => {
      if (!f.active) return; f.t += dt * 1.6;
      if (f.t >= 1) { f.active = false; f.spot.count += f.add; if (f.spot.golden) f.spot.revealT = 0; this.burst(f.spot.x, .5, f.spot.z, 8, ['#F6F1E7', '#F07A6A'], 2); }
    });
    this.spots.forEach(s => { s.revealT = Math.max(0, s.revealT - dt); });

    this.bats.forEach((b, i) => {
      if (b.state !== 'active') return;
      const wasCooling = b.echoCd > 0;
      b.wakeT = Math.max(0, b.wakeT - dt); b.echoCd = Math.max(0, b.echoCd - dt);
      if (wasCooling && b.echoCd <= 0 && this.state === 'play') { this.addIcon(b.x, FLY_Y + 1.1, b.z, 'echo', 34, 1, b); this.sound.play('ready'); this.rumble(b, .08, .3, 0); }
      b.invulnT = Math.max(0, b.invulnT - dt);
      // napping after a catch: lie still, snore, then wake up by itself
      if (b.napT > 0) {
        b.napT -= dt; b.idleT = 0; b.grabT = 0; b.grabSpot = null;
        b.zzzT = (b.zzzT || 0) - dt; if (b.zzzT <= 0) { b.zzzT = 1.1; this.addIcon(b.x, 1.6, b.z, 'zzz', 30, 1.1, b); this.sound.play('snore'); }
        if (b.napT <= 0) { b.napT = 0; this.addIcon(b.x, FLY_Y + .9, b.z, 'sparkle', 40, 1.3, b); this.sound.play('yawn'); this.rumble(b, .2, .4, .2); }
      }
      if (b.echo) { b.echo.t += dt; if (b.echo.t > ECHO_DUR || (b.echo.spot && b.echo.spot.count <= 0)) b.echo = null; }
      let dvx = 0, dvz = 0, input = false;
      const vmax = (b.carrying ? CARRY_V : MAXV) * (b.inLamp ? LAMP_SLOW : 1);
      if (this.state === 'play' || this.state === 'countdown') {
        if (i === 0) {
          const dx = this.mouse.x - b.x, dz = this.mouse.z - b.z, d = Math.hypot(dx, dz), sp = Math.min(vmax, d * 6);
          if (d > .05) { dvx = dx / d * sp; dvz = dz / d * sp; }
          input = this.time - this.mouse.last < .15;
        } else if (i < 3) {
          const K = i === 1 ? ['w', 's', 'a', 'd'] : ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
          let ax = (this.keys.has(K[3]) ? 1 : 0) - (this.keys.has(K[2]) ? 1 : 0), az = (this.keys.has(K[1]) ? 1 : 0) - (this.keys.has(K[0]) ? 1 : 0);
          const m = Math.hypot(ax, az); if (m) { ax /= m; az /= m; input = true; }
          dvx = ax * vmax; dvz = az * vmax;
        } else {
          const pd = pads[i - 3];
          if (!pd) { this.sleepBat(b); return; }
          dvx = pd.ax * vmax; dvz = pd.ay * vmax; input = Math.hypot(pd.ax, pd.ay) > .2 || pd.any || (pd.motion || 0) > .3;
        }
      }
      if (b.napT > 0) { dvx = 0; dvz = 0; }
      const k = Math.min(1, dt * 8);
      b.vx += (dvx - b.vx) * k; b.vz += (dvz - b.vz) * k;
      b.x = clamp(b.x + b.vx * dt, WORLD.x0 + .4, WORLD.x1 - .4); b.z = clamp(b.z + b.vz * dt, -WORLD.z + .5, WORLD.z - .5);
      this.collideHouses(b); // houses are solid: bump into them and slide along the walls
      b.idleT = input || b.napT > 0 ? 0 : b.idleT + dt;
      if (b.idleT > IDLE_SLEEP && this.state === 'play') { this.sleepBat(b); return; }
      if (this.state !== 'play' || !this.started) return;

      // watchmen: notice, chase, catch
      let lit = null, near = false;
      this.watchmen.forEach(w => {
        if (!w.active || w.mode === 'escort') return; // busy carrying a bat to the jail
        const d = d2(b.x, b.z, w.x, w.z);
        if (d < R) lit = w;
        else if (d < R * NOTICE) {
          near = true;
          if (b.carrying && b.invulnT <= 0 && w.mode !== 'chase' && w.alertT <= 0) {
            w.mode = 'chase'; w.chaseBat = b; w.chaseT = 2.4; w.pause = 0;
            this.addIcon(w.x, 2.4, w.z, 'alert', 46, 1.3, w); this.sound.play('hey');
          }
        } else if (d < R + 2.6) near = true;
      });
      // street lamps
      // street lamps don't catch you, their light just slows you down
      const lamp = this.lamps.some(L => L.onNow && d2(b.x, b.z, L.x, L.z) < LAMP_R);
      if (lamp && !b.inLamp) { this.addIcon(b.x, FLY_Y + 1, b.z, 'snail', 44, 1.1, b); this.sound.play('slow'); this.rumble(b, .2, .5, 0); }
      b.inLamp = lamp;
      if (lamp && Math.random() < dt * 12) this.burst(b.x, FLY_Y, b.z, 1, ['#FFE9A8'], .6, .6, .7);
      if (lit || near) { b.pulseT -= dt; if (b.pulseT <= 0) { b.pulseT = .75; this.rumble(b, .09, .25, .35); } }
      // watchmen only catch a bat that is carrying garlic
      if (lit && b.carrying && b.napT <= 0 && b.invulnT <= 0) {
        this.caughtBat(b, lit); lit.alertT = 1.6; lit.chaseBat = null;
        if (lit.mode !== 'escort') { lit.pause = 1.2; lit.mode = 'return'; } // unless he's now taking the bat to jail
        if (b.state !== 'active') return;
      }
      if (lit) { b.grabT = 0; b.grabSpot = null; }
      // grab garlic
      if (!b.carrying && b.napT <= 0 && !lit) {
        let best = null, bd = GRAB_R;
        this.spots.forEach(s => { if (s.count <= 0 || (s.golden && s.revealT <= 0)) return; const d = d2(b.x, b.z, s.x, s.z); if (d < bd) { bd = d; best = s; } });
        if (best && best === b.grabSpot) {
          b.grabT += dt; if (best.golden) best.revealT = Math.max(best.revealT, .6);
          if (b.grabT >= GRAB_TIME) {
            best.count--; b.carrying = best; b.grabT = 0; b.grabSpot = null;
            this.addIcon(b.x, FLY_Y + .9, b.z, 'yuck', 48, 1.3, b); this.sound.play('yuck'); this.rumble(b, .15, .35, .6);
          }
        } else { b.grabSpot = best; b.grabT = 0; }
      }
      // burn it
      if (b.carrying && d2(b.x, b.z, FURNACE.x, FURNACE.z) < FURNACE.r + .35) {
        const g = b.carrying.golden; b.carrying = null; this.burned++; if (g) this.goldenFound++;
        this.addIcon(FURNACE.x, 3, FURNACE.z, g ? 'star' : 'flame', 58);
        // every burned bulb makes the watchmen a little faster
        if (this.burned * WATCH_SPEEDUP <= WATCH_SPEEDUP_MAX) { this.watchmen.forEach(w => { if (w.active) this.addIcon(w.x, 2.5, w.z, 'faster', 34, .9, w); }); setTimeout(() => this.sound.play('faster'), 450); }
        this.burst(FURNACE.x, 1, FURNACE.z, 30, ['#F5D66B', '#F4B183', '#F07A6A', '#FFF3B0'], 5, 1, 1.4, 4);
        this.sound.play('whoosh'); this.rumble(b, .25, .6, .6); this.fireBoost = 1;
      }
    });

    if (this.state === 'play') this.updateCages(dt);
    if (this.state === 'play' && this.started) {
      this.elapsed += dt;
      const pp = this.elapsed / this.roundTime;
      if (pp >= .86 && !this.roosterDone) { this.roosterDone = true; this.sound.play('rooster'); this.showBanner(tr('rooster'), 4, '#F4B183', 'rooster'); }
      if (this.remaining() === 0) { this.state = 'countdown'; this.cdT = 3; this.lastCd = 4; this.showBanner(tr('allGone'), 3, '#F5D66B', 'star'); }
      else if (pp >= 1) this.sunUp();

    } else if (this.state === 'countdown') {
      this.cdT -= dt; const sc = Math.ceil(this.cdT);
      if (sc < this.lastCd && sc > 0) { this.lastCd = sc; this.sound.play('tick'); }
      if (this.cdT <= 0) { this.state = 'boss'; this.bossT = 0; this.banner = null; this.sound.play('mwahaha'); this.addIcon(6, 5, 0, 'fangs', 120, 3.4); }
    } else if (this.state === 'boss') {
      this.bossT += dt; if (this.bossT > 3.6) this.finish(true);
    } else if (this.state === 'sunup') {
      this.cdT -= dt; if (this.cdT <= 0) this.finish(false);
    }
  }
  updateLamps() {
    this.lamps.forEach(L => {
      const cyc = L.onDur + L.offDur, t = (this.time + L.offset) % cyc, now = t < L.onDur;
      L.warn = !now && t > cyc - 1.0; // blinks for a second before switching on
      if (now && !L.onNow && this.state === 'play' && this.started) this.sound.play('lamp');
      L.onNow = now;
    });
  }
  updateWatchmen(dt, p, idle) {
    this.watchmen.forEach(w => {
      w.alertT = Math.max(0, w.alertT - dt);
      if (!w.active) return;
      if (idle && this.state !== 'menu' && this.state !== 'end') return;
      if (w.pause > 0) { w.pause -= dt; w.angle += Math.sin(this.time * 2.5) * dt * 1.5; return; }
      if (w.mode === 'chase') {
        w.chaseT -= dt;
        const b = w.chaseBat;
        if (!b || b.state !== 'active' || !b.carrying || b.invulnT > 0 || b.napT > 0 || w.chaseT <= 0) { w.mode = 'return'; w.chaseBat = null; w.pause = .6; return; }
      }
      if (w.mode === 'escort') {
        const b = w.prisoner;
        if (!b || b.state !== 'carried') { w.mode = 'return'; w.prisoner = null; return; }
        const [tx, tz] = w.route[w.routeI], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz), sp = 2.6;
        if (d < sp * dt + .02) { w.x = tx; w.z = tz; w.routeI++; if (w.routeI >= w.route.length) { this.lockUp(b); w.prisoner = null; w.mode = 'return'; w.pause = 1.2; w.angle = 0; } }
        else { w.x += dx / d * sp * dt; w.z += dz / d * sp * dt; w.angle = Math.atan2(-dx, -dz); }
        return;
      }
      let tx, tz, sp;
      const boost = idle ? 0 : Math.min(WATCH_SPEEDUP_MAX, (this.burned || 0) * WATCH_SPEEDUP);
      const base = idle ? 1.2 : 1.5 + .9 * p + boost;
      if (w.mode === 'chase') { tx = w.chaseBat.x; tz = w.chaseBat.z; sp = 3.3 + .7 * p + boost; }
      else if (w.mode === 'investigate') { tx = w.inv.x; tz = w.inv.z; sp = 3.0; }
      else { const t = w.path[w.seg]; tx = t[0]; tz = t[1]; sp = base; }
      const dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
      if (d < sp * dt + .02) {
        if (w.mode === 'investigate') { w.mode = 'return'; w.pause = 1.6; w.x = tx; w.z = tz; return; }
        if (w.mode === 'chase') { w.x = tx; w.z = tz; return; }
        w.x = tx; w.z = tz; w.mode = 'patrol'; w.seg = (w.seg + 1) % w.path.length; w.pause = .7;
      } else { w.x += dx / d * sp * dt; w.z += dz / d * sp * dt; w.angle = Math.atan2(-dx, -dz); }
    });
  }
  updateCat(dt, idle) {
    const c = this.cat;
    c.cd = Math.max(0, c.cd - dt);
    if (c.pause > 0) c.pause -= dt;
    else {
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
      if (d < .05) {
        c.pause = rand(1, 3);
        // the cat strolls along the streets
        for (let i = 0; i < 20; i++) { const x = rand(WORLD.x0 + 1.5, 9.5), z = rand(-WORLD.z + 1.4, WORLD.z - 1.4); if (this.onStreet(x, z)) { c.tx = x; c.tz = z; break; } }
      } else { const sp = 1.3; c.x += dx / d * Math.min(d, sp * dt); c.z += dz / d * Math.min(d, sp * dt); c.angle = Math.atan2(-dx, -dz); }
    }
    if (idle || this.state !== 'play' || c.cd > 0) return;
    for (const b of this.bats) {
      if (b.state !== 'active' || b.napT > 0) continue;
      if (d2(b.x, b.z, c.x, c.z) < (b.carrying ? 2.2 : 1.3)) {
        c.cd = 7; c.pause = 1.5;
        this.addIcon(c.x, 1.4, c.z, 'cat', 44, 1.3, c); this.sound.play('meow');
        const w = this.nearestWatchman(c.x, c.z);
        if (w) { w.mode = 'investigate'; w.inv = { x: c.x, z: c.z }; w.pause = 0; this.addIcon(w.x, 2.4, w.z, 'question', 44, 1.3, w); }
        break;
      }
    }
  }
  sunUp() {
    this.state = 'sunup'; this.cdT = 2.4; this.elapsed = this.roundTime;
    let any = false;
    this.bats.forEach(b => {
      if (b.state !== 'active') return;
      if (b.x < CASTLE_X) { this.burst(b.x, FLY_Y, b.z, 34, ['#BDB6CF', '#8E86A8', '#F6F1E7'], 3.5, 1.2, 1.6, 1.5); this.dusted++; any = true; this.sleepBat(b, true); }
    });
    if (any) this.sound.play('puff');
    this.showBanner(any ? tr('sunPoof') : tr('sunSafe'), 2.4, '#F4B183', 'sun');
  }

  // =================================================================
  // per-frame visuals
  // =================================================================
  updateVisuals() {
    const t = this.time, p = this.started ? clamp(this.elapsed / this.roundTime, 0, 1) : 0;
    const R = this.lightR || LIGHT_R0;
    this.applyTimeLight(p);

    const fl = 1 + Math.sin(t * 9) * .06 + Math.sin(t * 23) * .04;
    this.furnaceLight.intensity = 40 * fl * (1 + (this.fireBoost || 0) * .8); this.furnaceGlow.scale.setScalar(8 * fl * (1 + (this.fireBoost || 0) * .3));
    // flames: each tongue stretches, breathes and sways on its own; a burned bulb makes the whole fire flare up
    this.fireBoost = Math.max(0, (this.fireBoost || 0) - this.dt * 1.2);
    const boost = 1 + this.fireBoost * .6;
    this.flames.forEach(fm => {
      const tt = t * fm.sp + fm.ph, L = fm.L;
      const h = L.h * boost * (.82 + .14 * Math.sin(tt * 7.3) + .08 * Math.sin(tt * 13.1) + .05 * Math.sin(tt * 23.7));
      const w = L.w * (1 + .1 * Math.sin(tt * 9.1 + 1));
      fm.m.scale.set(w, h, w);
      // lean outwards a little, sway, and twist so the curled tips point different ways
      fm.m.rotation.set(Math.sin(tt * 3.1) * .18 - Math.sin(fm.a) * L.r * .25, fm.a + Math.sin(tt * 1.7) * .6, Math.sin(tt * 2.6) * .18 + Math.cos(fm.a) * L.r * .25);
    });

    this.updateAmbience(this.dt, p);

    // street lamps
    this.lamps.forEach(L => {
      const blink = L.warn && Math.floor(t * 8) % 2 === 0;
      const on = L.onNow;
      L.pool.visible = on || blink; L.ring.visible = on || L.warn;
      L.pool.material.opacity = on ? .16 : .05; L.ring.material.opacity = on ? .2 : .08;
      L.headMat.color.set(on ? '#FFE9A8' : blink ? '#B8A46A' : '#4A4370');
      L.light.intensity = on ? 2.5 : blink ? .8 : 0;
    });

    this.spots.forEach(s => {
      const vis = !s.golden || s.revealT > 0, n = Math.min(s.count, s.bulbs.length);
      s.bulbs.forEach((m, i) => { m.visible = vis && i < n; if (!s.golden) { m.rotation.z = Math.sin(t * 2.2 + s.ph + i) * .12; } });
      if (s.halo) { s.halo.visible = n > 0; s.halo.material.opacity = .3 + Math.sin(t * 2.5 + s.ph) * .08; }
      if (s.golden) { const a = Math.min(1, s.revealT / 1.2); s.glow.visible = vis && s.count > 0; s.glow.material.opacity = .9 * a; s.group.position.y = .1 + Math.sin(t * 4) * .06; }
    });
    this.flyers.forEach(f => {
      const gold = f.spot && f.spot.golden, g = gold ? f.gold : f.g, other = gold ? f.g : f.gold;
      other.visible = false; g.visible = f.active;
      if (!f.active) return;
      g.position.set(lerp(f.x0, f.spot.x, f.t), lerp(FLY_Y - .6, 0, f.t) + Math.sin(f.t * Math.PI) * 2, lerp(f.z0, f.spot.z, f.t));
      g.rotation.z = f.t * 8;
    });

    this.watchmen.forEach(w => {
      const vis = w.active; w.g.visible = w.pool.visible = w.ring.visible = w.light.visible = vis;
      if (!vis) return;
      w.g.position.set(w.x, w.pause <= 0 ? Math.abs(Math.sin(t * 8)) * .05 : 0, w.z); w.g.rotation.y = w.angle;
      const walk = w.pause <= 0 ? Math.sin(t * 8) * (w.mode === 'chase' ? .8 : .5) : 0;
      if (w.rig) this.poseHunter(w, t, walk); else { w.legs[0].rotation.x = walk; w.legs[1].rotation.x = -walk; w.armL.rotation.x = -walk * .8; }
      const fl2 = 1 + Math.sin(t * 13 + w.x) * .03;
      w.pool.position.set(w.x, .16, w.z); w.pool.scale.setScalar(R * 2.25 * fl2);
      w.ring.position.set(w.x, .17, w.z); w.ring.scale.setScalar(R);
      const hot = w.alertT > 0 || w.mode === 'chase';
      w.ring.material.color.set(hot ? '#FF5A4A' : w.mode === 'investigate' ? '#F4B183' : '#FFD060');
      w.pool.material.color.set(hot ? '#FF9A7A' : '#FFC85A');
      w.light.intensity = 20 * fl2; // the guards' lanterns are the brightest lights in the village: that's where the danger is
    });
    const c = this.cat; c.g.position.set(c.x, c.pause > 0 ? 0 : Math.abs(Math.sin(t * 10)) * .04, c.z); c.g.rotation.y = c.angle || 0; c.tail.rotation.z = Math.sin(t * 3) * .5;

    this.bats.forEach(b => {
      const caged = b.state === 'caged', carried = b.state === 'carried';
      const show = (b.state === 'active' || caged || carried || b.slot < 3 || this.padConnected(b.slot - 3)) && this.state !== 'menu';
      b.g.visible = show; b.ring.visible = show && b.state === 'active';
      if (!show) { b.tag.hidden = true; b.beacon.visible = false; b.waves.forEach(w => { w.visible = false; }); return; }
      const sleeping = b.state !== 'active' && !caged && !carried;
      b.g.scale.setScalar(caged || carried ? .72 : 1);
      if (carried) {
        // dangling upside down from the watchman's raised hand
        // dangling by its feet from the watchman's hand, wriggling
        const w = b.carrier, hand = w.rig ? w.rig.bone('palm.R') : null;
        if (hand) { w.g.updateMatrixWorld(true); hand.getWorldPosition(this._v); }
        else { const ca = Math.cos(w.angle), sa = Math.sin(w.angle); this._v.set(w.x + ca * .45 - sa * .4, 1.2, w.z - sa * .45 - ca * .4); }
        b.x = this._v.x; b.z = this._v.z;
        b.g.position.set(this._v.x, this._v.y - .32 + Math.sin(t * 9) * .03, this._v.z); b.g.rotation.set(Math.PI, w.angle, Math.sin(t * 7) * .3);
        b.wingR.rotation.z = Math.sin(t * 22) * .5; b.wingL.rotation.z = -Math.sin(t * 22) * .5; if (b.eyes) b.eyes.visible = true;
        b.beacon.visible = false; b.waves.forEach(wv => { wv.visible = false; });
      } else if (caged) {
        // locked up in the jail; shakes the bars when friends come to help
        const jig = this.jail && this.jail.rescuing ? Math.sin(t * 30 + b.slot) * .06 : 0;
        b.g.position.set(b.x + jig, .62 + Math.sin(t * 2 + b.slot) * .04, b.z); b.g.rotation.set(0, Math.PI, 0);
        b.wingR.rotation.z = -1.1 + Math.sin(t * 6) * .15; b.wingL.rotation.z = 1.1 - Math.sin(t * 6) * .15; if (b.eyes) b.eyes.visible = true;
        b.beacon.visible = false; b.waves.forEach(w => { w.visible = false; });
      } else if (sleeping) {
        b.g.position.set(b.roof.x, 1.78 + Math.sin(t * 2 + b.slot) * .03, b.roof.z); b.g.rotation.set(0, b.roof.z < 0 ? Math.PI : 0, 0);
        b.wingR.rotation.z = -1.25; b.wingL.rotation.z = 1.25; if (b.eyes) b.eyes.visible = false;
      } else {
        if (Math.hypot(b.vx, b.vz) > .4) b.yaw = Math.atan2(-b.vx, -b.vz);
        b.ring.position.set(b.x, .18, b.z);
        if (b.napT > 0) {
          // asleep on the ground: drop down, wings folded, gently breathing
          const fall = Math.min(1, (NAP_TIME - b.napT) / .4);
          b.g.position.set(b.x, lerp(FLY_Y, .55, fall) + Math.sin(t * 3) * .03, b.z);
          b.g.rotation.set(0, b.yaw, .5 * fall);
          b.wingR.rotation.z = -1.25; b.wingL.rotation.z = 1.25; if (b.eyes) b.eyes.visible = false;
          b.ring.material.opacity = .35; b.g.visible = true;
        } else {
          b.g.position.set(b.x, FLY_Y + Math.sin(t * 3 + b.slot) * .12, b.z);
          b.g.rotation.set(0, b.yaw, 0);
          const flap = Math.sin(t * (b.carrying ? 20 : 15) + b.slot) * .75;
          b.wingR.rotation.z = flap; b.wingL.rotation.z = -flap; if (b.eyes) b.eyes.visible = true;
          b.ring.material.opacity = .85;
          b.g.visible = !(b.invulnT > 0 && Math.floor(t * 8) % 2 === 0); // blinks while it can't be caught
        }
      }
      if (b.rig) this.poseBat(b, t);
      b.carry.visible = !!b.carrying && !b.carrying.golden; b.carryGold.visible = !!b.carrying && b.carrying.golden;
      // echolocation beacon over the closest garlic + sonar ripple at the bat
      if (b.echo && b.echo.spot) {
        const s = b.echo.spot, et = b.echo.t, fade = et > ECHO_DUR - .5 ? (ECHO_DUR - et) / .5 : Math.min(1, et / .2);
        const arrived = clamp((et - .25) / .3, 0, 1); // the marker pops in when the first wave arrives
        b.beacon.visible = arrived > 0; b.beacon.position.set(s.x, 0, s.z);
        b.arrow.position.y = 2.0 + Math.abs(Math.sin(t * 6)) * .45; b.arrow.rotation.y = t * 3; b.arrow.scale.setScalar(arrived);
        b.arrow.material.opacity = fade;
        const pr = 1 + (t * 1.5 % 1) * .8; b.bRing.scale.setScalar(pr); b.bRing.material.opacity = .9 * fade * (1.8 - pr);
        b.bGlow.material.opacity = (.55 + Math.sin(t * 8) * .2) * fade;
        // sound-wave arcs flowing from the bat to the garlic
        const tgt = this.tmpV.set(s.x, .6, s.z);
        b.waves.forEach((w, i) => {
          const u = (et * 1.4 - i / b.waves.length + 1) % 1;
          w.visible = true;
          w.position.set(lerp(b.x, s.x, u), lerp(FLY_Y, .6, u), lerp(b.z, s.z, u));
          w.lookAt(tgt); w.scale.setScalar(.7 + u * 1.3);
          w.material.opacity = .9 * fade * Math.min(1, u * 5) * (1 - u * .6);
        });
      } else { b.beacon.visible = false; b.waves.forEach(w => { w.visible = false; }); }
      b.tag.hidden = false;
      const [sx, sy] = this.toScreen(b.g.position.x, b.g.position.y + (sleeping ? .7 + (b.slot % 2) * .55 : .8), b.g.position.z);
      b.tag.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
      const cache = b.tagCache, out = b.state === 'out';
      const nm = out ? tr('tagOut', { name: b.name }) : sleeping ? tr('tagSleep', { name: b.name }) : b.name;
      if (cache.nm !== nm) { cache.nm = nm; b.tagNm.textContent = nm; b.tag.classList.toggle('sleep', sleeping); b.tag.classList.toggle('out', out); }
      if (cache.lives !== b.lives) { cache.lives = b.lives; b.tagHearts.forEach((hEl, i) => hEl.classList.toggle('lost', i >= b.lives)); }
      const locked = !!b.carrying && !caged && !carried; // carrying garlic: echo is switched off (shown greyed)
      const ready = !caged && !carried && !locked && b.echoCd <= 0 && b.wakeT <= 0 && b.napT <= 0, echoTxt = sleeping ? '' : caged || carried ? tr('tagCaged', { n: Math.max(0, Math.ceil(b.cageT)) }) : b.napT > 0 ? 'zzz' : ready || (locked && b.echoCd <= 0) ? tr('tagEchoReady') : tr('tagEcho', { n: Math.max(1, Math.ceil(Math.max(b.echoCd, b.wakeT))) });
      if (cache.echo !== echoTxt || cache.locked !== locked || cache.ready !== ready) { cache.echo = echoTxt; cache.locked = locked; cache.ready = ready; b.tagEcho.hidden = sleeping; b.tagEchoTxt.textContent = echoTxt; b.tagEcho.classList.toggle('ready', ready); b.tagEcho.classList.toggle('locked', locked); }
      if (!ready && !sleeping) b.tagEcho.style.setProperty('--p', (caged || carried ? 1 - b.cageT / CAGE_TIME : 1 - b.echoCd / ECHO_CD).toFixed(3));
      const napping = b.napT > 0;
      const gp = caged ? b.rescueT / RESCUE_TIME : carried ? 0 : napping ? 1 - b.napT / NAP_TIME : b.grabT > 0 ? b.grabT / GRAB_TIME : 0;
      b.tagGrab.hidden = gp <= 0; b.tagGrab.classList.toggle('nap', napping); if (gp > 0) b.tagGrab.style.setProperty('--p', gp.toFixed(3));
      const canPass = !sleeping && !napping && !!b.carrying && !!this.passTarget(b);
      if (cache.pass !== canPass) { cache.pass = canPass; b.tagPass.hidden = !canPass; }
    });

    // the jail: a mint ring at the door shows where to fly to break your friends out
    if (this.jail) {
      const J = this.jail, n = this.bats.filter(b => b.state === 'caged').length;
      J.ring.visible = J.glow.visible = n > 0 && this.state === 'play';
      if (n > 0) { const pulse = Math.sin(t * 5); J.ring.material.opacity = .55 + pulse * .3; J.ring.scale.setScalar(1 + pulse * .03); J.glow.material.opacity = .25 + J.rescueT / RESCUE_TIME * .5; }
      J.tag.hidden = !(n > 0 && this.state === 'play');
      if (n > 0) {
        const [sx, sy] = this.toScreen(J.x, 2.9, J.z);
        J.tag.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
        J.tag.style.setProperty('--p', (J.rescueT / RESCUE_TIME).toFixed(3)); J.tag.classList.toggle('helping', !!J.rescuing);
        const txt = `×${n}`; if (J.tagN.textContent !== txt) J.tagN.textContent = txt;
      }
    }
    // the big vampire: waits in the courtyard, walks into the village on a total win
    const HOME = [14.3, -4.2];
    if (this.state === 'boss') {
      const k = Math.min(1, this.bossT / 2.6);
      this.boss.position.set(lerp(HOME[0], 1.5, k), Math.abs(Math.sin(this.bossT * 7)) * .15, lerp(HOME[1], 0, k));
      this.boss.rotation.y = Math.atan2(1.5 - HOME[0], 0 - HOME[1]) + Math.sin(this.bossT * 3) * .2;
      this.boss.scale.setScalar(lerp(1, 1.25, k));
    } else {
      this.boss.position.set(HOME[0], Math.abs(Math.sin(t * 1.5)) * .05, HOME[1]);
      this.boss.rotation.y = -Math.PI / 2 + Math.sin(t * .6) * .35; this.boss.scale.setScalar(1);
    }

    for (let i = 0; i < 400; i++) {
      const pt = this.parts[i];
      if (!pt) { this.tmpM.makeScale(0, 0, 0); this.partMesh.setMatrixAt(i, this.tmpM); continue; }
      const sc = pt.size * Math.max(0, pt.life / pt.max);
      this.tmpM.compose(this.tmpV.set(pt.x, pt.y, pt.z), this.tmpQ, this.tmpS.set(sc, sc, sc));
      this.partMesh.setMatrixAt(i, this.tmpM); this.partMesh.setColorAt(i, this.tmpC.set(pt.color));
    }
    this.partMesh.instanceMatrix.needsUpdate = true; if (this.partMesh.instanceColor) this.partMesh.instanceColor.needsUpdate = true;

    this.floats = this.floats.filter(f => {
      f.life -= this.dt; if (f.life <= 0) { f.el.remove(); return false; }
      this.placeFloat(f);
      return true;
    });
  }
  frame() {
    const now = performance.now(), dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.dt = dt;
    try { this.update(dt); this.updateVisuals(); } catch (e) { console.error(e); }
    this.renderer.render(this.scene, this.camera);
    this.drawClapMeter();
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = .1; this.cb.onHud(this.hud()); }
  }
  // the clap meter is drawn every frame straight into its DOM elements, so it reacts instantly
  drawClapMeter() {
    const ui = this.clapUI; if (!ui || !ui.fill) return;
    const c = this.clapper;
    ui.fill.style.transform = `scaleY(${c.level.toFixed(3)})`;
    if (ui.thr) ui.thr.style.bottom = `${(c.threshold * 100).toFixed(1)}%`;
    if (ui.root) ui.root.classList.toggle('flash', this.clapFlash > 0);
  }
  hud() {
    return {
      state: this.state, started: this.started, left: this.remaining(), burned: this.burned,
      timeLeft: Math.max(0, Math.ceil(this.roundTime - this.elapsed)), progress: this.started ? clamp(this.elapsed / this.roundTime, 0, 1) : 0,
      banner: this.banner ? { text: this.banner.text, color: this.banner.color, icon: this.banner.icon } : null,
      tutorial: this.tutorial ? { step: this.tutorial.step, t: this.tutorial.t } : null, jailed: this.bats.filter(b => b.state === 'caged').length, clapping: this.clapFlash > 0, mic: this.clapper.status, clapLeft: Math.max(0, CLAP_MAX - this.clapBoost), total: this.remaining() + this.burned,
      count: this.state === 'countdown' ? Math.max(1, Math.ceil(this.cdT)) : 0,
      awake: this.bats.filter(b => b.state === 'active' || b.state === 'caged' || b.state === 'carried').length,
      players: this.bats.filter(b => b.state !== 'sleep' || b.slot < 3 || this.padConnected(b.slot - 3)).map(b => ({ slot: b.slot, name: b.name, color: b.color, awake: b.state === 'active' || b.state === 'caged' || b.state === 'carried', out: b.state === 'out', lives: b.lives, carrying: !!b.carrying, napping: b.napT > 0, caged: b.state === 'caged' || b.state === 'carried', cageLeft: Math.max(0, Math.ceil(b.cageT)), echo: b.echoCd > 0 ? Math.ceil(b.echoCd) : 0, echoLocked: !!b.carrying })),
      backend: this.backend
    };
  }
}
