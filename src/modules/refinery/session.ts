import type { RefineryPhase } from "@/src/modules/refinery/phase";
import { MAX_REFINERY_PROMPT_CHARS } from "@/src/modules/refinery/prompt-limits";

export type WorkbenchView = "cards" | "tags" | "editor";
export type NonFinalRefineryPhase = Exclude<RefineryPhase, "D">;
export type PhaseSelections = Record<RefineryPhase, string[]>;
export type AnalyticalArchives = Record<NonFinalRefineryPhase, string>;
export type SelectedItemsByPhase = Record<NonFinalRefineryPhase, Record<string, string>>;

export interface AnalyticalSessionState {
  sourceText: string;
  phase: RefineryPhase;
  archives: AnalyticalArchives;
  draftD: string;
  selections: PhaseSelections;
  selectedItems: SelectedItemsByPhase;
  pendingPhase: RefineryPhase | null;
  completion: string;
  customTags: string[];
  selectedTopicId: string | null;
  isEditing: boolean;
  editInitialContent: string;
}

export interface TopicReference {
  id: string;
  title: string;
}

export interface PhaseRunRequest {
  prompt: string;
  requestBody: {
    phase: RefineryPhase;
    selectedTopicId?: string;
    topicTitle?: string;
  };
}

export interface AnalyticalSessionView {
  phaseHasVisibleWorkbenchOutput: boolean;
  isWorkbenchOpen: boolean;
  workbenchView: WorkbenchView;
  leftArchiveText: string;
  optionBlocks: string[];
  selectedKeys: string[];
  priorSelectedKeysForRun: string[];
  nextPhase: RefineryPhase | null;
  canRequest: boolean;
  showAdvance: boolean;
  streamingD: boolean;
}

export const phaseOrder: RefineryPhase[] = ["A", "B", "C", "D"];

const PROMPT_TRUNCATION_NOTICE = "[内容已截断]";

export const phaseMeta: Record<
  RefineryPhase,
  { title: string; kicker: string; action: string }
> = {
  A: {
    title: "Briefing List",
    kicker: "查 Briefing",
    action: "GENERATE BRIEFING",
  },
  B: {
    title: "Atomic Events",
    kicker: "选原子事件",
    action: "BUILD EVENT CHAIN",
  },
  C: {
    title: "Keywords",
    kicker: "选关键词",
    action: "DISTILL KEYWORDS",
  },
  D: {
    title: "Final Draft",
    kicker: "生成正文",
    action: "WRITE DRAFT",
  },
};

const emptyArchives: AnalyticalArchives = {
  A: "",
  B: "",
  C: "",
};

export function createInitialAnalyticalSessionState(): AnalyticalSessionState {
  return {
    sourceText: "",
    phase: "A",
    archives: { ...emptyArchives },
    draftD: "",
    selections: {
      A: [],
      B: [],
      C: [],
      D: [],
    },
    selectedItems: {
      A: {},
      B: {},
      C: {},
    },
    pendingPhase: null,
    completion: "",
    customTags: [],
    selectedTopicId: null,
    isEditing: false,
    editInitialContent: "",
  };
}

export type AnalyticalSessionAction =
  | { type: "setSourceText"; sourceText: string }
  | { type: "setSelectedTopicId"; topicId: string | null }
  | { type: "switchPhase"; phase: RefineryPhase }
  | { type: "toggleSelection"; key: string; blockFullText: string }
  | { type: "startPhaseRun"; phase: RefineryPhase }
  | { type: "setCompletion"; completion: string }
  | { type: "finishPhaseRun"; phase: RefineryPhase; text: string }
  | { type: "clearPendingPhase" }
  | { type: "advancePhase" }
  | { type: "reset" }
  | { type: "enterEditMode" }
  | { type: "saveDraft"; html: string }
  | { type: "cancelEdit" }
  | { type: "addCustomTag"; tag: string }
  | { type: "removeCustomTag"; tag: string };

export function analyticalSessionReducer(
  state: AnalyticalSessionState,
  action: AnalyticalSessionAction,
): AnalyticalSessionState {
  switch (action.type) {
    case "setSourceText":
      return { ...state, sourceText: action.sourceText };
    case "setSelectedTopicId":
      return { ...state, selectedTopicId: action.topicId };
    case "switchPhase":
      return {
        ...state,
        phase: action.phase,
        isEditing: false,
        completion: action.phase === "D" ? state.completion : "",
      };
    case "toggleSelection":
      return toggleSelectionForCurrentPhase(state, action.key, action.blockFullText);
    case "startPhaseRun":
      return { ...state, pendingPhase: action.phase, completion: "" };
    case "setCompletion":
      return { ...state, completion: action.completion };
    case "finishPhaseRun":
      if (action.phase === "D") {
        return { ...state, draftD: action.text, pendingPhase: null };
      }
      return {
        ...state,
        archives: { ...state.archives, [action.phase]: action.text },
        pendingPhase: null,
      };
    case "clearPendingPhase":
      return { ...state, pendingPhase: null };
    case "advancePhase": {
      const nextPhase = getNextPhase(state.phase);
      if (!nextPhase) {
        return state;
      }
      return { ...state, phase: nextPhase, isEditing: false, completion: "" };
    }
    case "reset":
      return createInitialAnalyticalSessionState();
    case "enterEditMode":
      return {
        ...state,
        editInitialContent: state.draftD || state.completion,
        isEditing: true,
      };
    case "saveDraft":
      return { ...state, draftD: action.html, isEditing: false };
    case "cancelEdit":
      return { ...state, isEditing: false };
    case "addCustomTag":
      return addCustomTag(state, action.tag);
    case "removeCustomTag":
      return {
        ...state,
        customTags: state.customTags.filter((tag) => tag !== action.tag),
      };
    default:
      return state;
  }
}

export function getNextPhase(phase: RefineryPhase): RefineryPhase | null {
  const currentIndex = phaseOrder.indexOf(phase);
  return phaseOrder[currentIndex + 1] ?? null;
}

export function optionKey(phase: NonFinalRefineryPhase, index: number): string {
  return `${phase}:${index}`;
}

export function extractOptionBlocks(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let currentBlockLines: string[] = [];

  for (const line of lines) {
    const trimmedStart = line.trimStart();
    const isBullet = trimmedStart.startsWith("- ") || trimmedStart.startsWith("* ");
    const orderedMarkerEnd = trimmedStart.indexOf(". ");
    const isOrdered =
      orderedMarkerEnd > 0 &&
      /^\d+$/.test(trimmedStart.slice(0, orderedMarkerEnd));
    const markerLength = isBullet ? 2 : isOrdered ? orderedMarkerEnd + 2 : 0;

    if (markerLength > 0) {
      if (currentBlockLines.length > 0) {
        const blockContent = currentBlockLines.join("\n").trim();
        if (blockContent.length > 0) {
          blocks.push(blockContent);
        }
      }
      currentBlockLines = [trimmedStart.slice(markerLength)];
    } else if (currentBlockLines.length > 0) {
      currentBlockLines.push(line);
    }
  }

  if (currentBlockLines.length > 0) {
    const blockContent = currentBlockLines.join("\n").trim();
    if (blockContent.length > 0) {
      blocks.push(blockContent);
    }
  }

  return blocks;
}

export function sanitizeStreamingOutput(text: string): string {
  if (!text) {
    return "";
  }

  const withoutXmlToolCalls = text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, "");

  const filteredLines = withoutXmlToolCalls
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return true;
      }
      return !(
        trimmed.includes('"toolName"') ||
        trimmed.includes('"toolCallId"') ||
        trimmed.includes('"type":"tool-call"') ||
        trimmed.includes('"type": "tool-call"') ||
        trimmed.includes('"type":"tool-result"') ||
        trimmed.includes('"type": "tool-result"')
      );
    });

  return filteredLines.join("\n").trim();
}

export function parseLabeledLines(block: string): { label: string; value: string }[] {
  return block.split(/\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return [];
    }
    const sep = "：";
    const idx = trimmed.indexOf(sep);
    if (idx === -1) {
      return [{ label: "", value: trimmed }];
    }
    return [
      {
        label: trimmed.slice(0, idx).trim(),
        value: trimmed.slice(idx + sep.length).trim(),
      },
    ];
  });
}

export function normalizeOptionText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return "";
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";

  return [
    title ? `标题：${title}` : "",
    summary ? `摘要：${summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function deriveAnalyticalSessionView(
  state: AnalyticalSessionState,
  isLoading: boolean,
): AnalyticalSessionView {
  const phaseHasVisibleWorkbenchOutput =
    state.phase !== "D" &&
    ((state.pendingPhase === state.phase && isLoading) ||
      state.archives[state.phase].length > 0);

  const isWorkbenchOpen = state.phase !== "A" || phaseHasVisibleWorkbenchOutput;
  const workbenchView: WorkbenchView =
    state.phase === "D" ? "editor" : state.phase === "C" ? "tags" : "cards";
  const leftArchiveText =
    state.phase === "D"
      ? ""
      : state.pendingPhase === state.phase && isLoading
        ? sanitizeStreamingOutput(state.completion)
        : state.archives[state.phase];
  const optionBlocks = state.phase === "D" ? [] : extractOptionBlocks(leftArchiveText);
  const selectedKeys = state.selections[state.phase];
  const priorSelectedKeysForRun = getPriorSelectedKeysForRun(state);
  const nextPhase = getNextPhase(state.phase);
  const canRequest = canRequestPhaseRun(state, priorSelectedKeysForRun);
  const showAdvance =
    nextPhase !== null &&
    state.phase !== "D" &&
    !isLoading &&
    optionBlocks.length > 0;

  return {
    phaseHasVisibleWorkbenchOutput,
    isWorkbenchOpen,
    workbenchView,
    leftArchiveText,
    optionBlocks,
    selectedKeys,
    priorSelectedKeysForRun,
    nextPhase,
    canRequest,
    showAdvance,
    streamingD: state.phase === "D" && state.pendingPhase === "D" && isLoading,
  };
}

export function buildPhaseRunRequest(
  state: AnalyticalSessionState,
  topics: TopicReference[],
  targetPhase: RefineryPhase,
): PhaseRunRequest {
  const requestBody: PhaseRunRequest["requestBody"] = {
    phase: targetPhase,
  };

  if (targetPhase === "D" && state.selectedTopicId) {
    const existingTopic = topics.find((topic) => topic.id === state.selectedTopicId);
    if (existingTopic) {
      requestBody.selectedTopicId = state.selectedTopicId;
      requestBody.topicTitle = existingTopic.title;
    }
  }

  return {
    prompt: buildPhasePrompt({
      phase: targetPhase,
      sourceText: state.sourceText.trim(),
      archives: state.archives,
      selectedItems: state.selectedItems,
      customTags: state.customTags,
    }),
    requestBody,
  };
}

export function getPriorSelectedKeysForRun(state: AnalyticalSessionState): string[] {
  if (state.phase === "B") {
    return state.selections.A;
  }
  if (state.phase === "C") {
    return state.selections.B;
  }
  if (state.phase === "D") {
    return state.selections.C;
  }
  return [];
}

export function buildPhasePrompt({
  phase,
  sourceText,
  archives,
  selectedItems,
  customTags,
}: {
  phase: RefineryPhase;
  sourceText: string;
  archives: AnalyticalArchives;
  selectedItems: SelectedItemsByPhase;
  customTags: string[];
}) {
  const selectedBriefings = joinSelectedItems(selectedItems.A);
  const selectedEvents = joinSelectedItems(selectedItems.B);
  const selectedKeywords = joinSelectedItems(selectedItems.C);
  const allKeywords = [selectedKeywords, ...customTags].filter(Boolean).join("\n");

  if (phase === "A") {
    return renderBoundedPrompt([
      { heading: "原始议题：", body: sourceText, weight: 1 },
    ]);
  }

  if (phase === "B") {
    return renderBoundedPrompt([
      { heading: "原始议题：", body: sourceText, weight: 1 },
      { heading: "Phase A 完整输出：", body: archives.A, weight: 3 },
      {
        heading: "用户选中的 Briefing（选项原文）：",
        body: selectedBriefings,
        weight: 2,
      },
    ]);
  }

  if (phase === "C") {
    return renderBoundedPrompt([
      { heading: "原始议题：", body: sourceText, weight: 1 },
      {
        heading: "用户选中的 Briefing（选项原文）：",
        body: selectedBriefings,
        weight: 2,
      },
      { heading: "Phase B 完整输出：", body: archives.B, weight: 3 },
      {
        heading: "用户选中的原子事件（选项原文）：",
        body: selectedEvents,
        weight: 2,
      },
    ]);
  }

  return renderBoundedPrompt([
    { heading: "原始议题：", body: sourceText, weight: 1 },
    {
      heading: "用户选中的 Briefing（选项原文）：",
      body: selectedBriefings,
      weight: 2,
    },
    {
      heading: "用户选中的原子事件（选项原文）：",
      body: selectedEvents,
      weight: 2,
    },
    { heading: "Phase C 完整输出：", body: archives.C, weight: 3 },
    {
      heading: "用户选中的关键词（选项原文）：",
      body: allKeywords,
      weight: 3,
    },
  ]);
}

interface PromptSection {
  heading: string;
  body: string;
  weight: number;
}

function renderBoundedPrompt(
  sections: PromptSection[],
  maxChars = MAX_REFINERY_PROMPT_CHARS,
): string {
  const fullPrompt = renderPromptSections(sections);
  if (fullPrompt.length <= maxChars) {
    return fullPrompt;
  }

  const overheadChars = sections.reduce((total, section, index) => {
    const separatorChars = index === 0 ? 0 : 2;
    return total + separatorChars + section.heading.length + 1;
  }, 0);
  const bodyBudget = maxChars - overheadChars;
  if (bodyBudget <= 0) {
    return fullPrompt.slice(0, maxChars);
  }

  const allocations = allocatePromptBodyChars(sections, bodyBudget);
  const compactedSections = sections.map((section, index) => ({
    ...section,
    body: truncatePromptSection(section.body, allocations[index] ?? 0),
  }));
  const compactedPrompt = renderPromptSections(compactedSections);

  if (compactedPrompt.length <= maxChars) {
    return compactedPrompt;
  }

  return compactedPrompt.slice(0, maxChars);
}

function renderPromptSections(sections: PromptSection[]): string {
  return sections
    .map((section) => `${section.heading}\n${section.body}`)
    .join("\n\n");
}

function allocatePromptBodyChars(
  sections: PromptSection[],
  bodyBudget: number,
): number[] {
  const allocations = sections.map(() => 0);
  const expandableIndexes = sections
    .map((section, index) => ({ index, section }))
    .filter(({ section }) => section.body.length > 0);
  const totalWeight = expandableIndexes.reduce(
    (total, { section }) => total + section.weight,
    0,
  );

  if (totalWeight <= 0) {
    return allocations;
  }

  let remaining = bodyBudget;

  for (const { index, section } of expandableIndexes) {
    const allocation = Math.min(
      section.body.length,
      Math.floor((bodyBudget * section.weight) / totalWeight),
    );
    allocations[index] = allocation;
    remaining -= allocation;
  }

  while (remaining > 0) {
    const nextIndex = expandableIndexes.find(
      ({ index, section }) => allocations[index] < section.body.length,
    )?.index;
    if (nextIndex === undefined) {
      break;
    }
    allocations[nextIndex] += 1;
    remaining -= 1;
  }

  return allocations;
}

function truncatePromptSection(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  if (maxChars <= PROMPT_TRUNCATION_NOTICE.length) {
    return PROMPT_TRUNCATION_NOTICE.slice(0, maxChars);
  }

  const contentBudget = maxChars - PROMPT_TRUNCATION_NOTICE.length;
  const headChars = Math.ceil(contentBudget * 0.65);
  const tailChars = contentBudget - headChars;

  return [
    text.slice(0, headChars),
    PROMPT_TRUNCATION_NOTICE,
    tailChars > 0 ? text.slice(-tailChars) : "",
  ].join("");
}

function canRequestPhaseRun(
  state: AnalyticalSessionState,
  priorSelectedKeysForRun: string[],
) {
  if (state.phase === "A") {
    return state.sourceText.trim().length > 0;
  }

  if (state.phase === "D") {
    return (
      (priorSelectedKeysForRun.length > 0 || state.customTags.length > 0) &&
      state.archives.C.length > 0
    );
  }

  if (state.phase === "B") {
    return priorSelectedKeysForRun.length > 0 && state.archives.A.length > 0;
  }

  if (state.phase === "C") {
    return priorSelectedKeysForRun.length > 0 && state.archives.B.length > 0;
  }

  return false;
}

function toggleSelectionForCurrentPhase(
  state: AnalyticalSessionState,
  key: string,
  blockFullText: string,
): AnalyticalSessionState {
  if (state.phase === "D") {
    return state;
  }

  const phase = state.phase;
  const phaseSelections = state.selections[phase];
  const adding = !phaseSelections.includes(key);
  const nextSelections = adding
    ? [...phaseSelections, key]
    : phaseSelections.filter((item) => item !== key);
  const nextMap = { ...state.selectedItems[phase] };

  if (adding) {
    nextMap[key] = blockFullText;
  } else {
    delete nextMap[key];
  }

  return {
    ...state,
    selections: {
      ...state.selections,
      [phase]: nextSelections,
    },
    selectedItems: {
      ...state.selectedItems,
      [phase]: nextMap,
    },
  };
}

function addCustomTag(
  state: AnalyticalSessionState,
  rawTag: string,
): AnalyticalSessionState {
  const tag = rawTag.trim();
  if (!tag) {
    return state;
  }

  if (
    state.customTags.includes(tag) ||
    Object.values(state.selectedItems.C).includes(tag)
  ) {
    return state;
  }

  return { ...state, customTags: [...state.customTags, tag] };
}

function joinSelectedItems(items: Record<string, unknown>): string {
  return Object.entries(items)
    .sort(([ka], [kb]) => {
      const ia = Number.parseInt(ka.split(":")[1] ?? "0", 10);
      const ib = Number.parseInt(kb.split(":")[1] ?? "0", 10);
      return ia - ib;
    })
    .map(([, text]) => normalizeOptionText(text))
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
