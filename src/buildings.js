// =====================================================================
// Vampire Garlic Heist: detailed village buildings and garlic, built from simple shapes.
// Every house is made of many small parts (stone foundation, corner stones, timber beams, roof tiles,
// dormers, arched doors, shutters, flower boxes...). All parts get a vertex colour and are merged
// into ONE mesh for the whole village, so the detail costs almost nothing to draw.
// Window panes stay separate (one mesh per house) so each house can switch its lights on and off.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PLASTER = ['#F1E4CC', '#EAD9BF', '#F4EADB', '#E4D6EE', '#EFD9C4', '#DCE6D6', '#F2DCD2'];
const ROOFS = ['#F49A70', '#EC7D6B', '#AE97F0', '#F5B878', '#86BDE6', '#E28ABD', '#F0A66E', '#8FD6B8'];
const ACCENT = ['#5E9CC8', '#7DBF8E', '#C0649A', '#E8A160', '#8E74D6'];
const STONE = '#8F86AA', STONE_LIGHT = '#AAA2C2', STONE_DARK = '#6C6490', WOOD = '#6B4430', WOOD_DARK = '#4A2E22';
const rnd = (a, b) => a + Math.random() * (b - a);

// collects coloured parts in "house space" and bakes them into world space
export class Kit {
  constructor() {
    this.parts = []; this.frame = new THREE.Matrix4();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._c = new THREE.Color();
    this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  setFrame(x, z, ry) { this.frame.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)); }
  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, jitter = 0, order = 'XYZ') {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    this._e.set(rx, ry, rz, order); this._q.setFromEuler(this._e);
    this._m.compose(this._v.set(x, y, z), this._q, this._s);
    g.applyMatrix4(this._m); g.applyMatrix4(this.frame);
    const c = this._c.set(color); if (jitter) c.offsetHSL(rnd(-.01, .01), rnd(-jitter, jitter) * .5, rnd(-jitter, jitter));
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return g;
  }
  box(w, h, d, color, x, y, z, rx, ry, rz, jitter) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz, jitter); }
  merge() { const g = mergeGeometries(this.parts, false); g.computeBoundingSphere(); this.parts = []; return g; }
}

// window panes of one house (in house space) -> one geometry
class Panes {
  constructor() { this.list = []; }
  add(w, h, x, y, z, ry = 0, round = false) {
    const g = round ? new THREE.CircleGeometry(w / 2, 18) : new THREE.PlaneGeometry(w, h);
    g.rotateY(ry); g.translate(x, y, z); this.list.push(g);
  }
  build(frame) {
    const halo = [];
    const geo = mergeGeometries(this.list.map(g => { const c = g.clone(); c.deleteAttribute('uv'); c.applyMatrix4(frame); return c.index ? c.toNonIndexed() : c; }), false);
    // halos: a bigger soft card around every pane
    this.list.forEach(g => {
      g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3());
      const nx = Math.abs(bb.max.x - bb.min.x) < .01, size = nx ? (bb.max.z - bb.min.z) : (bb.max.x - bb.min.x);
      const p = new THREE.PlaneGeometry(size * 2.6, size * 2.4); if (nx) p.rotateY(Math.PI / 2);
      p.translate(c.x + (nx ? Math.sign(c.x) * .03 : 0), c.y, c.z + (nx ? 0 : Math.sign(c.z) * .03)); p.applyMatrix4(frame); halo.push(p);
    });
    return { geo, halo: mergeGeometries(halo, false) };
  }
}

// a window with frame, sill, cross bars, shutters and (optionally) a flower box; faces +z (side = 1) or -z (side = -1)
function windowSet(kit, panes, x, y, zf, side, accent, flowers) {
  const s = side, z = zf * s;
  kit.box(.5, .44, .05, WOOD_DARK, x, y, z + .01 * s);
  kit.box(.6, .06, .14, STONE_LIGHT, x, y - .25, z + .05 * s, 0, 0, 0, .04);
  kit.box(.035, .34, .02, WOOD_DARK, x, y, z + .045 * s);
  kit.box(.4, .035, .02, WOOD_DARK, x, y + .02, z + .045 * s);
  kit.box(.15, .44, .03, accent, x - .34, y, z + .03 * s, 0, s * .25, 0, .05);
  kit.box(.15, .44, .03, accent, x + .34, y, z + .03 * s, 0, -s * .25, 0, .05);
  panes.add(.42, .34, x, y, z + .035 * s, s < 0 ? Math.PI : 0);
  if (flowers) {
    kit.box(.48, .1, .12, WOOD, x, y - .33, z + .1 * s);
    [-.15, 0, .15].forEach((fx, i) => kit.add(new THREE.IcosahedronGeometry(.065, 0), ['#F5A8D8', '#FFE36B', '#F07A6A'][(i + Math.round(x * 7)) % 3], x + fx, y - .25, z + .1 * s, 0, 0, 0, .05));
    kit.add(new THREE.IcosahedronGeometry(.1, 0), '#4E8A5A', x, y - .27, z + .1 * s, 0, 0, 0, .06);
  }
}

// arched door with stone surround and steps, facing +z (side 1) or -z (side -1)
function door(kit, x, zf, side, F, big = false) {
  const s = side, z = zf * s, dw = big ? .76 : .52, dh = big ? .85 : .72, ry = s < 0 ? Math.PI : 0;
  kit.box(dw + .18, dh, .05, STONE_LIGHT, x, F + dh / 2, z + .015 * s, 0, 0, 0, .03);
  kit.add(new THREE.CircleGeometry((dw + .18) / 2, 16, 0, Math.PI), STONE_LIGHT, x, F + dh, z + .042 * s, 0, ry, 0);
  kit.box(dw, dh, .05, WOOD, x, F + dh / 2, z + .03 * s, 0, 0, 0, .06);
  kit.add(new THREE.CircleGeometry(dw / 2, 16, 0, Math.PI), WOOD, x, F + dh, z + .058 * s, 0, ry, 0);
  for (let i = -1; i <= 1; i++) kit.box(.02, dh + dw * .3, .02, WOOD_DARK, x + i * dw * .25, F + (dh + dw * .3) / 2, z + .062 * s);
  if (big) kit.box(.025, dh + dw * .45, .03, WOOD_DARK, x, F + (dh + dw * .45) / 2, z + .066 * s);
  kit.add(new THREE.IcosahedronGeometry(.035, 0), '#F5D66B', x + dw * .3, F + dh * .5, z + .07 * s);
  kit.box(dw + .5, .13, .32, STONE, x, .065, z + .25 * s, 0, 0, 0, .05);
  kit.box(dw + .36, .13, .2, STONE, x, .195, z + .16 * s, 0, 0, 0, .05);
}

// tiled gable roof along x: rows of slightly uneven tiles, ridge, barge boards
function gableRoof(kit, w, d, H, R, color, over = .26) {
  const e = d / 2 + over, xl = w + .36, L = Math.hypot(e, R), a = Math.atan2(R, e), N = Math.max(5, Math.round(L / .2));
  // gable walls (the triangles under the roof)
  const tri = new THREE.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, R * (d / 2) / e + R * (over / e)); tri.closePath();
  const tg = new THREE.ExtrudeGeometry(tri, { depth: w, bevelEnabled: false }); tg.translate(0, 0, -w / 2);
  kit.add(tg, '#E6D7C0', 0, H, 0, 0, Math.PI / 2, 0, .02);
  // undersides so you never look through the roof
  [1, -1].forEach(s => kit.box(xl - .02, .04, L, new THREE.Color(color).multiplyScalar(.5).getStyle(), 0, H + R / 2 + .005, s * e / 2, s * a, 0, 0));
  const tw = .27;
  [1, -1].forEach(s => {
    for (let k = 0; k < N; k++) {
      const u = (k + .5) / N, cz = s * e * (1 - u), cy = H + R * u + .035 + k * .004;
      const rowLen = L / N * 1.18, off = k % 2 ? tw / 2 : 0, n = Math.ceil(xl / tw) + 1;
      for (let i = 0; i < n; i++) {
        const tx = -xl / 2 + off + i * tw; if (tx > xl / 2 + .01) continue;
        const wdt = Math.min(tw - .03, xl / 2 - tx + tw / 2); if (wdt < .06) continue;
        kit.box(wdt, .05, rowLen, color, tx, cy, cz, s * a + rnd(-.03, .03), 0, rnd(-.035, .035), .07);
      }
    }
    kit.box(.08, .1, L + .06, WOOD_DARK, xl / 2 + .02, H + R / 2 + .02, s * e / 2, s * a, 0, 0);
    kit.box(.08, .1, L + .06, WOOD_DARK, -xl / 2 - .02, H + R / 2 + .02, s * e / 2, s * a, 0, 0);
  });
  kit.box(xl + .1, .14, .22, new THREE.Color(color).multiplyScalar(.7).getStyle(), 0, H + R + .06, 0);
  return { e, a, L };
}

function bush(kit, x, z, size = 1) {
  const greens = ['#3F7A57', '#4E8A5A', '#2F6B5A'];
  kit.add(new THREE.IcosahedronGeometry(.24 * size, 0), greens[0], x, .18 * size, z, rnd(0, 3), rnd(0, 3), 0, .06);
  kit.add(new THREE.IcosahedronGeometry(.17 * size, 0), greens[1], x + .16 * size, .14 * size, z + .06, rnd(0, 3), rnd(0, 3), 0, .06);
  kit.add(new THREE.IcosahedronGeometry(.15 * size, 0), greens[2], x - .14 * size, .13 * size, z + .08, rnd(0, 3), rnd(0, 3), 0, .06);
}

function barrel(kit, x, z) {
  kit.add(new THREE.CylinderGeometry(.16, .16, .4, 10), WOOD, x, .2, z, 0, 0, 0, .05);
  kit.add(new THREE.CylinderGeometry(.175, .175, .04, 10), '#3A2A30', x, .08, z);
  kit.add(new THREE.CylinderGeometry(.175, .175, .04, 10), '#3A2A30', x, .32, z);
  kit.add(new THREE.CylinderGeometry(.14, .14, .02, 10), '#8A6A4A', x, .41, z);
}

function fence(kit, x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), n = Math.max(2, Math.round(len / .4));
  for (let i = 0; i <= n; i++) { const t = i / n; kit.box(.06, .42, .06, WOOD, x0 + (x1 - x0) * t, .21, z0 + (z1 - z0) * t, 0, 0, 0, .08); }
  [.14, .3].forEach(y => kit.box(len, .045, .035, '#8A5A3A', (x0 + x1) / 2, y, (z0 + z1) / 2, 0, -ang, 0, .04));
}

// ---------------------------------------------------------------------
// one cottage in house space: door on +z (the house record's f direction is applied by the frame)
// ---------------------------------------------------------------------
export function buildCottage(kit, hd, idx, opts) {
  const { w, d } = hd, tall = !!hd.tall, F = .26, H = tall ? 1.8 : 1.2, R = tall ? .95 : .82;
  const plaster = PLASTER[idx % PLASTER.length], roof = ROOFS[idx % ROOFS.length], accent = ACCENT[(idx * 3) % ACCENT.length];
  const panes = new Panes(), side = idx % 2 ? 1 : -1;
  kit.box(w + .18, F, d + .18, STONE_DARK, 0, F / 2, 0, 0, 0, 0, .04);
  // a row of rough stones along the foundation
  for (let x = -w / 2 + .12; x < w / 2 - .05; x += rnd(.22, .32)) { kit.box(rnd(.16, .24), .12, .04, STONE, x, rnd(.08, .17), d / 2 + .09, 0, 0, 0, .1); kit.box(rnd(.16, .24), .12, .04, STONE, x, rnd(.08, .17), -d / 2 - .09, 0, 0, 0, .1); }
  kit.box(w, H - F, d, plaster, 0, F + (H - F) / 2, 0, 0, 0, 0, .015);
  // corner stones
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    let k = 0;
    for (let y = F + .12; y < H - .08; y += .24, k++) {
      const bx = k % 2 ? .26 : .17, bz = k % 2 ? .17 : .26;
      kit.box(bx, .2, bz, STONE_LIGHT, sx * (w / 2 - bx / 2 + .035), y, sz * (d / 2 - bz / 2 + .035), 0, 0, 0, .08);
    }
  });
  // timber frame
  [1, -1].forEach(s => {
    kit.box(w + .06, .09, .07, WOOD_DARK, 0, H - .05, s * (d / 2 + .02));
    if (tall) {
      kit.box(w + .04, .08, .06, WOOD_DARK, 0, F + (H - F) * .5, s * (d / 2 + .02));
      [-1, 1].forEach(px => kit.box(.07, (H - F) * .5, .05, WOOD_DARK, px * w * .12, F + (H - F) * .75, s * (d / 2 + .02)));
    }
  });
  const rf = gableRoof(kit, w, d, H, R, roof);
  // chimney on the back slope
  const cx = side * w * .3, cz = -d * .2, Yt = H + R + .5;
  kit.box(.38, Yt - H + .1, .38, STONE, cx, (H + Yt) / 2 - .05, cz, 0, 0, 0, .05);
  [H + R * .55, H + R + .2].forEach(y => kit.box(.43, .06, .43, STONE_LIGHT, cx, y, cz, 0, 0, 0, .05));
  kit.box(.48, .08, .48, STONE_DARK, cx, Yt + .04, cz);
  kit.add(new THREE.CylinderGeometry(.07, .08, .16, 8), '#5A4E7A', cx + .08, Yt + .16, cz);
  opts.chimney(cx + .08, Yt + .3, cz);
  // dormer on the front slope for tall houses and every third house
  if (tall || idx % 3 === 0) {
    const u = .38, dz = rf.e * (1 - u), dy = H + R * u, dx = -side * w * .2;
    kit.box(.62, .62, .7, plaster, dx, dy + .2, dz - .05, 0, 0, 0, .02);
    const dr = new THREE.Shape(); dr.moveTo(-.42, 0); dr.lineTo(.42, 0); dr.lineTo(0, .36); dr.closePath();
    const dg = new THREE.ExtrudeGeometry(dr, { depth: .82, bevelEnabled: false }); dg.translate(0, 0, -.41);
    kit.add(dg, new THREE.Color(roof).multiplyScalar(.9).getStyle(), dx, dy + .5, dz - .02, 0, 0, 0, .04);
    kit.box(.4, .34, .04, WOOD_DARK, dx, dy + .22, dz + .31);
    kit.box(.03, .28, .02, WOOD_DARK, dx, dy + .22, dz + .335);
    panes.add(.32, .26, dx, dy + .22, dz + .33);
  }
  // doors and windows: the front gets the door; the back gets windows too (it faces the camera on some houses)
  door(kit, 0, d / 2 + .02, 1, F);
  const rows = tall ? [.78, 1.45] : [.74];
  rows.forEach((y, r) => {
    [-1, 1].forEach(sx => {
      const x = sx * w * .3;
      if (Math.abs(x) < .55) return;
      windowSet(kit, panes, x, y, d / 2 + .01, 1, accent, r === 0);
      windowSet(kit, panes, x, y, d / 2 + .01, -1, accent, false);
    });
  });
  if (!tall) windowSet(kit, panes, 0, .74, d / 2 + .01, -1, accent, true);
  // round windows in the gable ends
  [1, -1].forEach(sx => {
    const gx = sx * (w / 2 + .03), gy = H + R * .28;
    kit.add(new THREE.TorusGeometry(.15, .035, 6, 14), WOOD_DARK, gx, gy, 0, 0, Math.PI / 2, 0);
    panes.add(.26, .26, gx + sx * .005, gy, 0, sx * Math.PI / 2, true);
  });
  // garden bits
  const pumpkinSide = opts.pumpkinSide; // keep that corner free for the jack-o'-lantern
  [-1, 1].forEach(sx => { if (sx !== pumpkinSide) bush(kit, sx * (w / 2 + .02), d / 2 + .3, rnd(.85, 1.1)); });
  bush(kit, -side * (w / 2 + .1), -d / 2 - .25, rnd(.7, .95));
  if (idx % 3 === 0) barrel(kit, side * (w / 2 + .3), -d / 2 + .25);
  if (idx % 4 === 2) fence(kit, side * (w / 2 + .45), -d / 2 + .1, side * (w / 2 + .45), d / 2 - .2);
  if (idx % 5 === 1) { kit.box(.5, .3, .3, '#8A5A3A', -side * (w / 2 + .32), .15, -.2, 0, .2, 0, .05); kit.add(new THREE.CylinderGeometry(.07, .07, .5, 8), '#A0784E', -side * (w / 2 + .32), .36, -.2, 0, 0, Math.PI / 2); }
  return panes;
}

export function buildChurch(kit, hd, opts) {
  const { w, d } = hd, F = .3, H = 1.65, R = 1.15, panes = new Panes();
  kit.box(w + .2, F, d + .2, STONE_DARK, 0, F / 2, 0, 0, 0, 0, .04);
  kit.box(w, H - F, d, '#D9D0E8', 0, F + (H - F) / 2, 0, 0, 0, 0, .015);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { let k = 0; for (let y = F + .12; y < H - .08; y += .24, k++) { const bx = k % 2 ? .26 : .17, bz = k % 2 ? .17 : .26; kit.box(bx, .2, bz, STONE_LIGHT, sx * (w / 2 - bx / 2 + .035), y, sz * (d / 2 - bz / 2 + .035), 0, 0, 0, .08); } });
  // buttresses
  [-1, 1].forEach(s => [-.42, .42].forEach(fx => kit.box(.18, H * .8, .26, STONE, fx * w, H * .4, s * (d / 2 + .12), 0, 0, 0, .05)));
  gableRoof(kit, w, d, H, R, '#7E6AD8');
  door(kit, .35, d / 2 + .02, 1, F, true);
  // tall pointed windows and a rose window
  [-1, 1].forEach(s => [-w * .3, w * .32].forEach(x => {
    if (s > 0 && (Math.abs(x - .35) < .7 || x < -w / 2 + 1.1)) return;
    kit.box(.36, .7, .05, STONE_LIGHT, x, 1.0, s * (d / 2 + .02));
    kit.add(new THREE.CircleGeometry(.18, 12, 0, Math.PI), STONE_LIGHT, x, 1.35, s * (d / 2 + .045), 0, s < 0 ? Math.PI : 0, 0);
    panes.add(.24, .6, x, 1.0, s * (d / 2 + .05), s < 0 ? Math.PI : 0);
  }));
  [1, -1].forEach(sx => { kit.add(new THREE.TorusGeometry(.26, .05, 6, 20), STONE_LIGHT, sx * (w / 2 + .03), H + .38, 0, 0, Math.PI / 2, 0); panes.add(.46, .46, sx * (w / 2 + .035), H + .38, 0, sx * Math.PI / 2, true); });
  // bell tower with belfry, spire and a golden cross
  const tx = -w / 2 + .5, tz = d / 2 - .5;
  kit.box(1.0, 3.3, 1.0, '#CFC4E2', tx, 1.65, tz, 0, 0, 0, .02);
  let k = 0; for (let y = .2; y < 3.2; y += .26, k++) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => kit.box(k % 2 ? .24 : .16, .2, k % 2 ? .16 : .24, STONE_LIGHT, tx + sx * .44, y, tz + sz * .44, 0, 0, 0, .08));
  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(r => {
    const ox = Math.sin(r) * .51, oz = Math.cos(r) * .51;
    kit.box(.36, .5, .04, '#2A2148', tx + ox, 2.75, tz + oz, 0, r, 0);
    kit.add(new THREE.CircleGeometry(.18, 10, 0, Math.PI), '#2A2148', tx + ox * 1.001, 3.0, tz + oz * 1.001, 0, r, 0);
  });
  kit.box(1.12, .1, 1.12, STONE_LIGHT, tx, 3.3, tz);
  kit.add(new THREE.SphereGeometry(.17, 10, 8), '#F5D66B', tx, 2.7, tz + .5);
  kit.add(new THREE.ConeGeometry(.74, 1.6, 4), '#7E6AD8', tx, 4.15, tz, 0, Math.PI / 4, 0, .03);
  kit.box(.05, .42, .05, '#F5D66B', tx, 5.1, tz); kit.box(.26, .05, .05, '#F5D66B', tx, 5.15, tz);
  kit.add(new THREE.IcosahedronGeometry(.22, 0), '#4E8A5A', w / 2 + .1, .2, d / 2 + .3, 0, 0, 0, .05);
  opts.spire(tx, 4.4, tz);
  return panes;
}

// the windmill: round stone tower, pointed roof; its sails are a separate group so they can turn
export function buildMill(kit, hd, opts) {
  const panes = new Panes(), F = .22;
  kit.add(new THREE.CylinderGeometry(1.2, 1.25, F, 18), STONE_DARK, 0, F / 2, 0);
  kit.add(new THREE.CylinderGeometry(.85, 1.1, 2.7, 18), '#EADCC4', 0, F + 1.35, 0, 0, 0, 0, .01);
  for (let y = F + .15; y < 2.8; y += .45) kit.add(new THREE.CylinderGeometry(1.1 - (y / 2.9) * .25 + .02, 1.1 - (y / 2.9) * .25 + .03, .12, 18), STONE_LIGHT, 0, y, 0, 0, rnd(0, 3), 0, .04);
  kit.add(new THREE.CylinderGeometry(.92, .92, .14, 18), WOOD_DARK, 0, F + 2.72, 0);
  // conical tiled roof: stacked rings
  for (let i = 0; i < 6; i++) { const r0 = 1.05 - i * .17, h = .26; kit.add(new THREE.CylinderGeometry(Math.max(.05, r0 - .17), r0, h, 18, 1, true), i % 2 ? '#7E66C8' : '#8E74D6', 0, F + 2.85 + i * .22, 0, 0, i * .3, 0, .05); }
  kit.add(new THREE.ConeGeometry(1.05, 1.5, 18), '#6A55B8', 0, F + 3.3, 0);
  kit.add(new THREE.SphereGeometry(.09, 8, 6), '#F5D66B', 0, F + 4.1, 0);
  door(kit, 0, 1.11, 1, F);
  const rad = y => 1.1 - (y - F) / 2.7 * .25 + .03;
  [[.55, 1.6], [-.55, 1.15]].forEach(([x, y]) => { const z = Math.sqrt(Math.max(0, rad(y) ** 2 - x * x)); kit.box(.3, .34, .05, WOOD_DARK, x, y, z, 0, Math.atan2(x, z), 0); panes.add(.22, .26, x * 1.03, y, z * 1.03 + .01, Math.atan2(x, z)); });
  kit.add(new THREE.CylinderGeometry(.14, .14, .4, 10), WOOD_DARK, 0, 2.55, .95, Math.PI / 2, 0, 0);
  bush(kit, .95, .9, .9); barrel(kit, -1.05, .7);
  fence(kit, -1.45, -1.0, -1.45, .4);
  return panes;
}
export function buildMillSails(std) {
  const g = new THREE.Group(), wood = std('#7A5236'), cloth = std('#F3E8D6', { side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.9, .06), wood); beam.position.y = .95; arm.add(beam);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(.46, 1.35), cloth); sail.position.set(.27, 1.15, .02); arm.add(sail);
    for (let k = 0; k < 4; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.5, .03, .03), wood); bar.position.set(.27, .55 + k * .4, .04); arm.add(bar); }
    arm.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(arm);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .14, 10), wood); hub.rotation.x = Math.PI / 2; g.add(hub);
  return g;
}

// vegetable patch with crop rows and a little fence
export function buildField(kit, f) {
  kit.setFrame(f.x, f.z, 0);
  kit.box(f.w, .06, f.d, '#4A3428', 0, .03, 0, 0, 0, 0, .03);
  for (let r = 0; r < 3; r++) for (let x = -f.w / 2 + .2; x < f.w / 2 - .1; x += .3) kit.add(new THREE.ConeGeometry(.08, .22, 5), r % 2 ? '#5E9A5A' : '#7DBF6E', x + rnd(-.04, .04), .16, -f.d / 2 + .2 + r * (f.d - .4) / 2, 0, 0, 0, .08);
  fence(kit, -f.w / 2 - .1, f.d / 2 + .1, f.w / 2 + .1, f.d / 2 + .1);
}

// ---------------------------------------------------------------------
// garlic bulb: lobed cloves, papery stem and little roots, with purple streaks in the grooves
// ---------------------------------------------------------------------
export function buildGarlicGeometry() {
  const prof = [[0, 0], [.08, .005], [.15, .03], [.21, .08], [.245, .15], [.245, .22], [.22, .29], [.17, .35], [.11, .4], [.06, .45], [.035, .5], [0, .52]].map(([x, y]) => new THREE.Vector2(x, y));
  let bulb = new THREE.LatheGeometry(prof, 32);
  const pos = bulb.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  const cream = new THREE.Color('#F7F0E1'), purple = new THREE.Color('#C9A3D6'), tip = new THREE.Color('#E9DDC2'), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ang = Math.atan2(z, x);
    const lobe = Math.abs(Math.sin(ang * 4)), mid = Math.sin(Math.min(1, y / .5) * Math.PI);
    const k = 1 + .09 * lobe * mid;
    pos.setX(i, x * k); pos.setZ(i, z * k);
    const groove = (1 - lobe) ** 3 * mid;
    c.copy(cream).lerp(purple, Math.min(1, groove * .9 + (y < .12 ? (.12 - y) * 3 : 0))).lerp(tip, y > .42 ? (y - .42) * 6 : 0);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  bulb.setAttribute('color', new THREE.BufferAttribute(col, 3)); bulb.deleteAttribute('uv'); bulb.computeVertexNormals(); bulb = bulb.toNonIndexed();
  const parts = [bulb];
  const paint = (g, hex) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); const cc = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = cc.r; a[i + 1] = cc.g; a[i + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const stem = new THREE.CylinderGeometry(.018, .045, .2, 7, 3); const sp = stem.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i), tw = (y + .1) * 2.5; const x = sp.getX(i), z = sp.getZ(i); sp.setX(i, x * Math.cos(tw) - z * Math.sin(tw) + (y + .1) * .12); sp.setZ(i, x * Math.sin(tw) + z * Math.cos(tw)); }
  stem.translate(0, .6, 0); stem.computeVertexNormals(); parts.push(paint(stem, '#D9CDA8'));
  const tipG = new THREE.ConeGeometry(.022, .07, 6); tipG.translate(.025, .73, 0); parts.push(paint(tipG, '#9DB66E'));
  for (let i = 0; i < 6; i++) { const r = new THREE.CylinderGeometry(.006, .01, .06, 4); r.rotateZ(.5); r.rotateY(i); r.translate(Math.cos(i) * .03, -.015, Math.sin(i) * .03); parts.push(paint(r, '#BFA67E')); }
  return mergeGeometries(parts, false);
}

// =====================================================================
// the rest of the world, in the same chunky hand-made style as the houses
// =====================================================================
const IRON = '#2A2148';

// cobbles on the streets and curb stones along their edges
export function buildStreets(kit, streets, W, plaza, insideOther) {
  kit.setFrame(0, 0, 0);
  streets.forEach(([x1, z1, x2, z2], si) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1), ux = (x2 - x1) / len, uz = (z2 - z1) / len, nx = -uz, nz = ux;
    for (let t = -W / 2; t < len + W / 2; t += .32) for (let o = -W / 2 + .15; o < W / 2 - .1; o += .3) {
      if (Math.random() > .38) continue;
      const x = x1 + ux * t + nx * o + rnd(-.05, .05), z = z1 + uz * t + nz * o + rnd(-.05, .05);
      if (Math.hypot(x - plaza.x, z - plaza.z) < plaza.r + .05) continue;
      kit.box(rnd(.18, .28), .03, rnd(.15, .23), Math.random() < .5 ? '#6E64A8' : '#61589A', x, .055, z, 0, -ang + rnd(-.25, .25), 0, .06);
    }
    [-1, 1].forEach(sd => {
      for (let t = -W / 2 + .2; t < len + W / 2 - .1; t += .42) {
        const x = x1 + ux * t + nx * sd * (W / 2 + .04), z = z1 + uz * t + nz * sd * (W / 2 + .04);
        if (insideOther(x, z) || Math.hypot(x - plaza.x, z - plaza.z) < plaza.r + .15) continue;
        kit.box(.38, .08, .13, '#948CC0', x, .06, z, 0, -ang, 0, .07);
      }
    });
  });
}

// the plaza: cobble rings and a two-tier stone fountain
export function buildPlaza(kit, P) {
  kit.setFrame(P.x, P.z, 0);
  for (let r = 1.35, ring = 0; r < P.r - .3; r += .27, ring++) {
    const n = Math.floor(Math.PI * 2 * r / .3);
    for (let i = 0; i < n; i++) { const a = (i + (ring % 2) * .5) / n * Math.PI * 2; kit.box(.25, .03, .2, ring % 2 ? '#5A5296' : '#4A4386', Math.cos(a) * r, .085, Math.sin(a) * r, 0, -a, 0, .06); }
  }
  const n = 44; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; kit.box(.36, .1, .2, '#7B72AE', Math.cos(a) * (P.r - .1), .09, Math.sin(a) * (P.r - .1), 0, -a + Math.PI / 2, 0, .05); }
  // basin: twelve carved blocks and a rim
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    kit.box(.56, .42, .22, '#7E70C0', Math.cos(a) * 1.0, .25, Math.sin(a) * 1.0, 0, -a + Math.PI / 2, 0, .05);
    kit.box(.6, .08, .3, '#A79CDA', Math.cos(a) * 1.02, .5, Math.sin(a) * 1.02, 0, -a + Math.PI / 2, 0, .04);
  }
  kit.add(new THREE.CylinderGeometry(.24, .3, .22, 12), '#7E70C0', 0, .55, 0);
  kit.add(new THREE.CylinderGeometry(.11, .15, .75, 10), '#8E80CE', 0, 1.0, 0);
  kit.add(new THREE.TorusGeometry(.15, .04, 6, 14), '#A79CDA', 0, .72, 0, Math.PI / 2, 0, 0);
  kit.add(new THREE.CylinderGeometry(.46, .22, .18, 16), '#8E80CE', 0, 1.32, 0);
  kit.add(new THREE.CylinderGeometry(.4, .4, .03, 16), '#46B9D0', 0, 1.42, 0);
  kit.add(new THREE.CylinderGeometry(.07, .09, .3, 8), '#8E80CE', 0, 1.55, 0);
  kit.add(new THREE.CylinderGeometry(.22, .12, .1, 12), '#A79CDA', 0, 1.72, 0);
  kit.add(new THREE.SphereGeometry(.07, 10, 8), '#F5D66B', 0, 1.84, 0);
}

// trees: round oaks, pines, autumn oaks and tall poplars
export function buildTree(kit, x, z, i) {
  kit.setFrame(x, z, rnd(0, 6)); const type = i % 4, sc = rnd(.85, 1.15);
  const bark = '#5B3A2E';
  kit.add(new THREE.CylinderGeometry(.08 * sc, .15 * sc, .9 * sc, 7), bark, 0, .45 * sc, 0, 0, 0, 0, .06);
  for (let k = 0; k < 3; k++) kit.box(.07, .07, .3, bark, Math.cos(k * 2.1) * .14, .05, Math.sin(k * 2.1) * .14, .3, -k * 2.1 + Math.PI / 2, 0, .05);
  if (type === 1) { // pine
    [[.72, .75, .7], [.56, .7, 1.15], [.38, .6, 1.55], [.2, .4, 1.88]].forEach(([r, h, y], k) => kit.add(new THREE.ConeGeometry(r * sc, h * sc, 8), k % 2 ? '#2E6B5A' : '#36806A', 0, y * sc, 0, 0, k * .4, 0, .05));
    return;
  }
  if (type === 3) { // poplar
    [[.42, 1.1, 1.3], [.34, .9, 1.85], [.3, .7, 2.2]].forEach(([r, sy, y], k) => { const g = new THREE.IcosahedronGeometry(r * sc, 1); g.scale(1, sy * 1.6, 1); kit.add(g, k % 2 ? '#3E8A6E' : '#4E9A72', rnd(-.05, .05), y * sc, rnd(-.05, .05), 0, 0, 0, .06); });
    return;
  }
  kit.add(new THREE.CylinderGeometry(.04, .06, .55, 5), bark, .2 * sc, .95 * sc, 0, 0, 0, -.7, .05);
  kit.add(new THREE.CylinderGeometry(.04, .06, .5, 5), bark, -.18 * sc, 1.0 * sc, .05, 0, 0, .7, .05);
  const pal = type === 2 ? ['#E07B3A', '#F0A040', '#C9573F', '#E8903A'] : ['#2F6B5A', '#3E8A6E', '#4E9A72', '#357A63'];
  [[0, 1.35, 0, .6], [.38, 1.15, .1, .42], [-.36, 1.2, -.05, .44], [.05, 1.15, .36, .4], [-.05, 1.2, -.36, .4], [.12, 1.72, .05, .42]].forEach(([fx, fy, fz, r], k) =>
    kit.add(new THREE.IcosahedronGeometry(r * sc, 1), pal[k % pal.length], fx * sc, fy * sc, fz * sc, rnd(0, 3), rnd(0, 3), 0, .07));
}

// graveyard: iron fence with spikes, stone gate pillars, tombstones, mounds, a little crypt and a dead tree
export function buildGraveyard(kit, gy) {
  kit.setFrame(gy.x, gy.z, 0);
  const hw = gy.w / 2, hd = gy.d / 2;
  kit.box(gy.w, .03, gy.d, '#1E2A38', 0, .02, 0);
  const spikes = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / .22)), ang = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; kit.box(.035, .46, .035, IRON, x, .23, z); kit.add(new THREE.ConeGeometry(.04, .1, 4), IRON, x, .5, z); }
    [.12, .38].forEach(y => kit.box(len, .035, .03, IRON, (x0 + x1) / 2, y, (z0 + z1) / 2, 0, -ang, 0));
  };
  spikes(-hw, -hd, hw, -hd); spikes(-hw, -hd, -hw, hd); spikes(hw, -hd, hw, hd); spikes(-hw, hd, -.5, hd); spikes(.5, hd, hw, hd);
  [-.55, .55].forEach(x => { kit.box(.2, .66, .2, STONE, x, .33, hd, 0, 0, 0, .05); kit.box(.26, .08, .26, STONE_LIGHT, x, .7, hd); kit.add(new THREE.SphereGeometry(.08, 8, 6), STONE_LIGHT, x, .8, hd); });
  const mound = (x, z) => { const g = new THREE.SphereGeometry(.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, .35, 1.5); kit.add(g, '#3A3048', x, .02, z, 0, 0, 0, .05); };
  const tomb = (type, x, z) => {
    const ry = rnd(-.2, .2), rz = rnd(-.1, .1), c = Math.random() < .5 ? '#9A92B8' : '#8A82A8';
    if (type === 0) { kit.box(.36, .4, .1, c, x, .2, z, 0, ry, rz, .05); kit.add(new THREE.CylinderGeometry(.18, .18, .1, 12, 1, false, 0, Math.PI), c, x, .4, z, Math.PI / 2, ry, Math.PI / 2 + rz, 0, 'YXZ'); kit.box(.04, .16, .02, '#5A5278', x, .28, z + .06, 0, ry, 0); kit.box(.12, .04, .02, '#5A5278', x, .31, z + .06, 0, ry, 0); }
    if (type === 1) { kit.box(.1, .7, .1, c, x, .35, z, 0, ry, rz, .05); kit.box(.42, .1, .1, c, x, .5, z, 0, ry, rz, .05); }
    if (type === 2) { kit.box(.22, .55, .22, c, x, .3, z, 0, ry, 0, .05); kit.add(new THREE.ConeGeometry(.17, .3, 4), c, x, .72, z, 0, Math.PI / 4 + ry, 0, .05); kit.box(.3, .08, .3, '#7A7298', x, .04, z); }
    if (type === 3) { kit.box(.34, .32, .1, c, x, .16, z, -.25, ry, 0, .05); }
    if (Math.random() < .6) kit.add(new THREE.IcosahedronGeometry(.07, 0), '#5E8A5A', x + rnd(-.1, .1), rnd(.08, .3), z + .06, 0, 0, 0, .1);
    mound(x, z + .3);
  };
  tomb(0, -.2, -.55); tomb(1, .45, -.5); tomb(0, -.55, .3); tomb(2, .2, .2); tomb(3, .8, .5); tomb(0, 1.2, -.55);
  // crypt
  kit.setFrame(gy.x - 1.0, gy.z - .45, 0);
  kit.box(.9, .7, .62, '#8A82A8', 0, .35, 0, 0, 0, 0, .03);
  [-.36, .36].forEach(x => kit.add(new THREE.CylinderGeometry(.05, .06, .6, 8), '#B0A8CC', x, .32, .34));
  kit.box(.34, .46, .04, '#2A2148', 0, .25, .32);
  kit.add(new THREE.CircleGeometry(.17, 10, 0, Math.PI), '#2A2148', 0, .48, .342);
  gableRoof(kit, .9, .62, .7, .35, '#6A5AA8', .12);
  kit.box(.04, .24, .04, '#F5D66B', 0, 1.25, 0); kit.box(.14, .04, .04, '#F5D66B', 0, 1.3, 0);
  // dead tree
  kit.setFrame(gy.x + 1.25, gy.z + .05, 0);
  kit.add(new THREE.CylinderGeometry(.05, .1, 1.3, 6), '#3A2B40', 0, .65, 0);
  [[.5, 1.0, .7], [-.6, 1.15, -.6], [.3, 1.3, -.3], [-.4, .8, 1.4]].forEach(([rz, y, ry]) => kit.add(new THREE.CylinderGeometry(.02, .04, .6, 5), '#3A2B40', Math.sin(rz) * .25, y, 0, 0, ry, rz));
}

// market stall: striped awning with a scalloped edge, counter, crates of pumpkins
export function buildStall(kit, st) {
  kit.setFrame(st.x, st.z, 0);
  [[-.48, -.36], [.48, -.36], [-.48, .36], [.48, .36]].forEach(([px, pz]) => kit.add(new THREE.CylinderGeometry(.035, .04, pz < 0 ? 1.15 : .95, 6), WOOD, px, pz < 0 ? .575 : .475, pz, 0, 0, 0, .05));
  kit.box(1.0, .38, .5, WOOD, 0, .25, .05, 0, 0, 0, .04);
  for (let i = 0; i < 5; i++) kit.box(.02, .36, .02, WOOD_DARK, -.4 + i * .2, .25, .31);
  kit.box(1.08, .06, .6, '#8A5A3A', 0, .47, .05);
  for (let i = 0; i < 6; i++) {
    const x = -.5 + .1 + i * (1.0 / 6) * 1.0 + .02, col = i % 2 ? '#F6EEDC' : st.color;
    kit.box(1.12 / 6, .04, .9, col, -.56 + 1.12 / 12 + i * 1.12 / 6, 1.05, -.02, .28, 0, 0, .02);
    kit.add(new THREE.CircleGeometry(1.12 / 12, 10, Math.PI, Math.PI), col, -.56 + 1.12 / 12 + i * 1.12 / 6, .93, .42);
  }
  [-.3, -.05, .2].forEach((px, i) => { kit.add(new THREE.SphereGeometry(.09, 10, 8), '#F28A2E', px, .58, .05, 0, 0, 0, .06); kit.box(.02, .05, .02, '#4E7A3A', px, .67, .05); });
  kit.add(new THREE.SphereGeometry(.06, 8, 6), '#C9573F', .38, .55, .15); kit.add(new THREE.SphereGeometry(.06, 8, 6), '#7DBF6E', .3, .55, .2);
  kit.box(.34, .26, .3, '#8A5A3A', .75, .13, .2, 0, .3, 0, .05);
  [[.68, .12], [.82, .26]].forEach(([px, pz]) => kit.add(new THREE.SphereGeometry(.08, 8, 6), '#F28A2E', px, .33, pz));
}

// iron street lamp: stone foot, ringed post, scroll arm and a lantern cage (the glowing glass is separate)
export function buildLampPost(kit, L) {
  const px = L.x + .85, pz = L.z + .85;
  kit.setFrame(0, 0, 0);
  kit.box(.32, .24, .32, STONE, px, .12, pz, 0, 0, 0, .05);
  kit.add(new THREE.CylinderGeometry(.05, .08, 2.35, 8), IRON, px, 1.35, pz);
  [.35, 1.2, 2.3].forEach(y => kit.add(new THREE.TorusGeometry(.08, .025, 6, 12), IRON, px, y, pz, Math.PI / 2, 0, 0));
  kit.box(.06, .06, 1.25, IRON, px - .43, 2.52, pz - .43, 0, Math.PI / 4, 0);
  kit.add(new THREE.TorusGeometry(.18, .025, 6, 12, Math.PI), IRON, px - .2, 2.34, pz - .2, 0, Math.PI / 4 + Math.PI / 2, 0);
  kit.box(.02, .14, .02, IRON, L.x, 2.58, L.z);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => kit.box(.025, .34, .025, IRON, L.x + sx * .15, 2.35, L.z + sz * .15));
  kit.add(new THREE.ConeGeometry(.27, .2, 4), IRON, L.x, 2.6, L.z, 0, Math.PI / 4, 0);
  kit.box(.34, .04, .34, IRON, L.x, 2.18, L.z);
}

// little things in the grass: rocks, mushrooms, flowers
export function buildScatter(kit, free, n = 140) {
  kit.setFrame(0, 0, 0);
  for (let i = 0, k = 0; i < n * 20 && k < n; i++) {
    const p = free(); if (!p) continue; k++;
    const [x, z] = p, r = Math.random();
    if (r < .4) { const g = new THREE.IcosahedronGeometry(rnd(.08, .17), 0); g.scale(1, .6, 1); kit.add(g, '#6E6698', x, .05, z, rnd(0, 3), rnd(0, 3), 0, .08); }
    else if (r < .65) { kit.add(new THREE.CylinderGeometry(.025, .03, .12, 6), '#F3E8D6', x, .06, z); kit.add(new THREE.SphereGeometry(.07, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), Math.random() < .5 ? '#E0524A' : '#B58AE0', x, .11, z); kit.add(new THREE.IcosahedronGeometry(.015, 0), '#FFFFFF', x + .03, .16, z + .02); }
    else { const col = ['#F5A8D8', '#FFE36B', '#C9B8F5', '#9FE0C9'][k % 4]; for (let j = 0; j < 3; j++) kit.add(new THREE.IcosahedronGeometry(.045, 0), col, x + rnd(-.1, .1), .08, z + rnd(-.1, .1)); kit.add(new THREE.IcosahedronGeometry(.07, 0), '#3F7A57', x, .04, z, 0, 0, 0, .06); }
  }
}

// the vampire castle: stone-course walls with battlements, towers with tiled roofs, a gate arch, flagstones,
// coffins, candelabras and a brick furnace. Glowing bits (windows, coals, candle flames) go into `glow`.
export function buildCastle(kit, glow, C) {
  kit.setFrame(0, 0, 0); glow.setFrame(0, 0, 0);
  const { X, F } = C, WALL = '#4B3A9A', BLOCK_A = '#5A48A8', BLOCK_B = '#4E3E96', TOP = '#6656B8';
  kit.box(16 - X + .5, .14, 17, '#2C2560', (16 + X) / 2, .07, 0);
  // flagstones
  for (let x = X + .6; x < 15.5; x += .55) for (let z = -7.7; z < 7.75; z += .55) {
    if (Math.hypot(x - F.x, z - F.z) < F.r + .75) continue;
    kit.box(.5, .04, .5, Math.random() < .5 ? '#3A3070' : '#332962', x + rnd(-.02, .02), .16, z + rnd(-.02, .02), 0, rnd(-.05, .05), 0, .05);
  }
  const wall = (x, z, w, d, h = 1.4) => {
    kit.box(w, h, d, WALL, x, h / 2, z);
    const along = w > d, len = along ? w : d, th = along ? d : w;
    [-1, 1].forEach(sd => {
      for (let y = .13, row = 0; y < h - .05; y += .26, row++) {
        let t = -len / 2 + (row % 2 ? .25 : 0);
        while (t < len / 2 - .05) {
          const bl = Math.min(rnd(.34, .55), len / 2 - t); if (bl < .12) break;
          const cx = t + bl / 2, off = th / 2 + .015;
          if (along) kit.box(bl - .03, .23, .04, Math.random() < .5 ? BLOCK_A : BLOCK_B, x + cx, y, z + sd * off, 0, 0, 0, .06);
          else kit.box(.04, .23, bl - .03, Math.random() < .5 ? BLOCK_A : BLOCK_B, x + sd * off, y, z + cx, 0, 0, 0, .06);
          t += bl;
        }
      }
    });
    kit.box(along ? w + .06 : w + .12, .08, along ? d + .12 : d + .06, TOP, x, h + .02, z);
    for (let t = -len / 2 + .2; t < len / 2 - .1; t += .6) kit.box(along ? .32 : th + .1, .3, along ? th + .1 : .32, TOP, along ? x + t : x, h + .2, along ? z : z + t, 0, 0, 0, .06);
  };
  wall(13.25, -8.1, 5.5, .5); wall(13.25, 8.1, 5.5, .5); wall(15.75, 0, .5, 16.7);
  wall(10.75, -5.25, .5, 6.1); wall(10.75, 5.25, .5, 6.1);
  // towers
  [[10.9, -8.1, .85, 2.6], [15.6, -8.1, .85, 2.6], [10.9, 8.1, .85, 2.6], [15.6, 8.1, .85, 2.6], [10.75, -2.4, .55, 2.0], [10.75, 2.4, .55, 2.0]].forEach(([x, z, r, h], ti) => {
    kit.add(new THREE.CylinderGeometry(r, r * 1.06, h, 18), WALL, x, h / 2, z);
    for (let y = .3; y < h - .2; y += .5) kit.add(new THREE.CylinderGeometry(r + .03, r + .03, .1, 18), BLOCK_A, x, y, z, 0, rnd(0, 3), 0, .05);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + ti; kit.box(.22, .2, .05, BLOCK_B, x + Math.cos(a) * (r + .02), rnd(.3, h - .3), z + Math.sin(a) * (r + .02), 0, -a + Math.PI / 2, 0, .08); }
    kit.add(new THREE.CylinderGeometry(r + .16, r, .26, 18), TOP, x, h + .02, z);
    const nm = ti < 4 ? 10 : 8; for (let k = 0; k < nm; k++) { const a = k / nm * Math.PI * 2; kit.box(.2, .26, .14, TOP, x + Math.cos(a) * (r + .08), h + .28, z + Math.sin(a) * (r + .08), 0, -a + Math.PI / 2, 0, .06); }
    const rb = h + .25, rh = r * 1.9;
    kit.add(new THREE.ConeGeometry(r * 1.28, rh, 18), '#7B66CC', x, rb + rh / 2, z);
    for (let i = 0; i < 5; i++) { const k = i / 5, rr = r * 1.28 * (1 - k) + .04; kit.add(new THREE.CylinderGeometry(Math.max(.04, rr - r * 1.28 / 5), rr, rh / 5, 18, 1, true), i % 2 ? '#8E74D6' : '#7B66CC', x, rb + rh * (k + .1), z, 0, i * .3, 0, .05); }
    kit.add(new THREE.SphereGeometry(.08, 8, 6), '#F5D66B', x, rb + rh + .05, z);
    // arched windows facing the village (+z and -x)
    [[0, 1], [-1, 0]].forEach(([dx, dz]) => {
      const wx = x + dx * (r + .02), wz = z + dz * (r + .02), ry = Math.atan2(dx, dz);
      kit.box(r * .5, r * .62, .05, '#2A2148', wx, h * .6, wz, 0, ry, 0);
      kit.add(new THREE.CircleGeometry(r * .25, 10, 0, Math.PI), '#2A2148', wx + dx * .005, h * .6 + r * .31, wz + dz * .005, 0, ry, 0);
      glow.box(r * .36, r * .5, .02, '#FFD36B', wx + dx * .03, h * .6, wz + dz * .03, 0, ry, 0);
      glow.add(new THREE.CircleGeometry(r * .18, 10, 0, Math.PI), '#FFD36B', wx + dx * .035, h * .6 + r * .25, wz + dz * .035, 0, ry, 0);
    });
  });
  // gate arch over the main road
  kit.add(new THREE.TorusGeometry(1.85, .16, 8, 22, Math.PI), BLOCK_A, 10.75, 0, 0, 0, Math.PI / 2, 0);
  kit.box(.6, .42, 4.0, WALL, 10.75, 2.0, 0);
  for (let t = -1.7; t <= 1.7; t += .6) kit.box(.66, .26, .3, TOP, 10.75, 2.34, t);
  kit.add(new THREE.CircleGeometry(.24, 12), '#F07A6A', 10.43, 1.95, 0, 0, -Math.PI / 2, 0);
  kit.add(new THREE.CircleGeometry(.12, 3), '#F5D66B', 10.42, 1.95, 0, 0, -Math.PI / 2, Math.PI / 2);
  // torches at the gate
  [-1.75, 1.75].forEach(z => { kit.box(.06, .3, .06, WOOD_DARK, 10.4, 1.35, z, 0, 0, .3); glow.add(new THREE.ConeGeometry(.07, .2, 6), '#FFB347', 10.36, 1.55, z); });
  // coffins (one is open a crack...)
  const coffin = (x, z, ry, open) => {
    const sh = new THREE.Shape(); [[-.15, .55], [.15, .55], [.26, .25], [.17, -.55], [-.17, -.55], [-.26, .25]].forEach(([a, b], i) => i ? sh.lineTo(a, b) : sh.moveTo(a, b)); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .24, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    kit.add(g, '#4A2E3A', x, .16, z, 0, ry, 0, .03);
    const lid = new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: false }); lid.rotateX(-Math.PI / 2);
    kit.add(lid, '#6B3A4E', x + (open ? .12 : 0), .41, z, 0, ry + (open ? .25 : 0), 0, .03);
    kit.box(.05, .02, .36, '#F5D66B', x, .47, z, 0, ry, 0); kit.box(.2, .02, .05, '#F5D66B', x, .47, z, 0, ry, 0);
  };
  coffin(14.8, -6.3, .3, false); coffin(15.0, 5.9, -.2, true); coffin(12.1, 6.6, 1.3, false);
  // candelabras
  [[12.0, -6.4], [14.4, 3.6]].forEach(([x, z]) => {
    kit.add(new THREE.CylinderGeometry(.03, .1, .9, 8), '#F5D66B', x, .6, z); kit.box(.5, .04, .04, '#F5D66B', x, 1.0, z);
    [-.24, 0, .24].forEach(o => { kit.add(new THREE.CylinderGeometry(.035, .035, .16, 6), '#F6EEDC', x + o, 1.1, z); glow.add(new THREE.ConeGeometry(.04, .1, 6), '#FFD36B', x + o, 1.24, z); });
  });
  // the furnace: courses of bricks, iron hoops and glowing coals
  for (let course = 0; course < 3; course++) {
    const n = 22, rr = F.r + .32;
    for (let i = 0; i < n; i++) { const a = (i + (course % 2) * .5) / n * Math.PI * 2; kit.box(.44, .21, .3, Math.random() < .5 ? '#5A3A5E' : '#4A2E50', F.x + Math.cos(a) * rr, .12 + course * .22, F.z + Math.sin(a) * rr, 0, -a + Math.PI / 2, 0, .06); }
  }
  kit.add(new THREE.TorusGeometry(F.r + .3, .07, 6, 30), '#8A7AB8', F.x, .72, F.z, Math.PI / 2, 0, 0);
  [.25, .52].forEach(y => kit.add(new THREE.TorusGeometry(F.r + .5, .025, 4, 30), IRON, F.x, y, F.z, Math.PI / 2, 0, 0));
  for (let i = 0; i < 46; i++) { const a = rnd(0, Math.PI * 2), rr = Math.sqrt(Math.random()) * F.r * .92; glow.add(new THREE.IcosahedronGeometry(rnd(.08, .16), 0), ['#FF5A2A', '#FF8A3D', '#FFD66B', '#E0402A'][i % 4], F.x + Math.cos(a) * rr, .76 + rnd(0, .06), F.z + Math.sin(a) * rr, rnd(0, 3), rnd(0, 3), 0); }
}

// ---------------------------------------------------------------------
// the garlic from character_rigged.blend (models/garlic.glb) as one geometry with vertex colours.
// Blender's procedural colour ramp doesn't survive the export, so it is rebuilt here: creamy white at
// the bottom, soft yellow-green in the middle, green at the tip; the little root is light brown.
// ---------------------------------------------------------------------
export function garlicFromModel(scene) {
  scene.updateMatrixWorld(true);
  const parts = [], white = new THREE.Color('#F8F4E3'), mid = new THREE.Color('#EDEDB8'), tip = new THREE.Color('#8CC152'), root = new THREE.Color('#C98A4A'), c = new THREE.Color();
  const box = new THREE.Box3().setFromObject(scene);
  scene.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    Object.keys(g.attributes).forEach(k => { if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); });
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), isRoot = /root/i.test(o.material.name);
    for (let i = 0; i < pos.count; i++) {
      const h = (pos.getY(i) - box.min.y) / (box.max.y - box.min.y);
      if (isRoot) c.copy(root); else if (h < .55) c.copy(white); else if (h < .8) c.copy(white).lerp(mid, (h - .55) / .25); else c.copy(mid).lerp(tip, Math.min(1, (h - .8) / .2));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  });
  const geo = mergeGeometries(parts, false);
  const k = .72 / (box.max.y - box.min.y), cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  geo.translate(-cx, -box.min.y, -cz); geo.scale(k, k, k);
  return geo;
}

// ---------------------------------------------------------------------
// the jail: where the night watchmen lock up bats that lost their last heart.
// Built like the houses (stone, quoins, tiles), but open: iron bars at the front and an iron grid on top,
// so you can see the bats inside from the game camera. Front (+z in house space) has the barred door.
// Returns the bat seats inside the jail, in house space.
// ---------------------------------------------------------------------
export function buildJail(kit, glow, hd) {
  const { w, d } = hd, F = .22, H = 1.75, front = d / 2 - .2;
  const BLOCK = ['#8F86AA', '#7E76A0'];
  kit.box(w + .3, F, d + .3, STONE_DARK, 0, F / 2, 0, 0, 0, 0, .04);
  for (let x = -w / 2 + .2; x < w / 2 - .1; x += .42) for (let z = -d / 2 + .2; z < d / 2 - .1; z += .42) kit.box(.38, .03, .38, Math.random() < .5 ? '#5A5278' : '#4E4870', x, F + .015, z, 0, rnd(-.06, .06), 0, .05);
  // back wall of stone courses with a small barred window
  const bz = -d / 2 + .15;
  kit.box(w, H, .3, '#6C6490', 0, F + H / 2, bz);
  for (let y = F + .13, row = 0; y < F + H - .05; y += .26, row++) {
    let x = -w / 2 + (row % 2 ? .22 : 0);
    while (x < w / 2 - .05) { const bl = Math.min(rnd(.34, .52), w / 2 - x); if (bl < .12) break; kit.box(bl - .03, .23, .04, BLOCK[(row + Math.round(x * 5)) % 2], x + bl / 2, y, bz + .16, 0, 0, 0, .07); x += bl; }
  }
  kit.box(.6, .42, .05, '#1A1433', 0, F + 1.2, bz + .17);
  for (let i = -1; i <= 1; i++) kit.box(.035, .42, .04, IRON, i * .15, F + 1.2, bz + .2);
  // side walls (half height) and stone pillars at the front corners
  [-1, 1].forEach(sx => {
    kit.box(.24, 1.0, d - .3, '#6C6490', sx * (w / 2 - .12), F + .5, -.05);
    kit.box(.3, .08, d - .25, STONE_LIGHT, sx * (w / 2 - .12), F + 1.04, -.05);
    kit.box(.38, H + .25, .38, STONE, sx * (w / 2 - .19), F + (H + .25) / 2, front, 0, 0, 0, .04);
    let k = 0; for (let y = F + .12; y < F + H + .1; y += .24, k++) kit.box(k % 2 ? .44 : .3, .2, k % 2 ? .3 : .44, STONE_LIGHT, sx * (w / 2 - .19), y, front, 0, 0, 0, .08);
    kit.box(.48, .1, .48, STONE_LIGHT, sx * (w / 2 - .19), F + H + .3, front);
    kit.add(new THREE.SphereGeometry(.12, 10, 8), '#A79CDA', sx * (w / 2 - .19), F + H + .45, front);
    // bars along the side, above the half wall
    for (let z = -d / 2 + .45; z < front - .2; z += .2) kit.add(new THREE.CylinderGeometry(.022, .022, H - 1.0, 5), IRON, sx * (w / 2 - .12), F + 1.04 + (H - 1.0) / 2, z);
  });
  // front bars with a door and a big golden lock
  const bx0 = -w / 2 + .42, bx1 = w / 2 - .42;
  for (let x = bx0; x <= bx1 + .01; x += .19) kit.add(new THREE.CylinderGeometry(.028, .028, H, 6), IRON, x, F + H / 2, front);
  [.12, .85, H - .05].forEach(y => kit.box(bx1 - bx0 + .1, .06, .06, IRON, 0, F + y, front));
  kit.box(.06, H, .08, IRON, -.38, F + H / 2, front + .02); kit.box(.06, H, .08, IRON, .38, F + H / 2, front + .02);
  kit.box(.24, .22, .1, '#F5D66B', .3, F + .85, front + .07);
  kit.add(new THREE.TorusGeometry(.07, .025, 6, 12, Math.PI), '#F5D66B', .3, F + .96, front + .07);
  kit.add(new THREE.CircleGeometry(.03, 8), '#1A1433', .3, F + .83, front + .125);
  // open iron grid on top (so the camera sees inside) and a small tiled roof over the back
  for (let z = -d / 2 + .6; z <= front; z += .26) kit.box(w - .4, .045, .045, IRON, 0, F + H, z);
  for (let x = -w / 2 + .3; x <= w / 2 - .3; x += .5) kit.box(.045, .045, d - .5, IRON, x, F + H + .02, -.05);
  for (let r = 0; r < 4; r++) for (let x = -w / 2 - .1 + (r % 2) * .13; x < w / 2 + .1; x += .26) kit.box(.23, .05, .3, '#7E6AD8', x, F + H + .32 - r * .09, -d / 2 + .52 - r * .2, -.42 + rnd(-.03, .03), 0, rnd(-.03, .03), .07);
  kit.box(w + .3, .12, .16, '#5E4BB0', 0, F + H + .38, -d / 2 + .58);
  // wooden sign with a lock, hanging from the grid above the door
  kit.box(1.0, .34, .06, WOOD, -.55, F + H + .45, front + .05, 0, 0, 0, .05);
  [-.85, -.25].forEach(x => kit.box(.03, .2, .03, IRON, x, F + H + .17, front + .05));
  kit.box(.16, .14, .04, '#F5D66B', -.55, F + H + .42, front + .1);
  kit.add(new THREE.TorusGeometry(.05, .018, 6, 10, Math.PI), '#F5D66B', -.55, F + H + .49, front + .1);
  // inside: hay, a bucket and a little bench
  const hay = new THREE.SphereGeometry(.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); hay.scale(1.4, .45, 1);
  kit.add(hay, '#D9B860', -w / 2 + .75, F, -d / 2 + .6, 0, 0, 0, .05);
  kit.add(new THREE.CylinderGeometry(.13, .1, .22, 10), '#8A5A3A', w / 2 - .55, F + .11, -d / 2 + .55, 0, 0, 0, .05);
  kit.box(.9, .08, .26, WOOD, .35, F + .32, -d / 2 + .5); [-.05, .75].forEach(x => kit.box(.06, .3, .2, WOOD_DARK, x, F + .15, -d / 2 + .5));
  // torches on the pillars
  [-1, 1].forEach(sx => { kit.box(.05, .26, .05, WOOD_DARK, sx * (w / 2 - .19), F + 1.45, front + .24, .4, 0, 0); kit.add(new THREE.ConeGeometry(.07, .2, 6), '#FFB347', sx * (w / 2 - .19), F + 1.66, front + .3); });
  // seats for up to seven bats (two rows)
  const seats = [];
  [-.15, .45].forEach((z, r) => [-1, -.33, .33, 1].forEach(fx => { if (seats.length < 7) seats.push([fx * (w / 2 - .7) + (r ? .2 : 0), z]); }));
  return seats;
}
