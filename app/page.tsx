"use client";

import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Environment } from "@react-three/drei";
import * as THREE from "three";
import { CoreStar } from "@/src/components/canvas/CoreStar";
import { SolarSystem } from "@/src/components/canvas/SolarSystem";
import { CameraController } from "@/src/components/canvas/CameraController";
import { SolarBloom } from "@/src/components/canvas/SolarBloom";
import { PortalNav } from "@/src/components/portal/PortalNav";
import { ModuleDetailPanel } from "@/src/components/portal/ModuleDetailPanel";
import { ModuleGrid } from "@/src/components/portal/ModuleGrid";
import {
  createCanvasRuntimeProfile,
  type CanvasRuntimeProfile,
} from "@/src/modules/canvas/runtime-controller";
import { detect3DCapable, subscribeViewport } from "@/src/lib/portal-runtime";
import { useSolarStore } from "@/src/store/solarStore";
import { defaultLocale, type Locale } from "@/src/i18n/config";

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
  locale: Locale;
  hasFocusedPlanet: boolean;
  orbitTarget: [number, number, number];
  runtime: CanvasRuntimeProfile;
}

const Scene = ({ locale, hasFocusedPlanet, orbitTarget, runtime }: SceneProps) => {
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
      }}
    >
      {runtime.environmentEnabled && (
        <Environment background files="/textures/8k_stars_milky_way.jpg" />
      )}

      <ambientLight intensity={0.6} />
      <directionalLight position={[15, 10, 5]} intensity={1.8} color="#ffffff" />

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={100}
        enabled={!hasFocusedPlanet}
        target={orbitTarget}
      />

      {runtime.starsEnabled && (
        <Stars radius={50} depth={50} count={100} factor={4} saturation={0} fade speed={1} />
      )}

      <CameraController />
      <CoreStar />
      <SolarSystem locale={locale} />
      {runtime.bloomEnabled && <SolarBloom />}
    </Canvas>
  );
};

const MemoizedScene = memo(Scene);

export default function Home() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [webglLost, setWebglLost] = useState(false);
  const focusedPlanet = useSolarStore((state) => state.focusedPlanet);
  const orbitTarget = useMemo<[number, number, number]>(() => [0, 0, 0], []);

  // 首帧（含 SSR）返回 false → 可用的降级网格；挂载后按设备能力升级到 3D，并订阅视口变化。
  const render3D = useSyncExternalStore(
    subscribeViewport,
    () => detect3DCapable(),
    () => false
  );

  const deviceMemoryGb =
    typeof navigator !== "undefined" && "deviceMemory" in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory)
      : undefined;

  const canvasRuntime = useMemo(
    () =>
      createCanvasRuntimeProfile({
        overlayActive: focusedPlanet !== null,
        deviceMemoryGb,
      }),
    [deviceMemoryGb, focusedPlanet]
  );

  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    setWebglLost(true);
  }, []);
  const handleContextRestored = useCallback(() => setWebglLost(false), []);

  useEffect(() => {
    if (!render3D) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [render3D, handleContextLost, handleContextRestored]);

  return (
    <main className="portal-shell relative h-screen w-screen overflow-hidden bg-black text-white">
      <PortalNav locale={locale} onLocaleChange={setLocale} />

      {render3D ? (
        <>
          {webglLost && <WebGLWarning />}
          <MemoizedScene
            locale={locale}
            hasFocusedPlanet={focusedPlanet !== null}
            orbitTarget={orbitTarget}
            runtime={canvasRuntime}
          />
          <ModuleDetailPanel locale={locale} />
        </>
      ) : (
        <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-[#0a0f1e] via-black to-black">
          <ModuleGrid locale={locale} />
        </div>
      )}
    </main>
  );
}
