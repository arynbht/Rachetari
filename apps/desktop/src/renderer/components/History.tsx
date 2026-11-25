import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Docs } from "@/components/Docs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { renderMarkdown } from "@/lib/markdown";
import { when } from "@/lib/time";

import type { HistoryNight, HistoryView } from "../../shared/ipc";

type Done = HistoryView["done"][number];

/** How a finished card's outcome (its Status) looks; anything else is muted. */
const OUTCOME_STYLE: Record<string, { label: string; badge: string }> = {
  done: {
    label: "Done",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
  unreadable: {
    label: "Unreadable",
    badge: "bg-rose-500/20 text-rose-200",
  },
};

const outcomeOf = (t: Done) =>
  OUTCOME_STYLE[t.status.toLowerCase()] ?? {
    label: t.status,
    badge: "bg-slate-500/20 text-slate-300",
  };

/** One night report, rendered, once it's picked. */
function NightReport({ repoPath, date }: { repoPath: string; date: string }) {
  const [night, setNight] = useState<HistoryNight | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    window.rivetari.history.night(repoPath, date).then(
      (next) => live && setNight(next),
      (err: unknown) => live && setError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [repoPath, date]);
  if (error)
    return (
      <p className="text-sm text-rose-300" role="alert">
        {error}
      </p>
    );
  if (!night)
    return <p className="text-sm text-muted-foreground">Loading {date}…</p>;
  return (
    <article
      aria-label={`Night report ${date}`}
      className="doc-prose"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(night.markdown) }}
    />
  );
}

export function History({
  repoPath,
  onOpenTask,
}: {
  repoPath: string;
  /** Show a card's detail in the Tasks tab. */
  onOpenTask: (id: string) => void;
}) {
  const [data, setData] = useState<HistoryView | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [night, setNight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await window.rivetari.history.get(repoPath));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    void load();
  }, [load]);

  /** The outcomes present, in the order they first appear, for the filters. */
  const outcomes = useMemo(
    () => [...new Set((data?.done ?? []).map((t) => t.status.toLowerCase()))],
    [data],
  );

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.done;
    return data.done.filter((t) => t.status.toLowerCase() === filter);
  }, [data, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">History</h2>
          {data && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {data.done.length} finished · {data.nights.length} night{" "}
              {data.nights.length === 1 ? "report" : "reports"}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      ) : data ? (
        <div className="space-y-6">
          <section aria-labelledby="history-tasks" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="history-tasks" className="text-sm font-semibold">
                Finished cards
              </h3>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Filter by outcome"
              >
                {["all", ...outcomes].map((kind) => (
                  <Button
                    key={kind}
                    size="sm"
                    variant={filter === kind ? "secondary" : "ghost"}
                    aria-pressed={filter === kind}
                    onClick={() => setFilter(kind)}
                  >
                    {kind === "all"
                      ? `All (${data.done.length})`
                      : `${OUTCOME_STYLE[kind]?.label ?? kind} (${
                          data.done.filter(
                            (t) => t.status.toLowerCase() === kind,
                          ).length
                        })`}
                  </Button>
                ))}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {data.done.length === 0
                  ? "No finished cards yet: /done moves a card to cards/done/."
                  : "No finished cards match this filter."}
              </p>
            ) : (
              <table className="w-full text-left text-xs tabular-nums">
                <caption className="sr-only">
                  Finished cards, newest first
                </caption>
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1.5 pr-2 font-medium">
                      Task
                    </th>
                    <th scope="col" className="py-1.5 pr-2 font-medium">
                      Outcome
                    </th>
                    <th scope="col" className="py-1.5 pr-2 font-medium">
                      PR
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Closed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => {
                    const meta = outcomeOf(t);
                    return (
                      <tr
                        key={t.path}
                        className="border-t border-border/60 align-top"
                      >
                        <th
                          scope="row"
                          className="py-2 pr-2 text-left font-normal"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenTask(t.id)}
                            className="rounded text-left font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {t.id}
                            {t.title ? ` · ${t.title}` : ""}
                          </button>
                        </th>
                        <td className="py-2 pr-2">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.badge}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2 pr-2">
                          {t.pr === null ? "–" : `#${t.pr}`}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {t.closedAt ? when(t.closedAt) : "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section aria-labelledby="history-nights" className="space-y-3">
            <h3 id="history-nights" className="text-sm font-semibold">
              Night reports
            </h3>
            {data.nights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No night reports yet.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-[12rem_1fr]">
                <ul className="space-y-1">
                  {data.nights.map((n) => (
                    <li key={n.date}>
                      <button
                        type="button"
                        onClick={() => setNight(n.date)}
                        aria-current={night === n.date ? "true" : undefined}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          night === n.date
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <span className="block font-medium">{n.date}</span>
                        <span className="block text-muted-foreground">
                          {n.merged} merged · {n.held} held
                          {n.blocked > 0 && ` · ${n.blocked} blocked`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <Card className="min-w-0 p-4">
                  {night ? (
                    <NightReport repoPath={repoPath} date={night} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pick a night to read its report.
                    </p>
                  )}
                </Card>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* The repo's own docs, which had a tab of their own; task ledgers stay
          in Tasks, where each task's record already shows. */}
      <section aria-labelledby="history-docs" className="space-y-2">
        <h3 id="history-docs" className="text-sm font-semibold">
          Docs
        </h3>
        <Docs repoPath={repoPath} />
      </section>
    </div>
  );
}
