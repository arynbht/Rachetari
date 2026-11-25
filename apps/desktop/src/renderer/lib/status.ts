import type { ChecklistStatus } from "../../shared/ipc";

export interface StatusMeta {
  label: string;
  /** Tailwind background for the status dot. */
  dot: string;
  /** Tailwind text colour for the status label. */
  text: string;
}

export const STATUS_META: Record<ChecklistStatus, StatusMeta> = {
  pass: { label: "Pass", dot: "bg-emerald-500", text: "text-emerald-400" },
  fail: { label: "Fail", dot: "bg-rose-500", text: "text-rose-400" },
  unchecked: {
    label: "Unchecked",
    dot: "bg-amber-500",
    text: "text-amber-400",
  },
  // slate-400 (not 500) so the label clears WCAG AA contrast on the card bg.
  "n/a": { label: "N/A", dot: "bg-slate-700", text: "text-slate-400" },
};
