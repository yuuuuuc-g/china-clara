"use client";

import { FormEvent, memo, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SearchResult } from "@/src/lib/local-search";
import type { NodeData, NodesData } from "@/app/api/nodes/route";
import { GalaxyNodes } from "@/src/components/canvas/GalaxyNodes";
import { CopyButton } from "@/src/components/ui/CopyButton";
import { useDevRenderCounter } from "@/src/lib/dev-render-profiler";
import {
  parseDomainSseFrame,
  type AiDomainEvent,
  type SearchDomainResult,
} from "@/src/lib/ai-domain-events";

const MAX_RENDERED_RESULTS = 3;
const CHARACTER_LIMIT = 150;

interface SourceItemProps {
  result: SearchDomainResult;
  rank: number;
}

function SourceItem({ result, rank }: SourceItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const resultText = "content" in result ? result.content : result.preview;
  const isTruncatable = resultText.length > CHARACTER_LIMIT;
  const displayContent =
    isTruncatable && !isExpanded
      ? `${resultText.slice(0, CHARACTER_LIMIT)}...`
      : resultText;

  return (
    <article className="relative rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <CopyButton textToCopy={resultText} />
      <div className="mb-2 flex items-center justify-between gap-3 pr-8">
        <div className="flex min-w-0 items-center gap-1 font-mono text-xs text-emerald-400/80">
          <span aria-hidden>◆</span>
          <span className="truncate">Source: {result.chapter_title}</span>
        </div>
        <span
          className="shrink-0 rounded border border-cyan-300/20 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] tracking-widest text-cyan-200/70"
          title="Hybrid retrieval rank (RRF fusion order)"
        >
          [RANK #{rank}]
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-white/65">
        {displayContent}
        {isTruncatable && (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="ml-2 text-xs text-blue-400/80 underline underline-offset-2 transition-colors hover:text-blue-300"
          >
            {isExpanded ? "[COLLAPSE]" : "[EXPAND]"}
          </button>
        )}
      </p>
    </article>
  );
}

interface SearchResponseBody {
  results?: SearchResult[];
  error?: string;
}

interface NodesResponseBody {
  nodes?: NodesData;
  error?: string;
}

interface AgentLogEntry {
  event: AiDomainEvent["type"];
  summary: string;
  tone: "info" | "success" | "warn" | "error";
}

type AgentStatus = "idle" | "searching" | "streaming" | "finished" | "failed";

function resolveAgentLogTone(eventType: AiDomainEvent["type"]): AgentLogEntry["tone"] {
  if (eventType === "generation.finished") {
    return "success";
  }
  if (eventType === "generation.failed") {
    return "error";
  }
  if (eventType === "generation.step") {
    return "warn";
  }
  return "info";
}

function getAgentLogToneClass(tone: AgentLogEntry["tone"]): string {
  if (tone === "success") {
    return "text-emerald-300/90";
  }
  if (tone === "error") {
    return "text-red-300/90";
  }
  if (tone === "warn") {
    return "text-amber-200/85";
  }
  return "text-cyan-100/80";
}

function dedupeSearchResults(items: SearchDomainResult[]): SearchDomainResult[] {
  const seen = new Set<string>();
  const deduped: SearchDomainResult[] = [];

  for (const item of items) {
    const key =
      item.chunk_index !== null ? `${item.id}:${item.chunk_index}` : `${item.id}:null`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}


interface GalaxyCanvasLayerProps {
  highlightedNodeId: string | null;
  nodes: NodesData;
}

function isSearchDomainResult(value: unknown): value is SearchDomainResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<SearchDomainResult>;

  return (
    typeof row.id === "string" &&
    typeof row.chapter_title === "string" &&
    typeof row.similarity === "number" &&
    ("content" in row || "preview" in row)
  );
}

function isNodeData(value: unknown): value is NodeData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<NodeData>;

  return (
    typeof row.id === "string" &&
    typeof row.chapter_title === "string" &&
    typeof row.chunk_index === "number" &&
    typeof row.book_id === "string"
  );
}

const GalaxyCanvasLayer = memo(function GalaxyCanvasLayer({
  highlightedNodeId,
  nodes,
}: GalaxyCanvasLayerProps) {
  useDevRenderCounter("GalaxyWorkspace::MemoizedGalaxyScene");
  return (
    <Canvas
      className="pointer-events-auto absolute inset-0 z-0 touch-none"
      camera={{ position: [0, 1.8, 5.6], fov: 45 }}
      dpr={[1, 1.25]}
      frameloop="always"
      onWheel={(event) => {
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <ambientLight intensity={1.85} />
      <directionalLight color="#dbeafe" intensity={1.4} position={[0, 4, 5]} />
      <pointLight color="#67e8f9" intensity={6.2} position={[3, 3, 4]} />
      <pointLight color="#e879f9" intensity={3.3} position={[-3, -2, 3]} />
      <Stars radius={42} depth={32} count={120} factor={3} fade speed={0.25} />
      <GalaxyNodes highlightedNodeId={highlightedNodeId} nodesData={nodes} />
      <OrbitControls enablePan enableZoom minDistance={2.8} maxDistance={9} panSpeed={0.75} zoomSpeed={0.85} />
    </Canvas>
  );
});

export const MemoizedGalaxyScene = GalaxyCanvasLayer;

interface GalaxyWorkspaceHudProps {
  onHighlightedNodeChange: (nodeId: string | null) => void;
  nodesError: string | null;
}

function GalaxyWorkspaceHud({ onHighlightedNodeChange, nodesError }: GalaxyWorkspaceHudProps) {
  useDevRenderCounter("GalaxyWorkspace::HUD");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchDomainResult[]>([]);
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);

  const renderedResults = useMemo(
    () => results.slice(0, MAX_RENDERED_RESULTS),
    [results]
  );
  const shouldShowAgentLogs =
    aiResponse.trim().length === 0 && isSearching && agentStatus !== "finished";

  function buildAgentLogSummary(event: AiDomainEvent): string {
    const iteration =
      "iteration" in event &&
      typeof event.iteration === "number" &&
      Number.isFinite(event.iteration)
        ? `#${event.iteration}`
        : null;

    if (event.type === "retrieval.started") {
      return `start rewritten="${event.rewrittenQuery ?? event.query}"`;
    }

    if (event.type === "retrieval.query") {
      return `retrieve ${iteration ?? ""} query="${event.query}"`.trim();
    }

    if (event.type === "retrieval.result") {
      return `retrieved ${event.retrievedChunks} chunks ${iteration ?? ""}`.trim();
    }

    if (event.type === "generation.step") {
      return `step ${iteration ?? ""} label=${event.label}`.trim();
    }

    if (event.type === "generation.delta") {
      return `delta ${iteration ?? ""} "${event.text}"`.trim();
    }

    if (event.type === "generation.finished") {
      return `finished in ${event.totalIterations ?? "n/a"} iterations`;
    }

    if (event.type === "generation.failed") {
      return `failed ${iteration ?? ""} "${event.message}"`.trim();
    }

    return "event";
  }

  function appendAgentLog(event: AiDomainEvent) {
    const summary = buildAgentLogSummary(event);
    const tone = resolveAgentLogTone(event.type);
    setAgentLogs((current) => [...current, { event: event.type, summary, tone }]);
  }

  function handleAgentEvent(event: AiDomainEvent) {
    if (event.type === "retrieval.result") {
      const parsedResults = event.results.filter(isSearchDomainResult).slice(0, MAX_RENDERED_RESULTS);
      const safeResults = dedupeSearchResults(parsedResults).slice(0, MAX_RENDERED_RESULTS);
      // Keep right panel as the latest retrieval snapshot, not an accumulated list.
      setResults(safeResults);
      onHighlightedNodeChange(safeResults[0]?.id ?? null);
      appendAgentLog(event);
      return;
    }

    if (event.type === "generation.delta") {
      setAgentStatus("streaming");
      setIsSearching(false);
      if (event.text.length > 0) {
        setAiResponse((current) => current + event.text);
      }
      return;
    }

    appendAgentLog(event);

    if (event.type === "generation.failed") {
      setAgentStatus("failed");
      setIsSearching(false);
      throw new Error(event.message);
    }

    if (event.type === "generation.finished") {
      setAgentStatus("finished");
      setIsSearching(false);
    }
  }

  async function streamGeneration(trimmedQuery: string) {
    setAiResponse("");
    setResults([]);
    onHighlightedNodeChange(null);
    setAgentLogs([]);
    setIsGenerating(true);
    setAgentStatus("searching");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmedQuery,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as SearchResponseBody;
        throw new Error(payload.error ?? "Search request failed.");
      }

      if (!response.body) {
        throw new Error("Search stream is empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const parsedFrame = parseDomainSseFrame(frame);
            if (!parsedFrame) {
              continue;
            }
            handleAgentEvent(parsedFrame.event);
          }
        }

        if (done) {
          break;
        }
      }

      const remainingText = decoder.decode();
      if (remainingText.length > 0) {
        buffer += remainingText;
      }
      if (buffer.trim().length > 0) {
        const parsedFrame = parseDomainSseFrame(buffer);
        if (parsedFrame) {
          handleAgentEvent(parsedFrame.event);
        }
      }
    } catch (generationError) {
      setAgentStatus("failed");
      setIsSearching(false);
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Search request failed.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Enter a question to search the Exocortex.");
      return;
    }

    setError(null);
    setAiResponse("");
    setAgentLogs([]);
    setIsSearching(true);
    setAgentStatus("searching");

    try {
      await streamGeneration(trimmedQuery);
    } catch (searchError) {
      const message =
        searchError instanceof Error ? searchError.message : "Search request failed.";
      setError(message);
      setResults([]);
      setAiResponse("");
      onHighlightedNodeChange(null);
      setAgentStatus("failed");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section
      className="pointer-events-none absolute inset-0 z-10 flex min-h-0 items-stretch justify-between gap-4 overflow-y-auto p-4 lg:gap-6 lg:p-6"
      data-testid="search-hud"
    >
      <div className="pointer-events-auto flex max-h-full min-h-0 w-full max-w-[min(28rem,42vw)] flex-col rounded-2xl border border-white/10 bg-black/75 p-5 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">
          Exocortex RAG
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Retrieval Gateway
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Search ingested knowledge chunks and let the top chapter light up in the
          galaxy view.
        </p>

        <form className="mt-5 flex gap-3" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="exocortex-query">
            Exocortex query
          </label>
          <input
            aria-label="Exocortex query"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/60"
            id="exocortex-query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about rules, scarcity, property rights..."
            type="search"
            value={query}
          />
          <button
            className="rounded-xl border border-cyan-300/40 bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSearching || isGenerating}
            type="submit"
          >
            {isSearching ? "Searching..." : isGenerating ? "Generating..." : "Search"}
          </button>
        </form>

        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          <div
            className="group relative flex min-h-32 flex-col rounded-2xl border border-cyan-300/20 bg-cyan-950/20 p-4 shadow-[inset_0_0_24px_rgba(34,211,238,0.08)]"
            data-testid="ai-response"
          >
            <CopyButton textToCopy={aiResponse} />
            <div className="mb-2 flex items-center justify-between gap-3 pr-8">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/60">
                Generation
              </p>
              {isGenerating && (
                <span className="text-xs text-cyan-200/70">Streaming...</span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {aiResponse ? (
                <div className="prose prose-invert prose-emerald max-w-none text-sm leading-6 text-cyan-50/85 prose-headings:text-emerald-300 prose-strong:text-cyan-100 prose-a:text-sky-300 prose-li:marker:text-emerald-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-6 text-cyan-50/80">
                  AI analysis will stream here after retrieval.
                </p>
              )}
            </div>
          </div>

          {shouldShowAgentLogs && (
            <div
              className="rounded-lg border border-cyan-300/20 bg-black/20 p-2"
              data-testid="agent-logs"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/55">
                Agent Logs
              </p>
              {agentLogs.length > 0 ? (
                <div className="mt-1 max-h-48 space-y-1 overflow-y-auto text-xs leading-5">
                  {agentLogs.map((entry, index) => (
                    <p className={getAgentLogToneClass(entry.tone)} key={`${entry.event}-${index}`}>
                      {entry.event} | {entry.summary}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-cyan-100/70">
                  Awaiting agent lifecycle events...
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}
        {nodesError && (
          <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            {nodesError}
          </p>
        )}
      </div>

      <aside
        className="pointer-events-auto flex max-h-full min-h-0 w-full max-w-[min(22rem,34vw)] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-black/75 p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        data-testid="search-results"
      >
        <p className="text-xs uppercase tracking-[0.28em] text-white/40">
          Sources
        </p>

        {renderedResults.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-white/50">
            Run a search to surface the three most relevant chunks.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {renderedResults.map((result, index) => (
              <SourceItem key={result.id} rank={index + 1} result={result} />
            ))}
          </div>
        )}
      </aside>
    </section>
  );
}

export function GalaxyWorkspace() {
  useDevRenderCounter("GalaxyWorkspace::Root");
  const [nodes, setNodes] = useState<NodesData>([]);
  const [nodesError, setNodesError] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNodes() {
      try {
        const response = await fetch("/api/nodes");
        const payload = (await response.json()) as NodesResponseBody;

        if (!response.ok) {
          throw new Error(payload.error ?? "Nodes request failed.");
        }

        const safeNodes = Array.isArray(payload.nodes)
          ? payload.nodes.filter(isNodeData)
          : [];

        if (isMounted) {
          setNodes(safeNodes);
          setNodesError(null);
        }
      } catch (nodeError) {
        const message =
          nodeError instanceof Error ? nodeError.message : "Nodes request failed.";

        if (isMounted) {
          setNodes([]);
          setNodesError(message);
        }
      }
    }

    void loadNodes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-x-hidden bg-black text-white">
      <div className="relative min-h-0 w-full flex-1">
        <MemoizedGalaxyScene highlightedNodeId={highlightedNodeId} nodes={nodes} />
        <GalaxyWorkspaceHud
          nodesError={nodesError}
          onHighlightedNodeChange={setHighlightedNodeId}
        />
      </div>
    </main>
  );
}
