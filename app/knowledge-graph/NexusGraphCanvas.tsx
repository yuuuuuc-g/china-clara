"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ForceGraphMethods,
  ForceGraphProps,
  GraphData,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import type ForceGraph2DComponent from "react-force-graph-2d";
import type { NexusGraphData, NexusLink, NexusNode } from "./types";

const ForceGraph2D = dynamic<ForceGraphProps<NexusNode, NexusLink>>(
  () => import("react-force-graph-2d"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm tracking-[0.2em] text-white/35">
        LOADING NEXUS
      </div>
    ),
  },
) as typeof ForceGraph2DComponent<NexusNode, NexusLink>;

interface NexusGraphCanvasProps {
  graphData: NexusGraphData;
}

interface LinkForce {
  distance: (distance: number) => LinkForce;
  strength: (strength: number) => LinkForce;
}

interface StrengthForce {
  strength: (strength: number) => unknown;
}

function isLinkForce(force: unknown): force is LinkForce {
  if (typeof force !== "object" || force === null) return false;
  return "distance" in force && "strength" in force;
}

function isStrengthForce(force: unknown): force is StrengthForce {
  if (typeof force !== "object" || force === null) return false;
  return "strength" in force;
}

function getNodeId(node: string | number | NodeObject<NexusNode> | undefined) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return typeof node?.id === "string" ? node.id : "";
}

function getNodeRadius(node: NodeObject<NexusNode>, isFocused: boolean) {
  const baseRadius = node.type === "document" ? 7 : 4;
  return isFocused ? baseRadius + 3 : baseRadius;
}

export function NexusGraphCanvas({ graphData }: NexusGraphCanvasProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<NexusNode, NexusLink> | undefined>(undefined);
  const [size, setSize] = useState({ width: 960, height: 620 });
  const [mounted, setMounted] = useState(false);
  const prevSizeRef = useRef({ width: 0, height: 0 });

  // 状态：点击锁定聚焦
  const [highlightedConceptId, setHighlightedConceptId] = useState<string | null>(null);
  // 状态：鼠标悬停聚焦
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const newWidth = Math.max(element.clientWidth, 320);
      const newHeight = Math.max(element.clientHeight, 420);

      if (prevSizeRef.current.width !== newWidth || prevSizeRef.current.height !== newHeight) {
        prevSizeRef.current = { width: newWidth, height: newHeight };
        setSize({ width: newWidth, height: newHeight });
        requestAnimationFrame(() => {
          graphRef.current?.d3ReheatSimulation();
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    const linkForce = graph?.d3Force("link");
    if (isLinkForce(linkForce)) linkForce.distance(120).strength(0.25);
    const chargeForce = graph?.d3Force("charge");
    if (isStrengthForce(chargeForce)) chargeForce.strength(-420);

    graph?.d3ReheatSimulation();
    graph?.zoomToFit(800, 72);
  }, [graphData]);

  // 计算当前需要被高亮的节点群落（不管是 hover 还是 click）
  const activeNeighbors = useMemo(() => {
    const activeId = hoverNodeId || highlightedConceptId;
    if (!activeId) return new Set<string>();

    const neighbors = new Set<string>();
    graphData.links.forEach((link) => {
      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);
      if (sourceId === activeId) neighbors.add(targetId);
      if (targetId === activeId) neighbors.add(sourceId);
    });
    return neighbors;
  }, [graphData.links, hoverNodeId, highlightedConceptId]);

  const renderedGraphData = useMemo<GraphData<NexusNode, NexusLink>>(
    () => ({
      nodes: JSON.parse(JSON.stringify(graphData.nodes)),
      links: JSON.parse(JSON.stringify(graphData.links)),
    }),
    [graphData],
  );

  // 判断单个节点是否在激活状态（它自己是被聚焦的，或者是邻居）
  const isNodeActive = (node: NodeObject<NexusNode>) => {
    const activeId = hoverNodeId || highlightedConceptId;
    if (!activeId) return true; // 如果没有聚焦对象，全体保持默认状态
    const nodeId = getNodeId(node.id);
    return nodeId === activeId || activeNeighbors.has(nodeId);
  };

  // 判断连线是否在激活状态
  const isLinkActive = (link: LinkObject<NexusNode, NexusLink>) => {
    const activeId = hoverNodeId || highlightedConceptId;
    if (!activeId) return true;
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    return sourceId === activeId || targetId === activeId;
  };

  return (
    <section className="relative min-h-[calc(100vh-9rem)]">
      <div
        ref={containerRef}
        className="relative min-h-[calc(100vh-9rem)] overflow-hidden rounded border border-white/10 bg-zinc-950/80"
      >
        {graphData.nodes.length === 0 ? (
          <div className="flex h-full min-h-[calc(100vh-9rem)] items-center justify-center px-6 text-center text-sm leading-6 text-white/40">
            The Nexus is empty. Archive a completed analytical session to seed the graph.
          </div>
        ) : mounted ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={renderedGraphData}
            width={size.width}
            height={size.height}
            backgroundColor="rgba(9,9,11,0)"
            nodeId="id"
            nodeRelSize={6}
            nodeVal="val"
            nodeLabel={(node) => node.name}
            
            // 处理鼠标悬停事件
            onNodeHover={(node) => setHoverNodeId(node ? getNodeId(node.id) : null)}
            
            linkColor={(link) => {
              const hasFocus = !!(hoverNodeId || highlightedConceptId);
              if (!hasFocus) return "rgba(255,255,255,0.12)"; // 默认连线颜色
              return isLinkActive(link) ? "rgba(0,229,255,0.6)" : "rgba(255,255,255,0.03)"; // 激活时的高亮冰蓝色 vs 虚化
            }}
            linkWidth={(link) => {
              const hasFocus = !!(hoverNodeId || highlightedConceptId);
              if (!hasFocus) return 0.8;
              return isLinkActive(link) ? 1.8 : 0.2;
            }}
            d3AlphaDecay={0.018}
            d3VelocityDecay={0.32}
            cooldownTicks={160}
            warmupTicks={60}
            minZoom={0.45}
            maxZoom={5}
            onNodeClick={(node) => {
              if (node.type === "document" && node.documentId) {
                router.push(`/archive/${node.documentId}`);
                return;
              }
              if (node.type === "concept" && node.id) {
                setHighlightedConceptId((current) =>
                  current === node.id ? null : String(node.id),
                );
              }
            }}
            onBackgroundClick={() => setHighlightedConceptId(null)}
            showPointerCursor={(object) => Boolean(object)}
            
            nodeCanvasObject={(node, context, globalScale) => {
              const activeId = hoverNodeId || highlightedConceptId;
              const hasFocus = !!activeId;
              const active = isNodeActive(node);
              const isCenterFocus = activeId === getNodeId(node.id);
              const isDoc = node.type === "document";
              
              const radius = getNodeRadius(node, isCenterFocus);
              const label = node.name ?? "";
              const labelFontSize = isDoc ? 13 : 11;
              const fontSize = labelFontSize / globalScale;

              context.beginPath();
              context.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
              
              // 颜色策略设定
              if (!hasFocus) {
                // 默认状态：青柠色
                context.fillStyle = isDoc ? "rgba(222,255,154,0.85)" : "rgba(222,255,154,0.35)";
              } else if (active) {
                // 高亮状态：冰蓝色 (Cyan)
                context.fillStyle = isDoc ? "rgba(0,229,255,0.9)" : "rgba(0,229,255,0.45)";
              } else {
                // 虚化状态：暗淡灰
                context.fillStyle = "rgba(255,255,255,0.08)";
              }
              context.fill();

              // 边框策略
              if (isDoc) {
                if (!hasFocus) {
                  context.strokeStyle = "rgba(222,255,154,0.6)";
                } else if (active) {
                  context.strokeStyle = "rgba(0,229,255,0.8)";
                } else {
                  context.strokeStyle = "rgba(255,255,255,0.1)";
                }
                context.lineWidth = 1.5 / globalScale;
                context.stroke();
              }

              // 文本绘制
              context.font = `${fontSize}px serif`;
              context.textAlign = "left";
              context.textBaseline = "middle";
              
              if (!hasFocus) {
                context.fillStyle = isDoc ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)";
              } else if (active) {
                context.fillStyle = isDoc ? "rgba(255,255,255,1)" : "rgba(0,229,255,0.9)";
              } else {
                context.fillStyle = "rgba(255,255,255,0.15)";
              }
              
              context.fillText(label, (node.x ?? 0) + radius + 4, node.y ?? 0);
            }}
            
            nodePointerAreaPaint={(node, color, context) => {
              const radius = getNodeRadius(node, true) + 8;
              context.fillStyle = color;
              context.beginPath();
              context.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
              context.fill();
            }}
          />
        ) : null}
      </div>

      {highlightedConceptId && (
        <button
          type="button"
          onClick={() => setHighlightedConceptId(null)}
          className="absolute right-4 top-4 rounded border border-[#00e5ff]/30 bg-zinc-950/70 px-3 py-2 text-xs font-semibold tracking-wide text-[#00e5ff] backdrop-blur-sm transition hover:border-[#00e5ff]/60"
        >
          CLEAR FOCUS
        </button>
      )}
    </section>
  );
}