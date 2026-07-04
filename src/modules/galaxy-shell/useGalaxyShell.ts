"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PLANETS } from "@/src/components/canvas/SolarSystem";
import type { PlanetConfig } from "@/src/components/canvas/types";
import { useSolarStore } from "@/src/store/solarStore";
import {
  findPlanetByHash,
  findPlanetForSystem,
  getInitialActiveSystem,
  getSystemFrame,
  resolveSunConsolePlanetSelection,
  shouldCloseSystemForFocus,
  type ActiveSystem,
  type OpenSystem,
  type SystemFrameConfig,
} from "./shell";

interface UseGalaxyShellOptions {
  planets?: PlanetConfig[];
}

interface GalaxyShellCommands {
  closeAll: () => void;
  closeSunConsole: () => void;
  closeSystem: () => void;
  openAnalyticalPipeline: () => void;
  openArchive: () => void;
  openExocortex: () => void;
  openKnowledgeGraph: () => void;
  openMacroIntel: () => void;
  openSaturnRadar: () => void;
  openSocialSignals: () => void;
  openSunConsole: () => void;
  openSystem: (system: OpenSystem) => void;
  selectPlanetFromSunConsole: (planetId: string) => void;
}

interface GalaxyShellState {
  activeSystem: ActiveSystem;
  focusedPlanet: PlanetConfig | null;
  isOverlayActive: boolean;
  isSunConsoleOpen: boolean;
  systemFrame: SystemFrameConfig | null;
  commands: GalaxyShellCommands;
}

function isCloseSystemMessage(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "knowledge-galaxy:close-system"
  );
}

export function useGalaxyShell({
  planets = PLANETS,
}: UseGalaxyShellOptions = {}): GalaxyShellState {
  const focusedPlanet = useSolarStore((state) => state.focusedPlanet);
  const setFocusedPlanet = useSolarStore((state) => state.setFocusedPlanet);
  const [isSunConsoleOpen, setIsSunConsoleOpen] = useState(false);
  const [activeSystem, setActiveSystem] = useState<ActiveSystem>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return getInitialActiveSystem(window.location.search);
  });

  const closeSystem = useCallback(() => {
    setActiveSystem(null);
  }, []);

  const closeSunConsole = useCallback(() => {
    setIsSunConsoleOpen(false);
  }, []);

  const closeAll = useCallback(() => {
    setIsSunConsoleOpen(false);
    setActiveSystem(null);
  }, []);

  const openSystem = useCallback(
    (system: OpenSystem) => {
      const planet = findPlanetForSystem(system, planets);
      if (planet) {
        setFocusedPlanet(planet);
      }

      setActiveSystem(system);
    },
    [planets, setFocusedPlanet]
  );

  const selectPlanetFromSunConsole = useCallback(
    (planetId: string) => {
      const selection = resolveSunConsolePlanetSelection({
        activeSystem,
        planetId,
        planets,
      });
      if (!selection.selectedPlanet) {
        return;
      }

      setFocusedPlanet(selection.selectedPlanet);
      setActiveSystem(selection.nextActiveSystem);
      setIsSunConsoleOpen(false);
    },
    [activeSystem, planets, setFocusedPlanet]
  );

  useEffect(() => {
    if (shouldCloseSystemForFocus(activeSystem, focusedPlanet)) {
      const timer = window.setTimeout(() => setActiveSystem(null), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [activeSystem, focusedPlanet]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAll();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAll]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (isCloseSystemMessage(event.data)) {
        closeSystem();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [closeSystem]);

  useEffect(() => {
    const applyHashFocus = () => {
      const planet = findPlanetByHash(window.location.hash, planets);
      if (planet) {
        setFocusedPlanet(planet);
      }
    };

    applyHashFocus();
    window.addEventListener("hashchange", applyHashFocus);
    return () => window.removeEventListener("hashchange", applyHashFocus);
  }, [planets, setFocusedPlanet]);

  useEffect(() => {
    const initialSystem = getInitialActiveSystem(window.location.search);
    if (initialSystem === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      const planet = findPlanetForSystem(initialSystem, planets);
      if (planet) {
        setFocusedPlanet(planet);
      }
      setActiveSystem(initialSystem);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [planets, setFocusedPlanet]);

  const systemFrame = useMemo(() => getSystemFrame(activeSystem), [activeSystem]);

  const commands = useMemo<GalaxyShellCommands>(
    () => ({
      closeAll,
      closeSunConsole,
      closeSystem,
      openAnalyticalPipeline: () => openSystem("analytical-pipeline"),
      openArchive: () => openSystem("archive"),
      openExocortex: () => openSystem("exocortex"),
      openKnowledgeGraph: () => openSystem("knowledge-graph"),
      openMacroIntel: () => openSystem("macro-intel"),
      openSaturnRadar: () => openSystem("saturn"),
      openSocialSignals: () => openSystem("social-signals"),
      openSunConsole: () => setIsSunConsoleOpen(true),
      openSystem,
      selectPlanetFromSunConsole,
    }),
    [
      closeAll,
      closeSunConsole,
      closeSystem,
      openSystem,
      selectPlanetFromSunConsole,
    ]
  );

  return {
    activeSystem,
    focusedPlanet,
    isOverlayActive: isSunConsoleOpen || activeSystem !== null,
    isSunConsoleOpen,
    systemFrame,
    commands,
  };
}
