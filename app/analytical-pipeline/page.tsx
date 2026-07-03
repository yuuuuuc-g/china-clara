"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, CheckCircle2, FileEdit, Minimize2, Save, Sparkles, Database, Sun, RotateCcw, X, Plus, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CyberButton } from "@/src/components/ui/CyberButton";
import { GlassPanel } from "@/src/components/ui/GlassPanel";
import {
  normalizeOptionText,
  optionKey,
  parseLabeledLines,
  phaseMeta,
  phaseOrder,
} from "@/src/modules/refinery/session";
import { useAnalyticalSession } from "@/src/modules/refinery/use-analytical-session";

const initialPrompt =
  "输入一个公共事件、政策争议、市场现象或社会议题，启动推演。";

interface RefineryTipTapDraftProps {
  initialContent: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

function RefineryTipTapDraft({ initialContent, onSave, onCancel }: RefineryTipTapDraftProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start editing your draft...",
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  const handleSave = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    onSave(html);
  }, [editor, onSave]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-2 border-b border-white/10 bg-zinc-950/90 px-4 py-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60 transition hover:border-white/25 hover:text-white/80"
        >
          <Minimize2 size={14} aria-hidden="true" />
          <span>Cancel</span>
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 rounded border border-[#deff9a]/30 bg-[#deff9a]/10 px-3 py-2 text-xs text-[#deff9a] transition hover:border-[#deff9a]/50 hover:bg-[#deff9a]/20"
        >
          <Save size={14} aria-hidden="true" />
          <span>Save & Exit</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="refinery-editor prose prose-invert prose-zinc min-h-full max-w-none p-6 focus:outline-none prose-headings:text-[#deff9a] prose-a:text-[#deff9a]"
        />
      </div>
    </div>
  );
}

interface RefineryMarkdownPreviewProps {
  text: string;
}

function RefineryMarkdownPreview({ text }: RefineryMarkdownPreviewProps) {
  return (
    <div className="prose prose-invert prose-zinc min-h-full max-w-none p-6 prose-headings:text-[#deff9a] prose-a:text-[#deff9a]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || ""}</ReactMarkdown>
    </div>
  );
}

export default function RefineryPage() {
  const router = useRouter();
  const {
    state,
    view,
    topics,
    topicsLoading,
    isLoading,
    completionError,
    saveStatus,
    commands,
  } = useAnalyticalSession();
  const [tagInput, setTagInput] = useState("");

  const {
    sourceText,
    phase,
    draftD,
    selections,
    selectedItems,
    completion,
    customTags,
    selectedTopicId,
    isEditing,
    editInitialContent,
  } = state;
  const {
    isWorkbenchOpen,
    workbenchView,
    optionBlocks,
    selectedKeys,
    priorSelectedKeysForRun,
    nextPhase,
    canRequest,
    showAdvance,
    streamingD,
  } = view;

  const resetFlow = () => {
    commands.resetFlow();
    setTagInput("");
  };

  const handleBackToMars = () => {
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "knowledge-galaxy:close-system" },
        window.location.origin,
      );
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/#mars");
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-zinc-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,255,154,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8 sm:py-8">
        <div className="absolute right-5 top-5 z-30 flex items-center gap-2 sm:right-8 sm:top-8">
          <CyberButton
            variant="secondary"
            className="min-h-8 px-2.5 py-1.5 text-[10px]"
            onClick={handleBackToMars}
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to Mars
          </CyberButton>
          <CyberButton
            variant="secondary"
            className="min-h-8 px-2.5 py-1.5 text-[10px]"
            onClick={resetFlow}
          >
            Reset Flow
          </CyberButton>
        </div>

        <section className="relative flex flex-1 items-start gap-5 overflow-x-hidden">
          <div
            className={`sticky top-5 flex flex-col gap-5 self-start transition-all duration-500 ease-in-out ${
              isWorkbenchOpen
                ? "w-full lg:w-[38%]"
                : "mx-auto w-full max-w-4xl"
            }`}
          >
            <GlassPanel className="rounded p-6 sm:p-10">
              <div className="mb-4 -mt-2 overflow-x-auto">
                <div className="relative flex min-w-[680px] items-center justify-between py-6">
                  <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/15" />
                  <motion.div
                    className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-emerald-400/90 via-cyan-400/85 to-blue-500/90 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                    initial={{ scaleX: 0, opacity: 0.5 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{ transformOrigin: "left center" }}
                  />
                  {phaseOrder.map((p, index) => {
                    const isActive = phase === p;
                    const isEven = index % 2 === 0;
                    const titleToneClass = isEven ? "text-emerald-400" : "text-blue-500";
                    return (
                      <motion.button
                        key={p}
                        type="button"
                        onClick={() => commands.switchPhase(p)}
                        initial={{ opacity: 0, x: -36, y: isEven ? -8 : 8 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ delay: index * 0.12, duration: 0.28, ease: "easeOut" }}
                        className="group relative flex-1 px-4 text-center"
                      >
                        <div
                          className={`absolute left-1/2 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                            isActive
                              ? "bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,1)]"
                              : "bg-cyan-300/70 shadow-[0_0_10px_rgba(59,130,246,0.65)]"
                          }`}
                        />
                        <div className={isEven ? "mb-10" : "mt-10"}>
                          <p
                            className={`text-xs font-bold tracking-[0.18em] transition ${
                              isActive ? titleToneClass : "text-gray-400 group-hover:text-white"
                            }`}
                          >
                            PHASE {p}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-gray-400">
                            {phaseMeta[p].kicker}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold tracking-[0.3em] text-white/35">
                  {phaseMeta[phase].title}
                </p>
                {phase === "A" && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 py-2">
                      <BookOpen size={14} className="text-[#deff9a]/70" />
                      <select
                        value={selectedTopicId ?? "CREATE_NEW_TOPIC"}
                        onChange={(e) => {
                          const value = e.target.value;
                          commands.selectTopic(value === "CREATE_NEW_TOPIC" ? null : value);
                        }}
                        disabled={topicsLoading}
                        className="flex-1 bg-transparent text-sm text-white outline-none"
                      >
                        <option value="CREATE_NEW_TOPIC" className="bg-zinc-900 text-white">
                          + Create New Topic
                        </option>
                        {topics.map((topic) => (
                          <option key={topic.id} value={topic.id} className="bg-zinc-900 text-white">
                            {topic.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={sourceText}
                      onChange={(event) => commands.setSourceText(event.target.value)}
                      placeholder={initialPrompt}
                      className="min-h-32 w-full resize-none rounded border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-[#deff9a]/50 focus:bg-white/[0.06]"
                    />
                  </div>
                )}

                {phase !== "A" && (
                  <div className="mt-3 space-y-2">
                    {selectedKeys.length > 0 ? (
                      <p className="rounded border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/60">
                        已选择 {selectedKeys.length} 项，继续推演下一阶段。
                      </p>
                    ) : (
                      <div className="rounded border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-[#deff9a]/70">
                          上一步选中的内容
                        </p>
                        <div className="space-y-2">
                          {priorSelectedKeysForRun.map((key) => {
                            const priorPhase = phase === "B" ? "A" : phase === "C" ? "B" : phase === "D" ? "C" : null;
                            const itemText = priorPhase
                              ? normalizeOptionText(selectedItems[priorPhase][key])
                              : "";
                            return (
                              <div key={key} className="text-sm leading-relaxed text-white/70">
                                {itemText ? (
                                  <div className="space-y-1">
                                    {itemText.split("\n").map((line, idx) => {
                                      const trimmed = line.trim();
                                      if (!trimmed) return null;
                                      const sep = "：";
                                      const idxSep = trimmed.indexOf(sep);
                                      if (idxSep === -1) {
                                        return <p key={idx} className="text-white/60">{trimmed}</p>;
                                      }
                                      return (
                                        <div key={idx}>
                                          <span className="text-xs font-medium text-[#deff9a]/80">{trimmed.slice(0, idxSep)}</span>
                                          <span className="text-white/70">：{trimmed.slice(idxSep + 1)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-white/40">{key}</span>
                                )}
                              </div>
                            );
                          })}
                          {priorSelectedKeysForRun.length === 0 && (
                            <p className="text-sm text-white/40">暂无选中内容</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <CyberButton
                  className="min-h-12 flex-1"
                  disabled={!canRequest || isLoading}
                  onClick={() => void commands.runPhase(phase)}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  {isLoading ? "REFINING..." : phaseMeta[phase].action}
                </CyberButton>
                {showAdvance && (
                  <CyberButton
                    variant="secondary"
                    className="min-h-12 flex-1"
                    disabled={
                      (phase === "C" ? selections.C.length === 0 && customTags.length === 0 : selectedKeys.length === 0) || isLoading
                    }
                    onClick={commands.advancePhase}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    ENTER PHASE {nextPhase}
                  </CyberButton>
                )}
              </div>
              {completionError && (
                <p className="mt-3 text-xs tracking-wide text-red-300">
                  {completionError.message}
                </p>
              )}
            </GlassPanel>

            {phase !== "A" && (
              <GlassPanel className="rounded p-4 sm:p-5">
                <p className="text-xs font-bold tracking-[0.3em] text-white/35">
                  SELECTION SUMMARY
                </p>
                <div className="mt-3 space-y-2">
                  {selectedKeys.length > 0 ? (
                    <p className="text-sm text-white/60">
                      已选择 {selectedKeys.length} 项，继续推演下一阶段。
                    </p>
                  ) : (
                    <p className="text-sm text-white/40">暂无选中内容</p>
                  )}
                </div>
              </GlassPanel>
            )}
          </div>

          <div
            className={`flex flex-col gap-5 transition-all duration-500 ease-in-out overflow-hidden ${
              isWorkbenchOpen
                ? "w-full lg:w-[62%] opacity-100"
                : "w-0 opacity-0"
            }`}
          >
            {isWorkbenchOpen && (
              <GlassPanel className="relative flex flex-1 flex-col rounded p-4 sm:p-5 h-auto">
                <header className="absolute left-0 right-0 top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-4 pb-4 pt-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold tracking-[0.3em] text-white/35">
                        {phase === "A" && "BRIEFING CANDIDATES"}
                        {phase === "B" && "DIMENSIONAL ANALYSIS"}
                        {phase === "C" && "CONCEPT REFINERY"}
                        {phase === "D" && "DEEP SPACE DRAFT"}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        {phase === "A" && "Select briefings to continue"}
                        {phase === "B" && "Select atomic events to build your chain"}
                        {phase === "C" && "Curate and refine core concepts"}
                        {phase === "D" && (isEditing ? "沉浸式编辑模式" : "Markdown 阅读视图")}
                      </p>
                    </div>
                    {phase === "D" && !isEditing && !streamingD && (
                      <div className="flex items-center gap-2">
                        {saveStatus === "saved" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => router.push("/")}
                              className="flex items-center gap-2 rounded border border-[#deff9a]/30 bg-[#deff9a]/10 px-3 py-2 text-xs text-[#deff9a] transition hover:border-[#deff9a]/50 hover:bg-[#deff9a]/20"
                              title="返回太阳主控台"
                            >
                              <Sun size={14} aria-hidden="true" />
                              <span className="hidden sm:inline">Back to Sun</span>
                            </button>
                            <button
                              type="button"
                              onClick={resetFlow}
                              className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60 transition hover:border-[#deff9a]/40 hover:text-[#deff9a]"
                              title="开启新分析"
                            >
                              <RotateCcw size={14} aria-hidden="true" />
                              <span className="hidden sm:inline">New Session</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={commands.persistToDatabase}
                              disabled={saveStatus === "saving"}
                              className={`flex items-center gap-2 rounded border px-3 py-2 text-xs transition ${
                                saveStatus === "error"
                                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                                  : "border-white/10 bg-white/[0.04] text-white/60 hover:border-[#deff9a]/40 hover:text-[#deff9a]"
                              }`}
                              title="保存到数据库"
                            >
                              <Database size={14} aria-hidden="true" />
                              <span className="hidden sm:inline">
                                {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Retry" : "Save to Archive"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={commands.enterEditMode}
                              className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60 transition hover:border-[#deff9a]/40 hover:text-[#deff9a]"
                              title="进入编辑模式"
                            >
                              <FileEdit size={14} aria-hidden="true" />
                              <span className="hidden sm:inline">Edit Document</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </header>

                <div className="mt-[4.5rem] rounded-lg border border-white/5 bg-zinc-900/50">
                  {(phase === "A" || phase === "B") && workbenchView === "cards" && (
                    <div className="flex flex-col gap-3 p-4">
                      {optionBlocks.map((block, index) => {
                        const key = optionKey(phase, index);
                        const checked = selectedKeys.includes(key);
                        const optionText = normalizeOptionText(block);
                        const rows = parseLabeledLines(optionText);

                        return (
                          <label
                            key={key}
                            className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-left transition ${
                              checked
                                ? "border-[#deff9a]/55 bg-[#deff9a]/10 shadow-[0_0_0_1px_rgba(222,255,154,0.12)]"
                                : "border-white/10 bg-zinc-950/50 hover:border-white/25"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => commands.toggleSelection(key, optionText)}
                              className="mt-1 size-4 shrink-0 rounded border border-white/30 bg-zinc-900 text-[#deff9a] accent-[#deff9a]"
                            />
                            <div className="min-w-0 flex-1 space-y-2">
                              {rows.map((row, rowIndex) =>
                                row.label ? (
                                  <div key={`${key}-line-${rowIndex}`}>
                                    <p className="text-xs font-semibold tracking-wide text-[#deff9a]/90">
                                      {row.label}
                                    </p>
                                    <p className="text-sm leading-relaxed text-white/85">
                                      {row.value || "—"}
                                    </p>
                                  </div>
                                ) : (
                                  <p
                                    key={`${key}-line-${rowIndex}`}
                                    className="text-sm leading-relaxed text-white/75"
                                  >
                                    {row.value}
                                  </p>
                                ),
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {phase === "C" && workbenchView === "tags" && (
                    <div className="flex flex-col gap-6 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {optionBlocks.map((block, index) => {
                          const key = optionKey(phase, index);
                          const checked = selectedKeys.includes(key);
                          const optionText = normalizeOptionText(block);
                          const rows = parseLabeledLines(optionText);

                          return (
                            <label
                              key={key}
                              className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left transition ${
                                checked
                                  ? "border-[#deff9a]/55 bg-[#deff9a]/10 shadow-[0_0_0_1px_rgba(222,255,154,0.12)]"
                                  : "border-white/10 bg-zinc-950/50 hover:border-white/25"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => commands.toggleSelection(key, optionText)}
                                className="hidden"
                              />
                              <div className="space-y-1">
                                {rows.map((row, rowIndex) => (
                                  <div key={rowIndex}>
                                    {row.label && (
                                      <span className="mr-2 text-xs font-semibold text-[#deff9a]/80">
                                        {row.label}:
                                      </span>
                                    )}
                                    <span className="text-sm text-white/80">{row.value}</span>
                                  </div>
                                ))}
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <div className="mb-3 flex flex-wrap gap-2">
                          {customTags.map((tag) => (
                            <span
                              key={`custom-${tag}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#deff9a]/30 bg-[#deff9a]/5 px-3 py-1.5 text-sm text-[#deff9a]/90"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => commands.removeCustomTag(tag)}
                                className="ml-0.5 rounded-full p-0.5 text-[#deff9a]/60 transition hover:bg-[#deff9a]/15 hover:text-[#deff9a]"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && tagInput.trim()) {
                                e.preventDefault();
                                const newTag = tagInput.trim();
                                commands.addCustomTag(newTag);
                                setTagInput("");
                              }
                            }}
                            placeholder="添加 AI 遗漏的核心概念..."
                            className="flex-1 rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#deff9a]/50 focus:bg-white/[0.06]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (tagInput.trim()) {
                                const newTag = tagInput.trim();
                                commands.addCustomTag(newTag);
                                setTagInput("");
                              }
                            }}
                            disabled={!tagInput.trim()}
                            className="inline-flex items-center gap-1.5 rounded border border-[#deff9a]/30 bg-[#deff9a]/10 px-3 py-2 text-sm text-[#deff9a] transition hover:border-[#deff9a]/50 hover:bg-[#deff9a]/20 disabled:opacity-40"
                          >
                            <Plus size={14} />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {workbenchView === "editor" && (
                    isEditing ? (
                      <RefineryTipTapDraft
                        initialContent={editInitialContent}
                        onSave={commands.saveDraft}
                        onCancel={commands.cancelEdit}
                      />
                    ) : (
                      <RefineryMarkdownPreview text={streamingD ? completion : draftD} />
                    )
                  )}
                </div>
              </GlassPanel>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
