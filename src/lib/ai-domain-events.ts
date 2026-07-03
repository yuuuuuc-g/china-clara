import type { SearchResult } from "@/src/lib/local-search";
import type { RagSearchResultCitation } from "@/src/modules/rag/repository";

export type SearchDomainResult = SearchResult | RagSearchResultCitation;

export type AiDomainEvent =
  | {
      type: "retrieval.started";
      query: string;
      rewrittenQuery?: string;
      maxIterations?: number;
    }
  | {
      type: "retrieval.query";
      query: string;
      iteration?: number;
      matchCount?: number;
    }
  | {
      type: "retrieval.result";
      results: SearchDomainResult[];
      iteration?: number;
      retrievedChunks: number;
    }
  | {
      type: "generation.delta";
      text: string;
      iteration?: number;
    }
  | {
      type: "generation.step";
      label: string;
      iteration?: number;
      retrievedChunks?: number;
      latencyMs?: number;
    }
  | {
      type: "generation.finished";
      text?: string;
      results?: SearchDomainResult[];
      totalIterations?: number;
    }
  | {
      type: "generation.failed";
      message: string;
      reason?: string;
      iteration?: number;
    };

export interface ParsedSseFrame {
  eventName: string;
  event: AiDomainEvent;
}

export function toDomainSseEvent(event: AiDomainEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function parseDomainSseFrame(frame: string): ParsedSseFrame | null {
  const lines = frame
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0 && !line.startsWith(":"));

  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim() || "message";
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  const dataValue = dataLines.join("\n").trim();
  if (!dataValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(dataValue) as unknown;
    if (!isAiDomainEvent(parsed)) {
      return null;
    }

    return {
      eventName,
      event: parsed,
    };
  } catch {
    return null;
  }
}

export function createDomainEventStream(
  start: (emit: (event: AiDomainEvent) => void) => Promise<void> | void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AiDomainEvent): void => {
        controller.enqueue(encoder.encode(toDomainSseEvent(event)));
      };

      try {
        await start(emit);
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation request failed.";
        emit({
          type: "generation.failed",
          reason: "runtime_error",
          message,
        });
        controller.close();
      }
    },
  });
}

export function domainEventStreamHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSearchDomainResult(value: unknown): value is SearchDomainResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.chapter_title === "string" &&
    typeof value.similarity === "number" &&
    (typeof value.content === "string" || typeof value.preview === "string")
  );
}

function isAiDomainEvent(value: unknown): value is AiDomainEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "retrieval.started") {
    return typeof value.query === "string";
  }

  if (value.type === "retrieval.query") {
    return typeof value.query === "string";
  }

  if (value.type === "retrieval.result") {
    return Array.isArray(value.results) && value.results.every(isSearchDomainResult);
  }

  if (value.type === "generation.delta") {
    return typeof value.text === "string";
  }

  if (value.type === "generation.step") {
    return typeof value.label === "string";
  }

  if (value.type === "generation.finished") {
    return true;
  }

  if (value.type === "generation.failed") {
    return typeof value.message === "string";
  }

  return false;
}
