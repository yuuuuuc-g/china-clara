import { serviceClient } from "@/src/lib/supabase/service";
import {
  createOpenAICompatibleClient,
  resolveAiProviderConfig,
} from "@/src/modules/ai/provider-adapter";
import { pickTranslationProvider } from "@/src/lib/crm/translate";
import type { Locale } from "@/src/i18n/config";

/**
 * 文章级 AI 翻译管线（content 域）。
 * 找出已发布、有中文源文但缺西/英译文的文章，AI 初翻后写入
 * content.article_translations（human_reviewed=false，前台自动显示「AI 初翻待校订」）。
 * 人工校订后把 human_reviewed 置 true 即可，管线不会覆盖已存在的译文行。
 * 提供商链与消息翻译一致（deepseek 主力 + kimi 兜底，见 crm/translate.ts）。
 */

const TARGET_LANGS: readonly Locale[] = ["es", "en"];

const LANG_NAME: Record<Locale, string> = {
  es: "Latin American Spanish",
  en: "English",
  zh: "Simplified Chinese",
};

export interface ArticleTranslationResult {
  articleId: string;
  slug: string;
  lang: Locale;
  status: "translated" | "failed";
  error?: string;
}

export interface TranslateArticlesSummary {
  ok: boolean; // 未配置 Supabase 或 AI 提供商时 false
  reason?: string;
  results: ArticleTranslationResult[];
}

interface RawZhTranslation {
  article_id: string;
  title: string;
  summary: string | null;
  body_md: string;
  article: { slug: string; status: string } | null;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

/** 单次模型调用：把一段文本译到目标语言，保持 Markdown 结构与数字、术语。 */
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
            `You translate China-business editorial content for Latin American importers. ` +
            `Translate the user's text into ${LANG_NAME[targetLang]}. ` +
            `Preserve Markdown structure (headings, lists, blockquotes, emphasis) exactly. ` +
            `Keep numbers, prices, policy terms and proper nouns accurate. ` +
            `Output ONLY the translation.`,
        },
        { role: "user", content: text },
      ],
    },
    { timeout: 120_000 }
  );
  const translated = completion.choices[0]?.message?.content?.trim();
  if (!translated) throw new Error("empty translation from provider");
  return translated;
}

/**
 * 找出缺失的 (article, lang) 组合：已发布 + 有 zh 源文 + 无该语言译文行。
 * 返回按文章聚合的翻译任务，最多 limit 篇文章。
 */
async function listMissing(limit: number): Promise<
  Array<{ articleId: string; slug: string; zh: RawZhTranslation; missing: Locale[] }>
> {
  const client = serviceClient();
  const { data, error } = await client
    .schema("content")
    .from("article_translations")
    .select("article_id, title, summary, body_md, article:articles!inner(slug, status)")
    .eq("lang", "zh")
    .eq("articles.status", "published");
  if (error) throw new Error(`zh translations lookup failed: ${error.message}`);
  const zhRows = (data ?? []) as unknown as RawZhTranslation[];
  if (zhRows.length === 0) return [];

  const { data: existing, error: existingError } = await client
    .schema("content")
    .from("article_translations")
    .select("article_id, lang")
    .in("article_id", zhRows.map((r) => r.article_id));
  if (existingError) {
    throw new Error(`existing translations lookup failed: ${existingError.message}`);
  }
  const have = new Set(
    ((existing ?? []) as unknown as Array<{ article_id: string; lang: string }>).map(
      (r) => `${r.article_id}:${r.lang}`
    )
  );

  const tasks: Array<{ articleId: string; slug: string; zh: RawZhTranslation; missing: Locale[] }> =
    [];
  for (const zh of zhRows) {
    const missing = TARGET_LANGS.filter((lang) => !have.has(`${zh.article_id}:${lang}`));
    if (missing.length > 0) {
      tasks.push({ articleId: zh.article_id, slug: zh.article?.slug ?? "", zh, missing });
      if (tasks.length >= limit) break;
    }
  }
  return tasks;
}

/**
 * 跑一轮翻译：最多处理 limit 篇缺译文章（每篇每缺失语言 3 次模型调用：标题/摘要/正文）。
 * 单个 (文章, 语言) 失败只记录，不影响其余任务。
 */
export async function translateMissingArticles(
  limit = 3
): Promise<TranslateArticlesSummary> {
  if (!isConfigured()) {
    return { ok: false, reason: "supabase_not_configured", results: [] };
  }
  if (!pickTranslationProvider()) {
    return { ok: false, reason: "ai_not_configured", results: [] };
  }

  let tasks;
  try {
    tasks = await listMissing(Math.max(1, limit));
  } catch (err) {
    console.error("[translate-articles] listMissing failed:", err);
    return { ok: false, reason: "lookup_failed", results: [] };
  }

  const client = serviceClient();
  const results: ArticleTranslationResult[] = [];

  for (const task of tasks) {
    for (const lang of task.missing) {
      try {
        const [title, summary, bodyMd] = await Promise.all([
          translateText(task.zh.title, lang),
          task.zh.summary ? translateText(task.zh.summary, lang) : Promise.resolve(null),
          translateText(task.zh.body_md, lang),
        ]);
        // upsert ignoreDuplicates：并发跑或人工先建行时不覆盖既有译文
        const { error } = await client
          .schema("content")
          .from("article_translations")
          .upsert(
            {
              article_id: task.articleId,
              lang,
              title,
              summary,
              body_md: bodyMd,
              human_reviewed: false,
            },
            { onConflict: "article_id,lang", ignoreDuplicates: true }
          );
        if (error) throw new Error(error.message);
        results.push({ articleId: task.articleId, slug: task.slug, lang, status: "translated" });
      } catch (err) {
        console.error(`[translate-articles] ${task.slug} -> ${lang} failed:`, err);
        results.push({
          articleId: task.articleId,
          slug: task.slug,
          lang,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { ok: true, results };
}
