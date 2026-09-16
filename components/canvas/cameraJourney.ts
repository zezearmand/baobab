import * as THREE from "three";

/**
 * The scroll is a single continuous camera move through one universe — never a
 * set of section swaps. Waypoints are evenly spaced in curve parameter (we use
 * getPoint, not getPointAt, precisely so spacing stays under our control):
 * two waypoints far apart in space but adjacent in t means the camera covers
 * that ground fast. That is how the scale reveal gets its violence.
 *
 * Index → t mapping is i / (count - 1), and the seven chapters land on:
 *   hero .000–.143 · services .143–.286 · portfolio .286–.429
 *   technology .429–.571 · process .571–.714 · pricing .714–.857 · contact .857–1
 */

const CAMERA_POINTS: Array<[number, number, number]> = [
  [0, 6, 215], // 00 · almost nothing. a few distant points.
  [2, 5, 150], // 01 · first neuron wakes
  [7, 5, 98], //  02 · the network answers
  [12, 7, 60], // 03 · constellation resolves
  [6, 10, 38], // 04 · descending in
  [-8, 12, 22], // 05 · among the crown clusters
  [-16, 9, 12], // 06 · inside the canopy of connections
  [0, 7, 6], //   07 · threading between neurons
  [9, 10, 1], //  08 · approaching one neuron
  [4.9, 11.5, -2.1], // 09 · INSIDE it — a second universe
  [0, 22, 98], // 10 · THE REVEAL: violent pull-back, whole organism in frame
  [0, 17, 84], // 11 · the organism, breathing
  [0, 12, 72], // 12 · settling, quiet
  [-6, 10, 66], // 13 · slow lateral drift
  [-4, 8, 60], // 14 · stillness
  [0, 7, 54], //  15 · closer, calm
  [2, 5, 46], //  16 · activity fading
  [0, 4, 38], //  17 · one region left alive
  [0, 3, 30], //  18 · convergence
];

const FOCUS_POINTS: Array<[number, number, number]> = [
  [0, 4, 0],
  [0, 4, 0],
  [0, 5, 0],
  [0, 6, 0],
  [0, 8, 0],
  [-4, 9, 0],
  [-6, 8, 2],
  [4, 9, -2],
  [4, 11.5, -3],
  [4, 11.5, -3],
  [0, 2, 0],
  [0, 3, 0],
  [0, 4, 0],
  [0, 4, 0],
  [0, 4, 0],
  [0, 4, 0],
  [0, 3, 0],
  [0, 2, 0],
  [0, 1, 0],
];

export function createCameraJourney() {
  const path = new THREE.CatmullRomCurve3(
    CAMERA_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.25
  );
  const focus = new THREE.CatmullRomCurve3(
    FOCUS_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.25
  );
  return { path, focus };
}

export function fovAt(u: number): number {
  if (u < 0.33) return THREE.MathUtils.lerp(32, 46, u / 0.33);
  if (u < 0.5) return THREE.MathUtils.lerp(46, 78, (u - 0.33) / 0.17); // inside the neuron
  if (u < 0.58) return THREE.MathUtils.lerp(78, 40, (u - 0.5) / 0.08); // snap back for the reveal
  return THREE.MathUtils.lerp(40, 30, (u - 0.58) / 0.42);
}

function ramp(value: number, from: number, to: number): number {
  return THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export type UniverseSignals = {
  /** Structure fading up from nothing during the awakening. */
  reveal: number;
  /** How hard the network is firing right now. */
  liveliness: number;
  /** The nested universe inside a single neuron. */
  microVisibility: number;
  /** Everything drawing toward the core at the very end. */
  converge: number;
  /** Overall structure brightness — dimmed where the page must be read. */
  structureOpacity: number;
  /** Backdrop stars/nebula strength. */
  cosmosOpacity: number;
};

export function signalsAt(u: number): UniverseSignals {
  // Awakening: the structure itself fades up only after the first neurons fire.
  const reveal = smooth(ramp(u, 0.012, 0.16));

  // Activity arc: wakes, builds through the exploration chapters, peaks at the
  // reveal, then decays to almost nothing so the ending can be silent.
  const wake = smooth(ramp(u, 0.02, 0.12));
  const explore = smooth(ramp(u, 0.16, 0.3)) * 0.75;
  const peak = smooth(ramp(u, 0.43, 0.56)) * 1.2;
  const decay = smooth(ramp(u, 0.6, 0.92));
  const liveliness = THREE.MathUtils.clamp((wake * 0.45 + explore + peak) * (1 - decay * 0.94), 0.02, 1.6);

  const microVisibility = smooth(ramp(u, 0.44, 0.49)) * (1 - smooth(ramp(u, 0.52, 0.57)));
  const converge = smooth(ramp(u, 0.9, 1));

  const structureOpacity = intensityAt(u);
  const cosmosOpacity = THREE.MathUtils.lerp(0.55, 1, structureOpacity);

  return { reveal, liveliness, microVisibility, converge, structureOpacity, cosmosOpacity };
}

/**
 * The intensity score, chapter by chapter. This is the motion-contrast curve
 * and the legibility curve at once: spectacle chapters run the universe at
 * full strength, reading chapters pull it back so type always wins.
 *
 *   hero ███ · services ▄▄ · portfolio ▄▄ · technology ███ (the reveal)
 *   process ▁ · pricing ▁ · contact ▄→███ (the final signal)
 */
const INTENSITY_KEYS: Array<[number, number]> = [
  [0.0, 1.0],
  [0.13, 1.0],
  [0.17, 0.6],
  [0.28, 0.58],
  [0.32, 0.5],
  [0.42, 0.5],
  [0.46, 1.0],
  [0.58, 1.0],
  [0.63, 0.34],
  [0.84, 0.3],
  [0.9, 0.45],
  [0.96, 1.0],
  [1.0, 0.85],
];

function intensityAt(u: number): number {
  for (let i = 0; i < INTENSITY_KEYS.length - 1; i++) {
    const [uA, vA] = INTENSITY_KEYS[i];
    const [uB, vB] = INTENSITY_KEYS[i + 1];
    if (u >= uA && u <= uB) {
      return THREE.MathUtils.lerp(vA, vB, smooth((u - uA) / Math.max(uB - uA, 1e-6)));
    }
  }
  return INTENSITY_KEYS[INTENSITY_KEYS.length - 1][1];
}

/**
 * Which region of the brain belongs to which piece of content. Reading about a
 * service wakes its cluster and turns the camera toward it, so the copy and the
 * world are describing the same thing at the same time.
 */
export const SERVICE_CLUSTERS = [0, 2, 3, 6, 9, 10];
export const PROJECT_CLUSTERS = [1, 4, 8, 12, 14];

/**
 * Scripted one-shot events. Each fires once, when the scroll first crosses it.
 * These are the moments the whole composition is built around.
 */
export const CASCADE_TRIGGERS: Array<{ at: number; intensity: number; label: string }> = [
  { at: 0.045, intensity: 1, label: "first-contact" },
  { at: 0.075, intensity: 1, label: "network-answers" },
  { at: 0.2, intensity: 0.85, label: "services-wake" },
  { at: 0.345, intensity: 0.9, label: "constellation" },
  { at: 0.47, intensity: 1, label: "micro-dive" },
  { at: 0.55, intensity: 1, label: "scale-reveal" },
  { at: 0.955, intensity: 1, label: "final-signal" },
];
