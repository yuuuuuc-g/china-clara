"use client";

import { X } from "lucide-react";
import { DialogFrame } from "@/src/components/ui/DialogFrame";

interface SystemFrameConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title: string;
  eyebrow: string;
  fullBleed?: boolean;
  borderClassName?: string;
}

export function SystemFrameConsole({
  isOpen,
  onClose,
  src,
  title,
  eyebrow,
  fullBleed = false,
  borderClassName = "border-cyan-300/20",
}: SystemFrameConsoleProps) {
  return (
    <DialogFrame
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="system-frame-title"
      panelClassName={`relative flex flex-col overflow-hidden rounded-2xl border bg-black/80 shadow-[0_0_80px_rgba(34,211,238,0.14)] backdrop-blur-xl ${
        fullBleed ? "h-[94vh] w-[96vw]" : "h-[88vh] w-[1180px] max-w-[96vw]"
      } ${borderClassName}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
      <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-b from-cyan-500/[0.06] to-transparent px-7 py-5">
        <div>
          <p className="font-mono text-[11px] tracking-[0.35em] text-cyan-300/85">
            {eyebrow}
          </p>
          <h2 id="system-frame-title" className="mt-2 font-serif text-2xl tracking-widest text-white/95">
            {title}
          </h2>
        </div>
        <button
          aria-label={`Close ${title}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/65 transition hover:border-white/35 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>

      <iframe
        className="min-h-0 flex-1 border-0 bg-zinc-950"
        src={src}
        title={title}
      />
    </DialogFrame>
  );
}
