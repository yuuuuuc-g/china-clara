"use client";

import { useRouter } from "next/navigation";
import { browserClient } from "@/src/lib/supabase/browser";

/** 退出登录：清 cookie 会话后刷新，SSR 页回到未登录态。 */
export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await browserClient()?.auth.signOut();
        router.refresh();
      }}
      className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white"
    >
      {label}
    </button>
  );
}
