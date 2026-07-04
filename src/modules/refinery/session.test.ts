import { describe, expect, it } from "vitest";
import {
  analyticalSessionReducer,
  buildPhasePrompt,
  buildPhaseRunRequest,
  createInitialAnalyticalSessionState,
  deriveAnalyticalSessionView,
  extractOptionBlocks,
  sanitizeStreamingOutput,
} from "./session";
import { MAX_REFINERY_PROMPT_CHARS } from "./prompt-limits";

describe("Analytical Session", () => {
  it("parses markdown list items as option blocks with continuation lines", () => {
    expect(
      extractOptionBlocks(
        [
          "- 标题：第一项",
          "  摘要：延续说明",
          "* 标题：第二项",
          "1. 标题：第三项",
        ].join("\n"),
      ),
    ).toEqual([
      "标题：第一项\n  摘要：延续说明",
      "标题：第二项",
      "标题：第三项",
    ]);
  });

  it("keeps selection keys and full option text together", () => {
    let state = createInitialAnalyticalSessionState();

    state = analyticalSessionReducer(state, {
      type: "toggleSelection",
      key: "A:0",
      blockFullText: "标题：供应链冲击\n摘要：港口拥堵",
    });

    expect(state.selections.A).toEqual(["A:0"]);
    expect(state.selectedItems.A).toEqual({
      "A:0": "标题：供应链冲击\n摘要：港口拥堵",
    });

    state = analyticalSessionReducer(state, {
      type: "toggleSelection",
      key: "A:0",
      blockFullText: "标题：供应链冲击\n摘要：港口拥堵",
    });

    expect(state.selections.A).toEqual([]);
    expect(state.selectedItems.A).toEqual({});
  });

  it("centralizes phase transitions and clears transient completion text", () => {
    let state = createInitialAnalyticalSessionState();
    state = analyticalSessionReducer(state, {
      type: "setCompletion",
      completion: "streaming text",
    });
    state = analyticalSessionReducer(state, { type: "enterEditMode" });
    state = analyticalSessionReducer(state, { type: "advancePhase" });

    expect(state.phase).toBe("B");
    expect(state.completion).toBe("");
    expect(state.isEditing).toBe(false);
  });

  it("derives request readiness from the current phase snapshot", () => {
    let state = createInitialAnalyticalSessionState();
    state = analyticalSessionReducer(state, {
      type: "setSourceText",
      sourceText: "   货币政策争议   ",
    });

    expect(deriveAnalyticalSessionView(state, false).canRequest).toBe(true);

    state = analyticalSessionReducer(state, {
      type: "finishPhaseRun",
      phase: "A",
      text: "- 标题：争议简报",
    });
    state = analyticalSessionReducer(state, {
      type: "toggleSelection",
      key: "A:0",
      blockFullText: "标题：争议简报",
    });
    state = analyticalSessionReducer(state, { type: "advancePhase" });

    const view = deriveAnalyticalSessionView(state, false);
    expect(view.canRequest).toBe(true);
    expect(view.priorSelectedKeysForRun).toEqual(["A:0"]);
  });

  it("builds phase prompts from archived output, selections, and custom tags", () => {
    const prompt = buildPhasePrompt({
      phase: "D",
      sourceText: "APAC 合规变化",
      archives: {
        A: "Phase A archive",
        B: "Phase B archive",
        C: "Phase C archive",
      },
      selectedItems: {
        A: {
          "A:1": "标题：第二个 briefing",
          "A:0": "标题：第一个 briefing",
        },
        B: {
          "B:0": "事件：监管听证",
        },
        C: {
          "C:0": "关键词：跨境支付",
        },
      },
      customTags: ["稳定币清算"],
    });

    expect(prompt).toContain("原始议题：\nAPAC 合规变化");
    expect(prompt.indexOf("第一个 briefing")).toBeLessThan(
      prompt.indexOf("第二个 briefing"),
    );
    expect(prompt).toContain("Phase C 完整输出：\nPhase C archive");
    expect(prompt).toContain("关键词：跨境支付\n稳定币清算");
  });

  it("bounds long phase prompts to the analytical pipeline API limit", () => {
    const prompt = buildPhasePrompt({
      phase: "D",
      sourceText: "APAC 合规变化".repeat(300),
      archives: {
        A: "",
        B: "",
        C: "Phase C archive detail\n".repeat(300),
      },
      selectedItems: {
        A: {
          "A:0": "标题：超长 briefing\n摘要：".concat("供应链与监管变化".repeat(200)),
        },
        B: {
          "B:0": "事件：监管听证\n说明：".concat("跨境支付清算争议".repeat(200)),
        },
        C: {
          "C:0": "关键词：跨境支付".concat("稳定币清算".repeat(200)),
        },
      },
      customTags: ["地缘金融风险".repeat(100)],
    });

    expect(prompt.length).toBeLessThanOrEqual(MAX_REFINERY_PROMPT_CHARS);
    expect(prompt).toContain("原始议题：");
    expect(prompt).toContain("Phase C 完整输出：");
    expect(prompt).toContain("用户选中的关键词（选项原文）：");
    expect(prompt).toContain("[内容已截断]");
  });

  it("adds topic context to final draft requests without leaking it into earlier phases", () => {
    let state = createInitialAnalyticalSessionState();
    state = analyticalSessionReducer(state, {
      type: "setSelectedTopicId",
      topicId: "topic-1",
    });

    expect(buildPhaseRunRequest(state, [{ id: "topic-1", title: "APAC" }], "A"))
      .toMatchObject({
        requestBody: { phase: "A" },
      });

    expect(buildPhaseRunRequest(state, [{ id: "topic-1", title: "APAC" }], "D"))
      .toMatchObject({
        requestBody: {
          phase: "D",
          selectedTopicId: "topic-1",
          topicTitle: "APAC",
        },
      });
  });

  it("sanitizes tool-call noise before archiving phase output", () => {
    expect(
      sanitizeStreamingOutput(
        '正文\n{"type":"tool-call","toolName":"search"}\n<tool_result>hidden</tool_result>\n结论',
      ),
    ).toBe("正文\n\n结论");
  });
});
