"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { World } from "./World";
import { PostFX } from "./PostFX";
import type { QualitySettings } from "@/lib/quality/useQualityTier";

export function SceneCanvas({ quality }: { quality: QualitySettings }) {
  const [visible, setVisible] = useState(true);
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // WebGL contexts can be reclaimed by the browser/driver under memory or GPU
  // pressure. preventDefault tells the browser to attempt restoration; once it
  // does, remounting the Canvas (via key) rebuilds every GL resource cleanly
  // instead of leaving Three.js holding references to a dead context.
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#baobab-scene-canvas");
    if (!canvas) return;

    const onLost = (event: Event) => event.preventDefault();
    const onRestored = () => setCanvasKey((k) => k + 1);

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [canvasKey]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: "var(--bg)" }}
    >
      <Canvas
        key={canvasKey}
        id="baobab-scene-canvas"
        dpr={quality.dpr}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 6, 215], fov: 32, near: 0.02, far: 900 }}
        onCreated={({ gl }) => gl.setClearColor("#050505", 1)}
      >
        <Suspense fallback={null}>
          <World quality={quality} />
          {quality.postFX && <PostFX depthOfField={quality.depthOfField} />}
        </Suspense>
      </Canvas>
    </div>
  );
}
