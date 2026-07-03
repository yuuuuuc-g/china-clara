"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { parseDomainSseFrame } from "@/src/lib/ai-domain-events";
import {
  createSupabaseArchivePersistence,
  type ArchiveTopic,
} from "@/src/lib/archive-persistence";
import { createClient } from "@/src/lib/supabase/client";
import type { RefineryPhase } from "@/src/modules/refinery/phase";
import {
  analyticalSessionReducer,
  buildPhaseRunRequest,
  createInitialAnalyticalSessionState,
  deriveAnalyticalSessionView,
  sanitizeStreamingOutput,
  type AnalyticalSessionState,
  type AnalyticalSessionView,
} from "@/src/modules/refinery/session";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface AnalyticalSessionCommands {
  setSourceText: (sourceText: string) => void;
  selectTopic: (topicId: string | null) => void;
  switchPhase: (phase: RefineryPhase) => void;
  toggleSelection: (key: string, blockFullText: string) => void;
  runPhase: (phase: RefineryPhase) => Promise<void>;
  advancePhase: () => void;
  resetFlow: () => void;
  enterEditMode: () => void;
  saveDraft: (html: string) => void;
  cancelEdit: () => void;
  persistToDatabase: () => Promise<void>;
  addCustomTag: (tag: string) => void;
  removeCustomTag: (tag: string) => void;
}

export interface AnalyticalSessionController {
  state: AnalyticalSessionState;
  view: AnalyticalSessionView;
  topics: ArchiveTopic[];
  topicsLoading: boolean;
  isLoading: boolean;
  completionError: Error | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  commands: AnalyticalSessionCommands;
}

export function useAnalyticalSession(): AnalyticalSessionController {
  const [state, dispatch] = useReducer(
    analyticalSessionReducer,
    undefined,
    createInitialAnalyticalSessionState,
  );
  const [topics, setTopics] = useState<ArchiveTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [completionError, setCompletionError] = useState<Error | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchTopics() {
      console.log("[Topics] Starting to load topics...");
      try {
        const archivePersistence = createSupabaseArchivePersistence(createClient());
        const nextTopics = await archivePersistence.listTopics();
        if (active) {
          console.log("[Topics] Successfully loaded topics:", nextTopics.length, nextTopics);
          setTopics(nextTopics);
        }
      } catch (error) {
        console.error("[Topics] Unexpected error while loading topics:", error);
      } finally {
        if (active) {
          setTopicsLoading(false);
        }
      }
    }

    void fetchTopics();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  const view = useMemo(
    () => deriveAnalyticalSessionView(state, isLoading),
    [state, isLoading],
  );

  const completePrompt = useCallback(
    async (
      prompt: string,
      requestBody: Record<string, unknown>,
    ): Promise<string> => {
      setIsLoading(true);
      setCompletionError(null);

      let accumulatedText = "";

      try {
        const response = await fetch("/api/analytical-pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            ...requestBody,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "Analytical pipeline request failed.");
        }

        if (!response.body) {
          throw new Error("Analytical pipeline stream is empty.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const applyFrame = (frame: string) => {
          const parsedFrame = parseDomainSseFrame(frame);
          if (!parsedFrame) {
            return;
          }

          const event = parsedFrame.event;
          if (event.type === "generation.delta") {
            accumulatedText += event.text;
            dispatch({ type: "setCompletion", completion: accumulatedText });
            return;
          }

          if (event.type === "generation.finished") {
            if (typeof event.text === "string") {
              accumulatedText = event.text;
              dispatch({ type: "setCompletion", completion: event.text });
            }
            return;
          }

          if (event.type === "generation.failed") {
            throw new Error(event.message);
          }
        };

        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";

            frames.forEach(applyFrame);
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
          applyFrame(buffer);
        }

        console.info("[Mars Crucible] completion finished", {
          chars: accumulatedText.length,
        });

        return accumulatedText;
      } catch (error) {
        const safeError =
          error instanceof Error
            ? error
            : new Error("Analytical pipeline request failed.");
        setCompletionError(safeError);
        console.error("[Mars Crucible] completion error", safeError);
        throw safeError;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const runPhase = useCallback(
    async (targetPhase: RefineryPhase) => {
      if (isLoading || !view.canRequest) {
        return;
      }

      const { prompt, requestBody } = buildPhaseRunRequest(state, topics, targetPhase);
      dispatch({ type: "startPhaseRun", phase: targetPhase });

      try {
        const result = await completePrompt(prompt, requestBody);
        const finalText = sanitizeStreamingOutput(result ?? "");
        dispatch({ type: "finishPhaseRun", phase: targetPhase, text: finalText });
      } catch (error) {
        console.error("[Mars Crucible] runPhase failed", {
          targetPhase,
          error,
        });
        dispatch({ type: "clearPendingPhase" });
      }
    },
    [completePrompt, isLoading, state, topics, view.canRequest],
  );

  const persistToDatabase = useCallback(async () => {
    const content = (state.draftD || state.completion).trim();
    if (!content) {
      console.warn("[Persist] Content is empty, aborting save.");
      return;
    }

    console.log("[Persist] Starting save. selectedTopicId:", state.selectedTopicId);
    setSaveStatus("saving");
    setSaveError(null);

    try {
      const archivePersistence = createSupabaseArchivePersistence(createClient());
      const result = await archivePersistence.saveAnalyticalDocument({
        content,
        sourceIssue: state.sourceText,
        archives: state.archives,
        selectedItems: state.selectedItems,
        customTags: state.customTags,
        topicId: state.selectedTopicId,
      });

      if (result.type === "created") {
        setTopics((prev) => [result.topic, ...prev]);
        dispatch({ type: "setSelectedTopicId", topicId: result.topic.id });
      }

      console.log("[Persist] Save complete.", result);
      setSaveStatus("saved");
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
      saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("[Persist] Unexpected error:", err);
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Unknown error occurred");
    }
  }, [state]);

  const commands = useMemo<AnalyticalSessionCommands>(
    () => ({
      setSourceText: (sourceText) => {
        dispatch({ type: "setSourceText", sourceText });
      },
      selectTopic: (topicId) => {
        dispatch({ type: "setSelectedTopicId", topicId });
      },
      switchPhase: (phase) => {
        dispatch({ type: "switchPhase", phase });
      },
      toggleSelection: (key, blockFullText) => {
        dispatch({ type: "toggleSelection", key, blockFullText });
      },
      runPhase,
      advancePhase: () => {
        dispatch({ type: "advancePhase" });
      },
      resetFlow: () => {
        dispatch({ type: "reset" });
        setSaveStatus("idle");
        setSaveError(null);
      },
      enterEditMode: () => {
        dispatch({ type: "enterEditMode" });
      },
      saveDraft: (html) => {
        dispatch({ type: "saveDraft", html });
      },
      cancelEdit: () => {
        dispatch({ type: "cancelEdit" });
      },
      persistToDatabase,
      addCustomTag: (tag) => {
        dispatch({ type: "addCustomTag", tag });
      },
      removeCustomTag: (tag) => {
        dispatch({ type: "removeCustomTag", tag });
      },
    }),
    [persistToDatabase, runPhase],
  );

  return {
    state,
    view,
    topics,
    topicsLoading,
    isLoading,
    completionError,
    saveStatus,
    saveError,
    commands,
  };
}
