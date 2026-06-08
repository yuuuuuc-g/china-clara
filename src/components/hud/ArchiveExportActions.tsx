"use client";

import { downloadAsMarkdown } from "@/src/lib/export-utils";

interface ArchiveExportActionsProps {
  title: string;
  content: string;
}

export function ArchiveExportActions({ title, content }: ArchiveExportActionsProps) {
  return (
    <button
      type="button"
      onClick={() => downloadAsMarkdown(title, content)}
      className="shrink-0 border border-emerald-500/30 px-3 py-1 text-xs uppercase tracking-wider text-emerald-400/80 transition-all hover:border-emerald-400/50 hover:text-emerald-300"
    >
      [ EXPORT .MD ]
    </button>
  );
}
