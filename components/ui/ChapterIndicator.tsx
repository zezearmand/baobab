"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollWorld } from "@/lib/scroll/ScrollProvider";
import { CHAPTERS } from "@/content/data";

export function ChapterIndicator() {
  const { getState, subscribeFrame, subscribeChapterChange } = useScrollWorld();
  const [chapterLabel, setChapterLabel] = useState(() => {
    const s = getState();
    return `${String(s.chapterIndex + 1).padStart(2, "0")} / ${CHAPTERS[s.chapterIndex].label}`;
  });
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribeChapter = subscribeChapterChange((s) => {
      setChapterLabel(`${String(s.chapterIndex + 1).padStart(2, "0")} / ${CHAPTERS[s.chapterIndex].label}`);
    });
    const unsubscribeFrame = subscribeFrame((s) => {
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${s.progress})`;
      }
    });
    return () => {
      unsubscribeChapter();
      unsubscribeFrame();
    };
  }, [subscribeChapterChange, subscribeFrame]);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-8">
      <span
        className="font-display text-[0.65rem] tracking-[0.35em]"
        style={{ color: "var(--fg-dim)" }}
        aria-live="polite"
      >
        {chapterLabel}
      </span>
      <div className="h-[2px] w-24 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
        <div
          ref={barRef}
          className="h-full w-full origin-left rounded-full"
          style={{ background: "var(--accent)", transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
