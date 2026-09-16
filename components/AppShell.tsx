"use client";

import dynamic from "next/dynamic";
import { useQualityTier } from "@/lib/quality/useQualityTier";
import { ScrollProvider } from "@/lib/scroll/ScrollProvider";
import { Loader } from "@/components/ui/Loader";
import { Nav } from "@/components/ui/Nav";
import { ChapterIndicator } from "@/components/ui/ChapterIndicator";

const SceneCanvas = dynamic(() => import("@/components/canvas/SceneCanvas").then((m) => m.SceneCanvas), {
  ssr: false,
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const quality = useQualityTier();

  return (
    <ScrollProvider reducedMotion={quality.reducedMotion}>
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      <Loader reducedMotion={quality.reducedMotion} />
      <SceneCanvas quality={quality} />
      <div className="legibility-scrim" aria-hidden="true" />
      <Nav />
      <main id="main-content" className="relative z-10">
        {children}
      </main>
      <ChapterIndicator />
    </ScrollProvider>
  );
}
