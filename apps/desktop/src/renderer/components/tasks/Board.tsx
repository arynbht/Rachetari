import { ChevronRight, CircleAlert, GitPullRequest } from "lucide-react";
import { type KeyboardEvent, useId, useRef } from "react";

import type { TaskColumn, TaskItem } from "../../../shared/ipc";
import { CiBadge } from "../CiBadge";
import { useCiState } from "../CiLine";
import {
  BOARD_COLUMNS,
  day,
  DONE_SHOWN,
  HistoryLink,
  latestDone,
  NeedLabels,
  STAGES,
  StageHeading,
} from "./stages";

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
export function Board({
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
  const ci = useCiState();
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
            {/* Beside the card's button, not in it: a link can't nest there. */}
            {!t.unreadable && t.column !== "next" && t.column !== "done" && (
              <div className="px-2 pt-1">
                <CiBadge branch={t.branch} state={ci} />
              </div>
            )}
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
