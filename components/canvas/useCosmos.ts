import * as THREE from "three";
import { useMemo } from "react";
import {
  STAR_VERTEX,
  STAR_FRAGMENT,
  NEBULA_VERTEX,
  NEBULA_FRAGMENT,
} from "./shaders/cosmos.glsl";

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

/**
 * Stars are not a uniform point cloud. A handful of drifts (dense knots, a
 * faint band, and a thin scatter) are composed together so the sky has regions
 * worth looking at instead of even noise.
 */
export function useCosmos(starCount: number, starSize: number) {
  return useMemo(() => {
    const rng = mulberry32(90210);
    const positions = new Float32Array(starCount * 3);
    const seeds = new Float32Array(starCount);
    const brightness = new Float32Array(starCount);

    const KNOTS = [
      new THREE.Vector3(-90, 40, -140),
      new THREE.Vector3(120, -30, -110),
      new THREE.Vector3(30, 80, 130),
    ];

    for (let i = 0; i < starCount; i++) {
      const roll = rng();
      let x: number;
      let y: number;
      let z: number;

      if (roll < 0.28) {
        // Dense knots — the eye reads these as distant clusters.
        const knot = KNOTS[Math.floor(rng() * KNOTS.length)];
        x = knot.x + (rng() - 0.5) * 90;
        y = knot.y + (rng() - 0.5) * 70;
        z = knot.z + (rng() - 0.5) * 90;
      } else if (roll < 0.52) {
        // A loose band across the sky, tilted so it never looks like a grid.
        const t = rng() * Math.PI * 2;
        const radius = 120 + rng() * 90;
        x = Math.cos(t) * radius;
        y = (rng() - 0.5) * 46 + Math.sin(t) * 26;
        z = Math.sin(t) * radius;
      } else {
        // Thin scatter filling everything else.
        const theta = rng() * Math.PI * 2;
        const phi = Math.acos(2 * rng() - 1);
        const r = 70 + Math.pow(rng(), 0.4) * 190;
        x = Math.sin(phi) * Math.cos(theta) * r;
        y = Math.cos(phi) * r;
        z = Math.sin(phi) * Math.sin(theta) * r;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      seeds[i] = rng();
      // Most stars are faint; a few carry the composition.
      brightness[i] = 0.25 + Math.pow(rng(), 5) * 1.6;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    starGeometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));
    starGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400);

    const starUniforms = {
      uTime: { value: 0 },
      uSize: { value: starSize },
      uDpr: { value: 1 },
      uOpacity: { value: 1 },
      uStarColor: { value: new THREE.Color("#d8e4f2") },
    };

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const nebulaGeometry = new THREE.SphereGeometry(300, 32, 24);
    const nebulaUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0.5 },
      uNebulaA: { value: new THREE.Color("#121b2b") },
      uNebulaB: { value: new THREE.Color("#2a2233") },
    };

    const nebulaMaterial = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERTEX,
      fragmentShader: NEBULA_FRAGMENT,
      uniforms: nebulaUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });

    return { starGeometry, starMaterial, starUniforms, nebulaGeometry, nebulaMaterial, nebulaUniforms };
  }, [starCount, starSize]);
}
