"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useScrollWorld, useSectionRef } from "@/lib/scroll/ScrollProvider";
import { useQualityTier } from "@/lib/quality/useQualityTier";
import { PROJECTS } from "@/content/data";
import { KineticText } from "@/components/ui/KineticText";

/**
 * No cards, no frames. Each project is a region of the universe the camera
 * travels to — the constellation behind the type *is* the project's cluster,
 * lit up while you are reading about it. The type is a label floating in that
 * space, not a panel sitting on top of it.
 */
export function Portfolio() {
  const sectionRef = useSectionRef("portfolio");
  const { subscribeFrame } = useScrollWorld();
  const { reducedMotion } = useQualityTier();
  const [activeIndex, setActiveIndex] = useState(0);
  const lastIndexRef = useRef(-1);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    return subscribeFrame((state) => {
      if (state.chapterId !== "portfolio") return;
      const index = Math.min(Math.floor(state.chapterProgress * PROJECTS.length), PROJECTS.length - 1);
      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index;
        setActiveIndex(index);
      }
    });
  }, [subscribeFrame]);

  useEffect(() => {
    slideRefs.current.forEach((el, index) => {
      if (!el) return;
      const isActive = index === activeIndex;

      if (reducedMotion) {
        gsap.set(el, { opacity: isActive ? 1 : 0 });
        return;
      }

      // Projects arrive from depth and leave into depth, so the sequence reads
      // as travel rather than as a slideshow.
      gsap.to(el, {
        opacity: isActive ? 1 : 0,
        z: isActive ? 0 : -220,
        scale: isActive ? 1 : 0.9,
        filter: isActive ? "blur(0px)" : "blur(7px)",
        duration: 1,
        ease: "power3.out",
        overwrite: true,
      });
    });
  }, [activeIndex, reducedMotion]);

  return (
    <section
      id="portfolio"
      ref={sectionRef}
      className="relative"
      style={{ minHeight: `${PROJECTS.length * 85}vh` }}
    >
      <div
        className="sticky top-0 flex h-dvh w-full flex-col justify-center px-6 py-24 md:px-16"
        style={{ perspective: "1200px" }}
      >
        <div className="mb-10 flex items-center gap-4">
          <span className="font-display text-[0.65rem] tracking-[0.45em]" style={{ color: "var(--fg-faint)" }}>
            03 / WORK
          </span>
          <span className="h-px flex-1 max-w-24" style={{ background: "var(--line)" }} />
          <span className="font-display text-[0.65rem] tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            {String(activeIndex + 1).padStart(2, "0")}
            <span style={{ color: "var(--fg-faint)" }}>/{String(PROJECTS.length).padStart(2, "0")}</span>
          </span>
        </div>

        <div className="relative min-h-[18rem] md:min-h-[20rem]">
          {PROJECTS.map((project, index) => (
            <div
              key={project.id}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className="absolute inset-0 flex flex-col justify-center gap-5"
              style={{ opacity: index === 0 ? 1 : 0, transformStyle: "preserve-3d" }}
              aria-hidden={index !== activeIndex}
            >
              <span
                className="font-display text-[0.65rem] tracking-[0.35em]"
                style={{ color: "var(--accent)" }}
              >
                {project.category.toUpperCase()} · {project.year}
              </span>

              <h3 className="font-display max-w-3xl text-[clamp(2.1rem,6vw,4.4rem)] font-medium leading-[1.02] tracking-[-0.02em]">
                <KineticText weight={1.1}>{project.name}</KineticText>
              </h3>

              <p className="max-w-md text-sm leading-relaxed md:text-base" style={{ color: "var(--fg-dim)" }}>
                {project.blurb}
              </p>
            </div>
          ))}
        </div>

        {/* A quiet position readout — you are somewhere specific in the universe. */}
        <div className="mt-10 flex gap-2" aria-hidden="true">
          {PROJECTS.map((project, index) => (
            <span
              key={project.id}
              className="h-px flex-1 transition-all duration-500"
              style={{
                background: index === activeIndex ? "var(--accent)" : "var(--line)",
                opacity: index === activeIndex ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
