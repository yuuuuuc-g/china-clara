import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";
import { getSessionProfile } from "@/src/lib/auth/session";
import { getPublishedPost } from "@/src/lib/community/queries";
import { getPostEngagement, listComments } from "@/src/lib/community/interactions";
import { formatDate } from "@/src/lib/format";
import { LikeButton } from "./LikeButton";
import { addCommentAction } from "../actions";

/**
 * 社区文章详情 + 互动（点赞/评论）。
 * likedByViewer 是按用户状态，ISR 会把某个用户的缓存发给所有人 —— 必须动态渲染。
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = await getPublishedPost({ slug });
  if (!post) return {};
  return { title: post.title };
}

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const post = await getPublishedPost({ slug });
  if (!post) notFound();

  const session = await getSessionProfile();
  const [engagement, comments] = await Promise.all([
    getPostEngagement({ postId: post.id, viewerProfileId: session?.userId ?? null }),
    listComments(post.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href={`/${locale}/community`}
        className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white"
      >
        ← {dict.community.backToList}
      </Link>

      <article className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
          {post.authorName && <span>{post.authorName}</span>}
          {post.authorName && post.publishedAt && <span aria-hidden>·</span>}
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          )}
          {(post.authorName || post.publishedAt) && <span aria-hidden>·</span>}
          <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500 dark:border-neutral-700">
            {post.lang}
          </span>
        </div>

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.bodyMd}</ReactMarkdown>
        </div>
      </article>

      <div className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <LikeButton
          postId={post.id}
          locale={locale}
          slug={post.slug}
          initialCount={engagement.likeCount}
          initialLiked={engagement.likedByViewer}
          label={dict.community.like}
        />
      </div>

      <section id="comments" className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.community.comments}
          <span className="ml-2 text-sm font-normal text-neutral-400 tabular-nums">
            {comments.length}
          </span>
        </h2>

        {comments.length === 0 ? (
          <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
            {dict.community.commentsEmpty}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {comment.body}
                </p>
                <p className="mt-2 text-xs text-neutral-400">
                  {comment.authorName ? `${comment.authorName} · ` : null}
                  {formatDate(comment.createdAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {session ? (
          <form action={addCommentAction} className="mt-6">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="slug" value={post.slug} />
            <textarea
              name="body"
              required
              minLength={2}
              maxLength={2000}
              rows={3}
              placeholder={dict.community.commentPlaceholder}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
            <button
              type="submit"
              className="mt-3 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {dict.community.commentSubmit}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
            <Link
              href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/community/${post.slug}`)}`}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {dict.community.loginToInteract}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
