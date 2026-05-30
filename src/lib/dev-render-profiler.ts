import { useEffect, useRef } from "react";

export function useDevRenderCounter(label: string, intervalMs = 2000): void {
  const renderCountRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }
    renderCountRef.current += 1;
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    let previousTotal = 0;
    const timerId = window.setInterval(() => {
      const total = renderCountRef.current;
      const delta = total - previousTotal;
      previousTotal = total;
      console.info(`[RenderProfiler] ${label} +${delta}/${intervalMs}ms (total=${total})`);
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [intervalMs, label]);
}
