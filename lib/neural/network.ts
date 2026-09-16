import * as THREE from "three";

/**
 * The universe is composed, not scattered. Clusters are placed deliberately
 * across three regions whose combined silhouette only resolves when the camera
 * pulls far enough back — that late reveal is the brand payoff, and it is the
 * only moment the baobab is ever suggested.
 *
 * Connections follow the same principle: dense local wiring inside a cluster,
 * a few long axons between clusters, so a signal can genuinely cross the whole
 * organism instead of dying in a local blob.
 */

export type ClusterKind = "dense" | "sparse" | "active" | "dormant" | "emerging";

export type Cluster = {
  center: THREE.Vector3;
  radius: number;
  kind: ClusterKind;
  /** Baseline chance this cluster fires on its own. */
  activity: number;
  nodeStart: number;
  nodeCount: number;
};

export type NeuralNetwork = {
  nodeCount: number;
  edgeCount: number;
  positions: Float32Array;
  nodeSeed: Float32Array;
  nodeSize: Float32Array;
  nodeCluster: Uint16Array;
  /** Flat pairs [a0,b0, a1,b1, …]. */
  edges: Uint32Array;
  /** CSR adjacency so signal propagation never allocates. */
  adjOffset: Uint32Array;
  adjTarget: Uint32Array;
  adjEdge: Uint32Array;
  clusters: Cluster[];
  /** Node the micro-scale universe is nested inside. */
  microAnchor: THREE.Vector3;
  radius: number;
};

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

/** Box–Muller, so clusters fall off smoothly instead of ending at a hard shell. */
function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-6);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

class SpatialHash {
  private readonly cells = new Map<number, number[]>();
  private readonly inv: number;

  constructor(private readonly cellSize: number) {
    this.inv = 1 / cellSize;
  }

  private hash(x: number, y: number, z: number): number {
    return (
      (Math.floor(x * this.inv) * 73856093) ^
      (Math.floor(y * this.inv) * 19349663) ^
      (Math.floor(z * this.inv) * 83492791)
    );
  }

  insert(index: number, x: number, y: number, z: number) {
    const key = this.hash(x, y, z);
    const bucket = this.cells.get(key);
    if (bucket) bucket.push(index);
    else this.cells.set(key, [index]);
  }

  near(x: number, y: number, z: number, out: number[]): number[] {
    out.length = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = this.cells.get(
            this.hash(x + dx * this.cellSize, y + dy * this.cellSize, z + dz * this.cellSize)
          );
          if (bucket) out.push(...bucket);
        }
      }
    }
    return out;
  }
}

type ClusterBlueprint = {
  center: [number, number, number];
  radius: number;
  kind: ClusterKind;
  weight: number;
};

/**
 * Region layout. Read from very far away the three bands stack into one
 * organic mass — crown, column, roots — which is all the silhouette needs.
 */
const BLUEPRINTS: ClusterBlueprint[] = [
  // Crown — wide, airy, the part the camera explores first.
  { center: [-14, 8.5, -6], radius: 5.2, kind: "dense", weight: 1.25 },
  { center: [-6, 10.5, 4], radius: 4.4, kind: "emerging", weight: 0.9 },
  { center: [4, 11.5, -3], radius: 5.6, kind: "active", weight: 1.2 },
  { center: [13, 8, 5], radius: 5.0, kind: "dense", weight: 1.15 },
  { center: [-11, 6, 9], radius: 3.8, kind: "sparse", weight: 0.55 },
  { center: [9, 6.5, -11], radius: 4.2, kind: "dormant", weight: 0.6 },
  { center: [0, 13, 0], radius: 4.8, kind: "active", weight: 1.1 },
  { center: [-18, 5.5, 2], radius: 3.4, kind: "sparse", weight: 0.5 },
  { center: [17, 4.5, -6], radius: 3.6, kind: "emerging", weight: 0.7 },

  // Column — the dense spine signals travel up and down.
  { center: [0, 3, 0], radius: 3.0, kind: "dense", weight: 1.35 },
  { center: [-1.5, -0.5, 1.5], radius: 2.6, kind: "active", weight: 1.2 },
  { center: [1.8, -3.5, -1], radius: 2.8, kind: "dense", weight: 1.1 },

  // Roots — spreading, quieter, mirrored under the column.
  { center: [-9, -7, -4], radius: 4.2, kind: "dormant", weight: 0.75 },
  { center: [7, -8, 3], radius: 4.6, kind: "sparse", weight: 0.7 },
  { center: [-3, -10.5, 7], radius: 3.8, kind: "emerging", weight: 0.65 },
  { center: [12, -6, -8], radius: 3.4, kind: "sparse", weight: 0.55 },
  { center: [-15, -5.5, 5], radius: 3.2, kind: "dormant", weight: 0.5 },
  { center: [2, -12.5, -5], radius: 3.6, kind: "sparse", weight: 0.6 },
];

const ACTIVITY: Record<ClusterKind, number> = {
  dense: 0.55,
  active: 1,
  emerging: 0.7,
  sparse: 0.3,
  dormant: 0.12,
};

export type NetworkOptions = {
  seed?: number;
  nodeBudget?: number;
  /** Extra unclustered nodes drifting between regions, for depth. */
  fieldNodes?: number;
  scale?: number;
};

export function buildNeuralNetwork(options: NetworkOptions = {}): NeuralNetwork {
  const { seed = 1337, nodeBudget = 2600, fieldNodes = 420, scale = 1 } = options;
  const rng = mulberry32(seed);

  const totalWeight = BLUEPRINTS.reduce((sum, b) => sum + b.weight, 0);
  const clusters: Cluster[] = [];

  const positions: number[] = [];
  const nodeCluster: number[] = [];
  const nodeSize: number[] = [];
  const nodeSeed: number[] = [];

  BLUEPRINTS.forEach((blueprint, index) => {
    const count = Math.max(24, Math.round((blueprint.weight / totalWeight) * nodeBudget));
    const center = new THREE.Vector3(...blueprint.center).multiplyScalar(scale);
    const radius = blueprint.radius * scale;
    const nodeStart = positions.length / 3;

    for (let i = 0; i < count; i++) {
      // Sparse clusters spread wider and thinner; dense ones pull inward.
      const spread = blueprint.kind === "sparse" || blueprint.kind === "dormant" ? 0.52 : 0.34;
      positions.push(
        center.x + gaussian(rng) * radius * spread,
        center.y + gaussian(rng) * radius * spread * 0.75,
        center.z + gaussian(rng) * radius * spread
      );
      nodeCluster.push(index);
      nodeSize.push(0.35 + Math.pow(rng(), 3) * 1.9);
      nodeSeed.push(rng());
    }

    clusters.push({
      center,
      radius,
      kind: blueprint.kind,
      activity: ACTIVITY[blueprint.kind],
      nodeStart,
      nodeCount: count,
    });
  });

  // Field nodes: not part of any cluster, they exist to give the void scale.
  for (let i = 0; i < fieldNodes; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = (14 + Math.pow(rng(), 0.6) * 26) * scale;
    positions.push(
      Math.sin(phi) * Math.cos(theta) * r,
      Math.cos(phi) * r * 0.7 + 1,
      Math.sin(phi) * Math.sin(theta) * r
    );
    nodeCluster.push(0xffff);
    nodeSize.push(0.25 + Math.pow(rng(), 4) * 1.1);
    nodeSeed.push(rng());
  }

  const nodeCount = positions.length / 3;
  const positionArray = new Float32Array(positions);

  // ---- wiring -------------------------------------------------------------

  const edgeSet = new Set<number>();
  const edgePairs: number[] = [];
  const addEdge = (a: number, b: number) => {
    if (a === b) return;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = lo * nodeCount + hi;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edgePairs.push(lo, hi);
  };

  const hash = new SpatialHash(4 * scale);
  for (let i = 0; i < nodeCount; i++) {
    hash.insert(i, positionArray[i * 3], positionArray[i * 3 + 1], positionArray[i * 3 + 2]);
  }

  const candidates: number[] = [];
  const ranked: Array<{ index: number; dist: number }> = [];

  for (let i = 0; i < nodeCount; i++) {
    const isField = nodeCluster[i] === 0xffff;
    const cluster = isField ? null : clusters[nodeCluster[i]];
    // Dense regions wire tightly and often; sparse ones keep long thin threads.
    const degree = isField ? 1 : cluster!.kind === "dense" ? 4 : cluster!.kind === "sparse" ? 2 : 3;
    const reach = (isField ? 9 : cluster!.kind === "sparse" ? 6 : 3.6) * scale;

    const x = positionArray[i * 3];
    const y = positionArray[i * 3 + 1];
    const z = positionArray[i * 3 + 2];

    ranked.length = 0;
    for (const j of hash.near(x, y, z, candidates)) {
      if (j === i) continue;
      const dx = positionArray[j * 3] - x;
      const dy = positionArray[j * 3 + 1] - y;
      const dz = positionArray[j * 3 + 2] - z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= reach) ranked.push({ index: j, dist });
    }
    ranked.sort((a, b) => a.dist - b.dist);
    for (let k = 0; k < Math.min(degree, ranked.length); k++) addEdge(i, ranked[k].index);
  }

  // Long axons: every cluster reaches its two nearest neighbours, so activation
  // can cross regions and the whole thing behaves as one organism.
  for (let a = 0; a < clusters.length; a++) {
    const distances = clusters
      .map((cluster, index) => ({ index, dist: cluster.center.distanceTo(clusters[a].center) }))
      .filter((entry) => entry.index !== a)
      .sort((x, y) => x.dist - y.dist)
      .slice(0, 2);

    for (const { index: b } of distances) {
      const links = 2 + Math.floor(rng() * 2);
      for (let l = 0; l < links; l++) {
        const from = clusters[a].nodeStart + Math.floor(rng() * clusters[a].nodeCount);
        const to = clusters[b].nodeStart + Math.floor(rng() * clusters[b].nodeCount);
        addEdge(from, to);
      }
    }
  }

  const edgeCount = edgePairs.length / 2;
  const edges = new Uint32Array(edgePairs);

  // ---- CSR adjacency ------------------------------------------------------

  const counts = new Uint32Array(nodeCount);
  for (let e = 0; e < edgeCount; e++) {
    counts[edges[e * 2]]++;
    counts[edges[e * 2 + 1]]++;
  }
  const adjOffset = new Uint32Array(nodeCount + 1);
  for (let i = 0; i < nodeCount; i++) adjOffset[i + 1] = adjOffset[i] + counts[i];

  const cursor = adjOffset.slice(0, nodeCount);
  const adjTarget = new Uint32Array(edgeCount * 2);
  const adjEdge = new Uint32Array(edgeCount * 2);
  for (let e = 0; e < edgeCount; e++) {
    const a = edges[e * 2];
    const b = edges[e * 2 + 1];
    adjTarget[cursor[a]] = b;
    adjEdge[cursor[a]] = e;
    cursor[a]++;
    adjTarget[cursor[b]] = a;
    adjEdge[cursor[b]] = e;
    cursor[b]++;
  }

  let radius = 0;
  for (let i = 0; i < nodeCount; i++) {
    const d = Math.hypot(positionArray[i * 3], positionArray[i * 3 + 1], positionArray[i * 3 + 2]);
    if (d > radius) radius = d;
  }

  return {
    nodeCount,
    edgeCount,
    positions: positionArray,
    nodeSeed: new Float32Array(nodeSeed),
    nodeSize: new Float32Array(nodeSize),
    nodeCluster: new Uint16Array(nodeCluster),
    edges,
    adjOffset,
    adjTarget,
    adjEdge,
    clusters,
    // The dive target: a node in the active crown cluster.
    microAnchor: clusters[2].center.clone(),
    radius,
  };
}

/** Field nodes start after every cluster's nodes; used to skip them when firing. */
export function clusteredNodeCount(network: NeuralNetwork): number {
  const last = network.clusters[network.clusters.length - 1];
  return last.nodeStart + last.nodeCount;
}
