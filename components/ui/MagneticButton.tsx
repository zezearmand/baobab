"use client";

import { useQualityTier } from "@/lib/quality/useQualityTier";
import { useMagnetic } from "@/lib/motion/useMagnetic";
import type { AnchorHTMLAttributes } from "react";

type MagneticButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: React.ReactNode;
  variant?: "solid" | "ghost";
};

export function MagneticButton({ children, variant = "solid", className = "", ...props }: MagneticButtonProps) {
  const { isTouch, reducedMotion } = useQualityTier();
  const ref = useMagnetic<HTMLAnchorElement>(0.35, isTouch || reducedMotion);

  const base =
    variant === "solid"
      ? "bg-[var(--accent)] text-[#0a0800]"
      : "border border-[var(--line)] text-[var(--fg)]";

  return (
    <a
      ref={ref}
      className={`group relative inline-flex items-center gap-3 rounded-full px-8 py-4 font-display text-sm font-medium tracking-wide transition-colors duration-300 hover:opacity-90 ${base} ${className}`}
      {...props}
    >
      <span data-magnetic-content className="inline-flex items-center gap-3">
        {children}
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </span>
    </a>
  );
}
