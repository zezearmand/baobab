"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollWorld, useSectionRef } from "@/lib/scroll/ScrollProvider";
import { SERVICES } from "@/content/data";

export function Services() {
  const sectionRef = useSectionRef("services");
  const { subscribeFrame } = useScrollWorld();
  const [activeIndex, setActiveIndex] = useState(0);
  const lastIndexRef = useRef(-1);

  useEffect(() => {
    return subscribeFrame((s) => {
      if (s.chapterId !== "services") return;
      const idx = Math.min(Math.floor(s.chapterProgress * SERVICES.length), SERVICES.length - 1);
      if (idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        setActiveIndex(idx);
      }
    });
  }, [subscribeFrame]);

  return (
    <section
      id="services"
      ref={sectionRef}
      className="relative"
      style={{ minHeight: `${SERVICES.length * 85}vh` }}
    >
      <div className="sticky top-0 flex h-dvh w-full items-center px-6 py-20 md:px-16">
        <div className="grid w-full gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
          <div className="flex flex-col justify-center gap-0.5">
            <span
              className="mb-4 font-display text-xs tracking-[0.4em]"
              style={{ color: "var(--fg-faint)" }}
            >
              02 / CRAFT
            </span>
            {SERVICES.map((service, i) => (
              <div
                key={service.id}
                className="flex items-baseline gap-4 border-b py-2 transition-colors duration-500 md:py-2.5"
                style={{
                  borderColor: "var(--line)",
                  color: i === activeIndex ? "var(--fg)" : "var(--fg-faint)",
                }}
              >
                <span className="font-display text-xs" style={{ color: "var(--accent)" }}>
                  {service.index}
                </span>
                <span
                  className="font-display text-lg transition-transform duration-500 md:text-xl"
                  style={{ transform: i === activeIndex ? "translateX(6px)" : "translateX(0)" }}
                >
                  {service.title}
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex min-h-[10rem] items-center md:min-h-0">
            {SERVICES.map((service, i) => (
              <p
                key={service.id}
                className="absolute max-w-md text-base leading-relaxed transition-opacity duration-700 md:text-lg"
                style={{
                  color: "var(--fg-dim)",
                  opacity: i === activeIndex ? 1 : 0,
                }}
              >
                {service.description}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
