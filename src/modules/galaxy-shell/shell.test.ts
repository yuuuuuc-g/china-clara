import { describe, expect, it } from "vitest";
import type { PlanetConfig } from "@/src/components/canvas/types";
import {
  findPlanetByHash,
  getInitialActiveSystem,
  getSystemFrame,
  isEmbeddedSystem,
  resolveSunConsolePlanetSelection,
  shouldCloseSystemForFocus,
} from "./shell";

const planets: PlanetConfig[] = [
  {
    name: "Earth",
    size: 1,
    orbitRadius: 1,
    orbitSpeed: 1,
    rotationSpeed: 1,
    color: "#4f86f7",
    module: "archive",
  },
  {
    name: "Saturn",
    size: 1,
    orbitRadius: 1,
    orbitSpeed: 1,
    rotationSpeed: 1,
    color: "#e3dccb",
  },
  {
    name: "Uranus",
    size: 1,
    orbitRadius: 1,
    orbitSpeed: 1,
    rotationSpeed: 1,
    color: "#a7d6d6",
    module: "macro-intel",
  },
  {
    name: "Venus",
    size: 1,
    orbitRadius: 1,
    orbitSpeed: 1,
    rotationSpeed: 1,
    color: "#e6c288",
    module: "social-signals",
  },
];

describe("galaxy shell rules", () => {
  it("opens only route-addressable systems from the initial query", () => {
    expect(getInitialActiveSystem("?system=archive")).toBe("archive");
    expect(getInitialActiveSystem("?system=saturn")).toBeNull();
    expect(getInitialActiveSystem("")).toBeNull();
  });

  it("resolves hash focus by planet name without case sensitivity", () => {
    expect(findPlanetByHash("#EARTH", planets)?.name).toBe("Earth");
    expect(findPlanetByHash("saturn", planets)?.name).toBe("Saturn");
    expect(findPlanetByHash("#pluto", planets)).toBeNull();
  });

  it("closes planet-bound systems when focus no longer matches their planet", () => {
    expect(shouldCloseSystemForFocus("saturn", planets[1])).toBe(false);
    expect(shouldCloseSystemForFocus("saturn", planets[0])).toBe(true);
    expect(shouldCloseSystemForFocus("macro-intel", planets[2])).toBe(false);
    expect(shouldCloseSystemForFocus("social-signals", planets[3])).toBe(false);
    expect(shouldCloseSystemForFocus("archive", null)).toBe(false);
  });

  it("keeps Saturn radar open only when Saturn is selected from the Sun console", () => {
    const saturnSelection = resolveSunConsolePlanetSelection({
      activeSystem: "saturn",
      planetId: "saturn",
      planets,
    });
    expect(saturnSelection.selectedPlanet?.name).toBe("Saturn");
    expect(saturnSelection.nextActiveSystem).toBe("saturn");

    const earthSelection = resolveSunConsolePlanetSelection({
      activeSystem: "saturn",
      planetId: "earth",
      planets,
    });
    expect(earthSelection.selectedPlanet?.name).toBe("Earth");
    expect(earthSelection.nextActiveSystem).toBeNull();
  });

  it("describes embedded frame systems behind one interface", () => {
    expect(isEmbeddedSystem("knowledge-graph")).toBe(true);
    expect(isEmbeddedSystem("archive")).toBe(false);
    expect(getSystemFrame("knowledge-graph")).toMatchObject({
      fullBleed: true,
      src: "/knowledge-graph?embed=1",
    });
    expect(getSystemFrame("saturn")).toBeNull();
  });
});
