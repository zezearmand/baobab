"use client";

import { Bloom, DepthOfField, Noise, Vignette, EffectComposer } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/**
 * Restrained on purpose: enough bloom for the filaments to read as light,
 * a whisper of grain for depth, and (ultra only) a shallow focus plane so
 * the canopy has real photographic depth. No chromatic aberration, no glitch.
 */
export function PostFX({ depthOfField }: { depthOfField: boolean }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={0.55} luminanceThreshold={0.22} luminanceSmoothing={0.4} mipmapBlur radius={0.62} />
      {depthOfField ? (
        // Just enough separation to feel photographic. Anything stronger turns
        // the neurons into unreadable blobs — the structure must stay legible.
        <DepthOfField focusDistance={0.02} focalLength={0.3} bokehScale={1.1} height={480} />
      ) : (
        <></>
      )}
      <Noise opacity={0.022} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
    </EffectComposer>
  );
}
