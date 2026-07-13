"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
// ✨ 引入 Environment 组件
import { OrbitControls, Stars, Environment } from "@react-three/drei";
import * as THREE from "three";
import { CoreStar } from "@/src/components/canvas/CoreStar";
import { SolarSystem } from "@/src/components/canvas/SolarSystem";
import { CameraController } from "@/src/components/canvas/CameraController";
import { SolarBloom } from "@/src/components/canvas/SolarBloom";
import { NodeDetailPanel } from "@/src/components/hud/NodeDetailPanel";
import { GalaxyTerminalHUD } from "@/src/components/hud/GalaxyTerminalHUD";
import { useDevRenderCounter } from "@/src/lib/dev-render-profiler";
import {
  createCanvasRuntimeProfile,
  type CanvasRuntimeProfile,
} from "@/src/modules/canvas/runtime-controller";
import { useSolarStore } from "@/src/store/solarStore";

function WebGLWarning() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
      <div className="text-center">
        <p className="text-lg font-bold">WebGL Context Lost</p>
        <p className="mt-2 text-sm text-white/60">Please refresh the page to restore 3D rendering</p>
      </div>
    </div>
  );
}

interface SceneProps {
  hasFocusedPlanet: boolean;
  orbitTarget: [number, number, number];
  runtime: CanvasRuntimeProfile;
}

const Scene = ({ hasFocusedPlanet, orbitTarget, runtime }: SceneProps) => {
  useDevRenderCounter("Home::MemoizedScene");
  return (
    <Canvas
      className="absolute inset-0 z-0 h-full w-full"
      style={{ height: "100%", inset: 0, position: "absolute", width: "100%" }}
      camera={{ position: [0, 8, 40], fov: 45 }}
      dpr={runtime.dpr}
      frameloop={runtime.frameloop}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.92;
        gl.getContext().canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          console.warn("WebGL context lost inside R3F Canvas");
        });
      }}
    >
      {runtime.environmentEnabled && (
        <Environment
          background
          files="/textures/8k_stars_milky_way.jpg"
        />
      )}

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[15, 10, 5]}
        intensity={1.8}
        color="#ffffff"
      />

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={100}
        enabled={!hasFocusedPlanet}
        target={orbitTarget}
      />

      {runtime.starsEnabled && (
        <Stars
          radius={50}
          depth={50}
          count={100}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      )}

      <CameraController />
      <CoreStar />
      <SolarSystem />
      {runtime.bloomEnabled && <SolarBloom />}
    </Canvas>
  );
};

export const MemoizedScene = memo(Scene);

export default function Home() {
  useDevRenderCounter("Home::Root");
  const focusedPlanet = useSolarStore((state) => state.focusedPlanet);
  const setFocusedPlanet = useSolarStore((state) => state.setFocusedPlanet);
  const [webglLost, setWebglLost] = useState(false);
  const orbitTarget = useMemo<[number, number, number]>(() => [0, 0, 0], []);
  const deviceMemoryGb =
    typeof navigator !== "undefined" && "deviceMemory" in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory)
      : undefined;
  const canvasRuntime = useMemo(
    () =>
      createCanvasRuntimeProfile({
        overlayActive: false,
        deviceMemoryGb,
      }),
    [deviceMemoryGb]
  );

  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    console.warn("WebGL context lost - attempting recovery");
    setWebglLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    console.log("WebGL context restored");
    setWebglLost(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFocusedPlanet(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setFocusedPlanet]);

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [handleContextLost, handleContextRestored]);

  return (
    <main className="relative h-screen w-screen bg-black">
      {webglLost && <WebGLWarning />}

      <GalaxyTerminalHUD />

      <MemoizedScene
        hasFocusedPlanet={focusedPlanet !== null}
        orbitTarget={orbitTarget}
        runtime={canvasRuntime}
      />

      <NodeDetailPanel />
    </main>
  );
}
