"use client";

import { useState, useTransition } from "react";
import type { Locale } from "@/src/i18n/config";
import { translateMessageAction } from "../actions";

/**
 * 消息气泡下的一键翻译：首次点击调 server action（AI 翻译 + 落库缓存），
 * 之后在「显示/收起译文」间切换。SSR 已带缓存译文时无需再请求。
 */
export interface TranslationLabels {
  translate: string;
  hideTranslation: string;
  translating: string;
  translationFailed: string;
  machineTranslated: string;
}

export function MessageTranslation({
  messageId,
  locale,
  initialText,
  labels,
}: {
  messageId: string;
  locale: Locale;
  /** 缓存命中（translated_lang 与界面语言一致）时 SSR 直接传入译文。 */
  initialText: string | null;
  labels: TranslationLabels;
}) {
  const [text, setText] = useState<string | null>(initialText);
  const [visible, setVisible] = useState(Boolean(initialText));
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    if (text) {
      setVisible(!visible);
      return;
    }
    setFailed(false);
    startTransition(async () => {
      const result = await translateMessageAction(messageId, locale);
      if (result.ok && result.text) {
        setText(result.text);
        setVisible(true);
      } else {
        setFailed(true);
      }
    });
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-[11px] font-medium underline decoration-dotted underline-offset-2 opacity-70 transition hover:opacity-100 disabled:opacity-40"
      >
        {pending ? labels.translating : visible ? labels.hideTranslation : labels.translate}
      </button>

      {failed && (
        <p role="alert" className="mt-1 text-[11px] text-red-600 dark:text-red-400">
          {labels.translationFailed}
        </p>
      )}

      {visible && text && (
        <div className="mt-2 border-t border-current/15 pt-2">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide opacity-50">
            {labels.machineTranslated}
          </p>
        </div>
      )}
    </div>
  );
}
