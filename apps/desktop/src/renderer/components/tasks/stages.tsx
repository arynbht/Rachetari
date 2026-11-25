import {
  DRAFT_READY_LIMIT,
  IN_PROGRESS_LIMIT,
  PR_OPEN_LIMIT,
} from "@/lib/line";

import type { TaskColumn, TaskItem } from "../../../shared/ipc";

/** The stages between Next up and Done, each against its limit if it has one. */
export const STAGES: {
  id: string;
  label: string;
  columns: { id: TaskColumn; label: string }[];
  limit: number | null;
}[] = [
  {
    id: "draft-ready",
    label: "Draft + Ready",
    columns: [
      { id: "draft", label: "Draft" },
      { id: "ready", label: "Ready" },
    ],
    limit: DRAFT_READY_LIMIT,
  },
  {
    id: "progress",
    label: "In progress",
    columns: [{ id: "progress", label: "In progress" }],
    limit: IN_PROGRESS_LIMIT,
  },
  {
    id: "blocked",
    label: "Blocked",
    columns: [{ id: "blocked", label: "Blocked" }],
    limit: null,
  },
  {
    id: "pr",
    label: "PR open",
    columns: [{ id: "pr", label: "PR open" }],
    limit: PR_OPEN_LIMIT,
  },
];

/** The board's columns left to right, as the arrow keys move across them. */
export const BOARD_COLUMNS = STAGES.flatMap((s) => s.columns.map((c) => c.id));

/** How many finished cards the Done band lists; History has the rest. */
export const DONE_SHOWN = 5;

/** The finished cards, newest first; one with no date goes last. */
export function latestDone(items: TaskItem[]): TaskItem[] {
  return items
    .filter((t) => t.column === "done")
    .sort((a, b) =>
      a.updated === b.updated
        ? 0
        : a.updated === null
          ? 1
          : b.updated === null
            ? -1
            : b.updated.localeCompare(a.updated),
    );
}

/** The day a finished card landed, or nothing. */
export const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

/**
 * A stage's load against its limit, as dots and "n/limit"; a count only when
 * it has no limit. Amber at the limit, rose past it.
 */
function Load({ count, limit }: { count: number; limit: number | null }) {
  if (limit === null)
    return <span className="font-normal text-muted-foreground">{count}</span>;
  const tone =
    count > limit
      ? "text-rose-300"
      : count === limit
        ? "text-amber-300"
        : "text-muted-foreground";
  return (
    <span className={`flex items-center gap-1.5 font-normal ${tone}`}>
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: limit }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i < count
                ? count > limit
                  ? "bg-rose-400"
                  : "bg-sky-400"
                : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </span>
      <span className="tabular-nums">
        {count}/{limit}
      </span>
    </span>
  );
}

/** A stage's heading: its name, then its load. */
export function StageHeading({
  id,
  label,
  count,
  limit,
}: {
  id?: string;
  label: string;
  count: number;
  limit: number | null;
}) {
  return (
    <h4
      id={id}
      className="flex items-center justify-between gap-2 px-1 text-xs font-semibold"
    >
      {label} <Load count={count} limit={limit} />
    </h4>
  );
}

/** What the owner is asked for, in amber; the board's own lines say the rest. */
export function NeedLabels({ item, all }: { item: TaskItem; all?: boolean }) {
  const shown = all
    ? item.needs
    : item.needs.filter((n) => n.kind !== "unreadable" && n.kind !== "merge");
  return shown.map((n) => (
    <span key={`${n.kind}:${n.todo}`} className="font-medium text-amber-300">
      {n.label}
    </span>
  ));
}

/** The History link: History has every finished card. */
export function HistoryLink({
  onOpenHistory,
}: {
  onOpenHistory?: (() => void) | undefined;
}) {
  if (!onOpenHistory) return null;
  return (
    <button
      type="button"
      onClick={onOpenHistory}
      className="rounded text-xs font-normal text-sky-300 underline underline-offset-2 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      History
    </button>
  );
}
