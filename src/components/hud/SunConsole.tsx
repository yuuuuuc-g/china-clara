"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PlanetRouteData {
  id: string;
  name: string;
  iconClass: string;
  functionDesc?: string;
  fallbackDesc: string;
  textureUrl?: string;
}

const LOAD_DATA = [
  { name: "Earth (Core)", load: 45 },
  { name: "Mars (Crucible)", load: 20 },
  { name: "Jupiter (DB)", load: 65 },
  { name: "Mercury (Emb)", load: 85 },
];

const LATENCY_DATA = [
  { time: "00:00", latency: 120 },
  { time: "04:00", latency: 150 },
  { time: "08:00", latency: 280 },
  { time: "12:00", latency: 190 },
  { time: "16:00", latency: 110 },
  { time: "20:00", latency: 140 },
];

export const PLANETS_DATA: PlanetRouteData[] = [
  {
    id: "mercury",
    name: "Mercury",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-400 to-zinc-700 shadow-[0_0_10px_rgba(161,161,170,0.45)]",
    functionDesc: "External Vector Database (SiliconFlow Embedding Node)",
    fallbackDesc: "Mercury is the smallest planet, orbiting closest to the Sun.",
    textureUrl: "/textures/2k_mercury.jpg",
  },
  {
    id: "venus",
    name: "Venus",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200 via-orange-400 to-amber-800 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
    fallbackDesc: "Venus has a dense atmosphere and the hottest surface in the Solar System.",
    textureUrl: "/textures/2k_venus_atmosphere.jpg",
  },
  {
    id: "earth",
    name: "Earth",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-200 via-blue-500 to-cyan-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
    fallbackDesc: "Earth is the only known world with stable liquid water oceans.",
    textureUrl: "/textures/2k_earth_daymap.jpg",
  },
  {
    id: "mars",
    name: "Mars",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-300 via-red-500 to-red-900 shadow-[0_0_10px_rgba(239,68,68,0.45)]",
    fallbackDesc: "Mars is a cold desert planet with giant volcanoes and ancient river valleys.",
    textureUrl: "/textures/2k_mars.jpg",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-300 via-amber-500 to-amber-900 shadow-[0_0_10px_rgba(249,115,22,0.5)]",
    functionDesc: "Internal Native Text Database (Supabase Text Node)",
    fallbackDesc: "Jupiter is the largest planet, known for its Great Red Spot storm.",
    textureUrl: "/textures/2k_jupiter.jpg",
  },
  {
    id: "saturn",
    name: "Saturn",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-100 via-yellow-300 to-amber-700 shadow-[0_0_10px_rgba(250,204,21,0.45)]",
    fallbackDesc: "Saturn is famous for its bright and complex ring system.",
    textureUrl: "/textures/2k_saturn.jpg",
  },
  {
    id: "uranus",
    name: "Uranus",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-100 via-cyan-300 to-teal-700 shadow-[0_0_10px_rgba(34,211,238,0.45)]",
    fallbackDesc: "Uranus rotates on its side and appears blue-green from atmospheric methane.",
    textureUrl: "/textures/2k_uranus.jpg",
  },
  {
    id: "neptune",
    name: "Neptune",
    iconClass:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-blue-600 to-indigo-900 shadow-[0_0_10px_rgba(37,99,235,0.5)]",
    functionDesc: "Exocortex RAG System (DeepSeek Agentic Hub)",
    fallbackDesc: "Neptune is a distant ice giant with extremely fast upper-atmosphere winds.",
    textureUrl: "/textures/2k_neptune.jpg",
  },
];

interface SunConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanetSelect: (planetId: string) => void;
}

export function SunConsole({ isOpen, onClose, onPlanetSelect }: SunConsoleProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  const activePlanet = useMemo(
    () => PLANETS_DATA.find((planet) => planet.id === hoveredPlanet) ?? null,
    [hoveredPlanet]
  );

  const renderSystemDashboard = () => (
    <div className="grid h-full min-h-[450px] grid-rows-2 gap-4">
      <div className="h-1/2 rounded-xl border border-white/5 bg-white/5 p-4 shadow-[0_0_18px_rgba(59,130,246,0.12)] backdrop-blur-md">
        <p className="mb-3 font-mono text-[10px] tracking-widest text-sky-300/80">
          NODE LOAD DISTRIBUTION
        </p>
        <div className="h-[calc(100%-22px)] min-h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LOAD_DATA}>
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={26}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  backgroundColor: "#000",
                  border: "1px solid #333",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="load" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="h-1/2 rounded-xl border border-white/5 bg-white/5 p-4 shadow-[0_0_18px_rgba(16,185,129,0.12)] backdrop-blur-md">
        <p className="mb-3 font-mono text-[10px] tracking-widest text-emerald-300/80">
          SEARCH LATENCY TREND
        </p>
        <div className="h-[calc(100%-22px)] min-h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={LATENCY_DATA}>
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={26}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#000",
                  border: "1px solid #333",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#000" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          aria-modal="true"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
        >
          <motion.div
            className="w-[800px] min-h-[400px] max-w-[95vw] rounded-2xl border border-white/10 bg-black/60 p-8 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <p className="font-mono text-xs tracking-widest text-emerald-400">
                SUN CONSOLE - CENTRAL HUB // SYSTEM_CENTRAL
              </p>
              <button
                aria-label="Close Sun Console"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-xs text-white/70 transition-colors hover:text-white"
                onClick={onClose}
                type="button"
              >
                X
              </button>
            </div>

            <div className="grid min-h-[450px] grid-cols-5 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <div className="col-span-2 border-r border-white/10 p-6">
                <div className="space-y-1">
                  {PLANETS_DATA.map((planet) => (
                    <div
                      className="flex cursor-pointer items-center gap-4 py-2"
                      key={planet.id}
                      onClick={() => onPlanetSelect(planet.id)}
                      onMouseEnter={() => setHoveredPlanet(planet.id)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border border-white/15 bg-cover bg-center ${planet.iconClass}`}
                        style={
                          planet.textureUrl
                            ? { backgroundImage: `url(${planet.textureUrl})` }
                            : undefined
                        }
                        aria-hidden
                      />
                      <span className="font-mono text-sm tracking-widest text-gray-400 transition-colors hover:text-white">
                        {planet.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-3 min-h-[450px] p-8">
                <AnimatePresence mode="wait" initial={false}>
                  {activePlanet ? (
                    <motion.div
                      key={activePlanet.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <h3 className="font-mono text-2xl tracking-widest text-emerald-300">
                        {activePlanet.name.toUpperCase()}
                      </h3>
                      <p className="mt-4 font-mono text-xs leading-6 text-emerald-400/80">
                        {activePlanet.functionDesc ?? activePlanet.fallbackDesc}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="system-dashboard"
                      className="h-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <p className="mb-4 font-mono text-xs tracking-widest text-gray-400">
                        SYSTEM_STATUS // GLOBAL_METRICS
                      </p>
                      {renderSystemDashboard()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
