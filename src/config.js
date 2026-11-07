// =====================================================================
// Vampire Garlic Heist: tuning values and the village layout.
// World units: x runs west (-16) to east (+16), z runs north (-8.5) to south (+8.5).
// The castle fills the east side (x > CASTLE_X). Bats fly at FLY_Y.
// =====================================================================

// ---- gameplay tuning ----
export const CASTLE_X = 10.5;
export const FURNACE = { x: 13.3, z: 0, r: 1.45 };
export const FLY_Y = 2.2;
export const GRAB_TIME = 2;          // seconds hovering over garlic to grab it
export const GRAB_R = 0.95;          // how close a bat must hover
export const MAXV = 8.5;             // bat speed
export const CARRY_V = 6.0;          // bat speed while carrying garlic
export const ECHO_CD = 6, ECHO_R = 4.2, ECHO_DUR = 2.6;
export const IDLE_SLEEP = 25;        // seconds without input before a bat goes back to sleep
export const LIGHT_R0 = 2.1, LIGHT_R1 = 2.7; // watchman lantern radius at night / at dawn
export const NOTICE = 1.7;           // watchman notices a garlic carrier within LIGHT_R * NOTICE
export const LAMP_R = 1.6;           // street lamp light radius
export const LAMP_SLOW = 0.45;       // bats in lamp light fly at this share of their speed
export const THIRD_WATCHMAN_AT = 0.4; // share of the night after which the night shift starts

// ---- colours ----
export const ROOF_COLORS = ['#C9B8F5', '#9FE0C9', '#F4B183', '#F5A8D8', '#7FD6E0', '#F5D66B', '#F7A193'];
export const BAT_COLORS = ['#C9B8F5', '#9FE0C9', '#F07A6A', '#F5D66B', '#F4B183', '#7FD6E0', '#F5A8D8'];
export const BAT_NAMES = ['Mouse', 'Keys 1', 'Keys 2', 'Pad 1', 'Pad 2', 'Pad 3', 'Pad 4'];

// ---- streets: straight segments [x1, z1, x2, z2] plus the round plaza ----
export const STREET_W = 1.3;
export const PLAZA = { x: -2, z: 0, r: 2.6 };
export const STREETS = [
  [-15, -4.8, 8, -4.8],    // north lane
  [-15, 4.8, 8, 4.8],      // south lane
  [-15, -4.8, -15, 4.8],   // west lane
  [-10, -4.8, -10, 4.8],   // church lane
  [5, -4.8, 5, 4.8],       // east lane
  [-15, 0, -4.6, 0],       // west road into the plaza
  [0.6, 0, 10.5, 0],       // main road from the plaza to the castle gate
  [-2, -8.5, -2, -2.6],    // north road
  [-2, 2.6, -2, 8.5],      // south road
  [-0.2, -1.8, 3.2, -4.8], // north-east alley
  [-3.8, 1.8, -7.2, 4.8]   // south-west alley
];

// ---- houses: centre, size, door direction (f), optional tall / church ----
export const HOUSES = [
  // north row, doors face the north lane
  { x: -13.2, z: -7.0, w: 3.0, d: 1.9, f: [0, 1] },
  { x: -9.3, z: -7.0, w: 2.6, d: 1.9, f: [0, 1], tall: true },
  { x: -5.4, z: -7.1, w: 3.2, d: 1.8, f: [0, 1] },
  { x: 5.2, z: -7.0, w: 3.0, d: 1.9, f: [0, 1], tall: true },
  // south row, doors face the south lane
  { x: -13.2, z: 7.0, w: 3.0, d: 1.9, f: [0, -1], tall: true },
  { x: -9.0, z: 7.1, w: 2.4, d: 1.8, f: [0, -1] },
  { x: -5.4, z: 7.0, w: 3.0, d: 1.9, f: [0, -1] },
  { x: 1.6, z: 7.0, w: 3.0, d: 1.9, f: [0, -1], tall: true },
  { x: 6.0, z: 7.1, w: 2.8, d: 1.8, f: [0, -1] },
  // middle of the village, doors face the east-west roads
  { x: -12.8, z: -2.4, w: 2.8, d: 1.8, f: [0, 1] },
  { x: -12.8, z: 2.4, w: 2.8, d: 1.8, f: [0, -1], tall: true },
  { x: -7.0, z: -2.5, w: 3.2, d: 2.1, f: [0, 1], church: true },
  { x: -8.0, z: 2.3, w: 2.4, d: 1.8, f: [0, -1] },
  { x: 3.2, z: -1.9, w: 2.2, d: 1.7, f: [0, 1] },
  { x: 2.7, z: 2.2, w: 2.6, d: 1.7, f: [0, -1], tall: true },
  { x: 8.0, z: -2.4, w: 3.0, d: 1.8, f: [0, 1] },
  { x: 8.0, z: 2.4, w: 3.0, d: 1.8, f: [0, -1] }
];

// ---- watchmen patrol routes (on the streets) ----
export const PATHS = [
  [[-15, -4.8], [5, -4.8], [5, 4.8], [-15, 4.8]],               // the long outer round
  [[-10, -4.8], [-2, -4.8], [-2, -2.6], [-4.6, 0], [-10, 0]],    // church and plaza (west)
  [[5, 4.8], [-2, 4.8], [-2, 2.6], [0.6, 0], [5, 0]]             // night shift: plaza and main road (east)
];

// ---- street lamps on timers: on for `on` seconds, then off for `off` seconds ----
export const LAMPS = [
  { x: -10, z: 0, on: 6, off: 4, offset: 0 },
  { x: 5, z: 0, on: 6, off: 4, offset: 5 },
  { x: -2, z: -4.8, on: 5, off: 5, offset: 2.5 },
  { x: -2, z: 4.8, on: 5, off: 5, offset: 7.5 }
];

// ---- decoration ----
export const TREES = [[-15.3, -6.8], [-15.3, 6.8], [-11.0, 7.9], [3.85, 8.0],
  [9.2, -7.5], [9.2, 7.5], [-4.4, -3.4], [-0.4, -3.5], [-3.2, 3.6]];
export const GRAVEYARD = { x: 1.6, z: -7.0, w: 3.2, d: 2.2 };
export const STALLS = [{ x: -1.2, z: -1.65, color: '#F07A6A' }, { x: -2.8, z: 1.65, color: '#7FD6E0' }];
