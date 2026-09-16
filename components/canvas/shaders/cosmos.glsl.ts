import { NOISE_GLSL } from "./noise.glsl";

/**
 * The backdrop. Two jobs only: give the void a floor of faint light so it
 * never reads as a flat black div, and provide parallax depth cues that make
 * the neural layer feel suspended inside something much larger.
 */

export const STAR_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uDpr;
  uniform float uOpacity;

  attribute float aSeed;
  attribute float aBrightness;

  varying float vBrightness;
  varying float vSeed;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float attenuation = 220.0 / max(-mvPosition.z, 0.001);
    gl_PointSize = clamp(uSize * uDpr * attenuation * aBrightness, 0.0, 8.0);

    vBrightness = aBrightness;
    vSeed = aSeed;
  }
`;

export const STAR_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uStarColor;

  varying float vBrightness;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.0, d);
    // Slow, per-star scintillation. Subtle enough to feel atmospheric.
    float twinkle = 0.7 + 0.3 * sin(uTime * 0.35 + vSeed * 57.0);

    gl_FragColor = vec4(uStarColor, core * vBrightness * twinkle * uOpacity);
  }
`;

export const NEBULA_VERTEX = /* glsl */ `
  varying vec3 vWorldPosition;

  void main() {
    vWorldPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const NEBULA_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uNebulaA;
  uniform vec3 uNebulaB;

  varying vec3 vWorldPosition;

  ${NOISE_GLSL}

  float fbm(vec3 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      total += valueNoise3(p) * amplitude;
      p *= 2.03;
      amplitude *= 0.5;
    }
    return total;
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    // Two noise fields at different rates so the clouds slowly reshape rather
    // than scroll, which is what sells "volume" without a volumetric pass.
    float a = fbm(dir * 2.4 + vec3(0.0, uTime * 0.006, 0.0));
    float b = fbm(dir * 4.7 - vec3(uTime * 0.004, 0.0, 0.0));
    float clouds = smoothstep(0.35, 0.95, a * 0.65 + b * 0.45);

    vec3 color = mix(uNebulaA, uNebulaB, clamp(b * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(color, clouds * uOpacity);
  }
`;
