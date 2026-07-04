import type { PlanetConfig } from "@/src/components/canvas/types";

export type ActiveSystem =
  | "analytical-pipeline"
  | "archive"
  | "knowledge-graph"
  | "exocortex"
  | "saturn"
  | "macro-intel"
  | "social-signals"
  | null;

export type OpenSystem = Exclude<ActiveSystem, null>;
export type EmbeddedSystem = "analytical-pipeline" | "knowledge-graph" | "exocortex";

export interface SystemFrameConfig {
  eyebrow: string;
  title: string;
  src: string;
  fullBleed?: boolean;
  borderClassName?: string;
}

interface SunConsolePlanetSelectionInput {
  activeSystem: ActiveSystem;
  planetId: string;
  planets: PlanetConfig[];
}

interface SunConsolePlanetSelection {
  selectedPlanet: PlanetConfig | null;
  nextActiveSystem: ActiveSystem;
}

const EMBEDDED_SYSTEM_FRAMES: Record<EmbeddedSystem, SystemFrameConfig> = {
  "analytical-pipeline": {
    eyebrow: "MARS // EXOCORTEX CRUCIBLE",
    title: "The Crucible",
    src: "/analytical-pipeline?embed=1",
  },
  "knowledge-graph": {
    eyebrow: "JUPITER // NEXUS GRAPH",
    title: "The Nexus",
    src: "/knowledge-graph?embed=1",
    fullBleed: true,
    borderClassName: "border-cyan-200/45 shadow-[0_0_90px_rgba(34,211,238,0.22)]",
  },
  exocortex: {
    eyebrow: "NEPTUNE // RAG HUB",
    title: "Exocortex",
    src: "/exocortex",
  },
};

export function getInitialActiveSystem(search: string): ActiveSystem {
  const system = new URLSearchParams(search).get("system");
  return system === "archive" ? "archive" : null;
}

export function findPlanetByHash(hash: string, planets: PlanetConfig[]): PlanetConfig | null {
  const planetName = hash.replace(/^#/, "").toLowerCase();
  if (!planetName) {
    return null;
  }

  return (
    planets.find((planet) => planet.name.toLowerCase() === planetName) ?? null
  );
}

export function findPlanetById(planetId: string, planets: PlanetConfig[]): PlanetConfig | null {
  return (
    planets.find((planet) => planet.name.toLowerCase() === planetId.toLowerCase()) ??
    null
  );
}

export function findPlanetForSystem(
  system: OpenSystem,
  planets: PlanetConfig[]
): PlanetConfig | null {
  if (system === "saturn") {
    return findPlanetById("saturn", planets);
  }

  return planets.find((planet) => planet.module === system) ?? null;
}

export function shouldCloseSystemForFocus(
  activeSystem: ActiveSystem,
  focusedPlanet: PlanetConfig | null
): boolean {
  if (activeSystem === "saturn") {
    return focusedPlanet?.name !== "Saturn";
  }

  if (activeSystem === "macro-intel") {
    return focusedPlanet?.name !== "Uranus";
  }

  if (activeSystem === "social-signals") {
    return focusedPlanet?.module !== "social-signals";
  }

  return false;
}

export function resolveSunConsolePlanetSelection({
  activeSystem,
  planetId,
  planets,
}: SunConsolePlanetSelectionInput): SunConsolePlanetSelection {
  const selectedPlanet = findPlanetById(planetId, planets);
  if (!selectedPlanet) {
    return {
      selectedPlanet: null,
      nextActiveSystem: activeSystem,
    };
  }

  return {
    selectedPlanet,
    nextActiveSystem: selectedPlanet.name === "Saturn" ? activeSystem : null,
  };
}

export function isEmbeddedSystem(system: ActiveSystem): system is EmbeddedSystem {
  return (
    system === "analytical-pipeline" ||
    system === "knowledge-graph" ||
    system === "exocortex"
  );
}

export function getSystemFrame(system: ActiveSystem): SystemFrameConfig | null {
  if (!isEmbeddedSystem(system)) {
    return null;
  }

  return EMBEDDED_SYSTEM_FRAMES[system];
}
