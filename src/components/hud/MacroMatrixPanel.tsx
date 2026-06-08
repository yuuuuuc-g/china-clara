"use client";

import { TerminalPanel } from "@/src/components/ui/TerminalPanel";

const MACRO_BRIEFINGS = [
  {
    tag: "FX",
    headline: "USD/MXN volatility spike — Banxico watchlist elevated",
    delta: "+1.8σ",
    region: "LATAM",
  },
  {
    tag: "POLICY",
    headline: "EU carbon border adjustment — secondary effects on MX exports",
    delta: "NEW",
    region: "TRANSATLANTIC",
  },
  {
    tag: "RATES",
    headline: "Fed dot-plot shift compresses EM carry trade window",
    delta: "−24h",
    region: "GLOBAL",
  },
  {
    tag: "TRADE",
    headline: "USMCA rules-of-origin review — supply chain repricing signal",
    delta: "ACTIVE",
    region: "NORTH AMERICA",
  },
] as const;

export function MacroMatrixPanel() {
  return (
    <TerminalPanel className="absolute right-4 top-24 z-10 w-72 max-w-[calc(100vw-2rem)]">
      <div className="border-b border-cyan-400/15 px-3 py-2">
        <p className="text-[10px] tracking-[0.3em] text-cyan-300/80">
          ◆ MACRO STRUCTURES
        </p>
        <p className="mt-0.5 text-[9px] tracking-wider text-white/30">
          MACRO MATRIX · TIER-1 FEED
        </p>
      </div>

      <div className="space-y-0 px-1 py-2">
        {MACRO_BRIEFINGS.map((item) => (
          <article
            key={item.headline}
            className="border-b border-white/5 px-2 py-2.5 transition-colors last:border-b-0 hover:bg-cyan-950/20"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded border border-cyan-400/25 px-1.5 py-0.5 text-[8px] tracking-widest text-cyan-300/70">
                {item.tag}
              </span>
              <span className="font-mono text-[8px] text-emerald-400/50">{item.delta}</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/60">
              {item.headline}
            </p>
            <p className="mt-1 text-[8px] tracking-wider text-white/25">{item.region}</p>
          </article>
        ))}
      </div>
    </TerminalPanel>
  );
}
