"use client";

import type { ComponentPropsWithoutRef } from "react";

interface TerminalCommandButtonProps extends ComponentPropsWithoutRef<"button"> {
  prefix?: "EXECUTE" | "INITIALIZE" | "ACCESS" | "QUERY" | "SCAN";
  label: string;
}

export function TerminalCommandButton({
  prefix = "EXECUTE",
  label,
  className = "",
  type = "button",
  ...props
}: TerminalCommandButtonProps) {
  return (
    <button
      type={type}
      className={`terminal-cmd-btn group relative w-full overflow-hidden border border-cyan-400/25 bg-black/60 px-4 py-2.5 text-left font-mono text-[11px] tracking-wider text-cyan-100/90 transition-all hover:border-emerald-400/50 hover:bg-emerald-950/30 hover:text-emerald-200 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      <span className="relative z-10">
        <span className="text-emerald-400/70">&gt; </span>
        <span className="text-cyan-400/60">{prefix}:</span>{" "}
        <span className="text-white/90 group-hover:text-emerald-200">{label}</span>
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <span className="terminal-scanline absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-0 bg-emerald-400/60 transition-all duration-300 group-hover:w-full"
      />
    </button>
  );
}
