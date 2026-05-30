"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Radar, RefreshCw, X } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import type { Database } from "@/src/lib/database.types";

type DailyBriefing = Database["public"]["Tables"]["daily_briefings"]["Row"];

interface SaturnConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTradingDate(value: string): string {
  return value;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SaturnConsole({ isOpen, onClose }: SaturnConsoleProps) {
  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;

    async function loadBriefings() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);

      const { data, error: queryError } = await supabase
        .from("daily_briefings")
        .select("*")
        .eq("date", today)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setBriefings([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("daily_briefings")
          .select("*")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10);

        if (cancelled) return;
        if (fallbackError) {
          setError(fallbackError.message);
          setBriefings([]);
        } else {
          setBriefings(fallback ?? []);
        }
      } else {
        setBriefings(data);
      }
      setLoading(false);
    }

    loadBriefings();

    return () => {
      cancelled = true;
    };
  }, [isOpen, reloadKey]);

  const latestDate = briefings[0]?.date ?? new Date().toISOString().slice(0, 10);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          aria-modal="true"
          role="dialog"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-[920px] max-w-[95vw] overflow-hidden rounded-2xl border border-yellow-300/25 bg-black/75 shadow-[0_0_80px_rgba(250,204,21,0.18)] backdrop-blur-xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-200/60 to-transparent" />

            <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-b from-yellow-500/[0.06] to-transparent px-7 py-5">
              <div>
                <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.35em] text-yellow-300/90">
                  <Radar size={14} aria-hidden="true" />
                  <span>SATURN // GLOBAL RADAR</span>
                </div>
                <h2 className="mt-2 font-serif text-2xl tracking-widest text-white/95">
                  Daily Macro Briefings
                </h2>
                <p className="mt-1 font-mono text-[11px] tracking-wider text-white/35">
                  TRADING DATE · {formatTradingDate(latestDate)} · {briefings.length} SIGNALS
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  disabled={loading}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/65 transition hover:border-yellow-200/40 hover:text-yellow-100 disabled:opacity-40"
                  aria-label="Reload briefings"
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : undefined}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/65 transition hover:border-white/35 hover:text-white"
                  aria-label="Close Saturn radar"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="max-h-[68vh] overflow-y-auto px-7 py-6">
              {loading && briefings.length === 0 && (
                <div className="flex items-center gap-3 font-mono text-xs tracking-widest text-yellow-200/70">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-300" />
                  <span>SWEEPING ORBITAL FEEDS…</span>
                </div>
              )}

              {error && (
                <div className="rounded border border-red-400/30 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-200">
                  RADAR ERROR · {error}
                </div>
              )}

              {!loading && !error && briefings.length === 0 && (
                <div className="flex flex-col items-start gap-2 font-mono text-xs text-white/55">
                  <span className="tracking-widest text-yellow-300/80">NO SIGNALS</span>
                  <span className="text-white/40">
                    今日尚未由 Vercel Cron 拉取情报。可手动触发 `GET /api/cron/fetch-news` 或等待下一次定时任务。
                  </span>
                </div>
              )}

              <ol className="space-y-3">
                {briefings.map((item, index) => (
                  <li
                    key={item.id}
                    className="group relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60 transition hover:border-yellow-300/35 hover:bg-zinc-900/70"
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] tracking-widest text-yellow-300/70">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="rounded border border-white/15 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] tracking-widest text-white/65">
                            {item.source.toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] tracking-wider text-white/30">
                            {hostnameOf(item.url)}
                          </span>
                        </div>
                        <ExternalLink
                          size={12}
                          className="mt-1 text-white/30 transition group-hover:text-yellow-200/80"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 text-sm font-medium leading-snug text-white/90">
                        {item.title}
                      </p>
                      <p className="mt-2 border-l border-yellow-300/30 pl-3 text-xs leading-relaxed text-yellow-100/70">
                        {item.ai_summary}
                      </p>
                    </a>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-yellow-300/60 to-transparent opacity-0 transition group-hover:opacity-100" />
                  </li>
                ))}
              </ol>
            </div>

            <footer className="border-t border-white/10 bg-black/40 px-7 py-3 font-mono text-[10px] tracking-widest text-white/35">
              SCAN · 8 TIER-1 SOURCES · DEEPSEEK EDITORIAL FILTER · 5-10 SIGNALS / CYCLE
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
