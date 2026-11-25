import { CircleAlert, GitPullRequest } from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { when } from "@/lib/time";

import type {
  TaskCard,
  TaskColumn,
  TaskDetail as TaskDetailView,
  TaskItem,
  TasksState,
} from "../../shared/ipc";

// The tab shows where each card stands, as a board by status or as a list,
// and one card in full: what it is for, its criteria, what it may touch, its
// skills, decisions, questions, evidence and the commits on its branch. All of
// it is read from the repo's cards (on every card/* branch, this machine's and
// the remote's), the backlog's "Next up" and cards/done/. Nothing here writes.

function TaskTable({
  items,
  selected,
  onSelect,
}: {
  items: TaskItem[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <section aria-labelledby="tasks-all" className="space-y-2">
      <h3 id="tasks-all" className="text-sm font-semibold">
        All cards
      </h3>
      <Card className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-[40%] px-4 py-2 font-medium">
                Task
              </th>
              <th scope="col" className="w-[13%] px-2 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="w-[12%] px-2 py-2 font-medium">
                Held by
              </th>
              <th scope="col" className="w-[18%] px-2 py-2 font-medium">
                Branch
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr
                key={t.key}
                aria-current={t.key === selected ? "true" : undefined}
                className={`border-t border-border/60 ${
                  t.key === selected ? "bg-accent/60" : "hover:bg-accent/30"
                }`}
              >
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => onSelect(t.key)}
                    className="flex w-full min-w-0 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {t.id}
                    </span>
                    <span className="truncate">{t.title}</span>
                  </button>
                </td>
                <td
                  className={`whitespace-nowrap px-2 py-2 text-xs ${t.unreadable ? "text-rose-300" : ""}`}
                >
                  {t.status}
                </td>
                <td className="truncate px-2 py-2 text-xs text-muted-foreground">
                  {t.heldBy ?? "—"}
                </td>
                <td
                  className="truncate px-2 py-2 font-mono text-xs text-muted-foreground"
                  title={t.branch ?? undefined}
                >
                  {t.branch ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
                  {t.updated ? when(t.updated) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

/** The board's columns, in the order a card moves through them. */
const COLUMNS: { id: TaskColumn; label: string }[] = [
  { id: "next", label: "Next up" },
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready" },
  { id: "progress", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "pr", label: "PR open" },
  { id: "done", label: "Done" },
];

/**
 * One card on the board. What it waits on decides how it looks: rose when it
 * can't be read, sky when its PR waits to be merged.
 */
function BoardCard({
  item,
  selected,
  onSelect,
}: {
  item: TaskItem;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const border = item.unreadable
    ? "border-rose-500/70"
    : item.column === "pr"
      ? "border-sky-500/70"
      : "border-border";
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full flex-col gap-1 rounded-md border bg-card p-2 text-left text-xs hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${border} ${
        selected ? "ring-2 ring-ring" : ""
      }`}
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
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Can&apos;t be read: {item.branch}
        </span>
      ) : item.column === "pr" && item.pr ? (
        <span className="flex items-center gap-1 text-sky-300">
          <GitPullRequest className="h-3.5 w-3.5" aria-hidden />
          PR #{item.pr} waiting to merge
        </span>
      ) : null}
    </button>
  );
}

function Board({
  items,
  selected,
  onSelect,
}: {
  items: TaskItem[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <section aria-labelledby="tasks-board" className="space-y-2">
      <h3 id="tasks-board" className="text-sm font-semibold">
        Board
      </h3>
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[1080px] grid-cols-7 gap-2">
          {COLUMNS.map((column) => {
            const here = items.filter((t) => t.column === column.id);
            const headingId = `tasks-board-${column.id}`;
            return (
              <section
                key={column.id}
                aria-labelledby={headingId}
                className="min-w-0 space-y-2 rounded-lg border border-border/60 bg-background/40 p-2"
              >
                <h4
                  id={headingId}
                  className="flex items-baseline justify-between text-xs font-semibold"
                >
                  {column.label}
                  <span className="font-normal text-muted-foreground">
                    {here.length}
                  </span>
                </h4>
                {here.length > 0 ? (
                  <ul className="space-y-2">
                    {here.map((t) => (
                      <li key={t.key}>
                        <BoardCard
                          item={t}
                          selected={t.key === selected}
                          onSelect={onSelect}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">None</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type View = "board" | "list";
const VIEW_KEY = "rivetari.tasks.view";

/**
 * The board, until this person picks the list: where each task stands by beat
 * is what the tab is for. Their pick is kept in this browser only.
 */
const DEFAULT_VIEW: View = "board";

/** The view this person last picked, or the board. */
function savedView(): View {
  try {
    const saved = window.localStorage.getItem(VIEW_KEY);
    return saved === "board" || saved === "list" ? saved : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  const option = (value: View, label: string) => (
    <Button
      type="button"
      size="sm"
      variant={view === value ? "default" : "outline"}
      aria-pressed={view === value}
      onClick={() => onChange(value)}
    >
      {label}
    </Button>
  );
  return (
    <div role="group" aria-label="Show tasks as" className="flex gap-1">
      {option("board", "Board")}
      {option("list", "List")}
    </div>
  );
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
}: {
  repoPath: string;
  /** A card to open, from elsewhere (the Now view); `seq` reopens it. */
  focus?: { id: string; seq: number } | null;
}) {
  const [state, setState] = useState<TasksState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>(savedView);

  const pickView = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not kept: the next launch shows the default again.
    }
  };

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
  const cards = items.filter((t) => t.source !== "next-up");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground">
            Every card where it stands, on this machine&apos;s branches and the
            remote&apos;s, with the backlog&apos;s &quot;Next up&quot;. Pick one
            to read it in full; this view only reads.
          </p>
        </div>
        <ViewToggle view={view} onChange={pickView} />
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
      ) : (
        <>
          {view === "board" ? (
            <Board items={items} selected={selected} onSelect={setSelected} />
          ) : (
            <TaskTable
              items={cards}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {current && (
            // key keeps one card's record off another's.
            <TaskRecord key={current.key} repoPath={repoPath} item={current} />
          )}
        </>
      )}
    </div>
  );
}
