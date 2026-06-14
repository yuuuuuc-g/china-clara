import { describe, expect, it } from "vitest";
import { getPromptDefinition, renderPrompt } from "./registry";

describe("Prompt Registry", () => {
  it("renders the phase C refinery prompt with its tool-use contract", () => {
    const definition = getPromptDefinition("refinery.phaseC.keywordExtraction.v1");
    const prompt = renderPrompt("refinery.phaseC.keywordExtraction.v1", {});

    expect(definition.version).toBe(1);
    expect(definition.outputContract).toContain("Markdown list");
    expect(prompt).toContain("最高级系统指令：绝对动作前置");
    expect(prompt).toContain("search_local_knowledge_base");
  });

  it("renders topic-specific phase D continuation prompts", () => {
    const prompt = renderPrompt("refinery.phaseD.finalDraft.v1", {
      topicTitle: "拉美支付合规",
    });

    expect(prompt).toContain("已有议题「拉美支付合规」");
    expect(prompt).toContain("严禁生成重复的导言、背景介绍或全量文章");
  });
});
