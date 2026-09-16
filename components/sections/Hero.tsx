"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useSectionRef } from "@/lib/scroll/ScrollProvider";
import { useQualityTier } from "@/lib/quality/useQualityTier";
import { HERO } from "@/content/data";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { KineticText } from "@/components/ui/KineticText";

export function Hero() {
  const sectionRef = useSectionRef("hero");
  const rootRef = useRef<HTMLElement | null>(null);
  const { reducedMotion } = useQualityTier();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const lines = root.querySelectorAll<HTMLElement>("[data-line]");
      const fades = root.querySelectorAll<HTMLElement>("[data-fade]");

      if (reducedMotion) {
        gsap.set(lines, { yPercent: 0, opacity: 1 });
        gsap.set(fades, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(lines, { yPercent: 118, opacity: 0 });
      gsap.set(fades, { opacity: 0, y: 14 });

      // The type arrives only after the network has had a moment to wake up.
      const tl = gsap.timeline({ delay: 1.5 });
      tl.to(lines, { yPercent: 0, opacity: 1, duration: 1.4, ease: "power4.out", stagger: 0.12 })
        .to(fades, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, "-=0.6");
    }, root);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="hero"
      ref={(el) => {
        sectionRef(el);
        rootRef.current = el;
      }}
      className="relative flex min-h-screen min-h-[100dvh] w-full flex-col justify-end px-6 pb-24 pt-32 md:px-16 md:pb-28"
    >
      {/* Anchored low and left rather than centred — the universe owns the
          frame, the type sits inside it like a caption on a shot. */}
      <div className="flex max-w-3xl flex-col gap-7">
        <span
          data-fade
          className="font-display text-[0.65rem] tracking-[0.5em]"
          style={{ color: "var(--fg-faint)" }}
        >
          {HERO.eyebrow.toUpperCase()} — DAKAR
        </span>

        <h1 className="font-display flex flex-col text-[clamp(2rem,6.2vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.02em]">
          {HERO.headline.map((line) => (
            <span key={line} className="reveal-line block">
              <span data-line className="block">
                <KineticText weight={1.25}>{line}</KineticText>
              </span>
            </span>
          ))}
        </h1>

        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-16">
          <p
            data-fade
            className="max-w-md text-sm leading-relaxed md:text-base"
            style={{ color: "var(--fg-dim)" }}
          >
            {HERO.sub}
          </p>

          <div data-fade className="shrink-0">
            <MagneticButton href="#contact">{HERO.cta}</MagneticButton>
          </div>
        </div>
      </div>

      <div
        data-fade
        className="pointer-events-none absolute bottom-8 right-6 hidden items-center gap-3 md:flex md:right-16"
      >
        <span className="text-[0.6rem] tracking-[0.4em]" style={{ color: "var(--fg-faint)" }}>
          DÉFILEZ POUR ENTRER
        </span>
        <span className="h-px w-12" style={{ background: "var(--line)" }} />
      </div>
    </section>
  );
}
