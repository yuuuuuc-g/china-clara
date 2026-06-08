"use client";

export function MissionHeader() {
  return (
    <header className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 px-4 pt-6 text-center">
      <h1 className="font-mono text-sm tracking-[0.45em] text-cyan-100/90 drop-shadow-[0_0_12px_rgba(52,211,153,0.45)] sm:text-base">
        <span className="text-emerald-400/80">[</span>
        <span className="text-shadow-glow"> THE MAGELLAN EXCHANGE </span>
        <span className="text-emerald-400/80">]</span>
      </h1>
      <p className="mt-2 font-mono text-[9px] tracking-wide text-cyan-300/45 sm:text-[10px]">
        <span className="text-emerald-500/50">&gt; </span>
        Interconnecting socio-economic structures: 中文语境 ⇋ Mundo Hispano
      </p>
    </header>
  );
}
