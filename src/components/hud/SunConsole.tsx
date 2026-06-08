"use client";

import { AnimatePresence, motion } from "framer-motion";

interface SunConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanetSelect?: (planetId: string) => void;
}

interface DataItem {
  id: number;
  label: string;
  value: string;
  variant?: "default" | "positive" | "warning" | "alert";
}

const LATAM_ITEMS: DataItem[] = [
  { id: 1, label: "Mercado Libre Q3", value: "GMV +23% YoY", variant: "positive" },
  { id: 2, label: "Buenos Aires", value: "Nueva regulación de importación" },
  { id: 3, label: "São Paulo", value: "Índice confianza empresarial: 94.2" },
  { id: 4, label: "Santiago", value: "Política monetaria: tasa 5.5%" },
  { id: 5, label: "CDMX", value: "Resumen mercado inmobiliario Q3" },
  { id: 6, label: "Lima", value: "Exportaciones mineras: USD 2.1B" },
  { id: 7, label: "Bogotá", value: "Actualización regulatoria fintech" },
];

const NOTICES: DataItem[] = [
  { id: 1, label: "06:00 UTC", value: "Sincronización de datos completada" },
  { id: 2, label: "08:30 UTC", value: "Nueva carga de embeddings disponible" },
  { id: 3, label: "10:15 UTC", value: "Mantenimiento programado: Sector Marte 14:00 UTC", variant: "warning" },
  { id: 4, label: "12:00 UTC", value: "Alerta: latencia elevada en nodo Jupiter", variant: "alert" },
];

const APAC_ITEMS: DataItem[] = [
  { id: 1, label: "深圳港", value: "吞吐量 semanal: 2.4M TEU" },
  { id: 2, label: "苏州工业园", value: "外资引入: USD 890M (Q3)" },
  { id: 3, label: "上海出口加工区", value: "物流动态: 正常" },
  { id: 4, label: "东莞供应链", value: "预警: 中断 nivel amarillo", variant: "warning" },
  { id: 5, label: "义乌小商品", value: "Índice de precios: +1.2%", variant: "positive" },
  { id: 6, label: "香港自贸港", value: "Tráfico marítimo: +4.5%", variant: "positive" },
];

function valueClass(variant?: DataItem["variant"]) {
  switch (variant) {
    case "positive":
      return "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]";
    case "warning":
      return "text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]";
    case "alert":
      return "text-fuchsia-400 drop-shadow-[0_0_4px_rgba(232,121,249,0.6)]";
    default:
      return "text-slate-300";
  }
}

export function SunConsole({ isOpen, onClose, onPlanetSelect }: SunConsoleProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          aria-modal="true"
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          role="dialog"
        >
          <motion.div
            className="flex h-[90vh] w-full max-w-[1200px] flex-col border border-cyan-500/50 bg-slate-950/85 p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-cyan-800/50 pb-3">
              <span className="font-mono text-xs text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                [ 主控台 / Control Panel ]
              </span>
              <button
                aria-label="Close console"
                className="border border-cyan-500/30 px-2 py-1 font-mono text-xs text-cyan-400 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-200 hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                onClick={onClose}
                type="button"
              >
                [ X ]
              </button>
            </div>

            {/* Grid */}
            <div className="grid flex-1 grid-cols-3 gap-3 overflow-hidden">
              {/* Left: LATAM Feed */}
              <div className="flex flex-col border-l-2 border-t-2 border-cyan-800/50">
                <div className="border-b border-cyan-900/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                  LATAM Feed
                </div>
                <div className="flex-1 overflow-auto p-2">
                  <ul className="space-y-0 divide-y divide-cyan-900/30">
                    {LATAM_ITEMS.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-baseline justify-between py-2 px-1"
                      >
                        <span className="font-mono text-[11px] text-slate-300">
                          {item.label}
                        </span>
                        <span
                          className={`ml-2 shrink-0 font-mono text-[10px] ${valueClass(item.variant)}`}
                        >
                          {item.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Center: Hub & Notices */}
              <div className="flex flex-col gap-3">
                {/* Notice Board */}
                <div className="flex flex-1 flex-col border-l-2 border-t-2 border-cyan-800/50">
                  <div className="border-b border-cyan-900/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                    公告栏 / Notice Board
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <ul className="space-y-0 divide-y divide-cyan-900/30">
                      {NOTICES.map((note) => (
                        <li key={note.id} className="py-2 px-1">
                          <div className="flex items-baseline gap-2">
                            <span className="shrink-0 font-mono text-[10px] text-slate-500">
                              {note.label}
                            </span>
                            <span
                              className={`font-mono text-[11px] ${valueClass(note.variant)}`}
                            >
                              {note.value}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tools */}
                <div className="border-l-2 border-t-2 border-cyan-800/50 p-3">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                    工具 / Tools
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="border border-cyan-500/30 bg-transparent px-2 py-1 font-mono text-[10px] text-cyan-400 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      type="button"
                    >
                      [ 数据同步 ]
                    </button>
                    <button
                      className="border border-cyan-500/30 bg-transparent px-2 py-1 font-mono text-[10px] text-cyan-400 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      onClick={() => onPlanetSelect?.("mars")}
                      type="button"
                    >
                      [ 火星编辑器 ]
                    </button>
                    <button
                      className="border border-cyan-500/30 bg-transparent px-2 py-1 font-mono text-[10px] text-cyan-400 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      type="button"
                    >
                      [ 全文检索 ]
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: APAC / Supply Chain */}
              <div className="flex flex-col border-l-2 border-t-2 border-cyan-800/50">
                <div className="border-b border-cyan-900/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                  APAC / Supply Chain
                </div>
                <div className="flex-1 overflow-auto p-2">
                  <ul className="space-y-0 divide-y divide-cyan-900/30">
                    {APAC_ITEMS.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-baseline justify-between py-2 px-1"
                      >
                        <span className="font-mono text-[11px] text-slate-300">
                          {item.label}
                        </span>
                        <span
                          className={`ml-2 shrink-0 font-mono text-[10px] ${valueClass(item.variant)}`}
                        >
                          {item.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
