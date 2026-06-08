"use client";

import { TerminalPanel } from "@/src/components/ui/TerminalPanel";

const LATAM_SIGNALS = [
  {
    source: "CDMX // INDEPENDIENTE",
    timestamp: "14:32 UTC-6",
    excerpt:
      "Entrevista callejera: trabajadores del mercado reportan presión inflacionaria en insumos básicos…",
    status: "LIVE",
  },
  {
    source: "OAXACA // BLOG LOCAL",
    timestamp: "13:58 UTC-6",
    excerpt:
      "Análisis comunitario sobre migración circular y remesas en la Mixteca alta…",
    status: "SYNC",
  },
  {
    source: "GDL // SIGNAL FEED",
    timestamp: "13:41 UTC-6",
    excerpt:
      "Post independiente: efectos del nearshoring en cadena de suministro regional…",
    status: "QUEUE",
  },
] as const;

function SignalSkeleton() {
  return (
    <div className="animate-pulse space-y-2 border-l border-emerald-400/20 pl-3">
      <div className="h-2 w-24 rounded bg-emerald-400/10" />
      <div className="h-2 w-full rounded bg-white/5" />
      <div className="h-2 w-[80%] rounded bg-white/5" />
    </div>
  );
}

export function ObservatorioPanel() {
  return (
    <TerminalPanel className="absolute left-4 top-24 z-10 w-72 max-w-[calc(100vw-2rem)]">
      <div className="border-b border-cyan-400/15 px-3 py-2">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400/80">
          ◆ LATAM RAW SIGNALS
        </p>
        <p className="mt-0.5 text-[9px] tracking-wider text-white/30">
          EL OBSERVATORIO · MEXICO NODE
        </p>
      </div>

      <div className="terminal-scroll max-h-64 overflow-hidden px-3 py-3">
        <div className="space-y-4">
          {LATAM_SIGNALS.map((signal) => (
            <article
              key={signal.source}
              className="border-l border-cyan-400/25 pl-3 transition-colors hover:border-emerald-400/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] tracking-wider text-cyan-300/70">
                  {signal.source}
                </span>
                <span className="text-[8px] text-emerald-400/50">{signal.status}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-white/55">
                {signal.excerpt}
              </p>
              <p className="mt-1 text-[8px] text-white/25">{signal.timestamp}</p>
            </article>
          ))}
          <SignalSkeleton />
        </div>
      </div>
    </TerminalPanel>
  );
}
