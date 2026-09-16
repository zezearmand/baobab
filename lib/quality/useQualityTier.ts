"use client";

import { useEffect, useState } from "react";

export type QualityTier = "ultra" | "high" | "medium" | "low";

export type QualitySettings = {
  tier: QualityTier;
  /** Neurons in the main universe. */
  nodeBudget: number;
  /** Unclustered nodes drifting between regions, purely for depth. */
  fieldNodes: number;
  /** Neurons in the universe nested inside a single neuron. */
  microNodeBudget: number;
  microScale: number;
  /** Simultaneous travelling charges the simulation will sustain. */
  maxSignals: number;
  nodeSize: number;
  signalSize: number;
  starCount: number;
  starSize: number;
  dpr: number;
  postFX: boolean;
  depthOfField: boolean;
  pointerFX: boolean;
  cameraAmplitude: number;
  reducedMotion: boolean;
  isTouch: boolean;
};

type TierSettings = Omit<QualitySettings, "tier" | "reducedMotion" | "isTouch" | "pointerFX">;

const SETTINGS: Record<QualityTier, TierSettings> = {
  ultra: {
    nodeBudget: 3400,
    fieldNodes: 620,
    microNodeBudget: 900,
    microScale: 0.035,
    maxSignals: 900,
    nodeSize: 1.5,
    signalSize: 2.6,
    starCount: 14000,
    starSize: 2.2,
    dpr: 2,
    postFX: true,
    depthOfField: true,
    cameraAmplitude: 1,
  },
  high: {
    nodeBudget: 2600,
    fieldNodes: 460,
    microNodeBudget: 700,
    microScale: 0.035,
    maxSignals: 650,
    nodeSize: 1.5,
    signalSize: 2.6,
    starCount: 9000,
    starSize: 2.2,
    dpr: 1.6,
    postFX: true,
    depthOfField: false,
    cameraAmplitude: 1,
  },
  medium: {
    nodeBudget: 1500,
    fieldNodes: 260,
    microNodeBudget: 420,
    microScale: 0.04,
    maxSignals: 340,
    nodeSize: 1.7,
    signalSize: 2.9,
    starCount: 4500,
    starSize: 2.4,
    dpr: 1.35,
    postFX: false,
    depthOfField: false,
    cameraAmplitude: 0.75,
  },
  low: {
    nodeBudget: 800,
    fieldNodes: 140,
    microNodeBudget: 240,
    microScale: 0.045,
    maxSignals: 180,
    nodeSize: 2,
    signalSize: 3.2,
    starCount: 2200,
    starSize: 2.6,
    dpr: 1,
    postFX: false,
    depthOfField: false,
    cameraAmplitude: 0.5,
  },
};

function detectTier(): { tier: QualityTier; isTouch: boolean; reducedMotion: boolean } {
  if (typeof window === "undefined") {
    return { tier: "medium", isTouch: false, reducedMotion: false };
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } })
    .connection;
  const slowConnection = connection?.saveData || /2g/.test(connection?.effectiveType ?? "");
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  let tier: QualityTier = "high";

  if (width < 768 || isTouch) {
    tier = cores >= 6 && memory >= 4 ? "medium" : "low";
  }
  if (cores <= 4 || memory <= 3) {
    tier = "low";
  }
  if (slowConnection) {
    tier = "low";
  }
  if (width >= 1600 && cores >= 10 && memory >= 8 && !isTouch && !slowConnection) {
    tier = "ultra";
  }

  return { tier, isTouch, reducedMotion };
}

export function useQualityTier(): QualitySettings {
  const [state, setState] = useState<QualitySettings>(() => ({
    tier: "medium",
    reducedMotion: false,
    isTouch: false,
    pointerFX: false,
    ...SETTINGS.medium,
  }));

  useEffect(() => {
    const apply = () => {
      const { tier, isTouch, reducedMotion } = detectTier();
      setState({
        tier,
        isTouch,
        reducedMotion,
        pointerFX: !isTouch && !reducedMotion,
        ...SETTINGS[tier],
      });
    };

    apply();

    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(apply, 300);
    };

    reducedMotionMedia.addEventListener("change", apply);
    window.addEventListener("resize", onResize);
    return () => {
      reducedMotionMedia.removeEventListener("change", apply);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return state;
}
