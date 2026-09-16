"use client";

import { useSectionRef } from "@/lib/scroll/ScrollProvider";
import { useQualityTier } from "@/lib/quality/useQualityTier";
import { useRevealOnScroll } from "@/lib/motion/useRevealOnScroll";
import { BRAND, CONTACT } from "@/content/data";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function Contact() {
  const sectionRef = useSectionRef("contact");
  const { reducedMotion } = useQualityTier();
  const revealRef = useRevealOnScroll<HTMLElement>(reducedMotion);

  return (
    <section
      id="contact"
      ref={(el) => {
        sectionRef(el);
        revealRef.current = el;
      }}
      className="section items-center justify-center text-center"
    >
      <span
        data-reveal="fade"
        className="mb-8 font-display text-xs tracking-[0.4em]"
        style={{ color: "var(--fg-faint)" }}
      >
        07 / FUTURE
      </span>

      <h2 className="reveal-line font-display flex flex-col items-center text-[clamp(2rem,7vw,5rem)] font-medium leading-[1.05]">
        {CONTACT.headline.map((line) => (
          <span key={line} className="reveal-line block" data-reveal="lines">
            <span data-line className="block">
              {line}
            </span>
          </span>
        ))}
      </h2>

      <div data-reveal="fade" data-reveal-delay={0.2} className="mt-10">
        <MagneticButton href={`mailto:${CONTACT.email}`}>{CONTACT.cta}</MagneticButton>
      </div>

      <div
        data-reveal="fade"
        data-reveal-delay={0.3}
        className="mt-20 flex flex-col items-center gap-2 text-sm"
        style={{ color: "var(--fg-faint)" }}
      >
        <a href={`mailto:${CONTACT.email}`} className="underline-offset-4 hover:underline">
          {CONTACT.email}
        </a>
        <span className="font-display tracking-[0.3em]">{BRAND.tagline.toUpperCase()}</span>
        <span className="mt-6 text-xs">
          © {new Date().getFullYear()} {BRAND.name}. Tous droits réservés.
        </span>
      </div>
    </section>
  );
}
