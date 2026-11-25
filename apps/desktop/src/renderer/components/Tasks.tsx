import { ChevronRight, CircleAlert, GitPullRequest } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import {
  DRAFT_READY_LIMIT,
  IN_PROGRESS_LIMIT,
  PR_OPEN_LIMIT,
} from "@/lib/line";
import { when } from "@/lib/time";

import type {
  TaskCard,
  TaskColumn,
  TaskDetail as TaskDetailView,
  TaskItem,
  TasksState,
} from "../../shared/ipc";
import { DisplayBranchLine } from "./DisplayBranch";

// The tab shows where each card stands, as a board by stage against the
// line's limits, and one card in full beside a list of the others: what it is
// for, its criteria, what it may touch, its skills, decisions, questions,
// evidence and the commits on its branch. "Needs me" narrows it to the cards
// waiting on the owner. All of it is read from the repo's cards (on every
// card/* branch, this machine's and the remote's), the backlog's "Next up" and
// cards/done/. Nothing here writes.

/** The stages between Next up and Done, each against its limit if it has one. */
const STAGES: {
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
const BOARD_COLUMNS = STAGES.flatMap((s) => s.columns.map((c) => c.id));

/** How many finished cards the Done band lists; History has the rest. */
const DONE_SHOWN = 5;

/** The finished cards, newest first; one with no date goes last. */
function latestDone(items: TaskItem[]): TaskItem[] {
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
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

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
function StageHeading({
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
function NeedLabels({ item, all }: { item: TaskItem; all?: boolean }) {
  const shown = all
    ? item.needs
    : item.needs.filter((n) => n.kind !== "unreadable" && n.kind !== "merge");
  return shown.map((n) => (
    <span key={n.kind} className="font-medium text-amber-300">
      {n.label}
    </span>
  ));
}

/**
 * One card on the board. What it waits on decides how it looks: rose when it
 * can't be read, sky when its PR waits to be merged, greyed while its branch
 * is still being drafted, and amber for what it asks of the owner.
 */
function BoardCard({
  item,
  selected,
  onSelect,
  onKeyDown,
}: {
  item: TaskItem;
  selected: boolean;
  onSelect: (key: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const drafting = item.status === "drafting";
  const border = item.unreadable
    ? "border-rose-500/70"
    : item.column === "pr"
      ? "border-sky-500/70"
      : "border-border";
  return (
    <button
      type="button"
      data-key={item.key}
      onClick={() => onSelect(item.key)}
      onKeyDown={onKeyDown}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full flex-col gap-1 rounded-md border bg-card p-2 text-left text-xs hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${border} ${
        selected ? "ring-2 ring-ring" : ""
      } ${drafting ? "text-muted-foreground" : ""}`}
    >
      <span className="flex flex-wrap items-center justify-between gap-x-2">
        <span className="whitespace-nowrap font-mono text-muted-foreground">
          {item.id}
        </span>
        {item.heldBy && (
          <span className="whitespace-nowrap text-muted-foreground">
            {item.heldBy}
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
      {item.unreadable ? (
        <span className="flex items-center gap-1 font-medium text-rose-300">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Can&apos;t be read: {item.branch}
        </span>
      ) : drafting ? (
        <span className="text-muted-foreground">Drafting: {item.branch}</span>
      ) : item.column === "pr" && item.pr ? (
        <span className="flex items-center gap-1 text-sky-300">
          <GitPullRequest className="h-3.5 w-3.5 shrink-0" aria-hidden />
          PR #{item.pr} waiting to merge
        </span>
      ) : null}
      <NeedLabels item={item} />
    </button>
  );
}

/** Next up as a band: its count and first line, every line on a click. */
function NextUpBand({
  items,
  open,
  onToggle,
  onSelect,
}: {
  items: TaskItem[];
  open: boolean;
  onToggle: () => void;
  onSelect: (key: string) => void;
}) {
  const headingId = useId();
  const listId = useId();
  const first = items[0];
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-border/60 bg-background/40"
    >
      <h4 id={headingId} className="text-xs">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={onToggle}
          className="flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden
          />
          <span className="font-semibold">Next up</span>{" "}
          <span className="tabular-nums text-muted-foreground">
            {items.length}
          </span>
          {!open && first && (
            <span className="min-w-0 truncate text-muted-foreground">
              {" "}
              First: {first.title}
            </span>
          )}
        </button>
      </h4>
      {open && (
        <ol id={listId} className="space-y-0.5 px-2 pb-2">
          {items.length === 0 && (
            <li className="px-1 text-xs text-muted-foreground">
              Nothing in the backlog&apos;s Next up.
            </li>
          )}
          {items.map((t, i) => (
            <li key={t.key}>
              <button
                type="button"
                data-key={t.key}
                onClick={() => onSelect(t.key)}
                className="flex w-full gap-2 rounded px-1 py-1 text-left text-xs hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="w-4 shrink-0 tabular-nums text-muted-foreground">
                  {i + 1}
                </span>{" "}
                <span className="min-w-0 flex-1 break-words">{t.title}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** The History link: History has every finished card. */
function HistoryLink({
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

/** Done as a band: its count and the latest five, each with its PR and date. */
function DoneBand({
  items,
  onSelect,
  onOpenHistory,
}: {
  items: TaskItem[];
  onSelect: (key: string) => void;
  onOpenHistory?: (() => void) | undefined;
}) {
  const headingId = useId();
  const done = latestDone(items);
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-border/60 bg-background/40 px-3 py-2"
    >
      <div className="flex items-baseline gap-2">
        <h4 id={headingId} className="text-xs font-semibold">
          Done{" "}
          <span className="font-normal tabular-nums text-muted-foreground">
            {done.length}
          </span>
        </h4>
        {done.length > DONE_SHOWN && (
          <span className="text-xs text-muted-foreground">
            latest {DONE_SHOWN} shown
          </span>
        )}
        <span className="ml-auto">
          <HistoryLink onOpenHistory={onOpenHistory} />
        </span>
      </div>
      {done.length > 0 ? (
        <ul className="mt-1">
          {done.slice(0, DONE_SHOWN).map((t) => (
            <li key={t.key}>
              <button
                type="button"
                data-key={t.key}
                onClick={() => onSelect(t.key)}
                className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto_6rem] items-baseline gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-mono text-muted-foreground">{t.id}</span>{" "}
                <span className="truncate">{t.title}</span>{" "}
                <span className="text-muted-foreground">
                  {t.pr ? `PR #${t.pr}` : ""}
                </span>{" "}
                <span className="text-right tabular-nums text-muted-foreground">
                  {day(t.updated) ?? "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          No finished cards yet.
        </p>
      )}
    </section>
  );
}

/**
 * The full board: Next up as a band above the stages, Done as a band below.
 * Left and Right move across the columns that have cards, Up and Down within
 * one, Enter opens the card.
 */
function Board({
  items,
  nextUpOpen,
  onToggleNextUp,
  onSelect,
  onOpenHistory,
}: {
  items: TaskItem[];
  nextUpOpen: boolean;
  onToggleNextUp: () => void;
  onSelect: (key: string) => void;
  onOpenHistory?: (() => void) | undefined;
}) {
  const ref = useRef<HTMLElement>(null);
  const columns = BOARD_COLUMNS.map((id) =>
    items.filter((t) => t.column === id),
  );

  const move = (key: string) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const col = columns.findIndex((c) => c.some((t) => t.key === key));
    const row = columns[col]?.findIndex((t) => t.key === key) ?? -1;
    if (col < 0) return;
    let target: TaskItem | undefined;
    if (event.key === "ArrowUp") target = columns[col]?.[row - 1];
    else if (event.key === "ArrowDown") target = columns[col]?.[row + 1];
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const step = event.key === "ArrowLeft" ? -1 : 1;
      for (let c = col + step; c >= 0 && c < columns.length; c += step) {
        const here = columns[c] ?? [];
        if (here.length === 0) continue;
        target = here[Math.min(row, here.length - 1)];
        break;
      }
    } else return;
    event.preventDefault();
    if (target)
      ref.current
        ?.querySelector<HTMLElement>(`[data-key="${CSS.escape(target.key)}"]`)
        ?.focus();
  };

  const column = (id: TaskColumn) => {
    const here = items.filter((t) => t.column === id);
    return here.length > 0 ? (
      <ul className="space-y-2">
        {here.map((t) => (
          <li key={t.key}>
            <BoardCard
              item={t}
              selected={false}
              onSelect={onSelect}
              onKeyDown={move(t.key)}
            />
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-muted-foreground">None</p>
    );
  };

  return (
    <section ref={ref} aria-labelledby="tasks-board" className="space-y-2">
      <h3 id="tasks-board" className="sr-only">
        Board
      </h3>
      <NextUpBand
        items={items.filter((t) => t.column === "next")}
        open={nextUpOpen}
        onToggle={onToggleNextUp}
        onSelect={onSelect}
      />
      <div className="grid grid-cols-5 gap-2">
        {STAGES.map((stage) => {
          const headingId = `tasks-board-${stage.id}`;
          const count = items.filter((t) =>
            stage.columns.some((c) => c.id === t.column),
          ).length;
          const heading = (
            <StageHeading
              id={headingId}
              label={stage.label}
              count={count}
              limit={stage.limit}
            />
          );
          const box =
            "min-w-0 space-y-2 rounded-lg border border-border/60 bg-background/40 p-2";
          // Draft and Ready share one load: a group of two columns.
          return stage.columns.length > 1 ? (
            <div
              key={stage.id}
              role="group"
              aria-labelledby={headingId}
              className="col-span-2 flex min-w-0 flex-col gap-1.5"
            >
              {heading}
              <div className="grid flex-1 grid-cols-2 gap-2">
                {stage.columns.map((c) => {
                  const subId = `tasks-board-${c.id}`;
                  return (
                    <section key={c.id} aria-labelledby={subId} className={box}>
                      <h5
                        id={subId}
                        className="flex items-baseline justify-between text-xs text-muted-foreground"
                      >
                        {c.label}{" "}
                        <span className="tabular-nums">
                          {items.filter((t) => t.column === c.id).length}
                        </span>
                      </h5>
                      {column(c.id)}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <section
              key={stage.id}
              aria-labelledby={headingId}
              className="flex min-w-0 flex-col gap-1.5"
            >
              {heading}
              <div className={`flex-1 ${box}`}>
                {column(stage.columns[0]?.id ?? "blocked")}
              </div>
            </section>
          );
        })}
      </div>
      <DoneBand
        items={items}
        onSelect={onSelect}
        onOpenHistory={onOpenHistory}
      />
    </section>
  );
}

/** One row of the selected-card list: the full title, then where it stands. */
function ListRow({
  item,
  current,
  onSelect,
  onKeyDown,
}: {
  item: TaskItem;
  current: boolean;
  onSelect: (key: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const landed = item.source === "done" ? day(item.updated) : null;
  return (
    <button
      type="button"
      data-key={item.key}
      data-row
      onClick={() => onSelect(item.key)}
      onKeyDown={onKeyDown}
      aria-current={current ? "true" : undefined}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-0.5 rounded-md border px-2 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        current
          ? "border-sky-500/70 bg-accent/60"
          : "border-transparent hover:bg-accent/30"
      }`}
    >
      <span className="font-mono text-muted-foreground">{item.id}</span>{" "}
      <span data-title className="min-w-0 text-sm [overflow-wrap:anywhere]">
        {item.title}
      </span>{" "}
      <span className="col-start-2 flex flex-wrap gap-x-2 text-muted-foreground">
        <span className={item.unreadable ? "text-rose-300" : undefined}>
          {item.status}
        </span>{" "}
        {item.heldBy && <span>held by {item.heldBy}</span>}{" "}
        {landed && <span>{landed}</span>}{" "}
        {item.pr && <span>PR #{item.pr}</span>} <NeedLabels item={item} />
      </span>
    </button>
  );
}

/**
 * The board collapsed beside the open card: each stage with its load and its
 * cards, Next up as a count, Done as its latest five. With Needs me on, only
 * the waiting cards, as one group. Up and Down open the next card.
 */
function SelectedList({
  items,
  current,
  needsOnly,
  height,
  onSelect,
  onOpenHistory,
}: {
  items: TaskItem[];
  current: TaskItem;
  needsOnly: boolean;
  height: number | null;
  onSelect: (key: string) => void;
  onOpenHistory?: (() => void) | undefined;
}) {
  const ref = useRef<HTMLElement>(null);
  const done = latestDone(items);
  const doneShown = done.slice(0, DONE_SHOWN);
  // A card opened from elsewhere stays in the list even if it isn't shown.
  const withCurrent = (shown: TaskItem[], column: TaskColumn) =>
    current.column === column && !shown.includes(current)
      ? [...shown, current]
      : shown;
  const waiting = items.filter((t) => t.needs.length > 0);

  const groups: {
    id: string;
    heading: ReactNode;
    aside?: ReactNode;
    rows: TaskItem[];
  }[] = needsOnly
    ? [
        {
          id: "needs",
          heading: (
            <StageHeading
              label="Needs me"
              count={waiting.length}
              limit={null}
            />
          ),
          rows: withCurrent(waiting, current.column).filter(
            (t) => t.needs.length > 0 || t === current,
          ),
        },
      ]
    : [
        {
          id: "next",
          heading: (
            <StageHeading
              label="Next up"
              count={items.filter((t) => t.column === "next").length}
              limit={null}
            />
          ),
          rows: current.column === "next" ? [current] : [],
        },
        ...STAGES.map((stage) => {
          const rows = items.filter((t) =>
            stage.columns.some((c) => c.id === t.column),
          );
          return {
            id: stage.id,
            heading: (
              <StageHeading
                label={stage.label}
                count={rows.length}
                limit={stage.limit}
              />
            ),
            rows,
          };
        }),
        {
          id: "done",
          heading: (
            <StageHeading label="Done" count={done.length} limit={null} />
          ),
          aside: <HistoryLink onOpenHistory={onOpenHistory} />,
          rows: withCurrent(doneShown, "done"),
        },
      ];

  const order = groups.flatMap((g) => g.rows);
  const step = (key: string) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const at = order.findIndex((t) => t.key === key);
    const next = order[at + (event.key === "ArrowUp" ? -1 : 1)];
    if (!next) return;
    onSelect(next.key);
    ref.current
      ?.querySelector<HTMLElement>(`[data-key="${CSS.escape(next.key)}"]`)
      ?.focus();
  };

  return (
    <section
      ref={ref}
      aria-labelledby="tasks-cards"
      className="min-h-0 space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2"
      style={height === null ? undefined : { height }}
    >
      <h3 id="tasks-cards" className="sr-only">
        Cards
      </h3>
      <p className="px-1 text-xs text-muted-foreground">
        Up and Down open the next card. Escape brings the board back.
      </p>
      {groups.map((g) => (
        <div key={g.id} className="space-y-1">
          <div className="flex items-baseline gap-2">
            <div className="min-w-0 flex-1">{g.heading}</div>
            {g.aside}
          </div>
          {g.rows.length > 0 && (
            <ul className="space-y-0.5">
              {g.rows.map((t) => (
                <li key={t.key}>
                  <ListRow
                    item={t}
                    current={t.key === current.key}
                    onSelect={onSelect}
                    onKeyDown={step(t.key)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

/** Only the cards waiting on the owner, as one list, each with what to do. */
function NeedsList({
  items,
  onSelect,
}: {
  items: TaskItem[];
  onSelect: (key: string) => void;
}) {
  const waiting = items.filter((t) => t.needs.length > 0);
  return (
    <section aria-label="Needs me" className="space-y-2">
      <p className="text-xs text-amber-300">
        {waiting.length === 0
          ? "Nothing waits on you. Turn off Needs me to see the whole board."
          : `${waiting.length} ${
              waiting.length === 1 ? "card waits" : "cards wait"
            } on you. Next up, the columns and Done come back when you turn off Needs me.`}
      </p>
      {waiting.length > 0 && (
        <ul className="space-y-2">
          {waiting.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                data-key={t.key}
                onClick={() => onSelect(t.key)}
                className={`flex w-full flex-col gap-1.5 rounded-lg border bg-card px-3 py-2 text-left text-xs hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  t.unreadable ? "border-rose-500/70" : "border-border"
                }`}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {t.id}
                  </span>{" "}
                  <span className="min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">
                    {t.title}
                  </span>{" "}
                  <span className="shrink-0 text-muted-foreground">
                    {t.status}
                    {t.heldBy ? `, held by ${t.heldBy}` : ""}
                  </span>
                </span>
                {t.needs.map((n) => (
                  <span key={n.kind} className="flex gap-2">
                    <span
                      className={`w-36 shrink-0 font-medium ${
                        n.kind === "unreadable"
                          ? "text-rose-300"
                          : "text-amber-300"
                      }`}
                    >
                      {n.label}
                    </span>{" "}
                    <span className="min-w-0 flex-1 break-words">{n.todo}</span>
                  </span>
                ))}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The height that takes an element from where it starts to the bottom of the
 * window, less the main area's padding, kept as the window or the page above
 * it changes. Null until it is on show.
 */
function useFillHeight<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const measure = () => {
      // A hidden tab has no box; it is measured again once it shows.
      if (el.offsetParent === null) return;
      const top = el.getBoundingClientRect().top;
      setHeight(Math.max(320, Math.floor(window.innerHeight - top - 24)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active]);
  return { ref, height };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-xs">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

/** A titled part of the detail, a region of its own. */
function Part({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h4 id={id} className="flex items-baseline gap-2 text-sm font-semibold">
        {title}
        {aside && (
          <span className="text-xs font-normal text-muted-foreground">
            {aside}
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}

const STATE_LABEL: Record<TaskCard["criteria"][number]["state"], string> = {
  ticked: "ticked",
  unticked: "unticked",
  untested: "UNTESTED",
};

const STATE_CLASS: Record<TaskCard["criteria"][number]["state"], string> = {
  ticked: "border-emerald-500/50 text-emerald-300",
  unticked: "border-border text-muted-foreground",
  untested: "border-amber-500/50 text-amber-300",
};

function List({ items, none }: { items: string[]; none: string }) {
  return items.length > 0 ? (
    <ul className="list-disc space-y-0.5 pl-5 text-xs">
      {items.map((s) => (
        <li key={s} className="break-words">
          {s}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-xs text-muted-foreground">{none}</p>
  );
}

/** One card in full, read again whenever the board's copy of it changes. */
function TaskRecord({ repoPath, item }: { repoPath: string; item: TaskItem }) {
  const [detail, setDetail] = useState<TaskDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = `${item.key}#${item.status}#${item.updated ?? ""}`;

  useEffect(() => {
    let live = true;
    window.rivetari.tasks.detail(repoPath, item.key).then(
      (next) => {
        if (!live) return;
        setDetail(next);
        setError(null);
      },
      (err: unknown) => live && setError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [repoPath, item.key, version]);

  const card = detail?.card ?? null;
  return (
    <Card
      className="space-y-5 p-4"
      role="region"
      aria-label={`${item.id} record`}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold">
          <span className="font-mono text-sm text-muted-foreground">
            {item.id}
          </span>{" "}
          {item.title}
        </h3>
        <dl className="space-y-1">
          <Field label="Status">{item.status}</Field>
          <Field label="Branch">
            {item.branch ?? (item.source === "done" ? "cards/done/" : "—")}
          </Field>
          <Field label="Held by">{item.heldBy ?? "nobody"}</Field>
          {card?.nextStep && <Field label="Next step">{card.nextStep}</Field>}
        </dl>
      </div>

      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
      {detail?.error && (
        <p className="text-sm text-rose-300" role="alert">
          {detail.error}
        </p>
      )}
      {item.status === "drafting" && (
        <p className="text-xs text-muted-foreground">
          Being drafted: no <code>CARD.md</code> has been committed on{" "}
          {item.branch} yet.
        </p>
      )}
      {item.source === "next-up" && (
        <p className="text-xs text-muted-foreground">
          A line in the backlog&apos;s &quot;Next up&quot;, not a card yet.
          Start it with <code>/card</code> in Claude Code.
        </p>
      )}

      {card && (
        <>
          <Part title="Card">
            <dl className="space-y-1">
              <Field label="Why">{card.why || "—"}</Field>
              <Field label="Source">{card.source ?? "—"}</Field>
            </dl>
            <ul className="space-y-1.5">
              {card.criteria.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] ${STATE_CLASS[c.state]}`}
                  >
                    {STATE_LABEL[c.state]}
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    <span className="font-mono text-muted-foreground">
                      {c.id}
                    </span>{" "}
                    {c.text}
                    {c.check && (
                      <span className="block text-muted-foreground">
                        check: <code>{c.check}</code>
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-medium">Files in scope</p>
                <List items={card.filesInScope} none="None listed." />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Out of scope</p>
                <List items={card.outOfScope} none="None listed." />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Constraints</p>
                <List items={card.constraints} none="None listed." />
              </div>
            </div>
          </Part>

          <Part title="Skills">
            <List items={card.skills} none="No skills named." />
          </Part>

          <Part title="Decisions">
            <List items={card.decisions} none="No decisions yet." />
          </Part>

          <Part
            title="Questions"
            aside={
              card.questions.some((q) => q.open)
                ? `${card.questions.filter((q) => q.open).length} open`
                : undefined
            }
          >
            {card.questions.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {card.questions.map((q) => (
                  <li
                    key={q.text}
                    className={
                      q.open ? "text-amber-300" : "text-muted-foreground"
                    }
                  >
                    {q.open ? "Open: " : "Answered: "}
                    {q.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No questions.</p>
            )}
          </Part>

          <Part title="Evidence">
            {card.evidence ? (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Show the evidence
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-background/60 p-3 text-xs">
                  {card.evidence}
                </pre>
              </details>
            ) : (
              <p className="text-xs text-muted-foreground">
                No evidence written yet.
              </p>
            )}
          </Part>
        </>
      )}

      {item.source !== "next-up" && (
        <Part
          title="Commits"
          aside={
            item.source === "done"
              ? "that touched its file"
              : "on its branch, not on the default branch"
          }
        >
          {detail && detail.commits.length > 0 ? (
            <ol className="space-y-1 text-xs">
              {detail.commits.map((c) => (
                <li key={c.sha} className="flex gap-3">
                  <span className="w-28 shrink-0 tabular-nums text-muted-foreground">
                    {when(c.at)}
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    {c.subject}
                    <span className="ml-1 text-muted-foreground">
                      ({c.author})
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground">
              {detail ? "No commits yet." : "Reading…"}
            </p>
          )}
        </Part>
      )}
    </Card>
  );
}

export function Tasks({
  repoPath,
  focus,
  onOpenHistory,
}: {
  repoPath: string;
  /** A card to open, from elsewhere (the Now view); `seq` reopens it. */
  focus?: { id: string; seq: number } | null;
  /** Opens the History tab, from the Done band's link. */
  onOpenHistory?: (() => void) | undefined;
}) {
  const [state, setState] = useState<TasksState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [needsOnly, setNeedsOnly] = useState(false);
  const [nextUpOpen, setNextUpOpen] = useState(false);
  // The card that was open, to put focus back on once the board returns.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = window.rivetari.tasks.onUpdate((next) => {
      if (active && next.repoPath === repoPath) setState(next);
    });
    // The first read's reply can land after a push that's newer than it.
    window.rivetari.tasks.get(repoPath).then(
      (first) =>
        active &&
        setState((current) =>
          current?.repoPath === repoPath ? current : first,
        ),
      (err: unknown) => active && setError(errorMessage(err)),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repoPath]);

  const items = useMemo(() => state?.items ?? [], [state]);

  // A card asked for from elsewhere opens once the board has it.
  const [openedFocus, setOpenedFocus] = useState(0);
  useEffect(() => {
    if (!focus || focus.seq === openedFocus) return;
    const match = items.find(
      (t) => t.id === focus.id && t.source !== "next-up",
    );
    if (!match) return;
    setSelected(match.key);
    setOpenedFocus(focus.seq);
  }, [focus, items, openedFocus]);

  const current = items.find((t) => t.key === selected) ?? null;
  const waiting = items.filter((t) => t.needs.length > 0).length;
  const { ref: paneRef, height } = useFillHeight<HTMLDivElement>(
    current !== null,
  );

  // Opening a card from the board puts focus on its row in the list, where
  // Up and Down go on to the next.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (current && !wasOpen.current)
      rootRef.current
        ?.querySelector<HTMLElement>(
          `[data-row][data-key="${CSS.escape(current.key)}"]`,
        )
        ?.focus();
    wasOpen.current = current !== null;
  }, [current]);

  // Back on the board, focus goes to the card that was open.
  useEffect(() => {
    if (current || !returnTo) return;
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-key="${CSS.escape(returnTo)}"]`)
      ?.focus();
    setReturnTo(null);
  }, [current, returnTo]);

  const closeCard = () => {
    if (!current) return;
    if (current.column === "next") setNextUpOpen(true);
    setReturnTo(current.key);
    setSelected(null);
  };

  return (
    <div
      ref={rootRef}
      className="space-y-3"
      onKeyDown={(event) => {
        if (event.key === "Escape" && current) {
          event.preventDefault();
          closeCard();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 className="text-lg font-semibold leading-7">Tasks</h2>
            <div>
              <DisplayBranchLine display={state?.display} />
            </div>
          </div>
          {/* With a card open, the list says its own keys: the record keeps
              the room. */}
          {!current && (
            <p className="text-xs text-muted-foreground">
              Every card against the line&apos;s limits. Arrow keys move between
              cards, Enter opens one, Escape brings the board back.
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant={needsOnly ? "default" : "outline"}
          aria-pressed={needsOnly}
          onClick={() => setNeedsOnly((on) => !on)}
        >
          Needs me{" "}
          <span
            className={`rounded-full px-1.5 text-xs font-medium tabular-nums ${
              needsOnly ? "bg-background/30" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {waiting}
          </span>
        </Button>
      </div>

      {(error ?? state?.error) && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {error ?? state?.error}
        </p>
      )}

      {(state === null || !state.ready) && !error ? (
        <p className="text-sm text-muted-foreground">Reading cards…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cards in this repository yet. Run <code>/setup</code> once, then
          start one with <code>/card</code> in Claude Code.
        </p>
      ) : current ? (
        <div className="grid grid-cols-[minmax(0,17rem)_minmax(0,1fr)] gap-3">
          <SelectedList
            items={items}
            current={current}
            needsOnly={needsOnly}
            height={height}
            onSelect={setSelected}
            onOpenHistory={onOpenHistory}
          />
          <div
            ref={paneRef}
            data-pane="record"
            className="min-h-0 min-w-0 overflow-y-auto rounded-lg"
            style={height === null ? undefined : { height }}
          >
            {/* key keeps one card's record off another's. */}
            <TaskRecord key={current.key} repoPath={repoPath} item={current} />
          </div>
        </div>
      ) : needsOnly ? (
        <NeedsList items={items} onSelect={setSelected} />
      ) : (
        <Board
          items={items}
          nextUpOpen={nextUpOpen}
          onToggleNextUp={() => setNextUpOpen((open) => !open)}
          onSelect={setSelected}
          onOpenHistory={onOpenHistory}
        />
      )}
    </div>
  );
}
