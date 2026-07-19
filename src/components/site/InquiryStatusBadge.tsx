import type { InquiryStatus } from "@/src/lib/crm/inquiries";

/** 询盘状态徽章（列表与线程页共用）。 */
const STATUS_STYLE: Record<InquiryStatus, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  replied: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  negotiating: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  closed: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  archived: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
};

export function InquiryStatusBadge({
  status,
  label,
}: {
  status: InquiryStatus;
  label: string;
}) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {label}
    </span>
  );
}
