"use client";

import { useSectionRef } from "@/lib/scroll/ScrollProvider";
import { useQualityTier } from "@/lib/quality/useQualityTier";
import { useRevealOnScroll } from "@/lib/motion/useRevealOnScroll";
import { TECHNOLOGY } from "@/content/data";

export function Technology() {
  const sectionRef = useSectionRef("technology");
  const { reducedMotion } = useQualityTier();
  const revealRef = useRevealOnScroll<HTMLElement>(reducedMotion);

  return (
    <section
      id="technology"
      ref={(el) => {
        sectionRef(el);
        revealRef.current = el;
      }}
      className="section items-center text-center"
    >
      <span
        data-reveal="fade"
        className="mb-8 font-display text-xs tracking-[0.4em]"
        style={{ color: "var(--fg-faint)" }}
      >
        04 / ENGINE
      </span>

      <h2
        data-reveal="lines"
        className="reveal-line font-display max-w-4xl text-[clamp(1.8rem,5.5vw,4rem)] font-medium leading-tight"
      >
        <span data-line className="block">
          {TECHNOLOGY.headline}
        </span>
      </h2>

      <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {TECHNOLOGY.pillars.map((pillar, i) => (
          <span
            key={pillar}
            data-reveal="fade"
            data-reveal-delay={i * 0.08}
            className="font-display text-sm tracking-[0.3em] md:text-base"
            style={{ color: "var(--fg-dim)" }}
          >
            {pillar}
          </span>
        ))}
      </div>

      <p
        data-reveal="fade"
        data-reveal-delay={0.3}
        className="mt-16 max-w-xl text-balance font-display text-lg italic md:text-xl"
        style={{ color: "var(--accent)" }}
      >
        {TECHNOLOGY.signature}
      </p>
    </section>
  );
}
