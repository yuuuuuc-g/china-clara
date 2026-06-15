import type { RefineryPhase } from "@/src/modules/refinery/phase";

export type PromptName =
  | "refinery.phaseA.briefingList.v1"
  | "refinery.phaseB.eventChain.v1"
  | "refinery.phaseC.keywordExtraction.v1"
  | "refinery.phaseD.finalDraft.v1";

export interface PromptDefinition {
  name: PromptName;
  version: number;
  inputVariables: string[];
  outputContract: string;
  render: (input: Record<string, unknown>) => string;
}

interface PhaseDInput {
  topicTitle?: string;
}

const MARS_SYSTEM_PROMPT = `你是一个顶级的跨国政经商业智库引擎 (Exocortex Crucible)。
你的核心任务是抹平不同地域（如拉美西语区与大中华区）在政治体制、宏观经济、文化习俗上的信息不对称。
在开始构建简报前，你【必须】优先调用本地知识库检索工具，寻找学者原典或官方政策作为分析的绝对基石。如果本地无记录，才允许使用原生知识 Fallback。
你的分析必须遵守以下铁律：
1. 剥离情绪，强制区分“实然 (Is)”与“应然 (Ought)”。
2. 视角套利：指出同一个事件在不同国家/文化背景下的不同解读或监管洼地。
3. 语言极度精炼、冷静、结构化，像顶级咨询公司（如麦肯锡、欧亚集团）的内参简报。`;

function renderPhaseD(input: PhaseDInput): string {
  if (input.topicTitle) {
    return `${MARS_SYSTEM_PROMPT}
当前：Phase D / Final Draft。
这是一个已有议题「${input.topicTitle}」的追加推演。
严禁生成重复的导言、背景介绍或全量文章。
你必须直接输出一个以 "## [本次推演的特定核心切面]" 开头的深度子章节。
该子章节应当：
1. 聚焦一个全新的分析维度或视角
2. 与已有内容形成互补，而非重复
3. 保持同样的学术严谨性和结构化风格
4. 直接输出 Markdown 正文，不要任何元评论`;
  }

  return `${MARS_SYSTEM_PROMPT}
当前：Phase D / Final Draft (商业卫星简报)。
请综合本地文献与上下文，直接输出一篇标准化的 Markdown 跨境商业内参。绝对不要输出任何过渡性废话。
必须严格包含以下四个结构：
# [核心议题的锐利标题，需体现信息差或冲突点]

## 1. 核心事实与信息差 (The Reality)
- [用 2-3 个 Bullet point 描述该事件或政策的真实情况]
- [指出大众传媒或单边市场对此存在的普遍误解或信息滞后]

## 2. 宏观政经透视 (Macro Perspective)
- [结合本地知识库中的政治学/经济学理论，剖析背后的结构性原因或权力博弈]

## 3. 跨国合规与商业红利 (Business Arbitrage)
- [明确指出该事件对特定行业的具体影响（风险规避 或 套利空间）]

## 4. 行动建议 (Actionable Insight)
- [给出 1-2 条针对高净值企业或跨境商人的具体战术建议]`;
}

const PROMPTS: {
  [Name in PromptName]: PromptDefinition;
} = {
  "refinery.phaseA.briefingList.v1": {
    name: "refinery.phaseA.briefingList.v1",
    version: 1,
    inputVariables: [],
    outputContract: "Markdown list. Each item starts with '- ' and includes 标题, 问题, 链路, 切口.",
    render: () => `${MARS_SYSTEM_PROMPT}
当前：Phase A / Briefing List。
输出 3-5 条 Briefing 候选。每条必须使用标准 Markdown 列表格式，以 "- " 开头：
- 标题：一句话标题
  问题：回答的核心问题
  链路：核心事件链路
  切口：建议切口`,
  },
  "refinery.phaseB.eventChain.v1": {
    name: "refinery.phaseB.eventChain.v1",
    version: 1,
    inputVariables: [],
    outputContract: "Markdown list. Each item starts with '- ' and includes 事件, 类型, 内容, 依据.",
    render: () => `${MARS_SYSTEM_PROMPT}
当前：Phase B / 原子事件链。
输出具体的原子事件链。每条必须使用标准 Markdown 列表格式，以 "- " 开头：
- 事件：事件名
  类型：事实/推断/应然
  内容：具体内容
  依据：推断链或证据`,
  },
  "refinery.phaseC.keywordExtraction.v1": {
    name: "refinery.phaseC.keywordExtraction.v1",
    version: 1,
    inputVariables: [],
    outputContract: "Markdown list. Must call search_local_knowledge_base before output.",
    render: () => `${MARS_SYSTEM_PROMPT}
当前：Phase C / 关键词。
【🚨最高级系统指令：绝对动作前置🚨】
在你输出任何具体的关键词之前，你**必须、必须、必须**首先调用 search_local_knowledge_base 工具，检索相关的政治、经济、社会学概念！
严禁直接利用你的通用知识盲目生成！只有在你完成工具调用，并获取到本地文献片段后，你才可以根据文献内容输出以下格式的列表：
- 领域：政治学/经济学/社会学
  词汇：关键词
  解释：概念解释
  扣题：与事件的联系`,
  },
  "refinery.phaseD.finalDraft.v1": {
    name: "refinery.phaseD.finalDraft.v1",
    version: 1,
    inputVariables: ["topicTitle"],
    outputContract:
      "Markdown final draft. With topicTitle, output only a new section starting with ##.",
    render: (input) => renderPhaseD(input),
  },
};

const REFINERY_PHASE_PROMPTS: Record<RefineryPhase, PromptName> = {
  A: "refinery.phaseA.briefingList.v1",
  B: "refinery.phaseB.eventChain.v1",
  C: "refinery.phaseC.keywordExtraction.v1",
  D: "refinery.phaseD.finalDraft.v1",
};

export function getPromptDefinition(name: PromptName): PromptDefinition {
  return PROMPTS[name];
}

export function renderPrompt(name: PromptName, input: Record<string, unknown>): string {
  return PROMPTS[name].render(input);
}

export function renderRefineryPhasePrompt(phase: RefineryPhase, input: PhaseDInput = {}): string {
  return renderPrompt(REFINERY_PHASE_PROMPTS[phase], { ...input });
}
