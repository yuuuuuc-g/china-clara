"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLikeAction } from "../actions";

/**
 * 点赞开关按钮。已登录：调 server action 切换并就地更新计数;
 * 未登录：action 返回 unauthenticated,跳登录并回跳本帖。
 */
export function LikeButton({
  postId,
  locale,
  slug,
  initialCount,
  initialLiked,
  label,
}: {
  postId: string;
  locale: string;
  slug: string;
  initialCount: number;
  initialLiked: boolean;
  label: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    startTransition(async () => {
      const result = await toggleLikeAction(postId, locale, slug);
      if (result.ok && result.liked !== undefined && result.likeCount !== undefined) {
        setLiked(result.liked);
        setCount(result.likeCount);
      } else if (result.code === "unauthenticated") {
        router.push(`/${locale}/login?next=${encodeURIComponent(`/${locale}/community/${slug}`)}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        liked
          ? "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-300"
          : "border-neutral-300 text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
      }`}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      {label}
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
