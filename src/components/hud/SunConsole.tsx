"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Box,
  Building2,
  CheckCircle2,
  Factory,
  Lock,
  Radio,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { PLANETS } from "@/src/components/canvas/SolarSystem";

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

interface NoticeItem extends DataItem {
  icon: "check" | "cube" | "alert" | "signal";
}

interface SupplyItem extends DataItem {
  icon: "port" | "factory" | "zone" | "chain" | "market" | "trade";
  subtitle: string;
  metricLabel: string;
}

interface MetricItem {
  label: string;
  detail: string;
  variant?: "default" | "positive";
  chart: "ring" | "line" | "bar";
}

interface MicroChartState {
  syncProgress: number;
  latency: number[];
  throughput: number[];
  eventRate: number[];
}

type PlanetNavStatus = "online" | "standby";

interface PlanetNavItem {
  id: string;
  name: string;
  label: string;
  status: PlanetNavStatus;
  color: string;
  textureUrl?: string;
}

const PLANET_NAV_ITEMS: PlanetNavItem[] = PLANETS.map((planet) => {
  const hasMountedSystem = Boolean(planet.module) || planet.name === "Saturn";

  return {
    id: planet.name.toLowerCase(),
    name: planet.name,
    label:
      planet.name === "Saturn"
        ? "Macro Radar"
        : planet.label ?? "Module Placeholder",
    status: hasMountedSystem ? "online" : "standby",
    color: planet.color,
    textureUrl: planet.textureUrl,
  };
});

const PLANET_STATUS_LABEL: Record<PlanetNavStatus, string> = {
  online: "ONLINE",
  standby: "STANDBY",
};

const NOTICES: NoticeItem[] = [
  { id: 1, label: "06:00 UTC", value: "Sincronización de datos completada", icon: "check", variant: "positive" },
  { id: 2, label: "08:30 UTC", value: "Nueva carga de embeddings disponible", icon: "cube" },
  { id: 3, label: "10:15 UTC", value: "Mantenimiento programado: Sector Marte 14:00 UTC", icon: "alert", variant: "warning" },
  { id: 4, label: "12:00 UTC", value: "Alerta: latencia elevada en nodo Jupiter", icon: "signal", variant: "alert" },
];

const APAC_FALLBACK_ITEMS: SupplyItem[] = [
  { id: 1, label: "深圳港", subtitle: "Shenzhen Port", value: "吞吐量 semanal: 2.4M TEU", metricLabel: "Throughput", icon: "port" },
  { id: 2, label: "苏州工业园", subtitle: "Suzhou Industrial Park", value: "外资引入: USD 890M (Q3)", metricLabel: "FDI Inflow", icon: "factory" },
  { id: 3, label: "上海出口加工区", subtitle: "Shanghai Export Processing Zone", value: "物流动态: 正常", metricLabel: "Logistics Status", icon: "zone", variant: "positive" },
  { id: 4, label: "东莞供应链", subtitle: "Dongguan Supply Chain", value: "预警: 中断 nivel amarillo", metricLabel: "Alert: Interruption - Yellow", icon: "chain", variant: "warning" },
  { id: 5, label: "义乌小商品", subtitle: "Yiwu Commodities", value: "Índice de precios: +1.2%", metricLabel: "Price Index", icon: "market", variant: "positive" },
  { id: 6, label: "香港自贸港", subtitle: "Hong Kong FTZ", value: "Tráfico marítimo: +4.5%", metricLabel: "Maritime Traffic", icon: "trade", variant: "positive" },
];

const METRICS: MetricItem[] = [
  { label: "DATA SYNC", detail: "Integrity", variant: "positive", chart: "ring" },
  { label: "NETWORK LATENCY", detail: "Median", chart: "line" },
  { label: "THROUGHPUT", detail: "Pipeline", chart: "bar" },
  { label: "EVENT RATE", detail: "Telemetry", chart: "bar" },
];

const INITIAL_MICRO_CHARTS: MicroChartState = {
  syncProgress: 97.3,
  latency: [108, 112, 104, 119, 116, 128, 122, 134, 128],
  throughput: [1.4, 1.6, 1.5, 1.8, 1.7, 2.0, 2.1, 2.3, 2.4],
  eventRate: [2.1, 2.8, 2.4, 3.1, 2.2, 2.7, 3.0, 2.6, 3.2],
};

const CHAMFER_STYLE: CSSProperties = {
  clipPath:
    "polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)",
};

const SMALL_CHAMFER_STYLE: CSSProperties = {
  clipPath:
    "polygon(9px 0, calc(100% - 9px) 0, 100% 9px, 100% calc(100% - 9px), calc(100% - 9px) 100%, 9px 100%, 0 calc(100% - 9px), 0 9px)",
};

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

function noticeIcon(icon: NoticeItem["icon"]) {
  const iconClassName = "h-3 w-3";

  switch (icon) {
    case "check":
      return <CheckCircle2 className={iconClassName} aria-hidden="true" />;
    case "cube":
      return <Box className={iconClassName} aria-hidden="true" />;
    case "alert":
      return <AlertTriangle className={iconClassName} aria-hidden="true" />;
    case "signal":
      return <Radio className={iconClassName} aria-hidden="true" />;
  }
}

function supplyIcon(icon: SupplyItem["icon"]) {
  const iconClassName = "h-3.5 w-3.5";

  switch (icon) {
    case "port":
    case "trade":
      return <Building2 className={iconClassName} aria-hidden="true" />;
    case "factory":
      return <Factory className={iconClassName} aria-hidden="true" />;
    case "zone":
      return <Box className={iconClassName} aria-hidden="true" />;
    case "chain":
      return <Activity className={iconClassName} aria-hidden="true" />;
    case "market":
      return <BarChart3 className={iconClassName} aria-hidden="true" />;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSupplyIcon(value: unknown): value is SupplyItem["icon"] {
  return (
    value === "port" ||
    value === "factory" ||
    value === "zone" ||
    value === "chain" ||
    value === "market" ||
    value === "trade"
  );
}

function isDataVariant(value: unknown): value is DataItem["variant"] {
  return (
    value === undefined ||
    value === "default" ||
    value === "positive" ||
    value === "warning" ||
    value === "alert"
  );
}

function isSupplyItem(value: unknown): value is SupplyItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.label === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.value === "string" &&
    typeof value.metricLabel === "string" &&
    isSupplyIcon(value.icon) &&
    isDataVariant(value.variant)
  );
}

function isSupplyItemArray(value: unknown): value is SupplyItem[] {
  return Array.isArray(value) && value.every(isSupplyItem);
}

const BEIJING_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Shanghai",
});

function panelClassName(extra = "") {
  return `relative overflow-hidden border border-cyan-500/30 bg-slate-950/70 shadow-[0_0_28px_rgba(6,182,212,0.12),inset_0_0_32px_rgba(8,145,178,0.08)] ${extra}`;
}

const SVG_GLOW_CLASS = "drop-shadow-[0_0_4px_rgba(34,211,238,0.55)]";

function nextSeries(values: number[], min: number, max: number) {
  const last = values[values.length - 1] ?? min;
  const delta = ((Math.round(last * 10) * 13 + values.length * 7) % 19) - 9;
  const next = Math.min(max, Math.max(min, last + delta / 10));

  return [...values.slice(1), Number(next.toFixed(1))];
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalize(value: number, min: number, max: number) {
  return (value - min) / (max - min);
}

function buildLinePath(values: number[], min: number, max: number) {
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 30 - normalize(value, min, max) * 22;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

interface RingProgressChartProps {
  value: number;
}

function RingProgressChart({ value }: RingProgressChartProps) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - value / 100);

  return (
    <svg
      aria-label="Data sync circular progress chart"
      className={`h-12 w-full text-cyan-300 ${SVG_GLOW_CLASS}`}
      data-testid="micro-chart-ring"
      viewBox="0 0 64 64"
    >
      <circle
        className={SVG_GLOW_CLASS}
        cx="32"
        cy="32"
        fill="none"
        opacity="0.22"
        r={radius}
        stroke="currentColor"
        strokeWidth="5"
      />
      <circle
        className={SVG_GLOW_CLASS}
        cx="32"
        cy="32"
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth="5"
        transform="rotate(-90 32 32)"
      />
      <text
        className={SVG_GLOW_CLASS}
        fill="currentColor"
        fontFamily="monospace"
        fontSize="10"
        textAnchor="middle"
        x="32"
        y="36"
      >
        {value.toFixed(1)}%
      </text>
    </svg>
  );
}

interface LineMicroChartProps {
  values: number[];
  min: number;
  max: number;
}

function LineMicroChart({ values, min, max }: LineMicroChartProps) {
  const points = buildLinePath(values, min, max);

  return (
    <svg
      aria-label="Network latency line chart"
      className={`h-12 w-full text-cyan-300 ${SVG_GLOW_CLASS}`}
      data-testid="micro-chart-line"
      preserveAspectRatio="none"
      viewBox="0 0 100 34"
    >
      <path
        className={SVG_GLOW_CLASS}
        d="M0 29 H100"
        fill="none"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="1"
      />
      <polyline
        className={SVG_GLOW_CLASS}
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <polyline
        className={SVG_GLOW_CLASS}
        fill="none"
        opacity="0.24"
        points={points}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="6"
      />
    </svg>
  );
}

interface BarMicroChartProps {
  values: number[];
  min: number;
  max: number;
}

function BarMicroChart({ values, min, max }: BarMicroChartProps) {
  return (
    <svg
      aria-label="Telemetry bar chart"
      className={`h-12 w-full text-cyan-300 ${SVG_GLOW_CLASS}`}
      data-testid="micro-chart-bar"
      preserveAspectRatio="none"
      viewBox="0 0 100 34"
    >
      <path
        className={SVG_GLOW_CLASS}
        d="M0 31 H100"
        fill="none"
        opacity="0.18"
        stroke="currentColor"
        strokeWidth="1"
      />
      {values.map((value, index) => {
        const height = 5 + normalize(value, min, max) * 24;
        const x = index * 11 + 2;
        const y = 31 - height;

        return (
          <rect
            key={`${value}-${index}`}
            className={SVG_GLOW_CLASS}
            fill="currentColor"
            height={height}
            opacity={0.42 + index / values.length / 2}
            rx="1"
            width="6"
            x={x}
            y={y}
          />
        );
      })}
    </svg>
  );
}

export function SunConsole({ isOpen, onClose, onPlanetSelect }: SunConsoleProps) {
  const [hoveredPlanetId, setHoveredPlanetId] = useState<string | null>(null);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>(APAC_FALLBACK_ITEMS);
  const [beijingTime, setBeijingTime] = useState(() =>
    BEIJING_TIME_FORMATTER.format(new Date())
  );
  const [microCharts, setMicroCharts] = useState<MicroChartState>(
    INITIAL_MICRO_CHARTS
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setBeijingTime(BEIJING_TIME_FORMATTER.format(new Date()));
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || typeof fetch !== "function") {
      return;
    }

    const controller = new AbortController();

    async function loadSupplyChainData() {
      try {
        const response = await fetch(`/data/apac-supply-chain.json?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const payload: unknown = await response.json();
        if (
          typeof payload === "object" &&
          payload !== null &&
          "items" in payload &&
          isSupplyItemArray(payload.items)
        ) {
          setSupplyItems(payload.items);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("[SunConsole] APAC supply-chain data unavailable", error);
        }
      }
    }

    loadSupplyChainData();

    return () => {
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setMicroCharts((current) => ({
        syncProgress:
          current.syncProgress >= 98.8
            ? 96.8
            : Number((current.syncProgress + 0.2).toFixed(1)),
        latency: nextSeries(current.latency, 96, 142),
        throughput: nextSeries(current.throughput, 1.2, 2.8),
        eventRate: nextSeries(current.eventRate, 1.8, 3.6),
      }));
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

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
            className="relative flex h-[94vh] w-full max-w-[1600px] flex-col overflow-hidden border border-cyan-400/60 bg-[#020914]/95 p-3 text-slate-100 shadow-[0_0_60px_rgba(6,182,212,0.18),inset_0_0_80px_rgba(8,47,73,0.45)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(event) => event.stopPropagation()}
            style={CHAMFER_STYLE}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.035)_1px,transparent_1px)] bg-[size:38px_38px]" />
            <div className="relative mb-2 flex shrink-0 items-center justify-between border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center border border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                  style={SMALL_CHAMFER_STYLE}
                >
                  <ShieldCheck className="h-6 w-6 text-cyan-300" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-mono text-xl tracking-wide text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.75)]">
                    主控台 / <span className="text-slate-200">CONTROL PANEL</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-200/55">
                    Central Command • System Override
                  </div>
                </div>
              </div>

              <div className="hidden min-w-0 flex-1 items-center justify-center gap-8 px-6 font-mono text-[9px] uppercase tracking-widest text-slate-400 lg:flex">
                <span>
                  System Status <span className="ml-2 text-emerald-400">● NOMINAL</span>
                </span>
                <span>
                  Time (BJT) <span className="ml-2 text-slate-200">{beijingTime}</span>
                </span>
                <span>
                  User: <span className="ml-2 text-slate-200">COMMANDER_01</span>
                </span>
              </div>

              <button
                aria-label="Close console"
                className="grid h-8 w-14 place-items-center border border-cyan-500/30 bg-cyan-950/20 font-mono text-xs text-cyan-300 transition-all duration-200 hover:border-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-100"
                onClick={onClose}
                style={SMALL_CHAMFER_STYLE}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-auto xl:flex-row xl:overflow-hidden">
              <aside
                aria-label="Planet navigation"
                className={panelClassName("flex min-h-[420px] w-full shrink-0 flex-col p-2 xl:min-h-0 xl:w-[330px] 2xl:w-[360px]")}
                data-testid="planet-nav-sidebar"
                style={CHAMFER_STYLE}
              >
                <div className="mb-2 flex items-center justify-between border-b border-cyan-500/20 px-1.5 pb-2">
                  <h2 className="font-mono text-xs tracking-wider text-cyan-300">
                    行星导航 / PLANET NAV
                  </h2>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500">
                    Fleet Index
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-1">
                  <ul className="space-y-1.5">
                    {PLANET_NAV_ITEMS.map((planet) => (
                      <li key={planet.id}>
                        <button
                          aria-label={`Navigate to ${planet.name}`}
                          className={`group grid h-[52px] w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 border px-2 text-left transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-300/80 ${
                            hoveredPlanetId === planet.id
                              ? "border-cyan-300/80 bg-cyan-400/10 shadow-[0_0_22px_rgba(34,211,238,0.28),inset_0_0_18px_rgba(34,211,238,0.08)]"
                              : "border-cyan-900/60 bg-slate-950/55 hover:border-cyan-500/70 hover:bg-cyan-500/10"
                          }`}
                          onClick={() => onPlanetSelect?.(planet.id)}
                          onMouseEnter={() => setHoveredPlanetId(planet.id)}
                          onMouseLeave={() => setHoveredPlanetId(null)}
                          style={SMALL_CHAMFER_STYLE}
                          type="button"
                        >
                          <span
                            aria-hidden="true"
                            className="h-8 w-8 rounded-full border border-cyan-300/20 bg-cover bg-center shadow-[0_0_14px_currentColor]"
                            style={{
                              backgroundColor: planet.color,
                              backgroundImage: planet.textureUrl ? `url(${planet.textureUrl})` : undefined,
                              color: planet.color,
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[12px] uppercase tracking-wide text-slate-200 group-hover:text-cyan-100">
                              {planet.name}
                            </span>
                            <span className="block truncate font-mono text-[9px] text-slate-500">
                              {planet.label}
                            </span>
                          </span>
                          <span
                            className={`flex w-[60px] items-center justify-end gap-1 font-mono text-[8px] ${
                              planet.status === "online"
                                ? "text-emerald-400"
                                : "text-slate-500"
                            }`}
                          >
                            <span>{PLANET_STATUS_LABEL[planet.status]}</span>
                            <span className="inline-block w-[6px] text-cyan-300">
                              {hoveredPlanetId === planet.id ? ">" : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border border-cyan-500/20 bg-slate-950/70 p-2"
                  style={SMALL_CHAMFER_STYLE}
                >
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-cyan-300">舰队状态 / Fleet Status</div>
                    <div className="mt-2 font-mono text-2xl text-cyan-300">07<span className="text-xs text-slate-500"> /12</span></div>
                  </div>
                  <div className="relative h-11 w-11 rounded-full border-[7px] border-cyan-400 border-r-slate-800 border-t-cyan-700 shadow-[0_0_20px_rgba(34,211,238,0.25)]" />
                  <div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-slate-500">System Health</div>
                    <div className="mt-1 font-mono text-xl text-emerald-300">98.7%</div>
                    <svg
                      aria-hidden="true"
                      className="mt-1 h-4 w-full overflow-visible text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.45)]"
                      data-testid="fleet-health-waveform"
                      preserveAspectRatio="none"
                      viewBox="0 0 96 18"
                    >
                      <path
                        d="M0 12 L8 12 L13 8 L18 14 L24 5 L30 12 L37 12 L43 3 L50 15 L57 9 L64 12 L71 6 L78 13 L85 10 L91 12 L96 12"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                      />
                      <path
                        d="M0 12 L8 12 L13 8 L18 14 L24 5 L30 12 L37 12 L43 3 L50 15 L57 9 L64 12 L71 6 L78 13 L85 10 L91 12 L96 12"
                        fill="none"
                        opacity="0.22"
                        stroke="currentColor"
                        strokeWidth="5"
                      />
                    </svg>
                  </div>
                </div>
              </aside>

              <main
                className="grid min-h-[700px] min-w-0 flex-1 grid-cols-1 gap-3 overflow-visible xl:min-h-0 xl:grid-cols-[1.05fr_0.95fr] xl:overflow-hidden"
                data-testid="sun-console-main"
              >
                <section
                  className={panelClassName("grid min-h-0 min-w-0 grid-rows-[30px_150px_minmax(270px,1fr)_104px] gap-2.5 p-3")}
                  style={CHAMFER_STYLE}
                >
                  <div className="flex items-center justify-between border-b border-cyan-500/20">
                    <h2 className="font-mono text-xs tracking-wider text-cyan-300">公告栏 / NOTICE BOARD</h2>
                    <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-widest text-slate-500">
                      Live Feed <Activity className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                    </span>
                  </div>

                  <ul className="space-y-1.5 overflow-hidden">
                    {NOTICES.map((note) => (
                      <li
                        key={note.id}
                        className="grid h-[33px] grid-cols-[66px_20px_minmax(0,1fr)] items-center gap-2 border border-cyan-900/40 bg-slate-950/45 px-2.5 font-mono text-[10px]"
                        style={SMALL_CHAMFER_STYLE}
                      >
                        <span className="text-cyan-300">{note.label}</span>
                        <span className={`grid h-4 w-4 place-items-center rounded-full border ${valueClass(note.variant)} border-current/40`}>
                          {noticeIcon(note.icon)}
                        </span>
                        <span className={`truncate ${valueClass(note.variant)}`}>
                          {note.value}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="relative min-h-0 overflow-visible bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_48%)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_34%),linear-gradient(rgba(34,211,238,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.025)_1px,transparent_1px)] bg-[size:auto,26px_26px,26px_26px]" />
                    <div
                      className="absolute left-1/2 top-1/2 h-[min(30vh,330px)] w-[min(30vh,330px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30 bg-cover bg-center opacity-95 shadow-[0_0_55px_rgba(34,211,238,0.42),inset_-30px_-20px_80px_rgba(0,0,0,0.78)]"
                      data-testid="central-earth-situation-map"
                      style={{ backgroundImage: "url('/textures/2k_earth_nightmap.jpg')" }}
                    />
                    <div className="absolute left-1/2 top-1/2 h-[min(38vh,420px)] w-[min(38vh,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/25" />
                    <div className="absolute left-1/2 top-1/2 h-[min(44vh,480px)] w-[min(44vh,480px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/15" />
                    <div className="absolute right-[12%] top-[36%] font-mono text-xs uppercase text-emerald-300">
                      Earth
                      <div className="text-[10px] text-emerald-400/70">Online</div>
                    </div>
                    <div className="absolute bottom-[28%] left-[12%] font-mono text-xs uppercase text-fuchsia-300">
                      Jupiter
                      <div className="text-[10px] text-fuchsia-300/70">Latency High</div>
                    </div>
                    <div className="absolute bottom-[22%] right-[16%] font-mono text-xs uppercase text-amber-300">
                      Mars
                      <div className="text-[10px] text-amber-300/70">Maintenance</div>
                    </div>
                  </div>

                  <div className="grid min-h-0 grid-cols-2 gap-2 lg:grid-cols-4">
                    {METRICS.map((metric) => {
                      const value =
                        metric.chart === "ring"
                          ? `${microCharts.syncProgress.toFixed(1)}%`
                          : metric.label === "NETWORK LATENCY"
                            ? `${Math.round(average(microCharts.latency))} ms`
                            : metric.label === "THROUGHPUT"
                              ? `${microCharts.throughput.at(-1)?.toFixed(1) ?? "2.4"} Tb/s`
                              : `${microCharts.eventRate.at(-1)?.toFixed(1) ?? "3.2"} k/s`;
                      const chart =
                        metric.chart === "ring" ? (
                          <RingProgressChart value={microCharts.syncProgress} />
                        ) : metric.label === "NETWORK LATENCY" ? (
                          <LineMicroChart values={microCharts.latency} min={96} max={142} />
                        ) : metric.label === "THROUGHPUT" ? (
                          <BarMicroChart values={microCharts.throughput} min={1.2} max={2.8} />
                        ) : (
                          <BarMicroChart values={microCharts.eventRate} min={1.8} max={3.6} />
                        );

                      return (
                        <div
                          key={metric.label}
                          className="border border-cyan-900/50 bg-slate-950/70 p-2"
                          style={SMALL_CHAMFER_STYLE}
                        >
                          <div className="font-mono text-[8px] uppercase tracking-widest text-slate-500">{metric.label}</div>
                          <div className={`mt-1 font-mono text-[17px] leading-none ${metric.variant === "positive" ? "text-emerald-300" : "text-cyan-300"}`}>{value}</div>
                          <div className="mt-1">{chart}</div>
                          <div className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-600">{metric.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_128px] gap-3">
                  <div
                    className={panelClassName("grid min-h-0 grid-rows-[30px_130px_minmax(0,1fr)] gap-2.5 p-3")}
                    style={CHAMFER_STYLE}
                  >
                    <div className="flex items-center justify-between border-b border-cyan-500/20">
                      <h2 className="font-mono text-xs tracking-wider text-cyan-300">APAC / SUPPLY CHAIN</h2>
                      <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500">Region Overview</span>
                    </div>

                    <div
                      className="relative overflow-hidden border border-cyan-900/50 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.26),transparent_34%),linear-gradient(135deg,rgba(34,211,238,0.04),rgba(8,47,73,0.16))]"
                      style={SMALL_CHAMFER_STYLE}
                    >
                      <div className="absolute inset-x-6 bottom-5 h-px bg-cyan-400/30" />
                      <div className="absolute bottom-5 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full border border-cyan-300/60 shadow-[0_0_35px_rgba(34,211,238,0.55)]" />
                      {[18, 32, 45, 58, 72, 84].map((left, index) => (
                        <span
                          key={left}
                          className="absolute bottom-5 w-3 bg-cyan-300/35 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
                          style={{ left: `${left}%`, height: `${28 + (index % 3) * 18}px` }}
                        />
                      ))}
                      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_28px_10px_rgba(34,211,238,0.42)]" />
                    </div>

                    <ul className="min-h-0 space-y-1 overflow-hidden">
                      {supplyItems.map((item) => (
                        <li
                          key={item.id}
                          className="grid h-[43px] grid-cols-[30px_minmax(0,1fr)_minmax(132px,auto)] items-center gap-2 border border-cyan-900/50 bg-slate-950/55 px-2.5"
                          style={SMALL_CHAMFER_STYLE}
                        >
                          <span className="grid h-7 w-7 place-items-center border border-cyan-500/35 bg-cyan-500/10 text-cyan-300">
                            {supplyIcon(item.icon)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs text-slate-200">{item.label}</span>
                            <span className="block truncate font-mono text-[9px] text-slate-500">{item.subtitle}</span>
                          </span>
                          <span
                            className={`min-w-0 text-right font-mono text-[10px] ${valueClass(item.variant)}`}
                          >
                            <span className="block truncate">{item.value}</span>
                            <span className="block truncate text-[9px] text-slate-500">{item.metricLabel}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={panelClassName("grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-3")}
                    style={CHAMFER_STYLE}
                  >
                    <div className="grid place-items-center">
                      <div className="grid h-16 w-16 place-items-center rounded-full border-[7px] border-emerald-300 border-r-cyan-950 bg-emerald-400/10 font-mono text-xl text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.24)]">
                        92%
                      </div>
                      <div className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-500">Health Index</div>
                    </div>
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">供应链健康度 / Supply Chain Health</div>
                      <div className="mt-3 flex h-16 items-end gap-2 border-b border-l border-cyan-900/60 px-2">
                        {[52, 36, 68, 54, 31, 28, 38, 24, 42, 72].map((height, index) => (
                          <span key={index} className="relative h-full flex-1">
                            <span
                              className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
                              style={{ bottom: `${height}%` }}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </main>
            </div>

            <div className="relative mt-2 flex shrink-0 items-center justify-center gap-8 border-t border-cyan-500/20 pt-1.5 font-mono text-[8px] uppercase tracking-[0.3em] text-cyan-300/60">
              <span>Information is Power</span>
              <span className="hidden items-center gap-2 lg:flex"><Lock className="h-3 w-3" aria-hidden="true" /> Data Encrypted</span>
              <span className="hidden items-center gap-2 lg:flex"><TrendingUp className="h-3 w-3" aria-hidden="true" /> Secure Channel Active</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
