"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSolarStore } from "@/src/store/solarStore";
import { MissionHeader } from "@/src/components/hud/MissionHeader";

export function GalaxyTerminalHUD() {
  const focusedPlanet = useSolarStore((state) => state.focusedPlanet);
  const isGalaxyView = focusedPlanet === null;

  return (
    <AnimatePresence>
      {isGalaxyView && (
        <motion.div
          key="galaxy-terminal-hud"
          className="pointer-events-none absolute inset-0 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <MissionHeader />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
