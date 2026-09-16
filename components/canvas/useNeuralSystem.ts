import * as THREE from "three";
import { useMemo } from "react";
import {
  NODE_VERTEX,
  NODE_FRAGMENT,
  EDGE_VERTEX,
  EDGE_FRAGMENT,
  SIGNAL_VERTEX,
  SIGNAL_FRAGMENT,
  TRAIL_VERTEX,
  TRAIL_FRAGMENT,
} from "./shaders/neural.glsl";
import { buildNeuralNetwork, type NeuralNetwork } from "@/lib/neural/network";
import { SignalEngine } from "@/lib/neural/signals";

export type NeuralSystem = ReturnType<typeof createNeuralSystem>;

type Params = {
  seed: number;
  nodeBudget: number;
  fieldNodes: number;
  maxSignals: number;
  nodeSize: number;
  signalSize: number;
  scale: number;
};

function createActivationTexture(nodeCount: number) {
  const size = Math.ceil(Math.sqrt(nodeCount));
  const data = new Float32Array(size * size);
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.FloatType);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return { texture, data, size };
}

function createNeuralSystem(params: Params) {
  const network: NeuralNetwork = buildNeuralNetwork({
    seed: params.seed,
    nodeBudget: params.nodeBudget,
    fieldNodes: params.fieldNodes,
    scale: params.scale,
  });

  const engine = new SignalEngine(network, { maxSignals: params.maxSignals, seed: params.seed + 7 });
  const activation = createActivationTexture(network.nodeCount);

  const shared = {
    uTime: { value: 0 },
    uActivation: { value: activation.texture },
    uActivationSize: { value: activation.size },
    uStructureColor: { value: new THREE.Color("#cdd9e8") },
    uAccentColor: { value: new THREE.Color("#f0b667") },
    uOpacity: { value: 1 },
    uReveal: { value: 0 },
    uEnergy: { value: 0 },
    uDpr: { value: 1 },
  };

  // ---- neurons ------------------------------------------------------------

  const nodeGeometry = new THREE.BufferGeometry();
  const nodeIndices = new Float32Array(network.nodeCount);
  const nodeClusterAttr = new Float32Array(network.nodeCount);
  for (let i = 0; i < network.nodeCount; i++) {
    nodeIndices[i] = i;
    nodeClusterAttr[i] = network.nodeCluster[i];
  }
  nodeGeometry.setAttribute("position", new THREE.BufferAttribute(network.positions, 3));
  nodeGeometry.setAttribute("aSeed", new THREE.BufferAttribute(network.nodeSeed, 1));
  nodeGeometry.setAttribute("aNodeSize", new THREE.BufferAttribute(network.nodeSize, 1));
  nodeGeometry.setAttribute("aIndex", new THREE.BufferAttribute(nodeIndices, 1));
  nodeGeometry.setAttribute("aCluster", new THREE.BufferAttribute(nodeClusterAttr, 1));
  nodeGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), network.radius * 1.4);

  const nodeUniforms = {
    ...shared,
    uSize: { value: params.nodeSize },
    uCursor: { value: new THREE.Vector3(9999, 9999, 9999) },
    uCursorInfluence: { value: 0 },
  };

  const nodeMaterial = new THREE.ShaderMaterial({
    vertexShader: NODE_VERTEX,
    fragmentShader: NODE_FRAGMENT,
    uniforms: nodeUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // ---- connections --------------------------------------------------------

  const edgePositions = new Float32Array(network.edgeCount * 2 * 3);
  const edgeIndexA = new Float32Array(network.edgeCount * 2);
  const edgeIndexB = new Float32Array(network.edgeCount * 2);
  const edgeEnd = new Float32Array(network.edgeCount * 2);
  const edgeSeed = new Float32Array(network.edgeCount * 2);

  for (let e = 0; e < network.edgeCount; e++) {
    const a = network.edges[e * 2];
    const b = network.edges[e * 2 + 1];
    const seed = ((e * 2654435761) % 1000) / 1000;

    for (let end = 0; end < 2; end++) {
      const vertex = e * 2 + end;
      const node = end === 0 ? a : b;
      edgePositions[vertex * 3] = network.positions[node * 3];
      edgePositions[vertex * 3 + 1] = network.positions[node * 3 + 1];
      edgePositions[vertex * 3 + 2] = network.positions[node * 3 + 2];
      edgeIndexA[vertex] = a;
      edgeIndexB[vertex] = b;
      edgeEnd[vertex] = end;
      edgeSeed[vertex] = seed;
    }
  }

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
  edgeGeometry.setAttribute("aIndexA", new THREE.BufferAttribute(edgeIndexA, 1));
  edgeGeometry.setAttribute("aIndexB", new THREE.BufferAttribute(edgeIndexB, 1));
  edgeGeometry.setAttribute("aEnd", new THREE.BufferAttribute(edgeEnd, 1));
  edgeGeometry.setAttribute("aSeed", new THREE.BufferAttribute(edgeSeed, 1));
  edgeGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), network.radius * 1.4);

  const edgeMaterial = new THREE.ShaderMaterial({
    vertexShader: EDGE_VERTEX,
    fragmentShader: EDGE_FRAGMENT,
    uniforms: { ...shared },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // ---- travelling charges -------------------------------------------------

  const signalGeometry = new THREE.BufferGeometry();
  signalGeometry.setAttribute("position", new THREE.BufferAttribute(engine.signalPosition, 3));
  signalGeometry.setAttribute("aIntensity", new THREE.BufferAttribute(engine.signalIntensity, 1));
  signalGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), network.radius * 1.4);

  const signalUniforms = {
    uSize: { value: params.signalSize },
    uDpr: shared.uDpr,
    uAccentColor: shared.uAccentColor,
    uOpacity: { value: 1 },
  };

  const signalMaterial = new THREE.ShaderMaterial({
    vertexShader: SIGNAL_VERTEX,
    fragmentShader: SIGNAL_FRAGMENT,
    uniforms: signalUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Head + tail vertex per signal, drawn as a streak behind the charge.
  const trailPositions = new Float32Array(params.maxSignals * 2 * 3);
  const trailIntensity = new Float32Array(params.maxSignals * 2);
  const trailEnd = new Float32Array(params.maxSignals * 2);
  for (let s = 0; s < params.maxSignals; s++) {
    trailEnd[s * 2] = 0;
    trailEnd[s * 2 + 1] = 1;
  }

  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute("aIntensity", new THREE.BufferAttribute(trailIntensity, 1));
  trailGeometry.setAttribute("aEnd", new THREE.BufferAttribute(trailEnd, 1));
  trailGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), network.radius * 1.4);

  const trailMaterial = new THREE.ShaderMaterial({
    vertexShader: TRAIL_VERTEX,
    fragmentShader: TRAIL_FRAGMENT,
    uniforms: { uAccentColor: shared.uAccentColor, uOpacity: signalUniforms.uOpacity },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  /** Push one frame of simulation state to the GPU. */
  function sync() {
    activation.data.set(engine.activation);
    activation.texture.needsUpdate = true;

    (signalGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (signalGeometry.getAttribute("aIntensity") as THREE.BufferAttribute).needsUpdate = true;

    for (let s = 0; s < params.maxSignals; s++) {
      const intensity = engine.signalIntensity[s];
      trailIntensity[s * 2] = intensity;
      trailIntensity[s * 2 + 1] = intensity;
      trailPositions[s * 6] = engine.signalTail[s * 3];
      trailPositions[s * 6 + 1] = engine.signalTail[s * 3 + 1];
      trailPositions[s * 6 + 2] = engine.signalTail[s * 3 + 2];
      trailPositions[s * 6 + 3] = engine.signalPosition[s * 3];
      trailPositions[s * 6 + 4] = engine.signalPosition[s * 3 + 1];
      trailPositions[s * 6 + 5] = engine.signalPosition[s * 3 + 2];
    }
    (trailGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (trailGeometry.getAttribute("aIntensity") as THREE.BufferAttribute).needsUpdate = true;
  }

  function dispose() {
    nodeGeometry.dispose();
    edgeGeometry.dispose();
    signalGeometry.dispose();
    trailGeometry.dispose();
    nodeMaterial.dispose();
    edgeMaterial.dispose();
    signalMaterial.dispose();
    trailMaterial.dispose();
    activation.texture.dispose();
  }

  return {
    network,
    engine,
    shared,
    nodeGeometry,
    nodeMaterial,
    nodeUniforms,
    edgeGeometry,
    edgeMaterial,
    signalGeometry,
    signalMaterial,
    signalUniforms,
    trailGeometry,
    trailMaterial,
    sync,
    dispose,
  };
}

export function useNeuralSystem(params: Params) {
  return useMemo(
    () => createNeuralSystem(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.seed, params.nodeBudget, params.fieldNodes, params.maxSignals, params.nodeSize, params.signalSize, params.scale]
  );
}
