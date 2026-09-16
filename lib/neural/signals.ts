import type { NeuralNetwork } from "./network";
import { clusteredNodeCount } from "./network";

/**
 * A small spiking-network simulation. Signals physically travel along edges;
 * on arrival a neuron fires, goes refractory, and re-emits down a subset of its
 * other connections. Cascades, waves and quiet regions are emergent — nothing
 * here is an animation timeline, which is why the network reads as alive.
 *
 * Structure-of-arrays with a fixed pool: no allocation happens per frame.
 */

export type SignalEngineOptions = {
  maxSignals?: number;
  seed?: number;
};

const REFRACTORY = 0.55;
const ACTIVATION_DECAY = 2.4;
const MAX_GENERATION = 7;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SignalEngine {
  readonly activation: Float32Array;
  readonly signalPosition: Float32Array;
  readonly signalTail: Float32Array;
  readonly signalIntensity: Float32Array;
  readonly maxSignals: number;

  private readonly network: NeuralNetwork;
  private readonly rng: () => number;
  private readonly lastFired: Float32Array;
  private readonly clusteredCount: number;

  private readonly sigFrom: Uint32Array;
  private readonly sigTo: Uint32Array;
  private readonly sigT: Float32Array;
  private readonly sigSpeed: Float32Array;
  private readonly sigIntensity: Float32Array;
  private readonly sigGeneration: Uint8Array;
  private readonly sigAlive: Uint8Array;

  private cursor = 0;
  private time = 0;
  private liveCount = 0;

  constructor(network: NeuralNetwork, options: SignalEngineOptions = {}) {
    const { maxSignals = 700, seed = 4242 } = options;
    this.network = network;
    this.maxSignals = maxSignals;
    this.rng = mulberry32(seed);
    this.clusteredCount = clusteredNodeCount(network);

    this.activation = new Float32Array(network.nodeCount);
    this.lastFired = new Float32Array(network.nodeCount).fill(-10);

    this.signalPosition = new Float32Array(maxSignals * 3);
    this.signalTail = new Float32Array(maxSignals * 3);
    this.signalIntensity = new Float32Array(maxSignals);

    this.sigFrom = new Uint32Array(maxSignals);
    this.sigTo = new Uint32Array(maxSignals);
    this.sigT = new Float32Array(maxSignals);
    this.sigSpeed = new Float32Array(maxSignals);
    this.sigIntensity = new Float32Array(maxSignals);
    this.sigGeneration = new Uint8Array(maxSignals);
    this.sigAlive = new Uint8Array(maxSignals);
  }

  get activeSignals(): number {
    return this.liveCount;
  }

  /** Emit along one edge. Returns false when the pool is saturated. */
  private emit(from: number, to: number, intensity: number, generation: number): boolean {
    for (let attempt = 0; attempt < this.maxSignals; attempt++) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % this.maxSignals;
      if (this.sigAlive[index]) continue;

      this.sigFrom[index] = from;
      this.sigTo[index] = to;
      this.sigT[index] = 0;
      this.sigSpeed[index] = 0.7 + this.rng() * 0.9;
      this.sigIntensity[index] = intensity;
      this.sigGeneration[index] = generation;
      this.sigAlive[index] = 1;
      this.liveCount++;
      return true;
    }
    return false;
  }

  /** Fire a neuron: spike it, then propagate down a few of its connections. */
  fire(node: number, intensity = 1, generation = 0, branching = 2): void {
    if (this.time - this.lastFired[node] < REFRACTORY) return;
    this.lastFired[node] = this.time;
    this.activation[node] = Math.max(this.activation[node], intensity);

    if (generation >= MAX_GENERATION || intensity < 0.12) return;

    const start = this.network.adjOffset[node];
    const end = this.network.adjOffset[node + 1];
    const degree = end - start;
    if (degree === 0) return;

    const branches = Math.min(degree, 1 + Math.floor(this.rng() * branching));
    const offset = Math.floor(this.rng() * degree);
    for (let b = 0; b < branches; b++) {
      const target = this.network.adjTarget[start + ((offset + b) % degree)];
      this.emit(node, target, intensity * (0.68 + this.rng() * 0.2), generation + 1);
    }
  }

  /** The rare event: one neuron lights the whole organism, ring by ring. */
  cascade(intensity = 1): void {
    const cluster = this.network.clusters[Math.floor(this.rng() * this.network.clusters.length)];
    const node = cluster.nodeStart + Math.floor(this.rng() * cluster.nodeCount);
    this.lastFired[node] = -10;
    this.fire(node, intensity, 0, 4);
  }

  /**
   * Wake one region deliberately. This is how a service or a project takes
   * ownership of part of the brain: its cluster starts firing while it is the
   * one being read, and settles again once the scroll moves on.
   */
  fireCluster(clusterIndex: number, count: number, intensity: number): void {
    const cluster = this.network.clusters[clusterIndex];
    if (!cluster) return;
    for (let i = 0; i < count; i++) {
      const node = cluster.nodeStart + Math.floor(this.rng() * cluster.nodeCount);
      this.fire(node, intensity * (0.7 + this.rng() * 0.3), 3, 2);
    }
  }

  /** Cursor presence wakes whatever it passes over. */
  fireNear(x: number, y: number, z: number, radius: number, budget = 2): void {
    const { positions } = this.network;
    let fired = 0;
    const step = 7; // sample rather than scan every node each frame
    const offset = Math.floor(this.rng() * step);
    for (let i = offset; i < this.clusteredCount && fired < budget; i += step) {
      const dx = positions[i * 3] - x;
      const dy = positions[i * 3 + 1] - y;
      const dz = positions[i * 3 + 2] - z;
      if (dx * dx + dy * dy + dz * dz < radius * radius) {
        this.fire(i, 0.55, 3, 1);
        fired++;
      }
    }
  }

  /**
   * @param energy 0 → 1, driven by scroll + cursor speed.
   * @param liveliness 0 → 1, the chapter's appetite for activity.
   */
  update(dt: number, energy: number, liveliness: number): void {
    this.time += dt;
    const { positions } = this.network;

    const decay = Math.exp(-ACTIVATION_DECAY * dt);
    for (let i = 0; i < this.activation.length; i++) this.activation[i] *= decay;

    const speedScale = 6 * (0.55 + energy * 1.35);

    for (let s = 0; s < this.maxSignals; s++) {
      if (!this.sigAlive[s]) {
        this.signalIntensity[s] = 0;
        continue;
      }

      const from = this.sigFrom[s];
      const to = this.sigTo[s];
      const fx = positions[from * 3];
      const fy = positions[from * 3 + 1];
      const fz = positions[from * 3 + 2];
      const tx = positions[to * 3];
      const ty = positions[to * 3 + 1];
      const tz = positions[to * 3 + 2];

      const length = Math.max(Math.hypot(tx - fx, ty - fy, tz - fz), 0.001);
      this.sigT[s] += (dt * this.sigSpeed[s] * speedScale) / length;

      if (this.sigT[s] >= 1) {
        this.sigAlive[s] = 0;
        this.liveCount--;
        this.signalIntensity[s] = 0;
        this.fire(to, this.sigIntensity[s], this.sigGeneration[s], 2);
        continue;
      }

      const t = this.sigT[s];
      // Trail length grows with speed, so fast scrolling stretches the light.
      const tail = Math.max(t - 0.09 - energy * 0.16, 0);

      this.signalPosition[s * 3] = fx + (tx - fx) * t;
      this.signalPosition[s * 3 + 1] = fy + (ty - fy) * t;
      this.signalPosition[s * 3 + 2] = fz + (tz - fz) * t;
      this.signalTail[s * 3] = fx + (tx - fx) * tail;
      this.signalTail[s * 3 + 1] = fy + (ty - fy) * tail;
      this.signalTail[s * 3 + 2] = fz + (tz - fz) * tail;
      this.signalIntensity[s] = this.sigIntensity[s];
    }

    // Spontaneous activity, weighted by each region's temperament.
    const attempts = Math.round((0.6 + energy * 3.4) * liveliness * 6);
    for (let a = 0; a < attempts; a++) {
      const cluster = this.network.clusters[Math.floor(this.rng() * this.network.clusters.length)];
      if (this.rng() > cluster.activity) continue;
      const node = cluster.nodeStart + Math.floor(this.rng() * cluster.nodeCount);
      this.fire(node, 0.45 + this.rng() * 0.4, 4, 2);
    }
  }

  /** Wind everything down for the closing chapter. */
  quiet(amount: number): void {
    if (amount <= 0) return;
    const keep = 1 - amount;
    for (let s = 0; s < this.maxSignals; s++) {
      if (this.sigAlive[s] && this.rng() > keep) {
        this.sigAlive[s] = 0;
        this.liveCount--;
        this.signalIntensity[s] = 0;
      }
    }
  }
}
