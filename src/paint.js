// =====================================================================
// Vampire Garlic Heist: painterly "brush stroke" look, done in the material (three.js TSL nodes,
// works on WebGPU and on the WebGL 2 fallback).
//  1. strokes: space is cut into warped, stretched cells (cell noise on a domain-warped position).
//     Every cell is one brush dab: it gets its own shade, a warm/cool tint and its own tilted normal,
//     so the light catches each dab differently, like paint on canvas.
//  2. outline: an "inverted hull" (a slightly inflated copy drawn from the back) gives the dark ink edge.
// =====================================================================
import * as THREE from 'three';

const T = THREE; // TSL functions come from the same module as the rest of three.js
const PAINT_WARM = T.color('#FFD9A8'), PAINT_COOL = T.color('#7C6CE0');

// the brush-dab field at a position; `space` is a TSL position node, `freq` the dab density
function dabs(space, freq) {
  const p = space.mul(freq);
  const w = T.mx_noise_float(p.mul(.32)).mul(1.5);                     // one cheap noise wobbles the cells into organic dabs
  const warped = p.add(T.vec3(w, w.mul(.6), w.negate()));
  const q = warped.mul(T.vec3(.42, 1.35, .9));                          // stretch: longer strokes along x
  const cell = T.floor(q);
  const v = T.mx_cell_noise_float(cell);                                // one random value per dab
  const n = T.vec3(T.mx_cell_noise_float(cell.add(17.3)), T.mx_cell_noise_float(cell.add(41.7)), T.mx_cell_noise_float(cell.add(73.1)));
  const fine = T.mx_cell_noise_float(T.floor(warped.mul(T.vec3(1.1, 3.2, 2.2))));   // smaller dabs on top
  return { v, n, fine };
}

const paintCache = new Map();
// returns a painterly version of a standard material (cached per material)
//   opts.local: use the object's own space (for moving characters, so strokes stick to them)
//   opts.freq: dab density (world units: ~3.2 dabs per unit)
export function paintMaterial(mat, opts = {}) {
  if (!mat || !(mat.isMeshStandardMaterial) || mat.isPainted) return mat;
  const key = mat.uuid + (opts.local ? 'L' + opts.freq : 'W');
  if (paintCache.has(key)) return paintCache.get(key);
  const m = new T.MeshStandardNodeMaterial();
  ['color', 'emissive'].forEach(k => m[k].copy(mat[k]));
  ['emissiveIntensity', 'roughness', 'metalness', 'side', 'vertexColors', 'transparent', 'opacity', 'map', 'flatShading', 'alphaTest', 'depthWrite'].forEach(k => { m[k] = mat[k]; });
  m.name = mat.name; m.isPainted = true; m.userData.unpainted = mat;
  // characters use their rest-pose shape (positionGeometry), so the dabs stay glued to the clothes while the bones move
  const space = opts.local ? T.positionGeometry : T.positionWorld;
  const d = dabs(space, opts.freq || 2.4);
  const base = mat.vertexColors ? T.materialColor.mul(T.vertexColor()) : T.materialColor;
  const shade = T.mix(.82, 1.18, d.v).mul(T.mix(.93, 1.07, d.fine)); // softer than before: busy strokes turn to mush on a projector
  const tint = T.mix(PAINT_COOL, PAINT_WARM, d.v);
  m.colorNode = T.vec4(T.mix(base.rgb.mul(shade), tint.mul(base.rgb.length().mul(.75)), .13), 1);
  m.normalNode = T.normalize(T.normalView.add(d.n.sub(.5).mul(.85)));   // each dab catches the light its own way
  m.roughness = Math.max(.75, mat.roughness ?? .8);
  paintCache.set(key, m);
  return m;
}

// dark ink outline around a mesh (works on skinned meshes too: the hull is pushed out after skinning)
const outlineCache = new Map();
export function addOutline(mesh, width = .02, col = '#1A1433') {
  const k = width + col;
  if (!outlineCache.has(k)) {
    const om = new T.MeshBasicNodeMaterial({ color: col, side: THREE.BackSide });
    om.positionNode = T.positionLocal.add(T.normalLocal.mul(width));
    outlineCache.set(k, om);
  }
  const mat = outlineCache.get(k);
  let o;
  if (mesh.isSkinnedMesh) { o = new THREE.SkinnedMesh(mesh.geometry, mat); o.bind(mesh.skeleton, mesh.bindMatrix); o.frustumCulled = false; }
  else o = new THREE.Mesh(mesh.geometry, mat);
  o.position.copy(mesh.position); o.quaternion.copy(mesh.quaternion); o.scale.copy(mesh.scale);
  o.name = mesh.name + '_outline'; o.userData.isOutline = true; o.castShadow = false; o.receiveShadow = false;
  mesh.parent.add(o);
  return o;
}

// switch every painted material in a scene back to its plain version, or forward again
export function setPainted(scene, on) {
  scene.traverse(o => {
    if (o.userData.isOutline) { o.visible = on; return; }
    if (!o.isMesh || !o.material) return;
    if (!on && o.material.isPainted) { o.userData.painted = o.material; o.material = o.material.userData.unpainted; }
    else if (on && o.userData.painted) { o.material = o.userData.painted; }
  });
}
