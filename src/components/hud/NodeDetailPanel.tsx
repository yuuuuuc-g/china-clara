"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSolarStore } from "@/src/store/solarStore";
import { CyberButton } from "@/src/components/ui/CyberButton";
import { GlassPanel } from "@/src/components/ui/GlassPanel";

export function NodeDetailPanel() {
  const focusedPlanet = useSolarStore((state) => state.focusedPlanet);
  const setFocusedPlanet = useSolarStore((state) => state.setFocusedPlanet);

  if (!focusedPlanet) return null;

  const isNeptune = focusedPlanet.name === "Neptune";
  const panelTitle = isNeptune ? "Neptune" : focusedPlanet.name.toUpperCase();
  const panelDescription = focusedPlanet.description;

  return (
    <GlassPanel className="pointer-events-auto absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-y-0 border-r-0 p-6">
      <div className="mb-8">
        <h2 className="font-serif text-3xl tracking-widest text-[#deff9a]">
          {panelTitle}
        </h2>

        <div className="mt-2 flex flex-col gap-1">
          {focusedPlanet.label && (
            <span className="text-xs font-bold tracking-widest text-[#deff9a]/80">
              [ {focusedPlanet.label.toUpperCase()} ]
            </span>
          )}
          {focusedPlanet.type && (
            <span className="text-xs font-medium tracking-wide text-white/50">
              {focusedPlanet.type.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {panelDescription ? (
          <motion.div
            key="planet-description"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-8 overflow-hidden"
          >
            <div className="text-sm leading-relaxed tracking-wide text-white/70">
              <p>{panelDescription}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-4 text-sm">
        {focusedPlanet.mass && (
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/40">Mass</span>
            <span className="font-mono text-[#deff9a]">{focusedPlanet.mass}</span>
          </div>
        )}

        {focusedPlanet.gravity && (
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/40">Gravity</span>
            <span className="font-mono text-[#deff9a]">{focusedPlanet.gravity}</span>
          </div>
        )}

        <div className="flex justify-between border-b border-white/10 pb-2">
          <span className="text-white/40">Orbit Radius</span>
          <span className="font-mono text-white/90">{focusedPlanet.orbitRadius} AU</span>
        </div>

        <div className="flex justify-between border-b border-white/10 pb-2">
          <span className="text-white/40">Size</span>
          <span className="font-mono text-white/90">{focusedPlanet.size} R⊕</span>
        </div>

        <div className="flex justify-between border-b border-white/10 pb-2">
          <span className="text-white/40">Orbit Speed</span>
          <span className="font-mono text-white/90">{focusedPlanet.orbitSpeed}</span>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <CyberButton
          variant="secondary"
          onClick={() => setFocusedPlanet(null)}
          className="w-full"
        >
          Back to Galaxy
        </CyberButton>
      </div>
    </GlassPanel>
  );
}
