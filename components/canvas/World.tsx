"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { useScrollWorld } from "@/lib/scroll/ScrollProvider";
import {
  createCameraJourney,
  fovAt,
  signalsAt,
  CASCADE_TRIGGERS,
  SERVICE_CLUSTERS,
  PROJECT_CLUSTERS,
} from "./cameraJourney";
import { SERVICES, PROJECTS } from "@/content/data";
import { useNeuralSystem } from "./useNeuralSystem";
import { useCosmos } from "./useCosmos";
import { CHAPTERS } from "@/content/data";
import type { QualitySettings } from "@/lib/quality/useQualityTier";

// A portrait phone sees far less world-space width at the same FOV, so the
// camera backs off by the aspect shortfall to keep the composition intact.
const REFERENCE_ASPECT = 1.5;
// Capped deliberately: pulling back far enough to fit the full width on a
// phone would shrink the organism into a speck. Mild cropping reads better
// than a distant, powerless composition.
const MAX_ASPECT_COMPENSATION = 1.55;
const CHAPTER_COUNT = CHAPTERS.length;

export function World({ quality }: { quality: QualitySettings }) {
  const { getState } = useScrollWorld();
  const { camera, size } = useThree();

  const macro = useNeuralSystem({
    seed: 1337,
    nodeBudget: quality.nodeBudget,
    fieldNodes: quality.fieldNodes,
    maxSignals: quality.maxSignals,
    nodeSize: quality.nodeSize,
    signalSize: quality.signalSize,
    scale: 1,
  });

  // The same generator at a different seed, shrunk and parked inside one
  // neuron. Diving into it is what makes the universe feel bottomless.
  const micro = useNeuralSystem({
    seed: 88,
    nodeBudget: quality.microNodeBudget,
    fieldNodes: 0,
    maxSignals: Math.round(quality.maxSignals * 0.35),
    nodeSize: quality.nodeSize,
    signalSize: quality.signalSize,
    scale: 1,
  });

  const cosmos = useCosmos(quality.starCount, quality.starSize);
  const journey = useMemo(() => createCameraJourney(), []);

  const microGroup = useRef<THREE.Group>(null);
  const cameraPos = useRef(new THREE.Vector3(0, 6, 215));
  const focusPos = useRef(new THREE.Vector3(0, 4, 0));
  const smoothedFov = useRef(32);
  const energy = useRef(0);
  const cursorInfluence = useRef(0);
  const cursorWorld = useRef(new THREE.Vector3(9999, 9999, 9999));
  const lastPointer = useRef({ x: 0, y: 0 });
  const firedTriggers = useRef(new Set<string>());
  const lastU = useRef(0);

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchFocus = useMemo(() => new THREE.Vector3(), []);
  const scratchDir = useMemo(() => new THREE.Vector3(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const macroSystem = macro;
    const microSystem = micro;
    return () => {
      macroSystem.dispose();
      microSystem.dispose();
    };
  }, [macro, micro]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const state = getState();
    const elapsed = performance.now() / 1000;
    const smoothFactor = 1 - Math.pow(0.0018, delta);

    // Reduced motion: a still, fully-formed universe with only ambient drift.
    const u = quality.reducedMotion
      ? 0.62
      : THREE.MathUtils.clamp(state.sceneTime / CHAPTER_COUNT, 0, 1);

    const signals = signalsAt(u);

    // Scroll speed and cursor speed feed one shared "how alive is it" value,
    // so the universe responds to how the person is actually behaving.
    const pointerSpeed = quality.pointerFX
      ? Math.hypot(state.pointer.x - lastPointer.current.x, state.pointer.y - lastPointer.current.y) * 12
      : 0;
    lastPointer.current = { x: state.pointer.x, y: state.pointer.y };
    const targetEnergy = quality.reducedMotion
      ? 0
      : THREE.MathUtils.clamp(Math.abs(state.velocity) * 0.55 + pointerSpeed, 0, 1);
    energy.current += (targetEnergy - energy.current) * (targetEnergy > energy.current ? 0.2 : 0.03);

    // ---- scripted phenomena ------------------------------------------------
    if (!quality.reducedMotion) {
      for (const trigger of CASCADE_TRIGGERS) {
        if (firedTriggers.current.has(trigger.label)) continue;
        if (lastU.current < trigger.at && u >= trigger.at) {
          firedTriggers.current.add(trigger.label);
          macro.engine.cascade(trigger.intensity);
          macro.engine.cascade(trigger.intensity * 0.8);
          if (trigger.label === "micro-dive") micro.engine.cascade(1);
        }
      }
      // Scrolling back up rearms the events so the journey can be replayed.
      if (u < lastU.current - 0.05) firedTriggers.current.clear();
    }
    lastU.current = u;

    // ---- the region that belongs to what is being read ---------------------
    let activeCluster = -1;
    if (!quality.reducedMotion) {
      if (state.chapterId === "services") {
        const index = Math.min(Math.floor(state.chapterProgress * SERVICES.length), SERVICES.length - 1);
        activeCluster = SERVICE_CLUSTERS[index];
      } else if (state.chapterId === "portfolio") {
        const index = Math.min(Math.floor(state.chapterProgress * PROJECTS.length), PROJECTS.length - 1);
        activeCluster = PROJECT_CLUSTERS[index];
      }
      if (activeCluster >= 0) {
        macro.engine.fireCluster(activeCluster, 2, 0.85);
      }
    }

    // ---- simulation --------------------------------------------------------
    const liveliness = quality.reducedMotion ? 0.12 : signals.liveliness;
    macro.engine.update(delta, energy.current, liveliness);
    if (signals.converge > 0.25) macro.engine.quiet(signals.converge * delta * 1.6);
    macro.sync();

    if (signals.microVisibility > 0.01) {
      micro.engine.update(delta, energy.current, 1.1);
      micro.sync();
    }

    // ---- camera ------------------------------------------------------------
    journey.path.getPoint(u, scratchPos);
    journey.focus.getPoint(u, scratchFocus);

    // Turn the shot toward whichever region the copy is currently about.
    if (activeCluster >= 0) {
      const center = macro.network.clusters[activeCluster].center;
      scratchFocus.lerp(center, 0.55);
    }

    const aspect = size.width / Math.max(size.height, 1);
    const aspectCompensation =
      aspect < REFERENCE_ASPECT
        ? Math.min(REFERENCE_ASPECT / Math.max(aspect, 0.3), MAX_ASPECT_COMPENSATION)
        : 1;
    scratchPos.sub(scratchFocus).multiplyScalar(aspectCompensation).add(scratchFocus);

    if (!quality.reducedMotion) {
      // Momentum — fast scrolling throws the camera slightly off its rail.
      const drift = THREE.MathUtils.clamp(state.velocity * 0.5, -2.5, 2.5) * quality.cameraAmplitude;
      scratchPos.y -= drift * 0.4;
      scratchPos.z += Math.abs(drift) * 0.5;

      if (state.idle) {
        scratchPos.x += Math.sin(elapsed * 0.19) * 0.9 * quality.cameraAmplitude;
        scratchPos.y += Math.cos(elapsed * 0.15) * 0.6 * quality.cameraAmplitude;
      }

      if (quality.pointerFX) {
        scratchPos.x += state.pointer.x * 1.6 * quality.cameraAmplitude;
        scratchPos.y += state.pointer.y * 1.1 * quality.cameraAmplitude;
      }
    }

    cameraPos.current.lerp(scratchPos, smoothFactor);
    focusPos.current.lerp(scratchFocus, smoothFactor);
    camera.position.copy(cameraPos.current);
    camera.lookAt(focusPos.current);

    const targetFov = fovAt(u) * (quality.reducedMotion ? 1 : 1 + energy.current * 0.05);
    smoothedFov.current += (targetFov - smoothedFov.current) * smoothFactor;
    const persp = camera as THREE.PerspectiveCamera;
    if (Math.abs(persp.fov - smoothedFov.current) > 0.002) {
      persp.fov = smoothedFov.current;
      persp.updateProjectionMatrix();
    }

    // ---- cursor as a force -------------------------------------------------
    if (quality.pointerFX && state.pointer.active) {
      ndc.set(state.pointer.x, state.pointer.y);
      raycaster.setFromCamera(ndc, camera);
      camera.getWorldDirection(scratchDir);
      plane.setFromNormalAndCoplanarPoint(scratchDir.clone().negate(), focusPos.current);
      if (raycaster.ray.intersectPlane(plane, hitPoint)) {
        cursorWorld.current.lerp(hitPoint, 0.12);
        // Presence alone wakes neurons: the cursor is an exploration tool.
        if (!quality.reducedMotion && energy.current > 0.04) {
          macro.engine.fireNear(
            cursorWorld.current.x,
            cursorWorld.current.y,
            cursorWorld.current.z,
            6,
            1
          );
        }
      }
      cursorInfluence.current += (1 - cursorInfluence.current) * 0.06;
    } else {
      cursorInfluence.current += (0 - cursorInfluence.current) * 0.04;
    }

    // ---- uniforms ----------------------------------------------------------
    const applyShared = (system: typeof macro, opacity: number, reveal: number) => {
      system.shared.uTime.value = elapsed;
      system.shared.uEnergy.value = energy.current;
      system.shared.uOpacity.value = opacity;
      system.shared.uReveal.value = reveal;
      system.shared.uDpr.value = quality.dpr;
      system.signalUniforms.uOpacity.value = opacity;
    };

    applyShared(macro, signals.structureOpacity * (1 - signals.converge * 0.55), signals.reveal);
    macro.nodeUniforms.uCursor.value.copy(cursorWorld.current);
    macro.nodeUniforms.uCursorInfluence.value = cursorInfluence.current;

    applyShared(micro, signals.microVisibility, signals.microVisibility);
    micro.nodeUniforms.uCursorInfluence.value = 0;

    if (microGroup.current) {
      microGroup.current.visible = signals.microVisibility > 0.01;
    }

    cosmos.starUniforms.uTime.value = elapsed;
    cosmos.starUniforms.uDpr.value = quality.dpr;
    cosmos.starUniforms.uOpacity.value = signals.cosmosOpacity;
    cosmos.nebulaUniforms.uTime.value = elapsed;
    cosmos.nebulaUniforms.uOpacity.value = signals.cosmosOpacity * 0.5;
  });

  const anchor = macro.network.microAnchor;

  return (
    <>
      <mesh geometry={cosmos.nebulaGeometry} material={cosmos.nebulaMaterial} frustumCulled={false} />
      <points geometry={cosmos.starGeometry} material={cosmos.starMaterial} frustumCulled={false} />

      <lineSegments geometry={macro.edgeGeometry} material={macro.edgeMaterial} frustumCulled={false} />
      <points geometry={macro.nodeGeometry} material={macro.nodeMaterial} frustumCulled={false} />
      <lineSegments geometry={macro.trailGeometry} material={macro.trailMaterial} frustumCulled={false} />
      <points geometry={macro.signalGeometry} material={macro.signalMaterial} frustumCulled={false} />

      <group
        ref={microGroup}
        position={[anchor.x, anchor.y, anchor.z]}
        scale={quality.microScale}
        visible={false}
      >
        <lineSegments geometry={micro.edgeGeometry} material={micro.edgeMaterial} frustumCulled={false} />
        <points geometry={micro.nodeGeometry} material={micro.nodeMaterial} frustumCulled={false} />
        <points geometry={micro.signalGeometry} material={micro.signalMaterial} frustumCulled={false} />
      </group>
    </>
  );
}
