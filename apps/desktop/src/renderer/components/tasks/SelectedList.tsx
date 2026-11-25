import { type KeyboardEvent, type ReactNode, useRef } from "react";

import type { TaskColumn, TaskItem } from "../../../shared/ipc";
import {
  day,
  DONE_SHOWN,
  HistoryLink,
  latestDone,
  NeedLabels,
  STAGES,
  StageHeading,
} from "./stages";

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
export function SelectedList({
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
