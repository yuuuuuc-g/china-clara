"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/src/lib/supabase/browser";
import type { Locale } from "@/src/i18n/config";
import type { Dictionary } from "@/src/i18n/get-dictionary";

/**
 * 邮箱 + 密码登录/注册表单。会话经 @supabase/ssr 写入 cookie，SSR 页即刻可读。
 * 注册时把 display_name / preferred_lang 放进 user_metadata，
 * 由迁移 0008 的触发器（或 ensureProfile 兜底）落到 crm.profiles。
 */

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

export function LoginForm({
  locale,
  nextPath,
  labels,
}: {
  locale: Locale;
  nextPath: string;
  labels: Dictionary["auth"];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = browserClient();
  if (!supabase) {
    return (
      <p className="mt-8 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900">
        {labels.notConfigured}
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        router.push(nextPath);
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || null, preferred_lang: locale },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          router.push(nextPath);
          router.refresh();
        } else {
          // 项目开启了邮箱验证：注册成功但尚无会话
          setNotice(labels.checkEmail);
        }
      }
    } catch {
      setError(labels.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      {mode === "signup" && (
        <label className="block text-sm font-medium">
          {labels.displayName}
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            autoComplete="organization"
          />
        </label>
      )}

      <label className="block text-sm font-medium">
        {labels.email}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          autoComplete="email"
        />
      </label>

      <label className="block text-sm font-medium">
        {labels.password}
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {mode === "signin" ? labels.signIn : labels.signUp}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
        className="w-full text-center text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        {mode === "signin" ? labels.noAccount : labels.hasAccount}
      </button>
    </form>
  );
}
