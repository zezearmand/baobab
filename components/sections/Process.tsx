"use client";

import { useEffect, useRef } from "react";
import { useQualityTier } from "@/lib/quality/useQualityTier";
import { useRevealOnScroll } from "@/lib/motion/useRevealOnScroll";
import { useScrollWorld, useSectionRef } from "@/lib/scroll/ScrollProvider";
import { PROCESS } from "@/content/data";

export function Process() {
  const sectionRef = useSectionRef("process");
  const { reducedMotion } = useQualityTier();
  const revealRef = useRevealOnScroll<HTMLElement>(reducedMotion);
  const { subscribeFrame } = useScrollWorld();
  const railFillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribeFrame((s) => {
      if (s.chapterId !== "process" || !railFillRef.current) return;
      railFillRef.current.style.transform = `scaleY(${Math.min(Math.max(s.chapterProgress * 1.15, 0), 1)})`;
    });
  }, [subscribeFrame]);

  return (
    <section
      id="process"
      ref={(el) => {
        sectionRef(el);
        revealRef.current = el;
      }}
      className="section"
    >
      <span
        data-reveal="fade"
        className="mb-14 font-display text-xs tracking-[0.4em]"
        style={{ color: "var(--fg-faint)" }}
      >
        05 / METHOD
      </span>

      <div className="relative mx-auto grid max-w-3xl gap-0">
        <div
          className="absolute left-[0.5rem] top-2 bottom-2 w-px md:left-[0.6rem]"
          style={{ background: "var(--line)" }}
        >
          <div
            ref={railFillRef}
            className="w-full origin-top"
            style={{ height: "100%", background: "var(--accent)", transform: "scaleY(0)" }}
          />
        </div>

        {PROCESS.map((step, i) => (
          <div
            key={step.index}
            data-reveal="fade"
            data-reveal-delay={i * 0.06}
            className="flex gap-6 py-6 pl-8 md:gap-10 md:pl-10"
          >
            <span className="font-display text-sm shrink-0" style={{ color: "var(--accent)" }}>
              {step.index}
            </span>
            <div>
              <h3 className="font-display text-xl font-medium md:text-2xl">{step.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed md:text-base" style={{ color: "var(--fg-dim)" }}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
