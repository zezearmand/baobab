"use client";

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { CHAPTERS, type ChapterId } from "@/content/data";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export type SceneState = {
  progress: number;
  sceneTime: number;
  chapterIndex: number;
  chapterId: ChapterId;
  chapterProgress: number;
  velocity: number;
  pointer: { x: number; y: number; active: boolean };
  idle: boolean;
};

type Listener = (state: SceneState) => void;

type ScrollContextValue = {
  registerSection: (id: ChapterId, el: HTMLElement) => () => void;
  getState: () => SceneState;
  subscribeFrame: (fn: Listener) => () => void;
  subscribeChapterChange: (fn: Listener) => () => void;
  reducedMotion: boolean;
};

const ScrollContext = createContext<ScrollContextValue | null>(null);

function createInitialState(): SceneState {
  return {
    progress: 0,
    sceneTime: 0,
    chapterIndex: 0,
    chapterId: CHAPTERS[0].id,
    chapterProgress: 0,
    velocity: 0,
    pointer: { x: 0, y: 0, active: false },
    idle: false,
  };
}

export function ScrollProvider({
  children,
  reducedMotion,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  const sectionsRef = useRef(new Map<ChapterId, HTMLElement>());
  const boundsRef = useRef(new Map<ChapterId, { top: number; height: number }>());
  const stateRef = useRef<SceneState>(createInitialState());
  const frameListenersRef = useRef(new Set<Listener>());
  const chapterListenersRef = useRef(new Set<Listener>());
  const lastChapterIndexRef = useRef(0);

  const recalcBounds = useCallback(() => {
    sectionsRef.current.forEach((el, id) => {
      boundsRef.current.set(id, { top: el.offsetTop, height: el.offsetHeight });
    });
  }, []);

  const registerSection = useCallback(
    (id: ChapterId, el: HTMLElement) => {
      sectionsRef.current.set(id, el);
      recalcBounds();
      return () => {
        sectionsRef.current.delete(id);
        boundsRef.current.delete(id);
      };
    },
    [recalcBounds]
  );

  const getState = useCallback(() => stateRef.current, []);

  const subscribeFrame = useCallback((fn: Listener) => {
    frameListenersRef.current.add(fn);
    return () => frameListenersRef.current.delete(fn);
  }, []);

  const subscribeChapterChange = useCallback((fn: Listener) => {
    chapterListenersRef.current.add(fn);
    return () => chapterListenersRef.current.delete(fn);
  }, []);

  useEffect(() => {
    recalcBounds();

    const resizeObserver = new ResizeObserver(() => recalcBounds());
    resizeObserver.observe(document.body);
    window.addEventListener("load", recalcBounds);

    let lenis: Lenis | null = null;
    if (!reducedMotion) {
      lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.1,
      });
      lenis.on("scroll", ScrollTrigger.update);
    }

    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      stateRef.current.idle = false;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        stateRef.current.idle = true;
      }, 4500);
    };
    resetIdle();

    const onPointerMove = (event: PointerEvent) => {
      stateRef.current.pointer = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
        active: true,
      };
      resetIdle();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle);

    let rafId: number;
    let lastScroll = window.scrollY;
    let lastTime = performance.now();

    const tick = (time: number) => {
      lenis?.raf(time);

      const dt = Math.max(time - lastTime, 1);
      lastTime = time;

      const scrollY = window.scrollY;
      const rawVelocity = (scrollY - lastScroll) / dt;
      lastScroll = scrollY;
      stateRef.current.velocity += (rawVelocity - stateRef.current.velocity) * 0.15;

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      stateRef.current.progress = docHeight > 0 ? Math.min(Math.max(scrollY / docHeight, 0), 1) : 0;

      const refPoint = scrollY + window.innerHeight * 0.5;
      const chapters = CHAPTERS;
      let sceneTime = stateRef.current.sceneTime;

      const firstBounds = boundsRef.current.get(chapters[0].id);
      const lastBounds = boundsRef.current.get(chapters[chapters.length - 1].id);

      if (firstBounds && refPoint <= firstBounds.top) {
        sceneTime = 0;
      } else if (lastBounds && refPoint >= lastBounds.top + lastBounds.height) {
        sceneTime = chapters.length - 1;
      } else {
        for (let i = 0; i < chapters.length; i++) {
          const bounds = boundsRef.current.get(chapters[i].id);
          if (!bounds) continue;
          if (refPoint >= bounds.top && refPoint < bounds.top + bounds.height) {
            const local = bounds.height > 0 ? (refPoint - bounds.top) / bounds.height : 0;
            sceneTime = i + Math.min(Math.max(local, 0), 1);
            break;
          }
        }
      }

      const chapterIndex = Math.min(Math.floor(sceneTime), chapters.length - 1);
      const chapterProgress = sceneTime - chapterIndex;

      stateRef.current.sceneTime = sceneTime;
      stateRef.current.chapterIndex = chapterIndex;
      stateRef.current.chapterId = chapters[chapterIndex].id;
      stateRef.current.chapterProgress = chapterProgress;

      frameListenersRef.current.forEach((fn) => fn(stateRef.current));

      if (chapterIndex !== lastChapterIndexRef.current) {
        lastChapterIndexRef.current = chapterIndex;
        chapterListenersRef.current.forEach((fn) => fn(stateRef.current));
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("load", recalcBounds);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      clearTimeout(idleTimer);
      lenis?.destroy();
    };
  }, [reducedMotion, recalcBounds]);

  const value = useMemo<ScrollContextValue>(
    () => ({
      registerSection,
      getState,
      subscribeFrame,
      subscribeChapterChange,
      reducedMotion,
    }),
    [registerSection, getState, subscribeFrame, subscribeChapterChange, reducedMotion]
  );

  return <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>;
}

export function useScrollWorld() {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error("useScrollWorld must be used within a ScrollProvider");
  return ctx;
}

export function useSectionRef(id: ChapterId) {
  const { registerSection } = useScrollWorld();
  return useCallback(
    (el: HTMLElement | null) => {
      if (el) registerSection(id, el);
    },
    [registerSection, id]
  );
}
