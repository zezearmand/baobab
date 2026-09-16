"use client";

import { useSectionRef } from "@/lib/scroll/ScrollProvider";
import { useQualityTier } from "@/lib/quality/useQualityTier";
import { useRevealOnScroll } from "@/lib/motion/useRevealOnScroll";
import { PRICING } from "@/content/data";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function Pricing() {
  const sectionRef = useSectionRef("pricing");
  const { reducedMotion } = useQualityTier();
  const revealRef = useRevealOnScroll<HTMLElement>(reducedMotion);

  return (
    <section
      id="pricing"
      ref={(el) => {
        sectionRef(el);
        revealRef.current = el;
      }}
      className="section"
    >
      <span
        data-reveal="fade"
        className="mb-4 text-center font-display text-xs tracking-[0.4em]"
        style={{ color: "var(--fg-faint)" }}
      >
        06 / SCALE
      </span>
      <h2
        data-reveal="fade"
        className="mx-auto mb-14 max-w-xl text-balance text-center font-display text-2xl font-medium md:text-3xl"
      >
        Un investissement clair, adapté à votre ambition.
      </h2>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {PRICING.map((tier, i) => (
          <div
            key={tier.name}
            data-reveal="fade"
            data-reveal-delay={i * 0.1}
            className="flex flex-col gap-6 rounded-2xl border p-8"
            style={{
              borderColor: tier.featured ? "var(--accent)" : "var(--line)",
              background: tier.featured
                ? "color-mix(in srgb, var(--accent) 6%, transparent)"
                : "transparent",
            }}
          >
            <div>
              <h3 className="font-display text-lg tracking-wide">{tier.name.toUpperCase()}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--fg-dim)" }}>
                {tier.description}
              </p>
            </div>
            <span className="font-display text-3xl font-medium">{tier.price}</span>
            <ul className="flex flex-col gap-3 text-sm" style={{ color: "var(--fg-dim)" }}>
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span aria-hidden="true" style={{ color: "var(--accent)" }}>
                    ＋
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <MagneticButton
              href="#contact"
              variant={tier.featured ? "solid" : "ghost"}
              className="mt-auto justify-center"
            >
              Choisir {tier.name}
            </MagneticButton>
          </div>
        ))}
      </div>
    </section>
  );
}
