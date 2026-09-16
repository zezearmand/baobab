"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Generic scroll-triggered reveal for section content. Mark a wrapper with
 * data-reveal="lines" (children with data-line get masked stagger) or
 * data-reveal="fade" (blur/opacity/translate) and it animates once it enters view.
 */
export function useRevealOnScroll<T extends HTMLElement>(reducedMotion: boolean) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const targets = container.querySelectorAll<HTMLElement>("[data-reveal]");

      targets.forEach((el) => {
        const type = el.dataset.reveal;
        const delay = Number(el.dataset.revealDelay ?? 0);

        if (reducedMotion) {
          gsap.set(el, { opacity: 1, y: 0, filter: "none" });
          const lines = el.querySelectorAll<HTMLElement>("[data-line]");
          if (lines.length) gsap.set(lines, { yPercent: 0, opacity: 1 });
          return;
        }

        if (type === "lines") {
          const lines = el.querySelectorAll<HTMLElement>("[data-line]");
          gsap.set(lines, { yPercent: 110, opacity: 0 });
          gsap.to(lines, {
            yPercent: 0,
            opacity: 1,
            duration: 1.1,
            ease: "power4.out",
            stagger: 0.08,
            delay,
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        } else {
          gsap.set(el, { opacity: 0, y: 28, filter: "blur(6px)" });
          gsap.to(el, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power3.out",
            delay,
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        }
      });
    }, container);

    return () => ctx.revert();
  }, [reducedMotion]);

  return containerRef;
}
