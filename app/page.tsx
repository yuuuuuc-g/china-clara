"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
// ✨ 引入 Environment 组件
import { OrbitControls, Stars, Environment } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import { CoreStar } from "@/src/components/canvas/CoreStar";
import { PLANETS, SolarSystem } from "@/src/components/canvas/SolarSystem";
import { CameraController } from "@/src/components/canvas/CameraController";
import { NodeDetailPanel } from "@/src/components/hud/NodeDetailPanel";
import { ArchivePanel } from "@/src/components/hud/ArchivePanel";
import { SunConsole } from "@/src/components/hud/SunConsole";
import { SaturnConsole } from "@/src/components/hud/SaturnConsole";
import { GalaxyWorkspace } from "@/src/components/galaxy-workspace";
import { useSolarStore } from "@/src/store/solarStore";
import { useDevRenderCounter } from "@/src/lib/dev-render-profiler";

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
  onSunClick: () => void;
}

const Scene = ({ hasFocusedPlanet, orbitTarget, onSunClick }: SceneProps) => {
  useDevRenderCounter("Home::MemoizedScene");
  return (
    <Canvas
      className="z-0"
      camera={{ position: [0, 8, 40], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl }) => {
        gl.getContext().canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          console.warn("WebGL context lost inside R3F Canvas");
        });
      }}
    >
      <Environment
        background
        files="/textures/2k_stars_milky_way.jpg"
      />

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

      <Stars
        radius={50}
        depth={50}
        count={100}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      <CameraController />
      <CoreStar onSunClick={onSunClick} />
      <SolarSystem />
    </Canvas>
  );
};

export const MemoizedScene = memo(Scene);

export default function Home() {
  useDevRenderCounter("Home::Root");
  const focusedPlanet = useSolarStore((state) => state.focusedPlanet);
  const setFocusedPlanet = useSolarStore((state) => state.setFocusedPlanet);
  const [webglLost, setWebglLost] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [isRAGOpen, setIsRAGOpen] = useState(false);
  const [showSunConsole, setShowSunConsole] = useState(false);
  const orbitTarget = useMemo<[number, number, number]>(() => [0, 0, 0], []);

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
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [handleContextLost, handleContextRestored]);

  const isRAGVisible = isRAGOpen && focusedPlanet?.name === "Neptune";
  const isSaturnVisible = focusedPlanet?.name === "Saturn";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSunConsole(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleSunConsolePlanetSelect = useCallback(
    (planetId: string) => {
      const selectedPlanet = PLANETS.find(
        (planet) => planet.name.toLowerCase() === planetId.toLowerCase()
      );
      if (!selectedPlanet) {
        return;
      }
      setFocusedPlanet(selectedPlanet);
      setShowSunConsole(false);
    },
    [setFocusedPlanet]
  );
  const handleSunClick = useCallback(() => {
    setShowSunConsole(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyHashFocus = () => {
      const hash = window.location.hash.replace(/^#/, "").toLowerCase();
      if (!hash) return;
      const candidate = PLANETS.find(
        (planet) => planet.name.toLowerCase() === hash
      );
      if (candidate) {
        setFocusedPlanet(candidate);
      }
    };
    applyHashFocus();
    window.addEventListener("hashchange", applyHashFocus);
    return () => window.removeEventListener("hashchange", applyHashFocus);
  }, [setFocusedPlanet]);

  return (
    <main className="relative h-screen w-screen bg-black">
      {webglLost && <WebGLWarning />}
      
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-8 text-white">
        <h1 className="font-serif text-2xl tracking-widest text-white/50">A SPACE</h1>
        <p className="mt-2 text-xs tracking-wider text-white/30">
          {focusedPlanet ? "Click Back to Galaxy to return" : "Drag to rotate • Scroll to zoom • Click planet to focus"}
        </p>
      </div>

      <MemoizedScene
        hasFocusedPlanet={focusedPlanet !== null}
        orbitTarget={orbitTarget}
        onSunClick={handleSunClick}
      />

      <NodeDetailPanel
        onEnterArchive={() => setShowArchive(true)}
        onEnterExocortex={() => {
          setShowArchive(false);
          setIsRAGOpen(true);
        }}
        isRAGOpen={isRAGVisible}
      />

      {showArchive && (
        <ArchivePanel onClose={() => setShowArchive(false)} />
      )}

      <SunConsole
        isOpen={showSunConsole}
        onClose={() => setShowSunConsole(false)}
        onPlanetSelect={handleSunConsolePlanetSelect}
      />

      <SaturnConsole
        isOpen={isSaturnVisible}
        onClose={() => setFocusedPlanet(null)}
      />

      <AnimatePresence>
        {isRAGVisible && (
          <motion.aside
            className="absolute inset-y-0 right-0 z-30 flex h-full h-screen w-full max-w-[min(1100px,95vw)] flex-col border-l border-cyan-300/20 bg-black/95 shadow-[-24px_0_80px_rgba(0,0,0,0.6)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <button
              aria-label="Close Exocortex panel"
              className="absolute right-4 top-4 z-40 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/65 transition-colors hover:text-white"
              onClick={() => setIsRAGOpen(false)}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
            <GalaxyWorkspace />
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
