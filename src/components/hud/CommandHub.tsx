"use client";

import { useRouter } from "next/navigation";
import { PLANETS } from "@/src/components/canvas/SolarSystem";
import { TerminalCommandButton } from "@/src/components/ui/TerminalCommandButton";
import { useSolarStore } from "@/src/store/solarStore";

interface CommandHubProps {
  onOpenArchive: () => void;
  onOpenExocortex: () => void;
  onOpenSaturnRadar: () => void;
}

export function CommandHub({
  onOpenArchive,
  onOpenExocortex,
  onOpenSaturnRadar,
}: CommandHubProps) {
  const router = useRouter();
  const setFocusedPlanet = useSolarStore((state) => state.setFocusedPlanet);

  const focusPlanet = (name: string) => {
    const planet = PLANETS.find((p) => p.name === name);
    if (planet) setFocusedPlanet(planet);
  };

  return (
    <nav
      aria-label="System command hub"
      className="pointer-events-auto absolute bottom-8 left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-4"
    >
      <div className="mb-2 text-center font-mono text-[9px] tracking-[0.35em] text-cyan-400/40">
        ── CENTRAL INTERACTION HUB ──
      </div>
      <div className="grid gap-1.5">
        <TerminalCommandButton
          prefix="EXECUTE"
          label="NEPTUNE_SEARCH"
          onClick={() => {
            focusPlanet("Neptune");
            onOpenExocortex();
          }}
        />
        <TerminalCommandButton
          prefix="INITIALIZE"
          label="CRUCIBLE"
          onClick={() => router.push("/analytical-pipeline")}
        />
        <TerminalCommandButton
          prefix="ACCESS"
          label="ARCHIVE"
          onClick={() => {
            focusPlanet("Earth");
            onOpenArchive();
          }}
        />
        <TerminalCommandButton
          prefix="QUERY"
          label="NEXUS_GRAPH"
          onClick={() => router.push("/knowledge-graph")}
        />
        <TerminalCommandButton
          prefix="SCAN"
          label="MACRO_RADAR"
          onClick={() => {
            focusPlanet("Saturn");
            onOpenSaturnRadar();
          }}
        />
      </div>
      <p className="mt-3 text-center font-mono text-[8px] tracking-wider text-white/20">
        Drag to rotate · Scroll to zoom · Click celestial body to focus
      </p>
    </nav>
  );
}
