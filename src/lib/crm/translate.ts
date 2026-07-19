import { serviceClient } from "@/src/lib/supabase/service";
import {
  createOpenAICompatibleClient,
  resolveAiProviderConfig,
  type AiProviderId,
} from "@/src/modules/ai/provider-adapter";
import type { Locale } from "@/src/i18n/config";
import { getInquiryForParty, type WriteResult } from "@/src/lib/crm/inquiries";

/**
 * 询盘消息一键翻译（crm 域）。译文缓存在 crm.inquiry_messages 的
 * body_translated / translated_lang（一条消息一次只缓存一种目标语言，
 * 换语言重译时覆盖）。访问控制与消息读取同源：仅当事双方可译。
 */

/** 翻译走文本模型的优先级：deepseek 便宜且中西英质量稳，kimi 兜底。 */
const TRANSLATION_PROVIDERS: readonly AiProviderId[] = ["deepseek", "kimi"];

const PROVIDER_KEY_ENV: Record<string, string> = {
  deepseek: "DEEPSEEK_API_KEY",
  kimi: "KIMI_API_KEY",
};

const LANG_NAME: Record<Locale, string> = {
  es: "Latin American Spanish",
  en: "English",
  zh: "Simplified Chinese",
};

export function pickTranslationProvider(
  env: Readonly<Record<string, string | undefined>> = process.env
): AiProviderId | null {
  return TRANSLATION_PROVIDERS.find((p) => Boolean(env[PROVIDER_KEY_ENV[p]])) ?? null;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

async function translateText(text: string, targetLang: Locale): Promise<string> {
  const provider = pickTranslationProvider();
  if (!provider) throw new Error("no translation provider configured");

  const client = createOpenAICompatibleClient(provider);
  const { defaultModel } = resolveAiProviderConfig(provider);

  const completion = await client.chat.completions.create(
    {
      model: defaultModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            `You translate B2B trade messages between Chinese suppliers and Latin American buyers. ` +
            `Translate the user's message into ${LANG_NAME[targetLang]}. ` +
            `Keep numbers, units, prices, incoterms (FOB/CIF...) and product names exact. ` +
            `Output ONLY the translation, no explanations.`,
        },
        { role: "user", content: text },
      ],
    },
    { timeout: 30_000 }
  );

  const translated = completion.choices[0]?.message?.content?.trim();
  if (!translated) throw new Error("empty translation from provider");
  return translated;
}

export async function translateInquiryMessage(opts: {
  messageId: string;
  viewerProfileId: string;
  targetLang: Locale;
}): Promise<WriteResult<{ text: string; cached: boolean }>> {
  if (!isConfigured()) {
    return { ok: false, code: "not_configured", message: "Supabase is not configured" };
  }
  const client = serviceClient();

  const { data: message, error } = await client
    .schema("crm")
    .from("inquiry_messages")
    .select("id, inquiry_id, body, body_translated, translated_lang")
    .eq("id", opts.messageId)
    .maybeSingle();
  if (error) {
    return { ok: false, code: "message_lookup_failed", message: error.message };
  }
  if (!message) {
    return { ok: false, code: "not_found", message: "Message not found" };
  }

  // 权限与消息读取同源：能看这条询盘才能翻译（不存在与无权统一 not_found）
  const inquiry = await getInquiryForParty({
    id: message.inquiry_id as string,
    viewerProfileId: opts.viewerProfileId,
    lang: opts.targetLang,
  });
  if (!inquiry) {
    return { ok: false, code: "not_found", message: "Message not found" };
  }

  if (message.translated_lang === opts.targetLang && message.body_translated) {
    return { ok: true, text: message.body_translated as string, cached: true };
  }

  if (!pickTranslationProvider()) {
    return { ok: false, code: "ai_not_configured", message: "No translation provider configured" };
  }

  let text: string;
  try {
    text = await translateText(message.body as string, opts.targetLang);
  } catch (err) {
    console.error("[crm.translate] provider call failed:", err);
    return { ok: false, code: "translation_failed", message: "Translation failed" };
  }

  // 缓存失败不影响本次结果，下次点击会重译
  const { error: cacheError } = await client
    .schema("crm")
    .from("inquiry_messages")
    .update({ body_translated: text, translated_lang: opts.targetLang })
    .eq("id", opts.messageId);
  if (cacheError) {
    console.error("[crm.translate] cache write failed:", cacheError.message);
  }

  return { ok: true, text, cached: false };
}
