"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

export function useMagnetic<T extends HTMLElement>(strength = 0.35, disabled = false) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    const contentEl = el.querySelector<HTMLElement>("[data-magnetic-content]");
    const cxTo = contentEl ? gsap.quickTo(contentEl, "x", { duration: 0.6, ease: "power3.out" }) : null;
    const cyTo = contentEl ? gsap.quickTo(contentEl, "y", { duration: 0.6, ease: "power3.out" }) : null;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = event.clientX - (rect.left + rect.width / 2);
      const relY = event.clientY - (rect.top + rect.height / 2);
      xTo(relX * strength);
      yTo(relY * strength);
      cxTo?.(relX * strength * 0.5);
      cyTo?.(relY * strength * 0.5);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
      cxTo?.(0);
      cyTo?.(0);
    };

    const onDown = () => gsap.to(el, { scale: 0.94, duration: 0.15, ease: "power2.out" });
    const onUp = () => gsap.to(el, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" });

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [strength, disabled]);

  return ref;
}
