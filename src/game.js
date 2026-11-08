// =====================================================================
// Vampire Garlic Heist: the 3D game engine.
// three.js WebGPURenderer (falls back to WebGL 2 automatically; add ?webgl to force it).
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sound } from './audio.js';
import { t as tr, batName } from './i18n.js';
import {
  CASTLE_X, FURNACE, FLY_Y, GRAB_TIME, GRAB_R, MAXV, CARRY_V, ECHO_CD, ECHO_DUR, IDLE_SLEEP,
  LIGHT_R0, LIGHT_R1, NOTICE, LAMP_R, LAMP_SLOW, THIRD_WATCHMAN_AT, ROOF_COLORS, BAT_COLORS,
  STREET_W, PLAZA, STREETS, HOUSES, PATHS, LAMPS, TREES, GRAVEYARD, STALLS
} from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const START_GARLIC = 10, GARLIC_PER_EXTRA_BAT = 3, LIVES = 3;

export class Game {
  constructor(canvas, layer, cb) {
    this.canvas = canvas; this.layer = layer; this.cb = cb;
    this.sound = new Sound();
    this.state = 'menu'; this.time = 0; this.roundTime = 180;
    this.keys = new Set(); this.mouse = { x: 0, z: 0, last: -10, ndc: new THREE.Vector2() };
    this.prevPad = []; this.floats = []; this.parts = [];
    this.hudT = 0; this.endTimer = 0; this.banner = null; this.dt = 1 / 60;
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
    this.resetRound(); this.state = 'menu';
    this.resize(); window.addEventListener('resize', () => this.resize());
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
    await Promise.all(['bat', 'vampire'].map(async n => {
      try {
        const packed = window.VGH_MODEL_DATA && window.VGH_MODEL_DATA[n]; // optional: models embedded as base64 (web version)
        if (packed) { const bin = Uint8Array.from(atob(packed), ch => ch.charCodeAt(0)); this.models[n] = (await loader.parseAsync(bin.buffer, '')).scene; }
        else this.models[n] = (await loader.loadAsync(base + n + '.glb')).scene;
      }
      catch (e) { console.warn(`Could not load ${n}.glb, using the built-in model instead`, e); }
    }));
  }
  // clone a loaded model, give it toon materials, scale it to `size` along `axis`, centre it
  prepModel(src, { size, axis, recolor, feet }) {
    const m = src.clone(true), cache = new Map();
    m.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const old = o.material, key = old.name;
      if (!cache.has(key)) {
        const tinted = recolor && key === 'Material.005'; // the bat's body and wings take the player's colour
        const col = tinted ? new THREE.Color(recolor).multiplyScalar(.78) : old.color.clone();
        cache.set(key, new THREE.MeshToonMaterial({ color: col, emissive: col, emissiveIntensity: tinted ? .14 : .2 }));
      }
      o.material = cache.get(key);
    });
    const box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = size / (axis === 'y' ? sz.y : sz.x);
    m.position.set(-c.x, feet ? -box.min.y : -c.y, -c.z);
    const wrap = new THREE.Group(), inner = new THREE.Group();
    inner.add(m); inner.scale.setScalar(k); wrap.add(inner);
    return wrap;
  }
  build() {
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#0B0920');
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 200);
    this.camTarget = new THREE.Vector3(0, 0, -0.4);

    this.hemi = new THREE.HemisphereLight('#4a4aa0', '#1a1030', 1.1); s.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#a8b4ff', 1.2);
    sun.position.set(-8, 20, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 14, bottom: -14, near: 1, far: 60 });
    sun.shadow.bias = -0.0005; s.add(sun); s.add(sun.target);

    this.glowTex = this.makeGlowTexture();
    this.std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, ...o });

    this.buildGround();
    this.buildGarlicAssets();
    this.buildHouses();
    this.buildDecor();
    this.buildCastle();
    this.buildLamps();

    // garlic spots: one at every door, plus 3 hidden golden ones behind houses
    this.spots = this.houses.map(hh => this.makeSpot(hh.spot[0], hh.spot[1], false));
    for (let i = 0; i < 3; i++) this.spots.push(this.makeSpot(0, 0, true));

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
  glowDisc(color, opacity) {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, map: this.glowTex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  }
  buildGround() {
    const s = this.scene, std = this.std;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), std('#231E4A', { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    // grass tufts for texture
    const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(.06, .22, 4), std('#2E5A52', { roughness: 1 }), 420);
    const m = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < 2000 && k < 420; i++) {
      const x = rand(-15.8, CASTLE_X - .3), z = rand(-8.4, 8.4);
      if (this.onStreet(x, z, .5) || this.inHouse(x, z, .3)) continue;
      m.makeTranslation(x, .11, z); tuft.setMatrixAt(k++, m);
    }
    tuft.count = k; s.add(tuft);
    // streets
    const streetMat = std('#332D66', { roughness: 1 }), dashMat = new THREE.MeshBasicMaterial({ color: '#4A438A' });
    const dashGeo = new THREE.BoxGeometry(.5, .01, .07);
    STREETS.forEach(([x1, z1, x2, z2], i) => {
      const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
      const st = new THREE.Mesh(new THREE.BoxGeometry(len + STREET_W, .04, STREET_W), streetMat);
      st.position.set((x1 + x2) / 2, .02 + i * .0006, (z1 + z2) / 2); st.rotation.y = -ang; st.receiveShadow = true; s.add(st);
      for (let t = .8; t < len - .8; t += 1.1) {
        const px = lerp(x1, x2, t / len), pz = lerp(z1, z2, t / len);
        if (d2(px, pz, PLAZA.x, PLAZA.z) < PLAZA.r + .4) continue;
        const dm = new THREE.Mesh(dashGeo, dashMat); dm.position.set(px, .05, pz); dm.rotation.y = -ang; s.add(dm);
      }
    });
    // plaza with fountain
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(PLAZA.r, PLAZA.r, .06, 48), std('#3D3675', { roughness: .95 }));
    plaza.position.set(PLAZA.x, .04, PLAZA.z); plaza.receiveShadow = true; s.add(plaza);
    const rg = new THREE.RingGeometry(PLAZA.r - .25, PLAZA.r - .12, 48); rg.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#5A5296' })); ring.position.set(PLAZA.x, .08, PLAZA.z); s.add(ring);
    const stone = std('#6E5CB8', { roughness: .7 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.08, .45, 28), stone); basin.position.set(PLAZA.x, .25, PLAZA.z); basin.castShadow = basin.receiveShadow = true; s.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(.86, .86, .04, 28), std('#2C8FA3', { emissive: '#165a68', roughness: .2, metalness: .1 }));
    water.position.set(PLAZA.x, .46, PLAZA.z); s.add(water);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.11, .15, .85, 10), stone); pillar.position.set(PLAZA.x, .8, PLAZA.z); pillar.castShadow = true; s.add(pillar);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.42, .22, .16, 18), stone); bowl.position.set(PLAZA.x, 1.25, PLAZA.z); bowl.castShadow = true; s.add(bowl);
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
  inHouse(x, z, pad = 0) {
    return HOUSES.some(hh => Math.abs(x - hh.x) < (hh.f[0] ? hh.d : hh.w) / 2 + pad && Math.abs(z - hh.z) < (hh.f[0] ? hh.w : hh.d) / 2 + pad);
  }
  buildGarlicAssets() {
    const std = this.std;
    const prof = [[0, 0], [.12, .02], [.2, .08], [.24, .17], [.21, .27], [.14, .34], [.06, .4], [.035, .48], [0, .5]].map(([x, y]) => new THREE.Vector2(x, y));
    this.garlicGeo = new THREE.LatheGeometry(prof, 14);
    this.stemGeo = new THREE.ConeGeometry(.045, .18, 6); this.stemGeo.translate(0, .56, 0);
    this.garlicMat = std('#F6EEDC', { roughness: .5, emissive: '#6a5c44' });
    this.goldMat = std('#FFD84A', { roughness: .35, metalness: .2, emissive: '#8a6200' });
    this.stemMat = std('#B8C98A');
    this.goldStemMat = std('#E6B422', { emissive: '#6a4a00' });
  }
  buildHouses() {
    const s = this.scene, std = this.std;
    const wallMat = std('#EDE3CF'), winMat = new THREE.MeshBasicMaterial({ color: '#FFE59A' }), doorMat = std('#5B3A2E');
    this.houses = [];
    HOUSES.forEach((hd, idx) => {
      const { x, z, w, d, f } = hd;
      const H = hd.church ? 1.6 : hd.tall ? 1.75 : 1.1;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(f[0], f[1]);
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), hd.church ? std('#D9D0E8') : wallMat);
      walls.position.y = H / 2; walls.castShadow = walls.receiveShadow = true; g.add(walls);
      const shape = new THREE.Shape(); shape.moveTo(-d / 2 - .15, 0); shape.lineTo(d / 2 + .15, 0); shape.lineTo(0, hd.church ? 1.2 : .95); shape.closePath();
      const rgeo = new THREE.ExtrudeGeometry(shape, { depth: w + .25, bevelEnabled: false }); rgeo.translate(0, 0, -(w + .25) / 2);
      const roof = new THREE.Mesh(rgeo, std(hd.church ? '#5E4BB0' : ROOF_COLORS[idx % ROOF_COLORS.length], { roughness: .7 }));
      roof.rotation.y = Math.PI / 2; roof.position.y = H; roof.castShadow = true; g.add(roof);
      if (!hd.church) { const chim = new THREE.Mesh(new THREE.BoxGeometry(.3, .6, .3), std('#6E5A8E')); chim.position.set(w * .28 * (idx % 2 ? 1 : -1), H + .65, -.2); chim.castShadow = true; g.add(chim); }
      const fz = d / 2 + .01;
      const door = new THREE.Mesh(new THREE.BoxGeometry(hd.church ? .7 : .5, hd.church ? 1.0 : .75, .06), doorMat);
      door.position.set(hd.church ? .35 : 0, hd.church ? .5 : .375, fz); g.add(door);
      const rows = hd.tall ? [.68, 1.38] : hd.church ? [1.0] : [.68];
      rows.forEach(wy => [-1, 1].forEach(sx => { const wn = new THREE.Mesh(new THREE.PlaneGeometry(.42, .34), winMat); wn.position.set(sx * w * .3 + (hd.church ? .35 : 0), wy, fz + .02); g.add(wn); }));
      if (hd.church) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(.95, 3.3, .95), std('#CFC4E2')); tower.position.set(-w / 2 + .5, 1.65, d / 2 - .5); tower.castShadow = true; g.add(tower);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(.72, 1.5, 4), std('#5E4BB0')); spire.rotation.y = Math.PI / 4; spire.position.set(-w / 2 + .5, 4.05, d / 2 - .5); spire.castShadow = true; g.add(spire);
        const bell = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), std('#F5D66B', { metalness: .5, roughness: .3, emissive: '#5a4300' })); bell.position.set(-w / 2 + .5, 2.95, d / 2 - .02); g.add(bell);
        const rose = new THREE.Mesh(new THREE.CircleGeometry(.28, 16), new THREE.MeshBasicMaterial({ color: '#F5A8D8' })); rose.position.set(.35, 1.75, fz + .02); g.add(rose);
      }
      const glow = this.glowDisc('#FFC870', .3); glow.scale.setScalar(2.6); glow.position.set(0, .06, d / 2 + .9); g.add(glow);
      s.add(g);
      const off = d / 2 + .5, perp = [f[1], -f[0]];
      this.houses.push({ ...hd, spot: [x + f[0] * off, z + f[1] * off], back: [[x - f[0] * off + perp[0] * w * .3, z - f[1] * off + perp[1] * w * .3], [x - f[0] * off - perp[0] * w * .3, z - f[1] * off - perp[1] * w * .3]] });
    });
  }
  buildDecor() {
    const s = this.scene, std = this.std;
    // trees
    const trunkMat = std('#5B3A2E'), leafA = std('#2F6B5A', { emissive: '#0d2420' }), leafB = std('#3E8A6E', { emissive: '#0d2420' });
    TREES.forEach(([x, z], i) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, .8, 6), trunkMat); t.position.y = .4; t.castShadow = true; g.add(t);
      const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(.62, 1), i % 2 ? leafA : leafB); c1.position.y = 1.15; c1.castShadow = true; g.add(c1);
      const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.42, 1), i % 2 ? leafB : leafA); c2.position.set(.25, 1.55, .1); c2.castShadow = true; g.add(c2);
      s.add(g);
    });
    // graveyard
    const gy = GRAVEYARD;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(gy.w, .03, gy.d), std('#1A1638', { roughness: 1 })); patch.position.set(gy.x, .015, gy.z); patch.receiveShadow = true; s.add(patch);
    const fenceMat = std('#4A3F7A');
    const fence = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .35, d), fenceMat); m.position.set(x, .18, z); m.castShadow = true; s.add(m); };
    fence(gy.x, gy.z - gy.d / 2, gy.w, .06); fence(gy.x - gy.w / 2, gy.z, .06, gy.d); fence(gy.x + gy.w / 2, gy.z, .06, gy.d);
    fence(gy.x - gy.w / 2 + .6, gy.z + gy.d / 2, 1.2, .06); fence(gy.x + gy.w / 2 - .6, gy.z + gy.d / 2, 1.2, .06);
    const tombMat = std('#8E86A8', { roughness: .9 });
    [[-1.0, -.4], [-.2, -.5], [.7, -.35], [-.6, .45], [.35, .4]].forEach(([ox, oz], i) => {
      const tg = new THREE.Group(); tg.position.set(gy.x + ox, 0, gy.z + oz); tg.rotation.y = rand(-.2, .2); tg.rotation.z = rand(-.12, .12);
      if (i === 2) { const a = new THREE.Mesh(new THREE.BoxGeometry(.1, .7, .1), tombMat); a.position.y = .35; const b = new THREE.Mesh(new THREE.BoxGeometry(.4, .1, .1), tombMat); b.position.y = .5; tg.add(a); tg.add(b); }
      else { const b = new THREE.Mesh(new THREE.BoxGeometry(.38, .42, .12), tombMat); b.position.y = .21; const top = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .12, 12, 1, false, 0, Math.PI), tombMat); top.rotation.set(Math.PI / 2, 0, Math.PI / 2); top.position.y = .42; tg.add(b); tg.add(top); }
      tg.traverse(o => { if (o.isMesh) o.castShadow = true; }); s.add(tg);
    });
    const deadMat = std('#3A2B40');
    const dt = new THREE.Group(); dt.position.set(gy.x + 1.15, 0, gy.z + .2);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.06, .1, 1.3, 6), deadMat); trunk.position.y = .65; dt.add(trunk);
    [[.5, 1.0, .7], [-.6, 1.15, -.6], [.3, 1.3, -.3]].forEach(([rz, y, ry]) => { const br = new THREE.Mesh(new THREE.CylinderGeometry(.025, .04, .6, 5), deadMat); br.position.set(Math.sin(rz) * .25, y, 0); br.rotation.set(0, ry, rz); dt.add(br); });
    dt.traverse(o => { if (o.isMesh) o.castShadow = true; }); s.add(dt);
    // market stalls on the plaza
    STALLS.forEach(st => {
      const g = new THREE.Group(); g.position.set(st.x, 0, st.z);
      const postMat = std('#5B3A2E');
      [[-.45, -.35], [.45, -.35], [-.45, .35], [.45, .35]].forEach(([px, pz]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.0, 5), postMat); p.position.set(px, .5, pz); g.add(p); });
      const table = new THREE.Mesh(new THREE.BoxGeometry(.9, .08, .6), postMat); table.position.y = .45; g.add(table);
      for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(.25, .08, .82), std(i % 2 ? '#F6EEDC' : st.color)); c.position.set(-.375 + i * .25, 1.04, 0); c.castShadow = true; g.add(c); }
      [-.25, 0, .25].forEach(px => { const pk = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), std('#F4A45F')); pk.position.set(px, .54, .05); g.add(pk); });
      s.add(g);
    });
  }
  buildCastle() {
    const s = this.scene, std = this.std;
    const stone = std('#2C2560', { roughness: .95 }), wall = std('#4B3A9A', { roughness: .8 }), roofM = std('#7B66CC', { roughness: .6, emissive: '#1a1240' });
    const base = new THREE.Mesh(new THREE.BoxGeometry(16 - CASTLE_X + .5, .14, 17), stone); base.position.set((16 + CASTLE_X) / 2, .07, 0); base.receiveShadow = true; s.add(base);
    const wallBox = (x, z, w, d, hgt = 1.4) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), wall); m.position.set(x, hgt / 2, z); m.castShadow = m.receiveShadow = true; s.add(m);
      const n = Math.floor(Math.max(w, d) / .6);
      for (let i = 0; i < n; i += 2) { const cr = new THREE.Mesh(new THREE.BoxGeometry(w > d ? .3 : w, .3, w > d ? d : .3), wall); cr.position.set(w > d ? x - w / 2 + .3 + i * .6 : x, hgt + .15, w > d ? z : z - d / 2 + .3 + i * .6); cr.castShadow = true; s.add(cr); }
    };
    wallBox(13.25, -8.1, 5.5, .5); wallBox(13.25, 8.1, 5.5, .5); wallBox(15.75, 0, .5, 16.7);
    wallBox(10.75, -5.25, .5, 6.1); wallBox(10.75, 5.25, .5, 6.1);
    [[10.9, -8.1, .85, 2.6], [15.6, -8.1, .85, 2.6], [10.9, 8.1, .85, 2.6], [15.6, 8.1, .85, 2.6], [10.75, -2.4, .55, 2.0], [10.75, 2.4, .55, 2.0]].forEach(([x, z, r, hgt]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, hgt, 16), wall); t.position.set(x, hgt / 2, z); t.castShadow = true; s.add(t);
      const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, r * 1.7, 16), roofM); c.position.set(x, hgt + r * .85, z); c.castShadow = true; s.add(c);
      const wn = new THREE.Mesh(new THREE.PlaneGeometry(r * .4, r * .5), new THREE.MeshBasicMaterial({ color: '#FFD36B' })); wn.position.set(x, hgt * .62, z + r + .01); s.add(wn);
    });
    const f = FURNACE;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(f.r + .25, f.r + .4, .7, 24), std('#3A2B5E')); ring.position.set(f.x, .35, f.z); ring.castShadow = ring.receiveShadow = true; s.add(ring);
    const fire = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r, .05, 24), new THREE.MeshBasicMaterial({ color: '#FF8A3D' })); fire.position.set(f.x, .73, f.z); s.add(fire);
    this.furnaceGlow = this.glowDisc('#FF9A4A', .8); this.furnaceGlow.scale.setScalar(8); this.furnaceGlow.position.set(f.x, .16, f.z); s.add(this.furnaceGlow);
    this.furnaceLight = new THREE.PointLight('#FF9A4A', 40, 14, 2); this.furnaceLight.position.set(f.x, 2, f.z); s.add(this.furnaceLight);
    this.flames = [];
    const fg = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: i % 2 ? '#FF8A3D' : '#FFD66B', transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.add(m); this.flames.push({ m, a: i / 14 * Math.PI * 2, ph: Math.random() * 6 });
    }
  }
  buildLamps() {
    const s = this.scene, std = this.std, postMat = std('#2A2148', { roughness: .6 });
    const rg = new THREE.RingGeometry(.95, 1, 40); rg.rotateX(-Math.PI / 2);
    this.lamps = LAMPS.map(L => {
      const px = L.x + .85, pz = L.z + .85;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 2.5, 8), postMat); post.position.set(px, 1.25, pz); post.castShadow = true; s.add(post);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, 1.2), postMat); arm.position.set(px - .42, 2.45, pz - .42); arm.rotation.y = Math.PI / 4; s.add(arm);
      const headMat = new THREE.MeshBasicMaterial({ color: '#FFE9A8' });
      const head = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, .26, 8), headMat); head.position.set(L.x, 2.35, L.z); s.add(head);
      const pool = this.glowDisc('#FFE9A8', .7); pool.scale.setScalar(LAMP_R * 2.3); pool.position.set(L.x, .075, L.z); s.add(pool);
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#FFE9A8', transparent: true, opacity: .55, depthWrite: false })); ring.scale.setScalar(LAMP_R); ring.position.set(L.x, .085, L.z); s.add(ring);
      const light = new THREE.PointLight('#FFE3A0', 10, 6, 2); light.position.set(L.x, 2.1, L.z); s.add(light);
      return { x: L.x, z: L.z, offset: L.offset, onDur: L.on, offDur: L.off, head, headMat, pool, ring, light, onNow: false, warn: false };
    });
  }
  makeGarlic(gold) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(this.garlicGeo, gold ? this.goldMat : this.garlicMat); b.castShadow = true; g.add(b);
    g.add(new THREE.Mesh(this.stemGeo, gold ? this.goldStemMat : this.stemMat));
    return g;
  }
  makeSpot(x, z, golden) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(1.45);
    const offs = [[0, 0], [-.34, .12], [.34, .12], [0, .3], [-.2, -.25], [.2, -.25]];
    const bulbs = offs.map(([ox, oz]) => { const m = this.makeGarlic(golden); m.position.set(ox, 0, oz); group.add(m); return m; });
    let glow = null;
    if (golden) { glow = this.glowDisc('#FFD84A', .9); glow.scale.setScalar(2.2); glow.position.y = .08; group.add(glow); }
    this.scene.add(group);
    return { x, z, count: 1, golden, revealT: 0, group, bulbs, glow };
  }
  makeWatchman(path) {
    const std = this.std, g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.34, .6, 4, 10), std('#2F7F86')); body.position.y = .68; body.castShadow = true; g.add(body);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .1, 14), std('#163A40')); belt.position.y = .62; g.add(belt);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 14, 10), std('#F2C7A5')); head.position.y = 1.32; head.castShadow = true; g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .2, 14), std('#1E4E55')); cap.position.y = 1.55; g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(.34, .04, .22), std('#163A40')); brim.position.set(0, 1.47, -.28); g.add(brim);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.3, .05, .05), std('#3A2418')); brow.position.set(0, 1.38, -.25); g.add(brow);
    const tache = new THREE.Mesh(new THREE.BoxGeometry(.26, .06, .06), std('#3A2418')); tache.position.set(0, 1.24, -.26); g.add(tache);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFE08A' })); lantern.position.set(.42, .95, -.25); g.add(lantern);
    const light = new THREE.PointLight('#FFD27A', 14, 7, 2); light.position.copy(lantern.position); g.add(light);
    this.scene.add(g);
    const pool = this.glowDisc('#FFD98A', .75); pool.position.y = .1; this.scene.add(pool);
    const rg = new THREE.RingGeometry(.95, 1, 48); rg.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#FFE08A', transparent: true, opacity: .7, depthWrite: false })); ring.position.y = .11; this.scene.add(ring);
    return { path, g, pool, ring, light, x: path[0][0], z: path[0][1], seg: 1, mode: 'patrol', pause: 0, chaseT: 0, chaseBat: null, inv: null, angle: 0, alertT: 0, active: false };
  }
  makeCat() {
    const std = this.std, g = new THREE.Group(), fur = std('#F4A45F'), dark = std('#B5652F');
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .4, 4, 8), fur); body.rotation.x = Math.PI / 2; body.position.y = .25; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), fur); head.position.set(0, .4, -.32); g.add(head);
    [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.ConeGeometry(.06, .13, 4), dark); e.position.set(sx * .08, .55, -.32); g.add(e); });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, .45, 6), dark); tail.position.set(0, .45, .38); tail.rotation.x = -.6; g.add(tail);
    [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshBasicMaterial({ color: '#9FE0C9' })); e.position.set(sx * .06, .43, -.46); g.add(e); });
    g.scale.setScalar(1.3); this.scene.add(g);
    return { g, tail, x: -13, z: -4.8, tx: -13, tz: -4.8, pause: 1, cd: 0, angle: 0 };
  }
  makeBat(slot, color) {
    const std = this.std, g = new THREE.Group();
    let wingR, wingL, eyes = null;
    if (this.models.bat) {
      const model = this.prepModel(this.models.bat, { size: 1.9, axis: 'x', recolor: color });
      model.rotation.y = Math.PI; // the model looks along +z, game bats fly towards -z
      g.add(model);
      wingR = model.getObjectByName('bat_wing_R'); wingL = model.getObjectByName('bat_wing_L');
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
    const ringGeo = new THREE.RingGeometry(.3, .42, 32); ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, depthWrite: false })); ring.position.y = .12;
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
    const bRing = new THREE.Mesh(bRingGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false })); bRing.position.y = .14;
    const bGlow = this.glowDisc(color, .8); bGlow.scale.setScalar(2.6); bGlow.position.y = .13;
    const beacon = new THREE.Group(); beacon.add(arrow); beacon.add(bRing); beacon.add(bGlow); beacon.visible = false; this.scene.add(beacon);
    const tag = document.createElement('div'); tag.className = 'tag';
    tag.innerHTML = `<span class="nm" style="color:${color}"></span><span class="hearts" aria-label="lives"><i>♥</i><i>♥</i><i>♥</i></span><span class="echo"><i></i><em>Echo</em></span><span class="grab" hidden></span>`;
    this.layer.appendChild(tag);
    const roof = slot < 3 ? { x: 11.9 + slot * 1.35, z: -8.1 } : { x: 11.9 + (slot - 3) * .95, z: 8.1 };
    return { slot, color, get name() { return batName(slot); }, state: 'sleep', x: roof.x, z: roof.z, vx: 0, vz: 0, roof, yaw: 0,
      carrying: null, grabT: 0, grabSpot: null, stunT: 0, invulnT: 0, echo: null, echoCd: 0, idleT: 0, wakeT: 0, pulseT: 0, lives: LIVES,
      g, wingL, wingR, eyes, ring, carry, carryGold, beacon, arrow, bRing, bGlow, waves, inLamp: false, tag,
      tagNm: tag.querySelector('.nm'), tagHearts: [...tag.querySelectorAll('.hearts i')], tagEcho: tag.querySelector('.echo'), tagEchoTxt: tag.querySelector('.echo em'),
      tagGrab: tag.querySelector('.grab'), tagCache: {} };
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
    const dist = Math.max(17.2 / Math.tan(hf / 2), 10.2 * Math.sin(tilt) / Math.tan(vf / 2)) * 1.02;
    cam.position.set(this.camTarget.x, Math.sin(tilt) * dist, this.camTarget.z + Math.cos(tilt) * dist);
    cam.lookAt(this.camTarget); cam.updateProjectionMatrix();
    this.vw = w; this.vh = h;
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
      if (e.button === 2) { this.tryEcho(this.bats[0]); return; }
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
      if ('wasd'.includes(kl) && kl.length === 1 && this.bats[1].state === 'sleep') this.wake(this.bats[1]);
      if (k.startsWith('Arrow') && this.bats[2].state === 'sleep') this.wake(this.bats[2]);
      if (k === ' ') this.tryEcho(this.bats[0]);
      if (kl === 'e') this.tryEcho(this.bats[1]);
      if (k === 'Enter') this.tryEcho(this.bats[2]);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', e => { if (this.state === 'play') this.showBanner(tr('padConnected', { n: e.gamepad.index + 1 }), 3, '#9FE0C9'); });
  }
  readPads() {
    let pads = [];
    try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch (e) { pads = []; }
    const out = [];
    for (let i = 0; i < 4; i++) {
      const gp = pads[i];
      if (!gp) { out.push(null); this.prevPad[i] = []; continue; }
      const pressed = gp.buttons.map(b => b.pressed), prev = this.prevPad[i] || [];
      const edges = pressed.map((p, j) => p && !prev[j]); this.prevPad[i] = pressed;
      let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.hypot(ax, ay) < .2 && gp.axes.length > 3) { ax = gp.axes[2] || 0; ay = gp.axes[3] || 0; }
      if (pressed[12]) ay = -1; if (pressed[13]) ay = 1; if (pressed[14]) ax = -1; if (pressed[15]) ax = 1;
      const m = Math.hypot(ax, ay); if (m < .2) { ax = 0; ay = 0; } else if (m > 1) { ax /= m; ay /= m; }
      out.push({ ax, ay, edges, any: edges.some(Boolean) });
    }
    return out;
  }
  padConnected(i) { try { return !!(navigator.getGamepads && navigator.getGamepads()[i]); } catch (e) { return false; } }
  rumble(b, dur, weak, strong) {
    if (b.slot < 3) return;
    try {
      const gp = navigator.getGamepads ? navigator.getGamepads()[b.slot - 3] : null, a = gp && gp.vibrationActuator;
      if (a && a.playEffect) a.playEffect('dual-rumble', { duration: dur * 1000, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
    } catch (e) { /* rumble not available */ }
  }

  // =================================================================
  // round flow
  // =================================================================
  start() {
    this.sound.init(); this.sound.music = true; this.sound.step = 0; this.sound.next = this.sound.now() + .1;
    this.resetRound(); this.state = 'play';
    this.showBanner(tr('wakeToBegin'), 999);
    this.cb.onScreen('play');
  }
  toMenu() {
    this.sound.music = false; this.resetRound(); this.state = 'menu'; this.banner = null;
    this.cb.onScreen('menu');
  }
  resetRound() {
    Object.assign(this, { outEnd: false, burned: 0, goldenFound: 0, caught: 0, dusted: 0, maxActive: 0, elapsed: 0, started: false, roosterDone: false, shiftDone: false, cdT: 0, bossT: 0, endTimer: 0 });
    this.banner = null;
    this.floats.forEach(f => f.el.remove()); this.floats = []; this.parts = [];
    this.flyers.forEach(f => { f.active = false; f.g.visible = f.gold.visible = false; });
    const normal = this.spots.filter(s => !s.golden);
    normal.forEach(s => { s.count = 0; s.revealT = 0; });
    shuffle(normal.slice()).slice(0, START_GARLIC).forEach(s => { s.count = 1; });
    const slots = shuffle(this.houses.map(hh => hh.back[Math.random() < .5 ? 0 : 1]).filter(([x, z]) => !this.onStreet(x, z, .2) && !this.inHouse(x, z, .1) && Math.abs(z) < 8.2)).slice(0, 3);
    this.spots.filter(s => s.golden).forEach((s, i) => { const sl = slots[i] || [-14, -8]; s.x = sl[0]; s.z = sl[1]; s.group.position.set(s.x, 0, s.z); s.count = 1; s.revealT = 0; });
    this.watchmen.forEach((w, i) => Object.assign(w, { x: w.path[0][0], z: w.path[0][1], seg: 1, mode: 'patrol', pause: i * .8, chaseT: 0, chaseBat: null, inv: null, alertT: 0, active: i < 2 }));
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
  showBanner(text, dur = 3, color = '#F6F1E7') { this.banner = { text, t: dur, color }; }
  addFloat(x, y, z, text, color = '#F6F1E7', size = 26, life = 1.3) {
    const el = document.createElement('div'); el.className = 'float'; el.textContent = text; el.style.color = color; el.style.fontSize = size + 'px';
    this.layer.appendChild(el); this.floats.push({ el, x, y, z, life, max: life });
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
    Object.assign(b, { state: 'active', wakeT: .8, idleT: 0, x: b.roof.x, z: b.roof.z + (b.roof.z < 0 ? 1 : -1), vx: 0, vz: 0, echoCd: 0, stunT: 0, invulnT: 0, inLamp: false });
    this.addFloat(b.x, FLY_Y + .8, b.z, tr('yawn'), b.color, 22);
    this.burst(b.x, FLY_Y, b.z, 14, [b.color, '#F6F1E7'], 3);
    this.sound.play('yawn'); this.rumble(b, .25, .4, .2);
    if (!this.started) { this.started = true; this.showBanner(tr('stealBefore'), 2.5); }
    const n = this.activeBats().length;
    if (n > this.maxActive) { if (n >= 2) this.moreGarlic(GARLIC_PER_EXTRA_BAT); this.maxActive = n; }
  }
  moreGarlic(n) {
    const normal = this.spots.filter(s => !s.golden);
    const empty = shuffle(normal.filter(s => s.count === 0)), full = shuffle(normal.filter(s => s.count > 0));
    empty.concat(full).slice(0, n).forEach(s => { s.count++; this.burst(s.x, .5, s.z, 10, ['#F5D66B', '#F6F1E7'], 2.5); });
    this.showBanner(tr('moreGarlic', { n }), 2.5, '#F5D66B'); this.sound.play('more');
  }
  sleepBat(b, silent) {
    if (b.carrying) { this.flyBack(b.carrying, b.x, b.z, 1); b.carrying = null; }
    Object.assign(b, { state: 'sleep', x: b.roof.x, z: b.roof.z, vx: 0, vz: 0, grabT: 0, grabSpot: null, echo: null, stunT: 0 });
    if (!silent) this.addFloat(b.x, 2.4, b.z, 'zzz', '#DCD3F5', 20);
  }
  tryEcho(b) {
    if (this.state !== 'play' || b.state !== 'active' || b.wakeT > 0 || b.echoCd > 0) return;
    let best = null, bd = 1e9;
    this.spots.forEach(s => { if (s.count <= 0) return; const d = d2(s.x, s.z, b.x, b.z); if (d < bd) { bd = d; best = s; } });
    b.echo = { t: 0, spot: best }; b.echoCd = ECHO_CD; b.idleT = 0;
    if (best && best.golden) best.revealT = Math.max(best.revealT, ECHO_DUR + 3);
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
  caughtBat(b, src, word) {
    if (b.carrying) { this.flyBack(b.carrying, b.x, b.z, 1); b.carrying = null; } // the bulb goes back where it came from
    b.lives--; b.stunT = 1.2; b.invulnT = 2.5; b.grabT = 0; b.grabSpot = null; this.caught++;
    const ax = b.x - src.x, az = b.z - src.z, am = Math.hypot(ax, az) || 1;
    b.vx = ax / am * 9; b.vz = az / am * 9;
    this.addFloat(src.x, 2.8, src.z, word, '#F07A6A', 32);
    this.burst(b.x, FLY_Y, b.z, 16, ['#F07A6A', '#FFE08A'], 4);
    this.sound.play('alarm'); this.rumble(b, .4, .8, 1);
    if (b.lives > 0) { this.addFloat(b.x, FLY_Y + 1.2, b.z, tr('lifeLost', { n: b.lives }), '#F07A6A', 22, 1.6); return; }
    // out of lives: the bat is out for the rest of the night
    this.addFloat(b.x, FLY_Y + 1.2, b.z, tr('isOut', { name: b.name }), '#F07A6A', 26, 2);
    this.burst(b.x, FLY_Y, b.z, 30, ['#BDB6CF', '#8E86A8', b.color], 3.5, 1.1, 1.4, 1.5);
    this.sound.play('puff'); this.rumble(b, .6, 1, 1);
    this.sleepBat(b, true); b.state = 'out';
  }

  // =================================================================
  // simulation step
  // =================================================================
  update(dt) {
    this.time += dt;
    const pads = this.readPads();
    if (this.state === 'menu' && pads.some(p => p && p.any)) { this.start(); return; }
    if (this.state === 'end') { this.endTimer += dt; if (this.endTimer > 1.2 && pads.some(p => p && p.any)) { this.start(); return; } }
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= .94; p.vy = p.vy * .94 - 2 * dt; p.vz *= .94; p.life -= dt; });
    this.parts = this.parts.filter(p => p.life > 0);
    this.updateLamps();
    // fountain droplets
    this.fountainT -= dt; if (this.fountainT <= 0) { this.fountainT = .12; this.burst(PLAZA.x, 1.35, PLAZA.z, 2, ['#9FE6F2', '#5FD3E6'], 1.2, .9, .6, 2.5); }
    if (this.state === 'menu' || this.state === 'end') { this.updateWatchmen(dt, 0, true); this.updateCat(dt, true); return; }

    const p = this.started ? clamp(this.elapsed / this.roundTime, 0, 1) : 0;
    this.sound.tempo = p;
    const R = this.lightR = lerp(LIGHT_R0, LIGHT_R1, p);

    if (this.state === 'play') pads.forEach((pd, i) => {
      if (!pd) return; const b = this.bats[3 + i];
      if (b.state === 'sleep' && pd.any) this.wake(b);
      else if (b.state === 'active' && pd.edges.slice(0, 4).some(Boolean)) this.tryEcho(b);
    });

    // the night shift: a third watchman
    const w3 = this.watchmen[2];
    if (!w3.active && this.started && (this.activeBats().length >= 3 || p >= THIRD_WATCHMAN_AT)) {
      Object.assign(w3, { active: true, x: w3.path[0][0], z: w3.path[0][1], seg: 1, mode: 'patrol' });
      if (!this.shiftDone) { this.shiftDone = true; this.showBanner(tr('nightShift'), 3, '#F07A6A'); this.sound.play('alarm'); }
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
      if (wasCooling && b.echoCd <= 0 && this.state === 'play') { this.addFloat(b.x, FLY_Y + 1.1, b.z, tr('echoReady'), '#7FD6E0', 18, 1); this.sound.play('ready'); this.rumble(b, .08, .3, 0); } b.stunT = Math.max(0, b.stunT - dt); b.invulnT = Math.max(0, b.invulnT - dt);
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
          dvx = pd.ax * vmax; dvz = pd.ay * vmax; input = Math.hypot(pd.ax, pd.ay) > .2 || pd.any;
        }
      }
      if (b.stunT > 0) { dvx = 0; dvz = 0; }
      const k = Math.min(1, dt * 8);
      b.vx += (dvx - b.vx) * k; b.vz += (dvz - b.vz) * k;
      b.x = clamp(b.x + b.vx * dt, -15.6, 15.6); b.z = clamp(b.z + b.vz * dt, -8.1, 8.1);
      b.idleT = input ? 0 : b.idleT + dt;
      if (b.idleT > IDLE_SLEEP && this.state === 'play') { this.sleepBat(b); return; }
      if (this.state !== 'play' || !this.started) return;

      // watchmen: notice, chase, catch
      let lit = null, near = false;
      this.watchmen.forEach(w => {
        if (!w.active) return;
        const d = d2(b.x, b.z, w.x, w.z);
        if (d < R) lit = w;
        else if (d < R * NOTICE) {
          near = true;
          if (b.carrying && b.invulnT <= 0 && w.mode !== 'chase' && w.alertT <= 0) {
            w.mode = 'chase'; w.chaseBat = b; w.chaseT = 2.4; w.pause = 0;
            this.addFloat(w.x, 2.3, w.z, tr('hey'), '#F07A6A', 26); this.sound.play('hey');
          }
        } else if (d < R + 2.6) near = true;
      });
      // street lamps
      // street lamps don't catch you, their light just slows you down
      const lamp = this.lamps.some(L => L.onNow && d2(b.x, b.z, L.x, L.z) < LAMP_R);
      if (lamp && !b.inLamp) { this.addFloat(b.x, FLY_Y + 1, b.z, tr('slow'), '#FFE9A8', 20, 1); this.rumble(b, .2, .5, 0); }
      b.inLamp = lamp;
      if (lamp && Math.random() < dt * 12) this.burst(b.x, FLY_Y, b.z, 1, ['#FFE9A8'], .6, .6, .7);
      if (lit || near) { b.pulseT -= dt; if (b.pulseT <= 0) { b.pulseT = .75; this.rumble(b, .09, .25, .35); } }
      // watchmen only catch a bat that is carrying garlic
      if (lit && b.carrying && b.stunT <= 0 && b.invulnT <= 0) {
        this.caughtBat(b, lit, tr('thief')); lit.alertT = 1.6; lit.pause = 1.2; lit.mode = 'return'; lit.chaseBat = null;
        if (b.state !== 'active') return;
      }
      if (lit) { b.grabT = 0; b.grabSpot = null; }
      // grab garlic
      if (!b.carrying && b.stunT <= 0 && !lit) {
        let best = null, bd = GRAB_R;
        this.spots.forEach(s => { if (s.count <= 0 || (s.golden && s.revealT <= 0)) return; const d = d2(b.x, b.z, s.x, s.z); if (d < bd) { bd = d; best = s; } });
        if (best && best === b.grabSpot) {
          b.grabT += dt; if (best.golden) best.revealT = Math.max(best.revealT, .6);
          if (b.grabT >= GRAB_TIME) {
            best.count--; b.carrying = best; b.grabT = 0; b.grabSpot = null;
            this.addFloat(b.x, FLY_Y + .9, b.z, tr('yuck'), '#9FE0C9', 28); this.sound.play('yuck'); this.rumble(b, .15, .35, .6);
          }
        } else { b.grabSpot = best; b.grabT = 0; }
      }
      // burn it
      if (b.carrying && d2(b.x, b.z, FURNACE.x, FURNACE.z) < FURNACE.r + .35) {
        const g = b.carrying.golden; b.carrying = null; this.burned++; if (g) this.goldenFound++;
        this.addFloat(FURNACE.x, 3, FURNACE.z, g ? tr('golden') : tr('whoosh'), g ? '#FFD84A' : '#F5D66B', 30);
        this.burst(FURNACE.x, 1, FURNACE.z, 30, ['#F5D66B', '#F4B183', '#F07A6A', '#FFF3B0'], 5, 1, 1.4, 4);
        this.sound.play('whoosh'); this.rumble(b, .25, .6, .6);
      }
    });

    if (this.state === 'play' && this.started) {
      this.elapsed += dt;
      const pp = this.elapsed / this.roundTime;
      if (pp >= .86 && !this.roosterDone) { this.roosterDone = true; this.sound.play('rooster'); this.showBanner(tr('rooster'), 4, '#F4B183'); }
      if (this.remaining() === 0) { this.state = 'countdown'; this.cdT = 3; this.lastCd = 4; this.showBanner(tr('allGone'), 3, '#F5D66B'); }
      else if (pp >= 1) this.sunUp();
      else if (this.activeBats().length === 0 && this.bats.some(b => b.state === 'out')) { // the last bat in the air got caught
        this.state = 'sunup'; this.cdT = 2; this.outEnd = true; this.showBanner(tr('allCaught'), 2, '#F07A6A');
      }
    } else if (this.state === 'countdown') {
      this.cdT -= dt; const sc = Math.ceil(this.cdT);
      if (sc < this.lastCd && sc > 0) { this.lastCd = sc; this.sound.play('tick'); }
      if (this.cdT <= 0) { this.state = 'boss'; this.bossT = 0; this.banner = null; this.sound.play('mwahaha'); this.addFloat(6, 5, 0, tr('mwahaha'), '#F5D66B', 64, 3.4); }
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
        if (!b || b.state !== 'active' || !b.carrying || b.invulnT > 0 || w.chaseT <= 0) { w.mode = 'return'; w.chaseBat = null; w.pause = .6; return; }
      }
      let tx, tz, sp;
      const base = idle ? 1.2 : 1.5 + .9 * p;
      if (w.mode === 'chase') { tx = w.chaseBat.x; tz = w.chaseBat.z; sp = 3.3 + .7 * p; }
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
        for (let i = 0; i < 20; i++) { const x = rand(-15, 9.5), z = rand(-7.8, 7.8); if (this.onStreet(x, z)) { c.tx = x; c.tz = z; break; } }
      } else { const sp = 1.3; c.x += dx / d * Math.min(d, sp * dt); c.z += dz / d * Math.min(d, sp * dt); c.angle = Math.atan2(-dx, -dz); }
    }
    if (idle || this.state !== 'play' || c.cd > 0) return;
    for (const b of this.bats) {
      if (b.state !== 'active') continue;
      if (d2(b.x, b.z, c.x, c.z) < (b.carrying ? 2.2 : 1.3)) {
        c.cd = 7; c.pause = 1.5;
        this.addFloat(c.x, 1.3, c.z, tr('meow'), '#F4B183', 24); this.sound.play('meow');
        const w = this.nearestWatchman(c.x, c.z);
        if (w) { w.mode = 'investigate'; w.inv = { x: c.x, z: c.z }; w.pause = 0; this.addFloat(w.x, 2.3, w.z, '?', '#F07A6A', 34); }
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
    this.showBanner(any ? tr('sunPoof') : tr('sunSafe'), 2.4, '#F4B183');
  }

  // =================================================================
  // per-frame visuals
  // =================================================================
  updateVisuals() {
    const t = this.time, p = this.started ? clamp(this.elapsed / this.roundTime, 0, 1) : 0;
    const R = this.lightR || LIGHT_R0;
    this.scene.background.set('#0B0920').lerp(new THREE.Color('#E8956A'), p * p);
    this.hemi.color.set('#4a4aa0').lerp(new THREE.Color('#FFD2A8'), p);
    this.hemi.groundColor.set('#1a1030').lerp(new THREE.Color('#6A4A50'), p);
    this.hemi.intensity = lerp(1.1, 2.0, p);
    this.sun.color.set('#a8b4ff').lerp(new THREE.Color('#FFB070'), p);
    this.sun.intensity = lerp(1.2, 3.2, p * p);
    this.sun.position.set(lerp(-8, 22, p), lerp(20, 9, p), lerp(6, 4, p));

    const fl = 1 + Math.sin(t * 9) * .06 + Math.sin(t * 23) * .04;
    this.furnaceLight.intensity = 40 * fl; this.furnaceGlow.scale.setScalar(8 * fl);
    this.flames.forEach((f, i) => {
      const a = f.a + t * .9, r = .55 + Math.sin(t * 5 + f.ph) * .25, life = (t * 1.4 + f.ph) % 1;
      f.m.position.set(FURNACE.x + Math.cos(a) * r, .8 + life * 1.3, FURNACE.z + Math.sin(a) * r);
      f.m.scale.setScalar((.38 + Math.sin(t * 11 + i) * .08) * (1 - life * .7));
    });

    // street lamps
    this.lamps.forEach(L => {
      const blink = L.warn && Math.floor(t * 8) % 2 === 0;
      const on = L.onNow;
      L.pool.visible = on || blink; L.ring.visible = on || L.warn;
      L.pool.material.opacity = on ? .7 : .25; L.ring.material.opacity = on ? .6 : .3;
      L.headMat.color.set(on ? '#FFE9A8' : blink ? '#B8A46A' : '#4A4370');
      L.light.intensity = on ? 10 : blink ? 3 : 0;
    });

    this.spots.forEach(s => {
      const vis = !s.golden || s.revealT > 0, n = Math.min(s.count, s.bulbs.length);
      s.bulbs.forEach((m, i) => { m.visible = vis && i < n; });
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
      w.g.position.set(w.x, w.pause <= 0 ? Math.abs(Math.sin(t * 8)) * .06 : 0, w.z); w.g.rotation.y = w.angle;
      const fl2 = 1 + Math.sin(t * 13 + w.x) * .03;
      w.pool.position.set(w.x, .1, w.z); w.pool.scale.setScalar(R * 2.25 * fl2);
      w.ring.position.set(w.x, .11, w.z); w.ring.scale.setScalar(R);
      const hot = w.alertT > 0 || w.mode === 'chase';
      w.ring.material.color.set(hot ? '#FF5A4A' : w.mode === 'investigate' ? '#F4B183' : '#FFE08A');
      w.pool.material.color.set(hot ? '#FF9A7A' : '#FFD98A');
      w.light.intensity = 14 * fl2;
    });
    const c = this.cat; c.g.position.set(c.x, c.pause > 0 ? 0 : Math.abs(Math.sin(t * 10)) * .04, c.z); c.g.rotation.y = c.angle || 0; c.tail.rotation.z = Math.sin(t * 3) * .5;

    this.bats.forEach(b => {
      const show = (b.state === 'active' || b.slot < 3 || this.padConnected(b.slot - 3)) && this.state !== 'menu';
      b.g.visible = show; b.ring.visible = show && b.state === 'active';
      if (!show) { b.tag.hidden = true; b.beacon.visible = false; b.waves.forEach(w => { w.visible = false; }); return; }
      const sleeping = b.state !== 'active';
      if (sleeping) {
        b.g.position.set(b.roof.x, 1.78 + Math.sin(t * 2 + b.slot) * .03, b.roof.z); b.g.rotation.set(0, b.roof.z < 0 ? Math.PI : 0, 0);
        b.wingR.rotation.z = -1.25; b.wingL.rotation.z = 1.25; if (b.eyes) b.eyes.visible = false;
      } else {
        if (Math.hypot(b.vx, b.vz) > .4) b.yaw = Math.atan2(-b.vx, -b.vz);
        b.g.position.set(b.x, FLY_Y + Math.sin(t * 3 + b.slot) * .12, b.z);
        b.g.rotation.set(0, b.yaw, 0);
        const flap = Math.sin(t * (b.carrying ? 20 : 15) + b.slot) * .75;
        b.wingR.rotation.z = flap; b.wingL.rotation.z = -flap; if (b.eyes) b.eyes.visible = true;
        b.ring.position.set(b.x, .12, b.z); b.ring.material.opacity = b.stunT > 0 ? .3 : .85;
        b.g.visible = !(b.stunT > 0 && Math.floor(t * 12) % 2);
      }
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
      const ready = b.echoCd <= 0 && b.wakeT <= 0, echoTxt = sleeping ? '' : ready ? tr('tagEchoReady') : tr('tagEcho', { n: Math.ceil(b.echoCd) });
      if (cache.echo !== echoTxt) { cache.echo = echoTxt; b.tagEcho.hidden = sleeping; b.tagEchoTxt.textContent = echoTxt; b.tagEcho.classList.toggle('ready', ready); }
      if (!ready && !sleeping) b.tagEcho.style.setProperty('--p', (1 - b.echoCd / ECHO_CD).toFixed(3));
      const gp = b.grabT > 0 ? b.grabT / GRAB_TIME : 0;
      b.tagGrab.hidden = gp <= 0; if (gp > 0) b.tagGrab.style.setProperty('--p', gp.toFixed(3));
    });

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
      const [sx, sy] = this.toScreen(f.x, f.y + (f.max - f.life) * .8, f.z);
      f.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      f.el.style.opacity = Math.min(1, f.life / .35);
      return true;
    });
  }
  frame() {
    const now = performance.now(), dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.dt = dt;
    try { this.update(dt); this.updateVisuals(); } catch (e) { console.error(e); }
    this.renderer.render(this.scene, this.camera);
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = .1; this.cb.onHud(this.hud()); }
  }
  hud() {
    return {
      state: this.state, started: this.started, left: this.remaining(), burned: this.burned,
      timeLeft: Math.max(0, Math.ceil(this.roundTime - this.elapsed)), progress: this.started ? clamp(this.elapsed / this.roundTime, 0, 1) : 0,
      banner: this.banner ? { text: this.banner.text, color: this.banner.color } : null,
      count: this.state === 'countdown' ? Math.max(1, Math.ceil(this.cdT)) : 0,
      awake: this.activeBats().length,
      players: this.bats.filter(b => b.state !== 'sleep' || b.slot < 3 || this.padConnected(b.slot - 3)).map(b => ({ slot: b.slot, name: b.name, color: b.color, awake: b.state === 'active', out: b.state === 'out', lives: b.lives, carrying: !!b.carrying, echo: b.echoCd > 0 ? Math.ceil(b.echoCd) : 0 })),
      backend: this.backend
    };
  }
}
