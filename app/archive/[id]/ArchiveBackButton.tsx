"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function ArchiveBackButton() {
  const router = useRouter();

  return (
    <button
      className="flex items-center gap-2 text-sm text-white/60 transition hover:text-[#deff9a]"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/?system=archive");
      }}
      type="button"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      <span>Back to Archive</span>
    </button>
  );
}
