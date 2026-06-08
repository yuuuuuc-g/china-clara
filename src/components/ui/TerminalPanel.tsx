import type { ComponentPropsWithoutRef } from "react";

interface TerminalPanelProps extends ComponentPropsWithoutRef<"aside"> {
  children: React.ReactNode;
}

export function TerminalPanel({
  children,
  className = "",
  ...props
}: TerminalPanelProps) {
  return (
    <aside
      className={`pointer-events-auto border border-cyan-400/20 bg-black/75 font-mono text-xs shadow-[0_0_32px_rgba(34,211,238,0.08),inset_0_0_24px_rgba(0,0,0,0.6)] backdrop-blur-md ${className}`}
      {...props}
    >
      {children}
    </aside>
  );
}
