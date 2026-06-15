import { stepCountIs, streamText, tool, type LanguageModel } from "ai";
import { z } from "zod";
import type { EmbeddingClient } from "@/src/lib/local-search";
import { runLocalHybridSearch } from "@/src/lib/local-search";
import { renderRefineryPhasePrompt } from "@/src/modules/prompts/registry";
import type { RagRepository } from "@/src/modules/rag/repository";

export type RefineryPhase = "A" | "B" | "C" | "D";

export function isRefineryPhase(value: unknown): value is RefineryPhase {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

export interface RunRefineryPhaseInput {
  prompt: string;
  phase: RefineryPhase;
  topicTitle?: string;
  bookUuid?: string;
  model: LanguageModel;
  embeddingClient: EmbeddingClient;
  ragRepository: Pick<RagRepository, "searchChunks">;
}

export function runRefineryPhase(input: RunRefineryPhaseInput) {
  return streamText({
    stopWhen: stepCountIs(5),
    model: input.model,
    system: renderRefineryPhasePrompt(input.phase, { topicTitle: input.topicTitle }),
    prompt: input.prompt,
    temperature: 0.35,
    tools: {
      search_local_knowledge_base: tool({
        description:
          "Search the local Supabase hybrid index for political, economic, and sociological source fragments.",
        inputSchema: z.object({
          query: z.string().min(1).describe("Retrieval query for local knowledge base search."),
          match_count: z.number().int().min(1).max(3).optional(),
        }),
        execute: async (toolInput) => {
          const results = await runLocalHybridSearch({
            repository: input.ragRepository,
            embeddingClient: input.embeddingClient,
            query: toolInput.query.trim(),
            matchCount: toolInput.match_count ?? 3,
            bookUuid: input.bookUuid,
          });

          return {
            query: toolInput.query,
            results,
            retrievedChunks: results.length,
            hasLocalEvidence: results.length > 0,
          };
        },
      }),
    },
    toolChoice: "auto",
  });
}
