"use client";

import { useEffect, useRef } from "react";
import { useScrollWorld } from "@/lib/scroll/ScrollProvider";

type KineticTextProps = {
  children: string;
  className?: string;
  /** How much mass the line carries. Bigger type wants a bigger number. */
  weight?: number;
  as?: "span" | "h1" | "h2" | "h3";
};

/**
 * Type with inertia. Scroll velocity displaces each word, heavier words lag
 * further behind, and everything settles back on a spring once the scroll
 * stops — so the words feel like matter suspended in the same space as the
 * network rather than labels pasted on top of it.
 *
 * Runs entirely off a per-frame subscription and direct style writes: no React
 * re-render is involved at any point.
 */
export function KineticText({ children, className = "", weight = 1, as = "span" }: KineticTextProps) {
  const { subscribeFrame, reducedMotion } = useScrollWorld();
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion) return;

    const words = Array.from(container.querySelectorAll<HTMLElement>("[data-kinetic-word]"));
    const offsets = new Float32Array(words.length);
    const velocities = new Float32Array(words.length);

    return subscribeFrame((state) => {
      // Each word gets its own spring, staggered by depth, so a line arrives
      // in sequence instead of moving as one rigid block.
      for (let i = 0; i < words.length; i++) {
        const depth = 0.55 + (i / Math.max(words.length - 1, 1)) * 0.75;
        const target = state.velocity * 9 * weight * depth;
        const clamped = Math.max(Math.min(target, 26), -26);

        const stiffness = 0.12;
        const damping = 0.76;
        velocities[i] = (velocities[i] + (clamped - offsets[i]) * stiffness) * damping;
        offsets[i] += velocities[i];

        const offset = offsets[i];
        if (Math.abs(offset) < 0.01 && Math.abs(velocities[i]) < 0.01) {
          words[i].style.transform = "";
          continue;
        }
        // Skew tracks the direction of travel — it reads as air resistance.
        words[i].style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) skewY(${(offset * -0.05).toFixed(3)}deg)`;
      }
    });
  }, [subscribeFrame, reducedMotion, weight]);

  const Tag = as;
  const words = children.split(" ");

  return (
    <Tag ref={containerRef as never} className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} data-kinetic-word className="inline-block will-change-transform">
          {word}
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
