import { beforeEach, describe, expect, it, vi } from "vitest";
import { runRefineryPhase } from "./phase";

const mocks = vi.hoisted(() => ({
  streamText: vi.fn(),
  tool: vi.fn(),
  stepCountIs: vi.fn(),
  runLocalHybridSearch: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: vi.fn((options: unknown) => {
    mocks.streamText(options);
    return {
      toTextStreamResponse: () => new Response("mock-stream"),
    };
  }),
  tool: vi.fn((definition: unknown) => {
    mocks.tool(definition);
    return definition;
  }),
  stepCountIs: vi.fn((count: number) => {
    mocks.stepCountIs(count);
    return { __kind: "stepCountIs", count };
  }),
}));

vi.mock("@/src/lib/local-search", () => ({
  runLocalHybridSearch: vi.fn((...args: unknown[]) => mocks.runLocalHybridSearch(...args)),
}));

function createDependencies() {
  return {
    model: "mock-model",
    embeddingClient: {
      embeddings: {
        create: vi.fn(),
      },
    },
    ragRepository: {
      searchChunks: vi.fn(),
    },
  };
}

describe("runRefineryPhase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs phase C with a tool-forcing system prompt and local knowledge tool", async () => {
    const result = runRefineryPhase({
      prompt: "请做一期制度分析简报",
      phase: "C",
      ...createDependencies(),
    });

    expect(result.toTextStreamResponse()).toBeInstanceOf(Response);
    expect(mocks.streamText).toHaveBeenCalledTimes(1);

    const streamOptions = mocks.streamText.mock.calls[0][0] as {
      prompt: string;
      system: string;
      toolChoice: string;
      stopWhen: { __kind: string; count: number };
      tools: Record<string, unknown>;
    };

    expect(streamOptions.prompt).toBe("请做一期制度分析简报");
    expect(streamOptions.system).toContain("最高级系统指令：绝对动作前置");
    expect(streamOptions.system).toContain("必须、必须、必须");
    expect(streamOptions.system).toContain("search_local_knowledge_base");
    expect(streamOptions.toolChoice).toBe("auto");
    expect(streamOptions.stopWhen).toEqual({ __kind: "stepCountIs", count: 5 });
    expect(Object.keys(streamOptions.tools)).toContain("search_local_knowledge_base");
  });

  it("returns fallback metadata when the local knowledge tool finds no evidence", async () => {
    runRefineryPhase({
      prompt: "请做一期货币政策争议分析",
      phase: "A",
      bookUuid: "book-1",
      ...createDependencies(),
    });

    const streamOptions = mocks.streamText.mock.calls[0][0] as {
      tools: {
        search_local_knowledge_base: {
          execute: (input: { query: string; match_count?: number }) => Promise<{
            query: string;
            results: unknown[];
            retrievedChunks: number;
            hasLocalEvidence: boolean;
          }>;
        };
      };
    };

    mocks.runLocalHybridSearch.mockResolvedValueOnce([]);
    const result = await streamOptions.tools.search_local_knowledge_base.execute({
      query: "货币政策",
      match_count: 2,
    });

    expect(result).toEqual({
      query: "货币政策",
      results: [],
      retrievedChunks: 0,
      hasLocalEvidence: false,
    });
    expect(mocks.runLocalHybridSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "货币政策",
        matchCount: 2,
        bookUuid: "book-1",
      })
    );
  });

  it("builds a topic-specific phase D continuation prompt", () => {
    runRefineryPhase({
      prompt: "追加分析",
      phase: "D",
      topicTitle: "拉美支付合规",
      ...createDependencies(),
    });

    const streamOptions = mocks.streamText.mock.calls[0][0] as {
      system: string;
    };

    expect(streamOptions.system).toContain("已有议题「拉美支付合规」");
    expect(streamOptions.system).toContain("严禁生成重复的导言、背景介绍或全量文章");
    expect(streamOptions.system).toContain("## [本次推演的特定核心切面]");
  });
});
