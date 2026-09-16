"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const PHASES = [
  { at: 0, label: "Assemblage du système" },
  { at: 20, label: "Formation de la structure" },
  { at: 50, label: "Stabilisation visuelle" },
  { at: 80, label: "Émergence" },
];

export function Loader({ reducedMotion }: { reducedMotion: boolean }) {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // Bail out of the boot animation entirely once the real (post-detection)
      // reduced-motion preference is known — not a derived-render value, so this
      // legitimately belongs in an effect rather than render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return;
    }

    const counter = { value: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
          onComplete: () => setDone(true),
        });
      },
    });
    tl.to(counter, {
      value: 100,
      duration: 1.1,
      ease: "power2.inOut",
      onUpdate: () => setProgress(Math.round(counter.value)),
    });

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  if (done) return null;

  const phase = [...PHASES].reverse().find((p) => progress >= p.at) ?? PHASES[0];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
      style={{ background: "var(--bg)" }}
      role="status"
      aria-live="polite"
    >
      <span className="font-display text-xs tracking-[0.5em]" style={{ color: "var(--fg-dim)" }}>
        BAOBABWEB
      </span>
      <span className="font-display text-4xl" style={{ color: "var(--fg)" }}>
        {progress}%
      </span>
      <span className="text-xs tracking-widest" style={{ color: "var(--fg-faint)" }}>
        {phase.label}
      </span>
    </div>
  );
}
