import { NOISE_GLSL } from "./noise.glsl";

/**
 * Shared conventions across the three passes:
 *   - Structure (nodes, edges) is cool white and mostly dim.
 *   - The single warm accent is reserved for activation. Nothing else uses it,
 *     so the eye reads warmth as "this is alive right now".
 *   - Activation lives in a data texture, one texel per neuron, so the edge
 *     pass can light itself from its endpoints without any CPU work per edge.
 */

const ACTIVATION_LOOKUP = /* glsl */ `
  uniform sampler2D uActivation;
  uniform float uActivationSize;

  float readActivation(float nodeIndex) {
    float x = mod(nodeIndex, uActivationSize);
    float y = floor(nodeIndex / uActivationSize);
    vec2 uv = (vec2(x, y) + 0.5) / uActivationSize;
    return texture2D(uActivation, uv).r;
  }
`;

export const NODE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uDpr;
  uniform float uReveal;
  uniform float uEnergy;
  uniform vec3 uCursor;
  uniform float uCursorInfluence;

  attribute float aSeed;
  attribute float aNodeSize;
  attribute float aIndex;
  attribute float aCluster;

  varying float vActivation;
  varying float vSeed;
  varying float vDepth;

  ${ACTIVATION_LOOKUP}
  ${NOISE_GLSL}

  void main() {
    float activation = readActivation(aIndex);

    vec3 pos = position;
    // Everything drifts, always — the universe is never fully still.
    pos += curlNoise(position * 0.035 + aSeed * 8.0 + uTime * 0.015) * (0.28 + uEnergy * 0.3);

    // The cursor bends space locally rather than shoving particles around.
    vec3 toCursor = uCursor - pos;
    float cursorDist = length(toCursor);
    float pull = smoothstep(9.0, 0.0, cursorDist) * uCursorInfluence;
    pos += normalize(toCursor + 0.0001) * pull * 0.9;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float attenuation = 260.0 / max(-mvPosition.z, 0.001);
    float size = uSize * aNodeSize * attenuation * uDpr;
    // Firing neurons swell briefly; that spike is most of the read.
    size *= 1.0 + activation * 2.2 + pull * 0.6;
    gl_PointSize = clamp(size, 0.0, 64.0) * uReveal;

    vActivation = activation;
    vSeed = aSeed;
    vDepth = -mvPosition.z;
  }
`;

export const NODE_FRAGMENT = /* glsl */ `
  uniform vec3 uStructureColor;
  uniform vec3 uAccentColor;
  uniform float uOpacity;
  uniform float uTime;

  varying float vActivation;
  varying float vSeed;
  varying float vDepth;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.0, d);
    float halo = pow(core, 3.0);

    // Idle shimmer keeps dormant regions from looking like dead pixels.
    float breathe = 0.75 + 0.25 * sin(uTime * 0.6 + vSeed * 31.4);

    vec3 color = mix(uStructureColor, uAccentColor, clamp(vActivation * 1.4, 0.0, 1.0));
    color = mix(color, vec3(1.0), halo * (0.25 + vActivation * 0.6));

    // A resting neuron is never invisible — the structure has to be felt even
    // when nothing is firing, or the universe reads as empty black.
    float atmosphere = 1.0 - smoothstep(60.0, 220.0, vDepth);
    float alpha = core * uOpacity * (0.32 + vActivation * 0.78) * breathe;
    alpha *= mix(0.3, 1.0, atmosphere);

    gl_FragColor = vec4(color, alpha);
  }
`;

export const EDGE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uEnergy;

  attribute float aIndexA;
  attribute float aIndexB;
  attribute float aEnd;
  attribute float aSeed;

  varying float vCharge;
  varying float vSeed;
  varying float vDepth;
  varying float vAlongFade;

  ${ACTIVATION_LOOKUP}

  void main() {
    float a = readActivation(aIndexA);
    float b = readActivation(aIndexB);
    // A connection brightens from whichever end just fired.
    vCharge = mix(a, b, aEnd) * 0.75 + max(a, b) * 0.25;
    vAlongFade = aEnd;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vSeed = aSeed;
    vDepth = -mvPosition.z;
  }
`;

export const EDGE_FRAGMENT = /* glsl */ `
  uniform vec3 uStructureColor;
  uniform vec3 uAccentColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uReveal;

  varying float vCharge;
  varying float vSeed;
  varying float vDepth;
  varying float vAlongFade;

  void main() {
    // Connections appear and fade on their own slow cycles, so the wiring
    // itself looks like it is being formed and forgotten.
    float lifecycle = 0.55 + 0.45 * sin(uTime * 0.18 + vSeed * 43.0);
    float base = 0.12 * lifecycle;

    vec3 color = mix(uStructureColor, uAccentColor, clamp(vCharge * 1.6, 0.0, 1.0));
    float atmosphere = 1.0 - smoothstep(50.0, 200.0, vDepth);
    float alpha = (base + vCharge * 0.75) * uOpacity * mix(0.15, 1.0, atmosphere) * uReveal;

    gl_FragColor = vec4(color, alpha);
  }
`;

export const SIGNAL_VERTEX = /* glsl */ `
  uniform float uSize;
  uniform float uDpr;

  attribute float aIntensity;

  varying float vIntensity;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float attenuation = 300.0 / max(-mvPosition.z, 0.001);
    gl_PointSize = clamp(uSize * uDpr * attenuation * (0.5 + aIntensity), 0.0, 90.0) * step(0.01, aIntensity);
    vIntensity = aIntensity;
  }
`;

export const SIGNAL_FRAGMENT = /* glsl */ `
  uniform vec3 uAccentColor;
  uniform float uOpacity;

  varying float vIntensity;

  void main() {
    if (vIntensity < 0.01) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.0, d);
    vec3 color = mix(uAccentColor, vec3(1.0), pow(core, 2.5) * 0.8);
    gl_FragColor = vec4(color, core * vIntensity * uOpacity);
  }
`;

export const TRAIL_VERTEX = /* glsl */ `
  attribute float aIntensity;
  attribute float aEnd;

  varying float vIntensity;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // Head bright, tail gone — reads as motion blur on the travelling charge.
    vIntensity = aIntensity * mix(0.0, 1.0, aEnd);
  }
`;

export const TRAIL_FRAGMENT = /* glsl */ `
  uniform vec3 uAccentColor;
  uniform float uOpacity;

  varying float vIntensity;

  void main() {
    if (vIntensity < 0.01) discard;
    gl_FragColor = vec4(uAccentColor, vIntensity * 0.55 * uOpacity);
  }
`;
